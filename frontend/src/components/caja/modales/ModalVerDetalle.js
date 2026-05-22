import React from 'react';
import { ShoppingBag, XCircle } from 'lucide-react';

const ModalVerDetalle = ({ modalVerDetalle, setModalVerDetalle }) => {
  if (!modalVerDetalle) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-lg h-[80vh] flex flex-col animate-in zoom-in duration-200">
        
        <div className="flex justify-between items-center border-b pb-5 mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-700 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-inner">
                <ShoppingBag size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800">Detalle de Platillos</h2>
                <p className="text-xs md:text-sm font-bold text-slate-500">Orden #{modalVerDetalle.numero_pedido} - {modalVerDetalle.cliente_nombre || 'Invitado'}</p>
            </div>
          </div>
          <button onClick={() => setModalVerDetalle(null)} className="bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 p-2 md:p-2.5 rounded-full transition">
            <XCircle size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 md:space-y-4">
          {(() => {
            const items = typeof modalVerDetalle.carrito === 'string' ? JSON.parse(modalVerDetalle.carrito) : modalVerDetalle.carrito;
            if (!items || items.length === 0) return <p className="text-center text-slate-400 py-10 font-bold">Este pedido no tiene platillos registrados.</p>;
            
            return items.map((item, idx) => (
                <div key={idx} className="bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start gap-3">
                        <p className="text-sm md:text-base font-black text-slate-800 leading-snug">
                            {item.cantidad || 1}x {item.nombre}
                        </p>
                        <span className="text-[10px] md:text-xs font-black text-blue-600 bg-blue-100 px-2 py-1 md:px-3 rounded-lg shrink-0">
                            ${Number(item.precioFinal || item.precio_base || item.precio || 0).toFixed(2)}
                        </span >
                    </div>
                    
                    {item.extras && item.extras.length > 0 && (
                        <div className="mt-3 pl-3 border-l-2 border-slate-200 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Extras Solicitados:</p>
                            {item.extras.map((extra, eIdx) => (
                                <p key={eIdx} className="text-[10px] md:text-xs font-bold text-slate-600 flex justify-between items-center bg-white p-1.5 rounded-md border border-slate-100">
                                    <span>+ {extra.nombre}</span>
                                    {Number(extra.precioExtra || extra.precio || 0) > 0 && (
                                        <span className="text-emerald-600 font-black">+${Number(extra.precioExtra || extra.precio || 0).toFixed(2)}</span>
                                    )}
                                </p>
                            ))}
                        </div>
                    )}
                    
                    {item.nota && (
                        <div className="mt-3 bg-orange-50 p-2.5 rounded-xl border border-orange-100 text-orange-800 text-[10px] md:text-xs font-medium">
                            <strong>Nota:</strong> {item.nota}
                        </div>
                    )}
                </div>
            ));
          })()}
        </div>

        <div className="border-t pt-4 md:pt-5 mt-4 md:mt-5 flex justify-between items-center shrink-0">
            <p className="text-xs md:text-sm font-bold text-slate-50">Monto Total Cobrado:</p>
            <p className="text-2xl md:text-3xl font-black text-blue-600">${Number(modalVerDetalle.total).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

export default ModalVerDetalle;