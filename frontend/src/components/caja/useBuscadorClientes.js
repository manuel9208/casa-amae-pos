import { useState, useEffect } from 'react';

/**
 * Hook Inteligente para buscar clientes.
 * Fusiona la tabla de clientes (Registrados) con el historial de pedidos (Invitados).
 * Permite buscar tanto por nombre como por teléfono.
 */
export const useBuscadorClientes = (terminoBusqueda, apiUrl) => {
    const [sugerencias, setSugerencias] = useState([]);
    const [buscando, setBuscando] = useState(false);

    useEffect(() => {
        const buscar = async () => {
            const term = terminoBusqueda?.trim().toLowerCase() || '';
            
            // Solo buscamos si el cajero ha tecleado al menos 2 caracteres
            if (term.length < 2 || !apiUrl) {
                setSugerencias([]);
                setBuscando(false);
                return;
            }

            setBuscando(true);
            try {
                // 1. Petición concurrente: Buscamos en ambas bases de datos al mismo tiempo
                const [resClientes, resHistorial] = await Promise.all([
                    fetch(`${apiUrl}/clientes`),
                    fetch(`${apiUrl}/pedidos/historial?periodo=anio`)
                ]);

                let clientesDB = [];
                let pedidosHistorial = [];

                if (resClientes.ok) clientesDB = await resClientes.json();
                if (resHistorial.ok) pedidosHistorial = await resHistorial.json();

                // Usamos un Map para evitar duplicados. La llave será el teléfono (o el nombre si no hay teléfono)
                const mapSugerencias = new Map();

                // ==========================================
                // 2. PROCESAR CLIENTES REGISTRADOS (Tienen Prioridad 🥇)
                // ==========================================
                clientesDB.forEach(c => {
                    // 👇 FIX: Unimos la columna nombre y apellido para que salgan completos
                    const nombreCompleto = `${c.nombre || ''} ${c.apellido || ''}`.trim();
                    const nomSearch = nombreCompleto.toLowerCase();
                    const tel = (c.telefono || '').toLowerCase();
                    
                    // Si el término coincide con el nombre completo o el teléfono
                    if (nomSearch.includes(term) || tel.includes(term)) {
                        const keyUnica = tel || nomSearch;
                        mapSugerencias.set(keyUnica, {
                            cliente_id: c.id,
                            cliente_nombre: nombreCompleto, // Guardamos Juan Jacobo completo
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

                    // Rescate quirúrgico de datos si se guardaron en la dirección
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

                    // Limpieza visual
                    dir = dir.replace(/A NOMBRE DE:\s*[^|]+\s*\|?/i, '').replace(/\[.*?\]/g, '').replace(/\|$/, '').trim();  
                    const telLimpio = tel.replace(/\D/g, '');
                    const dirEvaluable = dir.toLowerCase();  
                    const nomLower = nom.toLowerCase();
                    
                    // Validar si coincide con la búsqueda
                    if ((nomLower.includes(term) || telLimpio.includes(term)) && nomLower !== 'invitado') {
                        // Solo sugerir si aporta valor (tiene buen teléfono o una dirección real)
                        if (telLimpio.length >= 10 || (dir.length > 5 && dirEvaluable !== 'pendiente de dirección')) {
                            const keyUnica = telLimpio || nomLower;
                            
                            // Si NO existe en el mapa (evita sobreescribir a un cliente Registrado)
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

                // 4. Convertimos el mapa a Arreglo y tomamos solo los primeros 6
                const resultadosFinales = Array.from(mapSugerencias.values()).slice(0, 6);
                setSugerencias(resultadosFinales);

            } catch (error) {
                console.error("Error en useBuscadorClientes:", error);
            }
            
            setBuscando(false);
        };

        // Anti-rebote (Debounce) de 400ms
        const timer = setTimeout(buscar, 400); 
        return () => clearTimeout(timer);
        
    }, [terminoBusqueda, apiUrl]);

    return { sugerencias, buscando };
};