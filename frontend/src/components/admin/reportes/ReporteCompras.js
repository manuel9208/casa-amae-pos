import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Calendar, Printer, RefreshCw } from 'lucide-react';

const ReporteCompras = ({ apiUrl, formaterMoneda }) => {
  const [cargando, setCargando] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState('dia');
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [compras, setCompras] = useState([]);
  const [totalGasto, setTotalGasto] = useState(0);

  const cargarCompras = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`${apiUrl}/insumos/compras/reporte?periodo=${filtroPeriodo}&fecha=${fechaFiltro}`);
      if (res.ok) {
        const data = await res.json();
        setCompras(data);
        const suma = data.reduce((acc, curr) => acc + Number(curr.costo_total), 0);
        setTotalGasto(suma);
      }
    } catch (e) {
      console.error("Error al cargar compras", e);
    } finally {
      setCargando(false);
    }
  }, [apiUrl, fechaFiltro, filtroPeriodo]);

  useEffect(() => {
    cargarCompras();
  }, [cargarCompras]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 print:m-0 print:p-0">
      
      {/* CABECERA Y FILTRO (CORREGIDO FLEX-WRAP) */}
      <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-200/50 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 print:hidden">
        <div className="shrink-0">
          <h2 className="text-2xl font-black text-emerald-900 flex items-center gap-2">
            <ShoppingCart className="text-emerald-600" /> Historial de Compras
          </h2>
          <p className="text-emerald-700/70 text-sm font-medium mt-1">
            Registro de abastecimiento de insumos realizados en Caja o Inventario.
          </p>
        </div>
        
        {/* CONTENEDOR FLUIDO QUE BAJA A LA SIGUIENTE LÍNEA SI NO CABE */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end mt-2 xl:mt-0">
          
          {/* BOTONES DE RANGO */}
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
            {['dia', 'semana', 'mes', 'anio'].map(f => (
              <button
                key={f}
                disabled={cargando}
                onClick={() => setFiltroPeriodo(f)}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition capitalize disabled:opacity-50 ${filtroPeriodo === f ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f === 'anio' ? 'Año' : f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-emerald-100 shadow-sm w-full sm:w-auto flex-1 sm:flex-none">
            <Calendar size={18} className="text-emerald-600 ml-2 shrink-0" />
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="bg-transparent border-none font-bold text-slate-700 focus:ring-0 cursor-pointer w-full text-sm outline-none"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={cargarCompras} className="flex-1 sm:flex-none bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-3 rounded-xl transition flex justify-center items-center">
               <RefreshCw size={18} className={cargando ? 'animate-spin' : ''} />
            </button>

            <button onClick={() => window.print()} className="flex-[2] sm:flex-none bg-slate-800 text-white font-bold px-5 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-700 transition whitespace-nowrap">
              <Printer size={18}/> Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* TÍTULO EXCLUSIVO PARA IMPRESIÓN */}
      <div className="hidden print:block text-center mb-6">
        <h2 className="text-2xl font-black text-black uppercase">Reporte de Compras de Insumos</h2>
        <p className="text-sm font-bold text-slate-600">Periodo: {filtroPeriodo.toUpperCase()} | Fecha Referencia: {fechaFiltro}</p>
        <hr className="my-4 border-black"/>
      </div>

      {/* TABLA DE COMPRAS */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left border-collapse print:text-xs min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 print:bg-slate-200 print:text-black">
                <th className="p-4 font-black border-b border-slate-200 print:border-black">Fecha y Hora</th>
                <th className="p-4 font-black border-b border-slate-200 print:border-black">Insumo Comprado</th>
                <th className="p-4 font-black border-b border-slate-200 print:border-black">Origen / Usuario</th>
                <th className="p-4 font-black text-center border-b border-slate-200 print:border-black">Cant. Cajas/Paquetes</th>
                <th className="p-4 font-black text-right border-b border-slate-200 print:border-black">Costo Fijo</th>
                <th className="p-4 font-black text-right border-b border-slate-200 print:border-black">Total Pagado</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100 print:divide-slate-300">
              {cargando ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400 font-bold animate-pulse">Obteniendo compras del servidor...</td>
                </tr>
              ) : compras.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400 font-bold print:text-black">No hay compras registradas en este periodo.</td>
                </tr>
              ) : (
                compras.map((compra) => (
                  <tr key={compra.id} className="hover:bg-emerald-50/50 transition">
                    <td className="p-4 text-slate-500 font-bold print:text-black whitespace-nowrap">
                      {new Date(compra.fecha_compra).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="p-4 font-black text-slate-900 print:text-black">
                      {compra.insumo_nombre}
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-md print:border whitespace-nowrap ${compra.origen === 'Caja' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {compra.origen}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-black bg-slate-100 px-2 py-1 rounded-lg print:bg-transparent">
                        {compra.paquetes}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-500 print:text-black">
                      {formaterMoneda(compra.costo_unitario)}
                    </td>
                    <td className="p-4 text-right font-black text-emerald-600 print:text-black">
                      {formaterMoneda(compra.costo_total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* TOTALES */}
            {compras.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800 text-white print:bg-slate-200 print:text-black">
                  <td colSpan="5" className="p-4 text-right font-black uppercase tracking-widest text-xs print:text-sm border-t-2 border-slate-900 print:border-black">
                    Gasto Total Invertido:
                  </td>
                  <td className="p-4 text-right font-black text-xl border-t-2 border-slate-900 print:border-black text-emerald-400 print:text-black">
                    {formaterMoneda(totalGasto)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReporteCompras;