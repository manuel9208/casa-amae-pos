import React from 'react';
import { Users, Award, Clock, Utensils, CreditCard, Smartphone } from 'lucide-react';

const AnaliticaClientes = ({ clientes, reportes }) => {
  if (!reportes) return null;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      {/* Tarjetas Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="bg-purple-100 text-purple-600 p-4 rounded-2xl"><Users size={32}/></div>
          <div><p className="text-sm font-black text-slate-400 uppercase tracking-widest">Total Registrados</p><p className="text-3xl font-black text-slate-800">{clientes.length}</p></div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl"><Award size={32}/></div>
          <div><p className="text-sm font-black text-slate-400 uppercase tracking-widest">Puntos Repartidos</p><p className="text-3xl font-black text-slate-800">{clientes.reduce((acc, c) => acc + (c.puntos||0), 0)}</p></div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl"><Clock size={32}/></div>
          <div><p className="text-sm font-black text-slate-400 uppercase tracking-widest">Promedio Edad</p><p className="text-3xl font-black text-slate-800">{reportes.promedioEdad} años</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Platillos */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Utensils className="text-orange-500"/> Platillos Favoritos</h3>
          <div className="space-y-4">
            {reportes.platillos.length === 0 && <p className="text-slate-400 font-bold">No hay datos suficientes.</p>}
            {reportes.platillos.map((p, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700">{i+1}. {p.platillo}</span>
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-black text-sm">{p.total} pedidos</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clientes Puntos */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Award className="text-emerald-500"/> Clientes VIP (Puntos)</h3>
          <div className="space-y-4">
            {reportes.topPuntos.length === 0 && <p className="text-slate-400 font-bold">No hay datos suficientes.</p>}
            {reportes.topPuntos.map((c, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700">{i+1}. {c.nombre} {c.apellido}</span>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-black text-sm">{c.puntos} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Preferencias de Pago y Origen */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><CreditCard className="text-blue-500"/> Métodos de Pago</h3>
            <div className="space-y-3">
              {reportes.pagos.length === 0 && <p className="text-slate-400 font-bold">No hay datos suficientes.</p>}
              {reportes.pagos.map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="font-bold text-slate-600">{p.metodo_pago}</span>
                  <span className="font-black text-blue-600">{p.cantidad} txns</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Smartphone className="text-purple-500"/> Origen de Pedidos</h3>
            <div className="space-y-3">
              {reportes.origenes.length === 0 && <p className="text-slate-400 font-bold">No hay datos suficientes.</p>}
              {reportes.origenes.map((o, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="font-bold text-slate-600">{o.origen}</span>
                  <span className="font-black text-purple-600">{o.cantidad} pedidos</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnaliticaClientes;