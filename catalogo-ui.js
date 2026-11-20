import { CATALOGO_META, RUTAS_CATALOGO, filtrarCatalogo, buscarCaminoCatalogo } from './catalogo.js';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const num=(v,max=3)=>v===null||v===undefined?'Sin dato':v.toLocaleString('es-CR',{maximumFractionDigits:max});
const opciones=(lista,actual)=>lista.map(([v,t])=>`<option value="${e(v)}" ${v===actual?'selected':''}>${e(t)}</option>`).join('');
export const TAMANO_PAGINA=20;

export function pintarCatalogo(filtros,caminos,pagina=1) {
  const rutas=RUTAS_CATALOGO.filter(r=>(filtros.tipo==='todas'||r.tipo===filtros.tipo)&&(filtros.provincia==='todas'||r.secciones.some(s=>s.provinciaCodigo===filtros.provincia)));
  return `<div class="page-heading"><div><span class="eyebrow">BASE SUMINISTRADA · ${CATALOGO_META.anioBase}</span><h1>Catálogo vial</h1><p class="subtitle">${CATALOGO_META.totales.rutasRN} rutas nacionales y ${CATALOGO_META.totales.rutasCT} calles de travesía, con ${num(CATALOGO_META.totales.seccionesRN+CATALOGO_META.totales.seccionesCT,0)} secciones de control.</p></div><button class="btn btn-outline" data-nav="caminos">Mis caminos</button></div>
    <div class="catalogo-contexto"><strong>Elegí el tramo que vas a inspeccionar.</strong><p>El catálogo completa la referencia de ruta y sección. La superficie actual y las medidas de la muestra se confirman en campo.</p></div>
    <section class="card catalogo-filtros" aria-label="Filtros del catálogo vial"><div class="field catalogo-busqueda"><label for="catalogo-texto">Buscar ruta, sección, código de camino o lugar</label><input id="catalogo-texto" data-catalogo-texto value="${e(filtros.texto)}" placeholder="Ej. 507, 40762, 4-0762-00 o Sarapiquí" type="search"></div>
      <div class="field"><label for="catalogo-provincia">Provincia</label><select id="catalogo-provincia" data-catalogo-filtro="provincia">${opciones([['todas','Todas las provincias'],...Object.entries(CATALOGO_META.provincias)],filtros.provincia)}</select></div>
      <div class="field"><label for="catalogo-tipo">Tipo de vía</label><select id="catalogo-tipo" data-catalogo-filtro="tipo">${opciones([['todas','Rutas y travesías'],['RN','Ruta nacional (RN)'],['CT','Calle de travesía (CT)']],filtros.tipo)}</select></div>
      <div class="field"><label for="catalogo-superficie">Superficie de referencia</label><select id="catalogo-superficie" data-catalogo-filtro="superficie">${opciones([['todas','Todas las superficies'],['no_pavimentada','Lastre, grava o tierra'],['pavimentada','Pavimentada'],['por_confirmar','Por confirmar']],filtros.superficie)}</select></div>
      <div class="field"><label for="catalogo-ruta">Ruta específica</label><select id="catalogo-ruta" data-catalogo-filtro="ruta">${opciones([['todas','Todas las rutas'],...rutas.map(r=>[r.id,r.etiqueta])],filtros.ruta)}</select></div>
    </section>
    <div id="catalogo-resultados">${pintarResultadosCatalogo(filtros,caminos,pagina)}</div>
    <p class="catalogo-fuente">Fuente: Red Vial Nacional 2024.xlsx. Los códigos de camino de Heredia se contrastaron con red nacional heredia.rtf, que muestra fechas de 2020. Cada registro conserva la hoja y fila de origen.</p>`;
}

export function pintarReferenciaControl(c) {
  return `<div class="referencia-control"><strong>${e(c.tipo)} ${e(c.ruta)} · Sección de control ${e(c.seccion)}</strong><p>${e(c.descripcion)}</p><div class="meta"><span>${e(c.provincia)} / ${e(c.canton)}</span><span>Longitud de referencia: ${num(c.longitudKm)} km</span><span>Superficie de referencia: ${e(c.superficieTexto)}</span>${c.codigoCaminoHeredia?`<span>Código de camino: ${e(c.codigoCaminoHeredia)}</span>`:''}</div><p class="small-help">Base 2024 · ${e(c.fuente.hoja)}, fila ${c.fuente.fila}. Las estaciones y el área de la muestra se completan con las mediciones de la inspección.</p></div>`;
}

