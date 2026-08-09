import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, ArrowRight, ArrowLeft, Package, CheckSquare, Square } from 'lucide-react';
import ImagenCachada from '../../../ImagenCachada'; 
import AsistentePersonalizacion from './AsistentePersonalizacion';

// 👇 MINI-CONTENEDOR PARA GESTIONAR LOS ESTADOS DEL ASISTENTE EN CAJA
const ContenedorAsistente = ({ producto, onTerminar, onCancelar, catalogoIngredientes, clasificaciones, configGlobal }) => {
    const [pasoPersonalizacion, setPasoPersonalizacion] = useState(0);
    const [opcionSeleccionada, setOpcionSeleccionada] = useState(null);
    const [saborSeleccionado, setSaborSeleccionado] = useState(null);
    const [gruposSeleccionados, setGruposSeleccionados] = useState({});
    const [gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados] = useState({});
    const [ingredientesBase, setIngredientesBase] = useState([]);
    const [ingredientesSustituidos, setIngredientesSustituidos] = useState({});
    const [ingredienteDesplegado, setIngredienteDesplegado] = useState(null);
    const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
    const [notaProducto, setNotaProducto] = useState('');
    const [cantidadProducto, setCantidadProducto] = useState(1);

    const politicasSustUI = typeof configGlobal?.politicas_sustitucion === 'string'
        ? JSON.parse(configGlobal.politicas_sustitucion || '{}')
        : (configGlobal?.politicas_sustitucion || {});

    const calcularPrecioSustitucion = (nombreBase, nombreNuevo) => {
        if (!politicasSustUI.activa) return 0;
        if (politicasSustUI.modalidad === 'fija') return Number(politicasSustUI.tarifa_fija || 0);
        const ingBase = catalogoIngredientes.find(i => i.nombre === nombreBase);
        const ingNuevo = catalogoIngredientes.find(i => i.nombre === nombreNuevo);
        const diff = Number(ingNuevo?.precio_extra || 0) - Number(ingBase?.precio_extra || 0);
        return diff > 0 ? diff : 0;
    };

    let pasosWiz = [];
    if (producto) {
        const tamanosList = (producto.opciones || []).filter(o => o.categoria === 'Tamaño');
        const saboresList = (producto.opciones || []).filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
        const gruposObligatoriosList = [...new Set((producto.opciones || []).filter(o => o.tipo === 'grupo_obligatorio').map(o => o.categoria))];
        const objGruposOpcionales = {};  
        (producto.opciones || []).filter(o => o.tipo === 'grupo_opcional').forEach(o => {
            if (!objGruposOpcionales[o.categoria]) objGruposOpcionales[o.categoria] = { limite: o.limite || 1, opciones: [] };
            objGruposOpcionales[o.categoria].opciones.push(o);
        });  
        if (tamanosList.length > 0) {
            pasosWiz.push({ id: 'tamano', tipo: 'tamaño', titulo: 'Elige el Tamaño *', opciones: tamanosList });
        }
        if (saboresList.length > 0) {
            pasosWiz.push({ id: 'sabor', tipo: 'sabor', titulo: 'Elige un Sabor *', opciones: saboresList.sort((a, b) => a.nombre.localeCompare(b.nombre)) });
        }  
        gruposObligatoriosList.forEach(g => {
            pasosWiz.push({
                id: `grupo_obl_${g}`,
                tipo: 'grupo_obligatorio',
                titulo: `Elige: ${g} *`,
                categoria: g,
                opciones: (producto.opciones || []).filter(o => o.tipo === 'grupo_obligatorio' && o.categoria === g).sort((a, b) => a.nombre.localeCompare(b.nombre))
            });
        });  
        Object.keys(objGruposOpcionales).forEach(g => {
            pasosWiz.push({
                id: `grupo_opc_${g}`,
                tipo: 'grupo_opcional',
                titulo: `Personaliza: ${g}`,
                categoria: g,
                limite: objGruposOpcionales[g].limite,
                opciones: objGruposOpcionales[g].opciones.sort((a, b) => a.nombre.localeCompare(b.nombre))
            });
        });  
        const bases = (producto.opciones || []).filter(o => o.tipo === 'base').sort((a, b) => a.nombre.localeCompare(b.nombre));
        if (bases.length > 0) {
            pasosWiz.push({ id: 'quitar_ingredientes', tipo: 'quitar_ingredientes', titulo: 'Modificar Ingredientes Base', opciones: bases });
        }  
        pasosWiz.push({ id: 'extras_notas', tipo: 'extras_notas', titulo: 'Añadir Extras y Notas' });
    }  
    const pasoActualObj = pasosWiz[pasoPersonalizacion] || null;

    return (
        <AsistentePersonalizacion
            productoEnEspera={[producto]}
            pasosWiz={pasosWiz}             
            pasoActualObj={pasoActualObj}   
            setProductoEnEspera={(val) => { if (!val) onCancelar(); }}
            itemEditando={null}
            setItemAEditar={() => {}}
            carrito={[]}
            setCarrito={() => {}}
            pasoPersonalizacion={pasoPersonalizacion}
            setPasoPersonalizacion={setPasoPersonalizacion}
            opcionSeleccionada={opcionSeleccionada}
            setOpcionSeleccionada={setOpcionSeleccionada}
            saborSeleccionado={saborSeleccionado}
            setSaborSeleccionado={setSaborSeleccionado}
            gruposSeleccionados={gruposSeleccionados}
            setGruposSeleccionados={setGruposSeleccionados}
            gruposOpcionalesSeleccionados={gruposOpcionalesSeleccionados}
            setGruposOpcionalesSeleccionados={setGruposOpcionalesSeleccionados}
            ingredientesBase={ingredientesBase}
            setIngredientesBase={setIngredientesBase}
            ingredientesSustituidos={ingredientesSustituidos}
            setIngredientesSustituidos={setIngredientesSustituidos}
            ingredienteDesplegado={ingredienteDesplegado}
            setIngredienteDesplegado={setIngredienteDesplegado}
            extrasSeleccionados={extrasSeleccionados}
            setExtrasSeleccionados={setExtrasSeleccionados}
            notaProducto={notaProducto}
            setNotaProducto={setNotaProducto}
            cantidadProducto={cantidadProducto}
            setCantidadProducto={setCantidadProducto}
            catalogoIngredientes={catalogoIngredientes}
            politicasSustUI={politicasSustUI}
            calcularPrecioSustitucion={calcularPrecioSustitucion}
            resetWizard={() => {}}
            onTerminarPersonalizacion={onTerminar}
            clasificaciones={clasificaciones}
            queueLength={1}
            onCancelarPersonalizacion={onCancelar}
            isSubItemCombo={true}
            configGlobal={configGlobal}
            onSuccessOverride={onTerminar}
        />
    );
};

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

    // 👇 MAGIA MEJORADA: Filtro de ingredientes a prueba de errores para CAJA
    const toggleSeleccion = (producto) => {
        const actuales = selecciones[grupoActual.id] || [];
        const yaEstaSeleccionado = actuales.find(p => (p.idRaw || p.id) === producto.id);

        if (yaEstaSeleccionado) {
            setSelecciones({
                ...selecciones,
                [grupoActual.id]: actuales.filter(p => (p.idRaw || p.id) !== producto.id)
            });
        } else {
            if (limiteAlcanzado) return;

            // 1. Parsing seguro de opciones manuales
            let opcionesParseadas = [];
            try {
                opcionesParseadas = typeof producto.opciones === 'string' ? JSON.parse(producto.opciones) : (producto.opciones || []);
            } catch(e) {}
            const tieneOpciones = opcionesParseadas.length > 0;

            // 2. Búsqueda de extras globales a prueba de mayúsculas y espacios
            const categoriaItem = String(producto.categoria || '').trim().toLowerCase();
            const clasifObj = (clasificaciones || []).find(c => String(c.nombre).trim().toLowerCase() === categoriaItem);
            const clasifId = clasifObj ? clasifObj.id : null;

            const extrasDelSistema = (catalogoIngredientes || []).filter(i => {
                const catIng = String(i.clasificacion_nombre || '').trim().toLowerCase();
                const coincideCategoria = (clasifId && Number(i.clasificacion_id) === Number(clasifId)) || (catIng === categoriaItem);
                return (coincideCategoria || i.es_extra || String(i.tipo) === 'extra') && i.permite_extra !== false;
            });

            const requierePersonalizacion = tieneOpciones || extrasDelSistema.length > 0;
            
            if (requierePersonalizacion) {
                // Aseguramos pasarle al hijo sus opciones ya convertidas en Arreglo funcional
                setSubProductoEnEspera({ ...producto, opciones: opcionesParseadas });
            } else {
                setSelecciones({
                    ...selecciones,
                    [grupoActual.id]: [...actuales, producto]
                });
            }
        }
    };

    const avanzarPaso = () => {
        if (pasoActual < grupos.length - 1) setPasoActual(pasoActual + 1);
    };

    const retrocederPaso = () => {
        if (pasoActual > 0) setPasoActual(pasoActual - 1);
    };

    const agregarAlCarrito = () => {
        const extrasCombo = [];
        let totalExtrasHijos = 0;

        grupos.forEach(g => {
            const seleccionadosDelGrupo = selecciones[g.id] || [];
            seleccionadosDelGrupo.forEach(p => {
                if (p._isCustomizedChild) {
                    totalExtrasHijos += p.precioFinal; 

                    extrasCombo.push({
                        nombre: `📦 [Combo] - ${p.nombre}`,
                        precioExtra: p.precioFinal,
                        tipo: 'grupo_opcional'
                    });

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

        const itemFinal = {
            ...productoPersonalizado,
            precioFinal: productoPersonalizado.precioFinal + totalExtrasHijos,
            extras: [...(productoPersonalizado.extras || []), ...extrasCombo]
        };

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

                {/* 👇 RENDERIZA EL SUB-PERSONALIZADOR ENCIMA DEL BUILDER */}
                {subProductoEnEspera && (
                    <ContenedorAsistente
                        producto={subProductoEnEspera}
                        catalogoIngredientes={catalogoIngredientes}
                        clasificaciones={clasificaciones}
                        configGlobal={configGlobal}
                        onCancelar={() => setSubProductoEnEspera(null)}
                        onTerminar={(customItem) => {
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