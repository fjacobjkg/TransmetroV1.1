import { prisma } from "../../lib/prisma.js";
import { ensure } from "../../lib/domain-error.js";
import { writeAudit } from "../audit/audit.service.js";
const current = () => ({ fecha_fin: null, fecha_inicio: { lte: new Date() } });

export async function listAccesses(stationId?: number) {
  return { items: await prisma.acceso.findMany({
    where: stationId === undefined ? {} : { estacion_id: stationId }, orderBy: [{ estacion_id: "asc" }, { nombre: "asc" }],
    include: { estacion: true, asignaciones_guardia: { where: current(), include: { guardia: true } } },
  }) };
}

export async function saveAccess(actorId: number, input: { stationId?: number | undefined; name?: string | undefined; active?: boolean | undefined }, id?: number | undefined) {
  return prisma.$transaction(async (tx) => {
    if (id === undefined) {
      ensure(input.stationId !== undefined && input.name, 400, "Estación y nombre son obligatorios.");
      const station = await tx.estacion.findUnique({ where: { id_estacion: input.stationId } });
      ensure(station?.activo, 400, "Selecciona una estación activa.");
    } else {
      const existing = await tx.acceso.findUnique({ where: { id_acceso: id } });
      ensure(existing, 404, "No se encontró el acceso.");
      if (input.active === true && !existing.activo) {
        const coverage = await tx.asignacion_guardia_acceso.count({ where: { acceso_id: id, ...current(), guardia: { activo: true } } });
        ensure(coverage > 0, 409, "Asigna un guardia vigente antes de habilitar el acceso.");
      }
      if (input.active === false && existing.activo) {
        const activeLineMemberships = await tx.linea_estacion.count({ where: { estacion_id: existing.estacion_id, activo: true, linea: { activo: true } } });
        if (activeLineMemberships > 0) {
          const remainingAccesses = await tx.acceso.count({ where: { estacion_id: existing.estacion_id, activo: true, id_acceso: { not: id } } });
          ensure(remainingAccesses > 0, 409, "Una estación de línea activa debe conservar por lo menos un acceso cubierto.");
        }
      }
    }
    const item = id === undefined
      ? await tx.acceso.create({ data: { estacion_id: input.stationId!, nombre: input.name!, activo: input.active ?? false } })
      : await tx.acceso.update({ where: { id_acceso: id }, data: { ...(input.name === undefined ? {} : { nombre: input.name }), ...(input.active === undefined ? {} : { activo: input.active }) } });
    await writeAudit(tx, { userId: actorId, action: id === undefined ? "CREAR" : "ACTUALIZAR", entity: "acceso", entityId: item.id_acceso, description: item.nombre });
    return item;
  }, { isolationLevel: "Serializable" });
}

export async function listGuards(search?: string) {
  return { items: await prisma.guardia.findMany({ where: search ? { nombre: { contains: search } } : {}, orderBy: { nombre: "asc" }, include: { _count: { select: { asignaciones: true } } } }) };
}

export async function saveGuard(actorId: number, input: { name?: string | undefined; phone?: string | null | undefined; active?: boolean | undefined }, id?: number | undefined) {
  return prisma.$transaction(async (tx) => {
    const existing = id === undefined ? null : await tx.guardia.findUnique({ where: { id_guardia: id } });
    if (id !== undefined) ensure(existing, 404, "No se encontró el guardia.");
    else ensure(input.name, 400, "El nombre del guardia es obligatorio.");
    if (id !== undefined && existing?.activo && input.active === false) {
      const assignments = await tx.asignacion_guardia_acceso.findMany({ where: { guardia_id: id, ...current() }, select: { acceso_id: true } });
      for (const assignment of assignments) {
        const access = await tx.acceso.findUnique({ where: { id_acceso: assignment.acceso_id } });
        if (!access?.activo) continue;
        const alternatives = await tx.asignacion_guardia_acceso.count({ where: { acceso_id: assignment.acceso_id, guardia_id: { not: id }, ...current(), guardia: { activo: true } } });
        ensure(alternatives > 0, 409, "No se puede desactivar al último guardia de un acceso activo.");
      }
      if (assignments.length > 0) await tx.asignacion_guardia_acceso.updateMany({ where: { guardia_id: id, ...current() }, data: { fecha_fin: new Date() } });
    }
    const data = { ...(input.name === undefined ? {} : { nombre: input.name }), ...(input.phone === undefined ? {} : { telefono: input.phone }), ...(input.active === undefined ? {} : { activo: input.active }) };
    const item = id === undefined ? await tx.guardia.create({ data: { ...data, nombre: input.name! } }) : await tx.guardia.update({ where: { id_guardia: id }, data });
    await writeAudit(tx, { userId: actorId, action: id === undefined ? "CREAR" : "ACTUALIZAR", entity: "guardia", entityId: item.id_guardia, description: item.nombre });
    return item;
  });
}

export async function assignGuard(actorId: number, accessId: number, guardId: number) {
  return prisma.$transaction(async (tx) => {
    const [access, guard] = await Promise.all([
      tx.acceso.findUnique({ where: { id_acceso: accessId } }),
      tx.guardia.findUnique({ where: { id_guardia: guardId } }),
    ]);
    ensure(access, 404, "No se encontró el acceso.");
    ensure(guard?.activo, 400, "Selecciona un guardia activo.");
    const active = await tx.asignacion_guardia_acceso.findFirst({ where: { acceso_id: accessId, guardia_id: guardId, ...current() } });
    ensure(!active, 409, "El guardia ya tiene asignación vigente en este acceso.");
    const item = await tx.asignacion_guardia_acceso.create({ data: { acceso_id: accessId, guardia_id: guardId, fecha_inicio: new Date() } });
    await writeAudit(tx, { userId: actorId, action: "ASIGNAR_GUARDIA", entity: "asignacion_guardia_acceso", entityId: item.id_asignacion_guardia_acceso, description: `Acceso ${access.nombre} · ${guard.nombre}` });
    return item;
  }, { isolationLevel: "Serializable" });
}

export async function endGuardAssignment(actorId: number, id: number) {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.asignacion_guardia_acceso.findUnique({ where: { id_asignacion_guardia_acceso: id }, include: { acceso: true, guardia: true } });
    ensure(assignment && assignment.fecha_fin === null, 404, "No se encontró una asignación vigente.");
    if (assignment.acceso.activo) {
      const remaining = await tx.asignacion_guardia_acceso.count({ where: { acceso_id: assignment.acceso_id, id_asignacion_guardia_acceso: { not: id }, ...current(), guardia: { activo: true } } });
      ensure(remaining > 0, 409, "No puedes retirar al último guardia de un acceso activo.");
    }
    const item = await tx.asignacion_guardia_acceso.update({ where: { id_asignacion_guardia_acceso: id }, data: { fecha_fin: new Date() } });
    await writeAudit(tx, { userId: actorId, action: "CERRAR_ASIGNACION", entity: "asignacion_guardia_acceso", entityId: id, description: `Acceso ${assignment.acceso.nombre} · ${assignment.guardia.nombre}` });
    return item;
  }, { isolationLevel: "Serializable" });
}
