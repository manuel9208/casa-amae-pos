import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, Monitor, ShieldAlert, CheckCircle2, Trash2, Edit3, Save, XCircle, Users } from 'lucide-react';

const GestorDispositivos = ({ apiUrl, showAlert }) => {
    const [equipos, setEquipos] = useState([]);
    const [miId] = useState(localStorage.getItem('pos_device_id') || '');
    const [editandoId, setEditandoId] = useState(null);
    const [equipoTemporal, setEquipoTemporal] = useState(null);

    const PANTALLAS_POSIBLES = ['caja', 'cocina', 'kiosco', 'repartidor', 'tv', 'empleado', 'admin'];
    const ROLES_POSIBLES = ['cajero', 'cocina', 'repartidor', 'jefe', 'gerente', 'ayudante_cocina'];

    const cargarEquipos = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/biometria/equipos`);
            if (res.ok) setEquipos(await res.json());
        } catch (error) { console.error(error); }
    }, [apiUrl]);

    useEffect(() => { cargarEquipos(); }, [cargarEquipos]);

    const registrarEsteEquipo = async () => {
        try {
            const res = await fetch(`${apiUrl}/biometria/equipos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    device_id: miId, 
                    alias: 'Tablet Nueva', 
                    pantallas_permitidas: ['empleado'],
                    roles_permitidos: ['cajero', 'cocina', 'jefe']
                })
            });
            if (res.ok) {
                const nuevoEquipo = await res.json();
                showAlert('Registrado', 'Dispositivo añadido. Por favor ponle un nombre y asignale sus roles.', 'success');
                await cargarEquipos();
                iniciarEdicion(nuevoEquipo);
            }
        } catch (error) { showAlert('Error', 'No se pudo registrar el equipo.', 'error'); }
    };

    const iniciarEdicion = (eq) => {
        setEditandoId(eq.id);
        setEquipoTemporal({ ...eq, pantallas_permitidas: eq.pantallas_permitidas || [], roles_permitidos: eq.roles_permitidos || [] });
    };

    const toggleArray = (campo, valor) => {
        setEquipoTemporal(prev => {
            const arr = prev[campo] || [];
            return { ...prev, [campo]: arr.includes(valor) ? arr.filter(p => p !== valor) : [...arr, valor] };
        });
    };

    const guardarEdicion = async () => {
        if (!equipoTemporal.alias.trim()) return showAlert('Error', 'El equipo debe tener un nombre', 'error');
        try {
            const res = await fetch(`${apiUrl}/biometria/equipos/${equipoTemporal.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(equipoTemporal)
            });
            if (res.ok) {
                setEditandoId(null);
                cargarEquipos();
            }
        } catch (error) { showAlert('Error', 'Fallo al actualizar el equipo', 'error'); }
    };

    const eliminarEquipo = async (id, alias) => {
        if (!window.confirm(`¿Estás seguro de eliminar "${alias}"?`)) return;
        try {
            const res = await fetch(`${apiUrl}/biometria/equipos/${id}`, { method: 'DELETE' });
            if (res.ok) cargarEquipos();
        } catch (error) { showAlert('Error', 'No se pudo eliminar.', 'error'); }
    };

    return (
        <div className="animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100 pb-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Monitor className="text-blue-500" /> Dispositivos Oficiales (MDM)</h2>
                    <p className="text-sm font-medium text-slate-500">Configura nombre, pantallas y roles autorizados por cada equipo físico.</p>
                </div>
                {!equipos.some(e => e.device_id === miId) && (
                    <button onClick={registrarEsteEquipo} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black shadow-lg mt-4 md:mt-0 flex items-center gap-2">
                        <Smartphone size={18}/> Registrar Este Equipo
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {equipos.map(eq => {
                    const isEditing = editandoId === eq.id;
                    const data = isEditing ? equipoTemporal : eq;
                    
                    return (
                        <div key={eq.id} className={`p-6 rounded-[32px] border-2 flex flex-col gap-6 transition-all ${isEditing ? 'border-amber-400 bg-amber-50 shadow-xl' : eq.device_id === miId ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                            
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    {isEditing ? (
                                        <input 
                                            type="text" autoFocus value={data.alias} onChange={e => setEquipoTemporal({...data, alias: e.target.value})}
                                            className="w-full max-w-sm bg-white border-2 border-amber-300 rounded-xl px-4 py-2 font-black text-lg text-slate-800 outline-none focus:border-amber-500"
                                            placeholder="Nombre del Equipo..."
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-xl text-slate-800">{data.alias}</h3>
                                            {eq.device_id === miId && <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">ESTE EQUIPO</span>}
                                        </div>
                                    )}
                                    <p className="text-xs font-bold text-slate-400 mt-1 tracking-widest uppercase">Hardware ID: {data.device_id}</p>
                                </div>
                                
                                <div className="flex gap-2">
                                    {isEditing ? (
                                        <>
                                            <button onClick={() => setEditandoId(null)} className="p-3 bg-white text-slate-500 hover:text-red-500 rounded-xl shadow-sm border"><XCircle size={20} /></button>
                                            <button onClick={guardarEdicion} className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md border-amber-600 font-bold flex items-center gap-2"><Save size={20} /> Guardar</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => iniciarEdicion(eq)} className="p-3 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl"><Edit3 size={20} /></button>
                                            <button onClick={() => eliminarEquipo(eq.id, eq.alias)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={20} /></button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200/60">
                                
                                {/* MATRIZ: PANTALLAS */}
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Monitor size={14}/> Pantallas Visibles</p>
                                    <div className="flex flex-wrap gap-2">
                                        {PANTALLAS_POSIBLES.map(p => {
                                            const activo = (data.pantallas_permitidas || []).includes(p);
                                            return (
                                                <button key={p} disabled={!isEditing} onClick={() => toggleArray('pantallas_permitidas', p)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border-2 ${activo ? 'bg-emerald-100 text-emerald-700 border-emerald-500' : 'bg-slate-50 text-slate-400 border-transparent'} ${isEditing && !activo ? 'hover:border-slate-300 cursor-pointer' : ''}`}
                                                >
                                                    {activo ? <CheckCircle2 size={12}/> : <ShieldAlert size={12}/>} {p}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* MATRIZ: ROLES */}
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Users size={14}/> Roles Autorizados a usarla</p>
                                    <div className="flex flex-wrap gap-2">
                                        {ROLES_POSIBLES.map(r => {
                                            const activo = (data.roles_permitidos || []).includes(r);
                                            return (
                                                <button key={r} disabled={!isEditing} onClick={() => toggleArray('roles_permitidos', r)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border-2 ${activo ? 'bg-blue-100 text-blue-700 border-blue-500' : 'bg-slate-50 text-slate-400 border-transparent'} ${isEditing && !activo ? 'hover:border-slate-300 cursor-pointer' : ''}`}
                                                >
                                                    {activo ? <CheckCircle2 size={12}/> : <ShieldAlert size={12}/>} {r.replace('_', ' ')}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default GestorDispositivos;