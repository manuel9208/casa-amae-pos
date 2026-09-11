import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Fingerprint, Search, CheckCircle2 } from 'lucide-react';
import { useBiometria } from '../../../hooks/useBiometria';

const GestorHuellasEmpleados = ({ apiUrl, showAlert }) => {
    const [empleados, setEmpleados] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const { registrarHuella } = useBiometria(apiUrl, showAlert);

    const cargarEmpleados = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/usuarios`);
            if (res.ok) setEmpleados(await res.json());
        } catch (error) { console.error("Error al cargar empleados", error); }
    }, [apiUrl]);

    useEffect(() => { cargarEmpleados(); }, [cargarEmpleados]);

    const handleVincularHuella = async (empleado) => {
        const exito = await registrarHuella(empleado.id, null);
        if (exito) {
            cargarEmpleados(); // 👈 Recarga la lista para que el botón se ponga verde inmediatamente
        }
    };

    const filtrados = empleados.filter(e => e.nombre.toLowerCase().includes(busqueda.toLowerCase()));

    return (
        <div className="animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="text-emerald-500" /> Plantilla de Empleados
                    </h2>
                    <p className="text-sm font-medium text-slate-500">Selecciona al empleado y pide que toque el sensor de este equipo.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" placeholder="Buscar empleado..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtrados.map(emp => (
                    <div key={emp.id} className={`p-5 rounded-2xl border transition-shadow flex flex-col justify-between ${emp.tiene_huella ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-full font-black text-xl flex items-center justify-center shrink-0 ${emp.tiene_huella ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                {emp.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 leading-tight flex items-center gap-1">
                                    {emp.nombre} {emp.tiene_huella && <CheckCircle2 size={14} className="text-emerald-500"/>}
                                </h3>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{emp.rol}</p>
                            </div>
                        </div>
                        
                        {emp.tiene_huella ? (
                            <button onClick={() => handleVincularHuella(emp)} className="w-full py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-black rounded-xl text-sm flex justify-center items-center gap-2 transition-all active:scale-95">
                                <CheckCircle2 size={16} /> Huella Vinculada (Reemplazar)
                            </button>
                        ) : (
                            <button onClick={() => handleVincularHuella(emp)} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-sm flex justify-center items-center gap-2 transition-all active:scale-95 shadow-lg shadow-slate-900/20">
                                <Fingerprint size={16} /> Vincular Huella
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GestorHuellasEmpleados;