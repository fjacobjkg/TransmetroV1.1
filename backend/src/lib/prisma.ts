import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client.js";
import { env } from "../config/env.js";

const adapter = new PrismaMariaDb({
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,

  connectionLimit: 5,

  connectTimeout: 10_000,
  acquireTimeout: 10_000,

  allowPublicKeyRetrieval: true,
});


export const prisma = new PrismaClient({ adapter });
