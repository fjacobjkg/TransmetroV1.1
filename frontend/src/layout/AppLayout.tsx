import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import { roleLabel, type Panel } from '../pages/administrative/navigation';
type Props={panels:Panel[];activePanel:Panel;serviceAvailable:boolean;healthError:boolean;onNavigate:(id:string)=>void;children:ReactNode};
export function AppLayout({panels,activePanel,serviceAvailable,healthError,children}:Props) {
  const {user,logout}=useAuth(),navigate=useNavigate();
  const [open,setOpen]=useState(false),[loggingOut,setLoggingOut]=useState(false);
  useEffect(()=>{if(!open)return;const listener=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};document.addEventListener('keydown',listener);return()=>document.removeEventListener('keydown',listener);},[open]);
  async function exit(){setLoggingOut(true);try{await logout();}catch{}finally{navigate('/login',{replace:true});setLoggingOut(false);}}
  if(!user)return null;
  return <div className="app-shell"><a className="skip-link" href="#main-content">Saltar al contenido</a>{open&&<button className="sidebar-overlay" aria-label="Cerrar navegación" onClick={()=>setOpen(false)}/>}
    <aside className={`sidebar ${open?'sidebar-open':''}`} aria-label="Navegación principal"><div className="sidebar-brand"><BrandLogo/><span className="version-chip">V1</span></div><div className="workspace-caption">CENTRO DE OPERACIONES</div><nav>{panels.map(panel=><NavLink end={panel.id==='home'} key={panel.id} to={panel.id==='home'?'/dashboard':`/dashboard/${panel.id}`} className={({isActive})=>`nav-item ${isActive?'nav-active':''}`} onClick={()=>setOpen(false)}><span className="nav-icon" aria-hidden="true">{panel.icon}</span>{panel.title}</NavLink>)}</nav><div className="sidebar-foot"><div className="system-status"><span className={`status-dot ${serviceAvailable?'online':''}`}/>{serviceAvailable?'API y base de datos conectadas':healthError?'Sin conexión con la API':'Verificando servicio'}</div><div className="session-card"><span className="avatar">{user.name.slice(0,1)}</span><div><small>SESIÓN ACTUAL</small><strong>{user.name}</strong><span>{roleLabel(user.role)}</span></div></div><button className="logout-button" disabled={loggingOut} onClick={()=>void exit()}>{loggingOut?'Cerrando sesión…':'↪ Cerrar sesión'}</button></div></aside>
    <div className="main-shell"><header className="action-bar"><button className="mobile-menu-button button quiet" aria-label="Abrir navegación" aria-expanded={open} onClick={()=>setOpen(!open)}>☰</button><div className="breadcrumb"><span>Transmetro</span><span>/</span><strong>{activePanel.title}</strong></div><div className="action-bar-right"><span className="role-chip">{roleLabel(user.role)}</span><span className="today-date">{new Date().toLocaleDateString('es-GT',{day:'numeric',month:'long'})}</span></div></header><main id="main-content" className="content-area">{children}</main><footer className="app-footer">Transmetro · Control interno<span>Guatemala · Datos centralizados</span></footer></div>
  </div>;
}
