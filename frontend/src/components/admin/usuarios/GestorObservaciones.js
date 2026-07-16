import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Trash2, Users, Plus, Lock, Calendar, RotateCcw, Save, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const GestorObservaciones = ({ usuariosDB, apiUrl, showAlert, showConfirm }) => {
  const [fechaReferencia, setFechaReferencia] = useState(new Date());

  // ESTRUCTURA DE DATOS
  const [observacionesBase, setObservacionesBase] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [evaluaciones, setEvaluaciones] = useState({});
  const [diasCerrados, setDiasCerrados] = useState([]);
  const [nuevaObservacion, setNuevaObservacion] = useState('');
  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // MODALES
  const [modalCelda, setModalCelda] = useState(null);
  const [modalMasivo, setModalMasivo] = useState(null);

  // FILTROS
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global' && u.rol !== 'tv').sort((a, b) => a.nombre.localeCompare(b.nombre));
  const rolesDisponibles = [...new Set(empleadosVisibles.map(e => e.rol))];

  // 🗓️ LÓGICA DE CALENDARIO DINÁMICO
  const year = fechaReferencia.getFullYear();
  const month = fechaReferencia.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const diasSemanaMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const diasMes = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    const nombreBreve = date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '');
    const nombreCompleto = diasSemanaMap[date.getDay()];
    return { num: i + 1, nombreBreve, nombreCompleto, fechaStr };
  });

  const mesNombre = fechaReferencia.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();

  const cambiarMes = (direccion) => setFechaReferencia(new Date(year, month + direccion, 1));

  // PROTECCIÓN CONTRA CIERRE ACCIDENTAL
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hayCambiosSinGuardar) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hayCambiosSinGuardar]);

  // 🔄 CARGA DE DATOS
  useEffect(() => {
    fetch(`${apiUrl}/configuracion`)
      .then(res => res.json())
      .then(data => {
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

  // ➕ AGREGAR / ELIMINAR OBSERVACIÓN
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

  // EVALUACIÓN A NIVEL EMPLEADO (SÍ/NO)
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

  // 🧹 CORTE DE AUDITORÍA
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

  const getCellHighlight = (obsNombre, fechaStr) => {
    const asignados = asignaciones[obsNombre]?.[fechaStr] || [];
    if (!filtroEmpleado && !filtroRol) return '';
    if (filtroEmpleado && asignados.includes(filtroEmpleado)) return 'ring-2 ring-indigo-500 bg-indigo-50 shadow-inner z-10';
    if (filtroRol) {
      const hasRole = asignados.some(empId => {
        const emp = usuariosDB.find(u => String(u.id) === String(empId));
        return emp && emp.rol === filtroRol;
      });
      if (hasRole) return 'ring-2 ring-purple-500 bg-purple-50 shadow-inner z-10';
    }
    return 'opacity-30 grayscale pointer-events-none';
  };

  // MODAL DE ASIGNACIÓN (INDIVIDUAL Y MASIVA)
  const renderModalAsignacion = () => {
    if (!modalCelda && !modalMasivo) return null;
    const isMasivo = !!modalMasivo;
    const data = modalCelda || modalMasivo;

    const toggleEmpleado = (empId) => {
      const stringId = String(empId);
      const nuevos = data.seleccionados.includes(stringId) 
        ? data.seleccionados.filter(id => id !== stringId) 
        : [...data.seleccionados, stringId];

      if (isMasivo) setModalMasivo({ ...modalMasivo, seleccionados: nuevos });
      else setModalCelda({ ...modalCelda, seleccionados: nuevos });
    };

    const guardarAsignacion = () => {
      setHayCambiosSinGuardar(true);
      const obsNombre = data.obsNombre;

      if (isMasivo) {
        const nuevasAsignaciones = { ...asignaciones };
        if (!nuevasAsignaciones[obsNombre]) nuevasAsignaciones[obsNombre] = {};
        let count = 0;

        diasMes.forEach(d => {
          if (!diasCerrados.includes(d.fechaStr)) {
            // Filtrar inteligentemente: No asignar en sus días de descanso
            const asignables = data.seleccionados.filter(empId => {
              const emp = empleadosVisibles.find(u => String(u.id) === String(empId));
              if (!emp) return false;
              const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
              const descansos = pres.dias_descanso || [];
              return !descansos.includes(d.nombreCompleto);
            });
            nuevasAsignaciones[obsNombre][d.fechaStr] = asignables;
            count++;
          }
        });

        setAsignaciones(nuevasAsignaciones);
        setModalMasivo(null);
        showAlert('Éxito', `Asignado a ${count} días. Se omitieron automáticamente los días de descanso de cada empleado. ¡Recuerda Guardar!`, 'success');
      } else {
        setAsignaciones(prev => ({
          ...prev,
          [obsNombre]: { ...(prev[obsNombre] || {}), [data.fechaStr]: data.seleccionados }
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
          
          <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-6 space-y-2 custom-scrollbar">
            {empleadosVisibles.map(emp => {
              const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
              const descansos = pres.dias_descanso || [];
              const esDescanso = !isMasivo && descansos.includes(data.nombreDiaCompleto);

              if (esDescanso) {
                return (
                  <div key={emp.id} className="flex items-center p-3 rounded-xl border border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed">
                    <div className="w-5 h-5 rounded border-slate-300 ml-2 flex items-center justify-center bg-slate-200"><Lock size={12} className="text-slate-400"/></div>
                    <div className="ml-4">
                      <p className="font-black text-slate-500 text-sm leading-tight line-through">{emp.nombre}</p>
                      <p className="font-bold text-rose-500 text-[10px] uppercase tracking-wider">En Descanso ({data.nombreDiaCompleto})</p>
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
          </div>

          <div className="flex gap-3 shrink-0">
            <button onClick={() => isMasivo ? setModalMasivo(null) : setModalCelda(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">Cancelar</button>
            <button onClick={guardarAsignacion} className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/30 transition active:scale-95">Aplicar y Cerrar</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
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
            <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-xl shadow-sm">
              <Filter size={14} className="text-slate-400" />
              <select value={filtroEmpleado} onChange={e => {setFiltroEmpleado(e.target.value); setFiltroRol('');}} className="bg-transparent font-bold text-xs text-slate-700 outline-none cursor-pointer">
                <option value="">Todos los Empleados</option>
                {empleadosVisibles.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
              </select>
              <span className="text-slate-300 font-bold hidden sm:inline">|</span>
              <select value={filtroRol} onChange={e => {setFiltroRol(e.target.value); setFiltroEmpleado('');}} className="bg-transparent font-bold text-xs text-slate-700 outline-none cursor-pointer">
                <option value="">Todos los Roles</option>
                {rolesDisponibles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            
            <form onSubmit={agregarObservacion} className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <input type="text" value={nuevaObservacion} onChange={(e) => setNuevaObservacion(e.target.value)} placeholder="Ej. Uso de Uniforme..." className="w-full sm:w-48 bg-white border border-indigo-200 rounded-xl px-4 py-2 outline-none focus:border-indigo-500 font-bold text-indigo-900 shadow-sm text-sm" />
              <button type="submit" disabled={!nuevaObservacion.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-black transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"><Plus size={18}/></button>
            </form>
          </div>
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="w-full max-w-full overflow-x-auto border border-slate-200 rounded-3xl mb-8 custom-scrollbar">
          {observacionesBase.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <ClipboardCheck size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-bold text-lg">Aún no hay observaciones registradas.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                  <th className="p-4 border-r border-slate-200 w-56 sticky left-0 bg-slate-100 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Observación / Regla</th>
                  {diasMes.map(d => (
                    <th key={d.fechaStr} className="p-3 text-center border-r border-slate-200 min-w-[140px]">
                      <div className={`text-xs font-black p-1.5 rounded-lg ${d.nombreBreve.startsWith('S') || d.nombreBreve.startsWith('D') ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
                        {d.num} {d.nombreBreve}
                      </div>
                    </th>
                  ))}
                  <th className="p-4 text-center w-24 sticky right-0 bg-slate-100 z-30 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {observacionesBase.map((obsNombre) => (
                  <tr key={obsNombre} className="border-b border-slate-100 bg-white transition">
                    <td className="p-4 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-slate-800 uppercase tracking-wider text-[11px] leading-tight pr-2">{obsNombre}</span>
                        <button onClick={() => eliminarObservacion(obsNombre)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0"><Trash2 size={16}/></button>
                      </div>
                    </td>
                    
                    {diasMes.map(d => {
                      const isCerrado = diasCerrados.includes(d.fechaStr);
                      const highlightClass = getCellHighlight(obsNombre, d.fechaStr);
                      const asignados = asignaciones[obsNombre]?.[d.fechaStr] || [];

                      return (
                        <td key={d.fechaStr} className={`p-2 border-r border-slate-100 align-top transition-all ${isCerrado ? 'bg-slate-100/50 opacity-80' : ''} ${highlightClass}`}>
                          {isCerrado ? (
                            <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-3 h-full shadow-inner min-h-[90px]">
                              <Lock size={16} className="text-slate-400 mb-1" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Auditoría<br/>Cerrada</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 h-full">
                              
                              <button onClick={() => setModalCelda({ obsNombre, fechaStr: d.fechaStr, nombreDiaCompleto: d.nombreCompleto, seleccionados: asignados })} className={`w-full py-2 px-2 rounded-xl text-[10px] font-black tracking-wider flex items-center justify-center gap-1.5 border transition-all active:scale-95 ${asignados.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm' : 'bg-white border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-slate-50'}`}>
                                <Users size={12}/> {asignados.length > 0 ? `${asignados.length} Asignados` : 'Asignar'}
                              </button>

                              {asignados.length > 0 && (
                                <div className="mt-auto border-t border-slate-100 pt-2 space-y-2 w-full">
                                  {asignados.map(empId => {
                                    const emp = empleadosVisibles.find(u => String(u.id) === String(empId));
                                    if(!emp) return null;
                                    
                                    const evalObj = evaluaciones[obsNombre]?.[d.fechaStr] || {};
                                    const status = evalObj[empId];

                                    return (
                                      <div key={empId} className="flex flex-col gap-1 p-2 bg-slate-50 border border-slate-200 rounded-xl shadow-sm w-full">
                                        <span className="text-[10px] font-black text-slate-700 truncate w-full text-center mb-1">{emp.nombre.split(' ')[0]}</span>
                                        
                                        {!status ? (
                                          <div className="flex gap-1 w-full">
                                            <button onClick={() => evaluarObservacion(obsNombre, d.fechaStr, String(empId), 'cumplio')} className="flex-1 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white text-[9px] py-1.5 rounded-md font-black shadow-sm transition-all">SÍ</button>
                                            <button onClick={() => evaluarObservacion(obsNombre, d.fechaStr, String(empId), 'no_cumplio')} className="flex-1 bg-white text-red-600 border border-red-200 hover:bg-red-500 hover:text-white text-[9px] py-1.5 rounded-md font-black shadow-sm transition-all">NO</button>
                                          </div>
                                        ) : (
                                          <div className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md font-black text-[9px] uppercase tracking-wider shadow-sm ${status === 'cumplio' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                            <span>{status === 'cumplio' ? '✅ Cumplió' : '❌ Falló'}</span>
                                            <button onClick={() => evaluarObservacion(obsNombre, d.fechaStr, String(empId), null)} className="opacity-80 hover:opacity-100 bg-black/20 p-1 rounded"><RotateCcw size={10}/></button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    
                    {/* ACCIÓN MASIVA PARA EL MES COMPLETO */}
                    <td className="p-2 text-center sticky right-0 bg-white z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l border-slate-100 align-middle">
                      <button onClick={() => setModalMasivo({ obsNombre, seleccionados: [] })} className="p-3 bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-200 rounded-xl transition shadow-sm" title="Asignar masivamente al mes">
                        <Calendar size={18}/>
                      </button>
                    </td>

                  </tr>
                ))}
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