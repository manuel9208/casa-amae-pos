import { useState, useEffect } from 'react';

const useMesaQR = () => {
  const [mesaQR, setMesaQR] = useState(null);

  useEffect(() => {
    // Leemos la URL buscando el parámetro "?mesa="
    const params = new URLSearchParams(window.location.search);
    const mesa = params.get('mesa');
    
    if (mesa) {
      setMesaQR(mesa);
    }
  }, []);

  return mesaQR;
};

export default useMesaQR;