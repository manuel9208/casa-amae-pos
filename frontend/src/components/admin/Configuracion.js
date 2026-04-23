import React from 'react';

const Configuracion = ({
  configGlobal, setConfigGlobal, guardarConfiguracion,
  logoBlob, setLogoBlob,
  setTvBlob1, setTvBlob2, setTvBlob3,
  restablecerBranding, baseUrl
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <h2 className="text-3xl font-black mb-6">Configuración del Restaurante</h2>
      <form onSubmit={guardarConfiguracion} className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border space-y-8">
        
        {/* 1. MARCA */}
        <div>
          <h3 className="text-xl font-bold mb-4 border-b pb-2">1. Marca e Identidad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Nombre del Negocio</label>
              <input required value={configGlobal.nombre_negocio} onChange={e => setConfigGlobal({...configGlobal, nombre_negocio: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-lg" />
            </div>
            <div className="flex flex-col items-center justify-center bg-slate-50 border border-dashed rounded-xl p-4">
              <label className="text-sm font-bold text-slate-600 block mb-2">Logo Principal</label>
              {configGlobal.logo_url && !logoBlob && (<img src={`${baseUrl}${configGlobal.logo_url}`} alt="Logo" className="h-16 object-contain mb-3" />)}
              <input id="logo-upload" type="file" accept="image/png, image/jpeg" onChange={e => setLogoBlob(e.target.files[0])} className="w-full text-xs text-slate-500 file:rounded-xl file:border-0 file:font-bold file:bg-white file:text-slate-700" />
            </div>
          </div>
        </div>

        {/* 2. PAGOS */}
        <div>
          <h3 className="text-xl font-bold mb-4 border-b pb-2">2. Transferencias y Contacto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold text-slate-600 mb-1">WhatsApp Pagos</label><input required type="tel" value={configGlobal.whatsapp} onChange={e => setConfigGlobal({...configGlobal, whatsapp: e.target.value.replace(/\D/g, '')})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold" /></div>
            <div><label className="block text-sm font-bold text-slate-600 mb-1">Banco</label><input required value={configGlobal.banco} onChange={e => setConfigGlobal({...configGlobal, banco: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-600 mb-1">CLABE o Cuenta</label><input required value={configGlobal.cuenta} onChange={e => setConfigGlobal({...configGlobal, cuenta: e.target.value.replace(/\D/g, '')})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-black text-blue-600 tracking-widest text-lg" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-600 mb-1">Titular</label><input required value={configGlobal.titular} onChange={e => setConfigGlobal({...configGlobal, titular: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold" /></div>
          </div>
        </div>

        {/* 3. BRANDING */}
        <div>
          <h3 className="text-xl font-bold mb-4 border-b pb-2 text-blue-600">🎨 3. Branding del Kiosco y TV</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
            <div className="space-y-4">
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Contenido Kiosco</p>
              <input type="text" value={configGlobal.kiosco_mensaje} onChange={e => setConfigGlobal({...configGlobal, kiosco_mensaje: e.target.value})} className="w-full p-3 bg-white border rounded-xl outline-none font-bold" placeholder="Mensaje en Kiosco..." />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Títulos Pantalla TV</p>
              <input type="text" value={configGlobal.tv_msg_cola} onChange={e => setConfigGlobal({...configGlobal, tv_msg_cola: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm font-bold" placeholder="Columna 1" />
              <input type="text" value={configGlobal.tv_msg_progreso} onChange={e => setConfigGlobal({...configGlobal, tv_msg_progreso: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm font-bold" placeholder="Columna 2" />
              <input type="text" value={configGlobal.tv_msg_listo} onChange={e => setConfigGlobal({...configGlobal, tv_msg_listo: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm font-bold" placeholder="Columna 3" />
            </div>
          </div>
        </div>

        {/* 4. PUBLICIDAD TV (ACTUALIZADO CON 3 IMÁGENES) */}
        <div className="bg-emerald-50/30 p-6 rounded-3xl border border-emerald-100 space-y-6">
          <h3 className="text-xl font-bold text-emerald-800 flex items-center gap-2">📺 4. Publicidad en Pantalla TV</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer bg-white p-4 rounded-2xl border border-emerald-200">
              <input type="checkbox" checked={configGlobal.tv_carrusel_activo === true || configGlobal.tv_carrusel_activo === 'true'} onChange={e => setConfigGlobal({...configGlobal, tv_carrusel_activo: e.target.checked})} className="w-6 h-6 accent-emerald-500" /> 
              Activar Carrusel de Imágenes
            </label>
            <div>
              <label className="block text-xs font-black text-emerald-600 uppercase mb-1">Segundos por Imagen</label>
              <input type="number" min="3" value={configGlobal.tv_carrusel_segundos || 10} onChange={e => setConfigGlobal({...configGlobal, tv_carrusel_segundos: e.target.value})} className="w-full p-4 bg-white border border-emerald-200 rounded-2xl outline-none font-bold" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-emerald-100">
            {/* Imagen 1 */}
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
              <span className="text-xs font-black text-emerald-700 mb-2 uppercase">Imagen Promocional 1</span>
              {configGlobal.tv_imagen_1 && <img src={`${baseUrl}${configGlobal.tv_imagen_1}`} className="h-12 object-contain mb-2" alt="promo1" />}
              <input id="tv1-upload" type="file" accept="image/*" onChange={e => setTvBlob1(e.target.files[0])} className="w-full text-[10px] text-slate-500 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700" />
            </div>
            {/* Imagen 2 */}
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
              <span className="text-xs font-black text-emerald-700 mb-2 uppercase">Imagen Promocional 2</span>
              {configGlobal.tv_imagen_2 && <img src={`${baseUrl}${configGlobal.tv_imagen_2}`} className="h-12 object-contain mb-2" alt="promo2" />}
              <input id="tv2-upload" type="file" accept="image/*" onChange={e => setTvBlob2(e.target.files[0])} className="w-full text-[10px] text-slate-500 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700" />
            </div>
            {/* Imagen 3 */}
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
              <span className="text-xs font-black text-emerald-700 mb-2 uppercase">Imagen Promocional 3</span>
              {configGlobal.tv_imagen_3 && <img src={`${baseUrl}${configGlobal.tv_imagen_3}`} className="h-12 object-contain mb-2" alt="promo3" />}
              <input id="tv3-upload" type="file" accept="image/*" onChange={e => setTvBlob3(e.target.files[0])} className="w-full text-[10px] text-slate-500 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700" />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-4">
          <button type="button" onClick={restablecerBranding} className="w-full md:w-auto px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 transition">↺ Restablecer Diseño</button>
          <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black text-lg shadow-lg transition">Guardar Configuración</button>
        </div>
      </form>
    </div>
  );
};

export default Configuracion;