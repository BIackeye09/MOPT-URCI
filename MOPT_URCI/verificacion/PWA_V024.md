# Verificación v0.24: fechas y Eficiencia

Fecha: 17 de noviembre de 2026.

## Alcance

Desde/Hasta inclusivos en Mis formularios y Resúmenes de Eficacia, y en
Mis proyectos y Resultados por sección de Eficiencia. En el módulo 02 se
elige inicio o fin programado o ejecutado. Límites abiertos, limpieza del
rango y aviso de rango invertido. No se usan las fechas de creación como
sustituto de fechas de proyecto pendientes. Sin límites se conservan los
registros sin fecha. Las fechas se comparan como días civiles, sin UTC/local.

Las descargas de lista y su vista previa usan los registros mostrados.
Eficacia mantiene completos los formularios y sus muestras. Eficiencia
identifica el promedio de proyectos filtrados cuando corresponde.

En cada proyecto se añade una comparación legible de montos y plazos,
diferencias absolutas, revisión plegable con acceso al campo pendiente y
aclaración del plazo manual cuando difiere de los días entre las fechas.
Se conservan datos vacíos, ceros válidos y fórmulas oficiales de las notas.

## Pruebas

npm test: 144 pruebas aprobadas, ninguna fallida, más el escenario DOM e
IndexedDB de Eficiencia. Las doce pruebas nuevas comprueban días bisiestos,
límites inclusivos y abiertos, rangos inválidos, formularios completos al
filtrar, cada fecha de proyecto, búsqueda/estado/Papelera, ausencia de mutación,
diferencias en colones/días, ceros, decimales, pendientes y plazo manual.
El escenario de interacción también comprueba filtros y botones de descarga.

En navegador se crearon dos proyectos de la misma sección, con inicio en
enero y febrero. Consultar sólo el 1 de enero mostró un proyecto, con nota 90.
Cambiar la fecha consultada a fin de ejecución dio cero proyectos.
El rango invertido mostró aviso y deshabilitó la descarga. Limpiar recuperó
ambos proyectos. El promedio filtrado fue 90; sin filtro permaneció pendiente
por el proyecto incompleto de febrero. Recargar conservó ambos proyectos.

Revisar Monto ejecutado enfocó el campo correcto. Cero mostró ahorro real,
y un plazo manual de 8,5 días mostró la aclaración frente a 11 días de calendario.
Restablecer 11 días y 1100000 colones dio nota 90. Eficacia incluyó la inspección
del 17 de noviembre al consultar ese mismo día; una fecha anterior la excluyó.

El Excel real de la lista filtrada tuvo sólo Formulario y RESULTADOS,
una fila de proyecto, sin el proyecto de febrero y H5=90. El PDF real tuvo
las dos hojas originales. Se revisó visualmente su página de resultados.
Plantillas, vendor, motores de URCI/seguridad, bases de datos y exportadores
permanecieron idénticos a v0.23. No hay migración del guardado.

filtro-fechas.js y eficiencia-detalle.js están en la lista pública de
servir.dart y en la caché v024r1. Se mantiene localhost:8090.
