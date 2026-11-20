/* Explicación y guías sobre las figuras originales. La lectura numérica sigue
 * perteneciendo a motor-urci.js; esta vista no redondea ni cambia los datos. */
import { DETERIOROS, NIVELES_HOJA, totalNivel, deduccionVisible, DEDUCCION_POLVO } from './frente.js';
import { numeroDecimal, puntoEnGrafica } from './motor-urci.js';
import { TRAZADOS } from './motor-curvas.js';
import { CURVAS } from './curvas-datos.js';
import { ESCALA_TRANSITABILIDAD } from './seguridad.js';
import { guiaSvg, COLORES_LECTURA, COLOR_GUIA_URCI } from './guias-lectura.js';

const e = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const n = v => Number.isFinite(v) ? v.toLocaleString('es-CR',{maximumFractionDigits:2}) : 'Pendiente';
const colores = COLORES_LECTURA;
export const cuentaEnQ = valor => Number.isFinite(valor) && valor > 5;

export function filasLectura(inspeccion,unidad,resultado) {
  return resultado.filas.map(fila => {
    const tipo=DETERIOROS.find(d=>d.codigo===fila.codigo),nivel=NIVELES_HOJA.find(s=>s.id===fila.severidad);
    const d=inspeccion.deterioros[fila.codigo],cantidad=totalNivel(d?.niveles?.[fila.severidad]);
    const medida=numeroDecimal(cantidad),area=numeroDecimal(unidad.areaM2);
    let formula;
    if(fila.sinDeterioro)formula='Sin deterioro confirmado';
    else if(fila.codigo==='84')formula=fila.seleccionado?'Sin densidad: valor fijo por severidad':'No seleccionada';
    else if(fila.vacio)formula='Sin cantidad en esta severidad';
    else if(fila.densidad!==null&&medida!==null&&area>0)formula=`${n(medida)} ${tipo.unidad} ÷ ${n(area)} m² × 100 = ${n(fila.densidad)}`;
    else formula=fila.motivo || 'Completá la cantidad y el área';
    return {...fila,nombre:tipo.nombre,nivel:nivel.nombre,formula,cuenta:cuentaEnQ(fila.deduccion)};
  });
}

