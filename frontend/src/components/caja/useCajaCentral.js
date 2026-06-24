import { useState, useEffect, useCallback } from 'react';  

export const useCajaCentral = (user, onLogout, onGoToKiosco) => {
  // ==========================================
  // 1. ESTADOS DE INTERFAZ Y NAVEGACIÓN
  // ==========================================
  const [vistaActiva, setVistaActiva] = useState('por_confirmar');
  const [subVistaHistorial, setSubVistaHistorial] = useState('activos');  
  const [isCajaBloqueada, setIsCajaBloqueada] = useState(true);
  const [operadorActual, setOperadorActual] = useState(user);  

  // ==========================================
  // 2. ESTADOS DE DATOS (BASE DE DATOS)
  // ==========================================
  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [configGlobal, setConfigGlobal] = useState(null);
  const [empleadosPOS, setEmpleadosPOS] = useState([]);
  const [insumosDB, setInsumosDB] = useState([]);
  const [gastosDia, setGastosDia] = useState([]);  

  // ==========================================
  // 3. ESTADOS DE MODALES Y OPERATIVIDAD
  // ==========================================
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
  const [modalAsistencia, setModalAsistencia] = useState(null);  
  const [modalIdentificar, setModalIdentificar] = useState(false);
  const [pasoIdentificar, setPasoIdentificar] = useState(1);
  const [telClienteNuevo, setTelClienteNuevo] = useState('');
  const [datosNuevoCliente, setDatosNuevoCliente] = useState({ 
    nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: '' 
  });  
  const [modalPuntoVenta, setModalPuntoVenta] = useState(false);
  const [ordenEditandoRapida, setOrdenEditandoRapida] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);  

  // ==========================================
  // 4. CONFIGURACIÓN INICIAL Y FONDOS
  // ==========================================
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

  // ==========================================
  // 5. EFECTOS Y CARGA DE DATOS
  // ==========================================
  const cargarDataDinamica = useCallback(async () => {
    try {
      const t = new Date().getTime();
      const [
        resPed, resMesas, resInsumos, resGastos, resProd, resClas, resIng, resUsu
      ] = await Promise.all([
        fetch(`${apiUrl}/pedidos/hoy?t=${t}`),
        fetch(`${apiUrl}/mesas?t=${t}`),
        fetch(`${apiUrl}/insumos?t=${t}`),
        fetch(`${apiUrl}/insumos/compras/hoy?t=${t}`),
        fetch(`${apiUrl}/productos?t=${t}`),
        fetch(`${apiUrl}/clasificaciones?t=${t}`),
        fetch(`${apiUrl}/ingredientes?t=${t}`),
        fetch(`${apiUrl}/usuarios?t=${t}`)
      ]);
      
      const dataPed = await resPed.json();
      setPedidos(Array.isArray(dataPed) ? dataPed : []);
      
      const dataMesas = await resMesas.json();
      setMesas(Array.isArray(dataMesas) ? dataMesas : []);
      
      const dataInsumos = await resInsumos.json();
      setInsumosDB(Array.isArray(dataInsumos) ? dataInsumos : []);
      
      const dataGastos = await resGastos.json();
      setGastosDia(Array.isArray(dataGastos) ? dataGastos : []);

      const dataProd = await resProd.json();
      setProductos(Array.isArray(dataProd) ? dataProd.filter(p => p.disponible !== false && p.disponible !== 'false' && p.disponible !== 0) : []);
      
      const dataClas = await resClas.json();
      setClasificaciones(Array.isArray(dataClas) ? dataClas : []);
      
      const dataIng = await resIng.json();
      setCatalogoIngredientes(Array.isArray(dataIng) ? dataIng : []);
      
      const dataUsu = await resUsu.json();
      setEmpleadosPOS(Array.isArray(dataUsu) ? dataUsu : []);

    } catch (error) {
      console.error("Error cargando data dinámica:", error);
    }
  }, [apiUrl]);  

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/configuracion?t=${new Date().getTime()}`);
        const data = await res.json();
        if (data && !data.error) {
          setConfigGlobal(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data)) return data;
            return prev;
          });  
          if (data.bloqueo_caja_activo !== true && data.bloqueo_caja_activo !== 'true') {
            setIsCajaBloqueada(false);
          }
        }
      } catch (error) {
        console.error("Error cargando configuración:", error);
      }
    };  

    cargarConfig();
    cargarDataDinamica();  
    
    const intervaloData = setInterval(cargarDataDinamica, 3000);
    const intervaloConfig = setInterval(cargarConfig, 3000);
    
    return () => {
      clearInterval(intervaloData);
      clearInterval(intervaloConfig);
    };
  }, [apiUrl, cargarDataDinamica]);  

  // Auto-bloqueo por inactividad
  useEffect(() => {
    if (!configGlobal) return;
    const isBloqueoGlobalOn = configGlobal.bloqueo_caja_activo === true || configGlobal.bloqueo_caja_activo === 'true';
    if (!isBloqueoGlobalOn || modalPuntoVenta || modalPago || modalCompraRapida || modalResolver || modalIdentificar || modalAsistencia) return;  
    
    let timeout;
    const segundosLimite = configGlobal.bloqueo_caja_segundos || 30;
    
    const reiniciarTemporizador = () => {
      clearTimeout(timeout);
      if (!isCajaBloqueada) {
        timeout = setTimeout(() => setIsCajaBloqueada(true), segundosLimite * 1000);
      }
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

  // ==========================================
  // 6. FUNCIONES OPERATIVAS
  // ==========================================
  const mostrarAlertaCaja = (titulo, mensaje, tipo = 'success') => { 
    setAlertaCaja({ titulo, mensaje, tipo }); 
    setTimeout(() => setAlertaCaja(null), 4000); 
  };

  const cerrarCajaYSalir = async () => { 
    onLogout(); 
  };

  const iniciarTurno = (e) => { 
    e.preventDefault(); 
    const m = Number(inputFondo); 
    localStorage.setItem(`fondo_caja_${user?.id}_${hoyStr}`, m); 
    setFondoCaja(m); 
  };

  const lanzarImpresion = (pedido) => { 
    setTicketImprimir(pedido); 
    setTimeout(() => { 
      window.print(); 
      setTicketImprimir(null); 
    }, 500); 
  };  

  const toggleEstadoNegocio = async () => {
    try {
      const nuevoEstado = !configGlobal.negocio_abierto;
      const formData = new FormData();
      formData.append('negocio_abierto', nuevoEstado ? 'true' : 'false');
      
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) {
        setConfigGlobal({ ...configGlobal, negocio_abierto: nuevoEstado });
      }
    } catch (e) { 
      console.error(e); 
    }
  };  

  const procesarPago = async (estadoRechazo = null, esPostPago = false, pagosMixtos = null) => {
    if (isSubmitting) return; 
    setIsSubmitting(true);
    
    let estadoFinal; 
    let metodoPagoFinal = pagosMixtos ? 'Mixto' : modalPago.metodo_pago;
    
    if (estadoRechazo) {
      estadoFinal = estadoRechazo;
    } else if (esPostPago) { 
      estadoFinal = 'Pagado'; 
      metodoPagoFinal = 'Por Cobrar'; 
    } else {
      if (['Entregado', 'Listo', 'En Camino'].includes(modalPago.estado_preparacion)) {
        estadoFinal = 'Entregado';
      } else if (['Pendiente', 'Por Confirmar'].includes(modalPago.estado_preparacion)) {
        estadoFinal = 'Pagado';
      } else {
        estadoFinal = modalPago.estado_preparacion;
      }
    }
    
    try {
      const payload = { estado_preparacion: estadoFinal, metodo_pago: metodoPagoFinal };
      
      if (pagosMixtos) {
        payload.pagos_mixtos = pagosMixtos;
      }
      
      if (estadoFinal === 'Entregado' || estadoFinal === 'Finalizado') {
        const carritoActual = typeof modalPago.carrito === 'string' ? JSON.parse(modalPago.carrito) : (modalPago.carrito || []);
        payload.carrito = carritoActual.map(item => ({ ...item, estado: 'Finalizado' }));
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
        setModalPago(null); 
        setMontoRecibido(''); 
        await cargarDataDinamica();
      }
    } catch (error) { 
      mostrarAlertaCaja('Error', 'Problema al procesar el pago.', 'error'); 
    }
    
    setIsSubmitting(false);
  };  

  const actualizarEstadoPedido = async (pedidoOId, nuevoEstado) => {
    if (isSubmitting) return; 
    setIsSubmitting(true);
    
    const idReal = typeof pedidoOId === 'object' ? pedidoOId.id : pedidoOId;
    const pedidoFull = typeof pedidoOId === 'object' ? pedidoOId : pedidos.find(p => p.id === idReal);  
    
    let estadoSeguro = nuevoEstado;
    if (nuevoEstado === 'Preparando' && (!pedidoFull || !pedidoFull.chef_id)) {
        estadoSeguro = 'Pagado';
    }

    try {
      let payload = { estado_preparacion: estadoSeguro };  
      
      if (estadoSeguro === 'Entregado' && pedidoFull?.metodo_pago === 'Por Cobrar') {
        payload.metodo_pago = 'Efectivo';
      }
      
      await fetch(`${apiUrl}/pedidos/${idReal}/estado`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (estadoSeguro === 'Cancelado' && pedidoFull?.mesa) {
         const tableObj = mesas.find(m => String(m.numero) === String(pedidoFull.mesa));
         if (tableObj) {
            await fetch(`${apiUrl}/mesas/${tableObj.id}/estado`, { 
               method: 'PUT', 
               headers: { 'Content-Type': 'application/json' }, 
               body: JSON.stringify({ estado: 'disponible' }) 
            }).catch(()=>{});
         }
      }

      await cargarDataDinamica();
    } catch (error) { 
      console.error("Error al actualizar el estado del pedido:", error); 
    }
    
    setIsSubmitting(false);
  };

  const confirmarPedidoRecoger = async (id) => {
    await actualizarEstadoPedido(id, 'Pagado');
  };

  const confirmarPedidoDomicilio = async (pedidoModificado) => {
    if (isSubmitting) return; 
    setIsSubmitting(true);
    
    try {
        const oldPedido = pedidos.find(p => p.id === pedidoModificado.id);
        
        if (oldPedido) {
            const oldEnvio = Number(oldPedido.costo_envio || 0);
            const newEnvio = Number(pedidoModificado.costo_envio || 0);
            const baseTotal = Number(oldPedido.total) - oldEnvio;
            pedidoModificado.total = (baseTotal + newEnvio).toFixed(2);
        }
        
        await fetch(`${apiUrl}/pedidos/${pedidoModificado.id}`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(pedidoModificado) 
        });
        
        setModalZonaEnvio(null);
        await actualizarEstadoPedido(pedidoModificado.id, 'Pagado');
        await cargarDataDinamica(); 
    } catch(e) {
        console.error("Error al confirmar domicilio:", e);
    }
    
    setIsSubmitting(false);
  };

  const limpiarAlerta = async (id) => {
    if (isSubmitting) return; 
    setIsSubmitting(true);
    
    try {
        await fetch(`${apiUrl}/pedidos/${id}/alerta`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ alerta_cocina: null }) 
        });
        
        const ped = pedidos.find(x => x.id === id);
        if (ped) {
          await fetch(`${apiUrl}/pedidos/${id}/estado`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ estado_preparacion: ped.estado_preparacion }) 
          });
        }
        
        await cargarDataDinamica();
    } catch(e) {
      console.error(e);
    }
    
    setIsSubmitting(false);
  };

  const abrirModalResolver = (pedido) => {
    const alertaLimpia = pedido.alerta_cocina.replace(/\[IDX:[\d,]+\]\s*/g, '');
    setAccionAlerta(''); 
    setIngredienteReemplazo('');
    
    const match = pedido.alerta_cocina.match(/\[IDX:([\d,]+)\]/);
    if (match) {
       setItemAfectadoIdx(Number(match[1].split(',')[0]));
    } else {
       setItemAfectadoIdx('');
    }

    setModalResolver({ ...pedido, alertaLimpia });
  };

  const confirmarAgregarExtra = async (pedidoOriginal, itemIndex, extraObj) => {
    if (isSubmitting) return; 
    setIsSubmitting(true);
    
    try {
      const items = typeof pedidoOriginal.carrito === 'string' ? JSON.parse(pedidoOriginal.carrito) : pedidoOriginal.carrito;
      const itemReal = items[itemIndex];
      
      itemReal.extras = itemReal.extras || [];
      itemReal.extras.push(extraObj);
      itemReal.precioFinal = (Number(itemReal.precioFinal) + Number(extraObj.precioExtra)).toFixed(2);
      
      const nuevoTotal = (Number(pedidoOriginal.total) + Number(extraObj.precioExtra)).toFixed(2);
      
      await fetch(`${apiUrl}/pedidos/${pedidoOriginal.id}/estado`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          carrito: items, 
          total: nuevoTotal,
          estado_preparacion: pedidoOriginal.estado_preparacion 
        }) 
      });

      setModalAgregarExtra(null);
      setAlertaCobroExtra({ 
        orden: pedidoOriginal.numero_pedido, 
        platillo: itemReal.nombre, 
        extra: extraObj.nombre, 
        monto: extraObj.precioExtra 
      });
      await cargarDataDinamica();
    } catch(e) { 
      console.error(e); 
    }
    
    setIsSubmitting(false);
  };

  const registrarCompraRapida = async (payload) => {
    if (isSubmitting) return; 
    setIsSubmitting(true);
    
    try {
         await fetch(`${apiUrl}/insumos/${payload.insumo_id}/comprar`, { 
           method: 'PUT', 
           headers: { 'Content-Type': 'application/json' }, 
           body: JSON.stringify(payload) 
         });
         
         setModalCompraRapida(false);
         mostrarAlertaCaja("Compra Registrada", "El gasto se ha descontado de la caja", "success");
         await cargarDataDinamica();
    } catch(e) {
      console.error(e);
    }
    
    setIsSubmitting(false);
  };

  const enviarRespuestaCocina = async (e) => {
    if (e && e.preventDefault) e.preventDefault(); 
    if (isSubmitting) return; 
    setIsSubmitting(true);
    
    try {
      const items = typeof modalResolver.carrito === 'string' ? JSON.parse(modalResolver.carrito) : modalResolver.carrito;
      
      let payloadEstado = { 
        carrito: items,
        estado_preparacion: modalResolver.estado_preparacion 
      };
      
      let textoRespuesta = 'CAJA RESPONDE: Revisado.';

      if (accionAlerta === 'cancelar') {
        payloadEstado.estado_preparacion = 'Cancelado'; 
        textoRespuesta = 'CAJA RESPONDE: Se canceló todo el pedido.';
        if (modalResolver.mesa) {
           const tableObj = mesas.find(m => String(m.numero) === String(modalResolver.mesa));
           if (tableObj) {
             await fetch(`${apiUrl}/mesas/${tableObj.id}/estado`, { 
               method: 'PUT', 
               headers: { 'Content-Type': 'application/json' }, 
               body: JSON.stringify({ estado: 'disponible' }) 
             }).catch(()=>{});
           }
        }
      } else if (accionAlerta === 'quitar') {
        if (itemAfectadoIdx !== null && itemAfectadoIdx !== '') {
           items.splice(itemAfectadoIdx, 1);
           payloadEstado.carrito = items;
        }
        textoRespuesta = 'CAJA RESPONDE: Se eliminó el platillo del carrito.';
      } else if (accionAlerta === 'cambiar') {
        if (itemAfectadoIdx !== null && itemAfectadoIdx !== '') {
          items[itemAfectadoIdx].nombre = `${items[itemAfectadoIdx].nombre} (Sustitución: ${ingredienteReemplazo})`;
          payloadEstado.carrito = items;
        }
        textoRespuesta = `CAJA RESPONDE: Sustituir por ${ingredienteReemplazo}`;
      } else if (accionAlerta === 'aceptar') {
        if (itemAfectadoIdx !== null && itemAfectadoIdx !== '') {
          const match = modalResolver.alertaLimpia.match(/PROPUESTA COCINA:\s*(.*)/i);
          const propuestaChef = match ? match[1].trim() : '';
          
          if (propuestaChef.toLowerCase().includes('sin')) {
            items[itemAfectadoIdx].nombre = `${items[itemAfectadoIdx].nombre} (${propuestaChef})`;
          } else if (propuestaChef && !propuestaChef.toLowerCase().includes('quitar') && !propuestaChef.toLowerCase().includes('cancelar')) {
            items[itemAfectadoIdx].nombre = `${items[itemAfectadoIdx].nombre} (Sustitución: ${propuestaChef})`;
          }
          payloadEstado.carrito = items;
        }
        textoRespuesta = 'CAJA RESPONDE: Propuesta aceptada. Proceder.';
      }

      await fetch(`${apiUrl}/pedidos/${modalResolver.id}/alerta`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ alerta_cocina: textoRespuesta }) 
      });
      
      await fetch(`${apiUrl}/pedidos/${modalResolver.id}/estado`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payloadEstado) 
      });
      
      setModalResolver(null); 
      await cargarDataDinamica();
    } catch(err) { 
      console.error(err); 
    }
    
    setIsSubmitting(false);
  };  

  const guardarEdicionPedido = async (id, nuevosDatos) => {
    setIsSubmitting(true);
    try {
      const pedidoRef = pedidos.find(p => p.id === id);
      let paqueteCompleto = { ...nuevosDatos };
      
      if (pedidoRef) {
        const carritoArray = typeof pedidoRef.carrito === 'string' ? JSON.parse(pedidoRef.carrito) : (pedidoRef.carrito || []);
        paqueteCompleto = {
          cliente_id: pedidoRef.cliente_id,
          cliente_nombre: pedidoRef.cliente_nombre, 
          cliente_telefono: pedidoRef.cliente_telefono, 
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
      
      const res = await fetch(`${apiUrl}/pedidos/${id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(paqueteCompleto) 
      });
      
      if (res.ok) {
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
    } catch (error) {
      console.error(error);
    }
    setIsSubmitting(false);
  };  

  const abrirIdentificador = () => { 
    setOrdenEditandoRapida(null); 
    setModalPuntoVenta(true); 
  };
  
  const onGoToKioscoLocal = (cliente, orden) => { 
    setOrdenEditandoRapida(orden); 
    setModalEditarPedido(null); 
    setModalPuntoVenta(true); 
  };  

  // ==========================================
  // 7. CÁLCULO DE FILTROS DERIVADOS
  // ==========================================
  const pedidosPorConfirmar = pedidos.filter(p => {
    if (p.estado_preparacion !== 'Pendiente') return false;
    if (p.origen === 'Caja') return false;
    return true;
  });

  const pendientesDePago = pedidos.filter(p => {
    if (['Cancelado', 'Finalizado'].includes(p.estado_preparacion)) return false;
    const tipo = p.tipo_consumo || '';
    const noPagado = ['Por Cobrar', 'Pendiente'].includes(p.metodo_pago);
    if (!noPagado) return false;
    if (p.estado_preparacion === 'Pendiente' && p.origen === 'Caja') return true;
    if (tipo === 'Local') return true;
    if ((tipo === 'Para llevar' || tipo === 'Recoger' || tipo === 'Recoger en Local') && p.estado_preparacion === 'Listo') return true;
    if (tipo === 'Domicilio' && p.estado_preparacion === 'Entregado') return true;
    return false;
  });

  const listosParaEntregar = pedidos.filter(p => {
    if (p.estado_preparacion !== 'Listo') return false;
    const noPagado = ['Por Cobrar', 'Pendiente'].includes(p.metodo_pago);
    const tipo = p.tipo_consumo || '';
    if (tipo === 'Domicilio') return true;
    if ((tipo === 'Para llevar' || tipo === 'Recoger' || tipo === 'Recoger en Local') && noPagado) return false;
    return true;
  });

  const pedidosEnReparto = pedidos.filter(p => 
    p.tipo_consumo === 'Domicilio' && p.estado_preparacion === 'En Camino'
  );

  const mesasPagadas = pedidos.filter(p => 
    p.tipo_consumo === 'Local' && 
    p.estado_preparacion === 'Entregado' && 
    p.metodo_pago !== 'Por Cobrar' && 
    p.metodo_pago !== 'Pendiente' && 
    p.estado_preparacion !== 'Cancelado' && 
    p.estado_preparacion !== 'Finalizado'
  );

  const pedidosConAlerta = pedidos.filter(p => 
    p.alerta_cocina && !['Entregado', 'Cancelado'].includes(p.estado_preparacion)
  );

  // ==========================================
  // 8. RETORNO DEL HOOK (Limpio y legible)
  // ==========================================
  return {
    vistaActiva, setVistaActiva, 
    subVistaHistorial, setSubVistaHistorial, 
    pedidos, mesas, catalogoIngredientes, configGlobal, 
    insumosDB, gastosDia, 
    modalPago, setModalPago, montoRecibido, setMontoRecibido,
    modalResolver, setModalResolver, itemAfectadoIdx, setItemAfectadoIdx, 
    accionAlerta, setAccionAlerta, ingredienteReemplazo, setIngredienteReemplazo, 
    ticketImprimir, 
    modalZonaEnvio, setModalZonaEnvio,
    modalVerDetalle, setModalVerDetalle, 
    modalEditarPedido, setModalEditarPedido, 
    modalCompraRapida, setModalCompraRapida, 
    insumoComprar, setInsumoComprar, paquetesComprados, setPaquetesComprados, 
    alertaCaja, setAlertaCaja, 
    modalAgregarExtra, setModalAgregarExtra, alertaCobroExtra, setAlertaCobroExtra,
    modalIdentificar, setModalIdentificar, pasoIdentificar, setPasoIdentificar, 
    telClienteNuevo, setTelClienteNuevo, datosNuevoCliente, setDatosNuevoCliente,
    modalPuntoVenta, setModalPuntoVenta, ordenEditandoRapida, 
    productos, clasificaciones, empleadosPOS, 
    isCajaBloqueada, setIsCajaBloqueada, operadorActual, setOperadorActual,
    isSubmitting, 
    fondoCaja, inputFondo, setInputFondo, 
    apiUrl, cargarDataDinamica,
    fondoRepartidor, actualizarFondoRepartidor,
    modalAsistencia, setModalAsistencia,  
    // Variables derivadas limpias
    pedidosPorConfirmar, pendientesDePago, listosParaEntregar, 
    pedidosEnReparto, mesasPagadas, pedidosConAlerta,
    // Funciones
    buscarClienteParaPedido: () => {}, 
    registrarClienteParaPedido: () => {},
    toggleEstadoNegocio, cerrarCajaYSalir, iniciarTurno, 
    lanzarImpresion, procesarPago, confirmarPedidoRecoger,
    confirmarPedidoDomicilio, actualizarEstadoPedido, guardarEdicionPedido, 
    limpiarAlerta, abrirModalResolver, enviarRespuestaCocina, 
    registrarCompraRapida, confirmarAgregarExtra, abrirIdentificador, 
    onGoToKiosco: onGoToKioscoLocal
  };
};