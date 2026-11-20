import { exportarPdf, descargarArchivo } from './exportadores.js';
import { exportarPdfEficiencia } from './eficiencia-exportadores.js';
import { nombreInforme, revisarDocumento } from './revision.js';

export const FORMULARIOS_PREVIA = {urci:'Formulario URCI',graficas:'Curvas de esta muestra',seguridad:'Seguridad vial',resumen:'Niveles de transitabilidad y seguridad vial',eficiencia:'Formulario y resultados de Eficiencia'};
export function seccionesPrevia(documento,seccion) {
  if(documento.tipo==='eficiencia'){if(seccion!=='eficiencia')throw new Error('Formulario no disponible.');return ['eficiencia'];}
  if(seccion==='eficiencia')throw new Error('Formulario no disponible.');
  if(!Object.hasOwn(FORMULARIOS_PREVIA,seccion)||documento.tipo!=='ficha'&&seccion!=='resumen')throw new Error('Formulario no disponible.');
  return [seccion];
}
let modal,documentoActual,seccionActual,bytesActuales,pdfActual,tareaActual,revision=0;
let rendererPromise;
async function renderer() {
  if(!rendererPromise)rendererPromise=import('./vendor/pdf.min.mjs').then(pdfjs=>{
    pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.min.mjs',import.meta.url).href;
    return pdfjs;
  }).catch(error=>{rendererPromise=null;throw error;});
  return rendererPromise;
}
function prepararDialogo() {
  if(modal)return;
  modal=document.createElement('dialog');modal.id='vista-previa';modal.className='vista-previa';modal.setAttribute('aria-labelledby','vista-previa-titulo');
  modal.innerHTML=`<div class="previa-cabecera"><div><span class="antetitulo">Vista previa del PDF</span><h2 id="vista-previa-titulo"></h2></div><button type="button" class="boton secundario" data-previa-cerrar>Volver al formulario</button></div><p class="previa-aviso">Se muestra el mismo PDF que podés descargar, con los datos actuales. Los espacios sin completar se conservan en blanco.</p><div class="previa-herramientas"><div class="botones" role="group" aria-label="Formulario de la vista previa">${Object.entries(FORMULARIOS_PREVIA).map(([id,nombre])=>`<button type="button" class="boton secundario" data-previa-seccion="${id}" aria-pressed="false">${id==='resumen'?'Resumen de sección':nombre}</button>`).join('')}</div><div class="botones"><button type="button" class="boton" data-previa-descargar disabled>Descargar este PDF</button></div></div><p id="previa-estado" class="previa-estado" role="status"></p><div id="previa-paginas" class="previa-paginas" role="region" aria-label="Páginas del formulario" tabindex="0" autofocus></div>`;
  document.body.appendChild(modal);
  const paginas = modal.querySelector('#previa-paginas');
  modal.addEventListener('keydown', evento => {
    if (evento.defaultPrevented || evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
    if (evento.key !== 'ArrowUp' && evento.key !== 'ArrowDown') return;
    evento.preventDefault();
    paginas.scrollTop += evento.key === 'ArrowUp' ? -40 : 40;
  });
  modal.querySelector('[data-previa-cerrar]').addEventListener('click',()=>modal.close());
  modal.addEventListener('close',()=>{revision++;bytesActuales=null;tareaActual?.cancel();pdfActual?.destroy();pdfActual=null;modal.querySelector('#previa-paginas').replaceChildren();});
  modal.querySelector('[data-previa-descargar]').addEventListener('click',()=>{
    if(!bytesActuales)return;
    const h=documentoActual.encabezado,nombre=`${h.formulario?h.formulario+'_':''}${h.ruta}_${h.seccion}_${h.unidad||'Muestra_sin_identificar'}_${seccionActual}`.replace(/[^\p{L}\p{N}._-]/gu,'_');
    descargarArchivo(bytesActuales,`${nombreInforme(nombre,documentoActual,{formato:'pdf',secciones:[seccionActual]})}.pdf`,'application/pdf');
  });
  for(const b of modal.querySelectorAll('[data-previa-seccion]'))b.addEventListener('click',()=>cargar(b.dataset.previaSeccion));
  let redimension;
  window.addEventListener('resize',()=>{clearTimeout(redimension);if(modal.open)redimension=setTimeout(()=>cargar(seccionActual),180);});
}
async function cargar(seccion) {
  const id=++revision,secciones=seccionesPrevia(documentoActual,seccion);
  const borrador=revisarDocumento(documentoActual,{formato:'pdf',secciones}).borrador;
  modal.querySelector('.previa-aviso').textContent=borrador?'Esta sección tiene datos o resultados pendientes. La descarga llevará «Borrador» en su nombre; los campos sin completar permanecen en blanco.':'Se muestra el mismo PDF que podés descargar, con los datos actuales. Los espacios sin completar se conservan en blanco.';
  seccionActual=seccion;bytesActuales=null;
  tareaActual?.cancel();pdfActual?.destroy();pdfActual=null;
  const boton=modal.querySelector('[data-previa-descargar]'),estado=modal.querySelector('#previa-estado'),paginas=modal.querySelector('#previa-paginas');
  boton.disabled=true;paginas.replaceChildren();estado.textContent='Preparando la vista previa…';paginas.setAttribute('aria-busy','true');
  modal.querySelector('#vista-previa-titulo').textContent=FORMULARIOS_PREVIA[seccion];
  for(const b of modal.querySelectorAll('[data-previa-seccion]')){
    b.hidden=documentoActual.tipo==='eficiencia'?b.dataset.previaSeccion!=='eficiencia':b.dataset.previaSeccion==='eficiencia'||documentoActual.tipo!=='ficha'&&b.dataset.previaSeccion!=='resumen';
    b.setAttribute('aria-pressed',String(b.dataset.previaSeccion===seccion));
  }
  try{
    const bytes=documentoActual.tipo==='eficiencia'?await exportarPdfEficiencia(documentoActual.proyectos):await exportarPdf(documentoActual,{secciones});
    if(id!==revision||!modal.open)return;
    bytesActuales=bytes;boton.disabled=false;
    const pdfjs=await renderer();
    if(id!==revision||!modal.open)return;
    const pdf=await pdfjs.getDocument({data:bytes.slice(),isEvalSupported:false}).promise;
    if(id!==revision||!modal.open){await pdf.destroy();return;}
    pdfActual=pdf;
    const estilo=getComputedStyle(paginas),anchoDisponible=Math.max(160,paginas.clientWidth-parseFloat(estilo.paddingLeft)-parseFloat(estilo.paddingRight));
    for(let k=1;k<=pdf.numPages;k++){
      if(id!==revision||!modal.open)return;
      const page=await pdf.getPage(k),base=page.getViewport({scale:1}),scale=anchoDisponible/base.width,ancho=base.width*scale,dpi=Math.min(2,window.devicePixelRatio||1);
      const viewport=page.getViewport({scale:scale*dpi}),canvas=document.createElement('canvas'),hoja=document.createElement('figure');
      hoja.className='previa-hoja';hoja.style.width=`${ancho}px`;
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.width='100%';canvas.style.height='auto';
      canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${FORMULARIOS_PREVIA[seccion]}, página ${k} de ${pdf.numPages}. Usá Descargar este PDF para consultar su texto.`);
      const pie=document.createElement('figcaption');pie.textContent=`Página ${k} de ${pdf.numPages}`;
      hoja.append(canvas,pie);paginas.appendChild(hoja);
      tareaActual=page.render({canvasContext:canvas.getContext('2d'),viewport});await tareaActual.promise;tareaActual=null;
    }
    if(id===revision)estado.textContent=`${pdf.numPages} página${pdf.numPages===1?'':'s'} · Ajustada al ancho`;
  }catch(error){
    if(id!==revision||!modal.open)return;
    console.error('No se pudo mostrar la vista previa:',error);
    estado.textContent=bytesActuales?'No se pudo dibujar la vista previa. Podés descargar este mismo PDF.':'No se pudo preparar la vista previa. Cerrá e intentá nuevamente.';
  }finally{if(id===revision)paginas.setAttribute('aria-busy','false');}
}
export async function mostrarVistaPrevia(documento,seccion='urci') {
  seccionesPrevia(documento,seccion);prepararDialogo();documentoActual=documento;
  if(!modal.open)modal.showModal();
  await cargar(seccion);
}
