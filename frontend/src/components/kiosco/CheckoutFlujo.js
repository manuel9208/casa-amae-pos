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
  
  const [idCreadoLocal, setIdCreadoLocal] = useState(null);
  // 👇 FIX RAÍZ: Almacena temporalmente los datos del pago por Transferencia mientras
  // el cliente ve la pantalla de instrucciones bancarias, SIN haber tocado la BD todavía.
  const [datosPagoDiferido, setDatosPagoDiferido] = useState(null);
  const idRealEdicion = idCreadoLocal || pedidoEditandoId;
  
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
      else seleccionarPago('Por Cobrar', null, tipo); 
    } else if (tipo === 'Local') {
      if (isTerminalFisica && !clienteActivo) {
        setPantallaActual('pedir_nombre');
      } else if (agil) {
        if (mesaQR) {
          seleccionarPago('Por Cobrar', null, 'Local', mesaQR);
        } else if (mesasDisponibles.length > 0) {
          setPantallaActual('asignar_mesa');
        } else {
          seleccionarPago('Por Cobrar', null, 'Local');
        }
      } else {
        if (!clienteActivo) setPantallaActual('pedir_nombre');
        else seleccionarPago('Por Cobrar', null, 'Local'); 
      }
    } else if (tipo === 'Para llevar') {
      if (isTerminalFisica && !clienteActivo) {
        setPantallaActual('pedir_nombre');
      } else if (agil) {
        seleccionarPago('Por Cobrar', null, 'Para llevar');
      } else {
        if (!clienteActivo) setPantallaActual('pedir_nombre');
        else seleccionarPago('Por Cobrar', null, 'Para llevar'); 
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
      else if (!clienteActivo && !pasoTelefono) setPasoTelefono(true);
      else seleccionarPago('Por Cobrar', null, 'Local');
    } else if (['Para llevar', 'Recoger', 'Domicilio'].includes(tipoConsumo)) {
      if (isTerminalFisica && tipoConsumo === 'Para llevar') {
        seleccionarPago('Por Cobrar', null, 'Para llevar');
      }
      else if (!clienteActivo && !pasoTelefono) {
        setPasoTelefono(true);
      }
      else {
        if (tipoConsumo === 'Domicilio') setPantallaActual('pago'); 
        else seleccionarPago('Por Cobrar', null, tipoConsumo); 
      }
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
    
    let notaDireccion = direccionFinalConAviso || '';
    const tel = clienteActivo ? clienteActivo.telefono : telefonoRecoger;  
    
    if (tipoReal === 'Recoger') notaDireccion = `A NOMBRE DE: ${nombreOrden || 'SIN NOMBRE'} | TEL: ${tel || ''}`;
    else if (tipoReal === 'Domicilio' && tel) notaDireccion = `${direccionFinalConAviso} | A NOMBRE DE: ${nombreOrden || 'SIN NOMBRE'} | TEL: ${tel}`;
    else if (tipoReal === 'Local' || tipoReal === 'Para llevar') {
      if (nombreOrden) notaDireccion = `A NOMBRE DE: ${nombreOrden}`;
      if (tipoReal === 'Para llevar' && tel) notaDireccion += ` | TEL: ${tel}`;
    } else if (tel) {
      notaDireccion = notaDireccion ? `${notaDireccion} | TEL: ${tel}` : `TEL: ${tel}`;
    }

    const carritoExpandido = [];
    carrito.forEach(item => {
      const qty = item.cantidad || 1;
      for(let i = 0; i < qty; i++) {
        carritoExpandido.push({...item, cantidad: 1, idTicket: item.idTicket + '_' + i});
      }
    });  
    
    // 👇 FIX RAÍZ: Ya no existe el estado 'Borrador'. Como ahora guardarPedidoEnBD para
    // Transferencia solo se ejecuta hasta la confirmación final, el pedido nace directamente
    // con su estado operativo real, igual que cualquier otro método de pago.
    let estadoInicial = ordenExterna ? ordenExterna.estado_preparacion : 'Pendiente';

    const mesaFinal = mesaQR || mesaBypass || mesaSeleccionadaInterna || (ordenExterna ? ordenExterna.mesa : null);  
    
    let metodoRealBD = metodoSeleccionado;
    if (metodoSeleccionado === 'Efectivo' && (tipoReal === 'Domicilio' || tipoReal === 'Recoger')) {
        metodoRealBD = 'Por Cobrar';
    }

            // 👇 FIX MÁSTER: Prevenir auto-pagos desde Kiosco/Web/QR
        // Si la orden NO la está levantando la Caja Central, forzamos el método a "Pendiente"
        if (origenCalculado !== 'Caja') {
            if (metodoSeleccionado === 'Transferencia') {
                metodoRealBD = 'Pendiente'; // Obliga a la Caja a validarlo en Cuentas por Cobrar
                notaDireccion = `[PAGARÁ CON: TRANSFERENCIA] ${notaDireccion}`; // Aviso visual para el Cajero
            } else if (metodoSeleccionado === 'Efectivo' && tipoReal === 'Local') {
                metodoRealBD = 'Pendiente';
                notaDireccion = `[PAGARÁ CON: EFECTIVO] ${notaDireccion}`;
            }
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
      const url = idRealEdicion ? `${apiUrl}/pedidos/${idRealEdicion}` : `${apiUrl}/pedidos`;
      const res = await fetch(url, {
        method: idRealEdicion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paquete)
      });  
      
      if (res.ok) {
        const data = await res.json();
        
        const extractedId = data.pedido?.id || data.data?.id || data.id;
        if (extractedId) setIdCreadoLocal(extractedId);

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

    // 👇 FIX RAÍZ ANTI-FANTASMA: Para Transferencia SIN pedido existente, NO tocamos la BD todavía.
    // Solo guardamos los datos en memoria y avanzamos a la pantalla de instrucciones bancarias.
    // El pedido real se crea únicamente cuando el cliente confirme "Ya envié mi comprobante"
    // (ver función procesarTransferencia), garantizando que nunca exista un registro huérfano.
    if (metodo === 'Transferencia' && !idRealEdicion) {
        setMetodoPagoFinal('Transferencia');
        setDireccionEntrega(dirModificada);
        setDatosPagoDiferido({ metodo, dirModificada, tipoReal, mesaBypass, nuevoClienteIdBypass });
        setPasoTelefono(false);
        setPantallaActual('detalles_transferencia');
        setIsSubmitting(false);
        return true;
    }

    const ok = await guardarPedidoEnBD(metodo, dirModificada, tipoReal, mesaBypass, nuevoClienteIdBypass);

    if (ok) {
        setPasoTelefono(false);
        setContador(15);
        setPantallaActual('finalizado');
    }
    setIsSubmitting(false);
    return ok;
};

  const seleccionarPagoRegistro = (metodo, montoEfectivo = null, tipoBypass = null, mesaBypass = null, nuevoClienteIdBypass = null) => {
    const agil = esPersonalInterno || isTerminalFisica;
    if (!agil && metodo === 'Pendiente') {
        if (tipoConsumo === 'Domicilio') {
            setPasoTelefono(false); 
            setPantallaActual('pago');
            return Promise.resolve(true); 
        } else {
            return seleccionarPago('Por Cobrar', null, tipoBypass || tipoConsumo, mesaBypass, nuevoClienteIdBypass);
        }
    } else {
        return seleccionarPago(metodo, montoEfectivo, tipoBypass, mesaBypass, nuevoClienteIdBypass);
    }
  };
  
  const procesarTransferencia = async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setErrorTransaccion('');

      // 👇 FIX RAÍZ: Si YA existía el pedido (edición de una orden previa), mantenemos
      // el comportamiento original: solo actualizamos su estado/método de pago.
      if (idRealEdicion) {
          if (isOffline) {
              try {
                  let pedidosOffline = JSON.parse(localStorage.getItem('pedidos_offline') || '[]');
                  const idx = pedidosOffline.findIndex(p => p.numero_pedido_offline === numeroPedidoReal);
                  if (idx !== -1) {
                      pedidosOffline[idx].estado_preparacion = ordenExterna ? ordenExterna.estado_preparacion : 'Pendiente';
                      pedidosOffline[idx].metodo_pago = 'Pendiente';
                      localStorage.setItem('pedidos_offline', JSON.stringify(pedidosOffline));
                  }
                  setContador(15);
                  setPantallaActual('finalizado');
              } catch (e) {
                  setErrorTransaccion('Error local al procesar transferencia.');
              }
              setIsSubmitting(false);
              return;
          }

          try {
              await fetch(`${apiUrl}/pedidos/${idRealEdicion}/estado`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      estado_preparacion: ordenExterna ? ordenExterna.estado_preparacion : 'Pendiente',
                      metodo_pago: 'Pendiente'
                  })
              });
              setContador(15);
              setPantallaActual('finalizado');
          } catch (error) {
              setErrorTransaccion('Error al confirmar la transferencia.');
          }
          setIsSubmitting(false);
          return;
      }

      // 👇 FIX RAÍZ: Este es el ÚNICO punto donde se crea en la BD un pedido nuevo de
      // Transferencia. Si la conexión falla aquí, NO se genera ningún registro huérfano —
      // el cliente simplemente ve el error y puede reintentar sin haber "ensuciado" la BD.
      if (!datosPagoDiferido) {
          setErrorTransaccion('No se encontraron los datos de tu pedido. Vuelve a intentarlo.');
          setIsSubmitting(false);
          return;
      }

      const { metodo, dirModificada, tipoReal, mesaBypass, nuevoClienteIdBypass } = datosPagoDiferido;
      const ok = await guardarPedidoEnBD(metodo, dirModificada, tipoReal, mesaBypass, nuevoClienteIdBypass);

      if (ok) {
          setDatosPagoDiferido(null);
          setContador(15);
          setPantallaActual('finalizado');
      } else {
          // 👇 El cliente se queda en la misma pantalla de datos bancarios, ve el error,
          // y puede presionar "Ya envié mi comprobante" de nuevo sin ningún pedido fantasma previo.
          setErrorTransaccion('No se pudo registrar tu pedido. Verifica tu conexión e inténtalo de nuevo.');
      }
      setIsSubmitting(false);
  };  
  
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
        setPantallaActual={setPantallaActual} 
        seleccionarPago={seleccionarPagoRegistro} 
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