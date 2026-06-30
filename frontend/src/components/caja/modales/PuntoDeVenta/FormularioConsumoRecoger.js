import React from 'react';
import { Phone, Car } from 'lucide-react';

const FormularioConsumoRecoger = ({
  telefonoOrdenRapida,
  setTelefonoOrdenRapida,
  notaOpcional,
  setNotaOpcional,
  clienteAsignado
}) => {
  return (
    <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-inner animate-in fade-in duration-200 space-y-3">
      <label className="block text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1 flex items-center gap-1.5">
        <Car size={14} /> Datos para Recoger en Local
      </label>

      {/* Teléfono (Obligatorio si no hay cliente asignado) */}
      {!clienteAsignado && (
        <div className="relative">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone size={16} className="text-red-400" />
           </div>
           <input 
              type="tel" 
              maxLength="10" 
              placeholder="Teléfono a 10 dígitos (Obligatorio) *" 
              value={telefonoOrdenRapida} 
              onChange={e => setTelefonoOrdenRapida(e.target.value.replace(/\D/g, ''))} 
              className="w-full bg-white rounded-xl py-3 pl-10 pr-3 text-xs md:text-sm font-bold outline-none border border-red-200 focus:border-red-400 placeholder-red-300 text-red-900 transition-all shadow-sm" 
           />
        </div>
      )}

      {/* Notas o Referencias (Opcional) */}
      <div className="relative">
        <textarea 
          value={notaOpcional} 
          onChange={e => setNotaOpcional(e.target.value)} 
          placeholder="Notas (Opcional). Ej. Pasa en 15 min, Carro rojo, Placas..." 
          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs md:text-sm font-bold outline-none h-16 resize-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-sm text-slate-800 placeholder-slate-400" 
        />
      </div>
    </div>
  );
};

export default FormularioConsumoRecoger;