import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, TrendingUp, DollarSign, PackageOpen, Search, Printer, AlertCircle, Filter, Star, TrendingDown, Activity, CalendarDays, BarChart2, AlertTriangle } from 'lucide-react';

const ReporteVentas = ({ apiUrl, showAlert }) => {
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(true);
  
  // Estados para Filtros
  const [filtroActivo, setFiltroActivo] = useState('dia');
  const [fechaCustom, setFechaCustom] = useState(new Date().toISOString().split('T')[0]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [filtroClasificacion, setFiltroClasificacion] = useState('Todas');
  const [filtroConsumo, setFiltroConsumo] = useState('Todos');

  // Cargar lista de categorías para el filtro
  useEffect(() => {
    fetch(`${apiUrl}/clasificaciones`)
      .then(res => res.json())
      .then(data => setClasificaciones(Array.isArray(data) ? data : []))
      .catch(e => console.error('Error cargando clasificaciones', e));
  }, [apiUrl]);

  const cargarReporte = useCallback(async (tipo, fecha = '') => {
    setCargando(true);
    try {
      const res = await fetch(`${apiUrl}/reportes/ventas?tipo=${tipo}&fecha=${fecha}&clasificacion=${filtroClasificacion}&tipo_consumo=${filtroConsumo}`);
      if (res.ok) {
        const data = await res.json();
        setReporte(data);
      } else {
        showAlert("Error", "No se pudo cargar el reporte de ventas.", "error");
      }
    } catch (error) {
      showAlert("Error", "Problema de conexión al cargar reportes.", "error");
    } finally {
      setCargando(false);
    }
  }, [apiUrl, showAlert, filtroClasificacion, filtroConsumo]);

  useEffect(() => {
    cargarReporte(filtroActivo, fechaCustom);
  }, [cargarReporte, filtroActivo, fechaCustom]);

  const formaterMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad || 0);
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in pb-12 print:bg-white print:p-0">
      
      {/* ENCABEZADO Y CONTROLES DE RANGO DE TIEMPO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 print:shadow-none print:border-b-2 print:rounded-none print:pb-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={32} /> Reporte Financiero
          </h2>
          <p className="text-slate-500 font-medium mt-1">Análisis de ventas, inversión y ganancia neta.</p>
          <p className="hidden print:block text-slate-800 font-bold mt-2">
            Periodo Analizado: <span className="uppercase text-blue-600">{filtroActivo}</span> | Fecha de consulta: {fechaCustom}
            <br/><span className="text-sm font-normal text-slate-500">Clasificación: {filtroClasificacion} | Consumo: {filtroConsumo}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 print:hidden">
          {['dia', 'semana', 'mes', 'anio'].map(f => (
            <button 
              key={f} 
              disabled={cargando}
              onClick={() => setFiltroActivo(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition capitalize disabled:opacity-50 ${filtroActivo === f ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {f}
            </button>
          ))}
          
          <button 
            disabled={cargando || (reporte && reporte.detalles.length === 0)}
            onClick={handleImprimir}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-700 transition ml-2 disabled:opacity-50"
          >
            <Printer size={16} /> Imprimir PDF
          </button>
        </div>
      </div>

      {/* FILTROS DINÁMICOS */}
      <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex flex-col md:flex-row items-end gap-4 print:hidden">
        
        <div className="flex-1 w-full">
          <label className="flex items-center gap-2 text-xs font-black text-orange-800 uppercase tracking-widest mb-2"><Calendar size={16}/> Fecha Referencia</label>
          <input 
            type="date" disabled={cargando} value={fechaCustom} onChange={(e) => setFechaCustom(e.target.value)}
            className="w-full p-3 rounded-xl border border-orange-200 font-bold text-slate-700 outline-none focus:border-orange-500 disabled:opacity-50"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="flex items-center gap-2 text-xs font-black text-orange-800 uppercase tracking-widest mb-2"><Filter size={16}/> Categoría</label>
          <select disabled={cargando} value={filtroClasificacion} onChange={e => setFiltroClasificacion(e.target.value)} className="w-full p-3 rounded-xl border border-orange-200 font-bold text-slate-700 outline-none focus:border-orange-500 disabled:opacity-50">
            <option value="Todas">Todas las categorías</option>
            <option value="Extras">🌟 Solo Extras</option>
            <option value="Envíos">🛵 Solo Envíos</option>
            {clasificaciones.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>

        <div className="flex-1 w-full">
          <label className="flex items-center gap-2 text-xs font-black text-orange-800 uppercase tracking-widest mb-2"><PackageOpen size={16}/> Tipo de Consumo</label>
          <select disabled={cargando} value={filtroConsumo} onChange={e => setFiltroConsumo(e.target.value)} className="w-full p-3 rounded-xl border border-orange-200 font-bold text-slate-700 outline-none focus:border-orange-500 disabled:opacity-50">
            <option value="Todos">Todos</option>
            <option value="Local">Comer en Local</option>
            <option value="Recoger en Local">Recoger en Local</option>
            <option value="Domicilio">A Domicilio</option>
          </select>
        </div>

        <div className="w-full md:w-auto">
          <button 
            disabled={cargando} onClick={() => setFiltroActivo('historico')}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition disabled:opacity-50 ${filtroActivo === 'historico' ? 'bg-orange-600 text-white shadow-md' : 'bg-orange-200 text-orange-800 hover:bg-orange-300'}`}
          >
            {cargando ? 'Buscando...' : <><Search size={16}/> Buscar Día Exacto</>}
          </button>
        </div>
      </div>

      {/* ESTADO DE CARGA GLOBAL */}
      {cargando ? (
        <div className="flex flex-col justify-center items-center py-20 print:hidden animate-pulse">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Procesando reporte financiero...</p>
        </div>
      ) : reporte ? (
        <div className="space-y-6">
          
          {reporte.detalles.length === 0 ? (
            <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-[40px] p-12 text-center flex flex-col items-center">
              <AlertCircle size={64} className="text-slate-400 mb-4" />
              <h3 className="text-2xl font-black text-slate-700 mb-2">¡No hay información registrada!</h3>
              <p className="text-slate-500 font-medium max-w-md">No encontramos ninguna venta completada para la fecha <strong>{fechaCustom}</strong> con los filtros seleccionados. Intenta cambiar de día o ajustar las categorías.</p>
            </div>
          ) : (
            <>
              {/* 👇 NUEVO: PANEL DE ANÁLISIS DE INTELIGENCIA (INSIGHTS) */}
              {reporte.insights && (
                <div className="bg-slate-900 rounded-[32px] p-8 shadow-xl text-white print:hidden relative overflow-hidden">
                   <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none"><TrendingUp size={200}/></div>
                   <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-emerald-400"><BarChart2 size={24}/> Análisis Inteligente ({filtroActivo})</h3>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                      
                      {/* SIEMPRE MUESTRA LOS PRODUCTOS TOP/WORST */}
                      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 hover:border-slate-500 transition">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rendimiento de Menú</p>
                          {reporte.insights.productoMasVendido ? (
                              <>
                                 <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5"><Star size={16}/> Más Vendido</span>
                                    <span className="font-black text-right pl-2 leading-tight">{reporte.insights.productoMasVendido.producto_nombre} <span className="text-emerald-300 ml-1 text-xs">({reporte.insights.productoMasVendido.cantidad_vendida})</span></span>
                                 </div>
                                 <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-bold text-red-400 flex items-center gap-1.5"><TrendingDown size={16}/> Menos Vendido</span>
                                    <span className="font-black text-right pl-2 leading-tight">{reporte.insights.productoMenosVendido.producto_nombre} <span className="text-red-300 ml-1 text-xs">({reporte.insights.productoMenosVendido.cantidad_vendida})</span></span>
                                 </div>
                              </>
                          ) : <p className="text-sm text-slate-500">No hay platillos registrados.</p>}
                          
                          {reporte.insights.productosCeroVentas?.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-slate-700">
                                 <span className="text-xs font-black text-orange-400 flex items-center gap-1.5 mb-2"><AlertTriangle size={14}/> Sin Ventas ({reporte.insights.productosCeroVentas.length})</span>
                                 <p className="text-xs text-slate-400 leading-snug line-clamp-3" title={reporte.insights.productosCeroVentas.join(', ')}>
                                    {reporte.insights.productosCeroVentas.join(', ')}
                                 </p>
                              </div>
                          )}
                      </div>

                      {/* SI ES SEMANA, MES O AÑO, MUESTRA ESTADÍSTICAS POR DÍA */}
                      {['semana', 'mes', 'anio'].includes(filtroActivo) && reporte.insights.mejorDia && (
                          <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 hover:border-slate-500 transition">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rendimiento Diario</p>
                              <div className="flex justify-between items-center mb-4">
                                 <span className="text-sm font-bold text-blue-400 flex items-center gap-1.5"><Activity size={16}/> Promedio/Día</span>
                                 <span className="font-black text-lg">{formaterMoneda(reporte.insights.promedioDiario)}</span>
                              </div>
                              <div className="flex justify-between items-center mb-4">
                                 <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5"><CalendarDays size={16}/> Mejor Día</span>
                                 <div className="text-right">
                                     <span className="font-black block">{new Date(reporte.insights.mejorDia.fecha + 'T00:00:00').toLocaleDateString('es-MX', {weekday: 'short', day:'numeric'})}</span>
                                     <span className="text-xs text-emerald-300 font-bold">{formaterMoneda(reporte.insights.mejorDia.total_dia)}</span>
                                 </div>
                              </div>
                              <div className="flex justify-between items-center">
                                 <span className="text-sm font-bold text-red-400 flex items-center gap-1.5"><CalendarDays size={16}/> Peor Día</span>
                                 <div className="text-right">
                                     <span className="font-black block">{new Date(reporte.insights.peorDia.fecha + 'T00:00:00').toLocaleDateString('es-MX', {weekday: 'short', day:'numeric'})}</span>
                                     <span className="text-xs text-red-300 font-bold">{formaterMoneda(reporte.insights.peorDia.total_dia)}</span>
                                 </div>
                              </div>
                          </div>
                      )}

                      {/* SI ES AÑO, MUESTRA ESTADÍSTICAS POR MES */}
                      {filtroActivo === 'anio' && reporte.insights.mejorMes && (
                          <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 hover:border-slate-500 transition">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rendimiento Mensual</p>
                              <div className="flex justify-between items-center mb-4">
                                 <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5"><Calendar size={16}/> Mejor Mes</span>
                                 <div className="text-right">
                                     <span className="font-black block capitalize">{reporte.insights.mejorMes.mes}</span>
                                     <span className="text-xs text-emerald-300 font-bold">{formaterMoneda(reporte.insights.mejorMes.total)}</span>
                                 </div>
                              </div>
                              <div className="flex justify-between items-center">
                                 <span className="text-sm font-bold text-red-400 flex items-center gap-1.5"><Calendar size={16}/> Peor Mes</span>
                                 <div className="text-right">
                                     <span className="font-black block capitalize">{reporte.insights.peorMes.mes}</span>
                                     <span className="text-xs text-red-300 font-bold">{formaterMoneda(reporte.insights.peorMes.total)}</span>
                                 </div>
                              </div>
                          </div>
                      )}
                   </div>
                </div>
              )}

              {/* Tarjetas de Resumen Financiero */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center print:border-slate-300 print:shadow-none print:p-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 print:hidden"><DollarSign size={24}/></div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest print:text-[10px]">Ingresos Brutos</span>
                  <span className="text-3xl font-black text-slate-800 print:text-xl">{formaterMoneda(reporte.resumen.ventas_totales)}</span>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center print:border-slate-300 print:shadow-none print:p-4">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3 print:hidden"><PackageOpen size={24}/></div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest print:text-[10px]">Costo Inversión</span>
                  <span className="text-3xl font-black text-red-600 print:text-xl">{formaterMoneda(reporte.resumen.inversion_total)}</span>
                </div>

                <div className="bg-emerald-500 p-6 rounded-3xl shadow-lg border border-emerald-400 flex flex-col items-center text-center transform hover:scale-105 transition print:bg-white print:border-slate-300 print:shadow-none print:transform-none print:p-4">
                  <div className="w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center mb-3 print:hidden"><TrendingUp size={24}/></div>
                  <span className="text-xs font-black text-emerald-100 uppercase tracking-widest print:text-slate-400 print:text-[10px]">Ganancia Neta</span>
                  <span className="text-4xl font-black text-white print:text-emerald-600 print:text-2xl">{formaterMoneda(reporte.resumen.ganancia_total)}</span>
                </div>

                <div className="bg-slate-800 p-6 rounded-3xl shadow-md flex flex-col items-center text-center print:bg-white print:border-slate-300 print:shadow-none print:p-4">
                  <div className="w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center mb-3 print:hidden"><PackageOpen size={24}/></div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest print:text-[10px]">Platillos Vendidos</span>
                  <span className="text-4xl font-black text-white print:text-slate-800 print:text-2xl">{reporte.resumen.productos_vendidos}</span>
                </div>
              </div>

              {/* Tabla Desglosada */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:border-slate-300 print:shadow-none">
                <div className="p-6 border-b border-slate-100 print:p-4">
                  <h3 className="text-lg font-bold text-slate-800">Desglose de Productos, Extras y Envíos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider print:p-2">Producto</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center print:p-2">Vendidos</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right print:p-2">Precio Pub.</th>
                        <th className="p-4 text-xs font-black text-red-500 uppercase tracking-wider text-right print:p-2 print:text-slate-500">Costo Receta</th>
                        <th className="p-4 text-xs font-black text-emerald-600 uppercase tracking-wider text-right print:p-2 print:text-slate-500">Ganancia X U.</th>
                        <th className="p-4 text-xs font-black text-slate-800 uppercase tracking-wider text-right print:p-2">Ganancia Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                      {reporte.detalles.map((p, i) => {
                        const isExtra = p.categoria === 'Extras';
                        const isEnvio = p.categoria === 'Envíos';

                        return (
                          <tr key={i} className={`transition print:hover:bg-transparent ${isExtra ? 'bg-emerald-50/30' : isEnvio ? 'bg-purple-50/30' : 'hover:bg-slate-50'}`}>
                            <td className="p-4 font-bold text-slate-700 print:p-2 print:text-sm flex items-center gap-2">
                               {isExtra && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md uppercase">Extra</span>}
                               {isEnvio && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-md uppercase">Envío</span>}
                               {p.producto_nombre}
                            </td>
                            <td className="p-4 font-black text-slate-800 text-center text-lg print:p-2 print:text-sm">{p.cantidad_vendida}</td>
                            <td className="p-4 font-medium text-slate-600 text-right print:p-2 print:text-sm">{formaterMoneda(p.precio_venta)}</td>
                            <td className="p-4 font-medium text-red-500 text-right print:p-2 print:text-sm">{formaterMoneda(p.costo_unitario)}</td>
                            <td className="p-4 font-bold text-emerald-600 text-right print:p-2 print:text-sm print:bg-transparent">{formaterMoneda(p.precio_venta - p.costo_unitario)}</td>
                            <td className="p-4 font-black text-slate-800 text-right print:p-2 print:text-sm print:bg-transparent">{formaterMoneda(p.ganancia_neta)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ReporteVentas;