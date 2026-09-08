import React, { useState, useEffect } from 'react';
import { ShoppingBag, Users, Trash2, CheckCircle2, DollarSign, CreditCard, Truck, Store, XCircle, Plus, Minus, Smartphone, ArrowLeft, ArrowRight, AlertTriangle, User, Phone, Mail, MapPin, Clock, Copy, MessageCircle, Wallet } from 'lucide-react';
import TicketImpresionMayoreo from './TicketImpresionMayoreo'; 

const normalizarTexto = (texto) => {
    if (!texto) return '';
    return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const ModalCheckoutMayoreo = ({
    isOpen, onClose, onCloseAppTotal, carrito, subtotal, cambiarCantidad, quitarDelCarrito, vaciarCarritoMayoreo,
    clienteB2B, setClienteB2B, permiteCreditoOrden, clientes, apiUrl, showAlert, user
}) => {
    const [pasoCheckout, setPasoCheckout] = useState(1);
    const [confirmarCierre, setConfirmarCierre] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [configLocal, setConfigLocal] = useState(null);
    const [ticketGenerado, setTicketGenerado] = useState(null); 

    const [dropdownClientes, setDropdownClientes] = useState(false);
    const [tipoEntrega, setTipoEntrega] = useState('Local / Mostrador');
    const [costoEnvio, setCostoEnvio] = useState('');
    const [horarioRecoger, setHorarioRecoger] = useState('');
    
    const [nombreManual, setNombreManual] = useState('');
    const [telefonoManual, setTelefonoManual] = useState('');
    const [correoManual, setCorreoManual] = useState('');
    const [direccionManual, setDireccionManual] = useState('');

    const [guardarComoVerificado, setGuardarComoVerificado] = useState(false);
    const [esRepartoExterno, setEsRepartoExterno] = useState(false);
    const [costoRepartoExterno, setCostoRepartoExterno] = useState('');
    const [repartidores, setRepartidores] = useState([]);
    const [repartidorId, setRepartidorId] = useState('');

    // Restablecido a Efectivo por defecto para que el botón de cobrar no inicie bloqueado
    const [metodoPago, setMetodoPago] = useState('Efectivo');
    const [mostrarModalTransferencia, setMostrarModalTransferencia] = useState(false);

    const [montoEfectivo, setMontoEfectivo] = useState('');
    const [montoTarjeta, setMontoTarjeta] = useState('');
    const [montoTransferencia, setMontoTransferencia] = useState('');
    const [toastCopiado, setToastCopiado] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetch(`${apiUrl}/configuracion`)
                .then(res => res.json())
                .then(data => setConfigLocal(data))
                .catch(err => console.error("Error cargando config local:", err));

            fetch(`${apiUrl}/usuarios`)
                .then(res => res.json())
                .then(data => {
                    const reps = data.filter(u => u.rol === 'repartidor');
                    setRepartidores(reps);
                })
                .catch(err => console.error(err));
        } else {
            setPasoCheckout(1);
            setConfirmarCierre(false);
            setTicketGenerado(null);
            setNombreManual('');
            setGuardarComoVerificado(false);
            setEsRepartoExterno(false);
            setCostoRepartoExterno('');
            setRepartidorId('');
            setMetodoPago('Efectivo');
            setMostrarModalTransferencia(false);
        }
    }, [isOpen, apiUrl]);

    useEffect(() => {
        let timer;
        if (ticketGenerado) {
            timer = setTimeout(() => {
                setTicketGenerado(null);
                if (onCloseAppTotal) {
                    onCloseAppTotal(); 
                } else {
                    onClose(); 
                }
            }, 3000); 
        }
        return () => clearTimeout(timer); 
    }, [ticketGenerado, onCloseAppTotal, onClose]);

    if (!isOpen) return null;

    const tarifasEnvio = typeof configLocal?.tarifas_envio === 'string' ? JSON.parse(configLocal.tarifas_envio || '[]') : (configLocal?.tarifas_envio || []);

    const totalFinal = subtotal + (tipoEntrega === 'Envío a Domicilio' ? Number(costoEnvio || 0) : 0);
    const totalIngresadoMixto = Number(montoEfectivo || 0) + Number(montoTarjeta || 0) + Number(montoTransferencia || 0);
    const restanteMixto = (totalFinal - totalIngresadoMixto).toFixed(2);

    const term = normalizarTexto(nombreManual);
    const terminos = term.trim() ? term.split(/\s+/) : [];

    const clientesFiltrados = term.length >= 2 ? clientes.filter(cli => {
        const nomSearch = normalizarTexto(`${cli.empresa} ${cli.nombre_contacto}`);
        const telSearch = normalizarTexto(cli.telefono);
        return terminos.every(t => nomSearch.includes(t) || telSearch.includes(t));
    }) : [];

    const logisticaOk = () => {
        if (carrito.length === 0) return false;
        if (tipoEntrega === 'Local / Mostrador') {
            if (!clienteB2B && !nombreManual.trim()) return false;
        } else if (tipoEntrega === 'Pasar a Recoger') {
            if (!clienteB2B && (!nombreManual.trim() || !telefonoManual.trim())) return false;
            if (!horarioRecoger.trim()) return false;
        } else if (tipoEntrega === 'Envío a Domicilio') {
            if (!clienteB2B && (!nombreManual.trim() || !telefonoManual.trim())) return false;
            if (!clienteB2B?.direccion && !direccionManual.trim()) return false;
            if (costoEnvio === '') return false;
            if (esRepartoExterno && (costoRepartoExterno === '' || Number(costoRepartoExterno) < 0)) return false;
        }
        return true;
    };

    const isLogisticaOk = logisticaOk();

    const isValidParaCobrar = () => {
        if (!isLogisticaOk) return false;
        if (!metodoPago) return false;
        if (metodoPago === 'Mixto' && Number(restanteMixto) !== 0) return false;
        return true;
    };

    const getEstadoSegunLogistica = () => {
        if (tipoEntrega === 'Envío a Domicilio') return 'Listo'; 
        if (tipoEntrega === 'Pasar a Recoger') return 'Listo'; 
        return 'Entregado'; 
    };

    const handleCopiarDatos = (e) => {
        e.preventDefault();
        const texto = `Banco: ${configLocal?.banco || ''}\nCuenta/CLABE: ${configLocal?.cuenta || ''}\nTitular: ${configLocal?.titular || ''}\nTotal a transferir: $${totalFinal.toFixed(2)}`;
        navigator.clipboard.writeText(texto).then(() => {
            setToastCopiado(true);
            setTimeout(() => setToastCopiado(false), 2500);
        });
    };

    const handleWhatsApp = (e) => {
        e.preventDefault();
        const numWA = clienteB2B ? clienteB2B.telefono : telefonoManual;
        const cleanPhone = String(numWA || '').replace(/\D/g, '');
        if (cleanPhone.length >= 10) {
            const texto = `Hola, te comparto los datos para el pago por transferencia de tu orden de mayoreo por un total de *$${totalFinal.toFixed(2)}*:\n\n🏦 *Banco:* ${configLocal?.banco || ''}\n💳 *Cuenta/CLABE:* ${configLocal?.cuenta || ''}\n👤 *Titular:* ${configLocal?.titular || ''}\n\nPor favor, compárteme tu comprobante de pago por este medio. ¡Gracias!`;
            const url = `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(texto)}`;
            window.open(url, '_blank');
        }
    };

    const procesarVenta = async (metodoFinal, estadoFinal) => {
        setIsSubmitting(true);
        let stringDireccion = '';
        if (tipoEntrega === 'Envío a Domicilio') {
            stringDireccion = direccionManual || clienteB2B?.direccion || 'Pendiente de dirección';
        } else if (tipoEntrega === 'Pasar a Recoger') {
            stringDireccion = `PASA A RECOGER A LAS: ${horarioRecoger}`;
        } else {
            stringDireccion = 'Local / Mostrador';
        }

        const nombreFinal = clienteB2B ? clienteB2B.empresa : nombreManual.trim();
        const telefonoFinal = clienteB2B ? clienteB2B.telefono : telefonoManual.trim();

        let pagos_mixtos = null;
        if (metodoFinal === 'Mixto') {
            pagos_mixtos = [];
            if (Number(montoEfectivo) > 0) pagos_mixtos.push({ metodo: 'Efectivo', monto: Number(montoEfectivo) });
            if (Number(montoTarjeta) > 0) pagos_mixtos.push({ metodo: 'Tarjeta', monto: Number(montoTarjeta) });
            if (Number(montoTransferencia) > 0) pagos_mixtos.push({ metodo: 'Transferencia', monto: Number(montoTransferencia) });
        }

        const paquete = {
            cajero_id: user?.id || null,
            cliente_id: clienteB2B?.id || null,
            cliente_nombre: nombreFinal,
            cliente_telefono: telefonoFinal,
            correo_cliente: clienteB2B?.correo || correoManual || null,
            guardar_como_verificado: guardarComoVerificado, 
            tipo_consumo: tipoEntrega === 'Envío a Domicilio' ? 'Domicilio' : tipoEntrega === 'Pasar a Recoger' ? 'Recoger' : 'Local',
            metodo_pago: metodoFinal === 'Crédito' ? 'Por Cobrar' : metodoFinal,
            total: totalFinal,
            costo_envio: tipoEntrega === 'Envío a Domicilio' ? Number(costoEnvio) : 0,
            repartidor_id: (!esRepartoExterno && tipoEntrega === 'Envío a Domicilio' && repartidorId) ? Number(repartidorId) : null,
            es_reparto_externo: tipoEntrega === 'Envío a Domicilio' ? esRepartoExterno : false,
            costo_reparto_externo: (tipoEntrega === 'Envío a Domicilio' && esRepartoExterno) ? Number(costoRepartoExterno) : 0,
            origen: 'Distribución B2B',
            direccion_entrega: stringDireccion,
            estado_preparacion: estadoFinal, 
            pagos_mixtos: pagos_mixtos,
            carrito: carrito.map(item => ({
                id: `B2B_${item.articulo_id}`,
                nombre: `[B2B] ${item.nombre}`,
                cantidad: item.cantidad,
                precioFinal: item.precio_unitario,
                extras: [{ nombre: `Regla Aplicada: ${item.nivel_aplicado}`, precioExtra: 0 }]
            }))
        };

        try {
            const res = await fetch(`${apiUrl}/distribucion/ventas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paquete)
            });

            if (res.ok) {
                const ventaGuardada = await res.json();
                
                setTicketGenerado(ventaGuardada);
                vaciarCarritoMayoreo();
                
                // Reseteos
                setTipoEntrega('Local / Mostrador');
                setMetodoPago('Efectivo');
                setMostrarModalTransferencia(false);
                setNombreManual(''); setTelefonoManual(''); setCorreoManual(''); setDireccionManual(''); setHorarioRecoger(''); setCostoEnvio('');
                setMontoEfectivo(''); setMontoTarjeta(''); setMontoTransferencia('');

                setIsSubmitting(false);
                return;
            } else {
                const errorData = await res.json().catch(()=>({}));
                showAlert('Error', errorData.error || 'No se pudo registrar la venta.', 'error');
            }
        } catch (error) {
            showAlert('Error', 'Fallo de conexión al servidor.', 'error');
        }
        setIsSubmitting(false);
    };

    if (ticketGenerado) {
        return (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-[32px] p-6 shadow-2xl max-h-[80vh] overflow-y-auto custom-scrollbar flex flex-col items-center">
                    <TicketImpresionMayoreo 
                        ticketImprimir={ticketGenerado} 
                        configGlobal={configLocal} 
                        apiUrl={apiUrl} 
                    />
                </div>
                
                <button 
                    onClick={() => {
                        setTicketGenerado(null);
                        if (onCloseAppTotal) {
                            onCloseAppTotal();
                        } else {
                            onClose();
                        }
                    }} 
                    className="mt-6 bg-white text-slate-800 px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-slate-100 transition active:scale-95 flex items-center gap-2"
                >
                    <CheckCircle2 size={24}/> Cerrar y Finalizar Venta
                </button>
            </div>
        );
    }

    const esServicioLocal = tipoEntrega === 'Local / Mostrador';

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-5xl rounded-[32px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 relative isolate">
                    
                    {toastCopiado && (
                        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl animate-in slide-in-from-top-4 flex items-center gap-2 z-[350]">
                            <CheckCircle2 size={16} className="text-emerald-400"/> Datos copiados
                        </div>
                    )}

                    {/* CABECERA */}
                    <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 text-indigo-600 p-2.5 md:p-3 rounded-2xl shadow-inner">
                                {pasoCheckout === 1 ? <ShoppingBag size={24}/> : <CreditCard size={24}/>}
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-none">
                                    {pasoCheckout === 1 ? 'Revisar Carrito' : 'Logística y Cobro'}
                                </h2>
                                <p className="text-[10px] md:text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Paso {pasoCheckout} de 2</p>
                            </div>
                        </div>
                        <button onClick={() => setConfirmarCierre(true)} className="bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 p-2 md:p-3 rounded-full transition shadow-sm border border-slate-100"><XCircle size={24}/></button>
                    </div>

                    {/* CUERPO CENTRAL */}
                    <div className="flex flex-col flex-1 min-h-0 bg-slate-50 relative">
                        {pasoCheckout === 1 && (
                            <div className="flex-1 overflow-y-auto custom-scrollbar animate-in slide-in-from-left">
                                <div className="p-4 md:p-6 space-y-3">
                                    {carrito.map(item => (
                                        <div key={item.idTicket} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-slate-800 text-base md:text-lg leading-tight mb-1 break-words">{item.nombre}</p>
                                                <p className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-1 border border-indigo-100">
                                                    Aplica Precio: {item.nivel_aplicado}
                                                </p>
                                                <p className="text-xs font-bold text-slate-400">Precio Unitario: ${item.precio_unitario.toFixed(2)}</p>
                                            </div>
                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 shadow-inner h-10">
                                                    <button onClick={() => cambiarCantidad(item.idTicket, -1)} className="w-8 h-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-red-500 rounded-lg font-bold transition shadow-sm"><Minus size={16}/></button>
                                                    <span className="w-8 text-center font-black text-base text-slate-700">{item.cantidad}</span>
                                                    <button onClick={() => cambiarCantidad(item.idTicket, 1)} className="w-8 h-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-indigo-600 rounded-lg font-bold transition shadow-sm"><Plus size={16}/></button>
                                                </div>
                                                <div className="text-right w-20">
                                                    <p className="font-black text-xl text-slate-800 leading-none">${item.precio_total.toFixed(2)}</p>
                                                </div>
                                                <button onClick={() => {
                                                    quitarDelCarrito(item.idTicket);
                                                    if (carrito.length === 1) onClose();
                                                }} className="p-2 text-slate-300 hover:bg-red-50 rounded-xl hover:text-red-500 transition">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {pasoCheckout === 2 && (
                            <div className="flex-1 overflow-y-auto custom-scrollbar animate-in slide-in-from-right">
                                <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto w-full pb-10">
                                    
                                    {/* 👇 BLOQUE 1: ASIGNAR CLIENTE / INVITADO */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">1. Asignar Cliente o Ingresar Invitado</label>
                                        
                                        {clienteB2B ? (
                                            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex justify-between items-center animate-in zoom-in-95 shadow-sm">
                                                <div>
                                                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Cliente Asignado</p>
                                                    <p className="text-lg font-black text-indigo-900 leading-tight">{clienteB2B.empresa}</p>
                                                    <p className="text-xs font-bold text-indigo-600/80 mt-0.5">{clienteB2B.nombre_contacto} • {clienteB2B.telefono}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {clienteB2B.tiene_credito && (
                                                        <span className="text-[9px] font-black text-blue-600 bg-white px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1 uppercase tracking-widest shadow-sm">
                                                            <CreditCard size={10}/> Crédito Aprobado
                                                        </span>
                                                    )}
                                                    <button onClick={() => setClienteB2B(null)} className="text-indigo-500 hover:text-red-500 hover:bg-white bg-indigo-100/50 p-1.5 px-3 rounded-lg transition flex items-center gap-1 text-[10px] font-bold">
                                                        <XCircle size={12}/> Cambiar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative z-20">
                                                <div className="relative md:col-span-2 lg:col-span-3">
                                                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Nombre de empresa, cliente o invitado..."
                                                        value={nombreManual}
                                                        onChange={e => { setNombreManual(e.target.value); setDropdownClientes(true); }}
                                                        onFocus={() => setDropdownClientes(true)}
                                                        onBlur={() => setTimeout(() => setDropdownClientes(false), 200)}
                                                        className={`w-full bg-slate-50 border ${!nombreManual.trim() && (!esServicioLocal || !clienteB2B) ? 'border-red-200 focus:border-red-400 placeholder-red-300' : 'border-slate-200 focus:border-indigo-500'} rounded-lg py-2.5 pl-8 pr-3 text-xs font-bold outline-none`}
                                                    />
                                                    
                                                    {dropdownClientes && nombreManual.length >= 2 && (
                                                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2">
                                                            {clientesFiltrados.length > 0 ? (
                                                                clientesFiltrados.map(cli => (
                                                                    <button
                                                                        key={cli.id}
                                                                        onMouseDown={(e) => { 
                                                                            e.preventDefault(); 
                                                                            setClienteB2B(cli); 
                                                                            setNombreManual(''); 
                                                                            setDropdownClientes(false); 
                                                                    }}
                                                                        className="w-full text-left px-5 py-3 border-b border-slate-50 hover:bg-indigo-50 transition"
                                                                    >
                                                                        <p className="font-black text-slate-800 text-sm">{cli.empresa}</p>
                                                                        <p className="font-bold text-slate-500 text-[10px] uppercase tracking-widest mt-0.5">{cli.nombre_contacto} • {cli.telefono}</p>
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="p-4 text-center text-slate-500 font-bold text-xs">Sin coincidencias en catálogo. Se registrará como invitado.</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="relative md:col-span-1 lg:col-span-1">
                                                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input type="tel" maxLength="10" placeholder="Teléfono" value={telefonoManual} onChange={e => setTelefonoManual(e.target.value.replace(/\D/g, ''))} className={`w-full bg-slate-50 border ${(!esServicioLocal && !telefonoManual.trim()) ? 'border-red-200 focus:border-red-400 placeholder-red-300' : 'border-slate-200 focus:border-indigo-500'} rounded-lg py-2.5 pl-8 pr-3 text-xs font-bold outline-none`} />
                                                </div>
                                                <div className="relative md:col-span-1 lg:col-span-2">
                                                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input type="email" placeholder="Correo (Opcional)" value={correoManual} onChange={e => setCorreoManual(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-8 pr-3 text-xs font-bold outline-none focus:border-indigo-500" />
                                                </div>
                                                
                                                {/* Checkbox Auto-Registro B2B */}
                                                <div className="md:col-span-2 lg:col-span-3 pt-2 border-t border-slate-50 mt-1">
                                                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                                                        <input type="checkbox" className="w-4 h-4 accent-indigo-600" checked={guardarComoVerificado} onChange={e => setGuardarComoVerificado(e.target.checked)} />
                                                        <span className="text-xs font-bold text-slate-600">Guardar como cliente frecuente en el directorio B2B</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* BLOQUE 2: LOGÍSTICA Y ENTREGA */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">2. Logística y Entrega</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                                            {[
                                                { id: 'Local / Mostrador', icon: <Store size={18}/> },
                                                { id: 'Pasar a Recoger', icon: <ShoppingBag size={18}/> },
                                                { id: 'Envío a Domicilio', icon: <Truck size={18}/> }
                                            ].map(tipo => (
                                                <button key={tipo.id} onClick={() => { setTipoEntrega(tipo.id); setCostoEnvio(''); setHorarioRecoger(''); }} className={`p-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition flex flex-col items-center gap-2 ${tipoEntrega === tipo.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>
                                                    {tipo.icon} <span className="text-center leading-tight">{tipo.id}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="animate-in slide-in-from-top-2">
                                            {tipoEntrega === 'Pasar a Recoger' && (
                                                <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-center gap-3 shadow-sm w-full md:w-1/2">
                                                    <Clock size={16} className="text-orange-500 shrink-0"/>
                                                    <div className="flex-1">
                                                        <label className="text-[9px] font-black uppercase text-orange-600 block mb-0.5">Horario en que pasará *</label>
                                                        <input type="time" required value={horarioRecoger} onChange={e=>setHorarioRecoger(e.target.value)} className="w-full bg-white border border-orange-200 rounded-lg p-2 font-black text-orange-900 outline-none focus:border-orange-500 text-xs" />
                                                    </div>
                                                </div>
                                            )}

                                            {tipoEntrega === 'Envío a Domicilio' && (
                                                <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3 shadow-sm">
                                                    {!clienteB2B?.direccion && (
                                                        <div className="md:col-span-2 relative">
                                                            <MapPin size={16} className="absolute left-3 top-2.5 text-purple-400" />
                                                            <textarea placeholder="Dirección Completa (Obligatorio) *" value={direccionManual} onChange={e=>setDireccionManual(e.target.value)} className={`w-full bg-white border rounded-lg p-2 pl-9 text-xs font-bold outline-none h-14 resize-none ${!direccionManual.trim() ? 'border-red-200 focus:border-red-400' : 'border-purple-200 focus:border-purple-500'}`} />
                                                        </div>
                                                    )}
                                                    {clienteB2B?.direccion && (
                                                        <div className="md:col-span-2 bg-white p-2.5 rounded-lg border border-purple-100 text-xs font-bold text-slate-600 flex items-start gap-2">
                                                            <MapPin size={14} className="text-purple-500 shrink-0 mt-0.5"/>
                                                            <span>{clienteB2B.direccion}</span>
                                                        </div>
                                                    )}
                                                    <div className="md:col-span-2">
                                                        <label className="text-[9px] font-black uppercase text-purple-600 block mb-0.5">Costo y Zona de Envío *</label>
                                                        <select value={costoEnvio} onChange={e=>setCostoEnvio(e.target.value)} className={`w-full bg-white border rounded-lg p-2.5 text-xs font-bold outline-none cursor-pointer ${costoEnvio === '' ? 'border-red-200 focus:border-red-400 text-red-500' : 'border-purple-200 focus:border-purple-500 text-purple-800'}`}>
                                                            <option value="">-- Selecciona la Zona --</option>
                                                            {tarifasEnvio.map((t, i) => (
                                                                <option key={i} value={t.costo}>{t.zona} (+${t.costo})</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* LOGÍSTICA DE REPARTIDORES INTERNO/EXTERNO */}
                                                    <div className="md:col-span-2 pt-4 border-t border-purple-200 mt-2">
                                                        <label className="flex items-center gap-2 cursor-pointer mb-3 w-fit">
                                                            <input type="checkbox" className="w-4 h-4 accent-purple-600" checked={esRepartoExterno} onChange={e => setEsRepartoExterno(e.target.checked)} />
                                                            <span className="text-[10px] md:text-xs font-black text-purple-800 uppercase tracking-widest">Es reparto externo (Uber / Didi / Moto)</span>
                                                        </label>
                                                        
                                                        {esRepartoExterno ? (
                                                            <div className="bg-white border border-purple-200 p-3 rounded-xl flex items-center gap-3 shadow-inner">
                                                                <Truck size={18} className="text-purple-400 shrink-0" />
                                                                <div className="flex-1">
                                                                    <label className="text-[9px] font-black uppercase text-purple-500 block mb-1">Costo pagado al repartidor (Sale de Caja) *</label>
                                                                    <input type="number" step="any" min="0" required value={costoRepartoExterno} onChange={e => setCostoRepartoExterno(e.target.value)} className={`w-full bg-slate-50 border ${costoRepartoExterno === '' ? 'border-red-200 focus:border-red-400' : 'border-purple-100 focus:border-purple-500'} rounded-lg p-2 font-black text-purple-900 outline-none text-xs`} placeholder="$0.00" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white border border-purple-200 p-3 rounded-xl flex items-center gap-3 shadow-inner">
                                                                <User size={18} className="text-purple-400 shrink-0" />
                                                                <div className="flex-1">
                                                                    <label className="text-[9px] font-black uppercase text-purple-500 block mb-1">Repartidor Interno (Opcional)</label>
                                                                    <select value={repartidorId} onChange={e => setRepartidorId(e.target.value)} className="w-full bg-slate-50 border border-purple-100 rounded-lg p-2 font-black text-purple-900 outline-none focus:border-purple-500 text-xs cursor-pointer">
                                                                        <option value="">-- Sin Asignar (Lo tomará en su App) --</option>
                                                                        {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 👇 BLOQUE 3: MÉTODO DE COBRO PROTEGIDO */}
                                    <div className={`transition-opacity duration-300 ${!isLogisticaOk ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                                            <span>3. Seleccionar Método de Cobro</span>
                                            {!isLogisticaOk && <span className="text-[9px] text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">Llena los datos arriba</span>}
                                        </label>
                                        
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                            <button onClick={() => setMetodoPago('Efectivo')} className={`p-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition flex flex-col items-center justify-center gap-1.5 ${metodoPago === 'Efectivo' ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'}`}>
                                                <DollarSign size={20}/> Efectivo
                                            </button>
                                            <button onClick={() => setMetodoPago('Tarjeta')} className={`p-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition flex flex-col items-center justify-center gap-1.5 ${metodoPago === 'Tarjeta' ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                                                <CreditCard size={20}/> Tarjeta
                                            </button>
                                            <button onClick={() => {
                                                setMetodoPago('Transferencia');
                                                setMostrarModalTransferencia(true);
                                            }} className={`p-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition flex flex-col items-center justify-center gap-1.5 ${metodoPago === 'Transferencia' ? 'bg-purple-500 text-white border-purple-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300'}`}>
                                                <Smartphone size={20}/> Transf.
                                            </button>
                                            <button onClick={() => setMetodoPago('Mixto')} className={`p-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition flex flex-col items-center justify-center gap-1.5 ${metodoPago === 'Mixto' ? 'bg-pink-500 text-white border-pink-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-pink-300'}`}>
                                                <Wallet size={20}/> Mixto
                                            </button>
                                            
                                            {/* CRÉDITO CONDICIONAL */}
                                            {clienteB2B && clienteB2B.tiene_credito ? (
                                                <button disabled={!permiteCreditoOrden} onClick={() => setMetodoPago('Crédito')} className={`p-3 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition flex flex-col items-center justify-center gap-1.5 col-span-2 sm:col-span-1 ${!permiteCreditoOrden ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-70' : metodoPago === 'Crédito' ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-orange-300'}`}>
                                                    <Wallet size={20}/> A Crédito
                                                </button>
                                            ) : (
                                                <div className="p-3 rounded-xl border-2 border-slate-200 bg-slate-50 border-dashed flex flex-col items-center justify-center gap-1 opacity-50 col-span-2 sm:col-span-1">
                                                    <Users size={16} className="text-slate-400" />
                                                    <span className="text-[8px] font-black uppercase text-slate-400 text-center">Crédito<br/>No Disp.</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* DESGLOSE PAGO MIXTO */}
                                        {metodoPago === 'Mixto' && (
                                            <div className="mt-3 p-4 bg-white rounded-xl border border-pink-200 shadow-sm animate-in slide-in-from-top-2">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Desglose (Total: ${totalFinal.toFixed(2)})</p>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1"><DollarSign size={12}/> Efectivo</label>
                                                        <input type="number" min="0" step="0.5" value={montoEfectivo} onChange={e => setMontoEfectivo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-center font-black outline-none focus:border-emerald-500 text-slate-700 text-sm" placeholder="$0" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1"><CreditCard size={12}/> Tarjeta</label>
                                                        <input type="number" min="0" step="0.5" value={montoTarjeta} onChange={e => setMontoTarjeta(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-center font-black outline-none focus:border-blue-500 text-slate-700 text-sm" placeholder="$0" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1"><Smartphone size={12}/> Transferencia</label>
                                                        <input type="number" min="0" step="0.5" value={montoTransferencia} onChange={e => setMontoTransferencia(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-center font-black outline-none focus:border-purple-500 text-slate-700 text-sm" placeholder="$0" />
                                                    </div>
                                                </div>
                                                <div className={`mt-3 p-2 rounded-lg text-center border-2 transition-all ${Number(restanteMixto) === 0 ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5">Diferencia</p>
                                                    <p className="text-lg font-black">${restanteMixto}</p>
                                                    {Number(restanteMixto) !== 0 && <p className="text-[8px] font-bold mt-0.5 uppercase text-red-500">La suma debe igualar el total</p>}
                                                </div>

                                                {/* INTERFAZ TRANSFERENCIA (SÓLO MIXTO AQUÍ) */}
                                                {configLocal && Number(montoTransferencia) > 0 && (
                                                    <div className="mt-3 p-3 rounded-xl border border-purple-100 bg-purple-50/50 flex flex-col md:flex-row justify-between items-center gap-3 animate-in slide-in-from-top-2">
                                                        <div className="flex-1 text-[10px] md:text-xs">
                                                            <p className="font-bold text-slate-500 mb-0.5">🏦 Banco: <strong className="text-slate-800">{configLocal.banco || 'N/A'}</strong></p>
                                                            <p className="font-bold text-slate-500 mb-0.5">💳 CLABE: <strong className="text-slate-800">{configLocal.cuenta || 'N/A'}</strong></p>
                                                            <p className="font-bold text-slate-500">👤 Titular: <strong className="text-slate-800">{configLocal.titular || 'N/A'}</strong></p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={handleCopiarDatos} className="bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 p-2 rounded-lg font-bold flex justify-center items-center gap-1.5 transition shadow-sm text-xs"><Copy size={14} /> Copiar</button>
                                                            {String(clienteB2B?.telefono || telefonoManual || '').replace(/\D/g, '').length >= 10 && (
                                                                <button onClick={handleWhatsApp} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg font-bold flex justify-center items-center gap-1.5 transition shadow-sm text-xs"><MessageCircle size={14} /> WhatsApp</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {!permiteCreditoOrden && clienteB2B?.tiene_credito && metodoPago === 'Crédito' && (
                                            <div className="bg-red-50 p-3 rounded-xl mt-3 flex items-start gap-2 border border-red-100 animate-in fade-in">
                                                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5"/>
                                                <p className="text-[9px] md:text-[10px] font-bold text-red-800 uppercase tracking-widest leading-snug">Atención: Hay artículos en el carrito que no aplican para crédito. La orden deberá pagarse de contado.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 👇 PIE DE PÁGINA REFACTORIZADO CON DOBLE BOTÓN */}
                    <div className="p-4 md:p-6 bg-white shrink-0 flex items-center justify-between z-10 border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
                        <div>
                            {pasoCheckout === 1 ? (
                                <button onClick={onClose} className="px-5 py-3 bg-slate-100 text-slate-600 font-black rounded-xl transition hover:bg-slate-200 flex items-center gap-2 active:scale-95 text-sm">
                                    <ArrowLeft size={18}/> Seguir Comprando
                                </button>
                            ) : (
                                <button onClick={() => setPasoCheckout(1)} className="px-5 py-3 bg-slate-100 text-slate-600 font-black rounded-xl transition hover:bg-slate-200 flex items-center gap-2 active:scale-95 text-sm">
                                    <ArrowLeft size={18}/> Atrás
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4 md:gap-6">
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                                    {pasoCheckout === 1 ? 'Total Orden' : 'Cobro Final'}
                                </p>
                                <p className="text-2xl font-black text-slate-800 leading-none">${(pasoCheckout === 1 ? subtotal : totalFinal).toFixed(2)}</p>
                            </div>
                            {pasoCheckout === 1 ? (
                                <button onClick={() => setPasoCheckout(2)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3 rounded-xl text-sm md:text-base shadow-md shadow-indigo-500/30 transition active:scale-95 flex items-center justify-center gap-2">
                                    Proceder al Cobro <ArrowRight size={20}/>
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    {esServicioLocal ? (
                                        <>
                                            <button
                                                disabled={isSubmitting || !isLogisticaOk}
                                                onClick={() => procesarVenta('Por Cobrar', getEstadoSegunLogistica())}
                                                className="bg-orange-100 hover:bg-orange-200 text-orange-700 font-black px-4 md:px-6 py-3 rounded-xl text-sm md:text-base border-2 border-orange-200 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Clock size={20}/> <span className="hidden md:inline">Dejar Pendiente</span>
                                            </button>
                                            <button
                                                disabled={isSubmitting || !isValidParaCobrar()}
                                                onClick={() => {
                                                    if (metodoPago === 'Transferencia') setMostrarModalTransferencia(true); 
                                                    else procesarVenta(metodoPago, getEstadoSegunLogistica());
                                                }}
                                                className="bg-emerald-500 hover:bg-emerald-400 text-white font-black px-4 md:px-6 py-3 rounded-xl text-sm md:text-base shadow-md shadow-emerald-500/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle2 size={20}/> {isSubmitting ? 'Procesando...' : 'Cobrar Ahora'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                disabled={isSubmitting || !isValidParaCobrar()}
                                                onClick={() => {
                                                    if (metodoPago === 'Transferencia') setMostrarModalTransferencia(true); 
                                                    else procesarVenta(metodoPago, getEstadoSegunLogistica());
                                                }}
                                                className="bg-amber-100 hover:bg-amber-200 text-amber-700 font-black px-4 md:px-6 py-3 rounded-xl text-sm md:text-base border-2 border-amber-200 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle2 size={20}/> <span className="hidden md:inline">Cobrar Ahora</span>
                                            </button>
                                            <button
                                                disabled={isSubmitting || !isLogisticaOk}
                                                onClick={() => procesarVenta('Por Cobrar', getEstadoSegunLogistica())}
                                                className="bg-emerald-500 hover:bg-emerald-400 text-white font-black px-4 md:px-6 py-3 rounded-xl text-sm md:text-base shadow-md shadow-emerald-500/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Clock size={20}/> Dejar Pendiente
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* MODAL DE CONFIRMACIÓN DE CANCELACIÓN */}
                {confirmarCierre && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white p-8 md:p-10 rounded-[40px] max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 border border-slate-100">
                            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <AlertTriangle size={40} />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-3 tracking-tight">¿Cancelar Venta?</h3>
                            <p className="text-slate-500 font-bold mb-8 text-sm md:text-base">Si cierras esta ventana, se perderá todo el progreso y los artículos que ya agregaste al carrito.</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => {
                                    setConfirmarCierre(false);
                                    vaciarCarritoMayoreo();
                                    onClose();
                                }} className="w-full py-4 bg-red-500 text-white font-black text-lg rounded-2xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition active:scale-95 flex items-center justify-center gap-2">
                                    <Trash2 size={20}/> Sí, cancelar todo
                                </button>
                                <button onClick={() => setConfirmarCierre(false)} className="w-full py-4 bg-slate-100 text-slate-600 font-black text-lg rounded-2xl hover:bg-slate-200 transition active:scale-95 border border-slate-200">
                                    No, continuar comprando
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 👇 MODAL SUPERPUESTO DE TRANSFERENCIA (AHORA FLOTANTE Y FUERA DEL CONTENEDOR PRINCIPAL) */}
            {mostrarModalTransferencia && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] max-w-lg w-full shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-slate-100">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-100 text-purple-600 p-3 rounded-2xl">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-none">Transferencia</h2>
                                    <p className="text-[10px] md:text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Validación de Pago</p>
                                </div>
                            </div>
                            <button onClick={() => { setMostrarModalTransferencia(false); setMetodoPago('Efectivo'); }} className="bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 p-3 rounded-full transition shadow-sm border border-slate-100"><XCircle size={24}/></button>
                        </div>

                        <div className="p-6 md:p-8 bg-slate-50 flex flex-col items-center justify-center text-center">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total a Cobrar</p>
                            <p className="text-5xl md:text-6xl font-black text-[#1a3b30] mb-8">${totalFinal.toFixed(2)}</p>

                            <div className="w-full bg-purple-50 border border-purple-200 p-6 rounded-3xl text-left relative overflow-hidden shadow-inner mb-8">
                                <Smartphone size={100} className="absolute right-0 top-0 opacity-10 text-purple-900 pointer-events-none"/>
                                <h3 className="text-xl font-black text-purple-900 mb-4 flex items-center gap-2 relative z-10"><Smartphone size={24}/> Datos para Transferencia</h3>
                                <div className="space-y-3 relative z-10">
                                    <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm flex justify-between items-center"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Banco</span><span className="text-sm font-black text-slate-700">{configLocal?.banco || 'N/A'}</span></div>
                                    <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm flex justify-between items-center"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cuenta / CLABE</span><span className="text-sm font-black text-slate-700">{configLocal?.cuenta || 'N/A'}</span></div>
                                    <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm flex justify-between items-center"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Titular</span><span className="text-sm font-black text-slate-700 line-clamp-1 text-right ml-4">{configLocal?.titular || 'N/A'}</span></div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 mt-6 relative z-10">
                                    <button onClick={handleCopiarDatos} className="flex-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition active:scale-95 shadow-sm"><Copy size={18}/> Copiar Datos</button>
                                    <button onClick={handleWhatsApp} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/20"><MessageCircle size={18}/> Enviar WhatsApp</button>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full">
                                <button onClick={() => { setMostrarModalTransferencia(false); setMetodoPago('Efectivo'); }} className="flex-1 py-4 bg-white text-slate-600 border border-slate-200 font-black rounded-2xl hover:bg-slate-100 transition active:scale-95 flex items-center justify-center gap-2"><ArrowLeft size={20}/> Atrás</button>
                                <button disabled={isSubmitting} onClick={() => procesarVenta('Transferencia', getEstadoSegunLogistica())} className="flex-[2] py-4 bg-purple-500 text-white font-black text-lg rounded-2xl hover:bg-purple-600 shadow-lg shadow-purple-500/30 transition active:scale-95 flex items-center justify-center gap-2"><CheckCircle2 size={24}/> {isSubmitting ? 'Procesando...' : 'Pago Validado'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ModalCheckoutMayoreo;