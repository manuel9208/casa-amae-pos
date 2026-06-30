import React, { useState, useEffect } from 'react';
import { Wallet, Banknote, CreditCard, Smartphone, XCircle, CheckCircle2, ChefHat, Copy, MessageCircle, DollarSign } from 'lucide-react';

const ModalPago = ({ modalPago, setModalPago, procesarPago, isSubmitting, configGlobal }) => {
    const [montoRecibido, setMontoRecibido] = useState('');
    const [modoMixto, setModoMixto] = useState(false);
    
    // Estados para Pago Mixto
    const [montoEfectivoMixto, setMontoEfectivoMixto] = useState('');
    const [montoTarjetaMixto, setMontoTarjetaMixto] = useState('');
    const [montoTransferenciaMixto, setMontoTransferenciaMixto] = useState('');

    const [toastCopiado, setToastCopiado] = useState(false);

    // 👇 SOLUCIÓN: Limpieza automática de estados residuales al cerrar el modal
    useEffect(() => {
        if (!modalPago) {
            setMontoRecibido('');
            setModoMixto(false);
            setMontoEfectivoMixto('');
            setMontoTarjetaMixto('');
            setMontoTransferenciaMixto('');
            setToastCopiado(false);
        }
    }, [modalPago]);

    const calcularRestanteMixto = () => {
        const t = Number(modalPago?.total || 0);
        const e = Number(montoEfectivoMixto || 0);
        const tar = Number(montoTarjetaMixto || 0);
        const tra = Number(montoTransferenciaMixto || 0);
        return (t - (e + tar + tra)).toFixed(2);
    };

    const procesarCobroMixto = () => {
        const restante = Number(calcularRestanteMixto());
        if (restante !== 0) {
            alert(`Error: La suma de los pagos debe coincidir exactamente con el total ($${modalPago.total}). Diferencia actual: $${restante}`);
            return;
        }
        const pagosFormateados = [];
        if (Number(montoEfectivoMixto) > 0) pagosFormateados.push({ metodo: 'Efectivo', monto: Number(montoEfectivoMixto) });
        if (Number(montoTarjetaMixto) > 0) pagosFormateados.push({ metodo: 'Tarjeta', monto: Number(montoTarjetaMixto) });
        if (Number(montoTransferenciaMixto) > 0) pagosFormateados.push({ metodo: 'Transferencia', monto: Number(montoTransferenciaMixto) });
        procesarPago(null, false, pagosFormateados);
    };

    const getIconoPago = (metodo) => {
        if(metodo==='Tarjeta') return <CreditCard size={18}/>;
        if(metodo==='Transferencia') return <Smartphone size={18}/>;
        if(metodo==='Mixto') return <Wallet size={18}/>;
        return <Banknote size={18}/>;
    };

    const cerrarModalPago = () => {
        setModalPago(null);
        setMontoRecibido('');
        setModoMixto(false);
        setMontoEfectivoMixto(''); setMontoTarjetaMixto(''); setMontoTransferenciaMixto('');
    };

    const getCleanPhone = () => {
        let cleanPhone = String(modalPago?.cliente_telefono || modalPago?.cliente?.telefono || modalPago?.telefono || '').replace(/\D/g, '');
        if (!cleanPhone && typeof modalPago?.direccion_entrega === 'string') {
            if (modalPago.direccion_entrega.includes('TEL:')) cleanPhone = modalPago.direccion_entrega.split('TEL:')[1].split('|')[0].replace(/\D/g, '');
            else if (modalPago.direccion_entrega.includes('CONTACTO:')) cleanPhone = modalPago.direccion_entrega.split('CONTACTO:')[1].split('|')[0].replace(/\D/g, '');
        }
        return cleanPhone;
    };

    const cleanPhone = getCleanPhone();
    const hasValidPhone = cleanPhone.length >= 10;

    const handleCopiarDatos = () => {
        const texto = `Banco: ${configGlobal?.banco || ''}\nCuenta/CLABE: ${configGlobal?.cuenta || ''}\nTitular: ${configGlobal?.titular || ''}\nTotal a transferir: $${modalPago.total}`;
        navigator.clipboard.writeText(texto).then(() => {
            setToastCopiado(true);
            setTimeout(() => setToastCopiado(false), 2500);
        });
    };

    const handleWhatsApp = () => {
        if (hasValidPhone) {
            const texto = `Hola ${modalPago.cliente_nombre || ''}, te comparto los datos para el pago por transferencia de tu orden #${modalPago.numero_pedido} por un total de *$${modalPago.total}*:\n\n🏦 *Banco:* ${configGlobal?.banco || ''}\n💳 *Cuenta/CLABE:* ${configGlobal?.cuenta || ''}\n👤 *Titular:* ${configGlobal?.titular || ''}\n\nPor favor, compárteme tu comprobante de pago por este medio. ¡Gracias!`;
            const url = `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(texto)}`;
            window.open(url, '_blank');
        }
    };

    if (!modalPago) return null;

    const noSePuedeAnular = modalPago.estado_preparacion === 'Entregado' || modalPago.estado_preparacion === 'En Camino';

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-2xl animate-in zoom-in duration-200 max-h-screen overflow-y-auto relative">
                
                {toastCopiado && (
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl animate-in slide-in-from-top-4 flex items-center gap-2 z-50">
                        <CheckCircle2 size={16} className="text-emerald-400"/> Datos copiados
                    </div>
                )}

                <div className="flex justify-between items-center mb-6 border-b pb-4 mt-2">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800">Orden #{modalPago.numero_pedido}</h2>
                        {modalPago.mesa && (
                            <span className="text-sm font-black text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg mt-2 inline-flex items-center gap-1">
                                📍 MESA {modalPago.mesa}
                            </span>
                        )}
                    </div>
                    <span className={`text-sm md:text-lg font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-2 tracking-wide uppercase ${modalPago.metodo_pago === 'Pendiente' || modalPago.metodo_pago === 'Por Cobrar' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                        {getIconoPago(modalPago.metodo_pago)} <span className="hidden sm:inline">{modalPago.metodo_pago === 'Por Cobrar' ? 'Cuenta Abierta' : modalPago.metodo_pago}</span>
                    </span>
                </div>

                <div className="bg-slate-50 p-4 md:p-6 rounded-3xl mb-6 md:mb-8 flex justify-between items-center border border-slate-100 shadow-inner">
                    <div>
                        <p className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Total a Cobrar</p>
                        <p className="text-4xl md:text-5xl font-black text-blue-600">${modalPago.total}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                        <p className="text-lg md:text-xl font-bold text-slate-700">{modalPago.cliente_nombre || 'Invitado'}</p>
                        <p className="text-xs md:text-sm font-bold text-slate-500">{modalPago.tipo_consumo}</p>
                    </div>
                </div>

                {modoMixto ? (
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <p className="font-black text-slate-400 uppercase tracking-widest text-sm mb-4 text-center">Desglose de Pago Mixto:</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><DollarSign size={14}/> Efectivo</label>
                                <input type="number" min="0" step="0.5" value={montoEfectivoMixto} onChange={e => setMontoEfectivoMixto(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl p-4 text-center text-xl font-black outline-none focus:border-emerald-500 text-slate-800" placeholder="$0" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><CreditCard size={14}/> Tarjeta</label>
                                <input type="number" min="0" step="0.5" value={montoTarjetaMixto} onChange={e => setMontoTarjetaMixto(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl p-4 text-center text-xl font-black outline-none focus:border-blue-500 text-slate-800" placeholder="$0" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Smartphone size={14}/> Transferencia</label>
                                <input type="number" min="0" step="0.5" value={montoTransferenciaMixto} onChange={e => setMontoTransferenciaMixto(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl p-4 text-center text-xl font-black outline-none focus:border-purple-500 text-slate-800" placeholder="$0" />
                            </div>
                        </div>
                        <div className={`p-4 rounded-2xl text-center border-2 transition-all ${Number(calcularRestanteMixto()) === 0 ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                            <p className="text-sm font-bold uppercase tracking-widest mb-1">Diferencia</p>
                            <p className="text-3xl font-black">${calcularRestanteMixto()}</p>
                            {Number(calcularRestanteMixto()) !== 0 && <p className="text-xs font-bold mt-1">La suma de los pagos debe ser exactamente igual al total.</p>}
                        </div>
                        <div className="flex gap-4 pt-4 border-t border-slate-100">
                            <button disabled={isSubmitting} onClick={() => setModoMixto(false)} className="flex-1 py-4 md:py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50">Atrás</button>
                            <button disabled={Number(calcularRestanteMixto()) !== 0 || isSubmitting} onClick={procesarCobroMixto} className="flex-[2] py-4 md:py-5 bg-emerald-500 text-white font-black text-xl rounded-2xl disabled:opacity-50 hover:bg-emerald-600 shadow-lg transition flex items-center justify-center gap-2"><CheckCircle2 size={24}/> {isSubmitting ? 'Procesando...' : 'Confirmar Cobro Mixto'}</button>
                        </div>
                    </div>
                ) : (modalPago.metodo_pago === 'Pendiente' || modalPago.metodo_pago === 'Por Cobrar') ? (
                    <div className="space-y-6 text-center">
                        <p className="font-black text-slate-400 uppercase tracking-widest text-sm mb-4">Selecciona el método de pago final:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
                            <button disabled={isSubmitting} onClick={() => setModalPago({...modalPago, metodo_pago: 'Efectivo'})} className="bg-emerald-50 hover:border-emerald-500 border-2 border-transparent text-emerald-700 p-4 md:p-6 rounded-[24px] font-black flex flex-col items-center gap-2 transition active:scale-95 disabled:opacity-50"><Banknote size={28}/> <span className="text-sm md:text-base">Efectivo</span></button>
                            <button disabled={isSubmitting} onClick={() => setModalPago({...modalPago, metodo_pago: 'Tarjeta'})} className="bg-blue-50 hover:border-blue-500 border-2 border-transparent text-blue-700 p-4 md:p-6 rounded-[24px] font-black flex flex-col items-center gap-2 transition active:scale-95 disabled:opacity-50"><CreditCard size={28}/> <span className="text-sm md:text-base">Tarjeta</span></button>
                            <button disabled={isSubmitting} onClick={() => setModalPago({...modalPago, metodo_pago: 'Transferencia'})} className="bg-purple-50 hover:border-purple-500 border-2 border-transparent text-purple-700 p-4 md:p-6 rounded-[24px] font-black flex flex-col items-center gap-2 transition active:scale-95 disabled:opacity-50"><Smartphone size={28}/> <span className="text-sm md:text-base">Transf.</span></button>
                            <button disabled={isSubmitting} onClick={() => setModoMixto(true)} className="bg-indigo-50 hover:border-indigo-500 border-2 border-transparent text-indigo-700 p-4 md:p-6 rounded-[24px] font-black flex flex-col items-center gap-2 transition active:scale-95 disabled:opacity-50"><Wallet size={28}/> <span className="text-sm md:text-base">Dividir Pago</span></button>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-4 border-t border-slate-100">
                            <button disabled={isSubmitting} onClick={cerrarModalPago} className="flex-1 py-4 md:py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50">Cancelar</button>
                            
                            {modalPago.estado_preparacion === 'Pendiente' && (
                                <button disabled={isSubmitting} onClick={() => procesarPago(null, true)} className="py-4 md:py-5 px-4 md:px-6 bg-orange-100 text-orange-700 font-black rounded-2xl hover:bg-orange-200 transition disabled:opacity-50 flex items-center justify-center gap-2" title="Mandar a cocina y cobrar al final"><ChefHat size={24}/> Cocinar (Cobro final)</button>
                            )}

                            {!noSePuedeAnular && (
                                <button disabled={isSubmitting} onClick={() => procesarPago('Cancelado')} className="flex-1 py-4 md:py-5 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition disabled:opacity-50">Anular Pedido</button>
                            )}
                        </div>
                    </div>
                ) : modalPago.metodo_pago === 'Efectivo' ? (
                    <div className="space-y-6 animate-in fade-in">
                        <div><label className="block text-sm font-black text-slate-400 uppercase mb-3">Monto Recibido</label><input type="number" autoFocus disabled={isSubmitting} value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl p-4 md:p-6 text-center text-3xl md:text-4xl font-black outline-none focus:border-blue-500 text-slate-800 disabled:opacity-50" placeholder="$0.00" /></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <button disabled={isSubmitting} onClick={() => setMontoRecibido(modalPago.total)} className="bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 font-black py-3 md:py-4 rounded-xl transition text-base md:text-lg disabled:opacity-50">Exacto</button>
                            <button disabled={isSubmitting} onClick={() => setMontoRecibido(100)} className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-black py-3 md:py-4 rounded-xl transition text-base md:text-lg disabled:opacity-50">$100</button>
                            <button disabled={isSubmitting} onClick={() => setMontoRecibido(200)} className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-black py-3 md:py-4 rounded-xl transition text-base md:text-lg disabled:opacity-50">$200</button>
                            <button disabled={isSubmitting} onClick={() => setMontoRecibido(500)} className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 font-black py-3 md:py-4 rounded-xl transition text-base md:text-lg disabled:opacity-50">$500</button>
                        </div>
                        {montoRecibido && Number(montoRecibido) >= Number(modalPago.total) && (
                            <div className="bg-emerald-50 border border-emerald-200 p-4 md:p-6 rounded-2xl text-center">
                                <p className="text-xs md:text-sm font-black text-emerald-600 uppercase tracking-widest mb-1">Cambio a devolver</p>
                                <p className="text-4xl md:text-5xl font-black text-emerald-500">${(Number(montoRecibido) - Number(modalPago.total)).toFixed(2)}</p>
                            </div>
                        )}
                        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100">
                            <button disabled={isSubmitting} onClick={cerrarModalPago} className="py-4 md:py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50 text-center">Cancelar</button>
                            <div className="flex gap-3 w-full">
                                {!noSePuedeAnular && (
                                    <button disabled={isSubmitting} onClick={() => procesarPago('Cancelado')} className="w-16 py-4 md:py-5 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition disabled:opacity-50 flex items-center justify-center shrink-0" title="Rechazar y Borrar Pedido"><XCircle size={24}/></button>
                                )}
                                <button disabled={!montoRecibido || Number(montoRecibido) < Number(modalPago.total) || isSubmitting} onClick={() => procesarPago()} className="flex-1 py-4 md:py-5 bg-emerald-500 text-white font-black text-lg md:text-xl rounded-2xl disabled:opacity-50 hover:bg-emerald-600 shadow-lg transition flex items-center justify-center gap-2"><CheckCircle2 size={24}/> {isSubmitting ? 'Procesando...' : 'Cobrar'}</button>
                            </div>
                        </div>
                    </div>
                ) : modalPago.metodo_pago === 'Transferencia' ? (
                    <div className="text-center space-y-5 animate-in fade-in">
                        <div className="bg-purple-50 border border-purple-200 p-6 md:p-8 rounded-3xl text-left relative overflow-hidden shadow-inner">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <Smartphone size={100} />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-purple-900 mb-4 flex items-center gap-2 relative z-10">
                                <Smartphone size={28} /> Datos para Transferencia
                            </h3>
                            <div className="space-y-3 mb-6 relative z-10">
                                <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Banco</span>
                                    <span className="text-sm font-black text-slate-700">{configGlobal?.banco || 'No configurado'}</span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cuenta / CLABE</span>
                                    <span className="text-sm font-black text-slate-700">{configGlobal?.cuenta || 'No configurada'}</span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Titular</span>
                                    <span className="text-sm font-black text-slate-700 line-clamp-1 text-right ml-4">{configGlobal?.titular || 'No configurado'}</span>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                                <button onClick={handleCopiarDatos} className="flex-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition active:scale-95 shadow-sm">
                                    <Copy size={18} /> Copiar Datos
                                </button>
                                {hasValidPhone && (
                                    <button onClick={handleWhatsApp} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/20">
                                        <MessageCircle size={18} /> Enviar WhatsApp
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100">
                            <button disabled={isSubmitting} onClick={cerrarModalPago} className="py-4 md:py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50 text-center">Cancelar</button>
                            <div className="flex gap-3 w-full">
                                {!noSePuedeAnular && (
                                    <button disabled={isSubmitting} onClick={() => procesarPago('Cancelado')} className="w-16 py-4 md:py-5 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition disabled:opacity-50 flex items-center justify-center shrink-0" title="Rechazar y Borrar Pedido"><XCircle size={24}/></button>
                                )}
                                <button disabled={isSubmitting} onClick={() => procesarPago()} className="flex-1 py-4 md:py-5 bg-purple-600 text-white font-black text-lg md:text-xl rounded-2xl disabled:opacity-50 hover:bg-purple-700 shadow-lg transition flex items-center justify-center gap-2"><CheckCircle2 size={24}/> {isSubmitting ? 'Procesando...' : 'Pago Validado'}</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-5 animate-in fade-in">
                        <div className="bg-blue-50 border border-blue-200 p-8 rounded-3xl text-blue-800">
                            <CreditCard size={64} className="mx-auto mb-4 opacity-50" />
                            <p className="font-bold text-lg">Pídele al cliente que inserte o deslice su tarjeta en la terminal.</p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100">
                            <button disabled={isSubmitting} onClick={cerrarModalPago} className="py-4 md:py-5 px-6 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50 text-center">Cancelar</button>
                            <div className="flex gap-3 w-full">
                                {!noSePuedeAnular && (
                                    <button disabled={isSubmitting} onClick={() => procesarPago('Cancelado')} className="w-16 py-4 md:py-5 bg-red-100 text-red-600 font-black rounded-2xl hover:bg-red-200 transition disabled:opacity-50 flex items-center justify-center shrink-0" title="Rechazar y Borrar Pedido"><XCircle size={24}/></button>
                                )}
                                <button disabled={isSubmitting} onClick={() => procesarPago()} className="flex-1 py-4 md:py-5 bg-blue-600 text-white font-black text-lg md:text-xl rounded-2xl disabled:opacity-50 hover:bg-blue-700 shadow-lg transition flex items-center justify-center gap-2"><CheckCircle2 size={24}/> {isSubmitting ? 'Procesando...' : 'Cobro Exitoso'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModalPago;