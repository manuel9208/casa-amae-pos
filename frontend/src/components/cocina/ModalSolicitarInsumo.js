import React, { useState } from 'react';
import { PackagePlus } from 'lucide-react';  

const ModalSolicitarInsumo = ({ setModalInsumo, catalogoIngredientes, apiUrl, user, pedidos }) => {
    const [insumoSelect, setInsumoSelect] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [guardando, setGuardando] = useState(false);  

    const enviarSolicitud = async (e) => {
        e.preventDefault();
        if (!insumoSelect || !cantidad || guardando) return;
        setGuardando(true);  
        try {
            // Buscamos un pedido activo para colgarle la alerta de forma segura para que Caja lo vea.
            const pedActivo = pedidos.find(p => ['Pagado', 'Preparando', 'Por Confirmar'].includes(p.estado_preparacion));
            
            if (!pedActivo) {
                alert("No hay pedidos activos a donde anclar la alerta. Avisa por voz a caja.");
                setModalInsumo(false);
                return;
            }

            const mensaje = `🚨 COCINA SOLICITA ALMACÉN: Traer ${cantidad} de ${insumoSelect}. Urgente para producción.`;
            
            await fetch(`${apiUrl}/pedidos/${pedActivo.id}/alerta`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alerta_cocina: `[SOLICITUD] Empleado: ${user.nombre}. ${mensaje}` })
            });

            alert("Solicitud enviada a la caja correctamente.");
            setModalInsumo(false);
        } catch (e) { alert("Error de red."); }
        setGuardando(false);
    };  

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <form onSubmit={enviarSolicitud} className="bg-slate-800 p-8 rounded-[40px] shadow-2xl w-full max-w-md border border-slate-700 text-left">
                <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-2"><PackagePlus className="text-blue-500"/> Solicitar Insumo</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-6">Notificar a Caja / Almacén</p>  
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Seleccionar Artículo</label>
                        <select required value={insumoSelect} onChange={e=>setInsumoSelect(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white font-bold cursor-pointer focus:border-blue-500">
                            <option value="">Buscar en catálogo...</option>
                            {[...new Set(catalogoIngredientes.map(i => i.nombre))].sort().map(nombre => (
                                <option key={nombre} value={nombre}>{nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cantidad Necesaria</label>
                        <input required type="text" placeholder="Ej: 2 Kilos, 3 Cajas, 5 Piezas" value={cantidad} onChange={e=>setCantidad(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white font-bold focus:border-blue-500" />
                    </div>
                </div>  
                <div className="flex gap-4">
                    <button type="button" onClick={() => setModalInsumo(false)} className="flex-1 py-4 bg-slate-700 text-white font-black rounded-2xl hover:bg-slate-600 transition active:scale-95">Cancelar</button>
                    <button type="submit" disabled={guardando} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-50">Enviar Pedido</button>
                </div>
            </form>
        </div>
    );
};  

export default ModalSolicitarInsumo;