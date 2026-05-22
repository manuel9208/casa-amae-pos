import React from 'react';

const MarcaIdentidad = ({ configGlobal, setConfigGlobal, logoBlob, setLogoBlob, isSubmitting, getImageUrl }) => {
  return (
    <div>
      <h3 className="text-xl font-bold mb-4 border-b pb-2 text-slate-700">1. Marca e Identidad</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">Nombre del Negocio</label>
          <input required value={configGlobal.nombre_negocio || ''} onChange={e => setConfigGlobal({...configGlobal, nombre_negocio: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-lg" disabled={isSubmitting}/>
        </div>
        <div className="flex flex-col items-center justify-center bg-slate-50 border border-dashed rounded-2xl p-4 border-slate-300">
          <label className="text-sm font-bold text-slate-600 block mb-2">Logo Principal</label>
          {configGlobal.logo_url && !logoBlob && (<img src={getImageUrl(configGlobal.logo_url)} alt="Logo" className="h-16 object-contain mb-3" />)}
          <input id="logo-upload" type="file" accept="image/png, image/jpeg" onChange={e => setLogoBlob(e.target.files[0])} className="w-full text-xs text-slate-500 file:rounded-xl file:border-0 file:font-bold file:bg-white file:text-slate-700 file:shadow-sm" disabled={isSubmitting}/>
        </div>
      </div>
    </div>
  );
};

export default MarcaIdentidad;