import React from 'react';

const CostosEnvio = ({ configGlobal, setConfigGlobal, tarifasEnvio, setTarifasEnvio, isSubmitting }) => {
  return (
    <div className="bg-purple-50/30 p-6 rounded-3xl border border-purple-100 space-y-6">
      <h3 className="text-xl font-bold text-purple-800 flex items-center gap-2">🛵 6. Costos de Envío a Domicilio</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-black text-purple-600 uppercase mb-1">Aviso para el Cliente (Kiosco)</label>
          <textarea 
            disabled={isSubmitting}
            value={configGlobal.mensaje_envio !== undefined ? configGlobal.mensaje_envio : 'El costo de envío se calculará según tu zona y se sumará al total de tu pedido.'} 
            onChange={e => setConfigGlobal({...configGlobal, mensaje_envio: e.target.value})} 
            className="w-full p-3 bg-white border border-purple-200 rounded-xl outline-none font-medium resize-none h-20 text-slate-700" 
            placeholder="Ej. El costo de envío varía entre $10 y $25..." 
          />
        </div>

        <div className="pt-4 border-t border-purple-100">
          <label className="block text-xs font-black text-purple-600 uppercase mb-3">Zonas y Tarifas de Envío</label>
          
          <div className="space-y-3 mb-4">
            {tarifasEnvio.length === 0 && <p className="text-sm font-bold text-slate-400">No hay zonas configuradas. El envío a domicilio no tendrá costo extra.</p>}
            
            {tarifasEnvio.map((tarifa, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-2 items-center bg-white p-3 rounded-xl border border-purple-100">
                <input 
                  disabled={isSubmitting}
                  type="text" 
                  placeholder="Nombre de Zona (Ej. Mismo Fraccionamiento)" 
                  value={tarifa.zona} 
                  onChange={(e) => {
                    const nuevas = [...tarifasEnvio];
                    nuevas[index].zona = e.target.value;
                    setTarifasEnvio(nuevas);
                  }} 
                  className="flex-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" 
                />
                
                <div className="relative w-full md:w-32 shrink-0">
                  <span className="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                  <input 
                    disabled={isSubmitting}
                    type="number" min="0" placeholder="Costo" value={tarifa.costo} 
                    onChange={(e) => {
                      const nuevas = [...tarifasEnvio];
                      nuevas[index].costo = Number(e.target.value);
                      setTarifasEnvio(nuevas);
                    }} 
                    className="w-full p-3 pl-8 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" 
                  />
                </div>
                
                <button 
                  disabled={isSubmitting} type="button" onClick={() => setTarifasEnvio(tarifasEnvio.filter((_, i) => i !== index))} 
                  className="w-full md:w-auto p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 font-bold transition flex justify-center shrink-0 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>

          <button 
            disabled={isSubmitting} type="button" onClick={() => setTarifasEnvio([...tarifasEnvio, { zona: '', costo: 0 }])} 
            className="bg-purple-100 text-purple-700 font-bold px-4 py-3 rounded-xl text-sm hover:bg-purple-200 transition flex items-center gap-2 disabled:opacity-50"
          >
            ➕ Agregar Nueva Zona
          </button>
        </div>
      </div>
    </div>
  );
};

export default CostosEnvio;