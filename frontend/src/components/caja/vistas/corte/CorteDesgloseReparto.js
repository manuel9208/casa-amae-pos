import React from 'react';
import { Bike, MapPin } from 'lucide-react';

const CorteDesgloseReparto = ({
  mathHoy,
  pFondoRepartidor,
  efectivoEsperadoMotos
}) => {
  return (
    <div className="bg-indigo-50/50 p-6 md:p-10 rounded-[40px] shadow-sm border border-indigo-100 animate-in slide-in-from-bottom-6 mb-8">
      {/* ENCABEZADO LOGÍSTICO */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-md shadow-indigo-600/20">
          <Bike size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-indigo-900 tracking-tight">2. Repartidores (Motos)</h3>
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-0.5">Control de Flotilla y Envíos</p>
        </div>
      </div>  

      {/* REJILLA DE DATOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm group hover:border-indigo-300 transition-all duration-200">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Ventas (Domicilio)</p>
          <p className="text-xl font-black text-indigo-900">${(mathHoy.dPlatillos + mathHoy.dExtras).toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm group hover:border-indigo-300 transition-all">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <MapPin size={12} className="text-purple-400" /> Envíos Cobrados
          </p>
          <p className="text-xl font-black text-indigo-900">${mathHoy.dEnvio.toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Fondo Repartidores</p>
          <p className="text-xl font-black text-indigo-900">${pFondoRepartidor.toFixed(2)}</p>
        </div>
        
        <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm group hover:bg-emerald-100/50 transition-all">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ingresos Efectivo</p>
          <p className="text-xl font-black text-emerald-700">+${mathHoy.dEfectivo.toFixed(2)}</p>
        </div>
      </div>

      {/* RECOLECCIÓN LOGÍSTICA TOTAL */}
      <div className="bg-indigo-600 p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center text-white hover:bg-indigo-700 transition-colors duration-300">
        <div className="text-center md:text-left">
          <p className="text-indigo-200 font-black uppercase tracking-widest mb-1 text-sm">
            Efectivo Físico a Entregar por Motos
          </p>
          <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider opacity-90">
            Fondo Repartidores + Pagos en Efectivo de Ruta
          </p>
        </div>
        <p className="text-5xl md:text-6xl font-black mt-4 md:mt-0 tracking-tight">
          ${efectivoEsperadoMotos.toFixed(2)}
        </p>
      </div>
    </div>
  );
};

export default CorteDesgloseReparto;