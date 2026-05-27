import React, { useState, useEffect } from 'react';

const Login = ({ onLogin, onInvitado }) => {
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState('');
  
  // ESTADO PARA LA MARCA BLANCA
  const [config, setConfig] = useState({ nombre_negocio: '', logo_url: null });
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const baseUrl = apiUrl.replace('/api', '');

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/configuracion`);
        const data = await res.json();
        if (data && data.nombre_negocio) {
          setConfig(data);
        }
      } catch (err) {
        console.error("Error al cargar la configuración:", err);
      }
    };
    cargarConfig();
  }, [apiUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (telefono.length !== 10) {
      setError('El número debe tener exactamente 10 dígitos.');
      return;
    }
    setError('');
    if(onLogin) onLogin(telefono);
  };

  const getImageUrl = (url) => {
    if (!url) return '';
    
    const strUrl = String(url).trim();

    if (strUrl.includes('cloudinary.com')) {
      const match = strUrl.match(/res\.cloudinary\.com\/(.+)/);
      if (match && match[1]) {
        return `https://res.cloudinary.com/${match[1]}`;
      }
    }

    const lastHttp = strUrl.lastIndexOf('http');
    if (lastHttp > 0) {
      return strUrl.substring(lastHttp);
    }

    if (strUrl.startsWith('http')) return strUrl;

    return `${baseUrl}${strUrl.startsWith('/') ? '' : '/'}${strUrl}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      {/* 👇 AQUÍ AMPLIAMOS LA CAJA: max-w-xl (más ancha) y p-10 md:p-16 (más alta y espaciosa) */}
      <div className="bg-white p-10 md:p-16 rounded-[50px] shadow-2xl max-w-xl w-full text-center border border-slate-100 relative overflow-hidden">
        
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        <div className="relative z-10">
          
          {/* Contenedor del Logo Gigante */}
          {config.logo_url ? (
            <div className="flex justify-center items-center h-32 md:h-40 mb-10 mt-4">
              <img 
                 src={getImageUrl(config.logo_url)}
                 alt="Logo" 
                 className="w-full h-full object-contain drop-shadow-xl scale-[1.7] hover:scale-[1.8] transition-transform duration-300" 
              />
            </div>
          ) : (
            <div className="bg-blue-600 text-white w-32 h-32 flex items-center justify-center rounded-[36px] mx-auto mb-8 text-6xl shadow-lg shadow-blue-500/30">
              🍔
            </div>
          )}

          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
            {config.nombre_negocio ? config.nombre_negocio : 'Bienvenido'}
          </h1>
          
          <p className="text-slate-500 font-medium mb-12 text-lg">Ingresa tu número para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 text-center">
                Celular a 10 dígitos
              </label>
              <input 
                type="tel" 
                maxLength="10"
                required
                value={telefono} 
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-center text-2xl font-black outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700 tracking-widest placeholder-slate-300"
                placeholder="000 000 0000" 
              />
            </div>

            {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

            <button 
              type="submit" 
              disabled={telefono.length !== 10}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
            >
              Continuar
            </button>
          </form>

          <button 
            onClick={onInvitado} 
            className="mt-10 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
          >
            Entrar directo como Invitado
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;