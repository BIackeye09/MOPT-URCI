# Verificación v0.23: revisión de pendientes y descargas claras

Fecha: 17 de noviembre de 2026.

## Cambios

Se añade una revisión plegable en Resultados y descarga. Utiliza las mismas
validaciones de encabezado, motor URCI y seguridad vial; no rellena ni cambia
datos. Distingue selección pendiente, medida faltante o fuera de rango y
calificación manual pendiente. Los errores del encabezado incluyen su campo,
manteniendo los mensajes y las condiciones de la validación anterior.
Los botones abren los apartados necesarios, desplazan la pantalla y enfocan
el control correspondiente. La lista desaparece al completar la muestra.

Las descargas incompletas añaden _Borrador al nombre. La regla se comparte
entre la descarga normal y la vista previa y contempla las secciones reales
del PDF, las muestras del Excel y los formularios independientes de un lote.
Las curvas parciales conservan su carácter de consulta. No se modifica el
contenido ni la estructura de los documentos oficiales para añadir marcas.

## Verificación

`npm test`: 132 pruebas aprobadas, ninguna fallida, más el escenario existente
de interacción de Eficiencia con DOM e IndexedDB simulados. Se conservan los
controles de cálculo, notas decimales y ceros, plantillas, estilos, relaciones,
gráficas, agrupaciones y Papelera. Las doce pruebas nuevas cubren revisión y
foco de destino, validación compartida, descargas por sección, varias muestras,
lotes independientes, duplicados, exclusión de Papelera, muestras fuera del
promedio, nombres de archivo, texto escapado y modo de consulta.

En navegador real se creó una muestra, se completó el encabezado y se dejó
pendiente una nota manual. El botón Revisar enfocó sv-senalamientoNota.
Se descargaron Excel y PDF incompletos y se observó la identificación de
borrador en la aplicación. La vista previa URCI completa conservó su estado
normal aunque la seguridad vial estuviera pendiente. Al ingresar cero en la
nota restante, la revisión indicó muestra completa. Guardar y recargar
conservó ese estado. Se descargaron PDF y Excel completos y se cotejaron
sus ceros válidos: AQ11, AQ13, AQ23, AQ35 y AQ50; en el borrador, las notas
faltantes AQ35 y AQ50 permanecieron vacías. El PDF completo tuvo tres páginas.

La vista de navegador utilizó el servidor estático de prueba. revision.js
figura en la lista pública de servir.dart y en la caché del service worker.
Se mantiene localhost:8090 en la distribución y se usa la caché v023r1.
