// MOPT URCI: Run / Debug en VS Code. Solo usa bibliotecas del SDK de Dart.
import 'dart:async';
import 'dart:io';

const _archivosPublicos = <String>{
  'index.html',
  'prueba-mapa.html',
  'prueba-mapa.js',
  'busqueda-mapa.js',
  'lugares-cr.json',
  'sencilla.css',
  'img/camino-campo.webp',
  'app.js',
  'db.js',
  'pwa.js',
  'estaciones.js',
  'seguridad.js',
  'seguridad-ui.js',
  'revision.js',
  'filtro-fechas.js',
  'eficiencia-detalle.js',
  'modelo.js',
  'formularios.js',
  'eficiencia.js',
  'eficiencia-db.js',
  'eficiencia-exportadores.js',
  'eficiencia-ui.js',
  'xlsx.js',
  'exportadores.js',
  'vista-previa.js',
  'lectura-urci.js',
  'guias-lectura.js',
  'hoja-graficas.js',
  'curvas-seleccionadas.js',
  'archivo-plantilla.js',
  'plantillas-oficiales.js',
  'libro-formularios.js',
  'plantillas/Formulario_Limpio.xlsx',
  'plantillas/01_RVNL_Eficacia_VF.xlsx',
  'plantillas/02_RVNL_Eficiencia_VF.xlsx',
  'plantillas/eficiencia-base.pdf',
  'plantillas/eficiencia-mapa.json',
  'plantillas/formulario-base.pdf',
  'plantillas/resumen-base.pdf',
  'plantillas/curvas-base.pdf',
  'plantillas/mapa.json',
  'plantillas/originales.json',
  'frente.js',
  'catalogo.js',
  'catalogo-datos.js',
  'croquis.js',
  'motor-urci.js',
  'motor-curvas.js',
  'curvas-datos.js',
  'manifest.webmanifest',
  'icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'vendor/pdf-lib.min.js',
  'vendor/fontkit.umd.min.js',
  'vendor/pdf.min.mjs',
  'vendor/pdf.worker.min.mjs',
  'vendor/DejaVuSans.ttf',
  'vendor/DejaVuSans-Bold.ttf',
  'curvas/tm5-626-81.png',
  'curvas/tm5-626-82.png',
  'curvas/tm5-626-83.png',
  'curvas/tm5-626-85.png',
  'curvas/tm5-626-86.png',
  'curvas/tm5-626-87.png',
  'curvas/tm5-626-urci.png',
  'sw.js',
};
const _archivosPruebaMovil = <String>{
  'prueba-mapa.html',
  'prueba-mapa.js',
  'busqueda-mapa.js',
  'lugares-cr.json',
  'sencilla.css',
  'icon.svg',
};
const _tipos = <String, String>{
  'html': 'text/html; charset=utf-8',
  'css': 'text/css; charset=utf-8',
  'js': 'text/javascript; charset=utf-8',
  'mjs': 'text/javascript; charset=utf-8',
  'webmanifest': 'application/manifest+json; charset=utf-8',
  'svg': 'image/svg+xml',
  'png': 'image/png',
  'webp': 'image/webp',
  'ttf': 'font/ttf',
  'pdf': 'application/pdf',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'json': 'application/json; charset=utf-8',
};

