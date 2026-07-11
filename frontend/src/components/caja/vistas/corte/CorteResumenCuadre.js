import React from 'react';
import { Calculator } from 'lucide-react';

const CorteResumenCuadre = ({
    totalDigital,
    fondoGlobal,
    ingresosEfectivo,
    gastos,
    descuentos,
    totalVentasGlobales,
    efectivoDeclarado
}) => {
    // Rendimiento Neto Real del negocio = Ventas Brutas Totales - Descuentos Otorgados - Gastos de Caja
    const ingresosNetos = totalVentasGlobales - descuentos - gastos;
    
    // 👇 NUEVA MATEMÁTICA: Ingresos - Gastos - Declarado = Diferencia (Feria o Faltante)
    const diferenciaFeria = ingresosEfectivo - gastos - (efectivoDeclarado || 0);

    return (
        <div className="bg-emerald-50 p-6 md:p-8 rounded-[32px] border border-emerald-200 shadow-sm transition-all hover:shadow-md flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-600 text-white p-2 md:p-3 rounded-xl shadow-md shadow-emerald-600/20">
                    <Calculator size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-emerald-900 uppercase tracking-widest leading-tight">
                        4. Cuadre Global
                    </h3>
                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-0.5">
                        Auditoría y Rendimiento
                    </p>
                </div>
            </div>

            {/* SECCIÓN A: AUDITORÍA DE EFECTIVO FÍSICO */}
            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm mb-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                    A. Auditoría de Efectivo Físico
                </p>
                
                {/* 👇 NUEVO ORDEN VISUAL */}
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm font-bold text-slate-400">
                        <span>Fondo Inicial (Solo Referencia):</span>
                        <span>${fondoGlobal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-emerald-600">
                        <span>+ Ingresos Efectivo (Ventas):</span>
                        <span>${ingresosEfectivo.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-red-500">
                        <span>- Gastos Pagados de Caja:</span>
                        <span>-${gastos.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-blue-600">
                        <span>- Efectivo Declarado:</span>
                        <span>-${(efectivoDeclarado || 0).toFixed(2)}</span>
                    </div>
                </div>
                
                <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <div>
                        <span className="text-sm font-black text-emerald-800 uppercase tracking-widest block">Sobrante (Para Feria):</span>
                        <span className="text-[9px] text-emerald-600 font-bold">Ingresos - Gastos - Declarado</span>
                    </div>
                    <span className={`text-2xl font-black ${diferenciaFeria < 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                        {diferenciaFeria < 0 ? '-' : ''}${Math.abs(diferenciaFeria).toFixed(2)}
                    </span>
                </div>
            </div>

            {/* SECCIÓN B: RENDIMIENTO REAL DEL NEGOCIO */}
            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm mt-auto">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                    B. Rendimiento Real del Negocio
                </p>
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm font-bold text-slate-600 items-center">
                        <div>
                            <span className="block">+ Ventas Brutas Totales:</span>
                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">Efectivo + Digitales (Sin descuento)</span>
                        </div>
                        <span>${totalVentasGlobales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-orange-500">
                        <span>- Descuentos y Promos:</span>
                        <span>-${descuentos.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-red-500">
                        <span>- Gastos (Caja Chica):</span>
                        <span>-${gastos.toFixed(2)}</span>
                    </div>
                </div>
                
                <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl shadow-md">
                    <div>
                        <span className="text-sm md:text-base font-black text-emerald-400 uppercase tracking-widest block leading-tight">Ingresos Netos Totales</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Bruto - Descuentos - Gastos</span>
                    </div>
                    <span className="text-3xl font-black text-white">${ingresosNetos.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};

export default CorteResumenCuadre;