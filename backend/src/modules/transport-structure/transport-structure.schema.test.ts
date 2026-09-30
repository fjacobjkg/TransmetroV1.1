import { describe, expect, it } from "vitest";

import { lineStationsSchema } from "./transport-structure.schema.js";

describe("lineStationsSchema", () => {
  it("acepta estaciones en secuencia con distancia final vacía", () => {
    expect(lineStationsSchema.safeParse({ stations: [
      { stationId: 5, order: 1, distanceToNext: 2.5 },
      { stationId: 8, order: 2, distanceToNext: null },
    ] }).success).toBe(true);
  });

  it("rechaza estaciones repetidas, órdenes no consecutivos y distancia después de la última estación", () => {
    expect(lineStationsSchema.safeParse({ stations: [{ stationId: 5, order: 1 }, { stationId: 5, order: 2 }] }).success).toBe(false);
    expect(lineStationsSchema.safeParse({ stations: [{ stationId: 5, order: 1 }, { stationId: 8, order: 3 }] }).success).toBe(false);
    expect(lineStationsSchema.safeParse({ stations: [{ stationId: 5, order: 1 }, { stationId: 8, order: 2, distanceToNext: 1 }] }).success).toBe(false);
  });
});
