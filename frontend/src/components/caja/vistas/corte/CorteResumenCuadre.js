import React from 'react';
import { Calculator } from 'lucide-react';

const CorteResumenCuadre = ({
  totalEfectivoFisico,
  totalDigital,
  totalVentasGlobales
}) => {
  return (
    <div className="bg-emerald-50 p-6 md:p-8 rounded-[32px] border border-emerald-200 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-600 text-white p-2 md:p-3 rounded-xl shadow-md shadow-emerald-600/20">
          <Calculator size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-emerald-900 uppercase tracking-widest leading-tight">
            4. Gran Total (Cuadre)
          </h3>
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-0.5">
            Consolidado Financiero Global
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Efectivo Global */}
        <div className="flex justify-between items-center border-b border-emerald-200/60 pb-3 hover:bg-emerald-100/30 p-2 rounded-lg transition-colors">
          <span className="text-sm font-bold text-emerald-700">Total Efectivo Físico Global:</span>
          <span className="text-xl font-black text-emerald-900">${totalEfectivoFisico.toFixed(2)}</span>
        </div>
        
        {/* Digital Global */}
        <div className="flex justify-between items-center border-b border-emerald-200/60 pb-3 hover:bg-emerald-100/30 p-2 rounded-lg transition-colors">
          <span className="text-sm font-bold text-emerald-700">Total Pagos Digitales:</span>
          <span className="text-xl font-black text-emerald-900">${totalDigital.toFixed(2)}</span>
        </div>
        
        {/* Ventas Brutas Totales */}
        <div className="flex justify-between items-end pt-4 mt-2">
          <div>
            <span className="text-sm font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
              Ventas Brutas Totales
            </span>
            <p className="text-[10px] font-bold text-emerald-600 mt-1.5 bg-emerald-100/50 px-2 py-1 rounded w-fit">
              Suma de Platillos + Extras + Envíos
            </p>
          </div>
          <span className="text-4xl md:text-5xl font-black text-emerald-600 drop-shadow-sm">
            ${totalVentasGlobales.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CorteResumenCuadre;