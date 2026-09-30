import { prisma } from "../../lib/prisma.js";
import { ensure } from "../../lib/domain-error.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import { writeAudit } from "../audit/audit.service.js";
const current = () => ({ fecha_fin: null, fecha_inicio: { lte: new Date() } });

export async function listBuses(search?: string) {
  return { items: await prisma.bus.findMany({
    where: search ? { OR: [{ codigo: { contains: search } }, { placa: { contains: search } }] } : {},
    orderBy: { codigo: "asc" },
    include: {
      asignaciones_linea: { where: current(), include: { linea: true } },
      asignaciones_parqueo: { where: current(), include: { parqueo: { include: { estacion: true } } } },
    },
  }) };
}

export async function listParkings(stationId?: number) {
  return { items: await prisma.parqueo.findMany({ where: stationId === undefined ? {} : { estacion_id: stationId }, orderBy: [{ estacion_id: "asc" }, { nombre: "asc" }], include: { estacion: true, _count: { select: { asignaciones: true } } } }) };
}

export async function saveParking(actorId: number, input: { stationId?: number | undefined; name?: string | undefined; active?: boolean | undefined }, id?: number | undefined) {
  return prisma.$transaction(async (tx) => {
    if (id === undefined) {
      ensure(input.stationId !== undefined && input.name, 400, "Estación y nombre son obligatorios.");
      const station = await tx.estacion.findUnique({ where: { id_estacion: input.stationId } });
      ensure(station?.activo, 400, "Selecciona una estación activa.");
    } else {
      const parking = await tx.parqueo.findUnique({ where: { id_parqueo: id } });
      ensure(parking, 404, "No se encontró el parqueo.");
      if (input.active === false) {
        const assigned = await tx.asignacion_bus_parqueo.count({ where: { parqueo_id: id, ...current() } });
        ensure(assigned === 0, 409, "Reasigna los buses antes de desactivar este parqueo.");
      }
    }
    const item = id === undefined
      ? await tx.parqueo.create({ data: { estacion_id: input.stationId!, nombre: input.name!, activo: input.active ?? true } })
      : await tx.parqueo.update({ where: { id_parqueo: id }, data: { ...(input.name === undefined ? {} : { nombre: input.name }), ...(input.active === undefined ? {} : { activo: input.active }) } });
    await writeAudit(tx, { userId: actorId, action: id === undefined ? "CREAR" : "ACTUALIZAR", entity: "parqueo", entityId: item.id_parqueo, description: item.nombre });
    return item;
  });
}

export async function createBus(actorId: number, input: { code: string; plate: string; capacity: number; parkingId: number }) {
  return prisma.$transaction(async (tx) => {
    const parking = await tx.parqueo.findUnique({ where: { id_parqueo: input.parkingId }, include: { estacion: true } });
    ensure(parking?.activo && parking.estacion.activo, 400, "Selecciona un parqueo y estación activos.");
    const bus = await tx.bus.create({ data: { codigo: input.code, placa: input.plate, capacidad_maxima: input.capacity } });
    const assignment = await tx.asignacion_bus_parqueo.create({ data: { bus_id: bus.id_bus, parqueo_id: parking.id_parqueo, fecha_inicio: new Date() } });
    await writeAudit(tx, { userId: actorId, action: "CREAR", entity: "bus", entityId: bus.id_bus, description: `${bus.codigo} · ${bus.placa} · capacidad ${bus.capacidad_maxima}` });
    await writeAudit(tx, { userId: actorId, action: "ASIGNAR_PARQUEO", entity: "asignacion_bus_parqueo", entityId: assignment.id_asignacion_bus_parqueo, description: `Parqueo ${parking.nombre}` });
    return bus;
  });
}

export async function updateBus(actorId: number, id: number, input: { code?: string | undefined; plate?: string | undefined; capacity?: number | undefined; active?: boolean | undefined }) {
  return prisma.$transaction(async (tx) => {
    const bus = await tx.bus.findUnique({ where: { id_bus: id } });
    ensure(bus, 404, "No se encontró el bus.");
    if (input.active === false) {
      const [lineAssignment, openTrip] = await Promise.all([
        tx.asignacion_bus_linea.findFirst({ where: { bus_id: id, ...current() }, include: { linea: true } }),
        tx.recorrido.count({ where: { bus_id: id, estado: "EN_CURSO" } }),
      ]);
      ensure(!openTrip, 409, "No se puede desactivar un bus con un recorrido abierto.");
      if (lineAssignment?.linea.activo) await ensureLineMinimumAfterRemoval(tx, lineAssignment.linea_id, id);
      if (lineAssignment) await tx.asignacion_bus_linea.update({ where: { id_asignacion_bus_linea: lineAssignment.id_asignacion_bus_linea }, data: { fecha_fin: new Date() } });
    }
    const item = await tx.bus.update({ where: { id_bus: id }, data: { ...(input.code === undefined ? {} : { codigo: input.code }), ...(input.plate === undefined ? {} : { placa: input.plate }), ...(input.capacity === undefined ? {} : { capacidad_maxima: input.capacity }), ...(input.active === undefined ? {} : { activo: input.active }) } });
    await writeAudit(tx, { userId: actorId, action: "ACTUALIZAR", entity: "bus", entityId: item.id_bus, description: `${item.codigo} · ${item.placa}` });
    return item;
  }, { isolationLevel: "Serializable" });
}