export function pintarResultadosCatalogo(filtros,caminos,pagina=1) {
  const encontrados=filtrarCatalogo(filtros),paginas=Math.max(1,Math.ceil(encontrados.length/TAMANO_PAGINA)),actual=Math.min(Math.max(1,pagina),paginas);
  const filas=encontrados.slice((actual-1)*TAMANO_PAGINA,actual*TAMANO_PAGINA);
  return `<div class="catalogo-contador" role="status"><strong>${encontrados.length.toLocaleString('es-CR')} secciones encontradas</strong><span>Página ${actual} de ${paginas}</span></div>
    ${filas.length?`<div class="catalogo-lista">${filas.map(c=>{
      const registrado=buscarCaminoCatalogo(caminos,c);
      return `<article class="catalogo-registro" aria-label="${e(c.tipo)} ${e(c.ruta)}, sección ${e(c.seccion)}"><div class="catalogo-identificador"><span class="catalogo-tipo">${e(c.tipo)} ${e(c.ruta)}</span><strong>${e(c.seccion)}</strong>${c.codigoCaminoHeredia?`<small>${e(c.codigoCaminoHeredia)}</small>`:''}</div>
      <div class="catalogo-descripcion"><h2>${e(c.descripcion)}</h2><p>${e(c.provincia)} · ${e(c.canton)}</p><details><summary>Datos de referencia</summary><dl><dt>Superficie</dt><dd>${e(c.superficieTexto)} (código ${e(c.superficieCodigo||'sin dato')})</dd><dt>Longitud</dt><dd>${num(c.longitudKm)} km</dd><dt>Ancho</dt><dd>${num(c.anchoM)} ${c.anchoM===null?'':'m'}${c.anchoRevisar?' · Revisar valor de la fuente':''}</dd><dt>Tránsito (TPD)</dt><dd>${num(c.tpd,0)}</dd><dt>Carriles</dt><dd>${num(c.carriles,0)}</dd><dt>Fecha inventario</dt><dd>${e(c.fechaInventario||'Sin dato')}</dd><dt>Fecha reconocimiento</dt><dd>${e(c.fechaReconocimiento||'Sin dato')}</dd><dt>Origen</dt><dd>${e(c.fuente.hoja)}, fila ${c.fuente.fila}</dd></dl></details></div>
      <div class="catalogo-resumen"><span>${num(c.longitudKm)} km</span><small>${e(c.superficieTexto)}</small></div>
      <div class="catalogo-acciones"><button class="btn btn-primary btn-sm" data-accion="catalogo-ficha" data-id="${e(c.id)}" aria-label="Nueva ficha ${e(c.tipo)} ${e(c.ruta)} sección ${e(c.seccion)}">Nueva ficha</button><button class="btn btn-outline btn-sm" data-accion="catalogo-agregar" data-id="${e(c.id)}" aria-label="${registrado?'Ruta registrada':'Registrar ruta'} ${e(c.tipo)} ${e(c.ruta)} sección ${e(c.seccion)}" ${registrado?'disabled':''}>${registrado?'Ruta registrada':'Registrar ruta'}</button></div></article>`;
    }).join('')}</div>`:'<div class="empty"><div class="empty-title">No hay secciones con estos filtros</div><p>Probá con otra ruta, provincia o descripción.</p><button class="btn btn-outline" data-accion="catalogo-limpiar">Limpiar filtros</button></div>'}
    <div class="catalogo-paginacion"><button class="btn btn-outline btn-sm" data-accion="catalogo-pagina" data-pagina="${actual-1}" ${actual<=1?'disabled':''}>Anterior</button><span>${actual} / ${paginas}</span><button class="btn btn-outline btn-sm" data-accion="catalogo-pagina" data-pagina="${actual+1}" ${actual>=paginas?'disabled':''}>Siguiente</button></div>`;
}
