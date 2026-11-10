import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../../utils/apiFetch';

// 🆕 FASE 3: Catálogo maestro de eventos — debe calzar 1:1 con las claves de
// notificacionesConfigController.js (EVENTOS_DEFAULT) en el backend.
const ETIQUETAS_EVENTOS = {
  pedido_nuevo: 'Pedido nuevo (Por Confirmar)',
  pedido_directo_cocina: 'Pedido directo a cocina (Comedor)',
  pedido_confirmado_cocina: 'Pedido confirmado → cocina',
  en_preparacion: 'En preparación',
  pedido_listo: 'Listo para entregar/recoger',
  asignado_repartidor: 'Asignado a repartidor',
  repartidor_en_camino: 'Repartidor en camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  factura_recibida: 'Factura recibida (proveedores)',
  factura_pagada: 'Factura pagada (proveedores)'
};

const ROLES_COLUMNAS = [
  { key: 'admin', label: 'Admin' },
  { key: 'gerente', label: 'Gerente' },
  { key: 'cajero', label: 'Cajero' },
  { key: 'chef', label: 'Chef' },
  { key: 'cocina', label: 'Cocina' },
  { key: 'ayudante_cocina', label: 'Ayud. Cocina' },
  { key: 'repartidor', label: 'Repartidor' },
  { key: 'cliente_push', label: 'Cliente Push' },
  { key: 'cliente_whatsapp', label: 'Cliente WhatsApp' }
];

