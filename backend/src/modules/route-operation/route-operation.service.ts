import { prisma } from "../../lib/prisma.js";
import { ensure } from "../../lib/domain-error.js";
import type { AuthenticatedUser } from "../../middleware/auth.js";
import { attachVisitEvaluations, evaluationDescription } from "../../lib/visit-evaluation.js";
import { auditEntityId, writeAudit } from "../audit/audit.service.js";
import { evaluateVisit } from "./route-operation.rules.js";
const current = () => ({ fecha_fin: null, fecha_inicio: { lte: new Date() } });

export async function listOperationalLines(user: AuthenticatedUser) {
  return { items: await prisma.linea.findMany({
    where: { activo: true, ...(user.role === "OPERADOR_ESTACION" ? { estaciones: { some: { activo: true, estacion_id: { in: user.stationIds } } } } : {}) },
    orderBy: { codigo: "asc" },
    include: { estaciones: { where: { activo: true }, orderBy: { orden: "asc" }, include: { estacion: true } }, asignaciones_bus: { where: current(), include: { bus: true } } },
  }) };
}

export async function startTrip(user: AuthenticatedUser, busId: number, lineId: number) {
  return prisma.$transaction(async (tx) => {
    const [line, bus, assignment, open] = await Promise.all([
      tx.linea.findUnique({ where: { id_linea: lineId }, include: { estaciones: { where: { activo: true }, orderBy: { orden: "asc" } } } }),
      tx.bus.findUnique({ where: { id_bus: busId } }),
      tx.asignacion_bus_linea.findFirst({ where: { bus_id: busId, linea_id: lineId, ...current() } }),
      tx.recorrido.findFirst({ where: { bus_id: busId, estado: "EN_CURSO" } }),
    ]);
    ensure(line?.activo, 400, "La línea no está habilitada para operar.");
    ensure(bus?.activo && assignment, 400, "El bus no tiene una asignación vigente a esta línea.");
    ensure(!open, 409, "El bus ya tiene un recorrido en curso.");
    ensure(line.estaciones.length > 0, 409, "La línea no tiene estaciones configuradas.");
    if (user.role === "OPERADOR_ESTACION") ensure(line.estaciones.some(({ estacion_id }) => user.stationIds.includes(estacion_id)), 403, "No tienes asignación vigente en esta línea.");
    const item = await tx.recorrido.create({ data: { bus_id: busId, linea_id: lineId, fecha_inicio: new Date(), estado: "EN_CURSO" } });
    await writeAudit(tx, { userId: user.id, action: "INICIAR_RECORRIDO", entity: "recorrido", entityId: item.id_recorrido, description: `Línea ${line.codigo} · bus ${bus.codigo}` });
    return item;
  }, { isolationLevel: "Serializable" });
}

export async function listTrips(user: AuthenticatedUser, filters: { lineId?: number | undefined; busId?: number | undefined; stationId?: number | undefined; state?: "EN_CURSO" | "FINALIZADO" | "CANCELADO" | undefined; from?: string | undefined; to?: string | undefined; page: number; pageSize: number }) {
  if (user.role === "OPERADOR_ESTACION") ensure(user.stationIds.length > 0, 403, "No tienes estaciones asignadas.");
  const where = {
    ...(filters.lineId === undefined ? {} : { linea_id: filters.lineId }),
    ...(filters.busId === undefined ? {} : { bus_id: filters.busId }),
    ...(filters.state === undefined ? {} : { estado: filters.state }),
    ...(filters.from || filters.to ? { fecha_inicio: { ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}), ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}) } } : {}),
    ...(filters.stationId !== undefined ? { visitas: { some: { estacion_id: filters.stationId } } } : {}),
    ...(user.role === "OPERADOR_ESTACION" ? { linea: { estaciones: { some: { activo: true, estacion_id: { in: user.stationIds } } } } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.recorrido.findMany({ where, orderBy: { fecha_inicio: "desc" }, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize, include: { linea: true, bus: true, visitas: { orderBy: { orden: "asc" }, include: { estacion: true, usuario: { select: { nombre: true } } } } } }),
    prisma.recorrido.count({ where }),
  ]);
  const capacities = new Map(items.flatMap(trip=>trip.visitas.map(visit=>[String(visit.id_visita),trip.bus.capacidad_maxima] as const)));
  const visits = await attachVisitEvaluations(items.flatMap(trip=>trip.visitas),visit=>capacities.get(String(visit.id_visita))!);
  const enriched = new Map(visits.map(visit=>[String(visit.id_visita),visit]));
  return { items: items.map(trip=>({...trip,visitas:trip.visitas.map(visit=>enriched.get(String(visit.id_visita))!)})), total, page: filters.page, pageSize: filters.pageSize };
}

