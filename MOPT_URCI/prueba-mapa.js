import { detalleLugar, prepararBusqueda } from './busqueda-mapa.js';

const SERVIDOR_MAPA = 'https://tile.openstreetmap.org';
const LADO_TESELA = 256;
const ZOOM_MINIMO = 6;
const ZOOM_MAXIMO = 19;

const mapa = document.querySelector('.visor-prueba-mapa');
const plano = mapa.querySelector('.teselas-prueba-mapa');
const estado = document.getElementById('estado-mapa');
const acercar = document.getElementById('acercar-mapa');
const alejar = document.getElementById('alejar-mapa');
const reintentar = document.getElementById('reintentar-mapa');
const volver = document.getElementById('volver-urci');
const capturar = document.getElementById('capturar-mapa');
const dentroDeURCI = window.frameElement !== null;
document.body.classList.toggle('mapa-integrado', dentroDeURCI);
volver.hidden = dentroDeURCI || !window.isSecureContext || !window.location.pathname.endsWith('/prueba-mapa.html');

function vistaDeLugar(latitud, longitud, zoom) {
  const radianes = latitud * Math.PI / 180;
  return {
    x: (180 + longitud) / 360,
    y: (1 - Math.asinh(Math.tan(radianes)) / Math.PI) / 2,
    zoom
  };
}

function vistaCostaRica() {
  let zoom = ZOOM_MINIMO;
  if (mapa.clientWidth >= 320 && mapa.clientHeight >= 315) zoom = 7;
  if (mapa.clientWidth >= 640 && mapa.clientHeight >= 620) zoom = 8;
  return vistaDeLugar(9.575, -84.26, zoom);
}

let vista = vistaCostaRica();
let cargaActual = 0;
let teselasListas = false;
let solicitudCroquis = null;
const punteros = new Map();
let inicioGesto = null;
let zoomTemporal = null;
let finZoom = null;

function actualizarCaptura() {
  capturar.disabled = !teselasListas || punteros.size > 0 || zoomTemporal !== null;
}

function teselasVisibles(ancho, alto) {
  const total = 2 ** vista.zoom;
  const mundo = total * LADO_TESELA;
  const origenX = Math.floor(vista.x * mundo - ancho / 2);
  const origenY = Math.max(0, Math.min(mundo - alto, Math.floor(vista.y * mundo - alto / 2)));
  const teselas = [];
  for (let y = Math.floor(origenY / LADO_TESELA); y * LADO_TESELA < origenY + alto; y++) {
    for (let x = Math.floor(origenX / LADO_TESELA); x * LADO_TESELA < origenX + ancho; x++) {
      const columna = (x + total) % total;
      teselas.push({
        url: `${SERVIDOR_MAPA}/${vista.zoom}/${columna}/${y}.png`,
        izquierda: x * LADO_TESELA - origenX,
        arriba: y * LADO_TESELA - origenY
      });
    }
  }
  return teselas;
}

function agregarTesela({ url, izquierda, arriba }, destino) {
  const imagen = new Image(LADO_TESELA, LADO_TESELA);
  imagen.alt = '';
  imagen.crossOrigin = 'anonymous';
  imagen.referrerPolicy = 'strict-origin-when-cross-origin';
  imagen.style.left = `${izquierda}px`;
  imagen.style.top = `${arriba}px`;
  return new Promise(resolve => {
    imagen.onload = () => resolve(true);
    imagen.onerror = () => {
      imagen.hidden = true;
      resolve(false);
    };
    imagen.src = url;
    destino.appendChild(imagen);
  });
}

async function cargarMapa() {
  const ancho = mapa.clientWidth, alto = mapa.clientHeight;
  if (!ancho || !alto) return;
  const actual = ++cargaActual;
  teselasListas = false;
  actualizarCaptura();
  const destino = document.createDocumentFragment();
  const cargas = teselasVisibles(ancho, alto)
    .map(tesela => agregarTesela(tesela, destino));
  plano.style.transform = '';
  plano.replaceChildren(destino);
  acercar.disabled = vista.zoom >= ZOOM_MAXIMO;
  alejar.disabled = vista.zoom <= ZOOM_MINIMO;
  estado.textContent = 'Cargando mapa…';
  reintentar.hidden = true;
  const limite = setTimeout(() => {
    if (actual !== cargaActual) return;
    estado.textContent = 'El mapa está tardando en cargar.';
    reintentar.hidden = false;
  }, 10000);
  const resultados = await Promise.all(cargas);
  clearTimeout(limite);
  if (actual !== cargaActual) return;
  teselasListas = resultados.every(Boolean);
  estado.textContent = teselasListas ? '' : 'El mapa no se cargó por completo. Revisá tu conexión y reintentá.';
  reintentar.hidden = teselasListas;
  actualizarCaptura();
}

