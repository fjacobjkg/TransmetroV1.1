import { prisma } from "../../lib/prisma.js";
import { ensure } from "../../lib/domain-error.js";
import { writeAudit } from "../audit/audit.service.js";

export async function listPilots(search?: string) {
  const items = await prisma.piloto.findMany({ where: search ? { nombre: { contains: search } } : {}, orderBy: { nombre: "asc" } });
  return { items };
}

export async function savePilot(actorId: number, input: { name?: string | undefined; residence?: string | undefined; education?: string | null | undefined; phone?: string | null | undefined; email?: string | null | undefined; active?: boolean | undefined }, id?: number | undefined) {
  return prisma.$transaction(async (tx) => {
    if (id !== undefined) ensure(await tx.piloto.findUnique({ where: { id_piloto: id } }), 404, "No se encontró el piloto.");
    else ensure(input.name && input.residence, 400, "Nombre y residencia son obligatorios.");
    const data = {
      ...(input.name === undefined ? {} : { nombre: input.name }),
      ...(input.residence === undefined ? {} : { residencia: input.residence }),
      ...(input.education === undefined ? {} : { informacion_educativa: input.education }),
      ...(input.phone === undefined ? {} : { telefono: input.phone }),
      ...(input.email === undefined ? {} : { correo: input.email }),
      ...(input.active === undefined ? {} : { activo: input.active }),
    };
    const item = id === undefined
      ? await tx.piloto.create({ data: { ...data, nombre: input.name!, residencia: input.residence!, informacion_educativa: input.education || null } })
      : await tx.piloto.update({ where: { id_piloto: id }, data });
    await writeAudit(tx, { userId: actorId, action: id === undefined ? "CREAR" : "ACTUALIZAR", entity: "piloto", entityId: item.id_piloto, description: item.nombre });
    return item;
  });
}

export async function listOperators() {
  const items = await prisma.usuario.findMany({
    where: { rol: { nombre: "OPERADOR_ESTACION" } }, orderBy: { nombre: "asc" },
    select: { id_usuario: true, nombre: true, nombre_usuario: true, activo: true,
      asignaciones_estacion: { where: { fecha_fin: null, fecha_inicio: { lte: new Date() } }, include: { estacion: true } } },
  });
  return { items };
}

export async function assignOperator(actorId: number, userId: number, stationId: number) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.usuario.findUnique({ where: { id_usuario: userId }, include: { rol: true } });
    ensure(user?.activo && user.rol.activo && user.rol.nombre === "OPERADOR_ESTACION", 400, "La cuenta debe ser un operador activo.");
    const station = await tx.estacion.findUnique({ where: { id_estacion: stationId } });
    ensure(station?.activo, 400, "Selecciona una estación activa.");
    const duplicate = await tx.asignacion_usuario_estacion.findFirst({ where: { usuario_id: userId, estacion_id: stationId, fecha_fin: null } });
    ensure(!duplicate, 409, "El operador ya tiene una asignación vigente en esta estación.");
    const item = await tx.asignacion_usuario_estacion.create({ data: { usuario_id: userId, estacion_id: stationId, fecha_inicio: new Date() } });
    await writeAudit(tx, { userId: actorId, action: "ASIGNAR_ESTACION", entity: "asignacion_usuario_estacion", entityId: item.id_asignacion_usuario_estacion, description: `Operador ${user.nombre_usuario} · estación ${station.codigo}` });
    return item;
  }, { isolationLevel: "Serializable" });
}

export async function endOperatorAssignment(actorId: number, assignmentId: number) {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.asignacion_usuario_estacion.findUnique({ where: { id_asignacion_usuario_estacion: assignmentId }, include: { estacion: true } });
    ensure(assignment && assignment.fecha_fin === null, 404, "No se encontró una asignación vigente.");
    const activeLines = await tx.linea_estacion.count({ where: { estacion_id: assignment.estacion_id, activo: true, linea: { activo: true } } });
    if (activeLines > 0) {
      const responsibleCount = await tx.asignacion_usuario_estacion.count({ where: { estacion_id: assignment.estacion_id, fecha_fin: null, id_asignacion_usuario_estacion: { not: assignmentId }, fecha_inicio: { lte: new Date() }, usuario: { activo: true } } });
      ensure(responsibleCount > 0, 409, "La estación activa debe conservar al menos un operador responsable.");
    }
    const item = await tx.asignacion_usuario_estacion.update({ where: { id_asignacion_usuario_estacion: assignmentId }, data: { fecha_fin: new Date() } });
    await writeAudit(tx, { userId: actorId, action: "CERRAR_ASIGNACION", entity: "asignacion_usuario_estacion", entityId: assignmentId, description: `Estación ${assignment.estacion.codigo}` });
    return item;
  }, { isolationLevel: "Serializable" });
}
