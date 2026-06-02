import React, { useState, useEffect, useCallback } from 'react';
import { Fuel, MapPin, TrendingUp, Calendar, Info, RefreshCw } from 'lucide-react';

const ReporteCombustible = ({ apiUrl, formaterMoneda }) => {
  const [cargando, setCargando] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [datosReparto, setDatosReparto] = useState([]);
  const [totales, setTotales] = useState({ viajes: 0, km_estimados: 0, gasto_estimado: 0 });

  // ✅ CORRECCIÓN ESLINT: Se remueve el setter 'setConfigGasolina' ya que los valores son de solo lectura por ahora.
  // (Si en el futuro agregas inputs para modificarlos, puedes volver a usar useState completo).
  const [configGasolina] = useState({
    precioLitro: 23.50, // Precio promedio de la gasolina
    kmPorLitro: 15,     // Rendimiento promedio de una motocicleta
    kmPorViaje: 4.5     // Promedio estimado ida y vuelta por pedido
  });

  const cargarRendimiento = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`${apiUrl}/reportes/combustible?fecha=${fechaFiltro}`);
      if (res.ok) {
        const data = await res.json();
        setDatosReparto(data.repartidores || []);
        
        // Calculamos los totales agregados
        const totalViajes = (data.repartidores || []).reduce((acc, rep) => acc + Number(rep.total_viajes), 0);
        const totalKm = totalViajes * configGasolina.kmPorViaje;
        const litrosUsados = totalKm / configGasolina.kmPorLitro;
        const gastoGasolina = litrosUsados * configGasolina.precioLitro;

        setTotales({
          viajes: totalViajes,
          km_estimados: totalKm.toFixed(1),
          gasto_estimado: gastoGasolina
        });
      }
    } catch (error) {
      console.error("Error al cargar reporte de combustible", error);
    } finally {
      setCargando(false);
    }
  }, [apiUrl, fechaFiltro, configGasolina]);

  useEffect(() => {
    cargarRendimiento();
  }, [cargarRendimiento]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      
      {/* CABECERA Y FILTRO */}
      <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-200/50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-amber-900 flex items-center gap-2">
            <Fuel className="text-amber-600" /> Rendimiento de Flotilla
          </h2>
          <p className="text-amber-700/70 text-sm font-medium mt-1">
            Análisis estimado de kilometraje y consumo de combustible por repartidor.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-amber-100 shadow-sm w-full md:w-auto">
          <Calendar size={18} className="text-amber-600 ml-2" />
          <input 
            type="date" 
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="bg-transparent border-none font-bold text-slate-700 focus:ring-0 cursor-pointer w-full"
          />
          <button 
            onClick={cargarRendimiento}
            className="bg-amber-100 hover:bg-amber-200 text-amber-700 p-2 rounded-xl transition"
          >
            <RefreshCw size={18} className={cargando ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* METRICAS GLOBALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
            <MapPin size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Viajes Realizados</p>
            <p className="text-3xl font-black text-slate-800">{totales.viajes}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distancia Total Estimada</p>
            <p className="text-3xl font-black text-slate-800">{totales.km_estimados} <span className="text-base text-slate-400">km</span></p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-red-50 p-4 rounded-2xl text-red-600">
            <Fuel size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo de Gasolina</p>
            <p className="text-3xl font-black text-red-600">{formaterMoneda(totales.gasto_estimado)}</p>
          </div>
        </div>
      </div>

      {/* INFO DE CONFIGURACIÓN */}
      <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs font-medium text-blue-800 leading-relaxed">
          <span className="font-black">Modelo de Estimación:</span> Los cálculos se basan en un rendimiento promedio de <span className="font-black text-blue-600">{configGasolina.kmPorLitro} km/l</span>, un precio de <span className="font-black text-blue-600">{formaterMoneda(configGasolina.precioLitro)} por litro</span>, y una distancia promedio de <span className="font-black text-blue-600">{configGasolina.kmPorViaje} km</span> por entrega (ida y vuelta).
        </p>
      </div>

      {/* TABLA DE REPARTIDORES */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-800">Desglose Operativo por Repartidor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                <th className="p-4 font-black">Conductor</th>
                <th className="p-4 font-black text-center">Viajes Terminados</th>
                <th className="p-4 font-black text-center">Km Estimados</th>
                <th className="p-4 font-black text-right">Gasto Combustible</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-400 font-bold animate-pulse">Analizando rutas...</td>
                </tr>
              ) : datosReparto.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-400 font-bold">No hay viajes registrados en esta fecha.</td>
                </tr>
              ) : (
                datosReparto.map((rep, idx) => {
                  const km = (Number(rep.total_viajes) * configGasolina.kmPorViaje).toFixed(1);
                  const gasto = (km / configGasolina.kmPorLitro) * configGasolina.precioLitro;
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-black text-slate-900 flex items-center gap-3">
                        <span className="bg-slate-100 p-2 rounded-xl">🛵</span>
                        {rep.repartidor_nombre}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-black">
                          {rep.total_viajes}
                        </span>
                      </td>
                      <td className="p-4 text-center font-black text-slate-500">
                        {km} km
                      </td>
                      <td className="p-4 text-right font-black text-red-500">
                        {formaterMoneda(gasto)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ReporteCombustible;