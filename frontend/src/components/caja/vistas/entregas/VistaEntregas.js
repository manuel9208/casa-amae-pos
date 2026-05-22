import React from 'react';
import { ChefHat, Phone, MapPin, DollarSign, Utensils, Check } from 'lucide-react';

const VistaEntregas = ({
  listosParaEntregar,
  isSubmitting,
  limpiandoMesas,
  actualizarEstadoPedido,
  setModalPago,
  setMontoRecibido,
  getTelefonoExtraido,
  renderBotonVerDetalle,
  renderBotonAgregarExtra
}) => {
  return (
    <>
      <h2 className="text-4xl font-black mb-10 text-slate-800">Listos para Entregar</h2>
      {listosParaEntregar.length === 0 ? (
        <div className="text-center text-slate-400 mt-20">
          <ChefHat size={64} className="mx-auto mb-4 opacity-30"/>
          <p className="text-2xl font-bold">La cocina aún está preparando los pedidos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {listosParaEntregar.map(p => {
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

            const esCuentaAbiertaLocal = tipoLimpio === 'Local' && (p.metodo_pago === 'Por Cobrar' || p.metodo_pago === 'Pendiente');
            const esMesaPagada = tipoLimpio === 'Local' && p.metodo_pago !== 'Por Cobrar' && p.metodo_pago !== 'Pendiente';

            return (
            <div key={p.id} className="bg-orange-50 p-8 rounded-[40px] shadow-lg shadow-orange-500/20 border-2 border-orange-400 flex flex-col transition animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-4xl font-black text-orange-600">#{p.numero_pedido}</h3>
                <span className="bg-orange-600 text-white px-4 py-1 rounded-full font-black uppercase text-sm tracking-widest">{tipoLimpio}</span>
              </div>
              
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-black text-slate-800 text-2xl">{direccionPura || p.cliente_nombre || p.cliente?.nombre || 'Invitado'}</p>
                  {tel && (
                      <span className="text-sm font-black text-slate-600 bg-orange-100 border border-orange-200 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Phone size={14}/> {tel}
                      </span>
                  )}
                  {p.mesa && (
                      <span className="text-sm font-black text-white bg-indigo-500 px-2 py-1 rounded-lg flex items-center gap-1">
                          📍 MESA {p.mesa}
                      </span>
                  )}
              </div>
              <p className="font-black text-blue-600 text-xl mb-4">Total de la Nota: ${p.total}</p>

              <div className="mb-4 bg-orange-100/50 p-4 rounded-3xl border border-orange-200 flex flex-col gap-3">
                 <div className="grid grid-cols-2 gap-3">
                    {renderBotonVerDetalle(p)}
                 </div>
                 {renderBotonAgregarExtra(p)}
              </div>

              {p.tipo_consumo === 'Domicilio' && (direccionPura || notaCambio) && (
                <div className="mb-4 flex flex-col gap-2">
                  {direccionPura && <p className="text-sm font-bold text-slate-600 bg-white p-3 rounded-xl shadow-sm border border-slate-200">📍 {direccionPura}</p>}
                  {Number(p.costo_envio) > 0 && <p className="text-sm font-black text-purple-700 bg-purple-100 p-3 rounded-xl shadow-sm border border-purple-200 flex items-center gap-2"><MapPin size={18}/> Costo de Envío Cobrado: ${p.costo_envio}</p>}
                  {notaCambio && <p className="text-sm font-black text-emerald-700 bg-emerald-100 p-3 rounded-xl shadow-sm border border-emerald-200 flex items-center gap-2"><DollarSign size={18}/> {notaCambio}</p>}
                </div>
              )}
              
              <div className="mt-auto pt-6 border-t border-orange-200">
                 {p.tipo_consumo === 'Domicilio' ? (
                    <div className="flex gap-3">
                        <button 
                           disabled={isSubmitting || limpiandoMesas} 
                           onClick={() => actualizarEstadoPedido(p.id, 'En Camino')} 
                           className="flex-1 py-5 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1 bg-purple-500 hover:bg-purple-600 text-white shadow-xl transition active:scale-95 disabled:opacity-50"
                        >
                            <MapPin size={24}/> Mandar a Reparto
                        </button>
                        <button 
                           disabled={isSubmitting || limpiandoMesas} 
                           onClick={() => { setModalPago(p); setMontoRecibido(''); }} 
                           className="flex-1 py-5 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition active:scale-95 disabled:opacity-50"
                        >
                            <DollarSign size={24}/> Cobrar Ahora
                        </button>
                    </div>
                 ) : (esCuentaAbiertaLocal || esMesaPagada) ? (
                    <button 
                       disabled={isSubmitting || limpiandoMesas} 
                       onClick={() => actualizarEstadoPedido(p.id, 'Entregado')} 
                       className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white shadow-xl transition active:scale-95 disabled:opacity-50"
                    >
                        <Utensils size={28}/> Servir en Mesa
                    </button>
                 ) : (p.metodo_pago === 'Pendiente' || p.metodo_pago === 'Por Cobrar') ? (
                    <button 
                       disabled={isSubmitting || limpiandoMesas} 
                       onClick={() => { setModalPago(p); setMontoRecibido(''); }} 
                       className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition active:scale-95 disabled:opacity-50"
                    >
                       <DollarSign size={28}/> Cobrar y Entregar
                    </button>
                 ) : (
                    <button 
                       disabled={isSubmitting || limpiandoMesas} 
                       onClick={() => actualizarEstadoPedido(p.id, 'Finalizado')} 
                       className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl transition active:scale-95 disabled:opacity-50"
                    >
                       <Check size={28}/> Marcar como Entregado
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

export default VistaEntregas;