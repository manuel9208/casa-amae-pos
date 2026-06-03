import React, { useState } from 'react';
import { ChefHat, CheckCircle2 } from 'lucide-react';

const VistaCocinaMini = ({ user, pedidos, empleadosPOS, apiUrl, isSubmitting }) => {
  const [trabajadorActivoId, setTrabajadorActivoId] = useState(user?.id);
  const [procesandoLocal, setProcesandoLocal] = useState(false);

  const personalCocina = empleadosPOS.filter(emp => ['cocina', 'ayudante_cocina', 'admin', 'jefe', 'gerente'].includes(emp.rol));
  if (!personalCocina.find(e => e.id === user?.id) && user) personalCocina.unshift(user);

  const pedidosCocina = pedidos.filter(p => ['Pendiente', 'Pagado', 'Preparando'].includes(p.estado_preparacion) && p.tipo_consumo !== 'Mostrador');
  const getCarrito = (p) => typeof p.carrito === 'string' ? JSON.parse(p.carrito) : (p.carrito || []);
  const obtenerOrdenActiva = (id) => pedidosCocina.find(p => p.chef_id === id && p.estado_preparacion === 'Preparando');

  const manejarCambioEstado = async (pedidoId, nuevoEstado) => {
    if (procesandoLocal || isSubmitting) return;
    setProcesandoLocal(true);
    try {
      await fetch(`${apiUrl}/pedidos/${pedidoId}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_preparacion: nuevoEstado, chef_id: nuevoEstado === 'Preparando' ? trabajadorActivoId : undefined })
      });
    } catch (error) {}
    setTimeout(() => setProcesandoLocal(false), 800);
  };

  if (pedidosCocina.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white rounded-[40px] border border-slate-200 border-dashed animate-in fade-in">
        <ChefHat size={64} className="text-slate-300 mb-4 animate-pulse" /><p className="text-2xl font-black text-slate-400">Sin comandas en cola</p>
      </div>
    );
  }

  const ordenPendienteActivo = obtenerOrdenActiva(trabajadorActivoId);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2"><div className="bg-orange-100 text-orange-600 p-2 rounded-xl"><ChefHat size={20}/></div><p className="text-xs font-black uppercase text-slate-400 tracking-widest">Preparando:</p></div>
        <div className="flex flex-wrap gap-2 w-full">
          {personalCocina.map(emp => {
            const ocupado = obtenerOrdenActiva(emp.id);
            const esSeleccionado = trabajadorActivoId === emp.id;
            return (
              <button key={emp.id} onClick={() => setTrabajadorActivoId(emp.id)} className={`flex-1 sm:flex-none px-4 py-3 rounded-xl text-xs font-black uppercase transition-all duration-200 flex items-center justify-center gap-2 border ${esSeleccionado ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30 scale-105' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                <span>{emp.rol === 'ayudante_cocina' ? '🔪' : '👨‍🍳'} {emp.nombre || emp.usuario}</span>
                {ocupado && <span className="bg-red-500 text-white px-2 py-0.5 rounded-md text-[10px] animate-pulse">#{ocupado.numero_pedido}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {pedidosCocina.map(p => {
          const items = getCarrito(p);
          const esMiComanda = p.chef_id === trabajadorActivoId && p.estado_preparacion === 'Preparando';
          // 👇 CÁLCULO DE TIEMPO EXACTO
          const tiempoTotal = items.reduce((sum, item) => sum + ((Number(item.tiempo_preparacion) || 15) * (item.cantidad || 1)), 0);
          
          return (
            <div key={p.id} className={`bg-white rounded-[32px] p-6 border-2 shadow-sm flex flex-col transition-all duration-300 ${p.estado_preparacion === 'Preparando' ? 'border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.15)]' : 'border-slate-200'}`}>
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <h3 className="text-4xl font-black text-slate-800">#{p.numero_pedido}</h3>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{p.tipo_consumo}</p>
                  </div>
                  <div className="text-right flex flex-col gap-2 items-end">
                     <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${p.estado_preparacion === 'Preparando' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                       {p.estado_preparacion}
                     </span>
                     <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                       ⏱️ {tiempoTotal} min
                     </span>
                  </div>
               </div>

               <div className="space-y-3 flex-1 mb-6">
                 {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="font-black text-slate-700 text-base">{item.cantidad || 1}x {item.nombre}</p>
                       {item.extras && item.extras.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                             {item.extras.map((e, i) => (
                                <span key={i} className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${e.nombre.startsWith('Sin ') ? 'bg-red-100 text-red-600 line-through' : 'bg-emerald-100 text-emerald-700'}`}>
                                   {e.nombre}
                                </span>
                             ))}
                          </div>
                       )}
                    </div>
                 ))}
               </div>

               <div className="mt-auto border-t border-slate-100 pt-6">
                 {p.estado_preparacion !== 'Preparando' ? (
                    <button disabled={procesandoLocal || !!ordenPendienteActivo} onClick={() => manejarCambioEstado(p.id, 'Preparando')} className={`w-full font-black py-4 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 ${ordenPendienteActivo ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-white shadow-lg'}`}>
                      <div className="flex items-center gap-2"><ChefHat size={18}/> Preparar Pedido</div>
                    </button>
                 ) : (
                    <button disabled={procesandoLocal || !esMiComanda} onClick={() => manejarCambioEstado(p.id, 'Listo')} className={`w-full font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 ${esMiComanda ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 active:scale-95' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}`}>
                      <CheckCircle2 size={20}/> {esMiComanda ? '¡Terminar Pedido!' : 'Asignado a otro Chef'}
                    </button>
                 )}
               </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};
export default VistaCocinaMini;