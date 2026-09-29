import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, ScanLine, Trash2, RefreshCw, ShieldCheck, CreditCard } from 'lucide-react';
import io from 'socket.io-client';
import { useNFC } from '../../../hooks/useNFC';

const GestorDispositivosNFC = ({ apiUrl, showAlert, showConfirm }) => {
    const [celularesVinculados, setCelularesVinculados] = useState([]);
    const [nfcVinculados, setNfcVinculados] = useState([]);
    const [modalNFCAdmin, setModalNFCAdmin] = useState(null);
    const { isListening, nfcData, startNFC, stopNFC } = useNFC();
    const [asignandoNFC, setAsignandoNFC] = useState(false);

    const cargarDatosDispositivos = useCallback(async () => {
        try {
            const [resCel, resNfc] = await Promise.all([
                fetch(`${apiUrl}/usuarios/dispositivos-vinculados?t=${Date.now()}`),
                fetch(`${apiUrl}/usuarios/nfc-vinculados?t=${Date.now()}`)
            ]);
            if (resCel.ok) setCelularesVinculados(await resCel.json());
            if (resNfc.ok) setNfcVinculados(await resNfc.json());
        } catch (e) { console.error("Error al cargar dispositivos:", e); }
    }, [apiUrl]);

    useEffect(() => {
        cargarDatosDispositivos();
        const baseUrl = apiUrl.replace('/api', '');
        const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
        socket.on('usuario_actualizado', cargarDatosDispositivos);
        return () => socket.disconnect();
    }, [apiUrl, cargarDatosDispositivos]);

    useEffect(() => {
        const procesarEnrolamientoNFC = async () => {
            if (nfcData && modalNFCAdmin) {
                stopNFC();
                setAsignandoNFC(true);
                try {
                    const idEmpleado = modalNFCAdmin.usuario_id || modalNFCAdmin.id;
                    const res = await fetch(`${apiUrl}/usuarios/vincular-nfc`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ usuario_id: idEmpleado, nfc_uid: nfcData })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        showAlert('¡Tarjeta Asignada!', `Gafete NFC vinculado a ${modalNFCAdmin.nombre}.`, 'success');
                        setModalNFCAdmin(null);
                        cargarDatosDispositivos();
                    } else { showAlert('Error', data.error || 'No se pudo asignar.', 'error'); }
                } catch (e) { showAlert('Error', 'Error de red.', 'error'); }
                setAsignandoNFC(false);
            }
        };
        procesarEnrolamientoNFC();
    }, [nfcData, modalNFCAdmin, apiUrl, cargarDatosDispositivos, showAlert, stopNFC]);

    const handleDesvincularCelular = (id, nombre) => {
        showConfirm('¿Desvincular Celular?', `¿Remover celular personal de ${nombre}?`, async () => {
            try {
                const res = await fetch(`${apiUrl}/usuarios/dispositivos-vinculados/${id}`, { method: 'DELETE' });
                if (res.ok) { showAlert('Desvinculado', 'Celular removido.', 'success'); cargarDatosDispositivos(); }
            } catch (e) { showAlert('Error', 'No se pudo desvincular.', 'error'); }
        });
    };

    const handleDesvincularNFC = (usuarioId, nombre) => {
        showConfirm('¿Desvincular NFC?', `¿Revocar Gafete NFC a ${nombre}?`, async () => {
            try {
                const res = await fetch(`${apiUrl}/usuarios/nfc-vinculados/${usuarioId}`, { method: 'DELETE' });
                if (res.ok) { showAlert('Desvinculado', 'Gafete NFC removido.', 'success'); cargarDatosDispositivos(); }
            } catch (e) { showAlert('Error', 'No se pudo desvincular.', 'error'); }
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
            {/* CELULARES VINCULADOS */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><Smartphone size={24} /></div>
                            <div><h3 className="font-black text-xl text-slate-800">Celulares Vinculados</h3><p className="text-xs font-bold text-slate-400">Empleados con dispositivo verificado</p></div>
                        </div>
                        <button onClick={cargarDatosDispositivos} className="p-2.5 text-slate-400 bg-slate-100 rounded-xl transition hover:text-slate-600"><RefreshCw size={16} /></button>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="pb-3">Empleado</th><th className="pb-3 text-right">Opciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {celularesVinculados.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                        <td className="py-3 font-black text-sm text-slate-800">{item.nombre} <span className="block text-[10px] font-bold text-slate-400 uppercase">{item.rol}</span></td>
                                        <td className="py-3 text-right space-x-2">
                                            <button onClick={() => setModalNFCAdmin(item)} className="p-2 bg-slate-900 text-white rounded-xl active:scale-95 inline-flex items-center gap-1 text-xs font-bold shadow-sm" title="Vincular NFC">
                                                <ScanLine size={15} /><span className="hidden sm:inline">Vincular NFC</span>
                                            </button>
                                            <button onClick={() => handleDesvincularCelular(item.id, item.nombre)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* GAFETES NFC ACTIVOS */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><CreditCard size={24} /></div>
                            <div><h3 className="font-black text-xl text-slate-800">Gafetes NFC Activas</h3><p className="text-xs font-bold text-slate-400">Lectura rápida Tap & Go</p></div>
                        </div>
                        <button onClick={cargarDatosDispositivos} className="p-2.5 text-slate-400 bg-slate-100 rounded-xl hover:text-slate-600"><RefreshCw size={16} /></button>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="pb-3">Empleado</th><th className="pb-3">Estado</th><th className="pb-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {nfcVinculados.map(item => (
                                    <tr key={item.usuario_id} className="hover:bg-slate-50/50 transition">
                                        <td className="py-3"><p className="font-black text-sm text-slate-800">{item.nombre}</p></td>
                                        <td className="py-3"><span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg uppercase inline-flex items-center gap-1 border border-emerald-200"><ShieldCheck size={12} /> Activo</span></td>
                                        <td className="py-3 text-right"><button onClick={() => handleDesvincularNFC(item.usuario_id, item.nombre)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"><Trash2 size={16} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL ESCANEAR NFC */}
            {modalNFCAdmin && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
                        <div className="bg-slate-900 text-emerald-400 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><ScanLine size={40} className={isListening ? 'animate-spin' : ''} /></div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Asignar Gafete NFC</h3>
                        <p className="text-xs font-bold text-slate-500 mb-6">Empleado: <strong className="text-slate-800">{modalNFCAdmin.nombre}</strong></p>
                        {!isListening ? (
                            <button onClick={startNFC} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl mb-4 flex justify-center gap-2"><ScanLine size={18} /> Activar Lector NFC</button>
                        ) : (
                            <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl font-black text-xs uppercase mb-4 animate-pulse">📡 Acerque la tarjeta...</div>
                        )}
                        <button type="button" onClick={() => { stopNFC(); setModalNFCAdmin(null); }} disabled={asignandoNFC} className="w-full py-3.5 bg-slate-100 text-slate-600 font-black rounded-2xl">Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestorDispositivosNFC;