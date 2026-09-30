import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({visits:vi.fn(),summary:vi.fn(),audits:vi.fn(),group:vi.fn(),members:vi.fn()}));
vi.mock('../../lib/prisma.js',()=>({prisma:{visita:{findMany:mocks.visits},$queryRaw:mocks.summary,bitacora:{findMany:mocks.audits},registro_acceso:{groupBy:mocks.group},estacion_medio_acceso:{findMany:mocks.members}}}));
import {getAccessMediaReport,getOperationsReport} from './report.service.js';
describe('Reportes sobre el esquema original',()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.audits.mockResolvedValue([]);});
  it('agrega todos los resultados aunque el detalle tenga un límite',async()=>{
    mocks.visits.mockResolvedValue([{id_visita:1n,ocupacion:20,demanda:150,recorrido:{bus:{capacidad_maxima:100}}}]);
    mocks.summary.mockResolvedValue([{visits:1500n,occupancyTotal:30000n,demandTotal:220000n,averageOccupancy:20,averageDemand:146.67,extraUnitAlerts:1300n,additionalWaitVisits:1200n,estimatedVisits:1500n}]);
    const result=await getOperationsReport({stationId:2});
    expect(result.summary.extraUnitAlerts).toBe(1300);expect(result.summary.additionalWaitVisits).toBe(1200);
    expect(result.truncated).toBe(true);expect(result.summary.visits).toBe(1500);
    expect(result.items[0]?.evaluationSource).toBe('current_capacity');
    const sql=mocks.summary.mock.calls[0]?.[0];expect(sql.values).toContain(2);expect(sql.sql).toContain('v.estacion_id = ?');expect(sql.sql).not.toMatch(/LIMIT/);
  });
  it('agrega conteos sin límite de filas',async()=>{
    mocks.group.mockResolvedValue([{estacion_medio_acceso_id:8,_count:{_all:6500},_sum:{cantidad:720000}}]);
    mocks.members.mockResolvedValue([{id_estacion_medio_acceso:8,estacion_id:2,medio_acceso_id:1,estacion:{nombre:'Central'},medio_acceso:{nombre:'Tarjeta'}}]);
    const result=await getAccessMediaReport({stationId:2,from:'2026-09-01',to:'2026-09-29'});
    expect(result.totalRecords).toBe(6500);expect(result.totalQuantity).toBe(720000);expect(mocks.group.mock.calls[0]?.[0]).not.toHaveProperty('take');
  });
  it('devuelve ceros sin conteos',async()=>{mocks.group.mockResolvedValue([]);mocks.members.mockResolvedValue([]);expect(await getAccessMediaReport({})).toEqual({totalRecords:0,totalQuantity:0,items:[]});});
});
