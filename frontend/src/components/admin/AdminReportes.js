import React, { useState, useEffect, useCallback } from 'react';
import FiltrosVentas from './reportes/FiltrosVentas';
import ProyeccionesVentas from './reportes/ProyeccionesVentas';
import InsightsVentas from './reportes/InsightsVentas';
import TendenciasVentas from './reportes/TendenciasVentas';
import ResumenFinanciero from './reportes/ResumenFinanciero';
import TablaDesgloseVentas from './reportes/TablaDesgloseVentas';

const AdminReportes = ({ apiUrl, showAlert }) => {
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(true);
  
  const [filtroActivo, setFiltroActivo] = useState('dia');
  const [fechaCustom, setFechaCustom] = useState(new Date().toISOString().split('T')[0]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [filtroClasificacion, setFiltroClasificacion] = useState('Todas');
  const [filtroConsumo, setFiltroConsumo] = useState('Todos');

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

  const handleImprimir = () => window.print();

  const parseFechaSegura = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      const fechaObj = new Date(year, month - 1, day);
      return fechaObj.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in pb-12 print:bg-white print:p-0">
      
      <FiltrosVentas 
        filtroActivo={filtroActivo} setFiltroActivo={setFiltroActivo}
        fechaCustom={fechaCustom} setFechaCustom={setFechaCustom}
        clasificaciones={clasificaciones}
        filtroClasificacion={filtroClasificacion} setFiltroClasificacion={setFiltroClasificacion}
        filtroConsumo={filtroConsumo} setFiltroConsumo={setFiltroConsumo}
        cargando={cargando} reporte={reporte} handleImprimir={handleImprimir}
      />

      {cargando ? (
        <div className="flex flex-col justify-center items-center py-20 print:hidden animate-pulse">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-slate-500">Procesando reporte financiero...</p>
        </div>
      ) : reporte ? (
        <div className="space-y-6">
          <ProyeccionesVentas proyecciones={reporte.proyecciones} />
          <InsightsVentas insights={reporte.insights} filtroActivo={filtroActivo} formaterMoneda={formaterMoneda} parseFechaSegura={parseFechaSegura} />
          <TendenciasVentas comparativas={reporte.comparativas} />
          <ResumenFinanciero resumen={reporte.resumen} formaterMoneda={formaterMoneda} />
          <TablaDesgloseVentas detalles={reporte.detalles} formaterMoneda={formaterMoneda} />
        </div>
      ) : null}
    </div>
  );
};

export default AdminReportes;