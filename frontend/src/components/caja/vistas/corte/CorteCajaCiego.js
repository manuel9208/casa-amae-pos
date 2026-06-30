import React from 'react';
import { Lock, CheckCircle2, User } from 'lucide-react';

const CorteCajaCiego = ({
  handleCierreCajaCiego,
  efectivoManual,
  setEfectivoManual,
  guardandoCorte,
  currentUser
}) => {
  return (
    <div className="animate-in fade-in pb-20 max-w-xl mx-auto px-4 mt-4 md:mt-8">
      <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-xl border border-slate-200 text-center">
        {/* Candado de Seguridad de Auditoría */}
        <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-6 shadow-sm">
          <Lock size={32} />
        </div>
        
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Cierre de Turno Obligatorio</h2>
        
        <div className="mt-2">
          <span className="text-[10px] bg-slate-900 text-white font-black uppercase tracking-widest px-3 py-1 rounded-md inline-block">
            Modalidad: Corte a Ciegas
          </span>
        </div>

        {/* Responsable del Turno */}
        <p className="text-sm font-bold text-slate-600 mt-4 flex items-center justify-center gap-1">
           <User size={16} className="text-indigo-500"/> Responsable: <span className="text-indigo-600 font-black">{currentUser?.nombre || currentUser?.usuario}</span>
        </p>

        <p className="text-slate-500 font-bold text-sm leading-relaxed mt-4 mb-8">
          Por políticas de auditoría y seguridad, debes declarar el dinero exacto que tienes físicamente en tu gaveta antes de poder concluir tu jornada laboral. El sistema utilizará el Fondo Inicial que declaraste al abrir la caja para calcular el arqueo final.
        </p>

        {/* Formulario de Entrada de Efectivo Físico */}
        <form onSubmit={handleCierreCajaCiego} className="space-y-6 text-left">
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
              Efectivo Físico Contado al Cierre
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-5 font-black text-3xl text-slate-400 select-none">$</span>
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                required 
                disabled={guardandoCorte}
                value={efectivoManual} 
                onChange={(e) => setEfectivoManual(e.target.value)} 
                placeholder="0.00"
                className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 pl-12 text-center text-4xl font-black outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 tracking-tight placeholder-slate-200 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Botón de Envío de Arqueo */}
          <button 
            type="submit" 
            disabled={guardandoCorte || !efectivoManual} 
            className="w-full bg-slate-800 hover:bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-slate-800/20 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-40 disabled:scale-100"
          >
            <CheckCircle2 size={22} /> 
            {guardandoCorte ? "Asentando Cierre..." : "Efectuar Cierre y Salir"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CorteCajaCiego;