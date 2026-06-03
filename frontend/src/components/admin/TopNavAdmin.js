import React from 'react';
import { 
  ShoppingCart, LogOut, LayoutGrid, ClipboardList, BookOpen, Settings, 
  Users, TrendingUp, Gift, Map, MonitorSmartphone 
} from 'lucide-react';

const TopNavAdmin = ({
  user, onLogout, onGoToKiosco, seccion, setSeccion,
  canViewMenu, canViewInventario, canViewCatalogos, canViewUsuarios,
  canViewConfig, canViewClientes, canViewReportes, canViewPromociones, canViewMesas
}) => {
  return (
    <div className="bg-white border-b border-slate-200 shadow-sm z-40 shrink-0 flex flex-col w-full">
      
      {/* 1. FILA SUPERIOR: Logo, User, Acciones Rápidas */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 gap-4">
        
        {/* Izquierda: Branding */}
        <div className="flex items-center gap-4">
           <h1 className="text-2xl font-black flex items-center gap-2 text-slate-800 tracking-tighter">
             <div className="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><ShoppingCart size={24} /></div>
             ADMIN
           </h1>
        </div>

        {/* Derecha: Acciones Principales y Usuario */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
           
           {/* Botón: Ir al Kiosco */}
           <button 
              onClick={onGoToKiosco} 
              className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black text-sm transition shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
           >
              <MonitorSmartphone size={20}/> <span className="hidden sm:inline">Ir al Kiosco</span><span className="sm:hidden">Kiosco</span>
           </button>

           <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200 ml-2">
              <div className="text-right">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user?.rol === 'admin' ? 'Admin Global' : 'Usuario'}</p>
                 <p className="text-sm font-black text-slate-800 leading-none">{user?.nombre || user?.usuario}</p>
              </div>
              <button onClick={onLogout} className="bg-red-50 text-red-500 hover:bg-red-100 p-2.5 rounded-xl transition" title="Cerrar Sesión">
                 <LogOut size={18}/>
              </button>
           </div>

           {/* Botón Móvil Cerrar Sesión */}
           <button onClick={onLogout} className="sm:hidden bg-red-50 text-red-500 hover:bg-red-100 p-3 rounded-2xl transition" title="Cerrar Sesión">
              <LogOut size={20}/>
           </button>
        </div>
      </div>

      {/* 2. FILA INFERIOR: Pestañas de Navegación Deslizables (Scroll Horizontal Táctil) */}
      <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 overflow-x-auto no-scrollbar scroll-smooth">
         <div className="flex gap-2 w-max pb-1">
            
            {canViewMenu && (
              <button onClick={() => setSeccion('menu')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${seccion === 'menu' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                 <ClipboardList size={18}/> Menú
              </button>
            )}
            
            {canViewInventario && (
              <button onClick={() => setSeccion('inventario')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${seccion === 'inventario' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                 <BookOpen size={18}/> Inventario
              </button>
            )}
            
            {canViewCatalogos && (
              <button onClick={() => setSeccion('catalogos')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${seccion === 'catalogos' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                 <LayoutGrid size={18}/> Catálogos
              </button>
            )}
            
            {canViewPromociones && (
              <button onClick={() => setSeccion('promociones')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${seccion === 'promociones' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                 <Gift size={18}/> Promociones
              </button>
            )}
            
            {canViewMesas && (
              <button onClick={() => setSeccion('mesas')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${seccion === 'mesas' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                 <Map size={18}/> Mesas / QR
              </button>
            )}

            <div className="w-px bg-slate-300 mx-1 shrink-0"></div>

            {canViewClientes && (
              <button onClick={() => setSeccion('clientes')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${seccion === 'clientes' ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                 <Users size={18}/> Clientes CRM
              </button>
            )}
            
            {canViewReportes && (
              <button onClick={() => setSeccion('reportes')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${seccion === 'reportes' ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                 <TrendingUp size={18}/> Finanzas
              </button>
            )}

            {canViewUsuarios && (
              <button onClick={() => setSeccion('usuarios')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${seccion === 'usuarios' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                 <Users size={18}/> Empleados
              </button>
            )}
            
            {canViewConfig && (
              <button onClick={() => setSeccion('configuracion')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${seccion === 'configuracion' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                 <Settings size={18}/> Configuración
              </button>
            )}
         </div>
      </div>
    </div>
  );
};

export default TopNavAdmin;