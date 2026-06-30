import React from 'react';
import { Receipt, DollarSign, PlusCircle } from 'lucide-react';

const FormularioNuevoGasto = ({
  nuevoGasto,
  setNuevoGasto,
  agregarGasto,
  isSubmitting
}) => {
  return (
    <div className="bg-white p-6 md:p-8 rounded-[36px] border border-slate-200 shadow-sm animate-in fade-in duration-300">
      
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-red-100 text-red-600 p-2 md:p-3 rounded-xl shadow-inner">
          <Receipt size={24} />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Registrar Salida</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Compras de insumos o pagos
          </p>
        </div>
      </div>

      <form onSubmit={agregarGasto} className="space-y-4">
        {/* Input: Descripción del Gasto */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">
            Descripción / Concepto *
          </label>
          <input 
            type="text" 
            required 
            disabled={isSubmitting}
            value={nuevoGasto.descripcion} 
            onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} 
            placeholder="Ej. Compra de tortillas, Pago a proveedor..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-slate-700 disabled:opacity-50"
          />
        </div>

        {/* Input: Monto del Gasto */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">
            Monto Retirado de Caja *
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-slate-400 font-black">
              <DollarSign size={20} />
            </span>
            <input 
              type="number" 
              step="0.01" 
              min="0.01" 
              required 
              disabled={isSubmitting}
              value={nuevoGasto.monto} 
              onChange={e => setNuevoGasto({...nuevoGasto, monto: e.target.value})} 
              placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-lg md:text-xl font-black outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-slate-800 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Botón de Envío */}
        <button 
          type="submit" 
          disabled={isSubmitting || !nuevoGasto.descripcion.trim() || !nuevoGasto.monto}
          className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white py-4 md:py-5 rounded-2xl font-black text-sm md:text-base uppercase tracking-widest shadow-lg shadow-red-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
        >
          <PlusCircle size={20} />
          {isSubmitting ? 'Guardando...' : 'Asentar Gasto'}
        </button>
      </form>
      
    </div>
  );
};

export default FormularioNuevoGasto;