/* Se seleccionan y distribuyen las imágenes originales; las curvas no se redibujan. */
import { xmlTexto } from './archivo-plantilla.js';
import { NIVELES_HOJA, DEDUCCION_POLVO } from './frente.js';
import { ESTILO_GUIA, geometriaGuia } from './guias-lectura.js';

export const IMAGENES_ORIGINALES = {
  '81':{ruta:'xl/media/image11.png',ancho:508,alto:492},
  '82':{ruta:'xl/media/image12.png',ancho:520,alto:524},
  '83':{ruta:'xl/media/image13.png',ancho:858,alto:521},
  '85':{ruta:'xl/media/image14.png',ancho:417,alto:689},
  '86':{ruta:'xl/media/image15.png',ancho:699,alto:425},
  '87':{ruta:'xl/media/image16.png',ancho:699,alto:422}
};
const numero=v=>Number.isFinite(v)?v.toLocaleString('es-CR',{maximumFractionDigits:2}):'Pendiente';
export function seleccionarDeteriorosConDatos(hoja){
  return (hoja?.tipos||[]).filter(t=>t.estado==='con_deterioro'&&t.filas.some(f=>t.codigo==='84'?f.seleccionado:f.cantidad>0));
}
export function lecturasTipo(tipo,variasMuestras=false){
  if(variasMuestras)return [];
  if(tipo.codigo==='84')return opcionesPolvo(tipo).map(n=>`${n.nombre} (${n.letra}): VD ${n.valor}`);
  return tipo.filas.filter(f=>f.cantidad>0).map(f=>`${f.letra} · Densidad ${numero(f.densidad)} · VD ${numero(f.deduccion)}`);
}
export function opcionesPolvo(tipo){
  return NIVELES_HOJA.map(n=>({...n,valor:DEDUCCION_POLVO[n.id],seleccionada:tipo.estado==='con_deterioro'&&tipo.filas.some(f=>f.severidad===n.id&&f.seleccionado)}));
}
/** Coordenadas de la hoja, con origen arriba a la izquierda, para PDF y Excel. */
export function guiasTarjeta(tarjeta,mapa){
  const g=tarjeta.tipo.grafica,m=mapa?.[tarjeta.tipo.codigo],imagen=tarjeta.imagen;
  if(!g||!m||!imagen)return [];
  const proyectar=(x,y)=>{
    const tx=x/g.maxX,ty=1-y/g.maxY,[a,b,c,d]=m.esquinas;
    const ox=(1-ty)*(a[0]*(1-tx)+b[0]*tx)+ty*(c[0]*(1-tx)+d[0]*tx);
    const oy=(1-ty)*(a[1]*(1-tx)+b[1]*tx)+ty*(c[1]*(1-tx)+d[1]*tx);
    return {x:imagen.x+(ox-m.imagen[0])/m.imagen[2]*imagen.ancho,y:imagen.y+(oy-m.imagen[1])/m.imagen[3]*imagen.alto};
  };
  return g.guias.filter(g=>tarjeta.tipo.filas.some(f=>f.letra===g.letra&&f.cantidad>0)).map(g=>({
    color:g.color,letra:g.letra,...geometriaGuia(proyectar(g.densidad,0),proyectar(g.densidad,g.deduccion),proyectar(0,g.deduccion))
  }));
}
export function distribuirCurvas(hoja){
  const tipos=seleccionarDeteriorosConDatos(hoja),columnas=tipos.length<=1?1:tipos.length<=4?2:3;
  const ancho=columnas===3?841.89:595.28,alto=columnas===3?1190.55:841.89,margen=24,espacio=18,inicio=78;
  const filas=Math.max(1,Math.ceil(tipos.length/columnas)),w=(ancho-2*margen-espacio*(columnas-1))/columnas;
  const h=(alto-inicio-44-espacio*(filas-1))/filas;
  const tarjetas=tipos.map((tipo,i)=>{
    const x=margen+(i%columnas)*(w+espacio),y=inicio+Math.floor(i/columnas)*(h+espacio);
    const lecturas=lecturasTipo(tipo,hoja.variasMuestras),meta=IMAGENES_ORIGINALES[tipo.codigo];
    const maxH=h-64-Math.max(1,lecturas.length)*15;
    let imagen=null;
    if(meta){const escala=Math.min((w-12)/meta.ancho,maxH/meta.alto);imagen={...meta,x:x+(w-meta.ancho*escala)/2,y:y+34,ancho:meta.ancho*escala,alto:meta.alto*escala};}
    return {tipo,x,y,ancho:w,alto:h,imagen,lecturas,lecturasY:imagen?imagen.y+imagen.alto+17:y+67,pasoLecturas:tipo.codigo==='84'?23:15};
  });
  return {ancho,alto,columnas,tarjetas};
}
export function rellenarCurvasSeleccionadas(libro,hoja,contexto='',mapa={}){
  const plan=distribuirCurvas(hoja),enc=new TextEncoder(),dec=new TextDecoder(),colPt=plan.ancho/14,rowPt=15;
  const filas=new Map(),fusiones=[];
  const letra=n=>String.fromCharCode(65+n);
  function celda(fila,col,texto,estilo=60){if(!filas.has(fila))filas.set(fila,[]);filas.get(fila).push(`<c r="${letra(col)}${fila}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${xmlTexto(texto)}</t></is></c>`);}
  function rotulo(y,x,w,texto,estilo){
    // El rótulo ocupa únicamente celdas de su tarjeta; dos bandas nunca se fusionan entre sí.
    const fila=Math.floor(y/rowPt)+1,col=Math.min(13,Math.ceil(x/colPt)),fin=Math.max(col,Math.min(13,Math.floor((x+w-3)/colPt)));
    celda(fila,col,texto,estilo);if(fin>col)fusiones.push(`${letra(col)}${fila}:${letra(fin)}${fila}`);
  }
  celda(1,0,'Curvas de los deterioros registrados',10);fusiones.push('A1:N1');
  celda(3,0,contexto,60);fusiones.push('A3:N3');
  const anclas=[],relaciones=[];
  let idForma=1000;
  const emu=v=>Math.round(v*12700);
  const ancla=(x,y,w,h,contenido)=>`<xdr:absoluteAnchor><xdr:pos x="${emu(x)}" y="${emu(y)}"/><xdr:ext cx="${emu(w)}" cy="${emu(h)}"/>${contenido}<xdr:clientData/></xdr:absoluteAnchor>`;
  function anclarForma(x,y,w,h,propiedades,nombre){
    const id=idForma++;
    // Posición fija en la hoja y transformación idéntica: Excel y Calc no las devuelven a A1.
    anclas.push(ancla(x,y,w,h,`<xdr:sp><xdr:nvSpPr><xdr:cNvPr id="${id}" name="${xmlTexto(nombre)}"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr>${propiedades(w,h,x,y)}</xdr:spPr></xdr:sp>`));
  }
  function linea(a,b,color,grosor,nombre){
    const w=Math.max(.01,Math.abs(b.x-a.x)),h=Math.max(.01,Math.abs(b.y-a.y));
    anclarForma(Math.min(a.x,b.x),Math.min(a.y,b.y),w,h,(w,h,x,y)=>`<a:xfrm${b.x<a.x?' flipH="1"':''}${b.y<a.y?' flipV="1"':''}><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="${emu(grosor)}" cap="rnd"><a:solidFill><a:srgbClr val="${color.replace('#','')}"/></a:solidFill></a:ln>`,nombre);
  }
  for(const [i,t] of plan.tarjetas.entries()){
    rotulo(t.y,t.x,t.ancho,`${t.tipo.codigo} · ${t.tipo.nombre}`,55);
    if(t.imagen){
      const m=t.imagen,id=`rIdCurva${i+1}`;
      anclas.push(ancla(m.x,m.y,m.ancho,m.alto,`<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i+1}" name="Curva original ${t.tipo.codigo}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="${emu(m.x)}" y="${emu(m.y)}"/><a:ext cx="${emu(m.ancho)}" cy="${emu(m.alto)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>`));
      relaciones.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${m.ruta.split('/').pop()}"/>`);
    }else rotulo(t.y+35,t.x,t.ancho,'No requiere cálculo de densidad.',60);
    t.lecturas.forEach((l,n)=>{
      const marca=t.tipo.codigo==='84'?(opcionesPolvo(t.tipo)[n].seleccionada?'◉ ':'○ '):'';
      rotulo(t.lecturasY+n*t.pasoLecturas,t.x,t.ancho,marca+l,60);
    });
    for(const guia of guiasTarjeta(t,mapa)){
      for(const camino of [guia.recorrido,...guia.flechas])for(let j=1;j<camino.length;j++){
        linea(camino[j-1],camino[j],guia.color,ESTILO_GUIA.grosor,`Flecha ${t.tipo.codigo} ${guia.letra}`);
      }
    }
  }
  if(!plan.tarjetas.length)celda(7,0,'No hay deterioros con cantidades registradas.',16);
  const ultimo=Math.ceil(plan.alto/rowPt),filasXml=Array.from({length:ultimo},(_,i)=>`<row r="${i+1}" ht="15" customHeight="1">${(filas.get(i+1)||[]).join('')}</row>`).join('');
  const columnas=Array.from({length:14},(_,i)=>`<col min="${i+1}" max="${i+1}" width="${((colPt/.75-5)/7).toFixed(4)}" customWidth="1"/>`).join('');
  const hojaXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:N${ultimo}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${columnas}</cols><sheetData>${filasXml}</sheetData><mergeCells count="${fusiones.length}">${fusiones.map(r=>`<mergeCell ref="${r}"/>`).join('')}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.1" right="0.1" top="0.1" bottom="0.1" header="0" footer="0"/><pageSetup paperSize="${plan.columnas===3?8:9}" orientation="portrait" fitToWidth="1" fitToHeight="1"/><drawing r:id="rId2"/></worksheet>`;
  libro.set('xl/worksheets/sheet15.xml',enc.encode(hojaXml));
  libro.set('xl/drawings/drawing13.xml',enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anclas.join('')}</xdr:wsDr>`));
  libro.set('xl/drawings/_rels/drawing13.xml.rels',enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relaciones.join('')}</Relationships>`));
  const w=dec.decode(libro.get('xl/workbook.xml')).replace(/(<definedName\b(?=[^>]*\bname="_xlnm.Print_Area")(?=[^>]*\blocalSheetId="14")[^>]*>)[\s\S]*?(<\/definedName>)/,'$1Curvas!$$A$$1:$$N$$'+ultimo+'$2');
  libro.set('xl/workbook.xml',enc.encode(w));
  return plan;
}
