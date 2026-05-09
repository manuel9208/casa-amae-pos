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
  const { cliente_id, tipo_consumo, metodo_pago, total, carrito, origen, direccion_entrega, descuento_puntos, costo_envio, pagos_mixtos } = req.body;
  
  try {
    await db.query('BEGIN');

    const nroRes = await db.query("SELECT COALESCE(MAX(numero_pedido), 0) + 1 AS num FROM pedidos WHERE DATE(fecha_creacion) = CURRENT_DATE");
    
    const result = await db.query(
      'INSERT INTO pedidos (cliente_id, numero_pedido, tipo_consumo, metodo_pago, total, carrito, origen, estado_preparacion, direccion_entrega, descuento_puntos, costo_envio, pagos_mixtos) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *', 
      [cliente_id, nroRes.rows[0].num, tipo_consumo, metodo_pago, total, JSON.stringify(carrito), origen, 'Pendiente', direccion_entrega, descuento_puntos, costo_envio || 0, pagos_mixtos ? JSON.stringify(pagos_mixtos) : null]
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

    // AQUÍ SOLO DESCONTAMOS LOS PUNTOS USADOS PARA PAGAR
    if (cliente_id && descuento_puntos > 0) { 
      await db.query('UPDATE clientes SET puntos = puntos - $1 WHERE id = $2', [descuento_puntos, cliente_id]); 
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

// ================= ACTUALIZAR ESTADO =================
exports.actualizarEstado = async (req, res) => {
  const { id } = req.params; 
  const { estado_preparacion, chef_id, carrito, metodo_pago, total, costo_envio, pagos_mixtos } = req.body;
  
  try {
    // 1. Obtenemos el estado anterior del pedido ANTES de modificarlo
    const prevRes = await db.query('SELECT estado_preparacion, cliente_id, descuento_puntos, total, carrito FROM pedidos WHERE id = $1', [id]);
    if (prevRes.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    const pedidoPrevio = prevRes.rows[0];

    // 2. Construimos la consulta dinámica de actualización
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

    if (pagos_mixtos !== undefined) {
      query += `, pagos_mixtos = $${pIdx}`;
      params.push(pagos_mixtos); 
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
    
    // 3. Ejecutamos la actualización
    const result = await db.query(query, params); 
    const pedidoActual = result.rows[0];

    // =========================================================================
    // 👇 NUEVA LÓGICA DE PUNTOS: SOLO SUMA PLATILLOS ELEGIBLES
    // =========================================================================
    if (pedidoActual.cliente_id) {
      const yaEstabaPagado = (pedidoPrevio.estado_preparacion === 'Pagado' || pedidoPrevio.estado_preparacion === 'Entregado');
      const ahoraEstaPagado = (estado_preparacion === 'Pagado' || estado_preparacion === 'Entregado');
      
      // A) ABONAR PUNTOS (Solo ocurre una vez cuando pasa a Pagado/Entregado)
      if (!yaEstabaPagado && ahoraEstaPagado) {
          try {
              const confRes = await db.query('SELECT * FROM configuracion WHERE id = 1');
              if (confRes.rows.length > 0) {
                  const config = confRes.rows[0];
                  
                  if (config.puntos_activos === true || config.puntos_activos === 'true' || config.puntos_activos === undefined) {
                      const porcentaje = config.puntos_porcentaje !== undefined ? Number(config.puntos_porcentaje) : 10;
                      
                      let totalElegible = 0;
                      const carritoItems = typeof pedidoActual.carrito === 'string' ? JSON.parse(pedidoActual.carrito) : pedidoActual.carrito;

                      if (carritoItems && carritoItems.length > 0) {
                          for (const item of carritoItems) {
                              let genera = true;
                              if (item.id) {
                                  // Revisamos si el platillo y su categoría generan puntos
                                  const prodRes = await db.query(`
                                      SELECT p.genera_puntos as p_genera, c.genera_puntos as c_genera 
                                      FROM productos p 
                                      LEFT JOIN clasificaciones c ON p.categoria = c.nombre 
                                      WHERE p.id = $1
                                  `, [item.id]);

                                  if (prodRes.rows.length > 0) {
                                      const data = prodRes.rows[0];
                                      if (data.p_genera === false || data.c_genera === false) genera = false;
                                  }
                              }
                              
                              if (genera) {
                                  totalElegible += Number(item.precioFinal || 0) * Number(item.cantidad || 1);
                              }
                          }
                      }

                      // Calculamos los puntos en base al dinero elegible, no al total de la orden
                      const puntosAGanar = Math.floor(totalElegible * (porcentaje / 100));
                      
                      if (puntosAGanar > 0) {
                          await db.query('UPDATE clientes SET puntos = puntos + $1 WHERE id = $2', [puntosAGanar, pedidoActual.cliente_id]);
                      }
                  }
              }
          } catch(e) { console.log('Error abonando puntos de fidelidad:', e.message); }
      }

      // B) DEVOLVER PUNTOS (Si el pedido se cancela y el cliente había usado sus puntos para pagar)
      if (estado_preparacion === 'Cancelado' && pedidoPrevio.estado_preparacion !== 'Cancelado') {
          if (pedidoPrevio.descuento_puntos && Number(pedidoPrevio.descuento_puntos) > 0) {
              await db.query('UPDATE clientes SET puntos = puntos + $1 WHERE id = $2', [pedidoPrevio.descuento_puntos, pedidoPrevio.cliente_id]);
          }
      }
    }

    // =========================================================================
    // LÓGICA DE WHATSAPP
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
            let instruccion = '';
            if (pedidoActual.tipo_consumo === 'Domicilio') {
              instruccion = 'Ya va en camino a tu domicilio 🛵';
            } else if (pedidoActual.tipo_consumo === 'Recoger en Local') {
              instruccion = 'Puedes pasar a la sucursal por ella 🚗';
            } else {
              instruccion = 'Por favor pasa a la barra a recogerla 🍔';
            }

            const numeroDestino = `52${telefonoCliente}`; 
            
            const payloadMeta = {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: numeroDestino,
              type: "template",
              template: {
                name: "alerta_pedido_listo", 
                language: { code: "es_MX" },
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: String(pedidoActual.numero_pedido) }, 
                      { type: "text", text: config.nombre_negocio || 'nuestro restaurante' }, 
                      { type: "text", text: instruccion } 
                    ]
                  }
                ]
              }
            };
            
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
        console.error("Fallo interno en la lógica de WhatsApp:", errWA.message);
      }
    }

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