import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`API disponible en http://localhost:${env.PORT}/api`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Señal ${signal} recibida. Cerrando la API...`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
