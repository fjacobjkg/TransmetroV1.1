import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

interface JwtPayload {
  sub: number;
  username: string;
  role: string;
}

interface TokenPayload extends JwtPayload {
  iat: number;
  exp: number;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string): string {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return Buffer.from(normalized, "base64").toString("utf8");
}

function createSignature(data: string): string {
  return createHmac("sha256", env.JWT_SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function signToken(payload: JwtPayload): string {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const tokenPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + env.JWT_EXPIRES_IN,
  };

  const encodedHeader = base64UrlEncode(
    JSON.stringify(header)
  );

  const encodedPayload = base64UrlEncode(
    JSON.stringify(tokenPayload)
  );

  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = createSignature(data);

  return `${data}.${signature}`;
}

export function verifyToken(
  token: string,
): TokenPayload {

  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Token inválido.",
    );
  }

  const [
    header,
    payload,
    signature,
  ] = parts;

  if (
    !header ||
    !payload ||
    !signature
  ) {
    throw new Error(
      "Token inválido.",
    );
  }

  const data =
    `${header}.${payload}`;

  const expectedSignature =
    createSignature(data);

  const signatureBuffer =
    Buffer.from(signature);

  const expectedBuffer =
    Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !==
      expectedBuffer.length ||
    !timingSafeEqual(
      signatureBuffer,
      expectedBuffer,
    )
  ) {
    throw new Error(
      "Firma inválida.",
    );
  }

  const parsedPayload =
    JSON.parse(
      base64UrlDecode(payload),
    ) as TokenPayload;

  const now =
    Math.floor(
      Date.now() / 1000,
    );

  if (
    parsedPayload.exp <= now
  ) {
    throw new Error(
      "Token expirado.",
    );
  }

  return parsedPayload;
}