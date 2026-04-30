import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, TrendingUp, DollarSign, PackageOpen, Search, Printer } from 'lucide-react';

const ReporteVentas = ({ apiUrl, showAlert }) => {
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [filtroActivo, setFiltroActivo] = useState('dia');
  const [fechaCustom, setFechaCustom] = useState(new Date().toISOString().split('T')[0]);

  const cargarReporte = useCallback(async (tipo, fecha = '') => {
    setCargando(true);
    try {
      const res = await fetch(`${apiUrl}/reportes/ventas?tipo=${tipo}&fecha=${fecha}`);
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
  }, [apiUrl, showAlert]);

  useEffect(() => {
    cargarReporte(filtroActivo, fechaCustom);
  }, [cargarReporte, filtroActivo, fechaCustom]);

  const formaterMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad || 0);
  };

  // Función para disparar la impresión del navegador
  const handleImprimir = () => {
    window.print();
  };

  return (
    // Agregamos una clase especial para que el fondo sea blanco al imprimir
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in pb-12 print:bg-white print:p-0">
      
      {/* ENCABEZADO Y CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 print:shadow-none print:border-b-2 print:rounded-none print:pb-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={32} /> Reporte Financiero
          </h2>
          <p className="text-slate-500 font-medium mt-1">Análisis de ventas, inversión y ganancia neta.</p>
          {/* Este texto solo se verá en el PDF impreso para dar contexto de la fecha */}
          <p className="hidden print:block text-slate-800 font-bold mt-2">
            Periodo Analizado: <span className="uppercase text-blue-600">{filtroActivo}</span> | Fecha de consulta: {fechaCustom}
          </p>
        </div>
        
        {/* Controles de Filtro (Se ocultan al imprimir con print:hidden) */}
        <div className="flex flex-wrap gap-2 print:hidden">
          {['dia', 'semana', 'mes', 'anio'].map(f => (
            <button 
              key={f} 
              onClick={() => setFiltroActivo(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition capitalize ${filtroActivo === f ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {f}
            </button>
          ))}
          
          {/* 👇 BOTÓN DE IMPRIMIR / PDF */}
          <button 
            onClick={handleImprimir}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-700 transition ml-2"
          >
            <Printer size={16} /> Imprimir PDF
          </button>
        </div>
      </div>

      {/* Buscador Histórico Especial (Se oculta al imprimir) */}
      <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 flex items-center gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-2 text-orange-800 font-bold">
          <Calendar size={20} /> Fecha a analizar:
        </div>
        <input 
          type="date" 
          value={fechaCustom} 
          onChange={(e) => setFechaCustom(e.target.value)}
          className="p-2 rounded-xl border border-orange-200 text-sm font-bold text-slate-700 outline-none focus:border-orange-500"
        />
        <button 
          onClick={() => setFiltroActivo('historico')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${filtroActivo === 'historico' ? 'bg-orange-600 text-white shadow-md' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
        >
          <Search size={16}/> Buscar Día Histórico (Ej. Día de Madres)
        </button>
      </div>

      {cargando ? (
        <div className="flex justify-center items-center py-20 print:hidden">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : reporte ? (
        <div className="space-y-6">
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
              <h3 className="text-lg font-bold text-slate-800">Desglose de Productos ({reporte.detalles.length})</h3>
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
                  {reporte.detalles.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition print:hover:bg-transparent">
                      <td className="p-4 font-bold text-slate-700 print:p-2 print:text-sm">{p.producto_nombre}</td>
                      <td className="p-4 font-black text-slate-800 text-center text-lg print:p-2 print:text-sm">{p.cantidad_vendida}</td>
                      <td className="p-4 font-medium text-slate-600 text-right print:p-2 print:text-sm">{formaterMoneda(p.precio_venta)}</td>
                      <td className="p-4 font-medium text-red-500 text-right print:p-2 print:text-sm">{formaterMoneda(p.costo_unitario)}</td>
                      <td className="p-4 font-bold text-emerald-600 text-right bg-emerald-50/30 print:p-2 print:text-sm print:bg-transparent">{formaterMoneda(p.precio_venta - p.costo_unitario)}</td>
                      <td className="p-4 font-black text-slate-800 text-right bg-slate-50 print:p-2 print:text-sm print:bg-transparent">{formaterMoneda(p.ganancia_neta)}</td>
                    </tr>
                  ))}
                  {reporte.detalles.length === 0 && (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold print:p-4">No hay ventas registradas en este periodo.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ReporteVentas;