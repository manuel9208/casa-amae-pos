import React from 'react';
import { AlertCircle, ChefHat } from 'lucide-react';

const TablaDesgloseVentas = ({ detalles, formaterMoneda }) => {
  if (!detalles) return null;

  // 👇 SEPARAMOS LAS VENTAS REALES DEL CONSUMO DE EMPLEADOS
  const ventasNormales = detalles.filter(d => d.categoria !== 'Comedor');
  const ventasComedor = detalles.filter(d => d.categoria === 'Comedor');

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* 🟢 TABLA 1: VENTAS REALES */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:border-slate-300 print:shadow-none">
        <div className="p-6 border-b border-slate-100 print:p-4">
          <h3 className="text-lg font-bold text-slate-800">Desglose de Productos, Extras y Envíos</h3>
        </div>
        
        {ventasNormales.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center bg-slate-50">
               <AlertCircle size={48} className="text-slate-300 mb-3" />
               <p className="text-slate-500 font-bold text-lg">Aún no hay platillos vendidos registrados en este periodo.</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider print:p-2">Producto</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center print:p-2">Vendidos</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right print:p-2">Precio Pub.</th>
                    <th className="p-4 text-xs font-black text-red-500 uppercase tracking-wider text-right print:p-2 print:text-slate-500">Costo Receta</th>
                    <th className="p-4 text-xs font-black text-emerald-600 uppercase tracking-wider text-right print:p-2 print:text-slate-500">Ganancia X U.</th>
                    <th className="p-4 text-xs font-black text-slate-800 uppercase tracking-wider text-right print:p-2">Ganancia Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  {ventasNormales.map((p, i) => {
                    const isExtra = p.categoria === 'Extras';
                    const isEnvio = p.categoria === 'Envíos';

                    return (
                      <tr key={i} className={`transition print:hover:bg-transparent ${isExtra ? 'bg-emerald-50/30' : isEnvio ? 'bg-purple-50/30' : 'hover:bg-slate-50'}`}>
                        <td className="p-4 font-bold text-slate-700 print:p-2 print:text-sm flex items-center gap-2">
                           {isExtra && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md uppercase">Extra</span>}
                           {isEnvio && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-md uppercase">Envío</span>}
                           {p.producto_nombre}
                        </td>
                        <td className="p-4 font-black text-slate-800 text-center text-lg print:p-2 print:text-sm">
                          {p.cantidad_vendida}
                        </td>
                        <td className="p-4 font-medium text-slate-600 text-right print:p-2 print:text-sm">
                          {formaterMoneda(p.precio_venta)}
                        </td>
                        <td className="p-4 font-medium text-red-500 text-right print:p-2 print:text-sm">
                          {formaterMoneda(p.costo_unitario)}
                        </td>
                        <td className="p-4 font-bold text-emerald-600 text-right print:p-2 print:text-sm print:bg-transparent">
                          {formaterMoneda(p.precio_venta - p.costo_unitario)}
                        </td>
                        <td className="p-4 font-black text-slate-800 text-right print:p-2 print:text-sm print:bg-transparent">
                          {formaterMoneda(p.ganancia_neta)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        )}
      </div>

      {/* 🟠 TABLA 2: PRESTACIONES DE EMPLEADOS (Solo se muestra si hay consumo) */}
      {ventasComedor.length > 0 && (
        <div className="bg-orange-50 rounded-3xl shadow-sm border border-orange-200 overflow-hidden print:border-slate-300 print:shadow-none break-inside-avoid">
          <div className="p-6 border-b border-orange-100 print:p-4 bg-orange-100 flex items-center gap-2">
            <ChefHat className="text-orange-600"/>
            <h3 className="text-lg font-bold text-orange-900">Consumo de Empleados (Prestación Comedor)</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-orange-50 border-b border-orange-200 print:bg-slate-100">
                  <th className="p-4 text-xs font-black text-orange-800 uppercase tracking-wider print:p-2">Producto Consumido</th>
                  <th className="p-4 text-xs font-black text-orange-800 uppercase tracking-wider text-center print:p-2">Cantidad</th>
                  <th className="p-4 text-xs font-black text-orange-800 uppercase tracking-wider text-right print:p-2" title="Valor que tendría en el menú público">Valor Menú</th>
                  <th className="p-4 text-xs font-black text-red-600 uppercase tracking-wider text-right print:p-2 print:text-slate-500">Costo Almacén</th>
                  <th className="p-4 text-xs font-black text-red-600 uppercase tracking-wider text-right print:p-2">Gasto Asumido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100 print:divide-slate-300">
                {ventasComedor.map((p, i) => {
                  return (
                    <tr key={i} className="transition hover:bg-orange-100/50 print:hover:bg-transparent">
                      <td className="p-4 font-bold text-orange-900 print:p-2 print:text-sm flex items-center gap-2">
                         {p.producto_nombre}
                      </td>
                      <td className="p-4 font-black text-orange-900 text-center text-lg print:p-2 print:text-sm">
                        {p.cantidad_vendida}
                      </td>
                      <td className="p-4 font-medium text-orange-700 text-right print:p-2 print:text-sm line-through opacity-70">
                        {formaterMoneda(p.precio_venta)}
                      </td>
                      <td className="p-4 font-medium text-red-500 text-right print:p-2 print:text-sm">
                        {formaterMoneda(p.costo_unitario)}
                      </td>
                      <td className="p-4 font-black text-red-600 text-right print:p-2 print:text-sm print:bg-transparent">
                        {formaterMoneda(Math.abs(p.ganancia_neta))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default TablaDesgloseVentas;