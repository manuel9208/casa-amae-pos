import React from 'react';
import { Bike, MapPin } from 'lucide-react';

const Repartidores = ({ 
    formaterMoneda, dPlatillos, dExtras, dEnvio, fondoRepartidor, 
    dEfectivo, dTarjeta, dTransf, efectivoEsperadoMotos 
}) => {
    return (
        <div className="bg-indigo-50/50 p-6 md:p-8 rounded-[40px] shadow-sm border border-indigo-100 mb-6 print:border-none print:shadow-none print:p-0">
            <div className="mb-6 flex items-center justify-between print:hidden">
                <h3 className="text-xl font-black text-indigo-900 uppercase tracking-widest px-2 flex items-center gap-3">
                    <div className="bg-indigo-600 text-white p-2 rounded-xl"><Bike size={20}/></div>
                    2. Repartidores (Motos)
                </h3>
            </div>
            <h3 className="hidden print:block text-xl font-black text-black uppercase mb-4 border-b border-black pb-2">2. Repartidores (Motos)</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 print:grid-cols-3">
                <div className="bg-white p-5 rounded-2xl border border-indigo-100 print:border-black print:rounded-none">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 print:text-black">Ventas (Domicilio)</p>
                    <p className="text-xl lg:text-2xl font-black text-indigo-900 print:text-black">{formaterMoneda(dPlatillos + dExtras)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-indigo-100 print:border-black print:rounded-none">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 print:text-black flex items-center gap-1">
                        <MapPin size={12} className="text-purple-400 print:hidden"/> Envíos
                    </p>
                    <p className="text-xl lg:text-2xl font-black text-indigo-900 print:text-black">{formaterMoneda(dEnvio)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-indigo-100 print:border-black print:rounded-none">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 print:text-black">Fondo Repartidores</p>
                    <p className="text-xl lg:text-2xl font-black text-indigo-900 print:text-black">{formaterMoneda(fondoRepartidor)}</p>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 print:border-black print:rounded-none">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 print:text-black">Efectivo</p>
                    <p className="text-xl lg:text-2xl font-black text-emerald-700 print:text-black">+{formaterMoneda(dEfectivo)}</p>
                </div>
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 print:border-black print:rounded-none">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 print:text-black">Tarjeta</p>
                    <p className="text-xl lg:text-2xl font-black text-blue-700 print:text-black">+{formaterMoneda(dTarjeta)}</p>
                </div>
                <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 print:border-black print:rounded-none">
                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 print:text-black">Transf.</p>
                    <p className="text-xl lg:text-2xl font-black text-purple-700 print:text-black">+{formaterMoneda(dTransf)}</p>
                </div>
            </div>

            <div className="bg-indigo-800 p-6 rounded-3xl shadow-md flex justify-between items-center text-white print:bg-white print:text-black print:border print:border-black print:shadow-none print:rounded-none">
                <div>
                    <p className="text-indigo-200 font-black uppercase tracking-widest mb-1 text-[10px] print:text-black">Efectivo a Entregar por Motos</p>
                    <p className="text-[9px] font-bold text-indigo-300 uppercase mt-0.5 print:text-slate-600">(Fondo Repartidores + Pagos de Ruta)</p>
                </div>
                <p className="text-3xl md:text-5xl font-black">{formaterMoneda(efectivoEsperadoMotos)}</p>
            </div>
        </div>
    );
};

export default Repartidores;