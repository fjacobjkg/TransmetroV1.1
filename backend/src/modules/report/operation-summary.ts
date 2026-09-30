import {Prisma} from '../../../generated/prisma/client.js';
import {prisma} from '../../lib/prisma.js';
export type OperationFilters={from?:string|undefined;to?:string|undefined;municipalityId?:number|undefined;lineId?:number|undefined;stationId?:number|undefined;busId?:number|undefined};
export async function getOperationSummary(filters:OperationFilters) {
  const clauses:Prisma.Sql[]=[];
  if(filters.from)clauses.push(Prisma.sql`v.fecha_hora >= ${new Date(`${filters.from}T00:00:00.000Z`)}`);
  if(filters.to)clauses.push(Prisma.sql`v.fecha_hora <= ${new Date(`${filters.to}T23:59:59.999Z`)}`);
  if(filters.stationId!==undefined)clauses.push(Prisma.sql`v.estacion_id = ${filters.stationId}`);
  if(filters.lineId!==undefined)clauses.push(Prisma.sql`r.linea_id = ${filters.lineId}`);
  if(filters.busId!==undefined)clauses.push(Prisma.sql`r.bus_id = ${filters.busId}`);
  if(filters.municipalityId!==undefined)clauses.push(Prisma.sql`l.municipalidad_id = ${filters.municipalityId}`);
  const where=clauses.length?Prisma.sql`WHERE ${Prisma.join(clauses,' AND ')}`:Prisma.empty;
  // La capacidad histórica se lee de la bitácora existente, sin agregar columnas.
  const rows=await prisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`
    SELECT COUNT(*) AS visits, COALESCE(SUM(v.ocupacion),0) AS occupancyTotal,
      COALESCE(SUM(v.demanda),0) AS demandTotal, COALESCE(AVG(v.ocupacion),0) AS averageOccupancy,
      COALESCE(AVG(v.demanda),0) AS averageDemand,
      COALESCE(SUM(v.demanda >= 1.5 * COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(a.descripcion),a.descripcion,'{}'),'$.capacity')) AS UNSIGNED),b.capacidad_maxima)),0) AS extraUnitAlerts,
      COALESCE(SUM(v.ocupacion < 0.25 * COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(a.descripcion),a.descripcion,'{}'),'$.capacity')) AS UNSIGNED),b.capacidad_maxima)),0) AS additionalWaitVisits,
      COALESCE(SUM(a.id IS NULL),0) AS estimatedVisits
    FROM visitas v JOIN recorridos r ON r.id = v.recorrido_id
    JOIN buses b ON b.id = r.bus_id JOIN lineas l ON l.id = r.linea_id
    LEFT JOIN bitacora a ON a.id = (
      SELECT MAX(e.id) FROM bitacora e
      WHERE e.entidad = 'visita' AND e.accion = 'REGISTRAR_VISITA'
        AND (e.entidad_id = v.id OR e.entidad_id IS NULL)
        AND JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(e.descripcion),e.descripcion,'{}'),'$.format')) = 'transmetro.visit-evaluation.v1'
        AND JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(e.descripcion),e.descripcion,'{}'),'$.visitId')) = CAST(v.id AS CHAR)
        AND JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(e.descripcion),e.descripcion,'{}'),'$.capacity')) = 'INTEGER'
        AND CAST(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(e.descripcion),e.descripcion,'{}'),'$.capacity')) AS UNSIGNED) BETWEEN 1 AND 65535
    ) ${where}`);
  const row=rows[0]??{};
  return Object.fromEntries(['visits','occupancyTotal','demandTotal','averageOccupancy','averageDemand','extraUnitAlerts','additionalWaitVisits','estimatedVisits'].map(key=>[key,Number(row[key]??0)])) as {visits:number;occupancyTotal:number;demandTotal:number;averageOccupancy:number;averageDemand:number;extraUnitAlerts:number;additionalWaitVisits:number;estimatedVisits:number};
}
