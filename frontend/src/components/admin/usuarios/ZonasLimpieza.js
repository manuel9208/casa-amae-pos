import React, { useState, useEffect } from 'react';
import { Sparkles, CalendarDays, Save, Plus, Trash2, ShieldCheck, CheckSquare, Square, Users, Info } from 'lucide-react';

// Importamos la lógica aislada (Capa 1) y el componente visual de fotos (Capa 2)
import { useAuditoriaLimpieza } from './hooks/useAuditoriaLimpieza';
import GaleriaLimpieza from './components/GaleriaLimpieza';

const diasSemanaMap = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const ZonasLimpieza = ({ usuariosDB, apiUrl, showAlert }) => {
    // 1. Extraemos roles válidos del directorio (Ignorando admin global y pantallas TV)
    const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global');
    const rolesDisponibles = [...new Set(empleadosVisibles.map(u => u.rol))].filter(r => r !== 'tv' && r !== 'admin');

    // 2. Conectamos el Motor Lógico (Custom Hook)
    const {
        areasBase,
        plantillaRoles,
        evaluaciones,
        evidencias,
        isSubmitting,
        hayCambios,
        cargarDatosLimpieza,
        guardarCambiosNube,
        agregarArea,
        eliminarArea,
        toggleTareaRol,
        evaluarEvidencia
    } = useAuditoriaLimpieza(apiUrl, showAlert);

    // 3. Estados de Interfaz
    const [vistaActiva, setVistaActiva] = useState('auditoria'); // 'auditoria' o 'plantillas'
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
    const [rolSeleccionado, setRolSeleccionado] = useState(rolesDisponibles[0] || '');
    const [nuevaAreaStr, setNuevaAreaStr] = useState('');

    // Cargar datos al montar el componente
    useEffect(() => {
        cargarDatosLimpieza();
    }, [cargarDatosLimpieza]);

    // Handlers UI
    const handleAgregarArea = (e) => {
        e.preventDefault();
        agregarArea(nuevaAreaStr);
        setNuevaAreaStr('');
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-12">
            
            {/* HEADER Y BOTÓN DE GUARDADO PRINCIPAL */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Sparkles className="text-teal-500" size={32} /> 
                        Auditoría de Limpieza
                    </h2>
                    <p className="text-sm font-bold text-slate-400 mt-1">
                        Revisa la evidencia fotográfica o configura las plantillas perpetuas por puesto.
                    </p>
                </div>
                <div className="flex w-full xl:w-auto items-center gap-4">
                    <button
                        disabled={!hayCambios || isSubmitting}
                        onClick={guardarCambiosNube}
                        className={`w-full xl:w-auto px-8 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${
                            hayCambios 
                            ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xl shadow-teal-500/30 animate-pulse' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        }`}
                    >
                        <Save size={20}/> {hayCambios ? 'Guardar Cambios' : 'Todo Guardado'}
                    </button>
                </div>
            </div>

            {/* PESTAÑAS DE NAVEGACIÓN */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => setVistaActiva('auditoria')}
                    className={`px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${vistaActiva === 'auditoria' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <ShieldCheck size={18} /> Panel de Auditoría (Fotos)
                </button>
                <button
                    onClick={() => setVistaActiva('plantillas')}
                    className={`px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${vistaActiva === 'plantillas' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <CalendarDays size={18} /> Plantillas Fijas por Puesto
                </button>
            </div>

            {/* =====================================================================
                VISTA 1: DASHBOARD DE AUDITORÍA DIARIA (FOTOS)
            ====================================================================== */}
            {vistaActiva === 'auditoria' && (
                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">Revisión Diaria</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Selecciona un día para ver evidencias</p>
                        </div>
                        <div className="w-full sm:w-auto">
                            <input 
                                type="date" 
                                value={fechaSeleccionada} 
                                onChange={(e) => setFechaSeleccionada(e.target.value)} 
                                className="w-full bg-slate-50 border border-slate-200 text-teal-800 font-black px-4 py-3 rounded-xl outline-none focus:border-teal-500 transition-colors shadow-sm cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Inyectamos el Componente de Galería (Capa 2) */}
                    <GaleriaLimpieza 
                        fechaSeleccionada={fechaSeleccionada}
                        evidencias={evidencias}
                        evaluaciones={evaluaciones}
                        areasBase={areasBase}
                        empleadosVisibles={empleadosVisibles}
                        evaluarEvidencia={evaluarEvidencia}
                    />
                </div>
            )}

            {/* =====================================================================
                VISTA 2: CONFIGURACIÓN DE PLANTILLAS PERPETUAS
            ====================================================================== */}
            {vistaActiva === 'plantillas' && (
                <div className="space-y-6 animate-in fade-in">
                    
                    {/* GESTIÓN DE TAREAS BÁSICAS */}
                    <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Catálogo de Tareas</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Crea las zonas que se deben limpiar en el local</p>
                            </div>
                            <form onSubmit={handleAgregarArea} className="flex gap-2 w-full md:w-auto">
                                <input 
                                    type="text" 
                                    value={nuevaAreaStr} 
                                    onChange={(e) => setNuevaAreaStr(e.target.value)} 
                                    placeholder="Ej. Planchas, Baños, Pisos..." 
                                    className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-teal-500 font-bold text-slate-700 shadow-sm text-sm" 
                                />
                                <button type="submit" disabled={!nuevaAreaStr.trim()} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-xl font-black transition disabled:opacity-50 shadow-sm active:scale-95">
                                    <Plus size={20}/>
                                </button>
                            </form>
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                            {areasBase.length === 0 && <p className="text-sm font-bold text-slate-400 italic">No hay tareas creadas.</p>}
                            {areasBase.map(area => (
                                <div key={area.id} className="flex items-center gap-3 bg-teal-50 border border-teal-200 text-teal-800 px-4 py-2.5 rounded-xl shadow-sm">
                                    <span className="font-black text-sm">{area.nombre}</span>
                                    <button onClick={() => eliminarArea(area.id)} className="text-teal-400 hover:text-red-500 transition-colors bg-white rounded-md p-1 shadow-sm"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MATRIZ DE ASIGNACIÓN (PLANTILLA PERPETUA) */}
                    {areasBase.length > 0 && (
                        <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
                            <h3 className="text-xl font-black text-slate-800 mb-2">Matriz de Puestos</h3>
                            <p className="text-xs font-bold text-slate-500 mb-6 bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-2">
                                <Info size={16} className="text-blue-500 shrink-0"/>
                                Configura la semana ideal por puesto. El sistema la repetirá infinitamente, cruzándola con la asistencia real del empleado en el Motor de Nómina.
                            </p>

                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Lista de Puestos (Tabs verticales) */}
                                <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1"><Users size={12} className="inline mr-1"/> Puestos Operativos</p>
                                    {rolesDisponibles.map(rol => (
                                        <button 
                                            key={rol} 
                                            onClick={() => setRolSeleccionado(rol)}
                                            className={`w-full text-left px-4 py-3 rounded-xl font-black text-sm transition-all border ${rolSeleccionado === rol ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-100'}`}
                                        >
                                            {rol.replace('_', ' ').toUpperCase()}
                                        </button>
                                    ))}
                                </div>

                                {/* Cuadrícula Semanal Dinámica */}
                                <div className="flex-1 overflow-x-auto custom-scrollbar">
                                    <div className="min-w-[700px] grid grid-cols-7 gap-2">
                                        {diasSemanaMap.map(dia => (
                                            <div key={dia} className="flex flex-col">
                                                <div className="bg-slate-100 text-center py-2 rounded-t-xl border-b-2 border-slate-200">
                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{dia}</span>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-200 rounded-b-xl p-2 flex flex-col gap-2 min-h-[200px]">
                                                    {areasBase.map(area => {
                                                        const asignadasRol = plantillaRoles[rolSeleccionado]?.[dia] || [];
                                                        const isChecked = asignadasRol.includes(area.id);

                                                        return (
                                                            <button 
                                                                key={area.id}
                                                                onClick={() => toggleTareaRol(rolSeleccionado, dia, area.id)}
                                                                className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${isChecked ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-teal-300'}`}
                                                            >
                                                                {isChecked ? <CheckSquare size={14} className="shrink-0"/> : <Square size={14} className="shrink-0"/>}
                                                                <span className="text-[10px] font-bold leading-tight line-clamp-2">{area.nombre}</span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ZonasLimpieza;