/* Motor métrico URCI v0.6. Lectura aproximada del TM 5-626, apéndice C.
 * No emplea las tablas del Excel. Ver METODOLOGIA.md y verificacion/.
 */
import { TRAZADOS, ESQUINAS } from './motor-curvas.js';
import { CURVAS } from './curvas-datos.js';
import { DETERIOROS, NIVELES_HOJA, totalNivel, unidadCompatible, polvoSeleccionado, DEDUCCION_POLVO } from './frente.js';

export const VERSION_MOTOR = 'tm5-626-raster-metrico-0.6';
export const numeroDecimal = valor => {
  const texto = String(valor ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(texto)) return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
};

/** Interpolación lineal local, sin extender el dominio de los puntos. */
export function interpolar(puntos, x) {
  if (!puntos?.length || !Number.isFinite(x) || x < puntos[0][0] || x > puntos.at(-1)[0]) return null;
  let a = 0, b = puntos.length - 1;
  while (b - a > 1) { const m = (a + b) >> 1; if (puntos[m][0] <= x) a = m; else b = m; }
  if (x === puntos[a][0]) return puntos[a][1];
  if (x === puntos[b][0]) return puntos[b][1];
  return puntos[a][1] + (x - puntos[a][0]) * (puntos[b][1] - puntos[a][1]) / (puntos[b][0] - puntos[a][0]);
}

export function leerDeduccion(codigo, severidad, densidad) {
  return interpolar(TRAZADOS[codigo]?.[severidad], densidad);
}

/** El procedimiento 3-4.b(3) utiliza > 5, sin redondear antes del conteo. */
export function calcularDesdeDeducciones(valores) {
  const base = { version: VERSION_MOTOR, aproximado: true, vdt: null, q: null, urci: null, urciExacto: null, calificacion: null, motivos: [] };
  if (!Array.isArray(valores) || valores.some(v => !Number.isFinite(v) || v < 0 || v > 100)) {
    return { ...base, estado: 'incompleto', motivos: ['Hay valores deducibles inválidos.'] };
  }
  // Suma compensada; los valores originales no se redondean.
  let vdt = 0, compensacion = 0;
  for (const v of valores) { const y = v - compensacion, t = vdt + y; compensacion = (t - vdt) - y; vdt = t; }
  const q = valores.filter(v => v > 5).length;
  const resultado = { ...base, vdt, q, qInclusivo: valores.filter(v => v >= 5).length };
  if (vdt > CURVAS.urci.maxX) return { ...resultado, estado: 'fuera_rango', motivos: ['El VDT supera 200, límite de la figura C-8.'] };
  if (q > 7) return { ...resultado, estado: 'fuera_rango', motivos: [`q = ${q}; la figura C-8 solo publica curvas hasta q = 7.`] };
  const puntos = TRAZADOS.urci[String(Math.max(1, q))];
  let exacto;
  if (q <= 1) exacto = Math.max(0, 100 - vdt);
  else if (vdt < puntos[0][0]) return { ...resultado, estado: 'fuera_rango', motivos: [`VDT inferior al tramo trazado de q = ${q} (inicio en ${puntos[0][0]}).`] };
  // q=2 y q=3 alcanzan URCI=0 antes del final del eje horizontal.
  else if (vdt > puntos.at(-1)[0] && puntos.at(-1)[1] === 0) exacto = 0;
  else exacto = interpolar(puntos, vdt);
  if (!Number.isFinite(exacto)) return { ...resultado, estado: 'fuera_rango', motivos: ['El punto queda fuera del tramo digitalizado.'] };
  const urci = Math.round(Math.min(100, Math.max(0, exacto)));
  return { ...resultado, estado: 'calculado', urciExacto: exacto, urci, calificacion: clasificarURCI(urci) };
}

export function clasificarURCI(valor) {
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) return null;
  return valor >= 85 ? 'Excelente' : valor >= 70 ? 'Muy bueno' : valor >= 55 ? 'Bueno' : valor >= 40 ? 'Regular' : valor >= 25 ? 'Malo' : valor >= 10 ? 'Muy malo' : 'Fallado';
}

