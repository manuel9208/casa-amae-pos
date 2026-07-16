import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Sparkles, Lock, Trash2, Save, RotateCcw, ChevronLeft, ChevronRight, Users, Filter } from 'lucide-react';

const ZonasLimpieza = ({ usuariosDB, apiUrl, showAlert, showConfirm }) => {
  const [fechaReferencia, setFechaReferencia] = useState(new Date());
  
  // NUEVA ESTRUCTURA DE DATOS
  const [areasBase, setAreasBase] = useState([]); 
  const [asignaciones, setAsignaciones] = useState({});
  const [evidencias, setEvidencias] = useState({});
  const [evaluaciones, setEvaluaciones] = useState({});
  const [diasCerrados, setDiasCerrados] = useState([]);
  
  const [nuevaArea, setNuevaArea] = useState('');
  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false);

  // FILTROS
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  // MODALES DE ASIGNACIÓN (Checks)
  const [modalCelda, setModalCelda] = useState(null);
  const [modalMasivo, setModalMasivo] = useState(null);
  
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const empleadosVisibles = usuariosDB || [];
  const rolesDisponibles = [...new Set(empleadosVisibles.map(u => u.rol).filter(Boolean))];

  // PROTECCIÓN CONTRA CIERRE ACCIDENTAL
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hayCambiosSinGuardar) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hayCambiosSinGuardar]);

  // 🗓️ LÓGICA DE CALENDARIO DINÁMICO
  const year = fechaReferencia.getFullYear();
  const month = fechaReferencia.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const diasMes = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    const nombre = date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '');
    return { num: i + 1, nombre, fechaStr };
  });

  const mesNombre = fechaReferencia.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();

  const cambiarMes = (direccion) => {
    setFechaReferencia(new Date(year, month + direccion, 1));
  };

  // 🔄 CARGA Y MIGRACIÓN DE DATOS
  useEffect(() => {
    fetch(`${apiUrl}/configuracion`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error && data.matriz_limpieza) {
          const matriz = typeof data.matriz_limpieza === 'string' ? JSON.parse(data.matriz_limpieza) : data.matriz_limpieza;
          
          if (matriz.areasBase) {
            setAreasBase(matriz.areasBase);
            setAsignaciones(matriz.asignaciones || {});
          } else if (matriz.areas) {
            // MIGRACIÓN AUTOMÁTICA DEL FORMATO VIEJO AL NUEVO
            const nuevasAreasBase = [];
            const nuevasAsignaciones = {};

            matriz.areas.forEach(oldStr => {
              const parts = oldStr.split(' - ');
              const nombre = parts[0];
              const turno = parts[1] || 'General';

              let area = nuevasAreasBase.find(a => a.id === nombre);
              if (!area) {
                area = { id: nombre, nombre: nombre, turnos: [] };
                nuevasAreasBase.push(area);
              }
              if (!area.turnos.includes(turno)) area.turnos.push(turno);

              if (matriz.asignaciones && matriz.asignaciones[oldStr]) {
                const newKey = `${nombre}_${turno}`;
                nuevasAsignaciones[newKey] = {};
                Object.keys(matriz.asignaciones[oldStr]).forEach(fecha => {
                  nuevasAsignaciones[newKey][fecha] = [String(matriz.asignaciones[oldStr][fecha])];
                });
              }
            });
            setAreasBase(nuevasAreasBase);
            setAsignaciones(nuevasAsignaciones);
          }

          setEvidencias(matriz.evidencias || {});
          setEvaluaciones(matriz.evaluaciones || {});
          setDiasCerrados(matriz.dias_cerrados || []);
        }
      })
      .catch(() => {});
  }, [apiUrl]);

  // ➕ AGREGAR ÁREA BASE
  const agregarArea = (e) => {
    e.preventDefault();
    const areaNombre = nuevaArea.trim();
    if (!areaNombre) return;

    if (!areasBase.find(a => a.id.toLowerCase() === areaNombre.toLowerCase())) {
      setHayCambiosSinGuardar(true);
      setAreasBase([...areasBase, { id: areaNombre, nombre: areaNombre, turnos: [] }]);
      setNuevaArea('');
    } else {
      showAlert('Aviso', 'Esta área ya existe en la lista.', 'warning');
    }
  };

  const eliminarArea = (areaId) => {
    showConfirm("Eliminar Área", `¿Seguro que deseas eliminar "${areaId}"? Se perderá su historial.`, () => {
      setHayCambiosSinGuardar(true);
      setAreasBase(prev => prev.filter(a => a.id !== areaId));
    });
  };  

  // TOGGLE DE TURNOS (4 CHECKS POR TAREA)
  const toggleTurno = (areaId, turno) => {
    setHayCambiosSinGuardar(true);
    setAreasBase(prev => prev.map(a => {
      if (a.id === areaId) {
        const turnos = a.turnos.includes(turno) ? a.turnos.filter(t => t !== turno) : [...a.turnos, turno];
        return { ...a, turnos };
      }
      return a;
    }));
  };

  const evaluarLimpieza = (areaId, turno, fechaStr, status) => {
    if (diasCerrados.includes(fechaStr)) return;
    setHayCambiosSinGuardar(true);
    const clave = `${areaId}_${turno}`;
    setEvaluaciones(prev => ({
      ...prev,
      [clave]: { ...(prev[clave] || {}), [fechaStr]: status }
    }));
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

  const realizarCorteLimpieza = () => {
    if (!fechaDesde || !fechaHasta) return showAlert("Aviso", "Selecciona el rango para auditoría.", "info");
    if (fechaDesde > fechaHasta) return showAlert("Aviso", "'Desde' no puede ser mayor que 'Hasta'.", "warning");  
    const fechasRango = obtenerRangoFechas(fechaDesde, fechaHasta);  
    
    showConfirm("🔒 Corte de Limpieza", `Bloquearás las áreas desde el ${fechaDesde} hasta el ${fechaHasta}.`, async () => {
      setIsSubmitting(true);
      try {
        const resConfig = await fetch(`${apiUrl}/configuracion`);
        let matrizActual = {};
        if (resConfig.ok) {
          const dataConfig = await resConfig.json();
          matrizActual = typeof dataConfig.matriz_limpieza === 'string' ? JSON.parse(dataConfig.matriz_limpieza || '{}') : (dataConfig.matriz_limpieza || {});
        }  
        const nuevosDiasCerrados = [...new Set([...diasCerrados, ...fechasRango])];  
        const payload = { ...matrizActual, areasBase, asignaciones, evidencias, evaluaciones, dias_cerrados: nuevosDiasCerrados };
        const formData = new FormData();
        formData.append('matriz_limpieza', JSON.stringify(payload));  
        
        const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
        if (res.ok) {
          setDiasCerrados(nuevosDiasCerrados);
          setHayCambiosSinGuardar(false);
          showAlert("Éxito", "Auditoría bloqueada y matriz guardada.", "success");
        }
      } catch (error) { showAlert("Error", "Fallo de conexión.", "error"); }
      setIsSubmitting(false);
    });
  };  

  const guardarMatriz = async () => {
    setIsSubmitting(true);
    try {
      const resConfig = await fetch(`${apiUrl}/configuracion`);
      let matrizActual = {};
      if (resConfig.ok) {
        const dataConfig = await resConfig.json();
        matrizActual = typeof dataConfig.matriz_limpieza === 'string' ? JSON.parse(dataConfig.matriz_limpieza || '{}') : (dataConfig.matriz_limpieza || {});
      }  
      const payload = { ...matrizActual, areasBase, asignaciones, evidencias, evaluaciones, dias_cerrados: diasCerrados };
      const formData = new FormData();
      formData.append('matriz_limpieza', JSON.stringify(payload));  
      
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) {
        setHayCambiosSinGuardar(false);
        showAlert('¡Guardado!', 'Todos los turnos y asignaciones fueron salvados en la base de datos.', 'success');
      } else {
        showAlert('Error', 'No se pudo guardar la matriz.', 'error');
      }
    } catch (error) { showAlert('Error', 'Error de red al guardar.', 'error'); }
    setIsSubmitting(false);
  };  

  // LÓGICA DE RESALTADO POR FILTROS
  const getCellHighlight = (areaId, turno, fechaStr) => {
    const asignados = asignaciones[`${areaId}_${turno}`]?.[fechaStr] || [];
    if (!filtroEmpleado && !filtroRol) return ''; 

    if (filtroEmpleado && asignados.includes(filtroEmpleado)) return 'ring-2 ring-blue-500 bg-blue-50 shadow-inner z-10';
    if (filtroRol) {
      const hasRole = asignados.some(empId => {
        const emp = usuariosDB.find(u => String(u.id) === String(empId));
        return emp && emp.rol === filtroRol;
      });
      if (hasRole) return 'ring-2 ring-purple-500 bg-purple-50 shadow-inner z-10';
    }
    return 'opacity-30 grayscale pointer-events-none'; 
  };

  // RENDERIZADO DEL MODAL (Checks de Empleados)
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
      const clave = `${data.areaId}_${data.turno}`;

      if (isMasivo) {
        const nuevasAsignaciones = { ...asignaciones };
        if (!nuevasAsignaciones[clave]) nuevasAsignaciones[clave] = {};
        let count = 0;
        diasMes.forEach(d => {
          if (!diasCerrados.includes(d.fechaStr)) {
            nuevasAsignaciones[clave][d.fechaStr] = data.seleccionados;
            count++;
          }
        });
        setAsignaciones(nuevasAsignaciones);
        setModalMasivo(null);
        showAlert('Éxito', `Asignado a ${count} días. ¡Recuerda pulsar Guardar!`, 'success');
      } else {
        setAsignaciones(prev => ({
          ...prev,
          [clave]: { ...(prev[clave] || {}), [data.fechaStr]: data.seleccionados }
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
          <p className="text-sm font-bold text-blue-600 mb-6 bg-blue-50 px-4 py-2 rounded-xl w-fit mt-2 border border-blue-100">
            {data.areaId} - Turno {data.turno}
          </p>

          <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-6 space-y-2 custom-scrollbar">
            {empleadosVisibles.map(emp => (
              <label key={emp.id} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all shadow-sm ${data.seleccionados.includes(String(emp.id)) ? 'bg-white border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                <input type="checkbox" checked={data.seleccionados.includes(String(emp.id))} onChange={() => toggleEmpleado(emp.id)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ml-2" />
                <div className="ml-4">
                  <p className="font-black text-slate-800 text-sm leading-tight">{emp.nombre}</p>
                  <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">{emp.rol}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 shrink-0">
            <button onClick={() => isMasivo ? setModalMasivo(null) : setModalCelda(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">Cancelar</button>
            <button onClick={guardarAsignacion} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 transition active:scale-95">Aplicar y Cerrar</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white p-4 md:p-8 rounded-[32px] shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4 w-full max-w-full">
        
        {/* ENCABEZADO Y FILTROS */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8 bg-teal-50 p-6 rounded-3xl border border-teal-100">
          
          <div className="flex items-center gap-4">
            <div className="bg-teal-500 text-white p-3 rounded-2xl shadow-md">
              <Calendar size={28}/>
            </div>
            <div className="flex flex-col">
              <h3 className="text-2xl font-black text-teal-900 tracking-tight">Limpieza Mensual</h3>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => cambiarMes(-1)} className="p-1 hover:bg-teal-200 rounded-full text-teal-700 transition active:scale-90"><ChevronLeft size={18}/></button>
                <p className="text-teal-700 font-black text-sm uppercase tracking-widest min-w-[130px] text-center select-none">{mesNombre} {year}</p>
                <button onClick={() => cambiarMes(1)} className="p-1 hover:bg-teal-200 rounded-full text-teal-700 transition active:scale-90"><ChevronRight size={18}/></button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row w-full xl:w-auto gap-4">
            {/* NUEVOS FILTROS POR EMPLEADO/ROL */}
            <div className="flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-2xl border border-teal-200 shadow-sm">
              <div className="flex items-center gap-2 pl-2">
                <Filter size={16} className="text-teal-600 shrink-0"/>
              </div>
              <select value={filtroEmpleado} onChange={e => {setFiltroEmpleado(e.target.value); setFiltroRol('');}} className="bg-transparent font-bold text-xs text-slate-700 outline-none cursor-pointer py-2 px-1">
                <option value="">Todos los Empleados</option>
                {empleadosVisibles.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
              <div className="hidden sm:block w-px h-6 bg-slate-200 my-auto"></div>
              <select value={filtroRol} onChange={e => {setFiltroRol(e.target.value); setFiltroEmpleado('');}} className="bg-transparent font-bold text-xs text-slate-700 outline-none cursor-pointer py-2 px-1">
                <option value="">Todos los Roles</option>
                {rolesDisponibles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* AGREGAR TAREA */}
            <form onSubmit={agregarArea} className="flex flex-col sm:flex-row gap-2">
              <input type="text" value={nuevaArea} onChange={(e) => setNuevaArea(e.target.value)} placeholder="Nueva Tarea (Ej. Baño)..." className="w-full sm:w-48 bg-white border border-teal-200 rounded-2xl px-4 py-3 outline-none focus:border-teal-500 font-bold text-teal-900 shadow-sm" />
              <button type="submit" disabled={!nuevaArea.trim()} className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-2xl font-black transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-teal-500/20"><Plus size={20}/> <span className="hidden sm:inline">Agregar</span></button>
            </form>
          </div>
        </div>  

        {/* TABLA PRINCIPAL */}
        <div className="w-full max-w-full overflow-x-auto border border-slate-200 rounded-3xl mb-8 custom-scrollbar">
          {areasBase.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Sparkles size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-bold text-lg">Aún no hay tareas registradas.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                  <th className="p-4 border-r border-slate-200 w-56 sticky left-0 bg-slate-100 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Tarea / Turnos</th>
                  {diasMes.map(d => (
                    <th key={d.fechaStr} className="p-3 text-center border-r border-slate-200 min-w-[140px]">
                      <div className={`text-xs font-black p-1.5 rounded-lg ${d.nombre.startsWith('S') || d.nombre.startsWith('D') ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>{d.num} {d.nombre}</div>
                    </th>
                  ))}
                  <th className="p-4 text-center w-24 sticky right-0 bg-slate-100 z-30 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {areasBase.map((area) => (
                  <React.Fragment key={area.id}>
                    {/* FILA PRINCIPAL: TAREA Y SUS 4 CHECKS */}
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <td className="p-4 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-slate-200">
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-black text-slate-800 uppercase tracking-wider text-sm">{area.nombre}</span>
                          <button onClick={() => eliminarArea(area.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                          {['General', 'Mañana', 'Tarde', 'Noche'].map(t => (
                            <label key={t} className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors">
                              <input type="checkbox" checked={area.turnos.includes(t)} onChange={() => toggleTurno(area.id, t)} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"/>
                              {t}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td colSpan={diasMes.length + 1} className="bg-slate-50">
                        {area.turnos.length === 0 && <p className="text-xs text-slate-400 font-bold pl-6 flex items-center gap-2"><Lock size={14}/> Activa un turno a la izquierda para poder asignar personal.</p>}
                      </td>
                    </tr>

                    {/* SUB-FILAS POR CADA TURNO ACTIVADO */}
                    {area.turnos.map(turno => (
                      <tr key={`${area.id}_${turno}`} className="border-b border-slate-100 bg-white transition">
                        <td className="p-3 pl-8 sticky left-0 bg-white z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-slate-100 font-black text-blue-600 text-[11px] uppercase tracking-widest">
                          ↳ Turno {turno}
                        </td>
                        
                        {diasMes.map(d => {
                          const isCerrado = diasCerrados.includes(d.fechaStr);
                          const highlightClass = getCellHighlight(area.id, turno, d.fechaStr);
                          const asignados = asignaciones[`${area.id}_${turno}`]?.[d.fechaStr] || [];

                          return (
                            <td key={d.fechaStr} className={`p-2 border-r border-slate-100 align-top transition-all ${isCerrado ? 'bg-slate-100/50 opacity-80' : ''} ${highlightClass}`}>
                              {isCerrado ? (
                                <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-3 h-full shadow-inner min-h-[90px]">
                                  <Lock size={16} className="text-slate-400 mb-1" />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Auditoría<br/>Cerrada</span>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1.5 h-full">
                                  {/* BOTÓN ASIGNAR MODAL */}
                                  <button onClick={() => setModalCelda({ areaId: area.id, turno, fechaStr: d.fechaStr, seleccionados: asignados })} className={`w-full py-2 px-2 rounded-xl text-[10px] font-black tracking-wider flex items-center justify-center gap-1.5 border transition-all active:scale-95 ${asignados.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-sm' : 'bg-white border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-slate-50'}`}>
                                    <Users size={12}/> {asignados.length > 0 ? `${asignados.length} Seleccionados` : 'Asignar'}
                                  </button>

                                  {/* BUBBLES DE NOMBRES */}
                                  {asignados.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {asignados.map(empId => {
                                        const emp = empleadosVisibles.find(u => String(u.id) === String(empId));
                                        if(!emp) return null;
                                        return <span key={empId} className="bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded shadow-sm whitespace-nowrap">{emp.nombre.split(' ')[0]}</span>
                                      })}
                                    </div>
                                  )}

                                  {/* EVIDENCIAS Y EVALUACIÓN DE LA TAREA */}
                                  {asignados.length > 0 && (
                                    <div className="mt-auto border-t border-slate-100 pt-2 space-y-2">
                                      {evidencias[`${area.id}_${turno}`]?.[d.fechaStr] ? (
                                        <a href={evidencias[`${area.id}_${turno}`][d.fechaStr]} target="_blank" rel="noreferrer" className="block w-full h-12 rounded-lg overflow-hidden border border-slate-200 relative group/foto">
                                          <img src={evidencias[`${area.id}_${turno}`][d.fechaStr]} alt="Evidencia" className="w-full h-full object-cover" />
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/foto:opacity-100 flex items-center justify-center transition-opacity"><span className="text-[9px] text-white font-black tracking-widest uppercase">Ver Foto</span></div>
                                        </a>
                                      ) : (
                                        <div className="h-8 border border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50/50"><span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest px-2">Sin Foto</span></div>
                                      )}

                                      {!evaluaciones[`${area.id}_${turno}`]?.[d.fechaStr] ? (
                                        <div className="flex gap-1 w-full">
                                          <button onClick={() => evaluarLimpieza(area.id, turno, d.fechaStr, 'cumplio')} className="flex-1 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white text-[9px] py-1.5 rounded-md font-black shadow-sm transition-all">SÍ</button>
                                          <button onClick={() => evaluarLimpieza(area.id, turno, d.fechaStr, 'no_cumplio')} className="flex-1 bg-white text-red-600 border border-red-200 hover:bg-red-500 hover:text-white text-[9px] py-1.5 rounded-md font-black shadow-sm transition-all">NO</button>
                                        </div>
                                      ) : (
                                        <div className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md font-black text-[9px] uppercase tracking-wider shadow-sm ${evaluaciones[`${area.id}_${turno}`][d.fechaStr] === 'cumplio' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                          <span>{evaluaciones[`${area.id}_${turno}`][d.fechaStr] === 'cumplio' ? '✅ Cumplió' : '❌ Falló'}</span>
                                          <button onClick={() => evaluarLimpieza(area.id, turno, d.fechaStr, null)} className="opacity-80 hover:opacity-100 bg-black/20 p-1 rounded"><RotateCcw size={10}/></button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* ACCIÓN MASIVA PARA ESTE TURNO */}
                        <td className="p-2 text-center sticky right-0 bg-white z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l border-slate-100 align-middle">
                          <button onClick={() => setModalMasivo({ areaId: area.id, turno, seleccionados: [] })} className="p-3 bg-white hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-200 rounded-xl transition shadow-sm" title="Asignar masivamente al mes">
                            <Calendar size={18}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>  

        {/* ZONA INFERIOR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <div className="flex flex-col lg:flex-row items-center gap-4 w-full md:w-auto">
            {areasBase.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 w-full sm:w-auto">
                  <div className="flex flex-col px-2"><label className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Desde</label><input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="bg-transparent text-slate-700 font-bold text-xs outline-none cursor-pointer" /></div>
                  <span className="text-slate-300 font-black">-</span>
                  <div className="flex flex-col px-2"><label className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Hasta</label><input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="bg-transparent text-slate-700 font-bold text-xs outline-none cursor-pointer" /></div>
                </div>  
                <button onClick={realizarCorteLimpieza} disabled={isSubmitting || !fechaDesde || !fechaHasta} className="w-full sm:w-auto text-sm font-bold flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl transition shadow-sm bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer active:scale-95 disabled:opacity-50"><Lock size={18}/> Cerrar Auditoría</button>
              </div>
            )}
          </div>
          
          <button
            onClick={guardarMatriz}
            disabled={isSubmitting || !hayCambiosSinGuardar}
            className={`w-full md:w-auto px-10 py-4 rounded-2xl font-black transition active:scale-95 shadow-xl flex items-center justify-center gap-2 text-lg ${hayCambiosSinGuardar ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30 animate-pulse border-none' : 'bg-slate-900 text-teal-400 disabled:opacity-50'}`}
          >
            <Save size={24}/> {isSubmitting ? 'Guardando...' : hayCambiosSinGuardar ? '¡Guardar Cambios!' : 'Guardado'}
          </button>
        </div>
      </div>

      {/* RENDER MODAL ASIGNACIONES */}
      {renderModalAsignacion()}
    </>
  );
};  

export default ZonasLimpieza;