import React from 'react';
import { CheckSquare } from 'lucide-react';
import TarjetaMesaPagada from './TarjetaMesaPagada';

const GestorMesasPagadasPrincipal = ({
  mesasPagadas,
  isSubmitting,
  limpiandoMesas,
  liberarMesaMagicamente,
  renderBotonVerDetalle,
  renderBotonEditar
}) => {
  return (
    <div className="w-full h-full bg-slate-50 text-slate-800 p-4 md:p-6 overflow-y-auto custom-scrollbar">
      
      {/* ENCABEZADO DE LA SECCIÓN */}
      <div className="mb-8 animate-in fade-in">
        <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
          Módulo de Comedor
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 tracking-tight">
          Mesas Pagadas (Por Liberar)
        </h1>
        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
          Cuentas liquidadas. Libera la mesa cuando los comensales se retiren.
        </p>
      </div>

      {/* GRID DE MESAS PAGADAS O ESTADO VACÍO */}
      {mesasPagadas && mesasPagadas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
          {mesasPagadas.map(mesa => (
            <TarjetaMesaPagada 
              key={mesa.id}
              mesa={mesa}
              liberarMesaMagicamente={liberarMesaMagicamente}
              limpiandoMesas={limpiandoMesas}
              isSubmitting={isSubmitting}
              renderBotonVerDetalle={renderBotonVerDetalle}
              renderBotonEditar={renderBotonEditar}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white rounded-[40px] border border-slate-200 border-dashed animate-in fade-in duration-300 max-w-2xl mx-auto">
          <CheckSquare size={64} className="text-emerald-300 mb-4 animate-pulse" />
          <p className="text-2xl font-black text-slate-400">Sin mesas pendientes de limpieza</p>
          <p className="text-xs font-bold text-slate-400/80 mt-1 uppercase tracking-widest text-center max-w-sm">
            Todas las mesas pagadas han sido liberadas exitosamente del sistema.
          </p>
        </div>
      )}
    </div>
  );
};

export default GestorMesasPagadasPrincipal;