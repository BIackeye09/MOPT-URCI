/* Curvas originales y lecturas aproximadas del motor métrico v0.6. */
import { CURVAS } from './curvas-datos.js';
import { DETERIOROS, NIVELES_HOJA, tipoDeterioro, totalNivel, unidadCompatible, polvoSeleccionado, cantidadPositiva, cantidadValida, DEDUCCION_POLVO, densidadTexto } from './frente.js';
import { calcularInspeccion, leerDeduccion, puntoEnGrafica, coordenadasEnGrafica } from './motor-urci.js';
import { TRAZADOS } from './motor-curvas.js';
const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const COLORES = { B: '#097d86', M: '#315fd2', A: '#c85233' };
const numero = texto => Number(String(texto ?? '').trim().replace(',', '.'));
const formato = n => Number.isFinite(n) ? n.toLocaleString('es-CR', { maximumFractionDigits: 2 }) : '—';

/** Coordenada de una densidad dentro del eje original. Nunca extrapola. */
export function posicionDensidad(curva, densidad) {
  if (!Number.isFinite(densidad) || densidad < 0 || densidad > curva.maxX) return null;
  return curva.izquierda + densidad / curva.maxX * (curva.derecha - curva.izquierda);
}

/** Genera guías solo con datos activos, válidos, en las unidades correctas. */
export function datosGuias(inspeccion, unidad, codigo) {
  const d = inspeccion.deterioros[codigo];
  if (!d || codigo === '84' || codigo === 'urci') return [];
  const curva = CURVAS[codigo];
  return NIVELES_HOJA.map(n => {
    const nivel = d.niveles[n.id], cantidad = totalNivel(nivel);
    let motivo = '', densidad = null;
    if (d.estado === 'sin_deterioro') motivo = 'Sin deterioro confirmado';
    else if (!cantidad.trim()) motivo = 'Sin cantidad registrada';
    else if (d.estado !== 'con_deterioro') motivo = 'Evaluación pendiente';
    else if (!cantidadValida(cantidad) || !cantidadPositiva(cantidad)) motivo = 'Revisá la cantidad';
    else if (!unidadCompatible(codigo, nivel)) motivo = `Revisá la unidad: debe ser ${tipoDeterioro(codigo).unidad}`;
    else if (!cantidadPositiva(unidad.areaM2)) motivo = 'Completá un área válida mayor que cero';
    else {
      densidad = numero(cantidad) / numero(unidad.areaM2) * 100;
      if (!Number.isFinite(densidad)) { motivo = 'Valor fuera del rango numérico'; densidad = null; }
      else if (posicionDensidad(curva, densidad) === null) motivo = `Fuera del eje del manual (0–${curva.maxX})`;
    }
    const deduccion = motivo ? null : leerDeduccion(codigo, n.id, densidad);
    return { ...n, cantidad, densidad, deduccion, densidadTexto: densidad !== null ? densidadTexto(cantidad, unidad.areaM2) : '', motivo, color: COLORES[n.id], x: motivo ? null : posicionDensidad(curva, densidad) };
  });
}

function estadoOpciones(actual) {
  return [['pendiente','Pendiente'],['sin_deterioro','Sin deterioro'],['con_deterioro','Con deterioro']].map(([v,t]) => `<option value="${v}" ${actual === v ? 'selected' : ''}>${t}</option>`).join('');
}

