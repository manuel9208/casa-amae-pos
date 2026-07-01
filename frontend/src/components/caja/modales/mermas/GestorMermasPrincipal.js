import React, { useState } from 'react';
import { XCircle, Trash2, Utensils, Layers, PackageMinus } from 'lucide-react';
import MermaPlatillo from './MermaPlatillo';
import MermaReceta from './MermaReceta';
import MermaInsumo from './MermaInsumo';

const GestorMermasPrincipal = ({ 
    modalMermas, setModalMermas, insumosDB, productos, clasificaciones, 
    apiUrl, user, cargarDataDinamica, setAlertaCaja 
}) => {
    const [tipoMerma, setTipoMerma] = useState(null); // 'Platillo', 'Receta', 'Insumo'
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!modalMermas) return null;

    const procesarMermaAlBackend = async (payload) => {
        if(isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/mermas`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({...payload, usuario_id: user.id, origen: 'Caja'})
            });
            if(res.ok) {
                setAlertaCaja({ titulo: 'Merma Registrada', mensaje: 'El inventario y los costos se han ajustado correctamente.', tipo: 'success' });
                setModalMermas(false);
                setTipoMerma(null);
                cargarDataDinamica();
            } else {
                const err = await res.json();
                setAlertaCaja({ titulo: 'Error', mensaje: err.error || 'No se pudo registrar la merma.', tipo: 'error' });
            }
        } catch(e) {
            setAlertaCaja({ titulo: 'Error', mensaje: 'Fallo de conexión.', tipo: 'error' });
        }
        setIsSubmitting(false);
    };

    const cerrar = () => {
        setTipoMerma(null);
        setModalMermas(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[150] p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl border-4 border-red-500 overflow-hidden relative flex flex-col animate-in zoom-in-95 max-h-[90vh]">
                
                <button onClick={cerrar} disabled={isSubmitting} className="absolute top-5 right-5 text-slate-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm transition-all z-10 disabled:opacity-50">
                    <XCircle size={28} />
                </button>

                {!tipoMerma ? (
                    <div className="p-8 md:p-12 text-center overflow-y-auto custom-scrollbar">
                        <div className="bg-red-100 text-red-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Trash2 size={48} />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-2 tracking-tight">Reportar Merma</h2>
                        <p className="text-slate-500 font-medium mb-10 text-sm md:text-base">¿Qué tipo de producto se desperdició, caducó o echó a perder?</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button onClick={() => setTipoMerma('Platillo')} className="bg-slate-50 hover:bg-orange-50 border-2 border-slate-100 hover:border-orange-400 text-slate-700 hover:text-orange-700 p-6 rounded-3xl transition-all group flex flex-col items-center gap-4">
                                <Utensils size={40} className="text-orange-500 group-hover:scale-110 transition-transform"/>
                                <span className="font-black text-xl">Platillo Terminado</span>
                                <span className="text-xs font-bold text-slate-400">Se preparó pero se cayó o canceló.</span>
                            </button>
                            <button onClick={() => setTipoMerma('Receta')} className="bg-slate-50 hover:bg-purple-50 border-2 border-slate-100 hover:border-purple-400 text-slate-700 hover:text-purple-700 p-6 rounded-3xl transition-all group flex flex-col items-center gap-4">
                                <Layers size={40} className="text-purple-500 group-hover:scale-110 transition-transform"/>
                                <span className="font-black text-xl">Sub-Receta / Base</span>
                                <span className="text-xs font-bold text-slate-400">Ej. Una olla de arroz, masa o salsa echada a perder.</span>
                            </button>
                            <button onClick={() => setTipoMerma('Insumo')} className="bg-slate-50 hover:bg-emerald-50 border-2 border-slate-100 hover:border-emerald-400 text-slate-700 hover:text-emerald-700 p-6 rounded-3xl transition-all group flex flex-col items-center gap-4">
                                <PackageMinus size={40} className="text-emerald-500 group-hover:scale-110 transition-transform"/>
                                <span className="font-black text-xl">Insumo Crudo</span>
                                <span className="text-xs font-bold text-slate-400">Materia prima directa de almacén.</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setTipoMerma(null)} disabled={isSubmitting} className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 font-black text-xs text-slate-600 hover:text-blue-600 transition active:scale-95 disabled:opacity-50">← Volver</button>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Mermar {tipoMerma}</h3>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white custom-scrollbar">
                            {tipoMerma === 'Platillo' && <MermaPlatillo productos={productos} clasificaciones={clasificaciones} procesarMerma={procesarMermaAlBackend} isSubmitting={isSubmitting}/>}
                            {tipoMerma === 'Receta' && <MermaReceta productos={productos} procesarMerma={procesarMermaAlBackend} isSubmitting={isSubmitting}/>}
                            {tipoMerma === 'Insumo' && <MermaInsumo insumosDB={insumosDB} procesarMerma={procesarMermaAlBackend} isSubmitting={isSubmitting}/>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GestorMermasPrincipal;