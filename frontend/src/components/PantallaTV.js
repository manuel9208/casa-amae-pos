import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, Clock, ChefHat, CheckCircle2, AlertTriangle, Maximize } from 'lucide-react';

const PantallaTV = ({ onLogout }) => {
  const [pedidos, setPedidos] = useState([]);
  const [config, setConfig] = useState({});
  const [mostrarPublicidad, setMostrarPublicidad] = useState(false);
  const [indiceImagen, setIndiceImagen] = useState(0); 
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const baseUrl = apiUrl.replace('/api', '');

  // === 1. OBTENER DATOS Y PEDIDOS DE HOY ===
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resConf = await fetch(`${apiUrl}/configuracion`);
        const dataConf = await resConf.json();
        if (dataConf && !dataConf.error) setConfig(dataConf);

        const resPed = await fetch(`${apiUrl}/pedidos/hoy`);
        const dataPed = await resPed.json();
        if (Array.isArray(dataPed)) {
          setPedidos(dataPed);
        }
      } catch (e) { console.error("Error al refrescar TV:", e); }
    };
    
    cargarDatos();
    const intervalo = setInterval(cargarDatos, 3000); 
    return () => clearInterval(intervalo);
  }, [apiUrl]);

  // === 2. LÓGICA DE CIERRE DE SESIÓN A PRUEBA DE BALAS ===
  const handleExit = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      console.warn("Forzando salida de emergencia...");
      // 👇 Usar la misma clave que App.js
      localStorage.removeItem('pos_sesion'); 
      window.location.href = '/'; 
    }
  }, [onLogout]);

  const carruselActivo = config?.tv_carrusel_activo === true || config?.tv_carrusel_activo === 'true';
  const carruselSegundos = parseInt(config?.tv_carrusel_segundos) || 10;

  // === 3. LÓGICA DEL CARRUSEL ===
  useEffect(() => {
    if (carruselActivo) {
      const ms = carruselSegundos * 1000;
      const timer = setInterval(() => {
        setMostrarPublicidad(prev => !prev);
        setIndiceImagen(i => i + 1);
      }, ms);
      return () => clearInterval(timer);
    } else {
      setMostrarPublicidad(false);
    }
  }, [carruselActivo, carruselSegundos]);

  // LÓGICA DE PANTALLA COMPLETA
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error("Error al poner pantalla completa:", e));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  // === 4. PROCESAMIENTO DE PEDIDOS ===
  const subPedidos = [];
  pedidos.forEach(p => {
      if (p.estado_preparacion === 'Cancelado' || p.estado_preparacion === 'Entregado' || p.estado_preparacion === 'Pendiente') return;

      const itemsCocina = p.carrito?.filter(i => i.destino === 'Cocina') || [];
      const itemsBarra = p.carrito?.filter(i => i.destino === 'Barra') || [];

      const getEstado = (items) => {
          if (items.length === 0) return null;
          if (items.every(i => i.estado === 'Listo')) return 'Listo';
          if (items.some(i => i.estado === 'Preparando' || i.estado === 'Listo')) return 'Preparando';
          return 'Pagado'; 
      };

      const estCocina = getEstado(itemsCocina);
      if (estCocina) subPedidos.push({ ...p, subDestino: 'Cocina', subEstado: estCocina, uid: p.id + '-cocina' });

      const estBarra = getEstado(itemsBarra);
      if (estBarra) subPedidos.push({ ...p, subDestino: 'Barra', subEstado: estBarra, uid: p.id + '-barra' });
  });

  const enCola = subPedidos.filter(p => p.subEstado === 'Pagado');
  const preparando = subPedidos.filter(p => p.subEstado === 'Preparando');
  const listos = subPedidos.filter(p => p.subEstado === 'Listo');

  const mediosPromocionales = [config.tv_imagen_1, config.tv_imagen_2, config.tv_imagen_3, config.tv_video].filter(Boolean);
  const forzarPantallaCompleta = subPedidos.length === 0 || (mostrarPublicidad && carruselActivo && mediosPromocionales.length > 0);

  // === COMPONENTE DE BOTONES DISCRETOS ===
  const renderBotonesControl = () => (
    <div className="fixed bottom-4 right-4 flex gap-3 z-[999] opacity-20 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 print:hidden pointer-events-auto">
      <button 
        type="button"
        onClick={toggleFullScreen} 
        className="p-3 bg-black/60 rounded-2xl text-white/80 hover:text-white hover:bg-slate-800 transition shadow-lg backdrop-blur-sm border border-white/10 active:scale-95 cursor-pointer"
        title="Pantalla Completa"
      >
        <Maximize size={24} />
      </button>
      <button 
        type="button"
        onClick={handleExit} 
        className="p-3 bg-black/60 rounded-2xl text-white/80 hover:text-white hover:bg-red-600 transition shadow-lg backdrop-blur-sm border border-white/10 active:scale-95 cursor-pointer"
        title="Cerrar Sesión"
      >
        <LogOut size={24} />
      </button>
    </div>
  );

  // ==========================================
  // RENDER: MODO PUBLICIDAD / ESPERA
  // ==========================================
  if (forzarPantallaCompleta) {
    let medioAMostrar = config.logo_url; 
    if (carruselActivo && mediosPromocionales.length > 0) {
        medioAMostrar = mediosPromocionales[indiceImagen % mediosPromocionales.length];
    }
    const urlCompleta = medioAMostrar?.startsWith('http') ? medioAMostrar : `${baseUrl}${medioAMostrar}`;
    const esVideo = medioAMostrar && medioAMostrar === config.tv_video;

    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden relative">
        
        {renderBotonesControl()}

        {medioAMostrar ? (
          <>
            <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
               {esVideo ? (
                 <video src={urlCompleta} autoPlay muted loop className="w-full h-full object-cover opacity-20 blur-2xl scale-110" />
               ) : (
                 <img src={urlCompleta} className="w-full h-full object-cover opacity-20 blur-2xl scale-110" alt="" />
               )}
            </div>
            {esVideo ? (
              <video key={`v-${medioAMostrar}`} src={urlCompleta} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-contain animate-in fade-in duration-1000 z-10" />
            ) : (
              <img key={`i-${medioAMostrar}`} src={urlCompleta} className="absolute inset-0 w-full h-full object-contain animate-in fade-in duration-1000 z-10 drop-shadow-2xl" alt="Publicidad" />
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 pointer-events-none"></div>
          </>
        ) : (
          <h1 className="text-white text-6xl landscape:text-8xl font-black z-10 uppercase text-center px-6">{config.nombre_negocio || 'BIENVENIDO'}</h1>
        )}
        <div className="absolute bottom-12 text-white font-black text-xl landscape:text-2xl tracking-[0.5em] landscape:tracking-[1em] uppercase z-30 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] animate-pulse pointer-events-none">
          Esperando Órdenes...
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MODO PEDIDOS (DISEÑO ADAPTABLE)
  // ==========================================
  return (
    <div className="min-h-screen flex flex-col font-sans overflow-hidden relative" style={{ backgroundColor: config.color_fondo || '#f1f5f9' }}>
      
      {renderBotonesControl()}

      {/* HEADER */}
      <div className="flex flex-col landscape:flex-row items-center justify-between p-4 landscape:p-6 bg-white shadow-sm border-b-4 shrink-0 gap-4 landscape:gap-0" style={{ borderColor: config.color_primario || '#2563eb' }}>
        <div className="hidden landscape:block w-32"></div>
        <div className="flex items-center gap-4 landscape:gap-6 flex-1 justify-center">
          {config.logo_url && <img src={config.logo_url?.startsWith('http') ? config.logo_url : `${baseUrl}${config.logo_url}`} className="h-12 landscape:h-16 object-contain" alt="Logo" />}
          <h1 className="text-3xl landscape:text-5xl font-black tracking-tight text-slate-800 uppercase text-center" style={{ fontFamily: config.fuente_titulos, color: config.color_texto_principal }}>
            ESTADO DE TU ORDEN
          </h1>
        </div>
        <div className="text-center landscape:text-right bg-slate-100 px-5 py-2.5 rounded-2xl border border-slate-200 shrink-0 w-full landscape:w-auto">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">HORA LOCAL</p>
          <p className="text-2xl landscape:text-3xl font-black text-blue-600">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </div> 
      </div>

      {/* GRILLA DE ESTADOS */}
      <div className="flex-1 p-4 landscape:p-8 grid grid-cols-1 landscape:grid-cols-3 gap-4 landscape:gap-8 overflow-hidden">
        
        {/* EN COLA */}
        <div className="bg-slate-100/50 rounded-3xl landscape:rounded-[40px] flex flex-col overflow-hidden border border-slate-200 shadow-sm min-h-0">
          <div className="bg-slate-800 py-4 landscape:py-6 text-center border-b border-slate-200 shrink-0">
            <h2 className="text-xl landscape:text-2xl font-black text-white flex items-center justify-center gap-2.5 tracking-widest uppercase" style={{ fontFamily: config.fuente_titulos }}>
              <Clock size={20} className="landscape:w-7 landscape:h-7" /> {config.tv_msg_cola || 'EN COLA'}
            </h2>
          </div>
          <div className="p-4 landscape:p-6 flex flex-col gap-3 landscape:gap-4 overflow-y-auto flex-1">
            {enCola.map(p => (
              <div key={p.uid} className={`p-4 landscape:p-6 rounded-2xl landscape:rounded-3xl shadow-sm border flex flex-col items-center justify-center animate-in fade-in ${p.alerta_cocina ? 'bg-red-50 border-red-300 ring-2 ring-red-400 animate-pulse' : 'bg-white border-slate-200'}`}>
                <span className={`text-4xl landscape:text-5xl font-black ${p.alerta_cocina ? 'text-red-600' : 'text-slate-800'}`}>#{p.numero_pedido}</span>
                <span className={`text-[9px] landscape:text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest mt-1.5 landscape:mt-2 ${p.subDestino === 'Barra' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{p.subDestino}</span>
                {p.alerta_cocina && (
                  <span className="text-[10px] landscape:text-xs font-black text-red-600 mt-2 flex items-center gap-1 bg-red-100 px-2.5 py-1 rounded-lg uppercase tracking-widest text-center">
                    <AlertTriangle size={12}/> PASAR A CAJA
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PREPARANDO */}
        <div className="bg-blue-50/50 rounded-3xl landscape:rounded-[40px] flex flex-col overflow-hidden border border-blue-100 shadow-sm min-h-0">
          <div className="bg-blue-600 py-4 landscape:py-6 text-center border-b border-blue-200 shrink-0">
            <h2 className="text-xl landscape:text-2xl font-black text-white flex items-center justify-center gap-2.5 tracking-widest uppercase" style={{ fontFamily: config.fuente_titulos }}>
              <ChefHat size={20} className="landscape:w-7 landscape:h-7" /> {config.tv_msg_progreso || 'PREPARANDO'}
            </h2>
          </div>
          <div className="p-4 landscape:p-6 flex flex-col gap-3 landscape:gap-4 overflow-y-auto flex-1">
            {preparando.map(p => (
              <div key={p.uid} className={`p-4 landscape:p-6 rounded-2xl landscape:rounded-3xl shadow-md border flex flex-col items-center justify-center ring-offset-2 animate-pulse ${p.alerta_cocina ? 'bg-red-50 border-red-300 ring-2 ring-red-500' : 'bg-white border-blue-200 ring-2 ring-blue-400'}`}>
                <span className={`text-5xl landscape:text-6xl font-black ${p.alerta_cocina ? 'text-red-600' : 'text-blue-700'}`}>#{p.numero_pedido}</span>
                <span className={`text-[9px] landscape:text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-widest mt-1.5 landscape:mt-2 ${p.subDestino === 'Barra' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{p.subDestino}</span>
              </div>
            ))}
          </div>
        </div>

        {/* LISTOS */}
        <div className="bg-emerald-50/50 rounded-3xl landscape:rounded-[40px] flex flex-col overflow-hidden border border-emerald-100 shadow-sm min-h-0">
          <div className="bg-emerald-500 py-4 landscape:py-6 text-center shadow-md z-10 shrink-0">
            <h2 className="text-2xl landscape:text-3xl font-black text-white flex items-center justify-center gap-3 tracking-widest uppercase" style={{ fontFamily: config.fuente_titulos }}>
              <CheckCircle2 size={24} className="landscape:w-8 landscape:h-8" /> {config.tv_msg_listo || '¡LISTOS!'}
            </h2>
          </div>
          <div className="p-4 landscape:p-6 flex flex-col gap-3 landscape:gap-4 overflow-y-auto flex-1 bg-emerald-50/30">
            {listos.map(p => (
              <div key={p.uid} className="bg-white p-6 landscape:p-8 rounded-2xl landscape:rounded-3xl shadow-xl border-4 border-emerald-400 flex flex-col items-center justify-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
                <span className="text-7xl landscape:text-8xl font-black text-emerald-600">#{p.numero_pedido}</span>
                <span className={`text-xs landscape:text-sm font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest mt-3.5 landscape:mt-4 ${p.subDestino === 'Barra' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{p.subDestino}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PantallaTV;