import React from 'react';

const ModalProblema = ({ 
  modalAlerta, setModalAlerta, faltanteSelec, setFaltanteSelec, propuestaSelec, 
  setPropuestaSelec, catalogoIngredientes, isSubmitting, enviarAlerta 
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-slate-800 p-8 rounded-[40px] shadow-2xl w-full max-w-xl border border-slate-700">
        <h3 className="text-2xl font-black text-white mb-2">Reportar en {modalAlerta.item.nombre}</h3>
        <p className="text-slate-400 font-bold mb-6 text-sm">Resuelve rápido con 3 toques</p>
        
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-700">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">1. ¿Qué se terminó?</p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const removidos = (modalAlerta.item.extras || [])
                    .filter(e => e.nombre.startsWith('Sin '))
                    .map(e => e.nombre.replace('Sin ', ''));

                const basesDelPlatillo = (modalAlerta.item.opciones || [])
                    .filter(o => o.tipo === 'base' && !removidos.includes(o.nombre));
                
                const opciones = [{ id: 'platillo_completo', nombre: `Todo el platillo (${modalAlerta.item.nombre})` }, ...basesDelPlatillo];
                
                return opciones.map((b, idx) => (
                  <button key={idx} type="button" onClick={() => { setFaltanteSelec(b.nombre); setPropuestaSelec(''); }} className={`px-4 py-3 rounded-xl font-bold text-sm transition border ${faltanteSelec === b.nombre ? 'bg-red-500 text-white border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>{b.nombre}</button>
                ));
              })()}
            </div>
          </div>

          {faltanteSelec && (
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-700 animate-in fade-in">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">2. ¿Qué propones?</p>
              <div className="flex flex-wrap gap-2">
                {faltanteSelec.startsWith('Todo el platillo') ? (
                  <>
                    <button type="button" onClick={() => setPropuestaSelec('Cancelar este platillo')} className={`px-4 py-3 rounded-xl font-bold text-sm transition border ${propuestaSelec === 'Cancelar este platillo' ? 'bg-orange-500 text-white border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>Cancelar este platillo</button>
                    <button type="button" onClick={() => setPropuestaSelec('Que el cliente elija otra cosa')} className={`px-4 py-3 rounded-xl font-bold text-sm transition border ${propuestaSelec === 'Que el cliente elija otra cosa' ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>Que el cliente pida otra cosa</button>
                  </>
                ) : (
                  <>
                    {(() => {
                      const opcionesCatalogo = catalogoIngredientes.filter(i => i.clasificacion_nombre === modalAlerta.item.categoria && i.tipo === 'base');
                      const opcionesPlatillo = modalAlerta.item.opciones?.filter(o => o.tipo === 'base') || [];
                      
                      const propuestasMap = new Map();
                      opcionesCatalogo.forEach(o => propuestasMap.set(o.nombre, o.nombre));
                      opcionesPlatillo.forEach(o => propuestasMap.set(o.nombre, o.nombre));
                      propuestasMap.delete(faltanteSelec);
                      
                      const propuestas = Array.from(propuestasMap.values());
                      
                      return propuestas.map(nombrePropuesta => (
                        <button key={nombrePropuesta} type="button" onClick={() => setPropuestaSelec(nombrePropuesta)} className={`px-4 py-3 rounded-xl font-bold text-sm transition border ${propuestaSelec === nombrePropuesta ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>
                          {nombrePropuesta}
                        </button>
                      ));
                    })()}
                    <button type="button" onClick={() => setPropuestaSelec('Solo quitarlo')} className={`px-4 py-3 rounded-xl font-bold text-sm transition border ${propuestaSelec === 'Solo quitarlo' ? 'bg-orange-500 text-white border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>Solo prepararlo sin {faltanteSelec}</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-4 mt-8">
          <button type="button" onClick={() => { setModalAlerta(null); setFaltanteSelec(''); setPropuestaSelec(''); }} className="flex-1 py-4 bg-slate-700 text-white font-black rounded-2xl hover:bg-slate-600 transition">Cancelar</button>
          <button onClick={enviarAlerta} disabled={!faltanteSelec || !propuestaSelec || isSubmitting} className="flex-[2] py-4 bg-red-600 text-white font-black text-lg rounded-2xl hover:bg-red-500 disabled:opacity-30 transition shadow-[0_0_15px_rgba(220,38,38,0.3)]">
             3. Enviar a Caja
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalProblema;