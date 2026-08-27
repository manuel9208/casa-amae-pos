import { useState, useEffect } from 'react';

// 🚀 CACHÉ GLOBAL EN MEMORIA (Singleton)
let cacheBuscador = {
  clientes: null,
  historial: null,
  ultimaCarga: 0
};

// 👇 NUEVO: Función para quitar acentos (tildes) y pasar a minúsculas
const normalizarTexto = (texto) => {
  if (!texto) return '';
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const useBuscadorClientes = (terminoBusqueda, apiUrl) => {
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const buscar = async () => {
      // Normalizamos la búsqueda quitando acentos y espacios extra
      const termOriginal = terminoBusqueda?.trim() || '';
      const term = normalizarTexto(termOriginal);

      if (term.length < 2 || !apiUrl) {
        setSugerencias([]);
        setBuscando(false);
        return;
      }

      setBuscando(true);
      try {
        const ahora = Date.now();
        const cacheVencido = (ahora - cacheBuscador.ultimaCarga) > 300000;

        if (!cacheBuscador.clientes || !cacheBuscador.historial || cacheVencido) {
            const [resClientes, resHistorial] = await Promise.all([
                fetch(`${apiUrl}/clientes`),
                fetch(`${apiUrl}/pedidos/historial?periodo=anio`)
            ]);

            if (resClientes.ok) cacheBuscador.clientes = await resClientes.json();
            if (resHistorial.ok) cacheBuscador.historial = await resHistorial.json();
            
            cacheBuscador.ultimaCarga = ahora;
        }

        // Aseguramos que siempre sean arreglos para evitar crashes
        const clientesDB = Array.isArray(cacheBuscador.clientes) ? cacheBuscador.clientes : [];
        const pedidosHistorial = Array.isArray(cacheBuscador.historial) ? cacheBuscador.historial : [];

        const mapSugerencias = new Map();
        
        // 👇 NUEVO: Dividimos la búsqueda en palabras (Ej: "juan per" -> ["juan", "per"])
        const terminos = term.split(/\s+/);

        // ==========================================
        // 2. PROCESAR CLIENTES REGISTRADOS (Tienen Prioridad 🥇)
        // ==========================================
        clientesDB.forEach(c => {
          const nombreCompleto = `${c.nombre || ''} ${c.apellido || ''}`.trim();
          const nomSearch = normalizarTexto(nombreCompleto); // Quitamos acentos de la DB
          const tel = normalizarTexto(c.telefono);

          // 👇 NUEVO: Verifica que TODAS las palabras escritas coincidan (No importa el orden)
          const coincide = terminos.every(t => nomSearch.includes(t) || tel.includes(t));

          if (coincide) {
            const keyUnica = c.telefono || nombreCompleto;
            mapSugerencias.set(keyUnica, {
              cliente_id: c.id,
              cliente_nombre: nombreCompleto,
              cliente_telefono: c.telefono || '',
              direccion_entrega: c.direccion || '',
              puntos: c.puntos || 0,
              tipo: 'registrado'
            });
          }
        });

        // ==========================================
        // 3. PROCESAR HISTORIAL DE INVITADOS (Secundarios 🕒)
        // ==========================================
        pedidosHistorial.forEach(p => {
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
          const nomLower = normalizarTexto(nom); // Quitamos acentos de la DB

          // 👇 NUEVO: Aplica la misma regla robusta de búsqueda por palabras
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
        console.error("Error en useBuscadorClientes:", error);
      }
      setBuscando(false);
    };

    const timer = setTimeout(buscar, 400);
    return () => clearTimeout(timer);

  }, [terminoBusqueda, apiUrl]);

  return { sugerencias, buscando };
};