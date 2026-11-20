import {filtrarCatalogo,obtenerControl,referenciaControl} from './catalogo.js';
import {nuevoProyectoEficiencia,encabezadoProyecto,cambiarCampoEficiencia,calcularEficienciaProyecto,erroresProyectoEficiencia,estadoProyectoEficiencia,filtrarProyectosEficiencia,resumirEficienciaSecciones,FECHAS_PROYECTO} from './eficiencia.js';
import {listarProyectos,guardarProyecto,papeleraProyecto} from './eficiencia-db.js';
import {exportarExcelEficiencia,exportarPdfEficiencia} from './eficiencia-exportadores.js';
import {descargarArchivo,numeroLegible} from './exportadores.js';
import {mostrarVistaPrevia} from './vista-previa.js';
import {pintarFiltroFechas,refrescarFiltroFechas} from './filtro-fechas.js';
import {pintarComparacionEficiencia,pintarPendientesEficiencia,descripcionPlazoRegistrado} from './eficiencia-detalle.js';
import {enfocarPendiente} from './revision.js';

const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const n=v=>v===null?'Por completar':numeroLegible(v);
const porcentaje=v=>v===null?'Por completar':`${v>0?'+':''}${numeroLegible(v*100)} %`;

export function crearInterfazEficiencia({contenido,avisar,guardado,confirmar,estaActiva}){
 const s={proyectos:[],proyecto:null,vista:'lista',texto:'',filtro:'activos',desde:'',hasta:'',campoFecha:'inicioEjecutado',busqueda:'',rutaSugerida:null,corrigiendoRuta:false,mostrarErrores:false};
 let listaCargada=false,version=0,persistida=0,temporizador=null,cola=Promise.resolve(),escribiendo=0,fallo=false,ocupado=false,revision=0;
 const pendientes=()=>!!temporizador||escribiendo>0||version>persistida||fallo;
 function indicador(){if(estaActiva())guardado(fallo?'No se pudo guardar':escribiendo||version>persistida?'Guardando…':'Guardado en esta computadora',fallo);}
 function fragmento(){return 'vista=eficiencia'+(s.proyecto&&s.vista==='editar'?'&proyecto='+encodeURIComponent(s.proyecto.id):s.proyecto&&s.corrigiendoRuta?'&proyecto='+encodeURIComponent(s.proyecto.id)+'&pantalla=ruta':s.vista==='lista'?'':'&pantalla='+s.vista);}
 function direccion(push=true){const hash='#'+fragmento();if(location.hash!==hash)history[push?'pushState':'replaceState'](null,'',hash);}
 function actualizarLista(p){const i=s.proyectos.findIndex(x=>x.id===p.id);if(i<0)s.proyectos.push(structuredClone(p));else s.proyectos[i]=structuredClone(p);}
 async function guardar(){
  if(temporizador){clearTimeout(temporizador);temporizador=null;}
  if(!s.proyecto||version===persistida){await cola;return !fallo;}
  const p=structuredClone(s.proyecto),v=version,id=p.id;escribiendo++;indicador();
  const tarea=cola.then(()=>guardarProyecto(p));cola=tarea.catch(()=>{});
  try{await tarea;actualizarLista(p);if(s.proyecto?.id===id)persistida=Math.max(persistida,v);fallo=false;return true;}
  catch(error){
   if(error.codigo==='PROYECTO_ELIMINADO'){
    s.proyectos=await listarProyectos();s.proyecto=null;s.vista='lista';s.filtro='papelera';version=0;persistida=0;fallo=false;
    if(estaActiva()){direccion(false);pintar();avisar('El proyecto se movió a la Papelera desde otra ventana.');}return false;
   }
   fallo=true;console.error('No se pudo guardar Eficiencia:',error);if(estaActiva())avisar('No se pudo guardar el proyecto. Conservá esta página abierta y volvé a pulsar Guardar.');return false;
  }finally{escribiendo--;indicador();}
 }
 function cambio(){version++;fallo=false;if(temporizador)clearTimeout(temporizador);indicador();temporizador=setTimeout(guardar,450);}
 function visibles(){return filtrarProyectosEficiencia(s.proyectos,{...s,estado:s.vista==='resumen'?'activos':s.filtro});}
 function proyectosDocumento(){return s.proyecto&&s.vista==='editar'?[s.proyecto]:visibles().filter(p=>!p.eliminadoEn);}
 function encabezado(){
  const vistas = {
   lista: ['Mis proyectos', 'Consultá los proyectos guardados y filtrá por ruta, estado o fecha.'],
   nuevo: [s.corrigiendoRuta?'Corregir la ruta del proyecto':'Nuevo proyecto', 'Elegí la ruta y la sección intervenida.'],
   editar: ['Eficiencia del proyecto', 'Registrá los costos y plazos programados y ejecutados.'],
   resumen: ['Eficiencia por sección', 'Consultá los promedios de los proyectos de cada sección y año.']
  };
  const [titulo,descripcion]=vistas[s.vista];
  return `<header class="encabezado-pagina eficiencia-encabezado">
   <div><span class="antetitulo">Evaluación de proyectos</span><h1>${titulo}</h1><p class="subtitulo">${descripcion}</p></div>
   <nav class="botones navegacion-pantalla" aria-label="Menú de Eficiencia">
    <button type="button" class="boton" data-ef-accion="nuevo" ${s.vista==='nuevo'&&!s.corrigiendoRuta?'aria-current="page"':''}>+ Nuevo proyecto</button>
    <button type="button" class="boton secundario" data-ef-accion="lista" ${s.vista==='lista'?'aria-current="page"':''}>Mis proyectos</button>
    <button type="button" class="boton secundario" data-ef-accion="resumen" ${s.vista==='resumen'?'aria-current="page"':''}>Resultados por sección</button>
   </nav>
  </header>`;
 }
 function buscador(){
  const sugerida=s.rutaSugerida&&obtenerControl(s.rutaSugerida);
  return `<section class="tarjeta encuentra"><h2>Tramo del proyecto</h2>${sugerida?`<button type="button" class="boton secundario ef-ruta-sugerida" data-ef-control="${e(sugerida.id)}">Usar la ruta del formulario: ${e(sugerida.tipo)} ${e(sugerida.ruta)} · Sección ${e(sugerida.seccion)}</button>`:''}<div class="buscador-ruta"><label for="ef-buscar-ruta"><strong>Buscá la ruta, sección o lugar</strong></label><input type="search" id="ef-buscar-ruta" placeholder="Ejemplo: 507 o 4-0762-00" value="${e(s.busqueda)}" autocomplete="off" aria-describedby="ef-rutas-ayuda"><p id="ef-rutas-ayuda" class="ayuda">La región, provincia, cantón y sección se completan al elegir el tramo.</p><div id="ef-rutas" class="resultados-busqueda" aria-label="Tramos disponibles"></div></div><button type="button" class="boton secundario" data-ef-accion="${s.corrigiendoRuta?'volver':'lista'}">Cancelar</button></section>`;
 }
 function pintarBusqueda(){
  const destino=document.getElementById('ef-rutas');if(!destino)return;
  if(!s.busqueda.trim()){destino.innerHTML='';return;}
  const lista=filtrarCatalogo({texto:s.busqueda}).sort((a,b)=>Number(b.grupoSuperficie==='no_pavimentada')-Number(a.grupoSuperficie==='no_pavimentada'));
  destino.innerHTML=lista.length?`<p class="resultado-contador">${lista.length} tramo(s) encontrado(s).${lista.length>12?' Afiná la búsqueda para ver otros.':''}</p>`+lista.slice(0,12).map(r=>`<button type="button" class="resultado-ruta" data-ef-control="${e(r.id)}"><span class="ruta-icono" aria-hidden="true">${e(r.tipo)}<br>${e(r.ruta)}</span><span><strong>${e(r.tipo)} ${e(r.ruta)} · Sección ${e(r.seccion)}</strong><span class="detalle">${e(r.descripcion)}</span><span class="detalle">${e(r.provincia)} · ${e(r.canton)}</span></span><span class="flecha" aria-hidden="true">→</span></button>`).join(''):'<p class="ayuda-vacia">No encontramos ese tramo. Probá con otra ruta o localidad.</p>';
 }
 function campo(id,titulo,{tipo='text',decimal=false,ayuda='',placeholder=''}={}){
  return `<div class="campo"><label for="ef-${id}">${titulo}</label><input id="ef-${id}" data-ef-campo="${id}" type="${tipo}" ${decimal?'inputmode="decimal"':''} value="${e(s.proyecto[id])}" ${tipo==='date'?'min="1900-01-01" max="9999-12-31"':'maxlength="100"'} ${placeholder?`placeholder="${e(placeholder)}"`:''}>${ayuda?`<span class="ayuda">${ayuda}</span>`:''}</div>`;
 }
 function formulario(){
  const p=s.proyecto,h=encabezadoProyecto(p);
  return `<div class="ruta-elegida"><div><strong>${e(h.ruta)} · Sección ${e(h.seccion)}</strong><p>${e(h.descripcion)}</p><small>${e([h.region,h.provincia,h.canton].filter(Boolean).join(' · '))}</small></div><button type="button" class="boton secundario" data-ef-accion="cambiar-ruta">Corregir ruta</button></div>
  <nav class="barra-secciones" aria-label="Ir a una sección del proyecto">
   ${[['ef-datos','Datos del proyecto'],['ef-plazos','Plazos'],['ef-montos','Montos'],['ef-resultados-seccion','Resultados']].map(([id,nombre],i)=>`<button type="button" data-ir-seccion="${id}"><span aria-hidden="true">${i+1}</span>${nombre}</button>`).join('')}
  </nav>
  <form id="formulario-eficiencia" novalidate>
  <section class="tarjeta" id="ef-datos"><div class="seccion-cabecera"><span class="numero-seccion" aria-hidden="true">1</span><div><h2 tabindex="-1">Datos del proyecto</h2><p>Registrá la información de esta intervención.</p></div></div><div class="cuadricula-campos">${campo('anio','Año de ejecución',{decimal:true})}${campo('trabajo','Tipo de trabajo',{placeholder:'Ejemplo: Conservación'})}${campo('longitudKm','Longitud atendida (km)',{decimal:true,placeholder:'Ejemplo: 7,91'})}${campo('modalidad','Modalidad de ejecución',{placeholder:'Según el proyecto'})}${campo('estadoProyecto','Estado del proyecto',{placeholder:'Ejemplo: Finalizado'})}${campo('programacion','Tipo de programación',{placeholder:'Según la planificación'})}</div></section>
  <section class="tarjeta" id="ef-plazos"><div class="seccion-cabecera"><span class="numero-seccion" aria-hidden="true">2</span><div><h2 tabindex="-1">Plazos</h2><p>Compará lo programado con lo ejecutado.</p></div></div><div class="ef-plazos">${[['Programado','Programada','Programación'],['Ejecutado','Ejecutada','Ejecución']].map(([masc,fem,titulo])=>`<div class="ef-plazo" data-plazo="${masc}"><h3>${titulo}</h3>${campo('inicio'+masc,'Fecha de inicio',{tipo:'date'})}${campo('fin'+masc,'Fecha de finalización',{tipo:'date'})}${campo('duracion'+fem,fem==='Programada'?'Duración estimada (días)':'Duración de ejecución (días)',{decimal:true,ayuda:'Se proponen los días transcurridos entre las fechas, sin incluir el día inicial. Podés escribir el plazo registrado del proyecto.'})}<p class="ef-plazo-registrado" id="ef-plazo-${fem}" role="status" hidden></p></div>`).join('')}</div></section>
  <section class="tarjeta" id="ef-montos"><div class="seccion-cabecera"><span class="numero-seccion" aria-hidden="true">3</span><div><h2 tabindex="-1">Montos</h2><p>Ingresá ambos montos en colones.</p></div></div><div class="cuadricula-campos">${campo('montoProgramado','Monto programado (₡)',{decimal:true,placeholder:'Ejemplo: 1000000',ayuda:'Sin separadores de miles. Podés usar coma decimal.'})}${campo('montoEjecutado','Monto ejecutado (₡)',{decimal:true,placeholder:'Ejemplo: 1100000',ayuda:'Un espacio vacío queda pendiente. Escribí 0 si el monto real es cero.'})}</div></section>
  <section class="tarjeta" id="ef-resultados-seccion"><div class="seccion-cabecera"><span class="numero-seccion" aria-hidden="true">4</span><div><h2 tabindex="-1">Resultado y descarga</h2><p>Costo y tiempo tienen el mismo peso.</p></div><button type="button" class="boton secundario boton-previa" data-ef-accion="previa">Vista previa</button></div><div id="ef-resultados"></div><div id="ef-errores"></div><details class="complemento"><summary>Ver cómo se calcula la eficiencia</summary><div class="complemento-cuerpo"><p>La variación es (ejecutado − programado) ÷ programado. El indicador combina el 50 % del puntaje de tiempo y el 50 % del puntaje de costo.</p><p>Tiempo: sin aumento, 100 puntos; aumento menor al 20 %, 80; desde el 20 % y menor al 30 %, 60; desde el 30 % y menor al 40 %, 40; desde el 40 %, 20.</p><p>Costo: aumento menor al 20 %, 100 puntos; desde el 20 % hasta el 30 % inclusive, 75; mayor al 30 % y menor al 40 %, 50; desde el 40 %, 25.</p><p>La calificación es Muy Bueno desde 90, Bueno desde 80, Regular desde 70, Malo desde 40 y Muy Malo por debajo de 40.</p><p class="aviso">Se conservan las fórmulas de RESULTADOS de la plantilla 02. En costo, el 20 % exacto recibe 75 puntos y el 40 % exacto recibe 25. La hoja Listas describe esos dos límites de otra manera.</p></div></details><div class="acciones-finales"><button type="button" class="boton" data-ef-accion="guardar">Guardar proyecto</button><div class="botones"><button type="button" class="boton secundario" data-ef-accion="pdf">PDF del proyecto</button><button type="button" class="boton secundario" data-ef-accion="excel">Excel del proyecto</button></div></div></section></form>`;
 }
 function tarjeta(p){
  const h=encabezadoProyecto(p),r=calcularEficienciaProyecto(p),eliminado=!!p.eliminadoEn,completo=estadoProyectoEficiencia(p)==='completado';
  return `<article class="tarjeta formulario-guardado"><div class="formulario-cabecera"><div><span class="antetitulo">${e(p.anio||'Año pendiente')}</span><h2>${e(h.ruta)} · Sección ${e(h.seccion)}</h2><p>${e(p.trabajo||'Tipo de trabajo pendiente')}</p><p class="ayuda">${e(h.descripcion)}</p></div><span class="etiqueta ${eliminado?'papelera':completo?'lista':'pendiente'}">${eliminado?'En Papelera':completo?'Completado':'Borrador'}</span></div><p class="ef-resultado-lista">Eficiencia: <strong>${n(r.indice)}${r.calificacion?' · '+e(r.calificacion):''}</strong></p><div class="formulario-acciones">${eliminado?`<button type="button" class="boton" data-ef-restaurar="${e(p.id)}">Restaurar proyecto</button>`:`<button type="button" class="boton" data-ef-abrir="${e(p.id)}">Abrir proyecto</button><button type="button" class="boton eliminar" data-ef-eliminar="${e(p.id)}">Eliminar proyecto</button>`}</div></article>`;
 }
 function filtros(acciones=''){
  const total=visibles().length;
  return `<section class="tarjeta panel-filtros" aria-labelledby="ef-titulo-filtros">
   <h2 id="ef-titulo-filtros">Filtrar proyectos</h2>
   <div class="filtros-lista ${s.vista==='resumen'?'':'filtros-formularios'}">
    <div class="campo"><label for="ef-buscar-proyectos">Buscar</label><input type="search" id="ef-buscar-proyectos" placeholder="Ruta, sección, año o trabajo" value="${e(s.texto)}"></div>
    ${s.vista==='resumen'?'':`<div class="campo"><label for="ef-filtro">Estado</label><select id="ef-filtro">${[['activos','Proyectos activos'],['borrador','Borradores'],['completado','Completados'],['papelera','Papelera']].map(([id,nombre])=>`<option value="${id}" ${s.filtro===id?'selected':''}>${nombre}</option>`).join('')}</select></div>`}
   </div>
   ${pintarFiltroFechas({prefijo:'ef',...s,camposFecha:FECHAS_PROYECTO,descripcion:'Se incluyen ambos días según la fecha elegida. Con un rango activo, los proyectos sin esa fecha quedan fuera.'})}
   <div class="herramientas-listado"><p id="ef-conteo" class="resultado-contador" role="status">${total} ${total===1?'proyecto':'proyectos'}</p>${acciones}</div>
  </section>`;
 }
 function tarjetas(){
  const proyectos=visibles(),papelera=s.filtro==='papelera';
  return proyectos.length?proyectos.map(tarjeta).join(''):`<div class="vacio"><h2>No hay proyectos con este filtro</h2><p>${papelera?'Los proyectos eliminados pueden restaurarse aquí. Probá otras fechas o una búsqueda diferente.':'Cambiá la búsqueda, limpiá las fechas o creá un proyecto.'}</p></div>`;
 }
 function lista(){
  const sin=s.filtro==='papelera'||!visibles().length;
  const acciones=`<div class="botones ef-exportaciones">
   <button type="button" class="boton secundario boton-previa" data-ef-accion="previa" ${sin?'disabled':''}>Vista previa</button>
   <button type="button" class="boton secundario" data-ef-accion="excel" ${sin?'disabled':''}>Descargar filtrados (.xlsx)</button>
  </div>`;
  return filtros(acciones)+`<div id="ef-lista" class="lista-registros">${tarjetas()}</div>`;
 }
 function resultadosSeccion(){
  const grupos=resumirEficienciaSecciones(visibles()),filtrado=!!(s.desde||s.hasta||s.texto);
  return grupos.length?grupos.map(g=>`<section class="tarjeta"><span class="antetitulo">${e(g.anio||'Año pendiente')}</span><h2>${e(g.encabezado.ruta)} · Sección ${e(g.encabezado.seccion)}</h2><p>${e(g.encabezado.descripcion)}</p><div class="resultado ${g.indice===null?'pendiente':''}"><span>${filtrado?'Promedio de eficiencia de los proyectos filtrados':'Promedio de eficiencia de la sección'}</span><strong>${n(g.indice)}</strong><small>${e(g.calificacion||`${g.pendientes} proyecto(s) por completar`)}</small></div><p class="ayuda">${g.proyectos.length} proyecto(s). Se promedian los indicadores mostrados de esta sección y este año cuando todos están completos.</p><div class="botones">${g.proyectos.map(p=>`<button type="button" class="boton secundario" data-ef-abrir="${e(p.id)}">${e(p.trabajo||'Proyecto por completar')}</button>`).join('')}</div></section>`).join(''):'<div class="vacio"><h2>No hay proyectos para resumir con este filtro</h2><p>Cambiá la búsqueda o limpiá las fechas.</p></div>';
 }
 function resumen(){return filtros()+'<div id="ef-resumen" class="lista-registros">'+resultadosSeccion()+'</div>';}
 function pintarFiltrados(){
  const destino=document.getElementById(s.vista==='resumen'?'ef-resumen':'ef-lista');if(!destino)return;
  destino.innerHTML=s.vista==='resumen'?resultadosSeccion():tarjetas();
  const total=visibles().length;
  document.getElementById('ef-conteo').textContent=`${total} ${total===1?'proyecto':'proyectos'}`;
  refrescarFiltroFechas('ef',s,contenido);if(s.vista==='lista')actualizarBotonesLista();
 }
 function pintar(){
  if(!estaActiva())return;
  contenido.innerHTML=encabezado()+(s.vista==='nuevo'?buscador():s.vista==='editar'&&s.proyecto?formulario():s.vista==='resumen'?resumen():lista());
  pintarBusqueda();pintarResultados();indicador();
 }
 function pintarResultados(){
  if(!s.proyecto||s.vista!=='editar')return;
  const destino=document.getElementById('ef-resultados');if(!destino)return;
  const r=calcularEficienciaProyecto(s.proyecto),errores=erroresProyectoEficiencia(s.proyecto);
  destino.innerHTML=`<div class="resumen-indicadores">${[['Tiempo · 50 %',r.tiempo,'Variación: '+porcentaje(r.variacionTiempo)],['Costo · 50 %',r.costo,'Variación: '+porcentaje(r.variacionCosto)],['Eficiencia',r.indice,r.calificacion]].map(([titulo,valor,pie])=>`<div class="resultado ${valor===null?'pendiente':''}"><span>${titulo}</span><strong>${n(valor)}</strong><small>${e(pie||'Pendiente')}</small></div>`).join('')}</div>${pintarComparacionEficiencia(s.proyecto)}<p class="resultado-nota">${errores.length?`Datos por completar o corregir: ${errores.length}. Podés guardar el proyecto como borrador.`:'Proyecto completo. Podés revisar y descargar sus resultados.'}</p>`;
  const bloque=document.getElementById('ef-errores'),abierto=bloque.querySelector('details')?.open;
  bloque.innerHTML=pintarPendientesEficiencia(s.proyecto);
  const detalle=bloque.querySelector('details');if(detalle)detalle.open=!!abierto||s.mostrarErrores;
  for(const tipo of ['Programada','Ejecutada']){const nota=document.getElementById('ef-plazo-'+tipo);if(nota){nota.textContent=descripcionPlazoRegistrado(s.proyecto,tipo);nota.hidden=!nota.textContent;}}
  for(const input of contenido.querySelectorAll('[data-ef-campo]'))input.setAttribute('aria-invalid',String(s.mostrarErrores&&errores.some(x=>x.campo===input.dataset.efCampo)));
 }
 async function mostrar({rutaSugerida=null,proyectoId=null,pantalla=null}={}){
  const rev=++revision;if(rutaSugerida)s.rutaSugerida=rutaSugerida;
  try{
   if(!listaCargada){contenido.innerHTML='<p class="cargando" role="status">Abriendo los proyectos de Eficiencia…</p>';s.proyectos=await listarProyectos();listaCargada=true;}
   if(!estaActiva()||rev!==revision)return;
   if(proyectoId){
    const p=s.proyectos.find(p=>p.id===proyectoId);
    if(p&&!p.eliminadoEn){if(s.proyecto?.id!==proyectoId){s.proyecto=structuredClone(p);version=0;persistida=0;fallo=false;}s.vista=pantalla==='ruta'?'nuevo':'editar';s.corrigiendoRuta=pantalla==='ruta';}
    else{s.proyecto=null;s.vista='lista';s.filtro=p?'papelera':'activos';direccion(false);avisar(p?'Este proyecto está en la Papelera.':'No se encontró ese proyecto.');}
   }else{s.proyecto=null;s.vista=['nuevo','resumen'].includes(pantalla)?pantalla:'lista';s.corrigiendoRuta=false;}
   pintar();
  }catch(error){console.error(error);if(estaActiva())contenido.innerHTML='<div class="vacio"><h2>No se pudieron abrir los proyectos</h2><p>Conservá la página abierta y probá nuevamente.</p><button type="button" class="boton" data-ef-accion="reintentar">Volver a intentar</button></div>';}
 }
 async function abrir(id){if(!await guardar())return;const p=s.proyectos.find(p=>p.id===id&&!p.eliminadoEn);if(!p)return;s.proyecto=structuredClone(p);s.vista='editar';s.mostrarErrores=false;version=0;persistida=0;fallo=false;direccion();pintar();window.scrollTo({top:0,behavior:'instant'});}
 async function seleccionarRuta(id){
  const r=obtenerControl(id);if(!r||!await guardar())return;
  if(s.corrigiendoRuta&&s.proyecto){s.proyecto.control=referenciaControl(r);s.proyecto.actualizadoEn=new Date().toISOString();}
  else{s.proyecto=nuevoProyectoEficiencia(r);version=0;persistida=0;fallo=false;}
  s.vista='editar';s.corrigiendoRuta=false;s.mostrarErrores=false;version++;await guardar();direccion();pintar();window.scrollTo({top:0,behavior:'instant'});document.getElementById('ef-trabajo')?.focus();
 }
 async function descargar(formato){
  if(!await guardar())return;const proyectos=proyectosDocumento();if(!proyectos.length){avisar('No hay proyectos activos para descargar.');return;}
  if(formato==='previa'){await mostrarVistaPrevia({tipo:'eficiencia',proyectos,encabezado:{ruta:'Eficiencia',seccion:'02',unidad:'Proyectos'}},'eficiencia');return;}
  const bytes=formato==='excel'?await exportarExcelEficiencia(proyectos):await exportarPdfEficiencia(proyectos);
  descargarArchivo(bytes,`02_Eficiencia_${proyectos.length}_Proyecto${proyectos.length===1?'':'s'}.${formato==='excel'?'xlsx':'pdf'}`,formato==='excel'?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'application/pdf');
  avisar(formato==='excel'?'Excel de Eficiencia descargado.':'PDF de Eficiencia descargado.');
 }
 contenido.addEventListener('click',async evento=>{
  if(!estaActiva())return;
  const revisar=evento.target.closest('[data-revisar-dato]');if(revisar){enfocarPendiente(revisar.dataset.revisarDato);return;}
  const limpiar=evento.target.closest('[data-fechas-limpiar]');if(limpiar){s.desde='';s.hasta='';for(const clave of ['desde','hasta'])document.getElementById('ef-fecha-'+clave).value='';pintarFiltrados();return;}
  const b=evento.target.closest('button');if(!b||ocupado||!Object.keys(b.dataset).some(k=>k.startsWith('ef')))return;
  ocupado=true;const controles=[...contenido.querySelectorAll('button,input,select,textarea')].filter(x=>!x.disabled);controles.forEach(x=>x.disabled=true);contenido.setAttribute('aria-busy','true');
  try{
   if(b.dataset.efControl){await seleccionarRuta(b.dataset.efControl);return;}
   if(b.dataset.efAbrir){await abrir(b.dataset.efAbrir);return;}
   if(b.dataset.efEliminar){
    if(!await guardar())return;const p=s.proyectos.find(p=>p.id===b.dataset.efEliminar);if(!p)return;
    if(!await confirmar({titulo:'Eliminar proyecto',texto:`Se moverá a la Papelera el proyecto ${p.trabajo||'por completar'} de ${encabezadoProyecto(p).ruta}. Podés restaurarlo después.`,boton:'Mover a Papelera',peligro:true}))return;
    const nuevo=await papeleraProyecto(p.id);actualizarLista(nuevo);avisar('Proyecto movido a la Papelera.');pintar();return;
   }
   if(b.dataset.efRestaurar){actualizarLista(await papeleraProyecto(b.dataset.efRestaurar,false));s.filtro='activos';avisar('Proyecto restaurado con sus datos.');pintar();return;}
   const accion=b.dataset.efAccion;
   if(['excel','pdf','previa'].includes(accion)){await descargar(accion);return;}
   if(accion==='guardar'){s.mostrarErrores=true;pintarResultados();if(await guardar())avisar(erroresProyectoEficiencia(s.proyecto).length?'Borrador guardado. Podés completar los datos después.':'Proyecto guardado y completo.');return;}
   if(accion==='reintentar'){listaCargada=false;await mostrar();return;}
   if(!await guardar())return;
   if(accion==='nuevo'){s.proyecto=null;s.vista='nuevo';s.corrigiendoRuta=false;s.busqueda='';}
   if(accion==='lista'||accion==='resumen'){s.proyecto=null;s.vista=accion;s.corrigiendoRuta=false;}
   if(accion==='cambiar-ruta'){s.vista='nuevo';s.corrigiendoRuta=true;s.busqueda='';}
   if(accion==='volver')s.vista='editar';
   direccion();pintar();window.scrollTo({top:0,behavior:'instant'});
  }catch(error){console.error('Eficiencia:',error);avisar(error.message||'No se pudo completar la acción. Tus datos guardados se conservan.');}
  finally{controles.forEach(x=>{if(x.isConnected)x.disabled=false;});contenido.removeAttribute('aria-busy');ocupado=false;}
 });
 contenido.addEventListener('input',evento=>{
  if(!estaActiva())return;const input=evento.target;
  if(input.id==='ef-buscar-ruta'){s.busqueda=input.value;pintarBusqueda();return;}
  if(input.id==='ef-buscar-proyectos'){s.texto=input.value;pintarFiltrados();return;}
  if(input.dataset.fechasDesde||input.dataset.fechasHasta){s[input.dataset.fechasDesde?'desde':'hasta']=input.value;pintarFiltrados();return;}
  if(s.proyecto&&input.dataset.efCampo){
   cambiarCampoEficiencia(s.proyecto,input.dataset.efCampo,input.value);
   for(const campo of ['duracionProgramada','duracionEjecutada']){const nodo=document.getElementById('ef-'+campo);if(nodo&&nodo!==input)nodo.value=s.proyecto[campo];}
   cambio();pintarResultados();
  }
 });
 function actualizarBotonesLista(){const sin=s.filtro==='papelera'||!visibles().length;for(const b of contenido.querySelectorAll('[data-ef-accion="excel"],[data-ef-accion="previa"]'))b.disabled=sin;}
 contenido.addEventListener('change',evento=>{
  if(!estaActiva())return;const input=evento.target;
  if(input.id==='ef-filtro'){s.filtro=input.value;pintarFiltrados();return;}
  if(input.dataset.fechasCampo){s.campoFecha=input.value;pintarFiltrados();return;}
  if(input.dataset.fechasDesde||input.dataset.fechasHasta){s[input.dataset.fechasDesde?'desde':'hasta']=input.value;pintarFiltrados();}
 });
 contenido.addEventListener('submit',evento=>{if(evento.target.id==='formulario-eficiencia'){evento.preventDefault();s.mostrarErrores=true;pintarResultados();guardar();}});
 async function recargarSiLimpio(){
  if(!estaActiva()||pendientes()||ocupado||document.querySelector('dialog[open]'))return;
  const id=s.proyecto?.id,rev=revision;
  try{const proyectos=await listarProyectos();if(!estaActiva()||pendientes()||rev!==revision||s.proyecto?.id!==id)return;s.proyectos=proyectos;
   if(id){const actual=proyectos.find(p=>p.id===id&&!p.eliminadoEn);if(actual)s.proyecto=structuredClone(actual);else{s.proyecto=null;s.vista='lista';s.filtro='papelera';direccion(false);}}
   pintar();
  }catch(error){console.warn('No se actualizó Eficiencia:',error);}
 }
 return {mostrar,guardar,pendientes,recargarSiLimpio,fragmento};
}