Future<void> main(List<String> argumentos) async {
  int? puertoSolicitado;
  var abrir = true;
  var pruebaMovil = false;
  try {
    for (var i = 0; i < argumentos.length; i++) {
      final argumento = argumentos[i];
      if (argumento == '--ayuda' ||
          argumento == '--help' ||
          argumento == '-h') {
        stdout.writeln('''MOPT URCI - servidor local
Uso: dart run servir.dart [--puerto 8090] [--sin-abrir] [--prueba-movil]

Sin argumentos abre http://localhost:8090/ en el navegador predeterminado.
--puerto, --port     Puerto entre 1 y 65535. Mantenerlo conserva el origen.
--sin-abrir          Inicia sin abrir una ventana del navegador.
--prueba-movil      Abre el visor en la red local. Usa el puerto 8091 por defecto.
--ayuda             Muestra esta ayuda.

En VS Code: abrir la carpeta, clic derecho en servir.dart > Debug.
Para detener: Shift+F5 en VS Code o Ctrl+C en la terminal.''');
        return;
      } else if (argumento == '--sin-abrir' || argumento == '--no-open') {
        abrir = false;
      } else if (argumento == '--prueba-movil') {
        pruebaMovil = true;
      } else if (argumento == '--puerto' || argumento == '--port') {
        if (++i >= argumentos.length)
          throw const FormatException('Falta el número de puerto.');
        final puerto = int.tryParse(argumentos[i]) ?? -1;
        if (puerto < 1 || puerto > 65535) {
          throw const FormatException('El puerto debe estar entre 1 y 65535.');
        }
        puertoSolicitado = puerto;
      } else {
        throw FormatException('Argumento desconocido: $argumento');
      }
    }
  } on FormatException catch (error) {
    stderr.writeln('${error.message}\nUsá --ayuda para ver las opciones.');
    exitCode = 64;
    return;
  }

  // Usa la carpeta del script aunque se ejecute desde otra ubicación.
  final raiz = Directory(
    File.fromUri(Platform.script).parent.resolveSymbolicLinksSync(),
  );
  final archivos = pruebaMovil ? _archivosPruebaMovil : _archivosPublicos;
  final faltantes = archivos.where(
    (nombre) => !File.fromUri(raiz.uri.resolve(nombre)).existsSync(),
  );
  if (faltantes.isNotEmpty) {
    stderr.writeln(
      'Faltan archivos de la aplicación: ${faltantes.join(', ')}.\n'
      'Extraé el ZIP completo y ejecutá servir.dart dentro de esa carpeta.',
    );
    exitCode = 66;
    return;
  }

  final puerto = puertoSolicitado ?? (pruebaMovil ? 8091 : 8090);
  final url = Uri(scheme: 'http', host: 'localhost', port: puerto, path: '/');
  late final HttpServer servidor;
  try {
    final direccion = pruebaMovil
        ? InternetAddress.anyIPv4
        : InternetAddress.loopbackIPv4;
    servidor = await HttpServer.bind(direccion, puerto);
  } on SocketException catch (error) {
    final detalle = pruebaMovil
        ? 'Detené la prueba anterior o elegí otro puerto con --puerto.'
        : 'Comprobá si ya hay una ejecución abierta y detenela antes de volver a iniciar.\n'
              'No se cambia de puerto automáticamente para conservar tus datos locales.';
    stderr.writeln(
      'No se pudo iniciar URCI en $url\n'
      '$detalle\n'
      'Detalle: ${error.message}',
    );
    exitCode = 1;
    return;
  }
  servidor.autoCompress = true;
  if (pruebaMovil) {
    stdout.writeln(
      'Prueba de mapa. Conectá la computadora y el teléfono al mismo Wi-Fi.',
    );
    final ips = await _direccionesDePrueba();
    if (ips.isEmpty) {
      stdout.writeln(
        'Consultá la IPv4 del Wi-Fi de la computadora y abrí '
        'http://<IPv4>:$puerto/ en el teléfono.',
      );
    } else {
      stdout.writeln(
        'Abrí en el teléfono la dirección del Wi-Fi de la computadora.',
      );
      for (final ip in ips) {
        stdout.writeln('  ${url.replace(host: ip)}');
      }
    }
    stdout.writeln('Para detener la prueba, usá Shift+F5 o Ctrl+C.');
  } else {
    // Esta línea permite que VS Code conecte el depurador de Chrome.
    stdout.writeln('URCI listo en $url');
    stdout.writeln('Carpeta: ${raiz.path}');
    stdout.writeln('Guardado local del navegador. Detener: Shift+F5 o Ctrl+C.');
    if (abrir) unawaited(_abrirNavegador(url.toString()));
  }

  final interrupcion = ProcessSignal.sigint.watch().listen((_) {
    stdout.writeln('\nCerrando el servidor URCI…');
    unawaited(servidor.close(force: true));
  });
  try {
    await for (final peticion in servidor) {
      unawaited(_atender(peticion, raiz, url, pruebaMovil));
    }
  } finally {
    await interrupcion.cancel();
    await servidor.close(force: true);
  }
}

bool _esIPv4Privada(InternetAddress ip) {
  if (ip.type != InternetAddressType.IPv4) return false;
  final octetos = ip.rawAddress;
  return octetos[0] == 10 ||
      (octetos[0] == 172 && octetos[1] >= 16 && octetos[1] <= 31) ||
      (octetos[0] == 192 && octetos[1] == 168);
}

Future<Set<String>> _direccionesDePrueba() async {
  try {
    final redes = await NetworkInterface.list(type: InternetAddressType.IPv4);
    return redes
        .expand((red) => red.addresses)
        .where(_esIPv4Privada)
        .map((ip) => ip.address)
        .toSet();
  } on SocketException {
    return {};
  }
}

