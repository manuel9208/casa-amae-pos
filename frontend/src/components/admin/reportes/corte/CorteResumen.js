import React from 'react';
import { DollarSign, Banknote, CreditCard, Smartphone, Receipt, Wallet, Calculator, Coins } from 'lucide-react';

// 🆕 Vista "Resumen" de Cortes — vista por defecto al entrar al módulo.
// Reutiliza las mismas variables YA CALCULADAS en VistaCortesHistorico.js
// (principio DRY: cero recálculos nuevos, solo se reciben como props).
const CorteResumen = ({
  formaterMoneda,
  totalVentasBrutas,   // Venta Total BRUTA, sin nada descontado (tal cual se pidió)
  totalEfectivoDia,    // Efectivo (Local + Domicilio)
  totalTarjetas,       // Tarjeta (Local + Domicilio)
  totalTransferencias, // Transferencia (Local + Domicilio)
  gastosCompras,       // Gastos (Compras pagadas de caja)
  totalFondoGlobal     // Fondo Inicial combinado (Caja + Repartidores)
}) => {
  // 👇 Los 2 totales pedidos: ambos restan Gastos, la Venta Total de arriba NO.
  const totalGeneral = (totalEfectivoDia + totalTarjetas + totalTransferencias) - gastosCompras;
  const totalEfectivoNeto = totalEfectivoDia - gastosCompras;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 6 TARJETAS SUELTAS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. VENTA TOTAL (bruta, sin descuentos) */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center transition-all hover:shadow-md hover:border-blue-200">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
            <DollarSign size={20} />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Venta Total</span>
          <span className="text-xl md:text-2xl font-black text-slate-800 mt-1">{formaterMoneda(totalVentasBrutas)}</span>
        </div>

        {/* 2. EFECTIVO */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center transition-all hover:shadow-md hover:border-emerald-200">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
            <Banknote size={20} />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Efectivo</span>
          <span className="text-xl md:text-2xl font-black text-emerald-700 mt-1">{formaterMoneda(totalEfectivoDia)}</span>
        </div>

        {/* 3. TRANSFERENCIA */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center transition-all hover:shadow-md hover:border-purple-200">
          <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-3">
            <Smartphone size={20} />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Transferencia</span>
          <span className="text-xl md:text-2xl font-black text-purple-700 mt-1">{formaterMoneda(totalTransferencias)}</span>
        </div>

        {/* 4. TARJETA */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center transition-all hover:shadow-md hover:border-blue-200">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
            <CreditCard size={20} />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Tarjeta</span>
          <span className="text-xl md:text-2xl font-black text-blue-700 mt-1">{formaterMoneda(totalTarjetas)}</span>
        </div>

        {/* 5. GASTOS */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center transition-all hover:shadow-md hover:border-red-200">
          <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
            <Receipt size={20} />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Gastos</span>
          <span className="text-xl md:text-2xl font-black text-red-500 mt-1">-{formaterMoneda(gastosCompras)}</span>
        </div>

        {/* 6. FONDO INICIAL (combinado: Caja + Repartidores) */}
        <div className="bg-slate-800 p-5 rounded-3xl shadow-md border border-slate-700 flex flex-col items-center text-center transition-all hover:bg-slate-900">
          <div className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center mb-3">
            <Coins size={20} />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Fondo Inicial</span>
          <span className="text-xl md:text-2xl font-black text-white mt-1">{formaterMoneda(totalFondoGlobal)}</span>
        </div>
      </div>

      {/* 2 TOTALES CALCULADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TOTAL GENERAL: Efectivo + Tarjeta + Transferencia - Gastos */}
        <div className="bg-slate-900 p-6 md:p-8 rounded-[32px] shadow-lg flex flex-col justify-center text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 opacity-10 pointer-events-none">
            <Calculator size={140} />
          </div>
          <p className="text-slate-400 font-black uppercase tracking-widest mb-2 text-xs relative z-10">Total General</p>
          <p className="text-4xl md:text-5xl font-black relative z-10">{formaterMoneda(totalGeneral)}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase mt-3 relative z-10">
            (Efectivo + Tarjeta + Transferencia) − Gastos
          </p>
        </div>

        {/* TOTAL EFECTIVO: Efectivo - Gastos */}
        <div className="bg-emerald-600 p-6 md:p-8 rounded-[32px] shadow-lg flex flex-col justify-center text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 opacity-10 pointer-events-none">
            <Wallet size={140} />
          </div>
          <p className="text-emerald-100 font-black uppercase tracking-widest mb-2 text-xs relative z-10">Total Efectivo</p>
          <p className="text-4xl md:text-5xl font-black relative z-10">{formaterMoneda(totalEfectivoNeto)}</p>
          <p className="text-[10px] font-bold text-emerald-200 uppercase mt-3 relative z-10">
            Efectivo − Gastos
          </p>
        </div>
      </div>
    </div>
  );
};

export default CorteResumen;