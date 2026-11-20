import test from 'node:test';
import assert from 'node:assert/strict';
import {datosVacios,registrosFicha,gruposSeccion,claveGrupo,detallesEncabezado,erroresEncabezado} from '../modelo.js';
import {crearFormulario,agregarMuestra} from '../formularios.js';
import {obtenerControl} from '../catalogo.js';
import {seguridadNueva} from '../seguridad.js';
import {documentoFicha,documentoGrupo} from '../exportadores.js';
import {revisarFicha,revisarDocumento,pintarRevision,nombreInforme} from '../revision.js';

const control=obtenerControl('RN:507:40762');
function guardar(datos,f){for(const {tabla,registro} of registrosFicha(f)){const k=datos[tabla].findIndex(x=>x.id===registro.id);if(k<0)datos[tabla].push(registro);else datos[tabla][k]=registro;}}
function completar(f,codigo='UM-01'){
  Object.assign(f.u,{codigo,longitud:'30',ancho:'5,58',progresivaInicio:'0',progresivaFin:'7,91'});f.i.inspector='Inspector de prueba';
  for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
  f.i.seguridadVial={...seguridadNueva(),erosionNivel:'muy_malo',erosion:'35',estabilidad:'muy_malo',estabilidadCm:'40',vegetacion:'muy_malo',vegetacionNota:'0',senalamiento:'muy_malo',senalamientoNota:'0'};
  return f;
}
function escenario(n=1){
  const datos=datosVacios(),a=completar(crearFormulario(datos,control,'2026-11-17'));guardar(datos,a);
  for(let i=1;i<n;i++)guardar(datos,completar(agregarMuestra(datos,claveGrupo(a)),'UM-0'+(i+1)));
  const grupo=gruposSeccion(datos,{incluirNoSeleccionadas:true})[0];
  return {datos,grupo,f:grupo.fichas[0],doc:()=>documentoFicha(grupo.fichas[0],grupo)};
}

