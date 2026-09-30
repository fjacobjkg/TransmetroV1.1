import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client';
import { fetchApiHealth, type ApiHealth } from '../../api/health';
import { useAuth } from '../../hooks/AuthContext';
import { ModuleWorkbench } from '../../components/ModuleWorkbench';
import { AppLayout } from '../../layout/AppLayout';
import { DashboardHome, type Overview } from './DashboardHome';
import { panelsByRole } from './navigation';
export function DashboardPage() {
  const {user}=useAuth(),location=useLocation(),navigate=useNavigate();
  const [health,setHealth]=useState<ApiHealth|null>(null),[healthError,setHealthError]=useState(false),[overview,setOverview]=useState<Overview>(null);
  const panels=user?panelsByRole[user.role]:[];
  const section=location.pathname.split('/')[2]??'home';
  const active=panels.find(panel=>panel.id===section);
  useEffect(()=>{let live=true;fetchApiHealth().then(value=>{if(live)setHealth(value);}).catch(()=>{if(live)setHealthError(true);});if(user?.role!=='OPERADOR_ESTACION')apiRequest<Overview>('/api/reports/overview').then(value=>{if(live)setOverview(value);}).catch(()=>{});return()=>{live=false;};},[user,section]);
  if(!user)return null;
  if(!active)return <Navigate to="/dashboard" replace/>;
  const onNavigate=(id:string)=>navigate(id==='home'?'/dashboard':`/dashboard/${id}`);
  return <AppLayout panels={panels} activePanel={active} serviceAvailable={health?.status==='ok'} healthError={healthError} onNavigate={onNavigate}>{active.id==='home'?<DashboardHome user={user} overview={overview} panels={panels} onNavigate={onNavigate} serviceAvailable={health?.status==='ok'} healthError={healthError}/>:<ModuleWorkbench key={active.id} section={active.section??active.id}/>}</AppLayout>;
}
