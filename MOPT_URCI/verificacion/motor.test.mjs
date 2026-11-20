import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularInspeccion, calcularDesdeDeducciones, leerDeduccion, interpolar, clasificarURCI, resumirSeccion, puntoEnGrafica, coordenadasEnGrafica } from '../motor-urci.js';
import { TRAZADOS } from '../motor-curvas.js';
import { DETERIOROS } from '../frente.js';

const seccion = { superficie: 'no_pavimentada' };
function ficha(area = '167.4') {
  return {
    i: { unidadId: 'u1', deterioros: Object.fromEntries(DETERIOROS.map(t => [t.codigo, {
      estado: 'sin_deterioro',
      niveles: Object.fromEntries(['B','M','A'].map(n => [n, { modo:'total', total:'', registros:[], unidad:t.unidad }]))
    }])) },
    u: { id:'u1', areaM2:area, seleccion:'seleccionada' }
  };
}
function medir(f, c, s, cantidad) {
  f.i.deterioros[c].estado='con_deterioro';
  f.i.deterioros[c].niveles[s].total=String(cantidad);
}
function polvo(f, s) { f.i.deterioros['84'].estado='con_deterioro'; f.i.deterioros['84'].polvo=s; }

test('ejemplo completo 3-3 métrico: URCI 59, usando cantidades originales', () => {
  const f=ficha(); medir(f,'81','B','30.5');medir(f,'83','M','83.7');polvo(f,'M');medir(f,'87','M','48.8');
  const antes=JSON.stringify(f), r=calcularInspeccion(f.i,f.u,seccion);
  assert.equal(r.estado,'calculado');assert.equal(r.q,3);assert.equal(r.urci,59);assert.equal(r.calificacion,'Bueno');
  assert.ok(Math.abs(r.urciExacto-59)<1);assert.equal(JSON.stringify(f),antes);
});
test('figura 3-2, muestra métrica independiente: URCI 25', () => {
  const f=ficha('130');medir(f,'81','M','30.5');medir(f,'82','A','61');polvo(f,'B');medir(f,'86','M','45.5');medir(f,'86','A','84.5');
  const r=calcularInspeccion(f.i,f.u,seccion);
  assert.equal(r.q,4);assert.equal(r.urci,25);assert.ok(Math.abs(r.urciExacto-25)<1);assert.equal(r.calificacion,'Malo');
});
test('curva C-8: controles numéricos publicados, sin recalcular sus deducciones', () => {
  assert.equal(calcularDesdeDeducciones([13,29,4,18]).urci,59);
  assert.equal(calcularDesdeDeducciones([19,36,2,31,44]).urci,25);
});
test('puntos individuales publicados: diferencia gráfica máxima de 2 puntos en estos controles', () => {
  for (const [c,s,x,esperado] of [['81','B',30.5/167.4*100,13],['83','M',50,29],['87','M',48.8/167.4*100,18],['81','M',30.5/130*100,19],['82','A',61/130*100,36],['86','M',35,31],['86','A',65,44]]) {
    assert.ok(Math.abs(leerDeduccion(c,s,x)-esperado)<=2,`${c} ${s}`);
  }
});
test('polvo L/M/H, ausencia confirmada y q=0 o 1', () => {
  const f=ficha();assert.equal(calcularInspeccion(f.i,f.u,seccion).urci,100);
  for(const [s,vd] of [['B',2],['M',4],['A',15]]) { polvo(f,s);const r=calcularInspeccion(f.i,f.u,seccion);assert.equal(r.vdt,vd);assert.equal(r.urci,100-vd); }
});
test('q aplica >5 a los valores originales y expone la alternativa inclusiva', () => {
  const r=calcularDesdeDeducciones([5,5.00000001,4]);assert.equal(r.q,1);assert.equal(r.qInclusivo,2);
  assert.equal(calcularDesdeDeducciones([4.999999999,5]).q,0);
});
test('se rechazan áreas inválidas, datos negativos, coma decimal y estados pendientes', () => {
  for(const area of ['', '0','-1','NaN','Infinity']) {const f=ficha(area);assert.equal(calcularInspeccion(f.i,f.u,seccion).urci,null);}
  const f=ficha('167,4');medir(f,'81','B','30,5');assert.equal(calcularInspeccion(f.i,f.u,seccion).estado,'calculado');
  medir(f,'81','B','-2');assert.equal(calcularInspeccion(f.i,f.u,seccion).urci,null);
  f.i.deterioros['81'].estado='pendiente';assert.equal(calcularInspeccion(f.i,f.u,seccion).urci,null);
  assert.equal(calcularInspeccion(undefined,f.u,seccion).urci,null);
});
test('se utiliza solo la modalidad activa y no se borran medidas anteriores', () => {
  const f=ficha();medir(f,'81','B','30.5');const a=calcularInspeccion(f.i,f.u,seccion);
  const n=f.i.deterioros['81'].niveles.B;n.modo='detalles';n.registros=['10.5','20'];n.total='9999';
  assert.equal(calcularInspeccion(f.i,f.u,seccion).vdt,a.vdt);assert.equal(n.total,'9999');
  f.i.deterioros['81'].estado='sin_deterioro';assert.equal(calcularInspeccion(f.i,f.u,seccion).urci,100);assert.equal(n.total,'9999');
});
test('unidades incompatibles y secciones pavimentadas no producen índice', () => {
  const f=ficha();medir(f,'81','B','30.5');f.i.deterioros['81'].niveles.B.unidad='pies';
  assert.equal(calcularInspeccion(f.i,f.u,seccion).urci,null);
  f.i.deterioros['81'].niveles.B.unidad='m';assert.equal(calcularInspeccion(f.i,f.u,{superficie:'pavimentada'}).urci,null);
});
test('límites: sin extensión de densidades o q y sin ajustar q>7 a 7', () => {
  assert.equal(leerDeduccion('81','B',50.01),null);assert.equal(leerDeduccion('81','B',-0.01),null);
  assert.notEqual(leerDeduccion('81','B',50),null);
  assert.equal(calcularDesdeDeducciones(Array(8).fill(10)).estado,'fuera_rango');
  assert.equal(calcularDesdeDeducciones([90,90,30]).estado,'fuera_rango');
  assert.equal(calcularDesdeDeducciones([6,6]).estado,'fuera_rango');
  assert.equal(calcularDesdeDeducciones([90,90]).urci,0);
});
test('editar una medida invalida el índice anterior y reabrir permite reconstruirlo', () => {
  const f=ficha();medir(f,'81','B','30.5');const a=calcularInspeccion(f.i,f.u,seccion);
  const copia=JSON.parse(JSON.stringify(f));assert.equal(calcularInspeccion(copia.i,copia.u,seccion).urci,a.urci);
  copia.u.areaM2='0';assert.equal(calcularInspeccion(copia.i,copia.u,seccion).urci,null);
  copia.u.areaM2=f.u.areaM2;medir(copia,'81','B','40');assert.notEqual(calcularInspeccion(copia.i,copia.u,seccion).vdt,a.vdt);
});
test('promedio de sección completo, muestras excluidas y pendientes', () => {
  const a=ficha(),b=ficha();b.i.unidadId=b.u.id='u2';polvo(a,'M');polvo(b,'A');
  let r=resumirSeccion([a.u,b.u],[a.i,b.i],seccion);assert.equal(r.promedio,(96+85)/2);assert.equal(r.urci,91);
  r=resumirSeccion([a.u,b.u],[a.i],seccion);assert.equal(r.urci,null);assert.equal(r.pendientes,1);
  b.u.seleccion='no_seleccionada';assert.equal(resumirSeccion([a.u,b.u],[a.i],seccion).urci,96);
  assert.equal(resumirSeccion([],[],seccion).urci,null);
});
test('clasificación de los límites publicados', () => {
  for(const [n,t] of [[100,'Excelente'],[85,'Excelente'],[84,'Muy bueno'],[70,'Muy bueno'],[55,'Bueno'],[40,'Regular'],[25,'Malo'],[10,'Muy malo'],[0,'Fallado']]) assert.equal(clasificarURCI(n),t);
});
test('trazos monótonos, severidades ordenadas y curvas q sin cruces', () => {
  for(const [c,curvas] of Object.entries(TRAZADOS))for(const puntos of Object.values(curvas)) {
    for(let k=1;k<puntos.length;k++) {assert.ok(puntos[k][0]>puntos[k-1][0]);assert.ok(c==='urci'?puntos[k][1]<=puntos[k-1][1]:puntos[k][1]>=puntos[k-1][1]);}
  }
  for(const c of ['81','82','83','85','86','87'])for(let k=0;k<=100;k++) {
    const x=k/100*TRAZADOS[c].B.at(-1)[0];assert.ok(leerDeduccion(c,'B',x)<=leerDeduccion(c,'M',x)+.05);assert.ok(leerDeduccion(c,'M',x)<=leerDeduccion(c,'A',x)+.05);
  }
  for(let q=2;q<7;q++) {
    const a=TRAZADOS.urci[String(q)],b=TRAZADOS.urci[String(q+1)];
    const inicio=Math.max(a[0][0],b[0][0]), fin=Math.min(a.at(-1)[0],b.at(-1)[0]);
    for(let k=0;k<=100;k++) {const x=inicio+(fin-inicio)*k/100;assert.ok(interpolar(a,x)<=interpolar(b,x)+.05);}
  }
});
test('proyección e inversa colocan lecturas sobre los ejes inclinados originales', () => {
  for(const c of ['81','82','83','85','86','87','urci'])for(const [x,y] of [[0,0],[10,10],[20,30]]) {
    const p=puntoEnGrafica(c,x,y), r=coordenadasEnGrafica(c,p.x,p.y);assert.ok(Math.abs(r.x-x)<1e-6);assert.ok(Math.abs(r.y-y)<1e-6);
  }
});
