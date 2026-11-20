/* Hoja delantera URCI. Unidades contrastadas con el TM 5-626, apéndice B.
 * El cálculo aproximado de las curvas se implementa en motor-urci.js.
 * Las cantidades se conservan como texto decimal, sin redondear la captura.
 */
export const DETERIOROS = [
  { codigo: '81', nombre: 'Sección Transversal Inadecuada', unidad: 'm' },
  { codigo: '82', nombre: 'Drenaje Lateral Inadecuado', unidad: 'm' },
  { codigo: '83', nombre: 'Corrugaciones', unidad: 'm²' },
  { codigo: '84', nombre: 'Polvo', unidad: 'Marca X' },
  { codigo: '85', nombre: 'Huecos', unidad: 'un.' },
  { codigo: '86', nombre: 'Ahuellamiento', unidad: 'm²' },
  { codigo: '87', nombre: 'Agregado Suelto', unidad: 'm' }
];
export const NIVELES_HOJA = [
  { id: 'B', letra: 'L', nombre: 'Baja' },
  { id: 'M', letra: 'M', nombre: 'Media' },
  { id: 'A', letra: 'H', nombre: 'Alta' }
];
export const tipoDeterioro = codigo => DETERIOROS.find(d => d.codigo === codigo);
function partes(valor) {
  const texto = String(valor ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(texto)) return null;
  const [entero, fraccion = ''] = texto.split('.');
  return { n: BigInt(entero + fraccion), e: fraccion.length };
}
function decimal(n, escala) {
  const s = n.toString().padStart(escala + 1, '0');
  const f = escala ? s.slice(-escala).replace(/0+$/, '') : '';
  return (escala ? s.slice(0, -escala) : s) + (f ? '.' + f : '');
}
export function totalNivel(nivel) {
  if (!nivel) return '';
  if (nivel.modo !== 'detalles') return String(nivel.total ?? '');
  if (!nivel.registros?.length) return '';
  const p = nivel.registros.map(partes);
  if (p.some(x => !x)) return 'Dato inválido';
  const escala = Math.max(...p.map(x => x.e));
  return decimal(p.reduce((s, x) => s + x.n * 10n ** BigInt(escala - x.e), 0n), escala);
}
export function unidadCompatible(codigo, nivel) {
  const u = nivel?.unidad;
  return u === tipoDeterioro(codigo)?.unidad || (codigo === '85' && u === 'conteo');
}
export function polvoSeleccionado(deterioro) {
  if (Object.hasOwn(deterioro, 'polvo')) return deterioro.polvo;
  // Lectura compatible de borradores antiguos, sin eliminar sus mediciones.
  const activos = NIVELES_HOJA.filter(n => {
    const t = totalNivel(deterioro.niveles[n.id]);
    return t.toUpperCase() === 'X' || (partes(t)?.n ?? 0n) > 0n;
  });
  return activos.length === 1 ? activos[0].id : '';
}
/** Densidad = cantidad / área × 100. Se presenta a dos decimales;
 * la captura original y el área permanecen completas (TM 5-626, 3-4.b.1).
 */
export function densidadTexto(cantidad, area) {
  const a = partes(cantidad), b = partes(area);
  if (!a || !b || b.n === 0n) return '';
  const numerador = a.n * 10n ** BigInt(b.e) * 10000n;
  const denominador = b.n * 10n ** BigInt(a.e);
  const redondeado = (numerador * 2n + denominador) / (denominador * 2n);
  return decimal(redondeado, 2).replace('.', ',');
}
export function cantidadPositiva(valor) { return (partes(valor)?.n ?? 0n) > 0n; }
export function cantidadValida(valor) { return partes(valor) !== null; }
// Deducciones explícitas de la figura C-4; no requieren digitalización.
export const DEDUCCION_POLVO = { B: 2, M: 4, A: 15 };

/** Los ceros de deducción no se imprimen; el motor los conserva para calcular. */
export function deduccionVisible(fila) {
  return !fila || fila.sinDeterioro || fila.vacio || fila.deduccion === 0 || (fila.codigo === '84' && !fila.seleccionado)
    ? null : fila.deduccion;
}
