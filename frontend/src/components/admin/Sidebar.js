import React from 'react';
import { LayoutGrid, ShoppingCart, Users, LogOut, MonitorPlay, BookOpen, Settings, Package, X } from 'lucide-react';

const Sidebar = ({ 
  user, 
  onLogout, 
  onGoToKiosco, 
  seccion, 
  setSeccion, 
  menuAbierto, 
  setMenuAbierto, 
  canViewMenu, 
  canViewInventario, 
  canViewCatalogos, 
  canViewUsuarios, 
  canViewConfig 
}) => {
  return (
    <>
      {/* ================= OVERLAY MÓVIL ================= */}
      {menuAbierto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white p-6 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shrink-0 ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <button 
          onClick={() => setMenuAbierto(false)}
          className="lg:hidden absolute top-5 right-5 text-slate-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-8 px-2 mt-2 lg:mt-0">
          <div className="bg-blue-600 p-2 rounded-lg"><ShoppingCart size={24}/></div>
          <h1 className="text-xl font-black tracking-tighter">POS ADMIN</h1>
        </div>
        
        <button onClick={onGoToKiosco} className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 p-3 rounded-xl font-black mb-8 shadow-lg transition">
          <MonitorPlay size={20}/> IR AL KIOSCO
        </button>
        
        <nav className="space-y-2 flex-1 overflow-y-auto pr-2">
          {canViewMenu && (
            <button onClick={() => { setSeccion('menu'); setMenuAbierto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${seccion === 'menu' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-400'}`}>
              <LayoutGrid size={20} /> Gestión Menú
            </button>
          )}
          {canViewInventario && (
            <button onClick={() => { setSeccion('inventario'); setMenuAbierto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${seccion === 'inventario' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-400'}`}>
              <Package size={20} /> Inventario & Recetas
            </button>
          )}
          {canViewCatalogos && (
            <button onClick={() => { setSeccion('catalogos'); setMenuAbierto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${seccion === 'catalogos' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-400'}`}>
              <BookOpen size={20} /> Ingredientes y Extras
            </button>
          )}
          {canViewUsuarios && (
            <button onClick={() => { setSeccion('usuarios'); setMenuAbierto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${seccion === 'usuarios' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-400'}`}>
              <Users size={20} /> Usuarios
            </button>
          )}
          {canViewConfig && (
            <button onClick={() => { setSeccion('configuracion'); setMenuAbierto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${seccion === 'configuracion' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-400'}`}>
              <Settings size={20} /> Configuración
            </button>
          )}
        </nav>
        
        <div className="mt-auto pt-6 border-t border-slate-800 text-center">
          <p className="text-sm font-bold text-blue-400 mb-4">{user?.nombre}</p>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/10 font-bold transition">
            <LogOut size={20} /> Salir
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;