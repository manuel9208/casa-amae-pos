import React, { useState, useEffect } from 'react';
import { ShoppingBag, Tag, XCircle } from 'lucide-react';
import FormularioConsumoLocal from './FormularioConsumoLocal';
import FormularioConsumoLlevar from './FormularioConsumoLlevar';
import FormularioConsumoDomicilio from './FormularioConsumoDomicilio';
import FormularioConsumoRecoger from './FormularioConsumoRecoger';
import MenuCategoriasYProductos from './MenuCategoriasYProductos';
import AsistentePersonalizacion from './AsistentePersonalizacion';
import CarritoDeOrden from './CarritoDeOrden';
import ModalCuentaAbierta from './ModalCuentaAbierta';
import OfertaUpselling from './OfertaUpselling';
import PasoIdentificarCliente from './PasoIdentificarCliente';

const PuntoDeVentaPrincipal = ({
    modalPuntoVenta, setModalPuntoVenta, ordenEditandoRapida, user, configGlobal,
    productos, clasificaciones, catalogoIngredientes, apiUrl, lanzarImpresion,
    setModalPago, refrescarDatosCaja, onClose, empleadosPOS, mesas
}) => {
    // ==========================================
    // ESTADOS PRINCIPALES
    // ==========================================
    const [paso, setPaso] = useState('identificar');
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
    // ESTADOS DE MODALES Y PROMOCIONES
    // ==========================================
    const [modalCuentaAbierta, setModalCuentaAbierta] = useState(false);
    const [promocionVigente, setPromocionVigente] = useState(null);

    // ESTADOS PARA CANJE DE PUNTOS
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
            
            if (ordenEditandoRapida.cliente_id) {
                setClienteAsignado({ 
                    id: ordenEditandoRapida.cliente_id, 
                    nombre: ordenEditandoRapida.cliente_nombre 
                });
            } else {
                setClienteAsignado(null);
            }
            
            setNombreOrden(ordenEditandoRapida.cliente_nombre || 'Invitado');
            setTipoConsumo(ordenEditandoRapida.tipo_consumo || 'Local');
            setMesaSeleccionada(ordenEditandoRapida.mesa || '');
            setZonaEnvioCosto(ordenEditandoRapida.costo_envio || '');

            let dirPura = ordenEditandoRapida.direccion_entrega || '';
            if (dirPura.includes('|')) {
                dirPura = dirPura.split('|')[0].trim();
            }
            setNotaOpcional(dirPura !== 'Pendiente de dirección' ? dirPura : '');

            try {
                const carArr = typeof ordenEditandoRapida.carrito === 'string' 
                    ? JSON.parse(ordenEditandoRapida.carrito) 
                    : ordenEditandoRapida.carrito;
                setCarrito(carArr || []);
            } catch (e) {
                setCarrito([]);
            }

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
        setNombreOrden('');
        setTipoConsumo('Local');
        setNotaOpcional('');
        setMesaSeleccionada('');
        setZonaEnvioCosto('');
        setCuponActivo(null);
        setCuponInput('');
        setDescuentoPuntosPuntosFisicos(0);
        setDescuentoPuntosDinero(0);
        
        // 👇 FIX APLICADO: Vaciamos completamente los datos del cliente anterior de la memoria
        setClienteAsignado(null);
        setTelefonoCliente('');
        setTelefonoOrdenRapida('');
        setErrorMsg('');
        setDatosNuevoCliente({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: '' });

        setPaso('identificar');
        setModalPuntoVenta(false);
        if (onClose) onClose();
    };

    // ==========================================
    // MATEMÁTICAS DEL CARRITO CON PUNTOS
    // ==========================================
    const calcularSubtotal = () => {
        return carrito.reduce((t, i) => t + ((Number(i.precioFinal) || 0) * (Number(i.cantidad) || 1)), 0);
    };
    
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
    const montoOriginal = esEdicion ? Number(ordenEditandoRapida.total) : 0;
    const diferencia = totalConEnvio - montoOriginal;

    // ==========================================
    // CATÁLOGOS Y FILTROS
    // ==========================================
    const categoriasUnicas = [...new Set(productos.map(p => p.categoria || 'General'))];
    const productosFiltrados = productos.filter(p => (p.categoria || 'General') === categoriaActiva);
    
    const getPortadaCategoria = (catName) => {
        const clasifDB = clasificaciones.find(c => c.nombre === catName);
        return { 
            imagen_url: clasifDB?.imagen_url || null, 
            emoji: clasifDB?.emoji || '🍽️' 
        };
    };

    // ==========================================
    // FUNCIONES DEL CARRITO Y WIZARD
    // ==========================================
    const cambiarCantidadCart = (idTicket, delta) => {
        setCarrito(prev => prev.map(item => {
            if (item.idTicket === idTicket) {
                const newQty = (item.cantidad || 1) + delta;
                return newQty > 0 ? { ...item, cantidad: newQty } : item;
            }
            return item;
        }));
    };

    const quitarDelCarrito = (idTicket) => {
        setCarrito(prev => prev.filter(item => item.idTicket !== idTicket));
    };

    const resetWizard = () => {
        setProductoEnEspera(null); 
        setPasoPersonalizacion(0); 
        setOpcionSeleccionada(null);
        setSaborSeleccionado(null); 
        setGruposSeleccionados({}); 
        setGruposOpcionalesSeleccionados({});
        setIngredientesBase([]); 
        setIngredientesSustituidos({}); 
        setIngredienteDesplegado(null);
        setExtrasSeleccionados([]); 
        setNotaProducto(''); 
        setCantidadProducto(1);
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
        
        return promociones.find(p => 
            p.activo && 
            p.tipo === 'upselling' && 
            (String(p.producto_trigger_id) === String(prodId) || p.categoria_trigger === catName)
        );
    };

    const handleTerminarPersonalizacion = (nuevoItem) => {
        setCarrito([...carrito, nuevoItem]);
        const promo = evaluarUpsell(productoEnEspera.id, productoEnEspera.categoria);
        if (promo) {
            setPromocionVigente(promo);
        }
        resetWizard();
    };

    const agregarUpsellAlCarrito = () => {
        let precioFinal = Number(promocionVigente.valor_descuento);
        if (promocionVigente.tipo_descuento === 'porcentaje') {
            let precioBase = 0;
            const prodOrig = productos.find(p => p.id === promocionVigente.producto_oferta_id);
            if (prodOrig) {
                precioBase = Number(prodOrig.precio_base);
            }
            precioFinal = precioBase - (precioBase * (precioFinal / 100));
        }
        
        const nuevoItem = {
            idTicket: Math.random().toString(36).substr(2, 9),
            id: promocionVigente.producto_oferta_id,
            nombre: promocionVigente.oferta_nombre,
            precioFinal: Math.max(0, precioFinal),
            cantidad: 1,
            extras: [{ nombre: `⭐ Promo: ${promocionVigente.nombre}`, precio: 0 }]
        };
        
        setCarrito([...carrito, nuevoItem]);
        setPromocionVigente(null);
    };

    // ==========================================
    // IDENTIFICACIÓN DIRECTA DE CLIENTES Y PUNTOS
    // ==========================================
    const buscarClienteRapido = async (e) => {
        e.preventDefault(); 
        setErrorMsg('');
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
            } else {
                setPaso('registro');
            }
        } catch(err) { setErrorMsg('Error de conexión.'); }
        setIsSubmitting(false);
    };

    const registrarClienteRapido = async (e) => {
        e.preventDefault(); 
        setErrorMsg('');
        if(!datosNuevoCliente.nombre.trim() || !datosNuevoCliente.apellido.trim() || datosNuevoCliente.nip.length !== 4) {
            return setErrorMsg('Nombre, Apellido y NIP son obligatorios.');
        }
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/clientes/registro`, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({telefono: telefonoCliente, ...datosNuevoCliente}) 
            });
            const data = await res.json();
            if (res.ok) { 
                setClienteAsignado(data.cliente || data); 
                setNombreOrden((data.cliente || data).nombre); 
                setPaso('menu'); 
            } else {
                setErrorMsg(data.error || 'Fallo al registrar cliente.');
            }
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
                setModalNip(false);
                setDescuentoPuntosPuntosFisicos(clienteAsignado.puntos);
                setNipInput('');
                setErrorNip('');
            } else {
                const data = await res.json();
                setErrorNip(data.error || 'NIP Incorrecto.');
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
            } else {
                setMsgCupon({ texto: 'Error al cargar cupones.', tipo: 'error' });
            }
        } catch (err) { setMsgCupon({ texto: 'Error de red.', tipo: 'error' }); }
    };

    // ==========================================
    // GENERACIÓN Y GUARDADO DE PEDIDO
    // ==========================================
    const generarPedidoBD = async (metodoAcelerado, detallesCuentaAbierta = null) => {
        if (carrito.length === 0 || isSubmitting) return;
        if (!nombreOrden.trim()) return alert("El nombre del cliente es obligatorio.");
        setIsSubmitting(true);

        const carritoExpandido = [];
        carrito.forEach(item => { 
            const qty = item.cantidad || 1; 
            for(let i=0; i<qty; i++) {
                carritoExpandido.push({...item, cantidad: 1, idTicket: item.idTicket + '_' + i}); 
            }
        });

        let stringDireccion = notaOpcional;
        let tipoFinal = tipoConsumo;
        let pagoFinal = ordenEditandoRapida ? ordenEditandoRapida.metodo_pago : 'Por Cobrar';
        const costoEnvioFinal = zonaEnvioCosto ? Number(zonaEnvioCosto) : 0;

        if (tipoConsumo === 'Domicilio' && stringDireccion === '') {
            stringDireccion = 'Pendiente de dirección';
        }
        
        if (nombreOrden) {
            stringDireccion = `${stringDireccion} | A NOMBRE DE: ${nombreOrden}`;
        }

        if (tipoConsumo === 'Domicilio' && !clienteAsignado && (telefonoCliente || telefonoOrdenRapida)) {
            stringDireccion += ` | TEL: ${telefonoCliente || telefonoOrdenRapida}`;
        } else if (tipoConsumo === 'Para llevar' && !clienteAsignado && telefonoOrdenRapida) {
            stringDireccion += ` | TEL: ${telefonoOrdenRapida}`;
        } else if (tipoConsumo === 'Recoger' && !clienteAsignado && (telefonoCliente || telefonoOrdenRapida)) {
            stringDireccion += ` | TEL: ${telefonoCliente || telefonoOrdenRapida}`;
        }

        if (detallesCuentaAbierta) {
            if (detallesCuentaAbierta.metodo === 'Efectivo' && detallesCuentaAbierta.monto) {
                stringDireccion = `[LLEVAR CAMBIO DE: $${detallesCuentaAbierta.monto}] ${stringDireccion}`;
            } else if (detallesCuentaAbierta.metodo) {
                stringDireccion = `[PAGO PENDIENTE CON: ${detallesCuentaAbierta.metodo.toUpperCase()}] ${stringDireccion}`;
            }
        }

        let estadoInicial = 'Pendiente';
        if (ordenEditandoRapida) {
            estadoInicial = ordenEditandoRapida.estado_preparacion;
        } else {
            if (metodoAcelerado === 'Mandar a Cocina' || metodoAcelerado === 'Cuenta Abierta') estadoInicial = 'Pagado';
            else if (metodoAcelerado === 'Cobrar Ahora') estadoInicial = 'Pendiente';
        }

        const paquete = {
            cliente_id: clienteAsignado?.id || null,
            tipo_consumo: tipoFinal, 
            metodo_pago: pagoFinal,
            total: totalConEnvio, 
            costo_envio: costoEnvioFinal, 
            carrito: carritoExpandido,
            origen: 'Caja', 
            direccion_entrega: stringDireccion, 
            estado_preparacion: estadoInicial,
            mesa: tipoFinal === 'Local' ? (mesaSeleccionada || null) : null,
            cupon_codigo: cuponActivo ? cuponActivo.codigo : null,
            descuento_puntos: descuentoPuntosPuntosFisicos
        };

        const url = ordenEditandoRapida ? `${apiUrl}/pedidos/${ordenEditandoRapida.id}` : `${apiUrl}/pedidos`;
        const metodoHttp = ordenEditandoRapida ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, { 
                method: metodoHttp, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(paquete) 
            });
            
            if (res.ok) {
                const data = await res.json();
                if (clienteAsignado?.id && tipoFinal === 'Domicilio' && stringDireccion) {
                    const dirLimpia = notaOpcional.trim();
                    if (dirLimpia && dirLimpia !== 'Pendiente de dirección') {
                        fetch(`${apiUrl}/clientes/${clienteAsignado.id}`, { 
                            method: 'PUT', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ direccion: dirLimpia }) 
                        }).catch(() => {});
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
                alert(errData.error || 'Problema al guardar la orden.');
            }
        } catch (e) { 
            alert('Sin conexión.'); 
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

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-slate-50 w-full max-w-7xl h-[95vh] rounded-3xl md:rounded-[36px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-300">
                <button onClick={cerrarModalVenta} className="absolute top-4 right-4 z-50 bg-white shadow-md hover:bg-red-100 text-slate-400 hover:text-red-500 p-2 rounded-full transition">
                    <XCircle size={28} />
                </button>

                {paso === 'identificar' || paso === 'registro' ? (
                    <PasoIdentificarCliente
                        paso={paso} setPaso={setPaso}
                        telefonoCliente={telefonoCliente} setTelefonoCliente={setTelefonoCliente}
                        errorMsg={errorMsg} setErrorMsg={setErrorMsg}
                        isSubmitting={isSubmitting} buscarClienteRapido={buscarClienteRapido}
                        datosNuevoCliente={datosNuevoCliente} setDatosNuevoCliente={setDatosNuevoCliente}
                        registrarClienteRapido={registrarClienteRapido}
                        setNombreOrden={setNombreOrden}
                        setClienteAsignado={setClienteAsignado} /* 👇 FIX: Pasamos el actualizador */
                    />
                ) : (
                    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden animate-in slide-in-from-right">
                        {/* LADO IZQUIERDO: MENÚ */}
                        <div className="flex-1 border-r border-slate-200 overflow-hidden flex flex-col">
                            <MenuCategoriasYProductos
                                categoriaActiva={categoriaActiva} setCategoriaActiva={setCategoriaActiva}
                                categoriasUnicas={categoriasUnicas} productosFiltrados={productosFiltrados}
                                getPortadaCategoria={getPortadaCategoria} abrirModalProducto={setProductoEnEspera}
                            />
                        </div>

                        {/* LADO DERECHO: ORDEN Y CARRITO */}
                        <div className="w-full lg:w-[450px] bg-slate-50/50 flex flex-col h-full shrink-0">
                            <div className="p-4 md:p-6 bg-white border-b border-slate-200 shrink-0">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><ShoppingBag size={20} className="md:w-6 md:h-6" /></div>
                                    <h3 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight">Orden en Curso</h3>
                                </div>
                                <div className="space-y-2 md:space-y-3">
                                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 rounded-xl">
                                        {['Local', 'Para llevar', 'Domicilio', 'Recoger'].map(tipo => (
                                            <button key={tipo} onClick={() => setTipoConsumo(tipo)} className={`py-1.5 md:py-2 px-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-wider transition shadow-sm ${tipoConsumo === tipo ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                                                {tipo}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <input type="text" placeholder="Nombre del Cliente (Obligatorio) *" value={nombreOrden} onChange={e => setNombreOrden(e.target.value)} className={`w-full bg-white border rounded-xl p-2.5 md:p-3 text-xs md:text-sm font-bold outline-none transition-all shadow-sm ${['Domicilio', 'Recoger'].includes(tipoConsumo) && !clienteAsignado ? 'mb-2' : ''} ${!nombreOrden.trim() ? 'border-red-200 focus:border-red-400 placeholder-red-300 text-red-900' : 'border-slate-200 focus:border-blue-500 placeholder-slate-400 text-slate-800'}`} />
                                    
                                    {tipoConsumo === 'Local' && <FormularioConsumoLocal mesas={mesas} mesaSeleccionada={mesaSeleccionada} setMesaSeleccionada={setMesaSeleccionada} ordenEditandoRapida={ordenEditandoRapida} />}
                                    {tipoConsumo === 'Para llevar' && <FormularioConsumoLlevar telefonoOrdenRapida={telefonoOrdenRapida} setTelefonoOrdenRapida={setTelefonoOrdenRapida} clienteAsignado={clienteAsignado} />}
                                    {tipoConsumo === 'Domicilio' && <FormularioConsumoDomicilio telefonoOrdenRapida={telefonoOrdenRapida} setTelefonoOrdenRapida={setTelefonoOrdenRapida} notaOpcional={notaOpcional} setNotaOpcional={setNotaOpcional} zonaEnvioCosto={zonaEnvioCosto} setZonaEnvioCosto={setZonaEnvioCosto} tarifasEnvio={tarifasEnvio} clienteAsignado={clienteAsignado} />}
                                    {tipoConsumo === 'Recoger' && <FormularioConsumoRecoger telefonoOrdenRapida={telefonoOrdenRapida} setTelefonoOrdenRapida={setTelefonoOrdenRapida} notaOpcional={notaOpcional} setNotaOpcional={setNotaOpcional} clienteAsignado={clienteAsignado} />}
                                    
                                    {/* Panel Visual de Puntos Integrado */}
                                    {clienteAsignado && (
                                        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl mb-3 flex justify-between items-center shadow-sm">
                                            <div>
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Puntos Cliente</p>
                                                <p className="text-sm font-black text-indigo-700">{clienteAsignado.puntos || 0} pts</p>
                                            </div>
                                            {clienteAsignado.puntos > 0 && descuentoPuntosPuntosFisicos === 0 && (
                                                <button onClick={() => setModalNip(true)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase shadow-sm hover:bg-indigo-700 transition">Canjear</button>
                                            )}
                                            {descuentoPuntosPuntosFisicos > 0 && (
                                                <button onClick={() => {setDescuentoPuntosPuntosFisicos(0); setDescuentoPuntosDinero(0);}} className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-black uppercase shadow-sm hover:bg-red-200 transition">Quitar</button>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-2 items-center mt-2">
                                        <div className="relative flex-1">
                                            <Tag size={14} className="absolute left-2.5 top-3 md:top-3.5 text-slate-400" />
                                            <input type="text" placeholder="Cupón de Descuento" value={cuponInput} onChange={(e) => { setCuponInput(e.target.value.toUpperCase()); setMsgCupon({texto:'', tipo:''}); }} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl py-2.5 md:py-3 pl-8 pr-3 text-xs md:text-sm font-bold outline-none uppercase focus:border-blue-500 transition-all" disabled={cuponActivo !== null || isSubmitting} />
                                        </div>
                                        {!cuponActivo ? (
                                            <button disabled={!cuponInput.trim() || isSubmitting} onClick={aplicarCupon} className="bg-slate-800 text-white px-4 md:px-5 py-2.5 md:py-3 rounded-xl font-bold text-[10px] md:text-xs uppercase hover:bg-slate-700 transition shadow-sm disabled:opacity-50">Aplicar</button>
                                        ) : (
                                            <button onClick={() => { setCuponActivo(null); setCuponInput(''); setMsgCupon({texto:'', tipo:''}); setDescuentoCuponDinero(0); }} className="bg-red-100 text-red-600 px-4 md:px-5 py-2.5 md:py-3 rounded-xl font-bold text-[10px] md:text-xs uppercase hover:bg-red-200 transition shadow-sm">Quitar</button>
                                        )}
                                    </div>
                                    {msgCupon.texto && <p className={`text-[10px] md:text-xs font-bold ${msgCupon.tipo === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>{msgCupon.texto}</p>}
                                </div>
                            </div>
                            
                            <CarritoDeOrden
                                carrito={carrito}
                                cambiarCantidadCart={cambiarCantidadCart}
                                quitarDelCarrito={quitarDelCarrito}
                                subtotal={subtotal}
                                descuento={descuentoCuponDinero}
                                cuponActivo={cuponActivo}
                                zonaEnvioCosto={zonaEnvioCosto}
                                yaPagado={yaPagado}
                                montoOriginal={montoOriginal}
                                diferencia={diferencia}
                                totalConEnvio={totalConEnvio}
                                isFormIncompleto={isFormIncompleto}
                                generarPedidoBD={generarPedidoBD}
                                isSubmitting={isSubmitting}
                                abrirModalCuentaAbierta={() => setModalCuentaAbierta(true)}
                                tipoConsumo={tipoConsumo} 
                                descuentoPuntosDinero={descuentoPuntosDinero}
                            />
                        </div>
                    </div>
                )}

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

                {/* MODAL SEGURIDAD DE PUNTOS CLONADO DEL KIOSCO */}
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