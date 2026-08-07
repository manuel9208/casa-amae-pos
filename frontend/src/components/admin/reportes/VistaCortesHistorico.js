import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { CalendarDays, X, CheckSquare, Square, Printer } from 'lucide-react';

// Importación de Módulos (Hijos)
import TurnosCaja from './corte/TurnosCaja';
import CajaPrincipal from './corte/CajaPrincipal';
import Repartidores from './corte/Repartidores';
import PagosDigitales from './corte/PagosDigitales';
import CuadreGlobal from './corte/CuadreGlobal';
import AuditoriaIndividual from './corte/AuditoriaIndividual';
import OrdenesRegistradas from './corte/OrdenesRegistradas';

const formaterMoneda = (monto) => "$" + Number(monto).toFixed(2);
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
    return { localDateStr: `${dYear}-${dMonth}-${dDay}`, localMonthStr: `${dYear}-${dMonth}`, localYearStr: `${dYear}` };
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

    const [fondosSeleccionados, setFondosSeleccionados] = useState([]);
    const [modalFondosAbierto, setModalFondosAbierto] = useState(false);

    const cargarAuditoriaCompleta = useCallback(async () => {
        setCargando(true);
        try {
            const [resPed, resCorte, resCompras, resUsu] = await Promise.all([
                fetch(`${apiUrl}/pedidos/historial?periodo=${periodo}&fecha=${fechaFiltro}`),
                periodo === 'dia' ? fetch(`${apiUrl}/cortes/historial?fecha=${fechaFiltro}&completo=true`) : Promise.resolve({ ok: false }),
                fetch(`${apiUrl}/insumos/compras/reporte?periodo=${periodo}&fecha=${fechaFiltro}`),
                fetch(`${apiUrl}/usuarios`)
            ]);

            if (resUsu.ok) { const usuData = await resUsu.json(); setUsuarios(Array.isArray(usuData) ? usuData : []); }
            if (resCompras.ok) { const compData = await resCompras.json(); setCompras(Array.isArray(compData) ? compData : []); } else setCompras([]);
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
            } else setCortesDelDia([]);

            setCorteSeleccionadoId('global');
        } catch (e) { console.error("Error sincronizando auditoría:", e); } 
        finally { setCargando(false); }
    }, [periodo, fechaFiltro, apiUrl]);

    useEffect(() => { cargarAuditoriaCompleta(); setPedidoSeleccionado(null); }, [cargarAuditoriaCompleta]);

    useEffect(() => {
        if (periodo === 'dia' && fechaFiltro === hoyStr) {
            const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
            socket.on('nuevo_pedido', () => cargarAuditoriaCompleta());
            socket.on('pedido_actualizado', () => cargarAuditoriaCompleta());
            return () => socket.disconnect();
        }
    }, [periodo, fechaFiltro, hoyStr, baseUrl, cargarAuditoriaCompleta]);

    // 👇 ASIGNAR FONDO POR DEFECTO (Solo el Turno 1 para evitar inflar el cuadre)
    useEffect(() => {
        if (cortesDelDia && cortesDelDia.length > 0) {
            setFondosSeleccionados([cortesDelDia[0].id]); // 👈 Mantenemos tu lógica matemáticamente correcta
        } else {
            setFondosSeleccionados([]);
        }
    }, [cortesDelDia]);

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

    let lEfectivo = 0, lTarjeta = 0, lTransf = 0, dEfectivo = 0, dTarjeta = 0, dTransf = 0, tEnvio = 0, dEnvio = 0;
    let tPlatillos = 0, tExtras = 0, dPlatillos = 0, dExtras = 0, tDescuentos = 0, tDescuentosEfectivo = 0;

    pedidosDelTurno.forEach(p => {
        if (['Cancelado', 'Pendiente', 'Por Confirmar'].includes(p.estado_preparacion)) return;
        let metodoPagoReal = p.metodo_pago;
        if (['Pendiente', 'Por Cobrar'].includes(metodoPagoReal)) metodoPagoReal = 'Efectivo';

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

        if (isDomicilio) { dEfectivo += efe; dTarjeta += tar; dTransf += tra; dEnvio += parseMoney(p.costo_envio); tEnvio += parseMoney(p.costo_envio); } 
        else { lEfectivo += efe; lTarjeta += tar; lTransf += tra; tEnvio += parseMoney(p.costo_envio); }

        let car = [];
        if (Array.isArray(p.carrito)) car = p.carrito; else if (typeof p.carrito === 'string') { try { car = JSON.parse(p.carrito); } catch (e) { } }
        let order_gross = parseMoney(p.costo_envio);

        car.forEach(i => {
            const qty = parseMoney(i.cantidad) || 1; let exP = 0;
            if (Array.isArray(i.extras)) {
                i.extras.forEach(e => {
                    const eNameLower = (e.nombre || '').trim().toLowerCase();
                    let isRealExtra = true;
                    if (eNameLower.includes('nota:') || eNameLower.includes('📝') || eNameLower.startsWith('sin ') || eNameLower.includes(' ❌') || eNameLower.startsWith('❌')) isRealExtra = false;
                    else if (eNameLower.includes('sabor:') || eNameLower.includes('tamaño:') || eNameLower.includes('🔸') || eNameLower.includes('🔹') || e.tipo === 'variacion') isRealExtra = false;
                    if (isRealExtra) exP += parseMoney(e.precioExtra || e.precio_extra || e.precio || 0);
                });
            }
            const calcExtra = (exP * qty); let calcBase = parseMoney(i.precioFinal || i.precio_base || i.precio) - exP;
            if (calcBase < 0) calcBase = 0; const calcPlat = (calcBase * qty);

            if (!isComedor) {
                tExtras += calcExtra; tPlatillos += calcPlat;
                if (isDomicilio) { dExtras += calcExtra; dPlatillos += calcPlat; }
            }
            order_gross += (parseMoney(i.precioFinal || i.precio_base || i.precio) * qty);
        });

        if (!isComedor) { 
            const discount = order_gross - parseMoney(p.total); 
            if (discount > 0) {
                tDescuentos += discount; 
                if (metodoPagoReal === 'Efectivo') tDescuentosEfectivo += discount;
            }
        }
    });

    let fondoCaja = 0, fondoRepartidor = 0, gastosCompras = 0, efectivoDeclaradoCaja = 0;
    let efectivoEntregadoTotal = 0, efectivoEnCajaTotal = 0, fondosAdicionales = 0;

    if (corteSeleccionadoId === 'global' || periodo !== 'dia') {
        gastosCompras = compras.reduce((s, c) => s + Number(c.costo_total || 0), 0);
        
        if (cortesDelDia.length > 0) {
            // Fondo Inicial: Solo el 1er Turno (salvo que en modal seleccionen otros adicionales)
            fondoCaja = cortesDelDia.filter(c => fondosSeleccionados.includes(c.id)).reduce((s, c) => s + Number(c.fondo_inicial || 0), 0);
            fondosAdicionales = cortesDelDia.filter(c => !fondosSeleccionados.includes(c.id)).reduce((s, c) => s + Number(c.fondo_inicial || 0), 0);
            
            // LÓGICA MAESTRA: Retiros (Suma de todos) + Fondo Dejado (Solo el ÚLTIMO turno)
            efectivoEntregadoTotal = cortesDelDia.reduce((s, c) => s + Number(c.efectivo_entregado || 0), 0);
            efectivoEnCajaTotal = Number(cortesDelDia[cortesDelDia.length - 1].efectivo_en_caja || 0);
            
            efectivoDeclaradoCaja = efectivoEntregadoTotal + efectivoEnCajaTotal;
        } else {
            fondoCaja = usuarios.reduce((s, u) => s + Number(u.fondo_actual || 0), 0);
        }

        fondoRepartidor = cortesDelDia.reduce((s, c) => s + Number(c.fondo_repartidor || 0), 0);
    } else {
        // Vista Individual
        const cAct = cortesDelDia.find(c => String(c.id) === String(corteSeleccionadoId));
        if (cAct) {
            fondoCaja = Number(cAct.fondo_inicial || 0); fondoRepartidor = Number(cAct.fondo_repartidor || 0);
            gastosCompras = Number(cAct.total_gastos || 0); efectivoDeclaradoCaja = Number(cAct.efectivo_cajon || 0);
            efectivoEntregadoTotal = Number(cAct.efectivo_entregado || 0); efectivoEnCajaTotal = Number(cAct.efectivo_en_caja || 0);
        }
    }

    const totalEfectivoDia = lEfectivo + dEfectivo; const totalFondoGlobal = fondoCaja + fondoRepartidor;
    const totalVentasBrutas = tPlatillos + tExtras + tEnvio; const totalIngresoNetoReal = totalVentasBrutas - tDescuentos - gastosCompras;
    const efectivoEsperadoCaja = fondoCaja + totalEfectivoDia - gastosCompras; const efectivoEsperadoMotos = fondoRepartidor + dEfectivo;
    
    const diferenciaAuditoria = efectivoEsperadoCaja - efectivoDeclaradoCaja;
    const isFaltante = diferenciaAuditoria > 0; const isSobrante = diferenciaAuditoria < 0; const isPerfecto = diferenciaAuditoria === 0;

    const totalTarjetas = lTarjeta + dTarjeta; const totalTransferencias = lTransf + dTransf; const totalDigital = totalTarjetas + totalTransferencias;

    if (cargando && pedidos.length === 0) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">Sincronizando auditoría en vivo...</div>;

    const pedidosFiltradosFinales = pedidosOrdenadosCrono.filter(p => {
        if (['Cancelado', 'Pendiente', 'Por Confirmar'].includes(p.estado_preparacion)) return false;
        if (filtroMetodoPago !== 'Todos' && p.metodo_pago !== filtroMetodoPago) return false;
        if (filtroCliente.trim() !== '') {
            const cliente = (p.cliente_nombre || '').toLowerCase(); const iden = (p.numero_pedido || '').toString();
            if (!cliente.includes(filtroCliente.toLowerCase()) && !iden.includes(filtroCliente.toLowerCase())) return false;
        }
        return true;
    }).sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

    return (
        <div className="space-y-6 animate-in fade-in duration-300 print:m-0 print:p-0 text-slate-800 print:bg-white print:w-full">
            
            {/* 👇 ESTILOS GLOBALES INYECTADOS PARA FORZAR UN PDF PERFECTO Y PAGINADO */}
            <style>{`
                @media print {
                    /* Rompe los bloqueos de scroll de los paneles administradores */
                    body, html, #root, main, .overflow-y-auto, .overflow-hidden, .h-screen {
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                    }
                    /* Oculta barras laterales y menús de navegación */
                    nav, aside, header {
                        display: none !important;
                    }
                    /* Formato de Hoja Carta (Letter) */
                    @page {
                        size: letter portrait;
                        margin: 1.5cm;
                    }
                    /* Fuerza la impresión a color exacta */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Evita que los recuadros se corten a la mitad entre hojas */
                    .print-break-avoid {
                        break-inside: avoid;
                        page-break-inside: avoid;
                        margin-bottom: 24px !important;
                    }
                }
            `}</style>

            <div className="hidden print:block text-center mb-6 pt-4 w-full">
                <h1 className="text-3xl font-black text-slate-900 uppercase">Auditoría Financiera de Caja</h1>
                <p className="text-slate-500 font-bold mt-1 text-sm">Fecha Analizada: {fechaFiltro} | Rango: {corteSeleccionadoId === 'global' ? 'DÍA COMPLETO (GLOBAL)' : 'TURNO ESPECÍFICO'}</p>
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
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                    <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors cursor-pointer w-full sm:w-auto">
                        <option value="dia">Por Día</option><option value="mes">Por Mes</option><option value="anio">Por Año</option>
                    </select>
                    {periodo === 'dia' && <input type="date" value={fechaFiltro} max={hoyStr} onChange={(e) => setFechaFiltro(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors w-full sm:w-auto" />}
                    {periodo === 'mes' && <input type="month" value={fechaFiltro.substring(0, 7)} onChange={(e) => setFechaFiltro(`${e.target.value}-01`)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors w-full sm:w-auto" />}
                    {periodo === 'anio' && <input type="number" min="2020" max="2099" value={fechaFiltro.substring(0, 4)} onChange={(e) => setFechaFiltro(`${e.target.value}-01-01`)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors w-24 text-center" />}
                    
                    {/* 👇 NUEVO BOTÓN FORMAL DE DESCARGA PDF */}
                    <button
                        onClick={() => window.print()}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/30 flex justify-center items-center gap-2 transition active:scale-95 whitespace-nowrap"
                    >
                        <Printer size={18} />
                        Descargar PDF
                    </button>
                </div>
            </div>

            <TurnosCaja 
                periodo={periodo} cortesDelDia={cortesDelDia} 
                corteSeleccionadoId={corteSeleccionadoId} setCorteSeleccionadoId={setCorteSeleccionadoId} 
            />

            <div className="print-break-avoid">
                <CajaPrincipal 
                    formaterMoneda={formaterMoneda} totalVentasBrutas={totalVentasBrutas} tDescuentos={tDescuentos} 
                    totalFondoGlobal={totalFondoGlobal} fondosAdicionales={fondosAdicionales} 
                    corteSeleccionadoId={corteSeleccionadoId} cortesDelDia={cortesDelDia} 
                    setModalFondosAbierto={setModalFondosAbierto} totalEfectivoDia={totalEfectivoDia} 
                    gastosCompras={gastosCompras} efectivoEsperadoCaja={efectivoEsperadoCaja} 
                    efectivoDeclaradoCaja={efectivoDeclaradoCaja} isPerfecto={isPerfecto} 
                    isFaltante={isFaltante} isSobrante={isSobrante} diferenciaAuditoria={diferenciaAuditoria}
                    efectivoEntregadoTotal={efectivoEntregadoTotal} efectivoEnCajaTotal={efectivoEnCajaTotal} 
                />
            </div>

            <div className="print-break-avoid">
                <Repartidores 
                    formaterMoneda={formaterMoneda} dPlatillos={dPlatillos} dExtras={dExtras} dEnvio={dEnvio} 
                    fondoRepartidor={fondoRepartidor} dEfectivo={dEfectivo} dTarjeta={dTarjeta} 
                    dTransf={dTransf} efectivoEsperadoMotos={efectivoEsperadoMotos} 
                />
            </div>

            {/* EN IMPRESIÓN, LOS PONEMOS UNO DEBAJO DEL OTRO PARA QUE NO SE APLASTEN */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start print:flex print:flex-col print:gap-6 print:w-full">
                <div className="print-break-avoid print:w-full h-full">
                    <PagosDigitales 
                        formaterMoneda={formaterMoneda} totalDigital={totalDigital} 
                        totalTarjetas={totalTarjetas} totalTransferencias={totalTransferencias} 
                    />
                </div>
                
                <div className="print-break-avoid print:w-full h-full">
                    <CuadreGlobal 
                        formaterMoneda={formaterMoneda} fondoCaja={fondoCaja} totalEfectivoDia={totalEfectivoDia} 
                        gastosCompras={gastosCompras} efectivoEntregadoTotal={efectivoEntregadoTotal} 
                        efectivoEnCajaTotal={efectivoEnCajaTotal} isPerfecto={isPerfecto} isFaltante={isFaltante} 
                        isSobrante={isSobrante} diferenciaAuditoria={diferenciaAuditoria} cortesDelDia={cortesDelDia} 
                        corteSeleccionadoId={corteSeleccionadoId} setModalFondosAbierto={setModalFondosAbierto} 
                        fondosAdicionales={fondosAdicionales} totalVentasBrutas={totalVentasBrutas} 
                        tDescuentos={tDescuentos} totalIngresoNetoReal={totalIngresoNetoReal} 
                        descuentosEfectivo={tDescuentosEfectivo}
                    />
                </div>
            </div>

            <div className="print-break-avoid">
                <AuditoriaIndividual 
                    corteSeleccionadoId={corteSeleccionadoId} cortesDelDia={cortesDelDia} formaterMoneda={formaterMoneda} 
                />
            </div>

            <div className="print-break-avoid">
                <OrdenesRegistradas 
                    pedidosFiltradosFinales={pedidosFiltradosFinales} pedidoSeleccionado={pedidoSeleccionado} 
                    setPedidoSeleccionado={setPedidoSeleccionado} filtroCliente={filtroCliente} 
                    setFiltroCliente={setFiltroCliente} filtroMetodoPago={filtroMetodoPago} 
                    setFiltroMetodoPago={setFiltroMetodoPago} formaterMoneda={formaterMoneda} 
                />
            </div>

            {modalFondosAbierto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Fondos de Caja</h3>
                                <p className="text-xs font-bold text-slate-500">Selecciona qué fondos sumar a la cuenta global</p>
                            </div>
                            <button onClick={() => setModalFondosAbierto(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                            {cortesDelDia.map((c, i) => {
                                const isSelected = fondosSeleccionados.includes(c.id);
                                return (
                                    <div key={c.id} onClick={() => setFondosSeleccionados(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} className={`flex justify-between items-center p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 ${isSelected ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-blue-300'}`}>
                                        <div className="flex items-center gap-3">
                                            {isSelected ? <CheckSquare className="text-blue-600" size={22}/> : <Square className="text-slate-300" size={22}/>}
                                            <div>
                                                <p className={`font-black text-sm ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>Turno {i + 1}: {c.usuario_nombre}</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Fondo Declarado</p>
                                            </div>
                                        </div>
                                        <span className={`text-lg font-black ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>{formaterMoneda(c.fondo_inicial || 0)}</span>
                                    </div>
                                )
                            })}
                        </div>
                        <button onClick={() => setModalFondosAbierto(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-lg shadow-blue-500/30 active:scale-95 flex justify-center items-center gap-2"><CheckSquare size={20} /> Aplicar al Cuadre Global</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VistaCortesHistorico;