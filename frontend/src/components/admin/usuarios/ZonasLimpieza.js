import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Sparkles, AlertCircle, RotateCcw, Lock, Calendar } from 'lucide-react';  

const ZonasLimpieza = ({ usuariosDB, apiUrl, showAlert, showConfirm }) => {
  const [areas, setAreas] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [evidencias, setEvidencias] = useState({});
  const [evaluaciones, setEvaluaciones] = useState({});
  const [diasCerrados, setDiasCerrados] = useState([]);
  const [nuevaArea, setNuevaArea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);  

  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = hoy.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mesNombre = hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase();  

  const strHoy = `${year}-${String(month + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;  
  const strPrimerDiaMes = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  // 👇 NUEVOS ESTADOS: Rango de fechas para proteger información al cruzar meses
  const [fechaDesde, setFechaDesde] = useState(strPrimerDiaMes);
  const [fechaHasta, setFechaHasta] = useState(strHoy);

  const diasMes = Array.from({length: daysInMonth}, (_, i) => {
    const d = new Date(year, month, i + 1);
    return { 
      num: i + 1, 
      nombre: d.toLocaleDateString('es-MX', {weekday: 'short'}).toUpperCase(), 
      fechaStr: `${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}` 
    };
  });  

  const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global').sort((a, b) => a.nombre.localeCompare(b.nombre));  

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
            setDiasCerrados(parsed.dias_cerrados || []);
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

  const manejarAsignacion = (area, fechaStr, usuarioId) => {
    if (diasCerrados.includes(fechaStr)) return;
    
    setAsignaciones(prev => ({ 
      ...prev, 
      [area]: { 
        ...(prev[area] || {}), 
        [fechaStr]: usuarioId 
      } 
    }));
    
    setEvidencias(prev => { 
      const nuevas = { ...prev }; 
      if (nuevas[area] && nuevas[area][fechaStr]) delete nuevas[area][fechaStr]; 
      return nuevas; 
    });
    
    setEvaluaciones(prev => { 
      const nuevas = { ...prev }; 
      if (nuevas[area] && nuevas[area][fechaStr]) delete nuevas[area][fechaStr]; 
      return nuevas; 
    });
  };  

  const evaluarLimpieza = (area, fechaStr, status) => {
    if (diasCerrados.includes(fechaStr)) return;
    setEvaluaciones(prev => ({ 
      ...prev, 
      [area]: { 
        ...(prev[area] || {}), 
        [fechaStr]: status 
      } 
    }));
  };  

  // 👇 NUEVO: Función auxiliar para crear rango de fechas
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

  // 👇 ACTUALIZADO: Cerrar auditoría de un rango exacto protegiendo los datos pasados
  const realizarCorteLimpieza = () => {
    if (!fechaDesde || !fechaHasta) return showAlert("Aviso", "Selecciona el rango de fechas para cerrar la auditoría.", "info");
    if (fechaDesde > fechaHasta) return showAlert("Aviso", "La fecha 'Desde' no puede ser mayor que la fecha 'Hasta'.", "warning");

    const fechasRango = obtenerRangoFechas(fechaDesde, fechaHasta);

    showConfirm(
      "🔒 Corte de Limpieza Parcial", 
      `Esto auditará y BLOQUEARÁ las áreas de limpieza desde el ${fechaDesde} hasta el ${fechaHasta}. Las fechas seleccionadas ya no podrán ser evaluadas ni modificadas.`, 
      async () => {
        setIsSubmitting(true);
        try {
          const resConfig = await fetch(`${apiUrl}/configuracion`);
          let matrizActual = {};
          if (resConfig.ok) {
            const dataConfig = await resConfig.json();
            matrizActual = typeof dataConfig.matriz_limpieza === 'string' ? JSON.parse(dataConfig.matriz_limpieza || '{}') : (dataConfig.matriz_limpieza || {});
          }

          // 👇 Inyectamos exclusivamente el rango seleccionado a los días cerrados
          const nuevosDiasCerrados = [...new Set([...diasCerrados, ...fechasRango])];  
          
          const payload = { ...matrizActual, areas, asignaciones, evidencias, evaluaciones, dias_cerrados: nuevosDiasCerrados };
          const formData = new FormData();
          formData.append('matriz_limpieza', JSON.stringify(payload));  
          
          const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
          if (res.ok) {
            setDiasCerrados(nuevosDiasCerrados);
            showAlert("Auditoría Cerrada", `Las limpiezas entre ${fechaDesde} y ${fechaHasta} han sido bloqueadas exitosamente.`, "success");
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

      const payload = { ...matrizActual, areas, asignaciones, evidencias, evaluaciones, dias_cerrados: diasCerrados };
      const formData = new FormData();
      formData.append('matriz_limpieza', JSON.stringify(payload));  
      
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
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

  return (
    <div className="bg-white p-4 md:p-8 rounded-[32px] shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4 w-full max-w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-teal-50 p-6 rounded-3xl border border-teal-100">
        <div className="flex items-center gap-4">
          <div className="bg-teal-500 text-white p-3 rounded-2xl shadow-md">
            <Calendar size={28}/>
          </div>
          <div>
            <h3 className="text-2xl font-black text-teal-900 tracking-tight">Limpieza Mensual</h3>
            <p className="text-teal-700 font-bold text-sm uppercase tracking-widest">{mesNombre}</p>
          </div>
        </div>
        <form onSubmit={agregarArea} className="flex w-full md:w-auto gap-2">
          <input 
            type="text" 
            value={nuevaArea} 
            onChange={(e) => setNuevaArea(e.target.value)} 
            placeholder="Nueva Área (Ej. Barra)..." 
            className="w-full md:w-64 bg-white border border-teal-200 rounded-xl px-4 py-3 outline-none focus:border-teal-500 font-bold text-teal-900 shadow-sm" 
          />
          <button 
            type="submit" 
            disabled={!nuevaArea.trim()} 
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-xl font-black transition disabled:opacity-50 flex items-center gap-2 shadow-md shadow-teal-500/20"
          >
            <Plus size={20}/> <span className="hidden sm:inline">Agregar</span>
          </button>
        </form>
      </div>  

      <div className="w-full max-w-full overflow-x-auto border border-slate-200 rounded-3xl mb-8 custom-scrollbar">
        {areas.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Sparkles size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold text-lg">Aún no has agregado áreas de limpieza.</p>
            <p className="text-sm">Agrega tu primera área en el recuadro superior.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                <th className="p-4 border-r border-slate-200 w-48 sticky left-0 bg-slate-100 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Área a Limpiar</th>
                {diasMes.map(d => (
                  <th key={d.fechaStr} className="p-3 text-center border-r border-slate-200 min-w-[160px]">
                    <div className={`text-xs font-black p-1.5 rounded-lg ${d.nombre.startsWith('S') || d.nombre.startsWith('D') ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
                      {d.num} {d.nombre}
                    </div>
                  </th>
                ))}
                <th className="p-4 text-center w-20 sticky right-0 bg-slate-100 z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">Acción</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area} className="border-b border-slate-100 hover:bg-slate-50 transition group">
                  <td className="p-4 border-r border-slate-100 font-black text-slate-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] align-middle group-hover:bg-slate-50">
                    {area}
                  </td>
                  {diasMes.map(d => {
                    const isCerrado = diasCerrados.includes(d.fechaStr);
                    const empleadosDelDia = empleadosVisibles.filter(emp => { 
                      try { 
                        const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal) : (emp.horario_semanal || {}); 
                        return hor[d.fechaStr] && hor[d.fechaStr].activo === true; 
                      } catch(e) { return false; } 
                    });  

                    return (
                      <td key={`${area}-${d.fechaStr}`} className={`p-3 border-r border-slate-100 align-top ${isCerrado ? 'bg-slate-100/50 opacity-80' : ''}`}>  
                        {isCerrado ? (
                          <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-3 h-full shadow-inner min-h-[90px]">
                            <Lock size={16} className="text-slate-400 mb-1" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Auditoría<br/>Cerrada</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <select 
                              value={asignaciones[area]?.[d.fechaStr] || ''} 
                              onChange={(e) => manejarAsignacion(area, d.fechaStr, e.target.value)} 
                              className={`w-full p-2.5 rounded-xl border outline-none font-bold text-xs cursor-pointer appearance-none text-center transition-colors ${asignaciones[area]?.[d.fechaStr] ? 'bg-teal-50 border-teal-200 text-teal-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white'}`}
                            >
                              <option value="">-- Sin asignar --</option>
                              {empleadosDelDia.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                              ))}
                            </select>  
                            {asignaciones[area]?.[d.fechaStr] && (
                              <div className="mt-1 border-t border-slate-200 pt-2 space-y-2 animate-in fade-in">
                                {evidencias[area]?.[d.fechaStr] ? (
                                  <a href={evidencias[area][d.fechaStr]} target="_blank" rel="noreferrer" className="block w-full h-20 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors relative group/foto shadow-sm">
                                    <img src={evidencias[area][d.fechaStr]} alt="Evidencia" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/foto:opacity-100 flex items-center justify-center transition-opacity">
                                      <span className="text-[10px] text-white font-black tracking-widest uppercase drop-shadow-md">Ver Foto</span>
                                    </div>
                                  </a>
                                ) : (
                                  <div className="h-12 border border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50/50">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest px-2">Sin Foto</span>
                                  </div>
                                )}  
                                {!evaluaciones[area]?.[d.fechaStr] ? (
                                  <div className="flex gap-1.5 w-full">
                                    <button onClick={() => evaluarLimpieza(area, d.fechaStr, 'cumplio')} className="flex-1 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 text-[10px] py-2 rounded-lg font-black transition-all shadow-sm">SÍ</button>
                                    <button onClick={() => evaluarLimpieza(area, d.fechaStr, 'no_cumplio')} className="flex-1 bg-white text-red-600 border border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500 text-[10px] py-2 rounded-lg font-black transition-all shadow-sm">NO</button>
                                  </div>
                                ) : (
                                  <div className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider shadow-sm ${evaluaciones[area][d.fechaStr] === 'cumplio' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                    <span>{evaluaciones[area][d.fechaStr] === 'cumplio' ? '✅ Cumplió' : '❌ Falló'}</span>
                                    <button onClick={() => evaluarLimpieza(area, d.fechaStr, null)} className="opacity-80 hover:opacity-100 hover:scale-110 transition-all bg-black/20 p-1 rounded-md">
                                      <RotateCcw size={12}/>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center align-middle sticky right-0 bg-white z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">
                    <button onClick={() => eliminarArea(area)} className="p-3 bg-white border border-red-100 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition shadow-sm">
                      <Trash2 size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>  

      {/* 👇 NUEVA ZONA INFERIOR CON LOS FILTROS DE FECHAS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
        <div className="flex flex-col lg:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-5 py-3 rounded-2xl text-sm font-bold border border-amber-200 shadow-sm whitespace-nowrap">
            <AlertCircle size={18}/> ¡Guarda al asignar o evaluar!
          </div>
          
          {areas.length > 0 && (
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
                className="w-full sm:w-auto text-sm font-bold flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl transition shadow-sm bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-50"
              >
                <Lock size={18}/> Cerrar Auditoría
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={guardarMatriz} 
          disabled={isSubmitting || areas.length === 0} 
          className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-teal-400 px-10 py-4 rounded-2xl font-black transition active:scale-95 shadow-xl shadow-slate-900/20 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
        >
          <Save size={24}/> {isSubmitting ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
};  

export default ZonasLimpieza;