import React, { useState, useEffect } from 'react';
import { Database, KeyRound, Sparkles, Save, Bot, Image as ImageIcon, Lock, MessageCircle, Smartphone, QrCode, MessageSquare } from 'lucide-react';
import { apiFetch } from '../../../utils/apiFetch';
import BaileysVinculacion from './BaileysVinculacion';
import Dialog360Webhook from './Dialog360Webhook';

const ConfiguracionIA = ({ apiUrl, showAlert }) => {
  const [config, setConfig] = useState({
    // Llaves y Proveedores
    api_key_gemini: '',
    api_key_openai: '',
    api_key_claude: '',
    gemini_habilitado: true,
    openai_habilitado: false,
    claude_habilitado: false,
    imagen_proveedor: 'ninguno',
    
    // Core y Premium
    tier_premium: false,
    consultas_hoy: 0,
    
    // Módulos Independientes
    modulo_activo: false, // Copiloto/Chat Admin
    kiosco_ia_activo: false, // Asistente Kiosco
    
    whatsapp: {
      proveedor: 'baileys', // baileys, meta, 360dialog
      meta_api_token: '',
      meta_phone_id: '',
      dialog360_token: '', // 🆕 Nueva llave para 360dialog
      ia_habilitada: false // Chat IA WhatsApp
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Cargar Configuración Inicial
  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const res = await apiFetch(`${apiUrl}/omnichannel/configuracion`);
        const data = await res.json();
        if (data.success) {
          // Aseguramos forzar las variables booleanas que pueden venir nulas
          setConfig(prev => ({ 
            ...prev, 
            ...data,
            modulo_activo: data.modulo_activo || false,
            kiosco_ia_activo: data.kiosco_ia_activo || false,
            tier_premium: data.tier_premium || false,
            whatsapp: { ...prev.whatsapp, ...(data.whatsapp || {}) }
          }));
        } else {
          showAlert("Aviso", data.error || "No se pudo cargar la configuración.", "info");
        }
      } catch (error) {
        showAlert("Error", "Fallo de conexión al cargar los ajustes.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    cargarConfig();
  }, [apiUrl, showAlert]);

  // --- Validación Maestra ---
  const tieneAlgunaLlave = Boolean(config.api_key_gemini || config.api_key_openai || config.api_key_claude);

  // --- Motor de Auto-Guardado ---
  const autoGuardar = async (nuevoEstado) => {
    try {
      await apiFetch(`${apiUrl}/omnichannel/configuracion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoEstado)
      });
    } catch (error) {
      showAlert("Error", "No se pudo auto-guardar el ajuste.", "error");
    }
  };

  // 2. Manejadores de Texto (Llaves)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };
  
  const handleWhatsappTextChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, whatsapp: { ...prev.whatsapp, [name]: value } }));
  };

  // 3. Manejadores de Módulos (Switches con reglas de negocio)
  
  // A. Copiloto (Solo requiere llaves)
  const handleToggleCopiloto = (e) => {
    const checked = e.target.checked;
    if (checked && !tieneAlgunaLlave) {
      showAlert("Faltan Credenciales", "Debes guardar al menos una llave API (Gemini, OpenAI o Claude) antes de encender el Copiloto.", "error");
      return;
    }
    const newState = { ...config, modulo_activo: checked };
    setConfig(newState);
    autoGuardar(newState);
  };

  // B. Asistente Kiosco (Requiere llaves + Premium)
  const handleToggleKiosco = (e) => {
    const checked = e.target.checked;
    if (checked) {
      if (!tieneAlgunaLlave) {
        showAlert("Faltan Credenciales", "Guarda al menos una llave API para activar el Kiosco.", "error");
        return;
      }
      if (!config.tier_premium) {
        showAlert("Requiere Premium", "El Asistente de Kiosco solo funciona con el Tier Premium activado.", "error");
        return;
      }
    }
    const newState = { ...config, kiosco_ia_activo: checked };
    setConfig(newState);
    autoGuardar(newState);
  };

  // C. IA en WhatsApp (Requiere llaves + Premium + Credenciales del proveedor)
  const handleToggleWaIA = (e) => {
    const checked = e.target.checked;
    if (checked) {
      if (!tieneAlgunaLlave) {
        showAlert('Requiere Llaves IA', 'Agrega y guarda al menos una llave de IA (arriba) para que el bot pueda responder.', 'error');
        return;
      }
      if (!config.tier_premium) {
        showAlert("Requiere Premium", "La IA automatizada para WhatsApp requiere el Tier Premium.", "error");
        return;
      }
      if (config.whatsapp.proveedor === 'meta' && (!config.whatsapp.meta_api_token || !config.whatsapp.meta_phone_id)) {
        showAlert('Credenciales Incompletas', 'Para usar IA en Meta, primero llena y guarda su Token y Phone ID.', 'error');
        return;
      }
      if (config.whatsapp.proveedor === '360dialog' && !config.whatsapp.dialog360_token) {
        showAlert('Credenciales Incompletas', 'Para usar IA en 360dialog, proporciona el Token de API.', 'error');
        return;
      }
    }
    const newState = { ...config, whatsapp: { ...config.whatsapp, ia_habilitada: checked } };
    setConfig(newState);
    autoGuardar(newState);
  };

  // --- Tier Premium (Controla cascada de apagado) ---
  const handleTogglePremium = (e) => {
    const checked = e.target.checked;
    const newState = {
      ...config,
      tier_premium: checked,
      // Si apaga Premium, el generador vuelve a 'ninguno' si estaba en DALL-E
      imagen_proveedor: checked && config.imagen_proveedor === 'ninguno' ? 'gemini' 
        : (!checked && (config.imagen_proveedor === 'openai' || config.imagen_proveedor === 'ambos')) ? 'ninguno' : config.imagen_proveedor,
      // Si apaga Premium, SE APAGAN los módulos dependientes obligatoriamente
      kiosco_ia_activo: checked ? config.kiosco_ia_activo : false,
      whatsapp: {
        ...config.whatsapp,
        ia_habilitada: checked ? config.whatsapp.ia_habilitada : false
      }
    };
    setConfig(newState);
    autoGuardar(newState);
  };


  const handleSeleccionarImagenProveedor = (valor) => {
    const requierePremium = valor === 'openai' || valor === 'ambos';
    if (requierePremium && !config.tier_premium) {
      showAlert('Requiere Premium', 'Activa el Nivel Premium abajo para elegir opciones avanzadas.', 'error');
      return;
    }
    const newState = { ...config, imagen_proveedor: valor };
    setConfig(newState);
    autoGuardar(newState);
  };

  const handleWhatsappProveedor = (proveedor) => {
    // Si cambia de proveedor, apagamos la IA por seguridad para que cumpla validaciones al re-encender
    const newState = { ...config, whatsapp: { ...config.whatsapp, proveedor, ia_habilitada: false } };
    setConfig(newState);
    autoGuardar(newState);
  };

  // 4. Guardar Configuración Manual (EXCLUSIVO PARA LLAVES)
  const guardarLlavesManual = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch(`${apiUrl}/omnichannel/configuracion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      
      if (data.success) {
        showAlert("¡Llaves Guardadas!", "Tus credenciales están seguras. Ya puedes encender los módulos.", "success");
      } else {
        showAlert("Error", data.error || "Ocurrió un error al actualizar.", "error");
      }
    } catch (error) {
      showAlert("Error de Red", "No se pudo contactar al servidor.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-slate-400 space-y-4 animate-pulse">
        <Sparkles size={40} className="text-indigo-400" />
        <p className="font-bold tracking-widest uppercase text-sm">Cargando Centro Omnicanal...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 h-full overflow-y-auto custom-scrollbar transform-gpu">
      <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ENCABEZADO */}
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800">Centro Omnicanal</h2>
          <p className="text-slate-500">Gestión de credenciales y activación modular de Inteligencia Artificial.</p>
        </div>

        {/* 1. LLAVES API (Obligatorias Primero) */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Credenciales de IA</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Base obligatoria para activar servicios.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Llave de Gemini (Google AI)</label>
              <input type="password" name="api_key_gemini" value={config.api_key_gemini || ''} onChange={handleChange} placeholder="AIzaSyA..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-slate-700 font-mono text-sm focus:border-blue-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Llave de OpenAI (ChatGPT)</label>
              <input type="password" name="api_key_openai" value={config.api_key_openai || ''} onChange={handleChange} placeholder="sk-proj-..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-slate-700 font-mono text-sm focus:border-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Llave de Claude (Anthropic)</label>
              <input type="password" name="api_key_claude" value={config.api_key_claude || ''} onChange={handleChange} placeholder="sk-ant-..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-slate-700 font-mono text-sm focus:border-orange-500 outline-none transition-all" />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-50 mt-4">
            <button 
              onClick={guardarLlavesManual}
              disabled={isSaving}
              className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar Llaves API'}
            </button>
          </div>
        </div>

        {/* 2. TIER PREMIUM (Control Maestro de Bloqueos) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border border-indigo-500/30 p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden mt-8">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-pink-500/20 blur-3xl rounded-full pointer-events-none"></div>
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-2xl flex items-center justify-center shrink-0 z-10 shadow-lg shadow-pink-500/40">
            <Database size={32} />
          </div>
          <div className="flex-1 text-center md:text-left z-10">
            <h3 className="text-xl font-black text-white flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
              Tier Premium 
            </h3>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed max-w-xl">
              Obligatorio para desbloquear la IA en WhatsApp, el Asistente del Kiosco y DALL-E 3. Activa tokens ilimitados.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3 z-10 bg-slate-950/50 p-3 rounded-2xl border border-slate-700">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={config.tier_premium} onChange={handleTogglePremium} className="sr-only peer" />
              <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 shadow-inner"></div>
            </label>
          </div>
        </div>

        {/* 3. MÓDULOS DE IA (Interruptores Independientes) */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Módulos Inteligentes</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Activa los servicios por separado</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Copiloto (Solo requiere llaves) */}
            <div className={`border-2 p-5 rounded-3xl flex items-center justify-between ${config.modulo_activo ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <div>
                <h4 className="font-black text-slate-800 flex items-center gap-2"><Bot size={18}/> Copiloto Admin</h4>
                <p className="text-xs text-slate-500 mt-1">Asistente en el panel de control. Límite: 15/día si no es Premium.</p>
                {!tieneAlgunaLlave && <span className="text-[10px] text-red-500 font-bold">⚠️ Requiere llaves.</span>}
              </div>
              <label className={`relative inline-flex items-center ${tieneAlgunaLlave ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input type="checkbox" checked={config.modulo_activo} onChange={handleToggleCopiloto} disabled={!tieneAlgunaLlave} className="sr-only peer" />
                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Asistente Kiosco (Requiere Premium) */}
            <div className={`border-2 p-5 rounded-3xl flex items-center justify-between ${config.kiosco_ia_activo ? 'border-purple-400 bg-purple-50' : 'border-slate-200 bg-white'}`}>
              <div>
                <h4 className="font-black text-slate-800 flex items-center gap-2"><MessageSquare size={18}/> Asistente Kiosco</h4>
                <p className="text-xs text-slate-500 mt-1">Muñeco interactivo para auto-pedidos.</p>
                {!config.tier_premium && <span className="text-[10px] text-amber-600 font-bold">🔒 Requiere Premium.</span>}
              </div>
              <label className={`relative inline-flex items-center ${config.tier_premium && tieneAlgunaLlave ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input type="checkbox" checked={config.kiosco_ia_activo} onChange={handleToggleKiosco} disabled={!config.tier_premium || !tieneAlgunaLlave} className="sr-only peer" />
                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* 4. WHATSAPP ENRUTADOR E IA */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl text-green-600">
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Enrutador WhatsApp</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Gestión de canal de mensajería</p>
              </div>
            </div>
            
            {/* Interruptor IA de WhatsApp */}
            <div className={`flex flex-col md:flex-row items-start md:items-center gap-3 px-4 py-3 rounded-xl border ${config.whatsapp.ia_habilitada ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-700 flex items-center gap-1">
                  <Bot size={14} className={config.whatsapp.ia_habilitada ? 'text-indigo-600' : 'text-slate-400'}/> IA en WhatsApp
                </span>
                {!config.tier_premium && <span className="text-[10px] text-amber-600 font-bold">🔒 Requiere Premium</span>}
              </div>
              <label className={`relative inline-flex items-center ${config.tier_premium && tieneAlgunaLlave ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                <input type="checkbox" checked={config.whatsapp.ia_habilitada} onChange={handleToggleWaIA} disabled={!config.tier_premium || !tieneAlgunaLlave} className="sr-only peer" />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button onClick={() => handleWhatsappProveedor('baileys')} className={`relative border-2 p-5 rounded-3xl text-left transition-all flex flex-col gap-2 ${config.whatsapp.proveedor === 'baileys' ? 'bg-green-50 border-green-500 ring-4 ring-green-500/10' : 'bg-white border-slate-200 hover:border-green-200'}`}>
              <div className="flex justify-between items-center w-full">
                <QrCode className={config.whatsapp.proveedor === 'baileys' ? 'text-green-600' : 'text-slate-400'} size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gratis</span>
              </div>
              <h4 className="font-black text-slate-800 mt-2 text-sm">Baileys (QR Web)</h4>
            </button>

            <button onClick={() => handleWhatsappProveedor('360dialog')} className={`relative border-2 p-5 rounded-3xl text-left transition-all flex flex-col gap-2 ${config.whatsapp.proveedor === '360dialog' ? 'bg-cyan-50 border-cyan-500 ring-4 ring-cyan-500/10' : 'bg-white border-slate-200 hover:border-cyan-200'}`}>
              <div className="flex justify-between items-center w-full">
                <MessageSquare className={config.whatsapp.proveedor === '360dialog' ? 'text-cyan-600' : 'text-slate-400'} size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Oficial</span>
              </div>
              <h4 className="font-black text-slate-800 mt-2 text-sm">360dialog API</h4>
            </button>

            <button onClick={() => handleWhatsappProveedor('meta')} className={`relative border-2 p-5 rounded-3xl text-left transition-all flex flex-col gap-2 ${config.whatsapp.proveedor === 'meta' ? 'bg-blue-50 border-blue-500 ring-4 ring-blue-500/10' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
              <div className="flex justify-between items-center w-full">
                <Smartphone className={config.whatsapp.proveedor === 'meta' ? 'text-blue-600' : 'text-slate-400'} size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Oficial</span>
              </div>
              <h4 className="font-black text-slate-800 mt-2 text-sm">Meta Cloud API</h4>
            </button>
          </div>

          {config.whatsapp.proveedor === 'meta' && (
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
              <h4 className="text-sm font-black text-slate-700 flex items-center gap-2"><KeyRound size={16} className="text-blue-500"/> Credenciales Meta Cloud</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">Phone Number ID</label>
                  <input type="text" name="meta_phone_id" value={config.whatsapp.meta_phone_id || ''} onChange={handleWhatsappTextChange} onBlur={() => autoGuardar(config)} placeholder="Ej. 1045627..." className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-slate-700 font-mono text-sm focus:border-blue-500 outline-none transition-all"/>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">Access Token</label>
                  <input type="password" name="meta_api_token" value={config.whatsapp.meta_api_token || ''} onChange={handleWhatsappTextChange} onBlur={() => autoGuardar(config)} placeholder="EAAGm..." className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-slate-700 font-mono text-sm focus:border-blue-500 outline-none transition-all"/>
                </div>
              </div>
            </div>
          )}

          {config.whatsapp.proveedor === '360dialog' && (
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
              <h4 className="text-sm font-black text-slate-700 flex items-center gap-2"><KeyRound size={16} className="text-cyan-500"/> Credenciales 360dialog</h4>
              <Dialog360Webhook apiUrl={apiUrl} showAlert={showAlert} />
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">API Token</label>
                <input type="password" name="dialog360_token" value={config.whatsapp.dialog360_token || ''} onChange={handleWhatsappTextChange} onBlur={() => autoGuardar(config)} placeholder="Pegar token..." className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-slate-700 font-mono text-sm focus:border-cyan-500 outline-none transition-all"/>
              </div>
            </div>
          )}
        </div>

        {/* 4b. VINCULACIÓN BAILEYS (QR) — solo cuando el proveedor elegido es Baileys */}
        {config.whatsapp.proveedor === 'baileys' && (
          <BaileysVinculacion apiUrl={apiUrl} showAlert={showAlert} />
        )}

        {/* 5. GENERADOR DE IMÁGENES */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-pink-50 rounded-xl text-pink-500"><ImageIcon size={20} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Generador de Imágenes</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">DALL-E 3 requiere Premium activo</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { valor: 'ninguno', label: 'Ninguno', sub: 'Apagado', claseActiva: 'bg-slate-100 border-slate-400', reqPremium: false },
              { valor: 'gemini', label: 'Gemini', sub: 'Básico', claseActiva: 'bg-blue-50 border-blue-400', reqPremium: false },
              { valor: 'openai', label: 'DALL-E 3', sub: 'Premium', claseActiva: 'bg-emerald-50 border-emerald-400', reqPremium: true },
              { valor: 'ambos', label: 'Ambos', sub: 'Respaldo', claseActiva: 'bg-purple-50 border-purple-400', reqPremium: true },
            ].map((opt) => {
              const bloqueado = opt.reqPremium && !config.tier_premium;
              return (
                <button
                  key={opt.valor}
                  type="button"
                  onClick={() => handleSeleccionarImagenProveedor(opt.valor)}
                  className={`relative border-2 p-4 rounded-2xl text-center transition-all ${
                    bloqueado ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                    : config.imagen_proveedor === opt.valor ? `cursor-pointer ${opt.claseActiva}` : 'cursor-pointer bg-white border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  {bloqueado && <span className="absolute top-2 right-2 text-slate-400"><Lock size={14} /></span>}
                  <h5 className="font-black text-slate-800 text-sm">{opt.label}</h5>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">{opt.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ConfiguracionIA;