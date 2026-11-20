/* Datos del módulo 02; no modifica ni migra el guardado de las inspecciones 01. */
let apertura;
export function abrirEficiencia(){
 if(apertura)return apertura;
 apertura=new Promise((resolve,reject)=>{
  const solicitud=indexedDB.open('mopt-urci-eficiencia-v1',1);
  solicitud.onupgradeneeded=()=>{if(!solicitud.result.objectStoreNames.contains('proyectos'))solicitud.result.createObjectStore('proyectos',{keyPath:'id'});};
  solicitud.onsuccess=()=>{const bd=solicitud.result;bd.onversionchange=()=>{bd.close();apertura=null;};resolve(bd);};
  solicitud.onerror=()=>reject(solicitud.error);
 }).catch(e=>{apertura=null;throw e;});return apertura;
}
export async function listarProyectos(){
 const bd=await abrirEficiencia();return new Promise((resolve,reject)=>{
  const tx=bd.transaction('proyectos','readonly'),r=tx.objectStore('proyectos').getAll();
  tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });
}
export async function guardarProyecto(proyecto){
 const bd=await abrirEficiencia();return new Promise((resolve,reject)=>{
  const tx=bd.transaction('proyectos','readwrite'),tabla=tx.objectStore('proyectos'),consulta=tabla.get(proyecto.id);let fallo;
  consulta.onsuccess=()=>{
   if(consulta.result?.eliminadoEn){fallo=Object.assign(new Error('Este proyecto está en la Papelera. Restauralo antes de editar.'),{codigo:'PROYECTO_ELIMINADO'});tx.abort();return;}
   tabla.put(structuredClone(proyecto));
  };
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(fallo||tx.error);tx.onabort=()=>reject(fallo||tx.error);
 });
}
export async function papeleraProyecto(id,eliminar=true){
 const bd=await abrirEficiencia();return new Promise((resolve,reject)=>{
  const tx=bd.transaction('proyectos','readwrite'),tabla=tx.objectStore('proyectos'),r=tabla.get(id);let fallo,actual;
  r.onsuccess=()=>{
   if(!r.result){fallo=new Error('No se encontró el proyecto.');tx.abort();return;}
   actual={...r.result,actualizadoEn:new Date().toISOString()};
   if(eliminar)actual.eliminadoEn=actual.actualizadoEn;else delete actual.eliminadoEn;
   tabla.put(actual);
  };
  tx.oncomplete=()=>resolve(actual);tx.onerror=()=>reject(fallo||tx.error);tx.onabort=()=>reject(fallo||tx.error);
 });
}
