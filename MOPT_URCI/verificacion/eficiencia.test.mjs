import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inflateRawSync} from 'node:zlib';
import vm from 'node:vm';
import {obtenerControl} from '../catalogo.js';
import {nuevoProyectoEficiencia,encabezadoProyecto,cambiarCampoEficiencia,diasEntreFechas,fechaExcel,calcularEficienciaProyecto,clasificarEficiencia,erroresProyectoEficiencia,filtrarProyectosEficiencia,resumirEficienciaSecciones} from '../eficiencia.js';
import {exportarExcelEficiencia,exportarPdfEficiencia} from '../eficiencia-exportadores.js';
import {abrirPaquete} from '../archivo-plantilla.js';
import {seccionesPrevia} from '../vista-previa.js';
const root=new URL('../plantillas/',import.meta.url),dec=new TextDecoder();
const recursos=Object.fromEntries(await Promise.all(Object.entries({eficiencia:'02_RVNL_Eficiencia_VF.xlsx',baseEficiencia:'eficiencia-base.pdf',mapaEficiencia:'eficiencia-mapa.json'}).map(async([k,v])=>[k,new Uint8Array(await readFile(new URL(v,root)))])));
const opciones={recursos,inflar:b=>new Uint8Array(inflateRawSync(b))};
function proyecto(){
 const p=nuevoProyectoEficiencia(obtenerControl('RN:507:40762'),'2026-11-13');
 Object.assign(p,{trabajo:'Conservación',longitudKm:'7,91',modalidad:'Contrato',estadoProyecto:'Finalizado',programacion:'Ordinaria',inicioProgramado:'2026-01-01',finProgramado:'2026-01-11',duracionProgramada:'10',inicioEjecutado:'2026-01-01',finEjecutado:'2026-01-12',duracionEjecutada:'11',montoProgramado:'1000000',montoEjecutado:'1100000'});return p;
}
const xml=(p,n)=>dec.decode(p.get(n));
test('02 reutiliza la referencia del camino y conserva vacíos los datos de proyecto',()=>{
 const c=obtenerControl('RN:507:40762'),p=nuevoProyectoEficiencia(c,'2026-11-13'),h=encabezadoProyecto(p);
 assert.equal(h.ruta,'RN 507');assert.equal(h.seccion,c.seccion);assert.equal(h.provincia,c.provincia);assert.equal(h.canton,c.canton);assert.equal(p.anio,'2026');assert.equal(p.longitudKm,'');assert.equal(p.montoProgramado,'');assert.equal(calcularEficienciaProyecto(p).indice,null);assert.notEqual(p.control,c);
});
test('02 calcula costo, tiempo y ponderación 50/50 según las fórmulas originales',()=>{
 const r=calcularEficienciaProyecto(proyecto());assert.deepEqual(r,{variacionTiempo:.1,variacionCosto:.1,tiempo:80,costo:100,indice:90,calificacion:'Muy Bueno'});
});
test('02 verifica los límites exactos de costo y tiempo, incluidos los dos límites distintos de Listas',()=>{
 const p=proyecto(),tiempos=[[0,100],[.01,80],[.1999,80],[.2,60],[.2999,60],[.3,40],[.3999,40],[.4,20],[1,20]],costos=[[-.1,100],[0,100],[.1999,100],[.2,75],[.3,75],[.3001,50],[.3999,50],[.4,25],[.6,25]];
 p.duracionProgramada='10000';p.montoProgramado='10000';
 for(const [v,esperado]of tiempos){p.duracionEjecutada=String(10000+Math.round(v*10000));assert.equal(calcularEficienciaProyecto(p).tiempo,esperado,'Tiempo '+v);}
 for(const [v,esperado]of costos){p.montoEjecutado=String(10000+Math.round(v*10000));assert.equal(calcularEficienciaProyecto(p).costo,esperado,'Costo '+v);}
 Object.assign(p,{duracionProgramada:'0,10',duracionEjecutada:'0,12',montoProgramado:'0,10',montoEjecutado:'0,12'});assert.equal(calcularEficienciaProyecto(p).tiempo,60);assert.equal(calcularEficienciaProyecto(p).costo,75);
});
test('02 distingue campos sin llenar, ceros reales, negativos y divisores inválidos',()=>{
 const p=proyecto();p.montoEjecutado='';let r=calcularEficienciaProyecto(p);assert.equal(r.costo,null);assert.equal(r.indice,null);assert.equal(r.tiempo,80);
 p.montoEjecutado='0';assert.equal(calcularEficienciaProyecto(p).costo,100);
 p.montoProgramado='0';assert.equal(calcularEficienciaProyecto(p).costo,null);
 p.duracionEjecutada='';assert.equal(calcularEficienciaProyecto(p).tiempo,null);
 p.duracionEjecutada='0';assert.equal(calcularEficienciaProyecto(p).tiempo,100);
 p.duracionEjecutada='-1';assert.equal(calcularEficienciaProyecto(p).tiempo,null);
});
test('02 califica todos los límites de la escala sin confundir cero con un dato pendiente',()=>{
 for(const [v,c]of [[100,'Muy Bueno'],[90,'Muy Bueno'],[89.9,'Bueno'],[80,'Bueno'],[79.9,'Regular'],[70,'Regular'],[69.9,'Malo'],[40,'Malo'],[39.9,'Muy Malo'],[0,'Muy Malo'],[null,''],[-1,'']])assert.equal(clasificarEficiencia(v),c);
});
test('02 propone días entre fechas, conserva el plazo registrado y valida fechas reales',()=>{
 const p=proyecto();p.duracionProgramadaManual=false;cambiarCampoEficiencia(p,'finProgramado','2026-01-21');assert.equal(p.duracionProgramada,'20');
 cambiarCampoEficiencia(p,'duracionProgramada','15');cambiarCampoEficiencia(p,'finProgramado','2026-01-31');assert.equal(p.duracionProgramada,'15');
 cambiarCampoEficiencia(p,'duracionProgramada','');assert.equal(p.duracionProgramada,'30');
 assert.equal(diasEntreFechas('2024-02-28','2024-03-01'),2);assert.equal(diasEntreFechas('2026-02-30','2026-03-01'),null);assert.equal(diasEntreFechas('2026-01-02','2026-01-01'),null);assert.equal(fechaExcel('2026-01-01'),46023);
});
test('02 conserva borradores y exige datos válidos para completar un proyecto',()=>{
 const p=proyecto();assert.deepEqual(erroresProyectoEficiencia(p),[]);p.finEjecutado='2025-01-01';assert.ok(erroresProyectoEficiencia(p).some(e=>e.campo==='finEjecutado'));p.longitudKm='';assert.ok(erroresProyectoEficiencia(p).some(e=>e.campo==='longitudKm'));
});
test('02 agrupa el promedio por sección y año; excluye Papelera y espera proyectos pendientes',()=>{
 const a=proyecto(),b=proyecto();b.duracionEjecutada='10';assert.equal(resumirEficienciaSecciones([a,b])[0].indice,95);
 b.montoEjecutado='';assert.equal(resumirEficienciaSecciones([a,b])[0].indice,null);
 b.eliminadoEn='2026-11-13';assert.equal(resumirEficienciaSecciones([a,b])[0].indice,90);
 assert.deepEqual(filtrarProyectosEficiencia([a,b],{estado:'papelera'}).map(p=>p.id),[b.id]);
 delete b.eliminadoEn;b.anio='2025';assert.equal(resumirEficienciaSecciones([a,b]).length,2);
});
test('02 Excel incluye sólo los proyectos y resultados, preservando las columnas y formatos oficiales',async()=>{
 const p=proyecto(),original=await abrirPaquete(recursos.eficiencia,opciones),libro=await abrirPaquete(await exportarExcelEficiencia([p],opciones),opciones);
 const wb=xml(libro,'xl/workbook.xml');assert.deepEqual([...wb.matchAll(/<sheet name="([^"]+)"/g)].map(m=>m[1]),['Formulario','RESULTADOS']);assert.doesNotMatch(wb,/Instructivo|Listas|#REF!/);
 const a=xml(libro,'xl/worksheets/sheet1.xml'),b=xml(libro,'xl/worksheets/sheet2.xml');
 assert.equal((a.match(/<row\b/g)||[]).length,2);assert.equal((b.match(/<row\b/g)||[]).length,5);assert.ok(a.includes('RN 507'));assert.ok(a.includes('46023'));
 for(const tag of ['cols','pageMargins'])assert.equal(new RegExp('<'+tag+'\\b[\\s\\S]*?(?:/\\s*>|</'+tag+'>)').exec(a)?.[0],new RegExp('<'+tag+'\\b[\\s\\S]*?(?:/\\s*>|</'+tag+'>)').exec(xml(original,'xl/worksheets/sheet4.xml'))?.[0]);
 const sa=xml(original,'xl/styles.xml'),sb=xml(libro,'xl/styles.xml');for(const tag of ['fonts','fills','borders'])assert.equal(new RegExp('<'+tag+'[\\s\\S]*?</'+tag+'>').exec(sa)[0],new RegExp('<'+tag+'[\\s\\S]*?</'+tag+'>').exec(sb)[0]);
 assert.deepEqual(libro.get('xl/styles.xml'),original.get('xl/styles.xml'));
 assert.match(b,/<c r="H5"[^>]*><f>[^<]+<\/f><v>90<\/v>/);assert.match(b,/NOT\(ISNUMBER/);assert.match(b,/ROUND\(/);assert.doesNotMatch(a,/s="undefined"/);
 assert.deepEqual(libro.get('xl/theme/theme1.xml'),original.get('xl/theme/theme1.xml'));
});
test('02 Excel mantiene pendientes vacíos y textos del inspector como literales',async()=>{
 const p=proyecto();p.montoEjecutado='';p.trabajo='=NO_EJECUTAR(1)';
 const libro=await abrirPaquete(await exportarExcelEficiencia([p],opciones),opciones),a=xml(libro,'xl/worksheets/sheet1.xml'),b=xml(libro,'xl/worksheets/sheet2.xml');
 assert.match(a,/<c r="T2"[^>]*\/>/);assert.match(a,/<t[^>]*>=NO_EJECUTAR\(1\)<\/t>/);assert.match(b,/<c r="H5"[^>]*t="str"[^>]*><f>[\s\S]*?<\/f><v><\/v>/);
});
test('02 descarga más de 42 proyectos en un único libro y conserva referencias entre páginas',async()=>{
 const proyectos=Array.from({length:43},()=>proyecto());proyectos.push({...proyecto(),eliminadoEn:'2026-11-13'});
 const libro=await abrirPaquete(await exportarExcelEficiencia(proyectos,opciones),opciones),wb=xml(libro,'xl/workbook.xml');
 assert.deepEqual([...wb.matchAll(/<sheet name="([^"]+)"/g)].map(m=>m[1]),['Formulario','RESULTADOS','Formulario 2','RESULTADOS 2']);
 const resultados=xml(libro,'xl/worksheets/sheet2.xml');assert.match(resultados,/<c r="H46"[^>]*><f>[\s\S]*?<\/f><v>90<\/v>/);
 assert.ok(xml(libro,'xl/worksheets/sheet4.xml').includes('&apos;Formulario 2&apos;!Q2'));assert.match(xml(libro,'xl/worksheets/sheet3.xml'),/<c r="A2"[^>]*><v>43<\/v>/);assert.doesNotMatch(wb,/Listas|Instructivo/);
});
test('02 vista previa usa sólo sus formularios y el PDF conserva las dos hojas oficiales',async()=>{
 assert.deepEqual(seccionesPrevia({tipo:'eficiencia'},'eficiencia'),['eficiencia']);assert.throws(()=>seccionesPrevia({tipo:'eficiencia'},'urci'));assert.throws(()=>seccionesPrevia({tipo:'ficha'},'eficiencia'));
 vm.runInThisContext(await readFile(new URL('../vendor/pdf-lib.min.js',import.meta.url),'utf8'));vm.runInThisContext(await readFile(new URL('../vendor/fontkit.umd.min.js',import.meta.url),'utf8'));
 const bytes=await exportarPdfEficiencia([proyecto()],{...opciones,pdfLib:globalThis.PDFLib,fontkit:globalThis.fontkit,fuente:new Uint8Array(await readFile(new URL('../vendor/DejaVuSans.ttf',import.meta.url)))});
 const pdf=await globalThis.PDFLib.PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);assert.ok(pdf.getPage(0).getWidth()>590);assert.equal(pdf.getPage(1).getWidth(),612);
});
