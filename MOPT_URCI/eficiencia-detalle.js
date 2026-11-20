/* Ayudas de lectura del módulo 02; no cambian las calificaciones oficiales. */
import {compararEficienciaProyecto,diasEntreFechas,erroresProyectoEficiencia} from './eficiencia.js';
import {numeroDecimal} from './motor-urci.js';
import {numeroLegible} from './exportadores.js';
import {pintarRevision} from './revision.js';

const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const colones=v=>v===null?'Por completar':new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:2}).format(v);
const dias=v=>v===null?'Por completar':`${numeroLegible(v)} ${v===1?'día':'días'}`;
export function pintarComparacionEficiencia(p){
 const c=compararEficienciaProyecto(p);
 const diferencia=(v,tipo)=>v===null?'Por completar':v===0?'Sin diferencia':tipo==='tiempo'?`${dias(Math.abs(v))} ${v>0?(v===1?'adicional':'adicionales'):'menos'}`:`${colones(Math.abs(v))} de ${v>0?'aumento':'ahorro'}`;
 return `<div class="tabla-contenedor ef-comparacion" tabindex="0" role="region" aria-label="Comparación de plazos y montos"><table class="tabla"><caption>Programado y ejecutado</caption><thead><tr><th scope="col">Aspecto</th><th scope="col">Programado</th><th scope="col">Ejecutado</th><th scope="col">Diferencia</th></tr></thead><tbody>${[['tiempo','Plazo registrado',dias],['costo','Monto en colones',colones]].map(([tipo,titulo,formato])=>`<tr><th scope="row">${titulo}</th><td>${e(formato(c[tipo].programado))}</td><td>${e(formato(c[tipo].ejecutado))}</td><td>${e(diferencia(c[tipo].diferencia,tipo))}</td></tr>`).join('')}</tbody></table></div>`;
}
const TITULOS={ruta:'Ruta y sección',anio:'Año de ejecución',trabajo:'Tipo de trabajo',longitudKm:'Longitud atendida',modalidad:'Modalidad de ejecución',estadoProyecto:'Estado del proyecto',programacion:'Tipo de programación',inicioProgramado:'Inicio programado',finProgramado:'Fin programado',duracionProgramada:'Duración estimada',inicioEjecutado:'Inicio de ejecución',finEjecutado:'Fin de ejecución',duracionEjecutada:'Duración de ejecución',montoProgramado:'Monto programado',montoEjecutado:'Monto ejecutado'};
export function pintarPendientesEficiencia(p){
 const errores=erroresProyectoEficiencia(p);
 if(!errores.length)return '';
 return pintarRevision({completa:false,pendientes:errores.map(x=>({titulo:TITULOS[x.campo]||'Datos del proyecto',mensaje:x.texto,selector:x.campo==='ruta'?'[data-ef-accion="cambiar-ruta"]':'#ef-'+x.campo}))});
}
export function descripcionPlazoRegistrado(p,tipo){
 const sufijo=tipo==='Programada'?'Programado':'Ejecutado',entreFechas=diasEntreFechas(p['inicio'+sufijo],p['fin'+sufijo]),registrado=numeroDecimal(p['duracion'+tipo]);
 if(!p['duracion'+tipo+'Manual']||entreFechas===null||registrado===null||registrado<0||registrado===entreFechas)return '';
 return `Entre las fechas hay ${dias(entreFechas)}. Para calcular la eficiencia se usa el plazo registrado: ${dias(registrado)}.`;
}
