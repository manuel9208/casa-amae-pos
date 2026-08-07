import React from 'react';
import { Smartphone, CreditCard, Banknote } from 'lucide-react';

const PagosDigitales = ({ formaterMoneda, totalDigital, totalTarjetas, totalTransferencias }) => {
    return (
        <div className="bg-blue-50/50 p-6 md:p-8 rounded-[32px] border border-blue-100 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6 border-b border-blue-100 pb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2 md:p-3 rounded-xl"><Smartphone size={24} /></div>
                    <div>
                        <h3 className="text-xl font-black text-blue-900 uppercase tracking-widest leading-tight">Pagos Digitales</h3>
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-0.5">Ingresos Directos a Banco</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Total Digitales</p>
                    <p className="text-3xl font-black text-blue-700">{formaterMoneda(totalDigital)}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-auto">
                <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><CreditCard size={14} /> Tarjetas</p>
                    <p className="text-2xl lg:text-3xl font-black text-blue-900">{formaterMoneda(totalTarjetas)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Banknote size={14} /> Transferencias</p>
                    <p className="text-2xl lg:text-3xl font-black text-purple-900">{formaterMoneda(totalTransferencias)}</p>
                </div>
            </div>
        </div>
    );
};

export default PagosDigitales;