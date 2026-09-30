import { prisma } from "../src/lib/prisma.js";
import { attachVisitEvaluations, evaluationDescription } from "../src/lib/visit-evaluation.js";
import { auditEntityId } from "../src/modules/audit/audit.service.js";
import { listLines } from "../src/modules/transport-structure/transport-structure.service.js";
import { saveLine } from "../src/modules/transport-structure/transport-structure.service.js";

const lineSpecs = [
  { code: "L1-CENTRO", name: "Línea Centro", stations: ["EST-01", "EST-02"], distances: ["3.500", null] },
  { code: "L2-NORTE", name: "Línea Norte", stations: ["EST-02", "EST-03"], distances: ["4.200", null] },
] as const;

const stationSpecs = [
  { code: "EST-01", name: "Centro Cívico" },
  { code: "EST-02", name: "Plaza Central" },
  { code: "EST-03", name: "Terminal Norte" },
] as const;

const busSpecs = [
  { code: "BUS-101", plate: "P-101TMR", capacity: 100, line: "L1-CENTRO", station: "EST-01", pilot: "Ana López" },
  { code: "BUS-102", plate: "P-102TMR", capacity: 100, line: "L1-CENTRO", station: "EST-02", pilot: "Carlos Méndez" },
  { code: "BUS-201", plate: "P-201TMR", capacity: 80, line: "L2-NORTE", station: "EST-02", pilot: "María García" },
  { code: "BUS-202", plate: "P-202TMR", capacity: 80, line: "L2-NORTE", station: "EST-03", pilot: "José Ramírez" },
] as const;

const current = () => ({ fecha_fin: null, fecha_inicio: { lte: new Date() } });
const demoDay = new Date("2026-09-29T00:00:00.000Z");
const seededEffectiveDate = new Date("2026-09-28T15:00:00.000Z");
const guardNames = ["Rosa Castillo", "Luis Herrera", "Elena Morales"] as const;

