import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Filter, RefreshCw, Clock, ArrowUpRight, User, Layers, Search, ChevronDown, Check } from 'lucide-react';
import io from 'socket.io-client';

const ROLES_DISPONIBLES = [
    { id: 'admin', label: 'Administrador' },
    { id: 'gerente', label: 'Gerente' },
    { id: 'cajero', label: 'Cajero' },
    { id: 'cocinero', label: 'Cocinero' },
    { id: 'ayudante_cocina', label: 'Ayudante de Cocina' },
    { id: 'repartidor', label: 'Repartidor' }
];

const ReporteAsistencias = ({ apiUrl }) => {
    const [asistenciasHistorial, setAsistenciasHistorial] = useState([]);
    const [usuariosLista, setUsuariosLista] = useState([]);
    const [cargandoReporte, setCargandoReporte] = useState(false);

    // FILTROS DE REPORTE
    const [periodoFiltro, setPeriodoFiltro] = useState('dia'); // 'dia' | 'semana' | 'mes' | 'anio' | 'rango'
    
    // 👇 FIX: Forzamos la zona horaria local de México para evitar saltos UTC de +1 día en la tarde/noche.
    const getLocalMexicoDate = () => {
        const date = new Date();
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - userTimezoneOffset).toISOString().split('T')[0];
    };
    
    const [fechaInicio, setFechaInicio] = useState(getLocalMexicoDate());
    const [fechaFin, setFechaFin] = useState(getLocalMexicoDate());
    const [busquedaNombre, setBusquedaNombre] = useState('');

    // FILTROS MULTI-SELECCIÓN
    const [empleadosFiltro, setEmpleadosFiltro] = useState([]); // Array de IDs
    const [rolesFiltro, setRolesFiltro] = useState([]); // Array de roles

    // ESTADO PARA ABRIR DROPDOWNS CUSTOM
    const [dropdownAbierto, setDropdownAbierto] = useState(null); // 'empleados' | 'roles' | null

    const cargarReporte = useCallback(async () => {
        setCargandoReporte(true);
        try {
            // Solicitamos SIEMPRE 'Todos' al backend y filtramos dinámicamente en el front
            const [resReporte, resUsuarios] = await Promise.all([
                fetch(`${apiUrl}/usuarios/rendimiento?periodo=${periodoFiltro}&fecha=${fechaInicio}&usuario_id=Todos`),
                fetch(`${apiUrl}/usuarios`)
            ]);
            
            if (resReporte.ok) {
                const data = await resReporte.json();
                setAsistenciasHistorial(Array.isArray(data.historialAsistencias) ? data.historialAsistencias : []);
            }
            if (resUsuarios.ok) {
                const usu = await resUsuarios.json();
                setUsuariosLista(Array.isArray(usu) ? usu : []);
            }
        } catch (error) { console.error("Error al consultar reporte:", error); } 
        finally { setCargandoReporte(false); }
    }, [apiUrl, periodoFiltro, fechaInicio]);

    useEffect(() => {
        cargarReporte();
        const baseUrl = apiUrl.replace('/api', '');
        const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
        socket.on('usuario_actualizado', cargarReporte);
        return () => socket.disconnect();
    }, [cargarReporte, apiUrl]);

    // MANEJADORES MULTI-SELECCIÓN
    const toggleEmpleado = (idStr) => {
        setEmpleadosFiltro(prev => prev.includes(idStr) ? prev.filter(e => e !== idStr) : [...prev, idStr]);
    };
    
    const toggleRol = (rolId) => {
        setRolesFiltro(prev => prev.includes(rolId) ? prev.filter(r => r !== rolId) : [...prev, rolId]);
    };

    // FILTRADO DINÁMICO CLIENT-SIDE (Roles, Empleados y Búsqueda)
    const asistenciasFiltradas = useMemo(() => {
        return asistenciasHistorial.filter(a => {
            // Filtro por Rol (Múltiple)
            if (rolesFiltro.length > 0 && !rolesFiltro.includes(String(a.rol).toLowerCase())) {
                return false;
            }
            // Filtro por Empleado (Múltiple)
            if (empleadosFiltro.length > 0 && !empleadosFiltro.includes(String(a.usuario_id))) {
                return false;
            }
            // Filtro por Búsqueda de Nombre
            if (busquedaNombre.trim() !== '') {
                const term = busquedaNombre.toLowerCase();
                const nom = String(a.nombre || '').toLowerCase();
                if (!nom.includes(term)) return false;
            }
            // Filtro por Rango de Fechas
            if (periodoFiltro === 'rango' && fechaInicio && fechaFin) {
                const fechaReg = new Date(a.fecha).toISOString().split('T')[0];
                if (fechaReg < fechaInicio || fechaReg > fechaFin) return false;
            }
            return true;
        });
    }, [asistenciasHistorial, rolesFiltro, empleadosFiltro, busquedaNombre, periodoFiltro, fechaInicio, fechaFin]);

    // CÁLCULO DE KPIS
    const metricas = useMemo(() => {
        let totalHoras = 0; let turnosActivos = 0;
        asistenciasFiltradas.forEach(a => {
            // 1. Primero evaluamos si el turno está activo y lo sumamos
            if (a.hora_entrada && !a.hora_salida) {
                turnosActivos++;
            }
            
            // 2. Luego sumamos las horas, ya sea que vengan del backend o las calculemos en vivo
            if (a.horas_trabajadas) {
                totalHoras += Number(a.horas_trabajadas) || 0;
            } else if (a.hora_entrada && !a.hora_salida) {
                const transcurrido = (Date.now() - new Date(a.hora_entrada).getTime()) / 3600000;
                totalHoras += Math.max(0, transcurrido);
            }
        });
        const totalRegistros = asistenciasFiltradas.length;
        return {
            totalRegistros, totalHoras: totalHoras.toFixed(1), turnosActivos,
            promedioHoras: totalRegistros > 0 ? (totalHoras / totalRegistros).toFixed(1) : '0.0'
        };
    }, [asistenciasFiltradas]);

    const formatF = (str) => str ? new Date(str).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '---';
    const formatH = (str) => str ? new Date(str).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'En turno...';

    return (
        <div className="space-y-6 animate-in fade-in relative">
            
            {/* CAPA DE FONDO INVISIBLE PARA CERRAR DROPDOWNS AL HACER CLIC FUERA */}
            {dropdownAbierto && (
                <div className="fixed inset-0 z-10" onClick={() => setDropdownAbierto(null)}></div>
            )}

            {/* FILTROS */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6 relative z-40">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl"><Filter size={20} /></div>
                        <div><h3 className="font-black text-lg text-slate-800">Filtros del Reporte</h3></div>
                    </div>
                    <button onClick={cargarReporte} className="bg-slate-900 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 transition active:scale-95">
                        <RefreshCw size={14} className={cargandoReporte ? 'animate-spin' : ''} /> Actualizar
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. PERIODO */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Período</label>
                        <select value={periodoFiltro} onChange={e => setPeriodoFiltro(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-blue-500">
                            <option value="dia">Día de Hoy</option><option value="semana">Esta Semana</option><option value="mes">Este Mes</option><option value="anio">Este Año</option><option value="rango">Rango Personalizado</option>
                        </select>
                    </div>
                    
                    {/* 2. FECHAS */}
                    {periodoFiltro === 'rango' ? (
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Desde</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" /></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Hasta</label><input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" /></div>
                        </div>
                    ) : (
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Fecha Base</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" /></div>
                    )}
                    
                    {/* 3. FILTRO EMPLEADOS (MULTI-SELECCIÓN) */}
                    <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Seleccionar Empleados</label>
                        <button 
                            onClick={() => setDropdownAbierto(dropdownAbierto === 'empleados' ? null : 'empleados')}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 text-left flex justify-between items-center focus:border-blue-500 relative z-20"
                        >
                            <span className="truncate">
                                {empleadosFiltro.length === 0 ? 'Todos los Empleados' : `${empleadosFiltro.length} Empleados Seleccionados`}
                            </span>
                            <ChevronDown size={16} className="text-slate-400 shrink-0"/>
                        </button>

                        {dropdownAbierto === 'empleados' && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-2xl z-30 max-h-64 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2">
                                <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${empleadosFiltro.length === 0 ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                                        {empleadosFiltro.length === 0 && <Check size={14} />}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">Todos los Empleados</span>
                                    <input type="checkbox" className="hidden" checked={empleadosFiltro.length === 0} onChange={() => setEmpleadosFiltro([])} />
                                </label>
                                {usuariosLista.map(u => (
                                    <label key={u.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${empleadosFiltro.includes(String(u.id)) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                                            {empleadosFiltro.includes(String(u.id)) && <Check size={14} />}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 leading-tight">{u.nombre} <span className="block text-[10px] text-slate-400 font-bold uppercase">{u.rol}</span></span>
                                        <input type="checkbox" className="hidden" checked={empleadosFiltro.includes(String(u.id))} onChange={() => toggleEmpleado(String(u.id))} />
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 4. FILTRO ROLES (MULTI-SELECCIÓN) */}
                    <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Filtrar por Roles</label>
                        <button 
                            onClick={() => setDropdownAbierto(dropdownAbierto === 'roles' ? null : 'roles')}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 text-left flex justify-between items-center focus:border-blue-500 relative z-20"
                        >
                            <span className="truncate">
                                {rolesFiltro.length === 0 ? 'Todos los Roles' : `${rolesFiltro.length} Roles Seleccionados`}
                            </span>
                            <ChevronDown size={16} className="text-slate-400 shrink-0"/>
                        </button>

                        {dropdownAbierto === 'roles' && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-2xl z-30 max-h-64 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2">
                                <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${rolesFiltro.length === 0 ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                                        {rolesFiltro.length === 0 && <Check size={14} />}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">Todos los Roles</span>
                                    <input type="checkbox" className="hidden" checked={rolesFiltro.length === 0} onChange={() => setRolesFiltro([])} />
                                </label>
                                {ROLES_DISPONIBLES.map(r => (
                                    <label key={r.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${rolesFiltro.includes(r.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                                            {rolesFiltro.includes(r.id) && <Check size={14} />}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">{r.label}</span>
                                        <input type="checkbox" className="hidden" checked={rolesFiltro.includes(r.id)} onChange={() => toggleRol(r.id)} />
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative z-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={busquedaNombre} onChange={e => setBusquedaNombre(e.target.value)} placeholder="Buscar por nombre..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold outline-none focus:border-blue-500 transition-colors" />
                </div>
            </div>

            {/* KPIS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-0">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4"><div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Clock size={28} /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checadas</p><p className="text-2xl font-black text-slate-800">{metricas.totalRegistros}</p></div></div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4"><div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><ArrowUpRight size={28} /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas Acumuladas</p><p className="text-2xl font-black text-emerald-600">{metricas.totalHoras} hrs</p></div></div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4"><div className="p-3 bg-amber-100 text-amber-600 rounded-2xl"><User size={28} /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Turnos Activos</p><p className="text-2xl font-black text-amber-600">{metricas.turnosActivos}</p></div></div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4"><div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Layers size={28} /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promedio / Turno</p><p className="text-2xl font-black text-purple-600">{metricas.promedioHoras} hrs</p></div></div>
            </div>

            {/* TABLA HISTORIAL */}
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm relative z-0">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="p-4 pl-6">Empleado</th><th className="p-4">Fecha</th><th className="p-4">Hora Entrada</th><th className="p-4">Hora Salida</th><th className="p-4 text-right pr-6">Horas Trab.</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {cargandoReporte ? <tr><td colSpan="5" className="text-center py-12"><Clock className="animate-spin mx-auto mb-3 text-blue-500" size={32}/><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consultando registros...</p></td></tr> : asistenciasFiltradas.map((a, i) => (
                                <tr key={i} className="hover:bg-slate-50/60 transition">
                                    <td className="p-4 pl-6 font-black text-sm text-slate-800">{a.nombre} <span className="block text-[10px] font-bold text-slate-400 uppercase mt-0.5">{a.rol}</span></td>
                                    <td className="p-4 font-bold text-xs text-slate-500">{formatF(a.fecha)}</td>
                                    <td className="p-4 font-black text-xs text-emerald-600">{formatH(a.hora_entrada)}</td>
                                    <td className="p-4 font-black text-xs text-rose-600">{!a.hora_salida ? <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-md animate-pulse">● En Turno</span> : formatH(a.hora_salida)}</td>
                                    <td className="p-4 text-right pr-6 font-black text-sm text-slate-800">{a.horas_trabajadas ? `${a.horas_trabajadas} hrs` : (!a.hora_salida ? 'Calculando...' : '0 hrs')}</td>
                                </tr>
                            ))}
                            {!cargandoReporte && asistenciasFiltradas.length === 0 && (
                                <tr><td colSpan="5" className="text-center py-16 text-slate-400 font-bold text-xs">No se encontraron registros con los filtros seleccionados.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReporteAsistencias;