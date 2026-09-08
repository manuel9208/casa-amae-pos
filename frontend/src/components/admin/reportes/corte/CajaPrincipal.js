import React from 'react';
import { Store, Info } from 'lucide-react';  

const CajaPrincipal = ({
    formaterMoneda, totalVentasBrutas, tDescuentos, totalFondoGlobal,
    fondosAdicionales, corteSeleccionadoId, cortesDelDia, setModalFondosAbierto,
    totalEfectivoDia, gastosCompras, efectivoEsperadoCaja, efectivoDeclaradoCaja,
    isPerfecto, isFaltante, isSobrante, diferenciaAuditoria,
    efectivoEntregadoTotal, efectivoEnCajaTotal,
    // 👇 NUEVAS PROPIEDADES PARA B2B (Por defecto en 0 para no romper nada)
    ventasB2B = 0, efectivoB2B = 0 
}) => {

    // 👇 CÁLCULOS VISUALES DE DESGLOSE
    const ventasRestaurante = (totalVentasBrutas || 0) - (ventasB2B || 0);
    const efectivoRestaurante = (totalEfectivoDia || 0) - (efectivoB2B || 0);

    return (
        <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200 relative overflow-hidden print:border-none print:shadow-none print:p-0">
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest px-2 flex items-center gap-3 print:text-black">
                    <Store size={24} className="text-blue-500 print:hidden" /> 1. Caja Principal (Mostrador)
                </h3>
            </div>  

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:grid-cols-4">
                
                {/* VENTAS BRUTAS */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 print:border-black flex flex-col">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 print:text-black">Ventas Brutas</p>
                    <p className="text-2xl font-black text-slate-700 print:text-black">{formaterMoneda(totalVentasBrutas)}</p>
                    
                    {/* 👇 DESGLOSE INYECTADO: RESTAURANTE VS B2B */}
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 w-full print:hidden">
                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                            <span>Restaurante:</span>
                            <span>{formaterMoneda(ventasRestaurante)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-bold text-indigo-500">
                            <span>Mayoreo (B2B):</span>
                            <span>{formaterMoneda(ventasB2B)}</span>
                        </div>
                    </div>

                    {tDescuentos > 0 && (
                        <p className="text-[10px] font-bold text-orange-500 mt-auto border-t border-slate-200 pt-2 print:border-black print:pt-1">
                            Descuentos: -{formaterMoneda(tDescuentos)}
                        </p>
                    )}
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 print:border-black relative group">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 print:text-black">Fondo Inicial</p>
                    <p className="text-2xl font-black text-slate-700 print:text-black">{formaterMoneda(totalFondoGlobal)}</p>  
                    {cortesDelDia.length > 1 && corteSeleccionadoId === 'global' && (
                        <button
                            onClick={() => setModalFondosAbierto(true)}
                            className="absolute top-3 right-3 text-blue-600 bg-blue-100 hover:bg-blue-200 p-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm border border-blue-200 cursor-pointer active:scale-95 print:hidden"
                            title="Gestionar Fondos Múltiples"
                        >
                            <Info size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">
                                Fondos {fondosAdicionales > 0 ? '*' : ''}
                            </span>
                        </button>
                    )}
                </div>

                {/* INGRESOS EFECTIVO */}
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 print:border-black flex flex-col">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 print:text-black">Ingresos Efectivo</p>
                    <p className="text-2xl font-black text-emerald-700 print:text-black">+{formaterMoneda(totalEfectivoDia)}</p>
                    
                    {/* 👇 DESGLOSE INYECTADO: EFECTIVO RESTAURANTE VS B2B */}
                    <div className="mt-3 pt-3 border-t border-emerald-200/50 space-y-1 w-full print:hidden">
                        <div className="flex justify-between items-center text-[9px] font-bold text-emerald-700/70">
                            <span>Restaurante:</span>
                            <span>{formaterMoneda(efectivoRestaurante)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-bold text-indigo-600">
                            <span>Mayoreo (B2B):</span>
                            <span>{formaterMoneda(efectivoB2B)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-red-50 p-5 rounded-2xl border border-red-100 relative print:border-black">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 print:text-black">Gastos (Compras)</p>
                    <p className="text-xl font-black text-red-700 print:text-black">-{formaterMoneda(gastosCompras)}</p>
                </div>
            </div>  

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 p-6 rounded-3xl shadow-md flex flex-col justify-center text-white print:bg-white print:text-black print:border print:border-black">
                    <p className="text-slate-300 font-black uppercase tracking-widest mb-1 text-[10px] print:text-black">Efectivo Esperado Físico</p>
                    <p className="text-3xl font-black">{formaterMoneda(efectivoEsperadoCaja)}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 print:text-black">
                        (Fondo + Ingresos Efectivo) - Gastos
                    </p>
                </div>  

                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-200 shadow-sm flex flex-col justify-center print:border-black print:bg-transparent">
                    <p className="text-orange-600 font-black uppercase tracking-widest mb-1 text-[10px] print:text-black">Efectivo Declarado</p>
                    <p className="text-3xl font-black text-blue-800 print:text-black">{formaterMoneda(efectivoDeclaradoCaja)}</p>  
                    
                    <div className="mt-3 pt-3 border-t border-orange-200/60 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-orange-700">
                            <span>Retiros a Gerencia:</span>
                            <span>{formaterMoneda(efectivoEntregadoTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-orange-700">
                            <span>Fondo Dejado (Cajón):</span>
                            <span>{formaterMoneda(efectivoEnCajaTotal)}</span>
                        </div>
                    </div>
                </div>  

                <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-center print:bg-transparent print:border-black ${isPerfecto ? 'bg-blue-50 border-blue-200' : isFaltante ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className={`font-black uppercase tracking-widest mb-1 text-[10px] print:text-black ${isPerfecto ? 'text-blue-600' : isFaltante ? 'text-red-600' : 'text-emerald-600'}`}>
                        {isPerfecto ? 'Cuadre Perfecto' : isFaltante ? 'Faltante en Caja' : 'Sobrante a Favor'}
                    </p>
                    <p className={`text-3xl font-black print:text-black ${isPerfecto ? 'text-blue-700' : isFaltante ? 'text-red-700' : 'text-emerald-700'}`}>
                        {isSobrante ? '+' : isFaltante ? '-' : ''}{formaterMoneda(Math.abs(diferenciaAuditoria))}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 print:text-black">Diferencia neta matemática</p>
                </div>
            </div>
        </div>
    );
};  

export default CajaPrincipal;