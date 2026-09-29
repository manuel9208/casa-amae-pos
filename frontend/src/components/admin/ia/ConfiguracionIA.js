import React, { useState, useEffect } from 'react';
import { ShieldCheck, Database, Zap, KeyRound, Sparkles, Save } from 'lucide-react';

const ConfiguracionIA = ({ apiUrl, showAlert }) => {
  const [config, setConfig] = useState({
    modulo_activo: true,
    tier_premium: false,
    proveedor_activo: 'gemini',
    api_key_gemini: '',
    api_key_openai: '',
    consultas_hoy: 0,
    fecha_uso: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Cargar Configuración Inicial
  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/ia/configuracion`);
        const data = await res.json();
        if (data.success) {
          setConfig(prev => ({ ...prev, ...data }));
        } else {
          showAlert("Aviso", data.error || "No se pudo cargar la configuración de IA.", "info");
        }
      } catch (error) {
        showAlert("Error de Red", "Fallo de conexión al cargar los ajustes de IA.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    cargarConfig();
  }, [apiUrl, showAlert]);

  // 2. Manejador Universal de Inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 3. Guardar Configuración en Base de Datos
  const guardarConfiguracion = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${apiUrl}/ia/configuracion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      
      if (data.success) {
        showAlert("¡Ajustes Guardados!", "La configuración y llaves de la IA se actualizaron correctamente.", "success");
      } else {
        showAlert("Error al Guardar", data.error || "Ocurrió un error al actualizar la base de datos.", "error");
      }
    } catch (error) {
      showAlert("Error de Red", "No se pudo contactar al servidor. Revisa tu conexión.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-slate-400 space-y-4 animate-pulse">
        <Sparkles size={40} className="text-indigo-400" />
        <p className="font-bold tracking-widest uppercase text-sm">Cargando motores IA...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ENCABEZADO Y BOTÓN GUARDAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Ajustes del Copiloto</h2>
            <p className="text-slate-500">Gestión de llaves API, proveedores y límites de uso.</p>
          </div>
          <button 
            onClick={guardarConfiguracion}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar Ajustes'}
          </button>
        </div>

        {/* ESTADO GLOBAL Y LÍMITES */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6 relative overflow-hidden transition-all hover:shadow-md">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 z-10">
            <ShieldCheck size={32} />
          </div>
          <div className="flex-1 text-center md:text-left z-10">
            <h3 className="text-lg font-black text-slate-800">Módulo Multi-Tenant Activo</h3>
            <p className="text-slate-500 text-sm mt-1 leading-relaxed">
              La IA corre en un entorno asilado. Hoy has consumido <strong className="text-indigo-600">{config.consultas_hoy}</strong> consultas. 
              {!config.tier_premium && ' El límite de la capa gratuita es de 15 por día.'}
            </p>
          </div>
          <div className="shrink-0 z-10 flex flex-col items-center gap-2 border-l border-slate-100 pl-6">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Motor Global</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="modulo_activo" 
                checked={config.modulo_activo} 
                onChange={handleChange} 
                className="sr-only peer" 
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
            </label>
          </div>
        </div>

        {/* SELECTOR DE PROVEEDOR (Radio Buttons Estilizados) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`cursor-pointer border-2 p-5 rounded-3xl shadow-sm transition-all flex items-start gap-4 ${config.proveedor_activo === 'gemini' ? 'bg-blue-50 border-blue-400 ring-4 ring-blue-500/10' : 'bg-white border-slate-200 opacity-70 hover:opacity-100'}`}>
            <input 
              type="radio" 
              name="proveedor_activo" 
              value="gemini" 
              checked={config.proveedor_activo === 'gemini'} 
              onChange={handleChange} 
              className="mt-1 w-5 h-5 text-blue-600 focus:ring-blue-500" 
            />
            <div>
              <h4 className="font-black text-slate-800 flex items-center gap-2"><Zap className="text-blue-500" size={18}/> Google Gemini (Gratis)</h4>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">Recomendado para empezar. Tiene un candado interno de 15 consultas por día para evitar que Google suspenda tu cuota gratuita.</p>
            </div>
          </label>

          <label className={`cursor-pointer border-2 p-5 rounded-3xl shadow-sm transition-all flex items-start gap-4 ${config.proveedor_activo === 'openai' ? 'bg-emerald-50 border-emerald-400 ring-4 ring-emerald-500/10' : 'bg-white border-slate-200 opacity-70 hover:opacity-100'}`}>
            <input 
              type="radio" 
              name="proveedor_activo" 
              value="openai" 
              checked={config.proveedor_activo === 'openai'} 
              onChange={handleChange} 
              className="mt-1 w-5 h-5 text-emerald-600 focus:ring-emerald-500" 
            />
            <div>
              <h4 className="font-black text-slate-800 flex items-center gap-2"><Sparkles className="text-emerald-500" size={18}/> ChatGPT OpenAI (De Pago)</h4>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">Respuestas con mayor razonamiento lógico y sin límite artificial de consultas. Requiere tener saldo recargado en OpenAI.</p>
            </div>
          </label>
        </div>

        {/* LLAVES API (Inputs Seguros) */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Credenciales de API</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Las llaves se encriptan al guardar</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Llave de Gemini (Google AI Studio)
              </label>
              <input 
                type="text" 
                name="api_key_gemini" 
                value={config.api_key_gemini || ''} 
                onChange={handleChange}
                placeholder="Pegar llave AIzaSyA..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-700 font-mono text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Llave de OpenAI (ChatGPT & DALL-E)
              </label>
              <input 
                type="text" 
                name="api_key_openai" 
                value={config.api_key_openai || ''} 
                onChange={handleChange}
                placeholder="Pegar llave sk-proj-..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-700 font-mono text-sm focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-300"
              />
            </div>
          </div>
        </div>

        {/* PREMIUM TIER TOGGLE */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border border-indigo-500/30 p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
          {/* Brillo de fondo estético */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-pink-500/20 blur-3xl rounded-full pointer-events-none"></div>
          
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/40 z-10">
            <Database size={32} />
          </div>
          <div className="flex-1 text-center md:text-left z-10">
            <h3 className="text-xl font-black text-white flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
              Activar Nivel Premium 
              <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
                DALL-E 3 Habilitado
              </span>
            </h3>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed max-w-xl">
              Desbloquea el Generador de Imágenes Fotográficas (Studio Mágico) y desactiva el límite de seguridad de 15 consultas diarias en los reportes financieros.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3 z-10 bg-slate-950/50 p-3 rounded-2xl border border-slate-700">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="tier_premium" 
                checked={config.tier_premium} 
                onChange={handleChange} 
                className="sr-only peer" 
              />
              <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 shadow-inner"></div>
            </label>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ConfiguracionIA;