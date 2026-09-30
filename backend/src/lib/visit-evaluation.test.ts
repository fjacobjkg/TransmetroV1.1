import {describe,expect,it,vi} from 'vitest';
vi.mock('./prisma.js',()=>({prisma:{}}));
import {attachVisitEvaluations,evaluationDescription,parseRecordedCapacity} from './visit-evaluation.js';
import {auditEntityId} from '../modules/audit/audit.service.js';
import {idParamSchema,visitSchema} from '../modules/route-operation/route-operation.schema.js';
describe('Compatibilidad con identificadores y evaluación originales',()=>{
  it('conserva identificadores BIGINT sin perder precisión',()=>{const id='18446744073709551615';expect(idParamSchema.parse(id)).toBe(BigInt(id));expect(idParamSchema.safeParse('18446744073709551616').success).toBe(false);expect(auditEntityId(BigInt(id))).toBeNull();expect(auditEntityId(4294967295n)).toBe(4294967295);});
  it('respeta SMALLINT y UINT del SQL original',()=>{expect(visitSchema.safeParse({stationId:1,occupancy:65535,demand:4294967295}).success).toBe(true);expect(visitSchema.safeParse({stationId:1,occupancy:65536,demand:1}).success).toBe(false);});
  it('rechaza metadatos inválidos o pertenecientes a otra visita',()=>{expect(parseRecordedCapacity('Texto original',1n)).toBeNull();expect(parseRecordedCapacity(evaluationDescription(2n,100),1n)).toBeNull();expect(parseRecordedCapacity(evaluationDescription(1n,65536),1n)).toBeNull();});
  it('usa capacidad histórica aunque cambie la capacidad actual',async()=>{
    const reader={bitacora:{findMany:vi.fn().mockResolvedValue([{entidad_id:1,descripcion:evaluationDescription(1n,100)}])}};
    const [visit]=await attachVisitEvaluations([{id_visita:1n,ocupacion:20,demanda:150}],()=>200,reader as never);
    expect(visit).toMatchObject({capacidad_registrada:100,alerta_unidad_adicional:true,espera_adicional_minutos:5,evaluationSource:'recorded'});
  });
  it('identifica las estimaciones cuando el origen no tiene capacidad histórica',async()=>{
    const reader={bitacora:{findMany:vi.fn().mockResolvedValue([])}};
    const [visit]=await attachVisitEvaluations([{id_visita:4294967296n,ocupacion:25,demanda:149}],()=>100,reader as never);
    expect(visit).toMatchObject({alerta_unidad_adicional:false,espera_adicional_minutos:0,evaluationSource:'current_capacity'});
    expect(reader.bitacora.findMany.mock.calls[0]?.[0].where.OR[0].entidad_id).toBeNull();
  });
});
