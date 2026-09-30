export function evaluateVisit(capacity: number, occupancy: number, demand: number) {
  if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError("La capacidad debe ser un entero positivo.");
  if (!Number.isInteger(occupancy) || occupancy < 0 || !Number.isInteger(demand) || demand < 0) {
    throw new RangeError("La ocupación y la demanda deben ser enteros no negativos.");
  }
  return {
    extraUnit: demand * 2 >= capacity * 3,
    extraWaitMinutes: occupancy * 4 < capacity ? 5 : 0,
  };
}
