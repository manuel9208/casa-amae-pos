import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Sparkles, AlertCircle, RotateCcw, RefreshCw } from 'lucide-react';  

const ZonasLimpieza = ({ usuariosDB, apiUrl, showAlert, showConfirm }) => {
  const [areas, setAreas] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [evidencias, setEvidencias] = useState({});
  const [evaluaciones, setEvaluaciones] = useState({}); 
  const [nuevaArea, setNuevaArea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);  

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];  

  const empleadosVisibles = usuariosDB
    .filter(u => u.usuario !== 'admin')
    .sort((a, b) => a.nombre.localeCompare(b.nombre));  

  useEffect(() => {
    fetch(`${apiUrl}/configuracion`)
      .then(res => res.json())
      .then(data => {
        if (data && data.matriz_limpieza) {
          try {
            const parsed = typeof data.matriz_limpieza === 'string' ? JSON.parse(data.matriz_limpieza) : data.matriz_limpieza;
            setAreas(parsed.areas || []);
            setAsignaciones(parsed.asignaciones || {});
            setEvidencias(parsed.evidencias || {});
            setEvaluaciones(parsed.evaluaciones || {});
          } catch (e) {
            console.error("Error parseando matriz");
          }
        }
      })
      .catch(err => console.error("Error cargando matriz de limpieza"));
  }, [apiUrl]);  

  const agregarArea = (e) => {
    e.preventDefault();
    const areaTrim = nuevaArea.trim();
    if (!areaTrim) return;
    if (areas.includes(areaTrim)) return showAlert('Aviso', 'Esta área de limpieza ya existe.', 'info');  
    setAreas([...areas, areaTrim]);
    setNuevaArea('');
  };  

  const eliminarArea = (areaTarget) => {
    showConfirm("Eliminar Área", `¿Estás seguro que deseas eliminar el área: ${areaTarget}? Se borrarán también sus asignaciones y evidencias.`, () => {
      const nuevasAreas = areas.filter(a => a !== areaTarget);  
      const nuevasAsignaciones = { ...asignaciones };
      delete nuevasAsignaciones[areaTarget];  
      const nuevasEvidencias = { ...evidencias };
      delete nuevasEvidencias[areaTarget];  
      const nuevasEvaluaciones = { ...evaluaciones };
      delete nuevasEvaluaciones[areaTarget];  

      setAreas(nuevasAreas);
      setAsignaciones(nuevasAsignaciones);
      setEvidencias(nuevasEvidencias);
      setEvaluaciones(nuevasEvaluaciones);
    });
  };  

  const manejarAsignacion = (area, dia, usuarioId) => {
    setAsignaciones(prev => ({
      ...prev,
      [area]: {
        ...(prev[area] || {}),
        [dia]: usuarioId
      }
    }));  

    setEvidencias(prev => {
      const nuevas = { ...prev };
      if (nuevas[area] && nuevas[area][dia]) delete nuevas[area][dia];
      return nuevas;
    });
    setEvaluaciones(prev => {
      const nuevas = { ...prev };
      if (nuevas[area] && nuevas[area][dia]) delete nuevas[area][dia];
      return nuevas;
    });
  };  

  const evaluarLimpieza = (area, dia, status) => {
    setEvaluaciones(prev => ({
      ...prev,
      [area]: {
        ...(prev[area] || {}),
        [dia]: status 
      }
    }));
  };  

  const reiniciarSemana = () => {
    showConfirm(
      "🔄 Reiniciar Semana",
      "¿Deseas borrar TODAS las fotos de evidencia y evaluaciones actuales? Los empleados seguirán asignados a sus áreas para la nueva semana.",
      () => {
        setEvidencias({});
        setEvaluaciones({});
        showAlert("Reiniciado", "Matriz lista para una nueva semana. Recuerda guardar los cambios.", "info");
      }
    );
  };  

  const guardarMatriz = async () => {
    setIsSubmitting(true);
    try {
      const payload = { areas, asignaciones, evidencias, evaluaciones };
      const formData = new FormData();
      formData.append('matriz_limpieza', JSON.stringify(payload));  

      const res = await fetch(`${apiUrl}/configuracion`, {
        method: 'PUT',
        body: formData
      });  

      if (res.ok) {
        showAlert('¡Guardado!', 'La matriz de limpieza se ha actualizado correctamente.', 'success');
      } else {
        showAlert('Error', 'No se pudo guardar la matriz.', 'error');
      }
    } catch (error) {
      showAlert('Error', 'Error de red al guardar.', 'error');
    }
    setIsSubmitting(false);
  };  

  // 👇 NUEVA VALIDACIÓN: Verifica que todas las asignaciones tengan una evaluación (SÍ o NO)
  let hayAsignaciones = false;
  let todoEvaluado = true;
  Object.keys(asignaciones).forEach(area => {
    Object.keys(asignaciones[area]).forEach(dia => {
      if (asignaciones[area][dia]) { 
        hayAsignaciones = true;
        if (!evaluaciones[area] || !evaluaciones[area][dia]) {
          todoEvaluado = false;
        }
      }
    });
  });

  // Solo se puede limpiar la semana si hay empleados asignados y TODOS ya fueron evaluados
  const puedeLimpiar = hayAsignaciones && todoEvaluado;

  return (
    <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Sparkles className="text-teal-500"/> Matriz de Limpieza Semanal
          </h3>
          <p className="text-slate-500 font-medium mt-1">Asigna, supervisa evidencias y evalúa la limpieza por áreas.</p>
        </div>  

        <form onSubmit={agregarArea} className="flex w-full md:w-auto gap-2">
          <input
            type="text"
            value={nuevaArea}
            onChange={(e) => setNuevaArea(e.target.value)}
            placeholder="Ej. Baños, Barra, Terraza..."
            className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-teal-500 font-bold text-slate-700"
          />
          <button
            type="submit"
            disabled={!nuevaArea.trim()}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-2"
          >
            <Plus size={20}/> <span className="hidden sm:inline">Agregar</span>
          </button>
        </form>
      </div>  

      <div className="overflow-x-auto border border-slate-200 rounded-3xl mb-8">
        {areas.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Sparkles size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold text-lg">Aún no has agregado áreas de limpieza.</p>
            <p className="text-sm">Agrega tu primera área en el recuadro superior.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                <th className="p-4 border-r border-slate-200 w-40 sticky left-0 bg-slate-100 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Área a Limpiar</th>
                {diasSemana.map(dia => (
                  <th key={dia} className="p-4 text-center border-r border-slate-200 w-36">{dia}</th>
                ))}
                <th className="p-4 text-center w-16">Acción</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="p-4 border-r border-slate-100 font-black text-slate-700 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)] align-middle">
                    {area}
                  </td>
                  {diasSemana.map(dia => {
                    const empleadosDelDia = empleadosVisibles.filter(emp => {
                      try {
                        const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal) : (emp.horario_semanal || {});
                        return hor[dia] && hor[dia].activo === true;
                      } catch(e) { return false; }
                    });

                    return (
                      <td key={`${area}-${dia}`} className="p-2 border-r border-slate-100 align-top">
                        <div className="flex flex-col gap-2">
                          <select
                            value={asignaciones[area]?.[dia] || ''}
                            onChange={(e) => manejarAsignacion(area, dia, e.target.value)}
                            className={`w-full p-2.5 rounded-lg border outline-none font-bold text-xs cursor-pointer appearance-none text-center transition-colors ${
                              asignaciones[area]?.[dia] ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white'
                            }`}
                          >
                            <option value="">-- Sin asignar --</option>
                            {empleadosDelDia.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                            ))}
                          </select>  

                          {asignaciones[area]?.[dia] && (
                            <div className="mt-1 border-t border-slate-200 pt-2 space-y-2 animate-in fade-in">  
                              {evidencias[area]?.[dia] ? (
                                <a href={evidencias[area][dia]} target="_blank" rel="noreferrer" className="block w-full h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors relative group shadow-sm">
                                  <img src={evidencias[area][dia]} alt="Evidencia" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="text-[10px] text-white font-black tracking-widest uppercase drop-shadow-md">Ver Foto</span>
                                  </div>
                                </a>
                              ) : (
                                <div className="h-10 border border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest px-2">Sin Foto</span>
                                </div>
                              )}  

                              {!evaluaciones[area]?.[dia] ? (
                                <div className="flex gap-1 w-full">
                                  <button onClick={() => evaluarLimpieza(area, dia, 'cumplio')} className="flex-1 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white text-[10px] py-1.5 rounded-md font-black transition-colors shadow-sm" title="Sí Cumplió">SÍ</button>
                                  <button onClick={() => evaluarLimpieza(area, dia, 'no_cumplio')} className="flex-1 bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white text-[10px] py-1.5 rounded-md font-black transition-colors shadow-sm" title="No Cumplió">NO</button>
                                </div>
                              ) : (
                                <div className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md font-black text-[9px] uppercase tracking-wider shadow-sm ${evaluaciones[area][dia] === 'cumplio' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                  <span>{evaluaciones[area][dia] === 'cumplio' ? '✅ Cumplió' : '❌ Incumplió'}</span>
                                  <button onClick={() => evaluarLimpieza(area, dia, null)} className="opacity-70 hover:opacity-100 hover:scale-110 transition-all bg-black/10 p-1 rounded-md" title="Deshacer evaluación">
                                    <RotateCcw size={12}/>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}  
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-2 text-center align-middle">
                    <button
                      onClick={() => eliminarArea(area)}
                      className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition"
                      title="Eliminar Área"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>  

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-xs font-bold border border-amber-200">
            <AlertCircle size={16}/> ¡Guarda al asignar o evaluar!
          </div>  

          {areas.length > 0 && (
            <button 
              onClick={reiniciarSemana} 
              disabled={isSubmitting || !puedeLimpiar} 
              className={`text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                puedeLimpiar 
                  ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer' 
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title={!puedeLimpiar ? "Debes evaluar todas las asignaciones pendientes de la semana para poder limpiarla." : "Borrar evaluaciones y fotos de la semana"}
            >
              <RefreshCw size={16}/> Limpiar Semana
            </button>
          )}
        </div>  
        
        <button
          onClick={guardarMatriz}
          disabled={isSubmitting || areas.length === 0}
          className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-2xl font-black transition active:scale-95 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={20}/> {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
};  

export default ZonasLimpieza;