import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Fingerprint, Trash2, AlertCircle } from 'lucide-react';

const GestorHuellasClientes = ({ apiUrl, showAlert }) => {
    const [clientes, setClientes] = useState([]);
    const [busqueda, setBusqueda] = useState('');

    const cargarClientes = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/clientes`);
            if (res.ok) setClientes(await res.json());
        } catch (error) { console.error("Error al cargar clientes", error); }
    }, [apiUrl]);

    useEffect(() => { cargarClientes(); }, [cargarClientes]);

    const eliminarHuella = async (cliente) => {
        if (!window.confirm(`¿Estás seguro de resetear la huella de ${cliente.nombre}? Tendrá que volver a registrarla desde su celular en su próxima visita.`)) return;

        try {
            const res = await fetch(`${apiUrl}/huellas/cliente/${cliente.id}`, { method: 'DELETE' });
            if (res.ok) {
                showAlert('Huella Reseteada', 'Se ha eliminado la credencial biométrica del cliente.', 'success');
                cargarClientes();
            } else {
                showAlert('Error', 'No se pudo eliminar la huella.', 'error');
            }
        } catch (error) {
            showAlert('Error', 'Fallo de conexión.', 'error');
        }
    };

    const filtrados = clientes.filter(c => 
        (c.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) || 
        (c.telefono || '').includes(busqueda)
    );

    return (
        <div className="animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Users className="text-purple-500" /> Directorio de Clientes
                    </h2>
                    <p className="text-sm font-medium text-slate-500">Visualiza quiénes ya usan Passkeys o resetea sus accesos.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" placeholder="Buscar por nombre o celular..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-purple-500 transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtrados.map(cli => (
                    <div key={cli.id} className={`p-5 rounded-2xl border transition-shadow flex flex-col justify-between ${cli.tiene_huella ? 'bg-purple-50/30 border-purple-100' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-full font-black text-xl flex items-center justify-center shrink-0 ${cli.tiene_huella ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
                                {cli.nombre ? cli.nombre.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h3 className="font-black text-slate-800 leading-tight truncate">{cli.nombre || 'Cliente Sin Nombre'} {cli.apellido || ''}</h3>
                                <p className="text-xs font-bold tracking-widest text-slate-400 mt-0.5">{cli.telefono}</p>
                            </div>
                        </div>
                        
                        {cli.tiene_huella ? (
                            <div className="flex gap-2">
                                <div className="flex-1 py-2.5 bg-purple-100 text-purple-700 font-black rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-default">
                                    <Fingerprint size={16} /> Huella Activa
                                </div>
                                <button onClick={() => eliminarHuella(cli)} className="px-4 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors" title="Resetear Huella">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        ) : (
                            <div className="w-full py-2.5 bg-slate-50 text-slate-400 font-bold rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-default border border-slate-100">
                                <AlertCircle size={16} /> Sin huella vinculada
                            </div>
                        )}
                    </div>
                ))}
                
                {filtrados.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <Users size={40} className="mx-auto mb-3 opacity-20 text-slate-800" />
                        <p className="text-slate-400 font-bold">No se encontraron clientes.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GestorHuellasClientes;