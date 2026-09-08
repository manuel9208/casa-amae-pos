import React, { useState } from 'react';
import ImagenCachada from '../../../../ImagenCachada';  

const ModalCantidadMayoreo = ({ articulo, onClose, agregarAlCarrito, baseUrl }) => {
    const [cantidadInput, setCantidadInput] = useState('');  

    if (!articulo) return null;  

    const confirmarAgregar = (e) => {
        e.preventDefault();
        if (!cantidadInput || Number(cantidadInput) <= 0) return;
        agregarAlCarrito(articulo, Number(cantidadInput));
        setCantidadInput('');
        onClose();
    };  

    let preciosListModal = [];
    try { preciosListModal = typeof articulo.precios === 'string' ? JSON.parse(articulo.precios) : (articulo.precios || []); } catch(e){}  

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <form onSubmit={confirmarAgregar} className="bg-white p-6 md:p-8 rounded-[36px] shadow-2xl w-full max-w-sm text-center border border-slate-100 animate-in zoom-in-95 flex flex-col max-h-[90vh]">  
                <div className="overflow-y-auto custom-scrollbar flex-1 mb-2 px-2">
                    <div className="flex justify-center mb-5">
                        {articulo.imagen_url ? (
                            <ImagenCachada
                                src={articulo.imagen_url.startsWith('http') ? articulo.imagen_url : `${baseUrl}${articulo.imagen_url}`}
                                alt={articulo.nombre}
                                className="w-32 h-32 rounded-3xl object-cover shadow-md border border-slate-100"
                            />
                        ) : (
                            <div className="bg-indigo-100 text-indigo-600 w-28 h-28 rounded-[28px] flex items-center justify-center shadow-inner border border-indigo-200">
                                <span className="text-6xl">{articulo.emoji || '📦'}</span>
                            </div>
                        )}
                    </div>  

                    <h2 className="text-2xl font-black text-slate-800 mb-2 leading-tight break-words">
                        {articulo.nombre}
                    </h2>  

                    {articulo.descripcion && (
                        <p className="text-sm font-bold text-slate-500 mb-6 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            {articulo.descripcion}
                        </p>
                    )}  

                    {preciosListModal.length > 0 && (
                        <div className="bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100 mt-4 text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 pl-1">
                                Precios Escalonados
                            </p>
                            <div className="space-y-1.5">
                                {preciosListModal.map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="text-slate-600 font-bold">
                                            {p.tipo === 'cliente' ? '👤 Cliente: ' : '📦 A partir de '}
                                            <span className="text-indigo-900 font-black">{p.nombres.join(', ')}</span>
                                        </span>
                                        <span className="font-black text-indigo-700">${Number(p.precio).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}  

                    <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100 mt-4 shadow-inner">
                        <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">
                            Cantidad a agregar ({articulo.unidad_medida})
                        </label>
                        <input
                            type="number"
                            step="any"
                            min="0.1"
                            max={articulo.usa_stock ? articulo.stock_actual : undefined} // 👈 Previene que usando las flechitas pase el límite
                            autoFocus
                            required
                            value={cantidadInput}
                            onChange={e => {
                                let val = e.target.value;
                                if (val !== '' && Number(val) <= 0) val = '';
                                
                                // 👇 FIX: Tope automático al stock máximo físico disponible
                                if (articulo.usa_stock && val !== '' && Number(val) > Number(articulo.stock_actual)) {
                                    val = articulo.stock_actual.toString();
                                }

                                setCantidadInput(val);
                            }}
                            className="w-full bg-white border-2 border-indigo-200 focus:border-indigo-600 rounded-2xl p-4 text-center text-4xl font-black outline-none transition-all text-indigo-900 shadow-sm"
                            placeholder="Ej. 10"
                        />
                        {articulo.usa_stock && (
                            <p className="text-xs font-bold text-indigo-400 mt-3">
                                Stock Físico: {Number(articulo.stock_actual).toFixed(2)}
                            </p>
                        )}
                    </div>
                </div>  

                <div className="flex gap-3 shrink-0 pt-4 border-t border-slate-100 mt-2">
                    <button type="button" onClick={() => { setCantidadInput(''); onClose(); }} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95 border border-slate-200">
                        Cancelar
                    </button>
                    <button type="submit" disabled={!cantidadInput || Number(cantidadInput) <= 0} className="flex-[2] py-4 bg-indigo-600 text-white font-black text-lg rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition active:scale-95 disabled:opacity-50">
                        Agregar a Orden
                    </button>
                </div>
            </form>
        </div>
    );
};  

export default ModalCantidadMayoreo;