import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Phone, ShoppingBag, LogOut, CheckCircle2, Navigation, Bell, Package, Layers, MessageCircle } from 'lucide-react';  

const Repartidor = ({ user, onLogout }) => {
    const [tabActiva, setTabActiva] = useState('disponibles');
    const [pedidosPool, setPedidosPool] = useState([]);
    const [viajeActivo, setViajeActivo] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);  

    const [confirmarEntregaId, setConfirmarEntregaId] = useState(null);

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';  

    const getCarrito = (p) => {
        if (!p || !p.carrito) return [];
        return typeof p.carrito === 'string' ? JSON.parse(p.carrito) : p.carrito;
    };  

    const getTelefonoExtraido = (p) => {
        let tel = p.cliente_telefono || p.cliente?.telefono || p.telefono;
        if (!tel && typeof p.direccion_entrega === 'string') {
            if (p.direccion_entrega.includes('TEL:')) {
                tel = p.direccion_entrega.split('TEL:')[1].split('|')[0].trim();
            } else if (p.direccion_entrega.includes('CONTACTO:')) {
                tel = p.direccion_entrega.split('CONTACTO:')[1].split('|')[0].trim();
            }
        }
        if (tel) {
            const t = String(tel).replace(/\D/g, '').trim();
            if (t.length >= 10) return t; 
        }
        return null;
    };

    const getDireccionLimpia = (direccionStr) => {
        let dir = direccionStr || '';
        if (dir.includes('|')) {
            dir = dir.split('|')[0]
                .replace(/TEL:\s*\d*/g, '')
                .replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, '')
                .replace(/A NOMBRE DE:\s*(.*)/g, '')
                .trim();
        }
        return dir;
    };

    const cargarDatosLogistica = useCallback(async () => {
        try {
            const [resPool, resMisViajes] = await Promise.all([
                fetch(`${apiUrl}/reparto/disponibles`),
                fetch(`${apiUrl}/reparto/mis-viajes/${user.id}`)
            ]);  
            const dataPool = await resPool.json();
            const dataMisViajes = await resMisViajes.json();  
            
            setPedidosPool(Array.isArray(dataPool) ? dataPool : []);  
            
            if (Array.isArray(dataMisViajes) && dataMisViajes.length > 0) {
                setViajeActivo(dataMisViajes[0]);
                setTabActiva('mi_ruta'); 
            } else {
                setViajeActivo(null);
            }
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
        if (viajeActivo) return; 
        setIsSubmitting(true);  
        try {
            const res = await fetch(`${apiUrl}/reparto/tomar/${pedidoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repartidor_id: user.id })
            });  
            if (res.ok) {
                await cargarDatosLogistica();
            } else {
                const err = await res.json();
                alert(err.error || "No se pudo tomar la orden. Quizá otro repartidor la tomó primero.");
            }
        } catch (e) {
            alert("Error de red al intentar asignar la orden.");
        } finally {
            setIsSubmitting(false);
        }
    };  

    const notificarLlegada = async (pedidoId) => {
        try {
            await fetch(`${apiUrl}/pedidos/${pedidoId}/alerta`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alerta_cocina: `[REPARTIDOR] El repartidor ${user.nombre} está afuera del domicilio.` })
            });
            alert("Notificación de llegada enviada a la sucursal con éxito.");
        } catch (e) {
            console.log("Notificación push/wa falló silenciosamente sin romper la app.");
        }
    };  

    const finalizarEntrega = async (pedidoId) => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/reparto/entregar/${pedidoId}`, {
                method: 'PUT'
            });
            if (res.ok) {
                setViajeActivo(null);
                setTabActiva('disponibles');
                setConfirmarEntregaId(null); 
                await cargarDatosLogistica();
            }
        } catch (e) {
            alert("Error de conexión al cerrar la entrega.");
        } finally {
            setIsSubmitting(false);
        }
    };  

    const abrirMapaOriginal = (direccionBruta) => {
        const dirLimpia = getDireccionLimpia(direccionBruta);
        if (!dirLimpia) return;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dirLimpia)}`;
        window.open(url, '_blank');
    };  

    // 👇 FIX: Identificamos si el pedido en ruta fue pagado online/caja (No le debe efectivo a nadie)
    const esDeuda = viajeActivo && ['Pendiente', 'Por Cobrar'].includes(viajeActivo.metodo_pago);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 relative">
            
            {/* CABEZAL TÁCTIL */}
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

            {/* SELECTOR DE PESTAÑAS */}
            <div className="p-4 max-w-md mx-auto">
                <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
                    <button
                        onClick={() => setTabActiva('disponibles')}
                        className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${tabActiva === 'disponibles' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400'}`}
                    >
                        <Layers size={14}/> Pedidos Listos ({pedidosPool.length})
                    </button>
                    <button
                        onClick={() => setTabActiva('mi_ruta')}
                        className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative ${tabActiva === 'mi_ruta' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400'}`}
                    >
                        <MapPin size={14}/> Mi Ruta Activa
                        {viajeActivo && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>}
                    </button>
                </div>
            </div>  

            {/* CUERPO CENTRAL DE INFORMACIÓN */}
            <div className="p-4 max-w-xl mx-auto space-y-4">
                {cargando ? (
                    <div className="text-center py-20 font-bold text-slate-500 animate-pulse text-sm uppercase tracking-widest">Sincronizando coordenadas...</div>
                ) : tabActiva === 'disponibles' ? (
                    <>
                        {/* VISTA 1: POOL DE PEDIDOS DISPONIBLES */}
                        {viajeActivo && (
                            <div className="bg-amber-950/40 border border-amber-500/40 p-4 rounded-2xl text-amber-300 font-bold text-xs text-center uppercase tracking-wider mb-2">
                                ⚠️ Tienes un viaje en progreso. Termina tu ruta actual para poder tomar otro pedido.
                            </div>
                        )}  

                        {pedidosPool.map(p => (
                            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-black text-white">Orden #{p.numero_pedido}</h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Monto total: <span className="text-blue-400 font-black">${p.total}</span></p>
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${p.metodo_pago === 'Efectivo' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-blue-950 text-blue-400 border border-blue-800'}`}>
                                        💵 Pago: {p.metodo_pago}
                                    </span>
                                </div>  
                                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><MapPin size={10}/> Destino de Entrega</p>
                                    <p className="text-sm font-bold text-slate-200">{getDireccionLimpia(p.direccion_entrega) || 'Dirección no especificada'}</p>
                                </div>  
                                <button
                                    disabled={!!viajeActivo || isSubmitting}
                                    onClick={() => tomarPedido(p.id)}
                                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition ${viajeActivo ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/10 active:scale-95'}`}
                                >
                                    {viajeActivo ? 'Ruta Bloqueada' : 'Tomar este pedido y salir'}
                                </button>
                            </div>
                        ))}  

                        {pedidosPool.length === 0 && (
                            <div className="text-center py-16 bg-slate-900 rounded-3xl border border-slate-800 border-dashed text-slate-500 font-bold text-sm">
                                <Package size={40} className="mx-auto mb-2 opacity-30"/>
                                Sin pedidos listos para reparto por el momento.
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* VISTA 2: RUTA / VIAJE ACTIVO DEL REPARTIDOR */}
                        {viajeActivo ? (
                            <div className="bg-slate-900 border-2 border-blue-600 rounded-[36px] p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                    <div>
                                        <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded uppercase tracking-widest">En Ruta de Entrega</span>
                                        <h2 className="text-3xl font-black text-white mt-1">Pedido #{viajeActivo.numero_pedido}</h2>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-[10px] font-black uppercase ${esDeuda ? 'text-slate-500' : 'text-emerald-500'}`}>
                                            {esDeuda ? 'Cobro Neto' : 'Estado de Pago'}
                                        </p>
                                        <p className={`text-2xl font-black ${esDeuda ? 'text-emerald-400' : 'text-emerald-400'}`}>
                                            {esDeuda ? `$${viajeActivo.total}` : '✅ PAGADO'}
                                        </p>
                                    </div>
                                </div>  

                                {/* Cliente y Contacto de WhatsApp */}
                                <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Phone size={10}/> Destinatario</p>
                                        <p className="text-base font-black text-slate-200 mt-0.5">{viajeActivo.cliente_nombre || 'Invitado'}</p>
                                        
                                        {getTelefonoExtraido(viajeActivo) && (
                                            <a 
                                                href={`https://wa.me/52${getTelefonoExtraido(viajeActivo)}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1.5 mt-1 transition-colors w-fit"
                                            >
                                                <MessageCircle size={14} /> {getTelefonoExtraido(viajeActivo)}
                                            </a>
                                        )}
                                    </div>
                                    
                                    {getTelefonoExtraido(viajeActivo) && (
                                        <div className="flex gap-2">
                                            <a href={`tel:${getTelefonoExtraido(viajeActivo)}`} className="bg-slate-800 hover:bg-slate-700 text-white p-3.5 rounded-xl transition border border-slate-700 active:scale-95" title="Llamar">
                                                <Phone size={18}/>
                                            </a>
                                            <a href={`https://wa.me/52${getTelefonoExtraido(viajeActivo)}`} target="_blank" rel="noopener noreferrer" className="bg-emerald-900/30 hover:bg-emerald-800 text-emerald-400 p-3.5 rounded-xl transition border border-emerald-800/50 active:scale-95" title="WhatsApp">
                                                <MessageCircle size={18}/>
                                            </a>
                                        </div>
                                    )}
                                </div>  

                                {/* Dirección y Botón de Mapa */}
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><MapPin size={10}/> Dirección de Envío</p>
                                        <p className="text-sm font-bold text-slate-300 mt-1 leading-snug">{getDireccionLimpia(viajeActivo.direccion_entrega)}</p>
                                    </div>
                                    <button
                                        onClick={() => abrirMapaOriginal(viajeActivo.direccion_entrega)}
                                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl transition border border-slate-700 flex items-center justify-center gap-2 uppercase tracking-wider active:scale-95 shadow-sm"
                                    >
                                        <Navigation size={14} className="text-blue-400"/> Abrir en Google Maps
                                    </button>
                                </div>  

                                {/* Desglose de qué lleva */}
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1"><ShoppingBag size={12}/> Contenido del Pedido</p>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {getCarrito(viajeActivo).map((item, idx) => (
                                            <div key={idx} className="text-sm font-bold text-slate-300 flex justify-between border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                                                <span>{item.cantidad || 1}x {item.nombre}</span>
                                                <span className="text-slate-500 text-xs">{item.extras?.map(e => e.nombre).join(', ')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>  

                                {/* Botón de Avisos Auxiliares */}
                                <button
                                    onClick={() => notificarLlegada(viajeActivo.id)}
                                    className="w-full py-3 bg-amber-900/20 hover:bg-amber-900/40 text-amber-400 font-black text-xs rounded-xl transition border border-amber-900/50 flex items-center justify-center gap-2 uppercase tracking-wider shadow-inner active:scale-95"
                                >
                                    <Bell size={14}/> 🔔 ¡Llegué, estoy afuera!
                                </button>  

                                {/* Botón Maestro de Cierre */}
                                <button
                                    disabled={isSubmitting}
                                    onClick={() => setConfirmarEntregaId(viajeActivo.id)}
                                    className={`w-full py-4 text-white font-black text-base rounded-2xl shadow-xl transition active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider ${esDeuda ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}
                                >
                                    <CheckCircle2 size={20}/> {esDeuda ? 'Finalizar Entrega y Cobro' : 'Finalizar Entrega'}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-slate-900 rounded-3xl border border-slate-800 border-dashed text-slate-500 font-bold text-sm">
                                <MapPin size={40} className="mx-auto mb-2 opacity-30"/>
                                No tienes ningún viaje asignado en este momento. Ve a la pestaña de listos para tomar una orden.
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* MODAL ELEGANTE DE CONFIRMACIÓN */}
            {confirmarEntregaId && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-[40px] w-full max-w-sm shadow-2xl text-center animate-in zoom-in-95">
                        <div className="mx-auto bg-emerald-500/20 text-emerald-400 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner border border-emerald-500/30">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Confirmar Entrega</h2>
                        <p className="text-slate-400 font-medium mb-8 text-sm">
                            {['Pendiente', 'Por Cobrar'].includes(viajeActivo?.metodo_pago)
                                ? '¿Confirmas que la orden ya fue entregada y cobrada con éxito al cliente?'
                                : '¿Confirmas que la orden ya fue entregada con éxito al cliente? (Esta orden ya estaba pagada).'}
                        </p>
                        
                        <div className="flex gap-4">
                            <button
                                onClick={() => setConfirmarEntregaId(null)}
                                disabled={isSubmitting}
                                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl transition active:scale-95 disabled:opacity-50 border border-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => finalizarEntrega(confirmarEntregaId)}
                                disabled={isSubmitting}
                                className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Cerrando...' : 'Sí, Entregada'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};  

export default Repartidor;