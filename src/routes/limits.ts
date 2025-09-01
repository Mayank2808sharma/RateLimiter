import { FastifyInstance } from "fastify";
import { z } from "zod";
import { checkLimit, getKeyByValue, recordSuccess, getUsageSnapshot } from "../services/rateLimiter";

const CheckLimitBody = z.object({
  api_key: z.string().min(8).optional(),
  endpoint: z.string().min(1),
  ip: z.string().min(3).optional()
});

const RecordBody = z.object({
  api_key: z.string().min(8).optional(),
  endpoint: z.string().min(1),
  ip: z.string().min(3).optional()
});

export async function limitRoutes(app: FastifyInstance) {
  app.post("/api/check-limit", async (req, reply) => {
  try {
    const body = CheckLimitBody.parse(req.body);
    const apiKey = body.api_key ?? String(req.headers["x-api-key"] || "");
    const ip = body.ip ?? req.ip;
    const res = await checkLimit({ keyValue: apiKey, endpoint: body.endpoint, ip });

    return reply.send({
      allowed: res.allowed,
      reason: res.reason,
      retry_after_ms: res.retry_after_ms,
      usage: {
        minute: { used: res.minute_used, limit: res.minute_limit },
        day: { used: res.day_used, limit: res.day_limit },
      },
      burst_allowed: res.burst_allowed
    });
  } catch (error) {
    console.error("Error in /api/check-limit:", error);
    return reply.status(400).send({ error: error instanceof Error ? error.message : "Invalid input" });
  }
});


  app.post("/api/record-request", async (req, reply) => {
    const body = RecordBody.parse(req.body);
    const apiKeyVal = body.api_key ?? String(req.headers["x-api-key"] || "");
    const ip = body.ip ?? req.ip;
    const key = await getKeyByValue(apiKeyVal);
    if (!key) {
      reply.code(401).send({ error: "invalid_api_key" });
      return;
    }
    await recordSuccess({ apiKeyId: key.id, endpoint: body.endpoint, ip });
    reply.code(204).send();
  });

  app.get("/api/limits/:api_key", async (req, reply) => {
    const { api_key } = req.params as { api_key: string };
    const key = await getKeyByValue(api_key);
    if (!key) {
      reply.code(404).send({ error: "not_found" });
      return;
    }
    const usage = await getUsageSnapshot(key.id, "*");
    reply.send({
      api_key: key.key_value,
      app_name: key.app_name,
      is_active: key.is_active,
      limits: {
        per_minute: key.rate_limit_per_minute + (key.burst_per_minute || 0),
        daily_quota: key.daily_quota
      },
      usage
    });
  });
}
