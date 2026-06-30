import React from 'react';  

const EncabezadoLogistica = () => {
    return (
        <div className="flex flex-col border-b border-slate-200 pb-5 mb-8 animate-in fade-in duration-200">
            <div>
                <span className="text-[10px] font-black bg-pink-50 text-pink-600 border border-pink-200 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                    Módulo de Logística
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                    Liquidación de Repartidores
                </h1>
                <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
                    Asigna la feria inicial y recolecta el efectivo por repartidor antes del corte financiero.
                </p>
            </div>  
        </div>
    );
};  

export default EncabezadoLogistica;