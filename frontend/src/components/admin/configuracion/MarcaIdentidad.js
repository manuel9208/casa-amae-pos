import React from 'react';

const MarcaIdentidad = ({ configGlobal, setConfigGlobal, logoBlob, setLogoBlob, isSubmitting, getImageUrl }) => {
  return (
    <div>
      <h3 className="text-xl font-bold mb-4 border-b pb-2 text-slate-700">1. Marca, Identidad y Horario</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Columna Izquierda: Nombre y Horarios */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">Nombre del Negocio</label>
            <input required value={configGlobal.nombre_negocio || ''} onChange={e => setConfigGlobal({...configGlobal, nombre_negocio: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-lg" disabled={isSubmitting}/>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
             <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Hora de Apertura</label>
                <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 ring-blue-500">
                    <input type="number" min="0" max="23" value={configGlobal.hora_apertura !== undefined ? configGlobal.hora_apertura : 17} onChange={e => setConfigGlobal({...configGlobal, hora_apertura: e.target.value})} className="w-full p-3 bg-transparent outline-none font-black text-center text-lg text-slate-700" disabled={isSubmitting}/>
                    <span className="flex items-center px-3 bg-slate-100 text-slate-400 font-bold text-sm">HRS</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-bold">Formato 24h (Ej: 17 para 5:00 PM)</p>
             </div>
             <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Hora de Cierre</label>
                <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 ring-blue-500">
                    <input type="number" min="0" max="24" value={configGlobal.hora_cierre !== undefined ? configGlobal.hora_cierre : 23} onChange={e => setConfigGlobal({...configGlobal, hora_cierre: e.target.value})} className="w-full p-3 bg-transparent outline-none font-black text-center text-lg text-slate-700" disabled={isSubmitting}/>
                    <span className="flex items-center px-3 bg-slate-100 text-slate-400 font-bold text-sm">HRS</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-bold">Formato 24h (Ej: 23 para 11:00 PM)</p>
             </div>
          </div>
        </div>

        {/* Columna Derecha: Logo */}
        <div className="flex flex-col items-center justify-center bg-slate-50 border border-dashed rounded-2xl p-6 border-slate-300 h-full">
          <label className="text-sm font-bold text-slate-600 block mb-4">Logo Principal</label>
          {configGlobal.logo_url && !logoBlob && (<img src={getImageUrl(configGlobal.logo_url)} alt="Logo" className="h-20 object-contain mb-4 drop-shadow-sm" />)}
          <input id="logo-upload" type="file" accept="image/png, image/jpeg" onChange={e => setLogoBlob(e.target.files[0])} className="w-full text-xs text-slate-500 file:rounded-xl file:border-0 file:font-bold file:px-4 file:py-2 file:bg-white file:text-blue-600 file:shadow-sm hover:file:bg-blue-50 transition cursor-pointer" disabled={isSubmitting}/>
        </div>

      </div>
    </div>
  );
};

export default MarcaIdentidad;