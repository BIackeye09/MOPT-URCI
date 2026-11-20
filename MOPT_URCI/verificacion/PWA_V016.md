# Verificación de v0.16 — Excel único

Fecha: 10 de noviembre de 2026.

- 86 pruebas de código aprobadas (`npm test`). Después del último ajuste
  de nombres se repitieron las 13 pruebas de plantillas: todas aprobadas.
- Las dos plantillas de entrada conservan sus huellas SHA-256.
- El archivo descargado es un libro XLSX directo, sin libros anidados.
- Sólo se incluyen las unidades creadas, sus curvas individuales y el resumen.
  No se copian Instructivo, EFICACIA, Deterioros, Listas o unidades vacías.
- Conservación comprobada del XML de las hojas oficiales fuera de campos de
  datos, la selección de pestañas y la conversión equivalente de textos.
  El banco de estilos y el tema son idénticos al libro de referencia.
- Comprobadas todas las relaciones internas del libro, las imágenes originales,
  el espacio del croquis y los rangos de impresión de las copias incluidas.
- Once muestras se reúnen en un solo libro: once formularios, once hojas
  individuales de curvas y dos páginas del resumen oficial de diez filas.
- Dos muestras con distintos daños (81 y 86) descargadas desde navegador:
  cinco hojas, cada curva vinculada sólo a su propia muestra. Comprobadas
  las cantidades, las estaciones, las notas del inspector y el resumen.
- Descargas desde ficha, Resúmenes y Mis formularios verificadas. Dos
  formularios independientes se descargaron en un solo Excel de ocho hojas,
  manteniendo sus resúmenes separados y sus números reales de formulario.
- Exclusión de Papelera verificada al descargar, y conservación de medidas
  al restaurar. La descarga se desactiva mientras se consulta la Papelera.
- El filtro Completados descargó sólo el formulario completo, sin el borrador.
- El XLSX de dos muestras se importó y se renderizaron sus cinco hojas;
  no se encontraron errores de fórmula en la búsqueda del libro importado.
- La vista previa PDF sigue ajustada al ancho y muestra la curva original.
  Las pruebas PDF mantienen los fondos oficiales y las seis figuras posibles.
- Siete pruebas de IndexedDB real aprobadas en una base aislada: esquema,
  restauración, conservación de notas y croquis, rechazo de guardados antiguos,
  reversión atómica, estados archivados y referencias de caminos.
- El servidor mantiene el puerto 8090; el nuevo módulo está en su lista de
  archivos públicos y en el precargado PWA. No se repitieron las pruebas de
  ejecución del lanzador Dart porque no había un SDK disponible en esta sesión.

La comprobación de Excel usa importación/renderizado y la estructura OOXML;
no se ejecutó Microsoft Excel de escritorio en este entorno.
