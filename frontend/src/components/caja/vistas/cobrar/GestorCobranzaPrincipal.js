import React from 'react';
import { Wallet } from 'lucide-react';
import TarjetaPedidoCobrar from './TarjetaPedidoCobrar';  

const GestorCobranzaPrincipal = ({
  ordenesEnCaja,
  isSubmitting,
  limpiandoMesas,
  setModalPago,
  actualizarEstadoPedido, // 👈 FIX: Inyectamos la función
  getIconoPago,
  getTelefonoExtraido,
  renderBotonVerDetalle,
  renderBotonEditar,
  renderBotonAgregarExtra
}) => {
  return (
    <div className="w-full h-full bg-slate-50 text-slate-800 p-4 md:p-6 overflow-y-auto custom-scrollbar">  
      {/* ENCABEZADO DE LA SECCIÓN */}
      <div className="mb-8 animate-in fade-in">
        <span className="text-[10px] font-black bg-blue-100 text-blue-600 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
          Módulo de Cobranza
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 tracking-tight">
          Cuentas por Cobrar
        </h1>
        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
          Órdenes pendientes de liquidación. Recibe el pago para cerrar la cuenta.
        </p>
      </div>  

      {/* GRID DE CUENTAS PENDIENTES O ESTADO VACÍO */}
      {ordenesEnCaja && ordenesEnCaja.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
          {ordenesEnCaja.map(pedido => (
            <TarjetaPedidoCobrar
              key={pedido.id}
              pedido={pedido}
              isSubmitting={isSubmitting}
              limpiandoMesas={limpiandoMesas}
              setModalPago={setModalPago}
              actualizarEstadoPedido={actualizarEstadoPedido} // 👈 FIX: Función pasada a la tarjeta
              getIconoPago={getIconoPago}
              getTelefonoExtraido={getTelefonoExtraido}
              renderBotonVerDetalle={renderBotonVerDetalle}
              renderBotonEditar={renderBotonEditar}
              renderBotonAgregarExtra={renderBotonAgregarExtra}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white rounded-[40px] border border-slate-200 border-dashed animate-in fade-in duration-300 max-w-2xl mx-auto">
          <Wallet size={64} className="text-blue-300 mb-4 animate-pulse" />
          <p className="text-2xl font-black text-slate-400">Caja al día</p>
          <p className="text-xs font-bold text-slate-400/80 mt-1 uppercase tracking-widest text-center max-w-sm">
            No hay cuentas pendientes por cobrar en este momento.
          </p>
        </div>
      )}
    </div>
  );
};  

export default GestorCobranzaPrincipal;