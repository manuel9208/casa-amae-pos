import React, { useState } from 'react';
import { MapPin, Phone, User, Bike, CheckCircle2, DollarSign, XCircle, Utensils, Package, AlertTriangle, Banknote } from 'lucide-react';

const TarjetaPedidoEntrega = ({
    pedido,
    isSubmitting,
    limpiandoMesas,
    actualizarEstadoPedido,
    setModalPago,
    getTelefonoExtraido,
    renderBotonVerDetalle,
    renderBotonAgregarExtra,
    empleadosPOS,
    esB2B, // 👈 Recibimos el flag para saber si es de Mayoreo
    apiUrl // 👈 Recibimos apiUrl para peticiones directas
}) => {
    const [repartidorId, setRepartidorId] = useState(pedido.repartidor_id || '');
    const [confirmarAnular, setConfirmarAnular] = useState(false);
    const [procesandoLocal, setProcesandoLocal] = useState(false); // Bloqueo local para B2B

    // 👇 FIX MÁSTER: Nuevo estado para bloquear el efecto rebote (flash)
    const [oculto, setOculto] = useState(false);

    const telefono = getTelefonoExtraido(pedido);
    const repartidores = (empleadosPOS || []).filter(emp => String(emp.rol).toLowerCase().includes('repart'));

    const faltaPagar = ['Pendiente', 'Por Cobrar'].includes(pedido.metodo_pago);
    const esDomicilio = pedido.tipo_consumo === 'Domicilio';
    const esLocal = pedido.tipo_consumo === 'Local' || pedido.tipo_consumo === 'Local / Mostrador';

    // Extracción inteligente de instrucciones y cliente
    const instruccionCobro = pedido.direccion_entrega ? (pedido.direccion_entrega.match(/\[(.*?)\]/) ? pedido.direccion_entrega.match(/\[(.*?)\]/)[1] : null) : null;
    let direccionLimpia = pedido.direccion_entrega || '';
    let clienteExtraido = pedido.cliente_nombre || 'Invitado';

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
    // 👇 ENRUTADOR DE ESTADOS (Mayoreo vs Restaurante)
    // ==============================================================
    const handleActualizarEstado = async (id, nuevoEstado, extras = {}) => {
        // 🛡️ Ocultamos la tarjeta instantáneamente. Aunque el socket traiga data vieja, no brillará.
        setOculto(true); 

        if (esB2B) {
            setProcesandoLocal(true);
            try {
                const apiBase = apiUrl || (window.location.origin.includes('localhost') ? 'http://localhost:4000/api' : '/api');
                await fetch(`${apiBase}/distribucion/ventas/${id}/estado`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado_preparacion: nuevoEstado, ...extras })
                });
                // El backend emite el Socket 'catalogo_actualizado' y la vista se recarga sola.
            } catch (error) {
                console.error("Error al actualizar estado B2B:", error);
                setOculto(false); // 👈 Si hay error de red, la volvemos a mostrar
            }
            setProcesandoLocal(false);
        } else {
            actualizarEstadoPedido(id, nuevoEstado, extras);
        }
    };

    // ==============================================================
    // 👇 ENRUTADOR DE COBROS (Mayoreo vs Restaurante)
    // ==============================================================
    const handleAbrirPago = () => {
        if (esB2B) {
            // Le inyectamos una "etiqueta secreta" al pedido para que ModalPago sepa qué hacer
            setModalPago({ ...pedido, _esB2B: true });
        } else {
            setModalPago(pedido);
        }
    };

    const deshabilitado = isSubmitting || limpiandoMesas || procesandoLocal;

    // 👇 FIX MÁSTER: Si está oculta, abortamos el renderizado por completo antes de dibujar la tarjeta
    if (oculto) return null;

    return (
        <>
            <div className={`p-5 md:p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:shadow-md animate-in slide-in-from-bottom-4 ${esB2B ? 'bg-indigo-50/30 border-indigo-100' : 'bg-white border-slate-200'}`}>
                {/* ENCABEZADO */}
                <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                    <div>
                        <span className={`text-xl md:text-2xl font-black tracking-tight ${esB2B ? 'text-indigo-900' : 'text-slate-800'}`}>
                            #{pedido.numero_pedido}
                        </span>
                        <span className={`ml-2 text-[10px] font-black uppercase px-2 py-1 rounded-md shadow-sm ${esDomicilio ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-orange-50 text-orange-600 border border-orange-200'}`}>
                            {pedido.tipo_consumo}
                        </span>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Total</p>
                        <p className={`text-xl font-black ${faltaPagar ? 'text-red-500' : 'text-emerald-500'}`}>
                            ${Number(pedido.total || 0).toFixed(2)}
                        </p>
                        <div className={`mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-md shadow-sm ${faltaPagar ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                            {faltaPagar ? '⚠️ Pendiente' : '✅ Pagado'}
                        </div>
                    </div>
                </div>

                {/* DETALLES DEL CLIENTE */}
                <div className="space-y-2 mb-6 flex-1">
                    <p className={`text-sm font-black flex items-center gap-2 ${esB2B ? 'text-indigo-800' : 'text-slate-700'}`}>
                        <User size={16} className={esB2B ? 'text-indigo-400' : 'text-slate-400'} /> {clienteExtraido}
                    </p>

                    {telefono && (
                        <a href={`https://wa.me/52${telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-2 transition-colors w-fit cursor-pointer" title="Abrir chat en WhatsApp">
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

                    {esLocal && pedido.mesa && (
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                            <Utensils size={14} className="text-orange-400 shrink-0" /> Mesa: {pedido.mesa}
                        </p>
                    )}
                </div>

                {/* SELECTOR DE REPARTIDOR (Solo si es domicilio) */}
                {esDomicilio && (
                    <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                            <Bike size={12} /> Asignar Repartidor
                        </label>
                        <select
                            value={repartidorId}
                            onChange={(e) => setRepartidorId(e.target.value)}
                            disabled={deshabilitado}
                            className="w-full bg-white border border-slate-200 text-sm font-bold text-slate-700 rounded-lg p-2 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                        >
                            <option value="">-- Seleccionar Conductor --</option>
                            {repartidores.map(r => (
                                <option key={r.id} value={r.id}>{r.nombre}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* BOTONES DE ACCIÓN */}
                <div className="space-y-2 mt-auto">
                    {/* Botones adicionales (Solo para restaurante, B2B no tiene extras aquí por ahora) */}
                    {!esB2B && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            {renderBotonVerDetalle && renderBotonVerDetalle(pedido)}
                            {renderBotonAgregarExtra && renderBotonAgregarExtra(pedido)}
                        </div>
                    )}

                    {esDomicilio && faltaPagar ? (
                        <div className="flex flex-col gap-2">
                            <button disabled={deshabilitado || repartidorId !== ''} onClick={handleAbrirPago} className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 ${repartidorId !== '' ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 active:scale-95'}`}>
                                <DollarSign size={18} /> Cobrar (Pickup/Externo)
                            </button>
                            <button disabled={deshabilitado || !repartidorId} onClick={() => handleActualizarEstado(pedido.id, 'En Camino', { repartidor_id: repartidorId })} className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 ${!repartidorId ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-slate-800 hover:bg-indigo-600 text-white shadow-slate-800/30 active:scale-95'}`}>
                                <Bike size={18} /> Mandar a Repartir
                            </button>
                        </div>
                    ) : faltaPagar ? (
                        esLocal && pedido.mesa ? (
                            <div className="flex gap-2">
                                <button disabled={deshabilitado} onClick={() => setConfirmarAnular(true)} className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white p-3 md:p-4 rounded-xl border border-red-200 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50 active:scale-95" title="Anular Orden">
                                    <XCircle size={20} />
                                </button>
                                <button disabled={deshabilitado} onClick={() => handleActualizarEstado(pedido.id, 'Entregado')} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-lg shadow-orange-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
                                    <Utensils size={18} /> Servir Mesa
                                </button>
                            </div>
                        ) : (
                            <button disabled={deshabilitado} onClick={handleAbrirPago} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
                                <DollarSign size={18} /> Cobrar Orden
                            </button>
                        )
                    ) : (
                        esDomicilio ? (
                            <div className="flex flex-col gap-2">
                                <button disabled={deshabilitado || !repartidorId} onClick={() => handleActualizarEstado(pedido.id, 'En Camino', { repartidor_id: repartidorId })} className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 ${!repartidorId ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-slate-800 hover:bg-indigo-600 text-white shadow-slate-800/30 active:scale-95'}`}>
                                    <Bike size={18} /> Despachar (En Camino)
                                </button>
                                <button disabled={deshabilitado || repartidorId !== ''} onClick={() => handleActualizarEstado(pedido.id, 'Finalizado')} className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 ${repartidorId !== '' ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 active:scale-95'}`}>
                                    <Package size={18} /> Entregar a Externo
                                </button>
                            </div>
                        ) : (
                            <button disabled={deshabilitado} onClick={() => handleActualizarEstado(pedido.id, 'Entregado')} className={`w-full ${esLocal && pedido.mesa ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-slate-800 hover:bg-indigo-600 shadow-slate-800/30'} text-white font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50`}>
                                {esLocal && pedido.mesa ? <Utensils size={18} /> : <CheckCircle2 size={18} />}
                                {esLocal && pedido.mesa ? 'Servir Mesa' : 'Marcar Entregado'}
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* MODAL CANCELAR */}
            {confirmarAnular && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <AlertTriangle size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">¿Anular Orden?</h3>
                        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                            ¿Estás seguro que deseas cancelar y eliminar permanentemente la orden <strong>#{pedido.numero_pedido}</strong>?
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setConfirmarAnular(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">Volver</button>
                            <button onClick={() => { handleActualizarEstado(pedido.id, 'Cancelado'); setConfirmarAnular(false); }} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/30 hover:bg-red-600 transition active:scale-95">Sí, Anular</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TarjetaPedidoEntrega;