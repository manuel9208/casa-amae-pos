import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign, Search, ShoppingBag, Eye, CalendarDays, Printer,
  Store, Bike, Calculator, Smartphone, User, Clock
} from 'lucide-react';  

const formaterMoneda = (monto) => {
  return "$" + Number(monto).toFixed(2);
};  

// 👇 BLINDAJE DE ZONA HORARIA LOCAL
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
  return {
    localDateStr: `${dYear}-${dMonth}-${dDay}`,
    localMonthStr: `${dYear}-${dMonth}`,
    localYearStr: `${dYear}`
  };
};  

const VistaCortesHistorico = ({ apiUrl }) => {
  const hoyStr = getLocalHoyStr(); // 👈 USO DE FECHA LOCAL
  const [periodo, setPeriodo] = useState('dia');
  const [fechaFiltro, setFechaFiltro] = useState(hoyStr);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroMetodoPago, setFiltroMetodoPago] = useState('Todos');
  const [cargando, setCargando] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);  
  
  const [cortesDelDia, setCortesDelDia] = useState([]);
  const [corteSeleccionadoId, setCorteSeleccionadoId] = useState('global');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);  

  useEffect(() => {
    fetch(`${apiUrl}/usuarios`).then(r => r.json()).then(data => {
      setUsuarios(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, [apiUrl]);  

  const getNombreEmpleado = (id) => {
    const emp = usuarios.find(u => Number(u.id) === Number(id));
    return emp ? emp.nombre : `Conductor #${id}`;
  };  

  const cargarPedidosHistoricos = useCallback(async () => {
    setCargando(true);
    try {
      const resPed = await fetch(`${apiUrl}/pedidos/historial?periodo=${periodo}&fecha=${fechaFiltro}`);
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
      if (periodo === 'dia') {
        const resCorte = await fetch(`${apiUrl}/cortes/historial?fecha=${fechaFiltro}&completo=true`);
        if (resCorte.ok) {
          const dataC = await resCorte.json();
          const arrayCortes = Array.isArray(dataC) ? dataC.sort((a,b) => a.id - b.id) : [dataC];
          setCortesDelDia(arrayCortes);
        } else {
          setCortesDelDia([]);
        }
      } else {
        setCortesDelDia([]);
      }
      setCorteSeleccionadoId('global');
    } catch (e) {
    } finally {
      setCargando(false);
    }
  }, [periodo, fechaFiltro, apiUrl]);  

  useEffect(() => {
    cargarPedidosHistoricos();
    setPedidoSeleccionado(null);
  }, [cargarPedidosHistoricos]);  

  const deserializarCarrito = (carritoRaw) => {
    if (!carritoRaw) return [];
    return typeof carritoRaw === 'string' ? JSON.parse(carritoRaw) : carritoRaw;
  };  

  const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g,"")) || 0;  

  const pedidosDelTurno = useMemo(() => {
    if (corteSeleccionadoId === 'global' || cortesDelDia.length === 0) return pedidos;  
    const index = cortesDelDia.findIndex(c => c.id === corteSeleccionadoId);
    if (index === -1) return pedidos;  
    const cAct = cortesDelDia[index];
    const dStart = index > 0 ? new Date(cortesDelDia[index-1].fecha_creacion) : new Date(fechaFiltro + 'T00:00:00');
    const dEnd = new Date(cAct.fecha_creacion);  
    return pedidos.filter(p => {
      const d = new Date(p.fecha_creacion);
      return d > dStart && d <= dEnd;
    });
  }, [pedidos, corteSeleccionadoId, cortesDelDia, fechaFiltro]);  

  const pedidosTabla = pedidosDelTurno.filter(p => {
    if (filtroCliente.trim() !== '') {
      const termino = filtroCliente.toLowerCase();
      let extraido = p.cliente_nombre || p.cliente?.nombre || '';
      if (!extraido && p.direccion_entrega) {
        extraido = p.direccion_entrega.split('|')[0].replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
      }
      const nombreCliente = String(extraido || 'Invitado').toLowerCase();
      const telCliente = String(p.cliente_telefono || p.telefono || '');
      if (!nombreCliente.includes(termino) && !telCliente.includes(termino)) return false;
    }
    if (filtroMetodoPago !== 'Todos' && p.metodo_pago !== filtroMetodoPago) return false;
    return true;
  });  

  let lEfectivo = 0, lTarjeta = 0, lTransf = 0, lPlatillos = 0, lExtras = 0;
  let dEfectivo = 0, dTarjeta = 0, dTransf = 0, dPlatillos = 0, dExtras = 0, dEnvio = 0;
  let tPlatillos = 0, tExtras = 0, tEnvio = 0;  

  pedidosDelTurno.forEach(p => {
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

    if (isDomicilio) { dEfectivo += efe; dTarjeta += tar; dTransf += tra; dEnvio += parseMoney(p.costo_envio); tEnvio += parseMoney(p.costo_envio); }
    else { lEfectivo += efe; lTarjeta += tar; lTransf += tra; tEnvio += parseMoney(p.costo_envio); }  
    
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
        tExtras += calcExtra; tPlatillos += calcPlat;
        if (isDomicilio) { dExtras += calcExtra; dPlatillos += calcPlat; }
        else { lExtras += calcExtra; lPlatillos += calcPlat; }
      }
    });
  });  

  let fondoCaja = 0, fondoRepartidor = 0, gastosCompras = 0, efectivoDeclaradoCaja = 0;
  
  if (corteSeleccionadoId === 'global') {
    fondoCaja = cortesDelDia.reduce((s, c) => s + Number(c.fondo_inicial || 0), 0);
    fondoRepartidor = cortesDelDia.reduce((s, c) => s + Number(c.fondo_repartidor || 0), 0);
    gastosCompras = cortesDelDia.reduce((s, c) => s + Number(c.total_gastos || 0), 0);
    efectivoDeclaradoCaja = cortesDelDia.reduce((s, c) => s + Number(c.efectivo_cajon || 0), 0);
  } else {
    const cAct = cortesDelDia.find(c => c.id === corteSeleccionadoId);
    if (cAct) {
      fondoCaja = Number(cAct.fondo_inicial || 0);
      fondoRepartidor = Number(cAct.fondo_repartidor || 0);
      gastosCompras = Number(cAct.total_gastos || 0);
      efectivoDeclaradoCaja = Number(cAct.efectivo_cajon || 0);
    }
  }  

  const repsData = {};
  pedidosDelTurno.filter(p => p.tipo_consumo === 'Domicilio' && p.repartidor_id).forEach(p => {
    const rId = p.repartidor_id;
    if(!repsData[rId]) repsData[rId] = { nombre: getNombreEmpleado(rId), envios: 0, efectivo: 0, digital: 0 };
    repsData[rId].envios++;  
    if (!['Cancelado', 'Pendiente', 'Por Confirmar'].includes(p.estado_preparacion)) {
      if (['Efectivo', 'Pendiente', 'Por Cobrar'].includes(p.metodo_pago)) repsData[rId].efectivo += parseMoney(p.total);
      else if (p.metodo_pago !== 'Mixto') repsData[rId].digital += parseMoney(p.total);
    }
  });  

  const efectivoEsperadoCaja = (fondoCaja + lEfectivo) - gastosCompras;
  const diferenciaCaja = efectivoDeclaradoCaja - efectivoEsperadoCaja;
  const efectivoEsperadoMotos = (fondoRepartidor + dEfectivo);
  const totalEfectivoFisico = efectivoEsperadoCaja + efectivoEsperadoMotos;  
  const totalDigital = lTarjeta + lTransf + dTarjeta + dTransf;
  const totalVentasGlobales = tPlatillos + tExtras + tEnvio;  

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
          <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm cursor-pointer" />
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

      {/* 👇 SOLUCIÓN APLICADA: Ahora mostrará las pestañas SIEMPRE que haya al menos 1 corte */}
      {cortesDelDia.length > 0 && periodo === 'dia' && (
        <div className="mb-6 flex gap-2 overflow-x-auto print:hidden bg-slate-100 p-2 rounded-2xl custom-scrollbar">
          <button
            onClick={() => setCorteSeleccionadoId('global')}
            className={`px-6 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap ${corteSeleccionadoId === 'global' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            Día Completo (Global)
          </button>
          {cortesDelDia.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setCorteSeleccionadoId(c.id)}
              className={`px-6 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap flex items-center gap-2 ${corteSeleccionadoId === c.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <User size={16}/> Turno {i+1}: {c.usuario_nombre || 'Cajero'}
            </button>
          ))}
        </div>
      )}  

      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-black text-slate-900">Reporte de Cortes y Auditoría</h1>
        <p className="text-slate-500 font-bold">Fecha de referencia: {fechaFiltro} | Rango: {corteSeleccionadoId === 'global' ? 'DÍA COMPLETO' : 'TURNO ESPECÍFICO'}</p>
        <hr className="mt-4 border-slate-300" />
      </div>  

      {/* 🟢 SECCIÓN 1: CAJA PRINCIPAL */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-800 text-white p-2 rounded-xl print:bg-slate-200 print:text-black"><Store size={24}/></div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest print:text-black">1. Caja Principal (Mostrador)</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 print:p-3 print:rounded-xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ventas (Mostrador)</p>
            <p className="text-xl font-black text-slate-700 print:text-base">{formaterMoneda(lPlatillos + lExtras)}</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 print:p-3 print:rounded-xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Fondo Inicial</p>
            <p className="text-xl font-black text-slate-700 print:text-base">{formaterMoneda(fondoCaja)}</p>
          </div>
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 print:bg-white print:border-slate-200 print:p-3 print:rounded-xl">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 print:text-slate-500">Ingresos Efectivo</p>
            <p className="text-xl font-black text-emerald-700 print:text-base">+{formaterMoneda(lEfectivo)}</p>
          </div>
          <div className="bg-red-50 p-5 rounded-2xl border border-red-100 relative print:bg-white print:border-slate-200 print:p-3 print:rounded-xl">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 print:text-slate-500">Gastos (Compras)</p>
            <p className="text-xl font-black text-red-700 print:text-base">-{formaterMoneda(gastosCompras)}</p>
          </div>
        </div>

        {/* COMPARATIVA DE CUADRE DE CAJA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 p-6 rounded-3xl shadow-md flex flex-col justify-center text-white print:bg-white print:border print:border-slate-400 print:shadow-none print:p-3 print:text-black">
            <p className="text-slate-300 font-black uppercase tracking-widest mb-1 text-[10px] print:text-slate-800">Efectivo Esperado</p>
            <p className="text-3xl font-black">{formaterMoneda(efectivoEsperadoCaja)}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 print:text-slate-500">(Fondo + Ventas) - Gastos</p>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-200 shadow-sm flex flex-col justify-center print:border-slate-300">
            <p className="text-blue-600 font-black uppercase tracking-widest mb-1 text-[10px]">Efectivo Declarado</p>
            <p className="text-3xl font-black text-blue-800">{formaterMoneda(efectivoDeclaradoCaja)}</p>
            <p className="text-[9px] font-bold text-blue-400 uppercase mt-2">Entregado por cajero</p>
          </div>

          <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-center print:border-slate-300 ${diferenciaCaja < 0 ? 'bg-red-50 border-red-200' : diferenciaCaja > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`font-black uppercase tracking-widest mb-1 text-[10px] ${diferenciaCaja < 0 ? 'text-red-600' : diferenciaCaja > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
              {diferenciaCaja < 0 ? 'Faltante en Caja' : diferenciaCaja > 0 ? 'Sobrante en Caja' : 'Cuadre Exacto'}
            </p>
            <p className={`text-3xl font-black ${diferenciaCaja < 0 ? 'text-red-600' : diferenciaCaja > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
              {diferenciaCaja > 0 ? '+' : ''}{formaterMoneda(diferenciaCaja)}
            </p>
            <p className={`text-[9px] font-bold uppercase mt-2 ${diferenciaCaja < 0 ? 'text-red-400' : diferenciaCaja > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
              Diferencia neta
            </p>
          </div>
        </div>
      </div>  

      {/* 🛵 SECCIÓN 2: MOTOS Y LOGÍSTICA */}
      {(!cargando) && (
        <div className="bg-indigo-50 p-6 md:p-8 rounded-[32px] shadow-sm border border-indigo-100 mb-6 print:border-slate-400 print:bg-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-sm print:bg-slate-200 print:text-black"><Bike size={24}/></div>
            <div>
              <h3 className="text-2xl font-black text-indigo-900 tracking-tight print:text-black">2. Repartidores (Motos)</h3>
            </div>
          </div>  
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-3xl border border-indigo-100 flex flex-col justify-center shadow-sm print:border-slate-300 print:shadow-none">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 print:text-slate-500">Venta (Domicilio)</p>
              <p className="text-xl font-black text-indigo-900 print:text-black">{formaterMoneda(dPlatillos + dExtras)}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-indigo-100 flex flex-col justify-center shadow-sm print:border-slate-300 print:shadow-none">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 print:text-slate-500">Envíos Cobrados</p>
              <p className="text-xl font-black text-indigo-900 print:text-black">{formaterMoneda(dEnvio)}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm print:border-slate-300 print:shadow-none">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 print:text-slate-500">Fondo Repartidores</p>
              <p className="text-xl font-black text-indigo-900 print:text-black">{formaterMoneda(fondoRepartidor)}</p>
            </div>
            <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm print:bg-white print:border-slate-300 print:shadow-none">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 print:text-slate-500">Ingresos Efectivo</p>
              <p className="text-xl font-black text-emerald-700 print:text-black">+{formaterMoneda(dEfectivo)}</p>
            </div>
          </div>
          <div className="bg-indigo-600 p-8 rounded-3xl shadow-lg flex justify-between items-center text-white print:bg-white print:border print:border-slate-400 print:shadow-none print:p-4 print:text-black">
            <div><p className="text-indigo-200 font-black uppercase tracking-widest mb-1 text-sm print:text-slate-800">Efectivo Físico a Entregar por Motos</p><p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider opacity-90 print:text-slate-500">Fondo Repartidores + Pagos en Efectivo de Ruta</p></div>
            <p className="text-5xl font-black print:text-3xl">{formaterMoneda(efectivoEsperadoMotos)}</p>
          </div>
          
          {Object.keys(repsData).length > 0 && (
            <div className="mt-6 pt-6 border-t border-indigo-200 print:border-slate-300">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 print:text-black">Desglose por Repartidor en este Turno</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Object.values(repsData).map((r, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex flex-col gap-2 print:border-slate-300 print:shadow-none">
                    <p className="font-black text-slate-800 text-sm flex items-center justify-between">
                      {r.nombre}
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{r.envios} entregas</span>
                    </p>
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span className="font-bold text-slate-500">Efectivo Recaudado:</span>
                      <span className="font-black text-pink-600">{formaterMoneda(r.efectivo)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Pagado Línea/Tarjeta:</span>
                      <span className="font-black text-blue-600">{formaterMoneda(r.digital)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}  

      {/* 💳 SECCIÓN 3: PAGOS DIGITALES Y CUADRE GLOBAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-blue-50/50 p-6 md:p-8 rounded-[32px] border border-blue-100 print:border-none print:p-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600 text-white p-2 rounded-xl print:bg-slate-200 print:text-black"><Smartphone size={24}/></div>
            <h3 className="text-xl font-black text-blue-900 uppercase tracking-widest print:text-black">3. Pagos Digitales</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm print:shadow-none print:border-slate-200 print:p-3">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 print:text-slate-500">Total Tarjetas</p>
              <p className="text-2xl font-black text-blue-900 print:text-black">{formaterMoneda(lTarjeta + dTarjeta)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm print:shadow-none print:border-slate-200 print:p-3">
              <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1 print:text-slate-500">Total Transferencias</p>
              <p className="text-2xl font-black text-purple-900 print:text-black">{formaterMoneda(lTransf + dTransf)}</p>
            </div>
          </div>
        </div>  

        <div className="bg-emerald-50 p-6 md:p-8 rounded-[32px] border border-emerald-200 shadow-sm print:border-slate-400 print:p-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-600 text-white p-2 rounded-xl print:bg-slate-200 print:text-black"><Calculator size={24}/></div>
            <h3 className="text-xl font-black text-emerald-900 uppercase tracking-widest print:text-black">4. Gran Total (Cuadre)</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-200 pb-3 print:border-slate-300">
              <span className="text-sm font-bold text-emerald-700 print:text-slate-600">Total Efectivo Físico Global:</span>
              <span className="text-xl font-black text-emerald-900 print:text-black">{formaterMoneda(totalEfectivoFisico)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-emerald-200 pb-3 print:border-slate-300">
              <span className="text-sm font-bold text-emerald-700 print:text-slate-600">Total Pagos Digitales:</span>
              <span className="text-xl font-black text-emerald-900 print:text-black">{formaterMoneda(totalDigital)}</span>
            </div>
            <div className="flex justify-between items-end pt-2">
              <div>
                <span className="text-sm font-black text-emerald-800 uppercase tracking-widest print:text-black">Ventas Brutas Totales:</span>
                <p className="text-[10px] font-bold text-emerald-600 print:text-slate-500 mt-1">Suma de Platillos + Extras + Envíos</p>
              </div>
              <span className="text-4xl font-black text-emerald-600 print:text-black">{formaterMoneda(totalVentasGlobales)}</span>
            </div>
          </div>
        </div>
      </div>  

      {/* 📜 SECCIÓN TABLA TICKETS Y VISOR LATERAL RESTAURADO */}
      {cargando ? (
        <div className="text-center py-20 animate-pulse font-bold text-slate-500 print:hidden">Cargando transacciones históricas...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start mt-8">
          
          <div className="xl:col-span-2 bg-white rounded-[32px] print:rounded-none p-6 print:p-0 border border-slate-200 print:border-none shadow-sm print:shadow-none">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                🧾 Órdenes Auditadas ({pedidosTabla.length})
              </h3>
              <button onClick={() => window.print()} className="print:hidden flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:bg-slate-700 transition active:scale-95">
                <Printer size={16}/> Imprimir Reporte
              </button>
            </div>  
            <div className="overflow-x-auto print:overflow-visible custom-scrollbar max-h-[600px] print:max-h-none">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 print:static">
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest print:text-black">
                    <th className="pb-3">Orden</th>
                    <th className="pb-3">Cliente / Identificador</th>
                    <th className="pb-3">Método</th>
                    <th className="pb-3 text-center">Estado</th>
                    <th className="pb-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 print:divide-slate-200">
                  {pedidosTabla.map((p) => {
                    let nombreMostrar = p.cliente_nombre || p.cliente?.nombre || '';
                    if (!nombreMostrar && p.direccion_entrega) {
                      const partes = p.direccion_entrega.split('|').map(x => x.trim());
                      nombreMostrar = partes[0].replace(/TEL:\s*\d*/g, '').replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger').replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
                    }
                    nombreMostrar = nombreMostrar || 'Invitado';  
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => setPedidoSeleccionado(p)}
                        className={`text-slate-700 print:text-black transition text-sm break-inside-avoid cursor-pointer ${pedidoSeleccionado?.id === p.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="py-3.5 font-black text-slate-900 text-base print:text-sm">#{p.numero_pedido}</td>
                        <td className="py-3.5">
                          <p className="font-bold text-slate-800 print:text-black">{nombreMostrar}</p>
                          <p className="text-[10px] font-bold text-slate-400 print:text-slate-600 uppercase">{p.tipo_consumo}</p>
                        </td>
                        <td className="py-3.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase print:bg-transparent print:border print:border-black ${
                            p.metodo_pago === 'Efectivo' ? 'bg-emerald-100 text-emerald-700' :
                            p.metodo_pago === 'Tarjeta' ? 'bg-blue-100 text-blue-700' :
                            p.metodo_pago === 'Transferencia' ? 'bg-purple-100 text-purple-700' :
                            p.metodo_pago === 'Mixto' ? 'bg-orange-100 text-orange-700' :
                            p.metodo_pago === 'Comida Personal' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {p.metodo_pago}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase print:bg-transparent print:border print:border-black ${
                            p.estado_preparacion === 'Cancelado' ? 'bg-red-100 text-red-600' :
                            p.estado_preparacion === 'Entregado' || p.estado_preparacion === 'Finalizado' || p.estado_preparacion === 'Liquidado' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {p.estado_preparacion}
                          </span>
                        </td>
                        <td className={`py-3.5 font-black text-right print:text-black pr-4 ${p.estado_preparacion === 'Cancelado' ? 'text-slate-400 line-through' : p.metodo_pago === 'Comida Personal' ? 'text-indigo-400' : 'text-slate-900'}`}>
                          {formaterMoneda(p.total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>  

          {/* 👇 RESTAURADO Y MEJORADO: VISOR LATERAL DE TICKETS */}
          <div className="xl:col-span-1 bg-slate-900 print:bg-white rounded-[32px] p-6 border border-slate-800 print:border-slate-300 shadow-xl h-full flex flex-col print:shadow-none break-inside-avoid">
            {pedidoSeleccionado ? (
              <div className="flex flex-col h-full animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center border-b border-slate-800 print:border-slate-300 pb-4 mb-4">
                  <div>
                    <h4 className="text-xl font-black text-white print:text-black">Orden #{pedidoSeleccionado.numero_pedido}</h4>
                    <p className="text-xs font-bold text-slate-400 print:text-slate-600 mt-1 flex items-center gap-1">
                      <Clock size={12}/> {new Date(pedidoSeleccionado.fecha_creacion).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md print:border print:border-black ${pedidoSeleccionado.tipo_consumo === 'Domicilio' ? 'bg-purple-500/20 text-purple-300 print:text-purple-700' : 'bg-blue-500/20 text-blue-300 print:text-blue-700'}`}>
                    {pedidoSeleccionado.tipo_consumo}
                  </span>
                </div>
                
                <div className="mb-4 bg-slate-800 print:bg-slate-50 p-3 rounded-xl print:border print:border-slate-200">
                  <h4 className="text-sm font-black text-slate-200 print:text-black truncate">{pedidoSeleccionado.cliente_nombre || pedidoSeleccionado.cliente?.nombre || 'Invitado'}</h4>
                  <p className="text-xs font-bold text-slate-400 print:text-slate-600 mt-1">Identificador Celular: {pedidoSeleccionado.cliente_telefono || pedidoSeleccionado.telefono || 'N/A'}</p>
                </div>
                
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-500 print:text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-1"><ShoppingBag size={12}/> Productos e Ingredientes</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto print:max-h-none print:overflow-visible custom-scrollbar">
                    {deserializarCarrito(pedidoSeleccionado.carrito).map((item, idx) => (
                      <div key={idx} className="bg-slate-950 print:bg-slate-50 p-3 rounded-xl border border-slate-800 print:border-slate-300">
                        <div className="flex justify-between font-bold text-sm text-slate-200 print:text-black">
                          <span className="truncate pr-2">{item.cantidad || 1}x {item.nombre}</span>
                          <span className="text-blue-400 print:text-blue-800">{formaterMoneda(item.precioFinal || item.precio_base)}</span>
                        </div>
                        {item.extras && item.extras.length > 0 && (
                          <div className="mt-1.5 pl-2 border-l-2 border-slate-700 print:border-slate-300 text-[10px] md:text-xs text-slate-400 print:text-slate-600 space-y-0.5 font-medium">
                            {item.extras.map((e, i) => (
                              <div key={i} className="flex justify-between">
                                <span>+ {e.nombre}</span>
                                {Number(e.precioExtra || e.precio || 0) > 0 && <span className="text-emerald-500 print:text-emerald-700">+{formaterMoneda(e.precioExtra || e.precio)}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-slate-950 print:bg-slate-50 p-4 rounded-2xl border border-slate-800 print:border-slate-300 text-sm space-y-2 mt-4 shrink-0 shadow-inner">
                  <div className="flex justify-between"><span className="text-slate-400 print:text-slate-600 font-bold">Liquidación:</span><span className="font-black uppercase text-slate-200 print:text-black">{pedidoSeleccionado.metodo_pago}</span></div>
                  <div className="flex justify-between text-base font-black border-t border-slate-800 print:border-slate-300 pt-2 mt-2"><span className="text-slate-400 print:text-slate-800">Total:</span><span className="text-emerald-400 print:text-emerald-700 text-xl">{formaterMoneda(parseMoney(pedidoSeleccionado.total))}</span></div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 print:text-slate-400 opacity-60">
                <Eye size={64} className="mx-auto mb-4 opacity-50"/>
                <p className="text-xl font-bold">Visor de Tickets</p>
                <p className="text-sm mt-1 px-4">Selecciona una orden de la tabla para ver el detalle de los productos.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};  

export default VistaCortesHistorico;