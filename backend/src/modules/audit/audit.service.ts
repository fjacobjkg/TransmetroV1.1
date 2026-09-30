import type {Prisma} from '../../../generated/prisma/client.js';
import {prisma} from '../../lib/prisma.js';
type AuditWriter=Pick<Prisma.TransactionClient,'bitacora'>;
export function auditEntityId(value:number|bigint|undefined):number|null {
  if(value===undefined)return null;
  const id=BigInt(value);return id>=0n&&id<=4_294_967_295n?Number(id):null;
}
export async function writeAudit(writer:AuditWriter,event:{userId:number;action:string;entity:string;entityId?:number|bigint;description?:string}):Promise<void> {
  const reference=auditEntityId(event.entityId);
  const description=event.entityId!==undefined&&reference===null?`${event.description??''} · referencia ${event.entityId}`:event.description??null;
  await writer.bitacora.create({data:{usuario_id:event.userId,accion:event.action,entidad:event.entity,entidad_id:reference,descripcion:description?.slice(0,500)??null}});
}
export async function listAuditEntries(filters:{userId?:number|undefined;action?:string|undefined;entity?:string|undefined;from?:Date|undefined;to?:Date|undefined;page:number;pageSize:number}) {
  const where={...(filters.userId?{usuario_id:filters.userId}:{}),...(filters.action?{accion:{contains:filters.action}}:{}),...(filters.entity?{entidad:filters.entity}:{}),...(filters.from||filters.to?{fecha_hora:{...(filters.from?{gte:filters.from}:{}),...(filters.to?{lte:filters.to}:{})}}:{})};
  const [items,total]=await Promise.all([prisma.bitacora.findMany({where,orderBy:{fecha_hora:'desc'},skip:(filters.page-1)*filters.pageSize,take:filters.pageSize,include:{usuario:{select:{id_usuario:true,nombre:true,nombre_usuario:true}}}}),prisma.bitacora.count({where})]);
  return {items,total,page:filters.page,pageSize:filters.pageSize};
}
