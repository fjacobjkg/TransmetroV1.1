import type { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma.js";
import { verifyToken } from "../lib/jwt.js";
import {
  AUTH_COOKIE_NAME,
  getClearAuthCookieOptions,
  readAuthCookie,
} from "../modules/auth/auth.cookie.js";

export type RoleName = "ADMIN" | "OPERADOR_ESTACION" | "ADMINISTRATIVO";

export type AuthenticatedUser = {
  id: number;
  name: string;
  username: string;
  role: RoleName;
  stationIds: number[];
};

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const token = readAuthCookie(request);
  if (!token) {
    response.status(401).json({ message: "Se requiere autenticación." });
    return;
  }

  let payload: ReturnType<typeof verifyToken>;
  try {
    payload = verifyToken(token);
  } catch {
    response.cookie(AUTH_COOKIE_NAME, "", getClearAuthCookieOptions());
    response.status(401).json({ message: "La sesión es inválida o ha expirado." });
    return;
  }

  try {
    const user = await prisma.usuario.findUnique({
      where: { id_usuario: payload.sub },
      select: {
        id_usuario: true,
        nombre: true,
        nombre_usuario: true,
        activo: true,
        rol: { select: { nombre: true, activo: true } },
        asignaciones_estacion: {
          where: { fecha_fin: null, estacion: { activo: true }, fecha_inicio: { lte: new Date() } },
          select: { estacion_id: true },
        },
      },
    });

    if (!user || !user.activo || !user.rol.activo) {
      response.cookie(AUTH_COOKIE_NAME, "", getClearAuthCookieOptions());
      response.status(401).json({ message: "La cuenta ya no está activa." });
      return;
    }

    if (!["ADMIN", "OPERADOR_ESTACION", "ADMINISTRATIVO"].includes(user.rol.nombre)) {
      response.status(403).json({ message: "El rol de esta cuenta no está habilitado." });
      return;
    }

    response.locals.user = {
      id: user.id_usuario,
      name: user.nombre,
      username: user.nombre_usuario,
      role: user.rol.nombre as RoleName,
      stationIds: user.asignaciones_estacion.map(({ estacion_id }) => estacion_id),
    } satisfies AuthenticatedUser;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: RoleName[]) {
  return (_request: Request, response: Response, next: NextFunction): void => {
    const user = response.locals.user as AuthenticatedUser | undefined;
    if (!user || !roles.includes(user.role)) {
      response.status(403).json({ message: "No tienes permiso para realizar esta acción." });
      return;
    }
    next();
  };
}

export function getAuthenticatedUser(response: Response): AuthenticatedUser {
  return response.locals.user as AuthenticatedUser;
}
