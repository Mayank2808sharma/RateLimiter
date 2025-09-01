import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/adminAuth";
import { redis } from "../redis";
import { keys } from "../services/cacheKeys";

const BlockBody = z.object({
  ip: z.string().min(3),
  minutes: z.number().int().positive().default(60),
  reason: z.string().optional(),
});

export async function blockRoutes(app: FastifyInstance) {
  app.post("/api/block-ip", { preHandler: requireAdmin }, async (req, reply) => {
    const body = BlockBody.parse(req.body);
    const until = new Date(Date.now() + body.minutes * 60_000);
    await prisma.blocked_IPs.upsert({
      where: { ip_address: body.ip },
      update: { blocked_until: until, reason: body.reason },
      create: { ip_address: body.ip, blocked_until: until, reason: body.reason },
    });
    await redis.set(keys.ipBlock(body.ip), "1", "EX", body.minutes * 60);
    reply.send({ ip: body.ip, blocked_until: until.toISOString() });
  });

  app.delete("/api/block-ip/:ip", { preHandler: requireAdmin }, async (req, reply) => {
    const { ip } = req.params as { ip: string };
    await prisma.blocked_IPs.delete({ where: { ip_address: ip } }).catch(() => {});
    await redis.del(keys.ipBlock(ip));
    reply.code(204).send();
  });

  app.get("/api/blocked-ips", { preHandler: requireAdmin }, async (_req, reply) => {
    const list = await prisma.blocked_IPs.findMany({ orderBy: { created_at: "desc" } });
    reply.send(list);
  });
}
