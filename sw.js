/*
 * MOPT URCI — Service Worker.
 * Guarda únicamente los archivos de la aplicación para permitir su apertura
 * sin conexión después de la primera visita exitosa por HTTPS o localhost.
 * No almacena fotografías ni envía información de inspecciones.
 */
const CACHE_ACTUAL = 'mopt-urci-estaticos-v034r3';
const ARCHIVOS = [
  "./",
  "./index.html",
  "./prueba-mapa.html",
  "./prueba-mapa.js",
  "./busqueda-mapa.js",
  "./lugares-cr.json",
  "./sencilla.css",
  "./img/camino-campo.webp",
  "./app.js",
  "./db.js",
  "./pwa.js",
  "./estaciones.js",
  "./seguridad.js",
  "./seguridad-ui.js",
  "./revision.js",
  "./filtro-fechas.js",
  "./eficiencia-detalle.js",
  "./modelo.js",
  "./formularios.js",
  "./eficiencia.js",
  "./eficiencia-db.js",
  "./eficiencia-exportadores.js",
  "./eficiencia-ui.js",
  "./xlsx.js",
  "./exportadores.js",
  "./vista-previa.js",
  "./lectura-urci.js",
  "./guias-lectura.js",
  "./hoja-graficas.js",
  "./curvas-seleccionadas.js",
  "./archivo-plantilla.js",
  "./plantillas-oficiales.js",
  "./libro-formularios.js",
  "./plantillas/Formulario_Limpio.xlsx",
  "./plantillas/01_RVNL_Eficacia_VF.xlsx",
  "./plantillas/02_RVNL_Eficiencia_VF.xlsx",
  "./plantillas/eficiencia-base.pdf",
  "./plantillas/eficiencia-mapa.json",
  "./plantillas/formulario-base.pdf",
  "./plantillas/resumen-base.pdf",
  "./plantillas/curvas-base.pdf",
  "./plantillas/mapa.json",
  "./plantillas/originales.json",
  "./frente.js",
  "./catalogo.js",
  "./catalogo-datos.js",
  "./croquis.js",
  "./motor-urci.js",
  "./motor-curvas.js",
  "./curvas-datos.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./vendor/pdf-lib.min.js",
  "./vendor/fontkit.umd.min.js",
  "./vendor/pdf.min.mjs",
  "./vendor/pdf.worker.min.mjs",
  "./vendor/DejaVuSans.ttf",
  "./vendor/DejaVuSans-Bold.ttf",
  "./curvas/tm5-626-81.png",
  "./curvas/tm5-626-82.png",
  "./curvas/tm5-626-83.png",
  "./curvas/tm5-626-85.png",
  "./curvas/tm5-626-86.png",
  "./curvas/tm5-626-87.png",
  "./curvas/tm5-626-urci.png"
];

self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(CACHE_ACTUAL).then(cache => cache.addAll(ARCHIVOS)));
});

self.addEventListener('activate', evento => {
  evento.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter(clave => clave.startsWith('mopt-urci-estaticos-') && clave !== CACHE_ACTUAL).map(clave => caches.delete(clave)));
    await self.clients.claim();
  })());
});

const URLS = new Set(ARCHIVOS.map(archivo => new URL(archivo, self.registration.scope).href));
self.addEventListener('message', evento => {
  if (evento.data?.tipo === 'ACTIVAR_ACTUALIZACION') evento.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', evento => {
  if (evento.request.method !== 'GET') return;
  const url = new URL(evento.request.url);
  url.search = '';
  if (!URLS.has(url.href)) return;
  evento.respondWith((async () => {
    // Con el servidor disponible, F5 permite ver las ediciones del código.
    // Sin servidor se utiliza la copia local. Solo se cachean archivos públicos.
    const cache = await caches.open(CACHE_ACTUAL);
    try {
      const respuesta = await fetch(evento.request, { cache: 'no-cache' });
      if (respuesta.ok) {
        evento.waitUntil(cache.put(url.href, respuesta.clone()));
        return respuesta;
      }
      const guardada = await cache.match(url.href);
      return guardada || respuesta;
    } catch {
      return await cache.match(url.href) || Response.error();
    }
  })());
});
