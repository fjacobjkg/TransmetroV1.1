import type { CookieOptions, Request } from "express";

import { env } from "../../config/env.js";

export const AUTH_COOKIE_NAME = "transmetro_v1_session";

export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.JWT_EXPIRES_IN * 1000,
  };
}

export function getClearAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

export function readAuthCookie(request: Request): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;

    const name = item.slice(0, separator).trim();
    if (name !== AUTH_COOKIE_NAME) continue;

    const value = item.slice(separator + 1).trim();
    if (!value) return null;

    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}
