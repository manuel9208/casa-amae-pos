import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Printer, Eye, User, Store, Package } from 'lucide-react';
import TicketImpresionMayoreo from '../../../caja/modales/PuntoDeVenta/distribucion/TicketImpresionMayoreo';

const deserializarCarrito = (carritoRaw) => {
    if (Array.isArray(carritoRaw)) return carritoRaw;
    try { return JSON.parse(carritoRaw) || []; } catch (e) { return []; }
};

const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g, "")) || 0;

const OrdenesRegistradas = ({
    pedidosFiltradosFinales, pedidoSeleccionado, setPedidoSeleccionado,
    filtroCliente, setFiltroCliente, filtroMetodoPago, setFiltroMetodoPago, formaterMoneda,
    pedidosB2B = [], configGlobal, apiUrl
}) => {
    const [modoTab, setModoTab] = useState('restaurante');
    const [configDist, setConfigDist] = useState({ activa: false, nombre: 'Distribución' });
    const [filtroOrigen, setFiltroOrigen] = useState('Todos');

    useEffect(() => {
        if (apiUrl) {
            const apiBase = apiUrl || (typeof window !== 'undefined' && window.location.origin.includes('localhost') ? 'http://localhost:4000/api' : '/api');
            fetch(`${apiBase}/distribucion/configuracion`)
                .then(res => res.json())
                .then(data => {
                    if (!data.error) {
                        setConfigDist({
                            activa: data.distribucion_activa === true || String(data.distribucion_activa) === 'true',
                            nombre: data.distribucion_nombre || 'Distribución'
                        });
                    }
                })
                .catch(() => { });
        }
    }, [apiUrl]);

    const ventasB2BFiltradas = (pedidosB2B || []).filter(p => {
        if (['Cancelado', 'Pendiente', 'Por Confirmar'].includes(p.estado_preparacion)) return false;
        if (filtroMetodoPago !== 'Todos' && p.metodo_pago !== filtroMetodoPago) return false;
        if (filtroCliente.trim() !== '') {
            const cliente = (p.cliente_nombre || '').toLowerCase();
            const iden = (p.numero_pedido || '').toString();
            if (!cliente.includes(filtroCliente.toLowerCase()) && !iden.includes(filtroCliente.toLowerCase())) return false;
        }
        return true;
    }).sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

    const ordenesAMostrarBrutas = modoTab === 'restaurante' ? pedidosFiltradosFinales : ventasB2BFiltradas;

    const ordenesAMostrar = ordenesAMostrarBrutas.filter(p => {
        if (filtroOrigen === 'Todos') return true;
        const org = p.origen || 'Caja';
        if (filtroOrigen === 'Web/Kiosco') return org === 'Kiosco' || org === 'Web';
        return org === filtroOrigen;
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:w-full">
            <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col h-[600px] print:h-auto print:border-none print:shadow-none print:p-0 print:block print:w-full">

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 shrink-0 border-b border-slate-100 pb-4 print:border-black print:mb-2 gap-4">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 print:text-black">
                        <ShoppingBag className="text-blue-500 print:hidden" size={20} /> Órdenes ({ordenesAMostrar.length})
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto print:hidden">

                        {configDist.activa && (
                            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner mr-2">
                                <button onClick={() => { setModoTab('restaurante'); setPedidoSeleccionado(null); }} className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${modoTab === 'restaurante' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <Store size={14} className="inline mr-1 mb-0.5" /> Local
                                </button>
                                <button onClick={() => { setModoTab('mayoreo'); setPedidoSeleccionado(null); }} className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${modoTab === 'mayoreo' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <Package size={14} className="inline mr-1 mb-0.5" /> {configDist.nombre}
                                </button>
                            </div>
                        )}

                        <div className="relative flex-1 sm:flex-none">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text" placeholder="Buscar orden o cliente..."
                                value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}
                                className="w-full sm:w-48 pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <select
                            value={filtroOrigen} onChange={e => setFiltroOrigen(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 cursor-pointer text-slate-600"
                        >
                            <option value="Todos">Origen: Todos</option>
                            <option value="Caja">Mostrador (Caja)</option>
                            <option value="Web/Kiosco">Kiosco / Web</option>
                            <option value="Totem">Tótem Físico</option>
                            <option value="Drive-Thru">Drive-Thru</option>
                            <option value="QR Mesa">Mesa QR</option>
                        </select>

                        <select
                            value={filtroMetodoPago} onChange={e => setFiltroMetodoPago(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 cursor-pointer"
                        >
                            <option value="Todos">Método: Todos</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Tarjeta">Tarjeta</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Mixto">Mixto</option>
                            {modoTab === 'mayoreo' && <option value="Crédito">Crédito</option>}
                        </select>

                        <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-700 transition shadow-md">
                            <Printer size={14} /> <span className="hidden sm:inline">Imprimir</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 print:overflow-visible">
                    <table className="w-full text-left border-collapse text-sm print:text-xs">
                        <thead className="sticky top-0 bg-white z-10 print:static print:bg-transparent">
                            <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest print:border-black print:text-black">
                                <th className="pb-3 px-2">Orden</th>
                                <th className="pb-3 px-2">Cliente / Identificador</th>
                                <th className="pb-3 px-2 text-center">Origen</th>
                                <th className="pb-3 px-2 text-center">Método</th>
                                <th className="pb-3 px-2 text-center">Estado</th>
                                <th className="pb-3 px-2 text-center">Promo / Descuento</th>
                                <th className="pb-3 px-2 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 print:divide-slate-300">
                            {ordenesAMostrar.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-10 font-bold text-slate-400 print:text-black">
                                        No hay órdenes para los filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                ordenesAMostrar.map(p => {
                                    let dirPura = p.direccion_entrega || '';
                                    if (dirPura.includes('|')) dirPura = dirPura.split('|')[0].trim();

                                    const isCancelado = p.estado_preparacion === 'Cancelado';
                                    const isSeleccionado = pedidoSeleccionado?.id === p.id;

                                    let clienteExtracto = p.cliente_nombre || 'Invitado';
                                    if (clienteExtracto === 'Invitado' && p.direccion_entrega && p.direccion_entrega.includes('A NOMBRE DE:')) {
                                        clienteExtracto = p.direccion_entrega.split('A NOMBRE DE:')[1].split('|')[0].trim();
                                    }

                                    // 👇 FIX APLICADO: Extracción Dinámica de Pagos Mixtos (Cualquier método)
                                    let desgloseMixto = null;
                                    if (p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
                                        try {
                                            let pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos;
                                            if (typeof pm === 'string') pm = JSON.parse(pm); // Doble parseo preventivo
                                            if (Array.isArray(pm)) {
                                                desgloseMixto = pm.map(x => `${String(x.metodo).toUpperCase().substring(0, 3)}: $${Number(x.monto).toFixed(2)}`).join(' | ');
                                            }
                                        } catch(e){}
                                    }

                                    let promosText = [];
                                    if (p.cupon_codigo) promosText.push(`🎟️ Cupón`);
                                    if (Number(p.descuento_puntos) > 0) promosText.push(`🎁 Puntos`);
                                    try {
                                        const car = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : (p.carrito || []);
                                        const hasUpsell = car.some(item => item.extras && item.extras.some(ex => String(ex.nombre).includes('⭐ Promo')));
                                        if (hasUpsell) promosText.push(`🔥 Oferta`);
                                    } catch (e) { }

                                    let estadoVisual = p.estado_preparacion;
                                    if (estadoVisual === 'Pagado' && ['Por Cobrar', 'Pendiente'].includes(p.metodo_pago)) {
                                        estadoVisual = 'EN COLA';
                                    }

                                    return (
                                        <tr
                                            key={p.id}
                                            onClick={() => setPedidoSeleccionado({ ...p, _esB2B: modoTab === 'mayoreo' })}
                                            className={`transition-colors cursor-pointer group print:break-inside-avoid ${isSeleccionado ? 'bg-blue-50/50 print:bg-transparent' : 'hover:bg-slate-50 print:hover:bg-transparent'}`}
                                        >
                                            <td className="py-3 px-2 align-top">
                                                <span className="font-black text-slate-800 print:text-black">#{p.numero_pedido}</span>
                                                <br /><span className="text-[10px] font-bold text-slate-400 print:text-slate-600">{new Date(p.fecha_creacion).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td className="py-3 px-2 align-top">
                                                <p className={`font-bold ${isCancelado ? 'text-slate-400 line-through print:text-slate-400' : 'text-slate-700 print:text-black'}`}>
                                                    {clienteExtracto}
                                                </p>
                                                <p className="text-[10px] font-black uppercase text-slate-400 print:text-slate-600 mt-0.5 tracking-widest flex items-center gap-1">
                                                    {modoTab === 'mayoreo' ? 'B2B: ' : ''}{p.tipo_consumo} {p.mesa ? `- MESA ${p.mesa}` : ''}
                                                </p>
                                            </td>

                                            <td className="py-3 px-2 text-center align-top">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 print:text-black">
                                                    {p.origen || 'CAJA'}
                                                </span>
                                            </td>

                                            <td className="py-3 px-2 text-center align-top">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md print:border print:bg-transparent print:text-black ${p.metodo_pago === 'Efectivo' ? 'bg-emerald-100 text-emerald-700' :
                                                    p.metodo_pago === 'Tarjeta' ? 'bg-blue-100 text-blue-700' :
                                                        p.metodo_pago === 'Transferencia' ? 'bg-purple-100 text-purple-700' : 
                                                        p.metodo_pago === 'Mixto' ? 'bg-pink-100 text-pink-700' : 'bg-slate-200 text-slate-600'
                                                    }`}>
                                                    {p.metodo_pago}
                                                </span>
                                                {/* 👇 EL DESGLOSE DE PAGO MIXTO APARECE AQUÍ DEBAJO DE LA ETIQUETA */}
                                                {desgloseMixto && (
                                                    <div className="text-[8px] font-bold text-slate-500 mt-1.5 whitespace-nowrap">
                                                        {desgloseMixto}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-2 text-center align-top">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md print:border print:bg-transparent print:text-black ${isCancelado ? 'bg-red-100 text-red-700' :
                                                    ['Entregado', 'Finalizado', 'Liquidado'].includes(p.estado_preparacion) ? 'bg-emerald-100 text-emerald-700' :
                                                        estadoVisual === 'EN COLA' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {estadoVisual}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 text-center align-top">
                                                {promosText.length > 0 ? (
                                                    <div className="flex flex-col gap-1 items-center">
                                                        {promosText.map((txt, i) => (
                                                            <span key={i} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-orange-100 text-orange-700 border border-orange-200 shadow-sm whitespace-nowrap">
                                                                {txt}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 font-bold">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-2 text-right align-top font-black text-slate-800 print:text-black">
                                                ${Number(p.total).toFixed(2)}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="lg:col-span-1 bg-slate-50 rounded-[32px] border border-slate-200 p-6 flex flex-col h-[600px] print:hidden shadow-inner">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-4 mb-4 shrink-0 flex items-center gap-2">
                    <Eye size={16} /> Visor de Orden
                </h3>
                <div className="flex-1 overflow-hidden flex flex-col">
                    {pedidoSeleccionado ? (
                        pedidoSeleccionado._esB2B ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center bg-slate-200/50 rounded-2xl border border-slate-200 pt-4 animate-in zoom-in-95 duration-200 relative">
                                <div className="transform scale-[0.85] origin-top w-full flex justify-center pb-10">
                                    <TicketImpresionMayoreo
                                        ticketImprimir={pedidoSeleccionado}
                                        configGlobal={configGlobal}
                                        apiUrl={apiUrl}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-md shrink-0 mb-4 border border-slate-800">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-black text-2xl tracking-tight text-white">Orden #{pedidoSeleccionado.numero_pedido}</p>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${pedidoSeleccionado.estado_preparacion === 'Cancelado' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                            {pedidoSeleccionado.estado_preparacion}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                            <User size={12} className="text-blue-400" /> {pedidoSeleccionado.cliente_nombre || 'Invitado'}
                                        </p>
                                        {pedidoSeleccionado.origen && (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                            💻 Origen: {pedidoSeleccionado.origen}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 shrink-0 px-2">Desglose de Platillos</p>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                                    {deserializarCarrito(pedidoSeleccionado.carrito).map((item, idx) => (
                                        <div key={idx} className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-sm transition hover:bg-slate-800/80">
                                            <div className="flex justify-between items-start gap-2">
                                                <p className="font-bold text-sm text-slate-200 leading-tight">
                                                    <span className="text-blue-400 font-black mr-1.5">{item.cantidad}x</span>
                                                    {item.nombre}
                                                </p>
                                                <p className="font-black text-emerald-400 text-sm shrink-0">
                                                    ${(parseMoney(item.precioFinal) * (item.cantidad || 1)).toFixed(2)}
                                                </p>
                                            </div>
                                            {item.extras && item.extras.length > 0 && (
                                                <div className="mt-2.5 pl-3 border-l-2 border-slate-600 space-y-1">
                                                    {item.extras.map((e, i) => (
                                                        <p key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                                                            <span>+ {e.nombre}</span>
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 text-sm space-y-3 mt-4 shrink-0 shadow-inner">
                                    
                                    {/* 👇 FIX APLICADO: Inyección dinámica en el Visor Lateral */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Liquidación:</span>
                                        <div className="text-right">
                                            <span className="font-black uppercase text-slate-200 block">{pedidoSeleccionado.metodo_pago}</span>
                                            {pedidoSeleccionado.metodo_pago === 'Mixto' && pedidoSeleccionado.pagos_mixtos && (() => {
                                                try {
                                                    let pm = typeof pedidoSeleccionado.pagos_mixtos === 'string' ? JSON.parse(pedidoSeleccionado.pagos_mixtos) : pedidoSeleccionado.pagos_mixtos;
                                                    if (typeof pm === 'string') pm = JSON.parse(pm); // Doble parseo preventivo
                                                    if (Array.isArray(pm)) {
                                                        return (
                                                            <span className="text-[9px] text-slate-400 font-bold mt-0.5 block">
                                                                {pm.map(x => `${String(x.metodo).toUpperCase().substring(0, 3)}: $${Number(x.monto).toFixed(2)}`).join(' | ')}
                                                            </span>
                                                        );
                                                    }
                                                } catch(e){ return null; }
                                            })()}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-800/60 mt-1"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Total Abonado:</span><span className="text-emerald-400 font-black text-2xl tracking-tight">{formaterMoneda(parseMoney(pedidoSeleccionado.total))}</span></div>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 opacity-60">
                            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <Eye className="text-slate-400" size={32} />
                            </div>
                            <p className="text-xl font-black text-slate-500">Visor de Tickets</p>
                            <p className="text-sm mt-1 px-6 font-medium">Selecciona una orden de la tabla para analizar lo que se preparó y cobró en ese momento.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrdenesRegistradas;