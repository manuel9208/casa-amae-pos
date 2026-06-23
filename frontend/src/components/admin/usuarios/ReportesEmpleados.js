import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Printer, FileText, Sparkles, AlertCircle } from 'lucide-react';  

const ReportesEmpleados = ({ usuariosDB, apiUrl }) => {
  const [reportes, setReportes] = useState({ asistenciasHoy: [], historialAsistencias: [], rendimientoCocina: [], cortesNomina: [] });
  const [matrizLimpiezaGlobal, setMatrizLimpiezaGlobal] = useState({ evaluaciones: {}, asignaciones: {} });
  const [periodo, setPeriodo] = useState('dia');
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [filtroUsuario, setFiltroUsuario] = useState('Todos');  
  const [minutosTolerancia, setMinutosTolerancia] = useState(15);  

  const cargarReportes = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/usuarios/rendimiento?periodo=${periodo}&fecha=${fechaFiltro}&usuario_id=${filtroUsuario}`);
      if (res.ok) {
        const data = await res.json();
        setReportes(data);
      }

      // 🛡️ RECOLECTOR GLOBAL: Necesario para reconstruir los detalles de limpieza en cortes antiguos
      const resConfig = await fetch(`${apiUrl}/configuracion`);
      if (resConfig.ok) {
         const configData = await resConfig.json();
         setMatrizLimpiezaGlobal(typeof configData.matriz_limpieza === 'string' ? JSON.parse(configData.matriz_limpieza || '{}') : (configData.matriz_limpieza || {}));
      }
    } catch (error) {
      console.error("Error al cargar reportes", error);
    }
  }, [apiUrl, periodo, fechaFiltro, filtroUsuario]);  

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);  

  const empleadosVisibles = usuariosDB
    .filter(u => u.nombre !== 'Administrador Global')
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

  const historialAgrupado = Object.values((reportes.historialAsistencias || []).reduce((acc, curr) => {
    if (curr.nombre === 'Administrador Global') return acc;  
    
    const fechaLimpia = String(curr.fecha).split('T')[0];
    const key = `${curr.nombre}-${fechaLimpia}`;  
    
    if (!acc[key]) {
      acc[key] = { ...curr, fecha: fechaLimpia };
    } else {
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
    const inTime = new Date(h.hora_entrada).getTime();
    const outTime = h.hora_salida ? new Date(h.hora_salida).getTime() : new Date().getTime();
    h.horas_trabajadas = ((outTime - inTime) / 3600000).toFixed(2);
    return h;
  }).sort((a, b) => {
    const dateA = new Date(a.fecha).getTime();
    const dateB = new Date(b.fecha).getTime();
    if (dateA !== dateB) return dateB - dateA;
    return a.nombre.localeCompare(b.nombre);
  });  

  const horror12To24 = (time12) => {
     if(!time12) return "00:00";
     return time12;
  };

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
      const dObj = new Date(asistencia.fecha + 'T12:00:00');
      const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const nombreDia = diasNombres[dObj.getDay()];  
      const turnoDia = horario[asistencia.fecha] || horario[nombreDia];  
      
      let esRetardo = false;
      let oficial = '--:--';
      let oficialSalida = '--:--';
      
      const stringHoraCompleta = new Date(asistencia.hora_entrada).toLocaleTimeString('es-MX', { timeZone: 'America/Mazatlan', hour12: false });
      const [hReal, mReal] = stringHoraCompleta.split(':').map(Number);
      const minutosReales = hReal * 60 + mReal;

      if (turnoDia && turnoDia.activo && turnoDia.entrada) {
        oficial = turnoDia.entrada;
        oficialSalida = turnoDia.salida || '--:--';  
        const [hOf, mOf] = horror12To24(turnoDia.entrada).split(':').map(Number);
        const minutosOficiales = hOf * 60 + mOf;  
        
        if (minutosReales > (minutosOficiales + minutosTolerancia)) {
          esRetardo = true;
          calculos[uid].retardos += 1;
        }
      }  
      
      calculos[uid].detalleDias.push({
        fecha: dObj.toLocaleDateString('es-MX', {weekday: 'short', day: 'numeric', month: 'short'}),
        oficialEntrada: oficial,
        oficialSalida: oficialSalida,
        real: new Date(asistencia.hora_entrada).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
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

      <div id="seccion-a-imprimir" className="grid grid-cols-1 gap-6">
        
        {/* TABLA PRE-NOMINA */}
        <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-200">
           <h3 className="text-2xl font-black text-slate-800 mb-6">Proyección Pre-Nómina</h3>
           <div className="overflow-x-auto custom-scrollbar border border-slate-200 rounded-3xl">
             <table className="w-full text-left">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest border-r border-slate-100">Empleado</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center border-r border-slate-100">Asistencias</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center border-r border-slate-100">Detalle de Checadas</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Sueldo Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preNominaData.map((d, i) => {
                     let montoCalculado = d.sueldoBase; 
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
                         </td>
                      </tr>
                     )
                  })}
                </tbody>
             </table>
           </div>
        </div>

        {/* TABLA BITACORA ACCESOS */}
        <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-200 lg:col-span-2 w-full max-w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><FileText size={28}/></div>
            <div>
              <h3 className="text-2xl font-black text-slate-800">Bitácora de Accesos</h3>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Historial del Periodo: {tituloPeriodo}</p>
            </div>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-3xl custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Empleado</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Fecha</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Entrada</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Salida</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historialAgrupado.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="p-4"><p className="font-bold text-slate-700">{h.nombre}</p></td>
                    <td className="p-4 text-slate-600 font-medium">{h.fecha}</td>
                    <td className="p-4 font-black text-emerald-600">{new Date(h.hora_entrada).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                    <td className="p-4 font-black text-blue-600">{h.hora_salida ? new Date(h.hora_salida).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Turno Activo'}</td>
                    <td className="p-4 text-right font-black text-slate-700">{h.horas_trabajadas}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🛡️ REPORTE HISTÓRICO MATRICIAL DETALLADO */}
        <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-200 lg:col-span-2 w-full max-w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-teal-100 p-3 rounded-2xl text-teal-600"><Sparkles size={28}/></div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Cumplimiento de Limpieza y Turnos</h3>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Cortes Históricos Detallados</p>
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
                const datosRaw = typeof corte.datos_corte === 'string' ? JSON.parse(corte.datos_corte) : corte.datos_corte;
                const metadata = datosRaw.metadata || corte.metadata;
                const listaEmpleados = Array.isArray(datosRaw) ? datosRaw : (datosRaw.recibos || []);

                const datosFiltrados = (filtroUsuario !== 'Todos' ? listaEmpleados.filter(d => String(d.id || d.empleado_id) === String(filtroUsuario)) : listaEmpleados)
                  .filter(emp => emp.nombre !== 'Administrador Global')
                  // 🛡️ CORRECCIÓN ESLINT APLICADA AQUÍ: Se cambió "emp" por "a" y "b" para evitar el error de indefinido.
                  .sort((a, b) => (a.nombre_completo || a.nombre).localeCompare(b.nombre_completo || b.nombre));  

                if (datosFiltrados.length === 0) return null;  

                // 🗓️ CONSTRUCCIÓN DEL CALENDARIO DINÁMICO DEL CORTE
                let fechasDelCorte = new Set();
                if (metadata && metadata.fecha_inicio && metadata.fecha_fin) {
                   let curr = new Date(metadata.fecha_inicio + 'T12:00:00');
                   const end = new Date(metadata.fecha_fin + 'T12:00:00');
                   while(curr <= end) {
                      fechasDelCorte.add(curr.toISOString().split('T')[0]);
                      curr.setDate(curr.getDate() + 1);
                   }
                } else {
                   listaEmpleados.forEach(emp => {
                      if (emp.horario) Object.keys(emp.horario).forEach(k => fechasDelCorte.add(k));
                      if (emp.limpieza && emp.limpieza.detalle) Object.keys(emp.limpieza.detalle).forEach(k => fechasDelCorte.add(k));
                      if (emp.metricas && emp.metricas.diasAuditados) emp.metricas.diasAuditados.forEach(k => fechasDelCorte.add(k));
                   });
                }
                
                const diasCorte = Array.from(fechasDelCorte).sort();
                if (diasCorte.length === 0) return null;
                const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

                return (
                  <div key={corte.id} className="border border-slate-200 rounded-[24px] overflow-hidden shadow-sm bg-white">
                    <div className="bg-slate-50 p-5 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 gap-2">
                      <p className="font-black text-slate-700 uppercase tracking-widest text-xs flex items-center gap-2">
                        Auditoría del: <span className="text-blue-600 text-sm bg-blue-100 px-2 py-0.5 rounded-md">{diasCorte[0]} al {diasCorte[diasCorte.length-1]}</span>
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                        Fecha de Emisión: {new Date(corte.fecha_creacion).toLocaleString()}
                      </p>
                    </div>
                    <div className="w-full max-w-full overflow-x-auto custom-scrollbar pb-2">
                      <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="p-4 border-r border-slate-100 w-48 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-20">Empleado</th>
                            {diasCorte.map(dStr => {
                               const dObj = new Date(dStr + 'T12:00:00');
                               return (
                                  <th key={dStr} className="p-3 text-center border-r border-slate-100 min-w-[140px]">
                                     <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 shadow-sm text-slate-600">
                                       {dObj.getDate()} <span className="block text-[9px] mt-0.5">{diasNombres[dObj.getDay()]}</span>
                                     </div>
                                  </th>
                               );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {datosFiltrados.map(emp => {
                              const empDB = usuariosDB.find(u => u.id === emp.id || u.id === emp.empleado_id) || {};
                              let horarioReferencia = {};
                              if (emp.horario) horarioReferencia = emp.horario;
                              else if (empDB.horario_semanal) {
                                 try { horarioReferencia = typeof empDB.horario_semanal === 'string' ? JSON.parse(empDB.horario_semanal) : empDB.horario_semanal; } catch(e){}
                              }

                              return (
                                <tr key={emp.id || emp.empleado_id} className="hover:bg-slate-50 transition group">
                                   <td className="p-4 border-r border-slate-50 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">
                                     <p className="font-bold text-slate-700 whitespace-nowrap">{emp.nombre_completo || emp.nombre}</p>
                                     <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{emp.rol}</p>
                                   </td>
                                   {diasCorte.map(dStr => {
                                       const diaHorario = horarioReferencia[dStr];
                                       let limpiezasGuardadas = emp.limpieza && emp.limpieza.detalle ? emp.limpieza.detalle[dStr] : null;
                                       
                                       if (!limpiezasGuardadas && matrizLimpiezaGlobal.evaluaciones) {
                                           limpiezasGuardadas = [];
                                           Object.keys(matrizLimpiezaGlobal.evaluaciones).forEach(area => {
                                               if (String(matrizLimpiezaGlobal.asignaciones?.[area]?.[dStr]) === String(emp.id || emp.empleado_id)) {
                                                   limpiezasGuardadas.push({ area, status: matrizLimpiezaGlobal.evaluaciones[area][dStr] });
                                               }
                                           });
                                           if (limpiezasGuardadas.length === 0) limpiezasGuardadas = null;
                                       }

                                       return (
                                         <td key={dStr} className="p-3 border-r border-slate-50 text-center align-top">
                                             {!diaHorario || !diaHorario.activo ? (
                                                <div className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest p-1.5 rounded border border-slate-100 mb-1">
                                                  Descanso
                                                </div>
                                             ) : (
                                                <div className={`text-[10px] font-black uppercase tracking-widest p-1.5 rounded border mb-1 ${diaHorario.pagado || (emp.metricas && emp.metricas.diasAuditados?.includes(dStr)) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                  {diaHorario.entrada || '--:--'} a {diaHorario.salida || '--:--'}
                                                </div>
                                             )}

                                             {limpiezasGuardadas && limpiezasGuardadas.length > 0 && (
                                                <div className="flex flex-col gap-1 mt-2 border-t border-dashed border-slate-200 pt-1.5">
                                                   {limpiezasGuardadas.map((limp, idx) => (
                                                     <div key={idx} className={`flex items-center justify-between px-1.5 py-1 rounded text-[8px] font-black uppercase tracking-wider ${limp.status === 'cumplio' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                       <span className="truncate max-w-[80px] text-left" title={limp.area}>{limp.area}</span>
                                                       {limp.status === 'cumplio' ? '✅' : '❌'}
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