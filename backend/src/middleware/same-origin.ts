import type { RequestHandler } from "express";

import { env } from "../config/env.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const requireSameOrigin: RequestHandler = (request, response, next) => {
  const origin = request.get("origin");
  if (MUTATING_METHODS.has(request.method) && origin && origin !== env.CORS_ORIGIN) {
    response.status(403).json({ message: "Origen de solicitud no permitido." });
    return;
  }

  next();
};
