import {detallesEncabezado,resultadosFicha} from './modelo.js';
import {normalizarTexto} from './catalogo.js';
import {esProporcional,CRITERIOS_SV} from './seguridad.js';

const camposSV={erosion:['Desnivel entre corona y espaldón',null,'erosion'],estabilidad:['Estabilidad y drenaje','estabilidad','estabilidadCm'],vegetacion:['Vegetación','vegetacion','vegetacionNota'],senalamiento:['Señalamiento vertical','senalamiento','senalamientoNota']};
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

// Sólo consulta las reglas existentes: no guarda, rellena ni altera mediciones.
export function revisarFicha(ficha,{partes=['datos','urci','seguridad'],codigoRepetido=false,resultados}={}) {
  const r=resultados||resultadosFicha(ficha),pendientes=[],encabezado=detallesEncabezado(ficha);
  if(partes.includes('datos')){
    pendientes.push(...encabezado.map(p=>({...p,titulo:'Datos de la muestra'})));
    if(codigoRepetido)pendientes.push({titulo:'Unidad de muestra',selector:'#u-codigo',mensaje:'Otra muestra de este formulario tiene el mismo identificador.'});
  }
  if(partes.includes('urci')&&r.urci.estado!=='calculado'){
    const porDeterioro=new Map();
    for(const mensaje of r.urci.motivos){
      // Estos dos problemas ya están descritos con su campo exacto arriba.
      if(partes.includes('datos')&&encabezado.some(p=>['#u-longitud','#u-ancho'].includes(p.selector))&&mensaje==='Completá un área válida mayor que cero.')continue;
      if(partes.includes('datos')&&encabezado.some(p=>p.selector==='[data-confirmar-superficie]')&&mensaje==='Confirmá que la sección sea no pavimentada.')continue;
      const codigo=/^(\d{2})\s/.exec(mensaje)?.[1]||/deterioro (\d{2})/.exec(mensaje)?.[1]||(mensaje==='Seleccioná una sola severidad de polvo.'?'84':null);
      if(codigo){
        if(!porDeterioro.has(codigo))porDeterioro.set(codigo,[]);
        porDeterioro.get(codigo).push(mensaje);
      }else pendientes.push({titulo:'Cálculo de transitabilidad',mensaje,selector:r.urci.estado==='fuera_rango'?'#detalle-calculo':'#deterioros'});
    }
    for(const [codigo,mensajes] of porDeterioro){
      const fila=r.urci.filas.find(f=>f.codigo===codigo&&f.motivo&&f.motivo!=='Evaluación pendiente');
      pendientes.push({titulo:`Deterioro ${codigo}`,mensaje:mensajes.join(' '),selector:fila&&codigo!=='84'?`#cantidad-${codigo}-${fila.severidad}`:`#dano-${codigo}`});
    }
  }
  if(partes.includes('seguridad')){
    const datos=ficha.i.seguridadVial||{};
    for(const [aspecto,[titulo,seleccion,campo]] of Object.entries(camposSV)){
      if(r.seguridad[aspecto]!==null)continue;
      if(!esProporcional(datos)){
        pendientes.push({titulo,mensaje:'Actualizá esta evaluación para completar los datos pendientes.',selector:'[data-sv-actualizar]'});continue;
      }
      const faltaSeleccion=aspecto!=='erosion'&&!CRITERIOS_SV[aspecto].some(o=>o.id===datos[seleccion]),detalle=r.seguridad.detalle[aspecto];
      pendientes.push({titulo,selector:`#sv-${faltaSeleccion?seleccion:campo}`,mensaje:detalle.error||(faltaSeleccion?'Elegí la condición observada.':['erosion','estabilidad'].includes(aspecto)?'Ingresá la medida observada en centímetros.':detalle.ayuda)});
    }
  }
  return {completa:pendientes.length===0,pendientes};
}

export function pintarRevision(revision,{soloLectura=false}={}) {
  if(revision.completa)return '<p class="revision-completa">Esta muestra tiene todos sus datos completos.</p>';
  return `<details class="complemento revision-datos"><summary>Revisar datos pendientes (${revision.pendientes.length})</summary><div class="complemento-cuerpo"><ul class="revision-lista">${revision.pendientes.map(p=>`<li><div><strong>${e(p.titulo)}</strong><p>${e(p.mensaje)}</p></div><button type="button" class="boton secundario" data-revisar-dato="${e(p.selector)}" aria-label="Revisar ${e(p.titulo)}" ${soloLectura?'disabled':''}>Revisar</button></li>`).join('')}</ul><p class="ayuda">Los informes con datos pendientes se descargan con «Borrador» en su nombre.</p></div></details>`;
}

export function enfocarPendiente(selector,raiz=document) {
  const destino=raiz.querySelector(selector);if(!destino)return false;
  for(let p=destino.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
  const directo=destino.matches('input,select,textarea,button');
  const foco=directo?destino:destino.querySelector('input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)')||destino;
  if(!foco.matches('input,select,textarea,button'))foco.setAttribute('tabindex','-1');
  destino.scrollIntoView({behavior:'smooth',block:'center'});foco.focus({preventScroll:true});return true;
}

// Se revisan sólo las muestras y secciones que realmente contiene cada entrega.
// Las curvas individuales son una consulta parcial de las mediciones actuales.
export function revisarDocumento(documento,{formato='pdf',secciones}={}) {
  if(documento.tipo==='eficiencia')return {borrador:false,pendientes:[]};
  if(documento.bloques){
    const pendientes=documento.bloques.flatMap(b=>revisarDocumento(b,{formato,secciones}).pendientes);
    return {borrador:pendientes.length>0,pendientes};
  }
  const paginas=new Set(formato==='xlsx'?['urci','seguridad','resumen']:secciones||(documento.tipo==='ficha'?['urci','seguridad','resumen']:['resumen']));
  if(paginas.size===1&&paginas.has('graficas'))return {borrador:false,pendientes:[]};
  const resumen=paginas.has('resumen'),partes=['datos'];
  if(paginas.has('urci')||resumen)partes.push('urci');
  if(paginas.has('seguridad')||resumen)partes.push('seguridad');
  const contexto=(documento.muestras||documento.fichas||[documento.ficha].filter(Boolean)).filter(f=>!f.u.eliminadaEn);
  let fichas=formato==='xlsx'?contexto:resumen?(documento.fichas||contexto.filter(f=>f.u.seleccion==='seleccionada')):[];
  if(documento.ficha&&(paginas.has('urci')||paginas.has('seguridad')))fichas=[...fichas,documento.ficha];
  const conteo=new Map();for(const f of contexto){const c=normalizarTexto(f.u.codigo);if(c)conteo.set(c,(conteo.get(c)||0)+1);}
  const vistas=new Set(),pendientes=[];
  for(const f of fichas){
    if(f.u.eliminadaEn||vistas.has(f.u.id))continue;vistas.add(f.u.id);
    const r=revisarFicha(f,{partes,codigoRepetido:(conteo.get(normalizarTexto(f.u.codigo))||0)>1});
    pendientes.push(...r.pendientes.map(p=>({...p,unidadId:f.u.id,muestra:f.u.codigo||'Sin identificar'})));
  }
  if(resumen&&(!documento.resumen?.[2]?.filas||documento.resumen[2].filas.some(f=>!Number.isFinite(f[1]))))pendientes.push({titulo:'Resumen de sección',mensaje:'Faltan resultados de las muestras seleccionadas.',selector:'#resultados'});
  return {borrador:pendientes.length>0,pendientes};
}

export function nombreInforme(base,documento,opciones={}) {
  const nombre=String(base).replace(/[^\p{L}\p{N}._-]/gu,'_');
  return nombre+(revisarDocumento(documento,opciones).borrador&&!/_Borrador$/i.test(nombre)?'_Borrador':'');
}
