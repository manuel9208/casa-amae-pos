import React, { useState, useEffect } from 'react';
import { Save, History, Lock, Calendar, Clock, Palmtree, CheckCircle2, XCircle } from 'lucide-react';  

const diasSemanaMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];  

const GestorHorarios = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm }) => {
  const [horariosTemp, setHorariosTemp] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [horarioNegocio, setHorarioNegocio] = useState({});  

  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = hoy.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mesNombre = hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase();  

  const strHoy = `${year}-${String(month + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;  

  const diasMes = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return { num: i + 1, nombreBreve: d.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase(), nombreCompleto: diasSemanaMap[d.getDay()], fechaStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}` };
  });  

  // 👇 MODIFICACIÓN APLICADA AQUÍ (Ya no excluimos el rol 'admin')
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

  const realizarCorteNómina = async () => {
    showConfirm(
      "Corte y Bloqueo de Nómina",
      "Se procesará el corte hasta el día de HOY. Los días laborados se marcarán como PAGADOS y se bloquearán para que ya no puedan ser modificados ni vueltos a pagar.",
      async () => {
        setIsSubmitting(true);
        try {
          const resConfig = await fetch(`${apiUrl}/configuracion`);
          const dataConfig = await resConfig.json();
          const matriz = typeof dataConfig.matriz_limpieza === 'string' ? JSON.parse(dataConfig.matriz_limpieza || '{}') : (dataConfig.matriz_limpieza || {});
          const evaluaciones = matriz.evaluaciones || {};  

          const datosCorte = empleadosVisibles.map(emp => {
            const h = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
            const diasNuevosPagados = diasMes.filter(d => h[d.fechaStr]?.activo && !h[d.fechaStr]?.pagado && d.fechaStr <= strHoy).length;
            let limpiezasCumplidas = 0, limpiezasIncumplidas = 0, limpiezaDetalle = {};  

            Object.keys(evaluaciones).forEach(area => {
              Object.keys(evaluaciones[area]).forEach(diaStr => {
                if (diaStr <= strHoy && String(matriz.asignaciones?.[area]?.[diaStr]) === String(emp.id)) {
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
              diasMes.forEach(d => {
                if (d.fechaStr <= strHoy) {
                  if (!hNuevo[d.fechaStr]) hNuevo[d.fechaStr] = { activo: false };
                  hNuevo[d.fechaStr].pagado = true;
                }
              });
              return fetch(`${apiUrl}/usuarios/${emp.id}/horario`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ horario_semanal: hNuevo })
              });
            }));
            showAlert("✅ Corte Procesado", "Los días hasta HOY han sido pagados y bloqueados exitosamente.", "success");
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
                            <Palmtree size={16} className="text-amber-500 mb-1" />
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

      <div className="bg-slate-900 p-6 md:p-8 rounded-[32px] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full max-w-full">
        <div><h3 className="text-xl font-black text-white flex items-center gap-2"><History className="text-emerald-400" /> Corte de Horarios hasta HOY</h3><p className="text-slate-400 text-xs mt-1 font-medium max-w-xl">Extraerá las horas trabajadas desde el inicio de mes hasta el día actual. <span className="text-emerald-300 font-bold">Los días anteriores se bloquearán 🔒 y ya no podrán ser pagados dos veces.</span></p></div>
        <button onClick={realizarCorteNómina} disabled={isSubmitting} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 py-4 rounded-2xl font-black transition active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"><History size={18} /> Efectuar Corte Parcial</button>
      </div>
    </div>
  );
};  

export default GestorHorarios;