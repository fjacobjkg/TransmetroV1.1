import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {prisma} from '../src/lib/prisma.js';
import {env} from '../src/config/env.js';
// Los identificadores vienen exclusivamente de la migración local, no del usuario.
async function run() {
  const migration=readFileSync('prisma/migrations/20260930000000_original_schema/migration.sql','utf8');
  const tables=[...migration.matchAll(/CREATE TABLE `?([a-z_]+)`? \(/g)].map(match=>match[1]!);
  const literal=(value:unknown):string=>{
    if(value===null)return 'NULL';
    if(value instanceof Date)return `'${value.toISOString().slice(0,19).replace('T',' ')}'`;
    if(typeof value==='boolean')return value?'1':'0';
    if(typeof value==='bigint'||typeof value==='number')return String(value);
    return `CONVERT(0x${Buffer.from(String(value),'utf8').toString('hex')} USING utf8mb4)`;
  };
  let sql=`-- Datos locales de demostración exportados el ${new Date().toISOString()}\n-- Incluye hashes de las cuentas de prueba; no publicar este archivo.\n-- Ejecutar únicamente en una base nueva con las tablas ya creadas.\nUSE \`${env.DATABASE_NAME}\`;\nSET NAMES utf8mb4;\nSET time_zone = '+00:00';\nSET FOREIGN_KEY_CHECKS = 0;\nSTART TRANSACTION;\n`;
  for(const table of tables){const rows=await prisma.$queryRawUnsafe<Record<string,unknown>[]>(`SELECT * FROM \`${table}\``);if(!rows.length)continue;const columns=Object.keys(rows[0]!);sql+=`\nINSERT INTO \`${table}\` (${columns.map(column=>'`'+column+'`').join(', ')}) VALUES\n`+rows.map(row=>'('+columns.map(column=>literal(row[column])).join(', ')+')').join(',\n')+';\n';}
  sql+='\nCOMMIT;\nSET FOREIGN_KEY_CHECKS = 1;\n';mkdirSync('sql',{recursive:true});writeFileSync('sql/02_datos_demo.sql',sql);console.log(`Exportación local creada: ${tables.length} tablas. No se imprimieron credenciales.`);
}
run().catch(error=>{console.error(error instanceof Error?error.message:'Error de exportación.');process.exitCode=1;}).finally(()=>prisma.$disconnect());