function desplazar(dx, dy, zoom = vista.zoom) {
  const mundo = LADO_TESELA * 2 ** vista.zoom;
  vista.zoom = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, zoom));
  const limiteY = mapa.clientHeight / (2 * LADO_TESELA * 2 ** vista.zoom);
  const x = (vista.x + dx / mundo) % 1;
  vista.x = x < 0 ? x + 1 : x;
  vista.y = Math.max(limiteY, Math.min(1 - limiteY, vista.y + dy / mundo));
  cargarMapa();
}

function puntoDelMapa(evento) {
  const borde = mapa.getBoundingClientRect();
  return {
    x: Number.isFinite(evento.clientX) ? evento.clientX - borde.left - mapa.clientLeft : mapa.clientWidth / 2,
    y: Number.isFinite(evento.clientY) ? evento.clientY - borde.top - mapa.clientTop : mapa.clientHeight / 2,
    tipo: evento.pointerType
  };
}

function medirGesto() {
  const [primero, segundo] = punteros.values();
  if (!primero) return null;
  if (!segundo) return { ...primero, distancia: 1 };
  return {
    x: (primero.x + segundo.x) / 2,
    y: (primero.y + segundo.y) / 2,
    distancia: Math.max(1, Math.hypot(segundo.x - primero.x, segundo.y - primero.y))
  };
}

function escalaLimitada(escala) {
  const minimo = 2 ** (ZOOM_MINIMO - vista.zoom);
  const maximo = 2 ** (ZOOM_MAXIMO - vista.zoom);
  return Math.min(maximo, Math.max(minimo, escala));
}

function mostrarTransformacion(inicio, final, escala) {
  const x = final.x - inicio.x * escala;
  const y = final.y - inicio.y * escala;
  plano.style.transform = `translate(${x}px, ${y}px) scale(${escala})`;
}

function aplicarTransformacion(inicio, final, factor) {
  const salto = Math.round(Math.log2(factor));
  const escala = 2 ** salto;
  const mitadX = mapa.clientWidth / 2;
  const mitadY = mapa.clientHeight / 2;
  // Conserva bajo los dedos el punto del mapa que inició el gesto.
  const dx = inicio.x - mitadX - (final.x - mitadX) / escala;
  const dy = inicio.y - mitadY - (final.y - mitadY) / escala;
  if (dx || dy || salto) desplazar(dx, dy, vista.zoom + salto);
}

function aplicarGesto() {
  const final = medirGesto();
  aplicarTransformacion(inicioGesto, final, escalaLimitada(final.distancia / inicioGesto.distancia));
}

function terminarZoom() {
  clearTimeout(finZoom);
  if (!zoomTemporal) return;
  const { punto, escala } = zoomTemporal;
  zoomTemporal = null;
  plano.style.transform = '';
  aplicarTransformacion(punto, punto, escala);
  actualizarCaptura();
}

mapa.addEventListener('wheel', evento => {
  if (!evento.ctrlKey && !evento.metaKey) return;
  evento.preventDefault();
  if (punteros.size || zoomTemporal?.safari || !evento.deltaY) return;
  zoomTemporal ??= { punto: puntoDelMapa(evento), escala: 1 };
  const unidades = evento.deltaMode === 1 ? 16 : evento.deltaMode === 2 ? mapa.clientHeight : 1;
  zoomTemporal.escala = escalaLimitada(zoomTemporal.escala * 2 ** (-evento.deltaY * unidades / 120));
  mostrarTransformacion(zoomTemporal.punto, zoomTemporal.punto, zoomTemporal.escala);
  actualizarCaptura();
  clearTimeout(finZoom);
  finZoom = setTimeout(terminarZoom, 140);
}, { passive: false });

