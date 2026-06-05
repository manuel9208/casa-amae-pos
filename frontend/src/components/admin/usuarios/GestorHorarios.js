import React, { useState, useEffect } from 'react';
import { CalendarClock, Save, History } from 'lucide-react';  

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];  

const GestorHorarios = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm }) => {
  const empleadosVisibles = usuariosDB.filter(u => u.usuario !== 'admin').sort((a, b) => a.nombre.localeCompare(b.nombre));  

  const [empleadoActivoId, setEmpleadoActivoId] = useState('');
  const [horarioForm, setHorarioForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);  

  useEffect(() => {
    if (!empleadoActivoId) return setHorarioForm({});
    const emp = usuariosDB.find(e => e.id === Number(empleadoActivoId));
    if (emp) {
      try {
        const h = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal) : (emp.horario_semanal || {});
        const formConstruido = {};
        diasSemana.forEach(dia => {
          formConstruido[dia] = h[dia] || { activo: false, entrada: '08:00', salida: '16:00' };
        });
        setHorarioForm(formConstruido);
      } catch (e) {
        setHorarioForm({});
      }
    }
  }, [empleadoActivoId, usuariosDB]);  

  const handleHorarioChange = (dia, campo, valor) => {
    setHorarioForm(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor }
    }));
  };  

  const guardarHorario = async () => {
    if (!empleadoActivoId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/usuarios/${empleadoActivoId}/horario`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horario_semanal: horarioForm })
      });
      if (res.ok) {
        showAlert("¡Guardado!", "El horario semanal del empleado ha sido actualizado.", "success");
        refrescarDatos();
      } else {
        showAlert("Error", "No se pudo guardar el horario.", "error");
      }
    } catch (e) {
      showAlert("Error", "Error de red al guardar.", "error");
    }
    setIsSubmitting(false);
  };  

  const realizarCorteNómina = async () => {
    showConfirm(
      "Corte Semanal de Nómina",
      "¿Estás seguro de generar el histórico? Esto archivará los turnos y la limpieza y LUEGO REINICIARÁ LOS HORARIOS de todos los empleados para comenzar una nueva semana.",
      async () => {
        setIsSubmitting(true);
        try {
          const resConfig = await fetch(`${apiUrl}/configuracion`);
          const dataConfig = await resConfig.json();
          const matriz = typeof dataConfig.matriz_limpieza === 'string' ? JSON.parse(dataConfig.matriz_limpieza || '{}') : (dataConfig.matriz_limpieza || {});
          const evaluaciones = matriz.evaluaciones || {};  

          const datosCorte = empleadosVisibles.map(emp => {
            const h = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
            const diasTrabajados = diasSemana.filter(d => h[d]?.activo).length;  
            
            let limpiezasCumplidas = 0;
            let limpiezasIncumplidas = 0;
            Object.keys(evaluaciones).forEach(area => {
              Object.keys(evaluaciones[area]).forEach(dia => {
                if (matriz.asignaciones?.[area]?.[dia] === String(emp.id) || matriz.asignaciones?.[area]?.[dia] === Number(emp.id)) {
                  if (evaluaciones[area][dia] === 'cumplio') limpiezasCumplidas++;
                  if (evaluaciones[area][dia] === 'no_cumplio') limpiezasIncumplidas++;
                }
              });
            });  

            return {
              id: emp.id,
              nombre: emp.nombre,
              rol: emp.rol,
              dias_trabajados: diasTrabajados,
              horario: h,
              limpieza: {
                cumplidas: limpiezasCumplidas,
                incumplidas: limpiezasIncumplidas
              }
            };
          });  

          const userObj = JSON.parse(localStorage.getItem('pos_sesion') || '{}').data || {};
          const res = await fetch(`${apiUrl}/usuarios/corte-nomina`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              usuario_admin_id: userObj.id || null,
              datos_corte: datosCorte
            })
          });  

          if (res.ok) {
            await Promise.all(empleadosVisibles.map(emp =>
              fetch(`${apiUrl}/usuarios/${emp.id}/horario`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ horario_semanal: {} })
              })
            ));  

            showAlert("✅ Corte Procesado", "La nómina ha sido archivada en el histórico y los horarios han sido limpiados para la nueva semana.", "success");
            setHorarioForm({});
            setEmpleadoActivoId('');
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
    <div className="space-y-8 animate-in slide-in-from-bottom-4">  
      {/* SECCIÓN 1: ASIGNACIÓN DE HORARIOS */}
      {/* 👇 AJUSTE RESPONSIVO: p-4 md:p-8 y w-full max-w-full */}
      <div className="bg-white p-4 md:p-8 rounded-[32px] shadow-sm border border-slate-200 w-full max-w-full">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <CalendarClock className="text-purple-500"/> Asignación de Turnos por Empleado
        </h3>  

        <div className="mb-6 max-w-sm">
          <label className="text-xs font-bold text-slate-400 block mb-1">Selecciona el Empleado</label>
          <select value={empleadoActivoId} onChange={(e) => setEmpleadoActivoId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 cursor-pointer">
            <option value="">-- Elige un empleado --</option>
            {empleadosVisibles.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre} ({emp.rol})</option>
            ))}
          </select>
        </div>  

        {empleadoActivoId ? (
          {/* 👇 AJUSTE RESPONSIVO: w-full max-w-full overflow-x-auto */}
          <div className="w-full max-w-full overflow-x-auto rounded-2xl border border-slate-200 mb-6">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
                  <th className="p-4 w-32">Día</th>
                  <th className="p-4 text-center w-32">¿Trabaja?</th>
                  <th className="p-4 text-center">Hora Entrada</th>
                  <th className="p-4 text-center">Hora Salida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diasSemana.map(dia => (
                  <tr key={dia} className={`transition ${horarioForm[dia]?.activo ? 'bg-white' : 'bg-slate-50/50 opacity-60'}`}>
                    <td className="p-4 font-bold text-slate-700">{dia}</td>
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={horarioForm[dia]?.activo || false}
                        onChange={(e) => handleHorarioChange(dia, 'activo', e.target.checked)}
                        className="w-5 h-5 accent-purple-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="time"
                        disabled={!horarioForm[dia]?.activo}
                        value={horarioForm[dia]?.entrada || '08:00'}
                        onChange={(e) => handleHorarioChange(dia, 'entrada', e.target.value)}
                        className="w-full p-2 text-center bg-slate-100 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 focus:border-purple-500 disabled:opacity-50"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="time"
                        disabled={!horarioForm[dia]?.activo}
                        value={horarioForm[dia]?.salida || '16:00'}
                        onChange={(e) => handleHorarioChange(dia, 'salida', e.target.value)}
                        className="w-full p-2 text-center bg-slate-100 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 focus:border-purple-500 disabled:opacity-50"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 font-bold">
            Por favor selecciona a un empleado arriba para editar sus horarios de la semana.
          </div>
        )}  

        {empleadoActivoId && (
          <div className="flex justify-end pt-4">
            <button onClick={guardarHorario} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-black transition active:scale-95 shadow-lg flex items-center gap-2">
              <Save size={18}/> Guardar Turnos
            </button>
          </div>
        )}
      </div>  

      {/* SECCIÓN 2: VISTA GENERAL SEMANAL */}
      {/* 👇 AJUSTE RESPONSIVO: p-4 md:p-8 y w-full max-w-full */}
      <div className="bg-white p-4 md:p-8 rounded-[32px] shadow-sm border border-slate-200 w-full max-w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <CalendarClock className="text-blue-500"/> Cuadrante de la Semana
          </h3>
          <button onClick={realizarCorteNómina} disabled={isSubmitting} className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-emerald-400 px-6 py-3 rounded-xl font-black transition active:scale-95 shadow-lg flex items-center justify-center gap-2">
            <History size={18}/> Realizar Corte de Nómina
          </button>
        </div>  

        {/* 👇 AJUSTE RESPONSIVO: w-full max-w-full overflow-x-auto */}
        <div className="w-full max-w-full overflow-x-auto rounded-3xl border border-slate-200">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-100 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
                <th className="p-4 border-r border-slate-200 sticky left-0 bg-slate-100 z-10 w-48 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Empleado</th>
                {diasSemana.map(dia => (
                  <th key={dia} className="p-4 text-center border-r border-slate-200 w-32">{dia}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empleadosVisibles.map(emp => {
                const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
                return (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="p-4 border-r border-slate-100 font-bold text-slate-700 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                      {emp.nombre} <br/> <span className="text-[10px] text-slate-400 uppercase tracking-widest">{emp.rol}</span>
                    </td>
                    {diasSemana.map(dia => (
                      <td key={`${emp.id}-${dia}`} className="p-3 text-center border-r border-slate-100 align-middle">
                        {hor[dia]?.activo ? (
                          <div className="bg-emerald-50 text-emerald-700 text-xs font-black py-1.5 rounded-lg border border-emerald-100">
                            {hor[dia].entrada} - {hor[dia].salida}
                          </div>
                        ) : (
                          <div className="text-slate-300 text-[10px] font-bold uppercase">Descanso</div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};  

export default GestorHorarios;