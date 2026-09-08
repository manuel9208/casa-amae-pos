import React, { useState } from 'react';
import { ArrowLeft, Package, Layers, Tag, Search } from 'lucide-react';
import ImagenCachada from '../../../../ImagenCachada';

const CatalogoMayoreo = ({
    articulos,
    categoriaActiva,
    setCategoriaActiva,
    categoriasUnicas,
    carrito,
    baseUrl,
    onSelectArticulo // 👈 Recibe la acción del padre
}) => {
    const [busqueda, setBusqueda] = useState('');
    const enModoBusqueda = busqueda.trim() !== '';

    const articulosFiltrados = articulos.filter(art => {
        const isAgotadoFisico = art.usa_stock && Number(art.stock_actual) <= 0;
        if (art.disponible === false || art.disponible === 'false' || isAgotadoFisico) return false;

        if (enModoBusqueda) {
            return art.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                   art.categoria.toLowerCase().includes(busqueda.toLowerCase());
        }
        return categoriaActiva ? art.categoria === categoriaActiva : false;
    });

    return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200 w-full">
            
            <div className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 bg-white shrink-0 shadow-sm z-10 w-full">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {categoriaActiva && !enModoBusqueda && (
                        <button
                            onClick={() => { setCategoriaActiva(null); setBusqueda(''); }}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs md:text-sm rounded-xl transition flex items-center gap-2 active:scale-95 shrink-0"
                        >
                            <ArrowLeft size={16} /> Volver
                        </button>
                    )}
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                            {enModoBusqueda ? 'Resultados de Búsqueda' : (categoriaActiva ? categoriaActiva : 'Catálogo B2B')}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 hidden sm:block">
                            {enModoBusqueda ? 'Buscando en todos los productos...' : 'Agrega artículos a la orden por volumen.'}
                        </p>
                    </div>
                </div>

                <div className="relative w-full sm:w-96 shrink-0">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar en todo el catálogo..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 font-bold outline-none focus:border-indigo-500 transition-colors text-slate-700 shadow-sm"
                    />
                </div>
            </div>

            {!categoriaActiva && !enModoBusqueda ? (
                <div className="flex-1 w-full p-4 md:p-6 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 md:gap-6 content-start overflow-y-auto custom-scrollbar bg-slate-50/50">
                    {categoriasUnicas.map(cat => {
                        const totalArticulos = articulos.filter(a => a.categoria === cat && a.disponible !== false && a.disponible !== 'false' && !(a.usa_stock && Number(a.stock_actual) <= 0)).length;
                        return (
                            <button
                                key={cat}
                                onClick={() => setCategoriaActiva(cat)}
                                className="bg-white rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center gap-4 hover:shadow-xl hover:border-indigo-200 transition-all border border-slate-100 group active:scale-95 min-h-[160px]"
                            >
                                <div className="bg-indigo-50 text-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                    <Layers size={32} />
                                </div>
                                <div className="text-center">
                                    <span className="font-black text-lg md:text-xl text-slate-700 block leading-tight group-hover:text-indigo-600 transition-colors">
                                        {cat}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        {totalArticulos} Artículos
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="flex-1 w-full p-4 md:p-6 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 md:gap-6 content-start overflow-y-auto custom-scrollbar pb-32 bg-slate-50/50">
                    {articulosFiltrados.length === 0 ? (
                        <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                            <Package size={48} className="mx-auto text-slate-300 mb-4 opacity-50"/>
                            <p className="text-slate-400 font-bold">No se encontraron artículos disponibles.</p>
                        </div>
                    ) : (
                        articulosFiltrados.map(art => {
                            const isAgotado = art.usa_stock && Number(art.stock_actual) <= 0;
                            let preciosList = [];
                            try { preciosList = typeof art.precios === 'string' ? JSON.parse(art.precios) : (art.precios || []); } catch(e){}

                            const itemEnCarrito = carrito.find(i => i.articulo_id === art.id);
                            const qty = itemEnCarrito ? itemEnCarrito.cantidad : 0;

                            return (
                                <button
                                    key={art.id}
                                    disabled={isAgotado}
                                    onClick={() => onSelectArticulo(art)}
                                    className={`bg-white rounded-3xl p-5 flex flex-col items-start text-left border shadow-sm transition-all relative min-h-[260px] ${
                                        isAgotado ? 'border-red-200 opacity-70 grayscale cursor-not-allowed' : 'border-slate-100 hover:shadow-md hover:border-indigo-200 active:scale-95'
                                    }`}
                                >
                                    <div className="flex gap-4 w-full mb-3 border-b border-slate-100 pb-3">
                                        <div className="bg-indigo-50 text-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100 shrink-0 overflow-hidden">
                                            {art.imagen_url ? (
                                                <ImagenCachada src={art.imagen_url.startsWith('http') ? art.imagen_url : `${baseUrl}${art.imagen_url}`} alt={art.nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-3xl">{art.emoji || '📦'}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-slate-800 text-base md:text-lg leading-tight break-words">
                                                {art.nombre}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <Tag size={10}/> {art.equivalencia} {art.unidad_medida}
                                                </span>
                                                {art.usa_stock && (
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 border ${isAgotado ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                        <Package size={10}/> Stock: {Number(art.stock_actual).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100/50 mb-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">
                                            Precios por Volumen / Cliente
                                        </p>
                                        <div className="space-y-1">
                                            {preciosList.slice(0, 3).map((p, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500 font-bold truncate max-w-[65%]">
                                                        Desde {p.cantidad_minima}: <span className="opacity-70">({p.tipo === 'cliente' ? '👤' : '📦'} {p.nombres.join(', ')})</span>
                                                    </span>
                                                    <span className="font-black text-indigo-700">${Number(p.precio).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Indicador visual de Carrito si ya lo tiene */}
                                    {qty > 0 && (
                                        <div className="w-full mt-auto bg-indigo-50 border border-indigo-200 text-indigo-700 font-black rounded-xl p-3 text-center text-sm shadow-inner">
                                            {qty} en la orden
                                        </div>
                                    )}

                                    {isAgotado && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] z-0 pointer-events-none rounded-3xl">
                                            <span className="bg-red-500 text-white font-black px-4 py-2 rounded-xl text-lg uppercase tracking-widest shadow-lg transform -rotate-12">
                                                Agotado
                                            </span>
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default CatalogoMayoreo;