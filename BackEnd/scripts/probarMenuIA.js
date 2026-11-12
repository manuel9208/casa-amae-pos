// BackEnd/scripts/probarMenuIA.js
// SOLO LECTURA. Uso (desde la carpeta BackEnd):  node scripts/probarMenuIA.js [empresa_id]
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch (e) {}
const menuIA = require('../utils/menuIA');

const EMPRESA_ID = Number(process.argv[2]) || 1;
const FRASES = [
  'boneles bbq', 'boneless', 'boneles', 'mango habanero', 'papas',
  'amae roll', 'amae rol', 'sushi amae', 'un amae', 'sushi', 'rol',
  'm&ms', 'brownie nuez', 'red velvet', 'shakespeare croissant', 'cheesecake'
];

(async () => {
  try {
    const items = await menuIA.obtenerCatalogo(EMPRESA_ID);
    console.log(`\n=== Catálogo empresa ${EMPRESA_ID}: ${items.length} productos disponibles ===\n`);

    for (const frase of FRASES) {
      const r = await menuIA.resolverProducto(EMPRESA_ID, frase);
      console.log(`"${frase}" =>`, JSON.stringify({
        encontrado: r.encontrado,
        nombre: r.nombre,
        variacion: r.variacion_coincidente,
        ambiguo: r.ambiguo,
        parcial: r.coincidencia_parcial,
        categoria: r.categoria_coincidente ? r.categoria_coincidente.nombre : null,
        otras: (r.otras_coincidencias || []).map(o => o.nombre)
      }));
    }

    const menu = menuIA.construirMenuTexto(items);
    console.log(`\n=== Menú para el prompt: ${menu.length} caracteres ===`);
    console.log(menu.split('\n').filter(l => /^(Boneles|Sushis|Postres)/i.test(l)).join('\n').slice(0, 1500));
    process.exit(0);
  } catch (e) {
    console.error('Error en la prueba:', e.message);
    process.exit(1);
  }
})();