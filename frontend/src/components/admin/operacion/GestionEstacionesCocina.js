import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Loader2, Tag, X } from 'lucide-react';
import io from 'socket.io-client';

// ==========================================
// 🏭 COMPONENTE AISLADO: Gestión de Estaciones de Cocina (Capacidad de Producción)
// Consume /api/cocina/estaciones y /api/clasificaciones. No toca productoController
// ni clasificacionController — solo LEE clasificaciones y amarra por clasificacion_id.
// ==========================================
const GestionEstacionesCocina = ({ apiUrl, showAlert }) => {
    const [estaciones, setEstaciones] = useState([]);
    const [clasificaciones, setClasificaciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardandoId, setGuardandoId] = useState(null);
    const [nuevaEstacionNombre, setNuevaEstacionNombre] = useState('');
    const [creando, setCreando] = useState(false);
    const [selectorAbierto, setSelectorAbierto] = useState(null);

    const cargarDatos = useCallback(async () => {
        try {
            const [resEst, resClas] = await Promise.all([
                fetch(`${apiUrl}/cocina/estaciones?t=${Date.now()}`),
                fetch(`${apiUrl}/clasificaciones?t=${Date.now()}`)
            ]);
            if (resEst.ok) setEstaciones(await resEst.json());
            if (resClas.ok) setClasificaciones(await resClas.json());
        } catch (error) {
            console.error("Error al cargar estaciones de cocina:", error);
        } finally {
            setCargando(false);
        }
    }, [apiUrl]);

    useEffect(() => {
        cargarDatos();
        const baseUrl = apiUrl.replace('/api', '');
        const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
        socket.on('cocina_estaciones_actualizadas', cargarDatos);
        socket.on('catalogo_actualizado', cargarDatos);
        return () => socket.disconnect();
    }, [apiUrl, cargarDatos]);

    const handleCambiarCampo = (estacionId, campo, valor) => {
        setEstaciones(prev => prev.map(e => e.id === estacionId ? { ...e, [campo]: valor } : e));
    };

    const guardarEstacion = async (estacion) => {
        setGuardandoId(estacion.id);
        try {
            const res = await fetch(`${apiUrl}/cocina/estaciones/${estacion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: estacion.nombre,
                    capacidad_maxima_paralela: Number(estacion.capacidad_maxima_paralela) || 5,
                    ventana_minutos: Number(estacion.ventana_minutos) || 15
                })
            });
            if (res.ok) {
                showAlert && showAlert('¡Guardado!', `La estación "${estacion.nombre}" se actualizó correctamente.`, 'success');
                cargarDatos();
            } else {
                showAlert && showAlert('Error', 'No se pudo guardar la estación.', 'error');
            }
        } catch (error) {
            showAlert && showAlert('Error', 'Fallo de conexión al guardar.', 'error');
        }
        setGuardandoId(null);
    };

    const crearEstacion = async () => {
        if (!nuevaEstacionNombre.trim()) return;
        setCreando(true);
        try {
            const res = await fetch(`${apiUrl}/cocina/estaciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nuevaEstacionNombre.trim(), capacidad_maxima_paralela: 5, ventana_minutos: 15 })
            });
            if (res.ok) {
                setNuevaEstacionNombre('');
                cargarDatos();
            } else {
                showAlert && showAlert('Error', 'No se pudo crear la estación.', 'error');
            }
        } catch (error) {
            showAlert && showAlert('Error', 'Fallo de conexión al crear.', 'error');
        }
        setCreando(false);
    };

    const eliminarEstacion = async (estacion) => {
        try {
            const res = await fetch(`${apiUrl}/cocina/estaciones/${estacion.id}`, { method: 'DELETE' });
            if (res.ok) {
                showAlert && showAlert('Eliminada', `La estación "${estacion.nombre}" fue eliminada. Sus clasificaciones recibirán una nueva estación automática.`, 'success');
                cargarDatos();
            }
        } catch (error) {
            showAlert && showAlert('Error', 'No se pudo eliminar la estación.', 'error');
        }
    };

    const asignarClasificacion = async (estacionId, clasificacionId) => {
        try {
            const res = await fetch(`${apiUrl}/cocina/estaciones/${estacionId}/asignar-clasificacion`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clasificacion_id: clasificacionId })
            });
            if (res.ok) {
                setSelectorAbierto(null);
                cargarDatos();
            }
        } catch (error) {
            showAlert && showAlert('Error', 'No se pudo asignar la clasificación.', 'error');
        }
    };

    const idsClasificadas = new Set(estaciones.flatMap(e => e.clasificaciones.map(c => c.id)));
    const clasificacionesSinEstacion = clasificaciones.filter(c => !idsClasificadas.has(c.id));

    if (cargando) {
        return (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                <Loader2 size={24} className="animate-spin" />
                <span className="font-bold">Cargando estaciones de cocina...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {clasificacionesSinEstacion.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-xs font-bold">
                    Estas clasificaciones aún no tienen estación: {clasificacionesSinEstacion.map(c => c.nombre).join(', ')}.
                    Se les asignará una automáticamente la próxima vez que Cocina cargue datos en vivo.
                </div>
            )}

            {estaciones.map(estacion => (
                <div key={estacion.id} className="border-2 border-slate-100 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                        <input
                            type="text"
                            value={estacion.nombre}
                            onChange={e => handleCambiarCampo(estacion.id, 'nombre', e.target.value)}
                            className="font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500 flex-1"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Capacidad</label>
                                <input
                                    type="number" min="1"
                                    value={estacion.capacidad_maxima_paralela}
                                    onChange={e => handleCambiarCampo(estacion.id, 'capacidad_maxima_paralela', e.target.value)}
                                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-black text-center outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Min</label>
                                <input
                                    type="number" min="1"
                                    value={estacion.ventana_minutos}
                                    onChange={e => handleCambiarCampo(estacion.id, 'ventana_minutos', e.target.value)}
                                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-black text-center outline-none focus:border-cyan-500"
                                />
                            </div>
                            <button
                                onClick={() => guardarEstacion(estacion)}
                                disabled={guardandoId === estacion.id}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-lg transition active:scale-95 disabled:opacity-50"
                                title="Guardar cambios"
                            >
                                {guardandoId === estacion.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            </button>
                            <button
                                onClick={() => eliminarEstacion(estacion)}
                                className="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded-lg transition active:scale-95"
                                title="Eliminar estación"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {estacion.clasificaciones.map(c => (
                            <span key={c.id} className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold">
                                <Tag size={12} /> {c.nombre}
                            </span>
                        ))}

                        {selectorAbierto === estacion.id ? (
                            <div className="flex items-center gap-1">
                                <select
                                    onChange={e => { if (e.target.value) asignarClasificacion(estacion.id, Number(e.target.value)); }}
                                    className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-cyan-500"
                                    defaultValue=""
                                >
                                    <option value="" disabled>Elige clasificación...</option>
                                    {clasificaciones.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                                <button onClick={() => setSelectorAbierto(null)} className="text-slate-400 hover:text-red-500">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setSelectorAbierto(estacion.id)}
                                className="inline-flex items-center gap-1 border-2 border-dashed border-slate-200 text-slate-400 hover:border-cyan-400 hover:text-cyan-600 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                            >
                                <Plus size={12} /> Agregar clasificación
                            </button>
                        )}
                    </div>
                </div>
            ))}

            <div className="flex items-center gap-2 pt-2">
                <input
                    type="text"
                    placeholder="Nombre de la nueva estación (ej: Freidora, Parrilla...)"
                    value={nuevaEstacionNombre}
                    onChange={e => setNuevaEstacionNombre(e.target.value)}
                    className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-cyan-500"
                />
                <button
                    onClick={crearEstacion}
                    disabled={creando || !nuevaEstacionNombre.trim()}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition disabled:opacity-50 flex items-center gap-2"
                >
                    <Plus size={16} /> Crear
                </button>
            </div>
        </div>
    );
};

export default GestionEstacionesCocina;