import { Router } from "express";

import { requireAuth, requireRole } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";

export const roleRouter = Router();

roleRouter.get("/", requireAuth, requireRole("ADMIN"), async (_request, response, next) => {
  try {
    const roles = await prisma.rol.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id_rol: true, nombre: true, activo: true },
    });
    response.json({ items: roles });
  } catch (error) {
    next(error);
  }
});
