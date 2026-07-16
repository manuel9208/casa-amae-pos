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
  const [refreshToggle, setRefreshToggle] = useState(false); 
  
  // Configuraciones de Tolerancia
  const [minutosTolerancia, setMinutosTolerancia] = useState(15); 
  const [toleranciaSalida, setToleranciaSalida] = useState(30);   

  // 👇 NUEVO ESTADO: Modal de Ajuste de Horas para Auditoría
  const [modalAjuste, setModalAjuste] = useState({ isOpen: false, empId: null, fecha: '', tipo: '', horasDetectadas: 0, horasFinales: 0 });

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

  // 🛡️ ACCIÓN DE AUDITORÍA (Guardado directo a Base de Datos)
  const guardarAuditoria = async (empId, fecha, tipo, decisionPayload) => {
    try {
        const emp = usuariosDB.find(u => u.id === empId);
        if (!emp) return;

        const horActual = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        
        if (!horActual[fecha]) horActual[fecha] = {};
        if (!horActual[fecha].auditoria) horActual[fecha].auditoria = {};
        
        horActual[fecha].auditoria[tipo] = decisionPayload;

        const res = await fetch(`${apiUrl}/usuarios/${empId}/horario`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ horario_semanal: horActual })
        });

        if (res.ok) {
            emp.horario_semanal = JSON.stringify(horActual); 
            setRefreshToggle(!refreshToggle);
        }
    } catch (e) {
        console.error("Error al guardar la auditoría", e);
    }
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
        const auditoriaDia = hor[fechaStr]?.auditoria || {};  

        const checkinsDelDia = (reportes.historialAsistencias || []).filter(h => h.usuario_id === emp.id && h.fecha.startsWith(fechaStr));  

        if (checkinsDelDia.length > 0) {
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

          let outTime;
          let olvidoSalida = false;
          let turnoActivo = false;
          let limiteSalidaTime = null;  

          if (confDia.salida) {
            const [hOut, mOut] = confDia.salida.split(':').map(Number);
            const [hIn] = (confDia.entrada || '00:00').split(':').map(Number);
            let dateLimit = new Date(fechaStr + 'T00:00:00');
            dateLimit.setHours(hOut, mOut, 0, 0);  
            if (hOut < hIn) {
              dateLimit.setDate(dateLimit.getDate() + 1);
            }  
            dateLimit.setMinutes(dateLimit.getMinutes() + toleranciaSalida);
            limiteSalidaTime = dateLimit.getTime();
          }  

          const maxOchoHoras = minEntrada.getTime() + (8 * 3600000);  

          if (tieneNullSalida) {
            if (fechaStr === hoyStr) {
              outTime = new Date().getTime();
              turnoActivo = true;
            } else {
              olvidoSalida = true;
              outTime = limiteSalidaTime || maxOchoHoras;
            }
          } else {
            outTime = maxSalida.getTime();
            if ((outTime - minEntrada.getTime()) > (24 * 3600000)) {
              olvidoSalida = true;
              outTime = limiteSalidaTime || maxOchoHoras;
            } else if (limiteSalidaTime && outTime > (limiteSalidaTime + (4 * 3600000))) {
              olvidoSalida = true;
              outTime = limiteSalidaTime;
            }
          }  

          let diffHrs = (outTime - minEntrada.getTime()) / 3600000;
          if (diffHrs < 0) diffHrs = 0;  

          const strEntrada = minEntrada.toLocaleTimeString('es-MX', { timeZone: 'America/Mazatlan', hour:'2-digit', minute:'2-digit', hour12: true });
          const strSalida = turnoActivo ? 'En Turno' : (olvidoSalida ? 'Olvidó Checar' : new Date(outTime).toLocaleTimeString('es-MX', { timeZone: 'America/Mazatlan', hour:'2-digit', minute:'2-digit', hour12: true }));  

          let esRetardo = false;
          let hReal = 0, mReal = 0, hOfIn = 0, mOfIn = 0;  

          if (confDia.entrada) {
            [hOfIn, mOfIn] = confDia.entrada.split(':').map(Number);
            const stringHoraCompleta = minEntrada.toLocaleTimeString('es-MX', { timeZone: 'America/Mazatlan', hour12: false });
            [hReal, mReal] = stringHoraCompleta.split(':').map(Number);  
            const minOficiales = (hOfIn * 60) + mOfIn;
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

          let motivosAnomalia = [];
          let requiereAuditoria = false;  

          if (esRetardo) {
            motivosAnomalia.push(`Llegada Tarde (Entrada Oficial: ${confDia.entrada})`);
            requiereAuditoria = true;
          }
          if (olvidoSalida) {
            motivosAnomalia.push(`Olvidó Marcar Salida`);
            requiereAuditoria = true;
          }  
          
          let hrsOficiales = 8;
          if (confDia.entrada && confDia.salida) {
            const [hE, mE] = confDia.entrada.split(':').map(Number);
            const [hS, mS] = confDia.salida.split(':').map(Number);
            let minutosTurno = (hS * 60 + mS) - (hE * 60 + mE);
            if (minutosTurno < 0) minutosTurno += 24 * 60;
            if (minutosTurno > 0) hrsOficiales = minutosTurno / 60;
          }  

          if (!olvidoSalida && diffHrs > hrsOficiales + 0.5) {
            motivosAnomalia.push(`Exceso de Horas (+${(diffHrs - hrsOficiales).toFixed(1)}h extra)`);
            requiereAuditoria = true;
          }
          if (!olvidoSalida && diffHrs < hrsOficiales - 0.5) {
            motivosAnomalia.push(`Jornada Incompleta (-${(hrsOficiales - diffHrs).toFixed(1)}h faltantes)`);
            requiereAuditoria = true;
          }  

          if (turnoActivo) {
            oficiales.push(record);
          } else if (!requiereAuditoria) {
            let estadoAudParsed = { estado: 'aprobado' };
            if (auditoriaDia['auditoria_turno']) {
              try { estadoAudParsed = JSON.parse(auditoriaDia['auditoria_turno']); } catch(e) { estadoAudParsed = { estado: auditoriaDia['auditoria_turno'] }; }
            }
            if (estadoAudParsed.estado === 'rechazado' || estadoAudParsed.horasAprobadas !== undefined) {
              anomalas.push({
                ...record,
                tipo: 'auditoria_turno',
                motivo: 'Ajuste Manual Aplicado por Administrador',
                estadoAuditoria: auditoriaDia['auditoria_turno']
              });
            } else {
              oficiales.push(record);
            }
          }  

          if (olvidoSalida || requiereAuditoria) {
            anomalas.push({
              ...record,
              tipo: 'auditoria_turno',
              motivo: motivosAnomalia.join(' | '),
              estadoAuditoria: auditoriaDia['auditoria_turno']
            });
          }  

        } else {
          const isPast = fechaStr < hoyStr;
          if (esDiaLaboral && isPast) {
            const record = {
              fecha: fechaStr, dia: nombreDia, entrada: '--:--', salida: '--:--', horas: '0.00',
              turnoActivo: false, olvidoSalida: false, esRetardo: false,
              oficial: confDia.entrada ? `${confDia.entrada} a ${confDia.salida || '--:--'}` : 'Sin turno fijo'
            };
            anomalas.push({
              ...record,
              tipo: 'falta',
              motivo: `Falta Injustificada. No se registraron checadas en su turno oficial.`,
              estadoAuditoria: auditoriaDia['falta']
            });
          }
        }  

        // ✅ LOGICA DE LIMPIEZA REPARADA
        const evals = matrizLimpiezaGlobal.evaluaciones || {};
        const asigs = matrizLimpiezaGlobal.asignaciones || {};

        Object.keys(asigs).forEach(area_turno => {
          const asignadosEnFecha = asigs[area_turno]?.[fechaStr] || [];
          const asignadosStr = asignadosEnFecha.map(String);
          
          if (asignadosStr.includes(String(emp.id))) {
            const val = evals[area_turno]?.[fechaStr];
            const status = typeof val === 'string' ? val : val?.[emp.id];
            
            if (status) {
              const nombreArea = area_turno.split('_')[0];
              limpiezas.push({ fecha: fechaStr, dia: nombreDia, area: nombreArea, status: status });
            }
          }
        });
      });  

      return { emp, oficiales, anomalas, limpiezas };
    }).filter(d => d.oficiales.length > 0 || d.anomalas.length > 0 || d.limpiezas.length > 0);
  };

  const datosCompletos = procesarDashboard();
  const datosFiltrados = filtroUsuario === 'Todos' ? datosCompletos : datosCompletos.filter(d => String(d.emp.id) === String(filtroUsuario));

  // 👇 FUNCIÓN PARA EL MODAL INTELIGENTE DE AUDITORÍA
  const manejarClickAprobar = (empId, rec) => {
    if (rec.tipo === 'falta') {
        // Las faltas se justifican directamente, no ocupan ajuste de horas numéricas
        guardarAuditoria(empId, rec.fecha, rec.tipo, JSON.stringify({ estado: 'aprobado' }));
    } else {
        // Abrimos el modal inteligente para ajustar el tiempo extra / olvidado / agrupado
        setModalAjuste({
            isOpen: true,
            empId,
            fecha: rec.fecha,
            tipo: rec.tipo, // 'auditoria_turno'
            horasDetectadas: rec.horas,
            horasFinales: rec.horas
        });
    }
  };

  const confirmarModalAjuste = () => {
    const payload = JSON.stringify({ 
        estado: 'aprobado', 
        horasAprobadas: Number(modalAjuste.horasFinales) 
    });
    guardarAuditoria(modalAjuste.empId, modalAjuste.fecha, modalAjuste.tipo, payload);
    setModalAjuste({ ...modalAjuste, isOpen: false });
  };

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
                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Hrs Detectadas</th>
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
                                                    {rec.salida}
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

                    {/* ⚠️ SECCIÓN 3: ANOMALÍAS Y DECISIONES (AUDITORÍA) */}
                    {data.anomalas.length > 0 && (
                        <div>
                            <h4 className="text-lg font-black text-red-600 flex items-center gap-2 mb-4"><ShieldAlert className="text-red-500 print:text-black"/> 3. Auditoría de Anomalías Operativas</h4>
                            <div className="overflow-x-auto border border-red-100 rounded-2xl custom-scrollbar print:border-slate-300">
                                <table className="w-full text-left border-collapse bg-red-50/30">
                                    <thead className="bg-red-50 border-b border-red-100 print:bg-slate-100">
                                        <tr>
                                            <th className="p-3 text-[10px] font-black text-red-800 uppercase tracking-widest">Día / Fecha</th>
                                            <th className="p-3 text-[10px] font-black text-red-800 uppercase tracking-widest">Motivo de Alerta</th>
                                            <th className="p-3 text-[10px] font-black text-red-800 uppercase tracking-widest">M. Entrada</th>
                                            <th className="p-3 text-[10px] font-black text-red-800 uppercase tracking-widest">M. Salida</th>
                                            <th className="p-3 text-[10px] font-black text-red-800 uppercase tracking-widest text-right">Horas</th>
                                            <th className="p-3 text-[10px] font-black text-red-800 uppercase tracking-widest text-center print:hidden">Auditoría</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-50/50">
                                        {data.anomalas.map((rec, i) => {
                                            
                                            // Extraer lógica del estado parseado para saber si hay horas auditadas
                                            let estadoParsed = null;
                                            try {
                                                estadoParsed = JSON.parse(rec.estadoAuditoria);
                                            } catch(e) {
                                                estadoParsed = { estado: rec.estadoAuditoria };
                                            }
                                            
                                            const statusAprobacion = estadoParsed?.estado || 'pendiente';
                                            const hrsAprobadas = estadoParsed?.horasAprobadas;

                                            return (
                                                <tr key={i} className="hover:bg-red-50 transition print:text-sm">
                                                    <td className="p-3 font-bold text-red-900 w-32 shrink-0">{rec.dia} <span className="text-[10px] font-medium text-red-400 block">{rec.fecha}</span></td>
                                                    <td className="p-3 font-black text-red-600 text-xs leading-snug">{rec.motivo}</td>
                                                    <td className="p-3 font-black text-red-800 w-24">{rec.entrada}</td>
                                                    <td className="p-3 font-black text-red-800 w-28">
                                                        {rec.olvidoSalida ? <span className="text-[10px] uppercase text-orange-600">⚠️ {rec.salida}</span> : rec.salida}
                                                    </td>
                                                    <td className="p-3 font-black text-red-900 text-right w-20">{rec.horas}h</td>
                                                    
                                                    {/* BOTONES DE DECISIÓN DEL GERENTE */}
                                                    <td className="p-3 text-center print:hidden w-40">
                                                        {statusAprobacion === 'aprobado' ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-emerald-700 font-black text-[10px] uppercase tracking-widest bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm w-full">
                                                                    ✅ Aprobado
                                                                </span>
                                                                {hrsAprobadas !== undefined && (
                                                                    <span className="text-[9px] font-bold text-emerald-800 mt-1 bg-emerald-50 px-2 py-0.5 rounded w-full">Por {hrsAprobadas}h</span>
                                                                )}
                                                            </div>
                                                        ) : statusAprobacion === 'rechazado' ? (
                                                            <span className="text-red-700 font-black text-[10px] uppercase tracking-widest bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 shadow-sm block w-full">❌ Rechazado</span>
                                                        ) : (
                                                            <div className="flex flex-col xl:flex-row justify-center gap-1.5">
                                                                <button onClick={() => manejarClickAprobar(data.emp.id, rec)} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white px-2 py-1.5 rounded-lg text-[10px] font-black transition uppercase tracking-wider shadow-sm">Aprobar</button>
                                                                <button onClick={() => guardarAuditoria(data.emp.id, rec.fecha, rec.tipo, JSON.stringify({ estado: 'rechazado' }))} className="flex-1 bg-slate-200 text-slate-600 hover:bg-red-500 hover:text-white px-2 py-1.5 rounded-lg text-[10px] font-black transition uppercase tracking-wider shadow-sm">Rechazar</button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            ))
         )}
      </div>

      {/* 👇 MODAL INTELIGENTE DE AJUSTE DE HORAS */}
      {modalAjuste.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 flex flex-col items-center text-center border border-slate-200">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
               <Clock size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Ajuste de Horas</h3>
            <p className="text-sm font-medium text-slate-500 mb-6 px-2 leading-relaxed">
              El sistema detectó <b>{modalAjuste.horasDetectadas} horas</b> registradas en este turno anómalo. ¿Cuántas horas <u>reales</u> vas a autorizar para el cálculo de su pago?
            </p>
            
            <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-8">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 block">Horas a Aprobar</label>
              <input 
                 type="number" 
                 step="0.01"
                 min="0"
                 value={modalAjuste.horasFinales} 
                 onChange={e => setModalAjuste({...modalAjuste, horasFinales: e.target.value})}
                 className="w-full bg-white border border-slate-300 rounded-xl p-3 text-2xl font-black text-center text-slate-800 outline-none focus:border-blue-500 focus:ring-2 ring-blue-200 transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button 
                onClick={() => setModalAjuste({ ...modalAjuste, isOpen: false })} 
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-black uppercase tracking-wider text-xs rounded-xl hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarModalAjuste} 
                className="flex-1 py-3.5 bg-blue-600 text-white font-black uppercase tracking-wider text-xs rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

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