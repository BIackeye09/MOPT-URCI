/* Instalación, disponibilidad sin conexión y actualizaciones de la aplicación. */
export function iniciarPWA({ antesDeActualizar = async () => true } = {}) {
  const botonInstalar = document.getElementById('pwa-instalar');
  const botonActualizar = document.getElementById('pwa-actualizar');
  const estado = document.getElementById('pwa-estado');
  const detalle = document.getElementById('pwa-detalle');
  const nota = document.getElementById('pwa-actualizacion');
  const ayuda = document.getElementById('pwa-ayuda');
  const modoAplicacion = matchMedia('(display-mode: standalone)');
  let invitacion = null;
  let registro = null;
  let disponible = false;
  let recargando = false;
  let versionLista = false;
  const teniaControlador = !!navigator.serviceWorker?.controller;

  function pintarEstado() {
    estado.textContent = modoAplicacion.matches ? 'Aplicación instalada' : 'Disponible como aplicación';
    detalle.textContent = disponible
      ? (navigator.onLine ? 'Lista para usar sin conexión' : 'Sin conexión · guardado local activo')
      : 'Preparando el uso sin conexión…';
    botonInstalar.hidden = modoAplicacion.matches;
    botonInstalar.textContent = invitacion ? 'Instalar aplicación' : 'Cómo instalar';
  }
  function mostrarActualizacion() {
    botonActualizar.hidden = false;
    nota.hidden = false;
    nota.textContent = 'Hay una actualización disponible.';
  }
  window.addEventListener('beforeinstallprompt', evento => {
    evento.preventDefault();
    invitacion = evento;
    pintarEstado();
  });
  window.addEventListener('appinstalled', () => {
    invitacion = null;
    botonInstalar.hidden = true;
    estado.textContent = 'Aplicación instalada';
  });
  modoAplicacion.addEventListener('change', pintarEstado);
  window.addEventListener('online', pintarEstado);
  window.addEventListener('offline', pintarEstado);
  document.getElementById('pwa-ayuda-cerrar').addEventListener('click', () => ayuda.close());
  botonInstalar.addEventListener('click', async () => {
    if (!invitacion) { ayuda.showModal(); return; }
    const evento = invitacion;
    invitacion = null;
    await evento.prompt();
    await evento.userChoice;
    pintarEstado();
  });
  botonActualizar.addEventListener('click', async () => {
    botonActualizar.disabled = true;
    try {
      if (await antesDeActualizar() === false) {
        nota.textContent = 'No se pudo guardar. Intentá guardar antes de actualizar.';
        return;
      }
      if (registro?.waiting) {
        recargando = true;
        registro.waiting.postMessage({ tipo: 'ACTIVAR_ACTUALIZACION' });
      } else if (versionLista) {
        location.reload();
      } else {
        await registro?.update();
      }
    } catch (error) {
      recargando = false;
      nota.textContent = 'No se pudo actualizar. Podés volver a intentarlo.';
      console.warn('Actualización PWA:', error);
    } finally {
      botonActualizar.disabled = false;
    }
  });
  pintarEstado();
  if (!('serviceWorker' in navigator) || !isSecureContext || location.protocol === 'file:') {
    detalle.textContent = 'Abrí la aplicación desde localhost o HTTPS para instalarla.';
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', async () => {
    if (recargando) {
      // Espera también las ediciones realizadas mientras se activaba el worker.
      if (await antesDeActualizar() !== false) location.reload();
      else {
        recargando = false;
        versionLista = true;
        mostrarActualizacion();
        nota.textContent = 'Guardá los cambios antes de recargar.';
      }
    } else if (teniaControlador) {
      versionLista = true;
      mostrarActualizacion();
    }
  });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(async resultado => {
    registro = resultado;
    if (registro.waiting) mostrarActualizacion();
    registro.addEventListener('updatefound', () => {
      const instalando = registro.installing;
      instalando?.addEventListener('statechange', () => {
        if (instalando.state === 'installed' && navigator.serviceWorker.controller) mostrarActualizacion();
      });
    });
    await navigator.serviceWorker.ready;
    disponible = true;
    pintarEstado();
  }).catch(error => {
    detalle.textContent = 'No se pudo preparar el uso sin conexión. Recargá para reintentar.';
    console.warn('Preparación PWA:', error);
  });
}
