import React from 'react';
import { TrendingUp, Printer, Calendar, Filter, PackageOpen, Search } from 'lucide-react';

const FiltrosVentas = ({
  filtroActivo, setFiltroActivo, fechaCustom, setFechaCustom,
  clasificaciones, filtroClasificacion, setFiltroClasificacion,
  filtroConsumo, setFiltroConsumo, cargando, reporte, handleImprimir
}) => {
  return (
    <>
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

      <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex flex-col md:flex-row items-end gap-4 print:hidden">
        <div className="flex-1 w-full">
          <label className="flex items-center gap-2 text-xs font-black text-orange-800 uppercase tracking-widest mb-2">
            <Calendar size={16}/> Fecha Referencia
          </label>
          <input 
            type="date" disabled={cargando} value={fechaCustom} onChange={(e) => setFechaCustom(e.target.value)}
            className="w-full p-3 rounded-xl border border-orange-200 font-bold text-slate-700 outline-none focus:border-orange-500 disabled:opacity-50"
          />
        </div>

        <div className="flex-1 w-full">
          <label className="flex items-center gap-2 text-xs font-black text-orange-800 uppercase tracking-widest mb-2">
            <Filter size={16}/> Categoría
          </label>
          <select 
            disabled={cargando} value={filtroClasificacion} onChange={e => setFiltroClasificacion(e.target.value)} 
            className="w-full p-3 rounded-xl border border-orange-200 font-bold text-slate-700 outline-none focus:border-orange-500 disabled:opacity-50"
          >
            <option value="Todas">Todas las categorías</option>
            <option value="Extras">🌟 Solo Extras</option>
            <option value="Envíos">🛵 Solo Envíos</option>
            {clasificaciones.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>

        <div className="flex-1 w-full">
          <label className="flex items-center gap-2 text-xs font-black text-orange-800 uppercase tracking-widest mb-2">
            <PackageOpen size={16}/> Tipo de Consumo
          </label>
          <select 
            disabled={cargando} value={filtroConsumo} onChange={e => setFiltroConsumo(e.target.value)} 
            className="w-full p-3 rounded-xl border border-orange-200 font-bold text-slate-700 outline-none focus:border-orange-500 disabled:opacity-50"
          >
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
    </>
  );
};

export default FiltrosVentas;