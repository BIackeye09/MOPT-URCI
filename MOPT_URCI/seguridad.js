import { numeroDecimal } from './motor-urci.js';

// Criterios del archivo aportado 01 RVNL - Indicador de Eficacia - VF.xlsx,
// F_UM-01!AL13:AL31, AJ35:AJ47 y AQ11:AQ50. Ver verificacion/seguridad_fuente.json.
export const ESTABILIDAD = [
  { id:'muy_bueno', puntaje:100, nombre:'Muy bueno', texto:'Espaldón firme, sin blandura ni ahuellamiento. Cunetas limpias, al menos 95 % de capacidad hidráulica.' },
  { id:'bueno', puntaje:85, nombre:'Bueno', texto:'Roderas superficiales de hasta 5 cm. Drenaje mayormente funcional (al menos 85 %).' },
  { id:'regular', puntaje:70, nombre:'Regular', texto:'Blandura ocasional, roderas de 5 a 10 cm. Drenaje parcialmente obstruido (60 a 85 %).' },
  { id:'malo', puntaje:50, nombre:'Malo', texto:'Hombro blando, roderas de 10 a 20 cm. Drenaje deficiente (40 a 60 %).' },
  { id:'muy_malo', puntaje:25, nombre:'Muy malo', texto:'Intransitable, roderas de más de 20 cm o colapso. Drenaje bloqueado o colapsado (menos de 40 %).' }
];
export const VEGETACION = [
  { id:'muy_bueno', puntaje:100, nombre:'Muy bueno', texto:'Vegetación mínima y controlada.' },
  { id:'bueno', puntaje:85, nombre:'Bueno', texto:'Vegetación puntual; no afecta el drenaje ni la visibilidad.' },
  { id:'regular', puntaje:70, nombre:'Regular', texto:'Requiere control frecuente, hasta 30 % de cobertura.' },
  { id:'malo', puntaje:50, nombre:'Malo', texto:'Vegetación densa; reduce la visibilidad y la funcionalidad.' },
  { id:'muy_malo', puntaje:25, nombre:'Muy malo', texto:'Vegetación fuera de control; reduce peligrosamente la visibilidad o bloquea totalmente el drenaje.' }
];
export const SENALAMIENTO = [
  { id:'muy_bueno', puntaje:100, nombre:'Muy bueno', texto:'Señales adecuadas en número y ubicación; brindan toda la información necesaria para conducir con seguridad.' },
  { id:'bueno', puntaje:75, nombre:'Bueno', texto:'Señalamiento bastante completo; faltan algunas señales de guía para quienes no conocen la ruta.' },
  { id:'regular', puntaje:50, nombre:'Regular', texto:'Cantidad y ubicación regulares; faltan señales de precaución y de guía.' },
  { id:'malo', puntaje:25, nombre:'Malo', texto:'Muy pocas señales; no brindan al usuario la información necesaria para llegar a su destino.' },
  { id:'muy_malo', puntaje:20, nombre:'Muy malo', texto:'No existen señales o son tan inadecuadas que no brindan información útil al conductor.' }
];
export const EROSION = [
  { id:'muy_bueno', nombre:'Muy bueno', texto:'Desnivel de 0 a 2 cm.' },
  { id:'bueno', nombre:'Bueno', texto:'Desnivel mayor que 2 y menor que 5 cm.' },
  { id:'regular', nombre:'Regular', texto:'Desnivel desde 5 y menor que 15 cm.' },
  { id:'malo', nombre:'Malo', texto:'Desnivel desde 15 y menor que 25 cm.' },
  { id:'muy_malo', nombre:'Muy malo', texto:'Desnivel de 25 cm o más.' }
];
export const CRITERIOS_SV = { erosion:EROSION, estabilidad:ESTABILIDAD, vegetacion:VEGETACION, senalamiento:SENALAMIENTO };

