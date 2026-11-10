import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { X, Send, Bot, Loader2 } from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';

// =========================================================================
// 🤖 ASISTENTE IA DEL KIOSCO — Punto 5 del roadmap WhatsApp/IA
// -------------------------------------------------------------------------
// Componente 100% autónomo: se auto-gestiona (abierto/cerrado, historial
// local, sesión anónima), no toca el estado global del carrito de
// Kiosco.js. Es un ASESOR de dudas, nunca arma el pedido.
//
// Tres flujos de intención (detección simple por palabras clave, sin IA,
// para no gastar cuota en los casos más predecibles):
//   A) Estado/historial de pedido ("mi pedido", "mi orden", "cuánto falta"...)
//      -> Si hay clienteActivo: reutiliza misPedidos (ya cargado por
//         Kiosco.js vía GET /clientes/:id/pedidos), cero fetch nuevo.
//      -> Si es invitado: pide identificarse (botón ya existente arriba
//         a la derecha, via onIrAIdentificarse).
//   B) Puntos de fidelidad ("mis puntos", "cuántos puntos tengo")
//      -> Si hay clienteActivo: responde directo con clienteActivo.puntos.
//      -> Si es invitado: pide identificarse.
//   C) Cualquier otra pregunta (menú/precios/extras/ingredientes/recomendación)
//      -> POST /kiosco-chat-ia/consultar (IA real, Gemini, aislado por
//         empresa_id, con candado anti-abuso por sesión). Si hay sesión
//         iniciada, se envía cliente_id para que el backend también pueda
//         responder ahí mismo preguntas de puntos/pedido si el cliente las
//         formula de forma menos directa (red de seguridad del prompt).
// =========================================================================

const SESSION_STORAGE_KEY = 'kiosco_sesion_anonima_id';

const generarUUID = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'anon-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
};

const obtenerIdentificadorSesion = (clienteActivo) => {
  if (clienteActivo?.id) return `cliente_${clienteActivo.id}`;
  let id = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = generarUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
};

// 🔧 FIX: detección por PALABRA SUELTA (con límites \b), ya no por frase exacta.
// Antes "mi pedido" no coincidía con "mi ULTIMO pedido" (palabra en medio).
const esConsultaDeEstadoPedido = (texto) => {
  const t = texto.toLowerCase();
  const patronesPalabra = [/\bpedido\b/, /\bpedidos\b/, /\borden\b/, /\bordenes\b/, /\bórdenes\b/, /\bcompra\b/];
  const frasesLibres = [
    'como va', 'cómo va', 'ya va', 'cuanto falta', 'cuánto falta', 'ya esta',
    'ya está', 'status', 'estado de', 'donde va', 'dónde va', 'historial'
  ];
  return patronesPalabra.some(p => p.test(t)) || frasesLibres.some(f => t.includes(f));
};

// 🆕 Detección de intención "puntos de fidelidad" — resuelta localmente, sin IA
const esConsultaDePuntos = (texto) => {
  const t = texto.toLowerCase();
  return /\bpuntos?\b/.test(t) && !esConsultaDeEstadoPedido(texto);
};

const extraerNumeroPedido = (texto) => {
  const match = texto.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

const AsistenteKioscoIA = ({ apiUrl, configGlobal, clienteActivo, misPedidos, productos, clasificaciones, catalogoIngredientes, onIrAIdentificarse }) => {
  const [abierto, setAbierto] = useState(false);
  const [asistenteConfig, setAsistenteConfig] = useState({ fuente: 'default' });
  const [mensajes, setMensajes] = useState([]);
  const [inputTexto, setInputTexto] = useState('');
  const [estadoAnimo, setEstadoAnimo] = useState('reposo'); // reposo | pensando | feliz | confundido
  const [huboSaludo, setHuboSaludo] = useState(false);
  const scrollRef = useRef(null);

  // ==========================================
  // Cargar la configuración del personaje (nombre, saludo, media)
  // ==========================================
  useEffect(() => {
    apiFetch(`${apiUrl}/kiosco-asistente/empresa`)
      .then(res => res.json())
      .then(data => {
        if (data?.asistente) setAsistenteConfig(data.asistente);
      })
      .catch(() => {});
  }, [apiUrl]);

  // ==========================================
  // Saludo inicial configurable — se muestra la primera vez que se abre el chat
  // ==========================================
  useEffect(() => {
    if (abierto && !huboSaludo) {
      const saludo = asistenteConfig.mensaje_saludo || '¡Hola! ¿En qué te puedo ayudar hoy?';
      setMensajes([{ rol: 'asistente', texto: saludo }]);
      setHuboSaludo(true);
    }
  }, [abierto, huboSaludo, asistenteConfig.mensaje_saludo]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes, estadoAnimo]);

  // ==========================================
  // FLUJO A — Consulta de estado/historial de pedido (reusa misPedidos, cero fetch nuevo)
  // ==========================================
  const resolverConsultaPedido = useCallback((texto) => {
    if (!clienteActivo) {
      setMensajes(prev => [...prev, {
        rol: 'asistente',
        texto: 'Para consultar tu pedido necesito que te identifiques primero. Usa el botón "👤 Identificarme" arriba.',
        accion: 'identificarse'
      }]);
      setEstadoAnimo('confundido');
      return;
    }

    const numeroBuscado = extraerNumeroPedido(texto);
    const listaPedidos = Array.isArray(misPedidos) ? misPedidos : [];

    let pedido = null;
    if (numeroBuscado) {
      pedido = listaPedidos.find(p => Number(p.numero_pedido) === numeroBuscado);
    } else {
      pedido = listaPedidos[0]; // el más reciente
    }

    if (!pedido) {
      setMensajes(prev => [...prev, {
        rol: 'asistente',
        texto: numeroBuscado
          ? `No encontré ningún pedido tuyo con el número ${numeroBuscado}.`
          : 'Aún no encuentro pedidos tuyos registrados.'
      }]);
      setEstadoAnimo('confundido');
      return;
    }

    setMensajes(prev => [...prev, {
      rol: 'asistente',
      texto: `Tu pedido #${pedido.numero_pedido} está en estado: "${pedido.estado_preparacion}". ${
        pedido.estado_preparacion === 'Listo' ? '¡Ya casi lo tienes! 🎉' :
        pedido.estado_preparacion === 'Preparando' ? 'Ya está en la cocina. 🔥' :
        pedido.estado_preparacion === 'Entregado' ? '¡Ya fue entregado! Disfrútalo. 🍔' : ''
      }`.trim()
    }]);
    setEstadoAnimo('feliz');
  }, [clienteActivo, misPedidos]);

  // ==========================================
  // 🆕 FLUJO B — Puntos de fidelidad (resuelto 100% local, sin IA)
  // ==========================================
  const resolverConsultaPuntos = useCallback(() => {
    if (!clienteActivo) {
      setMensajes(prev => [...prev, {
        rol: 'asistente',
        texto: 'Para consultar tus puntos necesito que te identifiques primero. Usa el botón "👤 Identificarme" arriba.',
        accion: 'identificarse'
      }]);
      setEstadoAnimo('confundido');
      return;
    }

    const puntos = clienteActivo.puntos ?? 0;
    setMensajes(prev => [...prev, {
      rol: 'asistente',
      texto: `Tienes ${puntos} puntos de fidelidad acumulados. 🎁`
    }]);
    setEstadoAnimo('feliz');
  }, [clienteActivo]);

  // ==========================================
  // FLUJO C — Pregunta de menú/precios/extras vía IA real
  // ==========================================
  const consultarIAMenu = useCallback(async (texto) => {
    setEstadoAnimo('pensando');
    try {
      const identificador_sesion = obtenerIdentificadorSesion(clienteActivo);
      const res = await apiFetch(`${apiUrl}/kiosco-chat-ia/consultar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregunta: texto,
          identificador_sesion,
          cliente_id: clienteActivo?.id || null, // 🆕 habilita respuestas directas de puntos/pedidos del lado del backend como red de seguridad
          productos: (productos || []).map(p => ({
            nombre: p.nombre,
            categoria: p.categoria,
            precio_base: p.precio_base, // 🔧 FIX: la columna real es "precio_base", ya no "precio"
            descripcion: p.descripcion
          })),
          clasificaciones: (clasificaciones || []).map(c => ({ nombre: c.nombre })),
          catalogoIngredientes: (catalogoIngredientes || []).map(i => ({
            nombre: i.nombre,
            precio: i.precio ?? i.precio_extra ?? i.precioExtra ?? 0,
            tipo: i.tipo
          })), // 🆕 extras/ingredientes con precio — antes nunca se enviaban
          nombre_negocio: configGlobal?.nombre_negocio
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMensajes(prev => [...prev, { rol: 'asistente', texto: data.respuesta }]);
        setEstadoAnimo('feliz');
      } else {
        setMensajes(prev => [...prev, { rol: 'asistente', texto: data.error || 'No pude responder en este momento. Intenta de nuevo.' }]);
        setEstadoAnimo('confundido');
      }
    } catch (e) {
      setMensajes(prev => [...prev, { rol: 'asistente', texto: 'Tuve un problema de conexión. Intenta de nuevo en un momento.' }]);
      setEstadoAnimo('confundido');
    }
  }, [apiUrl, clienteActivo, productos, clasificaciones, catalogoIngredientes, configGlobal]);

  const enviarMensaje = (e) => {
    e.preventDefault();
    const texto = inputTexto.trim();
    if (!texto) return;

    setMensajes(prev => [...prev, { rol: 'usuario', texto }]);
    setInputTexto('');

    if (esConsultaDeEstadoPedido(texto)) {
      resolverConsultaPedido(texto);
    } else if (esConsultaDePuntos(texto)) {
      resolverConsultaPuntos();
    } else {
      consultarIAMenu(texto);
    }
  };

  useEffect(() => {
    if (estadoAnimo === 'feliz' || estadoAnimo === 'confundido') {
      const t = setTimeout(() => setEstadoAnimo('reposo'), 2500);
      return () => clearTimeout(t);
    }
  }, [estadoAnimo]);

  // ==========================================
  // RENDER DEL PERSONAJE (Nivel 1 default / 2 biblioteca / 3 personalizado)
  // ==========================================
  const renderPersonaje = (size = 32) => {
    const estiloEstado =
      estadoAnimo === 'pensando' ? 'animate-pulse' :
      estadoAnimo === 'feliz' ? 'animate-bounce' :
      estadoAnimo === 'confundido' ? 'animate-[wiggle_0.3s_ease-in-out_3]' : '';

    let contenido = <Bot size={size} className="text-white" />;

    if (asistenteConfig.fuente === 'personalizado' && asistenteConfig.url_personalizado) {
      if (asistenteConfig.tipo_personalizado === 'video') {
        contenido = <video src={asistenteConfig.url_personalizado} muted loop autoPlay playsInline className="w-full h-full object-cover rounded-full" />;
      } else if (asistenteConfig.tipo_personalizado === 'lottie') {
        contenido = <Player autoplay loop src={asistenteConfig.url_personalizado} style={{ width: '100%', height: '100%' }} />;
      } else {
        contenido = <img src={asistenteConfig.url_personalizado} alt="Asistente" className="w-full h-full object-cover rounded-full" />;
      }
    } else if (asistenteConfig.fuente === 'biblioteca' && asistenteConfig.biblioteca_url_media) {
      if (asistenteConfig.biblioteca_tipo === 'video') {
        contenido = <video src={asistenteConfig.biblioteca_url_media} muted loop autoPlay playsInline className="w-full h-full object-cover rounded-full" />;
      } else if (asistenteConfig.biblioteca_tipo === 'lottie') {
        contenido = <Player autoplay loop src={asistenteConfig.biblioteca_url_media} style={{ width: '100%', height: '100%' }} />;
      } else {
        contenido = <img src={asistenteConfig.biblioteca_url_media} alt="Asistente" className="w-full h-full object-cover rounded-full" />;
      }
    }

    return <div className={`w-full h-full flex items-center justify-center ${estiloEstado}`}>{contenido}</div>;
  };

  return (
    <>
      {/* Burbuja flotante */}
      <button
        onClick={() => setAbierto(prev => !prev)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[55] w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center overflow-hidden border-4 border-white hover:scale-105 active:scale-95 transition-all"
        aria-label="Abrir asistente del Kiosco"
      >
        {abierto ? <X size={28} className="text-white" /> : renderPersonaje(36)}
      </button>

      {/* Ventana de chat */}
      {abierto && (
        <div className="fixed bottom-24 right-4 sm:bottom-28 sm:right-6 z-[56] w-[90vw] max-w-sm h-[60vh] max-h-[520px] bg-white rounded-[28px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden flex items-center justify-center shrink-0">
              {renderPersonaje(22)}
            </div>
            <div className="min-w-0">
              <p className="text-white font-black truncate">{asistenteConfig.nombre_asistente || 'Asistente'}</p>
              <p className="text-indigo-100 text-[11px] font-medium">
                {estadoAnimo === 'pensando' ? 'Pensando...' : 'En línea'}
              </p>
            </div>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
            {mensajes.map((m, idx) => (
              <div key={idx} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-snug ${
                  m.rol === 'usuario'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'
                }`}>
                  {m.texto}
                  {m.accion === 'identificarse' && onIrAIdentificarse && (
                    <button
                      onClick={onIrAIdentificarse}
                      className="mt-2 block w-full text-center bg-blue-50 text-blue-600 font-black text-xs py-2 rounded-xl hover:bg-blue-100 transition"
                    >
                      👤 Identificarme
                    </button>
                  )}
                </div>
              </div>
            ))}
            {estadoAnimo === 'pensando' && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                  <span className="text-slate-400 text-xs font-bold">Escribiendo...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={enviarMensaje} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
            <input
              value={inputTexto}
              onChange={e => setInputTexto(e.target.value)}
              placeholder="Escribe tu duda..."
              disabled={estadoAnimo === 'pensando'}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputTexto.trim() || estadoAnimo === 'pensando'}
              className="bg-indigo-600 hover:bg-indigo-700 text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AsistenteKioscoIA;