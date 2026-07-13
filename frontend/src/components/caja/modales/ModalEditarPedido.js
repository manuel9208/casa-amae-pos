import React, { useState, useEffect } from 'react';
import { Smartphone, XCircle, Home, PackagePlus, MapPin, Phone, CreditCard, RotateCcw, Truck, User, CheckCircle2, Star, Clock } from 'lucide-react';  

// 👇 IMPORTAMOS NUESTRO CEREBRO DE BÚSQUEDA
import { useBuscadorClientes } from '../useBuscadorClientes';

const ModalEditarPedido = ({ modalEditarPedido, setModalEditarPedido, guardarEdicionPedido, onGoToKiosco, isSubmitting, configGlobal, apiUrl }) => {
  const [editNombre, setEditNombre] = useState('');
  const [editClienteId, setEditClienteId] = useState(null); // NUEVO: Para vincular clientes en edición
  const [editConsumo, setEditConsumo] = useState('');
  const [editDireccion, setEditDireccion] = useState('');  
  const [editTelefono, setEditTelefono] = useState('');
  const [editMetodoPago, setEditMetodoPago] = useState('');
  
  const [editCostoEnvio, setEditCostoEnvio] = useState(0);
  const [totalBase, setTotalBase] = useState(0); 

  // 👇 USO DEL HOOK INTELIGENTE
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const { sugerencias, buscando: buscandoSugerencias } = useBuscadorClientes(editNombre, apiUrl);

  const tarifasEnvio = typeof configGlobal?.tarifas_envio === 'string' 
    ? JSON.parse(configGlobal.tarifas_envio || '[]') 
    : (configGlobal?.tarifas_envio || []);

  useEffect(() => {
    if (modalEditarPedido) {
      setEditConsumo(modalEditarPedido.tipo_consumo || 'Local');
      setEditMetodoPago(modalEditarPedido.metodo_pago || 'Efectivo');
      setEditClienteId(modalEditarPedido.cliente_id || null); // Rescatamos si ya tenía ID
      
      const costoEnvioActual = Number(modalEditarPedido.costo_envio) || 0;
      setEditCostoEnvio(costoEnvioActual);
      setTotalBase(Number(modalEditarPedido.total) - costoEnvioActual);

      let dirPura = modalEditarPedido.direccion_entrega || '';
      let telExtraido = modalEditarPedido.cliente_telefono || '';
      let nomExtraido = modalEditarPedido.cliente_nombre || '';

      if (dirPura.includes('A NOMBRE DE:')) {
        const matchNom = dirPura.match(/A NOMBRE DE:\s*([^|]+)/i);
        if (matchNom && matchNom[1]) nomExtraido = matchNom[1].trim();
      }
      if (dirPura.includes('TEL:')) {
        const matchTel = dirPura.match(/TEL:\s*(\d+)/i);
        if (matchTel && matchTel[1]) telExtraido = matchTel[1].trim();
      } else if (dirPura.includes('CONTACTO:')) {
        const matchTel = dirPura.match(/CONTACTO:\s*(\d+)/i);
        if (matchTel && matchTel[1]) telExtraido = matchTel[1].trim();
      }

      setEditNombre(nomExtraido && nomExtraido !== 'Invitado' ? nomExtraido : '');
      setEditTelefono(telExtraido);

      dirPura = dirPura
        .replace(/TEL:\s*\d*/gi, '')
        .replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/gi, '')
        .replace(/A NOMBRE DE:\s*[^|]+\|?/gi, '')
        .replace(/\[.*?\]/g, '')
        .split('|').map(s => s.trim()).filter(s => s).join(', ')
        .trim();

      if (dirPura.toLowerCase() === 'pendiente de dirección') dirPura = '';
      if (modalEditarPedido.tipo_consumo === 'Local' || modalEditarPedido.tipo_consumo === 'Para llevar') dirPura = '';

      setEditDireccion(dirPura);
    }
  }, [modalEditarPedido]);  

  // 👇 ACCIÓN AL SELECCIONAR UNA SUGERENCIA DEL HOOK
  const seleccionarSugerencia = (sug) => {
    setEditNombre(sug.cliente_nombre);
    if (sug.cliente_telefono) setEditTelefono(sug.cliente_telefono);
    if (sug.direccion_entrega && sug.direccion_entrega !== 'Pendiente de dirección') {
        if (editConsumo === 'Domicilio' || editConsumo === 'Recoger en Local') {
            setEditDireccion(sug.direccion_entrega);
        }
    }
    // MAGIA: Si el cliente está registrado, vinculamos el ID a la orden editada
    if (sug.tipo === 'registrado') {
        setEditClienteId(sug.cliente_id);
    } else {
        setEditClienteId(null);
    }
    setMostrarSugerencias(false);
  };

  const submitEdicionPedido = (e) => {
    e.preventDefault();
    let payload = {};  

    if (isCancelado) {
      payload.estado_preparacion = 'Pagado'; 
      
      let carritoLimpio = [];
      try {
          const arr = typeof modalEditarPedido.carrito === 'string' ? JSON.parse(modalEditarPedido.carrito) : (modalEditarPedido.carrito || []);
          carritoLimpio = arr.map(item => {
              const nItem = { ...item };
              delete nItem.estado;
              delete nItem.chef_id;
              delete nItem.tiempo_inicio;
              delete nItem.tiempo_fin;
              return nItem;
          });
      } catch(err) {}
      
      payload.carrito = carritoLimpio;
    } 
    else {
      payload.estado_preparacion = modalEditarPedido.estado_preparacion;

      if (canEditConsumo) {
        payload.tipo_consumo = editConsumo;
        payload.cliente_nombre = editNombre || 'Invitado'; 
        payload.cliente_telefono = editTelefono;
        payload.cliente_id = editClienteId; // 👈 Inyectamos el ID vinculado
        
        let finalDir = editDireccion;
        let finalEnvio = 0;

        if (editConsumo === 'Domicilio') {
          if (!editDireccion.trim()) return alert("Debes agregar la dirección si es a Domicilio.");
          if (editCostoEnvio === '' || editCostoEnvio === null) return alert("Debes seleccionar una Zona de Envío.");
          finalEnvio = Number(editCostoEnvio);
        } else if (editConsumo === 'Recoger en Local') {
          finalDir = editDireccion || 'Para pasar a recoger';
        } else {
          finalDir = '';
        }

        let stringDireccion = finalDir;
        if (editNombre) {
            stringDireccion = stringDireccion ? `A NOMBRE DE: ${editNombre} | ${stringDireccion}` : `A NOMBRE DE: ${editNombre}`;
        }
        if (editTelefono) {
            stringDireccion = stringDireccion ? `${stringDireccion} | TEL: ${editTelefono}` : `TEL: ${editTelefono}`;
        }

        payload.direccion_entrega = stringDireccion.trim();
        payload.costo_envio = finalEnvio;
        payload.total = totalBase + finalEnvio;
      }

      if (canEditMetodo) {
        payload.metodo_pago = editMetodoPago;
      }
    }

    guardarEdicionPedido(modalEditarPedido.id, payload);
  };  

  if (!modalEditarPedido) return null;  

  // ==========================================
  // 🛡️ MOTOR DE REGLAS VISUALES Y PERMISOS
  // ==========================================
  const estado = String(modalEditarPedido.estado_preparacion || '').trim();
  const isCancelado = estado === 'Cancelado';
  const isTerminado = ['Entregado', 'Liquidado', 'Finalizado'].includes(estado);
  const isEnCocina = ['Preparando', 'Listo', 'En Camino'].includes(estado);
  const isEnCola = ['Pendiente', 'Por Confirmar', 'Pagado'].includes(estado);

  const canEditCart = isEnCola && !isCancelado && !isTerminado;
  const canEditConsumo = (isEnCola || isEnCocina || isTerminado) && !isTerminado && !isCancelado;
  
  const isPagado = !['Pendiente', 'Por Cobrar'].includes(modalEditarPedido.metodo_pago);
  const canEditMetodo = isPagado && !isCancelado;

  const totalActualizado = totalBase + (editConsumo === 'Domicilio' ? Number(editCostoEnvio || 0) : 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <form onSubmit={submitEdicionPedido} className="bg-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col max-h-[95vh] overflow-y-auto custom-scrollbar animate-in zoom-in duration-200">
        
        <div className="flex justify-between items-center border-b pb-5 mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-700 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-inner">
              <Smartphone size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">Editar Información</h2>
              <p className="text-xs md:text-sm font-bold text-slate-500">
                Orden #{modalEditarPedido.numero_pedido}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setModalEditarPedido(null)} className="bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 p-2 md:p-2.5 rounded-full transition">
            <XCircle size={24} />
          </button>
        </div>  

        <div className="space-y-6">

          {/* 🛡️ REGLA TERMINADOS: BANNER VISUAL */}
          {isTerminado && (
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 text-center animate-in fade-in">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
              <h3 className="font-black text-emerald-800 text-xl mb-1">Orden Completada</h3>
              <p className="text-sm font-bold text-emerald-600">
                Esta orden ya fue finalizada/entregada. Por motivos de auditoría, <strong>solo puedes corregir el método de cobro</strong>.
              </p>
            </div>
          )}

          {/* 🔄 REGLA 5: REACTIVACIÓN DE CANCELADOS AUTOMÁTICA */}
          {isCancelado && (
            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 text-center animate-in fade-in">
              <RotateCcw size={40} className="text-orange-400 mx-auto mb-3" />
              <h3 className="font-black text-orange-800 text-lg mb-2">Reactivar Orden</h3>
              <p className="text-sm font-bold text-orange-600 mb-4 px-4">
                Esta orden se enviará directamente a <strong>Cocina</strong> para prepararse de nuevo. Si aún tiene un saldo pendiente, aparecerá en tus <strong>Cuentas por Cobrar</strong>.
              </p>
            </div>
          )}

          {/* 🛒 REGLA 1 y 2: MODIFICAR CARRITO */}
          {canEditCart && (
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center animate-in fade-in">
              <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center justify-center gap-1">
                <span>🛒</span> ¿Modificar platillos, cantidades o extras?
              </p>
              <button
                type="button"
                onClick={() => {
                  setModalEditarPedido(null);  
                  const clienteSimulado = editNombre ? { id: editClienteId, nombre: editNombre } : null;  
                  const ordenCorregida = { ...modalEditarPedido, cliente_nombre: editNombre || 'Invitado' };  
                  onGoToKiosco(clienteSimulado, ordenCorregida);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-sm shadow-md transition active:scale-95"
              >
                Editar Platillos en el Menú
              </button>
            </div>  
          )}

          {/* 📍 REGLA 3: TIPO DE CONSUMO Y DIRECCIÓN */}
          {canEditConsumo && (
            <div className="animate-in fade-in">
              <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Datos y Consumo</label>
              
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="Nombre o Teléfono del Cliente *"
                    value={editNombre}
                    onChange={e => {
                        setEditNombre(e.target.value);
                        setMostrarSugerencias(true); // 👈 FIX: Abre la caja mientras escribe
                        if (editClienteId) setEditClienteId(null); // 👈 FIX: Desvincula el ID si cambia el texto
                    }}
                    onFocus={() => { if(sugerencias.length > 0) setMostrarSugerencias(true); }}
                    onBlur={() => setTimeout(() => setMostrarSugerencias(false), 250)}
                    className="w-full bg-white rounded-xl py-3 pl-10 pr-3 text-sm font-bold outline-none border border-slate-200 focus:border-blue-500 text-slate-800 shadow-sm transition-all"
                />
                
                {buscandoSugerencias && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                {/* 👇 MENÚ DESPLEGABLE CON BADGES VISUALES */}
                {mostrarSugerencias && sugerencias.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resultados de Búsqueda</p>
                    </div>
                    {sugerencias.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); seleccionarSugerencia(sug); }}
                        className="w-full text-left p-4 hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors flex flex-col gap-1.5"
                      >
                        <div className="flex justify-between items-center w-full">
                            <span className="font-black text-slate-800 text-base">{sug.cliente_nombre}</span>
                            {sug.tipo === 'registrado' ? (
                                <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md shadow-sm">
                                    <Star size={12} className="fill-indigo-700"/> Registrado
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
                                    <Clock size={12}/> Histórico
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-1">
                          {sug.cliente_telefono && (
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                              <Phone size={14} className="text-emerald-500"/> {sug.cliente_telefono}
                            </span>
                          )}
                          {sug.direccion_entrega && (
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 line-clamp-1">
                              <MapPin size={14} className="text-pink-500"/> {sug.direccion_entrega}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button type="button" onClick={() => { setEditConsumo('Local'); setEditCostoEnvio(0); }} className={`p-4 rounded-xl border-2 font-bold flex items-center gap-2 justify-center transition-all ${editConsumo === 'Local' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}><Home size={18}/> Local</button>
                <button type="button" onClick={() => { setEditConsumo('Para llevar'); setEditCostoEnvio(0); }} className={`p-4 rounded-xl border-2 font-bold flex items-center gap-2 justify-center transition-all ${editConsumo === 'Para llevar' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}><PackagePlus size={18}/> Para Llevar</button>
                <button type="button" onClick={() => setEditConsumo('Domicilio')} className={`p-4 rounded-xl border-2 font-bold flex items-center gap-2 justify-center transition-all ${editConsumo === 'Domicilio' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}><Truck size={18}/> Domicilio</button>
                <button type="button" onClick={() => { setEditConsumo('Recoger en Local'); setEditCostoEnvio(0); }} className={`p-4 rounded-xl border-2 font-bold flex items-center gap-2 justify-center transition-all ${editConsumo === 'Recoger en Local' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}><Phone size={18}/> Recoger</button>
              </div>

              {(editConsumo === 'Domicilio' || editConsumo === 'Recoger en Local' || editConsumo === 'Para llevar') && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={16} className={editConsumo === 'Domicilio' ? "text-red-400" : "text-slate-400"} />
                    </div>
                    <input
                      type="tel"
                      maxLength="10"
                      placeholder={editConsumo === 'Domicilio' ? "Teléfono (Obligatorio) *" : "Teléfono (Opcional)"}
                      required={editConsumo === 'Domicilio'}
                      value={editTelefono}
                      onChange={e => setEditTelefono(e.target.value.replace(/\D/g, ''))}
                      className={`w-full bg-white rounded-xl py-3 pl-10 pr-3 text-sm font-bold outline-none border transition-all shadow-sm ${editConsumo === 'Domicilio' && !editTelefono ? 'border-red-200 focus:border-red-400 text-red-900' : 'border-slate-200 focus:border-blue-500 text-slate-800'}`}
                    />
                  </div>

                  {(editConsumo === 'Domicilio' || editConsumo === 'Recoger en Local') && (
                    <div className="relative">
                      <div className="absolute top-3 left-3 pointer-events-none">
                        <MapPin size={16} className="text-slate-400" />
                      </div>
                      <textarea
                        required={editConsumo === 'Domicilio'}
                        value={editDireccion}
                        onChange={(e) => setEditDireccion(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-3 text-sm font-bold outline-none focus:border-blue-500 transition-all shadow-sm text-slate-800 placeholder-slate-400 resize-none h-16"
                        placeholder={editConsumo === 'Domicilio' ? 'Dirección completa (Obligatorio) *' : 'Notas (Ej. Carro rojo, pasa en 10 min)'}
                      />
                    </div>
                  )}

                  {editConsumo === 'Domicilio' && (
                    <select
                      required
                      value={editCostoEnvio}
                      onChange={e => setEditCostoEnvio(Number(e.target.value))}
                      className={`w-full bg-white border rounded-xl p-3 text-sm font-bold outline-none cursor-pointer transition-all shadow-sm ${editCostoEnvio === '' || editCostoEnvio === 0 ? 'border-red-200 text-red-600 focus:border-red-400' : 'border-blue-200 text-blue-700 focus:border-blue-500'}`}
                    >
                      <option value="">-- Selecciona la Zona de Envío * --</option>
                      {tarifasEnvio.map((t, i) => (
                        <option key={i} value={t.costo}>{t.zona} (+${t.costo})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 💳 REGLAS 3 y 4: CORREGIR MÉTODO DE PAGO */}
          {canEditMetodo && (
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 animate-in fade-in">
               <label className="block text-xs font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                 <CreditCard size={14} /> Corregir Método de Cobro
               </label>
               <select
                  value={editMetodoPago}
                  onChange={(e) => setEditMetodoPago(e.target.value)}
                  className="w-full bg-white border border-emerald-200 rounded-xl p-3 outline-none focus:border-emerald-500 font-bold text-slate-700"
               >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta / Terminal</option>
                  <option value="Transferencia">Transferencia</option>
               </select>
            </div>
          )}

        </div>  

        {/* 📊 RESUMEN DE TOTALES EN VIVO */}
        {!isCancelado && !isTerminado && (
          <div className="mt-6 border-t border-slate-100 pt-4 px-2">
             <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-1">
                <span>Subtotal Platillos:</span>
                <span>${totalBase.toFixed(2)}</span>
             </div>
             {editConsumo === 'Domicilio' && (
               <div className="flex justify-between items-center text-xs font-bold text-blue-500 mb-1">
                  <span>Envío:</span>
                  <span>+${Number(editCostoEnvio || 0).toFixed(2)}</span>
               </div>
             )}
             <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                <span className="font-black text-slate-800 uppercase tracking-widest text-sm">Nuevo Total:</span>
                <span className="text-2xl font-black text-blue-600">${totalActualizado.toFixed(2)}</span>
             </div>
          </div>
        )}

        {/* 📊 RESUMEN DE TOTALES EN VIVO (Para órdenes TERMINADAS) */}
        {!isCancelado && isTerminado && (
          <div className="mt-6 border-t border-slate-100 pt-4 px-2">
             <div className="flex justify-between items-center">
                <span className="font-black text-slate-800 uppercase tracking-widest text-sm">Total Cobrado:</span>
                <span className="text-3xl font-black text-emerald-600">${Number(modalEditarPedido.total).toFixed(2)}</span>
             </div>
          </div>
        )}

        <div className="flex gap-4 pt-6 mt-6 border-t border-slate-200">
          <button type="button" disabled={isSubmitting} onClick={() => setModalEditarPedido(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-blue-600 text-white font-black text-lg rounded-2xl hover:bg-blue-700 shadow-lg disabled:opacity-50 transition">
            {isCancelado ? 'Reactivar Pedido' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};  

export default ModalEditarPedido;