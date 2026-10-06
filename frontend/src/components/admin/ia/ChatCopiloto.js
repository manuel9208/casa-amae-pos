import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, TrendingUp, Users, Lightbulb, Zap, BarChart3 } from 'lucide-react';
import { useMotorIA } from './useMotorIA';
import ModalGraficas from './ModalGraficas';

const ChatCopiloto = ({ apiUrl, user, showAlert }) => {
  const { consultarIA, isLoading } = useMotorIA(apiUrl);
  const [inputTexto, setInputTexto] = useState('');
  const [contextoActivo, setContextoActivo] = useState('/ia/ventas'); // Por defecto: Ventas

  // 👇 NUEVO: El historial ahora se carga dinámicamente desde el backend (reinicio
  // diario). Arranca vacío; el useEffect de "cargarHistorial" lo llena.
  const [mensajes, setMensajes] = useState([]);
  const primeraCargaRef = useRef(true);

  const MENSAJES_SISTEMA = {
    '/ia/ventas': '📈 Modo Analista Activado: Pregúntame sobre las ventas de hoy, mermas, platillos más vendidos o cortes de caja.',
    '/ia/empleados': '👥 Modo Gestor RH Activado: Pregúntame sobre asistencias, retardos, nómina o rendimiento del personal en cocina.',
    '/ia/chat': '💡 Modo Creativo Activado: Pregúntame sobre estrategias, ideas de posteos para redes sociales o mejoras para el restaurante.'
  };

  // 👇 NUEVO: Selector de proveedor de IA elegido por el USUARIO, una vez por sesión
  // de chat (no mensaje a mensaje). Se llena dinámicamente según lo que el Admin
  // Global haya habilitado en Ajustes de IA (gemini_habilitado/openai_habilitado/claude_habilitado).
  const [proveedoresDisponibles, setProveedoresDisponibles] = useState([]);
  const [proveedorElegido, setProveedorElegido] = useState('gemini');
  const [cargandoProveedores, setCargandoProveedores] = useState(true);

  // 👇 NUEVO: Selector de Tiempo (Semana/Mes/Año/Rango). "Mes" queda como default.
  // Solo aplica a Finanzas (/ia/ventas) y RRHH (/ia/empleados); el Chat creativo
  // no maneja periodos de tiempo. "fechaReferencia" permite elegir CUÁL semana/mes/
  // año ver (no solo el actual), tal como se definió en el diseño.
  const [modoTiempo, setModoTiempo] = useState('mes');
  const [fechaReferencia, setFechaReferencia] = useState('');
  const [rangoInicio, setRangoInicio] = useState('');
  const [rangoFin, setRangoFin] = useState('');
  const [mostrarSelectorFecha, setMostrarSelectorFecha] = useState(false);

  // 👇 NUEVO: Guarda el "graficoData" del mensaje que el usuario quiere visualizar.
  // null = modal cerrado. Solo /ia/ventas devuelve graficoData por ahora.
  const [graficoActivo, setGraficoActivo] = useState(null);
  
  const mensajesEndRef = useRef(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, isLoading]);

  // 👇 NUEVO: Carga el historial de HOY para el contexto activo. Si no hay historial
  // (por ser un día nuevo o la primera vez), muestra bienvenida (1ra carga) o el
  // mensaje de "modo activado" (al cambiar de pestaña).
  useEffect(() => {
    const cargarHistorial = async () => {
      if (!user?.id) {
        setMensajes([{ rol: 'ai', contenido: MENSAJES_SISTEMA[contextoActivo] || 'Modo activado.', tipo: 'sistema' }]);
        return;
      }
      try {
        const res = await fetch(`${apiUrl}/ia/historial?usuario_id=${user.id}&contexto=${encodeURIComponent(contextoActivo)}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.mensajes) && data.mensajes.length > 0) {
          setMensajes(data.mensajes);
        } else {
          const esPrimeraCarga = primeraCargaRef.current;
          const contenido = esPrimeraCarga
            ? `¡Hola ${user?.nombre || 'Admin'}! Soy AdminIA ✨\nHe cargado tus finanzas y ventas recientes. ¿Qué deseas analizar hoy?`
            : (MENSAJES_SISTEMA[contextoActivo] || 'Modo activado.');
          setMensajes([{ rol: 'ai', contenido, tipo: esPrimeraCarga ? 'bienvenida' : 'sistema' }]);
        }
      } catch (error) {
        console.error('No se pudo cargar el historial del chat:', error);
      } finally {
        primeraCargaRef.current = false;
      }
    };
    cargarHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextoActivo, user?.id, apiUrl]);

  // 👇 NUEVO: Guarda el historial completo tras cada intercambio (UPSERT en backend).
  const guardarHistorial = async (listaMensajes) => {
    if (!user?.id) return;
    try {
      await fetch(`${apiUrl}/ia/historial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: user.id, contexto: contextoActivo, mensajes: listaMensajes })
      });
    } catch (error) {
      console.error('No se pudo guardar el historial del chat:', error);
    }
  };

  // 👇 NUEVO: Carga, una sola vez al abrir el Chat, qué proveedores de IA están
  // habilitados por el Admin Global (/ia/configuracion), y arma la lista de
  // pastillas seleccionables. El usuario elige una sola vez por sesión.
  useEffect(() => {
    const cargarProveedores = async () => {
      try {
        const res = await fetch(`${apiUrl}/ia/configuracion`);
        const data = await res.json();
        if (data.success) {
          const lista = [];
          if (data.gemini_habilitado !== false) lista.push({ valor: 'gemini', label: 'Gemini', icono: <Zap size={13} /> });
          if (data.openai_habilitado === true) lista.push({ valor: 'openai', label: 'ChatGPT', icono: <Sparkles size={13} /> });
          if (data.claude_habilitado === true) lista.push({ valor: 'claude', label: 'Claude', icono: <Bot size={13} /> });

          setProveedoresDisponibles(lista);
          // Si el default (gemini) no está disponible, caemos al primero que sí lo esté
          setProveedorElegido(prev => (lista.some(p => p.valor === prev) ? prev : (lista[0]?.valor || 'gemini')));
        }
      } catch (error) {
        console.error('No se pudo cargar la lista de proveedores de IA:', error);
      } finally {
        setCargandoProveedores(false);
      }
    };
    cargarProveedores();
  }, [apiUrl]);

  const enviarMensaje = async (e) => {
    if (e) e.preventDefault();
    if (!inputTexto.trim()) return;

    // 👇 NUEVO: Si el Admin Global no habilitó ningún proveedor, bloqueamos antes de gastar la consulta
    if (proveedoresDisponibles.length === 0) {
      showAlert('Sin proveedores de IA', 'El Administrador Global aún no ha habilitado ningún proveedor de IA en Ajustes.', 'error');
      return;
    }

    // 👇 NUEVO: El selector de tiempo solo aplica a Finanzas y RRHH
    const usaSelectorTiempo = contextoActivo === '/ia/ventas' || contextoActivo === '/ia/empleados';
    if (usaSelectorTiempo && modoTiempo === 'rango' && (!rangoInicio || !rangoFin)) {
      showAlert('Rango incompleto', 'Elige la fecha de inicio y la fecha de fin para comparar ese periodo.', 'error');
      return;
    }

    const promptUser = inputTexto.trim();
    setInputTexto('');
    
    // 👇 Construimos la lista explícita (no dependemos del closure de "mensajes")
    // para poder guardarla de inmediato en el historial sin desfases de estado.
    const mensajesConUsuario = [...mensajes, { rol: 'user', contenido: promptUser }];
    setMensajes(mensajesConUsuario);

    try {
      const extraParams = usaSelectorTiempo ? {
        modoTiempo,
        fechaReferencia: fechaReferencia || null,
        rangoInicio: modoTiempo === 'rango' ? rangoInicio : null,
        rangoFin: modoTiempo === 'rango' ? rangoFin : null,
      } : {};

      const data = await consultarIA(contextoActivo, promptUser, proveedorElegido, extraParams);
      const mensajesFinal = [...mensajesConUsuario, { rol: 'ai', contenido: data.respuesta, graficoData: data.graficoData || null }];
      setMensajes(mensajesFinal);
      guardarHistorial(mensajesFinal); // 👈 NUEVO: persiste el historial de HOY
    } catch (error) {
      showAlert('Error en la IA', error.message, 'error');
      const mensajesConError = [...mensajesConUsuario, { rol: 'ai', contenido: '⚠️ Lo siento, tuve un problema de conexión. Intenta de nuevo.' }];
      setMensajes(mensajesConError);
      guardarHistorial(mensajesConError); // 👈 NUEVO: mantiene continuidad del historial
    }
  };

  const setContexto = (ruta) => {
    setContextoActivo(ruta);
    // 👇 El mensaje de "modo activado" ya no se inyecta aquí: el useEffect de
    // "cargarHistorial" se encarga, mostrando el historial de HOY de ese contexto
    // si existe, o el mensaje de sistema si es la primera vez que se visita hoy.
    setModoTiempo('mes');
    setFechaReferencia('');
    setRangoInicio('');
    setRangoFin('');
    setMostrarSelectorFecha(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

      {/* 0. SELECTOR DE PROVEEDOR DE IA (elegido UNA VEZ por sesión de Chat) */}
      {!cargandoProveedores && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Motor IA:</span>
          {proveedoresDisponibles.length === 0 ? (
            <span className="text-[11px] font-bold text-amber-600">⚠️ Ningún proveedor habilitado por el Administrador.</span>
          ) : (
            proveedoresDisponibles.map(p => (
              <button
                key={p.valor}
                type="button"
                onClick={() => setProveedorElegido(p.valor)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${proveedorElegido === p.valor ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
              >
                {p.icono} {p.label}
              </button>
            ))
          )}
        </div>
      )}

      {/* 👇 NUEVO: SELECTOR DE TIEMPO (Semana/Mes/Año/Rango). Solo aparece en Finanzas
          y RRHH, ya que Marketing & Ideas es chat libre sin datos de periodo. "Mes"
          queda marcado por default, tal como se definió en el diseño. */}
      {!cargandoProveedores && (contextoActivo === '/ia/ventas' || contextoActivo === '/ia/empleados') && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Periodo:</span>
          {[
            { valor: 'semana', label: 'Semana' },
            { valor: 'mes', label: 'Mes' },
            { valor: 'año', label: 'Año' },
            { valor: 'rango', label: 'Rango' },
          ].map(opt => (
            <button
              key={opt.valor}
              type="button"
              onClick={() => { setModoTiempo(opt.valor); setMostrarSelectorFecha(true); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${modoTiempo === opt.valor ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
            >
              {opt.label}
            </button>
          ))}

          {/* Mini date-picker, cambia según el modo elegido */}
          {mostrarSelectorFecha && (
            <div className="flex items-center gap-2 ml-1 flex-wrap">
              {modoTiempo === 'semana' && (
                <input
                  type="date"
                  value={fechaReferencia}
                  onChange={(e) => setFechaReferencia(e.target.value)}
                  title="Elige cualquier día de la semana que quieres revisar"
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-emerald-500"
                />
              )}
              {modoTiempo === 'mes' && (
                <input
                  type="month"
                  value={fechaReferencia ? fechaReferencia.substring(0, 7) : ''}
                  onChange={(e) => setFechaReferencia(e.target.value ? `${e.target.value}-01` : '')}
                  title="Elige el mes que quieres revisar"
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-emerald-500"
                />
              )}
              {modoTiempo === 'año' && (
                <input
                  type="number"
                  min="2020"
                  max="2100"
                  placeholder="Año"
                  value={fechaReferencia ? fechaReferencia.substring(0, 4) : ''}
                  onChange={(e) => setFechaReferencia(e.target.value ? `${e.target.value}-01-01` : '')}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 w-20 bg-white outline-none focus:border-emerald-500"
                />
              )}
              {modoTiempo === 'rango' && (
                <>
                  <input
                    type="date"
                    value={rangoInicio}
                    onChange={(e) => setRangoInicio(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-emerald-500"
                  />
                  <span className="text-slate-400 text-xs">a</span>
                  <input
                    type="date"
                    value={rangoFin}
                    onChange={(e) => setRangoFin(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-emerald-500"
                  />
                </>
              )}
              {!fechaReferencia && modoTiempo !== 'rango' && (
                <span className="text-[10px] text-slate-400 italic">(actual, si no eliges)</span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* 1. ZONA DE MENSAJES */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 space-y-6">
        {mensajes.map((msg, idx) => (
          <div key={idx} className={`flex w-full ${msg.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${msg.rol === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full flex items-center justify-center shadow-sm ${msg.rol === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'}`}>
                {msg.rol === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>

              {/* Burbuja */}
              <div className={`p-4 rounded-2xl ${
                msg.rol === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-500/20' 
                : msg.tipo === 'sistema' 
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-tl-sm text-sm'
                  : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm shadow-sm'
              }`}>
                <p className="whitespace-pre-line leading-relaxed text-[15px]">{msg.contenido}</p>

                {/* 👇 NUEVO: Botón "Ver Gráficas", solo aparece si este mensaje trae graficoData */}
                {msg.graficoData && (
                  <button
                    type="button"
                    onClick={() => setGraficoActivo(msg.graficoData)}
                    className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-full transition-all border border-indigo-200"
                  >
                    <BarChart3 size={14} /> Ver Gráficas
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Indicador de "Escribiendo..." */}
        {isLoading && (
          <div className="flex w-full justify-start">
            <div className="flex gap-3 max-w-[80%] flex-row">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center">
                <Sparkles size={14} className="animate-spin" />
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={mensajesEndRef} />
      </div>

      {/* 2. ZONA DE ACCIONES RÁPIDAS Y ENRUTAMIENTO (Context Routing) */}
      <div className="bg-white border-t border-slate-200 p-3 flex overflow-x-auto no-scrollbar gap-2 shrink-0">
        <button 
          onClick={() => setContexto('/ia/ventas')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${contextoActivo === '/ia/ventas' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <TrendingUp size={14} /> Finanzas & Ventas
        </button>
        <button 
          onClick={() => setContexto('/ia/empleados')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${contextoActivo === '/ia/empleados' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Users size={14} /> Gestión de Personal
        </button>
        <button 
          onClick={() => setContexto('/ia/chat')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${contextoActivo === '/ia/chat' ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Lightbulb size={14} /> Marketing & Ideas
        </button>
      </div>

      {/* 3. INPUT DE TEXTO */}
      <form onSubmit={enviarMensaje} className="bg-white p-3 md:p-4 border-t border-slate-100 flex items-end gap-2 shrink-0">
        <div className="flex-1 bg-slate-100 rounded-2xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all px-4 py-2 flex items-center min-h-[50px]">
          <textarea
            rows="1"
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensaje();
              }
            }}
            placeholder="Escribe tu mensaje a la IA..."
            className="w-full bg-transparent border-none outline-none resize-none text-slate-700 text-sm md:text-base max-h-32"
            disabled={isLoading}
          />
        </div>
        <button 
          type="submit" 
          disabled={!inputTexto.trim() || isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white p-3 md:p-4 rounded-2xl transition-all shadow-md active:scale-95 shrink-0 flex items-center justify-center"
        >
          <Send size={20} className={inputTexto.trim() && !isLoading ? 'translate-x-0.5 -translate-y-0.5 transition-transform' : ''} />
        </button>
      </form>

      {/* 👇 NUEVO: Modal de gráficas, solo se monta cuando hay un gráfico activo elegido */}
      {graficoActivo && (
        <ModalGraficas graficoData={graficoActivo} onClose={() => setGraficoActivo(null)} />
      )}
    </div>
  );
};

export default ChatCopiloto;