/* Croquis vectorial local. Las coordenadas normalizadas permiten reabrirlo
 * y redibujarlo sin recortes al cambiar de teléfono, tamaño u orientación.
 */
export function pintarCroquisMapa(captura) {
  const figura = document.getElementById('croquis-mapa-guardado');
  if (!figura) return;
  const imagen = figura.querySelector('img');
  const dibujo = document.getElementById('croquis-dibujo');
  const abrir = document.querySelector('[data-mapa-de-croquis]');
  const quitar = document.querySelector('[data-accion="quitar-mapa"]');
  const tieneMapa = typeof captura?.imagen === 'string' && captura.imagen.startsWith('data:image/png;base64,');
  figura.hidden = !tieneMapa;
  dibujo.hidden = tieneMapa;
  quitar.hidden = !tieneMapa || !abrir;
  if (abrir) abrir.textContent = tieneMapa ? 'Cambiar encuadre' : 'Consultar mapa';
  if (tieneMapa) imagen.src = captura.imagen;
  else imagen.removeAttribute('src');
}

export function prepararCroquis(inspeccion, alCambiar) {
  const canvas = document.getElementById('croquis');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const bloqueado = canvas.dataset.bloqueado === 'true';
  inspeccion.croquis ||= [];
  pintarCroquisMapa(inspeccion.croquisMapa);
  let herramienta = 'lapiz', trazo = null, puntero = null;
  function redibujar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const t of inspeccion.croquis) {
      ctx.globalCompositeOperation = t.tipo === 'borrador' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = '#17232d'; ctx.fillStyle = '#17232d';
      ctx.lineWidth = t.tipo === 'borrador' ? 30 : 4;
      ctx.beginPath();
      t.puntos.forEach(([x, y], indice) => {
        if (!indice) ctx.moveTo(x * canvas.width, y * canvas.height);
        else ctx.lineTo(x * canvas.width, y * canvas.height);
      });
      if (t.puntos.length === 1) {
        const [x, y] = t.puntos[0];
        ctx.arc(x * canvas.width, y * canvas.height, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    const ayuda = canvas.parentElement.querySelector('.croquis-ayuda');
    if (ayuda) ayuda.hidden = inspeccion.croquis.length > 0;
  }
  const punto = ev => {
    const r = canvas.getBoundingClientRect();
    return [Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height))];
  };
  canvas.addEventListener('pointerdown', ev => {
    if (bloqueado || puntero !== null || !ev.isPrimary || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    ev.preventDefault(); canvas.setPointerCapture(ev.pointerId);
    puntero = ev.pointerId;
    trazo = { tipo: herramienta, puntos: [punto(ev)] };
    inspeccion.croquis.push(trazo); redibujar(); alCambiar();
  });
  canvas.addEventListener('pointermove', ev => {
    if (ev.pointerId !== puntero) return;
    const puntos = ev.getCoalescedEvents?.();
    for (const p of puntos?.length ? puntos : [ev]) trazo.puntos.push(punto(p));
    redibujar(); alCambiar();
  });
  function terminar(ev) {
    if (ev.pointerId !== puntero) return;
    puntero = null;
    trazo = null;
    alCambiar();
  }
  canvas.addEventListener('pointerup', terminar);
  canvas.addEventListener('pointercancel', terminar);
  canvas.addEventListener('lostpointercapture', terminar);
  document.querySelectorAll('[data-croquis]').forEach(b => b.addEventListener('click', () => {
    if (bloqueado) return;
    const accion = b.dataset.croquis;
    if (accion === 'deshacer') inspeccion.croquis.pop();
    else if (accion === 'limpiar') {
      if (!inspeccion.croquis.length || !confirm('¿Borrar todos los trazos de este esquema?')) return;
      inspeccion.croquis = [];
    } else herramienta = accion;
    document.querySelectorAll('[data-croquis="lapiz"], [data-croquis="borrador"]').forEach(n => {
      n.classList.toggle('active', n.dataset.croquis === herramienta);
      n.setAttribute('aria-pressed', String(n.dataset.croquis === herramienta));
    });
    redibujar();
    if (accion === 'deshacer' || accion === 'limpiar') alCambiar();
  }));
  redibujar();
}
