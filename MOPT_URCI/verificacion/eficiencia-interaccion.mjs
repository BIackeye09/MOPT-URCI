import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const raiz=new URL('../',import.meta.url),nodos=new Map();
const atributos=html=>Object.fromEntries([...html.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(m=>[m[1],m[2]??'']));
const dataKey=k=>k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
class Nodo{
 constructor(tag='div',attrs={}){this.tag=tag;this.attrs={...attrs};this.id=attrs.id||'';this.dataset=Object.fromEntries(Object.entries(attrs).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[dataKey(k),v]));this.value=attrs.value||'';this.disabled='disabled'in attrs;this.hidden='hidden'in attrs;this.isConnected=true;this.eventos={};this.hijos=[];this.classList={toggle(){}};if(this.id)nodos.set(this.id,this);}
 set innerHTML(v){for(const h of this.hijos){h.isConnected=false;if(h.id)nodos.delete(h.id);}this.html=v;this.hijos=[];this.analizar(v);}
 get innerHTML(){return this.html||'';}
 analizar(html){
  for(const m of html.matchAll(/<(button|input|select|textarea|div|a|p)\b([^>]*?)(?:\/>|>)/g)){
   const a=atributos(m[2]);if(['button','input','select','textarea'].includes(m[1])||a.id||Object.keys(a).some(k=>k.startsWith('data-'))){const nodo=new Nodo(m[1],a);this.hijos.push(nodo);}
  }
 }
 insertAdjacentHTML(pos,html){this.html+=html;this.analizar(html);}
 addEventListener(t,fn){(this.eventos[t]||=[]).push(fn);}
 setAttribute(k,v){this.attrs[k]=String(v);}
 removeAttribute(k){delete this.attrs[k];}
 matches(selector){
  if(selector.startsWith('#'))return this.id===selector.slice(1);
  const m=/^([a-z]+)?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/.exec(selector);
  return !!m&&(!m[1]||this.tag===m[1])&&(!m[2]||Object.hasOwn(this.attrs,m[2])&&(m[3]===undefined||this.attrs[m[2]]===m[3]));
 }
 closest(selector){return this.matches(selector)?this:null;}
 querySelectorAll(selector){return this.hijos.filter(n=>selector.split(',').some(s=>n.matches(s.trim())));}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 focus(){}scrollIntoView(){}
}
const contenido=new Nodo('main',{id:'contenido'}),bases=new Map(),original=new Map([['inspecciones',new Map([['existente',{id:'existente',nota:'No modificar'}]])]]);
bases.set('mopt-urci-local-v1',original);const antes=JSON.stringify([...original.get('inspecciones').values()]);
const indexedDB={open(nombre,version){
 const req={};queueMicrotask(()=>{
  const nuevo=!bases.has(nombre);if(nuevo)bases.set(nombre,new Map());const stores=bases.get(nombre);
  const bd={version,objectStoreNames:{contains:n=>stores.has(n)},createObjectStore(n){stores.set(n,new Map());},close(){},transaction(tabla,modo){
   const data=modo==='readwrite'?new Map([...stores.get(tabla)].map(([k,v])=>[k,structuredClone(v)])):stores.get(tabla);let pendientes=0,abortada=false,completada=false;
   const tx={abort(){abortada=true;queueMicrotask(()=>tx.onabort?.());},objectStore(){return {get(id){return pedir(()=>structuredClone(data.get(id)));},getAll(){return pedir(()=>[...data.values()].map(structuredClone));},put(p){return pedir(()=>{data.set(p.id,structuredClone(p));return p.id;});}};}};
   function pedir(fn){const r={};pendientes++;queueMicrotask(()=>{if(abortada)return;r.result=fn();r.onsuccess?.();pendientes--;if(!pendientes)queueMicrotask(()=>{if(!pendientes&&!abortada&&!completada){completada=true;if(modo==='readwrite')stores.set(tabla,data);tx.oncomplete?.();}});});return r;}
   return tx;
  }};
  req.result=bd;if(nuevo)req.onupgradeneeded?.();req.onsuccess?.();
 });return req;
}};
const errores=[],avisos=[],ubicacion={hash:'#vista=eficiencia'};
const contexto=vm.createContext({document:{getElementById:id=>nodos.get(id)||null,querySelector:()=>null},window:{scrollTo(){}},location:ubicacion,history:{pushState(a,b,v){ubicacion.hash=v;},replaceState(a,b,v){ubicacion.hash=v;}},console:{error(...a){errores.push(a.map(String).join(' '));},warn(){}},indexedDB,crypto:webcrypto,TextEncoder,TextDecoder,URL,URLSearchParams,structuredClone,setTimeout,clearTimeout});
const modulos=new Map();
async function cargar(ruta){if(!modulos.has(ruta))modulos.set(ruta,fs.readFile(new URL(ruta,raiz),'utf8').then(js=>new vm.SourceTextModule(js,{context:contexto,identifier:'file:///'+ruta})));return modulos.get(ruta);}
const entry=await cargar('eficiencia-ui.js');await entry.link((s,ref)=>cargar(new URL(s,ref.identifier).pathname.slice(1)));await entry.evaluate();
const ui=entry.namespace.crearInterfazEficiencia({contenido,avisar:t=>avisos.push(t),guardado(){},confirmar:async()=>true,estaActiva:()=>true});
async function emitir(tipo,nodo){assert.ok(nodo,'Control no encontrado');for(const fn of contenido.eventos[tipo]||[])await fn({target:nodo,preventDefault(){}});}
const boton=accion=>contenido.querySelector('[data-ef-accion="'+accion+'"]');
const campo=(nombre,valor)=>{const n=nodos.get('ef-'+nombre);assert.ok(n,nombre);n.value=valor;return emitir('input',n);};
await ui.mostrar({rutaSugerida:'RN:507:40762'});assert.match(contenido.innerHTML,/Mis proyectos/);
await emitir('click',boton('nuevo'));await emitir('click',contenido.querySelector('[data-ef-control="RN:507:40762"]'));
assert.match(contenido.innerHTML,/RN 507/);assert.match(contenido.innerHTML,/Monto programado/);
for(const [nombre,valor]of Object.entries({trabajo:'Conservación de prueba',longitudKm:'7,91',modalidad:'Contrato',estadoProyecto:'Finalizado',programacion:'Ordinaria',inicioProgramado:'2026-01-01',finProgramado:'2026-01-11',inicioEjecutado:'2026-01-01',finEjecutado:'2026-01-12',montoProgramado:'1000000',montoEjecutado:'1100000'}))await campo(nombre,valor);
assert.equal(nodos.get('ef-duracionProgramada').value,'10');assert.equal(nodos.get('ef-duracionEjecutada').value,'11');
assert.match(nodos.get('ef-resultados').innerHTML,/>90</);assert.match(nodos.get('ef-resultados').innerHTML,/Proyecto completo/);assert.match(nodos.get('ef-resultados').innerHTML,/1 día adicional/);assert.match(nodos.get('ef-resultados').innerHTML,/de aumento/);
await emitir('click',boton('guardar'));assert.equal(ui.pendientes(),false);
const tabla=()=>bases.get('mopt-urci-eficiencia-v1').get('proyectos');assert.equal(tabla().size,1);const id=[...tabla().keys()][0],antiguo=structuredClone(tabla().get(id));
await emitir('click',boton('lista'));assert.match(contenido.innerHTML,/Completado/);
await campo('fecha-desde','2026-01-02');assert.equal(boton('excel').disabled,true);assert.match(nodos.get('ef-lista').innerHTML,/No hay proyectos/);
await emitir('click',contenido.querySelector('[data-fechas-limpiar="ef"]'));assert.equal(boton('excel').disabled,false);assert.match(nodos.get('ef-lista').innerHTML,/Conservación de prueba/);
await campo('fecha-hasta','2026-01-01');assert.equal(boton('excel').disabled,false);
const fechaCampo=nodos.get('ef-fecha-campo');fechaCampo.value='finEjecutado';await emitir('change',fechaCampo);assert.equal(boton('excel').disabled,true);
await campo('fecha-desde','2026-01-02');assert.match(nodos.get('ef-fechas-error').textContent,/posterior/);assert.equal(boton('excel').disabled,true);
await emitir('click',contenido.querySelector('[data-fechas-limpiar="ef"]'));assert.equal(boton('excel').disabled,false);
await emitir('click',contenido.querySelector('[data-ef-abrir="'+id+'"]'));assert.equal(nodos.get('ef-trabajo').value,'Conservación de prueba');
await campo('montoEjecutado','');assert.match(nodos.get('ef-resultados').innerHTML,/Por completar/);await emitir('click',boton('guardar'));assert.equal(tabla().get(id).montoEjecutado,'');
await campo('montoEjecutado','1100000');await emitir('click',boton('lista'));await emitir('click',contenido.querySelector('[data-ef-eliminar="'+id+'"]'));assert.ok(tabla().get(id).eliminadoEn);
const db=(await cargar('eficiencia-db.js')).namespace;await assert.rejects(db.guardarProyecto(antiguo),e=>e.codigo==='PROYECTO_ELIMINADO');
const filtro=nodos.get('ef-filtro');filtro.value='papelera';await emitir('change',filtro);assert.match(nodos.get('ef-lista').innerHTML,/En Papelera/);
await emitir('click',nodos.get('ef-lista').querySelector('[data-ef-restaurar="'+id+'"]'));assert.ok(!tabla().get(id).eliminadoEn);assert.equal(tabla().get(id).montoEjecutado,'1100000');
await emitir('click',boton('resumen'));assert.match(contenido.innerHTML,/>90</);assert.match(contenido.innerHTML,/Muy Bueno/);
await ui.mostrar({proyectoId:id});assert.equal(nodos.get('ef-trabajo').value,'Conservación de prueba');
await ui.mostrar();assert.match(contenido.innerHTML,/Mis proyectos/);assert.ok(!nodos.has('ef-trabajo'));
assert.equal(JSON.stringify([...original.get('inspecciones').values()]),antes);assert.deepEqual(errores,[]);
console.log('Interacción con DOM e IndexedDB simulados: crear, completar, guardar, reabrir, limpiar un monto, enviar a Papelera, impedir restauración por guardado antiguo, restaurar, filtrar por fechas inclusivas, cambiar fecha de consulta, limpiar un rango invertido y resumir. Datos de Eficacia conservados.');
