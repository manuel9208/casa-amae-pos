import React, { useState, useEffect } from 'react';
import { Save, Calendar, Clock, History } from 'lucide-react';

const diasSemanaMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const GestorHorarios = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm }) => {
  const [horariosTemp, setHorariosTemp] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [horarioNegocio, setHorarioNegocio] = useState({}); // 👈 ESTADO PARA HORARIO GLOBAL

  // Cálculo del Mes Actual
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = hoy.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mesNombre = hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase();

  const diasMes = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return {
      num: i + 1,
      nombreBreve: d.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase(),
      nombreCompleto: diasSemanaMap[d.getDay()], // Necesario para cruzarlo con el ConfigGlobal
      fechaStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    };
  });

  const empleadosVisibles = usuariosDB.filter(u => u.rol !== 'admin' && u.nombre !== 'Administrador Global').sort((a, b) => a.nombre.localeCompare(b.nombre));

  // 👇 LECTURA INTELIGENTE DE LA CONFIGURACIÓN GLOBAL
  useEffect(() => {
    fetch(`${apiUrl}/configuracion`)
      .then(res => res.json())
      .then(data => {
        if (data && data.horarios_semana) {
          try {
            const h = typeof data.horarios_semana === 'string' ? JSON.parse(data.horarios_semana) : data.horarios_semana;
            setHorarioNegocio(h || {});
          } catch (e) { console.error("Error parseando horario de negocio"); }
        }
      })
      .catch(() => console.error("Error al cargar horarios del negocio"));
  }, [apiUrl]);

  const handleHorarioChange = (userId, fechaStr, campo, valor, configDiaGlobal) => {
    setHorariosTemp(prev => {
      const empPrev = prev[userId] || {};
      const diaPrev = empPrev[fechaStr] || {};

      let nuevosValores = { [campo]: valor };

      // 👇 AUTO-COMPLETADO INTELIGENTE BASADO EN EL RESTAURANTE
      if (campo === 'activo' && valor === true) {
        nuevosValores.entrada = diaPrev.entrada || configDiaGlobal.apertura || '08:00';
        nuevosValores.salida = diaPrev.salida || configDiaGlobal.cierre || '22:00';
      }

      return {
        ...prev,
        [userId]: {
          ...empPrev,
          [fechaStr]: { ...diaPrev, ...nuevosValores }
        }
      };
    });
  };

  const guardarHorarios = async () => {
    if (Object.keys(horariosTemp).length === 0) return showAlert('Aviso', 'No hay cambios que guardar.', 'info');
    setIsSubmitting(true);
    try {
      // Guardar cambios iterando por empleado
      await Promise.all(Object.entries(horariosTemp).map(async ([userId, cambiosFechas]) => {
        const emp = usuariosDB.find(u => u.id === Number(userId));
        const horarioActual = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        const horarioNuevo = { ...horarioActual, ...cambiosFechas };

        return fetch(`${apiUrl}/usuarios/${userId}/horario`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ horario_semanal: horarioNuevo })
        });
      }));

      showAlert('¡Éxito!', 'Los horarios del mes han sido guardados.', 'success');
      setHorariosTemp({});
      refrescarDatos();
    } catch (error) {
      showAlert('Error', 'Problema de conexión al guardar.', 'error');
    }
    setIsSubmitting(false);
  };

  const realizarCorteNómina = async () => {
    showConfirm(
      "Corte y Reseteo de Nómina",
      "¿Deseas procesar el corte de este periodo? La nómina se guardará en el histórico inmutable y los horarios del mes de todos los empleados se reiniciarán a cero.",
      async () => {
        setIsSubmitting(true);
        try {
          const resConfig = await fetch(`${apiUrl}/configuracion`);
          const dataConfig = await resConfig.json();
          const matriz = typeof dataConfig.matriz_limpieza === 'string' ? JSON.parse(dataConfig.matriz_limpieza || '{}') : (dataConfig.matriz_limpieza || {});
          const evaluaciones = matriz.evaluaciones || {};

          const datosCorte = empleadosVisibles.map(emp => {
            const h = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
            const diasTrabajados = diasMes.filter(d => h[d.fechaStr]?.activo).length;

            let limpiezasCumplidas = 0, limpiezasIncumplidas = 0;
            Object.keys(evaluaciones).forEach(area => {
              Object.keys(evaluaciones[area]).forEach(dia => {
                if (String(matriz.asignaciones?.[area]?.[dia]) === String(emp.id)) {
                  if (evaluaciones[area][dia] === 'cumplio') limpiezasCumplidas++;
                  if (evaluaciones[area][dia] === 'no_cumplio') limpiezasIncumplidas++;
                }
              });
            });

            return {
              id: emp.id, nombre: emp.nombre, rol: emp.rol, dias_trabajados: diasTrabajados, horario: h,
              limpieza: { cumplidas: limpiezasCumplidas, incumplidas: limpiezasIncumplidas }
            };
          });

          const userObj = JSON.parse(localStorage.getItem('pos_sesion') || '{}').data || {};
          const res = await fetch(`${apiUrl}/usuarios/corte-nomina`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario_admin_id: userObj.id || null, datos_corte: datosCorte })
          });

          if (res.ok) {
            // Vaciar los horarios de todos para el nuevo mes
            await Promise.all(empleadosVisibles.map(emp =>
              fetch(`${apiUrl}/usuarios/${emp.id}/horario`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ horario_semanal: {} })
              })
            ));

            showAlert("✅ Corte Procesado", "La nómina ha sido archivada y los horarios limpiados.", "success");
            setHorariosTemp({});
            refrescarDatos();
          } else {
            showAlert("Error", "Falló la generación del corte.", "error");
          }
        } catch (e) {
          showAlert("Error", "Error de red al generar el corte.", "error");
        }
        setIsSubmitting(false);
      }
    );
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      
      {/* HEADER DEL MES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-purple-50 p-6 rounded-[24px] border border-purple-100 gap-4 w-full max-w-full">
        <div className="flex items-center gap-4 text-purple-700">
          <div className="bg-purple-500 text-white p-3 rounded-2xl shadow-md"><Calendar size={28} /></div>
          <div>
            <h3 className="text-xl font-black tracking-tight leading-none mb-1">Planificador Mensual</h3>
            <p className="text-xs font-bold uppercase tracking-widest">{mesNombre}</p>
          </div>
        </div>
        <button disabled={isSubmitting} onClick={guardarHorarios} className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-purple-500/30 transition flex items-center justify-center gap-2 active:scale-95">
          <Save size={20} /> Guardar Cambios
        </button>
      </div>

      {/* MATRIZ DE HORARIOS MENSUALES */}
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
                    const diaGuardado = horarioGuardado[d.fechaStr] || { entrada: '', salida: '', activo: false };
                    const diaEditado = (horariosTemp[emp.id] && horariosTemp[emp.id][d.fechaStr]) ? horariosTemp[emp.id][d.fechaStr] : diaGuardado;

                    // 👇 EXTRAEMOS LA REGLA GLOBAL PARA ESTE DÍA (Ej. Lunes)
                    const configDiaGlobal = horarioNegocio[d.nombreCompleto] || { activo: true, apertura: '08:00', cierre: '22:00' };

                    return (
                      <td key={d.fechaStr} className={`p-3 border-l border-slate-100 text-center transition-all ${diaEditado.activo ? 'bg-purple-50/30' : ''}`}>
                        
                        {/* 👇 BLOQUEO INTELIGENTE: Si el negocio está cerrado ese día */}
                        {!configDiaGlobal.activo ? (
                          <div className="flex flex-col items-center justify-center bg-slate-100/80 rounded-xl p-3 border border-slate-200 opacity-60 h-[84px]">
                            <Clock size={16} className="text-slate-400 mb-1" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cerrado</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 items-center">
                            <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:border-purple-300 transition-colors">
                              <input 
                                type="checkbox" 
                                checked={diaEditado.activo || false} 
                                onChange={(e) => handleHorarioChange(emp.id, d.fechaStr, 'activo', e.target.checked, configDiaGlobal)} 
                                className="accent-purple-500 w-4 h-4 cursor-pointer" 
                              />
                              <span className="text-[10px] font-black text-slate-500 uppercase">Trabaja</span>
                            </label>

                            <div className={`flex flex-col gap-1 w-full transition-opacity ${diaEditado.activo ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                              <input 
                                type="time" title="Entrada" 
                                disabled={!diaEditado.activo} 
                                value={diaEditado.entrada || configDiaGlobal.apertura} 
                                onChange={(e) => handleHorarioChange(emp.id, d.fechaStr, 'entrada', e.target.value, configDiaGlobal)} 
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-purple-500 font-bold text-slate-700 text-center shadow-sm" 
                              />
                              <input 
                                type="time" title="Salida" 
                                disabled={!diaEditado.activo} 
                                value={diaEditado.salida || configDiaGlobal.cierre} 
                                onChange={(e) => handleHorarioChange(emp.id, d.fechaStr, 'salida', e.target.value, configDiaGlobal)} 
                                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-purple-500 font-bold text-slate-700 text-center shadow-sm" 
                              />
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

      {/* PANEL DE CORTE INFERIOR */}
      <div className="bg-slate-900 p-6 md:p-8 rounded-[32px] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full max-w-full">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <History className="text-emerald-400" /> Cierre de Nómina Mensual
          </h3>
          <p className="text-slate-400 text-xs mt-1 font-medium">Extraerá las horas trabajadas, archiva el mes y reiniciará este calendario a cero.</p>
        </div>
        <button onClick={realizarCorteNómina} disabled={isSubmitting} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 py-4 rounded-2xl font-black transition active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
          <History size={18} /> Ejecutar Corte de Nómina
        </button>
      </div>

    </div>
  );
};

export default GestorHorarios;