/** Captura en kilómetros y presentación vial km + metros, al metro más cercano. */
export function estacionEnMetros(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return null;
  const vial = texto.match(/^(\d+)\s*\+\s*(\d{1,3})$/);
  if (vial) {
    const metros = BigInt(vial[1]) * 1000n + BigInt(vial[2]);
    return metros <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(metros) : null;
  }
  const decimal = texto.match(/^(\d+)(?:[,.](\d+))?$/);
  if (!decimal) return null;
  const fraccion = decimal[2] || '';
  const primeros = (fraccion + '000').slice(0, 3);
  const redondeo = fraccion.length > 3 && fraccion[3] >= '5' ? 1n : 0n;
  const metros = BigInt(decimal[1]) * 1000n + BigInt(primeros) + redondeo;
  return metros <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(metros) : null;
}

export function formatearEstacion(valor) {
  const metros = estacionEnMetros(valor);
  if (metros === null) return '';
  return `${Math.floor(metros / 1000)} + ${String(metros % 1000).padStart(3, '0')}`;
}
