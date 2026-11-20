# Verificación de v0.20

Fecha: 13 de noviembre de 2026.

## Problemas reproducidos

Al abrir el XLSX de la v0.19 en LibreOffice Calc y exportarlo a PDF, las seis
imágenes aparecían superpuestas en la esquina superior izquierda, igual que
en la captura del usuario. Los dibujos tenían desplazamientos desde A1,
pero sus transformaciones internas indicaban posición cero.

Además, en distribuciones de tres columnas, las bandas de los títulos
compartían celdas combinadas. Algunos títulos no se mostraban.

## Corrección

- Imágenes, segmentos de flechas y círculos usan posiciones absolutas en la
  hoja. La posición y el tamaño del anclaje coinciden con los de la
  transformación interna de cada objeto.
- Cada título y lectura se limita a las celdas disponibles de su tarjeta;
  las combinaciones de celdas no se superponen.
- Se conserva la distribución de las curvas seleccionadas, las proporciones
  y los bytes originales de las imágenes, los cálculos y las plantillas.
- No se añaden recursos al arranque. Se conserva la autorización del módulo
  de guías en servir.dart y se actualiza el caché a v020r1.

## Comprobaciones realizadas

- 95 pruebas automatizadas aprobadas. Las dos pruebas nuevas reproducían
  las posiciones contradictorias y las combinaciones de celdas superpuestas
  antes del cambio; ambas pasan con la corrección.
- Se revisan los rótulos de las 128 combinaciones posibles de deterioros.
- Se comprobaron imágenes y guías L/M/H en la descarga conjunta de dos
  muestras. Las imágenes tienen posiciones distintas, no se superponen y
  conservan sus dimensiones en el XLSX final.
- Se generaron los casos de cero a siete deterioros y un libro con dos
  muestras. LibreOffice Calc abrió los nueve XLSX y exportó sus hojas a PDF.
  En los PDF se verificaron todos los títulos, el número de imágenes y la
  ausencia de intersecciones entre imágenes. Una muestra sin deterioros
  sigue sin crear una hoja de curvas vacía.
- Revisión visual de los PDF obtenidos desde Calc: tres deterioros, siete
  deterioros y la muestra de control con las guías en el centro de las
  curvas. Las flechas permanecen unidas y sobre sus imágenes.
- Los PDF de curvas propios de la aplicación también se renderizaron y
  revisaron. La muestra de control mantiene URCI 59.
- Las pruebas de preservación de las plantillas y de la exportación única
  siguen pasando. El arranque y la navegación también pasan la evaluación
  con DOM e IndexedDB simulados.

Limitaciones: no se ejecutó Microsoft Excel de escritorio. La comprobación
con una aplicación de hojas de cálculo se hizo con LibreOffice Calc. El
renderizador interno importa los datos, pero no interpreta correctamente
las posiciones absolutas de los dibujos; por eso su imagen no se usó como
evidencia visual de la corrección.

## Para actualizar los informes

Actualizar la aplicación, recargar localhost:8090 con Ctrl+Shift+R y volver
a descargar el Excel. Los archivos generados antes del cambio no se
modifican automáticamente.
