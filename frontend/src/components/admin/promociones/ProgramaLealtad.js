import React, { useState } from 'react';  

const ProgramaLealtad = ({ configGlobal, setConfigGlobal, apiUrl, showAlert }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Seguridad por si configGlobal aún no se ha cargado en el panel principal
  if (!configGlobal) return null;

  const guardarLealtad = async (e) => {
    e.preventDefault();
    if(isSubmitting) return;
    setIsSubmitting(true);

    // Empaquetamos la configuración respetando la misma lógica global para no sobreescribir datos [1]
    const formData = new FormData();
    const llavesManuales = [
      'tarifas_envio', 'comedor_clasif_bebidas', 'comedor_clasif_platillos',
      'bloqueo_caja_activo', 'bloqueo_caja_segundos', 'comedor_limite', 'matriz_limpieza',
      'cocina_en_caja_activa'
    ];

    const parseArraySeguro = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val || '[]'); } catch(e) { return []; }
      }
      return [];
    };

    Object.keys(configGlobal).forEach(key => {
      if (!llavesManuales.includes(key)) {
        let val = configGlobal[key];
        if (val === null || val === undefined) val = '';
        formData.append(key, val);
      }
    });

    const tarifasEnvio = typeof configGlobal.tarifas_envio === 'string' ? configGlobal.tarifas_envio : JSON.stringify(configGlobal.tarifas_envio || []);
    formData.append('tarifas_envio', tarifasEnvio);

    const isBloqueoActivo = configGlobal.bloqueo_caja_activo === true || configGlobal.bloqueo_caja_activo === 'true';
    const isCocinaActiva = configGlobal.cocina_en_caja_activa === true || configGlobal.cocina_en_caja_activa === 'true';

    formData.append('bloqueo_caja_activo', isBloqueoActivo ? 'true' : 'false');
    formData.append('bloqueo_caja_segundos', configGlobal.bloqueo_caja_segundos || 30);
    formData.append('cocina_en_caja_activa', isCocinaActiva ? 'true' : 'false');

    formData.append('comedor_limite', configGlobal.comedor_limite || 'ambos');
    formData.append('comedor_clasif_bebidas', JSON.stringify(parseArraySeguro(configGlobal.comedor_clasif_bebidas)));
    formData.append('comedor_clasif_platillos', JSON.stringify(parseArraySeguro(configGlobal.comedor_clasif_platillos)));

    let matrizL = configGlobal.matriz_limpieza || '{}';
    if (matrizL === '') matrizL = '{}';
    formData.append('matriz_limpieza', typeof matrizL === 'string' ? matrizL : JSON.stringify(matrizL));

    try {
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) {
        showAlert("¡Éxito!", "Programa de lealtad actualizado correctamente.", "success");
      } else {
        showAlert("Error", "No se pudo guardar la configuración de puntos.", "error");
      }
    } catch (error) {
      showAlert("Error", "Error de conexión con el servidor.", "error");
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={guardarLealtad} className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200 mt-8 space-y-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
      <h3 className="text-2xl font-black text-yellow-600 flex items-center gap-2 border-b pb-4">
        ⭐ Programa de Lealtad (Puntos)
      </h3>  

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
        <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-200 shadow-sm transition">
          <input disabled={isSubmitting} type="checkbox" checked={configGlobal.puntos_activos === undefined ? true : (configGlobal.puntos_activos === true || configGlobal.puntos_activos === 'true')} onChange={e => setConfigGlobal({...configGlobal, puntos_activos: e.target.checked})} className="w-6 h-6 accent-yellow-500" />
          Habilitar Acumulación de Puntos
        </label>  

        <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl border border-slate-200 shadow-sm transition">
          <input disabled={isSubmitting} type="checkbox" checked={configGlobal.puntos_canje_activo === undefined ? true : (configGlobal.puntos_canje_activo === true || configGlobal.puntos_canje_activo === 'true')} onChange={e => setConfigGlobal({...configGlobal, puntos_canje_activo: e.target.checked})} className="w-6 h-6 accent-yellow-500" />
          Permitir Canje de Puntos
        </label>
      </div>  

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-black text-yellow-600 uppercase mb-1">Puntos Ganados por Compra (%)</label>
          <input disabled={isSubmitting} type="number" min="0" max="100" value={configGlobal.puntos_porcentaje !== undefined ? configGlobal.puntos_porcentaje : 10} onChange={e => setConfigGlobal({...configGlobal, puntos_porcentaje: e.target.value})} className="w-full p-4 bg-slate-50 focus:bg-white border border-slate-200 focus:border-yellow-400 rounded-2xl outline-none font-black text-slate-700 text-lg transition" placeholder="Ej. 10" />
          <p className="text-[11px] text-slate-500 mt-2 font-bold leading-tight">Si pones 10%, un pedido de $100 MXN generará 10 puntos para el cliente.</p>
        </div>  

        <div>
          <label className="block text-xs font-black text-yellow-600 uppercase mb-1">Valor en Dinero de Cada Punto ($)</label>
          <input disabled={isSubmitting} type="number" step="0.01" min="0.01" value={configGlobal.puntos_valor_peso !== undefined ? configGlobal.puntos_valor_peso : 1.00} onChange={e => setConfigGlobal({...configGlobal, puntos_valor_peso: e.target.value})} className="w-full p-4 bg-slate-50 focus:bg-white border border-slate-200 focus:border-yellow-400 rounded-2xl outline-none font-black text-slate-700 text-lg transition" placeholder="Ej. 1.00" />
          <p className="text-[11px] text-slate-500 mt-2 font-bold leading-tight">A cuánto dinero real equivale cada punto. Si pones $1.00, 10 puntos descontarán $10 MXN.</p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
         <button type="submit" disabled={isSubmitting} className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-yellow-500/30 transition disabled:opacity-50 active:scale-95">
           {isSubmitting ? 'Guardando...' : '⭐ Guardar Puntos de Lealtad'}
         </button>
      </div>
    </form>
  );
};  

export default ProgramaLealtad;