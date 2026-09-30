import "dotenv/config";
import { z } from "zod";

const optionalEnvironmentString = (minimumLength: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(minimumLength).optional(),
);

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  PORT: z.coerce.number().int().positive().max(65_535).default(3000),

  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),

  DATABASE_HOST: z.string().min(1).default("localhost"),
  DATABASE_PORT: z.coerce.number().int().positive().max(65_535).default(3306),
  DATABASE_USER: z.string().min(1).default("transmetro_app"),
  DATABASE_PASSWORD: z.string().min(1).default("transmetro_dev"),
  DATABASE_NAME: z.string().min(1).default("transmetro_db"),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(3600),
  INITIAL_ADMIN_NAME: optionalEnvironmentString(2),
  INITIAL_ADMIN_USERNAME: optionalEnvironmentString(3),
  INITIAL_ADMIN_PASSWORD: optionalEnvironmentString(12),
}).superRefine((values, context) => {
  const provided = [
    values.INITIAL_ADMIN_NAME,
    values.INITIAL_ADMIN_USERNAME,
    values.INITIAL_ADMIN_PASSWORD,
  ].filter(Boolean).length;

  if (provided !== 0 && provided !== 3) {
    context.addIssue({
      code: "custom",
      message: "Define los tres campos INITIAL_ADMIN_* o ninguno.",
      path: ["INITIAL_ADMIN_NAME"],
    });
  }
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error(
    "La configuración del entorno no es válida:",
    parsedEnvironment.error.flatten().fieldErrors
  );

  throw new Error("Configuración de entorno inválida.");
}

export const env = parsedEnvironment.data;
