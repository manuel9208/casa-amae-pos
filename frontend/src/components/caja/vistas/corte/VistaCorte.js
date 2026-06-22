import React, { useState, useEffect } from 'react';
import { ChefHat, PlusCircle, MapPin, TrendingDown, Calendar, Search, History, Bike, CreditCard, Banknote, AlertTriangle } from 'lucide-react';  

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';  

// 👇 Utilidad para sincronizar la fecha exacta con el servidor de Mazatlán
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
    totalGastos, fondoCaja, fondoRepartidor, user
  } = props;  

  const hoyStr = new Date().toLocaleDateString('en-CA');
  const [fechaFiltro, setFechaFiltro] = useState(hoyStr);
  const [cargando, setCargando] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [datosHistoricos, setDatosHistoricos] = useState(null);  

  const [mathHoy, setMathHoy] = useState({
    platillos: 0, extras: 0, envio: 0, efectivo: 0, tarjeta: 0, transf: 0, comedor: 0,
    envios: { platillos: 0, extras: 0, envio: 0, efectivo: 0, tarjeta: 0, transf: 0 }
  });  

  const esHoy = fechaFiltro === hoyStr;
  const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g,"")) || 0;  

  // 1. OBTENER PEDIDOS Y CORTE (CON BLINDAJE DE FECHA Y SIN PARPADEOS)
  useEffect(() => {
    const cargarDatos = async (esSilencioso = false) => {
      if (!esSilencioso) setCargando(true);
      
      try {
        const resPed = await fetch(`${apiUrl}/pedidos/historial?periodo=dia&fecha=${fechaFiltro}`);
        if(resPed.ok) {
           let data = await resPed.json();
           
           // 👇 FIX FECHAS: Usamos el TimeZone de Mazatlán para no arrastrar pedidos de ayer
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

  // 2. MATEMÁTICAS EXACTAS CLONADAS DEL REPORTE
  useEffect(() => {
    let tPlat=0, tExt=0, tEnv=0, tEfe=0, tTar=0, tTra=0, tCom=0;
    let dPlat=0, dExt=0, dEnv=0, dEfe=0, dTar=0, dTra=0;  

    pedidos.forEach(p => {
      // 👇 FIX FINANCIERO: Bloqueo absoluto de todo pedido que no deba sumar dinero al cajón
      if(['Cancelado', 'Pendiente', 'Por Confirmar'].includes(p.estado_preparacion)) return;
      if(['Pendiente', 'Por Cobrar'].includes(p.metodo_pago)) return;

      const isComedor = p.metodo_pago === 'Comida Personal';
      const isDomicilio = p.tipo_consumo === 'Domicilio';  
      
      const costoEnvio = parseMoney(p.costo_envio);
      tEnv += costoEnvio;
      if (isDomicilio) dEnv += costoEnvio;  
      
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
      tEfe += efe; tTar += tar; tTra += tra;
      if (isDomicilio) { dEfe += efe; dTar += tar; dTra += tra; }  
      
      let car = [];
      if (Array.isArray(p.carrito)) {
        car = p.carrito;
      } else if (typeof p.carrito === 'string') {
        try { car = JSON.parse(p.carrito); } catch(e) {}
      }  
      
      car.forEach(i => {
        const qty = parseMoney(i.cantidad) || 1;
        let exP = 0;  
        if(Array.isArray(i.extras)) {
          i.extras.forEach(e => {
            const eNameLower = (e.nombre || '').trim().toLowerCase();
            // 👇 FIX FINANCIERO: Lógica idéntica al Reporte de Ventas para clasificar Extras Reales vs Base Modificada
            let isRealExtra = true;
            if (eNameLower.includes('nota:') || eNameLower.includes('📝') || eNameLower.startsWith('sin ') || eNameLower.includes(' ❌') || eNameLower.startsWith('❌')) {
                isRealExtra = false;
            } else if (eNameLower.includes('sabor:') || eNameLower.includes('tamaño:') || eNameLower.includes('🔸') || eNameLower.includes('🔹') || e.tipo === 'variacion') {
                isRealExtra = false;
            }
            
            if (isRealExtra) {
                exP += parseMoney(e.precioExtra || e.precio_extra || e.precio || 0);
            }
          });
        }  
        if (isComedor) {
          tCom += (parseMoney(i.precioFinal || i.precio_base || i.precio) * qty);
        } else {
          const calcExtra = (exP * qty);
          let rawPrice = parseMoney(i.precioFinal || i.precio_base || i.precio);
          let calcBase = rawPrice - exP;
          if (calcBase < 0) calcBase = 0;
          const calcPlat = (calcBase * qty);  
          tExt += calcExtra;
          tPlat += calcPlat;  
          if (isDomicilio) {
            dExt += calcExtra;
            dPlat += calcPlat;
          }
        }
      });
    });  

    setMathHoy({
      platillos: tPlat, extras: tExt, envio: tEnv, efectivo: tEfe, tarjeta: tTar, transf: tTra, comedor: tCom,
      envios: { platillos: dPlat, extras: dExt, envio: dEnv, efectivo: dEfe, tarjeta: dTar, transf: dTra }
    });
  }, [pedidos]);  

  // 3. AUTO-GUARDADO SILENCIOSO (Solo si es el día en curso)
  useEffect(() => {
    if (esHoy) {
      const temporizadorSincronizacion = setTimeout(async () => {
        try {
          await fetch(`${apiUrl}/cortes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fecha: hoyStr,
              usuario_id: user?.id || null,
              fondo_inicial: fondoCaja || 0,
              fondo_repartidor: fondoRepartidor || 0,
              venta_platillos: mathHoy.platillos,
              ingresos_extras: mathHoy.extras,
              cargos_envio: mathHoy.envio,
              total_efectivo: mathHoy.efectivo,
              total_tarjeta: mathHoy.tarjeta,
              total_transferencia: mathHoy.transf,
              total_gastos: totalGastos,
              efectivo_cajon: ((Number(fondoCaja) || 0) + (Number(fondoRepartidor)||0) + mathHoy.efectivo) - (Number(totalGastos) || 0),
              detalles_envio: mathHoy.envios
            })
          });
        } catch (error) {}
      }, 3000);
      return () => clearTimeout(temporizadorSincronizacion);
    }
  }, [esHoy, hoyStr, fondoCaja, mathHoy, totalGastos, fondoRepartidor, user]);  

  // 4. ASIGNACIÓN DE VARIABLES DE VISTA (Siempre Dinámicas para que cuadren con el Reporte)
  const pTotalPlatillos = mathHoy.platillos;
  const pTotalExtras = mathHoy.extras;
  const pTotalEnvio = mathHoy.envio;
  const pTotalEfectivo = mathHoy.efectivo;
  const pTotalTarjeta = mathHoy.tarjeta;
  const pTotalTransf = mathHoy.transf;
  const pTotalComedor = mathHoy.comedor;
  const pEnvios = mathHoy.envios;  

  const pFondoCaja = esHoy ? (Number(fondoCaja) || 0) : Number(datosHistoricos?.fondo_inicial || datosHistoricos?.fondo_caja || 0);
  const pTotalGastos = esHoy ? (Number(totalGastos) || 0) : Number(datosHistoricos?.total_gastos || 0);
  const pFondoRepartidor = esHoy ? (Number(fondoRepartidor) || 0) : Number(datosHistoricos?.fondo_repartidor || 0);  

  const totalCajon = (pFondoCaja + pFondoRepartidor + pTotalEfectivo) - pTotalGastos;  

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

      <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-200 relative overflow-hidden mb-8">
        {!esHoy && <div className="absolute top-0 right-0 bg-blue-600 text-white px-6 py-1.5 rounded-bl-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-md z-10"><History size={14}/> Viendo Historial</div>}  
        
        {cargando ? (
          <div className="py-20 text-center flex flex-col items-center justify-center opacity-50"><Search size={48} className="text-slate-400 mb-4 animate-pulse" /><p className="font-black text-xl text-slate-500">Recalculando operaciones...</p></div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2 mb-3">Resumen General (Incluye Todo)</h3>
              {!esHoy && !datosHistoricos && <span className="text-[10px] text-amber-600 bg-amber-50 font-bold px-3 py-1 rounded-lg flex items-center gap-1 border border-amber-200"><AlertTriangle size={14}/> Fondo Incompleto en BD</span>}
            </div>  

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex justify-between items-center hover:shadow-md transition">
                <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Venta Platillos</p><p className="text-2xl font-black text-slate-700">${pTotalPlatillos.toFixed(2)}</p></div>
                <ChefHat size={32} className="text-slate-300"/>
              </div>
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex justify-between items-center hover:shadow-md transition">
                <div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ingresos Extras</p><p className="text-2xl font-black text-emerald-700">${pTotalExtras.toFixed(2)}</p></div>
                <PlusCircle size={32} className="text-emerald-200"/>
              </div>
              <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex justify-between items-center hover:shadow-md transition">
                <div><p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Cargos por Envío</p><p className="text-2xl font-black text-purple-700">${pTotalEnvio.toFixed(2)}</p></div>
                <MapPin size={32} className="text-purple-200"/>
              </div>
            </div>  

            {pTotalComedor > 0 && (
              <div className="bg-orange-50 p-6 rounded-3xl border border-orange-200 flex justify-between items-center mb-8">
                <div>
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Prestación: Comedor Empleados</p>
                  <p className="text-2xl font-black text-orange-700">${pTotalComedor.toFixed(2)}</p>
                </div>
              </div>
            )}  

            <div className="border-t border-slate-100 pt-8 mb-8"></div>  
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Fondo Inicial</p><p className="text-2xl font-black text-slate-700">${pFondoCaja.toFixed(2)}</p></div>
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Efectivo Físico</p><p className="text-2xl font-black text-emerald-700">${pTotalEfectivo.toFixed(2)}</p></div>
              <div className="bg-red-50 p-6 rounded-3xl border border-red-100 relative overflow-hidden group"><div className="absolute top-2 right-2 text-red-200 group-hover:scale-110 transition"><TrendingDown size={32}/></div><p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 relative z-10">Gastos (Compras)</p><p className="text-2xl font-black text-red-700 relative z-10">-${pTotalGastos.toFixed(2)}</p></div>
              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100"><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Tarjetas</p><p className="text-2xl font-black text-blue-700">${pTotalTarjeta.toFixed(2)}</p></div>
              <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100"><p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2">Transferencias</p><p className="text-2xl font-black text-purple-700">${pTotalTransf.toFixed(2)}</p></div>
            </div>  

            <div className={`p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center text-white transition-colors duration-500 ${!esHoy ? 'bg-slate-800' : 'bg-emerald-600'}`}>
              <div>
                <p className={`${!esHoy ? 'text-slate-400' : 'text-emerald-200'} font-black uppercase tracking-widest mb-1 text-sm`}>Efectivo Físico en Cajón</p>
                <p className={`text-[11px] font-bold ${!esHoy ? 'text-slate-500' : 'text-emerald-100 opacity-80'} uppercase tracking-wider`}>(Fondo Caja + Fondo Reparto + Ventas Efec) - Gastos</p>
              </div>
              <p className="text-6xl font-black mt-4 md:mt-0">${totalCajon.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>  

      {!cargando && (
        <div className="bg-indigo-50 p-6 md:p-10 rounded-[40px] shadow-sm border border-indigo-100 animate-in slide-in-from-bottom-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-sm"><Bike size={24}/></div>
            <div>
              <h3 className="text-2xl font-black text-indigo-900 tracking-tight">Corte de Logística (Motos)</h3>
              <p className="text-xs font-bold text-indigo-400/80 uppercase tracking-widest mt-0.5">ESTAS CANTIDADES YA ESTÁN CONTEMPLADAS EN EL RESUMEN GENERAL</p>
            </div>
          </div>  

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-3xl border border-indigo-50 flex justify-between items-center shadow-sm">
              <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Venta Comida</p><p className="text-xl font-black text-indigo-900">${(pEnvios.platillos + pEnvios.extras).toFixed(2)}</p></div>
              <ChefHat size={28} className="text-indigo-100"/>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-indigo-50 flex justify-between items-center shadow-sm">
              <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Tarifas Cobradas</p><p className="text-xl font-black text-indigo-900">${pEnvios.envio.toFixed(2)}</p></div>
              <MapPin size={28} className="text-indigo-100"/>
            </div>
            <div className="bg-indigo-600 p-5 rounded-3xl border border-indigo-500 flex justify-between items-center shadow-md">
              <div><p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Ingreso Efectivo</p><p className="text-2xl font-black text-white">${pEnvios.efectivo.toFixed(2)}</p></div>
              <Banknote size={28} className="text-indigo-400"/>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-indigo-50 flex justify-between items-center shadow-sm">
              <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pago Digital</p><p className="text-xl font-black text-indigo-900">${(pEnvios.tarjeta + pEnvios.transf).toFixed(2)}</p></div>
              <CreditCard size={28} className="text-indigo-100"/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};  

export default VistaCorte;