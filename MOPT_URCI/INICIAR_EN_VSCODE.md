# Iniciar MOPT URCI con servir.dart

## Preparación (una sola vez)

1. Instalá [Visual Studio Code](https://code.visualstudio.com/).
2. Instalá el [SDK de Dart](https://dart.dev/get-dart). Si ya tenés Flutter,
   podés usar el Dart que incluye. El comando `dart --version` debe funcionar
   en la terminal; reiniciá VS Code después de instalar el SDK.
3. En Extensiones de VS Code instalá **Dart**, de **Dart Code**
   (`Dart-Code.dart-code`). Esta carpeta ya la recomienda.
4. Extraé **todo** el ZIP. En VS Code elegí **Archivo → Abrir carpeta** y abrí
   la carpeta que contiene `servir.dart`, `index.html` y `pubspec.yaml`.

## Clic derecho → Debug

1. Abrí `servir.dart` desde el explorador de VS Code.
2. Clic derecho dentro del archivo → **Debug** / **Depurar**. También podés
   usar **Run** / **Ejecutar**, o F5 con **URCI: servidor y navegador**.
3. Se inicia el servidor y se abre **http://localhost:8090/** en tu navegador
   predeterminado. Si el navegador no se abre, pulsá el enlace de la consola.
4. Para detener el servidor: **Shift+F5** o el botón rojo de detener.

El lanzador sirve la aplicación HTML, CSS y JavaScript existente. No requiere
Flutter, Node.js ni paquetes de Dart para utilizar la aplicación. No hace
falta compilar los archivos web. Podés poner puntos de interrupción en Dart
para revisar las peticiones del servidor.

## Depurar la interfaz JavaScript

En **Ejecutar y depurar** seleccioná **URCI: Dart + Chrome (JavaScript)** y
pulsá **F5**. Se inicia el servidor y VS Code abre Chrome con el depurador web.
Podés poner puntos de interrupción en `app.js`, `pwa.js` o los módulos del motor.
Esta opción requiere Chrome instalado; el depurador JavaScript viene con VS Code.
También podés usar las herramientas de desarrollador del navegador con F12.

Después de modificar HTML, CSS o JavaScript, **recargá la página**. Después de
modificar Dart, detené y volvé a iniciar la depuración. La configuración con
Chrome puede usar un perfil de depuración separado; para tu trabajo diario
usá el navegador habitual con el mismo perfil de siempre.

## Instalar como PWA

1. Abrí la dirección local en **Chrome o Edge**.
2. Esperá el estado **Lista para usar sin conexión**.
3. Pulsá **Instalar aplicación** si aparece. También está la opción de instalar
   en el menú del navegador; **Cómo instalar** muestra la ayuda dentro de URCI.
4. Abrí MOPT URCI desde el acceso instalado: tendrá su propia ventana.
   Podés seguir usando una pestaña del navegador.

La primera carga completa necesita el servidor. Una vez preparada la copia
local, la aplicación instalada puede volver a abrirse y trabajar con el
servidor detenido, mientras el navegador conserve sus datos y caché.
Para recibir cambios del código hay que iniciar de nuevo el servidor y recargar.
Si aparece **Actualizar aplicación**, el botón guarda las ediciones pendientes
antes de recargar. Si no se puede guardar, conserva la página abierta.

## Datos en la computadora

- La PWA y la pestaña comparten datos **solo con la misma dirección, navegador
  y perfil**. Usá siempre **http://localhost:8090/**; `127.0.0.1` redirige a
  `localhost` para mantener una sola dirección.
- Los cambios de otra ventana se ven al **recargar**. Editá una misma ficha en
  una sola ventana a la vez; esta entrega no incorpora edición colaborativa.
- Otro navegador, otro perfil, otro puerto o una publicación en Internet
  tienen almacenamiento separado. Instalar la PWA no traslada datos de una
  dirección anterior ni sincroniza con otro dispositivo.
- Si ya tenías fichas en otra dirección, mantené esa publicación y reemplazá
  allí los archivos web para conservar sus registros. Se mantienen el nombre,
  versión y tablas de la base de datos de v0.7.
- Borrar los datos del sitio también borra los registros locales. La exportación
  de copias de seguridad sigue pendiente en el proyecto.

## Alternativa desde terminal

Desde la carpeta del proyecto:

```sh
dart run servir.dart
```

Opciones:

```sh
dart run servir.dart --sin-abrir
dart run servir.dart --puerto 8090
dart run servir.dart --ayuda
```

Si el puerto está ocupado, detené la ejecución anterior y volvé a iniciar. El
lanzador no elige otro puerto automáticamente, porque cambiarlo cambia dónde
el navegador busca los registros. El modo habitual de URCI se abre desde
esta computadora.

## Probar el visor por Wi-Fi durante el desarrollo

1. Conectá la computadora y el teléfono al mismo Wi-Fi con internet.
2. En VS Code elegí **URCI: prueba de mapa en teléfono** y pulsá **F5**,
   o ejecutá `dart run servir.dart --prueba-movil` en la computadora.
3. Abrí en el navegador del teléfono la dirección que imprime la consola.
   Si aparecen varias, usá la que corresponda a la red Wi-Fi de la computadora.
   Si la consola no encuentra la dirección, usá `ipconfig` en Windows para
   ver la IPv4 del Wi-Fi y abrí `http://<IPv4>:8091/` en el teléfono.

El modo de prueba sirve el visor en el puerto 8091 y puede ejecutarse al
mismo tiempo que URCI en 8090. Arrastrá el mapa con un dedo, ajustá el zoom
con dos o usá **+** y **−**. Para cerrar el acceso al visor, detené la
prueba con **Shift+F5** o **Ctrl+C**.

## Publicar la PWA

Los archivos web también pueden publicarse juntos en un alojamiento HTTPS,
como GitHub Pages. Conservan rutas relativas y admiten un subdirectorio.
Usá la misma dirección publicada para abrir o instalar URCI desde la
computadora y el teléfono. Podés abrir **Consultar mapa** junto al croquis
en ambos equipos. Cada navegador guarda sus fichas localmente.
`servir.dart` y la configuración de VS Code solo se utilizan para el arranque
local; no necesitan subirse al alojamiento estático. En cada nueva entrega
hay que cambiar el identificador del caché en `sw.js` y desplegar los archivos
completos. Las inspecciones permanecen en IndexedDB.

Referencias técnicas: [configuración de Dart Code](https://dartcode.org/docs/launch-configuration/),
[depuración en VS Code](https://code.visualstudio.com/docs/debugtest/debugging-configuration),
[instalación de PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