export function tablaCalificacion(valor=null) {
  return `<div class="tabla-contenedor"><table class="tabla escala-transitabilidad"><caption>Calificación de transitabilidad · Listas!F3:G9</caption><thead><tr><th>URCI</th><th>Calificación</th></tr></thead><tbody>${ESCALA_TRANSITABILIDAD.map(([limite,nombre],k)=>{
    const superior=k===0?100:ESCALA_TRANSITABILIDAD[k-1][0];
    const activa=Number.isFinite(valor)&&valor>=limite&&(k===0?valor<=superior:valor<superior);
    return `<tr${activa?' class="rango-actual" aria-current="true"':''}><td>${k===0?'85 a 100':`${limite} a menos de ${superior}`}</td><td>${nombre}${activa?' · Resultado actual':''}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

export function pintarMetodo(inspeccion,unidad,resultado) {
  const filas=filasLectura(inspeccion,unidad,resultado),completo=resultado.estado==='calculado';
  const sumandos=filas.filter(f=>Number.isFinite(f.deduccion)&&f.deduccion>0);
  return `<div class="metodo-pasos"><p><strong>1. Densidad.</strong> Cantidad del deterioro en una severidad ÷ área de muestra × 100. Usá metros para 81, 82 y 87; m² para 83 y 86; unidades para 85. La cifra se consulta en la gráfica métrica de ese deterioro.</p><p><strong>2. Valor deducible.</strong> Se sube desde la densidad hasta la curva Baja (L), Media (M) o Alta (H), y se lee el valor del eje izquierdo. El polvo (84) no usa densidad: Baja = 2, Media = 4 y Alta = 15.</p><p><strong>3. VDT y q.</strong> Se suman todos los valores deducibles. Para q se cuenta cada valor individual <strong>mayor que 5</strong>, de cualquier deterioro y severidad. Un valor igual a 5 no cuenta. El polvo bajo y medio se suman al VDT; solo el polvo alto cuenta en q.</p><p><strong>4. URCI.</strong> El VDT se ubica en el eje inferior de la figura C-8; se toma la curva q correspondiente y se lee el URCI en el eje izquierdo.</p></div>
    <div class="calculo-totales"><p><strong>15. Valor deducible total:</strong> ${completo?`${sumandos.map(f=>n(f.deduccion)).join(' + ')||'0'} = <b>${n(resultado.vdt)}</b>`:n(resultado.vdt)}</p><p><strong>16. Valor q:</strong> ${n(resultado.q)}${resultado.q!==null?' valores deducibles mayores que 5':''}</p><p><strong>17. URCI aproximado:</strong> ${n(resultado.urci)} · <strong>18. Calificación:</strong> ${completo?ESCALA_TRANSITABILIDAD.find(([limite])=>resultado.urci>=limite)[1]:'Pendiente'}</p></div>
    ${resultado.motivos.length?`<p class="aviso">${e(resultado.motivos.join(' '))}</p>`:''}
    <p class="ayuda">Las cifras mostradas se redondean para leerlas. La suma y el conteo usan los valores sin redondear.</p>
    <div class="tabla-contenedor"><table class="tabla lectura-deducciones"><caption>De la medición al valor deducible</caption><thead><tr><th>Deterioro</th><th>Severidad</th><th>Cálculo de densidad</th><th>Valor deducible</th><th>Cuenta en q</th></tr></thead><tbody>${filas.map(f=>`<tr><td>${f.codigo} · ${e(f.nombre)}</td><td>${f.nivel}</td><td>${e(f.formula)}</td><td>${Number.isFinite(deduccionVisible(f))?n(f.deduccion):''}</td><td>${Number.isFinite(deduccionVisible(f))?f.cuenta?'Sí, mayor que 5':'No':f.deduccion===null?'Pendiente':''}</td></tr>`).join('')}</tbody></table></div>
    <details class="complemento"><summary>Ver tabla de calificación de transitabilidad (0 a 100)</summary><div class="complemento-cuerpo">${tablaCalificacion(resultado.urci)}<p class="ayuda">Fuente: 01 RVNL - Indicador de Eficacia - VF.xlsx, hoja Listas. La misma escala se aplica a la muestra y al promedio de sección.</p></div></details>
    <p class="ayuda">Método: TM 5-626, apartado 3-4 y apéndice C. Lectura aproximada de las figuras originales. <a href="https://www.wbdg.org/FFC/ARMYCOE/COETM/tm_5_626.pdf" target="_blank" rel="noopener">Consultar el manual</a>.</p>`;
}

/** Guías hasta la curva y desde ella al eje izquierdo; no extrapola. */
export function graficaLectura(codigo,resultado) {
  if(codigo==='84')return `<div class="polvo-explicacion"><h3>84 · Polvo</h3><p>El polvo se evalúa por severidad, sin cálculo de densidad ni curva.</p><div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Severidad</th><th>Valor deducible</th><th>Cuenta en q</th></tr></thead><tbody>${NIVELES_HOJA.map(nivel=>{
    const seleccionada=resultado.filas.some(f=>f.codigo==='84'&&f.severidad===nivel.id&&f.seleccionado&&!f.sinDeterioro);
    return `<tr${seleccionada?' class="polvo-elegido" aria-current="true"':''}><td><span class="circulo-polvo${seleccionada?' marcado':''}" aria-label="${seleccionada?'Seleccionada':'No seleccionada'}"></span>${nivel.nombre} (${nivel.letra})</td><td>${DEDUCCION_POLVO[nivel.id]}</td><td>${nivel.id==='A'?'Sí':'No'}</td></tr>`;
  }).join('')}</tbody></table></div><p class="ayuda">El círculo relleno señala la severidad elegida. Fuente: TM 5-626, figura C-4.</p></div>`;
  if(!Object.hasOwn(CURVAS,codigo))return '';
  const c=CURVAS[codigo],urci=codigo==='urci';let marcas='',lecturas=[],curva='';
  const guia=(x,y,color,titulo)=>{
    const p=puntoEnGrafica(codigo,x,y),pie=puntoEnGrafica(codigo,x,urci?100:0),izq=puntoEnGrafica(codigo,0,y);
    return `<g data-guia="${e(titulo)}"><title>${e(titulo)}</title>${guiaSvg(pie,p,izq,color,c.ancho/450)}</g>`;
  };
  if(urci&&resultado.estado==='calculado'){
    const q=Math.max(1,resultado.q),puntos=TRAZADOS.urci[String(q)];
    if(puntos)curva=`<path d="${puntos.map(([x,y],k)=>{const p=puntoEnGrafica(codigo,x,y);return `${k?'L':'M'} ${p.x} ${p.y}`;}).join(' ')}" stroke="#087b83" stroke-width="3" opacity=".6" fill="none"/>`;
    const t=`VDT ${n(resultado.vdt)} · q ${resultado.q} · URCI ≈ ${n(resultado.urciExacto)}`;
    marcas=guia(resultado.vdt,resultado.urciExacto,COLOR_GUIA_URCI,t);lecturas=[t];
  }else if(!urci){
    for(const f of resultado.filas.filter(f=>f.codigo===codigo&&Number.isFinite(f.densidad)&&Number.isFinite(f.deduccion)&&f.densidad>=0&&f.densidad<=c.maxX)){
      const t=`${NIVELES_HOJA.find(s=>s.id===f.severidad).nombre}: densidad ${n(f.densidad)} · VD ≈ ${n(f.deduccion)}`;
      marcas+=guia(f.densidad,f.deduccion,colores[f.severidad],t);lecturas.push(t);
    }
  }
  const titulo=urci?'URCI según VDT y q':`${codigo} · ${DETERIOROS.find(d=>d.codigo===codigo).nombre}`;
  return `<p class="ayuda">${urci?'La guía parte del VDT en el eje inferior, cruza la curva q y llega al URCI del eje izquierdo.':'Cada guía parte de la densidad, sube hasta su curva de severidad y llega al valor deducible del eje izquierdo.'}</p><div class="grafica-lectura"><svg viewBox="0 0 ${c.ancho} ${c.alto}" role="img" aria-label="${e(titulo)} con lecturas de esta muestra"><title>${e(titulo)}</title><image href="${c.archivo}" width="${c.ancho}" height="${c.alto}"/>${curva}${marcas}</svg></div><ul class="lecturas-grafica">${lecturas.length?lecturas.map(t=>`<li>${e(t)}</li>`).join(''):'<li>Las guías aparecen con mediciones válidas y área de muestra. La guía URCI requiere completar la evaluación.</li>'}</ul><p class="ayuda">Figura ${c.figura} · TM 5-626 · sistema ${e(c.sistema)}. Flechas de lectura rojas, sin contorno. Baja = L, Media = M, Alta = H.</p>`;
}
