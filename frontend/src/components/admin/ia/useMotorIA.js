import { useState, useCallback } from 'react';

export const useMotorIA = (apiUrl) => {
  const [isLoading, setIsLoading] = useState(false);

  const consultarIA = useCallback(async (ruta, prompt) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}${ruta}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
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