import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const raiz = new URL('../', import.meta.url);
const codigo = await readFile(new URL('sw.js', raiz), 'utf8');

function entorno(red = async () => new Response('servidor'), archivosReales = false) {
  const eventos = {};
  const almacen = new Map();
  const borrados = [];
  let activaciones = 0;
  let reclamaciones = 0;
  const cache = {
    async addAll(rutas) {
      for (const ruta of rutas) {
        const datos=archivosReales ? await readFile(new URL(ruta==='./'?'./index.html':ruta,raiz)) : 'copia local';
        almacen.set(new URL(ruta, 'https://urci.example/proyecto/').href, new Response(datos));
      }
    },
    async match(url) { return almacen.get(url)?.clone(); },
    async put(url, respuesta) { almacen.set(url, respuesta); }
  };
  vm.runInNewContext(codigo, {
    URL, Response,
    fetch: red,
    self: {
      registration: { scope: 'https://urci.example/proyecto/' },
      clients: { async claim() { reclamaciones++; } },
      async skipWaiting() { activaciones++; },
      addEventListener(tipo, funcion) { eventos[tipo] = funcion; }
    },
    caches: {
      async open() { return cache; },
      async keys() { return ['mopt-urci-estaticos-v07r1', 'mopt-urci-estaticos-v08r1', 'mopt-urci-estaticos-v09r2', 'mopt-urci-estaticos-v010r1', 'mopt-urci-estaticos-v011r1', 'mopt-urci-estaticos-v012r1', 'mopt-urci-estaticos-v013r1', 'mopt-urci-estaticos-v014r1', 'mopt-urci-estaticos-v015r1', 'mopt-urci-estaticos-v016r1', 'mopt-urci-estaticos-v017r1', 'mopt-urci-estaticos-v018r1', 'otra-aplicacion']; },
      async delete(clave) { borrados.push(clave); }
    }
  });
  async function evento(tipo, propiedades = {}) {
    const pendientes = [];
    let respuesta;
    eventos[tipo]({ ...propiedades,
      waitUntil(p) { pendientes.push(p); },
      respondWith(p) { respuesta = p; }
    });
    const resultado = await respuesta;
    await Promise.all(pendientes);
    return resultado;
  }
  return { evento, almacen, borrados, get activaciones() { return activaciones; }, get reclamaciones() { return reclamaciones; } };
}
function peticion(ruta, method = 'GET') {
  return { request: new Request(new URL(ruta, 'https://urci.example/proyecto/'), { method }) };
}

