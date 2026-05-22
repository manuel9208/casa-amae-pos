import React from 'react';

const PantallaExito = ({
  isOffline, numeroPedidoReal, tipoConsumo, metodoPagoFinal, contador, reiniciarKiosco
}) => {
  return (
    <div className="max-w-2xl mx-auto mt-20 text-center animate-in zoom-in">
      {isOffline ? (
          <div className="bg-red-100 text-red-600 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 text-6xl shadow-inner">📝</div>
      ) : (
          <div className="bg-emerald-100 text-emerald-600 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 text-6xl shadow-inner">✓</div>
      )}
      
      <h2 className="text-6xl font-black mb-4 texto-destacado">
          {isOffline ? '¡Anotado en la Libreta!' : '¡Orden Registrada!'}
      </h2>
      
      <p className="text-3xl text-slate-500 mb-6">Tu número de orden es el <span className="text-slate-900 font-black text-6xl block mt-4 mb-8">#{numeroPedidoReal}</span></p>
      
      {isOffline ? (
           <div className="bg-red-50 border border-red-200 p-8 rounded-3xl mb-12 max-w-lg mx-auto">
              <p className="text-red-800 font-black text-2xl mb-2">Pasar a cocina manualmente.</p>
              <p className="text-red-700 font-medium text-lg">Debido a la falta de internet, este pedido se guardó localmente. <strong>Escribe un ticket a mano y pásalo a la cocina para que lo preparen.</strong></p>
           </div>
      ) : tipoConsumo === 'Recoger' ? (
           <div className="bg-orange-50 border border-orange-200 p-8 rounded-3xl mb-12 max-w-lg mx-auto">
              <p className="text-orange-800 font-black text-2xl mb-2">Pedido en revisión.</p>
              <p className="text-orange-700 font-medium text-lg">En breve nos comunicaremos contigo para confirmar tu orden.</p>
              <p className="text-orange-600 font-black mt-4 uppercase tracking-widest text-sm">Pagarás al recoger tu pedido.</p>
           </div>
      ) : tipoConsumo === 'Domicilio' ? (
           <div className="bg-purple-50 border border-purple-200 p-8 rounded-3xl mb-12 max-w-lg mx-auto">
              <p className="text-purple-800 font-black text-2xl mb-2">Orden enviada a cocina.</p>
              {metodoPagoFinal === 'Efectivo' ? (
                 <p className="text-purple-700 font-medium text-lg">El repartidor cobrará en efectivo al entregar.</p>
              ) : (
                 <p className="text-purple-700 font-medium text-lg">Validaremos tu transferencia y enviaremos el pedido.</p>
              )}
           </div>
      ) : (
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-3xl mb-12 max-w-lg mx-auto">
              <p className="text-blue-800 font-black text-xl">
                  {(metodoPagoFinal === 'Por Cobrar' || metodoPagoFinal === 'Pendiente') ? 'Tu orden está en espera de aprobación de Caja.' : 'Por favor, pasa a la CAJA para realizar tu pago.'}
              </p>
          </div>
      )}

      <button 
          onClick={reiniciarKiosco} 
          className="bg-slate-200 px-12 py-5 rounded-2xl font-black text-slate-700 hover:bg-slate-800 hover:text-white transition-all shadow-md active:scale-95"
      >
          Finalizar ({contador}s)
      </button>
    </div>
  );
};

export default PantallaExito;