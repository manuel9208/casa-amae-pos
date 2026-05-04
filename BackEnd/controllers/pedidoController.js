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
  const { cliente_id, tipo_consumo, metodo_pago, total, carrito, origen, direccion_entrega, descuento_puntos, costo_envio } = req.body;
  
  try {
    await db.query('BEGIN');

    const nroRes = await db.query("SELECT COALESCE(MAX(numero_pedido), 0) + 1 AS num FROM pedidos WHERE DATE(fecha_creacion) = CURRENT_DATE");
    
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
    const result = await db.query(
      'UPDATE pedidos SET tipo_consumo = $1, metodo_pago = $2, total = $3, carrito = $4, estado_preparacion = $5, direccion_entrega = $6, costo_envio = $7 WHERE id = $8 RETURNING *', 
      [req.body.tipo_consumo, req.body.metodo_pago, req.body.total, JSON.stringify(req.body.carrito), 'Pendiente', req.body.direccion_entrega, req.body.costo_envio || 0, req.params.id]
    ); 
    res.json(result.rows[0]); 
  } catch (error) { 
    res.status(500).json({ error: 'Error' }); 
  } 
};

// ================= ACTUALIZAR ESTADO (MAGIA DE WHATSAPP CON TEMPLATE) =================
exports.actualizarEstado = async (req, res) => {
  const { id } = req.params; 
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
    
    if (total !== undefined) {
      query += `, total = $${pIdx}`;
      params.push(total);
      pIdx++;
    }
    
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
    const pedidoActual = result.rows[0];

    // 👇 =========================================================================
    // NUEVO: ENVÍO DE TEMPLATE APROBADO POR META (SOLO CUANDO ESTÁ "LISTO")
    // =========================================================================
    if (estado_preparacion === 'Listo') {
      try {
        const configRes = await db.query('SELECT wa_api_activa, wa_api_token, wa_phone_id, nombre_negocio FROM configuracion WHERE id = 1');
        const config = configRes.rows[0];

        if (config && (config.wa_api_activa === true || config.wa_api_activa === 'true') && config.wa_api_token && config.wa_phone_id) {
          
          let telefonoCliente = null;
          if (pedidoActual.cliente_id) {
            const clienteRes = await db.query('SELECT telefono FROM clientes WHERE id = $1', [pedidoActual.cliente_id]);
            if (clienteRes.rows.length > 0) telefonoCliente = clienteRes.rows[0].telefono;
          } else if (pedidoActual.direccion_entrega && pedidoActual.direccion_entrega.includes('CONTACTO:')) {
            const match = pedidoActual.direccion_entrega.match(/CONTACTO:\s*(\d+)/);
            if (match && match[1]) telefonoCliente = match[1];
          }

          if (telefonoCliente && telefonoCliente.length === 10) {
            
            // Definimos la instrucción dependiendo del tipo de consumo
            let instruccion = '';
            if (pedidoActual.tipo_consumo === 'Domicilio') {
              instruccion = 'Ya va en camino a tu domicilio 🛵';
            } else if (pedidoActual.tipo_consumo === 'Recoger en Local') {
              instruccion = 'Puedes pasar a la sucursal por ella 🚗';
            } else {
              instruccion = 'Por favor pasa a la barra a recogerla 🍔';
            }

            // Asumimos código 52 (México). Ajústalo si estás en otro país.
            const numeroDestino = `52${telefonoCliente}`; 
            
            // Construimos la petición usando el Template "alerta_pedido_listo"
            const payloadMeta = {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: numeroDestino,
              type: "template",
              template: {
                name: "alerta_pedido_listo", // 👈 ESTE NOMBRE ES VITAL PARA META
                language: {
                  code: "es_MX" // Español México
                },
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: String(pedidoActual.numero_pedido) }, // {{1}}
                      { type: "text", text: config.nombre_negocio || 'nuestro restaurante' }, // {{2}}
                      { type: "text", text: instruccion } // {{3}}
                    ]
                  }
                ]
              }
            };
            
            // Enviamos la petición a Meta
            fetch(`https://graph.facebook.com/v17.0/${config.wa_phone_id}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${config.wa_api_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payloadMeta)
            })
            .then(waRes => waRes.json())
            .then(waData => {
              if (waData.error) console.error("Error API WhatsApp Meta (Template):", waData.error.message);
              else console.log(`✅ Template de WhatsApp enviado a ${numeroDestino} (Orden #${pedidoActual.numero_pedido})`);
            })
            .catch(e => console.error("Error de red al enviar Template de WhatsApp:", e.message));
          }
        }
      } catch (errWA) {
        console.error("Fallo interno en la lógica de WhatsApp (no afecta el pedido):", errWA.message);
      }
    }
    // =========================================================================

    res.json(pedidoActual);
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