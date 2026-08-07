import React from 'react';
import { Calculator, Info } from 'lucide-react';

const CuadreGlobal = ({
    formaterMoneda, fondoCaja, totalEfectivoDia, gastosCompras,
    efectivoEntregadoTotal, efectivoEnCajaTotal, isPerfecto, isFaltante, isSobrante,
    diferenciaAuditoria, cortesDelDia, corteSeleccionadoId, setModalFondosAbierto,
    fondosAdicionales, totalVentasBrutas, tDescuentos, totalIngresoNetoReal,
    descuentosEfectivo = 0 
}) => {
    return (
        <div className="bg-emerald-50 p-6 md:p-8 rounded-[32px] border border-emerald-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-600 text-white p-2 md:p-3 rounded-xl"><Calculator size={24} /></div>
                <div>
                    <h3 className="text-xl font-black text-emerald-900 uppercase tracking-widest leading-tight">Cuadre Global</h3>
                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Auditoría Estricta</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm mb-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">A. Auditoría de Efectivo Físico</p>
                
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm font-bold text-slate-400 items-center">
                        <div className="flex items-center gap-2">
                            <span>Fondo Inicial Registrado:</span>
                            {cortesDelDia.length > 1 && corteSeleccionadoId === 'global' && (
                                <button
                                    onClick={() => setModalFondosAbierto(true)}
                                    className="text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors print:hidden cursor-pointer active:scale-95"
                                    title="Gestionar Fondos Múltiples"
                                >
                                    <Info size={12} />
                                    {fondosAdicionales > 0 && <span className="text-[9px] uppercase tracking-wider">+{formaterMoneda(fondosAdicionales)}</span>}
                                </button>
                            )}
                        </div>
                        <span>{formaterMoneda(fondoCaja)}</span>
                    </div>

                    <div className="flex justify-between text-sm font-bold text-emerald-600">
                        <span>+ Ingresos Efectivo (Ventas):</span>
                        <span>{formaterMoneda(totalEfectivoDia + descuentosEfectivo)}</span>
                    </div>
                    {descuentosEfectivo > 0 && (
                        <div className="flex justify-between text-sm font-bold text-orange-500">
                            <span>- Descuentos en Efectivo:</span>
                            <span>-{formaterMoneda(descuentosEfectivo)}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-sm font-bold text-red-500">
                        <span>- Gastos Pagados de Caja:</span>
                        <span>-{formaterMoneda(gastosCompras)}</span>
                    </div>

                    {/* 👇 DESGLOSE DE RETIROS Y FONDOS ACTUALIZADO */}
                    <div className="pt-2 mt-2 border-t border-slate-100">
                        {Number(efectivoEntregadoTotal) > 0 && (
                            <div className="flex justify-between text-sm font-bold text-blue-600 mb-0.5">
                                <span>- Retiros a Gerencia:</span>
                                <span>-{formaterMoneda(efectivoEntregadoTotal)}</span>
                            </div>
                        )}
                        {Number(efectivoEnCajaTotal) > 0 && (
                            <div className="flex justify-between text-sm font-bold text-blue-600">
                                <span>- Fondo Dejado (Cierre Final):</span>
                                <span>-{formaterMoneda(efectivoEnCajaTotal)}</span>
                            </div>
                        )}
                        {Number(efectivoEntregadoTotal) === 0 && Number(efectivoEnCajaTotal) === 0 && (
                            <div className="flex justify-between text-sm font-bold text-blue-600">
                                <span>- Efectivo Declarado:</span>
                                <span>$0.00</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`flex justify-between items-center p-3 rounded-xl border ${isPerfecto ? 'bg-blue-50 border-blue-200' : isFaltante ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div>
                        <span className={`text-sm font-black uppercase tracking-widest block ${isPerfecto ? 'text-blue-800' : isFaltante ? 'text-red-800' : 'text-emerald-800'}`}>
                            {isPerfecto ? 'Cuadre Perfecto' : isFaltante ? 'Faltante en Caja' : 'Sobrante en Caja'}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${isPerfecto ? 'text-blue-500' : isFaltante ? 'text-red-500' : 'text-emerald-500'}`}>
                            (Fondo+Ventas) - Gastos - Declarado
                        </span>
                    </div>
                    <span className={`text-2xl font-black ${isPerfecto ? 'text-blue-600' : isFaltante ? 'text-red-600' : 'text-emerald-600'}`}>
                        {isSobrante ? '+' : isFaltante ? '-' : ''}{formaterMoneda(Math.abs(diferenciaAuditoria))}
                    </span>
                </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm mt-auto">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">B. Rendimiento Real del Negocio</p>
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm font-bold text-slate-600 items-center">
                        <div>
                            <span className="block">+ Ventas Brutas Totales:</span>
                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">Efectivo + Digitales (Sin descuento)</span>
                        </div>
                        <span>{formaterMoneda(totalVentasBrutas)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-orange-500">
                        <span>- Descuentos Aplicados:</span>
                        <span>-{formaterMoneda(tDescuentos)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-red-500">
                        <span>- Gastos (Caja Chica):</span>
                        <span>-{formaterMoneda(gastosCompras)}</span>
                    </div>
                </div>
                <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl shadow-md">
                    <div>
                        <span className="text-sm md:text-base font-black text-emerald-400 uppercase tracking-widest block leading-tight">Ingresos Netos Totales</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Bruto - Descuentos - Gastos</span>
                    </div>
                    <span className="text-3xl font-black text-white">{formaterMoneda(totalIngresoNetoReal)}</span>
                </div>
            </div>
        </div>
    );
};

export default CuadreGlobal;