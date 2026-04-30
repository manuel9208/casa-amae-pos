import React, { useState, useEffect } from 'react';
import { LogOut, Clock, ChefHat, CheckCircle2, AlertTriangle, Maximize } from 'lucide-react';

const PantallaTV = ({ onLogout }) => {
  const [pedidos, setPedidos] = useState([]);
  const [config, setConfig] = useState({});
  const [mostrarPublicidad, setMostrarPublicidad] = useState(false);
  const [indiceImagen, setIndiceImagen] = useState(0); 
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const baseUrl = apiUrl.replace('/api', '');

  // 1. OBTENER DATOS Y PEDIDOS DE HOY
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
      } catch (e) { console.error(e); }
    };
    
    cargarDatos();
    const intervalo = setInterval(cargarDatos, 3000); 
    return () => clearInterval(intervalo);
  }, [apiUrl]);

  const carruselActivo = config?.tv_carrusel_activo === true || config?.tv_carrusel_activo === 'true';
  const carruselSegundos = parseInt(config?.tv_carrusel_segundos) || 10;

  // 2. LÓGICA DEL CARRUSEL
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

  // 3. SEPARAR EN COCINA Y BARRA
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
      if (estCocina) {
          subPedidos.push({ ...p, subDestino: 'Cocina', subEstado: estCocina, uid: p.id + '-cocina' });
      }

      const estBarra = getEstado(itemsBarra);
      if (estBarra) {
          subPedidos.push({ ...p, subDestino: 'Barra', subEstado: estBarra, uid: p.id + '-barra' });
      }
  });

  const enCola = subPedidos.filter(p => p.subEstado === 'Pagado');
  const preparando = subPedidos.filter(p => p.subEstado === 'Preparando');
  const listos = subPedidos.filter(p => p.subEstado === 'Listo');

  // 👇 4. FILTRAR IMÁGENES Y VIDEO DEL CARRUSEL
  const mediosPromocionales = [config.tv_imagen_1, config.tv_imagen_2, config.tv_imagen_3, config.tv_video].filter(Boolean);
  const forzarPantallaCompleta = subPedidos.length === 0 || (mostrarPublicidad && carruselActivo && mediosPromocionales.length > 0);

  // ==========================================
  // MODO PUBLICIDAD / PANTALLA DE ESPERA
  // ==========================================
  if (forzarPantallaCompleta) {
    let medioAMostrar = config.logo_url; 
    
    if (carruselActivo && mediosPromocionales.length > 0) {
        medioAMostrar = mediosPromocionales[indiceImagen % mediosPromocionales.length];
    }

    const urlCompleta = medioAMostrar?.startsWith('http') ? medioAMostrar : `${baseUrl}${medioAMostrar}`;
    // 👇 Comprobamos si el elemento en turno es exactamente el que guardamos como video
    const esVideo = medioAMostrar && medioAMostrar === config.tv_video;

    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden relative">
        
        {/* Botón sutil de Pantalla Completa en la vista de publicidad */}
        <button onClick={toggleFullScreen} className="absolute top-6 left-6 p-3 bg-black/30 hover:bg-black/60 rounded-xl text-white/50 hover:text-white transition z-50 shadow-lg backdrop-blur-sm" title="Pantalla Completa">
          <Maximize size={24} />
        </button>

        {medioAMostrar ? (
          <>
            {esVideo ? (
              <video 
                key={medioAMostrar} 
                src={urlCompleta} 
                autoPlay 
                muted 
                loop 
                playsInline
                className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-1000 z-0" 
              />
            ) : (
              <img 
                key={medioAMostrar} 
                src={urlCompleta} 
                className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-1000 z-0" 
                alt="Publicidad"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent z-0 pointer-events-none"></div>
          </>
        ) : (
          <h1 className="text-white text-8xl font-black z-10 uppercase">{config.nombre_negocio || 'BIENVENIDO'}</h1>
        )}
        <div className="absolute bottom-10 text-white font-black text-2xl tracking-[1em] uppercase z-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
          Esperando Órdenes...
        </div>
      </div>
    );
  }

  // ==========================================
  // MODO PEDIDOS (3 COLUMNAS)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" style={{ backgroundColor: config.color_fondo || '#f1f5f9' }}>
      {/* HEADER */}
      <div className="flex items-center justify-between p-6 bg-white shadow-sm border-b-4" style={{ borderColor: config.color_primario || '#2563eb' }}>
        
        <div className="flex gap-4">
          <button onClick={onLogout} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition shadow-sm text-slate-500" title="Salir">
            <LogOut size={24} />
          </button>
          
          <button onClick={toggleFullScreen} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition shadow-sm text-slate-500" title="Pantalla Completa">
            <Maximize size={24} />
          </button>
        </div>
        
        <div className="flex items-center gap-6">
          {config.logo_url && <img src={config.logo_url?.startsWith('http') ? config.logo_url : `${baseUrl}${config.logo_url}`} className="h-16" alt="Logo" />}
          <h1 className="text-5xl font-black tracking-tight text-slate-800 flex items-center gap-4 uppercase" style={{ fontFamily: config.fuente_titulos, color: config.color_texto_principal }}>
            ESTADO DE TU ORDEN
          </h1>
        </div>
        
        <div className="text-right bg-slate-100 px-6 py-3 rounded-2xl border border-slate-200">
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">HORA LOCAL</p>
          <p className="text-3xl font-black text-blue-600">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </div> 
      </div>

      {/* GRILLA DE ESTADOS */}
      <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* === COLUMNA: EN COLA === */}
        <div className="bg-slate-100/50 rounded-[40px] flex flex-col overflow-hidden border border-slate-200 shadow-sm">
          <div className="bg-slate-800 py-6 text-center border-b border-slate-200">
            <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3 tracking-widest uppercase" style={{ fontFamily: config.fuente_titulos }}>
              <Clock size={28} /> {config.tv_msg_cola || 'EN COLA'}
            </h2>
          </div>
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            {enCola.map(p => (
              <div key={p.uid} className={`p-6 rounded-3xl shadow-sm border flex flex-col items-center justify-center animate-in fade-in ${p.alerta_cocina ? 'bg-red-50 border-red-300 ring-2 ring-red-400 animate-pulse' : 'bg-white border-slate-200'}`}>
                <span className={`text-5xl font-black ${p.alerta_cocina ? 'text-red-600' : 'text-slate-800'}`}>#{p.numero_pedido}</span>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mt-2 ${p.subDestino === 'Barra' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{p.subDestino}</span>
                {p.alerta_cocina ? (
                  <span className="text-xs font-black text-red-600 mt-2 flex items-center gap-1 bg-red-100 px-3 py-1 rounded-lg uppercase tracking-widest">
                    <AlertTriangle size={14}/> PASAR A CAJA
                  </span>
                ) : (
                  <span className="text-sm font-bold text-slate-500 mt-2">{p.cliente_nombre || 'Invitado'}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* === COLUMNA: PREPARANDO === */}
        <div className="bg-blue-50/50 rounded-[40px] flex flex-col overflow-hidden border border-blue-100 shadow-sm">
          <div className="bg-blue-600 py-6 text-center border-b border-blue-200">
            <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3 tracking-widest uppercase" style={{ fontFamily: config.fuente_titulos }}>
              <ChefHat size={28} /> {config.tv_msg_progreso || 'PREPARANDO'}
            </h2>
          </div>
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            {preparando.map(p => (
              <div key={p.uid} className={`p-6 rounded-3xl shadow-md border flex flex-col items-center justify-center ring-offset-2 animate-pulse ${p.alerta_cocina ? 'bg-red-50 border-red-300 ring-2 ring-red-500' : 'bg-white border-blue-200 ring-2 ring-blue-400'}`}>
                <span className={`text-6xl font-black ${p.alerta_cocina ? 'text-red-600' : 'text-blue-700'}`}>#{p.numero_pedido}</span>
                <span className={`text-xs font-black px-4 py-1 rounded-full uppercase tracking-widest mt-2 ${p.subDestino === 'Barra' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{p.subDestino}</span>
                {p.alerta_cocina ? (
                  <span className="text-sm font-black text-red-600 mt-3 flex items-center gap-1 bg-red-100 px-4 py-1.5 rounded-lg uppercase tracking-widest">
                    <AlertTriangle size={16}/> FAVOR DE PASAR A CAJA
                  </span>
                ) : (
                  <span className="text-sm font-bold text-slate-500 mt-2">{p.cliente_nombre || 'Invitado'}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* === COLUMNA: LISTOS === */}
        <div className="bg-emerald-50/50 rounded-[40px] flex flex-col overflow-hidden border border-emerald-100 shadow-sm">
          <div className="bg-emerald-500 py-6 text-center shadow-md z-10">
            <h2 className="text-3xl font-black text-white flex items-center justify-center gap-3 tracking-widest uppercase" style={{ fontFamily: config.fuente_titulos }}>
              <CheckCircle2 size={32} /> {config.tv_msg_listo || '¡LISTOS!'}
            </h2>
          </div>
          <div className="p-6 flex flex-col gap-4 overflow-y-auto bg-emerald-50/30">
            {listos.map(p => (
              <div key={p.uid} className="bg-white p-8 rounded-3xl shadow-xl border-4 border-emerald-400 flex flex-col items-center justify-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
                <span className="text-8xl font-black text-emerald-600">#{p.numero_pedido}</span>
                <span className={`text-sm font-black px-4 py-1.5 rounded-full uppercase tracking-widest mt-4 ${p.subDestino === 'Barra' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{p.subDestino}</span>
                <span className="text-lg font-bold text-slate-600 mt-2">{p.cliente_nombre || 'Invitado'}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PantallaTV;