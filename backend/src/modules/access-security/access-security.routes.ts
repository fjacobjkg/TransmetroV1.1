import { Router } from "express";
import { getAuthenticatedUser, requireAuth, requireRole } from "../../middleware/auth.js";
import { accessSchema, accessUpdateSchema, guardAssignmentSchema, guardSchema, guardUpdateSchema, idParamSchema } from "./access-security.schema.js";
import { assignGuard, endGuardAssignment, listAccesses, listGuards, saveAccess, saveGuard } from "./access-security.service.js";

export const accessSecurityRouter = Router();
accessSecurityRouter.use(requireAuth);
accessSecurityRouter.get("/accesses", requireRole("ADMIN", "ADMINISTRATIVO"), async (request, response, next) => {
  const station = request.query.stationId === undefined ? undefined : idParamSchema.safeParse(request.query.stationId);
  if (station && !station.success) { response.status(400).json({ message: "Estación inválida." }); return; }
  try { response.json(await listAccesses(station?.success ? station.data : undefined)); } catch (error) { next(error); }
});
accessSecurityRouter.post("/accesses", requireRole("ADMIN"), async (request, response, next) => {
  const body = accessSchema.safeParse(request.body);
  if (!body.success) { response.status(400).json({ message: "Datos de acceso inválidos.", issues: body.error.issues }); return; }
  try { response.status(201).json({ item: await saveAccess(getAuthenticatedUser(response).id, body.data) }); } catch (error) { next(error); }
});
accessSecurityRouter.patch("/accesses/:id", requireRole("ADMIN"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = accessUpdateSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Actualización inválida." }); return; }
  try { response.json({ item: await saveAccess(getAuthenticatedUser(response).id, body.data, id.data) }); } catch (error) { next(error); }
});
accessSecurityRouter.get("/guards", requireRole("ADMIN", "ADMINISTRATIVO"), async (request, response, next) => {
  try { response.json(await listGuards(typeof request.query.search === "string" ? request.query.search : undefined)); } catch (error) { next(error); }
});
accessSecurityRouter.post("/guards", requireRole("ADMIN"), async (request, response, next) => {
  const body = guardSchema.safeParse(request.body);
  if (!body.success) { response.status(400).json({ message: "Datos del guardia inválidos.", issues: body.error.issues }); return; }
  try { response.status(201).json({ item: await saveGuard(getAuthenticatedUser(response).id, body.data) }); } catch (error) { next(error); }
});
accessSecurityRouter.patch("/guards/:id", requireRole("ADMIN"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = guardUpdateSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Actualización inválida." }); return; }
  try { response.json({ item: await saveGuard(getAuthenticatedUser(response).id, body.data, id.data) }); } catch (error) { next(error); }
});
accessSecurityRouter.post("/accesses/:id/guards", requireRole("ADMIN"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = guardAssignmentSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Asignación inválida." }); return; }
  try { response.status(201).json({ item: await assignGuard(getAuthenticatedUser(response).id, id.data, body.data.guardId) }); } catch (error) { next(error); }
});
accessSecurityRouter.delete("/guard-assignments/:id", requireRole("ADMIN"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id);
  if (!id.success) { response.status(400).json({ message: "Identificador inválido." }); return; }
  try { response.json({ item: await endGuardAssignment(getAuthenticatedUser(response).id, id.data) }); } catch (error) { next(error); }
});
