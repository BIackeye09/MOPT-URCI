/* Indicador 02. Criterios de las fórmulas de RESULTADOS del libro oficial. */
import {numeroDecimal} from './motor-urci.js';
import {obtenerControl,referenciaControl,normalizarTexto} from './catalogo.js';
import {fechaLocal} from './modelo.js';
import {fechaValida,coincideFecha} from './filtro-fechas.js';
export {fechaValida} from './filtro-fechas.js';

export const CAMPOS_EFICIENCIA=['anio','trabajo','longitudKm','modalidad','estadoProyecto','programacion','inicioProgramado','duracionProgramada','finProgramado','inicioEjecutado','duracionEjecutada','finEjecutado','montoProgramado','montoEjecutado'];
const redondear=v=>Number.isFinite(v)?Number(v.toFixed(12)):null;
export function diasEntreFechas(inicio,fin){
 if(!fechaValida(inicio)||!fechaValida(fin))return null;
 const dias=(Date.parse(fin+'T00:00:00Z')-Date.parse(inicio+'T00:00:00Z'))/86400000;
 return dias>=0?dias:null;
}
export function fechaExcel(texto){return fechaValida(texto)?(Date.parse(texto+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000:null;}
export function nuevoProyectoEficiencia(control,fecha=fechaLocal()){
 if(!control)throw new Error('Elegí la ruta y la sección del proyecto.');
 const ahora=new Date().toISOString();
 return {id:crypto.randomUUID(),control:referenciaControl(control),anio:fecha.slice(0,4),trabajo:'',longitudKm:'',modalidad:'',estadoProyecto:'',programacion:'',inicioProgramado:'',duracionProgramada:'',finProgramado:'',inicioEjecutado:'',duracionEjecutada:'',finEjecutado:'',montoProgramado:'',montoEjecutado:'',duracionProgramadaManual:false,duracionEjecutadaManual:false,creadoEn:ahora,actualizadoEn:ahora};
}
export function referenciaProyecto(p){return p?.control||obtenerControl(p?.controlId)||null;}
export function encabezadoProyecto(p){
 const r=referenciaProyecto(p);
 return {ruta:r?`${r.tipo} ${r.ruta}`:'',seccion:r?.seccion||'',region:r?.regionCodigo?`Región ${r.regionCodigo}`:'',provincia:r?.provincia||'',canton:r?.canton||'',descripcion:r?.descripcion||''};
}
export function cambiarCampoEficiencia(p,campo,valor){
 if(!CAMPOS_EFICIENCIA.includes(campo))return false;
 p[campo]=String(valor);
 for(const tipo of ['Programada','Ejecutada']){
  if(campo==='duracion'+tipo)p['duracion'+tipo+'Manual']=String(valor).trim()!=='';
  if(campo===('inicio'+(tipo==='Programada'?'Programado':'Ejecutado'))||campo===('fin'+(tipo==='Programada'?'Programado':'Ejecutado'))||campo==='duracion'+tipo&&!p['duracion'+tipo+'Manual']){
   if(!p['duracion'+tipo+'Manual']){
    const sufijo=tipo==='Programada'?'Programado':'Ejecutado',dias=diasEntreFechas(p['inicio'+sufijo],p['fin'+sufijo]);
    p['duracion'+tipo]=dias===null?'':String(dias);
   }
  }
 }
 p.actualizadoEn=new Date().toISOString();return true;
}
export function clasificarEficiencia(v){return !Number.isFinite(v)||v<0||v>100?'':v>=90?'Muy Bueno':v>=80?'Bueno':v>=70?'Regular':v>=40?'Malo':'Muy Malo';}
export function calcularEficienciaProyecto(p){
 const dp=numeroDecimal(p.duracionProgramada),de=numeroDecimal(p.duracionEjecutada),mp=numeroDecimal(p.montoProgramado),me=numeroDecimal(p.montoEjecutado);
 const variacionTiempo=dp>0&&de!==null&&de>=0?redondear((de-dp)/dp):null;
 const variacionCosto=mp>0&&me!==null&&me>=0?redondear((me-mp)/mp):null;
 const tiempo=variacionTiempo===null?null:variacionTiempo<=0?100:variacionTiempo<.2?80:variacionTiempo<.3?60:variacionTiempo<.4?40:20;
 // Se conservan los límites de las fórmulas, incluidos 20 % y 40 % exactos.
 const costo=variacionCosto===null?null:variacionCosto<.2?100:variacionCosto<=.3?75:variacionCosto<.4?50:25;
 const indice=tiempo===null||costo===null?null:(tiempo+costo)/2;
 return {variacionTiempo,variacionCosto,tiempo,costo,indice,calificacion:clasificarEficiencia(indice)};
}
export function compararEficienciaProyecto(p){
 const r=calcularEficienciaProyecto(p),comparar=(a,b,variacion)=>({programado:numeroDecimal(a),ejecutado:numeroDecimal(b),diferencia:variacion===null?null:redondear(numeroDecimal(b)-numeroDecimal(a))});
 return {tiempo:comparar(p.duracionProgramada,p.duracionEjecutada,r.variacionTiempo),costo:comparar(p.montoProgramado,p.montoEjecutado,r.variacionCosto)};
}
export function erroresProyectoEficiencia(p){
 const errores=[];
 const agregar=(campo,texto)=>errores.push({campo,texto});
 if(!referenciaProyecto(p))agregar('ruta','Elegí la ruta y su sección.');
 if(!/^\d{4}$/.test(p.anio||'')||Number(p.anio)<1900||Number(p.anio)>9999)agregar('anio','Indicá un año válido de cuatro cifras.');
 for(const [campo,nombre]of[['trabajo','el tipo de trabajo'],['modalidad','la modalidad de ejecución'],['estadoProyecto','el estado del proyecto'],['programacion','el tipo de programación']])if(!p[campo]?.trim())agregar(campo,'Completá '+nombre+'.');
 if(!(numeroDecimal(p.longitudKm)>0))agregar('longitudKm','Indicá la longitud atendida en km, mayor que cero.');
 for(const [sufijo,nombre]of[['Programado','programadas'],['Ejecutado','de ejecución']]){
  for(const prefijo of ['inicio','fin'])if(!fechaValida(p[prefijo+sufijo]))agregar(prefijo+sufijo,`Completá las fechas ${nombre}.`);
  if(fechaValida(p['inicio'+sufijo])&&fechaValida(p['fin'+sufijo])&&diasEntreFechas(p['inicio'+sufijo],p['fin'+sufijo])===null)agregar('fin'+sufijo,`La fecha final ${nombre} no puede ser anterior al inicio.`);
 }
 if(!(numeroDecimal(p.duracionProgramada)>0))agregar('duracionProgramada','La duración estimada debe ser mayor que cero.');
 const de=numeroDecimal(p.duracionEjecutada);if(de===null||de<0)agregar('duracionEjecutada','Indicá la duración de ejecución, igual o mayor que cero.');
 if(!(numeroDecimal(p.montoProgramado)>0))agregar('montoProgramado','El monto programado debe ser mayor que cero.');
 const me=numeroDecimal(p.montoEjecutado);if(me===null||me<0)agregar('montoEjecutado','Indicá el monto ejecutado, igual o mayor que cero.');
 return errores;
}
export function estadoProyectoEficiencia(p){return p.eliminadoEn?'eliminado':erroresProyectoEficiencia(p).length?'borrador':'completado';}
export const FECHAS_PROYECTO=[['inicioEjecutado','Inicio de ejecución'],['finEjecutado','Fin de ejecución'],['inicioProgramado','Inicio programado'],['finProgramado','Fin programado']];
export function filtrarProyectosEficiencia(proyectos,{texto='',estado='activos',desde='',hasta='',campoFecha='inicioEjecutado'}={}){
 const q=normalizarTexto(texto);
 return proyectos.filter(p=>Boolean(p.eliminadoEn)===(estado==='papelera'))
  .filter(p=>['activos','papelera'].includes(estado)||estadoProyectoEficiencia(p)===estado)
  .filter(p=>coincideFecha(p[FECHAS_PROYECTO.some(([c])=>c===campoFecha)?campoFecha:'inicioEjecutado'],{desde,hasta}))
  .filter(p=>!q||normalizarTexto([p.anio,p.trabajo,...Object.values(encabezadoProyecto(p))].join(' ')).includes(q))
  .sort((a,b)=>b.actualizadoEn.localeCompare(a.actualizadoEn));
}
export function resumirEficienciaSecciones(proyectos){
 const grupos=new Map();
 for(const p of proyectos.filter(p=>!p.eliminadoEn)){
  const h=encabezadoProyecto(p),clave=[referenciaProyecto(p)?.id,p.anio].join('|');
  if(!grupos.has(clave))grupos.set(clave,{clave,encabezado:h,anio:p.anio,proyectos:[]});grupos.get(clave).proyectos.push(p);
 }
 return [...grupos.values()].map(g=>{
  const resultados=g.proyectos.map(p=>({estado:estadoProyectoEficiencia(p),...calcularEficienciaProyecto(p)}));
  const pendientes=resultados.filter(r=>r.estado!=='completado'||r.indice===null).length;
  const indice=pendientes?null:resultados.reduce((s,r)=>s+r.indice,0)/resultados.length;
  return {...g,pendientes,indice,calificacion:clasificarEficiencia(indice)};
 });
}
