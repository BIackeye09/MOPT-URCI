/*
 * MOPT URCI — Acceso a datos locales.
 * Todos los registros se almacenan en IndexedDB del navegador.
 * No existen conexiones a servidores ni sincronización automática.
 */

const NOMBRE_BD = 'mopt-urci-local-v1';
const VERSION_BD = 1;
const TABLAS = ['caminos', 'campanas', 'secciones', 'unidades', 'inspecciones'];

let promesaBD;

/** Abre la base de datos y crea las tablas necesarias la primera vez. */
export function abrirBD() {
  if (promesaBD) return promesaBD;
  promesaBD = new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(NOMBRE_BD, VERSION_BD);
    solicitud.onupgradeneeded = () => {
      const bd = solicitud.result;
      for (const nombre of TABLAS) {
        if (!bd.objectStoreNames.contains(nombre)) bd.createObjectStore(nombre, { keyPath: 'id' });
      }
    };
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
  return promesaBD;
}

/** Obtiene todos los registros de una tabla, sin alterar sus datos. */
export async function obtenerTodos(tabla) {
  const bd = await abrirBD();
  return new Promise((resolver, rechazar) => {
    const transaccion = bd.transaction(tabla, 'readonly');
    const solicitud = transaccion.objectStore(tabla).getAll();
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
}

/** Almacena un registro completo, identificado por su clave interna estable. */
export async function guardarRegistro(tabla, registro) {
  const bd = await abrirBD();
  return new Promise((resolver, rechazar) => {
    const transaccion = bd.transaction(tabla, 'readwrite');
    transaccion.objectStore(tabla).put(registro);
    transaccion.oncomplete = () => resolver();
    transaccion.onerror = () => rechazar(transaccion.error);
    transaccion.onabort = () => rechazar(transaccion.error);
  });
}

/** Confirma una ficha y sus referencias en una sola transacción, sin cambiar el esquema. */
export async function guardarLote(registros) {
  const bd = await abrirBD();
  const tablas = [...new Set(registros.map(r => r.tabla))];
  if (!tablas.length) return;
  return new Promise((resolver, rechazar) => {
    const transaccion = bd.transaction(tablas, 'readwrite');
    let fallo=null;
    const unidades=registros.filter(r=>r.tabla==='unidades'),campanas=registros.filter(r=>r.tabla==='campanas');let pendientes=unidades.length+campanas.length;
    const escribir=()=>{for(const {tabla,registro} of registros)transaccion.objectStore(tabla).put(registro);};
    if(!pendientes)escribir();
    for(const {registro}of unidades){
      const solicitud=transaccion.objectStore('unidades').get(registro.id);
      solicitud.onsuccess=()=>{
        if(solicitud.result?.eliminadaEn){fallo=Object.assign(new Error('Esta muestra está en la Papelera. Restaurala antes de editarla.'),{codigo:'MUESTRA_ELIMINADA'});transaccion.abort();return;}
        if(--pendientes===0)escribir();
      };
    }
    for(const {registro}of campanas){
      const solicitud=transaccion.objectStore('campanas').get(registro.id);
      solicitud.onsuccess=()=>{
        const anterior=solicitud.result;
        if(anterior){registro.caminosIds=[...new Set([...(anterior.caminosIds||[]),...(registro.caminosIds||[])])];if(anterior.estado==='cerrada')registro.estado='cerrada';}
        if(--pendientes===0)escribir();
      };
    }
    transaccion.oncomplete=() => resolver();
    transaccion.onerror=() => rechazar(fallo||transaccion.error);
    transaccion.onabort=() => rechazar(fallo||transaccion.error);
  });
}

/** Mueve muestras a Papelera o las restaura, conservando los datos más recientes. */
export async function cambiarPapelera(unidadIds,eliminar=true){
  const ids=[...new Set(unidadIds)];if(!ids.length)return [];
  const bd=await abrirBD();
  return new Promise((resolver,rechazar)=>{
    const tx=bd.transaction('unidades','readwrite'),tabla=tx.objectStore('unidades'),cambios=[],ahora=new Date().toISOString();let fallo=null;
    for(const id of ids){const peticion=tabla.get(id);peticion.onsuccess=()=>{
      const u=peticion.result;if(!u){fallo=new Error('No se encontró una de las muestras. No se modificó el formulario.');tx.abort();return;}
      if(Boolean(u.eliminadaEn)===eliminar)return;
      const registro={...u,actualizadoEn:ahora};if(eliminar)registro.eliminadaEn=ahora;else delete registro.eliminadaEn;
      tabla.put(registro);cambios.push({tabla:'unidades',registro});
    };}
    tx.oncomplete=()=>resolver(cambios);tx.onerror=()=>rechazar(fallo||tx.error);tx.onabort=()=>rechazar(fallo||tx.error);
  });
}

/** Elimina un registro expresamente seleccionado. */
export async function eliminarRegistro(tabla, id) {
  const bd = await abrirBD();
  return new Promise((resolver, rechazar) => {
    const transaccion = bd.transaction(tabla, 'readwrite');
    transaccion.objectStore(tabla).delete(id);
    transaccion.oncomplete = () => resolver();
    transaccion.onerror = () => rechazar(transaccion.error);
  });
}
