import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { env } from "../src/config/env.js";

const roles = ["ADMIN", "OPERADOR_ESTACION", "ADMINISTRATIVO"] as const;

async function seed(): Promise<void> {
  for (const nombre of roles) {
    await prisma.rol.upsert({
      where: { nombre },
      update: { activo: true },
      create: { nombre, activo: true },
    });
  }

  const { INITIAL_ADMIN_NAME, INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD } = env;
  if (!INITIAL_ADMIN_NAME || !INITIAL_ADMIN_USERNAME || !INITIAL_ADMIN_PASSWORD) {
    console.log("Roles base verificados. No se solicitó crear un administrador inicial.");
    return;
  }

  if (!/[A-Z]/.test(INITIAL_ADMIN_PASSWORD) || !/[a-z]/.test(INITIAL_ADMIN_PASSWORD) || !/[0-9]/.test(INITIAL_ADMIN_PASSWORD)) {
    throw new Error("La contraseña inicial debe incluir mayúscula, minúscula y número.");
  }

  const existing = await prisma.usuario.findUnique({
    where: { nombre_usuario: INITIAL_ADMIN_USERNAME.toLowerCase() },
  });
  if (existing) {
    console.log("El usuario administrador inicial ya existe; se conservó su cuenta.");
    return;
  }

  const adminRole = await prisma.rol.findUniqueOrThrow({ where: { nombre: "ADMIN" } });
  await prisma.usuario.create({
    data: {
      nombre: INITIAL_ADMIN_NAME,
      nombre_usuario: INITIAL_ADMIN_USERNAME.toLowerCase(),
      password_hash: await hashPassword(INITIAL_ADMIN_PASSWORD),
      rol_id: adminRole.id_rol,
      activo: true,
    },
  });
  console.log(`Cuenta administradora inicial creada para ${INITIAL_ADMIN_USERNAME.toLowerCase()}.`);
}

seed()
  .catch((error: unknown) => {
    console.error("No fue posible cargar los datos iniciales.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