// Nueva regla solicitada en noviembre de 2026. No son las fórmulas discretas
// del Excel original: se conservan arriba para las inspecciones históricas.
// Regular en estabilidad: 5 cm -> 85; 10 cm -> 60, según el ejemplo acordado.
// Estabilidad >20 cm: 40 puntos en 20 cm y -2 puntos/cm, con piso de cero.
// Desnivel >=25 cm: 25 puntos y -2,5 puntos/cm hasta un mínimo de cero.
// Colapso confirmado en estabilidad conserva como máximo 25 puntos.
// Desnivel: condición automática por centímetros. Las notas del inspector
// de vegetación y señalamiento se validan contra la condición seleccionada.
export const METODO_SV = 'proporcional-v1';
export const RANGOS_NOTA_SV = {
  muy_bueno:{min:95,max:100},bueno:{min:85,max:94},regular:{min:60,max:84},
  malo:{min:26,max:59},muy_malo:{min:0,max:25}
};
export const RANGOS_SV = {
  erosion:{
    muy_bueno:{min:0,max:2,fijo:100,texto:'De 0 a 2 cm, incluidos ambos límites: 100 puntos.'},
    bueno:{min:2,max:5,minAbierto:true,maxAbierto:true,desde:100,hasta:70,texto:'Mayor que 2 y menor que 5 cm.'},
    regular:{min:5,max:15,maxAbierto:true,desde:70,hasta:50,texto:'Desde 5 y menor que 15 cm.'},
    malo:{min:15,max:25,maxAbierto:true,desde:50,hasta:25,texto:'Desde 15 y menor que 25 cm.'},
    muy_malo:{min:25,max:null,desde:25,hasta:0,porCm:2.5,texto:'Desde 25 cm: 25 puntos, menos 2,5 puntos por cm adicional. Desde 35 cm la nota es 0.'}
  },
  estabilidad:{
    muy_bueno:{min:0,max:2,fijo:100,texto:'De 0 a 2 cm, incluidos ambos límites: 100 puntos.'},
    bueno:{min:2,max:5,minAbierto:true,desde:100,hasta:85,texto:'Mayor que 2 y hasta 5 cm, incluido 5.'},
    regular:{min:5,max:10,desde:85,hasta:60,texto:'De 5 a 10 cm, incluidos ambos límites.'},
    malo:{min:10,max:20,desde:60,hasta:40,texto:'De 10 a 20 cm, incluidos ambos límites.'},
    muy_malo:{min:20,max:null,minAbierto:true,desde:40,hasta:0,porCm:2,texto:'Más de 20 cm: desde 40 puntos, restá 2 por cm. Desde 40 cm la nota es 0. Colapso confirmado: como máximo 25 puntos.'}
  }
};
export function seguridadNueva() {
  return {metodo:METODO_SV,erosionNivel:'',erosion:'',estabilidad:'',estabilidadCm:'',estabilidadColapso:false,vegetacion:'',vegetacionNota:'',senalamiento:'',senalamientoNota:''};
}
export const esProporcional = datos => datos?.metodo === METODO_SV;
export function criteriosSeguridad(datos,aspecto) {
  const opciones=CRITERIOS_SV[aspecto]||[];
  if(!esProporcional(datos))return opciones;
  if(['vegetacion','senalamiento'].includes(aspecto))return opciones.map(o=>({...o,texto:`${o.texto} Nota permitida: ${RANGOS_NOTA_SV[o.id].min} a ${RANGOS_NOTA_SV[o.id].max}.`}));
  if(aspecto!=='estabilidad')return opciones;
  return opciones.map(o=>o.id==='muy_bueno'?{...o,texto:'Roderas de 0 a 2 cm. Espaldón firme y cunetas limpias (al menos 95 % de capacidad hidráulica).'}:o.id==='bueno'?{...o,texto:'Roderas mayores que 2 y hasta 5 cm. Drenaje mayormente funcional (al menos 85 %).'}:o);
}
export function nivelErosion(valor) {
  const cm=numeroDecimal(valor);
  return cm===null?'':cm<=2?'muy_bueno':cm<5?'bueno':cm<15?'regular':cm<25?'malo':'muy_malo';
}
export function actualizarSeguridad(datos={}) {
  // Se conservan los datos observados; jamás se inventan las medidas ni las
  // dos notas manuales. El usuario activa expresamente esta actualización.
  return {...seguridadNueva(),...datos,metodo:METODO_SV,erosionNivel:datos.erosionNivel||nivelErosion(datos.erosion)};
}
export function rangoSeguridad(datos,aspecto) {
  if(['vegetacion','senalamiento'].includes(aspecto))return RANGOS_NOTA_SV[datos[aspecto]]||null;
  return RANGOS_SV[aspecto]?.[aspecto==='erosion'?nivelErosion(datos.erosion):datos[aspecto]] || null;
}
function evaluarMedida(datos,aspecto) {
  const campo=aspecto==='erosion'?'erosion':'estabilidadCm',rango=rangoSeguridad(datos,aspecto);
  const medida=numeroDecimal(datos[campo]),vacio=!String(datos[campo]??'').trim();
  if(aspecto==='erosion'&&!rango){
    const ayuda='Ingresá los centímetros observados. La condición y la nota se calculan automáticamente. Se aceptan decimales con coma o punto.';
    return {puntaje:null,error:vacio?'':'Ingresá una medida válida en centímetros, mayor o igual que cero.',ayuda};
  }
  if(!rango)return {puntaje:null,error:'',ayuda:'Elegí primero la condición observada.'};
  let ayuda=rango.texto;
  if(rango.fijo===undefined&&!rango.porCm)ayuda+=` Nota proporcional: de ${rango.desde} a ${rango.hasta} puntos.`;
  ayuda+=' Se aceptan decimales con coma o punto.';
  if(vacio)return {puntaje:null,error:'',ayuda};
  if(medida===null)return {puntaje:null,error:'Ingresá una medida válida en centímetros, mayor o igual que cero.',ayuda};
  const colapso=aspecto==='estabilidad'&&datos.estabilidad==='muy_malo'&&datos.estabilidadColapso===true;
  const dentro=colapso||((rango.minAbierto?medida>rango.min:medida>=rango.min)&&(rango.max===null||(rango.maxAbierto?medida<rango.max:medida<=rango.max)));
  if(!dentro)return {puntaje:null,error:`Medida fuera del rango permitido. ${rango.texto}`,ayuda};
  const porProfundidad=rango.porCm?Math.max(rango.hasta,rango.desde-(medida-rango.min)*rango.porCm):null;
  const puntaje=colapso?Math.min(25,porProfundidad):porProfundidad??rango.fijo??rango.desde+(medida-rango.min)/(rango.max-rango.min)*(rango.hasta-rango.desde);
  return {puntaje,error:'',ayuda,medida,nivel:aspecto==='erosion'?nivelErosion(datos.erosion):datos[aspecto]};
}
function evaluarNota(datos,aspecto) {
  const opcion=CRITERIOS_SV[aspecto].find(o=>o.id===datos[aspecto]),bruto=datos[aspecto+'Nota'];
  const rango=rangoSeguridad(datos,aspecto);
  const ayuda=opcion?`Para ${opcion.nombre}, ingresá una calificación de ${rango.min} a ${rango.max} puntos, incluidos ambos límites. Se aceptan decimales con coma o punto.`:'Elegí primero la condición observada.';
  if(!opcion||!String(bruto??'').trim())return {puntaje:null,error:'',ayuda};
  const puntaje=numeroDecimal(bruto);
  if(puntaje===null||puntaje<rango.min||puntaje>rango.max)return {puntaje:null,error:`Para ${opcion.nombre}, la calificación debe estar entre ${rango.min} y ${rango.max}.`,ayuda};
  return {puntaje,error:'',ayuda};
}

