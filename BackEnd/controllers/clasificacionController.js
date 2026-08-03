const db = require('../config/db');  

exports.obtenerClasificaciones = async (req, res) => {
  try {
    // 👇 AUTO-MIGRACIÓN: Crea las columnas de horarios y la nueva de DISPONIBLE
    await db.query('ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS usa_horario BOOLEAN DEFAULT false;').catch(() => null);
    await db.query("ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS dias_disponibles VARCHAR(100) DEFAULT '[1,2,3,4,5,6,7]';").catch(() => null);
    await db.query("ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS hora_inicio TIME DEFAULT '00:00';").catch(() => null);
    await db.query("ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS hora_fin TIME DEFAULT '23:59';").catch(() => null);
    await db.query('ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS disponible BOOLEAN DEFAULT true;').catch(() => null);

    const result = await db.query('SELECT * FROM clasificaciones ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clasificaciones' });
  }
};  

exports.crearClasificacion = async (req, res) => {
  const { 
    nombre, destino, emoji, genera_puntos, permite_canje, disponible,
    usa_horario, dias_disponibles, hora_inicio, hora_fin 
  } = req.body;
  
  const imagen_url = req.file ? req.file.path : null;
  const isGeneraPuntos = genera_puntos === undefined ? true : (genera_puntos === 'true' || genera_puntos === true);
  const isPermiteCanje = permite_canje === undefined ? true : (permite_canje === 'true' || permite_canje === true); 
  const isDisponible = disponible === undefined ? true : (disponible === 'true' || disponible === true); 

  const isUsaHorario = usa_horario === 'true' || usa_horario === true;
  const diasDisp = dias_disponibles ? (typeof dias_disponibles === 'string' ? dias_disponibles : JSON.stringify(dias_disponibles)) : '[1,2,3,4,5,6,7]';
  const hInicio = hora_inicio || '00:00';
  const hFin = hora_fin || '23:59';

  try {
    await db.query('ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS usa_horario BOOLEAN DEFAULT false;').catch(() => null);
    await db.query("ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS dias_disponibles VARCHAR(100) DEFAULT '[1,2,3,4,5,6,7]';").catch(() => null);
    await db.query("ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS hora_inicio TIME DEFAULT '00:00';").catch(() => null);
    await db.query("ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS hora_fin TIME DEFAULT '23:59';").catch(() => null);
    await db.query('ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS disponible BOOLEAN DEFAULT true;').catch(() => null);

    const result = await db.query(
      `INSERT INTO clasificaciones 
      (nombre, destino, emoji, imagen_url, genera_puntos, permite_canje, disponible, usa_horario, dias_disponibles, hora_inicio, hora_fin) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [nombre, destino, emoji, imagen_url, isGeneraPuntos, isPermiteCanje, isDisponible, isUsaHorario, diasDisp, hInicio, hFin]
    );  
    
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');  
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la clasificación' });
  }
};  

exports.actualizarClasificacion = async (req, res) => {
  const { id } = req.params;
  const { 
    nombre, destino, emoji, genera_puntos, permite_canje, disponible,
    usa_horario, dias_disponibles, hora_inicio, hora_fin 
  } = req.body;
  
  const imagen_url = req.file ? req.file.path : null;
  const isGeneraPuntos = genera_puntos === undefined ? true : (genera_puntos === 'true' || genera_puntos === true);
  const isPermiteCanje = permite_canje === undefined ? true : (permite_canje === 'true' || permite_canje === true); 
  const isDisponible = disponible === undefined ? true : (disponible === 'true' || disponible === true); 

  const isUsaHorario = usa_horario === 'true' || usa_horario === true;
  const diasDisp = dias_disponibles ? (typeof dias_disponibles === 'string' ? dias_disponibles : JSON.stringify(dias_disponibles)) : '[1,2,3,4,5,6,7]';
  const hInicio = hora_inicio || '00:00';
  const hFin = hora_fin || '23:59';

  try {
    await db.query('ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS usa_horario BOOLEAN DEFAULT false;').catch(() => null);
    await db.query("ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS dias_disponibles VARCHAR(100) DEFAULT '[1,2,3,4,5,6,7]';").catch(() => null);
    await db.query("ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS hora_inicio TIME DEFAULT '00:00';").catch(() => null);
    await db.query("ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS hora_fin TIME DEFAULT '23:59';").catch(() => null);
    await db.query('ALTER TABLE clasificaciones ADD COLUMN IF NOT EXISTS disponible BOOLEAN DEFAULT true;').catch(() => null);

    await db.query('BEGIN'); 
    
    const oldRes = await db.query('SELECT nombre FROM clasificaciones WHERE id = $1', [id]);
    if (oldRes.rows.length === 0) throw new Error("Clasificación no encontrada");
    const nombreAnterior = oldRes.rows[0].nombre;  
    
    const result = await db.query(
      `UPDATE clasificaciones SET 
        nombre=$1, destino=$2, emoji=$3, imagen_url=COALESCE($4, imagen_url), 
        genera_puntos=$5, permite_canje=$6, disponible=$7, usa_horario=$8, dias_disponibles=$9, hora_inicio=$10, hora_fin=$11 
      WHERE id=$12 RETURNING *`,
      [nombre, destino, emoji, imagen_url, isGeneraPuntos, isPermiteCanje, isDisponible, isUsaHorario, diasDisp, hInicio, hFin, id]
    );  
    
    if (nombreAnterior !== nombre) {
      await db.query('UPDATE productos SET categoria = $1 WHERE categoria = $2', [nombre, nombreAnterior]);
      await db.query('UPDATE promociones SET categoria_trigger = $1 WHERE categoria_trigger = $2', [nombre, nombreAnterior]);
    }  
    
    await db.query('COMMIT');  
    
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
    
    const oldRes = await db.query('SELECT nombre FROM clasificaciones WHERE id = $1', [req.params.id]);
    if (oldRes.rows.length > 0) {
      const nombreAnterior = oldRes.rows[0].nombre;
      await db.query("UPDATE productos SET categoria = 'Sin Categoría' WHERE categoria = $1", [nombreAnterior]);
    }  
    
    await db.query('DELETE FROM clasificaciones WHERE id = $1', [req.params.id]);  
    
    await db.query('COMMIT');  
    
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');  
    
    res.json({ success: true });
  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar. Asegúrate de borrar los ingredientes de esta clasificación primero.' });
  }
};

exports.actualizarDisponibilidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { disponible } = req.body;
    
    const result = await db.query(
      'UPDATE clasificaciones SET disponible = $1 WHERE id = $2 RETURNING *',
      [disponible, id]
    );  
    
    const io = req.app.get('io');
    if (io) io.emit('catalogo_actualizado');  
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar disponibilidad' });
  }
};

// ==========================================
// 🚀 NUEVO: MÓDULO DE CLONACIÓN DE CATÁLOGOS
// ==========================================
exports.clonarClasificacion = async (req, res) => {
  const { origen_id, nueva_clasificacion, ingredientes_ids, productos_ids, modo_clon, imagen_url_previa } = req.body;
  const client = await db.connect(); 

  try {
    await client.query('BEGIN'); 

    // 1. Insertar la nueva clasificación
    const insertClasif = await client.query(
      `INSERT INTO clasificaciones (nombre, destino, emoji, imagen_url, genera_puntos, permite_canje, disponible, usa_horario, dias_disponibles, hora_inicio, hora_fin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        nueva_clasificacion.nombre,
        nueva_clasificacion.destino || 'Cocina',
        nueva_clasificacion.emoji || '🍽️',
        imagen_url_previa || null,
        nueva_clasificacion.genera_puntos !== false,
        nueva_clasificacion.permite_canje !== false,
        nueva_clasificacion.disponible !== false,
        nueva_clasificacion.usa_horario === true,
        nueva_clasificacion.dias_disponibles || '[1,2,3,4,5,6,7]',
        nueva_clasificacion.hora_inicio || '00:00',
        nueva_clasificacion.hora_fin || '23:59'
      ]
    );
    const nuevaClasifDB = insertClasif.rows[0];
    const nuevoClasifId = nuevaClasifDB.id;

    // 2. Copiar los Ingredientes seleccionados (Mapeo Inteligente)
    let nombresIngredientesCopiados = new Set();
    
    if (ingredientes_ids && ingredientes_ids.length > 0) {
      const ingQuery = `SELECT * FROM catalogo_ingredientes WHERE clasificacion_id = $1 AND id = ANY($2::int[])`;
      const ingsToCopy = await client.query(ingQuery, [origen_id, ingredientes_ids]);

      for (const ing of ingsToCopy.rows) {
        await client.query(
          `INSERT INTO catalogo_ingredientes (clasificacion_id, nombre, tipo, precio_extra, permite_extra)
           VALUES ($1, $2, $3, $4, $5)`,
          [nuevoClasifId, ing.nombre, ing.tipo, ing.precio_extra, ing.permite_extra]
        );
        nombresIngredientesCopiados.add(String(ing.nombre).trim().toLowerCase());
      }
    }

    // 3. Copiar los Productos seleccionados re-asignando la categoría y evaluando el "Modo"
    if (productos_ids && productos_ids.length > 0) {
      const prodQuery = `SELECT * FROM productos WHERE id = ANY($1::int[])`;
      const prodsToCopy = await client.query(prodQuery, [productos_ids]);

      for (const prod of prodsToCopy.rows) {
        let nuevasOpciones = [];
        let nuevoStock = prod.stock_preparado;
        let nuevoUsaStock = prod.usa_stock;
        let nuevoUsaHorario = prod.usa_horario;
        let nuevosDias = prod.dias_disponibles;
        let nuevaHoraInicio = prod.hora_inicio;
        let nuevaHoraFin = prod.hora_fin;

        if (modo_clon === 'limpio') {
          nuevasOpciones = [];
          nuevoUsaStock = false;
          nuevoStock = 0;
          nuevoUsaHorario = false;
          nuevosDias = '[1,2,3,4,5,6,7]';
          nuevaHoraInicio = '00:00';
          nuevaHoraFin = '23:59';
        } else {
          const opcionesViejas = typeof prod.opciones === 'string' ? JSON.parse(prod.opciones || '[]') : (prod.opciones || []);
          nuevasOpciones = opcionesViejas.filter(opc => {
            if (opc.tipo === 'variacion' || opc.categoria === 'Tamaño' || opc.categoria === 'Sabor') return true;
            return nombresIngredientesCopiados.has(String(opc.nombre).trim().toLowerCase());
          });
        }

        await client.query(
          `INSERT INTO productos
          (nombre, descripcion, precio_base, emoji, categoria, opciones, imagen_url, tiempo_preparacion, rendimiento, disponible, genera_puntos, permite_canje, usa_stock, stock_preparado, usa_horario, dias_disponibles, hora_inicio, hora_fin)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [
            prod.nombre, prod.descripcion, prod.precio_base, prod.emoji, 
            nuevaClasifDB.nombre, 
            JSON.stringify(nuevasOpciones), prod.imagen_url, 
            prod.tiempo_preparacion, prod.rendimiento, prod.disponible, 
            prod.genera_puntos, prod.permite_canje, nuevoUsaStock, nuevoStock,
            nuevoUsaHorario, nuevosDias, nuevaHoraInicio, nuevaHoraFin
          ]
        );
      }
    }

    await client.query('COMMIT'); 

    if (req.app) {
      const io = req.app.get('io');
      if (io) io.emit('catalogo_actualizado');
    }

    res.status(200).json({ mensaje: 'Clonación exitosa', clasificacion: nuevaClasifDB });
  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error('Error al clonar catálogo:', error);
    res.status(500).json({ error: 'Error interno al clonar la clasificación.' });
  } finally {
    client.release(); 
  }
};