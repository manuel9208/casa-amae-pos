import React from 'react';

const TicketImpresion = ({ configGlobal = {}, setConfigGlobal, isSubmitting }) => {
  // 🛡️ Escudo protector: Si la data no llega a tiempo, no crashea, espera en silencio.
  if (!configGlobal || Object.keys(configGlobal).length === 0 || !setConfigGlobal) {
    return null; 
  }

  return (
    <div className="bg-orange-50/30 p-6 rounded-3xl border border-orange-100 space-y-6">
      <h3 className="text-xl font-bold text-orange-800 flex items-center gap-2">🧾 5. Configuración de Ticket</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer bg-white p-4 rounded-2xl border border-orange-200 hover:shadow-md transition-shadow">
          <input 
            disabled={isSubmitting} 
            type="checkbox" 
            checked={configGlobal.ticket_impresion_activa === true || configGlobal.ticket_impresion_activa === 'true'} 
            onChange={e => setConfigGlobal({...configGlobal, ticket_impresion_activa: e.target.checked})} 
            className="w-6 h-6 accent-orange-500" 
          />
          Activar Impresión de Tickets
        </label>  

        {configGlobal.ticket_impresion_activa && (
          <div className="animate-in fade-in">
            <label className="block text-xs font-black text-orange-600 uppercase mb-1">Modo de Impresión</label>
            <select 
              disabled={isSubmitting} 
              value={configGlobal.ticket_modo_impresion || 'pdf'} 
              onChange={e => setConfigGlobal({...configGlobal, ticket_modo_impresion: e.target.value})} 
              className="w-full p-4 bg-white border border-orange-200 rounded-2xl outline-none font-bold text-slate-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all"
            >
              <option value="pdf">Guardar como PDF / Pantalla (Manual)</option>
              <option value="impresora">Impresora Térmica Directa en Red (IP)</option>
            </select>
          </div>
        )}
      </div>  

      {/* 👇 NUEVO: Módulo de Red (Solo visible si es impresora térmica) */}
      {configGlobal.ticket_impresion_activa && configGlobal.ticket_modo_impresion === 'impresora' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-orange-100 animate-in fade-in zoom-in-95 duration-200">
          <div>
            <label className="block text-xs font-black text-orange-600 uppercase mb-1">Dirección IP de Impresora</label>
            <input 
              disabled={isSubmitting} 
              type="text" 
              value={configGlobal.ticket_impresora_ip || ''} 
              onChange={e => setConfigGlobal({...configGlobal, ticket_impresora_ip: e.target.value})} 
              className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none font-medium text-slate-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all" 
              placeholder="Ej. 192.168.1.100" 
            />
          </div>
          <div>
            <label className="block text-xs font-black text-orange-600 uppercase mb-1">Puerto (Por defecto: 9100)</label>
            <input 
              disabled={isSubmitting} 
              type="text" 
              value={configGlobal.ticket_impresora_puerto || '9100'} 
              onChange={e => setConfigGlobal({...configGlobal, ticket_impresora_puerto: e.target.value.replace(/\D/g, '')})} 
              className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none font-medium text-slate-700 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all" 
              placeholder="Ej. 9100" 
            />
          </div>
        </div>
      )}

      {configGlobal.ticket_impresion_activa && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-orange-100 animate-in slide-in-from-top-4">
          <div>
            <label className="block text-xs font-black text-orange-600 uppercase mb-1">Domicilio del Local</label>
            <textarea 
              disabled={isSubmitting} 
              value={configGlobal.ticket_domicilio || ''} 
              onChange={e => setConfigGlobal({...configGlobal, ticket_domicilio: e.target.value})} 
              className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none font-medium resize-none h-32 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all" 
              placeholder="Ej. Av. Principal #123, Col. Centro" 
            />
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-orange-600 uppercase mb-1">Mensaje de Despedida</label>
              <input 
                disabled={isSubmitting} 
                type="text" 
                value={configGlobal.ticket_mensaje_final || ''} 
                onChange={e => setConfigGlobal({...configGlobal, ticket_mensaje_final: e.target.value})} 
                className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none font-medium focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all" 
                placeholder="Ej. ¡Gracias por su compra!" 
              />
            </div>
            <div>
              <label className="block text-xs font-black text-orange-600 uppercase mb-1">Firma del Sistema (Opcional)</label>
              <input 
                disabled={isSubmitting} 
                type="text" 
                value={configGlobal.ticket_firma_sistema !== undefined ? configGlobal.ticket_firma_sistema : 'Powered by MiSistemaPOS'} 
                onChange={e => setConfigGlobal({...configGlobal, ticket_firma_sistema: e.target.value})} 
                className="w-full p-3 bg-slate-50 border border-orange-200 rounded-xl outline-none font-medium text-slate-500 focus:border-orange-400 transition-all" 
                placeholder="Ej. Desarrollado por..." 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};  

export default TicketImpresion;