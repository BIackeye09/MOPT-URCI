/* Presentación de la cara delantera, fiel al orden de la hoja aportada.
 * Se reutilizan los mismos registros de la aplicación: no hay copias de datos.
 */
import { DETERIOROS, NIVELES_HOJA, totalNivel, unidadCompatible, polvoSeleccionado, densidadTexto, DEDUCCION_POLVO, cantidadPositiva, deduccionVisible } from './frente.js';
import { calcularInspeccion } from './motor-urci.js';
const e = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const opcionesEstado = estado => [['pendiente', 'Pendiente'], ['sin_deterioro', 'Sin deterioro'], ['con_deterioro', 'Con deterioro']].map(([v, t]) => `<option value="${v}" ${estado === v ? 'selected' : ''}>${t}</option>`).join('');
function filaCabecera(etiqueta, valor) { return `<tr><th scope="row">${etiqueta}</th><td>${valor}</td></tr>`; }
export function pintarFrente({ i, u, s, camino, bloqueado }) {
  const disabled = bloqueado ? 'disabled' : '';
  const entrada = (nombre, etiqueta, valor, tipo = 'text', extra = '') => `<input aria-label="${etiqueta}" type="${tipo}" data-inspeccion-campo="${nombre}" value="${e(valor)}" ${disabled} ${extra}>`;
  const unidad = (nombre, etiqueta, valor) => `<input aria-label="${etiqueta}" data-unidad-campo="${nombre}" value="${e(valor)}" inputmode="${nombre.startsWith('progresiva') ? 'text' : 'decimal'}" maxlength="64" ${disabled}>`;
  const catalogo = tipos => `<table class="catalogo-tabla"><thead><tr><th>No.</th><th>Deterioro</th><th>Unidad</th></tr></thead><tbody>${tipos.map(d => `<tr><td>${d.codigo}</td><td>${d.nombre}</td><td>${d.unidad === 'Marca X' ? '—' : d.unidad}</td></tr>`).join('')}</tbody></table>`;
  return `<section class="hoja-frente" aria-label="Hoja delantera del formulario URCI">
    <header class="hoja-marca"><strong>MOPT</strong><span>MINISTERIO DE OBRAS<br>PÚBLICAS Y TRANSPORTES</span><span class="hoja-gobierno">GOBIERNO<br>DE COSTA RICA</span></header>
    <h2 class="hoja-franja">FORMULARIO URCI · INSPECCIÓN DE LA RED VIAL NACIONAL NO PAVIMENTADA</h2>
    <div class="hoja-encabezado"><table class="cabecera-tabla"><tbody>
      ${filaCabecera('1. RUTA', `<span title="Código del camino asociado">${e(camino.codigo)}</span>`)}
      ${filaCabecera('2. SECCIÓN', e(s.codigo))}
      ${filaCabecera('3. UNIDAD DE MUESTRA', e(u.codigo))}
      ${filaCabecera('4. FECHA DE INSPECCIÓN', entrada('fechaURCI', 'Fecha de inspección', i.fechaURCI, 'date'))}
      ${filaCabecera('5. EST. INICIO', unidad('progresivaInicio', 'Estación de inicio', u.progresivaInicio))}
      ${filaCabecera('6. EST. FINAL', unidad('progresivaFin', 'Estación final', u.progresivaFin))}
      ${filaCabecera('7. ÁREA DE MUESTRA (m²)', `<div class="area-dimensiones">${unidad('longitud', 'Largo de muestra en metros', u.longitud)}<span>m ×</span>${unidad('ancho', 'Ancho de muestra en metros', u.ancho)}<span>m</span></div><div class="area-resultado"><label for="modo-area">Área</label><select id="modo-area" aria-label="Modo de área" data-unidad-campo="modoArea" ${disabled}><option value="automatica" ${u.modoArea !== 'manual' ? 'selected' : ''}>Largo × ancho</option><option value="manual" ${u.modoArea === 'manual' ? 'selected' : ''}>Manual</option></select><span data-area-automatica ${u.modoArea === 'manual' ? 'hidden' : ''}><output data-area-total>${e(u.areaM2 || '—')}</output> m²</span><span data-area-manual ${u.modoArea !== 'manual' ? 'hidden' : ''}>${unidad('areaManual', 'Área manual de muestra en metros cuadrados', u.areaManual)} m²</span></div>`)}
      ${filaCabecera('8. INSPECCIÓN POR:', entrada('inspector', 'Inspección por', i.inspector, 'text', 'autocomplete="name"'))}
    </tbody></table>
    <section class="esquema-panel" aria-label="Esquema de la unidad"><h3>9. ESQUEMA</h3><div class="croquis-herramientas"><button class="croquis-tool active" type="button" data-croquis="lapiz" aria-pressed="true" ${disabled}>Lápiz</button><button class="croquis-tool" type="button" data-croquis="borrador" aria-pressed="false" ${disabled}>Borrador</button><button class="croquis-tool" type="button" data-croquis="deshacer" ${disabled}>Deshacer</button><button class="croquis-tool" type="button" data-croquis="limpiar" ${disabled}>Borrar todo</button></div><div class="croquis-lienzo"><canvas id="croquis" width="960" height="600" aria-label="Dibujá el croquis con el dedo o el mouse" ${bloqueado ? 'data-bloqueado="true"' : ''}></canvas><span class="croquis-ayuda" ${i.croquis?.length ? 'hidden' : ''}>Dibujá aquí la ubicación de la muestra</span></div></section></div>
    <h3 class="hoja-franja">10. TIPOS DE DETERIOROS</h3>
    <div class="catalogo-doble">${catalogo(DETERIOROS.slice(0, 4))}${catalogo(DETERIOROS.slice(4))}</div>
    <h3 class="hoja-franja">11. CANTIDAD Y SEVERIDAD DEL DETERIORO</h3>
    <div class="tabla-desplazable" tabindex="0" aria-label="Cantidades por deterioro y severidad"><table class="cantidades-tabla"><colgroup><col style="width:14%"><col style="width:5%">${DETERIOROS.map(() => '<col>').join('')}</colgroup><thead><tr><th colspan="2">TIPO</th>${DETERIOROS.map(d => `<th scope="col" title="${d.nombre}">${d.codigo}<small>${d.unidad}</small></th>`).join('')}</tr></thead><tbody>
      ${NIVELES_HOJA.map((n, indice) => `<tr>${indice === 0 ? '<th rowspan="3" scope="rowgroup" class="cantidad-titulo">CANTIDAD Y<br>SEVERIDAD</th>' : ''}<th scope="row" title="${n.nombre}">${n.letra}</th>${DETERIOROS.map(d => {
        const registro = i.deterioros[d.codigo];
        const nivel = registro.niveles[n.id];
        if (d.codigo === '84') return `<td><button type="button" class="polvo-marca ${registro.estado === 'con_deterioro' && polvoSeleccionado(registro) === n.id ? 'seleccionada' : ''}" data-accion="marcar-polvo" data-severidad="${n.id}" aria-label="Polvo severidad ${n.letra}" aria-pressed="${registro.estado === 'con_deterioro' && polvoSeleccionado(registro) === n.id}" ${disabled}>${registro.estado === 'con_deterioro' && polvoSeleccionado(registro) === n.id ? 'X' : '·'}</button></td>`;
        const valor = registro.estado === 'sin_deterioro' ? '' : totalNivel(nivel);
        return `<td><input aria-label="Cantidad ${d.codigo} severidad ${n.letra}" data-matriz="true" data-nivel="${d.codigo}:${n.id}" data-nivel-campo="total" inputmode="decimal" maxlength="64" value="${e(valor)}" title="${nivel.modo === 'detalles' ? 'Total de mediciones: ' : ''}${e(valor)}" ${nivel.modo === 'detalles' ? 'readonly' : ''} ${disabled || (registro.estado === 'sin_deterioro' ? 'disabled' : '')}></td>`;
      }).join('')}</tr>`).join('')}
      <tr class="fila-estados"><th colspan="2">Evaluación</th>${DETERIOROS.map(d => `<td><select aria-label="Estado del deterioro ${d.codigo}" data-estado-matriz="true" data-deterioro="${d.codigo}" data-deterioro-campo="estado" ${disabled}>${opcionesEstado(i.deterioros[d.codigo].estado)}</select></td>`).join('')}</tr>
    </tbody></table></div>
    <p class="hoja-ayuda">L: baja · M: media · H: alta. Para polvo, marcá una X en una sola severidad. <span data-evaluados></span></p>
    <h3 class="hoja-franja">12. CÁLCULO URCI</h3>
    <div class="calculo-observaciones"><table class="calculo-tabla"><thead><tr><th>TIPO DE DAÑO</th><th>SEVERIDAD</th><th>12. DENSIDAD</th><th>13. VALOR DEDUCIBLE</th></tr></thead><tbody>${DETERIOROS.map(d => NIVELES_HOJA.map((n, indice) => `<tr class="${indice === 0 ? 'inicio-deterioro' : ''}"><td>${d.codigo}</td><td>${n.letra}</td><td data-densidad="${d.codigo}:${n.id}">—</td><td data-deduccion="${d.codigo}:${n.id}">—</td></tr>`).join('')).join('')}</tbody></table>
    <section class="observaciones-panel"><h3><label for="obs-urci">14. OBSERVACIONES</label></h3><textarea id="obs-urci" data-inspeccion-campo="observacionesURCI" placeholder="Observaciones de la unidad de muestra…" ${disabled}>${e(i.observacionesURCI || '')}</textarea></section></div>
    <div class="hoja-resultados">${[['15. VALOR DEDUCIBLE TOTAL', 'vdt'], ['16. VALOR q', 'q'], ['17. URCI APROXIMADO', 'urci'], ['18. CALIFICACIÓN TRANSITABILIDAD', 'calificacion']].map(([label, clave]) => `<div><h3>${label}</h3><output data-resultado="${clave}">Pendiente</output></div>`).join('')}</div>
    <p class="calculo-estado" data-calculo-estado role="status"></p>
  </section>
  <p class="nota-calculo">Densidad = cantidad ÷ área × 100. Los cálculos conservan los decimales y se muestran con hasta dos. El URCI se aproxima interpolando los trazos métricos del TM 5-626; se redondea a un entero al final. Polvo: L = 2, M = 4, H = 15. q cuenta deducciones mayores que 5, según el paso 3-4.b(3). No se extienden las curvas fuera de su rango.</p>`;
}
export function actualizarResumenFrente({ i, u, s }) {
  const resultado = calcularInspeccion(i, u, s);
  const formato = n => n.toLocaleString('es-CR', { maximumFractionDigits: 2 });
  for (const d of DETERIOROS) {
    const registro = i.deterioros[d.codigo];
    for (const n of NIVELES_HOJA) {
      let densidad = '', deduccion = '';
      if (registro.estado === 'con_deterioro') {
        if (d.codigo === '84') {
          if (polvoSeleccionado(registro) === n.id) { densidad = 'X'; deduccion = String(DEDUCCION_POLVO[n.id]); }
        } else {
          const nivel = registro.niveles[n.id];
          const total = totalNivel(nivel);
          if (cantidadPositiva(total) && unidadCompatible(d.codigo, nivel)) densidad = densidadTexto(total, u.areaM2);
        }
      }
      const celda = document.querySelector(`[data-densidad="${d.codigo}:${n.id}"]`);
      if (celda) celda.textContent = densidad || '—';
      const vd = document.querySelector(`[data-deduccion="${d.codigo}:${n.id}"]`);
      const fila = resultado.filas.find(f => f.codigo === d.codigo && f.severidad === n.id);
      if (vd) {
        const visible = deduccionVisible(fila);
        vd.textContent = Number.isFinite(visible) ? formato(visible) : '';
        vd.title = fila?.motivo || (fila?.deduccion ? 'Valor aproximado de la curva original' : '');
        vd.classList.toggle('dato-fuera-rango', !!fila?.motivo && registro.estado === 'con_deterioro');
      }
    }
    const select = document.querySelector(`select[data-estado-matriz][data-deterioro="${d.codigo}"]`);
    if (select) select.value = registro.estado;
  }
  document.querySelectorAll('[data-area-total]').forEach(n => { n.textContent = (u.areaM2 || '—').replace('.', ','); });
  const progreso = document.querySelector('[data-evaluados]');
  if (progreso) progreso.textContent = `${DETERIOROS.filter(d => i.deterioros[d.codigo].estado !== 'pendiente').length}/7 deterioros evaluados.`;
  const automatico = document.querySelector('[data-area-automatica]'), manual = document.querySelector('[data-area-manual]');
  if (automatico) automatico.hidden = u.modoArea === 'manual';
  if (manual) manual.hidden = u.modoArea !== 'manual';
  for (const clave of ['vdt', 'q', 'urci', 'calificacion']) {
    const nodo = document.querySelector(`[data-resultado="${clave}"]`);
    const valor = resultado[clave];
    if (nodo) nodo.textContent = valor === null || valor === undefined ? 'Pendiente' : clave === 'urci' ? `≈ ${valor}` : typeof valor === 'number' ? formato(valor) : valor;
  }
  const estado = document.querySelector('[data-calculo-estado]');
  if (estado) {
    estado.textContent = resultado.estado === 'calculado' ? `Lectura aproximada sin redondear: ${formato(resultado.urciExacto)}. ${resultado.qInclusivo !== resultado.q ? 'Existe una deducción igual a 5: se aplicó el criterio > 5 del procedimiento escrito.' : 'La gráfica y las deducciones se actualizan con esta ficha.'}` : resultado.motivos.join(' ');
    estado.classList.toggle('calculo-listo', resultado.estado === 'calculado');
  }
}
