import React, { useState, useEffect } from 'react';
// 🛡️ CORRECCIÓN: Rutas exactas según tu estructura de carpetas
import PantallaConsumo from './checkout/PantallaConsumo';
import PantallaRegistro from './checkout/PantallaRegistro';
import PantallaMesa from './checkout/PantallaMesa';
import PantallaDomicilio from './checkout/PantallaDomicilio';
import PantallaPago from './checkout/PantallaPago';
import PantallaExito from './checkout/PantallaExito';

const CheckoutFlujo = ({
  pantallaActual, setPantallaActual, tipoConsumo, setTipoConsumo, direccionEntrega, setDireccionEntrega,
  direccionesGuardadas, setDireccionesGuardadas, carrito, calcularTotal, setCarrito, productos,
  descuentoPuntos, cuponActivo, descuentoCuponDinero, clienteActivo, ordenExterna, user,
  pedidoEditandoId, apiUrl, configGlobal, setErrorTransaccion, setMetodoPagoFinal,
  numeroPedidoReal, setNumeroPedidoReal, contador, setContador, reiniciarKiosco,
  metodoPagoFinal, mesaQR, isOffline,
  promocionVigente, setPromocionVigente 
}) => {

  const [telefonoRecoger, setTelefonoRecoger] = useState('');
  const [pasoTelefono, setPasoTelefono] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nombreOrden, setNombreOrden] = useState(clienteActivo?.nombre || '');
  const [mesasDisponibles, setMesasDisponibles] = useState([]);
  const [mesaSeleccionadaInterna, setMesaSeleccionadaInterna] = useState(null);

  const esPersonalInterno = user && user.rol && (user.rol === 'admin' || user.rol === 'cajero' || user.usuario === 'kiosco');

  useEffect(() => {
     if (clienteActivo?.nombre) setNombreOrden(clienteActivo.nombre);
  }, [clienteActivo]);

  useEffect(() => {
    if (esPersonalInterno && !isOffline) {
      fetch(`${apiUrl}/mesas`)
        .then(res => res.json())
        .then(data => setMesasDisponibles(Array.isArray(data) ? data : []))
        .catch(e => console.error("Error cargando mesas:", e));
    }
  }, [apiUrl, esPersonalInterno, isOffline]);

  useEffect(() => {
    if (pantallaActual === 'consumo' && mesaQR) {
        procesarTipoConsumo('Local');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantallaActual, mesaQR]);

  const agregarUpsellAlCarrito = () => {
    let precioFinal = Number(promocionVigente.valor_descuento);
    
    if (promocionVigente.tipo_descuento === 'porcentaje') {
       let precioBase = 0;
       if (productos && productos.length > 0) {
          const prodOriginal = productos.find(p => p.id === promocionVigente.producto_oferta_id);
          if (prodOriginal) precioBase = Number(prodOriginal.precio_base);
       }
       precioFinal = precioBase - (precioBase * (precioFinal / 100));
    }
    
    const nuevoItem = {
       idTicket: Math.random().toString(36).substr(2, 9),
       id: promocionVigente.producto_oferta_id,
       nombre: promocionVigente.oferta_nombre,
       precioFinal: Math.max(0, precioFinal), 
       cantidad: 1,
       extras: [{ nombre: `⭐ Promo: ${promocionVigente.nombre}`, precio: 0 }]
    };
    
    if (typeof setCarrito === 'function') {
        setCarrito([...carrito, nuevoItem]);
    }
    setPromocionVigente(null); 
  };

  const procesarTipoConsumo = (tipo) => { 
    setTipoConsumo(tipo); 
    
    if (tipo === 'Domicilio') {
        setPantallaActual('aviso_domicilio'); 
    } else if (tipo === 'Recoger') {
        if (!clienteActivo) setPasoTelefono(true);
        else seleccionarPago('Pendiente', null, tipo);
    } else if (tipo === 'Local' || tipo === 'Para llevar') {
        setPantallaActual('pedir_nombre');
    } else {
        seleccionarPago('Pendiente', null, tipo);
    }
  };

  const continuarDesdeNombre = () => {
    if (tipoConsumo === 'Local') {
        if (esPersonalInterno && !mesaQR) {
            if (mesasDisponibles.length > 0) {
                setPantallaActual('asignar_mesa');
            } else {
                seleccionarPago('Por Cobrar', null, 'Local');
            }
        }
        else if (esPersonalInterno && mesaQR) seleccionarPago('Por Cobrar', null, 'Local', mesaQR);
        else seleccionarPago('Pendiente', null, 'Local');
    } else if (tipoConsumo === 'Para llevar') {
        seleccionarPago('Pendiente', null, 'Para llevar'); 
    }
  };

  const continuarAPagoDesdeDireccion = () => {
    if (tipoConsumo === 'Domicilio' && direccionEntrega.trim()) {
        let nuevas = [...direccionesGuardadas];
        const dir = direccionEntrega.trim();
        
        if (!nuevas.includes(dir)) {
            nuevas.unshift(dir);
            if (nuevas.length > 2) nuevas.pop(); 
            setDireccionesGuardadas(nuevas);
            if (clienteActivo && clienteActivo.id) {
                localStorage.setItem(`direcciones_${clienteActivo.id}`, JSON.stringify(nuevas));
            }
        }
        
        if (!clienteActivo) { setPasoTelefono(true); return; }
    }
    setPantallaActual('pago');
  };

  // 🛡️ CORRECCIÓN: Aceptamos "nuevoClienteIdBypass" para amarrar la orden al cliente recién registrado
  const guardarPedidoEnBD = async (metodoSeleccionado, direccionFinalConAviso = direccionEntrega, tipoBypass = null, mesaBypass = null, nuevoClienteIdBypass = null) => {
    setErrorTransaccion(''); 
    setMetodoPagoFinal(metodoSeleccionado);
    
    const tipoReal = tipoBypass || tipoConsumo;
    // Asignamos el ID correcto si es cliente viejo, si es externo, o si se acaba de registrar
    const idClienteAGuardar = nuevoClienteIdBypass || (ordenExterna ? ordenExterna.cliente_id : (clienteActivo?.id || null));
    
    let origenCalculado = 'Web'; 
    if (user?.rol === 'cajero') origenCalculado = 'Caja'; 
    else if (user?.usuario === 'kiosco' || user?.usuario === 'admin') origenCalculado = 'Kiosco'; 
    
    let notaDireccion = direccionFinalConAviso;
    const tel = clienteActivo ? clienteActivo.telefono : telefonoRecoger;

    if (tipoReal === 'Recoger') notaDireccion = `PEDIDO POR TELÉFONO - CONTACTO: ${tel || ''}`;
    else if (tipoReal === 'Domicilio' && tel) notaDireccion = `${direccionFinalConAviso} | TEL: ${tel}`;
    else if (tipoReal === 'Local' || tipoReal === 'Para llevar') {
        if (nombreOrden) notaDireccion = `A NOMBRE DE: ${nombreOrden}`;
    } else if (tel) notaDireccion = `TEL: ${tel}`;

    const carritoExpandido = [];
    carrito.forEach(item => {
        const qty = item.cantidad || 1;
        for(let i = 0; i < qty; i++) {
            carritoExpandido.push({...item, cantidad: 1, idTicket: item.idTicket + '_' + i});
        }
    });

    let estadoInicial = ordenExterna ? ordenExterna.estado_preparacion : 'Pendiente';
    const mesaFinal = mesaQR || mesaBypass || mesaSeleccionadaInterna || (ordenExterna ? ordenExterna.mesa : null);

    const paquete = { 
      cliente_id: idClienteAGuardar, 
      tipo_consumo: tipoReal === 'Recoger' ? 'Recoger en Local' : tipoReal, 
      metodo_pago: metodoSeleccionado, 
      total: calcularTotal(), 
      carrito: carritoExpandido, 
      origen: origenCalculado, 
      direccion_entrega: notaDireccion, 
      descuento_puntos: descuentoPuntos, 
      cupon_codigo: cuponActivo && descuentoCuponDinero > 0 ? cuponActivo.codigo : null, 
      estado_preparacion: estadoInicial,
      mesa: mesaFinal 
    };

    if (isOffline) {
       try {
           const pedidosOffline = JSON.parse(localStorage.getItem('pedidos_offline') || '[]');
           const numeroFalso = Math.floor(Math.random() * 90000) + 10000;
           const idOffline = `OFF-${numeroFalso}`;
           
           const paqueteOffline = {
               ...paquete, es_offline: true, numero_pedido_offline: idOffline, fecha_guardado_local: new Date().toISOString()
           };
           
           pedidosOffline.push(paqueteOffline);
           localStorage.setItem('pedidos_offline', JSON.stringify(pedidosOffline));
           
           setNumeroPedidoReal(idOffline);
           return true;
       } catch (errorLocal) {
           setErrorTransaccion('No hay memoria suficiente en la tablet para guardar el pedido offline.');
           return false;
       }
    }

    try {
      const url = pedidoEditandoId ? `${apiUrl}/pedidos/${pedidoEditandoId}` : `${apiUrl}/pedidos`; 
      const res = await fetch(url, { 
        method: pedidoEditandoId ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(paquete) 
      });
      
      if (res.ok) { 
        const data = await res.json(); 
        if (cuponActivo && cuponActivo.id) {
           try { await fetch(`${apiUrl}/cupones/${cuponActivo.id}/uso`, { method: 'PUT' }); } catch(e) {}
        }

        // 🛡️ SINCRONIZACIÓN INTELIGENTE DIRECTA (FIRE AND FORGET)
        // Ya no requerimos GET previo, enviamos el PUT con la dirección directamente
        if (idClienteAGuardar && tipoReal === 'Domicilio' && direccionFinalConAviso) {
            const dirLimpia = direccionFinalConAviso.split(' | TEL:')[0].split(' | (Llevar')[0].trim();
            fetch(`${apiUrl}/clientes/${idClienteAGuardar}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ direccion: dirLimpia })
            }).catch(() => {}); // Si falla silenciosamente, no interrumpe el flujo
        }

        setNumeroPedidoReal(data.numero_pedido); 
        return true; 
      } else { 
        const errData = await res.json(); 
        setErrorTransaccion(errData.error || 'Error en el servidor'); 
        return false; 
      }
    } catch (error) { 
      setErrorTransaccion('Sin conexión al servidor.'); 
      return false; 
    }
  };

  const seleccionarPago = async (metodo, montoEfectivo = null, tipoBypass = null, mesaBypass = null, nuevoClienteIdBypass = null) => { 
    if (isSubmitting) return; 
    setIsSubmitting(true);

    let dirModificada = direccionEntrega;
    const tipoReal = tipoBypass || tipoConsumo;
    
    if (metodo === 'Efectivo' && tipoReal === 'Domicilio' && montoEfectivo) {
        dirModificada = `${direccionEntrega} | (Llevar cambio para: ${montoEfectivo})`;
    }
    
    const ok = await guardarPedidoEnBD(metodo, dirModificada, tipoReal, mesaBypass, nuevoClienteIdBypass); 
    
    if (ok) { 
      setPasoTelefono(false); 
      if (metodo === 'Transferencia') setPantallaActual('detalles_transferencia'); 
      else { setContador(15); setPantallaActual('finalizado'); } 
    } 
    setIsSubmitting(false); 
  };
  
  const procesarTransferencia = () => { setContador(15); setPantallaActual('finalizado'); };

  const getBackRuta = () => {
    if (tipoConsumo === 'Local' && esPersonalInterno && !mesaQR) return 'asignar_mesa';
    if (tipoConsumo === 'Domicilio') return 'direccion';
    return 'consumo';
  };

  const asignarMesaYEnviar = (mesaNombre) => {
    setMesaSeleccionadaInterna(mesaNombre);
    seleccionarPago('Por Cobrar', null, 'Local', mesaNombre);
  };

  if (pantallaActual === 'consumo' && mesaQR) return null;

  if (pasoTelefono || pantallaActual === 'pedir_nombre') {
    return (
      <PantallaRegistro 
        pasoTelefono={pasoTelefono} setPasoTelefono={setPasoTelefono}
        tipoConsumo={tipoConsumo} isSubmitting={isSubmitting}
        telefonoRecoger={telefonoRecoger} setTelefonoRecoger={setTelefonoRecoger}
        setPantallaActual={setPantallaActual} seleccionarPago={seleccionarPago}
        nombreOrden={nombreOrden} setNombreOrden={setNombreOrden}
        continuarDesdeNombre={continuarDesdeNombre}
        direccionEntrega={direccionEntrega} 
      />
    );
  }

  if (pantallaActual === 'consumo') {
    return (
      <PantallaConsumo 
        esPersonalInterno={esPersonalInterno} mesaQR={mesaQR}
        promocionVigente={promocionVigente} setPromocionVigente={setPromocionVigente}
        agregarUpsellAlCarrito={agregarUpsellAlCarrito} setPantallaActual={setPantallaActual}
        procesarTipoConsumo={procesarTipoConsumo} apiUrl={apiUrl}
      />
    );
  }

  if (pantallaActual === 'asignar_mesa') {
    return (
      <PantallaMesa 
        isSubmitting={isSubmitting} setPantallaActual={setPantallaActual}
        asignarMesaYEnviar={asignarMesaYEnviar} mesasDisponibles={mesasDisponibles}
      />
    );
  }

  if (pantallaActual === 'aviso_domicilio' || pantallaActual === 'direccion') {
    return (
      <PantallaDomicilio 
        pantallaActual={pantallaActual} setPantallaActual={setPantallaActual}
        configGlobal={configGlobal} direccionEntrega={direccionEntrega}
        setDireccionEntrega={setDireccionEntrega} direccionesGuardadas={direccionesGuardadas}
        continuarAPagoDesdeDireccion={continuarAPagoDesdeDireccion}
        clienteActivo={clienteActivo}
      />
    );
  }

  if (['pago', 'cambio_efectivo_domicilio', 'detalles_transferencia'].includes(pantallaActual)) {
    return (
      <PantallaPago 
        pantallaActual={pantallaActual} setPantallaActual={setPantallaActual}
        isSubmitting={isSubmitting} seleccionarPago={seleccionarPago}
        getBackRuta={getBackRuta} tipoConsumo={tipoConsumo}
        esPersonalInterno={esPersonalInterno} calcularTotal={calcularTotal}
        configGlobal={configGlobal} numeroPedidoReal={numeroPedidoReal}
        procesarTransferencia={procesarTransferencia}
      />
    );
  }

  if (pantallaActual === 'finalizado') {
    return (
      <PantallaExito 
        isOffline={isOffline} numeroPedidoReal={numeroPedidoReal}
        tipoConsumo={tipoConsumo} metodoPagoFinal={metodoPagoFinal}
        contador={contador} reiniciarKiosco={reiniciarKiosco}
      />
    );
  }

  return null;
};

export default CheckoutFlujo;