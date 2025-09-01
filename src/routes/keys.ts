import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/adminAuth";

const CreateKey = z.object({
  app_name: z.string().min(1),
  rate_limit_per_minute: z.number().int().positive().optional(),
  daily_quota: z.number().int().positive().optional(),
  burst_per_minute: z.number().int().min(0).optional(),
  key_value: z.string().min(8).optional() // allow custom key for testing
});

const UpdateKey = z.object({
  app_name: z.string().min(1).optional(),
  rate_limit_per_minute: z.number().int().positive().optional(),
  daily_quota: z.number().int().positive().optional(),
  burst_per_minute: z.number().int().min(0).optional(),
  is_active: z.boolean().optional()
});

export async function keyRoutes(app: FastifyInstance) {
  app.post("/api/keys", { preHandler: requireAdmin }, async (req, reply) => {
    const body = CreateKey.parse(req.body);
    const keyValue = body.key_value ?? `rk_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    const created = await prisma.aPI_Keys.create({
      data: {
        key_value: keyValue,
        app_name: body.app_name,
        rate_limit_per_minute: body.rate_limit_per_minute ?? 1000,
        daily_quota: body.daily_quota ?? 100000,
        burst_per_minute: body.burst_per_minute ?? 0,
      },
    });
    reply.code(201).send({ id: created.id, key_value: created.key_value });
  });

  app.get("/api/keys", { preHandler: requireAdmin }, async (_req, reply) => {
    const keys = await prisma.aPI_Keys.findMany({ orderBy: { created_at: "desc" } });
    reply.send(keys);
  });

  app.put("/api/keys/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = UpdateKey.parse(req.body);
    const updated = await prisma.aPI_Keys.update({ where: { id }, data: body });
    reply.send(updated);
  });

  app.delete("/api/keys/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.aPI_Keys.update({ where: { id }, data: { is_active: false } });
    reply.code(204).send();
  });
}
