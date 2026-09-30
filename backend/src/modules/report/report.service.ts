import { attachVisitEvaluations } from "../../lib/visit-evaluation.js";
import { getOperationSummary } from "./operation-summary.js";
import { prisma } from "../../lib/prisma.js";

type Filters = { from?: string | undefined; to?: string | undefined; municipalityId?: number | undefined; lineId?: number | undefined; stationId?: number | undefined; busId?: number | undefined };
const current = () => ({ fecha_fin: null, fecha_inicio: { lte: new Date() } });
const dateWhere = (from?: string, to?: string) => from || to ? {
  ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
  ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
} : undefined;

export async function getOverview() {
  const [municipalities, lines, stations, buses, openTrips, visits] = await Promise.all([
    prisma.municipalidad.count({ where: { activo: true } }),
    prisma.linea.count({ where: { activo: true } }),
    prisma.estacion.count({ where: { activo: true } }),
    prisma.bus.count({ where: { activo: true } }),
    prisma.recorrido.count({ where: { estado: "EN_CURSO" } }),
    prisma.visita.count(),
  ]);
  return { municipalities, lines, stations, buses, openTrips, visits };
}

export async function getLineVisualization(municipalityId?: number) {
  const [allLines, displayLines] = await Promise.all([prisma.linea.findMany({
    where: { activo: true },
    orderBy: { codigo: "asc" },
    include: { municipalidad: true, estaciones: { where: { activo: true }, orderBy: { orden: "asc" }, include: { estacion: true } } },
  }), municipalityId === undefined ? Promise.resolve(null) : prisma.linea.findMany({
    where: { activo: true, municipalidad_id: municipalityId },
    orderBy: { codigo: "asc" },
    include: { municipalidad: true, estaciones: { where: { activo: true }, orderBy: { orden: "asc" }, include: { estacion: true } } },
  })]);
  const lines = displayLines ?? allLines;
  const stationLines = new Map<number, Set<number>>();
  for (const line of allLines) for (const membership of line.estaciones) {
    const linked = stationLines.get(membership.estacion_id) ?? new Set<number>();
    linked.add(line.id_linea);
    stationLines.set(membership.estacion_id, linked);
  }
  return { items: lines.map((line) => ({
    id: line.id_linea, code: line.codigo, name: line.nombre, municipality: line.municipalidad.nombre,
    totalDistance: line.estaciones.every((entry, index) => index === line.estaciones.length - 1 || entry.distancia_siguiente !== null)
      ? line.estaciones.slice(0, -1).reduce((total, entry) => total + Number(entry.distancia_siguiente ?? 0), 0)
      : null,
    stations: line.estaciones.map(({ estacion, orden, distancia_siguiente }) => ({
      id: estacion.id_estacion, code: estacion.codigo, name: estacion.nombre, order: orden,
      distanceToNext: distancia_siguiente === null ? null : Number(distancia_siguiente),
      sharedLineIds: [...(stationLines.get(estacion.id_estacion) ?? [])].filter((id) => id !== line.id_linea),
    })),
  })) };
}

export async function getOperationsReport(filters: Filters) {
  const date = dateWhere(filters.from, filters.to);
  const where = {
    ...(date ? { fecha_hora: date } : {}),
    ...(filters.stationId === undefined ? {} : { estacion_id: filters.stationId }),
    recorrido: {
      ...(filters.lineId === undefined ? {} : { linea_id: filters.lineId }),
      ...(filters.busId === undefined ? {} : { bus_id: filters.busId }),
      ...(filters.municipalityId === undefined ? {} : { linea: { municipalidad_id: filters.municipalityId } }),
    },
  };
  const [rows, summary] = await Promise.all([
    prisma.visita.findMany({ where, orderBy: { fecha_hora: "desc" }, take: 1_000, include: { estacion: true, usuario: { select: { nombre: true } }, recorrido: { include: { linea: true, bus: true } } } }),
    getOperationSummary(filters),
  ]);
  const items=await attachVisitEvaluations(rows,visit=>visit.recorrido.bus.capacidad_maxima);
  return { summary, detailLimit: 1000, truncated: summary.visits > items.length, items };
}

export async function getFleetReport(filters: Filters) {
  const buses = await prisma.bus.findMany({
    where: filters.busId === undefined ? {} : { id_bus: filters.busId }, orderBy: { codigo: "asc" },
    include: {
      asignaciones_linea: { orderBy: { fecha_inicio: "desc" }, take: 100, include: { linea: true } },
      asignaciones_parqueo: { orderBy: { fecha_inicio: "desc" }, take: 100, include: { parqueo: { include: { estacion: true } } } },
    },
  });
  const items = buses.filter((bus) => filters.lineId === undefined || bus.asignaciones_linea.some((assignment) => assignment.linea_id === filters.lineId));
  return { items };
}

export async function getAccessMediaReport(filters: Filters) {
  const date = dateWhere(filters.from, filters.to);
  const where = {
    ...(date ? { fecha_registro: date } : {}),
    ...(filters.stationId === undefined && filters.municipalityId === undefined ? {} : { estacion_medio_acceso: {
      ...(filters.stationId === undefined ? {} : { estacion_id: filters.stationId }),
      ...(filters.municipalityId === undefined ? {} : { estacion: { municipalidad_id: filters.municipalityId } }),
    } }),
  };
  const groups = await prisma.registro_acceso.groupBy({ by: ['estacion_medio_acceso_id'], where, _sum: { cantidad: true }, _count: { _all: true } });
  const memberships = await prisma.estacion_medio_acceso.findMany({ where: { id_estacion_medio_acceso: { in: groups.map(group=>group.estacion_medio_acceso_id) } }, include: { estacion: true, medio_acceso: true } });
  const lookup = new Map(memberships.map(item=>[item.id_estacion_medio_acceso,item]));
  const items = groups.map(group=>{
    const member = lookup.get(group.estacion_medio_acceso_id)!;
    return { stationId: member.estacion_id, station: member.estacion.nombre, mediumId: member.medio_acceso_id, medium: member.medio_acceso.nombre, quantity: group._sum.cantidad ?? 0, records: group._count._all };
  }).sort((a,b)=>a.station.localeCompare(b.station)||a.medium.localeCompare(b.medium));
  return { totalRecords: items.reduce((sum,item)=>sum+item.records,0), totalQuantity: items.reduce((sum,item)=>sum+item.quantity,0), items };
}
