import { useState, useEffect } from 'react';

// Función para quitar acentos (tildes) y pasar a minúsculas (sin cambios respecto a la versión anterior)
const normalizarTexto = (texto) => {
  if (!texto) return '';
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const useBuscadorClientes = (terminoBusqueda, apiUrl) => {
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const buscar = async () => {
      const termOriginal = terminoBusqueda?.trim() || '';

      if (termOriginal.length < 2 || !apiUrl) {
        setSugerencias([]);
        setBuscando(false);
        return;
      }

      setBuscando(true);
      try {
        // 🚀 FIX DEFINITIVO: Ya no se descarga toda la tabla de clientes ni 3000 pedidos.
        // La búsqueda ahora ocurre en el servidor (SQL); solo viajan resultados filtrados y ligeros.
        const res = await fetch(`${apiUrl}/clientes/buscar?q=${encodeURIComponent(termOriginal)}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Error en la búsqueda');
        const data = await res.json();

        const registrados = Array.isArray(data.registrados) ? data.registrados : [];
        const invitados = Array.isArray(data.invitados) ? data.invitados : [];

        const mapSugerencias = new Map();
        const terminos = normalizarTexto(termOriginal).split(/\s+/);

        // 1. CLIENTES REGISTRADOS (Prioridad 🥇) — el servidor ya filtró, solo mapeamos
        registrados.forEach(c => {
          const nombreCompleto = `${c.nombre || ''} ${c.apellido || ''}`.trim();
          const keyUnica = c.telefono || nombreCompleto;
          mapSugerencias.set(keyUnica, {
            cliente_id: c.id,
            cliente_nombre: nombreCompleto,
            cliente_telefono: c.telefono || '',
            direccion_entrega: c.direccion || '',
            puntos: c.puntos || 0,
            tipo: 'registrado'
          });
        });

        // 2. HISTORIAL DE INVITADOS (Secundarios 🕒) — MISMA lógica de parseo de siempre
        invitados.forEach(p => {
          let nom = (p.cliente_nombre || '').trim();
          let dir = p.direccion_entrega || '';
          let tel = p.cliente_telefono || '';

          if (nom.toLowerCase() === 'invitado' || nom === '') {
            const match = dir.match(/A NOMBRE DE:\s*([^|]+)/i);
            if (match && match[1]) nom = match[1].trim();
          }

          if (dir.includes('TEL:')) {
            const parts = dir.split('TEL:');
            dir = parts[0].trim();
            const telMatch = parts[1].split('|')[0].trim();
            if (!tel) tel = telMatch;
          } else if (dir.includes('CONTACTO:')) {
            const parts = dir.split('CONTACTO:');
            dir = parts[0].trim();
            const telMatch = parts[1].split('|')[0].trim();
            if (!tel) tel = telMatch;
          }

          dir = dir.replace(/A NOMBRE DE:\s*[^|]+\s*\|?/i, '').replace(/\[.*?\]/g, '').replace(/\|$/, '').trim();
          const telLimpio = String(tel).replace(/\D/g, '');
          const dirEvaluable = normalizarTexto(dir);
          const nomLower = normalizarTexto(nom);

          const coincide = terminos.every(t => nomLower.includes(t) || telLimpio.includes(t));

          if (coincide && nom.toLowerCase() !== 'invitado') {
            if (telLimpio.length >= 10 || (dir.length > 5 && dirEvaluable !== 'pendiente de direccion')) {
              const keyUnica = telLimpio || nomLower;
              if (!mapSugerencias.has(keyUnica)) {
                mapSugerencias.set(keyUnica, {
                  cliente_id: null,
                  cliente_nombre: nom,
                  cliente_telefono: telLimpio,
                  direccion_entrega: dir,
                  puntos: 0,
                  tipo: 'historico'
                });
              }
            }
          }
        });

        const resultadosFinales = Array.from(mapSugerencias.values()).slice(0, 6);
        setSugerencias(resultadosFinales);

      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Error en useBuscadorClientes:", error);
        }
      }
      setBuscando(false);
    };

    const timer = setTimeout(buscar, 400);
    return () => { clearTimeout(timer); controller.abort(); };

  }, [terminoBusqueda, apiUrl]);

  return { sugerencias, buscando };
};