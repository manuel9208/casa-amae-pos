import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { CalendarDays, X, CheckSquare, Square, LayoutGrid, ListTree, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { apiFetch } from '../../../utils/apiFetch';


// Importación de Módulos (Hijos)
import TurnosCaja from './corte/TurnosCaja';
import CajaPrincipal from './corte/CajaPrincipal';
import Repartidores from './corte/Repartidores';
import PagosDigitales from './corte/PagosDigitales';
import CuadreGlobal from './corte/CuadreGlobal';
import AuditoriaIndividual from './corte/AuditoriaIndividual';
import OrdenesRegistradas from './corte/OrdenesRegistradas';
// 🆕 Vista Resumen + Exportación real (PDF/CSV) de Cortes
import CorteResumen from './corte/CorteResumen';
import { generarPDFCorte, generarCSVCorte } from './utils/exportadorCortes';

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

// 🆕 Función pura que replica EXACTAMENTE la matemática de ventas ya usada en el
// render principal. Se usa para calcular totales en 2 escenarios donde el estado
// de pantalla (corteSeleccionadoId) NO debe influir: (1) Totales "Globales" para
// exportar — siempre el día completo, sin importar qué Turno esté activo en
// pantalla — y (2) Totales de CADA turno individual para el PDF/CSV.
const calcularTotalesDeVentas = (listaPedidos) => {
    let lEfectivo = 0, lTarjeta = 0, lTransf = 0, dEfectivo = 0, dTarjeta = 0, dTransf = 0, tEnvio = 0, dEnvio = 0;
    let tPlatillos = 0, tExtras = 0, dPlatillos = 0, dExtras = 0, tDescuentos = 0, tDescuentosEfectivo = 0;

    listaPedidos.forEach(p => {
        if (['Cancelado', 'Pendiente', 'Por Confirmar'].includes(p.estado_preparacion)) return;
        let metodoPagoReal = p.metodo_pago;
        if (['Pendiente', 'Por Cobrar'].includes(metodoPagoReal)) return;

        const isComedor = p.metodo_pago === 'Comida Personal';
        const isDomicilio = p.tipo_consumo === 'Domicilio';

        let efe = 0, tar = 0, tra = 0;
        if (metodoPagoReal === 'Efectivo') efe += parseMoney(p.total);
        if (metodoPagoReal === 'Tarjeta') tar += parseMoney(p.total);
        if (metodoPagoReal === 'Transferencia') tra += parseMoney(p.total);

        if (metodoPagoReal === 'Mixto' && p.pagos_mixtos) {
            try {
                let pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos;
                if (typeof pm === 'string') pm = JSON.parse(pm);
                if (Array.isArray(pm)) {
                    pm.forEach(x => {
                        if (x.metodo === 'Efectivo') efe += parseMoney(x.monto);
                        if (x.metodo === 'Tarjeta') tar += parseMoney(x.monto);
                        if (x.metodo === 'Transferencia') tra += parseMoney(x.monto);
                    });
                }
            } catch (e) { }
        }

        if (isDomicilio) {
            dEfectivo += efe; dTarjeta += tar; dTransf += tra;
            dEnvio += parseMoney(p.costo_envio); tEnvio += parseMoney(p.costo_envio);
        } else {
            lEfectivo += efe; lTarjeta += tar; lTransf += tra;
            tEnvio += parseMoney(p.costo_envio);
        }

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

    return { lEfectivo, lTarjeta, lTransf, dEfectivo, dTarjeta, dTransf, tEnvio, dEnvio, tPlatillos, tExtras, dPlatillos, dExtras, tDescuentos, tDescuentosEfectivo };
};

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

    // 🆕 Toggle de vista: "resumen" (default) vs "detallado" (vista completa ya existente)
    const [vistaCorte, setVistaCorte] = useState('resumen');
    const [exportandoPDF, setExportandoPDF] = useState(false);

    const cargarAuditoriaCompleta = useCallback(async () => {
        setCargando(true);
        try {
            const [resPed, resCorte, resCompras, resUsu] = await Promise.all([
               apiFetch(`${apiUrl}/pedidos/historial?periodo=${periodo}&fecha=${fechaFiltro}`),
                periodo === 'dia' ?apiFetch(`${apiUrl}/cortes/historial?fecha=${fechaFiltro}&completo=true`) : Promise.resolve({ ok: false }),
               apiFetch(`${apiUrl}/insumos/compras/reporte?periodo=${periodo}&fecha=${fechaFiltro}`),
               apiFetch(`${apiUrl}/usuarios`)
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

    useEffect(() => {
        if (cortesDelDia && cortesDelDia.length > 0) {
            setFondosSeleccionados([cortesDelDia[0].id]); 
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
        if (['Pendiente', 'Por Cobrar'].includes(metodoPagoReal)) return;

        const isComedor = p.metodo_pago === 'Comida Personal';
        const isDomicilio = p.tipo_consumo === 'Domicilio';  

        let efe = 0, tar = 0, tra = 0;
        if (metodoPagoReal === 'Efectivo') efe += parseMoney(p.total);
        if (metodoPagoReal === 'Tarjeta') tar += parseMoney(p.total);
        if (metodoPagoReal === 'Transferencia') tra += parseMoney(p.total);
        
        if (metodoPagoReal === 'Mixto' && p.pagos_mixtos) {
            try { 
                let pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos; 
                if (typeof pm === 'string') pm = JSON.parse(pm);

                if (Array.isArray(pm)) {
                    pm.forEach(x => {
                        if (x.metodo === 'Efectivo') efe += parseMoney(x.monto);
                        if (x.metodo === 'Tarjeta') tar += parseMoney(x.monto);
                        if (x.metodo === 'Transferencia') tra += parseMoney(x.monto);
                    });
                }
            } catch (e) { console.error("Dato corrupto mixto evadido:", e); }
        }  

        if (isDomicilio) { 
            dEfectivo += efe; dTarjeta += tar; dTransf += tra; 
            dEnvio += parseMoney(p.costo_envio); tEnvio += parseMoney(p.costo_envio); 
        }
        else { 
            lEfectivo += efe; lTarjeta += tar; lTransf += tra; 
            tEnvio += parseMoney(p.costo_envio); 
        }  

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
        
        // 👇 FIX MÁSTER APLICADO: Filtramos las compras que vienen del Panel Admin para no descontarlas del cajón físico de Caja.
        gastosCompras = compras
            .filter(c => c.origen !== 'Admin')
            .reduce((s, c) => s + Number(c.costo_total || 0), 0);
        
        if (cortesDelDia.length > 0) {
            fondoCaja = cortesDelDia.filter(c => fondosSeleccionados.includes(c.id)).reduce((s, c) => s + Number(c.fondo_inicial || 0), 0);
            fondosAdicionales = cortesDelDia.filter(c => !fondosSeleccionados.includes(c.id)).reduce((s, c) => s + Number(c.fondo_inicial || 0), 0);
            efectivoEntregadoTotal = cortesDelDia.reduce((s, c) => s + Number(c.efectivo_entregado || 0), 0);
            efectivoEnCajaTotal = Number(cortesDelDia[cortesDelDia.length - 1].efectivo_en_caja || 0);
            efectivoDeclaradoCaja = efectivoEntregadoTotal + efectivoEnCajaTotal;
        } else {
            fondoCaja = usuarios.reduce((s, u) => s + Number(u.fondo_actual || 0), 0);
        }

        fondoRepartidor = cortesDelDia.reduce((s, c) => s + Number(c.fondo_repartidor || 0), 0);
    } else {
        const cAct = cortesDelDia.find(c => String(c.id) === String(corteSeleccionadoId));
        if (cAct) {
            fondoCaja = Number(cAct.fondo_inicial || 0); fondoRepartidor = Number(cAct.fondo_repartidor || 0);
            gastosCompras = Number(cAct.total_gastos || 0); efectivoDeclaradoCaja = Number(cAct.efectivo_cajon || 0);
            efectivoEntregadoTotal = Number(cAct.efectivo_entregado || 0); efectivoEnCajaTotal = Number(cAct.efectivo_en_caja || 0);
        }
    }

    const totalEfectivoDia = lEfectivo + dEfectivo; 
    const totalFondoGlobal = fondoCaja + fondoRepartidor;
    const totalVentasBrutas = tPlatillos + tExtras + tEnvio; 
    const totalIngresoNetoReal = totalVentasBrutas - tDescuentos - gastosCompras;
    const efectivoEsperadoCaja = fondoCaja + totalEfectivoDia - gastosCompras; 
    const efectivoEsperadoMotos = fondoRepartidor + dEfectivo;
    
    const diferenciaAuditoria = efectivoEsperadoCaja - efectivoDeclaradoCaja;
    const isFaltante = diferenciaAuditoria > 0; const isSobrante = diferenciaAuditoria < 0; const isPerfecto = diferenciaAuditoria === 0;

    const totalTarjetas = lTarjeta + dTarjeta; 
    const totalTransferencias = lTransf + dTransf; 
    const totalDigital = totalTarjetas + totalTransferencias;

    // 🆕 Totales SIEMPRE "Globales" (día completo), ignorando qué Turno esté
    // seleccionado en pantalla — usados EXCLUSIVAMENTE para exportar PDF/CSV,
    // que por especificación siempre debe mostrar el detalle completo del día.
    const totalesGlobalesExport = useMemo(() => {
        const v = calcularTotalesDeVentas(pedidos);
        const gastosGlobal = compras.filter(c => c.origen !== 'Admin').reduce((s, c) => s + Number(c.costo_total || 0), 0);

        let fondoCajaG = 0, fondoRepartidorG = 0, efectivoDeclaradoG = 0, efectivoEntregadoG = 0, efectivoEnCajaG = 0;
        if (cortesDelDia.length > 0) {
            fondoCajaG = cortesDelDia.reduce((s, c) => s + Number(c.fondo_inicial || 0), 0);
            efectivoEntregadoG = cortesDelDia.reduce((s, c) => s + Number(c.efectivo_entregado || 0), 0);
            efectivoEnCajaG = Number(cortesDelDia[cortesDelDia.length - 1].efectivo_en_caja || 0);
            efectivoDeclaradoG = efectivoEntregadoG + efectivoEnCajaG;
            fondoRepartidorG = cortesDelDia.reduce((s, c) => s + Number(c.fondo_repartidor || 0), 0);
        } else {
            fondoCajaG = usuarios.reduce((s, u) => s + Number(u.fondo_actual || 0), 0);
        }

        const totalEfectivoDiaG = v.lEfectivo + v.dEfectivo;
        const totalFondoGlobalG = fondoCajaG + fondoRepartidorG;
        const totalVentasBrutasG = v.tPlatillos + v.tExtras + v.tEnvio;
        const totalIngresoNetoRealG = totalVentasBrutasG - v.tDescuentos - gastosGlobal;
        const efectivoEsperadoCajaG = fondoCajaG + totalEfectivoDiaG - gastosGlobal;
        const efectivoEsperadoMotosG = fondoRepartidorG + v.dEfectivo;
        const diferenciaAuditoriaG = efectivoEsperadoCajaG - efectivoDeclaradoG;
        const totalTarjetasG = v.lTarjeta + v.dTarjeta;
        const totalTransferenciasG = v.lTransf + v.dTransf;

        return {
            totalVentasBrutas: totalVentasBrutasG, tDescuentos: v.tDescuentos, totalFondoGlobal: totalFondoGlobalG,
            totalEfectivoDia: totalEfectivoDiaG, gastosCompras: gastosGlobal,
            efectivoEsperadoCaja: efectivoEsperadoCajaG, efectivoDeclaradoCaja: efectivoDeclaradoG,
            efectivoEntregadoTotal: efectivoEntregadoG, efectivoEnCajaTotal: efectivoEnCajaG,
            isPerfecto: diferenciaAuditoriaG === 0, isFaltante: diferenciaAuditoriaG > 0, isSobrante: diferenciaAuditoriaG < 0,
            diferenciaAuditoria: diferenciaAuditoriaG,
            dPlatillos: v.dPlatillos, dExtras: v.dExtras, dEnvio: v.dEnvio, fondoRepartidor: fondoRepartidorG,
            dEfectivo: v.dEfectivo, dTarjeta: v.dTarjeta, dTransf: v.dTransf, efectivoEsperadoMotos: efectivoEsperadoMotosG,
            totalTarjetas: totalTarjetasG, totalTransferencias: totalTransferenciasG, totalDigital: totalTarjetasG + totalTransferenciasG,
            totalIngresoNetoReal: totalIngresoNetoRealG
        };
    }, [pedidos, cortesDelDia, compras, usuarios]);

    // 🆕 Desglose por Turno (Caja 1, Caja 2...) para el PDF/CSV — Opción B confirmada:
    // Fondo Inicial, Ventas Brutas, Descuentos, Gastos, Efectivo Esperado/Declarado y Diferencia.
    const desglosePorTurno = useMemo(() => {
        if (!cortesDelDia || cortesDelDia.length === 0) return [];
        return cortesDelDia.map((c, i) => {
            const ids = typeof c.pedidos_incluidos === 'string' ? JSON.parse(c.pedidos_incluidos || '[]') : (c.pedidos_incluidos || []);
            const pedidosDeEsteTurno = pedidos.filter(p => ids.includes(p.id));
            const v = calcularTotalesDeVentas(pedidosDeEsteTurno);

            const fIni = Number(c.fondo_inicial || 0);
            const iEfe = Number(c.total_efectivo || 0);
            const gas = Number(c.total_gastos || 0);
            const decl = Number(c.efectivo_cajon || 0);
            const eEnt = Number(c.efectivo_entregado || 0);
            const eCaj = Number(c.efectivo_en_caja || 0);
            const ventasBrutas = v.tPlatillos + v.tExtras + v.tEnvio;
            const efectivoEsperado = fIni + iEfe - gas;
            const diferencia = efectivoEsperado - decl;

            return {
                numeroTurno: i + 1, usuario: c.usuario_nombre || 'Cajero',
                fondoInicial: fIni, ventasBrutas, descuentos: v.tDescuentos, ventasEfectivo: iEfe,
                gastos: gas, efectivoEsperado, efectivoDeclarado: decl,
                efectivoEntregado: eEnt, efectivoEnCaja: eCaj, diferencia
            };
        });
    }, [cortesDelDia, pedidos]);

    // 🆕 Exportación real (PDF/CSV) — SIEMPRE con el detalle completo del DÍA
    // (Global + cada Caja/Turno), sin importar la pestaña activa en pantalla.
    const handleExportarPDF = async () => {
        setExportandoPDF(true);
        try {
            await generarPDFCorte({
                apiUrl, fechaFiltro, periodo, formaterMoneda,
                datosGlobales: totalesGlobalesExport, desglosePorTurno
            });
        } catch (error) {
            console.error("Error generando PDF de Corte:", error);
        } finally {
            setExportandoPDF(false);
        }
    };

    const handleExportarCSV = () => {
        generarCSVCorte({
            fechaFiltro, periodo, formaterMoneda,
            datosGlobales: totalesGlobalesExport, desglosePorTurno
        });
    };

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
            <style>{`
                @media print {
                    body, html, #root, main, .overflow-y-auto, .overflow-hidden, .h-screen {
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                    }
                    nav, aside, header { display: none !important; }
                    @page { size: letter portrait; margin: 1.5cm; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .print-break-avoid { break-inside: avoid; page-break-inside: avoid; margin-bottom: 24px !important; }
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

                    {/* 🆕 Toggle Resumen / Detallado — Resumen es la vista por defecto */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
                        <button
                            onClick={() => setVistaCorte('resumen')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 ${vistaCorte === 'resumen' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid size={16} /> Resumen
                        </button>
                        <button
                            onClick={() => setVistaCorte('detallado')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 ${vistaCorte === 'detallado' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ListTree size={16} /> Detallado
                        </button>
                    </div>

                    <button
                        disabled={exportandoPDF}
                        onClick={handleExportarPDF}
                        title="Genera un PDF con el detalle completo: Global + cada Caja/Turno"
                        className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-black px-5 py-2.5 rounded-xl shadow-md flex justify-center items-center gap-2 transition active:scale-95 whitespace-nowrap disabled:opacity-50"
                    >
                        {exportandoPDF ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                        {exportandoPDF ? 'Generando...' : 'Exportar PDF'}
                    </button>

                    <button
                        onClick={handleExportarCSV}
                        title="Descarga el detalle completo en CSV (Excel)"
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-xl shadow-md flex justify-center items-center gap-2 transition active:scale-95 whitespace-nowrap"
                    >
                        <FileSpreadsheet size={18} /> Exportar CSV
                    </button>
                </div>
            </div>

            <TurnosCaja 
                periodo={periodo} cortesDelDia={cortesDelDia} 
                corteSeleccionadoId={corteSeleccionadoId} setCorteSeleccionadoId={setCorteSeleccionadoId} 
            />

            {vistaCorte === 'resumen' ? (
                <CorteResumen
                    formaterMoneda={formaterMoneda}
                    totalVentasBrutas={totalVentasBrutas}
                    totalEfectivoDia={totalEfectivoDia}
                    totalTarjetas={totalTarjetas}
                    totalTransferencias={totalTransferencias}
                    gastosCompras={gastosCompras}
                    totalFondoGlobal={totalFondoGlobal}
                />
            ) : (
                <>
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
                            apiUrl={apiUrl}
                        />
                    </div>
                </>
            )}

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