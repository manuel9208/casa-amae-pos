import React, { useState } from 'react';
import { MapPin, Phone, User, Clock, Trash2, Eye, AlertTriangle, Package, XCircle } from 'lucide-react';
import TicketImpresionMayoreo from '../../modales/PuntoDeVenta/distribucion/TicketImpresionMayoreo'; // 👈 RUTA CORREGIDA EXACTA

const TarjetaComandaMayoreo = ({
    pedido,
    apiUrl,
    configGlobal,
    recargarPedidos
}) => {
    const [confirmarAnular, setConfirmarAnular] = useState(false);
    const [mostrarTicket, setMostrarTicket] = useState(false);
    const [procesando, setProcesando] = useState(false);

    // =========================================================
    // LÓGICA DE EXTRACCIÓN Y LIMPIEZA
    // =========================================================
    const obtenerHoraFormateada = (fechaStr) => {
        if (!fechaStr) return '--:--';
        try {
            const fecha = new Date(fechaStr);
            return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch (e) { return '--:--'; }
    };

    const procesarDireccionYContacto = (p) => {
        let dirPura = p.direccion_entrega || '';
        let telefonoExtraido = p.cliente_telefono || '';
        let clienteExtraido = p.cliente_nombre || 'Invitado B2B';

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
            .split('|').map(x => x.trim()).filter(x => x.length > 0).join(', ').trim();

        return { direccionLimpia: dirPura, telefono: telefonoExtraido, cliente: clienteExtraido };
    };

    const { direccionLimpia, telefono, cliente } = procesarDireccionYContacto(pedido);

    // =========================================================
    // LÓGICA DE COLORES DE ESTADO (Idéntica a la cafetería)
    // =========================================================
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

    const estilosTarjeta = obtenerEstilosPorEstado(pedido.estado_preparacion);
    const esCancelable = !['Cancelado', 'Finalizado', 'Entregado', 'Liquidado'].includes(pedido.estado_preparacion);

    let totalArticulos = 0;
    try {
        const car = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : (pedido.carrito || []);
        totalArticulos = car.reduce((sum, item) => sum + (Number(item.cantidad) || 1), 0);
    } catch (e) {}

    // =========================================================
    // ACCIÓN: ANULAR PEDIDO B2B
    // =========================================================
    const handleAnularPedidoB2B = async () => {
        setProcesando(true);
        try {
            const apiBase = apiUrl || (window.location.origin.includes('localhost') ? 'http://localhost:4000/api' : '/api');
            const res = await fetch(`${apiBase}/distribucion/ventas/${pedido.id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado_preparacion: 'Cancelado' })
            });

            if (res.ok) {
                setConfirmarAnular(false);
                if (recargarPedidos) recargarPedidos();
            }
        } catch (error) {
            console.error("Error al anular orden B2B:", error);
        }
        setProcesando(false);
    };

    return (
        <>
            <div className={`p-5 md:p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 animate-in fade-in relative overflow-hidden ${estilosTarjeta}`}>
                
                {/* Etiqueta de Mayoreo sutil de fondo */}
                <Package className="absolute -bottom-4 -right-4 w-32 h-32 opacity-[0.04] pointer-events-none" />

                {/* COLUMNA 1: NÚMERO Y ESTADO */}
                <div className="flex items-center gap-4 min-w-[140px] relative z-10">
                    <div className="bg-slate-900 text-white font-black text-xl md:text-2xl px-4 py-2.5 rounded-2xl shadow-sm tracking-tight shrink-0">
                        #{pedido.numero_pedido}
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase bg-white/60 border border-slate-300/30 px-2 py-0.5 rounded-md shadow-sm block w-fit mb-1">
                            {pedido.estado_preparacion}
                        </span>
                        <span className="text-[9px] font-black uppercase bg-indigo-900/10 text-indigo-800 px-2 py-0.5 rounded-md shadow-sm flex items-center w-fit">
                            B2B: {pedido.tipo_consumo}
                        </span>
                    </div>
                </div>

                {/* COLUMNA 2: CLIENTE Y LOGÍSTICA */}
                <div className="flex-1 space-y-1 relative z-10">
                    <div className="flex items-center gap-2">
                        <p className="font-black text-lg flex items-center gap-1.5 opacity-90">
                            <User size={16} className="shrink-0" />
                            {cliente}
                        </p>
                        <p className="text-xs font-bold opacity-70 flex items-center gap-1 border-l border-slate-900/10 pl-2">
                            <Clock size={12} /> {obtenerHoraFormateada(pedido.fecha_creacion)}
                        </p>
                    </div>
                    
                    {direccionLimpia && direccionLimpia !== 'Pendiente de dirección' && (
                        <p className="text-xs font-bold flex items-start gap-1.5 leading-snug line-clamp-1 opacity-75">
                            <MapPin size={14} className="shrink-0 mt-0.5" />
                            {direccionLimpia}
                        </p>
                    )}
                    {telefono && (
                        <a href={`https://wa.me/52${telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold flex items-center gap-1.5 transition-opacity opacity-70 hover:opacity-100 w-fit cursor-pointer">
                            <Phone size={14} className="shrink-0" /> {telefono}
                        </a>
                    )}
                </div>

                {/* COLUMNA 3: MÉTRICAS Y BOTONES */}
                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-900/10 pt-3 md:pt-0 relative z-10">
                    <div className="text-left md:text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                            {totalArticulos} {totalArticulos === 1 ? 'Art.' : 'Arts.'}
                        </p>
                        <p className="text-2xl font-black mt-0.5 opacity-90">
                            ${Number(pedido.total || 0).toFixed(2)}
                        </p>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex gap-2 shrink-0">
                        {/* Botón Ver Ticket */}
                        <button disabled={procesando} onClick={() => setMostrarTicket(true)} className="p-3 bg-white/60 hover:bg-white rounded-xl transition-all active:scale-95 border border-slate-900/10 shadow-sm flex items-center justify-center opacity-80 hover:opacity-100 text-indigo-700" title="Ver Ticket de Mayoreo">
                            <Eye size={18} />
                        </button>
                        
                        {/* Botón Anular */}
                        {esCancelable && (
                            <button disabled={procesando} onClick={() => setConfirmarAnular(true)} className="p-3 bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-xl transition-all active:scale-95 border border-red-200 shadow-sm flex items-center justify-center" title="Anular Orden B2B">
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================================== */}
            {/* MODAL 1: PREVISUALIZAR TICKET (B2B) */}
            {/* ============================================================== */}
            {mostrarTicket && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200 print:bg-white print:backdrop-blur-none">
                    <div className="bg-white rounded-[32px] p-6 shadow-2xl max-h-[80vh] overflow-y-auto custom-scrollbar flex flex-col items-center relative">
                        <button onClick={() => setMostrarTicket(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors print:hidden bg-slate-100 p-2 rounded-full">
                            <XCircle size={20} />
                        </button>
                        
                        <div className="mt-4">
                            <TicketImpresionMayoreo 
                                ticketImprimir={pedido} 
                                configGlobal={configGlobal} 
                                apiUrl={apiUrl} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* MODAL 2: CONFIRMAR ANULACIÓN */}
            {/* ============================================================== */}
            {confirmarAnular && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <AlertTriangle size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">¿Anular Orden B2B?</h3>
                        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                            ¿Estás seguro que deseas cancelar permanentemente la orden de distribución <strong>#{pedido.numero_pedido}</strong>?
                        </p>
                        <div className="flex gap-4">
                            <button disabled={procesando} onClick={() => setConfirmarAnular(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95 disabled:opacity-50">
                                Volver
                            </button>
                            <button disabled={procesando} onClick={handleAnularPedidoB2B} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/30 hover:bg-red-600 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                {procesando ? 'Anulando...' : 'Sí, Anular'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TarjetaComandaMayoreo;