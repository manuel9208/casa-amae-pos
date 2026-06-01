import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Search, ShoppingBag, Eye, CalendarDays } from 'lucide-react';

const VistaCortesHistorico = ({ apiUrl, formaterMoneda, parseFechaSegura }) => {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState('dia'); 
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroMetodoPago, setFiltroMetodoPago] = useState('Todos');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  // 🌟 MODIFICADO: Ahora le pega a /pedidos/historial pasando filtros reales de tiempo al Backend
  const cargarPedidosHistoricos = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`${apiUrl}/pedidos/historial?periodo=${periodo}&fecha=${fechaFiltro}`);
      if (res.ok) {
        const data = await res.json();
        setPedidos(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error cargando histórico de auditoría", e);
    } finally {
      setCargando(false);
    }
  }, [apiUrl, periodo, fechaFiltro]);

  // Se dispara de manera inteligente cada que el usuario cambie el Día, el Mes o el Año
  useEffect(() => {
    cargarPedidosHistoricos();
  }, [cargarPedidosHistoricos]);

  const deserializarCarrito = (carritoRaw) => {
    if (!carritoRaw) return [];
    return typeof carritoRaw === 'string' ? JSON.parse(carritoRaw) : carritoRaw;
  };

  // El filtrado en cliente y método se mantiene rápido y local en tiempo de renderizado
  const pedidosFiltrados = pedidos.filter(p => {
    if (filtroCliente.trim() !== '') {
      const termino = filtroCliente.toLowerCase();
      const nombreCliente = String(p.cliente_nombre || 'Invitado').toLowerCase();
      const telCliente = String(p.cliente_telefono || p.telefono || '');
      if (!nombreCliente.includes(termino) && !telCliente.includes(termino)) return false;
    }

    if (filtroMetodoPago !== 'Todos' && p.metodo_pago !== filtroMetodoPago) return false;

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <CalendarDays size={14}/> Rango de Auditoría
          </label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[['dia', 'Día'], ['mes', 'Mes'], ['anio', 'Año']].map(([id, label]) => (
              <button key={id} onClick={() => setPeriodo(id)} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${periodo === id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Fecha Referencia</label>
          <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm" />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <Search size={14}/> Identificador o Teléfono
          </label>
          <input type="text" placeholder="Buscar comprador..." value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-sm outline-none" />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <DollarSign size={14}/> Método de Pago
          </label>
          <select value={filtroMetodoPago} onChange={(e) => setFiltroMetodoPago(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-sm outline-none cursor-pointer">
            <option value="Todos">Todos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Mixto">Mixto</option>
          </select>
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-20 animate-pulse font-bold text-slate-500">Cargando transacciones históricas...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2 bg-white rounded-[32px] p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              🧾 Órdenes Auditadas ({pedidosFiltrados.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="pb-3">Orden</th>
                    <th className="pb-3">Cliente / Identificador</th>
                    <th className="pb-3">Método</th>
                    <th className="pb-3 text-right">Monto</th>
                    <th className="pb-3 text-center">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pedidosFiltrados.map((p) => (
                    <tr key={p.id} className="text-slate-700 hover:bg-slate-50/80 transition text-sm">
                      <td className="py-3.5 font-black text-slate-900 text-base">#{p.numero_pedido}</td>
                      <td className="py-3.5">
                        <p className="font-bold text-slate-800">{p.cliente_nombre || 'Invitado'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{p.tipo_consumo}</p>
                      </td>
                      <td className="py-3.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${p.metodo_pago === 'Efectivo' ? 'bg-emerald-100 text-emerald-800' : p.metodo_pago === 'Tarjeta' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                          {p.metodo_pago}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-black text-slate-900">{formaterMoneda(p.total)}</td>
                      <td className="py-3.5 text-center">
                        <button onClick={() => setPedidoSeleccionado(p)} className="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-xl transition text-slate-500">
                          <Eye size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pedidosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-10 font-bold text-slate-400 text-sm">Ninguna orden coincide con los filtros en este rango temporal.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="xl:col-span-1 bg-slate-900 text-white rounded-[32px] p-6 shadow-xl min-h-[400px]">
            {pedidoSeleccionado ? (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h4 className="text-3xl font-black">Orden #{pedidoSeleccionado.numero_pedido}</h4>
                  <p className="text-xs font-bold text-slate-400 mt-1">Identificador Celular: {pedidoSeleccionado.cliente_telefono || pedidoSeleccionado.telefono || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                    <ShoppingBag size={12}/> Productos e Ingredientes
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {deserializarCarrito(pedidoSeleccionado.carrito).map((item, idx) => (
                      <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <div className="flex justify-between font-bold text-sm">
                          <span>{item.cantidad || 1}x {item.nombre}</span>
                          <span className="text-blue-400">{formaterMoneda(item.precioFinal || item.precio_base)}</span>
                        </div>
                        {item.extras && item.extras.length > 0 && (
                          <div className="mt-1 pl-2 border-l border-slate-700 text-xs text-slate-400 space-y-0.5 font-medium">
                            {item.extras.map((e, i) => (
                              <div key={i} className="flex justify-between">
                                <span>+ {e.nombre}</span>
                                {Number(e.precioExtra || e.precio || 0) > 0 && <span className="text-emerald-500">+{formaterMoneda(e.precioExtra || e.precio)}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Liquidación:</span>
                    <span className="font-black uppercase">{pedidoSeleccionado.metodo_pago}</span>
                  </div>
                  <div className="flex justify-between text-base font-black border-t border-slate-800 pt-2 text-blue-400">
                    <span>Total Cobrado:</span>
                    <span>{formaterMoneda(pedidoSeleccionado.total)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-40 py-20">
                <Eye size={48} className="mx-auto mb-2" />
                <p className="text-sm font-black uppercase">Visor de Ticket</p>
                <p className="text-xs mt-1">Selecciona una orden de la lista para auditar su desglose financiero.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaCortesHistorico;