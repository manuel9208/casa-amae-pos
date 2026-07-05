import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign, Search, ShoppingBag, Eye, CalendarDays, Printer,
  Store, Bike, Calculator, Smartphone, User
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
  const hoyStr = getLocalHoyStr();
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

  // LÓGICA DE FILTRADO (Buscador y Pestañas)
  const pedidosFiltrados = useMemo(() => {
    let filtrados = pedidos;
    if (periodo === 'dia' && corteSeleccionadoId !== 'global') {
      const corteAct = cortesDelDia.find(c => c.id === corteSeleccionadoId);
      if (corteAct) {
        const ids = typeof corteAct.pedidos_incluidos === 'string' ? JSON.parse(corteAct.pedidos_incluidos) : (corteAct.pedidos_incluidos || []);
        filtrados = filtrados.filter(p => ids.includes(p.id));
      } else {
        filtrados = [];
      }
    }
    
    if (filtroCliente) {
      const term = filtroCliente.toLowerCase();
      filtrados = filtrados.filter(p =>
        (p.cliente_nombre && p.cliente_nombre.toLowerCase().includes(term)) ||
        (p.numero_pedido && String(p.numero_pedido).includes(term)) ||
        (p.cliente_telefono && String(p.cliente_telefono).includes(term))
      );
    }
    
    if (filtroMetodoPago !== 'Todos') {
      filtrados = filtrados.filter(p => p.metodo_pago === filtroMetodoPago);
    }
    
    return filtrados.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
  }, [pedidos, filtroCliente, filtroMetodoPago, corteSeleccionadoId, cortesDelDia, periodo]);

  const pedidosDelTurno = useMemo(() => {
    if (periodo !== 'dia') return pedidos;
    if (corteSeleccionadoId === 'global') return pedidos;
    const corteAct = cortesDelDia.find(c => c.id === corteSeleccionadoId);
    if (corteAct) {
      const ids = typeof corteAct.pedidos_incluidos === 'string' ? JSON.parse(corteAct.pedidos_incluidos) : (corteAct.pedidos_incluidos || []);
      return pedidos.filter(p => ids.includes(p.id));
    }
    return [];
  }, [pedidos, corteSeleccionadoId, cortesDelDia, periodo]);

  // MATEMÁTICAS DEL CORTE
  // 👇 FIX: Variables no usadas borradas para limpiar los warnings
  let lEfectivo = 0, lTarjeta = 0, lTransf = 0;
  let dEfectivo = 0, dTarjeta = 0, dTransf = 0, dPlatillos = 0, dExtras = 0, dEnvio = 0;
  let tEnvio = 0, tPlatillos = 0, tExtras = 0;

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
      }
    });
  });

  let fondoCaja = 0, fondoRepartidor = 0, gastosCompras = 0, efectivoDeclaradoCaja = 0;

  if (corteSeleccionadoId === 'global') {
    fondoCaja = cortesDelDia.length > 0 ? Number(cortesDelDia[0].fondo_inicial || 0) : 0;
    gastosCompras = cortesDelDia.reduce((s, c) => s + Number(c.total_gastos || 0), 0);
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

  // 👇 FIX MATEMÁTICO: Reglas de Total Globales e Históricas
  const totalEfectivoDia = lEfectivo + dEfectivo;
  const efectivoEsperadoCaja = corteSeleccionadoId !== 'global' ? (fondoCaja + totalEfectivoDia) - gastosCompras : 0;
  const diferenciaCaja = corteSeleccionadoId !== 'global' ? efectivoDeclaradoCaja - efectivoEsperadoCaja : 0;
  const efectivoEsperadoMotos = (fondoRepartidor + dEfectivo);

  const totalEfectivoFisico = corteSeleccionadoId === 'global' ? cortesDelDia.reduce((s,c) => s + Number(c.total_efectivo || 0) + Number(c.fondo_inicial || 0) + Number(c.fondo_repartidor || 0) - Number(c.total_gastos || 0), 0) : efectivoEsperadoCaja + efectivoEsperadoMotos;
  const totalDigital = corteSeleccionadoId === 'global' ? cortesDelDia.reduce((s,c) => s + Number(c.total_tarjeta || 0) + Number(c.total_transferencia || 0), 0) : lTarjeta + lTransf + dTarjeta + dTransf;
  const totalVentasGlobales = corteSeleccionadoId === 'global' ? cortesDelDia.reduce((s,c) => s + Number(c.venta_platillos || 0) + Number(c.ingresos_extras || 0) + Number(c.cargos_envio || 0), 0) : tPlatillos + tExtras + tEnvio;

  if (cargando) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">Cargando reporte histórico...</div>;
  if (cortesDelDia.length === 0) return (
    <div className="p-10 text-center animate-in fade-in">
      <h2 className="text-2xl font-black text-slate-800 mb-2">Sin Cortes de Caja</h2>
      <p className="text-slate-500 font-bold mb-6">No hay registros guardados para la fecha seleccionada ({fechaFiltro}).</p>
      <input type="date" value={fechaFiltro} max={hoyStr} onChange={(e) => setFechaFiltro(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* CABECERA FILTROS */}
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

      {/* SELECTORES DE TURNO */}
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
              <User size={16}/> Turno {i+1}: {c.usuario_nombre || 'Cajero'} {c.turno_cerrado ? '' : '(Activo)'}
            </button>
          ))}
        </div>
      )}

      {/* TÍTULO DE IMPRESIÓN */}
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
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ventas Totales</p>
            <p className="text-xl font-black text-slate-700 print:text-base">{formaterMoneda(tPlatillos + tExtras + tEnvio)}</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 print:p-3 print:rounded-xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Fondo Inicial</p>
            <p className="text-xl font-black text-slate-700 print:text-base">{formaterMoneda(fondoCaja)}</p>
          </div>
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 print:bg-white print:border-slate-200 print:p-3 print:rounded-xl">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 print:text-slate-500">Ingresos Efectivo</p>
            <p className="text-xl font-black text-emerald-700 print:text-base">+{formaterMoneda(totalEfectivoDia)}</p>
          </div>
          <div className="bg-red-50 p-5 rounded-2xl border border-red-100 relative print:bg-white print:border-slate-200 print:p-3 print:rounded-xl">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 print:text-slate-500">Gastos (Compras)</p>
            <p className="text-xl font-black text-red-700 print:text-base">-{formaterMoneda(gastosCompras)}</p>
          </div>
        </div>

        {corteSeleccionadoId !== 'global' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800 p-6 rounded-3xl shadow-md flex flex-col justify-center text-white print:bg-white print:border print:border-slate-400 print:shadow-none print:p-3 print:text-black">
              <p className="text-slate-300 font-black uppercase tracking-widest mb-1 text-[10px] print:text-slate-800">Efectivo Esperado</p>
              <p className="text-3xl font-black">{formaterMoneda(efectivoEsperadoCaja)}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 print:text-slate-500">(Fondo + Ingresos Efectivo) - Gastos</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-200 shadow-sm flex flex-col justify-center print:border-slate-300">
              <p className="text-blue-600 font-black uppercase tracking-widest mb-1 text-[10px]">Efectivo Declarado</p>
              <p className="text-3xl font-black text-blue-800">{formaterMoneda(efectivoDeclaradoCaja)}</p>
              <p className="text-[9px] font-bold text-blue-400 uppercase mt-2">Por cajero</p>
            </div>
            <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-center print:border-slate-300 ${diferenciaCaja >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`font-black uppercase tracking-widest mb-1 text-[10px] ${diferenciaCaja >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {diferenciaCaja >= 0 ? 'Sobrante a Favor' : 'Faltante en Caja'}
              </p>
              <p className={`text-3xl font-black ${diferenciaCaja >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {diferenciaCaja >= 0 ? '+' : ''}{formaterMoneda(diferenciaCaja)}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Diferencia neta</p>
            </div>
          </div>
        )}
      </div>

      {/* 🛵 SECCIÓN 2: REPARTIDORES */}
      {corteSeleccionadoId !== 'global' && (dPlatillos > 0 || dEnvio > 0) && (
        <div className="bg-indigo-50/50 p-6 md:p-8 rounded-[32px] border border-indigo-100 print:border-none print:p-0 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600 text-white p-2 rounded-xl print:bg-slate-200 print:text-black"><Bike size={24}/></div>
            <h3 className="text-xl font-black text-indigo-900 uppercase tracking-widest print:text-black">2. Repartidores (Motos)</h3>
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
            {corteSeleccionadoId !== 'global' && (
              <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm print:border-slate-300 print:shadow-none">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 print:text-slate-500">Fondo Repartidores</p>
                <p className="text-xl font-black text-indigo-900 print:text-black">{formaterMoneda(fondoRepartidor)}</p>
              </div>
            )}
            <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm print:bg-white print:border-slate-300 print:shadow-none">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 print:text-slate-500">Ingresos Efectivo</p>
              <p className="text-xl font-black text-emerald-700 print:text-black">+{formaterMoneda(dEfectivo)}</p>
            </div>
          </div>
          {corteSeleccionadoId !== 'global' && (
            <div className="bg-indigo-600 p-8 rounded-3xl shadow-lg flex justify-between items-center text-white print:bg-white print:border print:border-slate-400 print:shadow-none print:p-4 print:text-black">
              <div><p className="text-indigo-200 font-black uppercase tracking-widest mb-1 text-sm print:text-slate-800">Efectivo Físico a Entregar por Motos</p><p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider opacity-90 print:text-slate-500">Fondo Repartidores + Pagos en Efectivo de Ruta</p></div>
              <p className="text-5xl font-black print:text-3xl">{formaterMoneda(efectivoEsperadoMotos)}</p>
            </div>
          )}

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
              <p className="text-2xl font-black text-blue-900 print:text-black">
                {formaterMoneda(corteSeleccionadoId === 'global' ? cortesDelDia.reduce((s,c) => s + Number(c.total_tarjeta || 0), 0) : (lTarjeta + dTarjeta))}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm print:shadow-none print:border-slate-200 print:p-3">
              <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1 print:text-slate-500">Total Transferencias</p>
              <p className="text-2xl font-black text-purple-900 print:text-black">
                {formaterMoneda(corteSeleccionadoId === 'global' ? cortesDelDia.reduce((s,c) => s + Number(c.total_transferencia || 0), 0) : (lTransf + dTransf))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 p-6 md:p-8 rounded-[32px] border border-emerald-200 shadow-sm print:border-slate-400 print:p-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-600 text-white p-2 rounded-xl print:bg-slate-200 print:text-black"><Calculator size={24}/></div>
            <h3 className="text-xl font-black text-emerald-900 uppercase tracking-widest print:text-black">4. Gran Total (Cuadre)</h3>
          </div>
          <div className="space-y-4">
            
            {/* 👇 FIX APLICADO: Variables correctas para Fondo Inicial y Gastos */}
            <div className="bg-emerald-100/40 p-4 rounded-2xl border border-emerald-200/60 mb-2 print:border-none print:p-0">
              <div className="flex justify-between items-center text-xs font-bold text-emerald-700 mb-1.5 print:text-slate-700">
                <span>Fondo Inicial Registrado:</span>
                <span>${fondoCaja.toFixed(2)}</span>
              </div>
              {fondoRepartidor > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-emerald-700 mb-1.5 print:text-slate-700">
                  <span>+ Fondo Extra Repartidores:</span>
                  <span>${fondoRepartidor.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs font-bold text-emerald-700 mb-1.5 print:text-slate-700">
                <span>+ Total Ingresos Efectivo:</span>
                <span>${totalEfectivoDia.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-red-500 mb-2 print:text-red-700">
                <span>- Total Gastos (Caja Chica):</span>
                <span>-${gastosCompras.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center border-t border-emerald-200/80 pt-3 mt-1 print:border-slate-300">
                <span className="text-sm font-black text-emerald-800 print:text-black">Total Efectivo Físico Global:</span>
                <span className="text-2xl font-black text-emerald-900 print:text-black">{formaterMoneda(totalEfectivoFisico)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center border-b border-emerald-200 pb-3 print:border-slate-300">
              <span className="text-sm font-bold text-emerald-700 print:text-slate-600">Total Pagos Digitales:</span>
              <span className="text-xl font-black text-emerald-900 print:text-black">{formaterMoneda(totalDigital)}</span>
            </div>
            
            <div className="flex justify-between items-end pt-2">
              <div>
                <span className="text-sm font-black text-emerald-800 uppercase tracking-widest print:text-black">Ventas Brutas Totales:</span>
                <p className="text-[10px] font-bold text-emerald-600 mt-1 bg-emerald-100/50 px-2 py-1 rounded w-fit print:bg-transparent print:p-0 print:text-slate-500">Suma de Platillos + Extras + Envíos</p>
              </div>
              <span className="text-4xl md:text-5xl font-black text-emerald-600 drop-shadow-sm print:text-black">
                {formaterMoneda(totalVentasGlobales)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE ÓRDENES Y VISOR DE TICKETS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col h-[600px] print:h-auto print:border-none print:shadow-none print:p-0">
          <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <ShoppingBag size={20} className="text-blue-500" /> Órdenes Auditadas ({pedidosFiltrados.length})
            </h3>
            <button onClick={() => window.print()} className="hidden md:flex bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs items-center gap-2 hover:bg-slate-700 transition print:hidden">
              <Printer size={14} /> Imprimir Reporte
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="pb-3 px-2">Orden</th>
                  <th className="pb-3 px-2">Cliente / Identificador</th>
                  <th className="pb-3 px-2 text-center">Método</th>
                  <th className="pb-3 px-2 text-center">Estado</th>
                  <th className="pb-3 px-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pedidosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-10 font-bold text-slate-400">
                      No hay órdenes para los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  pedidosFiltrados.map(p => {
                    let dirPura = p.direccion_entrega || '';
                    if (dirPura.includes('|')) dirPura = dirPura.split('|')[0].trim();

                    const isCancelado = p.estado_preparacion === 'Cancelado';
                    const isSeleccionado = pedidoSeleccionado?.id === p.id;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => setPedidoSeleccionado(p)}
                        className={`transition-colors cursor-pointer group ${isSeleccionado ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="py-3 px-2">
                          <span className="font-black text-slate-800">#{p.numero_pedido}</span>
                        </td>
                        <td className="py-3 px-2">
                          <p className={`font-bold ${isCancelado ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {p.cliente_nombre || 'Invitado'}
                          </p>
                          <p className="text-[10px] font-black uppercase text-slate-400 mt-0.5 tracking-widest flex items-center gap-1">
                            {p.tipo_consumo} {p.mesa ? `- Mesa ${p.mesa}` : ''}
                          </p>
                          {p.tipo_consumo === 'Domicilio' && (
                            <p className="text-[10px] font-bold text-slate-500 mt-0.5 truncate max-w-[200px]" title={dirPura}>
                              {dirPura}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                            p.metodo_pago === 'Efectivo' ? 'bg-emerald-100 text-emerald-700' :
                            p.metodo_pago === 'Tarjeta' ? 'bg-blue-100 text-blue-700' :
                            p.metodo_pago === 'Transferencia' ? 'bg-purple-100 text-purple-700' :
                            p.metodo_pago === 'Mixto' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {p.metodo_pago}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                            isCancelado ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {p.estado_preparacion}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={`font-black ${isCancelado ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            ${Number(p.total).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* VISOR DE TICKET */}
        <div className="lg:col-span-1 bg-slate-900 print:bg-white text-white print:text-black rounded-[32px] p-6 shadow-xl flex flex-col h-[600px] print:h-auto print:border print:border-slate-300">
          {pedidoSeleccionado ? (
            <div className="flex flex-col h-full animate-in fade-in">
              <div className="flex justify-between items-start mb-6 border-b border-slate-800 print:border-slate-300 pb-4 shrink-0">
                <div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 print:text-slate-500">Ticket de Venta</p>
                  <h3 className="text-2xl font-black text-white print:text-black tracking-tight">#{pedidoSeleccionado.numero_pedido}</h3>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest ${
                    pedidoSeleccionado.estado_preparacion === 'Cancelado' ? 'bg-red-500/20 text-red-400 print:bg-red-100 print:text-red-600' : 'bg-emerald-500/20 text-emerald-400 print:bg-emerald-100 print:text-emerald-600'
                  }`}>
                    {pedidoSeleccionado.estado_preparacion}
                  </span>
                  <p className="text-xs font-bold text-slate-400 mt-2 print:text-slate-500">
                    {new Date(pedidoSeleccionado.fecha_creacion).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {deserializarCarrito(pedidoSeleccionado.carrito).map((item, idx) => (
                  <div key={idx} className="bg-slate-800 print:bg-slate-50 rounded-xl p-3 border border-slate-700 print:border-slate-200">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-sm text-slate-200 print:text-slate-800 leading-tight">
                        <span className="text-blue-400 print:text-blue-600 font-black mr-1">{item.cantidad}x</span>
                        {item.nombre}
                      </p>
                      <p className="font-black text-emerald-400 print:text-emerald-600 text-sm shrink-0">
                        ${(parseMoney(item.precioFinal) * (item.cantidad || 1)).toFixed(2)}
                      </p>
                    </div>
                    {item.extras && item.extras.length > 0 && (
                      <div className="mt-2 pl-2 border-l border-slate-600 print:border-slate-300">
                        {item.extras.map((e, i) => (
                          <p key={i} className="text-[10px] font-bold text-slate-400 print:text-slate-600 uppercase tracking-wide">
                            + {e.nombre}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
    </div>
  );
};

export default VistaCortesHistorico;