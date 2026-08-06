import React from 'react';
import { Lock, CheckCircle2, User, Wallet } from 'lucide-react';

const CorteCajaCiego = ({
  handleCierreCajaCiego,
  efectivoEntregar,
  setEfectivoEntregar,
  efectivoDejar,
  setEfectivoDejar,
  guardandoCorte,
  currentUser,
  fondoCaja
}) => {

  // 👇 LÓGICA ESTRICTA DE BLOQUEO
  // Entregar: No puede estar vacío y debe ser MAYOR a 0
  const isEntregarInvalido = efectivoEntregar === '' || Number(efectivoEntregar) <= 0;
  // Dejar (Fondo): No puede estar vacío, pero SÍ permite ser exactamente 0
  const isDejarInvalido = efectivoDejar === '' || Number(efectivoDejar) < 0;
  
  const botonBloqueado = guardandoCorte || isEntregarInvalido || isDejarInvalido;

  return (
    <div className="animate-in fade-in pb-20 max-w-xl mx-auto px-4 mt-4 md:mt-8">
      <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-xl border border-slate-200 text-center">
        
        {/* Candado de Seguridad de Auditoría */}
        <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-6 shadow-sm">
          <Lock size={32} />
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Cierre de Turno Obligatorio</h2>
        
        <div className="mt-2 mb-4">
          <span className="text-[10px] bg-slate-900 text-white font-black uppercase tracking-widest px-3 py-1 rounded-md inline-block">
            Modalidad: Corte a Ciegas
          </span>
        </div>

        {/* Responsable del Turno */}
        <p className="text-sm font-bold text-slate-600 mt-4 flex items-center justify-center gap-1">
          <User size={16} className="text-indigo-500"/> Responsable: <span className="text-indigo-600 font-black">{currentUser?.nombre || currentUser?.usuario}</span>
        </p>

        {/* Mostrar Fondo Inicial para claridad del cajero */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 mt-6 mb-6 flex items-center justify-center gap-4 shadow-inner">
          <Wallet className="text-emerald-500" size={28}/>
          <div className="text-left">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Fondo Inicial Registrado</p>
            <p className="text-2xl font-black text-emerald-800 leading-none">${Number(fondoCaja || 0).toFixed(2)}</p>
          </div>
        </div>

        <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8">
          Por políticas de auditoría y seguridad, debes declarar cómo vas a separar el dinero físico que tienes en tu gaveta antes de poder concluir tu jornada laboral.
        </p>

        {/* Formulario de Entrada de Efectivo Físico Desglosado */}
        <form onSubmit={handleCierreCajaCiego} className="space-y-4 text-left mb-6">
          
          {/* Input para Efectivo a Entregar (Dueño/Retiro) */}
          <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 shadow-inner">
            <label className="block text-xs font-black text-blue-600 uppercase tracking-widest mb-3 text-center">
              1. Efectivo a Entregar (Retiro / Gerencia)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-5 font-black text-3xl text-blue-400 select-none">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01" // 👈 Se restringe en HTML para no admitir 0
                required
                disabled={guardandoCorte}
                value={efectivoEntregar}
                onChange={(e) => setEfectivoEntregar(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border-2 border-blue-200 rounded-2xl p-5 pl-12 text-center text-3xl font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700 tracking-tight placeholder-slate-200 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Input para Efectivo a Dejar en Caja (Fondo Siguiente) */}
          <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 shadow-inner">
            <label className="block text-xs font-black text-emerald-600 uppercase tracking-widest mb-3 text-center">
              2. Efectivo a dejar en Caja (Fondo para mañana)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-5 font-black text-3xl text-emerald-400 select-none">$</span>
              <input
                type="number"
                step="0.01"
                min="0" // 👈 Este SÍ admite 0
                required
                disabled={guardandoCorte}
                value={efectivoDejar}
                onChange={(e) => setEfectivoDejar(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border-2 border-emerald-200 rounded-2xl p-5 pl-12 text-center text-3xl font-black outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-slate-700 tracking-tight placeholder-slate-200 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Sumador visual para que el cajero confirme su total antes de enviar */}
          <div className="text-center pt-2 pb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suma Total Declarada</p>
            <p className="text-2xl font-black text-slate-700">
              ${((Number(efectivoEntregar) || 0) + (Number(efectivoDejar) || 0)).toFixed(2)}
            </p>
          </div>

          {/* 👇 NUEVO: Botón de Envío con estilos visuales dinámicos de bloqueo */}
          <button
            type="submit"
            disabled={botonBloqueado}
            className={`w-full text-white py-5 rounded-2xl font-black text-xl transition-all flex justify-center items-center gap-2 mt-2 ${
              botonBloqueado
                ? 'bg-slate-300 shadow-none cursor-not-allowed opacity-70' // Gris claro cuando está bloqueado
                : 'bg-slate-800 hover:bg-indigo-600 shadow-lg shadow-slate-800/20 active:scale-95' // Oscuro/Azul cuando está activo
            }`}
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