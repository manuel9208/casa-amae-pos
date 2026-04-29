import React, { useState } from 'react';

const CheckoutFlujo = ({
  pantallaActual, setPantallaActual,
  tipoConsumo, setTipoConsumo,
  direccionEntrega, setDireccionEntrega,
  direccionesGuardadas, setDireccionesGuardadas,
  carrito, calcularTotal, descuentoPuntos,
  clienteActivo, ordenExterna, user,
  pedidoEditandoId, apiUrl, configGlobal,
  setErrorTransaccion, setMetodoPagoFinal,
  numeroPedidoReal, setNumeroPedidoReal,
  contador, setContador, reiniciarKiosco,
  metodoPagoFinal
}) => {

  // ESTADO PARA CAPTURAR TELÉFONO EN "RECOGER EN LOCAL"
  const [telefonoRecoger, setTelefonoRecoger] = useState('');
  const [pasoTelefono, setPasoTelefono] = useState(false);

  // === FUNCIONES DE NAVEGACIÓN ===
  const procesarTipoConsumo = (tipo) => { 
    setTipoConsumo(tipo); 
    if (tipo === 'Domicilio') {
        setPantallaActual('direccion'); 
    } else if (tipo === 'Recoger') {
        if (clienteActivo) {
            seleccionarPago('Pendiente');
        } else {
            setPasoTelefono(true);
        }
    } else {
        setPantallaActual('pago'); 
    }
  };

  const continuarAPagoDesdeDireccion = () => {
    if (tipoConsumo === 'Domicilio' && direccionEntrega.trim()) {
        let nuevas = [...direccionesGuardadas];
        const dir = direccionEntrega.trim();
        if (!nuevas.includes(dir)) {
            nuevas.unshift(dir);
            if (nuevas.length > 2) nuevas.pop(); 
            setDireccionesGuardadas(nuevas);
            if (clienteActivo && clienteActivo.id) {
                localStorage.setItem(`direcciones_${clienteActivo.id}`, JSON.stringify(nuevas));
            }
        }
    }
    setPantallaActual('pago');
  };

  // === LÓGICA DE BASE DE DATOS (GUARDAR PEDIDO) ===
  const guardarPedidoEnBD = async (metodoSeleccionado, direccionFinalConAviso = direccionEntrega) => {
    setErrorTransaccion(''); 
    setMetodoPagoFinal(metodoSeleccionado);
    
    const idClienteAGuardar = ordenExterna ? ordenExterna.cliente_id : (clienteActivo?.id || null);
    let origenCalculado = 'Web'; 
    if (user?.rol === 'cajero') origenCalculado = 'Caja'; 
    else if (user?.usuario === 'kiosco' || user?.usuario === 'admin') origenCalculado = 'Kiosco'; 
    
    let notaDireccion = direccionFinalConAviso;
    if (tipoConsumo === 'Recoger') {
        const tel = clienteActivo ? clienteActivo.telefono : telefonoRecoger;
        notaDireccion = `PEDIDO POR TELÉFONO - CONTACTO: ${tel}`;
    }

    const carritoExpandido = [];
    carrito.forEach(item => {
        const qty = item.cantidad || 1;
        for(let i = 0; i < qty; i++) {
            carritoExpandido.push({...item, cantidad: 1, idTicket: item.idTicket + '_' + i});
        }
    });

    const paquete = { 
      cliente_id: idClienteAGuardar, 
      tipo_consumo: tipoConsumo === 'Recoger' ? 'Recoger en Local' : tipoConsumo, 
      metodo_pago: metodoSeleccionado, 
      total: calcularTotal(), 
      carrito: carritoExpandido, 
      origen: origenCalculado, 
      direccion_entrega: notaDireccion, 
      descuento_puntos: descuentoPuntos,
      estado_preparacion: tipoConsumo === 'Recoger' ? 'Por Confirmar' : 'Pendiente'
    };

    try {
      const url = pedidoEditandoId ? `${apiUrl}/pedidos/${pedidoEditandoId}` : `${apiUrl}/pedidos`; 
      const res = await fetch(url, { 
        method: pedidoEditandoId ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(paquete) 
      });
      if (res.ok) { 
        const data = await res.json(); 
        setNumeroPedidoReal(data.numero_pedido); 
        return true; 
      } else { 
        const errData = await res.json(); 
        setErrorTransaccion(errData.error || 'Error'); 
        return false; 
      }
    } catch (error) { 
      setErrorTransaccion('Sin conexión.'); 
      return false; 
    }
  };

  // === SELECCIÓN DE PAGO FINAL ===
  const seleccionarPago = async (metodo, montoEfectivo = null) => { 
    let dirModificada = direccionEntrega;
    
    if (metodo === 'Efectivo' && tipoConsumo === 'Domicilio' && montoEfectivo) {
        dirModificada = `${direccionEntrega} | (Llevar cambio para: ${montoEfectivo})`;
    }
    
    const ok = await guardarPedidoEnBD(metodo, dirModificada); 
    if (ok) { 
      setPasoTelefono(false); // Quitamos la pantalla del teléfono si estaba activa
      if (metodo === 'Transferencia') setPantallaActual('detalles_transferencia'); 
      else { setContador(15); setPantallaActual('finalizado'); } 
    } 
  };
  
  const procesarTransferencia = () => { 
    setContador(15); 
    setPantallaActual('finalizado'); 
  };

  // === RENDERIZADO CONDICIONAL DE VISTAS ===
  
  // 👇 PANTALLA: CAPTURA DE TELÉFONO PARA INVITADOS
  if (pasoTelefono) {
    return (
        <div className="max-w-xl mx-auto mt-10 text-center animate-in zoom-in">
            <span className="text-6xl block mb-6">📱</span>
            <h2 className="text-3xl font-black mb-2 texto-destacado">Datos de Contacto</h2>
            <p className="text-slate-500 font-medium mb-8">Ingresa un número de celular para que Caja confirme tu pedido.</p>
            <input 
                type="tel" maxLength="10" required autoFocus
                value={telefonoRecoger} 
                onChange={(e) => setTelefonoRecoger(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border-2 border-slate-200 rounded-3xl p-6 text-center text-3xl font-black outline-none focus:border-blue-500 shadow-sm text-slate-800"
                placeholder="6721234567"
            />
            <div className="flex gap-4 mt-8">
                <button onClick={() => { setPasoTelefono(false); setPantallaActual('consumo'); }} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition">Atrás</button>
                <button 
                    disabled={telefonoRecoger.length !== 10} 
                    onClick={() => seleccionarPago('Pendiente')}
                    className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 disabled:opacity-50 transition active:scale-95"
                >
                    Enviar Pedido a Caja
                </button>
            </div>
        </div>
    );
  }

  if (pantallaActual === 'consumo') {
    return (
      <div className="max-w-5xl mx-auto mt-10 text-center animate-in fade-in">
        <div className="flex justify-start"><button onClick={() => setPantallaActual('menu')} className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition">⬅ Volver al carrito</button></div>
        <h2 className="text-4xl font-black mb-4 texto-destacado mt-4">¿Cómo disfrutarás tu pedido?</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
          <button onClick={() => procesarTipoConsumo('Local')} className="bg-white p-10 rounded-[40px] shadow-lg border-4 border-transparent hover:border-blue-600 transition-all hover:-translate-y-2"><span className="text-7xl block mb-6">🍽️</span><span className="text-xl font-black text-slate-700">Comer aquí</span></button>
          <button onClick={() => procesarTipoConsumo('Para llevar')} className="bg-white p-10 rounded-[40px] shadow-lg border-4 border-transparent hover:border-blue-600 transition-all hover:-translate-y-2"><span className="text-7xl block mb-6">🛍️</span><span className="text-xl font-black text-slate-700">Para llevar</span></button>
          <button onClick={() => procesarTipoConsumo('Domicilio')} className="bg-white p-10 rounded-[40px] shadow-lg border-4 border-transparent hover:border-blue-600 transition-all hover:-translate-y-2"><span className="text-7xl block mb-6">🛵</span><span className="text-xl font-black text-slate-700">A Domicilio</span></button>
          <button onClick={() => procesarTipoConsumo('Recoger')} className="bg-white p-10 rounded-[40px] shadow-lg border-4 border-transparent hover:border-orange-500 transition-all hover:-translate-y-2"><span className="text-7xl block mb-6">📞</span><span className="text-xl font-black text-slate-700">Recoger en Local</span></button>
        </div>
      </div>
    );
  }

  if (pantallaActual === 'direccion') {
    return (
      <div className="max-w-xl mx-auto mt-10 text-center animate-in slide-in-from-bottom-4">
        <div className="flex justify-start mb-6"><button onClick={() => setPantallaActual('consumo')} className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition">⬅ Elegir otro método</button></div>
        <span className="text-6xl block mb-6">🛵</span>
        <h2 className="text-3xl font-black mb-2 texto-destacado">¿A dónde te lo enviamos?</h2>
        
        {direccionesGuardadas.length > 0 && (
           <div className="mb-6 flex gap-3 justify-center mt-6">
              {direccionesGuardadas.map((dir, idx) => (
                 <button key={idx} onClick={() => setDireccionEntrega(dir)} className={`px-6 py-3 rounded-xl font-bold border-2 transition-all ${direccionEntrega === dir ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                    {idx === 0 ? '🏠 Casa' : '🏢 Trabajo/Otro'}
                 </button>
              ))}
           </div>
        )}

        <p className="text-slate-500 font-medium mb-4 mt-6">Ingresa la dirección completa.</p>
        <textarea required value={direccionEntrega} onChange={(e) => setDireccionEntrega(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-3xl p-6 text-lg font-bold outline-none focus:border-blue-500 shadow-sm h-32 resize-none text-slate-800" placeholder="Ej. Calle Pino Suárez #123, Col. Centro." />
        <div className="flex gap-4 mt-8">
           <button disabled={!direccionEntrega.trim()} onClick={continuarAPagoDesdeDireccion} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 disabled:opacity-50 transition active:scale-95">Ir a Pagar</button>
        </div>
      </div>
    );
  }

  if (pantallaActual === 'pago') {
    return (
      <div className="max-w-3xl mx-auto mt-10 animate-in fade-in">
        <div className="flex justify-start mb-6"><button onClick={() => setPantallaActual(tipoConsumo === 'Domicilio' ? 'direccion' : 'consumo')} className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition">⬅ Atrás</button></div>
        <h2 className="text-4xl font-black text-center mb-12 texto-destacado">Método de Pago</h2>
        <div className="grid grid-cols-1 gap-6">
          {tipoConsumo !== 'Domicilio' && (
             <button onClick={() => seleccionarPago('Tarjeta')} className="bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between hover:bg-blue-50 transition-all hover:border-blue-200 active:scale-95"><span className="text-3xl font-black text-slate-700">💳 Tarjeta / Terminal</span></button>
          )}
          {tipoConsumo === 'Domicilio' ? (
             <button onClick={() => setPantallaActual('cambio_efectivo_domicilio')} className="bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between hover:bg-emerald-50 transition-all hover:border-emerald-200 active:scale-95"><span className="text-3xl font-black text-slate-700">💵 Pago en Efectivo</span></button>
          ) : (
             <button onClick={() => seleccionarPago('Efectivo')} className="bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between hover:bg-emerald-50 transition-all hover:border-emerald-200 active:scale-95"><span className="text-3xl font-black text-slate-700">💵 Pago en Caja</span></button>
          )}
          <button onClick={() => seleccionarPago('Transferencia')} className="bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between hover:bg-purple-50 transition-all hover:border-purple-200 active:scale-95"><span className="text-3xl font-black text-slate-700">📱 Transferencia</span></button>
        </div>
      </div>
    );
  }

  if (pantallaActual === 'cambio_efectivo_domicilio') {
    return (
      <div className="max-w-3xl mx-auto mt-10 text-center animate-in slide-in-from-bottom-4">
        <div className="flex justify-start mb-6"><button onClick={() => setPantallaActual('pago')} className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition">⬅ Atrás</button></div>
        <span className="text-6xl block mb-6">💵</span>
        <h2 className="text-4xl font-black text-center mb-4 texto-destacado">¿Con cuánto vas a pagar?</h2>
        <p className="text-slate-500 font-medium mb-8 text-xl">El repartidor te llevará el cambio exacto.</p>
        <p className="text-2xl font-black text-blue-600 mb-8">Total de tu orden: ${calcularTotal()}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button onClick={() => seleccionarPago('Efectivo', 'Exacto')} className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200 font-black text-xl text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95">Exacto</button>
          {[100, 200, 300, 400, 500, 1000].filter(monto => monto > calcularTotal()).map(monto => (
            <button key={monto} onClick={() => seleccionarPago('Efectivo', `$${monto}`)} className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200 font-black text-xl text-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-all active:scale-95">${monto}</button>
          ))}
        </div>
      </div>
    );
  }

  if (pantallaActual === 'detalles_transferencia') {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-10 rounded-[40px] shadow-2xl border border-blue-100 text-center animate-in zoom-in">
        <span className="text-6xl block mb-6">🏦</span><h2 className="text-3xl font-black mb-2 text-slate-800">Datos para tu pago</h2><p className="text-slate-500 font-medium mb-6">Transfiere el total exacto y envía comprobante por WhatsApp.</p>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 text-left space-y-4">
          <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Banco</p><p className="font-bold text-lg text-slate-800">{configGlobal.banco}</p></div>
          <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cuenta / CLABE</p><p className="font-black text-xl text-blue-600 tracking-wider">{configGlobal.cuenta}</p></div>
          <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">A nombre de</p><p className="font-bold text-lg text-slate-800">{configGlobal.titular}</p></div>
          <div className="pt-4 border-t border-slate-200"><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total a pagar</p><p className="font-black text-3xl text-slate-800">${calcularTotal()}</p></div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl mb-8">
          <p className="text-sm font-bold text-emerald-800 mb-2">📲 Envía tu comprobante con la orden:</p><p className="text-3xl font-black text-emerald-600 mb-2">#{numeroPedidoReal}</p><p className="text-lg font-bold text-slate-700">WhatsApp: {configGlobal.whatsapp}</p>
        </div>
        <button onClick={procesarTransferencia} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg hover:bg-blue-700 transition active:scale-95">Ya envié mi comprobante</button>
      </div>
    );
  }

  // 👇 PANTALLA: FINALIZADO
  if (pantallaActual === 'finalizado') {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center animate-in zoom-in">
        <div className="bg-emerald-100 text-emerald-600 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 text-6xl shadow-inner">✓</div>
        <h2 className="text-6xl font-black mb-4 texto-destacado">¡Orden Registrada!</h2>
        <p className="text-3xl text-slate-500 mb-6">Tu número de orden es el <span className="text-slate-900 font-black text-6xl block mt-4 mb-8">#{numeroPedidoReal}</span></p>
        
        {/* 👇 VISTA EXCLUSIVA PARA LOS PEDIDOS TELEFÓNICOS ("RECOGER EN LOCAL") */}
        {tipoConsumo === 'Recoger' ? (
             <div className="bg-orange-50 border border-orange-200 p-8 rounded-3xl mb-12 max-w-lg mx-auto">
                <p className="text-orange-800 font-black text-2xl mb-2">Pedido en revisión.</p>
                <p className="text-orange-700 font-medium text-lg">En breve nos comunicaremos contigo al teléfono proporcionado para confirmar tu orden.</p>
                <p className="text-orange-600 font-black mt-4 uppercase tracking-widest text-sm">Pagarás al recoger tu pedido.</p>
             </div>
        ) : (
            (metodoPagoFinal === 'Tarjeta' || metodoPagoFinal === 'Transferencia' || metodoPagoFinal === 'Efectivo') && (
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-3xl mb-12 max-w-lg mx-auto">
                <p className="text-blue-800 font-black text-xl">Por favor, pasa a la CAJA para {metodoPagoFinal === 'Efectivo' ? 'realizar tu pago' : 'validar tu pago'}.</p>
                <p className="text-blue-600 font-medium mt-2">Tu pedido comenzará a prepararse una vez validado.</p>
            </div>
            )
        )}

        <button onClick={reiniciarKiosco} className="bg-slate-200 px-12 py-5 rounded-2xl font-black text-slate-700 hover:bg-slate-800 hover:text-white transition-all shadow-md active:scale-95">Finalizar ({contador}s)</button>
      </div>
    );
  }

  return null;
};

export default CheckoutFlujo;