export function pintarGraficas(i, u, codigo = '81', bloqueado = false) {
  const d = i.deterioros[codigo], tipo = tipoDeterioro(codigo);
  const disabled = bloqueado ? 'disabled' : '';
  const opciones = [...DETERIOROS.map(t => [t.codigo, `${t.codigo} · ${t.nombre}`]), ['urci','Curva URCI · Figura C-8']];
  return `<section class="graficas-tm" aria-label="Gráficas del TM 5-626">
    <div class="graficas-encabezado"><div><span class="eyebrow">TM 5-626 · APÉNDICE C</span><h2>Curvas y mediciones de la muestra</h2><p>Las guías de color se actualizan con las cantidades y el área de esta ficha.</p></div><div class="field"><label for="selector-grafica">Gráfica</label><select id="selector-grafica" data-selector-grafica>${opciones.map(([v,t]) => `<option value="${v}" ${codigo === v ? 'selected' : ''}>${escapar(t)}</option>`).join('')}</select></div></div>
    <div class="grafica-area"><span>Área de muestra</span><strong>${escapar((u.areaM2 || 'Sin definir').replace('.', ','))} ${u.areaM2 ? 'm²' : ''}</strong><button class="btn btn-sm btn-outline" data-accion="pestana" data-pestana="urci">Volver a la hoja delantera</button></div>
    <div class="grafica-resumen" data-grafica-resumen role="status"></div>
    <div class="graficas-layout ${codigo === 'urci' ? 'solo-grafica' : ''}"><div class="grafica-panel"><div class="grafica-dibujo" data-grafica-dibujo></div><p class="grafica-ejes">${codigo === '84' ? 'Horizontal: severidad · Vertical: valor deducible' : codigo === 'urci' ? 'Horizontal: valor deducible total (VDT) · Vertical: URCI' : 'Horizontal: densidad · Vertical: valor deducible'}</p><p class="grafica-lectura" data-lectura-cursor aria-live="polite">${codigo === '84' ? 'El polvo usa valores fijos, sin densidad.' : 'Tocá o mové el cursor sobre la cuadrícula para explorar sus ejes.'}</p></div>
    ${codigo !== 'urci' ? `<aside class="grafica-mediciones"><h3>${escapar(codigo)}. ${escapar(tipo.nombre)}</h3><label for="estado-grafica">Evaluación del deterioro</label><select id="estado-grafica" aria-label="Estado en la gráfica ${codigo}" data-deterioro="${codigo}" data-deterioro-campo="estado" ${disabled}>${estadoOpciones(d.estado)}</select>
      ${codigo === '84' ? `<p>Seleccioná una sola severidad.</p><div class="polvo-opciones">${NIVELES_HOJA.map(n => `<button class="btn ${d.estado === 'con_deterioro' && polvoSeleccionado(d) === n.id ? 'btn-primary' : 'btn-outline'}" data-accion="marcar-polvo" data-severidad="${n.id}" aria-label="Polvo severidad ${n.letra}" aria-pressed="${d.estado === 'con_deterioro' && polvoSeleccionado(d) === n.id}" ${disabled}>${n.letra} · ${n.nombre}</button>`).join('')}</div>` : NIVELES_HOJA.map(n => {
        const nivel = d.niveles[n.id];
        return `<div class="grafica-entrada"><label for="grafica-${codigo}-${n.id}"><span class="color-nivel" style="background:${COLORES[n.id]}"></span>${n.letra} · ${n.nombre}<span>${tipo.unidad}</span></label><input id="grafica-${codigo}-${n.id}" aria-label="Cantidad ${codigo} severidad ${n.letra}" value="${escapar(d.estado === 'sin_deterioro' ? '' : totalNivel(nivel))}" data-nivel="${codigo}:${n.id}" data-nivel-campo="total" inputmode="decimal" maxlength="64" ${nivel.modo === 'detalles' ? 'readonly title="Total de las mediciones individuales"' : ''} ${disabled || (d.estado === 'sin_deterioro' ? 'disabled' : '')}><div data-resultado-guia="${n.id}" class="guia-resultado"></div></div>`;
      }).join('')}
      <p class="small-help">Los cambios se guardan en la misma ficha. Se utiliza la modalidad de medición activa.</p></aside>` : ''}</div>
    <div class="grafica-explicacion">${codigo === '84' ? '<strong>Figura C-4.</strong> Valores fijos del polvo: L = 2, M = 4 y H = 15. La barra de color señala la severidad seleccionada.' : codigo === 'urci' ? '<strong>Figura C-8.</strong> El punto de color ubica el VDT y el URCI aproximado de esta muestra. Se aplica q = número de deducciones mayores que 5, según el paso 3-4.b(3); el rótulo original de esta figura dice iguales o mayores que 5. El resultado utiliza la lectura sin redondear y se presenta como entero.' : `<strong>Lectura aproximada sobre la figura ${CURVAS[codigo].figura}.</strong> Cada punto de color muestra la intersección de la densidad con el trazo digitalizado L, M o H. Las guías horizontal y vertical permiten contrastar el valor deducible con la figura original.`}</div>
    <div class="grafica-fuente">Fuente: Department of the Army, <em>TM 5-626, Unsurfaced Road Maintenance Management</em>, 16 de enero de 1995. ${codigo === '84' ? 'Figura C-4, página C-3.' : `Figura ${CURVAS[codigo].figura}, sistema ${CURVAS[codigo].sistema}.`} <a href="https://www.wbdg.org/FFC/ARMYCOE/COETM/tm_5_626.pdf#page=${codigo === '84' ? 44 : CURVAS[codigo].pagina}" target="_blank" rel="noopener">Ver manual original</a></div>
  </section>`;
}

function pintarPolvo(i) {
  const d = i.deterioros['84'], seleccionado = d.estado === 'con_deterioro' ? polvoSeleccionado(d) : '';
  return `<svg viewBox="0 0 760 430" role="img" aria-label="Figura C-4. Valores fijos del polvo, con la severidad seleccionada resaltada"><title>Polvo: L 2, M 4 y H 15 puntos</title><rect width="760" height="430" fill="white"/><text x="60" y="35" class="svg-titulo">84 · Polvo · Valor deducible fijo</text>${[0,5,10,15].map(v => {const y=345-v/15*260; return `<line x1="80" x2="710" y1="${y}" y2="${y}" stroke="#e1e8ee"/><text x="65" y="${y+5}" text-anchor="end" class="svg-etiqueta">${v}</text>`;}).join('')}${NIVELES_HOJA.map((n,indice) => {const v=DEDUCCION_POLVO[n.id], h=v/15*260, x=155+indice*195;return `<g><rect x="${x}" y="${345-h}" width="110" height="${h}" rx="5" fill="${seleccionado === n.id ? COLORES[n.id] : '#cbd7df'}"/><text x="${x+55}" y="${332-h}" text-anchor="middle" class="svg-valor">${v}</text><text x="${x+55}" y="378" text-anchor="middle" class="svg-etiqueta">${n.letra} · ${n.nombre}</text>${seleccionado === n.id ? `<text x="${x+55}" y="407" text-anchor="middle" class="svg-seleccion">Seleccionada</text>` : ''}</g>`;}).join('')}</svg>`;
}

export function actualizarGraficas(i, u, codigo = '81', seccion) {
  const host = document.querySelector('[data-grafica-dibujo]');
  if (!host) return;
  const resultado = calcularInspeccion(i, u, seccion);
  const resumen = document.querySelector('[data-grafica-resumen]');
  if (resumen) resumen.textContent = resultado.estado === 'calculado' ? `VDT ${formato(resultado.vdt)} · q ${resultado.q} · URCI ≈ ${resultado.urci} (${formato(resultado.urciExacto)} sin redondear) · ${resultado.calificacion}` : resultado.motivos.join(' ');
  if (codigo === '84') { host.innerHTML = pintarPolvo(i); return; }
  const c = CURVAS[codigo];
  const guias = codigo === 'urci' ? [] : datosGuias(i, u, codigo);
  const guiasSVG = guias.filter(g => g.x !== null && g.deduccion !== null).map(g => {
    const p = puntoEnGrafica(codigo, g.densidad, g.deduccion), pie = puntoEnGrafica(codigo, g.densidad, 0), izq = puntoEnGrafica(codigo, 0, g.deduccion);
    return `<g data-guia="${g.id}"><title>Severidad ${g.letra}: densidad ${escapar(g.densidadTexto)}, VD aproximado ${formato(g.deduccion)}</title><path d="M ${pie.x} ${pie.y} L ${p.x} ${p.y} L ${izq.x} ${izq.y}" stroke="white" stroke-width="7" opacity=".85" fill="none"/><path d="M ${pie.x} ${pie.y} L ${p.x} ${p.y} L ${izq.x} ${izq.y}" stroke="${g.color}" stroke-width="3" stroke-dasharray="10 6" fill="none"/><circle cx="${p.x}" cy="${p.y}" r="7" fill="${g.color}" stroke="white" stroke-width="2"/></g>`;
  }).join('');
  let puntoURCI = '';
  if (codigo === 'urci' && resultado.estado === 'calculado') {
    const { vdt, urciExacto, q } = resultado, p = puntoEnGrafica(codigo, vdt, urciExacto), pie = puntoEnGrafica(codigo, vdt, 100), izq = puntoEnGrafica(codigo, 0, urciExacto);
    const trazo = TRAZADOS.urci[String(Math.max(1, q))].map(([x,y], n) => { const pt=puntoEnGrafica(codigo,x,y); return `${n ? 'L' : 'M'} ${pt.x} ${pt.y}`; }).join(' ');
    puntoURCI = `<g data-punto-urci><title>VDT ${formato(vdt)}, q ${q}, URCI aproximado ${formato(urciExacto)}</title><path d="${trazo}" stroke="#087d86" stroke-width="3" opacity=".65" fill="none"/><path d="M ${pie.x} ${pie.y} L ${p.x} ${p.y} L ${izq.x} ${izq.y}" fill="none" stroke="white" stroke-width="8"/><path d="M ${pie.x} ${pie.y} L ${p.x} ${p.y} L ${izq.x} ${izq.y}" fill="none" stroke="#d44438" stroke-width="4" stroke-dasharray="10 6"/><circle cx="${p.x}" cy="${p.y}" r="9" fill="#d44438" stroke="white" stroke-width="3"/></g>`;
  }
  host.innerHTML = `<svg viewBox="0 0 ${c.ancho} ${c.alto}" width="${c.ancho}" height="${c.alto}" class="curva-original" role="img" aria-label="Figura ${c.figura} del TM 5-626 con lecturas aproximadas de esta unidad"><title>${codigo === 'urci' ? 'Curva URCI y resultado aproximado de la muestra' : tipoDeterioro(codigo).nombre + ', curvas originales y lecturas aproximadas'}</title><image href="${c.archivo}" width="${c.ancho}" height="${c.alto}"/>${guiasSVG}${puntoURCI}<g class="cursor-grafica" style="display:none;pointer-events:none"><line data-cursor-x stroke="#7652a4" stroke-width="2" stroke-dasharray="5 5"/><line data-cursor-y stroke="#7652a4" stroke-width="2" stroke-dasharray="5 5"/></g></svg>`;
  for (const g of guias) {
    const linea = document.querySelector(`[data-resultado-guia="${g.id}"]`);
    if (linea) { linea.textContent = g.motivo || `Densidad: ${g.densidadTexto} · VD ≈ ${formato(g.deduccion)}`; linea.classList.toggle('guia-alerta', !!g.motivo && !!g.cantidad && i.deterioros[codigo].estado === 'con_deterioro'); }
  }
  const estado = document.getElementById('estado-grafica');
  if (estado && codigo !== 'urci') estado.value = i.deterioros[codigo].estado;
  const svg = host.querySelector('svg');
  svg.setAttribute('data-image-ready', 'false');
  const imagen = svg.querySelector('image');
  imagen.addEventListener('load', () => svg.setAttribute('data-image-ready', 'true'));
  imagen.addEventListener('error', () => {
    svg.setAttribute('data-image-ready', 'error');
    document.querySelector('[data-lectura-cursor]').textContent = 'No se pudo cargar la figura. Recargá la aplicación con conexión para completar sus archivos.';
  });
  let ultimaLectura = '';
  function explorar(evento) {
    const punto = svg.createSVGPoint(); punto.x=evento.clientX; punto.y=evento.clientY;
    const matriz = svg.getScreenCTM(); if (!matriz) return;
    const p = punto.matrixTransform(matriz.inverse());
    const lectura = coordenadasEnGrafica(codigo, p.x, p.y), dentro = lectura.dentro;
    const cursor = svg.querySelector('.cursor-grafica'); cursor.style.display = dentro ? '' : 'none';
    if (!dentro) return;
    const lx = svg.querySelector('[data-cursor-x]'), ly = svg.querySelector('[data-cursor-y]');
    Object.entries({x1:p.x,x2:p.x,y1:c.arriba,y2:c.abajo}).forEach(([k,v])=>lx.setAttribute(k,v));
    Object.entries({x1:c.izquierda,x2:c.derecha,y1:p.y,y2:p.y}).forEach(([k,v])=>ly.setAttribute(k,v));
    const x=lectura.x, y=lectura.y;
    const texto=`Lectura del cursor, aproximada: ${codigo === 'urci' ? 'VDT' : 'densidad'} ${formato(x)} · ${codigo === 'urci' ? 'URCI' : 'valor deducible'} ${formato(y)}. No se guarda como resultado.`;
    if (texto !== ultimaLectura) { document.querySelector('[data-lectura-cursor]').textContent=texto; ultimaLectura=texto; }
  }
  svg.addEventListener('pointermove',explorar);
  svg.addEventListener('pointerdown',explorar);
  svg.addEventListener('pointerleave',()=>{ svg.querySelector('.cursor-grafica').style.display='none'; });
}
