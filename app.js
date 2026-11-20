/* MOPT URCI v0.34 */
import { abrirBD, obtenerTodos, guardarLote, cambiarPapelera } from './db.js';
import { iniciarPWA } from './pwa.js';
import { filtrarCatalogo, obtenerControl, normalizarTexto } from './catalogo.js';
import { DETERIOROS, NIVELES_HOJA, totalNivel, polvoSeleccionado } from './frente.js';
import { numeroDecimal } from './motor-urci.js';
import { formatearEstacion, estacionEnMetros } from './estaciones.js';
import { calcularSeguridad, actualizarSeguridad } from './seguridad.js';
import { pintarSeguridad, refrescarSeguridad } from './seguridad-ui.js';
import { prepararCroquis, pintarCroquisMapa } from './croquis.js';
import { TABLAS, datosVacios, buscarFicha, inspeccionNueva, encabezadoFicha, erroresEncabezado, resultadosFicha, registrosFicha, gruposSeccion, claveGrupo, referenciaFicha, areaMuestra } from './modelo.js';
import { numeroLegible, fechaLegible, documentoFicha, documentoGrupo, exportarExcel, exportarPdf, descargarArchivo, capturarCroquis } from './exportadores.js';
import { pintarMetodo, graficaLectura } from './lectura-urci.js';
import { mostrarVistaPrevia } from './vista-previa.js';
import { crearHojaGraficas } from './hoja-graficas.js';
import { seleccionarDeteriorosConDatos } from './curvas-seleccionadas.js';
import { crearFormulario, agregarMuestra, corregirRutaFormulario, codigoMuestraRepetido } from './formularios.js';
import { crearInterfazEficiencia } from './eficiencia-ui.js';
import { revisarFicha, pintarRevision, enfocarPendiente, revisarDocumento, nombreInforme } from './revision.js';
import { filtrarGruposPorFechas, pintarFiltroFechas, refrescarFiltroFechas } from './filtro-fechas.js';

