import React, { useState, useEffect } from 'react';
import { ShoppingBag, Tag, XCircle, ArrowLeft, ArrowRight, Trash2, Plus, Minus, Store, Bike, Phone, AlertTriangle, Info } from 'lucide-react';
import FormularioConsumoLocal from './FormularioConsumoLocal';
import FormularioConsumoLlevar from './FormularioConsumoLlevar';
import FormularioConsumoDomicilio from './FormularioConsumoDomicilio';
import FormularioConsumoRecoger from './FormularioConsumoRecoger';
import MenuCategoriasYProductos from './MenuCategoriasYProductos';
import AsistentePersonalizacion from './AsistentePersonalizacion';
import ModalCuentaAbierta from './ModalCuentaAbierta';
import OfertaUpselling from './OfertaUpselling';
import PasoIdentificarCliente from './PasoIdentificarCliente';

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
    
    // 👇 FIX: Estado Global de Alertas para reemplazar los "alert()" feos
    const [alertaUI, setAlertaUI] = useState(null); 

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
    // ESTADOS DEL WIZARD DE PERSONALIZACIÓN
    // ==========================================
    const [productoEnEspera, setProductoEnEspera] = useState(null);
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
    // CONFIGURACIONES DINÁMICAS
    // ==========================================
    const politicasSustUI = typeof configGlobal?.politicas_sustitucion === 'string' 
        ? JSON.parse(configGlobal.politicas_sustitucion || '{}') 
        : (configGlobal?.politicas_sustitucion || {});
        
    const tarifasEnvio = typeof configGlobal?.tarifas_envio === 'string' 
        ? JSON.parse(configGlobal.tarifas_envio || '[]') 
        : (configGlobal?.tarifas_envio || []);

    // ==========================================
    // CARGA INICIAL Y RESET
    // ==========================================
    useEffect(() => {
        if (ordenEditandoRapida && modalPuntoVenta) {
            setPaso('menu');
            setPasoFlujoCaja(2);
            
            if (ordenEditandoRapida.cliente_id) {
                setClienteAsignado({ id: ordenEditandoRapida.cliente_id, nombre: ordenEditandoRapida.cliente_nombre });
            } else {
                setClienteAsignado(null);
            }
            
            setNombreOrden(ordenEditandoRapida.cliente_nombre || '');
            setTipoConsumo(ordenEditandoRapida.tipo_consumo || 'Local');
            setMesaSeleccionada(ordenEditandoRapida.mesa || '');
            setZonaEnvioCosto(ordenEditandoRapida.costo_envio || '');

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
        setDatosNuevoCliente({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: '' });

        setPasoFlujoCaja(1);
        setPaso('identificar');
        setModalPuntoVenta(false);
        if (onClose) onClose();
    };

    // ==========================================
    // MATEMÁTICAS DEL CARRITO
    // ==========================================
    const calcularSubtotal = () => carrito.reduce((t, i) => t + ((Number(i.precioFinal) || 0) * (Number(i.cantidad) || 1)), 0);
    const subtotal = calcularSubtotal();
    
    useEffect(() => {
        let dCup = 0;
        if (cuponActivo) {
            if (cuponActivo.tipo === 'porcentaje') dCup = subtotal * (Number(cuponActivo.valor) / 100);
            else dCup = Number(cuponActivo.valor);
        }
        if (dCup > subtotal) dCup = subtotal;
        setDescuentoCuponDinero(dCup);

        let dPts = 0;
        if (descuentoPuntosPuntosFisicos > 0) {
            const valorPeso = Number(configGlobal?.puntos_valor_peso) || 1;
            dPts = descuentoPuntosPuntosFisicos * valorPeso;
            const limitePermitido = subtotal - dCup;
            if (dPts > limitePermitido) dPts = limitePermitido;
        }
        setDescuentoPuntosDinero(dPts > 0 ? dPts : 0);
    }, [descuentoPuntosPuntosFisicos, configGlobal, carrito, cuponActivo, subtotal]);

    const descuentoTotal = descuentoCuponDinero + descuentoPuntosDinero;
    const totalConEnvio = (subtotal - descuentoTotal) + (zonaEnvioCosto ? Number(zonaEnvioCosto) : 0);
    
    const esEdicion = !!ordenEditandoRapida;
    const yaPagado = esEdicion && !['Por Cobrar', 'Pendiente'].includes(ordenEditandoRapida.metodo_pago);

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

    const resetWizard = () => {
        setProductoEnEspera(null); setPasoPersonalizacion(0); setOpcionSeleccionada(null); setSaborSeleccionado(null);
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
        setCarrito([...carrito, nuevoItem]);
        const promo = evaluarUpsell(productoEnEspera.id, productoEnEspera.categoria);
        if (promo) setPromocionVigente(promo);
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

    const generarPedidoBD = async (metodoAcelerado, detallesCuentaAbierta = null) => {
        if (carrito.length === 0 || isSubmitting) return;
        
        if (!nombreOrden.trim()) return setAlertaUI({ titulo: 'Dato Requerido', mensaje: 'El nombre del cliente para la orden es obligatorio.', tipo: 'info' });
        
        setIsSubmitting(true);

        const carritoExpandido = [];
        carrito.forEach(item => { 
            const qty = item.cantidad || 1; 
            for(let i=0; i<qty; i++) { carritoExpandido.push({...item, cantidad: 1, idTicket: item.idTicket + '_' + i}); }
        });

        let stringDireccion = notaOpcional;
        let pagoFinal = ordenEditandoRapida ? ordenEditandoRapida.metodo_pago : 'Por Cobrar';
        const costoEnvioFinal = zonaEnvioCosto ? Number(zonaEnvioCosto) : 0;

        if (tipoConsumo === 'Domicilio' && stringDireccion === '') stringDireccion = 'Pendiente de dirección';

        if (tipoConsumo === 'Domicilio' && !clienteAsignado && (telefonoCliente || telefonoOrdenRapida)) stringDireccion += ` | TEL: ${telefonoCliente || telefonoOrdenRapida}`;
        else if (tipoConsumo === 'Para llevar' && !clienteAsignado && telefonoOrdenRapida) stringDireccion += ` | TEL: ${telefonoOrdenRapida}`;
        else if (tipoConsumo === 'Recoger' && !clienteAsignado && (telefonoCliente || telefonoOrdenRapida)) stringDireccion += ` | TEL: ${telefonoCliente || telefonoOrdenRapida}`;

        if (detallesCuentaAbierta) {
            if (detallesCuentaAbierta.metodo === 'Efectivo' && detallesCuentaAbierta.monto) stringDireccion = `[LLEVAR CAMBIO DE: $${detallesCuentaAbierta.monto}] ${stringDireccion}`;
            else if (detallesCuentaAbierta.metodo) stringDireccion = `[PAGO PENDIENTE CON: ${detallesCuentaAbierta.metodo.toUpperCase()}] ${stringDireccion}`;
        }

        let estadoInicial = 'Pendiente';
        if (ordenEditandoRapida) estadoInicial = ordenEditandoRapida.estado_preparacion;
        else {
            if (metodoAcelerado === 'Mandar a Cocina' || metodoAcelerado === 'Cuenta Abierta') estadoInicial = 'Pagado';
            else if (metodoAcelerado === 'Cobrar Ahora') estadoInicial = 'Pendiente';
        }

        const paquete = {
            cliente_id: clienteAsignado?.id || null,
            cliente_nombre: nombreOrden.trim(),
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
            descuento_puntos: descuentoPuntosPuntosFisicos
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
                if (metodoAcelerado === 'Mandar a Cocina' || metodoAcelerado === 'Cuenta Abierta' || ordenEditandoRapida) {
                    if (!ordenEditandoRapida && configGlobal?.ticket_impresion_activa) lanzarImpresion(data);
                    cerrarModalVenta();
                } else {
                    cerrarModalVenta();
                    setTimeout(() => setModalPago(data), 100);
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
    (tipoConsumo === 'Domicilio' && (!notaOpcional.trim() || zonaEnvioCosto === '' || (!clienteAsignado && (telefonoCliente.length !== 10 && telefonoOrdenRapida.length !== 10)))) ||
    (tipoConsumo === 'Recoger' && (!clienteAsignado && telefonoCliente.length !== 10 && telefonoOrdenRapida.length !== 10)) ||
    (tipoConsumo === 'Para llevar' && !clienteAsignado && telefonoOrdenRapida.length > 0 && telefonoOrdenRapida.length < 10);

    if (!modalPuntoVenta) return null;

    // ==========================================
    // RENDERIZADO VISUAL DEL STEPPER
    // ==========================================
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-slate-50 w-full max-w-4xl h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-300">
                
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
                        <div className="bg-blue-100 p-2 md:p-3 rounded-2xl text-blue-600">
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">
                                {pasoFlujoCaja === 1 && '¿Qué se te antoja?'}
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
                                                    
                                                    <div className="flex items-center gap-3 bg-slate-50 p-2 md:p-3 rounded-2xl border border-slate-100 shrink-0 w-fit">
                                                        <button disabled={isSubmitting} onClick={() => cambiarCantidadCart(item.idTicket, -1)} className="w-10 h-10 bg-white rounded-xl shadow-sm text-slate-500 hover:text-red-500 font-black text-xl flex items-center justify-center transition active:scale-95 disabled:opacity-50"><Minus size={20}/></button>
                                                        <span className="w-10 text-center font-black text-2xl text-slate-800">{item.cantidad || 1}</span>
                                                        <button disabled={isSubmitting} onClick={() => cambiarCantidadCart(item.idTicket, 1)} className="w-10 h-10 bg-white rounded-xl shadow-sm text-slate-500 hover:text-blue-600 font-black text-xl flex items-center justify-center transition active:scale-95 disabled:opacity-50"><Plus size={20}/></button>
                                                        <div className="w-px h-8 bg-slate-200 mx-1"></div>
                                                        <button disabled={isSubmitting} onClick={() => quitarDelCarrito(item.idTicket)} className="w-10 h-10 bg-red-50 rounded-xl text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition active:scale-95 disabled:opacity-50">
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
                                    
                                    {/* Selector de Consumo */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">1. Tipo de Servicio</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {[
                                                { id: 'Local', icon: <Store size={20}/> },
                                                { id: 'Para llevar', icon: <ShoppingBag size={20}/> },
                                                { id: 'Domicilio', icon: <Bike size={20}/> },
                                                { id: 'Recoger', icon: <Phone size={20}/> }
                                            ].map(tipo => (
                                                <button key={tipo.id} onClick={() => setTipoConsumo(tipo.id)} className={`p-4 rounded-2xl border-2 font-black flex flex-col items-center justify-center gap-2 transition-all ${tipoConsumo === tipo.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-blue-300 hover:shadow-sm'}`}>
                                                    {tipo.icon} <span className="text-[10px] md:text-xs uppercase tracking-widest">{tipo.id}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Formulario Dinámico */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">2. Datos de la Orden</label>
                                        
                                        <input type="text" placeholder="Nombre del Cliente (Obligatorio) *" value={nombreOrden} onChange={e => setNombreOrden(e.target.value)} className={`w-full bg-slate-50 border-2 rounded-2xl p-4 text-base font-bold outline-none transition-all ${!nombreOrden.trim() ? 'border-red-300 focus:border-red-500 placeholder-red-300 text-red-900' : 'border-slate-100 focus:border-blue-500 placeholder-slate-400 text-slate-800'}`} />
                                        
                                        {tipoConsumo === 'Local' && <FormularioConsumoLocal mesas={mesas} mesaSeleccionada={mesaSeleccionada} setMesaSeleccionada={setMesaSeleccionada} ordenEditandoRapida={ordenEditandoRapida} />}
                                        {tipoConsumo === 'Para llevar' && <FormularioConsumoLlevar telefonoOrdenRapida={telefonoOrdenRapida} setTelefonoOrdenRapida={setTelefonoOrdenRapida} clienteAsignado={clienteAsignado} />}
                                        {tipoConsumo === 'Domicilio' && <FormularioConsumoDomicilio telefonoOrdenRapida={telefonoOrdenRapida} setTelefonoOrdenRapida={setTelefonoOrdenRapida} notaOpcional={notaOpcional} setNotaOpcional={setNotaOpcional} zonaEnvioCosto={zonaEnvioCosto} setZonaEnvioCosto={setZonaEnvioCosto} tarifasEnvio={tarifasEnvio} clienteAsignado={clienteAsignado} />}
                                        {tipoConsumo === 'Recoger' && <FormularioConsumoRecoger telefonoOrdenRapida={telefonoOrdenRapida} setTelefonoOrdenRapida={setTelefonoOrdenRapida} notaOpcional={notaOpcional} setNotaOpcional={setNotaOpcional} clienteAsignado={clienteAsignado} />}
                                    </div>

                                    {/* Descuentos y Puntos */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">3. Descuentos</label>
                                        
                                        {clienteAsignado && (
                                            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                                <div>
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Puntos Disponibles</p>
                                                    <p className="text-xl font-black text-indigo-800">{clienteAsignado.puntos || 0} pts</p>
                                                </div>
                                                {clienteAsignado.puntos > 0 && descuentoPuntosPuntosFisicos === 0 && (
                                                    <button onClick={() => setModalNip(true)} className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-black uppercase shadow-md hover:bg-indigo-700 transition active:scale-95">Canjear</button>
                                                )}
                                                {descuentoPuntosPuntosFisicos > 0 && (
                                                    <button onClick={() => {setDescuentoPuntosPuntosFisicos(0); setDescuentoPuntosDinero(0);}} className="bg-red-100 text-red-600 px-5 py-3 rounded-xl text-sm font-black uppercase shadow-sm hover:bg-red-200 transition active:scale-95">Quitar Puntos</button>
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
                            
                            {/* Desglose Matemático Superior */}
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

                            {/* Botoneras Inteligentes */}
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

                                        {yaPagado ? (
                                            <button
                                                disabled={isFormIncompleto || isSubmitting}
                                                onClick={() => generarPedidoBD('Mandar a Cocina')}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl shadow-xl shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                Guardar Modificación
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    disabled={isFormIncompleto || isSubmitting}
                                                    onClick={() => {
                                                        if (tipoConsumo === 'Domicilio') setModalCuentaAbierta(true);
                                                        else generarPedidoBD('Mandar a Cocina');
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
            </div>
        </div>
    );
};

export default PuntoDeVentaPrincipal;