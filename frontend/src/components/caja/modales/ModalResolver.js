import React from 'react';
import { BellRing, CheckCircle2, MessageSquare } from 'lucide-react';  

const ModalResolver = ({
  modalResolver, setModalResolver, itemAfectadoIdx, setItemAfectadoIdx, accionAlerta, setAccionAlerta,
  ingredienteReemplazo, setIngredienteReemplazo, enviarRespuestaCocina, catalogoIngredientes, clasificaciones, isSubmitting
}) => {
  if (!modalResolver) return null;  

  const alertaLimpia = modalResolver.alertaLimpia || modalResolver.alerta_cocina.replace(/\[IDX:[\d,]+\]\s*/g, '');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={enviarRespuestaCocina} className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-xl">
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
          <BellRing className="text-red-500" size={32} />
          <h2 className="text-2xl font-black text-slate-800">Responder a Cocina</h2>
        </div>
        <div className="bg-red-50 p-4 rounded-2xl mb-6 border border-red-100">
          <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Mensaje del Chef:</p>
          <p className="text-lg font-black text-red-700">{alertaLimpia}</p>
        </div>  

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-black text-slate-400 uppercase mb-2">1. Platillo con el problema</label>
            <select required value={itemAfectadoIdx} onChange={(e) => {setItemAfectadoIdx(e.target.value); setIngredienteReemplazo('');}} disabled={modalResolver.alerta_cocina.includes('[IDX:') || isSubmitting} className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none text-slate-700 ${modalResolver.alerta_cocina.includes('[IDX:') ? 'opacity-70 cursor-not-allowed' : 'focus:border-blue-500'}`}>
              <option value="">Selecciona el platillo...</option>
              {(modalResolver.carrito || []).map((item, idx) => {
                const extrasStr = (item.extras || []).map(e => e.nombre).join(', ');
                const nombreLabel = `${item.nombre}${extrasStr ? ` (${extrasStr})` : ''}`;
                return <option key={idx} value={idx}>{nombreLabel}</option>
              })}
            </select>
          </div>  

          {itemAfectadoIdx !== '' && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in fade-in">
              <label className="block text-sm font-black text-slate-400 uppercase mb-3">2. ¿Qué decidió el cliente?</label>
              <div className="flex flex-col gap-3 mb-4">
                
                {(() => {
                  const match = alertaLimpia.match(/PROPUESTA COCINA:\s*(.*)/i) || alertaLimpia.match(/Propuesta:\s*(.*)/i);
                  const propuestaChef = match ? match[1].trim() : null;
                  
                  const esPropuestaAccionable = propuestaChef && !propuestaChef.toLowerCase().includes('otra cosa') && !propuestaChef.toLowerCase().includes('cancelar este platillo');

                  if (esPropuestaAccionable) {
                    return (
                      <label className={`w-full flex items-center gap-3 cursor-pointer p-4 border rounded-xl font-bold transition ${accionAlerta === 'aceptar' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white text-slate-600 hover:border-slate-300'}`}>
                        <input disabled={isSubmitting} type="radio" name="accion" value="aceptar" checked={accionAlerta === 'aceptar'} onChange={() => setAccionAlerta('aceptar')} className="hidden" /><CheckCircle2 size={20}/> Aceptar Propuesta: {propuestaChef}
                      </label>
                    );
                  }
                  return null;
                })()}  

                <div className="flex gap-3">
                  <label className={`flex-1 flex text-center items-center justify-center gap-2 cursor-pointer p-4 border rounded-xl font-bold transition ${accionAlerta === 'quitar' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-slate-600 hover:border-slate-300'}`}>
                    <input disabled={isSubmitting} type="radio" name="accion" value="quitar" checked={accionAlerta === 'quitar'} onChange={() => setAccionAlerta('quitar')} className="hidden" /> Quitar Faltante
                  </label>
                  <label className={`flex-1 flex text-center items-center justify-center gap-2 cursor-pointer p-4 border rounded-xl font-bold transition ${accionAlerta === 'cambiar' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-slate-600 hover:border-slate-300'}`}>
                    <input disabled={isSubmitting} type="radio" name="accion" value="cambiar" checked={accionAlerta === 'cambiar'} onChange={() => setAccionAlerta('cambiar')} className="hidden" /> Cambiarlo por...
                  </label>
                </div>
                <label className={`w-full flex items-center gap-3 cursor-pointer p-4 border rounded-xl font-bold transition ${accionAlerta === 'cancelar' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white text-slate-600 hover:border-slate-300'}`}>
                   <input disabled={isSubmitting} type="radio" name="accion" value="cancelar" checked={accionAlerta === 'cancelar'} onChange={() => setAccionAlerta('cancelar')} className="hidden" /> Cancelar todo el Pedido
                </label>
              </div>
            </div>  
          )}

          {accionAlerta === 'cambiar' && (
            <div className="animate-in fade-in zoom-in duration-200 mt-4 pt-4 border-t border-slate-200">
              <label className="block text-xs font-black text-slate-400 uppercase mb-2">Opciones Disponibles</label>
              <select disabled={isSubmitting} required value={ingredienteReemplazo} onChange={(e) => setIngredienteReemplazo(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 text-slate-700 shadow-sm">
                <option value="">Selecciona reemplazo...</option>
                {(() => {
                  const itemSeleccionado = modalResolver.carrito[itemAfectadoIdx];
                  if(!itemSeleccionado) return null;
                  
                  // 👇 FIX: Caja también hace el cruce inteligente
                  const categoriaItem = String(itemSeleccionado.categoria || itemSeleccionado.clasificacion_nombre || '').trim().toLowerCase();
                  
                  const clasifObj = (clasificaciones || []).find(c => String(c.nombre).trim().toLowerCase() === categoriaItem);
                  const clasifId = clasifObj ? clasifObj.id : null;

                  const bases = catalogoIngredientes.filter(ing => 
                    (clasifId && Number(ing.clasificacion_id) === Number(clasifId)) || 
                    (String(ing.clasificacion_nombre || '').trim().toLowerCase() === categoriaItem)
                  );
                  
                  return bases.length > 0 ? bases.map(b => <option key={b.id} value={b.nombre}>{b.nombre}</option>) : <option disabled>No hay ingredientes registrados.</option>;
                })()}
              </select>
            </div>
          )}
        </div>  

        <div className="flex gap-4">
          <button disabled={isSubmitting} type="button" onClick={() => {setModalResolver(null); setItemAfectadoIdx('');}} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={itemAfectadoIdx === '' || !accionAlerta || (accionAlerta==='cambiar' && !ingredienteReemplazo) || isSubmitting} className="flex-[2] py-5 bg-blue-600 text-white font-black text-xl rounded-2xl hover:bg-blue-700 shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2"><MessageSquare size={24}/> {isSubmitting ? 'Enviando...' : 'Enviar Respuesta'}</button>
        </div>
      </form>
    </div>
  );
};  

export default ModalResolver;