import React, { useState, useEffect } from 'react';

// 1. Optimizador Automático de URLs para Cloudinary
const optimizarUrlCloudinary = (url, tipo = 'image') => {
    if (!url) return '';
    const strUrl = String(url).trim();
    
    if (strUrl.includes('cloudinary.com') || strUrl.includes('res.cloudinary.com')) {
        const parts = strUrl.split('/upload/');
        if (parts.length === 2) {
            // WebP automático y reducción de resolución para evitar consumos masivos
            const parametros = tipo === 'video' ? 'q_auto,f_auto,w_1280' : 'q_auto,f_auto,w_800,c_limit';
            return `${parts[0]}/upload/${parametros}/${parts[1]}`;
        }
    }
    
    // Soporte para URLs locales antiguas
    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:4000/api').replace('/api', '');
    if (strUrl.startsWith('http')) return strUrl;
    return `${baseUrl}${strUrl.startsWith('/') ? '' : '/'}${strUrl}`;
};

// 2. Componente React con Interceptor CacheStorage API
const ImagenCachada = ({ src, alt, className, tipo = 'image', onEnded }) => {
    const [fuenteLocal, setFuenteLocal] = useState(null);

    useEffect(() => {
        if (!src) return;
        let isMounted = true;
        const finalUrl = optimizarUrlCloudinary(src, tipo);

        const cargarArchivo = async () => {
            try {
                // Abrimos la bóveda del navegador
                const cache = await caches.open('pos-multimedia-v1');
                const respuestaCache = await cache.match(finalUrl);

                if (respuestaCache) {
                    // SI YA EXISTE: La cargamos del disco duro (Consumo de datos: 0 KB)
                    const blob = await respuestaCache.blob();
                    if (isMounted) setFuenteLocal(URL.createObjectURL(blob));
                } else {
                    // SI NO EXISTE: La descargamos, la guardamos en la bóveda y la mostramos
                    const fetchResponse = await fetch(finalUrl, { mode: 'cors' });
                    if (fetchResponse.ok) {
                        cache.put(finalUrl, fetchResponse.clone());
                        const blob = await fetchResponse.blob();
                        if (isMounted) setFuenteLocal(URL.createObjectURL(blob));
                    } else {
                        if (isMounted) setFuenteLocal(finalUrl); // Fallback de seguridad
                    }
                }
            } catch (error) {
                if (isMounted) setFuenteLocal(finalUrl); // Fallback silencioso si el navegador bloquea caché
            }
        };

        cargarArchivo();
        return () => { isMounted = false; };
    }, [src, tipo]);

    // Mientras carga la foto, mostramos un recuadro gris elegante (Skeleton)
    if (!fuenteLocal) {
        return <div className={`bg-slate-200 animate-pulse ${className}`}></div>;
    }

    if (tipo === 'video') {
        return <video src={fuenteLocal} className={className} autoPlay muted loop={!onEnded} playsInline onEnded={onEnded} />;
    }

    return <img src={fuenteLocal} alt={alt} className={className} />;
};

export default ImagenCachada;