bool _hostPermitido(String host, bool esPrueba) {
  if (['localhost', '127.0.0.1', '::1'].contains(host)) return true;
  final ip = esPrueba ? InternetAddress.tryParse(host) : null;
  return ip != null && _esIPv4Privada(ip);
}

Future<void> _abrirNavegador(String url) async {
  try {
    final resultado = Platform.isWindows
        ? await Process.run('cmd', ['/c', 'start', '', url])
        : Platform.isMacOS
        ? await Process.run('open', [url])
        : await Process.run('xdg-open', [url]);
    if (resultado.exitCode != 0)
      throw const FileSystemException('Navegador no disponible');
  } catch (_) {
    stdout.writeln('Abrí esta dirección en Chrome o Edge: $url');
  }
}

Future<void> _atender(
  HttpRequest peticion,
  Directory raiz,
  Uri url,
  bool esPrueba,
) async {
  final respuesta = peticion.response;
  try {
    respuesta.headers.set(HttpHeaders.cacheControlHeader, 'no-cache');
    respuesta.headers.set('X-Content-Type-Options', 'nosniff');
    respuesta.headers.set('Referrer-Policy', 'same-origin');
    if (peticion.method != 'GET' && peticion.method != 'HEAD') {
      respuesta.statusCode = HttpStatus.methodNotAllowed;
      respuesta.headers.set(HttpHeaders.allowHeader, 'GET, HEAD');
      return;
    }
    final autoridad = peticion.headers.value(HttpHeaders.hostHeader) ?? '';
    final origen = Uri.tryParse('http://$autoridad');
    if (origen == null ||
        origen.port != url.port ||
        !_hostPermitido(origen.host, esPrueba)) {
      respuesta.statusCode = HttpStatus.forbidden;
      return;
    }
    // El modo habitual conserva localhost como origen único.
    if (!esPrueba && origen.host != 'localhost') {
      respuesta.statusCode = HttpStatus.permanentRedirect;
      respuesta.headers.set(
        HttpHeaders.locationHeader,
        url.replace(
          path: peticion.uri.path,
          query: peticion.uri.hasQuery ? peticion.uri.query : null,
        ),
      );
      return;
    }
    if (esPrueba) {
      final remoto = peticion.connectionInfo?.remoteAddress;
      if (remoto == null || !(remoto.isLoopback || _esIPv4Privada(remoto))) {
        respuesta.statusCode = HttpStatus.forbidden;
        return;
      }
    }
    final segmentos = peticion.uri.pathSegments;
    if (segmentos.any(
      (parte) =>
          parte.startsWith('.') ||
          parte.contains('/') ||
          parte.contains('\\') ||
          parte.contains('\u0000'),
    )) {
      respuesta.statusCode = HttpStatus.forbidden;
      return;
    }
    final inicio = esPrueba ? 'prueba-mapa.html' : 'index.html';
    final archivos = esPrueba ? _archivosPruebaMovil : _archivosPublicos;
    final nombre = peticion.uri.path == '/' ? inicio : segmentos.join('/');
    if (!archivos.contains(nombre)) {
      respuesta.statusCode = HttpStatus.notFound;
      return;
    }
    final archivo = File.fromUri(raiz.uri.resolve(nombre));
    if (!await archivo.exists()) {
      respuesta.statusCode = HttpStatus.notFound;
      return;
    }
    final destino = await archivo.resolveSymbolicLinks();
    if (!destino.startsWith('${raiz.path}${Platform.pathSeparator}')) {
      respuesta.statusCode = HttpStatus.forbidden;
      return;
    }
    respuesta.headers.contentType = ContentType.parse(
      _tipos[nombre.split('.').last]!,
    );
    respuesta.contentLength = await archivo.length();
    if (peticion.method == 'GET') await respuesta.addStream(archivo.openRead());
  } on FormatException {
    respuesta.statusCode = HttpStatus.badRequest;
  } on FileSystemException {
    respuesta.statusCode = HttpStatus.notFound;
  } on IOException {
    // Es normal cancelar una petición al navegar o cerrar una pestaña.
  } catch (error, traza) {
    stderr.writeln('Error al servir ${peticion.uri.path}: $error\n$traza');
    respuesta.statusCode = HttpStatus.internalServerError;
  } finally {
    try {
      await respuesta.close();
    } on IOException {
      /* Conexión ya cerrada. */
    }
  }
}
