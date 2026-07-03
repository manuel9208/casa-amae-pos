import { useState, useEffect, useCallback } from 'react';

export const useCajaCentral = (user, onLogout, onGoToKiosco) => {
    const [vistaActiva, setVistaActiva] = useState('por_confirmar');
    const [subVistaHistorial, setSubVistaHistorial] = useState('activos');
    const [isCajaBloqueada, setIsCajaBloqueada] = useState(true);
    const [operadorActual, setOperadorActual] = useState(user);

    useEffect(() => {
        if (user) setOperadorActual(user);
    }, [user]);

    const [pedidos, setPedidos] = useState([]);
    const [mesas, setMesas] = useState([]);
    const [productos, setProductos] = useState([]);
    const [clasificaciones, setClasificaciones] = useState([]);
    const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
    const [configGlobal, setConfigGlobal] = useState(null);
    const [empleadosPOS, setEmpleadosPOS] = useState([]);
    const [insumosDB, setInsumosDB] = useState([]);
    const [gastosDia, setGastosDia] = useState([]);

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
    const [modalMermas, setModalMermas] = useState(false);
    const [insumoComprar, setInsumoComprar] = useState(null);
    const [paquetesComprados, setPaquetesComprados] = useState('');
    const [alertaCaja, setAlertaCaja] = useState(null);
    const [modalAgregarExtra, setModalAgregarExtra] = useState(null);
    const [alertaCobroExtra, setAlertaCobroExtra] = useState(null);
    const [modalAsistencia, setModalAsistencia] = useState(null);
    const [modalIdentificar, setModalIdentificar] = useState(false);
    const [pasoIdentificar, setPasoIdentificar] = useState(1);
    const [telClienteNuevo, setTelClienteNuevo] = useState('');
    const [datosNuevoCliente, setDatosNuevoCliente] = useState({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: '' });
    const [modalPuntoVenta, setModalPuntoVenta] = useState(false);
    const [ordenEditandoRapida, setOrdenEditandoRapida] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalComedor, setModalComedor] = useState(false);

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    const hoyStr = new Date().toISOString().split('T')[0];

    const [fondoCaja, setFondoCaja] = useState(() => {
        const guardado = localStorage.getItem(`fondo_caja_${user?.id}_${hoyStr}`);
        return guardado !== null ? Number(guardado) : null;
    });

    const [inputFondo, setInputFondo] = useState('');

    const [fondosRepartidores, setFondosRepartidores] = useState(() => {
        const guardado = localStorage.getItem(`fondos_repartidores_${hoyStr}`);
        return guardado ? JSON.parse(guardado) : {};
    });

    const actualizarFondoRepartidor = (repartidorId, valor) => {
        const num = Number(valor);
        const newFondos = { ...fondosRepartidores, [repartidorId]: isNaN(num) ? 0 : num };
        setFondosRepartidores(newFondos);
        localStorage.setItem(`fondos_repartidores_${hoyStr}`, JSON.stringify(newFondos));
    };

    const fondoRepartidorGlobal = Object.values(fondosRepartidores).reduce((sum, val) => sum + (Number(val) || 0), 0);

    const cargarDataDinamica = useCallback(async () => {
        try {
            const t = new Date().getTime();
            const [ resPed, resMesas, resInsumos, resGastos, resProd, resClas, resIng, resUsu ] = await Promise.all([
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
            } catch (error) {}
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

    useEffect(() => {
        if (!configGlobal) return;
        const isBloqueoGlobalOn = configGlobal.bloqueo_caja_activo === true || configGlobal.bloqueo_caja_activo === 'true';
        if (!isBloqueoGlobalOn || modalPuntoVenta || modalPago || modalCompraRapida || modalResolver || modalIdentificar || modalAsistencia || modalComedor || modalMermas) return;

        let timeout;
        const segundosLimite = configGlobal.bloqueo_caja_segundos || 30;

        const reiniciarTemporizador = () => {
            clearTimeout(timeout);
            if (!isCajaBloqueada && fondoCaja !== null) {
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
    }, [configGlobal, isCajaBloqueada, modalPuntoVenta, modalPago, modalCompraRapida, modalResolver, modalIdentificar, modalAsistencia, modalComedor, modalMermas, fondoCaja]);

    const mostrarAlertaCaja = (titulo, mensaje, tipo = 'success') => {
        setAlertaCaja({ titulo, mensaje, tipo });
        setTimeout(() => setAlertaCaja(null), 5000);
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
        setTimeout(() => { window.print(); setTicketImprimir(null); }, 500);
    };

    const toggleEstadoNegocio = async () => {
        try {
            const nuevoEstado = !configGlobal.negocio_abierto;
            const formData = new FormData();
            formData.append('negocio_abierto', nuevoEstado ? 'true' : 'false');
            const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
            if (res.ok) setConfigGlobal({ ...configGlobal, negocio_abierto: nuevoEstado });
        } catch (e) {}
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
                if (modalPago.tipo_consumo === 'Local' && modalPago.mesa) {
                    estadoFinal = 'Entregado';
                } else {
                    estadoFinal = 'Finalizado';
                }
            } else if (['Pendiente', 'Por Confirmar'].includes(modalPago.estado_preparacion)) {
                estadoFinal = 'Pagado';
            } else {
                estadoFinal = modalPago.estado_preparacion;
            }
        }

        try {
            const payload = { estado_preparacion: estadoFinal, metodo_pago: metodoPagoFinal };
            if (pagosMixtos) payload.pagos_mixtos = pagosMixtos;

            const res = await fetch(`${apiUrl}/pedidos/${modalPago.id}/estado`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });

            if (res.ok) {
                if (!estadoRechazo && !esPostPago && configGlobal?.ticket_impresion_activa) lanzarImpresion(modalPago);
                setModalPago(null);
                setMontoRecibido('');
                await cargarDataDinamica();
            } else {
                const errData = await res.json().catch(() => ({}));
                mostrarAlertaCaja('Error de Servidor', errData.error || 'El backend rechazó el pago. Revisa tu consola.', 'error');
            }
        } catch (error) {
            mostrarAlertaCaja('Error de Red', 'Problema de conexión al procesar el pago.', 'error');
        }
        setIsSubmitting(false);
    };

    // 👇 FIX: Función rediseñada para aceptar un ID único o un Arreglo de IDs (Liquidación Masiva)
    const liquidarPedidoRepartidor = async (pedidoIds) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const idsArray = Array.isArray(pedidoIds) ? pedidoIds : [pedidoIds];
            
            // Ejecutamos las llamadas en paralelo para máxima velocidad
            const promesas = idsArray.map(id => 
                fetch(`${apiUrl}/pedidos/${id}/estado`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado_preparacion: 'Liquidado', metodo_pago: 'Efectivo' })
                })
            );
            
            const results = await Promise.all(promesas);
            const todosOk = results.every(res => res.ok);

            if (todosOk) {
                await cargarDataDinamica();
                mostrarAlertaCaja('Liquidación Exitosa', `Se ha asentado el efectivo de ${idsArray.length} orden(es) en caja.`, 'success');
            } else {
                mostrarAlertaCaja('Error Parcial', 'Algunas órdenes no se pudieron liquidar. Revisa tu red.', 'error');
                await cargarDataDinamica();
            }
        } catch (error) {
            mostrarAlertaCaja('Error de Red', 'Problema de conexión.', 'error');
        }
        setIsSubmitting(false);
    };

    const actualizarEstadoPedido = async (pedidoOId, nuevoEstado, extraData = {}) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        
        const idReal = typeof pedidoOId === 'object' ? pedidoOId.id : pedidoOId;
        const pedidoFull = typeof pedidoOId === 'object' ? pedidoOId : pedidos.find(p => p.id === idReal);

        let estadoSeguro = nuevoEstado;
        if (nuevoEstado === 'Preparando' && (!pedidoFull || !pedidoFull.chef_id)) {
            estadoSeguro = 'Pagado';
        }

        try {
            let payload = { estado_preparacion: estadoSeguro, ...extraData };
            
            if (estadoSeguro === 'Entregado' && pedidoFull?.metodo_pago === 'Por Cobrar') {
                // Mantener 'Por Cobrar' si solo estamos sirviendo a la mesa
            } else if (estadoSeguro === 'Finalizado' && pedidoFull?.metodo_pago === 'Por Cobrar') {
                payload.metodo_pago = 'Efectivo';
            }
            
            await fetch(`${apiUrl}/pedidos/${idReal}/estado`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            await cargarDataDinamica();
        } catch (error) {}
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
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedidoModificado)
            });
            setModalZonaEnvio(null);
            await actualizarEstadoPedido(pedidoModificado.id, 'Pagado');
            await cargarDataDinamica();
        } catch(e) {}
        setIsSubmitting(false);
    };

    const limpiarAlerta = async (id) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await fetch(`${apiUrl}/pedidos/${id}/alerta`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: null })
            });
            await cargarDataDinamica();
        } catch(e) {}
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
            itemReal.extras.push({ nombre: extraObj.nombre, precioExtra: extraObj.precio_extra || extraObj.precioExtra || 0, tipo: 'extra' });
            itemReal.precioFinal = (Number(itemReal.precioFinal) + Number(extraObj.precio_extra || extraObj.precioExtra || 0)).toFixed(2);
            const nuevoTotal = (Number(pedidoOriginal.total) + Number(extraObj.precio_extra || extraObj.precioExtra || 0)).toFixed(2);
            
            await fetch(`${apiUrl}/pedidos/${pedidoOriginal.id}/estado`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ carrito: items, total: nuevoTotal, estado_preparacion: pedidoOriginal.estado_preparacion })
            });
            setModalAgregarExtra(null);
            setAlertaCobroExtra({ orden: pedidoOriginal.numero_pedido, platillo: itemReal.nombre, extra: extraObj.nombre, monto: extraObj.precio_extra || extraObj.precioExtra || 0 });
            await cargarDataDinamica();
        } catch(e) {}
        setIsSubmitting(false);
    };

    const registrarCompraRapida = async (payload) => {
        if (isSubmitting) return; setIsSubmitting(true);
        try {
            await fetch(`${apiUrl}/insumos/${payload.insumo_id}/comprar`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            setInsumoComprar(null);
            setPaquetesComprados('');
            mostrarAlertaCaja("Compra Registrada", "El gasto se ha descontado de la caja", "success");
            await cargarDataDinamica();
        } catch(e) {}
        setIsSubmitting(false);
    };

    const enviarRespuestaCocina = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (isSubmitting) return; setIsSubmitting(true);
        try {
            const items = typeof modalResolver.carrito === 'string' ? JSON.parse(modalResolver.carrito) : modalResolver.carrito;
            let payloadEstado = { carrito: items, estado_preparacion: modalResolver.estado_preparacion };
            let textoRespuesta = 'CAJA RESPONDE: Revisado.';

            if (accionAlerta === 'cancelar') {
                payloadEstado.estado_preparacion = 'Cancelado';
                textoRespuesta = 'CAJA RESPONDE: Se canceló todo el pedido.';
                if (modalResolver.mesa) {
                    const tableObj = mesas.find(m => String(m.numero_mesa) === String(modalResolver.mesa));
                    if (tableObj) {
                        await fetch(`${apiUrl}/mesas/${tableObj.id}/estado`, {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'Libre' })
                        });
                    }
                }
            } else if (accionAlerta === 'quitar') {
                items[itemAfectadoIdx].extras = items[itemAfectadoIdx].extras || [];
                items[itemAfectadoIdx].extras.push({ nombre: `❌ SIN ingrediente faltante`, precioExtra: 0 });
                textoRespuesta = 'CAJA RESPONDE: El cliente aceptó quitarlo.';
            } else if (accionAlerta === 'cambiar') {
                items[itemAfectadoIdx].extras = items[itemAfectadoIdx].extras || [];
                items[itemAfectadoIdx].extras.push({ nombre: `🔄 Cambiar por: ${ingredienteReemplazo}`, precioExtra: 0 });
                textoRespuesta = `CAJA RESPONDE: Cambiar por ${ingredienteReemplazo}.`;
            } else if (accionAlerta === 'aceptar') {
                textoRespuesta = 'CAJA RESPONDE: El cliente aceptó tu propuesta.';
            }

            await fetch(`${apiUrl}/pedidos/${modalResolver.id}/estado`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadEstado)
            });

            await fetch(`${apiUrl}/pedidos/${modalResolver.id}/alerta`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: textoRespuesta })
            });

            setModalResolver(null); setItemAfectadoIdx(''); setAccionAlerta(''); setIngredienteReemplazo('');
            await cargarDataDinamica();
        } catch (error) {}
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
            
            const res = await fetch(`${apiUrl}/pedidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paqueteCompleto) });
            
            if (res.ok) {
                if (pedidoRef && pedidoRef.cliente_id && nuevosDatos.direccion_entrega) {
                    const dirLimpia = nuevosDatos.direccion_entrega.split(' | TEL:')[0].split(' | (Llevar')[0].trim();
                    try {
                        const resCli = await fetch(`${apiUrl}/clientes/${pedidoRef.cliente_id}`);
                        if (resCli.ok) {
                            const cliData = await resCli.json();
                            if (!cliData.direccion || cliData.direccion !== dirLimpia) {
                                await fetch(`${apiUrl}/clientes/${pedidoRef.cliente_id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cliData, direccion: dirLimpia }) });
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

    const abrirIdentificador = () => { 
        setOrdenEditandoRapida(null); 
        setModalPuntoVenta(true); 
    };

    const onGoToKioscoLocal = (cliente, orden) => { 
        setOrdenEditandoRapida(orden); 
        setModalEditarPedido(null); 
        setModalPuntoVenta(true); 
    };

    const forzarLiberacionMesas = async (arrayMesasOcupadas) => {
        setIsSubmitting(true);
        try {
            const promesas = arrayMesasOcupadas.map(m =>
                fetch(`${apiUrl}/mesas/${m.id}/estado`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: 'Libre' })
                })
            );
            await Promise.all(promesas);
            await cargarDataDinamica();
        } catch(e) {}
        setIsSubmitting(false);
    };

    const buscarClienteParaPedido = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/clientes`);
            const clientes = await res.json();
            const clienteEncontrado = clientes.find(c => c.telefono === telClienteNuevo);

            if (clienteEncontrado) {
                setModalIdentificar(false);
                onGoToKioscoLocal(clienteEncontrado, null);
            } else {
                setPasoIdentificar('registro');
            }
        } catch (error) {}
        setIsSubmitting(false);
    };

    const registrarClienteParaPedido = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/clientes/registro`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({telefono: telClienteNuevo, ...datosNuevoCliente}) });
            const data = await res.json();
            if (res.ok) {
                setModalIdentificar(false);
                onGoToKioscoLocal(data.cliente || data.data || data, null);
            }
        } catch (error) {}
        setIsSubmitting(false);
    };

    const pedidosPorConfirmar = pedidos.filter(p => p.estado_preparacion === 'Pendiente' && p.origen !== 'Caja');

    const pendientesDePago = pedidos.filter(p => {
        if (['Cancelado', 'Finalizado'].includes(p.estado_preparacion)) return false;
        if (p.tipo_consumo === 'Domicilio' && ['Listo', 'En Camino', 'Entregado'].includes(p.estado_preparacion)) return false;
        if (p.estado_preparacion === 'Pendiente') return false;

        const noPagado = ['Por Cobrar', 'Pendiente'].includes(p.metodo_pago);
        if (!noPagado) return false;
        
        return true;
    });

    const listosParaEntregar = pedidos.filter(p => p.estado_preparacion === 'Listo');

    const mesasPagadas = pedidos.filter(p =>
        p.tipo_consumo === 'Local' &&
        p.metodo_pago !== 'Comida Personal' &&
        p.estado_preparacion === 'Entregado' &&
        p.estado_preparacion !== 'Cancelado' &&
        p.estado_preparacion !== 'Finalizado'
    );

    const pedidosPorLiquidar = pedidos.filter(p =>
        p.tipo_consumo === 'Domicilio' &&
        (
            p.estado_preparacion === 'En Camino' ||
            (p.estado_preparacion === 'Entregado' && ['Pendiente', 'Por Cobrar'].includes(p.metodo_pago))
        )
    );

    const pedidosConAlerta = pedidos.filter(p => p.alerta_cocina && !['Entregado', 'Cancelado'].includes(p.estado_preparacion));

    return {
        vistaActiva, setVistaActiva, subVistaHistorial, setSubVistaHistorial,
        pedidos, mesas, catalogoIngredientes, configGlobal, insumosDB, gastosDia,
        modalPago, setModalPago, montoRecibido, setMontoRecibido,
        modalResolver, setModalResolver, itemAfectadoIdx, setItemAfectadoIdx,
        accionAlerta, setAccionAlerta, ingredienteReemplazo, setIngredienteReemplazo,
        ticketImprimir, modalZonaEnvio, setModalZonaEnvio,
        modalVerDetalle, setModalVerDetalle, modalEditarPedido, setModalEditarPedido,
        modalCompraRapida, setModalCompraRapida,
        modalMermas, setModalMermas,
        insumoComprar, setInsumoComprar,
        paquetesComprados, setPaquetesComprados, alertaCaja, setAlertaCaja,
        modalAgregarExtra, setModalAgregarExtra, alertaCobroExtra, setAlertaCobroExtra,
        modalIdentificar, setModalIdentificar, pasoIdentificar, setPasoIdentificar,
        telClienteNuevo, setTelClienteNuevo, datosNuevoCliente, setDatosNuevoCliente,
        modalPuntoVenta, setModalPuntoVenta, ordenEditandoRapida, modalComedor, setModalComedor,
        productos, clasificaciones, empleadosPOS,
        isCajaBloqueada, setIsCajaBloqueada, operadorActual, setOperadorActual,
        isSubmitting, fondoCaja, inputFondo, setInputFondo,
        apiUrl, cargarDataDinamica, 
        
        fondosRepartidores, actualizarFondoRepartidor, fondoRepartidorGlobal, liquidarPedidoRepartidor,
        
        modalAsistencia, setModalAsistencia,
        pedidosPorConfirmar, pendientesDePago, listosParaEntregar,
        pedidosPorLiquidar, mesasPagadas, pedidosConAlerta,
        buscarClienteParaPedido, registrarClienteParaPedido,
        toggleEstadoNegocio, cerrarCajaYSalir, iniciarTurno,
        lanzarImpresion, procesarPago, confirmarPedidoRecoger,
        confirmarPedidoDomicilio, actualizarEstadoPedido, guardarEdicionPedido,
        limpiarAlerta, abrirModalResolver, enviarRespuestaCocina,
        registrarCompraRapida, confirmarAgregarExtra, abrirIdentificador,
        onGoToKiosco: onGoToKioscoLocal,
        forzarLiberacionMesas
    };
};