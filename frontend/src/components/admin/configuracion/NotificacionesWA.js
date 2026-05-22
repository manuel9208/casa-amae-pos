import React from 'react';

const NotificacionesWA = ({ configGlobal, setConfigGlobal, isSubmitting }) => {
  return (
    <div className="bg-green-50/30 p-6 rounded-3xl border border-green-200 space-y-6">
      <h3 className="text-xl font-bold text-green-800 flex items-center gap-2">💬 7. Notificaciones de WhatsApp (Oficial)</h3>
      
      <div className="space-y-6">
        <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer bg-white p-4 rounded-2xl border border-green-200 shadow-sm">
          <input disabled={isSubmitting} type="checkbox" checked={configGlobal.wa_api_activa === true || configGlobal.wa_api_activa === 'true'} onChange={e => setConfigGlobal({...configGlobal, wa_api_activa: e.target.checked})} className="w-6 h-6 accent-green-600" /> 
          Activar mensajes automáticos a clientes
        </label>

        {(configGlobal.wa_api_activa === true || configGlobal.wa_api_activa === 'true') && (
          <div className="grid grid-cols-1 gap-4 pt-4 border-t border-green-200 animate-in slide-in-from-top-4">
            <div className="bg-green-100 text-green-800 p-4 rounded-xl text-sm font-medium mb-2 border border-green-300">
              ⚠️ <strong>Aviso:</strong> Necesitas tener una cuenta en Meta for Developers y haber configurado la API de WhatsApp Cloud.
            </div>

            <div>
              <label className="block text-xs font-black text-green-700 uppercase mb-1">WhatsApp Phone Number ID</label>
              <input disabled={isSubmitting} type="text" value={configGlobal.wa_phone_id || ''} onChange={e => setConfigGlobal({...configGlobal, wa_phone_id: e.target.value})} className="w-full p-3 bg-white border border-green-200 rounded-xl outline-none font-medium text-slate-700" placeholder="Ej. 104768392817263" />
              <p className="text-[10px] text-slate-500 mt-1 font-bold">Es el "Identificador de número de teléfono" que te da Facebook.</p>
            </div>

            <div>
              <label className="block text-xs font-black text-green-700 uppercase mb-1">Access Token Permanente</label>
              <input disabled={isSubmitting} type="password" value={configGlobal.wa_api_token || ''} onChange={e => setConfigGlobal({...configGlobal, wa_api_token: e.target.value})} className="w-full p-3 bg-white border border-green-200 rounded-xl outline-none font-medium text-slate-700" placeholder="EAAI..." />
              <p className="text-[10px] text-slate-500 mt-1 font-bold">El token de acceso generado en el panel de Meta. (No uses el de 24 horas).</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificacionesWA;