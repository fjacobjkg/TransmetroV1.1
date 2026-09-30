import 'dotenv/config';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {prisma} from '../src/lib/prisma.js';
import {env} from '../src/config/env.js';
async function run() {
  const api=`http://127.0.0.1:${env.PORT}/api`;
  const rows=readFileSync('../docs/CUENTAS_LOCALES.md','utf8').split(/\r?\n/).filter(line=>line.startsWith('|')&&/admin@vetia|operador\.estacion|administrativo/.test(line)).map(line=>line.split('|').slice(1,-1).map(cell=>cell.trim().replaceAll('`','')));
  const health=await fetch(`${api}/health`);assert.equal(health.status,200);assert.equal((await health.json()).database,'connected');
  for(const [,username,password] of rows) {
    const login=await fetch(`${api}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json',Origin:env.CORS_ORIGIN},body:JSON.stringify({username,password})});assert.equal(login.status,200,`Inicio de sesión ${username}`);
    const cookie=login.headers.getSetCookie().map(value=>value.split(';')[0]).join(';');assert.ok(cookie.includes('transmetro_v1_session'));
    const get=async(path:string)=>fetch(`${api}${path}`,{headers:{Cookie:cookie}});
    const me=await get('/auth/me');assert.equal(me.status,200);const account=await me.json();const role=account.user?.role??account.role;
    const users=await get('/users?pageSize=100');assert.equal(users.status,role==='ADMIN'?200:403);
    const report=await get('/reports/operations');assert.equal(report.status,role==='OPERADOR_ESTACION'?403:200);
    if(role==='OPERADOR_ESTACION'){
      const lines=await get('/operations/lines');assert.equal(lines.status,200);assert.ok((await lines.json()).items.length>0);
      const invalidStation=await get('/access-media/stations/2147483647/media');assert.equal(invalidStation.status,403);
    } else {
      for(const path of ['/transport/municipalities','/transport/lines','/transport/stations','/fleet/buses','/fleet/parkings','/personnel/pilots','/personnel/operators','/security/accesses','/security/guards','/access-media/media','/reports/access-counts'])assert.equal((await get(path)).status,200,path);
    }
    const expired=await get('/access-media/access-counts?from=2026-09-29&to=2026-09-01');assert.equal(expired.status,400);
    const logout=await fetch(`${api}/auth/logout`,{method:'POST',headers:{Cookie:cookie,Origin:env.CORS_ORIGIN}});assert.ok([200,204].includes(logout.status));
    console.log(`Inicio, permisos y consultas verificados: ${role}.`);
  }
  const counts=await Promise.all([prisma.linea.count(),prisma.estacion.count(),prisma.bus.count(),prisma.visita.count(),prisma.registro_acceso.count()]);
  console.log(`Datos verificados: líneas=${counts[0]}, estaciones=${counts[1]}, buses=${counts[2]}, visitas=${counts[3]}, conteos=${counts[4]}.`);
}
run().catch(error=>{console.error(error instanceof Error?error.message:'Error de prueba.');process.exitCode=1;}).finally(()=>prisma.$disconnect());
