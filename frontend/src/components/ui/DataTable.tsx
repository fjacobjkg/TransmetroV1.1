import { useEffect, useMemo, useState, type ReactNode } from 'react';

export type Row = Record<string, unknown>;
export type Column = { key: string; label: string; render?: (row: Row) => ReactNode };
export function textValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Activo' : 'Inactivo';
  if (Array.isArray(value)) return value.map(textValue).join(' · ') || 'Sin asignación';
  if (typeof value === 'object') {
    const row = value as Row;
    if (row.estacion) return textValue(row.estacion);
    if (row.bus) return textValue(row.bus);
    if (row.linea) return textValue(row.linea);
    if (row.parqueo) return textValue(row.parqueo);
    if (row.guardia) return textValue(row.guardia);
    return String(row.nombre ?? row.name ?? row.codigo ?? row.code ?? '');
  }
  return String(value);
}
export function Badge({ value }: { value: unknown }) {
  const good = value === true || value === 'FINALIZADO';
  return <span className={`badge ${good ? 'badge-good' : value === 'EN_CURSO' ? 'badge-blue' : 'badge-muted'}`}>{textValue(value).replaceAll('_',' ')}</span>;
}
export function DataTable({ rows, columns, actions, loading = false }: { rows: Row[]; columns: Column[]; actions?: (row: Row) => ReactNode; loading?: boolean }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{key:string;desc:boolean}|null>(null);
  const filtered = useMemo(() => {
    const matched = rows.filter(row => columns.map(col => textValue(row[col.key])).join(' ').toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
    return sort ? matched.sort((a,b) => textValue(a[sort.key]).localeCompare(textValue(b[sort.key]),'es',{numeric:true}) * (sort.desc ? -1 : 1)) : matched;
  },[rows,columns,query,sort]);
  useEffect(() => setPage(1), [query, rows]);
  const pages = Math.max(1,Math.ceil(filtered.length/10));
  return <div className="data-table">
    <div className="table-tools"><label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Buscar en los registros cargados" placeholder="Buscar en esta tabla…" value={query} onChange={e=>setQuery(e.target.value)} /></label><span className="muted">{filtered.length} registros cargados</span></div>
    <div className="table-scroll" aria-busy={loading}><table><thead><tr>{columns.map(col=><th key={col.key}><button type="button" onClick={()=>setSort({key:col.key,desc:sort?.key===col.key&&!sort.desc})}>{col.label} {sort?.key===col.key?(sort.desc?'↓':'↑'):'↕'}</button></th>)}{actions&&<th>Acciones</th>}</tr></thead><tbody>{filtered.slice((page-1)*10,page*10).map((row,i)=><tr key={String(row.id ?? Object.entries(row).find(([key])=>key.startsWith('id_'))?.[1] ?? i)}>{columns.map(col=><td key={col.key}>{col.render ? col.render(row) : textValue(row[col.key])}</td>)}{actions&&<td><div className="row-actions">{actions(row)}</div></td>}</tr>)}</tbody></table>{!filtered.length&&<div className="empty-state"><strong>{loading?'Cargando registros…':'No hay resultados'}</strong><p>{query?'Prueba con otro nombre o código.':'Los registros aparecerán aquí después de crearlos.'}</p></div>}</div>
    <div className="table-pagination"><span>Página {Math.min(page,pages)} de {pages}</span><div><button className="button quiet" disabled={page<=1} onClick={()=>setPage(page-1)}>Anterior</button><button className="button quiet" disabled={page>=pages} onClick={()=>setPage(page+1)}>Siguiente</button></div></div>
  </div>;
}
