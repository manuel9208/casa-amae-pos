import React, { useState, useEffect } from 'react';
import { ChefHat, LogOut, PackagePlus, Trash2, Maximize, ScanLine, CheckCircle2, XCircle } from 'lucide-react';
import io from 'socket.io-client'; 

import { useNFC } from '../../hooks/useNFC';
import { useValidadorAsistencia } from '../admin/asistencia/useValidadorAsistencia';

const HeaderKDS = ({ user, onLogout, filtroTab, setFiltroTab, setModalInsumo, setModalMermas, configGlobal = {} }) => {

    const isGlobalAdmin = user?.usuario === 'admin';
    const canMermas = isGlobalAdmin || user?.permisos?.reportar_mermas === true;

    const apiUrlLocal = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api');

    // 👇 CEREBRO DE ASISTENCIA NFC
    const { isListening, nfcData, startNFC, stopNFC } = useNFC();
    const { validarAcceso } = useValidadorAsistencia(apiUrlLocal);
    const [alertaNFC, setAlertaNFC] = useState(null);

    // 👇 NUEVO ESTADO Y EFECTO: Controla la visibilidad del botón NFC en la Cocina
    const [nfcActivo, setNfcActivo] = useState(false);

    useEffect(() => {
        const fetchConfigAsistencia = async () => {
            try {
                const res = await fetch(`${apiUrlLocal}/asistencia/configuracion?t=${Date.now()}`);
                if (res.ok) {
                    const data = await res.json();
                    let tipos = [];
                    if (data?.general?.tipo_registro) {
                        try {
                            tipos = typeof data.general.tipo_registro === 'string'
                                ? JSON.parse(data.general.tipo_registro)
                                : data.general.tipo_registro;
                        } catch(e) { tipos = ['portal']; }
                    }
                    
                    if (Array.isArray(tipos) && tipos.includes('nfc')) {
                        setNfcActivo(true);
                    } else {
                        setNfcActivo(false);
                        if (isListening) stopNFC();
                    }
                }
            } catch (error) { console.error("Error cargando config NFC:", error); }
        };

        fetchConfigAsistencia();

        // Escuchamos el socket para reaccionar al instante
        const baseUrl = apiUrlLocal.replace('/api', '');
        const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
        socket.on('config_asistencia_actualizada', fetchConfigAsistencia);

        return () => socket.disconnect();
    }, [apiUrlLocal, isListening, stopNFC]);

    useEffect(() => {
        const procesarAsistenciaNFC = async () => {
            if (nfcData) {
                stopNFC();
                setAlertaNFC({ tipo: 'loading', msj: 'Validando ubicación y red...' });

                const validacion = await validarAcceso();
                if (!validacion.success) {
                    setAlertaNFC({ tipo: 'error', msj: validacion.error });
                    setTimeout(() => setAlertaNFC(null), 5000);
                    return;
                }

                setAlertaNFC({ tipo: 'loading', msj: 'Registrando asistencia...' });
                try {
                    const dispositivo_id = localStorage.getItem('pos_device_id');
                    const res = await fetch(`${apiUrlLocal}/usuarios/asistencia-nfc`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nfc_uid: nfcData, dispositivo_id })
                    });
                    const data = await res.json();
                    
                    if (res.ok) {
                        setAlertaNFC({ tipo: 'success', msj: data.mensaje });
                    } else {
                        setAlertaNFC({ tipo: 'error', msj: data.error });
                    }
                } catch (e) {
                    setAlertaNFC({ tipo: 'error', msj: 'Error de red.' });
                }
                
                setTimeout(() => setAlertaNFC(null), 4000);
            }
        };
        procesarAsistenciaNFC();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nfcData, apiUrlLocal, validarAcceso]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.error(e));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    return (
        <>
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between bg-slate-800 p-4 rounded-3xl shadow-md border border-slate-700 mb-4 gap-4 print:hidden mx-4 md:mx-8 mt-4">  
                
                {/* LADO IZQUIERDO: Identidad */}
                <div className="flex items-center gap-4">
                    <div className="bg-orange-500 p-3 rounded-xl shadow-md shadow-orange-500/20">
                        <ChefHat size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white leading-tight tracking-wide">KDS - Monitor</h1>
                        <p className="text-xs font-bold text-orange-400">Usuario Activo: {user.nombre}</p>
                    </div>  
                </div>  

                {/* CENTRO: Filtro de Áreas */}
                <div className="flex bg-slate-900 p-1.5 rounded-2xl justify-center shadow-inner border border-slate-950">
                    {['Todo', 'Cocina', 'Barra'].map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setFiltroTab(tab)} 
                            className={`px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center ${filtroTab === tab ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {tab === 'Cocina' && <ChefHat size={16} className="mr-2"/>}
                            {tab === 'Barra' && <span className="mr-2">☕</span>}
                            {tab}
                        </button>
                    ))}
                </div>  

                {/* LADO DERECHO: Acciones */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setModalInsumo(true)}
                        className="flex-1 lg:flex-none flex items-center justify-center p-3 md:px-4 md:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-lg shadow-blue-500/20"
                        title="Solicitar Insumo a Caja"
                    >
                        <PackagePlus size={18}/> <span className="hidden md:inline ml-2">Pedir Insumo</span>
                    </button>
                    
                    {canMermas && (
                        <button
                            onClick={() => setModalMermas(true)}
                            className="flex-1 lg:flex-none flex items-center justify-center p-3 md:px-4 md:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-lg shadow-red-500/20"
                            title="Reportar Merma"
                        >
                            <Trash2 size={18}/> <span className="hidden md:inline ml-2">Merma</span>
                        </button>
                    )}

                    <div className="flex items-center gap-2 pl-2 ml-1 border-l border-slate-700">
                        {/* 👇 CONDICIONAL APLICADA: Solo se muestra si nfcActivo es true */}
                        {nfcActivo && (
                            <button
                                onClick={isListening ? stopNFC : startNFC}
                                    className={`flex items-center justify-center p-3 rounded-xl transition-all active:scale-95 border ${
                                    isListening
                                    ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/30 animate-pulse'
                                    : 'bg-slate-900 text-white border-slate-950 hover:bg-slate-700 shadow-inner'
                                    }`}
                                title="Asistencia NFC">
                                <ScanLine size={18} className={`${isListening ? 'animate-spin' : ''}`}/>
                            </button>
                        )}

                        <button 
                            onClick={toggleFullScreen} 
                            className="p-3 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl transition active:scale-95 hidden sm:block border border-slate-600" 
                            title="Pantalla Completa"
                        >
                            <Maximize size={18}/>
                        </button>

                        <button 
                            onClick={onLogout} 
                            className="flex items-center justify-center p-3 bg-slate-900 text-slate-400 hover:text-red-400 rounded-xl font-bold transition border border-slate-950 active:scale-95"
                            title="Cerrar Sesión"
                        >
                            <LogOut size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 👇 MODAL ALERTA NFC */}
            {alertaNFC && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-[40px] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
                        {alertaNFC.tipo === 'loading' && <ScanLine className="mx-auto text-blue-500 animate-pulse mb-4" size={48} />}
                        {alertaNFC.tipo === 'success' && <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={48} />}
                        {alertaNFC.tipo === 'error' && <XCircle className="mx-auto text-red-500 mb-4" size={48} />}
                        
                        <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Reloj Checador</h3>
                        <p className="text-sm font-bold text-slate-500">{alertaNFC.msj}</p>
                    </div>
                </div>
            )}
        </>
    );
};  

export default HeaderKDS;