import React from 'react';

const MisPedidos = ({ misPedidos, setPantallaActual, modificarPedido }) => {
  return (
    <div className="max-w-4xl mx-auto mt-10 animate-in fade-in">
      <div className="flex justify-between items-end mb-8">
        <h2 className="text-4xl font-black texto-destacado">Tus Órdenes Activas</h2>
        <button onClick={() => setPantallaActual('menu')} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-md hover:bg-blue-700 transition">Nueva Orden</button>
      </div>
      <div className="space-y-4">
        {misPedidos.map(p => (
          <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center hover:shadow-md transition">
            <div>
              <p className="text-2xl font-black text-slate-800">Orden #{p.numero_pedido} <span className="text-xs bg-gray-100 text-slate-600 px-2 py-1 ml-2 rounded-lg">{p.estado_preparacion}</span></p>
              <p className="text-slate-500 font-medium mt-1">Total: <span className="font-bold text-blue-600">${p.total}</span></p>
            </div>
            {p.estado_preparacion === 'Pendiente' ? (
              <button onClick={() => modificarPedido(p)} className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-orange-500 hover:text-white transition active:scale-95">✏️ Modificar</button> 
            ) : (
              <p className="text-sm font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-xl">En proceso 👩‍🍳</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MisPedidos;