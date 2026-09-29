import React, { useState, useEffect, useCallback } from 'react';
import { Settings, XCircle, ShieldCheck, Save, Clock } from 'lucide-react';

const ModalConfigAsistencia = ({ apiUrl, showAlert, onClose, onSaved }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [configGeneral, setConfigGeneral] = useState({
        tipo_registro: ['portal'],
        metodo_portal: 'ambos',
        validacion_activa: 'ninguna',
        rango_metros: 50
    });

    const cargarDatos = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/asistencia/configuracion`);
            if (res.ok) {
                const data = await res.json();
                if (data.general) {
                    let tipoReg = data.general.tipo_registro;
                    if (typeof tipoReg === 'string') {
                        try { tipoReg = JSON.parse(tipoReg); } catch(e) { tipoReg = ['portal']; }
                    }
                    if (!Array.isArray(tipoReg)) tipoReg = ['portal'];

                    setConfigGeneral({
                        ...data.general,
                        tipo_registro: tipoReg,
                        metodo_portal: data.general.metodo_portal || 'ambos'
                    });
                }
            }
        } catch (error) {
            console.error("Error al cargar configuración:", error);
        }
    }, [apiUrl]);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    const toggleTipoRegistro = (valor) => {
        let actual = Array.isArray(configGeneral.tipo_registro) ? [...configGeneral.tipo_registro] : ['portal'];
        if (actual.includes(valor)) {
            actual = actual.filter(item => item !== valor);
        } else {
            actual.push(valor);
        }
        setConfigGeneral({ ...configGeneral, tipo_registro: actual });
    };

    const isMetodoActivo = (valor) => {
        return Array.isArray(configGeneral.tipo_registro) && configGeneral.tipo_registro.includes(valor);
    };

    const guardarConfiguracion = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/asistencia/configuracion`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configGeneral)
            });
            if (res.ok) {
                showAlert('¡Guardado!', 'Las reglas de asistencia se actualizaron correctamente.', 'success');
                if (onSaved) onSaved();
                onClose();
            } else {
                showAlert('Error', 'No se pudo guardar la configuración.', 'error');
            }
        } catch (error) {
            showAlert('Error', 'Problema de conexión con el servidor.', 'error');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
            <form onSubmit={guardarConfiguracion} className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                
                <div className="bg-slate-800 p-6 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <Settings className="text-emerald-400" size={28} />
                        <div>
                            <h3 className="text-xl font-black">Reglas de Asistencia</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Políticas de Restricción</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <XCircle size={28} />
                    </button>
                </div>

                <div className="p-6 md:p-8 bg-slate-50 flex-1 space-y-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
                    
                    {/* BLOQUE 1: SELECCIÓN DE MÉTODOS HABILITADOS */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h4 className="font-black text-lg text-slate-800 mb-2 flex items-center gap-2">
                            <Clock className="text-blue-500" size={20} /> Métodos de Reloj Checador Habilitados
                        </h4>
                        <p className="text-xs font-bold text-slate-500 mb-6">Selecciona una o varias formas permitidas para registrar asistencia:</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isMetodoActivo('zkteco') ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-100'}`}>
                                <input type="checkbox" checked={isMetodoActivo('zkteco')} onChange={() => toggleTipoRegistro('zkteco')} className="w-5 h-5 accent-blue-600 rounded" />
                                <div className="flex-1">
                                    <span className="font-black text-slate-700 block text-sm">ZKTeco K40</span>
                                    <span className="text-[10px] font-bold text-slate-500 leading-none">Reloj biométrico externo</span>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isMetodoActivo('login') ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-100'}`}>
                                <input type="checkbox" checked={isMetodoActivo('login')} onChange={() => toggleTipoRegistro('login')} className="w-5 h-5 accent-blue-600 rounded" />
                                <div className="flex-1">
                                    <span className="font-black text-slate-700 block text-sm">Inicio de Sesión</span>
                                    <span className="text-[10px] font-bold text-slate-500 leading-none">Automático al loguearse</span>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isMetodoActivo('portal') ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-100'}`}>
                                <input type="checkbox" checked={isMetodoActivo('portal')} onChange={() => toggleTipoRegistro('portal')} className="w-5 h-5 accent-blue-600 rounded" />
                                <div className="flex-1">
                                    <span className="font-black text-slate-700 block text-sm">Portal del Empleado</span>
                                    <span className="text-[10px] font-bold text-slate-500 leading-none">Ingreso manual validado</span>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isMetodoActivo('nfc') ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-100'}`}>
                                <input type="checkbox" checked={isMetodoActivo('nfc')} onChange={() => toggleTipoRegistro('nfc')} className="w-5 h-5 accent-blue-600 rounded" />
                                <div className="flex-1">
                                    <span className="font-black text-slate-700 block text-sm">NFC (Gafete/Pulsera)</span>
                                    <span className="text-[10px] font-bold text-slate-500 leading-none">Lectura por contacto</span>
                                </div>
                            </label>
                        </div>

                        {/* SUB-OPCIONES PORTAL */}
                        {isMetodoActivo('portal') && (
                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2">
                                <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3">MÉTODOS PERMITIDOS EN EL PORTAL</p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="metodo_portal" value="ambos" checked={configGeneral.metodo_portal === 'ambos'} onChange={(e) => setConfigGeneral({...configGeneral, metodo_portal: e.target.value})} className="accent-blue-600" />
                                        <span className="text-xs font-bold text-slate-700">Ambos (PIN y Huella)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="metodo_portal" value="pin" checked={configGeneral.metodo_portal === 'pin'} onChange={(e) => setConfigGeneral({...configGeneral, metodo_portal: e.target.value})} className="accent-blue-600" />
                                        <span className="text-xs font-bold text-slate-700">Solo PIN Manual</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="metodo_portal" value="huella" checked={configGeneral.metodo_portal === 'huella'} onChange={(e) => setConfigGeneral({...configGeneral, metodo_portal: e.target.value})} className="accent-blue-600" />
                                        <span className="text-xs font-bold text-slate-700">Solo Huella Digital</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* BLOQUE 2: SEGURIDAD (GPS Y RED IP OBLIGATORIAS PARA PORTAL O NFC) */}
                    {(isMetodoActivo('portal') || isMetodoActivo('nfc')) && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 rounded-2xl shrink-0 bg-emerald-100 text-emerald-600">
                                    <ShieldCheck size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-lg text-slate-800 leading-tight mb-1">Restringir Check-In (Seguridad Activa)</h4>
                                    <p className="text-xs font-bold text-slate-500">Al usar el Portal o NFC, es obligatorio validar que el dispositivo esté en la sucursal.</p>
                                </div>
                            </div>

                            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">¿Qué método deseas exigir?</label>
                                    <select 
                                        value={configGeneral.validacion_activa === 'ninguna' ? 'ambas' : configGeneral.validacion_activa} 
                                        onChange={e => setConfigGeneral({...configGeneral, validacion_activa: e.target.value})}
                                        className="w-full bg-white border border-slate-200 rounded-xl p-4 font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
                                    >
                                        <option value="ambas">Exigir Ambas (IP + GPS Exacto)</option>
                                        <option value="ubicacion">Exigir solo por Ubicación (GPS)</option>
                                        <option value="ip">Exigir solo por Red Wi-Fi (IP)</option>
                                    </select>
                                </div>

                                {['ubicacion', 'ambas'].includes(configGeneral.validacion_activa === 'ninguna' ? 'ambas' : configGeneral.validacion_activa) && (
                                    <div className="animate-in zoom-in-95 mt-4">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tolerancia del GPS (En Metros)</label>
                                        <input 
                                            type="number" min="5" 
                                            value={configGeneral.rango_metros || 50} 
                                            onChange={e => setConfigGeneral({...configGeneral, rango_metros: e.target.value})}
                                            className="w-full bg-white border border-slate-200 rounded-xl p-4 font-black text-emerald-600 outline-none focus:border-emerald-500 text-xl text-center shadow-sm"
                                        />
                                        <p className="text-[10px] font-bold text-slate-400 mt-3 leading-relaxed text-center">
                                            Recomendado: 50 a 100 metros. Compensa fallas en la señal satelital del equipo.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white border-t border-slate-100 flex justify-end shrink-0">
                    <button disabled={isSubmitting} type="submit" className="w-full sm:w-auto px-8 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 active:scale-95">
                        {isSubmitting ? 'Guardando...' : <><Save size={20}/> Guardar Reglas</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ModalConfigAsistencia;