import React from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';

const ModalZonaEnvio = ({
  modalZonaEnvio, setModalZonaEnvio, confirmarPedidoDomicilio, configGlobal, isSubmitting
}) => {
  if (!modalZonaEnvio) return null;

  const getTarifasEnvio = () => {
    if (!configGlobal?.tarifas_envio) return [];
    try {
      return typeof configGlobal.tarifas_envio === 'string' ? JSON.parse(configGlobal.tarifas_envio) : configGlobal.tarifas_envio;
    } catch (e) { return []; }
  };

  const tarifas = getTarifasEnvio();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-xl animate-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <MapPin className="text-purple-500" size={32} />
          <h2 className="text-2xl font-black text-slate-800">Asignar Zona de Envío</h2>
        </div>
        
        <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Orden a Domicilio</p>
            <p className="font-bold text-slate-800 text-lg">#{modalZonaEnvio.numero_pedido}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Actual</p>
            <p className="font-black text-2xl text-blue-600">${modalZonaEnvio.total}</p>
          </div>
        </div>

        <p className="text-sm font-bold text-slate-50 mb-4 uppercase tracking-widest">Selecciona la zona correspondiente:</p>
        
        <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-2">
          {tarifas.length === 0 ? (
            <div className="bg-orange-50 text-orange-700 p-4 rounded-xl border border-orange-200 flex items-center gap-3">
              <AlertTriangle size={20} />
              <p className="font-bold text-sm">No hay zonas configuradas. Se enviará a cocina con costo de envío $0.</p>
            </div>
          ) : (
            tarifas.map((tarifa, index) => (
              <button 
                key={index} 
                disabled={isSubmitting}
                onClick={() => confirmarPedidoDomicilio(modalZonaEnvio, tarifa)}
                className="w-full flex justify-between items-center p-4 bg-white border-2 border-slate-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition group disabled:opacity-50"
              >
                <span className="font-black text-slate-700 group-hover:text-purple-800">{tarifa.zona}</span>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-black group-hover:bg-purple-600 group-hover:text-white transition">
                  + ${tarifa.costo}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="flex gap-4">
          <button disabled={isSubmitting} onClick={() => setModalZonaEnvio(null)} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50">Cancelar</button>
          {tarifas.length === 0 && (
             <button disabled={isSubmitting} onClick={() => confirmarPedidoDomicilio(modalZonaEnvio, {zona: 'Sin Zona', costo: 0})} className="flex-[2] py-5 bg-purple-600 text-white font-black text-xl rounded-2xl hover:bg-purple-700 shadow-lg transition disabled:opacity-50">Mandar a Cocina (Envío $0)</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalZonaEnvio;