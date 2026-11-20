/* Guías superpuestas a las imágenes originales; no modifican sus curvas. */
export const ESTILO_GUIA = { grosor: 2.2, cabeza: 7, semiancho: 4 };
export const COLOR_GUIA = '#D71920';
export const COLORES_LECTURA = {B:COLOR_GUIA,M:COLOR_GUIA,A:COLOR_GUIA};
export const COLOR_GUIA_URCI = COLOR_GUIA;

export function flechaHacia(inicio, fin, escala = 1) {
  const dx = fin.x - inicio.x, dy = fin.y - inicio.y, distancia = Math.hypot(dx, dy);
  if (distancia < .01) return [];
  const largo = Math.min(ESTILO_GUIA.cabeza * escala, distancia * .7);
  const ancho = largo * ESTILO_GUIA.semiancho / ESTILO_GUIA.cabeza;
  const ux = dx / distancia, uy = dy / distancia;
  return [
    { x: fin.x - largo * ux - ancho * uy, y: fin.y - largo * uy + ancho * ux },
    fin,
    { x: fin.x - largo * ux + ancho * uy, y: fin.y - largo * uy - ancho * ux }
  ];
}

export function geometriaGuia(pie, punto, izquierda, escala = 1) {
  return { pie, punto, izquierda, recorrido: [pie, punto, izquierda],
    flechas: [flechaHacia(pie, punto, escala), flechaHacia(punto, izquierda, escala)].filter(f => f.length) };
}

export function guiaSvg(pie, punto, izquierda, color, escala = 1) {
  const g = geometriaGuia(pie, punto, izquierda, escala);
  const recorrido = puntos => puntos.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const caminos = [g.recorrido, ...g.flechas].map(recorrido);
  return `<g stroke-linecap="round" stroke-linejoin="round">${caminos.map(d => `<path d="${d}" stroke="${color}" stroke-width="${ESTILO_GUIA.grosor * escala}" fill="none"/>`).join('')}</g>`;
}
