import React from 'react';
import { Users, User } from 'lucide-react';

const AuditoriaIndividual = ({ corteSeleccionadoId, cortesDelDia, formaterMoneda }) => {
    // Si no estamos en la vista Global o no hay turnos, no se renderiza.
    if (corteSeleccionadoId !== 'global' || cortesDelDia.length === 0) return null;

    return (
        <div className="bg-slate-50 p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200 mt-8 print:hidden">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
                <Users size={24} className="text-blue-500" /> Auditoría Individual por Turno
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cortesDelDia.map((c, i) => {
                    const fIni = Number(c.fondo_inicial || 0);
                    const iEfe = Number(c.total_efectivo || 0);
                    const gas = Number(c.total_gastos || 0);
                    const decl = Number(c.efectivo_cajon || 0);
                    const eEnt = Number(c.efectivo_entregado || 0);
                    const eCaj = Number(c.efectivo_en_caja || 0);

                    const dif = (fIni + iEfe) - gas - decl;
                    const isF = dif > 0;
                    const isS = dif < 0;
                    const isP = dif === 0;

                    return (
                        <div key={c.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
                            <p className="font-black text-slate-800 uppercase tracking-widest text-sm mb-3 border-b border-slate-100 pb-3 flex items-center gap-2">
                                <User size={16} className="text-slate-400" /> Turno {i + 1}: {c.usuario_nombre || 'Cajero'}
                            </p>
                            <div className="space-y-2 text-xs font-bold text-slate-500 mb-4">
                                <div className="flex justify-between"><span>Fondo Inicial:</span> <span>{formaterMoneda(fIni)}</span></div>
                                <div className="flex justify-between text-emerald-600"><span>+ Ventas Efectivo:</span> <span>{formaterMoneda(iEfe)}</span></div>
                                <div className="flex justify-between text-red-500"><span>- Gastos (Caja):</span> <span>-{formaterMoneda(gas)}</span></div>
                                <div className="flex justify-between text-blue-600 border-t border-slate-100 pt-2 mt-1"><span>- Retiro Gerencia:</span> <span>-{formaterMoneda(eEnt)}</span></div>
                                <div className="flex justify-between text-blue-600"><span>- Fondo Dejado:</span> <span>-{formaterMoneda(eCaj)}</span></div>
                            </div>
                            <div className={`p-3 rounded-2xl flex justify-between items-center ${isP ? 'bg-blue-50 text-blue-700' : isF ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                <span className="font-black uppercase tracking-widest text-[10px]">
                                    {isP ? 'Cuadre Perfecto' : isF ? 'Faltante' : 'Sobrante'}
                                </span>
                                <span className="font-black text-lg">
                                    {isS ? '+' : isF ? '-' : ''}{formaterMoneda(Math.abs(dif))}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AuditoriaIndividual;