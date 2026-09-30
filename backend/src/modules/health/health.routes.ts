import { Router } from "express";

import { getHealth } from "./health.service.js";

export const healthRouter = Router();

healthRouter.get("/", async (_request, response, next) => {
  try {
    const health = await getHealth();
    response.status(health.database === "connected" ? 200 : 503).json(health);
  } catch (error) {
    next(error);
  }
});
