import React, { useState, useEffect } from 'react';
import { ShieldCheck, Database, Zap, KeyRound, Sparkles, Save, Bot, Image as ImageIcon, Lock } from 'lucide-react';

const ConfiguracionIA = ({ apiUrl, showAlert }) => {
  const [config, setConfig] = useState({
    modulo_activo: true,
    tier_premium: false,
    proveedor_activo: 'gemini',
    api_key_gemini: '',
    api_key_openai: '',
    api_key_claude: '',
    gemini_habilitado: true,
    openai_habilitado: false,
    claude_habilitado: false,
    imagen_proveedor: 'gemini',
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

  // 👇 Candado de habilitación por llave. A diferencia de usar "disabled" en
  // el switch (que también bloquearía APAGARLO), esto solo impide ENCENDER un
  // proveedor si no tiene llave guardada. Apagar uno ya activo siempre es libre.
  const handleToggleProveedor = (e, campoLlave, nombreProveedor) => {
    const { name, checked } = e.target;
    if (checked && !config[campoLlave]) {
      showAlert('Falta la llave API', `Primero guarda la llave de ${nombreProveedor} antes de habilitarlo.`, 'error');
      return;
    }
    setConfig(prev => ({ ...prev, [name]: checked }));
  };

  // 👇 Si se DESACTIVA el Premium mientras el generador de imágenes está en
  // una opción que lo requiere (DALL-E 3 / Ambos), regresamos automáticamente a
  // Gemini para no dejar guardada una configuración inconsistente.
  const handleTogglePremium = (e) => {
    const { checked } = e.target;
    setConfig(prev => ({
      ...prev,
      tier_premium: checked,
      imagen_proveedor: (!checked && (prev.imagen_proveedor === 'openai' || prev.imagen_proveedor === 'ambos'))
        ? 'gemini'
        : prev.imagen_proveedor
    }));
  };

  // 👇 Candado del selector de imágenes. "Gemini" y "Ninguno" siempre están
  // libres; "DALL-E 3" y "Ambos" solo se pueden elegir si el Nivel Premium ya está activo.
  const handleSeleccionarImagenProveedor = (valor) => {
    const requierePremium = valor === 'openai' || valor === 'ambos';
    if (requierePremium && !config.tier_premium) {
      showAlert('Requiere Nivel Premium', 'Activa el Nivel Premium antes de elegir DALL-E 3 o "Ambos".', 'error');
      return;
    }
    setConfig(prev => ({ ...prev, imagen_proveedor: valor }));
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
    <div className="p-4 md:p-6 bg-slate-50 h-full overflow-y-auto custom-scrollbar transform-gpu">
      <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ENCABEZADO (el botón de Guardar ahora vive más abajo, junto a la acción) */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-800">Ajustes del Copiloto</h2>
          <p className="text-slate-500">Gestión de llaves API, proveedores y límites de uso.</p>
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

        {/* 👇 SELECTOR DE PROVEEDORES DE TEXTO. El Admin Global SOLO decide qué proveedores
            EXISTEN como opción (switch). Ya NO se elige aquí "cuál está activo": esa decisión
            ahora la toma el propio usuario, una vez por sesión, desde el selector del Chat.
            El switch está protegido: no se puede ENCENDER sin llave guardada (ver
            handleToggleProveedor), pero sí se puede APAGAR libremente en cualquier momento. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`relative border-2 p-5 rounded-3xl shadow-sm transition-all flex items-start justify-between gap-3 ${config.gemini_habilitado ? 'bg-blue-50 border-blue-400 ring-4 ring-blue-500/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-start gap-3">
              <Zap className="text-blue-500 shrink-0 mt-1" size={20}/>
              <div>
                <h4 className="font-black text-slate-800">Gemini (Gratis)</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">Candado interno de 15 consultas/día para no agotar tu cuota gratuita de Google.</p>
                {!config.api_key_gemini && (
                  <p className="text-[11px] font-black text-amber-600 mt-2">⚠️ Guarda su llave para poder habilitarlo.</p>
                )}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                name="gemini_habilitado"
                checked={config.gemini_habilitado}
                onChange={(e) => handleToggleProveedor(e, 'api_key_gemini', 'Gemini')}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className={`relative border-2 p-5 rounded-3xl shadow-sm transition-all flex items-start justify-between gap-3 ${config.openai_habilitado ? 'bg-emerald-50 border-emerald-400 ring-4 ring-emerald-500/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-start gap-3">
              <Sparkles className="text-emerald-500 shrink-0 mt-1" size={20}/>
              <div>
                <h4 className="font-black text-slate-800">ChatGPT (De Pago)</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">Mayor razonamiento lógico, sin límite artificial. Requiere saldo en OpenAI.</p>
                {!config.api_key_openai && (
                  <p className="text-[11px] font-black text-amber-600 mt-2">⚠️ Guarda su llave para poder habilitarlo.</p>
                )}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                name="openai_habilitado"
                checked={config.openai_habilitado}
                onChange={(e) => handleToggleProveedor(e, 'api_key_openai', 'ChatGPT')}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className={`relative border-2 p-5 rounded-3xl shadow-sm transition-all flex items-start justify-between gap-3 ${config.claude_habilitado ? 'bg-orange-50 border-orange-400 ring-4 ring-orange-500/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-start gap-3">
              <Bot className="text-orange-500 shrink-0 mt-1" size={20}/>
              <div>
                <h4 className="font-black text-slate-800">Claude (De Pago)</h4>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">Excelente razonamiento y disciplina siguiendo instrucciones. Requiere saldo en Anthropic.</p>
                {!config.api_key_claude && (
                  <p className="text-[11px] font-black text-amber-600 mt-2">⚠️ Guarda su llave para poder habilitarlo.</p>
                )}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                name="claude_habilitado"
                checked={config.claude_habilitado}
                onChange={(e) => handleToggleProveedor(e, 'api_key_claude', 'Claude')}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>
        <p className="text-xs text-slate-400 font-medium -mt-2 ml-1">
          💡 Aquí solo decides qué proveedores existen como opción. El usuario elegirá cuál usar al iniciar su sesión en el Chat.
        </p>

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

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Llave de Claude (Anthropic)
              </label>
              <input 
                type="text" 
                name="api_key_claude" 
                value={config.api_key_claude || ''} 
                onChange={handleChange}
                placeholder="Pegar llave sk-ant-..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-700 font-mono text-sm focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-slate-300"
              />
            </div>
          </div>
        </div>

        {/* 👇 BOTÓN GUARDAR: reubicado aquí, justo después de configurar proveedores y
            llaves — el punto natural donde el Admin ya tomó sus decisiones principales. */}
        <div className="flex justify-end">
          <button 
            onClick={guardarConfiguracion}
            disabled={isSaving}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar Ajustes'}
          </button>
        </div>

        {/* PREMIUM TIER TOGGLE — ahora va PRIMERO: se activa antes de poder elegir */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border border-indigo-500/30 p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
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
              Actívalo primero para desbloquear las opciones de DALL-E 3 en el Generador de Imágenes y desactivar el límite de 15 consultas diarias en reportes financieros.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3 z-10 bg-slate-950/50 p-3 rounded-2xl border border-slate-700">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="tier_premium" 
                checked={config.tier_premium} 
                onChange={handleTogglePremium} 
                className="sr-only peer" 
              />
              <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 shadow-inner"></div>
            </label>
          </div>
        </div>

        {/* SELECTOR DE PROVEEDOR DE IMÁGENES — ahora va DESPUÉS del Premium.
            Gemini y Ninguno siempre están libres; DALL-E 3 y Ambos se bloquean
            visualmente (candado) hasta que el Premium de arriba esté activo. */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-pink-50 rounded-xl text-pink-500">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Generador de Imágenes (Studio Mágico)</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Gemini genera gratis · DALL-E requiere Premium</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { valor: 'gemini', label: 'Gemini', sub: 'Gratis', claseActiva: 'bg-blue-50 border-blue-400 ring-4 ring-blue-500/10', requierePremium: false },
              { valor: 'openai', label: 'DALL-E 3', sub: 'Premium', claseActiva: 'bg-emerald-50 border-emerald-400 ring-4 ring-emerald-500/10', requierePremium: true },
              { valor: 'ambos', label: 'Ambos', sub: 'Gemini + respaldo DALL-E', claseActiva: 'bg-purple-50 border-purple-400 ring-4 ring-purple-500/10', requierePremium: true },
              { valor: 'ninguno', label: 'Ninguno', sub: 'Desactivado', claseActiva: 'bg-slate-100 border-slate-400 ring-4 ring-slate-500/10', requierePremium: false },
            ].map((opt) => {
              const bloqueado = opt.requierePremium && !config.tier_premium;
              return (
                <button
                  key={opt.valor}
                  type="button"
                  onClick={() => handleSeleccionarImagenProveedor(opt.valor)}
                  className={`relative border-2 p-4 rounded-2xl text-center transition-all ${
                    bloqueado
                      ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                      : config.imagen_proveedor === opt.valor
                        ? `cursor-pointer ${opt.claseActiva}`
                        : 'cursor-pointer bg-white border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  {bloqueado && (
                    <span className="absolute top-2 right-2 text-slate-400">
                      <Lock size={14} />
                    </span>
                  )}
                  <h5 className="font-black text-slate-800 text-sm">{opt.label}</h5>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">{opt.sub}</p>
                </button>
              );
            })}
          </div>
          {!config.tier_premium && (
            <p className="text-[11px] text-amber-600 font-bold -mt-2">
              🔒 Activa el Nivel Premium de arriba para desbloquear DALL-E 3 y Ambos.
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default ConfiguracionIA;