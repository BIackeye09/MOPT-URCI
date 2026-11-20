import {
  CRITERIOS_SV, calcularSeguridad, esProporcional, rangoSeguridad,
  criteriosSeguridad, nivelErosion
} from './seguridad.js';

const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[c]);
const titulos = {
  erosion: 'Desnivel entre corona y espaldón',
  estabilidad: 'Estabilidad y drenaje',
  vegetacion: 'Vegetación',
  senalamiento: 'Señalamiento vertical'
};
const formato = numero => numero.toLocaleString('es-CR', {maximumFractionDigits: 2});

function condicionActual(datos, aspecto, opciones) {
  const id = aspecto === 'erosion' ? nivelErosion(datos.erosion) : datos[aspecto];
  return opciones.find(opcion => opcion.id === id);
}

function pintarPuntaje(puntaje, condicion, error = '') {
  if (error) return '<span class="sv-estado sv-estado-error">Revisar dato</span>';
  if (puntaje === null) return '<span class="sv-estado">Por completar</span>';
  const estado = condicion ? `<span class="sv-estado sv-estado-${condicion.id}">${escapar(condicion.nombre)}</span>` : '';
  return `<span class="sv-valor"><strong>${formato(puntaje)}</strong> <small>/ 100</small></span>${estado}`;
}

function notaDeAspecto(aspecto, contenido) {
  const medida = aspecto === 'erosion' || aspecto === 'estabilidad';
  return `<div class="sv-resultado">
    <span class="sv-tipo-nota">${medida ? 'Nota calculada' : 'Nota registrada'}</span>
    <output id="puntaje-${aspecto}" class="sv-puntaje">${contenido}</output>
  </div>`;
}

function ayudaDeAspecto(aspecto, condicion, rango) {
  if (aspecto === 'erosion') {
    return rango?.texto || 'La condición y la nota se calculan a partir del desnivel.';
  }
  if (!condicion) return 'Elegí la condición observada para habilitar el campo.';
  if (aspecto === 'estabilidad') return rango.texto;
  return `Nota permitida de ${rango.min} a ${rango.max} puntos.`;
}

function pintarAspecto(datos, aspecto, titulo, resultado, bloqueada) {
  const automatico = aspecto === 'erosion';
  const medida = automatico || aspecto === 'estabilidad';
  const campo = automatico ? 'erosion' : medida ? 'estabilidadCm' : aspecto + 'Nota';
  const opciones = criteriosSeguridad(datos, aspecto);
  const condicion = condicionActual(datos, aspecto, opciones);
  const rango = rangoSeguridad(datos, aspecto);
  const error = resultado.detalle[aspecto].error;
  const deshabilitado = bloqueada ? 'disabled' : '';
  const selector = automatico ? '' : `<div class="campo">
    <label for="sv-${aspecto}">Condición observada</label>
    <select id="sv-${aspecto}" data-seguridad="${aspecto}" aria-describedby="criterio-${aspecto}" ${deshabilitado}>
      <option value="">Elegí una condición</option>
      ${opciones.map(opcion => `<option value="${opcion.id}" ${opcion.id === datos[aspecto] ? 'selected' : ''}>${escapar(opcion.nombre)}</option>`).join('')}
    </select>
  </div>`;
  const colapso = aspecto === 'estabilidad' ? `<label class="sv-colapso" id="sv-colapso-control" ${datos.estabilidad === 'muy_malo' ? '' : 'hidden'}>
    <input type="checkbox" id="sv-estabilidadColapso" data-seguridad="estabilidadColapso" ${datos.estabilidadColapso ? 'checked' : ''} ${deshabilitado}>
    Hay colapso del espaldón o del drenaje
  </label>` : '';
  return `<section class="sv-aspecto" aria-labelledby="titulo-${aspecto}">
    <h3 id="titulo-${aspecto}">${titulo}</h3>
    <div class="sv-cuerpo">
      <div class="sv-campos${automatico ? ' sv-campos-uno' : ''}">
        ${selector}
        <div class="campo">
          <label for="sv-${campo}">${medida ? 'Medida observada (cm)' : 'Nota del inspector'}</label>
          <input id="sv-${campo}" data-seguridad="${campo}" value="${escapar(datos[campo])}" inputmode="decimal" maxlength="64" autocomplete="off"
            aria-describedby="rango-${aspecto} error-${aspecto}" aria-invalid="${Boolean(error)}"
            ${bloqueada || (!automatico && !condicion) ? 'disabled' : ''}>
        </div>
      </div>
      ${automatico ? '' : `<p id="criterio-${aspecto}" class="sv-criterio" ${condicion ? '' : 'hidden'}>${escapar(textoCriterio(aspecto, condicion))}</p>`}
      ${colapso}
      <p id="rango-${aspecto}" class="sv-ayuda">${escapar(ayudaDeAspecto(aspecto, condicion, rango))}</p>
      <p id="error-${aspecto}" class="sv-error" aria-live="polite" ${error ? '' : 'hidden'}>${escapar(error)}</p>
    </div>
    ${notaDeAspecto(aspecto, pintarPuntaje(resultado[aspecto], condicion, error))}
  </section>`;
}

function textoCriterio(aspecto, condicion) {
  if (!condicion) return '';
  if (aspecto === 'estabilidad') return condicion.texto;
  return CRITERIOS_SV[aspecto].find(opcion => opcion.id === condicion.id).texto;
}

export function pintarSeguridad(datos = {}, bloqueada = false) {
  const resultado = calcularSeguridad(datos);
  if (!esProporcional(datos)) {
    const aspectos = Object.entries(titulos).map(([aspecto, titulo]) => {
      const condicion = condicionActual(datos, aspecto, CRITERIOS_SV[aspecto]);
      const observacion = aspecto === 'erosion' && String(datos.erosion ?? '').trim()
        ? `${datos.erosion} cm` : condicion?.texto || '';
      return `<section class="sv-aspecto" aria-labelledby="titulo-${aspecto}">
        <h3 id="titulo-${aspecto}">${titulo}</h3>
        ${observacion ? `<div class="sv-cuerpo"><p class="sv-criterio">${escapar(observacion)}</p></div>` : ''}
        ${notaDeAspecto(aspecto, pintarPuntaje(resultado[aspecto], condicion))}
      </section>`;
    }).join('');
    return `<div class="aviso sv-anterior">
      <p>Esta evaluación conserva las puntuaciones anteriores. Podés actualizarla para registrar centímetros y calificaciones manuales.</p>
      <button type="button" class="boton secundario" data-sv-actualizar ${bloqueada ? 'disabled' : ''}>Actualizar evaluación de seguridad vial</button>
    </div><div class="preguntas-seguridad">${aspectos}</div>`;
  }
  const aspectos = Object.entries(titulos).map(([aspecto, titulo]) =>
    pintarAspecto(datos, aspecto, titulo, resultado, bloqueada)).join('');
  return `<p class="sv-instrucciones">Podés usar coma o punto en los decimales de las medidas y notas.</p>
    <div class="preguntas-seguridad">${aspectos}</div>`;
}

export function refrescarSeguridad(datos, bloqueada = false, raiz = document) {
  if (!esProporcional(datos)) return;
  const resultado = calcularSeguridad(datos);
  for (const aspecto of Object.keys(titulos)) {
    const automatico = aspecto === 'erosion';
    const medida = automatico || aspecto === 'estabilidad';
    const campo = automatico ? 'erosion' : medida ? 'estabilidadCm' : aspecto + 'Nota';
    const condicion = condicionActual(datos, aspecto, criteriosSeguridad(datos, aspecto));
    const rango = rangoSeguridad(datos, aspecto);
    const mensaje = resultado.detalle[aspecto].error;
    const criterio = raiz.getElementById('criterio-' + aspecto);
    if (criterio) {
      criterio.textContent = textoCriterio(aspecto, condicion);
      criterio.hidden = !condicion;
    }
    const ayuda = raiz.getElementById('rango-' + aspecto);
    if (ayuda) ayuda.textContent = ayudaDeAspecto(aspecto, condicion, rango);
    const error = raiz.getElementById('error-' + aspecto);
    if (error) {
      error.textContent = mensaje;
      error.hidden = !mensaje;
    }
    const salida = raiz.getElementById('puntaje-' + aspecto);
    if (salida) {
      const contenido = pintarPuntaje(resultado[aspecto], condicion, mensaje);
      if (salida.innerHTML !== contenido) salida.innerHTML = contenido;
    }
    const entrada = raiz.getElementById('sv-' + campo);
    if (entrada) {
      entrada.disabled = bloqueada || (!automatico && !condicion);
      entrada.setAttribute('aria-invalid', String(Boolean(mensaje)));
      entrada.setCustomValidity(mensaje);
      entrada.setAttribute('data-min', String(rango?.min ?? 0));
      if (rango?.max != null || !medida) entrada.setAttribute('data-max', String(rango?.max ?? 100));
      else entrada.removeAttribute('data-max');
    }
  }
  const colapso = raiz.getElementById('sv-colapso-control');
  if (colapso) colapso.hidden = datos.estabilidad !== 'muy_malo';
  const check = raiz.getElementById('sv-estabilidadColapso');
  if (check) check.checked = datos.estabilidadColapso === true;
}
