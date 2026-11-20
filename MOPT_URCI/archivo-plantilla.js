/* Lee el paquete original y cambia únicamente las celdas autorizadas.
 * Los estilos, dibujos, combinaciones, textos fijos y demás partes se copian.
 */
import { crearZip } from './xlsx.js';
const texto=new TextDecoder(),utf8=new TextEncoder();
export const xmlTexto=v=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export async function abrirPaquete(bytes,{inflar}={}){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let fin=bytes.length-22;
  while(fin>=Math.max(0,bytes.length-65557)&&v.getUint32(fin,true)!==0x06054b50)fin--;
  if(fin<0||v.getUint32(fin,true)!==0x06054b50)throw new Error('La plantilla no es un archivo ZIP válido.');
  const total=v.getUint16(fin+10,true),archivos=new Map();let pos=v.getUint32(fin+16,true);
  for(let n=0;n<total;n++){
    if(v.getUint32(pos,true)!==0x02014b50)throw new Error('Directorio de la plantilla inválido.');
    const metodo=v.getUint16(pos+10,true),largo=v.getUint32(pos+20,true),tamano=v.getUint32(pos+24,true),ln=v.getUint16(pos+28,true),le=v.getUint16(pos+30,true),lc=v.getUint16(pos+32,true),local=v.getUint32(pos+42,true);
    const nombre=texto.decode(bytes.subarray(pos+46,pos+46+ln));
    if(nombre.startsWith('/')||nombre.split('/').includes('..')||archivos.has(nombre))throw new Error('Ruta de plantilla inválida.');
    if(v.getUint32(local,true)!==0x04034b50)throw new Error('Entrada ZIP inválida.');
    const inicio=local+30+v.getUint16(local+26,true)+v.getUint16(local+28,true),comprimido=bytes.subarray(inicio,inicio+largo);
    let datos;
    if(metodo===0)datos=comprimido;
    else if(metodo===8)datos=inflar?await inflar(comprimido):new Uint8Array(await new Response(new Blob([comprimido]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else throw new Error('Compresión de plantilla no admitida.');
    if(datos.length!==tamano)throw new Error('La plantilla está incompleta.');
    archivos.set(nombre,datos);pos+=46+ln+le+lc;
  }
  return archivos;
}
export function rellenarXml(xml,valores){
  const faltantes=new Set(Object.keys(valores));
  const salida=xml.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,(original,atributos)=>{
    const ref=/\br="([^"]+)"/.exec(atributos)?.[1];
    if(!Object.hasOwn(valores,ref))return original;
    faltantes.delete(ref);const valor=valores[ref],attrs=atributos.replace(/\s+t="[^"]*"/g,'');
    if(valor===null||valor===undefined||valor==='')return `<c${attrs}/>`;
    if(typeof valor==='number'&&Number.isFinite(valor))return `<c${attrs}><v>${valor}</v></c>`;
    return `<c${attrs} t="inlineStr"><is><t xml:space="preserve">${xmlTexto(valor)}</t></is></c>`;
  });
  if(faltantes.size)throw new Error('El espacio no existe en la plantilla: '+[...faltantes].join(', '));
  return salida;
}
export function rellenarParte(paquete,nombre,valores){
  const original=paquete.get(nombre);if(!original)throw new Error('No se encontró la hoja oficial.');
  paquete.set(nombre,utf8.encode(rellenarXml(texto.decode(original),valores)));
}
export const guardarPaquete=paquete=>crearZip([...paquete]);
