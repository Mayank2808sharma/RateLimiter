import { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config";

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const token = req.headers["x-admin-token"];
  if (token !== config.adminToken) {
    reply.code(401).send({ error: "Unauthorized" });
    return;
  }
}
