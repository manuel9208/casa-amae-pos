import React from 'react';

const BrandingGlobal = ({ configGlobal, setConfigGlobal, isSubmitting }) => {
  return (
    <div>
      <h3 className="text-xl font-bold mb-4 border-b pb-2 text-blue-600">🎨 3. Branding del Kiosco y TV</h3>
      <div className="space-y-6 bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
        
        {/* TEXTOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Contenido Kiosco</p>
            <input disabled={isSubmitting} type="text" value={configGlobal.kiosco_mensaje || ''} onChange={e => setConfigGlobal({...configGlobal, kiosco_mensaje: e.target.value})} className="w-full p-3 bg-white border rounded-xl outline-none font-bold" placeholder="Mensaje en Kiosco..." />
            
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest mt-4">Mensaje de Negocio Cerrado</p>
            <textarea disabled={isSubmitting} value={configGlobal.mensaje_cierre || ''} onChange={e => setConfigGlobal({...configGlobal, mensaje_cierre: e.target.value})} className="w-full p-3 bg-white border rounded-xl outline-none font-medium h-24 resize-none" placeholder="Ej. Abierto de 8:00 AM a 10:00 PM..." />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Títulos Pantalla TV</p>
            <input disabled={isSubmitting} type="text" value={configGlobal.tv_msg_cola || ''} onChange={e => setConfigGlobal({...configGlobal, tv_msg_cola: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm font-bold" placeholder="Columna 1" />
            <input disabled={isSubmitting} type="text" value={configGlobal.tv_msg_progreso || ''} onChange={e => setConfigGlobal({...configGlobal, tv_msg_progreso: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm font-bold" placeholder="Columna 2" />
            <input disabled={isSubmitting} type="text" value={configGlobal.tv_msg_listo || ''} onChange={e => setConfigGlobal({...configGlobal, tv_msg_listo: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm font-bold" placeholder="Columna 3" />
          </div>
        </div>

        <div className="border-t border-blue-100 pt-4"></div>

        {/* COLORES Y FUENTES */}
        <div>
          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Colores y Tipografía</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Color Primario</label>
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
                <input disabled={isSubmitting} type="color" value={configGlobal.color_primario || '#2563eb'} onChange={e => setConfigGlobal({...configGlobal, color_primario: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0" />
                <span className="text-xs font-bold text-slate-500 uppercase">{configGlobal.color_primario}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Color Fondo</label>
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
                <input disabled={isSubmitting} type="color" value={configGlobal.color_fondo || '#f1f5f9'} onChange={e => setConfigGlobal({...configGlobal, color_fondo: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0" />
                <span className="text-xs font-bold text-slate-500 uppercase">{configGlobal.color_fondo}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Texto Principal</label>
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
                <input disabled={isSubmitting} type="color" value={configGlobal.color_texto_principal || '#1e293b'} onChange={e => setConfigGlobal({...configGlobal, color_texto_principal: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0" />
                <span className="text-xs font-bold text-slate-500 uppercase">{configGlobal.color_texto_principal}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Texto Secundario</label>
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
                <input disabled={isSubmitting} type="color" value={configGlobal.color_texto_secundario || '#64748b'} onChange={e => setConfigGlobal({...configGlobal, color_texto_secundario: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0" />
                <span className="text-xs font-bold text-slate-500 uppercase">{configGlobal.color_texto_secundario}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Fuente para Títulos</label>
              <select disabled={isSubmitting} value={configGlobal.fuente_titulos || 'system-ui, sans-serif'} onChange={e => setConfigGlobal({...configGlobal, fuente_titulos: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-700 shadow-sm">
                <option value="system-ui, sans-serif">Predeterminada (System)</option>
                <option value="'Arial', sans-serif">Arial</option>
                <option value="'Verdana', sans-serif">Verdana</option>
                <option value="'Tahoma', sans-serif">Tahoma</option>
                <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                <option value="'Georgia', serif">Georgia</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="'Courier New', monospace">Courier New</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Fuente para Textos</label>
              <select disabled={isSubmitting} value={configGlobal.fuente_textos || 'system-ui, sans-serif'} onChange={e => setConfigGlobal({...configGlobal, fuente_textos: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-700 shadow-sm">
                <option value="system-ui, sans-serif">Predeterminada (System)</option>
                <option value="'Arial', sans-serif">Arial</option>
                <option value="'Verdana', sans-serif">Verdana</option>
                <option value="'Tahoma', sans-serif">Tahoma</option>
                <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                <option value="'Georgia', serif">Georgia</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="'Courier New', monospace">Courier New</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingGlobal;