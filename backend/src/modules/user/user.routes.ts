import { Router } from "express";

import { getAuthenticatedUser, requireAuth, requireRole } from "../../middleware/auth.js";
import { createUserSchema, updateUserSchema, userIdSchema, usersQuerySchema } from "./user.schema.js";
import { createUser, listUsers, updateUser } from "./user.service.js";

export const userRouter = Router();
userRouter.use(requireAuth, requireRole("ADMIN"));

userRouter.get("/", async (request, response, next) => {
  const parsed = usersQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ message: "Filtros de usuarios inválidos.", issues: parsed.error.issues });
    return;
  }
  try {
    response.json(await listUsers(parsed.data));
  } catch (error) {
    next(error);
  }
});

userRouter.post("/", async (request, response, next) => {
  const parsed = createUserSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Datos de usuario inválidos.", issues: parsed.error.issues });
    return;
  }
  try {
    const user = await createUser(getAuthenticatedUser(response).id, parsed.data);
    response.status(201).json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_ALREADY_EXISTS") {
      response.status(409).json({ message: "Ese nombre de usuario ya está registrado." });
      return;
    }
    if (error instanceof Error && error.message === "ROLE_UNAVAILABLE") {
      response.status(400).json({ message: "El rol seleccionado no está disponible." });
      return;
    }
    next(error);
  }
});

userRouter.patch("/:id", async (request, response, next) => {
  const id = userIdSchema.safeParse(request.params.id);
  const parsed = updateUserSchema.safeParse(request.body);
  if (!id.success || !parsed.success) {
    response.status(400).json({ message: "Actualización de usuario inválida." });
    return;
  }
  if (id.data === getAuthenticatedUser(response).id && parsed.data.active === false) {
    response.status(400).json({ message: "No puedes desactivar tu propia cuenta." });
    return;
  }
  try {
    response.json({ user: await updateUser(getAuthenticatedUser(response).id, id.data, parsed.data) });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      response.status(404).json({ message: "No se encontró el usuario." });
      return;
    }
    if (error instanceof Error && error.message === "ROLE_UNAVAILABLE") {
      response.status(400).json({ message: "El rol seleccionado no está disponible." });
      return;
    }
    if (error instanceof Error && error.message === "LAST_ACTIVE_ADMIN") {
      response.status(409).json({ message: "Debe quedar al menos una cuenta administradora activa." });
      return;
    }
    if (error instanceof Error && error.message === "LAST_STATION_OPERATOR") {
      response.status(409).json({ message: "La operación dejaría una estación de línea activa sin operador responsable." });
      return;
    }
    next(error);
  }
});
