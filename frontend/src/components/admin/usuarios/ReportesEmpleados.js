import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ChefHat, Calendar, Printer, FileText, Sparkles } from 'lucide-react';

const ReportesEmpleados = ({ usuariosDB, apiUrl }) => {
  const [reportes, setReportes] = useState({ asistenciasHoy: [], historialAsistencias: [], rendimientoCocina: [], cortesNomina: [] });
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

  // 👇 1. Ocultar Admin y Ordenar alfabéticamente
  const empleadosVisibles = usuariosDB
    .filter(u => u.usuario !== 'admin')
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  // 👇 2. Convertir la palabra del periodo a una Fecha real legible
  const getTituloFormateado = () => {
    if (!fechaFiltro) return periodo;
    const f = new Date(fechaFiltro + 'T12:00:00'); // Evita desfase de zona horaria
    if (periodo === 'dia') return f.toLocaleDateString('es-MX');
    if (periodo === 'semana') return `Semana del ${f.toLocaleDateString('es-MX')}`;
    if (periodo === 'mes') {
      const str = f.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
    if (periodo === 'anio') return `Año ${f.getFullYear()}`;
    return periodo;
  };

  const tituloPeriodo = getTituloFormateado();

  // 👇 3. Filtro Anti-Duplicados: Muestra solo el corte más reciente de cada día
  const cortesUnicos = [];
  const fechasCortesVistas = new Set();
  (reportes.cortesNomina || []).forEach(corte => {
    const fechaDia = String(corte.fecha_corte).split('T')[0];
    if (!fechasCortesVistas.has(fechaDia)) {
      fechasCortesVistas.add(fechaDia);
      cortesUnicos.push(corte);
    }
  });

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
          {/* 👇 Menú desplegable usando los empleados filtrados y ordenados */}
          <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} className="bg-slate-800 text-white border border-slate-700 p-3 rounded-xl font-bold outline-none focus:ring-2 ring-emerald-500">
            <option value="Todos">Todos los empleados</option>
            {empleadosVisibles.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}
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
        
        {/* WIDGET 1 */}
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

        {/* WIDGET 2 */}
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
          {/* 👇 Título Dinámico */}
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><ChefHat className="text-orange-500"/> Rendimiento en Cocina ({tituloPeriodo})</h3>
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

        {/* WIDGET 3: BITÁCORA */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-emerald-500" size={24}/>
            {/* 👇 Título Dinámico */}
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Bitácora Detallada de Asistencia ({tituloPeriodo})</h3>
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

        {/* WIDGET 4: HISTÓRICO DE LIMPIEZA Y NÓMINA */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="text-teal-500" size={24}/>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Cumplimiento de Limpieza y Turnos (Cortes Históricos)</h3>
          </div>
          
          {/* 👇 Renderiza la lista sin duplicados (cortesUnicos) */}
          {cortesUnicos.length === 0 ? (
            <p className="text-center text-slate-400 font-bold py-8 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">No hay cortes de limpieza/nómina guardados en este periodo.</p>
          ) : (
            <div className="space-y-8">
              {cortesUnicos.map(corte => {
                const datos = typeof corte.datos_corte === 'string' ? JSON.parse(corte.datos_corte) : corte.datos_corte;
                const datosFiltrados = filtroUsuario !== 'Todos' ? datos.filter(d => String(d.id) === String(filtroUsuario)) : datos;

                if (datosFiltrados.length === 0) return null;

                return (
                  <div key={corte.id} className="border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                    <div className="bg-slate-50 p-5 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 gap-2">
                      <p className="font-black text-slate-700 uppercase tracking-widest text-xs flex items-center gap-2">
                        Corte Semana del: <span className="text-blue-600 text-sm bg-blue-100 px-2 py-0.5 rounded-md">{new Date(corte.fecha_corte).toLocaleDateString()}</span>
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                        Emitido: {new Date(corte.fecha_creacion).toLocaleString()}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="p-4 border-r border-slate-100 w-64">Empleado</th>
                            <th className="p-4 border-r border-slate-100 text-center">Días Trabajados</th>
                            <th className="p-4 border-r border-slate-100 text-center">Limpiezas ✅</th>
                            <th className="p-4 border-r border-slate-100 text-center">Fallas ❌</th>
                            <th className="p-4 text-center">Desempeño</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {datosFiltrados.map(emp => {
                            const totalL = (emp.limpieza?.cumplidas || 0) + (emp.limpieza?.incumplidas || 0);
                            const porcentaje = totalL === 0 ? 0 : Math.round(((emp.limpieza?.cumplidas || 0) / totalL) * 100);
                            
                            let badgeClase = 'bg-slate-100 text-slate-500 border-slate-200';
                            if (totalL > 0) {
                              if (porcentaje >= 90) badgeClase = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              else if (porcentaje >= 50) badgeClase = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                              else badgeClase = 'bg-red-50 text-red-700 border-red-200';
                            }

                            return (
                              <tr key={emp.id} className="hover:bg-slate-50 transition">
                                <td className="p-4 border-r border-slate-50">
                                  <p className="font-bold text-slate-700">{emp.nombre}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{emp.rol}</p>
                                </td>
                                <td className="p-4 border-r border-slate-50 text-center font-black text-blue-600 text-xl">
                                  {emp.dias_trabajados} <span className="text-xs text-blue-300 font-bold">{emp.dias_trabajados === 1 ? 'día' : 'días'}</span>
                                </td>
                                <td className="p-4 border-r border-slate-50 text-center font-black text-emerald-500 text-xl">
                                  {emp.limpieza?.cumplidas || 0}
                                </td>
                                <td className="p-4 border-r border-slate-50 text-center font-black text-red-400 text-xl">
                                  {emp.limpieza?.incumplidas || 0}
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`px-4 py-2 rounded-xl text-sm font-black border shadow-sm ${badgeClase}`}>
                                    {totalL === 0 ? 'Sin evaluar' : `${porcentaje}%`}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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