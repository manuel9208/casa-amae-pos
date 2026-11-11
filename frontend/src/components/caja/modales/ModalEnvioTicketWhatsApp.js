import React from 'react';
import { MessageCircle, Send, BellOff } from 'lucide-react';

const ModalEnvioTicketWhatsApp = ({ pendiente, onElegir, onCancelar }) => {
  if (!pendiente) return null;
  const pedido = pendiente.pedido || {};
  const esDomicilio = pendiente.tipo === 'domicilio';
  const envio = Number(pedido.costo_envio || 0);
  const total = Number(pedido.total || 0) + (esDomicilio ? envio : 0);

  return (
    <div
      className="fixed inset-0 z-[400] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in print:hidden"
      onClick={onCancelar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-6 text-center animate-in slide-in-from-bottom-4"
      >
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner">
          <MessageCircle size={30} />
        </div>
        <h2 className="text-xl font-black text-slate-800">¿Enviar ticket por WhatsApp?</h2>
        <p className="text-sm font-bold text-slate-500 mt-1">
          Orden #{pedido.numero_pedido ?? pendiente.id} · {esDomicilio ? 'Domicilio' : 'Recoger en local'}
        </p>
        <p className="text-xs text-slate-400 font-medium mt-3 leading-relaxed">
          El cliente recibirá la comanda completa con sus extras{esDomicilio ? ' y el cobro de envío' : ''}.
        </p>

        {esDomicilio && (
          <div className="mt-3 inline-flex items-center gap-3 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black px-4 py-2 rounded-xl">
            <span>Envío ${envio.toFixed(2)}</span>
            <span className="opacity-40">|</span>
            <span>Total ${total.toFixed(2)}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => onElegir(true)}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Send size={18} /> Sí, enviar ticket
          </button>
          <button
            onClick={() => onElegir(false)}
            className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl flex items-center justify-center gap-2 transition active:scale-95"
          >
            <BellOff size={18} /> No enviar
          </button>
          <button onClick={onCancelar} className="text-xs font-bold text-slate-400 hover:text-slate-600 py-2">
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEnvioTicketWhatsApp;