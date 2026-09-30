import { z } from "zod";
export const idParamSchema = z.coerce.number().int().positive();
export const mediaSchema = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(255).nullable().optional() });
export const mediaUpdateSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), description: z.string().trim().max(255).nullable().optional(), active: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
export const stationMediaSchema = z.object({ mediaId: z.number().int().positive(), active: z.boolean().optional() });
export const accessCountSchema = z.object({
  stationMediaId: z.number().int().positive(),
  recordDate: z.iso.date(),
  quantity: z.number().int().nonnegative().max(4_294_967_295),
});
export const accessCountUpdateSchema = z.object({ quantity: z.number().int().nonnegative().max(4_294_967_295) });

export const accessCountFiltersSchema = z.object({ stationId: idParamSchema.optional(), from: z.iso.date().optional(), to: z.iso.date().optional() }).refine(value => !value.from || !value.to || value.from <= value.to, { message: "Período inválido.", path: ["to"] });

export const recordIdParamSchema = z.coerce.bigint().positive().max(18_446_744_073_709_551_615n);
