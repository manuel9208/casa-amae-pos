import React from 'react';
import { Clock } from 'lucide-react';

const PantallaPago = ({
  pantallaActual, setPantallaActual, isSubmitting, seleccionarPago, getBackRuta,
  tipoConsumo, esPersonalInterno, calcularTotal, configGlobal, numeroPedidoReal,
  procesarTransferencia
}) => {

  if (pantallaActual === 'pago') {
    return (
      <div className="max-w-3xl mx-auto mt-10 animate-in fade-in">
        <div className="flex justify-start mb-6">
           <button 
               disabled={isSubmitting} 
               onClick={() => setPantallaActual(getBackRuta())} 
               className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition disabled:opacity-50"
           >
               ⬅ Atrás
           </button>
        </div>
        
        <h2 className="text-4xl font-black text-center mb-12 texto-destacado">Método de Pago</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
              disabled={isSubmitting} 
              onClick={() => setPantallaActual('cambio_efectivo_domicilio')} 
              className={`bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between transition-all active:scale-95 ${isSubmitting ? 'opacity-50' : 'hover:bg-emerald-50 hover:border-emerald-200'}`}
          >
              <span className="text-3xl font-black text-slate-700">💵 Pago en Efectivo</span>
          </button>
          
          <button 
              disabled={isSubmitting} 
              onClick={() => seleccionarPago('Transferencia')} 
              className={`bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between transition-all active:scale-95 ${isSubmitting ? 'opacity-50' : 'hover:bg-purple-50 hover:border-purple-200'}`}
          >
              <span className="text-3xl font-black text-slate-700">{isSubmitting ? 'Procesando...' : '📱 Transferencia'}</span>
          </button>

          {esPersonalInterno && (tipoConsumo === 'Local' || tipoConsumo === 'Para llevar') && (
            <button 
                disabled={isSubmitting} 
                onClick={() => seleccionarPago('Por Cobrar')} 
                className={`md:col-span-2 bg-orange-50 p-8 rounded-[30px] shadow-md border border-orange-200 flex items-center justify-between transition-all active:scale-95 ${isSubmitting ? 'opacity-50' : 'hover:bg-orange-100 hover:border-orange-300'}`}
            >
                <span className="text-3xl font-black text-orange-700 flex items-center gap-3">
                    <Clock size={32}/> Dejar Cuenta Abierta (Mandar a Cocina)
                </span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (pantallaActual === 'cambio_efectivo_domicilio') {
    return (
      <div className="max-w-3xl mx-auto mt-10 text-center animate-in slide-in-from-bottom-4">
        <div className="flex justify-start mb-6">
            <button 
                disabled={isSubmitting} 
                onClick={() => setPantallaActual('pago')} 
                className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition disabled:opacity-50"
            >
                ⬅ Atrás
            </button>
        </div>
        
        <span className="text-6xl block mb-6">💵</span>
        <h2 className="text-4xl font-black text-center mb-4 texto-destacado">¿Con cuánto vas a pagar?</h2>
        <p className="text-slate-500 font-medium mb-8 text-xl">El repartidor te llevará el cambio exacto.</p>
        <p className="text-2xl font-black text-blue-600 mb-8">Total de tu orden: ${calcularTotal()}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button 
              disabled={isSubmitting} 
              onClick={() => seleccionarPago('Efectivo', 'Exacto')} 
              className={`bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200 font-black text-xl text-slate-700 transition-all active:scale-95 ${isSubmitting ? 'opacity-50' : 'hover:border-blue-500 hover:text-blue-600'}`}
          >
              {isSubmitting ? '...' : 'Exacto'}
          </button>
          
          {[100, 200, 300, 400, 500, 1000].filter(monto => monto > calcularTotal()).map(monto => (
            <button 
                key={monto} 
                disabled={isSubmitting} 
                onClick={() => seleccionarPago('Efectivo', `$${monto}`)} 
                className={`bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200 font-black text-xl text-slate-700 transition-all active:scale-95 ${isSubmitting ? 'opacity-50' : 'hover:border-emerald-500 hover:text-emerald-600'}`}
            >
                {isSubmitting ? '...' : `$${monto}`}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (pantallaActual === 'detalles_transferencia') {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-10 rounded-[40px] shadow-2xl border border-blue-100 text-center animate-in zoom-in">
        <span className="text-6xl block mb-6">🏦</span>
        <h2 className="text-3xl font-black mb-2 text-slate-800">Datos para tu pago</h2>
        <p className="text-slate-500 font-medium mb-6">Transfiere el total exacto y envía comprobante por WhatsApp.</p>
        
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 text-left space-y-4">
          <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Banco</p>
              <p className="font-bold text-lg text-slate-800">{configGlobal.banco}</p>
          </div>
          <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cuenta / CLABE</p>
              <p className="font-black text-xl text-blue-600 tracking-wider">{configGlobal.cuenta}</p>
          </div>
          <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">A nombre de</p>
              <p className="font-bold text-lg text-slate-800">{configGlobal.titular}</p>
          </div>
          <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total a pagar</p>
              <p className="font-black text-3xl text-slate-800">${calcularTotal()}</p>
          </div>
        </div>
        
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl mb-8">
          <p className="text-sm font-bold text-emerald-800 mb-2">📲 Envía tu comprobante con la orden:</p>
          <p className="text-3xl font-black text-emerald-600 mb-2">#{numeroPedidoReal}</p>
          <p className="text-lg font-bold text-slate-700">WhatsApp: {configGlobal.whatsapp}</p>
        </div>
        
        <button 
            onClick={procesarTransferencia} 
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg hover:bg-blue-700 transition active:scale-95"
        >
            Ya envié mi comprobante
        </button>
      </div>
    );
  }

  return null;
};

export default PantallaPago;