import React from 'react';
import { Wallet, Info } from 'lucide-react';

// Importamos nuestros subcomponentes aislados
import FormularioNuevoGasto from './FormularioNuevoGasto';
import RenglonGasto from './RenglonGasto';

const GestorGastosPrincipal = ({
  gastosHoy,
  totalGastos,
  nuevoGasto,
  setNuevoGasto,
  agregarGasto,
  eliminarGasto,
  isSubmitting
}) => {
  return (
    <div className="w-full h-full bg-slate-50 text-slate-800 p-4 md:p-6 overflow-y-auto custom-scrollbar">
      
      {/* ENCABEZADO PRINCIPAL DE LA PANTALLA */}
      <div className="mb-6 animate-in fade-in">
        <span className="text-[10px] font-black bg-red-100 text-red-600 border border-red-200 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
          Módulo Financiero
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 tracking-tight">
          Control de Egresos
        </h1>
        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
          Todo el dinero que salga de la caja chica debe ser registrado aquí.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: Formulario de Captura */}
        <div className="lg:col-span-5 xl:col-span-4">
          <FormularioNuevoGasto 
            nuevoGasto={nuevoGasto}
            setNuevoGasto={setNuevoGasto}
            agregarGasto={agregarGasto}
            isSubmitting={isSubmitting}
          />

          {/* Tarjeta Informativa Adicional */}
          <div className="mt-4 bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-blue-700 animate-in fade-in">
             <Info size={20} className="shrink-0 mt-0.5" />
             <p className="text-[10px] md:text-xs font-bold leading-relaxed">
               Los gastos ingresados en esta pantalla se <strong>restarán automáticamente</strong> del total de efectivo esperado en el Corte de Caja.
             </p>
          </div>
        </div>

        {/* COLUMNA DERECHA: Resumen y Lista de Gastos */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          
          {/* TARJETA DE IMPACTO TOTAL */}
          <div className="bg-white p-6 md:p-8 rounded-[36px] border border-red-100 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-4">
               <div className="bg-red-50 p-4 rounded-2xl text-red-500 border border-red-100">
                  <Wallet size={32} />
               </div>
               <div>
                 <p className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest">
                   Total de Egresos Hoy
                 </p>
                 <p className="text-[10px] font-bold text-slate-400/80 mt-0.5">
                   Impacto directo a ganancias
                 </p>
               </div>
            </div>
            <p className="text-4xl md:text-5xl font-black text-red-500 tracking-tight">
              ${totalGastos.toFixed(2)}
            </p>
          </div>

          {/* LISTADO HISTÓRICO DEL DÍA */}
          <div className="bg-slate-100/50 p-4 md:p-6 rounded-[32px] border border-slate-200 min-h-[300px]">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">
               Historial de Movimientos
             </h3>

             {gastosHoy.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center opacity-60">
                   <Receipt size={40} className="text-slate-300 mb-3" />
                   <p className="text-sm font-bold text-slate-500">Aún no hay gastos registrados hoy.</p>
                </div>
             ) : (
                <div className="space-y-3">
                   {gastosHoy.map(gasto => (
                     <RenglonGasto 
                        key={gasto.id}
                        gasto={gasto}
                        eliminarGasto={eliminarGasto}
                        isSubmitting={isSubmitting}
                     />
                   ))}
                </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default GestorGastosPrincipal;