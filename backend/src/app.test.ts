import request from "supertest";
import { describe, expect, it } from "vitest";
import { jsonBigIntReplacer } from "./lib/json-replacer.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "transmetro-test-secret-with-at-least-32-characters";

const { createApp } = await import("./app.js");
const app = createApp();

describe("API base", () => {
  it("expone información del servicio sin consultar la base de datos", async () => {
    const response = await request(app).get("/api");
    expect(response.status).toBe(200);
    expect(response.body.name).toContain("Transmetro");
  });

  it("serializa identificadores BigInt como cadenas", () => {
    const serialized = JSON.stringify({ id: 1234567890123456789n }, jsonBigIntReplacer);
    expect(serialized).toBe('{"id":"1234567890123456789"}');
  });

  it("bloquea escrituras cuyo origen no coincide con la configuración permitida", async () => {
    const response = await request(app).post("/api/auth/login").set("Origin", "https://untrusted.example").send({ username: "x", password: "x" });
    expect(response.status).toBe(403);
  });
});
