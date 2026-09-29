import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, Download, Wand2 } from 'lucide-react';
import { useMotorIA } from './useMotorIA';

const GeneradorImagenes = ({ apiUrl, showAlert }) => {
  const { consultarIA, isLoading } = useMotorIA(apiUrl);
  const [prompt, setPrompt] = useState('');
  const [imagenUrl, setImagenUrl] = useState(null);

  const generarImagen = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    try {
      const data = await consultarIA('/ia/imagen', prompt);
      setImagenUrl(data.url);
    } catch (error) {
      showAlert('Error en Generación', error.message, 'error');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 p-4 md:p-6 bg-slate-50">
      
      {/* PANEL IZQUIERDO: Controles */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mb-4">
            <ImageIcon size={24} />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">Studio Mágico</h3>
          <p className="text-sm text-slate-500 mb-6">
            Describe el platillo o escenario que deseas crear. La IA generará una fotografía comercial de alta calidad.
          </p>

          <form onSubmit={generarImagen} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">¿Qué imaginamos hoy?</label>
              <textarea
                rows="4"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej. Una hamburguesa doble con queso derretido en una mesa de madera oscura con iluminación de estudio fotográfico..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none resize-none transition-all"
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-pink-500/30 active:scale-95"
            >
              {isLoading ? (
                <><Sparkles size={18} className="animate-spin" /> Creando magia...</>
              ) : (
                <><Wand2 size={18} /> Generar Fotografía</>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 font-medium">Límite de uso justo: 1 imagen por día.</p>
          </form>
        </div>
      </div>

      {/* PANEL DERECHO: Visualizador */}
      <div className="w-full md:w-2/3 bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-6 relative overflow-hidden min-h-[300px]">
        {isLoading ? (
          <div className="flex flex-col items-center text-center animate-pulse">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-pink-400 font-bold">Pintando los píxeles...</p>
            <p className="text-slate-500 text-sm mt-2 max-w-xs">Esto puede tomar entre 10 y 20 segundos dependiendo de los detalles.</p>
          </div>
        ) : imagenUrl ? (
          <div className="relative group w-full h-full flex items-center justify-center">
            <img 
              src={imagenUrl} 
              alt="Generada por IA" 
              className="max-h-full max-w-full rounded-xl object-contain shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <a 
              href={imagenUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-3 rounded-full transition-all border border-white/20"
              title="Abrir imagen original"
            >
              <Download size={20} />
            </a>
          </div>
        ) : (
          <div className="text-center text-slate-600">
            <ImageIcon size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-bold">Tu lienzo está en blanco</p>
            <p className="text-sm mt-1">Genera una imagen para verla aquí.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneradorImagenes;