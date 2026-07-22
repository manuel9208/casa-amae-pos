import React, { useState } from 'react';
import { Mail, Key, Eye, EyeOff, Info, Server, Hash } from 'lucide-react';

const GestorCorreos = ({ configGlobal, setConfigGlobal, isSubmitting }) => {
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100 space-y-6">
      <h3 className="text-xl font-bold text-blue-800 flex items-center gap-2">
        📧 Envío de Correos (SMTP Genérico)
      </h3>
      <p className="text-sm text-slate-500 font-bold mb-4">
        Configura la cuenta oficial (Gmail o Empresarial) desde la cual el sistema enviará correos automáticos.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SERVIDOR (HOST) */}
        <div>
          <label className="block text-xs font-black text-blue-600 uppercase mb-2">Servidor SMTP (Host)</label>
          <div className="relative">
            <Server className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              disabled={isSubmitting}
              type="text"
              value={configGlobal.smtp_host || ''}
              onChange={e => setConfigGlobal({ ...configGlobal, smtp_host: e.target.value })}
              className="w-full p-4 pl-12 bg-white border border-blue-200 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
              placeholder="Ej. smtp.gmail.com o smtp.office365.com"
            />
          </div>
        </div>

        {/* PUERTO */}
        <div>
          <label className="block text-xs font-black text-blue-600 uppercase mb-2">Puerto Seguro</label>
          <div className="relative">
            <Hash className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              disabled={isSubmitting}
              type="number"
              value={configGlobal.smtp_port || ''}
              onChange={e => setConfigGlobal({ ...configGlobal, smtp_port: e.target.value })}
              className="w-full p-4 pl-12 bg-white border border-blue-200 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
              placeholder="Ej. 465 (Gmail) o 587 (Office365)"
            />
          </div>
        </div>

        {/* CORREO */}
        <div>
          <label className="block text-xs font-black text-blue-600 uppercase mb-2">Correo Remitente</label>
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              disabled={isSubmitting}
              type="email"
              value={configGlobal.smtp_email || ''}
              onChange={e => setConfigGlobal({ ...configGlobal, smtp_email: e.target.value })}
              className="w-full p-4 pl-12 bg-white border border-blue-200 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
              placeholder="turestaurante@dominio.com"
            />
          </div>
        </div>

        {/* CONTRASEÑA */}
        <div>
          <label className="block text-xs font-black text-blue-600 uppercase mb-2">Contraseña (App Password)</label>
          <div className="relative">
            <Key className="absolute left-4 top-4 text-slate-400" size={20} />
            <input
              disabled={isSubmitting}
              type={showPass ? "text" : "password"}
              value={configGlobal.smtp_password || ''}
              onChange={e => setConfigGlobal({ ...configGlobal, smtp_password: e.target.value })}
              className="w-full p-4 pl-12 pr-12 bg-white border border-blue-200 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-4 top-4 text-slate-400 hover:text-blue-600 transition-colors"
            >
              {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-blue-100 p-4 rounded-2xl flex items-start gap-3 mt-4 shadow-sm">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <div className="text-sm font-medium text-slate-600 leading-relaxed space-y-2">
          <p><strong className="text-slate-800">Para Gmail:</strong> Usa Host: <code>smtp.gmail.com</code> | Puerto: <code>465</code>. Genera una contraseña de aplicación en tu cuenta de Google.</p>
          <p><strong className="text-slate-800">Para Correos Empresariales (Office 365 / Outlook):</strong> Usa Host: <code>smtp.office365.com</code> | Puerto: <code>587</code>.</p>
        </div>
      </div>
    </div>
  );
};

export default GestorCorreos;