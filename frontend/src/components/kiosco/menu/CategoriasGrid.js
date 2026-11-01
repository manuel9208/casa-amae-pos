import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ImagenCachada from '../../ImagenCachada';
import FondoAnimadoCategoria from './FondoAnimadoCategoria';

const CategoriasGrid = ({ configGlobal, categoriasUnicas, getPortadaCategoria, setCategoriaActiva, baseUrl, animacionCategoria = null }) => {
  const [ripples, setRipples] = useState({});

  const lanzarRipple = (e, cat) => {
    const boton = e.currentTarget;
    const rect = boton.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = Date.now();

    setRipples(prev => ({ ...prev, [cat]: [...(prev[cat] || []), { id, x, y, size }] }));

    setTimeout(() => {
      setRipples(prev => ({ ...prev, [cat]: (prev[cat] || []).filter(r => r.id !== id) }));
    }, 600);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in">
      <div className="relative overflow-hidden flex-1 min-h-0 rounded-3xl">
        <FondoAnimadoCategoria animacion={animacionCategoria} />

        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-y-auto pt-4 md:pt-6 pl-2 pr-2 pb-40 lg:pb-6 h-full custom-scrollbar">
        {categoriasUnicas.map(cat => {
          const portada = getPortadaCategoria(cat);
          return (
            <button
              key={cat}
              onClick={(e) => { lanzarRipple(e, cat); setCategoriaActiva(cat); }}
              className={`relative overflow-hidden ${animacionCategoria ? 'bg-white/10 backdrop-blur-[2px] border-white/50 shadow-md' : 'bg-white border-gray-100 shadow-sm'} p-4 md:p-8 rounded-3xl md:rounded-[40px] border flex flex-col items-center justify-center transition-all hover:shadow-xl min-h-[140px] md:min-h-[220px] group`}
            >
              {(ripples[cat] || []).map(r => (
                <span
                  key={r.id}
                  className="absolute rounded-full bg-[color-mix(in_srgb,var(--c-primario,#f97316)_35%,transparent)] pointer-events-none animate-ripple"
                  style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
                />
              ))}

              <motion.div layoutId={`cat-visual-${cat}`} className="mb-3 md:mb-6">
                {portada.imagen_url ? (
                  <ImagenCachada
                    src={portada.imagen_url?.startsWith('http') ? portada.imagen_url : `${baseUrl}${portada.imagen_url}`}
                    alt={cat}
                    className="w-16 h-16 md:w-24 md:h-24 object-cover rounded-full shadow-md group-hover:scale-110 transition-transform"
                  />
                ) : (
                  <span className="text-5xl md:text-7xl block group-hover:scale-110 transition-transform">{portada.emoji}</span>
                )}
              </motion.div>
              <motion.h3 layoutId={`cat-title-${cat}`} className="text-lg md:text-2xl font-black text-slate-700 tracking-tight text-center leading-tight">{cat}</motion.h3>
            </button>
          );
        })}
        </div>
      </div>

      <style>{`
        @keyframes ripple-effect {
          from { transform: scale(0); opacity: 0.6; }
          to { transform: scale(2.5); opacity: 0; }
        }
        .animate-ripple {
          animation: ripple-effect 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CategoriasGrid;