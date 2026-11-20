# MOPT URCI v0.15: avance en revisión

Fecha: 10 de noviembre de 2026.

## Implementación

- Nuevo formulario crea una identidad independiente, incluso para la misma
  ruta, sección y fecha. Agregar muestra incorpora una unidad al formulario
  abierto. La pantalla indica el formulario y la muestra actual.
- Mis formularios muestra una tarjeta por formulario, sus muestras y filtros
  de borradores, completados, archivados y Papelera.
- Corregir ruta es una acción distinta y aplica a todas las muestras del
  formulario. Se conservan sus identificadores, mediciones y observaciones.
- Eliminar formulario o muestra solicita confirmar el alcance y mueve a la
  Papelera. La restauración conserva los datos originales. Las eliminadas se
  excluyen de promedios y exportaciones.
- Las transacciones rechazan guardados atrasados de muestras eliminadas y
  conservan las referencias de los demás caminos de la jornada.
- Se conservan las cinco tablas y la versión de la base local, los registros
  anteriores, las plantillas oficiales, las curvas y el puerto 8090.

## Verificación realizada

Resultados: `npm test`, 84 pruebas aprobadas; `dart analyze servir.dart`, sin
incidencias; `python verificacion/servidor_test.py`, 7 pruebas aprobadas.


Las pruebas de código cubren formularios independientes, incorporación de
muestras, datos históricos, corrección de ruta, identificadores repetidos,
exclusión y restauración en los promedios, estados, orden de muestras y
unidades antiguas fuera del promedio, además de las verificaciones anteriores
del motor, PWA, curvas y preservación de plantillas.

Se revisaron en el navegador la creación del primer formulario, su primera
muestra completa con URCI 59 y seguridad vial 72, la incorporación de una
segunda muestra, su nota escrita y la tarjeta del formulario con dos muestras.
Se corrigió un problema de interacción rápida durante el cambio de muestra:
los controles anteriores quedan desactivados hasta completar la navegación.

## Pendiente

La prueba de interfaz se interrumpió antes de completar la creación del segundo
formulario y la comprobación de filtros, eliminación, cancelación, restauración
y recarga de datos. Estos flujos están implementados, pero no se presentan como
verificados en el navegador en esta entrega de avance.

La prueba adicional de IndexedDB real está preparada en
`verificacion/papelera-db.mjs`; aún no se ejecutó. Trabaja en una base aislada
con identificadores nuevos y no modifica la base de la aplicación. Para
prepararla en un sitio web temporal de QA:

```sh
python verificacion/preparar_db_qa.py /ruta/raiz_web_temporal
```

La página generada queda en `qa-db/papelera-db.html`. Comprueba restauración,
conservación de datos, rechazo de guardados antiguos y reversión completa de
transacciones. El lanzador normal no sirve los archivos de verificación.

El trabajo está guardado como avance; falta terminar esa revisión antes de
considerar validada la nueva gestión de formularios y Papelera.
