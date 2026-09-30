import { z } from "zod";

const username = z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/).transform((value) => value.toLowerCase());
const role = z.enum(["ADMIN", "OPERADOR_ESTACION", "ADMINISTRATIVO"]);

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username,
  password: z.string().min(12).max(200)
    .regex(/[A-Z]/, "Debe contener una letra mayúscula.")
    .regex(/[a-z]/, "Debe contener una letra minúscula.")
    .regex(/[0-9]/, "Debe contener un número."),
  role,
});

export const updateUserSchema = z.object({
  role: role.optional(),
  active: z.boolean().optional(),
}).refine((value) => value.role !== undefined || value.active !== undefined, {
  message: "Indica el rol o el estado que deseas actualizar.",
});

export const usersQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: role.optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

export const userIdSchema = z.coerce.number().int().positive();
