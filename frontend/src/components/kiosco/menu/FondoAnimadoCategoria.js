import React from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import ImagenCachada from '../../ImagenCachada'; // 🆕 Reutilizamos el mismo cacheador de ProductosGrid.js (principio DRY)

const FondoAnimadoCategoria = ({ animacion }) => {
  if (!animacion || !animacion.url_json) return null;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
      {animacion.tipo === 'video' ? (
        <>
          {/* 🆕 Capa 1 (fondo relleno): versión ampliada y difuminada del mismo video,
              ahora servida desde CacheStorage (0 KB en visitas repetidas). Evita huecos
              vacíos cuando la proporción del contenedor no coincide con la del video. */}
          <ImagenCachada
            key={`${animacion.url_json}-bg`}
            src={animacion.url_json}
            tipo="video"
            className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-50 saturate-150"
          />
          {/* Capa 2 (principal, nítida): en móvil usa "contain" para mostrar el video
              completo sin zoom agresivo; en escritorio (md+) usa "cover", igual que antes.
              También pasa por la caché local, por lo que el video solo se descarga
              UNA VEZ de Cloudinary sin importar cuántas veces se entre a la categoría. */}
          <ImagenCachada
            key={animacion.url_json}
            src={animacion.url_json}
            tipo="video"
            posterSrc={animacion.url_preview || null}
            className="absolute inset-0 w-full h-full object-contain md:object-cover opacity-95 brightness-105 saturate-[1.15] contrast-105"
          />
        </>
      ) : (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          <Player
            key={animacion.url_json}
            autoplay
            loop
            src={animacion.url_json}
            rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}

      {/* 🎨 Capa premium 1: tinte de marca casi imperceptible — ya no "empaña" el video */}
      <div
        className="absolute inset-0"
        style={{ background: 'color-mix(in srgb, var(--c-primario, #f97316) 4%, transparent)' }}
      />

      {/* 🎨 Capa premium 2: gradiente de profundidad — solo roza el borde inferior */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/15" />
    </div>
  );
};

export default FondoAnimadoCategoria;