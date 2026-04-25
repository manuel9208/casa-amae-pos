import React, { useState, useEffect } from 'react';
import { LogOut, DollarSign, CreditCard, Smartphone, CheckCircle2, XCircle, AlertTriangle, Monitor, ShoppingBag, FileText, List, BellRing, Check, Clock, ChefHat, MessageSquare } from 'lucide-react';

const Caja = ({ user, onLogout }) => {
  const [vistaActiva, setVistaActiva] = useState('cobrar'); 
  const [subVistaHistorial, setSubVistaHistorial] = useState('Pagado'); 
  const [pedidos, setPedidos] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  
  const [modalPago, setModalPago] = useState(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  
  const [modalResolver, setModalResolver] = useState(null);
  const [itemAfectadoIdx, setItemAfectadoIdx] = useState('');
  const [accionAlerta, setAccionAlerta] = useState('quitar');
  const [ingredienteReemplazo, setIngredienteReemplazo] = useState('');

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    fetch(`${apiUrl}/ingredientes`).then(r=>r.json()).then(data => setCatalogoIngredientes(Array.isArray(data) ? data : []));
    const cargarPedidos = async () => {
      try { const res = await fetch(`${apiUrl}/pedidos/hoy`); const data = await res.json(); setPedidos(Array.isArray(data) ? data : []); } catch (error) { console.error('Error al cargar pedidos'); }
    };
    cargarPedidos(); const intervalo = setInterval(cargarPedidos, 3000); return () => clearInterval(intervalo);
  }, [apiUrl]);

  const procesarPago = async (estadoFinal) => {
    try { const res = await fetch(`${apiUrl}/pedidos/${modalPago.id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: estadoFinal }) }); if (res.ok) { setModalPago(null); setMontoRecibido(''); } } catch (error) { alert('Error al procesar el pago.'); }
  };

  const actualizarEstadoPedido = async (id, nuevoEstado) => {
    try { await fetch(`${apiUrl}/pedidos/${id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: nuevoEstado }) }); } catch (error) {}
  };

  const limpiarAlerta = async (id) => {
    try { await fetch(`${apiUrl}/pedidos/${id}/alerta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: null }) }); } catch (error) {}
  };

  const enviarRespuestaCocina = async (e) => {
    e.preventDefault();
    const itemSeleccionado = modalResolver.carrito[itemAfectadoIdx];
    const extrasStr = (itemSeleccionado.extras || []).map(ex => ex.nombre).join(', ');
    const nombreCompleto = `${itemSeleccionado.nombre}${extrasStr ? ` (${extrasStr})` : ''}`;

    let respuesta = `[IDX:${itemAfectadoIdx}] ✅ CAJA RESPONDE: En ${nombreCompleto}, `;
    if (accionAlerta === 'quitar') respuesta += `preparar SIN el ingrediente faltante.`;
    if (accionAlerta === 'cambiar') respuesta += `CAMBIAR el faltante por: ${ingredienteReemplazo}.`;
    
    const match = modalResolver.alerta_cocina.match(/Propuesta: (.*)/);
    const propuestaChef = match ? match[1] : null;
    if (accionAlerta === 'aceptar') respuesta += `ACEPTAR PROPUESTA (${propuestaChef}).`;

    try {
      await fetch(`${apiUrl}/pedidos/${modalResolver.id}/alerta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: respuesta }) });
      setModalResolver(null); setItemAfectadoIdx(''); setAccionAlerta('quitar'); setIngredienteReemplazo('');
    } catch (error) { alert('Error al enviar respuesta a cocina.'); }
  };

  const abrirModalResolver = (p) => {
    setModalResolver(p); 
    
    // Leemos el índice oculto
    const idxMatch = p.alerta_cocina.match(/\[IDX:(\d+)\]/);
    if (idxMatch) {
      setItemAfectadoIdx(idxMatch[1]);
    } else {
      setItemAfectadoIdx('');
    }
    
    setIngredienteReemplazo('');
    const match = p.alerta_cocina.match(/Propuesta: (.*)/);
    if (match && match[1] && match[1] !== 'Ninguna' && match[1] !== 'Solo quitarlo') setAccionAlerta('aceptar'); else setAccionAlerta('quitar');
  };

  const getIconoPago = (metodo) => { if(metodo==='Tarjeta') return <CreditCard size={16}/>; if(metodo==='Transferencia') return <Smartphone size={16}/>; return <DollarSign size={16}/>; };

  const pendientesDePago = pedidos.filter(p => p.estado_preparacion === 'Pendiente');
  const listosParaEntregar = pedidos.filter(p => p.estado_preparacion === 'Listo');
  const pedidosConAlerta = pedidos.filter(p => p.alerta_cocina && p.estado_preparacion !== 'Entregado' && p.estado_preparacion !== 'Cancelado');

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      
      <div className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-20 relative">
        <div className="p-8 pb-4"><h1 className="text-2xl font-black flex items-center gap-3 text-emerald-400"><DollarSign /> CAJA</h1></div>
        <nav className="flex-1 px-4 space-y-2 mt-6">
          <button onClick={() => setVistaActiva('cobrar')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${vistaActiva === 'cobrar' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><ShoppingBag size={22}/> Cobrar Pedidos{pendientesDePago.length > 0 && <span className="ml-auto bg-blue-800 text-white text-xs px-2 py-1 rounded-full">{pendientesDePago.length}</span>}</button>
          <button onClick={() => setVistaActiva('entregas')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all relative ${vistaActiva === 'entregas' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><Monitor size={22}/> Monitor Entregas{listosParaEntregar.length > 0 && <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-1 rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]">{listosParaEntregar.length}</span>}</button>
          <button onClick={() => setVistaActiva('historial')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${vistaActiva === 'historial' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><List size={22}/> Ver Todos</button>
          <button onClick={() => setVistaActiva('corte')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${vistaActiva === 'corte' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}><FileText size={22}/> Corte de Caja</button>
        </nav>
        <div className="p-6 border-t border-slate-800 text-center"><p className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-1">Cajero en Turno</p><p className="text-lg font-black text-slate-200 mb-6">{user.nombre}</p><button onClick={onLogout} className="w-full bg-slate-800 hover:bg-red-500 text-red-400 hover:text-white py-4 rounded-2xl font-black transition flex items-center justify-center gap-2"><LogOut size={20}/> Cerrar Sesión</button></div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
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
          {vistaActiva === 'cobrar' && (
            <>
              <h2 className="text-4xl font-black mb-10 text-slate-800">Pedidos Pendientes de Pago</h2>
              {pendientesDePago.length === 0 ? (
                <div className="text-center text-slate-400 mt-20"><CheckCircle2 size={64} className="mx-auto mb-4 opacity-30"/><p className="text-2xl font-bold">Todo al día, no hay cobros pendientes.</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {pendientesDePago.map(p => (
                    <div key={p.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-4"><h3 className="text-3xl font-black text-slate-800">#{p.numero_pedido}</h3><span className={`text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-widest ${p.metodo_pago === 'Efectivo' ? 'bg-emerald-100 text-emerald-700' : p.metodo_pago === 'Tarjeta' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{getIconoPago(p.metodo_pago)} {p.metodo_pago}</span></div>
                      <p className="font-bold text-slate-600 text-lg mb-1">{p.cliente_nombre || 'Invitado'}</p><p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">{p.tipo_consumo}</p>
                      <div className="mt-auto pt-6 border-t border-slate-100"><p className="text-4xl font-black text-blue-600 mb-6">${p.total}</p><button onClick={() => { setModalPago(p); setMontoRecibido(''); }} className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition ${p.metodo_pago === 'Efectivo' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'}`}>{p.metodo_pago === 'Efectivo' ? <><DollarSign size={24}/> Recibir Efectivo</> : <><CheckCircle2 size={24}/> Validar Pago</>}</button></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {vistaActiva === 'entregas' && (
            <>
              <h2 className="text-4xl font-black mb-10 text-slate-800">Listos para Entregar</h2>
              {listosParaEntregar.length === 0 ? (
                <div className="text-center text-slate-400 mt-20"><ChefHat size={64} className="mx-auto mb-4 opacity-30"/><p className="text-2xl font-bold">La cocina aún está preparando los pedidos.</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {listosParaEntregar.map(p => (
                    <div key={p.id} className="bg-orange-50 p-8 rounded-[40px] shadow-lg shadow-orange-500/20 border-2 border-orange-400 flex flex-col transition animate-pulse">
                      <div className="flex justify-between items-start mb-4"><h3 className="text-4xl font-black text-orange-600">#{p.numero_pedido}</h3><span className="bg-orange-600 text-white px-4 py-1 rounded-full font-black uppercase text-sm tracking-widest">{p.tipo_consumo}</span></div>
                      <p className="font-black text-slate-800 text-2xl mb-1">{p.cliente_nombre || 'Invitado'}</p>
                      {p.tipo_consumo === 'Domicilio' && <p className="text-sm font-bold text-slate-500 mt-2 bg-white p-3 rounded-xl">📍 {p.direccion_entrega}</p>}
                      <div className="mt-auto pt-6 border-t border-orange-200"><button onClick={() => actualizarEstadoPedido(p.id, 'Entregado')} className="w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl transition active:scale-95"><Check size={28}/> Marcar como Entregado</button></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

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
                      <div className="text-right">{subVistaHistorial === 'Pagado' && <Clock className="text-slate-400 mb-2 inline-block"/>}{subVistaHistorial === 'Preparando' && <ChefHat className="text-orange-400 mb-2 inline-block"/>}{subVistaHistorial === 'Listo' && <BellRing className="text-blue-500 mb-2 inline-block"/>}{subVistaHistorial === 'Entregado' && <CheckCircle2 className="text-emerald-500 mb-2 inline-block"/>}<p className="text-xs font-bold text-slate-400 uppercase">{subVistaHistorial === 'Pagado' ? 'Esperando Cocina' : subVistaHistorial}</p></div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {vistaActiva === 'corte' && (
            <div>
              <h2 className="text-4xl font-black mb-10 text-slate-800">Corte de Caja</h2>
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200">
                 <p className="text-slate-500 font-bold text-lg mb-4">Resumen del Turno</p>
                 <div className="grid grid-cols-3 gap-6">
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100"><p className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-2">Efectivo Recibido</p><p className="text-4xl font-black text-emerald-700">${pedidos.filter(p => p.metodo_pago === 'Efectivo' && (p.estado_preparacion !== 'Pendiente' && p.estado_preparacion !== 'Cancelado')).reduce((sum, p) => sum + Number(p.total), 0).toFixed(2)}</p></div>
                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100"><p className="text-sm font-black text-blue-600 uppercase tracking-widest mb-2">Tarjetas / Terminal</p><p className="text-4xl font-black text-blue-700">${pedidos.filter(p => p.metodo_pago === 'Tarjeta' && (p.estado_preparacion !== 'Pendiente' && p.estado_preparacion !== 'Cancelado')).reduce((sum, p) => sum + Number(p.total), 0).toFixed(2)}</p></div>
                    <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100"><p className="text-sm font-black text-purple-600 uppercase tracking-widest mb-2">Transferencias</p><p className="text-4xl font-black text-purple-700">${pedidos.filter(p => p.metodo_pago === 'Transferencia' && (p.estado_preparacion !== 'Pendiente' && p.estado_preparacion !== 'Cancelado')).reduce((sum, p) => sum + Number(p.total), 0).toFixed(2)}</p></div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL RESPONDER ALERTA A COCINA ================= */}
      {modalResolver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={enviarRespuestaCocina} className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-xl">
            <div className="flex items-center gap-3 mb-6 border-b pb-4"><BellRing className="text-red-500" size={32} /><h2 className="text-2xl font-black text-slate-800">Responder a Cocina</h2></div>
            <div className="bg-red-50 p-4 rounded-2xl mb-6 border border-red-100"><p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Mensaje del Chef:</p><p className="text-lg font-black text-red-700">{modalResolver.alerta_cocina.replace(/\[IDX:\d+\]\s*/g, '')}</p></div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-black text-slate-400 uppercase mb-2">1. Platillo con el problema</label>
                <select 
                  required 
                  value={itemAfectadoIdx} 
                  onChange={(e) => {setItemAfectadoIdx(e.target.value); setIngredienteReemplazo('');}} 
                  // 👇 TRUCO MAESTRO: Si la cocina mandó el ID exacto, se bloquea el selector.
                  disabled={modalResolver.alerta_cocina.includes('[IDX:')}
                  className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none text-slate-700 ${modalResolver.alerta_cocina.includes('[IDX:') ? 'opacity-70 cursor-not-allowed' : 'focus:border-blue-500'}`}
                >
                  <option value="">Selecciona el platillo...</option>
                  {(modalResolver.carrito || []).map((item, idx) => {
                    const extrasStr = (item.extras || []).map(e => e.nombre).join(', ');
                    const nombreLabel = `${item.nombre}${extrasStr ? ` (${extrasStr})` : ''}`;
                    return <option key={idx} value={idx}>{nombreLabel}</option>
                  })}
                </select>
              </div>

              {itemAfectadoIdx !== '' && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in fade-in">
                  <label className="block text-sm font-black text-slate-400 uppercase mb-3">2. ¿Qué decidió el cliente?</label>
                  <div className="flex flex-col gap-3 mb-4">
                    {(() => {
                      const match = modalResolver.alerta_cocina.match(/Propuesta: (.*)/);
                      const propuestaChef = match ? match[1] : null;
                      if (propuestaChef && propuestaChef !== 'Ninguna' && propuestaChef !== 'Solo quitarlo') {
                        return (
                          <label className={`w-full flex items-center gap-3 cursor-pointer p-4 border rounded-xl font-bold transition ${accionAlerta === 'aceptar' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white text-slate-600 hover:border-slate-300'}`}>
                            <input type="radio" name="accion" value="aceptar" checked={accionAlerta === 'aceptar'} onChange={() => setAccionAlerta('aceptar')} className="hidden" />
                            <CheckCircle2 size={20}/> Aceptar Propuesta: {propuestaChef}
                          </label>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className="flex gap-3">
                      <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-4 border rounded-xl font-bold transition ${accionAlerta === 'quitar' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-slate-600 hover:border-slate-300'}`}><input type="radio" name="accion" value="quitar" checked={accionAlerta === 'quitar'} onChange={() => setAccionAlerta('quitar')} className="hidden" /> Quitar Faltante</label>
                      <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-4 border rounded-xl font-bold transition ${accionAlerta === 'cambiar' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-slate-600 hover:border-slate-300'}`}><input type="radio" name="accion" value="cambiar" checked={accionAlerta === 'cambiar'} onChange={() => setAccionAlerta('cambiar')} className="hidden" /> Cambiarlo por...</label>
                    </div>
                  </div>

                  {accionAlerta === 'cambiar' && (
                    <div className="animate-in fade-in zoom-in duration-200 mt-4 pt-4 border-t border-slate-200">
                      <label className="block text-xs font-black text-slate-400 uppercase mb-2">Opciones Base de este Platillo</label>
                      <select required value={ingredienteReemplazo} onChange={(e) => setIngredienteReemplazo(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 text-slate-700 shadow-sm">
                        <option value="">Selecciona reemplazo...</option>
                        {(() => {
                          const itemSeleccionado = modalResolver.carrito[itemAfectadoIdx];
                          if(!itemSeleccionado) return null;
                          const bases = catalogoIngredientes.filter(ing => ing.clasificacion_nombre === itemSeleccionado.categoria && ing.tipo === 'base');
                          return bases.length > 0 ? bases.map(b => <option key={b.id} value={b.nombre}>{b.nombre}</option>) : <option disabled>No hay ingredientes base registrados.</option>;
                        })()}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={() => {setModalResolver(null); setItemAfectadoIdx('');}} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
              <button type="submit" disabled={itemAfectadoIdx === '' || (accionAlerta==='cambiar' && !ingredienteReemplazo)} className="flex-[2] py-5 bg-blue-600 text-white font-black text-xl rounded-2xl hover:bg-blue-700 shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2"><MessageSquare size={24}/> Enviar Respuesta</button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL EMERGENTE DE COBRO ================= */}
      {modalPago && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8 border-b pb-6"><h2 className="text-4xl font-black text-slate-800">Orden #{modalPago.numero_pedido}</h2><span className="bg-slate-100 text-slate-600 font-bold px-4 py-2 rounded-xl text-lg flex items-center gap-2">{getIconoPago(modalPago.metodo_pago)} {modalPago.metodo_pago}</span></div>
            <div className="bg-slate-50 p-6 rounded-3xl mb-8 flex justify-between items-center border border-slate-100"><div><p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Total a Cobrar</p><p className="text-5xl font-black text-blue-600">${modalPago.total}</p></div><div className="text-right"><p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p><p className="text-xl font-bold text-slate-700">{modalPago.cliente_nombre || 'Invitado'}</p><p className="text-sm font-bold text-slate-500">{modalPago.tipo_consumo}</p></div></div>
            {modalPago.metodo_pago === 'Efectivo' ? (
              <div className="space-y-6">
                <div><label className="block text-sm font-black text-slate-400 uppercase mb-3">Monto Recibido</label><input type="number" autoFocus value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl p-6 text-center text-4xl font-black outline-none focus:border-blue-500 text-slate-800" placeholder="$0.00" /></div>
                <div className="grid grid-cols-4 gap-3"><button onClick={() => setMontoRecibido(modalPago.total)} className="bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 font-black py-4 rounded-xl transition text-lg">Exacto</button><button onClick={() => setMontoRecibido(100)} className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-black py-4 rounded-xl transition text-lg">$100</button><button onClick={() => setMontoRecibido(200)} className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-black py-4 rounded-xl transition text-lg">$200</button><button onClick={() => setMontoRecibido(500)} className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-black py-4 rounded-xl transition text-lg">$500</button></div>
                {montoRecibido && Number(montoRecibido) >= Number(modalPago.total) && ( <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center"><p className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-1">Cambio a devolver</p><p className="text-5xl font-black text-emerald-500">${(Number(montoRecibido) - Number(modalPago.total)).toFixed(2)}</p></div> )}
                <div className="flex gap-4 pt-4 border-t border-slate-100"><button onClick={() => setModalPago(null)} className="py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button><button onClick={() => procesarPago('Cancelado')} className="py-5 px-6 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition" title="Rechazar y Borrar Pedido"><XCircle size={28}/></button><button onClick={() => procesarPago('Pagado')} disabled={!montoRecibido || Number(montoRecibido) < Number(modalPago.total)} className="flex-1 py-5 bg-emerald-500 text-white font-black text-2xl rounded-2xl disabled:opacity-50 hover:bg-emerald-600 shadow-lg transition flex items-center justify-center gap-2"><CheckCircle2 size={28}/> Confirmar Cobro</button></div>
              </div>
            ) : (
              <div className="text-center space-y-8">
                <div className="bg-blue-50 border border-blue-200 p-8 rounded-3xl"><AlertTriangle className="mx-auto text-blue-500 mb-4" size={48}/><h3 className="text-2xl font-black text-blue-900 mb-2">Validación Manual Requerida</h3><p className="text-blue-700 font-medium">Verifica en la {modalPago.metodo_pago === 'Tarjeta' ? 'Terminal Bancaria' : 'App de tu Banco / WhatsApp'} que el cobro por <strong>${modalPago.total}</strong> haya sido exitoso.</p></div>
                <div className="flex gap-4 pt-4 border-t border-slate-100"><button onClick={() => setModalPago(null)} className="py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button><button onClick={() => procesarPago('Cancelado')} className="py-5 px-6 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition" title="Rechazar y Borrar Pedido"><XCircle size={28}/></button><button onClick={() => procesarPago('Pagado')} className="flex-1 py-5 bg-blue-600 text-white font-black text-2xl rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition flex items-center justify-center gap-2"><CheckCircle2 size={28}/> Pago Validado</button></div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
export default Caja;