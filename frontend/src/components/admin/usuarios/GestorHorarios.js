import React, { useState } from 'react';
import { Save, Calendar } from 'lucide-react';

const GestorHorarios = ({ usuariosDB, apiUrl, refrescarDatos, showAlert }) => {
  const [horariosTemp, setHorariosTemp] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = hoy.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mesNombre = hoy.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
  
  const diasMes = Array.from({length: daysInMonth}, (_, i) => {
      const d = new Date(year, month, i + 1);
      return { 
          num: i + 1, 
          nombre: d.toLocaleDateString('es-ES', {weekday: 'short'}).toUpperCase(), 
          fechaStr: `${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}` 
      };
  });

  const empleadosVisibles = usuariosDB.filter(u => u.usuario !== 'admin').sort((a, b) => a.nombre.localeCompare(b.nombre));

  const handleHorarioChange = (userId, fechaStr, campo, valor) => {
    setHorariosTemp(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [fechaStr]: { ...((prev[userId] || {})[fechaStr] || {}), [campo]: valor }
      }
    }));
  };

  const guardarHorarios = async () => {
    if (Object.keys(horariosTemp).length === 0) return showAlert('Aviso', 'No hay cambios que guardar.', 'info');
    setIsSubmitting(true);
    try {
      for (const [userId, cambiosFechas] of Object.entries(horariosTemp)) {
        const emp = usuariosDB.find(u => u.id === Number(userId));
        const horarioActual = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        
        const horarioNuevo = { ...horarioActual, ...cambiosFechas };
        
        await fetch(`${apiUrl}/usuarios/${userId}/horario`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ horario_semanal: horarioNuevo })
        });
      }
      showAlert('Éxito', 'Horarios mensuales guardados.', 'success');
      setHorariosTemp({});
      refrescarDatos();
    } catch (error) { showAlert('Error', 'Problema al guardar.', 'error'); }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-purple-50 p-6 rounded-[24px] border border-purple-100 gap-4">
        <div className="flex items-center gap-4 text-purple-700">
            <div className="bg-purple-500 text-white p-3 rounded-2xl shadow-md"><Calendar size={28} /></div>
            <div>
                <h3 className="text-xl font-black tracking-tight leading-none mb-1">Planificador Mensual</h3>
                <p className="text-xs font-bold uppercase tracking-widest">{mesNombre}</p>
            </div>
        </div>
        <button disabled={isSubmitting} onClick={guardarHorarios} className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-purple-500/30 transition flex items-center justify-center gap-2 active:scale-95">
          <Save size={20}/> Guardar Cambios
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-[24px] border border-slate-200 shadow-sm custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.03)] z-10">Empleado</th>
              {diasMes.map(d => (
                <th key={d.fechaStr} className="p-3 text-center border-l border-slate-200 min-w-[140px]">
                  <div className={`text-xs font-black p-2 rounded-xl ${d.nombre.startsWith('S') || d.nombre.startsWith('D') ? 'bg-red-100 text-red-600' : 'bg-white text-slate-600 border border-slate-200 shadow-sm'}`}>
                    {d.num} <span className="block mt-0.5 text-[9px] uppercase tracking-widest">{d.nombre}</span>
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
                  <td className="p-5 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.03)] z-10 group-hover:bg-slate-50">
                    <p className="font-black text-slate-800 text-sm whitespace-nowrap">{emp.nombre}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{emp.rol}</p>
                  </td>
                  {diasMes.map(d => {
                    const diaGuardado = horarioGuardado[d.fechaStr] || { entrada: '', salida: '', activo: false };
                    const diaEditado = (horariosTemp[emp.id] && horariosTemp[emp.id][d.fechaStr]) ? horariosTemp[emp.id][d.fechaStr] : diaGuardado;
                    
                    return (
                      <td key={d.fechaStr} className={`p-3 border-l border-slate-100 text-center transition-all ${diaEditado.activo ? 'bg-purple-50/30' : ''}`}>
                        <div className="flex flex-col gap-2 items-center">
                          <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:border-purple-300">
                             <input type="checkbox" checked={diaEditado.activo || false} onChange={(e) => handleHorarioChange(emp.id, d.fechaStr, 'activo', e.target.checked)} className="accent-purple-500 w-4 h-4 cursor-pointer" />
                             <span className="text-[10px] font-black text-slate-500 uppercase">Trabaja</span>
                          </label>

                          <div className={`flex flex-col gap-1 w-full transition-opacity ${diaEditado.activo ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                            <input type="time" title="Entrada" disabled={!diaEditado.activo} value={diaEditado.entrada || '08:00'} onChange={(e) => handleHorarioChange(emp.id, d.fechaStr, 'entrada', e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-purple-500 font-bold text-slate-700 text-center" />
                            <input type="time" title="Salida" disabled={!diaEditado.activo} value={diaEditado.salida || '16:00'} onChange={(e) => handleHorarioChange(emp.id, d.fechaStr, 'salida', e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-purple-500 font-bold text-slate-700 text-center" />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GestorHorarios;