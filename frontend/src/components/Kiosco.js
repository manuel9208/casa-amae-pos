import React, { useState, useEffect, useCallback } from 'react';
import MenuPrincipal from './kiosco/MenuPrincipal';
import ModalPersonalizar from './kiosco/ModalPersonalizar';
import CheckoutFlujo from './kiosco/CheckoutFlujo';
import MisPedidos from './kiosco/MisPedidos';
import useMesaQR from './kiosco/useMesaQR'; 

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const baseUrl = apiUrl.replace('/api', '');

const Kiosco = ({ user, clienteActivo, ordenExterna, onVolverAdmin, onLogout }) => {
  const mesaQR = useMesaQR();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pedidosOfflinePendientes, setPedidosOfflinePendientes] = useState(0);
  const [estaSincronizando, setEstaSincronizando] = useState(false);

  // === 1. DATOS GLOBALES ===
  const [productos, setProductos] = useState([]); 
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]); 
  const [clasificaciones, setClasificaciones] = useState([]); 
  const [configGlobal, setConfigGlobal] = useState({ 
    nombre_negocio: '', whatsapp: '', banco: '', cuenta: '', titular: '', kiosco_mensaje: '¿Qué se te antoja hoy?',
    negocio_abierto: true, mensaje_cierre: '',
    puntos_porcentaje: 10, puntos_valor_peso: 1.00 
  });

  // === 2. ESTADO DEL PEDIDO Y NAVEGACIÓN ===
  const [carrito, setCarrito] = useState([]); 
  const [pantallaActual, setPantallaActual] = useState('cargando'); 
  const [misPedidos, setMisPedidos] = useState([]);
  const [pedidoEditandoId, setPedidoEditandoId] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  // === 3. ESTADOS DE CHECKOUT ===
  const [tipoConsumo, setTipoConsumo] = useState(null); 
  const [direccionEntrega, setDireccionEntrega] = useState(clienteActivo?.direccion || ''); 
  const [direccionesGuardadas, setDireccionesGuardadas] = useState([]);
  const [numeroPedidoReal, setNumeroPedidoReal] = useState(null); 
  const [contador, setContador] = useState(15); 
  const [errorTransaccion, setErrorTransaccion] = useState('');
  const [metodoPagoFinal, setMetodoPagoFinal] = useState(null);

  // === 4. ESTADOS DE MODALES, PUNTOS Y CUPONES ===
  const [productoEnEspera, setProductoEnEspera] = useState(null); 
  const [itemAEditar, setItemAEditar] = useState(null);
  const [descuentoPuntosPuntosFisicos, setDescuentoPuntosPuntosFisicos] = useState(0); 
  const [descuentoPuntosDinero, setDescuentoPuntosDinero] = useState(0); 
  const [modalNip, setModalNip] = useState(false); 
  const [nipInput, setNipInput] = useState(''); 
  const [errorNip, setErrorNip] = useState('');

  const [cuponActivo, setCuponActivo] = useState(null); 
  const [descuentoCuponDinero, setDescuentoCuponDinero] = useState(0); 
  const [promocionVigente, setPromocionVigente] = useState(null);

  const checarPedidosOffline = () => {
    try {
        const pedidos = JSON.parse(localStorage.getItem('pedidos_offline') || '[]');
        setPedidosOfflinePendientes(pedidos.length);
    } catch(e) {
        setPedidosOfflinePendientes(0);
    }
  };

  useEffect(() => {
    checarPedidosOffline();
  }, [pantallaActual]); 

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
    fetch(`${apiUrl}/productos`)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setProductos(arr.filter(p => p.disponible !== false && p.disponible !== 'false' && p.disponible !== 0));
      })
      .catch(console.error); 
      
    fetch(`${apiUrl}/ingredientes`).then(r => r.json()).then(data => setCatalogoIngredientes(Array.isArray(data) ? data : [])).catch(console.error);
    fetch(`${apiUrl}/clasificaciones`).then(r => r.json()).then(data => setClasificaciones(Array.isArray(data) ? data : [])).catch(console.error);
    
    const fetchConfig = () => {
      if (!navigator.onLine) return; 
      fetch(`${apiUrl}/configuracion?t=${new Date().getTime()}`)
        .then(r => r.json())
        .then(data => { if(data && !data.error) setConfigGlobal(data); })
        .catch(console.error);
    };
    
    fetchConfig(); 
    const intervalConfig = setInterval(fetchConfig, 5000); 
    return () => clearInterval(intervalConfig);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (clienteActivo && clienteActivo.id) {
      const saved = JSON.parse(localStorage.getItem(`direcciones_${clienteActivo.id}`) || '[]');
      setDireccionesGuardadas(saved);
      if (saved.length > 0 && !direccionEntrega) setDireccionEntrega(saved[0]);
    }
  }, [clienteActivo, direccionEntrega]);

  const modificarPedido = useCallback((pedido) => { 
    const carritoAgrupado = [];
    pedido.carrito.forEach(item => {
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
      setDescuentoPuntosPuntosFisicos(Number(pedido.descuento_puntos));
      const valorPeso = configGlobal.puntos_valor_peso || 1;
      setDescuentoPuntosDinero(Number(pedido.descuento_puntos) * valorPeso);
    }
    
    setPantallaActual('menu'); 
  }, [configGlobal.puntos_valor_peso]);

  useEffect(() => { if (ordenExterna) modificarPedido(ordenExterna); }, [ordenExterna, modificarPedido]);

  useEffect(() => {
    let intervaloPedidos;
    const verificarMisPedidos = async (esCargaInicial = false) => {
      if (!clienteActivo || ordenExterna || !navigator.onLine) return;
      try { 
        const r = await fetch(`${apiUrl}/clientes/${clienteActivo.id}/pedidos?t=${new Date().getTime()}`); 
        const data = await r.json(); 
        setMisPedidos(Array.isArray(data) ? data : []); 
        if (esCargaInicial) { 
          if (data && data.length > 0) setPantallaActual('mis_pedidos'); 
          else setPantallaActual('menu'); 
        } 
      } catch (error) {}
    };
    if (clienteActivo && !ordenExterna) { 
      verificarMisPedidos(true); 
      intervaloPedidos = setInterval(() => verificarMisPedidos(false), 5000); 
    } else if (!ordenExterna) { 
      setPantallaActual('menu'); 
    }
    return () => clearInterval(intervaloPedidos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteActivo, ordenExterna]);

  const reiniciarKiosco = useCallback(() => {
    if(user && user.rol === 'cajero') { 
      setCarrito([]); setTipoConsumo(null); setDireccionEntrega(''); setNumeroPedidoReal(null); setMetodoPagoFinal(null); 
      setErrorTransaccion(''); setPedidoEditandoId(null); 
      setDescuentoPuntosPuntosFisicos(0); setDescuentoPuntosDinero(0); 
      setCuponActivo(null); setDescuentoCuponDinero(0);
      
      // 👇 Retornar a la Caja en lugar de cerrar sesión
      if (ordenExterna && onVolverAdmin) onVolverAdmin(); else setPantallaActual('menu'); 
    } else { 
      if (mesaQR) {
          window.location.reload();
      } else {
          setTimeout(() => { if (onLogout) onLogout(); }, 50); 
      }
    }
  }, [user, ordenExterna, onVolverAdmin, onLogout, mesaQR]);

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
  
  useEffect(() => {
    const subtotal = calcularSubtotal();
    
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
    if (descuentoPuntosPuntosFisicos > 0) {
        const valorPeso = Number(configGlobal.puntos_valor_peso) || 1;
        dPts = descuentoPuntosPuntosFisicos * valorPeso;
        if (dPts > (subtotal - dCup)) {
            dPts = subtotal - dCup;
        }
    }
    setDescuentoPuntosDinero(dPts);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrito, cuponActivo, descuentoPuntosPuntosFisicos, configGlobal.puntos_valor_peso]);

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

  const sincronizarPedidosOffline = async () => {
    if (isOffline || estaSincronizando) return;
    
    setEstaSincronizando(true);
    try {
       const pedidos = JSON.parse(localStorage.getItem('pedidos_offline') || '[]');
       if (pedidos.length === 0) {
           setEstaSincronizando(false);
           return;
       }

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

           if (!res.ok) {
               console.error('Error al sincronizar el pedido:', pedido.numero_pedido_offline);
               break; 
           }
       }

       localStorage.setItem('pedidos_offline', '[]');
       checarPedidosOffline();
       alert("¡Todos los pedidos se han sincronizado correctamente con la base de datos!");
       
    } catch (e) {
       console.error("Fallo general de sincronización", e);
       alert("Ocurrió un error al intentar sincronizar. Se volverá a intentar.");
    }
    setEstaSincronizando(false);
  };

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
    
    setCarrito([...carrito, nuevoItem]);
    setPromocionVigente(null); 
  };

  // 👇 NUEVO: FUNCIÓN PARA GUARDAR DIRECTO SIN PASAR POR CHECKOUT
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

    const paquete = {
      cliente_id: ordenExterna.cliente_id,
      tipo_consumo: ordenExterna.tipo_consumo,
      metodo_pago: ordenExterna.metodo_pago,
      origen: ordenExterna.origen,
      direccion_entrega: ordenExterna.direccion_entrega,
      estado_preparacion: ordenExterna.estado_preparacion,
      mesa: ordenExterna.mesa,
      
      carrito: carritoExpandido,
      total: calcularTotal(),
      descuento_puntos: descuentoPuntosPuntosFisicos,
      cupon_codigo: cuponActivo && descuentoCuponDinero > 0 ? cuponActivo.codigo : ordenExterna.cupon_codigo
    };

    try {
      const res = await fetch(`${apiUrl}/pedidos/${pedidoEditandoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paquete)
      });

      if (res.ok) {
         reiniciarKiosco(); // Regresa al cajero instantáneamente
      } else {
         alert("Error al actualizar la orden en el servidor.");
      }
    } catch(e) {
       alert("Error de red. Asegúrate de tener conexión.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans p-8 relative">
      
      {/* BANNER OFFLINE */}
      {isOffline && (
        <div className="bg-red-500 text-white text-center py-3 px-4 rounded-2xl mb-6 font-black flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg shadow-red-500/30">
          <span className="animate-pulse text-2xl">🔴</span> 
          <div>
              <p className="text-lg">MODO OFFLINE ACTIVO</p>
              <p className="text-xs font-medium uppercase tracking-widest opacity-90">Los pedidos se guardarán en esta computadora temporalmente.</p>
          </div>
        </div>
      )}

      {/* BANNER DE SINCRONIZACIÓN */}
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

      {/* HEADER GLOBAL */}
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
                <button onClick={() => setTimeout(() => onLogout(), 50)} className="ml-4 text-xs font-bold bg-slate-100 px-3 py-1 rounded-lg hover:bg-red-100 hover:text-red-600 transition">Salir</button>
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
        <MisPedidos misPedidos={misPedidos} setPantallaActual={setPantallaActual} modificarPedido={modificarPedido} />
      )}

      {pantallaActual === 'menu' && (
        <MenuPrincipal 
          configGlobal={configGlobal} productos={productos} clasificaciones={clasificaciones} 
          carrito={carrito} setCarrito={setCarrito} baseUrl={baseUrl} 
          setPantallaActual={setPantallaActual} pedidoEditandoId={pedidoEditandoId} 
          clienteActivo={clienteActivo} setModalNip={setModalNip} 
          calcularTotal={calcularTotal} calcularSubtotal={calcularSubtotal}
          setProductoEnEspera={setProductoEnEspera} setItemAEditar={setItemAEditar}
          descuentoPuntosDinero={descuentoPuntosDinero} descuentoPuntosPuntosFisicos={descuentoPuntosPuntosFisicos}
          setDescuentoPuntosPuntosFisicos={setDescuentoPuntosPuntosFisicos} cuponActivo={cuponActivo}
          setCuponActivo={setCuponActivo} descuentoCuponDinero={descuentoCuponDinero} apiUrl={apiUrl} mesaQR={mesaQR} isOffline={isOffline} 
          setPromocionVigente={setPromocionVigente}
          
          // 👇 AQUÍ ES DONDE FALTABA PASAR LAS PROPS. ESTA VEZ SÍ SE VAN AL HIJO.
          guardarEdicionDirecta={guardarEdicionDirecta} 
          isSubmitting={isSubmitting} 
        />
      )}

      {['consumo', 'pedir_nombre', 'asignar_mesa', 'aviso_domicilio', 'direccion', 'pago', 'cambio_efectivo_domicilio', 'detalles_transferencia', 'finalizado'].includes(pantallaActual) && (
        <CheckoutFlujo 
          pantallaActual={pantallaActual} setPantallaActual={setPantallaActual}
          tipoConsumo={tipoConsumo} setTipoConsumo={setTipoConsumo}
          direccionEntrega={direccionEntrega} setDireccionEntrega={setDireccionEntrega}
          direccionesGuardadas={direccionesGuardadas} setDireccionesGuardadas={setDireccionesGuardadas}
          carrito={carrito} calcularTotal={calcularTotal} setCarrito={setCarrito} productos={productos}
          descuentoPuntos={descuentoPuntosPuntosFisicos} cuponActivo={cuponActivo} descuentoCuponDinero={descuentoCuponDinero}
          clienteActivo={clienteActivo} ordenExterna={ordenExterna} user={user}
          pedidoEditandoId={pedidoEditandoId} apiUrl={apiUrl} configGlobal={configGlobal}
          setErrorTransaccion={setErrorTransaccion} setMetodoPagoFinal={setMetodoPagoFinal}
          numeroPedidoReal={numeroPedidoReal} setNumeroPedidoReal={setNumeroPedidoReal}
          contador={contador} setContador={setContador} reiniciarKiosco={reiniciarKiosco}
          metodoPagoFinal={metodoPagoFinal} mesaQR={mesaQR} isOffline={isOffline} 
          setPromocionVigente={setPromocionVigente}
        />
      )}

      {/* MODAL NIP FIDELIDAD */}
      {modalNip && ( 
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form onSubmit={verificarNip} className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl text-center">
            <span className="text-6xl mb-4 block">🎁</span>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Seguridad de Puntos</h2>
            <p className="text-slate-500 font-medium mb-6">Ingresa tu NIP para usar tus <strong className="text-blue-600">{clienteActivo?.puntos || 0} pts</strong>.</p>
            <input type="password" maxLength="4" required value={nipInput} onChange={e => setNipInput(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-center text-3xl font-black tracking-[1em] outline-none focus:border-blue-500 mb-2 text-slate-800" placeholder="••••" />
            <button type="button" onClick={() => alert('Pide apoyo al cajero.')} className="text-blue-500 hover:text-blue-700 text-xs font-bold underline mb-6 block w-full">¿Olvidaste tu NIP?</button>
            {errorNip && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded-xl mb-4 border border-red-100">{errorNip}</p>}
            <div className="flex gap-4">
              <button type="button" onClick={() => { setModalNip(false); setNipInput(''); setErrorNip(''); }} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200">Cancelar</button>
              <button type="submit" disabled={nipInput.length !== 4 || isOffline} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl disabled:opacity-50">Canjear</button>
            </div>
          </form>
        </div> 
      )}
      
      {/* MODAL PERSONALIZAR PLATILLO */}
      {productoEnEspera && ( 
        <ModalPersonalizar 
          productoEnEspera={productoEnEspera} setProductoEnEspera={setProductoEnEspera}
          itemAEditar={itemAEditar} setItemAEditar={setItemAEditar}
          carrito={carrito} setCarrito={setCarrito} 
          catalogoIngredientes={catalogoIngredientes} clasificaciones={clasificaciones}
        />
      )}

      {/* MODAL PROMOCIÓN / UPSELL */}
      {promocionVigente && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl text-center animate-in zoom-in duration-300">
            <div className="bg-orange-100 text-orange-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
               <span className="text-5xl">🎁</span>
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2 leading-tight">¡Espera! Oferta Especial 🔥</h2>
            <p className="text-slate-500 font-medium mb-6">¿Te gustaría agregar esto a tu orden?</p>
            
            <div className="bg-slate-50 border-2 border-orange-200 rounded-3xl p-6 mb-8 transform hover:scale-105 transition">
               {promocionVigente.oferta_imagen && (
                  <img 
                      src={promocionVigente.oferta_imagen.startsWith('http') ? promocionVigente.oferta_imagen : `${baseUrl}${promocionVigente.oferta_imagen}`} 
                      className="w-32 h-32 object-cover rounded-2xl mx-auto mb-4 shadow-sm" 
                      alt="promo" 
                  />
               )}
               <h3 className="font-black text-2xl text-slate-800 mb-2 leading-tight">{promocionVigente.oferta_nombre}</h3>
               <p className="text-lg font-bold text-orange-600 bg-orange-100 px-4 py-2 rounded-xl inline-block mt-2">
                 {promocionVigente.tipo_descuento === 'porcentaje' ? `¡Llévalo con ${promocionVigente.valor_descuento}% de descuento!` : `Precio especial: $${Number(promocionVigente.valor_descuento).toFixed(2)}`}
               </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button onClick={agregarUpsellAlCarrito} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg shadow-orange-500/30 transition active:scale-95">¡Sí, agregarlo a mi orden!</button>
              <button onClick={() => setPromocionVigente(null)} className="w-full bg-slate-100 text-slate-500 hover:bg-slate-200 py-4 rounded-2xl font-bold transition active:scale-95">No, gracias, continuar a pago</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Kiosco;