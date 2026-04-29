import React, { useState, useEffect, useCallback } from 'react';
import MenuPrincipal from './kiosco/MenuPrincipal';
import ModalPersonalizar from './kiosco/ModalPersonalizar';
import CheckoutFlujo from './kiosco/CheckoutFlujo';
import MisPedidos from './kiosco/MisPedidos';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const baseUrl = apiUrl.replace('/api', '');

const Kiosco = ({ user, clienteActivo, ordenExterna, onVolverAdmin, onLogout }) => {
  // === 1. DATOS GLOBALES ===
  const [productos, setProductos] = useState([]); 
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]); 
  const [clasificaciones, setClasificaciones] = useState([]); 
  const [configGlobal, setConfigGlobal] = useState({ 
    nombre_negocio: '', whatsapp: '', banco: '', cuenta: '', titular: '', kiosco_mensaje: '¿Qué se te antoja hoy?',
    negocio_abierto: true, mensaje_cierre: ''
  });

  // === 2. ESTADO DEL PEDIDO Y NAVEGACIÓN ===
  const [carrito, setCarrito] = useState([]); 
  const [pantallaActual, setPantallaActual] = useState('cargando'); 
  const [misPedidos, setMisPedidos] = useState([]);
  const [pedidoEditandoId, setPedidoEditandoId] = useState(null); 
  
  // === 3. ESTADOS DE CHECKOUT ===
  const [tipoConsumo, setTipoConsumo] = useState(null); 
  const [direccionEntrega, setDireccionEntrega] = useState(clienteActivo?.direccion || ''); 
  const [direccionesGuardadas, setDireccionesGuardadas] = useState([]);
  const [numeroPedidoReal, setNumeroPedidoReal] = useState(null); 
  const [contador, setContador] = useState(15); 
  const [errorTransaccion, setErrorTransaccion] = useState('');
  const [metodoPagoFinal, setMetodoPagoFinal] = useState(null);

  // === 4. ESTADOS DE MODALES Y PUNTOS ===
  const [productoEnEspera, setProductoEnEspera] = useState(null); 
  const [itemAEditar, setItemAEditar] = useState(null);
  const [descuentoPuntos, setDescuentoPuntos] = useState(0); 
  const [modalNip, setModalNip] = useState(false); 
  const [nipInput, setNipInput] = useState(''); 
  const [errorNip, setErrorNip] = useState('');

  // === CARGA INICIAL Y MONITOREO DE DATOS ===
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
    
    // SOLUCIÓN CACHÉ: Añadimos '?t=' con la hora actual para evitar que el navegador guarde la respuesta
    const fetchConfig = () => {
      fetch(`${apiUrl}/configuracion?t=${new Date().getTime()}`)
        .then(r => r.json())
        .then(data => { if(data && !data.error) setConfigGlobal(data); })
        .catch(console.error);
    };
    
    fetchConfig(); 
    // Reducimos el tiempo a 5 segundos para que reaccione súper rápido a la Caja
    const intervalConfig = setInterval(fetchConfig, 5000); 
    return () => clearInterval(intervalConfig);

  }, []);

  // Cargar direcciones guardadas del cliente
  useEffect(() => {
    if (clienteActivo && clienteActivo.id) {
      const saved = JSON.parse(localStorage.getItem(`direcciones_${clienteActivo.id}`) || '[]');
      setDireccionesGuardadas(saved);
      if (saved.length > 0 && !direccionEntrega) setDireccionEntrega(saved[0]);
    }
  }, [clienteActivo, direccionEntrega]);

  // Modificar Pedido Existente (Orden Activa)
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
    setPantallaActual('menu'); 
  }, []);

  useEffect(() => { if (ordenExterna) modificarPedido(ordenExterna); }, [ordenExterna, modificarPedido]);

  // Polling para "Mis Pedidos"
  useEffect(() => {
    let intervaloPedidos;
    const verificarMisPedidos = async (esCargaInicial = false) => {
      if (!clienteActivo || ordenExterna) return;
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
  }, [clienteActivo, ordenExterna]);

  const reiniciarKiosco = useCallback(() => {
    if(user && user.rol === 'cajero') { 
      setCarrito([]); setTipoConsumo(null); setDireccionEntrega(''); setNumeroPedidoReal(null); setMetodoPagoFinal(null); setErrorTransaccion(''); setPedidoEditandoId(null); setDescuentoPuntos(0); 
      if (ordenExterna && onLogout) onLogout(); else setPantallaActual('menu'); 
    } else { 
      setTimeout(() => { if (onLogout) onLogout(); }, 50); 
    }
  }, [user, ordenExterna, onLogout]);

  useEffect(() => { 
    let timer; 
    if (pantallaActual === 'finalizado') { 
      if (contador > 0) timer = setTimeout(() => setContador(c => c - 1), 1000); 
      else reiniciarKiosco(); 
    } 
    return () => clearTimeout(timer); 
  }, [pantallaActual, contador, reiniciarKiosco]);

  // Cálculos Globales
  const calcularSubtotal = () => carrito.reduce((t, i) => t + ((i.precioFinal || 0) * (i.cantidad || 1)), 0); 
  const calcularTotal = () => Math.max(0, calcularSubtotal() - descuentoPuntos);
  
  // Canje de Puntos NIP
  const verificarNip = async (e) => { 
    e.preventDefault(); setErrorNip(''); 
    if (!clienteActivo || !clienteActivo.id) return setErrorNip('No hay cliente activo.'); 
    try { 
      const res = await fetch(`${apiUrl}/clientes/verificar-nip`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: clienteActivo.id, nip: nipInput }) }); 
      if (res.ok) { setDescuentoPuntos(clienteActivo.puntos); setModalNip(false); } else { setErrorNip('NIP Incorrecto. Intenta de nuevo.'); } 
    } catch (err) { setErrorNip('Error al verificar NIP'); } 
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans p-8 relative">
      
      {/* HEADER GLOBAL */}
      <div className="flex justify-between items-start mb-8">
        {clienteActivo && !ordenExterna ? ( 
          <div className="bg-white px-6 py-3 rounded-full shadow-sm border flex items-center gap-4">
            <span className="text-xl">👋</span>
            <div><p className="text-sm text-slate-500 font-bold leading-tight">Hola, {clienteActivo.nombre}</p><p className="text-blue-600 font-black tracking-tight">{clienteActivo.puntos} Puntos</p></div>
            <button onClick={() => setTimeout(() => onLogout(), 50)} className="ml-4 text-xs font-bold bg-slate-100 px-3 py-1 rounded-lg hover:bg-red-100 hover:text-red-600">Salir</button>
          </div> 
        ) : ( 
          <div className="bg-white px-6 py-3 rounded-full shadow-sm border"><p className="text-sm font-bold text-slate-400">{ordenExterna ? `Editando orden` : 'Invitado'}</p></div> 
        )}
        {user?.rol === 'admin' && !ordenExterna && <button onClick={onVolverAdmin} className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold shadow-xl hover:bg-slate-800">⬅ Panel Admin</button>}
      </div>

      {errorTransaccion && ( <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 shadow-sm"><p className="font-bold">🚨 {errorTransaccion}</p></div> )}

      {/* ENRUTADOR DE VISTAS */}
      {pantallaActual === 'mis_pedidos' && (
        <MisPedidos misPedidos={misPedidos} setPantallaActual={setPantallaActual} modificarPedido={modificarPedido} />
      )}

      {pantallaActual === 'menu' && (
        <MenuPrincipal 
          configGlobal={configGlobal} productos={productos} clasificaciones={clasificaciones} 
          carrito={carrito} setCarrito={setCarrito} baseUrl={baseUrl} 
          setPantallaActual={setPantallaActual} pedidoEditandoId={pedidoEditandoId} 
          clienteActivo={clienteActivo} descuentoPuntos={descuentoPuntos} setModalNip={setModalNip} 
          calcularTotal={calcularTotal} setProductoEnEspera={setProductoEnEspera} setItemAEditar={setItemAEditar}
        />
      )}

      {/* 👇 AÑADIDO: 'aviso_domicilio' PARA QUE RENDERICE EL COMPONENTE CHECKOUTFLUJO */}
      {['consumo', 'aviso_domicilio', 'direccion', 'pago', 'cambio_efectivo_domicilio', 'detalles_transferencia', 'finalizado'].includes(pantallaActual) && (
        <CheckoutFlujo 
          pantallaActual={pantallaActual} setPantallaActual={setPantallaActual}
          tipoConsumo={tipoConsumo} setTipoConsumo={setTipoConsumo}
          direccionEntrega={direccionEntrega} setDireccionEntrega={setDireccionEntrega}
          direccionesGuardadas={direccionesGuardadas} setDireccionesGuardadas={setDireccionesGuardadas}
          carrito={carrito} calcularTotal={calcularTotal} descuentoPuntos={descuentoPuntos}
          clienteActivo={clienteActivo} ordenExterna={ordenExterna} user={user}
          pedidoEditandoId={pedidoEditandoId} apiUrl={apiUrl} configGlobal={configGlobal}
          setErrorTransaccion={setErrorTransaccion} setMetodoPagoFinal={setMetodoPagoFinal}
          numeroPedidoReal={numeroPedidoReal} setNumeroPedidoReal={setNumeroPedidoReal}
          contador={contador} setContador={setContador} reiniciarKiosco={reiniciarKiosco}
          metodoPagoFinal={metodoPagoFinal}
        />
      )}

      {/* MODALES GLOBALES */}
      {modalNip && ( 
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form onSubmit={verificarNip} className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl text-center">
            <span className="text-6xl mb-4 block">🎁</span>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Seguridad de Puntos</h2>
            <p className="text-slate-500 font-medium mb-6">Ingresa tu NIP para canjear tus puntos.</p>
            <input type="password" maxLength="4" required value={nipInput} onChange={e => setNipInput(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-center text-3xl font-black tracking-[1em] outline-none focus:border-blue-500 mb-2 text-slate-800" placeholder="••••" />
            <button type="button" onClick={() => alert('Pide apoyo al cajero.')} className="text-blue-500 hover:text-blue-700 text-xs font-bold underline mb-6 block w-full">¿Olvidaste tu NIP?</button>
            {errorNip && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded-xl mb-4 border border-red-100">{errorNip}</p>}
            <div className="flex gap-4">
              <button type="button" onClick={() => { setModalNip(false); setNipInput(''); setErrorNip(''); }} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200">Cancelar</button>
              <button type="submit" disabled={nipInput.length !== 4} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl disabled:opacity-50">Canjear</button>
            </div>
          </form>
        </div> 
      )}
      
      {productoEnEspera && ( 
        <ModalPersonalizar 
          productoEnEspera={productoEnEspera} setProductoEnEspera={setProductoEnEspera}
          itemAEditar={itemAEditar} setItemAEditar={setItemAEditar}
          carrito={carrito} setCarrito={setCarrito} 
          catalogoIngredientes={catalogoIngredientes} clasificaciones={clasificaciones}
        />
      )}

    </div>
  );
};

export default Kiosco;