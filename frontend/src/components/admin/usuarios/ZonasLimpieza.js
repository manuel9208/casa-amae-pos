import React, { useState, useEffect } from 'react';
import { Sparkles, Trash2, Users, Plus, Lock, Camera, Calendar, RotateCcw, Save, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const ZonasLimpieza = ({ usuariosDB, apiUrl, showAlert, showConfirm }) => {
  const [fechaReferencia, setFechaReferencia] = useState(new Date());

  // ESTRUCTURA DE DATOS
  const [areasBase, setAreasBase] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [evidencias, setEvidencias] = useState({});
  const [evaluaciones, setEvaluaciones] = useState({});
  const [diasCerrados, setDiasCerrados] = useState([]);
  const [nuevaArea, setNuevaArea] = useState('');
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

  const diasMes = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    const nombre = date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '');
    return { num: i + 1, nombre, fechaStr, dayIndex: date.getDay() }; // dayIndex: 0=Dom, 1=Lun, etc.
  });

  const mesNombre = fechaReferencia.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();

  const cambiarMes = (direccion) => {
    setFechaReferencia(new Date(year, month + direccion, 1));
  };

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
              if (!area) { area = { id: nombre, nombre: nombre, turnos: [] }; nuevasAreasBase.push(area); }
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

          // AUTO-MIGRACIÓN DE EVIDENCIAS Y EVALUACIONES (Global -> Individual)
          if (matriz.evaluaciones) {
            let nuevasEval = {};
            Object.keys(matriz.evaluaciones).forEach(clave => {
              nuevasEval[clave] = {};
              Object.keys(matriz.evaluaciones[clave]).forEach(fecha => {
                const val = matriz.evaluaciones[clave][fecha];
                if (typeof val === 'string') {
                  const asignados = matriz.asignaciones?.[clave]?.[fecha] || [];
                  nuevasEval[clave][fecha] = {};
                  asignados.forEach(empId => nuevasEval[clave][fecha][empId] = val);
                } else {
                  nuevasEval[clave][fecha] = val;
                }
              });
            });
            setEvaluaciones(nuevasEval);
          } else {
            setEvaluaciones({});
          }

          if (matriz.evidencias) {
            let nuevasEvi = {};
            Object.keys(matriz.evidencias).forEach(clave => {
              nuevasEvi[clave] = {};
              Object.keys(matriz.evidencias[clave]).forEach(fecha => {
                const val = matriz.evidencias[clave][fecha];
                if (typeof val === 'string') {
                  const asignados = matriz.asignaciones?.[clave]?.[fecha] || [];
                  nuevasEvi[clave][fecha] = {};
                  if (asignados.length > 0) nuevasEvi[clave][fecha][asignados[0]] = val;
                } else {
                  nuevasEvi[clave][fecha] = val;
                }
              });
            });
            setEvidencias(nuevasEvi);
          } else {
            setEvidencias({});
          }

          setDiasCerrados(matriz.dias_cerrados || []);
        }
      })
      .catch(() => {});
  }, [apiUrl]);

  // ➕ AGREGAR / ELIMINAR ÁREA
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

  // TOGGLE DE TURNOS
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

  // EVALUACIÓN A NIVEL EMPLEADO (LÓGICA INDIVIDUAL)
  const evaluarLimpieza = (areaId, turno, fechaStr, empId, status) => {
    if (diasCerrados.includes(fechaStr)) return;
    setHayCambiosSinGuardar(true);
    const clave = `${areaId}_${turno}`;
    setEvaluaciones(prev => {
      const prevArea = prev[clave] || {};
      const prevFecha = prevArea[fechaStr] || {};
      
      // Si status es null, borramos la evaluación de ese empleado
      if (status === null) {
        const newFecha = { ...prevFecha };
        delete newFecha[empId];
        return {
          ...prev,
          [clave]: { ...prevArea, [fechaStr]: newFecha }
        };
      }

      return {
        ...prev,
        [clave]: { ...prevArea, [fechaStr]: { ...prevFecha, [empId]: status } }
      };
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

  // 🧹 CORTE DE AUDITORÍA Y PURGA DE IMÁGENES
  const realizarCorteLimpieza = () => {
    if (!fechaDesde || !fechaHasta) return showAlert("Aviso", "Selecciona el rango para auditoría.", "info");
    if (fechaDesde > fechaHasta) return showAlert("Aviso", "'Desde' no puede ser mayor que 'Hasta'.", "warning");
    const fechasRango = obtenerRangoFechas(fechaDesde, fechaHasta);

    showConfirm(
      "🔒 Corte de Limpieza", 
      `Bloquearás las áreas desde el ${fechaDesde} hasta el ${fechaHasta}. Las fotos de este periodo se borrarán de la nube para liberar espacio.`, 
      async () => {
        setIsSubmitting(true);
        try {
          let urlsToDelete = [];
          let nuevasEvidencias = JSON.parse(JSON.stringify(evidencias));

          Object.keys(nuevasEvidencias).forEach(clave => {
            fechasRango.forEach(fecha => {
              if (nuevasEvidencias[clave][fecha]) {
                Object.values(nuevasEvidencias[clave][fecha]).forEach(url => {
                  if (url) urlsToDelete.push(url);
                });
                delete nuevasEvidencias[clave][fecha]; 
              }
            });
          });

          if (urlsToDelete.length > 0) {
            fetch(`${apiUrl}/configuracion/eliminar-archivos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ urls: urlsToDelete })
            }).catch(() => console.warn("Petición de borrado a Cloudinary omitida o fallida."));
          }

          const resConfig = await fetch(`${apiUrl}/configuracion`);
          let matrizActual = {};
          if (resConfig.ok) {
            const dataConfig = await resConfig.json();
            matrizActual = typeof dataConfig.matriz_limpieza === 'string' ? JSON.parse(dataConfig.matriz_limpieza || '{}') : (dataConfig.matriz_limpieza || {});
          }

          const nuevosDiasCerrados = [...new Set([...diasCerrados, ...fechasRango])];
          const payload = { 
            ...matrizActual, 
            areasBase, 
            asignaciones, 
            evidencias: nuevasEvidencias, 
            evaluaciones, 
            dias_cerrados: nuevosDiasCerrados 
          };

          const formData = new FormData();
          formData.append('matriz_limpieza', JSON.stringify(payload));

          const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
          if (res.ok) {
            setDiasCerrados(nuevosDiasCerrados);
            setEvidencias(nuevasEvidencias);
            setHayCambiosSinGuardar(false);
            showAlert("Éxito", "Auditoría bloqueada, fotos purgadas y matriz guardada.", "success");
          }
        } catch (error) { 
          showAlert("Error", "Fallo de conexión.", "error"); 
        }
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
    } catch (error) { 
      showAlert('Error', 'Error de red al guardar.', 'error'); 
    }
    setIsSubmitting(false);
  };

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

    const toggleDiaSemana = (dayIndex) => {
      if (!isMasivo) return;
      const nuevosDias = data.diasSemana.includes(dayIndex)
        ? data.diasSemana.filter(d => d !== dayIndex)
        : [...data.diasSemana, dayIndex];
      setModalMasivo({ ...modalMasivo, diasSemana: nuevosDias });
    };

    const diasSemanaNombres = [
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
      const clave = `${data.areaId}_${data.turno}`;

      if (isMasivo) {
        const nuevasAsignaciones = { ...asignaciones };
        if (!nuevasAsignaciones[clave]) nuevasAsignaciones[clave] = {};
        let count = 0;
        
        diasMes.forEach(d => {
          // Operamos solo si el día no está cerrado por auditoría
          if (!diasCerrados.includes(d.fechaStr)) {
            
            if (data.diasSemana.includes(d.dayIndex)) {
              // 1. Si el día ESTÁ marcado, asignamos a los empleados seleccionados (Sobrescribe)
              nuevasAsignaciones[clave][d.fechaStr] = data.seleccionados;
              count++;
            } else {
              // 2. Si el día NO ESTÁ marcado, eliminamos a estos empleados en específico de ese día.
              // (Así corregimos automáticamente si los habías asignado por error a toda la semana)
              if (nuevasAsignaciones[clave][d.fechaStr]) {
                nuevasAsignaciones[clave][d.fechaStr] = nuevasAsignaciones[clave][d.fechaStr].filter(
                  empId => !data.seleccionados.includes(empId)
                );
              }
            }
            
          }
        });
        
        setAsignaciones(nuevasAsignaciones);
        setModalMasivo(null);
        showAlert('Éxito', `Asignado a ${count} días. Se limpiaron los días no marcados. ¡Recuerda Guardar!`, 'success');
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
          <p className="text-sm font-bold text-blue-600 mb-4 bg-blue-50 px-4 py-2 rounded-xl w-fit mt-2 border border-blue-100">
            {data.areaId} - Turno {data.turno}
          </p>

          {isMasivo && (
            <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">
                Repetir cada semana los días:
              </label>
              <div className="flex justify-between gap-1 sm:gap-2">
                {diasSemanaNombres.map(ds => {
                  const isSelected = data.diasSemana.includes(ds.idx);
                  return (
                    <button
                      key={ds.idx}
                      type="button"
                      onClick={() => toggleDiaSemana(ds.idx)}
                      className={`flex-1 py-2 rounded-lg font-black text-[10px] sm:text-xs transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md transform scale-105'
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
          
          <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-6 space-y-2 custom-scrollbar">
            {empleadosVisibles.map(emp => (
              <label key={emp.id} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all shadow-sm ${data.seleccionados.includes(String(emp.id)) ? 'bg-white border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                <input 
                  type="checkbox" 
                  checked={data.seleccionados.includes(String(emp.id))} 
                  onChange={() => toggleEmpleado(emp.id)} 
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ml-2" 
                />
                <div className="ml-4">
                  <p className="font-black text-slate-800 text-sm leading-tight">{emp.nombre}</p>
                  <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">{emp.rol}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 shrink-0">
            <button onClick={() => isMasivo ? setModalMasivo(null) : setModalCelda(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">
              Cancelar
            </button>
            <button onClick={guardarAsignacion} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 transition active:scale-95">
              Aplicar y Cerrar
            </button>
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
              <Sparkles className="text-teal-500"/> Matriz de Limpieza Operativa
            </h3>
            <p className="text-sm font-bold text-slate-400 mt-1">Configura las áreas, activa turnos y audita la limpieza.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              disabled={!hayCambiosSinGuardar || isSubmitting} 
              onClick={guardarMatriz} 
              className={`px-6 py-4 rounded-2xl font-black transition flex items-center justify-center gap-2 text-sm shadow-md active:scale-95 ${hayCambiosSinGuardar ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/30 animate-pulse' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
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
            
            <form onSubmit={agregarArea} className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <input 
                type="text" 
                value={nuevaArea} 
                onChange={(e) => setNuevaArea(e.target.value)} 
                placeholder="Nueva Tarea (Ej. Baño)..." 
                className="w-full sm:w-48 bg-white border border-teal-200 rounded-xl px-4 py-2 outline-none focus:border-teal-500 font-bold text-teal-900 shadow-sm text-sm" 
              />
              <button 
                type="submit" 
                disabled={!nuevaArea.trim()} 
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-black transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus size={18}/>
              </button>
            </form>
          </div>
        </div>

        {/* TABLA PRINCIPAL DE ZONAS */}
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
                      <div className={`text-xs font-black p-1.5 rounded-lg ${d.nombre.startsWith('S') || d.nombre.startsWith('D') ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
                        {d.num} {d.nombre}
                      </div>
                    </th>
                  ))}
                  <th className="p-4 text-center w-24 sticky right-0 bg-slate-100 z-30 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {areasBase.map((area) => (
                  <React.Fragment key={area.id}>
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
                                  <button 
                                    onClick={() => setModalCelda({ areaId: area.id, turno, fechaStr: d.fechaStr, seleccionados: asignados })} 
                                    className={`w-full py-2 px-2 rounded-xl text-[10px] font-black tracking-wider flex items-center justify-center gap-1.5 border transition-all active:scale-95 ${asignados.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-sm' : 'bg-white border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-slate-50'}`}
                                  >
                                    <Users size={12}/> {asignados.length > 0 ? `${asignados.length} Seleccionados` : 'Asignar'}
                                  </button>

                                  {/* EVIDENCIAS Y EVALUACIÓN INDIVIDUAL POR EMPLEADO */}
                                  {asignados.length > 0 && (
                                    <div className="mt-auto border-t border-slate-100 pt-2 space-y-2 w-full">
                                      {asignados.map(empId => {
                                        const emp = empleadosVisibles.find(u => String(u.id) === String(empId));
                                        if(!emp) return null;
                                        
                                        const evidenciaObj = evidencias[`${area.id}_${turno}`]?.[d.fechaStr] || {};
                                        const photoUrl = evidenciaObj[empId];
                                        
                                        const evalObj = evaluaciones[`${area.id}_${turno}`]?.[d.fechaStr] || {};
                                        const status = evalObj[empId];

                                        return (
                                          <div key={empId} className="flex flex-col gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl shadow-sm w-full">
                                            
                                            <span className="text-[10px] font-black text-slate-700 truncate w-full text-center">
                                              {emp.nombre.split(' ')[0]}
                                            </span>

                                            {/* FOTO DEL EMPLEADO */}
                                            {photoUrl ? (
                                              <a href={photoUrl} target="_blank" rel="noreferrer" className="block w-full h-12 rounded-lg overflow-hidden border border-slate-300 relative group/foto">
                                                <img src={photoUrl} alt="Evidencia" className="w-full h-full object-cover"/>
                                                <div className="absolute inset-0 bg-black/50 hidden group-hover/foto:flex items-center justify-center transition-all backdrop-blur-sm">
                                                  <Camera size={14} className="text-white"/>
                                                </div>
                                              </a>
                                            ) : (
                                              <div className="w-full h-8 bg-slate-100 rounded-lg flex items-center justify-center border border-dashed border-slate-300">
                                                <span className="text-[8px] text-slate-400 font-bold uppercase">Sin Foto</span>
                                              </div>
                                            )}

                                            {/* BOTONES DE EVALUACIÓN INDIVIDUAL */}
                                            {!status ? (
                                              <div className="flex gap-1 w-full mt-1">
                                                <button onClick={() => evaluarLimpieza(area.id, turno, d.fechaStr, String(empId), 'cumplio')} className="flex-1 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white text-[9px] py-1.5 rounded-md font-black shadow-sm transition-all">SÍ</button>
                                                <button onClick={() => evaluarLimpieza(area.id, turno, d.fechaStr, String(empId), 'no_cumplio')} className="flex-1 bg-white text-red-600 border border-red-200 hover:bg-red-500 hover:text-white text-[9px] py-1.5 rounded-md font-black shadow-sm transition-all">NO</button>
                                              </div>
                                            ) : (
                                              <div className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md font-black text-[9px] uppercase tracking-wider shadow-sm mt-1 ${status === 'cumplio' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                                <span>{status === 'cumplio' ? '✅ Cumplió' : '❌ Falló'}</span>
                                                <button onClick={() => evaluarLimpieza(area.id, turno, d.fechaStr, String(empId), null)} className="opacity-80 hover:opacity-100 bg-black/20 p-1 rounded"><RotateCcw size={10}/></button>
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

                        {/* ACCIÓN MASIVA PARA ESTE TURNO */}
                        <td className="p-2 text-center sticky right-0 bg-white z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l border-slate-100 align-middle">
                          <button onClick={() => setModalMasivo({ areaId: area.id, turno, seleccionados: [], diasSemana: [1,2,3,4,5,6,0] })} className="p-3 bg-white hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-200 rounded-xl transition shadow-sm" title="Asignar masivamente al mes">
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

        {/* ZONA INFERIOR DE CERRAR AUDITORÍA */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <div className="flex flex-col lg:flex-row items-center gap-4 w-full md:w-auto">
            {areasBase.length > 0 && (
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
                <button 
                  onClick={realizarCorteLimpieza} 
                  disabled={isSubmitting || !fechaDesde || !fechaHasta} 
                  className="w-full sm:w-auto text-sm font-bold flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl transition shadow-sm bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer active:scale-95 disabled:opacity-50"
                >
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

export default ZonasLimpieza;