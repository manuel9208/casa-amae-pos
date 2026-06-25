import React from 'react';
import DescuentosCart from './DescuentosCart';

const CarritoLateral = ({
  carrito, pedidoEditandoId, cambiarCantidadCart, editarItem, quitarDelCarrito, isOffline,
  inputCupon, setInputCupon, errorCupon, setErrorCupon, buscandoCupon, validarCupon,
  cuponActivo, setCuponActivo, clienteActivo, descuentoPuntosPuntosFisicos, configGlobal, setModalNip,
  descuentoCuponDinero, descuentoPuntosDinero, calcularSubtotal, calcularTotal, isCerrado, setPantallaActual,
  
  guardarEdicionDirecta, // 👇 Prop nuevo
  isSubmitting           // 👇 Prop nuevo
}) => {
  return (
    <div className="w-full lg:w-1/3 bg-white rounded-3xl md:rounded-[40px] shadow-xl p-4 md:p-8 border flex flex-col h-full relative animate-in slide-in-from-right duration-300">
      {pedidoEditandoId && (<div className="absolute top-0 left-0 right-0 bg-orange-500 text-white text-center py-1 md:py-2 rounded-t-3xl md:rounded-t-[40px] text-[10px] md:text-xs font-black uppercase tracking-widest shadow-md">Editando Orden Activa</div>)}
      <h2 className={`text-xl md:text-2xl font-black mb-4 md:mb-6 border-b pb-3 md:pb-4 text-slate-800 ${pedidoEditandoId ? 'mt-4' : ''}`}>Tu Orden</h2>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {carrito.length === 0 ? (
          <div className="text-center py-10 md:py-20 opacity-20"><span className="text-5xl md:text-6xl block mb-4">🛒</span><p className="font-bold text-sm md:text-base">Tu carrito está vacío</p></div>
        ) : (
          carrito.map((item) => (
            <div key={item.idTicket} className="flex justify-between items-start mb-3 md:mb-4 bg-slate-50 p-3 md:p-4 rounded-2xl border border-slate-100">
              <div className="flex-1 pr-2 text-left">
                <span className="font-black block text-base md:text-lg text-slate-700 leading-tight">
                  {item.cantidad > 1 && <span className="text-blue-600 mr-1 md:mr-2">{item.cantidad}x</span>}
                  {item.nombre}
                </span>
                <ul className="text-[10px] md:text-xs mt-1 space-y-1">
                  {item.extras?.map((e, idx) => (
                    <li key={idx} className={e.nombre.startsWith('Sin ') ? 'text-red-400 line-through font-medium' : e.nombre.startsWith('📝') || e.nombre.startsWith('🔸') ? 'text-slate-600 italic bg-white px-2 py-1 rounded-lg border inline-block mt-1 font-medium' : 'text-blue-500 font-bold'}>{e.nombre}</li>
                  ))}
                </ul>
                <span className="font-black text-blue-600 block mt-2 text-lg md:text-xl">${item.precioFinal * (item.cantidad || 1)}</span>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button onClick={() => cambiarCantidadCart(item.idTicket, -1)} className="px-2 md:px-3 py-1 font-black text-slate-500 hover:bg-slate-100">-</button>
                  <span className="px-2 py-1 font-black text-slate-800 text-xs md:text-sm">{item.cantidad || 1}</span>
                  <button onClick={() => cambiarCantidadCart(item.idTicket, 1)} className="px-2 md:px-3 py-1 font-black text-slate-500 hover:bg-slate-100">+</button>
                </div>
                <div className="flex gap-1 md:gap-2 mt-1">
                  <button onClick={() => editarItem(item)} className="p-1.5 md:p-2 text-blue-500 hover:bg-blue-100 rounded-xl bg-white shadow-sm border border-slate-100 text-sm">✏️</button>
                  <button onClick={() => quitarDelCarrito(item.idTicket)} className="p-1.5 md:p-2 text-red-500 hover:bg-red-100 rounded-xl bg-white shadow-sm border border-slate-100 text-sm">❌</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-3 md:pt-4 border-t mt-auto space-y-3 md:space-y-4">
        {carrito.length > 0 && (
          <DescuentosCart 
            isOffline={isOffline} inputCupon={inputCupon} setInputCupon={setInputCupon}
            errorCupon={errorCupon} setErrorCupon={setErrorCupon} buscandoCupon={buscandoCupon}
            validarCupon={validarCupon} cuponActivo={cuponActivo} setCuponActivo={setCuponActivo}
            clienteActivo={clienteActivo} descuentoPuntosPuntosFisicos={descuentoPuntosPuntosFisicos}
            configGlobal={configGlobal} setModalNip={setModalNip}
          />
        )}

        <div className="space-y-1">
            {(descuentoCuponDinero > 0 || descuentoPuntosDinero > 0) && (
                <div className="flex justify-between items-center text-slate-400 text-xs md:text-sm font-bold mb-1">
                    <span>Subtotal:</span>
                    <span>${calcularSubtotal().toFixed(2)}</span>
                </div>
            )}
            
            {descuentoCuponDinero > 0 && (
                <div className="flex justify-between items-center text-rose-500 font-black text-xs md:text-sm">
                    <span className="uppercase tracking-widest text-[10px] md:text-xs">Cupón ({cuponActivo.codigo}):</span>
                    <span>-${descuentoCuponDinero.toFixed(2)}</span>
                </div>
            )}

            {descuentoPuntosDinero > 0 && (
                <div className="flex justify-between items-center text-blue-500 font-black text-xs md:text-sm">
                    <span className="uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-1">⭐ Puntos ({descuentoPuntosPuntosFisicos}):</span>
                    <span>-${descuentoPuntosDinero.toFixed(2)}</span>
                </div>
            )}
            
            <div className="flex justify-between items-center pt-1 md:pt-2">
               <span className="text-slate-500 font-black uppercase tracking-widest text-sm md:text-base">Total:</span>
               <span className="text-3xl md:text-4xl font-black text-slate-800">${calcularTotal().toFixed(2)}</span>
            </div>
        </div>
        
        {/* 👇 BOTÓN COMPACTADO PARA MÓVILES */}
        <button 
          onClick={() => {
             if (pedidoEditandoId) {
                 guardarEdicionDirecta();
             } else {
                 setPantallaActual('consumo');
             }
          }} 
          disabled={carrito.length === 0 || isCerrado || isSubmitting} 
          className={`w-full text-white py-4 md:py-5 rounded-xl md:rounded-2xl text-lg md:text-xl font-black shadow-lg disabled:shadow-none transition-transform active:scale-95 ${
            isCerrado 
              ? 'bg-red-500 cursor-not-allowed opacity-50' 
              : (carrito.length === 0 ? 'bg-slate-300' : (pedidoEditandoId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'))
          }`}
        >
          {isSubmitting ? 'Guardando...' : isCerrado ? 'Fuera de Horario' : (pedidoEditandoId ? 'Guardar Cambios' : 'Confirmar Orden')}
        </button>
      </div>
    </div>
  );
};

export default CarritoLateral;