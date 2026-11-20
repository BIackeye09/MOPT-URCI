import { numeroDecimal } from './motor-urci.js';
import { encabezadoFicha, resultadosFicha } from './modelo.js';
import { DETERIOROS, NIVELES_HOJA, totalNivel, polvoSeleccionado, deduccionVisible } from './frente.js';
import { ESCALA_TRANSITABILIDAD, esProporcional, criteriosSeguridad } from './seguridad.js';
import { crearHojaGraficas } from './hoja-graficas.js';
import { exportarFormulariosExcel, exportarPdfOficial } from './plantillas-oficiales.js';

export const numeroLegible = valor => typeof valor === 'number' && Number.isFinite(valor)
  ? valor.toLocaleString('es-CR',{maximumFractionDigits:2}) : valor === null || valor === undefined || valor === '' ? 'Pendiente' : String(valor);
export const fechaLegible = valor => /^\d{4}-\d{2}-\d{2}$/.test(valor || '') ? valor.split('-').reverse().join('/') : valor || '';
const finito = valor => Number.isFinite(valor) ? valor : '';
const resultadoTexto = (valor,calificacion) => valor === null ? 'Pendiente' : `${numeroLegible(valor)} · ${calificacion}`;

function tablasResumen(grupo) {
  const tr=[],sv=[];
  for(const ficha of grupo.fichas.filter(f=>f.u.seleccion==='seleccionada'&&!f.u.eliminadaEn)) {
    const h=encabezadoFicha(ficha),r=resultadosFicha(ficha);
    const comun=[h.ruta,h.seccion,h.unidad,h.inicio,h.fin];
    tr.push([...comun,finito(r.urci.vdt),finito(r.urci.q),finito(r.urci.urci),r.calificacionTR || 'Pendiente']);
    sv.push([...comun,finito(r.seguridad.margenes),finito(r.seguridad.senalamiento),finito(r.seguridad.indice),r.seguridad.calificacion || 'Pendiente']);
  }
  return [
    {titulo:'Nivel de transitabilidad de la sección',columnas:['Ruta','Sección','Unidad','EST. INICIO','EST. FINAL','VDT','q','URCI','Calificación'],filas:tr,pesos:[10,11,11,13,13,9,5,9,16]},
    {titulo:'Nivel de seguridad vial de la sección',columnas:['Ruta','Sección','Unidad','EST. INICIO','EST. FINAL','Márgenes','Señales','ISV','Calificación'],filas:sv,pesos:[10,11,11,13,13,10,9,9,16]},
    {titulo:'Resultados de la sección',columnas:['Indicador','Puntuación','Calificación'],filas:[
      ['Transitabilidad (URCI)',finito(grupo.tr),grupo.calificacionTR || 'Pendiente'],
      ['Seguridad vial',finito(grupo.sv),grupo.calificacionSV || 'Pendiente'],
      ['Eficacia',finito(grupo.eficacia),grupo.calificacionEficacia || 'Pendiente']
    ],pesos:[50,20,30]}
  ];
}
export function documentoGrupo(grupo) {
  const fichas=grupo.fichas.filter(f=>f.u.seleccion==='seleccionada'&&!f.u.eliminadaEn),total=fichas.length;
  return {tipo:'resumen',titulo:'Resumen de la sección',encabezado:{...grupo.encabezado,unidad:'Todas las muestras',area:'',inspector:'',inicio:'',fin:''},
    unidadesResumen:fichas.map(f=>f.u.id),fichas,muestras:grupo.fichas.filter(f=>!f.u.eliminadaEn),
    resumen:tablasResumen(grupo),notaResumen:`${total} muestra(s). Transitabilidad: ${grupo.trCompletas}/${total} evaluadas. Seguridad vial: ${grupo.svCompletas}/${total} evaluadas. Los promedios se muestran al completar todas las muestras seleccionadas del formulario.`};
}
export function documentoFicha(ficha,grupo) {
  const h=encabezadoFicha(ficha),r=resultadosFicha(ficha),sv=ficha.i.seguridadVial || {};
  const cantidades=DETERIOROS.map(d => {
    const deterioro=ficha.i.deterioros[d.codigo];
    return [d.codigo,d.nombre,...NIVELES_HOJA.map(n => deterioro.estado !== 'con_deterioro' ? '' : d.codigo === '84'
      ? polvoSeleccionado(deterioro) === n.id ? 'X' : '' : totalNivel(deterioro.niveles[n.id])),
      deterioro.estado === 'sin_deterioro' ? 'Sin deterioro' : deterioro.estado === 'con_deterioro' ? 'Con deterioro':'Pendiente'];
  });
  const observados = [
    ['Erosión / desnivel (cm)',numeroDecimal(sv.erosion) ?? String(sv.erosion ?? ''),finito(r.seguridad.erosion)],
    ...[['estabilidad','Estabilidad y drenaje'],['vegetacion','Vegetación'],['senalamiento','Señalamiento vertical']].map(([clave,nombre]) => [nombre,(esProporcional(sv)&&clave==='estabilidad'&&String(sv.estabilidadCm??'').trim()?`${sv.estabilidadCm} cm${sv.estabilidadColapso?' · Colapso confirmado':''}. `:'')+(criteriosSeguridad(sv,clave).find(v=>v.id===sv[clave])?.texto || 'Pendiente'),finito(r.seguridad[clave])])
  ];
  return {...documentoGrupo(grupo),tipo:'ficha',titulo:'Inspección de camino no pavimentado',encabezado:h,ficha,graficas:crearHojaGraficas(ficha.i,ficha.u,r.urci),
    urci:[
      {titulo:'Cantidad y severidad del deterioro',columnas:['Código','Deterioro','Baja (L)','Media (M)','Alta (H)','Evaluación'],filas:cantidades,pesos:[9,32,10,10,10,18],cantidades:true},
      {titulo:'Cálculo URCI',columnas:['Código','Severidad','Densidad (%)','Valor deducible'],filas:r.urci.filas.map(f=>[f.codigo,NIVELES_HOJA.find(n=>n.id===f.severidad)?.nombre || f.severidad,finito(f.densidad),finito(deduccionVisible(f))]),pesos:[15,25,30,30]},
      {titulo:'Resultado de transitabilidad',columnas:['Indicador','Resultado'],filas:[['15. Valor deducible total',finito(r.urci.vdt)],['16. Valor q',finito(r.urci.q)],['17. URCI aproximado',finito(r.urci.urci)],['18. Calificación de transitabilidad',r.calificacionTR || 'Pendiente']],pesos:[65,35]}
    ],
    seguridad:[
      {titulo:'Evaluación de seguridad vial',columnas:['Aspecto','Medición / observación','Puntuación'],filas:observados,pesos:[24,60,16]},
      {titulo:'Resultado de seguridad vial',columnas:['Indicador','Resultado'],filas:[['Condición de márgenes',finito(r.seguridad.margenes)],['Señalamiento vertical',finito(r.seguridad.senalamiento)],['Índice de seguridad vial',finito(r.seguridad.indice)],['Calificación',r.seguridad.calificacion || 'Pendiente']],pesos:[65,35]}
    ],
    observacionesURCI:ficha.i.observacionesURCI || '',
    notaURCI:r.urci.estado === 'calculado' ? `URCI aproximado por lectura de las curvas métricas del TM 5-626. Lectura sin redondear: ${numeroLegible(r.urci.urciExacto)}. Las cantidades y deducciones conservan su precisión.` : `Borrador. ${r.urci.motivos.join(' ')}`,
    notaSV:r.seguridad.completo ? 'Seguridad vial = 60 % del menor puntaje de márgenes + 40 % del señalamiento vertical.'+(esProporcional(sv)?' Medidas con calificación proporcional; vegetación y señalamiento con nota del inspector.':'') : `Borrador. Falta evaluar: ${r.seguridad.faltantes.join(', ')}.`
  };
}

export const exportarExcel=exportarFormulariosExcel;
export const exportarPdf=exportarPdfOficial;

export function descargarArchivo(bytes,nombre,tipo) {
  const url=URL.createObjectURL(new Blob([bytes],{type:tipo}));
  const enlace=document.createElement('a');enlace.href=url;enlace.download=nombre;enlace.click();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export function capturarCroquis(trazos, mapa) {
  const prefijo = 'data:image/png;base64,';
  if (typeof mapa?.imagen === 'string' && mapa.imagen.startsWith(prefijo)) {
    try {
      const png = atob(mapa.imagen.slice(prefijo.length));
      if (png.startsWith('\x89PNG\r\n\x1a\n')) return Uint8Array.from(png, caracter => caracter.charCodeAt(0));
    } catch {
      // Un mapa anterior dañado permite volver al dibujo de la muestra.
    }
  }
  if(!trazos?.length)return null;
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=600;
  const ctx=canvas.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';
  for(const t of trazos){
    ctx.globalCompositeOperation=t.tipo==='borrador'?'destination-out':'source-over';ctx.strokeStyle='#17232d';ctx.fillStyle='#17232d';ctx.lineWidth=t.tipo==='borrador'?32:4;
    ctx.beginPath();t.puntos.forEach(([x,y],k)=>k?ctx.lineTo(x*canvas.width,y*canvas.height):ctx.moveTo(x*canvas.width,y*canvas.height));
    if(t.puntos.length===1){const [x,y]=t.puntos[0];ctx.arc(x*canvas.width,y*canvas.height,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();}else ctx.stroke();
  }
  ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  return Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]),c=>c.charCodeAt(0));
}
