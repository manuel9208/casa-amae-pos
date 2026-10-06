import React, { useState } from 'react';
import { Bike, MapPin, CheckCircle2, DollarSign } from 'lucide-react';

const TarjetaRepartidor = ({
    repartidorId,
    listaPedidos,
    getNombreRepartidor,
    liquidarPedidoRepartidor,
    actualizarEstadoPedido, // Se conserva en la firma por compatibilidad con el padre, aunque ya no se usa aquí.
    fondoRepartidor,
    actualizarFondoRepartidor
}) => {
    const [pedidoAConfirmar, setPedidoAConfirmar] = useState(null);
    const [modalLiquidarTodo, setModalLiquidarTodo] = useState(false);

    // 🛡️ REGLA ÚNICA Y DEFINITIVA (alineada 1:1 con el flujo real de Repartidor.js):
    // 1) Pedido a domicilio YA PAGADO antes de despachar → al entregarlo, Repartidor.js lo
    //    manda directo a 'Liquidado'. Caja nunca debe verlo.
    // 2) Pedido a domicilio NO PAGADO que el repartidor cobra en la puerta (Efectivo/Mixto)
    //    → Repartidor.js lo deja en 'Entregado'. Ese es el dinero físico que el repartidor
    //    trae y le debe a Caja.
    // 3) Si el repartidor cobra por Transferencia pura → también se manda directo a 'Liquidado'
    //    (nunca hay dinero físico de por medio).
    // CONCLUSIÓN: el ÚNICO criterio de "deuda pendiente con Caja" es que el pedido siga en
    // estado 'Entregado'. No se necesita mirar metodo_pago, tipo de pago ni si está "En Camino".
    // 🛡️ FIX: Debe reflejar EXACTAMENTE el mismo criterio que pedidosPorLiquidar en
    // useCajaCentral.js (fuente única de verdad), para que el badge "Por Liquidar" y las
    // tarjetas mostradas aquí SIEMPRE coincidan en cantidad.
    // - "En Camino" + sigue sin cobrarse: informativo (aún no hay efectivo físico, el
    //   repartidor todavía no lo entrega).
    // - "Entregado" + Efectivo/Mixto/Pendiente/Por Cobrar: deuda real y accionable.
    const necesitaAtencionCaja = (p) =>
        (p.estado_preparacion === 'En Camino' && ['Pendiente', 'Por Cobrar'].includes(p.metodo_pago)) ||
        (p.estado_preparacion === 'Entregado' && ['Pendiente', 'Por Cobrar', 'Efectivo', 'Mixto'].includes(p.metodo_pago));

    // Lista final que SÍ se muestra en pantalla (ya filtrada).
    const pedidosVisibles = listaPedidos.filter(necesitaAtencionCaja);

    // Si este repartidor no tiene ningún pedido relevante, no mostramos su tarjeta.
    if (pedidosVisibles.length === 0) return null;

    // Solo lo "Entregado" es efectivo físico que el repartidor ya trae en la mano.
    // Lo "En Camino" es solo informativo y no debe sumar a la deuda cobrable.
    const pedidosCobrables = pedidosVisibles.filter(p => p.estado_preparacion === 'Entregado');

    const totalDeudaRepartidor = pedidosCobrables.reduce((sum, p) => {
        if (p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
            let pm = []; try { pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos; } catch (e) { }
            const ef = pm.find(x => x.metodo === 'Efectivo');
            return sum + (ef ? Number(ef.monto) : 0);
        }
        return sum + Number(p.total);
    }, 0);
    const totalEfectivoFisico = totalDeudaRepartidor + Number(fondoRepartidor || 0);

    const handleLiquidarTodo = () => {
        const idsALiquidar = pedidosCobrables.map(p => p.id);
        if (idsALiquidar.length > 0) {
            liquidarPedidoRepartidor(idsALiquidar);
            actualizarFondoRepartidor(repartidorId, 0);
            setModalLiquidarTodo(false);
        }
    };

    return (
        <>
            <div className="bg-white p-6 md:p-8 rounded-[36px] border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow duration-300 animate-in slide-in-from-right-4 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-100 gap-4">
                    <h3 className="font-black text-slate-800 text-lg md:text-xl flex items-center gap-2">
                        <div className="bg-pink-100 p-2 rounded-xl text-pink-600">
                            <Bike size={20} />
                        </div>
                        {getNombreRepartidor(repartidorId)}
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Deuda Fija Efectivo</p>
                            <p className="text-sm md:text-base font-black text-pink-600 leading-none">
                                ${totalDeudaRepartidor.toFixed(2)}
                            </p>
                        </div>
                        {pedidosCobrables.length > 0 && (
                            <button
                                onClick={() => setModalLiquidarTodo(true)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs md:text-sm uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <DollarSign size={16} /> Liquidar Efectivo
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mt-4">
                    {pedidosVisibles.map(p => {
                        let montoEfePuro = Number(p.total);
                        let montoTraPuro = 0;
                        let esPagoMixto = p.metodo_pago === 'Mixto' && p.pagos_mixtos;

                        if (esPagoMixto) {
                            let pm = []; try { pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos; } catch (e) { }
                            const ef = pm.find(x => x.metodo === 'Efectivo');
                            const tr = pm.find(x => x.metodo === 'Transferencia');
                            montoEfePuro = ef ? Number(ef.monto) : 0;
                            montoTraPuro = tr ? Number(tr.monto) : 0;
                        }

                        let clienteExtraido = p.cliente_nombre || 'Invitado';
                        if (p.direccion_entrega && p.direccion_entrega.includes('A NOMBRE DE:')) {
                            const match = p.direccion_entrega.match(/A NOMBRE DE:\s*([^|]+)/i);
                            if (match && match[1]) {
                                clienteExtraido = match[1].trim();
                            }
                        }

                        const estaEnRuta = p.estado_preparacion === 'En Camino';

                        return (
                            <div key={p.id} className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 group ${estaEnRuta ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-slate-50/60 border-slate-200 hover:border-pink-300 hover:shadow-sm'}`}>
                                <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-3">
                                    <div className="pr-2">
                                        <span className="text-xl font-black text-slate-800 group-hover:text-pink-600 transition-colors">
                                            #{p.numero_pedido}
                                        </span>
                                        <p className="text-[11px] font-bold text-slate-500 line-clamp-1 flex items-center gap-1 mt-1">
                                            <MapPin size={12} className="text-slate-400 shrink-0" />
                                            {clienteExtraido}
                                        </p>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest shrink-0 ${estaEnRuta ? 'bg-blue-100 text-blue-700 border border-blue-200' : esPagoMixto ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                                        {estaEnRuta ? 'En Ruta (Sin Cobrar)' : esPagoMixto ? 'Pago Mixto' : 'Efectivo (Cobrado en Ruta)'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monto:</span>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-xl md:text-2xl font-black ${estaEnRuta ? 'text-slate-400' : 'text-pink-600'}`}>
                                            ${p.total}
                                        </span>
                                        {esPagoMixto && !estaEnRuta && (
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                                EFE: ${montoEfePuro.toFixed(2)} | TRA: ${montoTraPuro.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {estaEnRuta ? (
                                    <div className="w-full bg-slate-100 text-slate-400 font-black py-3 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 border border-slate-200 cursor-not-allowed">
                                        <Bike size={16} /> Aún en Ruta — Sin Cobrar
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setPedidoAConfirmar({ ...p, montoEfectivoPuro: montoEfePuro })}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30"
                                    >
                                        <CheckCircle2 size={16} /> Recibir Efectivo (${montoEfePuro.toFixed(2)})
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {modalLiquidarTodo && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <DollarSign size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Cierre de Ruta Efectivo</h3>
                        <p className="text-slate-500 font-medium mb-6 px-4">
                            Recauda y cierra {pedidosVisibles.length} pedidos entregados y cobrados en efectivo de una sola vez.
                        </p>

                        <div className="bg-slate-50 w-full p-4 rounded-2xl border border-slate-200 mb-6 space-y-3">
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600 border-b border-slate-200 pb-2">
                                <span>Órdenes (Deuda Efectivo)</span>
                                <span>${totalDeudaRepartidor.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600 border-b border-slate-200 pb-2">
                                <span>Feria (Fondo Base)</span>
                                <span>${Number(fondoRepartidor || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-black text-slate-900 pt-1">
                                <span>Efectivo a Recibir</span>
                                <span className="text-emerald-600">${totalEfectivoFisico.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex w-full gap-3">
                            <button
                                onClick={() => setModalLiquidarTodo(false)}
                                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleLiquidarTodo}
                                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex justify-center items-center gap-2"
                            >
                                <CheckCircle2 size={20} />
                                Recibir Efectivo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pedidoAConfirmar && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner bg-emerald-100 text-emerald-600">
                            <DollarSign size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Confirmar Cobro</h3>

                        <p className="text-slate-500 font-medium mb-8">
                            ¿Confirmas que el repartidor te entregó <strong className="text-slate-800 text-lg">${pedidoAConfirmar.montoEfectivoPuro.toFixed(2)}</strong> en EFECTIVO de la orden <strong className="text-slate-800">#{pedidoAConfirmar.numero_pedido}</strong>?
                        </p>

                        <div className="flex w-full gap-3">
                            <button
                                onClick={() => setPedidoAConfirmar(null)}
                                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    liquidarPedidoRepartidor(pedidoAConfirmar.id);
                                    setPedidoAConfirmar(null);
                                }}
                                className="flex-1 py-4 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
                            >
                                <CheckCircle2 size={20} />
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TarjetaRepartidor;