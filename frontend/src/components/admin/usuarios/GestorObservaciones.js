import React, { useState, useEffect } from 'react';
import { ClipboardCheck, CalendarDays, Save, Plus, Trash2, CheckSquare, Square, Users, Info, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';

// Importamos la lógica aislada (Capa 1)
import { useAuditoriaObservaciones } from './hooks/useAuditoriaObservaciones';

const diasSemanaMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const diasCuadricula = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const GestorObservaciones = ({ usuariosDB, apiUrl, showAlert }) => {
    // 1. Extraemos roles válidos del directorio (Ignorando admin global y TV)
    const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global');
    const rolesDisponibles = [...new Set(empleadosVisibles.map(u => u.rol))].filter(r => r !== 'tv' && r !== 'admin');

    // 2. Conectamos el Motor Lógico (Custom Hook)
    const {
        observacionesBase,
        plantillaRoles,
        evaluaciones,
        isSubmitting,
        hayCambios,
        cargarDatos,
        guardarCambiosNube,
        agregarObservacion,
        eliminarObservacion,
        toggleObservacionRol,
        toggleTodasObservacionesRol, // IMPORTAMOS NUESTRA NUEVA FUNCIÓN
        evaluarObservacion
    } = useAuditoriaObservaciones(apiUrl, showAlert);

    // 3. Estados de Interfaz
    const [vistaActiva, setVistaActiva] = useState('auditoria');
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
    const [rolSeleccionado, setRolSeleccionado] = useState(rolesDisponibles[0] || '');
    const [nuevaObsStr, setNuevaObsStr] = useState('');

    // Cargar datos al montar el componente
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // Handlers UI
    const handleAgregarObservacion = (e) => {
        e.preventDefault();
        agregarObservacion(nuevaObsStr);
        setNuevaObsStr('');
    };

    // Calcular qué día de la semana es la fecha seleccionada para armar el Checklist
    const getDiaSemanaDeFecha = (fechaStr) => {
        const d = new Date(fechaStr + 'T12:00:00');
        return diasSemanaMap[d.getDay()];
    };

    const diaSemanaSeleccionado = getDiaSemanaDeFecha(fechaSeleccionada);

    // Lógica para saber si TODAS las reglas están asignadas en TODOS los días para el rol seleccionado
    const todasSeleccionadas = diasCuadricula.every(dia => {
        const asignadas = plantillaRoles[rolSeleccionado]?.[dia] || [];
        return observacionesBase.length > 0 && asignadas.length === observacionesBase.length;
    });

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-12">
            
            {/* HEADER Y BOTÓN DE GUARDADO PRINCIPAL */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <ClipboardCheck className="text-indigo-500" size={32} />
                    Auditoría de Conducta
                </h2>
                <p className="text-sm font-bold text-slate-400 mt-1">
                    Evalúa el cumplimiento de reglas, uniforme o tareas administrativas.
                </p>
            </div>

            {/* PESTAÑAS DE NAVEGACIÓN */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => setVistaActiva('auditoria')}
                    className={`px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${vistaActiva === 'auditoria' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <ShieldAlert size={18} /> Checklist Diario
                </button>
                <button
                    onClick={() => setVistaActiva('plantillas')}
                    className={`px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${vistaActiva === 'plantillas' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <CalendarDays size={18} /> Plantillas Fijas por Puesto
                </button>
            </div>

            {/* =====================================================================
                VISTA 1: DASHBOARD DE AUDITORÍA (CHECKLIST SÍ/NO)
            ====================================================================== */}
            {vistaActiva === 'auditoria' && (
                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">Checklist Operativo</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Selecciona el día a evaluar</p>
                        </div>
                        <div className="w-full sm:w-auto">
                            <input
                                type="date"
                                value={fechaSeleccionada}
                                onChange={(e) => setFechaSeleccionada(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-indigo-800 font-black px-4 py-3 rounded-xl outline-none focus:border-indigo-500 transition-colors shadow-sm cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="font-black text-slate-700 flex items-center gap-2 mb-4">
                            <Users size={18} className="text-indigo-400"/> Empleados y sus Reglas para el {diaSemanaSeleccionado}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {empleadosVisibles.map(emp => {
                                const reglasDelPuestoHoy = plantillaRoles[emp.rol]?.[diaSemanaSeleccionado] || [];
                                if (reglasDelPuestoHoy.length === 0) return null;

                                // 👇 NUEVO FILTRO: Si el empleado descansa hoy o no está activo, NO lo mostramos para evaluar.
                                const horarioEmp = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
                                const configDiaEmp = horarioEmp[diaSemanaSeleccionado] || {};
                                if (configDiaEmp.activo === false || configDiaEmp.es_descanso === true) return null;

                                return (
                                    <div key={emp.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                                        <div className="flex justify-between items-start mb-4 border-b border-slate-200 pb-3">
                                            <div>
                                                <p className="font-black text-slate-800 text-lg leading-none uppercase">{emp.nombre}</p>
                                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">{emp.rol}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 flex-1">
                                            {reglasDelPuestoHoy.map(regla => {
                                                const status = evaluaciones[regla]?.[fechaSeleccionada]?.[emp.id] || null;

                                                return (
                                                    <div key={regla} className={`p-3 rounded-xl border transition-all ${status === 'cumplio' ? 'bg-emerald-50 border-emerald-200' : status === 'no_cumplio' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                                                        <p className="text-xs font-black text-slate-700 leading-tight mb-2">{regla}</p>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => evaluarObservacion(fechaSeleccionada, String(emp.id), regla, 'cumplio')}
                                                                className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1 ${
                                                                    status === 'cumplio' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700'
                                                                }`}
                                                            >
                                                                <CheckCircle2 size={14}/> SÍ
                                                            </button>
                                                            <button
                                                                onClick={() => evaluarObservacion(fechaSeleccionada, String(emp.id), regla, 'no_cumplio')}
                                                                className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1 ${
                                                                    status === 'no_cumplio' ? 'bg-red-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-700'
                                                                }`}
                                                            >
                                                                <XCircle size={14}/> NO
                                                            </button>
                                                        </div>
                                                        {status && (
                                                            <button onClick={() => evaluarObservacion(fechaSeleccionada, String(emp.id), regla, null)} className="w-full mt-2 text-[9px] font-bold text-slate-400 hover:text-slate-600 transition underline text-center">
                                                                Deshacer
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {empleadosVisibles.every(emp => (plantillaRoles[emp.rol]?.[diaSemanaSeleccionado] || []).length === 0) && (
                                <div className="col-span-full p-12 text-center text-slate-400 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                                    <ClipboardCheck size={48} className="mx-auto mb-4 opacity-30 text-indigo-500" />
                                    <p className="font-black text-xl text-slate-600 mb-2">Día Libre de Auditoría</p>
                                    <p className="font-bold text-sm">Ningún puesto tiene reglas de conducta configuradas para los días {diaSemanaSeleccionado}.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================================
                VISTA 2: CONFIGURACIÓN DE PLANTILLAS PERPETUAS
            ====================================================================== */}
            {vistaActiva === 'plantillas' && (
                <div className="space-y-6 animate-in fade-in">
                    
                    {/* GESTIÓN DE REGLAS BÁSICAS */}
                    <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Catálogo de Reglas</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Crea las reglas o políticas del negocio</p>
                            </div>
                            <form onSubmit={handleAgregarObservacion} className="flex gap-2 w-full md:w-auto">
                                <input
                                    type="text"
                                    value={nuevaObsStr}
                                    onChange={(e) => setNuevaObsStr(e.target.value)}
                                    placeholder="Ej. Uso de Uniforme Completo..."
                                    className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-bold text-slate-700 shadow-sm text-sm"
                                />
                                <button type="submit" disabled={!nuevaObsStr.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-black transition disabled:opacity-50 shadow-sm active:scale-95">
                                    <Plus size={20}/>
                                </button>
                            </form>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {observacionesBase.length === 0 && <p className="text-sm font-bold text-slate-400 italic">No hay reglas creadas.</p>}
                            {observacionesBase.map(obs => (
                                <div key={obs} className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-2.5 rounded-xl shadow-sm">
                                    <span className="font-black text-sm">{obs}</span>
                                    <button onClick={() => eliminarObservacion(obs)} className="text-indigo-400 hover:text-red-500 transition-colors bg-white rounded-md p-1 shadow-sm"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MATRIZ DE ASIGNACIÓN (PLANTILLA PERPETUA) */}
                    {observacionesBase.length > 0 && (
                        <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
                            
                            {/* NUEVA CABECERA CON BOTÓN DE GUARDADO */}
                            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 mb-2">Matriz de Puestos y Días</h3>
                                    <p className="text-xs font-bold text-slate-500 bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-2">
                                        <Info size={16} className="text-blue-500 shrink-0"/>
                                        Configura qué reglas aplican a cada puesto y en qué días. El motor de nómina penalizará automáticamente los fallos.
                                    </p>
                                </div>
                                <div className="flex w-full xl:w-auto items-center gap-4">
                                    <button
                                        disabled={!hayCambios || isSubmitting}
                                        onClick={guardarCambiosNube}
                                        className={`w-full xl:w-auto px-8 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${
                                            hayCambios
                                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/30 animate-pulse'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        }`}
                                    >
                                        <Save size={20}/> {hayCambios ? 'Guardar Cambios' : 'Todo Guardado'}
                                    </button>
                                </div>
                            </div>

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
                                <div className="flex-1 overflow-x-auto custom-scrollbar bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    
                                    {/* BANNER DINÁMICO UX CON BOTÓN DE MARCAR TODO */}
                                    <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50/50 text-indigo-700 p-3 rounded-xl border border-indigo-100 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <Info size={18} className="shrink-0"/>
                                            <p className="text-sm font-bold">
                                                Configurando reglas para: <strong className="uppercase font-black ml-1 text-indigo-900">{rolSeleccionado.replace('_', ' ')}</strong>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => toggleTodasObservacionesRol(rolSeleccionado, diasCuadricula, observacionesBase)}
                                            className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
                                                todasSeleccionadas
                                                ? 'bg-white text-red-500 border border-red-200 hover:bg-red-50'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                                            }`}
                                        >
                                            {todasSeleccionadas ? <><Square size={14}/> Desmarcar Toda la Semana</> : <><CheckSquare size={14}/> Marcar Toda la Semana</>}
                                        </button>
                                    </div>

                                    <div className="min-w-[700px] grid grid-cols-7 gap-2">
                                        {diasCuadricula.map(dia => (
                                            <div key={dia} className="flex flex-col">
                                                <div className="bg-slate-200 text-center py-2 rounded-t-xl border-b-2 border-slate-300">
                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{dia}</span>
                                                </div>
                                                <div className="bg-white border border-slate-200 rounded-b-xl p-2 flex flex-col gap-2 min-h-[200px] shadow-sm">
                                                    {observacionesBase.map(obs => {
                                                        const asignadasRol = plantillaRoles[rolSeleccionado]?.[dia] || [];
                                                        const isChecked = asignadasRol.includes(obs);

                                                        return (
                                                            <button
                                                                key={obs}
                                                                onClick={() => toggleObservacionRol(rolSeleccionado, dia, obs)}
                                                                className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${isChecked ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'}`}
                                                            >
                                                                {isChecked ? <CheckSquare size={14} className="shrink-0"/> : <Square size={14} className="shrink-0"/>}
                                                                <span className="text-[10px] font-bold leading-tight line-clamp-2">{obs}</span>
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

export default GestorObservaciones;