import { z } from "zod";
export const reportQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  municipalityId: z.coerce.number().int().positive().optional(),
  lineId: z.coerce.number().int().positive().optional(),
  stationId: z.coerce.number().int().positive().optional(),
  busId: z.coerce.number().int().positive().optional(),
}).refine((value) => !value.from || !value.to || value.from <= value.to, { message: "El inicio del período debe ser anterior al final." });
