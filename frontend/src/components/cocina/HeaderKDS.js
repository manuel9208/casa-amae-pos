import React from 'react';
import { ChefHat, LogOut, PackagePlus, Trash2, Maximize } from 'lucide-react';  

const HeaderKDS = ({ user, onLogout, filtroTab, setFiltroTab, setModalInsumo, setModalMermas, setModalAsistencia, configGlobal = {} }) => {  
    const isAsistenciaPin = configGlobal?.asistencia_pin_caja === undefined || configGlobal?.asistencia_pin_caja === true || String(configGlobal?.asistencia_pin_caja) === 'true';  

    // 👇 CANDADO DE SEGURIDAD: Leemos los permisos del perfil que inició sesión
    const isGlobalAdmin = user?.usuario === 'admin';
    const canMermas = isGlobalAdmin || user?.permisos?.reportar_mermas === true;

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.error(e));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    return (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between bg-slate-800 p-4 rounded-3xl shadow-md border border-slate-700 mb-4 gap-4 print:hidden mx-4 md:mx-8 mt-4">  
            
            {/* LADO IZQUIERDO: Identidad */}
            <div className="flex items-center gap-4">
                <div className="bg-orange-500 p-3 rounded-xl shadow-md shadow-orange-500/20">
                    <ChefHat size={28} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white leading-tight tracking-wide">KDS - Monitor</h1>
                    <p className="text-xs font-bold text-orange-400">Usuario Activo: {user.nombre}</p>
                </div>  
                
                {isAsistenciaPin && (
                    <div className="hidden sm:flex flex-col gap-1 pl-4 border-l border-slate-700 ml-2">
                        <button onClick={() => setModalAsistencia('Entrada')} className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1 rounded-md transition active:scale-95 border border-emerald-500/30">
                            ▶ Entrada
                        </button>
                        <button onClick={() => setModalAsistencia('Salida')} className="text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1 rounded-md transition active:scale-95 border border-rose-500/30">
                            ⏹ Salida
                        </button>
                    </div>
                )}
            </div>  

            {/* CENTRO: Filtro de Áreas */}
            <div className="flex bg-slate-900 p-1.5 rounded-2xl justify-center shadow-inner border border-slate-950">
                {['Todo', 'Cocina', 'Barra'].map(tab => (
                    <button 
                        key={tab} 
                        onClick={() => setFiltroTab(tab)} 
                        className={`px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center ${filtroTab === tab ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {tab === 'Cocina' && <ChefHat size={16} className="mr-2"/>}
                        {tab === 'Barra' && <span className="mr-2">☕</span>}
                        {tab}
                    </button>
                ))}
            </div>  

            {/* LADO DERECHO: Acciones */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setModalInsumo(true)}
                    className="flex-1 lg:flex-none flex items-center justify-center p-3 md:px-4 md:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-lg shadow-blue-500/20"
                    title="Solicitar Insumo a Caja"
                >
                    <PackagePlus size={18}/> <span className="hidden md:inline ml-2">Pedir Insumo</span>
                </button>
                
                {/* 👇 APLICAMOS EL CANDADO AQUÍ */}
                {canMermas && (
                    <button
                        onClick={() => setModalMermas(true)}
                        className="flex-1 lg:flex-none flex items-center justify-center p-3 md:px-4 md:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-lg shadow-red-500/20"
                        title="Reportar Merma"
                    >
                        <Trash2 size={18}/> <span className="hidden md:inline ml-2">Merma</span>
                    </button>
                )}

                <button 
                    onClick={toggleFullScreen} 
                    className="p-3 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl transition active:scale-95 hidden sm:block border border-slate-600" 
                    title="Pantalla Completa"
                >
                    <Maximize size={18}/>
                </button>

                <button 
                    onClick={onLogout} 
                    className="flex items-center justify-center p-3 bg-slate-900 text-slate-400 hover:text-red-400 rounded-xl font-bold transition border border-slate-700 active:scale-95"
                    title="Cerrar Sesión"
                >
                    <LogOut size={18}/>
                </button>
            </div>
        </div>
    );
};  

export default HeaderKDS;