> Actualización v0.9: este documento conserva el análisis del catálogo realizado
> en v0.7. La seguridad vial y la eficacia se incorporaron en v0.9 después de
> contrastar las fórmulas del archivo de eficacia aportado. Ver `LEEME.md` y
> `verificacion/seguridad_fuente.json`.

# Documentos aportados: aplicación al proyecto URCI

Revisión del 8 de noviembre de 2026. Aplicación resultante: MOPT URCI v0.7.

## Utilidad de cada documento

| Documento | Contenido comprobado | Uso en esta versión |
|---|---|---|
| Red Vial Nacional 2024.xlsx | Hoja RVN_0524: 1.219 secciones de control de 336 rutas. Hoja Travesías: 116 secciones de 96 calles de travesía. También contiene códigos, resúmenes y puentes. | Catálogo de consulta, búsqueda y selección de referencias para caminos y fichas. |
| red nacional heredia.rtf | Inventario SIGVI de Heredia con 109 códigos de camino. Muestra las fechas 06/03/2020 y 27/11/2020. | Correspondencia entre códigos de camino y secciones de control. Los 109 códigos coinciden con registros del Excel de 2024. |
| Libro1.xlsx | Materiales: 79 registros. Equipos: 436. Actividades: 124. Personal: 536. Hoja5 vacía. | Referencia para diseñar módulos de recursos y actividades. Sus datos personales no forman parte del catálogo vial generado. |

Los registros de Libro1 son filas de catálogo, no conteos comprobados de
elementos únicos. Materiales incluye códigos y unidades. Equipos incluye
identificación, descripción, región y categoría. Actividades contiene códigos,
unidades y categorías. Estas hojas no aportan las tarifas y cantidades de
trabajo necesarias para calcular por sí solas costos de una intervención.

## Alcance geográfico

El catálogo integrado contiene **1.335 secciones de control**: 1.219 RN y
116 CT. En Heredia hay **94 secciones RN de 35 rutas**, más **15 secciones CT**.
Los 109 códigos del RTF se vincularon a esas 109 secciones por su identificador.

Ejemplo comprobado: el código `4-0762-00` corresponde a la sección `40762` de
la RN 507. Su descripción en la hoja RVN_0524, fila 785, es el tramo entre
Finca Coyol (cruce Colonia San José) y Las Marías (cuadrante/escuela). La longitud
de referencia es 8,635 km y la superficie declarada es lastre o grava.

La RN 507 presenta seis secciones en el archivo: 40761, 40762, 40763, 40771,
40772 y 40780. La primera declara tratamiento superficial múltiple y las otras
cinco lastre o grava. La aplicación distingue la referencia general de una
ruta mixta de la superficie actual de la sección que se inspecciona.

## Campos incorporados y procedencia

| Campo | RVN_0524 | Travesías |
|---|---|---|
| Ruta | G | E |
| Sección de control | B | F |
| Provincia y cantón | D / E | C / D |
| Descripción del tramo | AX | AG |
| Longitud de referencia en km | K | G |
| Tipo de superficie | BE / BF | AM, con descripción del catálogo de códigos |
| Ancho de referencia | BH | AO |
| TPD | BM | AS |
| Carriles | BG | AN |
| Fecha de inventario / reconocimiento | AY / AZ | AH / AI |

Los nombres de cantón se obtuvieron de la hoja Longitud Por Provincia del mismo
archivo. Se conserva la hoja y fila de procedencia en cada registro. Las fechas
de texto permanecen como aparecen en la fuente. Las fechas de Travesías
almacenadas como números de Excel se convierten utilizando la base de fecha
del libro. El RTF aporta el código de camino como alias de búsqueda.

Los identificadores RN y CT se mantienen separados. Para comparar con caminos
guardados se reconocen equivalencias como `507`, `0507` y `RN 507`; el registro
anterior conserva su identificador interno, código y datos editables.

## Fechas y revisión de datos

El nombre y los encabezados del Excel indican una base de 2024. Las filas
incluyen fechas de inventario y reconocimiento anteriores. El RTF muestra
fechas de 2020. Por ello, la aplicación trata esos valores como referencia
documental y permite confirmar la superficie actual de cada sección de
inspección.

Se marcaron **17 anchos para revisar**, utilizando el criterio descriptivo
de valores inferiores a 2 m o superiores a 40 m. Esto identifica valores
atípicos y no demuestra que todos sean errores. Un caso es la sección 40780
de la RN 507: tanto la referencia consultada como el Excel incluyen 0,47 m.
La pantalla muestra el valor de la fuente y solicita revisarlo antes de usarlo.

La longitud total de una sección de control y su ancho de inventario no
equivalen al largo y ancho de una unidad de muestra URCI. Las estaciones y las
dimensiones de cada muestra se ingresan como datos de campo. La columna de
longitud acumulada no se utiliza para inventar progresivas oficiales.

## Cambios concretos en la aplicación

- Pantalla **Catálogo vial** con búsqueda por ruta, sección, código de camino
  y lugar; filtros de provincia, tipo de vía y superficie de referencia.
- Consulta paginada con descripción, longitud y ficha de datos de origen.
- Acción **Registrar ruta** que evita duplicar caminos ya existentes.
- Acción **Nueva ficha** que incorpora la referencia del control seleccionado.
  Se pueden crear subdivisiones de inspección mediante códigos como 40762-A.
- Campo de confirmación de la superficie actual. El cálculo queda pendiente
  si esa superficie no está confirmada como no pavimentada.
- Referencia conservada con la sección de inspección. Al seleccionar otro
  control para un identificador ya vinculado se solicita usar otro identificador.
- Catálogo y archivos incluidos en el caché para consulta sin conexión después
  de una primera carga completa.

Los archivos de entrada se conservaron. El paquete contiene la extracción vial
y sus referencias, sin copiar los libros originales ni la hoja de personal.

## Verificación

Pasaron **23 pruebas automáticas**: 15 del cálculo URCI y 8 del catálogo.
Los conteos de filas, referencias, equivalencias de códigos, búsquedas y
filtros se comprobaron contra las fuentes. El cálculo conserva los resultados
59 y 25 de los ejemplos del TM 5-626.

En el navegador se verificó la actualización desde v0.6 conservando su ficha de
control 59; búsqueda de la RN 507 y del alias 4-0762-00; filtro de cinco tramos
de lastre de esa ruta; quince travesías de Heredia; creación de una ficha desde
40762; medidas vacías al crear la muestra; confirmación de superficie y
conservación de los caminos existentes. Las medidas y estados usados para esta
prueba fueron datos de prueba y no constituyen una evaluación real de la ruta.

También se detuvo el servidor, se recargó la aplicación y se buscó el código de
camino y la RN 507 en el catálogo almacenado en caché.

La extracción reproducible está en `verificacion/extraer_catalogo.py` y la
trazabilidad y conteos en `verificacion/catalogo_fuentes.json`. La metodología
numérica URCI se documenta en `METODOLOGIA.md`.
