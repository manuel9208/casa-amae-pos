import React from 'react';
import { TrendingUp, BarChart2, Star, TrendingDown, AlertTriangle, Activity, CalendarDays, Calendar } from 'lucide-react';

const InsightsVentas = ({ insights, filtroActivo, formaterMoneda, parseFechaSegura }) => {
  if (!insights) return null;

  return (
    <div className="bg-slate-900 rounded-[32px] p-8 shadow-xl text-white print:hidden relative overflow-hidden">
      <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
        <TrendingUp size={200}/>
      </div>
      <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-emerald-400">
        <BarChart2 size={24}/> Análisis Inteligente ({filtroActivo})
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 hover:border-slate-500 transition">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rendimiento de Menú</p>
            {insights.productoMasVendido ? (
                <>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                        <Star size={16}/> Más Vendido
                      </span>
                      <span className="font-black text-right pl-2 leading-tight">
                        {insights.productoMasVendido.producto_nombre} 
                        <span className="text-emerald-300 ml-1 text-xs">({insights.productoMasVendido.cantidad_vendida})</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                        <TrendingDown size={16}/> Menos Vendido
                      </span>
                      <span className="font-black text-right pl-2 leading-tight">
                        {insights.productoMenosVendido.producto_nombre} 
                        <span className="text-red-300 ml-1 text-xs">({insights.productoMenosVendido.cantidad_vendida})</span>
                      </span>
                    </div>
                </>
            ) : (
              <p className="text-sm text-slate-500 mb-4">Aún no hay platillos vendidos en este periodo.</p>
            )}
            
            {insights.productosCeroVentasAyer?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                    <span className="text-xs font-black text-orange-400 flex items-center gap-1.5 mb-2">
                      <AlertTriangle size={14}/> No se vendió ayer ({insights.productosCeroVentasAyer.length})
                    </span>
                    <p className="text-xs text-slate-400 leading-snug line-clamp-3" title={insights.productosCeroVentasAyer.join(', ')}>
                      {insights.productosCeroVentasAyer.join(', ')}
                    </p>
                </div>
            )}
        </div>

        {['semana', 'mes', 'anio'].includes(filtroActivo) && insights.mejorDia && (
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 hover:border-slate-500 transition">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rendimiento Diario</p>
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-blue-400 flex items-center gap-1.5">
                      <Activity size={16}/> Promedio/Día
                    </span>
                    <span className="font-black text-lg">
                      {formaterMoneda(insights.promedioDiario)}
                    </span>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <CalendarDays size={16}/> Mejor Día
                    </span>
                    <div className="text-right">
                        <span className="font-black block capitalize">
                          {parseFechaSegura(insights.mejorDia.fecha_str)}
                        </span>
                        <span className="text-xs text-emerald-300 font-bold">
                          {formaterMoneda(insights.mejorDia.total_dia)}
                        </span>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                      <CalendarDays size={16}/> Peor Día
                    </span>
                    <div className="text-right">
                        <span className="font-black block capitalize">
                          {parseFechaSegura(insights.peorDia.fecha_str)}
                        </span>
                        <span className="text-xs text-red-300 font-bold">
                          {formaterMoneda(insights.peorDia.total_dia)}
                        </span>
                    </div>
                </div>
            </div>
        )}

        {filtroActivo === 'anio' && insights.mejorMes && (
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 hover:border-slate-500 transition">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rendimiento Mensual</p>
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <Calendar size={16}/> Mejor Mes
                    </span>
                    <div className="text-right">
                        <span className="font-black block capitalize">
                          {insights.mejorMes.mes}
                        </span>
                        <span className="text-xs text-emerald-300 font-bold">
                          {formaterMoneda(insights.mejorMes.total)}
                        </span>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                      <Calendar size={16}/> Peor Mes
                    </span>
                    <div className="text-right">
                        <span className="font-black block capitalize">
                          {insights.peorMes.mes}
                        </span>
                        <span className="text-xs text-red-300 font-bold">
                          {formaterMoneda(insights.peorMes.total)}
                        </span>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default InsightsVentas;