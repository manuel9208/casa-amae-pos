import React, { useState, useEffect } from 'react';
import SidebarCaja from './caja/SidebarCaja';
import VistasCaja from './caja/VistasCaja';
import ModalesCaja from './caja/ModalesCaja';
import TicketImpresion from './caja/TicketImpresion';

const Caja = ({ user, onLogout, onGoToKiosco }) => {
  // === ESTADOS GLOBALES DE LA CAJA ===
  const [vistaActiva, setVistaActiva] = useState('cobrar'); 
  const [subVistaHistorial, setSubVistaHistorial] = useState('Pagado'); 
  const [pedidos, setPedidos] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [configGlobal, setConfigGlobal] = useState(null);
  const [insumosDB, setInsumosDB] = useState([]); 
  const [gastosDia, setGastosDia] = useState([]); 
  
  // 👇 NUEVO ESTADO: Control del menú lateral en móviles
  const [menuAbiertoCaja, setMenuAbiertoCaja] = useState(false);
  
  // === ESTADOS DE LOS MODALES DE COBRO Y VISUALIZACIÓN ===
  const [modalPago, setModalPago] = useState(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [modalResolver, setModalResolver] = useState(null);
  const [itemAfectadoIdx, setItemAfectadoIdx] = useState('');
  const [accionAlerta, setAccionAlerta] = useState('quitar');
  const [ingredienteReemplazo, setIngredienteReemplazo] = useState('');
  const [ticketImprimir, setTicketImprimir] = useState(null);
  const [modalZonaEnvio, setModalZonaEnvio] = useState(null);
  const [modalVerDetalle, setModalVerDetalle] = useState(null);

  // === ESTADOS PARA COMPRA RÁPIDA ===
  const [modalCompraRapida, setModalCompraRapida] = useState(false);
  const [insumoComprar, setInsumoComprar] = useState(null);
  const [paquetesComprados, setPaquetesComprados] = useState('');

  // === ESTADOS: Alertas Bonitas, Extras ===
  const [alertaCaja, setAlertaCaja] = useState(null);
  const [modalAgregarExtra, setModalAgregarExtra] = useState(null);
  const [alertaCobroExtra, setAlertaCobroExtra] = useState(null); 

  // ESTADOS: PARA IDENTIFICAR/REGISTRAR AL CLIENTE EN BARRA
  const [modalIdentificar, setModalIdentificar] = useState(false);
  const [pasoIdentificar, setPasoIdentificar] = useState('telefono'); 
  const [telClienteNuevo, setTelClienteNuevo] = useState('');
  const [datosNuevoCliente, setDatosNuevoCliente] = useState({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '' });

  // === SEGURO ANTI-DOBLE CLIC ===
  const [isSubmitting, setIsSubmitting] = useState(false);

  // === ESTADOS DEL FONDO DE CAJA ===
  const hoyStr = new Date().toLocaleDateString();
  const [fondoCaja, setFondoCaja] = useState(() => {
    const guardado = localStorage.getItem(`fondo_caja_${user?.id}_${hoyStr}`);
    return guardado !== null ? Number(guardado) : null;
  });
  const [inputFondo, setInputFondo] = useState('');

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  // === CARGA INICIAL Y POLLING ===
  useEffect(() => {
    fetch(`${apiUrl}/ingredientes`).then(r=>r.json()).then(data => setCatalogoIngredientes(Array.isArray(data) ? data : []));
    
    const cargarInsumos = async () => {
      try {
        const res = await fetch(`${apiUrl}/insumos`);
        const data = await res.json();
        setInsumosDB(Array.isArray(data) ? data : []);
      } catch (error) { console.error('Error cargando insumos'); }
    };
    cargarInsumos();

    const cargarGastosDia = async () => {
      try {
        const res = await fetch(`${apiUrl}/insumos/compras/hoy`);
        const data = await res.json();
        setGastosDia(Array.isArray(data) ? data : []);
      } catch (error) { console.error('Error cargando gastos del día'); }
    };
    cargarGastosDia();

    const cargarConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/configuracion?t=${new Date().getTime()}`);
        const data = await res.json();
        if(data && !data.error) setConfigGlobal(data);
      } catch (error) { console.error('Error al cargar config'); }
    };
    cargarConfig();

    const cargarPedidos = async () => {
      try { const res = await fetch(`${apiUrl}/pedidos/hoy?t=${new Date().getTime()}`); const data = await res.json(); setPedidos(Array.isArray(data) ? data : []); } catch (error) { console.error('Error al cargar pedidos'); }
    };
    cargarPedidos(); 
    
    const intervalo = setInterval(cargarPedidos, 3000); 
    return () => clearInterval(intervalo);
  }, [apiUrl]);

  const mostrarAlertaCaja = (titulo, mensaje, tipo = 'success') => {
    setAlertaCaja({ titulo, mensaje, tipo });
    setTimeout(() => setAlertaCaja(null), 4000);
  };

  // === FUNCIONES PRINCIPALES ===
  const toggleEstadoNegocio = async () => {
    if (isSubmitting) return; 
    setIsSubmitting(true);
    
    if (!configGlobal) { setIsSubmitting(false); return; }
    const nuevoEstado = !configGlobal.negocio_abierto;
    setConfigGlobal(prev => ({ ...prev, negocio_abierto: nuevoEstado }));

    const formData = new FormData();
    Object.keys(configGlobal).forEach(key => {
      if (key === 'negocio_abierto') {
        formData.append(key, nuevoEstado);
      } else if (key === 'tarifas_envio') {
        formData.append(key, typeof configGlobal[key] === 'string' ? configGlobal[key] : JSON.stringify(configGlobal[key] || []));
      } else if (configGlobal[key] !== null && configGlobal[key] !== undefined) {
        formData.append(key, configGlobal[key]);
      }
    });

    try {
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (!res.ok) throw new Error("Error en servidor");
    } catch (error) {
      setConfigGlobal(prev => ({ ...prev, negocio_abierto: !nuevoEstado }));
      mostrarAlertaCaja('Error', 'No se pudo cambiar el estado del negocio.', 'error');
    }
    setIsSubmitting(false);
  };

  const cerrarCajaYSalir = async () => {
    if (configGlobal && configGlobal.negocio_abierto) {
      try {
        const formData = new FormData();
        Object.keys(configGlobal).forEach(key => {
          if (key === 'negocio_abierto') formData.append(key, false);
          else if (key === 'tarifas_envio') formData.append(key, typeof configGlobal[key] === 'string' ? configGlobal[key] : JSON.stringify(configGlobal[key] || []));
          else if (configGlobal[key] !== null && configGlobal[key] !== undefined) formData.append(key, configGlobal[key]);
        });
        await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      } catch (error) { console.error('Error cerrando negocio', error); }
    }
    onLogout();
  };

  const iniciarTurno = (e) => {
    e.preventDefault();
    const monto = Number(inputFondo);
    localStorage.setItem(`fondo_caja_${user?.id}_${hoyStr}`, monto);
    setFondoCaja(monto);
  };

  const lanzarImpresion = (pedido) => {
    setTicketImprimir(pedido);
    setTimeout(() => {
        window.print();
        setTicketImprimir(null);
    }, 500);
  };

  // 👇 MODIFICACIÓN: Agregamos el parámetro "pagosMixtos" para soportar el pago dividido
  const procesarPago = async (estadoRechazo = null, esPostPago = false, pagosMixtos = null) => {
    if (isSubmitting) return; 
    setIsSubmitting(true);
    
    let estadoFinal;
    let metodoPagoFinal = pagosMixtos ? 'Mixto' : modalPago.metodo_pago;

    if (estadoRechazo) {
        estadoFinal = estadoRechazo;
    } else if (esPostPago) {
        estadoFinal = 'Preparando'; 
        metodoPagoFinal = 'Por Cobrar';
    } else {
        if (modalPago.estado_preparacion === 'Listo') estadoFinal = 'Entregado';
        else if (modalPago.estado_preparacion === 'Entregado') estadoFinal = 'Entregado';
        else if (modalPago.estado_preparacion === 'Preparando') estadoFinal = 'Preparando'; 
        else estadoFinal = 'Pagado'; 
    }

    try { 
      // Construimos el payload de forma dinámica
      const payload = { 
        estado_preparacion: estadoFinal,
        metodo_pago: metodoPagoFinal 
      };
      
      // Si recibimos pagos divididos, los adjuntamos
      if (pagosMixtos) {
          payload.pagos_mixtos = pagosMixtos;
      }

      const res = await fetch(`${apiUrl}/pedidos/${modalPago.id}/estado`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      }); 
      
      if (res.ok) { 
        if (!estadoRechazo && !esPostPago && configGlobal?.ticket_impresion_activa) {
            lanzarImpresion(modalPago);
        }

        if (esPostPago) {
            mostrarAlertaCaja('¡Enviado a Cocina!', `Orden #${modalPago.numero_pedido} se preparará y se cobrará al final.`, 'success');
        } else {
            mostrarAlertaCaja('¡Pago Procesado!', `Orden #${modalPago.numero_pedido} cobrada con éxito.`, 'success');
        }

        setModalPago(null); 
        setMontoRecibido(''); 
      } else {
        mostrarAlertaCaja('Error', 'No se pudo registrar en la base de datos.', 'error');
      }
    } catch (error) { 
      mostrarAlertaCaja('Error', 'Problema al procesar el pago.', 'error'); 
    }
    setIsSubmitting(false); 
  };

  const confirmarPedidoRecoger = async (id) => {
    if (isSubmitting) return; setIsSubmitting(true);
    try { await fetch(`${apiUrl}/pedidos/${id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: 'Pagado' }) }); } catch (error) {}
    setIsSubmitting(false);
  };

  const confirmarPedidoDomicilio = async (pedido, tarifa) => {
    if (isSubmitting) return; setIsSubmitting(true);
    try {
      const nuevoTotal = Number(pedido.total) + Number(tarifa.costo);
      await fetch(`${apiUrl}/pedidos/${pedido.id}/estado`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          estado_preparacion: 'Pagado', 
          total: nuevoTotal, 
          costo_envio: tarifa.costo 
        }) 
      }); 
      mostrarAlertaCaja('Zona Asignada', 'Se ha sumado el costo de envío a la orden.', 'success');
      setModalZonaEnvio(null);
    } catch (error) {
      mostrarAlertaCaja('Error', 'Fallo al asignar domicilio.', 'error');
    }
    setIsSubmitting(false);
  };

  const actualizarEstadoPedido = async (id, nuevoEstado) => {
    if (isSubmitting) return; setIsSubmitting(true);
    try { await fetch(`${apiUrl}/pedidos/${id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: nuevoEstado }) }); } catch (error) {}
    setIsSubmitting(false);
  };

  const limpiarAlerta = async (id) => {
    try { await fetch(`${apiUrl}/pedidos/${id}/alerta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: null }) }); } catch (error) {}
  };

  const abrirModalResolver = (p) => {
    setModalResolver(p); 
    const idxMatch = p.alerta_cocina.match(/\[IDX:(\d+)\]/);
    if (idxMatch) { setItemAfectadoIdx(idxMatch[1]); } else { setItemAfectadoIdx(''); }
    setIngredienteReemplazo('');
    const match = p.alerta_cocina.match(/Propuesta: (.*)/);
    if (match && match[1] && match[1] !== 'Ninguna' && match[1] !== 'Solo quitarlo') setAccionAlerta('aceptar'); else setAccionAlerta('quitar');
  };

  const enviarRespuestaCocina = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; setIsSubmitting(true);
    
    const itemSeleccionado = modalResolver.carrito[itemAfectadoIdx];
    const extrasStr = (itemSeleccionado.extras || []).map(ex => ex.nombre).join(', ');
    const nombreCompleto = `${itemSeleccionado.nombre}${extrasStr ? ` (${extrasStr})` : ''}`;

    let respuesta = `[IDX:${itemAfectadoIdx}] ✅ CAJA RESPONDE: En ${nombreCompleto}, `;
    if (accionAlerta === 'quitar') respuesta += `preparar SIN el ingrediente faltante.`;
    if (accionAlerta === 'cambiar') respuesta += `CAMBIAR el faltante por: ${ingredienteReemplazo}.`;
    
    const match = modalResolver.alerta_cocina.match(/Propuesta: (.*)/);
    const propuestaChef = match ? match[1] : null;
    if (accionAlerta === 'aceptar') respuesta += `ACEPTAR PROPUESTA (${propuestaChef}).`;

    try {
      await fetch(`${apiUrl}/pedidos/${modalResolver.id}/alerta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: respuesta }) });
      mostrarAlertaCaja('¡Respuesta Enviada!', 'El chef ya fue notificado.', 'success');
      setModalResolver(null); setItemAfectadoIdx(''); setAccionAlerta('quitar'); setIngredienteReemplazo('');
    } catch (error) { mostrarAlertaCaja('Error', 'No se pudo enviar la respuesta.', 'error'); }
    setIsSubmitting(false);
  };

  const registrarCompraRapida = async (e) => {
    e.preventDefault();
    if (!insumoComprar || !paquetesComprados || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${apiUrl}/insumos/${insumoComprar.id}/comprar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paquetes: Number(paquetesComprados), costo_unitario: Number(insumoComprar.costo_presentacion) })
      });

      if (res.ok) {
        const resInsumos = await fetch(`${apiUrl}/insumos`);
        const dataInsumos = await resInsumos.json();
        setInsumosDB(Array.isArray(dataInsumos) ? dataInsumos : []);

        const resGastos = await fetch(`${apiUrl}/insumos/compras/hoy`);
        const dataGastos = await resGastos.json();
        setGastosDia(Array.isArray(dataGastos) ? dataGastos : []);
        
        setInsumoComprar(null);
        setPaquetesComprados('');
        mostrarAlertaCaja('🛒 ¡Compra Exitosa!', 'El stock se actualizó y el gasto se descontó del corte.', 'success');
      } else {
        mostrarAlertaCaja('Error', 'Fallo al registrar la compra.', 'error');
      }
    } catch (error) {
      mostrarAlertaCaja('Error', 'Problema de conexión al guardar.', 'error');
    }
    setIsSubmitting(false);
  };

  const confirmarAgregarExtra = async (pedido, itemIndex, extraObj) => {
    if (isSubmitting) return; setIsSubmitting(true);
    try {
        const carritoActual = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : pedido.carrito;
        const nuevoCarrito = JSON.parse(JSON.stringify(carritoActual));
        
        const item = nuevoCarrito[itemIndex];
        
        if (!item.extras) item.extras = [];
        item.extras.push({
            id: extraObj.id,
            nombre: `+ ${extraObj.nombre}`,
            precioExtra: Number(extraObj.precio_extra)
        });
        
        item.precioFinal = Number(item.precioFinal || item.precio_base || item.precio || 0) + Number(extraObj.precio_extra);
        const nuevoTotal = Number(pedido.total) + Number(extraObj.precio_extra);

        const res = await fetch(`${apiUrl}/pedidos/${pedido.id}/estado`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                carrito: nuevoCarrito,
                total: nuevoTotal,
                estado_preparacion: pedido.estado_preparacion 
            }) 
        });

        if(res.ok) {
            setPedidos(prev => prev.map(p => 
               p.id === pedido.id ? { ...p, carrito: nuevoCarrito, total: nuevoTotal } : p
            ));
            
            if (Number(extraObj.precio_extra) > 0) {
               setAlertaCobroExtra({
                  monto: extraObj.precio_extra,
                  extra: extraObj.nombre,
                  platillo: item.nombre,
                  orden: pedido.numero_pedido
               });
            } else {
               mostrarAlertaCaja('✅ Extra Agregado', `Se añadió ${extraObj.nombre} gratis.`, 'success');
            }
            
            setModalAgregarExtra(null);
        } else {
            mostrarAlertaCaja('Error', 'No se pudo guardar el extra en la base de datos.', 'error');
        }
    } catch (error) {
        mostrarAlertaCaja('Error', 'Hubo un problema de red.', 'error');
    }
    setIsSubmitting(false);
  };

  const abrirIdentificador = () => {
    setModalIdentificar(true);
    setPasoIdentificar('telefono');
    setTelClienteNuevo('');
    setDatosNuevoCliente({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '' });
  };

  const buscarClienteParaPedido = async (e) => {
    e.preventDefault();
    if (telClienteNuevo.length !== 10) return mostrarAlertaCaja('Aviso', 'El número debe tener 10 dígitos', 'error');
    if (isSubmitting) return; setIsSubmitting(true);
    try {
        const res = await fetch(`${apiUrl}/identificar`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({telefono: telClienteNuevo}) });
        const data = await res.json();
        if (res.ok) {
            if (data.tipo === 'cliente' || data.cliente) {
                setModalIdentificar(false);
                onGoToKiosco(data.data || data.cliente);
                mostrarAlertaCaja('¡Cliente Encontrado!', `Bienvenido de nuevo, ${(data.data || data.cliente).nombre}.`, 'success');
            } else {
                setPasoIdentificar('registro');
            }
        } else {
            mostrarAlertaCaja('Error', data.error || 'Error al buscar', 'error');
        }
    } catch(err) {
        mostrarAlertaCaja('Error', 'Error de conexión', 'error');
    }
    setIsSubmitting(false);
  };

  const registrarClienteParaPedido = async (e) => {
    e.preventDefault();
    if(!datosNuevoCliente.nombre.trim() || !datosNuevoCliente.apellido.trim() || datosNuevoCliente.nip.length !== 4) {
        return mostrarAlertaCaja('Aviso', 'Nombre, Apellido y NIP (4) son obligatorios.', 'error');
    }
    if (isSubmitting) return; setIsSubmitting(true);
    try {
        const res = await fetch(`${apiUrl}/clientes/registro`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({telefono: telClienteNuevo, ...datosNuevoCliente}) });
        const data = await res.json();
        if (res.ok) {
            setModalIdentificar(false);
            onGoToKiosco(data.cliente || data);
            mostrarAlertaCaja('¡Registro Exitoso!', 'Cliente agregado al programa de lealtad.', 'success');
        } else {
            mostrarAlertaCaja('Error', data.error || 'Error al registrar', 'error');
        }
    } catch(err) {
        mostrarAlertaCaja('Error', 'Error de conexión', 'error');
    }
    setIsSubmitting(false);
  };

  const pedidosPorConfirmar = pedidos.filter(p => p.estado_preparacion === 'Pendiente' && (p.tipo_consumo === 'Recoger en Local' || p.tipo_consumo === 'Domicilio'));
  const pendientesDePago = pedidos.filter(p => 
      (p.estado_preparacion === 'Pendiente' && p.tipo_consumo !== 'Recoger en Local' && p.tipo_consumo !== 'Domicilio') ||
      p.metodo_pago === 'Por Cobrar'
  );
  const listosParaEntregar = pedidos.filter(p => p.estado_preparacion === 'Listo');
  const pedidosConAlerta = pedidos.filter(p => p.alerta_cocina && p.estado_preparacion !== 'Entregado' && p.estado_preparacion !== 'Cancelado');

  return (
    <>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-800 relative print:hidden">
        
        <SidebarCaja 
          user={user} 
          onLogout={cerrarCajaYSalir} 
          configGlobal={configGlobal} toggleEstadoNegocio={toggleEstadoNegocio}
          vistaActiva={vistaActiva} setVistaActiva={setVistaActiva}
          pedidosPorConfirmar={pedidosPorConfirmar}
          pendientesDePago={pendientesDePago}
          listosParaEntregar={listosParaEntregar}
          setModalCompraRapida={setModalCompraRapida} 
          abrirIdentificador={abrirIdentificador} 
          menuAbiertoCaja={menuAbiertoCaja} // 👇 Pasamos el control del menú responsivo
          setMenuAbiertoCaja={setMenuAbiertoCaja}
        />

        <VistasCaja 
          vistaActiva={vistaActiva}
          subVistaHistorial={subVistaHistorial} setSubVistaHistorial={setSubVistaHistorial}
          pedidos={pedidos}
          pedidosConAlerta={pedidosConAlerta}
          pedidosPorConfirmar={pedidosPorConfirmar}
          pendientesDePago={pendientesDePago}
          listosParaEntregar={listosParaEntregar}
          fondoCaja={fondoCaja}
          configGlobal={configGlobal}
          gastosDia={gastosDia} 
          
          abrirModalResolver={abrirModalResolver}
          limpiarAlerta={limpiarAlerta}
          setModalPago={setModalPago}
          setMontoRecibido={setMontoRecibido}
          actualizarEstadoPedido={actualizarEstadoPedido}
          confirmarPedidoRecoger={confirmarPedidoRecoger}
          lanzarImpresion={lanzarImpresion}
          setModalZonaEnvio={setModalZonaEnvio}
          setModalAgregarExtra={setModalAgregarExtra} 
          isSubmitting={isSubmitting} 
          setModalVerDetalle={setModalVerDetalle} 
          setMenuAbiertoCaja={setMenuAbiertoCaja} // 👇 Lo pasamos para el botón del Header móvil
        />
        
        <ModalesCaja 
          fondoCaja={fondoCaja} iniciarTurno={iniciarTurno} inputFondo={inputFondo} setInputFondo={setInputFondo}
          modalResolver={modalResolver} setModalResolver={setModalResolver}
          itemAfectadoIdx={itemAfectadoIdx} setItemAfectadoIdx={setItemAfectadoIdx}
          accionAlerta={accionAlerta} setAccionAlerta={setAccionAlerta}
          ingredienteReemplazo={ingredienteReemplazo} setIngredienteReemplazo={setIngredienteReemplazo}
          enviarRespuestaCocina={enviarRespuestaCocina}
          catalogoIngredientes={catalogoIngredientes}
          modalPago={modalPago} setModalPago={setModalPago}
          montoRecibido={montoRecibido} setMontoRecibido={setMontoRecibido}
          procesarPago={procesarPago} 
          
          configGlobal={configGlobal}
          modalZonaEnvio={modalZonaEnvio}
          setModalZonaEnvio={setModalZonaEnvio}
          confirmarPedidoDomicilio={confirmarPedidoDomicilio}

          modalCompraRapida={modalCompraRapida}
          setModalCompraRapida={setModalCompraRapida}
          insumosDB={insumosDB}
          insumoComprar={insumoComprar}
          setInsumoComprar={setInsumoComprar}
          paquetesComprados={paquetesComprados}
          setPaquetesComprados={setPaquetesComprados}
          registrarCompraRapida={registrarCompraRapida}

          alertaCaja={alertaCaja}
          setAlertaCaja={setAlertaCaja}
          modalAgregarExtra={modalAgregarExtra}
          setModalAgregarExtra={setModalAgregarExtra}
          confirmarAgregarExtra={confirmarAgregarExtra}
          
          alertaCobroExtra={alertaCobroExtra}
          setAlertaCobroExtra={setAlertaCobroExtra}
          isSubmitting={isSubmitting} 
          modalVerDetalle={modalVerDetalle} 
          setModalVerDetalle={setModalVerDetalle} 

          modalIdentificar={modalIdentificar}
          setModalIdentificar={setModalIdentificar}
          pasoIdentificar={pasoIdentificar}
          setPasoIdentificar={setPasoIdentificar}
          telClienteNuevo={telClienteNuevo}
          setTelClienteNuevo={setTelClienteNuevo}
          datosNuevoCliente={datosNuevoCliente}
          setDatosNuevoCliente={setDatosNuevoCliente}
          buscarClienteParaPedido={buscarClienteParaPedido}
          registrarClienteParaPedido={registrarClienteParaPedido}
          onGoToKiosco={onGoToKiosco}
        />
      </div>

      <TicketImpresion 
        ticketImprimir={ticketImprimir} 
        configGlobal={configGlobal} 
        apiUrl={apiUrl} 
      />
    </>
  );
};

export default Caja;