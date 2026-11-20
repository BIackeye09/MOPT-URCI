# Verificación de v0.22: seguridad vial proporcional

Fecha: 16 de noviembre de 2026.

## Criterio solicitado

El ejemplo acordado para Estabilidad y drenaje Regular relaciona 5–10 cm
con 85–60 puntos mediante interpolación lineal inversa. Se aceptan decimales.
Para más de 20 cm se acordó partir de 40 puntos y restar 2 puntos por cm,
con límite inferior cero: 40 cm y profundidades mayores producen cero.
No se impone una profundidad máxima ficticia. Los límites completos y el
criterio para Desnivel figuran en LEEME.md y RANGOS_SV de seguridad.js.

La plantilla original puntúa Estabilidad mediante selección (100/85/70/50/25).
Los porcentajes de su texto describen drenaje. Su uso como escala proporcional
es la modificación acordada para esta evaluación, no la regla original.
Vegetación y señalamiento ahora reciben notas manuales de 0 a 100.

Las inspecciones sin marcador de método conservan los cálculos históricos.
Sólo la acción explícita de actualización inicia el método nuevo en ellas.
No cambian los identificadores, las tablas existentes ni la base de Eficiencia.

## Comprobaciones automáticas

`npm test`: 116 pruebas aprobadas, ninguna fallida, incluidas las de
preservación de plantillas, estilos y relaciones de Excel; seguridad anterior,
URCI, resúmenes, Papelera, Eficiencia y PWA. También pasa el escenario de
interacción de Eficiencia con DOM e IndexedDB simulados.

Las nueve pruebas nuevas verifican decimales, límites de cada condición,
la disminución de dos puntos por cm y el piso de cero, notas manuales,
campos vacíos, cambios de selección, colapso confirmado, compatibilidad
histórica, guardado/reapertura y concordancia de exportaciones y resúmenes.
Un escenario adicional de arranque verifica las importaciones contra la
lista pública de servir.dart y la navegación, sin reescribir datos previos.

## Navegador real

Se creó una muestra de prueba, se completaron los cuatro aspectos y se
verificó: 6,37 cm Regular = 78,15; 10,01 cm fuera de rango = pendiente;
cambiar de Regular a Bueno conserva 7,5 cm y presenta error; 20 cm Malo = 40;
21,25 cm Muy malo = 37,5; 40 y 65 cm = 0. Una nota manual de 101 se rechaza.

Recargar la página conservó los datos y recalculó 76,89 de seguridad vial.
Se descargaron PDF y XLSX desde sus botones reales. El XLSX conserva las
hojas Muestra 01 y Resumen en este control sin deterioros. Se verificaron
78,15 en AQ13, 84,2 en AQ23, 75 en AQ35 y 76,89 en AQ50, junto a 6,37 cm.
Se renderizó y revisó la página de seguridad del PDF: textos oficiales,
casilla marcada, medida registrada y resultados legibles en sus espacios.

El service worker usa v022r1; seguridad-ui.js figura en la caché y en la
lista pública del lanzador. Se mantiene localhost:8090 en la distribución.
