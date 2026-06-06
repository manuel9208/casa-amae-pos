import React, { useEffect } from 'react';

const PantallaDomicilio = ({
  pantallaActual, setPantallaActual, configGlobal, direccionEntrega, setDireccionEntrega,
  direccionesGuardadas, continuarAPagoDesdeDireccion, clienteActivo
}) => {

  // 🛡️ MAGIA DE AUTO-COMPLETADO: Buscar dirección en la nube o en caché local
  useEffect(() => {
    if (pantallaActual === 'direccion' && (!direccionEntrega || direccionEntrega.trim() === '')) {
      let dirNube = clienteActivo?.direccion;
      
      // Si no viene por prop, la aseguramos extrayéndola de la sesión del navegador
      if (!dirNube) {
        try {
          const sesion = JSON.parse(localStorage.getItem('pos_sesion'));
          if (sesion && sesion.tipo === 'cliente' && sesion.data?.direccion) {
            dirNube = sesion.data.direccion;
          }
        } catch (e) {}
      }

      if (dirNube) {
        setDireccionEntrega(dirNube);
      } else if (direccionesGuardadas && direccionesGuardadas.length > 0) {
        setDireccionEntrega(direccionesGuardadas[0]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantallaActual]);

  if (pantallaActual === 'aviso_domicilio') {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center animate-in zoom-in">
        <div className="bg-purple-100 text-purple-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl shadow-inner">🛵</div>
        <h2 className="text-3xl font-black mb-4 text-slate-800">Costo de Envío</h2>
        <div className="bg-purple-50 border border-purple-200 p-8 rounded-3xl mb-8">
           <p className="text-purple-800 font-bold text-lg leading-relaxed">
             {configGlobal?.mensaje_envio || 'El costo de envío se calculará según tu zona y se sumará al total de tu pedido.'}
           </p>
        </div>
        <div className="flex gap-4">
           <button 
               onClick={() => setPantallaActual('consumo')} 
               className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-2xl font-bold hover:bg-slate-200 transition"
           >
               Cancelar
           </button>
           <button 
               onClick={() => setPantallaActual('direccion')} 
               className="flex-[2] bg-purple-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg hover:bg-purple-700 transition active:scale-95"
           >
               Entendido, Continuar
           </button>
        </div>
      </div>
    );
  }

  if (pantallaActual === 'direccion') {
    // Organizar los botones rápidos de direcciones para UI
    let dirNubeLocal = clienteActivo?.direccion;
    if (!dirNubeLocal) {
        try {
            const sesion = JSON.parse(localStorage.getItem('pos_sesion'));
            if (sesion?.tipo === 'cliente' && sesion?.data?.direccion) {
                dirNubeLocal = sesion.data.direccion;
            }
        } catch (e) {}
    }

    const direccionesRapidas = [];
    if (dirNubeLocal) {
        direccionesRapidas.push({ tipo: '📍 Dirección Principal', valor: dirNubeLocal });
    }
    
    (direccionesGuardadas || []).forEach((dir, idx) => {
        if (dir !== dirNubeLocal) {
            direccionesRapidas.push({ 
                tipo: idx === 0 && !dirNubeLocal ? '🏠 Casa (Reciente)' : '🏢 Otra (Reciente)', 
                valor: dir 
            });
        }
    });

    return (
      <div className="max-w-xl mx-auto mt-10 text-center animate-in slide-in-from-bottom-4">
        <div className="flex justify-start mb-6">
            <button 
                onClick={() => setPantallaActual('consumo')} 
                className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition"
            >
                ⬅ Elegir otro método
            </button>
        </div>
        
        <span className="text-6xl block mb-6">🛵</span>
        <h2 className="text-3xl font-black mb-2 texto-destacado">¿A dónde te lo enviamos?</h2>
        
        {direccionesRapidas.length > 0 && (
           <div className="mb-6 flex flex-wrap gap-3 justify-center mt-6">
              {direccionesRapidas.map((item, idx) => (
                 <button 
                     key={idx} 
                     onClick={() => setDireccionEntrega(item.valor)} 
                     className={`px-6 py-3 rounded-xl font-bold border-2 transition-all ${direccionEntrega === item.valor ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
                 >
                    {item.tipo}
                 </button>
              ))}
           </div>
        )}

        <p className="text-slate-500 font-medium mb-4 mt-6">Ingresa la dirección completa.</p>
        
        <textarea 
            required 
            value={direccionEntrega} 
            onChange={(e) => setDireccionEntrega(e.target.value)} 
            className="w-full bg-white border-2 border-slate-200 rounded-3xl p-6 text-lg font-bold outline-none focus:border-blue-500 shadow-sm h-32 resize-none text-slate-800" 
            placeholder="Ej. Calle Pino Suárez #123, Col. Centro." 
        />
        
        <div className="flex gap-4 mt-8">
           <button 
               disabled={!direccionEntrega.trim()} 
               onClick={continuarAPagoDesdeDireccion} 
               className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 disabled:opacity-50 transition active:scale-95"
           >
               Continuar
           </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PantallaDomicilio;