import React from 'react';
import { DollarSign, PackageOpen, TrendingUp, TrendingDown, Tag, Wallet, ShoppingBag, Minus } from 'lucide-react';

const ResumenFinanciero = ({ resumen, formaterMoneda, comparativas }) => {
    // Si no hay datos, ocultamos el componente para que no marque error
    if (!resumen) return null;

    // 💡 MEJORA #2: Indicador visual ↑/↓ de tendencia.
    // Mismo criterio que "proyecciones" en reporteController.js: comparativas[0]
    // es siempre el periodo ACTUAL (Hoy/Esta Semana/etc.), así que la base de
    // comparación es el primer periodo HISTÓRICO inmediato -> comparativas[1].
    const baseHistorica = Array.isArray(comparativas) && comparativas.length > 1 ? comparativas[1] : null;

    // 💡 Cálculo APROXIMADO de variación % (no reconstruye descuentos prorrateados
    // del periodo histórico, solo compara volumen bruto vs bruto, o costo vs costo).
    const calcularVariacion = (valorActual, valorHistorico) => {
    if (!baseHistorica || valorHistorico === undefined || valorHistorico === null) return null;
    const actual = Number(valorActual) || 0;
    const historico = Number(valorHistorico) || 0;

    if (historico === 0) {
        if (actual === 0) return null;
        return { esNuevo: true };
    }
    const variacion = ((actual - historico) / Math.abs(historico)) * 100;
    return { variacion, esPositivo: variacion > 0, esNeutro: variacion === 0 };
    };

    // 💡 Badge reutilizable (claro u oscuro, para la tarjeta verde de Ganancia Neta)
    const BadgeTendencia = ({ data, oscuro = false }) => {
    if (!data) return null;
    if (data.esNuevo) {
        return (
        <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${oscuro ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'} print:bg-slate-100 print:text-slate-600`}>
            <TrendingUp size={11} /> Nuevo
        </span>
        );
    }
    const { variacion, esPositivo, esNeutro } = data;
    const colorClaro = esNeutro ? 'bg-slate-100 text-slate-500' : esPositivo ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500';
    const colorOscuro = 'bg-white/20 text-white';
    return (
        <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${oscuro ? colorOscuro : colorClaro} print:bg-slate-100 print:text-slate-600`}>
        {esNeutro ? <Minus size={11} /> : esPositivo ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {Math.abs(variacion).toFixed(1)}%
        </span>
    );
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 print:grid-cols-6 print:gap-2 animate-in fade-in slide-in-from-top-4 mb-8">
            
            {/* 1. VENTAS BRUTAS */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center transition-all hover:shadow-md hover:border-blue-200">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 print:hidden">
                    <DollarSign size={20}/>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Ingresos Brutos</span>
                <span className="text-xl md:text-2xl font-black text-slate-800 mt-1">
                    {formaterMoneda(resumen.ventas_totales)}
                </span>
                <BadgeTendencia data={calcularVariacion(resumen.ventas_totales, baseHistorica?.totalVentas)} />
            </div>

            {/* 2. DESCUENTOS Y PROMOCIONES */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center transition-all hover:shadow-md hover:border-orange-200">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-3 print:hidden">
                    <Tag size={20}/>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Descuentos</span>
                <span className="text-xl md:text-2xl font-black text-orange-500 mt-1">
                    -{formaterMoneda(resumen.descuentos_otorgados)}
                </span>
            </div>

            {/* 3. INGRESOS NETOS (Bruto - Descuento) */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border-2 border-emerald-400 flex flex-col items-center text-center relative overflow-hidden transition-all hover:shadow-md">
                <div className="absolute top-0 w-full h-1.5 bg-emerald-400"></div>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3 print:hidden mt-1">
                    <Wallet size={20}/>
                </div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-tight">Ingresos Netos</span>
                <span className="text-xl md:text-2xl font-black text-emerald-700 mt-1">
                    {formaterMoneda(resumen.ingreso_neto_real)}
                </span>
                <BadgeTendencia data={calcularVariacion(resumen.ingreso_neto_real, baseHistorica?.totalVentas)} />
            </div>

            {/* 4. COSTO DE INVERSIÓN (Receta) */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center transition-all hover:shadow-md hover:border-red-200">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3 print:hidden">
                    <PackageOpen size={20}/>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Costo Inversión</span>
                <span className="text-xl md:text-2xl font-black text-red-500 mt-1">
                    -{formaterMoneda(resumen.inversion_total)}
                </span>
                <BadgeTendencia data={calcularVariacion(resumen.inversion_total, baseHistorica?.totalInversion)} />
            </div>

            {/* 5. GANANCIA NETA FINAL */}
            <div className="bg-emerald-500 p-5 rounded-3xl shadow-lg border border-emerald-400 flex flex-col items-center text-center transform hover:scale-[1.03] transition-all print:bg-white print:border-slate-300 print:shadow-none print:transform-none">
                <div className="w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center mb-3 print:hidden">
                    <TrendingUp size={20}/>
                </div>
                <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest leading-tight print:text-slate-400">Ganancia Neta</span>
                <span className="text-2xl md:text-3xl font-black text-white mt-1 print:text-emerald-600 drop-shadow-sm">
                    {formaterMoneda(resumen.ganancia_total)}
                </span>
                <BadgeTendencia data={calcularVariacion(resumen.ganancia_total, baseHistorica?.totalGanancia)} oscuro />
            </div>

            {/* 6. ARTÍCULOS VENDIDOS */}
            <div className="bg-slate-800 p-5 rounded-3xl shadow-md border border-slate-700 flex flex-col items-center text-center transition-all hover:bg-slate-900 print:bg-white print:border-slate-300 print:shadow-none">
                <div className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center mb-3 print:hidden">
                    <ShoppingBag size={20}/>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Artículos Vendidos</span>
                <span className="text-3xl md:text-4xl font-black text-white mt-1 print:text-slate-800">
                    {resumen.productos_vendidos}
                </span>
            </div>

        </div>
    );
};

export default ResumenFinanciero;