import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Lock, Star, Save, Users, ChevronLeft, ChevronRight, Info, Coffee } from 'lucide-react';  

const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];  
const diasSemanaCompletos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const GestorCalendarioAnual = ({ configGlobal, setConfigGlobal, apiUrl, showAlert, refrescarDatos, usuariosDB = [] }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);  
    const [yearActual, setYearActual] = useState(new Date().getFullYear());
    const [mesActivo, setMesActivo] = useState(new Date().getMonth());
    const [diaSeleccionado, setDiaSeleccionado] = useState(null);  

    const calendarioDB = typeof configGlobal.calendario_anual === 'string' ? JSON.parse(configGlobal.calendario_anual || '{}') : (configGlobal.calendario_anual || {});  
    const limiteRolesDB = typeof configGlobal.limites_vacaciones_rol === 'string' ? JSON.parse(configGlobal.limites_vacaciones_rol || '{}') : (configGlobal.limites_vacaciones_rol || {});
    
    const [calendarioVisual, setCalendarioVisual] = useState(calendarioDB);
    const [limitesRol, setLimitesRol] = useState(limiteRolesDB);
    const [panelDia, setPanelDia] = useState(null);  

    const rolesDisponibles = [...new Set(usuariosDB.filter(u => u.rol !== 'admin' && u.rol !== 'tv').map(u => u.rol))];

    const festivosAutomaticos = useMemo(() => {
        const festivos = {};
        const add = (mes, dia, motivo) => { festivos[`${yearActual}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`] = { tipo: 'festivo', motivo, auto: true }; };  
        const obtenerLunes = (mesIndex, orden) => {
            let d = new Date(yearActual, mesIndex - 1, 1);
            let lunesContados = 0;
            while (d.getMonth() === mesIndex - 1) {
                if (d.getDay() === 1) {
                    lunesContados++;
                    if (lunesContados === orden) return d.getDate();
                }
                d.setDate(d.getDate() + 1);
            }
            return null;
        };  
        add(1, 1, 'Año Nuevo');
        add(2, 2, 'Día de la Candelaria');
        add(5, 1, 'Día del Trabajo');
        add(5, 5, 'Batalla de Puebla');
        add(5, 10, 'Día de las Madres');
        add(9, 16, 'Independencia de México');
        add(11, 1, 'Día de Todos los Santos');
        add(11, 2, 'Día de Muertos');
        add(12, 12, 'Día de la Virgen de Guadalupe');
        add(12, 24, 'Nochebuena');
        add(12, 25, 'Navidad');
        add(12, 31, 'Fin de Año');  
        add(2, obtenerLunes(2, 1), 'Día de la Constitución (1er Lunes)');
        add(3, obtenerLunes(3, 3), 'Natalicio Benito Juárez (3er Lunes)');
        add(11, obtenerLunes(11, 3), 'Revolución Mexicana (3er Lunes)');
        return festivos;
    }, [yearActual]);  

    const getDiasDelMes = () => {
        const daysInMonth = new Date(yearActual, mesActivo + 1, 0).getDate();
        const firstDayIndex = new Date(yearActual, mesActivo, 1).getDay();
        const celdas = Array.from({ length: firstDayIndex }).fill(null);  
        for (let i = 1; i <= daysInMonth; i++) {
            const fechaStr = `${yearActual}-${String(mesActivo + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const estadoBase = festivosAutomaticos[fechaStr];
            const estadoDB = calendarioVisual[fechaStr];
            celdas.push({
                dia: i,
                fechaStr,
                tipo: estadoDB ? estadoDB.tipo : (estadoBase ? estadoBase.tipo : 'normal'),
                motivo: estadoDB ? estadoDB.motivo : (estadoBase ? estadoBase.motivo : ''),
                esAuto: estadoBase && !estadoDB 
            });
        }
        return celdas;
    };  
    const diasCeldas = getDiasDelMes();  

    const abrirDia = (celda) => {
        setDiaSeleccionado(celda.fechaStr);
        setPanelDia({
            fechaStr: celda.fechaStr,
            motivo: celda.motivo || '',
            esBloqueado: celda.tipo === 'bloqueado',
            esFestivo: celda.tipo === 'festivo',
            esAuto: celda.esAuto
        });
    };  

    const guardarDiaSeleccionado = () => {
        if (!panelDia) return;  
        const { fechaStr, motivo, esBloqueado, esFestivo } = panelDia;  
        const nuevasReglas = { ...calendarioVisual };  
        if (!esBloqueado && !esFestivo && !motivo) {
            delete nuevasReglas[fechaStr];
        } else {
            nuevasReglas[fechaStr] = { tipo: esBloqueado ? 'bloqueado' : 'festivo', motivo: motivo.trim() || 'Día Especial' };
        }  
        setCalendarioVisual(nuevasReglas);
        setDiaSeleccionado(null);
        setPanelDia(null);
    };  

    const guardarConfiguracionGlobal = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);  
        const formData = new FormData();
        formData.append('calendario_anual', JSON.stringify(calendarioVisual));
        formData.append('limites_vacaciones_rol', JSON.stringify(limitesRol));  
        try {
            const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
            if (res.ok) {
                setConfigGlobal({ ...configGlobal, calendario_anual: JSON.stringify(calendarioVisual), limites_vacaciones_rol: JSON.stringify(limitesRol) });
                showAlert("¡Guardado!", "El calendario y las reglas se han guardado exitosamente.", "success");
                if(refrescarDatos) refrescarDatos();
            } else {
                showAlert("Error", "No se pudo guardar la configuración.", "error");
            }
        } catch (error) { showAlert("Error", "Problema de red al guardar.", "error"); }
        setIsSubmitting(false);
    };  

    // Cálculo de qué empleados descansan el día seleccionado
    let empleadosDescansando = [];
    if (panelDia) {
        const d = new Date(panelDia.fechaStr + 'T12:00:00');
        const nombreDiaSemana = diasSemanaCompletos[d.getDay()];
        empleadosDescansando = usuariosDB.filter(u => {
            if (u.rol === 'admin' || u.rol === 'tv') return false;
            const h = typeof u.horario_semanal === 'string' ? JSON.parse(u.horario_semanal || '{}') : (u.horario_semanal || {});
            return h[nombreDiaSemana]?.es_descanso === true || h[nombreDiaSemana]?.activo === false;
        });
    }

    return (
        <div className="space-y-6 animate-in fade-in">  
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl shadow-inner"><CalendarIcon size={28} /></div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Calendario Anual y Reglas</h3>
                        <p className="text-sm font-bold text-slate-500 mt-1">Días festivos, bloqueos y límites de vacaciones.</p>
                    </div>
                </div>  
            </div>  

            {/* MÓDULO: LÍMITES DE VACACIONES POR ROL */}
            <div className="bg-white p-6 md:p-8 rounded-[36px] shadow-sm border border-slate-200">
                <h4 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2"><Users size={20} className="text-blue-500"/> Límite de Vacaciones Simultáneas</h4>
                <p className="text-sm text-slate-500 font-bold mb-6">Indica cuántos empleados del <b>mismo puesto</b> pueden irse de vacaciones al mismo tiempo.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {rolesDisponibles.map(rol => (
                        <div key={rol} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2 shadow-sm">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{rol.replace('_', ' ')}</span>
                            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200">
                                <input type="number" min="0" value={limitesRol[rol] || 1} onChange={(e) => setLimitesRol({...limitesRol, [rol]: Number(e.target.value)})} className="w-12 bg-transparent text-center font-black text-blue-600 outline-none p-1 text-lg" />
                                <span className="text-[10px] font-bold text-slate-400">Pxs</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">  
                <div className="lg:col-span-3 bg-white p-6 md:p-8 rounded-[36px] shadow-sm border border-slate-200 flex flex-col">  
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                            <button onClick={() => setYearActual(y => y - 1)} className="p-2 hover:bg-white rounded-xl text-slate-600 transition shadow-sm"><ChevronLeft size={20}/></button>
                            <span className="font-black text-2xl px-4 text-slate-800">{yearActual}</span>
                            <button onClick={() => setYearActual(y => y + 1)} className="p-2 hover:bg-white rounded-xl text-slate-600 transition shadow-sm"><ChevronRight size={20}/></button>
                        </div>
                    </div>  
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-4 mb-2">
                        {mesesNombres.map((mes, idx) => (
                            <button key={mes} onClick={() => { setMesActivo(idx); setDiaSeleccionado(null); setPanelDia(null); }} className={`px-6 py-3 rounded-2xl font-black text-sm transition-all whitespace-nowrap ${mesActivo === idx ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
                                {mes}
                            </button>
                        ))}
                    </div>  
                    <div className="border border-slate-100 rounded-3xl overflow-hidden bg-slate-50/50">
                        <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
                            {diasSemana.map(d => <div key={d} className={`p-3 text-center text-[10px] md:text-xs font-black uppercase tracking-widest ${d === 'Dom' || d === 'Sáb' ? 'text-red-400' : 'text-slate-500'}`}>{d}</div>)}
                        </div>  
                        <div className="grid grid-cols-7 gap-px bg-slate-100">
                            {diasCeldas.map((celda, i) => {
                                if (!celda) return <div key={`blank-${i}`} className="bg-white min-h-[80px] md:min-h-[100px]"></div>;  
                                const isSelected = celda.fechaStr === diaSeleccionado;
                                const isFestivo = celda.tipo === 'festivo';
                                const isBloqueado = celda.tipo === 'bloqueado';  
                                let bgClass = 'bg-white hover:bg-blue-50';
                                if (isSelected) bgClass = 'bg-blue-100 ring-2 ring-blue-500 ring-inset';
                                else if (isBloqueado) bgClass = 'bg-rose-50 hover:bg-rose-100 border-b-2 border-rose-300';
                                else if (isFestivo) bgClass = 'bg-amber-50 hover:bg-amber-100 border-b-2 border-amber-300';  
                                return (
                                    <button key={celda.fechaStr} onClick={() => abrirDia(celda)} className={`relative p-2 flex flex-col items-center justify-start min-h-[80px] md:min-h-[100px] transition-all cursor-pointer outline-none ${bgClass}`}>
                                        <span className={`font-black text-sm md:text-lg mb-1 ${isBloqueado ? 'text-rose-700' : isFestivo ? 'text-amber-700' : 'text-slate-700'}`}>{celda.dia}</span>  
                                        {isBloqueado && <div className="flex flex-col items-center gap-0.5"><Lock size={14} className="text-rose-500" /><span className="text-[8px] md:text-[9px] font-bold text-rose-600 leading-tight truncate w-full px-1">{celda.motivo || 'Bloqueado'}</span></div>}  
                                        {isFestivo && !isBloqueado && <div className="flex flex-col items-center gap-0.5"><Star size={14} className="text-amber-500 fill-amber-500" /><span className="text-[8px] md:text-[9px] font-bold text-amber-700 leading-tight truncate w-full px-1">{celda.motivo}</span></div>}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-6 items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-200 border border-amber-400"></div> Festivo / Asueto</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-200 border border-rose-400"></div> Bloqueado para vacaciones</div>
                    </div>

                    {/* 👇 BOTÓN REUBICADO Y RENOMBRADO */}
                    <div className="mt-8 border-t border-slate-100 pt-6 flex justify-end mt-auto">
                        <button disabled={isSubmitting} onClick={guardarConfiguracionGlobal} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap">
                            <Save size={20} /> Guardar Cambios
                        </button>
                    </div>
                </div>  

                {/* COLUMNA PANEL LATERAL (Derecha 25%) */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-800 p-6 rounded-[36px] shadow-xl border border-slate-700 h-full flex flex-col sticky top-6 text-white">  
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 border-b border-slate-700 pb-4">Ajustes del Día</h4>  
                        {!panelDia ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-10">
                                <CalendarIcon size={48} className="mb-4" />
                                <p className="font-bold text-sm">Selecciona un día en el calendario para configurarlo.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 flex flex-col h-full">
                                <div>
                                    <p className="text-2xl font-black text-blue-400 mb-1">{panelDia.fechaStr.split('-')[2]} de {mesesNombres[Number(panelDia.fechaStr.split('-')[1]) - 1]}</p>
                                    {panelDia.esAuto && !panelDia.esBloqueado && <p className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-1 rounded inline-block border border-amber-500/30">✨ Festivo Automático (Sistema)</p>}
                                </div>  
                                
                                <div className="space-y-4 bg-slate-900 p-4 rounded-2xl border border-slate-700">
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="font-bold text-sm flex items-center gap-2 text-rose-400"><Lock size={16}/> Bloquear Día</span>
                                        <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${panelDia.esBloqueado ? 'bg-rose-500' : 'bg-slate-600'}`}>
                                            <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${panelDia.esBloqueado ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                        <input type="checkbox" className="hidden" checked={panelDia.esBloqueado} onChange={(e) => setPanelDia({...panelDia, esBloqueado: e.target.checked, esFestivo: false})} />
                                    </label>  
                                    {!panelDia.esBloqueado && (
                                        <label className="flex items-center justify-between cursor-pointer group pt-4 border-t border-slate-700">
                                            <span className="font-bold text-sm flex items-center gap-2 text-amber-400"><Star size={16}/> Es Festivo</span>
                                            <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${panelDia.esFestivo || panelDia.esAuto ? 'bg-amber-500' : 'bg-slate-600'}`}>
                                                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${panelDia.esFestivo || panelDia.esAuto ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                            </div>
                                            <input type="checkbox" className="hidden" checked={panelDia.esFestivo || panelDia.esAuto} onChange={(e) => setPanelDia({...panelDia, esFestivo: e.target.checked, esAuto: false})} />
                                        </label>
                                    )}
                                </div>  

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motivo / Nombre del Día</label>
                                    <textarea value={panelDia.motivo} onChange={e => setPanelDia({...panelDia, motivo: e.target.value})} placeholder="Ej. Aniversario del Local..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 transition resize-none text-white h-24"></textarea>
                                </div>  

                                <div className="bg-blue-900/30 border border-blue-800/50 p-4 rounded-2xl flex-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-3 flex items-center gap-2"><Coffee size={14}/> Descansan este día ({empleadosDescansando.length})</h4>
                                    {empleadosDescansando.length === 0 ? (
                                        <p className="text-xs text-blue-200/50 italic">Nadie tiene descanso programado.</p>
                                    ) : (
                                        <ul className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                                            {empleadosDescansando.map(e => (
                                                <li key={e.id} className="text-xs font-bold text-blue-100 flex justify-between items-center bg-blue-900/50 p-2 rounded-lg">
                                                    <span className="truncate pr-2">{e.nombre.split(' ')[0]}</span>
                                                    <span className="text-[8px] bg-blue-800 text-blue-300 px-1.5 py-0.5 rounded uppercase">{e.rol.replace('_', ' ')}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-slate-700 mt-auto">
                                    <button onClick={guardarDiaSeleccionado} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-900/50 transition active:scale-95">Aplicar al día</button>
                                    <p className="text-[10px] text-slate-500 text-center mt-3 font-bold flex items-center justify-center gap-1"><Info size={12}/> Recuerda dar clic en "Guardar Cambios" al terminar.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>  
            </div>
        </div>
    );
};  

export default GestorCalendarioAnual;