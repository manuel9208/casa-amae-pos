import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import TarjetaPedidoConfirmar from './TarjetaPedidoConfirmar';

const GestorConfirmacionPrincipal = ({
  user,
  pedidosPorConfirmar,
  isSubmitting,
  actualizarEstadoPedido,
  setModalZonaEnvio,
  confirmarPedidoRecoger,
  getTelefonoExtraido,
  renderBotonVerDetalle,
  renderBotonEditar,
  renderItemsConfirmacion
}) => {
  return (
    <div className="w-full h-full bg-slate-50 text-slate-800 p-4 md:p-6 overflow-y-auto custom-scrollbar">
      
      {/* ENCABEZADO DE LA SECCIÓN */}
      <div className="mb-8 animate-in fade-in">
        <span className="text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
          Recepción de Órdenes
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 tracking-tight">
          Por Confirmar
        </h1>
        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
          Revisa y acepta los nuevos pedidos entrantes antes de mandarlos a cocina.
        </p>
      </div>

      {/* GRID DE PEDIDOS ENTRANTE O ESTADO VACÍO */}
      {pedidosPorConfirmar && pedidosPorConfirmar.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
          {pedidosPorConfirmar.map(pedido => (
            <TarjetaPedidoConfirmar 
              key={pedido.id}
              pedido={pedido}
              isSubmitting={isSubmitting}
              actualizarEstadoPedido={actualizarEstadoPedido}
              setModalZonaEnvio={setModalZonaEnvio}
              confirmarPedidoRecoger={confirmarPedidoRecoger}
              getTelefonoExtraido={getTelefonoExtraido}
              renderBotonVerDetalle={renderBotonVerDetalle}
              renderBotonEditar={renderBotonEditar}
              renderItemsConfirmacion={renderItemsConfirmacion}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white rounded-[40px] border border-slate-200 border-dashed animate-in fade-in duration-300 max-w-2xl mx-auto">
          <ClipboardCheck size={64} className="text-amber-300 mb-4 animate-pulse" />
          <p className="text-2xl font-black text-slate-400">Sin órdenes nuevas</p>
          <p className="text-xs font-bold text-slate-400/80 mt-1 uppercase tracking-widest text-center max-w-sm">
            No hay pedidos en la bandeja de entrada en este momento.
          </p>
        </div>
      )}
    </div>
  );
};

export default GestorConfirmacionPrincipal;