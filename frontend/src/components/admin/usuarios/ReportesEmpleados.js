import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ChefHat, Calendar, Printer, FileText } from 'lucide-react';

const ReportesEmpleados = ({ usuariosDB, apiUrl }) => {
  const [reportes, setReportes] = useState({ asistenciasHoy: [], historialAsistencias: [], rendimientoCocina: [] });
  const [periodo, setPeriodo] = useState('dia'); 
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [filtroUsuario, setFiltroUsuario] = useState('Todos'); 

  const cargarReportes = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/usuarios/rendimiento?periodo=${periodo}&fecha=${fechaFiltro}&usuario_id=${filtroUsuario}`);
      if (res.ok) {
        const data = await res.json();
        setReportes(data);
      }
    } catch (error) {
      console.error("Error al cargar reportes de rendimiento", error);
    }
  }, [apiUrl, periodo, fechaFiltro, filtroUsuario]); 

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 print:hidden mb-8">
        <div className="flex items-center gap-4">
          <Calendar className="text-emerald-400" size={32}/>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Controles de Reporte</p>
            <h3 className="text-xl font-bold">Filtro de Historial</h3>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} className="bg-slate-800 text-white border border-slate-700 p-3 rounded-xl font-bold outline-none focus:ring-2 ring-emerald-500">
            <option value="Todos">Todos los empleados</option>
            {usuariosDB.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}
          </select>

          <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="bg-slate-800 text-white border border-slate-700 p-3 rounded-xl font-bold outline-none focus:ring-2 ring-emerald-500">
            <option value="dia">Por Día</option>
            <option value="semana">Por Semana</option>
            <option value="mes">Por Mes</option>
            <option value="anio">Por Año</option>
          </select>
          
          <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} className="bg-slate-800 text-white border border-slate-700 p-3 rounded-xl font-bold outline-none focus:ring-2 ring-emerald-500" style={{ colorScheme: 'dark' }} />
          
          <button onClick={() => window.print()} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-3 rounded-xl font-black flex items-center gap-2 transition active:scale-95">
            <Printer size={20}/> Imprimir
          </button>
        </div>
      </div>

      <div id="seccion-a-imprimir" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Clock className="text-blue-500"/> Personal Activo (Hoy)</h3>
          <div className="space-y-3">
            {reportes.asistenciasHoy?.length === 0 && <p className="text-slate-400 font-bold">Nadie ha iniciado sesión hoy.</p>}
            {reportes.asistenciasHoy?.map((a, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-700">{a.nombre}</p>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{a.rol}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">Entrada: {new Date(a.hora_entrada).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  {a.hora_salida ? (
                    <p className="text-sm font-bold text-red-500 mt-1">Salida: {new Date(a.hora_salida).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  ) : (
                    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-black px-2 py-1 rounded mt-1">Turno Activo</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><ChefHat className="text-orange-500"/> Rendimiento en Cocina ({periodo})</h3>
          <div className="space-y-3">
            {reportes.rendimientoCocina?.length === 0 && <p className="text-slate-400 font-bold">Sin datos para este periodo.</p>}
            {reportes.rendimientoCocina?.map((r, i) => (
              <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 text-orange-600 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg">{i+1}</div>
                  <div>
                    <p className="font-bold text-slate-800">{r.chef}</p>
                    <p className="text-xs font-bold text-slate-500">Tardó {r.tiempo_promedio_minutos} min por platillo en promedio</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-blue-600">{r.pedidos_completados}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedidos</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-emerald-500" size={24}/>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Bitácora Detallada de Asistencia ({periodo})</h3>
          </div>
          
          <div className="overflow-x-auto rounded-3xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  <th className="p-4 border-r border-slate-200">Empleado</th>
                  <th className="p-4 border-r border-slate-200">Fecha</th>
                  <th className="p-4 border-r border-slate-200">Entrada</th>
                  <th className="p-4 border-r border-slate-200">Salida</th>
                  <th className="p-4 text-center">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportes.historialAsistencias?.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-bold">No hay movimientos registrados en este periodo.</td></tr> : reportes.historialAsistencias?.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="p-4 border-r border-slate-100"><p className="font-bold text-slate-700">{h.nombre}</p><p className="text-[9px] text-slate-400 font-bold uppercase">{h.rol}</p></td>
                    <td className="p-4 border-r border-slate-100 font-medium text-slate-600 text-sm">{new Date(h.fecha).toLocaleDateString('es-MX', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'})}</td>
                    <td className="p-4 border-r border-slate-100 font-bold text-emerald-600 text-sm">{new Date(h.hora_entrada).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                    <td className="p-4 border-r border-slate-100 font-bold text-red-500 text-sm">{h.hora_salida ? new Date(h.hora_salida).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</td>
                    <td className="p-4 text-center"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-black text-xs border border-blue-100">{h.horas_trabajadas} hrs</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #seccion-a-imprimir, #seccion-a-imprimir * { visibility: visible; }
          #seccion-a-imprimir { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ReportesEmpleados;