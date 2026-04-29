import React, { useState } from 'react';

const MenuPrincipal = ({ 
  configGlobal, productos, clasificaciones, carrito, setCarrito, 
  baseUrl, setPantallaActual, pedidoEditandoId, clienteActivo, 
  descuentoPuntos, setModalNip, calcularTotal, setProductoEnEspera, setItemAEditar 
}) => {
  const [categoriaActiva, setCategoriaActiva] = useState(null);

  // === LÓGICA DE NEGOCIO CERRADO ===
  // Verificamos si el backend nos dice que está cerrado (manejamos booleanos o strings por si acaso)
  const isCerrado = configGlobal.negocio_abierto === false || configGlobal.negocio_abierto === 'false' || configGlobal.negocio_abierto === 0;
  const mensajeCierre = configGlobal.mensaje_cierre || 'El negocio se encuentra cerrado temporalmente. Por favor, vuelve más tarde.';

  // === FUNCIONES DE UTILIDAD PARA EL CARRITO ===
  const cambiarCantidadCart = (idTicket, delta) => {
    setCarrito(carrito.map(item => {
      if (item.idTicket === idTicket) {
        const nuevaCant = (item.cantidad || 1) + delta;
        return { ...item, cantidad: Math.max(1, nuevaCant) };
      }
      return item;
    }));
  };

  const quitarDelCarrito = (idTicket) => {
    setCarrito(carrito.filter(i => i.idTicket !== idTicket));
  };

  // Prepara la edición abriendo el modal con los datos del item
  const editarItem = (item) => {
    const productoOriginal = productos.find(p => p.id === item.id || p.nombre === item.nombre);
    if (!productoOriginal) return alert("Este producto ya no existe.");
    setItemAEditar(item);
    setProductoEnEspera(productoOriginal);
  };

  const abrirModalProducto = (p) => {
    setItemAEditar(null);
    setProductoEnEspera(p);
  };

  const categoriasUnicas = [...new Set(productos.map(p => p.categoria || 'General'))];
  const productosFiltrados = productos.filter(p => (p.categoria || 'General') === categoriaActiva);

  const getPortadaCategoria = (catName) => {
    const clasifDB = clasificaciones.find(c => c.nombre === catName);
    return { imagen_url: clasifDB?.imagen_url || null, emoji: clasifDB?.emoji || '🍽️' };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[75vh]">
      {/* SECCIÓN IZQUIERDA: MENÚ */}
      <div className="w-full lg:w-2/3 flex flex-col h-full">
        
        {/* 👇 ALERTA DE NEGOCIO CERRADO */}
        {isCerrado && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-2xl mb-6 shadow-sm flex items-center gap-4">
            <span className="text-4xl">⏸️</span>
            <div>
              <p className="font-black text-red-700 text-lg uppercase tracking-widest">Negocio Cerrado</p>
              <p className="font-bold text-red-600 mt-1">{mensajeCierre}</p>
            </div>
          </div>
        )}

        {!categoriaActiva ? (
          <div className="flex flex-col h-full">
            <h2 className="text-4xl font-black mb-8 text-slate-800">{configGlobal.kiosco_mensaje || '¿Qué se te antoja hoy?'}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-6 pr-2">
              {categoriasUnicas.map(cat => {
                const portada = getPortadaCategoria(cat);
                return (
                  <button key={cat} onClick={() => setCategoriaActiva(cat)} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col items-center justify-center active:scale-95 transition-all hover:shadow-lg min-h-[220px] group">
                    {portada.imagen_url ? (
                      <img src={portada.imagen_url?.startsWith('http') ? portada.imagen_url : `${baseUrl}${portada.imagen_url}`} alt={cat} className="w-24 h-24 object-cover rounded-full shadow-md mb-6 group-hover:scale-110 transition-transform" />
                    ) : (
                      <span className="text-7xl mb-6 group-hover:scale-110 transition-transform">{portada.emoji}</span>
                    )}
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
                const tieneOpciones = p.opciones?.length > 0;
                return (
                  <button key={p.id} onClick={() => abrirModalProducto(p)} className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 flex flex-col items-center active:scale-95 transition-transform hover:shadow-md hover:border-blue-200">
                    {p.imagen_url ? (
                      <img src={p.imagen_url?.startsWith('http') ? p.imagen_url : `${baseUrl}${p.imagen_url}`} alt={p.nombre} className="w-28 h-28 object-cover rounded-2xl shadow-sm mb-4" />
                    ) : (
                      <span className="text-6xl mb-4 bg-slate-50 w-28 h-28 flex items-center justify-center rounded-2xl">{p.emoji}</span>
                    )}
                    <h3 className="text-xl font-bold text-center leading-tight text-slate-700">{p.nombre}</h3>
                    <span className={`mt-4 px-4 py-2 rounded-full font-black ${tieneOpciones ? 'bg-emerald-50 text-emerald-600 text-sm' : 'bg-slate-100 text-blue-600'}`}>
                      {tieneOpciones ? 'Personalizar' : `$${p.precio_base}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN DERECHA: CARRITO */}
      <div className="w-full lg:w-1/3 bg-white rounded-[40px] shadow-xl p-8 border flex flex-col h-full relative">
        {pedidoEditandoId && (<div className="absolute top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 rounded-t-[40px] text-xs font-black uppercase tracking-widest shadow-md">Editando Orden Activa</div>)}
        <h2 className={`text-2xl font-black mb-6 border-b pb-4 text-slate-800 ${pedidoEditandoId ? 'mt-4' : ''}`}>Tu Orden</h2>
        
        <div className="flex-1 overflow-y-auto pr-2">
          {carrito.length === 0 ? (
            <div className="text-center py-20 opacity-20"><span className="text-6xl block mb-4">🛒</span><p className="font-bold">Tu carrito está vacío</p></div>
          ) : (
            carrito.map((item) => (
              <div key={item.idTicket} className="flex justify-between items-start mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex-1 pr-2">
                  <span className="font-black block text-lg text-slate-700">
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
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <button onClick={() => cambiarCantidadCart(item.idTicket, -1)} className="px-3 py-1 font-black text-slate-500 hover:bg-slate-100">-</button>
                    <span className="px-2 py-1 font-black text-slate-800 text-sm">{item.cantidad || 1}</span>
                    <button onClick={() => cambiarCantidadCart(item.idTicket, 1)} className="px-3 py-1 font-black text-slate-500 hover:bg-slate-100">+</button>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => editarItem(item)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-xl bg-white shadow-sm border border-slate-100">✏️</button>
                    <button onClick={() => quitarDelCarrito(item.idTicket)} className="p-2 text-red-500 hover:bg-red-100 rounded-xl bg-white shadow-sm border border-slate-100">❌</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t mt-auto space-y-4">
          {clienteActivo && clienteActivo.puntos > 0 && !descuentoPuntos && carrito.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex justify-between items-center">
              <div className="text-sm"><p className="font-black text-blue-900">🎁 Tienes {clienteActivo.puntos} Puntos</p><p className="text-blue-600 font-medium">Equivalen a ${clienteActivo.puntos} MXN</p></div>
              <button onClick={() => setModalNip(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700">Canjear</button>
            </div>
          )}
          {descuentoPuntos > 0 && (
            <div className="flex justify-between items-center text-emerald-600 font-black"><span className="uppercase tracking-widest text-xs">Puntos Aplicados:</span><span>-${descuentoPuntos}</span></div>
          )}
          <div className="flex justify-between items-center mb-2"><span className="text-slate-500 font-black uppercase tracking-widest">Total:</span><span className="text-4xl font-black text-slate-800">${calcularTotal()}</span></div>
          
          {/* 👇 BOTÓN BLOQUEADO SI ESTÁ CERRADO */}
          <button 
            onClick={() => setPantallaActual('consumo')} 
            disabled={carrito.length === 0 || isCerrado} 
            className={`w-full text-white py-5 rounded-2xl text-xl font-black shadow-lg disabled:shadow-none transition-transform active:scale-95 ${
              isCerrado 
                ? 'bg-red-500 cursor-not-allowed opacity-50' 
                : (carrito.length === 0 ? 'bg-slate-300' : (pedidoEditandoId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'))
            }`}
          >
            {isCerrado ? 'Fuera de Horario' : (pedidoEditandoId ? 'Guardar Cambios' : 'Confirmar Orden')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuPrincipal;