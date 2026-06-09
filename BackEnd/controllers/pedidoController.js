const db = require('../config/db');
const webpush = require('web-push');  

// ==========================================
// HELPERS PARA NOTIFICACIONES PUSH
// ==========================================
const notificarCliente = async (cliente_id, titulo, cuerpo) => {
  if(!cliente_id) return;
  try {
    const subs = await db.query("SELECT suscripcion FROM suscripciones_push WHERE cliente_id = $1", [cliente_id]);
    const payload = JSON.stringify({ title: titulo, body: cuerpo });  
    for(let row of subs.rows) {
      const sub = typeof row.suscripcion === 'string' ? JSON.parse(row.suscripcion) : row.suscripcion;
      await webpush.sendNotification(sub, payload).catch(e => console.log("Push desactivado o expirado (cliente):", e.message));
    }
  } catch(e) {
    console.error("Error al notificar cliente:", e.message);
  }
};  

const notificarStaff = async (rolesArray, titulo, cuerpo) => {
  try {
    let query = "SELECT s.suscripcion FROM suscripciones_push s JOIN usuarios u ON s.usuario_id = u.id";
    let subs;  
    if (rolesArray && rolesArray.length > 0) {
      const placeholders = rolesArray.map((_, i) => `$${i+1}`).join(',');
      query += ` WHERE u.rol IN (${placeholders})`;
      subs = await db.query(query, rolesArray);
    } else {
      subs = await db.query(query);
    }  
    const payload = JSON.stringify({ title: titulo, body: cuerpo });  
    for(let row of subs.rows) {
      const sub = typeof row.suscripcion === 'string' ? JSON.parse(row.suscripcion) : row.suscripcion;
      await webpush.sendNotification(sub, payload).catch(e => console.log("Push desactivado o expirado (staff):", e.message));
    }
  } catch(e) {
    console.error("Error al notificar staff:", e.message);
  }
};

