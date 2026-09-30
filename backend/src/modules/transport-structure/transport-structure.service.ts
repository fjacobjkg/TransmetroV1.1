import { prisma } from "../../lib/prisma.js";
import { ensure } from "../../lib/domain-error.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import { writeAudit } from "../audit/audit.service.js";

const currentAssignment = () => ({ fecha_fin: null, fecha_inicio: { lte: new Date() } });

export async function listMunicipalities(search?: string, active?: boolean) {
  const where = {
    ...(search ? { nombre: { contains: search } } : {}),
    ...(active === undefined ? {} : { activo: active }),
  };
  const items = await prisma.municipalidad.findMany({
    where, orderBy: { nombre: "asc" },
    include: { _count: { select: { lineas: true, estaciones: true } } },
  });
  return { items };
}

export async function saveMunicipality(actorId: number, input: { name?: string | undefined; active?: boolean | undefined }, id?: number | undefined) {
  return prisma.$transaction(async (tx) => {
    if (id !== undefined) {
      const exists = await tx.municipalidad.findUnique({ where: { id_municipalidad: id } });
      ensure(exists, 404, "No se encontró la municipalidad.");
      if (input.active === false) {
        const dependencies = await tx.municipalidad.findUnique({ where: { id_municipalidad: id }, select: { _count: { select: { lineas: true, estaciones: true } } } });
        ensure((dependencies?._count.lineas ?? 0) === 0 && (dependencies?._count.estaciones ?? 0) === 0, 409, "No se puede desactivar una municipalidad con líneas o estaciones asociadas.");
      }
    }
    if (id === undefined) ensure(input.name, 400, "El nombre de la municipalidad es obligatorio.");
    const item = id === undefined
      ? await tx.municipalidad.create({ data: { nombre: input.name!, ...(input.active === undefined ? {} : { activo: input.active }) } })
      : await tx.municipalidad.update({ where: { id_municipalidad: id }, data: { ...(input.name === undefined ? {} : { nombre: input.name }), ...(input.active === undefined ? {} : { activo: input.active }) } });
    await writeAudit(tx, { userId: actorId, action: id === undefined ? "CREAR" : "ACTUALIZAR", entity: "municipalidad", entityId: item.id_municipalidad, description: item.nombre });
    return item;
  });
}

export async function listStations(search?: string, active?: boolean) {
  const items = await prisma.estacion.findMany({
    where: {
      ...(search ? { OR: [{ nombre: { contains: search } }, { codigo: { contains: search } }] } : {}),
      ...(active === undefined ? {} : { activo: active }),
    },
    orderBy: [{ municipalidad: { nombre: "asc" } }, { nombre: "asc" }],
    include: { municipalidad: true, _count: { select: { lineas: true, accesos: true } } },
  });
  return { items };
}

export async function saveStation(actorId: number, input: { code?: string | undefined; name?: string | undefined; municipalityId?: number | undefined; active?: boolean | undefined }, id?: number | undefined) {
  return prisma.$transaction(async (tx) => {
    if (input.municipalityId !== undefined) {
      const municipality = await tx.municipalidad.findUnique({ where: { id_municipalidad: input.municipalityId } });
      ensure(municipality?.activo, 400, "Selecciona una municipalidad activa.");
    }
    if (id !== undefined) {
      const previous = await tx.estacion.findUnique({ where: { id_estacion: id } });
      ensure(previous, 404, "No se encontró la estación.");
      if (input.active === true && !previous.activo) {
        const memberships = await tx.linea_estacion.count({ where: { estacion_id: id, activo: true } });
        ensure(memberships > 0, 409, "Una estación activa debe pertenecer por lo menos a una línea.");
      }
      if (input.active === false) {
        const activeLineMemberships = await tx.linea_estacion.count({ where: { estacion_id: id, activo: true, linea: { activo: true } } });
        const openVisits = await tx.visita.count({ where: { estacion_id: id, recorrido: { estado: "EN_CURSO" } } });
        ensure(activeLineMemberships === 0 && openVisits === 0, 409, "Retira la estación de líneas activas y cierra sus recorridos antes de desactivarla.");
      }
    }
    if (id === undefined) ensure(input.code && input.name && input.municipalityId !== undefined, 400, "Código, nombre y municipalidad son obligatorios.");
    const item = id === undefined
      ? await tx.estacion.create({ data: { codigo: input.code!, nombre: input.name!, municipalidad_id: input.municipalityId!, activo: input.active ?? false } })
      : await tx.estacion.update({ where: { id_estacion: id }, data: { ...(input.code === undefined ? {} : { codigo: input.code }), ...(input.name === undefined ? {} : { nombre: input.name }), ...(input.municipalityId === undefined ? {} : { municipalidad_id: input.municipalityId }), ...(input.active === undefined ? {} : { activo: input.active }) } });
    await writeAudit(tx, { userId: actorId, action: id === undefined ? "CREAR" : "ACTUALIZAR", entity: "estacion", entityId: item.id_estacion, description: `${item.codigo} · ${item.nombre}` });
    return item;
  });
}

