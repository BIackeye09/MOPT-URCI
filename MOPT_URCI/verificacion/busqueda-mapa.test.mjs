import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { detalleLugar, prepararBusqueda } from '../busqueda-mapa.js';

const { lugares } = JSON.parse(await readFile(new URL('../lugares-cr.json', import.meta.url), 'utf8'));
const buscar = prepararBusqueda(lugares);

test('el catálogo contiene las siete provincias y los 84 cantones, incluidos Monteverde y Puerto Jiménez', () => {
  assert.equal(lugares.filter(lugar => lugar.tipo === 'provincia').length, 7);
  assert.equal(lugares.filter(lugar => lugar.tipo === 'canton').length, 84);
  for (const nombre of ['Monteverde', 'Puerto Jiménez']) {
    const [resultado, ...otros] = buscar(`cantón de ${nombre}`);
    assert.equal(otros.length, 0);
    assert.equal(resultado.nombre, nombre);
    assert.equal(resultado.provincia, 'Puntarenas');
  }
  assert.equal(buscar('provincia de limon')[0].nombre, 'Limón');
});

test('distingue las localidades Chilamate y admite un cantón con o sin tilde', () => {
  const exactos = buscar('Chilamate').filter(lugar => lugar.nombre === 'Chilamate');
  assert.deepEqual(exactos.map(lugar => lugar.canton).sort(), ['Poás', 'Sarapiquí', 'Tarrazú']);
  const [poas] = buscar('chilamate poas');
  assert.equal(detalleLugar(poas), 'Localidad · Distrito San Pedro · Cantón Poás · Alajuela');
  const sarapiqui = buscar('Chilamate, Sarapiquí');
  assert.ok(sarapiqui.length >= 1);
  assert.equal(sarapiqui[0].nombre, 'Chilamate');
  assert.ok(sarapiqui.every(lugar => lugar.canton === 'Sarapiquí'));
});

test('respeta toda la ubicación indicada y conserva las distintas coincidencias de San Pablo', () => {
  const coincidencias = buscar('San Pablo de Heredia');
  assert.deepEqual(coincidencias.map(detalleLugar), [
    'Cantón · Heredia', 'Distrito · Cantón Barva · Heredia', 'Distrito · Cantón San Pablo · Heredia'
  ]);
  assert.deepEqual(buscar('San Pablo de Escazu'), []);
  assert.equal(buscar('Escazu')[0].nombre, 'Escazú');
  assert.equal(buscar('San Rafa Escazu')[0].canton, 'Escazú');
});
