import React from 'react';

const FooterPersonalizar = ({
  itemAEditar, cantidadProducto, setCantidadProducto, totalPlatillo, cerrarModal, confirmarYAgregar
}) => {
  return (
    <>
      <div className="pt-4 border-t border-slate-200 mt-4 flex items-center justify-between">
        {!itemAEditar && ( 
          <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-xl border border-slate-200">
            <button type="button" onClick={() => setCantidadProducto(c => Math.max(1, c - 1))} className="w-10 h-10 bg-white rounded-lg font-black text-xl shadow-sm text-slate-600 hover:text-blue-600">-</button>
            <span className="font-black text-xl w-6 text-center text-slate-800">{cantidadProducto}</span>
            <button type="button" onClick={() => setCantidadProducto(c => c + 1)} className="w-10 h-10 bg-white rounded-lg font-black text-xl shadow-sm text-slate-600 hover:text-blue-600">+</button>
          </div> 
        )}
        <div className="text-right flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase">Total Platillo</p>
          <p className="text-3xl font-black text-blue-600">${totalPlatillo}</p>
        </div>
      </div>

      <div className="flex gap-4 mt-6 pt-4 border-t border-slate-100">
        <button type="button" onClick={cerrarModal} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">Cancelar</button>
        <button type="button" onClick={confirmarYAgregar} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition shadow-lg text-lg active:scale-95">
          {itemAEditar ? 'Actualizar' : `Añadir (${cantidadProducto})`}
        </button>
      </div>
    </>
  );
};

export default FooterPersonalizar;