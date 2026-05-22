import React from 'react';

const TicketImpresion = ({ configGlobal, setConfigGlobal, isSubmitting }) => {
  return (
    <div className="bg-orange-50/30 p-6 rounded-3xl border border-orange-100 space-y-6">
      <h3 className="text-xl font-bold text-orange-800 flex items-center gap-2">🧾 5. Configuración de Ticket</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer bg-white p-4 rounded-2xl border border-orange-200">
          <input disabled={isSubmitting} type="checkbox" checked={configGlobal.ticket_impresion_activa === true || configGlobal.ticket_impresion_activa === 'true'} onChange={e => setConfigGlobal({...configGlobal, ticket_impresion_activa: e.target.checked})} className="w-6 h-6 accent-orange-500" /> 
          Activar Impresión de Tickets
        </label>

        {configGlobal.ticket_impresion_activa && (
          <div>
            <label className="block text-xs font-black text-orange-600 uppercase mb-1">Modo de Impresión</label>
            <select disabled={isSubmitting} value={configGlobal.ticket_modo_impresion || 'pdf'} onChange={e => setConfigGlobal({...configGlobal, ticket_modo_impresion: e.target.value})} className="w-full p-4 bg-white border border-orange-200 rounded-2xl outline-none font-bold text-slate-700">
              <option value="pdf">Guardar como PDF (Pruebas/Manual)</option>
              <option value="impresora">Impresora Térmica Directa</option>
            </select>
          </div>
        )}
      </div>

      {configGlobal.ticket_impresion_activa && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-orange-100">
          <div>
            <label className="block text-xs font-black text-orange-600 uppercase mb-1">Domicilio del Local</label>
            <textarea disabled={isSubmitting} value={configGlobal.ticket_domicilio || ''} onChange={e => setConfigGlobal({...configGlobal, ticket_domicilio: e.target.value})} className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none font-medium resize-none h-32" placeholder="Ej. Av. Principal #123, Col. Centro" />
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-orange-600 uppercase mb-1">Mensaje de Despedida</label>
              <input disabled={isSubmitting} type="text" value={configGlobal.ticket_mensaje_final || ''} onChange={e => setConfigGlobal({...configGlobal, ticket_mensaje_final: e.target.value})} className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none font-medium" placeholder="Ej. ¡Gracias por su compra!" />
            </div>
            <div>
              <label className="block text-xs font-black text-orange-600 uppercase mb-1">Firma del Sistema (Opcional)</label>
              <input disabled={isSubmitting} type="text" value={configGlobal.ticket_firma_sistema !== undefined ? configGlobal.ticket_firma_sistema : 'Powered by MiSistemaPOS'} onChange={e => setConfigGlobal({...configGlobal, ticket_firma_sistema: e.target.value})} className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none font-medium text-slate-500" placeholder="Ej. Desarrollado por..." />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketImpresion;