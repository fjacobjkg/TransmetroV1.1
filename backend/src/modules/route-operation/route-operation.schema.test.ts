import {describe,expect,it} from 'vitest';
import {closeTripSchema,tripFiltersSchema} from './route-operation.schema.js';
import {accessCountFiltersSchema} from '../access-media/access-media.schema.js';
describe('Fechas y cierre explícito',()=>{
  it('rechaza períodos invertidos para recorridos y conteos',()=>{const range={from:'2026-09-29',to:'2026-09-01'};expect(tripFiltersSchema.safeParse(range).success).toBe(false);expect(accessCountFiltersSchema.safeParse(range).success).toBe(false);});
  it('rechaza fechas que no existen',()=>{expect(accessCountFiltersSchema.safeParse({from:'2026-02-30'}).success).toBe(false);});
  it('acepta el mismo día y aplica paginación predeterminada',()=>{expect(tripFiltersSchema.parse({from:'2026-09-29',to:'2026-09-29'}).pageSize).toBe(25);});
  it('no convierte un cierre mal escrito en finalización',()=>{expect(closeTripSchema.safeParse({state:'CANCELADO'}).success).toBe(true);expect(closeTripSchema.safeParse({state:'CANCELAD0'}).success).toBe(false);expect(closeTripSchema.safeParse({}).success).toBe(false);});
});
