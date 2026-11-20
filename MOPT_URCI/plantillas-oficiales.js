import { abrirPaquete, rellenarParte } from './archivo-plantilla.js';
import { reunirHojasOficiales } from './libro-formularios.js';
import { encabezadoFicha, resultadosFicha, areaMuestra } from './modelo.js';
import { numeroDecimal } from './motor-urci.js';
import { DETERIOROS, NIVELES_HOJA, totalNivel, polvoSeleccionado, deduccionVisible } from './frente.js';
import { CRITERIOS_SV, esProporcional, nivelErosion } from './seguridad.js';
import { crearHojaGraficas } from './hoja-graficas.js';
import { seleccionarDeteriorosConDatos, distribuirCurvas, rellenarCurvasSeleccionadas, opcionesPolvo, guiasTarjeta } from './curvas-seleccionadas.js';
import { ESTILO_GUIA } from './guias-lectura.js';

const finite=v=>Number.isFinite(v)?v:null;
const fecha=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?v.split('-').reverse().join('/'):v||'';
const legible=v=>typeof v==='number'?v.toLocaleString('es-CR',{maximumFractionDigits:2}):String(v??'');
const nombres={limpio:'Formulario_Limpio.xlsx',eficacia:'01_RVNL_Eficacia_VF.xlsx',fondo:'formulario-base.pdf',resumen:'resumen-base.pdf',curvas:'curvas-base.pdf',mapa:'mapa.json'};
const cargas=new Map();
async function recurso(clave,opciones){
  if(opciones?.recursos?.[clave])return opciones.recursos[clave];
  const ruta='./plantillas/'+nombres[clave];
  if(!cargas.has(ruta))cargas.set(ruta,(async()=>{const r=await fetch(ruta);if(!r.ok)throw new Error('No se pudo cargar la plantilla oficial.');return new Uint8Array(await r.arrayBuffer());})().catch(e=>{cargas.delete(ruta);throw e;}));
  return cargas.get(ruta);
}
function nombreEstado(v){return v===null?'':v>=100?'Muy Bueno':v>=85?'Bueno':v>=70?'Regular':v>=50?'Malo':'Muy Malo';}
export function camposFicha(ficha,{limpio=true}={}){
  const h=encabezadoFicha(ficha),r=resultadosFicha(ficha),s=ficha.i.seguridadVial||{},u=ficha.u;
  const c={I6:h.ruta,I7:h.seccion,I8:h.unidad,I9:fecha(h.fecha),I10:h.inicio,I11:h.fin,I13:h.inspector};
  const largo=numeroDecimal(u.longitud),ancho=numeroDecimal(u.ancho);
  c.J12=largo>0?largo:null;c.N12=ancho>0?ancho:null;
  c.T27=ficha.i.observacionesURCI||'';
  for(const [i,t]of DETERIOROS.entries()){
    const registro=ficha.i.deterioros[t.codigo],col=['H','L','P','T','X','AB','AF'][i];
    for(const [j,n]of NIVELES_HOJA.entries()){
      const bruto=t.codigo==='84'?'':totalNivel(registro.niveles[n.id]);
      c[col+(22+j)]=registro.estado!=='con_deterioro'?null:t.codigo==='84'?(polvoSeleccionado(registro)===n.id?'x':null):numeroDecimal(bruto)??(String(bruto).trim()?String(bruto):null);
      const f=r.urci.filas.find(f=>f.codigo===t.codigo&&f.severidad===n.id),fila=28+i*3+j;
      c['L'+fila]=t.codigo==='84'?null:finite(f.densidad);c['P'+fila]=finite(deduccionVisible(f));
    }
  }
  c.A50=finite(r.urci.vdt);c.L50=finite(r.urci.q);c.P50=finite(r.urci.urci);c.X50=r.calificacionTR||null;
  const k=limpio?{ruta:'AL6',seccion:'AL7',inicio:'AN6',fin:'AN7',fecha:'AQ6',inspector:'AQ7',unidad:'AS7',erosion:'AM11',marca:'AQ',puntaje:'AR',estado:'AS'}:{ruta:'AK6',seccion:'AK7',inicio:'AM6',fin:'AM7',fecha:'AP6',inspector:'AP7',unidad:'AR7',erosion:'AL11',marca:'AP',puntaje:'AQ',estado:'AR'};
  Object.assign(c,{[k.ruta]:h.ruta,[k.seccion]:h.seccion,[k.inicio]:h.inicio,[k.fin]:h.fin,[k.fecha]:fecha(h.fecha),[k.inspector]:h.inspector,[k.unidad]:h.unidad,[k.erosion]:numeroDecimal(s.erosion)??(s.erosion||null)});
  c[k.puntaje+'11']=r.seguridad.erosion;c[k.estado+'11']=esProporcional(s)?r.seguridad.erosion===null?null:CRITERIOS_SV.erosion.find(o=>o.id===nivelErosion(s.erosion))?.nombre||null:nombreEstado(r.seguridad.erosion);
  for(const [clave,filas,inicio]of [['estabilidad',[13,15,17,19,21],13],['vegetacion',[23,25,27,29,31],23],['senalamiento',[35,38,41,44,47],35]]){
    const opciones=CRITERIOS_SV[clave],elegido=opciones.findIndex(o=>o.id===s[clave]);
    filas.forEach((fila,i)=>c[k.marca+fila]=i===elegido?'x':null);
    const puntaje = finite(r.seguridad[clave]);
    c[k.puntaje+inicio] = puntaje;
    c[k.estado+inicio] = elegido >= 0 && (!esProporcional(s) || puntaje !== null) ? opciones[elegido].nombre : null;
  }
  c[k.puntaje+'50']=finite(r.seguridad.indice);c[k.estado+'50']=r.seguridad.calificacion||null;
  return c;
}
export function camposResumen(documento,desde=0){
  const c={};
  for(const [indice,inicio]of [[0,9],[1,25]])for(let n=0;n<10;n++){
    const fila=documento.resumen[indice].filas[desde+n]||[];
    for(let col=0;col<9;col++)c[String.fromCharCode(65+col)+(inicio+n)]=fila[col]??null;
  }
  const resultados=documento.resumen[2].filas;
  Object.assign(c,{H19:resultados[0][1],I19:resultados[0][2]==='Pendiente'?null:resultados[0][2],H35:resultados[1][1],I35:resultados[1][2]==='Pendiente'?null:resultados[1][2],D40:resultados[2][1],F40:resultados[2][2]==='Pendiente'?null:resultados[2][2]});
  return c;
}
export async function exportarFormulariosExcel(documento,opciones={}){
  const original=await abrirPaquete(await recurso('eficacia',opciones),opciones),hojas=[];
  const mapa=JSON.parse(new TextDecoder().decode(await recurso('mapa',opciones)));
  const bloques=documento.bloques||[documento];
  for(const [bi,bloque]of bloques.entries()){
    const vistas=new Set(),fichas=(bloque.muestras||bloque.fichas||[bloque.ficha].filter(Boolean))
      .filter(f=>!f.u.eliminadaEn&&!vistas.has(f.u.id)&&vistas.add(f.u.id));
    if(!fichas.length)continue;
    const prefijo=bloques.length>1?`F${Number(fichas[0].u.formularioNumero)||bi+1} `:'';
    for(const [i,f]of fichas.entries()){
      const numero=String(i+1).padStart(2,'0'),libro=new Map(original),h=encabezadoFicha(f);
      rellenarParte(libro,'xl/worksheets/sheet5.xml',camposFicha(f,{limpio:false}));
      const png=bloque.croquisPorUnidad?.[f.u.id]||(f.u.id===bloque.ficha?.u.id?bloque.croquisPng:null);
      if(png)insertarCroquis(libro,png,'drawing3.xml');
      hojas.push({nombre:`${prefijo}Muestra ${numero}`,paquete:libro,ruta:'xl/worksheets/sheet5.xml',indiceOriginal:4});
      const r=resultadosFicha(f),graficas=crearHojaGraficas(f.i,{...f.u,areaM2:areaMuestra(f.u)??''},r.urci);
      if(seleccionarDeteriorosConDatos(graficas).length){
        const curvas=new Map(original);
        rellenarCurvasSeleccionadas(curvas,graficas,`${h.formulario?h.formulario+' · ':''}${h.ruta} · Sección ${h.seccion} · ${h.unidad||'Muestra '+numero}`,mapa.graficas);
        // La nueva hoja sólo utiliza su dibujo; no lleva las relaciones del instructivo.
        curvas.set('xl/worksheets/_rels/sheet15.xml.rels',new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing13.xml"/></Relationships>'));
        hojas.push({nombre:`${prefijo}Curvas ${numero}`,paquete:curvas,ruta:'xl/worksheets/sheet15.xml',indiceOriginal:14});
      }
    }
    const paginas=Math.max(1,Math.ceil(bloque.resumen[0].filas.length/10));
    for(let pagina=0;pagina<paginas;pagina++){
      const libro=new Map(original);
      rellenarParte(libro,'xl/worksheets/sheet16.xml',camposResumen(bloque,pagina*10));
      hojas.push({nombre:`${prefijo}Resumen${paginas>1?' '+String(pagina+1).padStart(2,'0'):''}`,paquete:libro,ruta:'xl/worksheets/sheet16.xml',indiceOriginal:15});
    }
  }
  return reunirHojasOficiales(original,hojas);
}
function insertarCroquis(paquete,png,dibujo='drawing1.xml'){
  const dec=new TextDecoder(),enc=new TextEncoder(),d='xl/drawings/'+dibujo,r='xl/drawings/_rels/'+dibujo+'.rels';
  const original=dec.decode(paquete.get(d)),rel=dec.decode(paquete.get(r));
  const ancla='<xdr:oneCellAnchor><xdr:from><xdr:col>18</xdr:col><xdr:colOff>585788</xdr:colOff><xdr:row>6</xdr:row><xdr:rowOff>19050</xdr:rowOff></xdr:from><xdr:ext cx="2590800" cy="1295400"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="9999" name="Croquis de la muestra"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rIdCroquisURCI"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="2590800" cy="1295400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>';
  paquete.set(d,enc.encode(original.replace('</xdr:wsDr>',ancla+'</xdr:wsDr>')));
  paquete.set(r,enc.encode(rel.replace('</Relationships>','<Relationship Id="rIdCroquisURCI" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/croquis-urci.png"/></Relationships>')));
  paquete.set('xl/media/croquis-urci.png',png);
}

export async function exportarPdfOficial(documento,opciones={}){
  const {pdfLib=globalThis.PDFLib,fontkit=globalThis.fontkit,secciones=['urci','seguridad','resumen',...(seleccionarDeteriorosConDatos(documento.graficas).length?['graficas']:[])]}=opciones;
  if(!pdfLib||!fontkit)throw new Error('No se cargó el exportador PDF.');
  const {PDFDocument,rgb}=pdfLib,pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  const mapa=JSON.parse(new TextDecoder().decode(await recurso('mapa',opciones)));
  const fuente=await pdf.embedFont(opciones.fuente||new Uint8Array(await(await fetch('./vendor/DejaVuSans.ttf')).arrayBuffer()),{subset:true});
  const negrita=await pdf.embedFont(opciones.fuenteNegrita||new Uint8Array(await(await fetch('./vendor/DejaVuSans-Bold.ttf')).arrayBuffer()),{subset:true});
  const colorPdf=hex=>rgb(...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));
  async function fondo(clave,indice=0){const origen=await PDFDocument.load(await recurso(clave,opciones));const [pagina]=await pdf.copyPages(origen,[indice]);pdf.addPage(pagina);return pagina;}
  function escribir(pagina,valores,celdas,estilos){
    for(const [ref,valor]of Object.entries(valores)){
      const a=celdas[ref];if(!a||valor===null||valor===undefined||valor==='')continue;
      const estilo=estilos?.[ref]||{},font=estilo.negrita?negrita:fuente;
      const decimales=/^0\.0+$/.test(estilo.formato)?estilo.formato.length-2:null;
      const [x,y,w,h]=a,base=typeof valor==='number'&&decimales!==null?valor.toLocaleString('es-CR',{minimumFractionDigits:decimales,maximumFractionDigits:decimales}):typeof valor==='number'?legible(valor):String(valor);let tamano=estilo.tamano||Math.min(9,h*.66),lineas;
      function dividir(){
        const salida=[];
        for(const parrafo of base.split('\n')){
          if(!estilo.envolver){salida.push(parrafo);continue;}
          let actual='';
          for(const palabra of parrafo.split(/\s+/)){
            if(actual&&font.widthOfTextAtSize(actual+' '+palabra,tamano)>w-4){salida.push(actual);actual='';}
            actual+=(actual?' ':'')+palabra;
          }
          salida.push(actual);
        }
        return salida;
      }
      do{lineas=dividir();if(lineas.length*(tamano+1)<=h-1&&lineas.every(l=>font.widthOfTextAtSize(l,tamano)<=w-4))break;tamano-=.2;}while(tamano>=4);
      if(tamano<4)throw new Error('El texto no cabe en el espacio oficial '+ref+'. Revisá su extensión o descargá el Excel.');
      let fondo,color=estilo.color||'#000000';
      for(const regla of estilo.reglas||[]){
        const coincide=regla.tipo==='containsText'?String(valor).toLocaleLowerCase().includes(String(regla.texto).toLocaleLowerCase()):regla.tipo==='cellIs'&&typeof valor==='number'&&(regla.operador==='equal'?valor===Number(regla.formula[0]):regla.operador==='greaterThan'?valor>Number(regla.formula[0]):false);
        if(coincide){if(!fondo&&regla.fondo)fondo=regla.fondo;if(regla.color&&color===(estilo.color||'#000000'))color=regla.color;}
      }
      if(fondo)pagina.drawRectangle({x:x+.35,y:pagina.getHeight()-y-h+.35,width:w-.7,height:h-.7,color:colorPdf(fondo)});
      const alto=lineas.length*(tamano+1),arriba=estilo.vertical==='top'?2:estilo.vertical==='bottom'?Math.max(1,h-alto-1):(h-alto)/2;
      lineas.forEach((l,i)=>{const ancho=font.widthOfTextAtSize(l,tamano),alinear=estilo.horizontal==='center'?(w-ancho)/2:estilo.horizontal==='right'||estilo.horizontal==='general'&&typeof valor==='number'?w-ancho-2:2;pagina.drawText(l,{x:x+alinear,y:pagina.getHeight()-y-arriba-tamano-i*(tamano+1),size:tamano,font,color:colorPdf(color)});});
    }
  }
  if(documento.tipo==='ficha'){
    const campos=camposFicha(documento.ficha);
    if(secciones.includes('urci')){
      const p=await fondo('fondo',0);escribir(p,campos,mapa.urci,mapa.estilos.urci);
      if(documento.croquisPng){const imagen=await pdf.embedPng(documento.croquisPng),[x,y,w,h]=mapa.croquis,escala=Math.min(w/imagen.width,h/imagen.height);p.drawImage(imagen,{x:x+(w-imagen.width*escala)/2,y:p.getHeight()-y-h+(h-imagen.height*escala)/2,width:imagen.width*escala,height:imagen.height*escala});}
    }
    if(secciones.includes('seguridad')){const p=await fondo('fondo',1);escribir(p,campos,mapa.seguridad,mapa.estilos.seguridad);}

  }
  if(secciones.includes('resumen'))for(let desde=0;desde<Math.max(1,documento.resumen[0].filas.length);desde+=10){const p=await fondo('resumen');escribir(p,camposResumen(documento,desde),mapa.resumen,mapa.estilos.resumen);}
  if(documento.tipo==='ficha'&&secciones.includes('graficas')){
    const plan=distribuirCurvas(documento.graficas),p=pdf.addPage([plan.ancho,plan.alto]);
    const texto=(s,x,y,size=10,font=fuente,color=rgb(.08,.17,.22))=>p.drawText(s,{x,y:p.getHeight()-y-size,size,font,color});
    texto('Curvas de los deterioros registrados',24,20,16,negrita);
    texto(`${documento.encabezado.ruta} · Sección ${documento.encabezado.seccion} · ${documento.encabezado.unidad||'Unidad pendiente'}`,24,46,10);
    const libro=await abrirPaquete(await recurso('eficacia',opciones),opciones);
    if(!plan.tarjetas.length)texto('No hay deterioros con cantidades registradas.',24,100,12);
    for(const tarjeta of plan.tarjetas){
      const tipo=tarjeta.tipo;
      const titulo=`${tipo.codigo} · ${tipo.nombre}`;let linea='',y=tarjeta.y;
      for(const palabra of titulo.split(' ')){if(linea&&negrita.widthOfTextAtSize(linea+' '+palabra,10)>tarjeta.ancho){texto(linea,tarjeta.x,y,10,negrita);linea='';y+=12;}linea+=(linea?' ':'')+palabra;}
      if(linea)texto(linea,tarjeta.x,y,10,negrita);
      const polvo=tipo.codigo==='84';
      tarjeta.lecturas.forEach((l,n)=>texto(l,tarjeta.x+(polvo?20:0),tarjeta.lecturasY+n*tarjeta.pasoLecturas,9,polvo&&opcionesPolvo(tipo)[n].seleccionada?negrita:fuente));
      if(!tarjeta.imagen){
        texto('No requiere cálculo de densidad.',tarjeta.x,tarjeta.y+35,10);
        if(polvo)for(const [n,opcion]of opcionesPolvo(tipo).entries()){
          const x=tarjeta.x+6,y=p.getHeight()-tarjeta.lecturasY-n*tarjeta.pasoLecturas-4.5,color=colorPdf(opcion.seleccionada?'#087b83':'#526772');
          p.drawCircle({x,y,size:5,color:rgb(1,1,1),borderColor:color,borderWidth:1.4});
          if(opcion.seleccionada)p.drawCircle({x,y,size:2.5,color});
        }
        continue;
      }
      const imagen=tarjeta.imagen,png=await pdf.embedPng(libro.get(imagen.ruta));
      p.drawImage(png,{x:imagen.x,y:p.getHeight()-imagen.y-imagen.alto,width:imagen.ancho,height:imagen.alto});
      const enPdf=pt=>({x:pt.x,y:p.getHeight()-pt.y});
      for(const guia of guiasTarjeta(tarjeta,mapa.graficas)){
        const color=colorPdf(guia.color);
        for(const camino of [guia.recorrido,...guia.flechas])for(let i=1;i<camino.length;i++){
          const start=enPdf(camino[i-1]),end=enPdf(camino[i]);
          p.drawLine({start,end,color,thickness:ESTILO_GUIA.grosor,lineCap:1});
        }
      }
    }
  }
  if(!pdf.getPageCount())throw new Error('El formulario no está disponible.');
  pdf.setTitle(`${documento.encabezado.ruta} · ${documento.encabezado.seccion}`);pdf.setCreator('MOPT URCI · Plantillas originales');
  return pdf.save();
}
