import test from 'node:test';
import assert from 'node:assert/strict';
import { crearHojaGraficas } from '../hoja-graficas.js';
import { crearFicha, datosVacios, resultadosFicha, registrosFicha, gruposSeccion } from '../modelo.js';
import { obtenerControl } from '../catalogo.js';
import { documentoFicha } from '../exportadores.js';
import { seccionesPrevia } from '../vista-previa.js';
import { seleccionarDeteriorosConDatos, distribuirCurvas, IMAGENES_ORIGINALES, opcionesPolvo, guiasTarjeta } from '../curvas-seleccionadas.js';
import { graficaLectura } from '../lectura-urci.js';
import { readFile } from 'node:fs/promises';
import { COLORES_LECTURA, COLOR_GUIA_URCI } from '../guias-lectura.js';

function muestra(){
 const datos=datosVacios(),f=crearFicha(datos,obtenerControl('RN:507:40762'),'2026-11-10');f.u.longitud='30';f.u.ancho='5,58';f.u.areaM2='167,4';
 for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
 for(const [c,s,v] of [['81','B','30,5'],['83','M','83,7'],['87','M','48,8']]){const d=f.i.deterioros[c];d.estado='con_deterioro';d.niveles[s].total=v;}
 f.i.deterioros['84'].estado='con_deterioro';f.i.deterioros['84'].polvo='M';return {f,datos};
}
const construir=f=>crearHojaGraficas(f.i,f.u,resultadosFicha(f).urci);
test('hoja de gráficas comparte los 21 valores y la suma exacta del motor, con polvo incluido',()=>{
 const {f}=muestra(),r=resultadosFicha(f).urci,h=construir(f);
 assert.equal(h.tipos.length,7);assert.equal(h.total,r.vdt);assert.equal(h.totalDisponible,true);
 assert.equal(h.tipos.filter(t=>t.grafica).length,6);
 assert.equal(h.tipos.find(t=>t.codigo==='84').subtotal,4);
 const suma=h.sumandos.reduce((s,d)=>s+d.valor,0);assert.ok(Math.abs(suma-h.total)<1e-10);
 for(const [i,fila] of h.tipos.flatMap(t=>t.filas).entries())assert.equal(fila.deduccion,r.filas[i].deduccion);
});
test('guía L sube desde la densidad, toca el trazo y termina en el eje izquierdo',()=>{
 const {f}=muestra(),g=construir(f).tipos.find(t=>t.codigo==='81').grafica,guia=g.guias[0];
 assert.equal(guia.letra,'L');assert.ok(Math.abs(guia.densidad-30.5/167.4*100)<1e-10);
 assert.ok(guia.pie.y>guia.punto.y);assert.ok(guia.izquierda.x<guia.punto.x);assert.ok(guia.curva.length>100);
 assert.ok(guia.punto.x>0&&guia.punto.x<g.ancho);assert.ok(guia.punto.y>0&&guia.punto.y<g.alto);
});
test('las tres severidades del mismo deterioro conservan L/M/H y sus lecturas separadas',()=>{
 const {f}=muestra();f.i.deterioros['81'].niveles.M.total='20';f.i.deterioros['81'].niveles.A.total='10';
 const t=construir(f).tipos[0];assert.deepEqual(t.grafica.guias.map(g=>g.letra),['L','M','H']);
 assert.equal(t.subtotal,t.filas.reduce((s,f)=>s+f.deduccion,0));
});
test('las flechas rojas sin contorno ni círculos coinciden en pantalla y en las guías de las descargas',async()=>{
 const {f}=muestra();f.i.deterioros['81'].niveles.M.total='20';f.i.deterioros['81'].niveles.A.total='10';
 const r=resultadosFicha(f).urci,h=construir(f),html=graficaLectura('81',r),mapa=JSON.parse(await readFile(new URL('../plantillas/mapa.json',import.meta.url),'utf8'));
 for(const severidad of ['B','M','A'])assert.ok(html.includes(`stroke="${COLORES_LECTURA[severidad]}"`));
 for(const tarjeta of distribuirCurvas(h).tarjetas)for(const guia of guiasTarjeta(tarjeta,mapa.graficas))assert.equal(guia.color,COLORES_LECTURA[{L:'B',M:'M',H:'A'}[guia.letra]]);
 assert.doesNotMatch(html,/stroke="white"|<circle/);assert.equal(COLOR_GUIA_URCI,'#D71920');assert.ok(Object.values(COLORES_LECTURA).every(c=>c===COLOR_GUIA_URCI));assert.ok(graficaLectura('urci',r).includes(`stroke="${COLOR_GUIA_URCI}"`));
});
test('sin deterioro no reutiliza cantidades ocultas de una captura anterior',()=>{
 const {f}=muestra();f.i.deterioros['81'].estado='sin_deterioro';
 const t=construir(f).tipos[0];assert.equal(t.subtotal,0);assert.equal(t.grafica.guias.length,0);assert.ok(t.filas.every(v=>v.cantidad===null));
});
test('faltantes y densidades fuera del eje conservan VDT pendiente y no generan cruces falsos',()=>{
 const {f}=muestra();f.i.deterioros['81'].niveles.B.total='5000';
 let h=construir(f);assert.equal(h.totalDisponible,false);assert.equal(h.total,null);assert.equal(h.tipos[0].grafica.guias.length,0);
 f.u.ancho='';h=construir(f);assert.equal(h.totalDisponible,false);assert.ok(h.tipos.filter(t=>t.grafica).every(t=>t.grafica.guias.length===0));
});
test('VDT cero confirmado y VDT fuera del eje URCI se conservan como sumas válidas',()=>{
 const {f}=muestra();for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
 assert.equal(construir(f).total,0);assert.equal(construir(f).totalDisponible,true);
 const r=resultadosFicha(f).urci;r.vdt=240;r.q=8;r.estado='fuera_rango';
 assert.equal(crearHojaGraficas(f.i,f.u,r).total,240);assert.equal(crearHojaGraficas(f.i,f.u,r).totalDisponible,true);
});
test('la vista previa de gráficas permanece separada del formulario oficial',()=>{
 const {f,datos}=muestra();for(const {tabla,registro}of registrosFicha(f))datos[tabla].push(registro);
 const doc=documentoFicha(f,gruposSeccion(datos)[0]);assert.deepEqual(seccionesPrevia(doc,'graficas'),['graficas']);
});
test('sólo aparecen deterioros con cantidades positivas o polvo seleccionado',()=>{
 const {f}=muestra();assert.deepEqual(seleccionarDeteriorosConDatos(construir(f)).map(t=>t.codigo),['81','83','84','87']);
 f.i.deterioros['81'].estado='sin_deterioro';f.i.deterioros['82'].estado='con_deterioro';f.i.deterioros['82'].niveles.B.total='0';
 f.i.deterioros['84'].polvo='';assert.deepEqual(seleccionarDeteriorosConDatos(construir(f)).map(t=>t.codigo),['83','87']);
});
test('la hoja se adapta de cero a siete deterioros sin recortar ni deformar imágenes',()=>{
 const {f}=muestra();for(const d of Object.values(f.i.deterioros))d.estado='con_deterioro';
 for(const [codigo,d]of Object.entries(f.i.deterioros))if(codigo!=='84')for(const n of Object.values(d.niveles))n.total='2';
 const h=construir(f);
 for(let n=0;n<=7;n++){
  const plan=distribuirCurvas({...h,tipos:h.tipos.slice(0,n)});assert.equal(plan.tarjetas.length,n);
  for(const t of plan.tarjetas){assert.ok(t.x>=0&&t.y>=0&&t.x+t.ancho<=plan.ancho&&t.y+t.alto<=plan.alto);
   if(t.imagen){const m=t.imagen,o=IMAGENES_ORIGINALES[t.tipo.codigo];assert.ok(Math.abs(m.ancho/m.alto-o.ancho/o.alto)<1e-12);assert.ok(t.lecturasY+t.lecturas.length*15<t.y+t.alto);}
  }
 }
});
test('una muestra sin deterioros no incorpora gráficas; polvo no añade una figura ajena',()=>{
 const {f}=muestra();for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';assert.equal(distribuirCurvas(construir(f)).tarjetas.length,0);
 f.i.deterioros['84'].estado='con_deterioro';f.i.deterioros['84'].polvo='A';const p=distribuirCurvas(construir(f));assert.equal(p.tarjetas.length,1);assert.equal(p.tarjetas[0].imagen,null);assert.deepEqual(p.tarjetas[0].lecturas,['Baja (L): VD 2','Media (M): VD 4','Alta (H): VD 15']);
});
test('polvo siempre muestra tres opciones y sólo un círculo seleccionado; responde a cambios y ausencia',()=>{
 const {f}=muestra();
 for(const id of ['B','M','A']){
  f.i.deterioros['84'].polvo=id;
  const tipo=construir(f).tipos.find(t=>t.codigo==='84'),opciones=opcionesPolvo(tipo),html=graficaLectura('84',resultadosFicha(f).urci);
  assert.deepEqual(opciones.map(n=>n.valor),[2,4,15]);assert.deepEqual(opciones.filter(n=>n.seleccionada).map(n=>n.id),[id]);
  assert.equal((html.match(/circulo-polvo/g)||[]).length,3);assert.equal((html.match(/aria-current="true"/g)||[]).length,1);
  for(const texto of ['Baja (L)','Media (M)','Alta (H)'])assert.ok(html.includes(texto));
 }
 f.i.deterioros['84'].estado='sin_deterioro';assert.doesNotMatch(graficaLectura('84',resultadosFicha(f).urci),/aria-current="true"/);
 assert.ok(opcionesPolvo(construir(f).tipos.find(t=>t.codigo==='84')).every(n=>!n.seleccionada));
});
test('las guías de PDF y Excel apuntan hacia la curva y el eje sin salir de su tarjeta',async()=>{
 const {f}=muestra(),mapa=JSON.parse(await readFile(new URL('../plantillas/mapa.json',import.meta.url),'utf8'));
 for(const tarjeta of distribuirCurvas(construir(f)).tarjetas)for(const g of guiasTarjeta(tarjeta,mapa.graficas)){
  assert.equal(g.flechas.length,2);assert.deepEqual(g.flechas[0][1],g.punto);assert.deepEqual(g.flechas[1][1],g.izquierda);
  for(const punto of [...g.recorrido,...g.flechas.flat()])assert.ok(punto.x>=tarjeta.x&&punto.y>=tarjeta.y&&punto.x<=tarjeta.x+tarjeta.ancho&&punto.y<=tarjeta.y+tarjeta.alto);
 }
});
