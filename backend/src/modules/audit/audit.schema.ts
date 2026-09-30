import { z } from "zod";

export const auditQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  action: z.string().trim().max(80).optional(),
  entity: z.string().trim().max(80).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
}).refine((filters) => !filters.from || !filters.to || filters.from <= filters.to, {
  message: "La fecha inicial debe ser anterior a la fecha final.",
});
