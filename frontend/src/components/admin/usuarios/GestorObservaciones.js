import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Trash2, Users, Plus, Lock, Calendar, RotateCcw, Save, ChevronLeft, ChevronRight, Filter, Copy, CheckSquare, Square } from 'lucide-react';

const diasSemanaMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const GestorObservaciones = ({ usuariosDB, apiUrl, showAlert, showConfirm, configGlobal }) => {
  const [fechaReferencia, setFechaReferencia] = useState(new Date());

  const [observacionesBase, setObservacionesBase] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [evaluaciones, setEvaluaciones] = useState({});
  const [diasCerrados, setDiasCerrados] = useState([]);
  const [nuevaObservacion, setNuevaObservacion] = useState('');
  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [horarioNegocio, setHorarioNegocio] = useState({});

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [modalCelda, setModalCelda] = useState(null);
  const [modalMasivo, setModalMasivo] = useState(null);

  const [filtroRolMasivo, setFiltroRolMasivo] = useState('');
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);

  const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global' && u.rol !== 'tv').sort((a, b) => a.nombre.localeCompare(b.nombre));
  const rolesDisponibles = [...new Set(empleadosVisibles.map(e => e.rol))];
  const empleadosFiltrados = filtroRolMasivo ? empleadosVisibles.filter(u => u.rol === filtroRolMasivo) : empleadosVisibles;
  const todosFiltradosSeleccionados = empleadosFiltrados.length > 0 && empleadosFiltrados.every(e => empleadosSeleccionados.includes(String(e.id)));

  useEffect(() => {
    if (empleadosVisibles.length > 0 && empleadosSeleccionados.length === 0) {
      setEmpleadosSeleccionados(empleadosVisibles.map(e => String(e.id)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuariosDB]);

  const toggleSeleccionMasiva = () => {
    if (todosFiltradosSeleccionados) {
      setEmpleadosSeleccionados(prev => prev.filter(id => !empleadosFiltrados.find(e => String(e.id) === id)));
    } else {
      const nuevos = empleadosFiltrados.map(e => String(e.id)).filter(id => !empleadosSeleccionados.includes(id));
      setEmpleadosSeleccionados(prev => [...prev, ...nuevos]);
    }
  };

  const year = fechaReferencia.getFullYear();
  const month = fechaReferencia.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const diasMes = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    const nombreBreve = date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '');
    const nombreCompleto = diasSemanaMap[date.getDay()];
    return { num: i + 1, nombreBreve, nombreCompleto, fechaStr, dayIndex: date.getDay() };
  });

  const mesNombre = fechaReferencia.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();

  const cambiarMes = (direccion) => setFechaReferencia(new Date(year, month + direccion, 1));

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hayCambiosSinGuardar) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hayCambiosSinGuardar]);

  useEffect(() => {
    if (configGlobal && configGlobal.horarios_semana) {
      try { setHorarioNegocio(typeof configGlobal.horarios_semana === 'string' ? JSON.parse(configGlobal.horarios_semana) : configGlobal.horarios_semana || {}); } catch (e) {}
    }
  }, [configGlobal]);

  useEffect(() => {
    fetch(`${apiUrl}/configuracion`)
      .then(res => res.json())
      .then(data => {
        if (data && data.horarios_semana) {
          try { setHorarioNegocio(typeof data.horarios_semana === 'string' ? JSON.parse(data.horarios_semana) : data.horarios_semana); } catch(e){}
        }
        if (data && !data.error && data.matriz_observaciones) {
          const matriz = typeof data.matriz_observaciones === 'string' ? JSON.parse(data.matriz_observaciones) : data.matriz_observaciones;
          setObservacionesBase(matriz.observacionesBase || []);
          setAsignaciones(matriz.asignaciones || {});
          setEvaluaciones(matriz.evaluaciones || {});
          setDiasCerrados(matriz.dias_cerrados || []);
        }
      })
      .catch(() => {});
  }, [apiUrl]);

  const agregarObservacion = (e) => {
    e.preventDefault();
    const obsNombre = nuevaObservacion.trim();
    if (!obsNombre) return;
    if (!observacionesBase.find(o => o.toLowerCase() === obsNombre.toLowerCase())) {
      setHayCambiosSinGuardar(true);
      setObservacionesBase([...observacionesBase, obsNombre]);
      setNuevaObservacion('');
    } else {
      showAlert('Aviso', 'Esta observación ya existe en la lista.', 'warning');
    }
  };

  const eliminarObservacion = (obsNombre) => {
    showConfirm("Eliminar Observación", `¿Seguro que deseas eliminar "${obsNombre}"? Se perderá su historial.`, () => {
      setHayCambiosSinGuardar(true);
      setObservacionesBase(prev => prev.filter(o => o !== obsNombre));
    });
  };

  const evaluarObservacion = (obsNombre, fechaStr, empId, status) => {
    if (diasCerrados.includes(fechaStr)) return;
    setHayCambiosSinGuardar(true);
    setEvaluaciones(prev => {
      const prevObs = prev[obsNombre] || {};
      const prevFecha = prevObs[fechaStr] || {};
      if (status === null) {
        const newFecha = { ...prevFecha };
        delete newFecha[empId];
        return { ...prev, [obsNombre]: { ...prevObs, [fechaStr]: newFecha } };
      }
      return { ...prev, [obsNombre]: { ...prevObs, [fechaStr]: { ...prevFecha, [empId]: status } } };
    });
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

  const realizarCorteObservaciones = () => {
    if (!fechaDesde || !fechaHasta) return showAlert("Aviso", "Selecciona el rango para auditoría.", "info");
    if (fechaDesde > fechaHasta) return showAlert("Aviso", "'Desde' no puede ser mayor que 'Hasta'.", "warning");
    const fechasRango = obtenerRangoFechas(fechaDesde, fechaHasta);

    showConfirm(
      "🔒 Corte de Observaciones", 
      `Bloquearás las evaluaciones desde el ${fechaDesde} hasta el ${fechaHasta}. Ya no se podrán modificar.`, 
      async () => {
        setIsSubmitting(true);
        try {
          const resConfig = await fetch(`${apiUrl}/configuracion`);
          let matrizActual = {};
          if (resConfig.ok) {
            const dataConfig = await resConfig.json();
            matrizActual = typeof dataConfig.matriz_observaciones === 'string' ? JSON.parse(dataConfig.matriz_observaciones || '{}') : (dataConfig.matriz_observaciones || {});
          }

          const nuevosDiasCerrados = [...new Set([...diasCerrados, ...fechasRango])];
          const payload = { ...matrizActual, observacionesBase, asignaciones, evaluaciones, dias_cerrados: nuevosDiasCerrados };

          const formData = new FormData();
          formData.append('matriz_observaciones', JSON.stringify(payload));

          const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
          if (res.ok) {
            setDiasCerrados(nuevosDiasCerrados);
            setHayCambiosSinGuardar(false);
            showAlert("Éxito", "Auditoría de observaciones bloqueada y guardada.", "success");
          }
        } catch (error) { showAlert("Error", "Fallo de conexión.", "error"); }
        setIsSubmitting(false);
      }
    );
  };

  const guardarMatriz = async () => {
    setIsSubmitting(true);
    try {
      const resConfig = await fetch(`${apiUrl}/configuracion`);
      let matrizActual = {};
      if (resConfig.ok) {
        const dataConfig = await resConfig.json();
        matrizActual = typeof dataConfig.matriz_observaciones === 'string' ? JSON.parse(dataConfig.matriz_observaciones || '{}') : (dataConfig.matriz_observaciones || {});
      }
      const payload = { ...matrizActual, observacionesBase, asignaciones, evaluaciones, dias_cerrados: diasCerrados };
      const formData = new FormData();
      formData.append('matriz_observaciones', JSON.stringify(payload));

      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) {
        setHayCambiosSinGuardar(false);
        showAlert('¡Guardado!', 'Todas las observaciones fueron salvadas en la base de datos.', 'success');
      } else { showAlert('Error', 'No se pudo guardar la matriz.', 'error'); }
    } catch (error) { showAlert('Error', 'Error de red al guardar.', 'error'); }
    setIsSubmitting(false);
  };

  const duplicarSiguienteMes = () => {
    if (empleadosSeleccionados.length === 0) return showAlert('Aviso', 'Selecciona al menos un empleado en el filtro visual.', 'info');

    showConfirm(
      "Copiar al Siguiente Mes",
      "Esto copiará el patrón de observaciones actual al mes próximo (respetando los días de cierre y reglas de nómina). ¿Proceder?",
      () => {
        setHayCambiosSinGuardar(true);
        const mesActivoLocal = fechaReferencia.getMonth();
        const yearActivoLocal = fechaReferencia.getFullYear();

        const nextM = mesActivoLocal === 11 ? 0 : mesActivoLocal + 1;
        const nextY = mesActivoLocal === 11 ? yearActivoLocal + 1 : yearActivoLocal;
        const diasNextMonth = new Date(nextY, nextM + 1, 0).getDate();
        
        const nuevasAsignaciones = { ...asignaciones };

        Object.keys(nuevasAsignaciones).forEach(obsNombre => {
          for (let i = 1; i <= diasNextMonth; i++) {
            const dNext = new Date(nextY, nextM, i);
            const targetDateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const nombreDiaCompleto = diasSemanaMap[dNext.getDay()];
            
            const currentMonthDay = diasMes.find(d => {
              const dCurr = new Date(yearActivoLocal, mesActivoLocal, d.num);
              return dCurr.getDay() === dNext.getDay();
            });
            
            if (currentMonthDay && nuevasAsignaciones[obsNombre][currentMonthDay.fechaStr]) {
              const asignados = nuevasAsignaciones[obsNombre][currentMonthDay.fechaStr];
              
              const asignables = asignados.filter(empId => {
                  if (!empleadosSeleccionados.includes(String(empId))) return false;

                  const emp = empleadosVisibles.find(u => String(u.id) === String(empId));
                  if (!emp) return false;
                  
                  const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
                  const restauranteCerrado = horarioNegocio && horarioNegocio[nombreDiaCompleto] && horarioNegocio[nombreDiaCompleto].activo === false;
                  const esDescanso = pres.dias_descanso?.includes(nombreDiaCompleto) || false;
                  const esNoLaboral = pres.dias_no_laborales?.includes(targetDateStr) || false;
                  
                  if (restauranteCerrado || esDescanso || esNoLaboral) return false;
                  return true;
              });

              nuevasAsignaciones[obsNombre][targetDateStr] = asignables;
            }
          }
        });
        
        setAsignaciones(nuevasAsignaciones);
        showAlert('¡Patrón Duplicado!', 'Observaciones copiadas al mes siguiente respetando los cierres operativos. Cambia de mes y presiona Guardar.', 'success');
      }
    );
  };

  const renderModalAsignacion = () => {
    if (!modalCelda && !modalMasivo) return null;
    const isMasivo = !!modalMasivo;
    const data = modalCelda || modalMasivo;

    const empleadosParaMostrar = filtroRolMasivo 
      ? empleadosVisibles.filter(e => e.rol === filtroRolMasivo) 
      : empleadosVisibles;

    // LÓGICA DE SELECCIÓN MASIVA DENTRO DEL MODAL
    const todosModalSeleccionados = empleadosParaMostrar.length > 0 && empleadosParaMostrar.every(e => data.seleccionados.includes(String(e.id)));

    const toggleTodosModal = () => {
      if (todosModalSeleccionados) {
        const idsVisibles = empleadosParaMostrar.map(e => String(e.id));
        const nuevos = data.seleccionados.filter(id => !idsVisibles.includes(id));
        if (isMasivo) setModalMasivo({ ...modalMasivo, seleccionados: nuevos });
        else setModalCelda({ ...modalCelda, seleccionados: nuevos });
      } else {
        const idsVisibles = empleadosParaMostrar.map(e => String(e.id));
        const nuevos = [...new Set([...data.seleccionados, ...idsVisibles])];
        if (isMasivo) setModalMasivo({ ...modalMasivo, seleccionados: nuevos });
        else setModalCelda({ ...modalCelda, seleccionados: nuevos });
      }
    };

    const toggleEmpleado = (empId) => {
      const stringId = String(empId);
      const nuevos = data.seleccionados.includes(stringId) 
        ? data.seleccionados.filter(id => id !== stringId) 
        : [...data.seleccionados, stringId];

      if (isMasivo) setModalMasivo({ ...modalMasivo, seleccionados: nuevos });
      else setModalCelda({ ...modalCelda, seleccionados: nuevos });
    };

    const toggleDiaSemana = (dayIndex) => {
      if (!isMasivo) return;
      const nuevosDias = data.diasSemana.includes(dayIndex)
        ? data.diasSemana.filter(d => d !== dayIndex)
        : [...data.diasSemana, dayIndex];
      setModalMasivo({ ...modalMasivo, diasSemana: nuevosDias });
    };

    const diasSemanaModal = [
      { idx: 1, label: 'LUN' },
      { idx: 2, label: 'MAR' },
      { idx: 3, label: 'MIÉ' },
      { idx: 4, label: 'JUE' },
      { idx: 5, label: 'VIE' },
      { idx: 6, label: 'SÁB' },
      { idx: 0, label: 'DOM' }
    ];

    const guardarAsignacion = () => {
      setHayCambiosSinGuardar(true);
      const obsNombre = data.obsNombre;

      if (isMasivo) {
        const nuevasAsignaciones = { ...asignaciones };
        if (!nuevasAsignaciones[obsNombre]) nuevasAsignaciones[obsNombre] = {};

        diasMes.forEach(d => {
          if (!diasCerrados.includes(d.fechaStr)) {
            if (data.diasSemana.includes(d.dayIndex)) {
              const asignables = data.seleccionados.filter(empId => {
                const emp = empleadosVisibles.find(u => String(u.id) === String(empId));
                if (!emp) return false;
                
                const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
                const restauranteCerrado = horarioNegocio && horarioNegocio[d.nombreCompleto] && horarioNegocio[d.nombreCompleto].activo === false;
                const esDescanso = pres.dias_descanso?.includes(d.nombreCompleto) || false;
                const esNoLaboral = pres.dias_no_laborales?.includes(d.fechaStr) || false;

                if (restauranteCerrado || esDescanso || esNoLaboral) return false;
                return true;
              });

              nuevasAsignaciones[obsNombre][d.fechaStr] = asignables;
            } else {
              if (nuevasAsignaciones[obsNombre][d.fechaStr]) {
                nuevasAsignaciones[obsNombre][d.fechaStr] = nuevasAsignaciones[obsNombre][d.fechaStr].filter(
                  empId => !data.seleccionados.includes(empId)
                );
              }
            }
          }
        });

        setAsignaciones(nuevasAsignaciones);
        setModalMasivo(null);
        showAlert('Éxito', `Asignado. Se omitieron días de descanso, días no laborales y cierres de forma automática.`, 'success');
      } else {
        const d = diasMes.find(dia => dia.fechaStr === data.fechaStr);
        const asignables = data.seleccionados.filter(empId => {
          const emp = empleadosVisibles.find(u => String(u.id) === String(empId));
          if (!emp) return false;
          
          const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
          const restauranteCerrado = horarioNegocio && horarioNegocio[d.nombreCompleto] && horarioNegocio[d.nombreCompleto].activo === false;
          const esDescanso = pres.dias_descanso?.includes(d.nombreCompleto) || false;
          const esNoLaboral = pres.dias_no_laborales?.includes(d.fechaStr) || false;

          if (restauranteCerrado || esDescanso || esNoLaboral) {
             showAlert('Asignación omitida', `${emp.nombre} no puede ser asignado el ${d.fechaStr} por reglas de nómina.`, 'warning');
             return false;
          }
          return true;
        });

        setAsignaciones(prev => ({
          ...prev,
          [obsNombre]: { ...(prev[obsNombre] || {}), [data.fechaStr]: asignables }
        }));
        setModalCelda(null);
      }
    };

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white rounded-[32px] p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
          <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
            {isMasivo ? 'Asignación Masiva Mensual' : `Asignar: ${data.fechaStr}`}
          </h3>
          <p className="text-sm font-bold text-indigo-600 mb-4 bg-indigo-50 px-4 py-2 rounded-xl w-fit mt-2 border border-indigo-100">
            {data.obsNombre}
          </p>

          {isMasivo && (
            <div className="mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">
                Repetir cada semana los días:
              </label>
              <div className="flex justify-between gap-1 sm:gap-2">
                {diasSemanaModal.map(ds => {
                  const isSelected = data.diasSemana.includes(ds.idx);
                  return (
                    <button
                      key={ds.idx}
                      type="button"
                      onClick={() => toggleDiaSemana(ds.idx)}
                      className={`flex-1 py-2 rounded-lg font-black text-[10px] sm:text-xs transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                          : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {ds.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* CONTROL RÁPIDO PARA MARCAR/DESMARCAR TODOS EN EL MODAL */}
          <div className="flex justify-between items-center mb-2 mt-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
               Lista de Empleados
            </span>
            <button
               type="button"
               onClick={toggleTodosModal}
               className="text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
            >
               {todosModalSeleccionados ? 'Desmarcar Todos' : 'Marcar Todos'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-6 space-y-2 custom-scrollbar">
            {empleadosParaMostrar.map(emp => {
              const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
              
              const restauranteCerrado = !isMasivo && horarioNegocio && horarioNegocio[data.nombreDiaCompleto] && horarioNegocio[data.nombreDiaCompleto].activo === false;
              const esDescanso = !isMasivo && pres.dias_descanso?.includes(data.nombreDiaCompleto);
              const esNoLaboral = !isMasivo && pres.dias_no_laborales?.includes(data.fechaStr);
              
              const inhabilitado = restauranteCerrado || esDescanso || esNoLaboral;
              
              let razonInhabilitado = '';
              if (restauranteCerrado) razonInhabilitado = "Local Cerrado";
              else if (esNoLaboral) razonInhabilitado = "Día No Laboral";
              else if (esDescanso) razonInhabilitado = "Día de Descanso";

              if (inhabilitado) {
                return (
                  <div key={emp.id} className="flex items-center p-3 rounded-xl border border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed">
                    <div className="w-5 h-5 rounded border-slate-300 ml-2 flex items-center justify-center bg-slate-200"><Lock size={12} className="text-slate-400"/></div>
                    <div className="ml-4">
                      <p className="font-black text-slate-500 text-sm leading-tight line-through">{emp.nombre}</p>
                      <p className="font-bold text-rose-500 text-[10px] uppercase tracking-wider">{razonInhabilitado}</p>
                    </div>
                  </div>
                );
              }

              return (
                <label key={emp.id} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all shadow-sm ${data.seleccionados.includes(String(emp.id)) ? 'bg-white border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                  <input type="checkbox" checked={data.seleccionados.includes(String(emp.id))} onChange={() => toggleEmpleado(emp.id)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 ml-2" />
                  <div className="ml-4">
                    <p className="font-black text-slate-800 text-sm leading-tight">{emp.nombre}</p>
                    <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">{emp.rol}</p>
                  </div>
                </label>
              );
            })}
            
            {empleadosParaMostrar.length === 0 && (
              <p className="text-center text-slate-400 text-xs font-bold py-4">No hay empleados con ese rol.</p>
            )}
          </div>

          <div className="flex gap-3 shrink-0">
            <button onClick={() => isMasivo ? setModalMasivo(null) : setModalCelda(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">Cancelar</button>
            <button onClick={guardarAsignacion} className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/30 transition active:scale-95">Aplicar Reglas</button>
          </div>
        </div>
      </div>
    );
  };

  const empleadosTabla = empleadosFiltrados.filter(e => empleadosSeleccionados.includes(String(e.id)));

  return (
    <>
      <style>{`
        .scroll-horarios::-webkit-scrollbar { height: 16px; width: 16px; }
        .scroll-horarios::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 12px; }
        .scroll-horarios::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 12px; border: 3px solid #f1f5f9; }
        .scroll-horarios::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
      
      <div className="bg-white p-4 md:p-8 rounded-[32px] shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
        
        {/* HEADER Y BOTONES GLOBALES */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
          <div>
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <ClipboardCheck className="text-indigo-500"/> Evaluaciones y Observaciones
            </h3>
            <p className="text-sm font-bold text-slate-400 mt-1">Evalúa comportamiento, uniforme o políticas sin necesidad de fotografías.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={!hayCambiosSinGuardar || isSubmitting} onClick={guardarMatriz} className={`px-6 py-4 rounded-2xl font-black transition flex items-center justify-center gap-2 text-sm shadow-md active:scale-95 ${hayCambiosSinGuardar ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30 animate-pulse' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              <Save size={18}/> {hayCambiosSinGuardar ? 'Guardar Cambios' : 'Guardado'}
            </button>
          </div>
        </div>

        {/* CONTROLES DEL CALENDARIO Y BÚSQUEDA */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 gap-4">
          <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"><ChevronLeft size={20}/></button>
            <div className="text-center min-w-[140px]">
              <span className="block font-black text-slate-800 text-sm">{mesNombre}</span>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">{year}</span>
            </div>
            <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"><ChevronRight size={20}/></button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <form onSubmit={agregarObservacion} className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <input type="text" value={nuevaObservacion} onChange={(e) => setNuevaObservacion(e.target.value)} placeholder="Ej. Uso de Uniforme..." className="w-full sm:w-48 bg-white border border-indigo-200 rounded-xl px-4 py-2 outline-none focus:border-indigo-500 font-bold text-indigo-900 shadow-sm text-sm" />
              <button type="submit" disabled={!nuevaObservacion.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-black transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"><Plus size={18}/></button>
            </form>
          </div>
        </div>

        {/* 👇 NUEVO PANEL: GESTIÓN DE OBSERVACIONES */}
        {observacionesBase.length > 0 && (
          <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm mb-6 print:hidden">
            <h4 className="font-black text-slate-700 mb-4 flex items-center gap-2"><ClipboardCheck size={18}/> Catálogo de Observaciones</h4>
            <div className="flex flex-wrap gap-3">
              {observacionesBase.map(obs => (
                <div key={obs} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl shadow-sm">
                  <span className="font-black text-xs uppercase tracking-wider">{obs}</span>
                  <button onClick={() => eliminarObservacion(obs)} className="text-indigo-400 hover:text-red-500 transition-colors ml-2"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL DE SELECCIÓN DE EMPLEADOS */}
        <div className="bg-indigo-50 border border-indigo-200 p-6 md:p-8 rounded-[32px] shadow-sm flex flex-col xl:flex-row gap-8 items-start w-full max-w-full print:hidden mb-6">  
          <div className="flex-1 w-full xl:pr-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h3 className="font-black text-indigo-900 flex items-center gap-2"><Users size={20}/> Selección de Empleados</h3>
              <button onClick={toggleSeleccionMasiva} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-sm whitespace-nowrap">
                {todosFiltradosSeleccionados ? `Desmarcar ${filtroRolMasivo ? filtroRolMasivo : 'Visibles'}` : `Marcar ${filtroRolMasivo ? filtroRolMasivo : 'Visibles'}`}
              </button>
            </div>
            
            <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2 items-center">
              <Filter size={14} className="text-indigo-400 shrink-0 mr-1"/>
              <button onClick={() => setFiltroRolMasivo('')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all whitespace-nowrap shadow-sm ${!filtroRolMasivo ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}>Todos</button>
              {rolesDisponibles.map(rol => (
                <button key={rol} onClick={() => setFiltroRolMasivo(rol)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all whitespace-nowrap shadow-sm ${filtroRolMasivo === rol ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}>{rol}</button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2 mb-6">
              {empleadosFiltrados.map(emp => {
                const seleccionado = empleadosSeleccionados.includes(String(emp.id));
                return (
                  <button key={emp.id} onClick={() => setEmpleadosSeleccionados(prev => prev.includes(String(emp.id)) ? prev.filter(id => id !== String(emp.id)) : [...prev, String(emp.id)])} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all border ${seleccionado ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                    {seleccionado ? <CheckSquare size={14}/> : <Square size={14}/>} 
                    <span>
                      {emp.nombre.split(' ')[0]} 
                      <span className={`opacity-70 text-[9px] font-bold uppercase tracking-widest ml-1.5 ${seleccionado ? 'text-indigo-200' : 'text-slate-400'}`}>
                        ({emp.rol})
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            
            {/* NUEVO PANEL: ASIGNACIÓN MASIVA REUBICADO */}
            <div className="pt-6 mt-2 border-t border-indigo-200/50 w-full flex flex-col gap-4">
               <div>
                 <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2"><Calendar size={16}/> Asignación Masiva Mensual</h4>
                 <div className="flex flex-wrap gap-2">
                    {observacionesBase.map(obs => (
                       <button key={`masivo-${obs}`} onClick={() => setModalMasivo({ obsNombre: obs, seleccionados: [], diasSemana: [1,2,3,4,5,6,0] })} className="bg-white border border-indigo-300 text-indigo-700 font-black text-[10px] uppercase px-4 py-2.5 rounded-xl hover:bg-indigo-50 shadow-sm flex items-center gap-2 transition active:scale-95">
                         <Plus size={14}/> Asignar {obs}
                       </button>
                    ))}
                    {observacionesBase.length === 0 && <p className="text-[10px] text-indigo-500 font-bold italic">No hay observaciones creadas para asignar.</p>}
                 </div>
               </div>

               <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-2 border-t border-indigo-200/50 w-full">
                  <button onClick={duplicarSiguienteMes} className="md:w-max bg-blue-500 hover:bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2" title="Copia el patrón de días al mes próximo">
                    <Copy size={16}/> Duplicar Asignaciones al Sig. Mes
                  </button>
               </div>
            </div>

          </div>
        </div>

        {/* MATRIZ INVERTIDA DE OBSERVACIONES */}
        <div className="w-full max-w-full overflow-x-auto border border-slate-200 rounded-3xl mb-8 scroll-horarios h-[650px] relative">
          {observacionesBase.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <ClipboardCheck size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-bold text-lg">Aún no hay observaciones registradas.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max relative">
              <thead className="sticky top-0 z-30">
                <tr className="bg-slate-100 shadow-[0_2px_5px_rgba(0,0,0,0.05)]">
                  <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-100 z-40 border-r border-slate-200 min-w-[120px]">
                    Día / Fecha
                  </th>
                  {empleadosTabla.map(emp => (
                    <th key={emp.id} className="p-4 text-center border-r border-slate-200 min-w-[220px] align-top z-30 bg-slate-100">
                      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                        <p className="font-black text-slate-800 text-sm truncate" title={emp.nombre}>{emp.nombre.split(' ')[0]}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{emp.rol}</p>
                      </div>
                    </th>
                  ))}
                  <th className="p-4 text-center w-32 sticky right-0 bg-slate-100 z-40 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] text-xs font-black text-slate-500 uppercase tracking-widest border-l border-slate-200">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diasMes.map((d, index) => {
                  const esFinSemana = d.nombreBreve.startsWith('S') || d.nombreBreve.startsWith('D');
                  const isCerrado = diasCerrados.includes(d.fechaStr);
                  
                  return (
                    <tr key={d.fechaStr} className={`hover:bg-slate-50 transition-colors group ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      {/* CELDA DEL DÍA */}
                      <td className="p-3 sticky left-0 bg-white group-hover:bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-20 border-r border-slate-100 align-middle">
                        <div className={`flex items-center gap-3 p-2 rounded-xl border ${esFinSemana ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'}`}>
                          <span className={`text-2xl font-black ${esFinSemana ? 'text-red-500' : 'text-slate-700'}`}>{d.num}</span>
                          <div>
                            <span className={`block text-[10px] font-black uppercase tracking-widest ${esFinSemana ? 'text-red-400' : 'text-slate-400'}`}>{d.nombreBreve}</span>
                            <span className="block text-[9px] font-bold text-slate-400 mt-0.5">{d.fechaStr.split('-').slice(1).join('/')}</span>
                          </div>
                        </div>
                      </td>

                      {/* EVALUACIONES POR EMPLEADO */}
                      {empleadosTabla.map(emp => {
                        if (isCerrado) {
                          return (
                            <td key={`${emp.id}-${d.fechaStr}`} className="p-2 border-r border-slate-100 bg-slate-100/50 opacity-80 align-middle z-10">
                              <div className="flex items-center justify-center gap-1 p-2 rounded-xl bg-white border border-slate-200 shadow-inner h-[60px]">
                                <Lock size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auditoría Cerrada</span>
                              </div>
                            </td>
                          );
                        }

                        // Buscar qué observaciones tiene asignadas ESTE empleado HOY
                        const obsAsignadas = observacionesBase.filter(obs => {
                          const asignados = asignaciones[obs]?.[d.fechaStr] || [];
                          return asignados.includes(String(emp.id));
                        });

                        return (
                          <td key={`${emp.id}-${d.fechaStr}`} className="p-2 border-r border-slate-100 align-top z-10">
                            {obsAsignadas.length === 0 ? (
                              <div className="h-full flex items-center justify-center min-h-[60px] opacity-30">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">-</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {obsAsignadas.map(obsNombre => {
                                  const evalObj = evaluaciones[obsNombre]?.[d.fechaStr] || {};
                                  const status = evalObj[emp.id];

                                  return (
                                    <div key={obsNombre} className="bg-slate-50 border border-slate-200 p-2 rounded-xl shadow-sm">
                                      <p className="text-[10px] font-black text-slate-700 truncate w-full text-center mb-2" title={obsNombre}>{obsNombre}</p>
                                      {!status ? (
                                        <div className="flex gap-1 w-full">
                                          <button onClick={() => evaluarObservacion(obsNombre, d.fechaStr, String(emp.id), 'cumplio')} className="flex-1 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white text-[10px] py-2 rounded-lg font-black shadow-sm transition-all">SÍ</button>
                                          <button onClick={() => evaluarObservacion(obsNombre, d.fechaStr, String(emp.id), 'no_cumplio')} className="flex-1 bg-white text-red-600 border border-red-200 hover:bg-red-500 hover:text-white text-[10px] py-2 rounded-lg font-black shadow-sm transition-all">NO</button>
                                        </div>
                                      ) : (
                                        <div className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm ${status === 'cumplio' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                          <span>{status === 'cumplio' ? '✅ Cumplió' : '❌ Falló'}</span>
                                          <button onClick={() => evaluarObservacion(obsNombre, d.fechaStr, String(emp.id), null)} className="opacity-80 hover:opacity-100 bg-black/20 p-1.5 rounded"><RotateCcw size={12}/></button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* ACCIONES MASIVAS DEL MES - AHORA VACÍO PUES SE MOVIERON AL PANEL SUPERIOR */}
                      <td className="p-2 text-center sticky right-0 bg-white z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l border-slate-100 align-middle">
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ZONA INFERIOR DE CERRAR AUDITORÍA */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <div className="flex flex-col lg:flex-row items-center gap-4 w-full md:w-auto">
            {observacionesBase.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 w-full sm:w-auto">
                  <div className="flex flex-col px-2">
                    <label className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Desde</label>
                    <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="bg-transparent text-slate-700 font-bold text-xs outline-none cursor-pointer" />
                  </div>
                  <span className="text-slate-300 font-black">-</span>
                  <div className="flex flex-col px-2">
                    <label className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Hasta</label>
                    <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="bg-transparent text-slate-700 font-bold text-xs outline-none cursor-pointer" />
                  </div>
                </div>
                <button disabled={isSubmitting || !fechaDesde || !fechaHasta} onClick={realizarCorteObservaciones} className="w-full sm:w-auto text-sm font-bold flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl transition shadow-sm bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer active:scale-95 disabled:opacity-50">
                  <Lock size={18}/> Cerrar Auditoría
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {renderModalAsignacion()}
    </>
  );
};

export default GestorObservaciones;