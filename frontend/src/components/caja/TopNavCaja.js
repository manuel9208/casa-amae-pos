import React, { useState, useEffect } from 'react';
import { 
  DollarSign, CheckCircle2, XCircle, ShoppingBag, Monitor, 
  List, FileText, LogOut, Phone, PlusCircle, ChefHat, Bike, 
  Utensils, Map, Maximize, Trash2, Lock, Unlock 
} from 'lucide-react';  

const TopNavCaja = ({
  user, onLogout, configGlobal, toggleEstadoNegocio,
  vistaActiva, setVistaActiva, pedidosPorConfirmar, pendientesDePago, listosParaEntregar,
  mesasPagadas, setModalCompraRapida, abrirIdentificador, pedidosEnReparto, setModalAsistencia,
  setModalComedor, setModalMermas
}) => {
  const isGlobalAdmin = user?.usuario === 'admin';
  const canCorte = isGlobalAdmin || ['admin', 'gerente', 'jefe', 'cajero'].includes(user?.rol);
  const canCompras = isGlobalAdmin || user?.permisos?.compras_rapidas === true;  
  const canMermas = isGlobalAdmin || user?.permisos?.reportar_mermas === true;  

  const isCocinaCajaActiva = configGlobal?.cocina_en_caja_activa === true || configGlobal?.cocina_en_caja_activa === 'true';
  const canVerCocina = isCocinaCajaActiva && ['admin', 'gerente', 'jefe', 'cocina', 'ayudante_cocina', 'cajero'].includes(user?.rol);
  const isAsistenciaPin = configGlobal?.asistencia_pin_caja === undefined || configGlobal?.asistencia_pin_caja === true || String(configGlobal?.asistencia_pin_caja) === 'true';  

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error("Error al intentar abrir pantalla completa", e));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };  

  // 👇 NUEVA REGLA FRONTEND: Computar el horario en vivo para bloquear/desbloquear
  const [isDentroDeHorario, setIsDentroDeHorario] = useState(false);

  useEffect(() => {
    const evaluarHorario = () => {
      try {
        if (configGlobal && configGlobal.horarios_semana) {
          const horarios = typeof configGlobal.horarios_semana === 'string' ? JSON.parse(configGlobal.horarios_semana) : configGlobal.horarios_semana;
          const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Mazatlan',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'long'
          });

          const parts = formatter.formatToParts(new Date());
          let horaStr = '', minStr = '', diaStrEN = '';
          parts.forEach(p => {
            if (p.type === 'hour') horaStr = p.value;
            if (p.type === 'minute') minStr = p.value;
            if (p.type === 'weekday') diaStrEN = p.value;
          });

          if (horaStr === '24') horaStr = '00';

          const dayMap = { 'Sunday': 'Domingo', 'Monday': 'Lunes', 'Tuesday': 'Martes', 'Wednesday': 'Miércoles', 'Thursday': 'Jueves', 'Friday': 'Viernes', 'Saturday': 'Sábado' };
          const diaHoyStr = dayMap[diaStrEN] || dias[new Date().getDay()];

          const minutosActuales = parseInt(horaStr, 10) * 60 + parseInt(minStr, 10);
          let dentro = false;

          // 1. Turno de ayer cruzando medianoche
          const indiceHoy = dias.indexOf(diaHoyStr);
          const diaAyerStr = dias[(indiceHoy + 6) % 7];
          const configAyer = horarios[diaAyerStr];

          if (configAyer && configAyer.activo && configAyer.apertura && configAyer.cierre) {
            const apA = parseInt(configAyer.apertura.split(':')[0], 10) * 60 + parseInt(configAyer.apertura.split(':')[1], 10);
            const ciA = parseInt(configAyer.cierre.split(':')[0], 10) * 60 + parseInt(configAyer.cierre.split(':')[1], 10);
            if (ciA <= apA) {
              if (minutosActuales < ciA) dentro = true;
            }
          }

          // 2. Turno de hoy
          if (!dentro) {
            const configHoy = horarios[diaHoyStr];
            if (configHoy && configHoy.activo && configHoy.apertura && configHoy.cierre) {
              const apH = parseInt(configHoy.apertura.split(':')[0], 10) * 60 + parseInt(configHoy.apertura.split(':')[1], 10);
              const ciH = parseInt(configHoy.cierre.split(':')[0], 10) * 60 + parseInt(configHoy.cierre.split(':')[1], 10);

              if (ciH <= apH) {
                if (minutosActuales >= apH) dentro = true;
              } else {
                if (minutosActuales >= apH && minutosActuales < ciH) dentro = true;
              }
            }
          }

          setIsDentroDeHorario(dentro);
        }
      } catch (e) {
        console.error("Error al calcular horario en el frontend", e);
      }
    };

    evaluarHorario();
    // Re-evaluar cada 1 minuto automáticamente
    const intervalo = setInterval(evaluarHorario, 60000); 
    return () => clearInterval(intervalo);
  }, [configGlobal]);

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm z-40 shrink-0 flex flex-col w-full animate-in fade-in">
      {/* ============================================================== */}
      {/* 1. BARRA SUPERIOR: IDENTIDAD Y ACCIONES RÁPIDAS                 */}
      {/* ============================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between px-4 lg:px-6 py-4 gap-4">  
        
        {/* Identidad y Estado del Negocio */}
        <div className="flex items-center justify-between lg:justify-start gap-4 md:gap-6 w-full lg:w-auto">
          <h1 className="text-xl md:text-2xl font-black flex items-center gap-2 text-slate-800 tracking-tight shrink-0">
            <div className="bg-emerald-100 text-emerald-600 p-1.5 md:p-2 rounded-xl shadow-inner">
              <DollarSign size={20} className="md:w-6 md:h-6" />
            </div>
            CAJA
          </h1>
          
          {/* 👇 FIX APLICADO: Botón bloqueado en horario y libre fuera de horario para CUALQUIER persona */}
          {configGlobal && (
            <button
              onClick={toggleEstadoNegocio}
              disabled={isDentroDeHorario}
              title={isDentroDeHorario ? "Dentro de horario operativo (Bloqueado)" : "Fuera de horario (Clic para forzar apertura/cierre)"}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-sm shrink-0 select-none ${
                !isDentroDeHorario ? 'active:scale-95 cursor-pointer' : 'opacity-90 cursor-not-allowed'
              } ${
                configGlobal.negocio_abierto
                  ? `bg-emerald-50 text-emerald-700 border border-emerald-200 ${!isDentroDeHorario ? 'hover:bg-emerald-100' : ''}`
                  : `bg-red-50 text-red-700 border border-red-200 ${!isDentroDeHorario ? 'hover:bg-red-100' : ''}`
              }`}
            >
              {configGlobal.negocio_abierto ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              <span className="hidden sm:inline">{configGlobal.negocio_abierto ? 'Recepción Abierta' : 'Pedidos Detenidos'}</span>
              <span className="sm:hidden">{configGlobal.negocio_abierto ? 'Abierto' : 'Cerrado'}</span>
              {/* Indicador visual de si se puede cliquear o no */}
              {isDentroDeHorario ? <Lock size={14} className="ml-1 opacity-50" /> : <Unlock size={14} className="ml-1 opacity-50" />}
            </button>
          )}
        </div>  

        {/* Acciones Rápidas y Usuario */}
        <div className="flex items-center gap-2 md:gap-3 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">  
          <button
            onClick={() => setModalComedor(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 md:px-4 py-2.5 md:py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 active:scale-95 border border-indigo-200 shrink-0"
            title="Comida de Personal"
          >
            <Utensils size={18}/> <span className="hidden sm:inline">Comedor</span>
          </button>  

          <button
            onClick={abrirIdentificador}
            className="flex-1 lg:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-4 md:px-5 py-2.5 md:py-3 rounded-2xl font-black text-xs md:text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 shrink-0"
          >
            <PlusCircle size={18} className="md:w-5 md:h-5"/> Levantar Pedido
          </button>  

          {canCompras && (
            <button
              onClick={() => setModalCompraRapida(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 md:px-4 py-2.5 md:py-3 rounded-2xl font-bold transition-all flex items-center gap-2 active:scale-95 shrink-0"
              title="Compras Rápidas de Insumos"
            >
              <ShoppingBag size={18} className="md:w-5 md:h-5"/>
            </button>
          )}  

          {canMermas && (
            <button
              onClick={() => setModalMermas(true)}
              className="bg-red-50 hover:bg-red-100 text-red-600 px-3 md:px-4 py-2.5 md:py-3 rounded-2xl font-bold transition-all flex items-center gap-2 active:scale-95 shrink-0"
              title="Reportar Merma de Inventario"
            >
              <Trash2 size={18} className="md:w-5 md:h-5"/>
            </button>
          )}  

          {/* Bloque de Usuario y Asistencia */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200 shrink-0">
            <button
              onClick={toggleFullScreen}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 md:p-3 rounded-2xl transition-all active:scale-95 hidden sm:block"
              title="Pantalla Completa"
            >
              <Maximize size={18} className="md:w-5 md:h-5"/>
            </button>  

            {isAsistenciaPin && (
              <div className="hidden sm:flex flex-col gap-1 pr-3 border-r border-slate-200">
                <button onClick={() => setModalAsistencia('Entrada')} className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition active:scale-95 border border-emerald-100">
                  ▶ Entrada
                </button>
                <button onClick={() => setModalAsistencia('Salida')} className="text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md transition active:scale-95 border border-rose-100">
                  ⏹ Salida
                </button>
              </div>
            )}
            
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-0.5 text-emerald-600">
                Operador: {user?.rol}
              </p>
              <p className="text-sm font-black text-slate-800 leading-none">{user?.nombre || user?.usuario}</p>
            </div>
            
            <button onClick={onLogout} className="bg-red-50 text-red-500 hover:bg-red-100 p-2.5 md:p-3 rounded-2xl transition-all active:scale-95" title="Cerrar Sesión / Bloquear Caja">
              <LogOut size={18} className="md:w-5 md:h-5"/>
            </button>
          </div>
        </div>
      </div>  

      {/* ============================================================== */}
      {/* 2. BARRA DE NAVEGACIÓN INFERIOR: PESTAÑAS DEL SISTEMA           */}
      {/* ============================================================== */}
      <div className="bg-slate-50 border-t border-slate-100 px-2 md:px-4 py-2 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex gap-2 w-max pb-1 items-center">
          <button onClick={() => setVistaActiva('mesas')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap select-none active:scale-95 ${vistaActiva === 'mesas' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
            <Map size={16} className="md:w-4 md:h-4"/> Mapa Mesas
          </button>
          
          <button onClick={() => setVistaActiva('confirmar')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap select-none active:scale-95 ${vistaActiva === 'confirmar' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
            <Phone size={16} className="md:w-4 md:h-4"/> Por Confirmar {pedidosPorConfirmar.length > 0 && <span className="bg-white/30 px-1.5 rounded-md text-[10px] md:text-xs">{pedidosPorConfirmar.length}</span>}
          </button>
          
          <button onClick={() => setVistaActiva('cobrar')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap select-none active:scale-95 ${vistaActiva === 'cobrar' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
            <ShoppingBag size={16} className="md:w-4 md:h-4"/> Cuentas / Cobrar {pendientesDePago.length > 0 && <span className="bg-white/30 px-1.5 rounded-md text-[10px] md:text-xs">{pendientesDePago.length}</span>}
          </button>
          
          <button onClick={() => setVistaActiva('mesas_pagadas')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap select-none active:scale-95 ${vistaActiva === 'mesas_pagadas' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
            <Utensils size={16} className="md:w-4 md:h-4"/> Mesas en Servicio {mesasPagadas.length > 0 && <span className="bg-white/30 px-1.5 rounded-md text-[10px] md:text-xs">{mesasPagadas.length}</span>}
          </button>
          
          <button onClick={() => setVistaActiva('entregas')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap select-none active:scale-95 ${vistaActiva === 'entregas' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
            <Monitor size={16} className="md:w-4 md:h-4"/> Entregas {listosParaEntregar.length > 0 && <span className="bg-white/30 px-1.5 rounded-md text-[10px] md:text-xs">{listosParaEntregar.length}</span>}
          </button>
          
          <button onClick={() => setVistaActiva('liquidacion_reparto')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap select-none active:scale-95 ${vistaActiva === 'liquidacion_reparto' ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-pink-600 border border-pink-200 hover:bg-pink-50'}`}>
            <Bike size={16} className="md:w-4 md:h-4"/> Por Liquidar {pedidosEnReparto && pedidosEnReparto.length > 0 && <span className="bg-pink-500 text-white px-1.5 rounded-md shadow-sm text-[10px] md:text-xs">{pedidosEnReparto.length}</span>}
          </button>
          
          {canVerCocina && (
            <button onClick={() => setVistaActiva('cocina_mini')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap select-none active:scale-95 border ${vistaActiva === 'cocina_mini' ? 'bg-orange-100 text-orange-700 border-orange-300 shadow-inner' : 'bg-white text-orange-500 border-orange-200 hover:bg-orange-50'}`}>
              <ChefHat size={16} className="md:w-4 md:h-4"/> KDS Cocina
            </button>
          )}
          
          <button onClick={() => setVistaActiva('historial')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap select-none active:scale-95 ${vistaActiva === 'historial' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
            <List size={16} className="md:w-4 md:h-4"/> Ver Todos
          </button>
          
          <div className="w-px h-6 bg-slate-300 mx-1 shrink-0"></div>
          
          {canCorte && (
            <button onClick={() => setVistaActiva('corte')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap select-none active:scale-95 ${vistaActiva === 'corte' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
              <FileText size={16} className="md:w-4 md:h-4"/> Corte Caja
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopNavCaja;