# Verificación de v0.21: 02 Eficiencia

Fecha: 13 de noviembre de 2026.

## Fuente y alcance

Se incorporó el libro original `02 RVNL - Indicador de Eficiencia - VF.xlsx`.
Su SHA-256 se conserva en `plantillas/originales.json`. El original no se
reescribe. Se llenan copias de sus espacios de datos y resultados.

El módulo permite crear proyectos independientes, elegir ruta y sección,
reutilizar la ruta de una inspección, registrar planificación y ejecución,
calcular puntajes, guardar borradores, reabrir, buscar, filtrar, enviar a
Papelera y restaurar. Los resultados por sección se agrupan por sección y
año; esperan a que estén completos todos sus proyectos activos.

La sección 01 continúa utilizando sus mismas tablas, identificadores y
versión de IndexedDB. La sección 02 tiene un guardado separado en el mismo
origen. No se migran ni reescriben las inspecciones existentes.

## Cálculos

Se preservan la ponderación 50/50, la escala y los rangos de las fórmulas de
RESULTADOS. Las variaciones se redondean a 12 decimales antes de puntuar,
tanto en la aplicación como en Excel, para estabilizar los límites.
Las fórmulas exportadas comprueban las entradas numéricas y los divisores:
una entrada pendiente no se convierte en una puntuación de buen estado.

Existe una discrepancia en la propia plantilla: Listas dice costo <=20 %
para 100 y <=40 % para 50, pero las fórmulas usan <20 % y <40 %. Se conservan
los criterios de las fórmulas y se explica la diferencia en el desplegable
de cálculo. En 20 % exacto el costo recibe 75; en 40 %, 25.

Las duraciones se proponen con los días transcurridos entre fechas, sin
incluir el día inicial, y admiten el plazo registrado por el inspector.
Al escribirlo manualmente no se reemplaza con cambios posteriores de fecha.

## Exportaciones

- Un XLSX contiene únicamente Formulario y RESULTADOS, sin hojas de
  instrucciones, Listas ni filas sobrantes. Más de 42 registros crean
  copias de las dos hojas oficiales dentro del mismo libro, conservando
  las referencias de las fórmulas entre cada pareja.
- Los estilos y el tema exportados son idénticos a los de la plantilla.
  Las fechas son números de Excel con su formato de fecha original y los
  montos conservan el formato original en colones.
- El PDF llena un fondo obtenido del documento oficial. Omite las filas
  no utilizadas y conserva sus cabeceras, columnas, colores y alineaciones.
- La vista previa utiliza ese mismo PDF, ajustado al ancho, con su botón
  amarillo fijo. Un borrador conserva en blanco sus resultados pendientes.

## Verificación realizada

- 107 pruebas unitarias aprobadas, incluyendo las de Eficacia y 12 nuevas
  de Eficiencia. Cubren datos vacíos y ceros, fechas, límites, escala,
  ponderación, promedios, Papelera, preservación de estilos y paginación
  para más de 42 proyectos.
- Prueba de interacción con DOM e IndexedDB simulados incluida en
  `npm run test:interfaz`: crear, completar, guardar, reabrir, limpiar un
  monto, eliminar, rechazar un guardado antiguo de un proyecto eliminado,
  restaurar y resumir. También comprueba el retorno a la lista y conserva
  un registro previo de Eficacia.
- La evaluación del módulo real app.js y de sus dependencias pasa el
  arranque y la navegación de Eficacia, conservando las cinco tablas.
- El control de recursos públicos y de la PWA incluye todos los nuevos
  módulos, la plantilla, el fondo PDF y el mapa de campos. El caché se
  actualizó a v021r1 y se conserva localhost:8090.
- Se importó y recalculó el Excel con Artifact Tool: índices 90, 67,5 y
  pendiente; sin errores de fórmula en los rangos revisados.
- LibreOffice Calc abrió el XLSX y conservó los índices 90, 67,5 y
  pendiente. En una copia de prueba se cambiaron duración y monto y se
  retiraron los valores en caché para forzar el recálculo: el índice cambió
  de 90 a 22,5 y la calificación a Muy Malo. La fórmula de costo en 20 %
  exacto se comprobó con 75 puntos.
- PDF y Excel renderizados y revisados: fechas legibles, tres proyectos
  sin filas sobrantes, resultado pendiente vacío y formatos oficiales.
  Se revisó también el PDF de un proyecto sin completar.
- Las tres plantillas originales conservan sus huellas. Los cálculos y
  exportaciones de URCI, incluidas las curvas ordenadas de v0.20, pasan
  sus pruebas anteriores.

Limitaciones: Chromium no puede iniciarse por las restricciones de sockets
del entorno, por lo que no se completó la interacción en navegador real.
Se verificó la lógica de interfaz con DOM e IndexedDB simulados. No se
ejecutó Microsoft Excel ni el lanzador Dart; la comprobación de la hoja
de cálculo se hizo con LibreOffice Calc y Artifact Tool.
