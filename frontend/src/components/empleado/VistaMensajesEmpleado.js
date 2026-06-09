import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, CheckCircle2, Clock } from 'lucide-react';

const VistaMensajesEmpleado = ({ user, apiUrl }) => {
  const [mensajes, setMensajes] = useState([]);

  // 👇 SOLUCIÓN: Envolvemos la función en useCallback
  const cargarMensajes = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/mensajes/empleado/${user.id}`);
      if (res.ok) setMensajes(await res.json());
    } catch(e) {}
  }, [apiUrl, user.id]);

  // 👇 Ahora podemos poner 'cargarMensajes' en el arreglo sin que marque warning
  useEffect(() => { 
    cargarMensajes(); 
  }, [cargarMensajes]);

  const marcarEnterado = async (id) => {
    try {
      const res = await fetch(`${apiUrl}/mensajes/${id}/leer`, { method: 'PUT' });
      if (res.ok) cargarMensajes();
    } catch(e) {}
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><MessageSquare className="text-blue-500"/> Mis Encargos / Avisos</h3>
      
      {mensajes.length === 0 ? (
        <div className="bg-white p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200">
           <MessageSquare size={64} className="mx-auto text-slate-300 mb-4" />
           <p className="text-xl font-black text-slate-500">Bandeja Vacía</p>
           <p className="text-sm font-medium text-slate-400 mt-2">No tienes mensajes ni encargos de la administración.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mensajes.map(msg => (
            <div key={msg.id} className={`p-6 rounded-[32px] border-2 shadow-sm transition-all flex flex-col justify-between ${msg.leido ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-400 shadow-blue-500/20'}`}>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${msg.leido ? 'bg-slate-100 text-slate-500' : 'bg-blue-600 text-white animate-pulse'}`}>
                    {msg.leido ? 'Leído' : 'NUEVO'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{new Date(msg.fecha_envio).toLocaleString()}</span>
                </div>
                <p className="text-lg font-bold text-slate-700 leading-relaxed mb-6">"{msg.mensaje}"</p>
              </div>
              
              {!msg.leido ? (
                <button onClick={() => marcarEnterado(msg.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2">
                  <CheckCircle2 size={20}/> Marcar como Enterado
                </button>
              ) : (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                  <Clock size={16}/> Enterado el {new Date(msg.fecha_lectura).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VistaMensajesEmpleado;