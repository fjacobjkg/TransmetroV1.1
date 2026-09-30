import { Router } from "express";
import { getAuthenticatedUser, requireAuth, requireRole } from "../../middleware/auth.js";
import {
  idParamSchema, lineSchema, lineStationsSchema, lineUpdateSchema, listQuerySchema,
  municipalitySchema, municipalityUpdateSchema, stationSchema, stationUpdateSchema,
} from "./transport-structure.schema.js";
import { getLine, listLines, listMunicipalities, listStations, replaceLineStations, saveLine, saveMunicipality, saveStation } from "./transport-structure.service.js";

export const transportStructureRouter = Router();
transportStructureRouter.use(requireAuth);
const admin = requireRole("ADMIN");
const canRead = requireRole("ADMIN", "ADMINISTRATIVO");
const parseActive = (value?: "true" | "false") => value === undefined ? undefined : value === "true";

transportStructureRouter.get("/municipalities", canRead, async (request, response, next) => {
  const query = listQuerySchema.safeParse(request.query);
  if (!query.success) { response.status(400).json({ message: "Filtros inválidos." }); return; }
  try { response.json(await listMunicipalities(query.data.search, parseActive(query.data.active))); } catch (error) { next(error); }
});
transportStructureRouter.post("/municipalities", admin, async (request, response, next) => {
  const body = municipalitySchema.safeParse(request.body);
  if (!body.success) { response.status(400).json({ message: "Datos de municipalidad inválidos.", issues: body.error.issues }); return; }
  try { response.status(201).json({ item: await saveMunicipality(getAuthenticatedUser(response).id, body.data) }); } catch (error) { next(error); }
});
transportStructureRouter.patch("/municipalities/:id", admin, async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = municipalityUpdateSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Actualización inválida." }); return; }
  try { response.json({ item: await saveMunicipality(getAuthenticatedUser(response).id, body.data, id.data) }); } catch (error) { next(error); }
});

transportStructureRouter.get("/stations", canRead, async (request, response, next) => {
  const query = listQuerySchema.safeParse(request.query);
  if (!query.success) { response.status(400).json({ message: "Filtros inválidos." }); return; }
  try { response.json(await listStations(query.data.search, parseActive(query.data.active))); } catch (error) { next(error); }
});
transportStructureRouter.post("/stations", admin, async (request, response, next) => {
  const body = stationSchema.safeParse(request.body);
  if (!body.success) { response.status(400).json({ message: "Datos de estación inválidos.", issues: body.error.issues }); return; }
  try { response.status(201).json({ item: await saveStation(getAuthenticatedUser(response).id, body.data) }); } catch (error) { next(error); }
});
transportStructureRouter.patch("/stations/:id", admin, async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = stationUpdateSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Actualización inválida." }); return; }
  try { response.json({ item: await saveStation(getAuthenticatedUser(response).id, body.data, id.data) }); } catch (error) { next(error); }
});

transportStructureRouter.get("/lines", canRead, async (request, response, next) => {
  const query = listQuerySchema.safeParse(request.query);
  if (!query.success) { response.status(400).json({ message: "Filtros inválidos." }); return; }
  try { response.json(await listLines(query.data.search, parseActive(query.data.active))); } catch (error) { next(error); }
});
transportStructureRouter.post("/lines", admin, async (request, response, next) => {
  const body = lineSchema.safeParse(request.body);
  if (!body.success) { response.status(400).json({ message: "Datos de línea inválidos.", issues: body.error.issues }); return; }
  try { response.status(201).json({ item: await saveLine(getAuthenticatedUser(response).id, body.data) }); } catch (error) { next(error); }
});
transportStructureRouter.get("/lines/:id", canRead, async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id);
  if (!id.success) { response.status(400).json({ message: "Identificador inválido." }); return; }
  try { response.json({ item: await getLine(id.data) }); } catch (error) { next(error); }
});
transportStructureRouter.patch("/lines/:id", admin, async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = lineUpdateSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Actualización inválida." }); return; }
  try { response.json({ item: await saveLine(getAuthenticatedUser(response).id, body.data, id.data) }); } catch (error) { next(error); }
});
transportStructureRouter.put("/lines/:id/stations", admin, async (request, response, next) => {
  const id = idParamSchema.safeParse(request.params.id); const body = lineStationsSchema.safeParse(request.body);
  if (!id.success || !body.success) { response.status(400).json({ message: "Orden de estaciones inválido.", ...(body.success ? {} : { issues: body.error.issues }) }); return; }
  try { response.json({ items: await replaceLineStations(getAuthenticatedUser(response).id, id.data, body.data.stations) }); } catch (error) { next(error); }
});
