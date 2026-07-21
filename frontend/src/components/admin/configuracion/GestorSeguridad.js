import React, { useState } from 'react';
import { ShieldAlert, Clock, Lock, ChefHat, Key, Eye, EyeOff } from 'lucide-react';

const GestorSeguridad = ({ configGlobal, setConfigGlobal, isSubmitting }) => {
  
  const isActivo = configGlobal.bloqueo_caja_activo === true || configGlobal.bloqueo_caja_activo === 'true';
  const isCocinaActiva = configGlobal.cocina_en_caja_activa === true || configGlobal.cocina_en_caja_activa === 'true';
  
  const [showPin, setShowPin] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="bg-red-100 text-red-600 p-2 rounded-xl"><ShieldAlert size={24}/></div>
        <div>
            <h3 className="text-xl font-black text-slate-800">Seguridad y Operación (Caja y Kiosco)</h3>
            <p className="text-sm text-slate-500 font-bold">Protege y adapta la terminal POS a las necesidades de tu sucursal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CAJA 1: BLOQUEO POR PIN (CAJA POS) */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col justify-between">
          <label className="flex items-center justify-between cursor-pointer group mb-4">
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-2xl transition-colors ${isActivo ? 'bg-red-500 text-white shadow-md' : 'bg-slate-200 text-slate-400'}`}>
                  <Lock size={24} />
               </div>
               <div>
                  <p className="font-black text-slate-800 text-lg leading-tight">Bloqueo de Pantalla</p>
                  <p className="text-xs text-slate-500 font-bold mt-1">Exige PIN tras inactividad.</p>
               </div>
            </div>
            <div className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors duration-300 shrink-0 ${isActivo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${isActivo ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </div>
            <input 
              type="checkbox" className="hidden" disabled={isSubmitting}
              checked={isActivo} onChange={(e) => setConfigGlobal({...configGlobal, bloqueo_caja_activo: e.target.checked})} 
            />
          </label>

          {isActivo && (
              <div className="pt-4 border-t border-slate-200 animate-in slide-in-from-top-2">
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                   <Clock size={16}/> Segundos para bloquear
                 </label>
                 <div className="flex items-center gap-4">
                   <input 
                      type="number" min="5" max="600" disabled={isSubmitting}
                      value={configGlobal.bloqueo_caja_segundos || 30} 
                      onChange={e => setConfigGlobal({...configGlobal, bloqueo_caja_segundos: Number(e.target.value)})} 
                      className="w-24 bg-white border-2 border-slate-200 rounded-xl p-2 text-center text-lg font-black outline-none focus:border-red-500 text-slate-700" 
                   />
                   <span className="text-xs font-bold text-slate-500 leading-tight">
                      (Ej. 30 = Medio minuto)
                   </span>
                 </div>
              </div>
          )}
        </div>

        {/* CAJA 2: MÓDULO KDS EN CAJA */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col justify-between">
          <label className="flex items-center justify-between cursor-pointer group mb-4">
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-2xl transition-colors ${isCocinaActiva ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-400'}`}>
                  <ChefHat size={24} />
               </div>
               <div>
                  <p className="font-black text-slate-800 text-lg leading-tight">Cocina en Caja (KDS Mini)</p>
                  <p className="text-xs text-slate-500 font-bold mt-1">Ideal para foodtrucks o islas.</p>
               </div>
            </div>
            <div className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors duration-300 shrink-0 ${isCocinaActiva ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${isCocinaActiva ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </div>
            <input 
              type="checkbox" className="hidden" disabled={isSubmitting}
              checked={isCocinaActiva} onChange={(e) => setConfigGlobal({...configGlobal, cocina_en_caja_activa: e.target.checked})} 
            />
          </label>
          
          <div className="pt-4 border-t border-slate-200">
             <p className="text-xs font-bold text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-200">
                💡 Habilita un botón extra en la Caja para que el mismo personal pueda marcar los pedidos como "Preparando" o "Listos" sin necesidad de una pantalla separada.
             </p>
          </div>
        </div>

        {/* CAJA 3: PIN MAESTRO DE TERMINALES */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-4 mb-4">
             <div className="p-3 rounded-2xl bg-slate-800 text-white shadow-md">
                <Key size={24} />
             </div>
             <div>
                <p className="font-black text-slate-800 text-lg leading-tight">PIN Maestro (Kiosco Físico)</p>
                <p className="text-xs text-slate-500 font-bold mt-1">Configura las tablets en modo Tótem o Drive-Thru.</p>
             </div>
          </div>
          
          <div className="pt-4 border-t border-slate-200">
             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
               PIN de Seguridad (4 dígitos)
             </label>
             <div className="relative">
               <input 
                  type={showPin ? "text" : "password"} 
                  maxLength="4" 
                  disabled={isSubmitting}
                  // 👇 CORRECCIÓN: Permite borrar y no fuerza el 1234 si está en blanco
                  value={configGlobal.kiosco_pin_maestro !== undefined ? configGlobal.kiosco_pin_maestro : '1234'} 
                  onChange={e => setConfigGlobal({...configGlobal, kiosco_pin_maestro: e.target.value.replace(/\D/g, '')})} 
                  className="w-full bg-white border-2 border-slate-200 rounded-xl p-4 text-2xl font-black outline-none focus:border-slate-800 text-slate-700 tracking-[0.5em] transition-colors" 
               />
               <button 
                 type="button" 
                 onClick={() => setShowPin(!showPin)}
                 className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors bg-white pl-2"
                 title={showPin ? "Ocultar PIN" : "Mostrar PIN"}
               >
                 {showPin ? <EyeOff size={24} /> : <Eye size={24} />}
               </button>
             </div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">
               Manten presionado el logo del Kiosco por 3 segundos para usarlo.
             </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GestorSeguridad;