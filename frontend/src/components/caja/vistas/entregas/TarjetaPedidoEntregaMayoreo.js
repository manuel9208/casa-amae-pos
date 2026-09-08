import React, { useState } from 'react';
import { MapPin, Phone, User, Bike, CheckCircle2, DollarSign, XCircle, Package, AlertTriangle, Banknote, PackageCheck } from 'lucide-react';

const TarjetaPedidoEntregaMayoreo = ({
    pedido,
    isSubmitting,
    setModalPago,
    empleadosPOS,
    apiUrl,
    recargarPedidos
}) => {
    const [repartidorId, setRepartidorId] = useState(pedido.repartidor_id || '');
    const [confirmarAnular, setConfirmarAnular] = useState(false);
    const [procesandoLocal, setProcesandoLocal] = useState(false);

    const repartidores = (empleadosPOS || []).filter(emp => String(emp.rol).toLowerCase().includes('repart'));

    const faltaPagar = ['Pendiente', 'Por Cobrar'].includes(pedido.metodo_pago);
    const esDomicilio = pedido.tipo_consumo === 'Domicilio';
    
    // Extracción de Teléfono
    const getTelefonoExtraido = () => {
        let tel = pedido.cliente_telefono || '';
        if (!tel && pedido.direccion_entrega) {
            const matchTel = pedido.direccion_entrega.match(/(?:TEL:|TELÉFONO:|CONTACTO:)\s*([0-9\s-]+)/i);
            if (matchTel && matchTel[1]) tel = matchTel[1].trim();
        }
        return tel;
    };
    const telefono = getTelefonoExtraido();

    // Extracción de Instrucciones de Cobro y Cliente
    const instruccionCobro = pedido.direccion_entrega ? (pedido.direccion_entrega.match(/\[(.*?)\]/) ? pedido.direccion_entrega.match(/\[(.*?)\]/)[1] : null) : null;
    let direccionLimpia = pedido.direccion_entrega || '';
    let clienteExtraido = pedido.cliente_nombre || 'Invitado B2B';

    if (direccionLimpia.includes('A NOMBRE DE:')) {
        const match = direccionLimpia.match(/A NOMBRE DE:\s*([^|]+)/i);
        if (match && match[1]) {
            clienteExtraido = match[1].trim();
        }
    }

    direccionLimpia = direccionLimpia
        .replace(/\[.*?\]/g, '')
        .replace(/A NOMBRE DE:\s*([^|]+)/gi, '')
        .replace(/TEL:\s*\d*/gi, '')
        .replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/gi, '')
        .split('|')
        .map(parte => parte.trim())
        .filter(parte => parte.length > 0)
        .join(', ')
        .trim();

    // ==============================================================
    // 🔄 ENRUTADOR DE ESTADOS (B2B DIRECTO)
    // ==============================================================
    const handleActualizarEstado = async (nuevoEstado, extras = {}) => {
        setProcesandoLocal(true);
        try {
            await fetch(`${apiUrl}/distribucion/ventas/${pedido.id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado_preparacion: nuevoEstado, ...extras })
            });
            if (recargarPedidos) recargarPedidos(); // Refrescamos la vista
        } catch (error) {
            console.error("Error al actualizar estado B2B:", error);
        }
        setProcesandoLocal(false);
    };

    // ==============================================================
    // 💰 ENRUTADOR DE COBROS (Etiqueta Secreta B2B)
    // ==============================================================
    const handleAbrirPago = () => {
        // La etiqueta _esB2B: true guiará al ModalPago en el siguiente paso
        setModalPago({ ...pedido, _esB2B: true });
    };

    const deshabilitado = isSubmitting || procesandoLocal;

    return (
        <>
            <div className="p-5 md:p-6 rounded-3xl border border-indigo-100 bg-indigo-50/40 shadow-sm flex flex-col justify-between transition-all hover:shadow-md animate-in slide-in-from-bottom-4 relative overflow-hidden">
                
                {/* Etiqueta de Mayoreo en el fondo */}
                <Package className="absolute -bottom-4 -right-4 w-32 h-32 text-indigo-500 opacity-[0.03] pointer-events-none" />

                {/* ENCABEZADO */}
                <div className="flex justify-between items-start mb-4 border-b border-indigo-100/50 pb-4 relative z-10">
                    <div>
                        <span className="text-xl md:text-2xl font-black tracking-tight text-indigo-900">
                            #{pedido.numero_pedido}
                        </span>
                        <span className={`ml-2 text-[10px] font-black uppercase px-2 py-1 rounded-md shadow-sm ${esDomicilio ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'}`}>
                            {pedido.tipo_consumo}
                        </span>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black text-indigo-400 uppercase tracking-widest">Total B2B</p>
                        <p className={`text-xl font-black ${faltaPagar ? 'text-red-500' : 'text-emerald-500'}`}>
                            ${Number(pedido.total || 0).toFixed(2)}
                        </p>
                        <div className={`mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-md shadow-sm ${faltaPagar ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                            {faltaPagar ? '⚠️ Pendiente' : '✅ Pagado'}
                        </div>
                    </div>
                </div>

                {/* DETALLES DEL CLIENTE */}
                <div className="space-y-2 mb-6 flex-1 relative z-10">
                    <p className="text-sm font-black text-indigo-800 flex items-center gap-2">
                        <User size={16} className="text-indigo-400" /> {clienteExtraido}
                    </p>

                    {telefono && (
                        <a href={`https://wa.me/52${telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-500/80 hover:text-emerald-600 flex items-center gap-2 transition-colors w-fit cursor-pointer" title="Abrir chat en WhatsApp">
                            <Phone size={14} className="text-blue-400" /> {telefono}
                        </a>
                    )}

                    {esDomicilio && direccionLimpia && direccionLimpia !== 'Pendiente de dirección' && (
                        <div className="space-y-2 mt-2">
                            <p className="text-xs font-bold text-slate-500 flex items-start gap-2 line-clamp-2">
                                <MapPin size={14} className="text-pink-400 shrink-0 mt-0.5" /> {direccionLimpia}
                            </p>
                            {instruccionCobro && (
                                <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg flex items-center gap-1.5 w-fit">
                                    <Banknote size={12} className="text-amber-500 shrink-0" />
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">{instruccionCobro}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* SELECTOR DE REPARTIDOR (Solo si es domicilio) */}
                {esDomicilio && (
                    <div className="mb-4 bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-indigo-100 shadow-inner relative z-10">
                        <label className="text-[10px] font-black uppercase text-indigo-400 mb-1 flex items-center gap-1">
                            <Bike size={12} /> Asignar Repartidor
                        </label>
                        <select
                            value={repartidorId}
                            onChange={(e) => setRepartidorId(e.target.value)}
                            disabled={deshabilitado}
                            className="w-full bg-white border border-indigo-100 text-sm font-bold text-indigo-800 rounded-lg p-2 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                        >
                            <option value="">-- Seleccionar Conductor --</option>
                            {repartidores.map(r => (
                                <option key={r.id} value={r.id}>{r.nombre}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* BOTONES DE ACCIÓN */}
                <div className="space-y-2 mt-auto relative z-10">
                    {esDomicilio && faltaPagar ? (
                        <div className="flex flex-col gap-2">
                            <button disabled={deshabilitado || repartidorId !== ''} onClick={handleAbrirPago} className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 ${repartidorId !== '' ? 'bg-indigo-100 text-indigo-300 border border-indigo-200 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 active:scale-95'}`}>
                                <DollarSign size={18} /> Cobrar (Pickup/Externo)
                            </button>
                            <button disabled={deshabilitado || !repartidorId} onClick={() => handleActualizarEstado('En Camino', { repartidor_id: repartidorId })} className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 ${!repartidorId ? 'bg-indigo-100 text-indigo-300 border border-indigo-200 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 active:scale-95'}`}>
                                <Bike size={18} /> Mandar a Repartir
                            </button>
                        </div>
                    ) : faltaPagar ? (
                        <div className="flex gap-2">
                            <button disabled={deshabilitado} onClick={() => setConfirmarAnular(true)} className="bg-white hover:bg-red-500 text-red-400 hover:text-white p-3 md:p-4 rounded-xl border border-red-200 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50 active:scale-95" title="Anular Orden">
                                <XCircle size={20} />
                            </button>
                            <button disabled={deshabilitado} onClick={handleAbrirPago} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
                                <DollarSign size={18} /> Cobrar Orden B2B
                            </button>
                        </div>
                    ) : (
                        esDomicilio ? (
                            <div className="flex flex-col gap-2">
                                <button disabled={deshabilitado || !repartidorId} onClick={() => handleActualizarEstado('En Camino', { repartidor_id: repartidorId })} className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 ${!repartidorId ? 'bg-indigo-100 text-indigo-300 border border-indigo-200 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 active:scale-95'}`}>
                                    <Bike size={18} /> Despachar (En Camino)
                                </button>
                                <button disabled={deshabilitado || repartidorId !== ''} onClick={() => handleActualizarEstado('Finalizado')} className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 ${repartidorId !== '' ? 'bg-indigo-100 text-indigo-300 border border-indigo-200 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 active:scale-95'}`}>
                                    <PackageCheck size={18} /> Entregar a Externo
                                </button>
                            </div>
                        ) : (
                            <button disabled={deshabilitado} onClick={() => handleActualizarEstado('Entregado')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50 shadow-indigo-600/30">
                                <CheckCircle2 size={18} /> Marcar Entregado
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* MODAL CANCELAR ORDEN B2B */}
            {confirmarAnular && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <AlertTriangle size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">¿Anular Orden B2B?</h3>
                        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                            ¿Estás seguro que deseas cancelar permanentemente la orden de mayoreo <strong>#{pedido.numero_pedido}</strong>?
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setConfirmarAnular(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">Volver</button>
                            <button onClick={() => { handleActualizarEstado('Cancelado'); setConfirmarAnular(false); }} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/30 hover:bg-red-600 transition active:scale-95">Sí, Anular</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TarjetaPedidoEntregaMayoreo;