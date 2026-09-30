import type { RequestHandler } from "express";

import { getAuthenticatedUser } from "../../middleware/auth.js";
import { AUTH_COOKIE_NAME, getAuthCookieOptions, getClearAuthCookieOptions } from "./auth.cookie.js";
import { login } from "./auth.service.js";
import { loginSchema } from "./auth.schema.js";

export const loginController: RequestHandler = async (request, response, next) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Revisa el usuario y la contraseña." });
    return;
  }

  try {
    const result = await login(parsed.data.username, parsed.data.password);
    response.cookie(AUTH_COOKIE_NAME, result.token, getAuthCookieOptions());
    response.json({ user: result.user });
  } catch (error) {
    if (error instanceof Error && error.name === "InvalidCredentialsError") {
      response.status(401).json({ message: "Usuario o contraseña incorrectos." });
      return;
    }
    next(error);
  }
};

export const currentUserController: RequestHandler = (_request, response) => {
  const user = getAuthenticatedUser(response);
  response.json({ user });
};

export const logoutController: RequestHandler = (_request, response) => {
  response.clearCookie(AUTH_COOKIE_NAME, getClearAuthCookieOptions());
  response.status(204).end();
};
