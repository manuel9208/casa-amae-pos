const db = require('../config/db');

exports.obtenerClasificaciones = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clasificaciones ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) { 
    res.status(500).json({ error: 'Error al obtener clasificaciones' }); 
  }
};

exports.crearClasificacion = async (req, res) => {
  const { nombre, destino, emoji, genera_puntos } = req.body;
  const imagen_url = req.file ? req.file.path : null;
  const isGeneraPuntos = genera_puntos === undefined ? true : (genera_puntos === 'true' || genera_puntos === true);

  try {
    const result = await db.query(
      'INSERT INTO clasificaciones (nombre, destino, emoji, imagen_url, genera_puntos) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, destino, emoji, imagen_url, isGeneraPuntos]
    );
    
    // 👇 MEJORA: Sincronización en vivo Kiosco/Caja
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');
    
    res.json(result.rows[0]);
  } catch (error) { 
    res.status(500).json({ error: 'Error al crear la clasificación' }); 
  }
};

exports.actualizarClasificacion = async (req, res) => {
  const { id } = req.params;
  const { nombre, destino, emoji, genera_puntos } = req.body;
  const imagen_url = req.file ? req.file.path : null;
  const isGeneraPuntos = genera_puntos === undefined ? true : (genera_puntos === 'true' || genera_puntos === true);

  try {
    await db.query('BEGIN'); // 🛡️ Iniciamos transacción segura

    // 1. Obtener nombre anterior para actualizar en cascada
    const oldRes = await db.query('SELECT nombre FROM clasificaciones WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) throw new Error("Clasificación no encontrada");
    const nombreAnterior = oldRes.rows[0].nombre;

    // 2. Actualizar la clasificación principal
    const result = await db.query(
      'UPDATE clasificaciones SET nombre=$1, destino=$2, emoji=$3, imagen_url=COALESCE($4, imagen_url), genera_puntos=$5 WHERE id=$6 RETURNING *',
      [nombre, destino, emoji, imagen_url, isGeneraPuntos, id]
    );

    // 3. 👇 MEJORA (Evita desvinculación): Actualizar en cascada si cambió el nombre
    if (nombreAnterior !== nombre) {
      await db.query('UPDATE productos SET categoria = $1 WHERE categoria = $2', [nombre, nombreAnterior]);
      await db.query('UPDATE promociones SET categoria_trigger = $1 WHERE categoria_trigger = $2', [nombre, nombreAnterior]);
    }

    await db.query('COMMIT'); // 🛡️ Confirmamos transacción

    // 👇 MEJORA: Sincronización en vivo
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');

    res.json(result.rows[0]);
  } catch (error) { 
    await db.query('ROLLBACK');
    res.status(500).json({ error: 'Error al actualizar la clasificación' }); 
  }
};

exports.eliminarClasificacion = async (req, res) => {
  try {
    await db.query('BEGIN');

    // 1. Obtener nombre antes de borrar
    const oldRes = await db.query('SELECT nombre FROM clasificaciones WHERE id = $1', [req.params.id]);
    if (oldRes.rows.length > 0) {
        const nombreAnterior = oldRes.rows[0].nombre;
        // 2. 🛡️ MEJORA: Reasignar platillos huérfanos para que no rompan el Kiosco
        await db.query("UPDATE productos SET categoria = 'Sin Categoría' WHERE categoria = $1", [nombreAnterior]);
    }

    // 3. Borrar clasificación
    await db.query('DELETE FROM clasificaciones WHERE id = $1', [req.params.id]);
    
    await db.query('COMMIT');

    // 👇 MEJORA: Sincronización en vivo
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');

    res.json({ success: true });
  } catch (error) { 
    await db.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar. Asegúrate de borrar los ingredientes de esta clasificación primero.' }); 
  }
};