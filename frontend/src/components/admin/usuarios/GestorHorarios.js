import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckSquare, Square, Filter, Users, Sun, Moon, Store, Palmtree, XCircle, CheckCircle2, Lock, AlertTriangle, ChefHat, Clock, History } from 'lucide-react';
import io from 'socket.io-client';

const diasSemanaMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const GestorHorarios = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm, configGlobal }) => {
  const hoy = new Date();
  
  // 👇 NUEVOS ESTADOS: Selector de Año y Mes Anual
  const [yearFiltro, setYearFiltro] = useState(hoy.getFullYear());
  const [mesFiltro, setMesFiltro] = useState(hoy.getMonth() + 1);
  
  const [horariosTemp, setHorariosTemp] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [horarioNegocio, setHorarioNegocio] = useState({});
  
  // ESTADOS PARA EL PANEL DE ASIGNACIÓN MASIVA
  const [turnoMasivo, setTurnoMasivo] = useState('local');
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);
  const [entradaMasiva, setEntradaMasiva] = useState('08:00');
  const [salidaMasiva, setSalidaMasiva] = useState('16:00');
  const [filtroRolMasivo, setFiltroRolMasivo] = useState('');

  // ESTADOS PARA EL CORTE PARCIAL (Recuperados)
  const strHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const strPrimerDiaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
  const [fechaDesde, setFechaDesde] = useState(strPrimerDiaMes);
  const [fechaHasta, setFechaHasta] = useState(strHoy);

  // Calculador dinámico de días del mes según Año y Mes seleccionado
  const daysInMonth = new Date(yearFiltro, mesFiltro, 0).getDate();
  const diasMes = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(yearFiltro, mesFiltro - 1, i + 1);
    return {
      num: i + 1,
      nombreBreve: d.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase(),
      nombreCompleto: diasSemanaMap[d.getDay()],
      fechaStr: `${yearFiltro}-${String(mesFiltro).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    };
  });

  const empleadosVisibles = usuariosDB.filter(u => u.rol !== 'tv' && u.nombre !== 'Administrador Global').sort((a, b) => a.nombre.localeCompare(b.nombre));

  const solicitudesPendientes = empleadosVisibles.filter(u => {
    try {
      const pres = typeof u.prestaciones === 'string' ? JSON.parse(u.prestaciones) : (u.prestaciones || {});
      return pres.solicitud_vacaciones && pres.solicitud_vacaciones.estado === 'pendiente';
    } catch(e) { return false; }
  });

  // Extracción del Calendario Global
  const calendarioAnual = typeof configGlobal?.calendario_anual === 'string' 
    ? JSON.parse(configGlobal.calendario_anual || '{}') 
    : (configGlobal?.calendario_anual || {});
    
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

  // 👇 MOTOR INTELIGENTE: Escáner de Días sin Pagar (Busca en toda la vida del empleado)
  const detectarDiasSinPagar = (emp) => {
    const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
    let diasPendientes = 0;
    const hoyStrLocal = new Date().toISOString().split('T')[0];
    Object.keys(hor).forEach(fecha => {
      if (fecha < hoyStrLocal && hor[fecha].activo && !hor[fecha].pagado && !hor[fecha].vacaciones) {
        diasPendientes++;
      }
    });
    return diasPendientes;
  };

  const handleHorarioChange = (userId, fechaStr, campo, valor, configDiaGlobal, isPagado) => {
    if (isPagado) return;
    setHorariosTemp(prev => {
      const empPrev = prev[userId] || {};
      const diaPrev = empPrev[fechaStr] || {};
      let nuevosValores = { [campo]: valor };
      if (campo === 'activo' && valor === true) {
        nuevosValores.entrada = diaPrev.entrada || configDiaGlobal.apertura || '08:00';
        nuevosValores.salida = diaPrev.salida || configDiaGlobal.cierre || '22:00';
      }
      return { ...prev, [userId]: { ...empPrev, [fechaStr]: { ...diaPrev, ...nuevosValores } } };
    });
  };

  const aplicarAsignacionMasiva = () => {
    if (empleadosSeleccionados.length === 0) return showAlert('Aviso', 'Selecciona al menos un empleado en el panel superior.', 'info');
    
    setHorariosTemp(prev => {
      const nuevosHorarios = { ...prev };
      
      empleadosSeleccionados.forEach(empId => {
        const emp = usuariosDB.find(u => u.id === empId);
        if (!emp) return;
        
        let diasDescanso = [];
        try {
          const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : (emp.prestaciones || {});
          diasDescanso = pres.dias_descanso || [];
        } catch(e) {}
        
        const empPrev = nuevosHorarios[empId] || {};
        const horarioGuardado = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        
        diasMes.forEach(d => {
          const configDiaGlobal = horarioNegocio[d.nombreCompleto] || { activo: true, apertura: '08:00', cierre: '22:00' };
          const diaGuardado = horarioGuardado[d.fechaStr] || { pagado: false, vacaciones: false };
          const diaPrevInfo = empPrev[d.fechaStr] || diaGuardado;
          
          if (diaPrevInfo.pagado || diaPrevInfo.vacaciones) return;
          
          const esDescanso = diasDescanso.includes(d.nombreCompleto);
          const negocioAbierto = configDiaGlobal.activo !== false;
          
          if (!negocioAbierto || esDescanso) {
            empPrev[d.fechaStr] = { ...diaPrevInfo, activo: false };
          } else {
            const horaEntradaFinal = turnoMasivo === 'local' ? (configDiaGlobal.apertura || '08:00') : entradaMasiva;
            const horaSalidaFinal = turnoMasivo === 'local' ? (configDiaGlobal.cierre || '22:00') : salidaMasiva;
            empPrev[d.fechaStr] = { ...diaPrevInfo, activo: true, entrada: horaEntradaFinal, salida: horaSalidaFinal };
          }
        });
        nuevosHorarios[empId] = empPrev;
      });
      return nuevosHorarios;
    });
    
    showAlert('¡Asignación Lista!', `Se aplicó el horario. Presiona Guardar Cambios para confirmar.`, 'success');
    setEmpleadosSeleccionados([]);
  };

  const guardarHorarios = async () => {
    if (Object.keys(horariosTemp).length === 0) return showAlert('Aviso', 'No hay cambios que guardar.', 'info');
    setIsSubmitting(true);
    try {
      await Promise.all(Object.entries(horariosTemp).map(async ([userId, cambiosFechas]) => {
        const emp = usuariosDB.find(u => u.id === Number(userId));
        const horarioActual = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        return fetch(`${apiUrl}/usuarios/${userId}/horario`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ horario_semanal: { ...horarioActual, ...cambiosFechas } }) });
      }));
      
      const socket = io(apiUrl.replace('/api', ''), { transports: ['websocket'] });
      socket.emit('horarios_actualizados');
      socket.disconnect();

      showAlert('¡Éxito!', 'Los horarios han sido guardados.', 'success');
      setHorariosTemp({}); 
      refrescarDatos();
    } catch (error) { showAlert('Error', 'Problema de conexión.', 'error'); }
    setIsSubmitting(false);
  };

  // 👇 MOTOR DE COLISIONES DE VACACIONES Y REGLAS DE BLOQUEO
  const responderVacaciones = async (emp, estado) => {
    const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : (emp.prestaciones || {});
    const fechasSolicitadas = pres.solicitud_vacaciones?.fechas || [];

    if (estado === 'aprobada') {
      const diasBloqueados = fechasSolicitadas.filter(f => calendarioAnual[f]?.tipo === 'bloqueado');
      if (diasBloqueados.length > 0) {
        return showAlert("Acción Denegada 🔒", `El administrador bloqueó las vacaciones para las siguientes fechas: ${diasBloqueados.join(', ')}. \nRechaza esta solicitud.`, "error");
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
        return showConfirm(
          "⚠️ Límite de Ausencias Excedido", 
          `Tu límite es de ${limiteVacaciones} personas ausentes.\nPara los siguientes días, el límite se rompería:\n\n${msg}\n\n¿Estás completamente seguro de aprobar estas vacaciones y quedarte sin personal?`, 
          () => procesarAprobacionDefinitiva(emp, pres, 'aprobada', fechasSolicitadas)
        );
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
          hor[dStr] = { activo: true, vacaciones: true, pagado: true, entrada: '00:00', salida: '00:00' };
        });
        
        await fetch(`${apiUrl}/usuarios/${emp.id}/horario`, {
          method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ horario_semanal: hor })
        });
      }

      await fetch(`${apiUrl}/usuarios/${emp.id}/prestaciones`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prestaciones: pres })
      });

      const socket = io(apiUrl.replace('/api', ''), { transports: ['websocket'] });
      socket.emit('horarios_actualizados');
      socket.disconnect();

      showAlert("Resuelto", `La solicitud ha sido ${estado}.`, "success");
      refrescarDatos();
    } catch(e) { showAlert("Error", "Error al procesar vacaciones.", "error"); }
    setIsSubmitting(false);
  };

  // FUNCIONES DE CORTE (RECUPERADAS)
  const obtenerRangoFechas = (inicioStr, finStr) => {
    const fechas = [];
    let actual = new Date(inicioStr + 'T00:00:00');
    const fin = new Date(finStr + 'T00:00:00');
    while (actual <= fin) {
      const yyyy = actual.getFullYear();
      const mm = String(actual.getMonth() + 1).padStart(2, '0');
      const dd = String(actual.getDate()).padStart(2, '0');
      fechas.push(`${yyyy}-${mm}-${dd}`);
      actual.setDate(actual.getDate() + 1);
    }
    return fechas;
  };

  const realizarCorteNómina = async () => {
    if (!fechaDesde || !fechaHasta) return showAlert("Aviso", "Selecciona el rango de fechas para el corte.", "info");
    if (fechaDesde > fechaHasta) return showAlert("Aviso", "La fecha 'Desde' no puede ser mayor que la fecha 'Hasta'.", "warning");

    const fechasRango = obtenerRangoFechas(fechaDesde, fechaHasta);

    showConfirm(
      "Corte Parcial",
      `Se procesará el corte desde el ${fechaDesde} hasta el ${fechaHasta}. Los días laborados se marcarán como PAGADOS y se bloquearán para que ya no puedan ser modificados ni vueltos a pagar.`,
      async () => {
        setIsSubmitting(true);
        try {
          const resConfig = await fetch(`${apiUrl}/configuracion`);
          const dataConfig = await resConfig.json();
          const matriz = typeof dataConfig.matriz_limpieza === 'string' ? JSON.parse(dataConfig.matriz_limpieza || '{}') : (dataConfig.matriz_limpieza || {});
          const evaluaciones = matriz.evaluaciones || {};

          const datosCorte = empleadosVisibles.map(emp => {
            const h = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
            const diasNuevosPagados = fechasRango.filter(fechaStr => h[fechaStr]?.activo && !h[fechaStr]?.pagado).length;

            let limpiezasCumplidas = 0, limpiezasIncumplidas = 0, limpiezaDetalle = {};

            Object.keys(evaluaciones).forEach(area => {
              Object.keys(evaluaciones[area]).forEach(diaStr => {
                if (diaStr >= fechaDesde && diaStr <= fechaHasta && String(matriz.asignaciones?.[area]?.[diaStr]) === String(emp.id)) {
                  const status = evaluaciones[area][diaStr];
                  if (status === 'cumplio') limpiezasCumplidas++;
                  if (status === 'no_cumplio') limpiezasIncumplidas++;
                  if (!limpiezaDetalle[diaStr]) limpiezaDetalle[diaStr] = [];
                  limpiezaDetalle[diaStr].push({ area, status });
                }
              });
            });

            return {
              id: emp.id, nombre: emp.nombre, rol: emp.rol, dias_trabajados: diasNuevosPagados, horario: h,
              limpieza: { cumplidas: limpiezasCumplidas, incumplidas: limpiezasIncumplidas, detalle: limpiezaDetalle }
            };
          });

          await Promise.all(datosCorte.map(async (data) => {
            if (data.dias_trabajados > 0) {
              const nuevosHorarios = { ...data.horario };
              fechasRango.forEach(fechaStr => {
                if (nuevosHorarios[fechaStr] && nuevosHorarios[fechaStr].activo) {
                  nuevosHorarios[fechaStr].pagado = true;
                }
              });
              await fetch(`${apiUrl}/usuarios/${data.id}/horario`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ horario_semanal: nuevosHorarios })
              });
            }
          }));

          showAlert("¡Éxito!", `Se han procesado y bloqueado las horas del rango seleccionado.`, "success");
          refrescarDatos();
        } catch (error) {
          showAlert("Error", "Error al procesar el corte.", "error");
        }
        setIsSubmitting(false);
      }
    );
  };

  const rolesDisponibles = [...new Set(empleadosVisibles.map(e => e.rol))];
  const empleadosFiltrados = filtroRolMasivo ? empleadosVisibles.filter(e => e.rol === filtroRolMasivo) : empleadosVisibles;
  const todosFiltradosSeleccionados = empleadosFiltrados.length > 0 && empleadosFiltrados.every(e => empleadosSeleccionados.includes(e.id));

  const toggleSeleccionMasiva = () => {
    if (todosFiltradosSeleccionados) {
      setEmpleadosSeleccionados(prev => prev.filter(id => !empleadosFiltrados.find(e => e.id === id)));
    } else {
      const nuevosIds = empleadosFiltrados.map(e => e.id);
      setEmpleadosSeleccionados(prev => [...new Set([...prev, ...nuevosIds])]);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      
      {/* 👇 SELECTOR DE AÑO Y MES */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4 print:hidden">
        <div>
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Calendar className="text-purple-600"/> Calendario Operativo</h3>
          <p className="text-sm font-bold text-slate-500 mt-1">Selecciona el mes a programar.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-2xl border border-slate-200">
          <select value={mesFiltro} onChange={e => setMesFiltro(Number(e.target.value))} className="bg-white border border-slate-300 font-black text-slate-700 px-4 py-3 rounded-xl outline-none focus:border-purple-500 shadow-sm cursor-pointer text-sm">
            <option value={1}>Enero</option><option value={2}>Febrero</option><option value={3}>Marzo</option>
            <option value={4}>Abril</option><option value={5}>Mayo</option><option value={6}>Junio</option>
            <option value={7}>Julio</option><option value={8}>Agosto</option><option value={9}>Septiembre</option>
            <option value={10}>Octubre</option><option value={11}>Noviembre</option><option value={12}>Diciembre</option>
          </select>
          <input type="number" min="2020" max="2100" value={yearFiltro} onChange={e => setYearFiltro(Number(e.target.value))} className="w-24 bg-white border border-slate-300 font-black text-slate-700 px-4 py-3 rounded-xl outline-none focus:border-purple-500 shadow-sm text-center text-sm" />
        </div>
      </div>

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

              const fechasFormat = (sol.fechas || []).map(f => {
                const [,m,d] = f.split('-');
                return `${d}/${m}`;
              }).join(', ');

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
                    <button disabled={isSubmitting} onClick={() => responderVacaciones(emp, 'rechazada')} className="flex-1 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white py-3 rounded-xl font-black text-xs uppercase transition"><XCircle size={16} className="mx-auto"/></button>
                    <button disabled={isSubmitting || sol.dias_solicitados > diasRestantes} onClick={() => responderVacaciones(emp, 'aprobada')} className="flex-[3] bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-black text-sm uppercase transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none"><CheckCircle2 size={18}/> Aprobar y Evaluar Colisiones</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 p-6 md:p-8 rounded-[32px] shadow-sm flex flex-col xl:flex-row gap-8 items-start xl:items-center w-full max-w-full print:hidden">
        {/* Selección de Empleados */}
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

        {/* Configuración de Turnos */}
        <div className="flex-1 w-full">
          <div className="flex flex-col lg:flex-row flex-wrap gap-4 items-center">
            <div className="bg-white p-2 rounded-2xl flex flex-wrap w-full lg:w-auto border border-blue-200 shadow-sm">
              <button onClick={() => setTurnoMasivo('local')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all ${turnoMasivo === 'local' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}`}><Store size={14}/> Hr. Local</button>
              <button onClick={() => setTurnoMasivo('manana')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all ${turnoMasivo === 'manana' ? 'bg-orange-100 text-orange-700' : 'text-slate-400 hover:bg-slate-50'}`}><Sun size={14}/> Mañana</button>
              <button onClick={() => setTurnoMasivo('tarde')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all ${turnoMasivo === 'tarde' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}><Moon size={14}/> Tarde</button>
            </div>
            <div className={`flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-blue-200 shadow-sm w-full lg:w-auto justify-center transition-all ${turnoMasivo === 'local' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <Clock size={16} className="text-slate-400" />
              <input type="time" disabled={turnoMasivo === 'local'} value={turnoMasivo === 'local' ? '' : entradaMasiva} onChange={e => setEntradaMasiva(e.target.value)} className="w-20 font-black text-slate-700 outline-none bg-transparent" />
              <span className="text-slate-300 font-bold">-</span>
              <input type="time" disabled={turnoMasivo === 'local'} value={turnoMasivo === 'local' ? '' : salidaMasiva} onChange={e => setSalidaMasiva(e.target.value)} className="w-20 font-black text-slate-700 outline-none bg-transparent" />
            </div>
            <button onClick={aplicarAsignacionMasiva} disabled={isSubmitting || empleadosSeleccionados.length === 0} className="w-full lg:w-auto flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black transition shadow-lg shadow-blue-500/30 active:scale-95 disabled:opacity-50 whitespace-nowrap">
              Rellenar Horario Mes
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 mt-8">
        <h3 className="text-2xl font-black text-slate-800">Calendario de Horarios ({mesFiltro}/{yearFiltro})</h3>
        <button onClick={guardarHorarios} disabled={isSubmitting || Object.keys(horariosTemp).length === 0} className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-purple-400 px-8 py-3.5 rounded-xl font-black text-sm transition shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={18}/> Guardar Cambios Manuales
        </button>
      </div>

      <div className="w-full max-w-full overflow-x-auto border border-slate-200 rounded-[32px] bg-white shadow-sm custom-scrollbar mb-8">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-widest">
              <th className="p-5 border-r border-slate-200 w-56 sticky left-0 bg-slate-100 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                Empleado
              </th>
              {diasMes.map(d => {
                const isFestivo = calendarioAnual[d.fechaStr]?.tipo === 'festivo';
                const isBloqueado = calendarioAnual[d.fechaStr]?.tipo === 'bloqueado';
                const nombreEspecial = calendarioAnual[d.fechaStr]?.motivo;
                
                let workingCount = 0;
                empleadosVisibles.forEach(emp => {
                  const horBD = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
                  if (horBD[d.fechaStr]?.activo) workingCount++;
                });
                
                const ratioPersonal = empleadosVisibles.length > 0 ? (workingCount / empleadosVisibles.length) : 1;
                let semaforo = 'text-slate-400';
                if (ratioPersonal < 0.3) semaforo = 'text-red-500';
                else if (ratioPersonal > 0.8) semaforo = 'text-emerald-500';

                return (
                  <th key={d.fechaStr} className={`p-2 text-center border-r border-slate-200 min-w-[120px] ${isFestivo ? 'bg-amber-100' : isBloqueado ? 'bg-rose-100' : ''}`} title={nombreEspecial}>
                    <div className="flex flex-col items-center gap-1 relative">
                       {(isFestivo || isBloqueado) && (
                         <div className={`absolute -top-3 px-2 py-0.5 rounded shadow-sm text-[8px] tracking-wider ${isFestivo ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'}`}>
                           {isFestivo ? '🎉 Festivo' : '🔒 Bloqueado'}
                         </div>
                       )}
                       <span className={`text-base font-black ${d.nombreBreve.startsWith('S') || d.nombreBreve.startsWith('D') ? 'text-red-500' : 'text-slate-700'}`}>{d.num}</span>
                       <span className="text-[9px] uppercase">{d.nombreBreve}</span>
                       <div className={`flex items-center gap-0.5 text-[8px] ${semaforo} mt-1`} title={`${workingCount} empleados laboran hoy`}>
                          <ChefHat size={10}/> {workingCount}
                       </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {empleadosVisibles.map(emp => {
              const horBD = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
              const cambiosEmp = horariosTemp[emp.id] || {};
              const diasSinPagar = detectarDiasSinPagar(emp);

              return (
                <tr key={emp.id} className="hover:bg-slate-50 transition group">
                  <td className="p-4 border-r border-slate-100 sticky left-0 bg-white z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] group-hover:bg-slate-50 align-top">
                    <p className="font-black text-slate-800 text-sm">{emp.nombre}</p>
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
                    const isVacaciones = horDef?.vacaciones || false;
                    const isPagado = horDef?.pagado || false;
                    const configDiaGlobal = horarioNegocio[d.nombreCompleto] || { activo: true, apertura: '08:00', cierre: '22:00' };

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
                              onClick={() => handleHorarioChange(emp.id, d.fechaStr, 'activo', !activo, configDiaGlobal, false)}
                              className={`w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border ${activo ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                            >
                              {activo ? 'Trabaja' : 'Descanso'}
                            </button>
                            {activo && (
                              <div className="flex flex-col gap-1 opacity-100 transition-opacity">
                                <input type="time" value={horDef.entrada || configDiaGlobal.apertura || '08:00'} onChange={e => handleHorarioChange(emp.id, d.fechaStr, 'entrada', e.target.value, configDiaGlobal, false)} className="w-full text-center p-1.5 text-xs font-black bg-slate-100 border border-slate-200 rounded-md outline-none focus:border-blue-400" />
                                <input type="time" value={horDef.salida || configDiaGlobal.cierre || '22:00'} onChange={e => handleHorarioChange(emp.id, d.fechaStr, 'salida', e.target.value, configDiaGlobal, false)} className="w-full text-center p-1.5 text-xs font-black bg-slate-100 border border-slate-200 rounded-md outline-none focus:border-blue-400" />
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
          <div className="flex items-center justify-between gap-2 bg-slate-800 p-2.5 rounded-2xl w-full sm:w-auto border border-slate-700">
            <div className="flex flex-col">
              <label className="text-[9px] text-slate-400 font-black uppercase ml-1 mb-0.5">Desde</label>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer" />
            </div>
            <span className="text-slate-600 font-black">-</span>
            <div className="flex flex-col">
              <label className="text-[9px] text-slate-400 font-black uppercase ml-1 mb-0.5">Hasta</label>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer" />
            </div>
          </div>  
          <button onClick={realizarCorteNómina} disabled={isSubmitting || !fechaDesde || !fechaHasta} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-4 rounded-2xl font-black transition active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 whitespace-nowrap">
            <History size={18} /> Efectuar Corte Parcial
          </button>
        </div>
      </div>
    </div>
  );
};

export default GestorHorarios;