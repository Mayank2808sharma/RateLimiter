import { FastifyInstance } from "fastify";
import { requireAdmin } from "../middleware/adminAuth";
import { prisma } from "../db/prisma";
import dayjs from "dayjs";

export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/api/usage/:api_key", { preHandler: requireAdmin }, async (req, reply) => {
    const { api_key } = req.params as { api_key: string };
    const key = await prisma.aPI_Keys.findUnique({ where: { key_value: api_key } });
    if (!key) return reply.code(404).send({ error: "not_found" });

    const since = dayjs().subtract(1, "day").toDate();
    const last60m = await prisma.rate_Limit_Windows.findMany({
      where: { api_key_id: key.id, window_type: "MINUTE", window_start: { gte: since } },
      orderBy: { window_start: "asc" },
      select: { window_start: true, requests_count: true }
    });

    const lastViolations = await prisma.request_Logs.findMany({
      where: { api_key_id: key.id, was_allowed: false, timestamp: { gte: dayjs().subtract(1, "day").toDate() } },
      orderBy: { timestamp: "desc" },
      take: 100
    });

    reply.send({ last60m, lastViolations });
  });

  app.get("/api/violations", { preHandler: requireAdmin }, async (_req, reply) => {
    const recent = await prisma.request_Logs.findMany({
      where: { was_allowed: false },
      orderBy: { timestamp: "desc" },
      take: 200
    });
    reply.send(recent);
  });
}
