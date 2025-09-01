import { PrismaClient } from "@prisma/client";
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  // Create a demo key
  const demoKey = await prisma.aPI_Keys.upsert({
    where: { key_value: "demo-key-123" },
    update: {},
    create: {
      key_value: "demo-key-123",
      app_name: "Demo App",
      rate_limit_per_minute: 100,
      daily_quota: 5000,
      burst_per_minute: 20,
    },
  });

  // Endpoint-specific override example
  await prisma.endpoint_Limits.upsert({
    where: { api_key_id_endpoint: { api_key_id: demoKey.id, endpoint: "/v1/search" } },
    update: {},
    create: {
      api_key_id: demoKey.id,
      endpoint: "/v1/search",
      rate_limit_per_minute: 50,
      daily_quota: 2000,
      burst: 10,
    },
  });

  console.log("Seeded demo API key:", demoKey.key_value);
}

main().finally(async () => {
  await prisma.$disconnect();
});
