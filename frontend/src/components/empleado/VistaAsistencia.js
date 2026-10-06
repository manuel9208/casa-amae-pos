import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Fingerprint, ArrowLeft, Delete, CheckCircle2, AlertTriangle, Smartphone, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import io from 'socket.io-client';
import { useBiometria } from '../../hooks/useBiometria';
import { useValidadorAsistencia } from '../admin/asistencia/useValidadorAsistencia';

const VistaAsistencia = ({ apiUrl, user }) => {
    const [accion, setAccion] = useState(null); // 'Entrada' | 'Salida'
    const [pinInput, setPinInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [metodoPortal, setMetodoPortal] = useState('ambos');
    const [portalHabilitado, setPortalHabilitado] = useState(true);
    const [cargandoConfig, setCargandoConfig] = useState(true);
    const [alerta, setAlerta] = useState(null);

    // ESTADO DE VINCULACIÓN DEL DISPOSITIVO
    const [equipoVinculado, setEquipoVinculado] = useState(false);
    const [verificandoEquipo, setVerificandoEquipo] = useState(true);

    // 👇 NUEVO: Estado de vinculación de HUELLA (para bloquear el botón si ya tiene una)
    const [huellaVinculada, setHuellaVinculada] = useState(user?.tiene_huella === true || user?.tiene_huella === 'true');

    const { validarAcceso, validandoGPS } = useValidadorAsistencia(apiUrl);

    // ESTADOS PARA MODAL DE VÍNCULO CELULAR
    const [modalVincular, setModalVincular] = useState(false);
    const [pinVincular, setPinVincular] = useState('');
    const [vinculando, setVinculando] = useState(false);

    const customShowAlert = (titulo, mensaje, tipo) => {
        setAlerta({ titulo, mensaje, tipo });
        setTimeout(() => setAlerta(null), 5000);
    };

    const { iniciarSesionConHuella, registrarHuella } = useBiometria(apiUrl, customShowAlert);

    // 👇 NUEVO: Mantiene sincronizado el estado local si el prop "user" se actualiza (ej. al recargar el Portal)
    useEffect(() => {
        setHuellaVinculada(user?.tiene_huella === true || user?.tiene_huella === 'true');
    }, [user?.tiene_huella]);

    // 1. VERIFICAR VINCULACIÓN Y SINCRONIZAR ID LOCAL CON LA BD
    const verificarVinculacionDispositivo = useCallback(async () => {
        setVerificandoEquipo(true);
        try {
            let miDispositivoId = localStorage.getItem('pos_device_id');
            
            if (!miDispositivoId) {
                miDispositivoId = Math.random().toString(36).substring(2, 15);
                localStorage.setItem('pos_device_id', miDispositivoId);
            }

            const res = await fetch(`${apiUrl}/usuarios/dispositivos-vinculados?t=${Date.now()}`);
            if (res.ok) {
                const vinculados = await res.json();
                if (Array.isArray(vinculados)) {
                    const miUserIdStr = String(user.id).trim();

                    // Buscar el registro de vinculación de este usuario
                    const registroUsuario = vinculados.find(v => {
                        const uid = String(v.usuario_id !== undefined ? v.usuario_id : (v.id_usuario !== undefined ? v.id_usuario : v.id)).trim();
                        return uid === miUserIdStr;
                    });

                    if (registroUsuario) {
                        const devIdDB = String(registroUsuario.dispositivo_id || registroUsuario.dispositivoId || '').trim();
                        
                        if (devIdDB) {
                            // Sincronizamos el ID del navegador con la base de datos
                            localStorage.setItem('pos_device_id', devIdDB);
                            setEquipoVinculado(true);
                        } else {
                            setEquipoVinculado(false);
                        }
                    } else {
                        setEquipoVinculado(false);
                    }
                }
            }
        } catch (e) {
            console.error("Error al verificar la vinculación del equipo:", e);
        } finally {
            setVerificandoEquipo(false);
        }
    }, [apiUrl, user.id]);

    // 2. CARGAR CONFIGURACIÓN GENERAL DE ASISTENCIA Y SUSCRIBIR WEBSOCKETS
    const cargarConfiguracionGeneral = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/asistencia/configuracion?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                const general = data.general || {};
                
                let tipos = general.tipo_registro;
                if (typeof tipos === 'string') {
                    try { tipos = JSON.parse(tipos); } catch(e) { tipos = [tipos]; }
                }
                if (!Array.isArray(tipos)) tipos = ['portal'];

                setPortalHabilitado(tipos.includes('portal'));
                setMetodoPortal(general.metodo_portal || 'ambos');
            }
        } catch (e) {
            console.error("Error al obtener la configuración de asistencia:", e);
        } finally {
            setCargandoConfig(false);
        }
    }, [apiUrl]);

    useEffect(() => {
        cargarConfiguracionGeneral();
        verificarVinculacionDispositivo();

        const baseUrl = apiUrl.replace('/api', '');
        const socket = io(baseUrl, { transports: ['websocket', 'polling'] });

        socket.on('config_asistencia_actualizada', () => {
            cargarConfiguracionGeneral();
            verificarVinculacionDispositivo();
        });

        socket.on('usuario_actualizado', () => {
            verificarVinculacionDispositivo();
        });

        return () => socket.disconnect();
    }, [apiUrl, cargarConfiguracionGeneral, verificarVinculacionDispositivo]);

    // MANEJADOR: VINCULAR DISPOSITIVO CELULAR
    const handleVincularEquipo = async (e) => {
        e.preventDefault();
        if (pinVincular.length !== 4) return;
        setVinculando(true);
        try {
            let dispositivo_id = localStorage.getItem('pos_device_id');
            if (!dispositivo_id) {
                dispositivo_id = Math.random().toString(36).substring(2, 15);
                localStorage.setItem('pos_device_id', dispositivo_id);
            }

            const res = await fetch(`${apiUrl}/usuarios/vincular-dispositivo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_id: user.id,
                    dispositivo_id: dispositivo_id,
                    pin: pinVincular
                })
            });
            const data = await res.json();
            
            if (res.ok) {
                customShowAlert('¡ÉXITO!', data.message || 'Dispositivo verificado y vinculado.', 'success');
                setModalVincular(false);
                setPinVincular('');
                setEquipoVinculado(true);
                await verificarVinculacionDispositivo();
            } else {
                customShowAlert('ERROR', data.error || 'No se pudo vincular el equipo.', 'error');
            }
        } catch (error) {
            customShowAlert('ERROR', 'Fallo de conexión al vincular.', 'error');
        }
        setVinculando(false);
    };

    // =========================================================
    // VINCULAR HUELLA / FACE ID DEL DISPOSITIVO
    // =========================================================
    const handleVincularHuella = async () => {
        // 👇 FIX: Bloqueo defensivo por si el botón llegara a activarse aunque ya tenga huella
        if (huellaVinculada) {
            customShowAlert('YA VINCULADA', 'Ya cuentas con tu huella dada de alta. Si necesitas reemplazarla, solicítalo al administrador.', 'error');
            return;
        }
        setIsSubmitting(true);
        // Le pasamos user.id (empleado) y null (cliente) al motor biométrico
        const exito = await registrarHuella(user.id, null); 
        if (exito) {
            customShowAlert('¡HUELLA VINCULADA!', 'Tu huella o Face ID se ha guardado correctamente. Ya puedes usarla para checar asistencia.', 'success');
            // 👇 FIX: Reflejamos el bloqueo del botón de inmediato, sin esperar a un refresh completo del usuario
            setHuellaVinculada(true);
        } else {
            customShowAlert('ERROR', 'No se pudo vincular la huella. Intenta de nuevo.', 'error');
        }
        setIsSubmitting(false);
    };

    // HUELLA DIGITAL
    const handleAsistenciaHuella = async () => {
        setIsSubmitting(true);

        // Respeta el modo de validación configurado (IP / Ubicación / Ambas) — idéntico al flujo de PIN
        const validacion = await validarAcceso();
        if (!validacion.success) {
            customShowAlert('ACCESO DENEGADO', validacion.error, 'error');
            setIsSubmitting(false);
            return;
        }

        const data = await iniciarSesionConHuella();
        if (data && data.success) {
            const userPin = user.pin; 
            
            if (!userPin) {
                customShowAlert('ATENCIÓN', 'No tienes un PIN asignado para registrar asistencia.', 'error');
                setIsSubmitting(false);
                return;
            }

            try {
                // 👇 FIX: Ahora se envían lat/lon (validados por el GPS) y el dispositivo_id
                // para que el BACKEND también valide ubicación y el candado anti-suplantación.
                const dispositivo_id = localStorage.getItem('pos_device_id');
                const res = await fetch(`${apiUrl}/usuarios/asistencia`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin: userPin, tipo: accion, lat: validacion.lat, lon: validacion.lon, dispositivo_id })
                });
                const resultado = await res.json();

                if (res.ok) {
                    customShowAlert('RELOJ CHECADOR', resultado.mensaje, 'success');
                    setAccion(null);
                } else {
                    customShowAlert('ATENCIÓN', resultado.error, 'error');
                }
            } catch (error) {
                customShowAlert('ERROR', 'Error de red.', 'error');
            }
        }
        setIsSubmitting(false);
    };

    // PIN TRADICIONAL
    useEffect(() => {
        const procesarChecada = async () => {
            if (pinInput.length === 4 && !isSubmitting && !validandoGPS) {
                setIsSubmitting(true);

                // 👇 BLOQUEO ANTI-SUPLANTACIÓN (Solo acepta el PIN del dueño de la sesión)
                if (String(pinInput) !== String(user.pin)) {
                    customShowAlert('ACCESO DENEGADO', 'Este PIN no te pertenece. Ingresa tu propio código de seguridad.', 'error');
                    setTimeout(() => { setPinInput(''); setIsSubmitting(false); }, 1500);
                    return;
                }

                // Respeta el modo de validación configurado (IP / Ubicación / Ambas) — idéntico al flujo de Huella
                const validacion = await validarAcceso();
                if (!validacion.success) {
                    customShowAlert('ACCESO DENEGADO', validacion.error, 'error');
                    setTimeout(() => { setPinInput(''); setIsSubmitting(false); }, 1000);
                    return;
                }

                try {
                    // 👇 FIX: Ahora se envían lat/lon (validados por el GPS) y el dispositivo_id
                    // para que el BACKEND también valide ubicación y el candado anti-suplantación.
                    const dispositivo_id = localStorage.getItem('pos_device_id');
                    const res = await fetch(`${apiUrl}/usuarios/asistencia`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pin: pinInput, tipo: accion, lat: validacion.lat, lon: validacion.lon, dispositivo_id })
                    });
                    const data = await res.json();

                    if (res.ok) {
                        customShowAlert('RELOJ CHECADOR', data.mensaje, 'success');
                        setPinInput('');
                        setIsSubmitting(false);
                        setAccion(null);
                    } else {
                        customShowAlert('ATENCIÓN', data.error, 'error');
                        setTimeout(() => { setPinInput(''); setIsSubmitting(false); }, 1000);
                    }
                } catch (error) {
                    customShowAlert('ERROR', 'No hay conexión con el servidor.', 'error');
                    setTimeout(() => { setPinInput(''); setIsSubmitting(false); }, 1000);
                }
            }
        };
        procesarChecada();
    }, [pinInput, isSubmitting, validandoGPS, accion, apiUrl, validarAcceso, user.pin]);

    const handleKeypad = (num) => {
        if (pinInput.length < 4 && !isSubmitting && !validandoGPS) setPinInput(prev => prev + num);
    };

    const handleDelete = () => {
        if (!isSubmitting && !validandoGPS) setPinInput(prev => prev.slice(0, -1));
    };

    const bloqueado = isSubmitting || validandoGPS;

    if (cargandoConfig || verificandoEquipo) {
        return (
            <div className="bg-white p-12 rounded-[40px] shadow-sm border border-slate-200 text-center max-w-md mx-auto">
                <Clock className="animate-spin text-blue-500 mx-auto mb-4" size={40} />
                <p className="font-black text-slate-700 text-sm uppercase tracking-widest">Verificando dispositivo y reglas...</p>
            </div>
        );
    }

    if (!portalHabilitado) {
        return (
            <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-slate-200 text-center max-w-md mx-auto animate-in zoom-in-95">
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <ShieldAlert size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Portal Inactivo</h2>
                <p className="text-slate-500 font-medium mb-6 leading-relaxed">
                    El registro de asistencia manual desde el portal no está habilitado por la administración.
                </p>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Utiliza el biométrico físico ZKTeco, inicio de sesión o lectura NFC según la política de tu sucursal.
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto relative animate-in fade-in">
            {alerta && (
                <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2 ${alerta.tipo === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
                    {alerta.tipo === 'error' ? <AlertTriangle className="shrink-0 mt-0.5" size={20} /> : <CheckCircle2 className="shrink-0 mt-0.5" size={20} />}
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-widest mb-1">{alerta.titulo}</h4>
                        <p className="font-medium text-sm leading-tight opacity-90">{alerta.mensaje}</p>
                    </div>
                </div>
            )}

            {!accion ? (
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 text-center animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Clock size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Reloj Checador</h2>

                    {/* ESCUDO DE VALIDACIÓN DE VÍNCULO */}
                    {!equipoVinculado ? (
                        <div className="my-6 p-6 bg-amber-50 border-2 border-amber-200 rounded-3xl text-center space-y-4 animate-in slide-in-from-top-2">
                            <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-amber-500/20">
                                <Smartphone size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-amber-900 text-base mb-1">Dispositivo No Registrado</h3>
                                <p className="text-xs font-bold text-amber-700 leading-relaxed">
                                    Para evitar la suplantación de identidad y habilitar las checadas, primero debes registrar este celular como tuyo.
                                </p>
                            </div>
                            <button
                                onClick={() => setModalVincular(true)}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all active:scale-95 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                <Lock size={16} /> Vincular este celular como mío
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="text-slate-500 font-medium mb-8">Selecciona qué deseas registrar en este momento.</p>
                            
                            {/* BOTONES DE ENTRADA Y SALIDA (DESBLOQUEADOS) */}
                            <div className="flex flex-col gap-4">
                                <button onClick={() => setAccion('Entrada')} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 text-xl flex items-center justify-center gap-2">
                                    ▶ Registrar Entrada
                                </button>
                                <button onClick={() => setAccion('Salida')} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-5 rounded-2xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 text-xl flex items-center justify-center gap-2">
                                    ⏹ Registrar Salida
                                </button>
                            </div>

                            {/* SECCIÓN DE VÍNCULOS NÚCLEO */}
                            <div className="mt-8 pt-6 border-t border-slate-100 animate-in slide-in-from-bottom-2">
                                <div className="flex items-center justify-center gap-2 text-xs font-black text-emerald-600 bg-emerald-50 py-3 px-4 rounded-xl border border-emerald-200">
                                    <ShieldCheck size={16} /> Este celular ya se encuentra verificado
                                </div>
                            </div>

                            {/* 👇 FIX: Si ya tiene huella vinculada, se bloquea el botón y se muestra un aviso informativo */}
                            <div className="mt-4">
                                {huellaVinculada ? (
                                    <div className="w-full bg-emerald-50 text-emerald-700 font-black py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-emerald-200 shadow-sm cursor-default select-none">
                                        <CheckCircle2 size={16} /> Ya cuentas con tu Huella / Face ID
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleVincularHuella}
                                        disabled={isSubmitting}
                                        className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black py-3.5 rounded-xl transition-all active:scale-95 text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-indigo-200 shadow-sm disabled:opacity-50"
                                    >
                                        <Fingerprint size={16} /> Vincular mi Huella / Face ID
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200 text-center animate-in slide-in-from-right-4 relative">
                    <button onClick={() => { setAccion(null); setPinInput(''); }} disabled={bloqueado} className="absolute top-6 left-6 text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full transition disabled:opacity-50">
                        <ArrowLeft size={20}/>
                    </button> 

                    <h3 className={`text-2xl font-black mb-6 ${accion === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {validandoGPS ? 'Ubicando...' : `Checar ${accion}`}
                    </h3>

                    {/* BOTÓN HUELLA DIGITAL */}
                    {(metodoPortal === 'ambos' || metodoPortal === 'huella') && (
                        <div className="mb-6">
                            <button disabled={bloqueado} onClick={handleAsistenciaHuella} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 disabled:opacity-50 ${accion === 'Entrada' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 text-white' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30 text-white'}`}>
                                <Fingerprint size={24} /> 
                                {validandoGPS ? 'Validando red...' : isSubmitting ? 'Escaneando...' : 'Escanear Huella'}
                            </button>
                        </div>
                    )}

                    {metodoPortal === 'ambos' && (
                        <div className="flex items-center gap-4 mb-6 opacity-60">
                            <div className="h-px bg-slate-300 flex-1"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">O PIN Manual</span>
                            <div className="h-px bg-slate-300 flex-1"></div>
                        </div>
                    )}

                    {/* TECLADO PIN */}
                    {(metodoPortal === 'ambos' || metodoPortal === 'pin') && (
                        <div className="flex flex-col items-center">
                            <div className="flex gap-4 mb-8">
                                {[0, 1, 2, 3].map(index => (
                                    <div key={index} className={`w-5 h-5 rounded-full transition-all duration-200 ${pinInput.length > index ? (accion === 'Entrada' ? 'bg-emerald-500 scale-110' : 'bg-rose-500 scale-110') : 'bg-slate-200'}`} />
                                ))}
                            </div>  

                            <div className="grid grid-cols-3 gap-3 md:gap-4 w-full max-w-[280px]">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <button key={num} disabled={bloqueado} onClick={() => handleKeypad(num.toString())} className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-3xl font-black py-4 rounded-2xl border border-slate-200 active:scale-95 transition-all disabled:opacity-50">{num}</button>
                                ))}
                                <div className="pointer-events-none"></div>  
                                <button disabled={bloqueado} onClick={() => handleKeypad('0')} className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-3xl font-black py-4 rounded-2xl border border-slate-200 active:scale-95 transition-all disabled:opacity-50">0</button>  
                                <button disabled={bloqueado} onClick={handleDelete} className="bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center py-4 rounded-2xl border border-slate-200 active:scale-95 transition-all disabled:opacity-50"><Delete size={28} /></button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: VINCULAR DISPOSITIVO CELULAR */}
            {modalVincular && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <form onSubmit={handleVincularEquipo} className="bg-white rounded-[40px] p-8 md:p-10 w-full max-w-sm text-center shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <div className="bg-indigo-100 text-indigo-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Lock size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Vincular Equipo</h3>
                        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                            Al vincular este celular, <strong>nadie más</strong> podrá iniciar sesión aquí. Confirma con tu PIN de 4 dígitos.
                        </p>
                        
                        <input
                            type="password"
                            maxLength="4"
                            required
                            autoFocus
                            value={pinVincular}
                            onChange={e => setPinVincular(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-center text-3xl font-black tracking-[1em] outline-none focus:border-indigo-500 mb-6 text-slate-800"
                            placeholder="••••"
                        />
                        
                        <div className="flex gap-3">
                            <button type="button" onClick={() => { setModalVincular(false); setPinVincular(''); }} disabled={vinculando} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition">
                                Cancelar
                            </button>
                            <button type="submit" disabled={pinVincular.length !== 4 || vinculando} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition shadow-lg shadow-indigo-500/30 disabled:opacity-50 active:scale-95">
                                {vinculando ? '...' : 'Vincular'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default VistaAsistencia;