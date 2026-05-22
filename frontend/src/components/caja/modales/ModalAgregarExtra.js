import React from 'react';
import { PlusCircle, AlertTriangle } from 'lucide-react';

const ModalAgregarExtra = ({
  modalAgregarExtra, setModalAgregarExtra, confirmarAgregarExtra, catalogoIngredientes, isSubmitting
}) => {
  if (!modalAgregarExtra) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-lg animate-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <PlusCircle className="text-emerald-500" size={32} />
          <div>
            <h2 className="text-2xl font-black text-slate-800">Agregar Extra</h2>
            <p className="text-sm font-bold text-slate-500">A {modalAgregarExtra.itemSeleccionado.nombre}</p>
          </div>
        </div>

        <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Selecciona el extra a cobrar:</p>
        
        <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-2">
          {(() => {
            const categoriaPlatillo = modalAgregarExtra.itemSeleccionado.categoria || modalAgregarExtra.itemSeleccionado.clasificacion || '';
            const catLimpia = String(categoriaPlatillo).trim().toLowerCase();
            
            const extrasDisponibles = catalogoIngredientes.filter(ing => {
              const ingCatLimpia = String(ing.clasificacion_nombre || '').trim().toLowerCase();
              const permite = ing.permite_extra === true || ing.permite_extra === 'true' || ing.permite_extra === 't';
              return ingCatLimpia === catLimpia && permite;
            });
            
            if (extrasDisponibles.length === 0) {
              return (
                <div className="bg-orange-50 text-orange-700 p-4 rounded-xl border border-orange-200 flex items-center gap-3">
                  <AlertTriangle size={20} />
                  <p className="font-bold text-sm">No hay extras permitidos para la categoría "{categoriaPlatillo}".</p>
                </div>
              );
            }

            return extrasDisponibles.map(extra => (
              <button 
                key={extra.id} 
                disabled={isSubmitting}
                onClick={() => confirmarAgregarExtra(modalAgregarExtra.pedidoOriginal, modalAgregarExtra.itemIndex, extra)}
                className="w-full flex justify-between items-center p-4 bg-white border-2 border-slate-100 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition group text-left disabled:opacity-50"
              >
                <span className="font-black text-slate-700 group-hover:text-emerald-800">{extra.nombre}</span>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-black group-hover:bg-emerald-600 group-hover:text-white transition">
                  {Number(extra.precio_extra) > 0 ? `+ $${Number(extra.precio_extra).toFixed(2)}` : 'Gratis'}
                </span>
              </button>
            ));
          })()}
        </div>

        <div className="flex gap-4">
          <button disabled={isSubmitting} onClick={() => setModalAgregarExtra(null)} className="w-full py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgregarExtra;