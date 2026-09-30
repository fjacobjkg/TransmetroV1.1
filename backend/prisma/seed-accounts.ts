import 'dotenv/config';
import {prisma} from '../src/lib/prisma.js';
import {hashPassword} from '../src/lib/password.js';
async function run() {
  for(const [prefix,role] of [['INITIAL_OPERATOR','OPERADOR_ESTACION'],['INITIAL_STAFF','ADMINISTRATIVO']] as const) {
    const name=process.env[`${prefix}_NAME`],username=process.env[`${prefix}_USERNAME`]?.toLowerCase(),password=process.env[`${prefix}_PASSWORD`];
    if(!name||!username||!password)throw Error(`Configura los tres valores ${prefix}_* en backend/.env.`);
    if(password.length<12||!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password))throw Error(`La contraseña de ${prefix} necesita 12 caracteres, mayúscula, minúscula y número.`);
    const existing=await prisma.usuario.findUnique({where:{nombre_usuario:username}});
    if(existing){console.log(`Cuenta ${role} existente; se conserva su contraseña y estado.`);continue;}
    const assignedRole=await prisma.rol.findUniqueOrThrow({where:{nombre:role}});
    await prisma.usuario.create({data:{nombre:name,nombre_usuario:username,password_hash:await hashPassword(password),rol_id:assignedRole.id_rol,activo:true}});
    console.log(`Cuenta de prueba ${role} creada.`);
  }
}
run().catch(error=>{console.error(error instanceof Error?error.message:'No fue posible preparar las cuentas.');process.exitCode=1;}).finally(()=>prisma.$disconnect());