export async function listLines(search?: string, active?: boolean) {
  const rows = await prisma.linea.findMany({
    where: {
      ...(search ? { OR: [{ nombre: { contains: search } }, { codigo: { contains: search } }] } : {}),
      ...(active === undefined ? {} : { activo: active }),
    },
    orderBy: { codigo: "asc" },
    include: {
      municipalidad: true,
      estaciones: { where: { activo: true }, orderBy: { orden: "asc" }, include: { estacion: true } },
      asignaciones_bus: { where: currentAssignment(), include: { bus: true } },
    },
  });
  const items = rows.map((line) => ({
    ...line,
    distanciaTotal: line.estaciones.every((entry, index) => index === line.estaciones.length - 1 || entry.distancia_siguiente !== null)
      ? line.estaciones.slice(0, -1).reduce((total, entry) => total + Number(entry.distancia_siguiente ?? 0), 0)
      : null,
  }));
  return { items };
}

export async function getLine(id: number) {
  const line = await prisma.linea.findUnique({
    where: { id_linea: id },
    include: {
      municipalidad: true,
      estaciones: { where: { activo: true }, orderBy: { orden: "asc" }, include: { estacion: { include: { municipalidad: true } } } },
      asignaciones_bus: { where: currentAssignment(), include: { bus: true } },
      recorridos: { where: { estado: "EN_CURSO" }, select: { id_recorrido: true } },
    },
  });
  ensure(line, 404, "No se encontró la línea.");
  return {
    ...line,
    distanciaTotal: line.estaciones.every((entry, index) => index === line.estaciones.length - 1 || entry.distancia_siguiente !== null)
      ? line.estaciones.slice(0, -1).reduce((total, entry) => total + Number(entry.distancia_siguiente ?? 0), 0)
      : null,
  };
}

async function assertLineCanOperate(tx: Prisma.TransactionClient, lineId: number) {
  const line = await tx.linea.findUnique({ where: { id_linea: lineId }, include: { estaciones: { where: { activo: true } } } });
  ensure(line, 404, "No se encontró la línea.");
  const stationIds = line.estaciones.map(({ estacion_id }) => estacion_id);
  const stationCount = stationIds.length;
  ensure(stationCount > 0, 409, "Agrega estaciones ordenadas antes de habilitar la línea.");
  const assignedBuses = await tx.asignacion_bus_linea.count({ where: { linea_id: lineId, ...currentAssignment(), bus: { activo: true } } });
  ensure(assignedBuses >= stationCount && assignedBuses <= stationCount * 2, 409, `La línea requiere entre ${stationCount} y ${stationCount * 2} buses vigentes.`);
  const operators = await tx.asignacion_usuario_estacion.findMany({
    where: { estacion_id: { in: stationIds }, ...currentAssignment(), usuario: { activo: true, rol: { activo: true, nombre: "OPERADOR_ESTACION" } } },
    select: { estacion_id: true },
  });
  const assignedStationIds = new Set(operators.map(({ estacion_id }) => estacion_id));
  ensure(stationIds.every((stationId) => assignedStationIds.has(stationId)), 409, "Cada estación debe tener por lo menos un operador vigente.");
  const accesses = await tx.acceso.findMany({
    where: { estacion_id: { in: stationIds }, activo: true },
    select: { estacion_id: true, asignaciones_guardia: { where: { ...currentAssignment(), guardia: { activo: true } }, select: { id_asignacion_guardia_acceso: true } } },
  });
  const byStation = new Map<number, typeof accesses>();
  for (const access of accesses) byStation.set(access.estacion_id, [...(byStation.get(access.estacion_id) ?? []), access]);
  ensure(stationIds.every((stationId) => {
    const stationAccesses = byStation.get(stationId) ?? [];
    return stationAccesses.length > 0 && stationAccesses.every((access) => access.asignaciones_guardia.length > 0);
  }), 409, "Cada estación necesita accesos activos y cada acceso debe tener un guardia vigente.");
}

