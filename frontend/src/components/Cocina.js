import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChefHat, CheckCircle2, Clock, AlertTriangle, MonitorPlay, LogOut } from 'lucide-react';
import io from 'socket.io-client';

const Cocina = ({ user, onLogout }) => {
  const [pedidos, setPedidos] = useState([]);
  const [configGlobal, setConfigGlobal] = useState(null);
  const [vistaActiva, setVistaActiva] = useState('Pendiente'); 
  const [horaActual, setHoraActual] = useState(new Date());
  
  const [paginaActual, setPaginaActual] = useState(1);
  const pedidosPorPagina = 8;
  const audioRef = useRef(new Audio('/campana.mp3'));
  const prevPedidosCount = useRef(0);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  // 1. CARGAR CONFIGURACIÓN GLOBAL (TIEMPO REAL)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/configuracion?t=${new Date().getTime()}`);
        const data = await res.json();
        // Filtro inteligente para no repintar la pantalla innecesariamente
        setConfigGlobal(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data)) return data;
            return prev;
        });
      } catch (error) {
        console.error("Error al cargar config", error);
      }
    };
    
    fetchConfig();
    const intervaloConfig = setInterval(fetchConfig, 3000); 
    return () => clearInterval(intervaloConfig);
  }, [apiUrl]);

  // 2. OBTENER PEDIDOS Y CONTROL DE ALERTAS (MEMORIZADO)
  const fetchPedidos = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/pedidos/hoy`);
      let data = await res.json();
      
      // La cocina solo ve pedidos Pagados o en Preparación
      data = data.filter(p => p.estado_preparacion === 'Pagado' || p.estado_preparacion === 'Preparando');
      
      if (data.length > prevPedidosCount.current) {
        audioRef.current.play().catch(e => console.log('Bloqueo de audio por navegador'));
      }
      prevPedidosCount.current = data.length;

      setPedidos(data);
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos, vistaActiva, paginaActual]);

  // 3. CONEXIÓN SOCKET PARA PEDIDOS EN TIEMPO REAL
  useEffect(() => {
    const nuevoSocket = io(apiUrl.replace('/api', ''));

    nuevoSocket.on('nuevo_pedido', () => { fetchPedidos(); });
    nuevoSocket.on('pedido_actualizado', () => { fetchPedidos(); });
    nuevoSocket.on('pedido_eliminado', () => { fetchPedidos(); });

    return () => nuevoSocket.disconnect();
  }, [apiUrl, fetchPedidos]);

  // 4. RELOJ
  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const actualizarEstadoPedido = async (id, nuevoEstado) => {
    try {
      await fetch(`${apiUrl}/pedidos/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_preparacion: nuevoEstado })
      });
      fetchPedidos();
    } catch (error) {
      console.error("Error al actualizar pedido", error);
    }
  };

  const enviarAlertaCaja = async (id, itemIdx, itemNombre) => {
    try {
      await fetch(`${apiUrl}/pedidos/${id}/alerta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerta_cocina: `[IDX:${itemIdx}] FALTA INGREDIENTE: EN ${itemNombre}` })
      });
      fetchPedidos();
    } catch (error) { console.error(error); }
  };

  const colorFondo = configGlobal?.color_fondo || '#f1f5f9';
  const colorPrimario = configGlobal?.color_primario || '#2563eb';

  // Filtrado de pestañas
  let pedidosFiltrados = pedidos;
  if (vistaActiva === 'Pendiente') pedidosFiltrados = pedidos.filter(p => p.estado_preparacion === 'Pagado');
  if (vistaActiva === 'Preparando') pedidosFiltrados = pedidos.filter(p => p.estado_preparacion === 'Preparando');

  const indiceUltimoPedido = paginaActual * pedidosPorPagina;
  const indicePrimerPedido = indiceUltimoPedido - pedidosPorPagina;
  const pedidosPagina = pedidosFiltrados.slice(indicePrimerPedido, indiceUltimoPedido);
  const totalPaginas = Math.ceil(pedidosFiltrados.length / pedidosPorPagina);

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-500" style={{ backgroundColor: colorFondo }}>
      
      {/* HEADER DINÁMICO */}
      <header className="text-white p-4 shadow-xl flex justify-between items-center shrink-0 z-10" style={{ backgroundColor: colorPrimario }}>
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
             <ChefHat size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{configGlobal?.nombre_negocio || 'Cocina KDS'}</h1>
            <p className="text-sm font-bold opacity-80 uppercase tracking-widest">{user?.nombre || 'Chef'} • Módulo Operativo</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/10 p-2 rounded-2xl backdrop-blur-sm">
          <button onClick={() => setVistaActiva('Pendiente')} className={`px-6 py-3 rounded-xl font-black transition-all ${vistaActiva === 'Pendiente' ? 'bg-white text-slate-800 shadow-lg scale-105' : 'text-white hover:bg-white/20'}`}>
            Nuevos ({pedidos.filter(p => p.estado_preparacion === 'Pagado').length})
          </button>
          <button onClick={() => setVistaActiva('Preparando')} className={`px-6 py-3 rounded-xl font-black transition-all ${vistaActiva === 'Preparando' ? 'bg-white text-slate-800 shadow-lg scale-105' : 'text-white hover:bg-white/20'}`}>
            En Fuego ({pedidos.filter(p => p.estado_preparacion === 'Preparando').length})
          </button>
        </div>

        <div className="flex items-center gap-6">
           <div className="text-right hidden md:block">
             <p className="text-2xl font-black">{horaActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
             <p className="text-xs font-bold opacity-80 uppercase">{horaActual.toLocaleDateString()}</p>
           </div>
           {/* BOTÓN PARA ABRIR LA TV */}
           <button onClick={() => window.open('/tv', '_blank')} className="bg-emerald-500 hover:bg-emerald-400 text-white p-3 rounded-xl transition shadow-lg flex items-center gap-2" title="Abrir Pantalla de Clientes (TV)">
             <MonitorPlay size={24} /> <span className="hidden lg:inline font-bold">Pantalla TV</span>
           </button>
           <button onClick={onLogout} className="bg-red-500 hover:bg-red-400 text-white p-3 rounded-xl transition shadow-lg" title="Cerrar Sesión">
             <LogOut size={24} />
           </button>
        </div>
      </header>

      {/* ÁREA DE TICKETS */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
        {pedidosFiltrados.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60 animate-in fade-in">
             <ChefHat size={100} className="mb-6 opacity-20" />
             <p className="text-3xl font-black tracking-tight text-slate-500">Cocina Limpia</p>
             <p className="text-lg font-bold">No hay pedidos en esta sección.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max overflow-y-auto pr-2 pb-20 custom-scrollbar">
            {pedidosPagina.map(pedido => {
              let carrito = [];
              if (Array.isArray(pedido.carrito)) carrito = pedido.carrito;
              else if (typeof pedido.carrito === 'string') {
                  try { carrito = JSON.parse(pedido.carrito); } catch (e) {}
              }

              const minutosTranscurridos = Math.floor((new Date() - new Date(pedido.fecha_creacion)) / 60000);
              const colorTicket = minutosTranscurridos > 15 ? 'bg-red-50 border-red-200 shadow-red-500/10' : 'bg-white border-slate-200 shadow-slate-300/30';
              const colorHeader = minutosTranscurridos > 15 ? 'bg-red-500 text-white' : 'bg-slate-800 text-white';

              return (
                <div key={pedido.id} className={`flex flex-col rounded-3xl border-2 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 ${colorTicket} transition-colors`}>
                  <div className={`${colorHeader} p-4 flex justify-between items-center shrink-0`}>
                    <div>
                       <span className="text-2xl font-black">#{pedido.numero_pedido}</span>
                       <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{pedido.tipo_consumo}</p>
                    </div>
                    <div className="text-right">
                       <span className="flex items-center gap-1 font-black text-lg bg-black/20 px-2 py-1 rounded-lg">
                          <Clock size={16} /> {minutosTranscurridos}m
                       </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto min-h-[200px] max-h-[300px] custom-scrollbar bg-white/50">
                    <p className="text-sm font-black text-slate-700 mb-4 border-b-2 border-dashed border-slate-200 pb-2 uppercase">{pedido.direccion_entrega || pedido.cliente_nombre || 'Mesa / Invitado'}</p>
                    <ul className="space-y-4">
                      {carrito.map((item, idx) => (
                        <li key={idx} className="relative group">
                          <div className="flex gap-3">
                             <span className="font-black text-lg text-blue-600 bg-blue-50 px-2 rounded-lg h-fit">{item.cantidad || 1}x</span>
                             <div className="flex-1">
                                <p className="font-black text-slate-800 leading-tight">{item.nombre}</p>
                                {item.extras && item.extras.length > 0 && (
                                  <ul className="mt-1 space-y-0.5">
                                    {item.extras.map((ex, i) => (
                                      <li key={i} className="text-xs font-bold text-slate-500 flex items-start gap-1">
                                         <span className="text-orange-400 mt-0.5">•</span> {ex.nombre}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                             </div>
                          </div>
                          
                          {/* BOTÓN ALERTA INGREDIENTE (Solo si NO es una nota) */}
                          {!item.nombre.toLowerCase().includes('nota:') && (
                            <button 
                               onClick={() => enviarAlertaCaja(pedido.id, idx, item.nombre)}
                               className="absolute right-0 top-0 text-red-400 hover:text-white hover:bg-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                               title="Reportar falta de ingrediente a Caja"
                            >
                               <AlertTriangle size={16} />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 shrink-0 bg-slate-50 border-t border-slate-200">
                    {vistaActiva === 'Pendiente' ? (
                      <button 
                        onClick={() => actualizarEstadoPedido(pedido.id, 'Preparando')}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-xl shadow-lg transition active:scale-95 uppercase tracking-widest flex justify-center items-center gap-2"
                      >
                         <ChefHat size={20}/> Preparar
                      </button>
                    ) : (
                      <button 
                        onClick={() => actualizarEstadoPedido(pedido.id, 'Listo')}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg rounded-xl shadow-lg transition active:scale-95 uppercase tracking-widest flex justify-center items-center gap-2"
                      >
                         <CheckCircle2 size={20}/> ¡Listo!
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* PAGINACIÓN */}
      {totalPaginas > 1 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto border border-slate-700">
            <button 
              disabled={paginaActual === 1} 
              onClick={() => setPaginaActual(p => p - 1)}
              className="px-6 py-3 bg-slate-800 text-white rounded-xl font-black disabled:opacity-50 hover:bg-slate-700 transition"
            >
              Anterior
            </button>
            <span className="text-white font-black px-4">Pág {paginaActual} / {totalPaginas}</span>
            <button 
              disabled={paginaActual === totalPaginas} 
              onClick={() => setPaginaActual(p => p + 1)}
              className="px-6 py-3 bg-slate-800 text-white rounded-xl font-black disabled:opacity-50 hover:bg-slate-700 transition"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cocina;