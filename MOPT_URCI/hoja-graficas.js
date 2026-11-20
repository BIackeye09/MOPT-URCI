/* Hoja de valores deducibles: consume las lecturas del motor existente.
 * La geometría es la misma para el PDF vectorial y las figuras del Excel. */
import { DETERIOROS, NIVELES_HOJA, totalNivel } from './frente.js';
import { numeroDecimal, puntoEnGrafica } from './motor-urci.js';
import { CURVAS } from './curvas-datos.js';
import { TRAZADOS } from './motor-curvas.js';
import { COLORES_LECTURA } from './guias-lectura.js';

export { COLORES_LECTURA } from './guias-lectura.js';
function sumar(valores) {
  let suma=0,error=0;
  for(const valor of valores){const ajustado=valor-error,nueva=suma+ajustado;error=(nueva-suma)-ajustado;suma=nueva;}
  return suma;
}
export function geometriaLectura(codigo,filas) {
  if(!Object.hasOwn(CURVAS,codigo)||codigo==='urci')return null;
  const c=CURVAS[codigo],guias=[];
  for(const f of filas){
    if(!Number.isFinite(f.densidad)||!Number.isFinite(f.deduccion)||f.densidad<0||f.densidad>c.maxX||f.deduccion<0||f.deduccion>c.maxY)continue;
    const nivel=NIVELES_HOJA.find(n=>n.id===f.severidad);
    if(!nivel)continue;
    const punto=puntoEnGrafica(codigo,f.densidad,f.deduccion),pie=puntoEnGrafica(codigo,f.densidad,0),izquierda=puntoEnGrafica(codigo,0,f.deduccion);
    const dx=punto.x-izquierda.x,dy=punto.y-izquierda.y,largo=Math.hypot(dx,dy)||1,ux=dx/largo,uy=dy/largo;
    const flecha=[{x:izquierda.x+14*ux-6*uy,y:izquierda.y+14*uy+6*ux},izquierda,{x:izquierda.x+14*ux+6*uy,y:izquierda.y+14*uy-6*ux}];
    guias.push({severidad:f.severidad,letra:nivel.letra,color:COLORES_LECTURA[f.severidad],densidad:f.densidad,deduccion:f.deduccion,punto,pie,izquierda,flecha,
      curva:(TRAZADOS[codigo]?.[f.severidad]||[]).map(([x,y])=>puntoEnGrafica(codigo,x,y))});
  }
  return {...c,codigo,guias};
}
export function crearHojaGraficas(inspeccion,unidad,resultado) {
  const tipos=DETERIOROS.map(tipo=>{
    const registro=inspeccion.deterioros[tipo.codigo];
    const filas=resultado.filas.filter(f=>f.codigo===tipo.codigo).map(f=>{
      const n=NIVELES_HOJA.find(n=>n.id===f.severidad),cantidad=registro?.estado==='con_deterioro'&&tipo.codigo!=='84'?numeroDecimal(totalNivel(registro?.niveles?.[f.severidad])):null;
      let estado=f.motivo||'';
      if(f.sinDeterioro)estado='Sin deterioro';
      else if(tipo.codigo==='84')estado=f.seleccionado?'Valor fijo por severidad':'No seleccionada';
      else if(f.vacio)estado='Sin cantidad en esta severidad';
      else if(f.deduccion===null&&!estado)estado='Completá el área y la evaluación';
      return {...f,letra:n.letra,nombre:n.nombre,color:COLORES_LECTURA[n.id],cantidad,unidad:tipo.unidad,estado};
    });
    const subtotal=registro&&registro.estado!=='pendiente'&&filas.length===3&&filas.every(f=>Number.isFinite(f.deduccion))?sumar(filas.map(f=>f.deduccion)):null;
    return {...tipo,estado:registro?.estado||'pendiente',filas,subtotal,grafica:geometriaLectura(tipo.codigo,filas)};
  });
  return {tipos,total:resultado.vdt,totalDisponible:Number.isFinite(resultado.vdt),
    sumandos:tipos.flatMap(t=>t.filas.filter(f=>Number.isFinite(f.deduccion)&&f.deduccion>0).map(f=>({codigo:t.codigo,letra:f.letra,valor:f.deduccion}))),
    motivos:[...resultado.motivos],aproximado:true};
}