test('Revisión: las notas válidas iguales a cero cuentan como completas y no se modifica la ficha',()=>{
  const {f,doc}=escenario(),antes=JSON.stringify(f);
  assert.equal(revisarFicha(f).completa,true);assert.equal(revisarDocumento(doc()).borrador,false);
  assert.equal(nombreInforme('RN_507_UM-01',doc()),'RN_507_UM-01');assert.equal(JSON.stringify(f),antes);
});
test('Revisión de seguridad: dirige a selección, medida o nota según lo que realmente falta',()=>{
  const {f}=escenario(),s=f.i.seguridadVial;
  s.estabilidad='';assert.equal(revisarFicha(f).pendientes[0].selector,'#sv-estabilidad');
  s.estabilidad='bueno';s.estabilidadCm='';assert.equal(revisarFicha(f).pendientes[0].selector,'#sv-estabilidadCm');
  s.estabilidadCm='6';const p=revisarFicha(f).pendientes[0];assert.equal(p.selector,'#sv-estabilidadCm');assert.match(p.mensaje,/fuera del rango/);assert.equal(s.estabilidadCm,'6');
  s.estabilidad='no_existe';assert.equal(revisarFicha(f).pendientes[0].selector,'#sv-estabilidad');
});
test('Las notas manuales vacías se identifican con su campo, sin rellenarlas automáticamente',()=>{
  const {f}=escenario();f.i.seguridadVial.vegetacionNota='';f.i.seguridadVial.senalamientoNota='';
  const p=revisarFicha(f).pendientes;assert.deepEqual(p.map(x=>x.selector),['#sv-vegetacionNota','#sv-senalamientoNota']);
  assert.equal(f.i.seguridadVial.vegetacionNota,'');assert.equal(f.i.seguridadVial.senalamientoNota,'');
});
test('Desnivel pendiente dirige directamente a centímetros; una nota fuera del rango dirige al valor escrito',()=>{
  const {f}=escenario();f.i.seguridadVial.erosion='';f.i.seguridadVial.erosionNivel='';
  assert.equal(revisarFicha(f).pendientes[0].selector,'#sv-erosion');
  f.i.seguridadVial.erosion='20';f.i.seguridadVial.vegetacion='muy_bueno';f.i.seguridadVial.vegetacionNota='90';
  const p=revisarFicha(f).pendientes;assert.equal(p.length,1);assert.equal(p[0].selector,'#sv-vegetacionNota');assert.match(p[0].mensaje,/95 y 100/);
});
test('Encabezado: conserva los errores anteriores y vincula cada uno al campo correspondiente',()=>{
  const {f}=escenario();f.u.longitud='';f.u.progresivaFin='-1';
  const p=detallesEncabezado(f);assert.deepEqual(p.map(x=>x.mensaje),erroresEncabezado(f));assert.deepEqual(p.map(x=>x.selector),['#u-longitud','#u-progresivaFin']);
  assert.equal(revisarFicha(f).pendientes.filter(x=>x.mensaje.includes('área válida')).length,0);
});
test('Deterioros: agrupa los mensajes y dirige a la evaluación o cantidad incorrecta',()=>{
  const {f}=escenario();f.i.deterioros['81'].estado='pendiente';assert.equal(revisarFicha(f).pendientes[0].selector,'#dano-81');
  f.i.deterioros['81'].estado='con_deterioro';f.i.deterioros['81'].niveles.M.total='-2';
  const r=revisarFicha(f);assert.equal(r.pendientes.length,1);assert.equal(r.pendientes[0].selector,'#cantidad-81-M');assert.equal(f.i.deterioros['81'].niveles.M.total,'-2');
});
test('La vista previa considera sólo su sección: seguridad completa no depende de deterioros pendientes',()=>{
  const {f,doc}=escenario();f.i.deterioros['81'].estado='pendiente';
  assert.equal(revisarDocumento(doc(),{secciones:['seguridad']}).borrador,false);
  assert.equal(revisarDocumento(doc(),{secciones:['urci']}).borrador,true);
  assert.equal(revisarDocumento(doc()).borrador,true);
  f.i.deterioros['81'].estado='sin_deterioro';f.i.seguridadVial.senalamientoNota='';
  assert.equal(revisarDocumento(doc(),{secciones:['urci']}).borrador,false);
  assert.match(nombreInforme('RN_507',doc(),{secciones:['seguridad']}),/_Borrador$/);
});
test('Una segunda muestra pendiente marca el informe completo y el Excel como borradores',()=>{
  const {grupo,doc}=escenario(2);grupo.fichas[1].i.seguridadVial.vegetacionNota='';
  assert.equal(revisarDocumento(doc()).borrador,true);assert.equal(revisarDocumento(doc(),{formato:'xlsx'}).borrador,true);
  assert.ok(revisarDocumento(doc()).pendientes.some(p=>p.unidadId===grupo.fichas[1].u.id));
});
test('Los códigos duplicados se revisan dentro de cada formulario, sin mezclar formularios independientes',()=>{
  const {grupo}=escenario(2);grupo.fichas[1].u.codigo=grupo.fichas[0].u.codigo;
  assert.ok(revisarDocumento(documentoGrupo(grupo)).pendientes.some(p=>p.selector==='#u-codigo'));
  const a=escenario(),b=escenario();const lote={bloques:[documentoGrupo(a.grupo),documentoGrupo(b.grupo)]};
  assert.equal(revisarDocumento(lote,{formato:'xlsx'}).borrador,false);
  b.grupo.fichas[0].i.seguridadVial.senalamientoNota='';assert.equal(revisarDocumento({bloques:[documentoGrupo(a.grupo),documentoGrupo(b.grupo)]},{formato:'xlsx'}).borrador,true);
});
test('Las muestras eliminadas no producen falsos pendientes ni duplicados en las descargas',()=>{
  const {doc,f}=escenario();const d=doc(),eliminada=structuredClone(f);eliminada.u.id='eliminada';eliminada.u.eliminadaEn='2026-11-17';eliminada.i.seguridadVial.senalamientoNota='';
  d.muestras.push(eliminada);d.fichas.push(eliminada);assert.equal(revisarDocumento(d,{formato:'xlsx'}).borrador,false);
});
test('El resumen PDF respeta la selección; el Excel también revisa las otras muestras que contiene',()=>{
  const {datos,grupo}=escenario(2),b=grupo.fichas[1];b.u.seleccion='no_seleccionada';b.i.seguridadVial.senalamientoNota='';guardar(datos,b);
  const actual=gruposSeccion(datos,{incluirNoSeleccionadas:true})[0],d=documentoGrupo(actual);
  assert.equal(revisarDocumento(d,{formato:'pdf',secciones:['resumen']}).borrador,false);
  assert.equal(revisarDocumento(d,{formato:'xlsx'}).borrador,true);
});
test('La consulta parcial de curvas y Eficiencia conservan sus nombres; el sufijo no se duplica',()=>{
  const {f,doc}=escenario();f.i.deterioros['81'].estado='pendiente';
  assert.equal(nombreInforme('Consulta',doc(),{secciones:['graficas']}),'Consulta');
  assert.equal(nombreInforme('Proyecto',{tipo:'eficiencia'}),'Proyecto');
  assert.equal(nombreInforme('RN_Borrador',doc()),'RN_Borrador');
  assert.equal(nombreInforme('RN 507 / muestra',doc()),'RN_507___muestra_Borrador');
});
test('La revisión plegable escapa texto y respeta el modo de solo lectura',()=>{
  const html=pintarRevision({completa:false,pendientes:[{titulo:'<img>',mensaje:'<script>alert(1)</script>',selector:'#inspector'}]},{soloLectura:true});
  assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.match(html,/data-revisar-dato="\#inspector"/);assert.match(html,/disabled/);
  assert.match(pintarRevision({completa:true,pendientes:[]}),/todos sus datos completos/);
});