function requiredValue<T>(values: readonly T[], index: number, label: string): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Falta el valor ${label} en la configuración demo.`);
  return value;
}

function requiredRef<T>(values: Record<string, T>, key: string): T {
  const value = values[key];
  if (value === undefined) throw new Error(`Falta la referencia demo ${key}.`);
  return value;
}

async function seedDemo(): Promise<void> {
  const [admin, operator] = await Promise.all([
    prisma.usuario.findFirst({ where: { activo: true, rol: { nombre: "ADMIN" } }, select: { id_usuario: true } }),
    prisma.usuario.findFirst({ where: { activo: true, rol: { nombre: "OPERADOR_ESTACION" } }, select: { id_usuario: true } }),
  ]);
  if (!admin) throw new Error("No existe un usuario ADMIN activo. Ejecuta primero `npm run db:seed`.");
  if (!operator) throw new Error("No existe un usuario OPERADOR_ESTACION activo. Créalo desde el módulo Cuentas y roles y vuelve a ejecutar este seed.");

  const refs = await prisma.$transaction(async (tx) => {
    const municipality = await tx.municipalidad.upsert({
      where: { nombre: "Guatemala" },
      update: { activo: true },
      create: { nombre: "Guatemala", activo: true },
    });

    const stationByCode: Record<string, { id_estacion: number }> = {};
    for (const spec of stationSpecs) {
      stationByCode[spec.code] = await tx.estacion.upsert({
        where: { codigo: spec.code },
        update: { nombre: spec.name, municipalidad_id: municipality.id_municipalidad, activo: true },
        create: { codigo: spec.code, nombre: spec.name, municipalidad_id: municipality.id_municipalidad, activo: true },
      });
    }

    const lineByCode: Record<string, { id_linea: number; activo: boolean }> = {};
    for (const spec of lineSpecs) {
      lineByCode[spec.code] = await tx.linea.upsert({
        where: { codigo: spec.code },
        update: { nombre: spec.name, municipalidad_id: municipality.id_municipalidad },
        create: { codigo: spec.code, nombre: spec.name, municipalidad_id: municipality.id_municipalidad, activo: false },
      });
      for (const [index, stationCode] of spec.stations.entries()) {
        await tx.linea_estacion.upsert({
          where: { linea_id_estacion_id: { linea_id: requiredRef(lineByCode, spec.code).id_linea, estacion_id: requiredRef(stationByCode, stationCode).id_estacion } },
          update: { orden: index + 1, distancia_siguiente: requiredValue(spec.distances, index, "distancia"), activo: true },
          create: { linea_id: requiredRef(lineByCode, spec.code).id_linea, estacion_id: requiredRef(stationByCode, stationCode).id_estacion, orden: index + 1, distancia_siguiente: requiredValue(spec.distances, index, "distancia"), activo: true },
        });
      }
    }

    const guardByStation: Record<string, { id_guardia: number }> = {};
    for (const [index, stationSpec] of stationSpecs.entries()) {
      const guardName = requiredValue(guardNames, index, "guardia");
      const existingGuard = await tx.guardia.findFirst({ where: { nombre: guardName } });
      guardByStation[stationSpec.code] = existingGuard
        ? await tx.guardia.update({ where: { id_guardia: existingGuard.id_guardia }, data: { activo: true } })
        : await tx.guardia.create({ data: { nombre: guardName, telefono: `5550-10${index + 1}`, activo: true } });

      const access = await tx.acceso.upsert({
        where: { estacion_id_nombre: { estacion_id: requiredRef(stationByCode, stationSpec.code).id_estacion, nombre: "Acceso principal" } },
        update: {},
        create: { estacion_id: requiredRef(stationByCode, stationSpec.code).id_estacion, nombre: "Acceso principal", activo: false },
      });
      const assignment = await tx.asignacion_guardia_acceso.findFirst({ where: { acceso_id: access.id_acceso, ...current(), guardia: { activo: true } } });
      if (!assignment) await tx.asignacion_guardia_acceso.create({ data: { acceso_id: access.id_acceso, guardia_id: requiredRef(guardByStation, stationSpec.code).id_guardia, fecha_inicio: seededEffectiveDate } });
      await tx.acceso.update({ where: { id_acceso: access.id_acceso }, data: { activo: true } });

      const operatorAssignment = await tx.asignacion_usuario_estacion.findFirst({ where: { usuario_id: operator.id_usuario, estacion_id: requiredRef(stationByCode, stationSpec.code).id_estacion, ...current() } });
      if (!operatorAssignment) await tx.asignacion_usuario_estacion.create({ data: { usuario_id: operator.id_usuario, estacion_id: requiredRef(stationByCode, stationSpec.code).id_estacion, fecha_inicio: seededEffectiveDate } });
    }

    const parkingByStation: Record<string, { id_parqueo: number }> = {};
    for (const stationSpec of stationSpecs) {
      parkingByStation[stationSpec.code] = await tx.parqueo.upsert({
        where: { estacion_id_nombre: { estacion_id: requiredRef(stationByCode, stationSpec.code).id_estacion, nombre: "Parqueo operativo" } },
        update: { activo: true },
        create: { estacion_id: requiredRef(stationByCode, stationSpec.code).id_estacion, nombre: "Parqueo operativo", activo: true },
      });
    }

    const busByCode: Record<string, { id_bus: number; capacidad_maxima: number }> = {};
    for (const spec of busSpecs) {
      busByCode[spec.code] = await tx.bus.upsert({
        where: { codigo: spec.code },
        update: { placa: spec.plate, capacidad_maxima: spec.capacity, activo: true },
        create: { codigo: spec.code, placa: spec.plate, capacidad_maxima: spec.capacity, activo: true },
      });

      const existingLine = await tx.asignacion_bus_linea.findFirst({ where: { bus_id: requiredRef(busByCode, spec.code).id_bus, ...current() } });
      if (!existingLine) await tx.asignacion_bus_linea.create({ data: { bus_id: requiredRef(busByCode, spec.code).id_bus, linea_id: requiredRef(lineByCode, spec.line).id_linea, fecha_inicio: seededEffectiveDate } });
      else if (existingLine.linea_id !== requiredRef(lineByCode, spec.line).id_linea) throw new Error(`${spec.code} ya pertenece a otra línea; el seed no modificó esa asignación.`);

      const existingParking = await tx.asignacion_bus_parqueo.findFirst({ where: { bus_id: requiredRef(busByCode, spec.code).id_bus, ...current() } });
      if (!existingParking) await tx.asignacion_bus_parqueo.create({ data: { bus_id: requiredRef(busByCode, spec.code).id_bus, parqueo_id: requiredRef(parkingByStation, spec.station).id_parqueo, fecha_inicio: seededEffectiveDate } });

      const pilotEmail = `${spec.code.toLowerCase()}@demo.transmetro.local`;
      const pilot = await tx.piloto.findFirst({ where: { correo: pilotEmail } });
      const pilotData = { nombre: spec.pilot, residencia: "Municipio de Guatemala", informacion_educativa: "Formación técnica para operación de transporte urbano.", telefono: "5550-2000", activo: true };
      if (pilot) await tx.piloto.update({ where: { id_piloto: pilot.id_piloto }, data: pilotData });
      else await tx.piloto.create({ data: { ...pilotData, correo: pilotEmail } });
    }

    const mediaSpecs = [
      { name: "Tarjeta de acceso", description: "Conteo de validaciones registradas manualmente.", active: true },
      { name: "Boleto de acceso", description: "Conteo de boletos reportados por estación.", active: true },
      { name: "Pase temporal", description: "Medio de demostración deshabilitado para probar validaciones.", active: true },
    ];
    const mediaByName: Record<string, { id_medio_acceso: number }> = {};
    for (const spec of mediaSpecs) {
      mediaByName[spec.name] = await tx.medio_acceso.upsert({
        where: { nombre: spec.name },
        update: { descripcion: spec.description, activo: spec.active },
        create: { nombre: spec.name, descripcion: spec.description, activo: spec.active },
      });
    }
    const stationMediaIds: Record<string, Record<string, { id_estacion_medio_acceso: number }>> = {};
    for (const [stationIndex, stationSpec] of stationSpecs.entries()) {
      const mediaForStation: Record<string, { id_estacion_medio_acceso: number }> = {};
      stationMediaIds[stationSpec.code] = mediaForStation;
      for (const [mediaIndex, mediaSpec] of mediaSpecs.entries()) {
        const enabled = mediaIndex < 2;
        mediaForStation[mediaSpec.name] = await tx.estacion_medio_acceso.upsert({
          where: { estacion_id_medio_acceso_id: { estacion_id: requiredRef(stationByCode, stationSpec.code).id_estacion, medio_acceso_id: requiredRef(mediaByName, mediaSpec.name).id_medio_acceso } },
          update: { activo: enabled },
          create: { estacion_id: requiredRef(stationByCode, stationSpec.code).id_estacion, medio_acceso_id: requiredRef(mediaByName, mediaSpec.name).id_medio_acceso, activo: enabled },
        });
      }
      const countSpecs = [
        { media: "Tarjeta de acceso", quantity: requiredValue([240, 190, 160], stationIndex, "conteo de tarjeta") },
        { media: "Boleto de acceso", quantity: requiredValue([35, 26, 18], stationIndex, "conteo de boleto") },
      ];
      for (const count of countSpecs) {
        const where = { estacion_medio_acceso_id: requiredRef(requiredRef(stationMediaIds, stationSpec.code), count.media).id_estacion_medio_acceso, usuario_id: operator.id_usuario, fecha_registro: demoDay };
        const existingCount = await tx.registro_acceso.findFirst({where});
        if (existingCount) await tx.registro_acceso.update({where:{id_registro_acceso:existingCount.id_registro_acceso},data:{cantidad:count.quantity}});
        else await tx.registro_acceso.create({data:{...where,cantidad:count.quantity}});
      }
    }

    return { adminId: admin.id_usuario, stationByCode, lineByCode, busByCode };
  }, { timeout: 30_000, isolationLevel: "Serializable" });

  // Activar las líneas mediante la misma regla usada por el módulo de transporte.
  for (const spec of lineSpecs) {
    const line = await prisma.linea.findUniqueOrThrow({ where: { codigo: spec.code } });
    if (!line.activo) await saveLine(refs.adminId, { active: true }, line.id_linea);
  }

  await prisma.$transaction(async (tx) => {
    const tripSpecs = [
      { line: "L1-CENTRO", bus: "BUS-101", start: new Date("2026-09-29T14:00:00.000Z"), stations: ["EST-01", "EST-02"], samples: [{ occupancy: 20, demand: 150 }, { occupancy: 76, demand: 40 }] },
      { line: "L2-NORTE", bus: "BUS-201", start: new Date("2026-09-28T14:00:00.000Z"), stations: ["EST-02", "EST-03"], samples: [{ occupancy: 15, demand: 120 }, { occupancy: 44, demand: 70 }] },
    ] as const;

    for (const spec of tripSpecs) {
      const line = await tx.linea.findUniqueOrThrow({ where: { codigo: spec.line } });
      const bus = await tx.bus.findUniqueOrThrow({ where: { codigo: spec.bus } });
      const finishAt = new Date(spec.start.getTime() + 35 * 60_000);
      const existing = await tx.recorrido.findFirst({ where: { linea_id: line.id_linea, bus_id: bus.id_bus, fecha_inicio: spec.start } });
      const trip = existing
        ? await tx.recorrido.update({ where: { id_recorrido: existing.id_recorrido }, data: { estado: "FINALIZADO", fecha_fin: finishAt } })
        : await tx.recorrido.create({ data: { linea_id: line.id_linea, bus_id: bus.id_bus, fecha_inicio: spec.start, fecha_fin: finishAt, estado: "FINALIZADO" } });

      for (const [index, sample] of spec.samples.entries()) {
        const station = await tx.estacion.findUniqueOrThrow({ where: { codigo: requiredValue(spec.stations, index, "estación de visita") } });
        const visit = await tx.visita.upsert({
          where: { recorrido_id_orden: { recorrido_id: trip.id_recorrido, orden: index + 1 } },
          update: { estacion_id: station.id_estacion, usuario_id: operator.id_usuario, fecha_hora: new Date(spec.start.getTime() + (index + 1) * 10 * 60_000), ocupacion: sample.occupancy, demanda: sample.demand },
          create: { recorrido_id: trip.id_recorrido, estacion_id: station.id_estacion, usuario_id: operator.id_usuario, orden: index + 1, fecha_hora: new Date(spec.start.getTime() + (index + 1) * 10 * 60_000), ocupacion: sample.occupancy, demanda: sample.demand },
        });
        const description = evaluationDescription(visit.id_visita,bus.capacidad_maxima);
        if (!await tx.bitacora.findFirst({where:{accion:'REGISTRAR_VISITA',entidad:'visita',descripcion:description}}))
          await tx.bitacora.create({data:{usuario_id:operator.id_usuario,accion:'REGISTRAR_VISITA',entidad:'visita',entidad_id:auditEntityId(visit.id_visita),descripcion:description}});
      }
    }

    const existingAudit = await tx.bitacora.findFirst({ where: { usuario_id: refs.adminId, accion: "CARGA_DEMO", entidad: "datos_demo" } });
    if (!existingAudit) await tx.bitacora.create({ data: { usuario_id: refs.adminId, accion: "CARGA_DEMO", entidad: "datos_demo", descripcion: "Carga idempotente de registros ficticios para verificar las reglas operativas." } });
  }, { timeout: 30_000, isolationLevel: "Serializable" });

  const counts = {
    roles: await prisma.rol.count(),
    usuarios: await prisma.usuario.count(),
    municipalidades: await prisma.municipalidad.count(),
    lineas: await prisma.linea.count(),
    estaciones: await prisma.estacion.count(),
    relacionesLineaEstacion: await prisma.linea_estacion.count(),
    accesos: await prisma.acceso.count(),
    guardias: await prisma.guardia.count(),
    asignacionesGuardiaAcceso: await prisma.asignacion_guardia_acceso.count(),
    buses: await prisma.bus.count(),
    asignacionesBusLinea: await prisma.asignacion_bus_linea.count(),
    parqueos: await prisma.parqueo.count(),
    asignacionesBusParqueo: await prisma.asignacion_bus_parqueo.count(),
    pilotos: await prisma.piloto.count(),
    asignacionesOperadorEstacion: await prisma.asignacion_usuario_estacion.count(),
    recorridos: await prisma.recorrido.count(),
    visitas: await prisma.visita.count(),
    mediosAcceso: await prisma.medio_acceso.count(),
    mediosPorEstacion: await prisma.estacion_medio_acceso.count(),
    registrosAcceso: await prisma.registro_acceso.count(),
    eventosBitacora: await prisma.bitacora.count(),
  };
  const visits = await attachVisitEvaluations(await prisma.visita.findMany({include:{recorrido:{include:{bus:true}}}}),visit=>visit.recorrido.bus.capacidad_maxima);
  const alertVisits = visits.filter(visit=>visit.alerta_unidad_adicional).length;
  const waitVisits = visits.filter(visit=>visit.espera_adicional_minutos===5).length;
  const [activeLines, disabledMedia, disabledMediaWithCounts, activeLineData, coveredStationCount, busesWithoutParking, lineReport] = await Promise.all([
    prisma.linea.count({ where: { activo: true } }),
    prisma.estacion_medio_acceso.count({ where: { activo: false } }),
    prisma.estacion_medio_acceso.count({ where: { activo: false, registros: { some: {} } } }),
    prisma.linea.findMany({ where: { activo: true }, include: { estaciones: { where: { activo: true } }, asignaciones_bus: { where: { ...current(), bus: { activo: true } } } } }),
    prisma.asignacion_usuario_estacion.count({
      where: {
        estacion: { lineas: { some: { activo: true, linea: { activo: true } } } },
        fecha_fin: null,
        fecha_inicio: { lte: new Date() },
        usuario: { activo: true, rol: { activo: true, nombre: "OPERADOR_ESTACION" } },
      },
    }),
    prisma.bus.count({ where: { activo: true, asignaciones_parqueo: { none: { ...current() } } } }),
    listLines(),
  ]);
  const validLineFleet = activeLineData.every((line) => line.estaciones.length > 0 && line.asignaciones_bus.length >= line.estaciones.length && line.asignaciones_bus.length <= line.estaciones.length * 2);
  const lineTotals = lineReport.items.filter((line) => lineSpecs.some((spec) => spec.code === line.codigo)).map((line) => Number(line.distanciaTotal));
  const firstLineDistance = lineTotals[0] ?? Number.NaN;
  const secondLineDistance = lineTotals[1] ?? Number.NaN;
  const hasCombinedThresholdVisit = visits.filter(visit=>visit.alerta_unidad_adicional && visit.espera_adicional_minutos===5).length;
  if (activeLines < lineSpecs.length || !validLineFleet || lineTotals.length !== 2 || firstLineDistance !== 3.5 || secondLineDistance !== 4.2 || alertVisits < 1 || waitVisits < 1 || hasCombinedThresholdVisit < 1 || disabledMedia < 1 || disabledMediaWithCounts > 0 || coveredStationCount < stationSpecs.length || busesWithoutParking > 0) {
    throw new Error("La verificación del seed demo detectó reglas operativas incompletas.");
  }
  console.log("Datos demo idempotentes cargados y verificados:", counts);
  console.log("Incluye 2 líneas habilitadas, estaciones compartidas, alertas de demanda, esperas de 5 minutos y medios deshabilitados sin conteos.");
}

seedDemo()
  .catch((error: unknown) => {
    console.error("No fue posible cargar o verificar los datos demo.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
