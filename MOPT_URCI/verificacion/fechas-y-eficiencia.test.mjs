import test from 'node:test';
import assert from 'node:assert/strict';
import {fechaValida,errorRangoFechas,coincideFecha,filtrarGruposPorFechas} from '../filtro-fechas.js';
import {nuevoProyectoEficiencia,filtrarProyectosEficiencia,compararEficienciaProyecto,calcularEficienciaProyecto} from '../eficiencia.js';
import {pintarComparacionEficiencia,pintarPendientesEficiencia,descripcionPlazoRegistrado} from '../eficiencia-detalle.js';
import {obtenerControl} from '../catalogo.js';
import {datosVacios,registrosFicha,gruposSeccion} from '../modelo.js';
import {crearFormulario,agregarMuestra} from '../formularios.js';
import {documentoGrupo} from '../exportadores.js';

const control=obtenerControl('RN:507:40762');
function proyecto(){return {...nuevoProyectoEficiencia(control,'2026-11-17'),trabajo:'Conservación',longitudKm:'7,91',modalidad:'Contrato',estadoProyecto:'Finalizado',programacion:'Ordinaria',inicioProgramado:'2026-01-01',finProgramado:'2026-01-11',duracionProgramada:'10',inicioEjecutado:'2026-02-01',finEjecutado:'2026-02-12',duracionEjecutada:'11',montoProgramado:'1000000',montoEjecutado:'1100000'};}
function guardar(datos,f){for(const {tabla,registro}of registrosFicha(f)){const k=datos[tabla].findIndex(x=>x.id===registro.id);if(k<0)datos[tabla].push(registro);else datos[tabla][k]=registro;}}

