import React, { useState, useEffect } from 'react';
import { XCircle, ShoppingBag, Tag, CheckSquare, Square } from 'lucide-react';

const ModalPuntoVenta = ({
  modalPuntoVenta, setModalPuntoVenta, ordenEditandoRapida, user, configGlobal,
  productos, clasificaciones, catalogoIngredientes, apiUrl, lanzarImpresion,
  setModalPago, refrescarDatosCaja, empleadosPOS, mesas
}) => {
  const [paso, setPaso] = useState('identificar');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [telefonoOrdenRapida, setTelefonoOrdenRapida] = useState('');

  const [clienteAsignado, setClienteAsignado] = useState(null);
  const [nombreOrden, setNombreOrden] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [datosNuevoCliente, setDatosNuevoCliente] = useState({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: '' });
  
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [productoEnEspera, setProductoEnEspera] = useState(null);
  
  const [pasoPersonalizacion, setPasoPersonalizacion] = useState(0);
  const [gruposSeleccionados, setGruposSeleccionados] = useState({});
  // Para guardar las múltiples selecciones de los grupos opcionales
  const [gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados] = useState({});

  const [opcionSeleccionada, setOpcionSeleccionada] = useState(null);
  const [saborSeleccionado, setSaborSeleccionado] = useState(null);
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [ingredientesBase, setIngredientesBase] = useState([]);
  const [notaProducto, setNotaProducto] = useState('');
  const [cantidadProducto, setCantidadProducto] = useState(1);
  const [tipoConsumo, setTipoConsumo] = useState('Local');
  const [notaOpcional, setNotaOpcional] = useState('');
  const [mesaSeleccionada, setMesaSeleccionada] = useState('');
  const [zonaEnvioCosto, setZonaEnvioCosto] = useState('');
  
  const [modoComedor, setModoComedor] = useState(false);
  const [pinEmpleado, setPinEmpleado] = useState('');
  const [errorComedor, setErrorComedor] = useState('');
  
  const [cuponInput, setCuponInput] = useState('');
  const [cuponActivo, setCuponActivo] = useState(null);
  const [msgCupon, setMsgCupon] = useState({texto: '', tipo: ''});

  const tarifasEnvio = typeof configGlobal?.tarifas_envio === 'string' ? JSON.parse(configGlobal.tarifas_envio || '[]') : (configGlobal?.tarifas_envio || []);

  const resetWizard = () => {
    setProductoEnEspera(null); setOpcionSeleccionada(null); setSaborSeleccionado(null);
    setExtrasSeleccionados([]); setIngredientesBase([]); setNotaProducto(''); setCantidadProducto(1);
    setPasoPersonalizacion(0); setGruposSeleccionados({}); setGruposOpcionalesSeleccionados({});
  };

  useEffect(() => {
    if (modalPuntoVenta) {
      if (ordenEditandoRapida) {
        setPaso('menu');
        setClienteAsignado(ordenEditandoRapida.cliente_id ? { id: ordenEditandoRapida.cliente_id } : null);
        setNombreOrden(ordenEditandoRapida.cliente_nombre || '');
        setTipoConsumo(ordenEditandoRapida.tipo_consumo || 'Local');
        let dirPura = ordenEditandoRapida.direccion_entrega || '';
        if (ordenEditandoRapida.tipo_consumo === 'Domicilio' && dirPura.includes('|')) {
          const partes = dirPura.split('|');
          dirPura = partes[0].replace(/TEL:\s*\d*/g, '').replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger').replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
        }
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
        setCategoriaActiva(null); setTelefonoOrdenRapida('');
        setDatosNuevoCliente({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: '' });
      }
    }
  }, [modalPuntoVenta, ordenEditandoRapida]);

  const cerrarModalVenta = () => {
    setCategoriaActiva(null);
    resetWizard();
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

  const esEdicion = !!ordenEditandoRapida;
  const yaPagado = esEdicion && !['Por Cobrar', 'Pendiente'].includes(ordenEditandoRapida.metodo_pago);
  const montoOriginal = esEdicion ? Number(ordenEditandoRapida.total) : 0;
  const diferencia = totalConEnvio - montoOriginal;

  const categoriasUnicas = [...new Set(productos.map(p => p.categoria || 'General'))];
  const productosFiltrados = productos.filter(p => (p.categoria || 'General') === categoriaActiva);

  const getPortadaCategoria = (catName) => {
    const clasifDB = clasificaciones.find(c => c.nombre === catName);
    return { imagen_url: clasifDB?.imagen_url || null, emoji: clasifDB?.emoji || '🍽️' };
  };

  const cambiarCantidadCart = (idTicket, delta) => setCarrito(carrito.map(item => item.idTicket === idTicket ? { ...item, cantidad: Math.max(1, (item.cantidad || 1) + delta) } : item));
  const quitarDelCarrito = (idTicket) => setCarrito(carrito.filter(i => i.idTicket !== idTicket));
  
  const abrirModalProducto = (p) => { 
    resetWizard();
    setProductoEnEspera(p); 
  };

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
      
      // El teléfono de orden rápida se añade al ticket si lo anotaron (sea obligatorio o no)
      if (tipoConsumo === 'Domicilio' && !clienteAsignado && (telefonoCliente || telefonoOrdenRapida)) {
        stringDireccion += ` | TEL: ${telefonoCliente || telefonoOrdenRapida}`;
      } else if (tipoConsumo === 'Para llevar' && !clienteAsignado && telefonoOrdenRapida) {
        stringDireccion += ` | TEL: ${telefonoOrdenRapida}`;
      } else if (tipoConsumo === 'Recoger' && !clienteAsignado && telefonoOrdenRapida) {
        stringDireccion += ` | TEL: ${telefonoOrdenRapida}`;
      }
    }

    let estadoInicial = 'Pendiente';
    if (ordenEditandoRapida) {
      estadoInicial = ordenEditandoRapida.estado_preparacion;
    } else {
      if (empleadoComedor) estadoInicial = 'Pagado';
      else if (metodoAcelerado === 'Mandar a Cocina') estadoInicial = 'Pagado';
      else if (metodoAcelerado === 'Cobrar Ahora') estadoInicial = 'Pendiente';
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

        if (metodoAcelerado === 'Mandar a Cocina' || empleadoComedor || ordenEditandoRapida) {
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

  let pasosWiz = [];
  if (productoEnEspera) {
     const tamanosList = (productoEnEspera.opciones || []).filter(o => o.categoria === 'Tamaño');
     const saboresList = (productoEnEspera.opciones || []).filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
     const gruposObligatoriosList = [...new Set((productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_obligatorio').map(o => o.categoria))];
     
     // Detectar Grupos Opcionales únicos
     const objGruposOpcionales = {};
     (productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_opcional').forEach(o => {
       if (!objGruposOpcionales[o.categoria]) objGruposOpcionales[o.categoria] = { limite: o.limite || 1, opciones: [] };
       objGruposOpcionales[o.categoria].opciones.push(o);
     });
     const gruposOpcionalesList = Object.keys(objGruposOpcionales);

     if (tamanosList.length > 0) pasosWiz.push({ id: 'tamano', tipo: 'tamaño', titulo: 'Elige el Tamaño *', opciones: tamanosList });
     
     gruposObligatoriosList.forEach(g => {
        pasosWiz.push({ 
           id: `grupo_obl_${g}`, 
           tipo: 'grupo_obligatorio', 
           titulo: `Elige: ${g} *`, 
           categoria: g, 
           opciones: (productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_obligatorio' && o.categoria === g).sort((a, b) => a.nombre.localeCompare(b.nombre)) 
        });
     });

     // Inyectar pasos opcionales
     gruposOpcionalesList.forEach(g => {
        pasosWiz.push({
           id: `grupo_opc_${g}`,
           tipo: 'grupo_opcional',
           titulo: `Personaliza: ${g}`,
           categoria: g,
           limite: objGruposOpcionales[g].limite,
           opciones: objGruposOpcionales[g].opciones.sort((a, b) => a.nombre.localeCompare(b.nombre))
        });
     });

     if (saboresList.length > 0) pasosWiz.push({ id: 'sabor', tipo: 'sabor', titulo: 'Elige un Sabor *', opciones: saboresList.sort((a, b) => a.nombre.localeCompare(b.nombre)) });
     
     pasosWiz.push({ id: 'final', tipo: 'final', titulo: 'Notas y Detalles Extra' });
  }
  const pasoActualObj = pasosWiz[pasoPersonalizacion] || null;

  // 👇 FIX TELÉFONO OBLIGATORIO: Solo Domicilio y Recoger lo exigen. Para llevar es opcional (pero si lo llenan, debe ser 10 digitos).
  const isFormIncompleto = carrito.length === 0 || isSubmitting || !nombreOrden.trim() ||
    (tipoConsumo === 'Domicilio' && (!notaOpcional.trim() || zonaEnvioCosto === '' || (!clienteAsignado && (telefonoCliente.length !== 10 && telefonoOrdenRapida.length !== 10)))) ||
    (tipoConsumo === 'Recoger' && (!clienteAsignado && telefonoOrdenRapida.length !== 10)) ||
    (tipoConsumo === 'Para llevar' && !clienteAsignado && telefonoOrdenRapida.length > 0 && telefonoOrdenRapida.length < 10);

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
                <button type="submit" disabled={telefonoCliente.length !== 10 || isSubmitting} className="w-full mt-6 bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95">Buscar Cliente</button>
              </form>
              <button onClick={() => { setPaso('menu'); setNombreOrden('Invitado'); }} className="text-slate-400 hover:text-slate-600 font-bold text-sm underline mt-2">Continuar como Invitado</button>
              <div className="mt-6 pt-6 border-t border-slate-200">
                <button onClick={() => { setModoComedor(true); setPaso('menu'); }} className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-4 rounded-2xl font-black transition">🍔 Registrar Comedor (Personal)</button>
              </div>
            </div>
          </div>
        ) : paso === 'registro' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in slide-in-from-right">
            <form onSubmit={registrarClienteRapido} className="bg-white p-10 rounded-[40px] shadow-xl w-full max-w-md border border-slate-100 space-y-4">
              <h2 className="text-2xl font-black text-slate-800 mb-6 text-center">Nuevo Cliente</h2>
              <input type="text" required autoFocus value={datosNuevoCliente.nombre} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nombre: e.target.value})} className="w-full border p-4 rounded-xl font-bold outline-none focus:border-blue-500" placeholder="Nombre *" />
              <input type="text" required value={datosNuevoCliente.apellido} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, apellido: e.target.value})} className="w-full border p-4 rounded-xl font-bold outline-none focus:border-blue-500" placeholder="Apellido *" />
              <input type="password" maxLength="4" required value={datosNuevoCliente.nip} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nip: e.target.value.replace(/\D/g, '')})} className="w-full border p-4 rounded-xl font-black tracking-[0.5em] text-center outline-none focus:border-blue-500" placeholder="NIP (4 dígitos) *" />
              {errorMsg && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setPaso('identificar'); setErrorMsg(''); }} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-xl font-black">Atrás</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-500 text-white py-4 rounded-xl font-black shadow-lg">Registrar</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden animate-in slide-in-from-right">
            <div className="w-2/3 flex flex-col bg-slate-50 border-r border-slate-200">
              <div className="p-6 bg-white shadow-sm shrink-0">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">¿Qué se te antoja hoy?</h2>
              </div>
              
              {!categoriaActiva ? (
                <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                  {categoriasUnicas.map(cat => {
                    const { imagen_url, emoji } = getPortadaCategoria(cat);
                    return (
                      <button key={cat} onClick={() => setCategoriaActiva(cat)} className="bg-white rounded-[32px] p-6 flex flex-col items-center justify-center gap-4 hover:shadow-xl transition-all border border-slate-100 group active:scale-95 h-48">
                        {imagen_url ? (
                           <div className="w-20 h-20 bg-slate-50 rounded-2xl p-2 group-hover:scale-110 transition-transform">
                             <img src={imagen_url} alt={cat} className="w-full h-full object-contain" />
                           </div>
                        ) : (
                           <span className="text-6xl group-hover:scale-110 transition-transform drop-shadow-sm">{emoji}</span>
                        )}
                        <span className="font-black text-xl text-slate-700">{cat}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="p-4 flex items-center gap-4 border-b border-slate-200 bg-white shrink-0">
                    <button onClick={() => setCategoriaActiva(null)} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition">← Volver</button>
                    <h3 className="text-2xl font-black text-slate-800">{categoriaActiva}</h3>
                  </div>
                  <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                    {productosFiltrados.map(p => (
                      <button key={p.id} onClick={() => abrirModalProducto(p)} className="bg-white rounded-3xl p-5 flex flex-col items-center text-center hover:shadow-xl transition-all border border-slate-100 group active:scale-95">
                        {p.imagen_url ? (
                           <div className="w-24 h-24 mb-4 rounded-2xl overflow-hidden shadow-sm">
                             <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                           </div>
                        ) : (
                           <span className="text-6xl mb-4 group-hover:scale-110 transition-transform drop-shadow-sm">{p.emoji}</span>
                        )}
                        <span className="font-black text-slate-800 leading-tight mb-2">{p.nombre}</span>
                        <span className="text-blue-600 font-black bg-blue-50 px-3 py-1 rounded-lg">${p.precio_base}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-1/3 bg-white flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.03)] z-10">
              <div className="p-6 bg-slate-50 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><ShoppingBag size={24} /></div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Orden en Curso</h3>
                </div>
                
                <div className="space-y-3">
                  {!modoComedor ? (
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 rounded-xl">
                      {['Local', 'Para llevar', 'Domicilio', 'Recoger'].map(tipo => (
                        <button key={tipo} onClick={() => setTipoConsumo(tipo)} className={`py-2 px-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${tipoConsumo === tipo ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
                          {tipo}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-indigo-100 text-indigo-800 p-3 rounded-xl font-black text-center text-sm uppercase tracking-widest border border-indigo-200">
                      Consumo de Personal
                    </div>
                  )}

                  {!modoComedor ? (
                    <>
                      <input type="text" placeholder="Nombre del Cliente (Obligatorio) *" value={nombreOrden} onChange={e => setNombreOrden(e.target.value)} className={`w-full bg-white border border-red-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-red-400 placeholder-red-300 text-red-900 ${['Domicilio', 'Recoger'].includes(tipoConsumo) && !clienteAsignado ? 'mb-2' : ''}`} />
                      {/* 👇 El Teléfono Rápido sale en Domicilio/Recoger (Obligatorio) y Para Llevar (Opcional) */}
                      {['Domicilio', 'Recoger', 'Para llevar'].includes(tipoConsumo) && !clienteAsignado && (
                        <input 
                          type="tel" 
                          maxLength="10" 
                          placeholder={`Teléfono 10 dígitos ${['Domicilio', 'Recoger'].includes(tipoConsumo) ? '(Obligatorio) *' : '(Opcional)'}`} 
                          value={telefonoOrdenRapida} 
                          onChange={e => setTelefonoOrdenRapida(e.target.value.replace(/\D/g, ''))} 
                          className={`w-full bg-white rounded-xl p-3 text-sm font-bold outline-none border ${['Domicilio', 'Recoger'].includes(tipoConsumo) ? 'border-red-200 focus:border-red-400 placeholder-red-300 text-red-900' : 'border-slate-200 focus:border-blue-400 placeholder-slate-400 text-slate-800'}`} 
                        />
                      )}
                    </>
                  ) : (
                    <input type="password" maxLength="4" placeholder="Ingresa tu PIN (4 dígitos) *" value={pinEmpleado} onChange={e => {setPinEmpleado(e.target.value.replace(/\D/g, '')); setErrorComedor('');}} className="w-full bg-white border border-indigo-200 rounded-xl p-3 text-center font-black tracking-[0.5em] outline-none focus:border-indigo-400 text-indigo-900" />
                  )}
                  {errorComedor && <p className="text-red-500 text-xs font-bold text-center">{errorComedor}</p>}

                  {tipoConsumo === 'Local' && !modoComedor && mesas && mesas.length > 0 && (
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
                      ))}
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

                {yaPagado && (
                  <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                      <span>Pagado Originalmente:</span>
                      <span>${montoOriginal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-orange-200 mt-2">
                      <span className="font-black text-orange-800 uppercase tracking-widest text-[10px]">
                        {diferencia > 0 ? 'Diferencia a Cobrar:' : diferencia < 0 ? 'Saldo a Devolver:' : 'Sin diferencia'}
                      </span>
                      <span className={`font-black text-lg ${diferencia > 0 ? 'text-red-600' : diferencia < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                        ${Math.abs(diferencia).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mb-6">
                  <span className="font-black text-slate-800 uppercase tracking-widest text-sm">{yaPagado ? 'Nuevo Total:' : 'Total a pagar:'}</span>
                  <span className="text-4xl font-black text-slate-900">${totalConEnvio.toFixed(2)}</span>
                </div>

                <div className="flex gap-4">
                  {!modoComedor ? (
                    yaPagado ? (
                       <button disabled={isFormIncompleto} onClick={() => generarPedidoBD('Mandar a Cocina')} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/30 transition disabled:opacity-50">
                          Guardar Modificación
                       </button>
                    ) : (
                      <>
                        <button disabled={isFormIncompleto} onClick={() => generarPedidoBD('Mandar a Cocina')} className="flex-1 bg-orange-50 text-orange-600 hover:bg-orange-100 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition disabled:opacity-50">Cuenta Abierta</button>
                        <button disabled={isFormIncompleto} onClick={() => generarPedidoBD('Cobrar Ahora')} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/30 transition disabled:opacity-50">Cobrar Ahora</button>
                      </>
                    )
                  ) : (
                    <button disabled={isFormIncompleto} onClick={procesarComedorPersonal} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-500/30 transition disabled:opacity-50">Registrar Comida Personal</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {productoEnEspera && pasoActualObj && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in">
            
            {pasoPersonalizacion > 0 && (
              <button onClick={() => setPasoPersonalizacion(p => p - 1)} className="absolute left-6 top-6 text-white bg-slate-800/50 hover:bg-blue-600 p-3 rounded-full shadow-lg transition z-50">
                 ← Volver
              </button>
            )}

            <div className="bg-slate-50 rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
              <div className="p-8 text-center shrink-0 bg-white border-b border-slate-200">
                <h3 className="text-3xl font-black text-slate-800">{productoEnEspera.nombre}</h3>
                <div className="flex justify-center gap-2 mt-4">
                  {pasosWiz.map((_, i) => (
                    <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === pasoPersonalizacion ? 'w-8 bg-blue-600' : i < pasoPersonalizacion ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-200'}`} />
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {pasoActualObj.tipo !== 'final' && (
                  <div className="animate-in slide-in-from-right duration-200">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2 text-center">{pasoActualObj.titulo}</p>
                    
                    {/* 👇 TEXTO DEL LÍMITE (Solo para grupos opcionales) */}
                    {pasoActualObj.tipo === 'grupo_opcional' && (
                      <p className="text-center text-xs font-bold text-emerald-500 mb-6">
                         Seleccionadas: {(gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).length} de {pasoActualObj.limite}
                      </p>
                    )}
                    {pasoActualObj.tipo !== 'grupo_opcional' && <div className="mb-6"></div>}

                    <div className="grid grid-cols-2 gap-4">
                      {pasoActualObj.opciones.map((o, idx) => {
                        let estaSeleccionado = false;
                        if (pasoActualObj.tipo === 'tamaño') estaSeleccionado = opcionSeleccionada?.nombre === o.nombre;
                        else if (pasoActualObj.tipo === 'sabor') estaSeleccionado = saborSeleccionado?.nombre === o.nombre;
                        else if (pasoActualObj.tipo === 'grupo_obligatorio') estaSeleccionado = gruposSeleccionados[pasoActualObj.categoria]?.nombre === o.nombre;
                        else if (pasoActualObj.tipo === 'grupo_opcional') estaSeleccionado = (gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).some(x => x.nombre === o.nombre);

                        // Lógica de bloqueo para opcionales
                        const seleccionadosActuales = gruposOpcionalesSeleccionados[pasoActualObj.categoria] || [];
                        const yaLlegoAlLimite = pasoActualObj.tipo === 'grupo_opcional' && seleccionadosActuales.length >= pasoActualObj.limite;
                        const disabled = yaLlegoAlLimite && !estaSeleccionado;

                        return (
                          <button key={idx} disabled={disabled} onClick={() => {
                            if (pasoActualObj.tipo === 'tamaño') {
                              setOpcionSeleccionada(o);
                              setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
                            } else if (pasoActualObj.tipo === 'sabor') {
                              setSaborSeleccionado(o);
                              setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
                            } else if (pasoActualObj.tipo === 'grupo_obligatorio') {
                              setGruposSeleccionados({ ...gruposSeleccionados, [pasoActualObj.categoria]: o });
                              setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
                            } else if (pasoActualObj.tipo === 'grupo_opcional') {
                              let currentSelection = [...(gruposOpcionalesSeleccionados[pasoActualObj.categoria] || [])];
                              if (estaSeleccionado) {
                                currentSelection = currentSelection.filter(x => x.nombre !== o.nombre);
                              } else {
                                if (currentSelection.length < pasoActualObj.limite) currentSelection.push(o);
                              }
                              setGruposOpcionalesSeleccionados({ ...gruposOpcionalesSeleccionados, [pasoActualObj.categoria]: currentSelection });
                            }
                          }} className={`p-5 rounded-3xl font-bold transition-all border-2 flex flex-col items-center justify-center gap-2 ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${estaSeleccionado ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-white text-slate-700 border-slate-100 hover:border-blue-400 hover:shadow-sm'}`}>
                            
                            {/* Checkbox visual para grupos opcionales */}
                            {pasoActualObj.tipo === 'grupo_opcional' && (
                               <div className="absolute top-3 left-3 opacity-60">
                                 {estaSeleccionado ? <CheckSquare size={18}/> : <Square size={18}/>}
                               </div>
                            )}

                            <span className="text-center leading-tight text-lg">{o.nombre}</span>
                            {o.precioExtra > 0 && <span className={`text-sm ${estaSeleccionado ? 'text-blue-200' : 'text-slate-400'}`}>+${o.precioExtra}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {pasoActualObj.tipo === 'final' && (
                  <div className="animate-in slide-in-from-right duration-200 space-y-6">
                    
                    {(() => {
                      const bases = (productoEnEspera.opciones || []).filter(o => o.tipo === 'base').sort((a, b) => a.nombre.localeCompare(b.nombre));
                      if (bases.length > 0) {
                        return (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quitar Ingredientes (Opcional)</p>
                            <div className="space-y-2">
                              {bases.map((o, idx) => {
                                const isBaseQuitada = ingredientesBase.includes(o.nombre);
                                return (
                                  <button key={idx} onClick={() => {
                                    if (isBaseQuitada) setIngredientesBase(ingredientesBase.filter(i => i !== o.nombre));
                                    else setIngredientesBase([...ingredientesBase, o.nombre]);
                                  }} className={`w-full flex justify-between items-center p-4 rounded-xl font-bold transition border ${isBaseQuitada ? 'bg-rose-50 text-rose-500 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                    <span>{o.nombre}</span><span>{isBaseQuitada ? 'Sin ❌' : 'Con ✅'}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      }
                      return null;
                    })()}

                    {(() => {
                      const categoriaItem = productoEnEspera.categoria || '';
                      const extrasDelSistema = catalogoIngredientes.filter(i => 
                        (i.clasificacion_nombre === categoriaItem || i.es_extra || i.tipo === 'extra') && 
                        i.permite_extra !== false
                      );
                      
                      const extrasMap = new Map();
                      (productoEnEspera.opciones || []).forEach(o => { if (o.tipo === 'extra') extrasMap.set(o.nombre, o); });
                      extrasDelSistema.forEach(o => { extrasMap.set(o.nombre, { nombre: o.nombre, precioExtra: o.precio_extra || 0 }); });

                      const extrasTodos = Array.from(extrasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

                      if (extrasTodos.length > 0) {
                        return (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Añadir Extras (Opcional)</p>
                            <div className="grid grid-cols-2 gap-3">
                              {extrasTodos.map((ex, idx) => {
                                const seleccionado = extrasSeleccionados.find(e => e.nombre === ex.nombre);
                                return (
                                  <button key={idx} onClick={() => {
                                    if (seleccionado) setExtrasSeleccionados(extrasSeleccionados.filter(e => e.nombre !== ex.nombre));
                                    else setExtrasSeleccionados([...extrasSeleccionados, { nombre: ex.nombre, precioExtra: ex.precioExtra }]);
                                  }} className={`p-4 rounded-xl font-bold text-sm transition border flex flex-col items-center gap-1 ${seleccionado ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'}`}>
                                    <span>{ex.nombre}</span>
                                    <span className={seleccionado ? 'text-blue-500' : 'text-slate-400'}>{ex.precioExtra > 0 ? `+$${ex.precioExtra}` : 'Gratis'}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      }
                      return null;
                    })()}

                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Notas Generales</p>
                      <textarea value={notaProducto} onChange={e => setNotaProducto(e.target.value)} placeholder="Instrucciones al chef..." className="w-full bg-white border border-slate-200 rounded-2xl p-4 outline-none focus:border-blue-500 text-slate-700 font-bold resize-none h-24 shadow-inner" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-white border-t border-slate-200 shrink-0">
                <div className="flex justify-between items-center mb-6">
                  {pasoActualObj.tipo === 'final' ? (
                      <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200">
                        <button onClick={() => setCantidadProducto(Math.max(1, cantidadProducto - 1))} className="px-5 py-3 text-slate-400 hover:text-slate-800 text-xl font-black transition">-</button>
                        <span className="px-4 font-black text-xl">{cantidadProducto}</span>
                        <button onClick={() => setCantidadProducto(cantidadProducto + 1)} className="px-5 py-3 text-slate-400 hover:text-slate-800 text-xl font-black transition">+</button>
                      </div>
                  ) : (
                      <div className="flex items-center">
                          {/* Botón de Continuar para Grupos Opcionales */}
                          {pasoActualObj.tipo === 'grupo_opcional' && (
                             <button onClick={() => setPasoPersonalizacion(p => p + 1)} className="bg-emerald-500 text-white font-black px-6 py-3 rounded-xl shadow-md hover:bg-emerald-600 active:scale-95 transition">
                                Siguiente ➡
                             </button>
                          )}
                      </div>
                  )}

                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Platillo</p>
                    <p className="text-4xl font-black text-blue-600">
                      ${((Number(productoEnEspera.precio_base) + 
                         (opcionSeleccionada?.precioExtra || 0) + 
                         (saborSeleccionado?.precioExtra || 0) + 
                         Object.values(gruposSeleccionados).reduce((s, g) => s + Number(g.precioExtra), 0) +
                         Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra), 0) +
                         extrasSeleccionados.reduce((s, e) => s + Number(e.precioExtra), 0)) * cantidadProducto).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={resetWizard} className="flex-1 py-5 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition border border-slate-200">Cancelar</button>
                  
                  {pasoActualObj.tipo === 'final' && (
                    <button onClick={() => {
                      const extrasFinales = [];
                      if (opcionSeleccionada && opcionSeleccionada.precioExtra > 0) extrasFinales.push({ nombre: opcionSeleccionada.nombre, precioExtra: opcionSeleccionada.precioExtra, tipo: 'variacion' });
                      if (saborSeleccionado) extrasFinales.push({ nombre: saborSeleccionado.nombre, precioExtra: saborSeleccionado.precioExtra, tipo: 'variacion' });
                      
                      Object.values(gruposSeleccionados).forEach(g => {
                          extrasFinales.push({ nombre: `🔸 ${g.categoria}: ${g.nombre}`, precioExtra: g.precioExtra, tipo: 'grupo_obligatorio' });
                      });

                      // 👇 Inyectamos selecciones del grupo opcional
                      Object.values(gruposOpcionalesSeleccionados).flat().forEach(g => {
                          extrasFinales.push({ nombre: `🔹 ${g.categoria}: ${g.nombre}`, precioExtra: g.precioExtra, tipo: 'grupo_opcional' });
                      });

                      ingredientesBase.forEach(ib => extrasFinales.push({ nombre: `Sin ${ib}`, precioExtra: 0, tipo: 'base' }));
                      extrasSeleccionados.forEach(ex => extrasFinales.push({ nombre: `🔸 ${ex.nombre}`, precioExtra: ex.precioExtra, tipo: 'extra' }));
                      if (notaProducto.trim() !== '') extrasFinales.push({ nombre: `📝 ${notaProducto}`, precioExtra: 0, tipo: 'nota' });

                      const precioIndividualCalculado = Number(productoEnEspera.precio_base) + (opcionSeleccionada?.precioExtra || 0) + (saborSeleccionado?.precioExtra || 0) + Object.values(gruposSeleccionados).reduce((s, g) => s + Number(g.precioExtra), 0) + Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra), 0) + extrasSeleccionados.reduce((s, e) => s + Number(e.precioExtra), 0);
                      
                      let nombreCompleto = productoEnEspera.nombre;
                      if (opcionSeleccionada && opcionSeleccionada.precioExtra === 0) nombreCompleto += ` (${opcionSeleccionada.nombre})`;

                      const nuevoItem = {
                        idTicket: Date.now().toString(),
                        producto_id: productoEnEspera.id,
                        nombre: nombreCompleto,
                        categoria: productoEnEspera.categoria,
                        destino: productoEnEspera.destino || 'Cocina',
                        tiempo_preparacion: productoEnEspera.tiempo_preparacion,
                        precio_base: productoEnEspera.precio_base,
                        precioFinal: precioIndividualCalculado,
                        cantidad: cantidadProducto,
                        opciones: productoEnEspera.opciones || [],
                        extras: extrasFinales
                      };

                      setCarrito([...carrito, nuevoItem]);
                      resetWizard();
                    }} className="flex-[2] py-5 bg-emerald-500 text-white font-black text-xl rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition active:scale-95">Añadir ({cantidadProducto})</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalPuntoVenta;