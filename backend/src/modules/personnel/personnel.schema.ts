import { z } from "zod";
const id = z.number().int().positive();
const person = z.string().trim().min(2).max(120);
export const pilotSchema = z.object({
  name: person,
  residence: z.string().trim().min(3).max(255),
  education: z.string().trim().max(5_000).nullable().optional(),
  phone: z.string().trim().max(25).optional().nullable(),
  email: z.email().max(120).optional().nullable(),
});
export const pilotUpdateSchema = pilotSchema.partial().extend({ active: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
export const assignmentSchema = z.object({ stationId: id });
export const idParamSchema = z.coerce.number().int().positive();