const contenido=document.getElementById('contenido'),indicador=document.getElementById('indicador-guardado');
document.querySelector('.saltar').addEventListener('click',evento=>{
  evento.preventDefault();
  contenido.focus();
});
const dialogoMapa = document.getElementById('prueba-mapa-dialogo');
if (typeof dialogoMapa?.showModal === 'function') {
  const marcoMapa = dialogoMapa.querySelector('iframe');
  let destino = null;
  let secuencia = 0;
  document.addEventListener('click', evento => {
    const enlace = evento.target.closest('a[data-prueba-mapa]');
    if (!enlace || evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
    evento.preventDefault();
    if (dialogoMapa.open || tareaInterfaz) return;
    destino = enlace.hasAttribute('data-mapa-de-croquis') && estado.ficha && !bloqueada()
      ? { unidad: estado.ficha.u.id, solicitud: ++secuencia }
      : null;
    marcoMapa.src = enlace.href;
    dialogoMapa.showModal();
  });
  marcoMapa.addEventListener('load', () => {
    if (!dialogoMapa.open || !destino || estado.ficha?.u.id !== destino.unidad || bloqueada()) return;
    marcoMapa.contentWindow.postMessage({
      tipo: 'urci:preparar-croquis',
      solicitud: destino.solicitud,
      vista: estado.ficha.i.croquisMapa?.vista
    }, location.origin);
  });
  window.addEventListener('message', async evento => {
    if (evento.source !== marcoMapa.contentWindow || evento.origin !== location.origin ||
        !dialogoMapa.open || !destino || estado.ficha?.u.id !== destino.unidad || bloqueada() ||
        evento.data?.tipo !== 'urci:mapa-capturado' || evento.data.solicitud !== destino.solicitud) return;
    const { imagen, vista } = evento.data.captura || {};
    if (typeof imagen !== 'string' || !imagen.startsWith('data:image/png;base64,') || imagen.length > 4200000) return;
    estado.ficha.i.croquisMapa = { imagen, vista };
    pintarCroquisMapa(estado.ficha.i.croquisMapa);
    cambio();
    dialogoMapa.close();
    if (await guardarActual()) aviso('Mapa guardado en el croquis de la muestra.');
  });
  dialogoMapa.addEventListener('close', () => {
    if (dialogoMapa.open) return;
    destino = null;
    marcoMapa.removeAttribute('src');
  });
}
const estado={datos:datosVacios(),pagina:'nueva',ficha:null,busqueda:'',busquedaLista:'',filtro:'activos',desde:'',hasta:'',cambiarRuta:false,mostrarErrores:false,curva:'81'};
const interfazEficiencia=crearInterfazEficiencia({contenido,avisar:aviso,guardado:pintarGuardado,confirmar:confirmarAccion,estaActiva:()=>estado.pagina==='eficiencia'});
let temporizador=null,cola=Promise.resolve(),edicion=0,guardada=0,escribiendo=0,errorGuardado=false,tareaInterfaz=false;
const e=valor=>String(valor??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const numero=valor=>valor===null||valor===undefined?'Pendiente':numeroLegible(valor);
const bloqueada=()=>estado.ficha?.campana?.estado==='cerrada';
function aviso(texto,deshacer=null){const nodo=document.createElement('div');nodo.className='toast';nodo.textContent=texto;if(deshacer){const b=document.createElement('button');b.type='button';b.className='deshacer-eliminacion';b.textContent='Deshacer';b.addEventListener('click',()=>deshacer().then(()=>nodo.remove()).catch(()=>aviso('No se pudo restaurar. Probá desde la Papelera.')));nodo.appendChild(b);}document.getElementById('avisos').appendChild(nodo);setTimeout(()=>nodo.remove(),10000);}
function pintarGuardado(texto='Guardado en esta computadora',error=false){indicador.textContent=texto;indicador.classList.toggle('saving',escribiendo>0||edicion>guardada||estado.pagina==='eficiencia'&&interfazEficiencia.pendientes());indicador.classList.toggle('error',error);}
function incorporar(datos,registros){for(const {tabla,registro} of registros){const pos=datos[tabla].findIndex(r=>r.id===registro.id);if(pos<0)datos[tabla].push(registro);else datos[tabla][pos]=registro;}}
function datosActuales(){const copia=Object.fromEntries(TABLAS.map(t=>[t,[...estado.datos[t]]]));if(estado.ficha)incorporar(copia,registrosFicha(estado.ficha));return copia;}
function gruposGuardados(datos=estado.datos,papelera=false){return gruposSeccion(datos,{papelera,incluirNoSeleccionadas:true});}
function grupoActual(){return gruposGuardados(datosActuales()).find(g=>g.clave===claveGrupo(estado.ficha));}
function erroresFichaActual(){return [...erroresEncabezado(estado.ficha),...(codigoMuestraRepetido(datosActuales(),estado.ficha)?['Otra muestra de este formulario tiene el mismo identificador.']:[])];}
async function leerDatos(){const listas=await Promise.all(TABLAS.map(obtenerTodos));return Object.fromEntries(TABLAS.map((t,k)=>[t,listas[k]]));}
function confirmarAccion({titulo,texto,boton='Continuar',peligro=false}){
  const d=document.getElementById('confirmar-accion');if(d.open)return Promise.resolve(false);
  d.querySelector('h2').textContent=titulo;d.querySelector('p').textContent=texto;
  const aceptar=d.querySelector('[value="aceptar"]');aceptar.textContent=boton;aceptar.classList.toggle('peligro',peligro);
  d.returnValue='';return new Promise(resolver=>{d.addEventListener('close',()=>resolver(d.returnValue==='aceptar'),{once:true});d.showModal();});
}

async function guardarActual(){
  if(estado.pagina==='eficiencia')return interfazEficiencia.guardar();
  if(temporizador){clearTimeout(temporizador);temporizador=null;}
  if(!estado.ficha||bloqueada()){await cola;return !errorGuardado;}
  const registros=registrosFicha(estado.ficha),version=edicion,unidadId=estado.ficha.u.id;
  escribiendo++;pintarGuardado('Guardando…');
  const tarea=cola.then(()=>guardarLote(registros));
  cola=tarea.catch(()=>{});
  try{
    await tarea;incorporar(estado.datos,registros);
    if(estado.ficha?.u.id===unidadId)guardada=Math.max(guardada,version);
    errorGuardado=false;return true;
  }catch(error){
    if(error.codigo==='MUESTRA_ELIMINADA'){
      estado.datos=await leerDatos();if(estado.ficha?.u.id===unidadId){estado.ficha=null;estado.pagina='inspecciones';estado.filtro='papelera';edicion=0;guardada=0;actualizarDireccion();dibujar();}
      errorGuardado=false;aviso('Esta muestra se movió a la Papelera desde otra ventana.');return false;
    }
    errorGuardado=true;console.error('No se pudo guardar la inspección:',error);
    aviso('No se pudo guardar. Conservá esta página abierta y volvé a pulsar Guardar.');return false;
  }finally{escribiendo--;pintarGuardado(errorGuardado?'No se pudo guardar':edicion>guardada?'Cambios por guardar':'Guardado en esta computadora',errorGuardado);}
}
function cambio(){edicion++;if(temporizador)clearTimeout(temporizador);pintarGuardado('Guardando…');temporizador=setTimeout(guardarActual,450);}
function normalizarFicha(ficha){
  const base=inspeccionNueva();
  ficha.i.seguridadVial||=base.seguridadVial;ficha.i.croquis||=[];ficha.i.deterioros||={};
  for(const d of DETERIOROS){
    ficha.i.deterioros[d.codigo]||=base.deterioros[d.codigo];
    ficha.i.deterioros[d.codigo].niveles||={};
    for(const n of NIVELES_HOJA)ficha.i.deterioros[d.codigo].niveles[n.id]||=base.deterioros[d.codigo].niveles[n.id];
  }
  return ficha;
}
function actualizarDireccion(){
  const hash=estado.pagina==='eficiencia'?'#'+interfazEficiencia.fragmento():estado.ficha?`#ficha=${encodeURIComponent(estado.ficha.u.id)}`:`#vista=${estado.pagina}`;
  if(location.hash!==hash)history.pushState(null,'',hash);
}
async function navegar(pagina,unidadId=null,actualizarURL=true){
  const rutaSugerida=pagina==='eficiencia'&&estado.ficha?referenciaFicha(estado.ficha)?.id:null;
  if(!await guardarActual())return;
  if(estado.pagina==='eficiencia'&&pagina!=='eficiencia')estado.datos=await leerDatos();
  if(unidadId){
    const original=buscarFicha(estado.datos,unidadId);
    if(!original){estado.ficha=null;estado.pagina='inspecciones';estado.filtro=estado.datos.unidades.some(u=>u.id===unidadId&&u.eliminadaEn)?'papelera':'activos';edicion=0;guardada=0;history.replaceState(null,'','#vista=inspecciones');dibujar();aviso(estado.filtro==='papelera'?'Esta muestra está en la Papelera.':'No se encontró esa muestra.');return;}
    estado.ficha=normalizarFicha(structuredClone(original));estado.pagina='ficha';
  }else{estado.ficha=null;estado.pagina=pagina;}
  if(rutaSugerida)estado.rutaEficiencia=rutaSugerida;
  estado.busqueda='';estado.cambiarRuta=false;estado.mostrarErrores=false;edicion=0;guardada=0;
  if(actualizarURL)actualizarDireccion();
  dibujar();window.scrollTo({top:0,behavior:'instant'});
}
function buscador(){return `<div class="buscador-ruta">
  <label for="buscar-ruta">Buscá por ruta, código de camino o localidad</label>
  <input id="buscar-ruta" type="search" value="${e(estado.busqueda)}" placeholder="Ejemplo: 507, 4-0762-00 o San Rafael" autocomplete="off" aria-describedby="ayuda-ruta">
  <p class="ayuda" id="ayuda-ruta">${estado.cambiarRuta?'Elegí el tramo correcto para actualizar este formulario.':'Al elegir un tramo, se abre un formulario nuevo con los datos de la ruta.'}</p>
  <div id="resultados-rutas" class="resultados-busqueda" aria-label="Tramos disponibles"></div>
  </div>`;}
function pintarBusqueda(){
  const destino=document.getElementById('resultados-rutas');if(!destino)return;
  if(!estado.busqueda.trim()){destino.replaceChildren();return;}
  const coincidencias=filtrarCatalogo({texto:estado.busqueda}).sort((a,b)=>
    Number(b.grupoSuperficie==='no_pavimentada')-Number(a.grupoSuperficie==='no_pavimentada') || Number(b.provinciaCodigo==='4')-Number(a.provinciaCodigo==='4'));
  destino.innerHTML=coincidencias.length?`<p class="resultado-contador">${coincidencias.length} tramo(s) encontrado(s)${coincidencias.length>12?'. Afiná la búsqueda para encontrar otro tramo.':'.'}</p>`+
    coincidencias.slice(0,12).map(r=>`<button type="button" class="resultado-ruta" data-control="${e(r.id)}"><span class="ruta-icono" aria-hidden="true">${r.tipo}<br>${e(r.ruta)}</span><span><strong>${r.tipo} ${e(r.ruta)} · Sección ${e(r.seccion)}</strong><span class="detalle">${e(r.descripcion)}</span><span class="detalle">${e(r.provincia)} · ${e(r.canton)} · ${e(r.superficieTexto)}</span></span><span class="flecha" aria-hidden="true">→</span></button>`).join(''):'<p class="ayuda-vacia">No encontramos ese camino. Probá con el número de ruta, el código o una localidad.</p>';
}
function pintarNueva(){return `<header class="portada">
  <div class="portada-texto">
    <span class="antetitulo">Inspección de caminos sin pavimentar</span>
    <h1>Nueva inspección</h1>
    <p>Evaluá la transitabilidad y la seguridad vial de un tramo a partir de tus muestras de campo.</p>
  </div>
  <img src="./img/camino-campo.webp" alt="" width="1200" height="800" fetchpriority="high">
  </header>
  <div class="inicio-inspeccion">
    <section class="tarjeta encuentra" aria-labelledby="titulo-ruta">
      <h2 id="titulo-ruta">Elegí la ruta y sección</h2>
      ${buscador()}
    </section>
    <aside class="tarjeta retomar-formulario">
      <h2>Continuá una inspección</h2>
      <p class="ayuda">Abrí un formulario guardado para completar sus datos o agregarle otra muestra.</p>
      <button type="button" class="boton secundario" data-nav="inspecciones">Ver mis formularios <span aria-hidden="true">→</span></button>
    </aside>
  </div>`;}
function contextoFormulario(){
  const grupo = grupoActual();
  const unidad = estado.ficha.u;
  const indice = grupo.fichas.findIndex(ficha => ficha.u.id === unidad.id) + 1;
  const pestanas = grupo.fichas.map(({u}, k) =>
    `<button type="button" class="boton secundario muestra-pestana" data-muestra-indice="${k+1}" data-abrir="${e(u.id)}" aria-pressed="${u.id === unidad.id}">${k+1}. ${e(u.codigo || 'Muestra por completar')}</button>`
  ).join('');
  return `<section class="contexto-formulario" aria-label="Formulario y muestras">
    <h2>Muestras del formulario</h2>
    <p class="muestra-actual">Muestra ${indice} de ${grupo.total} seleccionada</p>
    <div class="muestras-controles">
      <div class="navegacion-muestras" role="group" aria-label="Muestras de este formulario">${pestanas}</div>
      <div class="botones acciones-muestra" role="group" aria-label="Acciones de la muestra">
        ${bloqueada() ? '' : '<button type="button" class="boton" data-accion="agregar-muestra">+ Agregar muestra</button>'}
        <button type="button" class="boton eliminar" data-eliminar-muestra="${e(unidad.id)}">Eliminar esta muestra</button>
      </div>
    </div>
    <div class="acciones-formulario">
      <button type="button" class="boton enlace" data-nav="nueva">+ Nuevo formulario / otra ruta</button>
      <details>
        <summary>Opciones de este formulario</summary>
        <div class="opciones-formulario">
          ${bloqueada() ? '' : '<button type="button" class="boton secundario" data-accion="cambiar-ruta">Corregir la ruta de este formulario</button>'}
          <button type="button" class="boton eliminar" data-eliminar-formulario="${e(grupo.clave)}">Eliminar formulario completo</button>
        </div>
      </details>
    </div>
  </section>`;
}


function campoUnidad(propiedad,titulo,ayuda='',decimal=false){
  const valor=estado.ficha.u[propiedad]??'';
  return `<div class="campo"><label for="u-${propiedad}">${titulo}</label><input id="u-${propiedad}" data-unidad="${propiedad}" value="${e(valor)}" ${decimal?'inputmode="decimal"':''} maxlength="80" ${bloqueada()?'disabled':''} ${propiedad==='codigo'?'placeholder="Ejemplo: UM-01"':''}>${ayuda?`<span class="ayuda">${ayuda}</span>`:''}</div>`;
}
function medidasMuestra(){
  const u=estado.ficha.u,area=areaMuestra(u),des=bloqueada()?'disabled':'';
  return `<fieldset class="campo-area grande"><legend>Área de muestra</legend><div class="medidas-area"><div class="campo"><label for="u-longitud">Largo (m)</label><input id="u-longitud" data-unidad="longitud" value="${e(u.longitud||'')}" inputmode="decimal" required maxlength="64" placeholder="Ejemplo: 30" ${des}></div><span class="operador-area" aria-hidden="true">×</span><div class="campo"><label for="u-ancho">Ancho (m)</label><input id="u-ancho" data-unidad="ancho" value="${e(u.ancho||'')}" inputmode="decimal" required maxlength="64" placeholder="Ejemplo: 5,58" ${des}></div><div class="area-resultado"><span>Área calculada</span><output id="area-calculada" aria-live="polite">${area===null?'Por completar':`${numero(area)} m²`}</output></div></div><p class="ayuda">Ambas medidas son obligatorias. El área se calcula como largo × ancho.</p></fieldset>`;
}
function pintarDeterioro(d){
  const registro=estado.ficha.i.deterioros[d.codigo],desactivado=bloqueada()?'disabled':'';
  const titulo = `<span class="codigo-dano">${d.codigo}</span><h3 class="deterioro-nombre">${e(d.nombre)}</h3>`;
  if(d.codigo==='84')return `<div class="deterioro" id="dano-84">
    <div class="deterioro-cabecera">${titulo}</div>
    <div class="polvo-opciones" role="group" aria-label="Severidad del polvo">${[['sin','Sin polvo'],['B','Baja'],['M','Media'],['A','Alta']].map(([v,t])=>`<label><input type="radio" name="polvo" value="${v}" data-polvo ${registro.estado==='sin_deterioro'?v==='sin'?'checked':'':registro.estado==='con_deterioro'&&polvoSeleccionado(registro)===v?'checked':''} ${desactivado}>${t}</label>`).join('')}</div></div>`;
  return `<div class="deterioro" id="dano-${d.codigo}">
    <div class="deterioro-cabecera">${titulo}
      <label class="sin-deterioro"><input type="checkbox" data-sin="${d.codigo}" ${registro.estado==='sin_deterioro'?'checked':''} ${desactivado}>Sin deterioro</label>
    </div>
    <div class="cantidades">${NIVELES_HOJA.map(n=>`<div class="campo nivel-${n.id}"><label for="cantidad-${d.codigo}-${n.id}">${n.nombre} <small>${d.unidad}</small></label><input id="cantidad-${d.codigo}-${n.id}" aria-label="${e(d.nombre)}, severidad ${n.nombre.toLowerCase()}, ${d.unidad}" data-cantidad="${d.codigo}" data-severidad="${n.id}" value="${e(registro.estado==='sin_deterioro'?'':totalNivel(registro.niveles[n.id]))}" inputmode="decimal" placeholder="—" maxlength="64" ${desactivado|| (registro.estado==='sin_deterioro'?'disabled':'')}></div>`).join('')}</div>
  </div>`;
}
function estadoCard(titulo,valor,calificacion,extra=''){return `<div class="resultado ${valor===null?'pendiente':''}"><span>${titulo}</span><strong>${valor===null?'Por completar':e(numero(valor))}</strong><small>${e(calificacion || extra || 'Pendiente')}</small></div>`;}
function tablaResumen(grupo,amplia=false){
  return `<div class="tabla-contenedor" tabindex="0" role="region" aria-label="Resultados de las muestras"><table class="tabla"><thead><tr><th>Unidad</th><th>EST. INICIO</th><th>EST. FINAL</th><th>Transitabilidad</th><th>Seguridad vial</th>${amplia?'<th></th>':''}</tr></thead><tbody>${grupo.fichas.map(f=>{const h=encabezadoFicha(f),r=resultadosFicha(f);return `<tr><td><strong>${e(h.unidad||'Sin identificar')}</strong></td><td>${e(h.inicio||'—')}</td><td>${e(h.fin||'—')}</td><td>${r.urci.urci===null?'Pendiente':`≈ ${numero(r.urci.urci)} · ${e(r.calificacionTR)}`}</td><td>${r.seguridad.indice===null?'Pendiente':`${numero(r.seguridad.indice)} · ${e(r.seguridad.calificacion)}`}</td>${amplia?`<td><button type="button" class="boton secundario" data-abrir="${e(f.u.id)}">Abrir</button></td>`:''}</tr>`;}).join('')}</tbody></table></div>`;
}
function pintarResultados(){
  const f=estado.ficha,r=resultadosFicha(f),grupo=grupoActual();
  const evaluados=DETERIOROS.filter(d=>['con_deterioro','sin_deterioro'].includes(f.i.deterioros[d.codigo].estado)).length;
  const n=document.getElementById('contador-deterioros');if(n)n.textContent=`${evaluados} de 7 deterioros evaluados`;
  const avisoCurvas=document.getElementById('curvas-incluidas');
  if(avisoCurvas){
    const seleccion=seleccionarDeteriorosConDatos(crearHojaGraficas(f.i,f.u,r.urci)),codigos=seleccion.filter(t=>t.grafica).map(t=>t.codigo);
    let texto=codigos.length?`Curvas que se incluirán: ${codigos.join(', ')}.`:'Sin curvas para incluir todavía.';
    if(seleccion.some(t=>t.codigo==='84'))texto+=' Polvo (84): valor fijo según la severidad.';
    if(avisoCurvas.textContent!==texto)avisoCurvas.textContent=texto;
  }
  const svg=calcularSeguridad(f.i.seguridadVial);
  const count=document.getElementById('contador-seguridad');if(count)count.textContent=`${4-svg.faltantes.length} de 4 aspectos evaluados`;
  refrescarSeguridad(f.i.seguridadVial,bloqueada());
  const revision=document.getElementById('revision-inspeccion');
  if(revision){const abierta=revision.querySelector('details')?.open;revision.innerHTML=pintarRevision(revisarFicha(f,{resultados:r,codigoRepetido:codigoMuestraRepetido(datosActuales(),f)}),{soloLectura:bloqueada()});if(abierta&&revision.querySelector('details'))revision.querySelector('details').open=true;}
  const destino=document.getElementById('resultados-inspeccion');if(!destino)return;
  const abierto=destino.querySelector('details')?.open;
  destino.innerHTML=`<div class="resumen-indicadores">${estadoCard('Transitabilidad · URCI aproximado',r.urci.urci,r.calificacionTR)}${estadoCard('Seguridad vial',r.seguridad.indice,r.seguridad.calificacion)}${estadoCard('Eficacia de la muestra',r.eficacia,r.calificacionEficacia)}</div>
    <p class="resultado-nota">${r.urci.estado==='calculado'?'El resultado URCI se aproxima a partir de las curvas del TM 5-626.':'El URCI aparecerá cuando completés el área y evalués los siete deterioros.'} ${r.seguridad.completo?'':'La seguridad vial requiere los cuatro aspectos.'}</p>
    ${grupo?`<details class="complemento"><summary>Ver muestras y promedios de esta sección</summary><div class="complemento-cuerpo">${tablaResumen(grupo)}<p>Promedios de ${grupo.seleccionadas} muestra(s): transitabilidad ${grupo.tr===null?'pendiente':numero(grupo.tr)} · seguridad vial ${grupo.sv===null?'pendiente':numero(grupo.sv)}. Se completan al evaluar todas las muestras seleccionadas del formulario.</p></div></details>`:''}`;
  if(abierto)destino.querySelector('details').open=true;
  const detalle=document.getElementById('detalle-calculo');
  if(detalle){const abierto=detalle.querySelector('details')?.open;detalle.innerHTML=pintarMetodo(f.i,{...f.u,areaM2:areaMuestra(f.u)??''},r.urci);if(abierto)detalle.querySelector('details').open=true;}
  const grafica=document.getElementById('grafica-lectura');if(grafica)grafica.innerHTML=graficaLectura(estado.curva,r.urci);
  pintarErrores();
}
function pintarErrores(){
  const destino=document.getElementById('errores-encabezado');if(!destino)return;
  const errores=erroresFichaActual();
  destino.hidden=!estado.mostrarErrores||!errores.length;
  destino.innerHTML=errores.length?`<strong>Revisá estos datos:</strong><ul class="errores">${errores.map(t=>`<li>${e(t)}</li>`).join('')}</ul>`:'';
  for(const [propiedad,valido] of [
    ['codigo',!!String(estado.ficha.u.codigo||'').trim()&&!codigoMuestraRepetido(datosActuales(),estado.ficha)],['longitud',numeroDecimal(estado.ficha.u.longitud)>0],['ancho',numeroDecimal(estado.ficha.u.ancho)>0],
    ['progresivaInicio',estacionEnMetros(estado.ficha.u.progresivaInicio)!==null],['progresivaFin',estacionEnMetros(estado.ficha.u.progresivaFin)!==null]]){
    const input=document.getElementById(`u-${propiedad}`);if(input)input.setAttribute('aria-invalid',String(estado.mostrarErrores&&!valido));
  }
  document.getElementById('inspector')?.setAttribute('aria-invalid',String(estado.mostrarErrores&&!estado.ficha.i.inspector.trim()));
}
function pintarFicha(){
  const f=estado.ficha,h=encabezadoFicha(f),r=referenciaFicha(f),sv=f.i.seguridadVial||{},des=bloqueada()?'disabled':'';
  return `<header class="encabezado-pagina ficha-encabezado"><div>
    <span class="antetitulo">${e(grupoActual().nombre)}</span>
    <h1>Inspección de ${e(h.ruta)}</h1>
    <p class="subtitulo"><strong>Sección ${e(h.seccion)}</strong> · ${e(h.descripcion)}</p>
    <p class="ayuda datos-ruta">${[h.provincia,h.canton,h.region,h.codigoCamino?`Camino ${h.codigoCamino}`:'',h.longitudKm!==null?`${numero(h.longitudKm)} km de sección`:''].filter(Boolean).map(e).join(' · ')}</p>
    </div><button type="button" class="boton secundario boton-previa" data-vista="urci">Vista previa</button>
    </header>
    ${contextoFormulario()}
    ${estado.cambiarRuta?`<section class="tarjeta corregir-ruta"><h2>Corregir la ruta de ${e(grupoActual().nombre)}</h2><p>La ruta elegida se aplicará a las ${grupoActual().total} muestra(s) de este formulario. Para crear uno distinto, usá «Nuevo formulario / otra ruta».</p><button type="button" class="boton secundario" data-accion="cambiar-ruta">Cancelar corrección</button>${buscador()}</section>`:''}
    ${bloqueada()?'<div class="aviso">Esta inspección está archivada. Podés consultarla y descargar sus formularios.</div>':''}
    <nav class="barra-secciones" aria-label="Ir a una sección de la muestra">
      ${[['datos-muestra','Datos de muestra'],['deterioros','Deterioros'],['seguridad-vial','Seguridad vial'],['resultados','Resultados']].map(([id,nombre],i)=>`<button type="button" data-ir-seccion="${id}"><span aria-hidden="true">${i+1}</span>${nombre}</button>`).join('')}
    </nav>
    <form id="formulario-inspeccion" novalidate>
    <section class="tarjeta" id="datos-muestra"><div class="seccion-cabecera"><span class="numero-seccion" aria-hidden="true">1</span><div><h2 tabindex="-1">Datos de la muestra</h2><p>Identificación, medidas y estaciones del tramo inspeccionado.</p></div><span class="fecha-automatica">Fecha de inspección <strong>${fechaLegible(h.fecha)}</strong></span></div>
      <div class="cuadricula-campos">${campoUnidad('codigo','Unidad de muestra','Identificador de la muestra inspeccionada.')}<div class="campo"><label for="inspector">Inspeccionado por</label><input id="inspector" data-inspector value="${e(f.i.inspector)}" placeholder="Nombre de la persona que inspecciona" autocomplete="name" maxlength="120" ${des}></div>${medidasMuestra()}
      <div class="campo"><label for="u-progresivaInicio">EST. INICIO (km)</label><input id="u-progresivaInicio" data-unidad="progresivaInicio" value="${e(f.u.progresivaInicio)}" inputmode="decimal" placeholder="Ejemplo: 0,0" maxlength="40" ${des}><span class="preview-estacion">En PDF y Excel: <b data-preview="progresivaInicio">${e(h.inicio||'—')}</b></span></div>
      <div class="campo"><label for="u-progresivaFin">EST. FINAL (km)</label><input id="u-progresivaFin" data-unidad="progresivaFin" value="${e(f.u.progresivaFin)}" inputmode="decimal" placeholder="Ejemplo: 7,91" maxlength="40" ${des}><span class="preview-estacion">En PDF y Excel: <b data-preview="progresivaFin">${e(h.fin||'—')}</b></span></div>
      </div>
      ${r&&r.grupoSuperficie!=='no_pavimentada'?`<div class="aviso"><p>El inventario describe esta sección como <strong>${e(r.superficieTexto)}</strong>. Confirmá la superficie de la muestra observada.</p><label><input type="checkbox" data-confirmar-superficie ${f.u.superficieMuestra==='no_pavimentada'||!f.u.superficieMuestra&&f.s.superficie==='no_pavimentada'?'checked':''} ${des}>Esta muestra está en un tramo sin pavimentar.</label></div>`:''}
      <div id="errores-encabezado" class="aviso aviso-error" role="alert" hidden></div>
    </section>
    <section class="tarjeta" id="deterioros"><div class="seccion-cabecera"><span class="numero-seccion" aria-hidden="true">2</span><div><h2 tabindex="-1">Deterioros del camino</h2><p>Registrá las cantidades por severidad o marcá «Sin deterioro».</p></div><span id="contador-deterioros" class="contador"></span></div>
      <details class="complemento complemento-croquis">
        <summary>Observaciones y croquis</summary>
        <div class="complemento-cuerpo">
          <div class="campo">
            <label for="observaciones-urci">Observaciones del deterioro del camino</label>
            <textarea id="observaciones-urci" data-observaciones="observacionesURCI" ${des}>${e(f.i.observacionesURCI)}</textarea>
          </div>
          <h3 class="croquis-cabecera">Croquis de la muestra</h3>
          <div class="croquis-barra">
            <a href="./prueba-mapa.html" class="boton secundario" data-prueba-mapa ${des?'':'data-mapa-de-croquis'} aria-haspopup="dialog">Consultar mapa</a>
            <button type="button" data-accion="quitar-mapa" ${des} hidden>Quitar mapa</button>
          </div>
          <figure id="croquis-mapa-guardado" class="croquis-mapa-guardado" hidden>
            <img alt="Encuadre de OpenStreetMap guardado en el croquis">
            <figcaption class="ayuda">Mapa de la muestra para la vista previa, el PDF y el Excel.</figcaption>
          </figure>
          <div id="croquis-dibujo">
            <div class="croquis-barra">
              <button type="button" data-croquis="lapiz" class="active" aria-pressed="true" ${des}>Lápiz</button>
              <button type="button" data-croquis="borrador" aria-pressed="false" ${des}>Borrador</button>
              <button type="button" data-croquis="deshacer" ${des}>Deshacer</button>
              <button type="button" data-croquis="limpiar" ${des}>Borrar croquis</button>
            </div>
            <div class="croquis-lienzo"><canvas id="croquis" width="960" height="600" aria-label="Dibujar croquis de la muestra" ${des?'data-bloqueado="true"':''}></canvas><span class="croquis-ayuda">Dibujá con el mouse o el dedo</span></div>
          </div>
        </div>
      </details>
      <div class="lista-deterioros">${DETERIOROS.map(pintarDeterioro).join('')}</div>
      <div class="deterioros-pie"><button type="button" class="boton suave" data-accion="sin-restantes" ${des}>Marcar los restantes sin deterioro</button><button type="button" class="boton secundario boton-previa" data-vista="graficas">Ver gráficas y valores deducibles</button></div><p id="curvas-incluidas" class="curvas-incluidas" aria-live="polite"></p>
    </section>
    <section class="tarjeta" id="seguridad-vial"><div class="seccion-cabecera"><span class="numero-seccion" aria-hidden="true">3</span><div><h2 tabindex="-1">Seguridad vial</h2><p>Registrá la medición o la nota según el aspecto evaluado.</p></div><span id="contador-seguridad" class="contador"></span></div>
      <div id="campos-seguridad">${pintarSeguridad(sv,bloqueada())}</div>
    </section>
    <section class="tarjeta" id="resultados"><div class="seccion-cabecera"><span class="numero-seccion" aria-hidden="true">4</span><div><h2 tabindex="-1">Resultados y descarga</h2><p>Revisá las calificaciones y los datos pendientes de esta muestra.</p></div><button type="button" class="boton secundario boton-previa" data-vista="resumen">Ver resumen</button></div><div id="resultados-inspeccion"></div><div id="revision-inspeccion"></div>
      <details class="complemento"><summary>Ver el cálculo y las curvas de referencia</summary><div class="complemento-cuerpo"><div id="detalle-calculo" class="detalle-calculo"></div><div class="campo"><label for="curva-referencia">Curva de referencia</label><select id="curva-referencia" data-curva>${[...DETERIOROS.map(d=>[d.codigo,`${d.codigo} · ${d.nombre}`]),['urci','Curva URCI']].map(([v,t])=>`<option value="${v}" ${estado.curva===v?'selected':''}>${t}</option>`).join('')}</select></div><div id="grafica-lectura"></div></div></details>
      <div class="acciones-finales">${des?'<span class="etiqueta">Solo lectura</span>':'<button type="submit" class="boton">Guardar inspección</button>'}<div class="botones"><button type="button" class="boton secundario" data-exportar="pdf">PDF de esta muestra</button><button type="button" class="boton secundario" data-exportar="xlsx">Excel del formulario (.xlsx)</button></div></div>
    </section></form>`;
}

const ETIQUETAS_ESTADO={borrador:'Borrador',completado:'Completado',archivado:'Archivado',eliminado:'En Papelera'};
function gruposLista(){
  const consulta=normalizarTexto(estado.busquedaLista),papelera=estado.filtro==='papelera';
  return filtrarGruposPorFechas(gruposGuardados(estado.datos,papelera),estado).filter(g=>(papelera||estado.filtro==='activos'||g.estado===estado.filtro)&&(!consulta||normalizarTexto([g.nombre,g.encabezado.ruta,g.encabezado.seccion,g.encabezado.descripcion,g.encabezado.fecha,...g.fichas.flatMap(f=>[f.u.codigo,f.i.inspector])].join(' ')).includes(consulta)));
}
function pintarEstacionesFormulario(grupo){
  const intervalos = new Set();
  for(const {u} of grupo.fichas){
    const inicio = formatearEstacion(u.progresivaInicio);
    const fin = formatearEstacion(u.progresivaFin);
    if(inicio && fin) intervalos.add(`${inicio} a ${fin}`);
    else if(inicio) intervalos.add(`Desde ${inicio}`);
    else if(fin) intervalos.add(`Hasta ${fin}`);
  }
  const visibles = [...intervalos].slice(0, 2);
  return `<div class="estaciones-formulario">
    <strong>Estaciones</strong>
    ${visibles.length ? visibles.map(rango=>`<span class="intervalo-formulario">${e(rango)}</span>`).join('') : '<span>Pendientes</span>'}
    ${intervalos.size > visibles.length ? `<span>+${intervalos.size - visibles.length} más</span>` : ''}
  </div>`;
}
function pintarIndicadoresFormulario(grupo){
  const indicadores = [
    ['Transitabilidad', grupo.tr, grupo.calificacionTR],
    ['Seguridad vial', grupo.sv, grupo.calificacionSV],
    ['Eficacia', grupo.eficacia, grupo.calificacionEficacia]
  ];
  return `<dl class="indicadores-formulario" aria-label="Promedios de las muestras seleccionadas">
    ${indicadores.map(([titulo,valor,calificacion])=>`<div>
      <dt>${titulo}</dt>
      <dd><strong>${e(numero(valor))}</strong>${calificacion ? `<span>${e(calificacion)}</span>` : ''}</dd>
    </div>`).join('')}
  </dl>`;
}
function pintarMuestraGuardada(ficha, indice, papelera){
  const h = encabezadoFicha(ficha);
  const r = resultadosFicha(ficha);
  const transitabilidad = [numero(r.urci.urci),r.calificacionTR].filter(Boolean).join(' · ');
  const seguridad = [numero(r.seguridad.indice),r.seguridad.calificacion].filter(Boolean).join(' · ');
  return `<div class="muestra-guardada">
    <div>
      <strong>${indice+1}. ${e(h.unidad||'Muestra por completar')}</strong>
      <span class="ayuda"> · ${e(h.inspector||'Inspector pendiente')}</span>
      <p>Est. inicio <b>${e(h.inicio||'Pendiente')}</b> · Est. final <b>${e(h.fin||'Pendiente')}</b></p>
      <p>URCI <b>${e(transitabilidad)}</b> · Seguridad vial <b>${e(seguridad)}</b>${ficha.u.seleccion==='seleccionada'?'':' · Fuera del promedio'}</p>
    </div>
    <div class="botones">${papelera
      ? `<button type="button" class="boton secundario" data-restaurar-muestra="${e(ficha.u.id)}">Restaurar</button>`
      : `<button type="button" class="boton secundario" data-abrir="${e(ficha.u.id)}">Abrir muestra</button>
         <button type="button" class="boton eliminar" data-eliminar-muestra="${e(ficha.u.id)}">Eliminar muestra</button>`}
    </div>
  </div>`;
}
function pintarLista(grupos){
  const papelera = estado.filtro==='papelera';
  if(!grupos.length)return `<div class="vacio"><h2>${estado.desde||estado.hasta||estado.busquedaLista?'No hay formularios con este filtro':papelera?'La Papelera está vacía':estado.filtro!=='activos'?'No hay formularios con este filtro':'Todavía no hay formularios'}</h2><p>Probá otra búsqueda, cambiá las fechas o limpiá el filtro.</p>${papelera?'':'<button type="button" class="boton" data-nav="nueva">+ Nuevo formulario</button>'}</div>`;
  return grupos.map(g=>`<article class="tarjeta formulario-guardado registro-inspeccion" data-formulario="${e(g.clave)}">
    <header class="formulario-cabecera">
      <div>
        <span class="antetitulo">${e([g.nombre,fechaLegible(g.encabezado.fecha)].filter(Boolean).join(' · '))}</span>
        <h2>${e(g.encabezado.ruta)} · Sección ${e(g.encabezado.seccion)}</h2>
        <p class="ayuda">${e(g.encabezado.descripcion)}</p>
      </div>
      <span class="etiqueta ${papelera?'papelera':g.estado==='completado'?'lista':g.estado==='borrador'?'pendiente':''}">${ETIQUETAS_ESTADO[g.estado]}</span>
    </header>
    <div class="metadatos-formulario">
      <span>${g.total} ${g.total===1?'muestra':'muestras'}${papelera?'':` · ${g.completas} ${g.completas===1?'completa':'completas'}`}</span>
      ${pintarEstacionesFormulario(g)}
    </div>
    ${papelera?'':pintarIndicadoresFormulario(g)}
    <div class="acciones-registro">
      <div class="botones">
        ${papelera
          ? `<button type="button" class="boton" data-restaurar-formulario="${e(g.clave)}">Restaurar ${g.total===1?'muestra':'muestras'}</button>`
          : `<button type="button" class="boton" data-abrir="${e(g.fichas[0].u.id)}">Abrir formulario</button>
             <button type="button" class="boton secundario boton-previa" data-vista-grupo="${e(g.clave)}">Vista previa del resumen</button>
             <button type="button" class="boton eliminar" data-eliminar-formulario="${e(g.clave)}">Eliminar formulario</button>`}
      </div>
      <details class="complemento">
        <summary>${papelera?'Ver muestras eliminadas':'Ver muestras y estaciones'}</summary>
        <div class="complemento-cuerpo lista-muestras">${g.fichas.map((ficha,indice)=>pintarMuestraGuardada(ficha,indice,papelera)).join('')}</div>
      </details>
    </div>
    ${g.repetidas&&!papelera?'<p class="aviso aviso-error">Hay muestras con el mismo identificador. Revisalas antes de descargar.</p>':''}
  </article>`).join('');
}
function pintarMisInspecciones(){
  const grupos = gruposLista();
  const total = grupos.length;
  return `<header class="encabezado-pagina">
    <div><h1>Mis formularios</h1><p class="subtitulo">Consultá tus inspecciones, completá borradores o recuperá muestras de la Papelera.</p></div>
    <button type="button" class="boton" data-nav="nueva">+ Nuevo formulario</button>
  </header>
  <section class="tarjeta panel-filtros" aria-labelledby="titulo-filtros">
    <h2 id="titulo-filtros">Filtrar formularios</h2>
    <div class="filtros-lista filtros-formularios">
      <div class="campo"><label for="buscar-inspecciones">Buscar</label><input type="search" id="buscar-inspecciones" placeholder="Ruta, formulario, muestra o inspector" value="${e(estado.busquedaLista)}"></div>
      <div class="campo"><label for="filtro-formularios">Estado</label><select id="filtro-formularios">${[['activos','Formularios activos'],['borrador','Borradores'],['completado','Completados'],['archivado','Archivados'],['papelera','Papelera']].map(([v,n])=>`<option value="${v}" ${estado.filtro===v?'selected':''}>${n}</option>`).join('')}</select></div>
    </div>
    ${pintarFiltroFechas({prefijo:'formularios',...estado})}
    <div class="herramientas-listado">
      <p id="conteo-formularios" class="resultado-contador" role="status">${total} ${total===1?'formulario':'formularios'}</p>
      <button type="button" class="boton secundario" data-exportar-todos ${estado.filtro==='papelera'||!total?'disabled':''}>Descargar filtrados (.xlsx)</button>
    </div>
  </section>
  <div id="lista-inspecciones" class="lista-registros">${pintarLista(grupos)}</div>`;
}
function pintarResumen(){
  const grupos=filtrarGruposPorFechas(gruposSeccion(estado.datos),estado),consulta=normalizarTexto(estado.busquedaLista);
  const visibles=grupos.filter(g=>!consulta||normalizarTexto([g.encabezado.ruta,g.encabezado.seccion,g.encabezado.descripcion,g.encabezado.fecha].join(' ')).includes(consulta));
  return `<header class="encabezado-pagina"><div><h1>Resúmenes de formularios</h1><p class="subtitulo">Consultá los resultados por formulario y compará sus muestras.</p></div></header>
  <section class="tarjeta panel-filtros" aria-labelledby="titulo-filtros">
    <h2 id="titulo-filtros">Filtrar resúmenes</h2>
    <div class="campo"><label for="buscar-resumen">Buscar</label><input type="search" id="buscar-resumen" placeholder="Ruta, sección o localidad" value="${e(estado.busquedaLista)}"></div>
    ${pintarFiltroFechas({prefijo:'resumen',...estado})}
  </section>
  <div id="grupos-resumen" class="lista-registros">
    <p class="resultado-contador" role="status">${visibles.length} ${visibles.length===1?'resumen':'resúmenes'}</p>
    ${visibles.length?visibles.map(g=>`<section class="tarjeta resumen-grupo">
      <div class="formulario-cabecera"><div>
        <span class="antetitulo">${e(g.nombre)} · ${fechaLegible(g.encabezado.fecha)}</span>
        <h2>${e(g.encabezado.ruta)} · Sección ${e(g.encabezado.seccion)}</h2>
        <p>${e(g.encabezado.descripcion)}</p>
      </div><span class="etiqueta">${g.total} ${g.total===1?'muestra':'muestras'}</span></div>
      <div class="resumen-indicadores">${estadoCard('Transitabilidad de la sección',g.tr,g.calificacionTR,`${g.trCompletas} de ${g.total} muestras`)}${estadoCard('Seguridad vial de la sección',g.sv,g.calificacionSV,`${g.svCompletas} de ${g.total} muestras`)}${estadoCard('Eficacia de la sección',g.eficacia,g.calificacionEficacia)}</div>
      ${tablaResumen(g,true)}
      <p class="nota-datos">Los promedios se calculan con las muestras seleccionadas de este formulario.</p>
      <div class="formulario-acciones"><button type="button" class="boton secundario boton-previa" data-vista-grupo="${e(g.clave)}">Vista previa</button><button type="button" class="boton secundario" data-exportar-grupo="${e(g.clave)}" data-formato="pdf">PDF del resumen</button><button type="button" class="boton secundario" data-exportar-grupo="${e(g.clave)}" data-formato="xlsx">Excel del formulario</button></div>
    </section>`).join(''):'<div class="vacio"><h2>No hay resúmenes con este filtro</h2><p>Probá otras fechas o una búsqueda diferente.</p><button type="button" class="boton" data-nav="nueva">+ Nueva inspección</button></div>'}
  </div>`;
}
function actualizarListaFiltrada(){
  if(estado.pagina==='resumen'){
    const temporal=document.createElement('div');temporal.innerHTML=pintarResumen();
    document.getElementById('grupos-resumen').innerHTML=temporal.querySelector('#grupos-resumen').innerHTML;
    refrescarFiltroFechas('resumen',estado);return;
  }
  const grupos = gruposLista();
  document.getElementById('lista-inspecciones').innerHTML=pintarLista(grupos);
  const total = grupos.length;
  document.getElementById('conteo-formularios').textContent=`${total} ${total===1?'formulario':'formularios'}`;
  document.querySelector('[data-exportar-todos]').disabled=estado.filtro==='papelera'||!total;
  refrescarFiltroFechas('formularios',estado);
}
function dibujar(){
  const pagina=estado.ficha?'ficha':estado.pagina;
  const esEficiencia=pagina==='eficiencia',menu=document.querySelector('.menu-principal');if(menu)menu.hidden=esEficiencia;
  for(const b of document.querySelectorAll('[data-modulo]')){const activo=b.dataset.modulo===(esEficiencia?'eficiencia':'eficacia');b.classList.toggle('activo',activo);if(activo)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
  if(esEficiencia){const params=new URLSearchParams(location.hash.slice(1));interfazEficiencia.mostrar({rutaSugerida:estado.rutaEficiencia,proyectoId:params.get('proyecto'),pantalla:params.get('pantalla')});return;}
  contenido.innerHTML=pagina==='ficha'?pintarFicha():pagina==='inspecciones'?pintarMisInspecciones():pagina==='resumen'?pintarResumen():pintarNueva();
  document.querySelectorAll('[data-nav]').forEach(b=>{if(b.dataset.modulo)return;const activa=b.dataset.nav===(pagina==='ficha'?'inspecciones':pagina);b.classList.toggle('activo',activa);if(activa)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(pagina==='ficha'){prepararCroquis(estado.ficha.i,cambio);pintarResultados();}
  pintarBusqueda();
}
async function activarFichaNueva(ficha){
  estado.ficha=normalizarFicha(ficha);estado.pagina='ficha';estado.cambiarRuta=false;estado.busqueda='';estado.mostrarErrores=false;edicion=1;guardada=0;actualizarDireccion();dibujar();window.scrollTo({top:0,behavior:'instant'});await guardarActual();document.getElementById('u-codigo')?.focus();
}
async function seleccionarControl(controlId){
  const control=obtenerControl(controlId);if(!control||!await guardarActual())return;
  if(estado.ficha&&estado.cambiarRuta){
    const grupo=grupoActual(),unidad=estado.ficha.u.id;
    if(!await confirmarAccion({titulo:`Corregir la ruta de ${grupo.nombre}`,texto:`Se aplicará ${control.tipo} ${control.ruta}, sección ${control.seccion}, a las ${grupo.total} muestra(s) de este formulario. Se conservarán sus mediciones y observaciones.`,boton:'Aplicar la ruta a este formulario'}))return;
    const fichas=corregirRutaFormulario(estado.datos,grupo.clave,control),registros=fichas.flatMap(registrosFicha);
    await guardarLote(registros);incorporar(estado.datos,registros);estado.ficha=normalizarFicha(fichas.find(f=>f.u.id===unidad));estado.cambiarRuta=false;estado.busqueda='';estado.mostrarErrores=false;edicion=0;guardada=0;dibujar();aviso('Ruta corregida en todas las muestras de este formulario.');return;
  }
  estado.datos=await leerDatos();await activarFichaNueva(crearFormulario(estado.datos,control));
}
async function agregarMuestraActual(){
  if(bloqueada()||!await guardarActual())return;
  const clave=claveGrupo(estado.ficha);estado.datos=await leerDatos();await activarFichaNueva(agregarMuestra(estado.datos,clave));
  aviso('Nueva muestra agregada al mismo formulario.');
}
async function restaurarMuestras(ids){
  if(!await guardarActual())return;
  const cambios=await cambiarPapelera(ids,false);incorporar(estado.datos,cambios);
  estado.ficha=null;estado.pagina='inspecciones';estado.filtro='activos';edicion=0;guardada=0;actualizarDireccion();dibujar();aviso('Restaurado. Conserva las mediciones y observaciones guardadas.');
}
async function eliminarMuestras({clave=null,unidad=null}){
  if(!await guardarActual())return;
  const grupo=gruposGuardados().find(g=>clave?g.clave===clave:g.fichas.some(f=>f.u.id===unidad));if(!grupo)return;
  const ids=unidad?[unidad]:grupo.fichas.map(f=>f.u.id),f=unidad?grupo.fichas.find(f=>f.u.id===unidad):null;
  const nombre=f?`la muestra ${f.u.codigo||'por completar'} de ${grupo.nombre}`:`${grupo.nombre} (${grupo.encabezado.ruta}, sección ${grupo.encabezado.seccion}) y sus ${ids.length} muestra(s)`;
  const efecto = f && grupo.total === 1
    ? 'Es la última muestra del formulario. Al eliminarla, el formulario dejará de aparecer en la lista activa.'
    : f
      ? 'Las demás muestras seguirán en el formulario.'
      : 'El formulario dejará de aparecer en la lista activa.';
  const confirmado = await confirmarAccion({
    titulo: unidad ? 'Eliminar esta muestra' : 'Eliminar formulario completo',
    texto: `Se moverá ${nombre} a la Papelera. ${efecto} Podés recuperar tus datos desde Mis formularios → Papelera.`,
    boton: 'Mover a Papelera',
    peligro: true
  });
  if (!confirmado) return;
  const claveAbierta=estado.ficha?claveGrupo(estado.ficha):null,afecta=estado.ficha&&ids.includes(estado.ficha.u.id);
  const cambios=await cambiarPapelera(ids,true);incorporar(estado.datos,cambios);
  if(afecta){const restante=gruposGuardados().find(g=>g.clave===claveAbierta)?.fichas[0];estado.ficha=restante?normalizarFicha(structuredClone(restante)):null;estado.pagina=restante?'ficha':'inspecciones';edicion=0;guardada=0;}
  actualizarDireccion();
  dibujar();
  if (afecta) {
    const foco = estado.ficha
      ? contenido.querySelector('.muestra-pestana[aria-pressed="true"]')
      : contenido.querySelector('#buscar-inspecciones');
    foco?.focus();
  }
  aviso(unidad ? 'Muestra movida a la Papelera.' : 'Formulario movido a la Papelera.', () => restaurarMuestras(ids));
}
async function descargar(formato,clave=null,boton=null){
  if(!await guardarActual())return;
  let documento;
  if(clave==='todos'){
    const grupos=gruposLista().filter(g=>g.estado!=='eliminado');
    if(!grupos.length){aviso('No hay formularios para descargar con este filtro.');return;}
    documento={bloques:grupos.map(documentoGrupo),encabezado:{fecha:new Date().toLocaleDateString('en-CA')}};
  }else if(clave){const grupo=gruposGuardados().find(g=>g.clave===clave);if(!grupo)return;documento=documentoGrupo(grupo);}
  else{
    const errores=erroresFichaActual();
    if(errores.length){estado.mostrarErrores=true;pintarErrores();document.getElementById('datos-muestra').scrollIntoView({behavior:'smooth',block:'start'});aviso('Completá los datos de la muestra antes de descargar.');return;}
    documento=documentoFicha(estado.ficha,grupoActual());documento.croquisPng=capturarCroquis(estado.ficha.i.croquis,estado.ficha.i.croquisMapa);
  }
  if(formato==='xlsx')for(const bloque of documento.bloques||[documento])bloque.croquisPorUnidad=Object.fromEntries((bloque.muestras||bloque.fichas||[]).map(f=>[f.u.id,capturarCroquis(f.i.croquis,f.i.croquisMapa)]));
  const texto=boton?.textContent;if(boton){boton.disabled=true;boton.textContent='Preparando…';}
  try{
    const bytes=formato==='pdf'?await exportarPdf(documento):await exportarExcel(documento);
    const h=documento.encabezado,nombre=(clave==='todos'?`Formularios_URCI_${h.fecha}`:`${h.formulario?h.formulario+'_':''}${h.ruta}_${h.seccion}_${formato==='xlsx'?'Formulario':clave?'Resumen':h.unidad}_${h.fecha}`).replace(/[^\p{L}\p{N}._-]/gu,'_');
    const borrador=revisarDocumento(documento,{formato}).borrador;
    descargarArchivo(bytes,`${nombreInforme(nombre,documento,{formato})}.${formato==='pdf'?'pdf':'xlsx'}`,formato==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    aviso(borrador?'Borrador descargado: el informe tiene datos o resultados pendientes.':formato==='pdf'?'PDF descargado.':'Excel descargado con las muestras y sus curvas.');
  }catch(error){console.error('No se pudo crear el informe:',error);aviso('No se pudo generar el archivo. Revisá la inspección e intentá nuevamente.');}
  finally{if(boton){boton.disabled=false;boton.textContent=texto;}}
}

async function verPrevia(seccion,clave=null) {
  let documento;
  if(clave){const grupo=gruposGuardados(datosActuales()).find(g=>g.clave===clave);if(!grupo)return;documento=documentoGrupo(grupo);}
  else if(estado.ficha){documento=documentoFicha(estado.ficha,grupoActual());documento.croquisPng=capturarCroquis(estado.ficha.i.croquis,estado.ficha.i.croquisMapa);}
  else return;
  await mostrarVistaPrevia(documento,seccion);
}
document.addEventListener('click',async evento=>{
  const boton=evento.target.closest('button');if(!boton||tareaInterfaz)return;
  if(boton.dataset.irSeccion){
    const seccion=document.getElementById(boton.dataset.irSeccion);
    seccion?.scrollIntoView({block:'start'});
    seccion?.querySelector('h2')?.focus({preventScroll:true});
    return;
  }
  if(estado.pagina==='eficiencia'&&!boton.dataset.nav)return;
  if(boton.dataset.fechasLimpiar){estado.desde='';estado.hasta='';for(const clave of ['desde','hasta']){const campo=document.getElementById(boton.dataset.fechasLimpiar+'-fecha-'+clave);if(campo)campo.value='';}actualizarListaFiltrada();return;}
  if(boton.dataset.revisarDato){if(!bloqueada())enfocarPendiente(boton.dataset.revisarDato);return;}
  tareaInterfaz=true;
  const controles=[...contenido.querySelectorAll('input,select,textarea,button')].filter(n=>!n.disabled);
  for(const n of controles)n.disabled=true;
  contenido.setAttribute('aria-busy','true');
  try{
    if(boton.hasAttribute('data-sv-actualizar')){
      if(!estado.ficha||bloqueada())return;
      estado.ficha.i.seguridadVial=actualizarSeguridad(estado.ficha.i.seguridadVial);
      document.getElementById('campos-seguridad').innerHTML=pintarSeguridad(estado.ficha.i.seguridadVial,bloqueada());
      cambio();pintarResultados();return;
    }
    if(boton.dataset.nav){await navegar(boton.dataset.nav);return;}
    if(boton.dataset.control){await seleccionarControl(boton.dataset.control);return;}
    if(boton.dataset.abrir){await navegar('ficha',boton.dataset.abrir);return;}
    if(boton.dataset.eliminarFormulario){await eliminarMuestras({clave:boton.dataset.eliminarFormulario});return;}
    if(boton.dataset.eliminarMuestra){await eliminarMuestras({unidad:boton.dataset.eliminarMuestra});return;}
    if(boton.dataset.restaurarFormulario){const g=gruposGuardados(estado.datos,true).find(g=>g.clave===boton.dataset.restaurarFormulario);if(g)await restaurarMuestras(g.fichas.map(f=>f.u.id));return;}
    if(boton.dataset.restaurarMuestra){await restaurarMuestras([boton.dataset.restaurarMuestra]);return;}
    if(boton.dataset.accion==='agregar-muestra'){await agregarMuestraActual();return;}
    if (boton.dataset.accion === 'quitar-mapa') {
      const ficha = estado.ficha;
      if (!ficha?.i.croquisMapa || bloqueada()) return;
      const quitar = await confirmarAccion({
        titulo: 'Quitar mapa del croquis',
        texto: 'Se quitará el mapa de esta muestra y volverás al dibujo a mano.',
        boton: 'Quitar mapa'
      });
      if (!quitar || estado.ficha !== ficha || bloqueada()) return;
      delete ficha.i.croquisMapa;
      pintarCroquisMapa();
      cambio();
      document.querySelector('[data-mapa-de-croquis]')?.focus();
      return;
    }
    if(boton.dataset.vista){await verPrevia(boton.dataset.vista);return;}
    if(boton.dataset.vistaGrupo){await verPrevia('resumen',boton.dataset.vistaGrupo);return;}
    if(boton.hasAttribute('data-exportar-todos')){await descargar('xlsx','todos',boton);return;}
    if(boton.dataset.exportar){await descargar(boton.dataset.exportar,null,boton);return;}
    if(boton.dataset.exportarGrupo){await descargar(boton.dataset.formato,boton.dataset.exportarGrupo,boton);return;}
    if(boton.dataset.accion==='cambiar-ruta'){estado.cambiarRuta=!estado.cambiarRuta;dibujar();document.getElementById('buscar-ruta')?.focus();return;}
    if(boton.dataset.accion==='sin-restantes'&&!bloqueada()){
      for(const d of DETERIOROS){const registro=estado.ficha.i.deterioros[d.codigo];if(registro.estado==='pendiente')registro.estado='sin_deterioro';}
      document.querySelector('.lista-deterioros').innerHTML=DETERIOROS.map(pintarDeterioro).join('');cambio();pintarResultados();
    }
  }catch(error){console.error(error);aviso('No se pudo completar la acción. Tus datos guardados se conservan.');}finally{for(const n of controles)if(n.isConnected)n.disabled=false;contenido.removeAttribute('aria-busy');tareaInterfaz=false;}
});
document.addEventListener('input',evento=>{
  if(estado.pagina==='eficiencia')return;
  const elemento=evento.target;
  if(elemento.id==='buscar-ruta'){estado.busqueda=elemento.value;pintarBusqueda();return;}
  if(elemento.dataset.fechasDesde||elemento.dataset.fechasHasta){estado[elemento.dataset.fechasDesde?'desde':'hasta']=elemento.value;actualizarListaFiltrada();return;}
  if(elemento.id==='buscar-inspecciones'){estado.busquedaLista=elemento.value;actualizarListaFiltrada();return;}
  if(elemento.id==='buscar-resumen'){
    estado.busquedaLista=elemento.value;
    actualizarListaFiltrada();return;
  }
  if(!estado.ficha||bloqueada())return;
  const {i,u}=estado.ficha;let modifico=false;
  if(elemento.dataset.unidad){
    const campo=elemento.dataset.unidad;u[campo]=elemento.value;
    if(campo==='codigo'){const b=document.querySelector('.muestra-pestana[aria-pressed="true"]');if(b)b.textContent=`${b.dataset.muestraIndice}. ${u.codigo||'Muestra por completar'}`;}
    if(campo==='longitud'||campo==='ancho'){
      const area=areaMuestra(u);u.modoArea='automatica';u.areaM2=area===null?'':String(area);
      document.getElementById('area-calculada').textContent=area===null?'Por completar':`${numero(area)} m²`;
    }
    if(campo.startsWith('progresiva')){const preview=document.querySelector(`[data-preview="${campo}"]`);if(preview)preview.textContent=formatearEstacion(elemento.value)||'—';}
    modifico=true;
  }else if(elemento.hasAttribute('data-inspector')){i.inspector=elemento.value;modifico=true;}
  else if(elemento.dataset.observaciones){i[elemento.dataset.observaciones]=elemento.value;modifico=true;}
  else if(elemento.dataset.cantidad){
    const codigo=elemento.dataset.cantidad,d=i.deterioros[codigo],nivel=d.niveles[elemento.dataset.severidad];
    nivel.modo='total';nivel.total=elemento.value;nivel.unidad=DETERIOROS.find(d=>d.codigo===codigo).unidad;
    d.estado=Object.values(d.niveles).some(n=>String(totalNivel(n)).trim())?'con_deterioro':'pendiente';
    elemento.setAttribute('aria-invalid',String(!!elemento.value.trim()&&numeroDecimal(elemento.value)===null));modifico=true;
  }else if(elemento.dataset.seguridad&&elemento.tagName==='INPUT'&&elemento.type!=='checkbox'){i.seguridadVial[elemento.dataset.seguridad]=elemento.value;modifico=true;}
  if(modifico){cambio();pintarResultados();}
});
document.addEventListener('change',evento=>{
  if(estado.pagina==='eficiencia')return;
  const elemento=evento.target;
  if(elemento.dataset.fechasDesde||elemento.dataset.fechasHasta){estado[elemento.dataset.fechasDesde?'desde':'hasta']=elemento.value;actualizarListaFiltrada();return;}
  if(elemento.id==='filtro-formularios'){estado.filtro=elemento.value;actualizarListaFiltrada();return;}
  if(elemento.hasAttribute('data-curva')){estado.curva=elemento.value;document.getElementById('grafica-lectura').innerHTML=graficaLectura(estado.curva,resultadosFicha(estado.ficha).urci);return;}
  if(!estado.ficha||bloqueada())return;
  let modifico=false;
  if(elemento.dataset.sin){
    const d=estado.ficha.i.deterioros[elemento.dataset.sin];
    d.estado=elemento.checked?'sin_deterioro':Object.values(d.niveles).some(n=>String(totalNivel(n)).trim())?'con_deterioro':'pendiente';
    document.getElementById(`dano-${elemento.dataset.sin}`).outerHTML=pintarDeterioro(DETERIOROS.find(d=>d.codigo===elemento.dataset.sin));modifico=true;
  }else if(elemento.hasAttribute('data-polvo')){
    const d=estado.ficha.i.deterioros['84'];d.estado=elemento.value==='sin'?'sin_deterioro':'con_deterioro';d.polvo=elemento.value==='sin'?'':elemento.value;modifico=true;
  }else if(elemento.hasAttribute('data-confirmar-superficie')){estado.ficha.u.superficieMuestra=elemento.checked?'no_pavimentada':'sin_confirmar';modifico=true;}
  else if(elemento.dataset.seguridad&&(elemento.tagName==='SELECT'||elemento.type==='checkbox')){
    estado.ficha.i.seguridadVial[elemento.dataset.seguridad]=elemento.type==='checkbox'?elemento.checked:elemento.value;
    if(elemento.dataset.seguridad==='estabilidad'&&elemento.value!=='muy_malo')estado.ficha.i.seguridadVial.estabilidadColapso=false;
    modifico=true;
  }
  if(modifico){cambio();pintarResultados();}
});
document.addEventListener('submit',async evento=>{
  if(evento.target.id!=='formulario-inspeccion')return;evento.preventDefault();
  estado.mostrarErrores=true;pintarErrores();
  if(erroresFichaActual().length){document.getElementById('datos-muestra').scrollIntoView({behavior:'smooth',block:'start'});document.querySelector('[aria-invalid=true]')?.focus();return;}
  if(await guardarActual())aviso('Inspección guardada. Podés continuar o descargarla.');
});
window.addEventListener('beforeunload',evento=>{if(temporizador||escribiendo||errorGuardado||interfazEficiencia.pendientes()){evento.preventDefault();evento.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(temporizador||edicion>guardada||interfazEficiencia.pendientes()))guardarActual();});
window.addEventListener('popstate',async()=>{const params=new URLSearchParams(location.hash.slice(1));await navegar(params.get('vista')||'nueva',params.get('ficha'),false);});
window.addEventListener('focus',async()=>{
  if(estado.pagina==='eficiencia'){await interfazEficiencia.recargarSiLimpio();return;}
  if(escribiendo||temporizador||edicion>guardada||document.querySelector('dialog[open]'))return;
  const unidad=estado.ficha?.u.id,paginaInicial=estado.pagina;
  try{const datos=await leerDatos();if(escribiendo||temporizador||edicion>guardada||estado.ficha?.u.id!==unidad||estado.pagina!==paginaInicial||document.querySelector('dialog[open]'))return;estado.datos=datos;
    if(unidad){const ficha=buscarFicha(datos,unidad);if(!ficha){estado.ficha=null;estado.pagina='inspecciones';estado.filtro='papelera';actualizarDireccion();aviso('Esta muestra está en la Papelera.');}else estado.ficha=normalizarFicha(structuredClone(ficha));}
    dibujar();
  }catch(error){console.warn('No se actualizó la lista de formularios:',error);}
});
async function iniciar(){
  iniciarPWA({antesDeActualizar:guardarActual});
  try{
    await abrirBD();const listas=await Promise.all(TABLAS.map(obtenerTodos));TABLAS.forEach((t,k)=>estado.datos[t]=listas[k]);
    const params=new URLSearchParams(location.hash.slice(1)),ficha=params.get('ficha');
    if(ficha&&buscarFicha(estado.datos,ficha)){estado.ficha=normalizarFicha(structuredClone(buscarFicha(estado.datos,ficha)));estado.pagina='ficha';}
    else if(ficha&&estado.datos.unidades.some(u=>u.id===ficha&&u.eliminadaEn)){estado.pagina='inspecciones';estado.filtro='papelera';history.replaceState(null,'','#vista=inspecciones');}
    else estado.pagina=['nueva','inspecciones','resumen','eficiencia'].includes(params.get('vista'))?params.get('vista'):'nueva';
    dibujar();
  }catch(error){console.error(error);contenido.innerHTML='<div class="vacio"><h1>No se pudo abrir el guardado local</h1><p>Revisá que el navegador permita almacenar datos de este sitio y volvé a abrir la aplicación.</p></div>';}
}
iniciar();
