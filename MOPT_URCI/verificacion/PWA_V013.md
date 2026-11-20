# Verificación de MOPT URCI v0.13

Fecha: 10 de noviembre de 2026.

## Cambios de esta entrega

- Área de muestra: dos casillas obligatorias, Largo (m) × Ancho (m).
  Su producto alimenta la pantalla, las densidades, el PDF y los Excel.
  No se usa el área manual histórica para sustituir medidas faltantes.
- Vista previa: ajuste al ancho automático como único tamaño. Se retiró el
  selector de página completa y porcentajes. La barra permanece visible
  mientras se recorren las páginas.
- Acceso: botón amarillo fijo durante el desplazamiento por la ficha y el
  resumen. Abre el formulario de la sección que se está consultando.
- Curvas: se seleccionan exclusivamente los deterioros con cantidades
  positivas, o polvo con una severidad elegida. No se reutilizan cantidades
  ocultas cuando se confirma Sin deterioro. La distribución A4/A3 conserva
  completas las imágenes originales, con su proporción y sus ejes propios.
- Observaciones: se exporta sólo el texto del inspector. Un campo vacío
  permanece vacío; no se añaden automáticamente el área ni otras notas.

## Pruebas automatizadas

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 73 pruebas aprobadas, ninguna omitida |
| `dart analyze servir.dart` | Sin incidencias |
| `dart format --output=none --set-exit-if-changed servir.dart` | Sin cambios |
| `python verificacion/servidor_test.py` | 7 pruebas aprobadas |

El lanzador se comprobó con Dart 3.13.7, descargado del distribuidor oficial
y verificado con su SHA-256. Las pruebas del servidor incluyen todos los
recursos del caché, el módulo nuevo de selección de curvas, sus tipos MIME,
el inicio desde una ruta con espacios, el control de origen y las rutas privadas.
El puerto predeterminado y las configuraciones de VS Code siguen usando 8090.

Las nuevas pruebas cubren el área derivada, las medidas inválidas y su producto
fuera de rango, la independencia del área manual antigua, la conservación de
datos históricos, las observaciones literales y la selección de cero a siete
deterioros. Se comprueba que ninguna imagen se recorte o deforme.

## Verificación de documentos

Las dos plantillas de referencia conservan sus huellas SHA-256. Los originales
de `plantillas/` no se modifican. El formulario limpio conserva sus partes
originales salvo el contenido de las casillas autorizadas. El libro de niveles
conserva sus dieciséis hojas, estilos e imágenes originales.

La selección y distribución de figuras se aplica exclusivamente a la hoja
Curvas de las copias descargadas. Cambian su hoja, dibujo, relaciones de
imágenes y su área de impresión; los demás componentes ajenos a las casillas
de captura y resultados conservan los mismos bytes. No se mezcla el estilo
de una tabla nueva con el formato de los formularios oficiales.

Se descargaron desde la aplicación los dos Excel y los PDF. La importación
de los Excel con Artifact Tool confirmó los valores numéricos de largo,
ancho, densidades, VDT, q, URCI y las estaciones, y Observaciones vacío.
Se renderizaron el formulario y la hoja Curvas para revisar su apariencia.
Esta comprobación no incluyó una sesión interactiva en Microsoft Excel.

Se renderizaron y revisaron los tres formularios PDF y las hojas de curvas.
La comparación de los formularios con sus fondos oficiales, a escala 1,5,
enmascarando sólo los espacios autorizados, encontró **cero píxeles distintos**
fuera de esos espacios en las tres páginas.

## Prueba de uso

En una muestra de RN 507, sección 40762, se ingresó:

- Largo 30 m y ancho 5,58 m: área 167,4 m².
- 81 L: 30,5 m; 83 M: 83,7 m²; 87 M: 48,8 m; polvo M.
- Los demás deterioros: Sin deterioro.
- Seguridad: erosión 2 cm, estabilidad Bueno, vegetación Regular,
  señalamiento Bueno.
- Estaciones 0,0 y 7,91: se muestran como 0 + 000 y 7 + 910.

Resultados: URCI 59, seguridad vial 72 y eficacia 64,2. La hoja de consulta
contiene sólo las imágenes originales de 81, 83 y 87 y la lectura de polvo.
El PDF incorpora tres imágenes originales, sin incluir figuras ajenas ni la
curva general URCI. Ésta sigue disponible en el detalle del cálculo.

Al vaciar el ancho o escribir cero, el área, URCI y eficacia pasan a pendiente;
al restituir 5,58, se recuperan los resultados. Al marcar 81 como Sin deterioro,
la nueva descarga contiene sólo dos imágenes, sin recuperar la medida oculta.
Una nota escrita por el inspector aparece exactamente una vez en Observaciones,
sin ningún texto agregado automáticamente.

Se revisaron la ficha, el acceso fijo, el resumen y las vistas previas de URCI,
seguridad vial y curvas en computadora y en un marco móvil de 390 × 844 px.
Las páginas ocupan el ancho interior disponible y no existe selector de zoom.
También se revisó una hoja A3 con los siete deterioros y las tres severidades,
sin solapamientos ni recortes añadidos a las imágenes originales.

Se mantienen la base local `mopt-urci-local-v1`, los identificadores y los datos
históricos. Las pruebas del Service Worker verifican el caché y la entrega de
recursos sin red; no se realizó una instalación física en un equipo Windows.
El motor numérico y sus trazos originales no se modifican en esta entrega.
