import { useState, useEffect, useCallback } from 'react';

export const useCajaCentral = (user, onLogout, onGoToKiosco) => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const hoyStr = new Date().toLocaleDateString();

  // === ESTADOS GLOBALES ===
  const [vistaActiva, setVistaActiva] = useState('confirmar'); 
  const [subVistaHistorial, setSubVistaHistorial] = useState('Pagado'); 
  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]); 
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [configGlobal, setConfigGlobal] = useState(null);
  const [insumosDB, setInsumosDB] = useState([]); 
  const [gastosDia, setGastosDia] = useState([]); 
  const [menuAbiertoCaja, setMenuAbiertoCaja] = useState(false);
  
  // === ESTADOS DE MODALES ===
  const [modalPago, setModalPago] = useState(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [modalResolver, setModalResolver] = useState(null);
  const [itemAfectadoIdx, setItemAfectadoIdx] = useState('');
  const [accionAlerta, setAccionAlerta] = useState('quitar');
  const [ingredienteReemplazo, setIngredienteReemplazo] = useState('');
  const [ticketImprimir, setTicketImprimir] = useState(null);
  const [modalZonaEnvio, setModalZonaEnvio] = useState(null);
  const [modalVerDetalle, setModalVerDetalle] = useState(null);
  const [modalEditarPedido, setModalEditarPedido] = useState(null);

  // === COMPRA RÁPIDA Y EXTRAS ===
  const [modalCompraRapida, setModalCompraRapida] = useState(false);
  const [insumoComprar, setInsumoComprar] = useState(null);
  const [paquetesComprados, setPaquetesComprados] = useState('');
  const [alertaCaja, setAlertaCaja] = useState(null);
  const [modalAgregarExtra, setModalAgregarExtra] = useState(null);
  const [alertaCobroExtra, setAlertaCobroExtra] = useState(null); 

  // === IDENTIFICAR CLIENTE ===
  const [modalIdentificar, setModalIdentificar] = useState(false);
  const [pasoIdentificar, setPasoIdentificar] = useState('telefono'); 
  const [telClienteNuevo, setTelClienteNuevo] = useState('');
  const [datosNuevoCliente, setDatosNuevoCliente] = useState({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '' });

  // === SEGUROS Y FONDO ===
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fondoCaja, setFondoCaja] = useState(() => {
    const guardado = localStorage.getItem(`fondo_caja_${user?.id}_${hoyStr}`);
    return guardado !== null ? Number(guardado) : null;
  });
  const [inputFondo, setInputFondo] = useState('');

  // === CARGA INICIAL Y POLLING ===
  const cargarDataDinamica = useCallback(async () => {
    try { 
      const resPed = await fetch(`${apiUrl}/pedidos/hoy?t=${new Date().getTime()}`); 
      const dataPed = await resPed.json(); 
      setPedidos(Array.isArray(dataPed) ? dataPed : []); 
      
      const resMesas = await fetch(`${apiUrl}/mesas?t=${new Date().getTime()}`);
      const dataMesas = await resMesas.json();
      setMesas(Array.isArray(dataMesas) ? dataMesas : []);
    } catch (error) { console.error('Error al cargar data dinámica'); }
  }, [apiUrl]);

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

    cargarDataDinamica(); 
    const intervalo = setInterval(cargarDataDinamica, 3000); 
    return () => clearInterval(intervalo);
  }, [apiUrl, cargarDataDinamica]);

  const mostrarAlertaCaja = (titulo, mensaje, tipo = 'success') => {
    setAlertaCaja({ titulo, mensaje, tipo });
    setTimeout(() => setAlertaCaja(null), 4000);
  };

  // === FUNCIONES PRINCIPALES ===
  const toggleEstadoNegocio = async () => {
    if (isSubmitting) return; setIsSubmitting(true);
    if (!configGlobal) { setIsSubmitting(false); return; }
    const nuevoEstado = !configGlobal.negocio_abierto;
    setConfigGlobal(prev => ({ ...prev, negocio_abierto: nuevoEstado }));

    const formData = new FormData();
    Object.keys(configGlobal).forEach(key => {
      if (key === 'negocio_abierto') formData.append(key, nuevoEstado);
      else if (key === 'tarifas_envio') formData.append(key, typeof configGlobal[key] === 'string' ? configGlobal[key] : JSON.stringify(configGlobal[key] || []));
      else if (configGlobal[key] !== null && configGlobal[key] !== undefined) formData.append(key, configGlobal[key]);
    });

    try {
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (!res.ok) throw new Error("Error servidor");
    } catch (error) {
      setConfigGlobal(prev => ({ ...prev, negocio_abierto: !nuevoEstado }));
      mostrarAlertaCaja('Error', 'No se pudo cambiar el estado.', 'error');
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
      } catch (error) { console.error(error); }
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
    setTimeout(() => { window.print(); setTicketImprimir(null); }, 500);
  };

  const procesarPago = async (estadoRechazo = null, esPostPago = false, pagosMixtos = null) => {
    if (isSubmitting) return; setIsSubmitting(true);
    let estadoFinal;
    let metodoPagoFinal = pagosMixtos ? 'Mixto' : modalPago.metodo_pago;

    if (estadoRechazo) estadoFinal = estadoRechazo;
    else if (esPostPago) { estadoFinal = 'Pagado'; metodoPagoFinal = 'Por Cobrar'; } 
    else {
        if (['Entregado', 'Listo', 'En Camino'].includes(modalPago.estado_preparacion)) estadoFinal = 'Entregado'; 
        else if (['Pendiente', 'Por Confirmar'].includes(modalPago.estado_preparacion)) estadoFinal = 'Pagado'; 
        else estadoFinal = modalPago.estado_preparacion; 
    }

    try { 
      const payload = { estado_preparacion: estadoFinal, metodo_pago: metodoPagoFinal };
      if (pagosMixtos) payload.pagos_mixtos = pagosMixtos;

      if (estadoFinal === 'Entregado' || estadoFinal === 'Finalizado') {
         const carritoActual = typeof modalPago.carrito === 'string' ? JSON.parse(modalPago.carrito) : (modalPago.carrito || []);
         payload.carrito = carritoActual.map(item => ({ ...item, estado: 'Finalizado' }));
         payload.mesa = null;
      }

      const res = await fetch(`${apiUrl}/pedidos/${modalPago.id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); 
      if (res.ok) { 
        if (!estadoRechazo && !esPostPago && configGlobal?.ticket_impresion_activa) lanzarImpresion(modalPago);
        if (esPostPago) mostrarAlertaCaja('¡Enviado a Cola!', `Orden #${modalPago.numero_pedido} está en cola y se cobrará al final.`, 'success');
        else if (estadoRechazo === 'Cancelado') mostrarAlertaCaja('Pedido Anulado', `Orden #${modalPago.numero_pedido} ha sido cancelada.`, 'success');
        else mostrarAlertaCaja('¡Pago Procesado!', `Orden #${modalPago.numero_pedido} cobrada con éxito.`, 'success');
        setModalPago(null); setMontoRecibido(''); await cargarDataDinamica();
      } else { mostrarAlertaCaja('Error', 'No se pudo registrar en BD.', 'error'); }
    } catch (error) { mostrarAlertaCaja('Error', 'Problema al procesar.', 'error'); }
    setIsSubmitting(false); 
  };

  const confirmarPedidoRecoger = async (id) => {
    if (isSubmitting) return; setIsSubmitting(true);
    try { await fetch(`${apiUrl}/pedidos/${id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: 'Pagado' }) }); await cargarDataDinamica(); } catch (error) {}
    setIsSubmitting(false);
  };

  const confirmarPedidoDomicilio = async (pedido, tarifa) => {
    if (isSubmitting) return; setIsSubmitting(true);
    try {
      const nuevoTotal = Number(pedido.total) + Number(tarifa.costo);
      await fetch(`${apiUrl}/pedidos/${pedido.id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: 'Pagado', total: nuevoTotal, costo_envio: tarifa.costo }) }); 
      mostrarAlertaCaja('Zona Asignada', 'Se sumó costo de envío.', 'success'); setModalZonaEnvio(null); await cargarDataDinamica();
    } catch (error) { mostrarAlertaCaja('Error', 'Fallo asignar domicilio.', 'error'); }
    setIsSubmitting(false);
  };

  const actualizarEstadoPedido = async (id, nuevoEstado) => {
    if (isSubmitting) return; setIsSubmitting(true);
    const pedidoActual = pedidos.find(p => p.id === id);
    let payload = { estado_preparacion: nuevoEstado };
    
    if (pedidoActual) {
       const carritoArray = typeof pedidoActual.carrito === 'string' ? JSON.parse(pedidoActual.carrito) : (pedidoActual.carrito || []);
       payload.carrito = carritoArray.map(item => ({ ...item, estado: (nuevoEstado === 'Finalizado' || nuevoEstado === 'Cancelado') ? 'Finalizado' : item.estado }));
       if (nuevoEstado === 'Finalizado') payload.mesa = null; 
    }

    try { 
       await fetch(`${apiUrl}/pedidos/${id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); 
       if (pedidoActual && pedidoActual.mesa && nuevoEstado === 'Finalizado') {
          const paqueteFantasma = { cliente_id: null, tipo_consumo: 'Local', metodo_pago: 'Efectivo', total: 0, carrito: [], origen: 'Caja', direccion_entrega: 'Limpieza', descuento_puntos: 0, estado_preparacion: 'Pendiente', mesa: pedidoActual.mesa };
          const resFantasma = await fetch(`${apiUrl}/pedidos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paqueteFantasma) });
          if (resFantasma.ok) {
              const data = await resFantasma.json();
              await fetch(`${apiUrl}/pedidos/${data.id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: 'Cancelado' }) });
          }
       }
       await cargarDataDinamica();
    } catch (error) { console.error("Error al sincronizar TV", error); }
    setIsSubmitting(false);
  };

  // 👇 CORREGIDO: Empaquetamos la orden completa y enviamos al endpoint principal de edición
  const guardarEdicionPedido = async (id, nuevosDatos) => {
    if (isSubmitting) return; setIsSubmitting(true);
    try {
      const pedidoRef = pedidos.find(p => p.id === id);
      
      let paqueteCompleto = { ...nuevosDatos };

      if (pedidoRef) {
         const carritoArray = typeof pedidoRef.carrito === 'string' ? JSON.parse(pedidoRef.carrito) : (pedidoRef.carrito || []);
         
         paqueteCompleto = {
             cliente_id: pedidoRef.cliente_id,
             tipo_consumo: nuevosDatos.tipo_consumo || pedidoRef.tipo_consumo,
             metodo_pago: pedidoRef.metodo_pago,
             origen: pedidoRef.origen,
             direccion_entrega: nuevosDatos.direccion_entrega !== undefined ? nuevosDatos.direccion_entrega : pedidoRef.direccion_entrega,
             estado_preparacion: nuevosDatos.estado_preparacion || pedidoRef.estado_preparacion,
             mesa: pedidoRef.mesa,
             carrito: carritoArray,
             total: nuevosDatos.total !== undefined ? nuevosDatos.total : pedidoRef.total,
             descuento_puntos: pedidoRef.descuento_puntos,
             cupon_codigo: pedidoRef.cupon_codigo,
             costo_envio: nuevosDatos.costo_envio !== undefined ? nuevosDatos.costo_envio : pedidoRef.costo_envio
         };
      }

      // Cambiamos el endpoint de /estado a la raíz de la orden para que acepte el tipo de consumo
      const res = await fetch(`${apiUrl}/pedidos/${id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(paqueteCompleto) 
      });

      if (res.ok) { 
         mostrarAlertaCaja('Actualizado', 'La información se modificó correctamente.', 'success'); 
         setModalEditarPedido(null); 
         await cargarDataDinamica(); 
      } else { 
         mostrarAlertaCaja('Error', 'Fallo al actualizar en la base de datos.', 'error'); 
      }
    } catch (error) { 
      mostrarAlertaCaja('Error', 'Problema conexión al servidor.', 'error'); 
    }
    setIsSubmitting(false);
  };

  const limpiarAlerta = async (id) => { try { await fetch(`${apiUrl}/pedidos/${id}/alerta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: null }) }); await cargarDataDinamica(); } catch (error) {} };

  const abrirModalResolver = (p) => {
    setModalResolver(p); 
    const idxMatch = p.alerta_cocina.match(/\[IDX:(\d+)\]/);
    if (idxMatch) setItemAfectadoIdx(idxMatch[1]); else setItemAfectadoIdx('');
    setIngredienteReemplazo('');
    const match = p.alerta_cocina.match(/Propuesta: (.*)/);
    if (match && match[1] && match[1] !== 'Ninguna' && match[1] !== 'Solo quitarlo') setAccionAlerta('aceptar'); else setAccionAlerta('quitar');
  };

  const enviarRespuestaCocina = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; setIsSubmitting(true);
    const itemSeleccionado = modalResolver.carrito[itemAfectadoIdx];
    const extrasStr = (itemSeleccionado.extras || []).map(ex => ex.nombre).join(', ');
    const fontCompleto = `${itemSeleccionado.nombre}${extrasStr ? ` (${extrasStr})` : ''}`;

    let respuesta = `[IDX:${itemAfectadoIdx}] ✅ CAJA RESPONDE: En ${fontCompleto}, `;
    if (accionAlerta === 'quitar') respuesta += `preparar SIN el ingrediente faltante.`;
    if (accionAlerta === 'cambiar') respuesta += `CAMBIAR el faltante por: ${ingredienteReemplazo}.`;
    
    const match = modalResolver.alerta_cocina.match(/Propuesta: (.*)/);
    if (accionAlerta === 'aceptar') respuesta += `ACEPTAR PROPUESTA (${match ? match[1] : null}).`;

    try {
      await fetch(`${apiUrl}/pedidos/${modalResolver.id}/alerta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: respuesta }) });
      mostrarAlertaCaja('¡Respuesta Enviada!', 'Chef notificado.', 'success');
      setModalResolver(null); setItemAfectadoIdx(''); setAccionAlerta('quitar'); setIngredienteReemplazo(''); await cargarDataDinamica();
    } catch (error) { mostrarAlertaCaja('Error', 'Fallo envío.', 'error'); }
    setIsSubmitting(false);
  };

  const registrarCompraRapida = async (e) => {
    e.preventDefault();
    if (!insumoComprar || !paquetesComprados || isSubmitting) return; setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/insumos/${insumoComprar.id}/comprar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paquetes: Number(paquetesComprados), costo_unitario: Number(insumoComprar.costo_presentacion) }) });
      if (res.ok) {
        const [resInsumos, resGastos] = await Promise.all([fetch(`${apiUrl}/insumos`), fetch(`${apiUrl}/insumos/compras/hoy`)]);
        const [dataInsumos, dataGastos] = await Promise.all([resInsumos.json(), resGastos.json()]);
        setInsumosDB(Array.isArray(dataInsumos) ? dataInsumos : []); setGastosDia(Array.isArray(dataGastos) ? dataGastos : []);
        setInsumoComprar(null); setPaquetesComprados(''); mostrarAlertaCaja('🛒 ¡Compra Exitosa!', 'Stock actualizado.', 'success'); await cargarDataDinamica();
      } else { mostrarAlertaCaja('Error', 'Fallo al registrar la compra.', 'error'); }
    } catch (error) { mostrarAlertaCaja('Error', 'Problema conexión.', 'error'); }
    setIsSubmitting(false);
  };

  const confirmarAgregarExtra = async (pedido, itemIndex, extraObj) => {
    if (isSubmitting) return; setIsSubmitting(true);
    try {
        const nuevoCarrito = JSON.parse(JSON.stringify(typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : pedido.carrito));
        const item = nuevoCarrito[itemIndex];
        if (!item.extras) item.extras = [];
        item.extras.push({ id: extraObj.id, nombre: `+ ${extraObj.nombre}`, precioExtra: Number(extraObj.precio_extra) });
        item.precioFinal = Number(item.precioFinal || item.precio_base || item.precio || 0) + Number(extraObj.precio_extra);
        const nuevoTotal = Number(pedido.total) + Number(extraObj.precio_extra);

        const res = await fetch(`${apiUrl}/pedidos/${pedido.id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ carrito: nuevoCarrito, total: nuevoTotal, estado_preparacion: pedido.estado_preparacion }) });
        if(res.ok) {
            setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, carrito: nuevoCarrito, total: nuevoTotal } : p));
            if (Number(extraObj.precio_extra) > 0) setAlertaCobroExtra({ monto: extraObj.precio_extra, extra: extraObj.nombre, platillo: item.nombre, orden: pedido.numero_pedido });
            else mostrarAlertaCaja('✅ Extra', `Añadido gratis.`, 'success');
            setModalAgregarExtra(null); await cargarDataDinamica();
        } else { mostrarAlertaCaja('Error', 'Fallo guardar extra.', 'error'); }
    } catch (error) { mostrarAlertaCaja('Error', 'Problema red.', 'error'); }
    setIsSubmitting(false);
  };

  const abrirIdentificador = () => {
    setModalIdentificar(true); setPasoIdentificar('telefono'); setTelClienteNuevo('');
    setDatosNuevoCliente({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '' });
  };

  const buscarClienteParaPedido = async (e) => {
    e.preventDefault();
    if (telClienteNuevo.length !== 10) return mostrarAlertaCaja('Aviso', '10 dígitos requeridos', 'error');
    if (isSubmitting) return; setIsSubmitting(true);
    try {
        const res = await fetch(`${apiUrl}/identificar`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({telefono: telClienteNuevo}) });
        const data = await res.json();
        if (res.ok) {
            if (data.tipo === 'cliente' || data.cliente) {
                setModalIdentificar(false); onGoToKiosco(data.data || data.cliente, null);
                mostrarAlertaCaja('¡Encontrado!', `Bienvenido ${(data.data || data.cliente).nombre}.`, 'success');
            } else setPasoIdentificar('registro');
        } else mostrarAlertaCaja('Error', data.error || 'Fallo buscar', 'error');
    } catch(err) { mostrarAlertaCaja('Error', 'Error red', 'error'); }
    setIsSubmitting(false);
  };

  const registrarClienteParaPedido = async (e) => {
    e.preventDefault();
    if(!datosNuevoCliente.nombre.trim() || !datosNuevoCliente.apellido.trim() || datosNuevoCliente.nip.length !== 4) return mostrarAlertaCaja('Aviso', 'Campos vacíos.', 'error');
    if (isSubmitting) return; setIsSubmitting(true);
    try {
        const res = await fetch(`${apiUrl}/clientes/registro`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({telefono: telClienteNuevo, ...datosNuevoCliente}) });
        const data = await res.json();
        if (res.ok) {
            setModalIdentificar(false); onGoToKiosco(data.cliente || data, null);
            mostrarAlertaCaja('¡Exitoso!', 'Cliente agregado.', 'success');
        } else mostrarAlertaCaja('Error', data.error || 'Fallo registrar', 'error');
    } catch(err) { mostrarAlertaCaja('Error', 'Error red', 'error'); }
    setIsSubmitting(false);
  };

  const pedidosPorConfirmar = pedidos.filter(p => p.estado_preparacion === 'Pendiente' && (p.tipo_consumo === 'Recoger en Local' || p.tipo_consumo === 'Domicilio'));
  const pendientesDePago = pedidos.filter(p => {
      if (['Cancelado', 'Finalizado'].includes(p.estado_preparacion)) return false;
      const tipo = p.tipo_consumo || '';
      if (p.estado_preparacion === 'Pendiente' && (tipo === 'Local' || tipo === 'Para llevar')) return true;
      if (tipo === 'Domicilio' && p.estado_preparacion === 'En Camino') return true;
      if (tipo === 'Local' && p.estado_preparacion === 'Entregado' && ['Por Cobrar', 'Pendiente'].includes(p.metodo_pago)) return true;
      return false;
  });
  const mesasPagadas = pedidos.filter(p => {
      if (['Cancelado', 'Finalizado'].includes(p.estado_preparacion)) return false;
      if (p.tipo_consumo === 'Local' && p.estado_preparacion === 'Entregado' && p.metodo_pago !== 'Por Cobrar' && p.metodo_pago !== 'Pendiente') return true;
      return false;
  });
  const listosParaEntregar = pedidos.filter(p => p.estado_preparacion === 'Listo');
  const pedidosConAlerta = pedidos.filter(p => p.alerta_cocina && !['Entregado', 'Cancelado'].includes(p.estado_preparacion));

  return {
    vistaActiva, setVistaActiva, subVistaHistorial, setSubVistaHistorial, pedidos, mesas, catalogoIngredientes,
    configGlobal, insumosDB, gastosDia, menuAbiertoCaja, setMenuAbiertoCaja, modalPago, setModalPago,
    montoRecibido, setMontoRecibido, modalResolver, setModalResolver, itemAfectadoIdx, setItemAfectadoIdx,
    accionAlerta, setAccionAlerta, ingredienteReemplazo, setIngredienteReemplazo, ticketImprimir, modalZonaEnvio,
    setModalZonaEnvio, modalVerDetalle, setModalVerDetalle, modalEditarPedido, setModalEditarPedido, modalCompraRapida,
    setModalCompraRapida, insumoComprar, setInsumoComprar, paquetesComprados, setPaquetesComprados, alertaCaja,
    setAlertaCaja, modalAgregarExtra, setModalAgregarExtra, alertaCobroExtra, setAlertaCobroExtra, modalIdentificar,
    setModalIdentificar, pasoIdentificar, setPasoIdentificar, telClienteNuevo, setTelClienteNuevo, datosNuevoCliente,
    setDatosNuevoCliente, isSubmitting, fondoCaja, inputFondo, setInputFondo, apiUrl, 
    pedidosPorConfirmar, pendientesDePago, mesasPagadas, listosParaEntregar, pedidosConAlerta,
    toggleEstadoNegocio, cerrarCajaYSalir, iniciarTurno, lanzarImpresion, procesarPago, confirmarPedidoRecoger,
    confirmarPedidoDomicilio, actualizarEstadoPedido, guardarEdicionPedido, limpiarAlerta, abrirModalResolver,
    enviarRespuestaCocina, registrarCompraRapida, confirmarAgregarExtra, abrirIdentificador, buscarClienteParaPedido,
    registrarClienteParaPedido
  };
};