import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { currentUserController, loginController, logoutController } from "./auth.controller.js";

export const authRouter = Router();

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

authRouter.post("/login", (request, response, next) => {
  const key = request.ip ?? "unknown";
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    next();
    return;
  }

  current.count += 1;
  if (current.count > MAX_LOGIN_ATTEMPTS) {
    response.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
    response.status(429).json({ message: "Demasiados intentos. Espera antes de intentar de nuevo." });
    return;
  }
  next();
}, loginController);

authRouter.post("/logout", logoutController);
authRouter.get("/me", requireAuth, currentUserController);
