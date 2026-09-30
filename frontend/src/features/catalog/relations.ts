import type { Row } from '../../components/ui/DataTable';
export type Relation = {path:string;id:string;label:string};
export const relations:Record<string,Relation> = {
  municipalityId:{path:'/api/transport/municipalities',id:'id_municipalidad',label:'Municipalidad'},
  stationId:{path:'/api/transport/stations',id:'id_estacion',label:'Estación'},
  lineId:{path:'/api/transport/lines',id:'id_linea',label:'Línea'},
  parkingId:{path:'/api/fleet/parkings',id:'id_parqueo',label:'Parqueo'},
  busId:{path:'/api/fleet/buses',id:'id_bus',label:'Bus'},
  guardId:{path:'/api/security/guards',id:'id_guardia',label:'Guardia'},
  accessId:{path:'/api/security/accesses',id:'id_acceso',label:'Acceso físico'},
  mediaId:{path:'/api/access-media/media',id:'id_medio_acceso',label:'Medio de acceso'},
  userId:{path:'/api/personnel/operators',id:'id_usuario',label:'Operador'},
};
export function optionLabel(row:Row):string {
  const station=row.estacion as Row|undefined;
  return [row.codigo,row.nombre??row.name??row.nombre_usuario,station?.nombre].filter(Boolean).join(' · ');
}
