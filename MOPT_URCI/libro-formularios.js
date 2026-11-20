/* Reúne copias de hojas oficiales en un XLSX independiente. Sólo copia las
 * dependencias de las hojas incluidas; nunca adjunta el libro de referencia.
 * Todas las hojas usan el mismo banco original de estilos y el mismo tema.
 */
import { guardarPaquete, xmlTexto } from './archivo-plantilla.js';

const dec=new TextDecoder(),enc=new TextEncoder();
const REL='http://schemas.openxmlformats.org/package/2006/relationships';
const DOC='http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
const MAIN='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const cabecera='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const atributos=xml=>Object.fromEntries([...xml.matchAll(/([\w:]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
function normalizar(ruta){
  const partes=[];
  for(const p of ruta.split('/')){if(p==='..'){if(!partes.length)throw new Error('Relación Excel fuera del libro.');partes.pop();}else if(p&&p!=='.')partes.push(p);}
  return partes.join('/');
}
const carpeta=ruta=>ruta.slice(0,ruta.lastIndexOf('/')+1);
const relacionesRuta=ruta=>carpeta(ruta)+'_rels/'+ruta.split('/').pop()+'.rels';
const destino=(ruta,target)=>normalizar(target.startsWith('/')?target.slice(1):carpeta(ruta)+target);
function relativa(origen,fin){
  const a=carpeta(origen).split('/').filter(Boolean),b=fin.split('/');
  while(a.length&&a[0]===b[0]){a.shift();b.shift();}
  return '../'.repeat(a.length)+b.join('/');
}

export function reunirHojasOficiales(original,hojas){
  if(!hojas.length)throw new Error('No hay muestras para descargar.');
  const salida=new Map(),tipos=new Map(),contadores=new Map(),binarios=new WeakMap(),nombres=new Set();
  const tiposXml=dec.decode(original.get('[Content_Types].xml'));
  const defaults=new Map([...tiposXml.matchAll(/<Default\b[^>]*\/>/g)].map(m=>{const a=atributos(m[0]);return[a.Extension,a.ContentType];}));
  const overrides=new Map([...tiposXml.matchAll(/<Override\b[^>]*\/>/g)].map(m=>{const a=atributos(m[0]);return[a.PartName.slice(1),a.ContentType];}));
  const cadenas=[...dec.decode(original.get('xl/sharedStrings.xml')).matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(m=>m[1]);
  function guardar(ruta,bytes,tipo){salida.set(ruta,typeof bytes==='string'?enc.encode(bytes):bytes);if(tipo)tipos.set(ruta,tipo);}
  function nombreHoja(bruto){
    const base=String(bruto||'Muestra').replace(/[\[\]:*?\/\\\u0000-\u001f]/g,' ').replace(/^'+|'+$/g,'').trim().slice(0,31)||'Muestra';
    let nombre=base,n=2;
    while(nombres.has(nombre.toLocaleLowerCase())){const sufijo=' '+n++;nombre=base.slice(0,31-sufijo.length)+sufijo;}
    nombres.add(nombre.toLocaleLowerCase());return nombre;
  }
  function textosPropios(xml){
    return xml.replace(/<c\b([^>]*\bt="s"[^>]*)>([\s\S]*?)<\/c>/g,(_,attrs,contenido)=>{
      const indice=Number(/<v>(\d+)<\/v>/.exec(contenido)?.[1]);
      if(!Number.isInteger(indice)||cadenas[indice]===undefined)throw new Error('Texto de plantilla no encontrado.');
      return `<c${attrs.replace(/\bt="s"/,'t="inlineStr"')}><is>${cadenas[indice]}</is></c>`;
    });
  }
  function copiar(paquete,ruta,mapeo,nueva=null){
    if(mapeo.has(ruta))return mapeo.get(ruta);
    const bytes=paquete.get(ruta);if(!bytes)throw new Error('Falta una parte de la plantilla: '+ruta);
    const esXml=/\.(xml|vml)$/.test(ruta),tipo=overrides.get(ruta)||defaults.get(ruta.split('.').pop())||(ruta.endsWith('.png')?'image/png':null);
    if(!esXml&&binarios.has(bytes)){const previo=binarios.get(bytes);mapeo.set(ruta,previo);return previo;}
    if(!nueva){const base=ruta.replace(/\.[^.]+$/,''),ext=ruta.slice(base.length),n=(contadores.get(base)||0)+1;contadores.set(base,n);nueva=base+'_export_'+n+ext;}
    mapeo.set(ruta,nueva);if(!esXml)binarios.set(bytes,nueva);
    let xml=esXml?dec.decode(bytes):null;
    if(ruta.startsWith('xl/worksheets/')&&esXml)xml=textosPropios(xml);
    guardar(nueva,esXml?xml:bytes,tipo);
    const rels=paquete.get(relacionesRuta(ruta));
    if(rels){
      const contenido=dec.decode(rels).replace(/<Relationship\b[^>]*\/>/g,rel=>{
        const a=atributos(rel);if(a.TargetMode==='External')return rel;
        const copia=copiar(paquete,destino(ruta,a.Target),mapeo);
        return rel.replace(/\bTarget="[^"]*"/,`Target="${xmlTexto(relativa(nueva,copia))}"`);
      });
      guardar(relacionesRuta(nueva),contenido);
    }
    return nueva;
  }
  guardar('xl/styles.xml',original.get('xl/styles.xml'),overrides.get('xl/styles.xml'));
  guardar('xl/theme/theme1.xml',original.get('xl/theme/theme1.xml'),overrides.get('xl/theme/theme1.xml'));
  const lista=[],rels=[],definidos=[];
  for(const [i,hoja]of hojas.entries()){
    const nombre=nombreHoja(hoja.nombre),id='rIdHoja'+(i+1),ruta=copiar(hoja.paquete,hoja.ruta,new Map(),`xl/worksheets/sheet${i+1}.xml`);
    // Las vistas de las copias no deben seleccionar simultáneamente varias pestañas.
    guardar(ruta,dec.decode(salida.get(ruta)).replace(/\s+tabSelected="[^"]*"/g,''),tipos.get(ruta));
    lista.push(`<sheet name="${xmlTexto(nombre)}" sheetId="${i+1}" r:id="${id}"/>`);
    rels.push(`<Relationship Id="${id}" Type="${DOC}worksheet" Target="worksheets/sheet${i+1}.xml"/>`);
    const wb=dec.decode(hoja.paquete.get('xl/workbook.xml'));
    for(const m of wb.matchAll(/<definedName\b([^>]*)>([\s\S]*?)<\/definedName>/g)){
      const a=atributos(m[1]);if(Number(a.localSheetId)!==hoja.indiceOriginal||!['_xlnm.Print_Area','_xlnm.Print_Titles'].includes(a.name))continue;
      const rango=m[2].replace(/(?:'[^']*(?:''[^']*)*'|[^!,]+)!/g,`'${xmlTexto(nombre.replace(/'/g,"''"))}'!`);
      definidos.push(`<definedName name="${a.name}" localSheetId="${i}">${rango}</definedName>`);
    }
    hoja.nombreExportado=nombre;
  }
  const pr=/<workbookPr\b[^>]*\/>/.exec(dec.decode(original.get('xl/workbook.xml')))?.[0]||'';
  guardar('xl/workbook.xml',`${cabecera}<workbook xmlns="${MAIN}" xmlns:r="${DOC.slice(0,-1)}">${pr}<bookViews><workbookView activeTab="0" firstSheet="0"/></bookViews><sheets>${lista.join('')}</sheets>${definidos.length?'<definedNames>'+definidos.join('')+'</definedNames>':''}<calcPr calcId="0" fullCalcOnLoad="1"/></workbook>`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml');
  guardar('xl/_rels/workbook.xml.rels',`${cabecera}<Relationships xmlns="${REL}">${rels.join('')}<Relationship Id="rIdEstilos" Type="${DOC}styles" Target="styles.xml"/><Relationship Id="rIdTema" Type="${DOC}theme" Target="theme/theme1.xml"/></Relationships>`);
  const titulos=hojas.map(h=>`<vt:lpstr>${xmlTexto(h.nombreExportado)}</vt:lpstr>`).join('');
  guardar('docProps/app.xml',`${cabecera}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>MOPT URCI</Application><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${hojas.length}</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="${hojas.length}" baseType="lpstr">${titulos}</vt:vector></TitlesOfParts></Properties>`,'application/vnd.openxmlformats-officedocument.extended-properties+xml');
  guardar('_rels/.rels',`${cabecera}<Relationships xmlns="${REL}"><Relationship Id="rIdLibro" Type="${DOC}officeDocument" Target="xl/workbook.xml"/><Relationship Id="rIdPropiedades" Type="${DOC}extended-properties" Target="docProps/app.xml"/></Relationships>`);
  guardar('[Content_Types].xml',`${cabecera}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>${[...tipos].map(([ruta,tipo])=>`<Override PartName="/${xmlTexto(ruta)}" ContentType="${xmlTexto(tipo)}"/>`).join('')}</Types>`);
  return guardarPaquete(salida);
}