async function getLineStationCount(tx: Prisma.TransactionClient, lineId: number) {
  return tx.linea_estacion.count({ where: { linea_id: lineId, activo: true } });
}

async function ensureLineMinimumAfterRemoval(tx: Prisma.TransactionClient, lineId: number, busId: number) {
  const line = await tx.linea.findUnique({ where: { id_linea: lineId } });
  if (!line?.activo) return;
  const [stationCount, busCount] = await Promise.all([
    getLineStationCount(tx, lineId),
    tx.asignacion_bus_linea.count({ where: { linea_id: lineId, bus_id: { not: busId }, ...current(), bus: { activo: true } } }),
  ]);
  ensure(busCount >= stationCount, 409, "La operación dejaría la línea activa por debajo de un bus por estación.");
}

export async function assignBusLine(actorId: number, busId: number, lineId: number | null) {
  return prisma.$transaction(async (tx) => {
    const bus = await tx.bus.findUnique({ where: { id_bus: busId } });
    ensure(bus?.activo, 404, "No se encontró un bus activo.");
    const openTrip = await tx.recorrido.count({ where: { bus_id: busId, estado: "EN_CURSO" } });
    ensure(openTrip === 0, 409, "Cierra el recorrido abierto antes de reasignar el bus.");
    const currentAssignment = await tx.asignacion_bus_linea.findFirst({ where: { bus_id: busId, ...current() } });
    if (currentAssignment?.linea_id === lineId) return currentAssignment;
    if (currentAssignment) await ensureLineMinimumAfterRemoval(tx, currentAssignment.linea_id, busId);
    if (lineId !== null) {
      const line = await tx.linea.findUnique({ where: { id_linea: lineId }, include: { estaciones: { where: { activo: true } } } });
      ensure(line, 404, "No se encontró la línea.");
      ensure(line.estaciones.length > 0, 409, "Configura estaciones antes de asignar buses a la línea.");
      const currentBuses = await tx.asignacion_bus_linea.count({ where: { linea_id: lineId, ...current(), bus: { activo: true } } });
      ensure(currentBuses < line.estaciones.length * 2, 409, "La línea ya tiene el máximo de dos buses por estación.");
    }
    if (currentAssignment) await tx.asignacion_bus_linea.update({ where: { id_asignacion_bus_linea: currentAssignment.id_asignacion_bus_linea }, data: { fecha_fin: new Date() } });
    let created = null;
    if (lineId !== null) created = await tx.asignacion_bus_linea.create({ data: { bus_id: busId, linea_id: lineId, fecha_inicio: new Date() } });
    await writeAudit(tx, { userId: actorId, action: "REASIGNAR_LINEA", entity: "bus", entityId: busId, description: `Línea anterior ${currentAssignment?.linea_id ?? "sin asignar"} · destino ${lineId ?? "sin asignar"}` });
    return created;
  }, { isolationLevel: "Serializable" });
}

export async function assignBusParking(actorId: number, busId: number, parkingId: number) {
  return prisma.$transaction(async (tx) => {
    const [bus, parking] = await Promise.all([
      tx.bus.findUnique({ where: { id_bus: busId } }),
      tx.parqueo.findUnique({ where: { id_parqueo: parkingId }, include: { estacion: true } }),
    ]);
    ensure(bus?.activo, 404, "No se encontró un bus activo.");
    ensure(parking?.activo && parking.estacion.activo, 400, "Selecciona un parqueo activo.");
    const old = await tx.asignacion_bus_parqueo.findFirst({ where: { bus_id: busId, ...current() } });
    if (old?.parqueo_id === parkingId) return old;
    if (old) await tx.asignacion_bus_parqueo.update({ where: { id_asignacion_bus_parqueo: old.id_asignacion_bus_parqueo }, data: { fecha_fin: new Date() } });
    const item = await tx.asignacion_bus_parqueo.create({ data: { bus_id: busId, parqueo_id: parkingId, fecha_inicio: new Date() } });
    await writeAudit(tx, { userId: actorId, action: "REASIGNAR_PARQUEO", entity: "bus", entityId: busId, description: `Parqueo anterior ${old?.parqueo_id ?? "sin asignar"} · destino ${parking.nombre}` });
    return item;
  }, { isolationLevel: "Serializable" });
}
