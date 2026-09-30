import { prisma } from "../../lib/prisma.js";

export async function getHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "ok" as const,
      database: "connected" as const,
      service: "transmetro-api",
    };
  } catch {
    return {
      status: "degraded" as const,
      database: "unavailable" as const,
      service: "transmetro-api",
    };
  }
}
