import React, { useState, useEffect } from 'react';
import { Map, Trash2, LayoutGrid, AlertTriangle } from 'lucide-react';
import CuadriculaMesas from './CuadriculaMesas';
import PlanoMesas from './PlanoMesas';

const VistaMesas = ({ mesas, pedidos, isSubmitting, limpiandoMesas, setLimpiandoMesas, setModalPago, liberarMesaMagicamente }) => {
  const [vistaMapa, setVistaMapa] = useState('plano'); 
  const [zonaPlanoActiva, setZonaPlanoActiva] = useState('');
  const [modalLiberarMesa, setModalLiberarMesa] = useState(null);

  useEffect(() => {
     if (mesas && mesas.length > 0 && !zonaPlanoActiva) {
         const zonasUnicas = [...new Set(mesas.map(m => m.zona))];
         if(zonasUnicas.length > 0) setZonaPlanoActiva(zonasUnicas[0]);
     }
  }, [mesas, zonaPlanoActiva]);

  const confirmarLiberacionMesa = async () => {
      setLimpiandoMesas(true);
      if (modalLiberarMesa.todas) {
          const mesasOcupadas = mesas.filter(m => m.estado !== 'Libre');
          for (let m of mesasOcupadas) {
              await liberarMesaMagicamente(m.numero_mesa);
          }
      } else {
          await liberarMesaMagicamente(modalLiberarMesa.mesa);
      }
      setLimpiandoMesas(false);
      setModalLiberarMesa(null);
  };

  return (
    <>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
           <div className="flex items-center gap-4">
               <h2 className="text-4xl font-black text-slate-800 flex items-center gap-3"><Map size={36} className="text-indigo-600"/> Mapa de Mesas</h2>
               {mesas && mesas.some(m => m.estado !== 'Libre') && (
                   <button 
                      onClick={() => setModalLiberarMesa({ todas: true })} 
                      disabled={limpiandoMesas || isSubmitting}
                      className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm border border-red-200 flex items-center gap-2 disabled:opacity-50"
                   >
                      <Trash2 size={16}/> {limpiandoMesas ? 'Limpiando...' : 'Forzar Liberación de Todas'}
                   </button>
               )}
           </div>
           
           {mesas && mesas.length > 0 && (
             <div className="flex flex-col sm:flex-row gap-4 items-center">
               {vistaMapa === 'plano' && (
                  <div className="flex gap-2 overflow-x-auto max-w-[50vw]">
                     {[...new Set(mesas.map(m => m.zona))].map(zona => (
                        <button
                           key={zona}
                           onClick={() => setZonaPlanoActiva(zona)}
                           className={`px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${zonaPlanoActiva === zona ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                        >
                           {zona}
                        </button>
                     ))}
                  </div>
               )}

               <div className="flex bg-slate-200 p-1 rounded-xl shrink-0">
                 <button 
                    onClick={() => setVistaMapa('plano')} 
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${vistaMapa === 'plano' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   <Map size={16}/> Plano Visual
                 </button>
                 <button 
                    onClick={() => setVistaMapa('cuadricula')} 
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${vistaMapa === 'cuadricula' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   <LayoutGrid size={16}/> Cuadrícula
                 </button>
               </div>
             </div>
           )}
        </div>

        {!mesas || mesas.length === 0 ? (
           <div className="text-center text-slate-400 mt-20">
              <Map size={64} className="mx-auto mb-4 opacity-30"/>
              <p className="text-2xl font-bold">No hay mesas configuradas aún.</p>
           </div>
        ) : vistaMapa === 'cuadricula' ? (
            <CuadriculaMesas mesas={mesas} isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas} pedidos={pedidos} setModalPago={setModalPago} setModalLiberarMesa={setModalLiberarMesa} />
        ) : (
            <PlanoMesas mesas={mesas} zonaPlanoActiva={zonaPlanoActiva} isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas} pedidos={pedidos} setModalPago={setModalPago} setModalLiberarMesa={setModalLiberarMesa} />
        )}

        {modalLiberarMesa && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-md text-center animate-in zoom-in duration-200">
              <div className="mx-auto bg-red-100 text-red-600 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner">
                 <AlertTriangle size={48} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">
                {modalLiberarMesa.todas ? 'Liberar Todas las Mesas' : `Liberar Mesa ${modalLiberarMesa.mesa}`}
              </h2>
              <p className="text-slate-500 font-medium mb-8 px-2">
                {modalLiberarMesa.todas
                  ? '¿Estás seguro de forzar la limpieza de todo el mapa? Esta acción no se puede deshacer.'
                  : 'El sistema no detecta un pedido activo en tu turno de hoy. ¿Deseas forzar la limpieza de esta mesa?'}
              </p>
              <div className="flex gap-4">
                <button disabled={limpiandoMesas} onClick={() => setModalLiberarMesa(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50">
                  Cancelar
                </button>
                <button disabled={limpiandoMesas} onClick={confirmarLiberacionMesa} className="flex-[2] py-4 bg-red-500 text-white font-black text-lg rounded-2xl hover:bg-red-600 shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {limpiandoMesas ? 'Limpiando...' : 'Sí, Forzar Liberación'}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
};

export default VistaMesas;