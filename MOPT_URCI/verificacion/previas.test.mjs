import test from 'node:test';
import assert from 'node:assert/strict';
import { crearFicha, datosVacios, registrosFicha, gruposSeccion, resultadosFicha } from '../modelo.js';
import { obtenerControl } from '../catalogo.js';
import { calcularDesdeDeducciones } from '../motor-urci.js';
import { filasLectura, cuentaEnQ, graficaLectura, tablaCalificacion, pintarMetodo } from '../lectura-urci.js';
import { clasificarTransitabilidad } from '../seguridad.js';
import { documentoFicha, documentoGrupo } from '../exportadores.js';
import { seccionesPrevia } from '../vista-previa.js';

function muestra() {
  const datos=datosVacios(),f=crearFicha(datos,obtenerControl('RN:507:40762'),'2026-11-09');
  f.u.longitud='30';f.u.ancho='5,58';f.u.areaM2='167,4';
  for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
  for(const [codigo,severidad,total] of [['81','B','30,5'],['83','M','83,7'],['87','M','48,8']]){
    const d=f.i.deterioros[codigo];d.estado='con_deterioro';d.niveles[severidad].total=total;
  }
  f.i.deterioros['84'].estado='con_deterioro';f.i.deterioros['84'].polvo='M';
  return {f,datos};
}
function grupoDe(datos,f) {
  for(const {tabla,registro} of registrosFicha(f))datos[tabla].push(registro);
  return gruposSeccion(datos)[0];
}
test('densidades métricas del manual: metros, áreas y agregado suelto por severidad',()=>{
  const {f}=muestra(),r=resultadosFicha(f).urci,filas=filasLectura(f.i,f.u,r);
  for(const [c,s,d] of [['81','B',30.5/167.4*100],['83','M',50],['87','M',48.8/167.4*100]]){
    const fila=filas.find(v=>v.codigo===c&&v.severidad===s);
    assert.ok(Math.abs(fila.densidad-d)<1e-10);assert.match(fila.formula,/÷ 167,4 m² × 100 =/);
  }
  assert.equal(r.urci,59);assert.equal(r.q,3);
});
test('q corresponde a valores individuales mayores que cinco, incluidas dos severidades del mismo daño',()=>{
  const {f}=muestra();for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
  const d=f.i.deterioros['81'];d.estado='con_deterioro';d.niveles.B.total='30';d.niveles.M.total='20';
  const r=resultadosFicha(f).urci,filas=filasLectura(f.i,f.u,r);
  assert.equal(r.q,2);assert.equal(filas.filter(v=>v.cuenta).length,2);
  assert.equal(cuentaEnQ(5),false);assert.equal(cuentaEnQ(5.0000000001),true);assert.equal(cuentaEnQ(null),false);
  assert.equal(calcularDesdeDeducciones([5,5.0000000001,4,15]).q,2);
});
test('polvo: valor fijo sin densidad; bajo y medio suman al VDT y solo alto aumenta q',()=>{
  for(const [nivel,vd,q] of [['B',2,0],['M',4,0],['A',15,1]]){
    const {f}=muestra();for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
    f.i.deterioros['84'].estado='con_deterioro';f.i.deterioros['84'].polvo=nivel;
    const r=resultadosFicha(f).urci,fila=filasLectura(f.i,f.u,r).find(v=>v.codigo==='84'&&v.seleccionado);
    assert.equal(r.vdt,vd);assert.equal(r.q,q);assert.equal(fila.densidad,null);assert.equal(fila.deduccion,vd);assert.match(fila.formula,/Sin densidad/);
  }
});
test('tabla de transitabilidad: límites de Listas, cero válido e inválidos',()=>{
  for(const [v,c] of [[100,'Excelente'],[85,'Excelente'],[84.999,'Muy bueno'],[70,'Muy bueno'],[69.999,'Bueno'],[55,'Bueno'],[54.999,'Regular'],[40,'Regular'],[39.999,'Pobre'],[25,'Pobre'],[24.999,'Muy pobre'],[10,'Muy pobre'],[9.999,'Fallado'],[0,'Fallado']])assert.equal(clasificarTransitabilidad(v),c);
  for(const valor of [null,undefined,-1,101,NaN])assert.equal(clasificarTransitabilidad(valor),null);
  assert.match(tablaCalificacion(0),/Fallado · Resultado actual/);assert.doesNotMatch(tablaCalificacion(null),/Resultado actual/);
});
test('las guías muestran densidad y VD del motor, y VDT/q para URCI; no inventan puntos fuera de rango',()=>{
  const {f}=muestra(),r=resultadosFicha(f).urci;
  assert.match(graficaLectura('81',r),/data-guia="Baja: densidad 18,22/);
  assert.match(graficaLectura('urci',r),/q 3 · URCI/);
  assert.match(graficaLectura('84',r),/sin cálculo de densidad/);
  f.i.deterioros['81'].niveles.B.total='5000';
  const fuera=resultadosFicha(f).urci;
  assert.doesNotMatch(graficaLectura('81',fuera),/data-guia=/);
  assert.doesNotMatch(graficaLectura('81',fuera),/NaN|Infinity/);
});
test('vista previa permite revisar borradores con encabezados vacíos y conserva los puntos 15 a 18',()=>{
  const {f,datos}=muestra();f.u.ancho='';
  const doc=documentoFicha(f,grupoDe(datos,f));
  assert.equal(doc.encabezado.unidad,'');assert.equal(doc.encabezado.inicio,'');
  assert.deepEqual(doc.urci[2].filas.map(f=>f[0].slice(0,3)),['15.','16.','17.','18.']);
  for(const s of ['urci','seguridad','resumen'])assert.deepEqual(seccionesPrevia(doc,s),[s]);
});
test('resumen de sección solo admite su propia vista previa; rechaza nombres no disponibles',()=>{
  const {f,datos}=muestra(),doc=documentoGrupo(grupoDe(datos,f));
  assert.deepEqual(seccionesPrevia(doc,'resumen'),['resumen']);
  assert.throws(()=>seccionesPrevia(doc,'urci'));assert.throws(()=>seccionesPrevia(doc,'otro'));
});
test('la tabla de lectura deja vacías las deducciones sin cantidad y las de valor cero',()=>{
 const {f}=muestra();
 const tabla=()=>pintarMetodo(f.i,f.u,resultadosFicha(f).urci).match(/<table class="tabla lectura-deducciones">[\s\S]*?<\/table>/)[0];
 const fila=(codigo,nivel)=>[...tabla().matchAll(/<tr>[\s\S]*?<\/tr>/g)].map(m=>m[0]).find(s=>s.includes(codigo+' ·')&&s.includes('<td>'+nivel+'</td>'));
 assert.match(fila('81','Media'),/<td>Sin cantidad en esta severidad<\/td><td><\/td><td><\/td>/);
 assert.match(fila('82','Baja'),/<td>Sin deterioro confirmado<\/td><td><\/td><td><\/td>/);
 assert.match(fila('84','Baja'),/<td>No seleccionada<\/td><td><\/td><td><\/td>/);
 f.i.deterioros['81'].niveles.M.total='0,0';assert.match(fila('81','Media'),/<td><\/td><td><\/td>/);
});
