import React, { useState } from 'react';
import { Bike, MapPin, CheckCircle2, DollarSign, AlertTriangle } from 'lucide-react';  

const TarjetaRepartidor = ({
    repartidorId,
    listaPedidos,
    getNombreRepartidor,
    liquidarPedidoRepartidor
}) => {
    // 👇 NUEVO ESTADO: Controla el modal elegante de confirmación
    const [pedidoAConfirmar, setPedidoAConfirmar] = useState(null);

    const pedidosEfectivo = listaPedidos.filter(p => 
        ['Entregado', 'En Camino'].includes(p.estado_preparacion) && 
        ['Pendiente', 'Por Cobrar', 'Efectivo'].includes(p.metodo_pago)
    );
    
    const totalDeudaRepartidor = pedidosEfectivo.reduce((sum, p) => sum + Number(p.total), 0);  

    return (
        <>
            <div className="bg-white p-6 md:p-8 rounded-[36px] border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow duration-300 animate-in slide-in-from-right-4 relative z-10">  
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-100 gap-3">
                    <h3 className="font-black text-slate-800 text-lg md:text-xl flex items-center gap-2">
                        <div className="bg-pink-100 p-2 rounded-xl text-pink-600">
                            <Bike size={20}/>
                        </div>
                        {getNombreRepartidor(repartidorId)}
                    </h3>
                    <span className="text-xs md:text-sm font-black bg-pink-100 text-pink-700 px-4 py-2 rounded-xl shadow-sm text-center">
                        Debe Entregar: ${totalDeudaRepartidor.toFixed(2)}
                    </span>
                </div>  

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mt-4">
                    {listaPedidos.map(p => {
                        const esEfectivo = ['Pendiente', 'Por Cobrar', 'Efectivo'].includes(p.metodo_pago);
                        const estaEnRuta = p.estado_preparacion === 'En Camino';

                        return (
                            <div key={p.id} className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 group ${estaEnRuta ? 'bg-slate-50 border-slate-200 opacity-90' : 'bg-slate-50/60 border-slate-200 hover:border-pink-300 hover:shadow-sm'}`}>
                                <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-3">
                                    <div className="pr-2">
                                        <span className="text-xl font-black text-slate-800 group-hover:text-pink-600 transition-colors">
                                            #{p.numero_pedido}
                                        </span>
                                        <p className="text-[11px] font-bold text-slate-500 line-clamp-1 flex items-center gap-1 mt-1">
                                            <MapPin size={12} className="text-slate-400 shrink-0"/>
                                            {p.cliente_nombre || 'Invitado'}
                                        </p>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest shrink-0 ${esEfectivo ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                        {esEfectivo ? 'Efectivo' : 'Online'}
                                    </span>
                                </div>  
                                
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monto:</span>
                                    <span className={`text-xl md:text-2xl font-black ${esEfectivo ? 'text-pink-600' : 'text-slate-400 line-through'}`}>
                                        ${p.total}
                                    </span>
                                </div>  

                                {/* 👇 FIX UX APLICADO: Dispara el modal elegante en lugar de window.confirm() */}
                                {estaEnRuta ? (
                                    <button
                                        onClick={() => setPedidoAConfirmar({ ...p, enRuta: true })}
                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/30"
                                    >
                                        <CheckCircle2 size={16}/> Liquidar Anticipado
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setPedidoAConfirmar({ ...p, enRuta: false })}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30"
                                    >
                                        <CheckCircle2 size={16}/> Recibir Efectivo
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 👇 NUEVO MODAL ELEGANTE DE CONFIRMACIÓN */}
            {pedidoAConfirmar && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <DollarSign size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Confirmar Cobro</h3>
                        <p className="text-slate-500 font-medium mb-6">
                            ¿Confirmas liquidar y recibir <strong className="text-slate-800 text-lg">${pedidoAConfirmar.total}</strong> en EFECTIVO de la orden <strong className="text-slate-800">#{pedidoAConfirmar.numero_pedido}</strong>?
                        </p>

                        {pedidoAConfirmar.enRuta && (
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-8 flex items-start gap-3 w-full text-left">
                                <AlertTriangle size={24} className="text-orange-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] md:text-xs font-bold text-orange-800 leading-snug">
                                    Nota: Esta orden figura como <strong>En Camino</strong>. Se forzará su cierre asumiendo que el repartidor ya regresó con el efectivo.
                                </p>
                            </div>
                        )}
                        {!pedidoAConfirmar.enRuta && <div className="mb-8"></div>}

                        <div className="flex w-full gap-3">
                            <button
                                onClick={() => setPedidoAConfirmar(null)}
                                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    liquidarPedidoRepartidor(pedidoAConfirmar.id);
                                    setPedidoAConfirmar(null);
                                }}
                                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex justify-center items-center gap-2"
                            >
                                <CheckCircle2 size={20} />
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};  

export default TarjetaRepartidor;