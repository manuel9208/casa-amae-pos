const db = require('../config/db');  

// 1. Obtener pedidos listos en cocina que esperan ser recolectados por cualquier repartidor
exports.obtenerPedidosDisponiblesParaReparto = async (req, res) => {
  try {
    const query = `
      SELECT p.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.estado_preparacion = 'Listo'
      AND p.tipo_consumo = 'Domicilio'
      AND p.repartidor_id IS NULL
      ORDER BY p.fecha_creacion ASC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener pool de reparto:", error.message);
    res.status(500).json({ error: 'Error al obtener pedidos disponibles para reparto' });
  }
};  

// 2. Acción de auto-asignación con transmisión en tiempo real integrada
exports.tomarPedidoRepartidor = async (req, res) => {
  const { id } = req.params;
  const { repartidor_id } = req.body;  
  if (!repartidor_id) {
    return res.status(400).json({ error: 'El ID del repartidor es obligatorio para la auto-asignación.' });
  }  
  try {
    // Bloqueo de concurrencia: Validar que otro conductor no haya tomado la orden hace milisegundos
    const validoRes = await db.query('SELECT estado_preparacion, repartidor_id, numero_pedido FROM pedidos WHERE id = $1', [id]);
    if (validoRes.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado.' });  
    const pedido = validoRes.rows[0];
    if (pedido.repartidor_id) {
      return res.status(400).json({ error: 'Esta orden ya fue tomada por otro repartidor.' });
    }  
    // Consultamos el nombre del conductor para enriquecer la alerta visual de la Caja
    const repRes = await db.query('SELECT nombre FROM usuarios WHERE id = $1', [repartidor_id]);
    const nombreRepartidor = repRes.rows[0]?.nombre || 'Repartidor';  
    const query = `
      UPDATE pedidos
      SET estado_preparacion = 'En Camino',
      repartidor_id = $1,
      tiempo_salida_reparto = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [repartidor_id, id]);
    const pedidoActualizado = result.rows[0];  
    
    // 📡 EMISIÓN DEL EVENTO EN TIEMPO REAL HACIA LA CAJA
    const io = req.app.get('io');
    if (io) {
      io.emit('reparto:pedido_tomado', {
        pedido_id: id,
        numero_pedido: pedido.numero_pedido,
        repartidor_id,
        repartidor_nombre: nombreRepartidor,
        pedido: pedidoActualizado
      });
    }  
    res.json(pedidoActualizado);
  } catch (error) {
    console.error("Error al auto-asignar pedido:", error.message);
    res.status(500).json({ error: 'Error interno al tomar el pedido.' });
  }
};  

// 3. Finalizar entrega física en el domicilio del cliente con transmisión Socket.io
exports.entregarPedidoRepartidor = async (req, res) => {
  const { id } = req.params;  
  try {
    const query = `
      UPDATE pedidos
      SET estado_preparacion = 'Entregado',
      tiempo_entregado = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado.' });
    const pedidoActualizado = result.rows[0];  
    
    // 📡 EMISIÓN DEL EVENTO EN TIEMPO REAL HACIA LA CAJA (Habilita flujo de liquidación)
    const io = req.app.get('io');
    if (io) {
      io.emit('reparto:pedido_entregado', {
        pedido_id: id,
        numero_pedido: pedidoActualizado.numero_pedido,
        pedido: pedidoActualizado
      });
    }  
    res.json(pedidoActualizado);
  } catch (error) {
    console.error("Error al finalizar entrega:", error.message);
    res.status(500).json({ error: 'Error interno al entregar el pedido.' });
  }
};  

// 4. Obtener los viajes que el conductor trae actualmente en ruta
exports.obtenerMisViajesActivos = async (req, res) => {
  const { repartidor_id } = req.params;
  try {
    const query = `
      SELECT p.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.repartidor_id = $1
      AND p.estado_preparacion = 'En Camino'
      ORDER BY p.tiempo_salida_reparto DESC
    `;
    const result = await db.query(query, [repartidor_id]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener ruta activa:", error.message);
    res.status(500).json({ error: 'Error al obtener viajes activos.' });
  }
};  

// =========================================================================
// 🛡️ LÓGICA DE AUDITORÍA Y LIQUIDACIÓN FINANCIERA
// =========================================================================  

exports.obtenerRepartidoresAuditoria = async (req, res) => {
  try {
    const query = `
      SELECT
      u.id,
      u.nombre,
      COUNT(p.id) as pedidos_pendientes,
      COALESCE(SUM(p.total), 0) as efectivo_acumulado
      FROM usuarios u
      INNER JOIN pedidos p ON u.id = p.repartidor_id
      WHERE p.estado_preparacion = 'Entregado'
      AND p.metodo_pago = 'Efectivo'
      GROUP BY u.id, u.nombre
      HAVING COUNT(p.id) > 0
      ORDER BY efectivo_acumulado DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener auditoría de repartidores:", error.message);
    res.status(500).json({ error: 'Error al obtener pool de repartidores para auditoría.' });
  }
};  

exports.obtenerPedidosAuditoria = async (req, res) => {
  const { repartidor_id } = req.params;
  try {
    const query = `
      SELECT id, numero_pedido, total, metodo_pago, tiempo_entregado
      FROM pedidos
      WHERE repartidor_id = $1
      AND estado_preparacion = 'Entregado'
      AND metodo_pago = 'Efectivo'
      ORDER BY tiempo_entregado ASC
    `;
    const result = await db.query(query, [repartidor_id]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener pedidos para auditoría:", error.message);
    res.status(500).json({ error: 'Error al obtener desglose de órdenes.' });
  }
};  

exports.liquidarAuditoria = async (req, res) => {
  const { repartidor_id, pedido_ids, monto_liquidado } = req.body;  
  if (!repartidor_id || !pedido_ids || pedido_ids.length === 0) {
    return res.status(400).json({ error: 'Faltan datos requeridos para la liquidación.' });
  }  
  try {
    await db.query('BEGIN');  
    const updateQuery = `
      UPDATE pedidos
      SET estado_preparacion = 'Liquidado'
      WHERE repartidor_id = $1
      AND id = ANY($2::int[])
      AND estado_preparacion = 'Entregado'
      RETURNING id
    `;  
    const result = await db.query(updateQuery, [repartidor_id, pedido_ids]);  
    await db.query('COMMIT');  
    res.json({
      mensaje: 'Liquidación procesada con éxito',
      pedidos_procesados: result.rows.length,
      monto_asentado: monto_liquidado
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("Error crítico en liquidación:", error.message);
    res.status(500).json({ error: 'Error al procesar la conciliación financiera.' });
  }
};

// 8. 👇 NUEVO ENDPOINT: Historial del repartidor del día actual
exports.obtenerHistorialRepartidor = async (req, res) => {
  const { repartidor_id } = req.params;
  try {
    const query = `
      SELECT p.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.repartidor_id = $1
      AND p.estado_preparacion IN ('Entregado', 'Liquidado')
      AND DATE(p.tiempo_entregado) = CURRENT_DATE
      ORDER BY p.tiempo_entregado DESC
    `;
    const result = await db.query(query, [repartidor_id]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener historial del repartidor:", error.message);
    res.status(500).json({ error: 'Error al obtener historial.' });
  }
};