// Listas!F3:G9 del indicador de eficacia aportado. Se comparte con la interfaz
// y las fórmulas de exportación para conservar los mismos límites y nombres.
export const ESCALA_TRANSITABILIDAD = [[85,'Excelente'],[70,'Muy bueno'],[55,'Bueno'],[40,'Regular'],[25,'Pobre'],[10,'Muy pobre'],[0,'Fallado']];

export function clasificarSeguridad(valor) {
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) return null;
  return valor >= 85 ? 'Muy bueno' : valor >= 70 ? 'Bueno' : valor >= 55 ? 'Regular' : valor >= 40 ? 'Malo' : 'Muy malo';
}
export function clasificarTransitabilidad(valor) {
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) return null;
  return ESCALA_TRANSITABILIDAD.find(([limite]) => valor >= limite)[1];
}
export function clasificarEficacia(valor) {
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) return null;
  return valor >= 80 ? 'Muy bueno' : valor >= 60 ? 'Bueno' : valor >= 40 ? 'Regular' : valor >= 20 ? 'Malo' : 'Muy malo';
}
export function calcularSeguridad(datos = {}) {
  datos ||= {};
  const cm = numeroDecimal(datos.erosion);
  const detalle=esProporcional(datos)?Object.fromEntries(['erosion','estabilidad','vegetacion','senalamiento'].map(a=>[a,['erosion','estabilidad'].includes(a)?evaluarMedida(datos,a):evaluarNota(datos,a)])):null;
  const desconocido=!!datos.metodo&&!esProporcional(datos);
  const erosion = desconocido?null:detalle?detalle.erosion.puntaje:cm === null ? null : cm <= 2 ? 100 : cm < 5 ? 85 : cm < 15 ? 70 : cm < 25 ? 50 : 25;
  const estabilidad = desconocido?null:detalle?detalle.estabilidad.puntaje:ESTABILIDAD.find(o => o.id === datos.estabilidad)?.puntaje ?? null;
  const vegetacion = desconocido?null:detalle?detalle.vegetacion.puntaje:VEGETACION.find(o => o.id === datos.vegetacion)?.puntaje ?? null;
  const senalamiento = desconocido?null:detalle?detalle.senalamiento.puntaje:SENALAMIENTO.find(o => o.id === datos.senalamiento)?.puntaje ?? null;
  const faltantes = [];
  if (erosion === null) faltantes.push('Desnivel entre corona y espaldón');
  if (estabilidad === null) faltantes.push('Estabilidad y drenaje');
  if (vegetacion === null) faltantes.push('Vegetación');
  if (senalamiento === null) faltantes.push('Señalamiento vertical');
  const margenes = [erosion, estabilidad, vegetacion].every(v => v !== null) ? Math.min(erosion, estabilidad, vegetacion) : null;
  const indice = faltantes.length ? null : 0.6 * margenes + 0.4 * senalamiento;
  return { completo:!faltantes.length, faltantes, erosion, estabilidad, vegetacion, senalamiento, margenes, indice, calificacion:clasificarSeguridad(indice),detalle };
}
export function calcularEficacia(transitabilidad, seguridad) {
  if (![transitabilidad, seguridad].every(v => Number.isFinite(v) && v >= 0 && v <= 100)) return null;
  return 0.6 * transitabilidad + 0.4 * seguridad;
}
