import { CATALOGO_META, SECCIONES_CATALOGO } from './catalogo-datos.js';

export { CATALOGO_META, SECCIONES_CATALOGO };
export const normalizarTexto = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const codigosCT = new Set(SECCIONES_CATALOGO.filter(s=>s.tipo==='CT').map(s=>s.ruta));

/** Clave de comparación sin modificar el código guardado por el usuario. */
export function claveRuta(codigo) {
  const texto = normalizarTexto(codigo);
  const ct = texto.match(/^(?:ct|calle\s+(?:de\s+)?travesia)\s*[-.:#]?\s*(\d+)$/);
  if (ct) return `CT:${Number(ct[1])}`;
  const rn = texto.match(/^(?:rn|ruta(?:\s+nacional)?)\s*[-.:#]?\s*(\d+)$/);
  if (rn) return `RN:${Number(rn[1])}`;
  if (/^\d+$/.test(texto)) { const n=String(Number(texto)); return `${codigosCT.has(n)?'CT':'RN'}:${n}`; }
  return `MANUAL:${texto}`;
}

const porRuta = new Map();
for (const s of SECCIONES_CATALOGO) {
  const id=`${s.tipo}:${s.ruta}`;
  if (!porRuta.has(id)) porRuta.set(id,{id,tipo:s.tipo,ruta:s.ruta,codigo:s.tipo==='CT'?`CT ${s.ruta}`:s.ruta,etiqueta:`${s.tipo} ${s.ruta}`,secciones:[]});
  porRuta.get(id).secciones.push(s);
}
export const RUTAS_CATALOGO=[...porRuta.values()].sort((a,b)=>a.tipo.localeCompare(b.tipo)||Number(a.ruta)-Number(b.ruta));
const porId=new Map(SECCIONES_CATALOGO.map(s=>[s.id,s]));
const indices=new Map(SECCIONES_CATALOGO.map(s=>[s.id,normalizarTexto([`${s.tipo} ${s.ruta}`,`${s.tipo}${s.ruta}`,s.seccion,s.codigoCaminoHeredia,s.provincia,s.canton,s.descripcion,s.superficieTexto].join(' '))]));
export const obtenerControl = id => porId.get(id);
export const obtenerRutaCatalogo = id => porRuta.get(id);

export function filtrarCatalogo(filtros={}) {
  const palabras=normalizarTexto(filtros.texto).split(' ').filter(Boolean);
  const consultaRuta=porRuta.get(claveRuta(filtros.texto));
  return SECCIONES_CATALOGO.filter(s=>(!filtros.provincia||filtros.provincia==='todas'||s.provinciaCodigo===filtros.provincia)
    &&(!filtros.tipo||filtros.tipo==='todas'||s.tipo===filtros.tipo)
    &&(!filtros.superficie||filtros.superficie==='todas'||s.grupoSuperficie===filtros.superficie)
    &&(!filtros.ruta||filtros.ruta==='todas'||`${s.tipo}:${s.ruta}`===filtros.ruta)
    &&(consultaRuta?`${s.tipo}:${s.ruta}`===consultaRuta.id:palabras.every(p=>indices.get(s.id).includes(p))));
}

export function buscarCaminoCatalogo(caminos, control) {
  const clave=`${control.tipo}:${control.ruta}`;
  return caminos.find(c=>c.referenciaCatalogo?.rutaId===clave||claveRuta(c.codigo)===clave);
}

/** Instantánea de la referencia, conservada con la sección de inspección. */
export function referenciaControl(control) {
  return { ...structuredClone(control), anioBase:CATALOGO_META.anioBase, version:CATALOGO_META.version };
}

export function datosCaminoCatalogo(control) {
  const ruta=porRuta.get(`${control.tipo}:${control.ruta}`);
  const grupos=new Set(ruta.secciones.map(s=>s.grupoSuperficie));
  const superficie=grupos.size===1&&!grupos.has('por_confirmar')?[...grupos][0]:grupos.has('no_pavimentada')&&grupos.has('pavimentada')?'mixta':'sin_confirmar';
  return { codigo:ruta.codigo,nombre:`${ruta.tipo==='CT'?'Calle de travesía':'Ruta Nacional'} ${ruta.ruta}`,origen:'catalogo',superficie,
    zona:[...new Set(ruta.secciones.map(s=>s.provincia))].join(', '),
    referenciaCatalogo:{rutaId:ruta.id,anioBase:CATALOGO_META.anioBase,version:CATALOGO_META.version},
    observaciones:`Referencia del archivo Red Vial Nacional 2024.xlsx. Verificar la superficie actual en cada sección de inspección.` };
}
