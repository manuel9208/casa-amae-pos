import React, { useState, useEffect } from 'react';
import { Calculator, Calendar, CheckSquare, Square, AlertTriangle, Filter, Save, CheckCircle2, Lock, PlusCircle, MinusCircle, Trash2, ShieldAlert, Clock, Camera, ShieldCheck, User, XCircle, DollarSign } from 'lucide-react';
import { useGenerarNomina } from './hooks/useGenerarNomina';

const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);

const getImageUrl = (url) => {
    if (!url) return '';
    if (url.includes('cloudinary.com')) {
        const parts = url.split('res.cloudinary.com/');
        return `https://res.cloudinary.com/${parts[1]}`;
    }
    return url;
};

const NominaGenerar = ({ usuariosDB, apiUrl, showAlert, showConfirm }) => {
    const empleadosVisibles = usuariosDB
        .filter(u => u.nombre !== 'Administrador Global')
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const rolesDisponibles = [...new Set(empleadosVisibles.map(u => u.rol))];
    const [filtroRol, setFiltroRol] = useState('');

    const {
        fechaInicio, setFechaInicio,
        fechaFin, setFechaFin,
        empleadosSeleccionados, setEmpleadosSeleccionados,
        preNomina, setPreNomina,
        isCalculating,
        calcularNominaExacta,
        agregarDinamico,
        removerDinamico,
        justificarAnomalia,
        cambiarHorasDia,
        eliminarBonoSistema, // IMPORTAMOS LA FUNCIÓN
        evaluarLimpiezaEnVivo,
        evaluarObservacionEnVivo
    } = useGenerarNomina(apiUrl, empleadosVisibles, showAlert);

    const [diasYaPagados, setDiasYaPagados] = useState([]);
    const [rangoVisual, setRangoVisual] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formDinamico, setFormDinamico] = useState({});

    useEffect(() => {
        const fetchPagados = async () => {
            try {
                const year = new Date().getFullYear();
                const res = await fetch(`${apiUrl}/usuarios/rendimiento?periodo=anio&fecha=${year}-01-01`);
                if (res.ok) {
                    const data = await res.json();
                    let pagados = new Set();
                    (data.cortesNomina || []).forEach(nomina => {
                        const d = typeof nomina.datos_corte === 'string' ? JSON.parse(nomina.datos_corte) : nomina.datos_corte;
                        if (d.metadata && d.metadata.es_nomina) {
                            d.recibos?.forEach(r => (r.diasAuditados || []).forEach(dia => pagados.add(dia)));
                        }
                    });
                    setDiasYaPagados(Array.from(pagados));
                }
            } catch (e) { console.error("Error", e); }
        };
        fetchPagados();
    }, [apiUrl]);

    useEffect(() => {
        if (fechaInicio && fechaFin && fechaInicio <= fechaFin) {
            const fechas = [];
            let actual = new Date(fechaInicio + 'T12:00:00');
            const fin = new Date(fechaFin + 'T12:00:00');
            while (actual <= fin) {
                fechas.push(actual.toISOString().split('T')[0]);
                actual.setDate(actual.getDate() + 1);
            }
            setRangoVisual(fechas);
        } else {
            setRangoVisual([]);
        }
    }, [fechaInicio, fechaFin]);

    const empleadosFiltrados = filtroRol ? empleadosVisibles.filter(u => u.rol === filtroRol) : empleadosVisibles;
    const todosSeleccionados = empleadosFiltrados.length > 0 && empleadosFiltrados.every(e => empleadosSeleccionados.includes(e.id));

    const toggleSeleccionMasiva = () => {
        if (todosSeleccionados) {
            setEmpleadosSeleccionados(prev => prev.filter(id => !empleadosFiltrados.find(e => e.id === id)));
        } else {
            const nuevos = empleadosFiltrados.map(e => e.id).filter(id => !empleadosSeleccionados.includes(id));
            setEmpleadosSeleccionados(prev => [...prev, ...nuevos]);
        }
    };

    const manejarCambioDinamico = (empId, campo, valor) => {
        setFormDinamico(prev => ({ ...prev, [empId]: { ...prev[empId], [campo]: valor } }));
    };

    const aplicarConceptoDinamico = (empId, tipo) => {
        const form = formDinamico[empId] || {};
        const concepto = tipo === 'ingreso' ? form.conceptoIngreso : form.conceptoEgreso;
        const monto = tipo === 'ingreso' ? form.montoIngreso : form.montoEgreso;
        if (!concepto || !monto || monto <= 0) return showAlert("Aviso", "Ingresa un concepto y un monto válido.", "warning");
        
        agregarDinamico(empId, tipo, concepto, monto);
        
        manejarCambioDinamico(empId, tipo === 'ingreso' ? 'conceptoIngreso' : 'conceptoEgreso', '');
        manejarCambioDinamico(empId, tipo === 'ingreso' ? 'montoIngreso' : 'montoEgreso', '');
    };

    const guardarNomina = () => {
        showConfirm("Emitir y Guardar Nómina", "¿Estás seguro de emitir esta nómina? Se registrará financieramente y se bloquearán los días.", async () => {
            setIsSubmitting(true);
            try {
                const userObj = JSON.parse(localStorage.getItem('pos_sesion') || '{}').data || {};
                const payload = {
                    usuario_admin_id: userObj.id,
                    datos_corte: { metadata: { fecha_inicio: fechaInicio, fecha_fin: fechaFin, es_nomina: true }, recibos: preNomina }
                };
                const res = await fetch(`${apiUrl}/nominas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (res.ok) {
                    showAlert('¡Nómina Exitosa!', 'La nómina ha sido generada.', 'success');
                    setPreNomina([]); setFechaInicio(''); setFechaFin('');
                } else {
                    showAlert('Error', 'No se pudo guardar la nómina.', 'error');
                }
            } catch (e) { showAlert('Error Crítico', 'Fallo de conexión.', 'error'); }
            setIsSubmitting(false);
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-12">
            {/* PANEL CONFIGURACIÓN */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-1"><Calendar className="text-blue-500" /> Rango de Fechas</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selecciona el periodo a pagar</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black text-slate-500 uppercase">Desde</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-700 outline-none focus:border-blue-500" /></div>
                            <div><label className="text-[10px] font-black text-slate-500 uppercase">Hasta</label><input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-700 outline-none focus:border-blue-500" /></div>
                        </div>
                        {rangoVisual.length > 0 && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><ShieldAlert size={14}/> Auditoría de Fechas</p>
                                <div className="flex flex-wrap gap-2">
                                    {rangoVisual.map(dia => {
                                        const yaPagado = diasYaPagados.includes(dia);
                                        return (
                                            <div key={dia} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black transition-all ${yaPagado ? 'bg-slate-200 border-slate-300 text-slate-500 opacity-60 cursor-not-allowed' : 'bg-emerald-100 border-emerald-200 text-emerald-700 shadow-sm'}`} title={yaPagado ? 'Ya pagado' : 'Libre para calcular'}>
                                                {yaPagado ? <Lock size={12} /> : <CheckCircle2 size={12} />} {dia.split('-')[2]}/{dia.split('-')[1]}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-black text-blue-900">Empleados a Pagar</h3>
                                <p className="text-[10px] font-bold text-blue-600/70 uppercase tracking-widest mt-1">Selecciona a quién calcularle</p>
                            </div>
                            <button onClick={toggleSeleccionMasiva} className="text-xs font-bold text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                                {todosSeleccionados ? 'Desmarcar Todos' : 'Marcar Todos'}
                            </button>
                        </div>
                        <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2 items-center">
                            <Filter size={14} className="text-blue-400 shrink-0 mr-1 mt-1"/>
                            <button onClick={() => setFiltroRol('')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border ${!filtroRol ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Todos</button>
                            {rolesDisponibles.map(rol => (
                                <button key={rol} onClick={() => setFiltroRol(rol)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border ${filtroRol === rol ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>{rol}</button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                            {empleadosFiltrados.map(emp => {
                                const seleccionado = empleadosSeleccionados.includes(emp.id);
                                return (
                                    <button key={emp.id} onClick={() => setEmpleadosSeleccionados(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id])} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border ${seleccionado ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-blue-50'}`}>
                                        {seleccionado ? <CheckSquare size={14}/> : <Square size={14}/>} {emp.nombre.split(' ')[0]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <button disabled={isCalculating || preNomina.length > 0} onClick={calcularNominaExacta} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl disabled:opacity-50 active:scale-95 transition flex items-center justify-center gap-2 text-lg">
                        {isCalculating ? 'Procesando Leyes y Matemáticas...' : <><Calculator size={24} /> Calcular Nómina Exacta</>}
                    </button>
                    {preNomina.length > 0 && <div className="text-center mt-4"><button onClick={() => setPreNomina([])} className="text-sm font-bold text-red-500 underline">Cancelar y recalcular</button></div>}
                </div>
            </div>

            {/* ZONA DE RESULTADOS */}
            {preNomina.length > 0 && (
                <div className="space-y-8 animate-in slide-in-from-bottom-6">
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight text-center my-8">Revisión de Cálculos</h3>
                    <div className="grid grid-cols-1 gap-8">
                        {preNomina.map((p) => {
                            const form = formDinamico[p.empleado_id] || {};
                            return (
                                <div key={p.empleado_id} className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-lg relative overflow-hidden flex flex-col">
                                    {p.neto <= 0 && <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>}
                                    
                                    {/* Cabecera del Empleado */}
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl"><User size={24}/></div>
                                            <div>
                                                <h4 className="text-2xl font-black text-slate-800 leading-tight">{p.nombre}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p.rol}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-6 items-center">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hrs Programadas</p>
                                                <span className="text-lg font-black text-slate-700">{p.metricas.horasProgramadasTotales}h</span>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                    {p.esPorHora ? 'Sueldo Base (Hora)' : 'Sueldo Base (Día)'}
                                                </p>
                                                <span className="text-lg font-black text-slate-700">{formaterMoneda(p.sueldoDiario)}</span>
                                            </div>
                                            <div className="text-right bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</p>
                                                <span className={`text-3xl font-black tracking-tighter ${p.neto > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formaterMoneda(p.neto)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* REGLA #1: ALERTA DE EVALUACIONES PENDIENTES */}
                                    {p.faltanEvaluaciones && (
                                      <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-center gap-3 animate-pulse">
                                        <AlertTriangle className="text-amber-500 shrink-0" size={24}/>
                                        <div>
                                          <p className="text-sm font-black text-amber-800 uppercase tracking-widest">⚠️ Tareas sin calificar en el sistema</p>
                                          <p className="text-xs font-bold text-amber-600 mt-0.5">El empleado tiene tareas de limpieza u observaciones en días pasados que no evaluaste. Por defecto se considerarán como fallidas si no se justifican.</p>
                                        </div>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                        
                                        {/* COLUMNA IZQUIERDA: HISTORIAL, FALTAS Y RETARDOS */}
                                        <div>
                                            <h4 className="text-lg font-black text-slate-700 flex items-center gap-2 mb-4"><Clock className="text-blue-500" /> 1. Historial de Checadas y Horarios</h4>
                                            
                                            <div className="overflow-x-auto border border-slate-200 rounded-2xl custom-scrollbar">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="bg-slate-50 border-b border-slate-200">
                                                        <tr>
                                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase">Fecha</th>
                                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase text-center">Entrada</th>
                                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase text-center">Salida</th>
                                                            <th className="p-3 text-[10px] font-black text-blue-600 uppercase text-center bg-blue-50/50">Horas Reales</th>
                                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase text-center">$$ Día</th>
                                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase text-center">Auditoría</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {p.diasDetalle.map((dia, i) => (
                                                            <tr key={i} className={`hover:bg-slate-50 transition ${dia.esFalta && dia.justificacionActiva !== 'falta' ? 'bg-red-50' : dia.requiereAprobacionApoyo ? 'bg-amber-50' : ''}`}>
                                                                <td className="p-3">
                                                                    <span className="font-bold text-slate-700 text-xs block">
                                                                        {dia.diaSemana}
                                                                        {dia.esFestivo && <span className="ml-1 text-[8px] bg-amber-100 text-amber-700 px-1 rounded uppercase">🎉 {dia.motivoFestivo}</span>}
                                                                    </span>
                                                                    <span className="text-[9px] font-medium text-slate-400 block">{dia.fecha.split('-').slice(1).reverse().join('/')}</span>
                                                                    
                                                                    {dia.config.activo ? (
                                                                        <span className="text-[8px] uppercase font-bold text-blue-500">Turno: {dia.config.entrada} a {dia.config.salida}</span>
                                                                    ) : dia.config.es_descanso ? (
                                                                        <span className="text-[8px] uppercase font-black text-emerald-500 tracking-widest mt-1 block">🛋️ Descanso Pagado</span>
                                                                    ) : (
                                                                        <span className="text-[8px] uppercase font-bold text-slate-400 tracking-widest mt-1 block">🚫 Día Libre</span>
                                                                    )}
                                                                </td>
                                                                
                                                                <td className="p-3 font-black text-center text-xs">
                                                                    {dia.asistencia ? <span className="text-emerald-600">{new Date(dia.asistencia.hora_entrada).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit', timeZone: 'America/Mazatlan'})}</span> : <span className="text-slate-300">--:--</span>}
                                                                    {dia.minTarde > 0 && <span className="block text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded mt-1 w-fit mx-auto">+{dia.minTarde}m tarde</span>}
                                                                </td>
                                                                
                                                                <td className="p-3 font-black text-center text-xs">
                                                                    {dia.asistencia?.hora_salida ? <span className="text-blue-600">{new Date(dia.asistencia.hora_salida).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit', timeZone: 'America/Mazatlan'})}</span> : (dia.asistencia ? <span className="text-orange-500 text-[10px]">Sin Salida</span> : <span className="text-slate-300">--:--</span>)}
                                                                </td>
                                                                
                                                                <td className="p-2 text-center bg-blue-50/30">
                                                                    <div className="flex flex-col items-center justify-center gap-1">
                                                                        <div className="flex items-center justify-center gap-1">
                                                                            <input 
                                                                                type="number" 
                                                                                step="0.1" 
                                                                                min="0"
                                                                                max="24"
                                                                                value={dia.horasReales} 
                                                                                onChange={(e) => cambiarHorasDia(p.empleado_id, dia.fecha, e.target.value)}
                                                                                className="w-14 p-1.5 border border-blue-200 bg-white rounded-lg text-xs font-black text-blue-700 text-center outline-none focus:border-blue-500 focus:ring-2 ring-blue-100 transition shadow-sm"
                                                                                title="Edita las horas trabajadas libremente"
                                                                            />
                                                                            <span className="text-[10px] font-black text-blue-400">h</span>
                                                                        </div>
                                                                        {dia.config.activo && Number(dia.hrsProgramadasDia) > 0 && (
                                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200 mt-1">
                                                                                Debería: {dia.hrsProgramadasDia}h
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                <td className="p-3 font-black text-center text-xs text-emerald-600">
                                                                    {formaterMoneda(dia.pagoGeneradoDia)}
                                                                </td>
                                                                
                                                                <td className="p-3 text-center w-24">
                                                                    {dia.esFalta && dia.justificacionActiva !== 'falta' && (
                                                                        <button onClick={() => justificarAnomalia(p.empleado_id, dia.fecha, 'falta', 8)} className="bg-white text-slate-700 border border-slate-300 px-2 py-1.5 rounded text-[9px] font-black w-full shadow-sm hover:bg-slate-100 transition mb-1">Justificar Falta</button>
                                                                    )}

                                                                    {dia.config.activo && Number(dia.hrsProgramadasDia) > 0 && Number(dia.horasReales) !== Number(dia.hrsProgramadasDia) && (
                                                                        <button onClick={() => cambiarHorasDia(p.empleado_id, dia.fecha, dia.hrsProgramadasDia)} className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1.5 rounded text-[9px] font-black w-full mb-1 shadow-sm hover:bg-blue-100 transition">Pagar {dia.hrsProgramadasDia}h</button>
                                                                    )}

                                                                    {dia.minTarde > 0 && dia.justificacionActiva !== 'retardo' && (
                                                                        <button onClick={() => justificarAnomalia(p.empleado_id, dia.fecha, 'retardo', 0)} className="bg-white text-slate-700 border border-slate-300 px-2 py-1.5 rounded text-[9px] font-black w-full mt-1 shadow-sm hover:bg-slate-100 transition">Perdonar Retardo</button>
                                                                    )}
                                                                    
                                                                    {dia.requiereAprobacionApoyo && (
                                                                        <div className="flex flex-col gap-1">
                                                                            <button onClick={() => justificarAnomalia(p.empleado_id, dia.fecha, 'aprobar_apoyo', 0)} className="bg-amber-400 hover:bg-amber-500 text-white px-2 py-1.5 rounded text-[9px] font-black shadow-sm transition">Pagar Día Extra</button>
                                                                            <button onClick={() => justificarAnomalia(p.empleado_id, dia.fecha, 'ignorar_apoyo', 0)} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 px-2 py-1.5 rounded text-[9px] font-black shadow-sm transition">Ignorar</button>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {dia.justificacionActiva === 'falta' && <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded w-full block mt-1">✅ Falta Justif.</span>}
                                                                    {dia.justificacionActiva === 'retardo' && <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded w-full block mt-1">✅ Retardo Perdonado</span>}
                                                                    {dia.justificacionActiva === 'aprobar_apoyo' && <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-1 rounded block mt-1">💰 Pagado</span>}
                                                                    {dia.justificacionActiva === 'ignorar_apoyo' && <span className="text-[9px] font-black text-slate-500 bg-slate-200 px-2 py-1 rounded block mt-1">❌ Ignorado</span>}
                                                                    
                                                                    {!dia.esFalta && dia.minTarde === 0 && !dia.requiereAprobacionApoyo && !dia.justificacionActiva && Number(dia.horasReales) === Number(dia.hrsProgramadasDia) && (
                                                                        <span className="text-[10px] font-black text-slate-400">✔️ OK</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* EXPLICACIONES DE BONOS PERDIDOS */}
                                            {p.bonosPerdidos && p.bonosPerdidos.length > 0 && (
                                                <div className="mt-4 p-4 rounded-xl border bg-slate-50 border-slate-200 text-slate-600 text-xs font-bold shadow-sm">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-2">Descalificaciones del Sistema</p>
                                                    <ul className="space-y-2 list-disc pl-4 text-red-600">
                                                        {p.bonosPerdidos.map((bp, i) => <li key={`bp-${i}`}>{bp}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* COLUMNA DER: TAREAS, FOTOS Y FINANZAS */}
                                        <div className="flex flex-col h-full space-y-6">
                                            
                                            {p.auditoriaOperativa?.detallesAuditoria?.length > 0 && (
                                                <div>
                                                    <h4 className="text-lg font-black text-slate-700 flex items-center gap-2 mb-4"><ShieldCheck className="text-emerald-500" /> 2. Tareas de Limpieza y Reglas</h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        {p.auditoriaOperativa.detallesAuditoria.map((det, idx) => {
                                                            const isOk = det.estado.includes('✅');
                                                            const isFail = det.estado.includes('❌');
                                                            const isPending = det.estado.includes('⚠️');
                                                            
                                                            let fotoUrl = null;
                                                            if (p.evidenciasLimpieza) {
                                                                fotoUrl = p.evidenciasLimpieza[det.tarea]?.[det.fecha]?.[p.empleado_id];
                                                                if (!fotoUrl) {
                                                                    const matchKey = Object.keys(p.evidenciasLimpieza).find(k => det.tarea.includes(k) || k.includes(det.tarea));
                                                                    if (matchKey) fotoUrl = p.evidenciasLimpieza[matchKey]?.[det.fecha]?.[p.empleado_id];
                                                                }
                                                            }
                                                            
                                                            return (
                                                                <div key={idx} className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between ${isOk ? 'bg-emerald-50 border-emerald-200' : isFail ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-300'}`}>
                                                                    <div className="mb-2">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{det.fecha.split('-').slice(1).reverse().join('/')}</span>
                                                                            <span className={`text-[8px] font-black uppercase ${isOk ? 'text-emerald-600' : isFail ? 'text-red-600' : 'text-amber-600 bg-amber-200/50 px-1 rounded'}`}>{det.estado}</span>
                                                                        </div>
                                                                        <p className="font-bold text-[10px] text-slate-800 leading-tight truncate" title={det.tarea}>{det.tarea}</p>
                                                                    </div>
                                                                    
                                                                    {fotoUrl && (
                                                                        <a href={getImageUrl(fotoUrl)} target="_blank" rel="noreferrer" className="block w-full h-16 rounded bg-slate-200 overflow-hidden relative group border border-slate-300 mb-2">
                                                                            <img src={getImageUrl(fotoUrl)} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-110 transition-transform"/>
                                                                            <div className="absolute inset-0 bg-black/30 hidden group-hover:flex items-center justify-center backdrop-blur-sm"><Camera size={14} className="text-white"/></div>
                                                                        </a>
                                                                    )}

                                                                    {isPending && (
                                                                        <div className="flex gap-1 mt-auto">
                                                                            <button onClick={() => det.modulo === 'Limpieza' ? evaluarLimpiezaEnVivo(det.fecha, p.empleado_id, det.tarea, 'cumplio') : evaluarObservacionEnVivo(det.fecha, p.empleado_id, det.tarea, 'cumplio')} className="flex-1 bg-emerald-500 text-white text-[9px] font-black py-1.5 rounded flex items-center justify-center shadow-sm hover:bg-emerald-600 active:scale-95"><CheckCircle2 size={12}/></button>
                                                                            <button onClick={() => det.modulo === 'Limpieza' ? evaluarLimpiezaEnVivo(det.fecha, p.empleado_id, det.tarea, 'no_cumplio') : evaluarObservacionEnVivo(det.fecha, p.empleado_id, det.tarea, 'no_cumplio')} className="flex-1 bg-red-500 text-white text-[9px] font-black py-1.5 rounded flex items-center justify-center shadow-sm hover:bg-red-600 active:scale-95"><XCircle size={12}/></button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-auto">
                                                <h4 className="text-lg font-black text-slate-700 flex items-center gap-2 mb-4"><DollarSign className="text-orange-500" /> 3. Ajustes y Finanzas</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                    <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                                                        <p className="text-[10px] font-black text-emerald-700 uppercase mb-2 flex items-center gap-1"><PlusCircle size={12}/> Sumar Dinero</p>
                                                        <input type="text" placeholder="Concepto" value={form.conceptoIngreso || ''} onChange={(e) => manejarCambioDinamico(p.empleado_id, 'conceptoIngreso', e.target.value)} className="w-full text-xs font-bold p-2 mb-2 rounded-lg border outline-none" />
                                                        <div className="flex gap-2">
                                                            <input type="number" placeholder="$" value={form.montoIngreso || ''} onChange={(e) => manejarCambioDinamico(p.empleado_id, 'montoIngreso', e.target.value)} className="w-full text-xs font-black p-2 rounded-lg border outline-none" />
                                                            <button onClick={() => aplicarConceptoDinamico(p.empleado_id, 'ingreso')} className="bg-emerald-600 text-white px-3 rounded-lg font-black">+</button>
                                                        </div>
                                                    </div>
                                                    <div className="bg-red-50/50 p-3 rounded-2xl border border-red-100">
                                                        <p className="text-[10px] font-black text-red-700 uppercase mb-2 flex items-center gap-1"><MinusCircle size={12}/> Restar Dinero</p>
                                                        <input type="text" placeholder="Concepto" value={form.conceptoEgreso || ''} onChange={(e) => manejarCambioDinamico(p.empleado_id, 'conceptoEgreso', e.target.value)} className="w-full text-xs font-bold p-2 mb-2 rounded-lg border outline-none" />
                                                        <div className="flex gap-2">
                                                            <input type="number" placeholder="$" value={form.montoEgreso || ''} onChange={(e) => manejarCambioDinamico(p.empleado_id, 'montoEgreso', e.target.value)} className="w-full text-xs font-black p-2 rounded-lg border outline-none" />
                                                            <button onClick={() => aplicarConceptoDinamico(p.empleado_id, 'egreso')} className="bg-red-600 text-white px-3 rounded-lg font-black">-</button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                                    <div className="bg-slate-100 grid grid-cols-2 p-2 border-b border-slate-200">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase pl-2">Ingresos (+)</span>
                                                        <span className="text-[10px] font-black text-slate-500 uppercase pl-2 border-l border-slate-200">Egresos (-)</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 bg-white min-h-[100px] text-xs font-bold">
                                                        <div className="p-3 space-y-2 border-r border-slate-100">
                                                            {p.ingresos_base.map((ing, i) => (
                                                                <div key={i} className="flex justify-between items-start text-slate-700 group hover:bg-slate-50 p-1 -mx-1 rounded transition">
                                                                    <span className="truncate pr-2 flex items-start gap-1" title={ing.concepto}>
                                                                        {/* 👇 BOTÓN DE BASURA: Oculto por defecto, aparece al pasar el mouse SOLO en Días Festivos */}
                                                                        {ing.concepto.includes('Día Festivo Laborado') && (
                                                                            <button onClick={() => eliminarBonoSistema(p.empleado_id, ing.concepto)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 shrink-0 transition" title="Quitar Bono de Festivo">
                                                                                <Trash2 size={12} className="mt-0.5"/>
                                                                            </button>
                                                                        )}
                                                                        {ing.concepto}
                                                                    </span>
                                                                    <span className="text-emerald-600 font-black shrink-0">{formaterMoneda(ing.monto)}</span>
                                                                </div>
                                                            ))}
                                                            {p.adicionales_ingresos?.map((ing) => (
                                                                <div key={ing.id} className="flex justify-between items-start text-slate-700 group bg-emerald-50 p-1 rounded">
                                                                    <span className="truncate pr-2" title={ing.concepto}>{ing.concepto}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-emerald-600 font-black shrink-0">{formaterMoneda(ing.monto)}</span>
                                                                        <button onClick={() => removerDinamico(p.empleado_id, 'ingreso', ing.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 shrink-0 transition"><Trash2 size={12}/></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="p-3 space-y-2">
                                                            {p.egresos_base.map((eg, i) => (
                                                                <div key={i} className="flex justify-between text-slate-700"><span className="truncate pr-2" title={eg.concepto}>{eg.concepto}</span><span className="text-red-600 font-black shrink-0">{formaterMoneda(eg.monto)}</span></div>
                                                            ))}
                                                            {p.adicionales_egresos?.map((eg) => (
                                                                <div key={eg.id} className="flex justify-between items-start text-slate-700 group bg-red-50 p-1 rounded">
                                                                    <span className="truncate pr-2" title={eg.concepto}>{eg.concepto}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-red-600 font-black shrink-0">{formaterMoneda(eg.monto)}</span>
                                                                        <button onClick={() => removerDinamico(p.empleado_id, 'egreso', eg.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 shrink-0 transition"><Trash2 size={12}/></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="sticky bottom-6 mt-12 max-w-2xl mx-auto z-50">
                        <button disabled={isSubmitting} onClick={guardarNomina} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[24px] shadow-2xl flex items-center justify-center gap-3 text-xl active:scale-95 disabled:opacity-50 border-4 border-white">
                            <Save size={28} /> {isSubmitting ? 'Guardando...' : 'Aprobar y Emitir Nómina'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NominaGenerar;