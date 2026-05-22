import React from 'react';
import { Ticket, XCircle, CheckCircle2 } from 'lucide-react';

const DescuentosCart = ({
  isOffline, inputCupon, setInputCupon, errorCupon, setErrorCupon, buscandoCupon, validarCupon,
  cuponActivo, setCuponActivo, clienteActivo, descuentoPuntosPuntosFisicos, configGlobal, setModalNip
}) => {
  return (
    <div className="space-y-3 border-b border-slate-100 pb-4 mb-2">
       
       {/* 1. SECCIÓN CUPÓN */}
       {!cuponActivo ? (
          <form onSubmit={validarCupon} className="flex gap-2 relative">
              <Ticket size={20} className="absolute left-3 top-3 text-slate-400" />
              <input 
                  type="text" 
                  disabled={isOffline}
                  placeholder="Código de cupón" 
                  value={inputCupon}
                  onChange={e => { setInputCupon(e.target.value.toUpperCase()); setErrorCupon(''); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold outline-none focus:border-rose-500 uppercase text-slate-700 disabled:opacity-50"
              />
              <button type="submit" disabled={!inputCupon || buscandoCupon || isOffline} className="bg-rose-500 hover:bg-rose-600 text-white px-4 rounded-xl text-sm font-black disabled:opacity-50 transition active:scale-95 shadow-sm">
                  {buscandoCupon ? '...' : 'Aplicar'}
              </button>
          </form>
       ) : (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex justify-between items-center animate-in zoom-in duration-200">
              <div className="flex items-center gap-2">
                  <div className="bg-rose-500 text-white p-1.5 rounded-lg"><CheckCircle2 size={16}/></div>
                  <div>
                      <p className="text-xs font-black text-rose-800 uppercase tracking-widest">{cuponActivo.codigo}</p>
                      <p className="text-[10px] text-rose-600 font-bold leading-tight">Descuento aplicado</p>
                  </div>
              </div>
              <button onClick={() => setCuponActivo(null)} className="text-rose-400 hover:text-rose-600 p-2"><XCircle size={18}/></button>
          </div>
       )}
       {errorCupon && <p className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded text-center">{errorCupon}</p>}

       {/* 2. SECCIÓN PUNTOS FIDELIDAD */}
       {clienteActivo && clienteActivo.puntos > 0 && descuentoPuntosPuntosFisicos === 0 && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex justify-between items-center animate-in zoom-in">
              <div className="text-xs text-left">
                 <p className="font-black text-blue-900 flex items-center gap-1.5">⭐ {clienteActivo.puntos} Pts. Disponibles</p>
                 <p className="text-blue-600 font-medium">Equivalen a ${(clienteActivo.puntos * (configGlobal.puntos_valor_peso || 1)).toFixed(2)}</p>
              </div>
              
              {(configGlobal.puntos_canje_activo === true || configGlobal.puntos_canje_activo === 'true' || configGlobal.puntos_canje_activo === undefined) ? (
                  <button disabled={isOffline} onClick={() => setModalNip(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black text-xs hover:bg-blue-700 shadow-sm transition active:scale-95 disabled:opacity-50">Canjear</button>
              ) : (
                  <span className="text-[10px] bg-slate-200 text-slate-500 font-bold px-2 py-1 rounded">No canjeable hoy</span>
              )}
          </div>
       )}
    </div>
  );
};

export default DescuentosCart;