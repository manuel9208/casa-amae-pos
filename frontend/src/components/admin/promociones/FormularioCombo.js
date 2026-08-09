import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Package, Plus, Trash2, Layers, CheckSquare, ListFilter, Filter, AlertTriangle, X } from 'lucide-react';

const FormularioCombo = ({ productos, clasificaciones, promociones, apiUrl, showAlert, refrescarCombos, comboAEditar, setComboAEditar }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filtroCategoriaPadre, setFiltroCategoriaPadre] = useState('');

    const estadoInicial = { producto_base_id: '', nombre: '' };
    const [formulario, setFormulario] = useState(estadoInicial);
    
    const [precioCombo, setPrecioCombo] = useState('');
    const [variacionesBaseCombo, setVariacionesBaseCombo] = useState({});

    // 👇 SE AGREGÓ: variaciones_base_productos para guardar las configuraciones de los hijos
    const [grupos, setGrupos] = useState([
        { id: Date.now(), nombre: 'Elige tus bebidas', limite: 1, tipo_seleccion: 'categoria', categoria: '', productos_ids: [], filtro_categoria: '', variaciones_base_productos: {} }
    ]);

    useEffect(() => {
        if (comboAEditar) {
            const pBase = productos.find(p => String(p.id) === String(comboAEditar.producto_base_id));
            setFiltroCategoriaPadre(pBase ? pBase.categoria : '');

            setFormulario({
                producto_base_id: comboAEditar.producto_base_id,
                nombre: comboAEditar.nombre,
            });

            let parsedGrupos = [];
            let pCombo = '';
            let vBase = {};

            try {
                const conf = typeof comboAEditar.configuracion_grupos === 'string'
                    ? JSON.parse(comboAEditar.configuracion_grupos)
                    : comboAEditar.configuracion_grupos;
                
                if (Array.isArray(conf)) {
                    parsedGrupos = conf;
                } else {
                    parsedGrupos = conf.grupos || [];
                    pCombo = conf.precio_combo || '';
                    vBase = conf.variaciones_base || {};
                }
            } catch (e) {}

            // Asegurarnos de que variaciones_base_productos exista en grupos viejos
            setGrupos(parsedGrupos.map(g => ({ ...g, filtro_categoria: g.filtro_categoria || '', variaciones_base_productos: g.variaciones_base_productos || {} })));
            setPrecioCombo(pCombo);
            setVariacionesBaseCombo(vBase);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setFormulario(estadoInicial);
            setFiltroCategoriaPadre('');
            setPrecioCombo('');
            setVariacionesBaseCombo({});
            setGrupos([{ id: Date.now(), nombre: 'Elige tus bebidas', limite: 1, tipo_seleccion: 'categoria', categoria: '', productos_ids: [], filtro_categoria: '', variaciones_base_productos: {} }]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comboAEditar]);

    const idsConPromocion = useMemo(() => {
        const ids = new Set();
        (promociones || []).filter(p => p.activo).forEach(promo => {
            if (promo.producto_trigger_id) ids.add(Number(promo.producto_trigger_id));
            if (promo.config_oferta) {
                try {
                    const conf = typeof promo.config_oferta === 'string' ? JSON.parse(promo.config_oferta) : promo.config_oferta;
                    (conf.selecciones || []).forEach(s => { if (s.tipo === 'producto') ids.add(Number(s.valor)); });
                } catch(e) {}
            } else if (promo.producto_oferta_id) ids.add(Number(promo.producto_oferta_id));
        });
        return ids;
    }, [promociones]);

    const productosPadreVisibles = useMemo(() => {
        let filtrados = filtroCategoriaPadre ? productos.filter(p => p.categoria === filtroCategoriaPadre) : productos;
        return filtrados.filter(p => !idsConPromocion.has(Number(p.id)) || (comboAEditar && String(p.id) === String(comboAEditar.producto_base_id)));
    }, [productos, filtroCategoriaPadre, idsConPromocion, comboAEditar]);

    const variacionesDelProducto = useMemo(() => {
        if (!formulario.producto_base_id) return {};
        const prod = productos.find(p => String(p.id) === String(formulario.producto_base_id));
        if (!prod) return {};
        const agrupadas = {};
        (prod.opciones || []).forEach(o => {
            if (o.tipo === 'variacion' || o.categoria === 'Tamaño' || o.categoria === 'Sabor') {
                if (!agrupadas[o.categoria]) agrupadas[o.categoria] = [];
                agrupadas[o.categoria].push(o);
            }
        });
        return agrupadas;
    }, [formulario.producto_base_id, productos]);

    // 👇 NUEVO: Obtiene las variaciones de CUALQUIER producto por su ID (Para los hijos)
    const getVariacionesDeProducto = useCallback((prodId) => {
        const prod = productos.find(p => String(p.id) === String(prodId));
        if (!prod) return {};
        const agrupadas = {};
        (prod.opciones || []).forEach(o => {
            if (o.tipo === 'variacion' || o.categoria === 'Tamaño' || o.categoria === 'Sabor') {
                if (!agrupadas[o.categoria]) agrupadas[o.categoria] = [];
                agrupadas[o.categoria].push(o);
            }
        });
        return agrupadas;
    }, [productos]);

    const agregarGrupo = () => {
        setGrupos([...grupos, { id: Date.now(), nombre: '', limite: 1, tipo_seleccion: 'categoria', categoria: '', productos_ids: [], filtro_categoria: '', variaciones_base_productos: {} }]);
    };

    const eliminarGrupo = (id) => setGrupos(grupos.filter(g => g.id !== id));

    const actualizarGrupo = (id, campo, valor) => {
        setGrupos(grupos.map(g => g.id === id ? { ...g, [campo]: valor } : g));
    };

    // 👇 NUEVO: Actualiza la variación base de un hijo específico dentro del grupo
    const actualizarVariacionBaseHijo = (grupoId, prodId, categoriaVar, valor) => {
        setGrupos(grupos.map(g => {
            if (g.id === grupoId) {
                const nuevasVars = { ...(g.variaciones_base_productos || {}) };
                if (!nuevasVars[prodId]) nuevasVars[prodId] = {};
                nuevasVars[prodId] = { ...nuevasVars[prodId], [categoriaVar]: valor };
                return { ...g, variaciones_base_productos: nuevasVars };
            }
            return g;
        }));
    };

    const toggleProductoEnGrupo = (grupoId, productoId) => {
        setGrupos(grupos.map(g => {
            if (g.id === grupoId) {
                const tieneProducto = g.productos_ids.includes(productoId);
                let nuevosIds = [];
                let nuevasVars = { ...(g.variaciones_base_productos || {}) };

                if (tieneProducto) {
                    nuevosIds = g.productos_ids.filter(id => id !== productoId);
                    delete nuevasVars[productoId]; // Limpia la config si se desmarca
                } else {
                    nuevosIds = [...g.productos_ids, productoId];
                }

                return { ...g, productos_ids: nuevosIds, variaciones_base_productos: nuevasVars };
            }
            return g;
        })); 
    };

    const handleProductoBaseChange = (e) => {
        const id = e.target.value;
        const productoSeleccionado = productos.find(p => String(p.id) === String(id));
        setFormulario({ producto_base_id: id, nombre: productoSeleccionado ? `${productoSeleccionado.nombre} Personalizable` : '' });
        setPrecioCombo('');
        setVariacionesBaseCombo({});
    };

    const handleFiltroPadreChange = (e) => {
        setFiltroCategoriaPadre(e.target.value);
        setFormulario({ producto_base_id: '', nombre: '' });
        setPrecioCombo('');
        setVariacionesBaseCombo({});
    };

    const cancelarEdicion = () => setComboAEditar(null);

    const guardarCombo = async (e) => {
        e.preventDefault();

        if (!formulario.producto_base_id) return showAlert("Atención", "Debes seleccionar un platillo base para el combo.", "warning");
        if (grupos.length === 0) return showAlert("Atención", "El combo debe tener al menos un grupo de elección.", "warning");
        if (!precioCombo) return showAlert("Atención", "Define el precio total del Combo.", "warning");

        for (let i = 0; i < grupos.length; i++) {
            const g = grupos[i];
            if (!g.nombre.trim()) return showAlert("Atención", `El grupo #${i + 1} no tiene nombre.`, "warning");
            if (g.limite < 1) return showAlert("Atención", `El límite del grupo "${g.nombre}" debe ser al menos 1.`, "warning");
            if (g.tipo_seleccion === 'categoria' && !g.categoria) return showAlert("Atención", `Debes elegir una categoría para el grupo "${g.nombre}".`, "warning");
            if (g.tipo_seleccion === 'productos' && g.productos_ids.length === 0) return showAlert("Atención", `Selecciona al menos un producto para el grupo "${g.nombre}".`, "warning");
            
            // 👇 NUEVA VALIDACIÓN: Obliga a definir las variaciones base de los hijos seleccionados
            if (g.tipo_seleccion === 'productos') {
                for (let pid of g.productos_ids) {
                    const varsDelProd = getVariacionesDeProducto(pid);
                    const categoriasVar = Object.keys(varsDelProd);
                    if (categoriasVar.length > 0) {
                        const seleccionesBase = g.variaciones_base_productos?.[pid] || {};
                        for (let cat of categoriasVar) {
                            if (!seleccionesBase[cat]) {
                                const pData = productos.find(p => p.id === pid);
                                return showAlert("Atención", `Te falta seleccionar qué "${cat}" incluirá el producto "${pData?.nombre}" en el grupo "${g.nombre}".`, "warning");
                            }
                        }
                    }
                }
            }
        }

        setIsSubmitting(true);
        try {
            const gruposLimpios = grupos.map(({ filtro_categoria, ...resto }) => resto);

            const payload = {
                producto_base_id: Number(formulario.producto_base_id),
                nombre: formulario.nombre,
                configuracion_grupos: {
                    precio_combo: Number(precioCombo),
                    variaciones_base: variacionesBaseCombo,
                    grupos: gruposLimpios
                },
                activo: true
            };

            const url = comboAEditar ? `${apiUrl}/combos/${comboAEditar.id}` : `${apiUrl}/combos`;
            const res = await fetch(url, { method: comboAEditar ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

            if (res.ok) {
                showAlert("¡Éxito!", `Constructor de Combo ${comboAEditar ? 'actualizado' : 'guardado'} correctamente.`, "success");
                setComboAEditar(null);
                if(refrescarCombos) refrescarCombos();
            } else {
                const data = await res.json();
                showAlert("Error", data.error || "No se pudo guardar el combo.", "error");
            }
        } catch (error) {
            showAlert("Error", "Problema de conexión con el servidor al guardar el combo.", "error");
        }
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={guardarCombo} className={`bg-white p-6 md:p-8 rounded-[40px] shadow-sm border transition-all ${comboAEditar ? 'border-indigo-400 shadow-indigo-100' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4 justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 text-indigo-600 w-12 h-12 flex items-center justify-center rounded-2xl text-2xl shadow-sm"><Package size={24} /></div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">{comboAEditar ? 'Editando Combo' : 'Constructor de Combos'}</h3>
                        <p className="text-sm font-bold text-slate-400">{comboAEditar ? `Modificando: ${comboAEditar.nombre}` : 'Convierte un platillo en un combo con opciones múltiples.'}</p>
                    </div>
                </div>
                {comboAEditar && (
                    <button type="button" onClick={cancelarEdicion} className="bg-red-50 text-red-500 p-2 rounded-full hover:bg-red-100 transition"><X size={20} /></button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* COLUMNA IZQUIERDA: CONFIGURACIÓN BASE */}
                <div className="space-y-5 bg-slate-50 p-6 rounded-3xl border border-slate-100 h-fit">
                    <h4 className="text-sm font-black text-indigo-800 uppercase tracking-widest flex items-center gap-2 mb-4"><Layers size={18} /> 1. Platillo Padre (El que se cobra)</h4>
                    
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1"><Filter size={12}/> 1. Filtra por Clasificación</label>
                        <select value={filtroCategoriaPadre} onChange={handleFiltroPadreChange} className="w-full p-2 bg-transparent outline-none font-bold text-indigo-700 text-sm cursor-pointer">
                            <option value="">-- Ver Todas las Categorías --</option>
                            {clasificaciones?.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2"><CheckSquare size={12}/> 2. Selecciona el Platillo *</label>
                        <select required value={formulario.producto_base_id} onChange={handleProductoBaseChange} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 shadow-sm" disabled={isSubmitting}>
                            <option value="">-- Elige el producto --</option>
                            {productosPadreVisibles?.map(p => <option key={p.id} value={p.id}>[{p.categoria || 'Sin Cat'}] {p.nombre} - ${p.precio_base}</option>)}
                        </select>
                        
                        {productosPadreVisibles.length === 0 && (
                            <div className="mt-3 bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-2">
                                <AlertTriangle className="text-amber-500 shrink-0" size={16}/>
                                <p className="text-xs text-amber-700 font-bold leading-tight">No se encontraron platillos disponibles. Los que ya tienen promo activa se ocultan.</p>
                            </div>
                        )}
                    </div>

                    {formulario.producto_base_id && (
                        <div className="pt-4 border-t border-slate-200 mt-4 space-y-4 animate-in fade-in">
                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                                <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block mb-2">Precio Total del Combo ($) *</label>
                                <input required type="number" step="0.01" min="0" value={precioCombo} onChange={e => setPrecioCombo(e.target.value)} className="w-full p-3 bg-white border border-indigo-200 rounded-xl outline-none focus:border-indigo-500 font-black text-indigo-700 text-lg shadow-sm" placeholder="Ej. 130.00" disabled={isSubmitting} />
                                <p className="text-[10px] text-indigo-600/80 font-bold mt-1.5 leading-tight">Define el precio del paquete. Si el cliente cambia el tamaño, se le sumará la diferencia automáticamente.</p>
                            </div>

                            {Object.keys(variacionesDelProducto).length > 0 && (
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Opciones Base de este Combo</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {Object.keys(variacionesDelProducto).map(cat => (
                                            <div key={cat}>
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{cat}</label>
                                                <select required value={variacionesBaseCombo[cat] || ''} onChange={e => setVariacionesBaseCombo({...variacionesBaseCombo, [cat]: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-700 text-xs shadow-sm">
                                                    <option value="">-- Elige {cat} --</option>
                                                    {variacionesDelProducto[cat].map(o => <option key={o.nombre} value={o.nombre}>{o.nombre} (+${o.precioExtra})</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-2 border-t border-slate-200">
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nombre Público del Combo *</label>
                        <input required value={formulario.nombre} onChange={e => setFormulario({...formulario, nombre: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 shadow-sm" placeholder="Ej. Combo Pareja Personalizable" disabled={isSubmitting}/>
                    </div>
                </div>

                {/* COLUMNA DERECHA: GRUPOS DE ELECCIÓN */}
                <div className="space-y-4">
                    <h4 className="text-sm font-black text-indigo-800 uppercase tracking-widest flex items-center gap-2 mb-4 pl-2"><CheckSquare size={18} /> 2. Grupos de Elección (Costo $0)</h4>
                    {grupos.map((grupo, index) => {
                        const productosGrupoVisibles = grupo.filtro_categoria ? productos.filter(p => p.categoria === grupo.filtro_categoria) : productos;
                        return (
                            <div key={grupo.id} className="bg-white p-5 rounded-3xl border-2 border-indigo-50 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">Grupo {index + 1}</span>
                                    {grupos.length > 1 && <button type="button" onClick={() => eliminarGrupo(grupo.id)} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-lg transition"><Trash2 size={16} /></button>}
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre (Ej. Elige bebidas)</label>
                                        <input required value={grupo.nombre} onChange={e => actualizarGrupo(grupo.id, 'nombre', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Límite</label>
                                        <input required type="number" min="1" value={grupo.limite} onChange={e => actualizarGrupo(grupo.id, 'limite', Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-black text-indigo-600 text-sm text-center" />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">¿De dónde eligen?</label>
                                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                                        <button type="button" onClick={() => actualizarGrupo(grupo.id, 'tipo_seleccion', 'categoria')} className={`flex-1 py-2 rounded-lg text-xs font-black transition ${grupo.tipo_seleccion === 'categoria' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Toda una Categoría</button>
                                        <button type="button" onClick={() => actualizarGrupo(grupo.id, 'tipo_seleccion', 'productos')} className={`flex-1 py-2 rounded-lg text-xs font-black transition ${grupo.tipo_seleccion === 'productos' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Productos Específicos</button>
                                    </div>
                                </div>

                                {grupo.tipo_seleccion === 'categoria' ? (
                                    <div className="animate-in fade-in">
                                        <select required value={grupo.categoria} onChange={e => actualizarGrupo(grupo.id, 'categoria', e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 text-sm">
                                            <option value="">-- Selecciona la categoría --</option>
                                            {clasificaciones?.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-3">
                                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                                            <Filter size={14} className="text-slate-400"/>
                                            <select value={grupo.filtro_categoria} onChange={e => actualizarGrupo(grupo.id, 'filtro_categoria', e.target.value)} className="w-full bg-transparent outline-none text-xs font-black text-indigo-700 cursor-pointer">
                                                <option value="">Filtrar productos por categoría...</option>
                                                {clasificaciones?.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-2"><ListFilter size={12}/> Marca las opciones ({grupo.productos_ids.length} seleccionadas)</label>
                                            
                                            {/* 👇 NUEVO BLOQUE: Muestra el producto y DE INMEDIATO pide sus variaciones base si aplica */}
                                            {productosGrupoVisibles.length === 0 ? (
                                                <p className="text-xs text-slate-500 font-bold text-center p-4 bg-white rounded-xl border border-slate-200">No hay productos aquí.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {productosGrupoVisibles.map(p => {
                                                        const estaSeleccionado = grupo.productos_ids.includes(p.id);
                                                        const varsProd = getVariacionesDeProducto(p.id);
                                                        const tieneVariaciones = Object.keys(varsProd).length > 0;

                                                        return (
                                                            <div key={p.id} className={`flex flex-col gap-2 p-2.5 rounded-xl border-2 transition ${estaSeleccionado ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-indigo-100'}`}>
                                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                                    <input type="checkbox" checked={estaSeleccionado} onChange={() => toggleProductoEnGrupo(grupo.id, p.id)} className="accent-indigo-600 w-4 h-4 shrink-0" />
                                                                    <span className={`text-xs font-bold truncate ${estaSeleccionado ? 'text-indigo-800' : 'text-slate-600'}`}>[{p.categoria || 'Cat'}] {p.nombre}</span>
                                                                </label>
                                                                
                                                                {/* Si está seleccionado y tiene variaciones (tamaños), muestra los selects para obligar a elegir la base */}
                                                                {estaSeleccionado && tieneVariaciones && (
                                                                    <div className="pl-6 flex flex-col gap-2 border-t border-indigo-100/50 mt-1 pt-2 animate-in fade-in zoom-in-95">
                                                                        {Object.keys(varsProd).map(cat => (
                                                                            <div key={cat} className="flex flex-col">
                                                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">{cat} Base Incluida *</span>
                                                                                <select
                                                                                    required
                                                                                    value={grupo.variaciones_base_productos?.[p.id]?.[cat] || ''}
                                                                                    onChange={(e) => actualizarVariacionBaseHijo(grupo.id, p.id, cat, e.target.value)}
                                                                                    className="p-1.5 text-[10px] font-bold border border-indigo-200 rounded outline-none text-indigo-700 bg-white"
                                                                                >
                                                                                    <option value="">-- Elige {cat} --</option>
                                                                                    {varsProd[cat].map(o => <option key={o.nombre} value={o.nombre}>{o.nombre}</option>)}
                                                                                </select>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <button type="button" onClick={agregarGrupo} className="w-full py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 border-dashed rounded-3xl font-black transition flex items-center justify-center gap-2"><Plus size={18} /> Agregar otro Grupo de Elección</button>
                </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 flex justify-end gap-3">
                {comboAEditar && <button type="button" onClick={cancelarEdicion} disabled={isSubmitting} className="w-full md:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 px-8 py-4 rounded-2xl font-black text-lg transition">Cancelar</button>}
                <button type="submit" disabled={isSubmitting || productos?.length === 0} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-lg shadow-indigo-500/30 transition flex justify-center items-center gap-2">
                    {isSubmitting ? 'Guardando...' : (comboAEditar ? 'Guardar Cambios' : 'Crear Constructor de Combo')}
                </button>
            </div>
        </form>
    );
};

export default FormularioCombo;