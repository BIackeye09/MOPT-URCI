# Verificación de MOPT URCI v0.12

Fecha: 10 de noviembre de 2026.

## Conservación de las plantillas

Se retiró la reconstrucción de documentos de v0.11. La exportación utiliza
copias de `Formulario_Limpio.xlsx` y
`01 RVNL - Indicador de Eficacia - VF.xlsx`, aportados por el usuario.
Ambos originales se incluyen sin cambios, con sus huellas SHA-256.

El formulario limpio conserva su única hoja. El libro de eficacia conserva
sus dieciséis hojas, imágenes, gráficos nativos, textos y demás componentes.
Se descargan juntos en un ZIP para mantener separados los libros originales.
Sólo se completan los campos de datos y resultados. El croquis se añade como
dibujo independiente en su espacio, conservando los logotipos.

Las pruebas comparan cada parte de los paquetes Excel. Fuera de las hojas
llenadas, los componentes son idénticos byte a byte. En las hojas llenadas,
al excluir únicamente el contenido de los campos autorizados, el XML es
idéntico al original: estilos, dimensiones, combinaciones, textos y relaciones
se conservan. Los textos que empiezan con `=` se almacenan como datos literales.

## Gráficas y PDF

La consulta utiliza la distribución original de **Curvas**, con seis figuras
de densidad, el polvo y la curva URCI en una página A3. Las guías se proyectan
sobre los ejes propios de cada figura. Las imágenes del Excel no se modifican.
El manual aportado y las figuras del motor coinciden con las huellas de
`procedencia.json`; no se cambia el motor ni sus trazos digitalizados.

Los fondos PDF proceden de los rangos oficiales de URCI, seguridad vial y
RESUMEN. Las copias temporales de impresión vacían datos y resultados y
ajustan la impresión para obtener cada rango completo. No sustituyen los
Excel originales ni sus opciones de impresión. Los campos PDF respetan las
alineaciones, tamaños, negritas, decimales y reglas de color del Excel.

La descarga PDF habitual tiene los tres formularios. La hoja de curvas se
descarga desde su propia vista previa. El visor incluye Página completa,
Ajustar al ancho, 150 % y 200 %. El texto debe caber en su espacio; no se
recorta silenciosamente ni se añaden páginas de otro diseño.

Se compararon los tres PDF llenos con los fondos a escala 1,5. Fuera de los
espacios de datos y del croquis hubo **cero píxeles modificados**. Se revisaron
visualmente las tres páginas completas y la página de curvas.

## Datos comprobados

La muestra de control mantuvo VDT 65,1124901704111, q = 3, URCI = 59,
seguridad vial = 72 y eficacia = 64,2. La presentación utiliza los decimales
originales: por ejemplo, VDT 65,1 en el formulario con formato de un decimal.
La suma interna conserva todos los decimales.

Se comprobaron las estaciones `0,0` y `7,91`, exportadas como `0 + 000` y
`7 + 910`; el área directa de 167,4 m², anotada en Observaciones cuando no
hay dimensiones; y largo 30 m por ancho 5,58 m, que llena las casillas
correspondientes. No se inventan medidas. Los datos pendientes y el cero
confirmado siguen siendo distintos. Una medida inválida se conserva como
texto y no produce un resultado ficticio.

Una sección de once muestras se exportó completa en dos libros con los diez
espacios originales, sin insertar filas ni descartar unidades. Los índices
de sección corresponden al conjunto seleccionado.

Desde la interfaz se descargaron los Excel y los PDF, con un croquis de
prueba. Un lector independiente importó los Excel reales, recalculó el
formulario lleno y verificó los resultados. No encontró errores de fórmula
en ese formulario. Se renderizaron URCI, seguridad vial, RESUMEN y Curvas;
se validó el XML de todas las partes de ambas descargas.

## Pruebas

- **67 pruebas Node aprobadas**, incluidas las verificaciones de preservación.
- **7 pruebas reales del servidor Dart aprobadas**, con SDK oficial 3.13.7
  y huella verificada. Incluyen todos los archivos del caché y las plantillas.
- `dart analyze servir.dart`: sin problemas.
- `dart format --output=none --set-exit-if-changed servir.dart`: sin cambios.

Total: **74 pruebas automáticas aprobadas**.

Se conservan el puerto 8090 y la base IndexedDB existente. Los recursos nuevos
se incluyen en el caché. El uso sin conexión se comprueba mediante pruebas
automáticas con archivos reales; no se añade una certificación visual con el
servidor detenido.

Los resultados llenados corresponden al cálculo actual de la aplicación.
Para recalcular al modificar mediciones, se edita la app y se exporta otra
vez. Las reglas originales pueden ocultar visualmente algunos ceros en el
resumen; sus valores numéricos permanecen en las celdas.
