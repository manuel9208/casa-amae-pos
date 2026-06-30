import React from 'react';
import { XCircle } from 'lucide-react';

const CarritoDeOrden = ({
    carrito,
    cambiarCantidadCart,
    quitarDelCarrito,
    subtotal,
    descuento,
    cuponActivo,
    zonaEnvioCosto,
    yaPagado,
    montoOriginal,
    diferencia,
    totalConEnvio,
    isFormIncompleto,
    generarPedidoBD,
    isSubmitting,
    abrirModalCuentaAbierta,
    tipoConsumo,
    descuentoPuntosDinero
}) => {
    return (
        <>
            {/* 1. LISTA DE PLATILLOS AGREGADOS */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 bg-slate-50/50 custom-scrollbar border-t border-slate-200">
                {carrito.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-70">
                        <span className="text-4xl mb-2">🛒</span>
                        <p className="font-bold text-sm">El carrito está vacío</p>
                    </div>
                )}

                {carrito.map(item => (
                    <div key={item.idTicket} className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm relative transition-all hover:shadow-md animate-in slide-in-from-right-4 duration-200">
                        <p className="font-black text-xs md:text-sm leading-tight pr-4">
                            {item.cantidad > 1 && <span className="text-blue-600 mr-1">{item.cantidad}x</span>}
                            {item.nombre}
                        </p>

                        {item.extras && item.extras.length > 0 && (
                            <ul className="text-[9px] md:text-[10px] space-y-0.5 mb-2 md:mb-3 mt-1">
                                {item.extras.map((e, idx) => (
                                    <li key={idx} className="text-slate-500 font-bold leading-tight">{e.nombre}</li>
                                ))}
                            </ul>
                        )}

                        <div className="flex justify-between items-center mt-2 border-t border-slate-50 pt-2 md:pt-3">
                            <p className="font-black text-blue-600 text-sm md:text-base">
                                ${(item.precioFinal * (item.cantidad || 1)).toFixed(2)}
                            </p>
                            
                            <div className="flex bg-slate-50 border border-slate-100 rounded-lg shadow-inner">
                                <button disabled={isSubmitting} onClick={() => cambiarCantidadCart(item.idTicket, -1)} className="px-3 py-1 font-black text-slate-500 hover:text-red-500 transition-colors disabled:opacity-50">-</button>
                                <span className="px-2 py-1 font-black text-xs min-w-[1.5rem] text-center">{item.cantidad || 1}</span>
                                <button disabled={isSubmitting} onClick={() => cambiarCantidadCart(item.idTicket, 1)} className="px-3 py-1 font-black text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-50">+</button>
                            </div>
                        </div>

                        <button disabled={isSubmitting} onClick={() => quitarDelCarrito(item.idTicket)} className="absolute right-2 top-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50">
                            <XCircle size={18} className="md:w-5 md:h-5"/>
                        </button>
                    </div>
                ))}
            </div>

            {/* 2. TOTALES Y MATEMÁTICAS */}
            <div className="p-4 md:p-6 bg-white border-t border-slate-200 shrink-0 space-y-2 md:space-y-3 z-10">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400 font-bold uppercase text-[10px] md:text-xs">Subtotal:</span>
                    <span className="text-base md:text-lg font-black text-slate-600">${subtotal.toFixed(2)}</span>
                </div>

                {descuento > 0 && (
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-emerald-500 font-bold uppercase text-[10px] md:text-xs">Descuento {cuponActivo ? `(${cuponActivo.codigo})` : ''}:</span>
                        <span className="text-base md:text-lg font-black text-emerald-600">-${descuento.toFixed(2)}</span>
                    </div>
                )}

                {/* 👇 FIX APLICADO: Mostrar descuento de Puntos de Fidelidad */}
                {descuentoPuntosDinero > 0 && (
                    <div className="flex justify-between items-center mb-1 animate-in fade-in">
                        <span className="text-indigo-500 font-bold uppercase text-[10px] md:text-xs">Pago con Puntos:</span>
                        <span className="text-base md:text-lg font-black text-indigo-600">-${descuentoPuntosDinero.toFixed(2)}</span>
                    </div>
                )}

                {zonaEnvioCosto !== '' && Number(zonaEnvioCosto) > 0 && (
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-purple-500 font-bold uppercase text-[10px] md:text-xs">Costo de Envío:</span>
                        <span className="text-base md:text-lg font-black text-purple-600">+${Number(zonaEnvioCosto).toFixed(2)}</span>
                    </div>
                )}

                {yaPagado && (
                    <div className="mb-2 md:mb-4 bg-orange-50 border border-orange-200 rounded-xl p-3 md:p-4">
                        <div className="flex justify-between text-[10px] md:text-xs font-bold text-slate-500 mb-1">
                            <span>Pagado Originalmente:</span>
                            <span>${montoOriginal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 md:pt-2 border-t border-orange-200 mt-1 md:mt-2">
                            <span className="font-black text-orange-800 uppercase tracking-widest text-[9px] md:text-[10px]">
                                {diferencia > 0 ? 'Diferencia a Cobrar:' : diferencia < 0 ? 'Saldo a Devolver:' : 'Sin diferencia'}
                            </span>
                            <span className={`font-black text-base md:text-lg ${diferencia > 0 ? 'text-red-600' : diferencia < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                ${Math.abs(diferencia).toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mb-4 md:mb-6">
                    <span className="font-black text-slate-800 uppercase tracking-widest text-xs md:text-sm">
                        {yaPagado ? 'Nuevo Total:' : 'Total a pagar:'}
                    </span>
                    <span className="text-2xl md:text-4xl font-black text-slate-900">
                        ${totalConEnvio.toFixed(2)}
                    </span>
                </div>

                {/* 3. BOTONES DE ACCIÓN PRINCIPALES */}
                <div className="flex gap-3 md:gap-4">
                    {yaPagado ? (
                        <button
                            disabled={isFormIncompleto || isSubmitting}
                            onClick={() => generarPedidoBD('Mandar a Cocina')}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 md:py-4 rounded-xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-lg shadow-blue-500/30 transition active:scale-95 disabled:opacity-50"
                        >
                            Guardar Modificación
                        </button>
                    ) : (
                        <>
                            <button
                                disabled={isFormIncompleto || isSubmitting}
                                onClick={() => {
                                    if (tipoConsumo === 'Domicilio') {
                                        abrirModalCuentaAbierta();
                                    } else {
                                        generarPedidoBD('Mandar a Cocina');
                                    }
                                }}
                                className="flex-1 bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 py-3 md:py-4 rounded-xl font-black text-[10px] md:text-sm uppercase tracking-widest transition active:scale-95 disabled:opacity-50"
                            >
                                Cuenta Abierta
                            </button>
                            
                            <button
                                disabled={isFormIncompleto || isSubmitting}
                                onClick={() => generarPedidoBD('Cobrar Ahora')}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-3 md:py-4 rounded-xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/30 transition active:scale-95 disabled:opacity-50"
                            >
                                Cobrar Ahora
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default CarritoDeOrden;