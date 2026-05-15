import React, { useState, useEffect } from 'react';
import { BellRing, MessageSquare, XCircle, CheckCircle2, Phone, AlertTriangle, DollarSign, Check, ChefHat, Clock, FileText, CreditCard, Smartphone, MapPin, TrendingDown, PlusCircle, Eye, Menu, Wallet, Map, LayoutGrid, Utensils, Trash2 } from 'lucide-react';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const VistasCaja = ({
  vistaActiva, subVistaHistorial, setSubVistaHistorial, pedidos, mesas, pedidosConAlerta, pedidosPorConfirmar,
  pendientesDePago, listosParaEntregar, mesasPagadas, fondoCaja, configGlobal,
  gastosDia, 
  abrirModalResolver, limpiarAlerta, setModalPago, setMontoRecibido, actualizarEstadoPedido, confirmarPedidoRecoger, lanzarImpresion,
  setModalZonaEnvio,
  setModalAgregarExtra,
  setModalEditarPedido, 
  isSubmitting,
  setModalVerDetalle,
  setMenuAbiertoCaja 
}) => {

  const [vistaMapa, setVistaMapa] = useState('plano'); 
  const [zonaPlanoActiva, setZonaPlanoActiva] = useState('');
  const [limpiandoMesas, setLimpiandoMesas] = useState(false);
  const [modalLiberarMesa, setModalLiberarMesa] = useState(null);

  useEffect(() => {
     if (mesas && mesas.length > 0 && !zonaPlanoActiva) {
         const zonasUnicas = [...new Set(mesas.map(m => m.zona))];
         if(zonasUnicas.length > 0) setZonaPlanoActiva(zonasUnicas[0]);
     }
  }, [mesas, zonaPlanoActiva]);

  const getIconoPago = (metodo) => { 
    if(metodo==='Tarjeta') return <CreditCard size={16}/>; 
    if(metodo==='Transferencia') return <Smartphone size={16}/>; 
    if(metodo==='Mixto') return <Wallet size={16}/>; 
    if(metodo==='Pendiente' || metodo==='Por Cobrar') return <Clock size={16}/>;
    return <DollarSign size={16}/>; 
  };

  const getTelefonoExtraido = (p) => {
    let tel = p.cliente_telefono || p.cliente?.telefono || p.telefono;
    if (!tel && typeof p.direccion_entrega === 'string') {
        if (p.direccion_entrega.includes('TEL:')) {
            tel = p.direccion_entrega.split('TEL:')[1].split('|')[0].trim();
        } else if (p.direccion_entrega.includes('CONTACTO:')) {
            tel = p.direccion_entrega.split('CONTACTO:')[1].split('|')[0].trim();
        }
    }
    if (tel) {
        const t = String(tel).trim();
        if (t !== '' && t !== 'null' && t !== 'undefined') return t;
    }
    return null;
  };

  const renderItemsConfirmacion = (carritoRaw) => {
      if (!carritoRaw) return null;
      const items = typeof carritoRaw === 'string' ? JSON.parse(carritoRaw) : carritoRaw;
      return items.map((item, idx) => (
         <div key={idx} className="mb-2 text-left bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
           <p className="text-sm font-black text-slate-800">{item.cantidad || 1}x {item.nombre}</p>
           {item.extras && item.extras.length > 0 && (
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 ml-2 border-l-2 border-slate-200 pl-2">
                 {item.extras.map(e => e.nombre).join(' • ')}
               </p>
           )}
         </div>
      ));
  };

  const renderBotonAgregarExtra = (pedido) => {
      if (!pedido.carrito) return null;
      const items = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : pedido.carrito;
      if (items.length === 0) return null;
      const item = items[0];

      return (
         <button 
            disabled={isSubmitting || limpiandoMesas}
            onClick={() => setModalAgregarExtra({ pedidoOriginal: pedido, itemIndex: 0, itemSeleccionado: item })}
            className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 border border-emerald-200 disabled:opacity-50"
         >
            <PlusCircle size={15} /> Cobrar Extra
         </button>
      );
  };

  const renderBotonVerDetalle = (pedido) => (
    <button 
        disabled={isSubmitting || limpiandoMesas}
        onClick={() => setModalVerDetalle(pedido)}
        className="w-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 border border-slate-200 shadow-sm disabled:opacity-50"
    >
        <Eye size={15} /> Ver Platillos
    </button>
  );

  const renderBotonEditar = (pedido) => (
    <button 
        disabled={isSubmitting || limpiandoMesas}
        onClick={() => setModalEditarPedido(pedido)}
        className="w-full bg-blue-50 text-blue-700 hover:bg-blue-500 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 border border-blue-200 shadow-sm disabled:opacity-50"
    >
        ✏️ Editar Info
    </button>
  );

  const liberarMesaMagicamente = async (numero_mesa) => {
      try {
          const paqueteFantasma = { 
            cliente_id: null, tipo_consumo: 'Local', metodo_pago: 'Efectivo', 
            total: 0, carrito: [], origen: 'Caja', 
            direccion_entrega: 'Limpieza de Mesa', descuento_puntos: 0, 
            estado_preparacion: 'Pendiente', mesa: numero_mesa 
          };
          
          const res = await fetch(`${apiUrl}/pedidos`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify(paqueteFantasma) 
          });
          
          if (res.ok) {
              const data = await res.json();
              await fetch(`${apiUrl}/pedidos/${data.id}/estado`, { 
                  method: 'PUT', 
                  headers: { 'Content-Type': 'application/json' }, 
                  body: JSON.stringify({ estado_preparacion: 'Cancelado' }) 
              });
          }
      } catch (e) {
          console.error("Error liberando mesa", e);
      }
  };

  const confirmarLiberacionMesa = async () => {
      setLimpiandoMesas(true);
      if (modalLiberarMesa.todas) {
          const mesasOcupadas = mesas.filter(m => m.estado !== 'Libre');
          for (let m of mesasOcupadas) {
              await liberarMesaMagicamente(m.numero_mesa);
          }
      } else {
          await liberarMesaMagicamente(modalLiberarMesa.mesa);
      }
      setLimpiandoMesas(false);
      setModalLiberarMesa(null);
  };

  const totalGastos = (gastosDia || []).reduce((sum, gasto) => sum + Number(gasto.costo_total), 0);

  const pedidosValidos = pedidos.filter(p => p.estado_preparacion !== 'Pendiente' && p.estado_preparacion !== 'Cancelado');
  let totalPlatillos = 0;
  let totalExtras = 0;
  let totalEnvio = 0;

  pedidosValidos.forEach(p => {
    totalEnvio += Number(p.costo_envio || 0);

    const items = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : (p.carrito || []);
    items.forEach(item => {
        const qty = Number(item.cantidad || 1);
        let extrasDelItem = 0;
        
        if (item.extras && Array.isArray(item.extras)) {
            item.extras.forEach(ext => {
                extrasDelItem += Number(ext.precioExtra || ext.precio_extra || ext.precio || 0);
            });
        }
        totalExtras += (extrasDelItem * qty);
        
        const precioTotalItem = Number(item.precioFinal || item.precio_base || item.precio || 0);
        const precioBase = precioTotalItem - extrasDelItem;
        totalPlatillos += (precioBase * qty);
    });
  });

  const totalEfectivoVentas = pedidosValidos.reduce((sum, p) => {
    if (p.metodo_pago === 'Efectivo') return sum + Number(p.total);
    if (p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
       const pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos;
       const ef = pm.find(x => x.metodo === 'Efectivo');
       if (ef) return sum + Number(ef.monto);
    }
    return sum;
  }, 0);

  const totalTarjetaVentas = pedidosValidos.reduce((sum, p) => {
    if (p.metodo_pago === 'Tarjeta') return sum + Number(p.total);
    if (p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
       const pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos;
       const tar = pm.find(x => x.metodo === 'Tarjeta');
       if (tar) return sum + Number(tar.monto);
    }
    return sum;
  }, 0);

  const totalTransferenciaVentas = pedidosValidos.reduce((sum, p) => {
    if (p.metodo_pago === 'Transferencia') return sum + Number(p.total);
    if (p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
       const pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos;
       const trans = pm.find(x => x.metodo === 'Transferencia');
       if (trans) return sum + Number(trans.monto);
    }
    return sum;
  }, 0);

  const ordenesEnCaja = pendientesDePago || [];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
      
      {/* ENCABEZADO RESPONSIVO MÓVIL */}
      <div className="lg:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-30 shrink-0">
         <h1 className="text-xl font-black flex items-center gap-2 text-emerald-400">
            <DollarSign size={24} /> CAJA
         </h1>
         <button onClick={() => setMenuAbiertoCaja(true)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
            <Menu size={24} />
         </button>
      </div>

      {/* ALERTAS DE COCINA */}
      {pedidosConAlerta.length > 0 && (
        <div className="w-full p-4 space-y-2 z-10 shrink-0">
          {pedidosConAlerta.map(p => {
            const mensajeVisible = p.alerta_cocina.replace(/\[IDX:\d+\]\s*/g, '');
            return (
            <div key={`alerta-${p.id}`} className="bg-red-500 text-white p-4 rounded-2xl shadow-lg flex justify-between items-center animate-in slide-in-from-top">
              <div className="flex items-center gap-4">
                 <BellRing className="animate-bounce" size={28} />
                 <div>
                    <p className="font-black text-lg">⚠️ ALERTA EN ORDEN #{p.numero_pedido} ({p.cliente_nombre || p.cliente?.nombre || 'Invitado'})</p>
                    <p className="font-medium text-red-100">{mensajeVisible}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                <button 
                   disabled={isSubmitting || limpiandoMesas} 
                   onClick={() => abrirModalResolver(p)} 
                   className="bg-white text-red-600 hover:bg-red-50 px-6 py-2 rounded-xl font-black shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                   <MessageSquare size={18}/> Resolver con Cliente
                </button>
                <button 
                   disabled={isSubmitting || limpiandoMesas} 
                   onClick={() => limpiarAlerta(p.id)} 
                   className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-xl font-bold shadow-sm transition disabled:opacity-50" 
                   title="Ocultar sin responder"
                >
                   <XCircle size={18}/>
                </button>
              </div>
            </div>
          )})}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-10">
        
        {/* VISTA: MAPA DE MESAS */}
        {vistaActiva === 'mesas' && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
               <div className="flex items-center gap-4">
                   <h2 className="text-4xl font-black text-slate-800 flex items-center gap-3"><Map size={36} className="text-indigo-600"/> Mapa de Mesas</h2>
                   {mesas && mesas.some(m => m.estado !== 'Libre') && (
                       <button 
                          onClick={() => setModalLiberarMesa({ todas: true })} 
                          disabled={limpiandoMesas || isSubmitting}
                          className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm border border-red-200 flex items-center gap-2 disabled:opacity-50"
                       >
                          <Trash2 size={16}/> {limpiandoMesas ? 'Limpiando...' : 'Forzar Liberación de Todas'}
                       </button>
                   )}
               </div>
               
               {mesas && mesas.length > 0 && (
                 <div className="flex flex-col sm:flex-row gap-4 items-center">
                   
                   {/* PESTAÑAS DE ZONAS (SOLO VISIBLES EN MODO PLANO VISUAL) */}
                   {vistaMapa === 'plano' && (
                      <div className="flex gap-2 overflow-x-auto max-w-[50vw]">
                         {[...new Set(mesas.map(m => m.zona))].map(zona => (
                            <button
                               key={zona}
                               onClick={() => setZonaPlanoActiva(zona)}
                               className={`px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${zonaPlanoActiva === zona ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                            >
                               {zona}
                            </button>
                         ))}
                      </div>
                   )}

                   <div className="flex bg-slate-200 p-1 rounded-xl shrink-0">
                     <button 
                        onClick={() => setVistaMapa('plano')} 
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${vistaMapa === 'plano' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                       <Map size={16}/> Plano Visual
                     </button>
                     <button 
                        onClick={() => setVistaMapa('cuadricula')} 
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${vistaMapa === 'cuadricula' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                       <LayoutGrid size={16}/> Cuadrícula
                     </button>
                   </div>
                 </div>
               )}
            </div>

            {!mesas || mesas.length === 0 ? (
               <div className="text-center text-slate-400 mt-20">
                  <Map size={64} className="mx-auto mb-4 opacity-30"/>
                  <p className="text-2xl font-bold">No hay mesas configuradas aún.</p>
               </div>
            ) : vistaMapa === 'cuadricula' ? (
               <div className="space-y-8 animate-in fade-in">
                 {Object.entries(
                    mesas.reduce((acc, mesa) => {
                      if (!acc[mesa.zona]) acc[mesa.zona] = [];
                      acc[mesa.zona].push(mesa);
                      return acc;
                    }, {})
                  ).map(([zona, mesasZona]) => (
                    <div key={zona} className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200">
                      <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
                        <MapPin className="text-blue-500" size={28}/> {zona}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                         {mesasZona.map(mesa => {
                            const isLibre = mesa.estado === 'Libre';
                            const isOcupada = mesa.estado === 'Ocupada';
                            const isPorPagar = mesa.estado === 'Por Pagar';

                            let bgClass = 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 shadow-sm';
                            let textClass = 'text-emerald-700';
                            
                            if (isOcupada) { bgClass = 'bg-orange-50 border-orange-300 hover:bg-orange-100 shadow-md shadow-orange-500/20'; textClass = 'text-orange-700'; }
                            if (isPorPagar) { bgClass = 'bg-red-50 border-red-300 hover:bg-red-100 shadow-md shadow-red-500/20 animate-pulse'; textClass = 'text-red-700'; }

                            return (
                               <button
                                 key={mesa.id}
                                 disabled={isLibre || isSubmitting || limpiandoMesas}
                                 onClick={() => {
                                    if (!isLibre) {
                                       const pedidoVinculado = pedidos.find(p => p.id === mesa.pedido_actual_id);
                                       if (pedidoVinculado) {
                                           setModalPago(pedidoVinculado);
                                       } else {
                                           setModalLiberarMesa({ todas: false, mesa: mesa.numero_mesa });
                                       }
                                    }
                                 }}
                                 className={`p-6 rounded-[24px] border-2 flex flex-col items-center justify-center text-center transition-all ${bgClass} ${!isLibre ? 'active:scale-95 cursor-pointer' : 'cursor-default opacity-80'}`}
                               >
                                 <span className={`text-3xl font-black mb-2 ${textClass}`}>{mesa.numero_mesa}</span>
                                 <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-white shadow-sm border ${textClass} ${isOcupada ? 'border-orange-200' : isPorPagar ? 'border-red-200' : 'border-emerald-200'}`}>
                                    {isLibre ? '🟩 Libre' : isOcupada ? '🟧 Esperando' : '🟥 Comiendo'}
                                 </span>
                                 {!isLibre && mesa.numero_pedido && (
                                    <span className={`mt-3 font-black text-sm bg-slate-900 px-3 py-1 rounded-lg shadow-sm text-white`}>
                                       #{mesa.numero_pedido}
                                    </span>
                                 )}
                               </button>
                            )
                         })}
                      </div>
                    </div>
                  ))}
               </div>
            ) : (
               <div className="bg-slate-100 p-4 md:p-8 rounded-3xl border border-slate-200 shadow-inner animate-in fade-in relative">
                  <div className="absolute top-4 left-6 pointer-events-none opacity-40 flex items-center gap-2 text-slate-400 z-0">
                     <MapPin size={24}/> <span className="font-black text-xl uppercase tracking-widest">{zonaPlanoActiva}</span>
                  </div>

                  <div 
                    className="relative w-full h-[600px] bg-white rounded-2xl border border-slate-200 overflow-hidden"
                    style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
                  >
                     {mesas.filter(m => m.zona === zonaPlanoActiva).map(mesa => {
                        const isLibre = mesa.estado === 'Libre';
                        const isOcupada = mesa.estado === 'Ocupada';
                        const isPorPagar = mesa.estado === 'Por Pagar';

                        let bgClass = 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100';
                        if (isOcupada) bgClass = 'bg-orange-50 border-orange-400 text-orange-700 hover:bg-orange-100 shadow-[0_0_15px_rgba(249,115,22,0.4)]';
                        if (isPorPagar) bgClass = 'bg-red-50 border-red-400 text-red-700 hover:bg-red-100 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse';

                        return (
                           <button
                             key={mesa.id}
                             disabled={isLibre || isSubmitting || limpiandoMesas}
                             onClick={() => {
                                if (!isLibre) {
                                   const pedidoVinculado = pedidos.find(p => p.id === mesa.pedido_actual_id);
                                   if (pedidoVinculado) {
                                       setModalPago(pedidoVinculado);
                                   } else {
                                       setModalLiberarMesa({ todas: false, mesa: mesa.numero_mesa });
                                   }
                                }
                             }}
                             className={`absolute w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 flex flex-col items-center justify-center transition-all ${bgClass} ${!isLibre ? 'active:scale-95 cursor-pointer z-20' : 'cursor-default z-10'}`}
                             style={{ left: `${mesa.pos_x}%`, top: `${mesa.pos_y}%` }}
                           >
                              <span className="font-black text-lg">{mesa.numero_mesa}</span>
                              {!isLibre && mesa.numero_pedido && (
                                 <span className="mt-1 text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                                    #{mesa.numero_pedido}
                                 </span>
                              )}
                           </button>
                        );
                     })}
                  </div>
               </div>
            )}
          </>
        )}

        {/* VISTA: POR CONFIRMAR */}
        {vistaActiva === 'confirmar' && (
          <>
            <h2 className="text-4xl font-black mb-10 text-slate-800">Verificar Pedidos</h2>
            {pedidosPorConfirmar.length === 0 ? (
              <div className="text-center text-slate-400 mt-20"><CheckCircle2 size={64} className="mx-auto mb-4 opacity-30"/><p className="text-2xl font-bold">No hay pedidos esperando revisión.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {pedidosPorConfirmar.map(p => {
                  let direccionPura = '';
                  let notaCambio = null;
                  const tel = getTelefonoExtraido(p);
                  
                  if (p.direccion_entrega) {
                     const partes = p.direccion_entrega.split('|').map(x => x.trim());
                     direccionPura = partes[0].replace(/TEL:\s*\d*/g, '').replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger').replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
                     const cambioPart = partes.find(x => x.includes('Llevar cambio'));
                     notaCambio = cambioPart ? cambioPart : null;
                  }

                  const esDomicilio = p.tipo_consumo === 'Domicilio';
                  const iconoConsumo = esDomicilio ? <MapPin size={20} className="text-purple-500" /> : <Phone size={20} className="text-orange-500" />;
                  const colorBorde = esDomicilio ? 'border-purple-200' : 'border-orange-200';
                  const colorFondoAviso = esDomicilio ? 'bg-purple-50 border-purple-100' : 'bg-orange-50 border-orange-100';
                  const colorTextoAviso = esDomicilio ? 'text-purple-700' : 'text-orange-700';

                  return (
                  <div key={p.id} className={`bg-white p-6 rounded-[40px] shadow-sm border-2 ${colorBorde} flex flex-col hover:shadow-md transition`}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-3xl font-black text-slate-800">#{p.numero_pedido}</h3>
                      <span className={`${esDomicilio ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'} text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest`}>
                        {esDomicilio ? 'Domicilio' : 'Recoger'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="font-bold text-slate-700 text-xl">{p.cliente_nombre || p.cliente?.nombre || 'Invitado'}</p>
                        {tel && (
                            <span className="text-xs font-black text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1">
                                <Phone size={12}/> {tel}
                            </span>
                        )}
                    </div>
                    
                    {(direccionPura || notaCambio) && (
                      <div className={`${colorFondoAviso} p-4 rounded-2xl border mb-4 flex items-start gap-3 mt-2`}>
                         {iconoConsumo}
                         <div>
                           {direccionPura && <p className={`font-black ${colorTextoAviso} tracking-wider leading-tight`}>{direccionPura}</p>}
                           {notaCambio && <p className="text-xs font-bold text-slate-500 mt-2 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-200">💵 {notaCambio}</p>}
                           {esDomicilio && <p className="text-xs font-black text-slate-400 mt-2 uppercase flex items-center gap-1"><DollarSign size={14} /> Pago: {p.metodo_pago}</p>}
                         </div>
                      </div>
                    )}

                    <div className="mb-4 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        {renderBotonVerDetalle(p)}
                        {renderBotonEditar(p)}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl mb-6 overflow-y-auto max-h-40 border border-slate-100 shadow-inner">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Detalle del Pedido:</p>
                      {renderItemsConfirmacion(p.carrito)}
                    </div>
                    <p className="text-4xl font-black text-blue-600 mb-6 text-center">${p.total}</p>
                    
                    <div className="mt-auto grid grid-cols-2 gap-3">
                       <button 
                          disabled={isSubmitting} 
                          onClick={() => actualizarEstadoPedido(p.id, 'Cancelado')} 
                          className="py-4 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition disabled:opacity-50"
                       >
                          Rechazar
                       </button>
                       {esDomicilio ? (
                          <button 
                             disabled={isSubmitting} 
                             onClick={() => setModalZonaEnvio(p)} 
                             className="py-4 bg-purple-600 text-white font-black rounded-2xl hover:bg-purple-700 shadow-lg shadow-purple-500/20 transition active:scale-95 text-sm leading-tight disabled:opacity-50"
                          >
                             Asignar Envío<br/>y Aceptar
                          </button>
                       ) : (
                          <button 
                             disabled={isSubmitting} 
                             onClick={() => confirmarPedidoRecoger(p.id)} 
                             className="py-4 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
                          >
                             Mandar a Cocina
                          </button>
                       )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </>
        )}

        {/* VISTA: COBRAR / CUENTAS ABIERTAS */}
        {vistaActiva === 'cobrar' && (
          <>
            <h2 className="text-4xl font-black mb-10 text-slate-800">Cuentas y Cobros Pendientes</h2>
            {ordenesEnCaja.length === 0 ? (
              <div className="text-center text-slate-400 mt-20"><CheckCircle2 size={64} className="mx-auto mb-4 opacity-30"/><p className="text-2xl font-bold">Todo al día, no hay cobros pendientes.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {ordenesEnCaja.map(p => {
                  let direccionPura = '';
                  let notaCambio = null;
                  const tel = getTelefonoExtraido(p);
                  const tipoLimpio = p.tipo_consumo || 'SIN ESPECIFICAR';

                  if (p.direccion_entrega) {
                     const partes = p.direccion_entrega.split('|').map(x => x.trim());
                     direccionPura = partes[0].replace(/TEL:\s*\d*/g, '').replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger').replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
                     const cambioPart = partes.find(x => x.includes('Llevar cambio'));
                     notaCambio = cambioPart ? cambioPart : null;
                  }

                  const esCuentaAbierta = p.metodo_pago === 'Por Cobrar';
                  const isReparto = p.tipo_consumo === 'Domicilio' && p.estado_preparacion === 'En Camino';
                  const esEsperandoAprobacion = p.estado_preparacion === 'Pendiente' && (tipoLimpio === 'Local' || tipoLimpio === 'Para llevar');

                  return (
                  <div key={p.id} className={`bg-white p-8 rounded-[40px] shadow-sm border-2 flex flex-col hover:shadow-md transition ${esCuentaAbierta || isReparto || esEsperandoAprobacion ? 'border-orange-300 shadow-orange-500/10' : 'border-slate-100'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-3xl font-black text-slate-800">#{p.numero_pedido}</h3>
                        <span className={`text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-widest ${p.metodo_pago === 'Efectivo' ? 'bg-emerald-100 text-emerald-700' : p.metodo_pago === 'Tarjeta' ? 'bg-blue-100 text-blue-700' : p.metodo_pago === 'Mixto' ? 'bg-indigo-100 text-indigo-700' : p.metodo_pago === 'Por Cobrar' || p.metodo_pago === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                            {getIconoPago(p.metodo_pago)} {esCuentaAbierta ? 'Cuenta Abierta' : isReparto ? 'En Reparto' : p.metodo_pago}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="font-bold text-slate-700 text-xl">{direccionPura || p.cliente_nombre || p.cliente?.nombre || 'Invitado'}</p>
                        {tel && (
                            <span className="text-xs font-black text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1">
                                <Phone size={12}/> {tel}
                            </span>
                        )}
                        {p.mesa && (
                            <span className="text-xs font-black text-indigo-600 bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-md flex items-center gap-1">
                                📍 MESA {p.mesa}
                            </span>
                        )}
                    </div>

                    <div className="mb-4">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm border
                            ${tipoLimpio === 'Local' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                              tipoLimpio === 'Para llevar' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 
                              tipoLimpio === 'Domicilio' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                              tipoLimpio === 'Recoger en Local' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-slate-100 text-slate-600 border-slate-300'}`}>
                            {tipoLimpio === 'Local' ? '🍽️' : tipoLimpio === 'Para llevar' ? '🛍️' : tipoLimpio === 'Domicilio' ? '🛵' : tipoLimpio === 'Recoger en Local' ? '📞' : '❓'} {tipoLimpio}
                        </span>
                    </div>
                    
                    {(esCuentaAbierta || isReparto || esEsperandoAprobacion) && (
                        <div className="mb-4 bg-orange-50 text-orange-700 text-xs font-black p-2.5 rounded-lg border border-orange-200 flex items-center gap-2 shadow-inner">
                           <Clock size={16}/> {
                               p.estado_preparacion === 'Pendiente' ? 'Esperando Aprobación de Caja' : 
                               p.estado_preparacion === 'Pagado' ? 'En Cola (Cocina)' : 
                               p.estado_preparacion === 'Preparando' ? 'Preparando en Cocina' : 
                               p.estado_preparacion === 'Listo' ? 'Listo en Barra' : 
                               p.estado_preparacion === 'En Camino' ? 'Repartidor en Ruta' : p.estado_preparacion
                           }
                        </div>
                    )}

                    <div className="mb-4 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        {renderBotonVerDetalle(p)}
                        {renderBotonEditar(p)}
                      </div>
                      {renderBotonAgregarExtra(p)}
                    </div>

                    {p.tipo_consumo === 'Domicilio' && (direccionPura || notaCambio) && (
                      <div className="mb-4">
                        {direccionPura && <div className="text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">📍 {direccionPura}</div>}
                        {notaCambio && (
                          <div className="mt-2 bg-orange-100 border border-orange-200 text-orange-700 font-black px-3 py-2 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                            <AlertTriangle size={16}/> {notaCambio}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-auto pt-6 border-t border-slate-100">
                      <p className="text-4xl font-black text-blue-600 mb-6">${p.total}</p>
                      
                      {isReparto ? (
                         <button 
                            disabled={isSubmitting || limpiandoMesas} 
                            onClick={() => { setModalPago(p); setMontoRecibido(''); }} 
                            className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition active:scale-95 disabled:opacity-50"
                         >
                             <DollarSign size={24}/> Cobrar a Repartidor
                         </button>
                      ) : esEsperandoAprobacion ? (
                         <div className="flex gap-3">
                             <button 
                                disabled={isSubmitting || limpiandoMesas} 
                                onClick={() => actualizarEstadoPedido(p.id, 'Pagado')} 
                                className="flex-1 py-4 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                             >
                                 <ChefHat size={20}/> Mandar a Cocina
                             </button>
                             <button 
                                disabled={isSubmitting || limpiandoMesas} 
                                onClick={() => { setModalPago(p); setMontoRecibido(''); }} 
                                className="flex-1 py-4 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                             >
                                 <DollarSign size={20}/> Cobrar Ahora
                             </button>
                         </div>
                      ) : esCuentaAbierta ? (
                         <button 
                            disabled={isSubmitting || limpiandoMesas} 
                            onClick={() => { setModalPago(p); setMontoRecibido(''); }} 
                            className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition active:scale-95 disabled:opacity-50"
                         >
                             <DollarSign size={24}/> Cobrar Orden
                         </button>
                      ) : (
                         <button 
                            disabled={isSubmitting || limpiandoMesas} 
                            onClick={() => { setModalPago(p); setMontoRecibido(''); }} 
                            className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition active:scale-95 disabled:opacity-50"
                         >
                             <CheckCircle2 size={24}/> Validar Pago
                         </button>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </>
        )}

        {/* 👇 VISTA: MESAS PAGADAS (LISTAS PARA LIMPIAR) */}
        {vistaActiva === 'mesas_pagadas' && (
          <>
            <h2 className="text-4xl font-black mb-10 text-slate-800">Mesas Pagadas (Listas para Limpiar)</h2>
            {mesasPagadas.length === 0 ? (
              <div className="text-center text-slate-400 mt-20"><CheckCircle2 size={64} className="mx-auto mb-4 opacity-30"/><p className="text-2xl font-bold">No hay mesas pendientes por limpiar.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {mesasPagadas.map(p => {
                  let direccionPura = '';
                  const tel = getTelefonoExtraido(p);
                  const tipoLimpio = p.tipo_consumo || 'SIN ESPECIFICAR';

                  if (p.direccion_entrega) {
                     const partes = p.direccion_entrega.split('|').map(x => x.trim());
                     direccionPura = partes[0].replace(/TEL:\s*\d*/g, '').replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger').replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
                  }

                  return (
                  <div key={p.id} className="bg-emerald-50 p-8 rounded-[40px] shadow-sm border-2 border-emerald-200 flex flex-col hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-3xl font-black text-emerald-800">#{p.numero_pedido}</h3>
                        <span className="text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-widest bg-emerald-100 text-emerald-700">
                            <CheckCircle2 size={16}/> PAGADO ({p.metodo_pago})
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="font-bold text-slate-700 text-xl">{direccionPura || p.cliente_nombre || p.cliente?.nombre || 'Invitado'}</p>
                        {tel && (
                            <span className="text-xs font-black text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1">
                                <Phone size={12}/> {tel}
                            </span>
                        )}
                        {p.mesa && (
                            <span className="text-xs font-black text-indigo-600 bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-md flex items-center gap-1">
                                📍 MESA {p.mesa}
                            </span>
                        )}
                    </div>

                    <div className="mb-4">
                        <span className="text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm border bg-blue-50 text-blue-700 border-blue-200">
                            🍽️ {tipoLimpio}
                        </span>
                    </div>
                    
                    <div className="mb-4 bg-orange-50 text-orange-700 text-xs font-black p-2.5 rounded-lg border border-orange-200 flex items-center gap-2 shadow-inner">
                       <Utensils size={16}/> Comiendo en Mesa
                    </div>

                    <div className="mb-4 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        {renderBotonVerDetalle(p)}
                        {renderBotonEditar(p)}
                      </div>
                      {renderBotonAgregarExtra(p)}
                    </div>
                    
                    <div className="mt-auto pt-6 border-t border-emerald-200">
                      <p className="text-4xl font-black text-emerald-600 mb-6">${p.total}</p>
                      
                      {/* 👇 AQUI ESTÁ LA SOLUCIÓN. USAMOS UNA LLAMADA DIRECTA FETCH AL BACKEND */}
                      <button 
                         disabled={isSubmitting || limpiandoMesas} 
                         onClick={async () => {
                             setLimpiandoMesas(true);
                             try {
                                 // 1. Mandamos el fantasma para liberar la mesa
                                 await liberarMesaMagicamente(p.mesa);
                                 
                                 // 2. Mandamos el original al Historial (directo al backend, sin funciones intermedias)
                                 await fetch(`${apiUrl}/pedidos/${p.id}/estado`, { 
                                     method: 'PUT', 
                                     headers: { 'Content-Type': 'application/json' }, 
                                     body: JSON.stringify({ estado_preparacion: 'Finalizado' }) 
                                 });
                             } catch(e) {
                                 console.error("Error al finalizar el pedido", e);
                             }
                             setLimpiandoMesas(false);
                         }} 
                         className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition active:scale-95 disabled:opacity-50"
                      >
                          {limpiandoMesas ? 'Liberando...' : <><CheckCircle2 size={24}/> Limpiar y Liberar Mesa</>}
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </>
        )}

        {/* VISTA: ENTREGAS */}
        {vistaActiva === 'entregas' && (
          <>
            <h2 className="text-4xl font-black mb-10 text-slate-800">Listos para Entregar</h2>
            {listosParaEntregar.length === 0 ? (
              <div className="text-center text-slate-400 mt-20"><ChefHat size={64} className="mx-auto mb-4 opacity-30"/><p className="text-2xl font-bold">La cocina aún está preparando los pedidos.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {listosParaEntregar.map(p => {
                  let direccionPura = '';
                  let notaCambio = null;
                  const tel = getTelefonoExtraido(p);
                  const tipoLimpio = p.tipo_consumo || 'SIN ESPECIFICAR';

                  if (p.direccion_entrega) {
                     const partes = p.direccion_entrega.split('|').map(x => x.trim());
                     direccionPura = partes[0].replace(/TEL:\s*\d*/g, '').replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger').replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
                     const cambioPart = partes.find(x => x.includes('Llevar cambio'));
                     notaCambio = cambioPart ? cambioPart : null;
                  }

                  const esCuentaAbiertaLocal = tipoLimpio === 'Local' && (p.metodo_pago === 'Por Cobrar' || p.metodo_pago === 'Pendiente');
                  const esMesaPagada = tipoLimpio === 'Local' && p.metodo_pago !== 'Por Cobrar' && p.metodo_pago !== 'Pendiente';

                  return (
                  <div key={p.id} className="bg-orange-50 p-8 rounded-[40px] shadow-lg shadow-orange-500/20 border-2 border-orange-400 flex flex-col transition animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-4xl font-black text-orange-600">#{p.numero_pedido}</h3>
                      <span className="bg-orange-600 text-white px-4 py-1 rounded-full font-black uppercase text-sm tracking-widest">{tipoLimpio}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-black text-slate-800 text-2xl">{direccionPura || p.cliente_nombre || p.cliente?.nombre || 'Invitado'}</p>
                        {tel && (
                            <span className="text-sm font-black text-slate-600 bg-orange-100 border border-orange-200 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Phone size={14}/> {tel}
                            </span>
                        )}
                        {p.mesa && (
                            <span className="text-sm font-black text-white bg-indigo-500 px-2 py-1 rounded-lg flex items-center gap-1">
                                📍 MESA {p.mesa}
                            </span>
                        )}
                    </div>
                    <p className="font-black text-blue-600 text-xl mb-4">Total de la Nota: ${p.total}</p>

                    <div className="mb-4 bg-orange-100/50 p-4 rounded-3xl border border-orange-200 flex flex-col gap-3">
                       <div className="grid grid-cols-2 gap-3">
                          {renderBotonVerDetalle(p)}
                       </div>
                       {renderBotonAgregarExtra(p)}
                    </div>

                    {p.tipo_consumo === 'Domicilio' && (direccionPura || notaCambio) && (
                      <div className="mb-4 flex flex-col gap-2">
                        {direccionPura && <p className="text-sm font-bold text-slate-600 bg-white p-3 rounded-xl shadow-sm border border-slate-200">📍 {direccionPura}</p>}
                        {Number(p.costo_envio) > 0 && <p className="text-sm font-black text-purple-700 bg-purple-100 p-3 rounded-xl shadow-sm border border-purple-200 flex items-center gap-2"><MapPin size={18}/> Costo de Envío Cobrado: ${p.costo_envio}</p>}
                        {notaCambio && <p className="text-sm font-black text-emerald-700 bg-emerald-100 p-3 rounded-xl shadow-sm border border-emerald-200 flex items-center gap-2"><DollarSign size={18}/> {notaCambio}</p>}
                      </div>
                    )}
                    
                    <div className="mt-auto pt-6 border-t border-orange-200">
                       {p.tipo_consumo === 'Domicilio' ? (
                          <div className="flex gap-3">
                              <button 
                                 disabled={isSubmitting || limpiandoMesas} 
                                 onClick={() => actualizarEstadoPedido(p.id, 'En Camino')} 
                                 className="flex-1 py-5 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1 bg-purple-500 hover:bg-purple-600 text-white shadow-xl transition active:scale-95 disabled:opacity-50"
                              >
                                  <MapPin size={24}/> Mandar a Reparto
                              </button>
                              <button 
                                 disabled={isSubmitting || limpiandoMesas} 
                                 onClick={() => { setModalPago(p); setMontoRecibido(''); }} 
                                 className="flex-1 py-5 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition active:scale-95 disabled:opacity-50"
                              >
                                  <DollarSign size={24}/> Cobrar Ahora
                              </button>
                          </div>
                       ) : (esCuentaAbiertaLocal || esMesaPagada) ? (
                          <button 
                             disabled={isSubmitting || limpiandoMesas} 
                             onClick={() => actualizarEstadoPedido(p.id, 'Entregado')} 
                             className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white shadow-xl transition active:scale-95 disabled:opacity-50"
                          >
                              <Utensils size={28}/> Servir en Mesa
                          </button>
                       ) : (p.metodo_pago === 'Pendiente' || p.metodo_pago === 'Por Cobrar') ? (
                          <button 
                             disabled={isSubmitting || limpiandoMesas} 
                             onClick={() => { setModalPago(p); setMontoRecibido(''); }} 
                             className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition active:scale-95 disabled:opacity-50"
                          >
                             <DollarSign size={28}/> Cobrar y Entregar
                          </button>
                       ) : (
                          <button 
                             disabled={isSubmitting || limpiandoMesas} 
                             onClick={() => actualizarEstadoPedido(p.id, 'Finalizado')} 
                             className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl transition active:scale-95 disabled:opacity-50"
                          >
                             <Check size={28}/> Marcar como Entregado
                          </button>
                       )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </>
        )}

        {/* VISTA: HISTORIAL */}
        {vistaActiva === 'historial' && (
          <>
            <div className="flex justify-between items-end mb-8"><h2 className="text-4xl font-black text-slate-800">Todos los Pedidos</h2></div>
            
            <div className="flex gap-2 mb-8 bg-slate-200 p-1 rounded-2xl w-fit flex-wrap">
              {['Pagado', 'Preparando', 'Listo', 'Entregado', 'Cancelado', 'Sincronizado Offline'].map(tab => (
                <button key={tab} disabled={isSubmitting || limpiandoMesas} onClick={() => setSubVistaHistorial(tab)} className={`px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 ${subVistaHistorial === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab === 'Pagado' ? 'En Cola' : tab === 'Preparando' ? 'En Cocina' : tab === 'Listo' ? 'Finalizados' : tab === 'Entregado' ? 'Entregados' : tab}
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${subVistaHistorial === tab ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                    {pedidos.filter(p => tab === 'Entregado' ? (p.estado_preparacion === 'Entregado' || p.estado_preparacion === 'En Camino' || p.estado_preparacion === 'Finalizado') : p.estado_preparacion === tab).length}
                  </span>
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pedidos.filter(p => subVistaHistorial === 'Entregado' ? (p.estado_preparacion === 'Entregado' || p.estado_preparacion === 'En Camino' || p.estado_preparacion === 'Finalizado') : p.estado_preparacion === subVistaHistorial).length === 0 ? (
                <p className="text-slate-400 font-bold col-span-2 text-center mt-10">No hay pedidos en esta sección.</p>
              ) : (
                pedidos.filter(p => subVistaHistorial === 'Entregado' ? (p.estado_preparacion === 'Entregado' || p.estado_preparacion === 'En Camino' || p.estado_preparacion === 'Finalizado') : p.estado_preparacion === subVistaHistorial).map(p => {
                  let direccionPura = '';
                  const tel = getTelefonoExtraido(p);
                  const tipoLimpio = p.tipo_consumo || 'SIN ESPECIFICAR';

                  if (p.direccion_entrega) {
                     const partes = p.direccion_entrega.split('|').map(x => x.trim());
                     direccionPura = partes[0].replace(/TEL:\s*\d*/g, '').replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger').replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
                  }

                  return (
                  <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <p className="text-2xl font-black text-slate-800">#{p.numero_pedido}</p>
                            <span className="text-[10px] bg-slate-100 font-black px-2 py-1 rounded-md uppercase text-slate-500">{tipoLimpio}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-slate-600">{direccionPura || p.cliente_nombre || p.cliente?.nombre || 'Invitado'}</p>
                            {tel && (
                                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Phone size={10}/> {tel}
                                </span>
                            )}
                            {p.mesa && (
                                <span className="text-[10px] font-black text-white bg-indigo-500 px-2 py-0.5 rounded flex items-center gap-1">
                                    MESA {p.mesa}
                                </span>
                            )}
                        </div>

                        <p className="text-sm font-bold text-blue-600 mt-1">${p.total} • {p.metodo_pago}</p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 shrink-0 w-full sm:w-auto">
                        <p className="text-xs font-bold text-slate-400 uppercase text-right w-full">{subVistaHistorial === 'Pagado' ? 'Esperando Cocina' : subVistaHistorial}</p>
                        
                        <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                           {renderBotonVerDetalle(p)}
                           
                           {configGlobal?.ticket_impresion_activa && (
                              <button disabled={isSubmitting || limpiandoMesas} onClick={() => lanzarImpresion(p)} className="bg-slate-800 text-white hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition shadow-md w-full sm:w-auto disabled:opacity-50">
                                 <FileText size={15}/> Reimprimir
                              </button>
                           )}
                        </div>
                    </div>
                  </div>
                )
                })
              )}
            </div>
          </>
        )}

        {/* VISTA: CORTE DE CAJA MODIFICADA CON INTELIGENCIA MIXTA */}
        {vistaActiva === 'corte' && (
          <div>
            <h2 className="text-4xl font-black mb-10 text-slate-800">Corte de Caja</h2>
            <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-200">
               
               <p className="text-slate-500 font-bold text-lg mb-4">Origen de los Ingresos Totales (Turno Actual)</p>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex justify-between items-center">
                   <div>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Venta Platillos</p>
                     <p className="text-2xl font-black text-slate-700">${totalPlatillos.toFixed(2)}</p>
                   </div>
                   <ChefHat size={32} className="text-slate-300"/>
                 </div>
                 <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex justify-between items-center">
                   <div>
                     <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ingresos Extras</p>
                     <p className="text-2xl font-black text-emerald-700">${totalExtras.toFixed(2)}</p>
                   </div>
                   <PlusCircle size={32} className="text-emerald-200"/>
                 </div>
                 <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex justify-between items-center">
                   <div>
                     <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Cargos por Envío</p>
                     <p className="text-2xl font-black text-purple-700">${totalEnvio.toFixed(2)}</p>
                   </div>
                   <MapPin size={32} className="text-purple-200"/>
                 </div>
               </div>
               
               <div className="border-t border-slate-100 pt-8 mb-8"></div>

               <p className="text-slate-500 font-bold text-lg mb-6">Resumen por Método de Pago</p>
               
               <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Fondo Inicial</p>
                    <p className="text-2xl font-black text-slate-700">${(fondoCaja || 0).toFixed(2)}</p>
                  </div>
                  
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Efectivo Físico</p>
                    <p className="text-2xl font-black text-emerald-700">${totalEfectivoVentas.toFixed(2)}</p>
                  </div>
                  
                  <div className="bg-red-50 p-6 rounded-3xl border border-red-100 relative overflow-hidden group">
                    <div className="absolute top-2 right-2 text-red-200 group-hover:scale-110 transition"><TrendingDown size={32}/></div>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 relative z-10">Gastos (Compras)</p>
                    <p className="text-2xl font-black text-red-700 relative z-10">-${totalGastos.toFixed(2)}</p>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Tarjetas</p>
                    <p className="text-2xl font-black text-blue-700">${totalTarjetaVentas.toFixed(2)}</p>
                  </div>
                  
                  <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2">Transferencias</p>
                    <p className="text-2xl font-black text-purple-700">${totalTransferenciaVentas.toFixed(2)}</p>
                  </div>
               </div>

               <div className="bg-emerald-600 p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center text-white">
                  <div>
                     <p className="text-emerald-200 font-black uppercase tracking-widest mb-1 text-sm">Efectivo Físico en Cajón</p>
                     <p className="text-[11px] font-bold text-emerald-100 opacity-80 uppercase tracking-wider">(Fondo Inicial + Ventas Efectivo) - Gastos</p>
                  </div>
                  <p className="text-6xl font-black mt-4 md:mt-0">
                     ${((fondoCaja || 0) + totalEfectivoVentas - totalGastos).toFixed(2)}
                  </p>
               </div>

               {gastosDia && gastosDia.length > 0 && (
                 <div className="mt-8 border-t border-slate-100 pt-8 animate-in fade-in">
                   <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Desglose de Salidas de Efectivo</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                     {gastosDia.map((gasto, index) => (
                       <div key={index} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                         <span className="font-bold text-slate-600 text-sm line-clamp-1">{gasto.nombre}</span>
                         <span className="font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg text-sm">-${Number(gasto.costo_total).toFixed(2)}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

            </div>
          </div>
        )}
      </div>

      {/* MODAL BONITO PARA LIBERAR MESAS */}
      {modalLiberarMesa && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-md text-center animate-in zoom-in duration-200">
            <div className="mx-auto bg-red-100 text-red-600 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner">
               <AlertTriangle size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">
              {modalLiberarMesa.todas ? 'Liberar Todas las Mesas' : `Liberar Mesa ${modalLiberarMesa.mesa}`}
            </h2>
            <p className="text-slate-500 font-medium mb-8 px-2">
              {modalLiberarMesa.todas
                ? '¿Estás seguro de forzar la limpieza de todo el mapa? Esta acción no se puede deshacer.'
                : 'El sistema no detecta un pedido activo en tu turno de hoy. ¿Deseas forzar la limpieza de esta mesa?'}
            </p>
            <div className="flex gap-4">
              <button 
                disabled={limpiandoMesas} 
                onClick={() => setModalLiberarMesa(null)} 
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                disabled={limpiandoMesas} 
                onClick={confirmarLiberacionMesa} 
                className="flex-[2] py-4 bg-red-500 text-white font-black text-lg rounded-2xl hover:bg-red-600 shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {limpiandoMesas ? 'Limpiando...' : 'Sí, Forzar Liberación'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VistasCaja;