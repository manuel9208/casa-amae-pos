import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, Loader2, CheckCircle2, AlertTriangle, Unplug, RefreshCw, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../../../utils/apiFetch';

// =========================================================================
// 📱 Vinculación de número por QR (Baileys). Autónomo: solo usa apiUrl/showAlert.
// =========================================================================
const BaileysVinculacion = ({ apiUrl, showAlert }) => {
  const [info, setInfo] = useState({ estado: 'sin_sesion', numero: null, motivo: null, qr: null });
  const [permiso, setPermiso] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState(false);
  const [modalDesvincular, setModalDesvincular] = useState(false);

  const showAlertRef = useRef(showAlert);
  useEffect(() => { showAlertRef.current = showAlert; });
  const alerta = useCallback((...args) => showAlertRef.current && showAlertRef.current(...args), []);

  const aplicar = (data) => setInfo({
    estado: data.estado, numero: data.numero || null, motivo: data.motivo || null, qr: data.qr || null
  });

  const cargarEstado = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiUrl}/omnichannel/baileys/estado`);
      if (res.status === 401 || res.status === 403) {
        console.warn(`[BaileysVinculacion] ${res.status}:`, await res.json().catch(() => ({})));
        setPermiso(false);
        return;
      }
      const data = await res.json();
      if (data.success) { setPermiso(true); aplicar(data); }
    } catch (e) { /* conserva el último estado */ }
    finally { setCargando(false); }
  }, [apiUrl]);

  useEffect(() => {
    cargarEstado();
    const enCurso = info.estado === 'conectando' || info.estado === 'esperando_qr';
    const t = setInterval(() => { if (!document.hidden) cargarEstado(); }, enCurso ? 2500 : 10000);
    return () => clearInterval(t);
  }, [cargarEstado, info.estado]);

  const conectar = async (forzar = false) => {
    setAccionando(true);
    try {
      const res = await apiFetch(`${apiUrl}/omnichannel/baileys/conectar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forzar: forzar === true })
      });
      const data = await res.json();
      if (res.ok && data.success) aplicar(data);
      else alerta('No se pudo iniciar', data.error || 'Intenta de nuevo.', 'error');
    } catch (e) {
      alerta('Error de red', 'No se pudo contactar al servidor.', 'error');
    } finally { setAccionando(false); }
  };

  const desvincular = async () => {
    setAccionando(true);
    try {
      const res = await apiFetch(`${apiUrl}/omnichannel/baileys/desconectar`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        aplicar(data);
        setModalDesvincular(false);
        alerta('Número desvinculado', 'La sesión se cerró y se borró del servidor.', 'success');
      } else alerta('No se pudo desvincular', data.error || 'Intenta de nuevo.', 'error');
    } catch (e) {
      alerta('Error de red', 'No se pudo contactar al servidor.', 'error');
    } finally { setAccionando(false); }
  };

  const { estado } = info;
  const conectado = estado === 'conectado';

  return (
    <div className="bg-white border border-slate-200 p-5 md:p-8 rounded-3xl shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl text-green-600"><QrCode size={22} /></div>
          <div>
            <h3 className="text-lg font-black text-slate-800">Vincular número (Baileys)</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Escanea el código con el celular del negocio</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border shrink-0 ${
          conectado ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : estado === 'esperando_qr' || estado === 'conectando' ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${conectado ? 'bg-emerald-500' : estado === 'esperando_qr' || estado === 'conectando' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
          {conectado ? 'Conectado' : estado === 'esperando_qr' ? 'Esperando QR' : estado === 'conectando' ? 'Conectando' : estado === 'desconectado' ? 'Desconectado' : 'Sin vincular'}
        </span>
      </div>

      {!permiso && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4">
          <ShieldAlert size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 font-medium leading-relaxed">Tu sesión no tiene permiso para administrar la vinculación. Cierra sesión y entra de nuevo como administrador.</p>
        </div>
      )}

      {permiso && cargando && (
        <div className="flex items-center justify-center py-8 text-slate-400"><Loader2 className="animate-spin" size={24} /></div>
      )}

      {permiso && !cargando && (
        <>
          {conectado && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-emerald-500 shrink-0" size={28} />
                <div>
                  <p className="font-black text-slate-800 text-sm">Número vinculado</p>
                  <p className="text-sm font-mono text-slate-600">{info.numero ? `+${info.numero}` : '—'}</p>
                </div>
              </div>
              <button onClick={() => setModalDesvincular(true)} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-black transition active:scale-95">
                <Unplug size={14} /> Desvincular número
              </button>
            </div>
          )}

          {estado === 'esperando_qr' && (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white p-3 rounded-2xl border-2 border-slate-100 shadow-sm shrink-0">
                {info.qr
                  ? <img src={info.qr} alt="Código QR de WhatsApp" className="w-56 h-56 sm:w-64 sm:h-64" />
                  : <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center text-slate-300"><Loader2 className="animate-spin" size={32} /></div>}
              </div>
              <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Abre WhatsApp en el celular del negocio.</li>
                <li>Entra a <b>Ajustes → Dispositivos vinculados</b>.</li>
                <li>Pulsa <b>Vincular un dispositivo</b> y escanea este código.</li>
                <li className="text-slate-400 list-none -ml-4 text-xs">El código se renueva solo; si caduca, genera uno nuevo.</li>
              </ol>
            </div>
          )}

          {estado === 'conectando' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="animate-spin" size={20} /> <span className="text-sm font-bold">Conectando con WhatsApp…</span>
              </div>
              <button
                onClick={() => conectar(true)}
                disabled={accionando}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-black transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={14} /> Cancelar y reintentar
              </button>
            </div>
          )}

          {(estado === 'sin_sesion' || estado === 'desconectado') && (
            <div className="space-y-4">
              {info.motivo && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">{info.motivo}</p>
                </div>
              )}
              <button onClick={conectar} disabled={accionando} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black shadow-lg shadow-green-600/20 transition active:scale-95 disabled:opacity-50">
                {accionando ? <Loader2 className="animate-spin" size={18} /> : estado === 'desconectado' ? <RefreshCw size={18} /> : <QrCode size={18} />}
                {estado === 'desconectado' ? 'Reconectar / nuevo QR' : 'Generar código QR'}
              </button>
            </div>
          )}

          <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <ShieldAlert size={18} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-black text-slate-700">Conexión no oficial.</span> WhatsApp puede restringir números que usan este método. Usa un <b>número dedicado al negocio</b>, no tu WhatsApp personal: con la IA encendida, responderá a cualquiera que escriba a ese número.
            </p>
          </div>
        </>
      )}

      {modalDesvincular && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3"><Unplug size={26} /></div>
            <h4 className="text-lg font-black text-slate-800">¿Desvincular el número?</h4>
            <p className="text-sm text-slate-500 mt-2">Se cerrará la sesión y dejarás de recibir mensajes en el POS. Para volver a usarlo tendrás que escanear otro código.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalDesvincular(false)} disabled={accionando} className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm transition">Cancelar</button>
              <button onClick={desvincular} disabled={accionando} className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-sm transition disabled:opacity-50">
                {accionando ? 'Desvinculando…' : 'Desvincular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaileysVinculacion;