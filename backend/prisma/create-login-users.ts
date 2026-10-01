import "dotenv/config";

import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";

const accounts = [
  {
    role: "ADMIN",
    name: process.env.INITIAL_ADMIN_NAME,
    username: process.env.INITIAL_ADMIN_USERNAME,
    password: process.env.INITIAL_ADMIN_PASSWORD,
  },
  {
    role: "OPERADOR_ESTACION",
    name: process.env.INITIAL_OPERATOR_NAME,
    username: process.env.INITIAL_OPERATOR_USERNAME,
    password: process.env.INITIAL_OPERATOR_PASSWORD,
  },
  {
    role: "ADMINISTRATIVO",
    name: process.env.INITIAL_STAFF_NAME,
    username: process.env.INITIAL_STAFF_USERNAME,
    password: process.env.INITIAL_STAFF_PASSWORD,
  },
] as const;

async function run(): Promise<void> {
  for (const account of accounts) {
    if (!account.name || !account.username || !account.password) {
      throw new Error(
        `Faltan datos para crear la cuenta ${account.role}.`,
      );
    }

    const role = await prisma.rol.findUniqueOrThrow({
      where: {
        nombre: account.role,
      },
    });

    const username = account.username.toLowerCase();

    const existing = await prisma.usuario.findUnique({
      where: {
        nombre_usuario: username,
      },
    });

    if (existing) {
      console.log(`El usuario ${username} ya existe.`);
      continue;
    }

    await prisma.usuario.create({
      data: {
        nombre: account.name,
        nombre_usuario: username,
        password_hash: await hashPassword(account.password),
        rol_id: role.id_rol,
        activo: true,
      },
    });

    console.log(
      `Usuario ${username} creado con rol ${account.role}.`,
    );
  }
}

run()
  .catch((error: unknown) => {
    console.error("No fue posible crear los usuarios.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });