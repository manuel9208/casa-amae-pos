import React, { useState, useEffect } from 'react';
import { TrendingDown, Calendar, Search, History, Bike, AlertTriangle, Store, Calculator, Smartphone, Lock, CheckCircle2 } from 'lucide-react';  

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

const VistaCorte = (props) => {
  const {
    totalGastos, fondoCaja, fondoRepartidor, user: userProp
  } = props;  

  // 🛡️ INTELIGENCIA AUTÓNOMA: Si el componente padre (Caja.js) olvida mandarnos el usuario, lo extraemos de la memoria.
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

  // 🛡️ AUTO-LLENADO DE FONDO INICIAL DESDE LA BASE DE DATOS
  useEffect(() => {
    if (fondoCaja !== undefined && fondoCaja !== null && fondoManual === '') {
      setFondoManual(fondoCaja);
    } else if (datosHistoricos && datosHistoricos.fondo_inicial !== undefined && datosHistoricos.fondo_inicial !== null && fondoManual === '') {
      setFondoManual(datosHistoricos.fondo_inicial);
    }
  }, [fondoCaja, datosHistoricos, fondoManual]);

  // VALIDACIÓN DE ROLES ESTRICTA
  const isSuperAdmin = String(currentUser?.usuario || '').toLowerCase().trim() === 'admin';
  const rolUser = String(currentUser?.rol || '').toLowerCase().trim();
  const esAdminOGerente = isSuperAdmin || ['admin', 'gerente', 'administrador global'].includes(rolUser);

  const [mathHoy, setMathHoy] = useState({
    lPlatillos: 0, lExtras: 0, lEfectivo: 0, lTarjeta: 0, lTransf: 0,
    dPlatillos: 0, dExtras: 0, dEfectivo: 0, dTarjeta: 0, dTransf: 0, dEnvio: 0,
    tEnvio: 0, tPlatillos: 0, tExtras: 0
  });  

  const esHoy = fechaFiltro === hoyStr;
  const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g,"")) || 0;  

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
      } catch(e) { 
        setDatosHistoricos(null); 
      }
      
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

  useEffect(() => {
    if (esHoy && esAdminOGerente) {
      const temporizadorSincronizacion = setTimeout(async () => {
        try {
          await fetch(`${apiUrl}/cortes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fecha: hoyStr,
              usuario_id: currentUser?.id || null,
              fondo_inicial: Number(fondoManual) || 0, 
              fondo_repartidor: fondoRepartidor || 0,
              venta_platillos: mathHoy.tPlatillos,
              ingresos_extras: mathHoy.tExtras,
              cargos_envio: mathHoy.tEnvio,
              total_efectivo: mathHoy.lEfectivo + mathHoy.dEfectivo,
              total_tarjeta: mathHoy.lTarjeta + mathHoy.dTarjeta,
              total_transferencia: mathHoy.lTransf + mathHoy.dTransf,
              total_gastos: totalGastos,
              efectivo_cajon: ((Number(fondoManual) || 0) + (Number(fondoRepartidor)||0) + mathHoy.lEfectivo + mathHoy.dEfectivo) - (Number(totalGastos) || 0),
              detalles_envio: { 
                 platillos: mathHoy.dPlatillos, extras: mathHoy.dExtras, envio: mathHoy.dEnvio, 
                 efectivo: mathHoy.dEfectivo, tarjeta: mathHoy.dTarjeta, transf: mathHoy.dTransf 
              }
            })
          });
        } catch (error) {}
      }, 3000);
      return () => clearTimeout(temporizadorSincronizacion);
    }
  }, [esHoy, hoyStr, fondoManual, mathHoy, totalGastos, fondoRepartidor, currentUser, esAdminOGerente]);  

  const handleCierreCajaCiego = async (e) => {
    e.preventDefault();
    const efectivoNum = parseFloat(efectivoManual);
    const fondoNum = parseFloat(fondoManual);
    if (isNaN(efectivoNum) || efectivoNum < 0 || isNaN(fondoNum) || fondoNum < 0) {
      alert("Por favor ingresa cantidades válidas.");
      return;
    }

    setGuardandoCorte(true);
    try {
      const res = await fetch(`${apiUrl}/cortes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        if (props.onLogout) {
          props.onLogout();
        } else {
          window.location.reload();
        }
      } else {
        alert("Ocurrió un error al procesar el cierre. Inténtalo de nuevo.");
      }
    } catch (error) {
      console.error("Error en cierre a ciegas:", error);
    }
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

  // =========================================================================
  // VISTA 1: RENDERIZADO EXCLUSIVO PARA CAJERO O JEFE DE TURNO (CORTE A CIEGAS)
  // =========================================================================
  if (!esAdminOGerente) {
    return (
      <div className="animate-in fade-in pb-20 max-w-xl mx-auto px-4 mt-4 md:mt-8">
        <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-xl border border-slate-200 text-center">
          <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-6 shadow-sm">
            <Lock size={32} />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Cierre de Turno Obligatorio</h2>
          <p className="text-[10px] bg-slate-900 text-white font-black uppercase tracking-widest px-3 py-1 rounded-md inline-block mt-2">
            Modalidad: Corte a Ciegas
          </p>

          <p className="text-slate-500 font-bold text-sm leading-relaxed mt-6 mb-8">
            Por políticas de auditoría y seguridad, debes declarar el dinero con el que iniciaste y el que tienes actualmente en tu gaveta antes de concluir.
          </p>

          <form onSubmit={handleCierreCajaCiego} className="space-y-6 text-left">
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                Fondo Inicial (Con el que abriste)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-5 font-black text-3xl text-slate-400 select-none">$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  required
                  disabled={guardandoCorte}
                  value={fondoManual}
                  onChange={(e) => setFondoManual(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 pl-10 text-center text-4xl font-black outline-none focus:border-indigo-500 transition-all text-slate-700 tracking-tight placeholder-slate-200"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                Efectivo Físico Contado al Cierre
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-5 font-black text-3xl text-slate-400 select-none">$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  required
                  disabled={guardandoCorte}
                  value={efectivoManual}
                  onChange={(e) => setEfectivoManual(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 pl-10 text-center text-4xl font-black outline-none focus:border-indigo-500 transition-all text-slate-700 tracking-tight placeholder-slate-200"
                />
              </div>
              <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider mt-3">
                No incluyas vouchers de tarjeta ni transferencias, únicamente billetes y monedas.
              </p>
            </div>

            <button
              type="submit"
              disabled={guardandoCorte || !efectivoManual || fondoManual === ''}
              className="w-full bg-slate-800 hover:bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-40 disabled:bg-slate-300 disabled:shadow-none"
            >
              <CheckCircle2 size={22} /> {guardandoCorte ? "Asentando Cierre..." : "Efectuar Cierre y Salir"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA 2: RENDERIZADO COMPLETO PARA OPERADORES DE ALTO RANGO (ADMIN/GERENTE)
  // =========================================================================
  return (
    <div className="animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <h2 className="text-4xl font-black text-slate-800">Corte de Caja</h2>
        <div className="flex items-center bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <div className="bg-slate-100 p-2 rounded-xl text-slate-500 mr-2"><Calendar size={20} /></div>
          <input type="date" value={fechaFiltro} max={hoyStr} onChange={(e) => setFechaFiltro(e.target.value)} className="bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer" />
          {!esHoy && <button onClick={() => setFechaFiltro(hoyStr)} className="ml-4 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-lg text-xs font-black transition">Volver a Hoy</button>}
        </div>
      </div>  

      <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200 relative overflow-hidden mb-8">
        {!esHoy && <div className="absolute top-0 right-0 bg-blue-600 text-white px-6 py-1.5 rounded-bl-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-md z-10"><History size={14}/> Viendo Historial</div>}  
        
        {cargando ? (
          <div className="py-20 text-center flex flex-col items-center justify-center opacity-50"><Search size={48} className="text-slate-400 mb-4 animate-pulse" /><p className="font-black text-xl text-slate-500">Recalculando operaciones...</p></div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest px-2 mb-3 flex items-center gap-3"><Store size={24}/> 1. Caja Principal (Mostrador)</h3>
              {!esHoy && !datosHistoricos && <span className="text-[10px] text-amber-600 bg-amber-50 font-bold px-3 py-1 rounded-lg flex items-center gap-1 border border-amber-200"><AlertTriangle size={14}/> Fondo Incompleto en BD</span>}
            </div>  

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ventas (Mostrador)</p>
                <p className="text-2xl font-black text-slate-700">${(mathHoy.lPlatillos + mathHoy.lExtras).toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
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
                   </div>
                ) : (
                   <p className="text-2xl font-black text-slate-700 mt-0.5">${pFondoCaja.toFixed(2)}</p>
                )}
              </div>
              <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ingresos Efectivo</p>
                <p className="text-2xl font-black text-emerald-700">+${mathHoy.lEfectivo.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 p-5 rounded-2xl border border-red-100 relative overflow-hidden group">
                <div className="absolute top-2 right-2 text-red-200 group-hover:scale-110 transition"><TrendingDown size={32}/></div>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 relative z-10">Gastos (Compras)</p>
                <p className="text-2xl font-black text-red-700 relative z-10">-${pTotalGastos.toFixed(2)}</p>
              </div>
            </div>  

            <div className={`p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center text-white transition-colors duration-500 ${!esHoy ? 'bg-slate-800' : 'bg-emerald-600'}`}>
              <div>
                <p className={`${!esHoy ? 'text-slate-400' : 'text-emerald-200'} font-black uppercase tracking-widest mb-1 text-sm`}>Efectivo Físico en Cajón</p>
                <p className={`text-[11px] font-bold ${!esHoy ? 'text-slate-500' : 'text-emerald-100 opacity-80'} uppercase tracking-wider`}>(Fondo Inicial + Ventas Efectivo) - Gastos</p>
              </div>
              <p className="text-6xl font-black mt-4 md:mt-0">${efectivoEsperadoCaja.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>  

      {!cargando && (
        <>
          <div className="bg-indigo-50/50 p-6 md:p-10 rounded-[40px] shadow-sm border border-indigo-100 animate-in slide-in-from-bottom-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-sm"><Bike size={24}/></div>
              <div>
                <h3 className="text-2xl font-black text-indigo-900 tracking-tight">2. Repartidores (Motos)</h3>
              </div>
            </div>  

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Ventas (Domicilio)</p>
                <p className="text-xl font-black text-indigo-900">${(mathHoy.dPlatillos + mathHoy.dExtras).toFixed(2)}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Envíos Cobrados</p>
                <p className="text-xl font-black text-indigo-900">${mathHoy.dEnvio.toFixed(2)}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Fondo Repartidores</p>
                <p className="text-xl font-black text-indigo-900">${pFondoRepartidor.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ingresos Efectivo</p>
                <p className="text-xl font-black text-emerald-700">+${mathHoy.dEfectivo.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-indigo-600 p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center text-white">
              <div>
                <p className="text-indigo-200 font-black uppercase tracking-widest mb-1 text-sm">Efectivo Físico a Entregar por Motos</p>
                <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Fondo Repartidores + Pagos en Efectivo</p>
              </div>
              <p className="text-6xl font-black mt-4 md:mt-0">${efectivoEsperadoMotos.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in slide-in-from-bottom-8">
            <div className="bg-blue-50/50 p-6 md:p-8 rounded-[32px] border border-blue-100">
               <div className="flex items-center gap-3 mb-6">
                   <div className="bg-blue-600 text-white p-2 rounded-xl"><Smartphone size={24}/></div>
                   <h3 className="text-xl font-black text-blue-900 uppercase tracking-widest">3. Pagos Digitales</h3>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Total Tarjetas</p>
                   <p className="text-2xl font-black text-blue-900">${(mathHoy.lTarjeta + mathHoy.dTarjeta).toFixed(2)}</p>
                 </div>
                 <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
                   <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Total Transferencias</p>
                   <p className="text-2xl font-black text-purple-900">${(mathHoy.lTransf + mathHoy.dTransf).toFixed(2)}</p>
                 </div>
               </div>
            </div>

            <div className="bg-emerald-50 p-6 md:p-8 rounded-[32px] border border-emerald-200 shadow-sm">
               <div className="flex items-center gap-3 mb-6">
                   <div className="bg-emerald-600 text-white p-2 rounded-xl"><Calculator size={24}/></div>
                   <h3 className="text-xl font-black text-emerald-900 uppercase tracking-widest">4. Gran Total (Cuadre)</h3>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-emerald-200 pb-3">
                     <span className="text-sm font-bold text-emerald-700">Total Efectivo Físico Global:</span>
                     <span className="text-xl font-black text-emerald-900">${totalEfectivoFisico.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-emerald-200 pb-3">
                     <span className="text-sm font-bold text-emerald-700">Total Pagos Digitales:</span>
                     <span className="text-xl font-black text-emerald-900">${totalDigital.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-end pt-2">
                     <div>
                       <span className="text-sm font-black text-emerald-800 uppercase tracking-widest">Ventas Brutas Totales:</span>
                       <p className="text-[10px] font-bold text-emerald-600 mt-1">Suma de Platillos + Extras + Envíos</p>
                     </div>
                     <span className="text-4xl font-black text-emerald-600">${totalVentasGlobales.toFixed(2)}</span>
                  </div>
               </div>
            </div>
         </div>
        </>
      )}
    </div>
  );
};  

export default VistaCorte;