// Safari también puede notificar el pellizco del trackpad como un GestureEvent.
mapa.addEventListener('gesturestart', evento => {
  evento.preventDefault();
  if (punteros.size) return;
  terminarZoom();
  zoomTemporal = { punto: puntoDelMapa(evento), escala: 1, safari: true };
  actualizarCaptura();
}, { passive: false });
mapa.addEventListener('gesturechange', evento => {
  evento.preventDefault();
  if (!zoomTemporal?.safari || !Number.isFinite(evento.scale)) return;
  zoomTemporal.escala = escalaLimitada(evento.scale);
  mostrarTransformacion(zoomTemporal.punto, zoomTemporal.punto, zoomTemporal.escala);
}, { passive: false });
mapa.addEventListener('gestureend', evento => {
  evento.preventDefault();
  if (zoomTemporal?.safari) terminarZoom();
}, { passive: false });

const desplazamientos = {
  ArrowLeft: [-96, 0],
  ArrowRight: [96, 0],
  ArrowUp: [0, -96],
  ArrowDown: [0, 96]
};
mapa.addEventListener('keydown', evento => {
  const paso = desplazamientos[evento.key];
  if (!paso || evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
  evento.preventDefault();
  if (!evento.repeat && !punteros.size) {
    terminarZoom();
    desplazar(...paso);
  }
});
mapa.addEventListener('pointerdown', evento => {
  if (evento.button !== 0 || punteros.size >= 2 || punteros.has(evento.pointerId)) return;
  if (punteros.size) {
    if (evento.pointerType !== 'touch' || punteros.values().next().value.tipo !== 'touch') return;
    aplicarGesto();
  } else {
    terminarZoom();
    mapa.focus({ preventScroll: true });
  }
  mapa.setPointerCapture(evento.pointerId);
  punteros.set(evento.pointerId, puntoDelMapa(evento));
  inicioGesto = medirGesto();
  actualizarCaptura();
});
mapa.addEventListener('pointermove', evento => {
  if (!punteros.has(evento.pointerId)) return;
  punteros.set(evento.pointerId, puntoDelMapa(evento));
  const final = medirGesto();
  mostrarTransformacion(inicioGesto, final, escalaLimitada(final.distancia / inicioGesto.distancia));
});
function terminarPuntero(evento) {
  if (!punteros.has(evento.pointerId)) return;
  if (evento.type === 'pointerup') {
    punteros.set(evento.pointerId, puntoDelMapa(evento));
    aplicarGesto();
  }
  punteros.delete(evento.pointerId);
  inicioGesto = medirGesto();
  plano.style.transform = '';
  actualizarCaptura();
}
mapa.addEventListener('pointerup', terminarPuntero);
mapa.addEventListener('pointercancel', terminarPuntero);
mapa.addEventListener('lostpointercapture', terminarPuntero);

acercar.addEventListener('click', () => { terminarZoom(); desplazar(0, 0, vista.zoom + 1); });
alejar.addEventListener('click', () => { terminarZoom(); desplazar(0, 0, vista.zoom - 1); });
document.getElementById('centrar-mapa').addEventListener('click', () => {
  terminarZoom();
  vista = vistaCostaRica();
  cargarMapa();
});
reintentar.addEventListener('click', cargarMapa);

const formularioBusqueda = document.getElementById('buscar-lugar');
const entradaLugar = document.getElementById('entrada-lugar');
const panelBusqueda = document.getElementById('panel-busqueda-mapa');
const estadoBusqueda = document.getElementById('estado-busqueda-mapa');
const resultadosBusqueda = document.getElementById('lugares-encontrados');
let catalogo;
let consultaActual = 0;

function cerrarBusqueda() {
  consultaActual++;
  panelBusqueda.hidden = true;
}

function mostrarLugar(lugar) {
  cerrarBusqueda();
  entradaLugar.value = lugar.nombre;
  terminarZoom();
  const zoom = { provincia: mapa.clientWidth >= 640 ? 9 : 8, canton: 11, distrito: 12, localidad: 14 };
  vista = vistaDeLugar(lugar.latitud, lugar.longitud, zoom[lugar.tipo]);
  mapa.focus({ preventScroll: true });
  cargarMapa();
}

function botonLugar(lugar) {
  const fila = document.createElement('li');
  const boton = document.createElement('button');
  const nombre = document.createElement('strong');
  const detalle = document.createElement('span');
  boton.type = 'button';
  nombre.textContent = lugar.nombre;
  detalle.textContent = detalleLugar(lugar);
  boton.append(nombre, detalle);
  boton.addEventListener('click', () => mostrarLugar(lugar));
  fila.append(boton);
  return fila;
}

entradaLugar.addEventListener('input', cerrarBusqueda);
formularioBusqueda.addEventListener('keydown', evento => {
  if (evento.key !== 'Escape' || panelBusqueda.hidden) return;
  evento.preventDefault();
  evento.stopPropagation();
  cerrarBusqueda();
  entradaLugar.focus();
});
document.addEventListener('pointerdown', evento => {
  if (!panelBusqueda.hidden && !formularioBusqueda.contains(evento.target)) cerrarBusqueda();
});
formularioBusqueda.addEventListener('submit', async evento => {
  evento.preventDefault();
  const consulta = ++consultaActual;
  const texto = entradaLugar.value.trim();
  resultadosBusqueda.replaceChildren();
  panelBusqueda.hidden = false;
  estadoBusqueda.textContent = 'Buscando lugares…';

  catalogo ??= fetch('./lugares-cr.json').then(async respuesta => {
    if (!respuesta.ok) throw new Error('No se pudo cargar el catálogo de lugares.');
    const { lugares } = await respuesta.json();
    return prepararBusqueda(lugares);
  }).catch(error => {
    catalogo = null;
    throw error;
  });

  let buscar;
  try {
    buscar = await catalogo;
  } catch {
    if (consulta === consultaActual) estadoBusqueda.textContent = 'No se pudo abrir el buscador. Pulsá Buscar para reintentar.';
    return;
  }
  if (consulta !== consultaActual) return;

  const lugares = buscar(texto);
  if (lugares.length === 1) {
    mostrarLugar(lugares[0]);
    return;
  }
  if (!lugares.length) {
    estadoBusqueda.textContent = 'No encontramos ese lugar. Probá con el nombre del distrito o cantón.';
    return;
  }

  const visibles = lugares.slice(0, 12);
  estadoBusqueda.textContent = lugares.length > visibles.length
    ? `Se muestran ${visibles.length} de ${lugares.length} lugares. Agregá el cantón o la provincia para afinar la búsqueda.`
    : 'Elegí el lugar que querés ver.';
  resultadosBusqueda.replaceChildren(...visibles.map(botonLugar));
  panelBusqueda.scrollTop = 0;
  resultadosBusqueda.querySelector('button').focus({ preventScroll: true });
});

window.addEventListener('message', evento => {
  if (!dentroDeURCI || evento.source !== window.parent || evento.origin !== location.origin ||
      evento.data?.tipo !== 'urci:preparar-croquis') return;
  solicitudCroquis = evento.data.solicitud;
  capturar.hidden = false;
  const guardada = evento.data.vista;
  if (guardada && [guardada.x, guardada.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1) &&
      Number.isInteger(guardada.zoom) && guardada.zoom >= ZOOM_MINIMO && guardada.zoom <= ZOOM_MAXIMO) {
    vista = { ...guardada };
    cargarMapa();
  } else {
    actualizarCaptura();
  }
});

function imagenDelEncuadre() {
  const ancho = mapa.clientWidth, alto = mapa.clientHeight;
  const lienzo = document.createElement('canvas');
  lienzo.width = 1200;
  lienzo.height = 600;
  const ctx = lienzo.getContext('2d');
  const altoMapa = lienzo.height - 50;
  const escala = Math.min(lienzo.width / ancho, altoMapa / alto);
  const x = (lienzo.width - ancho * escala) / 2;
  const y = (altoMapa - alto * escala) / 2;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, ancho * escala, alto * escala);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(escala, escala);
  for (const tesela of plano.querySelectorAll('img')) {
    ctx.drawImage(tesela, parseFloat(tesela.style.left), parseFloat(tesela.style.top), LADO_TESELA, LADO_TESELA);
  }
  ctx.restore();
  ctx.fillStyle = '#142e42';
  ctx.font = '600 31px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('© OpenStreetMap contributors · openstreetmap.org/copyright', 600, 575, 1168);
  return lienzo.toDataURL('image/png');
}

capturar.addEventListener('click', () => {
  if (capturar.disabled || solicitudCroquis === null) return;
  try {
    const imagen = imagenDelEncuadre();
    window.parent.postMessage({
      tipo: 'urci:mapa-capturado',
      solicitud: solicitudCroquis,
      captura: { imagen, vista: { ...vista } }
    }, location.origin);
  } catch (error) {
    console.warn('No se pudo capturar el mapa:', error);
    estado.textContent = 'No se pudo capturar el mapa. Reintentá cargar el encuadre.';
    reintentar.hidden = false;
  }
});
new ResizeObserver(cargarMapa).observe(mapa);
