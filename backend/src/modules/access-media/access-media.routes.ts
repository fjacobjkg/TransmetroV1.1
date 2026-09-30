import { Router } from "express";
import { getAuthenticatedUser, requireAuth, requireRole } from "../../middleware/auth.js";
import { accessCountFiltersSchema, accessCountSchema, accessCountUpdateSchema, idParamSchema, recordIdParamSchema, mediaSchema, mediaUpdateSchema, stationMediaSchema } from "./access-media.schema.js";
import { createAccessCount, listAccessCounts, listMedia, listStationMedia, saveMedia, setStationMedia, updateAccessCount } from "./access-media.service.js";

export const accessMediaRouter = Router();
accessMediaRouter.use(requireAuth);
accessMediaRouter.get("/media", requireRole("ADMIN", "ADMINISTRATIVO"), async (_request, response, next) => {
  try { response.json(await listMedia()); } catch (error) { next(error); }
});
accessMediaRouter.post("/media", requireRole("ADMIN"), async (request, response, next) => {
  const body = mediaSchema.safeParse(request.body);
  if (!body.success) { response.status(400).json({ message: "Datos del medio inválidos.", issues: body.error.issues }); return; }
  try { response.status(201).json({ item: await saveMedia(getAuthenticatedUser(response).id, body.data) }); } catch (error) { next(error); }
});
accessMediaRouter.patch("/media/:id", requireRole("ADMIN"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = mediaUpdateSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Actualización inválida." }); return; }
  try { response.json({ item: await saveMedia(getAuthenticatedUser(response).id, body.data, id.data) }); } catch (error) { next(error); }
});
accessMediaRouter.get("/stations/:stationId/media", requireRole("ADMIN", "ADMINISTRATIVO", "OPERADOR_ESTACION"), async (request, response, next) => {
  const stationId = idParamSchema.safeParse(request.params.stationId);
  if (!stationId.success) { response.status(400).json({ message: "Estación inválida." }); return; }
  const user = getAuthenticatedUser(response);
  if (user.role === "OPERADOR_ESTACION" && !user.stationIds.includes(stationId.data)) { response.status(403).json({ message: "No tienes asignación vigente en esta estación." }); return; }
  try { response.json(await listStationMedia(stationId.data)); } catch (error) { next(error); }
});
accessMediaRouter.put("/stations/:stationId/media", requireRole("ADMIN"), async (request, response, next) => {
  const stationId = idParamSchema.safeParse(request.params.stationId); const body = stationMediaSchema.safeParse(request.body);
  if (!stationId.success || !body.success) { response.status(400).json({ message: "Habilitación de medio inválida." }); return; }
  try { response.json({ item: await setStationMedia(getAuthenticatedUser(response).id, stationId.data, body.data.mediaId, body.data.active ?? true) }); } catch (error) { next(error); }
});
accessMediaRouter.get("/access-counts", requireRole("ADMIN", "ADMINISTRATIVO", "OPERADOR_ESTACION"), async (request, response, next) => {
  const station = request.query.stationId === undefined ? undefined : idParamSchema.safeParse(request.query.stationId);
  if (station && !station.success) { response.status(400).json({ message: "Estación inválida." }); return; }
  const filters = accessCountFiltersSchema.safeParse(request.query);
  if (!filters.success) { response.status(400).json({ message: "Fechas o estación inválidas.", issues: filters.error.issues }); return; }
  const { from, to } = filters.data;
  const user = getAuthenticatedUser(response);
  if (user.role === "OPERADOR_ESTACION" && station?.success && !user.stationIds.includes(station.data)) { response.status(403).json({ message: "No tienes asignación vigente en esta estación." }); return; }
  try { response.json(await listAccessCounts({
    ...(station?.success ? { stationId: station.data } : {}),
    ...(user.role === "OPERADOR_ESTACION" ? { stationIds: user.stationIds, actorId: user.id } : {}),
    ...(from ? { from } : {}), ...(to ? { to } : {}),
  })); } catch (error) { next(error); }
});
accessMediaRouter.post("/access-counts", requireRole("OPERADOR_ESTACION"), async (request, response, next) => {
  const body = accessCountSchema.safeParse(request.body);
  if (!body.success) { response.status(400).json({ message: "Conteo inválido.", issues: body.error.issues }); return; }
  const user = getAuthenticatedUser(response);
  try { response.status(201).json({ item: await createAccessCount(user.id, user.stationIds, body.data) }); } catch (error) { next(error); }
});
accessMediaRouter.patch("/access-counts/:id", requireRole("ADMIN", "OPERADOR_ESTACION"), async (request, response, next) => {
  const id = recordIdParamSchema.safeParse(request.params.id); const body = accessCountUpdateSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Corrección de conteo inválida." }); return; }
  const user = getAuthenticatedUser(response);
  if (user.role !== "ADMIN" && user.role !== "OPERADOR_ESTACION") { response.status(403).json({ message: "No tienes permiso para corregir conteos." }); return; }
  const actor = user.role === "ADMIN"
    ? { id: user.id, role: "ADMIN" as const }
    : { id: user.id, role: "OPERADOR_ESTACION" as const };
  try { response.json({ item: await updateAccessCount(actor, user.stationIds, id.data, body.data.quantity) }); } catch (error) { next(error); }
});
