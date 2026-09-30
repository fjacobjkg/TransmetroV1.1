import { Router } from "express";

import { requireAuth, requireRole } from "../../middleware/auth.js";
import { auditQuerySchema } from "./audit.schema.js";
import { listAuditEntries } from "./audit.service.js";

export const auditRouter = Router();

auditRouter.get("/", requireAuth, requireRole("ADMIN"), async (request, response, next) => {
  const parsed = auditQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ message: "Filtros de auditoría inválidos.", issues: parsed.error.issues });
    return;
  }
  try {
    response.json(await listAuditEntries(parsed.data));
  } catch (error) {
    next(error);
  }
});
