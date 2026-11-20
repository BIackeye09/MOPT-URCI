import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import vm from 'node:vm';
import path from 'node:path';
import {crearFicha,datosVacios,registrosFicha,gruposSeccion,resultadosFicha} from '../modelo.js';
import {obtenerControl} from '../catalogo.js';
import {capturarCroquis,documentoFicha,documentoGrupo,exportarExcel,exportarPdf} from '../exportadores.js';
import {abrirPaquete,rellenarXml} from '../archivo-plantilla.js';
import {camposFicha,camposResumen} from '../plantillas-oficiales.js';
import {rellenarCurvasSeleccionadas,distribuirCurvas} from '../curvas-seleccionadas.js';
const dec=new TextDecoder(),root=new URL('../plantillas/',import.meta.url);
const recursos=Object.fromEntries(await Promise.all(Object.entries({limpio:'Formulario_Limpio.xlsx',eficacia:'01_RVNL_Eficacia_VF.xlsx',fondo:'formulario-base.pdf',resumen:'resumen-base.pdf',curvas:'curvas-base.pdf',mapa:'mapa.json'}).map(async([k,v])=>[k,new Uint8Array(await readFile(new URL(v,root)))])));
const opciones={recursos,inflar:b=>new Uint8Array(inflateRawSync(b))};
let promesaPdf;
function opcionesPdf(){return promesaPdf||=(async()=>{
 vm.runInThisContext(await readFile(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));
 vm.runInThisContext(await readFile(new URL('../vendor/fontkit.umd.min.js',import.meta.url),'utf8'));
 return {...opciones,pdfLib:globalThis.PDFLib,fontkit:globalThis.fontkit,fuente:new Uint8Array(await readFile(new URL('../vendor/DejaVuSans.ttf',import.meta.url))),fuenteNegrita:new Uint8Array(await readFile(new URL('../vendor/DejaVuSans-Bold.ttf',import.meta.url)))};
})();}
function documentoActual(f){const datos=datosVacios();for(const {tabla,registro}of registrosFicha(f))datos[tabla].push(registro);return documentoFicha(f,gruposSeccion(datos)[0]);}
function imagenesPdf(pdf){return pdf.context.enumerateIndirectObjects().map(([,o])=>o).filter(o=>o.dict?.get(globalThis.PDFLib.PDFName.of('Subtype'))?.toString()==='/Image'&&!o.dict.has(globalThis.PDFLib.PDFName.of('Decode')));}
function muestra(n=1){
 const datos=datosVacios();let f;
 for(let i=0;i<n;i++){
  f=crearFicha(datos,obtenerControl('RN:507:40762'),'2026-11-10');f.u.codigo='UM-'+(i+1);f.u.longitud='30';f.u.ancho='5,58';f.u.areaM2='167,4';f.u.progresivaInicio='0,0';f.u.progresivaFin='7,91';f.i.inspector='Inspector de prueba';
  for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
  for(const [c,s,v]of[['81','B','30,5'],['83','M','83,7'],['87','M','48,8']]){const d=f.i.deterioros[c];d.estado='con_deterioro';d.niveles[s].total=v;}
  f.i.deterioros['84'].estado='con_deterioro';f.i.deterioros['84'].polvo='M';f.i.seguridadVial={erosion:'2',estabilidad:'bueno',vegetacion:'regular',senalamiento:'bueno'};
  for(const {tabla,registro}of registrosFicha(f))datos[tabla].push(registro);
 }
 const grupo=gruposSeccion(datos)[0];return {f,grupo,doc:documentoFicha(f,grupo)};
}
function quitarDatos(xml,campos){return xml.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,(original,attrs)=>Object.hasOwn(campos,/\br="([^"]+)"/.exec(attrs)?.[1])?'<c'+attrs.replace(/\s+t="[^"]*"/g,'')+'/>':original);}
function hojas(libro){return [...dec.decode(libro.get('xl/workbook.xml')).matchAll(/<sheet name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map((m,i)=>({nombre:m[1],ruta:`xl/worksheets/sheet${i+1}.xml`}));}
function relacion(libro,origen){const rel=path.posix.join(path.posix.dirname(origen),'_rels',path.posix.basename(origen)+'.rels');return [...dec.decode(libro.get(rel)).matchAll(/<Relationship\b[^>]*\/>/g)].map(m=>Object.fromEntries([...m[0].matchAll(/([\w:]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])));}
function imagenesExcel(libro,rutaHoja){const r=relacion(libro,rutaHoja).find(r=>r.Type.endsWith('/drawing'));if(!r)return[];const dibujo=path.posix.normalize(path.posix.join(path.posix.dirname(rutaHoja),r.Target));return relacion(libro,dibujo).filter(r=>r.Type.endsWith('/image')).map(r=>libro.get(path.posix.normalize(path.posix.join(path.posix.dirname(dibujo),r.Target))));}
function textosInline(libro,ruta){const sst=[...dec.decode(libro.get('xl/sharedStrings.xml')).matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(m=>m[1]);return dec.decode(libro.get(ruta)).replace(/<c\b([^>]*\bt="s"[^>]*)>([\s\S]*?)<\/c>/g,(_,a,c)=>`<c${a.replace(/\bt="s"/,'t="inlineStr"')}><is>${sst[Number(/<v>(\d+)<\/v>/.exec(c)[1])]}</is></c>`).replace(/\s+tabSelected="[^"]*"/g,'');}
function relacionesValidas(libro){for(const [ruta,b]of libro){if(!ruta.endsWith('.rels'))continue;const origen=ruta==='_rels/.rels'?'':ruta.replace(/_rels\//,'').replace(/\.rels$/,'');for(const r of [...dec.decode(b).matchAll(/<Relationship\b[^>]*\/>/g)].map(m=>Object.fromEntries([...m[0].matchAll(/([\w:]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])))){if(r.TargetMode==='External')continue;const fin=r.Target.startsWith('/')?r.Target.slice(1):path.posix.normalize(path.posix.join(path.posix.dirname(origen),r.Target));assert.ok(libro.has(fin),ruta+' → '+fin);}}}
test('las plantillas originales incluidas conservan las huellas de los archivos aportados',async()=>{
 const m=JSON.parse(await readFile(new URL('originales.json',root),'utf8'));
 for(const [n,metadata]of Object.entries(m))assert.equal(createHash('sha256').update(await readFile(new URL(n,root))).digest('hex'),metadata.sha256);
});
test('rellenar celdas conserva atributos y vecinos de celdas vacías; textos como fórmulas son literales',()=>{
 const xml='<row><c r="A1" s="4"/><c r="B1" s="9"><v>2</v></c><c r="C1" s="2"/></row>';
 const nuevo=rellenarXml(xml,{A1:'=NO_EJECUTAR(1)',C1:0});
 assert.ok(nuevo.includes('r="B1" s="9"><v>2</v>'));assert.ok(nuevo.includes('t="inlineStr"'));assert.ok(nuevo.includes('r="C1" s="2"><v>0</v>'));assert.throws(()=>rellenarXml(xml,{D1:2}));
});
test('Excel directo: sólo las muestras creadas, sus curvas individuales y el resumen; conserva el formulario oficial',async()=>{
 const {f,doc}=muestra(),nuevo=await abrirPaquete(await exportarExcel(doc,opciones),opciones),original=await abrirPaquete(recursos.eficacia,opciones);
 assert.deepEqual(hojas(nuevo).map(h=>h.nombre),['Muestra 01','Curvas 01','Resumen']);
 assert.ok(nuevo.has('[Content_Types].xml'));assert.ok(![...nuevo.keys()].some(n=>n.endsWith('.xlsx')));
 assert.deepEqual(nuevo.get('xl/styles.xml'),original.get('xl/styles.xml'));assert.deepEqual(nuevo.get('xl/theme/theme1.xml'),original.get('xl/theme/theme1.xml'));
 assert.equal(quitarDatos(dec.decode(nuevo.get('xl/worksheets/sheet1.xml')),camposFicha(f,{limpio:false})),quitarDatos(textosInline(original,'xl/worksheets/sheet5.xml'),camposFicha(f,{limpio:false})));
 assert.equal(quitarDatos(dec.decode(nuevo.get('xl/worksheets/sheet3.xml')),camposResumen(doc)),quitarDatos(textosInline(original,'xl/worksheets/sheet16.xml'),camposResumen(doc)));
 const xml=dec.decode(nuevo.get('xl/worksheets/sheet1.xml'));assert.ok(xml.includes('0 + 000'));assert.ok(xml.includes('7 + 910'));assert.ok(xml.includes('65.1124901704111'));assert.equal(camposFicha(f).T27,'');
 assert.deepEqual(imagenesExcel(nuevo,'xl/worksheets/sheet1.xml'),[original.get('xl/media/image10.png')]);
 assert.deepEqual(imagenesExcel(nuevo,'xl/worksheets/sheet2.xml'),['image11.png','image13.png','image16.png'].map(n=>original.get('xl/media/'+n)));
 assert.match(dec.decode(nuevo.get('xl/workbook.xml')),/localSheetId="1">'Curvas 01'!\$A\$1:\$N\$57/);
 assert.doesNotMatch(dec.decode(nuevo.get('xl/workbook.xml')),/Instructivo|Listas|Deterioros|F_UM|EFICACIA|externalReferences/);
 assert.ok(!nuevo.has('xl/sharedStrings.xml'));assert.ok(![...nuevo.keys()].some(n=>/externalLink|calcChain|chart/.test(n)));
 relacionesValidas(nuevo);
});
test('cada muestra tiene únicamente sus curvas y mediciones actuales, sin unirlas con las de otra',async()=>{
 const {grupo}=muestra(2),[a,b]=grupo.fichas;
 for(const f of [a,b])for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
 a.i.deterioros['81'].estado='con_deterioro';a.i.deterioros['81'].niveles.B.total='10';
 b.i.deterioros['86'].estado='con_deterioro';b.i.deterioros['86'].niveles.M.total='20';
 const libro=await abrirPaquete(await exportarExcel(documentoGrupo(grupo),opciones),opciones),original=await abrirPaquete(recursos.eficacia,opciones);
 assert.deepEqual(hojas(libro).map(h=>h.nombre),['Muestra 01','Curvas 01','Muestra 02','Curvas 02','Resumen']);
 assert.deepEqual(imagenesExcel(libro,'xl/worksheets/sheet2.xml'),[original.get('xl/media/image11.png')]);
 assert.deepEqual(imagenesExcel(libro,'xl/worksheets/sheet4.xml'),[original.get('xl/media/image15.png')]);
 assert.doesNotMatch(dec.decode(libro.get('xl/worksheets/sheet2.xml')),/86 ·/);assert.doesNotMatch(dec.decode(libro.get('xl/worksheets/sheet4.xml')),/81 ·/);
 relacionesValidas(libro);
});
test('Excel: las gráficas y flechas guardan posiciones coherentes al reunir varias muestras',async()=>{
 const {grupo}=muestra(2);
 for(const f of grupo.fichas)for(const [codigo,d]of Object.entries(f.i.deterioros)){
  d.estado='con_deterioro';if(codigo!=='84')for(const n of Object.values(d.niveles))n.total='2';
 }
 const libro=await abrirPaquete(await exportarExcel(documentoGrupo(grupo),opciones),opciones);
 for(const hoja of hojas(libro).filter(h=>h.nombre.startsWith('Curvas'))){
  const r=relacion(libro,hoja.ruta).find(r=>r.Type.endsWith('/drawing'));
  const ruta=path.posix.normalize(path.posix.join(path.posix.dirname(hoja.ruta),r.Target));
  const xml=dec.decode(libro.get(ruta)),imagenes=[];
  const anclas=[...xml.matchAll(/<xdr:(oneCellAnchor|absoluteAnchor)>([\s\S]*?)<\/xdr:\1>/g)];
  assert.ok(anclas.length>100,'Deben conservarse las imágenes y todas las guías L/M/H.');
  for(const [,tipo,cuerpo]of anclas){
   const nombre=/<xdr:cNvPr\b[^>]*name="([^"]*)"/.exec(cuerpo)?.[1];
   const origen=tipo==='absoluteAnchor'?/<xdr:pos x="(\d+)" y="(\d+)"\/>/.exec(cuerpo):null;
   const x=origen?Number(origen[1]):Number(/<xdr:colOff>(\d+)<\/xdr:colOff>/.exec(cuerpo)?.[1]);
   const y=origen?Number(origen[2]):Number(/<xdr:rowOff>(\d+)<\/xdr:rowOff>/.exec(cuerpo)?.[1]);
   const transformacion=/<a:xfrm\b[^>]*>([\s\S]*?)<\/a:xfrm>/.exec(cuerpo)?.[1];
   const off=/<a:off x="(\d+)" y="(\d+)"\/>/.exec(transformacion);
   assert.deepEqual([Number(off?.[1]),Number(off?.[2])],[x,y],nombre+' tiene posiciones contradictorias.');
   const ext=/<xdr:ext cx="(\d+)" cy="(\d+)"\/>/.exec(cuerpo);
   const tam=/<a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(transformacion);
   assert.deepEqual(tam?.slice(1),ext?.slice(1),nombre+' tiene tamaños contradictorios.');
   if(cuerpo.includes('<xdr:pic>'))imagenes.push({nombre,x,y,w:Number(ext[1]),h:Number(ext[2])});
  }
  assert.equal(imagenes.length,6);
  for(let i=0;i<imagenes.length;i++)for(const b of imagenes.slice(i+1)){
   const a=imagenes[i];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,a.nombre+' se superpone con '+b.nombre);
  }
 }
});
test('Excel: ninguna combinación de deterioros superpone los rótulos de sus gráficas',async()=>{
 const {doc}=muestra(),original=await abrirPaquete(recursos.eficacia,opciones),base=doc.graficas;
 for(const t of base.tipos){t.estado='con_deterioro';for(const f of t.filas){f.cantidad=2;f.seleccionado=t.codigo==='84'?f.severidad==='M':true;}}
 for(let mascara=0;mascara<128;mascara++){
  const h={...base,tipos:base.tipos.filter((_,i)=>mascara&(1<<i))},libro=new Map(original);
  rellenarCurvasSeleccionadas(libro,h,'Prueba de distribución');
  const xml=dec.decode(libro.get('xl/worksheets/sheet15.xml')),ocupadas=new Set();
  const celdas=[...xml.matchAll(/<c\b[^>]*\br="([A-Z]+\d+)"/g)].map(m=>m[1]);
  assert.equal(new Set(celdas).size,celdas.length,'Celdas duplicadas para combinación '+mascara);
  for(const m of xml.matchAll(/<mergeCell ref="([A-Z])(\d+):([A-Z])(\d+)"\/>/g)){
   for(let fila=Number(m[2]);fila<=Number(m[4]);fila++)for(let col=m[1].charCodeAt(0);col<=m[3].charCodeAt(0);col++){
    const celda=String.fromCharCode(col)+fila;assert.ok(!ocupadas.has(celda),'Rótulos superpuestos en '+celda+' para combinación '+mascara);ocupadas.add(celda);
   }
  }
  const plan=distribuirCurvas(h);assert.equal(plan.tarjetas.length,h.tipos.length);
 }
});
test('sólo las dimensiones medidas llenan el área; Observaciones pertenece al inspector',()=>{
 const {f}=muestra();let c=camposFicha(f);assert.equal(c.J12,30);assert.equal(c.N12,5.58);assert.equal(c.T27,'');
 f.u.areaM2='999';f.u.areaManual='555';c=camposFicha(f);assert.equal(c.J12,30);assert.equal(c.N12,5.58);assert.equal(c.T27,'');
 f.u.ancho='';c=camposFicha(f);assert.equal(c.J12,30);assert.equal(c.N12,null);assert.equal(c.A50,null);assert.equal(c.T27,'');
 f.i.observacionesURCI='Nota del inspector.\n=Texto literal';assert.equal(camposFicha(f).T27,f.i.observacionesURCI);
});
test('borrador y cero confirmado siguen siendo diferentes en los espacios oficiales',()=>{
 const {f}=muestra();f.i.deterioros['81'].niveles.B.total='-1';assert.equal(camposFicha(f).H22,'-1');assert.equal(camposFicha(f).A50,null);
 f.i.deterioros['81'].niveles.B.total='30,5';f.u.ancho='';assert.equal(camposFicha(f).A50,null);
 f.u.longitud='30';f.u.ancho='5,58';f.u.areaM2='167,4';for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';const c=camposFicha(f);assert.equal(c.A50,0);assert.equal(c.L50,0);assert.equal(c.P50,100);
});
test('Excel y campos PDF dejan vacíos los deterioros sin medición y las severidades de polvo no elegidas',async()=>{
 const {f,doc}=muestra(),antes=structuredClone(f),resultado=resultadosFicha(f);
 const vacias=['H23','H24','L22','L23','L24','T22','T24','X22','X23','X24','AB22','AB23','AB24',
   'P29','P30','P31','P32','P33','P34','P36','P37','P39','P40','P41','P42','P43','P44','P45','P46','P48'];
 for(const limpio of [true,false]){
  const c=camposFicha(f,{limpio});for(const ref of vacias)assert.equal(c[ref],null,ref);
  assert.equal(c.H22,30.5);assert.equal(c.T23,'x');assert.equal(c.P38,4);
 }
 const libro=await abrirPaquete(await exportarExcel(doc,opciones),opciones),xml=dec.decode(libro.get('xl/worksheets/sheet1.xml'));
 for(const ref of vacias)assert.match(xml,new RegExp('<c\\b[^>]*\\br="'+ref+'"[^>]*/>'),ref);
 const fila=doc.urci[1].filas.find(f=>f[0]==='81'&&f[1]==='Media');assert.equal(fila[3],'');
 assert.deepEqual(f,antes);assert.deepEqual(resultadosFicha(f),resultado);
});
test('cantidades y resultados cero se conservan, pero su deducción individual queda vacía',async()=>{
 const {f}=muestra();f.i.deterioros['81'].niveles.M.total='0,0';f.i.seguridadVial.erosion='0';
 const c=camposFicha(f);assert.equal(c.H23,0);assert.equal(c.L29,0);assert.equal(c.P29,null);assert.equal(c.AM11,0);assert.equal(c.I10,'0 + 000');
 const libro=await abrirPaquete(await exportarExcel(documentoActual(f),opciones),opciones),xml=dec.decode(libro.get('xl/worksheets/sheet1.xml'));
 for(const ref of ['H23','L29','AL11'])assert.match(xml,new RegExp('<c\\b[^>]*\\br="'+ref+'"[^>]*><v>0</v></c>'),ref);
 assert.match(xml,/<c\b[^>]*\br="P29"[^>]*\/>/);
 assert.equal(resultadosFicha(f).urci.filas.find(f=>f.codigo==='81'&&f.severidad==='M').deduccion,0);
 for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
 const sin=camposFicha(f);assert.equal(sin.A50,0);assert.equal(sin.L50,0);assert.equal(sin.P50,100);assert.equal(sin.H23,null);assert.equal(sin.P29,null);
});
test('borrar una cantidad quita también su deducción en la siguiente descarga sin conservar el cero anterior',async()=>{
 const {f}=muestra();f.i.deterioros['81'].niveles.M.total='12';
 assert.ok(camposFicha(f).P29>0);f.i.deterioros['81'].niveles.M.total='';
 const c=camposFicha(f);assert.equal(c.H23,null);assert.equal(c.L29,null);assert.equal(c.P29,null);assert.ok(c.P28>0);
 const libro=await abrirPaquete(await exportarExcel(documentoActual(f),opciones),opciones),xml=dec.decode(libro.get('xl/worksheets/sheet1.xml'));
 for(const ref of ['H23','L29','P29'])assert.match(xml,new RegExp('<c\\b[^>]*\\br="'+ref+'"[^>]*/>'),ref);
});
test('el croquis de cada muestra se mantiene en su propio recuadro y los logotipos quedan intactos',async()=>{
 const {grupo}=muestra(2),[a,b]=grupo.fichas,doc=documentoGrupo(grupo);
 const png=new Uint8Array(await readFile(new URL('../icons/icon-192.png',import.meta.url)));
 a.i.croquisMapa={imagen:'data:image/png;base64,'+Buffer.from(png).toString('base64'),vista:{x:.26,y:.47,zoom:9}};
 a.i.croquis=[{tipo:'lapiz',puntos:[[.1,.2],[.3,.4]]}];
 const trazos=structuredClone(a.i.croquis);
 const guardada=registrosFicha(a).find(r=>r.tabla==='inspecciones').registro;
 doc.croquisPorUnidad={[a.u.id]:capturarCroquis(guardada.croquis,guardada.croquisMapa)};
 const libro=await abrirPaquete(await exportarExcel(doc,opciones),opciones),original=await abrirPaquete(recursos.eficacia,opciones);
 assert.deepEqual(imagenesExcel(libro,'xl/worksheets/sheet1.xml'),[original.get('xl/media/image10.png'),png]);
 assert.deepEqual(imagenesExcel(libro,'xl/worksheets/sheet3.xml'),[original.get('xl/media/image10.png')]);
 const dibujo=dec.decode(libro.get('xl/drawings/drawing3_export_1.xml'));
 assert.ok(dibujo.startsWith(dec.decode(original.get('xl/drawings/drawing3.xml')).replace('</xdr:wsDr>','')));
 assert.match(dibujo,/cx="2590800" cy="1295400"/);relacionesValidas(libro);
 const ficha=documentoFicha(a,grupo),opts=await opcionesPdf(),P=globalThis.PDFLib;
 ficha.croquisPng=capturarCroquis(a.i.croquis,a.i.croquisMapa);
 const pdf=await P.PDFDocument.load(await exportarPdf(ficha,{...opts,secciones:['urci']}));
 assert.ok(imagenesPdf(pdf).some(i=>i.dict.get(P.PDFName.of('Width')).asNumber()===192&&i.dict.get(P.PDFName.of('Height')).asNumber()===192));
 assert.deepEqual(a.i.croquis,trazos);
 assert.equal(capturarCroquis([],{imagen:'data:image/png;base64,dañado'}),null);
});
test('once muestras permanecen completas en un único Excel con resúmenes paginados sin alterar filas oficiales',async()=>{
 const {grupo}=muestra(11),doc=documentoGrupo(grupo),libro=await abrirPaquete(await exportarExcel(doc,opciones),opciones);
 const h=hojas(libro);assert.equal(h.filter(h=>h.nombre.startsWith('Muestra ')).length,11);assert.equal(h.filter(h=>h.nombre.startsWith('Curvas ')).length,11);assert.deepEqual(h.slice(-2).map(h=>h.nombre),['Resumen 01','Resumen 02']);
 assert.match(dec.decode(libro.get('xl/worksheets/sheet21.xml')),/UM-11/);assert.match(dec.decode(libro.get('xl/worksheets/sheet24.xml')),/UM-11/);relacionesValidas(libro);
});
test('los borradores sin deterioros no crean hojas de curvas; la Papelera nunca se descarga',async()=>{
 const {grupo}=muestra(2);grupo.fichas[0].u.eliminadaEn='2026-11-10';
 for(const d of Object.values(grupo.fichas[1].i.deterioros))d.estado='pendiente';
 const libro=await abrirPaquete(await exportarExcel(documentoGrupo(grupo),opciones),opciones);
 assert.deepEqual(hojas(libro).map(h=>h.nombre),['Muestra 01','Resumen']);
 assert.doesNotMatch(dec.decode(libro.get('xl/worksheets/sheet1.xml')),/UM-1</);assert.match(dec.decode(libro.get('xl/worksheets/sheet1.xml')),/UM-2/);
 assert.doesNotMatch(dec.decode(libro.get('xl/worksheets/sheet2.xml')),/UM-1</);
});
test('varios formularios se reúnen en un Excel y mantienen sus resúmenes separados',async()=>{
 const {grupo:a}=muestra(),{grupo:b}=muestra();b.fichas[0].u.codigo='OTRO-FORMULARIO';a.fichas[0].u.formularioNumero=7;b.fichas[0].u.formularioNumero=2;
 const libro=await abrirPaquete(await exportarExcel({bloques:[documentoGrupo(a),documentoGrupo(b)]},opciones),opciones);
 assert.deepEqual(hojas(libro).map(h=>h.nombre),['F7 Muestra 01','F7 Curvas 01','F7 Resumen','F2 Muestra 01','F2 Curvas 01','F2 Resumen']);
 assert.doesNotMatch(dec.decode(libro.get('xl/worksheets/sheet3.xml')),/OTRO-FORMULARIO/);assert.match(dec.decode(libro.get('xl/worksheets/sheet6.xml')),/OTRO-FORMULARIO/);relacionesValidas(libro);
});
test('PDF completo conserva los tres formularios y añade al final sólo la hoja de curvas de la muestra',async()=>{
 const {doc}=muestra(),opts=await opcionesPdf();
 const pdf=await globalThis.PDFLib.PDFDocument.load(await exportarPdf(doc,opts));assert.equal(pdf.getPageCount(),4);
 const curvas=await globalThis.PDFLib.PDFDocument.load(await exportarPdf(doc,{...opts,secciones:['graficas']}));assert.equal(curvas.getPageCount(),1);assert.ok(curvas.getPage(0).getHeight()>840&&curvas.getPage(0).getHeight()<843);assert.equal(imagenesPdf(curvas).length,3);
});
test('cada curva 81, 82, 83, 85, 86 y 87 puede aparecer por sí sola con L, M o H, usando su imagen original',async()=>{
 const opts=await opcionesPdf(),P=globalThis.PDFLib;
 for(const [codigo,archivo,ancho,alto]of [['81','image11.png',508,492],['82','image12.png',520,524],['83','image13.png',858,521],['85','image14.png',417,689],['86','image15.png',699,425],['87','image16.png',699,422]]){
  for(const nivel of ['B','M','A']){
   const {f}=muestra();for(const d of Object.values(f.i.deterioros)){d.estado='sin_deterioro';for(const n of Object.values(d.niveles))n.total='';}
   const d=f.i.deterioros[codigo];d.estado='con_deterioro';d.niveles[nivel].total='2';const doc=documentoActual(f);
   const pdf=await P.PDFDocument.load(await exportarPdf(doc,{...opts,secciones:['graficas']})),imagenes=imagenesPdf(pdf);
   assert.equal(pdf.getPageCount(),1);assert.equal(imagenes.length,1,`${codigo}/${nivel}`);
   assert.equal(imagenes[0].dict.get(P.PDFName.of('Width')).asNumber(),ancho);assert.equal(imagenes[0].dict.get(P.PDFName.of('Height')).asNumber(),alto);
   if(nivel==='B'){
    const libro=await abrirPaquete(await exportarExcel(doc,opciones),opciones),original=await abrirPaquete(recursos.eficacia,opciones);
    assert.deepEqual(imagenesExcel(libro,'xl/worksheets/sheet2.xml'),[original.get('xl/media/'+archivo)]);
   }
  }
 }
});
test('la descarga completa responde a los datos actuales, incluidos datos borrados y polvo sin gráfica',async()=>{
 const {f}=muestra(),opts=await opcionesPdf(),P=globalThis.PDFLib;
 for(const d of Object.values(f.i.deterioros))d.estado='sin_deterioro';
 let pdf=await P.PDFDocument.load(await exportarPdf(documentoActual(f),opts));assert.equal(pdf.getPageCount(),3);
 f.i.deterioros['82'].estado='con_deterioro';f.i.deterioros['82'].niveles.M.total='2';
 pdf=await P.PDFDocument.load(await exportarPdf(documentoActual(f),opts));assert.equal(pdf.getPageCount(),4);
 f.i.deterioros['82'].niveles.M.total='';pdf=await P.PDFDocument.load(await exportarPdf(documentoActual(f),opts));assert.equal(pdf.getPageCount(),3);
 f.i.deterioros['84'].estado='con_deterioro';f.i.deterioros['84'].polvo='A';
 pdf=await P.PDFDocument.load(await exportarPdf(documentoActual(f),opts));assert.equal(pdf.getPageCount(),4);
 const polvo=await P.PDFDocument.load(await exportarPdf(documentoActual(f),{...opts,secciones:['graficas']}));assert.equal(imagenesPdf(polvo).length,0);
});
