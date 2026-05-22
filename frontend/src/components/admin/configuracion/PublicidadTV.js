import React from 'react';

const PublicidadTV = ({ configGlobal, setConfigGlobal, tvBlob1, setTvBlob1, tvBlob2, setTvBlob2, tvBlob3, setTvBlob3, tvVideoBlob, setTvVideoBlob, isSubmitting, getImageUrl, showAlert }) => {
  
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';

    videoElement.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoElement.src);
      const duracion = videoElement.duration;
      if (duracion > 10.5) { 
        showAlert("Video muy largo", `El video dura ${Math.round(duracion)}s. La regla es un máximo de 10 segundos.`, "warning");
        e.target.value = ''; 
        setTvVideoBlob(null);
      } else {
        setTvVideoBlob(file);
      }
    };
    videoElement.src = URL.createObjectURL(file);
  };

  return (
    <div className="bg-emerald-50/30 p-6 rounded-3xl border border-emerald-100 space-y-6">
      <h3 className="text-xl font-bold text-emerald-800 flex items-center gap-2">📺 4. Publicidad en Pantalla TV</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer bg-white p-4 rounded-2xl border border-emerald-200">
          <input disabled={isSubmitting} type="checkbox" checked={configGlobal.tv_carrusel_activo === true || configGlobal.tv_carrusel_activo === 'true'} onChange={e => setConfigGlobal({...configGlobal, tv_carrusel_activo: e.target.checked})} className="w-6 h-6 accent-emerald-500" /> 
          Activar Carrusel de Imágenes
        </label>
        <div>
          <label className="block text-xs font-black text-emerald-600 uppercase mb-1">Segundos por Imagen</label>
          <input disabled={isSubmitting} type="number" min="3" value={configGlobal.tv_carrusel_segundos || 10} onChange={e => setConfigGlobal({...configGlobal, tv_carrusel_segundos: e.target.value})} className="w-full p-4 bg-white border border-emerald-200 rounded-2xl outline-none font-bold" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-emerald-100">
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
          <span className="text-xs font-black text-emerald-700 mb-2 uppercase">Imagen Promocional 1</span>
          {configGlobal.tv_imagen_1 && <img src={getImageUrl(configGlobal.tv_imagen_1)} className="h-12 object-contain mb-2" alt="promo1" />}
          <input disabled={isSubmitting} id="tv1-upload" type="file" accept="image/*" onChange={e => setTvBlob1(e.target.files[0])} className="w-full text-[10px] text-slate-500 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700" />
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
          <span className="text-xs font-black text-emerald-700 mb-2 uppercase">Imagen Promocional 2</span>
          {configGlobal.tv_imagen_2 && <img src={getImageUrl(configGlobal.tv_imagen_2)} className="h-12 object-contain mb-2" alt="promo2" />}
          <input disabled={isSubmitting} id="tv2-upload" type="file" accept="image/*" onChange={e => setTvBlob2(e.target.files[0])} className="w-full text-[10px] text-slate-500 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700" />
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
          <span className="text-xs font-black text-emerald-700 mb-2 uppercase">Imagen Promocional 3</span>
          {configGlobal.tv_imagen_3 && <img src={getImageUrl(configGlobal.tv_imagen_3)} className="h-12 object-contain mb-2" alt="promo3" />}
          <input disabled={isSubmitting} id="tv3-upload" type="file" accept="image/*" onChange={e => setTvBlob3(e.target.files[0])} className="w-full text-[10px] text-slate-500 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700" />
        </div>
      </div>

      <div className="pt-6 border-t border-emerald-100">
         <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-xl">
            <div className="flex-1">
               <p className="text-emerald-400 font-black uppercase tracking-widest text-xs mb-1">Opcional: Video Promocional</p>
               <p className="text-slate-400 text-sm font-bold">Aparecerá en el carrusel de la TV. Máximo 10 segundos.</p>
            </div>
            <div className="w-full md:w-auto flex flex-col items-center">
               {configGlobal.tv_video && !tvVideoBlob && (
                  <video src={getImageUrl(configGlobal.tv_video)} className="h-20 rounded-lg mb-2 border border-slate-700" muted />
               )}
               <input disabled={isSubmitting} id="tv-video-upload" type="file" accept="video/mp4,video/webm" onChange={handleVideoChange} className="w-full md:w-48 text-[10px] text-slate-400 file:rounded-xl file:border-0 file:bg-slate-800 file:text-white file:px-4 file:py-2" />
            </div>
         </div>
      </div>
    </div>
  );
};

export default PublicidadTV;