import Fastify from "fastify";
import { registerRoutes } from "./routes";
import { config } from "./config";

async function main() {
  const app = Fastify({ logger: true });

  app.addHook('onRequest', async (req, _reply) => {
    // basic CORS for demo use
    req.headers["access-control-allow-origin"] = "*";
  });

  await registerRoutes(app);

  await app.listen({ port: config.port, host: "0.0.0.0" });
  app.log.info(`Rate limiter listening on :${config.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
