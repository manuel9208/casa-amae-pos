import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, MapPin, Trash2, Plus, ShieldCheck, Settings } from 'lucide-react';
import io from 'socket.io-client';

// Importamos el Modal de Configuración que me compartiste
import ModalConfigAsistencia from './ModalConfigAsistencia';

const GestorRedesGPS = ({ apiUrl, showAlert, showConfirm }) => {
    const [ips, setIps] = useState([]);
    const [ubicaciones, setUbicaciones] = useState([]);
    const [ipInput, setIpInput] = useState('');
    const [descIpInput, setDescIpInput] = useState('');
    const [latInput, setLatInput] = useState('');
    const [lngInput, setLngInput] = useState('');
    const [descGpsInput, setDescGpsInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estado para controlar el Modal de Configuración de Asistencia
    const [modalConfig, setModalConfig] = useState(false);

    const cargarDatos = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/asistencia/configuracion?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                setIps(Array.isArray(data.ips) ? data.ips : []);
                setUbicaciones(Array.isArray(data.ubicaciones) ? data.ubicaciones : []);
            }
        } catch (e) { console.error("Error al cargar redes/GPS:", e); }
    }, [apiUrl]);

    useEffect(() => {
        cargarDatos();
        const baseUrl = apiUrl.replace('/api', '');
        const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
        socket.on('config_asistencia_actualizada', cargarDatos);
        return () => socket.disconnect();
    }, [apiUrl, cargarDatos]);

    // 👇 NUEVA FUNCIÓN: Detectar IP Pública Automáticamente
    const detectarIPActual = async () => {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            setIpInput(data.ip);
            setDescIpInput('Internet de la Sucursal (Auto)');
            showAlert('IP Detectada', `Tu IP pública es: ${data.ip}`, 'success');
        } catch (error) {
            showAlert('Error', 'No se pudo autodetectar la IP. Escríbela manualmente.', 'error');
        }
    };

    const handleAgregarIP = async (e) => {
        e.preventDefault();
        if (!ipInput.trim()) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/asistencia/ips`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: ipInput.trim(), descripcion: descIpInput })
            });
            const data = await res.json();
            if (res.ok) {
                showAlert('¡Éxito!', 'IP registrada correctamente.', 'success');
                setIpInput(''); setDescIpInput('');
                cargarDatos();
            } else {
                showAlert('Error', data.error || 'No se pudo guardar la IP.', 'error');
            }
        } catch (e) { showAlert('Error', 'Fallo de conexión.', 'error'); }
        setIsSubmitting(false);
    };

    const handleEliminarIP = (id, ip) => {
        showConfirm('¿Eliminar IP?', `¿Estás seguro de desautorizar la IP ${ip}?`, async () => {
            try {
                const res = await fetch(`${apiUrl}/asistencia/ips/${id}`, { method: 'DELETE' });
                if (res.ok) { showAlert('Eliminado', 'IP removida.', 'success'); cargarDatos(); }
            } catch (e) { showAlert('Error', 'No se pudo eliminar la IP.', 'error'); }
        });
    };

    const handleAgregarGPS = async (e) => {
        e.preventDefault();
        if (!latInput || !lngInput) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/asistencia/ubicaciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitud: latInput, longitud: lngInput, descripcion: descGpsInput })
            });
            const data = await res.json();
            if (res.ok) {
                showAlert('¡Éxito!', 'Geocerca GPS registrada.', 'success');
                setLatInput(''); setLngInput(''); setDescGpsInput('');
                cargarDatos();
            } else {
                showAlert('Error', data.error || 'No se pudo guardar la geocerca.', 'error');
            }
        } catch (e) { showAlert('Error', 'Fallo de conexión.', 'error'); }
        setIsSubmitting(false);
    };

    const handleEliminarGPS = (id) => {
        showConfirm('¿Eliminar Geocerca?', '¿Eliminar esta ubicación GPS?', async () => {
            try {
                const res = await fetch(`${apiUrl}/asistencia/ubicaciones/${id}`, { method: 'DELETE' });
                if (res.ok) { showAlert('Eliminado', 'Ubicación removida.', 'success'); cargarDatos(); }
            } catch (e) { showAlert('Error', 'No se pudo eliminar la ubicación.', 'error'); }
        });
    };

    const capturarUbicacionActual = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLatInput(pos.coords.latitude.toFixed(8));
                    setLngInput(pos.coords.longitude.toFixed(8));
                    setDescGpsInput('Sucursal Principal (Auto)');
                },
                () => showAlert('GPS Desactivado', 'Permite el acceso a la ubicación en tu navegador.', 'error')
            );
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            
            {/* 👇 TARJETA RECUPERADA: Listas Blancas (Configuración de Asistencia) */}
            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-800">Listas Blancas (Asistencia)</h3>
                        <p className="text-sm font-medium text-slate-500">Administra las ubicaciones y redes Wi-Fi desde donde tus empleados tienen permitido checar.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setModalConfig(true)} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto active:scale-95"
                >
                    <Settings size={18} /> Configuración
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. REDES WI-FI AUTORIZADAS */}
                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Wifi size={24} /></div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-800">Redes Wi-Fi (IP)</h3>
                                    <p className="text-xs font-bold text-slate-400">IPs públicas permitidas para checar</p>
                                </div>
                            </div>
                            <button 
                                    onClick={detectarIPActual} 
                                    type="button" 
                                    className="text-xs font-black bg-amber-50 text-amber-700 hover:bg-amber-100 px-4 py-2 rounded-xl border border-amber-200 transition-colors flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
                                >
                                    <Wifi size={14} /> Detectar IP
                                </button>
                        </div>
                        <form onSubmit={handleAgregarIP} className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input type="text" required placeholder="Ej. 187.251.104.179" value={ipInput} onChange={e => setIpInput(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500" />
                                <input type="text" placeholder="Referencia (ej. Sucursal)" value={descIpInput} onChange={e => setDescIpInput(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500" />
                            </div>
                            <button disabled={isSubmitting} type="submit" className="w-full bg-amber-700 hover:bg-amber-800 text-white font-black py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 active:scale-95 shadow-md"><Plus size={18} /> Agregar IP</button>
                        </form>
                        <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                            {ips.map(item => (
                                <div key={item.id} className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                                    <div><p className="font-black text-sm text-slate-800">{item.ip}</p><p className="text-[10px] font-bold text-slate-400">{item.descripcion || 'Sin descripción'}</p></div>
                                    <button onClick={() => handleEliminarIP(item.id, item.ip)} className="text-slate-400 hover:text-red-500 p-2 rounded-xl transition"><Trash2 size={18} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. GEOCERCAS GPS */}
                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl"><MapPin size={24} /></div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-800">Geocercas (GPS)</h3>
                                    <p className="text-xs font-bold text-slate-400">Coordenadas exactas del local</p>
                                </div>
                            </div>
                            <button onClick={capturarUbicacionActual} type="button" className="text-xs font-black bg-amber-50 text-amber-600 hover:bg-amber-100 px-3 py-2 rounded-xl border border-amber-200 transition flex items-center gap-1.5 active:scale-95"><MapPin size={14} /> Capturar GPS</button>
                        </div>
                        <form onSubmit={handleAgregarGPS} className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" required placeholder="Latitud" value={latInput} onChange={e => setLatInput(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-amber-500" />
                                <input type="text" required placeholder="Longitud" value={lngInput} onChange={e => setLngInput(e.target.value)} className="bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-amber-500" />
                            </div>
                            <input type="text" placeholder="Referencia (ej. Sucursal)" value={descGpsInput} onChange={e => setDescGpsInput(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-amber-500" />
                            <button disabled={isSubmitting} type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 active:scale-95 shadow-md"><Plus size={18} /> Agregar Geocerca</button>
                        </form>
                        <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                            {ubicaciones.map(item => (
                                <div key={item.id} className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                                    <div><p className="font-black text-sm text-slate-800">{item.descripcion || 'Ubicación GPS'}</p><p className="text-[10px] font-bold text-slate-400">Lat: {item.latitud} | Lon: {item.longitud}</p></div>
                                    <button onClick={() => handleEliminarGPS(item.id)} className="text-slate-400 hover:text-red-500 p-2 rounded-xl transition"><Trash2 size={18} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 👇 RENDERIZADO DEL MODAL DE CONFIGURACIÓN */}
            {modalConfig && (
                <ModalConfigAsistencia 
                    apiUrl={apiUrl} 
                    showAlert={showAlert} 
                    onClose={() => setModalConfig(false)} 
                    onSaved={cargarDatos} 
                />
            )}
        </div>
    );
};

export default GestorRedesGPS;