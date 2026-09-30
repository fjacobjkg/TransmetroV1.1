import { Router } from "express";
import { getAuthenticatedUser, requireAuth, requireRole } from "../../middleware/auth.js";
import { closeTripSchema, idParamSchema, tripFiltersSchema, tripSchema, visitSchema } from "./route-operation.schema.js";
import { closeTrip, listOperationalLines, listTrips, recordVisit, startTrip } from "./route-operation.service.js";

export const routeOperationRouter = Router();
routeOperationRouter.use(requireAuth);
routeOperationRouter.get("/lines", requireRole("ADMIN", "ADMINISTRATIVO", "OPERADOR_ESTACION"), async (_request, response, next) => {
  try { response.json(await listOperationalLines(getAuthenticatedUser(response))); } catch (error) { next(error); }
});
routeOperationRouter.get("/trips", requireRole("ADMIN", "ADMINISTRATIVO", "OPERADOR_ESTACION"), async (request, response, next) => {
  const filters = tripFiltersSchema.safeParse(request.query);
  if (!filters.success) { response.status(400).json({ message: "Filtros de recorrido inválidos.", issues: filters.error.issues }); return; }
  try { response.json(await listTrips(getAuthenticatedUser(response), filters.data)); } catch (error) { next(error); }
});
routeOperationRouter.post("/trips", requireRole("ADMIN", "OPERADOR_ESTACION"), async (request, response, next) => {
  const body = tripSchema.safeParse(request.body);
  if (!body.success) { response.status(400).json({ message: "Datos del recorrido inválidos.", issues: body.error.issues }); return; }
  try { response.status(201).json({ item: await startTrip(getAuthenticatedUser(response), body.data.busId, body.data.lineId) }); } catch (error) { next(error); }
});
routeOperationRouter.post("/trips/:id/visits", requireRole("ADMIN", "OPERADOR_ESTACION"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = visitSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Datos de visita inválidos.", ...(body.success ? {} : { issues: body.error.issues }) }); return; }
  try { response.status(201).json(await recordVisit(getAuthenticatedUser(response), id.data, body.data)); } catch (error) { next(error); }
});
routeOperationRouter.post("/trips/:id/close", requireRole("ADMIN", "OPERADOR_ESTACION"), async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id);
  if (!id.success) { response.status(400).json({ message: "Identificador inválido." }); return; }
  const body = closeTripSchema.safeParse(request.body);
  if (!body.success) { response.status(400).json({ message: "Selecciona FINALIZADO o CANCELADO." }); return; }
  const state = body.data.state;
  try { response.json({ item: await closeTrip(getAuthenticatedUser(response), id.data, state) }); } catch (error) { next(error); }
});
