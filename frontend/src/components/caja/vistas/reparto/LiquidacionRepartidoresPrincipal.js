import React, { useMemo } from 'react';
import { CheckCircle2, Bike } from 'lucide-react';  

import EncabezadoLogistica from './EncabezadoLogistica';
import TarjetaRepartidor from './TarjetaRepartidor';
import ResumenAcumuladoReparto from './ResumenAcumuladoReparto';  

const LiquidacionRepartidoresPrincipal = ({
    pedidosEnReparto,
    empleadosPOS,
    fondosRepartidores,
    actualizarFondoRepartidor,
    fondoRepartidorGlobal,
    liquidarPedidoRepartidor,
    actualizarEstadoPedido
}) => {  

    const repartidoresActivos = (empleadosPOS || []).filter(emp => String(emp.rol).toLowerCase().includes('repart'));

    const pedidosPorRepartidor = useMemo(() => {
        const grupos = {};
        pedidosEnReparto.forEach(p => {
            const repId = p.repartidor_id || 'sin_asignar';
            if (!grupos[repId]) grupos[repId] = [];
            grupos[repId].push(p);
        });
        return grupos;
    }, [pedidosEnReparto]);  

    const getNombreRepartidor = (id) => {
        if (id === 'sin_asignar') return 'Pedidos sin Repartidor Asignado';
        const emp = (empleadosPOS || []).find(e => Number(e.id) === Number(id));
        return emp ? `Conductor: ${emp.nombre}` : `Repartidor #${id}`;
    };  

    const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g,"")) || 0;
    
    const pedidosEfectivoGlobal = pedidosEnReparto.filter(p => 
        ['Entregado', 'En Camino'].includes(p.estado_preparacion) && 
        ['Pendiente', 'Por Cobrar'].includes(p.metodo_pago)
    );
    
    const deudaPedidosEfectivoGlobal = pedidosEfectivoGlobal.reduce((sum, p) => sum + parseMoney(p.total), 0);
    const fondoFeria = parseMoney(fondoRepartidorGlobal);
    const totalAEntregarGlobal = deudaPedidosEfectivoGlobal + fondoFeria;  

    return (
        <div className="w-full h-full bg-slate-50 text-slate-800 p-4 md:p-6 overflow-y-auto custom-scrollbar">  
            <EncabezadoLogistica />  

            <div className="mb-10">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 pl-1 flex items-center gap-2">
                    <Bike size={16}/> Feria / Fondo Inicial Individual
                </h3>
                {repartidoresActivos.length === 0 ? (
                    <p className="text-sm font-bold text-slate-500 bg-white p-4 rounded-2xl border border-slate-200">
                        No hay repartidores registrados en el sistema.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {repartidoresActivos.map(rep => (
                            <div key={rep.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm focus-within:border-pink-400 focus-within:ring-2 focus-within:ring-pink-500/20 transition-all">
                                <p className="text-xs font-black text-slate-700 mb-2 truncate">{rep.nombre}</p>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-slate-400 font-black">$</span>
                                    <input
                                        type="number" min="0" step="1"
                                        value={fondosRepartidores[rep.id] === undefined ? '' : fondosRepartidores[rep.id]}
                                        onChange={(e) => actualizarFondoRepartidor(rep.id, e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-3 font-black text-slate-800 outline-none focus:bg-white transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">  
                <div className="lg:col-span-8 space-y-6">
                    {pedidosEnReparto.length === 0 ? (
                        <div className="bg-white border-2 border-slate-200 border-dashed p-12 rounded-[40px] text-center animate-in zoom-in-95">
                            <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4 opacity-60"/>
                            <p className="text-xl font-bold text-slate-500">Ruta limpia y cobrada.</p>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">No hay motociclistas con deudas activas o viajes en proceso.</p>
                        </div>
                    ) : (
                        Object.entries(pedidosPorRepartidor).map(([repartidorId, listaPedidos]) => (
                            <TarjetaRepartidor
                                key={repartidorId}
                                repartidorId={repartidorId}
                                listaPedidos={listaPedidos}
                                getNombreRepartidor={getNombreRepartidor}
                                liquidarPedidoRepartidor={liquidarPedidoRepartidor}
                                actualizarEstadoPedido={actualizarEstadoPedido}
                                // 👇 FIX: Pasamos el fondo individual y el actualizador para el Modal de Liquidación Total
                                fondoRepartidor={fondosRepartidores[repartidorId] || 0}
                                actualizarFondoRepartidor={actualizarFondoRepartidor}
                            />
                        ))
                    )}
                </div>  

                <ResumenAcumuladoReparto
                    deudaPedidosEfectivoGlobal={deudaPedidosEfectivoGlobal}
                    fondoFeria={fondoFeria}
                    totalAEntregarGlobal={totalAEntregarGlobal}
                />  
            </div>
        </div>
    );
};  

export default LiquidacionRepartidoresPrincipal;