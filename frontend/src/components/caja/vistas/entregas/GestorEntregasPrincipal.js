import React from 'react';
import { PackageCheck } from 'lucide-react';
import TarjetaPedidoEntrega from './TarjetaPedidoEntrega';

const GestorEntregasPrincipal = ({
  listosParaEntregar,
  isSubmitting,
  limpiandoMesas,
  actualizarEstadoPedido,
  setModalPago,
  getTelefonoExtraido,
  renderBotonVerDetalle,
  renderBotonAgregarExtra,
  empleadosPOS
}) => {
  
  return (
    <div className="w-full h-full bg-slate-50 text-slate-800 p-4 md:p-6 overflow-y-auto custom-scrollbar">
      
      {/* ENCABEZADO */}
      <div className="mb-8 animate-in fade-in">
        <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 border border-indigo-200 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
          Módulo de Despacho
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 tracking-tight">
          Listos para Entregar
        </h1>
        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
          Órdenes terminadas por cocina. Asigna repartidores o entrega en mostrador.
        </p>
      </div>

      {/* GRID DE PEDIDOS */}
      {listosParaEntregar && listosParaEntregar.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
          {listosParaEntregar.map(pedido => (
            <TarjetaPedidoEntrega 
              key={pedido.id}
              pedido={pedido}
              isSubmitting={isSubmitting}
              limpiandoMesas={limpiandoMesas}
              actualizarEstadoPedido={actualizarEstadoPedido}
              setModalPago={setModalPago}
              getTelefonoExtraido={getTelefonoExtraido}
              renderBotonVerDetalle={renderBotonVerDetalle}
              renderBotonAgregarExtra={renderBotonAgregarExtra}
              empleadosPOS={empleadosPOS}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white rounded-[40px] border border-slate-200 border-dashed animate-in fade-in duration-300 max-w-2xl mx-auto">
          <PackageCheck size={64} className="text-slate-300 mb-4 animate-pulse" />
          <p className="text-2xl font-black text-slate-400">Sin despachos pendientes</p>
          <p className="text-xs font-bold text-slate-400/80 mt-1 uppercase tracking-widest text-center max-w-sm">
            Todas las órdenes preparadas por cocina ya han sido entregadas o despachadas en ruta.
          </p>
        </div>
      )}
    </div>
  );
};

export default GestorEntregasPrincipal;