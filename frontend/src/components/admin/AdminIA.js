import React, { useState } from 'react';
import { Bot, Image as ImageIcon, Settings, Sparkles } from 'lucide-react';
import ChatCopiloto from './ia/ChatCopiloto';
import GeneradorImagenes from './ia/GeneradorImagenes';
import ConfiguracionIA from './ia/ConfiguracionIA';

const AdminIA = ({ apiUrl, user, showAlert }) => {
  const [pestaña, setPestaña] = useState('chat'); // 'chat' | 'imagen' | 'ajustes'

  // 👇 REGLA DE NEGOCIO ESTRICTA: Solo el dueño absoluto del sistema puede ver la configuración
  const isGlobalAdmin = user?.usuario === 'admin';

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* HEADER ADAPTATIVO: Mobile-first */}
      <div className="bg-slate-900 text-white p-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={28} />
            Copiloto IA
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Tu asistente experto en finanzas, marketing y gestión.
          </p>
        </div>

        {/* NAVEGACIÓN INTERNA: Pastillas tipo iOS */}
        <div className="bg-slate-800 p-1.5 rounded-2xl flex overflow-x-auto no-scrollbar gap-1 w-full md:w-auto">
          <button 
            onClick={() => setPestaña('chat')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${pestaña === 'chat' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
          >
            <Bot size={18} /> Chat Experto
          </button>
          
          <button 
            onClick={() => setPestaña('imagen')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${pestaña === 'imagen' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
          >
            <ImageIcon size={18} /> Studio Mágico
          </button>

          {/* 👇 BLINDAJE VISUAL: El engrane solo se renderiza si es admin global */}
          {isGlobalAdmin && (
            <button 
              onClick={() => setPestaña('ajustes')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${pestaña === 'ajustes' ? 'bg-slate-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
            >
              <Settings size={18} /> Ajustes
            </button>
          )}
        </div>
      </div>

      {/* ÁREA DE CONTENIDO FLUIDA */}
      <div className="flex-1 overflow-hidden relative">
        
        {pestaña === 'chat' && (
          <div className="h-full animate-fade-in">
            <ChatCopiloto apiUrl={apiUrl} user={user} showAlert={showAlert} />
          </div>
        )}

        {pestaña === 'imagen' && (
          <div className="h-full animate-fade-in overflow-y-auto">
            <GeneradorImagenes apiUrl={apiUrl} showAlert={showAlert} />
          </div>
        )}

        {/* 👇 BLINDAJE DE COMPONENTE: Evita inyecciones manipulando el estado 'pestaña' */}
        {pestaña === 'ajustes' && isGlobalAdmin && (
          <div className="h-full animate-fade-in overflow-y-auto">
            <ConfiguracionIA apiUrl={apiUrl} showAlert={showAlert} />
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminIA;