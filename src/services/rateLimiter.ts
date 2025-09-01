import { prisma } from "../db/prisma";
import { redis } from "../redis";
import { keys } from "./cacheKeys";
import { LimitDecision } from "../types";
import { nowMs, msUntilEndOfDay } from "../utils/time";

type Limits = {
  perMinute: number;
  dailyQuota: number;
  burst: number;
};

async function getLimits(apiKeyId: string, endpoint: string): Promise<Limits> {
  const [key, ep] = await Promise.all([
    prisma.aPI_Keys.findUnique({ where: { id: apiKeyId } }),
    prisma.endpoint_Limits.findUnique({ where: { api_key_id_endpoint: { api_key_id: apiKeyId, endpoint } } }),
  ]);
  if (!key) throw new Error("API key not found");
  const perMinute = ep?.rate_limit_per_minute ?? key.rate_limit_per_minute;
  const dailyQuota = ep?.daily_quota ?? key.daily_quota;
  const burst = ep?.burst ?? key.burst_per_minute ?? 0;
  return { perMinute, dailyQuota, burst };
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  const cached = await redis.ttl(keys.ipBlock(ip));
  if (cached > 0) return true;

  const rec = await prisma.blocked_IPs.findUnique({ where: { ip_address: ip } });
  if (!rec) return false;
  const now = new Date();
  if (rec.blocked_until > now) {
    const ttl = Math.floor((rec.blocked_until.getTime() - now.getTime()) / 1000);
    await redis.set(keys.ipBlock(ip), "1", "EX", Math.max(ttl, 1));
    return true;
  }
  return false;
}

export async function getKeyByValue(keyValue: string) {
  return prisma.aPI_Keys.findUnique({ where: { key_value: keyValue } });
}

export async function getUsageSnapshot(apiKeyId: string, endpoint: string): Promise<{ minuteCount: number; dayCount: number; }> {
  const [minuteCountStr, dayCountStr] = await redis.multi()
    .zcount(keys.minuteZset(apiKeyId, endpoint), nowMs() - 60_000, nowMs())
    .get(keys.dayCount(apiKeyId))
    .exec()
    .then(res => [res[0][1], res[1][1]] as [number, string | null]);
  return {
    minuteCount: Number(minuteCountStr || 0),
    dayCount: Number(dayCountStr || 0),
  };
}

export async function checkLimit(params: {
  keyValue: string;
  endpoint: string;
  ip: string;
}): Promise<LimitDecision & { apiKeyId?: string; }> {
  const { keyValue, endpoint, ip } = params;

  // Check if IP is blocked
  if (await isIpBlocked(ip)) {
    return { allowed: false, reason: "ip_blocked" };
  }

  // Validate API key
  const key = await getKeyByValue(keyValue);
  if (!key || !key.is_active) {
    return { allowed: false, reason: "invalid_or_inactive_key" };
  }

  // Get limits (with endpoint overrides if any)
  const { perMinute, dailyQuota, burst } = await getLimits(key.id, endpoint);

  const now = nowMs();
  const minuteKey = keys.minuteZset(key.id, endpoint);
  const dayKey = keys.dayCount(key.id);

  // Use Redis pipeline to cleanup old entries, count, and get day usage
  const results = await redis.multi()
    .zremrangebyscore(minuteKey, 0, now - 60_000) // remove old requests (older than 60s)
    .zcount(minuteKey, now - 60_000, now)         // current window count
    .get(dayKey)                                  // daily count
    .exec();

  // Extract results safely
  const minuteCountRaw = results[1][1]; // second command result
  const dayCountStr = results[2][1];    // third command result

  const minuteCount = minuteCountRaw ? Number(minuteCountRaw) : 0;
  const dayCount = dayCountStr ? Number(dayCountStr) : 0;

  // Calculate remaining quota
  const minuteCap = perMinute + (burst || 0);
  const minuteRemaining = Math.max(minuteCap - minuteCount, 0);
  const dayRemaining = Math.max(dailyQuota - dayCount, 0);

  let allowed = minuteRemaining > 0 && dayRemaining > 0;
  let retry_after_ms: number | undefined;

  // If not allowed, calculate retry time and log violation
  if (!allowed) {
    const firstTs = await redis.zrange(minuteKey, 0, 0, "WITHSCORES");
    if (Array.isArray(firstTs) && firstTs.length === 2) {
      const earliest = Number(firstTs[1]);
      retry_after_ms = Math.max(earliest + 60_000 - now, 1);
    }

    await prisma.request_Logs.create({
      data: {
        api_key_id: key.id,
        endpoint,
        ip_address: ip,
        was_allowed: false,
        timestamp: new Date()
      }
    });
  }

  return {
    allowed,
    reason: allowed ? undefined : (dayRemaining <= 0 ? "daily_quota_exceeded" : "rate_limited"),
    retry_after_ms,
    minute_used: minuteCount,
    minute_limit: minuteCap,
    day_used: dayCount,
    day_limit: dailyQuota,
    burst_allowed: burst,
    apiKeyId: key.id,
  };
}


export async function recordSuccess(params: {
  apiKeyId: string;
  endpoint: string;
  ip: string;
}) {
  const { apiKeyId, endpoint, ip } = params;
  const now = nowMs();
  const minuteKey = keys.minuteZset(apiKeyId, endpoint);
  const dayKey = keys.dayCount(apiKeyId);
  const ttlSec = Math.ceil(msUntilEndOfDay(new Date()) / 1000);

  await redis.multi()
    .zadd(minuteKey, now, String(now))
    .pexpire(minuteKey, 61_000)         // keep a little over one minute
    .incr(dayKey)
    .expire(dayKey, ttlSec)
    .exec();

  // Log success
  await prisma.request_Logs.create({
    data: {
      api_key_id: apiKeyId,
      endpoint,
      ip_address: ip,
      was_allowed: true,
      timestamp: new Date()
    }
  });

  // Upsert aggregates
  const minuteBucket = new Date(Math.floor(now / 60_000) * 60_000);
  await prisma.rate_Limit_Windows.upsert({
    where: { api_key_id_window_start_window_type: { api_key_id: apiKeyId, window_start: minuteBucket, window_type: "MINUTE" } },
    update: { requests_count: { increment: 1 } },
    create: { api_key_id: apiKeyId, window_start: minuteBucket, window_type: "MINUTE", requests_count: 1 }
  });

  const dayBucket = new Date(new Date().toISOString().split('T')[0] + "T00:00:00.000Z");
  await prisma.rate_Limit_Windows.upsert({
    where: { api_key_id_window_start_window_type: { api_key_id: apiKeyId, window_start: dayBucket, window_type: "DAY" } },
    update: { requests_count: { increment: 1 } },
    create: { api_key_id: apiKeyId, window_start: dayBucket, window_type: "DAY", requests_count: 1 }
  });
}
