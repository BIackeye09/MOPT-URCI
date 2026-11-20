import test from 'node:test';
import assert from 'node:assert/strict';
import { crearFormulario, agregarMuestra, corregirRutaFormulario, codigoMuestraRepetido } from '../formularios.js';
import { datosVacios, crearFicha, registrosFicha, gruposSeccion, claveGrupo, buscarFicha, resultadosFicha } from '../modelo.js';
import { obtenerControl, SECCIONES_CATALOGO } from '../catalogo.js';
import { documentoGrupo } from '../exportadores.js';
const control=obtenerControl('RN:507:40762'),fecha='2026-11-10';
function guardar(datos,f){for(const {tabla,registro}of registrosFicha(f)){const k=datos[tabla].findIndex(x=>x.id===registro.id);if(k<0)datos[tabla].push(registro);else datos[tabla][k]=registro;}}
function completar(f,codigo='UM-01'){
 Object.assign(f.u,{codigo,longitud:'30',ancho:'5,58',progresivaInicio:'0,0',progresivaFin:'7,91'});f.i.inspector='Inspector de prueba';
 for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
 f.i.seguridadVial={erosion:'2',estabilidad:'bueno',vegetacion:'regular',senalamiento:'bueno'};
 return f;
}
test('Nuevo formulario crea informes independientes incluso con la misma ruta, sección y fecha',()=>{
 const datos=datosVacios(),a=completar(crearFormulario(datos,control,fecha));guardar(datos,a);
 const b=completar(crearFormulario(datos,control,fecha));guardar(datos,b);
 assert.notEqual(a.u.formularioId,b.u.formularioId);assert.notEqual(claveGrupo(a),claveGrupo(b));assert.equal(a.u.formularioNumero,1);assert.equal(b.u.formularioNumero,2);
 const grupos=gruposSeccion(datos);assert.equal(grupos.length,2);assert.ok(grupos.every(g=>g.total===1));assert.equal(codigoMuestraRepetido(datos,b),false);
 for(const g of grupos)assert.equal(documentoGrupo(g).resumen[0].filas.length,1);
});
test('Agregar muestra conserva el formulario y crea campos y mediciones vacíos con identificadores nuevos',()=>{
 const datos=datosVacios(),a=completar(crearFormulario(datos,control,fecha));a.i.observacionesURCI='Sólo la primera muestra';guardar(datos,a);
 const antes=structuredClone(datos),b=agregarMuestra(datos,claveGrupo(a));
 assert.deepEqual(datos,antes);assert.notEqual(a.u.id,b.u.id);assert.notEqual(a.i.id,b.i.id);
 assert.equal(claveGrupo(a),claveGrupo(b));assert.equal(a.u.formularioNumero,b.u.formularioNumero);assert.equal(b.u.ordenMuestra,2);
 for(const campo of ['codigo','longitud','ancho','progresivaInicio','progresivaFin'])assert.equal(b.u[campo],'');
 assert.equal(b.i.inspector,'');assert.equal(b.i.observacionesURCI,'');assert.equal(Object.hasOwn(b.i,'observacionesSV'),false);assert.equal(resultadosFicha(b).urci.urci,null);
 guardar(datos,b);assert.equal(gruposSeccion(datos)[0].total,2);assert.equal(gruposSeccion(datos)[0].estado,'borrador');
});
test('formularios anteriores conservan sus agrupaciones, códigos e identificadores al agregar otra muestra',()=>{
 const datos=datosVacios(),a=completar(crearFicha(datos,control,fecha));guardar(datos,a);const antes=structuredClone(datos);
 const b=agregarMuestra(datos,claveGrupo(a));assert.equal(b.u.formularioId,undefined);assert.equal(claveGrupo(b),claveGrupo(a));assert.deepEqual(datos,antes);
 guardar(datos,b);assert.equal(gruposSeccion(datos).length,1);assert.equal(gruposSeccion(datos)[0].total,2);
 assert.equal(buscarFicha(datos,a.u.id).i.id,a.i.id);
});
test('corregir ruta conserva mediciones y aplica el cambio a todas las muestras de ese formulario',()=>{
 const datos=datosVacios(),a=completar(crearFormulario(datos,control,fecha));a.i.observacionesURCI='Observación original';a.i.croquis=[{tipo:'lapiz',puntos:[[.1,.2],[.4,.5]]}];guardar(datos,a);
 const b=completar(agregarMuestra(datos,claveGrupo(a)),'UM-02');guardar(datos,b);
 const c=completar(crearFormulario(datos,control,fecha),'OTRO');guardar(datos,c);
 const otroControl=SECCIONES_CATALOGO.find(x=>x.grupoSuperficie==='no_pavimentada'&&x.ruta!=='507'),antes=structuredClone(datos),nuevas=corregirRutaFormulario(datos,claveGrupo(a),otroControl);
 assert.deepEqual(datos,antes);assert.equal(nuevas.length,2);
 for(const f of nuevas){const original=buscarFicha(datos,f.u.id);assert.equal(f.i.id,original.i.id);assert.equal(f.u.formularioId,a.u.formularioId);assert.deepEqual(f.i.deterioros,original.i.deterioros);assert.deepEqual(f.i.croquis,original.i.croquis);assert.equal(f.i.observacionesURCI,original.i.observacionesURCI);assert.equal(f.u.longitud,original.u.longitud);assert.equal(f.s.codigo,otroControl.seccion);guardar(datos,f);}
 assert.equal(gruposSeccion(datos).length,2);assert.equal(gruposSeccion(datos).find(g=>g.fichas.some(f=>f.u.id===a.u.id)).total,2);
 assert.equal(buscarFicha(datos,c.u.id).s.codigo,control.seccion);
});
test('la misma unidad puede usarse en formularios distintos, pero no repetirse dentro de uno',()=>{
 const datos=datosVacios(),a=completar(crearFormulario(datos,control,fecha));guardar(datos,a);
 const b=completar(crearFormulario(datos,control,fecha));guardar(datos,b);assert.equal(codigoMuestraRepetido(datos,b),false);
 const c=completar(agregarMuestra(datos,claveGrupo(a)),' um-01 ');guardar(datos,c);assert.equal(codigoMuestraRepetido(datos,c),true);
 assert.equal(gruposSeccion(datos).find(g=>g.clave===claveGrupo(a)).estado,'borrador');
 datos.unidades.find(u=>u.id===a.u.id).eliminadaEn='2026-11-10T18:00:00Z';assert.equal(codigoMuestraRepetido(datos,c),false);
});
test('la Papelera excluye las muestras de resultados y descargas y restaurar recupera los promedios',()=>{
 const datos=datosVacios(),a=completar(crearFormulario(datos,control,fecha));guardar(datos,a);
 const b=completar(agregarMuestra(datos,claveGrupo(a)),'UM-02');
 for(const [c,s,v]of [['81','B','30,5'],['83','M','83,7'],['87','M','48,8']]){b.i.deterioros[c].estado='con_deterioro';b.i.deterioros[c].niveles[s].total=v;}b.i.deterioros['84'].estado='con_deterioro';b.i.deterioros['84'].polvo='M';guardar(datos,b);
 const anterior=structuredClone(buscarFicha(datos,b.u.id));assert.equal(gruposSeccion(datos)[0].tr,79.5);
 const u=datos.unidades.find(u=>u.id===b.u.id);u.eliminadaEn='2026-11-10T18:00:00Z';assert.equal(buscarFicha(datos,b.u.id),null);
 const grupo=gruposSeccion(datos)[0];assert.equal(grupo.total,1);assert.equal(grupo.tr,100);assert.deepEqual(documentoGrupo(grupo).unidadesResumen,[a.u.id]);
 const papelera=gruposSeccion(datos,{papelera:true})[0];assert.equal(papelera.estado,'eliminado');assert.equal(papelera.total,1);assert.equal(documentoGrupo(papelera).fichas.length,0);
 delete u.eliminadaEn;assert.equal(gruposSeccion(datos)[0].tr,79.5);assert.deepEqual(buscarFicha(datos,b.u.id),anterior);
});
test('borradores, completados y archivados mantienen su estado al pasar por la Papelera',()=>{
 const datos=datosVacios(),a=crearFormulario(datos,control,fecha);guardar(datos,a);assert.equal(gruposSeccion(datos)[0].estado,'borrador');
 completar(a);guardar(datos,a);assert.equal(gruposSeccion(datos)[0].estado,'completado');
 datos.campanas[0].estado='cerrada';assert.equal(gruposSeccion(datos)[0].estado,'archivado');assert.throws(()=>agregarMuestra(datos,claveGrupo(a)),/archivado/);
 const u=datos.unidades[0];u.eliminadaEn='2026-11-10T18:00:00Z';assert.equal(gruposSeccion(datos).length,0);assert.equal(gruposSeccion(datos,{papelera:true})[0].estado,'eliminado');
 delete u.eliminadaEn;assert.equal(gruposSeccion(datos)[0].estado,'archivado');
});
test('el orden de las muestras se conserva al reabrir y no se reutiliza al eliminar una muestra',()=>{
 const datos=datosVacios(),a=crearFormulario(datos,control,fecha);guardar(datos,a);const b=agregarMuestra(datos,claveGrupo(a));guardar(datos,b);
 datos.unidades.reverse();assert.deepEqual(gruposSeccion(datos)[0].fichas.map(f=>f.u.id),[a.u.id,b.u.id]);
 datos.unidades.find(u=>u.id===b.u.id).eliminadaEn='2026-11-10T18:00:00Z';const c=agregarMuestra(datos,claveGrupo(a));assert.equal(c.u.ordenMuestra,3);
});
test('las muestras antiguas excluidas permanecen accesibles sin incorporarse a promedios ni exportaciones',()=>{
 const datos=datosVacios(),a=completar(crearFormulario(datos,control,fecha));guardar(datos,a);
 const b=agregarMuestra(datos,claveGrupo(a));b.u.seleccion='no_seleccionada';guardar(datos,b);
 const grupo=gruposSeccion(datos,{incluirNoSeleccionadas:true})[0];assert.equal(grupo.total,2);assert.equal(grupo.seleccionadas,1);assert.equal(grupo.tr,100);assert.equal(documentoGrupo(grupo).fichas.length,1);
 assert.equal(gruposSeccion(datos)[0].total,1);
});
