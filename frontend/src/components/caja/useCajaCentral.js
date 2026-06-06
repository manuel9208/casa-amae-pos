import { useState, useEffect, useCallback } from 'react';

export const useCajaCentral = (user, onLogout, onGoToKiosco) => {
  const [vistaActiva, setVistaActiva] = useState('mesas');
  const [subVistaHistorial, setSubVistaHistorial] = useState('activos');
  
  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [configGlobal, setConfigGlobal] = useState(null);
  const [empleadosPOS, setEmpleadosPOS] = useState([]);
  const [insumosDB, setInsumosDB] = useState([]);
  const [gastosDia, setGastosDia] = useState([]);
  
  const [isCajaBloqueada, setIsCajaBloqueada] = useState(true);
  const [operadorActual, setOperadorActual] = useState(user);
  
  const [modalPago, setModalPago] = useState(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [modalResolver, setModalResolver] = useState(null);
  const [itemAfectadoIdx, setItemAfectadoIdx] = useState(null);
  const [accionAlerta, setAccionAlerta] = useState('');
  const [ingredienteReemplazo, setIngredienteReemplazo] = useState('');
  const [ticketImprimir, setTicketImprimir] = useState(null);
  const [modalZonaEnvio, setModalZonaEnvio] = useState(null);
  const [modalVerDetalle, setModalVerDetalle] = useState(null);
  const [modalEditarPedido, setModalEditarPedido] = useState(null);
  const [modalCompraRapida, setModalCompraRapida] = useState(false);
  const [insumoComprar, setInsumoComprar] = useState(null);
  const [paquetesComprados, setPaquetesComprados] = useState('');
  const [alertaCaja, setAlertaCaja] = useState(null);
  const [modalAgregarExtra, setModalAgregarExtra] = useState(null);
  const [alertaCobroExtra, setAlertaCobroExtra] = useState(null);
  
  const [modalIdentificar, setModalIdentificar] = useState(false);
  const [pasoIdentificar, setPasoIdentificar] = useState(1);
  const [telClienteNuevo, setTelClienteNuevo] = useState('');
  const [datosNuevoCliente, setDatosNuevoCliente] = useState({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: '' });
  
  const [modalPuntoVenta, setModalPuntoVenta] = useState(false);
  const [ordenEditandoRapida, setOrdenEditandoRapida] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalAsistencia, setModalAsistencia] = useState(null); 
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const hoyStr = new Date().toISOString().split('T')[0];
  
  const [fondoCaja, setFondoCaja] = useState(() => {
    const guardado = localStorage.getItem(`fondo_caja_${user?.id}_${hoyStr}`);
    return guardado !== null ? Number(guardado) : '';
  });
  const [inputFondo, setInputFondo] = useState('');

  const [fondoRepartidor, setFondoRepartidor] = useState(() => {
    const guardado = localStorage.getItem(`fondo_rep_${user?.id}_${hoyStr}`);
    return guardado !== null ? Number(guardado) : '';
  });  

  const actualizarFondoRepartidor = (val) => {
    setFondoRepartidor(val);
    localStorage.setItem(`fondo_rep_${user?.id}_${hoyStr}`, val);
  };  

  const cargarDataDinamica = useCallback(async () => {
    try {
      const [resPed, resMesas, resInsumos, resGastos] = await Promise.all([
        fetch(`${apiUrl}/pedidos/hoy?t=${new Date().getTime()}`),
        fetch(`${apiUrl}/mesas?t=${new Date().getTime()}`),
        fetch(`${apiUrl}/insumos?t=${new Date().getTime()}`),
        fetch(`${apiUrl}/insumos/compras/hoy?t=${new Date().getTime()}`)
      ]);  
      const dataPed = await resPed.json();
      setPedidos(Array.isArray(dataPed) ? dataPed : []);  
      const dataMesas = await resMesas.json();
      setMesas(Array.isArray(dataMesas) ? dataMesas : []);  
      const dataInsumos = await resInsumos.json();
      setInsumosDB(Array.isArray(dataInsumos) ? dataInsumos : []);  
      const dataGastos = await resGastos.json();
      setGastosDia(Array.isArray(dataGastos) ? dataGastos : []);  
    } catch (error) {}
  }, [apiUrl]);  

  useEffect(() => {
    fetch(`${apiUrl}/productos`).then(r=>r.json()).then(data => setProductos(Array.isArray(data) ? data.filter(p => p.disponible !== false && p.disponible !== 'false' && p.disponible !== 0) : []));
    fetch(`${apiUrl}/clasificaciones`).then(r=>r.json()).then(data => setClasificaciones(Array.isArray(data) ? data : []));
    fetch(`${apiUrl}/ingredientes`).then(r=>r.json()).then(data => setCatalogoIngredientes(Array.isArray(data) ? data : []));
    fetch(`${apiUrl}/usuarios`).then(r=>r.json()).then(data => setEmpleadosPOS(Array.isArray(data) ? data : []));  
    const cargarConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/configuracion?t=${new Date().getTime()}`);
        const data = await res.json();
        if(data && !data.error) {
          setConfigGlobal(data);
          if (data.bloqueo_caja_activo !== true && data.bloqueo_caja_activo !== 'true') {
            setIsCajaBloqueada(false);
          }
        }
      } catch (error) { setIsCajaBloqueada(false); }
    };
    cargarConfig();
    cargarDataDinamica();
    const intervalo = setInterval(cargarDataDinamica, 3000);
    return () => clearInterval(intervalo);
  }, [apiUrl, cargarDataDinamica]);  

  useEffect(() => {
    if (!configGlobal) return;
    const isBloqueoGlobalOn = configGlobal.bloqueo_caja_activo === true || configGlobal.bloqueo_caja_activo === 'true';
    if (!isBloqueoGlobalOn || modalPuntoVenta || modalPago || modalCompraRapida || modalResolver || modalIdentificar || modalAsistencia) return;  
    
    let timeout;
    const segundosLimite = configGlobal.bloqueo_caja_segundos || 30;
    const reiniciarTemporizador = () => {
      clearTimeout(timeout);
      if (!isCajaBloqueada) timeout = setTimeout(() => setIsCajaBloqueada(true), segundosLimite * 1000);
    };  
    
    window.addEventListener('mousemove', reiniciarTemporizador);
    window.addEventListener('keydown', reiniciarTemporizador);
    window.addEventListener('touchstart', reiniciarTemporizador);
    window.addEventListener('click', reiniciarTemporizador);
    reiniciarTemporizador();  
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', reiniciarTemporizador);
      window.removeEventListener('keydown', reiniciarTemporizador);
      window.removeEventListener('touchstart', reiniciarTemporizador);
      window.removeEventListener('click', reiniciarTemporizador);
    };
  }, [configGlobal, isCajaBloqueada, modalPuntoVenta, modalPago, modalCompraRapida, modalResolver, modalIdentificar, modalAsistencia]);  

  const mostrarAlertaCaja = (titulo, mensaje, tipo = 'success') => { setAlertaCaja({ titulo, mensaje, tipo }); setTimeout(() => setAlertaCaja(null), 4000); };
  const cerrarCajaYSalir = async () => { onLogout(); };
  const iniciarTurno = (e) => { e.preventDefault(); const m = Number(inputFondo); localStorage.setItem(`fondo_caja_${user?.id}_${hoyStr}`, m); setFondoCaja(m); };
  const lanzarImpresion = (pedido) => { setTicketImprimir(pedido); setTimeout(() => { window.print(); setTicketImprimir(null); }, 500); };  

  const toggleEstadoNegocio = async () => {
    try {
      const nuevoEstado = !configGlobal.negocio_abierto;
      const formData = new FormData();
      formData.append('negocio_abierto', nuevoEstado ? 'true' : 'false');
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) setConfigGlobal({ ...configGlobal, negocio_abierto: nuevoEstado });
    } catch (e) { console.error(e); }
  };  

  const procesarPago = async (estadoRechazo = null, esPostPago = false, pagosMixtos = null) => {
    if (isSubmitting) return; setIsSubmitting(true);
    let estadoFinal; let metodoPagoFinal = pagosMixtos ? 'Mixto' : modalPago.metodo_pago;  
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
        setModalPago(null); setMontoRecibido(''); await cargarDataDinamica();
      }
    } catch (error) { mostrarAlertaCaja('Error', 'Problema al procesar.', 'error'); }
    setIsSubmitting(false);
  };  

  const actualizarEstadoPedido = async (pedidoOId, nuevoEstado) => {
    if(isSubmitting) return; setIsSubmitting(true);
    const idReal = typeof pedidoOId === 'object' ? pedidoOId.id : pedidoOId;
    try {
      await fetch(`${apiUrl}/pedidos/${idReal}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: nuevoEstado }) });
      await cargarDataDinamica();
    } catch(e) { console.error(e); }
    setIsSubmitting(false);
  };  

  const confirmarPedidoRecoger = async (pedidoOId) => {
    const idReal = typeof pedidoOId === 'object' ? pedidoOId.id : pedidoOId;
    actualizarEstadoPedido(idReal, 'Pagado');
  };  

  const confirmarPedidoDomicilio = async (pedidoOId, tarifa) => {
    if(isSubmitting) return; setIsSubmitting(true);
    const idReal = typeof pedidoOId === 'object' ? pedidoOId.id : pedidoOId;
    const pedidoCompleto = typeof pedidoOId === 'object' ? pedidoOId : pedidos.find(p => p.id === idReal);
    const nvoTotal = (Number(pedidoCompleto.total) + Number(tarifa)).toFixed(2);
    try {
      await fetch(`${apiUrl}/pedidos/${idReal}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: 'Pagado', costo_envio: tarifa, total: nvoTotal }) });
      setModalZonaEnvio(null); await cargarDataDinamica();
    } catch(err) { console.error(err); }
    setIsSubmitting(false);
  };  

  const limpiarAlerta = async (id) => {
    try { await fetch(`${apiUrl}/pedidos/${id}/alerta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: null }) }); await cargarDataDinamica(); } catch (error) {}
  };  

  const abrirModalResolver = (pedido) => {
    let platilloReemplazo = '';
    const alertaLimpia = pedido.alerta_cocina.replace(/\[IDX:\d+\]\s*/g, '');
    const esFaltaIngrediente = alertaLimpia.includes('FALTA INGREDIENTE:');
    if (esFaltaIngrediente) {
      const parts = alertaLimpia.split(' EN ');
      if (parts.length > 1) platilloReemplazo = parts[1].trim();
    }
    setAccionAlerta(esFaltaIngrediente ? 'reemplazar' : 'cancelar');
    setIngredienteReemplazo('');
    const match = pedido.alerta_cocina.match(/\[IDX:(\d+)\]/);
    if (match) setItemAfectadoIdx(Number(match[1])); else setItemAfectadoIdx(null);
    setModalResolver({ ...pedido, platilloReemplazo });
  };  

  const enviarRespuestaCocina = async () => {
    if(isSubmitting) return; setIsSubmitting(true);
    try {
      const items = typeof modalResolver.carrito === 'string' ? JSON.parse(modalResolver.carrito) : modalResolver.carrito;
      let payload = { alerta_cocina: null, carrito: items };
      if (accionAlerta === 'cancelar') {
        payload.estado_preparacion = 'Cancelado';
        payload.mesa = null;
      } else if (accionAlerta === 'reemplazar' && itemAfectadoIdx !== null) {
        items[itemAfectadoIdx].nombre = `${items[itemAfectadoIdx].nombre} (Sustitución: ${ingredienteReemplazo})`;
        payload.carrito = items;
      }
      await fetch(`${apiUrl}/pedidos/${modalResolver.id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setModalResolver(null); await cargarDataDinamica();
    } catch(err) { console.error(err); }
    setIsSubmitting(false);
  };  

  const registrarCompraRapida = async (e) => {
    e.preventDefault();
    if(isSubmitting || !insumoComprar || !paquetesComprados) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiUrl}/insumos/${insumoComprar.id}/comprar`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paquetes_comprados: paquetesComprados, costo_unitario: insumoComprar.costo_presentacion })
      });
      setModalCompraRapida(false); setInsumoComprar(null); setPaquetesComprados('');
      await cargarDataDinamica();
    } catch(err) { console.error(err); }
    setIsSubmitting(false);
  };  

  const confirmarAgregarExtra = async (pedidoOriginal, itemIndex, extraObj) => {
    if(isSubmitting) return; setIsSubmitting(true);
    try {
      const items = typeof pedidoOriginal.carrito === 'string' ? JSON.parse(pedidoOriginal.carrito) : pedidoOriginal.carrito;
      const itemReal = items[itemIndex];
      itemReal.extras = itemReal.extras || [];
      itemReal.extras.push(extraObj);
      itemReal.precioFinal = (Number(itemReal.precioFinal) + Number(extraObj.precioExtra)).toFixed(2);
      const nuevoTotal = (Number(pedidoOriginal.total) + Number(extraObj.precioExtra)).toFixed(2);  
      await fetch(`${apiUrl}/pedidos/${pedidoOriginal.id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ carrito: items, total: nuevoTotal }) });
      setModalAgregarExtra(null);
      setAlertaCobroExtra({ orden: pedidoOriginal.numero_pedido, platillo: itemReal.nombre, extra: extraObj.nombre, monto: extraObj.precioExtra });
      await cargarDataDinamica();
    } catch(e) { console.error(e); }
    setIsSubmitting(false);
  };  

  const guardarEdicionPedido = async (id, nuevosDatos) => {
    if (isSubmitting) return; setIsSubmitting(true);
    try {
      const pedidoRef = pedidos.find(p => p.id === id);
      let paqueteCompleto = { ...nuevosDatos };
      if (pedidoRef) {
        const carritoArray = typeof pedidoRef.carrito === 'string' ? JSON.parse(pedidoRef.carrito) : (pedidoRef.carrito || []);
        paqueteCompleto = {
          cliente_id: pedidoRef.cliente_id, tipo_consumo: nuevosDatos.tipo_consumo || pedidoRef.tipo_consumo,
          metodo_pago: pedidoRef.metodo_pago, origen: pedidoRef.origen, direccion_entrega: nuevosDatos.direccion_entrega !== undefined ? nuevosDatos.direccion_entrega : pedidoRef.direccion_entrega,
          estado_preparacion: nuevosDatos.estado_preparacion || pedidoRef.estado_preparacion, mesa: pedidoRef.mesa, carrito: carritoArray, total: nuevosDatos.total !== undefined ? nuevosDatos.total : pedidoRef.total,
          descuento_puntos: pedidoRef.descuento_puntos, cupon_codigo: pedidoRef.cupon_codigo, costo_envio: nuevosDatos.costo_envio !== undefined ? nuevosDatos.costo_envio : pedidoRef.costo_envio
        };
      }
      const res = await fetch(`${apiUrl}/pedidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paqueteCompleto) });
      if (res.ok) { 
          // 🛡️ SINCRONIZACIÓN INTELIGENTE EN CAJA: Guarda la dirección en el perfil si el cajero la edita
          if (pedidoRef && pedidoRef.cliente_id && nuevosDatos.direccion_entrega) {
              const dirLimpia = nuevosDatos.direccion_entrega.split(' | TEL:')[0].split(' | (Llevar')[0].trim();
              try {
                  const resCli = await fetch(`${apiUrl}/clientes/${pedidoRef.cliente_id}`);
                  if (resCli.ok) {
                      const cliData = await resCli.json();
                      if (!cliData.direccion || cliData.direccion !== dirLimpia) {
                          await fetch(`${apiUrl}/clientes/${pedidoRef.cliente_id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ...cliData, direccion: dirLimpia })
                          });
                      }
                  }
              } catch(e) {}
          }

          setModalEditarPedido(null); 
          await cargarDataDinamica(); 
      }
    } catch (error) {}
    setIsSubmitting(false);
  };  

  const abrirIdentificador = () => { setOrdenEditandoRapida(null); setModalPuntoVenta(true); };
  const onGoToKioscoLocal = (cliente, orden) => { setOrdenEditandoRapida(orden); setModalEditarPedido(null); setModalPuntoVenta(true); };  

  return {
    vistaActiva, setVistaActiva, subVistaHistorial, setSubVistaHistorial, pedidos, mesas, catalogoIngredientes,
    configGlobal, insumosDB, gastosDia, modalPago, setModalPago, montoRecibido, setMontoRecibido,
    modalResolver, setModalResolver, itemAfectadoIdx, setItemAfectadoIdx, accionAlerta, setAccionAlerta,
    ingredienteReemplazo, setIngredienteReemplazo, ticketImprimir, modalZonaEnvio, setModalZonaEnvio,
    modalVerDetalle, setModalVerDetalle, modalEditarPedido, setModalEditarPedido, modalCompraRapida,
    setModalCompraRapida, insumoComprar, setInsumoComprar, paquetesComprados, setPaquetesComprados, alertaCaja,
    setAlertaCaja, modalAgregarExtra, setModalAgregarExtra, alertaCobroExtra, setAlertaCobroExtra,
    modalIdentificar, setModalIdentificar, pasoIdentificar, setPasoIdentificar, telClienteNuevo, setTelClienteNuevo, datosNuevoCliente, setDatosNuevoCliente,
    buscarClienteParaPedido: () => {}, registrarClienteParaPedido: () => {},
    modalPuntoVenta, setModalPuntoVenta, ordenEditandoRapida, productos, clasificaciones,
    empleadosPOS, isCajaBloqueada, setIsCajaBloqueada, operadorActual, setOperadorActual,
    isSubmitting, fondoCaja, inputFondo, setInputFondo, apiUrl, cargarDataDinamica,  
    fondoRepartidor, actualizarFondoRepartidor,  
    modalAsistencia, setModalAsistencia,

    pedidosPorConfirmar: pedidos.filter(p => {
      if (p.estado_preparacion !== 'Pendiente') return false;
      if (p.origen === 'Caja') return false;
      return true;
    }),  
    pendientesDePago: pedidos.filter(p => {
      if (['Cancelado', 'Finalizado'].includes(p.estado_preparacion)) return false;  
      const tipo = p.tipo_consumo || '';
      const noPagado = ['Por Cobrar', 'Pendiente'].includes(p.metodo_pago);  
      if (!noPagado) return false;
      if (p.estado_preparacion === 'Pendiente' && p.origen === 'Caja') return true;
      if (tipo === 'Local') return true;
      if ((tipo === 'Para llevar' || tipo === 'Recoger' || tipo === 'Recoger en Local') && p.estado_preparacion === 'Listo') return true;  
      if (tipo === 'Domicilio' && p.estado_preparacion === 'Entregado') return true;  
      return false;
    }),  
    listosParaEntregar: pedidos.filter(p => {
      if (p.estado_preparacion !== 'Listo') return false;
      const noPagado = ['Por Cobrar', 'Pendiente'].includes(p.metodo_pago);
      const tipo = p.tipo_consumo || '';
      if (tipo === 'Domicilio') return true;
      if ((tipo === 'Para llevar' || tipo === 'Recoger' || tipo === 'Recoger en Local') && noPagado) return false;
      return true;
    }),  
    pedidosEnReparto: pedidos.filter(p => p.tipo_consumo === 'Domicilio' && p.estado_preparacion === 'En Camino'),  
    mesasPagadas: pedidos.filter(p => p.tipo_consumo === 'Local' && p.estado_preparacion === 'Entregado' && p.metodo_pago !== 'Por Cobrar' && p.metodo_pago !== 'Pendiente' && p.estado_preparacion !== 'Cancelado' && p.estado_preparacion !== 'Finalizado'),
    pedidosConAlerta: pedidos.filter(p => p.alerta_cocina && !['Entregado', 'Cancelado'].includes(p.estado_preparacion)),  
    toggleEstadoNegocio, cerrarCajaYSalir, iniciarTurno, lanzarImpresion, procesarPago, confirmarPedidoRecoger,
    confirmarPedidoDomicilio, actualizarEstadoPedido, guardarEdicionPedido, limpiarAlerta, abrirModalResolver,
    enviarRespuestaCocina, registrarCompraRapida, confirmarAgregarExtra, abrirIdentificador, onGoToKiosco: onGoToKioscoLocal
  };
};