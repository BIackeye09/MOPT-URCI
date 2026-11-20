# Método numérico URCI v0.6

## Seguridad vial v0.22

El método nuevo de seguridad es `proporcional-v1`, descrito en LEEME.md y
verificacion/PWA_V022.md. Cambia la puntuación individual de seguridad según
las medidas y notas registradas. No modifica la lectura de curvas URCI.
Las evaluaciones históricas sin este marcador conservan las fórmulas
discretas originales hasta su actualización explícita.

Fecha: 8 de noviembre de 2026. Motor: `tm5-626-raster-metrico-0.6`.

## Presentación en la aplicación v0.17

La exportación utiliza los formularios aportados y llena solamente sus campos
de captura y resultados. Los libros de referencia se conservan sin cambios.
Los PDF usan fondos de sus rangos oficiales, con sus textos, cuadros y
logotipos, y el formato numérico y la alineación de los campos se toman del Excel.

La hoja de consulta contiene exclusivamente las imágenes originales de los
deterioros con cantidades positivas. El polvo se incluye con una severidad
seleccionada y no tiene densidad ni gráfica. La distribución A4/A3 se adapta a
la selección; sólo cambia la hoja Curvas de las copias, no los formularios.
Las guías se proyectan sobre los ejes de cada imagen original por separado.
No se reutiliza una misma gráfica para distintos deterioros. El PDF completo
añade esta hoja después de los formularios cuando existen datos activos; la
vista previa individual conserva una sola sección. La selección se reconstruye
con los datos actuales de la muestra en cada descarga.

Las densidades y deducciones proceden de este motor. El VDT utiliza la suma
sin redondeo previo; el formato del campo oficial determina los decimales
que se muestran. Un cero válido se conserva como número y los resultados
pendientes quedan vacíos. Las reglas visuales del Excel original se mantienen.

Largo y ancho son obligatorios. El área se calcula como su producto para el
motor y todas las exportaciones, sin depender de un área manual antigua.
Las medidas deben ser finitas y mayores que cero. Si falta alguna, el cálculo
queda pendiente. Las observaciones se exportan exclusivamente como las escribió
el inspector; no se añade automáticamente el área ni ninguna nota.

Los datos y resultados exportados corresponden a la inspección actual. Para
recalcular tras editar mediciones, se utiliza la aplicación y se vuelve a
exportar. El motor, sus trazos y su criterio q no se modifican en esta versión.

El Excel final reúne las copias de F_UM necesarias, cada una seguida por su
hoja individual de curvas si hay datos, y los resúmenes por formulario. No se
copian hojas auxiliares ni unidades vacías. Se conserva sin modificaciones el
banco original de estilos y el tema; se trasladan los textos fijos y sólo las
dependencias utilizadas (logotipos, figuras, comentarios y configuración de
impresión). Las referencias de clasificación a Listas se sustituyen por los
resultados calculados. Más de diez muestras permanecen en el mismo libro,
con páginas de resumen adicionales que conservan las diez filas originales.

La presentación deja en blanco las cantidades y deducciones de deterioros
sin medición, severidades vacías y severidades de polvo no seleccionadas.
El motor conserva los ceros internos para sumar VDT y contar q correctamente;
sólo se modifica su presentación. Los ceros escritos y los resultados válidos
igual a cero permanecen disponibles. No se ocultan ceros con estilos de Excel.

## Fuente y digitalización

El motor utiliza las figuras originales del PDF aportado del TM 5-626,
apéndice C: figuras métricas para 81, 82, 85 y 87 y figuras comunes a ambos
sistemas para 83, 86 y URCI.

Department of the Army, *TM 5-626, Unsurfaced Road Maintenance Management*,
16 January 1995. https://www.wbdg.org/FFC/ARMYCOE/COETM/tm_5_626.pdf

`verificacion/digitalizar.py` utiliza corredores visuales para identificar cada
trazo en la imagen. Las semillas delimitan la búsqueda. El algoritmo suprime
líneas largas de cuadrícula y enmascara rótulos que interfieren con las curvas.
Interpola sus interrupciones entre puntos observados y aplica un ajuste
monótono para reducir oscilaciones de píxel.

Una transformación bilineal mediante las cuatro esquinas compensa la ligera
inclinación de los ejes escaneados. La misma transformación coloca las guías,
puntos y lectura del cursor en la aplicación.

