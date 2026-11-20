"""Pruebas reales del lanzador: Python 3 + SDK de Dart, sin paquetes extra.

Ejecutar: python verificacion/servidor_test.py
Opcional: DART_BIN=/ruta/al/dart python verificacion/servidor_test.py
Se trabaja sobre una copia temporal; no se modifica el proyecto ni sus datos.
"""
import http.client
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import tempfile
import time
import unittest


class ServidorTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dart = os.environ.get('DART_BIN') or shutil.which('dart')
        if not cls.dart:
            raise RuntimeError('Instalá Dart o indicá DART_BIN para ejecutar estas pruebas.')
        cls.temporal = tempfile.TemporaryDirectory(prefix='urci-prueba-')
        cls.base = Path(cls.temporal.name)
        cls.proyecto = cls.base / 'proyecto con espacios'
        shutil.copytree(Path(__file__).resolve().parent.parent, cls.proyecto,
                        ignore=shutil.ignore_patterns('.dart_tool', 'node_modules', '__pycache__'))
        with socket.socket() as s:
            s.bind(('127.0.0.1', 0))
            cls.puerto = s.getsockname()[1]
        cls.proceso = subprocess.Popen(
            [cls.dart, str(cls.proyecto / 'servir.dart'), '--sin-abrir', '--puerto', str(cls.puerto)],
            cwd=cls.base, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        cls.esperar(cls.proceso, cls.puerto)

    @staticmethod
    def esperar(proceso, puerto):
        limite = time.monotonic() + 12
        while time.monotonic() < limite:
            if proceso.poll() is not None:
                raise AssertionError('No inició: ' + proceso.stdout.read())
            try:
                with socket.create_connection(('127.0.0.1', puerto), timeout=0.2):
                    return
            except OSError:
                time.sleep(0.05)
        proceso.kill()
        raise AssertionError('El servidor no abrió el puerto a tiempo.')

    @classmethod
    def tearDownClass(cls):
        cls.proceso.send_signal(signal.SIGINT)
        try:
            salida = cls.proceso.communicate(timeout=5)[0]
        except subprocess.TimeoutExpired:
            cls.proceso.kill()
            salida = cls.proceso.communicate()[0]
        if 'Error al servir' in salida:
            raise AssertionError(salida)
        cls.temporal.cleanup()

    def pedir(self, ruta='/', metodo='GET', host=None):
        conexion = http.client.HTTPConnection('127.0.0.1', self.puerto, timeout=3)
        conexion.request(metodo, ruta, headers={'Host': host or f'localhost:{self.puerto}'})
        respuesta = conexion.getresponse()
        resultado = respuesta.status, dict(respuesta.getheaders()), respuesta.read()
        conexion.close()
        return resultado

    def ejecutar(self, *args):
        return subprocess.run([self.dart, str(self.proyecto / 'servir.dart'), *args],
                              cwd=self.base, capture_output=True, text=True, timeout=12)

    def test_inicio_desde_otra_carpeta_y_con_espacios(self):
        estado, cabeceras, cuerpo = self.pedir()
        self.assertEqual(estado, 200)
        self.assertIn('text/html', cabeceras['content-type'])
        self.assertIn(b'pwa-instalar', cuerpo)
        self.assertIn(b'app.js', cuerpo)

    def test_todos_los_recursos_del_manifiesto_y_cache(self):
        import re
        rutas = re.findall(r"['\"]\./([^'\"]*)['\"]", (self.proyecto / 'sw.js').read_text())
        for ruta in rutas:
            with self.subTest(ruta=ruta):
                estado, cabeceras, cuerpo = self.pedir('/' + ruta)
                self.assertEqual(estado, 200)
                self.assertTrue(cuerpo)
                self.assertEqual(cabeceras['cache-control'], 'no-cache')
        estado, cabeceras, cuerpo = self.pedir('/manifest.webmanifest')
        self.assertIn('application/manifest+json', cabeceras['content-type'])
        manifiesto = json.loads(cuerpo)
        self.assertEqual(manifiesto['display'], 'standalone')
        for icono in manifiesto['icons']:
            self.assertEqual(self.pedir('/' + icono['src'].removeprefix('./'))[0], 200)

    def test_head_mime_y_metodos(self):
        for ruta, tipo in [('/pwa.js', 'text/javascript'), ('/sencilla.css', 'text/css'),
                           ('/sw.js', 'text/javascript'), ('/icons/icon-512.png', 'image/png')]:
            estado, cabeceras, cuerpo = self.pedir(ruta, 'HEAD')
            self.assertEqual(estado, 200)
            self.assertIn(tipo, cabeceras['content-type'])
            self.assertEqual(cuerpo, b'')
            self.assertGreater(int(cabeceras['content-length']), 0)
        estado, cabeceras, _ = self.pedir('/', 'POST')
        self.assertEqual(estado, 405)
        self.assertEqual(cabeceras['allow'], 'GET, HEAD')

    def test_rutas_privadas_inexistentes_y_traversal(self):
        for ruta in ['/servir.dart', '/pubspec.yaml', '/LEEME.md', '/verificacion/resultados.json',
                     '/no-existe.js', '/.vscode/launch.json', '/../pubspec.yaml',
                     '/%2e%2e/%2e%2e/LEEME.md', '/icons%2ficon-512.png', '/icons%5cicon-512.png']:
            with self.subTest(ruta=ruta):
                self.assertIn(self.pedir(ruta)[0], [400, 403, 404])
        self.assertEqual(self.pedir('/index.html?prueba=1')[0], 200)
        # Dart normaliza segmentos de puntos antes de entregar HttpRequest.uri.
        # La ruta normalizada puede servir únicamente un recurso público permitido.
        self.assertEqual(self.pedir('/%2e%2e/index.html')[2], self.pedir('/index.html')[2])

    def test_origen_unico(self):
        estado, cabeceras, _ = self.pedir('/index.html?prueba=1', host=f'127.0.0.1:{self.puerto}')
        self.assertEqual(estado, 308)
        self.assertEqual(cabeceras['location'], f'http://localhost:{self.puerto}/index.html?prueba=1')
        self.assertEqual(self.pedir(host=f'otro-sitio.example:{self.puerto}')[0], 403)

    @unittest.skipIf(os.name == 'nt', 'Crear symlinks en Windows puede requerir privilegios.')
    def test_no_sirve_enlaces_fuera_de_la_carpeta(self):
        icono = self.proyecto / 'icons/icon-192.png'
        original = icono.read_bytes()
        exterior = self.base / 'fuera.png'
        exterior.write_bytes(b'No debe servirse')
        icono.unlink()
        icono.symlink_to(exterior)
        try:
            self.assertEqual(self.pedir('/icons/icon-192.png')[0], 403)
        finally:
            icono.unlink()
            icono.write_bytes(original)

    def test_ayuda_argumentos_y_puerto_ocupado(self):
        self.assertEqual(self.ejecutar('--ayuda').returncode, 0)
        for args in [('--puerto',), ('--puerto', '0'), ('--puerto', '65536'), ('--desconocido',)]:
            self.assertEqual(self.ejecutar(*args).returncode, 64)
        ocupado = self.ejecutar('--sin-abrir', '--puerto', str(self.puerto))
        self.assertEqual(ocupado.returncode, 1)
        self.assertIn('No se cambia de puerto', ocupado.stderr)


if __name__ == '__main__':
    unittest.main(verbosity=2)
