import React, { useState, useEffect, useCallback } from 'react';

const Kiosco = ({ user, clienteActivo, ordenExterna, onVolverAdmin, onLogout }) => {
  const [productos, setProductos] = useState([]); 
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]); 
  const [clasificaciones, setClasificaciones] = useState([]); 
  
  const [configGlobal, setConfigGlobal] = useState({ 
    nombre_negocio: '', whatsapp: '', banco: '', cuenta: '', titular: '', kiosco_mensaje: '¿Qué se te antoja hoy?' 
  });

  const [carrito, setCarrito] = useState([]); 
  const [pantallaActual, setPantallaActual] = useState('cargando'); 
  const [misPedidos, setMisPedidos] = useState([]);
  const [pedidoEditandoId, setPedidoEditandoId] = useState(null); 
  const [tipoConsumo, setTipoConsumo] = useState(null); 
  
  // ESTADOS PARA DIRECCIONES MEMORIZADAS
  const [direccionEntrega, setDireccionEntrega] = useState(clienteActivo?.direccion || ''); 
  const [direccionesGuardadas, setDireccionesGuardadas] = useState([]);

  const [productoEnEspera, setProductoEnEspera] = useState(null); 
  const [extrasAgregados, setExtrasAgregados] = useState([]); 
  const [ingredientesRemovidos, setIngredientesRemovidos] = useState([]); 
  const [notaEspecial, setNotaEspecial] = useState(''); 
  const [cantidadProducto, setCantidadProducto] = useState(1); 
  const [itemEditandoIdTicket, setItemEditandoIdTicket] = useState(null);
  const [variacionesSeleccionadas, setVariacionesSeleccionadas] = useState({}); 
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  
  const [numeroPedidoReal, setNumeroPedidoReal] = useState(null); 
  const [contador, setContador] = useState(15); 
  const [errorTransaccion, setErrorTransaccion] = useState('');
  const [descuentoPuntos, setDescuentoPuntos] = useState(0); 
  const [modalNip, setModalNip] = useState(false); 
  const [nipInput, setNipInput] = useState(''); 
  const [errorNip, setErrorNip] = useState('');
  const [metodoPagoFinal, setMetodoPagoFinal] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  useEffect(() => { 
    fetch(`${apiUrl}/productos`).then(r => r.json()).then(data => setProductos(Array.isArray(data) ? data : [])).catch(console.error); 
    fetch(`${apiUrl}/ingredientes`).then(r => r.json()).then(data => setCatalogoIngredientes(Array.isArray(data) ? data : [])).catch(console.error);
    fetch(`${apiUrl}/clasificaciones`).then(r => r.json()).then(data => setClasificaciones(Array.isArray(data) ? data : [])).catch(console.error);
    fetch(`${apiUrl}/configuracion`).then(r => r.json()).then(data => { if(data && !data.error) setConfigGlobal(data); }).catch(console.error);
  }, [apiUrl]);

  // Cargar direcciones guardadas del cliente al iniciar sesión
  useEffect(() => {
    if (clienteActivo && clienteActivo.id) {
      const saved = JSON.parse(localStorage.getItem(`direcciones_${clienteActivo.id}`) || '[]');
      setDireccionesGuardadas(saved);
      if (saved.length > 0 && !direccionEntrega) {
        setDireccionEntrega(saved[0]);
      }
    }
  }, [clienteActivo, direccionEntrega]);

  // MEJORA: AGRUPAR ITEMS AL MODIFICAR UN PEDIDO EXISTENTE
  const modificarPedido = useCallback((pedido) => { 
    const carritoAgrupado = [];
    pedido.carrito.forEach(item => {
        const getExtrasStr = (extras) => (extras||[]).map(e => e.nombre).sort().join('|');
        const extStr = getExtrasStr(item.extras);
        const existente = carritoAgrupado.find(i => i.id === item.id && getExtrasStr(i.extras) === extStr && i.precioFinal === item.precioFinal);
        
        if (existente) {
            existente.cantidad = (existente.cantidad || 1) + 1;
        } else {
            carritoAgrupado.push({ ...item, cantidad: 1, idTicket: Math.random() });
        }
    });

    setCarrito(carritoAgrupado); 
    setTipoConsumo(pedido.tipo_consumo); 
    setDireccionEntrega(pedido.direccion_entrega || ''); 
    setPedidoEditandoId(pedido.id); 
    setPantallaActual('menu'); 
  }, []);

  useEffect(() => { if (ordenExterna) modificarPedido(ordenExterna); }, [ordenExterna, modificarPedido]);

  useEffect(() => {
    let intervaloPedidos;
    const verificarMisPedidos = async (esCargaInicial = false) => {
      if (!clienteActivo || ordenExterna) return;
      try { 
        const r = await fetch(`${apiUrl}/clientes/${clienteActivo.id}/pedidos`); 
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
  }, [clienteActivo, ordenExterna, apiUrl]);

  const reiniciarKiosco = useCallback(() => {
    if(user && user.rol === 'cajero') { 
      setCarrito([]); setTipoConsumo(null); setDireccionEntrega(''); setNumeroPedidoReal(null); setMetodoPagoFinal(null); setErrorTransaccion(''); setPedidoEditandoId(null); setCategoriaActiva(null); setDescuentoPuntos(0); 
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

  const abrirModalProducto = (p) => { 
    setProductoEnEspera(p); setExtrasAgregados([]); setIngredientesRemovidos([]); setNotaEspecial(''); setCantidadProducto(1); setItemEditandoIdTicket(null); 
    const varsInciales = {}; 
    const opcionesVariacion = p.opciones?.filter(o => o.tipo === 'variacion') || []; 
    opcionesVariacion.forEach(o => { if (!varsInciales[o.categoria]) varsInciales[o.categoria] = o; }); 
    setVariacionesSeleccionadas(varsInciales); 
  };

  const editarArticuloCarrito = (item) => {
    const productoOriginal = productos.find(p => p.id === item.id || p.nombre === item.nombre); 
    if (!productoOriginal) return alert("Este producto ya no existe en el menú."); 
    setProductoEnEspera(productoOriginal); 
    
    const removidosTemp = []; const extrasTemp = []; const variacionesTemp = {}; let notaTemp = '';
    (item.extras || []).forEach(e => { 
      if (e.nombre.startsWith('Sin ')) removidosTemp.push(e.nombre.replace('Sin ', '')); 
      else if (e.nombre.startsWith('📝 Nota: ')) notaTemp = e.nombre.replace('📝 Nota: ', ''); 
      else if (e.nombre.startsWith('🔸')) { 
        const parts = e.nombre.replace('🔸 ', '').split(': '); 
        if(parts.length === 2) variacionesTemp[parts[0]] = { nombre: parts[1], precioExtra: e.precioExtra, categoria: parts[0] }; 
      } 
      else if (e.nombre.startsWith('Extra ')) extrasTemp.push({ nombre: e.nombre.replace('Extra ', ''), precioExtra: e.precioExtra }); 
    });
    
    setIngredientesRemovidos(removidosTemp); setExtrasAgregados(extrasTemp); setNotaEspecial(notaTemp); setVariacionesSeleccionadas(variacionesTemp); 
    setCantidadProducto(item.cantidad || 1); setItemEditandoIdTicket(item.idTicket); 
  };

  const toggleIngredienteBase = (nombre) => { setIngredientesRemovidos(prev => prev.includes(nombre) ? prev.filter(n => n !== nombre) : [...prev, nombre]); };
  const toggleExtra = (extra) => { setExtrasAgregados(prev => prev.find(e => e.nombre === extra.nombre) ? prev.filter(e => e.nombre !== extra.nombre) : [...prev, extra]); };
  const seleccionarVariacion = (categoria, opcion) => { setVariacionesSeleccionadas({ ...variacionesSeleccionadas, [categoria]: opcion }); };

  // NUEVO: CAMBIAR CANTIDAD DIRECTO EN EL CARRITO
  const cambiarCantidadCart = (idTicket, delta) => {
    setCarrito(carrito.map(item => {
        if (item.idTicket === idTicket) {
            const nuevaCant = (item.cantidad || 1) + delta;
            return { ...item, cantidad: Math.max(1, nuevaCant) };
        }
        return item;
    }));
  };

  // MEJORA: AGRUPACIÓN INTELIGENTE DE PRODUCTOS EN EL CARRITO
  const confirmarYAgregar = () => {
    const categoriasObligatorias = [...new Set(productoEnEspera.opciones?.filter(o => o.tipo === 'variacion').map(o => o.categoria))]; 
    for (let cat of categoriasObligatorias) { if (!variacionesSeleccionadas[cat]) return alert(`Por favor, selecciona una opción para: ${cat}`); }

    const costoExtras = extrasAgregados.reduce((s, e) => s + e.precioExtra, 0); 
    const costoVariaciones = Object.values(variacionesSeleccionadas).reduce((s, v) => s + (v.precioExtra || 0), 0);
    
    const modificacionesFinales = [ 
      ...Object.values(variacionesSeleccionadas).map(v => ({ nombre: `🔸 ${v.categoria}: ${v.nombre}`, precioExtra: v.precioExtra })), 
      ...ingredientesRemovidos.map(n => ({ nombre: `Sin ${n}`, precioExtra: 0 })), 
      ...extrasAgregados.map(e => ({ nombre: `Extra ${e.nombre}`, precioExtra: e.precioExtra })) 
    ]; 
    if (notaEspecial.trim() !== '') modificacionesFinales.push({ nombre: `📝 Nota: ${notaEspecial.trim()}`, precioExtra: 0 });
    
    const clasifDB = clasificaciones.find(c => c.nombre === (productoEnEspera.categoria || 'General')); 
    const precioUnitario = Number(productoEnEspera.precio_base) + costoExtras + costoVariaciones; 
    
    const nuevoItem = { 
        ...productoEnEspera, 
        extras: modificacionesFinales, 
        precioFinal: precioUnitario, 
        destino: clasifDB ? clasifDB.destino : 'Cocina', 
        cantidad: cantidadProducto,
        idTicket: itemEditandoIdTicket || Date.now() + Math.random() 
    };

    if (itemEditandoIdTicket) {
        // Modo Edición
        setCarrito(carrito.map(item => item.idTicket === itemEditandoIdTicket ? nuevoItem : item));
    } else {
        // Modo Agregar: Buscar si ya existe uno exactamente igual para sumarlo
        const getExtrasStr = (extras) => extras.map(e => e.nombre).sort().join('|');
        const extrasStrNuevo = getExtrasStr(nuevoItem.extras);
        
        const indexExistente = carrito.findIndex(item => 
            item.id === nuevoItem.id && 
            getExtrasStr(item.extras) === extrasStrNuevo &&
            item.precioFinal === nuevoItem.precioFinal
        );

        if (indexExistente >= 0) {
            const nuevoCarrito = [...carrito];
            nuevoCarrito[indexExistente].cantidad = (nuevoCarrito[indexExistente].cantidad || 1) + cantidadProducto;
            setCarrito(nuevoCarrito);
        } else {
            setCarrito([...carrito, nuevoItem]);
        }
    }
    setProductoEnEspera(null);
  };

  const calcularSubtotal = () => carrito.reduce((t, i) => t + ((i.precioFinal || 0) * (i.cantidad || 1)), 0); 
  const calcularTotal = () => Math.max(0, calcularSubtotal() - descuentoPuntos);
  
  const verificarNip = async (e) => { 
    e.preventDefault(); setErrorNip(''); 
    if (!clienteActivo || !clienteActivo.id) return setErrorNip('No hay cliente activo.'); 
    try { 
      const res = await fetch(`${apiUrl}/clientes/verificar-nip`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: clienteActivo.id, nip: nipInput }) }); 
      if (res.ok) { setDescuentoPuntos(clienteActivo.puntos); setModalNip(false); } else { setErrorNip('NIP Incorrecto. Intenta de nuevo.'); } 
    } catch (err) { setErrorNip('Error al verificar NIP'); } 
  };

  const guardarPedidoEnBD = async (metodoSeleccionado) => {
    setErrorTransaccion(''); setMetodoPagoFinal(metodoSeleccionado);
    const idClienteAGuardar = ordenExterna ? ordenExterna.cliente_id : (clienteActivo?.id || null);
    let origenCalculado = 'Web'; 
    if (user?.rol === 'cajero') origenCalculado = 'Caja'; 
    else if (user?.usuario === 'kiosco' || user?.usuario === 'admin') origenCalculado = 'Kiosco'; 
    
    // MEJORA: Expandir el carrito antes de enviar para que el inventario descuente por cada pieza
    const carritoExpandido = [];
    carrito.forEach(item => {
        const qty = item.cantidad || 1;
        for(let i = 0; i < qty; i++) {
            carritoExpandido.push({...item, cantidad: 1, idTicket: item.idTicket + '_' + i});
        }
    });

    const paquete = { 
      cliente_id: idClienteAGuardar, 
      tipo_consumo: tipoConsumo, 
      metodo_pago: metodoSeleccionado, 
      total: calcularTotal(), 
      carrito: carritoExpandido, 
      origen: origenCalculado, 
      direccion_entrega: tipoConsumo === 'Domicilio' ? direccionEntrega : null, 
      descuento_puntos: descuentoPuntos 
    };

    try {
      const url = pedidoEditandoId ? `${apiUrl}/pedidos/${pedidoEditandoId}` : `${apiUrl}/pedidos`; 
      const res = await fetch(url, { method: pedidoEditandoId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paquete) });
      if (res.ok) { const data = await res.json(); setNumeroPedidoReal(data.numero_pedido); return true; } 
      else { const errData = await res.json(); setErrorTransaccion(errData.error || 'Error'); return false; }
    } catch (error) { setErrorTransaccion('Sin conexión.'); return false; }
  };

  const procesarTipoConsumo = (tipo) => { 
    setTipoConsumo(tipo); 
    if (tipo === 'Domicilio') setPantallaActual('direccion'); 
    else setPantallaActual('pago'); 
  };

  // NUEVO: GUARDAR DIRECCIONES AL CONTINUAR A PAGO
  const continuarAPagoDesdeDireccion = () => {
    if (tipoConsumo === 'Domicilio' && direccionEntrega.trim()) {
        let nuevas = [...direccionesGuardadas];
        const dir = direccionEntrega.trim();
        if (!nuevas.includes(dir)) {
            nuevas.unshift(dir);
            if (nuevas.length > 2) nuevas.pop(); // Mantener solo las 2 más recientes
            setDireccionesGuardadas(nuevas);
            if (clienteActivo && clienteActivo.id) {
                localStorage.setItem(`direcciones_${clienteActivo.id}`, JSON.stringify(nuevas));
            }
        }
    }
    setPantallaActual('pago');
  };

  const seleccionarPago = async (metodo) => { 
    const ok = await guardarPedidoEnBD(metodo); 
    if (ok) { 
      if (metodo === 'Transferencia') setPantallaActual('detalles_transferencia'); 
      else { setContador(15); setPantallaActual('finalizado'); } 
    } 
  };
  const procesarTransferencia = () => { setContador(15); setPantallaActual('finalizado'); };

  const agruparVariaciones = (opciones) => { const grupos = {}; opciones?.filter(o => o.tipo === 'variacion').forEach(o => { if (!grupos[o.categoria]) grupos[o.categoria] = []; grupos[o.categoria].push(o); }); return grupos; };
  const categoriasUnicas = [...new Set(productos.map(p => p.categoria || 'General'))]; 
  const productosFiltrados = productos.filter(p => (p.categoria || 'General') === categoriaActiva);
  
  const getPortadaCategoria = (catName) => { 
    const clasifDB = clasificaciones.find(c => c.nombre === catName); 
    return { imagen_url: clasifDB?.imagen_url || null, emoji: clasifDB?.emoji || '🍽️' }; 
  };
  
  const obtenerExtrasDisponibles = () => { 
    if (!productoEnEspera) return []; 
    const extrasGlobales = (catalogoIngredientes || []).filter(ing => ing.clasificacion_nombre === (productoEnEspera.categoria || 'General') && (ing.tipo === 'extra' || (ing.tipo === 'base' && ing.permite_extra))); 
    const extrasManuales = productoEnEspera.opciones?.filter(o => o.tipo === 'extra') || []; 
    const extrasMap = new Map(); 
    extrasGlobales.forEach(e => extrasMap.set(e.nombre, { nombre: e.nombre, precioExtra: Number(e.precio_extra) })); 
    extrasManuales.forEach(e => extrasMap.set(e.nombre, { nombre: e.nombre, precioExtra: Number(e.precioExtra) })); 
    return Array.from(extrasMap.values()); 
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans p-8 relative">
      
      {/* HEADER GLOBALES */}
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

      {/* ================= VISTA MIS PEDIDOS ================= */}
      {pantallaActual === 'mis_pedidos' && (
        <div className="max-w-4xl mx-auto mt-10">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-4xl font-black texto-destacado">Tus Órdenes Activas</h2>
            <button onClick={() => setPantallaActual('menu')} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold">Nueva Orden</button>
          </div>
          <div className="space-y-4">
            {misPedidos.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border flex justify-between items-center">
                <div>
                  <p className="text-2xl font-black text-slate-800">Orden #{p.numero_pedido} <span className="text-xs bg-gray-100 px-2 py-1 ml-2 rounded-lg">{p.estado_preparacion}</span></p>
                  <p className="text-slate-500 font-medium">Total: ${p.total}</p>
                </div>
                {p.estado_preparacion === 'Pendiente' ? <button onClick={() => modificarPedido(p)} className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-orange-500 hover:text-white">✏️ Modificar</button> : <p className="text-sm font-bold text-slate-400">En proceso 👩‍🍳</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= VISTA MENÚ PRINCIPAL ================= */}
      {pantallaActual === 'menu' && (
        <div className="flex flex-col lg:flex-row gap-8 h-[75vh]">
          
          <div className="w-full lg:w-2/3 flex flex-col h-full">
            {!categoriaActiva ? (
              <div className="flex flex-col h-full">
                <h2 className="text-4xl font-black mb-8 texto-destacado">{configGlobal.kiosco_mensaje || '¿Qué se te antoja hoy?'}</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-6 pr-2">
                  {categoriasUnicas.map(cat => { 
                    const portada = getPortadaCategoria(cat); 
                    return ( 
                      <button key={cat} onClick={() => setCategoriaActiva(cat)} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col items-center justify-center active:scale-95 transition-all hover:shadow-lg min-h-[220px] group">
                        {portada.imagen_url ? <img src={`http://localhost:4000${portada.imagen_url}`} alt={cat} className="w-24 h-24 object-cover rounded-full shadow-md mb-6 group-hover:scale-110 transition-transform" /> : <span className="text-7xl mb-6 group-hover:scale-110 transition-transform">{portada.emoji}</span>}
                        <h3 className="text-2xl font-black text-slate-700 tracking-tight">{cat}</h3>
                      </button> 
                    ); 
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-8 gap-4 bg-white p-4 rounded-3xl shadow-sm border">
                  <h2 className="text-3xl font-black text-slate-800 ml-4">{categoriaActiva}</h2>
                  <button onClick={() => setCategoriaActiva(null)} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-lg transition flex items-center justify-center shadow-lg active:scale-95">⬅ Volver</button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-6 pr-2">
                  {productosFiltrados.map((p) => { 
                    const tieneTamanos = p.opciones?.some(o => o.categoria === 'Tamaño'); 
                    return ( 
                      <button key={p.id} onClick={() => abrirModalProducto(p)} className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex flex-col items-center active:scale-95 transition-transform hover:shadow-md hover:border-blue-200">
                        {p.imagen_url ? <img src={`http://localhost:4000${p.imagen_url}`} alt={p.nombre} className="w-28 h-28 object-cover rounded-2xl shadow-sm mb-4" /> : <span className="text-6xl mb-4 bg-slate-50 w-28 h-28 flex items-center justify-center rounded-2xl">{p.emoji}</span>}
                        <h3 className="text-xl font-bold text-center leading-tight text-slate-700">{p.nombre}</h3>
                        <span className={`mt-4 px-4 py-2 rounded-full font-black ${tieneTamanos ? 'bg-emerald-50 text-emerald-600 text-sm' : 'bg-slate-100 text-blue-600'}`}>{tieneTamanos ? 'Personalizar' : `$${p.precio_base}`}</span>
                      </button> 
                    ) 
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="w-full lg:w-1/3 bg-white rounded-[40px] shadow-xl p-8 border flex flex-col h-full relative">
            {pedidoEditandoId && (<div className="absolute top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 rounded-t-[40px] text-xs font-black uppercase tracking-widest shadow-md">Editando</div>)}
            <h2 className={`text-2xl font-black mb-6 border-b pb-4 text-slate-800 ${pedidoEditandoId ? 'mt-4' : ''}`}>Tu Orden</h2>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {carrito.map((item) => ( 
                <div key={item.idTicket} className="flex justify-between items-start mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex-1 pr-2">
                    <span className="font-black block text-lg text-slate-700">
                      {/* MOSTRAR CANTIDAD SI ES MAYOR A 1 */}
                      {item.cantidad > 1 && <span className="text-blue-600 mr-2">{item.cantidad}x</span>}
                      {item.nombre}
                    </span>
                    <ul className="text-xs mt-1 space-y-1">
                      {item.extras?.map((e, idx) => ( 
                        <li key={idx} className={e.nombre.startsWith('Sin ') ? 'text-red-400 line-through font-medium' : e.nombre.startsWith('📝') || e.nombre.startsWith('🔸') ? 'text-slate-600 italic bg-white px-2 py-1 rounded-lg border inline-block mt-1 font-medium' : 'text-blue-500 font-bold'}>{e.nombre}</li> 
                      ))}
                    </ul>
                    <span className="font-black text-blue-600 block mt-2 text-xl">${item.precioFinal * (item.cantidad || 1)}</span>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {/* BOTONES RÁPIDOS DE + Y - */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                       <button onClick={() => cambiarCantidadCart(item.idTicket, -1)} className="px-3 py-1 font-black text-slate-500 hover:bg-slate-100">-</button>
                       <span className="px-2 py-1 font-black text-slate-800 text-sm">{item.cantidad || 1}</span>
                       <button onClick={() => cambiarCantidadCart(item.idTicket, 1)} className="px-3 py-1 font-black text-slate-500 hover:bg-slate-100">+</button>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => editarArticuloCarrito(item)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-xl bg-white shadow-sm border border-slate-100">✏️</button>
                      <button onClick={() => setCarrito(carrito.filter(i => i.idTicket !== item.idTicket))} className="p-2 text-red-500 hover:bg-red-100 rounded-xl bg-white shadow-sm border border-slate-100">❌</button>
                    </div>
                  </div>
                </div> 
              ))}
            </div>

            <div className="pt-4 border-t mt-auto space-y-4">
              {clienteActivo && clienteActivo.puntos > 0 && !descuentoPuntos && carrito.length > 0 && ( 
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex justify-between items-center">
                  <div className="text-sm"><p className="font-black text-blue-900">🎁 Tienes {clienteActivo.puntos} Puntos</p><p className="text-blue-600 font-medium">Equivalen a ${clienteActivo.puntos} MXN</p></div>
                  <button onClick={() => setModalNip(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700">Canjear</button>
                </div> 
              )}
              {descuentoPuntos > 0 && ( <div className="flex justify-between items-center text-emerald-600 font-black"><span className="uppercase tracking-widest text-xs">Puntos Aplicados:</span><span>-${descuentoPuntos}</span></div> )}
              <div className="flex justify-between items-center mb-2"><span className="text-slate-500 font-black uppercase tracking-widest">Total:</span><span className="text-4xl font-black text-slate-800">${calcularTotal()}</span></div>
              <button onClick={() => setPantallaActual('consumo')} disabled={carrito.length === 0} className={`w-full text-white py-5 rounded-2xl text-xl font-black shadow-lg disabled:bg-slate-300 disabled:shadow-none transition-transform active:scale-95 ${pedidoEditandoId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {pedidoEditandoId ? 'Guardar Cambios' : 'Confirmar Orden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= VISTA ¿DÓNDE LO COMES? ================= */}
      {pantallaActual === 'consumo' && (
        <div className="max-w-4xl mx-auto mt-10 text-center">
          <div className="flex justify-start"><button onClick={() => setPantallaActual('menu')} className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200">⬅ Volver al carrito</button></div>
          <h2 className="text-4xl font-black mb-4 texto-destacado mt-4">¿Cómo disfrutarás tu pedido?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <button onClick={() => procesarTipoConsumo('Local')} className="bg-white p-10 rounded-[40px] shadow-lg border-4 border-transparent hover:border-blue-600 transition-all hover:-translate-y-2"><span className="text-8xl block mb-6">🍽️</span><span className="text-2xl font-black text-slate-700">Comer aquí</span></button>
            <button onClick={() => procesarTipoConsumo('Para llevar')} className="bg-white p-10 rounded-[40px] shadow-lg border-4 border-transparent hover:border-blue-600 transition-all hover:-translate-y-2"><span className="text-8xl block mb-6">🛍️</span><span className="text-2xl font-black text-slate-700">Para llevar</span></button>
            <button onClick={() => procesarTipoConsumo('Domicilio')} className="bg-white p-10 rounded-[40px] shadow-lg border-4 border-transparent hover:border-blue-600 transition-all hover:-translate-y-2"><span className="text-8xl block mb-6">🛵</span><span className="text-2xl font-black text-slate-700">A Domicilio</span></button>
          </div>
        </div>
      )}

      {/* ================= VISTA DOMICILIO (CON MEMORIA DE DIRECCIONES) ================= */}
      {pantallaActual === 'direccion' && (
        <div className="max-w-xl mx-auto mt-10 text-center">
          <div className="flex justify-start mb-6"><button onClick={() => setPantallaActual('consumo')} className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200">⬅ Elegir otro método</button></div>
          <span className="text-6xl block mb-6">🛵</span>
          <h2 className="text-3xl font-black mb-2 texto-destacado">¿A dónde te lo enviamos?</h2>
          
          {direccionesGuardadas.length > 0 && (
             <div className="mb-6 flex gap-3 justify-center mt-6">
                {direccionesGuardadas.map((dir, idx) => (
                   <button key={idx} onClick={() => setDireccionEntrega(dir)} className={`px-6 py-3 rounded-xl font-bold border-2 transition-all ${direccionEntrega === dir ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                      {idx === 0 ? '🏠 Casa' : '🏢 Trabajo/Otro'}
                   </button>
                ))}
             </div>
          )}

          <p className="text-slate-500 font-medium mb-4 mt-6">Ingresa la dirección completa.</p>
          <textarea required value={direccionEntrega} onChange={(e) => setDireccionEntrega(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-3xl p-6 text-lg font-bold outline-none focus:border-blue-500 shadow-sm h-32 resize-none text-slate-800" placeholder="Ej. Calle Pino Suárez #123, Col. Centro." />
          <div className="flex gap-4 mt-8">
             <button disabled={!direccionEntrega.trim()} onClick={continuarAPagoDesdeDireccion} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 disabled:opacity-50 transition">Ir a Pagar</button>
          </div>
        </div>
      )}

      {/* ================= VISTA MÉTODO DE PAGO ================= */}
      {pantallaActual === 'pago' && (
        <div className="max-w-3xl mx-auto mt-10">
          <div className="flex justify-start mb-6"><button onClick={() => setPantallaActual(tipoConsumo === 'Domicilio' ? 'direccion' : 'consumo')} className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200">⬅ Atrás</button></div>
          <h2 className="text-4xl font-black text-center mb-12 texto-destacado">Método de Pago</h2>
          <div className="grid grid-cols-1 gap-6">
            <button onClick={() => seleccionarPago('Tarjeta')} className="bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between hover:bg-blue-50 transition-all hover:border-blue-200"><span className="text-3xl font-black text-slate-700">💳 Tarjeta / Terminal</span></button>
            <button onClick={() => seleccionarPago('Efectivo')} className="bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between hover:bg-emerald-50 transition-all hover:border-emerald-200"><span className="text-3xl font-black text-slate-700">💵 Pago en Caja</span></button>
            <button onClick={() => seleccionarPago('Transferencia')} className="bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between hover:bg-purple-50 transition-all hover:border-purple-200"><span className="text-3xl font-black text-slate-700">📱 Transferencia</span></button>
          </div>
        </div>
      )}

      {/* ================= VISTA TRANSFERENCIA BANCARIA ================= */}
      {pantallaActual === 'detalles_transferencia' && (
        <div className="max-w-md mx-auto mt-10 bg-white p-10 rounded-[40px] shadow-2xl border border-blue-100 text-center">
          <span className="text-6xl block mb-6">🏦</span><h2 className="text-3xl font-black mb-2 text-slate-800">Datos para tu pago</h2><p className="text-slate-500 font-medium mb-6">Transfiere el total exacto y envía comprobante por WhatsApp.</p>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 text-left space-y-4">
            <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Banco</p><p className="font-bold text-lg text-slate-800">{configGlobal.banco}</p></div>
            <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cuenta / CLABE</p><p className="font-black text-xl text-blue-600 tracking-wider">{configGlobal.cuenta}</p></div>
            <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">A nombre de</p><p className="font-bold text-lg text-slate-800">{configGlobal.titular}</p></div>
            <div className="pt-4 border-t border-slate-200"><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total a pagar</p><p className="font-black text-3xl text-slate-800">${calcularTotal()}</p></div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl mb-8">
            <p className="text-sm font-bold text-emerald-800 mb-2">📲 Envía tu comprobante con la orden:</p><p className="text-3xl font-black text-emerald-600 mb-2">#{numeroPedidoReal}</p><p className="text-lg font-bold text-slate-700">WhatsApp: {configGlobal.whatsapp}</p>
          </div>
          <button onClick={procesarTransferencia} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg hover:bg-blue-700">Ya envié mi comprobante</button>
        </div>
      )}

      {/* ================= VISTA FINALIZADO ================= */}
      {pantallaActual === 'finalizado' && (
        <div className="max-w-2xl mx-auto mt-20 text-center animate-in zoom-in">
          <div className="bg-emerald-100 text-emerald-600 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 text-6xl shadow-inner">✓</div>
          <h2 className="text-6xl font-black mb-4 texto-destacado">¡Orden Registrada!</h2>
          <p className="text-3xl text-slate-500 mb-6">Tu número de orden es el <span className="text-slate-900 font-black text-6xl block mt-4 mb-8">#{numeroPedidoReal}</span></p>
          
          {(metodoPagoFinal === 'Tarjeta' || metodoPagoFinal === 'Transferencia' || metodoPagoFinal === 'Efectivo') && (
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-3xl mb-12 max-w-lg mx-auto">
              <p className="text-blue-800 font-black text-xl">Por favor, pasa a la CAJA para {metodoPagoFinal === 'Efectivo' ? 'realizar tu pago' : 'validar tu pago'}.</p>
              <p className="text-blue-600 font-medium mt-2">Tu pedido comenzará a prepararse una vez validado.</p>
            </div>
          )}

          <button onClick={reiniciarKiosco} className="bg-slate-200 px-12 py-5 rounded-2xl font-black text-slate-700 hover:bg-slate-800 hover:text-white transition-all shadow-md">Finalizar ({contador}s)</button>
        </div>
      )}

      {/* ================= MODALES (PRODUCTO Y NIP) ================= */}
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-[40px] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] border border-slate-100">
            <h2 className="text-3xl font-black text-center mb-1 text-slate-800">{productoEnEspera.nombre}</h2>
            {productoEnEspera.descripcion && <p className="text-center text-slate-500 font-medium mb-4 px-2 text-sm italic leading-relaxed">"{productoEnEspera.descripcion}"</p>}
            <p className="text-center text-slate-400 font-bold mb-4 uppercase tracking-widest text-xs border-b pb-4">Personaliza tu orden</p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {Object.entries(agruparVariaciones(productoEnEspera.opciones)).map(([categoria, opcionesGrupo]) => ( 
                <div key={categoria} className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 shadow-sm">
                  <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2"><span>🏷️</span> {categoria}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {opcionesGrupo.map((o, idx) => { 
                      const estaSeleccionado = variacionesSeleccionadas[categoria]?.nombre === o.nombre; 
                      return ( 
                        <button key={idx} onClick={() => seleccionarVariacion(categoria, o)} className={`p-4 rounded-2xl border-2 transition-all font-bold flex flex-col items-center justify-center text-center ${estaSeleccionado ? 'border-blue-600 bg-blue-600 text-white shadow-md transform scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}>
                          <span className="text-lg leading-tight">{o.nombre}</span>
                          <span className={`text-xs mt-1 font-black uppercase tracking-wider ${estaSeleccionado ? 'text-blue-200' : 'text-slate-400'}`}>{categoria === 'Tamaño' ? `$${o.precioExtra}` : (o.precioExtra > 0 ? `+$${o.precioExtra}` : 'Gratis')}</span>
                        </button> 
                      ); 
                    })}
                  </div>
                </div> 
              ))}

              {productoEnEspera.opciones?.filter(o => o.tipo === 'base').length > 0 && ( 
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Quitar Ingredientes</h4>
                  <div className="space-y-2">
                    {productoEnEspera.opciones.filter(o => o.tipo === 'base').map((o, idx) => { 
                      const estaRemovido = ingredientesRemovidos.includes(o.nombre); 
                      return ( 
                        <button key={idx} onClick={() => toggleIngredienteBase(o.nombre)} className={`w-full flex justify-between p-4 rounded-2xl border-2 transition-all font-bold ${estaRemovido ? 'border-red-200 bg-red-50 text-red-500' : 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                          <span className={estaRemovido ? 'line-through' : ''}>{o.nombre}</span><span>{estaRemovido ? 'Sin ❌' : 'Con ✅'}</span>
                        </button> 
                      ); 
                    })}
                  </div>
                </div> 
              )}

              {obtenerExtrasDisponibles().length > 0 && ( 
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Agrega Extras</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {obtenerExtrasDisponibles().map((o, idx) => { 
                      const seleccionado = extrasAgregados.find(e => e.nombre === o.nombre); 
                      return ( 
                        <button key={idx} onClick={() => toggleExtra(o)} className={`p-4 rounded-2xl border-2 transition-all font-bold flex flex-col items-center justify-center text-center ${seleccionado ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300 text-slate-600'}`}>
                          <span className="text-sm">{o.nombre}</span><span className="text-xs mt-1">{o.precioExtra > 0 ? `+$${o.precioExtra}` : 'Gratis'}</span>
                        </button> 
                      ); 
                    })}
                  </div>
                </div> 
              )}
              
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Notas</h4>
                <textarea placeholder="Instrucciones al chef..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 ring-blue-500 resize-none h-24 font-medium text-slate-800" value={notaEspecial} onChange={(e) => setNotaEspecial(e.target.value)}></textarea>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 mt-4 flex items-center justify-between">
              {!itemEditandoIdTicket && ( 
                <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-xl border border-slate-200">
                  <button onClick={() => setCantidadProducto(c => Math.max(1, c - 1))} className="w-10 h-10 bg-white rounded-lg font-black text-xl shadow-sm text-slate-600 hover:text-blue-600">-</button>
                  <span className="font-black text-xl w-6 text-center text-slate-800">{cantidadProducto}</span>
                  <button onClick={() => setCantidadProducto(c => c + 1)} className="w-10 h-10 bg-white rounded-lg font-black text-xl shadow-sm text-slate-600 hover:text-blue-600">+</button>
                </div> 
              )}
              <div className="text-right flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase">Total Platillo</p>
                <p className="text-3xl font-black text-blue-600">${(Number(productoEnEspera.precio_base) + extrasAgregados.reduce((s, e) => s + e.precioExtra, 0) + Object.values(variacionesSeleccionadas).reduce((s, v) => s + (v.precioExtra || 0), 0)) * cantidadProducto}</p>
              </div>
            </div>

            <div className="flex gap-4 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => { setProductoEnEspera(null); setItemEditandoIdTicket(null); }} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
              <button onClick={confirmarYAgregar} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition shadow-lg text-lg">
                {itemEditandoIdTicket ? 'Actualizar' : `Añadir (${cantidadProducto})`}
              </button>
            </div>
          </div>
        </div> 
      )}

    </div>
  );
};

export default Kiosco;