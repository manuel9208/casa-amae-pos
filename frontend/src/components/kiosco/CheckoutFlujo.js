import React, { useState, useEffect } from 'react';
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
  promocionVigente, setPromocionVigente,
  bloqueoPuntosActivo,
  modoKiosco 
}) => {  
  const [telefonoRecoger, setTelefonoRecoger] = useState('');
  const [pasoTelefono, setPasoTelefono] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nombreOrden, setNombreOrden] = useState(clienteActivo?.nombre || '');
  const [mesasDisponibles, setMesasDisponibles] = useState([]);
  const [mesaSeleccionadaInterna, setMesaSeleccionadaInterna] = useState(null);  
  
  const esPersonalInterno = user && user.rol && (user.rol === 'admin' || user.rol === 'cajero' || user.usuario === 'kiosco');  
  const isTerminalFisica = modoKiosco === 'totem' || modoKiosco === 'drive-thru';
  
  useEffect(() => {
    if (clienteActivo?.nombre) setNombreOrden(clienteActivo.nombre);
  }, [clienteActivo]);  
  
  useEffect(() => {
    if ((esPersonalInterno || isTerminalFisica) && !isOffline) {
      fetch(`${apiUrl}/mesas`)
        .then(res => res.json())
        .then(data => setMesasDisponibles(Array.isArray(data) ? data : []))
        .catch(e => console.error("Error cargando mesas:", e));
    }
  }, [apiUrl, esPersonalInterno, isOffline, isTerminalFisica]);  
  
  useEffect(() => {
    if (pantallaActual === 'consumo') {
      if (mesaQR || modoKiosco === 'mesa') {
        procesarTipoConsumo('Local');
      } else if (modoKiosco === 'drive-thru') {
        procesarTipoConsumo('Para llevar');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantallaActual, mesaQR, modoKiosco]);  
  
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
    
    const agil = esPersonalInterno || isTerminalFisica;

    if (tipo === 'Domicilio') {
      setPantallaActual('aviso_domicilio');
    } else if (tipo === 'Recoger') {
      if (!clienteActivo && !agil) setPantallaActual('pedir_nombre');
      else seleccionarPago('Pendiente', null, tipo);
    } else if (tipo === 'Local') {
      // 👇 NUEVO: Si es invitado en Tótem Físico, pedimos su nombre para llamarlo.
      if (isTerminalFisica && !clienteActivo) {
        setPantallaActual('pedir_nombre');
      } else if (agil) {
        if (mesaQR) {
          seleccionarPago('Por Cobrar', null, 'Local', mesaQR);
        } else if (mesasDisponibles.length > 0) {
          setPantallaActual('asignar_mesa');
        } else {
          if (isTerminalFisica) seleccionarPago('Por Cobrar', null, 'Local');
          else setPantallaActual('pago');
        }
      } else {
        setPantallaActual('pedir_nombre');
      }
    } else if (tipo === 'Para llevar') {
      // 👇 NUEVO: Si es invitado en Tótem/Drive-Thru, pedimos nombre para llamarlo en ventanilla/mostrador.
      if (isTerminalFisica && !clienteActivo) {
        setPantallaActual('pedir_nombre');
      } else if (agil) {
        if (isTerminalFisica) {
          seleccionarPago('Por Cobrar', null, 'Para llevar');
        } else {
          setPantallaActual('pago');
        }
      } else {
        setPantallaActual('pedir_nombre');
      }
    } else {
      seleccionarPago('Pendiente', null, tipo);
    }
  };  
  
  const continuarDesdeNombre = () => {
    const agil = esPersonalInterno || isTerminalFisica;

    if (tipoConsumo === 'Local') {
      if (agil && !mesaQR) {
        if (mesasDisponibles.length > 0) {
          setPantallaActual('asignar_mesa');
        } else {
          seleccionarPago('Por Cobrar', null, 'Local');
        }
      }
      else if (agil && mesaQR) seleccionarPago('Por Cobrar', null, 'Local', mesaQR);
      else seleccionarPago('Pendiente', null, 'Local');
    } else if (['Para llevar', 'Recoger', 'Domicilio'].includes(tipoConsumo)) {
      if (isTerminalFisica && tipoConsumo === 'Para llevar') {
        // 👇 NUEVO: En cuanto da su nombre, se salta el pedir teléfono y lanza la orden directo a caja
        seleccionarPago('Por Cobrar', null, 'Para llevar');
      }
      else if (!clienteActivo) setPasoTelefono(true);
      else if (tipoConsumo === 'Domicilio') setPantallaActual('pago');
      else seleccionarPago('Pendiente', null, tipoConsumo);
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
      if (!clienteActivo) { setPantallaActual('pedir_nombre'); return; }
    }
    setPantallaActual('pago');
  };  
  
  const guardarPedidoEnBD = async (metodoSeleccionado, direccionFinalConAviso = direccionEntrega, tipoBypass = null, mesaBypass = null, nuevoClienteIdBypass = null) => {
    setErrorTransaccion('');
    setMetodoPagoFinal(metodoSeleccionado);
    
    const tipoReal = tipoBypass || tipoConsumo;
    const idClienteAGuardar = nuevoClienteIdBypass || (ordenExterna ? ordenExterna.cliente_id : (clienteActivo?.id || null));  
    
    let origenCalculado = 'Web';
    if (user?.rol === 'cajero') origenCalculado = 'Caja';
    else if (user?.usuario === 'kiosco' || user?.usuario === 'admin') origenCalculado = 'Kiosco';
    else if (modoKiosco === 'totem') origenCalculado = 'Totem';
    else if (modoKiosco === 'drive-thru') origenCalculado = 'Drive-Thru';
    else if (modoKiosco === 'mesa' || mesaQR) origenCalculado = 'QR Mesa';
    
    let notaDireccion = direccionFinalConAviso;
    const tel = clienteActivo ? clienteActivo.telefono : telefonoRecoger;  
    
    if (tipoReal === 'Recoger') notaDireccion = `A NOMBRE DE: ${nombreOrden || 'SIN NOMBRE'} | TEL: ${tel || ''}`;
    else if (tipoReal === 'Domicilio' && tel) notaDireccion = `${direccionFinalConAviso} | A NOMBRE DE: ${nombreOrden || 'SIN NOMBRE'} | TEL: ${tel}`;
    else if (tipoReal === 'Local' || tipoReal === 'Para llevar') {
      if (nombreOrden) notaDireccion = `A NOMBRE DE: ${nombreOrden}`;
      if (tipoReal === 'Para llevar' && tel) notaDireccion += ` | TEL: ${tel}`;
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
    
    let metodoRealBD = metodoSeleccionado;
    if (metodoSeleccionado === 'Efectivo' && (tipoReal === 'Domicilio' || tipoReal === 'Recoger')) {
        metodoRealBD = 'Por Cobrar';
    }

    const paquete = {
      cliente_id: idClienteAGuardar,
      tipo_consumo: tipoReal === 'Recoger' ? 'Recoger en Local' : tipoReal,
      metodo_pago: metodoRealBD, 
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
        if (idClienteAGuardar && tipoReal === 'Domicilio' && direccionFinalConAviso) {
          const dirLimpia = direccionFinalConAviso.split(' | TEL:')[0].split(' | (Llevar')[0].trim();
          fetch(`${apiUrl}/clientes/${idClienteAGuardar}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ direccion: dirLimpia })
          }).catch(() => {});
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
    const agil = esPersonalInterno || isTerminalFisica;
    if (tipoConsumo === 'Local' && agil && !mesaQR) {
      return mesasDisponibles.length > 0 ? 'asignar_mesa' : 'consumo';
    }
    if (tipoConsumo === 'Domicilio') return 'direccion';
    return 'consumo';
  };  
  
  const asignarMesaYEnviar = (mesaNombre) => {
    setMesaSeleccionadaInterna(mesaNombre);
    seleccionarPago('Por Cobrar', null, 'Local', mesaNombre);
  };  
  
  if (pantallaActual === 'consumo' && (mesaQR || modoKiosco === 'drive-thru')) return null;  
  
  if (pasoTelefono || pantallaActual === 'pedir_nombre') {
    return (
      <PantallaRegistro
        pantallaActual={pantallaActual}
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
        modoKiosco={modoKiosco} 
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
        bloqueoPuntosActivo={bloqueoPuntosActivo}
        modoKiosco={modoKiosco} 
      />
    );
  }  
  
  if (pantallaActual === 'finalizado') {
    return (
      <PantallaExito
        isOffline={isOffline} numeroPedidoReal={numeroPedidoReal}
        tipoConsumo={tipoConsumo} metodoPagoFinal={metodoPagoFinal}
        contador={contador} reiniciarKiosco={reiniciarKiosco}
        modoKiosco={modoKiosco} 
      />
    );
  }  
  
  return null;
};  

export default CheckoutFlujo;