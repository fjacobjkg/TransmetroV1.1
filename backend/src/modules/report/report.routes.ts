import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { reportQuerySchema } from "./report.schema.js";
import { getAccessMediaReport, getFleetReport, getLineVisualization, getOperationsReport, getOverview } from "./report.service.js";

export const reportRouter = Router();
reportRouter.use(requireAuth, requireRole("ADMIN", "ADMINISTRATIVO"));
reportRouter.get("/overview", async (_request, response, next) => {
  try { response.json(await getOverview()); } catch (error) { next(error); }
});
reportRouter.get("/lines", async (request, response, next) => {
  const municipality = request.query.municipalityId === undefined ? undefined : Number(request.query.municipalityId);
  if (municipality !== undefined && (!Number.isInteger(municipality) || municipality <= 0)) { response.status(400).json({ message: "Municipalidad inválida." }); return; }
  try { response.json(await getLineVisualization(municipality)); } catch (error) { next(error); }
});
reportRouter.get("/operations", async (request, response, next) => {
  const filters = reportQuerySchema.safeParse(request.query);
  if (!filters.success) { response.status(400).json({ message: "Filtros de operación inválidos.", issues: filters.error.issues }); return; }
  try { response.json(await getOperationsReport(filters.data)); } catch (error) { next(error); }
});
reportRouter.get("/fleet", async (request, response, next) => {
  const filters = reportQuerySchema.safeParse(request.query);
  if (!filters.success) { response.status(400).json({ message: "Filtros de flota inválidos.", issues: filters.error.issues }); return; }
  try { response.json(await getFleetReport(filters.data)); } catch (error) { next(error); }
});
reportRouter.get("/access-counts", async (request, response, next) => {
  const filters = reportQuerySchema.safeParse(request.query);
  if (!filters.success) { response.status(400).json({ message: "Filtros de cantidades inválidos.", issues: filters.error.issues }); return; }
  try { response.json(await getAccessMediaReport(filters.data)); } catch (error) { next(error); }
});
