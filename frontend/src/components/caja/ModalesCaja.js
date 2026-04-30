import React from 'react';
import { DollarSign, CheckCircle2, XCircle, BellRing, MessageSquare, AlertTriangle, CreditCard, Smartphone, MapPin, PackagePlus } from 'lucide-react';

const ModalesCaja = ({
  fondoCaja, iniciarTurno, inputFondo, setInputFondo,
  modalResolver, setModalResolver, itemAfectadoIdx, setItemAfectadoIdx, accionAlerta, setAccionAlerta, ingredienteReemplazo, setIngredienteReemplazo, enviarRespuestaCocina, catalogoIngredientes,
  modalPago, setModalPago, montoRecibido, setMontoRecibido, procesarPago,
  configGlobal, modalZonaEnvio, setModalZonaEnvio, confirmarPedidoDomicilio,
  // 👇 PROPS NUEVAS COMPRAS RÁPIDAS
  modalCompraRapida, setModalCompraRapida, insumosDB, insumoComprar, setInsumoComprar,
  paquetesComprados, setPaquetesComprados, registrarCompraRapida
}) => {

  const getIconoPago = (metodo) => { 
    if(metodo==='Tarjeta') return <CreditCard size={16}/>; 
    if(metodo==='Transferencia') return <Smartphone size={16}/>; 
    return <DollarSign size={16}/>; 
  };

  const getTarifasEnvio = () => {
    if (!configGlobal?.tarifas_envio) return [];
    try {
      return typeof configGlobal.tarifas_envio === 'string' ? JSON.parse(configGlobal.tarifas_envio) : configGlobal.tarifas_envio;
    } catch (e) { return []; }
  };

  return (
    <>
      {/* MODAL FONDO CAJA */}
      {fondoCaja === null && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <form onSubmit={iniciarTurno} className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md text-center animate-in zoom-in">
            <span className="text-6xl mb-6 block">💵</span>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Apertura de Caja</h2>
            <p className="text-slate-500 font-medium mb-8">¿Con cuánta feria (efectivo) inicias tu turno hoy?</p>
            <input 
              type="number" required autoFocus min="0" step="0.5" 
              value={inputFondo} onChange={e => setInputFondo(e.target.value)} 
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-center text-4xl font-black outline-none focus:border-emerald-500 text-slate-800 mb-6" 
              placeholder="$0.00" 
            />
            <button type="submit" disabled={inputFondo===''} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg transition disabled:opacity-50">Comenzar Turno</button>
          </form>
        </div>
      )}

      {/* 👇 NUEVO MODAL: PANEL DE COMPRAS RÁPIDAS */}
      {modalCompraRapida && !insumoComprar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-6 mb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                  <PackagePlus className="text-emerald-500" size={32} /> Compras Rápidas
                </h2>
                <p className="text-slate-500 font-bold mt-1">Registra la entrada de insumos de emergencia.</p>
              </div>
              <button onClick={() => setModalCompraRapida(false)} className="bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 p-3 rounded-full transition">
                <XCircle size={28} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 bg-slate-50 rounded-2xl border border-slate-100">
              {insumosDB.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold">No hay insumos registrados en la base de datos.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-100 shadow-sm z-10">
                    <tr>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Insumo</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Stock Actual</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Costo Unit.</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {insumosDB.map(insumo => (
                      <tr key={insumo.id} className="hover:bg-white transition group">
                        <td className="p-4">
                          <p className="font-black text-slate-700">{insumo.nombre}</p>
                          <p className="text-xs font-bold text-slate-400">{insumo.cantidad_presentacion} {insumo.unidad_medida}</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-lg text-xs font-black ${Number(insumo.stock_actual) <= 0 ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
                            {Number(insumo.stock_actual).toFixed(2)} {insumo.unidad_medida}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-600">${insumo.costo_presentacion}</td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => { setInsumoComprar(insumo); setPaquetesComprados(''); }}
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-xl font-black text-sm transition shadow-sm"
                          >
                            Registrar Compra
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 👇 NUEVO MODAL: INGRESAR CANTIDAD A COMPRAR */}
      {insumoComprar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <form onSubmit={registrarCompraRapida} className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-md animate-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black text-slate-800 mb-1">Ingresar Stock</h2>
            <p className="text-slate-500 font-bold mb-6 pb-4 border-b">
              Insumo: <span className="text-blue-600">{insumoComprar.nombre}</span> ({insumoComprar.cantidad_presentacion} {insumoComprar.unidad_medida})
            </p>

            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Paquetes / Cajas Compradas</label>
                <input 
                  type="number" 
                  min="0.1" step="0.1" required autoFocus
                  value={paquetesComprados} 
                  onChange={(e) => setPaquetesComprados(e.target.value)} 
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-center text-3xl font-black outline-none focus:border-emerald-500 text-slate-800" 
                  placeholder="Ej. 2" 
                />
              </div>

              {/* El precio está bloqueado para el cajero */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Costo Fijo del Paquete ($)</label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center text-2xl font-black text-slate-500 cursor-not-allowed">
                  ${insumoComprar.costo_presentacion}
                </div>
                <p className="text-[10px] text-center text-slate-400 mt-2 font-bold">*El costo unitario solo puede modificarse desde el panel de Administrador.</p>
              </div>

              {/* Cálculo automático */}
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl text-center">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Total Pagado a Proveedor</p>
                <p className="text-5xl font-black text-blue-700">
                  ${paquetesComprados ? (Number(paquetesComprados) * Number(insumoComprar.costo_presentacion)).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={() => { setInsumoComprar(null); setPaquetesComprados(''); }} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
              <button type="submit" disabled={!paquetesComprados || Number(paquetesComprados) <= 0} className="flex-[2] py-5 bg-emerald-500 text-white font-black text-xl rounded-2xl disabled:opacity-50 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition flex justify-center items-center gap-2"><CheckCircle2 size={24}/> Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL ASIGNAR ZONA DE ENVÍO */}
      {modalZonaEnvio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-xl animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-6 border-b pb-4">
              <MapPin className="text-purple-500" size={32} />
              <h2 className="text-2xl font-black text-slate-800">Asignar Zona de Envío</h2>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Orden a Domicilio</p>
                <p className="font-bold text-slate-800 text-lg">#{modalZonaEnvio.numero_pedido}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Actual</p>
                <p className="font-black text-2xl text-blue-600">${modalZonaEnvio.total}</p>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest">Selecciona la zona correspondiente:</p>
            
            <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-2">
              {getTarifasEnvio().length === 0 ? (
                <div className="bg-orange-50 text-orange-700 p-4 rounded-xl border border-orange-200 flex items-center gap-3">
                  <AlertTriangle size={20} />
                  <p className="font-bold text-sm">No hay zonas configuradas. Se enviará a cocina con costo de envío $0.</p>
                </div>
              ) : (
                getTarifasEnvio().map((tarifa, index) => (
                  <button 
                    key={index} 
                    onClick={() => confirmarPedidoDomicilio(modalZonaEnvio, tarifa)}
                    className="w-full flex justify-between items-center p-4 bg-white border-2 border-slate-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition group"
                  >
                    <span className="font-black text-slate-700 group-hover:text-purple-800">{tarifa.zona}</span>
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-black group-hover:bg-purple-600 group-hover:text-white transition">
                      + ${tarifa.costo}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setModalZonaEnvio(null)} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
              {getTarifasEnvio().length === 0 && (
                 <button onClick={() => confirmarPedidoDomicilio(modalZonaEnvio, {zona: 'Sin Zona', costo: 0})} className="flex-[2] py-5 bg-purple-600 text-white font-black text-xl rounded-2xl hover:bg-purple-700 shadow-lg transition">Mandar a Cocina (Envío $0)</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESPONDER A COCINA */}
      {modalResolver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={enviarRespuestaCocina} className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-xl">
            <div className="flex items-center gap-3 mb-6 border-b pb-4"><BellRing className="text-red-500" size={32} /><h2 className="text-2xl font-black text-slate-800">Responder a Cocina</h2></div>
            <div className="bg-red-50 p-4 rounded-2xl mb-6 border border-red-100"><p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Mensaje del Chef:</p><p className="text-lg font-black text-red-700">{modalResolver.alerta_cocina.replace(/\[IDX:\d+\]\s*/g, '')}</p></div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-black text-slate-400 uppercase mb-2">1. Platillo con el problema</label>
                <select required value={itemAfectadoIdx} onChange={(e) => {setItemAfectadoIdx(e.target.value); setIngredienteReemplazo('');}} disabled={modalResolver.alerta_cocina.includes('[IDX:')} className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none text-slate-700 ${modalResolver.alerta_cocina.includes('[IDX:') ? 'opacity-70 cursor-not-allowed' : 'focus:border-blue-500'}`}>
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
                            <input type="radio" name="accion" value="aceptar" checked={accionAlerta === 'aceptar'} onChange={() => setAccionAlerta('aceptar')} className="hidden" /><CheckCircle2 size={20}/> Aceptar Propuesta: {propuestaChef}
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

      {/* MODAL COBRAR PEDIDO */}
      {modalPago && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8 border-b pb-6">
              <h2 className="text-4xl font-black text-slate-800">Orden #{modalPago.numero_pedido}</h2>
              <span className={`text-lg font-bold px-4 py-2 rounded-xl flex items-center gap-2 tracking-wide uppercase ${modalPago.metodo_pago === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                {getIconoPago(modalPago.metodo_pago)} {modalPago.metodo_pago}
              </span>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-3xl mb-8 flex justify-between items-center border border-slate-100">
              <div><p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Total a Cobrar</p><p className="text-5xl font-black text-blue-600">${modalPago.total}</p></div>
              <div className="text-right"><p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p><p className="text-xl font-bold text-slate-700">{modalPago.cliente_nombre || 'Invitado'}</p><p className="text-sm font-bold text-slate-500">{modalPago.tipo_consumo}</p></div>
            </div>

            {modalPago.metodo_pago === 'Pendiente' ? (
              <div className="space-y-6 text-center">
                <p className="font-black text-slate-400 uppercase tracking-widest text-sm mb-4">Selecciona el método de pago final:</p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <button onClick={() => setModalPago({...modalPago, metodo_pago: 'Efectivo'})} className="bg-emerald-50 hover:border-emerald-500 border-2 border-transparent text-emerald-700 p-6 rounded-[24px] font-black flex flex-col items-center gap-2 transition active:scale-95"><DollarSign size={32}/> Efectivo</button>
                    <button onClick={() => setModalPago({...modalPago, metodo_pago: 'Tarjeta'})} className="bg-blue-50 hover:border-blue-500 border-2 border-transparent text-blue-700 p-6 rounded-[24px] font-black flex flex-col items-center gap-2 transition active:scale-95"><CreditCard size={32}/> Tarjeta</button>
                    <button onClick={() => setModalPago({...modalPago, metodo_pago: 'Transferencia'})} className="bg-purple-50 hover:border-purple-500 border-2 border-transparent text-purple-700 p-6 rounded-[24px] font-black flex flex-col items-center gap-2 transition active:scale-95"><Smartphone size={32}/> Transf.</button>
                </div>
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <button onClick={() => setModalPago(null)} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
                    <button onClick={() => procesarPago('Cancelado')} className="flex-1 py-5 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition">Anular Pedido</button>
                </div>
              </div>
            ) : modalPago.metodo_pago === 'Efectivo' ? (
              <div className="space-y-6 animate-in fade-in">
                <div><label className="block text-sm font-black text-slate-400 uppercase mb-3">Monto Recibido</label><input type="number" autoFocus value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl p-6 text-center text-4xl font-black outline-none focus:border-blue-500 text-slate-800" placeholder="$0.00" /></div>
                <div className="grid grid-cols-4 gap-3">
                  <button onClick={() => setMontoRecibido(modalPago.total)} className="bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 font-black py-4 rounded-xl transition text-lg">Exacto</button>
                  <button onClick={() => setMontoRecibido(100)} className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-black py-4 rounded-xl transition text-lg">$100</button>
                  <button onClick={() => setMontoRecibido(200)} className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-black py-4 rounded-xl transition text-lg">$200</button>
                  <button onClick={() => setMontoRecibido(500)} className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-black py-4 rounded-xl transition text-lg">$500</button>
                </div>
                {montoRecibido && Number(montoRecibido) >= Number(modalPago.total) && ( 
                  <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center">
                    <p className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-1">Cambio a devolver</p>
                    <p className="text-5xl font-black text-emerald-500">${(Number(montoRecibido) - Number(modalPago.total)).toFixed(2)}</p>
                  </div> 
                )}
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button onClick={() => setModalPago(null)} className="py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
                  <button onClick={() => procesarPago('Cancelado')} className="py-5 px-6 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition" title="Rechazar y Borrar Pedido"><XCircle size={28}/></button>
                  <button onClick={() => procesarPago()} disabled={!montoRecibido || Number(montoRecibido) < Number(modalPago.total)} className="flex-1 py-5 bg-emerald-500 text-white font-black text-2xl rounded-2xl disabled:opacity-50 hover:bg-emerald-600 shadow-lg transition flex items-center justify-center gap-2"><CheckCircle2 size={28}/> Confirmar Cobro</button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-8 animate-in fade-in">
                <div className="bg-blue-50 border border-blue-200 p-8 rounded-3xl">
                  <AlertTriangle className="mx-auto text-blue-500 mb-4" size={48}/>
                  <h3 className="text-2xl font-black text-blue-900 mb-2">Validación Manual Requerida</h3>
                  <p className="text-blue-700 font-medium">Verifica en la {modalPago.metodo_pago === 'Tarjeta' ? 'Terminal Bancaria' : 'App de tu Banco / WhatsApp'} que el cobro por <strong>${modalPago.total}</strong> haya sido exitoso.</p>
                </div>
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button onClick={() => setModalPago(null)} className="py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
                  <button onClick={() => procesarPago('Cancelado')} className="py-5 px-6 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition" title="Rechazar y Borrar Pedido"><XCircle size={28}/></button>
                  <button onClick={() => procesarPago()} className="flex-1 py-5 bg-blue-600 text-white font-black text-2xl rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition flex items-center justify-center gap-2"><CheckCircle2 size={28}/> Pago Validado</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ModalesCaja;