import React, { useState, useEffect } from 'react';
import { ChefHat, Coffee, Utensils } from 'lucide-react';

const GestorComedorPersonal = ({ configGlobal, setConfigGlobal, isSubmitting, apiUrl }) => {
  const [clasificaciones, setClasificaciones] = useState([]);

  useEffect(() => {
    fetch(`${apiUrl}/clasificaciones`)
      .then(res => res.json())
      .then(data => setClasificaciones(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error al cargar clasificaciones", err));
  }, [apiUrl]);

  // Parseo super seguro para el renderizado inicial
  const parseArraySeguro = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { return JSON.parse(val || '[]'); } catch(e) { return []; }
    }
    return [];
  };

  const clasifBebidas = parseArraySeguro(configGlobal.comedor_clasif_bebidas);
  const clasifPlatillos = parseArraySeguro(configGlobal.comedor_clasif_platillos);

  const toggleClasificacion = (tipo, nombreClasificacion) => {
    if (tipo === 'bebidas') {
      const nuevoArray = clasifBebidas.includes(nombreClasificacion)
        ? clasifBebidas.filter(c => c !== nombreClasificacion)
        : [...clasifBebidas, nombreClasificacion];
      setConfigGlobal({ ...configGlobal, comedor_clasif_bebidas: nuevoArray });
    } else {
      const nuevoArray = clasifPlatillos.includes(nombreClasificacion)
        ? clasifPlatillos.filter(c => c !== nombreClasificacion)
        : [...clasifPlatillos, nombreClasificacion];
      setConfigGlobal({ ...configGlobal, comedor_clasif_platillos: nuevoArray });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="bg-orange-100 text-orange-600 p-2 rounded-xl"><ChefHat size={24}/></div>
        <div>
            <h3 className="text-xl font-black text-slate-800">Prestación: Comedor de Empleados</h3>
            <p className="text-sm text-slate-500 font-bold">Define qué pueden consumir los empleados por turno sin costo.</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-8">
        
        <div>
           <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Límite Permitido por Turno</label>
           <select 
             disabled={isSubmitting}
             value={configGlobal.comedor_limite || 'ambos'} 
             onChange={e => setConfigGlobal({...configGlobal, comedor_limite: e.target.value})}
             className="w-full md:w-1/2 bg-white border border-slate-300 text-slate-700 font-black p-4 rounded-xl outline-none focus:border-orange-500 shadow-sm cursor-pointer"
           >
             <option value="ambos">1 Platillo + 1 Bebida (Ambos)</option>
             <option value="solo_comida">Solo 1 Platillo (Sin bebida)</option>
             <option value="solo_bebida">Solo 1 Bebida (Sin comida)</option>
           </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white border-2 border-blue-100 p-5 rounded-2xl shadow-sm">
             <h4 className="flex items-center gap-2 font-black text-blue-800 mb-4 pb-2 border-b border-blue-50">
                <Coffee size={20}/> ¿Qué entra como BEBIDA?
             </h4>
             <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {clasificaciones.length === 0 && <p className="text-xs text-slate-400 font-bold">No hay clasificaciones.</p>}
                {clasificaciones.map(c => (
                  <label key={`bebida-${c.id}`} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${clasifBebidas.includes(c.nombre) ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                    <input 
                      type="checkbox" disabled={isSubmitting} checked={clasifBebidas.includes(c.nombre)}
                      onChange={() => toggleClasificacion('bebidas', c.nombre)} className="w-5 h-5 accent-blue-600"
                    />
                    <span className={`font-bold text-sm ${clasifBebidas.includes(c.nombre) ? 'text-blue-900' : 'text-slate-600'}`}>{c.nombre}</span>
                  </label>
                ))}
             </div>
           </div>

           <div className="bg-white border-2 border-orange-100 p-5 rounded-2xl shadow-sm">
             <h4 className="flex items-center gap-2 font-black text-orange-800 mb-4 pb-2 border-b border-orange-50">
                <Utensils size={20}/> ¿Qué entra como PLATILLO?
             </h4>
             <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {clasificaciones.length === 0 && <p className="text-xs text-slate-400 font-bold">No hay clasificaciones.</p>}
                {clasificaciones.map(c => (
                  <label key={`comida-${c.id}`} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${clasifPlatillos.includes(c.nombre) ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                    <input 
                      type="checkbox" disabled={isSubmitting} checked={clasifPlatillos.includes(c.nombre)}
                      onChange={() => toggleClasificacion('platillos', c.nombre)} className="w-5 h-5 accent-orange-500"
                    />
                    <span className={`font-bold text-sm ${clasifPlatillos.includes(c.nombre) ? 'text-orange-900' : 'text-slate-600'}`}>{c.nombre}</span>
                  </label>
                ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default GestorComedorPersonal;