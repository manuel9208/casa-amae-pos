import React, { useState, useEffect } from 'react';  

import CorteCajaCiego from './CorteCajaCiego';
import CorteDesglosePrincipal from './CorteDesglosePrincipal';
import CorteDesgloseReparto from './CorteDesgloseReparto';
import CorteDesgloseDigital from './CorteDesgloseDigital';
import CorteResumenCuadre from './CorteResumenCuadre';  

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';  

const getMazatlanDate = (dateString) => {
    if (!dateString) return {};
    const dateObj = new Date(dateString);
    const formatter = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mazatlan', year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = formatter.formatToParts(dateObj);
    let dDay, dMonth, dYear;
    parts.forEach(part => {
        if(part.type === 'day') dDay = part.value;
        if(part.type === 'month') dMonth = part.value;
        if(part.type === 'year') dYear = part.value;
    });
    return { localDateStr: `${dYear}-${dMonth}-${dDay}` };
};  

const CorteCajaFinanciero = (props) => {
    const { totalGastos, fondoCaja, fondoRepartidor, user: userProp } = props;  

    let currentUser = userProp;
    if (!currentUser) {
        try {
            const sessionData = localStorage.getItem('pos_sesion');
            if (sessionData) currentUser = JSON.parse(sessionData).data;
        } catch(e) {}
    }  

    const hoyStr = new Date().toISOString().split('T')[0];  

    const [fechaFiltro, setFechaFiltro] = useState(hoyStr);
    const [cargando, setCargando] = useState(false);
    const [pedidos, setPedidos] = useState([]);
    const [datosHistoricos, setDatosHistoricos] = useState(null);
    const [efectivoManual, setEfectivoManual] = useState('');
    const [guardandoCorte, setGuardandoCorte] = useState(false);
    const [fondoManual, setFondoManual] = useState(fondoCaja || '');  
    const [guardandoFondo, setGuardandoFondo] = useState(false); // 👈 Nuevo Estado
    
    const [mathHoy, setMathHoy] = useState({
        lPlatillos: 0, lExtras: 0, lEfectivo: 0, lTarjeta: 0, lTransf: 0,
        dPlatillos: 0, dExtras: 0, dEfectivo: 0, dTarjeta: 0, dTransf: 0, dEnvio: 0,
        tEnvio: 0, tPlatillos: 0, tExtras: 0
    });  

    const esHoy = fechaFiltro === hoyStr;
    const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g,"")) || 0;  

    const isSuperAdmin = String(currentUser?.usuario || '').toLowerCase().trim() === 'admin';
    const rolUser = String(currentUser?.rol || '').toLowerCase().trim();
    const esAdminOGerente = isSuperAdmin || ['admin', 'gerente', 'administrador global'].includes(rolUser);  

    useEffect(() => {
        if (fondoCaja !== undefined && fondoCaja !== null && fondoManual === '') {
            setFondoManual(fondoCaja);
        } else if (datosHistoricos && datosHistoricos.fondo_inicial !== undefined && datosHistoricos.fondo_inicial !== null && fondoManual === '') {
            setFondoManual(datosHistoricos.fondo_inicial);
        }
    }, [fondoCaja, datosHistoricos, fondoManual]);  

    useEffect(() => {
        const cargarDatos = async (esSilencioso = false) => {
            if (!esSilencioso) setCargando(true);
            try {
                const resPed = await fetch(`${apiUrl}/pedidos/historial?periodo=dia&fecha=${fechaFiltro}`);
                if(resPed.ok) {
                    let data = await resPed.json();
                    data = data.filter(p => {
                        if (!p.fecha_creacion) return false;
                        const { localDateStr } = getMazatlanDate(p.fecha_creacion);
                        return localDateStr === fechaFiltro;
                    });
                    setPedidos(data);
                }
                const resCorte = await fetch(`${apiUrl}/cortes/historial?fecha=${fechaFiltro}`);
                if(resCorte.ok) setDatosHistoricos(await resCorte.json());
                else setDatosHistoricos(null);
            } catch(e) { setDatosHistoricos(null); }
            if (!esSilencioso) setCargando(false);
        };  
        cargarDatos(false);
        let int;
        if(esHoy) int = setInterval(() => cargarDatos(true), 3000);
        return () => clearInterval(int);
    }, [fechaFiltro, esHoy]);  

    useEffect(() => {
        let lEfe=0, lTar=0, lTra=0, lPla=0, lExt=0;
        let dEfe=0, dTar=0, dTra=0, dPla=0, dExt=0, dEnv=0;
        let tEnv=0, tPla=0, tExt=0;  

        pedidos.forEach(p => {
            if(['Cancelado', 'Pendiente', 'Por Confirmar'].includes(p.estado_preparacion)) return;
            if(['Pendiente', 'Por Cobrar'].includes(p.metodo_pago)) return;  
            const isComedor = p.metodo_pago === 'Comida Personal';
            const isDomicilio = p.tipo_consumo === 'Domicilio';  
            
            let efe=0, tar=0, tra=0;
            if (p.metodo_pago === 'Efectivo') efe += parseMoney(p.total);
            if (p.metodo_pago === 'Tarjeta') tar += parseMoney(p.total);
            if (p.metodo_pago === 'Transferencia') tra += parseMoney(p.total);  

            if (p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
                let pm = []; try{ pm=typeof p.pagos_mixtos==='string'?JSON.parse(p.pagos_mixtos):p.pagos_mixtos; }catch(e){}
                pm.forEach(x => {
                    if(x.metodo==='Efectivo') efe += parseMoney(x.monto);
                    if(x.metodo==='Tarjeta') tar += parseMoney(x.monto);
                    if(x.metodo==='Transferencia') tra += parseMoney(x.monto);
                });
            }  

            if (isDomicilio) { dEfe += efe; dTar += tar; dTra += tra; dEnv += parseMoney(p.costo_envio); tEnv += parseMoney(p.costo_envio); }
            else { lEfe += efe; lTar += tar; lTra += tra; tEnv += parseMoney(p.costo_envio); }  

            let car = [];
            if (Array.isArray(p.carrito)) car = p.carrito;
            else if (typeof p.carrito === 'string') { try { car = JSON.parse(p.carrito); } catch(e) {} }  
            
            car.forEach(i => {
                const qty = parseMoney(i.cantidad) || 1;
                let exP = 0;
                if(Array.isArray(i.extras)) {
                    i.extras.forEach(e => {
                        const eNameLower = (e.nombre || '').trim().toLowerCase();
                        let isRealExtra = true;
                        if (eNameLower.includes('nota:') || eNameLower.includes('📝') || eNameLower.startsWith('sin ') || eNameLower.includes(' ❌') || eNameLower.startsWith('❌')) isRealExtra = false;
                        else if (eNameLower.includes('sabor:') || eNameLower.includes('tamaño:') || eNameLower.includes('🔸') || eNameLower.includes('🔹') || e.tipo === 'variacion') isRealExtra = false;
                        if (isRealExtra) exP += parseMoney(e.precioExtra || e.precio_extra || e.precio || 0);
                    });
                }
                if (!isComedor) {
                    const calcExtra = (exP * qty);
                    let calcBase = parseMoney(i.precioFinal || i.precio_base || i.precio) - exP;
                    if (calcBase < 0) calcBase = 0;
                    const calcPlat = (calcBase * qty);  
                    tExt += calcExtra; tPla += calcPlat;
                    if (isDomicilio) { dExt += calcExtra; dPla += calcPlat; }
                    else { lExt += calcExtra; lPla += calcPlat; }
                }
            });
        });  

        setMathHoy({
            lPlatillos: lPla, lExtras: lExt, lEfectivo: lEfe, lTarjeta: lTar, lTransf: lTra,
            dPlatillos: dPla, dExtras: dExt, dEfectivo: dEfe, dTarjeta: dTar, dTransf: dTra, dEnvio: dEnv,
            tEnvio: tEnv, tPlatillos: tPla, tExtras: tExt
        });
    }, [pedidos]);  

    // 👇 SOLUCIÓN: Botón Manual Exclusivo para asegurar que se guarde EXACTO el fondo
    const guardarFondoManualBD = async (montoVal) => {
        if (!esHoy || !esAdminOGerente) return;
        try {
            setGuardandoFondo(true);
            const montoNeto = Number(montoVal) || 0;
            await fetch(`${apiUrl}/cortes`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha: hoyStr,
                    usuario_id: currentUser?.id || null,
                    fondo_inicial: montoNeto,
                    fondo_repartidor: fondoRepartidor || 0,
                    venta_platillos: mathHoy.tPlatillos,
                    ingresos_extras: mathHoy.tExtras,
                    cargos_envio: mathHoy.tEnvio,
                    total_efectivo: mathHoy.lEfectivo + mathHoy.dEfectivo,
                    total_tarjeta: mathHoy.lTarjeta + mathHoy.dTarjeta,
                    total_transferencia: mathHoy.lTransf + mathHoy.dTransf,
                    total_gastos: totalGastos,
                    efectivo_cajon: (montoNeto + (Number(fondoRepartidor)||0) + mathHoy.lEfectivo + mathHoy.dEfectivo) - (Number(totalGastos) || 0),
                    detalles_envio: {
                        platillos: mathHoy.dPlatillos, extras: mathHoy.dExtras, envio: mathHoy.dEnvio,
                        efectivo: mathHoy.dEfectivo, tarjeta: mathHoy.dTarjeta, transf: mathHoy.dTransf
                    }
                })
            });
        } catch (error) {}
        setGuardandoFondo(false);
    };

    const handleCierreCajaCiego = async (e) => {
        e.preventDefault();
        const efectivoNum = parseFloat(efectivoManual);
        const fondoNum = esAdminOGerente ? parseFloat(fondoManual) : parseFloat(fondoCaja || datosHistoricos?.fondo_inicial || 0);  

        if (isNaN(efectivoNum) || efectivoNum < 0) {
            alert("Por favor ingresa una cantidad válida de efectivo.");
            return;
        }  

        setGuardandoCorte(true);
        try {
            const res = await fetch(`${apiUrl}/cortes`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha: hoyStr,
                    usuario_id: currentUser?.id || null,
                    fondo_inicial: fondoNum,
                    fondo_repartidor: fondoRepartidor || 0,
                    venta_platillos: mathHoy.tPlatillos,
                    ingresos_extras: mathHoy.tExtras,
                    cargos_envio: mathHoy.tEnvio,
                    total_efectivo: mathHoy.lEfectivo + mathHoy.dEfectivo,
                    total_tarjeta: mathHoy.lTarjeta + mathHoy.dTarjeta,
                    total_transferencia: mathHoy.lTransf + mathHoy.dTransf,
                    total_gastos: totalGastos,
                    efectivo_cajon: efectivoNum,
                    detalles_envio: {
                        platillos: mathHoy.dPlatillos, extras: mathHoy.dExtras, envio: mathHoy.dEnvio,
                        efectivo: mathHoy.dEfectivo, tarjeta: mathHoy.dTarjeta, transf: mathHoy.dTransf
                    }
                })
            });  

            if (res.ok) {
                localStorage.removeItem(`fondo_caja_${currentUser?.id}_${hoyStr}`);
                if (props.onLogout) props.onLogout();
                else window.location.reload();
            } else {
                alert("Ocurrió un error al procesar el cierre. Inténtalo de nuevo.");
            }
        } catch (error) {}
        setGuardandoCorte(false);
    };  

    const pFondoCaja = esHoy ? (Number(fondoManual) || 0) : Number(datosHistoricos?.fondo_inicial || datosHistoricos?.fondo_caja || 0);
    const pTotalGastos = esHoy ? (Number(totalGastos) || 0) : Number(datosHistoricos?.total_gastos || 0);
    const pFondoRepartidor = esHoy ? (Number(fondoRepartidor) || 0) : Number(datosHistoricos?.fondo_repartidor || 0);  

    const efectivoEsperadoCaja = (pFondoCaja + mathHoy.lEfectivo) - pTotalGastos;
    const efectivoEsperadoMotos = (pFondoRepartidor + mathHoy.dEfectivo);
    const totalEfectivoFisico = efectivoEsperadoCaja + efectivoEsperadoMotos;
    const totalDigital = mathHoy.lTarjeta + mathHoy.lTransf + mathHoy.dTarjeta + mathHoy.dTransf;
    const totalVentasGlobales = mathHoy.tPlatillos + mathHoy.tExtras + mathHoy.tEnvio;  

    if (!esAdminOGerente) {
        return (
            <CorteCajaCiego
                handleCierreCajaCiego={handleCierreCajaCiego} efectivoManual={efectivoManual}
                setEfectivoManual={setEfectivoManual} guardandoCorte={guardandoCorte} currentUser={currentUser}
            />
        );
    }  

    return (
        <div className="animate-in fade-in pb-20 w-full h-full">  
            <CorteDesglosePrincipal
                currentUser={currentUser} fechaFiltro={fechaFiltro} setFechaFiltro={setFechaFiltro}
                hoyStr={hoyStr} esHoy={esHoy} cargando={cargando} mathHoy={mathHoy}
                fondoManual={fondoManual} setFondoManual={setFondoManual} pFondoCaja={pFondoCaja}
                pTotalGastos={pTotalGastos} efectivoEsperadoCaja={efectivoEsperadoCaja}
                guardarFondoManualBD={guardarFondoManualBD} guardandoFondo={guardandoFondo}
            />  
            {!cargando && (
                <>
                    <CorteDesgloseReparto
                        mathHoy={mathHoy} pFondoRepartidor={pFondoRepartidor} efectivoEsperadoMotos={efectivoEsperadoMotos}
                    />  
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in slide-in-from-bottom-8 duration-300">
                        <CorteDesgloseDigital mathHoy={mathHoy} />  
                        <CorteResumenCuadre
                            totalEfectivoFisico={totalEfectivoFisico} totalDigital={totalDigital} totalVentasGlobales={totalVentasGlobales}
                        />
                    </div>
                </>
            )}
        </div>
    );
};  

export default CorteCajaFinanciero;