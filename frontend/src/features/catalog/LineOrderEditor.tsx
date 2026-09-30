import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../../api/client';
import { Notice } from '../../components/ui/PageHeader';
import type { Row } from '../../components/ui/DataTable';
import { optionLabel } from './relations';
type Stop = {stationId:string;distance:string};
export function LineOrderEditor({onSaved}:{onSaved:()=>void}) {
  const [lines,setLines]=useState<Row[]>([]),[stations,setStations]=useState<Row[]>([]);
  const [lineId,setLineId]=useState(''),[stops,setStops]=useState<Stop[]>([]),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{Promise.all([apiRequest<{items:Row[]}>('/api/transport/lines'),apiRequest<{items:Row[]}>('/api/transport/stations')]).then(([l,s])=>{setLines(l.items);setStations(s.items);}).catch(e=>setError(e.message));},[]);
  function selectLine(id:string) {
    setLineId(id);setMessage('');
    const line=lines.find(row=>String(row.id_linea)===id);
    setStops(((line?.estaciones??[]) as Row[]).map(row=>({stationId:String(row.estacion_id),distance:row.distancia_siguiente==null?'':String(row.distancia_siguiente)})));
  }
  function update(index:number,patch:Partial<Stop>) {setStops(current=>current.map((stop,i)=>i===index?{...stop,...patch}:stop));}
  function move(index:number,delta:number) {setStops(current=>{const result=[...current];[result[index],result[index+delta]]=[result[index+delta],result[index]];return result;});}
  async function submit(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try {
      if(stops.length<1) throw Error('Configura al menos una estación.');
      if(new Set(stops.map(stop=>stop.stationId)).size!==stops.length) throw Error('Una estación no puede repetirse dentro de la misma línea.');
      await apiRequest(`/api/transport/lines/${lineId}/stations`,{method:'PUT',body:{stations:stops.map((stop,index)=>({stationId:Number(stop.stationId),order:index+1,distanceToNext:index===stops.length-1?null:Number(stop.distance)}))}});
      setMessage('Orden y distancias guardados.');onSaved();
      const result=await apiRequest<{items:Row[]}>('/api/transport/lines');setLines(result.items);
    }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{setBusy(false);}
  }
  return <form className="line-editor" onSubmit={submit}><Notice error={error} message={message}/><label>Línea<select required value={lineId} onChange={e=>selectLine(e.target.value)}><option value="">Selecciona la línea que quieres configurar</option>{lines.map(row=><option key={String(row.id_linea)} value={String(row.id_linea)}>{optionLabel(row)}</option>)}</select></label>
    <div className="editor-intro"><strong>Orden del recorrido</strong><p>Selecciona las estaciones y usa las flechas para ordenarlas. Cada distancia conecta con la siguiente parada.</p></div>
    {stops.map((stop,index)=><div className="stop-editor" key={index}><span className="stop-number">{index+1}</span><label>Estación<select required value={stop.stationId} onChange={e=>update(index,{stationId:e.target.value})}><option value="">Seleccionar estación</option>{stations.map(row=><option disabled={stops.some((other,i)=>i!==index&&other.stationId===String(row.id_estacion))} key={String(row.id_estacion)} value={String(row.id_estacion)}>{optionLabel(row)}</option>)}</select></label>{index<stops.length-1?<label>Distancia a la siguiente (km)<input type="number" min="0" step="0.001" required value={stop.distance} onChange={e=>update(index,{distance:e.target.value})}/></label>:<span className="muted">Última parada</span>}<div className="row-actions"><button className="button quiet" type="button" aria-label={`Subir parada ${index+1}`} disabled={index===0} onClick={()=>move(index,-1)}>↑</button><button className="button quiet" type="button" aria-label={`Bajar parada ${index+1}`} disabled={index===stops.length-1} onClick={()=>move(index,1)}>↓</button><button className="button danger" type="button" aria-label={`Quitar parada ${index+1}`} onClick={()=>setStops(stops.filter((_,i)=>i!==index))}>✕</button></div></div>)}
    <div className="form-footer"><span className="muted">{stops.length} estaciones · {stops.slice(0,-1).reduce((sum,stop)=>sum+Number(stop.distance||0),0).toFixed(3)} km</span><button type="button" className="button secondary" disabled={!lineId} onClick={()=>setStops([...stops,{stationId:'',distance:''}])}>＋ Añadir parada</button><button className="button primary" disabled={busy||!lineId||stops.length<1}>{busy?'Guardando…':'Guardar recorrido'}</button></div>
  </form>;
}
