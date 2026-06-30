import React, { useState, useEffect } from 'react';
import { Calendar, Sparkles, Palmtree, LogOut, ArrowLeft, DollarSign } from 'lucide-react';

const Empleado = ({ user, apiUrl, onLogout, onVolver }) => {
    // 'horarios' | 'limpieza' | 'nomina' | 'vacaciones'
    const [vistaActiva, setVistaActiva] = useState('horarios');
    const [userData, setUserData] = useState(user);

    useEffect(() => {
        fetch(`${apiUrl}/usuarios`).then(r => r.json()).then(data => {
            const myData = data.find(u => u.id === user.id);
            if (myData) setUserData(myData);
        }).catch(()=>{});
    }, [apiUrl, user.id]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 animate-in fade-in">
            {/* NAVBAR SUPERIOR */}
            <div className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {onVolver && (
                            <button onClick={onVolver} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition" title="Volver al Trabajo">
                                <ArrowLeft size={20}/>
                            </button>
                        )}
                        <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-blue-400 rounded-full flex items-center justify-center font-black text-xl shadow-lg border-2 border-slate-700">
                            {userData.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-black leading-none text-lg">{userData.nombre}</p>
                            <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mt-1">Portal del Empleado</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-2 md:px-4 md:py-2 rounded-xl text-sm font-bold transition flex items-center gap-2">
                        <span className="hidden md:inline">Cerrar Sesión</span> <LogOut size={16}/>
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto mt-8 px-4">
                {/* TABS DE NAVEGACIÓN */}
                <div className="flex bg-white p-2 rounded-3xl shadow-sm border border-slate-200 mb-8 overflow-x-auto custom-scrollbar">
                    <button onClick={() => setVistaActiva('horarios')} className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 min-w-[140px] ${vistaActiva === 'horarios' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <Calendar size={18}/> Mi Horario
                    </button>
                    <button onClick={() => setVistaActiva('nomina')} className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 min-w-[140px] ${vistaActiva === 'nomina' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <DollarSign size={18}/> Mis Recibos
                    </button>
                    <button onClick={() => setVistaActiva('limpieza')} className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 min-w-[140px] ${vistaActiva === 'limpieza' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <Sparkles size={18}/> Mis Tareas
                    </button>
                    <button onClick={() => setVistaActiva('vacaciones')} className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 min-w-[140px] ${vistaActiva === 'vacaciones' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <Palmtree size={18}/> Vacaciones
                    </button>
                </div>

                {/* CONTENEDOR DE VISTAS */}
                {vistaActiva === 'horarios' && <div className="p-10 text-center text-slate-400">Vista de Horarios en construcción...</div>}
                {vistaActiva === 'nomina' && <div className="p-10 text-center text-slate-400">Vista de Nómina en construcción...</div>}
                {vistaActiva === 'limpieza' && <div className="p-10 text-center text-slate-400">Vista de Limpieza en construcción...</div>}
                {vistaActiva === 'vacaciones' && <div className="p-10 text-center text-slate-400">Vista de Vacaciones en construcción...</div>}
            </div>
        </div>
    );
};

export default Empleado;