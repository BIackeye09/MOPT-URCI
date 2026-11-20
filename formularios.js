/* Identidad de formularios y muestras. Se reutilizan las cinco tablas locales. */
import { crearFicha, buscarFicha, gruposSeccion, claveGrupo, referenciaFicha } from './modelo.js';
import { normalizarTexto } from './catalogo.js';

export function crearFormulario(datos,control,fecha){
  const ficha=crearFicha(datos,control,fecha);
  const ultimo=datos.unidades.reduce((max,u)=>Math.max(max,Number(u.formularioNumero)||0),0);
  ficha.u.formularioId=crypto.randomUUID();ficha.u.formularioNumero=ultimo+1;ficha.u.ordenMuestra=1;
  return ficha;
}
export function agregarMuestra(datos,clave){
  const grupo=gruposSeccion(datos,{incluirNoSeleccionadas:true}).find(g=>g.clave===clave);
  if(!grupo)throw new Error('No se encontró el formulario.');
  const origen=grupo.fichas[0];
  if(origen.campana?.estado==='cerrada')throw new Error('El formulario está archivado.');
  const control=referenciaFicha(origen);
  if(!control)throw new Error('Primero corregí la ruta de este formulario.');
  const ficha=crearFicha(datos,control,origen.i.fechaURCI);
  ficha.camino=structuredClone(origen.camino);ficha.s=structuredClone(origen.s);ficha.campana=structuredClone(origen.campana);
  const referencias={campanaId:origen.u.campanaId,caminoId:origen.u.caminoId,seccionId:origen.u.seccionId};
  Object.assign(ficha.u,referencias);Object.assign(ficha.i,referencias);
  if(origen.u.formularioId)Object.assign(ficha.u,{formularioId:origen.u.formularioId,formularioNumero:origen.u.formularioNumero});
  const anteriores=datos.unidades.map(u=>buscarFicha(datos,u.id,{incluirEliminadas:true})).filter(f=>f&&claveGrupo(f)===clave);
  ficha.u.ordenMuestra=Math.max(anteriores.length,...anteriores.map(f=>Number(f.u.ordenMuestra)||0))+1;
  return ficha;
}
export function corregirRutaFormulario(datos,clave,control){
  const grupo=gruposSeccion(datos,{incluirNoSeleccionadas:true}).find(g=>g.clave===clave);
  if(!grupo)throw new Error('No se encontró el formulario.');
  if(grupo.fichas.some(f=>f.campana?.estado==='cerrada'))throw new Error('El formulario está archivado.');
  const origen=grupo.fichas[0],destino=crearFicha(datos,control,origen.i.fechaURCI);
  const seccion=structuredClone(datos.secciones.find(s=>s.campanaId===origen.u.campanaId&&s.caminoId===destino.camino.id&&s.referenciaCatalogo?.id===control.id)||{...destino.s,campanaId:origen.u.campanaId});
  return grupo.fichas.map(f=>{
    const nueva=structuredClone(f);nueva.camino=structuredClone(destino.camino);nueva.s=structuredClone(seccion);
    if(!nueva.campana.caminosIds.includes(destino.camino.id))nueva.campana.caminosIds.push(destino.camino.id);
    const referencias={caminoId:destino.camino.id,seccionId:seccion.id};Object.assign(nueva.u,referencias,{superficieMuestra:destino.u.superficieMuestra});Object.assign(nueva.i,referencias);
    return nueva;
  });
}
export function codigoMuestraRepetido(datos,ficha){
  const codigo=normalizarTexto(ficha.u.codigo);if(!codigo)return false;
  return datos.unidades.some(u=>{
    if(u.id===ficha.u.id||u.eliminadaEn||normalizarTexto(u.codigo)!==codigo)return false;
    const otra=buscarFicha(datos,u.id);return otra&&claveGrupo(otra)===claveGrupo(ficha);
  });
}
