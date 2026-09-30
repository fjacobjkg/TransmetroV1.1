import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { requireSameOrigin } from "./middleware/same-origin.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { userRouter } from "./modules/user/user.routes.js";
import { roleRouter } from "./modules/role/role.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { transportStructureRouter } from "./modules/transport-structure/transport-structure.routes.js";
import { accessSecurityRouter } from "./modules/access-security/access-security.routes.js";
import { personnelRouter } from "./modules/personnel/personnel.routes.js";
import { accessMediaRouter } from "./modules/access-media/access-media.routes.js";
import { fleetRouter } from "./modules/fleet/fleet.routes.js";
import { routeOperationRouter } from "./modules/route-operation/route-operation.routes.js";
import { reportRouter } from "./modules/report/report.routes.js";
import { jsonBigIntReplacer } from "./lib/json-replacer.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("json replacer", jsonBigIntReplacer);
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requireSameOrigin);

  app.get("/api", (_request, response) => {
    response.status(200).json({
      name: "Transmetro Internal Control API",
      version: "1.0.0",
    });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/roles", roleRouter);
  app.use("/api/audit", auditRouter);
  app.use("/api/transport", transportStructureRouter);
  app.use("/api/security", accessSecurityRouter);
  app.use("/api/personnel", personnelRouter);
  app.use("/api/access-media", accessMediaRouter);
  app.use("/api/fleet", fleetRouter);
  app.use("/api/operations", routeOperationRouter);
  app.use("/api/reports", reportRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
