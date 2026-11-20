# Verificación de MOPT URCI v0.10 — 9 de noviembre de 2026

## Funcionalidad entregada

- Vistas previas en datos de muestra, deterioros, seguridad vial y resultados,
  y en cada grupo de Resumen por sección.
- Las vistas previas generan el PDF real de cada formulario con sus datos
  actuales; permiten ampliar, cambiar de formulario, descargar y volver a editar.
- El PDF URCI adapta la estructura del formulario limpio aportado, incluidos
  encabezado, esquema, cantidades L/M/H, 21 filas de cálculo y puntos 15 a 18.
- El detalle muestra la operación de densidad, las guías sobre las curvas
  originales, la suma de deducciones y qué valores cuentan en q.
- La escala de transitabilidad se comparte entre interfaz y exportación,
  cotejada con Listas!F3:G9. Los ceros válidos se conservan en los vínculos XLSX.

La procedencia del formulario, ecuaciones, q y calificaciones está en
`previas_fuente.json`. El motor numérico y las curvas digitalizadas existentes
no se modificaron. El procedimiento sigue siendo una lectura aproximada.

## Pruebas automáticas

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 51 pruebas aprobadas |
| `dart analyze servir.dart` | Sin problemas |
| `dart format --output=none --set-exit-if-changed servir.dart` | Sin cambios |
| `python verificacion/servidor_test.py` con Dart real | 7 pruebas aprobadas |

Las pruebas nuevas cubren los ejemplos métricos, q por valores y severidades,
el límite estricto mayor que 5, polvo sin densidad, calificaciones entre 0 y
100, puntos de las guías y selección de formularios para borradores y resúmenes.
Se mantienen los controles numéricos URCI 59 y 25 y las comprobaciones de
catálogo, estaciones, guardado compatible y seguridad vial.

El servidor real sirve los módulos de vista previa y PDF.js con tipos MIME
JavaScript, incluidos los archivos `.mjs`. Mantiene puerto 8090 y conexiones
locales. Las bibliotecas, worker y fuentes se incluyen en el caché de la PWA.

## Recorrido observado en navegador

Con una ficha sintética de RN 507, sección 40762:

1. Abrir las vistas previas desde los cuatro bloques de la ficha.
2. Cambiar entre URCI, seguridad y resumen; ampliar al 150 % y volver a editar.
3. Abrir también el resumen directamente desde Resumen por sección.
4. Mostrar una vista previa con el área vacía, sin bloquear la consulta;
   descargarla como borrador y conservar pendientes sin una falsa calificación.
5. Restablecer el área y comprobar la nueva vista previa y descargas.
6. Comprobar las guías de densidad 18,22 y deducción aproximada 12,99 para
   81 Baja, y VDT 65,11 / q 3 / URCI aproximado 58,91 para la curva URCI.
7. Cambiar polvo medio a alto: la deducción cambia de 4 a 15, VDT de 65,11 a
   76,11 y q de 3 a 4. Restaurar el valor medio.
8. Cambiar el área de 167,4 a 200 m²: la lectura se actualiza a VDT 58,45 y
   URCI aproximado 63,34. Restablecer el área original y comprobar URCI 59.
9. Desplegar la tabla de calificación y comprobar el rango activo Bueno.

La vista previa se revisó también dentro de una pantalla de 390 píxeles. El
diálogo tuvo 367 píxeles útiles y 367 de ancho desplazable: no se produjo
desbordamiento horizontal. Los botones y la opción de ampliación permanecieron
accesibles y el PDF se dibujó correctamente.

## PDF y Excel

Se descargaron desde la aplicación los PDF individuales y el informe completo.
La ficha de control, con croquis, ocupa tres páginas: URCI, seguridad y niveles
de sección. El PDF URCI individual ocupa una página e incluye las dos estaciones
`0 + 000` y `7 + 910`, croquis, deducciones, q y calificación.

Los PDF se revisaron por extracción de texto y renderizado, incluidos el
borrador y un caso de inspector y observaciones extensas. Los textos extensos
continúan en páginas adicionales en lugar de recortarse.

El XLSX conserva sus tres hojas, encabezados, estaciones como texto, cantidades
numéricas y croquis. Un motor independiente de hojas de cálculo recalculó las
clasificaciones en los límites 0, 10, 25, 40, 55, 70, 85 y 100, y comprobó su
propagación al resumen. Cero se conserva como cero y recibe Fallado. No se
encontraron errores de fórmula en el archivo de control. Se revisó visualmente
la hoja URCI afectada por los nuevos rótulos; las otras vistas conservan su diseño.

## Límites

El Excel exporta el URCI y los valores deducibles calculados en la aplicación;
no convierte las curvas digitalizadas en fórmulas de Excel. Los cambios en
cantidades deben recalcularse desde la aplicación. La clasificación exportada
sí es una fórmula vinculada al URCI.

El caché sin red pasó las pruebas automáticas con archivos reales, incluidos
los nuevos recursos de vista previa. No se repitió un recorrido visual completo
con el servidor detenido: en la revisión anterior, la política de URL del
navegador de este entorno bloqueó esa observación. No se afirma haber realizado
una instalación nativa en Windows ni la acción de clic derecho de VS Code allí;
sí se comprobaron el servidor Dart y la configuración del proyecto.
