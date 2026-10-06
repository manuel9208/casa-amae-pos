import { useState, useCallback } from 'react';

export const useMotorIA = (apiUrl) => {
  const [isLoading, setIsLoading] = useState(false);

  // 👇 NUEVO: "proveedor" es opcional (por compatibilidad), para que el usuario
  // pueda elegir qué motor de IA usar (gemini/openai/claude para texto,
  // o gemini/openai para imágenes) desde el Chat o el Studio Mágico.
  const consultarIA = useCallback(async (ruta, prompt, proveedor = null, extraParams = {}) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}${ruta}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, proveedor, ...extraParams })
      });

      const data = await res.json();
      setIsLoading(false);

      if (!res.ok) throw new Error(data.error || 'Hubo un error de conexión con la IA.');
      return data;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, [apiUrl]);

  return { consultarIA, isLoading };
};