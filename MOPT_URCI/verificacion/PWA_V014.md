# Verificación de MOPT URCI v0.14

Fecha: 10 de noviembre de 2026.

## Correcciones completadas

Se mantienen las correcciones de área, vista previa y observaciones:

- Largo y ancho son dos casillas obligatorias. Su producto calcula el área
  usada en pantalla, densidades, PDF y Excel.
- La vista previa se ajusta automáticamente al ancho y no tiene selector
  de tamaño. El botón amarillo permanece fijo al desplazarse por la ficha.
- Observaciones queda vacío hasta que el inspector escriba algo. Los campos
  exportados contienen sólo su texto, sin notas automáticas.
- Las plantillas oficiales de referencia y sus formatos permanecen intactos.

Esta entrega completa el comportamiento de las curvas:

- Las seis imágenes originales de 81, 82, 83, 85, 86 y 87 están disponibles.
  Cualquiera puede aparecer de forma independiente con severidad L, M o H.
- La selección usa sólo cantidades positivas de deterioros activos de la
  muestra actual. Vaciar la cantidad o marcar Sin deterioro retira su figura.
- El polvo 84 se incluye sólo con una severidad elegida y conserva su valor
  fijo, sin densidad ni curva.
- La pantalla indica las curvas que se incluirán y actualiza esa indicación
  mientras se registran las cantidades.
- El PDF completo añade al final la hoja seleccionada. Con datos, la muestra
  de prueba tiene cuatro páginas: tres formularios y una hoja de curvas.
  Sin datos de deterioros conserva las tres páginas, sin añadir una hoja vacía.
- Las vistas previas y sus descargas individuales siguen mostrando una sola
  sección. La hoja Curvas del Excel selecciona las mismas imágenes originales.

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 75 pruebas aprobadas, ninguna omitida |
| `dart analyze servir.dart` | Sin incidencias |
| `python verificacion/servidor_test.py` | 7 pruebas aprobadas |

Las pruebas incluyen dieciocho combinaciones de curva y severidad, cada una
por separado en PDF. Verifican las dimensiones de la imagen original usada
para cada código y, en Excel, que la relación apunte únicamente a esa figura.
También cubren la descarga completa tras añadir y borrar datos, la ausencia
de curvas ajenas, polvo sin gráfica y la conservación de formatos oficiales.

Se probaron desde el navegador tres descargas reales: todos los deterioros,
ninguno y sólo 82, 85 y 86 con polvo M. Sus PDF contienen respectivamente
cuatro páginas con seis figuras, tres páginas sin hoja de curvas y cuatro
páginas con tres figuras. La selección no quedó limitada a 81, 83 y 87.

En la última muestra se usaron largo 30 m, ancho 5,58 m y cantidad 2 en
severidad L para 82, 85 y 86. Área: 167,4 m²; URCI: 91; seguridad vial: 72.
Se comprobó que borrar la cantidad de 82 retirara su código de la indicación
y que restituirla lo incorporara otra vez. No se borraron las medidas ocultas
de los deterioros marcados Sin deterioro.

Se abrieron los Excel descargados con Artifact Tool. Se comprobaron medidas,
estaciones, densidades numéricas, URCI y Observaciones vacío. La hoja Curvas
contiene únicamente las imágenes originales `image12.png`, `image14.png` e
`image15.png`, correspondientes a 82, 85 y 86. Se renderizaron y revisaron
esa hoja y el PDF. No se realizó una sesión interactiva en Microsoft Excel.

La comparación de los primeros tres formularios PDF con sus fondos oficiales,
a escala 1,5 y enmascarando sólo las casillas autorizadas, encontró cero
píxeles distintos fuera de esas casillas. Las huellas de los dos Excel
originales también se verifican en las pruebas de preservación.

Se revisaron el aviso de selección y la vista previa en computadora y en un
marco móvil de 390 × 844 px. No hubo desbordamiento horizontal; la vista
previa ocupó el ancho interior disponible y no mostró opciones de zoom.
Largo y ancho conservaron el atributo obligatorio, Observaciones quedó vacío
y el acceso amarillo se mantuvo visible al desplazarse por el formulario.

Se conservan `servir.dart`, las configuraciones de Debug y el puerto 8090,
la base local `mopt-urci-local-v1` y los identificadores históricos. El motor
URCI y sus trazos no se modifican. El caché de la PWA usa una versión nueva;
las pruebas de funcionamiento sin red corresponden al Service Worker simulado.
