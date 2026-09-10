import React, { useState, useEffect } from 'react';
import { ShieldCheck, Fingerprint, Search } from 'lucide-react';
import { useBiometria } from '../../../hooks/useBiometria';

const GestorHuellasEmpleados = ({ apiUrl, showAlert }) => {
    const [empleados, setEmpleados] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const { registrarHuella } = useBiometria(apiUrl, showAlert);

    useEffect(() => {
        const cargarEmpleados = async () => {
            try {
                const res = await fetch(`${apiUrl}/usuarios`);
                if (res.ok) setEmpleados(await res.json());
            } catch (error) {
                console.error("Error al cargar empleados", error);
            }
        };
        cargarEmpleados();
    }, [apiUrl]);

    const handleVincularHuella = async (empleado) => {
        // Ejecutamos el Hook que abre el escáner físico de la tablet/celular
        await registrarHuella(empleado.id, null);
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
                        type="text" 
                        placeholder="Buscar empleado..." 
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtrados.map(emp => (
                    <div key={emp.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 font-black text-xl flex items-center justify-center shrink-0">
                                {emp.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 leading-tight">{emp.nombre}</h3>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{emp.rol}</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => handleVincularHuella(emp)}
                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-sm flex justify-center items-center gap-2 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
                        >
                            <Fingerprint size={16} /> Vincular Huella
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GestorHuellasEmpleados;