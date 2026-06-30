import React from 'react';
import { MapPin, Phone, Truck } from 'lucide-react';

const FormularioConsumoDomicilio = ({
  telefonoOrdenRapida,
  setTelefonoOrdenRapida,
  notaOpcional,
  setNotaOpcional,
  zonaEnvioCosto,
  setZonaEnvioCosto,
  tarifasEnvio,
  clienteAsignado
}) => {
  return (
    <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-inner animate-in fade-in duration-200 space-y-3">
      <label className="block text-[10px] font-black uppercase tracking-widest text-purple-600 mb-1 flex items-center gap-1.5">
        <Truck size={14} /> Datos de Envío a Domicilio
      </label>

      {/* 1. Teléfono (Obligatorio si no hay cliente asignado) */}
      {!clienteAsignado && (
        <div className="relative">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone size={16} className="text-red-400" />
           </div>
           <input 
              type="tel" 
              maxLength="10" 
              placeholder="Teléfono a 10 dígitos (Obligatorio) *" 
              value={telefonoOrdenRapida} 
              onChange={e => setTelefonoOrdenRapida(e.target.value.replace(/\D/g, ''))} 
              className="w-full bg-white rounded-xl py-3 pl-10 pr-3 text-xs md:text-sm font-bold outline-none border border-red-200 focus:border-red-400 placeholder-red-300 text-red-900 transition-all shadow-sm" 
           />
        </div>
      )}

      {/* 2. Dirección de Entrega (Obligatoria) */}
      <div className="relative">
        <div className="absolute top-3 left-3 pointer-events-none">
           <MapPin size={16} className="text-slate-400" />
        </div>
        <textarea 
          value={notaOpcional} 
          onChange={e => setNotaOpcional(e.target.value)} 
          placeholder="Dirección completa o enlaces de ubicación (Obligatorio) *" 
          className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-3 text-xs md:text-sm font-bold outline-none h-16 resize-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm text-slate-800 placeholder-slate-400" 
        />
      </div>

      {/* 3. Selector de Tarifa de Envío (Obligatorio) */}
      <div className="relative">
        <select 
          value={zonaEnvioCosto} 
          onChange={e => setZonaEnvioCosto(e.target.value)} 
          className={`w-full bg-white border rounded-xl p-3 text-xs md:text-sm font-bold outline-none cursor-pointer appearance-none transition-all shadow-sm ${
            zonaEnvioCosto === '' 
              ? 'border-red-200 text-red-500 focus:border-red-400' 
              : 'border-purple-200 text-purple-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
          }`}
        >
          <option value="">-- Selecciona la Zona de Envío * --</option>
          {tarifasEnvio.map((t, i) => (
            <option key={i} value={t.costo}>{t.zona} (+${t.costo})</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
          <span className="text-xs">▼</span>
        </div>
      </div>
      
    </div>
  );
};

export default FormularioConsumoDomicilio;