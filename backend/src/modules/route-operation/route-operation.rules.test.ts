import { describe, expect, it } from "vitest";

import { evaluateVisit } from "./route-operation.rules.js";

describe("evaluateVisit", () => {
  it.each([
    [149, false],
    [150, true],
    [151, true],
  ])("activa alerta con demanda %i para capacidad 100: %s", (demand, extraUnit) => {
    expect(evaluateVisit(100, 50, demand).extraUnit).toBe(extraUnit);
  });

  it.each([
    [24, 5],
    [25, 0],
    [26, 0],
  ])("calcula espera para ocupación %i y capacidad 100", (occupancy, extraWaitMinutes) => {
    expect(evaluateVisit(100, occupancy, 0).extraWaitMinutes).toBe(extraWaitMinutes);
  });

  it("puede activar simultáneamente alerta de unidad y espera", () => {
    expect(evaluateVisit(100, 24, 150)).toEqual({ extraUnit: true, extraWaitMinutes: 5 });
  });

  it("rechaza capacidades y mediciones inválidas", () => {
    expect(() => evaluateVisit(0, 0, 0)).toThrow(RangeError);
    expect(() => evaluateVisit(100, -1, 0)).toThrow(RangeError);
  });
});
