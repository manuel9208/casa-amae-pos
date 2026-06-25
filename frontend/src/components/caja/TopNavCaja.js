import React from 'react';
import { DollarSign, CheckCircle2, XCircle, ShoppingBag, Monitor, List, FileText, LogOut, Phone, ShoppingCart, PlusCircle, Map, ChefHat, Bike, Utensils } from 'lucide-react';

const TopNavCaja = ({
  user, onLogout, configGlobal, toggleEstadoNegocio,
  vistaActiva, setVistaActiva, pedidosPorConfirmar, pendientesDePago, listosParaEntregar,
  mesasPagadas, setModalCompraRapida, abrirIdentificador, pedidosEnReparto, setModalAsistencia,
  setModalComedor // 👈 NUEVO PROP PARA ABRIR EL COMEDOR
}) => {
  // Identificamos al Admin Global
  const isGlobalAdmin = user?.usuario === 'admin';
  
  // 🛡️ El corte de caja lo visualizan el Admin Global, y los roles 'admin' o 'gerente'.
  const canCorte = isGlobalAdmin || ['admin', 'gerente'].includes(user?.rol); 
  
  const canCompras = isGlobalAdmin || user?.permisos?.compras_rapidas === true;
  
  const isCocinaCajaActiva = configGlobal?.cocina_en_caja_activa === true || configGlobal?.cocina_en_caja_activa === 'true';
  const canVerCocina = isCocinaCajaActiva && ['admin', 'gerente', 'jefe', 'cocina', 'ayudante_cocina', 'cajero'].includes(user?.rol);

  // 👇 VERIFICAR REGLA DE ASISTENCIA
  const isAsistenciaPin = configGlobal?.asistencia_pin_caja === undefined || configGlobal?.asistencia_pin_caja === true || String(configGlobal?.asistencia_pin_caja) === 'true';

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm z-40 shrink-0 flex flex-col w-full animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between px-6 py-4 gap-4">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-black flex items-center gap-2 text-slate-800">
            <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg"><DollarSign size={24} /></div>
            CAJA
          </h1>
          {configGlobal && (
            <button
              onClick={toggleEstadoNegocio}
              className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 ${
                configGlobal.negocio_abierto
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              {configGlobal.negocio_abierto ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {configGlobal.negocio_abierto ? 'Recepción Abierta' : 'Pedidos Detenidos'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          
          {/* 👇 NUEVO BOTÓN DE ACCESO RÁPIDO AL COMEDOR PERSONAL */}
          <button
            onClick={() => setModalComedor(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-3 rounded-2xl font-black text-sm transition flex items-center gap-2 active:scale-95 border border-indigo-200"
            title="Comida de Personal"
          >
            <Utensils size={18}/> <span className="hidden lg:inline">Comedor</span>
          </button>

          <button
            onClick={abrirIdentificador}
            className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black text-sm transition shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <PlusCircle size={20}/> Levantar Pedido
          </button>
          
          {canCompras && (
            <button
              onClick={() => setModalCompraRapida(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-2xl font-bold transition flex items-center gap-2 active:scale-95"
              title="Compras Rápidas de Insumos"
            >
              <ShoppingCart size={20}/>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200 ml-2">
            
            {isAsistenciaPin && (
              <div className="flex flex-col gap-1 pr-3 border-r border-slate-200 mr-1">
                <button onClick={() => setModalAsistencia('Entrada')} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-md transition active:scale-95 border border-emerald-100">
                  ▶ Entrada
                </button>
                <button onClick={() => setModalAsistencia('Salida')} className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-md transition active:scale-95 border border-rose-100">
                  ⏹ Salida
                </button>
              </div>
            )}

            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-emerald-600">
                Operador: {user?.rol}
              </p>
              <p className="text-sm font-black text-slate-800 leading-none">{user?.nombre || user?.usuario}</p>
            </div>
            <button onClick={onLogout} className="bg-red-50 text-red-500 hover:bg-red-100 p-2.5 rounded-xl transition" title="Cerrar Sesión / Bloquear Caja">
              <LogOut size={18}/>
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex gap-2 w-max pb-1">
          <button onClick={() => setVistaActiva('mesas')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${vistaActiva === 'mesas' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
            <Map size={18}/> Mapa Mesas
          </button>
          <button onClick={() => setVistaActiva('confirmar')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${vistaActiva === 'confirmar' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
            <Phone size={18}/> Por Confirmar {pedidosPorConfirmar.length > 0 && <span className="bg-white/30 px-1.5 rounded-md">{pedidosPorConfirmar.length}</span>}
          </button>
          <button onClick={() => setVistaActiva('cobrar')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${vistaActiva === 'cobrar' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
            <ShoppingBag size={18}/> Cuentas / Cobrar {pendientesDePago.length > 0 && <span className="bg-white/30 px-1.5 rounded-md">{pendientesDePago.length}</span>}
          </button>
          <button onClick={() => setVistaActiva('mesas_pagadas')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${vistaActiva === 'mesas_pagadas' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
            <CheckCircle2 size={18}/> Mesas Pagadas {mesasPagadas.length > 0 && <span className="bg-white/30 px-1.5 rounded-md">{mesasPagadas.length}</span>}
          </button>
          <button onClick={() => setVistaActiva('entregas')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${vistaActiva === 'entregas' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
            <Monitor size={18}/> Entregas {listosParaEntregar.length > 0 && <span className="bg-white/30 px-1.5 rounded-md">{listosParaEntregar.length}</span>}
          </button>
          <button onClick={() => setVistaActiva('liquidacion_reparto')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${vistaActiva === 'liquidacion_reparto' ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-pink-600 border border-pink-200 hover:bg-pink-50'}`}>
            <Bike size={18}/> Por Liquidar 🛵 {pedidosEnReparto && pedidosEnReparto.length > 0 && <span className="bg-pink-500 text-white px-1.5 rounded-md shadow-sm">{pedidosEnReparto.length}</span>}
          </button>
          {canVerCocina && (
            <button onClick={() => setVistaActiva('cocina_mini')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none border ${vistaActiva === 'cocina_mini' ? 'bg-orange-100 text-orange-700 border-orange-300 shadow-inner' : 'bg-white text-orange-500 border-orange-200 hover:bg-orange-50'}`}>
              <ChefHat size={18}/> KDS Cocina
            </button>
          )}
          <button onClick={() => setVistaActiva('historial')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${vistaActiva === 'historial' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
            <List size={18}/> Ver Todos
          </button>
          <div className="w-px bg-slate-300 mx-1 shrink-0"></div>
          {canCorte && (
            <button onClick={() => setVistaActiva('corte')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${vistaActiva === 'corte' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
              <FileText size={18}/> Corte Caja
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopNavCaja;