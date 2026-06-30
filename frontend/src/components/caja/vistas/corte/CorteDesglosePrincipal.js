import React from 'react';
import { Calendar, Search, History, Store, User, TrendingDown, CheckCircle2 } from 'lucide-react';  

const CorteDesglosePrincipal = ({
    currentUser,
    fechaFiltro,
    setFechaFiltro,
    hoyStr,
    esHoy,
    cargando,
    mathHoy,
    fondoManual,
    setFondoManual,
    pFondoCaja,
    pTotalGastos,
    efectivoEsperadoCaja,
    guardarFondoManualBD,
    guardandoFondo
}) => {
    return (
        <>
            {/* 1. ENCABEZADO Y FILTRO DE FECHA */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-800">Corte de Caja</h2>
                    <p className="text-sm font-bold text-slate-500 mt-1 flex items-center gap-1">
                        <User size={14} className="text-blue-500" /> Auditor General: {currentUser?.nombre || currentUser?.usuario}
                    </p>
                </div>
                <div className="flex items-center bg-white p-2 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20">
                    <div className="bg-slate-100 p-2 rounded-xl text-slate-500 mr-2">
                        <Calendar size={20} />
                    </div>
                    <input
                        type="date"
                        value={fechaFiltro}
                        max={hoyStr}
                        onChange={(e) => setFechaFiltro(e.target.value)}
                        className="bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer w-full"
                    />
                    {!esHoy && (
                        <button
                            onClick={() => setFechaFiltro(hoyStr)}
                            className="ml-4 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1 rounded-lg text-xs font-black transition-colors shadow-sm"
                        >
                            Volver a Hoy
                        </button>
                    )}
                </div>
            </div>  

            {/* 2. PANEL DE CAJA PRINCIPAL */}
            <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200 relative overflow-hidden mb-8 transition-all duration-300">
                {!esHoy && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white px-6 py-1.5 rounded-bl-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-md z-10">
                        <History size={14}/> Viendo Historial
                    </div>
                )}  

                {cargando ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center opacity-50 animate-in fade-in">
                        <Search size={48} className="text-slate-400 mb-4 animate-pulse" />
                        <p className="font-black text-xl text-slate-500">Recalculando operaciones...</p>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-bottom-4 duration-300">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest px-2 mb-3 flex items-center gap-3">
                                <Store size={24} className="text-blue-500"/> 1. Caja Principal (Mostrador)
                            </h3>
                        </div>  

                        {/* CUADRÍCULA DE MÉTRICAS */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ventas (Mostrador)</p>
                                <p className="text-2xl font-black text-slate-700">${(mathHoy.lPlatillos + mathHoy.lExtras).toFixed(2)}</p>
                            </div>  

                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-blue-200 transition-colors focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 relative">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Fondo Inicial</p>
                                {esHoy ? (
                                    <div className="flex items-center text-2xl font-black text-slate-700 mt-0.5">
                                        <span className="mr-1">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={fondoManual}
                                            onChange={(e) => setFondoManual(e.target.value)}
                                            className="w-full bg-transparent outline-none border-b-2 border-slate-300 focus:border-blue-500 transition-colors"
                                        />
                                        {/* 👇 SOLUCIÓN: Botón Explícito de Guardar Fondo */}
                                        <button
                                            disabled={guardandoFondo}
                                            onClick={() => guardarFondoManualBD(fondoManual)}
                                            className={`ml-2 p-2 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50 ${guardandoFondo ? 'bg-slate-200 text-slate-500' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                            title="Guardar Fondo Inicial"
                                        >
                                            <CheckCircle2 size={20} />
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-2xl font-black text-slate-700 mt-0.5">${pFondoCaja.toFixed(2)}</p>
                                )}
                            </div>  

                            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 hover:border-emerald-300 transition-colors">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ingresos Efectivo</p>
                                <p className="text-2xl font-black text-emerald-700">+${mathHoy.lEfectivo.toFixed(2)}</p>
                            </div>  

                            <div className="bg-red-50 p-5 rounded-2xl border border-red-100 relative overflow-hidden group hover:border-red-300 transition-colors">
                                <div className="absolute top-2 right-2 text-red-200 group-hover:scale-110 group-hover:text-red-300 transition-all duration-300">
                                    <TrendingDown size={32}/>
                                </div>
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 relative z-10">Gastos (Compras)</p>
                                <p className="text-2xl font-black text-red-700 relative z-10">-${pTotalGastos.toFixed(2)}</p>
                            </div>
                        </div>  

                        {/* TOTAL EFECTIVO CAJÓN */}
                        <div className={`p-6 md:p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center text-white transition-all duration-500 hover:scale-[1.01] ${!esHoy ? 'bg-slate-800' : 'bg-emerald-600'}`}>
                            <div>
                                <p className={`${!esHoy ? 'text-slate-400' : 'text-emerald-200'} font-black uppercase tracking-widest mb-1 text-sm md:text-base`}>
                                    Efectivo Físico en Cajón
                                </p>
                                <p className={`text-[10px] md:text-[11px] font-bold ${!esHoy ? 'text-slate-500' : 'text-emerald-100 opacity-90'} uppercase tracking-wider`}>
                                    (Fondo Inicial + Ventas Efectivo) - Gastos
                                </p>
                            </div>
                            <p className="text-5xl md:text-6xl font-black mt-4 md:mt-0 tracking-tight drop-shadow-md">
                                ${efectivoEsperadoCaja.toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};  

export default CorteDesglosePrincipal;