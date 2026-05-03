const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false 
});

// 👇 SOLUCIÓN ZONA HORARIA BD: Obligamos a que cada petición respete tu zona horaria
pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'America/Mazatlan'");
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Error adquiriendo cliente PostgreSQL', err.stack);
  }
  console.log('✅ Conectado a PostgreSQL exitosamente');
  release();
});

module.exports = pool;