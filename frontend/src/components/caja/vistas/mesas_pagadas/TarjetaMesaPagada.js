import React from 'react';
import { Utensils, CheckCircle2, User, Clock, ShieldAlert } from 'lucide-react';

const TarjetaMesaPagada = ({
    mesa, // 👈 El objeto 'mesa' realmente es el 'pedido' que está vinculado
    liberarMesaMagicamente,
    limpiandoMesas,
    isSubmitting,
    renderBotonVerDetalle,
    renderBotonEditar
}) => {
    
    const pedidoAsociado = mesa;
    // 👇 2. FIX DE TEXTO "MESA MESA"
    const numMesaPuro = String(pedidoAsociado.mesa || 'N/A').trim();
    const numeroMesaLabel = numMesaPuro.toLowerCase().startsWith('mesa') ? numMesaPuro : `Mesa ${numMesaPuro}`;
    
    const cliente = pedidoAsociado.cliente_nombre || 'Invitado';
    
    // 👇 3. VALIDACIÓN DE PAGO
    const faltaPagar = ['Pendiente', 'Por Cobrar'].includes(pedidoAsociado.metodo_pago);

    return (
        <div className={`bg-white p-5 md:p-6 rounded-3xl border-2 shadow-sm flex flex-col justify-between transition-all hover:shadow-md animate-in slide-in-from-bottom-4 ${faltaPagar ? 'border-orange-200 hover:border-orange-300' : 'border-emerald-200 hover:border-emerald-300'}`}>
            
            {/* 1. ENCABEZADO DE LA MESA */}
            <div className={`flex justify-between items-start mb-4 border-b pb-4 ${faltaPagar ? 'border-orange-100' : 'border-emerald-100'}`}>
                <div className="flex items-center gap-3">
                    <div className={`${faltaPagar ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'} p-3 rounded-2xl shadow-inner`}>
                        <Utensils size={24} />
                    </div>
                    <div>
                        <span className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight block leading-none">
                            {numeroMesaLabel}
                        </span>
                        <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest mt-1.5 ${faltaPagar ? 'text-orange-500' : 'text-emerald-500'}`}>
                            {faltaPagar ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                            {faltaPagar ? 'Comensales en Mesa' : 'Cuenta Pagada'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. DETALLES DEL CLIENTE / CONSUMO */}
            <div className="space-y-3 mb-6 flex-1">
                <p className="text-sm font-black text-slate-700 flex items-center gap-2">
                    <User size={16} className="text-slate-400" /> {cliente}
                </p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center mt-2">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Clock size={14} /> Total de la Cuenta:
                    </span>
                    <span className={`text-lg font-black ${faltaPagar ? 'text-orange-600' : 'text-emerald-600'}`}>
                        ${Number(pedidoAsociado.total || 0).toFixed(2)}
                    </span>
                </div>
            </div>

            {/* 3. BOTONES DE ACCIÓN */}
            <div className="space-y-2 mt-auto">
                <div className="grid grid-cols-2 gap-2 mb-2">
                    {renderBotonVerDetalle(pedidoAsociado)}
                    {renderBotonEditar(pedidoAsociado)}
                </div>

                {/* 👇 3. BLOQUEO DINÁMICO DE LIMPIEZA HASTA QUE SE PAGUE */}
                <button
                    disabled={isSubmitting || limpiandoMesas || faltaPagar}
                    onClick={() => liberarMesaMagicamente(pedidoAsociado.mesa, pedidoAsociado.id)}
                    className={`w-full font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl transition-all flex justify-center items-center gap-2
                        ${faltaPagar 
                            ? 'bg-orange-50 text-orange-400 border border-orange-200 cursor-not-allowed opacity-80' 
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 active:scale-95 disabled:opacity-50'
                        }`}
                >
                    {faltaPagar ? (
                        <><ShieldAlert size={18} /> Requiere Pago Previo</>
                    ) : (
                        <><CheckCircle2 size={18} /> Limpiar y Liberar Mesa</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default TarjetaMesaPagada;