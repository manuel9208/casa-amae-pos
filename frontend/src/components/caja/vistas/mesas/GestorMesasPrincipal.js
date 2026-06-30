import React, { useState, useEffect } from 'react';
import { Map, Trash2, LayoutGrid, AlertTriangle } from 'lucide-react';
import CuadriculaMesas from './CuadriculaMesas';
import PlanoMesas from './PlanoMesas';

const GestorMesasPrincipal = ({ mesas, pedidos, isSubmitting, limpiandoMesas, setLimpiandoMesas, setModalPago, liberarMesaMagicamente }) => {
  const [vistaMapa, setVistaMapa] = useState('plano'); 
  const [zonaPlanoActiva, setZonaPlanoActiva] = useState('');
  const [modalLiberarMesa, setModalLiberarMesa] = useState(null);

  // Lógica intacta: Auto-selección de zona
  useEffect(() => {
     if (mesas && mesas.length > 0 && !zonaPlanoActiva) {
         const zonasUnicas = [...new Set(mesas.map(m => m.zona))];
         if(zonasUnicas.length > 0) setZonaPlanoActiva(zonasUnicas[0]);
     }
  }, [mesas, zonaPlanoActiva]);

  // Lógica intacta: Liberación
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
    <div className="w-full h-full bg-slate-50 text-slate-800 p-4 md:p-6 overflow-y-auto custom-scrollbar">
        
        {/* ENCABEZADO DE LA SECCIÓN ALINEADO AL NUEVO DISEÑO */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8 animate-in fade-in">
           <div>
              <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 border border-indigo-200 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                Control de Comedor
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 tracking-tight flex items-center gap-2">
                Mapa de Mesas
              </h1>
              <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
                Visualiza el croquis interactivo o la cuadrícula para gestionar el comedor.
              </p>
           </div>
           
           <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
               {/* Botón de Liberación Forzada (Se mantiene) */}
               {mesas && mesas.some(m => m.estado !== 'Libre') && (
                   <button 
                      onClick={() => setModalLiberarMesa({ todas: true })} 
                      disabled={limpiandoMesas || isSubmitting}
                      className="w-full sm:w-auto bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-sm border border-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                      <Trash2 size={16}/> {limpiandoMesas ? 'Limpiando...' : 'Liberar Todas'}
                   </button>
               )}

               {mesas && mesas.length > 0 && (
                 <div className="flex bg-slate-200 p-1.5 rounded-xl shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar">
                   <button 
                      onClick={() => setVistaMapa('plano')} 
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${vistaMapa === 'plano' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     <Map size={16}/> Plano Visual
                   </button>
                   <button 
                      onClick={() => setVistaMapa('cuadricula')} 
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${vistaMapa === 'cuadricula' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     <LayoutGrid size={16}/> Cuadrícula
                   </button>
                 </div>
               )}
           </div>
        </div>

        {/* SELECTOR DE ZONAS (Scrollable para móviles) */}
        {mesas && mesas.length > 0 && vistaMapa === 'plano' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth mb-6 pb-2">
               {[...new Set(mesas.map(m => m.zona))].map(zona => (
                  <button
                     key={zona}
                     onClick={() => setZonaPlanoActiva(zona)}
                     className={`px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all whitespace-nowrap active:scale-95 ${zonaPlanoActiva === zona ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                  >
                     {zona}
                  </button>
               ))}
            </div>
        )}

        {/* RENDERIZADO DEL MAPA */}
        {!mesas || mesas.length === 0 ? (
           <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-[40px] border border-slate-200 border-dashed">
              <Map size={64} className="mx-auto mb-4 text-slate-300 animate-pulse"/>
              <p className="text-2xl font-black text-slate-400">Sin mesas configuradas</p>
              <p className="text-xs font-bold text-slate-400/80 mt-1 uppercase tracking-widest text-center">
                Da de alta tu croquis desde el administrador.
              </p>
           </div>
        ) : vistaMapa === 'cuadricula' ? (
            <CuadriculaMesas mesas={mesas} isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas} pedidos={pedidos} setModalPago={setModalPago} setModalLiberarMesa={setModalLiberarMesa} />
        ) : (
            <PlanoMesas mesas={mesas} zonaPlanoActiva={zonaPlanoActiva} isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas} pedidos={pedidos} setModalPago={setModalPago} setModalLiberarMesa={setModalLiberarMesa} />
        )}

        {/* MODAL DE LIBERACIÓN (Intacto) */}
        {modalLiberarMesa && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-md text-center animate-in zoom-in duration-200">
              <div className="mx-auto bg-red-100 text-red-600 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-6 shadow-inner">
                 <AlertTriangle size={40} className="md:w-12 md:h-12" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">
                {modalLiberarMesa.todas ? 'Liberar Todas las Mesas' : `Liberar Mesa ${modalLiberarMesa.mesa}`}
              </h2>
              <p className="text-slate-500 text-sm font-medium mb-8 px-2">
                {modalLiberarMesa.todas
                  ? '¿Estás seguro de forzar la limpieza de todo el mapa? Esta acción no se puede deshacer.'
                  : 'El sistema no detecta un pedido activo. ¿Deseas forzar la limpieza de esta mesa?'}
              </p>
              <div className="flex gap-3 md:gap-4">
                <button disabled={limpiandoMesas} onClick={() => setModalLiberarMesa(null)} className="flex-1 py-3 md:py-4 bg-slate-100 text-slate-600 font-black text-sm md:text-base rounded-2xl hover:bg-slate-200 transition disabled:opacity-50">
                  Cancelar
                </button>
                <button disabled={limpiandoMesas} onClick={confirmarLiberacionMesa} className="flex-[2] py-3 md:py-4 bg-red-500 text-white font-black text-sm md:text-lg rounded-2xl hover:bg-red-600 shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {limpiandoMesas ? 'Limpiando...' : 'Sí, Forzar'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default GestorMesasPrincipal;