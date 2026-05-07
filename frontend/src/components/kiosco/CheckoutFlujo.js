import React, { useState, useEffect } from 'react';
import { ChefHat, Gift } from 'lucide-react'; // 👇 Agregamos el icono Gift para la promo

const CheckoutFlujo = ({
  pantallaActual, setPantallaActual,
  tipoConsumo, setTipoConsumo,
  direccionEntrega, setDireccionEntrega,
  direccionesGuardadas, setDireccionesGuardadas,
  carrito, calcularTotal, 
  
  // 👇 Recibimos setCarrito y productos para poder inyectar la oferta
  setCarrito,
  productos,
  
  descuentoPuntos, 
  cuponActivo,
  descuentoCuponDinero,

  clienteActivo, ordenExterna, user,
  pedidoEditandoId, apiUrl, configGlobal,
  setErrorTransaccion, setMetodoPagoFinal,
  numeroPedidoReal, setNumeroPedidoReal,
  contador, setContador, reiniciarKiosco,
  metodoPagoFinal
}) => {

  const [telefonoRecoger, setTelefonoRecoger] = useState('');
  const [pasoTelefono, setPasoTelefono] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================================================
  // 👇 NUEVO: ESTADOS Y LÓGICA DE UPSELLING (VENTA CRUZADA)
  // =========================================================
  const [promociones, setPromociones] = useState([]);
  const [upsellMostrado, setUpsellMostrado] = useState(false);
  const [promocionVigente, setPromocionVigente] = useState(null);

  // 1. Cargamos las promociones activas desde el backend
  useEffect(() => {
    fetch(`${apiUrl}/promociones`)
      .then(res => res.json())
      .then(data => setPromociones(Array.isArray(data) ? data : []))
      .catch(e => console.error("Error cargando promociones:", e));
  }, [apiUrl]);

  // 2. Evaluamos si el carrito cumple las condiciones de la promo
  useEffect(() => {
    if (pantallaActual === 'consumo' && !upsellMostrado && promociones.length > 0) {
       const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
       const hoy = diasSemana[new Date().getDay()];
       const now = new Date();
       const horaActual = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

       const promocionesValidas = promociones.filter(p => {
           if (!p.activo || p.tipo !== 'upselling') return false; // Solo procesamos Upselling aquí
           
           // Validar Día
           let diasActivos = [];
           try { diasActivos = typeof p.dias_aplicables === 'string' ? JSON.parse(p.dias_aplicables) : p.dias_aplicables; } catch(e){}
           if (!diasActivos.includes(hoy)) return false;
           
           // Validar Hora
           if (horaActual < p.hora_inicio || horaActual > p.hora_fin) return false;

           // Validar Trigger (Condición)
           if (p.producto_trigger_id) {
               const tieneTrigger = carrito.some(item => item.id === p.producto_trigger_id);
               if (!tieneTrigger) return false;
           }

           // Validar que NO tenga ya la oferta en el carrito (Para no molestar al cliente)
           const yaTieneOferta = carrito.some(item => item.id === p.producto_oferta_id);
           if (yaTieneOferta) return false;

           return true;
       });

       if (promocionesValidas.length > 0) {
           setPromocionVigente(promocionesValidas[0]); // Mostramos solo la primera que haga match
       }
       setUpsellMostrado(true); // Marcamos como mostrado para no spamear al cliente si regresa
    }
  }, [pantallaActual, promociones, carrito, upsellMostrado]);

  // 3. Función para inyectar el producto promocional al carrito
  const agregarUpsellAlCarrito = () => {
    let precioFinal = Number(promocionVigente.valor_descuento);

    // Si es un descuento en porcentaje, calculamos el precio base
    if (promocionVigente.tipo_descuento === 'porcentaje') {
       let precioBase = 0;
       if (productos && productos.length > 0) {
          const prodOriginal = productos.find(p => p.id === promocionVigente.producto_oferta_id);
          if (prodOriginal) precioBase = Number(prodOriginal.precio_base);
       }
       precioFinal = precioBase - (precioBase * (precioFinal / 100));
    }

    const nuevoItem = {
       idTicket: Math.random().toString(36).substr(2, 9),
       id: promocionVigente.producto_oferta_id,
       nombre: promocionVigente.oferta_nombre,
       precioFinal: Math.max(0, precioFinal), // Evitamos números negativos
       cantidad: 1,
       extras: [{ nombre: `⭐ Promo: ${promocionVigente.nombre}`, precio: 0 }] // Le ponemos una etiqueta bonita en el ticket
    };

    if (typeof setCarrito === 'function') {
       setCarrito([...carrito, nuevoItem]);
    } else {
       console.warn("ADVERTENCIA: setCarrito no fue pasado a CheckoutFlujo. El item no se agregó.");
    }

    setPromocionVigente(null); // Cerramos el modal
  };

  // =========================================================

  const procesarTipoConsumo = (tipo) => { 
    setTipoConsumo(tipo); 
    if (tipo === 'Domicilio') {
        setPantallaActual('aviso_domicilio'); 
    } else if (tipo === 'Recoger') {
        if (clienteActivo || (user && user.rol !== 'cliente')) { 
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

    let estadoInicial = 'Pendiente';
    if (tipoConsumo === 'Recoger') estadoInicial = 'Por Confirmar';
    if (metodoSeleccionado === 'Por Cobrar') estadoInicial = 'Preparando';

    let nombreCupon = null;
    if (cuponActivo && descuentoCuponDinero > 0) {
        nombreCupon = cuponActivo.codigo;
    }

    const paquete = { 
      cliente_id: idClienteAGuardar, 
      tipo_consumo: tipoConsumo === 'Recoger' ? 'Recoger en Local' : tipoConsumo, 
      metodo_pago: metodoSeleccionado, 
      total: calcularTotal(), 
      carrito: carritoExpandido, 
      origen: origenCalculado, 
      direccion_entrega: notaDireccion, 
      descuento_puntos: descuentoPuntos, 
      cupon_codigo: nombreCupon, 
      estado_preparacion: estadoInicial
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
        
        if (cuponActivo && cuponActivo.id) {
           try { await fetch(`${apiUrl}/cupones/${cuponActivo.id}/uso`, { method: 'PUT' }); } catch(e) {}
        }

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

  const seleccionarPago = async (metodo, montoEfectivo = null) => { 
    if (isSubmitting) return; 
    setIsSubmitting(true);

    let dirModificada = direccionEntrega;
    
    if (metodo === 'Efectivo' && tipoConsumo === 'Domicilio' && montoEfectivo) {
        dirModificada = `${direccionEntrega} | (Llevar cambio para: ${montoEfectivo})`;
    }
    
    const ok = await guardarPedidoEnBD(metodo, dirModificada); 
    if (ok) { 
      setPasoTelefono(false); 
      if (metodo === 'Transferencia') setPantallaActual('detalles_transferencia'); 
      else { 
        if (metodo === 'Por Cobrar' && user && (user.rol === 'cajero' || user.rol === 'admin')) {
            setContador(2);
        } else {
            setContador(15); 
        }
        setPantallaActual('finalizado'); 
      } 
    } 
    
    setIsSubmitting(false); 
  };
  
  const procesarTransferencia = () => { 
    setContador(15); 
    setPantallaActual('finalizado'); 
  };

  // CAPTURA DE TELÉFONO PARA INVITADOS
  if (pasoTelefono) {
    return (
        <div className="max-w-xl mx-auto mt-10 text-center animate-in zoom-in">
            <span className="text-6xl block mb-6">📱</span>
            <h2 className="text-3xl font-black mb-2 texto-destacado">Datos de Contacto</h2>
            <p className="text-slate-500 font-medium mb-8">Ingresa un número de celular para que Caja confirme tu pedido.</p>
            <input 
                type="tel" maxLength="10" required autoFocus disabled={isSubmitting}
                value={telefonoRecoger} 
                onChange={(e) => setTelefonoRecoger(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border-2 border-slate-200 rounded-3xl p-6 text-center text-3xl font-black outline-none focus:border-blue-500 shadow-sm text-slate-800 disabled:opacity-50"
                placeholder="6721234567"
            />
            <div className="flex gap-4 mt-8">
                <button disabled={isSubmitting} onClick={() => { setPasoTelefono(false); setPantallaActual('consumo'); }} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition disabled:opacity-50">Atrás</button>
                <button 
                    disabled={telefonoRecoger.length !== 10 || isSubmitting} 
                    onClick={() => seleccionarPago('Pendiente')}
                    className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 disabled:opacity-50 transition active:scale-95"
                >
                    {isSubmitting ? 'Procesando...' : 'Enviar Pedido a Caja'}
                </button>
            </div>
        </div>
    );
  }

  // PANTALLA PRINCIPAL: ¿CÓMO DISFRUTARÁS TU PEDIDO?
  if (pantallaActual === 'consumo') {
    return (
      <div className="max-w-5xl mx-auto mt-10 text-center animate-in fade-in relative">
        
        {/* 👇 MODAL DE UPSELLING (VENTA CRUZADA) */}
        {promocionVigente && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl text-center animate-in zoom-in duration-300">
              <div className="bg-orange-100 text-orange-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                 <Gift size={48} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2 leading-tight">¡Espera! Oferta Especial 🔥</h2>
              <p className="text-slate-500 font-medium mb-6">¿Te gustaría agregar esto a tu orden?</p>
              
              <div className="bg-slate-50 border-2 border-orange-200 rounded-3xl p-6 mb-8 transform hover:scale-105 transition">
                 {promocionVigente.oferta_imagen && (
                    <img 
                      src={promocionVigente.oferta_imagen.startsWith('http') ? promocionVigente.oferta_imagen : `${apiUrl.replace('/api', '')}${promocionVigente.oferta_imagen}`} 
                      className="w-32 h-32 object-cover rounded-2xl mx-auto mb-4 shadow-sm" 
                      alt="promo" 
                    />
                 )}
                 <h3 className="font-black text-2xl text-slate-800 mb-2 leading-tight">{promocionVigente.oferta_nombre}</h3>
                 <p className="text-lg font-bold text-orange-600 bg-orange-100 px-4 py-2 rounded-xl inline-block mt-2">
                   {promocionVigente.tipo_descuento === 'porcentaje' 
                     ? `¡Llévalo con ${promocionVigente.valor_descuento}% de descuento!` 
                     : `Precio especial: $${Number(promocionVigente.valor_descuento).toFixed(2)}`}
                 </p>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={agregarUpsellAlCarrito} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg shadow-orange-500/30 transition active:scale-95">
                  ¡Sí, agregarlo a mi orden!
                </button>
                <button onClick={() => setPromocionVigente(null)} className="w-full bg-slate-100 text-slate-500 hover:bg-slate-200 py-4 rounded-2xl font-bold transition active:scale-95">
                  No, gracias, continuar a pago
                </button>
              </div>
            </div>
          </div>
        )}

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

  // PANTALLA: AVISO DE COSTO DE ENVÍO
  if (pantallaActual === 'aviso_domicilio') {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center animate-in zoom-in">
        <div className="bg-purple-100 text-purple-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl shadow-inner">🛵</div>
        <h2 className="text-3xl font-black mb-4 text-slate-800">Costo de Envío</h2>
        <div className="bg-purple-50 border border-purple-200 p-8 rounded-3xl mb-8">
           <p className="text-purple-800 font-bold text-lg leading-relaxed">
             {configGlobal?.mensaje_envio || 'El costo de envío se calculará según tu zona y se sumará al total de tu pedido.'}
           </p>
        </div>
        <div className="flex gap-4">
           <button onClick={() => setPantallaActual('consumo')} className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-2xl font-bold hover:bg-slate-200 transition">Cancelar</button>
           <button onClick={() => setPantallaActual('direccion')} className="flex-[2] bg-purple-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg hover:bg-purple-700 transition active:scale-95">Entendido, Continuar</button>
        </div>
      </div>
    );
  }

  // PANTALLA: DIRECCIÓN
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

  // PANTALLA: SELECCIONAR PAGO
  if (pantallaActual === 'pago') {
    return (
      <div className="max-w-3xl mx-auto mt-10 animate-in fade-in">
        <div className="flex justify-start mb-6"><button disabled={isSubmitting} onClick={() => setPantallaActual(tipoConsumo === 'Domicilio' ? 'direccion' : 'consumo')} className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition disabled:opacity-50">⬅ Atrás</button></div>
        <h2 className="text-4xl font-black text-center mb-12 texto-destacado">Método de Pago</h2>
        <div className="grid grid-cols-1 gap-6">
          
          {user && (user.rol === 'cajero' || user.rol === 'admin') && (
            <button disabled={isSubmitting} onClick={() => seleccionarPago('Por Cobrar')} className={`bg-orange-50 p-8 rounded-[30px] shadow-lg border-2 border-orange-200 flex items-center justify-between transition-all active:scale-95 ${isSubmitting ? 'opacity-50' : 'hover:bg-orange-100 hover:border-orange-400'}`}>
                <div className="flex items-center gap-4">
                  <ChefHat size={32} className="text-orange-600" />
                  <span className="text-3xl font-black text-orange-700">{isSubmitting ? 'Procesando...' : 'Cocinar y Cobrar al Final'}</span>
                </div>
            </button>
          )}

          {tipoConsumo !== 'Domicilio' && (
             <button disabled={isSubmitting} onClick={() => seleccionarPago('Tarjeta')} className={`bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between transition-all active:scale-95 ${isSubmitting ? 'opacity-50' : 'hover:bg-blue-50 hover:border-blue-200'}`}>
                 <span className="text-3xl font-black text-slate-700">{isSubmitting ? 'Procesando...' : '💳 Tarjeta / Terminal'}</span>
             </button>
          )}
          {tipoConsumo === 'Domicilio' ? (
             <button disabled={isSubmitting} onClick={() => setPantallaActual('cambio_efectivo_domicilio')} className={`bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between transition-all active:scale-95 ${isSubmitting ? 'opacity-50' : 'hover:bg-emerald-50 hover:border-emerald-200'}`}>
                 <span className="text-3xl font-black text-slate-700">💵 Pago en Efectivo</span>
             </button>
          ) : (
             <button disabled={isSubmitting} onClick={() => seleccionarPago('Efectivo')} className={`bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between transition-all active:scale-95 ${isSubmitting ? 'opacity-50' : 'hover:bg-emerald-50 hover:border-emerald-200'}`}>
                 <span className="text-3xl font-black text-slate-700">{isSubmitting ? 'Procesando...' : '💵 Pago en Efectivo'}</span>
             </button>
          )}
          <button disabled={isSubmitting} onClick={() => seleccionarPago('Transferencia')} className={`bg-white p-8 rounded-[30px] shadow-md border border-slate-100 flex items-center justify-between transition-all active:scale-95 ${isSubmitting ? 'opacity-50' : 'hover:bg-purple-50 hover:border-purple-200'}`}>
              <span className="text-3xl font-black text-slate-700">{isSubmitting ? 'Procesando...' : '📱 Transferencia'}</span>
          </button>
        </div>
      </div>
    );
  }

  // PANTALLA: EFECTIVO A DOMICILIO (CAMBIO)
  if (pantallaActual === 'cambio_efectivo_domicilio') {
    return (
      <div className="max-w-3xl mx-auto mt-10 text-center animate-in slide-in-from-bottom-4">
        <div className="flex justify-start mb-6"><button disabled={isSubmitting} onClick={() => setPantallaActual('pago')} className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition disabled:opacity-50">⬅ Atrás</button></div>
        <span className="text-6xl block mb-6">💵</span>
        <h2 className="text-4xl font-black text-center mb-4 texto-destacado">¿Con cuánto vas a pagar?</h2>
        <p className="text-slate-500 font-medium mb-8 text-xl">El repartidor te llevará el cambio exacto.</p>
        <p className="text-2xl font-black text-blue-600 mb-8">Total de tu orden: ${calcularTotal()}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button disabled={isSubmitting} onClick={() => seleccionarPago('Efectivo', 'Exacto')} className={`bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200 font-black text-xl text-slate-700 transition-all active:scale-95 ${isSubmitting ? 'opacity-50' : 'hover:border-blue-500 hover:text-blue-600'}`}>
              {isSubmitting ? '...' : 'Exacto'}
          </button>
          {[100, 200, 300, 400, 500, 1000].filter(monto => monto > calcularTotal()).map(monto => (
            <button key={monto} disabled={isSubmitting} onClick={() => seleccionarPago('Efectivo', `$${monto}`)} className={`bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-200 font-black text-xl text-slate-700 transition-all active:scale-95 ${isSubmitting ? 'opacity-50' : 'hover:border-emerald-500 hover:text-emerald-600'}`}>
                {isSubmitting ? '...' : `$${monto}`}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // PANTALLA: TRANSFERENCIA BANCARIA
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

  // PANTALLA: FINALIZADO
  if (pantallaActual === 'finalizado') {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center animate-in zoom-in">
        <div className="bg-emerald-100 text-emerald-600 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 text-6xl shadow-inner">✓</div>
        <h2 className="text-6xl font-black mb-4 texto-destacado">¡Orden Registrada!</h2>
        <p className="text-3xl text-slate-500 mb-6">Tu número de orden es el <span className="text-slate-900 font-black text-6xl block mt-4 mb-8">#{numeroPedidoReal}</span></p>
        
        {metodoPagoFinal === 'Por Cobrar' ? (
             <div className="bg-orange-50 border border-orange-200 p-8 rounded-3xl mb-12 max-w-lg mx-auto">
                <p className="text-orange-800 font-black text-2xl mb-2">Orden enviada a cocina.</p>
                <p className="text-orange-700 font-medium text-lg">El cliente pagará al terminar de consumir.</p>
             </div>
        ) : tipoConsumo === 'Recoger' ? (
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