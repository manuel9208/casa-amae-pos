import React, { useState, useEffect, useCallback } from 'react';
import { Settings, XCircle, Smartphone, Mail, Save, Users, Lock, ChevronDown } from 'lucide-react';

// 👇 FIX WARNING ESLint: Se saca PANTALLAS_POR_ROL fuera del componente porque
// es un objeto estático (no depende de props/state). Al vivir a nivel de módulo,
// su referencia nunca cambia entre renders, por lo que no necesita declararse
// como dependencia de cargarConfiguracion (evita además recrear el callback
// en cada render innecesariamente).
const PANTALLAS_POR_ROL = {
    admin: ['admin', 'caja', 'cocina', 'repartidor', 'empleado'],
    gerente: ['admin', 'caja', 'cocina', 'empleado'],
    jefe: ['caja', 'cocina', 'empleado'],
    cajero: ['caja', 'empleado'],
    cocina: ['cocina', 'empleado'],
    repartidor: ['repartidor', 'empleado'],
    ayudante_cocina: ['empleado'],
};

const ModalConfigSeguridad = ({ apiUrl, showAlert, onClose }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [configuracion, setConfiguracion] = useState({
        control_dispositivos_activo: false,
        // 👇 CAMBIO: roles_restringidos ahora es un array de OBJETOS
        // [{ rol: 'cajero', pantallas_excepcion: ['empleado'] }] en vez de un
        // array plano de strings. Cada rol bloqueado conserva qué pantallas
        // SÍ puede seguir abriendo fuera del equipo oficial (mínimo: Portal).
        roles_restringidos: [],
        // pantallas_restringidas se conserva solo por compatibilidad hacia atrás
        // (ya no se edita desde esta pantalla, quedó reemplazada por las
        // excepciones de pantalla por rol de abajo).
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

    const PANTALLAS_LABELS = {
        admin: 'Panel Admin',
        caja: 'Caja (POS)',
        cocina: 'Cocina (KDS)',
        repartidor: 'Logística Reparto',
        empleado: 'Portal del Empleado'
    };

    const cargarConfiguracion = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/biometria/configuracion`);
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    // 👇 NUEVO: Migración suave en memoria. Si la BD todavía trae el
                    // formato viejo (array de strings, ej. ['cajero','cocina']),
                    // lo convertimos aquí mismo al nuevo formato de objetos para
                    // no romper la pantalla mientras se vuelve a guardar.
                    const rolesCrudos = Array.isArray(data.roles_restringidos) ? data.roles_restringidos : [];
                    const rolesNormalizados = rolesCrudos.map(item => {
                        if (typeof item === 'string') {
                            return { rol: item, pantallas_excepcion: ['empleado'] };
                        }
                        const pantallasRol = PANTALLAS_POR_ROL[item.rol] || ['empleado'];
                        const excepcion = Array.isArray(item.pantallas_excepcion) ? item.pantallas_excepcion : ['empleado'];
                        return {
                            rol: item.rol,
                            pantallas_excepcion: Array.from(new Set(['empleado', ...excepcion])).filter(p => pantallasRol.includes(p))
                        };
                    });

                    setConfiguracion(prev => ({ 
                        ...prev, ...data, 
                        roles_restringidos: rolesNormalizados,
                        pantallas_restringidas: data.pantallas_restringidas || [],
                        smtp_pass: '' 
                    }));
                }
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
                showAlert('¡Guardado!', 'Políticas de seguridad y asistencia actualizadas.', 'success');
                onClose();
            } else { showAlert('Error', 'No se pudo guardar la configuración.', 'error'); }
        } catch (error) { showAlert('Error', 'Verifica tu conexión a internet.', 'error'); }
        setIsSubmitting(false);
    };

    // 👇 NUEVO: Reemplaza a la antigua toggleArray() para roles_restringidos.
    // Marcar un rol lo agrega con su excepción mínima ('empleado' obligatoria).
    // Desmarcarlo lo retira por completo (acceso libre total fuera del equipo).
    const toggleRolRestringido = (rolId) => {
        setConfiguracion(prev => {
            const existe = prev.roles_restringidos.some(r => r.rol === rolId);
            if (existe) {
                return { ...prev, roles_restringidos: prev.roles_restringidos.filter(r => r.rol !== rolId) };
            }
            return {
                ...prev,
                roles_restringidos: [...prev.roles_restringidos, { rol: rolId, pantallas_excepcion: ['empleado'] }]
            };
        });
    };

    // 👇 NUEVO: Alterna una pantalla de excepción dentro de un rol ya marcado.
    // 'empleado' (Portal del Empleado) es innegociable y nunca se puede quitar.
    const togglePantallaExcepcion = (rolId, pantallaId) => {
        if (pantallaId === 'empleado') return;
        setConfiguracion(prev => ({
            ...prev,
            roles_restringidos: prev.roles_restringidos.map(r => {
                if (r.rol !== rolId) return r;
                const tiene = r.pantallas_excepcion.includes(pantallaId);
                return {
                    ...r,
                    pantallas_excepcion: tiene
                        ? r.pantallas_excepcion.filter(p => p !== pantallaId)
                        : [...r.pantallas_excepcion, pantallaId]
                };
            })
        }));
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
                            
                            {/* BLOQUEO ESTRICTO FUERA DEL EQUIPO OFICIAL (por Rol + Excepciones de Pantalla) */}
                            <div className="bg-white p-6 rounded-3xl border-2 border-orange-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                                <h4 className="font-black text-slate-800 mb-2 flex items-center gap-2">
                                    <Users className="text-orange-500" size={18}/> Bloqueo estricto fuera del equipo oficial
                                </h4>
                                <p className="text-xs font-bold text-slate-500 mb-4">
                                    Los roles que marques aquí <strong className="text-orange-600">solo podrán abrir las pantallas que selecciones</strong> cuando NO estén en un equipo registrado de la empresa (esto no afecta la matriz de "Equipos Autorizados", que siempre manda primero).
                                </p>
                                <div className="space-y-2">
                                    {ROLES_DISPONIBLES.map(rol => {
                                        const reglaRol = configuracion.roles_restringidos.find(r => r.rol === rol.id);
                                        const marcado = !!reglaRol;
                                        const pantallasDelRol = PANTALLAS_POR_ROL[rol.id] || ['empleado'];
                                        return (
                                            <div key={rol.id} className={`rounded-2xl border transition-colors ${marcado ? 'border-orange-200 bg-orange-50/50' : 'border-transparent hover:border-slate-100 hover:bg-slate-50'}`}>
                                                <label className="flex items-center gap-2 p-3 cursor-pointer">
                                                    <input type="checkbox" checked={marcado} onChange={() => toggleRolRestringido(rol.id)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                                                    <span className="text-sm font-bold text-slate-700 flex-1">{rol.label}</span>
                                                    {marcado && <ChevronDown size={16} className="text-orange-400" />}
                                                </label>

                                                {marcado && (
                                                    <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-2 duration-200">
                                                        <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-2">Pantallas que SÍ puede abrir fuera de la empresa:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {pantallasDelRol.map(pantallaId => {
                                                                const esFija = pantallaId === 'empleado';
                                                                const activa = esFija || reglaRol.pantallas_excepcion.includes(pantallaId);
                                                                return (
                                                                    <button
                                                                        key={pantallaId}
                                                                        type="button"
                                                                        disabled={esFija}
                                                                        onClick={() => togglePantallaExcepcion(rol.id, pantallaId)}
                                                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border-2 ${
                                                                            activa ? 'bg-emerald-100 text-emerald-700 border-emerald-400' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                                                        } ${esFija ? 'opacity-90 cursor-default' : 'cursor-pointer'}`}
                                                                    >
                                                                        {esFija && <Lock size={11} />} {PANTALLAS_LABELS[pantallaId] || pantallaId}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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