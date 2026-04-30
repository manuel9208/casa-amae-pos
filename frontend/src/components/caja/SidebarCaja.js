import React from 'react';
import { DollarSign, CheckCircle2, XCircle, ShoppingBag, Monitor, List, FileText, LogOut, Phone, ShoppingCart } from 'lucide-react';

const SidebarCaja = ({ 
  user, onLogout, configGlobal, toggleEstadoNegocio, 
  vistaActiva, setVistaActiva, pedidosPorConfirmar, pendientesDePago, listosParaEntregar,
  setModalCompraRapida // 👇 Prop recibida
}) => {
  return (
    <div className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-20 relative shrink-0">
      <div className="p-8 pb-4">
        <h1 className="text-2xl font-black flex items-center gap-3 text-emerald-400"><DollarSign /> CAJA</h1>
      </div>
      
      {configGlobal && (
        <div className="px-4 mb-4 mt-2">
          <button 
            onClick={toggleEstadoNegocio} 
            className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
              configGlobal.negocio_abierto 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-emerald-500/30' 
                : 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30'
            }`}
          >
            {configGlobal.negocio_abierto ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            {configGlobal.negocio_abierto ? 'Recepción Abierta' : 'Pedidos Detenidos'}
          </button>
        </div>
      )}

      <nav className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto pb-4">
        <button onClick={() => setVistaActiva('confirmar')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${vistaActiva === 'confirmar' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><Phone size={22}/> Por Confirmar{pedidosPorConfirmar.length > 0 && <span className="ml-auto bg-orange-700 text-white text-xs px-2 py-1 rounded-full">{pedidosPorConfirmar.length}</span>}</button>
        <button onClick={() => setVistaActiva('cobrar')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${vistaActiva === 'cobrar' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><ShoppingBag size={22}/> Cobrar Pedidos{pendientesDePago.length > 0 && <span className="ml-auto bg-blue-800 text-white text-xs px-2 py-1 rounded-full">{pendientesDePago.length}</span>}</button>
        <button onClick={() => setVistaActiva('entregas')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all relative ${vistaActiva === 'entregas' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><Monitor size={22}/> Monitor Entregas{listosParaEntregar.length > 0 && <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-1 rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]">{listosParaEntregar.length}</span>}</button>
        <button onClick={() => setVistaActiva('historial')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${vistaActiva === 'historial' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><List size={22}/> Ver Todos</button>
        
        {/* 👇 NUEVO BOTÓN: Compra Rápida */}
        <div className="pt-4 mt-4 border-t border-slate-800">
           <button onClick={() => setModalCompraRapida(true)} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-emerald-400 hover:bg-emerald-500/10 transition-all border border-emerald-500/20">
              <ShoppingCart size={22}/> Compras Rápidas
           </button>
        </div>

        <button onClick={() => setVistaActiva('corte')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all mt-4 ${vistaActiva === 'corte' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><FileText size={22}/> Corte de Caja</button>
      </nav>
      <div className="p-6 border-t border-slate-800 text-center"><p className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-1">Cajero en Turno</p><p className="text-lg font-black text-slate-200 mb-6">{user?.nombre}</p><button onClick={onLogout} className="w-full bg-slate-800 hover:bg-red-500 text-red-400 hover:text-white py-4 rounded-2xl font-black transition flex items-center justify-center gap-2"><LogOut size={20}/> Cerrar Sesión</button></div>
    </div>
  );
};

export default SidebarCaja;