import { Router } from "express";
import { getAuthenticatedUser, requireAuth, requireRole } from "../../middleware/auth.js";
import { assignBusLineSchema, assignParkingSchema, busSchema, busUpdateSchema, idParamSchema, parkingSchema, parkingUpdateSchema } from "./fleet.schema.js";
import { assignBusLine, assignBusParking, createBus, listBuses, listParkings, saveParking, updateBus } from "./fleet.service.js";

export const fleetRouter = Router();
fleetRouter.use(requireAuth);
fleetRouter.get("/buses", requireRole("ADMIN", "ADMINISTRATIVO"), async (request, response, next) => {
  try { response.json(await listBuses(typeof request.query.search === "string" ? request.query.search : undefined)); } catch (error) { next(error); }
});
fleetRouter.post("/buses", requireRole("ADMIN"), async (request, response, next) => {
  const body = busSchema.safeParse(request.body);
  if (!body.success) { response.status(400).json({ message: "Datos del bus inválidos.", issues: body.error.issues }); return; }
  try { response.status(201).json({ item: await createBus(getAuthenticatedUser(response).id, { code: body.data.code, plate: body.data.plate, capacity: body.data.capacity, parkingId: body.data.parkingId }) }); } catch (error) { next(error); }
});
fleetRouter.patch("/buses/:id", requireRole("ADMIN"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = busUpdateSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Actualización del bus inválida." }); return; }
  try { response.json({ item: await updateBus(getAuthenticatedUser(response).id, id.data, body.data) }); } catch (error) { next(error); }
});
fleetRouter.put("/buses/:id/line", requireRole("ADMIN"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = assignBusLineSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Asignación de línea inválida." }); return; }
  try { response.json({ item: await assignBusLine(getAuthenticatedUser(response).id, id.data, body.data.lineId) }); } catch (error) { next(error); }
});
fleetRouter.put("/buses/:id/parking", requireRole("ADMIN"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = assignParkingSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Asignación de parqueo inválida." }); return; }
  try { response.json({ item: await assignBusParking(getAuthenticatedUser(response).id, id.data, body.data.parkingId) }); } catch (error) { next(error); }
});
fleetRouter.get("/parkings", requireRole("ADMIN", "ADMINISTRATIVO"), async (request, response, next) => {
  const stationId = request.query.stationId === undefined ? undefined : idParamSchema.safeParse(request.query.stationId);
  if (stationId && !stationId.success) { response.status(400).json({ message: "Estación inválida." }); return; }
  try { response.json(await listParkings(stationId?.success ? stationId.data : undefined)); } catch (error) { next(error); }
});
fleetRouter.post("/parkings", requireRole("ADMIN"), async (request, response, next) => {
  const body = parkingSchema.safeParse(request.body);
  if (!body.success) { response.status(400).json({ message: "Datos del parqueo inválidos.", issues: body.error.issues }); return; }
  try { response.status(201).json({ item: await saveParking(getAuthenticatedUser(response).id, body.data) }); } catch (error) { next(error); }
});
fleetRouter.patch("/parkings/:id", requireRole("ADMIN"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = parkingUpdateSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Actualización de parqueo inválida." }); return; }
  try { response.json({ item: await saveParking(getAuthenticatedUser(response).id, body.data, id.data) }); } catch (error) { next(error); }
});
