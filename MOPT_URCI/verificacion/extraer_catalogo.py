"""Extrae el catálogo vial público de los documentos suministrados.

Uso: python3 extraer_catalogo.py DIRECTORIO_ENTRADAS
No modifica las fuentes. Libro1 se inspecciona solo para contar sus catálogos;
sus datos de personas no se incorporan a la aplicación ni a la salida.
"""
from pathlib import Path
from decimal import Decimal
from datetime import datetime,timedelta
import zipfile,xml.etree.ElementTree as E,json,re,hashlib,sys,collections

ROOT=Path(__file__).resolve().parents[1]
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
PROVINCIAS={'1':'San José','2':'Alajuela','3':'Cartago','4':'Heredia','5':'Guanacaste','6':'Puntarenas','7':'Limón'}

def hojas(path):
 with zipfile.ZipFile(path) as z:
  ss=[''.join(x.itertext()) for x in E.fromstring(z.read('xl/sharedStrings.xml'))] if 'xl/sharedStrings.xml' in z.namelist() else []
  rels={x.get('Id'):x.get('Target').lstrip('/') for x in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  wb=E.fromstring(z.read('xl/workbook.xml')); result={}
  for s in wb.find('s:sheets',NS):
   target=rels[s.get(REL)];target=target if target.startswith('xl/') else 'xl/'+target
   rows=[]
   for row in E.fromstring(z.read(target)).findall('.//s:row',NS):
    cells={}
    for c in row:
     v=c.find('s:v',NS);v=v.text if v is not None else ''.join(c.find('s:is',NS).itertext()) if c.find('s:is',NS) is not None else ''
     if c.get('t')=='s' and v:v=ss[int(v)]
     if v:cells[re.sub(r'\d+$','',c.get('r'))]=str(v).strip()
    if cells:rows.append({'fila':int(row.get('r')),'c':cells})
   result[s.get('name')]=rows
  props=wb.find('s:workbookPr',NS)
  return result,props is not None and props.get('date1904') in ['1','true']

def numero(texto):
 try:
  val=float(Decimal(str(texto).replace(',','.')))
  return val if abs(val)<1e12 else None
 except Exception:return None

def fecha(texto,base1904):
 s=str(texto or '').strip()
 if re.fullmatch(r'\d{5}(?:\.\d+)?',s):
  origin=datetime(1904,1,1) if base1904 else datetime(1899,12,30)
  return (origin+timedelta(days=float(s))).strftime('%Y-%m-%d')
 return s

def main(inputs):
 nacional=inputs/'Red Vial Nacional 2024.xlsx';rtf=inputs/'red nacional heredia.rtf';libro=inputs/'Libro1.xlsx'
 sheets,date1904=hojas(nacional)
 cantones={r['c']['B']:r['c']['C'].strip() for r in sheets['Longitud Por Provincia'] if re.fullmatch(r'[1-7]\d\d',r['c'].get('B','')) and r['c'].get('C')}
 superficies={r['c']['A']:r['c']['B'].strip() for r in sheets['Códigos 2'] if r['c'].get('A') and r['c'].get('B')}
 rtfbytes=rtf.read_bytes()
 # Los códigos son texto ASCII incluso cuando el RTF utiliza escapes para tildes.
 alias_codes=sorted(set(re.findall(r'4-\d{4}-00',rtfbytes.decode('cp1252'))))
 aliases={str(int(c.split('-')[0])*10000+int(c.split('-')[1])):c for c in alias_codes}
 out=[];omisiones=collections.Counter()
 maps={
  'RVN_0524':{'tipo':'RN','ruta':'G','seccion':'B','provincia':'D','canton':'E','distrito':'F','region':'C','longitud':'K','descripcion':'AX','superficie':'BE','superficieTexto':'BF','ancho':'BH','tpd':'BM','carriles':'BG','fechaInv':'AY','fechaRec':'AZ'},
  'Travesías':{'tipo':'CT','ruta':'E','seccion':'F','provincia':'C','canton':'D','region':'B','longitud':'G','descripcion':'AG','superficie':'AM','ancho':'AO','tpd':'AS','carriles':'AN','fechaInv':'AH','fechaRec':'AI'}
 }
 for hoja,m in maps.items():
  for r in sheets[hoja]:
   c=r['c'];ruta=c.get(m['ruta'],'');codigo=c.get(m['seccion'],'');desc=c.get(m['descripcion'],'')
   if not(re.fullmatch(r'\d+',ruta) and re.fullmatch(r'\d{5}',codigo) and desc):omisiones[hoja]+=1;continue
   prov=c.get(m['provincia'],'');canton=c.get(m['canton'],'');sup=c.get(m['superficie'],'')
   grupo='no_pavimentada' if sup in ['4','6'] else 'pavimentada' if sup in ['1','2','3','7','9','10'] else 'por_confirmar'
   sec={'id':f"{m['tipo']}:{int(ruta)}:{codigo}",'tipo':m['tipo'],'ruta':str(int(ruta)),'seccion':codigo,
        'provinciaCodigo':prov,'provincia':PROVINCIAS.get(prov,prov),'cantonCodigo':canton,
        'canton':cantones.get(prov+str(int(canton)).zfill(2) if canton.isdigit() else '',canton),
        'distritoCodigo':c.get(m.get('distrito',''),'') if m.get('distrito') else '',
        'regionCodigo':c.get(m['region'],''),'descripcion':desc,'longitudKm':numero(c.get(m['longitud'])),
        'superficieCodigo':sup,'superficieTexto':c.get(m.get('superficieTexto',''),'') or superficies.get(sup,'Por confirmar'),
        'grupoSuperficie':grupo,'anchoM':numero(c.get(m['ancho'])),'tpd':numero(c.get(m['tpd'])),
        'carriles':numero(c.get(m['carriles'])),'fechaInventario':fecha(c.get(m['fechaInv']),date1904),
        'fechaReconocimiento':fecha(c.get(m['fechaRec']),date1904),
        'fuente':{'archivo':nacional.name,'hoja':hoja,'fila':r['fila']},
        'codigoCaminoHeredia':aliases.get(codigo,'')}
   sec['anchoRevisar']=sec['anchoM'] is not None and (sec['anchoM']<2 or sec['anchoM']>40)
   out.append(sec)
 assert len({s['id'] for s in out})==len(out)
 assert len({s['seccion'] for s in out})==len(out),'Sección de control repetida entre hojas'
 aux,_=hojas(libro)
 counts={n:len([r for r in rs if r['fila']>1]) for n,rs in aux.items() if n!='Hoja5'}
 meta={'version':'catalogo-vial-2024-v0.7','anioBase':2024,
  'fuentes':[{'archivo':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [nacional,rtf]],
  'referenciaHeredia':{'archivo':rtf.name,'fechasVisibles':['06/03/2020','27/11/2020'],'codigos':len(aliases),'coincidentes':sum(bool(s['codigoCaminoHeredia']) for s in out)},
  'columnas':maps,'provincias':PROVINCIAS,
  'totales':{'seccionesRN':sum(s['tipo']=='RN' for s in out),'rutasRN':len({s['ruta'] for s in out if s['tipo']=='RN'}),'seccionesCT':sum(s['tipo']=='CT' for s in out),'rutasCT':len({s['ruta'] for s in out if s['tipo']=='CT'}),'heredia':sum(s['provinciaCodigo']=='4' for s in out)}}
 (ROOT/'catalogo-datos.js').write_text('/* Fuente: documentos aportados. Generado por verificacion/extraer_catalogo.py. */\nexport const CATALOGO_META = '+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+';\nexport const SECCIONES_CATALOGO = '+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
 report={'catalogo':meta,'libro1':{'archivo':libro.name,'conteos':counts,'contenidoPersonalIntegrado':False},'anchosParaRevisar':[{'id':s['id'],'valor':s['anchoM'],'fuente':s['fuente']} for s in out if s['anchoRevisar']],'filasSinRegistroDeSeccion':dict(omisiones)}
 (ROOT/'verificacion/catalogo_fuentes.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps({'totales':meta['totales'],'cruceHeredia':meta['referenciaHeredia'],'libro1Conteos':counts,'anchosParaRevisar':len(report['anchosParaRevisar'])},ensure_ascii=False))

if __name__=='__main__':main(Path(sys.argv[1]))
