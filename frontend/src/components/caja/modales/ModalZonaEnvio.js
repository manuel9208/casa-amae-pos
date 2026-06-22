import React, { useState, useEffect } from 'react';
import { MapPin, XCircle } from 'lucide-react';

const ModalZonaEnvio = ({ modalZonaEnvio, setModalZonaEnvio, confirmarPedidoDomicilio, configGlobal, isSubmitting }) => {
  const [zonaSeleccionada, setZonaSeleccionada] = useState('');

  useEffect(() => {
    if (modalZonaEnvio) {
      setZonaSeleccionada('');
    }
  }, [modalZonaEnvio]);

  if (!modalZonaEnvio) return null;

  const tarifasEnvio = typeof configGlobal?.tarifas_envio === 'string' ? JSON.parse(configGlobal.tarifas_envio || '[]') : (configGlobal?.tarifas_envio || []);

  const handleConfirmar = () => {
     if (zonaSeleccionada === '') return;
     // Pasamos el costo del envío al hook central para que haga las matemáticas
     confirmarPedidoDomicilio({ ...modalZonaEnvio, costo_envio: Number(zonaSeleccionada) });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in zoom-in duration-200">
      <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-sm text-center relative border-4 border-purple-500">
        <button disabled={isSubmitting} onClick={() => setModalZonaEnvio(null)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition disabled:opacity-50">
          <XCircle size={28}/>
        </button>
        
        <div className="bg-purple-100 text-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
          <MapPin size={40}/>
        </div>
        
        <h2 className="text-2xl font-black text-slate-800 mb-2">Asignar Envío</h2>
        <p className="text-sm font-bold text-slate-500 mb-6">Pedido #{modalZonaEnvio.numero_pedido}</p>
        
        <select 
          value={zonaSeleccionada} 
          onChange={e => setZonaSeleccionada(e.target.value)} 
          disabled={isSubmitting} 
          className="w-full bg-slate-50 border-2 border-purple-200 text-purple-900 font-black rounded-2xl p-4 mb-6 outline-none focus:border-purple-500 cursor-pointer"
        >
          <option value="">-- Selecciona la zona --</option>
          {tarifasEnvio.map((t, i) => (
            <option key={i} value={t.costo}>{t.zona} (+${t.costo})</option>
          ))}
        </select>

        <button 
          disabled={isSubmitting || zonaSeleccionada === ''} 
          onClick={handleConfirmar} 
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-purple-500/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? 'Confirmando...' : 'Aceptar y Mandar'}
        </button>
      </div>
    </div>
  );
};

export default ModalZonaEnvio;