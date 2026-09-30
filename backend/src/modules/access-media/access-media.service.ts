import { prisma } from "../../lib/prisma.js";
import { ensure } from "../../lib/domain-error.js";
import { writeAudit } from "../audit/audit.service.js";

export async function listMedia() {
  return { items: await prisma.medio_acceso.findMany({ orderBy: { nombre: "asc" } }) };
}

export async function saveMedia(actorId: number, input: { name?: string | undefined; description?: string | null | undefined; active?: boolean | undefined }, id?: number | undefined) {
  return prisma.$transaction(async (tx) => {
    if (id !== undefined) ensure(await tx.medio_acceso.findUnique({ where: { id_medio_acceso: id } }), 404, "No se encontró el medio de acceso.");
    else ensure(input.name, 400, "El nombre del medio es obligatorio.");
    const data = { ...(input.name === undefined ? {} : { nombre: input.name }), ...(input.description === undefined ? {} : { descripcion: input.description }), ...(input.active === undefined ? {} : { activo: input.active }) };
    const item = id === undefined ? await tx.medio_acceso.create({ data: { ...data, nombre: input.name! } }) : await tx.medio_acceso.update({ where: { id_medio_acceso: id }, data });
    await writeAudit(tx, { userId: actorId, action: id === undefined ? "CREAR" : "ACTUALIZAR", entity: "medio_acceso", entityId: item.id_medio_acceso, description: item.nombre });
    return item;
  });
}

export async function listStationMedia(stationId: number) {
  const station = await prisma.estacion.findUnique({ where: { id_estacion: stationId } });
  ensure(station, 404, "No se encontró la estación.");
  return { station, items: await prisma.estacion_medio_acceso.findMany({
    where: { estacion_id: stationId }, orderBy: { medio_acceso: { nombre: "asc" } }, include: { medio_acceso: true },
  }) };
}

export async function setStationMedia(actorId: number, stationId: number, mediaId: number, active: boolean) {
  return prisma.$transaction(async (tx) => {
    const [station, media] = await Promise.all([
      tx.estacion.findUnique({ where: { id_estacion: stationId } }),
      tx.medio_acceso.findUnique({ where: { id_medio_acceso: mediaId } }),
    ]);
    ensure(station?.activo, 400, "Selecciona una estación activa.");
    ensure(media, 404, "No se encontró el medio de acceso.");
    ensure(media.activo || !active, 400, "Selecciona un medio activo.");
    const current = await tx.estacion_medio_acceso.findUnique({ where: { estacion_id_medio_acceso_id: { estacion_id: stationId, medio_acceso_id: mediaId } } });
    const item = current
      ? await tx.estacion_medio_acceso.update({ where: { id_estacion_medio_acceso: current.id_estacion_medio_acceso }, data: { activo: active } })
      : await tx.estacion_medio_acceso.create({ data: { estacion_id: stationId, medio_acceso_id: mediaId, activo: active } });
    await writeAudit(tx, { userId: actorId, action: active ? "HABILITAR_MEDIO" : "DESHABILITAR_MEDIO", entity: "estacion_medio_acceso", entityId: item.id_estacion_medio_acceso, description: `${station.codigo} · ${media.nombre}` });
    return item;
  });
}

export async function listAccessCounts(filters: { stationId?: number | undefined; stationIds?: number[] | undefined; actorId?: number | undefined; from?: string | undefined; to?: string | undefined }) {
  return { items: await prisma.registro_acceso.findMany({
    where: {
      ...(filters.stationId !== undefined
        ? { estacion_medio_acceso: { estacion_id: filters.stationId } }
        : filters.stationIds !== undefined
          ? { estacion_medio_acceso: { estacion_id: { in: filters.stationIds } } }
          : {}),
      ...(filters.actorId === undefined ? {} : { usuario_id: filters.actorId }),
      ...(filters.from || filters.to ? { fecha_registro: { ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}), ...(filters.to ? { lte: new Date(`${filters.to}T00:00:00.000Z`) } : {}) } } : {}),
    },
    orderBy: [{ fecha_registro: "desc" }, { creado_en: "desc" }],
    include: { usuario: { select: { id_usuario: true, nombre: true } }, estacion_medio_acceso: { include: { estacion: true, medio_acceso: true } } },
  }) };
}

export async function createAccessCount(actorId: number, stationIds: number[], input: { stationMediaId: number; recordDate: string; quantity: number }) {
  return prisma.$transaction(async (tx) => {
    const stationMedia = await tx.estacion_medio_acceso.findUnique({ where: { id_estacion_medio_acceso: input.stationMediaId }, include: { estacion: true, medio_acceso: true } });
    ensure(stationMedia?.activo && stationMedia.estacion.activo && stationMedia.medio_acceso.activo, 400, "El medio no está habilitado para esta estación.");
    ensure(stationIds.includes(stationMedia.estacion_id), 403, "No tienes asignación vigente en esta estación.");
    const recordDate = new Date(`${input.recordDate}T00:00:00.000Z`);
    ensure(recordDate.getTime() <= Date.now(), 400, "La fecha del conteo no puede estar en el futuro.");
    const item = await tx.registro_acceso.create({ data: { estacion_medio_acceso_id: input.stationMediaId, usuario_id: actorId, fecha_registro: recordDate, cantidad: input.quantity } });
    await writeAudit(tx, { userId: actorId, action: "REGISTRAR_CANTIDAD", entity: "registro_acceso", entityId: item.id_registro_acceso, description: `${stationMedia.estacion.codigo} · ${stationMedia.medio_acceso.nombre} · ${input.quantity}` });
    return item;
  }, { isolationLevel: "Serializable" });
}

export async function updateAccessCount(actor: { id: number; role: "ADMIN" | "OPERADOR_ESTACION" }, stationIds: number[], recordId: number | bigint, quantity: number) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.registro_acceso.findUnique({
      where: { id_registro_acceso: BigInt(recordId) },
      include: { estacion_medio_acceso: { include: { estacion: true, medio_acceso: true } } },
    });
    ensure(existing, 404, "No se encontró el conteo.");
    if (actor.role === "OPERADOR_ESTACION") {
      ensure(existing.usuario_id === actor.id, 403, "Solo puedes corregir un conteo que registraste tú.");
      ensure(stationIds.includes(existing.estacion_medio_acceso.estacion_id), 403, "No tienes asignación vigente en esta estación.");
    }
    const previousQuantity = existing.cantidad;
    const item = await tx.registro_acceso.update({ where: { id_registro_acceso: existing.id_registro_acceso }, data: { cantidad: quantity } });
    await writeAudit(tx, {
      userId: actor.id,
      action: "CORREGIR_CANTIDAD",
      entity: "registro_acceso",
      entityId: item.id_registro_acceso,
      description: `${existing.estacion_medio_acceso.estacion.codigo} · ${existing.estacion_medio_acceso.medio_acceso.nombre} · ${previousQuantity} → ${quantity}`,
    });
    return item;
  }, { isolationLevel: "Serializable" });
}
