import React, { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';

import MenuPrincipal from './kiosco/MenuPrincipal';
import ModalPersonalizar from './kiosco/ModalPersonalizar';
import CheckoutFlujo from './kiosco/CheckoutFlujo';
import MisPedidos from './kiosco/MisPedidos';
import OfertaUpselling from './kiosco/OfertaUpselling'; 
import ModalArmarCombo from './kiosco/ModalArmarCombo';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const baseUrl = apiUrl.replace('/api', '');

const Kiosco = ({ user, clienteActivo, ordenExterna, onVolverAdmin, onLogout, modoKiosco = 'web', mesaQR = null }) => {

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pedidosOfflinePendientes, setPedidosOfflinePendientes] = useState(0);
  const [estaSincronizando, setEstaSincronizando] = useState(false);

  const [alertaNotificacion, setAlertaNotificacion] = useState(null);
  const [alertaGeneral, setAlertaGeneral] = useState(null); 

  const [productos, setProductos] = useState([]); 
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]); 
  const [clasificaciones, setClasificaciones] = useState([]); 
  const [promocionesActivas, setPromocionesActivas] = useState([]); // 👈 FIX: Memoria global de Promos
  const [configGlobal, setConfigGlobal] = useState({ 
    nombre_negocio: '', whatsapp: '', banco: '', cuenta: '', titular: '', kiosco_mensaje: '¿Qué se te antoja hoy?',
    negocio_abierto: true, mensaje_cierre: '',
    puntos_porcentaje: 10, puntos_valor_peso: 1.00 
  });

  const [carrito, setCarrito] = useState([]); 
  const [pantallaActual, setPantallaActual] = useState('cargando'); 
  const [misPedidos, setMisPedidos] = useState([]);
  const pedidosPreviosRef = useRef([]); 
  
  const [pedidoEditandoId, setPedidoEditandoId] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [esCargaInicial, setEsCargaInicial] = useState(true);
  
  const [tipoConsumo, setTipoConsumo] = useState(null); 
  const [direccionEntrega, setDireccionEntrega] = useState(clienteActivo?.direccion || ''); 
  const [direccionesGuardadas, setDireccionesGuardadas] = useState([]);
  const [numeroPedidoReal, setNumeroPedidoReal] = useState(null); 
  const [contador, setContador] = useState(15); 
  const [errorTransaccion, setErrorTransaccion] = useState('');
  const [metodoPagoFinal, setMetodoPagoFinal] = useState(null);

  const [productoEnEspera, setProductoEnEspera] = useState(null); 
  const [itemAEditar, setItemAEditar] = useState(null);
  const [descuentoPuntosPuntosFisicos, setDescuentoPuntosPuntosFisicos] = useState(0); 
  const [descuentoPuntosDinero, setDescuentoPuntosDinero] = useState(0); 
  const [puntosAplicados, setPuntosAplicados] = useState(0); 
  
  const [modalNip, setModalNip] = useState(false); 
  const [nipInput, setNipInput] = useState(''); 
  const [errorNip, setErrorNip] = useState('');

  const [modalRecuperarNip, setModalRecuperarNip] = useState(false);
  const [correoRecuperacion, setCorreoRecuperacion] = useState('');
  const [isSubmittingRecuperacion, setIsSubmittingRecuperacion] = useState(false);
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState(null);

  const [cuponActivo, setCuponActivo] = useState(null); 
  const [descuentoCuponDinero, setDescuentoCuponDinero] = useState(0); 
  const [promocionVigente, setPromocionVigente] = useState(null);

  const [combosActivos, setCombosActivos] = useState([]);
  const [comboEnEspera, setComboEnEspera] = useState(null);

  const mostrarAlerta = useCallback((mensaje, tipo = 'info') => {
    setAlertaGeneral({ mensaje, tipo });
    setTimeout(() => setAlertaGeneral(null), 4000);
  }, []);

  const checarPedidosOffline = useCallback(() => {
    try {
        const pedidos = JSON.parse(localStorage.getItem('pedidos_offline') || '[]');
        setPedidosOfflinePendientes(pedidos.length);
    } catch(e) {
        setPedidosOfflinePendientes(0);
    }
  }, []);

  useEffect(() => {
    checarPedidosOffline();
  }, [pantallaActual, checarPedidosOffline]); 

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOffline) {
        fetch(`${apiUrl}/combos`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCombosActivos(data.filter(c => c.activo));
                }
            })
            .catch(e => console.error("Error al cargar combos en Kiosco:", e));
            
        // 👇 FIX: Descargamos las promociones para que el modal personalizador no se atore
        fetch(`${apiUrl}/promociones`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setPromocionesActivas(data);
            })
            .catch(e => console.error("Error al cargar promos:", e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline]);

  const fetchCatalogoCompleto = useCallback(() => {
    const estaDisponiblePorHorario = (item) => {
      if (item.disponible === false || item.disponible === 'false' || item.disponible === 0) return false;
      if (item.usa_horario !== true && item.usa_horario !== 'true') return true;

      try {
        const ahora = new Date();
        let diaActual = ahora.getDay();
        diaActual = diaActual === 0 ? 7 : diaActual; 

        let dias = item.dias_disponibles;
        if (typeof dias === 'string') dias = JSON.parse(dias);
        if (!Array.isArray(dias)) return true; 

        if (!dias.includes(diaActual)) return false;

        const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
        const [hIni, mIni] = (item.hora_inicio || '00:00').split(':').map(Number);
        const [hFin, mFin] = (item.hora_fin || '23:59').split(':').map(Number);

        const minIni = hIni * 60 + mIni;
        const minFin = hFin * 60 + mFin;

        if (minIni <= minFin) {
            if (minutosActuales < minIni || minutosActuales > minFin) return false;
        } else {
            if (minutosActuales < minIni && minutosActuales > minFin) return false;
        }
        return true;
      } catch (e) {
        return true; 
      }
    };

    fetch(`${apiUrl}/productos`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setProductos(arr.filter(estaDisponiblePorHorario));
      })
      .catch(console.error); 

    fetch(`${apiUrl}/clasificaciones`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setClasificaciones(arr.filter(estaDisponiblePorHorario));
      })
      .catch(console.error);
  }, []); 

  useEffect(() => { 
    fetchCatalogoCompleto();
      
    fetch(`${apiUrl}/ingredientes`).then(r => r.json()).then(data => setCatalogoIngredientes(Array.isArray(data) ? data : [])).catch(console.error);
    
    const fetchConfig = () => {
      if (!navigator.onLine) return; 
      fetch(`${apiUrl}/configuracion?t=${new Date().getTime()}`)
        .then(r => r.json())
        .then(data => { if(data && !data.error) setConfigGlobal(data); })
        .catch(console.error);
    };
    
    fetchConfig(); 
    
    const intervalCatalog = setInterval(fetchCatalogoCompleto, 60000); 
    const intervalConfig = setInterval(fetchConfig, 5000); 
    
    return () => {
        clearInterval(intervalConfig);
        clearInterval(intervalCatalog);
    };
  }, [fetchCatalogoCompleto]);

  const verificarMisPedidos = useCallback(async (isInitial = false) => {
    if (!clienteActivo || ordenExterna || !navigator.onLine) return;
    try { 
      const r = await fetch(`${apiUrl}/clientes/${clienteActivo.id}/pedidos?t=${new Date().getTime()}`); 
      const data = await r.json(); 
      const nuevosPedidos = Array.isArray(data) ? data : [];
      
      if (!isInitial && pedidosPreviosRef.current.length > 0) {
          nuevosPedidos.forEach(pedidoNuevo => {
              const pedidoViejo = pedidosPreviosRef.current.find(p => p.id === pedidoNuevo.id);
              if (pedidoViejo && pedidoViejo.estado_preparacion !== pedidoNuevo.estado_preparacion) {
                  let msj = ''; let emj = '';
                  if (pedidoNuevo.estado_preparacion === 'Preparando') { msj = '¡Tu pedido ya está en la cocina!'; emj = '🔥'; }
                  else if (pedidoNuevo.estado_preparacion === 'Listo') { msj = '¡Tu pedido está listo!'; emj = '✅'; }
                  else if (pedidoNuevo.estado_preparacion === 'En Camino') { msj = '¡Tu pedido va en camino!'; emj = '🛵'; }
                  else if (pedidoNuevo.estado_preparacion === 'Entregado') { msj = '¡Pedido entregado! Disfrútalo.'; emj = '🍔'; }
                  
                  if (msj) {
                      setAlertaNotificacion({ mensaje: msj, emoji: emj, orden: pedidoNuevo.numero_pedido });
                      setTimeout(() => setAlertaNotificacion(null), 5000);
                      try { new Audio('/campana.mp3').play().catch(()=>{}); } catch(e){}
                  }
              }
          });
      }

      pedidosPreviosRef.current = nuevosPedidos;
      setMisPedidos(nuevosPedidos); 

      if (esCargaInicial) { 
        setPantallaActual('menu'); 
        setEsCargaInicial(false);
      } 
    } catch (error) {}
  }, [clienteActivo, ordenExterna, esCargaInicial]); 

  useEffect(() => {
    if (!baseUrl || isOffline) return;
    const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
    
    socket.on('catalogo_actualizado', () => fetchCatalogoCompleto());
    socket.on('nuevo_pedido', () => fetchCatalogoCompleto());
    socket.on('pedido_actualizado', () => {
        fetchCatalogoCompleto();
        if (clienteActivo) verificarMisPedidos(false);
    });
    
    return () => socket.disconnect();
  }, [fetchCatalogoCompleto, isOffline, clienteActivo, verificarMisPedidos]);

  useEffect(() => {
    if (clienteActivo && clienteActivo.id) {
      const saved = JSON.parse(localStorage.getItem(`direcciones_${clienteActivo.id}`) || '[]');
      setDireccionesGuardadas(saved);
      if (saved.length > 0 && !direccionEntrega) setDireccionEntrega(saved[0]);
    }
  }, [clienteActivo, direccionEntrega]);

  const modificarPedido = useCallback((pedido) => { 
    const carritoAgrupado = [];
    let carObj = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : (pedido.carrito || []);

    carObj.forEach(item => {
        const getExtrasStr = (extras) => (extras||[]).map(e => e.nombre).sort().join('|');
        const extStr = getExtrasStr(item.extras);
        const existente = carritoAgrupado.find(i => i.id === item.id && getExtrasStr(i.extras) === extStr && i.precioFinal === item.precioFinal);
        
        if (existente) existente.cantidad = (existente.cantidad || 1) + 1;
        else carritoAgrupado.push({ ...item, cantidad: 1, idTicket: Math.random() });
    });

    setCarrito(carritoAgrupado); 
    setTipoConsumo(pedido.tipo_consumo); 
    setDireccionEntrega(pedido.direccion_entrega || ''); 
    setPedidoEditandoId(pedido.id); 
    
    if (pedido.descuento_puntos && Number(pedido.descuento_puntos) > 0) {
      const ptsGuardados = Number(pedido.descuento_puntos);
      setDescuentoPuntosPuntosFisicos(ptsGuardados);
      setPuntosAplicados(ptsGuardados); 
      const valorPeso = configGlobal.puntos_valor_peso || 1;
      setDescuentoPuntosDinero(ptsGuardados * valorPeso);
    }
    
    setPantallaActual('menu'); 
  }, [configGlobal.puntos_valor_peso]);

  useEffect(() => { if (ordenExterna) modificarPedido(ordenExterna); }, [ordenExterna, modificarPedido]);

  useEffect(() => {
    let intervaloPedidos;
    if (clienteActivo && !ordenExterna) { 
      verificarMisPedidos(true); 
      intervaloPedidos = setInterval(() => verificarMisPedidos(false), 5000); 
    } else if (!ordenExterna) { 
      setPantallaActual('menu'); 
    }
    return () => clearInterval(intervaloPedidos);
  }, [clienteActivo, ordenExterna, verificarMisPedidos]);

  const reiniciarKiosco = useCallback(() => {
    if(user && user.rol === 'cajero') { 
      setCarrito([]); setTipoConsumo(null); setDireccionEntrega(''); setNumeroPedidoReal(null); setMetodoPagoFinal(null); 
      setErrorTransaccion(''); setPedidoEditandoId(null); 
      setDescuentoPuntosPuntosFisicos(0); setDescuentoPuntosDinero(0); 
      setPuntosAplicados(0); 
      setCuponActivo(null); setDescuentoCuponDinero(0);
      setComboEnEspera(null);

      if (ordenExterna && onVolverAdmin) onVolverAdmin(); else setPantallaActual('menu'); 
    } else { 
      if (modoKiosco === 'mesa' || mesaQR) {
          window.location.reload();
      } else {
          setTimeout(() => { if (onLogout) onLogout(); }, 50); 
      }
    }
  }, [user, ordenExterna, onVolverAdmin, onLogout, mesaQR, modoKiosco]);

  useEffect(() => { 
    let timer; 
    if (pantallaActual === 'finalizado') { 
      if (contador > 0) timer = setTimeout(() => setContador(c => c - 1), 1000); 
      else reiniciarKiosco(); 
    } 
    return () => clearTimeout(timer); 
  }, [pantallaActual, contador, reiniciarKiosco]);

  const calcularSubtotal = useCallback(() => {
    return carrito.reduce((t, i) => t + ((i.precioFinal || 0) * (i.cantidad || 1)), 0);
  }, [carrito]);

  const calcularSubtotalCanjeable = useCallback(() => {
    return carrito.reduce((t, item) => {
        const prodDB = (productos || []).find(p => p.nombre === item.nombre || p.id === item.id);
        if (prodDB && (prodDB.permite_canje === false || prodDB.permite_canje === 'false')) return t;
        
        const catNombre = prodDB?.categoria || item.categoria;
        const catDB = (clasificaciones || []).find(c => c.nombre === catNombre);
        if (catDB && (catDB.permite_canje === false || catDB.permite_canje === 'false')) return t;

        return t + ((item.precioFinal || 0) * (item.cantidad || 1));
    }, 0);
  }, [carrito, productos, clasificaciones]);
  
  useEffect(() => {
    const subtotal = calcularSubtotal();
    const subtotalCanjeable = calcularSubtotalCanjeable(); 
    
    let dCup = 0;
    if (cuponActivo) {
        if (cuponActivo.tipo === 'porcentaje') {
            dCup = subtotal * (Number(cuponActivo.valor) / 100);
        } else {
            dCup = Number(cuponActivo.valor);
        }
        if (dCup > subtotal) dCup = subtotal; 
    }
    setDescuentoCuponDinero(dCup);

    let dPts = 0;
    let ptsFisicosReales = 0; 
    if (descuentoPuntosPuntosFisicos > 0) {
        const valorPeso = Number(configGlobal.puntos_valor_peso) || 1;
        dPts = descuentoPuntosPuntosFisicos * valorPeso;
        
        const limiteCanje = Math.min(subtotalCanjeable, subtotal - dCup);
        
        if (dPts > limiteCanje) {
            dPts = limiteCanje;
        }
        
        ptsFisicosReales = parseFloat((dPts / valorPeso).toFixed(2));
    }
    
    setDescuentoPuntosDinero(dPts);
    setPuntosAplicados(ptsFisicosReales); 

  }, [carrito, cuponActivo, descuentoPuntosPuntosFisicos, configGlobal.puntos_valor_peso, calcularSubtotal, calcularSubtotalCanjeable]);

  const calcularTotal = useCallback(() => {
     const subtotal = calcularSubtotal();
     const totalFinal = subtotal - descuentoCuponDinero - descuentoPuntosDinero;
     return Math.max(0, totalFinal);
  }, [calcularSubtotal, descuentoCuponDinero, descuentoPuntosDinero]);
  
  const verificarNip = async (e) => { 
    e.preventDefault(); setErrorNip(''); 
    if (!clienteActivo || !clienteActivo.id) return setErrorNip('No hay cliente activo.'); 
    if (clienteActivo.puntos <= 0) return setErrorNip('No tienes puntos disponibles.');

    if (isOffline) {
        return setErrorNip('No se pueden canjear puntos sin Internet.');
    }

    try { 
      const res = await fetch(`${apiUrl}/clientes/verificar-nip`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ cliente_id: clienteActivo.id, nip: nipInput }) 
      }); 
      
      if (res.ok) { 
          setDescuentoPuntosPuntosFisicos(clienteActivo.puntos); 
          setModalNip(false); 
          setNipInput('');
      } else { 
          setErrorNip('NIP Incorrecto. Intenta de nuevo.'); 
      } 
    } catch (err) { setErrorNip('Error al verificar NIP'); } 
  };

  const solicitarRecuperacionNip = async (e) => {
    e.preventDefault();
    setMensajeRecuperacion(null);
    setIsSubmittingRecuperacion(true);

    try {
        const res = await fetch(`${apiUrl}/clientes/recuperar-nip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cliente_id: clienteActivo.id, correo: correoRecuperacion })
        });
        const data = await res.json();

        if (res.ok) {
            setMensajeRecuperacion({ tipo: 'success', texto: '¡Listo! Te hemos enviado un correo con tu NIP y hemos asociado el correo a tu cuenta.' });
            setTimeout(() => {
                setModalRecuperarNip(false);
                setCorreoRecuperacion('');
                setMensajeRecuperacion(null);
                setModalNip(true); 
            }, 4000);
        } else {
            setMensajeRecuperacion({ tipo: 'error', texto: data.error || 'Ocurrió un error al solicitar la recuperación.' });
        }
    } catch (error) {
        setMensajeRecuperacion({ tipo: 'error', texto: 'Fallo de conexión. Revisa tu internet.' });
    }
    setIsSubmittingRecuperacion(false);
  };

  const sincronizarPedidosOffline = async () => {
    if (isOffline || estaSincronizando) return;
    
    setEstaSincronizando(true);
    try {
       const pedidos = JSON.parse(localStorage.getItem('pedidos_offline') || '[]');
       if (pedidos.length === 0) {
           setEstaSincronizando(false);
           return;
       }

       let exitos = 0;
       for (let i = 0; i < pedidos.length; i++) {
           const pedido = pedidos[i];
           const payloadSincronizacion = {
               ...pedido,
               estado_preparacion: 'Sincronizado Offline'
           };

           delete payloadSincronizacion.es_offline;
           delete payloadSincronizacion.numero_pedido_offline;
           delete payloadSincronizacion.fecha_guardado_local;

           const res = await fetch(`${apiUrl}/pedidos`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(payloadSincronizacion)
           });

           if (res.ok) {
               exitos++;
           } else {
               console.error('Error al sincronizar el pedido:', pedido.numero_pedido_offline);
           }
       }

       if (exitos === pedidos.length) {
           localStorage.removeItem('pedidos_offline');
       }
       checarPedidosOffline();
       mostrarAlerta(`¡Se sincronizaron ${exitos} pedidos correctamente con la base de datos!`, 'success');
       
    } catch (e) {
       console.error("Fallo general de sincronización", e);
       mostrarAlerta("Ocurrió un error al intentar sincronizar. Se volverá a intentar.", 'error');
    }
    setEstaSincronizando(false);
  };

  // 👇 FIX 1: DEEP CLONE AL ACEPTAR EL UPSELLING (Evita contaminar el catálogo)
  const agregarUpsellAlCarrito = (itemsQueue) => {
    if (itemsQueue && itemsQueue.length > 0) {
        const cleanQueue = itemsQueue.map(item => JSON.parse(JSON.stringify(item)));
        setProductoEnEspera(cleanQueue);
    }
    setPromocionVigente(null); 
  };

  const guardarEdicionDirecta = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const carritoExpandido = [];
    carrito.forEach(item => {
        const qty = item.cantidad || 1;
        for(let i = 0; i < qty; i++) {
            carritoExpandido.push({...item, cantidad: 1, idTicket: item.idTicket + '_' + i});
        }
    });

    const ordenOriginal = ordenExterna || misPedidos.find(p => p.id === pedidoEditandoId) || {};

    const paquete = {
      cliente_id: clienteActivo ? clienteActivo.id : ordenOriginal.cliente_id,
      tipo_consumo: tipoConsumo || ordenOriginal.tipo_consumo,
      metodo_pago: metodoPagoFinal || ordenOriginal.metodo_pago,
      origen: ordenOriginal.origen || 'Kiosco',
      direccion_entrega: direccionEntrega || ordenOriginal.direccion_entrega,
      estado_preparacion: ordenOriginal.estado_preparacion || 'Pendiente',
      mesa: mesaQR || ordenOriginal.mesa,
      
      carrito: carritoExpandido,
      total: calcularTotal(),
      descuento_puntos: puntosAplicados, 
      cupon_codigo: cuponActivo && descuentoCuponDinero > 0 ? cuponActivo.codigo : ordenOriginal.cupon_codigo
    };

    try {
      const res = await fetch(`${apiUrl}/pedidos/${pedidoEditandoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paquete)
      });

      if (res.ok) {
         reiniciarKiosco(); 
      } else {
         mostrarAlerta("Error al actualizar la orden en el servidor.", 'error');
      }
    } catch(e) {
       mostrarAlerta("Error de red. Asegúrate de tener conexión.", 'error');
    }
    setIsSubmitting(false);
  };

  const bloqueoPuntosActivo = carrito.length > 0 && calcularSubtotalCanjeable() === 0;

  const nombresClasificacionesActivas = clasificaciones.map(c => c.nombre);
  const productosDisponiblesMenu = productos.filter(p => {
      const catName = p.categoria || 'General';
      return catName === 'General' || nombresClasificacionesActivas.includes(catName);
  });

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans p-4 md:p-8 relative overflow-x-hidden">
      
      {alertaGeneral && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[9999] animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
            <div className={`bg-white border-2 ${alertaGeneral.tipo === 'error' ? 'border-red-500' : 'border-emerald-500'} rounded-full shadow-2xl px-8 py-4 flex items-center gap-4`}>
                <span className="text-3xl">{alertaGeneral.tipo === 'error' ? '🚨' : '✅'}</span>
                <div>
                    <p className={`font-black tracking-tight text-lg ${alertaGeneral.tipo === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {alertaGeneral.mensaje}
                    </p>
                </div>
            </div>
        </div>
      )}

      {alertaNotificacion && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[9999] animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-white border-2 border-emerald-500 rounded-full shadow-2xl px-8 py-4 flex items-center gap-4">
                <span className="text-4xl animate-bounce">{alertaNotificacion.emoji}</span>
                <div>
                    <p className="font-black text-slate-800 tracking-tight text-lg">Orden #{alertaNotificacion.orden}</p>
                    <p className="font-bold text-emerald-600">{alertaNotificacion.mensaje}</p>
                </div>
            </div>
        </div>
      )}

      {isOffline && (
        <div className="bg-red-500 text-white text-center py-3 px-4 rounded-2xl mb-6 font-black flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg shadow-red-500/30">
          <span className="animate-pulse text-2xl">🔴</span> 
          <div>
              <p className="text-lg">MODO OFFLINE ACTIVO</p>
              <p className="text-xs font-medium uppercase tracking-widest opacity-90">Los pedidos se guardarán en esta computadora temporalmente.</p>
          </div>
        </div>
      )}

      {!isOffline && pedidosOfflinePendientes > 0 && (
        <div className="bg-emerald-500 text-white py-4 px-6 rounded-2xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 shadow-xl shadow-emerald-500/30">
          <div className="flex items-center gap-3">
              <span className="text-3xl">🔄</span> 
              <div>
                  <p className="text-lg font-black tracking-tight">¡Conexión Restaurada!</p>
                  <p className="text-sm font-medium">Tienes <strong>{pedidosOfflinePendientes} pedido(s)</strong> en la libreta listos para enviarse a la base de datos.</p>
              </div>
          </div>
          <button onClick={sincronizarPedidosOffline} disabled={estaSincronizando} className="bg-slate-900 text-white font-black px-6 py-3 rounded-xl shadow-sm hover:bg-slate-800 active:scale-95 transition-all w-full md:w-auto disabled:opacity-50">
             {estaSincronizando ? 'Sincronizando...' : 'Sincronizar Ahora'}
          </button>
        </div>
      )}

      <div className="flex justify-between items-start mb-8">
        <div className="flex gap-4">
            {clienteActivo && !ordenExterna ? ( 
            <div className="bg-white px-6 py-3 rounded-full shadow-sm border flex items-center gap-4">
                <span className="text-xl">👋</span>
                <div>
                <p className="text-sm text-slate-500 font-bold leading-tight">Hola, {clienteActivo.nombre}</p>
                <p className="text-blue-600 font-black tracking-tight">
                    {clienteActivo.puntos} Puntos 
                    <span className="text-[10px] text-slate-400 font-medium ml-1">(${ (clienteActivo.puntos * (configGlobal.puntos_valor_peso || 1)).toFixed(2) })</span>
                </p>
                </div>
                
                <div className="flex gap-2 ml-4 pl-4 border-l border-slate-100">
                  {pantallaActual === 'menu' && (
                      <button onClick={() => setPantallaActual('mis_pedidos')} className="text-xs font-black bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-100 transition active:scale-95">
                          👤 Mi Perfil
                      </button>
                  )}
                  {pantallaActual === 'mis_pedidos' && (
                      <button onClick={() => setPantallaActual('menu')} className="text-xs font-black bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-100 transition active:scale-95">
                          🍔 Ver Menú
                      </button>
                  )}
                  <button onClick={() => setTimeout(() => onLogout(), 50)} className="text-xs font-bold bg-slate-100 px-4 py-2 rounded-xl hover:bg-red-100 hover:text-red-600 transition active:scale-95">Salir</button>
                </div>
            </div> 
            ) : ( 
            <div className="bg-white px-6 py-3 rounded-full shadow-sm border"><p className="text-sm font-bold text-slate-400">{ordenExterna ? `Editando orden` : 'Invitado'}</p></div> 
            )}

            {mesaQR && (
               <div className="bg-indigo-600 text-white px-6 py-3 rounded-full shadow-sm font-black flex items-center gap-2">📍 MESA {mesaQR}</div>
            )}
        </div>

        {user?.rol === 'admin' && !ordenExterna && <button onClick={onVolverAdmin} className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold shadow-xl hover:bg-slate-800 transition">⬅ Panel Admin</button>}
        {user?.rol === 'cajero' && !ordenExterna && <button onClick={onVolverAdmin} className="bg-emerald-500 text-slate-900 px-6 py-3 rounded-full font-black shadow-xl hover:bg-emerald-400 transition">⬅ Volver a Caja</button>}
      </div>

      {errorTransaccion && ( <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 shadow-sm"><p className="font-bold">🚨 {errorTransaccion}</p></div> )}

      {pantallaActual === 'mis_pedidos' && (
        <MisPedidos misPedidos={misPedidos} setPantallaActual={setPantallaActual} modificarPedido={modificarPedido} clienteActivo={clienteActivo} apiUrl={apiUrl} configGlobal={configGlobal} />
      )}

      {pantallaActual === 'menu' && (
        <MenuPrincipal 
          configGlobal={configGlobal} productos={productosDisponiblesMenu} clasificaciones={clasificaciones} 
          carrito={carrito} setCarrito={setCarrito} baseUrl={baseUrl} 
          setPantallaActual={setPantallaActual} pedidoEditandoId={pedidoEditandoId} 
          clienteActivo={clienteActivo} setModalNip={setModalNip} 
          calcularTotal={calcularTotal} calcularSubtotal={calcularSubtotal}
          setProductoEnEspera={setProductoEnEspera} setItemAEditar={setItemAEditar}
          descuentoPuntosDinero={descuentoPuntosDinero} descuentoPuntosPuntosFisicos={descuentoPuntosPuntosFisicos}
          setDescuentoPuntosPuntosFisicos={setDescuentoPuntosPuntosFisicos} cuponActivo={cuponActivo}
          setCuponActivo={setCuponActivo} descuentoCuponDinero={descuentoCuponDinero} apiUrl={apiUrl} mesaQR={mesaQR} isOffline={isOffline} 
          setPromocionVigente={setPromocionVigente}
          guardarEdicionDirecta={guardarEdicionDirecta} 
          isSubmitting={isSubmitting} 
          modoKiosco={modoKiosco}
          bloqueoPuntosActivo={bloqueoPuntosActivo}
          setComboEnEspera={setComboEnEspera}
          combosActivos={combosActivos}
        />
      )}

      {['consumo', 'pedir_nombre', 'asignar_mesa', 'aviso_domicilio', 'direccion', 'pago', 'cambio_efectivo_domicilio', 'detalles_transferencia', 'finalizado'].includes(pantallaActual) && (
        <CheckoutFlujo 
          pantallaActual={pantallaActual} setPantallaActual={setPantallaActual}
          tipoConsumo={tipoConsumo} setTipoConsumo={setTipoConsumo}
          direccionEntrega={direccionEntrega} setDireccionEntrega={setDireccionEntrega}
          direccionesGuardadas={direccionesGuardadas} setDireccionesGuardadas={setDireccionesGuardadas}
          carrito={carrito} calcularTotal={calcularTotal} setCarrito={setCarrito} productos={productos}
          descuentoPuntos={puntosAplicados} 
          cuponActivo={cuponActivo} descuentoCuponDinero={descuentoCuponDinero}
          clienteActivo={clienteActivo} ordenExterna={ordenExterna} user={user}
          pedidoEditandoId={pedidoEditandoId} apiUrl={apiUrl} configGlobal={configGlobal}
          setErrorTransaccion={setErrorTransaccion} setMetodoPagoFinal={setMetodoPagoFinal}
          numeroPedidoReal={numeroPedidoReal} setNumeroPedidoReal={setNumeroPedidoReal}
          contador={contador} setContador={setContador} reiniciarKiosco={reiniciarKiosco}
          metodoPagoFinal={metodoPagoFinal} mesaQR={mesaQR} isOffline={isOffline} 
          modoKiosco={modoKiosco}
          bloqueoPuntosActivo={bloqueoPuntosActivo}
        />
      )}

      {modalNip && ( 
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in">
          <form onSubmit={verificarNip} className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl text-center animate-in zoom-in-95">
            <span className="text-6xl mb-4 block">🎁</span>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Seguridad de Puntos</h2>
            <p className="text-slate-500 font-medium mb-6">Ingresa tu NIP para usar tus <strong className="text-blue-600">{clienteActivo?.puntos || 0} pts</strong>.</p>
            <input type="password" maxLength="4" required value={nipInput} onChange={e => setNipInput(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-center text-3xl font-black tracking-[1em] outline-none focus:border-blue-500 mb-2 text-slate-800" placeholder="••••" />
            
            <button type="button" onClick={() => { setModalNip(false); setModalRecuperarNip(true); }} className="text-blue-500 hover:text-blue-700 text-xs font-bold underline mb-6 block w-full transition">¿Olvidaste tu NIP?</button>
            
            {errorNip && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded-xl mb-4 border border-red-100">{errorNip}</p>}
            <div className="flex gap-4">
              <button type="button" onClick={() => { setModalNip(false); setNipInput(''); setErrorNip(''); }} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200">Cancelar</button>
              <button type="submit" disabled={nipInput.length !== 4 || isOffline} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl disabled:opacity-50 hover:bg-blue-700 transition">Canjear</button>
            </div>
          </form>
        </div> 
      )}

      {modalRecuperarNip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in">
          <form onSubmit={solicitarRecuperacionNip} className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl text-center animate-in zoom-in-95">
            <div className="bg-blue-50 text-blue-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <span className="text-4xl">📧</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Recuperar NIP</h2>
            <p className="text-slate-500 font-medium mb-6 text-sm leading-relaxed">
              Ingresa tu correo electrónico. Lo asociaremos a tu cuenta y te enviaremos tu NIP de seguridad para que puedas usar tus puntos.
            </p>

            {mensajeRecuperacion && (
              <div className={`p-4 rounded-xl mb-6 text-sm font-bold border ${mensajeRecuperacion.tipo === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {mensajeRecuperacion.texto}
              </div>
            )}

            {(!mensajeRecuperacion || mensajeRecuperacion.tipo === 'error') && (
              <>
                <input
                  type="email"
                  required
                  value={correoRecuperacion}
                  onChange={e => setCorreoRecuperacion(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-center text-lg font-bold outline-none focus:border-blue-500 mb-6 text-slate-800"
                  placeholder="tu@correo.com"
                  disabled={isSubmittingRecuperacion}
                />
                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={isSubmittingRecuperacion || !correoRecuperacion || isOffline}
                    className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl disabled:opacity-50 hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-500/30"
                  >
                    {isSubmittingRecuperacion ? 'Enviando...' : 'Enviar NIP al correo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModalRecuperarNip(false); setCorreoRecuperacion(''); setMensajeRecuperacion(null); setModalNip(true); }}
                    className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition"
                    disabled={isSubmittingRecuperacion}
                  >
                    Volver
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
      
      {/* 👇 FIX DEFINITIVO: KEY ESTABLE PARA EVITAR REINICIOS DEL MODAL EN KIOSCO */}
      {productoEnEspera && (
        <ModalPersonalizar
          key={`modal-personalizar-${productoEnEspera[0]?.idTicket || productoEnEspera[0]?.id || 'item-activo'}`}
          productoEnEspera={productoEnEspera} setProductoEnEspera={setProductoEnEspera}
          itemAEditar={itemAEditar} setItemAEditar={setItemAEditar}
          carrito={carrito} setCarrito={setCarrito}
          catalogoIngredientes={catalogoIngredientes} clasificaciones={clasificaciones}
          configGlobal={configGlobal}
          promocionesActivas={promocionesActivas}
          setPromocionVigente={setPromocionVigente}
          setComboEnEspera={setComboEnEspera}
        />
      )}

      {comboEnEspera && (
        <ModalArmarCombo
          comboEnEspera={comboEnEspera} 
          setComboEnEspera={setComboEnEspera}
          carrito={carrito} 
          setCarrito={setCarrito}
          productos={productos} 
          clasificaciones={clasificaciones}
          baseUrl={baseUrl}
          setItemAEditar={setItemAEditar}
          catalogoIngredientes={catalogoIngredientes}
          configGlobal={configGlobal}                 
        />
      )} 

      <OfertaUpselling 
        promocionVigente={promocionVigente} 
        setPromocionVigente={setPromocionVigente} 
        agregarUpsellAlCarrito={agregarUpsellAlCarrito} 
        apiUrl={apiUrl} 
        productos={productos}
        clasificaciones={clasificaciones} 
      />

    </div>
  );
};

export default Kiosco;