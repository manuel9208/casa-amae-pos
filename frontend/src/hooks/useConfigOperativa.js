import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

// ==========================================
// 🍳 HOOK AISLADO: CONFIGURACIÓN OPERATIVA (Flujo Cocina Sí/No)
// 100% independiente de configGlobal / tabla "configuracion".
// Consume únicamente la tabla "configuracion_operativa".
// ==========================================

export const useConfigOperativa = (apiUrlProp) => {
  const apiUrl = apiUrlProp || process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  // Default true: si aún no responde el servidor, el sistema se comporta
  // exactamente igual que hoy (con cocina activa) — cero riesgo de romper nada.
  const [usaCocina, setUsaCocina] = useState(true);
  const [mesaObligatoria, setMesaObligatoria] = useState(false); // 🪑 NUEVA BANDERA
  const [criterioPresencia, setCriterioPresencia] = useState('asistencia'); // 🧑‍🍳 NUEVO
  const [cargandoConfigOperativa, setCargandoConfigOperativa] = useState(true);

  const cargarConfigOperativa = useCallback(async () => {
    try {
        const res = await fetch(`${apiUrl}/configuracion-operativa?t=${Date.now()}`);
        if (res.ok) {
            const data = await res.json();
            const valor = data?.usa_cocina === true || data?.usa_cocina === 'true';
            setUsaCocina(valor);
            const valorMesa = data?.mesa_obligatoria === true || data?.mesa_obligatoria === 'true';
            setMesaObligatoria(valorMesa);
            setCriterioPresencia(data?.criterio_presencia_cocina || 'asistencia'); // 🧑‍🍳 NUEVO
        }
    } catch (error) {
      console.error("Error al cargar configuración operativa:", error);
    } finally {
      setCargandoConfigOperativa(false);
    }
  }, [apiUrl]);

  const actualizarUsaCocina = async (nuevoValor) => {
    try {
      const res = await fetch(`${apiUrl}/configuracion-operativa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usa_cocina: nuevoValor })
      });
      if (res.ok) {
        const data = await res.json();
        const valor = data?.usa_cocina === true || data?.usa_cocina === 'true';
        setUsaCocina(valor);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error al actualizar configuración operativa:", error);
      return false;
    }
  };

    // 🪑 NUEVA BANDERA: Mesa Obligatoria
    const actualizarMesaObligatoria = async (nuevoValor) => {
    try {
        const res = await fetch(`${apiUrl}/configuracion-operativa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesa_obligatoria: nuevoValor })
        });
        if (res.ok) {
        const data = await res.json();
        const valor = data?.mesa_obligatoria === true || data?.mesa_obligatoria === 'true';
        setMesaObligatoria(valor);
        return true;
        }
        return false;
    } catch (error) {
        console.error("Error al actualizar mesa obligatoria:", error);
        return false;
    }
    };

    // 🧑‍🍳 NUEVO: Criterio de Presencia en Cocina
    const actualizarCriterioPresencia = async (nuevoValor) => {
    try {
        const res = await fetch(`${apiUrl}/configuracion-operativa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criterio_presencia_cocina: nuevoValor })
        });
        if (res.ok) {
        const data = await res.json();
        setCriterioPresencia(data?.criterio_presencia_cocina || 'asistencia');
        return true;
        }
        return false;
    } catch (error) {
        console.error("Error al actualizar criterio de presencia:", error);
        return false;
    }
    };

    useEffect(() => {
    cargarConfigOperativa();

    const baseUrl = apiUrl ? apiUrl.replace('/api', '') : 'http://localhost:4000';
    const socket = io(baseUrl, { transports: ['websocket', 'polling'] });

    // Evento propio, sin colisión con 'config_actualizada' ni 'configuracion_actualizada'.
    socket.on('configuracion_operativa_actualizada', () => cargarConfigOperativa());

    return () => {
      socket.disconnect();
    };
  }, [apiUrl, cargarConfigOperativa]);

    return {
    usaCocina,
    mesaObligatoria,
    criterioPresencia,
    cargandoConfigOperativa,
    actualizarUsaCocina,
    actualizarMesaObligatoria,
    actualizarCriterioPresencia,
    recargarConfigOperativa: cargarConfigOperativa
    };
};