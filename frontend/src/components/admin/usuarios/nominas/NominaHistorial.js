import React, { useState, useEffect, useCallback } from 'react';
import { History, Printer, Trash2, Calendar, Users, Filter } from 'lucide-react';
import ReciboNomina from './ReciboNomina'; 

const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);

const NominaHistorial = ({ usuariosDB = [], apiUrl, showAlert, showConfirm }) => {
  const [historicoNominas, setHistoricoNominas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [reciboPrint, setReciboPrint] = useState(null);
  
  const [configGlobal, setConfigGlobal] = useState({});

  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');

  const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global').sort((a, b) => a.nombre.localeCompare(b.nombre));

  const periodosUnicos = [...new Set(historicoNominas.map(nomina => {
    const datos = typeof nomina.datos_corte === 'string' ? JSON.parse(nomina.datos_corte) : nomina.datos_corte;
    if (!datos?.metadata?.fecha_inicio || !datos?.metadata?.fecha_fin) return null;
    return `${datos.metadata.fecha_inicio} al ${datos.metadata.fecha_fin}`;
  }).filter(Boolean))];

  useEffect(() => {
    fetch(`${apiUrl}/configuracion`)
      .then(res => res.json())
      .then(data => {
        if (data) setConfigGlobal(data);
      })
      .catch(() => {});
  }, [apiUrl]);

  const cargarHistorico = useCallback(async () => {
    setCargando(true);
    try {
      const hoyStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`${apiUrl}/usuarios/rendimiento?periodo=anio&fecha=${hoyStr.substring(0,4)}-01-01`);
      if (res.ok) {
        const data = await res.json();
        const nominas = (data.cortesNomina || []).filter(c => {
          const d = typeof c.datos_corte === 'string' ? JSON.parse(c.datos_corte) : c.datos_corte;
          return d.metadata && d.metadata.es_nomina === true;
        });
        setHistoricoNominas(nominas.reverse());
      }
    } catch (e) { 
      console.error(e); 
    }
    setCargando(false);
  }, [apiUrl]);

  useEffect(() => {
    cargarHistorico();
  }, [cargarHistorico]);

  useEffect(() => {
    if (reciboPrint) {
      const timer = setTimeout(() => {
        window.print();
        setReciboPrint(null); 
      }, 500); // 👈 Le damos un poco más de tiempo al celular para renderizar el DOM
      return () => clearTimeout(timer);
    }
  }, [reciboPrint]);

  const eliminarNomina = (id) => {
    showConfirm("Eliminar Nómina", "Al eliminarla, el dinero desaparecerá de los registros y reportes financieros. ¿Continuar?", async () => {
      try {
        const res = await fetch(`${apiUrl}/usuarios/corte-nomina/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert("Éxito", "Nómina eliminada correctamente.", "success");
          cargarHistorico();
        } else {
          showAlert("Error", "No se pudo eliminar la nómina.", "error");
        }
      } catch(e) { showAlert("Error", "Fallo de conexión.", "error"); }
    });
  };

  const nominasFiltradas = historicoNominas.filter(nomina => {
    const datos = typeof nomina.datos_corte === 'string' ? JSON.parse(nomina.datos_corte) : nomina.datos_corte;
    const recibos = datos.recibos || [];
    const periodoStr = `${datos.metadata?.fecha_inicio} al ${datos.metadata?.fecha_fin}`;
    
    if (filtroPeriodo && periodoStr !== filtroPeriodo) return false;

    if (filtroEmpleado) {
      const tieneAlEmpleado = recibos.some(r => String(r.empleado_id) === String(filtroEmpleado));
      if (!tieneAlEmpleado) return false;
    }

    return true;
  });

  return (
    <div className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-slate-200 main-container-nomina animate-in fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6 border-b border-slate-100 pb-4 print-hidden">
        <History className="text-blue-500 hidden md:block" size={32}/>
        <div>
          <h3 className="text-xl md:text-2xl font-black text-slate-800">Historial de Nóminas</h3>
          <p className="text-xs md:text-sm font-bold text-slate-400">Consulta o reimprime recibos de pagos anteriores.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm print-hidden">
        <div className="flex-1">
          <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Users size={14}/> Empleado</label>
          <select 
            value={filtroEmpleado} 
            onChange={(e) => setFiltroEmpleado(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 font-bold rounded-xl p-3 md:p-4 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm text-sm md:text-base"
          >
            <option value="">-- Todos los Empleados --</option>
            {empleadosVisibles.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre} ({emp.rol})</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Calendar size={14}/> Periodo de Nómina</label>
          <select 
            value={filtroPeriodo} 
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 font-bold rounded-xl p-3 md:p-4 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm text-sm md:text-base"
          >
            <option value="">-- Todos los Periodos --</option>
            {periodosUnicos.map((periodo, idx) => (
              <option key={idx} value={periodo}>{periodo}</option>
            ))}
          </select>
        </div>

        {(filtroEmpleado || filtroPeriodo) && (
          <div className="flex items-end mt-2 md:mt-0">
            <button 
              onClick={() => { setFiltroEmpleado(''); setFiltroPeriodo(''); }}
              className="w-full md:w-auto bg-red-50 hover:bg-red-100 text-red-500 font-black px-6 py-3 md:py-4 rounded-xl transition-all md:h-[58px] flex items-center justify-center text-sm md:text-base"
              title="Limpiar Filtros"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {cargando ? (
        <div className="py-20 text-center flex flex-col items-center justify-center opacity-50 print-hidden">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto mb-3"></div>
           <p className="font-black text-lg md:text-xl text-slate-500">Buscando registros...</p>
        </div>
      ) : historicoNominas.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center print-hidden border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50">
           <History size={64} className="text-slate-300 mb-4" />
           <p className="font-black text-xl md:text-2xl text-slate-800 mb-2">No hay historial</p>
           <p className="text-sm md:text-base text-slate-500 font-medium">Aún no se han generado nóminas en este año.</p>
        </div>
      ) : nominasFiltradas.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center print-hidden border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50">
           <Filter size={64} className="text-slate-300 mb-4" />
           <p className="font-black text-xl md:text-2xl text-slate-800 mb-2">Sin resultados</p>
           <p className="text-sm md:text-base text-slate-500 font-medium">No hay recibos con esta combinación de filtros.</p>
        </div>
      ) : (
        <div className="space-y-6 print-hidden">
          {nominasFiltradas.map(nomina => {
            const datos = typeof nomina.datos_corte === 'string' ? JSON.parse(nomina.datos_corte) : nomina.datos_corte;
            const recibos = datos.recibos || [];
            const metadata = datos.metadata || {};
            
            const recibosAMostrar = filtroEmpleado 
                ? recibos.filter(r => String(r.empleado_id) === String(filtroEmpleado))
                : recibos;

            return (
              <div key={nomina.id} className="bg-slate-50 p-4 md:p-6 rounded-3xl border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-slate-200 pb-4 gap-4">
                  <div>
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> {new Date(nomina.fecha_creacion).toLocaleString()}</p>
                    <p className="text-base md:text-lg font-black text-slate-800 mt-1">Periodo: {metadata.fecha_inicio} al {metadata.fecha_fin}</p>
                  </div>
                  <button onClick={() => eliminarNomina(nomina.id)} className="w-full md:w-auto bg-red-50 hover:bg-red-100 text-red-500 p-3 rounded-xl transition shadow-sm flex items-center justify-center gap-2" title="Eliminar Nómina Completa">
                    <Trash2 size={18} /> <span className="md:hidden font-bold text-sm">Eliminar Nómina</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {recibosAMostrar.map((r, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                      <div className="mb-4">
                        <p className="font-black text-slate-800 text-lg md:text-xl leading-tight mb-1">{r.nombre_completo || r.nombre}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{r.rol}</p>
                        <p className="text-3xl font-black text-emerald-600">{formaterMoneda(r.neto)}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setReciboPrint({
                            ...r,
                            metadata: metadata,
                            ingresos_base: r.ingresos_base || [],
                            adicionales_ingresos: r.nuevos_ingresos || r.adicionales_ingresos || [],
                            egresos_base: r.egresos_base || [],
                            adicionales_egresos: r.nuevos_egresos || r.adicionales_egresos || [],
                            total_ingresos: r.total_ingresos || r.ingresos || 0,
                            total_egresos: r.total_egresos || r.egresos || 0,
                            neto: r.neto || 0
                          });
                        }} 
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 md:py-4 rounded-xl flex justify-center items-center gap-2 transition text-sm shadow-sm active:scale-95"
                      >
                        <Printer size={16}/> Imprimir / PDF
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ÁREA DE IMPRESIÓN EXCLUSIVA */}
      {reciboPrint && (
        <div className="print-receipt-wrapper">
          <ReciboNomina recibo={reciboPrint} configGlobal={configGlobal} />
        </div>
      )}

      {/* 👇 🛡️ BLINDAJE DE IMPRESIÓN MÓVIL ESTRICTO */}
      <style>{`
        @media screen {
          .print-receipt-wrapper { display: none !important; }
        }

        @media print {
          /* APAGAR TODO LO QUE NO SEA EL TICKET */
          .print-hidden, header, nav, aside, footer, button, .tabs-container {
            display: none !important;
          }

          /* ROMPER CONFINAMIENTO DE PANTALLAS (El causante de las páginas en blanco en celular) */
          html, body, #root, main, .main-container-nomina, .h-screen, .min-h-screen, .overflow-hidden, .overflow-y-auto {
            height: auto !important;
            min-height: 100% !important;
            width: 100% !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* MOSTRAR SOLO EL WRAPPER */
          body > *:not(#root) { display: none !important; }
          #root > *:not(.print-receipt-wrapper-container) { /* Fallback */ }

          .print-receipt-wrapper {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 5mm !important;
            background-color: #ffffff !important;
            z-index: 9999999 !important;
          }

          .print-receipt-wrapper * {
            visibility: visible !important;
            color: #000000 !important;
            opacity: 1 !important;
          }

          /* FORZAR LA TABLA A RENDERIZARSE EN CELULAR */
          .print-receipt-wrapper table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          .print-receipt-wrapper tr {
            display: table-row !important;
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          .print-receipt-wrapper th,
          .print-receipt-wrapper td {
            display: table-cell !important;
          }

          @page {
            size: auto;
            margin: 5mm;
          }
        }
      `}</style>
    </div>
  );
};

export default NominaHistorial;