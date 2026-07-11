import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import {
    Search, ShoppingBag, Eye, CalendarDays, Printer,
    Store, Calculator, Smartphone, User, CreditCard, Banknote, Bike, MapPin
} from 'lucide-react';

const formaterMoneda = (monto) => {
    return "$" + Number(monto).toFixed(2);
};

const getLocalHoyStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getMazatlanDate = (dateString) => {
    if (!dateString) return {};
    const dateObj = new Date(dateString);
    const formatter = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mazatlan', year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = formatter.formatToParts(dateObj);
    let dDay, dMonth, dYear;
    parts.forEach(part => {
        if (part.type === 'day') dDay = part.value;
        if (part.type === 'month') dMonth = part.value;
        if (part.type === 'year') dYear = part.value;
    });
    return {
        localDateStr: `${dYear}-${dMonth}-${dDay}`,
        localMonthStr: `${dYear}-${dMonth}`,
        localYearStr: `${dYear}`
    };
};

const deserializarCarrito = (carritoRaw) => {
    if (Array.isArray(carritoRaw)) return carritoRaw;
    try {
        return JSON.parse(carritoRaw) || [];
    } catch (e) {
        return [];
    }
};

const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g, "")) || 0;

const VistaCortesHistorico = ({ apiUrl }) => {
    const hoyStr = getLocalHoyStr();
    const baseUrl = apiUrl.replace('/api', '');
    const [periodo, setPeriodo] = useState('dia');
    const [fechaFiltro, setFechaFiltro] = useState(hoyStr);
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroMetodoPago, setFiltroMetodoPago] = useState('Todos');
    const [cargando, setCargando] = useState(false);

    const [pedidos, setPedidos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [compras, setCompras] = useState([]);
    const [cortesDelDia, setCortesDelDia] = useState([]);

    const [corteSeleccionadoId, setCorteSeleccionadoId] = useState('global');
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

    const cargarAuditoriaCompleta = useCallback(async () => {
        setCargando(true);
        try {
            const [resPed, resCorte, resCompras, resUsu] = await Promise.all([
                fetch(`${apiUrl}/pedidos/historial?periodo=${periodo}&fecha=${fechaFiltro}`),
                periodo === 'dia' ? fetch(`${apiUrl}/cortes/historial?fecha=${fechaFiltro}&completo=true`) : Promise.resolve({ ok: false }),
                fetch(`${apiUrl}/insumos/compras/reporte?periodo=${periodo}&fecha=${fechaFiltro}`),
                fetch(`${apiUrl}/usuarios`)
            ]);

            if (resUsu.ok) {
                const usuData = await resUsu.json();
                setUsuarios(Array.isArray(usuData) ? usuData : []);
            }

            if (resCompras.ok) {
                const compData = await resCompras.json();
                setCompras(Array.isArray(compData) ? compData : []);
            } else {
                setCompras([]);
            }

            if (resPed.ok) {
                let data = await resPed.json();
                data = data.filter(p => {
                    if (!p.fecha_creacion) return false;
                    const { localDateStr, localMonthStr, localYearStr } = getMazatlanDate(p.fecha_creacion);
                    if (periodo === 'dia') return localDateStr === fechaFiltro;
                    if (periodo === 'mes') return localMonthStr === fechaFiltro.substring(0, 7);
                    if (periodo === 'anio') return localYearStr === fechaFiltro.substring(0, 4);
                    return true;
                });
                setPedidos(data);
            }

            if (resCorte.ok) {
                const dataC = await resCorte.json();
                setCortesDelDia(Array.isArray(dataC) ? dataC.sort((a, b) => a.id - b.id) : [dataC]);
            } else {
                setCortesDelDia([]);
            }

            setCorteSeleccionadoId('global');
        } catch (e) {
            console.error("Error sincronizando auditoría:", e);
        } finally {
            setCargando(false);
        }
    }, [periodo, fechaFiltro, apiUrl]);

    useEffect(() => {
        cargarAuditoriaCompleta();
        setPedidoSeleccionado(null);
    }, [cargarAuditoriaCompleta]);

    useEffect(() => {
        if (periodo === 'dia' && fechaFiltro === hoyStr) {
            const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
            socket.on('connect', () => console.log('Conectado a Sockets (Auditoría)'));
            socket.on('nuevo_pedido', () => cargarAuditoriaCompleta());
            socket.on('pedido_actualizado', () => cargarAuditoriaCompleta());
            return () => socket.disconnect();
        }
    }, [periodo, fechaFiltro, hoyStr, baseUrl, cargarAuditoriaCompleta]);

    const pedidosDelTurno = useMemo(() => {
        if (periodo !== 'dia') return pedidos;
        if (corteSeleccionadoId === 'global') return pedidos;
        const corteAct = cortesDelDia.find(c => String(c.id) === String(corteSeleccionadoId));
        if (corteAct) {
            const ids = typeof corteAct.pedidos_incluidos === 'string' ? JSON.parse(corteAct.pedidos_incluidos) : (corteAct.pedidos_incluidos || []);
            return pedidos.filter(p => ids.includes(p.id));
        }
        return [];
    }, [pedidos, corteSeleccionadoId, cortesDelDia, periodo]);

    const pedidosOrdenadosCrono = [...pedidosDelTurno].sort((a, b) => new Date(a.fecha_creacion) - new Date(b.fecha_creacion));

    let lEfectivo = 0, lTarjeta = 0, lTransf = 0;
    let dEfectivo = 0, dTarjeta = 0, dTransf = 0;
    let tEnvio = 0, dEnvio = 0;
    let tPlatillos = 0, tExtras = 0, dPlatillos = 0, dExtras = 0, tDescuentos = 0;

    pedidosDelTurno.forEach(p => {
        if (['Cancelado', 'Pendiente', 'Por Confirmar'].includes(p.estado_preparacion)) return;
        
        let metodoPagoReal = p.metodo_pago;
        if (['Pendiente', 'Por Cobrar'].includes(metodoPagoReal)) {
            metodoPagoReal = 'Efectivo';
        }

        const isComedor = p.metodo_pago === 'Comida Personal';
        const isDomicilio = p.tipo_consumo === 'Domicilio';

        let efe = 0, tar = 0, tra = 0;
        if (metodoPagoReal === 'Efectivo') efe += parseMoney(p.total);
        if (metodoPagoReal === 'Tarjeta') tar += parseMoney(p.total);
        if (metodoPagoReal === 'Transferencia') tra += parseMoney(p.total);
        if (metodoPagoReal === 'Mixto' && p.pagos_mixtos) {
            let pm = []; try { pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos; } catch (e) { }
            pm.forEach(x => {
                if (x.metodo === 'Efectivo') efe += parseMoney(x.monto);
                if (x.metodo === 'Tarjeta') tar += parseMoney(x.monto);
                if (x.metodo === 'Transferencia') tra += parseMoney(x.monto);
            });
        }

        if (isDomicilio) { 
            dEfectivo += efe; dTarjeta += tar; dTransf += tra; 
            dEnvio += parseMoney(p.costo_envio); tEnvio += parseMoney(p.costo_envio); 
        } else { 
            lEfectivo += efe; lTarjeta += tar; lTransf += tra; 
            tEnvio += parseMoney(p.costo_envio); 
        }

        let car = [];
        if (Array.isArray(p.carrito)) car = p.carrito;
        else if (typeof p.carrito === 'string') { try { car = JSON.parse(p.carrito); } catch (e) { } }

        let order_gross = parseMoney(p.costo_envio);

        car.forEach(i => {
            const qty = parseMoney(i.cantidad) || 1;
            let exP = 0;
            if (Array.isArray(i.extras)) {
                i.extras.forEach(e => {
                    const eNameLower = (e.nombre || '').trim().toLowerCase();
                    let isRealExtra = true;
                    if (eNameLower.includes('nota:') || eNameLower.includes('📝') || eNameLower.startsWith('sin ') || eNameLower.includes(' ❌') || eNameLower.startsWith('❌')) isRealExtra = false;
                    else if (eNameLower.includes('sabor:') || eNameLower.includes('tamaño:') || eNameLower.includes('🔸') || eNameLower.includes('🔹') || e.tipo === 'variacion') isRealExtra = false;
                    if (isRealExtra) exP += parseMoney(e.precioExtra || e.precio_extra || e.precio || 0);
                });
            }

            const calcExtra = (exP * qty);
            let calcBase = parseMoney(i.precioFinal || i.precio_base || i.precio) - exP;
            if (calcBase < 0) calcBase = 0;
            const calcPlat = (calcBase * qty);

            if (!isComedor) {
                tExtras += calcExtra; tPlatillos += calcPlat;
                if (isDomicilio) {
                    dExtras += calcExtra; dPlatillos += calcPlat;
                }
            }

            order_gross += (parseMoney(i.precioFinal || i.precio_base || i.precio) * qty);
        });

        if (!isComedor) {
            const discount = order_gross - parseMoney(p.total);
            if (discount > 0) tDescuentos += discount;
        }
    });

    let fondoCaja = 0, fondoRepartidor = 0, gastosCompras = 0, efectivoDeclaradoCaja = 0;

    if (corteSeleccionadoId === 'global' || periodo !== 'dia') {
        gastosCompras = compras.reduce((s, c) => s + Number(c.costo_total || 0), 0);
        const fondoCerrado = cortesDelDia.reduce((s, c) => s + Number(c.fondo_inicial || 0), 0);
        const fondoActivo = usuarios.reduce((s, u) => s + Number(u.fondo_actual || 0), 0);
        fondoCaja = fondoCerrado + fondoActivo;
        fondoRepartidor = cortesDelDia.reduce((s, c) => s + Number(c.fondo_repartidor || 0), 0);
        efectivoDeclaradoCaja = cortesDelDia.reduce((s, c) => s + Number(c.efectivo_cajon || 0), 0);
    } else {
        const cAct = cortesDelDia.find(c => String(c.id) === String(corteSeleccionadoId));
        if (cAct) {
            fondoCaja = Number(cAct.fondo_inicial || 0);
            fondoRepartidor = Number(cAct.fondo_repartidor || 0);
            gastosCompras = Number(cAct.total_gastos || 0);
            efectivoDeclaradoCaja = Number(cAct.efectivo_cajon || 0);
        }
    }

    const totalEfectivoDia = lEfectivo + dEfectivo;
    const totalFondoGlobal = fondoCaja + fondoRepartidor;
    const totalVentasBrutas = tPlatillos + tExtras + tEnvio;
    const totalIngresoNetoReal = totalVentasBrutas - tDescuentos - gastosCompras;
    
    let efectivoEsperadoCaja = totalFondoGlobal + totalEfectivoDia - gastosCompras;
    const efectivoEsperadoMotos = fondoRepartidor + dEfectivo;

    if (corteSeleccionadoId === 'global') {
        efectivoEsperadoCaja = totalEfectivoDia - gastosCompras;
    }

    const diferenciaCaja = efectivoDeclaradoCaja - efectivoEsperadoCaja;
    const diferenciaFeria = totalEfectivoDia - gastosCompras - efectivoDeclaradoCaja;

    const totalTarjetas = lTarjeta + dTarjeta;
    const totalTransferencias = lTransf + dTransf;
    const totalDigital = totalTarjetas + totalTransferencias;

    if (cargando && pedidos.length === 0) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">Sincronizando auditoría en vivo...</div>;

    const pedidosFiltradosFinales = pedidosOrdenadosCrono.filter(p => {
        if (['Cancelado', 'Pendiente', 'Por Confirmar'].includes(p.estado_preparacion)) return false;
        if (filtroMetodoPago !== 'Todos' && p.metodo_pago !== filtroMetodoPago) return false;
        if (filtroCliente.trim() !== '') {
            const cliente = (p.cliente_nombre || '').toLowerCase();
            const iden = (p.numero_pedido || '').toString();
            const busq = filtroCliente.toLowerCase();
            if (!cliente.includes(busq) && !iden.includes(busq)) return false;
        }
        return true;
    }).sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

    return (
        <div className="space-y-6 animate-in fade-in duration-300 print:m-0 print:p-0 print:space-y-0 text-slate-800 print:absolute print:inset-0 print:bg-white print:z-[99999]">

            <div className="hidden print:block text-center mb-6 pt-4 w-full">
                <h1 className="text-3xl font-black text-slate-900 uppercase">Auditoría de Ventas</h1>
                <p className="text-slate-500 font-bold mt-1 text-sm">Fecha: {fechaFiltro} | Rango: {corteSeleccionadoId === 'global' ? 'DÍA COMPLETO' : 'TURNO ESPECÍFICO'}</p>
                <hr className="mt-4 border-slate-300" />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-3 rounded-2xl text-slate-600"><CalendarDays size={24} /></div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Cortes y Auditoría</h2>
                        <p className="text-sm font-bold text-slate-500">Historial de operaciones</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors cursor-pointer">
                        <option value="dia">Por Día</option>
                        <option value="mes">Por Mes</option>
                        <option value="anio">Por Año</option>
                    </select>

                    {periodo === 'dia' && <input type="date" value={fechaFiltro} max={hoyStr} onChange={(e) => setFechaFiltro(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" />}
                    {periodo === 'mes' && <input type="month" value={fechaFiltro.substring(0, 7)} onChange={(e) => setFechaFiltro(`${e.target.value}-01`)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" />}
                    {periodo === 'anio' && <input type="number" min="2020" max="2099" value={fechaFiltro.substring(0, 4)} onChange={(e) => setFechaFiltro(`${e.target.value}-01-01`)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors w-24 text-center" />}
                </div>
            </div>

            {periodo === 'dia' && cortesDelDia.length > 0 && (
                <div className="flex gap-2 overflow-x-auto custom-scrollbar mb-6 print:hidden items-center py-1">
                    <button
                        onClick={() => setCorteSeleccionadoId('global')}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                            corteSeleccionadoId === 'global'
                                ? 'bg-[#ca8a04] text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                    >
                        Día Completo (Global)
                    </button>
                    {cortesDelDia.map((c, i) => (
                        <button
                            key={c.id}
                            onClick={() => setCorteSeleccionadoId(c.id)}
                            className={`px-6 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                                String(corteSeleccionadoId) === String(c.id)
                                    ? 'bg-[#ca8a04] text-white shadow-md'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                        >
                            <User size={16} /> Turno {i + 1}: {c.usuario_nombre || 'Cajero'}
                        </button>
                    ))}
                </div>
            )}

            <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200 relative overflow-hidden print:border-none print:shadow-none print:p-0">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest px-2 flex items-center gap-3 print:text-black">
                        <Store size={24} className="text-blue-500 print:hidden" /> 1. Caja Principal (Mostrador)
                    </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:grid-cols-4">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 print:border-black">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 print:text-black">Ventas Brutas</p>
                        <p className="text-2xl font-black text-slate-700 print:text-black">{formaterMoneda(totalVentasBrutas)}</p>
                        {tDescuentos > 0 && (
                            <p className="text-[10px] font-bold text-orange-500 mt-1 border-t border-slate-200 pt-1">
                                Descuentos: -{formaterMoneda(tDescuentos)}
                            </p>
                        )}
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 print:border-black">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 print:text-black">Fondo Inicial</p>
                        <p className="text-2xl font-black text-slate-700 print:text-black">{formaterMoneda(totalFondoGlobal)}</p>
                    </div>
                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 print:border-black">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 print:text-black">Ingresos Efectivo</p>
                        <p className="text-2xl font-black text-emerald-700 print:text-black">+{formaterMoneda(totalEfectivoDia)}</p>
                    </div>
                    <div className="bg-red-50 p-5 rounded-2xl border border-red-100 relative print:border-black">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 print:text-black">Gastos (Compras)</p>
                        <p className="text-xl font-black text-red-700 print:text-black">-{formaterMoneda(gastosCompras)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800 p-6 rounded-3xl shadow-md flex flex-col justify-center text-white print:bg-white print:text-black print:border print:border-black">
                        <p className="text-slate-300 font-black uppercase tracking-widest mb-1 text-[10px] print:text-black">Efectivo Esperado</p>
                        <p className="text-3xl font-black">{formaterMoneda(efectivoEsperadoCaja)}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 print:text-black">
                            {corteSeleccionadoId === 'global' ? '(Ingresos Efectivo) - Gastos' : '(Fondo + Ingresos Efectivo) - Gastos'}
                        </p>
                    </div>

                    {periodo === 'dia' && corteSeleccionadoId !== 'global' && (
                        <>
                            <div className="bg-orange-50 p-6 rounded-3xl border border-orange-200 shadow-sm flex flex-col justify-center print:border-black print:bg-transparent">
                                <p className="text-orange-600 font-black uppercase tracking-widest mb-1 text-[10px] print:text-black">Efectivo Declarado</p>
                                <p className="text-3xl font-black text-blue-800 print:text-black">{formaterMoneda(efectivoDeclaradoCaja)}</p>
                                <p className="text-[9px] font-bold text-orange-500 uppercase mt-2 print:text-black">Por cajero al cerrar turno</p>
                            </div>
                            <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-center print:bg-transparent print:border-black ${diferenciaCaja >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                <p className={`font-black uppercase tracking-widest mb-1 text-[10px] print:text-black ${diferenciaCaja >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {diferenciaCaja >= 0 ? 'Sobrante a Favor' : 'Faltante en Caja'}
                                </p>
                                <p className={`text-3xl font-black print:text-black ${diferenciaCaja >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {diferenciaCaja >= 0 ? '+' : ''}{formaterMoneda(diferenciaCaja)}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 print:text-black">Diferencia neta</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 2. MÓDULO LOGÍSTICO (Repartidores) */}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start print:hidden">
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

                <div className="bg-emerald-50 p-6 md:p-8 rounded-[32px] border border-emerald-200 shadow-sm flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-emerald-600 text-white p-2 md:p-3 rounded-xl"><Calculator size={24} /></div>
                        <div>
                            <h3 className="text-xl font-black text-emerald-900 uppercase tracking-widest leading-tight">Cuadre Global</h3>
                            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Auditoría y Rendimiento</p>
                        </div>
                    </div>

                    {/* SECCIÓN A: AUDITORÍA DE EFECTIVO FÍSICO */}
                    <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm mb-4">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">A. Auditoría de Efectivo Físico</p>
                        
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm font-bold text-slate-400">
                                <span>Fondo Inicial (Solo Referencia):</span>
                                <span>{formaterMoneda(totalFondoGlobal)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-emerald-600">
                                <span>+ Ingresos Efectivo (Ventas):</span>
                                <span>{formaterMoneda(totalEfectivoDia)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-red-500">
                                <span>- Gastos Pagados de Caja:</span>
                                <span>-{formaterMoneda(gastosCompras)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-blue-600">
                                <span>- Ingresos Declarados:</span>
                                <span>-{formaterMoneda(efectivoDeclaradoCaja)}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                            {corteSeleccionadoId === 'global' ? (
                                <>
                                    <div>
                                        <span className="text-sm font-black text-emerald-800 uppercase tracking-widest block">Sobrante (Para Feria):</span>
                                        <span className="text-[9px] text-emerald-600 font-bold">Ingresos - Gastos - Declarado</span>
                                    </div>
                                    <span className={`text-2xl font-black ${diferenciaFeria < 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                                        {diferenciaFeria < 0 ? '-' : ''}{formaterMoneda(Math.abs(diferenciaFeria))}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <span className="text-sm font-black text-emerald-800 uppercase tracking-widest block">Feria sig. turno:</span>
                                        <span className="text-[9px] text-emerald-600 font-bold">Ingresos - Gastos - Declarado</span>
                                    </div>
                                    <span className={`text-2xl font-black ${diferenciaFeria < 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                                        {diferenciaFeria < 0 ? '-' : ''}{formaterMoneda(Math.abs(diferenciaFeria))}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* SECCIÓN B: RENDIMIENTO REAL DEL NEGOCIO */}
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:w-full">
                <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col h-[600px] print:h-auto print:border-none print:shadow-none print:p-0 print:block print:w-full">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 shrink-0 border-b border-slate-100 pb-4 print:border-black print:mb-2 gap-4">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 print:text-black">
                            <ShoppingBag className="text-blue-500 print:hidden" size={20} /> Órdenes Registradas ({pedidosFiltradosFinales.length})
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto print:hidden">
                            <div className="relative flex-1 sm:flex-none">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text" placeholder="Buscar orden o cliente..."
                                    value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}
                                    className="w-full sm:w-48 pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <select
                                value={filtroMetodoPago} onChange={e => setFiltroMetodoPago(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="Todos">Método: Todos</option>
                                <option value="Efectivo">Efectivo</option>
                                <option value="Tarjeta">Tarjeta</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Mixto">Mixto</option>
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
                                    <th className="pb-3 px-2 text-center">Método</th>
                                    <th className="pb-3 px-2 text-center">Estado</th>
                                    <th className="pb-3 px-2 text-center">Promo / Descuento</th>
                                    <th className="pb-3 px-2 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 print:divide-slate-300">
                                {pedidosFiltradosFinales.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-10 font-bold text-slate-400 print:text-black">
                                            No hay órdenes para los filtros aplicados.
                                        </td>
                                    </tr>
                                ) : (
                                    pedidosFiltradosFinales.map(p => {
                                        let dirPura = p.direccion_entrega || '';
                                        if (dirPura.includes('|')) dirPura = dirPura.split('|')[0].trim();

                                        const isCancelado = p.estado_preparacion === 'Cancelado';
                                        const isSeleccionado = pedidoSeleccionado?.id === p.id;

                                        let clienteExtracto = p.cliente_nombre || 'Invitado';
                                        if (clienteExtracto === 'Invitado' && p.direccion_entrega && p.direccion_entrega.includes('A NOMBRE DE:')) {
                                            clienteExtracto = p.direccion_entrega.split('A NOMBRE DE:')[1].split('|')[0].trim();
                                        }

                                        let promosText = [];
                                        if (p.cupon_codigo) promosText.push(`🎟️ Cupón`);
                                        if (Number(p.descuento_puntos) > 0) promosText.push(`🎁 Puntos`);
                                        try {
                                            const car = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : (p.carrito || []);
                                            const hasUpsell = car.some(item => item.extras && item.extras.some(ex => String(ex.nombre).includes('⭐ Promo')));
                                            if (hasUpsell) promosText.push(`🔥 Oferta`);
                                        } catch(e) {}

                                        // 👇 FIX APLICADO: Máscara visual para órdenes en Cuenta Abierta (Por Cobrar)
                                        let estadoVisual = p.estado_preparacion;
                                        if (estadoVisual === 'Pagado' && ['Por Cobrar', 'Pendiente'].includes(p.metodo_pago)) {
                                            estadoVisual = 'EN COLA';
                                        }

                                        return (
                                            <tr
                                                key={p.id}
                                                onClick={() => setPedidoSeleccionado(p)}
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
                                                        {p.tipo_consumo} {p.mesa ? `- MESA ${p.mesa}` : ''}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-2 text-center align-top">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md print:border print:bg-transparent print:text-black ${p.metodo_pago === 'Efectivo' ? 'bg-emerald-100 text-emerald-700' :
                                                            p.metodo_pago === 'Tarjeta' ? 'bg-blue-100 text-blue-700' :
                                                                p.metodo_pago === 'Transferencia' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'
                                                        }`}>
                                                        {p.metodo_pago}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-center align-top">
                                                    {/* 👇 FIX APLICADO: Renderizado con la máscara visual del estado */}
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md print:border print:bg-transparent print:text-black ${
                                                        isCancelado ? 'bg-red-100 text-red-700' :
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
                            <div className="flex-1 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-md shrink-0 mb-4 border border-slate-800">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-black text-2xl tracking-tight text-white">Orden #{pedidoSeleccionado.numero_pedido}</p>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${pedidoSeleccionado.estado_preparacion === 'Cancelado' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                            {pedidoSeleccionado.estado_preparacion}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><User size={12} className="text-blue-400" /> {pedidoSeleccionado.cliente_nombre || 'Invitado'}</p>
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
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Liquidación:</span><span className="font-black uppercase text-slate-200">{pedidoSeleccionado.metodo_pago}</span></div>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-800/60 mt-1"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Total Abonado:</span><span className="text-emerald-400 font-black text-2xl tracking-tight">{formaterMoneda(parseMoney(pedidoSeleccionado.total))}</span></div>
                                </div>
                            </div>
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
        </div>
    );
};

export default VistaCortesHistorico;