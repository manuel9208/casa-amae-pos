import React from 'react';
import { ArrowRightLeft, DollarSign, Percent } from 'lucide-react';

const GestorPoliticasVenta = ({ configGlobal, setConfigGlobal, isSubmitting }) => {
  
  // Parsear políticas o usar valores por defecto seguros
  const politicas = typeof configGlobal.politicas_sustitucion === 'string' 
    ? JSON.parse(configGlobal.politicas_sustitucion || '{}') 
    : (configGlobal.politicas_sustitucion || { activa: false, modalidad: 'proporcional', tarifa_fija: 0 });

  const handleChange = (campo, valor) => {
    const nuevasPoliticas = { ...politicas, [campo]: valor };
    setConfigGlobal({ ...configGlobal, politicas_sustitucion: nuevasPoliticas });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="bg-teal-100 text-teal-600 p-2 rounded-xl"><ArrowRightLeft size={24}/></div>
        <div>
            <h3 className="text-xl font-black text-slate-800">Políticas de Venta y Sustituciones</h3>
            <p className="text-sm text-slate-500 font-bold">Reglas para intercambios de ingredientes en el Kiosco y Caja.</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col justify-between">
         
         {/* SWITCH MAESTRO DE SUSTITUCIONES */}
         <label className="flex items-center justify-between cursor-pointer group mb-4">
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-2xl transition-colors ${politicas.activa ? 'bg-teal-500 text-white shadow-md' : 'bg-slate-200 text-slate-400'}`}>
                  <ArrowRightLeft size={24} />
               </div>
               <div>
                  <p className="font-black text-slate-800 text-lg leading-tight">Permitir Sustitución de Ingredientes</p>
                  <p className="text-xs text-slate-500 font-bold mt-1">El cliente podrá cambiar un ingrediente base por un extra.</p>
               </div>
            </div>
            <div className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors duration-300 shrink-0 ${politicas.activa ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${politicas.activa ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </div>
            <input 
              type="checkbox" className="hidden" disabled={isSubmitting}
              checked={politicas.activa} onChange={(e) => handleChange('activa', e.target.checked)} 
            />
         </label>

         {/* REGLAS MATEMÁTICAS */}
         {politicas.activa && (
            <div className="pt-6 border-t border-slate-200 animate-in slide-in-from-top-2 space-y-4">
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Regla de Cobro por Sustitución</p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Opción Proporcional */}
                  <label className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${politicas.modalidad === 'proporcional' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300'}`}>
                     <div className="flex items-center gap-3 mb-2">
                        <input type="radio" name="modalidad_sust" value="proporcional" checked={politicas.modalidad === 'proporcional'} onChange={() => handleChange('modalidad', 'proporcional')} className="w-5 h-5 accent-teal-600" disabled={isSubmitting}/>
                        <span className="font-black text-slate-700 text-sm uppercase tracking-wide flex items-center gap-1"><Percent size={16}/> Diferencia Proporcional</span>
                     </div>
                     <p className="text-xs text-slate-500 font-medium ml-8">Calcula la diferencia matemática. (Ej. Quita Jamón de $10 y pone Camarón de $25 = Cobra +$15.00 extra).</p>
                  </label>

                  {/* Opción Tarifa Fija */}
                  <label className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${politicas.modalidad === 'fija' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                     <div className="flex items-center gap-3 mb-2">
                        <input type="radio" name="modalidad_sust" value="fija" checked={politicas.modalidad === 'fija'} onChange={() => handleChange('modalidad', 'fija')} className="w-5 h-5 accent-blue-600" disabled={isSubmitting}/>
                        <span className="font-black text-slate-700 text-sm uppercase tracking-wide flex items-center gap-1"><DollarSign size={16}/> Tarifa Fija</span>
                     </div>
                     <p className="text-xs text-slate-500 font-medium ml-8">Cobra un monto fijo sin importar qué ingrediente quitó y cuál puso.</p>
                     
                     {politicas.modalidad === 'fija' && (
                        <div className="ml-8 mt-4 flex items-center gap-2">
                           <span className="text-sm font-black text-slate-700">$</span>
                           <input type="number" min="0" step="0.5" disabled={isSubmitting} value={politicas.tarifa_fija} onChange={e => handleChange('tarifa_fija', Number(e.target.value))} className="w-24 p-2 bg-white border border-blue-200 rounded-lg outline-none font-black text-blue-700 text-center focus:ring-2 ring-blue-500"/>
                           <span className="text-xs font-bold text-slate-400">por cambio</span>
                        </div>
                     )}
                  </label>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default GestorPoliticasVenta;