import test from 'node:test';
import assert from 'node:assert/strict';
import {seguridadNueva,actualizarSeguridad,calcularSeguridad,nivelErosion} from '../seguridad.js';
import {crearFicha,datosVacios,registrosFicha,buscarFicha,resultadosFicha,gruposSeccion} from '../modelo.js';
import {obtenerControl} from '../catalogo.js';
import {camposFicha} from '../plantillas-oficiales.js';
import {documentoFicha} from '../exportadores.js';
import {pintarSeguridad,refrescarSeguridad} from '../seguridad-ui.js';

const completa=()=>({...seguridadNueva(),erosionNivel:'muy_bueno',erosion:'0',estabilidad:'regular',estabilidadCm:'7,5',vegetacion:'bueno',vegetacionNota:'85,2',senalamiento:'regular',senalamientoNota:'75'});
const cerca=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('Estabilidad: Muy bueno hasta 2 cm da 100; Bueno continúa hasta 85 en 5 cm',()=>{
  const s=completa();
  for(const cm of ['0','0,5','1.5','2'])assert.equal(calcularSeguridad({...s,estabilidad:'muy_bueno',estabilidadCm:cm}).estabilidad,100);
  for(const [cm,nota] of [['2,5',97.5],['3',95],['3.25',93.75],['4',90],['5',85]])cerca(calcularSeguridad({...s,estabilidad:'bueno',estabilidadCm:cm}).estabilidad,nota);
  for(const [opcion,cm] of [['muy_bueno','2.001'],['bueno','2'],['bueno','5.001']])assert.equal(calcularSeguridad({...s,estabilidad:opcion,estabilidadCm:cm}).estabilidad,null);
  assert.equal(calcularSeguridad({...s,estabilidad:'bueno',estabilidadCm:'5'}).estabilidad,calcularSeguridad({...s,estabilidad:'regular',estabilidadCm:'5'}).estabilidad);
});
test('Todas las condiciones de estabilidad aceptan decimales con coma o punto y conservan su precisión',()=>{
  const s=completa();
  for(const [opcion,cm,nota] of [['muy_bueno','1.25',100],['bueno','2.75',96.25],['regular','7.125',74.375],['malo','14.125',51.75],['muy_malo','35.125',9.75]]){
    for(const valor of [cm,cm.replace('.',',')]){
      const r=calcularSeguridad({...s,estabilidad:opcion,estabilidadCm:valor});cerca(r.estabilidad,nota);assert.match(r.detalle.estabilidad.ayuda,/decimales con coma o punto/);
    }
  }
  const html=pintarSeguridad(s);assert.match(html,/coma o punto en los decimales/);assert.match(pintarSeguridad({...s,estabilidad:'muy_bueno'}),/Roderas de 0 a 2 cm/);assert.match(pintarSeguridad({...s,estabilidad:'bueno'}),/Roderas mayores que 2 y hasta 5 cm/);
});
test('Regular: cualquier decimal en 5–10 cm se convierte proporcionalmente de 85 a 60 puntos',()=>{
  const s=completa();
  for(const [cm,nota] of [['5',85],['6,37',78.15],['7.5',72.5],['8',70],['9.99',60.05],['10',60]])cerca(calcularSeguridad({...s,estabilidadCm:cm}).estabilidad,nota);
  assert.equal(calcularSeguridad(s).indice,73.5);
});
test('Estabilidad: 20 cm = 40; luego -2 puntos/cm hasta cero, sin un máximo ficticio de profundidad',()=>{
  const s={...completa(),estabilidad:'malo',estabilidadCm:'20'};
  assert.equal(calcularSeguridad(s).estabilidad,40);
  for(const [cm,nota] of [['20,5',39],['21',38],['25',30],['30',20],['39.75',0.5],['40',0],['55',0],['999999',0]])cerca(calcularSeguridad({...s,estabilidad:'muy_malo',estabilidadCm:cm}).estabilidad,nota);
  const cero=calcularSeguridad({...s,estabilidad:'muy_malo',estabilidadCm:'40',senalamiento:'muy_malo',senalamientoNota:'0'});
  assert.equal(cero.margenes,0);assert.equal(cero.indice,0);assert.equal(cero.completo,true);
});
test('Cambiar de opción vuelve a validar la misma medida; fuera de rango no conserva una nota anterior',()=>{
  const s=completa(),antes=JSON.stringify(s);
  for(const cm of ['4.999','10.001','-1','NaN','Infinity','1e2','6,3,7']){
    const r=calcularSeguridad({...s,estabilidadCm:cm});assert.equal(r.estabilidad,null,cm);assert.equal(r.indice,null,cm);assert.ok(r.detalle.estabilidad.error,cm);
  }
  assert.equal(calcularSeguridad({...s,estabilidad:'bueno'}).estabilidad,null);
  assert.equal(calcularSeguridad({...s,estabilidad:'',estabilidadCm:'7.5'}).estabilidad,null);
  assert.equal(JSON.stringify(s),antes);
});
test('Desnivel: condición automática según centímetros, sin depender de una selección anterior',()=>{
  const s=completa();
  for(const [nivel,cm,nota] of [['muy_bueno','0',100],['muy_bueno','1',100],['muy_bueno','2',100],['bueno','2,5',95],['bueno','3',90],['bueno','3.5',85],['bueno','4',80],['regular','5',70],['regular','7.5',65],['malo','20',37.5],['muy_malo','25',25],['muy_malo','40',0]])cerca(calcularSeguridad({...s,erosionNivel:nivel,erosion:cm}).erosion,nota);
  for(const [nivel,cm,condicion] of [['muy_bueno','2.001','bueno'],['bueno','2','muy_bueno'],['bueno','5','regular'],['regular','15','malo'],['malo','25','muy_malo'],['muy_malo','24.999','malo'],['','1','muy_bueno']]){
    const r=calcularSeguridad({...s,erosionNivel:nivel,erosion:cm});assert.notEqual(r.erosion,null);assert.equal(r.detalle.erosion.nivel,condicion);
  }
  for(const cm of ['',undefined,'-1','NaN','Infinity','1e2','2,5,1'])assert.equal(calcularSeguridad({...s,erosion:cm}).erosion,null,String(cm));
});
test('Desnivel: conserva las notas de los límites de Excel, sin saltos ni aumentos al crecer la medida',()=>{
  const s=completa(),nota=cm=>calcularSeguridad({...s,erosionNivel:nivelErosion(cm),erosion:cm}).erosion;
  for(const [cm,esperada] of [['0,5',100],['2',100],['3.25',87.5],['5',70],['10,5',59],['15',50],['18.125',42.1875],['25',25],['31,5',8.75]])cerca(nota(cm),esperada);
  for(const limite of [2,5,15,25,35]){
    assert.ok(Math.abs(nota(limite-.0001)-nota(limite))<.01);
    assert.ok(Math.abs(nota(limite+.0001)-nota(limite))<.01);
  }
  let anterior=100;
  for(let cm=0;cm<=40;cm+=.125){const actual=nota(cm);assert.ok(actual>=0&&actual<=anterior);anterior=actual;}
});
test('Desnivel por encima de 25 cm produce notas decimales menores de 25 y conserva un cero válido',()=>{
  const s={...completa(),erosionNivel:'muy_malo'};
  for(const [cm,esperada] of [['25',25],['25.1',24.75],['25.5',23.75],['26',22.5],['27.25',19.375],['30',12.5],['34.5',1.25],['35',0],['45.25',0]]){
    for(const valor of [cm,cm.replace('.',',')])cerca(calcularSeguridad({...s,erosion:valor}).erosion,esperada);
  }
  const salida={},raiz={getElementById:id=>id==='puntaje-erosion'?salida:null};
  refrescarSeguridad({...s,erosion:'25,5'},false,raiz);assert.match(salida.innerHTML,/<strong>23,75<\/strong> <small>\/ 100<\/small>/);
  refrescarSeguridad({...s,erosion:'35'},false,raiz);assert.match(salida.innerHTML,/<strong>0<\/strong> <small>\/ 100<\/small>/);
  const f=crearFicha(datosVacios(),obtenerControl('RN:507:40762'),'2026-11-16');
  f.i.seguridadVial={...s,erosion:'35',estabilidad:'muy_malo',estabilidadCm:'40',vegetacion:'muy_malo',vegetacionNota:'0',senalamiento:'muy_malo',senalamientoNota:'0'};
  const r=resultadosFicha(f).seguridad;assert.equal(r.completo,true);assert.equal(r.indice,0);
  const c=camposFicha(f,{limpio:false});assert.equal(c.AQ11,0);assert.equal(c.AQ50,0);
});
test('Notas manuales: cada condición admite sus límites y decimales con coma o punto',()=>{
  const rangos=[['muy_bueno',95,100],['bueno',85,94],['regular',60,84],['malo',26,59],['muy_malo',0,25]];
  for(const aspecto of ['vegetacion','senalamiento'])for(const [opcion,min,max] of rangos){
    for(const nota of [String(min),String(max),String(min+.25),String(min+.25).replace('.',',')])assert.equal(calcularSeguridad({...completa(),[aspecto]:opcion,[aspecto+'Nota']:nota})[aspecto],Number(nota.replace(',','.')));
    for(const nota of [String(min-.01),String(max+.01),'',undefined,'-1','100.001','texto','1e2'])assert.equal(calcularSeguridad({...completa(),[aspecto]:opcion,[aspecto+'Nota']:nota})[aspecto],null,`${aspecto} ${opcion} ${nota}`);
  }
  for(const aspecto of ['vegetacion','senalamiento'])assert.equal(calcularSeguridad({...completa(),[aspecto]:''})[aspecto],null);
  assert.deepEqual(calcularSeguridad(seguridadNueva()).faltantes,['Desnivel entre corona y espaldón','Estabilidad y drenaje','Vegetación','Señalamiento vertical']);
});
test('Cambiar la condición conserva la nota escrita y deja pendiente un valor fuera del nuevo rango',()=>{
  for(const aspecto of ['vegetacion','senalamiento']){
    const s={...completa(),[aspecto]:'muy_bueno',[aspecto+'Nota']:'98,5'},antes=structuredClone(s);
    assert.equal(calcularSeguridad(s)[aspecto],98.5);
    const cambiado={...s,[aspecto]:'regular'},r=calcularSeguridad(cambiado);
    assert.equal(r[aspecto],null);assert.equal(r.indice,null);assert.match(r.detalle[aspecto].error,/60 y 84/);assert.equal(cambiado[aspecto+'Nota'],'98,5');assert.deepEqual(s,antes);
  }
});
test('Desnivel automático: pantalla y espacios oficiales usan la condición medida, no el selector guardado',()=>{
  const f=crearFicha(datosVacios(),obtenerControl('RN:507:40762'),'2026-11-17');
  f.i.seguridadVial={...completa(),erosionNivel:'muy_bueno'};
  for(const [cm,nombre,nota]of[['2','Muy bueno',100],['3,5','Bueno',85],['7,5','Regular',65],['20','Malo',37.5],['27,25','Muy malo',19.375],['35','Muy malo',0]]){
    f.i.seguridadVial.erosion=cm;const antes=structuredClone(f.i.seguridadVial),nodos={};
    refrescarSeguridad(f.i.seguridadVial,false,{getElementById:id=>id === 'puntaje-erosion'?(nodos[id]||={}):null});
    assert.ok(nodos['puntaje-erosion'].innerHTML.includes(`>${nombre}</span>`));
    for(const limpio of [true,false]){const c=camposFicha(f,{limpio});assert.equal(c[(limpio?'AR':'AQ')+'11'],nota);assert.equal(c[(limpio?'AS':'AR')+'11'],nombre);}
    assert.deepEqual(f.i.seguridadVial,antes);
  }
});
test('Los límites manuales exactos se conservan sin redondear ni admitir valores entre los rangos',()=>{
  for(const aspecto of ['vegetacion','senalamiento'])for(const [nota,opciones]of[['94,5',['muy_bueno','bueno']],['84.5',['bueno','regular']],['59,5',['regular','malo']],['25.5',['malo','muy_malo']]])for(const opcion of opciones){
    const s={...completa(),[aspecto]:opcion,[aspecto+'Nota']:nota},antes=structuredClone(s),r=calcularSeguridad(s);
    assert.equal(r[aspecto],null);assert.equal(r.indice,null);assert.ok(r.detalle[aspecto].error);assert.deepEqual(s,antes);
  }
});
test('Las evaluaciones anteriores conservan sus notas hasta una actualización explícita',()=>{
  const antigua={erosion:'2',estabilidad:'bueno',vegetacion:'regular',senalamiento:'bueno'},antes=JSON.stringify(antigua);
  assert.equal(calcularSeguridad(antigua).indice,72);
  const nueva=actualizarSeguridad(antigua);
  assert.equal(nueva.erosion,'2');assert.equal(nueva.erosionNivel,'muy_bueno');assert.equal(nueva.estabilidadCm,'');assert.equal(nueva.vegetacionNota,'');assert.equal(nueva.senalamientoNota,'');
  assert.equal(calcularSeguridad(nueva).indice,null);assert.equal(JSON.stringify(antigua),antes);
});
test('Colapso cualitativo: conserva el criterio de 25 puntos; exige confirmar la excepción',()=>{
  const s={...completa(),estabilidad:'muy_malo',estabilidadCm:'0'};
  assert.equal(calcularSeguridad(s).estabilidad,null);
  assert.equal(calcularSeguridad({...s,estabilidadColapso:true}).estabilidad,25);
  assert.equal(calcularSeguridad({...s,estabilidadCm:'45',estabilidadColapso:true}).estabilidad,0);
  assert.equal(calcularSeguridad({...s,estabilidadColapso:'true'}).estabilidad,null);
  assert.equal(calcularSeguridad({...s,estabilidad:'regular',estabilidadColapso:true}).estabilidad,null);
});
test('Guardar y reabrir conserva centímetros, selecciones y notas; resumen y exportaciones coinciden',()=>{
  const datos=datosVacios(),f=crearFicha(datos,obtenerControl('RN:507:40762'),'2026-11-16');
  Object.assign(f.u,{codigo:'UM-01',longitud:'30',ancho:'5,58',progresivaInicio:'0',progresivaFin:'7,91'});
  f.i.inspector='Inspector de prueba';f.i.observacionesSV='Observación propia';f.i.seguridadVial=completa();
  for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
  for(const {tabla,registro} of registrosFicha(f))datos[tabla].push(JSON.parse(JSON.stringify(registro)));
  const reabierta=buscarFicha(datos,f.u.id),grupo=gruposSeccion(datos)[0];
  assert.deepEqual(reabierta.i.seguridadVial,f.i.seguridadVial);assert.equal(resultadosFicha(reabierta).seguridad.indice,73.5);assert.equal(grupo.sv,73.5);
  for(const limpio of [false,true]){
    const c=camposFicha(reabierta,{limpio}),p=limpio?'AR':'AQ',e=limpio?'AS':'AR';
    assert.equal(c[p+'13'],72.5);assert.equal(c[p+'23'],85.2);assert.equal(c[p+'35'],75);assert.equal(c[p+'50'],73.5);assert.equal(c[e+'13'],'Regular');
  }
  const doc=documentoFicha(reabierta,grupo);assert.match(doc.seguridad[0].filas[1][1],/7,5 cm/);assert.equal(Object.hasOwn(doc,'observacionesSV'),false);
  reabierta.i.seguridadVial.estabilidadCm='11';const c=camposFicha(reabierta,{limpio:false});assert.equal(c.AQ13,null);assert.equal(c.AR13,null);assert.equal(c.AQ50,null);
});
test('Controles de interfaz: rango y error visibles, sin corregir silenciosamente lo escrito',()=>{
  const s=completa(),html=pintarSeguridad(s);
  assert.doesNotMatch(html,/data-seguridad="erosionNivel"/);assert.match(html,/data-seguridad="erosion"/);assert.match(html,/data-seguridad="estabilidadCm"/);assert.match(html,/data-seguridad="vegetacionNota"/);assert.match(html,/data-seguridad="senalamientoNota"/);
  const nodos=new Map();for(const id of ['sv-estabilidadCm','rango-estabilidad','error-estabilidad','puntaje-estabilidad'])nodos.set(id,{value:'7,5',attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},setCustomValidity(v){this.validity=v;}});
  const raiz={getElementById:id=>nodos.get(id)};
  refrescarSeguridad(s,false,raiz);assert.match(nodos.get('puntaje-estabilidad').innerHTML,/72,5/);assert.equal(nodos.get('sv-estabilidadCm').attrs['data-max'],'10');
  refrescarSeguridad({...s,estabilidad:'bueno'},false,raiz);assert.equal(nodos.get('sv-estabilidadCm').value,'7,5');assert.equal(nodos.get('sv-estabilidadCm').attrs['aria-invalid'],'true');assert.match(nodos.get('sv-estabilidadCm').validity,/fuera del rango/);assert.match(nodos.get('puntaje-estabilidad').innerHTML,/Revisar dato/);
  refrescarSeguridad({...s,estabilidad:''},false,raiz);assert.equal(nodos.get('sv-estabilidadCm').disabled,true);
  refrescarSeguridad(s,true,raiz);assert.equal(nodos.get('sv-estabilidadCm').disabled,true);
});