export async function recordVisit(user: AuthenticatedUser, tripId: number | bigint, input: { stationId: number; occupancy: number; demand: number; occurredAt?: string | undefined }) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.recorrido.findUnique({
      where: { id_recorrido: BigInt(tripId) },
      include: { bus: true, linea: { include: { estaciones: { where: { activo: true }, orderBy: { orden: "asc" } } } }, visitas: { orderBy: { orden: "asc" }, select: { estacion_id: true, orden: true, fecha_hora: true } } },
    });
    ensure(trip && trip.estado === "EN_CURSO", 404, "No se encontró un recorrido abierto.");
    const sequence = trip.visitas.length + 1;
    const expected = trip.linea.estaciones[sequence - 1];
    ensure(expected, 409, "El recorrido ya completó todas las estaciones.");
    ensure(expected.estacion_id === input.stationId, 409, `La siguiente estación del recorrido es la posición ${sequence}.`);
    if (user.role === "OPERADOR_ESTACION") ensure(user.stationIds.includes(input.stationId), 403, "No tienes asignación vigente en esta estación.");
    const assignment = await tx.asignacion_bus_linea.findFirst({ where: { bus_id: trip.bus_id, linea_id: trip.linea_id, ...current() } });
    ensure(assignment, 409, "El bus ya no está asignado a la línea de este recorrido.");
    const capacity = trip.bus.capacidad_maxima;
    const { extraUnit, extraWaitMinutes: extraWait } = evaluateVisit(capacity, input.occupancy, input.demand);
    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    ensure(occurredAt.getTime() <= Date.now() + 60_000, 400, "La fecha de la visita no puede estar en el futuro.");
    ensure(occurredAt >= trip.fecha_inicio && occurredAt >= (trip.visitas.at(-1)?.fecha_hora ?? trip.fecha_inicio), 400, "La visita debe ser posterior al inicio y a la visita anterior.");
    const visit = await tx.visita.create({ data: {
      recorrido_id: trip.id_recorrido,
      estacion_id: input.stationId,
      usuario_id: user.id,
      orden: expected.orden,
      fecha_hora: occurredAt,
      ocupacion: input.occupancy,
      demanda: input.demand,
    } });
    await tx.bitacora.create({ data: { usuario_id: user.id, accion: "REGISTRAR_VISITA", entidad: "visita", entidad_id: auditEntityId(visit.id_visita), descripcion: evaluationDescription(visit.id_visita,capacity) } });
    let completed = false;
    if (sequence === trip.linea.estaciones.length) {
      await tx.recorrido.update({ where: { id_recorrido: trip.id_recorrido }, data: { estado: "FINALIZADO", fecha_fin: occurredAt } });
      await writeAudit(tx, { userId: user.id, action: "FINALIZAR_RECORRIDO", entity: "recorrido", entityId: trip.id_recorrido, description: "Se completó el orden de estaciones de la línea." });
      completed = true;
    }
    return { visit: { ...visit, capacidad_registrada: capacity, alerta_unidad_adicional: extraUnit, espera_adicional_minutos: extraWait, evaluationSource: "recorded" }, evaluation: { extraUnit, extraWaitMinutes: extraWait, capacity }, completed };
  }, { isolationLevel: "Serializable" });
}

export async function closeTrip(user: AuthenticatedUser, tripId: number | bigint, state: "FINALIZADO" | "CANCELADO") {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.recorrido.findUnique({ where: { id_recorrido: BigInt(tripId) }, include: { linea: { include: { estaciones: { where: { activo: true } } } } } });
    ensure(trip?.estado === "EN_CURSO", 404, "No se encontró un recorrido abierto.");
    if (user.role === "OPERADOR_ESTACION") ensure(trip.linea.estaciones.some(({ estacion_id }) => user.stationIds.includes(estacion_id)), 403, "No tienes asignación vigente en este recorrido.");
    if (state === "FINALIZADO") {
      const visits = await tx.visita.count({ where: { recorrido_id: trip.id_recorrido } });
      ensure(visits === trip.linea.estaciones.length, 409, "Completa todas las estaciones o cancela el recorrido.");
    }
    const item = await tx.recorrido.update({ where: { id_recorrido: trip.id_recorrido }, data: { estado: state, fecha_fin: new Date() } });
    await writeAudit(tx, { userId: user.id, action: state === "FINALIZADO" ? "FINALIZAR_RECORRIDO" : "CANCELAR_RECORRIDO", entity: "recorrido", entityId: trip.id_recorrido });
    return item;
  }, { isolationLevel: "Serializable" });
}
