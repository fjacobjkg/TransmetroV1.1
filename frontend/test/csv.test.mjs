import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {encodeCsv} from '../src/lib/csv.ts';
describe('Exportación CSV',()=>{
  it('protege fórmulas y conserva comillas, comas y saltos de línea',()=>{const csv=encodeCsv(['Estación','Nota'],[['=1+1','Central, "Norte"\nAcceso']]);assert.ok(csv.includes('"\'=1+1"'));assert.ok(csv.includes('"Central, ""Norte""\nAcceso"'));assert.ok(csv.startsWith('\uFEFF'));});
  it('preserva números y celdas vacías',()=>{assert.ok(encodeCsv(['Total','Valor'],[[150,null]]).includes('"150",""'));});
});
