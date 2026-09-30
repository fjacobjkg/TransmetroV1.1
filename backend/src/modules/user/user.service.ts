import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../lib/password.js";
import { writeAudit } from "../audit/audit.service.js";

const USER_SELECT = {
  id_usuario: true,
  nombre: true,
  nombre_usuario: true,
  activo: true,
  creado_en: true,
  rol: { select: { nombre: true } },
} as const;

export async function listUsers(filters: {
  q?: string | undefined;
  role?: string | undefined;
  active?: boolean | undefined;
  page: number;
  pageSize: number;
}) {
  const where = {
    ...(filters.q ? { OR: [
      { nombre: { contains: filters.q } },
      { nombre_usuario: { contains: filters.q } },
    ] } : {}),
    ...(filters.role ? { rol: { nombre: filters.role } } : {}),
    ...(filters.active !== undefined ? { activo: filters.active } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      select: USER_SELECT,
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.usuario.count({ where }),
  ]);
  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function createUser(
  actorId: number,
  input: { name: string; username: string; password: string; role: string },
) {
  const [existing, assignedRole] = await Promise.all([
    prisma.usuario.findUnique({ where: { nombre_usuario: input.username } }),
    prisma.rol.findUnique({ where: { nombre: input.role } }),
  ]);
  if (existing) throw new Error("USERNAME_ALREADY_EXISTS");
  if (!assignedRole || !assignedRole.activo) throw new Error("ROLE_UNAVAILABLE");

  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    const user = await tx.usuario.create({
      data: {
        nombre: input.name,
        nombre_usuario: input.username,
        password_hash: passwordHash,
        rol_id: assignedRole.id_rol,
      },
      select: USER_SELECT,
    });
    await writeAudit(tx, {
      userId: actorId,
      action: "CREAR_USUARIO",
      entity: "USUARIO",
      entityId: user.id_usuario,
      description: `Se creó la cuenta ${user.nombre_usuario} con rol ${input.role}.`,
    });
    return user;
  });
}

export async function updateUser(
  actorId: number,
  id: number,
  input: { role?: string | undefined; active?: boolean | undefined },
) {
  const existing = await prisma.usuario.findUnique({
    where: { id_usuario: id },
    include: { rol: true },
  });
  if (!existing) throw new Error("USER_NOT_FOUND");

  const targetRole = input.role
    ? await prisma.rol.findUnique({ where: { nombre: input.role } })
    : existing.rol;
  if (!targetRole || !targetRole.activo) throw new Error("ROLE_UNAVAILABLE");

  const active = input.active ?? existing.activo;
  return prisma.$transaction(async (tx) => {
    if (existing.activo && existing.rol.nombre === "ADMIN" && (!active || targetRole.nombre !== "ADMIN")) {
      const otherActiveAdmins = await tx.usuario.count({
        where: { activo: true, rol: { nombre: "ADMIN", activo: true }, id_usuario: { not: id } },
      });
      if (otherActiveAdmins === 0) throw new Error("LAST_ACTIVE_ADMIN");
    }

    const willRemainOperator = active && targetRole.nombre === "OPERADOR_ESTACION";
    if (existing.rol.nombre === "OPERADOR_ESTACION" && !willRemainOperator) {
      const assignments = await tx.asignacion_usuario_estacion.findMany({
        where: { usuario_id: id, fecha_fin: null },
        select: { id_asignacion_usuario_estacion: true, estacion_id: true },
      });
      for (const assignment of assignments) {
        const onActiveLine = await tx.linea_estacion.count({
          where: { estacion_id: assignment.estacion_id, linea: { activo: true } },
        });
        if (onActiveLine === 0) continue;
        const alternatives = await tx.asignacion_usuario_estacion.count({
          where: {
            estacion_id: assignment.estacion_id,
            fecha_fin: null,
            fecha_inicio: { lte: new Date() },
            usuario_id: { not: id },
            usuario: { activo: true, rol: { nombre: "OPERADOR_ESTACION", activo: true } },
          },
        });
        if (alternatives === 0) throw new Error("LAST_STATION_OPERATOR");
      }
      if (assignments.length > 0) {
        await tx.asignacion_usuario_estacion.updateMany({
          where: { usuario_id: id, fecha_fin: null },
          data: { fecha_fin: new Date() },
        });
      }
    }

    const updated = await tx.usuario.update({
      where: { id_usuario: id },
      data: { activo: active, rol_id: targetRole.id_rol },
      select: USER_SELECT,
    });
    const changes: string[] = [];
    if (input.active !== undefined && input.active !== existing.activo) {
      changes.push(input.active ? "activó la cuenta" : "desactivó la cuenta");
    }
    if (input.role && input.role !== existing.rol.nombre) {
      changes.push(`cambió el rol de ${existing.rol.nombre} a ${input.role}`);
    }
    if (changes.length > 0) {
      await writeAudit(tx, {
        userId: actorId,
        action: "ACTUALIZAR_USUARIO",
        entity: "USUARIO",
        entityId: id,
        description: `${changes.join(" y ")} para ${existing.nombre_usuario}.`,
      });
    }
    return updated;
  }, { isolationLevel: "Serializable" });
}