export async function saveLine(actorId: number, input: { code?: string | undefined; name?: string | undefined; municipalityId?: number | undefined; active?: boolean | undefined }, id?: number | undefined) {
  return prisma.$transaction(async (tx) => {
    if (input.municipalityId !== undefined) {
      const municipality = await tx.municipalidad.findUnique({ where: { id_municipalidad: input.municipalityId } });
      ensure(municipality?.activo, 400, "Selecciona una municipalidad activa.");
    }
    if (id !== undefined) {
      const previous = await tx.linea.findUnique({ where: { id_linea: id } });
      ensure(previous, 404, "No se encontró la línea.");
      const openTrips = await tx.recorrido.count({ where: { linea_id: id, estado: "EN_CURSO" } });
      if (input.active === false || input.municipalityId !== undefined || input.name !== undefined) {
        ensure(openTrips === 0, 409, "No se puede cambiar una línea que tiene recorridos abiertos.");
      }
      if (input.active === true && !previous.activo) await assertLineCanOperate(tx, id);
    }
    const item = id === undefined
      ? await tx.linea.create({ data: { codigo: input.code!, nombre: input.name!, municipalidad_id: input.municipalityId!, activo: false } })
      : await tx.linea.update({ where: { id_linea: id }, data: { ...(input.name === undefined ? {} : { nombre: input.name }), ...(input.municipalityId === undefined ? {} : { municipalidad_id: input.municipalityId }), ...(input.active === undefined ? {} : { activo: input.active }) } });
    await writeAudit(tx, { userId: actorId, action: id === undefined ? "CREAR" : input.active === undefined ? "ACTUALIZAR" : input.active ? "HABILITAR" : "DESHABILITAR", entity: "linea", entityId: item.id_linea, description: `${item.codigo} · ${item.nombre}` });
    return item;
  }, { isolationLevel: "Serializable" });
}

export async function replaceLineStations(actorId: number, lineId: number, stations: Array<{ stationId: number; order: number; distanceToNext?: number | null | undefined }>) {
  return prisma.$transaction(async (tx) => {
    const line = await tx.linea.findUnique({ where: { id_linea: lineId } });
    ensure(line, 404, "No se encontró la línea.");
    const openTrips = await tx.recorrido.count({ where: { linea_id: lineId, estado: "EN_CURSO" } });
    ensure(openTrips === 0, 409, "Cierra los recorridos abiertos antes de modificar el orden de la línea.");
    const previous = await tx.linea_estacion.findMany({ where: { linea_id: lineId }, select: { estacion_id: true } });
    const ids = stations.map(({ stationId }) => stationId);
    const found = await tx.estacion.findMany({ where: { id_estacion: { in: ids } }, select: { id_estacion: true } });
    ensure(found.length === ids.length, 400, "Todas las estaciones deben existir. Su primera vinculación las habilita.");
    await tx.linea_estacion.deleteMany({ where: { linea_id: lineId } });
    await tx.linea_estacion.createMany({
      data: stations.map((station) => ({
        linea_id: lineId,
        estacion_id: station.stationId,
        orden: station.order,
        distancia_siguiente: station.distanceToNext == null ? null : String(station.distanceToNext),
        activo: true,
      })),
    });
    for (const { estacion_id } of previous) {
      if (ids.includes(estacion_id)) continue;
      const remaining = await tx.linea_estacion.count({ where: { estacion_id, activo: true } });
      if (remaining === 0) await tx.estacion.update({ where: { id_estacion: estacion_id }, data: { activo: false } });
    }
    await tx.estacion.updateMany({ where: { id_estacion: { in: ids }, activo: false }, data: { activo: true } });
    if (line.activo) await assertLineCanOperate(tx, lineId);
    await writeAudit(tx, { userId: actorId, action: "ACTUALIZAR_ESTACIONES", entity: "linea", entityId: lineId, description: `Se configuraron ${stations.length} estaciones.` });
    return tx.linea_estacion.findMany({ where: { linea_id: lineId }, orderBy: { orden: "asc" }, include: { estacion: true } });
  }, { isolationLevel: "Serializable" });
}
