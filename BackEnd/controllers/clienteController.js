const db = require('../config/db');

exports.registrar = async (req, res) => {
  const { telefono, nombre, apellido, correo, fecha_nacimiento, nip } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO clientes (telefono, nombre, apellido, correo, fecha_nacimiento, nip) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [ telefono, nombre, apellido || '', correo || null, fecha_nacimiento || null, nip || '0000' ]
    );
    res.json({ cliente: result.rows[0] });
  } catch (error) {
    console.error("Error al registrar cliente:", error);
    res.status(500).json({ error: 'Ese número ya está registrado o hubo un error' });
  }
};

exports.verificarNip = async (req, res) => {
  const { cliente_id, nip } = req.body;
  try {
    const result = await db.query('SELECT nip FROM clientes WHERE id = $1', [cliente_id]);
    if (result.rows.length > 0) {
      const dbNip = String(result.rows[0].nip).trim();
      const inputNip = String(nip).trim();
      if (dbNip === inputNip) return res.json({ success: true });
    }
    res.status(401).json({ error: 'NIP Incorrecto' });
  } catch (error) { 
    res.status(500).json({ error: 'Error del servidor' }); 
  }
};

// ==========================================
// NUEVAS FUNCIONES PARA EL ADMIN CRM
// ==========================================

exports.obtenerClientes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clientes ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

exports.actualizarCliente = async (req, res) => {
  const { id } = req.params;
  // Excluimos fecha_nacimiento y fecha_registro intencionalmente
  const { nombre, apellido, telefono, correo, puntos, nip } = req.body;
  try {
    const result = await db.query(
      'UPDATE clientes SET nombre=$1, apellido=$2, telefono=$3, correo=$4, puntos=$5, nip=$6 WHERE id=$7 RETURNING *',
      [nombre, apellido, telefono, correo, puntos, nip, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

exports.obtenerReportes = async (req, res) => {
  try {
    // 1. Promedio de edad
    const edadRes = await db.query("SELECT ROUND(AVG(EXTRACT(YEAR FROM age(CURRENT_DATE, fecha_nacimiento)))) as promedio_edad FROM clientes WHERE fecha_nacimiento IS NOT NULL");
    
    // 2. Clientes VIP (Más puntos)
    const topPuntos = await db.query("SELECT nombre, apellido, puntos FROM clientes ORDER BY puntos DESC LIMIT 5");
    
    // 3. Clientes más leales (Más antiguos)
    const antiguos = await db.query("SELECT nombre, apellido, fecha_registro FROM clientes ORDER BY fecha_registro ASC LIMIT 5");
    
    // 4. Métodos de pago preferidos por clientes registrados
    const pagos = await db.query("SELECT metodo_pago, COUNT(*) as cantidad FROM pedidos WHERE cliente_id IS NOT NULL GROUP BY metodo_pago ORDER BY cantidad DESC");
    
    // 5. Origen de pedidos (¿Piden más en Kiosco o en Caja?)
    const origenes = await db.query("SELECT origen, COUNT(*) as cantidad FROM pedidos WHERE cliente_id IS NOT NULL GROUP BY origen ORDER BY cantidad DESC");
    
    // 6. Platillos favoritos (Extrae la información del JSON del carrito)
    const platillos = await db.query(`
      SELECT obj->>'nombre' as platillo, sum(CAST(obj->>'cantidad' AS INTEGER)) as total
      FROM pedidos p, jsonb_array_elements(p.carrito) obj
      WHERE p.cliente_id IS NOT NULL
      GROUP BY platillo ORDER BY total DESC LIMIT 5
    `);

    res.json({
      promedioEdad: edadRes.rows[0]?.promedio_edad || 0,
      topPuntos: topPuntos.rows,
      antiguos: antiguos.rows,
      pagos: pagos.rows,
      origenes: origenes.rows,
      platillos: platillos.rows
    });
  } catch (error) {
    console.error("Error en reportes CRM:", error);
    res.status(500).json({ error: 'Error al generar reportes' });
  }
};