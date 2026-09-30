import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { apiRequest } from "../api/client";
import { Dialog } from './ui/Dialog';
import { useAuth } from "../hooks/AuthContext";

type Station = { id_estacion: number; codigo: string; nombre: string; orden: number };
type Bus = { id_bus: number; codigo: string; capacidad_maxima: number };
type Line = { id_linea: number; codigo: string; nombre: string; estaciones: Array<{ estacion_id: number; orden: number; estacion: Station }>; asignaciones_bus: Array<{ bus: Bus }> };
type Trip = { id_recorrido: string | number; fecha_inicio: string; estado: string; linea: { codigo: string; nombre: string; estaciones?: Array<{ estacion_id: number; orden: number; estacion: Station }> }; bus: Bus; visitas: Array<{ id_visita: string; orden: number; ocupacion: number; demanda: number; estacion: Station; alerta_unidad_adicional: boolean; espera_adicional_minutos: number; evaluationSource?: string }> };
type MediaOption = { id_estacion_medio_acceso: number; activo: boolean; estacion: Station; medio_acceso: { nombre: string } };
type AccessCount = { id_registro_acceso: string; estacion_medio_acceso_id: number; usuario_id: number; cantidad: number };

const guatemalaDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(new Date());

export function OperationsWorkspace() {
  const { user } = useAuth();
  const [lines, setLines] = useState<Line[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedLine, setSelectedLine] = useState("");
  const [selectedBus, setSelectedBus] = useState("");
  const [selectedTrip, setSelectedTrip] = useState("");
  const [occupancy, setOccupancy] = useState("");
  const [demand, setDemand] = useState("");
  const [stationId, setStationId] = useState(user?.stationIds[0]?.toString() ?? "");
  const [media, setMedia] = useState<MediaOption[]>([]);
  const [accessCounts, setAccessCounts] = useState<AccessCount[]>([]);
  const [selectedMedia, setSelectedMedia] = useState("");
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelTrip, setCancelTrip] = useState<Trip | null>(null);

  const load = useCallback(async () => {
    const [lineResponse, tripResponse, openResponse] = await Promise.all([
      apiRequest<{ items: Line[] }>("/api/operations/lines"),
      apiRequest<{ items: Trip[] }>("/api/operations/trips?page=1&pageSize=50"),
      apiRequest<{ items: Trip[] }>("/api/operations/trips?state=EN_CURSO&pageSize=100"),
    ]);
    setLines(lineResponse.items);
    setTrips([...openResponse.items, ...tripResponse.items.filter(trip => !openResponse.items.some(open => String(open.id_recorrido) === String(trip.id_recorrido)))]);
    setSelectedLine((current) => current || lineResponse.items[0]?.id_linea.toString() || "");
    setSelectedTrip((current) => openResponse.items.some(trip=>String(trip.id_recorrido)===current) ? current : openResponse.items[0]?.id_recorrido.toString() || "");
  }, []);

  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar la operación.")); }, [load]);

  const line = lines.find((item) => item.id_linea.toString() === selectedLine);
  useEffect(() => { setSelectedBus(line?.asignaciones_bus.find(({bus})=>!trips.some(trip=>trip.estado==="EN_CURSO"&&trip.bus.id_bus===bus.id_bus))?.bus.id_bus.toString() ?? ""); }, [line, trips]);
  const activeTrip = trips.find((trip) => trip.id_recorrido.toString() === selectedTrip && trip.estado === "EN_CURSO");
  const tripLine = lines.find((item) => item.codigo === activeTrip?.linea.codigo);
  const nextStation = tripLine?.estaciones.slice().sort((a, b) => a.orden - b.orden)[activeTrip?.visitas.length ?? 0];

  useEffect(() => {
    setSelectedMedia("");
    if (!stationId) { setMedia([]); return; }
    apiRequest<{ items: MediaOption[] }>(`/api/access-media/stations/${stationId}/media`)
      .then((response) => setMedia(response.items.filter((item) => item.activo)))
      .catch(() => setMedia([]));
  }, [stationId]);

  const loadAccessCounts = useCallback(async () => {
    if (!stationId) { setAccessCounts([]); return; }
    const today = guatemalaDate();
    const response = await apiRequest<{ items: AccessCount[] }>(`/api/access-media/access-counts?stationId=${stationId}&from=${today}&to=${today}`);
    setAccessCounts(response.items);
  }, [stationId]);

  useEffect(() => { void loadAccessCounts().catch(() => setAccessCounts([])); }, [loadAccessCounts]);

  async function perform(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); await load(); setMessage(success); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar los datos."); return false; }
    finally { setBusy(false); }
  }

  function startTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLine || !selectedBus) return;
    void perform(() => apiRequest("/api/operations/trips", { method: "POST", body: { lineId: Number(selectedLine), busId: Number(selectedBus) } }), "Recorrido iniciado.");
  }

  function recordVisit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTrip || !nextStation) return;
    void perform(() => apiRequest(`/api/operations/trips/${activeTrip.id_recorrido}/visits`, {
      method: "POST", body: { stationId: nextStation.estacion_id, occupancy: Number(occupancy), demand: Number(demand) },
    }), "Visita registrada y evaluada.").then(saved => { if(saved) { setOccupancy(""); setDemand(""); } });
  }

  function recordCount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMedia) return;
    const existing = accessCounts.find((entry) => entry.estacion_medio_acceso_id === Number(selectedMedia) && entry.usuario_id === user?.id);
    const action = async () => {
      if (existing) await apiRequest(`/api/access-media/access-counts/${existing.id_registro_acceso}`, { method: "PATCH", body: { quantity: Number(quantity) } });
      else await apiRequest("/api/access-media/access-counts", { method: "POST", body: { stationMediaId: Number(selectedMedia), recordDate: guatemalaDate(), quantity: Number(quantity) } });
      await loadAccessCounts();
    };
    void perform(action, existing ? "Conteo corregido; el cambio quedó registrado en la bitácora." : "Conteo guardado en la bitácora.").then(saved => { if(saved) setQuantity(""); });
  }

  const stationOptions = useMemo(() => user?.role === "OPERADOR_ESTACION" ? user.stationIds : [], [user]);
  const stationNames = new Map(lines.flatMap(line => line.estaciones.map(entry => [entry.estacion_id, entry.estacion.nombre] as const)));
  const canRecordNext = nextStation && (user?.role === 'ADMIN' || user?.stationIds.includes(nextStation.estacion_id));

  return (
    <section className="work-area">
      <div className="work-heading"><div><span className="section-kicker">OPERACIÓN DE ESTACIONES</span><h2>Recorridos y registros</h2><p>Las visitas siguen el orden configurado de la línea y guardan la capacidad evaluada.</p></div><button className="secondary-button" type="button" disabled={busy} onClick={() => void load().catch(cause=>setError(cause.message))}>Actualizar</button></div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {message && <div className="notice notice-success" role="status">{message}</div>}
      <div className="work-grid">
        <article className="work-card">
          <div className="work-card-heading"><div><span className="section-kicker">NUEVO RECORRIDO</span><h3>Iniciar operación</h3></div><span className="work-icon">↗</span></div>
          <form className="work-form" onSubmit={startTrip}>
            <label>Línea<select value={selectedLine} onChange={(event) => setSelectedLine(event.target.value)} required><option value="">Selecciona una línea</option>{lines.map((item) => <option key={item.id_linea} value={item.id_linea}>{item.codigo} · {item.nombre}</option>)}</select></label>
            <label>Bus asignado<select value={selectedBus} onChange={(event) => setSelectedBus(event.target.value)} required><option value="">Selecciona un bus</option>{line?.asignaciones_bus.map(({ bus }) => <option disabled={trips.some(trip=>trip.estado==="EN_CURSO"&&trip.bus.id_bus===bus.id_bus)} key={bus.id_bus} value={bus.id_bus}>{bus.codigo} · {bus.capacidad_maxima} plazas{trips.some(trip=>trip.estado==="EN_CURSO"&&trip.bus.id_bus===bus.id_bus)?" · En recorrido":""}</option>)}</select></label>
            <button className="primary-button" type="submit" disabled={busy || !line || !selectedBus}>{busy ? "Guardando…" : "Iniciar recorrido"}</button>
          </form>
        </article>
        <article className="work-card">
          <div className="work-card-heading"><div><span className="section-kicker">VISITA</span><h3>Registrar estación</h3></div><span className="work-icon">◷</span></div>
          <form className="work-form" onSubmit={recordVisit}>
            <label>Recorrido abierto<select value={selectedTrip} onChange={(event) => setSelectedTrip(event.target.value)} required><option value="">Selecciona un recorrido</option>{trips.filter((trip) => trip.estado === "EN_CURSO").map((trip) => <option key={trip.id_recorrido} value={trip.id_recorrido}>{trip.linea.codigo} · bus {trip.bus.codigo}</option>)}</select></label>
            <div className="next-stop"><span>SIGUIENTE ESTACIÓN</span><strong>{nextStation?.estacion.nombre ?? (activeTrip ? "Recorrido completo" : "—")}</strong>{nextStation && <small>{nextStation.estacion.codigo} · parada {nextStation.orden}</small>}</div>
            <div className="form-row"><label>Ocupación<input type="number" min="0" step="1" value={occupancy} onChange={(event) => setOccupancy(event.target.value)} required /></label><label>Demanda<input type="number" min="0" step="1" value={demand} onChange={(event) => setDemand(event.target.value)} required /></label></div>
            {activeTrip && <div className="capacity-preview">Capacidad: <strong>{activeTrip.bus.capacidad_maxima} personas</strong>{demand !== '' && Number(demand) >= activeTrip.bus.capacidad_maxima * 1.5 && <p>Demanda ≥ 150 %: se registrará una alerta de unidad adicional.</p>}{occupancy !== '' && Number(occupancy) < activeTrip.bus.capacidad_maxima * .25 && <p>Ocupación &lt; 25 %: se registrarán 5 minutos adicionales de espera.</p>}{!canRecordNext && nextStation && <p>La siguiente estación requiere un operador asignado a ella.</p>}</div>}
            <button className="primary-button" type="submit" disabled={busy || !activeTrip || !canRecordNext}>{busy ? "Guardando…" : "Guardar visita"}</button>
          </form>
        </article>
        {user?.role === "OPERADOR_ESTACION" && <article className="work-card">
          <div className="work-card-heading"><div><span className="section-kicker">MEDIOS DE ACCESO</span><h3>Registrar conteo diario</h3></div><span className="work-icon">▤</span></div>
          <form className="work-form" onSubmit={recordCount}>
            <label>Estación<select value={stationId} onChange={(event) => setStationId(event.target.value)} required><option value="">Selecciona una estación</option>{stationOptions.map((id) => <option key={id} value={id}>{stationNames.get(id) ?? `Estación ${id}`}</option>)}</select></label>
            <label>Medio habilitado<select value={selectedMedia} onChange={(event) => setSelectedMedia(event.target.value)} required><option value="">Selecciona un medio</option>{media.map((item) => <option key={item.id_estacion_medio_acceso} value={item.id_estacion_medio_acceso}>{item.medio_acceso.nombre}</option>)}</select></label>
            {(() => { const existing = accessCounts.find((entry) => entry.estacion_medio_acceso_id === Number(selectedMedia) && entry.usuario_id === user?.id); return existing ? <div className="existing-count">Conteo de hoy: <strong>{existing.cantidad}</strong> · Guardar actualizará este valor y dejará auditoría.</div> : null; })()}
            <label>{accessCounts.some((entry) => entry.estacion_medio_acceso_id === Number(selectedMedia) && entry.usuario_id === user?.id) ? "Cantidad corregida" : "Cantidad registrada"}<input type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>
            <button className="primary-button" type="submit" disabled={busy || !selectedMedia}>{busy ? "Guardando…" : "Guardar conteo"}</button>
          </form>
        </article>}
      </div>
      <article className="work-card trip-list-card">
        <div className="work-card-heading"><div><span className="section-kicker">REGISTROS RECIENTES</span><h3>Recorridos</h3></div><span className="record-count">{trips.length} registros</span></div>
        {trips.length === 0 ? <p className="empty-state">Todavía no hay recorridos registrados.</p> : <div className="table-wrap"><table><thead><tr><th>Inicio</th><th>Línea</th><th>Bus</th><th>Estado</th><th>Visitas y evaluación</th><th>Acciones</th></tr></thead><tbody>{trips.map((trip) => <tr key={trip.id_recorrido}><td>{new Date(trip.fecha_inicio).toLocaleString("es-GT")}</td><td>{trip.linea.codigo} · {trip.linea.nombre}</td><td>{trip.bus.codigo}</td><td><span className={`state-tag state-${trip.estado.toLowerCase()}`}>{trip.estado.replace("_", " ")}</span></td><td><details><summary>{trip.visitas.length} visitas · Ver detalle</summary><ol className="visit-timeline">{trip.visitas.map(visit=><li key={visit.id_visita}><strong>{visit.orden}. {visit.estacion.nombre}</strong><span>Ocupación {visit.ocupacion} · demanda {visit.demanda}</span>{visit.evaluationSource==='current_capacity' && <span className="muted">Evaluación estimada con capacidad actual</span>}{visit.alerta_unidad_adicional && <span className="badge badge-warn">Unidad adicional requerida</span>}{visit.espera_adicional_minutos > 0 && <span className="badge badge-blue">+{visit.espera_adicional_minutos} min de espera</span>}</li>)}</ol></details></td><td>{trip.estado === 'EN_CURSO' && <button className="button danger" disabled={busy} onClick={()=>setCancelTrip(trip)}>Cancelar</button>}</td></tr>)}</tbody></table></div>}
      </article>
      {cancelTrip && <Dialog title="Cancelar recorrido" onClose={()=>{if(!busy)setCancelTrip(null);}}><p>El recorrido del bus <strong>{cancelTrip.bus.codigo}</strong> en <strong>{cancelTrip.linea.nombre}</strong> se cerrará como cancelado. Las visitas ya registradas se conservarán.</p><div className="form-footer"><button className="button secondary" disabled={busy} onClick={()=>setCancelTrip(null)}>Volver</button><button className="button danger" disabled={busy} onClick={()=>void perform(()=>apiRequest(`/api/operations/trips/${cancelTrip.id_recorrido}/close`,{method:'POST',body:{state:'CANCELADO'}}),'Recorrido cancelado.').then(saved=>{if(saved)setCancelTrip(null);})}>{busy?'Guardando…':'Confirmar cancelación'}</button></div></Dialog>}
    </section>
  );
}
