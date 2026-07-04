import React, { useState, useMemo } from 'react';
import { ClipboardList } from 'lucide-react';  

import FiltrosSubVistaHistorial from './FiltrosSubVistaHistorial';
import RenglonPedidoHistorial from './RenglonPedidoHistorial';  

const HistorialTodosLosPedidos = ({
  pedidos,
  lanzarImpresion,
  setModalPuntoVenta,
  setModalEditarPedido,     // 👈 FIX: Función maestra de Edición
  actualizarEstadoPedido,   // 👈 FIX: Función maestra de Cancelación
  configGlobal,
  isSubmitting,
  limpiandoMesas
}) => {
  const [subVistaHistorial, setSubVistaHistorial] = useState('Pagado');  

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      if (subVistaHistorial === 'Entregado') {
        return p.estado_preparacion === 'Entregado' ||
               p.estado_preparacion === 'En Camino' ||
               p.estado_preparacion === 'Finalizado' ||
               p.estado_preparacion === 'Liquidado';
      }
      return p.estado_preparacion === subVistaHistorial;
    }).sort((a, b) => b.numero_pedido - a.numero_pedido);
  }, [pedidos, subVistaHistorial]);  

  return (
    <div className="w-full h-full bg-slate-50 text-slate-800 p-4 md:p-6 flex flex-col overflow-hidden">  
      <FiltrosSubVistaHistorial
        pedidos={pedidos}
        subVistaHistorial={subVistaHistorial}
        setSubVistaHistorial={setSubVistaHistorial}
        isSubmitting={isSubmitting}
        limpiandoMesas={limpiandoMesas}
      />  

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4 pb-24">
        {pedidosFiltrados.length === 0 ? (
          <div className="bg-white border-2 border-slate-200 border-dashed p-12 rounded-[40px] text-center max-w-xl mx-auto mt-10 animate-in zoom-in-95">
            <ClipboardList size={48} className="text-slate-300 mx-auto mb-4 opacity-70 animate-pulse" />
            <p className="text-xl font-bold text-slate-400">No hay pedidos en esta categoría</p>
            <p className="text-xs font-bold text-slate-400/70 mt-1 uppercase tracking-widest">
              Flujo operativo sin registros por el momento
            </p>
          </div>
        ) : (
          pedidosFiltrados.map(pedido => (
            <RenglonPedidoHistorial
              key={pedido.id}
              pedido={pedido}
              lanzarImpresion={lanzarImpresion}
              setModalPuntoVenta={setModalPuntoVenta}
              setModalEditarPedido={setModalEditarPedido}       // 👈 Inyectado al renglón
              actualizarEstadoPedido={actualizarEstadoPedido}   // 👈 Inyectado al renglón
              configGlobal={configGlobal}
              isSubmitting={isSubmitting}
              limpiandoMesas={limpiandoMesas}
            />
          ))
        )}
      </div>  
    </div>
  );
};  

export default HistorialTodosLosPedidos;