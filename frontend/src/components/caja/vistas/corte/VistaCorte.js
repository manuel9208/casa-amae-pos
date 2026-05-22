import React from 'react';
import { ChefHat, PlusCircle, MapPin, TrendingDown } from 'lucide-react';

const VistaCorte = ({
  totalPlatillos,
  totalExtras,
  totalEnvio,
  fondoCaja,
  totalEfectivoVentas,
  totalGastos,
  totalTarjetaVentas,
  totalTransferenciaVentas,
  gastosDia
}) => {
  return (
    <div>
      <h2 className="text-4xl font-black mb-10 text-slate-800">Corte de Caja</h2>
      <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-200">
         
         <p className="text-slate-500 font-bold text-lg mb-4">Origen de los Ingresos Totales (Turno Actual)</p>
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex justify-between items-center">
             <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Venta Platillos</p>
               <p className="text-2xl font-black text-slate-700">${totalPlatillos.toFixed(2)}</p>
             </div>
             <ChefHat size={32} className="text-slate-300"/>
           </div>
           <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex justify-between items-center">
             <div>
               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ingresos Extras</p>
               <p className="text-2xl font-black text-emerald-700">${totalExtras.toFixed(2)}</p>
             </div>
             <PlusCircle size={32} className="text-emerald-200"/>
           </div>
           <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex justify-between items-center">
             <div>
               <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Cargos por Envío</p>
               <p className="text-2xl font-black text-purple-700">${totalEnvio.toFixed(2)}</p>
             </div>
             <MapPin size={32} className="text-purple-200"/>
           </div>
         </div>
         
         <div className="border-t border-slate-100 pt-8 mb-8"></div>

         <p className="text-slate-500 font-bold text-lg mb-6">Resumen por Método de Pago</p>
         
         <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Fondo Inicial</p>
              <p className="text-2xl font-black text-slate-700">${(fondoCaja || 0).toFixed(2)}</p>
            </div>
            
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Efectivo Físico</p>
              <p className="text-2xl font-black text-emerald-700">${totalEfectivoVentas.toFixed(2)}</p>
            </div>
            
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100 relative overflow-hidden group">
              <div className="absolute top-2 right-2 text-red-200 group-hover:scale-110 transition"><TrendingDown size={32}/></div>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 relative z-10">Gastos (Compras)</p>
              <p className="text-2xl font-black text-red-700 relative z-10">-${totalGastos.toFixed(2)}</p>
            </div>

            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Tarjetas</p>
              <p className="text-2xl font-black text-blue-700">${totalTarjetaVentas.toFixed(2)}</p>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
              <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2">Transferencias</p>
              <p className="text-2xl font-black text-purple-700">${totalTransferenciaVentas.toFixed(2)}</p>
            </div>
         </div>

         <div className="bg-emerald-600 p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center text-white">
            <div>
               <p className="text-emerald-200 font-black uppercase tracking-widest mb-1 text-sm">Efectivo Físico en Cajón</p>
               <p className="text-[11px] font-bold text-emerald-100 opacity-80 uppercase tracking-wider">(Fondo Inicial + Ventas Efectivo) - Gastos</p>
            </div>
            <p className="text-6xl font-black mt-4 md:mt-0">
               ${((fondoCaja || 0) + totalEfectivoVentas - totalGastos).toFixed(2)}
            </p>
         </div>

         {gastosDia && gastosDia.length > 0 && (
           <div className="mt-8 border-t border-slate-100 pt-8 animate-in fade-in">
             <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Desglose de Salidas de Efectivo</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {gastosDia.map((gasto, index) => (
                 <div key={index} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                   <span className="font-bold text-slate-600 text-sm line-clamp-1">{gasto.nombre}</span>
                   <span className="font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg text-sm">-${Number(gasto.costo_total).toFixed(2)}</span>
                 </div>
               ))}
             </div>
           </div>
         )}

      </div>
    </div>
  );
};

export default VistaCorte;