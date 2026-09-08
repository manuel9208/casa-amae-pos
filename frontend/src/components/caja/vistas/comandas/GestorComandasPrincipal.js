import React, { useState, useEffect, useCallback } from 'react';
import { Printer, Edit, MapPin, Phone, User, Clock, Trash2, Eye, ClipboardList, AlertTriangle, Store, Package, MessageCircle, Wallet } from 'lucide-react';
import TarjetaComandaMayoreo from './TarjetaComandaMayoreo';  

const GestorComandasPrincipal = ({
    pedidos,
    lanzarImpresion,
    setModalPuntoVenta,
    setModalEditarPedido,
    actualizarEstadoPedido,
    configGlobal,
    isSubmitting,
    limpiandoMesas,
    setModalVerDetalle,
    apiUrl
}) => {
    const [confirmarAnular, setConfirmarAnular] = useState(null);  

    // =====================================
    // ⚙️ ESTADOS Y LÓGICA MÓDULO B2B (MAYOREO)
    // =====================================
    const [modoTab, setModoTab] = useState('restaurante');
    const [configDist, setConfigDist] = useState({ activa: false, nombre: 'Distribución' });
    const [pedidosB2B, setPedidosB2B] = useState([]);
    const [cargandoB2B, setCargandoB2B] = useState(false);  

    const apiBase = apiUrl || (typeof window !== 'undefined' && window.location.origin.includes('localhost') ? 'http://localhost:4000/api' : '/api');  

    useEffect(() => {
        fetch(`${apiBase}/distribucion/configuracion`)
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    setConfigDist({
                        activa: data.distribucion_activa === true || String(data.distribucion_activa) === 'true',
                        nombre: data.distribucion_nombre || 'Distribución'
                    });
                }
            })
            .catch(() => {});
    }, [apiBase]);  

    const cargarPedidosB2B = useCallback(() => {
        setCargandoB2B(true);
        fetch(`${apiBase}/distribucion/ventas`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Filtrar para que solo se muestren las comandas del día de hoy
                    const hoy = new Date();
                    const fechaHoyStr = hoy.toLocaleDateString('es-MX');  
                    const ventasHoy = data.filter(pedido => {
                        if (!pedido.fecha_creacion) return false;
                        const fechaPedidoStr = new Date(pedido.fecha_creacion).toLocaleDateString('es-MX');
                        return fechaPedidoStr === fechaHoyStr; 
                    });  
                    setPedidosB2B(ventasHoy);
                }
            })
            .catch(() => {})
            .finally(() => setCargandoB2B(false));
    }, [apiBase]);  

    useEffect(() => {
        if (configDist.activa && modoTab === 'mayoreo') {
            cargarPedidosB2B();
            const interval = setInterval(cargarPedidosB2B, 8000);
            return () => clearInterval(interval);
        }
    }, [configDist.activa, modoTab, cargarPedidosB2B]);  

    // Ordenamos todos los pedidos del día: Los más nuevos arriba.
    const pedidosOrdenados = [...(pedidos || [])].sort((a, b) => b.numero_pedido - a.numero_pedido);
    const pedidosB2BOrdenados = [...pedidosB2B].sort((a, b) => b.numero_pedido - a.numero_pedido);  

    const obtenerEstilosPorEstado = (estado) => {
        switch (estado) {
            case 'Pendiente':
            case 'Por Confirmar':
                return 'bg-orange-50 border-orange-200 text-orange-900 shadow-orange-500/10 hover:border-orange-400';
            case 'Pagado':
                return 'bg-yellow-50 border-yellow-200 text-yellow-900 shadow-yellow-500/10 hover:border-yellow-400';
            case 'Preparando':
            case 'Listo':
            case 'En Camino':
                return 'bg-blue-50 border-blue-200 text-blue-900 shadow-blue-500/10 hover:border-blue-400';
            case 'Entregado':
            case 'Finalizado':
            case 'Liquidado':
                return 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-500/10 hover:border-emerald-400';
            case 'Cancelado':
                return 'bg-red-50 border-red-200 text-red-900 shadow-red-500/10 hover:border-red-400';
            default:
                return 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300';
        }
    };  

    const obtenerHoraFormateada = (fechaStr) => {
        if (!fechaStr) return '--:--';
        try {
            const fecha = new Date(fechaStr);
            return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch (e) { return '--:--'; }
    };  

    const procesarDireccionYContacto = (pedido) => {
        let dirPura = pedido.direccion_entrega || '';
        let telefonoExtraido = pedido.cliente_telefono || '';
        let clienteExtraido = pedido.cliente_nombre || 'Invitado';  

        if (dirPura.includes('A NOMBRE DE:')) {
            const match = dirPura.match(/A NOMBRE DE:\s*([^|]+)/i);
            if (match && match[1]) clienteExtraido = match[1].trim();
        }
        if (dirPura.includes('TEL:')) {
            const matchTel = dirPura.match(/TEL:\s*(\d+)/i);
            if (matchTel && matchTel[1] && !telefonoExtraido) {
                telefonoExtraido = matchTel[1].trim();
            }
        }
        dirPura = dirPura
            .replace(/TEL:\s*\d*/gi, '')
            .replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/gi, '')
            .replace(/A NOMBRE DE:\s*([^|]+)/gi, '')
            .replace(/\[.*?\]/g, '')
            .split('|').map(p => p.trim()).filter(p => p.length > 0).join(', ').trim();  

        return { direccionLimpia: dirPura, telefono: telefonoExtraido, cliente: clienteExtraido };
    };  

    return (
        <div className="w-full h-full bg-slate-50 text-slate-800 p-4 md:p-6 flex flex-col overflow-hidden">
            {/* ENCABEZADO Y SELECTOR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 gap-4 animate-in fade-in">
                <div>
                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 border border-indigo-200 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                        Radar Global
                    </span>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                        Todas las Comandas
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm font-medium mt-1 flex items-center gap-2">
                        Monitor general de operaciones. <span className="w-2 h-2 rounded-full bg-orange-400"></span> Pendientes <span className="w-2 h-2 rounded-full bg-yellow-400"></span> Pagados <span className="w-2 h-2 rounded-full bg-blue-400"></span> Cocina <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Entregados
                    </p>
                </div>  

                {configDist.activa && (
                    <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200 shadow-inner w-full md:w-auto shrink-0">
                        <button
                            onClick={() => setModoTab('restaurante')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${modoTab === 'restaurante' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Store size={16}/> Restaurante
                        </button>
                        <button
                            onClick={() => setModoTab('mayoreo')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${modoTab === 'mayoreo' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Package size={16}/> {configDist.nombre}
                        </button>
                    </div>
                )}
            </div>  

            {/* LISTA DE COMANDAS DINÁMICA */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4 pb-24">  
                {modoTab === 'restaurante' ? (
                    pedidosOrdenados.length === 0 ? (
                        <div className="bg-white border-2 border-slate-200 border-dashed p-12 rounded-[40px] text-center max-w-xl mx-auto mt-10 animate-in zoom-in-95">
                            <ClipboardList size={48} className="text-slate-300 mx-auto mb-4 opacity-70 animate-pulse" />
                            <p className="text-xl font-bold text-slate-400">Sin comandas registradas hoy</p>
                        </div>
                    ) : (
                        pedidosOrdenados.map(pedido => {
                            const { direccionLimpia, telefono, cliente } = procesarDireccionYContacto(pedido);
                            const estilosTarjeta = obtenerEstilosPorEstado(pedido.estado_preparacion);
                            const esCancelable = !['Cancelado', 'Finalizado', 'Entregado', 'Liquidado'].includes(pedido.estado_preparacion);
                            
                            let totalArticulos = 0;
                            try {
                                const car = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : (pedido.carrito || []);
                                totalArticulos = car.reduce((sum, item) => sum + (Number(item.cantidad) || 1), 0);
                            } catch (e) {}  

                            // 👇 NUEVA LÓGICA: Procesar el pago para el desglose Mixto
                            let pagoMixtoStr = '';
                            if (pedido.metodo_pago === 'Mixto' && pedido.pagos_mixtos) {
                                try {
                                    let pm = typeof pedido.pagos_mixtos === 'string' ? JSON.parse(pedido.pagos_mixtos) : pedido.pagos_mixtos;
                                    if (typeof pm === 'string') pm = JSON.parse(pm); // Doble parseo de seguridad
                                    if (Array.isArray(pm)) {
                                        pagoMixtoStr = pm.map(x => `${x.metodo}: $${Number(x.monto).toFixed(2)}`).join(' | ');
                                    }
                                } catch(e) {}
                            }

                            return (
                                <div key={pedido.id} className={`p-5 md:p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 animate-in fade-in ${estilosTarjeta}`}>
                                    
                                    {/* COLUMNA 1: NUMERO Y ESTADO */}
                                    <div className="flex items-center gap-4 min-w-[140px]">
                                        <div className="bg-slate-900 text-white font-black text-xl md:text-2xl px-4 py-2.5 rounded-2xl shadow-sm tracking-tight shrink-0">
                                            #{pedido.numero_pedido}
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase bg-white/60 border border-slate-300/30 px-2 py-0.5 rounded-md shadow-sm block w-fit mb-1">
                                                {pedido.estado_preparacion}
                                            </span>
                                            <span className="text-[9px] font-black uppercase bg-slate-900/10 px-2 py-0.5 rounded-md shadow-sm flex items-center w-fit">
                                                {pedido.tipo_consumo}
                                            </span>
                                        </div>
                                    </div>  

                                    {/* COLUMNA 2: CLIENTE Y LOGÍSTICA */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-lg flex items-center gap-1.5 opacity-90">
                                                <User size={16} className="shrink-0" />
                                                {cliente}
                                            </p>
                                            <p className="text-xs font-bold opacity-70 flex items-center gap-1 border-l border-slate-900/10 pl-2">
                                                <Clock size={12} /> {obtenerHoraFormateada(pedido.fecha_creacion)}
                                            </p>
                                        </div>

                                        {pedido.tipo_consumo === 'Local' && pedido.mesa && (
                                            <p className="text-xs font-black bg-white/50 border border-slate-900/10 px-2 py-0.5 rounded-md w-fit opacity-80">
                                                📍 Mesa Asignada: {pedido.mesa}
                                            </p>
                                        )}

                                        {direccionLimpia && direccionLimpia !== 'Pendiente de dirección' && (
                                            <p className="text-xs font-bold flex items-start gap-1.5 leading-snug line-clamp-1 opacity-75">
                                                <MapPin size={14} className="shrink-0 mt-0.5" />
                                                {direccionLimpia}
                                            </p>
                                        )}

                                        {/* 👇 FIX APLICADO: Agrupación amigable de Teléfono y Botón directo de WhatsApp */}
                                        <div className="flex flex-wrap items-center gap-3">
                                            {telefono && (
                                                <a href={`tel:${telefono.replace(/\D/g, '')}`} className="text-xs font-bold flex items-center gap-1.5 transition-opacity opacity-70 hover:opacity-100 w-fit cursor-pointer" title="Llamar">
                                                    <Phone size={14} className="shrink-0" /> {telefono}
                                                </a>
                                            )}
                                            {telefono && (
                                                <a href={`https://wa.me/52${telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors shadow-sm" title="Abrir Chat en WhatsApp">
                                                    <MessageCircle size={12} /> WhatsApp
                                                </a>
                                            )}
                                        </div>

                                        {/* 👇 FIX APLICADO: Muestra del Método de Pago final con desglose si es Mixto */}
                                        <div className="mt-2 flex flex-col gap-0.5 bg-white/50 p-2.5 rounded-xl border border-slate-900/5 w-fit shadow-sm">
                                            <p className="text-[10px] font-black uppercase opacity-75 tracking-widest flex items-center gap-1.5">
                                                <Wallet size={12} className="opacity-70" /> 
                                                Pago: <span className="text-slate-800">{pedido.metodo_pago}</span>
                                            </p>
                                            {pedido.metodo_pago === 'Mixto' && pagoMixtoStr && (
                                                <p className="text-[10px] font-bold text-slate-600 ml-4 flex items-center gap-1">
                                                    <span className="text-slate-400 font-black">↳</span> {pagoMixtoStr}
                                                </p>
                                            )}
                                        </div>
                                    </div>  

                                    {/* COLUMNA 3: METRICAS Y BOTONES */}
                                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-900/10 pt-3 md:pt-0">
                                        <div className="text-left md:text-right">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                                {totalArticulos} {totalArticulos === 1 ? 'Artículo' : 'Artículos'}
                                            </p>
                                            <p className="text-2xl font-black mt-0.5 opacity-90">
                                                ${Number(pedido.total || 0).toFixed(2)}
                                            </p>
                                        </div>

                                        {/* BOTONES DE ACCIÓN */}
                                        <div className="flex gap-2 shrink-0">
                                            <button disabled={isSubmitting || limpiandoMesas} onClick={() => setModalVerDetalle(pedido)} className="p-3 bg-white/60 hover:bg-white rounded-xl transition-all active:scale-95 border border-slate-900/10 shadow-sm flex items-center justify-center opacity-80 hover:opacity-100" title="Ver Detalles">
                                                <Eye size={18} />
                                            </button>
                                            {configGlobal?.ticket_impresion_activa && (
                                                <button onClick={() => lanzarImpresion(pedido)} className="p-3 bg-white/60 hover:bg-white rounded-xl transition-all active:scale-95 border border-slate-900/10 shadow-sm flex items-center justify-center opacity-80 hover:opacity-100" title="Reimprimir Ticket">
                                                    <Printer size={18} />
                                                </button>
                                            )}
                                            <button disabled={isSubmitting || limpiandoMesas} onClick={() => setModalEditarPedido(pedido)} className="p-3 bg-white/60 hover:bg-white rounded-xl transition-all active:scale-95 border border-slate-900/10 shadow-sm flex items-center justify-center opacity-80 hover:opacity-100" title="Modificar Orden">
                                                <Edit size={18} />
                                            </button>
                                            {esCancelable && (
                                                <button disabled={isSubmitting || limpiandoMesas} onClick={() => setConfirmarAnular(pedido)} className="p-3 bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-xl transition-all active:scale-95 border border-red-200 shadow-sm flex items-center justify-center" title="Anular Orden">
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )
                ) : (
                    cargandoB2B && pedidosB2BOrdenados.length === 0 ? (
                        <div className="flex justify-center items-center py-20 text-slate-400 font-bold animate-pulse">
                            Cargando comandas de distribución...
                        </div>
                    ) : pedidosB2BOrdenados.length === 0 ? (
                        <div className="bg-white border-2 border-slate-200 border-dashed p-12 rounded-[40px] text-center max-w-xl mx-auto mt-10 animate-in zoom-in-95">
                            <ClipboardList size={48} className="text-slate-300 mx-auto mb-4 opacity-70 animate-pulse" />
                            <p className="text-xl font-bold text-slate-400">Sin comandas B2B registradas hoy</p>
                        </div>
                    ) : (
                        pedidosB2BOrdenados.map(pedido => (
                            <TarjetaComandaMayoreo
                                key={pedido.id}
                                pedido={pedido}
                                apiUrl={apiBase}
                                configGlobal={configGlobal}
                                recargarPedidos={cargarPedidosB2B}
                            />
                        ))
                    )
                )}
            </div>  

            {/* MODAL DE CANCELACIÓN (Para Restaurante) */}
            {confirmarAnular && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <AlertTriangle size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">¿Anular Orden?</h3>
                        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                            ¿Estás seguro que deseas cancelar permanentemente la orden <strong>#{confirmarAnular.numero_pedido}</strong>?
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setConfirmarAnular(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">
                                Volver
                            </button>
                            <button onClick={() => { actualizarEstadoPedido(confirmarAnular.id, 'Cancelado'); setConfirmarAnular(null); }} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/30 hover:bg-red-600 transition active:scale-95">
                                Sí, Anular
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestorComandasPrincipal;