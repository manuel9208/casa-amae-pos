import React, { useState, useEffect } from 'react';
import { ShoppingBag, Tag, XCircle, ArrowLeft, ArrowRight, Trash2, Plus, Minus, Store, Bike, Phone, AlertTriangle, Info, MapPin, Star, Clock, Lock, Edit, CheckCircle2, Save } from 'lucide-react';
import FormularioConsumoLocal from './FormularioConsumoLocal';
import FormularioConsumoLlevar from './FormularioConsumoLlevar';
import FormularioConsumoDomicilio from './FormularioConsumoDomicilio';
import FormularioConsumoRecoger from './FormularioConsumoRecoger';
import MenuCategoriasYProductos from './MenuCategoriasYProductos';
import AsistentePersonalizacion from './AsistentePersonalizacion';
import ModalCuentaAbierta from './ModalCuentaAbierta';
import OfertaUpselling from './OfertaUpselling';
import PasoIdentificarCliente from './PasoIdentificarCliente';
import { useBuscadorClientes } from '../../useBuscadorClientes';

const PuntoDeVentaPrincipal = ({
    modalPuntoVenta, setModalPuntoVenta, ordenEditandoRapida, user, configGlobal,
    productos, clasificaciones, catalogoIngredientes, apiUrl, lanzarImpresion,
    setModalPago, refrescarDatosCaja, onClose, empleadosPOS, mesas
}) => {
    // ==========================================
    // ESTADOS PRINCIPALES DE FLUJO
    // ==========================================
    const [paso, setPaso] = useState('identificar');
    const [pasoFlujoCaja, setPasoFlujoCaja] = useState(1);
    const [alertaUI, setAlertaUI] = useState(null);
    const [confirmacionFinanciera, setConfirmacionFinanciera] = useState(null); 

    // ==========================================
    // ESTADOS DE DATOS
    // ==========================================
    const [clienteAsignado, setClienteAsignado] = useState(null);
    const [telefonoCliente, setTelefonoCliente] = useState('');
    const [telefonoOrdenRapida, setTelefonoOrdenRapida] = useState('');
    const [datosNuevoCliente, setDatosNuevoCliente] = useState({
        nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: ''
    });
    const [nombreOrden, setNombreOrden] = useState('');
    const [tipoConsumo, setTipoConsumo] = useState('Local');
    const [notaOpcional, setNotaOpcional] = useState('');
    const [mesaSeleccionada, setMesaSeleccionada] = useState('');
    const [zonaEnvioCosto, setZonaEnvioCosto] = useState('');
    const [carrito, setCarrito] = useState([]);
    const [categoriaActiva, setCategoriaActiva] = useState(null);
    const [cuponInput, setCuponInput] = useState('');
    const [cuponActivo, setCuponActivo] = useState(null);
    const [msgCupon, setMsgCupon] = useState({ texto: '', tipo: '' });
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ==========================================
    // 🧠 INTEGRACIÓN DEL AUTOCOMPLETADO INTELIGENTE
    // ==========================================
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    const terminoBusqueda = clienteAsignado ? '' : nombreOrden;
    const { sugerencias, buscando: buscandoSugerencias } = useBuscadorClientes(terminoBusqueda, apiUrl);

    // ==========================================
    // ESTADOS DE MODALES Y PUNTOS
    // ==========================================
    const [modalCuentaAbierta, setModalCuentaAbierta] = useState(false);
    const [promocionVigente, setPromocionVigente] = useState(null);
    const [modalNip, setModalNip] = useState(false);
    const [nipInput, setNipInput] = useState('');
    const [errorNip, setErrorNip] = useState('');
    const [descuentoPuntosPuntosFisicos, setDescuentoPuntosPuntosFisicos] = useState(0);
    const [descuentoPuntosDinero, setDescuentoPuntosDinero] = useState(0);
    const [descuentoCuponDinero, setDescuentoCuponDinero] = useState(0);

    // ==========================================
    // ESTADOS DEL WIZARD DE PERSONALIZACIÓN Y EDICIÓN
    // ==========================================
    const [productoEnEspera, setProductoEnEspera] = useState(null);
    const [itemEditandoId, setItemEditandoId] = useState(null);
    const [pasoPersonalizacion, setPasoPersonalizacion] = useState(0);
    const [opcionSeleccionada, setOpcionSeleccionada] = useState(null);
    const [saborSeleccionado, setSaborSeleccionado] = useState(null);
    const [gruposSeleccionados, setGruposSeleccionados] = useState({});
    const [gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados] = useState({});
    const [ingredientesBase, setIngredientesBase] = useState([]);
    const [ingredientesSustituidos, setIngredientesSustituidos] = useState({});
    const [ingredienteDesplegado, setIngredienteDesplegado] = useState(null);
    const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
    const [notaProducto, setNotaProducto] = useState('');
    const [cantidadProducto, setCantidadProducto] = useState(1);

    // ==========================================
    // CONFIGURACIONES DINÁMICAS Y PERMISOS
    // ==========================================
    const politicasSustUI = typeof configGlobal?.politicas_sustitucion === 'string'
        ? JSON.parse(configGlobal.politicas_sustitucion || '{}')
        : (configGlobal?.politicas_sustitucion || {});
    const tarifasEnvio = typeof configGlobal?.tarifas_envio === 'string'
        ? JSON.parse(configGlobal.tarifas_envio || '[]')
        : (configGlobal?.tarifas_envio || []);

    const puntosCanjeActivo = configGlobal?.puntos_canje_activo === undefined ? true : (String(configGlobal?.puntos_canje_activo) === 'true');

    // ==========================================
    // CARGA INICIAL Y RESET
    // ==========================================
    useEffect(() => {
        if (ordenEditandoRapida && modalPuntoVenta) {
            setPaso('menu');
            setPasoFlujoCaja(2);
            if (ordenEditandoRapida.cliente_id) {
                setClienteAsignado({
                    id: ordenEditandoRapida.cliente_id,
                    nombre: ordenEditandoRapida.cliente_nombre,
                    puntos: ordenEditandoRapida.puntos || 0 
                });
            } else {
                setClienteAsignado(null);
            }
            setNombreOrden(ordenEditandoRapida.cliente_nombre || '');
            setTipoConsumo(ordenEditandoRapida.tipo_consumo || 'Local');
            setMesaSeleccionada(ordenEditandoRapida.mesa || '');
            
            // 👇 FIX: Si no es domicilio, limpiamos el costo de envío
            if (ordenEditandoRapida.tipo_consumo === 'Domicilio') {
                setZonaEnvioCosto(ordenEditandoRapida.costo_envio || '');
            } else {
                setZonaEnvioCosto(0);
            }

            let dirPura = ordenEditandoRapida.direccion_entrega || '';
            if (dirPura.includes('|')) dirPura = dirPura.split('|')[0].trim();
            setNotaOpcional(dirPura !== 'Pendiente de dirección' ? dirPura : '');
            try {
                const carArr = typeof ordenEditandoRapida.carrito === 'string' ? JSON.parse(ordenEditandoRapida.carrito) : ordenEditandoRapida.carrito;
                setCarrito(carArr || []);
            } catch (e) { setCarrito([]); }
            if (ordenEditandoRapida.descuento_puntos && Number(ordenEditandoRapida.descuento_puntos) > 0) {
                setDescuentoPuntosPuntosFisicos(Number(ordenEditandoRapida.descuento_puntos));
            }
        }
    }, [ordenEditandoRapida, modalPuntoVenta]);

    useEffect(() => {
        if (!ordenEditandoRapida && clienteAsignado?.direccion && tipoConsumo === 'Domicilio') {
            setNotaOpcional(prev => prev.trim() === '' ? clienteAsignado.direccion : prev);
        }
    }, [clienteAsignado, tipoConsumo, ordenEditandoRapida]);

    const cerrarModalVenta = () => {
        setCategoriaActiva(null);
        resetWizard();
        setCarrito([]);
        setNombreOrden(''); setTipoConsumo('Local'); setNotaOpcional('');
        setMesaSeleccionada(''); setZonaEnvioCosto('');
        setCuponActivo(null); setCuponInput('');
        setDescuentoPuntosPuntosFisicos(0); setDescuentoPuntosDinero(0);
        setClienteAsignado(null); setTelefonoCliente(''); setTelefonoOrdenRapida('');
        setErrorMsg('');
        setConfirmacionFinanciera(null);
        setDatosNuevoCliente({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: '' });
        setPasoFlujoCaja(1);
        setPaso('identificar');
        setModalPuntoVenta(false);
        if (onClose) onClose();
    };

    // ==========================================
    // ACCIÓN AL SELECCIONAR UNA SUGERENCIA DEL HOOK
    // ==========================================
    const seleccionarSugerencia = (sug) => {
        setNombreOrden(sug.cliente_nombre);
        if (sug.cliente_telefono) {
            setTelefonoCliente(sug.cliente_telefono);
            setTelefonoOrdenRapida(sug.cliente_telefono);
        }
        if (sug.direccion_entrega && sug.direccion_entrega !== 'Pendiente de dirección') {
            setNotaOpcional(sug.direccion_entrega);
        }
        if (sug.tipo === 'registrado') {
            setClienteAsignado({
                id: sug.cliente_id,
                nombre: sug.cliente_nombre,
                telefono: sug.cliente_telefono,
                direccion: sug.direccion_entrega,
                puntos: sug.puntos
            });
        }
        setMostrarSugerencias(false);
    };

    // ==========================================
    // 🧠 MATEMÁTICAS DEL CARRITO Y PUNTOS FLEXIBLES (BLINDADO)
    // ==========================================
    const calcularSubtotal = () => carrito.reduce((t, i) => t + ((Number(i.precioFinal) || 0) * (Number(i.cantidad) || 1)), 0);
    const subtotal = calcularSubtotal();
    
    const subtotalCanjeable = carrito.reduce((acc, item) => {
        let nombreLimpioCarrito = String(item.nombre || '')
            .replace(/^\[.*?\]\s*/, '')
            .split('(')[0]
            .toLowerCase().trim();
        const prodDB = (productos || []).find(p => {
            const idItem = item.id || item.producto_id;
            if (idItem && String(p.id) === String(idItem)) return true;
            const cleanNameDB = String(p.nombre).toLowerCase().trim();
            return cleanNameDB === nombreLimpioCarrito;
        });
        let catNombre = prodDB?.categoria || item.categoria || item.clasificacion;
        if (!catNombre && item.nombre && item.nombre.startsWith('[')) {
             const match = item.nombre.match(/\[(.*?)\]/);
             if (match) catNombre = match[1];
        }
        const canjeProd = prodDB ? (prodDB.permite_canje !== false && String(prodDB.permite_canje) !== 'false') : true;
        const catDB = (clasificaciones || []).find(c => String(c.nombre).trim().toLowerCase() === String(catNombre || '').trim().toLowerCase());
        const canjeCat = catDB ? (catDB.permite_canje !== false && String(catDB.permite_canje) !== 'false') : true;
        if (canjeProd && canjeCat) {
            return acc + ((Number(item.precioFinal) || 0) * (Number(item.cantidad) || 1));
        }
        return acc;
    }, 0);
    
    const bloqueoPuntosActivo = subtotalCanjeable === 0 && carrito.length > 0;
    const canjeParcialActivo = subtotalCanjeable > 0 && subtotalCanjeable < subtotal && carrito.length > 0;
    
    useEffect(() => {
        let dCup = 0;
        if (cuponActivo) {
            if (cuponActivo.tipo === 'porcentaje') dCup = subtotal * (Number(cuponActivo.valor) / 100);
            else dCup = Number(cuponActivo.valor);
        }
        if (dCup > subtotal) dCup = subtotal;
        setDescuentoCuponDinero(dCup);
        let dPts = 0;
        if ((!puntosCanjeActivo || bloqueoPuntosActivo) && descuentoPuntosPuntosFisicos > 0) {
            setDescuentoPuntosPuntosFisicos(0);
        } else if (puntosCanjeActivo && descuentoPuntosPuntosFisicos > 0) {
            const valorPeso = Number(configGlobal?.puntos_valor_peso) || 1;
            dPts = descuentoPuntosPuntosFisicos * valorPeso;
            const limitePermitido = Math.min(subtotal - dCup, subtotalCanjeable);
            if (dPts > limitePermitido) dPts = limitePermitido;
        }
        setDescuentoPuntosDinero(dPts > 0 ? dPts : 0);
    }, [descuentoPuntosPuntosFisicos, configGlobal, carrito, cuponActivo, subtotal, bloqueoPuntosActivo, subtotalCanjeable, puntosCanjeActivo]);
    
    const descuentoTotal = descuentoCuponDinero + descuentoPuntosDinero;

    // 👇 FIX: Nos aseguramos de sumar el envío SÓLO si el consumo es Domicilio
    const totalConEnvio = (subtotal - descuentoTotal) + (tipoConsumo === 'Domicilio' && zonaEnvioCosto ? Number(zonaEnvioCosto) : 0);

    const esEdicion = !!ordenEditandoRapida;
    const isPagado = esEdicion && !['Pendiente', 'Por Cobrar', 'Cancelado'].includes(ordenEditandoRapida.metodo_pago) && ordenEditandoRapida.estado_preparacion !== 'Pendiente';
    const yaPagado = isPagado;

    // ==========================================
    // CATÁLOGOS Y WIZARD
    // ==========================================
    const categoriasUnicas = [...new Set(productos.map(p => p.categoria || 'General'))];
    const productosFiltrados = productos.filter(p => (p.categoria || 'General') === categoriaActiva);
    const getPortadaCategoria = (catName) => {
        const clasifDB = clasificaciones.find(c => c.nombre === catName);
        return { imagen_url: clasifDB?.imagen_url || null, emoji: clasifDB?.emoji || '🍽️' };
    };
    
    const cambiarCantidadCart = (idTicket, delta) => {
        setCarrito(prev => prev.map(item => {
            if (item.idTicket === idTicket) {
                const isUsaStock = item.usa_stock === true || String(item.usa_stock) === 'true';
                const stockActual = Number(item.stock_preparado) || 0;
                const newQty = (item.cantidad || 1) + delta;
                if (isUsaStock && delta > 0 && newQty > stockActual) {
                    setAlertaUI({ titulo: 'Stock Insuficiente', mensaje: `¡Límite de stock! Solo quedan ${stockActual} disponibles en el sistema.`, tipo: 'error' });
                    return item;
                }
                return newQty > 0 ? { ...item, cantidad: newQty } : item;
            }
            return item;
        }));
    };
    
    const quitarDelCarrito = (idTicket) => setCarrito(prev => prev.filter(item => item.idTicket !== idTicket));
    
    const iniciarEdicion = (item) => {
        const idOriginal = item.producto_id || item.id;
        const productoOriginal = productos.find(p => String(p.id) === String(idOriginal));
        if (productoOriginal) {
            setItemEditandoId(item.idTicket);
            setProductoEnEspera(productoOriginal);
        } else {
            setAlertaUI({ titulo: 'No se puede editar', mensaje: 'El producto original ya no existe en el catálogo actual.', tipo: 'error' });
        }
    };

    const resetWizard = () => {
        setProductoEnEspera(null); setItemEditandoId(null); setPasoPersonalizacion(0); setOpcionSeleccionada(null); setSaborSeleccionado(null);
        setGruposSeleccionados({}); setGruposOpcionalesSeleccionados({}); setIngredientesBase([]); setIngredientesSustituidos({});
        setIngredienteDesplegado(null); setExtrasSeleccionados([]); setNotaProducto(''); setCantidadProducto(1);
    };
    
    const calcularPrecioSustitucion = (nombreBase, nombreNuevo) => {
        if (!politicasSustUI.activa) return 0;
        if (politicasSustUI.modalidad === 'fija') return Number(politicasSustUI.tarifa_fija || 0);
        const ingBase = catalogoIngredientes.find(i => i.nombre === nombreBase);
        const ingNuevo = catalogoIngredientes.find(i => i.nombre === nombreNuevo);
        const diff = Number(ingNuevo?.precio_extra || 0) - Number(ingBase?.precio_extra || 0);
        return diff > 0 ? diff : 0;
    };
    
    const evaluarUpsell = (prodId, catName) => {
        const promociones = configGlobal?.promociones || [];
        if (!Array.isArray(promociones)) return null;
        return promociones.find(p => p.activo && p.tipo === 'upselling' && (String(p.producto_trigger_id) === String(prodId) || p.categoria_trigger === catName));
    };
    
    const handleTerminarPersonalizacion = (nuevoItem) => {
        if (itemEditandoId) {
            setCarrito(prev => prev.map(i => i.idTicket === itemEditandoId ? { ...nuevoItem, idTicket: i.idTicket } : i));
        } else {
            setCarrito([...carrito, nuevoItem]);
            const promo = evaluarUpsell(productoEnEspera.id, productoEnEspera.categoria);
            if (promo) setPromocionVigente(promo);
        }
        resetWizard();
    };
    
    const agregarUpsellAlCarrito = () => {
        let precioFinal = Number(promocionVigente.valor_descuento);
        let precioBase = 0;
        let destinoReal = 'Cocina';
        let categoriaReal = 'General';
        let tiempoPrep = 15;
        const prodOrig = productos.find(p => p.id === promocionVigente.producto_oferta_id);
        if (prodOrig) {
            precioBase = Number(prodOrig.precio_base);
            categoriaReal = prodOrig.categoria || 'General';
            tiempoPrep = prodOrig.tiempo_preparacion || 15;
            const clasifObj = clasificaciones.find(c => c.nombre === categoriaReal);
            if (clasifObj) destinoReal = clasifObj.destino || 'Cocina';
        }
        if (promocionVigente.tipo_descuento === 'porcentaje') {
            precioFinal = precioBase - (precioBase * (precioFinal / 100));
        }
        const nuevoItem = {
            idTicket: Math.random().toString(36).substr(2, 9),
            id: promocionVigente.producto_oferta_id,
            producto_id: promocionVigente.producto_oferta_id,
            nombre: promocionVigente.oferta_nombre,
            categoria: categoriaReal,
            destino: destinoReal,
            tiempo_preparacion: tiempoPrep,
            precioFinal: Math.max(0, precioFinal),
            cantidad: 1,
            extras: [{ nombre: `⭐ Promo: ${promocionVigente.nombre}`, precio: 0 }]
        };
        setCarrito([...carrito, nuevoItem]);
        setPromocionVigente(null);
    };

    // ==========================================
    // LÓGICA DE CLIENTES Y PAGOS
    // ==========================================
    const buscarClienteRapido = async (e) => {
        e.preventDefault(); setErrorMsg('');
        if (telefonoCliente.length !== 10) return setErrorMsg('El celular debe tener 10 dígitos.');
        setIsSubmitting(true);
        try {
            const resCli = await fetch(`${apiUrl}/clientes`);
            const clientes = await resCli.json();
            const clienteEncontrado = clientes.find(c => c.telefono === telefonoCliente);
            if (clienteEncontrado) {
                setClienteAsignado(clienteEncontrado);
                setNombreOrden(clienteEncontrado.nombre);
                setPaso('menu');
            } else setPaso('registro');
        } catch(err) { setErrorMsg('Error de conexión.'); }
        setIsSubmitting(false);
    };
    
    const registrarClienteRapido = async (e) => {
        e.preventDefault(); setErrorMsg('');
        if(!datosNuevoCliente.nombre.trim() || !datosNuevoCliente.apellido.trim() || datosNuevoCliente.nip.length !== 4) {
            return setErrorMsg('Nombre, Apellido y NIP son obligatorios.');
        }
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/clientes/registro`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({telefono: telefonoCliente, ...datosNuevoCliente}) });
            const data = await res.json();
            if (res.ok) {
                setClienteAsignado(data.cliente || data);
                setNombreOrden((data.cliente || data).nombre);
                setPaso('menu');
            } else setErrorMsg(data.error || 'Fallo al registrar cliente.');
        } catch(err) { setErrorMsg('Error de red al registrar.'); }
        setIsSubmitting(false);
    };
    
    const verificarNip = async (e) => {
        e.preventDefault();
        if (nipInput.length !== 4) return setErrorNip('Ingresa 4 dígitos.');
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/clientes/verificar-nip`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cliente_id: clienteAsignado.id, nip: nipInput })
            });
            if (res.ok) {
                setModalNip(false); setDescuentoPuntosPuntosFisicos(clienteAsignado.puntos);
                setNipInput(''); setErrorNip('');
            } else {
                const data = await res.json(); setErrorNip(data.error || 'NIP Incorrecto.');
            }
        } catch (err) { setErrorNip('Error de red.'); }
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
            } else setMsgCupon({ texto: 'Error al cargar cupones.', tipo: 'error' });
        } catch (err) { setMsgCupon({ texto: 'Error de red.', tipo: 'error' }); }
    };

    // 👇 FASE 2: INTERCEPTOR FINANCIERO MEJORADO
    const generarPedidoBD = async (metodoAcelerado, detallesCuentaAbierta = null, skipConfirmacion = false) => {
        if (carrito.length === 0 || isSubmitting) return;
        if (!nombreOrden.trim()) return setAlertaUI({ titulo: 'Dato Requerido', mensaje: 'El nombre del cliente para la orden es obligatorio.', tipo: 'info' });
        
        // 🛡️ REGLA: Si están editando, validamos si el total de la orden cambió
        if (esEdicion && !skipConfirmacion) {
            const totalOriginalPagado = Number(ordenEditandoRapida.total || 0);
            const diferencia = totalConEnvio - totalOriginalPagado;
            
            if (Math.abs(diferencia) > 0.01) { 
                setConfirmacionFinanciera({
                    tipo: diferencia > 0 ? 'cobro' : 'devolucion',
                    monto: Math.abs(diferencia),
                    metodoAcelerado,
                    detallesCuentaAbierta,
                    isPagado: isPagado // Pasamos la bandera real
                });
                return; 
            }
        }
        
        setIsSubmitting(true);  
        const carritoExpandido = [];
        carrito.forEach(item => {
          const qty = item.cantidad || 1;
          for(let i=0; i<qty; i++) { carritoExpandido.push({...item, cantidad: 1, idTicket: item.idTicket + '_' + i}); }
        });  
        
        let stringDireccion = notaOpcional;
        let pagoFinal = ordenEditandoRapida ? ordenEditandoRapida.metodo_pago : 'Por Cobrar';
        
        // 👇 FIX: Si no es domicilio, jamás envíes costo de envío a la BD.
        const costoEnvioFinal = (tipoConsumo === 'Domicilio' && zonaEnvioCosto) ? Number(zonaEnvioCosto) : 0;  
        
        if (tipoConsumo === 'Domicilio' && stringDireccion === '') stringDireccion = 'Pendiente de dirección';  
        
        if (!clienteAsignado && nombreOrden.trim() && nombreOrden.trim() !== 'Invitado') {
          stringDireccion = `A NOMBRE DE: ${nombreOrden.trim()} | ${stringDireccion}`;
        }  
        
        const telParaAnexar = telefonoCliente || telefonoOrdenRapida || clienteAsignado?.telefono;
        if (telParaAnexar) {
            stringDireccion += ` | TEL: ${telParaAnexar}`;
        }
        
        if (detallesCuentaAbierta) {
          if (detallesCuentaAbierta.metodo === 'Efectivo' && detallesCuentaAbierta.monto) stringDireccion = `[LLEVAR CAMBIO DE: $${detallesCuentaAbierta.monto}] ${stringDireccion}`;
          else if (detallesCuentaAbierta.metodo) stringDireccion = `[PAGO PENDIENTE CON: ${detallesCuentaAbierta.metodo.toUpperCase()}] ${stringDireccion}`;
        }  
        
        let estadoInicial = 'Pendiente';
        if (metodoAcelerado === 'Mandar a Cocina' || metodoAcelerado === 'Cuenta Abierta') {
          estadoInicial = 'Pagado';
        } else if (metodoAcelerado === 'Cobrar Ahora') {
          estadoInicial = 'Pendiente';
        } else if (ordenEditandoRapida) {
          estadoInicial = ordenEditandoRapida.estado_preparacion;
        }
        
        const valorPeso = Number(configGlobal?.puntos_valor_peso) || 1;
        const puntosEfectivosAUsar = descuentoPuntosDinero > 0 ? Math.ceil(descuentoPuntosDinero / valorPeso) : 0;
        
        const paquete = {
          cliente_id: clienteAsignado?.id || null,
          cliente_nombre: nombreOrden.trim(),
          cliente_telefono: telefonoCliente || telefonoOrdenRapida || clienteAsignado?.telefono || null,
          tipo_consumo: tipoConsumo,
          metodo_pago: pagoFinal,
          total: totalConEnvio,
          costo_envio: costoEnvioFinal,
          carrito: carritoExpandido,
          origen: 'Caja',
          direccion_entrega: stringDireccion,
          estado_preparacion: estadoInicial,
          mesa: tipoConsumo === 'Local' ? (mesaSeleccionada || null) : null,
          cupon_codigo: cuponActivo ? cuponActivo.codigo : null,
          descuento_puntos: puntosEfectivosAUsar
        };  
        
        const url = ordenEditandoRapida ? `${apiUrl}/pedidos/${ordenEditandoRapida.id}` : `${apiUrl}/pedidos`;
        const metodoHttp = ordenEditandoRapida ? 'PUT' : 'POST';  
        
        try {
          const res = await fetch(url, { method: metodoHttp, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paquete) });
          if (res.ok) {
            const data = await res.json();
            if (clienteAsignado?.id && tipoConsumo === 'Domicilio' && stringDireccion) {
              const dirLimpia = notaOpcional.trim();
              if (dirLimpia && dirLimpia !== 'Pendiente de dirección') {
                fetch(`${apiUrl}/clientes/${clienteAsignado.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direccion: dirLimpia }) }).catch(() => {});
              }
            }
            refrescarDatosCaja();
            if (metodoAcelerado === 'Cobrar Ahora') {
                cerrarModalVenta();
                setTimeout(() => setModalPago(data), 100);
            } else {
                if (!ordenEditandoRapida && configGlobal?.ticket_impresion_activa) lanzarImpresion(data);
                cerrarModalVenta();
            }
          } else {
            const errData = await res.json();
            setAlertaUI({ titulo: 'Error al Guardar', mensaje: errData.error || 'Problema al guardar la orden.', tipo: 'error' });
          }
        } catch (e) {
          setAlertaUI({ titulo: 'Sin Conexión', mensaje: 'No hay conexión con el servidor. Verifica tu red.', tipo: 'error' });
        }
        setIsSubmitting(false);
    };

    // ==========================================
    // WIZARD PROPS Y VALIDACIONES
    // ==========================================
    let pasosWiz = [];
    if (productoEnEspera) {
        const tamanosList = (productoEnEspera.opciones || []).filter(o => o.categoria === 'Tamaño');
        const saboresList = (productoEnEspera.opciones || []).filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
        const gruposObligatoriosList = [...new Set((productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_obligatorio').map(o => o.categoria))];
        const objGruposOpcionales = {};  
        (productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_opcional').forEach(o => {
            if (!objGruposOpcionales[o.categoria]) objGruposOpcionales[o.categoria] = { limite: o.limite || 1, opciones: [] };
            objGruposOpcionales[o.categoria].opciones.push(o);
        });  
        if (tamanosList.length > 0) {
            pasosWiz.push({ id: 'tamano', tipo: 'tamaño', titulo: 'Elige el Tamaño *', opciones: tamanosList });
        }
        if (saboresList.length > 0) {
            pasosWiz.push({ id: 'sabor', tipo: 'sabor', titulo: 'Elige un Sabor *', opciones: saboresList.sort((a, b) => a.nombre.localeCompare(b.nombre)) });
        }  
        gruposObligatoriosList.forEach(g => {
            pasosWiz.push({
                id: `grupo_obl_${g}`,
                tipo: 'grupo_obligatorio',
                titulo: `Elige: ${g} *`,
                categoria: g,
                opciones: (productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_obligatorio' && o.categoria === g).sort((a, b) => a.nombre.localeCompare(b.nombre))
            });
        });  
        Object.keys(objGruposOpcionales).forEach(g => {
            pasosWiz.push({
                id: `grupo_opc_${g}`,
                tipo: 'grupo_opcional',
                titulo: `Personaliza: ${g}`,
                categoria: g,
                limite: objGruposOpcionales[g].limite,
                opciones: objGruposOpcionales[g].opciones.sort((a, b) => a.nombre.localeCompare(b.nombre))
            });
        });  
        const bases = (productoEnEspera.opciones || []).filter(o => o.tipo === 'base').sort((a, b) => a.nombre.localeCompare(b.nombre));
        if (bases.length > 0) {
            pasosWiz.push({ id: 'quitar_ingredientes', tipo: 'quitar_ingredientes', titulo: 'Modificar Ingredientes Base', opciones: bases });
        }  
        pasosWiz.push({ id: 'extras_notas', tipo: 'extras_notas', titulo: 'Añadir Extras y Notas' });
    }  
    const pasoActualObj = pasosWiz[pasoPersonalizacion] || null;
    
    const isFormIncompleto = carrito.length === 0 || isSubmitting || !nombreOrden.trim() ||
    (tipoConsumo === 'Domicilio' && (!notaOpcional.trim() || zonaEnvioCosto === '' || (telefonoCliente.length !== 10 && telefonoOrdenRapida.length !== 10))) ||
    (tipoConsumo === 'Recoger' && (telefonoCliente.length !== 10 && telefonoOrdenRapida.length !== 10)) ||
    (tipoConsumo === 'Para llevar' && ((telefonoCliente.length > 0 && telefonoCliente.length < 10) || (telefonoOrdenRapida.length > 0 && telefonoOrdenRapida.length < 10)));

    if (!modalPuntoVenta) return null;

    // ==========================================
    // RENDERIZADO VISUAL
    // ==========================================
    return (
        <>
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-6 animate-in fade-in duration-200">
                <div className="bg-slate-50 w-full max-w-4xl h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-300">

                    {/* Alerta UI Global */}
                    {alertaUI && (
                        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
                            <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${alertaUI.tipo === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {alertaUI.tipo === 'error' ? <AlertTriangle size={40}/> : <Info size={40}/>}
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-2">{alertaUI.titulo}</h3>
                                <p className="text-slate-500 font-medium mb-8 leading-relaxed">{alertaUI.mensaje}</p>
                                <button onClick={() => setAlertaUI(null)} className={`w-full text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition ${alertaUI.tipo === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}>
                                    Entendido
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ENCABEZADO GLOBAL */}
                    <div className="p-4 md:p-6 bg-white border-b border-slate-200 shrink-0 flex justify-between items-center z-10 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 md:p-3 rounded-2xl ${esEdicion ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                {esEdicion ? <Edit size={24}/> : <ShoppingBag size={24} />}
                            </div>
                            <div>
                                <h3 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">
                                    {pasoFlujoCaja === 1 && (esEdicion ? 'Editando Platillos' : '¿Qué se te antoja?')}
                                    {pasoFlujoCaja === 2 && 'Resumen de Orden'}
                                    {pasoFlujoCaja === 3 && 'Detalles de Entrega'}
                                </h3>
                                <p className="text-xs md:text-sm font-bold text-slate-500">
                                    {pasoFlujoCaja === 1 && 'Selecciona los platillos para el cliente.'}
                                    {pasoFlujoCaja === 2 && 'Verifica las cantidades y extras.'}
                                    {pasoFlujoCaja === 3 && 'Configura el envío y finaliza la venta.'}
                                </p>
                            </div>
                        </div>
                        <button onClick={cerrarModalVenta} className="bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 p-3 md:p-4 rounded-full transition shadow-sm">
                            <XCircle size={28} />
                        </button>
                    </div>

                    {/* IDENTIFICACIÓN PREVIA */}
                    {paso === 'identificar' || paso === 'registro' ? (
                        <PasoIdentificarCliente
                            paso={paso} setPaso={setPaso} telefonoCliente={telefonoCliente} setTelefonoCliente={setTelefonoCliente}
                            errorMsg={errorMsg} setErrorMsg={setErrorMsg} isSubmitting={isSubmitting} buscarClienteRapido={buscarClienteRapido}
                            datosNuevoCliente={datosNuevoCliente} setDatosNuevoCliente={setDatosNuevoCliente} registrarClienteRapido={registrarClienteRapido}
                            setNombreOrden={(nombre) => setNombreOrden(nombre === 'Invitado' ? '' : nombre)}
                            setClienteAsignado={setClienteAsignado}
                        />
                    ) : (
                        <>
                            {/* CUERPO CENTRAL DINÁMICO */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/50">
                                {/* PASO 1: MENÚ */}
                                {pasoFlujoCaja === 1 && (
                                    <MenuCategoriasYProductos
                                        categoriaActiva={categoriaActiva} setCategoriaActiva={setCategoriaActiva}
                                        categoriasUnicas={categoriasUnicas} productosFiltrados={productosFiltrados}
                                        getPortadaCategoria={getPortadaCategoria} abrirModalProducto={setProductoEnEspera}
                                    />
                                )}

                                {/* PASO 2: CARRITO GRANDE Y HERMOSO */}
                                {pasoFlujoCaja === 2 && (
                                    <div className="p-4 md:p-8 max-w-3xl mx-auto animate-in slide-in-from-right-4 duration-300">
                                        {carrito.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                                <ShoppingBag size={80} className="mb-6 text-slate-300" />
                                                <p className="text-2xl font-black text-slate-400">El carrito está vacío</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {carrito.map(item => (
                                                    <div key={item.idTicket} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-blue-200">
                                                        <div className="flex-1">
                                                            <p className="font-black text-lg md:text-xl text-slate-800 leading-tight">
                                                                {item.nombre}
                                                            </p>
                                                            {item.extras && item.extras.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                                    {item.extras.map((e, idx) => (
                                                                        <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide">
                                                                            {e.nombre}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <p className="font-black text-blue-600 text-lg mt-2">
                                                                ${(item.precioFinal * (item.cantidad || 1)).toFixed(2)}
                                                            </p>
                                                        </div>

                                                        {/* Controles del Carrito con botón Editar integrado */}
                                                        <div className="flex items-center gap-2 bg-slate-50 p-2 md:p-3 rounded-2xl border border-slate-100 shrink-0 w-fit">
                                                            <button disabled={isSubmitting} onClick={() => cambiarCantidadCart(item.idTicket, -1)} className="w-10 h-10 bg-white rounded-xl shadow-sm text-slate-500 hover:text-red-500 font-black text-xl flex items-center justify-center transition active:scale-95 disabled:opacity-50"><Minus size={20}/></button>
                                                            <span className="w-10 text-center font-black text-2xl text-slate-800">{item.cantidad || 1}</span>
                                                            <button disabled={isSubmitting} onClick={() => cambiarCantidadCart(item.idTicket, 1)} className="w-10 h-10 bg-white rounded-xl shadow-sm text-slate-500 hover:text-blue-600 font-black text-xl flex items-center justify-center transition active:scale-95 disabled:opacity-50"><Plus size={20}/></button>

                                                            <div className="w-px h-8 bg-slate-200 mx-1"></div>

                                                            <button disabled={isSubmitting} onClick={() => iniciarEdicion(item)} className="w-10 h-10 bg-blue-50 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition active:scale-95 disabled:opacity-50" title="Editar Platillo">
                                                                <Edit size={20}/>
                                                            </button>

                                                            <button disabled={isSubmitting} onClick={() => quitarDelCarrito(item.idTicket)} className="w-10 h-10 bg-red-50 rounded-xl text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition active:scale-95 disabled:opacity-50" title="Quitar Platillo">
                                                                <Trash2 size={20}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* PASO 3: LOGÍSTICA Y PAGOS */}
                                {pasoFlujoCaja === 3 && (
                                    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">1. Tipo de Servicio</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {[
                                                    { id: 'Local', icon: <Store size={20}/> },
                                                    { id: 'Para llevar', icon: <ShoppingBag size={20}/> },
                                                    { id: 'Domicilio', icon: <Bike size={20}/> },
                                                    { id: 'Recoger', icon: <Phone size={20}/> }
                                                ].map(tipo => (
                                                    // 👇 FIX: Al cambiar el tipo de consumo, destruimos el costo oculto
                                                    <button key={tipo.id} onClick={() => {
                                                        setTipoConsumo(tipo.id);
                                                        if (tipo.id !== 'Domicilio') {
                                                            setZonaEnvioCosto(0);
                                                        }
                                                    }} className={`p-4 rounded-2xl border-2 font-black flex flex-col items-center justify-center gap-2 transition-all ${tipoConsumo === tipo.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-blue-300 hover:shadow-sm'}`}>
                                                        {tipo.icon} <span className="text-[10px] md:text-xs uppercase tracking-widest">{tipo.id}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">2. Datos de la Orden</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Nombre o Teléfono del Cliente *"
                                                    value={nombreOrden}
                                                    onChange={e => {
                                                        setNombreOrden(e.target.value);
                                                        setMostrarSugerencias(true);
                                                        if (clienteAsignado) setClienteAsignado(null);
                                                    }}
                                                    onFocus={() => { if(sugerencias.length > 0) setMostrarSugerencias(true); }}
                                                    onBlur={() => setTimeout(() => setMostrarSugerencias(false), 250)}
                                                    className={`w-full bg-slate-50 border-2 rounded-2xl p-4 text-base font-bold outline-none transition-all ${!nombreOrden.trim() ? 'border-red-300 focus:border-red-500 placeholder-red-300 text-red-900' : 'border-slate-100 focus:border-blue-500 placeholder-slate-400 text-slate-800'}`}
                                                />
                                                {buscandoSugerencias && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                       <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                )}
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
                                            {tipoConsumo === 'Local' && <FormularioConsumoLocal mesas={mesas} mesaSeleccionada={mesaSeleccionada} setMesaSeleccionada={setMesaSeleccionada} ordenEditandoRapida={ordenEditandoRapida} />}
                                            {tipoConsumo === 'Para llevar' && <FormularioConsumoLlevar telefonoOrdenRapida={telefonoOrdenRapida} setTelefonoOrdenRapida={setTelefonoOrdenRapida} />}
                                            {tipoConsumo === 'Domicilio' && <FormularioConsumoDomicilio telefonoOrdenRapida={telefonoOrdenRapida} setTelefonoOrdenRapida={setTelefonoOrdenRapida} notaOpcional={notaOpcional} setNotaOpcional={setNotaOpcional} zonaEnvioCosto={zonaEnvioCosto} setZonaEnvioCosto={setZonaEnvioCosto} tarifasEnvio={tarifasEnvio} />}
                                            {tipoConsumo === 'Recoger' && <FormularioConsumoRecoger telefonoOrdenRapida={telefonoOrdenRapida} setTelefonoOrdenRapida={setTelefonoOrdenRapida} notaOpcional={notaOpcional} setNotaOpcional={setNotaOpcional} />}
                                        </div>

                                        {/* BANNER RESTRICCIÓN DE PUNTOS */}
                                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">3. Descuentos</label>
                                            {puntosCanjeActivo && (bloqueoPuntosActivo || canjeParcialActivo) && clienteAsignado && carrito.length > 0 && (
                                                <div className={`border p-3 rounded-2xl mb-2 flex gap-3 text-left animate-in slide-in-from-top-2 ${bloqueoPuntosActivo ? 'bg-red-50 border-red-200 text-red-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
                                                    <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-black text-xs uppercase tracking-widest">{bloqueoPuntosActivo ? 'Canje Restringido' : 'Canje Parcial (Solo aplica en algunos)'}</p>
                                                        <p className="text-[10px] font-bold mt-0.5 opacity-90">
                                                            {bloqueoPuntosActivo
                                                                ? 'El carrito contiene solo productos que NO participan en el programa de lealtad.'
                                                                : `Los puntos solo aplicarán sobre $${subtotalCanjeable.toFixed(2)} del total de tu orden.`}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            {puntosCanjeActivo && clienteAsignado && (
                                                <div className={`border p-4 rounded-2xl flex justify-between items-center shadow-sm animate-in fade-in zoom-in-95 ${bloqueoPuntosActivo ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50 border-indigo-200'}`}>
                                                    <div>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${bloqueoPuntosActivo ? 'text-slate-400' : 'text-indigo-500'}`}>Puntos Disponibles</p>
                                                        <p className={`text-xl font-black ${bloqueoPuntosActivo ? 'text-slate-500' : 'text-indigo-800'}`}>{clienteAsignado.puntos || 0} pts</p>
                                                    </div>
                                                    {clienteAsignado.puntos > 0 && descuentoPuntosDinero === 0 && (
                                                        <button
                                                            disabled={bloqueoPuntosActivo}
                                                            onClick={() => setModalNip(true)}
                                                            className={`px-5 py-3 rounded-xl text-sm font-black uppercase shadow-md transition active:scale-95 flex items-center gap-1.5 ${bloqueoPuntosActivo ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                                        >
                                                            {bloqueoPuntosActivo ? <><Lock size={14}/> Bloqueado</> : 'Canjear'}
                                                        </button>
                                                    )}
                                                    {descuentoPuntosDinero > 0 && (
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-lg">Usando {Math.ceil(descuentoPuntosDinero / (Number(configGlobal?.puntos_valor_peso) || 1))} pts</span>
                                                            <button onClick={() => {setDescuentoPuntosPuntosFisicos(0); setDescuentoPuntosDinero(0);}} className="bg-red-100 text-red-600 px-5 py-3 rounded-xl text-sm font-black uppercase shadow-sm hover:bg-red-200 transition active:scale-95">Quitar</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex gap-3 items-center">
                                                <div className="relative flex-1">
                                                    <Tag size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input type="text" placeholder="Ingresar Cupón" value={cuponInput} onChange={(e) => { setCuponInput(e.target.value.toUpperCase()); setMsgCupon({texto:'', tipo:''}); }} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold outline-none uppercase focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400" disabled={cuponActivo !== null || isSubmitting} />
                                                </div>
                                                {!cuponActivo ? (
                                                    <button disabled={!cuponInput.trim() || isSubmitting} onClick={aplicarCupon} className="bg-slate-800 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-700 transition shadow-md disabled:opacity-50">Aplicar</button>
                                                ) : (
                                                    <button onClick={() => { setCuponActivo(null); setCuponInput(''); setMsgCupon({texto:'', tipo:''}); setDescuentoCuponDinero(0); }} className="bg-red-100 text-red-600 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-200 transition shadow-sm">Quitar</button>
                                                )}
                                            </div>
                                            {msgCupon.texto && <p className={`text-xs font-bold px-2 ${msgCupon.tipo === 'error' ? 'text-red-500' : msgCupon.tipo === 'success' ? 'text-emerald-600' : 'text-slate-500'}`}>{msgCupon.texto}</p>}
                                        </div>
                                        <div className="pb-10"></div>
                                    </div>
                                )}
                            </div>

                            {/* ========================================== */}
                            {/* FOOTER FIJO (NAVEGACIÓN Y COBRO)          */}
                            {/* ========================================== */}
                            <div className="bg-white border-t border-slate-200 p-4 md:p-6 shrink-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                                {pasoFlujoCaja > 1 && (
                                    <div className="max-w-4xl mx-auto mb-4 md:mb-6 px-2 flex flex-wrap gap-x-8 gap-y-2 justify-between items-end">
                                        <div className="flex gap-6">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subtotal</p>
                                                <p className="text-lg font-black text-slate-600">${subtotal.toFixed(2)}</p>
                                            </div>
                                            {descuentoCuponDinero > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Cupón</p>
                                                    <p className="text-lg font-black text-emerald-600">-${descuentoCuponDinero.toFixed(2)}</p>
                                                </div>
                                            )}
                                            {descuentoPuntosDinero > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Puntos</p>
                                                    <p className="text-lg font-black text-indigo-600">-${descuentoPuntosDinero.toFixed(2)}</p>
                                                </div>
                                            )}
                                            {zonaEnvioCosto !== '' && Number(zonaEnvioCosto) > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Envío</p>
                                                    <p className="text-lg font-black text-purple-600">+${Number(zonaEnvioCosto).toFixed(2)}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right ml-auto">
                                            <p className="text-[10px] md:text-xs font-black text-slate-800 uppercase tracking-widest mb-1">{yaPagado ? 'Nuevo Total' : 'Total Final'}</p>
                                            <p className="text-3xl md:text-5xl font-black text-slate-900 leading-none">${totalConEnvio.toFixed(2)}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="max-w-4xl mx-auto flex gap-3 md:gap-4">
                                    {pasoFlujoCaja === 1 && (
                                        <button
                                            disabled={carrito.length === 0}
                                            onClick={() => setPasoFlujoCaja(2)}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                        >
                                            <ShoppingBag size={24}/> Ver Orden ({carrito.length}) <ArrowRight size={24}/>
                                        </button>
                                    )}
                                    {pasoFlujoCaja === 2 && (
                                        <>
                                            <button onClick={() => setPasoFlujoCaja(1)} className="px-6 md:px-8 py-4 md:py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2">
                                                <ArrowLeft size={20}/> Menú
                                            </button>
                                            <button onClick={() => setPasoFlujoCaja(3)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-3">
                                                Siguiente Paso <ArrowRight size={24}/>
                                            </button>
                                        </>
                                    )}
                                    {pasoFlujoCaja === 3 && (
                                        <>
                                            <button onClick={() => setPasoFlujoCaja(2)} className="px-6 md:px-8 py-4 md:py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2">
                                                <ArrowLeft size={20}/> Atrás
                                            </button>
                                            
                                            {/* 👇 BOTONES DE ACCIÓN: Se adapta si es Edición o Orden Nueva */}
                                            {yaPagado ? (
                                                <button
                                                    disabled={isFormIncompleto || isSubmitting}
                                                    onClick={() => generarPedidoBD('Mandar a Cocina')}
                                                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl shadow-xl shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    <Save size={24}/> Guardar Modificación
                                                </button>
                                            ) : (tipoConsumo === 'Domicilio' || tipoConsumo === 'Recoger') ? (
                                                <>
                                                    <button
                                                        disabled={isFormIncompleto || isSubmitting}
                                                        onClick={() => generarPedidoBD('Cobrar Ahora')}
                                                        className="flex-1 bg-amber-100 text-amber-600 hover:bg-amber-200 border-2 border-amber-200 py-4 md:py-5 rounded-2xl font-black text-sm md:text-lg uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        Cobrar Ahora
                                                    </button>
                                                    <button
                                                        disabled={isFormIncompleto || isSubmitting}
                                                        onClick={() => {
                                                            if (tipoConsumo === 'Domicilio') setModalCuentaAbierta(true);
                                                            else generarPedidoBD('Mandar a Cocina');
                                                        }}
                                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 md:py-5 rounded-2xl font-black text-sm md:text-lg uppercase tracking-widest shadow-xl shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        Cuenta Abierta
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        disabled={isFormIncompleto || isSubmitting}
                                                        onClick={() => {
                                                            generarPedidoBD('Mandar a Cocina');
                                                        }}
                                                        className="flex-1 bg-orange-100 text-orange-600 hover:bg-orange-200 border-2 border-orange-200 py-4 md:py-5 rounded-2xl font-black text-sm md:text-lg uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        Cuenta Abierta
                                                    </button>
                                                    <button
                                                        disabled={isFormIncompleto || isSubmitting}
                                                        onClick={() => generarPedidoBD('Cobrar Ahora')}
                                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 md:py-5 rounded-2xl font-black text-sm md:text-lg uppercase tracking-widest shadow-xl shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        Cobrar Ahora
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* MODALES EXTERNOS FLOTANTES (WIZARD, UPSELL, NIP) */}
                    <AsistentePersonalizacion
                        productoEnEspera={productoEnEspera}
                        itemEditando={itemEditandoId ? carrito.find(i => i.idTicket === itemEditandoId) : null}
                        pasosWiz={pasosWiz}
                        pasoActualObj={pasoActualObj}
                        pasoPersonalizacion={pasoPersonalizacion}
                        setPasoPersonalizacion={setPasoPersonalizacion}
                        opcionSeleccionada={opcionSeleccionada}
                        setOpcionSeleccionada={setOpcionSeleccionada}
                        saborSeleccionado={saborSeleccionado}
                        setSaborSeleccionado={setSaborSeleccionado}
                        gruposSeleccionados={gruposSeleccionados}
                        setGruposSeleccionados={setGruposSeleccionados}
                        gruposOpcionalesSeleccionados={gruposOpcionalesSeleccionados}
                        setGruposOpcionalesSeleccionados={setGruposOpcionalesSeleccionados}
                        ingredientesBase={ingredientesBase}
                        setIngredientesBase={setIngredientesBase}
                        ingredientesSustituidos={ingredientesSustituidos}
                        setIngredientesSustituidos={setIngredientesSustituidos}
                        ingredienteDesplegado={ingredienteDesplegado}
                        setIngredienteDesplegado={setIngredienteDesplegado}
                        extrasSeleccionados={extrasSeleccionados}
                        setExtrasSeleccionados={setExtrasSeleccionados}
                        notaProducto={notaProducto}
                        setNotaProducto={setNotaProducto}
                        cantidadProducto={cantidadProducto}
                        setCantidadProducto={setCantidadProducto}
                        catalogoIngredientes={catalogoIngredientes}
                        clasificaciones={clasificaciones}
                        politicasSustUI={politicasSustUI}
                        calcularPrecioSustitucion={calcularPrecioSustitucion}
                        resetWizard={resetWizard}
                        onTerminarPersonalizacion={handleTerminarPersonalizacion}
                    />

                    <ModalCuentaAbierta
                        isOpen={modalCuentaAbierta}
                        onClose={() => setModalCuentaAbierta(false)}
                        total={totalConEnvio}
                        onConfirm={(detalles) => {
                            setModalCuentaAbierta(false);
                            generarPedidoBD('Cuenta Abierta', detalles);
                        }}
                        configGlobal={configGlobal}
                        telefonoCliente={telefonoCliente || telefonoOrdenRapida}
                    />
                    
                    <OfertaUpselling
                        promocionVigente={promocionVigente}
                        setPromocionVigente={setPromocionVigente}
                        agregarUpsellAlCarrito={agregarUpsellAlCarrito}
                        apiUrl={apiUrl}
                    />

                    {modalNip && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
                            <form onSubmit={verificarNip} className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl text-center animate-in zoom-in-95 border border-slate-200">
                                <span className="text-6xl mb-4 block">🎁</span>
                                <h2 className="text-2xl font-black text-slate-800 mb-2">Seguridad de Puntos</h2>
                                <p className="text-slate-500 font-medium mb-6">Pídele al cliente que ingrese su NIP para usar sus <strong className="text-indigo-600">{clienteAsignado?.puntos || 0} pts</strong>.</p>
                                <input
                                    type="password"
                                    maxLength="4"
                                    required
                                    value={nipInput}
                                    onChange={e => setNipInput(e.target.value.replace(/\D/g, ''))}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-center text-3xl font-black tracking-[1em] outline-none focus:border-indigo-500 mb-4 text-slate-800"
                                    placeholder="••••"
                                />
                                {errorNip && <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-xl mb-4">{errorNip}</p>}
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => { setModalNip(false); setNipInput(''); setErrorNip(''); }} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar</button>
                                    <button type="submit" disabled={nipInput.length !== 4 || isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl disabled:opacity-50 transition active:scale-95 shadow-lg shadow-indigo-500/30">Autorizar</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* 👇 NUEVO MODAL: INTERCEPTOR FINANCIERO MEJORADO */}
                    {confirmacionFinanciera && (
                        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${confirmacionFinanciera.tipo === 'cobro' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                    <AlertTriangle size={40} />
                                </div>
                                
                                <h3 className="text-2xl font-black text-slate-800 mb-2">
                                    {confirmacionFinanciera.tipo === 'cobro' ? 'Ajuste de Cuenta' : 'Ajuste a Favor'}
                                </h3>
                                
                                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                                    {confirmacionFinanciera.isPagado
                                        ? (confirmacionFinanciera.tipo === 'cobro'
                                            ? `El nuevo total supera lo que el cliente había pagado originalmente. Debes cobrar al cliente una diferencia de `
                                            : `El nuevo total es menor a lo que el cliente había pagado. Debes devolver al cliente la cantidad de `)
                                        : (confirmacionFinanciera.tipo === 'cobro'
                                            ? `El total de esta cuenta pendiente de cobro aumentará en `
                                            : `El total de esta cuenta pendiente de cobro disminuirá en `)
                                    }
                                    <strong className="text-slate-800 text-xl block mt-2">${confirmacionFinanciera.monto.toFixed(2)} MXN</strong>
                                </p>
                                
                                <div className="flex flex-col gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            generarPedidoBD(confirmacionFinanciera.metodoAcelerado, confirmacionFinanciera.detallesCuentaAbierta, true);
                                            setConfirmacionFinanciera(null);
                                        }} 
                                        className={`w-full py-4 text-white font-black rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${confirmacionFinanciera.tipo === 'cobro' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'}`}
                                    >
                                        <CheckCircle2 size={20} /> Entendido, proceder
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setConfirmacionFinanciera(null)} 
                                        className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95"
                                    >
                                        Cancelar Edición
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default PuntoDeVentaPrincipal;