`verificacion/digitalizacion.json` contiene las coordenadas y la proporción de
columnas donde se encontró trazo raster. Esa proporción describe la extracción,
no su exactitud. Las imágenes `verificacion/revision-*.png` permiten comparar
los trazados con las figuras originales. `verificacion/procedencia.json`
conserva las huellas SHA-256 del PDF y las imágenes.

Las tablas numéricas del Excel anterior no intervienen en este motor.

## Secuencia de cálculo

1. Se utiliza solo la modalidad activa de cada severidad: total directo o suma
   de mediciones. Las cantidades originales se conservan sin redondear.
2. Densidad = cantidad ÷ área × 100. El área está en m². Las cantidades son m
   para 81, 82 y 87; m² para 83 y 86; y número de huecos para 85. Los ejes
   utilizados corresponden a esas unidades métricas.
3. La deducción se interpola linealmente entre puntos próximos del trazo. Para
   el polvo se aplican directamente 2, 4 o 15 según severidad L, M o H.
4. El VDT suma deducciones sin redondearlas. Se utiliza suma compensada para
   reducir el error numérico.
5. q cuenta deducciones individuales mayores que 5,0, siguiendo 3-4.b(3).
   El conteo utiliza el valor interno anterior al redondeo de presentación.
6. Se lee el URCI en la curva q de C-8. Para q = 0 o 1, la recta es
   URCI = máximo(0, 100 − VDT). Las curvas q = 2 y q = 3 llegan a cero antes
   del final del eje; se conserva cero después de ese cruce, dentro de VDT ≤ 200.
7. El URCI se redondea al entero más cercano para mostrarlo y clasificarlo.
   La lectura previa sigue disponible en la ficha.

La clasificación usa los cortes 85, 70, 55, 40, 25 y 10 de la figura 3-1:
Excelente, Muy bueno, Bueno, Regular, Malo, Muy malo y Fallado. Se clasifica el
entero mostrado para mantener coherencia entre el número y su categoría.

## Criterio q en la fuente

El procedimiento escrito dice mayores que 5. La figura C-8 dice iguales o
mayores que 5. Esta versión adopta explícitamente el procedimiento escrito.
Si existe una deducción exactamente igual a 5, la ficha informa la situación.
El resultado interno conserva el conteo alternativo inclusivo (`qInclusivo`).
El conteo no se decide a partir de números redondeados de pantalla.

## Controles contra el manual

Los controles completos utilizan cantidades originales de las muestras,
no sus deducciones publicadas como entradas del motor.

| Control | VDT del manual | VDT digitalizado | q | URCI del manual | Lectura digitalizada | Entero mostrado |
|---|---:|---:|---:|---:|---:|---:|
| Figura 3-3 y cálculo de 3-4, muestra métrica de 167,4 m² | 64 | 65,11249 | 3 | 59 | 58,91357 | 59 |
| Figura 3-2, muestra métrica de 130 m² | 132 | 133,20663 | 4 | 25 | 24,83150 | 25 |

El primer control usa 30,5 m de 81 L, 83,7 m² de 83 M, polvo M y 48,8 m de
87 M. El segundo usa 30,5 m de 81 M, 61 m de 82 H, polvo L, 45,5 m² de 86 M
y 84,5 m² de 86 H.

La curva URCI también se comprueba de manera aislada con las deducciones
publicadas [13, 29, 4, 18] y [19, 36, 2, 31, 44]. Produce los enteros 59 y 25.

En los siete controles individuales de deducción, la mayor diferencia observada
respecto del entero publicado es aproximadamente 1,315 puntos: el trazo de
corrugaciones M a densidad 50 produce cerca de 30,315, mientras el texto indica
29. Se conserva la lectura del trazo. No se alteraron los datos para forzar ese
valor textual. El VDT puede diferir del ejemplo impreso aunque el URCI final
coincida después de redondearlo.

Estos controles y las superposiciones permiten revisar la aproximación.
La coincidencia en dos muestras no establece una cota de error para todas las
combinaciones de deterioros.

## Dominio y datos incompletos

| Entrada | Tratamiento |
|---|---|
| Densidades de 81, 82 y 85 | Dominio de 0 a 50 |
| Densidades de 83 y 86 | Dominio de 0 a 100 |
| Densidad de 87 | Dominio de 0 a 70 |
| VDT superior a 200 | Se informa fuera de rango y se retira el índice |
| q superior a 7 | Se informa que falta curva publicada para ese q |
| VDT inferior al comienzo del trazo q | Se informa fuera del tramo digitalizado |
| Área vacía, cero o inválida | Se solicita corregirla y se retira el índice |
| Deterioro sin evaluar | Se mantiene pendiente |
| Deterioro presente con datos inválidos o sin cantidades positivas | Se solicita corregir la captura |
| Ausencia de deterioro confirmada | Aporte cero, conservando las mediciones inactivas anteriores |
| Unidad incompatible de un borrador anterior | Se solicita revisar la unidad |
| Sección sin confirmar como no pavimentada | Se solicita confirmar la superficie |

Los comienzos conservados de q = 2 a q = 7 son VDT 14, 20, 25, 28, 31 y 40.
Son los límites de los tramos extraídos en esta versión. Por debajo no se agrega
una continuación estimada. Los q superiores a 7 no se sustituyen por q = 7.

## Promedio y persistencia

La sección promedia las lecturas URCI sin redondear de sus muestras
seleccionadas. Luego redondea el promedio para mostrarlo. Si falta el resultado
de alguna seleccionada, informa cuántas siguen pendientes y deja el promedio
pendiente. Las muestras no seleccionadas conservan su ficha individual y se
excluyen de ese promedio.

Los resultados se reconstruyen desde las cantidades al abrir o editar una
ficha. El motor conserva los datos de campo y retira el índice anterior cuando
dejan de ser válidos. La base de datos y su versión son compatibles con v0.5.

## Verificación incluida

Las 15 pruebas de `verificacion/motor.test.mjs` cubren ejemplos, polvo, umbral
q, unidades, áreas y cantidades inválidas, modalidades de captura, límites,
clasificación, promedio, edición, reapertura, monotonía y proyección sobre los
ejes. Todas pasaron.

En el navegador se comprobó el control 59, sus gráficas, guardado y reapertura,
retiro del resultado con área cero o densidad fuera de rango, y promedio de
sección. También se detuvo el servidor y se recargó la aplicación: abrió la ficha
y recalculó una edición utilizando archivos en caché.

Ver `verificacion/resultados.json`. Repetir la extracción requiere Python,
numpy, scipy y Pillow. La aplicación ya contiene los datos generados y se
ejecuta en el navegador sin esas dependencias.


## Interfaz v0.9 y formularios de seguridad vial

El núcleo de lectura de curvas se conserva. La interfaz v0.9 reutiliza un
único encabezado y presenta las clasificaciones de transitabilidad de la hoja
`Listas` del archivo de eficacia aportado, incluidos los términos Pobre y Muy
pobre. El resumen de sección promedia los índices enteros de las muestras,
como los valores que se ingresan en la plantilla. Incluye los ceros válidos
y mantiene pendientes los promedios si falta evaluar una muestra seleccionada.

La seguridad vial aplica las fórmulas de `F_UM-01!AQ11`, `AQ13`, `AQ23`, `AQ35`
y `AQ50`. Los márgenes se califican con el mínimo de erosión, estabilidad y
vegetación. El índice combina 60 % de ese mínimo con 40 % del señalamiento.
Se requieren todos los aspectos: la ausencia de una medición no se interpreta
como un buen estado ni como cero. La eficacia sigue `RESUMEN!D40`.

Los valores de inventario vial son referencias históricas. El área, la unidad,
las estaciones, el inspector y las observaciones corresponden a la captura
actual. La condición de seguridad vial no se deduce del número de ruta.
# Vistas previas y calificación en v0.10

La fórmula de densidad y el criterio q se mantienen conforme al apartado
3-4.b del TM 5-626. La interfaz permite seguir la operación por deterioro y
severidad y ver las guías hasta la curva y el eje izquierdo. Para URCI, el eje
inferior representa VDT y se utiliza la curva q correspondiente. El motor
numérico y sus trazos digitalizados conservan los controles existentes.

El formulario limpio aportado se usa como referencia de la organización del
PDF URCI, incluidos los puntos 15 (VDT), 16 (q), 17 (URCI) y 18 (calificación).
La escala de transitabilidad de la aplicación y de las fórmulas exportadas
comparte una misma definición, cotejada con Listas!F3:G9 del indicador de
eficacia: 85 Excelente, 70 Muy bueno, 55 Bueno, 40 Regular, 25 Pobre,
10 Muy pobre y 0 Fallado. Cada límite inferior es inclusivo; el superior es
el siguiente límite, exclusivo, salvo el máximo 100. Los datos pendientes
conservan su estado pendiente.

Las vistas previas generan el mismo PDF de salida y lo dibujan localmente con
PDF.js. No sustituyen el cálculo con una imagen ni permiten alterar el resultado
desde la vista previa. Al volver a abrirlas se genera una nueva versión a partir
de las entradas actuales.

