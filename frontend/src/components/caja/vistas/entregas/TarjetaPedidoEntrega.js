import React, { useState } from 'react';
import { MapPin, Phone, User, Bike, CheckCircle2, DollarSign, XCircle, Utensils, Package } from 'lucide-react';

const TarjetaPedidoEntrega = ({
    pedido,
    isSubmitting,
    limpiandoMesas,
    actualizarEstadoPedido,
    setModalPago,
    getTelefonoExtraido,
    renderBotonVerDetalle,
    renderBotonAgregarExtra,
    empleadosPOS
}) => {
    const [repartidorId, setRepartidorId] = useState(pedido.repartidor_id || '');
    
    const telefono = getTelefonoExtraido(pedido);
    const repartidores = (empleadosPOS || []).filter(emp => String(emp.rol).toLowerCase().includes('repart'));
    
    const faltaPagar = ['Pendiente', 'Por Cobrar'].includes(pedido.metodo_pago);
    const esDomicilio = pedido.tipo_consumo === 'Domicilio';
    const esLocal = pedido.tipo_consumo === 'Local';

    // 👇 FIX RUTA A: Extraemos el nombre del invitado si viene empaquetado en la dirección
    let direccionLimpia = pedido.direccion_entrega || '';
    let clienteExtraido = pedido.cliente_nombre || 'Invitado';

    if (direccionLimpia.includes('|')) {
        const partes = direccionLimpia.split('|');
        const parteNombre = partes.find(p => p.includes('A NOMBRE DE:'));
        
        if (parteNombre) {
            clienteExtraido = parteNombre.replace('A NOMBRE DE:', '').trim();
        }

        direccionLimpia = partes[0]
            .replace(/TEL:\s*\d*/g, '')
            .replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, '')
            .replace(/A NOMBRE DE:\s*(.*)/g, '')
            .trim();
    }

    return (
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md animate-in slide-in-from-bottom-4">
            
            {/* ENCABEZADO */}
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                <div>
                    <span className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">#{pedido.numero_pedido}</span>
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
                <p className="text-sm font-black text-slate-700 flex items-center gap-2">
                    {/* 👇 FIX RUTA A: Imprimimos el cliente extraído dinámicamente */}
                    <User size={16} className="text-slate-400" /> {clienteExtraido}
                </p>
                {telefono && (
                    <a 
                        href={`https://wa.me/52${telefono.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-2 transition-colors w-fit cursor-pointer"
                        title="Abrir chat en WhatsApp"
                    >
                        <Phone size={14} className="text-blue-400" /> {telefono}
                    </a>
                )}
                {esDomicilio && direccionLimpia && direccionLimpia !== 'Pendiente de dirección' && (
                    <p className="text-xs font-bold text-slate-500 flex items-start gap-2 line-clamp-2">
                        <MapPin size={14} className="text-pink-400 shrink-0 mt-0.5" /> {direccionLimpia}
                    </p>
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
                        disabled={isSubmitting || limpiandoMesas}
                        className="w-full bg-white border border-slate-200 text-sm font-bold text-slate-700 rounded-lg p-2 outline-none focus:border-indigo-500 transition-colors"
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
                <div className="grid grid-cols-2 gap-2 mb-2">
                    {renderBotonVerDetalle(pedido)}
                    {renderBotonAgregarExtra(pedido)}
                </div>

                {esDomicilio && faltaPagar ? (
                    <div className="flex flex-col gap-2">
                        <button
                            disabled={isSubmitting || limpiandoMesas || repartidorId !== ''}
                            onClick={() => setModalPago(pedido)}
                            className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2
                                ${repartidorId !== '' ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 active:scale-95'}`}
                        >
                            <DollarSign size={18} /> Cobrar (Pickup/Externo)
                        </button>
                        <button
                            disabled={isSubmitting || limpiandoMesas || !repartidorId}
                            onClick={() => actualizarEstadoPedido(pedido.id, 'En Camino', { repartidor_id: repartidorId })}
                            className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2
                                ${!repartidorId ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-slate-800 hover:bg-indigo-600 text-white shadow-slate-800/30 active:scale-95'}`}
                        >
                            <Bike size={18} /> Mandar a Repartir
                        </button>
                    </div>
                ) : faltaPagar ? (
                    
                    /* Pedidos Locales / Mostrador sin pagar */
                    esLocal && pedido.mesa ? (
                        <div className="flex gap-2">
                            <button
                                disabled={isSubmitting || limpiandoMesas}
                                onClick={() => {
                                    if(window.confirm('¿Seguro que deseas anular esta orden?')) {
                                        actualizarEstadoPedido(pedido.id, 'Cancelado')
                                    }
                                }}
                                className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white p-3 md:p-4 rounded-xl border border-red-200 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50 active:scale-95"
                                title="Anular Orden"
                            >
                                <XCircle size={20} />
                            </button>
                            <button
                                disabled={isSubmitting || limpiandoMesas}
                                onClick={() => actualizarEstadoPedido(pedido.id, 'Entregado')}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-lg shadow-orange-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50"
                            >
                                <Utensils size={18} /> Servir Mesa
                            </button>
                        </div>
                    ) : (
                        <button
                            disabled={isSubmitting || limpiandoMesas}
                            onClick={() => setModalPago(pedido)}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                            <DollarSign size={18} /> Cobrar Orden
                        </button>
                    )

                ) : (
                    /* Pedidos YA PAGADOS */
                    esDomicilio ? (
                        <div className="flex flex-col gap-2">
                            <button
                                disabled={isSubmitting || limpiandoMesas || !repartidorId}
                                onClick={() => actualizarEstadoPedido(pedido.id, 'En Camino', { repartidor_id: repartidorId })}
                                className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2
                                    ${!repartidorId ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-slate-800 hover:bg-indigo-600 text-white shadow-slate-800/30 active:scale-95'}`}
                            >
                                <Bike size={18} /> Despachar (En Camino)
                            </button>
                            <button
                                disabled={isSubmitting || limpiandoMesas || repartidorId !== ''}
                                onClick={() => actualizarEstadoPedido(pedido.id, 'Finalizado')}
                                className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-sm transition-all flex justify-center items-center gap-2
                                    ${repartidorId !== '' ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 active:scale-95'}`}
                            >
                                <Package size={18} /> Entregar a Externo
                            </button>
                        </div>
                    ) : (
                        <button
                            disabled={isSubmitting || limpiandoMesas}
                            onClick={() => actualizarEstadoPedido(pedido.id, 'Entregado')}
                            className={`w-full ${esLocal && pedido.mesa ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-slate-800 hover:bg-indigo-600 shadow-slate-800/30'} text-white font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50`}
                        >
                            {esLocal && pedido.mesa ? <Utensils size={18} /> : <CheckCircle2 size={18} />}
                            {esLocal && pedido.mesa ? 'Servir Mesa' : 'Marcar Entregado'}
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

export default TarjetaPedidoEntrega;