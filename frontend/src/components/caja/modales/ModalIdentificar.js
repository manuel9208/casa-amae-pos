import React from 'react';

const ModalIdentificar = ({
  modalIdentificar, setModalIdentificar,
  pasoIdentificar, setPasoIdentificar,
  telClienteNuevo, setTelClienteNuevo,
  datosNuevoCliente, setDatosNuevoCliente,
  buscarClienteParaPedido, registrarClienteParaPedido,
  isSubmitting, onGoToKiosco
}) => {
  if (!modalIdentificar) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl w-full max-w-md animate-in zoom-in">
        
        {pasoIdentificar === 'telefono' ? (
            <form onSubmit={buscarClienteParaPedido} className="text-center">
                <span className="text-6xl mb-6 block">👥</span>
                <h2 className="text-3xl font-black text-slate-800 mb-2">Identificar Cliente</h2>
                <p className="text-slate-500 font-medium mb-6">Ingresa el celular del cliente para acumular puntos, o continúa como invitado.</p>
                
                <input 
                    type="tel" maxLength="10" autoFocus disabled={isSubmitting}
                    value={telClienteNuevo} onChange={e => setTelClienteNuevo(e.target.value.replace(/\D/g, ''))} 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 text-center text-3xl font-black outline-none focus:border-blue-500 text-slate-800 mb-6 tracking-widest" 
                    placeholder="000 000 0000" 
                />
                
                <div className="flex gap-4 mb-4">
                    <button type="button" disabled={isSubmitting} onClick={() => setModalIdentificar(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
                    <button type="submit" disabled={telClienteNuevo.length !== 10 || isSubmitting} className="flex-[2] py-4 bg-blue-600 text-white font-black text-lg rounded-2xl hover:bg-blue-700 shadow-lg disabled:opacity-50 transition">Buscar Cliente</button>
                </div>
                
                <button type="button" disabled={isSubmitting} onClick={() => { setModalIdentificar(false); onGoToKiosco(null, null); }} className="w-full py-4 text-blue-600 font-bold hover:bg-blue-50 rounded-2xl transition underline">Omitir y continuar como Invitado</button>
            </form>
        ) : (
            <form onSubmit={registrarClienteParaPedido} className="text-center">
                <span className="text-6xl mb-4 block">✨</span>
                <h2 className="text-2xl font-black text-slate-800 mb-1">¡Nuevo Cliente!</h2>
                <p className="text-slate-500 font-medium mb-6">Regístralo rápido para que gane puntos.</p>
                
                <div className="space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" required disabled={isSubmitting} value={datosNuevoCliente.nombre} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nombre: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500" placeholder="Nombre *" />
                        <input type="text" required disabled={isSubmitting} value={datosNuevoCliente.apellido} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, apellido: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500" placeholder="Apellido *" />
                    </div>
                    <input type="email" disabled={isSubmitting} value={datosNuevoCliente.correo} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, correo: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500" placeholder="Correo (Opcional)" />
                    
                    <textarea disabled={isSubmitting} value={datosNuevoCliente.direccion || ''} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, direccion: e.target.value})} placeholder="Dirección Completa (Opcional)" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500 resize-none h-16"></textarea>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Nacimiento</label>
                            <input type="date" disabled={isSubmitting} value={datosNuevoCliente.fecha_nacimiento} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, fecha_nacimiento: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">NIP (4 dígitos) *</label>
                            <input type="text" maxLength="4" required disabled={isSubmitting} value={datosNuevoCliente.nip} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nip: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-black outline-none focus:border-blue-500 tracking-[0.5em] text-center" placeholder="1234" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-8">
                    <button type="button" disabled={isSubmitting} onClick={() => setPasoIdentificar('telefono')} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Atrás</button>
                    <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-emerald-500 text-white font-black text-lg rounded-2xl hover:bg-emerald-600 shadow-lg disabled:opacity-50 transition">Completar Registro</button>
                </div>
            </form>
        )}

      </div>
    </div>
  );
};

export default ModalIdentificar;