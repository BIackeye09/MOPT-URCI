# MOPT URCI v0.34 — Búsqueda de lugares para el croquis

La barra superior permite elegir **01 Eficacia** o **02 Eficiencia**.
En Eficacia, buscá el tramo para iniciar una inspección o abrí una existente
desde **Mis formularios**. Dentro de un formulario, la tarjeta **Muestras del
formulario** permite cambiar de muestra, agregar otra y **Eliminar esta muestra**.

En cada muestra o proyecto, la barra de secciones lleva directamente a los
datos, la evaluación y los resultados. Las pantallas de listados reúnen
la búsqueda, el filtro por fechas y las descargas del listado visible.
En la ficha, **Vista previa** abre el PDF y permite elegir la hoja a consultar.
Mientras la vista previa está abierta, usá **↑** y **↓** para desplazarte por
el documento. Al cerrarla, volvés a la posición en que estabas.

En **Mis formularios**, cada tarjeta muestra las estaciones registradas y los
promedios de transitabilidad, seguridad vial y eficacia. Abrí **Ver muestras
y estaciones** para consultar el detalle de cada muestra.

En vista previa, PDF y Excel, la celda **Calificación** de **Estabilidad y
drenaje** muestra la condición elegida. La profundidad se registra en la
aplicación y se usa para calcular el puntaje.

## Observaciones y croquis

En **Deterioros del camino**, desplegá **Observaciones y croquis**. Allí podés
anotar lo observado, dibujar a mano o usar un encuadre de OpenStreetMap.
El croquis y las observaciones se incorporan a la vista previa, el PDF y el Excel.

## Guardar el mapa de una muestra

1. Abrí **Consultar mapa** junto al croquis.
2. En **Buscar lugar**, escribí una provincia, cantón, distrito o localidad.
   Si el nombre se repite, elegí según el cantón y la provincia que se muestran.
   Podés escribir **Chilamate Poás** o **San Pablo de Heredia**, con o sin tildes.
3. Arrastrá el mapa para ubicar el tramo. Ajustá el zoom con el touchpad,
   con dos dedos en la pantalla o con **+** y **−**.
4. Pulsá **Capturar para el croquis** cuando se cargue el encuadre. La imagen
   se guarda en la muestra e incluye la atribución de OpenStreetMap.

**Cambiar encuadre** abre el mapa en la posición guardada. **Quitar mapa**
vuelve al dibujo a mano de la muestra. El visor en vivo requiere internet.
La imagen guardada se abre y se exporta cuando trabajás sin conexión.
El enlace **Prueba de mapa** del pie permite consultar el mapa desde cualquier
pantalla. Para capturar, abrilo desde una muestra editable.

El buscador usa un catálogo incluido en la aplicación con las siete provincias,
los 84 cantones y miles de localidades. Funciona sin cuenta ni permiso de ubicación.
Los lugares provienen de [GeoNames](https://www.geonames.org/) bajo
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Se seleccionaron las
localidades vigentes, se completaron cantones a partir de geoBoundaries y se
verificaron nombres y ubicaciones puntuales con el IGN. Las fuentes figuran en
`lugares-cr.json`.

## Consultar por fechas

En **Mis formularios** y **Resúmenes**, usá **Desde** y **Hasta** para filtrar
por la fecha de inspección. Se incluyen ambos días y podés dejar un límite
vacío. Se combina con la búsqueda y, en la lista, con el estado. **Limpiar
fechas** restablece sólo las fechas. La descarga conjunta reúne los formularios
mostrados, conservando cada formulario y sus muestras completos.

En **02 Eficiencia**, el mismo filtro aparece en **Mis proyectos** y en
**Resultados por sección**. Elegí si querés consultar por inicio o fin de
ejecución, o por inicio o fin programado. Se usa la fecha elegida, sin sustituir
fechas pendientes por la de creación o guardado. Con un rango activo, los
proyectos sin esa fecha quedan fuera; sin límites vuelven a aparecer.

El Excel y la vista previa de la lista contienen los proyectos mostrados.
Los resultados por sección promedian sólo los proyectos que pasan la búsqueda
y las fechas; cuando se aplica un filtro, se identifica ese alcance. Una
fecha invertida muestra un aviso y no produce resultados ni descargas de lista.
Los filtros se conservan al navegar entre las vistas del mismo módulo durante
la sesión; recargar vuelve a la consulta sin filtros. No cambian los datos.

## Leer los resultados de Eficiencia

En cada proyecto, la tabla **Programado y ejecutado** muestra montos en colones,
plazos registrados y sus diferencias: aumento o ahorro, días adicionales o
menos días. Los datos pendientes se indican como **Por completar**, sin
convertirlos en cero. Las notas y la ponderación 50/50 siguen las fórmulas
originales.

En **Resultado y descarga**, **Revisar datos pendientes** permite ir al campo
que necesita completarse o corregirse. Al completar el proyecto se retira la
lista. Si escribís un plazo distinto de los días entre las fechas, aparece
una aclaración: el indicador usa el plazo registrado, que se conserva.
Estas ayudas aparecen en pantalla; los formularios oficiales permanecen intactos.

## Revisar antes de descargar

En **Resultados y descarga**, abrí **Revisar datos pendientes** para ver
qué falta o necesita corrección. Cada botón **Revisar** lleva al campo
correspondiente, incluyendo datos de la muestra, deterioros y seguridad vial.
La lista se actualiza al escribir y conserva las medidas ingresadas.
Cuando la muestra está completa, aparece una indicación breve en su lugar.
Una nota válida de cero cuenta como un resultado completo.

Los informes incompletos incorporan **Borrador** al nombre del archivo.
Se aplica a PDF y Excel, a resúmenes y a las descargas de varios formularios.
En la vista previa se comprueba sólo la sección mostrada: por ejemplo,
un PDF de seguridad vial completo puede descargarse aunque falten deterioros.
El Excel revisa todas las muestras que incluye; el resumen PDF considera
las seleccionadas. La Papelera queda excluida. Las consultas parciales de
curvas mantienen su función de consulta y su nombre habitual.

El guardado y los borradores continúan disponibles. Los formularios oficiales,
los cálculos y las observaciones del inspector conservan su comportamiento.

## Seguridad vial: método nuevo

En **Desnivel entre corona y espaldón**, ingresá únicamente los centímetros.
La condición (Muy bueno, Bueno, Regular, Malo o Muy malo) y la nota se
calculan automáticamente con los mismos tramos y fórmulas proporcionales
aprobados. Cambiar los centímetros actualiza ambas salidas. Un campo vacío
queda pendiente; cero es una medida válida. Ya no hay selector de condición.

En **Estabilidad y drenaje**, elegí la condición observada antes de escribir
la medida. Una medida fuera del rango elegido muestra el error y deja
pendientes la nota y los índices que dependen de ella; no se recorta el dato.
Cambiar de condición vuelve a validar la medida escrita. Todos los campos
aceptan coma o punto decimal dentro de los límites indicados.

En **Estabilidad y drenaje**:

| Condición | Medida permitida | Calificación |
|---|---|---|
| Muy bueno | De 0 a 2 cm | 100 |
| Bueno | Más de 2 y hasta 5 cm | Baja proporcionalmente de 100 a 85 |
| Regular | De 5 a 10 cm | Baja proporcionalmente de 85 a 60 |
| Malo | De 10 a 20 cm | Baja proporcionalmente de 60 a 40 |
| Muy malo | Más de 20 cm | 40 − 2 × (cm − 20), mínimo 0 |

En Bueno, la fórmula es **100 − 5 × (cm − 2)**: 2,5 cm = 97,5;
3 cm = 95; 4 cm = 90; 5 cm = 85. El límite de 2 cm pertenece a Muy bueno
y da 100. De esta forma también se admiten los decimales entre 2 y 3 cm.

Por ejemplo: 6,37 cm en Regular = 78,15; 20 cm en Malo = 40;
21,25 cm en Muy malo = 37,5. Desde 40 cm la nota es cero, aunque la
profundidad medida sea mayor. Si se confirma colapso, se admite su medida
observada y se conserva como máximo la nota original de 25; una profundidad
que produzca una nota menor prevalece.

En **Desnivel**, se toman como referencias las notas que da la fórmula
original de Excel en sus límites: 2 cm = 100; 5 cm = 70; 15 cm = 50;
25 cm = 25. Entre esos puntos la nota cambia proporcionalmente y, desde
25 cm, continúa bajando con la misma pendiente hasta un mínimo de 0.

| Condición | Medida permitida | Nota según centímetros |
|---|---|---|
| Muy bueno | De 0 a 2 cm | 100 |
| Bueno | Más de 2 y menos de 5 cm | 100 − 10 × (cm − 2) |
| Regular | Desde 5 y menos de 15 cm | 70 − 2 × (cm − 5) |
| Malo | Desde 15 y menos de 25 cm | 50 − 2,5 × (cm − 15) |
| Muy malo | Desde 25 cm | MAX(0; 25 − 2,5 × (cm − 25)) |

Por ejemplo: 2,5 cm = 95; 3 cm = 90; 3,5 cm = 85; 4 cm = 80;
7,5 cm = 65; 10 cm = 60; 20 cm = 37,5. La nota no salta al cruzar
2, 5, 15 o 25 cm. Se conservan 100 puntos hasta 2 cm. A partir de 25 cm
se restan 2,5 puntos por centímetro adicional: 25,5 cm = 23,75; 26 cm = 22,5;
30 cm = 12,5; 34,5 cm = 1,25. Desde 35 cm la nota es cero, aunque la medida
sea mayor. Se aceptan decimales con coma o punto. Los resultados de pantalla
y PDF muestran hasta dos decimales, conservando la precisión del cálculo
y de los datos numéricos del Excel. Los campos sin medida permanecen vacíos.

La fórmula equivalente de Excel para una medida numérica válida es:

```excel
=SI(AL11="";"";SI(AL11<=2;100;SI(AL11<5;100-10*(AL11-2);SI(AL11<15;70-2*(AL11-5);SI(AL11<25;50-2,5*(AL11-15);MAX(0;25-2,5*(AL11-25)))))))
```
La aplicación además valida la medida y determina automáticamente su condición.

**Vegetación** y **Señalamiento vertical** requieren elegir la condición e
ingresar una nota dentro del rango correspondiente. Se usan los mismos
límites en ambos aspectos, incluidos los dos extremos:

| Condición | Nota permitida |
|---|---|
| Muy bueno | 95 a 100 |
| Bueno | 85 a 94 |
| Regular | 60 a 84 |
| Malo | 26 a 59 |
| Muy malo | 0 a 25 |

Se aceptan decimales con coma o punto dentro de cada rango; por ejemplo,
90,5 es válido en Bueno. Los límites son exactos: 94,5 está fuera de Bueno
y de Muy bueno. Una nota fuera de rango queda pendiente, sin redondearla ni
cambiarla. Si se cambia la condición, se valida de nuevo la nota escrita.
Los valores guardados se conservan y, si quedan fuera de los nuevos límites,
se muestra el aviso para corregirlos. Cero es válido en Muy malo; vacío queda
pendiente. Se conservan la ponderación 60/40 y el menor puntaje de los tres
márgenes para calcular la seguridad vial.

Este método es una modificación solicitada, no una reproducción de las
fórmulas de notas fijas del libro original. Las plantillas no se modifican.
PDF, Excel y resúmenes usan los mismos resultados actuales de la aplicación.
La medida de estabilidad se incluye en el campo Estado, junto a su condición,
sin alterar los textos ni añadir observaciones del inspector.

Las inspecciones anteriores conservan sus notas. Para utilizar el método
nuevo en una de ellas, pulsá **Actualizar evaluación de seguridad vial**;
las selecciones y el desnivel se conservan, y se solicitan las nuevas
medidas y notas manuales, sin inventarlas.

## 02 Eficiencia

1. Abrí **02 Eficiencia → Nuevo proyecto** y elegí la ruta y sección. Al venir
   de una inspección, podés reutilizar su ruta. Región, provincia y cantón
   se completan con el mismo catálogo.
2. Completá año, tipo de trabajo, longitud atendida, modalidad, estado y
   tipo de programación del proyecto.
3. Registrá las fechas y duraciones programadas y ejecutadas. Se proponen
   los días transcurridos entre las fechas; podés escribir el plazo
   registrado cuando el contrato utilice otro conteo.
4. Ingresá los montos programado y ejecutado en colones. El puntaje de costo,
   el de tiempo, el índice y la calificación se calculan automáticamente.
5. Guardá el proyecto, revisá su vista previa y descargá PDF o Excel. La
   lista permite buscar, filtrar, eliminar a Papelera y restaurar proyectos.

Los resultados por sección promedian los proyectos de esa ruta, sección y
año cuando todos están completos. Un proyecto pendiente no se convierte en
un cero ni se oculta dentro del promedio. La Papelera queda excluida.

Se utiliza la plantilla original `02 RVNL - Indicador de Eficiencia - VF.xlsx`.
Las descargas incluyen únicamente **Formulario** y **RESULTADOS**, con los
proyectos seleccionados; conservan columnas, encabezados y estilos. Más de
42 proyectos se distribuyen en copias de esas hojas dentro del mismo XLSX.
No se incluyen las hojas de referencia o instructivos ni filas sobrantes.
El Excel conserva fórmulas y se recalcula al editar sus entradas.

El cálculo combina 50 % del puntaje de tiempo y 50 % del puntaje de costo,
según las fórmulas de RESULTADOS. En costo, la fórmula asigna 75 puntos al
20 % exacto de aumento y 25 al 40 % exacto; esos dos límites difieren del
texto de Listas. La aclaración también aparece en el detalle del cálculo.

Los espacios pendientes permanecen vacíos en las descargas. Los datos de
Eficacia y Eficiencia se conservan localmente en el mismo navegador, perfil
y dirección. La actualización no modifica las inspecciones ya guardadas.

## 01 Eficacia

Se corrige la posición de las imágenes y las flechas en las hojas Curvas
de Excel. Cada gráfica conserva su espacio, y sus títulos y lecturas
ocupan celdas separadas. Se mantienen las imágenes originales, las curvas
correspondientes a los datos actuales y una hoja de curvas por muestra.

Los informes descargados anteriormente deben volver a generarse desde la
aplicación actualizada para recibir esta corrección.

Los botones principales y las pestañas seleccionadas usan azul intenso.
Los botones secundarios tienen fondo azul claro y borde visible. Las
secciones desplegables están enmarcadas, con una flecha a la derecha; el
encabezado cambia a azul intenso al abrirlas. Los selectores también tienen
un borde azul para identificarlos con facilidad.

La vista previa conserva el amarillo y las acciones de eliminar conservan
el rojo. Las secciones siguen abriéndose por clic o teclado. Esta versión
conserva la corrección de arranque de la v0.18.1.

Se corrige el bloqueo en **Abriendo tus inspecciones…**: el servidor local
ahora permite cargar `guias-lectura.js`, necesario para iniciar la aplicación
y preparar el uso sin conexión. Se conservan las mejoras de la v0.18.

Para actualizar: detené la ejecución anterior con **Shift+F5**, extraé este
ZIP completo y ejecutá **Debug** sobre su `servir.dart`. Abrí la misma
dirección **http://localhost:8090/** en el mismo navegador y perfil, y pulsá
**Ctrl+Shift+R**. No borres los datos del sitio: las inspecciones se mantienen
en la misma base local del navegador.

La descarga de informes entrega directamente un archivo `.xlsx` con las
muestras creadas, las curvas individuales de cada muestra y su resumen.
No requiere descomprimir ni incluye el instructivo o las hojas auxiliares.

## Casillas sin medición

Las cantidades, densidades y deducciones sin datos permanecen en blanco en la
pantalla, la vista previa, el PDF y el Excel. Marcar **Sin deterioro** confirma
la evaluación para el cálculo y deja vacías las casillas de ese deterioro.
En polvo sólo se marca y se muestra la deducción de la severidad elegida.
Al borrar una cantidad también se limpia la deducción de esa severidad en
la siguiente descarga. Para actualizar un informe anterior, volvé a descargarlo.

Los valores deducibles individuales iguales a cero también quedan en blanco,
para evitar `0,0` en esas casillas. El motor sigue utilizándolos en los cálculos.
Las cantidades escritas y los resultados finales válidos se conservan.
La estación `0,0` sigue siendo `0 + 000`. Las plantillas oficiales y sus estilos
permanecen intactos. El informe sigue siendo un único archivo `.xlsx`.

Las flechas son rojas en todas las severidades y en la guía de resultado
URCI. Se elimina el contorno blanco, los círculos de lectura y los recuadros
blancos que tapaban partes de la cuadrícula. Se dejan únicamente las líneas
y sus puntas, iguales en pantalla, PDF y Excel. Conservan ambos pasos de la
lectura: desde la densidad hasta la curva y desde allí al valor deducible.
Se muestran en la app, la vista previa, el PDF y la hoja de curvas de Excel.
En polvo se ven las tres opciones Baja, Media y Alta con sus valores fijos,
y sólo el círculo junto a la severidad elegida se rellena.

## Organización de formularios

- **Nuevo formulario** crea uno independiente, aunque coincidan ruta y fecha.
- **Agregar muestra** añade una unidad al formulario abierto. Sus botones
  permiten pasar de una muestra a otra y muestran cuál estás completando.
- **Corregir la ruta de este formulario** cambia la ruta de todas sus muestras;
  conserva sus mediciones. La aplicación confirma el alcance antes de aplicarlo.
- **Mis formularios** permite buscar y filtrar borradores, completados,
  archivados y Papelera. Cada tarjeta indica cuántas muestras contiene.
- Dentro del formulario, seleccioná la muestra y pulsá **Eliminar esta
  muestra**, debajo de las pestañas. Confirmá para moverla a la Papelera.
  Si era la última, el formulario sale de la lista activa.
- **Eliminar formulario** mueve todas sus muestras a la Papelera.
- Para recuperar, elegí **Papelera** en Estado y pulsá **Restaurar**. No se
  borran permanentemente las mediciones ni las observaciones.

Los registros anteriores conservan su agrupación original. Los formularios
nuevos tienen una identidad propia y un número automático.

## Empezar

1. Extraé todo el ZIP y abrí la carpeta en VS Code.
2. Con el SDK y la extensión de Dart instalados, abrí `servir.dart` y elegí
   **clic derecho → Debug**. La dirección sigue siendo **http://localhost:8090/**.
3. Buscá y elegí la ruta y el tramo.
4. Completá Unidad de muestra, Largo y Ancho de muestra, Inspeccionado por,
   EST. INICIO y EST. FINAL. Los datos del camino y la fecha se completan
   automáticamente.
5. Registrá los deterioros y los cuatro aspectos de seguridad vial.
6. Revisá cada formulario con el botón amarillo **Vista previa**, siempre
   visible al desplazarte por la ficha. Se muestra ajustado al ancho; no hay
   otras opciones de tamaño.
7. Descargá **PDF de esta muestra** o **Excel del formulario (.xlsx)**.

La instalación y la PWA están descritas en `INICIAR_EN_VSCODE.md`.

## Formularios oficiales

Esta versión utiliza los archivos aportados:

- `Formulario_Limpio.xlsx`: su hoja original con URCI y seguridad vial.
- `01 RVNL - Indicador de Eficacia - VF.xlsx`: sus formularios oficiales por unidad,
  las imágenes originales de **Curvas** y la hoja **RESUMEN**.

Se conservan los textos fijos, títulos, logotipos, colores, bordes, fuentes,
combinaciones, dimensiones y distribución del Excel. La aplicación llena
los espacios de datos y resultados. La hoja de consulta Curvas se adapta
a los deterioros registrados, como se explica más abajo. El croquis se añade en el
recuadro reservado para el esquema, cuando se dibuja.

Los archivos originales se incluyen sin cambios dentro de `plantillas/`.
La lista `plantillas/originales.json` permite verificar sus huellas SHA-256.
No se deben reemplazar por las descargas llenas de una inspección.

## Descarga de Excel

La descarga es un único **.xlsx**, listo para abrir en Excel:

- **Muestra 01**, **Muestra 02**…: una copia del formulario oficial F_UM por
  cada muestra creada, con URCI y seguridad vial en su distribución original.
- **Curvas 01**, **Curvas 02**…: inmediatamente después de su muestra, sólo
  las figuras originales de los deterioros que tengan datos en esa muestra.
  Si no hay datos de deterioros, no se crea una hoja de curvas vacía.
- **Resumen**: los niveles correspondientes a las muestras seleccionadas del
  formulario. Si hay más de diez, se repite la hoja oficial de resumen en
  páginas numeradas, dentro del mismo archivo y sin agregar filas al formato.

No se exportan Instructivo, EFICACIA, Deterioros, Listas ni las unidades sin
usar de la plantilla. Los textos, formatos, logos y medidas de las hojas
oficiales se conservan. Las deducciones y calificaciones se calculan en la
aplicación; al cambiar las mediciones, descargá nuevamente el informe.

Desde una muestra o Resúmenes, **Excel del formulario** incluye todas las
muestras activas de ese formulario. Desde **Mis formularios**, **Descargar
formularios en un Excel** reúne los formularios del filtro y búsqueda actuales;
cada uno mantiene su resumen separado. La Papelera siempre queda fuera.
El dibujo de cada muestra se añade únicamente a su propio recuadro de croquis.

## PDF y vista previa

El PDF se llena sobre fondos obtenidos directamente de los rangos de los
formularios originales. Conserva sus cuadros, textos y logotipos. Los campos
se colocan en sus espacios, con las alineaciones, decimales y reglas de color
leídas de las plantillas. No agrega encabezados ni notas fuera del formulario.

La descarga de una ficha contiene URCI, seguridad vial y el resumen por sección.
Si la muestra tiene deterioros con datos, añade al final una hoja con sus curvas
y la lectura de polvo si corresponde. Sin datos de deterioros se conservan sólo
los tres formularios, sin agregar una hoja de curvas vacía.
Cada uno tiene su vista previa y descarga individual. Los espacios incompletos
quedan en blanco y los resultados pendientes continúan indicándose en la app.

La hoja **Curvas** incluye sólo los deterioros con cantidades positivas
registradas; omite los pendientes, los ceros y los marcados Sin deterioro.
Las seis curvas (81, 82, 83, 85, 86 y 87) pueden aparecer de forma independiente
con cualquier severidad. Cada gráfico usa su propia imagen original, sin recortes
ni deformaciones. Una indicación en la pantalla muestra qué curvas se incluirán
y se actualiza al agregar o borrar cantidades, o al marcar Sin deterioro.
La distribución se adapta a la cantidad de figuras (A4 o A3). El polvo se
incluye cuando tiene severidad elegida, con su deducción fija y sin gráfica.
La curva general URCI sigue disponible en el detalle del cálculo de la app.

En el PDF y el Excel se añaden guías para las mediciones actuales: densidad en
el eje inferior, cruce con L/M/H y lectura hacia la izquierda. Las guías son
objetos superpuestos; las imágenes originales se conservan sin cambios.
Cada muestra conserva su propia hoja de curvas con sus mediciones,
sin combinar tipos, densidades o deducciones de otras muestras.

Los PDF y Excel respetan los decimales y los formatos propios de sus campos.
La suma utiliza los valores completos del motor, anteriores al redondeo de
presentación. Las reglas originales del resumen pueden ocultar visualmente
algunos ceros; el valor numérico se conserva en la celda y en la aplicación.

## Área de muestra

La pantalla tiene dos casillas obligatorias: **Largo (m) × Ancho (m)**,
como la plantilla. Ambas medidas deben ser mayores que cero. La aplicación
calcula el área en m² automáticamente y usa ese producto para las densidades,
el formulario, el PDF y el Excel. No hay captura manual de área.

Las fichas anteriores conservan sus datos. Si sólo tenían un área directa,
se deben completar las medidas reales para obtener el cálculo actualizado;
no se inventan dimensiones. Una medida ausente o inválida deja el URCI pendiente.

**Observaciones** permanece vacío hasta que el inspector escriba algo. Se
exporta únicamente ese texto, sin agregar medidas, explicaciones ni notas.

## Densidades y valor deducible

Se mantiene el motor validado contra las figuras métricas del TM 5-626:

- Densidad = cantidad medida ÷ área de muestra × 100.
- 81, 82 y 87 usan cantidades en metros; 83 y 86, en m²; 85, número de huecos.
- L = Baja, M = Media y H = Alta. Cada severidad se consulta en la figura
  correspondiente a su deterioro.
- El polvo no necesita densidad: L = 2, M = 4 y H = 15.
- El VDT suma todas las deducciones sin redondearlas antes.
- q cuenta cada deducción individual mayor que 5. El polvo bajo y medio se
  suma al VDT; el alto también aumenta q.

Los puntos fuera de dominio y los datos pendientes no producen lecturas
inventadas. Los detalles del método y sus aproximaciones están en
`METODOLOGIA.md`.

## Estaciones y guardado

| Captura en km | PDF y Excel |
| --- | --- |
| `0,0` | `0 + 000` |
| `7,91` | `7 + 910` |
| `12,005` | `12 + 005` |

Se conservan el guardado automático, **Mis formularios**, el catálogo vial,
los identificadores, las jornadas históricas y la base local
`mopt-urci-local-v1`. Usá el mismo origen **localhost:8090** y el mismo perfil
del navegador para conservar el acceso a tus fichas.

Reemplazá juntos los archivos al actualizar. Si aparece **Actualizar aplicación**,
pulsalo para preparar los recursos nuevos para el uso sin conexión. La PWA y
las pestañas de ese mismo origen comparten los datos locales.

## Verificación

```sh
npm test
dart analyze servir.dart
python verificacion/servidor_test.py
```

El informe de esta entrega está en `verificacion/PWA_V018.md`. Las pruebas de
preservación comparan el contenido de los paquetes Excel y los campos
permitidos; no se limitan a comprobar una captura de pantalla.