const NotificacionesWA = ({ configGlobal, setConfigGlobal, isSubmitting, apiUrl }) => {
  // 🆕 FASE 3: estado propio — vive en notificaciones_configuracion, tabla
  // AISLADA de "configuracion" (configGlobal). Se carga/guarda independiente.
  const [flagsComerciales, setFlagsComerciales] = useState({ whatsapp_pedidos_ia: false, whatsapp_notificaciones: false });
  const [eventosConfig, setEventosConfig] = useState(null);
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [guardandoEvento, setGuardandoEvento] = useState(null);
  const [toast, setToast] = useState(null); // ✅ Sin alert()/confirm() nativos (Regla #5)

  const API_URL = apiUrl || '';

  const cargarConfiguracionEventos = useCallback(async () => {
    setCargandoEventos(true);
    try {
      const res = await apiFetch(`${API_URL}/notificaciones-config`);
      if (!res.ok) {
        const cuerpoError = await res.text();
        console.error('🚩 [DEBUG notificaciones-config] status:', res.status, '| body:', cuerpoError);
        throw new Error(`Respuesta no OK (status ${res.status}): ${cuerpoError}`);
      }
      const data = await res.json();
      console.log('🚩 [DEBUG notificaciones-config] data recibida:', data);
      setFlagsComerciales(data.flags || { whatsapp_pedidos_ia: false, whatsapp_notificaciones: false });
      setEventosConfig(data.eventos || {});
    } catch (err) {
      console.error('🚩 [DEBUG notificaciones-config] excepción capturada:', err);
      setToast({ tipo: 'error', texto: `No se pudo cargar el catálogo de notificaciones. (${err.message})` });
    } finally {
      setCargandoEventos(false);
    }
  }, [API_URL]);

  useEffect(() => { cargarConfiguracionEventos(); }, [cargarConfiguracionEventos]);

  const toggleDestinatario = (evento, rol) => {
    if (rol === 'cliente_whatsapp' && !flagsComerciales.whatsapp_notificaciones) return; // 🔒 candado visual (el backend ya lo blinda igual)
    setEventosConfig(prev => ({
      ...prev,
      [evento]: {
        ...prev[evento],
        destinatarios: { ...prev[evento].destinatarios, [rol]: !prev[evento].destinatarios[rol] }
      }
    }));
  };

  const actualizarMensaje = (evento, campo, valor) => {
    setEventosConfig(prev => ({ ...prev, [evento]: { ...prev[evento], [campo]: valor } }));
  };

  const guardarEvento = async (evento) => {
    setGuardandoEvento(evento);
    try {
      const payload = eventosConfig[evento];
      const res = await apiFetch(`${API_URL}/notificaciones-config/${evento}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatarios: payload.destinatarios,
          mensaje_staff: payload.mensaje_staff,
          mensaje_cliente_push: payload.mensaje_cliente_push,
          mensaje_cliente_whatsapp: payload.mensaje_cliente_whatsapp
        })
      });
      if (!res.ok) throw new Error('Respuesta no OK');
      setToast({ tipo: 'exito', texto: `Evento "${ETIQUETAS_EVENTOS[evento]}" guardado.` });
    } catch (err) {
      setToast({ tipo: 'error', texto: `No se pudo guardar "${ETIQUETAS_EVENTOS[evento]}".` });
    } finally {
      setGuardandoEvento(null);
    }
  };

  return (
    <div className="bg-green-50/30 p-6 rounded-3xl border border-green-200 space-y-6">
      <h3 className="text-xl font-bold text-green-800 flex items-center gap-2">💬 7. Notificaciones de WhatsApp (Oficial)</h3>
      
      <div className="bg-white p-4 rounded-2xl border border-green-200 shadow-sm space-y-1">
        <p className="font-black text-slate-700 text-sm">Canal de envío</p>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Los mensajes salen por el canal que el administrador conectó en <strong>Ajustes IA → Centro Omnicanal</strong> (Baileys, Meta o 360dialog). Aquí ya no se piden credenciales: solo elige, evento por evento, a quién se avisa.
        </p>
      </div>

      {/* 🆕 FASE 3: Candados comerciales — SOLO LECTURA, se editan en AdminEmpresas.js */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-green-200">
        <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between ${flagsComerciales.whatsapp_pedidos_ia ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
          🤖 Pedidos por WhatsApp (IA)
          <span className="text-xs">{flagsComerciales.whatsapp_pedidos_ia ? 'Activo' : 'Bloqueado — contacta a soporte'}</span>
        </div>
        <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between ${flagsComerciales.whatsapp_notificaciones ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
          🔔 Notificaciones salientes por WhatsApp
          <span className="text-xs">{flagsComerciales.whatsapp_notificaciones ? 'Activo' : 'Bloqueado — contacta a soporte'}</span>
        </div>
      </div>

      {/* 🆕 FASE 3: Catálogo de Notificaciones — Eventos × Roles × Canales */}
      <div className="pt-6 border-t border-green-200 space-y-4">
        <h3 className="text-xl font-bold text-green-800 flex items-center gap-2">🔔 8. Catálogo de Notificaciones por Evento</h3>

        {toast && (
          <div className={`p-3 rounded-xl text-sm font-bold border ${toast.tipo === 'error' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-emerald-50 border-emerald-300 text-emerald-700'}`}>
            {toast.texto}
          </div>
        )}

        {cargandoEventos && <p className="text-sm text-slate-500 font-bold">Cargando catálogo de eventos…</p>}

        {!cargandoEventos && eventosConfig && Object.keys(ETIQUETAS_EVENTOS).map(evento => {
          const cfg = eventosConfig[evento];
          if (!cfg) return null;
          return (
            <div key={evento} className="bg-white p-4 rounded-2xl border border-green-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-black text-slate-700">{ETIQUETAS_EVENTOS[evento]}</h4>
                <button
                  disabled={guardandoEvento === evento}
                  onClick={() => guardarEvento(evento)}
                  className="px-4 py-2 bg-green-600 text-white text-xs font-black rounded-xl disabled:opacity-50"
                >
                  {guardandoEvento === evento ? 'Guardando…' : 'Guardar'}
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {ROLES_COLUMNAS.map(({ key, label }) => {
                  const bloqueadoWa = key === 'cliente_whatsapp' && !flagsComerciales.whatsapp_notificaciones;
                  return (
                    <label key={key} className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border ${bloqueadoWa ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-green-50 border-green-200 text-slate-700 cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        disabled={bloqueadoWa}
                        checked={!!cfg.destinatarios[key]}
                        onChange={() => toggleDestinatario(evento, key)}
                        className="w-4 h-4 accent-green-600"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] font-black text-green-700 uppercase mb-1">Mensaje Staff</label>
                  <textarea rows={2} value={cfg.mensaje_staff || ''} onChange={e => actualizarMensaje(evento, 'mensaje_staff', e.target.value)} className="w-full p-2 text-xs bg-white border border-green-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-green-700 uppercase mb-1">Mensaje Push Cliente</label>
                  <textarea rows={2} value={cfg.mensaje_cliente_push || ''} onChange={e => actualizarMensaje(evento, 'mensaje_cliente_push', e.target.value)} className="w-full p-2 text-xs bg-white border border-green-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-green-700 uppercase mb-1">Mensaje WhatsApp Cliente</label>
                  <textarea
                    rows={2}
                    disabled={!flagsComerciales.whatsapp_notificaciones}
                    value={cfg.mensaje_cliente_whatsapp || ''}
                    onChange={e => actualizarMensaje(evento, 'mensaje_cliente_whatsapp', e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-green-200 rounded-xl outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <p className="text-[10px] text-amber-600 mt-1 font-bold">
                    ⚠️ Referencial: WhatsApp solo permite plantillas pre-aprobadas por Meta. El texto real enviado usa la plantilla oficial del evento, no este campo libre.
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificacionesWA;