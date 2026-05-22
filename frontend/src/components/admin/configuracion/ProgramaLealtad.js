import React from 'react';

const ProgramaLealtad = ({ configGlobal, setConfigGlobal, isSubmitting }) => {
  return (
    <div className="bg-yellow-50/30 p-6 rounded-3xl border border-yellow-200 space-y-6">
      <h3 className="text-xl font-bold text-yellow-800 flex items-center gap-2">⭐ 8. Programa de Lealtad (Puntos)</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-yellow-200">
        <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer bg-white p-4 rounded-2xl border border-yellow-200 shadow-sm">
          <input disabled={isSubmitting} type="checkbox" checked={configGlobal.puntos_activos === undefined ? true : (configGlobal.puntos_activos === true || configGlobal.puntos_activos === 'true')} onChange={e => setConfigGlobal({...configGlobal, puntos_activos: e.target.checked})} className="w-6 h-6 accent-yellow-500" /> 
          Habilitar Acumulación de Puntos
        </label>

        <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer bg-white p-4 rounded-2xl border border-yellow-200 shadow-sm">
          <input disabled={isSubmitting} type="checkbox" checked={configGlobal.puntos_canje_activo === undefined ? true : (configGlobal.puntos_canje_activo === true || configGlobal.puntos_canje_activo === 'true')} onChange={e => setConfigGlobal({...configGlobal, puntos_canje_activo: e.target.checked})} className="w-6 h-6 accent-yellow-500" /> 
          Permitir Canje de Puntos
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-black text-yellow-600 uppercase mb-1">Puntos Ganados por Compra (%)</label>
          <input disabled={isSubmitting} type="number" min="0" max="100" value={configGlobal.puntos_porcentaje !== undefined ? configGlobal.puntos_porcentaje : 10} onChange={e => setConfigGlobal({...configGlobal, puntos_porcentaje: e.target.value})} className="w-full p-4 bg-white border border-yellow-200 rounded-2xl outline-none font-black text-slate-700 text-lg" placeholder="Ej. 10" />
          <p className="text-[10px] text-slate-500 mt-2 font-bold leading-tight">Si pones 10%, un pedido de $100 MXN generará 10 puntos para el cliente.</p>
        </div>
        
        <div>
          <label className="block text-xs font-black text-yellow-600 uppercase mb-1">Valor en Dinero de Cada Punto ($)</label>
          <input disabled={isSubmitting} type="number" step="0.01" min="0.01" value={configGlobal.puntos_valor_peso !== undefined ? configGlobal.puntos_valor_peso : 1.00} onChange={e => setConfigGlobal({...configGlobal, puntos_valor_peso: e.target.value})} className="w-full p-4 bg-white border border-yellow-200 rounded-2xl outline-none font-black text-slate-700 text-lg" placeholder="Ej. 1.00" />
          <p className="text-[10px] text-slate-500 mt-2 font-bold leading-tight">A cuánto dinero real equivale cada punto. Si pones $1.00, 10 puntos descontarán $10 MXN.</p>
        </div>
      </div>
    </div>
  );
};

export default ProgramaLealtad;