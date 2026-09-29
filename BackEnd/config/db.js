const { Pool } = require('pg');
require('dotenv').config();

// 1. SOLUCIÓN AL WARNING SSL (Letras Blancas):
// Limpiamos el parámetro 'sslmode=require' que te da Neon por defecto en la URL.
// La librería 'pg' prefiere que esto se declare en el objeto de configuración.
let dbUrl = process.env.DATABASE_URL || '';
try {
  if (dbUrl) {
    const parsedUrl = new URL(dbUrl);
    parsedUrl.searchParams.delete('sslmode');
    dbUrl = parsedUrl.toString();
  }
} catch (e) {
  console.error("Nota: No se pudo parsear la URL de la base de datos.");
}

const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl ? { rejectUnauthorized: false } : false,
    options: '-c timezone=America/Mazatlan',
    // 👇 NUEVO: Sin esto, un corte de red puede tardar 30-60+ segundos en fallar
    connectionTimeoutMillis: 8000,
    statement_timeout: 10000,
    idleTimeoutMillis: 30000,
    max: 20
});

// 👇 NUEVO: Evita que un error de conexión tumbe todo el proceso de Node
pool.on('error', (err) => {
    console.error('⚠️ Error inesperado en el Pool de PostgreSQL:', err.message);
});

// Probamos la conexión inicial
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Error adquiriendo cliente PostgreSQL:', err.message);
    }
    console.log('✅ Conectado a PostgreSQL exitosamente (Motor Optimizado y Sin Advertencias)');
    release();
});

module.exports = pool;