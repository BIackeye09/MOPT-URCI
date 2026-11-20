# Verificación de v0.18

Fecha: 13 de noviembre de 2026.

- `npm test`: 92 pruebas aprobadas. Incluyen cálculo, catálogo, formularios,
  Papelera, exportación, preservación de plantillas y recursos de la PWA.
- Los valores deducibles individuales iguales a cero quedan vacíos en los
  campos PDF y Excel y en la tabla del cálculo. Los ceros siguen presentes
  en el motor, y se conservan las cantidades escritas y los resultados válidos.
- PDF de control: revisión de las 21 casillas de deducción mediante sus
  coordenadas. Se encontraron cuatro valores y 17 casillas vacías, sin `0,0`.
  Se comprobó también el espacio de la deducción de una cantidad cero explícita.
- El ejemplo métrico conserva URCI 59. El motor y sus curvas numéricas no
  se modificaron.
- PDF renderizado y revisado: formulario oficial, hoja con tres curvas y
  polvo, y hoja con las seis curvas y polvo. No hay recortes ni superposición
  de textos. Las flechas usan trazo sólido, contorno blanco y dos puntas.
- Excel generado, importado y renderizado: casillas de deducción sin datos
  vacías; guías visibles y conectadas, superpuestas a las imágenes originales;
  Baja, Media y Alta en polvo, con un círculo relleno junto a Media en el control.
  Los textos de polvo y las marcas comparten la misma celda para mantener
  su alineación.
- Se probaron las tres selecciones de polvo en el modelo y en la vista HTML;
  los PDF de Baja, Media y Alta muestran siempre las tres opciones. Marcar
  Sin deterioro elimina la selección y omite la tarjeta de la descarga.
- Las plantillas originales conservan sus SHA-256 y las hojas oficiales
  exportadas conservan sus estilos, imágenes, dimensiones y combinaciones.
- La PWA usa un caché nuevo que incluye el módulo de guías. El origen y la
  base de datos conservan sus identificadores. El puerto sigue siendo 8090.

Limitaciones de esta sesión: Chromium local no pudo iniciarse y el navegador
remoto no pudo acceder al servidor local. Se verificaron directamente las
exportaciones y sus renderizados; no se completó una prueba de interacción
en navegador. No se ejecutó Microsoft Excel de escritorio ni el lanzador Dart,
porque esas aplicaciones no estaban disponibles en el entorno.
