# Verificación de v0.17 — Casillas en blanco

Fecha: 11 de noviembre de 2026.

- `npm test`: 90 pruebas aprobadas. Incluyen conservación de las plantillas,
  cálculo URCI, seguridad vial, PDF, curvas originales, un único Excel y PWA.
- Nuevas verificaciones: casillas sin medición vacías, polvo no seleccionado,
  ceros escritos válidos y eliminación de una deducción al borrar su cantidad.
- El motor numérico no se modifica ni se cambian sus resultados.
- Navegador: dos muestras creadas mediante los campos de la app. La tabla del
  cálculo muestra vacíos los valores deducibles sin medición.
- El Excel descargado mantiene cinco hojas: las dos muestras, sus dos hojas
  de curvas originales y su resumen, sin instructivo ni hojas sobrantes.
- En ambas muestras se verificaron las 21 casillas de cantidades y las
  42 casillas de densidades/deducciones: solamente los datos activos tienen
  contenido. Se conservan 30,5 m del deterioro 81 y 20 m² del deterioro 86.
- El cero escrito en la erosión de seguridad vial se conserva como número.
  Los resultados URCI de las muestras siguen siendo 87 y 83, respectivamente.
- El Excel descargado se importó y se renderizaron ambas hojas de formulario;
  no se detectaron errores de fórmula en la búsqueda del libro importado.
- PDF de URCI descargado desde la vista previa: las densidades y deducciones
  sin mediciones se comprobaron vacías mediante extracción por recuadro.
  También se verificó visualmente la vista ajustada al ancho.
- Se conservan originales, estilos, logotipos, medidas y combinaciones de
  las plantillas oficiales. Los archivos originales mantienen sus SHA-256.
- El servidor conserva el puerto 8090 y el lanzamiento desde servir.dart.
  No se repitió su ejecución: no había un SDK de Dart disponible en la sesión.

El Excel se comprobó mediante su estructura OOXML, importación y renderizado;
no se ejecutó Microsoft Excel de escritorio en este entorno.