/** Calcula desde los datos activos de la ficha; no cambia ni guarda entradas. */
export function calcularInspeccion(inspeccion, unidad, seccion) {
  const filas = [], motivos = [], valores = [];
  const area = numeroDecimal(unidad?.areaM2);
  if (area === null || area <= 0) motivos.push('Completá un área válida mayor que cero.');
  if (seccion && seccion.superficie !== 'no_pavimentada') motivos.push('Confirmá que la sección sea no pavimentada.');
  for (const tipo of DETERIOROS) {
    const d = inspeccion?.deterioros?.[tipo.codigo];
    if (!d || !['con_deterioro', 'sin_deterioro'].includes(d.estado)) {
      motivos.push(`Falta evaluar el deterioro ${tipo.codigo}.`);
      for (const n of NIVELES_HOJA) filas.push({ codigo: tipo.codigo, severidad: n.id, densidad: null, deduccion: null, motivo: 'Evaluación pendiente' });
      continue;
    }
    if (d.estado === 'sin_deterioro') {
      for (const n of NIVELES_HOJA) filas.push({ codigo: tipo.codigo, severidad: n.id, densidad: null, deduccion: 0, motivo: '', sinDeterioro: true });
      continue;
    }
    if (tipo.codigo === '84') {
      const seleccionado = polvoSeleccionado(d);
      if (!Object.hasOwn(DEDUCCION_POLVO, seleccionado)) motivos.push('Seleccioná una sola severidad de polvo.');
      for (const n of NIVELES_HOJA) {
        const deduccion = n.id === seleccionado ? DEDUCCION_POLVO[n.id] : 0;
        filas.push({ codigo: '84', severidad: n.id, densidad: null, deduccion, seleccionado: n.id === seleccionado, motivo: '' });
        if (deduccion) valores.push(deduccion);
      }
      continue;
    }
    let positivos = 0;
    for (const n of NIVELES_HOJA) {
      const nivel = d.niveles?.[n.id], texto = totalNivel(nivel).trim();
      const fila = { codigo: tipo.codigo, severidad: n.id, densidad: null, deduccion: null, motivo: '' };
      if (!texto) { fila.deduccion = 0; fila.vacio = true; filas.push(fila); continue; }
      const cantidad = numeroDecimal(texto);
      if (cantidad === null) fila.motivo = 'Cantidad inválida';
      else if (!unidadCompatible(tipo.codigo, nivel)) fila.motivo = `La cantidad debe estar en ${tipo.unidad}`;
      else if (area !== null && area > 0) {
        const densidad = cantidad / area * 100;
        if (!Number.isFinite(densidad)) fila.motivo = 'Densidad fuera del rango numérico';
        else {
          fila.densidad = densidad;
          fila.deduccion = leerDeduccion(tipo.codigo, n.id, densidad);
          if (fila.deduccion === null) fila.motivo = `Densidad fuera de la curva (0–${CURVAS[tipo.codigo].maxX})`;
        }
      }
      if (cantidad > 0) positivos++;
      if (fila.motivo) motivos.push(`${tipo.codigo} ${n.letra}: ${fila.motivo}.`);
      if (fila.deduccion !== null) valores.push(fila.deduccion);
      filas.push(fila);
    }
    if (!positivos) motivos.push(`El deterioro ${tipo.codigo} está presente pero no tiene cantidades positivas.`);
  }
  if (motivos.length) return { version: VERSION_MOTOR, aproximado: true, estado: 'incompleto', filas, motivos, vdt: null, q: null, urci: null, urciExacto: null, calificacion: null };
  return { ...calcularDesdeDeducciones(valores), filas };
}

/** Promedio de todas las muestras seleccionadas; indica cualquier pendiente. */
export function resumirSeccion(unidades, inspecciones, seccion) {
  const seleccionadas = unidades.filter(u => u.seleccion === 'seleccionada');
  const resultados = seleccionadas.map(u => calcularInspeccion(inspecciones.find(i => i.unidadId === u.id), u, seccion));
  const calculadas = resultados.filter(r => r.estado === 'calculado');
  const completos = resultados.length > 0 && calculadas.length === resultados.length;
  const promedio = completos ? calculadas.reduce((s, r) => s + r.urciExacto, 0) / calculadas.length : null;
  return { total: resultados.length, calculadas: calculadas.length, pendientes: resultados.length - calculadas.length, completo: completos, promedio, urci: promedio === null ? null : Math.round(promedio) };
}

/** Proyección bilineal que compensa la inclinación de los ejes escaneados. */
export function puntoEnGrafica(codigo, x, y) {
  const c = CURVAS[codigo], [tl, tr, bl, br] = ESQUINAS[codigo];
  const u = x / c.maxX, v = codigo === 'urci' ? y / c.maxY : 1 - y / c.maxY;
  return { x: (1-v)*((1-u)*tl[0]+u*tr[0])+v*((1-u)*bl[0]+u*br[0]), y: (1-v)*((1-u)*tl[1]+u*tr[1])+v*((1-u)*bl[1]+u*br[1]) };
}

/** Inversa de la misma proyección para explorar la gráfica con el cursor. */
export function coordenadasEnGrafica(codigo, x, y) {
  const c = CURVAS[codigo], [tl, tr, bl, br] = ESQUINAS[codigo];
  let u = (x-tl[0])/(tr[0]-tl[0]), v = (y-tl[1])/(bl[1]-tl[1]);
  for (let k=0;k<6;k++) {
    const py0=(1-u)*tl[1]+u*tr[1], py1=(1-u)*bl[1]+u*br[1]; v=(y-py0)/(py1-py0);
    const px0=(1-v)*tl[0]+v*bl[0], px1=(1-v)*tr[0]+v*br[0]; u=(x-px0)/(px1-px0);
  }
  return { x:u*c.maxX, y:(codigo === 'urci' ? v : 1-v)*c.maxY, dentro:u>=0&&u<=1&&v>=0&&v<=1 };
}
