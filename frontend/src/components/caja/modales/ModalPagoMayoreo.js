import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Smartphone, CheckCircle2, XCircle, Copy, MessageCircle, Wallet, AlertTriangle, Users } from 'lucide-react';
import TicketImpresionMayoreo from './PuntoDeVenta/distribucion/TicketImpresionMayoreo'; 

const ModalPagoMayoreo = ({
    modalPago,
    setModalPago,
    isSubmitting,
    setIsSubmitting,
    configGlobal,
    apiUrl,
    showAlert
}) => {
    const [montoEfectivo, setMontoEfectivo] = useState('');
    const [montoTarjeta, setMontoTarjeta] = useState('');
    const [montoTransferencia, setMontoTransferencia] = useState('');
    const [toastCopiado, setToastCopiado] = useState(false);
    const [confirmarAnular, setConfirmarAnular] = useState(false);
    const [ticketGenerado, setTicketGenerado] = useState(null);

    // Inicializamos el modal en Efectivo si no viene ya asignado a otro método
    useEffect(() => {
        if (modalPago && (!modalPago.metodo_pago || modalPago.metodo_pago === 'Pendiente' || modalPago.metodo_pago === 'Por Cobrar')) {
            setModalPago({ ...modalPago, metodo_pago: 'Efectivo' });
        }
    }, [modalPago, setModalPago]);

    // Cerramos todo después de 3 seg de ver el ticket
    useEffect(() => {
        let timer;
        if (ticketGenerado) {
            timer = setTimeout(() => {
                setTicketGenerado(null);
                setModalPago(null);
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [ticketGenerado, setModalPago]);

    if (!modalPago) return null;

    const totalCobrar = Number(modalPago.total || 0);
    const totalIngresadoMixto = Number(montoEfectivo || 0) + Number(montoTarjeta || 0) + Number(montoTransferencia || 0);
    const restanteMixto = (totalCobrar - totalIngresadoMixto).toFixed(2);

    const getCleanPhone = () => {
        let cleanPhone = '';
        if (modalPago.cliente_telefono) {
            cleanPhone = String(modalPago.cliente_telefono).replace(/\D/g, '');
        } else if (modalPago.direccion_entrega) {
            if (modalPago.direccion_entrega.includes('TEL:')) cleanPhone = modalPago.direccion_entrega.split('TEL:')[1].split('|')[0].replace(/\D/g, '');
            else if (modalPago.direccion_entrega.includes('CONTACTO:')) cleanPhone = modalPago.direccion_entrega.split('CONTACTO:')[1].split('|')[0].replace(/\D/g, '');
        }
        return cleanPhone;
    };
    const cleanPhone = getCleanPhone();
    const hasValidPhone = cleanPhone.length >= 10;

    const handleCopiarDatos = () => {
        const texto = `Banco: ${configGlobal?.banco || ''}\nCuenta/CLABE: ${configGlobal?.cuenta || ''}\nTitular: ${configGlobal?.titular || ''}\nTotal a transferir: $${totalCobrar.toFixed(2)}`;
        navigator.clipboard.writeText(texto).then(() => {
            setToastCopiado(true);
            setTimeout(() => setToastCopiado(false), 2500);
        });
    };

    const handleWhatsApp = () => {
        if (hasValidPhone) {
            const nombreCli = modalPago.cliente_nombre || 'Cliente B2B';
            const texto = `Hola ${nombreCli}, te comparto los datos para el pago por transferencia de tu orden de mayoreo por un total de *$${totalCobrar.toFixed(2)}*:\n\n🏦 *Banco:* ${configGlobal?.banco || ''}\n💳 *Cuenta/CLABE:* ${configGlobal?.cuenta || ''}\n👤 *Titular:* ${configGlobal?.titular || ''}\n\nPor favor, compárteme tu comprobante de pago por este medio. ¡Gracias!`;
            const url = `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(texto)}`;
            window.open(url, '_blank');
        }
    };

    const procesarPagoMayoreo = async (estadoFinal = 'Entregado') => {
        if (isSubmitting) return;

        let pagosMix = null;
        if (modalPago.metodo_pago === 'Mixto') {
            if (Number(restanteMixto) !== 0) return showAlert('Atención', 'La suma de montos debe igualar el total de la orden.', 'error');
            pagosMix = [];
            if (Number(montoEfectivo) > 0) pagosMix.push({ metodo: 'Efectivo', monto: Number(montoEfectivo) });
            if (Number(montoTarjeta) > 0) pagosMix.push({ metodo: 'Tarjeta', monto: Number(montoTarjeta) });
            if (Number(montoTransferencia) > 0) pagosMix.push({ metodo: 'Transferencia', monto: Number(montoTransferencia) });
        }

        const m_efectivo = modalPago.metodo_pago === 'Efectivo' ? totalCobrar : (modalPago.metodo_pago === 'Mixto' ? Number(montoEfectivo) : 0);
        const m_tarjeta = modalPago.metodo_pago === 'Tarjeta' ? totalCobrar : (modalPago.metodo_pago === 'Mixto' ? Number(montoTarjeta) : 0);
        const m_transf = modalPago.metodo_pago === 'Transferencia' ? totalCobrar : (modalPago.metodo_pago === 'Mixto' ? Number(montoTransferencia) : 0);
        
        // Si el método es 'Crédito', todos los montos de caja (efectivo, tarjeta, transf) se van en 0 para no alterar el corte.

        setIsSubmitting(true);
        try {
            const apiBase = apiUrl || (window.location.origin.includes('localhost') ? 'http://localhost:4000/api' : '/api');
            const res = await fetch(`${apiBase}/distribucion/ventas/${modalPago.id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado_preparacion: estadoFinal,
                    metodo_pago: modalPago.metodo_pago,
                    pagos_mixtos: pagosMix,
                    monto_efectivo: m_efectivo,
                    monto_tarjeta: m_tarjeta,
                    monto_transferencia: m_transf
                })
            });

            if (res.ok) {
                const ventaActualizada = await res.json();
                setTicketGenerado(ventaActualizada);
            } else {
                showAlert('Error', 'No se pudo registrar el pago de mayoreo.', 'error');
            }
        } catch (error) {
            showAlert('Error', 'Fallo de conexión.', 'error');
        }
        setIsSubmitting(false);
    };

    if (ticketGenerado) {
        return (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[400] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-[32px] p-6 shadow-2xl max-h-[80vh] overflow-y-auto custom-scrollbar flex flex-col items-center">
                    <TicketImpresionMayoreo 
                        ticketImprimir={ticketGenerado} 
                        configGlobal={configGlobal} 
                        apiUrl={apiUrl} 
                    />
                </div>
                
                <button 
                    onClick={() => {
                        setTicketGenerado(null);
                        setModalPago(null); 
                    }} 
                    className="mt-6 bg-white text-slate-800 px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-slate-100 transition active:scale-95 flex items-center gap-2"
                >
                    <CheckCircle2 size={24}/> Cerrar y Finalizar Venta
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[250] p-4 animate-in fade-in duration-200">
            <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-2xl border border-indigo-100 w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[95vh] overflow-y-auto custom-scrollbar relative">
                
                {toastCopiado && (
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl animate-in slide-in-from-top-4 flex items-center gap-2 z-[300]">
                        <CheckCircle2 size={16} className="text-emerald-400"/> Datos copiados
                    </div>
                )}

                {/* ENCABEZADO MODAL DE PAGO */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-2xl">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-black text-slate-800">Cobro Mayorista</h3>
                            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Orden #{modalPago.numero_pedido}</p>
                        </div>
                    </div>
                    <button disabled={isSubmitting} onClick={() => setModalPago(null)} className="text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-2 rounded-full transition-colors active:scale-95">
                        <XCircle size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
                    {/* TABS MÉTODO DE PAGO */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
                        <button disabled={isSubmitting} onClick={() => setModalPago({...modalPago, metodo_pago: 'Efectivo'})} className={`py-3 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 ${modalPago.metodo_pago === 'Efectivo' ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-emerald-50'}`}><DollarSign size={18}/> Efectivo</button>
                        <button disabled={isSubmitting} onClick={() => setModalPago({...modalPago, metodo_pago: 'Tarjeta'})} className={`py-3 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 ${modalPago.metodo_pago === 'Tarjeta' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-blue-50'}`}><CreditCard size={18}/> Tarjeta</button>
                        <button disabled={isSubmitting} onClick={() => setModalPago({...modalPago, metodo_pago: 'Transferencia'})} className={`py-3 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 ${modalPago.metodo_pago === 'Transferencia' ? 'bg-purple-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-purple-50'}`}><Smartphone size={18}/> Transf.</button>
                        <button disabled={isSubmitting} onClick={() => setModalPago({...modalPago, metodo_pago: 'Mixto'})} className={`py-3 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 ${modalPago.metodo_pago === 'Mixto' ? 'bg-pink-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-pink-50'}`}><Wallet size={18}/> Mixto</button>
                        <button disabled={isSubmitting} onClick={() => setModalPago({...modalPago, metodo_pago: 'Crédito'})} className={`py-3 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 ${modalPago.metodo_pago === 'Crédito' ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-orange-50'}`}><Users size={18}/> Crédito</button>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl text-center mb-6 border border-slate-100 shadow-inner">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Total Neto B2B</p>
                        <p className="text-5xl md:text-6xl font-black text-slate-900">${totalCobrar.toFixed(2)}</p>
                    </div>

                    {/* VISTA: EFECTIVO */}
                    {modalPago.metodo_pago === 'Efectivo' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div>
                                <label className="block text-sm font-black text-slate-400 uppercase mb-3">Monto Recibido Físico</label>
                                <input type="number" autoFocus disabled={isSubmitting} value={montoEfectivo} onChange={(e) => setMontoEfectivo(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl p-4 text-center text-3xl font-black outline-none focus:border-emerald-500 text-slate-800 disabled:opacity-50" placeholder="$0.00" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <button disabled={isSubmitting} onClick={() => setMontoEfectivo(totalCobrar)} className="bg-slate-100 hover:bg-emerald-100 text-slate-700 font-black py-3 rounded-xl transition text-base disabled:opacity-50">Exacto</button>
                                <button disabled={isSubmitting} onClick={() => setMontoEfectivo(200)} className="bg-slate-100 hover:bg-emerald-100 text-slate-700 font-black py-3 rounded-xl transition text-base disabled:opacity-50">$200</button>
                                <button disabled={isSubmitting} onClick={() => setMontoEfectivo(500)} className="bg-slate-100 hover:bg-emerald-100 text-slate-700 font-black py-3 rounded-xl transition text-base disabled:opacity-50">$500</button>
                                <button disabled={isSubmitting} onClick={() => setMontoEfectivo(1000)} className="bg-slate-100 hover:bg-emerald-100 text-slate-700 font-black py-3 rounded-xl transition text-base disabled:opacity-50">$1000</button>
                            </div>
                            {montoEfectivo && Number(montoEfectivo) >= totalCobrar && (
                                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
                                    <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Cambio a devolver</p>
                                    <p className="text-4xl font-black text-emerald-500">${(Number(montoEfectivo) - totalCobrar).toFixed(2)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* VISTA: TARJETA */}
                    {modalPago.metodo_pago === 'Tarjeta' && (
                        <div className="text-center space-y-5 animate-in fade-in py-6">
                            <div className="bg-slate-100 border border-slate-200 p-8 rounded-3xl text-blue-800">
                                <CreditCard size={64} className="mx-auto mb-4 opacity-50 text-blue-500" />
                                <p className="font-bold text-lg text-blue-800">Pídele al cliente mayorista que inserte o deslice su tarjeta en la terminal.</p>
                            </div>
                        </div>
                    )}

                    {/* VISTA: TRANSFERENCIA */}
                    {modalPago.metodo_pago === 'Transferencia' && (
                        <div className="text-center space-y-5 animate-in fade-in">
                            <div className="bg-purple-50 border border-purple-200 p-6 md:p-8 rounded-3xl text-left relative overflow-hidden shadow-inner">
                                <Smartphone size={100} className="absolute right-0 top-0 opacity-10 text-purple-900 pointer-events-none"/>
                                <h3 className="text-xl md:text-2xl font-black text-purple-900 mb-4 flex items-center gap-2 relative z-10"><Smartphone size={28}/> Datos para Transferencia</h3>
                                <div className="space-y-3 mb-6 relative z-10">
                                    <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm flex justify-between items-center"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Banco</span><span className="text-sm font-black text-slate-700">{configGlobal?.banco || 'N/A'}</span></div>
                                    <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm flex justify-between items-center"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cuenta / CLABE</span><span className="text-sm font-black text-slate-700">{configGlobal?.cuenta || 'N/A'}</span></div>
                                    <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm flex justify-between items-center"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Titular</span><span className="text-sm font-black text-slate-700">{configGlobal?.titular || 'N/A'}</span></div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                                    <button onClick={handleCopiarDatos} className="flex-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition shadow-sm"><Copy size={18}/> Copiar Datos</button>
                                    <button onClick={handleWhatsApp} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition shadow-lg"><MessageCircle size={18}/> Enviar WhatsApp</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VISTA: MIXTO */}
                    {modalPago.metodo_pago === 'Mixto' && (
                        <div className="space-y-4 animate-in fade-in">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center mb-2">Desglose (La suma debe igualar ${totalCobrar.toFixed(2)})</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><DollarSign size={12}/> Efectivo</label>
                                    <input type="number" min="0" value={montoEfectivo} onChange={e => setMontoEfectivo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-center font-black outline-none focus:border-pink-500 text-slate-700 text-lg" placeholder="$0.00" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><CreditCard size={12}/> Tarjeta</label>
                                    <input type="number" min="0" value={montoTarjeta} onChange={e => setMontoTarjeta(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-center font-black outline-none focus:border-pink-500 text-slate-700 text-lg" placeholder="$0.00" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Smartphone size={12}/> Transf.</label>
                                    <input type="number" min="0" value={montoTransferencia} onChange={e => setMontoTransferencia(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-center font-black outline-none focus:border-pink-500 text-slate-700 text-lg" placeholder="$0.00" />
                                </div>
                            </div>
                            <div className={`mt-3 p-3 rounded-xl text-center border-2 transition-all ${Number(restanteMixto) === 0 ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5">Diferencia</p>
                                <p className="text-2xl font-black">${restanteMixto}</p>
                            </div>
                        </div>
                    )}

                    {/* VISTA: CRÉDITO */}
                    {modalPago.metodo_pago === 'Crédito' && (
                        <div className="text-center space-y-5 animate-in fade-in py-6">
                            <div className="bg-orange-50 border border-orange-200 p-8 rounded-3xl text-orange-800 shadow-inner">
                                <Users size={64} className="mx-auto mb-4 opacity-50 text-orange-500" />
                                <p className="font-black text-xl md:text-2xl text-orange-900 mb-2">Pago a Línea de Crédito</p>
                                <p className="font-bold text-sm text-orange-800">
                                    Esta orden se marcará como entregada sin recibir dinero en caja. El monto de <strong>${totalCobrar.toFixed(2)}</strong> se cargará al estado de cuenta del cliente y se le notificará.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTONES FINALES DE COBRO */}
                <div className="flex flex-col md:flex-row gap-3 pt-6 border-t border-slate-100 shrink-0 mt-4">
                    <button disabled={isSubmitting} onClick={() => setConfirmarAnular(true)} className="w-full md:w-16 py-4 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition disabled:opacity-50 flex items-center justify-center shrink-0" title="Anular B2B">
                        <XCircle size={24}/>
                    </button>
                    
                    <button disabled={isSubmitting || (modalPago.metodo_pago === 'Efectivo' && (!montoEfectivo || Number(montoEfectivo) < totalCobrar))} onClick={() => procesarPagoMayoreo('Entregado')} className="flex-1 py-4 bg-emerald-500 text-white font-black text-lg md:text-xl rounded-2xl disabled:opacity-50 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2">
                        <CheckCircle2 size={24}/> {isSubmitting ? 'Procesando...' : (modalPago.metodo_pago === 'Crédito' ? 'Autorizar Crédito' : 'Cobrar Venta')}
                    </button>
                </div>

                {/* ALERTA ANULACIÓN */}
                {confirmarAnular && (
                    <div className="absolute inset-0 bg-white z-[300] p-6 flex flex-col items-center justify-center animate-in zoom-in-95 text-center">
                        <AlertTriangle size={64} className="text-red-500 mb-4 opacity-50" />
                        <h3 className="text-2xl font-black text-slate-800 mb-2">¿Anular esta Venta?</h3>
                        <p className="text-slate-500 font-medium mb-8">Esta venta de mayoreo se cancelará permanentemente en la base de datos B2B.</p>
                        <div className="flex gap-4 w-full">
                            <button onClick={() => setConfirmarAnular(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Atrás</button>
                            <button onClick={() => procesarPagoMayoreo('Cancelado')} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/30 hover:bg-red-600 transition">Sí, Anular</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModalPagoMayoreo;