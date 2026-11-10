import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, ArrowLeft, Loader2, Hand, Clock, Inbox } from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';

// =========================================================================
// 💬 CHAT DE WHATSAPP EN CAJA (Human Handoff) — Fase 5 del módulo Omnicanal
// Autónomo: no toca el estado de Caja. Recibe los eventos del socket que
// Caja.js ya tiene abierto vía window ('omnichannel_actualizado').
// =========================================================================

const formatearHora = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};
const tituloChat = (c) => c.nombre_cliente || `+${c.telefono_cliente}`;
const inicialChat = (c) => (tituloChat(c).replace('+', '').trim().charAt(0) || '?').toUpperCase();

const ChipModo = ({ pausa, iaActiva }) => {
  if (pausa) return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Humano</span>;
  if (iaActiva) return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">IA</span>;
  return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Manual</span>;
};

const ChatWhatsAppCaja = ({ apiUrl, showAlert, sonar }) => {
  const [habilitado, setHabilitado] = useState(false);
  const [iaActiva, setIaActiva] = useState(false);
  const [chats, setChats] = useState([]);
  const [noLeidos, setNoLeidos] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cambiandoPausa, setCambiandoPausa] = useState(false);

  const showAlertRef = useRef(showAlert);
  const sonarRef = useRef(sonar);
  sonarRef.current = sonar; // siempre apunta a la versión vigente
  const noLeidosPrevRef = useRef(null);
  const chatIdRef = useRef(null);
  const abiertoRef = useRef(false);
  const timerListaRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { showAlertRef.current = showAlert; });
  useEffect(() => { abiertoRef.current = abierto; }, [abierto]);
  const alerta = useCallback((t, m, tipo) => showAlertRef.current && showAlertRef.current(t, m, tipo), []);

  const cargarLista = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiUrl}/omnichannel/chats`);
      if (!res.ok) {
        console.warn(`[ChatWhatsAppCaja] GET /omnichannel/chats respondió ${res.status}: la burbuja permanece oculta.`);
        setHabilitado(false);
        return;
      } // sin sesión/rol válido: la burbuja no se muestra
      const data = await res.json();
      if (!data.success) return;
      setHabilitado(!!data.habilitado);
      if (!data.habilitado) {
        console.info('[ChatWhatsAppCaja] Canal de WhatsApp no listo para esta empresa (se requiere Meta con Phone ID + token, o 360dialog con token). La burbuja permanece oculta.');
      }
      setIaActiva(!!data.ia_activa);
      setChats(Array.isArray(data.chats) ? data.chats : []);
      const totalNoLeidos = Number(data.no_leidos) || 0;
      // 🔔 Solo suena cuando SUBE el contador (únicamente los mensajes del cliente lo incrementan)
      if (noLeidosPrevRef.current !== null && totalNoLeidos > noLeidosPrevRef.current && sonarRef.current) {
        sonarRef.current('mensaje');
      }
      noLeidosPrevRef.current = totalNoLeidos;
      setNoLeidos(totalNoLeidos);
    } catch (e) { /* ante fallo de red se conserva el último estado */ }
  }, [apiUrl]);

  const cargarDetalle = useCallback(async (id, silencioso = false) => {
    if (!silencioso) setCargandoDetalle(true);
    try {
      const res = await apiFetch(`${apiUrl}/omnichannel/chats/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        if (chatIdRef.current === id) setDetalle(data.chat);
      } else if (!silencioso) {
        alerta('Chat no disponible', data.error || 'No se pudo abrir la conversación.', 'error');
      }
    } catch (e) {
      if (!silencioso) alerta('Error de red', 'No se pudo contactar al servidor.', 'error');
    } finally {
      if (!silencioso) setCargandoDetalle(false);
    }
  }, [apiUrl, alerta]);

  // Carga inicial + respaldo por polling (si el socket se cae)
  useEffect(() => {
    cargarLista();
    const t = setInterval(() => { if (!document.hidden) cargarLista(); }, 30000);
    return () => clearInterval(t);
  }, [cargarLista]);

  // Eventos en vivo (Caja.js los reenvía desde su socket)
  useEffect(() => {
    const handler = (e) => {
      const p = e.detail || {};
      clearTimeout(timerListaRef.current);
      timerListaRef.current = setTimeout(cargarLista, 400); // agrupa ráfagas de eventos
      if (p.chat_id && abiertoRef.current && chatIdRef.current === p.chat_id) cargarDetalle(p.chat_id, true);
      if (p.tipo === 'handoff' || p.tipo === 'ia_fallo') {
        try { new Audio('/campana.mp3').play().catch(() => {}); } catch (err) {}
        alerta(
          'Cliente esperando atención',
          p.tipo === 'handoff'
            ? 'Un cliente pidió hablar con una persona. Revisa el chat de WhatsApp.'
            : 'La IA no pudo responder un mensaje. Atiende ese chat manualmente.',
          'info'
        );
      }
    };
    window.addEventListener('omnichannel_actualizado', handler);
    return () => {
      window.removeEventListener('omnichannel_actualizado', handler);
      clearTimeout(timerListaRef.current);
    };
  }, [cargarLista, cargarDetalle, alerta]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [detalle?.mensajes?.length, chatId]);

  const abrirChat = (id) => {
    chatIdRef.current = id;
    setChatId(id);
    setDetalle(null);
    setTexto('');
    cargarDetalle(id).then(cargarLista); // al abrir se marca como leído en el servidor
  };

  const volverALista = () => {
    chatIdRef.current = null;
    setChatId(null);
    setDetalle(null);
  };

  const enviar = async (e) => {
    if (e) e.preventDefault();
    const t = texto.trim();
    if (!t || enviando || !chatId) return;
    setEnviando(true);
    try {
      const res = await apiFetch(`${apiUrl}/omnichannel/chats/${chatId}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: t })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTexto('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        await cargarDetalle(chatId, true);
        cargarLista();
      } else {
        alerta(data.codigo === 'VENTANA_24H' ? 'Ventana de 24 h cerrada' : 'Mensaje no enviado', data.error || 'Intenta de nuevo.', 'error');
        if (data.codigo === 'VENTANA_24H') cargarDetalle(chatId, true);
      }
    } catch (err) {
      alerta('Error de red', 'No se pudo enviar el mensaje. Revisa tu conexión.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const cambiarPausa = async (pausa) => {
    if (!chatId || cambiandoPausa) return;
    setCambiandoPausa(true);
    try {
      const res = await apiFetch(`${apiUrl}/omnichannel/chats/${chatId}/pausa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pausa })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDetalle(prev => (prev ? { ...prev, pausa_ia: data.pausa_ia } : prev));
        cargarLista();
        alerta(
          data.pausa_ia ? 'Tienes el control' : 'Chat devuelto a la IA',
          data.pausa_ia ? 'La IA no responderá en este chat hasta que se la devuelvas.' : 'La IA retomará las próximas respuestas de este cliente.',
          'success'
        );
      } else {
        alerta('No se pudo cambiar', data.error || 'Intenta de nuevo.', 'error');
      }
    } catch (err) {
      alerta('Error de red', 'No se pudo contactar al servidor.', 'error');
    } finally {
      setCambiandoPausa(false);
    }
  };

  if (!habilitado) return null;

  const mensajes = detalle?.mensajes || [];

  return (
    <>
      {/* Burbuja flotante */}
      <button
        onClick={() => setAbierto(a => !a)}
        aria-label="Chats de WhatsApp"
        className={`fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[45] w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 items-center justify-center hover:scale-105 active:scale-95 transition-all ${abierto ? 'hidden sm:flex' : 'flex'}`}
      >
        {abierto ? <X size={26} /> : <MessageCircle size={28} />}
        {!abierto && noLeidos > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center border-2 border-white animate-pulse">
            {noLeidos > 9 ? '9+' : noLeidos}
          </span>
        )}
      </button>

      {abierto && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:left-6 z-[60] sm:w-[880px] sm:max-w-[calc(100vw-3rem)] sm:h-[640px] sm:max-h-[calc(100vh-8rem)] bg-white sm:rounded-[28px] shadow-2xl sm:border border-slate-200 flex overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">

          {/* ───────── LISTA ───────── */}
          <aside className={`${chatId ? 'hidden sm:flex' : 'flex'} w-full sm:w-[320px] shrink-0 flex-col border-r border-slate-100 bg-white`}>
            <div className="px-5 py-4 bg-emerald-500 text-white flex items-center justify-between shrink-0">
              <div>
                <p className="font-black text-lg leading-tight">WhatsApp</p>
                <p className="text-emerald-100 text-[11px] font-bold uppercase tracking-wider">
                  {iaActiva ? 'IA activa · tú tomas lo que escale' : 'Atención manual'}
                </p>
              </div>
              <button onClick={() => setAbierto(false)} className="sm:hidden p-2 -mr-2 rounded-full hover:bg-white/20" aria-label="Cerrar">
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {chats.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center">
                  <Inbox size={44} />
                  <p className="mt-3 text-sm font-bold text-slate-400">Aún no hay conversaciones</p>
                </div>
              ) : chats.map(c => (
                <button
                  key={c.id}
                  onClick={() => abrirChat(c.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors active:bg-slate-100 ${chatId === c.id ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-500 font-black flex items-center justify-center shrink-0">
                    {inicialChat(c)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-slate-800 text-sm truncate">{tituloChat(c)}</p>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">{formatearHora(c.ultimo_mensaje)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-slate-500 truncate">
                        {c.ultimo_rol && c.ultimo_rol !== 'cliente' ? 'Tú: ' : ''}{c.ultimo_texto || '—'}
                      </p>
                      {Number(c.no_leidos) > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center">{c.no_leidos}</span>
                      )}
                    </div>
                    <div className="mt-1"><ChipModo pausa={c.pausa_ia} iaActiva={iaActiva} /></div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* ───────── CONVERSACIÓN ───────── */}
          <section className={`${chatId ? 'flex' : 'hidden sm:flex'} flex-1 min-w-0 flex-col bg-slate-50`}>
            {!chatId ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center">
                <MessageCircle size={56} />
                <p className="mt-3 font-black text-slate-400">Selecciona una conversación</p>
                <button onClick={() => setAbierto(false)} className="mt-6 text-xs font-bold text-slate-400 hover:text-slate-600 underline">Cerrar panel</button>
              </div>
            ) : (
              <>
                {/* Encabezado */}
                <div className="px-3 sm:px-5 py-3 bg-white border-b border-slate-100 flex items-center gap-3 shrink-0">
                  <button onClick={volverALista} className="sm:hidden p-2 -ml-1 rounded-full hover:bg-slate-100 text-slate-500" aria-label="Volver">
                    <ArrowLeft size={20} />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 font-black flex items-center justify-center shrink-0">
                    {detalle ? inicialChat(detalle) : <User size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-800 text-sm truncate">{detalle ? tituloChat(detalle) : 'Cargando…'}</p>
                    {detalle && <p className="text-[11px] font-bold text-slate-400">+{detalle.telefono_cliente}</p>}
                  </div>
                  {detalle && (
                    detalle.pausa_ia ? (
                      <button onClick={() => cambiarPausa(false)} disabled={cambiandoPausa} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition active:scale-95 disabled:opacity-50">
                        <Bot size={14} /> <span className="hidden sm:inline">Devolver a la IA</span><span className="sm:hidden">IA</span>
                      </button>
                    ) : (
                      <button onClick={() => cambiarPausa(true)} disabled={cambiandoPausa} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-black transition active:scale-95 disabled:opacity-50">
                        <Hand size={14} /> <span className="hidden sm:inline">Tomar control</span><span className="sm:hidden">Tomar</span>
                      </button>
                    )
                  )}
                  <button onClick={() => setAbierto(false)} className="hidden sm:block p-2 rounded-full hover:bg-slate-100 text-slate-400" aria-label="Cerrar">
                    <X size={18} />
                  </button>
                </div>

                {detalle?.pausa_ia && !iaActiva && (
                  <div className="px-4 py-2 bg-slate-100 text-[11px] font-bold text-slate-500">
                    La IA está apagada en este negocio (Premium o IA de WhatsApp); este chat sigue en modo manual.
                  </div>
                )}

                {/* Mensajes */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-2">
                  {cargandoDetalle && !detalle ? (
                    <div className="h-full flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={24} /></div>
                  ) : mensajes.map(m => {
                    const esCliente = m.rol === 'cliente';
                    const esIA = m.rol === 'ia';
                    return (
                      <div key={m.id} className={`flex ${esCliente ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[82%] sm:max-w-[70%] px-3.5 py-2 rounded-2xl text-sm leading-snug shadow-sm ${
                          esCliente ? 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'
                          : esIA ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-br-sm'
                          : 'bg-emerald-500 text-white rounded-br-sm'
                        }`}>
                          {esIA && <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400 mb-0.5 flex items-center gap-1"><Bot size={11} /> IA</p>}
                          <p className="whitespace-pre-wrap break-words">{m.contenido}</p>
                          <p className={`text-[10px] mt-1 text-right font-bold ${esCliente ? 'text-slate-400' : esIA ? 'text-indigo-300' : 'text-emerald-100'}`}>
                            {m.error_envio ? 'No enviado · ' : ''}{formatearHora(m.ts)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Compositor */}
                {detalle && !detalle.ventana_abierta ? (
                  <div className="p-4 bg-amber-50 border-t border-amber-100 flex items-start gap-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <Clock size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                      Pasaron más de 24 horas desde el último mensaje del cliente. WhatsApp solo permite escribirle con una plantilla aprobada. Podrás responder en cuanto el cliente escriba de nuevo.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={enviar} className="p-3 bg-white border-t border-slate-100 flex items-end gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <textarea
                      ref={textareaRef}
                      value={texto}
                      rows={1}
                      maxLength={2000}
                      disabled={!detalle || enviando}
                      placeholder={detalle?.pausa_ia ? 'Escribe tu respuesta…' : 'Al responder, la IA se pausa en este chat…'}
                      onChange={(e) => {
                        setTexto(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
                      }}
                      className="flex-1 resize-none bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60 max-h-32"
                    />
                    <button
                      type="submit"
                      disabled={!texto.trim() || enviando || !detalle}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition active:scale-95 disabled:opacity-40"
                      aria-label="Enviar"
                    >
                      {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
};

export default ChatWhatsAppCaja;