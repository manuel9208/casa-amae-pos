import React, { useState, useEffect, useMemo } from 'react';
import { Users, Filter, CheckSquare, Square, Store, Sun, Moon, Save, Palmtree, XCircle, CheckCircle2, History, Lock, AlertTriangle, ChevronLeft, ChevronRight, Clock, Copy } from 'lucide-react';
import io from 'socket.io-client';

const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const diasSemanaNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const GestorHorarios = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm, configGlobal }) => {
  const [mesActivo, setMesActivo] = useState(new Date().getMonth());
  const [yearActivo, setYearActivo] = useState(new Date().getFullYear());
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);
  const [filtroRolMasivo, setFiltroRolMasivo] = useState('');
  
  const [turnoMasivo, setTurnoMasivo] = useState('local');
  const [entradaMasiva, setEntradaMasiva] = useState('08:00');
  const [salidaMasiva, setSalidaMasiva] = useState('16:00');
  
  const [horariosTemp, setHorariosTemp] = useState({});
  const [horarioNegocio, setHorarioNegocio] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const limiteVacaciones = Number(configGlobal?.limite_vacaciones_simultaneas) || 2;

  useEffect(() => {
    if (configGlobal && configGlobal.horarios_semana) {
      try { setHorarioNegocio(typeof configGlobal.horarios_semana === 'string' ? JSON.parse(configGlobal.horarios_semana) : configGlobal.horarios_semana || {}); } catch (e) {}
    }
  }, [configGlobal]);

  useEffect(() => {
    if (turnoMasivo === 'manana') { setEntradaMasiva('08:00'); setSalidaMasiva('16:00'); }
    else if (turnoMasivo === 'tarde') { setEntradaMasiva('16:00'); setSalidaMasiva('23:00'); }
  }, [turnoMasivo]);

  const diasMes = useMemo(() => {
    const totalDays = new Date(yearActivo, mesActivo + 1, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(yearActivo, mesActivo, i + 1);
      return {
        num: i + 1,
        nombreBreve: diasSemana[d.getDay()],
        nombreCompleto: diasSemanaNombres[d.getDay()],
        fechaStr: `${yearActivo}-${String(mesActivo + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
      };
    });
  }, [mesActivo, yearActivo]);

  const empleadosVisibles = useMemo(() => usuariosDB.filter(u => u.nombre !== 'Administrador Global'), [usuariosDB]);
  const rolesDisponibles = useMemo(() => [...new Set(empleadosVisibles.map(u => u.rol))], [empleadosVisibles]);

  const empleadosFiltrados = useMemo(() => {
    return filtroRolMasivo ? empleadosVisibles.filter(u => u.rol === filtroRolMasivo) : empleadosVisibles;
  }, [empleadosVisibles, filtroRolMasivo]);

  const todosFiltradosSeleccionados = empleadosFiltrados.length > 0 && empleadosFiltrados.every(e => empleadosSeleccionados.includes(e.id));

  const toggleSeleccionMasiva = () => {
    if (todosFiltradosSeleccionados) {
      setEmpleadosSeleccionados(prev => prev.filter(id => !empleadosFiltrados.find(e => e.id === id)));
    } else {
      const nuevos = empleadosFiltrados.map(e => e.id).filter(id => !empleadosSeleccionados.includes(id));
      setEmpleadosSeleccionados(prev => [...prev, ...nuevos]);
    }
  };

  const empleadosTabla = useMemo(() => {
    return empleadosSeleccionados.length > 0 
      ? empleadosFiltrados.filter(e => empleadosSeleccionados.includes(e.id)) 
      : empleadosFiltrados;
  }, [empleadosFiltrados, empleadosSeleccionados]);

  const solicitudesPendientes = useMemo(() => {
    return usuariosDB.filter(u => {
      if (u.nombre === 'Administrador Global') return false;
      try {
        const pres = typeof u.prestaciones === 'string' ? JSON.parse(u.prestaciones) : (u.prestaciones || {});
        return pres?.solicitud_vacaciones?.estado === 'pendiente';
      } catch(e) { return false; }
    });
  }, [usuariosDB]);

  const detectarDiasSinPagar = (emp) => {
    const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
    let diasPendientes = 0;
    const hoyStrLocal = new Date().toISOString().split('T')[0];
    Object.keys(hor).forEach(fecha => {
      if (fecha < hoyStrLocal && hor[fecha].activo && !hor[fecha].pagado && !hor[fecha].vacaciones) diasPendientes++;
    });
    return diasPendientes;
  };

  const handleHorarioChange = (userId, fechaStr, campo, valor, configDiaGlobal, isPagado) => {
    if (isPagado) return;
    setHorariosTemp(prev => {
      const empPrev = prev[userId] || {};
      const diaPrev = empPrev[fechaStr] || {};
      let nuevosValores = { [campo]: valor };
      return { ...prev, [userId]: { ...empPrev, [fechaStr]: { ...diaPrev, ...nuevosValores } } };
    });
  };

  const handleHorarioChangeMultiple = (userId, fechaStr, valoresNuevos) => {
    setHorariosTemp(prev => {
      const empPrev = prev[userId] || {};
      const diaPrev = empPrev[fechaStr] || {};
      return { ...prev, [userId]: { ...empPrev, [fechaStr]: { ...diaPrev, ...valoresNuevos } } };
    });
  };

  const aplicarAsignacionMasiva = () => {
    if (empleadosSeleccionados.length === 0) return showAlert('Aviso', 'Selecciona al menos un empleado en el panel superior.', 'info');
    
    setHorariosTemp(prev => {
      const nuevosHorarios = { ...prev };
      
      empleadosSeleccionados.forEach(empId => {
        const emp = usuariosDB.find(u => u.id === empId);
        if (!emp) return;
        
        let diasNoLaborales = [];
        let diasDescanso = [];
        try {
          const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : (emp.prestaciones || {});
          diasNoLaborales = pres.dias_no_laborales || [];
          diasDescanso = pres.dias_descanso || [];
        } catch(e) {}

        const noLabNormalizado = diasNoLaborales.map(x => String(x).toLowerCase().trim());
        const descNormalizado = diasDescanso.map(x => String(x).toLowerCase().trim());
        
        const empPrev = nuevosHorarios[empId] || {};
        const horarioGuardado = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        
        diasMes.forEach(d => {
          const configDiaGlobal = horarioNegocio[d.nombreCompleto] || { activo: true, apertura: '08:00', cierre: '22:00' };
          const diaGuardado = horarioGuardado[d.fechaStr] || { pagado: false, vacaciones: false };
          const diaPrevInfo = empPrev[d.fechaStr] || diaGuardado;
          
          if (diaPrevInfo.pagado || diaPrevInfo.vacaciones) return;
          
          const nombreDiaLimpio = String(d.nombreCompleto).toLowerCase().trim();
          const negocioAbierto = configDiaGlobal.activo !== false && configDiaGlobal.activo !== "false";
          const esNoLaboral = noLabNormalizado.includes(nombreDiaLimpio);
          const esDescanso = descNormalizado.includes(nombreDiaLimpio);
          
          if (!negocioAbierto || esNoLaboral) {
            empPrev[d.fechaStr] = { ...diaPrevInfo, activo: false, es_descanso: false };
          } else if (esDescanso) {
            empPrev[d.fechaStr] = { ...diaPrevInfo, activo: false, es_descanso: true };
          } else {
            const horaEntradaFinal = turnoMasivo === 'local' ? (configDiaGlobal.apertura || '08:00') : entradaMasiva;
            const horaSalidaFinal = turnoMasivo === 'local' ? (configDiaGlobal.cierre || '22:00') : salidaMasiva;
            empPrev[d.fechaStr] = { ...diaPrevInfo, activo: true, es_descanso: false, entrada: horaEntradaFinal, salida: horaSalidaFinal };
          }
        });
        nuevosHorarios[empId] = empPrev;
      });
      return nuevosHorarios;
    });
    
    showAlert('¡Asignación Aplicada!', 'Horarios rellenados. Se respetaron automáticamente días cerrados, descansos y días no laborales.', 'success');
  };

  const duplicarSiguienteMes = () => {
    if (empleadosSeleccionados.length === 0) return showAlert('Aviso', 'Selecciona al menos un empleado en el filtro visual para duplicar su horario.', 'info');

    setHorariosTemp(prev => {
      const nuevosHorarios = { ...prev };
      
      let nextM = mesActivo + 1;
      let nextY = yearActivo;
      if (nextM > 11) {
        nextM = 0;
        nextY++;
      }
      const daysInNextMonth = new Date(nextY, nextM + 1, 0).getDate();

      empleadosSeleccionados.forEach(empId => {
        const emp = usuariosDB.find(u => u.id === empId);
        if (!emp) return;
        
        let diasNoLaborales = [];
        let diasDescanso = [];
        try {
          const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : (emp.prestaciones || {});
          diasNoLaborales = pres.dias_no_laborales || [];
          diasDescanso = pres.dias_descanso || [];
        } catch(e) {}

        const noLabNormalizado = diasNoLaborales.map(x => String(x).toLowerCase().trim());
        const descNormalizado = diasDescanso.map(x => String(x).toLowerCase().trim());

        const empPrev = nuevosHorarios[empId] || {};
        const empOriginal = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});

        for (let i = 1; i <= daysInNextMonth; i++) {
          const dNext = new Date(nextY, nextM, i);
          const targetDateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          const nombreDiaCompleto = diasSemanaNombres[dNext.getDay()];

          const currentMonthDay = diasMes.find(d => {
            const dCurr = new Date(yearActivo, mesActivo, d.num);
            return dCurr.getDay() === dNext.getDay();
          });

          if (currentMonthDay) {
            const sourceDateStr = currentMonthDay.fechaStr;
            const sourceData = empPrev[sourceDateStr] !== undefined ? empPrev[sourceDateStr] : (empOriginal[sourceDateStr] || { activo: false, es_descanso: false });
            
            const targetOriginal = empOriginal[targetDateStr] || {};
            if (!targetOriginal.pagado && !targetOriginal.vacaciones) {
              
              const nombreDiaLimpio = String(nombreDiaCompleto).toLowerCase().trim();
              const configDiaGlobal = horarioNegocio[nombreDiaCompleto] || { activo: true };
              const negocioAbierto = configDiaGlobal.activo !== false && configDiaGlobal.activo !== "false";
              const esNoLaboral = noLabNormalizado.includes(nombreDiaLimpio);
              const esDescanso = descNormalizado.includes(nombreDiaLimpio);

              if (!negocioAbierto || esNoLaboral) {
                empPrev[targetDateStr] = { ...targetOriginal, activo: false, es_descanso: false };
              } else if (esDescanso) {
                empPrev[targetDateStr] = { ...targetOriginal, activo: false, es_descanso: true };
              } else {
                empPrev[targetDateStr] = {
                  ...targetOriginal,
                  activo: sourceData.activo,
                  es_descanso: false,
                  entrada: sourceData.entrada,
                  salida: sourceData.salida
                };
              }
            }
          }
        }
        nuevosHorarios[empId] = empPrev;
      });
      return nuevosHorarios;
    });

    showAlert('¡Patrón Duplicado!', 'Horarios y descansos copiados al mes siguiente respetando los cierres y reglas laborales. Cambia de mes y presiona Guardar.', 'success');
  };

  const guardarCambiosHorarios = async () => {
    if (Object.keys(horariosTemp).length === 0) return showAlert('Aviso', 'No hay cambios pendientes.', 'info');
    setIsSubmitting(true);
    try {
      const promesas = Object.keys(horariosTemp).map(empId => {
        const emp = usuariosDB.find(u => String(u.id) === String(empId));
        if (!emp) return null;
        const original = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        const nuevoHorario = { ...original, ...horariosTemp[empId] };
        return fetch(`${apiUrl}/usuarios/${empId}/horario`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ horario_semanal: nuevoHorario })
        });
      });
      await Promise.all(promesas.filter(Boolean));
      setHorariosTemp({});
      const socket = io(apiUrl.replace('/api', ''), { transports: ['websocket'] });
      socket.emit('horarios_actualizados');
      socket.disconnect();
      showAlert('Éxito', 'Los horarios se han guardado correctamente.', 'success');
      if (refrescarDatos) refrescarDatos();
    } catch (error) {
      showAlert('Error', 'Hubo un problema al guardar los horarios.', 'error');
    }
    setIsSubmitting(false);
  };

  const responderVacaciones = (emp, estado) => {
    const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : emp.prestaciones;
    const fechasSolicitadas = pres?.solicitud_vacaciones?.fechas || [];
    
    if (estado === 'aprobada') {
      if (limiteVacaciones <= 0) {
        return showConfirm("⚠️ Límite en Cero", "No tienes permitido aprobar ausencias múltiples en este momento. ¿Aprobar de todos modos?", () => procesarAprobacionDefinitiva(emp, pres, 'aprobada', fechasSolicitadas));
      }
      
      let colisiones = [];
      fechasSolicitadas.forEach(fechaStr => {
        let enVacaciones = 0;
        empleadosVisibles.forEach(u => {
          if (u.id === emp.id) return;
          const h = typeof u.horario_semanal === 'string' ? JSON.parse(u.horario_semanal||'{}') : (u.horario_semanal||{});
          if (h[fechaStr]?.vacaciones) enVacaciones++;
        });
        if (enVacaciones >= limiteVacaciones) colisiones.push({ fecha: fechaStr, cantidad: enVacaciones });
      });
      
      if (colisiones.length > 0) {
        const msg = colisiones.map(c => `${c.fecha} (Faltarán ${c.cantidad} personas)`).join('\n');
        return showConfirm("⚠️ Límite de Ausencias Excedido", `Tu límite es de ${limiteVacaciones} personas ausentes.\nPara los siguientes días, el límite se rompería:\n\n${msg}\n\n¿Estás completamente seguro de aprobar estas vacaciones y quedarte sin personal?`, () => procesarAprobacionDefinitiva(emp, pres, 'aprobada', fechasSolicitadas));
      }
    }
    procesarAprobacionDefinitiva(emp, pres, estado, fechasSolicitadas);
  };

  const procesarAprobacionDefinitiva = async (emp, pres, estado, fechasSolicitadas) => {
    setIsSubmitting(true);
    try {
      pres.solicitud_vacaciones.estado = estado;
      if (estado === 'aprobada') {
        pres.dias_vacaciones_usados = (Number(pres.dias_vacaciones_usados) || 0) + Number(pres.solicitud_vacaciones.dias_solicitados || 0);
        const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal) : (emp.horario_semanal || {});
        fechasSolicitadas.forEach(dStr => {
          if (!hor[dStr]) hor[dStr] = {};
          hor[dStr] = { activo: true, es_descanso: false, vacaciones: true, pagado: true, entrada: '00:00', salida: '00:00' };
        });
        await fetch(`${apiUrl}/usuarios/${emp.id}/horario`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ horario_semanal: hor }) });
      }
      await fetch(`${apiUrl}/usuarios/${emp.id}/prestaciones`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prestaciones: pres }) });
      const socket = io(apiUrl.replace('/api', ''), { transports: ['websocket'] });
      socket.emit('horarios_actualizados');
      socket.disconnect();
      showAlert("Resuelto", `La solicitud ha sido ${estado}.`, "success");
      refrescarDatos();
    } catch(e) { showAlert("Error", "Error al procesar vacaciones.", "error"); }
    setIsSubmitting(false);
  };

  const obtenerRangoFechas = (inicioStr, finStr) => {
    const fechas = [];
    let actual = new Date(inicioStr + 'T00:00:00');
    const fin = new Date(finStr + 'T00:00:00');
    while (actual <= fin) {
      fechas.push(`${actual.getFullYear()}-${String(actual.getMonth() + 1).padStart(2, '0')}-${String(actual.getDate()).padStart(2, '0')}`);
      actual.setDate(actual.getDate() + 1);
    }
    return fechas;
  };

  const realizarCorteNómina = async () => {
    if (!fechaDesde || !fechaHasta) return showAlert("Aviso", "Selecciona el rango de fechas para el corte.", "info");
    if (fechaDesde > fechaHasta) return showAlert("Aviso", "La fecha 'Desde' no puede ser mayor que la fecha 'Hasta'.", "warning");
    
    const fechasRango = obtenerRangoFechas(fechaDesde, fechaHasta);
    showConfirm("Corte Parcial", `Se procesará el corte desde el ${fechaDesde} hasta el ${fechaHasta}. Los días laborados se marcarán como PAGADOS y se bloquearán para que ya no puedan ser modificados ni vueltos a pagar.`, async () => {
      setIsSubmitting(true);
      try {
        const promesas = empleadosVisibles.map(emp => {
          const horOriginal = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
          let huboCambio = false;
          fechasRango.forEach(f => {
            if (horOriginal[f] && horOriginal[f].activo && !horOriginal[f].pagado) {
              horOriginal[f].pagado = true;
              huboCambio = true;
            }
          });
          if (huboCambio) {
            return fetch(`${apiUrl}/usuarios/${emp.id}/horario`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ horario_semanal: horOriginal }) });
          }
          return null;
        });
        await Promise.all(promesas.filter(Boolean));
        showAlert("Éxito", "Corte aplicado. Los días han sido marcados como pagados y bloqueados.", "success");
        if (refrescarDatos) refrescarDatos();
      } catch (error) { showAlert("Error", "Ocurrió un error al aplicar el corte.", "error"); }
      setIsSubmitting(false);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      <style>{`
        .scroll-horarios::-webkit-scrollbar { height: 16px; }
        .scroll-horarios::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 12px; }
        .scroll-horarios::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 12px; border: 3px solid #f1f5f9; }
        .scroll-horarios::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>

      {solicitudesPendientes.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 p-6 md:p-8 rounded-[32px] shadow-lg mb-8 animate-in zoom-in-95">
          <h3 className="text-xl font-black text-amber-900 flex items-center gap-2 mb-6"><Palmtree/> Solicitudes de Vacaciones Pendientes</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {solicitudesPendientes.map(emp => {
              const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : emp.prestaciones;
              const sol = pres.solicitud_vacaciones;
              const diasTotales = Number(pres.dias_vacaciones_disponibles) || 12;
              const diasUsados = Number(pres.dias_vacaciones_usados) || 0;
              const diasRestantes = Math.max(0, diasTotales - diasUsados);
              const fechasFormat = (sol.fechas || []).map(f => { const [,m,d] = f.split('-'); return `${d}/${m}`; }).join(', ');
              
              return (
                <div key={emp.id} className="bg-white p-6 rounded-3xl border border-amber-200 shadow-sm flex flex-col justify-between">
                  <div className="mb-4">
                    <p className="font-black text-lg text-slate-800">{emp.nombre}</p>
                    <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest bg-amber-100 w-fit px-2 py-1 rounded-md mt-1 leading-snug max-w-full">
                      DÍAS: {fechasFormat}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pide:</p>
                        <p className="text-lg font-black text-slate-700">{sol.dias_solicitados} días</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disponibles:</p>
                        <p className={`text-lg font-black ${sol.dias_solicitados > diasRestantes ? 'text-red-500' : 'text-emerald-500'}`}>{diasRestantes} días</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mt-4 italic">"{sol.motivo}"</p>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={isSubmitting} onClick={() => responderVacaciones(emp, 'rechazada')} className="flex-1 bg-red-50 text-red-600 hover:bg-red-50 hover:text-red-700 py-3 rounded-xl font-black text-xs uppercase transition border border-red-200"><XCircle size={16} className="mx-auto"/></button>
                    <button disabled={isSubmitting || sol.dias_solicitados > diasRestantes} onClick={() => responderVacaciones(emp, 'aprobada')} className="flex-[3] bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-black text-sm uppercase transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none"><CheckCircle2 size={18}/> Aprobar y Evaluar Colisiones</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 p-6 md:p-8 rounded-[32px] shadow-sm flex flex-col xl:flex-row gap-8 items-start xl:items-center w-full max-w-full print:hidden">
        
        <div className="flex-1 w-full border-b xl:border-b-0 xl:border-r border-blue-200 pb-6 xl:pb-0 xl:pr-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h3 className="font-black text-blue-900 flex items-center gap-2"><Users size={20}/> Selección Múltiple</h3>
            <button onClick={toggleSeleccionMasiva} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm whitespace-nowrap">
              {todosFiltradosSeleccionados ? `Desmarcar ${filtroRolMasivo ? filtroRolMasivo : 'Todos'}` : `Marcar ${filtroRolMasivo ? filtroRolMasivo : 'Todos'}`}
            </button>
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2 items-center">
            <Filter size={14} className="text-blue-400 shrink-0 mr-1"/>
            <button onClick={() => setFiltroRolMasivo('')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all whitespace-nowrap shadow-sm ${!filtroRolMasivo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}>Todos</button>
            {rolesDisponibles.map(rol => (
              <button key={rol} onClick={() => setFiltroRolMasivo(rol)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all whitespace-nowrap shadow-sm ${filtroRolMasivo === rol ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}>{rol}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
            {empleadosFiltrados.map(emp => {
              const seleccionado = empleadosSeleccionados.includes(emp.id);
              return (
                <button key={emp.id} onClick={() => setEmpleadosSeleccionados(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id])} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all border ${seleccionado ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                  {seleccionado ? <CheckSquare size={14}/> : <Square size={14}/>} {emp.nombre}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 w-full">
          <div className="flex flex-col lg:flex-row flex-wrap gap-4 items-center">
            <div className="bg-white p-2 rounded-2xl flex flex-wrap w-full lg:w-auto border border-blue-200 shadow-sm">
              <button onClick={() => setTurnoMasivo('local')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all ${turnoMasivo === 'local' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}`}><Store size={14}/> Hr. Local</button>
              <button onClick={() => setTurnoMasivo('manana')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all ${turnoMasivo === 'manana' ? 'bg-orange-100 text-orange-700' : 'text-slate-400 hover:bg-slate-50'}`}><Sun size={14}/> Mañana</button>
              <button onClick={() => setTurnoMasivo('tarde')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all ${turnoMasivo === 'tarde' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}><Moon size={14}/> Tarde</button>
            </div>
            
            <div className={`flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-blue-200 shadow-sm w-full lg:w-auto justify-center transition-all ${turnoMasivo === 'local' ? 'opacity-50 pointer-events-none' : ''}`}>
              <Clock size={14} className="text-slate-400"/>
              <input type="time" value={entradaMasiva} onChange={e=>setEntradaMasiva(e.target.value)} className="bg-slate-100 border border-slate-200 rounded-lg p-1.5 text-xs font-black outline-none focus:border-blue-400"/>
              <span className="text-xs font-bold text-slate-400">-</span>
              <input type="time" value={salidaMasiva} onChange={e=>setSalidaMasiva(e.target.value)} className="bg-slate-100 border border-slate-200 rounded-lg p-1.5 text-xs font-black outline-none focus:border-blue-400"/>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full">
            <button onClick={aplicarAsignacionMasiva} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2">
              Rellenar Horario Mes
            </button>
            <button onClick={duplicarSiguienteMes} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-md shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2" title="Copia el patrón de días al mes próximo">
              <Copy size={16}/> Duplicar Sig. Mes
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[32px] border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => { setMesActivo(m => m === 0 ? 11 : m - 1); if(mesActivo===0) setYearActivo(y=>y-1); }} className="p-2 hover:bg-white rounded-xl text-slate-600 transition shadow-sm"><ChevronLeft size={20}/></button>
          <select value={mesActivo} onChange={e => setMesActivo(Number(e.target.value))} className="bg-transparent font-black text-xl px-2 outline-none cursor-pointer">
            {mesesNombres.map((m,i)=><option key={m} value={i}>{m}</option>)}
          </select>
          <button onClick={() => { setMesActivo(m => m === 11 ? 0 : m + 1); if(mesActivo===11) setYearActivo(y=>y+1); }} className="p-2 hover:bg-white rounded-xl text-slate-600 transition shadow-sm"><ChevronRight size={20}/></button>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => setYearActivo(y=>y-1)} className="p-2 hover:bg-white rounded-xl text-slate-600 transition shadow-sm"><ChevronLeft size={20}/></button>
          <span className="font-black text-xl px-4">{yearActivo}</span>
          <button onClick={() => setYearActivo(y=>y+1)} className="p-2 hover:bg-white rounded-xl text-slate-600 transition shadow-sm"><ChevronRight size={20}/></button>
        </div>
        
        <button disabled={isSubmitting} onClick={guardarCambiosHorarios} className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-3.5 rounded-2xl font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
          <Save size={18}/> Guardar Cambios Manuales
        </button>
      </div>

      <div className="w-full overflow-x-auto bg-white rounded-[32px] border border-slate-200 shadow-sm scroll-horarios max-w-full pb-4">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.03)] z-20">Empleado</th>
              {diasMes.map(d => (
                <th key={d.fechaStr} className="p-3 text-center border-l border-slate-200 min-w-[140px]">
                  <div className={`text-xs font-black p-2 rounded-xl ${d.nombreBreve.startsWith('S') || d.nombreBreve.startsWith('D') ? 'bg-red-100 text-red-600' : 'bg-white text-slate-600 border border-slate-200 shadow-sm'}`}>
                    {d.num} <span className="block mt-0.5 text-[9px] uppercase tracking-widest">{d.nombreBreve}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {empleadosTabla.map(emp => {
              const cambiosEmp = horariosTemp[emp.id] || {};
              const horBD = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
              const diasSinPagar = detectarDiasSinPagar(emp);

              let diasNoLaborales = [];
              try {
                const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : (emp.prestaciones || {});
                diasNoLaborales = pres.dias_no_laborales || [];
              } catch(e) {}

              const noLabNormalizado = diasNoLaborales.map(x => String(x).toLowerCase().trim());

              return (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-5 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-10 group-hover:bg-slate-50 border-r border-slate-100">
                    <p className="font-black text-slate-800 text-sm whitespace-nowrap">{emp.nombre}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{emp.rol}</p>
                    {diasSinPagar > 0 && (
                      <div className="mt-2 flex items-start gap-1 bg-red-50 border border-red-200 p-1.5 rounded-lg text-red-600 animate-pulse">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5"/>
                        <span className="text-[9px] font-black uppercase tracking-widest leading-tight">Deuda atrasada:<br/>{diasSinPagar} Días sin pagar</span>
                      </div>
                    )}
                  </td>
                  {diasMes.map(d => {
                    const horDef = cambiosEmp[d.fechaStr] !== undefined ? cambiosEmp[d.fechaStr] : horBD[d.fechaStr];
                    const activo = horDef?.activo || false;
                    const isDescanso = horDef?.es_descanso || false; 
                    const isVacaciones = horDef?.vacaciones || false;
                    const isPagado = horDef?.pagado || false;
                    const configDiaGlobal = horarioNegocio[d.nombreCompleto] || { activo: true, apertura: '08:00', cierre: '22:00' };
                    
                    const nombreDiaLimpio = String(d.nombreCompleto).toLowerCase().trim();
                    const esNoLaboral = noLabNormalizado.includes(nombreDiaLimpio);

                    let btnText = 'No Laboral';
                    let btnClass = 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200';
                    
                    if (activo) {
                      btnText = 'Trabaja';
                      btnClass = 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200';
                    } else if (isDescanso) {
                      btnText = 'Descanso';
                      btnClass = 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 shadow-sm';
                    }

                    const cycleState = () => {
                      if (isPagado || isVacaciones) return;
                      
                      const negocioAbierto = configDiaGlobal.activo !== false && configDiaGlobal.activo !== "false";
                      
                      if (!negocioAbierto) {
                        showAlert('Local Cerrado', `El restaurante no labora en ${d.nombreCompleto} según la Configuración Global.`, 'info');
                        handleHorarioChange(emp.id, d.fechaStr, 'activo', false, configDiaGlobal, isPagado);
                        handleHorarioChange(emp.id, d.fechaStr, 'es_descanso', false, configDiaGlobal, isPagado);
                        return;
                      }

                      if (esNoLaboral) {
                        showAlert('Día Inhabilitado', `${emp.nombre} tiene marcado el ${d.nombreCompleto} como NO LABORAL en su configuración de nómina.`, 'info');
                        handleHorarioChange(emp.id, d.fechaStr, 'activo', false, configDiaGlobal, isPagado);
                        handleHorarioChange(emp.id, d.fechaStr, 'es_descanso', false, configDiaGlobal, isPagado);
                        return;
                      }

                      if (activo) {
                        handleHorarioChangeMultiple(emp.id, d.fechaStr, { activo: false, es_descanso: true });
                      } else if (isDescanso) {
                        handleHorarioChangeMultiple(emp.id, d.fechaStr, { activo: false, es_descanso: false });
                      } else {
                        handleHorarioChangeMultiple(emp.id, d.fechaStr, {
                          activo: true,
                          es_descanso: false,
                          entrada: horDef?.entrada || configDiaGlobal.apertura || '08:00',
                          salida: horDef?.salida || configDiaGlobal.cierre || '22:00'
                        });
                      }
                    };

                    return (
                      <td key={d.fechaStr} className={`p-2 border-r border-slate-100 align-top ${isVacaciones ? 'bg-amber-50/50' : !activo ? 'bg-slate-50/50' : ''}`}>
                        {isPagado ? (
                          <div className="flex flex-col items-center justify-center p-3 h-full rounded-xl bg-slate-50 border border-slate-200/50 opacity-80">
                            <Lock size={14} className="text-slate-400 mb-1" />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Nómina<br/>Pagada</span>
                          </div>
                        ) : isVacaciones ? (
                          <div className="flex flex-col items-center justify-center p-3 h-full rounded-xl bg-amber-50 border border-amber-200">
                            <Palmtree size={16} className="text-amber-500 mb-1" />
                            <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest text-center">En<br/>Vacaciones</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={cycleState}
                              className={`w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border ${btnClass}`}
                            >
                              {btnText}
                            </button>
                            {activo && (
                              <div className="flex flex-col gap-1 opacity-100 transition-opacity">
                                <input type="time" value={horDef.entrada || configDiaGlobal.apertura || '08:00'} onChange={e => handleHorarioChange(emp.id, d.fechaStr, 'entrada', e.target.value, configDiaGlobal, false)} className="w-full text-center p-1.5 text-xs font-black bg-white border border-slate-200 rounded-md outline-none focus:border-blue-400 shadow-sm" />
                                <input type="time" value={horDef.salida || configDiaGlobal.cierre || '22:00'} onChange={e => handleHorarioChange(emp.id, d.fechaStr, 'salida', e.target.value, configDiaGlobal, false)} className="w-full text-center p-1.5 text-xs font-black bg-white border border-slate-200 rounded-md outline-none focus:border-blue-400 shadow-sm" />
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-900 p-6 md:p-8 rounded-[32px] shadow-xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 w-full max-w-full mt-8">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <History className="text-emerald-400" /> Corte de Horarios
          </h3>
          <p className="text-slate-400 text-xs mt-1 font-medium max-w-xl">
            Extraerá las horas trabajadas en el rango seleccionado. <span className="text-emerald-300 font-bold">Los días procesados se bloquearán 🔒 y ya no podrán ser pagados dos veces.</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full sm:w-auto bg-slate-800 text-white border border-slate-700 p-3 rounded-xl outline-none focus:border-emerald-500 font-black text-sm" style={{ colorScheme: 'dark' }} />
          <span className="text-slate-500 font-black text-xs hidden sm:block">A</span>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full sm:w-auto bg-slate-800 text-white border border-slate-700 p-3 rounded-xl outline-none focus:border-emerald-500 font-black text-sm" style={{ colorScheme: 'dark' }} />
          
          <button disabled={isSubmitting} onClick={realizarCorteNómina} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 active:scale-95 whitespace-nowrap disabled:opacity-50">
            Cerrar Rango y Bloquear
          </button>
        </div>
      </div>
    </div>
  );
};

export default GestorHorarios;