import {describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({stations:vi.fn().mockResolvedValue([{id_estacion:1},{id_estacion:2}]),enable:vi.fn(),members:vi.fn().mockResolvedValue([])}));
vi.mock('../../lib/prisma.js',()=>({prisma:{$transaction:async(fn:(tx:unknown)=>unknown)=>fn({linea:{findUnique:async()=>({id_linea:1,activo:false})},recorrido:{count:async()=>0},linea_estacion:{findMany:mocks.members,deleteMany:vi.fn(),createMany:vi.fn()},estacion:{findMany:mocks.stations,updateMany:mocks.enable},bitacora:{create:vi.fn()}})}}));
import {replaceLineStations} from './transport-structure.service.js';
describe('Configuración de una red nueva',()=>{
  it('permite vincular estaciones en preparación y las habilita al pertenecer a una línea',async()=>{await replaceLineStations(1,1,[{stationId:1,order:1,distanceToNext:2.5},{stationId:2,order:2,distanceToNext:null}]);expect(mocks.stations).toHaveBeenCalledWith({where:{id_estacion:{in:[1,2]}},select:{id_estacion:true}});expect(mocks.enable).toHaveBeenCalledWith({where:{id_estacion:{in:[1,2]},activo:false},data:{activo:true}});});
});
