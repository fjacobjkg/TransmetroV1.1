import { prisma } from "../../lib/prisma.js";
import { verifyPassword } from "../../lib/password.js";
import { signToken } from "../../lib/jwt.js";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Usuario o contraseña incorrectos.");
    this.name = "InvalidCredentialsError";
  }
}

export async function login(username: string, password: string) {
  const user = await prisma.usuario.findUnique({
    where: { nombre_usuario: username },
    include: { rol: true, asignaciones_estacion: {
      where: { fecha_fin: null, estacion: { activo: true }, fecha_inicio: { lte: new Date() } },
      select: { estacion_id: true },
    } },
  });

  if (!user || !user.activo || !user.rol.activo) {
    throw new InvalidCredentialsError();
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) throw new InvalidCredentialsError();

  const token = signToken({
    sub: user.id_usuario,
    username: user.nombre_usuario,
    role: user.rol.nombre,
  });

  return {
    token,
    user: {
      id: user.id_usuario,
      name: user.nombre,
      username: user.nombre_usuario,
      role: user.rol.nombre,
      stationIds: user.asignaciones_estacion.map(({ estacion_id }) => estacion_id),
    },
  };
}
