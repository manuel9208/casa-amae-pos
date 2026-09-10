import React, { useState, useEffect, useCallback } from 'react';
import { Settings, XCircle, Smartphone, Mail, Save, Users, Monitor } from 'lucide-react';

const ModalConfigSeguridad = ({ apiUrl, showAlert, onClose }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [configuracion, setConfiguracion] = useState({
        control_dispositivos_activo: false,
        roles_restringidos: ['cajero', 'cocina', 'repartidor'],
        pantallas_restringidas: ['caja', 'cocina', 'admin'],
        smtp_host: '', smtp_port: '', smtp_user: '', smtp_pass: '', correo_remitente: ''
    });

    const ROLES_DISPONIBLES = [
        { id: 'cajero', label: 'Cajeros' },
        { id: 'cocina', label: 'Cocineros' },
        { id: 'repartidor', label: 'Repartidores' },
        { id: 'jefe', label: 'Jefes de Turno' },
        { id: 'gerente', label: 'Gerentes' },
        { id: 'ayudante_cocina', label: 'Ayudantes de Cocina' },
        { id: 'admin', label: 'Administradores' }
    ];

    const PANTALLAS_DISPONIBLES = [
        { id: 'caja', label: 'Caja Principal (POS)' },
        { id: 'cocina', label: 'Cocina (KDS)' },
        { id: 'kiosco', label: 'Kiosco / Punto de Venta' },
        { id: 'admin', label: 'Panel de Administración' },
        { id: 'repartidor', label: 'Logística de Reparto' }
    ];

    const cargarConfiguracion = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/biometria/configuracion`);
            if (res.ok) {
                const data = await res.json();
                if (data) setConfiguracion(prev => ({ 
                    ...prev, ...data, 
                    roles_restringidos: data.roles_restringidos || [],
                    pantallas_restringidas: data.pantallas_restringidas || [],
                    smtp_pass: '' 
                }));
            }
        } catch (error) { console.error("Error al cargar configuración", error); }
    }, [apiUrl]);

    useEffect(() => { cargarConfiguracion(); }, [cargarConfiguracion]);

    const guardarConfiguracion = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/biometria/configuracion`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configuracion)
            });
            if (res.ok) {
                showAlert('¡Guardado!', 'Políticas de seguridad actualizadas. Los cambios aplican de inmediato.', 'success');
                onClose();
            } else { showAlert('Error', 'No se pudo guardar la configuración.', 'error'); }
        } catch (error) { showAlert('Error', 'Verifica tu conexión a internet.', 'error'); }
        setIsSubmitting(false);
    };

    const toggleArray = (campo, valor) => {
        setConfiguracion(prev => {
            const arr = prev[campo] || [];
            return {
                ...prev,
                [campo]: arr.includes(valor) ? arr.filter(item => item !== valor) : [...arr, valor]
            };
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <form onSubmit={guardarConfiguracion} className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                <div className="bg-slate-800 p-6 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <Settings className="text-blue-400" size={28} />
                        <div>
                            <h3 className="text-xl font-black">Configuración de Seguridad</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Políticas MDM y Correos</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <XCircle size={28} />
                    </button>
                </div>
                
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-slate-50 max-h-[70vh]">
                    
                    {/* INTERRUPTOR PRINCIPAL MDM */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl mt-1"><Smartphone size={24} /></div>
                            <div className="flex-1">
                                <h4 className="font-black text-lg text-slate-800">Control de Dispositivos (MDM)</h4>
                                <p className="text-sm font-medium text-slate-500 mb-4">Si lo enciendes, podrás bloquear el acceso o restringir pantallas a los empleados que intenten entrar desde equipos no registrados.</p>
                                <label className="flex items-center cursor-pointer relative w-fit">
                                    <input 
                                        type="checkbox" className="sr-only"
                                        checked={configuracion.control_dispositivos_activo}
                                        onChange={(e) => setConfiguracion({...configuracion, control_dispositivos_activo: e.target.checked})}
                                    />
                                    <div className={`w-14 h-8 rounded-full transition-colors ${configuracion.control_dispositivos_activo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                        <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform shadow-md ${configuracion.control_dispositivos_activo ? 'translate-x-7' : 'translate-x-1'}`}></div>
                                    </div>
                                    <span className={`ml-4 font-black ${configuracion.control_dispositivos_activo ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {configuracion.control_dispositivos_activo ? 'MDM Activado' : 'MDM Apagado'}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* REGLAS DINÁMICAS (Solo se ven si MDM está encendido) */}
                    {configuracion.control_dispositivos_activo && (
                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                            
                            {/* BLOQUEO TOTAL DE LOGIN */}
                            <div className="bg-white p-6 rounded-3xl border-2 border-orange-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                                <h4 className="font-black text-slate-800 mb-2 flex items-center gap-2">
                                    <Users className="text-orange-500" size={18}/> Bloqueo estricto de inicio de sesión
                                </h4>
                                <p className="text-xs font-bold text-slate-500 mb-4">Los roles que selecciones aquí <strong className="text-red-500">NO PODRÁN</strong> ni siquiera iniciar sesión si no están físicamente en un equipo registrado de la empresa.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {ROLES_DISPONIBLES.map(rol => (
                                        <label key={rol.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition-colors">
                                            <input type="checkbox" checked={configuracion.roles_restringidos.includes(rol.id)} onChange={() => toggleArray('roles_restringidos', rol.id)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                                            <span className="text-sm font-bold text-slate-700">{rol.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* BLOQUEO VISUAL DE PANTALLAS */}
                            <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <h4 className="font-black text-slate-800 mb-2 flex items-center gap-2">
                                    <Monitor className="text-blue-500" size={18}/> Ocultar pantallas (Candado 🔒)
                                </h4>
                                <p className="text-xs font-bold text-slate-500 mb-4">Si un empleado sí logra iniciar sesión desde su celular (porque su rol no está bloqueado arriba), el sistema le prohibirá abrir estas pantallas:</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {PANTALLAS_DISPONIBLES.map(pantalla => (
                                        <label key={pantalla.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition-colors">
                                            <input type="checkbox" checked={configuracion.pantallas_restringidas.includes(pantalla.id)} onChange={() => toggleArray('pantallas_restringidas', pantalla.id)} className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500" />
                                            <span className="text-sm font-bold text-slate-700">{pantalla.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SERVIDOR SMTP */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm opacity-60 hover:opacity-100 transition-opacity">
                        <h4 className="font-black text-lg text-slate-800 mb-2 flex items-center gap-2"><Mail className="text-slate-400" size={20} /> Servidor de Correos (SMTP)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Host SMTP</label>
                                <input type="text" value={configuracion.smtp_host} onChange={(e) => setConfiguracion({...configuracion, smtp_host: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Puerto</label>
                                <input type="text" value={configuracion.smtp_port} onChange={(e) => setConfiguracion({...configuracion, smtp_port: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Usuario / Correo</label>
                                <input type="email" value={configuracion.smtp_user} onChange={(e) => setConfiguracion({...configuracion, smtp_user: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Contraseña</label>
                                <input type="password" value={configuracion.smtp_pass} onChange={(e) => setConfiguracion({...configuracion, smtp_pass: e.target.value})} placeholder="Solo llenar si deseas cambiarla" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-blue-500" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-slate-100 flex justify-end shrink-0">
                    <button disabled={isSubmitting} type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
                        {isSubmitting ? 'Guardando...' : <><Save size={18}/> Guardar Configuración</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ModalConfigSeguridad;