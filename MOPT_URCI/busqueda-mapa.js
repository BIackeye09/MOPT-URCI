const conectores = new Set(['de', 'del', 'el', 'la', 'los', 'las', 'y', 'en']);
const tipos = {
  provincia: 'Provincia',
  canton: 'Cantón',
  distrito: 'Distrito',
  localidad: 'Localidad'
};
const comparar = new Intl.Collator('es-CR', { sensitivity: 'base' }).compare;

function palabras(texto) {
  return (texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .filter(palabra => !conectores.has(palabra));
}

function inicioDelNombre(nombre, buscado) {
  return nombre.findIndex((_, inicio) => inicio + buscado.length <= nombre.length &&
    buscado.every((palabra, indice) => {
      const tramo = nombre[inicio + indice];
      return tramo === palabra ||
        (indice === buscado.length - 1 && palabra.length >= 3 && tramo.startsWith(palabra));
    }));
}

export function detalleLugar({ tipo, provincia, canton, distrito }) {
  return [tipos[tipo], distrito && `Distrito ${distrito}`, canton && `Cantón ${canton}`, provincia]
    .filter(Boolean).join(' · ');
}

export function prepararBusqueda(lugares) {
  const indice = lugares.map(lugar => {
    const nombre = palabras(lugar.nombre);
    const ubicacion = palabras([lugar.distrito, lugar.canton, lugar.provincia].filter(Boolean).join(' '));
    return { lugar, nombre, ubicacion };
  });

  return texto => {
    const terminos = palabras(texto);
    const tipo = Object.hasOwn(tipos, terminos[0]) ? terminos.shift() : null;

    // Buscá primero el nombre más específico y usá el resto de las palabras para ubicarlo.
    for (let corte = terminos.length; corte > 0; corte--) {
      const buscado = terminos.slice(0, corte);
      const contexto = terminos.slice(corte);
      const coincidencias = [];
      for (const { lugar, nombre, ubicacion } of indice) {
        if ((tipo && lugar.tipo !== tipo) || !contexto.every(palabra => ubicacion.includes(palabra))) continue;
        const inicio = inicioDelNombre(nombre, buscado);
        if (inicio < 0) continue;
        const exacto = nombre.length === buscado.length && nombre.at(-1) === buscado.at(-1);
        coincidencias.push({ lugar, exacto, inicio });
      }
      if (coincidencias.length) {
        coincidencias.sort((a, b) => Number(b.exacto) - Number(a.exacto) || a.inicio - b.inicio ||
          comparar(a.lugar.nombre, b.lugar.nombre) || comparar(detalleLugar(a.lugar), detalleLugar(b.lugar)));
        return coincidencias.map(({ lugar }) => lugar);
      }
    }
    return [];
  };
}
