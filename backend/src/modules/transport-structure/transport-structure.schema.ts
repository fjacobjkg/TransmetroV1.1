import { z } from "zod";

const name = z.string().trim().min(2).max(120);
const code = z.string().trim().min(1).max(30);

export const idParamSchema = z.coerce.number().int().positive();
export const municipalitySchema = z.object({ name, active: z.boolean().optional() });
export const municipalityUpdateSchema = municipalitySchema.partial().refine((value) => Object.keys(value).length > 0);
export const stationSchema = z.object({
  code,
  name,
  municipalityId: z.number().int().positive(),
  active: z.boolean().optional(),
});
export const stationUpdateSchema = stationSchema.partial().refine((value) => Object.keys(value).length > 0);
export const lineSchema = z.object({
  code,
  name,
  municipalityId: z.number().int().positive(),
  active: z.boolean().optional(),
});
export const lineUpdateSchema = z.object({ name: name.optional(), municipalityId: z.number().int().positive().optional(), active: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0);
export const lineStationsSchema = z.object({
  stations: z.array(z.object({
    stationId: z.number().int().positive(),
    order: z.number().int().positive().max(65_535),
    distanceToNext: z.number().nonnegative().max(1_000_000).nullable().optional(),
  })).min(1).max(500),
}).superRefine(({ stations }, context) => {
  const ids = stations.map((station) => station.stationId);
  const orders = stations.map((station) => station.order);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "Una estación no puede repetirse en la misma línea.", path: ["stations"] });
  if (new Set(orders).size !== orders.length) context.addIssue({ code: "custom", message: "El orden de las estaciones debe ser único.", path: ["stations"] });
  if ([...orders].sort((a, b) => a - b).some((order, index) => order !== index + 1)) context.addIssue({ code: "custom", message: "El orden de las estaciones debe ser consecutivo desde 1.", path: ["stations"] });
  if (stations[stations.length - 1]?.distanceToNext != null) context.addIssue({ code: "custom", message: "La última estación no debe tener distancia siguiente.", path: ["stations", stations.length - 1, "distanceToNext"] });
});

export const listQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  active: z.enum(["true", "false"]).optional(),
});
