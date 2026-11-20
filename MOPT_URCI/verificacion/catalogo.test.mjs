import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO_META, SECCIONES_CATALOGO, RUTAS_CATALOGO, normalizarTexto, claveRuta, filtrarCatalogo, obtenerControl, buscarCaminoCatalogo, datosCaminoCatalogo, referenciaControl } from '../catalogo.js';
import { pintarCatalogo } from '../catalogo-ui.js';

test('reconcilia el inventario nacional y las travesías de las hojas originales',()=>{
  assert.equal(SECCIONES_CATALOGO.filter(s=>s.tipo==='RN').length,1219);
  assert.equal(SECCIONES_CATALOGO.filter(s=>s.tipo==='CT').length,116);
  assert.equal(RUTAS_CATALOGO.filter(r=>r.tipo==='RN').length,336);
  assert.equal(RUTAS_CATALOGO.filter(r=>r.tipo==='CT').length,96);
  assert.equal(new Set(SECCIONES_CATALOGO.map(s=>s.id)).size,1335);
  assert.equal(new Set(SECCIONES_CATALOGO.map(s=>s.seccion)).size,1335);
  for(const s of SECCIONES_CATALOGO){assert.ok(s.fuente.fila>1);assert.equal(s.fuente.archivo,'Red Vial Nacional 2024.xlsx');}
});
test('Heredia reúne 94 secciones RN y 15 CT; 109 códigos coinciden con el RTF',()=>{
  const h=filtrarCatalogo({provincia:'4'});
  assert.equal(h.length,109);assert.equal(h.filter(s=>s.tipo==='RN').length,94);assert.equal(h.filter(s=>s.tipo==='CT').length,15);
  assert.equal(h.filter(s=>s.codigoCaminoHeredia).length,109);
  assert.equal(CATALOGO_META.referenciaHeredia.coincidentes,109);
  assert.equal(SECCIONES_CATALOGO.filter(s=>s.codigoCaminoHeredia&&s.provinciaCodigo!=='4').length,0);
});
test('control 40762 de RN507 conserva fila, código, longitud y superficie de las fuentes',()=>{
  const c=obtenerControl('RN:507:40762');
  assert.equal(c.fuente.hoja,'RVN_0524');assert.equal(c.fuente.fila,785);
  assert.equal(c.codigoCaminoHeredia,'4-0762-00');assert.equal(c.superficieCodigo,'4');assert.equal(c.grupoSuperficie,'no_pavimentada');
  assert.ok(Math.abs(c.longitudKm-8.635)<1e-9);assert.equal(c.anchoM,6.8);assert.equal(normalizarTexto(c.canton),'sarapiqui');
  assert.ok(c.descripcion.includes('Finca Coyol'));assert.equal(c.fechaInventario,'07/12');
});
test('búsqueda por ruta, código, sección y lugar, con tildes y ceros iniciales',()=>{
  for(const texto of ['507','RN 507','rn0507'])assert.equal(filtrarCatalogo({texto}).length,6);
  assert.equal(filtrarCatalogo({texto:'4-0762-00'})[0].id,'RN:507:40762');
  assert.equal(filtrarCatalogo({texto:'40762'})[0].id,'RN:507:40762');
  assert.ok(filtrarCatalogo({texto:'sarapiqui'}).length>0);
  assert.equal(filtrarCatalogo({texto:'Sarapiquí'}).length,filtrarCatalogo({texto:'sarapiqui'}).length);
  assert.equal(filtrarCatalogo({texto:'referencia inexistente xyz'}).length,0);
});
test('filtros combinados y tipos de vía mantienen las secciones correspondientes',()=>{
  const r=filtrarCatalogo({provincia:'4',ruta:'RN:507',superficie:'no_pavimentada'});
  assert.equal(r.length,5);assert.ok(r.every(s=>s.ruta==='507'&&s.superficieCodigo==='4'));
  assert.equal(filtrarCatalogo({provincia:'4',superficie:'no_pavimentada'}).length,15);
  assert.equal(filtrarCatalogo({provincia:'4',tipo:'CT'}).length,15);
  assert.equal(filtrarCatalogo({provincia:'1',ruta:'RN:507'}).length,0);
});
test('reutiliza el camino existente sin alterar su ID, sus datos o su código original',()=>{
  const c=obtenerControl('RN:507:40762');
  for(const codigo of ['507','0507','RN 507','RN-0507','Ruta Nacional 507']) {
    const viejo={id:'id-existente',codigo,nombre:'Nombre de campo',observaciones:'Conservar'};
    const antes=JSON.stringify(viejo);assert.equal(buscarCaminoCatalogo([viejo],c),viejo);assert.equal(JSON.stringify(viejo),antes);
  }
  assert.equal(claveRuta('CT 40101'),'CT:40101');assert.equal(claveRuta('40101'),'CT:40101');
  assert.notEqual(claveRuta('RN 40101'),claveRuta('CT 40101'));
  assert.equal(claveRuta('CONTROL-59'),'MANUAL:control-59');
});
test('separación de referencia histórica y medición: ruta mixta y ancho atípico',()=>{
  const c=obtenerControl('RN:507:40762'),r=datosCaminoCatalogo(c);
  assert.equal(r.superficie,'mixta');assert.equal(r.referenciaCatalogo.anioBase,2024);
  assert.equal(Object.hasOwn(r,'areaM2'),false);assert.equal(Object.hasOwn(r,'ancho'),false);assert.equal(Object.hasOwn(r,'longitud'),false);
  const ref=referenciaControl(c);ref.descripcion='Edición de la copia';assert.notEqual(c.descripcion,ref.descripcion);
  const extremo=obtenerControl('RN:507:40780');assert.equal(extremo.anchoM,.47);assert.equal(extremo.anchoRevisar,true);
  assert.equal(obtenerControl('RN:32:10001'),undefined);
});
test('catálogo público conserva la superficie por confirmar y no incorpora datos de personal',()=>{
  assert.ok(SECCIONES_CATALOGO.filter(s=>s.superficieCodigo==='8').every(s=>s.grupoSuperficie==='por_confirmar'));
  for(const s of SECCIONES_CATALOGO) {assert.equal(Object.hasOwn(s,'cedula'),false);assert.equal(Object.hasOwn(s,'nombrePersona'),false);}
  const html=pintarCatalogo({provincia:'4',tipo:'todas',superficie:'todas',ruta:'todas',texto:'<script>alert(1)</script>'},[],1);
  assert.ok(html.includes('&lt;script&gt;'));assert.equal(html.includes('<script>alert(1)</script>'),false);
});
