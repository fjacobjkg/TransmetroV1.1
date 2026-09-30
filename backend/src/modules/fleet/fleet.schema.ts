import { z } from "zod";
export const idParamSchema = z.coerce.number().int().positive();
export const busSchema = z.object({ code: z.string().trim().min(1).max(30), plate: z.string().trim().min(4).max(20), capacity: z.number().int().positive().max(65_535), parkingId: z.number().int().positive() });
export const busUpdateSchema = z.object({ code: z.string().trim().min(1).max(30).optional(), plate: z.string().trim().min(4).max(20).optional(), capacity: z.number().int().positive().max(65_535).optional(), active: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
export const parkingSchema = z.object({ stationId: z.number().int().positive(), name: z.string().trim().min(2).max(120), active: z.boolean().optional() });
export const parkingUpdateSchema = z.object({ name: z.string().trim().min(2).max(120).optional(), active: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
export const assignBusLineSchema = z.object({ lineId: z.number().int().positive().nullable() });
export const assignParkingSchema = z.object({ parkingId: z.number().int().positive() });
