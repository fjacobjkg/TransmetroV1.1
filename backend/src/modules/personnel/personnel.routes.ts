import { Router } from "express";
import { getAuthenticatedUser, requireAuth, requireRole } from "../../middleware/auth.js";
import { assignmentSchema, idParamSchema, pilotSchema, pilotUpdateSchema } from "./personnel.schema.js";
import { assignOperator, endOperatorAssignment, listOperators, listPilots, savePilot } from "./personnel.service.js";

export const personnelRouter = Router();
personnelRouter.use(requireAuth);
personnelRouter.get("/pilots", requireRole("ADMIN", "ADMINISTRATIVO"), async (request, response, next) => {
  try { response.json(await listPilots(typeof request.query.search === "string" ? request.query.search : undefined)); } catch (error) { next(error); }
});
personnelRouter.post("/pilots", requireRole("ADMIN"), async (request, response, next) => {
  const body = pilotSchema.safeParse(request.body);
  if (!body.success) { response.status(400).json({ message: "Datos del piloto inválidos.", issues: body.error.issues }); return; }
  try { response.status(201).json({ item: await savePilot(getAuthenticatedUser(response).id, body.data) }); } catch (error) { next(error); }
});
personnelRouter.patch("/pilots/:id", requireRole("ADMIN"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = pilotUpdateSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Actualización del piloto inválida." }); return; }
  try { response.json({ item: await savePilot(getAuthenticatedUser(response).id, body.data, id.data) }); } catch (error) { next(error); }
});
personnelRouter.get("/operators", requireRole("ADMIN", "ADMINISTRATIVO"), async (_request, response, next) => {
  try { response.json(await listOperators()); } catch (error) { next(error); }
});
personnelRouter.post("/operators/:userId/stations", requireRole("ADMIN"), async (request, response, next) => {
  const userId = idParamSchema.safeParse(request.params.userId); const body = assignmentSchema.safeParse(request.body);
  if (!userId.success || !body.success) { response.status(400).json({ message: "Asignación inválida." }); return; }
  try { response.status(201).json({ item: await assignOperator(getAuthenticatedUser(response).id, userId.data, body.data.stationId) }); } catch (error) { next(error); }
});
personnelRouter.delete("/operator-assignments/:id", requireRole("ADMIN"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id);
  if (!id.success) { response.status(400).json({ message: "Identificador inválido." }); return; }
  try { response.json({ item: await endOperatorAssignment(getAuthenticatedUser(response).id, id.data) }); } catch (error) { next(error); }
});
