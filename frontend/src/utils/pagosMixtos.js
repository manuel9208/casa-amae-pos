// front/src/utils/pagosMixtos.js
// Normaliza pagos_mixtos venga como arreglo, objeto {Efectivo: 50}, texto JSON
// o texto con doble codificación. Siempre devuelve [{ metodo, monto }] con monto > 0.
export const normalizarPagosMixtos = (raw) => {
  let pm = raw;
  try {
    for (let i = 0; i < 2 && typeof pm === 'string'; i++) pm = JSON.parse(pm);
  } catch (e) {
    return [];
  }
  if (Array.isArray(pm)) {
    return pm
      .map(x => ({ metodo: String(x?.metodo ?? ''), monto: Number(x?.monto) || 0 }))
      .filter(x => x.metodo && x.monto > 0);
  }
  if (pm && typeof pm === 'object') {
    return Object.entries(pm)
      .map(([metodo, monto]) => ({ metodo, monto: Number(monto) || 0 }))
      .filter(x => x.monto > 0);
  }
  return [];
};

// Busca el monto de un método por prefijo ("efectivo", "tarjeta", "transf"). Devuelve '' si no hay.
export const montoDeMetodo = (lista, prefijo) => {
  const p = String(prefijo).toLowerCase();
  const encontrado = lista.find(x => x.metodo.toLowerCase().startsWith(p));
  return encontrado ? encontrado.monto : '';
};