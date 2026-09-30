import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({trip:vi.fn(),assignment:vi.fn(),createVisit:vi.fn(),updateTrip:vi.fn(),countVisits:vi.fn(),audit:vi.fn()}));
vi.mock('../../lib/prisma.js',()=>({prisma:{$transaction:async(fn:(tx:unknown)=>unknown)=>fn({recorrido:{findUnique:mocks.trip,update:mocks.updateTrip},asignacion_bus_linea:{findFirst:mocks.assignment},visita:{create:mocks.createVisit,count:mocks.countVisits},bitacora:{create:mocks.audit}})}}));
import {closeTrip,recordVisit} from './route-operation.service.js';
const actor={id:1,name:'Administrador',username:'admin',role:'ADMIN' as const,stationIds:[]};
describe('Consistencia de recorridos',()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.trip.mockResolvedValue({id_recorrido:1n,estado:'EN_CURSO',fecha_inicio:new Date('2026-09-29T10:00:00Z'),bus_id:1,linea_id:1,bus:{capacidad_maxima:100},linea:{estaciones:[{estacion_id:1,orden:1},{estacion_id:2,orden:2}]},visitas:[{estacion_id:1,orden:1,fecha_hora:new Date('2026-09-29T10:10:00Z')}]});mocks.assignment.mockResolvedValue({id:1});});
  it.each(['2026-09-29T09:59:00Z','2026-09-29T10:05:00Z'])('rechaza visita anterior al inicio o a la anterior: %s',async occurredAt=>{await expect(recordVisit(actor,1,{stationId:2,occupancy:20,demand:150,occurredAt})).rejects.toThrow('posterior al inicio');expect(mocks.createVisit).not.toHaveBeenCalled();});
  it('no finaliza un recorrido incompleto',async()=>{mocks.countVisits.mockResolvedValue(1);await expect(closeTrip(actor,1,'FINALIZADO')).rejects.toThrow('Completa todas las estaciones');expect(mocks.updateTrip).not.toHaveBeenCalled();});
  it('permite cancelar conservando las visitas',async()=>{mocks.updateTrip.mockResolvedValue({estado:'CANCELADO'});await closeTrip(actor,1,'CANCELADO');expect(mocks.updateTrip).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({estado:'CANCELADO'})}));expect(mocks.createVisit).not.toHaveBeenCalled();});
});