test('fechas: días civiles reales y años bisiestos sin desplazamientos horarios',()=>{
 for(const v of ['1900-01-01','2024-02-29','2026-11-17','9999-12-31'])assert.equal(fechaValida(v),true,v);
 for(const v of ['','2026-02-29','2026-02-30','1900-02-29','2026-13-01','2026-11-17T00:00:00Z','1899-12-31'])assert.equal(fechaValida(v),false,v);
});
test('fechas: ambos límites son inclusivos, incluso un único día',()=>{
 const r={desde:'2026-11-09',hasta:'2026-11-13'};
 assert.equal(coincideFecha('2026-11-09',r),true);assert.equal(coincideFecha('2026-11-13',r),true);
 assert.equal(coincideFecha('2026-11-08',r),false);assert.equal(coincideFecha('2026-11-14',r),false);
 assert.equal(coincideFecha('2026-11-17',{desde:'2026-11-17',hasta:'2026-11-17'}),true);
});
test('fechas: admite límites abiertos y conserva registros sin fecha al limpiar',()=>{
 assert.equal(coincideFecha('2026-12-01',{desde:'2026-11-17'}),true);
 assert.equal(coincideFecha('2026-11-01',{hasta:'2026-11-17'}),true);
 assert.equal(coincideFecha('',{}),true);assert.equal(coincideFecha(undefined,{}),true);
 assert.equal(coincideFecha('',{desde:'2026-11-17'}),false);
});
test('fechas: un rango invertido o inválido avisa y no se interpreta como consulta total',()=>{
 for(const r of [{desde:'2026-11-18',hasta:'2026-11-17'},{desde:'2026-02-30'},{hasta:'dato inválido'}]){
  assert.ok(errorRangoFechas(r));assert.equal(coincideFecha('2026-11-17',r),false);assert.equal(coincideFecha('',r),false);
 }
 assert.equal(errorRangoFechas({desde:'2026-11-17',hasta:'2026-11-17'}),'');
});
test('fechas: filtrar formularios conserva identidad, todas sus muestras y la selección de descarga',()=>{
 const datos=datosVacios(),a=crearFormulario(datos,control,'2026-11-09');guardar(datos,a);
 const b=agregarMuestra(datos,gruposSeccion(datos,{incluirNoSeleccionadas:true})[0].clave);guardar(datos,b);
 const c=crearFormulario(datos,control,'2026-11-17');guardar(datos,c);const antes=structuredClone(datos);
 const grupos=gruposSeccion(datos,{incluirNoSeleccionadas:true}),filtrados=filtrarGruposPorFechas(grupos,{desde:'2026-11-09',hasta:'2026-11-09'});
 assert.equal(filtrados.length,1);assert.equal(filtrados[0].total,2);assert.equal(filtrados[0],grupos.find(g=>g.fichas.some(f=>f.u.id===a.u.id)));
 assert.deepEqual(documentoGrupo(filtrados[0]).fichas.map(f=>f.u.id),[a.u.id,b.u.id]);assert.deepEqual(datos,antes);
});
test('02 fechas: usa la fecha elegida, sin sustituir por la creación ni el año',()=>{
 const p=proyecto();
 for(const [campo,fecha]of Object.entries({inicioEjecutado:'2026-02-01',finEjecutado:'2026-02-12',inicioProgramado:'2026-01-01',finProgramado:'2026-01-11'})){
  assert.equal(filtrarProyectosEficiencia([p],{campoFecha:campo,desde:fecha,hasta:fecha}).length,1);
  assert.equal(filtrarProyectosEficiencia([p],{campoFecha:campo,desde:'2026-11-17'}).length,0);
 }
 p.inicioEjecutado='';assert.equal(filtrarProyectosEficiencia([p],{desde:'2026-01-01'}).length,0);assert.equal(filtrarProyectosEficiencia([p]).length,1);
});
test('02 fechas: se combina con texto, estado y Papelera sin mutar los registros',()=>{
 const a=proyecto(),b=proyecto(),c=proyecto();b.trabajo='Puente';c.eliminadoEn='2026-11-17';const ps=[a,b,c],antes=structuredClone(ps);
 const rango={desde:'2026-02-01',hasta:'2026-02-01'};
 assert.deepEqual(filtrarProyectosEficiencia(ps,{...rango,texto:'conservacion',estado:'completado'}).map(p=>p.id),[a.id]);
 assert.deepEqual(filtrarProyectosEficiencia(ps,{...rango,estado:'papelera'}).map(p=>p.id),[c.id]);
 assert.deepEqual(filtrarProyectosEficiencia(ps,{desde:'2026-02-02',hasta:'2026-02-01'}),[]);assert.deepEqual(ps,antes);
});
test('02 comparación: diferencias en días y colones mantienen las notas oficiales',()=>{
 const p=proyecto(),antes=structuredClone(p),r=calcularEficienciaProyecto(p),c=compararEficienciaProyecto(p);
 assert.deepEqual(c,{tiempo:{programado:10,ejecutado:11,diferencia:1},costo:{programado:1000000,ejecutado:1100000,diferencia:100000}});
 const html=pintarComparacionEficiencia(p);assert.match(html,/1 día adicional/);assert.match(html,/de aumento/);assert.equal(r.indice,90);
 assert.deepEqual(calcularEficienciaProyecto(p),r);assert.deepEqual(p,antes);
});
test('02 comparación: muestra ahorros, menos días, cero real y decimales con coma',()=>{
 const p=proyecto();Object.assign(p,{duracionEjecutada:'8,5',montoEjecutado:'900000,25'});
 assert.equal(compararEficienciaProyecto(p).tiempo.diferencia,-1.5);assert.equal(compararEficienciaProyecto(p).costo.diferencia,-99999.75);
 assert.match(pintarComparacionEficiencia(p),/menos/);assert.match(pintarComparacionEficiencia(p),/de ahorro/);
 Object.assign(p,{duracionEjecutada:'10',montoEjecutado:'1000000'});assert.equal((pintarComparacionEficiencia(p).match(/Sin diferencia/g)||[]).length,2);
 p.montoEjecutado='0';assert.equal(compararEficienciaProyecto(p).costo.ejecutado,0);assert.equal(compararEficienciaProyecto(p).costo.diferencia,-1000000);
});
test('02 comparación: entradas pendientes o inválidas no se convierten en ahorros',()=>{
 const p=proyecto();p.montoEjecutado='';p.duracionEjecutada='';let c=compararEficienciaProyecto(p);
 assert.equal(c.costo.ejecutado,null);assert.equal(c.costo.diferencia,null);assert.equal(c.tiempo.diferencia,null);assert.doesNotMatch(pintarComparacionEficiencia(p),/de ahorro/);
 p.montoEjecutado='-10';p.duracionProgramada='0';c=compararEficienciaProyecto(p);assert.equal(c.costo.diferencia,null);assert.equal(c.tiempo.diferencia,null);
});
test('02 pendientes: botones apuntan al dato faltante; cero válido completa el proyecto',()=>{
 const p=proyecto();p.montoEjecutado='';const html=pintarPendientesEficiencia(p);
 assert.match(html,/data-revisar-dato="#ef-montoEjecutado"/);assert.doesNotMatch(html,/data-revisar-dato="#ef-montoProgramado"/);
 p.montoEjecutado='0';assert.equal(pintarPendientesEficiencia(p),'');
});
test('02 plazo registrado: aclara la diferencia con el calendario y conserva el valor manual',()=>{
 const p=proyecto();p.duracionEjecutada='8,5';p.duracionEjecutadaManual=true;const antes=structuredClone(p);
 const texto=descripcionPlazoRegistrado(p,'Ejecutada');assert.match(texto,/hay 11 días/);assert.match(texto,/plazo registrado: 8,5 días/);assert.deepEqual(p,antes);
 p.duracionEjecutada='11';assert.equal(descripcionPlazoRegistrado(p,'Ejecutada'),'');p.finEjecutado='';assert.equal(descripcionPlazoRegistrado(p,'Ejecutada'),'');
});
