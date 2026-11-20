# Verificación de v0.19

Fecha: 13 de noviembre de 2026.

## Apariencia

- Botones principales azules y secundarios con fondo azul claro y borde.
- Navegación principal en recuadros, con selección azul intensa.
- Desplegables enmarcados: fondo azul claro al estar cerrados y encabezado
  azul intenso al abrirlos, con flecha que cambia de orientación.
- Pestaña de muestra seleccionada y herramienta de croquis activa en azul.
- Selectores con fondo suave y borde azul.
- Se conservan los botones amarillos de vista previa, los rojos para
  eliminar, los estados deshabilitados y los indicadores de foco por teclado.
- Continúa el uso de details/summary nativos, sin añadir módulos ni cambiar
  eventos, cálculos, formularios oficiales o almacenamiento.
- Se mantienen los tamaños de botones y el ajuste de los encabezados a
  pantallas pequeñas. Las flechas no dependen de fuentes ni imágenes externas.

## Comprobaciones

- 93 pruebas automatizadas aprobadas.
- La comprobación de recursos públicos incluye el módulo de guías que
  causaba el bloqueo anterior. Sigue permitido en el lanzador Dart.
- Evaluación de app.js y su cadena de módulos: arranque y navegación por
  Nuevo formulario, Mis formularios y Resúmenes con DOM e IndexedDB simulados.
- Contraste del texto: blanco sobre azul principal, texto azul sobre fondo
  azul claro y navegación inactiva superan 4.5:1.
- Las plantillas oficiales conservan sus bytes y huellas originales.
- Se actualiza el caché a v019r1, manteniendo localhost:8090 y la misma base
  de datos. No se añaden dependencias al arranque.

Limitación: no se completó la verificación visual en un navegador real;
Chromium no puede iniciarse por las restricciones del entorno. Las pruebas
con DOM simulado no sustituyen una comprobación visual.
