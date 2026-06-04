import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Search, ShoppingBag, Eye, CalendarDays, Printer, ChefHat, PlusCircle, MapPin, TrendingDown, Bike, CreditCard, Banknote, Smartphone } from 'lucide-react';

const VistaCortesHistorico = ({ apiUrl, formaterMoneda, parseFechaSegura }) => {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState('dia'); 
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroMetodoPago, setFiltroMetodoPago] = useState('Todos');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  
  // 👇 Se agrega fondo_repartidor y detalles_envio para la sección de motos
  const [corteEstatico, setCorteEstatico] = useState({ fondo_caja: 0, total_gastos: 0, fondo_repartidor: 0, detalles_envio: null });

  const cargarPedidosHistoricos = useCallback(async () => {
    setCargando(true);
    try {
      const hoyStr = new Date().toISOString().split('T')[0];
      const isHoy = fechaFiltro === hoyStr;

      // 1. Cargar pedidos
      const res = await fetch(`${apiUrl}/pedidos/historial?periodo=${periodo}&fecha=${fechaFiltro}`);
      if (res.ok) {
        const data = await res.json();
        setPedidos(Array.isArray(data) ? data : []);
      }

      // 2. Extraer GASTOS EN VIVO si el filtro es "Día" y es "Hoy"
      let gastosEnVivoHoy = 0;
      if (periodo === 'dia' && isHoy) {
         try {
            const rGastos = await fetch(`${apiUrl}/insumos/compras/hoy`);
            if (rGastos.ok) {
               const dGastos = await rGastos.json();
               if (Array.isArray(dGastos)) {
                  gastosEnVivoHoy = dGastos.reduce((sum, g) => sum + Number(g.costo_total || 0), 0);
               }
            }
         } catch(e) {}
      }

      // 3. Cargar el corte estático
      if (periodo === 'dia') {
          const resCorte = await fetch(`${apiUrl}/cortes/historial?fecha=${fechaFiltro}`);
          if (resCorte.ok) {
              const dataC = await resCorte.json();
              setCorteEstatico({ 
                 fondo_caja: dataC.fondo_caja || 0, 
                 // 👇 Si es hoy, priorizamos la suma en vivo de los gastos para que el Admin no vea $0
                 total_gastos: isHoy ? gastosEnVivoHoy : (dataC.total_gastos || 0), 
                 fondo_repartidor: dataC.fondo_repartidor || 0,
                 detalles_envio: typeof dataC.detalles_envio === 'string' ? JSON.parse(dataC.detalles_envio) : dataC.detalles_envio
              });
          } else {
              setCorteEstatico({ 
                 fondo_caja: 0, 
                 total_gastos: isHoy ? gastosEnVivoHoy : 0, 
                 fondo_repartidor: 0, 
                 detalles_envio: null 
              });
          }
      } else {
          // Para Mes y Año
          const resRep = await fetch(`${apiUrl}/reportes/ventas?tipo=${periodo}&fecha=${fechaFiltro}`);
          if(resRep.ok) {
              const repData = await resRep.json();
              const gastosMesAnio = repData.resumen?.total_gastos || repData.resumen?.gastos_compras || repData.resumen?.gastos || 0;
              setCorteEstatico({ 
                 fondo_caja: repData.resumen?.fondo_caja || 0, 
                 total_gastos: gastosMesAnio, 
                 fondo_repartidor: 0, 
                 detalles_envio: null 
              });
          } else {
              setCorteEstatico({ fondo_caja: 0, total_gastos: 0, fondo_repartidor: 0, detalles_envio: null });
          }
      }
    } catch (e) {
      console.error("Error cargando histórico de auditoría", e);
    } finally {
      setCargando(false);
    }
  }, [apiUrl, periodo, fechaFiltro]);

  useEffect(() => {
    cargarPedidosHistoricos();
  }, [cargarPedidosHistoricos]);

  const deserializarCarrito = (carritoRaw) => {
    if (!carritoRaw) return [];
    return typeof carritoRaw === 'string' ? JSON.parse(carritoRaw) : carritoRaw;
  };

  const pedidosFiltrados = pedidos.filter(p => {
    if (filtroCliente.trim() !== '') {
      const termino = filtroCliente.toLowerCase();
      const nombreCliente = String(p.cliente_nombre || 'Invitado').toLowerCase();
      const telCliente = String(p.cliente_telefono || p.telefono || '');
      if (!nombreCliente.includes(termino) && !telCliente.includes(termino)) return false;
    }
    if (filtroMetodoPago !== 'Todos' && p.metodo_pago !== filtroMetodoPago) return false;
    return true;
  });

  const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g,"")) || 0;

  let tPlatillos = 0, tExtras = 0, tEnvio = 0, tEfectivo = 0, tTarjeta = 0, tTransf = 0;
  let dPlatillos = 0, dExtras = 0, dEnvio = 0, dEfectivo = 0, dTarjeta = 0, dTransf = 0;
  
  pedidos.forEach(p => {
     const isComedor = p.metodo_pago === 'Comida Personal';
     const isDomicilio = p.tipo_consumo === 'Domicilio';
     
     const costoEnvio = parseMoney(p.costo_envio);
     tEnvio += costoEnvio;
     if (isDomicilio) dEnvio += costoEnvio;

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
     
     tEfectivo += efe; tTarjeta += tar; tTransf += tra;
     if (isDomicilio) { dEfectivo += efe; dTarjeta += tar; dTransf += tra; }

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
             i.extras.forEach(e => { exP += parseMoney(e.precioExtra || e.precio_extra || e.precio); });
         }
         
         if (!isComedor) {
             const calcExtra = (exP * qty);
             let rawPrice = parseMoney(i.precioFinal || i.precio_base || i.precio);
             let calcBase = rawPrice - exP;
             if (calcBase < 0) calcBase = 0; 
             const calcPlat = (calcBase * qty);

             tExtras += calcExtra; 
             tPlatillos += calcPlat;

             if (isDomicilio) {
                 dExtras += calcExtra;
                 dPlatillos += calcPlat;
             }
         }
     });
  });

  const fondoCaja = Number(corteEstatico.fondo_caja || 0);
  const fondoRepartidor = Number(corteEstatico.fondo_repartidor || 0);
  const gastosCompras = Number(corteEstatico.total_gastos || 0);
  const efectivoCajon = (fondoCaja + fondoRepartidor + tEfectivo) - gastosCompras;

  // Si hay detalles guardados de envío (cortes viejos), los usa. Si no, usa el cálculo en vivo `dPlatillos`
  const pEnvios = corteEstatico.detalles_envio || { platillos: dPlatillos, extras: dExtras, envio: dEnvio, efectivo: dEfectivo, tarjeta: dTarjeta, transf: dTransf };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="print:hidden bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <CalendarDays size={14}/> Rango de Auditoría
          </label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[['dia', 'Día'], ['mes', 'Mes'], ['anio', 'Año']].map(([id, label]) => (
              <button key={id} onClick={() => setPeriodo(id)} className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${periodo === id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Fecha Referencia</label>
          <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm" />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <Search size={14}/> Identificador o Teléfono
          </label>
          <input type="text" placeholder="Buscar comprador..." value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-sm outline-none" />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <DollarSign size={14}/> Método de Pago
          </label>
          <select value={filtroMetodoPago} onChange={(e) => setFiltroMetodoPago(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-sm outline-none cursor-pointer">
            <option value="Todos">Todos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Mixto">Mixto</option>
          </select>
        </div>
      </div>

      <div className="hidden print:block text-center mb-6">
         <h1 className="text-2xl font-black text-slate-900">Reporte de Cortes y Auditoría</h1>
         <p className="text-slate-500 font-bold">Fecha de referencia: {fechaFiltro} | Rango: {periodo.toUpperCase()}</p>
         <hr className="mt-4 border-slate-300" />
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200 mb-6 print:shadow-none print:border-none print:p-0">
         <p className="text-slate-500 font-bold text-lg mb-4 print:text-sm">Origen de los Ingresos Totales</p>
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex justify-between items-center print:p-3 print:rounded-xl">
             <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Venta Platillos</p>
               <p className="text-2xl font-black text-slate-700 print:text-lg">{formaterMoneda(tPlatillos)}</p>
             </div>
             <ChefHat size={32} className="text-slate-300 print:hidden"/>
           </div>
           <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex justify-between items-center print:bg-white print:p-3 print:rounded-xl">
             <div>
               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 print:text-slate-500">Ingresos Extras</p>
               <p className="text-2xl font-black text-emerald-700 print:text-lg">{formaterMoneda(tExtras)}</p>
             </div>
             <PlusCircle size={32} className="text-emerald-200 print:hidden"/>
           </div>
           <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex justify-between items-center print:bg-white print:p-3 print:rounded-xl">
             <div>
               <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 print:text-slate-500">Cargos por Envío</p>
               <p className="text-2xl font-black text-purple-700 print:text-lg">{formaterMoneda(tEnvio)}</p>
             </div>
             <MapPin size={32} className="text-purple-200 print:hidden"/>
           </div>
         </div>
         
         <div className="border-t border-slate-100 pt-8 mb-6 print:pt-4 print:mb-4"></div>

         <p className="text-slate-500 font-bold text-lg mb-6 print:text-sm print:mb-3">Resumen por Método de Pago</p>
         
         <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 print:mb-4">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 print:p-3 print:rounded-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Fondo Inicial</p>
              <p className="text-2xl font-black text-slate-700 print:text-base">{formaterMoneda(fondoCaja)}</p>
            </div>
            
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 print:bg-white print:border-slate-200 print:p-3 print:rounded-xl">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 print:text-slate-500">Efectivo Físico</p>
              <p className="text-2xl font-black text-emerald-700 print:text-base">{formaterMoneda(tEfectivo)}</p>
            </div>
            
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100 relative overflow-hidden print:bg-white print:border-slate-200 print:p-3 print:rounded-xl">
              <div className="absolute top-2 right-2 text-red-200 print:hidden"><TrendingDown size={32}/></div>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 relative z-10 print:text-slate-500">Gastos (Compras)</p>
              <p className="text-2xl font-black text-red-700 relative z-10 print:text-base">-{formaterMoneda(gastosCompras)}</p>
            </div>

            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 print:bg-white print:border-slate-200 print:p-3 print:rounded-xl">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 print:text-slate-500">Tarjetas</p>
              <p className="text-2xl font-black text-blue-700 print:text-base">{formaterMoneda(tTarjeta)}</p>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 print:bg-white print:border-slate-200 print:p-3 print:rounded-xl">
              <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 print:text-slate-500">Transferencias</p>
              <p className="text-2xl font-black text-purple-700 print:text-base">{formaterMoneda(tTransf)}</p>
            </div>
         </div>

         <div className="bg-emerald-600 p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center text-white print:bg-white print:border print:border-slate-400 print:shadow-none print:p-4 print:text-black print:rounded-xl">
            <div>
               <p className="text-emerald-200 font-black uppercase tracking-widest mb-1 text-sm print:text-slate-800">
                 Efectivo Físico en Cajón
               </p>
               <p className="text-[11px] font-bold text-emerald-100 opacity-80 uppercase tracking-wider print:text-slate-500">
                 (Fondo Caja + Fondo Reparto + Ventas Efec) - Gastos
               </p>
            </div>
            <p className="text-6xl font-black mt-4 md:mt-0 print:text-3xl">
               {formaterMoneda(efectivoCajon)}
            </p>
         </div>
      </div>

      {/* 👇 EL NUEVO CORTE DE LOGÍSTICA PARA EL ADMINISTRADOR */}
      {(!cargando && pEnvios) && (
      <div className="bg-indigo-50 p-6 md:p-8 rounded-[32px] shadow-sm border border-indigo-100 animate-in slide-in-from-bottom-6 mb-6 print:border-slate-400 print:bg-white">
         <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-sm print:bg-slate-200 print:text-black"><Bike size={24}/></div>
            <div>
               <h3 className="text-2xl font-black text-indigo-900 tracking-tight print:text-black">Corte de Logística (Motos)</h3>
               <p className="text-xs font-bold text-indigo-400/80 uppercase tracking-widest mt-0.5 print:text-slate-500">ESTAS CANTIDADES YA ESTÁN CONTEMPLADAS EN EL RESUMEN GENERAL</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-indigo-50 flex justify-between items-center shadow-sm print:border-slate-300 print:shadow-none">
               <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 print:text-slate-500">Venta Comida</p><p className="text-xl font-black text-indigo-900 print:text-black">{formaterMoneda(pEnvios.platillos + pEnvios.extras)}</p></div>
               <ChefHat size={28} className="text-indigo-100 print:hidden"/>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-indigo-50 flex justify-between items-center shadow-sm print:border-slate-300 print:shadow-none">
               <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 print:text-slate-500">Tarifas Cobradas</p><p className="text-xl font-black text-indigo-900 print:text-black">{formaterMoneda(pEnvios.envio)}</p></div>
               <MapPin size={28} className="text-indigo-100 print:hidden"/>
            </div>
            <div className="bg-indigo-600 p-5 rounded-3xl border border-indigo-500 flex justify-between items-center shadow-md print:bg-white print:border-slate-300 print:shadow-none">
               <div><p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 print:text-slate-500">Ingreso Efectivo</p><p className="text-2xl font-black text-white print:text-black">{formaterMoneda(pEnvios.efectivo)}</p></div>
               <Banknote size={32} className="text-indigo-400 print:hidden"/>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-indigo-50 flex justify-between items-center shadow-sm print:border-slate-300 print:shadow-none">
               <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 print:text-slate-500">Pago Digital</p><p className="text-xl font-black text-indigo-900 print:text-black">{formaterMoneda(pEnvios.tarjeta + pEnvios.transf)}</p></div>
               <div className="flex -space-x-2 print:hidden"><CreditCard size={24} className="text-indigo-200"/><Smartphone size={24} className="text-indigo-300"/></div>
            </div>
         </div>
      </div>
      )}

      {cargando ? (
        <div className="text-center py-20 animate-pulse font-bold text-slate-500 print:hidden">Cargando transacciones históricas...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          <div className="xl:col-span-2 bg-white rounded-[32px] print:rounded-none p-6 print:p-0 border border-slate-200 print:border-none shadow-sm print:shadow-none">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                 🧾 Órdenes Auditadas ({pedidosFiltrados.length})
               </h3>
               <button onClick={() => window.print()} className="print:hidden flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:bg-slate-700 transition active:scale-95">
                 <Printer size={16}/> Imprimir Reporte
               </button>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest print:text-black">
                    <th className="pb-3">Orden</th>
                    <th className="pb-3">Cliente / Identificador</th>
                    <th className="pb-3">Método</th>
                    <th className="pb-3 text-right">Monto</th>
                    <th className="pb-3 text-center print:hidden">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 print:divide-slate-200">
                  {pedidosFiltrados.map((p) => (
                    <tr key={p.id} className="text-slate-700 print:text-black hover:bg-slate-50/80 transition text-sm break-inside-avoid">
                      <td className="py-3.5 font-black text-slate-900 text-base print:text-sm">#{p.numero_pedido}</td>
                      <td className="py-3.5">
                        <p className="font-bold text-slate-800 print:text-black">{p.cliente_nombre || 'Invitado'}</p>
                        <p className="text-[10px] font-bold text-slate-400 print:text-slate-600 uppercase">{p.tipo_consumo}</p>
                      </td>
                      <td className="py-3.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase print:bg-transparent print:border print:border-black ${p.metodo_pago === 'Efectivo' ? 'bg-emerald-100 text-emerald-800' : p.metodo_pago === 'Tarjeta' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                          {p.metodo_pago}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-black text-slate-900">{formaterMoneda(p.total)}</td>
                      <td className="py-3.5 text-center print:hidden">
                        <button onClick={() => setPedidoSeleccionado(p)} className="p-2 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-xl transition text-slate-500"><Eye size={16}/></button>
                      </td>
                    </tr>
                  ))}
                  {pedidosFiltrados.length === 0 && (
                    <tr><td colSpan="5" className="text-center py-10 font-bold text-slate-400 text-sm">Ninguna orden coincide con los filtros en este rango temporal.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`xl:col-span-1 bg-slate-900 print:bg-white text-white print:text-black rounded-[32px] print:rounded-none p-6 print:p-0 shadow-xl print:shadow-none min-h-[400px] ${!pedidoSeleccionado ? 'print:hidden' : 'print:block print:border-t print:border-black print:mt-6 print:pt-4 break-inside-avoid'}`}>
            {pedidoSeleccionado ? (
              <div className="space-y-6">
                <div className="border-b border-slate-800 print:border-slate-300 pb-4">
                  <h4 className="text-3xl font-black">Orden #{pedidoSeleccionado.numero_pedido}</h4>
                  <p className="text-xs font-bold text-slate-400 print:text-slate-600 mt-1">Identificador Celular: {pedidoSeleccionado.cliente_telefono || pedidoSeleccionado.telefono || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 print:text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-1"><ShoppingBag size={12}/> Productos e Ingredientes</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto print:max-h-none print:overflow-visible">
                    {deserializarCarrito(pedidoSeleccionado.carrito).map((item, idx) => (
                      <div key={idx} className="bg-slate-950 print:bg-slate-50 p-3 rounded-xl border border-slate-800 print:border-slate-300">
                        <div className="flex justify-between font-bold text-sm">
                          <span>{item.cantidad || 1}x {item.nombre}</span><span className="text-blue-400 print:text-blue-800">{formaterMoneda(item.precioFinal || item.precio_base)}</span>
                        </div>
                        {item.extras && item.extras.length > 0 && (
                          <div className="mt-1 pl-2 border-l border-slate-700 print:border-slate-400 text-xs text-slate-400 print:text-slate-600 space-y-0.5 font-medium">
                            {item.extras.map((e, i) => (
                              <div key={i} className="flex justify-between"><span>+ {e.nombre}</span>{Number(e.precioExtra || e.precio || 0) > 0 && <span className="text-emerald-500 print:text-emerald-700">+{formaterMoneda(e.precioExtra || e.precio)}</span>}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-950 print:bg-white p-4 rounded-2xl border border-slate-800 print:border-slate-300 text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-slate-400 print:text-slate-600 font-bold">Liquidación:</span><span className="font-black uppercase">{pedidoSeleccionado.metodo_pago}</span></div>
                  <div className="flex justify-between text-base font-black border-t border-slate-800 print:border-slate-300 pt-2 text-blue-400 print:text-blue-800"><span>Total Cobrado:</span><span>{formaterMoneda(pedidoSeleccionado.total)}</span></div>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-40 py-20 print:hidden">
                <Eye size={48} className="mx-auto mb-2" /><p className="text-sm font-black uppercase">Visor de Ticket</p>
                <p className="text-xs mt-1">Selecciona una orden de la lista para auditar su desglose.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaCortesHistorico;