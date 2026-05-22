import React from 'react';
import { PackagePlus, XCircle, CheckCircle2 } from 'lucide-react';

const ModalCompraRapida = ({
  modalCompraRapida, setModalCompraRapida, insumosDB, insumoComprar, setInsumoComprar,
  paquetesComprados, setPaquetesComprados, registrarCompraRapida, isSubmitting
}) => {
  if (!modalCompraRapida && !insumoComprar) return null;

  return (
    <>
      {modalCompraRapida && !insumoComprar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-6 mb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                  <PackagePlus className="text-emerald-500" size={32} /> Compras Rápidas
                </h2>
                <p className="text-slate-500 font-bold mt-1">Registra la entrada de insumos de emergencia.</p>
              </div>
              <button onClick={() => setModalCompraRapida(false)} className="bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 p-3 rounded-full transition">
                <XCircle size={28} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 bg-slate-50 rounded-2xl border border-slate-100">
              {insumosDB.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold">No hay insumos registrados en la base de datos.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-100 shadow-sm z-10">
                    <tr>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Insumo</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Stock Actual</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Costo Unit.</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {insumosDB.map(insumo => (
                      <tr key={insumo.id} className="hover:bg-white transition group">
                        <td className="p-4">
                          <p className="font-black text-slate-700">{insumo.nombre}</p>
                          <p className="text-xs font-bold text-slate-400">{insumo.cantidad_presentacion} {insumo.unidad_medida}</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-lg text-xs font-black ${Number(insumo.stock_actual) <= 0 ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
                            {Number(insumo.stock_actual || 0).toFixed(2)} {insumo.unidad_medida}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-600">${Number(insumo.costo_presentacion || 0).toFixed(2)}</td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => { setInsumoComprar(insumo); setPaquetesComprados(''); }}
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-xl font-black text-sm transition shadow-sm"
                          >
                            Registrar Compra
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {insumoComprar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <form onSubmit={registrarCompraRapida} className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-md animate-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black text-slate-800 mb-1">Ingresar Stock</h2>
            <p className="text-slate-500 font-bold mb-6 pb-4 border-b">
              Insumo: <span className="text-blue-600">{insumoComprar.nombre}</span> ({insumoComprar.cantidad_presentacion} {insumoComprar.unidad_medida})
            </p>

            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Paquetes / Cajas Compradas</label>
                <input 
                  type="number" min="0.1" step="0.1" required autoFocus disabled={isSubmitting}
                  value={paquetesComprados} onChange={(e) => setPaquetesComprados(e.target.value)} 
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-center text-3xl font-black outline-none focus:border-emerald-500 text-slate-800 disabled:opacity-50" 
                  placeholder="Ej. 2" 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Costo Fijo del Paquete ($)</label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center text-2xl font-black text-slate-500 cursor-not-allowed">
                  ${Number(insumoComprar.costo_presentacion) ? Number(insumoComprar.costo_presentacion).toFixed(2) : '0.00'}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl text-center">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Total Pagado a Proveedor</p>
                <p className="text-5xl font-black text-blue-700">
                  ${paquetesComprados && Number(insumoComprar.costo_presentacion) ? (Number(paquetesComprados) * Number(insumoComprar.costo_presentacion)).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button disabled={isSubmitting} type="button" onClick={() => { setInsumoComprar(null); setPaquetesComprados(''); }} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={!paquetesComprados || Number(paquetesComprados) <= 0 || isSubmitting} className="flex-[2] py-5 bg-emerald-500 text-white font-black text-xl rounded-2xl disabled:opacity-50 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition flex justify-center items-center gap-2"><CheckCircle2 size={24}/> {isSubmitting ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ModalCompraRapida;