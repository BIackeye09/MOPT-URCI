/* Exportador OOXML local. ZIP sin compresión, UTF-8 y cadenas literales:
 * los textos del inspector nunca se interpretan como fórmulas de Excel.
 * No depende de servicios ni de paquetes externos en la computadora del usuario.
 */
const utf8 = new TextEncoder();
const xml = valor => String(valor ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]);
const tablaCRC = Uint32Array.from({length:256},(_,n) => { for(let i=0;i<8;i++) n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0; });
function crc32(datos) { let n=0xffffffff;for(const b of datos)n=tablaCRC[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0; }
function unir(partes) { const resultado=new Uint8Array(partes.reduce((s,p)=>s+p.length,0));let inicio=0;for(const p of partes){resultado.set(p,inicio);inicio+=p.length;}return resultado; }
export function crearZip(archivos) {
  const locales=[],centrales=[];let desplazamiento=0;
  for(const [nombre,contenido] of archivos) {
    const ruta=utf8.encode(nombre),datos=typeof contenido==='string'?utf8.encode(contenido):contenido;
    const crc=crc32(datos),local=new Uint8Array(30+ ruta.length),l=new DataView(local.buffer);
    l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(12,33,true);
    l.setUint32(14,crc,true);l.setUint32(18,datos.length,true);l.setUint32(22,datos.length,true);l.setUint16(26,ruta.length,true);local.set(ruta,30);
    const central=new Uint8Array(46+ruta.length),c=new DataView(central.buffer);
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);
    c.setUint32(16,crc,true);c.setUint32(20,datos.length,true);c.setUint32(24,datos.length,true);c.setUint16(28,ruta.length,true);c.setUint32(42,desplazamiento,true);central.set(ruta,46);
    locales.push(local,datos);centrales.push(central);desplazamiento+=local.length+datos.length;
  }
  const fin=new Uint8Array(22),f=new DataView(fin.buffer),directorio=unir(centrales);
  f.setUint32(0,0x06054b50,true);f.setUint16(8,archivos.length,true);f.setUint16(10,archivos.length,true);
  f.setUint32(12,directorio.length,true);f.setUint32(16,desplazamiento,true);
  return unir([...locales,directorio,fin]);
}
export function columnaExcel(indice) { let n=indice+1,s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s; }
const esquema='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const rels='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const cabecera='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const estilos = `${cabecera}<styleSheet xmlns="${esquema}"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.###############"/></numFmts>
<fonts count="4"><font><sz val="12"/><name val="Calibri"/><color rgb="FF183746"/></font><font><b/><sz val="12"/><name val="Calibri"/><color rgb="FF183746"/></font><font><b/><sz val="18"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font><font><sz val="10"/><name val="Calibri"/><color rgb="FF5D717A"/></font></fonts>
<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF112D40"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F4F1"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0F3F5"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF5E0"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD8E3E7"/></left><right style="thin"><color rgb="FFD8E3E7"/></right><top style="thin"><color rgb="FFD8E3E7"/></top><bottom style="thin"><color rgb="FFD8E3E7"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="12">${[[0,0,0,0],[0,2,2,0],[0,1,3,0],[0,1,4,1],[4,0,0,1],[0,0,5,0],[4,1,3,1],[0,3,0,0],[0,0,0,1],[0,0,0,1],[0,1,0,0],[164,0,0,1]].map(([n,f,l,b])=>`<xf numFmtId="${n}" fontId="${f}" fillId="${l}" borderId="${b}" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`).join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export function crearXlsx(hojas) {
  const archivos=[],tipos=[],hojasLibro=[],relaciones=[],areasImpresion=[];
  hojas.forEach((hoja,indice)=>{
    const numero=indice+1,nombre=hoja.nombre.slice(0,31),ancho=hoja.anchos.length;
    hojasLibro.push(`<sheet name="${xml(nombre)}" sheetId="${numero}" r:id="rId${numero}"/>`);
    relaciones.push(`<Relationship Id="rId${numero}" Type="${rels}/worksheet" Target="worksheets/sheet${numero}.xml"/>`);
    tipos.push(`<Override PartName="/xl/worksheets/sheet${numero}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    const filas=hoja.filas.map((fila,r)=>{
      const celdas=fila.map((valor,c)=>{
        if(valor===null||valor===undefined)return '';
        const celda=typeof valor==='object'?valor:{v:valor};
        const ref=`${columnaExcel(c)}${r+1}`,estilo=celda.s??(typeof celda.v==='number'?Number.isInteger(celda.v)?9:4:8);
        if(celda.f){const tipo=typeof celda.v==='number'?'':' t="str"';return `<c r="${ref}" s="${estilo}"${tipo}><f>${xml(celda.f)}</f><v>${xml(celda.v)}</v></c>`;}
        if(typeof celda.v==='number'&&Number.isFinite(celda.v))return `<c r="${ref}" s="${estilo}"><v>${celda.v}</v></c>`;
        return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${xml(celda.v)}</t></is></c>`;
      }).join('');
      return `<row r="${r+1}" ht="${hoja.alturas?.[r]??26}" customHeight="1">${celdas}</row>`;
    }).join('');
    const combinadas=(hoja.combinar||[]).map(r=>`<mergeCell ref="${r}"/>`).join('');
    let dibujo='';
    const imagenes=[...(hoja.imagen?[hoja.imagen]:[]),...(hoja.imagenes||[])].filter(i=>i.bytes?.length);
    if(imagenes.length){
      dibujo='<drawing r:id="rIdImagen"/>';
      tipos.push(`<Override PartName="/xl/drawings/drawing${numero}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
      archivos.push([`xl/worksheets/_rels/sheet${numero}.xml.rels`,`${cabecera}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImagen" Type="${rels}/drawing" Target="../drawings/drawing${numero}.xml"/></Relationships>`]);
      const relImagenes=[],anclas=[];
      imagenes.forEach((imagen,k)=>{
        const nombreImagen=`imagen${numero}_${k+1}.png`,id=`rIdPng${k+1}`,fila=imagen.fila??hoja.filas.length+1;
        const cx=Math.round((imagen.ancho??576)*9525),cy=Math.round((imagen.alto??288)*9525),offset=Math.round((imagen.desplazamientoX??0)*9525);
        archivos.push([`xl/media/${nombreImagen}`,imagen.bytes]);
        relImagenes.push(`<Relationship Id="${id}" Type="${rels}/image" Target="../media/${nombreImagen}"/>`);
        anclas.push(`<xdr:oneCellAnchor><xdr:from><xdr:col>${imagen.columna??0}</xdr:col><xdr:colOff>${offset}</xdr:colOff><xdr:row>${fila}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${k+1}" name="${xml(imagen.nombre||'Croquis de la muestra')}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="${rels}" r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`);
      });
      archivos.push([`xl/drawings/_rels/drawing${numero}.xml.rels`,`${cabecera}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relImagenes.join('')}</Relationships>`]);
      archivos.push([`xl/drawings/drawing${numero}.xml`,`${cabecera}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anclas.join('')}</xdr:wsDr>`]);
    }
    const filasImpresion=Math.max(hoja.filas.length,...imagenes.map(i=>i.ultimaFila??(i.fila??0)+12));
    const nombreFormula=`'${nombre.replace(/'/g,"''")}'`;
    areasImpresion.push(`<definedName name="_xlnm.Print_Area" localSheetId="${indice}">${xml(`${nombreFormula}!$A$1:$${columnaExcel(ancho-1)}$${filasImpresion}`)}</definedName>`);
    areasImpresion.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${indice}">${xml(`${nombreFormula}!$1:$8`)}</definedName>`);
    const titulos=hoja.repetirFilas?`<pane ySplit="${hoja.repetirFilas}" topLeftCell="A${hoja.repetirFilas+1}" activePane="bottomLeft" state="frozen"/>`:'';
    archivos.push([`xl/worksheets/sheet${numero}.xml`,`${cabecera}<worksheet xmlns="${esquema}" xmlns:r="${rels}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${columnaExcel(ancho-1)}${filasImpresion}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0">${titulos}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="26"/><cols>${hoja.anchos.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${filas}</sheetData>${combinadas?`<mergeCells count="${hoja.combinar.length}">${combinadas}</mergeCells>`:''}<printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="${hoja.orientacion||'portrait'}" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;CMOPT URCI · &amp;P / &amp;N</oddFooter></headerFooter>${dibujo}</worksheet>`]);
  });
  relaciones.push(`<Relationship Id="rIdEstilos" Type="${rels}/styles" Target="styles.xml"/>`);
  archivos.push(['[Content_Types].xml',`${cabecera}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${tipos.join('')}</Types>`]);
  archivos.push(['_rels/.rels',`${cabecera}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLibro" Type="${rels}/officeDocument" Target="xl/workbook.xml"/></Relationships>`]);
  archivos.push(['xl/workbook.xml',`${cabecera}<workbook xmlns="${esquema}" xmlns:r="${rels}"><bookViews><workbookView/></bookViews><sheets>${hojasLibro.join('')}</sheets><definedNames>${areasImpresion.join('')}</definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`]);
  archivos.push(['xl/_rels/workbook.xml.rels',`${cabecera}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relaciones.join('')}</Relationships>`]);
  archivos.push(['xl/styles.xml',estilos]);
  return crearZip(archivos);
}
