import React, { useState, useEffect } from 'react';
import { LogOut, Clock, ChefHat, CheckCircle2, MonitorPlay, AlertTriangle } from 'lucide-react';

const PantallaTV = ({ onLogout }) => {
  const [pedidos, setPedidos] = useState([]);
  const [config, setConfig] = useState({});
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

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

  // LOGICA PARCIAL PARA TV: Separar en tarjetas de Cocina y Barra
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" style={{ backgroundColor: config.color_fondo || '#f1f5f9' }}>
      <div className="flex items-center justify-between p-6 bg-white shadow-sm">
        <button onClick={onLogout} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition">
          <LogOut size={24} className="text-slate-500" />
        </button>
        <h1 className="text-5xl font-black tracking-tight text-slate-800 flex items-center gap-4" style={{ fontFamily: config.fuente_titulos }}>
          <MonitorPlay size={40} className="text-slate-700"/> ESTADO DE TU ORDEN
        </h1>
        <div className="w-16"></div> 
      </div>

      <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* === COLUMNA: EN COLA === */}
        <div className="bg-slate-100/50 rounded-[40px] flex flex-col overflow-hidden border border-slate-200 shadow-sm">
          <div className="bg-slate-200/50 py-6 text-center border-b border-slate-200">
            <h2 className="text-2xl font-black text-slate-600 flex items-center justify-center gap-3 tracking-widest uppercase" style={{ fontFamily: config.fuente_titulos }}>
              <Clock size={28} /> {config.tv_msg_cola || 'EN COLA'}
            </h2>
          </div>
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            {enCola.map(p => (
              <div key={p.uid} className={`p-6 rounded-3xl shadow-sm border flex flex-col items-center justify-center animate-in fade-in ${p.alerta_cocina ? 'bg-red-50 border-red-300 ring-2 ring-red-400 animate-pulse' : 'bg-white border-slate-100'}`}>
                <span className={`text-4xl font-black ${p.alerta_cocina ? 'text-red-600' : 'text-slate-800'}`}>#{p.numero_pedido}</span>
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
          <div className="bg-blue-100/50 py-6 text-center border-b border-blue-200">
            <h2 className="text-2xl font-black text-blue-600 flex items-center justify-center gap-3 tracking-widest uppercase" style={{ fontFamily: config.fuente_titulos }}>
              <ChefHat size={28} /> {config.tv_msg_progreso || 'PREPARANDO'}
            </h2>
          </div>
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            {preparando.map(p => (
              <div key={p.uid} className={`p-6 rounded-3xl shadow-md border flex flex-col items-center justify-center ring-offset-2 animate-pulse ${p.alerta_cocina ? 'bg-red-50 border-red-300 ring-2 ring-red-500' : 'bg-white border-blue-100 ring-2 ring-blue-400'}`}>
                <span className={`text-5xl font-black ${p.alerta_cocina ? 'text-red-600' : 'text-blue-700'}`}>#{p.numero_pedido}</span>
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
              <div key={p.uid} className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-200 flex flex-col items-center justify-center animate-in zoom-in slide-in-from-bottom-4 duration-500">
                <span className="text-7xl font-black text-emerald-600">#{p.numero_pedido}</span>
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