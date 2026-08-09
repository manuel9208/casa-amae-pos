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
    // 💡 RECIBIMOS EL PRODUCTO YA PERSONALIZADO Y CON PRECIO CALCULADO
    const { productoPersonalizado, configuracion, itemAEditar } = comboEnEspera;
    
    // ADAPTADO PARA LEER EL NUEVO FORMATO DE OBJETO JSONB DE LOS COMBOS
    const grupos = useMemo(() => {
        let configData = configuracion.configuracion_grupos;
        if (typeof configData === 'string') configData = JSON.parse(configData);
        // Soporta la estructura antigua (array directo) y la nueva (objeto con .grupos)
        return Array.isArray(configData) ? configData : (configData?.grupos || []);
    }, [configuracion]);

    const [pasoActual, setPasoActual] = useState(0);
    const [selecciones, setSelecciones] = useState({});
    
    // Estado para anidar el personalizador de los platillos hijos
    const [subProductoEnEspera, setSubProductoEnEspera] = useState(null);

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

    // 👇 MAGIA: AHORA DETECTA TANTO OPCIONES COMO EXTRAS DEL CATÁLOGO
    const toggleSeleccion = (producto) => {
        const actuales = selecciones[grupoActual.id] || [];
        // Checamos por id o idRaw por si viene ya modificado del personalizador
        const yaEstaSeleccionado = actuales.find(p => (p.idRaw || p.id) === producto.id);

        if (yaEstaSeleccionado) {
            setSelecciones({
                ...selecciones,
                [grupoActual.id]: actuales.filter(p => (p.idRaw || p.id) !== producto.id)
            });
        } else {
            if (limiteAlcanzado) return;

            // 1. Verificamos si el producto tiene opciones internas (tamaños, sabores, quitar ingredientes)
            const tieneOpciones = producto.opciones && producto.opciones.length > 0;
            
            // 2. Verificamos si el producto tiene EXTRAS disponibles en el Catálogo Global
            const categoriaItem = producto.categoria || '';
            const extrasDelSistema = (catalogoIngredientes || []).filter(i => 
                (i.clasificacion_nombre === categoriaItem || i.es_extra || i.tipo === 'extra') && 
                i.permite_extra !== false
            );

            // Si cumple cualquiera de las dos, obligamos a abrir el Personalizador
            const requierePersonalizacion = tieneOpciones || extrasDelSistema.length > 0;
            
            if (requierePersonalizacion) {
                // Abre el Modal Personalizar de este sub-producto
                setSubProductoEnEspera(producto);
            } else {
                setSelecciones({
                    ...selecciones,
                    [grupoActual.id]: [...actuales, producto]
                });
            }
        }
    };

    const avanzarPaso = () => {
        if (pasoActual < grupos.length - 1) {
            setPasoActual(pasoActual + 1);
        }
    };

    const retrocederPaso = () => {
        if (pasoActual > 0) {
            setPasoActual(pasoActual - 1);
        }
    };

    const agregarAlCarrito = () => {
        // Armamos el arreglo de Extras a costo $0 para las bebidas/opciones del combo
        const extrasCombo = [];
        let totalExtrasHijos = 0;

        grupos.forEach(g => {
            const seleccionadosDelGrupo = selecciones[g.id] || [];
            seleccionadosDelGrupo.forEach(p => {
                if (p._isCustomizedChild) {
                    // El hijo fue personalizado. Sumamos su costo extra si lo tiene
                    totalExtrasHijos += p.precioFinal; 

                    extrasCombo.push({
                        nombre: `📦 [Combo] - ${p.nombre}`,
                        precioExtra: p.precioFinal,
                        tipo: 'grupo_opcional'
                    });

                    // Añadimos las variaciones y extras visuales del hijo para la Cocina
                    (p.extras || []).forEach(hijoExtra => {
                        extrasCombo.push({
                            nombre: `   ↳ ${hijoExtra.nombre}`,
                            precioExtra: 0,
                            tipo: 'nota'
                        });
                    });
                } else {
                    extrasCombo.push({
                        nombre: `📦 [Combo] - ${p.nombre}`,
                        precioExtra: 0,
                        tipo: 'grupo_opcional'
                    });
                }
            });
        });

        // 💡 TOMAMOS EL ITEM PERSONALIZADO (Que ya trae las variaciones y extras del Padre) 
        // le inyectamos los hijos y recalculamos sumando el cobro extra de las bebidas
        const itemFinal = {
            ...productoPersonalizado,
            precioFinal: productoPersonalizado.precioFinal + totalExtrasHijos,
            extras: [...(productoPersonalizado.extras || []), ...extrasCombo]
        };

        // Lo mandamos al carrito (Reemplazando si estaba editando o agregando uno nuevo)
        if (itemAEditar) {
            setCarrito(carrito.map(i => i.idTicket === itemAEditar.idTicket ? itemFinal : i));
        } else {
            setCarrito([...carrito, itemFinal]);
        }
        
        if (setItemAEditar) setItemAEditar(null);
        cerrarModal();
    };

    if (!grupoActual) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[40px] p-6 md:p-8 max-w-3xl w-full shadow-2xl border border-slate-100 flex flex-col h-[85vh] animate-in zoom-in-95 relative">
                
                <button onClick={cerrarModal} className="absolute top-6 right-6 p-2 bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-500 rounded-full transition z-10">
                    <X size={24} />
                </button>

                <div className="text-center mb-6 shrink-0 relative px-8">
                    <div className="bg-indigo-100 text-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Package size={32} />
                    </div>
                    {/* 👇 Muestra el nombre del combo y el PRECIO TOTAL REAL ya calculado desde ModalPersonalizar */}
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
                                const estaSeleccionado = seleccionesGrupoActual.some(sel => (sel.idRaw || sel.id) === p.id);
                                const disabled = limiteAlcanzado && !estaSeleccionado;

                                return (
                                    <button
                                        key={p.id}
                                        disabled={disabled}
                                        onClick={() => toggleSeleccion(p)}
                                        className={`p-4 rounded-3xl border-2 transition-all font-bold flex flex-col items-center text-center relative ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : 'active:scale-95'} ${estaSeleccionado ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-md transform scale-[1.02]' : 'border-slate-100 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/30'}`}
                                    >
                                        <div className={`absolute top-3 left-3 ${estaSeleccionado ? 'text-indigo-600' : 'text-slate-300'}`}>
                                            {estaSeleccionado ? <CheckSquare size={20}/> : <Square size={20}/>}
                                        </div>
                                        
                                        {p.imagen_url ? (
                                            <ImagenCachada src={p.imagen_url?.startsWith('http') ? p.imagen_url : `${baseUrl}${p.imagen_url}`} alt={p.nombre} className="w-16 h-16 rounded-full object-cover shadow-sm mb-3"/>
                                        ) : (
                                            <span className="text-4xl mb-3">{p.emoji || '🍽️'}</span>
                                        )}
                                        <span className="text-sm leading-tight">{p.nombre}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 shrink-0 flex gap-3">
                    <button 
                        onClick={retrocederPaso} 
                        disabled={pasoActual === 0}
                        className="w-16 md:w-24 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition disabled:opacity-30 flex items-center justify-center shrink-0"
                    >
                        <ArrowLeft size={24}/>
                    </button>

                    {pasoActual < grupos.length - 1 ? (
                        <button 
                            onClick={avanzarPaso} 
                            disabled={!limiteAlcanzado}
                            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none active:scale-95 text-lg"
                        >
                            Siguiente <ArrowRight size={20}/>
                        </button>
                    ) : (
                        <button 
                            onClick={agregarAlCarrito} 
                            disabled={!limiteAlcanzado}
                            className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none active:scale-95 text-lg"
                        >
                            <CheckCircle2 size={24}/> Terminar y Agregar
                        </button>
                    )}
                </div>

                {/* 👇 AQUI RENDERIZAMOS EL MODAL HIJO ENCIMA DE ESTE */}
                {subProductoEnEspera && (
                    <ModalPersonalizar
                        productoEnEspera={subProductoEnEspera}
                        setProductoEnEspera={setSubProductoEnEspera} 
                        catalogoIngredientes={catalogoIngredientes}
                        clasificaciones={clasificaciones}
                        configGlobal={configGlobal}
                        isSubItemCombo={true} 
                        onSuccessOverride={(customItem) => {
                            customItem._isCustomizedChild = true;
                            customItem.idRaw = subProductoEnEspera.id;
                            const actuales = selecciones[grupoActual.id] || [];
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