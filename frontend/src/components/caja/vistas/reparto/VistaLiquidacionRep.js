import React from 'react';
import { Wallet, CheckCircle2, ChevronRight, AlertCircle, MapPin } from 'lucide-react';

const VistaLiquidacionRep = ({ 
    pedidosEnReparto, fondoRepartidor, actualizarFondoRepartidor, setModalPago 
}) => {
  
  const pedidosEfectivo = pedidosEnReparto.filter(p => ['Pendiente', 'Por Cobrar', 'Efectivo'].includes(p.metodo_pago));
  const deudaPedidosEfectivo = pedidosEfectivo.reduce((sum, p) => sum + Number(p.total), 0);
  
  const fondoFeria = Number(fondoRepartidor) || 0;
  const totalAEntregar = deudaPedidosEfectivo + fondoFeria;

  return (
    <div className="w-full h-full bg-slate-50 text-slate-800 p-6 overflow-y-auto animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
        <div>
          <span className="text-[10px] font-black bg-pink-50 text-pink-600 border border-pink-200 px-2.5 py-1 rounded-full uppercase tracking-widest">Módulo de Logística</span>
          <h1 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">Liquidación de Repartidores</h1>
          <p className="text-slate-500 text-xs mt-0.5">Audita y recolecta el efectivo de repartidores antes del corte financiero.</p>
        </div>

        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col min-w-[200px]">
           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Fondo / Feria Asignada ($)</label>
           <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-black text-lg">$</span>
              <input 
                 type="number" min="0" step="1" value={fondoRepartidor} onChange={(e) => actualizarFondoRepartidor(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-8 pr-4 text-xl font-black text-slate-800 outline-none focus:border-pink-500 transition-colors"
                 placeholder="0.00"
              />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
           <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">Órdenes en la Calle ({pedidosEnReparto.length})</h3>
           
           {pedidosEnReparto.length === 0 ? (
               <div className="bg-slate-100/60 border border-slate-200 border-dashed p-12 rounded-[40px] text-center">
                  <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4 opacity-60"/>
                  <p className="text-xl font-bold text-slate-500">No hay repartidores con órdenes en la calle.</p>
               </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {pedidosEnReparto.map(p => {
                 const esEfectivo = ['Pendiente', 'Por Cobrar', 'Efectivo'].includes(p.metodo_pago);
                 return (
                 <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col hover:border-pink-300 transition-colors">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                        <div>
                           <span className="text-2xl font-black text-slate-800">#{p.numero_pedido}</span>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1"><MapPin size={12}/> {p.cliente_nombre || 'Invitado'}</p>
                        </div>
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest ${esEfectivo ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                           {esEfectivo ? 'A COBRAR' : 'PAGADO LÍNEA'}
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-sm font-bold text-slate-500">Monto Orden:</span>
                        <span className={`text-2xl font-black ${esEfectivo ? 'text-pink-600' : 'text-slate-400 line-through'}`}>${p.total}</span>
                    </div>

                    <button onClick={() => setModalPago(p)} className={`w-full font-black py-4 rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 ${esEfectivo ? 'bg-slate-800 hover:bg-slate-700 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                       Liquidar Orden <ChevronRight size={18}/>
                    </button>
                 </div>
               )})}
             </div>
           )}
        </div>

        <div className="lg:col-span-4 bg-pink-50 p-8 rounded-[40px] border-2 border-pink-200 flex flex-col sticky top-4">
            <h3 className="text-xl font-black text-pink-900 mb-6 flex items-center gap-2"><Wallet size={24}/> Total a Recibir</h3>
            
            <div className="space-y-4 mb-8">
               <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-pink-700">Deuda Pedidos (Efectivo)</span>
                  <span className="text-lg font-black text-pink-900">${deudaPedidosEfectivo.toFixed(2)}</span>
               </div>
               <div className="flex justify-between items-center pb-4 border-b border-pink-200">
                  <span className="text-sm font-bold text-pink-700">Fondo Inicial (Feria)</span>
                  <span className="text-lg font-black text-pink-900">${fondoFeria.toFixed(2)}</span>
               </div>
               <div className="flex justify-between items-end pt-2">
                  <span className="text-sm font-black text-pink-800 uppercase tracking-widest">Total Esperado</span>
                  <span className="text-5xl font-black text-pink-600">${totalAEntregar.toFixed(2)}</span>
               </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-inner mt-auto flex items-start gap-3">
               <AlertCircle size={20} className="text-pink-400 shrink-0 mt-0.5" />
               <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                  Liquida las órdenes una por una. Al finalizar, el total esperado debe coincidir con el efectivo físico entregado por el repartidor.
               </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default VistaLiquidacionRep;