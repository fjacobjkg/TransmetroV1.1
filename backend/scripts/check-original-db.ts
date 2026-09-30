import assert from 'node:assert/strict';
import {prisma} from '../src/lib/prisma.js';
import {env} from '../src/config/env.js';
import {attachVisitEvaluations,evaluationDescription} from '../src/lib/visit-evaluation.js';
import {auditEntityId} from '../src/modules/audit/audit.service.js';
import {getOperationSummary} from '../src/modules/report/operation-summary.js';

async function run() {
  assert.equal(env.DATABASE_NAME,'transmetro_v1_original','Esta verificación es exclusiva de la base original separada.');
  const before=await getOperationSummary({});
  assert.ok(before.visits>0,'Carga los datos de prueba antes de verificar.');
  const columns=await prisma.$queryRaw<Array<{COLUMN_NAME:string}>>`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=${env.DATABASE_NAME} AND TABLE_NAME='visitas'`;
  assert.ok(!columns.some(row=>['capacidad_registrada','alerta_unidad_adicional','espera_adicional_minutos'].includes(row.COLUMN_NAME)));
  const rollback=new Error('Verificación terminada: revertir filas temporales');
  try {
    await prisma.$transaction(async tx=>{
      const bus=await tx.bus.findFirstOrThrow();
      const line=await tx.linea.findFirstOrThrow();
      const station=await tx.estacion.findFirstOrThrow();
      const user=await tx.usuario.findFirstOrThrow();
      const now=new Date();
      const trip=await tx.recorrido.create({data:{bus_id:bus.id_bus,linea_id:line.id_linea,fecha_inicio:now,estado:'EN_CURSO'}});
      const visit=await tx.visita.create({data:{recorrido_id:trip.id_recorrido,estacion_id:station.id_estacion,usuario_id:user.id_usuario,orden:1,fecha_hora:now,ocupacion:20,demanda:150}});
      await tx.bitacora.create({data:{usuario_id:user.id_usuario,accion:'REGISTRAR_VISITA',entidad:'visita',entidad_id:auditEntityId(visit.id_visita),descripcion:evaluationDescription(visit.id_visita,100)}});
      const [evaluated]=await attachVisitEvaluations([visit],()=>200,tx);
      assert.equal(evaluated?.capacidad_registrada,100);
      assert.equal(evaluated?.alerta_unidad_adicional,true);
      assert.equal(evaluated?.espera_adicional_minutos,5);
      await tx.asignacion_usuario_estacion.create({data:{usuario_id:user.id_usuario,estacion_id:station.id_estacion,fecha_inicio:now}});
      await tx.piloto.create({data:{nombre:'Verificación temporal',residencia:'Guatemala',informacion_educativa:null}});
      // El esquema original admite varios conteos del mismo medio/día/usuario.
      const media=await tx.estacion_medio_acceso.findFirstOrThrow();
      const countData={estacion_medio_acceso_id:media.id_estacion_medio_acceso,usuario_id:user.id_usuario,fecha_registro:now,cantidad:1};
      await tx.registro_acceso.create({data:countData});
      await tx.registro_acceso.create({data:countData});
      throw rollback;
    },{timeout:15000});
  }catch(error){if(error!==rollback)throw error;}
  assert.deepEqual(await getOperationSummary({}),before);
  console.log('Escrituras, relaciones, capacidad histórica y conteos originales verificados; filas temporales revertidas.');
  console.log('Resumen real:',before);
}
run().catch(error=>{console.error(error instanceof Error?error.message:'Error de verificación');process.exitCode=1;}).finally(()=>prisma.$disconnect());
