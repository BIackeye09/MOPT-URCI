import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatearEstacion, estacionEnMetros } from '../estaciones.js';
import { calcularSeguridad, calcularEficacia, clasificarSeguridad, clasificarTransitabilidad, ESTABILIDAD, VEGETACION, SENALAMIENTO } from '../seguridad.js';
import { datosVacios, crearFicha, encabezadoFicha, erroresEncabezado, resultadosFicha, gruposSeccion, registrosFicha, buscarFicha, areaMuestra } from '../modelo.js';
import { obtenerControl } from '../catalogo.js';
import { documentoFicha } from '../exportadores.js';
import { camposFicha } from '../plantillas-oficiales.js';

const control=obtenerControl('RN:507:40762');
function datosConFicha() {
  const datos=datosVacios(),f=crearFicha(datos,control,'2026-11-09');
  f.u.codigo='UM-01';f.u.longitud='30';f.u.ancho='5,58';f.u.areaM2=f.u.areaManual='167.4';f.u.progresivaInicio='0,0';f.u.progresivaFin='7,91';
  f.u.superficieMuestra='no_pavimentada';f.i.inspector='Inspección de prueba';
  for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
  for(const [c,s,v] of [['81','B','30.5'],['83','M','83.7'],['87','M','48.8']]){
    f.i.deterioros[c].estado='con_deterioro';f.i.deterioros[c].niveles[s].total=v;
  }
  f.i.deterioros['84'].estado='con_deterioro';f.i.deterioros['84'].polvo='M';
  f.i.seguridadVial={erosion:'2',estabilidad:'bueno',vegetacion:'regular',senalamiento:'bueno'};
  incorporar(datos,f);return {datos,f};
}
function incorporar(datos,f) {
  for(const {tabla,registro} of registrosFicha(f)) {
    const n=datos[tabla].findIndex(r=>r.id===registro.id);if(n<0)datos[tabla].push(registro);else datos[tabla][n]=registro;
  }
}
test('estaciones: ejemplos solicitados y formatos previos sin perder ceros',()=>{
  for(const [entrada,esperado] of [['0,0','0 + 000'],['7,91','7 + 910'],['7.91','7 + 910'],['0','0 + 000'],['12,005','12 + 005'],['7+910','7 + 910'],['7 + 009','7 + 009'],['7,9996','8 + 000'],['0007,01','7 + 010']])assert.equal(formatearEstacion(entrada),esperado,entrada);
});
test('estaciones: vacíos, negativos, notación científica y valores inseguros no se exportan como cero',()=>{
  for(const valor of ['',null,undefined,'-1','NaN','1e3','7,9,1','1+1000','9007199254740991000']){
    assert.equal(estacionEnMetros(valor),null,String(valor));assert.equal(formatearEstacion(valor),'');
  }
});
test('seguridad: límites exactos de erosión de la plantilla',()=>{
  const base={estabilidad:'muy_bueno',vegetacion:'muy_bueno',senalamiento:'muy_bueno'};
  for(const [cm,p] of [['0',100],['2',100],['2.01',85],['4.99',85],['5',70],['14.99',70],['15',50],['24.99',50],['25',25]])assert.equal(calcularSeguridad({...base,erosion:cm}).erosion,p);
});
test('seguridad: se usa el menor de los tres márgenes, con pesos 60/40',()=>{
  const r=calcularSeguridad({erosion:'2',estabilidad:'bueno',vegetacion:'regular',senalamiento:'bueno'});
  assert.equal(r.margenes,70);assert.equal(r.senalamiento,75);assert.equal(r.indice,72);assert.equal(r.calificacion,'Bueno');
});
test('seguridad: faltantes y medidas inválidas mantienen el resultado pendiente',()=>{
  for(const erosion of ['',null,'-1','texto']) {
    const r=calcularSeguridad({erosion,estabilidad:'bueno',vegetacion:'regular',senalamiento:'bueno'});assert.equal(r.indice,null);assert.equal(r.completo,false);
  }
  assert.equal(calcularSeguridad({erosion:'0',estabilidad:'muy_bueno',vegetacion:'muy_bueno'}).indice,null);
});
test('se comprueban las 125 combinaciones de criterios y sus puntuaciones de plantilla',()=>{
  for(const a of ESTABILIDAD)for(const b of VEGETACION)for(const c of SENALAMIENTO){
    const r=calcularSeguridad({erosion:'0',estabilidad:a.id,vegetacion:b.id,senalamiento:c.id});
    assert.equal(r.indice,.6*Math.min(100,a.puntaje,b.puntaje)+.4*c.puntaje);
  }
});
test('clasificaciones, eficacia y límites distinguen null de un URCI válido igual a cero',()=>{
  assert.equal(clasificarTransitabilidad(0),'Fallado');assert.equal(clasificarTransitabilidad(25),'Pobre');
  assert.equal(clasificarTransitabilidad(55),'Bueno');assert.equal(clasificarTransitabilidad(null),null);
  for(const [v,c] of [[85,'Muy bueno'],[70,'Bueno'],[55,'Regular'],[40,'Malo'],[39.99,'Muy malo']])assert.equal(clasificarSeguridad(v),c);
  assert.equal(calcularEficacia(59,72),64.2);assert.equal(calcularEficacia(null,72),null);assert.equal(calcularEficacia(0,0),0);
});
test('seleccionar un camino completa el encabezado sin inventar las mediciones de la muestra',()=>{
  const f=crearFicha(datosVacios(),control,'2026-11-09'),h=encabezadoFicha(f);
  assert.equal(h.ruta,'RN 507');assert.equal(h.seccion,'40762');assert.equal(h.provincia,'Heredia');assert.equal(h.codigoCamino,'4-0762-00');
  assert.equal(h.fecha,'2026-11-09');assert.equal(h.unidad,'');assert.equal(h.area,'');assert.equal(h.inspector,'');assert.equal(h.inicio,'');assert.equal(h.fin,'');
  assert.equal(f.s.superficie,'no_pavimentada');assert.equal(resultadosFicha(f).urci.urci,null);
});
test('encabezado único: estaciones normalizadas y resultado de control 59',()=>{
  const {f}=datosConFicha(),h=encabezadoFicha(f);
  assert.equal(h.inicio,'0 + 000');assert.equal(h.fin,'7 + 910');assert.deepEqual(erroresEncabezado(f),[]);
  const r=resultadosFicha(f);assert.equal(r.urci.urci,59);assert.equal(r.seguridad.indice,72);assert.equal(r.eficacia,64.2);
  f.u.progresivaInicio='8';assert.ok(erroresEncabezado(f).some(e=>e.includes('igual o mayor')));
});
test('resumen automático comparte encabezados, mantiene jornadas separadas y espera las muestras pendientes',()=>{
  const {datos,f}=datosConFicha();
  let g=gruposSeccion(datos);assert.equal(g.length,1);assert.equal(g[0].tr,59);assert.equal(g[0].sv,72);
  const segunda=crearFicha(datos,control,'2026-11-09');segunda.u.codigo='UM-02';incorporar(datos,segunda);
  g=gruposSeccion(datos);assert.equal(g.length,1);assert.equal(g[0].total,2);assert.equal(g[0].tr,null);assert.equal(g[0].sv,null);
  const otra=crearFicha(datos,control,'2026-11-08');incorporar(datos,otra);assert.equal(gruposSeccion(datos).length,2);
  const copia=buscarFicha(datos,f.u.id);assert.equal(copia.i.inspector,'Inspección de prueba');
});
test('plantilla: mismos encabezados y estaciones; inspector se conserva como dato literal',()=>{
  const {datos,f}=datosConFicha();f.i.inspector='=NO_EJECUTAR("prueba")';incorporar(datos,f);
  const c=camposFicha(f);assert.equal(c.I10,'0 + 000');assert.equal(c.AN6,'0 + 000');assert.equal(c.I11,'7 + 910');assert.equal(c.AN7,'7 + 910');assert.equal(c.I13,f.i.inspector);assert.equal(c.AQ7,f.i.inspector);
});
test('la procedencia de las reglas incluye las celdas y fórmulas originales',async()=>{
  const p=JSON.parse(await readFile(new URL('./seguridad_fuente.json',import.meta.url),'utf8'));
  assert.ok(p.formulas['F_UM-01!AQ50'].includes('0.6*MIN'));
  assert.ok(p.eficacia.formula.includes('0.6*H19+0.4*H35'));
});

