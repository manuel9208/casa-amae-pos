import React from 'react';
import { Clock } from 'lucide-react';

const PantallaPago = ({
  pantallaActual, setPantallaActual, isSubmitting, seleccionarPago, getBackRuta,
  tipoConsumo, esPersonalInterno, calcularTotal, configGlobal, numeroPedidoReal,
  procesarTransferencia,
  bloqueoPuntosActivo,
  modoKiosco = 'web' 
}) => {

  const isTerminalFisica = ['totem', 'drive-thru', 'mesa'].includes(modoKiosco);

  let textoEfectivo = "💵 Pago en Efectivo";
  if (modoKiosco === 'totem') textoEfectivo = "💵 Pagaré en Caja";
  if (modoKiosco === 'drive-thru') textoEfectivo = "💵 Pagaré en Ventanilla";
  if (modoKiosco === 'mesa') textoEfectivo = "💵 Solicitar Cobro a Mesa";

  const handleEfectivoClick = () => {
    if (tipoConsumo === 'Domicilio' && !isTerminalFisica) {
      setPantallaActual('cambio_efectivo_domicilio');
    } else {
      seleccionarPago('Efectivo', 'Exacto');
    }
  };

  if (pantallaActual === 'pago') {
    return (
      <div className={`mx-auto mt-10 animate-in fade-in ${isTerminalFisica ? 'max-w-4xl' : 'max-w-3xl'}`}>
        <div className="flex justify-start mb-6">
           <button 
               disabled={isSubmitting} 
               onClick={() => setPantallaActual(getBackRuta())} 
               className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition disabled:opacity-50"
           >
               ⬅ Atrás
           </button>
        </div>
        
        <h2 className={`${isTerminalFisica ? 'text-5xl mb-16' : 'text-4xl mb-12'} font-black text-center texto-destacado tracking-tight`}>
           ¿Cómo deseas pagar?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
              disabled={isSubmitting} 
              onClick={handleEfectivoClick} 
              className={`bg-white rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between transition-all active:scale-95 ${isTerminalFisica ? 'p-10' : 'p-8'} ${isSubmitting ? 'opacity-50' : 'hover:bg-emerald-50 hover:border-emerald-200'}`}
          >
              <span className={`${isTerminalFisica ? 'text-4xl' : 'text-3xl'} font-black text-slate-700`}>
                 {isSubmitting ? 'Procesando...' : textoEfectivo}
              </span>
          </button>
          
          <button 
              disabled={isSubmitting} 
              onClick={() => seleccionarPago('Transferencia')} 
              className={`bg-white rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between transition-all active:scale-95 ${isTerminalFisica ? 'p-10' : 'p-8'} ${isSubmitting ? 'opacity-50' : 'hover:bg-purple-50 hover:border-purple-200'}`}
          >
              <span className={`${isTerminalFisica ? 'text-4xl' : 'text-3xl'} font-black text-slate-700`}>
                 {isSubmitting ? 'Procesando...' : '📱 Transferencia'}
              </span>
          </button>

          {esPersonalInterno && (tipoConsumo === 'Local' || tipoConsumo === 'Para llevar') && (
            <button 
                disabled={isSubmitting} 
                onClick={() => seleccionarPago('Por Cobrar')} 
                className={`md:col-span-2 bg-orange-50 rounded-[30px] shadow-md border border-orange-200 flex items-center justify-between transition-all active:scale-95 ${isTerminalFisica ? 'p-10' : 'p-8'} ${isSubmitting ? 'opacity-50' : 'hover:bg-orange-100 hover:border-orange-300'}`}
            >
                <span className={`${isTerminalFisica ? 'text-4xl' : 'text-3xl'} font-black text-orange-700 flex items-center gap-3`}>
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
    const isDomicilio = tipoConsumo === 'Domicilio';
    
    // Formateo del enlace directo a WhatsApp API
    const whatsappClean = (configGlobal.whatsapp || '').replace(/\D/g, '');
    const mensajeWA = `Hola, acabo de hacer el pedido #${numeroPedidoReal} por transferencia. Quedo en espera de confirmación.`;
    const hrefWA = `https://wa.me/52${whatsappClean}?text=${encodeURIComponent(mensajeWA)}`;

    return (
      <div className={`mx-auto mt-4 md:mt-8 bg-white p-5 md:p-8 rounded-[32px] shadow-2xl border border-blue-100 text-center animate-in zoom-in ${isTerminalFisica ? 'max-w-4xl' : 'max-w-3xl'}`}>
        
        {/* 👇 NUEVO BOTÓN DE ATRÁS (Me equivoqué de pago) */}
        <div className="flex justify-start mb-0">
            <button
                disabled={isSubmitting}
                onClick={() => setPantallaActual('pago')}
                className="bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 px-4 py-2 rounded-xl font-bold text-xs md:text-sm border border-slate-200 transition-colors flex items-center gap-2 active:scale-95"
            >
                ⬅ Me equivoqué, cambiar pago
            </button>
        </div>

        {/* Cabecera Compacta */}
        <div className="flex flex-col items-center justify-center mb-4">
            <span className="text-4xl md:text-5xl mb-2 mt-2">🏦</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Datos para tu pago</h2>
        </div>
        
        {/* Alerta Superior Optimizada */}
        {isDomicilio ? (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-5 shadow-sm max-w-2xl mx-auto">
                <p className="text-orange-800 font-bold text-xs md:text-sm leading-snug text-center">
                    ⚠️ <strong className="font-black text-orange-900">IMPORTANTE:</strong> Como tu pedido es a domicilio, espera a que te confirmemos el total exacto (incluyendo el costo de envío) por WhatsApp antes de realizar la transferencia.
                </p>
            </div>
        ) : (
            <p className="text-slate-500 font-medium text-sm mb-5">Transfiere el total exacto y envía tu comprobante por WhatsApp.</p>
        )}
        
        {/* Grid de 2 Columnas (Datos Izquierda, WA Derecha) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 text-left">
          
          {/* Columna Izquierda: Datos Bancarios */}
          <div className="bg-slate-50 p-4 md:p-5 rounded-3xl border border-slate-200 flex flex-col justify-between shadow-inner">
              
              <div className="mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cuenta / CLABE</p>
                  <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                      <p className="font-black text-xl md:text-2xl lg:text-3xl text-blue-600 tracking-wider break-all leading-none">{configGlobal.cuenta}</p>
                      
                      <button onClick={(e) => {
                          e.preventDefault();
                          navigator.clipboard.writeText(configGlobal.cuenta);
                          const originalText = e.currentTarget.innerHTML;
                          e.currentTarget.innerHTML = '✅ Copiado';
                          setTimeout(() => e.currentTarget.innerHTML = originalText, 2000);
                      }} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-bold text-[10px] md:text-xs flex items-center transition active:scale-95 shrink-0 ml-2 shadow-sm" title="Copiar">
                          📋 Copiar
                      </button>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Banco</p>
                      <p className="font-bold text-sm md:text-base text-slate-800 mt-0.5">{configGlobal.banco}</p>
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A nombre de</p>
                      <p className="font-bold text-xs md:text-sm text-slate-800 uppercase mt-0.5 line-clamp-2">{configGlobal.titular}</p>
                  </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-end justify-between">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subtotal Platillos</p>
                      <div className="flex items-center">
                          <p className="font-black text-4xl md:text-5xl text-slate-800 leading-none">
                              ${calcularTotal()}
                          </p>
                          {/* Badge vibrante y notorio para el "+ Envío" */}
                          {isDomicilio && (
                              <span className="text-xs md:text-sm text-white bg-blue-600 px-3 py-1.5 rounded-xl font-black ml-3 uppercase tracking-widest shadow-md">
                                  + Envío
                              </span>
                          )}
                      </div>
                  </div>
              </div>
          </div>
          
          {/* Columna Derecha: Tarjeta de WhatsApp y Botón Final */}
          <div className="flex flex-col gap-3 justify-center">
              <a href={hrefWA} target="_blank" rel="noopener noreferrer" className="bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100 transition-colors p-4 md:p-5 rounded-3xl flex flex-col items-center justify-center text-center shadow-sm relative group cursor-pointer active:scale-95 block">
                  <p className="text-[10px] md:text-xs font-black text-emerald-800 uppercase tracking-widest mb-1 z-10">📲 Tu número de orden es:</p>
                  <p className="text-4xl md:text-5xl font-black text-emerald-600 mb-2 leading-none group-hover:scale-105 transition-transform">#{numeroPedidoReal}</p>
                  
                  <p className="text-xs md:text-sm font-bold text-slate-600 mb-1 z-10">Envía tu comprobante a:</p>
                  
                  {/* Número clickeable directo */}
                  <a href={hrefWA} target="_blank" rel="noopener noreferrer" className="text-lg md:text-xl font-black text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-500 transition-colors mb-4 block z-10">
                      {configGlobal.whatsapp}
                  </a>
                  
                  <div className="w-full bg-emerald-500 text-white px-4 py-3 rounded-xl font-black text-sm flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:bg-emerald-600 transition-colors z-10">
                      Abrir WhatsApp Aquí
                  </div>
              </a>
              
              <button 
                  onClick={procesarTransferencia} 
                  className="w-full bg-slate-900 text-white py-4 md:py-4 rounded-2xl font-black text-lg md:text-xl shadow-md hover:bg-slate-800 transition active:scale-95 border border-transparent hover:border-slate-700"
              >
                  {isDomicilio ? 'Entendido, finalizar orden' : 'Ya envié mi comprobante'}
              </button>
          </div>

        </div>
      </div>
    );
  }

  return null;
};

export default PantallaPago;