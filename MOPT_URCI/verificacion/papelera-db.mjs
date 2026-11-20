import {abrirBD,guardarLote,guardarRegistro,obtenerTodos,cambiarPapelera} from './db-prueba.js';
import {crearFormulario,agregarMuestra} from '../formularios.js';
import {datosVacios,registrosFicha,claveGrupo} from '../modelo.js';
import {obtenerControl} from '../catalogo.js';
const resultados=document.querySelector('#resultados'),estado=document.querySelector('#estado');let aprobadas=0;
const afirmar=(v,m)=>{if(!v)throw new Error(m);};
const unidad=async id=>(await obtenerTodos('unidades')).find(u=>u.id===id);
async function caso(nombre,accion){await accion();const li=document.createElement('li');li.className='correcto';li.textContent='Aprobada: '+nombre;resultados.append(li);aprobadas++;}
async function ficha(){const datos=datosVacios(),f=crearFormulario(datos,obtenerControl('RN:507:40762'),'2026-11-10');f.u.codigo='PRUEBA';f.i.observacionesURCI='Nota original';f.i.croquis=[{tipo:'lapiz',puntos:[[.1,.2],[.8,.7]]}];const registros=registrosFicha(f);await guardarLote(registros);for(const r of registros)datos[r.tabla].push(r.registro);return {datos,f};}
try{
 await caso('la base conserva las cinco tablas y la versión original',async()=>{const bd=await abrirBD();afirmar(bd.version===1,'Versión inesperada');afirmar([...bd.objectStoreNames].sort().join(',')===['caminos','campanas','secciones','unidades','inspecciones'].sort().join(','),'Tablas inesperadas');});
 await caso('eliminar y restaurar conserva la última edición, notas y croquis',async()=>{
  const {f}=await ficha();await guardarLote([{tabla:'unidades',registro:{...await unidad(f.u.id),codigo:'ÚLTIMA EDICIÓN'}}]);
  await cambiarPapelera([f.u.id]);let u=await unidad(f.u.id);afirmar(u.eliminadaEn&&u.codigo==='ÚLTIMA EDICIÓN','Se perdió la edición más reciente');
  await cambiarPapelera([f.u.id],false);u=await unidad(f.u.id);afirmar(!u.eliminadaEn&&u.codigo==='ÚLTIMA EDICIÓN'&&u.formularioId===f.u.formularioId,'Restauración incorrecta');
  const i=(await obtenerTodos('inspecciones')).find(i=>i.id===f.i.id);afirmar(i.observacionesURCI==='Nota original'&&JSON.stringify(i.croquis)===JSON.stringify(f.i.croquis),'Se alteraron notas o croquis');
 });
 await caso('un guardado antiguo no recupera una muestra eliminada',async()=>{
  const {f}=await ficha(),anteriores=registrosFicha(f);await cambiarPapelera([f.u.id]);let rechazo;
  try{await guardarLote(anteriores);}catch(e){rechazo=e;}
  afirmar(rechazo?.codigo==='MUESTRA_ELIMINADA','El guardado antiguo no fue rechazado');afirmar((await unidad(f.u.id)).eliminadaEn,'Se recuperó una muestra sin restaurarla');
 });
 await caso('si falta una muestra, una eliminación múltiple se revierte completa',async()=>{
  const {f}=await ficha();let rechazo=false;try{await cambiarPapelera([f.u.id,crypto.randomUUID()]);}catch{rechazo=true;}
  afirmar(rechazo,'No se detectó la muestra inexistente');afirmar(!(await unidad(f.u.id)).eliminadaEn,'Se eliminó parte del formulario');
 });
 await caso('un guardado rechazado no escribe parcialmente en otra muestra',async()=>{
  const {datos,f}=await ficha(),b=agregarMuestra(datos,claveGrupo(f));b.u.codigo='SEGUNDA';await guardarLote(registrosFicha(b));await cambiarPapelera([f.u.id]);
  let rechazo=false;try{await guardarLote([{tabla:'unidades',registro:{...await unidad(b.u.id),codigo:'NO DEBE ESCRIBIRSE'}},...registrosFicha(f)]);}catch{rechazo=true;}
  afirmar(rechazo,'No se rechazó la escritura');afirmar((await unidad(b.u.id)).codigo==='SEGUNDA','Se escribió parcialmente en otra muestra');
 });
 await caso('restaurar un formulario archivado conserva su estado de archivo',async()=>{
  const {f}=await ficha();await guardarRegistro('campanas',{...f.campana,estado:'cerrada'});await cambiarPapelera([f.u.id]);await cambiarPapelera([f.u.id],false);
  afirmar((await obtenerTodos('campanas')).find(c=>c.id===f.campana.id).estado==='cerrada','Se reabrió la jornada archivada');
 });
 await caso('guardar otra muestra conserva las referencias de los demás caminos',async()=>{
  const {f}=await ficha();const c={...f.campana,caminosIds:[...f.campana.caminosIds,'REFERENCIA-DE-OTRO-FORMULARIO']};await guardarRegistro('campanas',c);await guardarLote(registrosFicha(f));
  afirmar((await obtenerTodos('campanas')).find(c=>c.id===f.campana.id).caminosIds.includes('REFERENCIA-DE-OTRO-FORMULARIO'),'Se perdió una referencia ajena');
 });
 estado.textContent=`${aprobadas} pruebas aprobadas en IndexedDB real.`;estado.className='correcto';
}catch(error){estado.textContent='Error: '+error.message;estado.className='error';console.error(error);}
