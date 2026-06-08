import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Printer, FileText, Sparkles, DollarSign, AlertCircle } from 'lucide-react';

const ReportesEmpleados = ({ usuariosDB, apiUrl }) => {
  const [reportes, setReportes] = useState({ asistenciasHoy: [], historialAsistencias: [], rendimientoCocina: [], cortesNomina: [] });
  const [periodo, setPeriodo] = useState('dia');
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [filtroUsuario, setFiltroUsuario] = useState('Todos');
  
  // 👇 NUEVO ESTADO: Minutos de tolerancia configurables por el administrador
  const [minutosTolerancia, setMinutosTolerancia] = useState(15);

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

  const empleadosVisibles = usuariosDB
    .filter(u => u.rol !== 'admin' && u.nombre !== 'Administrador Global')
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const getTituloFormateado = () => {
    if (!fechaFiltro) return periodo;
    const f = new Date(fechaFiltro + 'T12:00:00');
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

  const cortesUnicos = [];
  const fechasCortesVistas = new Set();
  (reportes.cortesNomina || []).forEach(corte => {
    const fechaDia = String(corte.fecha_corte).split('T')[0];
    if (!fechasCortesVistas.has(fechaDia)) {
      fechasCortesVistas.add(fechaDia);
      cortesUnicos.push(corte);
    }
  });

  // 👇 MOTOR INTELIGENTE: Agrupa múltiples checadas tomando la primera entrada y última salida
  const historialAgrupado = Object.values((reportes.historialAsistencias || []).reduce((acc, curr) => {
    // 1. Ignorar explícitamente al admin
    if (curr.rol === 'admin' || curr.nombre === 'Administrador Global') return acc;

    const fechaLimpia = String(curr.fecha).split('T')[0];
    const key = `${curr.nombre}-${fechaLimpia}`;

    if (!acc[key]) {
      acc[key] = { ...curr, fecha: fechaLimpia };
    } else {
      // 2. Si ya existe, evaluar Entrada (más temprana) y Salida (más tardía)
      const currentIn = new Date(acc[key].hora_entrada);
      const newIn = new Date(curr.hora_entrada);
      if (newIn < currentIn) acc[key].hora_entrada = curr.hora_entrada;

      if (curr.hora_salida) {
        if (!acc[key].hora_salida) {
          acc[key].hora_salida = curr.hora_salida;
        } else {
          const currentOut = new Date(acc[key].hora_salida);
          const newOut = new Date(curr.hora_salida);
          if (newOut > currentOut) acc[key].hora_salida = curr.hora_salida;
        }
      }
    }
    return acc;
  }, {})).map(h => {
    // 3. Recalcular las horas exactas trabajadas
    const inTime = new Date(h.hora_entrada).getTime();
    const outTime = h.hora_salida ? new Date(h.hora_salida).getTime() : new Date().getTime();
    h.horas_trabajadas = ((outTime - inTime) / 3600000).toFixed(2);
    return h;
  }).sort((a, b) => {
    // Orden cronológico y luego alfabético
    const dateA = new Date(a.fecha).getTime();
    const dateB = new Date(b.fecha).getTime();
    if (dateA !== dateB) return dateB - dateA;
    return a.nombre.localeCompare(b.nombre);
  });

  const calcularPreNomina = () => {
    let calculos = {};
    
    historialAgrupado.forEach(asistencia => {
      const emp = usuariosDB.find(u => u.nombre === asistencia.nombre);
      if (!emp) return;
      const uid = emp.id;

      if (!calculos[uid]) {
        let pres = { sueldo: 0, tipo_sueldo: 'Mensual' };
        if (emp.prestaciones) {
          pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : emp.prestaciones;
        }
        calculos[uid] = {
          nombre: asistencia.nombre, rol: asistencia.rol,
          diasAsistidos: 0, retardos: 0, horasTotales: 0, sueldoBase: Number(pres.sueldo) || 0, tipoSueldo: pres.tipo_sueldo,
          detalleDias: []
        };
      }

      calculos[uid].diasAsistidos += 1;
      calculos[uid].horasTotales += Number(asistencia.horas_trabajadas) || 0;

      const horario = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
      
      // Obtener el día de la semana para los horarios viejos o usar fecha exacta
      const dObj = new Date(asistencia.fecha + 'T12:00:00');
      const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const nombreDia = diasNombres[dObj.getDay()];
      
      const turnoDia = horario[asistencia.fecha] || horario[nombreDia];

      let esRetardo = false;
      let oficial = '--:--';
      let oficialSalida = '--:--';
      let realTime = new Date(asistencia.hora_entrada).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

      if (turnoDia && turnoDia.activo && turnoDia.entrada) {
        oficial = turnoDia.entrada;
        oficialSalida = turnoDia.salida || '--:--';
        
        const [hOf, mOf] = turnoDia.entrada.split(':').map(Number);
        const minutosOficiales = hOf * 60 + mOf;
        
        const realDate = new Date(asistencia.hora_entrada);
        const minutosReales = realDate.getHours() * 60 + realDate.getMinutes();
        
        // Evaluar tolerancia
        if (minutosReales > (minutosOficiales + minutosTolerancia)) {
          esRetardo = true;
          calculos[uid].retardos += 1;
        }
      }

      calculos[uid].detalleDias.push({
        fecha: dObj.toLocaleDateString('es-MX', {weekday: 'short', day: 'numeric', month: 'short'}),
        oficialEntrada: oficial,
        oficialSalida: oficialSalida,
        real: realTime,
        esRetardo: esRetardo,
        tieneTurno: !!(turnoDia && turnoDia.activo)
      });
    });

    return Object.values(calculos).sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  const preNominaData = calcularPreNomina();

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      {/* CABECERA FILTROS */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-[36px] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-5">
          <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/30 text-emerald-400"><Calendar size={32}/></div>
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Centro de Reportes</p>
            <h3 className="text-2xl font-black tracking-tight">Métricas y Pre-Nómina</h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* 👇 NUEVO CAMPO DE TOLERANCIA */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 p-2 rounded-2xl h-[58px] shadow-inner">
             <span className="text-[10px] font-black text-slate-400 uppercase ml-3">Tolerancia:</span>
             <input type="number" min="0" value={minutosTolerancia} onChange={e => setMinutosTolerancia(Number(e.target.value))} className="w-14 bg-slate-900 border border-slate-600 text-center text-emerald-400 font-black rounded-xl py-1.5 outline-none focus:border-emerald-500 transition-colors" />
             <span className="text-[10px] font-black text-slate-400 uppercase mr-3">Min</span>
          </div>

          <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} className="w-full md:w-auto h-[58px] bg-slate-800 text-white border border-slate-700 px-4 rounded-2xl font-bold outline-none focus:ring-2 ring-emerald-500 cursor-pointer">
            <option value="Todos">Todos los empleados</option>
            {empleadosVisibles.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}
          </select>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full md:w-auto h-[58px] bg-slate-800 text-white border border-slate-700 px-4 rounded-2xl font-bold outline-none focus:ring-2 ring-emerald-500 cursor-pointer">
            <option value="dia">Día Exacto</option>
            <option value="semana">Semana de...</option>
            <option value="mes">Mes de...</option>
            <option value="anio">Año de...</option>
          </select>
          <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} className="w-full md:w-auto h-[58px] bg-slate-800 text-white border border-slate-700 px-4 rounded-2xl font-bold outline-none focus:ring-2 ring-emerald-500 cursor-pointer" style={{ colorScheme: 'dark' }} />
          <button onClick={() => window.print()} className="w-full md:w-auto h-[58px] bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 rounded-2xl font-black flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/20">
            <Printer size={20}/> Imprimir
          </button>
        </div>
      </div>

      <div id="seccion-a-imprimir" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* WIDGET: PRE NÓMINA (CON EL NUEVO DESGLOSE DE RETARDOS) */}
        <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-200 w-full max-w-full lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600"><DollarSign size={28}/></div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Pre-Nómina y Penalizaciones</h3>
                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">{tituloPeriodo}</p>
              </div>
            </div>
          </div>
          
          <div className="w-full max-w-full overflow-x-auto rounded-3xl border border-slate-100">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  <th className="p-5 border-r border-slate-200 w-64">Empleado</th>
                  <th className="p-5 border-r border-slate-200 text-center w-32">Asistencias</th>
                  <th className="p-5 border-r border-slate-200">Registro de Entradas</th>
                  <th className="p-5 text-right w-48">Monto Base a Pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {preNominaData.length === 0 ? <tr><td colSpan="4" className="p-10 text-center text-slate-400 font-bold">Sin datos para procesar en este periodo.</td></tr> : preNominaData.map((d, i) => {
                  let advertencia = '';
                  let montoCalculado = d.sueldoBase;
                  if (d.tipoSueldo !== 'Semanal' && periodo === 'semana') advertencia = 'Sueldo configurado como ' + d.tipoSueldo;
                  if (d.tipoSueldo !== 'Mensual' && periodo === 'mes') advertencia = 'Sueldo configurado como ' + d.tipoSueldo;

                  return (
                    <tr key={i} className="hover:bg-slate-50 transition group">
                      <td className="p-5 border-r border-slate-100 align-top">
                        <p className="font-black text-lg text-slate-700">{d.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{d.rol}</p>
                        {d.retardos > 0 && (
                           <span className="inline-flex mt-3 items-center gap-1 bg-red-100 text-red-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase">
                             <AlertCircle size={12}/> {d.retardos} Retardos
                           </span>
                        )}
                      </td>
                      <td className="p-5 border-r border-slate-100 text-center align-top">
                        <span className="text-3xl font-black text-blue-600">{d.diasAsistidos}</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Días</p>
                        <p className="text-xs font-black text-blue-400 bg-blue-50 px-2 py-1 rounded-lg mt-3 inline-block">{d.horasTotales.toFixed(1)} Hrs</p>
                      </td>
                      
                      {/* 👇 NUEVO DISEÑO DE PENALIZACIONES Y HORARIOS */}
                      <td className="p-5 border-r border-slate-100 align-top">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {d.detalleDias.map((r, idx) => (
                            <div key={idx} className={`p-3 rounded-xl border flex flex-col justify-between shadow-sm transition ${r.esRetardo ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{r.fecha}</span>
                                {r.tieneTurno ? (
                                  <span className="text-[9px] font-bold text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded">{r.oficialEntrada} - {r.oficialSalida}</span>
                                ) : (
                                  <span className="text-[9px] font-bold text-amber-500 border border-amber-200 bg-amber-50 px-1.5 py-0.5 rounded">Turno Libre</span>
                                )}
                              </div>
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Marcó Entrada</p>
                                  <p className={`text-base font-black leading-none ${r.esRetardo ? 'text-red-600' : 'text-emerald-600'}`}>{r.real}</p>
                                </div>
                                {r.tieneTurno && (
                                  <div className="text-right">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${r.esRetardo ? 'bg-red-200 text-red-700' : 'bg-emerald-200 text-emerald-800'}`}>
                                      {r.esRetardo ? 'Retardo' : 'A Tiempo'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="p-5 text-right bg-slate-50/50 group-hover:bg-emerald-50 transition-colors align-top">
                        <p className="text-3xl font-black text-emerald-600">${montoCalculado.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                        <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest mt-1">{d.tipoSueldo}</p>
                        {advertencia && <p className="text-[9px] text-orange-500 font-bold mt-3 leading-tight border border-orange-200 bg-orange-50 p-2 rounded-lg">{advertencia}</p>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* WIDGET: BITÁCORA DE ACCESOS (YA NO TENDRÁ DUPLICADOS) */}
        <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-200 lg:col-span-2 w-full max-w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><FileText size={28}/></div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Bitácora Detallada de Asistencia</h3>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">{tituloPeriodo}</p>
            </div>
          </div>
          <div className="w-full max-w-full overflow-x-auto rounded-3xl border border-slate-100">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                  <th className="p-5 border-r border-slate-200">Empleado</th>
                  <th className="p-5 border-r border-slate-200">Fecha</th>
                  <th className="p-5 border-r border-slate-200">Entrada</th>
                  <th className="p-5 border-r border-slate-200">Salida</th>
                  <th className="p-5 text-center">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historialAgrupado.length === 0 ? <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-bold">No hay movimientos registrados en este periodo.</td></tr> : historialAgrupado.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="p-5 border-r border-slate-100"><p className="font-bold text-slate-700 text-lg">{h.nombre}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{h.rol}</p></td>
                    <td className="p-5 border-r border-slate-100 font-bold text-slate-600 text-sm">{new Date(h.fecha + 'T12:00:00').toLocaleDateString('es-MX', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'}).toUpperCase()}</td>
                    <td className="p-5 border-r border-slate-100 font-black text-emerald-600 text-lg">{new Date(h.hora_entrada).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                    <td className="p-5 border-r border-slate-100 font-black text-rose-500 text-lg">{h.hora_salida ? new Date(h.hora_salida).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</td>
                    <td className="p-5 text-center"><span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-black text-sm border border-blue-100">{h.horas_trabajadas} hrs</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* WIDGET: CORTES Y LIMPIEZA */}
        <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-200 lg:col-span-2 w-full max-w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-teal-100 p-3 rounded-2xl text-teal-600"><Sparkles size={28}/></div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Cumplimiento de Limpieza y Turnos</h3>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Cortes Históricos</p>
            </div>
          </div>

          {cortesUnicos.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-[32px] border border-slate-100 border-dashed">
              <Sparkles size={48} className="mx-auto text-slate-300 mb-4 opacity-50"/>
              <p className="text-slate-500 font-bold text-lg">No hay cortes de limpieza/nómina guardados en este periodo.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {cortesUnicos.map(corte => {
                const datos = typeof corte.datos_corte === 'string' ? JSON.parse(corte.datos_corte) : corte.datos_corte;
                const datosFiltrados = (filtroUsuario !== 'Todos' ? datos.filter(d => String(d.id) === String(filtroUsuario)) : datos)
                  .filter(emp => emp.rol !== 'admin' && emp.nombre !== 'Administrador Global')
                  .sort((a, b) => a.nombre.localeCompare(b.nombre));

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
                    <div className="w-full max-w-full overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[1000px]">
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