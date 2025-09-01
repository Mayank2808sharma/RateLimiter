import { FastifyInstance } from "fastify";
import { keyRoutes } from "./keys";
import { limitRoutes } from "./limits";
import { blockRoutes } from "./block";
import { analyticsRoutes } from "./analytics";
import { healthRoutes } from "./health";

export async function registerRoutes(app: FastifyInstance) {
  await keyRoutes(app);
  await limitRoutes(app);
  await blockRoutes(app);
  await analyticsRoutes(app);
  await healthRoutes(app);
}
