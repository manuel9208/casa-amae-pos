import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LogOut, Clock, ChefHat, CheckCircle2, AlertTriangle, Maximize, RotateCw, ArrowLeftRight } from 'lucide-react';
// Importación directa del motor de caché
import ImagenCachada from './ImagenCachada';
import TarjetaComandaCocinaSoloLectura from './pantalla/TarjetaComandaCocinaSoloLectura'; // 🆕 Vista detallada de comandas
import { apiFetch } from '../utils/apiFetch';

const PantallaTV = ({ onLogout }) => {
  const [pedidos, setPedidos] = useState([]);
  const [config, setConfig] = useState({});
  const [step, setStep] = useState(0);

  // Estado para guardar y controlar la rotación de pantalla
  const [rotacion, setRotacion] = useState(() => Number(localStorage.getItem('pos_tv_rotacion')) || 0);

  // 🆕 VISTA DETALLADA DE COMANDAS: toggle único con el botón de flechas invertidas.
  // No tiene botón de "Volver" — el mismo botón alterna de ida y vuelta.
  const [vistaComandas, setVistaComandas] = useState(false);

  // 🆕 Filtro Todo/Cocina/Barra DENTRO de la Vista Detallada (independiente del
  // carrusel normal de columnas, que no lo necesita).
  const [filtroTabTV, setFiltroTabTV] = useState('Todo');

  // 🆕 Reloj interno para que las insignias de tiempo de TarjetaComandaCocinaSoloLectura
  // se actualicen solas, igual que ya hace Cocina.js con su propio "ahora".
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resConf = await apiFetch(`${apiUrl}/configuracion`);
        const dataConf = await resConf.json();
        if (dataConf && !dataConf.error) {
          // Solo actualiza si hubo un cambio real en la config
          setConfig(prev => JSON.stringify(prev) === JSON.stringify(dataConf) ? prev : dataConf);
        }

        const resPed = await apiFetch(`${apiUrl}/pedidos/hoy`);
        const dataPed = await resPed.json();
        if (Array.isArray(dataPed)) {
          // Solo actualiza si entraron o cambiaron pedidos
          setPedidos(prev => JSON.stringify(prev) === JSON.stringify(dataPed) ? prev : dataPed);
        }
      } catch (e) { console.error("Error al refrescar TV:", e); }
    };

    cargarDatos();
    const intervalo = setInterval(cargarDatos, 3000);
    return () => clearInterval(intervalo);
  }, [apiUrl]);

  useEffect(() => {
    localStorage.setItem('pos_tv_rotacion', rotacion);
  }, [rotacion]);

  const handleExit = useCallback((e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (typeof onLogout === 'function') { onLogout(); }
    else { localStorage.removeItem('pos_sesion'); window.location.href = '/'; }
  }, [onLogout]);

  const carruselActivo = config?.tv_carrusel_activo === true || config?.tv_carrusel_activo === 'true';
  const carruselSegundos = parseInt(config?.tv_carrusel_segundos) || 10;

  // Creador de la secuencia exacta (Imágenes -> Órdenes -> Video -> Repetir)
  const sequence = useMemo(() => {
    const seq = [];
    if (config.tv_imagen_1) seq.push({ type: 'image', url: config.tv_imagen_1 });
    if (config.tv_imagen_2) seq.push({ type: 'image', url: config.tv_imagen_2 });
    if (config.tv_imagen_3) seq.push({ type: 'image', url: config.tv_imagen_3 });
    
    seq.push({ type: 'orders' });
    
    if (config.tv_video) seq.push({ type: 'video', url: config.tv_video });
    
    return seq;
  }, [config.tv_imagen_1, config.tv_imagen_2, config.tv_imagen_3, config.tv_video]);

  // Motor del Carrusel
  useEffect(() => {
    if (!carruselActivo || sequence.length <= 1) return;

    const currentItem = sequence[step % sequence.length];
    let timer;

    if (currentItem.type === 'video') {
      timer = setTimeout(() => setStep(s => s + 1), 15000);
    } else {
      timer = setTimeout(() => setStep(s => s + 1), carruselSegundos * 1000);
    }

    return () => clearTimeout(timer);
  }, [carruselActivo, sequence, step, carruselSegundos]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const subPedidos = [];
  pedidos.forEach(p => {
    if (['Cancelado', 'Entregado', 'Pendiente', 'Finalizado', 'En Camino', 'Liquidado'].includes(p.estado_preparacion)) return;

    const carritoArray = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : (p.carrito || []);
    const itemsCocina = carritoArray.filter(i => i.destino === 'Cocina' && i.estado !== 'Finalizado');
    const itemsBarra = carritoArray.filter(i => i.destino === 'Barra' && i.estado !== 'Finalizado');

    // 🐞 FIX: se quitó "if (estadoGlobal === 'Preparando') return 'Preparando'".
    // Esa línea cortaba la evaluación antes de revisar los item.estado reales —
    // por eso un pedido recién aceptado por Caja (estado_preparacion='Preparando'
    // a nivel global, pero NINGÚN platillo individual tocado aún por Cocina)
    // se mostraba prematuramente como "PREPARANDO" en la TV.
    const getEstado = (items, estadoGlobal) => {
      if (items.length === 0) return null;
      if (estadoGlobal === 'Listo') return 'Listo';
      if (items.every(i => i.estado === 'Listo')) return 'Listo';
      if (items.some(i => i.estado === 'Preparando' || i.estado === 'Listo')) return 'Preparando';
      return 'Pagado';
    };

    const estCocina = getEstado(itemsCocina, p.estado_preparacion);
    if (estCocina) subPedidos.push({ ...p, subDestino: 'Cocina', subEstado: estCocina, uid: p.id + '-cocina' });

    const estBarra = getEstado(itemsBarra, p.estado_preparacion);
    if (estBarra) subPedidos.push({ ...p, subDestino: 'Barra', subEstado: estBarra, uid: p.id + '-barra' });
  });

  const enCola = subPedidos.filter(p => p.subEstado === 'Pagado');
  const preparando = subPedidos.filter(p => p.subEstado === 'Preparando');
  const listos = subPedidos.filter(p => p.subEstado === 'Listo');

  // 🆕 VISTA DETALLADA: mismo criterio de "sigue activo en cocina" que ya usa el
  // bucle de subPedidos de arriba (excluye Cancelado/Entregado/Pendiente/Finalizado/
  // En Camino/Liquidado a nivel pedido, y Listo/Finalizado a nivel de cada platillo).
  // 🆕 Ahora SÍ respeta el filtro Todo/Cocina/Barra (filtroTabTV).
  const getCarritoSafe = (p) => {
    if (Array.isArray(p.carrito)) return p.carrito;
    try { return JSON.parse(p.carrito) || []; } catch (e) { return []; }
  };

  const pedidosVistaDetallada = pedidos.filter(p => {
    if (['Cancelado', 'Entregado', 'Pendiente', 'Finalizado', 'En Camino', 'Liquidado'].includes(p.estado_preparacion)) return false;
    const carritoArray = getCarritoSafe(p);
    return carritoArray.some(i =>
      (filtroTabTV === 'Todo' || i.destino === filtroTabTV) &&
      i.estado !== 'Listo' && i.estado !== 'Finalizado'
    );
  });

  // 🆕 ACUMULADO POR CLASIFICACIÓN: suma cantidades de todos los productos que
  // SIGUEN pendientes de salir de cocina (ni Listo ni Finalizado), agrupados por
  // item.categoria, respetando también el filtro Todo/Cocina/Barra.
  // Se calcula 100% en el frontend, sin ningún endpoint nuevo.
  const acumuladoClasificaciones = {};
  pedidosVistaDetallada.forEach(p => {
    const carritoArray = getCarritoSafe(p);
    carritoArray.forEach(item => {
      if (item.estado === 'Listo' || item.estado === 'Finalizado') return;
      if (filtroTabTV !== 'Todo' && item.destino !== filtroTabTV) return;
      const cat = item.categoria || 'Otros';
      acumuladoClasificaciones[cat] = (acumuladoClasificaciones[cat] || 0) + (Number(item.cantidad) || 1);
    });
  });
  const listaAcumulado = Object.entries(acumuladoClasificaciones).sort((a, b) => b[1] - a[1]);

  const renderBotonesControl = () => (
    <div className="absolute bottom-4 right-4 flex gap-3 z-[9999] opacity-20 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 print:hidden pointer-events-auto">
      {/* 🆕 Alterna entre el carrusel/columnas normales y la Vista Detallada de Comandas */}
      <button onClick={() => setVistaComandas(v => !v)} className="p-3 bg-black/60 rounded-2xl text-white/80 hover:text-white hover:bg-purple-600 transition shadow-lg backdrop-blur-sm border border-white/10 active:scale-95 cursor-pointer" title="Vista Detallada de Comandas">
        <ArrowLeftRight size={24} />
      </button>
      <button onClick={() => setRotacion(r => (r + 90) % 360)} className="p-3 bg-black/60 rounded-2xl text-white/80 hover:text-white hover:bg-blue-500 transition shadow-lg backdrop-blur-sm border border-white/10 active:scale-95 cursor-pointer" title="Girar Pantalla">
        <RotateCw size={24} />
      </button>
      <button onClick={toggleFullScreen} className="p-3 bg-black/60 rounded-2xl text-white/80 hover:text-white hover:bg-slate-800 transition shadow-lg backdrop-blur-sm border border-white/10 active:scale-95 cursor-pointer" title="Pantalla Completa">
        <Maximize size={24} />
      </button>
      <button onClick={handleExit} className="p-3 bg-black/60 rounded-2xl text-white/80 hover:text-white hover:bg-red-600 transition shadow-lg backdrop-blur-sm border border-white/10 active:scale-95 cursor-pointer" title="Cerrar Sesión">
        <LogOut size={24} />
      </button>
    </div>
  );

  const isRotated = rotacion % 180 !== 0;
  const widthVal = isRotated ? '100vh' : '100vw';
  const heightVal = isRotated ? '100vw' : '100vh';

  // 👇 NUEVA LÓGICA DE CAPAS PARA EVITAR FLASH DE NAVEGADOR
  const activeIndex = sequence.length > 0 ? (step % sequence.length) : 0;
  // Calculamos cuál fue la capa anterior para permitir que se desvanezca en lugar de destruirla instantáneamente
  const prevIndex = sequence.length > 0 ? ((step - 1 + sequence.length) % sequence.length) : 0;
  
  const currentItem = sequence.length > 0 ? sequence[activeIndex] : { type: 'orders' };
  const isOrdersView = currentItem.type === 'orders' || !carruselActivo;
  
  // Si no hay pedidos, forzamos mostrar la publicidad (pantalla completa)
  const showFullScreen = !isOrdersView || (isOrdersView && subPedidos.length === 0);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'black', zIndex: 0 }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: widthVal, height: heightVal, transform: `translate(-50%, -50%) rotate(${rotacion}deg)`, transformOrigin: 'center center', backgroundColor: config.color_fondo || '#f1f5f9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {renderBotonesControl()}

        {/* ========================================================= */}
        {/* CAPA 1: PUBLICIDAD Y STANDBY (MULTICAPA PRE-CARGADA) */}
        {/* ========================================================= */}
        <div className={`absolute inset-0 w-full h-full bg-black transition-opacity duration-1000 ease-in-out flex flex-col ${showFullScreen ? 'opacity-100 z-20 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
          
          {/* Renderizamos TODAS las imágenes juntas. Activamos/desactivamos opacidad para hacer un crossfade inmaculado. */}
          {sequence.map((item, index) => {
            if (item.type === 'orders') return null;

            const isCurrentLayer = (activeIndex === index);
            const isPrevLayer = (prevIndex === index);
            const esVideo = item.type === 'video';

            // Optimizador para Video: El video solo se monta en el DOM si es el principal o si se está desvaneciendo. 
            // Esto evita que consuma procesador o suene en segundo plano.
            if (esVideo && !isCurrentLayer && !isPrevLayer) return null;

            // La capa actual solo se muestra si NO estamos enseñando el logo de bienvenida
            const isVisible = isCurrentLayer && !isOrdersView;

            return (
              <div key={index} className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${isVisible ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                {/* Fondo difuminado */}
                <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
                  <ImagenCachada 
                    tipo={esVideo ? 'video' : 'image'} 
                    src={item.url} 
                    className="w-full h-full object-cover opacity-20 blur-2xl scale-110" 
                    alt="" 
                  />
                </div>
                
                {/* Reproductor Principal */}
                <ImagenCachada 
                  tipo={esVideo ? 'video' : 'image'}
                  src={item.url} 
                  onEnded={(esVideo && isCurrentLayer) ? () => setStep(s => s + 1) : undefined}
                  className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl z-10" 
                  alt="Publicidad" 
                />
              </div>
            );
          })}
          
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 pointer-events-none"></div>

          {/* Pantalla de Bienvenida (sustituye a las imágenes en su turno) */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black transition-opacity duration-1000 ease-in-out z-30 ${isOrdersView ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
             {config.logo_url && (
                 <ImagenCachada src={config.logo_url} className="h-32 landscape:h-48 object-contain mb-8 drop-shadow-2xl" alt="Logo" />
             )}
             <h1 className="text-white text-5xl landscape:text-7xl font-black uppercase text-center px-6 drop-shadow-lg">
               {config.nombre_negocio || 'BIENVENIDO'}
             </h1>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CAPA 2: ESTADO DE ÓRDENES EN VIVO */}
        {/* ========================================================= */}
        <div className={`absolute inset-0 w-full h-full flex flex-col transition-opacity duration-1000 ease-in-out ${!showFullScreen ? 'opacity-100 z-20 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`} style={{ backgroundColor: config.color_fondo || '#f1f5f9' }}>
          
          <div className="flex flex-col landscape:flex-row items-center justify-between p-4 landscape:p-6 bg-white shadow-sm border-b-4 shrink-0 gap-4 landscape:gap-0" style={{ borderColor: config.color_primario || '#2563eb' }}>
            <div className="hidden landscape:block w-32"></div>
            <div className="flex items-center gap-4 landscape:gap-6 flex-1 justify-center">
              {config.logo_url && <ImagenCachada src={config.logo_url} className="h-12 landscape:h-16 object-contain" alt="Logo" />}
              <h1 className="text-3xl landscape:text-5xl font-black tracking-tight text-slate-800 uppercase text-center" style={{ fontFamily: config.fuente_titulos, color: config.color_texto_principal }}>ESTADO DE TU ORDEN</h1>
            </div>
            <div className="text-center landscape:text-right bg-slate-100 px-5 py-2.5 rounded-2xl border border-slate-200 shrink-0 w-full landscape:w-auto">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">HORA LOCAL</p>
              <p className="text-2xl landscape:text-3xl font-black text-blue-600">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
          </div>

          <div className="flex-1 p-4 landscape:p-8 grid grid-cols-1 landscape:grid-cols-3 gap-4 landscape:gap-8 overflow-hidden">
            <div className="bg-slate-100/50 rounded-3xl landscape:rounded-[40px] flex flex-col overflow-hidden border border-slate-200 shadow-sm min-h-0">
              <div className="bg-slate-800 py-4 landscape:py-6 text-center border-b border-slate-200 shrink-0">
                <h2 className="text-xl landscape:text-2xl font-black text-white flex items-center justify-center gap-2.5 tracking-widest uppercase" style={{ fontFamily: config.fuente_titulos }}><Clock size={20} className="landscape:w-7 landscape:h-7" /> {config.tv_msg_cola || 'EN COLA'}</h2>
              </div>
              <div className="p-4 landscape:p-6 flex flex-col gap-3 landscape:gap-4 overflow-y-auto flex-1">
                {enCola.map(p => (
                  <div key={p.uid} className={`p-4 landscape:p-6 rounded-2xl landscape:rounded-3xl shadow-sm border flex flex-col items-center justify-center animate-in fade-in ${p.alerta_cocina ? 'bg-red-50 border-red-300 ring-2 ring-red-400 animate-pulse' : 'bg-white border-slate-200'}`}>
                    <span className={`text-4xl landscape:text-5xl font-black ${p.alerta_cocina ? 'text-red-600' : 'text-slate-800'}`}>#{p.numero_pedido}</span>
                    <span className={`text-[9px] landscape:text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest mt-1.5 landscape:mt-2 ${p.subDestino === 'Barra' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{p.subDestino}</span>
                    {p.alerta_cocina && <span className="text-[10px] landscape:text-xs font-black text-red-600 mt-2 flex items-center gap-1 bg-red-100 px-2.5 py-1 rounded-lg uppercase tracking-widest text-center"><AlertTriangle size={12}/> PASAR A CAJA</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50/50 rounded-3xl landscape:rounded-[40px] flex flex-col overflow-hidden border border-blue-100 shadow-sm min-h-0">
              <div className="bg-blue-600 py-4 landscape:py-6 text-center border-b border-blue-200 shrink-0">
                <h2 className="text-xl landscape:text-2xl font-black text-white flex items-center justify-center gap-2.5 tracking-widest uppercase" style={{ fontFamily: config.fuente_titulos }}><ChefHat size={20} className="landscape:w-7 landscape:h-7" /> {config.tv_msg_progreso || 'PREPARANDO'}</h2>
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

            <div className="bg-emerald-50/50 rounded-3xl landscape:rounded-[40px] flex flex-col overflow-hidden border border-emerald-100 shadow-sm min-h-0">
              <div className="bg-emerald-500 py-4 landscape:py-6 text-center shadow-md z-10 shrink-0">
                <h2 className="text-2xl landscape:text-3xl font-black text-white flex items-center justify-center gap-3 tracking-widest uppercase" style={{ fontFamily: config.fuente_titulos }}><CheckCircle2 size={24} className="landscape:w-8 landscape:h-8" /> {config.tv_msg_listo || '¡LISTOS!'}</h2>
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

        {/* ========================================================= */}
        {/* CAPA 3: MENSAJE FLOTANTE DE ESPERA (SIEMPRE VISIBLE SI NO HAY ORDENES) */}
        {/* ========================================================= */}
        {subPedidos.length === 0 && (
          <div className="absolute bottom-12 inset-x-0 text-white font-black text-xl landscape:text-2xl tracking-[0.5em] landscape:tracking-[1em] uppercase z-30 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] animate-pulse pointer-events-none text-center flex justify-center w-full">
            ESPERANDO ÓRDENES...
          </div>
        )}

        {/* ========================================================= */}
        {/* 🆕 CAPA 4: VISTA DETALLADA DE COMANDAS (SOLO LECTURA)       */}
        {/* Se activa/desactiva con el mismo botón de flechas invertidas. */}
        {/* No controla pedidos — solo los muestra, igual que la tablet de Cocina. */}
        {/* ========================================================= */}
        {vistaComandas && (
          <div className="absolute inset-0 w-full h-full bg-slate-950 z-40 flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Encabezado con acumulado y filtro — opacidad tenue, se ilumina al pasar el mouse/tocar */}
            <div className="shrink-0 bg-slate-900 border-b border-slate-800 p-4 landscape:p-6">
              <div className="flex flex-col landscape:flex-row landscape:items-center justify-between gap-3 mb-3">
                {/* 🆕 Título SIEMPRE visible — ya no se oculta */}
                <h2 className="text-white text-lg landscape:text-xl font-black uppercase tracking-widest flex items-center gap-2">
                  📋 Comandas Activas en Cocina
                </h2>
                {/* 🆕 Solo el filtro Todo/Cocina/Barra lleva opacidad tenue, igual que los controles de abajo */}
                <div className="flex bg-slate-800 p-1 rounded-xl opacity-30 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
                  {['Todo', 'Cocina', 'Barra'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setFiltroTabTV(tab)}
                      className={`px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${filtroTabTV === tab ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              {listaAcumulado.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {listaAcumulado.map(([cat, cant]) => (
                    <div key={cat} className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
                      <span className="text-slate-400 font-black text-[9px] uppercase tracking-widest">{cat}</span>
                      <span className="text-white font-black text-base ml-2">{cant}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 font-bold text-xs">No hay productos pendientes en cocina.</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 landscape:p-6 custom-scrollbar">
              {pedidosVistaDetallada.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-slate-600 font-black text-2xl uppercase tracking-widest">Sin comandas activas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 landscape:grid-cols-4 gap-5">
                  {pedidosVistaDetallada.map((p, idx) => (
                    <TarjetaComandaCocinaSoloLectura key={p.id} pedido={p} index={idx} ahora={ahora} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PantallaTV;