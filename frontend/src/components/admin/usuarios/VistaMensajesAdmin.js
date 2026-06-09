import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, CheckCheck, Clock, Trash2, Users } from 'lucide-react';  

const VistaMensajesAdmin = ({ usuariosDB, apiUrl, showAlert }) => {
  const [mensajes, setMensajes] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);  

  const empleadosVisibles = usuariosDB.filter(u => u.rol !== 'admin' && u.nombre !== 'Administrador Global').sort((a, b) => a.nombre.localeCompare(b.nombre));  

  // 👇 SOLUCIÓN DEFINITIVA: Envolvemos la función en useCallback
  const cargarMensajes = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/mensajes/admin`);
      if (res.ok) setMensajes(await res.json());
    } catch(e) {}
  }, [apiUrl]);  

  // 👇 Ahora React está feliz porque cargarMensajes está en las dependencias
  useEffect(() => { 
    cargarMensajes(); 
  }, [cargarMensajes]);  

  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!empleadoSeleccionado || !nuevoMensaje.trim()) return;
    setIsSubmitting(true);
    try {
      const userObj = JSON.parse(localStorage.getItem('pos_sesion') || '{}').data || {};
      const res = await fetch(`${apiUrl}/mensajes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: userObj.id, empleado_id: empleadoSeleccionado, mensaje: nuevoMensaje })
      });
      if (res.ok) {
        showAlert("Enviado", "El encargo ha sido enviado y el empleado recibirá una notificación.", "success");
        setNuevoMensaje(''); setEmpleadoSeleccionado(''); cargarMensajes();
      }
    } catch (error) { showAlert("Error", "No se pudo enviar el mensaje.", "error"); }
    setIsSubmitting(false);
  };  

  const eliminarMensaje = async (id) => {
    if(!window.confirm("¿Borrar este mensaje del historial?")) return;
    try {
      const res = await fetch(`${apiUrl}/mensajes/${id}`, { method: 'DELETE' });
      if(res.ok) cargarMensajes();
    } catch(e) {}
  };  

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-slate-900 p-6 md:p-8 rounded-[32px] shadow-xl flex items-center gap-4 text-white print:hidden">
        <div className="bg-blue-500/20 p-4 rounded-2xl border border-blue-500/30 text-blue-400"><MessageSquare size={32}/></div>
        <div>
          <h3 className="text-2xl font-black tracking-tight">Centro de Encargos</h3>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Comunicación Directa y Auditable</p>
        </div>
      </div>  

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <form onSubmit={enviarMensaje} className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200 sticky top-8">
            <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-4"><Send size={18} className="text-blue-500"/> Nuevo Encargo</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Users size={14}/> Destinatario</label>
                <select required value={empleadoSeleccionado} onChange={e=>setEmpleadoSeleccionado(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer">
                  <option value="">Selecciona al empleado...</option>
                  {empleadosVisibles.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre} ({emp.rol})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Instrucción / Mensaje</label>
                <textarea required rows="4" value={nuevoMensaje} onChange={e=>setNuevoMensaje(e.target.value)} placeholder="Ej. Por favor limpiar los refrigeradores antes de salir..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-500 resize-none"></textarea>
              </div>
              <button disabled={isSubmitting || !empleadoSeleccionado || !nuevoMensaje.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                <Send size={18}/> Enviar Notificación
              </button>
            </div>
          </form>
        </div>  

        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
          <h4 className="font-black text-slate-800 mb-6">Historial de Mensajes Enviados</h4>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {mensajes.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <MessageSquare size={48} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-slate-500 font-bold">No has enviado ningún encargo.</p>
              </div>
            ) : mensajes.map(msg => (
              <div key={msg.id} className={`p-5 rounded-2xl border transition-colors ${msg.leido ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-black text-slate-800">{msg.empleado_nombre}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{msg.rol} • Enviado: {new Date(msg.fecha_envio).toLocaleString()}</p>
                  </div>
                  <button onClick={() => eliminarMensaje(msg.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                </div>
                <p className="text-sm font-medium text-slate-600 mb-4 bg-white p-3 rounded-xl border border-slate-100 italic">"{msg.mensaje}"</p>
                <div className="flex justify-end border-t border-slate-200/60 pt-3">
                  {msg.leido ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-100 px-3 py-1.5 rounded-lg">
                      <CheckCheck size={14}/> Leído el {new Date(msg.fecha_lectura).toLocaleString()}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Clock size={14}/> Pendiente de leer
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VistaMensajesAdmin;