import { useState, useCallback } from 'react';

// =========================================================================
// CEREBRO DE VALIDACIÓN DE ASISTENCIA (GPS e IP)
// =========================================================================
export const useValidadorAsistencia = (apiUrl) => {
    const [validandoGPS, setValidandoGPS] = useState(false);

    // Fórmula matemática de Haversine para calcular distancia exacta en metros entre 2 coordenadas
    const calcularDistanciaMetros = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Radio de la Tierra en metros
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const validarAcceso = useCallback(async () => {
        setValidandoGPS(true);
        try {
            // 1. Obtener reglas de la base de datos
            const resConfig = await fetch(`${apiUrl}/asistencia/configuracion`);
            if (!resConfig.ok) throw new Error("No se pudo cargar la configuración.");
            const dataConfig = await resConfig.json();
            
            const reglas = dataConfig.general || {};
            const ipsPermitidas = dataConfig.ips || [];
            const ubicacionesPermitidas = dataConfig.ubicaciones || [];

            const modoValidacion = reglas.validacion_activa || 'ninguna';
            const rangoPermitido = reglas.rango_metros || 50;

            // 2. Si el Admin desactivó la seguridad, pasamos directo
            if (modoValidacion === 'ninguna') {
                setValidandoGPS(false);
                return { success: true };
            }

            // 3. Validación de IP (Red Wi-Fi)
            if (modoValidacion === 'ip' || modoValidacion === 'ambas') {
                try {
                    const resIp = await fetch('https://api.ipify.org?format=json');
                    const dataIp = await resIp.json();
                    const ipActual = dataIp.ip;
                    
                    const ipValida = ipsPermitidas.some(ipDb => ipDb.ip === ipActual);
                    if (!ipValida) {
                        setValidandoGPS(false);
                        return { success: false, error: `Tu red actual no está autorizada. Conéctate al Wi-Fi de la sucursal.` };
                    }
                } catch (e) {
                    setValidandoGPS(false);
                    return { success: false, error: 'No se pudo verificar tu dirección de red (IP).' };
                }
            }

            // 4. Validación de GPS (Geocerca)
            if (modoValidacion === 'ubicacion' || modoValidacion === 'ambas') {
                if (ubicacionesPermitidas.length === 0) {
                    setValidandoGPS(false);
                    return { success: false, error: 'El sistema exige GPS pero no hay ubicaciones configuradas por el administrador.' };
                }

                const obtenerPosicionGPS = () => new Promise((resolve, reject) => {
                    if (!navigator.geolocation) reject('Tu dispositivo no soporta GPS.');
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
                });

                try {
                    const pos = await obtenerPosicionGPS();
                    const latActual = pos.coords.latitude;
                    const lonActual = pos.coords.longitude;

                    let dentroDelRango = false;
                    for (let geocerca of ubicacionesPermitidas) {
                        const distancia = calcularDistanciaMetros(latActual, lonActual, geocerca.latitud, geocerca.longitud);
                        if (distancia <= rangoPermitido) {
                            dentroDelRango = true;
                            break;
                        }
                    }

                    if (!dentroDelRango) {
                        setValidandoGPS(false);
                        return { success: false, error: `Estás fuera de la sucursal. Acércate al área permitida (Tolerancia: ${rangoPermitido} metros).` };
                    }
                } catch (e) {
                    setValidandoGPS(false);
                    return { success: false, error: 'GPS denegado o inaccesible. Otorga permisos de ubicación a la página para checar asistencia.' };
                }
            }

            // 5. Pasó todas las barreras de seguridad exitosamente
            setValidandoGPS(false);
            return { success: true };

        } catch (error) {
            setValidandoGPS(false);
            return { success: false, error: 'Error del servidor al validar reglas de asistencia.' };
        }
    }, [apiUrl]);

    return { validarAcceso, validandoGPS };
};