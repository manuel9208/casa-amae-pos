import React from 'react';
import { Clock, Fingerprint, Monitor, LayoutDashboard } from 'lucide-react';

const GestorAsistencias = ({ configGlobal, setConfigGlobal, isSubmitting }) => {
  // Valores por defecto seguros
  const isPinCaja = configGlobal.asistencia_pin_caja === undefined ? true : (configGlobal.asistencia_pin_caja === true || configGlobal.asistencia_pin_caja === 'true');
  const isLogin = configGlobal.asistencia_login === undefined ? true : (configGlobal.asistencia_login === true || configGlobal.asistencia_login === 'true');
  const isHuella = configGlobal.asistencia_huella === true || configGlobal.asistencia_huella === 'true';

  return (
    <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl mt-8 animate-in fade-in">
      <h4 className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-widest mb-2">
        <Clock size={18} className="text-blue-500" /> Métodos de Reloj Checador
      </h4>
      <p className="text-sm font-bold text-slate-400 mb-6">Activa o desactiva las formas en las que el sistema registrará la entrada y salida del personal.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* MÉTODO 1: HUELLA DIGITAL */}
        <label className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 cursor-pointer transition-all ${isHuella ? 'bg-white border-blue-500 shadow-md shadow-blue-500/10' : 'bg-slate-100/50 border-slate-200 opacity-70 grayscale'}`}>
          <Fingerprint size={32} className={isHuella ? 'text-blue-500 mb-3' : 'text-slate-400 mb-3'} />
          <span className="font-black text-slate-700 uppercase tracking-widest text-xs mb-3 text-center">Checador Biométrico<br/>(Huella IP)</span>
          <input type="checkbox" disabled={isSubmitting} checked={isHuella} onChange={(e) => setConfigGlobal({ ...configGlobal, asistencia_huella: e.target.checked })} className="w-5 h-5 accent-blue-600" />
        </label>

        {/* MÉTODO 2: PINES EN PANTALLA POS */}
        <label className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 cursor-pointer transition-all ${isPinCaja ? 'bg-white border-blue-500 shadow-md shadow-blue-500/10' : 'bg-slate-100/50 border-slate-200 opacity-70 grayscale'}`}>
          <Monitor size={32} className={isPinCaja ? 'text-blue-500 mb-3' : 'text-slate-400 mb-3'} />
          <span className="font-black text-slate-700 uppercase tracking-widest text-xs mb-3 text-center">Botones de Asistencia<br/>(Caja y Cocina)</span>
          <input type="checkbox" disabled={isSubmitting} checked={isPinCaja} onChange={(e) => setConfigGlobal({ ...configGlobal, asistencia_pin_caja: e.target.checked })} className="w-5 h-5 accent-blue-600" />
        </label>

        {/* MÉTODO 3: INICIO DE SESIÓN WEB */}
        <label className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 cursor-pointer transition-all ${isLogin ? 'bg-white border-blue-500 shadow-md shadow-blue-500/10' : 'bg-slate-100/50 border-slate-200 opacity-70 grayscale'}`}>
          <LayoutDashboard size={32} className={isLogin ? 'text-blue-500 mb-3' : 'text-slate-400 mb-3'} />
          <span className="font-black text-slate-700 uppercase tracking-widest text-xs mb-3 text-center">Login Automático<br/>(Iniciar / Cerrar Sesión)</span>
          <input type="checkbox" disabled={isSubmitting} checked={isLogin} onChange={(e) => setConfigGlobal({ ...configGlobal, asistencia_login: e.target.checked })} className="w-5 h-5 accent-blue-600" />
        </label>

      </div>
    </div>
  );
};

export default GestorAsistencias;