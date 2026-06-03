import React from 'react';
import { DollarSign, PackageOpen, TrendingUp } from 'lucide-react';

const ResumenFinanciero = ({ resumen, formaterMoneda }) => {
  if (!resumen) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2 animate-in fade-in">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center print:border-slate-300 print:shadow-none print:p-4">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 print:hidden">
          <DollarSign size={24}/>
        </div>
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest print:text-[10px]">Ingresos Brutos</span>
        <span className="text-3xl font-black text-slate-800 print:text-xl">
          {formaterMoneda(resumen.ventas_totales)}
        </span>
      </div>
      
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center print:border-slate-300 print:shadow-none print:p-4">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3 print:hidden">
          <PackageOpen size={24}/>
        </div>
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest print:text-[10px]">Costo Inversión</span>
        <span className="text-3xl font-black text-red-600 print:text-xl">
          {formaterMoneda(resumen.inversion_total)}
        </span>
      </div>

      <div className="bg-emerald-500 p-6 rounded-3xl shadow-lg border border-emerald-400 flex flex-col items-center text-center transform hover:scale-105 transition print:bg-white print:border-slate-300 print:shadow-none print:transform-none print:p-4">
        <div className="w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center mb-3 print:hidden">
          <TrendingUp size={24}/>
        </div>
        <span className="text-xs font-black text-emerald-100 uppercase tracking-widest print:text-slate-400 print:text-[10px]">Ganancia Neta</span>
        <span className="text-4xl font-black text-white print:text-emerald-600 print:text-2xl">
          {formaterMoneda(resumen.ganancia_total)}
        </span>
      </div>

      <div className="bg-slate-800 p-6 rounded-3xl shadow-md flex flex-col items-center text-center print:bg-white print:border-slate-300 print:shadow-none print:p-4">
        <div className="w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center mb-3 print:hidden">
          <PackageOpen size={24}/>
        </div>
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest print:text-[10px]">Platillos Vendidos</span>
        <span className="text-4xl font-black text-white print:text-slate-800 print:text-2xl">
          {resumen.productos_vendidos}
        </span>
      </div>
    </div>
  );
};

export default ResumenFinanciero;