import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, ArrowRight, ArrowLeft, Package, CheckSquare, Square } from 'lucide-react';
import ImagenCachada from '../ImagenCachada';
import ModalPersonalizar from './ModalPersonalizar';

const ModalArmarCombo = ({
    comboEnEspera,
    setComboEnEspera,
    carrito,
    setCarrito,
    productos,
    baseUrl = '',
    setItemAEditar,
    catalogoIngredientes,
    clasificaciones,
    configGlobal
}) => {
    const { productoPersonalizado, configuracion, itemAEditar } = comboEnEspera;
    
    const grupos = useMemo(() => {
        let configData = configuracion.configuracion_grupos;
        if (typeof configData === 'string') configData = JSON.parse(configData);
        return Array.isArray(configData) ? configData : (configData?.grupos || []);
    }, [configuracion]);

    const [pasoActual, setPasoActual] = useState(0);
    const [selecciones, setSelecciones] = useState({});
    const [subProductoEnEspera, setSubProductoEnEspera] = useState(null);

    // 🛡️ ESCUDO ANTI-DOBLE-CLIC
    const [isSubmitting, setIsSubmitting] = useState(false);

    const cerrarModal = () => setComboEnEspera(null);
    const grupoActual = grupos[pasoActual];

    const opcionesGrupoActual = useMemo(() => {
        if (!grupoActual) return [];
        if (grupoActual.tipo_seleccion === 'categoria') {
            return productos.filter(p => p.categoria === grupoActual.categoria);
        } else {
            return productos.filter(p => grupoActual.productos_ids?.includes(p.id));
        }
    }, [grupoActual, productos]);

    const seleccionesGrupoActual = selecciones[grupoActual?.id] || [];
    const limiteAlcanzado = seleccionesGrupoActual.length >= grupoActual?.limite;

    const agregarSeleccion = (producto) => {
        const actuales = selecciones[grupoActual.id] || [];

        // 👇 FIX: Si el límite es > 1 y ya se alcanzó, bloqueamos. Si es 1, dejamos pasar para reemplazar (Swap).
        if (grupoActual.limite > 1 && limiteAlcanzado) return;

        const tieneOpciones = producto.opciones && producto.opciones.length > 0;
        const categoriaItem = producto.categoria || '';
        const extrasDelSistema = (catalogoIngredientes || []).filter(i => 
            (i.clasificacion_nombre === categoriaItem || i.es_extra || i.tipo === 'extra') && 
            i.permite_extra !== false
        );

        const requierePersonalizacion = tieneOpciones || extrasDelSistema.length > 0;
        
        if (requierePersonalizacion) {
            const clonSeguro = JSON.parse(JSON.stringify(producto));
            const varsBaseHijo = grupoActual.variaciones_base_productos?.[producto.id] || {};
            clonSeguro._variacionesBaseComboHijo = varsBaseHijo;
            setSubProductoEnEspera(clonSeguro);
        } else {
            // 👇 FIX UX: Reemplazo automático si el límite es 1
            const nuevoArreglo = grupoActual.limite === 1 ? [JSON.parse(JSON.stringify(producto))] : [...actuales, JSON.parse(JSON.stringify(producto))];
            
            setSelecciones({
                ...selecciones,
                [grupoActual.id]: nuevoArreglo
            });
        }
    };

    const removerSeleccion = (producto, e) => {
        if (e) e.stopPropagation();
        const actuales = selecciones[grupoActual.id] || [];
        const reversedIndex = actuales.slice().reverse().findIndex(p => (p.idRaw || p.id) === producto.id);
        
        if (reversedIndex !== -1) {
            const realIndex = actuales.length - 1 - reversedIndex;
            const nuevos = [...actuales];
            nuevos.splice(realIndex, 1);
            setSelecciones({
                ...selecciones,
                [grupoActual.id]: nuevos
            });
        }
    };

    const avanzarPaso = () => { if (pasoActual < grupos.length - 1) setPasoActual(pasoActual + 1); };
    const retrocederPaso = () => { if (pasoActual > 0) setPasoActual(pasoActual - 1); };

    const agregarAlCarrito = () => {
        if (isSubmitting) return;
        setIsSubmitting(true); 
        
        // Creamos el ID de Grupo que amarra al Padre con los Hijos
        const comboGroupId = itemAEditar?._comboGroupId || (Date.now().toString() + Math.random().toString(36).substr(2, 5));
        const itemsAInsertar = [];
        const timestamp = Date.now().toString();
        
        // 1. El platillo Padre
        const itemPadre = {
            ...productoPersonalizado,
            _comboGroupId: comboGroupId,
            precioFinal: productoPersonalizado.precioFinal, 
            extras: [...(productoPersonalizado.extras || [])]
        };
        itemsAInsertar.push(itemPadre);
        
        // 2. Iteramos los grupos para agregar los platillos hijos
        grupos.forEach(g => {
            const seleccionadosDelGrupo = selecciones[g.id] || [];
            
            seleccionadosDelGrupo.forEach((p, index) => {
                const varsBaseHijo = g.variaciones_base_productos?.[p.idRaw || p.id] || {};
                const hashRef = Math.random().toString(36).substr(2, 4).toUpperCase();
                
                // Nota que los hace únicos para el Kiosco
                const notaUnica = { nombre: `🔗 Ref: ${hashRef}`, precioExtra: 0, tipo: 'nota' };
                // Nota visual idéntica a la Caja
                const notaCombo = { nombre: `📦 Combo: ${configuracion.nombre}`, precioExtra: 0, tipo: 'nota' };

                if (p._isCustomizedChild) {
                    const hijoPersonalizado = {
                        ...p,
                        idTicket: `${timestamp}_${g.id}_${index}_${hashRef}`,
                        _comboGroupId: comboGroupId, 
                        _isCustomizedChild: true,    
                        _variacionesBaseComboHijo: varsBaseHijo,
                        extras: [notaCombo, ...(p.extras || []), notaUnica]
                    };
                    itemsAInsertar.push(hijoPersonalizado);
                } else {
                    const destinoObj = (clasificaciones || []).find(c => c.nombre === (p.categoria || 'General'));
                    const destinoReal = destinoObj ? destinoObj.destino : 'Cocina';
                    
                    const hijoDirecto = {
                        idTicket: `${timestamp}_${g.id}_${index}_${hashRef}`,
                        id: p.id,
                        producto_id: p.id,
                        nombre: `[${p.categoria || 'General'}] ${p.nombre}`,
                        categoria: p.categoria,
                        destino: destinoReal,
                        tiempo_preparacion: p.tiempo_preparacion,
                        precio_base: 0,
                        precioFinal: 0,
                        cantidad: 1,
                        opciones: p.opciones || [],
                        extras: [notaCombo, notaUnica],
                        usa_stock: p.usa_stock === true || String(p.usa_stock) === 'true',
                        stock_preparado: Number(p.stock_preparado) || 0,
                        configuracionOriginal: {},
                        _isCustomizedChild: true, 
                        _variacionesBaseComboHijo: varsBaseHijo,
                        _comboGroupId: comboGroupId 
                    };
                    itemsAInsertar.push(hijoDirecto);
                }
            });
        });
        
        setCarrito(prev => {
            if (itemAEditar) {
                // Borramos todo el bloque del combo usando la bandera de Caja
                const carritoSinViejos = prev.filter(i => i._comboGroupId !== comboGroupId);
                return [...carritoSinViejos, ...itemsAInsertar];
            } else {
                return [...prev, ...itemsAInsertar];
            }
        });
        
        if (setItemAEditar) setItemAEditar(null);
        setTimeout(() => {
            setIsSubmitting(false);
            cerrarModal();
        }, 150);
    };

    if (!grupoActual) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[40px] p-6 md:p-8 max-w-3xl w-full shadow-2xl border border-slate-100 flex flex-col h-[85vh] animate-in zoom-in-95 relative">
                
                <button onClick={cerrarModal} disabled={isSubmitting} className="absolute top-6 right-6 p-2 bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-500 rounded-full transition z-10 disabled:opacity-50">
                    <X size={24} />
                </button>

                <div className="text-center mb-6 shrink-0 relative px-8">
                    <div className="bg-indigo-100 text-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Package size={32} />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight mb-1">{configuracion.nombre}</h2>
                    <p className="text-blue-600 font-black text-xl">${Number(productoPersonalizado.precioFinal).toFixed(2)}</p>
                </div>

                <div className="flex justify-center gap-2 mb-6 shrink-0">
                    {grupos.map((_, i) => (
                        <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === pasoActual ? 'w-8 bg-indigo-600' : i < pasoActual ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-200'}`} />
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
                    <div className="text-center mb-6 animate-in slide-in-from-right">
                        <h3 className="text-xl font-black text-slate-700 uppercase tracking-widest">{grupoActual.nombre}</h3>
                        <p className="text-indigo-600 font-bold text-sm mt-1 bg-indigo-50 inline-block px-4 py-1 rounded-full border border-indigo-100">
                            Seleccionados: {seleccionesGrupoActual.length} de {grupoActual.limite}
                        </p>
                    </div>

                    {opcionesGrupoActual.length === 0 ? (
                        <p className="text-center text-slate-400 font-bold p-8 bg-slate-50 rounded-3xl">No hay productos disponibles en este grupo.</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in slide-in-from-bottom-4">
                            {opcionesGrupoActual.map(p => {
                                const cantidadSeleccionada = seleccionesGrupoActual.filter(sel => (sel.idRaw || sel.id) === p.id).length;
                                const estaSeleccionado = cantidadSeleccionada > 0;
                                
                                // 👇 FIX UX: No deshabilitamos los botones si el límite es 1, para permitir intercambiarlos
                                const disabled = (limiteAlcanzado && cantidadSeleccionada === 0 && grupoActual.limite > 1) || isSubmitting;

                                return (
                                    <div key={p.id} className="relative">
                                        <button
                                            disabled={disabled}
                                            onClick={() => {
                                                // Si el límite es 1 y vuelven a tocar el mismo, lo deselecciona. Si no, lo cambia.
                                                if (grupoActual.limite === 1 && estaSeleccionado) {
                                                    removerSeleccion(p);
                                                } else {
                                                    agregarSeleccion(p);
                                                }
                                            }}
                                            className={`w-full p-4 rounded-3xl border-2 transition-all font-bold flex flex-col items-center text-center relative ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : 'active:scale-95'} ${estaSeleccionado ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-md transform scale-[1.02]' : 'border-slate-100 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/30'}`}
                                        >
                                            <div className={`absolute top-3 left-3 ${estaSeleccionado ? 'text-indigo-600' : 'text-slate-300'}`}>
                                                {estaSeleccionado ? (
                                                    grupoActual.limite === 1 ? <CheckCircle2 size={20}/> : <CheckSquare size={20}/>
                                                ) : (
                                                    grupoActual.limite === 1 ? <div className="w-5 h-5 border-2 border-slate-300 rounded-full" /> : <Square size={20}/>
                                                )}
                                            </div>
                                            
                                            {p.imagen_url ? (
                                                <ImagenCachada src={p.imagen_url?.startsWith('http') ? p.imagen_url : `${baseUrl}${p.imagen_url}`} alt={p.nombre} className="w-16 h-16 rounded-full object-cover shadow-sm mb-3"/>
                                            ) : (
                                                <span className="text-4xl mb-3">{p.emoji || '🍽️'}</span>
                                            )}
                                            <span className="text-sm leading-tight">{p.nombre}</span>
                                        </button>

                                        {/* 👇 FIX VISUAL: SOLO MUESTRA LOS CONTROLES + y - SI EL LÍMITE ES MAYOR A 1 */}
                                        {estaSeleccionado && grupoActual.limite > 1 && (
                                            <div className="absolute top-2 right-2 flex items-center bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden z-10 animate-in zoom-in-90">
                                                <button onClick={(e) => removerSeleccion(p, e)} className="px-3 py-1.5 bg-slate-50 text-red-500 font-black hover:bg-red-50 transition">-</button>
                                                <span className="px-2 font-black text-slate-700">{cantidadSeleccionada}</span>
                                                <button disabled={limiteAlcanzado} onClick={(e) => { e.stopPropagation(); agregarSeleccion(p); }} className="px-3 py-1.5 bg-slate-50 text-indigo-600 font-black hover:bg-indigo-50 transition disabled:opacity-50">+</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 shrink-0 flex gap-3">
                    <button 
                        onClick={retrocederPaso} 
                        disabled={pasoActual === 0 || isSubmitting}
                        className="w-16 md:w-24 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition disabled:opacity-30 flex items-center justify-center shrink-0"
                    >
                        <ArrowLeft size={24}/>
                    </button>

                    {pasoActual < grupos.length - 1 ? (
                        <button 
                            onClick={avanzarPaso} 
                            disabled={!limiteAlcanzado || isSubmitting}
                            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none active:scale-95 text-lg"
                        >
                            Siguiente <ArrowRight size={20}/>
                        </button>
                    ) : (
                        <button 
                            onClick={agregarAlCarrito} 
                            disabled={!limiteAlcanzado || isSubmitting}
                            className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none active:scale-95 text-lg"
                        >
                            <CheckCircle2 size={24}/> {isSubmitting ? 'Agregando...' : 'Terminar y Agregar'}
                        </button>
                    )}
                </div>

                {subProductoEnEspera && (
                    <ModalPersonalizar
                        key={`sub-modal-combo-${subProductoEnEspera.id}`}
                        productoEnEspera={[subProductoEnEspera]}
                        setProductoEnEspera={setSubProductoEnEspera} 
                        catalogoIngredientes={catalogoIngredientes}
                        clasificaciones={clasificaciones}
                        configGlobal={configGlobal}
                        isSubItemCombo={true} 
                        onSuccessOverride={(customItem) => {
                            customItem._isCustomizedChild = true;
                            customItem.idRaw = subProductoEnEspera.id;
                            
                            // 👇 FIX UX: Si el límite es 1, al guardar la personalización borramos lo viejo (Swap)
                            const actuales = grupoActual.limite === 1 ? [] : (selecciones[grupoActual.id] || []);
                            
                            setSelecciones({
                                ...selecciones,
                                [grupoActual.id]: [...actuales, customItem]
                            });
                            setSubProductoEnEspera(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default ModalArmarCombo;