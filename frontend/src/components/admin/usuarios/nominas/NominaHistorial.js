import React, { useState, useEffect, useCallback } from 'react';
import { History, Search, Printer, Trash2, Calendar, Users, Filter } from 'lucide-react';
import ReciboNomina from './ReciboNomina'; 

const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);

const NominaHistorial = ({ usuariosDB = [], apiUrl, showAlert, showConfirm }) => {
  const [historicoNominas, setHistoricoNominas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [reciboPrint, setReciboPrint] = useState(null);
  
  // ESTADOS PARA LOS MENÚS DESPLEGABLES
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');

  // Empleados disponibles para el menú (Quitamos al admin global)
  const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global').sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Extraer los periodos únicos de nómina generados para armar el menú de fechas
  const periodosUnicos = [...new Set(historicoNominas.map(nomina => {
    const datos = typeof nomina.datos_corte === 'string' ? JSON.parse(nomina.datos_corte) : nomina.datos_corte;
    return `${datos.metadata?.fecha_inicio} al ${datos.metadata?.fecha_fin}`;
  }))];

  // CARGAR HISTORIAL DE NÓMINAS
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
    } catch (e) { console.error(e); }
    setCargando(false);
  }, [apiUrl]);

  useEffect(() => {
    cargarHistorico();
  }, [cargarHistorico]);

  // ELIMINAR UNA NÓMINA PASADA
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

  const lanzarImpresion = (recibo, metadata) => {
    setReciboPrint({ ...recibo, metadata });
    setTimeout(() => { window.print(); setReciboPrint(null); }, 500);
  };

  // LÓGICA DE FILTRADO POR DESPLEGABLES
  const nominasFiltradas = historicoNominas.filter(nomina => {
    const datos = typeof nomina.datos_corte === 'string' ? JSON.parse(nomina.datos_corte) : nomina.datos_corte;
    const recibos = datos.recibos || [];
    const periodoStr = `${datos.metadata?.fecha_inicio} al ${datos.metadata?.fecha_fin}`;
    
    // 1. Filtrar por Periodo (Si seleccionó uno)
    if (filtroPeriodo && periodoStr !== filtroPeriodo) return false;

    // 2. Filtrar por Empleado (Si seleccionó uno)
    if (filtroEmpleado) {
      // Revisa si el empleado seleccionado existe dentro de esta nómina
      const tieneAlEmpleado = recibos.some(r => String(r.empleado_id) === String(filtroEmpleado));
      if (!tieneAlEmpleado) return false;
    }

    return true;
  });

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        <History className="text-blue-500" size={32}/>
        <div>
          <h3 className="text-2xl font-black text-slate-800">Historial de Nóminas</h3>
          <p className="text-sm font-bold text-slate-400">Consulta o reimprime recibos de pagos anteriores.</p>
        </div>
      </div>

      {/* MENÚS DESPLEGABLES DE FILTRO */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in slide-in-from-top-4">
        <div className="flex-1">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Users size={14}/> Empleado</label>
          <select 
            value={filtroEmpleado} 
            onChange={(e) => setFiltroEmpleado(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 font-bold rounded-xl p-4 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            <option value="">-- Todos los Empleados --</option>
            {empleadosVisibles.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre} ({emp.rol})</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Calendar size={14}/> Periodo de Nómina</label>
          <select 
            value={filtroPeriodo} 
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 font-bold rounded-xl p-4 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            <option value="">-- Todos los Periodos --</option>
            {periodosUnicos.map((periodo, idx) => (
              <option key={idx} value={periodo}>{periodo}</option>
            ))}
          </select>
        </div>

        {/* Botón para limpiar filtros */}
        {(filtroEmpleado || filtroPeriodo) && (
          <div className="flex items-end">
            <button 
              onClick={() => { setFiltroEmpleado(''); setFiltroPeriodo(''); }}
              className="bg-red-50 hover:bg-red-100 text-red-500 font-black px-6 py-4 rounded-xl transition-all h-[58px] flex items-center justify-center"
              title="Limpiar Filtros"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {cargando ? (
        <div className="py-20 text-center flex flex-col items-center justify-center opacity-50">
           <Search size={48} className="text-slate-400 mb-4 animate-pulse" />
           <p className="font-black text-xl text-slate-500">Buscando registros...</p>
        </div>
      ) : historicoNominas.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
           <History size={64} className="text-slate-300 mb-4" />
           <p className="font-black text-2xl text-slate-800 mb-2">No hay historial</p>
           <p className="text-slate-500 font-medium">Aún no se han generado nóminas en este año.</p>
        </div>
      ) : nominasFiltradas.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center animate-in zoom-in-95">
           <Filter size={64} className="text-slate-300 mb-4" />
           <p className="font-black text-2xl text-slate-800 mb-2">Sin resultados</p>
           <p className="text-slate-500 font-medium">No hay recibos con esta combinación de filtros.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {nominasFiltradas.map(nomina => {
            const datos = typeof nomina.datos_corte === 'string' ? JSON.parse(nomina.datos_corte) : nomina.datos_corte;
            const recibos = datos.recibos || [];
            const metadata = datos.metadata || {};
            
            // Si hay un empleado seleccionado, Ocultamos los demás recibos de ese periodo
            const recibosAMostrar = filtroEmpleado 
                ? recibos.filter(r => String(r.empleado_id) === String(filtroEmpleado))
                : recibos;

            return (
              <div key={nomina.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 animate-in fade-in">
                <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> {new Date(nomina.fecha_creacion).toLocaleString()}</p>
                    <p className="text-lg font-black text-slate-800">Periodo: {metadata.fecha_inicio} al {metadata.fecha_fin}</p>
                  </div>
                  <button onClick={() => eliminarNomina(nomina.id)} className="bg-red-50 hover:bg-red-100 text-red-500 p-3 rounded-xl transition shadow-sm" title="Eliminar Nómina Completa">
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recibosAMostrar.map((r, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                      <div className="mb-4">
                        {/* 👇 FIX: Mostramos el nombre completo legal si existe, si no el nombre corto */}
                        <p className="font-black text-slate-800 text-lg leading-tight mb-1">{r.nombre_completo || r.nombre}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{r.rol}</p>
                        <p className="text-3xl font-black text-emerald-600">{formaterMoneda(r.neto)}</p>
                      </div>
                      <button onClick={() => lanzarImpresion(r, metadata)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition text-sm shadow-sm active:scale-95">
                        <Printer size={16}/> Imprimir Recibo
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ÁREA OCULTA PARA IMPRESIÓN */}
      <div className="hidden print:block">
         {reciboPrint && <ReciboNomina recibo={reciboPrint} />}
      </div>
    </div>
  );
};

export default NominaHistorial;