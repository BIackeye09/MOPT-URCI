/* Llena exclusivamente los espacios de datos y resultados de la plantilla 02. */
import {abrirPaquete,rellenarXml,xmlTexto} from './archivo-plantilla.js';
import {reunirHojasOficiales} from './libro-formularios.js';
import {numeroDecimal} from './motor-urci.js';
import {encabezadoProyecto,calcularEficienciaProyecto,fechaExcel} from './eficiencia.js';

const dec=new TextDecoder(),enc=new TextEncoder(),cache=new Map();
const nombres={eficiencia:'02_RVNL_Eficiencia_VF.xlsx',baseEficiencia:'eficiencia-base.pdf',mapaEficiencia:'eficiencia-mapa.json'};
async function recurso(clave,opciones){
 if(opciones.recursos?.[clave])return opciones.recursos[clave];
 if(!cache.has(clave))cache.set(clave,(async()=>{const r=await fetch('./plantillas/'+nombres[clave]);if(!r.ok)throw new Error('No se pudo cargar la plantilla de Eficiencia.');return new Uint8Array(await r.arrayBuffer());})().catch(e=>{cache.delete(clave);throw e;}));
 return cache.get(clave);
}
const valorNumerico=v=>numeroDecimal(v)??(String(v??'').trim()||null);
export function filaFormularioEficiencia(p,numero){
 const h=encabezadoProyecto(p),fecha=v=>fechaExcel(v)??(v||null);
 return [numero,h.ruta,h.seccion,valorNumerico(p.anio),p.trabajo||null,h.region,h.provincia,h.canton,valorNumerico(p.longitudKm),p.modalidad||null,p.estadoProyecto||null,p.programacion||null,fecha(p.inicioProgramado),valorNumerico(p.duracionProgramada),fecha(p.finProgramado),fecha(p.inicioEjecutado),valorNumerico(p.duracionEjecutada),fecha(p.finEjecutado),valorNumerico(p.montoProgramado),valorNumerico(p.montoEjecutado)];
}
export function filaResultadosEficiencia(p,numero){
 const h=encabezadoProyecto(p),r=calcularEficienciaProyecto(p);
 return [numero,h.ruta,h.seccion,r.variacionTiempo,r.tiempo,r.variacionCosto,r.costo,r.indice,r.calificacion||null];
}
export function formulasEficiencia(fila,filaFormulario,nombre='Formulario'){
 const hoja="'"+nombre.replace(/'/g,"''")+"'!",c=col=>hoja+col+filaFormulario;
 const d='D'+fila,e='E'+fila,f='F'+fila,g='G'+fila,h='H'+fila;
 return [c('A'),c('B'),c('C'),
  `IF(OR(NOT(ISNUMBER(${c('N')})),NOT(ISNUMBER(${c('Q')})),${c('N')}<=0,${c('Q')}<0),"",ROUND((${c('Q')}-${c('N')})/${c('N')},12))`,
  `IF(${d}="","",IF(${d}<=0,100,IF(${d}<20%,80,IF(${d}<30%,60,IF(${d}<40%,40,20)))))`,
  `IF(OR(NOT(ISNUMBER(${c('S')})),NOT(ISNUMBER(${c('T')})),${c('S')}<=0,${c('T')}<0),"",ROUND((${c('T')}-${c('S')})/${c('S')},12))`,
  `IF(${f}="","",IF(${f}<20%,100,IF(${f}<=30%,75,IF(${f}<40%,50,25))))`,
  `IF(OR(${e}="",${g}=""),"",${e}*0.5+${g}*0.5)`,
  `IF(${h}="","",IF(${h}>=90,"Muy Bueno",IF(${h}>=80,"Bueno",IF(${h}>=70,"Regular",IF(${h}>=40,"Malo","Muy Malo")))))`];
}
function limitarFilas(xml,ultima,columna){
 return xml.replace(/<row\b([^>]*)>[\s\S]*?<\/row>/g,(row,a)=>Number(/\br="(\d+)"/.exec(a)?.[1])>ultima?'':row)
  .replace(/<dimension\b[^>]*\/>/,`<dimension ref="A1:${columna}${ultima}"/>`);
}
function llenarFormulas(xml,filas){
 return xml.replace(/<c\b([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g,(original,attrs)=>{
  const ref=/\br="([^"]+)"/.exec(attrs)?.[1],dato=filas.get(ref);if(!dato)return original;
  const [formula,valor]=dato,numero=typeof valor==='number'&&Number.isFinite(valor),a=attrs.replace(/\s+t="[^"]*"/g,'');
  return `<c${a}${numero?'':' t="str"'}><f>${xmlTexto(formula)}</f><v>${xmlTexto(valor??'')}</v></c>`;
 });
}
export async function exportarExcelEficiencia(proyectos,opciones={}){
 const activos=proyectos.filter(p=>!p.eliminadoEn);if(!activos.length)throw new Error('No hay proyectos para descargar.');
 const original=await abrirPaquete(await recurso('eficiencia',opciones),opciones),hojas=[];
 for(let desde=0;desde<activos.length;desde+=42){
  const pagina=Math.floor(desde/42)+1,lote=activos.slice(desde,desde+42),libro=new Map(original),nf=pagina===1?'Formulario':`Formulario ${pagina}`,nr=pagina===1?'RESULTADOS':`RESULTADOS ${pagina}`;
  const valores={},formulas=new Map();
  for(const [i,p]of lote.entries()){
   filaFormularioEficiencia(p,desde+i+1).forEach((v,j)=>valores[String.fromCharCode(65+j)+(i+2)]=v);
   const resultados=filaResultadosEficiencia(p,desde+i+1),fs=formulasEficiencia(i+5,i+2,nf);
   fs.forEach((formula,j)=>formulas.set(String.fromCharCode(65+j)+(i+5),[formula,resultados[j]]));
  }
  const entrada=limitarFilas(rellenarXml(dec.decode(original.get('xl/worksheets/sheet4.xml')),valores),lote.length+1,'T');
  const resultados=limitarFilas(llenarFormulas(dec.decode(original.get('xl/worksheets/sheet5.xml')),formulas),lote.length+4,'I');
  libro.set('xl/worksheets/sheet4.xml',enc.encode(entrada));libro.set('xl/worksheets/sheet5.xml',enc.encode(resultados));
  let wb=dec.decode(original.get('xl/workbook.xml'));
  for(const [id,fin]of [[3,`Formulario!$A$1:$T$${lote.length+1}`],[4,`RESULTADOS!$A$2:$I$${lote.length+4}`]]){
   const re=new RegExp('(<definedName\\b(?=[^>]*\\bname="_xlnm.Print_Area")(?=[^>]*\\blocalSheetId="'+id+'")[^>]*>)[\\s\\S]*?(<\\/definedName>)');
   wb=wb.replace(re,(_,a,b)=>a+fin+b);
  }
  libro.set('xl/workbook.xml',enc.encode(wb));
  hojas.push({nombre:nf,paquete:libro,ruta:'xl/worksheets/sheet4.xml',indiceOriginal:3},{nombre:nr,paquete:libro,ruta:'xl/worksheets/sheet5.xml',indiceOriginal:4});
 }
 return reunirHojasOficiales(original,hojas);
}
function textoPdf(v,col,tipo){
 if(v===null||v===undefined)return '';
 if(tipo==='formulario'&&[12,14,15,17].includes(col)&&typeof v==='number')return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10).split('-').reverse().join('/');
 if(typeof v!=='number')return String(v);
 if(tipo==='formulario'&&[0,3].includes(col)||tipo==='resultados'&&col===0)return String(v);
 if(tipo==='resultados'&&[3,5].includes(col))return (v*100).toLocaleString('es-CR',{maximumFractionDigits:2})+' %';
 if(tipo==='formulario'&&[18,19].includes(col))return '₡ '+v.toLocaleString('es-CR',{minimumFractionDigits:2,maximumFractionDigits:2});
 if(tipo==='formulario'&&col===8)return v.toLocaleString('es-CR',{minimumFractionDigits:3,maximumFractionDigits:3});
 return v.toLocaleString('es-CR',{maximumFractionDigits:4});
}
export async function exportarPdfEficiencia(proyectos,opciones={}){
 const activos=proyectos.filter(p=>!p.eliminadoEn);if(!activos.length)throw new Error('No hay proyectos para descargar.');
 const {pdfLib=globalThis.PDFLib,fontkit=globalThis.fontkit}=opciones;if(!pdfLib||!fontkit)throw new Error('No se cargó el exportador PDF.');
 const pdf=await pdfLib.PDFDocument.create();pdf.registerFontkit(fontkit);
 const fondo=await pdfLib.PDFDocument.load(await recurso('baseEficiencia',opciones)),mapa=JSON.parse(dec.decode(await recurso('mapaEficiencia',opciones)));
 const fuente=await pdf.embedFont(opciones.fuente||new Uint8Array(await(await fetch('./vendor/DejaVuSans.ttf')).arrayBuffer()),{subset:true});
 for(let desde=0;desde<activos.length;desde+=42){
  const lote=activos.slice(desde,desde+42);
  for(const [indice,tipo]of ['formulario','resultados'].entries()){
   const m=mapa[tipo],limite=m.inicio+lote.length*m.paso+.4,pagina=pdf.addPage([m.ancho,m.alto]);
   const bg=await pdf.embedPage(fondo.getPage(indice),{left:0,bottom:m.alto-limite,right:m.ancho,top:m.alto});
   pagina.drawPage(bg,{x:0,y:m.alto-limite,width:m.ancho,height:limite});
   for(const [i,p]of lote.entries()){
    const valores=tipo==='formulario'?filaFormularioEficiencia(p,desde+i+1):filaResultadosEficiencia(p,desde+i+1);
    for(const [col,valor]of valores.entries()){
     const texto=textoPdf(valor,col,tipo);if(!texto)continue;
     const x=m.columnas[col],w=m.columnas[col+1]-x,ancho=Math.max(1,w-2),tam=Math.min(m.fuente,ancho/Math.max(1,fuente.widthOfTextAtSize(texto,1)));
     const estilo=m.estilos[String.fromCharCode(65+col)]||{},alineacion=estilo.alineacion==='general'?(typeof valor==='number'?'right':'left'):estilo.alineacion;
     const dx=alineacion==='center'?(w-fuente.widthOfTextAtSize(texto,tam))/2:alineacion==='right'?w-fuente.widthOfTextAtSize(texto,tam)-1:1;
     pagina.drawText(texto,{x:x+dx,y:m.alto-(m.inicio+i*m.paso+(m.paso+tam*.72)/2),size:tam,font:fuente,color:pdfLib.rgb(.09,.13,.19)});
    }
   }
  }
 }
 return pdf.save();
}
