import React, { useState, useEffect } from 'react';
import { Save, History, Lock, Calendar, Clock, Palmtree, CheckCircle2, XCircle, Users, Sun, Moon, CheckSquare, Square } from 'lucide-react';  

const diasSemanaMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];  

const GestorHorarios = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm }) => {
  const [horariosTemp, setHorariosTemp] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [horarioNegocio, setHorarioNegocio] = useState({});  

  // 👇 ESTADOS PARA EL PANEL DE ASIGNACIÓN MASIVA
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);
  const [turnoMasivo, setTurnoMasivo] = useState('manana');
  const [entradaMasiva, setEntradaMasiva] = useState('08:00');
  const [salidaMasiva, setSalidaMasiva] = useState('16:00');

  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = hoy.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mesNombre = hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase();  

  const strHoy = `${year}-${String(month + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;  
  const strPrimerDiaMes = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  // 👇 NUEVOS ESTADOS: Para proteger la información al cruzar meses en el corte
  const [fechaDesde, setFechaDesde] = useState(strPrimerDiaMes);
  const [fechaHasta, setFechaHasta] = useState(strHoy);

  const diasMes = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return { num: i + 1, nombreBreve: d.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase(), nombreCompleto: diasSemanaMap[d.getDay()], fechaStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}` };
  });  

  const empleadosVisibles = usuariosDB
    .filter(u => u.nombre !== 'Administrador Global')
    .sort((a, b) => a.nombre.localeCompare(b.nombre));  

  const solicitudesPendientes = empleadosVisibles.filter(emp => {
    const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
    return pres.solicitud_vacaciones && pres.solicitud_vacaciones.estado === 'pendiente';
  });  

  useEffect(() => {
    fetch(`${apiUrl}/configuracion`)
      .then(res => res.json())
      .then(data => {
        if (data && data.horarios_semana) {
          try { setHorarioNegocio(typeof data.horarios_semana === 'string' ? JSON.parse(data.horarios_semana) : data.horarios_semana || {}); } catch (e) {}
        }
      }).catch(()=>{});
  }, [apiUrl]);  

  // Cambia automáticamente la hora sugerida al cambiar el turno masivo
  useEffect(() => {
    if (turnoMasivo === 'manana') {
      setEntradaMasiva('08:00');
      setSalidaMasiva('16:00');
    } else {
      setEntradaMasiva('16:00');
      setSalidaMasiva('23:00');
    }
  }, [turnoMasivo]);

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

  // FUNCIÓN DEL MOTOR DE ASIGNACIÓN MASIVA INTELIGENTE
  const aplicarAsignacionMasiva = () => {
    if (empleadosSeleccionados.length === 0) {
      return showAlert('Aviso', 'Selecciona al menos un empleado en el panel superior.', 'info');
    }

    setHorariosTemp(prev => {
      const nuevosHorarios = { ...prev };

      empleadosSeleccionados.forEach(empId => {
        const emp = usuariosDB.find(u => u.id === empId);
        if (!emp) return;

        // Extraer los días de descanso desde las prestaciones
        let diasDescanso = [];
        try {
          const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : (emp.prestaciones || {});
          diasDescanso = pres.dias_descanso || [];
        } catch(e) {}

        const empPrev = nuevosHorarios[empId] || {};
        const horarioGuardado = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});

        diasMes.forEach(d => {
          const configDiaGlobal = horarioNegocio[d.nombreCompleto] || { activo: true };
          const diaGuardado = horarioGuardado[d.fechaStr] || { pagado: false, vacaciones: false };
          const diaPrev = empPrev[d.fechaStr] || diaGuardado;

          // Regla de Oro: Si el día ya está pagado o el empleado está de vacaciones, lo ignoramos
          if (diaPrev.pagado || diaPrev.vacaciones) return;

          // Regla de Oro: Verificamos si es su día de descanso asignado en Nómina
          const esDescanso = diasDescanso.includes(d.nombreCompleto);
          const negocioAbierto = configDiaGlobal.activo !== false;

          // Asignación inteligente
          if (!negocioAbierto || esDescanso) {
             empPrev[d.fechaStr] = { ...diaPrev, activo: false };
          } else {
             empPrev[d.fechaStr] = { ...diaPrev, activo: true, entrada: entradaMasiva, salida: salidaMasiva };
          }
        });

        nuevosHorarios[empId] = empPrev;
      });

      return nuevosHorarios;
    });

    showAlert('¡Asignación Lista!', 'Se ha llenado el calendario de los empleados seleccionados respetando sus días de descanso. Recuerda hacer clic en "Guardar Cambios" para confirmar.', 'success');
    setEmpleadosSeleccionados([]); // Limpiamos la selección
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
      showAlert('¡Éxito!', 'Los horarios han sido guardados.', 'success');
      setHorariosTemp({}); refrescarDatos();
    } catch (error) { showAlert('Error', 'Problema de conexión.', 'error'); }
    setIsSubmitting(false);
  };  

  // 👇 NUEVO: Generador dinámico de rango de fechas para cruzar meses sin perder datos
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
      "Corte y Bloqueo de Nómina",
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
            
            // 👇 CORRECCIÓN: Filtramos usando el rango de fechas para cruzar meses
            const diasNuevosPagados = fechasRango.filter(fechaStr => h[fechaStr]?.activo && !h[fechaStr]?.pagado).length;
            
            let limpiezasCumplidas = 0, limpiezasIncumplidas = 0, limpiezaDetalle = {};  

            Object.keys(evaluaciones).forEach(area => {
              Object.keys(evaluaciones[area]).forEach(diaStr => {
                // 👇 CORRECCIÓN: Buscamos entre el rango exacto solicitado
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

          const userObj = JSON.parse(localStorage.getItem('pos_sesion') || '{}').data || {};
          const res = await fetch(`${apiUrl}/usuarios/corte-nomina`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_admin_id: userObj.id || null, datos_corte: datosCorte })
          });  

          if (res.ok) {
            await Promise.all(empleadosVisibles.map(emp => {
              const hActual = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
              const hNuevo = { ...hActual };
              
              // 👇 CORRECCIÓN: Bloqueamos los días exactos del rango cruzado
              fechasRango.forEach(fechaStr => {
                if (!hNuevo[fechaStr]) hNuevo[fechaStr] = { activo: false };
                hNuevo[fechaStr].pagado = true;
              });

              return fetch(`${apiUrl}/usuarios/${emp.id}/horario`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ horario_semanal: hNuevo })
              });
            }));
            showAlert("✅ Corte Procesado", `Las horas comprendidas entre ${fechaDesde} y ${fechaHasta} han sido pagadas y bloqueadas exitosamente.`, "success");
            setHorariosTemp({}); refrescarDatos();
          }
        } catch (e) {}
        setIsSubmitting(false);
      }
    );
  };  

  const responderVacaciones = async (emp, estado) => {
    setIsSubmitting(true);
    try {
      const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : (emp.prestaciones || {});
      pres.solicitud_vacaciones.estado = estado;  

      if (estado === 'aprobada') {
        pres.dias_vacaciones_usados = (Number(pres.dias_vacaciones_usados) || 0) + Number(pres.solicitud_vacaciones.dias_solicitados || 0);  
        const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal) : (emp.horario_semanal || {});  

        if (pres.solicitud_vacaciones.fechas && Array.isArray(pres.solicitud_vacaciones.fechas)) {
          pres.solicitud_vacaciones.fechas.forEach(dStr => {
            if (!hor[dStr]) hor[dStr] = {};
            hor[dStr] = { activo: true, vacaciones: true, pagado: true, entrada: '00:00', salida: '00:00' };
          });
        }  
        await fetch(`${apiUrl}/usuarios/${emp.id}/horario`, {
          method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ horario_semanal: hor })
        });
      }  
      await fetch(`${apiUrl}/usuarios/${emp.id}/prestaciones`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prestaciones: pres })
      });  
      showAlert("Resuelto", `La solicitud ha sido ${estado}.`, "success");
      refrescarDatos();
    } catch(e) {}
    setIsSubmitting(false);
  };  

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">  

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
                    <button disabled={isSubmitting || sol.dias_solicitados > diasRestantes} onClick={() => responderVacaciones(emp, 'aprobada')} className="flex-[3] bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-black text-sm uppercase transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none"><CheckCircle2 size={18}/> Aprobar y Bloquear Días</button>
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-blue-900 flex items-center gap-2"><Users size={20}/> Selección Múltiple</h3>
            <button 
              onClick={() => {
                if (empleadosSeleccionados.length === empleadosVisibles.length) setEmpleadosSeleccionados([]);
                else setEmpleadosSeleccionados(empleadosVisibles.map(e => e.id));
              }} 
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm"
            >
              {empleadosSeleccionados.length === empleadosVisibles.length ? 'Desmarcar Todos' : 'Marcar Todos'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
            {empleadosVisibles.map(emp => {
              const seleccionado = empleadosSeleccionados.includes(emp.id);
              return (
                <button
                  key={emp.id}
                  onClick={() => setEmpleadosSeleccionados(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id])}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all border ${seleccionado ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                >
                  {seleccionado ? <CheckSquare size={14}/> : <Square size={14}/>} {emp.nombre}
                </button>
              )
            })}
          </div>
        </div>

        {/* Configuración de Turnos y Acción */}
        <div className="flex-1 w-full">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            
            <div className="bg-white p-2 rounded-2xl flex w-full sm:w-auto border border-blue-200 shadow-sm">
              <button onClick={() => setTurnoMasivo('manana')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${turnoMasivo === 'manana' ? 'bg-orange-100 text-orange-700' : 'text-slate-400 hover:bg-slate-50'}`}>
                <Sun size={18}/> Mañana
              </button>
              <button onClick={() => setTurnoMasivo('tarde')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${turnoMasivo === 'tarde' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50'}`}>
                <Moon size={18}/> Tarde
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-blue-200 shadow-sm w-full sm:w-auto justify-center">
              <Clock size={16} className="text-slate-400" />
              <input type="time" value={entradaMasiva} onChange={e => setEntradaMasiva(e.target.value)} className="w-20 font-black text-slate-700 outline-none" />
              <span className="text-slate-300 font-bold">-</span>
              <input type="time" value={salidaMasiva} onChange={e => setSalidaMasiva(e.target.value)} className="w-20 font-black text-slate-700 outline-none" />
            </div>

            <button 
              onClick={aplicarAsignacionMasiva} 
              disabled={isSubmitting || empleadosSeleccionados.length === 0}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black transition shadow-lg shadow-blue-500/30 active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              Aplicar al Mes Completo
            </button>
          </div>
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-4 flex items-center gap-1">
            <CheckCircle2 size={12}/> Respetará automáticamente los días de descanso configurados en Nómina.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-purple-50 p-6 rounded-[24px] border border-purple-100 gap-4 w-full max-w-full">
        <div className="flex items-center gap-4 text-purple-700">
          <div className="bg-purple-500 text-white p-3 rounded-2xl shadow-md"><Calendar size={28} /></div>
          <div><h3 className="text-xl font-black tracking-tight leading-none mb-1">Planificador Mensual</h3><p className="text-xs font-bold uppercase tracking-widest">{mesNombre}</p></div>
        </div>
        <button disabled={isSubmitting} onClick={guardarHorarios} className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-purple-500/30 transition flex items-center justify-center gap-2 active:scale-95"><Save size={20} /> Guardar Cambios</button>
      </div>  

      <div className="overflow-x-auto bg-white rounded-[24px] border border-slate-200 shadow-sm custom-scrollbar w-full max-w-full">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.03)] z-20">Empleado</th>
              {diasMes.map(d => (
                <th key={d.fechaStr} className="p-3 text-center border-l border-slate-200 min-w-[130px]">
                  <div className={`text-xs font-black p-2 rounded-xl ${d.nombreBreve.startsWith('S') || d.nombreBreve.startsWith('D') ? 'bg-red-100 text-red-600' : 'bg-white text-slate-600 border border-slate-200 shadow-sm'}`}>
                    {d.num} <span className="block mt-0.5 text-[9px] uppercase tracking-widest">{d.nombreBreve}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => {
              const horarioGuardado = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
              return (
                <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                  <td className="p-5 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-10 group-hover:bg-slate-50">
                    <p className="font-black text-slate-800 text-sm whitespace-nowrap">{emp.nombre}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{emp.rol}</p>
                  </td>
                  {diasMes.map(d => {
                    const diaGuardado = horarioGuardado[d.fechaStr] || { entrada: '', salida: '', activo: false, pagado: false };
                    const diaEditado = (horariosTemp[emp.id] && horariosTemp[emp.id][d.fechaStr]) ? horariosTemp[emp.id][d.fechaStr] : diaGuardado;
                    const configDiaGlobal = horarioNegocio[d.nombreCompleto] || { activo: true, apertura: '08:00', cierre: '22:00' };
                    const isPagado = diaEditado.pagado === true;  
                    
                    if (diaEditado.vacaciones) {
                      return (
                        <td key={d.fechaStr} className="p-3 border-l border-slate-100 text-center bg-amber-50">
                          <div className="flex flex-col items-center justify-center bg-amber-100 rounded-xl p-3 border border-amber-200 h-[84px] shadow-inner">
                            <Palmtree size={16} className="text-amber-50 mb-1" />
                            <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest text-center">Vacaciones</span>
                          </div>
                        </td>
                      )
                    }  
                    
                    return (
                      <td key={d.fechaStr} className={`p-3 border-l border-slate-100 text-center transition-all ${isPagado ? 'bg-slate-100/50' : diaEditado.activo ? 'bg-purple-50/30' : ''}`}>
                        {isPagado ? (
                          <div className="flex flex-col items-center justify-center bg-emerald-50 rounded-xl p-3 border border-emerald-200 h-[84px] shadow-inner">
                            <Lock size={16} className="text-emerald-500 mb-1" />
                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Pagado</span>
                            {diaEditado.activo && <span className="text-[9px] font-bold text-emerald-600 mt-1">{diaEditado.entrada} - {diaEditado.salida}</span>}
                          </div>
                        ) : !configDiaGlobal.activo ? (
                          <div className="flex flex-col items-center justify-center bg-slate-100/80 rounded-xl p-3 border border-slate-200 opacity-60 h-[84px]"><Clock size={16} className="text-slate-400 mb-1" /><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cerrado</span></div>
                        ) : (
                          <div className="flex flex-col gap-2 items-center">
                            <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:border-purple-300 transition-colors">
                              <input type="checkbox" checked={diaEditado.activo || false} onChange={(e) => handleHorarioChange(emp.id, d.fechaStr, 'activo', e.target.checked, configDiaGlobal, false)} className="accent-purple-500 w-4 h-4 cursor-pointer" />
                              <span className="text-[10px] font-black text-slate-500 uppercase">Trabaja</span>
                            </label>
                            <div className={`flex flex-col gap-1 w-full transition-opacity ${diaEditado.activo ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                              <input type="time" title="Entrada" disabled={!diaEditado.activo} value={diaEditado.entrada || configDiaGlobal.apertura} onChange={(e) => handleHorarioChange(emp.id, d.fechaStr, 'entrada', e.target.value, configDiaGlobal, false)} className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-purple-500 font-bold text-slate-700 text-center shadow-sm" />
                              <input type="time" title="Salida" disabled={!diaEditado.activo} value={diaEditado.salida || configDiaGlobal.cierre} onChange={(e) => handleHorarioChange(emp.id, d.fechaStr, 'salida', e.target.value, configDiaGlobal, false)} className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-purple-500 font-bold text-slate-700 text-center shadow-sm" />
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>  

      {/* 👇 PANEL DE CORTE DE NÓMINA ACTUALIZADO (RANGO DE FECHAS CRUZADAS) */}
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
           {/* Selectores de fecha para el cruce de meses */}
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