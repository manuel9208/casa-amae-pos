import React from 'react';
import { BellRing, MessageSquare, XCircle, CheckCircle2, Phone, AlertTriangle, DollarSign, Check, ChefHat, Clock, FileText, CreditCard, Smartphone, MapPin } from 'lucide-react';

const VistasCaja = ({
  vistaActiva, subVistaHistorial, setSubVistaHistorial, pedidos, pedidosConAlerta, pedidosPorConfirmar,
  pendientesDePago, listosParaEntregar, fondoCaja, configGlobal,
  abrirModalResolver, limpiarAlerta, setModalPago, setMontoRecibido, actualizarEstadoPedido, confirmarPedidoRecoger, lanzarImpresion,
  setModalZonaEnvio 
}) => {

  const getIconoPago = (metodo) => { 
    if(metodo==='Tarjeta') return <CreditCard size={16}/>; 
    if(metodo==='Transferencia') return <Smartphone size={16}/>; 
    if(metodo==='Pendiente') return <Clock size={16}/>;
    return <DollarSign size={16}/>; 
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

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
      {/* ALERTAS DE COCINA */}
      {pedidosConAlerta.length > 0 && (
        <div className="w-full p-4 space-y-2 z-10 shrink-0">
          {pedidosConAlerta.map(p => {
            const mensajeVisible = p.alerta_cocina.replace(/\[IDX:\d+\]\s*/g, '');
            return (
            <div key={`alerta-${p.id}`} className="bg-red-500 text-white p-4 rounded-2xl shadow-lg flex justify-between items-center animate-in slide-in-from-top">
              <div className="flex items-center gap-4"><BellRing className="animate-bounce" size={28} /><div><p className="font-black text-lg">⚠️ ALERTA EN ORDEN #{p.numero_pedido} ({p.cliente_nombre || 'Invitado'})</p><p className="font-medium text-red-100">{mensajeVisible}</p></div></div>
              <div className="flex gap-2">
                <button onClick={() => abrirModalResolver(p)} className="bg-white text-red-600 hover:bg-red-50 px-6 py-2 rounded-xl font-black shadow-sm transition flex items-center gap-2"><MessageSquare size={18}/> Resolver con Cliente</button>
                <button onClick={() => limpiarAlerta(p.id)} className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-xl font-bold shadow-sm transition" title="Ocultar sin responder"><XCircle size={18}/></button>
              </div>
            </div>
          )})}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-10">
        
        {/* VISTA: POR CONFIRMAR */}
        {vistaActiva === 'confirmar' && (
          <>
            <h2 className="text-4xl font-black mb-10 text-slate-800">Verificar Pedidos</h2>
            {pedidosPorConfirmar.length === 0 ? (
              <div className="text-center text-slate-400 mt-20"><CheckCircle2 size={64} className="mx-auto mb-4 opacity-30"/><p className="text-2xl font-bold">No hay pedidos esperando revisión.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {pedidosPorConfirmar.map(p => {
                  let direccionPura = p.direccion_entrega;
                  let notaCambio = null;
                  
                  if (p.tipo_consumo === 'Domicilio' && p.direccion_entrega?.includes('|')) {
                     const partes = p.direccion_entrega.split('|');
                     direccionPura = partes[0].trim();
                     notaCambio = partes[1] ? partes[1].trim() : null;
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
                    <p className="font-bold text-slate-600 text-lg mb-1">{p.cliente_nombre || 'Invitado'}</p>
                    
                    <div className={`${colorFondoAviso} p-4 rounded-2xl border mb-4 flex items-start gap-3`}>
                       {iconoConsumo}
                       <div>
                         <p className={`font-black ${colorTextoAviso} tracking-wider leading-tight`}>
                           {direccionPura?.replace('PEDIDO POR TELÉFONO - CONTACTO: ', '')}
                         </p>
                         {notaCambio && (
                           <p className="text-xs font-bold text-slate-500 mt-2 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-200">💵 {notaCambio}</p>
                         )}
                         {esDomicilio && (
                           <p className="text-xs font-black text-slate-400 mt-2 uppercase flex items-center gap-1">
                             <DollarSign size={14} /> Pago: {p.metodo_pago}
                           </p>
                         )}
                       </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl mb-6 overflow-y-auto max-h-40 border border-slate-100 shadow-inner">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Detalle del Pedido:</p>
                      {renderItemsConfirmacion(p.carrito)}
                    </div>
                    <p className="text-4xl font-black text-blue-600 mb-6 text-center">${p.total}</p>
                    
                    <div className="mt-auto grid grid-cols-2 gap-3">
                       <button onClick={() => actualizarEstadoPedido(p.id, 'Cancelado')} className="py-4 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition">Rechazar</button>
                       {esDomicilio ? (
                          <button onClick={() => setModalZonaEnvio(p)} className="py-4 bg-purple-600 text-white font-black rounded-2xl hover:bg-purple-700 shadow-lg shadow-purple-500/20 transition active:scale-95 text-sm leading-tight">Asignar Envío<br/>y Aceptar</button>
                       ) : (
                          <button onClick={() => confirmarPedidoRecoger(p.id)} className="py-4 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition active:scale-95">Mandar a Cocina</button>
                       )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </>
        )}

        {/* VISTA: COBRAR */}
        {vistaActiva === 'cobrar' && (
          <>
            <h2 className="text-4xl font-black mb-10 text-slate-800">Pedidos Pendientes de Pago</h2>
            {pendientesDePago.length === 0 ? (
              <div className="text-center text-slate-400 mt-20"><CheckCircle2 size={64} className="mx-auto mb-4 opacity-30"/><p className="text-2xl font-bold">Todo al día, no hay cobros pendientes.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {pendientesDePago.map(p => {
                  let direccionPura = p.direccion_entrega;
                  let notaCambio = null;
                  if (p.tipo_consumo === 'Domicilio' && p.direccion_entrega?.includes('|')) {
                     const partes = p.direccion_entrega.split('|');
                     direccionPura = partes[0].trim();
                     notaCambio = partes[1] ? partes[1].trim() : null;
                  }

                  return (
                  <div key={p.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4"><h3 className="text-3xl font-black text-slate-800">#{p.numero_pedido}</h3><span className={`text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-widest ${p.metodo_pago === 'Efectivo' ? 'bg-emerald-100 text-emerald-700' : p.metodo_pago === 'Tarjeta' ? 'bg-blue-100 text-blue-700' : p.metodo_pago === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>{getIconoPago(p.metodo_pago)} {p.metodo_pago}</span></div>
                    <p className="font-bold text-slate-600 text-lg mb-1">{p.cliente_nombre || 'Invitado'}</p>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{p.tipo_consumo}</p>
                    {p.tipo_consumo === 'Domicilio' && (
                      <div className="mb-4">
                        <div className="text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">📍 {direccionPura}</div>
                        {notaCambio && (
                          <div className="mt-2 bg-orange-100 border border-orange-200 text-orange-700 font-black px-3 py-2 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                            <AlertTriangle size={16}/> {notaCambio}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-auto pt-6 border-t border-slate-100"><p className="text-4xl font-black text-blue-600 mb-6">${p.total}</p><button onClick={() => { setModalPago(p); setMontoRecibido(''); }} className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition ${p.metodo_pago === 'Efectivo' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'}`}>{p.metodo_pago === 'Efectivo' ? <><DollarSign size={24}/> Recibir Efectivo</> : <><CheckCircle2 size={24}/> Validar Pago</>}</button></div>
                  </div>
                )})}
              </div>
            )}
          </>
        )}

        {/* 👇 VISTA: ENTREGAS (Corregida con desglose visual de envío y billetes) */}
        {vistaActiva === 'entregas' && (
          <>
            <h2 className="text-4xl font-black mb-10 text-slate-800">Listos para Entregar</h2>
            {listosParaEntregar.length === 0 ? (
              <div className="text-center text-slate-400 mt-20"><ChefHat size={64} className="mx-auto mb-4 opacity-30"/><p className="text-2xl font-bold">La cocina aún está preparando los pedidos.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {listosParaEntregar.map(p => {
                  let direccionPura = p.direccion_entrega;
                  let notaCambio = null;

                  if (p.tipo_consumo === 'Domicilio' && p.direccion_entrega?.includes('|')) {
                     const partes = p.direccion_entrega.split('|');
                     direccionPura = partes[0].trim();
                     notaCambio = partes[1] ? partes[1].trim() : null;
                  }

                  return (
                  <div key={p.id} className="bg-orange-50 p-8 rounded-[40px] shadow-lg shadow-orange-500/20 border-2 border-orange-400 flex flex-col transition animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-4xl font-black text-orange-600">#{p.numero_pedido}</h3>
                      <span className="bg-orange-600 text-white px-4 py-1 rounded-full font-black uppercase text-sm tracking-widest">{p.tipo_consumo}</span>
                    </div>
                    
                    <p className="font-black text-slate-800 text-2xl mb-1">{p.cliente_nombre || 'Invitado'}</p>
                    <p className="font-black text-blue-600 text-xl mb-4">Total de la Nota: ${p.total}</p>

                    {/* Desglose de Domicilio */}
                    {p.tipo_consumo === 'Domicilio' && (
                      <div className="mb-4 flex flex-col gap-2">
                        <p className="text-sm font-bold text-slate-600 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                          📍 {direccionPura}
                        </p>
                        
                        {Number(p.costo_envio) > 0 && (
                          <p className="text-sm font-black text-purple-700 bg-purple-100 p-3 rounded-xl shadow-sm border border-purple-200 flex items-center gap-2">
                            <MapPin size={18}/> Costo de Envío Cobrado: ${p.costo_envio}
                          </p>
                        )}

                        {notaCambio && (
                          <p className="text-sm font-black text-emerald-700 bg-emerald-100 p-3 rounded-xl shadow-sm border border-emerald-200 flex items-center gap-2">
                            <DollarSign size={18}/> {notaCambio}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-auto pt-6 border-t border-orange-200">
                       {p.metodo_pago === 'Pendiente' ? (
                          <button onClick={() => { setModalPago(p); setMontoRecibido(''); }} className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition active:scale-95"><DollarSign size={28}/> Cobrar y Entregar</button>
                       ) : (
                          <button onClick={() => actualizarEstadoPedido(p.id, 'Entregado')} className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl transition active:scale-95"><Check size={28}/> Marcar como Entregado</button>
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
            <div className="flex gap-2 mb-8 bg-slate-200 p-1 rounded-2xl w-fit">
              {['Pagado', 'Preparando', 'Listo', 'Entregado'].map(tab => (
                <button key={tab} onClick={() => setSubVistaHistorial(tab)} className={`px-6 py-3 rounded-xl font-bold transition-all ${subVistaHistorial === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab === 'Pagado' ? 'En Cola' : tab === 'Preparando' ? 'En Cocina' : tab === 'Listo' ? 'Finalizados' : 'Entregados'}<span className="ml-2 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs">{pedidos.filter(p => p.estado_preparacion === tab).length}</span></button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pedidos.filter(p => p.estado_preparacion === subVistaHistorial).length === 0 ? (
                <p className="text-slate-400 font-bold col-span-2 text-center mt-10">No hay pedidos en esta sección.</p>
              ) : (
                pedidos.filter(p => p.estado_preparacion === subVistaHistorial).map(p => (
                  <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center">
                    <div><div className="flex items-center gap-3 mb-1"><p className="text-2xl font-black text-slate-800">#{p.numero_pedido}</p><span className="text-[10px] bg-slate-100 font-black px-2 py-1 rounded-md uppercase text-slate-500">{p.tipo_consumo}</span></div><p className="font-bold text-slate-600">{p.cliente_nombre || 'Invitado'}</p><p className="text-sm font-bold text-blue-600 mt-1">${p.total} • {p.metodo_pago}</p></div>
                    <div className="text-right">
                       {subVistaHistorial === 'Pagado' && <Clock className="text-slate-400 mb-2 inline-block"/>}
                       {subVistaHistorial === 'Preparando' && <ChefHat className="text-orange-400 mb-2 inline-block"/>}
                       {subVistaHistorial === 'Listo' && <BellRing className="text-blue-500 mb-2 inline-block"/>}
                       {subVistaHistorial === 'Entregado' && <CheckCircle2 className="text-emerald-500 mb-2 inline-block"/>}
                       <p className="text-xs font-bold text-slate-400 uppercase">{subVistaHistorial === 'Pagado' ? 'Esperando Cocina' : subVistaHistorial}</p>
                       {configGlobal?.ticket_impresion_activa && (
                          <button onClick={() => lanzarImpresion(p)} className="mt-3 bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 ml-auto transition">
                             <FileText size={14}/> Imprimir
                          </button>
                       )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* VISTA: CORTE */}
        {vistaActiva === 'corte' && (
          <div>
            <h2 className="text-4xl font-black mb-10 text-slate-800">Corte de Caja</h2>
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200">
               <p className="text-slate-500 font-bold text-lg mb-6">Resumen del Turno</p>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200"><p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Fondo Inicial</p><p className="text-3xl font-black text-slate-700">${(fondoCaja || 0).toFixed(2)}</p></div>
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100"><p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Cobros Efectivo</p><p className="text-3xl font-black text-emerald-700">${pedidos.filter(p => p.metodo_pago === 'Efectivo' && (p.estado_preparacion !== 'Pendiente' && p.estado_preparacion !== 'Cancelado')).reduce((sum, p) => sum + Number(p.total), 0).toFixed(2)}</p></div>
                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100"><p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Tarjetas</p><p className="text-3xl font-black text-blue-700">${pedidos.filter(p => p.metodo_pago === 'Tarjeta' && (p.estado_preparacion !== 'Pendiente' && p.estado_preparacion !== 'Cancelado')).reduce((sum, p) => sum + Number(p.total), 0).toFixed(2)}</p></div>
                  <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100"><p className="text-xs font-black text-purple-600 uppercase tracking-widest mb-2">Transferencias</p><p className="text-3xl font-black text-purple-700">${pedidos.filter(p => p.metodo_pago === 'Transferencia' && (p.estado_preparacion !== 'Pendiente' && p.estado_preparacion !== 'Cancelado')).reduce((sum, p) => sum + Number(p.total), 0).toFixed(2)}</p></div>
               </div>
               <div className="bg-emerald-600 p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center text-white">
                  <div>
                     <p className="text-emerald-200 font-black uppercase tracking-widest mb-1 text-sm">Efectivo Físico en Cajón</p>
                     <p className="text-xs font-medium text-emerald-100 opacity-80">Fondo Inicial + Cobros en Efectivo</p>
                  </div>
                  <p className="text-6xl font-black mt-4 md:mt-0">
                     ${((fondoCaja || 0) + pedidos.filter(p => p.metodo_pago === 'Efectivo' && (p.estado_preparacion !== 'Pendiente' && p.estado_preparacion !== 'Cancelado')).reduce((sum, p) => sum + Number(p.total), 0)).toFixed(2)}
                  </p>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VistasCaja;