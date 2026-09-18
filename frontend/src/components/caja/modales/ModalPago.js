import React, { useState, useEffect } from 'react';
import { 
    DollarSign, CreditCard, Smartphone, Wallet, Star, Copy, MessageCircle, 
    ArrowLeft, XCircle, CheckCircle2, AlertTriangle, FileText
} from 'lucide-react';

const ModalPago = ({
    modalPago,
    setModalPago,
    procesarPago,
    isSubmitting,
    configGlobal,
    setModalEditarPedido,
    apiUrl,
    productos,
    clasificaciones
}) => {
    // ----------------------------------------------------
    // ESTADOS GENERALES DE COBRO
    // ----------------------------------------------------
    const [montoRecibido, setMontoRecibido] = useState('');
    const [confirmarAnular, setConfirmarAnular] = useState(false);
    const [toastCopiado, setToastCopiado] = useState(false);
    const [idOrdenAbierta, setIdOrdenAbierta] = useState(null); // Rastreador de orden
    
    // Pago Mixto
    const [modoMixto, setModoMixto] = useState(false);
    const [montoEfectivoMixto, setMontoEfectivoMixto] = useState('');
    const [montoTarjetaMixto, setMontoTarjetaMixto] = useState('');
    const [montoTransferenciaMixto, setMontoTransferenciaMixto] = useState('');

    // ----------------------------------------------------
    // NUEVOS ESTADOS: PUNTOS DE LEALTAD Y SEGURIDAD
    // ----------------------------------------------------
    const [puntosAUsar, setPuntosAUsar] = useState('');
    const [saldoPuntos, setSaldoPuntos] = useState(0);
    const [subtotalCanjeable, setSubtotalCanjeable] = useState(0);
    const [itemsCanjeables, setItemsCanjeables] = useState([]);
    const [itemsNoCanjeables, setItemsNoCanjeables] = useState([]);
    const [nombreClienteReal, setNombreClienteReal] = useState('');
    
    const [nipCliente, setNipCliente] = useState('');
    const [validandoNip, setValidandoNip] = useState(false);
    const [puntosAplicados, setPuntosAplicados] = useState(0);
    const [errorNip, setErrorNip] = useState('');

    // ----------------------------------------------------
    // LIMPIEZA DE ESTADOS EN MEMORIA (AL CERRAR O CAMBIAR DE ORDEN)
    // ----------------------------------------------------
    useEffect(() => {
        if (!modalPago) {
            setModoMixto(false);
            setPuntosAUsar('');
            setNipCliente('');
            setErrorNip('');
            setMontoEfectivoMixto('');
            setMontoTarjetaMixto('');
            setMontoTransferenciaMixto('');
            setMontoRecibido('');
            setConfirmarAnular(false);
            setPuntosAplicados(0);
            setIdOrdenAbierta(null);
        } else if (modalPago.id !== idOrdenAbierta) {
            setModoMixto(false);
            setPuntosAUsar('');
            setNipCliente('');
            setErrorNip('');
            setMontoEfectivoMixto('');
            setMontoTarjetaMixto('');
            setMontoTransferenciaMixto('');
            setMontoRecibido('');
            setConfirmarAnular(false);
            setPuntosAplicados(0);
            setIdOrdenAbierta(modalPago.id);
        }
    }, [modalPago, idOrdenAbierta]);

    // ----------------------------------------------------
    // UTILIDADES INTELIGENTES DE DATOS
    // ----------------------------------------------------
    const valorPeso = configGlobal?.puntos_valor_peso || 1;

    // Limpieza estricta del nombre
    let nombreOrdenExtraido = modalPago?.cliente_nombre || 'Invitado';
    if (nombreOrdenExtraido.toUpperCase().includes('A NOMBRE DE:')) {
        nombreOrdenExtraido = nombreOrdenExtraido.replace(/(A NOMBRE DE:\s*)+/gi, '').trim();
    } else if (nombreOrdenExtraido === 'Invitado' && modalPago?.direccion_entrega) {
        const match = modalPago.direccion_entrega.match(/A NOMBRE DE:\s*([^|]+)/i);
        if (match && match[1]) nombreOrdenExtraido = match[1].trim();
    }
    
    if (nombreOrdenExtraido.includes('|')) {
        nombreOrdenExtraido = nombreOrdenExtraido.split('|')[0].trim();
    }

    let rawPhone = modalPago?.cliente_telefono || '';
    if (!rawPhone && modalPago?.direccion_entrega) {
        const telMatch = modalPago.direccion_entrega.match(/(?:TEL|CONTACTO):\s*(\d+)/i);
        if (telMatch && telMatch[1]) {
            rawPhone = telMatch[1];
        }
    }
    const cleanPhone = String(rawPhone).replace(/\D/g, '');
    const hasValidPhone = cleanPhone.length >= 10;

    // ----------------------------------------------------
    // EFECTOS Y VALIDACIONES INICIALES
    // ----------------------------------------------------
    useEffect(() => {
        if (!modalPago) return;

        const calcularCanje = () => {
            const carritoActual = typeof modalPago.carrito === 'string' ? JSON.parse(modalPago.carrito) : (modalPago.carrito || []);
            let totalCanj = 0;
            const canj = [];
            const noCanj = [];

            carritoActual.forEach((item) => {
                const pId = item.producto_id || item.id;
                const itemNombreLimpio = String(item.nombre).replace(/\[.*?\]\s*/, '').trim().toLowerCase();

                const prodDB = (productos || []).find(p => 
                    (pId && String(p.id) === String(pId)) || 
                    String(p.nombre).trim().toLowerCase() === itemNombreLimpio
                );

                const catNombre = prodDB?.categoria || item.categoria;
                const catDB = (clasificaciones || []).find(c => String(c.nombre).trim().toLowerCase() === String(catNombre).trim().toLowerCase());

                const catPermite = catDB ? (catDB.permite_canje !== false && String(catDB.permite_canje) !== 'false' && catDB.permite_canje !== 0) : true;
                
                let prodPermite = true;
                if (prodDB) {
                    prodPermite = (prodDB.permite_canje !== false && String(prodDB.permite_canje) !== 'false' && prodDB.permite_canje !== 0);
                }

                if (!catPermite || !prodPermite) {
                    noCanj.push(item);
                } else {
                    const itemPrecio = Number(item.precioFinal || item.precio_base || item.precio || 0);
                    totalCanj += (itemPrecio * (Number(item.cantidad) || 1));
                    canj.push(item);
                }
            });

            setSubtotalCanjeable(totalCanj);
            setItemsCanjeables(canj);
            setItemsNoCanjeables(noCanj);
        };

        if (productos && clasificaciones) {
            calcularCanje();
        }

        if (apiUrl) {
            const fetchClienteReal = async () => {
                try {
                    const res = await fetch(`${apiUrl}/clientes`);
                    if (res.ok) {
                        const clientes = await res.json();
                        let clienteBD = null;

                        if (modalPago.cliente_id) {
                            clienteBD = clientes.find(c => String(c.id) === String(modalPago.cliente_id));
                        }
                        if (!clienteBD && cleanPhone && cleanPhone.length >= 10) {
                            clienteBD = clientes.find(c => String(c.telefono).replace(/\D/g, '') === cleanPhone);
                        }

                        if (clienteBD) {
                            setSaldoPuntos(Number(clienteBD.puntos) || 0);
                            setNombreClienteReal(`${clienteBD.nombre || ''} ${clienteBD.apellido || ''}`.trim());
                            modalPago.cliente_id = clienteBD.id; 
                        } else {
                            setSaldoPuntos(0);
                            setNombreClienteReal('');
                        }
                    }
                } catch (e) {
                    console.error("Error obteniendo cliente real desde caja:", e);
                }
            };
            fetchClienteReal();
        }
    }, [modalPago, apiUrl, cleanPhone, productos, clasificaciones]);

    if (!modalPago) return null;

    const noSePuedeAnular = modalPago.estado_preparacion === 'Entregado' || modalPago.estado_preparacion === 'En Camino' || modalPago.estado_preparacion === 'Liquidado' || modalPago.estado_preparacion === 'Finalizado';

    // ----------------------------------------------------
    // CÁLCULOS DINÁMICOS EN MEMORIA
    // ----------------------------------------------------
    const saldoFisicoEnPesos = saldoPuntos * valorPeso;
    const cuotaMaximaPesos = Math.min(saldoFisicoEnPesos, subtotalCanjeable);
    
    const descuentoActivo = (puntosAplicados * valorPeso);
    const totalConDescuento = Math.max(0, Number(modalPago.total) - descuentoActivo);
    const totalFinalVisible = totalConDescuento.toFixed(2);
    
    const limiteAbsolutoPuntos = parseFloat((cuotaMaximaPesos / valorPeso).toFixed(2));
    const esImposibleCanjear = subtotalCanjeable <= 0; 

    // ----------------------------------------------------
    // FUNCIONES OPERATIVAS
    // ----------------------------------------------------
    const cerrarModalPago = () => {
        setModalPago(null);
    };

    const handleCopiarDatos = () => {
        const texto = `Banco: ${configGlobal?.banco || ''}\nCuenta/CLABE: ${configGlobal?.cuenta || ''}\nTitular: ${configGlobal?.titular || ''}\nTotal a transferir: $${totalFinalVisible}`;
        navigator.clipboard.writeText(texto).then(() => {
            setToastCopiado(true);
            setTimeout(() => setToastCopiado(false), 2500);
        });
    };

    const handleWhatsApp = () => {
        if (hasValidPhone) {
            const nombreMostrar = nombreClienteReal || nombreOrdenExtraido;
            const texto = `Hola ${nombreMostrar}, te comparto los datos para el pago por transferencia de tu orden #${modalPago.numero_pedido} por un total de *$${totalFinalVisible}*:\n\n🏦 *Banco:* ${configGlobal?.banco || ''}\n💳 *Cuenta/CLABE:* ${configGlobal?.cuenta || ''}\n👤 *Titular:* ${configGlobal?.titular || ''}\n\nPor favor, compárteme tu comprobante de pago por este medio. ¡Gracias!`;
            const url = `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(texto)}`;
            window.open(url, '_blank');
        }
    };

    const calcularRestanteMixto = () => {
        const efe = Number(montoEfectivoMixto) || 0;
        const tar = Number(montoTarjetaMixto) || 0;
        const tra = Number(montoTransferenciaMixto) || 0;
        return (totalConDescuento - (efe + tar + tra)).toFixed(2);
    };

    const procesarCobroMixto = () => {
        const efe = Number(montoEfectivoMixto) || 0;
        const tar = Number(montoTarjetaMixto) || 0;
        const tra = Number(montoTransferenciaMixto) || 0;
        const pagosMix = [];
        if (efe > 0) pagosMix.push({ metodo: 'Efectivo', monto: efe });
        if (tar > 0) pagosMix.push({ metodo: 'Tarjeta', monto: tar });
        if (tra > 0) pagosMix.push({ metodo: 'Transferencia', monto: tra });

        procesar_Pago_Local('Pagado', false, pagosMix);
    };

    const procesar_Pago_Local = (estadoRechazo = null, esPostPago = false, pagosMixtos = null, puntosOverride = null) => {
        const ordenYaCocinada = !['Pendiente', 'Por Confirmar'].includes(modalPago.estado_preparacion);
        const ordenBloqueadaExplicitamente = modalPago._evitarImpresion === true;
        const yaFueImpreso = ordenBloqueadaExplicitamente || ordenYaCocinada;  
        
        if (yaFueImpreso) modalPago._evitarImpresion = true;  
        
        const puntosFinales = puntosOverride !== null ? puntosOverride : puntosAplicados;

        // 👇 LÓGICA INTELIGENTE (ACTUALIZADA Y PERFECCIONADA)
        let estadoFinal = estadoRechazo;
        
        // Si la acción NO es una cancelación/rechazo (es un pago normal o mixto)
        if (!estadoRechazo || estadoRechazo === 'Pagado') {
            const estadoActual = modalPago.estado_preparacion;

            // 1. Si está en Entregas (Listo) y se cobra en ventanilla -> Se entrega y finaliza automáticamente.
            if (estadoActual === 'Listo') {
                estadoFinal = 'Finalizado'; 
            } 
            // 2. Si es una mesa de comedor (Entregado) y paga al irse -> Finalizado.
            else if (estadoActual === 'Entregado' || estadoActual === 'Liquidado') {
                estadoFinal = 'Finalizado';
            } 
            // 3. Si se cobra MIENTRAS está en cocina o en la moto -> Conserva su estado operativo.
            else if (['Preparando', 'En Camino'].includes(estadoActual)) {
                estadoFinal = estadoActual;
            } 
            // 4. Si se cobra en "Cuentas por Cobrar" antes de entrar a cocina -> Pagado (Pasa a la cola del KDS).
            else {
                estadoFinal = 'Pagado'; 
            }
        }

        procesarPago(estadoFinal, esPostPago, pagosMixtos, puntosFinales);
    };  

    // ----------------------------------------------------
    // FLUJO BLINDADO DE PUNTOS Y NIP
    // ----------------------------------------------------
    const validarYAplicarPuntos = async () => {
        if (!nipCliente || nipCliente.length !== 4) {
            return setErrorNip('Ingresa el NIP de 4 dígitos del cliente.');
        }

        setValidandoNip(true);
        setErrorNip('');
        try {
            const res = await fetch(`${apiUrl}/clientes/verificar-nip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cliente_id: modalPago.cliente_id, nip: nipCliente })
            });

            if (res.ok) {
                const cobroEnPesos = Number(puntosAUsar) * valorPeso;
                const restante = Number(modalPago.total) - cobroEnPesos;

                if (restante > 0) {
                    setPuntosAplicados(Number(puntosAUsar));
                    setModalPago({ ...modalPago, metodo_pago: 'Pendiente' });
                } else {
                    procesar_Pago_Local(null, false, null, Number(puntosAUsar));
                }
            } else {
                setErrorNip('NIP Incorrecto. Inténtalo de nuevo.');
            }
        } catch (e) {
            setErrorNip('Error de red al validar NIP.');
        }
        setValidandoNip(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-in fade-in duration-200">
            <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-2xl animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto relative custom-scrollbar">
                
                {confirmarAnular && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[160] rounded-[40px] flex items-center justify-center p-8 animate-in fade-in">
                        <div className="text-center w-full max-w-sm">
                            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle size={48} />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 mb-2">¿Anular Pedido?</h3>
                            <p className="text-slate-500 font-bold mb-8">Esta acción rechazará y cancelará la orden permanentemente.</p>
                            <div className="flex flex-col gap-3">
                                <button disabled={isSubmitting} onClick={() => procesar_Pago_Local('Cancelado')} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition shadow-lg shadow-red-500/30 disabled:opacity-50">Sí, Anular Pedido</button>
                                <button disabled={isSubmitting} onClick={() => setConfirmarAnular(false)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition disabled:opacity-50">Conservar Pedido</button>
                            </div>
                        </div>
                    </div>
                )}

                {toastCopiado && (
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full text-sm font-black tracking-widest shadow-xl animate-in slide-in-from-top-4 flex items-center gap-2 z-[160]">
                        <CheckCircle2 size={16} className="text-emerald-400" /> Datos copiados
                    </div>
                )}

                <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100 pr-4">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Orden #{modalPago.numero_pedido}</h2>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 border border-orange-100 text-orange-600 font-black text-xs md:text-sm rounded-xl uppercase tracking-widest">
                            <FileText size={16} /> {modalPago.estado_preparacion}
                        </span>
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-6 rounded-[24px] mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total a Cobrar</p>
                        <p className="text-5xl md:text-6xl font-black text-[#1a3b30] tracking-tight">${totalFinalVisible}</p>
                        
                        {puntosAplicados > 0 && (
                            <p className="text-xs font-bold text-amber-600 mt-2 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 animate-in zoom-in-95">
                                <Star size={12} className="fill-amber-600"/> - ${descuentoActivo.toFixed(2)} pagados con Puntos
                            </p>
                        )}
                    </div>
                    <div className="text-left md:text-right">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                        <p className="text-sm md:text-base font-black text-slate-700 uppercase">
                            A NOMBRE DE: {nombreOrdenExtraido}
                            {hasValidPhone && <span className="text-slate-500 font-bold ml-1">| TEL: {cleanPhone}</span>}
                        </p>
                        
                        {nombreClienteReal && nombreClienteReal.trim().toLowerCase() !== nombreOrdenExtraido.trim().toLowerCase() && (
                            <p className="text-xs font-bold text-amber-600 mt-1 flex items-center md:justify-end gap-1">
                                <Star size={12} className="fill-amber-500" /> Cuenta: {nombreClienteReal}
                            </p>
                        )}
                    </div>
                </div>

                {modoMixto ? (
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <p className="font-black text-slate-400 uppercase tracking-widest text-sm mb-4 text-center">Desglose de Pago Mixto:</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><DollarSign size={14} /> Efectivo</label>
                                <input type="number" min="0" step="0.5" value={montoEfectivoMixto} onChange={e => setMontoEfectivoMixto(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl p-4 text-center text-xl font-black outline-none focus:border-emerald-500 text-slate-800" placeholder="$0" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><CreditCard size={14} /> Tarjeta</label>
                                <input type="number" min="0" step="0.5" value={montoTarjetaMixto} onChange={e => setMontoTarjetaMixto(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl p-4 text-center text-xl font-black outline-none focus:border-blue-500 text-slate-800" placeholder="$0" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Smartphone size={14} /> Transferencia</label>
                                <input type="number" min="0" step="0.5" value={montoTransferenciaMixto} onChange={e => setMontoTransferenciaMixto(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl p-4 text-center text-xl font-black outline-none focus:border-purple-500 text-slate-800" placeholder="$0" />
                            </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl text-center">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Restante a Cubrir</p>
                            <p className={`text-4xl font-black tracking-tight ${Number(calcularRestanteMixto()) === 0 ? 'text-emerald-500' : Number(calcularRestanteMixto()) < 0 ? 'text-amber-500' : 'text-slate-700'}`}>
                                ${calcularRestanteMixto()}
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setModoMixto(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar Mixto</button>
                            <button disabled={Number(calcularRestanteMixto()) > 0 || isSubmitting} onClick={procesarCobroMixto} className="flex-1 py-4 bg-[#1a3b30] text-white font-black rounded-2xl hover:bg-[#112a21] transition disabled:opacity-50 flex items-center justify-center gap-2">
                                <CheckCircle2 size={20} /> Cobrar Partes
                            </button>
                        </div>
                    </div>
                ) : modalPago.metodo_pago === 'Pendiente' || modalPago.metodo_pago === 'Por Cobrar' ? (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <button onClick={() => setModalPago({ ...modalPago, metodo_pago: 'Efectivo' })} className="bg-white border border-slate-200 hover:border-emerald-500 rounded-[20px] p-6 flex flex-col items-center justify-center gap-3 transition-all shadow-sm group">
                                <div className="bg-emerald-50 text-emerald-600 w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><DollarSign size={28}/></div>
                                <span className="font-black text-slate-800 tracking-wide text-sm md:text-base">Efectivo</span>
                            </button>
                            
                            <button onClick={() => setModalPago({ ...modalPago, metodo_pago: 'Tarjeta' })} className="bg-white border border-slate-200 hover:border-orange-500 rounded-[20px] p-6 flex flex-col items-center justify-center gap-3 transition-all shadow-sm group">
                                <div className="bg-orange-50 text-orange-600 w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><CreditCard size={28}/></div>
                                <span className="font-black text-slate-800 tracking-wide text-sm md:text-base">Tarjeta</span>
                            </button>
                            
                            <button onClick={() => setModalPago({ ...modalPago, metodo_pago: 'Transferencia' })} className="bg-white border border-slate-200 hover:border-purple-500 rounded-[20px] p-6 flex flex-col items-center justify-center gap-3 transition-all shadow-sm group">
                                <div className="bg-purple-50 text-purple-600 w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Smartphone size={28}/></div>
                                <span className="font-black text-slate-800 tracking-wide text-sm md:text-base">Transferencia</span>
                            </button>
                            
                            <button onClick={() => setModoMixto(true)} className="bg-white border border-slate-200 hover:border-blue-500 rounded-[20px] p-6 flex flex-col items-center justify-center gap-3 transition-all shadow-sm group">
                                <div className="bg-blue-50 text-blue-600 w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Wallet size={28}/></div>
                                <span className="font-black text-slate-800 tracking-wide text-sm md:text-base">Pago Mixto</span>
                            </button>
                        </div>
                        
                        {puntosAplicados === 0 && !esImposibleCanjear && (
                            <button 
                                onClick={() => setModalPago({ ...modalPago, metodo_pago: 'Puntos' })} 
                                className="w-full py-5 rounded-[20px] border-2 border-amber-300 bg-white text-amber-700 hover:bg-amber-50 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm mb-6"
                            >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-100">
                                    <Star size={18} className="fill-amber-500 text-amber-500" />
                                </div>
                                <span className="font-black text-lg">Pagar con Puntos {saldoPuntos > 0 ? `(${saldoPuntos} pts)` : ''}</span>
                            </button>
                        )}

                        <div className="flex gap-4">
                            <button disabled={isSubmitting} onClick={cerrarModalPago} className="flex-1 py-4 md:py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50 text-center text-sm md:text-base border border-slate-200">Dejar en Espera</button>
                            {!noSePuedeAnular && (
                                <button disabled={isSubmitting} onClick={() => setConfirmarAnular(true)} className="py-4 px-6 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition disabled:opacity-50 flex items-center justify-center shrink-0" title="Rechazar Pedido"><XCircle size={24} /></button>
                            )}
                        </div>
                    </div>
                ) : modalPago.metodo_pago === 'Efectivo' ? (
                    <div className="text-center space-y-6 animate-in slide-in-from-right">
                        
                        {/* 🌟 BOTONES DE CANTIDAD RÁPIDA 🌟 */}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Cantidades Rápidas</label>
                            
                            <button 
                                disabled={isSubmitting} 
                                onClick={() => setMontoRecibido(totalConDescuento)} 
                                className="w-full mb-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-100 py-3 md:py-4 rounded-2xl font-black transition active:scale-95 flex items-center justify-center gap-2 shadow-sm text-lg md:text-xl"
                            >
                                <CheckCircle2 size={24}/> Exacto (${totalFinalVisible})
                            </button>
                            
                            <div className="grid grid-cols-3 gap-2 md:gap-3">
                                {[100, 200, 300, 400, 500, 1000].map(monto => (
                                    <button
                                        key={monto}
                                        disabled={isSubmitting}
                                        onClick={() => setMontoRecibido(monto)}
                                        className="bg-white border-2 border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-black py-3 md:py-4 rounded-2xl transition active:scale-95 shadow-sm text-sm md:text-lg"
                                    >
                                        ${monto}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* SEPARADOR ESTÉTICO APPLE-STYLE */}
                        <div className="relative mt-4 mb-2">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">O Personalizada</span>
                            </div>
                        </div>

                        {/* INPUT MANUAL ORIGINAL */}
                        <div>
                            <input
                                autoFocus
                                type="number"
                                min="0"
                                step="0.5"
                                value={montoRecibido}
                                onChange={(e) => setMontoRecibido(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-3xl p-5 md:p-6 text-center text-4xl md:text-5xl font-black outline-none focus:border-emerald-500 text-slate-800 transition-colors shadow-inner tracking-tight"
                                placeholder="$0.00"
                            />
                        </div>

                        {montoRecibido && Number(montoRecibido) >= totalConDescuento && (
                            <div className="bg-emerald-50 border border-emerald-200 p-4 md:p-6 rounded-2xl text-center animate-in zoom-in-95">
                                <p className="text-xs md:text-sm font-black text-emerald-600 uppercase tracking-widest mb-1">Cambio a devolver</p>
                                <p className="text-4xl md:text-5xl font-black text-emerald-500 tracking-tight">${(Number(montoRecibido) - totalConDescuento).toFixed(2)}</p>
                            </div>
                        )}
                        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100">
                            <button disabled={isSubmitting} onClick={() => setModalPago({ ...modalPago, metodo_pago: 'Pendiente' })} className="py-4 md:py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50 text-center w-full md:w-auto flex items-center justify-center gap-2">
                                <ArrowLeft size={20} /> Atrás
                            </button>
                            <div className="flex gap-3 w-full">
                                {!noSePuedeAnular && (
                                    <button disabled={isSubmitting} onClick={() => setConfirmarAnular(true)} className="w-16 py-4 md:py-5 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition disabled:opacity-50 flex items-center justify-center shrink-0" title="Rechazar y Borrar Pedido">
                                        <XCircle size={24} />
                                    </button>
                                )}
                                <button disabled={!montoRecibido || Number(montoRecibido) < totalConDescuento || isSubmitting} onClick={() => procesar_Pago_Local()} className="flex-1 py-4 md:py-5 bg-emerald-400 text-white font-black text-lg md:text-xl rounded-2xl disabled:opacity-50 hover:bg-emerald-500 shadow-lg transition flex items-center justify-center gap-2">
                                    <CheckCircle2 size={24} /> {isSubmitting ? 'Procesando...' : 'Cobrar'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : modalPago.metodo_pago === 'Tarjeta' ? (
                    <div className="text-center space-y-5 animate-in slide-in-from-right">
                        <div className="bg-slate-100 border border-slate-200 p-8 rounded-[32px] text-blue-800">
                            <CreditCard size={64} className="mx-auto mb-4 opacity-50 text-blue-500" />
                            <p className="font-bold text-lg text-blue-800">Pídele al cliente que inserte o deslice su tarjeta en la terminal.</p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100">
                            <button disabled={isSubmitting} onClick={() => setModalPago({ ...modalPago, metodo_pago: 'Pendiente' })} className="py-4 md:py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50 text-center w-full md:w-auto flex items-center justify-center gap-2">
                                <ArrowLeft size={20} /> Atrás
                            </button>
                            <div className="flex gap-3 w-full">
                                {!noSePuedeAnular && (
                                    <button disabled={isSubmitting} onClick={() => setConfirmarAnular(true)} className="w-16 py-4 md:py-5 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition disabled:opacity-50 flex items-center justify-center shrink-0" title="Rechazar y Borrar Pedido">
                                        <XCircle size={24} />
                                    </button>
                                )}
                                <button disabled={isSubmitting} onClick={() => procesar_Pago_Local()} className="flex-1 py-4 md:py-5 bg-[#1a3b30] text-white font-black text-lg md:text-xl rounded-2xl disabled:opacity-50 hover:bg-[#112a21] shadow-lg transition flex items-center justify-center gap-2">
                                    <CheckCircle2 size={24} /> {isSubmitting ? 'Procesando...' : 'Cobro Aprobado'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : modalPago.metodo_pago === 'Transferencia' ? (
                    <div className="text-center space-y-5 animate-in slide-in-from-right">
                        <div className="bg-[#f8f5ff] border border-[#eaddff] p-6 md:p-8 rounded-[32px] text-left relative overflow-hidden shadow-sm">
                            <h3 className="text-xl md:text-2xl font-black text-[#492584] mb-5 flex items-center gap-2 relative z-10">
                                <Smartphone size={24} className="text-[#6b21a8]" /> Datos para Transferencia
                            </h3>
                            <div className="space-y-3 mb-6 relative z-10">
                                <div className="bg-white p-3.5 rounded-xl border border-[#eaddff] shadow-sm flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Banco</span>
                                    <span className="text-sm font-black text-slate-800">{configGlobal?.banco || 'No configurado'}</span>
                                </div>
                                <div className="bg-white p-3.5 rounded-xl border border-[#eaddff] shadow-sm flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cuenta / CLABE</span>
                                    <span className="text-sm font-black text-slate-800">{configGlobal?.cuenta || 'No configurada'}</span>
                                </div>
                                <div className="bg-white p-3.5 rounded-xl border border-[#eaddff] shadow-sm flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Titular</span>
                                    <span className="text-sm font-black text-slate-800 line-clamp-1 text-right ml-4">{configGlobal?.titular || 'No configurado'}</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                                <button onClick={handleCopiarDatos} className="flex-1 bg-white hover:bg-purple-50 text-[#6b21a8] border border-[#eaddff] py-3.5 rounded-xl font-black flex justify-center items-center gap-2 transition shadow-sm text-sm">
                                    <Copy size={18} /> Copiar Datos
                                </button>
                                {hasValidPhone && (
                                    <button onClick={handleWhatsApp} className="flex-1 bg-[#10b981] hover:bg-[#059669] text-white py-3.5 rounded-xl font-black flex justify-center items-center gap-2 transition shadow-md text-sm">
                                        <MessageCircle size={18} /> Enviar WhatsApp
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100">
                            <button disabled={isSubmitting} onClick={() => setModalPago({ ...modalPago, metodo_pago: 'Pendiente' })} className="py-4 md:py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50 text-center w-full md:w-auto flex items-center justify-center gap-2">
                                <ArrowLeft size={20} /> Atrás
                            </button>
                            <div className="flex gap-3 w-full">
                                {!noSePuedeAnular && (
                                    <button disabled={isSubmitting} onClick={() => setConfirmarAnular(true)} className="w-16 py-4 md:py-5 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition disabled:opacity-50 flex items-center justify-center shrink-0" title="Rechazar y Borrar Pedido">
                                        <XCircle size={24} />
                                    </button>
                                )}
                                <button disabled={isSubmitting} onClick={() => procesar_Pago_Local()} className="flex-1 py-4 md:py-5 bg-[#a855f7] text-white font-black text-lg md:text-xl rounded-2xl disabled:opacity-50 hover:bg-[#9333ea] shadow-lg transition flex items-center justify-center gap-2">
                                    <CheckCircle2 size={24} /> {isSubmitting ? 'Procesando...' : 'Pago Validado'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : modalPago.metodo_pago === 'Puntos' && !esImposibleCanjear ? (
                    <div className="text-center space-y-6 animate-in slide-in-from-right">
                        <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl shadow-inner text-left">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-amber-100 p-3 rounded-full text-amber-500"><Star size={24} className="fill-amber-500" /></div>
                                <h3 className="text-2xl font-black text-amber-900 tracking-tight">Canje de Puntos</h3>
                            </div>
                            
                            <div className="bg-white rounded-2xl p-4 mb-5 border border-amber-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo del Cliente</p>
                                    <p className="text-2xl font-black text-amber-600 leading-none">{saldoPuntos} pts</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Equivalente</p>
                                    <p className="text-xl font-bold text-slate-600 leading-none">${saldoFisicoEnPesos.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resumen de Platillos para Puntos</p>
                                
                                {itemsCanjeables.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1 flex items-center gap-1"><CheckCircle2 size={12}/> Sí aplican para canje:</p>
                                        <ul className="text-sm font-medium text-slate-700 list-disc pl-4 space-y-0.5">
                                            {itemsCanjeables.map((it, i) => <li key={i}>{it.cantidad}x {it.nombre}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {itemsNoCanjeables.length > 0 && (
                                    <div className={itemsCanjeables.length > 0 ? "pt-3 border-t border-slate-100" : ""}>
                                        <p className="text-[10px] font-bold text-red-500 uppercase mb-1 flex items-center gap-1"><AlertTriangle size={12}/> No aplican (Bloqueados):</p>
                                        <ul className="text-sm font-medium text-slate-500 list-disc pl-4 opacity-80 space-y-0.5">
                                            {itemsNoCanjeables.map((it, i) => <li key={i}>{it.cantidad}x {it.nombre}</li>)}
                                        </ul>
                                    </div>
                                )}
                                
                                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">Límite a canjear hoy:</span>
                                    <span className="text-lg font-black text-slate-800">${cuotaMaximaPesos.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-black text-amber-700 uppercase tracking-widest mb-2 text-center">¿Puntos a canjear? (Máx: {limiteAbsolutoPuntos})</label>
                                <input
                                    type="number"
                                    min="0"
                                    max={limiteAbsolutoPuntos}
                                    value={puntosAUsar}
                                    onChange={(e) => {
                                        let val = Number(e.target.value);
                                        if (val > limiteAbsolutoPuntos) val = limiteAbsolutoPuntos;
                                        setPuntosAUsar(val === 0 ? '' : val);
                                    }}
                                    className="w-full bg-white border-2 border-amber-200 rounded-2xl p-4 text-center text-3xl font-black outline-none focus:border-amber-500 text-slate-800"
                                    placeholder="0"
                                />
                            </div>

                            {Number(puntosAUsar) > 0 && (
                                <div className="mt-6 animate-in zoom-in-95 pt-6 border-t border-amber-200/60">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 text-center">
                                        NIP de Seguridad (4 dígitos)
                                    </label>
                                    <input
                                        type="password"
                                        maxLength="4"
                                        value={nipCliente}
                                        onChange={(e) => setNipCliente(e.target.value.replace(/\D/g, ''))}
                                        placeholder="****"
                                        className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 text-center text-3xl font-black outline-none focus:border-amber-500 text-slate-800 tracking-[0.5em] shadow-inner"
                                    />
                                    {errorNip && <p className="text-red-500 text-xs font-bold mt-2 text-center">{errorNip}</p>}
                                </div>
                            )}

                            {Number(puntosAUsar) > 0 && nipCliente.length === 4 && (
                                <div className="bg-amber-100 rounded-2xl p-4 mt-6 animate-in zoom-in-95 text-center">
                                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Restante a Pagar</p>
                                    <p className="text-3xl font-black text-amber-800 tracking-tight">
                                        ${ (Number(modalPago.total) - (Number(puntosAUsar) * valorPeso)).toFixed(2) }
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100">
                            <button disabled={validandoNip || isSubmitting} onClick={() => setModalPago({ ...modalPago, metodo_pago: 'Pendiente' })} className="py-4 md:py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50 text-center w-full md:w-auto flex items-center justify-center gap-2">
                                <ArrowLeft size={20} /> Atrás
                            </button>
                            <div className="flex gap-3 w-full">
                                {!noSePuedeAnular && (
                                    <button disabled={validandoNip || isSubmitting} onClick={() => setConfirmarAnular(true)} className="w-16 py-4 md:py-5 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition disabled:opacity-50 flex items-center justify-center shrink-0" title="Rechazar y Borrar Pedido">
                                        <XCircle size={24} />
                                    </button>
                                )}
                                <button 
                                    disabled={validandoNip || !puntosAUsar || Number(puntosAUsar) <= 0 || Number(puntosAUsar) > limiteAbsolutoPuntos || nipCliente.length !== 4} 
                                    onClick={validarYAplicarPuntos} 
                                    className="flex-1 py-4 md:py-5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-black text-lg md:text-xl rounded-2xl disabled:opacity-50 shadow-lg transition flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={24} /> 
                                    {validandoNip ? 'Validando NIP...' : ((Number(modalPago.total) - (Number(puntosAUsar) * valorPeso)) > 0 ? 'Aplicar Puntos y Continuar' : 'Liquidar Total')}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                <button onClick={cerrarModalPago} className="hidden md:block absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 rounded-full transition">
                    <XCircle size={24} />
                </button>
            </div>
        </div>
    );
};

export default ModalPago;