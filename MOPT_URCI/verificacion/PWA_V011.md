# Verificación de MOPT URCI v0.11

Fecha: 10 de noviembre de 2026.

## Resultado entregado

La sección Deterioros incorpora **Hoja de gráficas y valores deducibles**. Abre
el PDF con las seis figuras originales de densidad y una página de desglose.
Cada severidad medida resalta su curva L/M/H y lleva una guía desde el eje
inferior hasta la intersección y hacia el eje izquierdo. Se muestran las
cantidades, densidades, valores aproximados y subtotales. El polvo aporta su
deducción fija al VDT.

El Excel conserva los tres formularios existentes y añade **Gráficas VD** con
seis imágenes anotadas, tablas vinculadas al formulario URCI y fórmulas de suma.
La descarga habitual del PDF conserva los tres formularios; las gráficas se
descargan desde su propia vista previa.

## Comprobaciones automáticas

- `npm test`: **58 pruebas aprobadas**. Incluyen el motor, catálogo, estaciones,
  resúmenes, seguridad vial, PDF, XLSX, PWA y siete pruebas nuevas para la hoja
  de gráficas.
- `dart analyze servir.dart`: sin problemas.
- `dart format --output=none --set-exit-if-changed servir.dart`: sin cambios.
- `python verificacion/servidor_test.py`: **7 pruebas aprobadas** con Dart
  3.13.7. Verifican los archivos públicos, el módulo nuevo y los recursos del
  caché, tipos MIME, HEAD, protección de archivos privados, rutas y puerto
  ocupado, además de carpetas con espacios y ejecución desde otra carpeta.

En total: **65 pruebas automáticas aprobadas**. El servidor y la configuración
de depuración conservan el puerto 8090.

Las pruebas de la hoja comprueban la igualdad con los 21 valores de deducción
del motor, el total con polvo, las guías por severidad, el dominio de los ejes,
las mediciones inactivas, el cero válido y un VDT válido aunque no pueda
obtenerse el URCI. También verifican las cuatro hojas de Excel y sus seis
imágenes con anclajes independientes.

## Revisión de exportaciones reales

Se completó una ficha de prueba desde la interfaz del navegador con área
167,4 m², 81 L = 30,5 m, 83 M = 83,7 m², polvo M y 87 M = 48,8 m. Los demás
deterioros se confirmaron como ausentes. El VDT fue 65,1124901704111 y se
presentó como 65,11. El URCI mostrado siguió siendo 59.

Se descargaron el PDF de gráficas y el Excel desde la aplicación. El PDF tuvo
siete páginas; todas se renderizaron y revisaron visualmente, sin textos ni
figuras fuera de página. Las cabeceras conservaron la ruta y las estaciones
`0 + 000` y `7 + 910`. El Excel tuvo cuatro hojas y seis imágenes PNG válidas.

Un lector independiente importó y recalculó el Excel. Se comprobó que el VDT
del formulario, el desglose y el resumen coincidieran; al aumentar una
deducción en 1, el desglose y el total aumentaron en 1. Al poner las 21
deducciones en cero, se conservó un total válido igual a cero. La búsqueda de
errores de fórmulas no encontró coincidencias. Se renderizaron y revisaron
el encabezado/desglose y las seis figuras de la hoja nueva.

Después se añadieron 81 M = 20 m y 81 H = 10 m. Las nuevas descargas mostraron
las tres severidades con colores y guías distintos, y un VDT de
84,3998293651183, presentado como 84,4. Se verificaron los tres colores en la
imagen del Excel y el nuevo total en el PDF. Se restauró la ficha de control.

También se generaron PDFs de control con tres severidades y datos pendientes:
ambos conservaron las siete páginas. Los datos incompletos no generaron un
VDT ficticio.

## Interfaz y conservación de datos

La vista previa real se abrió en escritorio y dentro de una pantalla de
390 píxeles. En móvil se conservaron los cuatro selectores, el botón de
descarga y las siete páginas; el diálogo midió 367 píxeles de ancho y su
contenido no lo excedió. La ampliación y la descarga reutilizan la vista
previa existente.

No se modifican el motor URCI, las curvas digitalizadas, el catálogo vial,
el esquema de la base local, los identificadores ni el conversor de estaciones.
El nuevo módulo se incluye en el caché y en los archivos públicos de Dart.
Las pruebas automáticas del caché utilizan los archivos reales. La revisión
visual con el servidor detenido mantiene la limitación del entorno descrita
en el informe v0.10; no se certifica ese recorrido visual en esta entrega.

## Alcance del Excel

Las figuras son imágenes de las lecturas al exportar. Las deducciones y
densidades proceden del cálculo de la aplicación. El desglose, los subtotales
y el VDT utilizan referencias y sumas de Excel, pero modificar cantidades
directamente en el archivo no vuelve a leer las curvas ni actualiza sus
imágenes o el URCI. Para recalcular la inspección completa, se edita en la
aplicación y se descarga otra vez.
