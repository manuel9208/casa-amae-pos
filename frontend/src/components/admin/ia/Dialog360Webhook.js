import React, { useState, useEffect } from 'react';
import { Link2, Copy, Check } from 'lucide-react';
import { apiFetch } from '../../../utils/apiFetch';

const Dialog360Webhook = ({ apiUrl, showAlert }) => {
  const [url, setUrl] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    apiFetch(`${apiUrl}/omnichannel/360dialog/webhook-url`)
      .then(res => res.json())
      .then(d => { if (!cancelado && d.success) setUrl(d.url); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [apiUrl]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      showAlert && showAlert('No se pudo copiar', 'Selecciona la URL y cópiala manualmente.', 'error');
    }
  };

  if (!url) return null;

  return (
    <div className="bg-cyan-50/60 border border-cyan-100 rounded-2xl p-4 space-y-2">
      <p className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
        <Link2 size={14} className="text-cyan-600" /> URL de webhook para 360dialog
      </p>
      <div className="flex items-center gap-2">
        <input readOnly value={url} onFocus={(e) => e.target.select()} className="flex-1 min-w-0 bg-white border border-cyan-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 outline-none" />
        <button type="button" onClick={copiar} className="shrink-0 w-10 h-10 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center transition active:scale-95" aria-label="Copiar URL">
          {copiado ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Regístrala como webhook en tu cuenta de 360dialog (Hub, o con la API de configuración de webhook; confirma el endpoint vigente en su documentación). Es secreta: no la compartas.
      </p>
    </div>
  );
};

export default Dialog360Webhook;