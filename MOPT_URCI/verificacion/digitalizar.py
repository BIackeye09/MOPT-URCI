"""Digitaliza los trazos del PDF; semillas visuales, no tablas del Excel.

Requiere numpy, scipy y Pillow. Ejecutar desde verificacion o la raíz de la app.
Las semillas solo delimitan un corredor de búsqueda sobre la imagen original.
La salida conserva tanto los puntos de la fuente como el resultado numérico.
"""
from pathlib import Path
import json
import numpy as np
from scipy import ndimage as ndi
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'verificacion'
ESQUINAS = {
 '81': [[75,35],[760,32],[78,711],[762,709]],
 '82': [[80,31],[775,30],[82,717],[778,715]],
 '83': [[108,35],[1313,31],[110,749],[1314,746]],
 '85': [[104,34],[676,36],[100,1169],[675,1170]],
 '86': [[112,35],[1218,38],[113,695],[1220,694]],
 '87': [[110,36],[1223,37],[110,695],[1224,695]],
 'urci': [[128,42],[1278,34],[132,606],[1280,603]],
}
AXES = {'81':(50,60),'82':(50,60),'83':(100,60),'85':(50,100),'86':(100,60),'87':(70,60),'urci':(200,100)}
ETIQUETAS = {
 '86':[(895,136,938,174),(895,268,938,305),(900,344,938,376)],
 '87':[(853,265,889,297),(853,405,889,438),(853,480,885,506)],
 'urci':[(865,86,891,114),(937,94,968,126),(1005,105,1037,140),
         (1057,112,1092,144),(1141,115,1175,148),(1192,146,1223,180)]
}
SEEDS = {
 '81': {'x':list(range(0,51,5)),
  'B':[0,4.5,8.5,11.3,13.7,16,18.5,20.8,22.4,24,25.5],
  'M':[0,5.5,9.5,13.2,17,20,23.5,26.3,29.5,31.5,33.3],
  'A':[0,7.5,13.8,19.3,24,28,32,35.5,38.6,41.5,43.5]},
 '82': {'x':list(range(0,51,5)),
  'B':[0,2,4.2,6.4,8.5,10.5,12.8,14.7,16.6,18.4,20],
  'M':[0,3.7,7.2,10.7,14,17,19.7,22.2,24.6,26.6,28.3],
  'A':[0,5.3,10.1,14.1,18.2,21.6,25,28,31.5,35,38.2]},
 '83': {'x':list(range(0,101,10)),
  'B':[0,7.5,12.8,17,21,24,26.6,28.5,30.5,32,33.3],
  'M':[0,10,16,21.5,26,29.6,33.4,36,38.6,41.2,43.2],
  'A':[0,13,20.5,28.5,35.4,40.2,44.6,49,52.6,56.6,60]},
 '85': {'x':[0,.5,1,1.5,2,3,4,5,7.5,10,15,20,25,30,35,40,45,50],
  'B':[0,1,2,3,4,5.5,7,8.5,11.5,14,19,24,28,31.5,34.5,37.3,40,42],
  'M':[0,1.5,3,4.8,6.5,9.5,12.5,15,20.2,25,32,38.5,42.5,47,51,54.3,57.2,60],
  'A':[0,5,10,14,18,25.5,30.5,34,38,42,48.5,54,59.5,64.5,69.3,73.8,78,82]},
 '86': {'x':[0,1,2,4,6,8,10,20,30,40,50,60,70,80,90,100],
  'B':[0,1.5,3.3,6.8,10.2,12.8,14.5,20.5,23.2,25,26.5,27.7,28.7,29.3,29.8,30.3],
  'M':[0,2,4.8,9.2,13.5,16.8,19.2,26,29.3,31.6,33.3,34.4,35.4,36.3,37.3,37.8],
  'A':[0,4,7.2,12.7,16.3,19.7,22,28.1,32.7,36.3,40,43.3,46.6,49.7,52.7,55.8]},
 '87': {'x':list(range(0,71,10)),
  'B':[0,5.3,9.7,13,16,17.8,19,20.3],
  'M':[0,8.3,13.5,17.7,21.5,24.2,26.6,29.2],
  'A':[0,12.3,21,27.1,32.4,37.3,42.1,46.6]},
}
# Coordenadas leídas visualmente: X=VDT, Y=URCI (cero arriba).
QSEEDS = {
 '2': [[14,90],[20,85.3],[40,70.1],[60,56.7],[80,43.5],[100,30],[120,18],[140,9.8],[160,3.2],[170,0]],
 '3': [[20,90],[40,77.7],[60,62.6],[80,51],[100,37.8],[120,27.7],[140,18],[160,8.6],[180,1.5],[183,0]],
 '4': [[25,90],[40,80.2],[60,67.9],[80,56.5],[100,42],[120,32.2],[140,22.2],[160,14.3],[180,6.8],[200,1]],
 '5': [[28,90],[40,83.3],[60,70.7],[80,60.1],[100,48.2],[120,38],[140,29.1],[160,20.6],[180,12.4],[200,6.1]],
 '6': [[31,90],[40,85.3],[60,73.8],[80,62],[100,51.1],[120,40.9],[140,31.5],[160,23.5],[180,15.7],[200,10.1]],
 '7': [[40,87],[50,81],[60,74.7],[80,64.1],[100,53.1],[120,43],[140,33.2],[160,25.3],[180,19.7],[200,17.4]],
}

def pixel(c, x, y):
 mx,my=AXES[c]; u=x/mx; v=y/my if c=='urci' else 1-y/my
 tl,tr,bl,br=np.array(ESQUINAS[c])
 p=(1-v)*((1-u)*tl+u*tr)+v*((1-u)*bl+u*br)
 return tuple(p)

def isotonic(values):
 # Regresión isotónica por bloques; elimina oscilación de píxel sin saltos.
 blocks=[]
 for i,val in enumerate(values):
  blocks.append([float(val),1,i,i])
  while len(blocks)>1 and blocks[-2][0]>blocks[-1][0]:
   b=blocks.pop();a=blocks.pop();n=a[1]+b[1]
   blocks.append([(a[0]*a[1]+b[0]*b[1])/n,n,a[2],b[3]])
 result=np.empty(len(values))
 for v,_,a,b in blocks:result[a:b+1]=v
 return result

def trace(c, label, xs, ys, others):
 im=np.array(Image.open(ROOT/'curvas'/f'tm5-626-{c}.png').convert('L'))
 h,w=im.shape
 black=im<140
 horizontal=ndi.binary_opening(black,structure=np.ones((1,100)))
 vertical=ndi.binary_opening(black,structure=np.ones((100,1)))
 grid=ndi.binary_dilation(horizontal|vertical,structure=np.ones((3,3)))
 clean=black & ~grid
 for x1,y1,x2,y2 in ETIQUETAS.get(c,[]):clean[y1:y2,x1:x2]=False
 # Una ventana de 7 columnas permite cruzar las interrupciones de cuadrícula.
 score=ndi.uniform_filter(clean.astype(float),size=(3,7))
 mx,my=AXES[c]
 width=ESQUINAS[c][3][0]-ESQUINAS[c][2][0]
 sample=np.linspace(xs[0],xs[-1],int((xs[-1]-xs[0])/mx*width/2)+1)
 found=[]; observed=[]
 for x in sample:
  seed=float(np.interp(x,xs,ys)); xp,yp=pixel(c,x,seed)
  # Corredor menor que la mitad de la distancia a cualquier otra curva.
  sep=min([abs(seed-float(np.interp(x,a,b))) for a,b in others]+[100])
  radius=min(2.0,max(.22,sep*.36))
  r=max(3,int(radius/my*(ESQUINAS[c][2][1]-ESQUINAS[c][0][1])))
  col=int(round(xp)); a=max(1,int(yp-r));b=min(h-2,int(yp+r))
  rows=np.arange(a,b+1); weights=score[rows,np.clip(col,0,w-1)]
  # Priorizar el trazo próximo a la semilla, sin imponer el valor de esta.
  weights=weights*np.exp(-.25*((rows-yp)/max(r,1))**2)
  if weights.max(initial=0)<.12:
   found.append(seed);observed.append(False);continue
  best=weights.max(); pick=rows[weights>=best*.82]
  row=float(np.mean(pick))
  # Inversión de la transformación bilineal para una abscisa conocida.
  u=x/mx; tl,tr,bl,br=np.array(ESQUINAS[c])
  top=(1-u)*tl[1]+u*tr[1];bottom=(1-u)*bl[1]+u*br[1]
  v=(row-top)/(bottom-top)
  value=v*my if c=='urci' else (1-v)*my
  found.append(value);observed.append(True)
 # El origen es un punto conocido; debe participar en la interpolación de
 # los huecos iniciales que produce el eje, para no crear saltos artificiales.
 if c!='urci':
  found[0]=0;observed[0]=True
 # Se interpolan huecos de cuadrícula/etiquetas desde los puntos observados.
 good=np.flatnonzero(observed)
 if len(good)>1:
  found=np.interp(np.arange(len(found)),good,np.array(found)[good])
 else:found=np.array(found)
 if c!='urci': found[0]=0
 elif label in ['2','3']: found[-1]=0
 found=ndi.median_filter(found,size=5,mode='nearest')
 found=isotonic(-found)*-1 if c=='urci' else isotonic(found)
 if c!='urci':found[0]=0
 found=np.clip(found,0,my)
 return [[round(float(x),5),round(float(y),5)] for x,y in zip(sample,found)],round(sum(observed)/len(observed),3)

def run():
 data={};coverage={}
 for c,seed in SEEDS.items():
  data[c]={};coverage[c]={}
  for s in ['B','M','A']:
   others=[(seed['x'],seed[k]) for k in ['B','M','A'] if k!=s]
   data[c][s],coverage[c][s]=trace(c,s,seed['x'],seed[s],others)
 data['urci']={'1':[[0,100],[100,0]]};coverage['urci']={}
 for q,points in QSEEDS.items():
  xs,ys=zip(*points)
  others=[tuple(zip(*p)) for k,p in QSEEDS.items() if k!=q]
  data['urci'][q],coverage['urci'][q]=trace('urci',q,xs,ys,others)
 for c in data:
  im=Image.open(ROOT/'curvas'/f'tm5-626-{c}.png').convert('RGB')
  draw=ImageDraw.Draw(im)
  colors=['#008c99','#2356dd','#d54918','#9b28a6','#199040','#ed9600','#963f38']
  for n,(s,points) in enumerate(data[c].items()):
   draw.line([pixel(c,x,y) for x,y in points],fill=colors[n%len(colors)],width=2)
  im.save(OUT/f'revision-{c}.png')
 payload={'fuente':'Department of the Army, TM 5-626, 16 January 1995, Appendix C',
  'metodo':'Trazado por corredor en raster, supresión de cuadrícula, interpolación de huecos y ajuste monótono. Coordenadas métricas.',
  'esquinas':ESQUINAS,'curvas':data,'cobertura_raster':coverage}
 (OUT/'digitalizacion.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2))
 (ROOT/'motor-curvas.js').write_text('/* Datos digitalizados del TM 5-626. Ver verificacion/digitalizacion.json. */\nexport const TRAZADOS = '+json.dumps(data,separators=(',',':'))+';\nexport const ESQUINAS = '+json.dumps(ESQUINAS,separators=(',',':'))+';\n')
 print(json.dumps({'puntos':{c:{s:len(p) for s,p in v.items()} for c,v in data.items()},'cobertura':coverage}))

if __name__=='__main__':run()
