"""Prepara una prueba de IndexedDB en un sitio temporal de QA, sin usar datos reales.

Uso: python verificacion/preparar_db_qa.py /ruta/raiz_web_temporal
La página queda en qa-db/papelera-db.html. No se publica con la aplicación.
"""
from pathlib import Path
import sys

origen = Path(__file__).resolve().parent
destino = Path(sys.argv[1]).resolve() / 'qa-db'
destino.mkdir(parents=True, exist_ok=True)
codigo = (origen.parent / 'db.js').read_text()
original = "const NOMBRE_BD = 'mopt-urci-local-v1';"
assert codigo.count(original) == 1
codigo = codigo.replace(original, "const NOMBRE_BD = 'mopt-urci-pruebas-v015-' + crypto.randomUUID();")
(destino / 'db-prueba.js').write_text(codigo)
for nombre in ['papelera-db.html', 'papelera-db.mjs']:
    (destino / nombre).write_bytes((origen / nombre).read_bytes())
print(destino / 'papelera-db.html')
