import { z } from "zod";
const text = z.string().trim().min(2).max(120);
export const idParamSchema = z.coerce.number().int().positive();
export const accessSchema = z.object({ stationId: z.number().int().positive(), name: z.string().trim().min(2).max(100), active: z.boolean().optional() });
export const accessUpdateSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), active: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
export const guardSchema = z.object({ name: text, phone: z.string().trim().max(25).nullable().optional() });
export const guardUpdateSchema = z.object({ name: text.optional(), phone: z.string().trim().max(25).nullable().optional(), active: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
export const guardAssignmentSchema = z.object({ guardId: z.number().int().positive() });
