# Verificación de MOPT URCI v0.9 — 9 de noviembre de 2026

## Alcance de la entrega

Se reemplazó el flujo de administración por una búsqueda de ruta y sección,
seguida de una ficha de inspección con cuatro bloques: muestra, deterioros,
seguridad vial y resultados. El encabezado se comparte en los tres formularios
de salida. Los cinco datos manuales de identificación son unidad, área,
inspector y estaciones inicial y final. Las mediciones de campo siguen siendo
observaciones del inspector; el catálogo no las inventa.

El motor URCI, las curvas digitalizadas y el catálogo conservan su contenido.
Se mantiene IndexedDB `mopt-urci-local-v1`, versión 1 y sus cinco almacenes.
El lanzador y las configuraciones de VS Code mantienen el puerto 8090.

## Pruebas automáticas

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 44 pruebas aprobadas: motor, catálogo, PWA y flujo simplificado |
| `dart analyze servir.dart` | Sin problemas |
| `dart format --output=none --set-exit-if-changed servir.dart` | Sin cambios de formato |
| `python verificacion/servidor_test.py` | 7 pruebas aprobadas con SDK real de Dart |

Las pruebas del servidor incluyen archivos públicos reales, tipos MIME, HEAD,
archivos privados, traversal, origen local, puerto ocupado y arranque desde otra
carpeta cuya ruta contiene espacios. El SDK utilizado fue Dart 3.13.7.

Se probaron la conversión decimal exacta de estaciones, campos vacíos, límites
de precisión, puntuaciones de seguridad, 125 combinaciones de criterios,
encabezados automáticos, promedios pendientes y el índice válido igual a cero.
Las pruebas existentes mantienen los controles URCI 59 y 25.

La prueba del service worker carga los archivos reales de la aplicación y
comprueba su devolución desde caché cuando falla la red, incluidos los módulos
nuevos, bibliotecas y fuentes de PDF. También verifica la actualización sin
activar una versión nueva durante una edición y la limpieza de cachés propios.

## Recorrido observado en navegador

Se utilizó una copia de prueba local, sin inspecciones reales de campo:

1. Buscar RN 507 y elegir la sección 40762 en una sola selección.
2. Verificar ruta, descripción, Heredia, Sarapiquí, región y código de camino
   automáticos; los cinco campos manuales de una ficha nueva quedan vacíos.
3. Capturar `UM-SIMPLE-01`, área `167,4`, inspector de prueba, inicio `0,0`
   y final `7,91`. La pantalla muestra `0 + 000` y `7 + 910`.
4. Evaluar los siete deterioros y los cuatro aspectos de seguridad vial.
   Con la muestra de control: URCI 59, seguridad vial 72 y eficacia 64,2.
5. Guardar, recargar y continuar desde Mis inspecciones conservando los valores.
6. Dibujar un croquis y descargar PDF y Excel individuales y de resumen.
7. Verificar el resumen por sección y su encabezado compartido.
8. Introducir un desnivel negativo y comprobar el estado pendiente; restaurar
   la medición válida y comprobar la recuperación del resultado.

La vista estrecha se comprobó en un contenedor de 390 píxeles: el área útil
tenía 375 píxeles, con igual ancho visible y ancho desplazable. Los campos se
organizan en una columna y no aparece desbordamiento horizontal.

## Documentos descargados

Se inspeccionaron los PDF mediante extracción de texto y renderizado de páginas.
La descarga individual tiene cuatro páginas sin croquis y cinco con croquis;
el resumen de sección de la muestra de prueba ocupa una página. Se verificaron
acentos, encabezados, estaciones y resultados. Las fuentes se incluyen localmente.

El XLSX individual contiene Formulario URCI, Seguridad vial y Resumen de sección.
Se comprobaron tipos numéricos, identificadores y estaciones como texto,
fórmulas, encabezados vinculados y el PNG del croquis. Las tres hojas se
renderizaron para revisar su legibilidad. El resumen separado tiene una hoja.

Un motor de hojas de cálculo independiente importó el XLSX descargado y
recalculó sus fórmulas: con desnivel de 2 cm obtuvo seguridad vial 72; con
un valor negativo quedaron pendientes tanto seguridad como su resumen; con
25 cm obtuvo seguridad vial 45 y eficacia 53,4. Al restaurar 2 cm volvió a 72.
Las clasificaciones y el resumen se actualizaron con esas modificaciones.

Las deducciones URCI exportadas corresponden a la captura calculada por la
aplicación. Si se cambian las cantidades de deterioro, el URCI debe recalcularse
en la aplicación; la hoja no incorpora las curvas como fórmulas de Excel.

## Límites de esta verificación

El recorrido visual completo con el servidor detenido no pudo observarse:
el navegador de revisión bloqueó la navegación tras detener el servidor por
su política de URL. Se restauró el servidor y se completaron las descargas en
línea. El funcionamiento del caché sí pasó las pruebas automáticas descritas;
eso no sustituye una prueba visual completa en el navegador de destino.

La opción de clic derecho → Debug de VS Code en Windows no se ejecutó desde
este entorno Linux. Se verificaron las configuraciones entregadas y el servidor
con un SDK real de Dart. No se afirma sincronización entre dispositivos ni
edición simultánea de una misma ficha.

Los criterios de seguridad y eficacia se cotejaron con el Excel aportado;
su procedencia, celdas y fórmulas figuran en `seguridad_fuente.json`.
URCI continúa siendo una aproximación por lectura de curvas del TM 5-626.
