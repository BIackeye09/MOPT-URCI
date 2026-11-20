import { DETERIOROS, NIVELES_HOJA } from './frente.js';
import { calcularInspeccion, numeroDecimal } from './motor-urci.js';
import { calcularSeguridad, calcularEficacia, clasificarSeguridad, clasificarTransitabilidad, clasificarEficacia, seguridadNueva } from './seguridad.js';
import { formatearEstacion, estacionEnMetros } from './estaciones.js';
import { obtenerControl, datosCaminoCatalogo, referenciaControl, buscarCaminoCatalogo, normalizarTexto } from './catalogo.js';

export const TABLAS = ['caminos','campanas','secciones','unidades','inspecciones'];
export function fechaLocal(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`;
}
export const datosVacios = () => Object.fromEntries(TABLAS.map(t => [t,[]]));
export function areaMuestra(unidad) {
  const largo=numeroDecimal(unidad?.longitud),ancho=numeroDecimal(unidad?.ancho);
  const area=largo>0&&ancho>0?largo*ancho:null;
  return area>0&&Number.isFinite(area)?area:null;
}
const id = () => crypto.randomUUID();
export function inspeccionNueva() {
  return { id:id(), fechaURCI:fechaLocal(), fechaSV:fechaLocal(), inspector:'', estadoURCI:'borrador', estadoSV:'borrador',
    observacionesURCI:'', croquis:[], seguridadVial:seguridadNueva(),
    deterioros:Object.fromEntries(DETERIOROS.map(d => [d.codigo, { estado:'pendiente',observaciones:'',
      niveles:Object.fromEntries(NIVELES_HOJA.map(n => [n.id,{modo:'total',unidad:d.unidad,total:'',registros:[]}])) }])) };
}
export function buscarFicha(datos, unidadId, {incluirEliminadas=false}={}) {
  const u = datos.unidades.find(u => u.id === unidadId);
  if (!u || u.eliminadaEn&&!incluirEliminadas) return null;
  const s = datos.secciones.find(s => s.id === u.seccionId);
  const camino = datos.caminos.find(c => c.id === u.caminoId);
  const i = datos.inspecciones.find(i => i.unidadId === u.id);
  if (!s || !camino || !i) return null;
  return {u,s,camino,i,campana:datos.campanas.find(c => c.id === u.campanaId)};
}

/** Reutiliza las cinco tablas existentes. La organización diaria se crea internamente. */
export function crearFicha(datos, control, fecha = fechaLocal()) {
  if (!control) throw new Error('Elegí una ruta y su tramo.');
  const ahora = new Date().toISOString();
  const camino = structuredClone(buscarCaminoCatalogo(datos.caminos, control) || { id:id(), ...datosCaminoCatalogo(control), creadoEn:ahora });
  const codigoDia = `DIA-${fecha}`;
  const campana = structuredClone(datos.campanas.find(c => c.codigo === codigoDia && c.estado === 'abierta') || {
    id:id(),codigo:codigoDia,nombre:`Inspecciones ${fecha}`,fechaInicio:fecha,estado:'abierta',responsable:'',caminosIds:[],creadoEn:ahora
  });
  if (!campana.caminosIds.includes(camino.id)) campana.caminosIds.push(camino.id);
  const s = structuredClone(datos.secciones.find(s => s.campanaId === campana.id && s.caminoId === camino.id && s.referenciaCatalogo?.id === control.id) || {
    id:id(),codigo:control.seccion,campanaId:campana.id,caminoId:camino.id,
    superficie:control.grupoSuperficie === 'no_pavimentada' ? 'no_pavimentada' : control.grupoSuperficie === 'pavimentada' ? 'pavimentada' : 'sin_confirmar',
    referenciaCatalogo:referenciaControl(control),creadoEn:ahora
  });
  const u = { id:id(),codigo:'',seccionId:s.id,caminoId:camino.id,campanaId:campana.id,
    seleccion:'seleccionada',tipo:'ordinaria',modoArea:'automatica',areaManual:'',areaM2:'',longitud:'',ancho:'',progresivaInicio:'',progresivaFin:'',
    superficieMuestra:control.grupoSuperficie === 'no_pavimentada' ? 'no_pavimentada':'sin_confirmar',creadoEn:ahora };
  const i = { ...inspeccionNueva(),unidadId:u.id,seccionId:s.id,caminoId:camino.id,campanaId:campana.id,fechaURCI:fecha,fechaSV:fecha,creadoEn:ahora };
  return {u,s,camino,campana,i};
}
export function referenciaFicha(ficha) {
  if (ficha.s.referenciaCatalogo) return ficha.s.referenciaCatalogo;
  return obtenerControl(`${/^CT\s/i.test(ficha.camino.codigo)?'CT':'RN'}:${String(ficha.camino.codigo).replace(/\D/g,'')}:${ficha.s.codigo}`) || null;
}
export function encabezadoFicha(ficha) {
  const {i,u,s,camino} = ficha;
  const r = referenciaFicha(ficha);
  return { ruta:r ? `${r.tipo} ${r.ruta}` : camino.codigo,seccion:s.codigo,
    descripcion:r?.descripcion || camino.nombre || '',provincia:r?.provincia || '',canton:r?.canton || '',
    region:r?.regionCodigo ? `Región ${r.regionCodigo}` : '',codigoCamino:r?.codigoCaminoHeredia || '',
    longitudKm:r?.longitudKm ?? null,superficie:r?.superficieTexto || '',
    fecha:i.fechaURCI || '',unidad:u.codigo || '',area:areaMuestra(u)===null?'':String(areaMuestra(u)),inspector:i.inspector || '',
    inicio:formatearEstacion(u.progresivaInicio),fin:formatearEstacion(u.progresivaFin),
    ...(u.formularioNumero?{formulario:`Formulario ${u.formularioNumero}`}:{}) };
}
export function detallesEncabezado(ficha) {
  const {i,u,s} = ficha, errores = [];
  const agregar=(selector,mensaje)=>errores.push({selector,mensaje});
  if (!u.codigo?.trim()) agregar('#u-codigo','Completá la unidad de muestra.');
  if (!(numeroDecimal(u.longitud)>0)) agregar('#u-longitud','Indicá el largo de la muestra en metros, mayor que cero.');
  if (!(numeroDecimal(u.ancho)>0)) agregar('#u-ancho','Indicá el ancho de la muestra en metros, mayor que cero.');
  if(numeroDecimal(u.longitud)>0&&numeroDecimal(u.ancho)>0&&areaMuestra(u)===null)agregar('#u-ancho','Revisá las medidas: el área debe ser un número finito mayor que cero.');
  if (!i.inspector?.trim()) agregar('#inspector','Completá Inspeccionado por.');
  const inicio=estacionEnMetros(u.progresivaInicio), fin=estacionEnMetros(u.progresivaFin);
  if (inicio === null) agregar('#u-progresivaInicio','Revisá EST. INICIO. Ejemplo: 0,0.');
  if (fin === null) agregar('#u-progresivaFin','Revisá EST. FINAL. Ejemplo: 7,91.');
  if (inicio !== null && fin !== null && fin < inicio) agregar('#u-progresivaFin','EST. FINAL debe ser igual o mayor que EST. INICIO.');
  if ((u.superficieMuestra || s.superficie) !== 'no_pavimentada') agregar('[data-confirmar-superficie]','La muestra debe corresponder a un tramo no pavimentado.');
  return errores;
}
export const erroresEncabezado=ficha=>detallesEncabezado(ficha).map(e=>e.mensaje);
export function resultadosFicha(ficha) {
  const urci = calcularInspeccion(ficha.i,{...ficha.u,areaM2:areaMuestra(ficha.u)??''},{...ficha.s,superficie:ficha.u.superficieMuestra || ficha.s.superficie});
  const seguridad = calcularSeguridad(ficha.i.seguridadVial);
  const eficacia = urci.estado === 'calculado' && seguridad.completo ? calcularEficacia(urci.urci,seguridad.indice) : null;
  return {urci,seguridad,eficacia,calificacionTR:clasificarTransitabilidad(urci.urci),calificacionEficacia:clasificarEficacia(eficacia)};
}
export function claveGrupo(ficha) {
  const r = referenciaFicha(ficha);
  // Se conservan las jornadas originales, para no mezclar campañas históricas distintas.
  const anterior=[ficha.u.campanaId,r?.id || `${ficha.camino.id}:${ficha.s.codigo}`,ficha.i.fechaURCI].join('|');
  return ficha.u.formularioId?`form|${ficha.u.formularioId}|${anterior}`:anterior;
}
export function gruposSeccion(datos,{papelera=false,incluirNoSeleccionadas=false}={}) {
  const grupos = new Map();
  for (const u of datos.unidades) {
    if(Boolean(u.eliminadaEn)!==papelera)continue;
    const ficha = buscarFicha(datos,u.id,{incluirEliminadas:papelera});
    if (!ficha || u.seleccion !== 'seleccionada'&&!incluirNoSeleccionadas) continue;
    const clave = claveGrupo(ficha);
    if (!grupos.has(clave)) grupos.set(clave,{clave,encabezado:encabezadoFicha(ficha),fichas:[]});
    grupos.get(clave).fichas.push(ficha);
  }
  return [...grupos.values()].map(g => {
    g.fichas.sort((a,b)=>(Number(a.u.ordenMuestra)||0)-(Number(b.u.ordenMuestra)||0));
    const elegidas=g.fichas.filter(f=>f.u.seleccion==='seleccionada'),resultados = elegidas.map(resultadosFicha);
    const trCompletas = resultados.filter(r => r.urci.estado === 'calculado').length;
    const svCompletas = resultados.filter(r => r.seguridad.completo).length;
    const tr = resultados.length&&trCompletas === resultados.length ? resultados.reduce((s,r) => s+r.urci.urci,0)/resultados.length : null;
    const sv = resultados.length&&svCompletas === resultados.length ? resultados.reduce((s,r) => s+r.seguridad.indice,0)/resultados.length : null;
    const eficacia=calcularEficacia(tr,sv);
    const codigos=g.fichas.map(f=>normalizarTexto(f.u.codigo)).filter(Boolean),repetidas=codigos.length!==new Set(codigos).size;
    const completas=g.fichas.filter(f=>{const r=resultadosFicha(f);return !erroresEncabezado(f).length&&r.urci.estado==='calculado'&&r.seguridad.completo;}).length;
    const estado=papelera?'eliminado':g.fichas.every(f=>f.campana?.estado==='cerrada')?'archivado':elegidas.length&&completas===g.fichas.length&&!repetidas?'completado':'borrador';
    const nombre=g.encabezado.formulario||'Formulario guardado';
    return {...g,nombre,estado,completas,repetidas,total:g.fichas.length,seleccionadas:elegidas.length,trCompletas,svCompletas,tr,sv,eficacia,
      calificacionTR:clasificarTransitabilidad(tr),calificacionSV:clasificarSeguridad(sv),calificacionEficacia:clasificarEficacia(eficacia)};
  }).sort((a,b) => b.encabezado.fecha.localeCompare(a.encabezado.fecha) || (Number(b.fichas[0]?.u.formularioNumero)||0)-(Number(a.fichas[0]?.u.formularioNumero)||0) || a.encabezado.ruta.localeCompare(b.encabezado.ruta,'es',{numeric:true}));
}
export function registrosFicha(ficha) {
  const ahora = new Date().toISOString();
  const r = resultadosFicha(ficha);
  ficha.i.estadoURCI=r.urci.estado === 'calculado' && !erroresEncabezado(ficha).length ? 'datos_completos':'borrador';
  ficha.i.estadoSV=r.seguridad.completo ? 'datos_completos':'borrador';
  return [['caminos',ficha.camino],['campanas',ficha.campana],['secciones',ficha.s],['unidades',ficha.u],['inspecciones',ficha.i]]
    .filter(([,registro]) => registro).map(([tabla,registro]) => ({tabla,registro:{...structuredClone(registro),actualizadoEn:ahora}}));
}
