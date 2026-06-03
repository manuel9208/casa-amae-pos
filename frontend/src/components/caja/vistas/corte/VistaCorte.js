import React, { useState, useEffect } from 'react';
import { ChefHat, PlusCircle, MapPin, TrendingDown, Calendar, Search, History } from 'lucide-react';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const VistaCorte = ({
  totalPlatillos, totalExtras, totalEnvio, fondoCaja, totalEfectivoVentas,
  totalGastos, totalTarjetaVentas, totalTransferenciaVentas, gastosDia
}) => {

  const hoyStr = new Date().toLocaleDateString('en-CA'); 
  const [fechaFiltro, setFechaFiltro] = useState(hoyStr);
  const [cargando, setCargando] = useState(false);
  const [datosHistoricos, setDatosHistoricos] = useState(null);
  const [mathHoy, setMathHoy] = useState({ platillos: 0, extras: 0, envio: 0, efectivo: 0, tarjeta: 0, transf: 0, comedor: 0 });

  const esHoy = fechaFiltro === hoyStr;

  const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g,"")) || 0;

  useEffect(() => {
    if (!esHoy) return;
    const calcMath = async () => {
       try {
          const res = await fetch(`${apiUrl}/pedidos/hoy`);
          const data = await res.json();
          if(!Array.isArray(data)) return;
          
          let pPlat=0, pExt=0, pEnv=0, pEfe=0, pTar=0, pTra=0, pCom=0;
          
          data.forEach(p => {
             if(p.estado_preparacion === 'Cancelado') return;
             const isComedor = p.metodo_pago === 'Comida Personal';
             
             pEnv += parseMoney(p.costo_envio);
             if(p.metodo_pago === 'Efectivo') pEfe += parseMoney(p.total);
             if(p.metodo_pago === 'Tarjeta') pTar += parseMoney(p.total);
             if(p.metodo_pago === 'Transferencia') pTra += parseMoney(p.total);
             if(p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
                 try { JSON.parse(p.pagos_mixtos).forEach(x=>{
                     if(x.metodo==='Efectivo') pEfe+=parseMoney(x.monto);
                     if(x.metodo==='Tarjeta') pTar+=parseMoney(x.monto);
                     if(x.metodo==='Transferencia') pTra+=parseMoney(x.monto);
                 })}catch(e){}
             }

             // 👇 CORRECCIÓN: LECTURA SEGURA DEL CARRITO PARA EVITAR EL 0.00
             let car = []; 
             if (Array.isArray(p.carrito)) {
                 car = p.carrito;
             } else if (typeof p.carrito === 'string') {
                 try { car = JSON.parse(p.carrito); } catch(e) {}
             }
             
             if(Array.isArray(car)){
                 car.forEach(i => {
                     const qty = parseMoney(i.cantidad) || 1;
                     let exP = 0;
                     if(Array.isArray(i.extras)) {
                         i.extras.forEach(e => exP += parseMoney(e.precioExtra||e.precio_extra||e.precio));
                     }
                     
                     let rawPrice = parseMoney(i.precioFinal || i.precio_base || i.precio);
                     
                     if(isComedor) {
                         pCom += (rawPrice * qty);
                     } else {
                         pExt += (exP * qty);
                         let cBase = rawPrice - exP;
                         if(cBase < 0) cBase = 0;
                         pPlat += (cBase * qty);
                     }
                 });
             }
          });
          setMathHoy({ platillos: pPlat, extras: pExt, envio: pEnv, efectivo: pEfe, tarjeta: pTar, transf: pTra, comedor: pCom });
       }catch(e){}
    };
    calcMath();
    const int = setInterval(calcMath, 3000);
    return () => clearInterval(int);
  }, [esHoy]);

  useEffect(() => {
    if (esHoy) {
      const temporizadorSincronizacion = setTimeout(async () => {
        try {
          await fetch(`${apiUrl}/cortes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fecha: hoyStr,
              fondo_caja: fondoCaja || 0,
              total_platillos: mathHoy.platillos,
              total_extras: mathHoy.extras,
              total_envio: mathHoy.envio,
              total_efectivo: mathHoy.efectivo,
              total_tarjeta: mathHoy.tarjeta,
              total_transferencia: mathHoy.transf,
              total_gastos: totalGastos,
              desglose_gastos: gastosDia || []
            })
          });
        } catch (error) {}
      }, 3000);
      return () => clearTimeout(temporizadorSincronizacion);
    }
  }, [esHoy, hoyStr, fondoCaja, mathHoy, totalGastos, gastosDia]);

  useEffect(() => {
    if (esHoy) { setDatosHistoricos(null); return; }
    const cargarHistorial = async () => {
      setCargando(true);
      try {
        const res = await fetch(`${apiUrl}/cortes/historial?fecha=${fechaFiltro}`);
        if (res.ok) setDatosHistoricos(await res.json());
        else setDatosHistoricos(null);
      } catch (error) { setDatosHistoricos(null); }
      setCargando(false);
    };
    cargarHistorial();
  }, [fechaFiltro, esHoy]);

  const pTotalPlatillos = esHoy ? mathHoy.platillos : Number(datosHistoricos?.total_platillos || 0);
  const pTotalExtras = esHoy ? mathHoy.extras : Number(datosHistoricos?.total_extras || 0);
  const pTotalEnvio = esHoy ? mathHoy.envio : Number(datosHistoricos?.total_envio || 0);
  const pFondoCaja = esHoy ? (fondoCaja || 0) : Number(datosHistoricos?.fondo_caja || 0);
  const pTotalEfectivo = esHoy ? mathHoy.efectivo : Number(datosHistoricos?.total_efectivo || 0);
  const pTotalGastos = esHoy ? totalGastos : Number(datosHistoricos?.total_gastos || 0);
  const pTotalTarjeta = esHoy ? mathHoy.tarjeta : Number(datosHistoricos?.total_tarjeta || 0);
  const pTotalTransf = esHoy ? mathHoy.transf : Number(datosHistoricos?.total_transferencia || 0);
  const pTotalComedor = esHoy ? mathHoy.comedor : 0; 
  
  const totalCajon = (pFondoCaja + pTotalEfectivo) - pTotalGastos;

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

      <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-200 relative overflow-hidden">
         {!esHoy && <div className="absolute top-0 right-0 bg-blue-600 text-white px-6 py-1.5 rounded-bl-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-md z-10"><History size={14}/> Viendo Historial</div>}
         
         {cargando ? (
           <div className="py-20 text-center flex flex-col items-center justify-center opacity-50"><Search size={48} className="text-slate-400 mb-4 animate-pulse" /><p className="font-black text-xl text-slate-500">Buscando registros...</p></div>
         ) : !esHoy && !datosHistoricos ? (
           <div className="py-20 text-center flex flex-col items-center justify-center"><History size={64} className="text-slate-300 mb-4" /><p className="font-black text-2xl text-slate-800 mb-2">No hay corte registrado</p><p className="text-slate-500 font-medium">No se encontró información para el {fechaFiltro}.</p></div>
         ) : (
           <div className="animate-in slide-in-from-bottom-4">
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
                   <p className={`text-[11px] font-bold ${!esHoy ? 'text-slate-500' : 'text-emerald-100 opacity-80'} uppercase tracking-wider`}>(Fondo + Ventas) - Gastos</p>
                </div>
                <p className="text-6xl font-black mt-4 md:mt-0">${totalCajon.toFixed(2)}</p>
             </div>
           </div>
         )}
      </div>
    </div>
  );
};
export default VistaCorte;