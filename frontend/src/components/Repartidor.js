import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, LogOut, Layers, MapPin, Phone, MessageCircle, Banknote, ShoppingBag, Bell, CheckCircle2, AlertTriangle, Package, History } from 'lucide-react';

const Repartidor = ({ user, onLogout }) => {
  const [pedidosPool, setPedidosPool] = useState([]);
  const [misViajes, setMisViajes] = useState([]); 
  const [historial, setHistorial] = useState([]); 
  const [tabActiva, setTabActiva] = useState('disponibles'); 
  const [cargando, setCargando] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertaUI, setAlertaUI] = useState(null);
  const [confirmarEntregaId, setConfirmarEntregaId] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  const mostrarAlerta = (mensaje, tipo = 'info') => {
    setAlertaUI({ mensaje, tipo });
    setTimeout(() => setAlertaUI(null), 3000);
  };

  const cargarDatosLogistica = useCallback(async () => {
    try {
      const [resPool, resMisViajes, resHistorial] = await Promise.all([
        fetch(`${apiUrl}/reparto/disponibles`),
        fetch(`${apiUrl}/reparto/mis-viajes/${user.id}`),
        fetch(`${apiUrl}/reparto/historial/${user.id}`)
      ]);
      const dataPool = await resPool.json();
      const dataMisViajes = await resMisViajes.json();
      const dataHistorial = await resHistorial.json();

      setPedidosPool(Array.isArray(dataPool) ? dataPool : []);
      setMisViajes(Array.isArray(dataMisViajes) ? dataMisViajes : []);
      setHistorial(Array.isArray(dataHistorial) ? dataHistorial : []);
    } catch (error) {
      console.error("Error cargando la consola de reparto:", error);
    } finally {
      setCargando(false);
    }
  }, [apiUrl, user.id]);

  useEffect(() => {
    cargarDatosLogistica();
    const intervalo = setInterval(cargarDatosLogistica, 5000);
    return () => clearInterval(intervalo);
  }, [cargarDatosLogistica]);

  const tomarPedido = async (pedidoId) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/reparto/tomar/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repartidor_id: user.id })
      });
      if (res.ok) {
        await cargarDatosLogistica();
        setTabActiva('mi_ruta'); 
        mostrarAlerta("¡Orden asignada con éxito! Conduce con cuidado.", "success");
      } else {
        const err = await res.json();
        mostrarAlerta(err.error || "No se pudo tomar la orden.", "error");
      }
    } catch (e) {
      mostrarAlerta("Error de red al intentar asignar la orden.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const notificarLlegadaCaja = async (pedidoId) => {
    try {
      await fetch(`${apiUrl}/pedidos/${pedidoId}/alerta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerta_cocina: `[REPARTIDOR] El repartidor ${user.nombre} está afuera del domicilio.` })
      });
      mostrarAlerta("Aviso enviado a la sucursal.", "success");
    } catch (e) {
      mostrarAlerta("No se pudo conectar con la sucursal.", "error");
    }
  };

  const notificarLlegadaCliente = async (pedidoId) => {
    try {
      await fetch(`${apiUrl}/pedidos/${pedidoId}/alerta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificar_cliente: true })
      });
      mostrarAlerta("El cliente ha sido notificado.", "success");
    } catch (e) {
      mostrarAlerta("No se pudo notificar al cliente.", "error");
    }
  };

  const finalizarEntrega = async (pedidoId) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/reparto/entregar/${pedidoId}`, { method: 'PUT' });
      if (res.ok) {
        setConfirmarEntregaId(null);
        await cargarDatosLogistica();
        if (misViajes.length <= 1) setTabActiva('disponibles'); 
        mostrarAlerta("¡Entrega finalizada con éxito!", "success");
      }
    } catch (e) {
      mostrarAlerta("Error de conexión al cerrar la entrega.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 👇 FIX MÁSTER DE EXTRACCIÓN Y LIMPIEZA DE DIRECCIONES
  const getInstruccionCobro = (dirRaw) => {
    if (!dirRaw) return null;
    const match = dirRaw.match(/\[(.*?)\]/);
    return match ? match[1] : null;
  };

  const getDireccionLimpia = (dirRaw) => {
    if (!dirRaw) return 'Dirección no especificada';
    let dir = dirRaw;
    
    // 1. Elimina instrucciones en corchetes
    dir = dir.replace(/\[.*?\]/g, ''); 
    // 2. Elimina prefijos de Nombre
    dir = dir.replace(/A NOMBRE DE:\s*([^|]+)/gi, '');
    // 3. Elimina teléfonos (dejan un rastro sucio si no se limpian globalmente)
    dir = dir.replace(/TEL:\s*\d*/gi, '').replace(/CONTACTO:\s*\d*/gi, '');
    
    // 4. Limpieza Inteligente de Separadores (Pipes)
    dir = dir.split('|')
             .map(parte => parte.trim())
             .filter(parte => parte.length > 0) // Borra los vacíos que antes rompían la lógica
             .join(', '); // Los une limpiamente
    
    return dir.trim() || 'Dirección no especificada';
  };

  const getNombreExtraido = (pedido) => {
    if (pedido.cliente_nombre && pedido.cliente_nombre !== 'Invitado') return pedido.cliente_nombre;
    if (pedido.direccion_entrega && pedido.direccion_entrega.includes('A NOMBRE DE:')) {
      const match = pedido.direccion_entrega.match(/A NOMBRE DE:\s*([^|]+)/i);
      if (match && match[1]) return match[1].trim();
    }
    return 'Cliente Frecuente';
  };

  const getTelefonoExtraido = (pedido) => {
    if (pedido.cliente_telefono) return pedido.cliente_telefono;
    if (pedido.direccion_entrega && pedido.direccion_entrega.includes('TEL:')) {
      const match = pedido.direccion_entrega.match(/TEL:\s*(\d+)/i);
      if (match && match[1]) return match[1].trim();
    }
    return null;
  };

  const getCarrito = (pedido) => {
    try { return typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : pedido.carrito; }
    catch(e) { return []; }
  };

  const abrirMapaOriginal = (direccionBruta) => {
    const dirLimpia = getDireccionLimpia(direccionBruta);
    if (!dirLimpia || dirLimpia === 'Dirección no especificada') return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dirLimpia)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 relative">
      
      {/* TOAST NOTIFICATION */}
      {alertaUI && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[999] animate-in slide-in-from-top-4 fade-in duration-300 w-[90%] max-w-sm">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-md border ${
            alertaUI.tipo === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-red-500/90 border-red-400 text-white'
          }`}>
            {alertaUI.tipo === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            <p className="font-bold text-sm tracking-wide leading-tight">{alertaUI.mensaje}</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-slate-900 border-b border-slate-800 p-5 sticky top-0 z-40 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-white">
            <Navigation size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight">{user.nombre}</h1>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">🛵 Repartidor en Línea</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 bg-slate-950 hover:bg-red-900/40 text-slate-400 hover:text-red-400 p-3 rounded-xl font-bold transition border border-slate-800 text-xs uppercase tracking-wider">
          <LogOut size={16}/> Salir
        </button>
      </div>

      {/* TABS SELECTOR */}
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setTabActiva('disponibles')}
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${tabActiva === 'disponibles' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Layers size={14}/> Listos ({pedidosPool.length})
          </button>
          <button
            onClick={() => setTabActiva('mi_ruta')}
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative ${tabActiva === 'mi_ruta' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <MapPin size={14}/> Mi Ruta ({misViajes.length})
            {misViajes.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-300 rounded-full animate-ping"></span>}
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${tabActiva === 'historial' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <History size={14}/> Historial
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="p-4 max-w-xl mx-auto space-y-4">
        {cargando ? (
          <div className="text-center py-20 font-bold text-slate-500 animate-pulse text-sm uppercase tracking-widest">Sincronizando rutas...</div>
        ) : tabActiva === 'disponibles' ? (
          <>
            {pedidosPool.map(p => {
              const instruccionPool = getInstruccionCobro(p.direccion_entrega);
              return (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4 animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-black text-white">Orden #{p.numero_pedido}</h3>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Monto total: <span className="text-blue-400 font-black">${p.total}</span></p>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${p.metodo_pago === 'Efectivo' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-blue-950 text-blue-400 border border-blue-800'}`}>
                      💵 Pago: {p.metodo_pago}
                    </span>
                  </div>
                  
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><MapPin size={10}/> Destino de Entrega</p>
                      {/* DIRECCIÓN CORREGIDA EN EL POOL */}
                      <p className="text-sm font-bold text-slate-200 mt-1 leading-snug">{getDireccionLimpia(p.direccion_entrega)}</p>
                    </div>
                    {instruccionPool && (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg flex items-center gap-1.5 mt-2">
                        <Banknote size={12} className="text-amber-400 shrink-0" />
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider">{instruccionPool}</p>
                      </div>
                    )}
                  </div>
                  
                  <button
                    disabled={isSubmitting}
                    onClick={() => tomarPedido(p.id)}
                    className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Package size={18}/> Tomar este pedido
                  </button>
                </div>
              );
            })}
            {pedidosPool.length === 0 && (
              <div className="text-center py-16 bg-slate-900 rounded-3xl border border-slate-800 border-dashed text-slate-500 font-bold text-sm">
                <Package size={40} className="mx-auto mb-2 opacity-30"/>
                Sin pedidos listos para reparto por el momento.
              </div>
            )}
          </>
        ) : tabActiva === 'mi_ruta' ? (
          <>
            {misViajes.map(viaje => {
              const esDeuda = ['Pendiente', 'Por Cobrar'].includes(viaje.metodo_pago);
              return (
                <div key={viaje.id} className="bg-slate-900 border-2 border-emerald-600 rounded-[36px] p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 mb-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded uppercase tracking-widest">En Ruta</span>
                      <h2 className="text-3xl font-black text-white mt-1">Pedido #{viaje.numero_pedido}</h2>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${esDeuda ? 'text-slate-500' : 'text-emerald-500'}`}>
                        {esDeuda ? 'Cobro Neto' : 'Estado de Pago'}
                      </p>
                      <p className={`text-2xl font-black ${esDeuda ? 'text-white' : 'text-emerald-400'}`}>
                        {esDeuda ? `$${viaje.total}` : '✅ PAGADO'}
                      </p>
                    </div>
                  </div>

                  {/* Cliente y Contacto */}
                  <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Phone size={10}/> Destinatario</p>
                      <p className="text-base font-black text-slate-200 mt-0.5">{getNombreExtraido(viaje)}</p>
                      {getTelefonoExtraido(viaje) && (
                        <p className="text-xs font-bold text-emerald-500 mt-1 flex items-center gap-1.5"><MessageCircle size={14}/> {getTelefonoExtraido(viaje)}</p>
                      )}
                    </div>
                    {getTelefonoExtraido(viaje) && (
                      <div className="flex gap-2">
                        <a href={`tel:${getTelefonoExtraido(viaje)}`} className="bg-slate-800 hover:bg-slate-700 text-white p-3.5 rounded-xl transition border border-slate-700 active:scale-95" title="Llamar">
                          <Phone size={18}/>
                        </a>
                        <a href={`https://wa.me/52${getTelefonoExtraido(viaje)}`} target="_blank" rel="noopener noreferrer" className="bg-emerald-900/30 hover:bg-emerald-800 text-emerald-400 p-3.5 rounded-xl transition border border-emerald-800/50 active:scale-95" title="WhatsApp">
                          <MessageCircle size={18}/>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Dirección y Mapa */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><MapPin size={10}/> Dirección de Envío</p>
                      {/* DIRECCIÓN CORREGIDA EN MI RUTA */}
                      <p className="text-sm font-bold text-slate-300 mt-1 leading-snug">{getDireccionLimpia(viaje.direccion_entrega)}</p>
                    </div>
                    {getInstruccionCobro(viaje.direccion_entrega) && (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-start gap-2 mt-2">
                        <Banknote size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs font-black text-amber-400 uppercase tracking-wider leading-snug">
                          {getInstruccionCobro(viaje.direccion_entrega)}
                        </p>
                      </div>
                    )}
                    <button onClick={() => abrirMapaOriginal(viaje.direccion_entrega)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl transition border border-slate-700 flex items-center justify-center gap-2 uppercase tracking-wider active:scale-95 shadow-sm mt-2">
                      <Navigation size={14} className="text-emerald-400"/> Abrir en Google Maps
                    </button>
                  </div>

                  {/* Desglose */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1"><ShoppingBag size={12}/> Contenido del Pedido</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                      {getCarrito(viaje).map((item, idx) => (
                        <div key={idx} className="text-sm font-bold text-slate-300 flex justify-between border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                          <span>{item.cantidad || 1}x {item.nombre}</span>
                          <span className="text-slate-500 text-[10px] md:text-xs text-right max-w-[50%] leading-tight">{item.extras?.map(e => e.nombre).join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alertas */}
                  <div className="flex gap-3">
                    <button onClick={() => notificarLlegadaCaja(viaje.id)} className="flex-1 py-3 bg-amber-900/20 text-amber-400 font-black text-[10px] sm:text-xs rounded-xl border border-amber-900/50 flex flex-col items-center justify-center gap-1 active:scale-95">
                      <Bell size={18}/> <span>Avisar a Sucursal</span>
                    </button>
                    <button onClick={() => notificarLlegadaCliente(viaje.id)} className="flex-1 py-3 bg-blue-900/20 text-blue-400 font-black text-[10px] sm:text-xs rounded-xl border border-blue-900/50 flex flex-col items-center justify-center gap-1 active:scale-95">
                      <MessageCircle size={18}/> <span>Avisar al Cliente</span>
                    </button>
                  </div>

                  {/* Finalizar */}
                  <button
                    disabled={isSubmitting}
                    onClick={() => setConfirmarEntregaId(viaje.id)}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-500/20 transition active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    <CheckCircle2 size={20}/> Finalizar Entrega y Cobro
                  </button>
                </div>
              )
            })}
            {misViajes.length === 0 && (
              <div className="text-center py-20 bg-slate-900 rounded-3xl border border-slate-800 border-dashed text-slate-500 font-bold text-sm">
                <MapPin size={40} className="mx-auto mb-2 opacity-30"/>
                No tienes viajes en curso.<br/><span className="text-xs font-normal">Ve a la pestaña "Listos" para tomar uno.</span>
              </div>
            )}
          </>
        ) : (
          <>
            {/* VISTA 3: HISTORIAL DEL DÍA */}
            <div className="mb-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center shadow-sm">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Entregas de Hoy</p>
                <p className="text-xl font-black text-white">{historial.length} Órdenes</p>
              </div>
              <History size={32} className="text-slate-700"/>
            </div>

            <div className="space-y-3">
              {historial.map(viaje => (
                <div key={viaje.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm opacity-80 hover:opacity-100 transition-all flex flex-col gap-2 animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-white">#{viaje.numero_pedido}</h3>
                    <span className="text-[10px] font-black bg-emerald-950 text-emerald-400 px-2 py-1 rounded border border-emerald-800 uppercase tracking-widest">
                      {viaje.estado_preparacion}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-400 line-clamp-1 flex items-center gap-1.5">
                    <MapPin size={12} className="shrink-0 text-slate-500"/>
                    {getDireccionLimpia(viaje.direccion_entrega)}
                  </p>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest border-t border-slate-800 pt-2 mt-1">
                    Monto cobrado: <span className="text-emerald-500">${viaje.total}</span>
                  </p>
                </div>
              ))}
              {historial.length === 0 && (
                <div className="text-center py-16 bg-slate-900 rounded-3xl border border-slate-800 border-dashed text-slate-500 font-bold text-sm">
                  <History size={40} className="mx-auto mb-2 opacity-30"/>
                  Aún no has entregado pedidos hoy.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN DE ENTREGA */}
      {confirmarEntregaId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-800">
            <div className="w-20 h-20 bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">¿Confirmar Entrega?</h3>
            <p className="text-slate-400 font-medium mb-8 text-sm">
              Al confirmar declaras que has entregado el pedido y recibido el cobro (en caso de ser efectivo).
            </p>
            <div className="flex gap-4">
              <button disabled={isSubmitting} onClick={() => setConfirmarEntregaId(null)} className="flex-1 py-4 bg-slate-800 text-slate-300 font-black rounded-2xl hover:bg-slate-700 transition active:scale-95 disabled:opacity-50">
                Atrás
              </button>
              <button disabled={isSubmitting} onClick={() => finalizarEntrega(confirmarEntregaId)} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg hover:bg-emerald-500 transition active:scale-95 disabled:opacity-50">
                {isSubmitting ? 'Cerrando...' : 'Entregado'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Repartidor;