// ==========================================  
exports.obtenerPedidosHoy = async (req, res) => {
  try {
    const query = `
      SELECT p.*, c.nombre as cliente_nombre
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE DATE(p.fecha_creacion) = CURRENT_DATE
      ORDER BY p.fecha_creacion DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};  

const limpiarNulos = (obj) => {
  const newObj = { ...obj };
  for (let key in newObj) { if (newObj[key] === undefined) { delete newObj[key]; } }
  return newObj;
};  

exports.crearPedido = async (req, res) => {
  const datosPuros = limpiarNulos(req.body);
  const { cliente_id, chef_id, origen, tipo_consumo, direccion_entrega, metodo_pago, total, carrito, estado_preparacion, mesa, cupon_codigo, descuento_puntos, costo_envio, pagos_mixtos } = datosPuros;  
  
  try {
    await db.query('BEGIN');  
    
    const nroRes = await db.query("SELECT COALESCE(MAX(numero_pedido), 0) + 1 AS num FROM pedidos WHERE DATE(fecha_creacion) = CURRENT_DATE");
    const sigNumero = nroRes.rows[0].num;  
    
    const estadoReal = estado_preparacion || 'Pendiente';
    const carritoStr = typeof carrito === 'string' ? carrito : JSON.stringify(carrito || []);  
    
    let costoEnvioFinal = 0;
    if (costo_envio !== undefined) {
      if (typeof costo_envio === 'object' && costo_envio !== null && costo_envio.costo !== undefined) {
        costoEnvioFinal = Number(costo_envio.costo);
      } else {
        costoEnvioFinal = Number(String(costo_envio).replace(/[^0-9.-]+/g,"")) || 0;
      }
    }  
    
    const insertQuery = `
      INSERT INTO pedidos (
      cliente_id, numero_pedido, chef_id, tipo_consumo, metodo_pago, total, carrito,
      origen, estado_preparacion, direccion_entrega, descuento_puntos,
      costo_envio, pagos_mixtos, mesa, cupon_codigo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *
    `;  
    
    const values = [cliente_id, sigNumero, chef_id, tipo_consumo, metodo_pago, total, carritoStr, origen || 'Kiosco', estadoReal, direccion_entrega, descuento_puntos || 0, costoEnvioFinal, pagos_mixtos ? JSON.stringify(pagos_mixtos) : null, mesa || null, cupon_codigo || null];  
    const result = await db.query(insertQuery, values);
    const pedidoInsertado = result.rows[0];  
    
    if (mesa) {
      await db.query("UPDATE mesas SET estado = 'Ocupada', pedido_actual_id = $1 WHERE numero_mesa = $2", [pedidoInsertado.id, mesa]);
    }  
    
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
            // 👇 SOLUCIÓN: MOTOR DE EXPLOSIÓN DE MATERIALES RECURSIVO (INFINITOS NIVELES)
            const recursiveQuery = `
              WITH RECURSIVE Explosion AS (
                -- Caso Base: Elementos directos de la receta del platillo
                SELECT
                  r.insumo_id,
                  r.sub_producto_id,
                  (r.cantidad_usada::numeric * $1::numeric) AS qty_factor
                FROM recetas r
                WHERE r.producto_id = $2
                
                UNION ALL
                
                -- Paso Recursivo: Si hay sub-recetas anidadas, entra hasta encontrar insumos
                SELECT
                  r.insumo_id,
                  r.sub_producto_id,
                  ((e.qty_factor / COALESCE(NULLIF(p.rendimiento::numeric, 0), 1)) * r.cantidad_usada::numeric)::numeric
                FROM Explosion e
                JOIN productos p ON e.sub_producto_id = p.id
                JOIN recetas r ON r.producto_id = p.id
                WHERE e.sub_producto_id IS NOT NULL
              )
              -- Actualización directa sumando todos los requerimientos crudos de la cascada
              UPDATE insumos
              SET stock_actual = stock_actual - calc.total_descontar
              FROM (
                SELECT insumo_id, SUM(qty_factor) as total_descontar
                FROM Explosion
                WHERE insumo_id IS NOT NULL
                GROUP BY insumo_id
              ) calc
              WHERE insumos.id = calc.insumo_id;
            `;
            await db.query(recursiveQuery, [lotesADescontar, prodId]);
          }
        }
      }
    }  
    
    if (cliente_id && descuento_puntos > 0) {
      await db.query('UPDATE clientes SET puntos = puntos - $1 WHERE id = $2', [descuento_puntos, cliente_id]);
    }  
    
    await db.query('COMMIT');  
    
    if (estadoReal === 'Pagado') {
      notificarStaff(['chef', 'cocinero', 'cocina', 'ayudante_cocina'], '👨🍳 Nueva Comanda (Comedor)', `La orden #${pedidoInsertado.numero_pedido} entró directo a cocina.`);
    } else {
      notificarStaff(['cajero', 'admin'], '¡Nuevo Pedido!', `La orden #${pedidoInsertado.numero_pedido} acaba de llegar.`);
      if (cliente_id) notificarCliente(cliente_id, 'Orden Recibida 🕒', `Tu orden #${pedidoInsertado.numero_pedido} está en espera de confirmación.`);
    }  
    
    res.status(201).json(pedidoInsertado);  
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("Error al crear pedido:", error);
    res.status(500).json({ error: 'Error en el servidor al crear pedido' });
  }
};  