test('el servidor Dart permite todos los recursos que necesita la aplicación y su caché', async () => {
  const servidor = await readFile(new URL('servir.dart', raiz), 'utf8');
  const bloque = servidor.match(/const _archivosPublicos = <String>\{([\s\S]*?)\};/);
  assert.ok(bloque, 'No se encontró la lista de recursos públicos del servidor.');
  const permitidos = new Set([...bloque[1].matchAll(/'([^']+)'/g)].map(m => m[1]));
  const e = entorno();
  await e.evento('install');
  const faltantes = [...e.almacen.keys()]
    .map(url => url.replace('https://urci.example/proyecto/', '') || 'index.html')
    .filter(ruta => !permitidos.has(ruta));
  assert.deepEqual(faltantes, [], `El servidor bloquearía estos recursos: ${faltantes.join(', ')}`);
});

test('manifiesto instalable e iconos PNG con dimensiones reales', async () => {
  const m = JSON.parse(await readFile(new URL('manifest.webmanifest', raiz), 'utf8'));
  assert.equal(m.id, './index.html');
  assert.equal(m.scope, './');
  assert.equal(m.display, 'standalone');
  for (const size of [192, 512]) {
    const icono = m.icons.find(i => i.sizes === `${size}x${size}` && i.purpose === 'any');
    assert.ok(icono);
    const png = await readFile(new URL(icono.src, raiz));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  assert.ok(m.icons.some(i => i.purpose === 'maskable'));
});
test('instala todos los recursos locales sin activar a mitad de una edición', async () => {
  const e = entorno();
  await e.evento('install');
  assert.equal(e.activaciones, 0);
  for (const url of e.almacen.keys()) {
    const relativa = url.replace('https://urci.example/proyecto/', '') || 'index.html';
    assert.ok((await readFile(new URL(relativa, raiz))).length, relativa);
  }
  assert.ok(e.almacen.has('https://urci.example/proyecto/pwa.js'));
  await e.evento('message', { data: { tipo: 'ACTIVAR_ACTUALIZACION' } });
  assert.equal(e.activaciones, 1);
});
test('sin servidor reabre la página y sus módulos, incluso en un subdirectorio con query', async () => {
  const e = entorno(async () => { throw new TypeError('sin conexión'); });
  await e.evento('install');
  for (const ruta of ['./', './index.html?prueba=1', './app.js', './pwa.js', './catalogo-datos.js', './curvas/tm5-626-urci.png',
    './prueba-mapa.html', './prueba-mapa.js', './busqueda-mapa.js', './lugares-cr.json']) {
    assert.equal(await (await e.evento('fetch', peticion(ruta))).text(), 'copia local');
  }
});
test('con servidor obtiene la edición disponible y la guarda para el próximo uso sin conexión', async () => {
  let conectado = true;
  const e = entorno(async () => {
    if (!conectado) throw new TypeError('sin conexión');
    return new Response('edición nueva');
  });
  await e.evento('install');
  assert.equal(await (await e.evento('fetch', peticion('./app.js'))).text(), 'edición nueva');
  conectado = false;
  assert.equal(await (await e.evento('fetch', peticion('./app.js'))).text(), 'edición nueva');
});
test('no intercepta archivos privados, solicitudes externas o escrituras', async () => {
  const e = entorno();
  for (const p of [peticion('./servir.dart'), peticion('https://otro.example/app.js'), peticion('./app.js', 'POST')]) {
    assert.equal(await e.evento('fetch', p), undefined);
  }
});
test('activar una versión limpia solo los cachés antiguos propios', async () => {
  const e = entorno();
  await e.evento('activate');
  assert.deepEqual(e.borrados, ['mopt-urci-estaticos-v07r1', 'mopt-urci-estaticos-v08r1', 'mopt-urci-estaticos-v09r2', 'mopt-urci-estaticos-v010r1', 'mopt-urci-estaticos-v011r1', 'mopt-urci-estaticos-v012r1', 'mopt-urci-estaticos-v013r1', 'mopt-urci-estaticos-v014r1', 'mopt-urci-estaticos-v015r1', 'mopt-urci-estaticos-v016r1', 'mopt-urci-estaticos-v017r1', 'mopt-urci-estaticos-v018r1']);
  assert.equal(e.reclamaciones, 1);
});

test('sin red entrega el HTML real, toda la cadena de módulos y las fuentes del PDF',async()=>{
  const e=entorno(async()=>{throw new TypeError('red no disponible');},true);
  await e.evento('install');
  const html=await (await e.evento('fetch',peticion('./'))).text();
  assert.ok(html.includes('src="./app.js"'));
  const pendientes=['https://urci.example/proyecto/app.js'],leidos=new Set();
  while(pendientes.length){
    const url=pendientes.pop();if(leidos.has(url))continue;leidos.add(url);
    const respuesta=await e.evento('fetch',peticion(url));assert.ok(respuesta,url);assert.equal(respuesta.status,200);
    const js=await respuesta.text();assert.ok(js.length>30,url);
    for(const m of js.matchAll(/^import[^\n]*?from\s*['"]([^'"]+)['"]/gm))pendientes.push(new URL(m[1],url).href);
  }
  assert.ok(leidos.has('https://urci.example/proyecto/xlsx.js'));
  assert.ok(leidos.has('https://urci.example/proyecto/seguridad.js'));
  for(const ruta of ['./vendor/DejaVuSans.ttf','./vendor/DejaVuSans-Bold.ttf','./vendor/pdf-lib.min.js','./vendor/fontkit.umd.min.js','./vendor/pdf.min.mjs','./vendor/pdf.worker.min.mjs']){
    const respuesta=await e.evento('fetch',peticion(ruta));assert.equal(respuesta.status,200);
    assert.ok((await respuesta.arrayBuffer()).byteLength>10000,ruta);
  }
});
