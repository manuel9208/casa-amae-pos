import React from 'react';
import { DollarSign, CheckCircle2, XCircle, BellRing, MessageSquare, AlertTriangle, CreditCard, Smartphone } from 'lucide-react';

const ModalesCaja = ({
  fondoCaja, iniciarTurno, inputFondo, setInputFondo,
  modalResolver, setModalResolver, itemAfectadoIdx, setItemAfectadoIdx, accionAlerta, setAccionAlerta, ingredienteReemplazo, setIngredienteReemplazo, enviarRespuestaCocina, catalogoIngredientes,
  modalPago, setModalPago, montoRecibido, setMontoRecibido, procesarPago
}) => {

  const getIconoPago = (metodo) => { 
    if(metodo==='Tarjeta') return <CreditCard size={16}/>; 
    if(metodo==='Transferencia') return <Smartphone size={16}/>; 
    return <DollarSign size={16}/>; 
  };

  return (
    <>
      {/* MODAL FONDO CAJA */}
      {fondoCaja === null && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <form onSubmit={iniciarTurno} className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md text-center animate-in zoom-in">
            <span className="text-6xl mb-6 block">💵</span>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Apertura de Caja</h2>
            <p className="text-slate-500 font-medium mb-8">¿Con cuánta feria (efectivo) inicias tu turno hoy?</p>
            <input 
              type="number" required autoFocus min="0" step="0.5" 
              value={inputFondo} onChange={e => setInputFondo(e.target.value)} 
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-center text-4xl font-black outline-none focus:border-emerald-500 text-slate-800 mb-6" 
              placeholder="$0.00" 
            />
            <button type="submit" disabled={inputFondo===''} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg transition disabled:opacity-50">Comenzar Turno</button>
          </form>
        </div>
      )}

      {/* MODAL RESPONDER A COCINA */}
      {modalResolver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={enviarRespuestaCocina} className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-xl">
            <div className="flex items-center gap-3 mb-6 border-b pb-4"><BellRing className="text-red-500" size={32} /><h2 className="text-2xl font-black text-slate-800">Responder a Cocina</h2></div>
            <div className="bg-red-50 p-4 rounded-2xl mb-6 border border-red-100"><p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Mensaje del Chef:</p><p className="text-lg font-black text-red-700">{modalResolver.alerta_cocina.replace(/\[IDX:\d+\]\s*/g, '')}</p></div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-black text-slate-400 uppercase mb-2">1. Platillo con el problema</label>
                <select required value={itemAfectadoIdx} onChange={(e) => {setItemAfectadoIdx(e.target.value); setIngredienteReemplazo('');}} disabled={modalResolver.alerta_cocina.includes('[IDX:')} className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none text-slate-700 ${modalResolver.alerta_cocina.includes('[IDX:') ? 'opacity-70 cursor-not-allowed' : 'focus:border-blue-500'}`}>
                  <option value="">Selecciona el platillo...</option>
                  {(modalResolver.carrito || []).map((item, idx) => {
                    const extrasStr = (item.extras || []).map(e => e.nombre).join(', ');
                    const nombreLabel = `${item.nombre}${extrasStr ? ` (${extrasStr})` : ''}`;
                    return <option key={idx} value={idx}>{nombreLabel}</option>
                  })}
                </select>
              </div>

              {itemAfectadoIdx !== '' && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in fade-in">
                  <label className="block text-sm font-black text-slate-400 uppercase mb-3">2. ¿Qué decidió el cliente?</label>
                  <div className="flex flex-col gap-3 mb-4">
                    {(() => {
                      const match = modalResolver.alerta_cocina.match(/Propuesta: (.*)/);
                      const propuestaChef = match ? match[1] : null;
                      if (propuestaChef && propuestaChef !== 'Ninguna' && propuestaChef !== 'Solo quitarlo') {
                        return (
                          <label className={`w-full flex items-center gap-3 cursor-pointer p-4 border rounded-xl font-bold transition ${accionAlerta === 'aceptar' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white text-slate-600 hover:border-slate-300'}`}>
                            <input type="radio" name="accion" value="aceptar" checked={accionAlerta === 'aceptar'} onChange={() => setAccionAlerta('aceptar')} className="hidden" /><CheckCircle2 size={20}/> Aceptar Propuesta: {propuestaChef}
                          </label>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className="flex gap-3">
                      <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-4 border rounded-xl font-bold transition ${accionAlerta === 'quitar' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-slate-600 hover:border-slate-300'}`}><input type="radio" name="accion" value="quitar" checked={accionAlerta === 'quitar'} onChange={() => setAccionAlerta('quitar')} className="hidden" /> Quitar Faltante</label>
                      <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-4 border rounded-xl font-bold transition ${accionAlerta === 'cambiar' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-slate-600 hover:border-slate-300'}`}><input type="radio" name="accion" value="cambiar" checked={accionAlerta === 'cambiar'} onChange={() => setAccionAlerta('cambiar')} className="hidden" /> Cambiarlo por...</label>
                    </div>
                  </div>

                  {accionAlerta === 'cambiar' && (
                    <div className="animate-in fade-in zoom-in duration-200 mt-4 pt-4 border-t border-slate-200">
                      <label className="block text-xs font-black text-slate-400 uppercase mb-2">Opciones Base de este Platillo</label>
                      <select required value={ingredienteReemplazo} onChange={(e) => setIngredienteReemplazo(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 text-slate-700 shadow-sm">
                        <option value="">Selecciona reemplazo...</option>
                        {(() => {
                          const itemSeleccionado = modalResolver.carrito[itemAfectadoIdx];
                          if(!itemSeleccionado) return null;
                          const bases = catalogoIngredientes.filter(ing => ing.clasificacion_nombre === itemSeleccionado.categoria && ing.tipo === 'base');
                          return bases.length > 0 ? bases.map(b => <option key={b.id} value={b.nombre}>{b.nombre}</option>) : <option disabled>No hay ingredientes base registrados.</option>;
                        })()}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={() => {setModalResolver(null); setItemAfectadoIdx('');}} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
              <button type="submit" disabled={itemAfectadoIdx === '' || (accionAlerta==='cambiar' && !ingredienteReemplazo)} className="flex-[2] py-5 bg-blue-600 text-white font-black text-xl rounded-2xl hover:bg-blue-700 shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2"><MessageSquare size={24}/> Enviar Respuesta</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL COBRAR PEDIDO */}
      {modalPago && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8 border-b pb-6">
              <h2 className="text-4xl font-black text-slate-800">Orden #{modalPago.numero_pedido}</h2>
              <span className={`text-lg font-bold px-4 py-2 rounded-xl flex items-center gap-2 tracking-wide uppercase ${modalPago.metodo_pago === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                {getIconoPago(modalPago.metodo_pago)} {modalPago.metodo_pago}
              </span>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-3xl mb-8 flex justify-between items-center border border-slate-100">
              <div><p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Total a Cobrar</p><p className="text-5xl font-black text-blue-600">${modalPago.total}</p></div>
              <div className="text-right"><p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p><p className="text-xl font-bold text-slate-700">{modalPago.cliente_nombre || 'Invitado'}</p><p className="text-sm font-bold text-slate-500">{modalPago.tipo_consumo}</p></div>
            </div>

            {modalPago.metodo_pago === 'Pendiente' ? (
              <div className="space-y-6 text-center">
                <p className="font-black text-slate-400 uppercase tracking-widest text-sm mb-4">Selecciona el método de pago final:</p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <button onClick={() => setModalPago({...modalPago, metodo_pago: 'Efectivo'})} className="bg-emerald-50 hover:border-emerald-500 border-2 border-transparent text-emerald-700 p-6 rounded-[24px] font-black flex flex-col items-center gap-2 transition active:scale-95"><DollarSign size={32}/> Efectivo</button>
                    <button onClick={() => setModalPago({...modalPago, metodo_pago: 'Tarjeta'})} className="bg-blue-50 hover:border-blue-500 border-2 border-transparent text-blue-700 p-6 rounded-[24px] font-black flex flex-col items-center gap-2 transition active:scale-95"><CreditCard size={32}/> Tarjeta</button>
                    <button onClick={() => setModalPago({...modalPago, metodo_pago: 'Transferencia'})} className="bg-purple-50 hover:border-purple-500 border-2 border-transparent text-purple-700 p-6 rounded-[24px] font-black flex flex-col items-center gap-2 transition active:scale-95"><Smartphone size={32}/> Transf.</button>
                </div>
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <button onClick={() => setModalPago(null)} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
                    <button onClick={() => procesarPago('Cancelado')} className="flex-1 py-5 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition">Anular Pedido</button>
                </div>
              </div>
            ) : modalPago.metodo_pago === 'Efectivo' ? (
              <div className="space-y-6 animate-in fade-in">
                <div><label className="block text-sm font-black text-slate-400 uppercase mb-3">Monto Recibido</label><input type="number" autoFocus value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl p-6 text-center text-4xl font-black outline-none focus:border-blue-500 text-slate-800" placeholder="$0.00" /></div>
                <div className="grid grid-cols-4 gap-3">
                  <button onClick={() => setMontoRecibido(modalPago.total)} className="bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 font-black py-4 rounded-xl transition text-lg">Exacto</button>
                  <button onClick={() => setMontoRecibido(100)} className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-black py-4 rounded-xl transition text-lg">$100</button>
                  <button onClick={() => setMontoRecibido(200)} className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-black py-4 rounded-xl transition text-lg">$200</button>
                  <button onClick={() => setMontoRecibido(500)} className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-black py-4 rounded-xl transition text-lg">$500</button>
                </div>
                {montoRecibido && Number(montoRecibido) >= Number(modalPago.total) && ( 
                  <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center">
                    <p className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-1">Cambio a devolver</p>
                    <p className="text-5xl font-black text-emerald-500">${(Number(montoRecibido) - Number(modalPago.total)).toFixed(2)}</p>
                  </div> 
                )}
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button onClick={() => setModalPago(null)} className="py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
                  <button onClick={() => procesarPago('Cancelado')} className="py-5 px-6 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition" title="Rechazar y Borrar Pedido"><XCircle size={28}/></button>
                  <button onClick={() => procesarPago()} disabled={!montoRecibido || Number(montoRecibido) < Number(modalPago.total)} className="flex-1 py-5 bg-emerald-500 text-white font-black text-2xl rounded-2xl disabled:opacity-50 hover:bg-emerald-600 shadow-lg transition flex items-center justify-center gap-2"><CheckCircle2 size={28}/> Confirmar Cobro</button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-8 animate-in fade-in">
                <div className="bg-blue-50 border border-blue-200 p-8 rounded-3xl">
                  <AlertTriangle className="mx-auto text-blue-500 mb-4" size={48}/>
                  <h3 className="text-2xl font-black text-blue-900 mb-2">Validación Manual Requerida</h3>
                  <p className="text-blue-700 font-medium">Verifica en la {modalPago.metodo_pago === 'Tarjeta' ? 'Terminal Bancaria' : 'App de tu Banco / WhatsApp'} que el cobro por <strong>${modalPago.total}</strong> haya sido exitoso.</p>
                </div>
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button onClick={() => setModalPago(null)} className="py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
                  <button onClick={() => procesarPago('Cancelado')} className="py-5 px-6 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition" title="Rechazar y Borrar Pedido"><XCircle size={28}/></button>
                  <button onClick={() => procesarPago()} className="flex-1 py-5 bg-blue-600 text-white font-black text-2xl rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition flex items-center justify-center gap-2"><CheckCircle2 size={28}/> Pago Validado</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ModalesCaja;