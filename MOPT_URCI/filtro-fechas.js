/* Consultas por fecha civil: sin conversiones de zona horaria ni cambios al guardado. */
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

export function fechaValida(texto){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(texto||''))return false;
 const [a,m,d]=texto.split('-').map(Number),t=new Date(Date.UTC(a,m-1,d));
 return a>=1900&&a<=9999&&t.getUTCFullYear()===a&&t.getUTCMonth()===m-1&&t.getUTCDate()===d;
}
export function errorRangoFechas({desde='',hasta=''}={}){
 if(desde&&!fechaValida(desde)||hasta&&!fechaValida(hasta))return 'Ingresá fechas válidas de cuatro cifras para el año.';
 return desde&&hasta&&desde>hasta?'La fecha Desde no puede ser posterior a Hasta.':'';
}
export function coincideFecha(fecha,rango={}){
 const {desde='',hasta=''}=rango;
 if(errorRangoFechas(rango))return false;
 if(!desde&&!hasta)return true;
 return fechaValida(fecha)&&(!desde||fecha>=desde)&&(!hasta||fecha<=hasta);
}
export function filtrarGruposPorFechas(grupos,rango={}){
 return grupos.filter(g=>coincideFecha(g.encabezado.fecha,rango));
}
export function pintarFiltroFechas({prefijo,desde='',hasta='',descripcion='Fecha de inspección. Se incluyen ambos días.',campoFecha='',camposFecha=[]}){
 const error=errorRangoFechas({desde,hasta}),ayuda=prefijo+'-fechas-ayuda',mensaje=prefijo+'-fechas-error';
 return `<div class="filtro-fechas"><div class="filtro-fechas-campos">${camposFecha.length?`<div class="campo"><label for="${e(prefijo)}-fecha-campo">Fecha del proyecto</label><select id="${e(prefijo)}-fecha-campo" data-fechas-campo="${e(prefijo)}">${camposFecha.map(([valor,titulo])=>`<option value="${e(valor)}" ${campoFecha===valor?'selected':''}>${e(titulo)}</option>`).join('')}</select></div>`:''}${[['desde','Desde',desde],['hasta','Hasta',hasta]].map(([clave,titulo,valor])=>`<div class="campo"><label for="${e(prefijo)}-fecha-${clave}">${titulo}</label><input type="date" id="${e(prefijo)}-fecha-${clave}" data-fechas-${clave}="${e(prefijo)}" value="${e(valor)}" min="1900-01-01" max="9999-12-31" aria-describedby="${e(ayuda)} ${e(mensaje)}" aria-invalid="${!!error}"></div>`).join('')}<button type="button" class="boton secundario" data-fechas-limpiar="${e(prefijo)}" ${!desde&&!hasta?'disabled':''}>Limpiar fechas</button></div><p class="ayuda" id="${e(ayuda)}">${e(descripcion)}</p><p id="${e(mensaje)}" class="aviso aviso-error" role="status" ${error?'':'hidden'}>${e(error)}</p></div>`;
}
export function refrescarFiltroFechas(prefijo,rango,raiz=document){
 const error=errorRangoFechas(rango),mensaje=raiz.querySelector('#'+prefijo+'-fechas-error');
 if(mensaje){mensaje.hidden=!error;mensaje.textContent=error;}
 for(const clave of ['desde','hasta'])raiz.querySelector('#'+prefijo+'-fecha-'+clave)?.setAttribute('aria-invalid',String(!!error));
 const limpiar=raiz.querySelector('[data-fechas-limpiar="'+prefijo+'"]');
 if(limpiar)limpiar.disabled=!rango.desde&&!rango.hasta;
}
