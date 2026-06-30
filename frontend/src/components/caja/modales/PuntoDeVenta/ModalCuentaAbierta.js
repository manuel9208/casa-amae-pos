import React, { useState } from 'react';
import { Wallet, Banknote, CreditCard, Smartphone, XCircle, ArrowLeft, CheckCircle2, Copy, MessageCircle } from 'lucide-react';

const ModalCuentaAbierta = ({ isOpen, onClose, total, onConfirm, configGlobal, telefonoCliente }) => {
    const [paso, setPaso] = useState(1);
    const [montoIngresado, setMontoIngresado] = useState('');
    const [toastCopiado, setToastCopiado] = useState(false);

    if (!isOpen) return null;

    const billetesDisponibles = [100, 200, 500, 1000].filter(b => b > total);

    const seleccionarMetodo = (metodoSeleccionado) => {
        if (metodoSeleccionado === 'Efectivo') {
            setPaso(2);
        } else if (metodoSeleccionado === 'Transferencia') {
            setPaso(3);
        } else {
            onConfirm({ metodo: metodoSeleccionado, monto: null });
        }
    };

    const confirmarEfectivo = (monto) => {
        onConfirm({ metodo: 'Efectivo', monto: monto });
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        const val = Number(montoIngresado);
        if (val >= total) {
            confirmarEfectivo(val);
        } else {
            alert("El monto ingresado es menor al total de la orden.");
        }
    };

    const cerrar = () => {
        setPaso(1);
        setMontoIngresado('');
        onClose();
    };

    const cleanPhone = String(telefonoCliente || '').replace(/\D/g, '');
    const hasValidPhone = cleanPhone.length >= 10;

    const handleCopiarDatos = () => {
        const texto = `Banco: ${configGlobal?.banco || ''}\nCuenta/CLABE: ${configGlobal?.cuenta || ''}\nTitular: ${configGlobal?.titular || ''}\nTotal a transferir: $${Number(total).toFixed(2)}`;
        navigator.clipboard.writeText(texto).then(() => {
            setToastCopiado(true);
            setTimeout(() => setToastCopiado(false), 2500);
        });
    };

    const handleWhatsApp = () => {
        if (hasValidPhone) {
            const texto = `Hola, te comparto los datos para el pago por transferencia de tu orden por un total de *$${Number(total).toFixed(2)}*:\n\n🏦 *Banco:* ${configGlobal?.banco || ''}\n💳 *Cuenta/CLABE:* ${configGlobal?.cuenta || ''}\n👤 *Titular:* ${configGlobal?.titular || ''}\n\nPor favor, compárteme tu comprobante de pago por este medio. ¡Gracias!`;
            const url = `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(texto)}`;
            window.open(url, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-slate-50 w-full max-w-lg rounded-[40px] shadow-2xl border-4 border-orange-400 overflow-hidden relative flex flex-col animate-in zoom-in-95">
                
                {toastCopiado && (
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl animate-in slide-in-from-top-4 flex items-center gap-2 z-50">
                        <CheckCircle2 size={16} className="text-emerald-400"/> Datos copiados
                    </div>
                )}

                <button onClick={cerrar} className="absolute top-5 right-5 text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm transition-all z-10">
                    <XCircle size={28} />
                </button>

                {paso === 1 && (
                    <div className="p-8 md:p-10 text-center">
                        <div className="bg-orange-100 text-orange-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Wallet size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Cuenta Abierta</h2>
                        <p className="text-slate-500 font-medium mb-8 text-sm md:text-base">¿Cómo pagará el cliente esta orden de <strong className="text-slate-800">${Number(total).toFixed(2)}</strong>?</p>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <button onClick={() => seleccionarMetodo('Efectivo')} className="bg-emerald-500 hover:bg-emerald-600 text-white p-5 rounded-2xl font-black text-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-3 active:scale-95">
                                <Banknote size={24} /> Efectivo
                            </button>
                            <button onClick={() => seleccionarMetodo('Tarjeta')} className="bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-black text-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-3 active:scale-95">
                                <CreditCard size={24} /> Terminal / Tarjeta
                            </button>
                            <button onClick={() => seleccionarMetodo('Transferencia')} className="bg-purple-600 hover:bg-purple-700 text-white p-5 rounded-2xl font-black text-xl shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-3 active:scale-95">
                                <Smartphone size={24} /> Transferencia
                            </button>
                        </div>
                    </div>
                )}

                {paso === 2 && (
                    <div className="p-8 md:p-10 text-center animate-in slide-in-from-right">
                        <button onClick={() => setPaso(1)} className="absolute top-5 left-5 text-slate-400 hover:text-blue-600 bg-white p-2 rounded-full shadow-sm transition-all z-10">
                            <ArrowLeft size={28} />
                        </button>
                        
                        <div className="bg-emerald-100 text-emerald-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Banknote size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Efectivo</h2>
                        <p className="text-slate-500 font-medium mb-6 text-sm md:text-base">¿Con cuánto pagará la orden de <strong className="text-slate-800">${Number(total).toFixed(2)}</strong>?</p>
                        
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {billetesDisponibles.map(billete => (
                                <button key={billete} onClick={() => confirmarEfectivo(billete)} className="bg-white border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 p-4 rounded-2xl font-black text-xl transition-all shadow-sm active:scale-95">
                                    ${billete}
                                </button>
                            ))}
                            <button onClick={() => confirmarEfectivo(total)} className="bg-white border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 p-4 rounded-2xl font-black text-lg transition-all shadow-sm col-span-2 active:scale-95">
                                Cambio Exacto (${Number(total).toFixed(2)})
                            </button>
                        </div>
                        
                        <div className="pt-6 border-t border-slate-200">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">O ingresa otro monto:</p>
                            <form onSubmit={handleManualSubmit} className="flex gap-3">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={montoIngresado}
                                        onChange={e => setMontoIngresado(e.target.value)}
                                        className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 pl-9 pr-4 text-xl font-black outline-none focus:border-emerald-500 transition-all shadow-inner"
                                        placeholder="Ej. 650"
                                    />
                                </div>
                                <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 rounded-2xl font-black shadow-lg transition-all active:scale-95">
                                    <CheckCircle2 size={24} />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {paso === 3 && (
                    <div className="p-8 md:p-10 text-center animate-in slide-in-from-right">
                        <button onClick={() => setPaso(1)} className="absolute top-5 left-5 text-slate-400 hover:text-blue-600 bg-white p-2 rounded-full shadow-sm transition-all z-10">
                            <ArrowLeft size={28} />
                        </button>
                        
                        <div className="bg-purple-100 text-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Smartphone size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Transferencia</h2>
                        <p className="text-slate-500 font-medium mb-6 text-sm md:text-base">Monto a pagar: <strong className="text-slate-800">${Number(total).toFixed(2)}</strong></p>
                        
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-3 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Banco</span>
                                <span className="text-sm font-black text-slate-700">{configGlobal?.banco || 'No configurado'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cuenta / CLABE</span>
                                <span className="text-sm font-black text-slate-700">{configGlobal?.cuenta || 'No configurada'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Titular</span>
                                <span className="text-sm font-black text-slate-700 line-clamp-1 text-right ml-4">{configGlobal?.titular || 'No configurado'}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button onClick={handleCopiarDatos} className="flex-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 py-3 rounded-xl font-bold transition active:scale-95 flex justify-center items-center gap-2">
                                    <Copy size={18} /> Copiar Datos
                                </button>
                                {hasValidPhone && (
                                    <button onClick={handleWhatsApp} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition active:scale-95 flex justify-center items-center gap-2">
                                        <MessageCircle size={18} /> Enviar WhatsApp
                                    </button>
                                )}
                            </div>
                            <button onClick={() => onConfirm({ metodo: 'Transferencia', monto: null })} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 mt-2 rounded-xl font-black text-lg shadow-lg shadow-blue-600/30 transition active:scale-95 flex justify-center items-center gap-2">
                                <CheckCircle2 size={24} /> Confirmar Pago Final
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModalCuentaAbierta;