import React from 'react';
import { CheckCircle2, Phone, AlertTriangle, Clock, ChefHat, DollarSign } from 'lucide-react';

const VistaCobrar = ({
  ordenesEnCaja,
  isSubmitting,
  limpiandoMesas,
  setModalPago,
  setMontoRecibido,
  actualizarEstadoPedido,
  getIconoPago,
  getTelefonoExtraido,
  renderBotonVerDetalle,
  renderBotonEditar,
  renderBotonAgregarExtra
}) => {
  return (
    <>
      <h2 className="text-4xl font-black mb-10 text-slate-800">Cuentas y Cobros Pendientes</h2>
      {ordenesEnCaja.length === 0 ? (
        <div className="text-center text-slate-400 mt-20">
          <CheckCircle2 size={64} className="mx-auto mb-4 opacity-30"/>
          <p className="text-2xl font-bold">Todo al día, no hay cobros pendientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {ordenesEnCaja.map(p => {
            let direccionPura = '';
            let notaCambio = null;
            const tel = getTelefonoExtraido(p);
            const tipoLimpio = p.tipo_consumo || 'SIN ESPECIFICAR';

            if (p.direccion_entrega) {
               const partes = p.direccion_entrega.split('|').map(x => x.trim());
               direccionPura = partes[0].replace(/TEL:\s*\d*/g, '').replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger').replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
               const cambioPart = partes.find(x => x.includes('Llevar cambio'));
               notaCambio = cambioPart ? cambioPart : null;
            }

            const esCuentaAbierta = p.metodo_pago === 'Por Cobrar';
            const isReparto = p.tipo_consumo === 'Domicilio' && p.estado_preparacion === 'En Camino';
            const esEsperandoAprobacion = p.estado_preparacion === 'Pendiente' && (tipoLimpio === 'Local' || tipoLimpio === 'Para llevar');

            return (
            <div key={p.id} className={`bg-white p-8 rounded-[40px] shadow-sm border-2 flex flex-col hover:shadow-md transition ${esCuentaAbierta || isReparto || esEsperandoAprobacion ? 'border-orange-300 shadow-orange-500/10' : 'border-slate-100'}`}>
              <div className="flex justify-between items-start mb-4">
                  <h3 className="text-3xl font-black text-slate-800">#{p.numero_pedido}</h3>
                  <span className={`text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-widest ${p.metodo_pago === 'Efectivo' ? 'bg-emerald-100 text-emerald-700' : p.metodo_pago === 'Tarjeta' ? 'bg-blue-100 text-blue-700' : p.metodo_pago === 'Mixto' ? 'bg-indigo-100 text-indigo-700' : p.metodo_pago === 'Por Cobrar' || p.metodo_pago === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                      {getIconoPago(p.metodo_pago)} {esCuentaAbierta ? 'Cuenta Abierta' : isReparto ? 'En Reparto' : p.metodo_pago}
                  </span>
              </div>
              
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="font-bold text-slate-700 text-xl">{direccionPura || p.cliente_nombre || p.cliente?.nombre || 'Invitado'}</p>
                  {tel && (
                      <a href={`https://wa.me/52${tel.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" title="Abrir chat en WhatsApp" className="text-xs font-black text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors cursor-pointer">
                          <Phone size={12}/> {tel}
                      </a>
                  )}
                  {p.mesa && (
                      <span className="text-xs font-black text-indigo-600 bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-md flex items-center gap-1">
                          📍 MESA {p.mesa}
                      </span>
                  )}
              </div>

              <div className="mb-4">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm border
                      ${tipoLimpio === 'Local' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        tipoLimpio === 'Para llevar' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 
                        tipoLimpio === 'Domicilio' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                        tipoLimpio === 'Recoger en Local' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-slate-100 text-slate-600 border-slate-300'}`}>
                      {tipoLimpio === 'Local' ? '🍽️' : tipoLimpio === 'Para llevar' ? '🛍️' : tipoLimpio === 'Domicilio' ? '🛵' : tipoLimpio === 'Recoger en Local' ? '📞' : '❓'} {tipoLimpio}
                  </span>
              </div>
              
              {(esCuentaAbierta || isReparto || esEsperandoAprobacion) && (
                  <div className="mb-4 bg-orange-50 text-orange-700 text-xs font-black p-2.5 rounded-lg border border-orange-200 flex items-center gap-2 shadow-inner">
                     <Clock size={16}/> {
                         p.estado_preparacion === 'Pendiente' ? 'Esperando Aprobación de Caja' : 
                         p.estado_preparacion === 'Pagado' ? 'En Cola (Cocina)' : 
                         p.estado_preparacion === 'Preparando' ? 'Preparando en Cocina' : 
                         p.estado_preparacion === 'Listo' ? 'Listo en Barra' : 
                         p.estado_preparacion === 'En Camino' ? 'Repartidor en Ruta' : p.estado_preparacion
                     }
                  </div>
              )}

              <div className="mb-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  {renderBotonVerDetalle(p)}
                  {renderBotonEditar(p)}
                </div>
                {renderBotonAgregarExtra(p)}
              </div>

              {p.tipo_consumo === 'Domicilio' && (direccionPura || notaCambio) && (
                <div className="mb-4">
                  {direccionPura && <div className="text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">📍 {direccionPura}</div>}
                  {notaCambio && (
                    <div className="mt-2 bg-orange-100 border border-orange-200 text-orange-700 font-black px-3 py-2 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                      <AlertTriangle size={16}/> {notaCambio}
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-auto pt-6 border-t border-slate-100">
                <p className="text-4xl font-black text-blue-600 mb-6">${p.total}</p>
                
                {isReparto ? (
                   <button 
                      disabled={isSubmitting || limpiandoMesas} 
                      onClick={() => { setModalPago(p); setMontoRecibido(''); }} 
                      className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition active:scale-95 disabled:opacity-50"
                   >
                       <DollarSign size={24}/> Cobrar a Repartidor
                   </button>
                ) : esEsperandoAprobacion ? (
                   <div className="flex gap-3">
                       <button 
                          disabled={isSubmitting || limpiandoMesas} 
                          onClick={() => actualizarEstadoPedido(p.id, 'Pagado')} 
                          className="flex-1 py-4 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                       >
                           <ChefHat size={20}/> Mandar a Cocina
                       </button>
                       <button 
                          disabled={isSubmitting || limpiandoMesas} 
                          onClick={() => { setModalPago(p); setMontoRecibido(''); }} 
                          className="flex-1 py-4 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                       >
                           <DollarSign size={20}/> Cobrar Ahora
                       </button>
                   </div>
                ) : esCuentaAbierta ? (
                   <button 
                      disabled={isSubmitting || limpiandoMesas} 
                      onClick={() => { setModalPago(p); setMontoRecibido(''); }} 
                      className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition active:scale-95 disabled:opacity-50"
                   >
                       <DollarSign size={24}/> Cobrar Orden
                   </button>
                ) : (
                   <button 
                      disabled={isSubmitting || limpiandoMesas} 
                      onClick={() => { setModalPago(p); setMontoRecibido(''); }} 
                      className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition active:scale-95 disabled:opacity-50"
                   >
                       <CheckCircle2 size={24}/> Validar Pago
                   </button>
                )}
              </div>
            </div>
          )})}
        </div>
      )}
    </>
  );
};

export default VistaCobrar;