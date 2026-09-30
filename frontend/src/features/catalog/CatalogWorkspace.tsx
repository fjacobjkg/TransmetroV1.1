import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../hooks/AuthContext';
import { Badge, DataTable, textValue, type Column, type Row } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { Notice, PageHeader } from '../../components/ui/PageHeader';
import { resourcesBySection, type Field } from './resources';
import { optionLabel, relations } from './relations';
import { LineOrderEditor } from './LineOrderEditor';
const titles:Record<string,string>={users:'Cuentas y permisos',transport:'Red de transporte',personnel:'Personal y accesos',fleet:'Flota y parqueos',audit:'Bitácora de auditoría'};
const labels:Record<string,string>={nombre:'Nombre',codigo:'Código',nombre_usuario:'Usuario',activo:'Estado',placa:'Placa',capacidad_maxima:'Capacidad',municipalidad:'Municipalidad',estacion:'Estación',rol:'Rol',creado_en:'Creación',residencia:'Residencia',informacion_educativa:'Formación',telefono:'Teléfono',correo:'Correo',fecha_hora:'Fecha y hora',accion:'Acción',entidad:'Entidad',descripcion:'Descripción',usuario:'Responsable',distanciaTotal:'Distancia total (km)',estaciones:'Estaciones en orden',asignaciones_bus:'Buses asignados',asignaciones_linea:'Línea vigente',asignaciones_parqueo:'Parqueo vigente',asignaciones_estacion:'Estaciones asignadas',asignaciones_guardia:'Guardias asignados',id_entidad:'Referencia'};
const preferred = ['codigo','nombre','nombre_usuario','rol','placa','capacidad_maxima','municipalidad','estacion','distanciaTotal','residencia','telefono','correo','asignaciones_linea','asignaciones_parqueo','asignaciones_estacion','asignaciones_guardia','activo','fecha_hora','accion','entidad','descripcion','usuario'];
const editableKeys=new Set(['municipalities','stations','lines','pilots','guards','accesses','media','parkings','buses']);
const fieldToColumn:Record<string,string>={name:'nombre',code:'codigo',plate:'placa',capacity:'capacidad_maxima',municipalityId:'municipalidad_id',stationId:'estacion_id',residence:'residencia',education:'informacion_educativa',phone:'telefono',email:'correo',description:'descripcion'};
function rowId(row:Row) {return Object.entries(row).find(([key])=>key.startsWith('id_'))?.[1];}
export function CatalogWorkspace({section}:{section:string}) {
  const {user}=useAuth();
  const resources=resourcesBySection[section]??[];
  const [selected,setSelected]=useState(resources[0]?.key??'');
  const resource=resources.find(item=>item.key===selected)??resources[0];
  const [rows,setRows]=useState<Row[]>([]),[values,setValues]=useState<Record<string,string>>({}),[lookups,setLookups]=useState<Record<string,Row[]>>({});
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[formOpen,setFormOpen]=useState(false),[editing,setEditing]=useState<Row|null>(null);
  const load=useCallback(async(signal?:AbortSignal)=>{
    if(!resource)return;setBusy(true);setError('');
    try {const result=await apiRequest<{items?:Row[];total?:number}>(resource.path,{signal});setRows(result.items??[]);if(result.total&&result.total>(result.items?.length??0))setMessage(`Se muestran los primeros ${result.items?.length} registros de ${result.total}.`);}
    catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'No fue posible cargar.');}
    finally{if(!signal?.aborted)setBusy(false);}
  },[resource]);
  useEffect(()=>{setRows([]);setValues({});setEditing(null);setFormOpen(false);setMessage('');const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load]);
  useEffect(()=>{
    if(!resource?.fields)return;
    const controller=new AbortController();
    const fields=resource.fields.filter(field=>relations[field.name]);
    void Promise.all(fields.map(async(field)=>{
      const relation=relations[field.name];
      const path=field.name==='userId'&&resource.key==='update-user'?'/api/users?pageSize=100':relation.path;
      const response=await apiRequest<{items:Row[]}>(path,{signal:controller.signal});
      return [field.name,response.items] as const;
    })).then(entries=>setLookups(Object.fromEntries(entries))).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
    return()=>controller.abort();
  },[resource]);
  const columns=useMemo<Column[]>(()=>{
    const keys=preferred.filter(key=>rows.some(row=>row[key]!==undefined));
    return keys.map(key=>({key,label:labels[key]??key,render:row=>key==='activo'?<Badge value={row[key]}/>:key.includes('fecha')||key==='creado_en'?new Date(String(row[key])).toLocaleString('es-GT'):textValue(row[key])}));
  },[rows]);
  const canWrite=user?.role==='ADMIN'&&Boolean(resource?.method);
  function open(row:Row|null=null) {
    setEditing(row);setValues(row?{...Object.fromEntries((resource.fields??[]).map(field=>[field.name,String(row[fieldToColumn[field.name]??field.name]??'')])),active:String(row.activo)}:{});setError('');setFormOpen(true);
  }
  const formFields:Field[]=[...(resource?.fields??[]).filter(field=>!editing||!['parkingId','stationId','code'].includes(field.name)),...(editing?[{name:'active',label:'Estado',kind:'select' as const,options:[{label:'Activo',value:'true'},{label:'Inactivo',value:'false'}]}]:[])];
  async function submit(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      if(resource.key==='update-user'&&!values.role&&!values.active)throw Error('Selecciona un cambio de rol o estado.');
      const body=resource.body&&!editing?resource.body(values):Object.fromEntries(formFields.filter(field=>!field.pathOnly&&(Boolean(values[field.name])||Boolean(editing&&!field.required&&['phone','email','description','education'].includes(field.name)))).map(field=>[field.name,!values[field.name]?null:field.name==='active'?values.active==='true':field.kind==='number'||relations[field.name]?Number(values[field.name]):values[field.name]]));
      const path=editing?`${resource.path.split('?')[0]}/${rowId(editing)}`:resource.writePath?.(values)??resource.path;
      await apiRequest(path,{method:editing?'PATCH':resource.method,body});setFormOpen(false);await load();setMessage('Cambios guardados. La operación quedó registrada en la bitácora.');
    }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{setBusy(false);}
  }
  function fieldControl(field:Field) {
    const value=values[field.name]??'';const setValue=(value:string)=>setValues(current=>({...current,[field.name]:value}));
    if(relations[field.name]) {
      const relation=relations[field.name];
      return <select required={field.required} value={value} onChange={e=>setValue(e.target.value)}><option value="">Selecciona {relation.label.toLowerCase()}</option>{resource.key==='assign-line'&&field.name==='lineId'&&<option value="0">Retirar de la línea</option>}{lookups[field.name]?.map(row=><option key={String(row[relation.id])} value={String(row[relation.id])}>{optionLabel(row)}{row.activo===false?' · En preparación / inactivo':''}</option>)}</select>;
    }
    if(field.kind==='select')return <select required={field.required} value={value} onChange={e=>setValue(e.target.value)}><option value="">Selecciona una opción</option>{field.options?.filter(item=>item.value!=='').map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select>;
    if(field.kind==='textarea')return <textarea rows={3} required={field.required} value={value} onChange={e=>setValue(e.target.value)}/>;
    return <input type={field.kind??'text'} min={field.min} minLength={field.minLength} step={field.kind==='number'?'1':undefined} required={field.required} value={value} autoComplete={field.kind==='password'?'new-password':undefined} onChange={e=>setValue(e.target.value)}/>;
  }
  return <section><PageHeader eyebrow="GESTIÓN CENTRALIZADA" title={titles[section]??'Catálogo'} description="Consulta registros y conserva la trazabilidad de cada cambio." actions={<button className="button secondary" disabled={busy} onClick={()=>void load()}>↻ Actualizar</button>}/>
    <div className="resource-tabs" role="tablist" aria-label="Catálogos">{resources.map(item=><button role="tab" aria-selected={item.key===resource.key} className={item.key===resource.key?'active':''} key={item.key} onClick={()=>setSelected(item.key)}>{item.title}</button>)}</div>
    <Notice error={formOpen?'':error} message={message}/>
    <article className="panel"><div className="panel-heading"><div><h2>{resource.title}</h2><p>{resource.description}</p></div>{canWrite&&resource.key!=='line-stations'&&<button className="button primary" disabled={busy} onClick={()=>open()}>{resource.method==='POST'&&!resource.writePath?'＋ Crear registro':'Configurar'}</button>}</div>
      {resource.key==='line-stations'&&canWrite?<LineOrderEditor onSaved={()=>void load()}/>:<DataTable rows={rows} columns={columns} loading={busy} actions={canWrite&&editableKeys.has(resource.key)?row=><button className="button quiet" onClick={()=>open(row)}>Editar</button>:undefined}/>} 
      {user?.role==='ADMINISTRATIVO'&&<p className="read-only-note">Consulta administrativa · Tu rol tiene acceso de lectura.</p>}
    </article>
    {formOpen&&<Dialog title={`${editing?'Editar':'Configurar'} · ${resource.title}`} onClose={()=>{if(!busy)setFormOpen(false);}}><form onSubmit={submit}><Notice error={error}/><p className="muted">{resource.description}</p><div className="form-grid">{formFields.map(field=><label key={field.name}><span>{relations[field.name]?.label??field.label}{field.required&&<span className="required-mark" aria-hidden="true"> *</span>}</span>{fieldControl(field)}</label>)}</div>{resource.key==='users'&&<p className="muted">La contraseña necesita 12 caracteres como mínimo, con mayúscula, minúscula y número.</p>}<div className="form-footer"><button type="button" className="button secondary" disabled={busy} onClick={()=>setFormOpen(false)}>Cancelar</button><button className="button primary" disabled={busy}>{busy?'Guardando…':'Guardar cambios'}</button></div></form></Dialog>}
  </section>;
}
