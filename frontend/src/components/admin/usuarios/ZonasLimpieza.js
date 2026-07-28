import React, { useState, useEffect } from 'react';
import { Sparkles, Trash2, Users, Plus, Lock, Camera, Calendar, RotateCcw, Save, ChevronLeft, ChevronRight, Filter, Copy, CheckSquare, Square, CheckCircle2 } from 'lucide-react';

const diasSemanaNombresFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ZonasLimpieza = ({ usuariosDB, apiUrl, showAlert, showConfirm, configGlobal }) => {
  const [fechaReferencia, setFechaReferencia] = useState(new Date());

  const [areasBase, setAreasBase] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [evidencias, setEvidencias] = useState({});
  const [evaluaciones, setEvaluaciones] = useState({});
  const [diasCerrados, setDiasCerrados] = useState([]);
  const [nuevaArea, setNuevaArea] = useState('');
  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [horarioNegocio, setHorarioNegocio] = useState({});

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // 👇 NUEVOS ESTADOS DEL PANEL DE ASIGNACIONES MÚLTIPLES
  const [asigArea, setAsigArea] = useState('');
  const [asigTurno, setAsigTurno] = useState('');
  const [asigFechas, setAsigFechas] = useState([]); // Arreglo para guardar los días aleatorios seleccionados

  const [modalCelda, setModalCelda] = useState(null);
  const [modalMasivo, setModalMasivo] = useState(null);
  
  const [filtroRolMasivo, setFiltroRolMasivo] = useState('');
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);

  const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global' && u.rol !== 'tv').sort((a, b) => a.nombre.localeCompare(b.nombre));
  const rolesDisponibles = [...new Set(empleadosVisibles.map(e => e.rol))];
  const empleadosFiltrados = filtroRolMasivo ? empleadosVisibles.filter(u => u.rol === filtroRolMasivo) : empleadosVisibles;
  const todosFiltradosSeleccionados = empleadosFiltrados.length > 0 && empleadosFiltrados.every(e => empleadosSeleccionados.includes(String(e.id)));

  const year = fechaReferencia.getFullYear();
  const month = fechaReferencia.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const diasMes = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    const nombreBreve = date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().replace('.', '');
    const nombreCompleto = diasSemanaNombresFull[date.getDay()];
    return { num: i + 1, nombreBreve, nombreCompleto, fechaStr, dayIndex: date.getDay() }; 
  });

  // Limpiar selección de días si cambias de mes en el calendario
  useEffect(() => {
    setAsigFechas([]);
  }, [year, month]);

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

  const mesNombre = fechaReferencia.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();

  const cambiarMes = (direccion) => {
    setFechaReferencia(new Date(year, month + direccion, 1));
  };

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

        if (data && !data.error && data.matriz_limpieza) {
          const matriz = typeof data.matriz_limpieza === 'string' ? JSON.parse(data.matriz_limpieza) : data.matriz_limpieza;
          
          if (matriz.areasBase) {
            setAreasBase(matriz.areasBase);
            setAsignaciones(matriz.asignaciones || {});
          } else if (matriz.areas) {
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
          } else { setEvaluaciones({}); }

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
          } else { setEvidencias({}); }

          setDiasCerrados(matriz.dias_cerrados || []);
        }
      })
      .catch(() => {});
  }, [apiUrl]);

  const agregarArea = (e) => {
    e.preventDefault();
    const areaNombre = nuevaArea.trim();
    if (!areaNombre) return;
    if (!areasBase.find(a => a.id.toLowerCase() === areaNombre.toLowerCase())) {
      setHayCambiosSinGuardar(true);
      // Blindaje: Para que los turnos nunca estén vacíos, nace con 'General' por defecto
      setAreasBase([...areasBase, { id: areaNombre, nombre: areaNombre, turnos: ['General'] }]);
      setNuevaArea('');
    } else {
      showAlert('Aviso', 'Esta área ya existe en la lista.', 'warning');
    }
  };

  const eliminarArea = (areaId) => {
    showConfirm("Eliminar Área", `¿Seguro que deseas eliminar "${areaId}"? Se perderá todo su historial.`, () => {
      setHayCambiosSinGuardar(true);
      setAreasBase(prev => prev.filter(a => a.id !== areaId));
    });
  };

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

  const evaluarLimpieza = (areaId, turno, fechaStr, empId, status) => {
    if (diasCerrados.includes(fechaStr)) return;
    setHayCambiosSinGuardar(true);
    const clave = `${areaId}_${turno}`;
    setEvaluaciones(prev => {
      const prevArea = prev[clave] || {};
      const prevFecha = prevArea[fechaStr] || {};
      
      if (status === null) {
        const newFecha = { ...prevFecha };
        delete newFecha[empId];
        return { ...prev, [clave]: { ...prevArea, [fechaStr]: newFecha } };
      }

      return { ...prev, [clave]: { ...prevArea, [fechaStr]: { ...prevFecha, [empId]: status } } };
    });
  };

  // 👇 LÓGICAS DEL NUEVO MINI-CALENDARIO SELECTOR 👇
  const toggleDiaSemanaPanel = (dayIndex) => {
    const fechasDelDia = diasMes.filter(d => d.dayIndex === dayIndex).map(d => d.fechaStr);
    const todasSeleccionadas = fechasDelDia.length > 0 && fechasDelDia.every(f => asigFechas.includes(f));
    
    if (todasSeleccionadas) {
        setAsigFechas(prev => prev.filter(f => !fechasDelDia.includes(f)));
    } else {
        const nuevas = new Set(asigFechas);
        fechasDelDia.forEach(f => nuevas.add(f));
        setAsigFechas(Array.from(nuevas));
    }
  };

  const toggleDiaEspecificoPanel = (fechaStr) => {
    setAsigFechas(prev => prev.includes(fechaStr) ? prev.filter(f => f !== fechaStr) : [...prev, fechaStr]);
  };

  const seleccionarTodoElMes = () => {
    if (asigFechas.length === diasMes.length) {
        setAsigFechas([]);
    } else {
        setAsigFechas(diasMes.map(d => d.fechaStr));
    }
  };

  const aplicarAsignacionRango = () => {
    if (!asigArea || !asigTurno || asigFechas.length === 0 || empleadosSeleccionados.length === 0) {
        return showAlert('Aviso', 'Completa la Tarea, Turno, Días (En el mini-calendario) y Empleados.', 'warning');
    }
    
    const claveArea = `${asigArea}_${asigTurno}`;
    const nuevasAsignaciones = { ...asignaciones };
    if (!nuevasAsignaciones[claveArea]) nuevasAsignaciones[claveArea] = {};
    
    let diasAfectados = 0;
    
    asigFechas.forEach(dateStr => {
        if (!diasCerrados.includes(dateStr)) {
            const currentDate = new Date(dateStr + 'T12:00:00');
            const nombreDiaCompleto = diasSemanaNombresFull[currentDate.getDay()];
            
            const asignables = empleadosSeleccionados.filter(empId => {
                const emp = empleadosVisibles.find(u => String(u.id) === String(empId));
                if (!emp) return false;
                const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
                const restauranteCerrado = horarioNegocio && horarioNegocio[nombreDiaCompleto] && horarioNegocio[nombreDiaCompleto].activo === false;
                const esDescanso = pres.dias_descanso?.includes(nombreDiaCompleto) || false;
                const esNoLaboral = pres.dias_no_laborales?.includes(dateStr) || false;
                return !(restauranteCerrado || esDescanso || esNoLaboral);
            });

            nuevasAsignaciones[claveArea][dateStr] = asignables;
            diasAfectados++;
        }
    });
    
    setAsignaciones(nuevasAsignaciones);
    setHayCambiosSinGuardar(true);
    
    setAsigArea(''); setAsigTurno(''); setAsigFechas([]); 
    showAlert('¡Asignación Exitosa!', `Tarea aplicada a ${diasAfectados} días laborables. No olvides dar clic en Guardar Cambios.`, 'success');
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
            }).catch(() => console.warn("Petición de borrado a Cloudinary fallida."));
          }

          const resConfig = await fetch(`${apiUrl}/configuracion`);
          let matrizActual = {};
          if (resConfig.ok) {
            const dataConfig = await resConfig.json();
            matrizActual = typeof dataConfig.matriz_limpieza === 'string' ? JSON.parse(dataConfig.matriz_limpieza || '{}') : (dataConfig.matriz_limpieza || {});
          }

          const nuevosDiasCerrados = [...new Set([...diasCerrados, ...fechasRango])];
          const payload = { ...matrizActual, areasBase, asignaciones, evidencias: nuevasEvidencias, evaluaciones, dias_cerrados: nuevosDiasCerrados };

          const formData = new FormData();
          formData.append('matriz_limpieza', JSON.stringify(payload));

          const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
          if (res.ok) {
            setDiasCerrados(nuevosDiasCerrados);
            setEvidencias(nuevasEvidencias);
            setHayCambiosSinGuardar(false);
            showAlert("Éxito", "Auditoría bloqueada, fotos purgadas y matriz guardada.", "success");
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

  const duplicarSiguienteMes = () => {
    if (empleadosSeleccionados.length === 0) return showAlert('Aviso', 'Selecciona al menos un empleado en el filtro visual.', 'info');

    showConfirm(
      "Copiar al Siguiente Mes",
      "Esto copiará el patrón de limpieza actual al mes próximo (respetando los días de cierre y reglas de nómina). ¿Proceder?",
      () => {
        setHayCambiosSinGuardar(true);
        const mesActivoLocal = fechaReferencia.getMonth();
        const yearActivoLocal = fechaReferencia.getFullYear();

        const nextM = mesActivoLocal === 11 ? 0 : mesActivoLocal + 1;
        const nextY = mesActivoLocal === 11 ? yearActivoLocal + 1 : yearActivoLocal;
        const diasNextMonth = new Date(nextY, nextM + 1, 0).getDate();
        
        const nuevasAsignaciones = { ...asignaciones };

        Object.keys(nuevasAsignaciones).forEach(claveArea => {
          for (let i = 1; i <= diasNextMonth; i++) {
            const dNext = new Date(nextY, nextM, i);
            const targetDateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const nombreDiaCompleto = diasSemanaNombresFull[dNext.getDay()];
            
            const currentMonthDay = diasMes.find(d => {
              const dCurr = new Date(yearActivoLocal, mesActivoLocal, d.num);
              return dCurr.getDay() === dNext.getDay();
            });
            
            if (currentMonthDay && nuevasAsignaciones[claveArea][currentMonthDay.fechaStr]) {
              const asignados = nuevasAsignaciones[claveArea][currentMonthDay.fechaStr];
              
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

              nuevasAsignaciones[claveArea][targetDateStr] = asignables;
            }
          }
        });
        
        setAsignaciones(nuevasAsignaciones);
        showAlert('¡Patrón Duplicado!', 'Limpieza copiada al mes siguiente respetando los cierres operativos. Cambia de mes y presiona Guardar.', 'success');
      }
    );
  };

  const renderModalAsignacion = () => {
    if (!modalCelda && !modalMasivo) return null;
    const isMasivo = !!modalMasivo;
    const data = modalCelda || modalMasivo;
    const claveArea = `${data.areaId}_${data.turno}`;

    const empleadosParaMostrar = filtroRolMasivo 
      ? empleadosVisibles.filter(e => e.rol === filtroRolMasivo) 
      : empleadosVisibles;

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

      if (isMasivo) {
        const nuevasAsignaciones = { ...asignaciones };
        if (!nuevasAsignaciones[claveArea]) nuevasAsignaciones[claveArea] = {};

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

              nuevasAsignaciones[claveArea][d.fechaStr] = asignables;
            } else {
              if (nuevasAsignaciones[claveArea][d.fechaStr]) {
                nuevasAsignaciones[claveArea][d.fechaStr] = nuevasAsignaciones[claveArea][d.fechaStr].filter(
                  empId => !data.seleccionados.includes(empId)
                );
              }
            }
          }
        });

        setAsignaciones(nuevasAsignaciones);
        setModalMasivo(null);
        showAlert('Éxito', `Asignado. Se omitieron automáticamente días de descanso, días no laborales y días cerrados.`, 'success');
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

        const nuevasAsignaciones = { ...asignaciones };
        if (!nuevasAsignaciones[claveArea]) nuevasAsignaciones[claveArea] = {};
        nuevasAsignaciones[claveArea][data.fechaStr] = asignables;
        setAsignaciones(nuevasAsignaciones);
        setModalCelda(null);
      }
    };

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white rounded-[32px] p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
          <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
            {isMasivo ? 'Asignación Masiva Mensual' : `Asignar y Auditar: ${data.fechaStr}`}
          </h3>
          <p className="text-sm font-bold text-teal-600 mb-4 bg-teal-50 px-4 py-2 rounded-xl w-fit mt-2 border border-teal-100">
            {data.areaId} - Turno {data.turno}
          </p>

          {isMasivo && (
            <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
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
                          ? 'bg-teal-600 text-white shadow-md transform scale-105'
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
          
          {/* LISTA DE EMPLEADOS (CON MÓDULO DE AUDITORÍA INTEGRADO SI NO ES MASIVO) */}
          <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-6 space-y-2 custom-scrollbar">
            {empleadosParaMostrar.map(emp => {
                const isChecked = data.seleccionados.includes(String(emp.id));
                const status = !isMasivo ? (evaluaciones[claveArea]?.[data.fechaStr]?.[emp.id] || null) : null;
                const photoUrl = !isMasivo ? (evidencias[claveArea]?.[data.fechaStr]?.[emp.id] || null) : null;

                return (
                    <div key={emp.id} className={`p-3 rounded-xl border transition-all shadow-sm ${isChecked ? 'bg-white border-teal-500' : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'}`}>
                        
                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer flex-1">
                                <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    onChange={() => toggleEmpleado(emp.id)} 
                                    className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" 
                                />
                                <div className="ml-3">
                                    <p className="font-black text-slate-800 text-sm leading-tight">{emp.nombre}</p>
                                    <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">{emp.rol}</p>
                                </div>
                            </label>
                        </div>
                        
                        {/* PANEL DE AUDITORÍA (SÓLO SI ESTÁ SELECCIONADO Y ES UN DÍA ESPECÍFICO) */}
                        {isChecked && !isMasivo && (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 animate-in fade-in zoom-in-95">
                                {/* Visor de Foto */}
                                {photoUrl ? (
                                    <a href={photoUrl.startsWith('http') ? photoUrl : `${baseUrlClean}${photoUrl}`} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg overflow-hidden border border-slate-300 shrink-0 relative group/foto">
                                        <img src={photoUrl.startsWith('http') ? photoUrl : `${baseUrlClean}${photoUrl}`} alt="Evidencia" className="w-full h-full object-cover"/>
                                        <div className="absolute inset-0 bg-black/50 hidden group-hover/foto:flex items-center justify-center transition-all backdrop-blur-sm">
                                            <Camera size={12} className="text-white"/>
                                        </div>
                                    </a>
                                ) : (
                                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center border border-dashed border-slate-300 shrink-0" title="Sin foto">
                                        <Camera size={12} className="text-slate-300"/>
                                    </div>
                                )}
                                
                                {/* Botones SÍ / NO */}
                                <div className="flex-1 flex gap-1">
                                    {!status ? (
                                        <>
                                            <button onClick={() => evaluarLimpieza(data.areaId, data.turno, data.fechaStr, String(emp.id), 'cumplio')} className="flex-1 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 text-[10px] py-1.5 rounded-lg font-black transition-all">SÍ</button>
                                            <button onClick={() => evaluarLimpieza(data.areaId, data.turno, data.fechaStr, String(emp.id), 'no_cumplio')} className="flex-1 bg-white text-red-600 border border-red-200 hover:bg-red-50 text-[10px] py-1.5 rounded-lg font-black transition-all">NO</button>
                                        </>
                                    ) : (
                                        <div className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg font-black text-[10px] uppercase shadow-inner ${status === 'cumplio' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            <span>{status === 'cumplio' ? '✅ Cumplió' : '❌ Falló'}</span>
                                            <button onClick={() => evaluarLimpieza(data.areaId, data.turno, data.fechaStr, String(emp.id), null)} className="hover:opacity-70 bg-white/50 p-1 rounded"><RotateCcw size={10}/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
            
            {empleadosParaMostrar.length === 0 && (
              <p className="text-center text-slate-400 text-xs font-bold py-4">No hay empleados con ese rol.</p>
            )}
          </div>

          <div className="flex gap-3 shrink-0">
            <button onClick={() => isMasivo ? setModalMasivo(null) : setModalCelda(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">
              {!isMasivo ? 'Cerrar' : 'Cancelar'}
            </button>
            <button onClick={guardarAsignacion} className="flex-[2] py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl shadow-lg shadow-teal-500/30 transition active:scale-95">
              Guardar Empleados
            </button>
          </div>
        </div>
      </div>
    );
  };

  const baseUrlClean = apiUrl.replace('/api', '');

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="bg-white p-4 md:p-8 rounded-[32px] shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
        
        {/* HEADER Y BOTONES GLOBALES */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
          <div>
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="text-teal-500"/> Calendario de Limpieza
            </h3>
            <p className="text-sm font-bold text-slate-400 mt-1">Configura las tareas, asigna por días y audita la limpieza mensual.</p>
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

        {/* CONTROLES DEL MES Y NUEVAS ÁREAS */}
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

        {/* PANEL DE ÁREAS Y TURNOS */}
        {areasBase.length > 0 && (
          <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm mb-6 print:hidden">
            <h4 className="font-black text-slate-700 mb-4 flex items-center gap-2"><Sparkles size={18}/> Áreas y Turnos Configurados</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {areasBase.map(area => (
                <div key={area.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                    <span className="font-black text-slate-800 uppercase tracking-wider text-sm">{area.nombre}</span>
                    <button onClick={() => eliminarArea(area.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-600">
                    {['General', 'Mañana', 'Tarde', 'Noche'].map(t => {
                      const isActive = area.turnos.includes(t);
                      return (
                        <label key={t} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors border ${isActive ? 'bg-teal-100 border-teal-300 text-teal-800' : 'bg-white border-slate-200 hover:border-teal-400'}`}>
                          <input type="checkbox" checked={isActive} onChange={() => toggleTurno(area.id, t)} className="hidden"/>
                          {isActive && <CheckCircle2 size={12} className="text-teal-600"/>}
                          {t}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 👇 NUEVO PANEL MAESTRO DE ASIGNACIONES POR CALENDARIO MINI 👇 */}
        <div className="bg-teal-50 border border-teal-200 p-6 md:p-8 rounded-[32px] shadow-sm flex flex-col xl:flex-row gap-8 items-start w-full print:hidden mb-8">
            
            {/* Columna Izquierda: Mini Calendario y Selector de Tareas */}
            <div className="flex-[1.5] w-full border-b xl:border-b-0 xl:border-r border-teal-200 pb-6 xl:pb-0 xl:pr-8">
                
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-teal-900 flex items-center gap-2"><Calendar size={20}/> 1. Elige los Días</h3>
                    <button onClick={seleccionarTodoElMes} className="text-[10px] font-black bg-white border border-teal-200 text-teal-700 px-2 py-1 rounded shadow-sm hover:bg-teal-50 transition active:scale-95">
                        {asigFechas.length === diasMes.length ? 'Limpiar Días' : 'Seleccionar Todo'}
                    </button>
                </div>
                
                {/* Selector rápido por día de la semana */}
                <div className="flex justify-between gap-1 mb-3">
                    {[{i:1, l:'LUN'}, {i:2, l:'MAR'}, {i:3, l:'MIÉ'}, {i:4, l:'JUE'}, {i:5, l:'VIE'}, {i:6, l:'SÁB'}, {i:0, l:'DOM'}].map(ds => {
                        const fechasDelDia = diasMes.filter(d => d.dayIndex === ds.i).map(d => d.fechaStr);
                        const isSelected = fechasDelDia.length > 0 && fechasDelDia.every(f => asigFechas.includes(f));
                        return (
                            <button key={ds.i} onClick={() => toggleDiaSemanaPanel(ds.i)} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${isSelected ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50'}`}>
                                {ds.l}
                            </button>
                        )
                    })}
                </div>

                {/* Cuadrícula de números aleatorios */}
                <div className="grid grid-cols-7 gap-1 mb-6">
                    {/* Espacios vacíos iniciales */}
                    {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => (
                        <div key={`blank-${i}`}></div>
                    ))}
                    {/* Días del mes cliqueables */}
                    {diasMes.map(d => {
                        const isSelected = asigFechas.includes(d.fechaStr);
                        const isClosed = diasCerrados.includes(d.fechaStr);
                        return (
                            <button key={d.fechaStr} disabled={isClosed} onClick={() => toggleDiaEspecificoPanel(d.fechaStr)} className={`h-8 rounded-lg text-[10px] sm:text-xs font-black transition-all ${isClosed ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : isSelected ? 'bg-teal-500 text-white shadow-md scale-[1.05]' : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-400 hover:bg-teal-50'}`} title={isClosed ? 'Auditoría Cerrada' : d.fechaStr}>
                                {d.num}
                            </button>
                        )
                    })}
                </div>

                <h3 className="font-black text-teal-900 flex items-center gap-2 mb-4"><Sparkles size={20}/> 2. Tarea a Asignar</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <select value={asigArea} onChange={e => { setAsigArea(e.target.value); setAsigTurno(''); }} className="w-full bg-white border border-teal-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-teal-500 shadow-sm cursor-pointer text-slate-700">
                            <option value="">-- Selecciona Tarea --</option>
                            {areasBase.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        {/* 👇 FIX APLICADO: Blindaje tipo String y Fallback Visual 👇 */}
                        <select value={asigTurno} onChange={e => setAsigTurno(e.target.value)} disabled={!asigArea} className="w-full bg-white border border-teal-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-teal-500 shadow-sm cursor-pointer disabled:opacity-50 text-slate-700">
                            <option value="">-- Turno --</option>
                            {asigArea && areasBase.find(a => String(a.id) === String(asigArea))?.turnos.map(t => <option key={t} value={t}>{t}</option>)}
                            {asigArea && areasBase.find(a => String(a.id) === String(asigArea))?.turnos.length === 0 && <option value="" disabled>⚠️ Agrega turnos en el panel de áreas</option>}
                        </select>
                    </div>
                </div>
            </div>

            {/* Columna Derecha: Empleados y Acción */}
            <div className="flex-1 w-full flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 gap-2">
                    <h3 className="font-black text-teal-900 flex items-center gap-2"><Users size={20}/> 3. Selecciona Empleados</h3>
                    <button onClick={toggleSeleccionMasiva} className="text-[10px] font-black text-teal-600 bg-white px-3 py-2 rounded-lg border border-teal-200 shadow-sm uppercase tracking-wider hover:bg-teal-100 transition active:scale-95">
                        {todosFiltradosSeleccionados ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                </div>

                <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2 items-center">
                    <Filter size={14} className="text-teal-400 shrink-0 mr-1"/>
                    <button onClick={() => setFiltroRolMasivo('')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all whitespace-nowrap shadow-sm ${!filtroRolMasivo ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}>Todos</button>
                    {rolesDisponibles.map(rol => (
                        <button key={rol} onClick={() => setFiltroRolMasivo(rol)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all whitespace-nowrap shadow-sm ${filtroRolMasivo === rol ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}>{rol}</button>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2 overflow-y-auto custom-scrollbar pr-2 mb-6 flex-1 min-h-[90px] content-start">
                    {empleadosFiltrados.map(emp => {
                        const seleccionado = empleadosSeleccionados.includes(String(emp.id));
                        return (
                            <button key={emp.id} onClick={() => setEmpleadosSeleccionados(prev => prev.includes(String(emp.id)) ? prev.filter(id => id !== String(emp.id)) : [...prev, String(emp.id)])} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all border ${seleccionado ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:bg-teal-50'}`}>
                                {seleccionado ? <CheckSquare size={14}/> : <Square size={14}/>} 
                                <span>
                                    {emp.nombre.split(' ')[0]} 
                                    <span className="opacity-70 text-[9px] font-bold uppercase tracking-widest ml-1.5">
                                        ({emp.rol})
                                    </span>
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* 👇 FIX APLICADO: Botón de Duplicar Mes agregado y usando el ícono Copy 👇 */}
                <div className="mt-auto pt-4 border-t border-teal-200/50 flex flex-col sm:flex-row gap-3">
                    <button onClick={duplicarSiguienteMes} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-4 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all shadow-md shadow-indigo-500/30 active:scale-95 flex items-center justify-center gap-2">
                        <Copy size={16}/> Copiar a Sig. Mes
                    </button>
                    <button onClick={aplicarAsignacionRango} className="flex-[1.5] bg-teal-600 hover:bg-teal-700 text-white px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all shadow-md shadow-teal-500/30 active:scale-95 flex items-center justify-center gap-2">
                        <CheckCircle2 size={18}/> Asignar a los Días
                    </button>
                </div>
            </div>
        </div>

        {/* CALENDARIO MENSUAL DE CUADRÍCULA COMPLETA */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-[32px] overflow-hidden shadow-sm mb-8 print:hidden animate-in zoom-in-95">
            
            {/* Cabecera: Días de la Semana */}
            <div className="grid grid-cols-7 bg-white border-b border-slate-200">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                    <div key={d} className={`p-4 text-center text-xs font-black uppercase tracking-widest ${d === 'Dom' || d === 'Sáb' ? 'text-red-400' : 'text-slate-500'}`}>
                        {d}
                    </div>
                ))}
            </div>
            
            {/* Cuadrícula de Fechas */}
            <div className="grid grid-cols-7 gap-px bg-slate-200">
                
                {/* Espacios vacíos para alinear el 1er día del mes */}
                {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-slate-50/40 min-h-[140px]"></div>
                ))}

                {/* Días del Mes */}
                {diasMes.map((d) => {
                    const isCerrado = diasCerrados.includes(d.fechaStr);
                    const esFinSemana = d.nombreBreve.startsWith('S') || d.nombreBreve.startsWith('D');
                    
                    // Recopilar qué tareas se asignaron este día específico
                    const asignacionesHoy = [];
                    areasBase.forEach(area => {
                        area.turnos.forEach(turno => {
                            const clave = `${area.id}_${turno}`;
                            const empIds = asignaciones[clave]?.[d.fechaStr] || [];
                            if (empIds.length > 0) {
                                asignacionesHoy.push({ area, turno, empIds, clave });
                            }
                        });
                    });

                    return (
                        <div key={d.fechaStr} className={`bg-white min-h-[150px] flex flex-col transition-colors group relative ${isCerrado ? 'opacity-60 bg-slate-100' : 'hover:bg-teal-50/20'}`}>
                            
                            {/* Número del día */}
                            <div className="flex justify-between items-center p-2.5 border-b border-slate-50 bg-slate-50/50">
                                <span className={`text-base font-black ${esFinSemana ? 'text-red-500' : 'text-slate-700'}`}>{d.num}</span>
                                {isCerrado && <Lock size={12} className="text-slate-400" title="Auditoría Cerrada" />}
                            </div>
                            
                            {/* Lista de Tareas Asignadas (Píldoras) */}
                            <div className="flex-1 p-1.5 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar max-h-[160px] pb-8">
                                {asignacionesHoy.map((asig, i) => {
                                    // Ver si todas las tareas de este grupo ya se cumplieron para poner color verde
                                    const evaluacionesGrupo = asig.empIds.map(empId => evaluaciones[asig.clave]?.[d.fechaStr]?.[empId]);
                                    const todoCumplido = evaluacionesGrupo.length > 0 && evaluacionesGrupo.every(e => e === 'cumplio');
                                    const algunFallo = evaluacionesGrupo.some(e => e === 'no_cumplio');

                                    const colorPildora = todoCumplido ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : algunFallo ? 'bg-red-50 text-red-700 border-red-200' : 'bg-teal-50 text-teal-800 border-teal-200';

                                    return (
                                        <div key={i} 
                                            onClick={() => !isCerrado && setModalCelda({ areaId: asig.area.id, turno: asig.turno, fechaStr: d.fechaStr, nombreDiaCompleto: d.nombreCompleto, seleccionados: asig.empIds })}
                                            className={`text-[9px] border rounded-lg p-1.5 font-bold leading-tight cursor-pointer hover:shadow-md transition-all relative group/tag ${colorPildora}`}
                                            title="Clic para Editar Empleados o Calificar (SÍ/NO)">
                                            <div className="flex justify-between items-center gap-1">
                                                <span className="font-black uppercase tracking-wider truncate">{asig.area.nombre.split(' ')[0]} <span className="opacity-70">({asig.turno[0]})</span></span>
                                                <span className="bg-white/60 px-1 py-0.5 rounded text-[8px] shrink-0">{asig.empIds.length} <Users size={8} className="inline"/></span>
                                            </div>
                                        </div>
                                    )
                                })}
                                
                                {!isCerrado && asignacionesHoy.length === 0 && (
                                    <div className="h-full flex items-center justify-center opacity-30 pt-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin Tareas</span>
                                    </div>
                                )}
                            </div>

                            {/* Botón Flotante para asignar rápidamente algo a este día específico */}
                            {!isCerrado && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-white via-white to-transparent">
                                    <button onClick={() => {
                                        setAsigFechas([d.fechaStr]); // Selecciona este día directamente en el panel
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                        showAlert('Día Seleccionado', `Se fijó el día ${d.num} en el panel superior. Configura la tarea y aplica.`, 'info');
                                    }} 
                                    className="w-full bg-slate-800 text-white text-[9px] font-black py-2 rounded-lg shadow-sm flex items-center justify-center gap-1 hover:bg-slate-700 uppercase tracking-widest transition-transform active:scale-95">
                                        <Plus size={12}/> Tarea aquí
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* ZONA INFERIOR DE CERRAR AUDITORÍA */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6 mt-8">
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