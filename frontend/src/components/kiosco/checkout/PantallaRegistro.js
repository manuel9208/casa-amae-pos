import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';

const PantallaRegistro = ({
  pantallaActual, pasoTelefono, setPasoTelefono, tipoConsumo, isSubmitting, telefonoRecoger, setTelefonoRecoger,
  setPantallaActual, seleccionarPago, nombreOrden, setNombreOrden, continuarDesdeNombre,
  direccionEntrega // 👈 RECIBIMOS LA DIRECCIÓN
}) => {
  const [registroInvitadoActivo, setRegistroInvitadoActivo] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState('');
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  
  // 🛡️ MAGIA: El formulario nace con la dirección que el cliente escribió un paso atrás
  const [datosNuevoCliente, setDatosNuevoCliente] = useState({
    nombre: '', apellido: '', nip: '', direccion: direccionEntrega || ''
  });

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  const registrarCliente = async (e) => {
    e.preventDefault();
    if (!datosNuevoCliente.nombre.trim() || !datosNuevoCliente.apellido.trim() || datosNuevoCliente.nip.length !== 4) return setErrorRegistro('Nombre, Apellido y NIP son obligatorios.');
    setIsSubmittingLocal(true);
    try {
        const res = await fetch(`${apiUrl}/clientes/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefono: telefonoRecoger, ...datosNuevoCliente })
        });
        const data = await res.json();
        if (res.ok) {
            setNombreOrden(data.cliente?.nombre || datosNuevoCliente.nombre);
            seleccionarPago('Pendiente', null, tipoConsumo);
        } else {
            setErrorRegistro(data.error || 'Error al registrar.');
        }
    } catch (e) {
        setErrorRegistro('Sin conexión al servidor.');
    }
    setIsSubmittingLocal(false);
  };

  if (pasoTelefono) {
    if (registroInvitadoActivo) {
        return (
            <div className="max-w-md mx-auto mt-10 text-center animate-in slide-in-from-right">
                <span className="text-6xl block mb-6">✨</span>
                <h2 className="text-3xl font-black mb-2 texto-destacado">¡Beneficios Exclusivos!</h2>
                <p className="text-slate-500 font-medium mb-8">Al registrarte, esta orden acumulará puntos.</p>
                <form onSubmit={registrarCliente} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Nombre *" required value={datosNuevoCliente.nombre} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none focus:border-blue-500" disabled={isSubmittingLocal}/>
                        <input type="text" placeholder="Apellido *" required value={datosNuevoCliente.apellido} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, apellido: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none focus:border-blue-500" disabled={isSubmittingLocal}/>
                    </div>
                    
                    <textarea placeholder="Dirección Completa (Opcional)" value={datosNuevoCliente.direccion} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, direccion: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none focus:border-blue-500 resize-none h-16" disabled={isSubmittingLocal}></textarea>

                    <input type="text" placeholder="Crea tu NIP (4 dígitos) *" maxLength="4" required value={datosNuevoCliente.nip} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nip: e.target.value.replace(/\D/g, '')})} className="w-full bg-blue-50 border-2 border-blue-200 text-blue-800 rounded-xl p-4 font-black text-center tracking-[0.5em] outline-none" disabled={isSubmittingLocal}/>
                    {errorRegistro && <p className="text-red-500 text-sm font-bold">{errorRegistro}</p>}
                    <button type="submit" disabled={isSubmittingLocal || datosNuevoCliente.nip.length !== 4} className="w-full bg-emerald-500 text-white py-4 rounded-xl font-black text-lg shadow-md hover:bg-emerald-600 transition active:scale-95 disabled:opacity-50 mt-4">Guardar y Finalizar</button>
                    <button type="button" onClick={() => setRegistroInvitadoActivo(false)} className="w-full mt-2 py-3 text-slate-500 font-bold hover:text-slate-800 transition" disabled={isSubmittingLocal}>Cancelar</button>
                </form>
            </div>
        );
    }

    return (
      <div className="max-w-md mx-auto mt-10 text-center animate-in slide-in-from-bottom-4">
        <div className="flex justify-start mb-6">
            <button disabled={isSubmitting} onClick={() => setPantallaActual('consumo')} className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition disabled:opacity-50">⬅ Atrás</button>
        </div>
        <span className="text-6xl block mb-6">📱</span>
        <h2 className="text-3xl font-black mb-2 texto-destacado">Tu número de celular</h2>
        <p className="text-slate-500 font-medium mb-8 text-lg">Nos comunicaremos a este número para confirmar tu orden y entregártela.</p>
        <input 
            autoFocus type="tel" maxLength="10" placeholder="000 000 0000" 
            value={telefonoRecoger} onChange={e => setTelefonoRecoger(e.target.value.replace(/\D/g, ''))} 
            className="w-full bg-white border-2 border-blue-200 focus:border-blue-500 rounded-[20px] p-6 text-center text-4xl font-black outline-none transition-all shadow-sm tracking-widest text-slate-800 mb-6" 
            disabled={isSubmitting}
        />
        <div className="space-y-3">
            <button 
                disabled={telefonoRecoger.length !== 10 || isSubmitting} 
                onClick={() => seleccionarPago('Pendiente', null, tipoConsumo)} 
                className="w-full bg-blue-600 text-white py-5 rounded-[20px] font-black text-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
            >
                Confirmar Celular
            </button>
            {telefonoRecoger.length === 10 && (
                <button 
                    onClick={() => setRegistroInvitadoActivo(true)} 
                    className="w-full bg-emerald-50 text-emerald-700 py-4 rounded-[20px] font-black text-lg border border-emerald-200 flex items-center justify-center gap-2 hover:bg-emerald-100 transition active:scale-95"
                >
                    <UserPlus size={20}/> Unirme a Puntos y Recompensas
                </button>
            )}
        </div>
      </div>
    );
  }

  if (pantallaActual === 'pedir_nombre') {
    return (
      <div className="max-w-md mx-auto mt-10 text-center animate-in slide-in-from-bottom-4">
        <div className="flex justify-start mb-6">
            <button disabled={isSubmitting} onClick={() => setPantallaActual('consumo')} className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition disabled:opacity-50">⬅ Atrás</button>
        </div>
        <span className="text-6xl block mb-6">👤</span>
        <h2 className="text-4xl font-black mb-4 texto-destacado">¿A nombre de quién?</h2>
        <p className="text-slate-500 font-medium mb-8 text-xl">Te llamaremos por tu nombre cuando tu orden esté lista.</p>
        <input 
            autoFocus type="text" placeholder="Escribe tu nombre..." 
            value={nombreOrden} onChange={e => setNombreOrden(e.target.value)} 
            className="w-full bg-white border-2 border-blue-200 focus:border-blue-500 rounded-[24px] p-6 text-center text-3xl font-black outline-none transition-all shadow-sm text-slate-800 mb-8" 
            disabled={isSubmitting}
        />
        <button 
            disabled={!nombreOrden.trim() || isSubmitting} 
            onClick={continuarDesdeNombre} 
            className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition active:scale-95 disabled:opacity-50"
        >
            Siguiente
        </button>
      </div>
    );
  }

  return null;
};

export default PantallaRegistro;