exports.actualizarPedido = async (req, res) => {
  const { id } = req.params;
  const datosPuros = limpiarNulos(req.body);
  const { cliente_id, tipo_consumo, metodo_pago, direccion_entrega, total, carrito, estado_preparacion, mesa, costo_envio } = datosPuros;  
  
  try {
    const carritoStr = typeof carrito === 'string' ? carrito : JSON.stringify(carrito || []);  
    
    let costoEnvioFinal = 0;
    if (costo_envio !== undefined) {
      if (typeof costo_envio === 'object' && costo_envio !== null && costo_envio.costo !== undefined) {
        costoEnvioFinal = Number(costo_envio.costo);
      } else {
        costoEnvioFinal = Number(String(costo_envio).replace(/[^0-9.-]+/g,"")) || 0;
      }
    }  
    
    let updateFields = []; let params = []; let paramIndex = 1;  
    if (cliente_id !== undefined) { updateFields.push(`cliente_id = $${paramIndex++}`); params.push(cliente_id); }
    if (tipo_consumo !== undefined) { updateFields.push(`tipo_consumo = $${paramIndex++}`); params.push(tipo_consumo); }
    if (metodo_pago !== undefined) { updateFields.push(`metodo_pago = $${paramIndex++}`); params.push(metodo_pago); }
    if (direccion_entrega !== undefined) { updateFields.push(`direccion_entrega = $${paramIndex++}`); params.push(direccion_entrega); }
    if (total !== undefined) { updateFields.push(`total = $${paramIndex++}`); params.push(total); }
    if (carrito !== undefined) { updateFields.push(`carrito = $${paramIndex++}`); params.push(carritoStr); }
    if (estado_preparacion !== undefined) { updateFields.push(`estado_preparacion = $${paramIndex++}`); params.push(estado_preparacion); }
    if (mesa !== undefined) { updateFields.push(`mesa = $${paramIndex++}`); params.push(mesa); }
    if (costo_envio !== undefined) { updateFields.push(`costo_envio = $${paramIndex++}`); params.push(costoEnvioFinal); }  
    
    if (updateFields.length === 0) return res.json({ success: true, message: 'No hay cambios' });  
    
    params.push(id);
    const query = `UPDATE pedidos SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, params);  
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Error al actualizar pedido completo' }); }
};  

exports.actualizarEstado = async (req, res) => {
  const { id } = req.params;
  const { estado_preparacion, chef_id, carrito, metodo_pago, total, costo_envio, pagos_mixtos } = req.body;  
  
  try {
    const prevRes = await db.query('SELECT estado_preparacion, cliente_id, descuento_puntos, total, carrito, mesa, chef_id FROM pedidos WHERE id = $1', [id]);
    if (prevRes.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    
    const pedidoPrevio = prevRes.rows[0];  
    
    let updateFields = ['estado_preparacion = $1'];
    let params = [estado_preparacion];
    let queryIndex = 2;  
    
    if (chef_id !== undefined) { updateFields.push(`chef_id = $${queryIndex}`); params.push(chef_id); queryIndex++; }
    if (carrito !== undefined) { updateFields.push(`carrito = $${queryIndex}`); params.push(typeof carrito === 'string' ? carrito : JSON.stringify(carrito)); queryIndex++; }
    if (metodo_pago !== undefined) { updateFields.push(`metodo_pago = $${queryIndex}`); params.push(metodo_pago); queryIndex++; }
    if (total !== undefined) { updateFields.push(`total = $${queryIndex}`); params.push(total); queryIndex++; }
    if (pagos_mixtos !== undefined) { updateFields.push(`pagos_mixtos = $${queryIndex}`); params.push(JSON.stringify(pagos_mixtos)); queryIndex++; }
    if (costo_envio !== undefined) {
      let finalEnvio = 0;
      if (typeof costo_envio === 'object' && costo_envio !== null) finalEnvio = Number(costo_envio.costo || 0);
      else finalEnvio = Number(String(costo_envio).replace(/[^0-9.-]+/g,"")) || 0;
      updateFields.push(`costo_envio = $${queryIndex}`); params.push(finalEnvio); queryIndex++;
    }  
    
    if (estado_preparacion === 'Preparando') { updateFields.push(`tiempo_inicio_preparacion = CURRENT_TIMESTAMP`); }
    if (estado_preparacion === 'Listo') { updateFields.push(`tiempo_listo = CURRENT_TIMESTAMP`); }
    if (estado_preparacion === 'En Camino') { updateFields.push(`tiempo_salida_reparto = CURRENT_TIMESTAMP`); }
    if (estado_preparacion === 'Entregado') { updateFields.push(`tiempo_entregado = CURRENT_TIMESTAMP`); }  
    
    params.push(id);
    const result = await db.query(`UPDATE pedidos SET ${updateFields.join(', ')} WHERE id = $${queryIndex} RETURNING *`, params);
    const pedidoActual = result.rows[0];  
    
    if (pedidoPrevio.mesa) {
      const isPagadoDinero = (pedidoActual.metodo_pago === 'Efectivo' || pedidoActual.metodo_pago === 'Tarjeta' || pedidoActual.metodo_pago === 'Transferencia' || pedidoActual.metodo_pago === 'Mixto');  
      if (estado_preparacion === 'Cancelado' || estado_preparacion === 'Finalizado' || (estado_preparacion === 'Entregado' && isPagadoDinero)) {
        await db.query("UPDATE mesas SET estado = 'Libre', pedido_actual_id = NULL WHERE numero_mesa = $1", [pedidoPrevio.mesa]);
      } else if (estado_preparacion === 'Entregado' && !isPagadoDinero) {
        await db.query("UPDATE mesas SET estado = 'Por Pagar' WHERE numero_mesa = $1", [pedidoPrevio.mesa]);
      } else {
        await db.query("UPDATE mesas SET estado = 'Ocupada' WHERE numero_mesa = $1", [pedidoPrevio.mesa]);
      }
    }  
    
    if (pedidoActual.cliente_id) {
      const yaEstabaPagado = (pedidoPrevio.estado_preparacion === 'Pagado' || pedidoPrevio.estado_preparacion === 'Entregado' || pedidoPrevio.estado_preparacion === 'Finalizado');
      const ahoraEstaPagado = (estado_preparacion === 'Pagado' || estado_preparacion === 'Entregado' || estado_preparacion === 'Finalizado');  
      
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
                    const prodRes = await db.query(`SELECT p.genera_puntos as p_genera, c.genera_puntos as c_genera FROM productos p LEFT JOIN clasificaciones c ON p.categoria = c.nombre WHERE p.id = $1`, [item.id]);
                    if (prodRes.rows.length > 0) {
                      const data = prodRes.rows[0];
                      if (data.p_genera === false || data.c_genera === false) genera = false;
                    }
                  }
                  if (genera) totalElegible += Number(item.precioFinal || 0) * Number(item.cantidad || 1);
                }
              }
              const puntosAGanar = Math.floor(totalElegible * (porcentaje / 100));
              if (puntosAGanar > 0) await db.query('UPDATE clientes SET puntos = puntos + $1 WHERE id = $2', [puntosAGanar, pedidoActual.cliente_id]);
            }
          }
        } catch(e) { console.log('Error abonando puntos:', e.message); }
      }  
      
      if (estado_preparacion === 'Cancelado' && pedidoPrevio.estado_preparacion !== 'Cancelado') {
        if (pedidoPrevio.descuento_puntos && Number(pedidoPrevio.descuento_puntos) > 0) {
          await db.query('UPDATE clientes SET puntos = puntos + $1 WHERE id = $2', [pedidoPrevio.descuento_puntos, pedidoPrevio.cliente_id]);
        }
      }
    }  
    
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
            let instruccion = pedidoActual.tipo_consumo === 'Domicilio' ? 'Ya va en camino a tu domicilio 🛵' : pedidoActual.tipo_consumo === 'Recoger en Local' ? 'Puedes pasar a la sucursal por ella 🚗' : 'Por favor pasa a la barra a recogerla 🍔';
            const numeroDestino = `52${telefonoCliente}`;  
            const payloadMeta = {
              messaging_product: "whatsapp", recipient_type: "individual", to: numeroDestino, type: "template",
              template: {
                name: "alerta_pedido_listo", language: { code: "es_MX" },
                components: [
                  { type: "body", parameters: [{ type: "text", text: String(pedidoActual.numero_pedido) }, { type: "text", text: config.nombre_negocio || 'nuestro restaurante' }, { type: "text", text: instruccion }] }
                ]
              }
            };  
            fetch(`https://graph.facebook.com/v17.0/${config.wa_phone_id}/messages`, {
              method: 'POST', headers: { 'Authorization': `Bearer ${config.wa_api_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payloadMeta)
            }).then(waRes => waRes.json()).then(waData => {
              if (!waData.error) console.log(`✅ Template de WhatsApp enviado a ${numeroDestino}`);
            }).catch(e => console.error("Error de red al enviar Template de WhatsApp:", e.message));
          }
        }
      } catch (errWA) { console.error("Fallo en WhatsApp:", errWA.message); }
    }  
    
    if (estado_preparacion === 'Pagado' || estado_preparacion === 'Por Confirmar') {
      notificarStaff(['chef', 'cocinero', 'cocina', 'ayudante_cocina'], '👨🍳 Nueva Comanda', `La orden #${pedidoActual.numero_pedido} está lista para prepararse.`);
    } else if (estado_preparacion === 'Preparando') {
      notificarCliente(pedidoActual.cliente_id, '¡En el fuego! 🔥', `El chef ya está preparando tu orden #${pedidoActual.numero_pedido}.`);
      notificarStaff(['cajero', 'admin'], 'Preparando Orden', `Cocina comenzó a preparar la orden #${pedidoActual.numero_pedido}.`);
    } else if (estado_preparacion === 'Listo') {
      notificarCliente(pedidoActual.cliente_id, '¡Tu comida está lista! 🍔', `Tu orden #${pedidoActual.numero_pedido} está lista para entregar.`);
      notificarStaff(['cajero', 'admin'], 'Orden Lista ✅', `Cocina terminó la orden #${pedidoActual.numero_pedido}.`);
    } else if (estado_preparacion === 'En Camino') {
      notificarCliente(pedidoActual.cliente_id, '¡Orden en Camino! 🛵', 'El repartidor ya va hacia tu domicilio con tu pedido.');
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
    console.error("Error al actualizar alerta:", error);
    res.status(500).json({ error: 'Error al actualizar alerta' });
  }
};

exports.obtenerHistorialAuditoria = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM pedidos ORDER BY id DESC LIMIT 200');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

exports.obtenerPedidosCliente = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY id DESC LIMIT 50', [req.params.cliente_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos del cliente' });
  }
};