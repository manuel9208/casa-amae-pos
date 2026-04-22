const db = require('../config/db');

exports.registrar = async (req, res) => {
  // RECIBIMOS TODOS LOS CAMPOS NUEVAMENTE
  const { telefono, nombre, apellido, correo, fecha_nacimiento, nip } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO clientes (telefono, nombre, apellido, correo, fecha_nacimiento, nip) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        telefono, 
        nombre, 
        apellido || '', 
        correo || null, 
        fecha_nacimiento || null, 
        nip || '0000'
      ]
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
      // FORZAMOS LA LIMPIEZA DE ESPACIOS PARA QUE COINCIDAN EXACTAMENTE
      const dbNip = String(result.rows[0].nip).trim();
      const inputNip = String(nip).trim();
      
      if (dbNip === inputNip) {
        return res.json({ success: true });
      }
    }
    
    // SI NO COINCIDEN, LLEGA AQUÍ
    res.status(401).json({ error: 'NIP Incorrecto' });
  } catch (error) { 
    console.error("Error verificando NIP:", error);
    res.status(500).json({ error: 'Error del servidor' }); 
  }
};