import React from 'react';
import { Phone, PackagePlus } from 'lucide-react';

const FormularioConsumoLlevar = ({
  telefonoOrdenRapida,
  setTelefonoOrdenRapida,
  clienteAsignado
}) => {
  // Regla de Negocio: Si ya hay un cliente con cuenta vinculada, no pedimos teléfono rápido
  if (clienteAsignado) return null;

  return (
    <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-inner animate-in fade-in duration-200">
      <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2 flex items-center gap-1.5">
        <PackagePlus size={14} /> Datos para llevar
      </label>
      
      <div className="relative">
         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Phone size={16} className="text-slate-400" />
         </div>
         <input 
            type="tel" 
            maxLength="10" 
            placeholder="Teléfono a 10 dígitos (Opcional)" 
            value={telefonoOrdenRapida} 
            onChange={e => setTelefonoOrdenRapida(e.target.value.replace(/\D/g, ''))} 
            className="w-full bg-white rounded-xl py-3 pl-10 pr-3 text-xs md:text-sm font-bold outline-none border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 placeholder-slate-400 shadow-sm" 
         />
      </div>
      <p className="text-[10px] font-bold text-slate-400 mt-2 leading-tight">
        * El número es opcional, pero ayuda a contactar al cliente si hay dudas con su orden.
      </p>
    </div>
  );
};

export default FormularioConsumoLlevar;