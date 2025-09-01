import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  adminToken: process.env.ADMIN_TOKEN || 'change-me-admin-token',
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379/0',
  defaults: {
    ratePerMinute: parseInt(process.env.DEFAULT_RATE_PER_MINUTE || '1000', 10),
    dailyQuota: parseInt(process.env.DEFAULT_DAILY_QUOTA || '100000', 10),
    burst: parseInt(process.env.DEFAULT_BURST || '0', 10),
  }
};
