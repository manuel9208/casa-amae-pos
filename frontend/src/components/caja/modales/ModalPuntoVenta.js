import React, { useState, useEffect } from 'react';
import { XCircle, ShoppingBag, ChefHat, Delete, Tag } from 'lucide-react';
import CategoriasGrid from '../../kiosco/menu/CategoriasGrid';
import ProductosGrid from '../../kiosco/menu/ProductosGrid';
import ModalPersonalizar from '../../kiosco/ModalPersonalizar';

const ModalPuntoVenta = ({ 
  modalPuntoVenta, setModalPuntoVenta, ordenEditandoRapida, user, configGlobal, 
  productos, clasificaciones, catalogoIngredientes, apiUrl, lanzarImpresion, 
  setModalPago, refrescarDatosCaja, empleadosPOS, mesas 
}) => {
  const [paso, setPaso] = useState('identificar'); 
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [errorMsg, setErrorMsg] = useState(''); 
  
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [clienteAsignado, setClienteAsignado] = useState(null);
  const [nombreOrden, setNombreOrden] = useState('');
  const [tipoConsumo, setTipoConsumo] = useState('Local');
  const [notaOpcional, setNotaOpcional] = useState(''); 
  const [mesaSeleccionada, setMesaSeleccionada] = useState(''); 
  const [zonaEnvioCosto, setZonaEnvioCosto] = useState(''); 

  const [cuponInput, setCuponInput] = useState('');
  const [cuponActivo, setCuponActivo] = useState(null);
  const [msgCupon, setMsgCupon] = useState({ texto: '', tipo: '' });

  const [datosNuevoCliente, setDatosNuevoCliente] = useState({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: '' });

  const [carrito, setCarrito] = useState([]);
  const [productoEnEspera, setProductoEnEspera] = useState(null);
  const [itemAEditar, setItemAEditar] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modoComedor, setModoComedor] = useState(false);
  const [pinEmpleado, setPinEmpleado] = useState('');
  const [errorComedor, setErrorComedor] = useState('');

  const tarifasEnvio = typeof configGlobal?.tarifas_envio === 'string' 
      ? JSON.parse(configGlobal.tarifas_envio || '[]') 
      : (configGlobal?.tarifas_envio || []);

  useEffect(() => {
    if (modalPuntoVenta) {
      if (ordenEditandoRapida) {
         setPaso('menu');
         setClienteAsignado(ordenEditandoRapida.cliente_id ? { id: ordenEditandoRapida.cliente_id, nombre: ordenEditandoRapida.cliente_nombre } : null);
         setNombreOrden(ordenEditandoRapida.cliente_nombre || '');
         
         let telExtraido = '';
         let dirPura = ordenEditandoRapida.direccion_entrega || '';
         if (dirPura.includes('| TEL:')) {
            const partes = dirPura.split('| TEL:');
            dirPura = partes[0].trim();
            telExtraido = partes[1].replace('|', '').trim();
         }

         setTelefonoCliente(telExtraido);
         setTipoConsumo(ordenEditandoRapida.tipo_consumo || 'Local');
         setMesaSeleccionada(ordenEditandoRapida.mesa || '');
         setZonaEnvioCosto(ordenEditandoRapida.costo_envio || ''); 
         setCuponInput(ordenEditandoRapida.cupon_codigo || '');
         setCuponActivo(null);
         setMsgCupon({texto: '', tipo: ''});
         setNotaOpcional(dirPura);
         const car = typeof ordenEditandoRapida.carrito === 'string' ? JSON.parse(ordenEditandoRapida.carrito) : (ordenEditandoRapida.carrito || []);
         setCarrito(car);
      } else {
         setPaso('identificar'); setCarrito([]); setTelefonoCliente(''); setClienteAsignado(null);
         setNombreOrden(''); setTipoConsumo('Local'); setNotaOpcional(''); setErrorMsg('');
         setMesaSeleccionada(''); setZonaEnvioCosto(''); setModoComedor(false); setPinEmpleado(''); setErrorComedor('');
         setCuponInput(''); setCuponActivo(null); setMsgCupon({texto: '', tipo: ''});
         // 👇 CORRECCIÓN: Reseteamos explícitamente la categoría
         setCategoriaActiva(null); 
         setDatosNuevoCliente({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: '' });
      }
    }
  }, [modalPuntoVenta, ordenEditandoRapida]);

  // 👇 NUEVA FUNCIÓN para asegurar la limpieza antes de cerrar
  const cerrarModalVenta = () => {
    setCategoriaActiva(null);
    setModalPuntoVenta(false);
  };

  if (!modalPuntoVenta) return null;

  const calcularSubtotal = () => carrito.reduce((t, i) => t + ((i.precioFinal || 0) * (i.cantidad || 1)), 0);
  const subtotal = calcularSubtotal();
  
  let descuento = 0;
  if (cuponActivo) {
      if (cuponActivo.tipo === 'porcentaje') descuento = subtotal * (Number(cuponActivo.valor) / 100);
      else if (cuponActivo.tipo === 'dinero') descuento = Number(cuponActivo.valor);
  }
  if (descuento > subtotal) descuento = subtotal; 

  const totalConEnvio = (subtotal - descuento) + (zonaEnvioCosto ? Number(zonaEnvioCosto) : 0); 

  const categoriasUnicas = [...new Set(productos.map(p => p.categoria || 'General'))];
  const productosFiltrados = productos.filter(p => (p.categoria || 'General') === categoriaActiva);

  const getPortadaCategoria = (catName) => {
    const clasifDB = clasificaciones.find(c => c.nombre === catName);
    return { imagen_url: clasifDB?.imagen_url || null, emoji: clasifDB?.emoji || '🍽️' };
  };

  const cambiarCantidadCart = (idTicket, delta) => setCarrito(carrito.map(item => item.idTicket === idTicket ? { ...item, cantidad: Math.max(1, (item.cantidad || 1) + delta) } : item));
  const quitarDelCarrito = (idTicket) => setCarrito(carrito.filter(i => i.idTicket !== idTicket));
  const abrirModalProducto = (p) => { setItemAEditar(null); setProductoEnEspera(p); };

  const buscarClienteRapido = async (e) => {
    e.preventDefault(); setErrorMsg('');
    if (telefonoCliente.length !== 10) return setErrorMsg('El celular debe tener 10 dígitos.');
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/identificar`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({telefono: telefonoCliente}) });
      const data = await res.json();
      if (res.ok && (data.tipo === 'cliente' || data.cliente)) {
        setClienteAsignado(data.data || data.cliente); setNombreOrden((data.data || data.cliente).nombre); setPaso('menu');
      } else setPaso('registro');
    } catch(err) { setErrorMsg('Error de conexión.'); }
    setIsSubmitting(false);
  };

  const registrarClienteRapido = async (e) => {
    e.preventDefault(); setErrorMsg('');
    if(!datosNuevoCliente.nombre.trim() || !datosNuevoCliente.apellido.trim() || datosNuevoCliente.nip.length !== 4) return setErrorMsg('Nombre, Apellido y NIP son obligatorios.');
    setIsSubmitting(true);
    try {
        const res = await fetch(`${apiUrl}/clientes/registro`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({telefono: telefonoCliente, ...datosNuevoCliente}) });
        const data = await res.json();
        if (res.ok) { setClienteAsignado(data.cliente || data); setNombreOrden((data.cliente || data).nombre); setPaso('menu'); } 
        else setErrorMsg(data.error || 'Fallo al registrar cliente.');
    } catch(err) { setErrorMsg('Error de red al registrar.'); }
    setIsSubmitting(false);
  };

  const aplicarCupon = async (e) => {
    e.preventDefault();
    if(!cuponInput.trim()) return;
    setMsgCupon({ texto: 'Verificando...', tipo: 'info' });
    try {
        const res = await fetch(`${apiUrl}/cupones`);
        const data = await res.json();
        if(Array.isArray(data)) {
            const cup = data.find(c => c.codigo.toUpperCase() === cuponInput.trim().toUpperCase());
            if(!cup) return setMsgCupon({ texto: 'Cupón no encontrado.', tipo: 'error' });
            if(!cup.activo) return setMsgCupon({ texto: 'El cupón está inactivo.', tipo: 'error' });
            if(cup.fecha_expiracion && new Date(cup.fecha_expiracion) < new Date()) return setMsgCupon({ texto: 'El cupón ha expirado.', tipo: 'error' });
            if(cup.limite_usos && cup.usos_actuales >= cup.limite_usos) return setMsgCupon({ texto: 'Límite de usos alcanzado.', tipo: 'error' });
            
            setCuponActivo(cup);
            setMsgCupon({ texto: `¡Aplicado! -${cup.tipo === 'porcentaje' ? cup.valor + '%' : '$' + cup.valor}`, tipo: 'success' });
        } else {
            setMsgCupon({ texto: 'Error al cargar cupones.', tipo: 'error' });
        }
    } catch (err) {
        setMsgCupon({ texto: 'Error de red.', tipo: 'error' });
    }
  };

  const generarPedidoBD = async (metodoAcelerado, empleadoComedor = null) => {
    if (carrito.length === 0 || isSubmitting) return;
    if (!empleadoComedor && !nombreOrden.trim()) return alert("El nombre del cliente es obligatorio."); 
    setIsSubmitting(true);

    const carritoExpandido = [];
    carrito.forEach(item => { const qty = item.cantidad || 1; for(let i=0; i<qty; i++) carritoExpandido.push({...item, cantidad: 1, idTicket: item.idTicket + '_' + i}); });

    let stringDireccion = notaOpcional;
    let tipoFinal = tipoConsumo;
    let pagoFinal = ordenEditandoRapida ? ordenEditandoRapida.metodo_pago : 'Por Cobrar';
    
    const costoEnvioFinal = zonaEnvioCosto ? Number(zonaEnvioCosto) : 0;

    if (empleadoComedor) {
        tipoFinal = 'Local'; pagoFinal = 'Comida Personal';
        stringDireccion = `A NOMBRE DE: ${empleadoComedor.nombre} | COMEDOR (${empleadoComedor.rol})`;
    } else {
        if (tipoConsumo === 'Domicilio' && stringDireccion === '') stringDireccion = 'Pendiente de dirección';
        else if (nombreOrden) stringDireccion = `A NOMBRE DE: ${nombreOrden} | ${notaOpcional}`;
        
        if (tipoConsumo === 'Domicilio' && !clienteAsignado && telefonoCliente) {
            stringDireccion += ` | TEL: ${telefonoCliente}`;
        }
    }

    let estadoInicial = ordenEditandoRapida ? ordenEditandoRapida.estado_preparacion : 'Pendiente';
    
    if (empleadoComedor) {
        estadoInicial = 'Pagado'; 
    } else if (metodoAcelerado === 'Mandar a Cocina') {
        estadoInicial = 'Pagado'; 
    } else if (metodoAcelerado === 'Cobrar Ahora') {
        estadoInicial = 'Pendiente'; 
    }

    const paquete = { 
      cliente_id: empleadoComedor ? null : (clienteAsignado?.id || null), 
      tipo_consumo: tipoFinal, metodo_pago: pagoFinal, 
      total: empleadoComedor ? 0 : totalConEnvio, 
      costo_envio: costoEnvioFinal, 
      carrito: carritoExpandido, 
      origen: 'Caja', direccion_entrega: stringDireccion, estado_preparacion: estadoInicial,
      mesa: tipoFinal === 'Local' ? (mesaSeleccionada || null) : null,
      cupon_codigo: cuponActivo ? cuponActivo.codigo : null 
    };

    const url = ordenEditandoRapida ? `${apiUrl}/pedidos/${ordenEditandoRapida.id}` : `${apiUrl}/pedidos`;
    const metodoHttp = ordenEditandoRapida ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method: metodoHttp, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paquete) });
      if (res.ok) {
        const data = await res.json();
        
        if (!empleadoComedor && clienteAsignado?.id && tipoFinal === 'Domicilio' && stringDireccion) {
            const dirLimpia = stringDireccion.split(' | TEL:')[0].split(' | (Llevar')[0].replace(`A NOMBRE DE: ${nombreOrden} | `, '').trim();
            if (dirLimpia && dirLimpia !== 'Pendiente de dirección') {
                fetch(`${apiUrl}/clientes/${clienteAsignado.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ direccion: dirLimpia })
                }).catch(() => {});
            }
        }

        refrescarDatosCaja(); 
        if (metodoAcelerado === 'Mandar a Cocina' || empleadoComedor) {
           if (!ordenEditandoRapida && configGlobal?.ticket_impresion_activa) lanzarImpresion(data);
           cerrarModalVenta();
        } else {
           cerrarModalVenta();
           setTimeout(() => setModalPago(data), 100); 
        }
      } else alert('Error al guardar el pedido.');
    } catch (e) { alert('Sin conexión.'); }
    setIsSubmitting(false);
  };

  const procesarComedorPersonal = () => {
    setErrorComedor('');
    if (pinEmpleado.length !== 4) return setErrorComedor('Ingresa un PIN de 4 dígitos');
    const empleadoActivo = empleadosPOS?.find(e => e.pin === pinEmpleado);
    if (!empleadoActivo) return setErrorComedor('PIN Incorrecto.');

    const limite = configGlobal?.comedor_limite || 'ambos'; 
    const catBebidas = typeof configGlobal?.comedor_clasif_bebidas === 'string' ? JSON.parse(configGlobal.comedor_clasif_bebidas || '[]') : (configGlobal?.comedor_clasif_bebidas || []);
    const catPlatillos = typeof configGlobal?.comedor_clasif_platillos === 'string' ? JSON.parse(configGlobal.comedor_clasif_platillos || '[]') : (configGlobal?.comedor_clasif_platillos || []);
    
    let contBebidas = 0; let contPlatillos = 0; let errorCals = false;
    carrito.forEach(item => {
        const qty = item.cantidad || 1; const cat = item.categoria || 'General';
        if (catBebidas.includes(cat)) contBebidas += qty;
        else if (catPlatillos.includes(cat)) contPlatillos += qty;
        else errorCals = true; 
    });

    if (errorCals) return setErrorComedor('Artículos NO autorizados en la orden.');
    if (limite === 'solo_comida' && (contBebidas > 0 || contPlatillos > 1)) return setErrorComedor('Límite excedido (Solo 1 platillo).');
    if (limite === 'solo_bebida' && (contPlatillos > 0 || contBebidas > 1)) return setErrorComedor('Límite excedido (Solo 1 bebida).');
    if (limite === 'ambos' && (contPlatillos > 1 || contBebidas > 1)) return setErrorComedor('Límite: 1 platillo + 1 bebida.');
    
    generarPedidoBD('Mandar a Cocina', empleadoActivo);
  };

  const isFormIncompleto = carrito.length === 0 || isSubmitting || !nombreOrden.trim() || 
                           (tipoConsumo === 'Domicilio' && (!notaOpcional.trim() || zonaEnvioCosto === '' || (!clienteAsignado && telefonoCliente.length !== 10)));

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-50 w-full max-w-7xl h-[95vh] rounded-[36px] shadow-2xl overflow-hidden flex flex-col relative">
        <button onClick={cerrarModalVenta} className="absolute top-4 right-4 z-50 bg-white shadow-md hover:bg-red-100 text-slate-400 hover:text-red-500 p-2 rounded-full transition"><XCircle size={28} /></button>

        {paso === 'identificar' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in zoom-in-95">
             <div className="bg-white p-10 rounded-[40px] shadow-xl w-full max-w-md text-center border border-slate-100">
                <span className="text-6xl block mb-6">👤</span>
                <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Levantar Pedido</h2>
                <p className="text-slate-500 font-medium mb-8">Ingresa el celular del cliente para vincular sus puntos.</p>
                <form onSubmit={buscarClienteRapido} className="mb-4">
                  <input type="tel" maxLength="10" autoFocus disabled={isSubmitting} value={telefonoCliente} onChange={e => { setTelefonoCliente(e.target.value.replace(/\D/g, '')); setErrorMsg(''); }} className={`w-full bg-slate-50 border-2 rounded-2xl p-5 text-center text-3xl font-black outline-none transition-all tracking-widest placeholder-slate-300 text-slate-800 ${errorMsg ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`} placeholder="000 000 0000" />
                  {errorMsg && <p className="text-red-500 font-bold text-sm mt-3 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
                  <button type="submit" disabled={telefonoCliente.length !== 10 || isSubmitting} className="w-full mt-6 bg-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 disabled:opacity-50 transition active:scale-95">{isSubmitting ? 'Buscando...' : 'Siguiente'}</button>
                </form>
                <button onClick={() => { setTelefonoCliente(''); setPaso('menu'); }} className="w-full bg-slate-100 text-slate-600 py-5 rounded-2xl font-black text-xl hover:bg-slate-200 transition active:scale-95 mt-4">Orden de Invitado</button>
             </div>
          </div>
        ) : paso === 'registro' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in slide-in-from-right">
            <form onSubmit={registrarClienteRapido} className="bg-white p-10 rounded-[40px] shadow-xl w-full max-w-md text-center border border-slate-100">
               <span className="text-6xl mb-4 block">✨</span><h2 className="text-2xl font-black text-slate-800 mb-1">¡Nuevo Cliente!</h2>
               
               <div className="grid grid-cols-2 gap-4 mt-6 mb-4">
                  <input type="text" required disabled={isSubmitting} value={datosNuevoCliente.nombre} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500" placeholder="Nombre *" />
                  <input type="text" required disabled={isSubmitting} value={datosNuevoCliente.apellido} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, apellido: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500" placeholder="Apellido *" />
               </div>
               
               <input type="email" disabled={isSubmitting} value={datosNuevoCliente.correo} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, correo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 font-bold outline-none focus:border-blue-500" placeholder="Correo (Opcional)" />
               
               <div className="grid grid-cols-2 gap-4 mb-6 text-left">
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Nacimiento (Opcional)</label>
                      <input type="date" disabled={isSubmitting} value={datosNuevoCliente.fecha_nacimiento} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, fecha_nacimiento: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500 text-slate-600" />
                  </div>
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">NIP (4 dígitos) *</label>
                      <input type="text" maxLength="4" required disabled={isSubmitting} value={datosNuevoCliente.nip} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nip: e.target.value.replace(/\D/g, '')})} className="w-full bg-blue-50 text-blue-800 border-2 border-blue-200 rounded-xl p-3 font-black text-center tracking-[0.5em] focus:border-blue-500 outline-none" placeholder="1234" />
                  </div>
               </div>
               
               {errorMsg && <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded-lg mb-4">{errorMsg}</p>}

               <div className="flex gap-4"><button type="button" onClick={() => setPaso('identificar')} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Atrás</button><button type="submit" className="flex-[2] py-4 bg-emerald-500 text-white font-black rounded-2xl disabled:opacity-50 hover:bg-emerald-600 transition">Registrar</button></div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="w-full md:w-3/5 lg:w-2/3 p-6 overflow-y-auto bg-slate-50 custom-scrollbar">
               {!categoriaActiva ? <CategoriasGrid configGlobal={configGlobal} categoriasUnicas={categoriasUnicas} getPortadaCategoria={getPortadaCategoria} setCategoriaActiva={setCategoriaActiva} baseUrl={apiUrl.replace('/api', '')} /> : <ProductosGrid categoriaActiva={categoriaActiva} setCategoriaActiva={setCategoriaActiva} productosFiltrados={productosFiltrados} abrirModalProducto={abrirModalProducto} baseUrl={apiUrl.replace('/api', '')} />}
            </div>

            <div className="w-full md:w-2/5 lg:w-1/3 bg-white border-l border-slate-200 shadow-xl flex flex-col h-full z-10 relative overflow-hidden">
               {modoComedor && (
                  <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center animate-in slide-in-from-bottom p-6">
                    <button onClick={() => { setModoComedor(false); setPinEmpleado(''); setErrorComedor(''); }} className="absolute top-6 left-6 text-slate-400 hover:text-white transition">Atrás</button>
                    <div className="text-center mb-6"><ChefHat size={48} className="text-blue-500 mx-auto mb-4" /><h3 className="text-2xl font-black text-white">Comedor de Personal</h3></div>
                    <div className="flex gap-3 mb-8">{[0, 1, 2, 3].map(i => <div key={i} className={`w-4 h-4 rounded-full ${pinEmpleado.length > i ? 'bg-blue-500 scale-110' : 'bg-slate-700'}`} />)}</div>
                    <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => <button key={num} onClick={() => pinEmpleado.length < 4 && setPinEmpleado(prev => prev + num.toString())} className="bg-slate-800 text-white text-3xl font-black p-4 rounded-2xl active:scale-95">{num}</button>)}
                      <div></div><button onClick={() => pinEmpleado.length < 4 && setPinEmpleado(prev => prev + '0')} className="bg-slate-800 text-white text-3xl font-black p-4 rounded-2xl active:scale-95">0</button>
                      <button onClick={() => setPinEmpleado(prev => prev.slice(0, -1))} className="bg-slate-800 text-slate-400 flex items-center justify-center p-4 rounded-2xl active:scale-95"><Delete size={28} /></button>
                    </div>
                    {errorComedor && <p className="text-red-400 font-bold mt-4">{errorComedor}</p>}
                    <button disabled={pinEmpleado.length !== 4 || isSubmitting} onClick={procesarComedorPersonal} className="mt-6 w-full max-w-[280px] bg-blue-600 text-white py-4 rounded-2xl font-black disabled:opacity-50">Autorizar Comida a $0.00</button>
                  </div>
               )}

               <div className="p-6 border-b border-slate-100 bg-white shrink-0">
                  <h3 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-2"><ShoppingBag className="text-blue-500"/> Orden en Curso</h3>
                  <div className="space-y-3">
                     <div className="grid grid-cols-2 gap-2">
                        {['Local', 'Para llevar', 'Domicilio', 'Recoger'].map(t => <button key={t} onClick={() => { setTipoConsumo(t); setZonaEnvioCosto(''); }} className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider ${tipoConsumo === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{t}</button>)}
                     </div>
                     <input type="text" value={nombreOrden} onChange={e => setNombreOrden(e.target.value)} placeholder="Nombre del Cliente (Obligatorio) *" className={`w-full bg-slate-50 border rounded-xl p-3 text-sm font-bold outline-none ${!nombreOrden.trim() ? 'border-red-200 focus:border-red-400' : 'border-slate-200 focus:border-blue-500'}`} />
                     
                     {tipoConsumo === 'Domicilio' && !clienteAsignado && (
                        <input type="tel" maxLength="10" value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value.replace(/\D/g, ''))} placeholder="Celular para Repartidor (10 dígitos) *" className={`w-full bg-slate-50 border rounded-xl p-3 text-sm font-bold outline-none tracking-widest ${telefonoCliente.length !== 10 ? 'border-red-200 focus:border-red-400' : 'border-slate-200 focus:border-blue-500'}`} />
                     )}

                     {tipoConsumo === 'Local' && mesas && mesas.length > 0 && (
                        <select 
                           value={mesaSeleccionada} 
                           onChange={e => setMesaSeleccionada(e.target.value)} 
                           className="w-full bg-blue-50 text-blue-800 border border-blue-200 rounded-xl p-3 text-sm font-bold outline-none cursor-pointer"
                        >
                           <option value="">-- Asignación Libre / Barra --</option>
                           {mesas
                             .filter(m => m.estado === 'Libre' || (ordenEditandoRapida && m.numero_mesa === ordenEditandoRapida.mesa))
                             .map(m => (
                               <option key={m.id} value={m.numero_mesa}>
                                  {String(m.numero_mesa).toLowerCase().startsWith('mesa') ? m.numero_mesa : `Mesa ${m.numero_mesa}`}
                               </option>
                             ))
                           }
                        </select>
                     )}

                     {['Domicilio', 'Recoger'].includes(tipoConsumo) && (
                        <textarea value={notaOpcional} onChange={e => setNotaOpcional(e.target.value)} placeholder={tipoConsumo === 'Domicilio' ? 'Dirección completa o enlaces *' : 'Placas, notas...'} className="w-full bg-slate-50 border rounded-xl p-3 text-sm font-bold outline-none h-12 resize-none border-slate-200 focus:border-blue-500" />
                     )}

                     {tipoConsumo === 'Domicilio' && (
                        <select value={zonaEnvioCosto} onChange={e => setZonaEnvioCosto(e.target.value)} className={`w-full bg-slate-50 border rounded-xl p-3 text-sm font-bold outline-none cursor-pointer ${zonaEnvioCosto === '' ? 'border-red-200 text-red-500 focus:border-red-400' : 'border-emerald-200 text-emerald-700'}`}>
                           <option value="">-- Selecciona la Zona de Envío * --</option>
                           {tarifasEnvio.map((t, i) => (
                              <option key={i} value={t.costo}>{t.zona} (+${t.costo})</option>
                           ))}
                        </select>
                     )}

                     <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                           <Tag size={16} className="absolute left-3 top-3.5 text-slate-400" />
                           <input 
                             type="text" 
                             placeholder="Cupón de Descuento" 
                             value={cuponInput} 
                             onChange={(e) => { setCuponInput(e.target.value.toUpperCase()); setMsgCupon({texto:'', tipo:''}); }}
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-9 pr-3 text-sm font-bold outline-none uppercase focus:border-blue-500"
                             disabled={cuponActivo !== null || isSubmitting}
                           />
                        </div>
                        {!cuponActivo ? (
                          <button disabled={!cuponInput.trim() || isSubmitting} onClick={aplicarCupon} className="bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase hover:bg-slate-700 transition disabled:opacity-50">Aplicar</button>
                        ) : (
                          <button onClick={() => { setCuponActivo(null); setCuponInput(''); setMsgCupon({texto:'', tipo:''}); }} className="bg-red-100 text-red-600 px-5 py-3 rounded-xl font-bold text-xs uppercase hover:bg-red-200 transition">Quitar</button>
                        )}
                     </div>
                     {msgCupon.texto && (
                        <p className={`text-[10px] font-bold px-1 ${msgCupon.tipo === 'error' ? 'text-red-500' : msgCupon.tipo === 'success' ? 'text-emerald-600' : 'text-slate-500'}`}>{msgCupon.texto}</p>
                     )}

                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 custom-scrollbar">
                  {carrito.map(item => (
                      <div key={item.idTicket} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative">
                         <p className="font-black text-sm">{item.cantidad > 1 && <span className="text-blue-600 mr-1">{item.cantidad}x</span>}{item.nombre}</p>
                         <ul className="text-[10px] space-y-0.5 mb-3">{item.extras?.map((e, idx) => <li key={idx} className="text-slate-500 font-bold">{e.nombre}</li>)}</ul>
                         <div className="flex justify-between items-center mt-2 border-t border-slate-50 pt-3">
                            <p className="font-black text-blue-600">${item.precioFinal * (item.cantidad || 1)}</p>
                            <div className="flex bg-slate-50 rounded-lg"><button onClick={() => cambiarCantidadCart(item.idTicket, -1)} className="px-3 py-1 font-black">-</button><span className="px-2 font-bold text-xs">{item.cantidad || 1}</span><button onClick={() => cambiarCantidadCart(item.idTicket, 1)} className="px-3 py-1 font-black">+</button></div>
                         </div>
                         <button onClick={() => quitarDelCarrito(item.idTicket)} className="absolute right-2 top-2 text-slate-300 hover:text-red-500"><XCircle size={20}/></button>
                      </div>
                  ))}
               </div>

               <div className="p-6 bg-white border-t border-slate-100 shrink-0 space-y-3">
                  <div className="flex justify-between items-center mb-1">
                     <span className="text-slate-400 font-bold uppercase text-xs">Subtotal:</span>
                     <span className="text-lg font-black text-slate-600">${subtotal.toFixed(2)}</span>
                  </div>
                  {descuento > 0 && (
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-emerald-500 font-bold uppercase text-xs">Descuento ({cuponActivo?.codigo}):</span>
                        <span className="text-lg font-black text-emerald-600">-${descuento.toFixed(2)}</span>
                     </div>
                  )}
                  {zonaEnvioCosto && (
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-purple-500 font-bold uppercase text-xs">Costo de Envío:</span>
                        <span className="text-lg font-black text-purple-600">+${Number(zonaEnvioCosto).toFixed(2)}</span>
                     </div>
                  )}
                  
                  <div className="flex justify-between items-center mb-3 pt-2 border-t border-slate-100">
                     <span className="text-slate-800 font-black uppercase text-sm">Total a Pagar:</span>
                     <span className="text-4xl font-black text-slate-800">${totalConEnvio.toFixed(2)}</span>
                  </div>

                  {carrito.length > 0 && !ordenEditandoRapida && <button onClick={() => setModoComedor(true)} className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2"><ChefHat size={16}/> Cobrar a Empleado ($0)</button>}
                  <div className="flex gap-3">
                     <button disabled={isFormIncompleto} onClick={() => generarPedidoBD('Mandar a Cocina')} className="flex-1 bg-orange-100 text-orange-700 py-4 rounded-2xl font-black text-xs md:text-sm uppercase disabled:opacity-50">Cuenta Abierta</button>
                     <button disabled={isFormIncompleto} onClick={() => generarPedidoBD('Cobrar Ahora')} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs md:text-sm uppercase disabled:opacity-50">Cobrar Ahora</button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {productoEnEspera && <ModalPersonalizar productoEnEspera={productoEnEspera} setProductoEnEspera={setProductoEnEspera} itemAEditar={itemAEditar} setItemAEditar={setItemAEditar} carrito={carrito} setCarrito={setCarrito} catalogoIngredientes={catalogoIngredientes} clasificaciones={clasificaciones} />}
      </div>
    </div>
  );
};

export default ModalPuntoVenta;