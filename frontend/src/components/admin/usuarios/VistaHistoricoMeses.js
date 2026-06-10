import React, { useState, useEffect, useCallback } from 'react';
import { History, Calendar, CheckCircle2, XCircle, Sparkles } from 'lucide-react';  

const VistaHistoricoMeses = ({ usuariosDB, apiUrl }) => {
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [datosProcesados, setDatosProcesados] = useState([]);
  const [cargando, setCargando] = useState(false);  

  // Calcula los días del mes seleccionado
  const [year, month] = mesFiltro.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const diasMes = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month - 1, i + 1);
    return {
      num: i + 1,
      nombreBreve: d.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase(),
      fechaStr: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    };
  });  

  const cargarHistorico = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`${apiUrl}/usuarios/rendimiento?periodo=mes&fecha=${mesFiltro}-01`);
      if (res.ok) {
        const data = await res.json();
        const cortes = data.cortesNomina || [];  
        const consolidados = {};  

        cortes.forEach(corte => {
          const datosCorte = typeof corte.datos_corte === 'string' ? JSON.parse(corte.datos_corte) : corte.datos_corte;  
          datosCorte.forEach(emp => {
            // 👇 MODIFICACIÓN APLICADA AQUÍ: Solo el 'Administrador Global' es excluido del histórico
            if (emp.nombre === 'Administrador Global') return;  
            
            if (!consolidados[emp.id]) {
              consolidados[emp.id] = {
                id: emp.id,
                nombre: emp.nombre,
                rol: emp.rol,
                horario: {},
                limpiezaDetalle: {}
              };
            }  
            // FUSIONAR HORARIOS
            consolidados[emp.id].horario = { ...consolidados[emp.id].horario, ...(emp.horario || {}) };  
            
            // FUSIONAR LIMPIEZA DETALLADA
            if (emp.limpieza && emp.limpieza.detalle) {
              Object.keys(emp.limpieza.detalle).forEach(diaKey => {
                if (diaKey.startsWith(mesFiltro)) {
                  consolidados[emp.id].limpiezaDetalle[diaKey] = emp.limpieza.detalle[diaKey];
                }
              });
            }
          });
        });  
        const result = Object.values(consolidados).sort((a, b) => a.nombre.localeCompare(b.nombre));
        setDatosProcesados(result);
      }
    } catch (e) {
      console.error("Error al cargar histórico de meses", e);
    }
    setCargando(false);
  }, [apiUrl, mesFiltro]);  

  useEffect(() => {
    cargarHistorico();
  }, [cargarHistorico]);  

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-6 rounded-[24px] shadow-xl gap-4 w-full max-w-full print:hidden">
        <div className="flex items-center gap-4 text-white">
          <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl shadow-md"><History size={28} className="text-blue-400" /></div>
          <div>
            <h3 className="text-xl font-black tracking-tight leading-none mb-1">Archivo Histórico</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Auditoría de Meses Pasados</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <label className="text-slate-400 text-xs font-black uppercase tracking-widest">Seleccionar Mes:</label>
          <input
            type="month"
            value={mesFiltro}
            onChange={e => setMesFiltro(e.target.value)}
            className="w-full md:w-auto bg-slate-800 text-blue-400 border border-slate-700 px-4 py-3 rounded-2xl font-black outline-none focus:border-blue-500 transition-colors"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>  

      {cargando ? (
        <div className="py-20 text-center text-slate-400 animate-pulse">
          <History size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-black text-xl">Recopilando archivos del mes...</p>
        </div>
      ) : datosProcesados.length === 0 ? (
        <div className="bg-slate-50 p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200">
          <Calendar size={64} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-2xl font-black text-slate-600">Mes sin registros</h3>
          <p className="text-slate-500 font-medium mt-2 max-w-md mx-auto">
            No se encontraron cortes de nómina ni limpiezas guardadas para {mesFiltro}.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-[24px] border border-slate-200 shadow-sm custom-scrollbar w-full max-w-full">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.03)] z-20">Empleado</th>
                {diasMes.map(d => (
                  <th key={d.fechaStr} className="p-3 text-center border-l border-slate-200 min-w-[140px]">
                    <div className={`text-xs font-black p-2 rounded-xl ${d.nombreBreve.startsWith('S') || d.nombreBreve.startsWith('D') ? 'bg-red-100 text-red-600' : 'bg-white text-slate-600 border border-slate-200 shadow-sm'}`}>
                      {d.num} <span className="block mt-0.5 text-[9px] uppercase tracking-widest">{d.nombreBreve}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datosProcesados.map(emp => {
                const horarioGuardado = emp.horario || {};
                const limpiezaDetalle = emp.limpiezaDetalle || {};  
                
                return (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                    <td className="p-5 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-10 group-hover:bg-slate-50">
                      <p className="font-black text-slate-800 text-sm whitespace-nowrap">{emp.nombre}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{emp.rol}</p>
                    </td>
                    {diasMes.map(d => {
                      const diaHorario = horarioGuardado[d.fechaStr];
                      const limpiezasDelDia = limpiezaDetalle[d.fechaStr];  
                      
                      return (
                        <td key={d.fechaStr} className="p-3 border-l border-slate-100 text-center align-top">  
                          {/* 1. HORARIOS */}
                          {!diaHorario || !diaHorario.activo ? (
                            <div className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest p-2 rounded-lg border border-slate-200 mb-2">
                              Descanso
                            </div>
                          ) : (
                            <div className={`text-[11px] font-black uppercase tracking-widest p-2 rounded-lg border mb-2 ${diaHorario.pagado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                              {diaHorario.entrada} - {diaHorario.salida}
                              {diaHorario.pagado && <span className="block text-[8px] opacity-70 mt-0.5">✅ Pagado</span>}
                            </div>
                          )}  
                          
                          {/* 2. LIMPIEZAS */}
                          {limpiezasDelDia && limpiezasDelDia.length > 0 && (
                            <div className="flex flex-col gap-1 mt-2 border-t border-dashed border-slate-200 pt-2">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1"><Sparkles size={10}/> Auditoría Limpieza</span>
                              {limpiezasDelDia.map((limp, idx) => (
                                <div key={idx} className={`flex items-center justify-between px-2 py-1 rounded border text-[9px] font-black uppercase ${limp.status === 'cumplio' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                  <span className="truncate max-w-[80px] text-left" title={limp.area}>{limp.area}</span>
                                  {limp.status === 'cumplio' ? <CheckCircle2 size={12} className="shrink-0"/> : <XCircle size={12} className="shrink-0"/>}
                                </div>
                              ))}
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
      )}
    </div>
  );
};  

export default VistaHistoricoMeses;