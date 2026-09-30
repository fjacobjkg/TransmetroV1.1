import {
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(
  password: string
): Promise<string> {
  const salt = randomBytes(16).toString("hex");

  const derivedKey = (await scryptAsync(
    password,
    salt,
    64
  )) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const storedBuffer = Buffer.from(hash, "hex");

  const derivedKey = (await scryptAsync(
    password,
    salt,
    64
  )) as Buffer;

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(
    storedBuffer,
    derivedKey
  );
}