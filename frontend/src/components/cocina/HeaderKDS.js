import React from 'react';
import { ChefHat, LogOut, PackagePlus, Trash2 } from 'lucide-react';

const HeaderKDS = ({ user, onLogout, filtroTab, setFiltroTab, setModalInsumo, setModalMerma }) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between bg-slate-800 p-4 rounded-3xl shadow-md border border-slate-700 mb-8 gap-4 print:hidden">
      <div className="flex items-center gap-4">
        <div className="bg-orange-500 p-3 rounded-xl shadow-md shadow-orange-500/20">
          <ChefHat size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white leading-tight">KDS - Monitor</h1>
          <p className="text-xs font-bold text-orange-400">Chef: {user.nombre}</p>
        </div>
      </div>

      {/* BOTONES DE NUEVAS FUNCIONES */}
      <div className="flex items-center gap-2">
         <button 
            onClick={() => setModalInsumo(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-lg shadow-blue-500/20"
         >
            <PackagePlus size={16}/> Solicitar Insumo
         </button>
         <button 
            onClick={() => setModalMerma(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-lg shadow-red-500/20"
         >
            <Trash2 size={16}/> Registrar Merma
         </button>
      </div>

      <div className="flex bg-slate-900 p-1 rounded-xl justify-center">
        {['Todo', 'Cocina', 'Barra'].map(tab => (
          <button key={tab} onClick={() => setFiltroTab(tab)} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center ${filtroTab === tab ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
            {tab === 'Cocina' && <ChefHat size={16} className="mr-2"/>}
            {tab === 'Barra' && <span className="mr-2">☕</span>}
            {tab}
          </button>
        ))}
      </div>
      
      <button onClick={onLogout} className="flex items-center justify-center gap-2 text-slate-400 hover:text-white bg-slate-900 px-6 py-3 rounded-xl font-bold transition border border-slate-700 active:scale-95"><LogOut size={18}/> Salir</button>
    </div>
  );
};

export default HeaderKDS;