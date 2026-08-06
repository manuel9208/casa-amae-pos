import React, { useState, useEffect } from 'react';
import CorteCajaCiego from './CorteCajaCiego';
import CorteDesglosePrincipal from './CorteDesglosePrincipal';
import CorteDesgloseReparto from './CorteDesgloseReparto';
import CorteDesgloseDigital from './CorteDesgloseDigital';
import CorteResumenCuadre from './CorteResumenCuadre';  

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';  

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

  const hoyStr = getLocalHoyStr();
  const [fechaFiltro, setFechaFiltro] = useState(hoyStr);
  const [cargando, setCargando] = useState(false);
  const [pedidosGlobales, setPedidosGlobales] = useState([]);
  const [datosHistoricos, setDatosHistoricos] = useState([]);
  
  // NUEVOS ESTADOS SEPARADOS (Reemplazan a efectivoManual)
  const [efectivoEntregar, setEfectivoEntregar] = useState('');
  const [efectivoDejar, setEfectivoDejar] = useState('');
  
  const [guardandoCorte, setGuardandoCorte] = useState(false);
  const [fondoManual, setFondoManual] = useState(fondoCaja || '');
  const [guardandoFondo, setGuardandoFondo] = useState(false);  

  // ESTADO PARA ALERTAS CUSTOM (Sustituye alert() nativo)
  const [errorMsg, setErrorMsg] = useState(null);

  const [mathHoy, setMathHoy] = useState({
    lPlatillos: 0, lExtras: 0, lEfectivo: 0, lTarjeta: 0, lTransf: 0, lEnvio: 0,
    dPlatillos: 0, dExtras: 0, dEfectivo: 0, dTarjeta: 0, dTransf: 0, dEnvio: 0,
    tEnvio: 0, tPlatillos: 0, tExtras: 0, tDescuentos: 0,
    pedidos_incluidos: []
  });  

  const esHoy = fechaFiltro === hoyStr;
  const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g,"")) || 0;  

  const isSuperAdmin = String(currentUser?.usuario || '').toLowerCase().trim() === 'admin';
  const rolUser = String(currentUser?.rol || '').toLowerCase().trim();
  const esAdminOGerente = isSuperAdmin || ['admin', 'gerente', 'administrador global'].includes(rolUser);  

  useEffect(() => {
    if (fondoCaja !== undefined && fondoCaja !== null && fondoManual === '') {
      setFondoManual(fondoCaja);
    }
  }, [fondoCaja, fondoManual]);  

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
          setPedidosGlobales(data);
        }  
        const resCorte = await fetch(`${apiUrl}/cortes/historial?fecha=${fechaFiltro}&completo=true`);
        if(resCorte.ok) {
          const dataC = await resCorte.json();
          setDatosHistoricos(Array.isArray(dataC) ? dataC : [dataC]);
        } else setDatosHistoricos([]);
      } catch(e) { setDatosHistoricos([]); }
      if (!esSilencioso) setCargando(false);
    };
    cargarDatos(false);
    let int;
    if(esHoy) int = setInterval(() => cargarDatos(true), 3000);
    return () => clearInterval(int);
  }, [fechaFiltro, esHoy]);  

  useEffect(() => {
    const cortesCerrados = datosHistoricos.filter(c => c.turno_cerrado);
    const idsCobrados = cortesCerrados.flatMap(c => {
      try { return typeof c.pedidos_incluidos === 'string' ? JSON.parse(c.pedidos_incluidos) : (c.pedidos_incluidos || []); }
      catch(e) { return []; }
    });  

    const pedidosDelTurnoActivo = pedidosGlobales.filter(p => !idsCobrados.includes(p.id));  

    let lEfe=0, lTar=0, lTra=0, lPla=0, lExt=0, lEnv=0;
    let dEfe=0, dTar=0, dTra=0, dPla=0, dExt=0, dEnv=0;
    let tEnv=0, tPla=0, tExt=0, totalDescuentos=0;  

    pedidosDelTurnoActivo.forEach(p => {
      if(['Cancelado', 'Pendiente', 'Por Confirmar'].includes(p.estado_preparacion)) return;  
      
      let metodoPagoReal = p.metodo_pago;
      if (['Pendiente', 'Por Cobrar'].includes(metodoPagoReal)) {
        metodoPagoReal = 'Efectivo';
      }  

      const isComedor = metodoPagoReal === 'Comida Personal';
      const isDomicilio = p.tipo_consumo === 'Domicilio';  

      let efe=0, tar=0, tra=0;
      if (metodoPagoReal === 'Efectivo') efe += parseMoney(p.total);
      if (metodoPagoReal === 'Tarjeta') tar += parseMoney(p.total);
      if (metodoPagoReal === 'Transferencia') tra += parseMoney(p.total);  

      if (metodoPagoReal === 'Mixto' && p.pagos_mixtos) {
        let pm = []; try{ pm=typeof p.pagos_mixtos==='string'?JSON.parse(p.pagos_mixtos):p.pagos_mixtos; }catch(e){}
        pm.forEach(x => {
          if(x.metodo==='Efectivo') efe += parseMoney(x.monto);
          if(x.metodo==='Tarjeta') tar += parseMoney(x.monto);
          if(x.metodo==='Transferencia') tra += parseMoney(x.monto);
        });
      }  

      if (isDomicilio) {
        dEfe += efe; dTar += tar; dTra += tra;
        dEnv += parseMoney(p.costo_envio); tEnv += parseMoney(p.costo_envio);
      } else {
        lEfe += efe; lTar += tar; lTra += tra;
        lEnv += parseMoney(p.costo_envio); tEnv += parseMoney(p.costo_envio);
      }  

      let car = [];
      if (Array.isArray(p.carrito)) car = p.carrito;
      else if (typeof p.carrito === 'string') { try { car = JSON.parse(p.carrito); } catch(e) {} }  
      
      car.forEach(i => {
        const qty = parseMoney(i.cantidad) || 1;
        const pBase = parseMoney(i.precioBase || i.precio);
        let subPlatillo = pBase * qty;
        
        let subExtras = 0;
        if (Array.isArray(i.extras)) {
          i.extras.forEach(ex => {
            subExtras += parseMoney(ex.precio || ex.monto || 0);
          });
        }
        
        const totOriginal = subPlatillo + subExtras;
        const totFinal = parseMoney(i.precioFinal) * qty;
        
        let descItem = 0;
        if(totOriginal > totFinal) descItem = totOriginal - totFinal;
        else if (i.descuentoOriginal && !isComedor) descItem = parseMoney(i.descuentoOriginal) * qty;
        
        if (!isComedor) totalDescuentos += descItem;  

        if (isDomicilio) { dPla += subPlatillo; dExt += subExtras; }
        else { lPla += subPlatillo; lExt += subExtras; }
        tPla += subPlatillo; tExt += subExtras;
      });
    });  

    setMathHoy({
      lPlatillos: lPla, lExtras: lExt, lEfectivo: lEfe, lTarjeta: lTar, lTransf: lTra, lEnvio: lEnv,
      dPlatillos: dPla, dExtras: dExt, dEfectivo: dEfe, dTarjeta: dTar, dTransf: dTra, dEnvio: dEnv,
      tEnvio: tEnv, tPlatillos: tPla, tExtras: tExt, tDescuentos: totalDescuentos,
      pedidos_incluidos: pedidosDelTurnoActivo.map(p => p.id)
    });
  }, [pedidosGlobales, datosHistoricos]);  

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
          pedidos_incluidos: mathHoy.pedidos_incluidos,
          detalles_envio: {
            platillos: mathHoy.dPlatillos, extras: mathHoy.dExtras, envio: mathHoy.dEnvio,
            efectivo: mathHoy.dEfectivo, tarjeta: mathHoy.dTarjeta, transf: mathHoy.dTransf
          },
          turno_cerrado: false
        })
      });
    } catch (error) {}
    setGuardandoFondo(false);
  };  

  const mostrarError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  const handleCierreCajaCiego = async (e) => {
    e.preventDefault();
    
    const numEntregar = parseFloat(efectivoEntregar);
    const numDejar = parseFloat(efectivoDejar);
    const totalEfectivoDeclarado = (numEntregar || 0) + (numDejar || 0);

    const turnoAbierto = datosHistoricos.find(c => !c.turno_cerrado && c.usuario_id === currentUser?.id);
    const fondoNum = esAdminOGerente ? parseFloat(fondoManual) : parseFloat(fondoCaja || turnoAbierto?.fondo_inicial || 0);  

    if (isNaN(numEntregar) || numEntregar <= 0 || isNaN(numDejar) || numDejar < 0) {
      mostrarError("Por favor ingresa cantidades válidas para efectuar el cierre.");
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
          
          efectivo_cajon: totalEfectivoDeclarado, 
          efectivo_entregado: numEntregar,        
          efectivo_en_caja: numDejar,             
          
          pedidos_incluidos: mathHoy.pedidos_incluidos,
          detalles_envio: {
            platillos: mathHoy.dPlatillos, extras: mathHoy.dExtras, envio: mathHoy.dEnvio,
            efectivo: mathHoy.dEfectivo, tarjeta: mathHoy.dTarjeta, transf: mathHoy.dTransf
          },
          turno_cerrado: true
        })
      });  

      if (res.ok) {
        if (props.onLogout) props.onLogout();
        else window.location.reload();
      } else {
        mostrarError("Ocurrió un error al procesar el cierre. Inténtalo de nuevo.");
      }
    } catch (error) {
      mostrarError("Fallo de conexión al cerrar turno.");
    }
    setGuardandoCorte(false);
  };  

  const turnoAbierto = datosHistoricos.find(c => !c.turno_cerrado && c.usuario_id === currentUser?.id);  
  
  const pFondoCaja = esHoy ? (Number(fondoManual) || 0) : Number(turnoAbierto?.fondo_inicial || 0);
  const pTotalGastos = esHoy ? (Number(totalGastos) || 0) : Number(turnoAbierto?.total_gastos || 0);
  const pFondoRepartidor = esHoy ? (Number(fondoRepartidor) || 0) : Number(turnoAbierto?.fondo_repartidor || 0);  

  const totalEfectivoDia = mathHoy.lEfectivo + mathHoy.dEfectivo;
  const totalFondoGlobal = pFondoCaja + pFondoRepartidor;
  const totalVentasGlobales = mathHoy.tPlatillos + mathHoy.tExtras + mathHoy.tEnvio;  

  const efectivoEsperadoCaja = totalFondoGlobal + totalEfectivoDia - pTotalGastos;
  const efectivoEsperadoMotos = pFondoRepartidor + mathHoy.dEfectivo;  
  
  const totalDigital = mathHoy.lTarjeta + mathHoy.lTransf + mathHoy.dTarjeta + mathHoy.dTransf;
  
  // SUMAS EN VIVO Y CÁLCULOS HISTÓRICOS PARA LOS DESGLOSES
  const efectivoDeclaradoPrevio = datosHistoricos.filter(c => c.turno_cerrado).reduce((sum, c) => sum + Number(c.efectivo_cajon || 0), 0);
  const totalDeclaradoEnVivo = efectivoDeclaradoPrevio + (Number(efectivoEntregar) || 0) + (Number(efectivoDejar) || 0);  
  
  const historicoEntregado = datosHistoricos.filter(c => c.turno_cerrado).reduce((sum, c) => sum + Number(c.efectivo_entregado || 0), 0);
  const historicoEnCaja = datosHistoricos.filter(c => c.turno_cerrado).reduce((sum, c) => sum + Number(c.efectivo_en_caja || 0), 0);
  const totalEntregadoEnVivo = historicoEntregado + (Number(efectivoEntregar) || 0);
  const totalEnCajaEnVivo = historicoEnCaja + (Number(efectivoDejar) || 0);

  if (!esAdminOGerente) {
    return (
      <CorteCajaCiego
        handleCierreCajaCiego={handleCierreCajaCiego}
        efectivoEntregar={efectivoEntregar}
        setEfectivoEntregar={setEfectivoEntregar}
        efectivoDejar={efectivoDejar}
        setEfectivoDejar={setEfectivoDejar}
        guardandoCorte={guardandoCorte}
        currentUser={currentUser}
        fondoCaja={pFondoCaja}
      />
    );
  }  

  // Lógica estricta de bloqueo para el botón Admin
  const isEntregarInvalido = efectivoEntregar === '' || Number(efectivoEntregar) <= 0;
  const isDejarInvalido = efectivoDejar === '' || Number(efectivoDejar) < 0;
  const botonBloqueadoAdmin = guardandoCorte || isEntregarInvalido || isDejarInvalido;

  return (
    <div className="animate-in fade-in pb-20 w-full h-full">
      <CorteDesglosePrincipal
        currentUser={currentUser} fechaFiltro={fechaFiltro} setFechaFiltro={setFechaFiltro}
        hoyStr={hoyStr} esHoy={esHoy} cargando={cargando} mathHoy={mathHoy}
        fondoManual={fondoManual} setFondoManual={setFondoManual}
        pFondoCaja={pFondoCaja} pFondoRepartidor={pFondoRepartidor}
        totalVentasGlobales={totalVentasGlobales} totalEfectivoDia={totalEfectivoDia}
        pTotalGastos={pTotalGastos} efectivoEsperadoCaja={efectivoEsperadoCaja}
        guardarFondoManualBD={guardarFondoManualBD} guardandoFondo={guardandoFondo}
      />
      {!cargando && (
        <>
          <CorteDesgloseReparto mathHoy={mathHoy} pFondoRepartidor={pFondoRepartidor} efectivoEsperadoMotos={efectivoEsperadoMotos} />  
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in slide-in-from-bottom-8 duration-300">
            <CorteDesgloseDigital mathHoy={mathHoy} />  
            <CorteResumenCuadre
              totalDigital={totalDigital}
              fondoGlobal={totalFondoGlobal}
              ingresosEfectivo={totalEfectivoDia}
              gastos={pTotalGastos}
              descuentos={mathHoy.tDescuentos || 0}
              totalVentasGlobales={totalVentasGlobales}
              efectivoDeclarado={totalDeclaradoEnVivo}
              efectivoEntregado={totalEntregadoEnVivo} 
              efectivoEnCaja={totalEnCajaEnVivo}       
            />
          </div>  

          {esHoy && (
            <div className="mt-8 bg-slate-900 p-6 md:p-8 rounded-[40px] shadow-2xl border border-slate-800 flex flex-col xl:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-10 relative">
              
              {/* ALERTA CUSTOM (Sustituye alert nativo) */}
              {errorMsg && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-red-100 border border-red-200 text-red-600 px-6 py-2 rounded-2xl font-black text-sm shadow-xl shadow-red-500/20 animate-in slide-in-from-bottom-2 whitespace-nowrap z-50">
                  {errorMsg}
                </div>
              )}

              <div className="text-white flex-1 text-center xl:text-left">
                <h3 className="text-2xl font-black mb-1 text-blue-400">Cerrar Turno (Admin/Gerente)</h3>
                <p className="text-slate-400 font-medium text-sm">Declara el efectivo físico para asentar el sobrante o faltante.</p>
              </div>
              
              {/* FORMULARIO ADMIN CON DOS INPUTS */}
              <form onSubmit={handleCierreCajaCiego} className="flex flex-col md:flex-row w-full xl:w-auto items-center gap-4">
                
                <div className="relative w-full md:w-auto group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-blue-400 text-[10px] uppercase tracking-widest">Retiro $</span>
                  <input
                    type="number" step="0.01" min="0.01" required
                    value={efectivoEntregar}
                    onChange={e => setEfectivoEntregar(e.target.value)}
                    className="w-full md:w-44 bg-slate-800 text-white border-2 border-slate-700 rounded-2xl py-4 pl-[72px] pr-4 font-black text-xl outline-none focus:border-blue-500 transition-colors text-center md:text-left placeholder-slate-600"
                    placeholder="0.00"
                    disabled={guardandoCorte}
                  />
                </div>

                <div className="relative w-full md:w-auto group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-400 text-[10px] uppercase tracking-widest">Fondo $</span>
                  <input
                    type="number" step="0.01" min="0" required
                    value={efectivoDejar}
                    onChange={e => setEfectivoDejar(e.target.value)}
                    className="w-full md:w-44 bg-slate-800 text-white border-2 border-slate-700 rounded-2xl py-4 pl-[68px] pr-4 font-black text-xl outline-none focus:border-emerald-500 transition-colors text-center md:text-left placeholder-slate-600"
                    placeholder="0.00"
                    disabled={guardandoCorte}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={botonBloqueadoAdmin} 
                  className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                    botonBloqueadoAdmin 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-2 border-slate-700' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-95 border-2 border-blue-500'
                  }`}
                >
                  {guardandoCorte ? 'Cerrando...' : 'Declarar y Cerrar'}
                </button>
              </form>

            </div>
          )}
        </>
      )}
    </div>
  );
};  

export default CorteCajaFinanciero;