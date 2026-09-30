import type {Prisma} from '../../generated/prisma/client.js';
import {prisma} from './prisma.js';
import {evaluateVisit} from '../modules/route-operation/route-operation.rules.js';
export const VISIT_EVALUATION_FORMAT='transmetro.visit-evaluation.v1';
type Visit={id_visita:bigint;ocupacion:number;demanda:number};
type AuditReader=Pick<Prisma.TransactionClient,'bitacora'>;
export function parseRecordedCapacity(description:string|null,visitId:bigint):number|null {
  try {
    const item:unknown=JSON.parse(description??'');
    if(!item||typeof item!=='object')return null;
    const record=item as Record<string,unknown>;
    return record.format===VISIT_EVALUATION_FORMAT&&record.visitId===String(visitId)&&typeof record.capacity==='number'&&Number.isInteger(record.capacity)&&record.capacity>0&&record.capacity<=65_535?record.capacity:null;
  }catch{return null;}
}
export function evaluationDescription(visitId:bigint,capacity:number):string {
  return JSON.stringify({format:VISIT_EVALUATION_FORMAT,visitId:String(visitId),capacity});
}
export async function attachVisitEvaluations<T extends Visit>(visits:T[],currentCapacity:(visit:T)=>number,reader:AuditReader=prisma) {
  if(!visits.length)return [];
  const small=visits.filter(visit=>visit.id_visita<=4_294_967_295n).map(visit=>Number(visit.id_visita));
  const large=visits.filter(visit=>visit.id_visita>4_294_967_295n);
  const audits=await reader.bitacora.findMany({where:{entidad:'visita',accion:'REGISTRAR_VISITA',OR:[...(small.length?[{entidad_id:{in:small}}]:[]),...large.map(visit=>({entidad_id:null,descripcion:{contains:`"visitId":"${visit.id_visita}"`}}))]},orderBy:{id_bitacora:'desc'},select:{entidad_id:true,descripcion:true}});
  const snapshots=new Map<string,number>();
  const ids=new Set(visits.map(visit=>String(visit.id_visita)));
  for(const audit of audits){
    try{const data=JSON.parse(audit.descripcion??'') as {visitId?:string};if(!data.visitId||!ids.has(data.visitId)||snapshots.has(data.visitId))continue;const capacity=parseRecordedCapacity(audit.descripcion,BigInt(data.visitId));if(capacity!==null)snapshots.set(data.visitId,capacity);}catch{/* Las bitácoras originales de texto no contienen evaluación. */}
  }
  return visits.map(visit=>{
    const snapshot=snapshots.get(String(visit.id_visita));const capacity=snapshot??currentCapacity(visit);const evaluated=evaluateVisit(capacity,visit.ocupacion,visit.demanda);
    return {...visit,capacidad_registrada:capacity,alerta_unidad_adicional:evaluated.extraUnit,espera_adicional_minutos:evaluated.extraWaitMinutes,evaluationSource:snapshot===undefined?'current_capacity':'recorded'};
  });
}
