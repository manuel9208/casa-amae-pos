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
  // Aplicamos el SSL de forma limpia para silenciar la advertencia de seguridad
  ssl: dbUrl ? { rejectUnauthorized: false } : false,
  
  // 2. SOLUCIÓN AL DEPRECATION WARNING (Letras Amarillas):
  // Antes usábamos pool.on('connect') para la zona horaria, lo que causaba un "choque"
  // de consultas concurrentes. Pasarlo por 'options' lo configura desde el milisegundo 0.
  options: '-c timezone=America/Mazatlan'
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