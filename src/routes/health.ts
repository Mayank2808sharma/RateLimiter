import { FastifyInstance } from "fastify";
import { prisma } from "../db/prisma";
import { redis } from "../redis";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/health", async (_req, reply) => {
    const dbOk = await prisma.$queryRaw`SELECT 1 as ok`.then(() => true).catch(() => false);
    const redisOk = await redis.ping().then((x) => x === "PONG").catch(() => false);
    reply.send({
      status: dbOk && redisOk ? "ok" : "degraded",
      postgres: dbOk,
      redis: redisOk,
      process: {
        pid: process.pid,
        uptime_s: Math.floor(process.uptime()),
        memory: process.memoryUsage()
      }
    });
  });
}
