const db = require('../config/db');

exports.obtenerPedidosHoy = async (req, res) => { 
  try { 
    const result = await db.query("SELECT p.*, c.nombre as cliente_nombre FROM pedidos p LEFT JOIN clientes c ON p.cliente_id = c.id WHERE DATE(p.fecha_creacion) = CURRENT_DATE ORDER BY p.fecha_creacion DESC"); 
    res.json(result.rows); 
  } catch (error) { 
    res.status(500).json({ error: 'Error al obtener pedidos' }); 
  } 
};

exports.crearPedido = async (req, res) => {
  // 👇 Agregamos costo_envio
  const { cliente_id, tipo_consumo, metodo_pago, total, carrito, origen, direccion_entrega, descuento_puntos, costo_envio } = req.body;
  
  try {
    await db.query('BEGIN');

    const nroRes = await db.query("SELECT COALESCE(MAX(numero_pedido), 0) + 1 AS num FROM pedidos WHERE DATE(fecha_creacion) = CURRENT_DATE");
    
    // 👇 Insertamos el costo_envio (si no viene, por defecto es 0)
    const result = await db.query(
      'INSERT INTO pedidos (cliente_id, numero_pedido, tipo_consumo, metodo_pago, total, carrito, origen, estado_preparacion, direccion_entrega, descuento_puntos, costo_envio) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *', 
      [cliente_id, nroRes.rows[0].num, tipo_consumo, metodo_pago, total, JSON.stringify(carrito), origen, 'Pendiente', direccion_entrega, descuento_puntos, costo_envio || 0]
    );

    if (carrito && carrito.length > 0) { 
      for (const item of carrito) { 
        const prodId = item.id;
        const cantidadVendida = item.cantidad || 1;

        const prodRes = await db.query('SELECT rendimiento, stock_preparado FROM productos WHERE id = $1', [prodId]);
        
        if (prodRes.rows.length > 0) {
            const rendimiento = parseFloat(prodRes.rows[0].rendimiento) || 1;
            let stock_preparado = parseInt(prodRes.rows[0].stock_preparado) || 0;
            let lotesADescontar = 0;

            if (rendimiento <= 1) {
                lotesADescontar = cantidadVendida;
            } else {
                if (cantidadVendida <= stock_preparado) {
                    stock_preparado -= cantidadVendida;
                } else {
                    let falta = cantidadVendida - stock_preparado;
                    lotesADescontar = Math.ceil(falta / rendimiento);
                    stock_preparado = (lotesADescontar * rendimiento) - falta;
                }
                await db.query('UPDATE productos SET stock_preparado = $1 WHERE id = $2', [stock_preparado, prodId]);
            }

            if (lotesADescontar > 0) {
                await db.query(
                    `UPDATE insumos SET stock_actual = stock_actual - (r.cantidad_usada * $1) FROM recetas r WHERE insumos.id = r.insumo_id AND r.producto_id = $2`,
                    [lotesADescontar, prodId]
                );
            }
        }
      } 
    }

    if (cliente_id && descuento_puntos > 0) { 
      await db.query('UPDATE clientes SET puntos = puntos - $1 WHERE id = $2', [descuento_puntos, cliente_id]); 
    } else if (cliente_id) { 
      await db.query('UPDATE clientes SET puntos = puntos + $1 WHERE id = $2', [Math.floor(total * 0.10), cliente_id]); 
    }

    await db.query('COMMIT');
    res.status(201).json(result.rows[0]);

  } catch (error) { 
    await db.query('ROLLBACK');
    console.error("Error al crear pedido:", error);
    res.status(500).json({ error: 'Error en el servidor al crear pedido' }); 
  }
};

exports.actualizarPedido = async (req, res) => { 
  try { 
    // 👇 También lo agregamos aquí por si el pedido se modifica antes de confirmarse
    const result = await db.query(
      'UPDATE pedidos SET tipo_consumo = $1, metodo_pago = $2, total = $3, carrito = $4, estado_preparacion = $5, direccion_entrega = $6, costo_envio = $7 WHERE id = $8 RETURNING *', 
      [req.body.tipo_consumo, req.body.metodo_pago, req.body.total, JSON.stringify(req.body.carrito), 'Pendiente', req.body.direccion_entrega, req.body.costo_envio || 0, req.params.id]
    ); 
    res.json(result.rows[0]); 
  } catch (error) { 
    res.status(500).json({ error: 'Error' }); 
  } 
};

// ================= MODIFICADO: ACTUALIZAR ESTADO PARCIAL (CON CRONÓMETRO Y COSTOS) =================
exports.actualizarEstado = async (req, res) => {
  const { id } = req.params; 
  // 👇 Recibimos también total y costo_envio
  const { estado_preparacion, chef_id, carrito, metodo_pago, total, costo_envio } = req.body;
  
  try {
    let query = 'UPDATE pedidos SET estado_preparacion = $1'; 
    let params = [estado_preparacion];
    let pIdx = 2;

    if (metodo_pago) {
      query += `, metodo_pago = $${pIdx}`;
      params.push(metodo_pago);
      pIdx++;
    }

    if (carrito) {
      query += `, carrito = $${pIdx}`;
      params.push(JSON.stringify(carrito));
      pIdx++;
    }
    
    // 👇 NUEVO: Si la caja manda un nuevo total (sumándole el envío), lo actualizamos
    if (total !== undefined) {
      query += `, total = $${pIdx}`;
      params.push(total);
      pIdx++;
    }
    
    // 👇 NUEVO: Registramos cuánto fue de puro envío
    if (costo_envio !== undefined) {
      query += `, costo_envio = $${pIdx}`;
      params.push(costo_envio);
      pIdx++;
    }

    if (estado_preparacion === 'Preparando') {
      query += `, tiempo_inicio_preparacion = COALESCE(tiempo_inicio_preparacion, CURRENT_TIMESTAMP)`;
    }
    
    if (estado_preparacion === 'Listo') {
      query += `, tiempo_listo = COALESCE(tiempo_listo, CURRENT_TIMESTAMP)`;
    }
    
    if (chef_id) {
      query += `, chef_id = $${pIdx}`; 
      params.push(chef_id);
      pIdx++;
    }

    query += ` WHERE id = $${pIdx} RETURNING *`;
    params.push(id);
    
    const result = await db.query(query, params); 
    res.json(result.rows[0]);
  } catch (error) { 
    console.error("Error al actualizar estado:", error);
    res.status(500).json({ error: 'Error al actualizar estado' }); 
  }
};

exports.actualizarAlerta = async (req, res) => { 
  try { 
    const result = await db.query('UPDATE pedidos SET alerta_cocina = $1 WHERE id = $2 RETURNING *', [req.body.alerta_cocina, req.params.id]); 
    res.json(result.rows[0]); 
  } catch (error) { 
    res.status(500).json({ error: 'Error' }); 
  } 
};

exports.obtenerPedidosCliente = async (req, res) => { 
  try { 
    const result = await db.query("SELECT * FROM pedidos WHERE cliente_id = $1 AND estado_preparacion != 'Entregado' AND estado_preparacion != 'Cancelado' ORDER BY fecha_creacion DESC", [req.params.cliente_id]); 
    res.json(result.rows); 
  } catch (error) { 
    res.status(500).json({ error: 'Error' }); 
  } 
};