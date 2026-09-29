import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, TrendingUp, Users, Lightbulb } from 'lucide-react';
import { useMotorIA } from './useMotorIA';

const ChatCopiloto = ({ apiUrl, user, showAlert }) => {
  const { consultarIA, isLoading } = useMotorIA(apiUrl);
  const [inputTexto, setInputTexto] = useState('');
  const [contextoActivo, setContextoActivo] = useState('/ia/ventas'); // Por defecto: Ventas
  const [mensajes, setMensajes] = useState([
    { 
      rol: 'ai', 
      contenido: `¡Hola ${user?.nombre || 'Admin'}! Soy AdminIA ✨\nHe cargado tus finanzas y ventas recientes. ¿Qué deseas analizar hoy?`,
      tipo: 'bienvenida'
    }
  ]);
  
  const mensajesEndRef = useRef(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, isLoading]);

  const enviarMensaje = async (e) => {
    if (e) e.preventDefault();
    if (!inputTexto.trim()) return;

    const promptUser = inputTexto.trim();
    setInputTexto('');
    
    // Agregar el mensaje del usuario a la UI
    setMensajes(prev => [...prev, { rol: 'user', contenido: promptUser }]);

    try {
      // Disparamos la petición usando el endpoint del contexto seleccionado
      const data = await consultarIA(contextoActivo, promptUser);
      setMensajes(prev => [...prev, { rol: 'ai', contenido: data.respuesta }]);
    } catch (error) {
      showAlert('Error en la IA', error.message, 'error');
      setMensajes(prev => [...prev, { rol: 'ai', contenido: '⚠️ Lo siento, tuve un problema de conexión. Intenta de nuevo.' }]);
    }
  };

  const setContexto = (ruta, mensajeSistema) => {
    setContextoActivo(ruta);
    setMensajes(prev => [...prev, { rol: 'ai', contenido: mensajeSistema, tipo: 'sistema' }]);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
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
          onClick={() => setContexto('/ia/ventas', '📈 Modo Analista Activado: Pregúntame sobre las ventas de hoy, mermas, platillos más vendidos o cortes de caja.')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${contextoActivo === '/ia/ventas' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <TrendingUp size={14} /> Finanzas & Ventas
        </button>
        <button 
          onClick={() => setContexto('/ia/empleados', '👥 Modo Gestor RH Activado: Pregúntame sobre asistencias, retardos, nómina o rendimiento del personal en cocina.')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${contextoActivo === '/ia/empleados' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Users size={14} /> Gestión de Personal
        </button>
        <button 
          onClick={() => setContexto('/ia/chat', '💡 Modo Creativo Activado: Pregúntame sobre estrategias, ideas de posteos para redes sociales o mejoras para el restaurante.')}
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
    </div>
  );
};

export default ChatCopiloto;