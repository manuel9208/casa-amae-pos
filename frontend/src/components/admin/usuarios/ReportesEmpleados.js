import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Printer, CheckCircle2, XCircle, Clock, AlertTriangle, Sparkles, User, ShieldAlert } from 'lucide-react';

const diasSemanaMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ReportesEmpleados = ({ usuariosDB, apiUrl }) => {
  const [reportes, setReportes] = useState({ historialAsistencias: [] });
  const [matrizLimpiezaGlobal, setMatrizLimpiezaGlobal] = useState({ evaluaciones: {}, asignaciones: {} });
  
  const hoyStr = new Date().toISOString().split('T')[0];
  const [periodo, setPeriodo] = useState('semana');
  const [fechaFiltro, setFechaFiltro] = useState(hoyStr);
  const [filtroUsuario, setFiltroUsuario] = useState('Todos');
  
  // Configuraciones de Tolerancia
  const [minutosTolerancia, setMinutosTolerancia] = useState(15); // Para retardos al entrar
  const [toleranciaSalida, setToleranciaSalida] = useState(30);   // Límite de minutos después de la hora de salida para cortar el turno

  const cargarReportes = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/usuarios/rendimiento?periodo=${periodo}&fecha=${fechaFiltro}&usuario_id=${filtroUsuario}`);
      if (res.ok) {
        const data = await res.json();
        setReportes(data);
      }

      const resConfig = await fetch(`${apiUrl}/configuracion`);
      if (resConfig.ok) {
         const configData = await resConfig.json();
         setMatrizLimpiezaGlobal(typeof configData.matriz_limpieza === 'string' ? JSON.parse(configData.matriz_limpieza || '{}') : (configData.matriz_limpieza || {}));
      }
    } catch (error) {
      console.error("Error al cargar reportes", error);
    }
  }, [apiUrl, periodo, fechaFiltro, filtroUsuario]);

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  const empleadosVisibles = usuariosDB
    .filter(u => u.nombre !== 'Administrador Global')
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const getFechasPeriodo = () => {
    const fechas = [];
    const f = new Date(fechaFiltro + 'T12:00:00');
    
    if (periodo === 'dia') {
        fechas.push(fechaFiltro);
    } else if (periodo === 'semana') {
        const day = f.getDay();
        const diff = f.getDate() - day + (day === 0 ? -6 : 1); 
        const start = new Date(f.setDate(diff));
        for (let i = 0; i < 7; i++) {
            const cur = new Date(start);
            cur.setDate(start.getDate() + i);
            fechas.push(cur.toISOString().split('T')[0]);
        }
    } else if (periodo === 'mes') {
        const y = f.getFullYear(), m = f.getMonth();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            fechas.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
        }
    } else if (periodo === 'anio') {
        const y = f.getFullYear();
        const curMonth = y === new Date().getFullYear() ? new Date().getMonth() : 11;
        for(let m=0; m<=curMonth; m++) {
            const daysInMonth = new Date(y, m + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                fechas.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
            }
        }
    }
    return fechas;
  };

  // ======================================================================
  // 🧠 MOTOR INTELIGENTE DE PROCESAMIENTO MATRICIAL Y FUSIÓN DE CHECADAS
  // ======================================================================
  const procesarDashboard = () => {
    const fechasAAnalizar = getFechasPeriodo();
    
    return empleadosVisibles.map(emp => {
        const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
        const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        const descansos = pres.dias_descanso || [];

        const oficiales = [];
        const anomalas = [];
        const limpiezas = [];

        fechasAAnalizar.forEach(fechaStr => {
            const dateObj = new Date(fechaStr + 'T12:00:00');
            const nombreDia = diasSemanaMap[dateObj.getDay()];
            
            const confDia = hor[fechaStr] || hor[nombreDia] || { activo: false };
            const esDescanso = descansos.includes(nombreDia);
            const esDiaLaboral = confDia.activo === true && !esDescanso;

            // 1. EXTRAER Y FUSIONAR TODAS LAS CHECADAS DE ESTE DÍA PARA ESTE EMPLEADO
            const checkinsDelDia = (reportes.historialAsistencias || []).filter(h => h.usuario_id === emp.id && h.fecha.startsWith(fechaStr));

            if (checkinsDelDia.length > 0) {
                // Buscamos la primera entrada y la última salida
                let minEntrada = new Date(checkinsDelDia[0].hora_entrada);
                let maxSalida = checkinsDelDia[0].hora_salida ? new Date(checkinsDelDia[0].hora_salida) : null;
                let tieneNullSalida = !checkinsDelDia[0].hora_salida;

                for (let i = 1; i < checkinsDelDia.length; i++) {
                    const inD = new Date(checkinsDelDia[i].hora_entrada);
                    if (inD < minEntrada) minEntrada = inD;

                    if (checkinsDelDia[i].hora_salida) {
                        const outD = new Date(checkinsDelDia[i].hora_salida);
                        if (!maxSalida || outD > maxSalida) maxSalida = outD;
                    } else {
                        tieneNullSalida = true;
                    }
                }

                // 2. APLICAR TOPE DE SEGURIDAD Y TOLERANCIA DE SALIDA
                let outTime;
                let olvidoSalida = false;
                let turnoActivo = false;
                let limiteSalidaTime = null;

                if (confDia.salida) {
                    const [hOut, mOut] = confDia.salida.split(':').map(Number);
                    const [hIn] = (confDia.entrada || '00:00').split(':').map(Number);
                    let dateLimit = new Date(fechaStr + 'T00:00:00');
                    dateLimit.setHours(hOut, mOut, 0, 0);

                    // Si la salida oficial es de madrugada (menor a la entrada), sumamos un día al límite
                    if (hOut < hIn) {
                        dateLimit.setDate(dateLimit.getDate() + 1);
                    }
                    
                    // Añadimos la tolerancia máxima permitida
                    dateLimit.setMinutes(dateLimit.getMinutes() + toleranciaSalida);
                    limiteSalidaTime = dateLimit.getTime();
                }

                if (tieneNullSalida) {
                    if (fechaStr === hoyStr) {
                        outTime = new Date().getTime();
                        turnoActivo = true;
                    } else {
                        olvidoSalida = true;
                        outTime = limiteSalidaTime || minEntrada.getTime(); // Topamos a su límite oficial
                    }
                } else {
                    // Tienen hora de salida, verificamos si excede el límite permitido absurdamente
                    if (limiteSalidaTime && maxSalida.getTime() > limiteSalidaTime) {
                        olvidoSalida = true;
                        outTime = limiteSalidaTime; // Topar horas para evitar jornadas de 15hrs
                    } else {
                        outTime = maxSalida.getTime();
                    }
                }

                let diffHrs = (outTime - minEntrada.getTime()) / 3600000;
                if (diffHrs < 0) diffHrs = 0;

                const strEntrada = minEntrada.toLocaleTimeString('es-MX', { timeZone: 'America/Mazatlan', hour:'2-digit', minute:'2-digit', hour12: true });
                const strSalida = turnoActivo ? 'En Turno' : (olvidoSalida ? 'Olvidó Checar' : new Date(outTime).toLocaleTimeString('es-MX', { timeZone: 'America/Mazatlan', hour:'2-digit', minute:'2-digit', hour12: true }));

                // Verificamos si hubo retardo en la entrada
                let esRetardo = false;
                if (confDia.entrada) {
                    const [hIn, mIn] = confDia.entrada.split(':').map(Number);
                    const stringHoraCompleta = minEntrada.toLocaleTimeString('es-MX', { timeZone: 'America/Mazatlan', hour12: false });
                    const [hReal, mReal] = stringHoraCompleta.split(':').map(Number);
                    
                    const minOficiales = (hIn * 60) + mIn;
                    const minReales = (hReal * 60) + mReal;

                    if (minReales > (minOficiales + minutosTolerancia)) {
                        esRetardo = true;
                    }
                }

                const record = {
                    fecha: fechaStr,
                    dia: nombreDia,
                    entrada: strEntrada,
                    salida: strSalida,
                    horas: diffHrs.toFixed(2),
                    turnoActivo,
                    olvidoSalida,
                    esRetardo,
                    oficial: confDia.entrada ? `${confDia.entrada} a ${confDia.salida || '--:--'}` : 'Sin turno fijo'
                };

                // 3. CLASIFICACIÓN (DÍAS OFICIALES VS ANOMALÍAS)
                if (!esDiaLaboral) {
                    anomalas.push({ ...record, motivo: esDescanso ? 'Checada en su Día de Descanso' : 'Día Inactivo en Configuración' });
                } else {
                    let anomaloPorHorario = false;
                    if (confDia.entrada) {
                        const stringHoraCompleta = minEntrada.toLocaleTimeString('es-MX', { timeZone: 'America/Mazatlan', hour12: false });
                        const [hReal] = stringHoraCompleta.split(':').map(Number);
                        const [hOfIn] = confDia.entrada.split(':').map(Number);

                        // Si checa absurdamente temprano (ej. > 3 horas antes) o muy tarde (> 4 horas después)
                        if (hReal < hOfIn - 3 || hReal > hOfIn + 4) {
                            anomaloPorHorario = true;
                        }
                    }

                    if (anomaloPorHorario) {
                        anomalas.push({ ...record, motivo: `Totalmente fuera del rango asignado (${confDia.entrada})` });
                    } else {
                        oficiales.push(record);
                    }
                }
            }

            // 4. PROCESAR AUDITORÍA DE LIMPIEZA CONGELADA (Candados)
            const evals = matrizLimpiezaGlobal.evaluaciones || {};
            const asigs = matrizLimpiezaGlobal.asignaciones || {};
            Object.keys(evals).forEach(area => {
                if (String(asigs[area]?.[fechaStr]) === String(emp.id)) {
                    limpiezas.push({
                        fecha: fechaStr,
                        dia: nombreDia,
                        area: area,
                        status: evals[area][fechaStr]
                    });
                }
            });
        });

        return { emp, oficiales, anomalas, limpiezas };
    }).filter(d => d.oficiales.length > 0 || d.anomalas.length > 0 || d.limpiezas.length > 0);
  };

  const datosCompletos = procesarDashboard();
  const datosFiltrados = filtroUsuario === 'Todos' ? datosCompletos : datosCompletos.filter(d => String(d.emp.id) === String(filtroUsuario));

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      {/* CABECERA Y CONFIGURACIÓN DE TOLERANCIAS */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-[36px] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-5">
          <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/30 text-emerald-400"><Calendar size={32}/></div>
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Visor Operativo</p>
            <h3 className="text-2xl font-black tracking-tight">Cumplimiento en Vivo</h3>
          </div>
        </div>  
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          <div className="flex flex-col gap-2 bg-slate-800 border border-slate-700 p-3 rounded-2xl shadow-inner w-full md:w-auto">
             <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase">Tolerancia Entrada:</span>
                <div className="flex items-center"><input type="number" min="0" value={minutosTolerancia} onChange={e => setMinutosTolerancia(Number(e.target.value))} className="w-12 bg-slate-900 border border-slate-600 text-center text-emerald-400 font-black rounded-lg py-1 outline-none focus:border-emerald-500 transition-colors" /><span className="text-[9px] text-slate-500 ml-1">Min</span></div>
             </div>
             <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase">Tope Cierre Salida:</span>
                <div className="flex items-center"><input type="number" min="0" value={toleranciaSalida} onChange={e => setToleranciaSalida(Number(e.target.value))} className="w-12 bg-slate-900 border border-slate-600 text-center text-red-400 font-black rounded-lg py-1 outline-none focus:border-red-500 transition-colors" /><span className="text-[9px] text-slate-500 ml-1">Min</span></div>
             </div>
          </div>

          <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} className="w-full md:w-auto h-[58px] bg-slate-800 text-white border border-slate-700 px-4 rounded-2xl font-bold outline-none focus:ring-2 ring-emerald-500 cursor-pointer">
            <option value="Todos">Todos los empleados</option>
            {empleadosVisibles.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}
          </select>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full md:w-auto h-[58px] bg-slate-800 text-white border border-slate-700 px-4 rounded-2xl font-bold outline-none focus:ring-2 ring-emerald-500 cursor-pointer">
            <option value="dia">Día Exacto</option>
            <option value="semana">Semana de...</option>
            <option value="mes">Mes de...</option>
            <option value="anio">Año de...</option>
          </select>
          <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} className="w-full md:w-auto h-[58px] bg-slate-800 text-white border border-slate-700 px-4 rounded-2xl font-bold outline-none focus:ring-2 ring-emerald-500 cursor-pointer" style={{ colorScheme: 'dark' }} />
          <button onClick={() => window.print()} className="w-full md:w-auto h-[58px] bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 rounded-2xl font-black flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/20">
            <Printer size={20}/> Imprimir
          </button>
        </div>
      </div>  

      <div id="seccion-a-imprimir" className="space-y-8">
         {datosFiltrados.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-[32px] border border-slate-200 border-dashed">
              <AlertTriangle size={48} className="mx-auto text-slate-300 mb-4 opacity-50"/>
              <p className="text-slate-500 font-bold text-lg">No hay registros de asistencia ni auditorías en las fechas seleccionadas.</p>
            </div>
         ) : (
            datosFiltrados.map((data) => (
                <div key={data.emp.id} className="bg-white p-6 md:p-8 rounded-[36px] shadow-sm border border-slate-200 break-inside-avoid print:mb-6">
                    
                    {/* 👨‍🍳 PERFIL DEL EMPLEADO */}
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                        <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl print:bg-slate-200 print:text-black">
                            <User size={28}/>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">{data.emp.nombre}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{data.emp.rol}</p>
                        </div>
                    </div>

                    {/* 🟢 SECCIÓN 1: CHECADAS EN DÍAS OFICIALES */}
                    <div className="mb-8">
                        <h4 className="text-lg font-black text-slate-700 flex items-center gap-2 mb-4"><Clock className="text-blue-500 print:text-black"/> 1. Checadas en Días Laborales Programados</h4>
                        {data.oficiales.length === 0 ? (
                            <p className="text-sm font-medium text-slate-400 italic bg-slate-50 p-4 rounded-2xl border border-slate-100">No tuvo asistencias en sus días asignados durante este periodo.</p>
                        ) : (
                            <div className="overflow-x-auto border border-slate-200 rounded-2xl custom-scrollbar print:border-slate-300">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
                                        <tr>
                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Día / Fecha</th>
                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Turno Asignado</th>
                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Marcó Entrada</th>
                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Marcó Salida</th>
                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Hrs Acumuladas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.oficiales.map((rec, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition print:text-sm">
                                                <td className="p-3 font-bold text-slate-700">{rec.dia} <span className="text-[10px] font-medium text-slate-400 ml-1">{rec.fecha}</span></td>
                                                <td className="p-3 font-bold text-slate-500">{rec.oficial}</td>
                                                <td className="p-3 font-black text-emerald-600">
                                                    {rec.entrada} {rec.esRetardo && <span className="ml-2 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">Retardo</span>}
                                                </td>
                                                <td className="p-3 font-black text-blue-600">
                                                    {rec.olvidoSalida ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] uppercase">⚠️ Olvidó Checar</span> : rec.salida}
                                                </td>
                                                <td className="p-3 font-black text-slate-800 text-right">
                                                   <span className="bg-slate-100 px-2 py-1 rounded-lg">{rec.horas}h</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ✨ SECCIÓN 2: AUDITORÍA DE LIMPIEZA */}
                    <div className="mb-8">
                        <h4 className="text-lg font-black text-slate-700 flex items-center gap-2 mb-4"><Sparkles className="text-emerald-500 print:text-black"/> 2. Resultados de Limpieza (Candados Cerrados)</h4>
                        {data.limpiezas.length === 0 ? (
                            <p className="text-sm font-medium text-slate-400 italic bg-slate-50 p-4 rounded-2xl border border-slate-100">No se encontraron áreas evaluadas o cerradas para este empleado en este periodo.</p>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {data.limpiezas.map((limp, i) => (
                                    <div key={i} className={`flex flex-col border rounded-xl p-3 shadow-sm min-w-[150px] ${limp.status === 'cumplio' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{limp.dia} {limp.fecha.split('-')[2]}</span>
                                            {limp.status === 'cumplio' ? <CheckCircle2 size={16} className="text-emerald-600"/> : <XCircle size={16} className="text-red-600"/>}
                                        </div>
                                        <p className={`font-black text-sm uppercase ${limp.status === 'cumplio' ? 'text-emerald-800' : 'text-red-800'}`}>{limp.area}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ⚠️ SECCIÓN 3: ANOMALÍAS Y DESCANSOS */}
                    {data.anomalas.length > 0 && (
                        <div>
                            <h4 className="text-lg font-black text-red-600 flex items-center gap-2 mb-4"><ShieldAlert className="text-red-500 print:text-black"/> 3. Alertas: Checadas Anómalas y Descansos</h4>
                            <div className="overflow-x-auto border border-red-100 rounded-2xl custom-scrollbar print:border-slate-300">
                                <table className="w-full text-left border-collapse bg-red-50/30">
                                    <thead className="bg-red-50 border-b border-red-100 print:bg-slate-100">
                                        <tr>
                                            <th className="p-3 text-[10px] font-black text-red-800 uppercase tracking-widest">Día / Fecha</th>
                                            <th className="p-3 text-[10px] font-black text-red-800 uppercase tracking-widest">Motivo de Alerta</th>
                                            <th className="p-3 text-[10px] font-black text-red-800 uppercase tracking-widest">Marcó Entrada</th>
                                            <th className="p-3 text-[10px] font-black text-red-800 uppercase tracking-widest">Marcó Salida</th>
                                            <th className="p-3 text-[10px] font-black text-red-800 uppercase tracking-widest text-right">Hrs Acumuladas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-50/50">
                                        {data.anomalas.map((rec, i) => (
                                            <tr key={i} className="hover:bg-red-50 transition print:text-sm">
                                                <td className="p-3 font-bold text-red-900">{rec.dia} <span className="text-[10px] font-medium text-red-400 ml-1">{rec.fecha}</span></td>
                                                <td className="p-3 font-black text-red-600 text-xs">{rec.motivo}</td>
                                                <td className="p-3 font-black text-red-800">{rec.entrada}</td>
                                                <td className="p-3 font-black text-red-800">
                                                    {rec.olvidoSalida ? <span className="text-[10px] uppercase">⚠️ {rec.salida}</span> : rec.salida}
                                                </td>
                                                <td className="p-3 font-black text-red-900 text-right">
                                                   <span className="bg-red-100 px-2 py-1 rounded-lg">{rec.horas}h</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            ))
         )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #seccion-a-imprimir, #seccion-a-imprimir * { visibility: visible; }
          #seccion-a-imprimir { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};  

export default ReportesEmpleados;