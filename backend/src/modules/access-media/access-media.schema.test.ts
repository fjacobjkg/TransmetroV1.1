import { describe, expect, it } from "vitest";

import { accessCountUpdateSchema } from "./access-media.schema.js";

describe("accessCountUpdateSchema", () => {
  it("acepta una corrección con cantidad entera no negativa", () => {
    expect(accessCountUpdateSchema.parse({ quantity: 0 })).toEqual({ quantity: 0 });
  });

  it("rechaza cantidades negativas, fraccionarias o fuera del rango", () => {
    for (const quantity of [-1, 1.5, 4_294_967_296]) {
      expect(accessCountUpdateSchema.safeParse({ quantity }).success).toBe(false);
    }
  });
});
