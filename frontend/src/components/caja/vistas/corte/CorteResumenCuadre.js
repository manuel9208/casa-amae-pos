import React from 'react';
import { Calculator } from 'lucide-react';

const CorteResumenCuadre = ({
  totalDigital,
  fondoGlobal,
  ingresosEfectivo,
  gastos,
  descuentos,
  totalVentasGlobales,
  efectivoDeclarado,
  efectivoEntregado, 
  efectivoEnCaja     
}) => {
  // Rendimiento Neto Real del negocio = Ventas Brutas Totales - Descuentos Otorgados - Gastos de Caja
  const ingresosNetos = totalVentasGlobales - descuentos - gastos;

  // 👇 NUEVA MATEMÁTICA ESTRICTA (Grado Contable)
  // Lo que debe haber físicamente = Fondo Inicial + Ingresos en Efectivo
  // Lo que salió de la caja = Gastos + El dinero que se declaró (Entregado al dueño + Dejado en caja)
  const totalEsperado = fondoGlobal + ingresosEfectivo - gastos;
  const diferenciaAuditoria = totalEsperado - (efectivoDeclarado || 0);

  // Determinamos el estado del arqueo
  const isFaltante = diferenciaAuditoria > 0;
  const isSobrante = diferenciaAuditoria < 0;
  const isPerfecto = diferenciaAuditoria === 0;

  return (
    <div className="bg-emerald-50 p-6 md:p-8 rounded-[32px] border border-emerald-200 shadow-sm transition-all hover:shadow-md flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-600 text-white p-2 md:p-3 rounded-xl shadow-md shadow-emerald-600/20">
          <Calculator size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-emerald-900 uppercase tracking-widest leading-tight">
            4. Cuadre Global
          </h3>
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-0.5">
            Auditoría y Rendimiento
          </p>
        </div>
      </div>

      {/* SECCIÓN A: AUDITORÍA DE EFECTIVO FÍSICO */}
      <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm mb-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
          A. Auditoría de Efectivo Físico
        </p>

        {/* 👇 DESGLOSE DE AUDITORÍA CON LA NUEVA FÓRMULA */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm font-bold text-slate-500">
            <span>Fondo Inicial Registrado:</span>
            <span>${(fondoGlobal || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-emerald-600">
            <span>+ Ingresos Efectivo (Ventas):</span>
            <span>${(ingresosEfectivo || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-red-500">
            <span>- Gastos Pagados de Caja:</span>
            <span>-${(gastos || 0).toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm font-bold text-blue-600 border-t border-slate-100 pt-2 mt-2">
            <span>- Efectivo Entregado (Dueño):</span>
            <span>-${(efectivoEntregado || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-blue-600">
            <span>- Efectivo Dejado en Caja:</span>
            <span>-${(efectivoEnCaja || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* 👇 RESULTADO DINÁMICO DEL ARQUEO */}
        <div className={`flex justify-between items-center p-3 rounded-xl border ${
            isPerfecto ? 'bg-blue-50 border-blue-200' : 
            isFaltante ? 'bg-red-50 border-red-200' : 
            'bg-emerald-50 border-emerald-200'
        }`}>
          <div>
            <span className={`text-sm font-black uppercase tracking-widest block ${
                isPerfecto ? 'text-blue-800' : 
                isFaltante ? 'text-red-800' : 
                'text-emerald-800'
            }`}>
              {isPerfecto ? 'Cuadre Perfecto' : isFaltante ? 'Faltante en Caja' : 'Sobrante en Caja'}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${
                isPerfecto ? 'text-blue-500' : 
                isFaltante ? 'text-red-500' : 
                'text-emerald-500'
            }`}>
              (Fondo + Ventas) - Gastos - Declarado
            </span>
          </div>
          <span className={`text-2xl font-black ${
            isPerfecto ? 'text-blue-600' : 
            isFaltante ? 'text-red-600' : 
            'text-emerald-600'
          }`}>
            {isSobrante ? '-' : ''}${Math.abs(diferenciaAuditoria).toFixed(2)}
          </span>
        </div>
      </div>

      {/* SECCIÓN B: RENDIMIENTO REAL DEL NEGOCIO */}
      <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm mt-auto">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
          B. Rendimiento Real del Negocio
        </p>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm font-bold text-slate-600 items-center">
            <div>
              <span className="block">+ Ventas Brutas Totales:</span>
              <span className="text-[9px] font-bold text-slate-400 mt-0.5">Efectivo + Digitales (Sin descuento)</span>
            </div>
            <span>${totalVentasGlobales.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-orange-500">
            <span>- Descuentos y Promos:</span>
            <span>-${descuentos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-red-500">
            <span>- Gastos (Caja Chica):</span>
            <span>-${gastos.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl shadow-md">
          <div>
            <span className="text-sm md:text-base font-black text-emerald-400 uppercase tracking-widest block leading-tight">Ingresos Netos Totales</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Bruto - Descuentos - Gastos</span>
          </div>
          <span className="text-3xl font-black text-white">${ingresosNetos.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default CorteResumenCuadre;