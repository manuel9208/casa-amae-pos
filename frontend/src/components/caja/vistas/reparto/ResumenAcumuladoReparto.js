import React from 'react';
import { Wallet, AlertCircle } from 'lucide-react';  

const ResumenAcumuladoReparto = ({
    deudaPedidosEfectivoGlobal,
    fondoFeria,
    totalAEntregarGlobal
}) => {
    return (
        <div className="lg:col-span-4 bg-pink-50 p-6 md:p-8 rounded-[36px] md:rounded-[40px] border-2 border-pink-200 flex flex-col sticky top-4 animate-in slide-in-from-bottom-6 transition-all hover:shadow-lg hover:border-pink-300">  
            <h3 className="text-xl md:text-2xl font-black text-pink-900 mb-6 flex items-center gap-2">
                <div className="bg-pink-200 p-2 rounded-xl text-pink-700 shadow-inner">
                    <Wallet size={24}/>
                </div>
                Flotilla Acumulada
            </h3>  
            <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center p-2 hover:bg-pink-100/50 rounded-lg transition-colors">
                    <span className="text-sm font-bold text-pink-700">Pedidos Totales (Efectivo)</span>
                    <span className="text-lg font-black text-pink-900">${deudaPedidosEfectivoGlobal.toFixed(2)}</span>
                </div>  
                <div className="flex justify-between items-center pb-4 border-b border-pink-200 p-2 hover:bg-pink-100/50 rounded-lg transition-colors">
                    <span className="text-sm font-bold text-pink-700">Feria General de Almacén</span>
                    <span className="text-lg font-black text-pink-900">${fondoFeria.toFixed(2)}</span>
                </div>  
                <div className="flex justify-between items-end pt-4">
                    <div>
                        <span className="text-xs md:text-sm font-black text-pink-800 uppercase tracking-widest">
                            Caja Logística
                        </span>
                        <p className="text-[10px] font-bold text-pink-600 mt-1 uppercase">Total Físico a Recibir</p>
                    </div>
                    <span className="text-4xl md:text-5xl font-black text-pink-600 drop-shadow-sm">
                        ${totalAEntregarGlobal.toFixed(2)}
                    </span>
                </div>
            </div>  
            
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-pink-100 shadow-sm mt-auto flex items-start gap-3 transition-all hover:shadow-md">
                <AlertCircle size={24} className="text-pink-400 shrink-0 mt-0.5" />
                <p className="text-[10px] md:text-[11px] font-bold text-slate-500 leading-relaxed">
                    El desglose superior suma todas las deudas activas. Liquida individualmente cada cuenta al cobrarle el efectivo a tu chofer.
                </p>
            </div>  
        </div>
    );
};  

export default ResumenAcumuladoReparto;