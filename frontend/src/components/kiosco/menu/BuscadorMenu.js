import React from 'react';
import { Search, X } from 'lucide-react';

const BuscadorMenu = ({ busquedaTexto, setBusquedaTexto }) => {
  return (
    <div className="relative mb-4 md:mb-6 shrink-0">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={busquedaTexto}
        onChange={(e) => setBusquedaTexto(e.target.value)}
        placeholder="Buscar en el menú..."
        className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-10 py-3.5 font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm transition-all"
      />
      {busquedaTexto && (
        <button
          onClick={() => setBusquedaTexto('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition p-1"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

export default BuscadorMenu;