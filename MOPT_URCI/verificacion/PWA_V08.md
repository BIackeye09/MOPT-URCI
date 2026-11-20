# Verificación de MOPT URCI v0.8

Fecha: 9 de noviembre de 2026.

## Ajuste del lanzador a 8090

Esta variante cambia el puerto predeterminado y las dos configuraciones de
VS Code a **8090**, con sus instrucciones correspondientes. Se comprobó el
valor del puerto, los argumentos de depuración y el contenido del ZIP. Los
archivos web, el cálculo, las curvas y la base de datos se conservaron sin
cambios. Las pruebas funcionales descritas abajo corresponden a la entrega
base v0.8; no se repitió la ejecución de Dart para este ajuste.

## Comprobaciones automáticas

- Dart SDK **3.13.7**, Linux x64: `dart analyze servir.dart` sin incidencias.
- **29 pruebas de Node.js aprobadas**: las 23 de cálculo y catálogo existentes
  y 6 nuevas de manifiesto, iconos reales, caché, funcionamiento sin servidor,
  actualización desde la red, exclusión de recursos ajenos y limpieza del caché.
- **7 pruebas de integración HTTP aprobadas** con Python 3 y el SDK real de
  Dart. Incluyen ejecución desde otra carpeta y con espacios en el nombre,
  todos los recursos del caché y manifiesto, MIME, GET/HEAD, redirección a
  localhost, rutas privadas, archivos inexistentes, enlaces fuera del proyecto,
  argumentos inválidos y puerto ocupado.
- Inicio mediante el **Debug Adapter Protocol real del SDK de Dart**:
  lanzamiento correcto, respuesta HTTP 200 y punto de interrupción en
  `servir.dart` que detiene la petición y permite continuarla.
- Se comprobó que la apertura del navegador recibe la URL correcta usando un
  proceso de apertura de prueba en Linux. No se abrió un navegador externo
  mediante el lanzador durante esa prueba.
- La base de datos (`db.js`), el motor de cálculo y los datos del catálogo se
  compararon byte por byte con la entrega v0.7: se conservan.

Comandos reproducibles incluidos en el proyecto:

```sh
npm test
dart analyze servir.dart
python verificacion/servidor_test.py
```

Las pruebas HTTP utilizan una copia temporal del proyecto y un puerto libre.
El lanzador de uso diario mantiene **8090** por defecto.

## Comprobaciones en el navegador

Se usó Chrome con la vista gestionada de pruebas:

1. Inicio, barra PWA, ayuda de instalación y navegación correctos.
2. Creación de una campaña y una ficha de prueba; captura de área **167,4 m²**
   y de las cantidades del ejemplo de control: **URCI ≈ 59**, lectura **58,91**.
3. Servidor de la vista detenido: recarga de la aplicación desde el caché,
   reapertura de la misma ficha y conservación de observaciones y cálculo.
4. Segunda pestaña en la misma dirección: comparte los registros guardados.
5. Publicación de un nuevo identificador de caché **solo en la copia de
   pruebas**: aparece **Actualizar aplicación**. Al pulsarlo inmediatamente
   después de editar las observaciones, se guarda la edición y se conserva
   después de la recarga. La otra pestaña recibe el aviso para recargar.
6. Gráficas, imágenes originales y resultado de la ficha visibles.

La prueba utilizó datos ficticios en el almacenamiento del navegador. Esos
registros no forman parte del ZIP ni se precargan en la aplicación entregada.

## Límites de la verificación

- La instalación nativa de la PWA y el menú de clic derecho de **VS Code en
  Windows** no se ejecutaron en este entorno Linux. Se verificaron el servidor
  real, el adaptador de depuración de Dart y los requisitos del manifiesto;
  las configuraciones de VS Code y las instrucciones quedan incluidas.
- La sincronización entre dispositivos y la edición simultánea de una misma
  ficha no forman parte de esta versión. Para ver cambios de otra ventana,
  se recarga la página, usando el mismo origen y perfil.
- El motor conserva su condición de aproximación por lectura de curvas
  digitalizadas. Los límites metodológicos siguen en `METODOLOGIA.md`.
