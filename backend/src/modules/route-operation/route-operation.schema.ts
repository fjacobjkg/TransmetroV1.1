import { z } from "zod";
export const idParamSchema = z.coerce.bigint().positive().max(18_446_744_073_709_551_615n);
export const tripSchema = z.object({ busId: z.number().int().positive(), lineId: z.number().int().positive() });
export const visitSchema = z.object({
  stationId: z.number().int().positive(),
  occupancy: z.number().int().nonnegative().max(65_535),
  demand: z.number().int().nonnegative().max(4_294_967_295),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
});
export const tripFiltersSchema = z.object({
  lineId: z.coerce.number().int().positive().optional(),
  busId: z.coerce.number().int().positive().optional(),
  stationId: z.coerce.number().int().positive().optional(),
  state: z.enum(["EN_CURSO", "FINALIZADO", "CANCELADO"]).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
}).refine((value) => !value.from || !value.to || value.from <= value.to, { message: "La fecha inicial debe ser anterior a la final.", path: ["to"] });
export const closeTripSchema = z.object({ state: z.enum(["FINALIZADO", "CANCELADO"]) });