test('las mediciones individuales y el croquis de versiones anteriores se conservan al guardar',()=>{
  const {f}=datosConFicha();
  delete f.i.seguridadVial;
  f.i.fechaURCI='2026-10-10';f.u.modoArea='automatica';f.u.longitud='30';f.u.ancho='5.58';
  f.i.deterioros['81'].niveles.B={modo:'detalles',unidad:'m',total:'9999',registros:['10','20.5']};
  f.i.croquis=[{tipo:'lapiz',puntos:[[.1,.2],[.8,.7]]}];
  const originales=structuredClone(f.i.deterioros),croquis=structuredClone(f.i.croquis);
  assert.equal(resultadosFicha(f).urci.urci,59);assert.equal(resultadosFicha(f).seguridad.indice,null);
  const registros=registrosFicha(f),i=registros.find(r=>r.tabla==='inspecciones').registro,u=registros.find(r=>r.tabla==='unidades').registro;
  assert.deepEqual(i.deterioros,originales);assert.deepEqual(i.croquis,croquis);
  assert.equal(i.fechaURCI,'2026-10-10');assert.equal(u.modoArea,'automatica');assert.equal(u.longitud,'30');assert.equal(u.ancho,'5.58');
});

test('Excel conserva una medida inválida como texto y no le asigna puntuación de buen estado',()=>{
  const {datos,f}=datosConFicha();f.i.seguridadVial.erosion='-1';incorporar(datos,f);
  const doc=documentoFicha(f,gruposSeccion(datos)[0]);
  assert.equal(doc.seguridad[0].filas[0][1],'-1');assert.equal(doc.seguridad[0].filas[0][2],'');
  const sv=camposFicha(f);assert.equal(sv.AM11,'-1');assert.equal(sv.AR11,null);assert.equal(sv.AS11,'');
});
test('largo × ancho es la única fuente del área para resultados y exportaciones',()=>{
  const {f}=datosConFicha();f.u.areaM2='999';f.u.areaManual='555';
  assert.equal(areaMuestra(f.u),167.4);assert.equal(encabezadoFicha(f).area,'167.4');assert.equal(resultadosFicha(f).urci.urci,59);
  assert.equal(camposFicha(f).J12,30);assert.equal(camposFicha(f).N12,5.58);
  f.u.ancho='11,16';const r=resultadosFicha(f).urci;
  assert.equal(areaMuestra(f.u),334.8);assert.ok(Math.abs(r.filas.find(v=>v.codigo==='83'&&v.severidad==='M').densidad-25)<1e-12);
});
test('sin ambas medidas válidas no se reutiliza un área antigua ni se obtiene URCI',()=>{
  const {f}=datosConFicha();
  for(const valor of ['',0,'-1','texto','1e3']){
    f.u.ancho=valor;assert.equal(areaMuestra(f.u),null);assert.equal(resultadosFicha(f).urci.urci,null);assert.equal(camposFicha(f).A50,null);assert.ok(erroresEncabezado(f).some(t=>t.includes('ancho')));
  }
  f.u.longitud='9'.repeat(200);f.u.ancho='9'.repeat(200);assert.equal(areaMuestra(f.u),null);assert.ok(erroresEncabezado(f).some(t=>t.includes('finito')));
});
test('consultar una ficha antigua no modifica sus medidas ni sus observaciones',()=>{
  const {f}=datosConFicha();f.u.areaManual='167,4';delete f.u.longitud;delete f.u.ancho;
  const anterior=structuredClone(f);assert.equal(resultadosFicha(f).urci.urci,null);assert.equal(encabezadoFicha(f).area,'');assert.equal(camposFicha(f).T27,'');assert.deepEqual(f,anterior);
});
