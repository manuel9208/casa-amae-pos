import React, { useState, useEffect } from 'react';
import { Zap, Clock, X, Plus, Trash2, Layers, Tag, Settings2, Filter } from 'lucide-react';

const FormularioPromocion = ({
    productos, clasificaciones, apiUrl, showAlert, refrescarDatos, isSubmitting, setIsSubmitting,
    promoAEditar, setPromoAEditar
}) => {
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const [tipoCondicion, setTipoCondicion] = useState('global');
    const [todoElDia, setTodoElDia] = useState(false);
    
    // 👇 NUEVO: Filtro para el Producto Detonador
    const [filtroCategoriaTrigger, setFiltroCategoriaTrigger] = useState('');

    const estadoInicialFormulario = {
        nombre: '', tipo: 'upselling', producto_trigger_id: '', categoria_trigger: '',
        tipo_descuento: 'porcentaje', valor_descuento: '',
        dias_aplicables: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        hora_inicio: '00:00', hora_fin: '23:59'
    };

    const [formulario, setFormulario] = useState(estadoInicialFormulario);

    // ESTADOS: Motor Avanzado de Reglas de Precios
    const [modoDescuento, setModoDescuento] = useState('global');
    const [limiteOpciones, setLimiteOpciones] = useState(0);
    // 👇 Añadido 'filtro_categoria' al estado inicial
    const [seleccionesPermitidas, setSeleccionesPermitidas] = useState([
        { tipo: 'categoria', valor: '', tipo_descuento: 'porcentaje', valor_descuento: '', variacion_base: '', filtro_categoria: '' }
    ]);

    useEffect(() => {
        if (promoAEditar) {
            setFormulario({
                ...promoAEditar,
                producto_trigger_id: promoAEditar.producto_trigger_id || '',
                categoria_trigger: promoAEditar.categoria_trigger || '',
                dias_aplicables: Array.isArray(promoAEditar.dias_aplicables) ? promoAEditar.dias_aplicables : JSON.parse(promoAEditar.dias_aplicables || '[]')
            });

            if (promoAEditar.producto_trigger_id) setTipoCondicion('producto');
            else if (promoAEditar.categoria_trigger) setTipoCondicion('categoria');
            else setTipoCondicion('global');

            setTodoElDia(promoAEditar.hora_inicio === '00:00:00' && promoAEditar.hora_fin === '23:59:00');

            if (promoAEditar.config_oferta) {
                try {
                    const conf = typeof promoAEditar.config_oferta === 'string' ? JSON.parse(promoAEditar.config_oferta) : promoAEditar.config_oferta;
                    setLimiteOpciones(conf.limite || 0);
                    setModoDescuento(conf.modo_descuento || 'global');

                    if (conf.selecciones && conf.selecciones.length > 0) {
                        setSeleccionesPermitidas(conf.selecciones.map(s => ({
                            tipo: s.tipo || 'categoria',
                            valor: s.valor || '',
                            tipo_descuento: s.tipo_descuento || 'porcentaje',
                            valor_descuento: s.valor_descuento || '',
                            variacion_base: s.variacion_base || '',
                            filtro_categoria: '' // Inicializado
                        })));
                    } else {
                        setSeleccionesPermitidas([{ tipo: 'categoria', valor: '', tipo_descuento: 'porcentaje', valor_descuento: '', variacion_base: '', filtro_categoria: '' }]);
                    }
                } catch(e) {
                    setLimiteOpciones(0);
                    setModoDescuento('global');
                    setSeleccionesPermitidas([{ tipo: 'categoria', valor: '', tipo_descuento: 'porcentaje', valor_descuento: '', variacion_base: '', filtro_categoria: '' }]);
                }
            } else if (promoAEditar.producto_oferta_id) {
                setLimiteOpciones(1);
                setModoDescuento('global');
                setSeleccionesPermitidas([{ tipo: 'producto', valor: promoAEditar.producto_oferta_id, tipo_descuento: 'porcentaje', valor_descuento: '', variacion_base: '', filtro_categoria: '' }]);
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setFormulario(estadoInicialFormulario);
            setTipoCondicion('global');
            setTodoElDia(false);
            setLimiteOpciones(0);
            setModoDescuento('global');
            setSeleccionesPermitidas([{ tipo: 'categoria', valor: '', tipo_descuento: 'porcentaje', valor_descuento: '', variacion_base: '', filtro_categoria: '' }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [promoAEditar]);

    useEffect(() => {
        if (todoElDia && !promoAEditar) setFormulario(prev => ({ ...prev, hora_inicio: '00:00', hora_fin: '23:59' }));
        else if (todoElDia && promoAEditar) setFormulario(prev => ({ ...prev, hora_inicio: '00:00', hora_fin: '23:59' }));
    }, [todoElDia, promoAEditar]);

    const actualizarSeleccion = (index, campo, valor) => {
        const nuevas = [...seleccionesPermitidas];
        nuevas[index][campo] = valor;
        // Si cambian el tipo (De Producto a Categoría o viceversa), limpiamos su valor y filtro
        if(campo === 'tipo') {
            nuevas[index].valor = '';
            nuevas[index].filtro_categoria = '';
        }
        setSeleccionesPermitidas(nuevas);
    };

    const agregarSeleccion = () => setSeleccionesPermitidas([...seleccionesPermitidas, { tipo: 'categoria', valor: '', tipo_descuento: 'porcentaje', valor_descuento: '', variacion_base: '', filtro_categoria: '' }]);
    const removerSeleccion = (index) => setSeleccionesPermitidas(seleccionesPermitidas.filter((_, i) => i !== index));

    const handleDiaToggle = (dia) => {
        const dias = formulario.dias_aplicables;
        if (dias.includes(dia)) {
            if (dias.length === 1) return; // Prevent 0 days
            setFormulario({ ...formulario, dias_aplicables: dias.filter(d => d !== dia) });
        } else {
            setFormulario({ ...formulario, dias_aplicables: [...dias, dia] });
        }
    };

    const guardarPromocion = async (e) => {
        e.preventDefault();

        if (formulario.hora_inicio >= formulario.hora_fin && !todoElDia) return showAlert("Atención", "La hora de inicio debe ser menor a la hora de fin.", "warning");
        if (formulario.dias_aplicables.length === 0) return showAlert("Atención", "Selecciona al menos un día aplicable.", "warning");
        if (tipoCondicion === 'producto' && !formulario.producto_trigger_id) return showAlert("Atención", "Selecciona el producto detonador.", "warning");
        if (tipoCondicion === 'categoria' && !formulario.categoria_trigger) return showAlert("Atención", "Selecciona la categoría detonadora.", "warning");

        for (const s of seleccionesPermitidas) {
            if (!s.valor) return showAlert("Atención", "Asegúrate de completar todas las Opciones de la Oferta.", "warning");
        }

        if (modoDescuento === 'individual') {
            const tieneIncompletos = seleccionesPermitidas.some(s => !s.valor_descuento || Number(s.valor_descuento) <= 0);
            if (tieneIncompletos) return showAlert("Atención", "En el modo de descuento individual, debes especificar el valor de rebaja para todas las opciones.", "warning");
        }

        // VALIDACIÓN ANTI-DUPLICADOS
        const combinacionesUnicas = new Set();
        for (const s of seleccionesPermitidas) {
            const clave = `${s.tipo}-${s.valor}-${s.variacion_base || 'sin_base'}`;
            if (combinacionesUnicas.has(clave)) {
                return showAlert(
                    "Conflicto Detectado",
                    "No puedes agregar el mismo platillo con la misma variación base más de una vez en las Opciones de la Oferta. Elimina los duplicados para evitar errores de cálculo.",
                    "error"
                );
            }
            combinacionesUnicas.add(clave);
        }

        setIsSubmitting(true);
        try {
            // Limpiamos la propiedad filtro_categoria antes de enviarla
            const seleccionesLimpias = seleccionesPermitidas.map(({ filtro_categoria, ...resto }) => ({
                ...resto,
                // 👇 CORRECCIÓN APLICADA AQUÍ: Aseguramos que el tipo de descuento baje si es global
                tipo_descuento: modoDescuento === 'global' ? formulario.tipo_descuento : resto.tipo_descuento,
                valor_descuento: modoDescuento === 'individual' ? Number(resto.valor_descuento) : null
            }));

            const payload = {
                ...formulario,
                producto_trigger_id: tipoCondicion === 'producto' ? Number(formulario.producto_trigger_id) : null,
                categoria_trigger: tipoCondicion === 'categoria' ? formulario.categoria_trigger : null,
                producto_oferta_id: null,
                valor_descuento: modoDescuento === 'global' ? Number(formulario.valor_descuento) : 0,
                tipo_descuento: modoDescuento === 'global' ? formulario.tipo_descuento : 'mixto',
                config_oferta: JSON.stringify({
                    limite: Number(limiteOpciones),
                    modo_descuento: modoDescuento,
                    selecciones: seleccionesLimpias
                })
            };

            const url = promoAEditar ? `${apiUrl}/promociones/${promoAEditar.id}` : `${apiUrl}/promociones`;
            const method = promoAEditar ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });

            if (res.ok) {
                showAlert("¡Éxito!", `Promoción ${promoAEditar ? 'actualizada' : 'creada y activada'} correctamente.`, "success");
                cancelarEdicion();
                refrescarDatos();
            } else {
                const data = await res.json();
                showAlert("Error", data.error || "No se pudo guardar la promoción.", "error");
            }
        } catch (error) {
            showAlert("Error", "Problema de conexión con el servidor.", "error");
        }
        setIsSubmitting(false);
    };

    const cancelarEdicion = () => {
        setPromoAEditar(null);
        setFiltroCategoriaTrigger('');
        setFormulario(estadoInicialFormulario);
        setTipoCondicion('global');
        setTodoElDia(false);
        setLimiteOpciones(0);
        setModoDescuento('global');
        setSeleccionesPermitidas([{ tipo: 'categoria', valor: '', tipo_descuento: 'porcentaje', valor_descuento: '', variacion_base: '', filtro_categoria: '' }]);
    };

    return (
        <form onSubmit={guardarPromocion} className={`bg-white p-6 md:p-8 rounded-[40px] shadow-sm border transition-colors ${promoAEditar ? 'border-orange-400 shadow-orange-100' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Zap className="text-orange-500" size={20}/>
                    {promoAEditar ? 'Editar Regla de Promoción' : 'Crear Nueva Regla Automática'}
                </h3>
                {promoAEditar && (
                    <button type="button" onClick={cancelarEdicion} className="bg-red-50 text-red-500 p-2 rounded-full hover:bg-red-100 transition" title="Cancelar Edición">
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nombre interno de la Promoción *</label>
                        <input required value={formulario.nombre} onChange={e => setFormulario({...formulario, nombre: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" placeholder="Ej. Papas a mitad de precio o Combos Flexibles" disabled={isSubmitting}/>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tipo de Regla *</label>
                            <select required value={formulario.tipo} onChange={e => setFormulario({...formulario, tipo: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" disabled={isSubmitting}>
                                <option value="upselling">Upselling (Sugerencia)</option>
                                <option value="happy_hour">Happy Hour (Descuento)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Condición (Si compran...) *</label>
                            <select value={tipoCondicion} onChange={e => { setTipoCondicion(e.target.value); setFormulario({...formulario, producto_trigger_id: '', categoria_trigger: ''}); }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" disabled={isSubmitting}>
                                <option value="global">Cualquier cosa (Global)</option>
                                <option value="categoria">Toda una Categoría</option>
                                <option value="producto">Producto Específico</option>
                            </select>
                        </div>
                    </div>

                    {tipoCondicion === 'categoria' && (
                        <div className="animate-in fade-in zoom-in duration-200">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Selecciona Categoría Detonadora *</label>
                            <select required value={formulario.categoria_trigger} onChange={e => setFormulario({...formulario, categoria_trigger: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700 shadow-sm" disabled={isSubmitting}>
                                <option value="">-- Selecciona la categoría --</option>
                                {clasificaciones.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                            </select>
                        </div>
                    )}

                    {tipoCondicion === 'producto' && (
                        <div className="animate-in fade-in zoom-in duration-200 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Filtra y Selecciona el Producto Detonador *</label>
                            
                            {/* 👇 FILTRO PARA EL PRODUCTO DETONADOR */}
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Filter size={14} className="text-slate-400"/>
                                <select 
                                    value={filtroCategoriaTrigger} 
                                    onChange={e => { setFiltroCategoriaTrigger(e.target.value); setFormulario({...formulario, producto_trigger_id: ''}); }} 
                                    className="w-full bg-transparent outline-none text-xs font-black text-orange-600 cursor-pointer uppercase"
                                >
                                    <option value="">Todas las categorías...</option>
                                    {clasificaciones.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                                </select>
                            </div>

                            <select required value={formulario.producto_trigger_id} onChange={e => setFormulario({...formulario, producto_trigger_id: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" disabled={isSubmitting}>
                                <option value="">-- Selecciona el producto --</option>
                                {productos.filter(p => filtroCategoriaTrigger ? p.categoria === filtroCategoriaTrigger : true).map(p => (
                                    <option key={p.id} value={p.id}>[{p.categoria || 'Sin Cat'}] {p.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* MOTOR DINÁMICO DE OPCIONES Y REGLAS DE PRECIOS */}
                    <div className="p-5 bg-orange-50 rounded-3xl border border-orange-200 mt-2">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-black text-orange-800 uppercase tracking-widest flex items-center gap-2">
                                <Layers size={18}/> Opciones de la Oferta *
                            </label>
                            
                            {/* Interruptor de Modo de Descuento */}
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-orange-200 shadow-sm">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${modoDescuento === 'global' ? 'text-orange-600' : 'text-slate-400'}`}>Global</span>
                                <button
                                    type="button"
                                    onClick={() => setModoDescuento(prev => prev === 'global' ? 'individual' : 'global')}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${modoDescuento === 'individual' ? 'bg-orange-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${modoDescuento === 'individual' ? 'translate-x-5' : 'translate-x-1'}`}></div>
                                </button>
                                <span className={`text-[10px] font-black uppercase tracking-wider ${modoDescuento === 'individual' ? 'text-orange-600' : 'text-slate-400'}`}>Por Ítem</span>
                            </div>
                        </div>

                        <div className="space-y-4 mb-5">
                            {seleccionesPermitidas.map((sel, idx) => {
                                let variacionesBase = [];
                                if (sel.tipo === 'producto' && sel.valor) {
                                    const prod = productos.find(p => String(p.id) === String(sel.valor));
                                    variacionesBase = (prod?.opciones || []).filter(o => o.tipo === 'variacion' || o.categoria === 'Tamaño' || o.categoria === 'Sabor');
                                }

                                return (
                                    <div key={idx} className="bg-white p-3 rounded-2xl border border-orange-200 shadow-sm animate-in fade-in space-y-3">
                                        <div className="flex items-start gap-2">
                                            <select value={sel.tipo} onChange={e => actualizarSeleccion(idx, 'tipo', e.target.value)} className="p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs w-28 shrink-0">
                                                <option value="categoria">Categoría</option>
                                                <option value="producto">Producto</option>
                                            </select>

                                            {sel.tipo === 'categoria' ? (
                                                <select required value={sel.valor} onChange={e => actualizarSeleccion(idx, 'valor', e.target.value)} className="flex-1 p-3 bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs truncate">
                                                    <option value="">-- Clasificación --</option>
                                                    {clasificaciones.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                                                </select>
                                            ) : (
                                                <div className="flex-1 flex flex-col gap-2">
                                                    {/* 👇 NUEVO FILTRO PARA CADA OPCIÓN DE LA OFERTA */}
                                                    <div className="flex items-center gap-2 border-b border-orange-100 pb-1">
                                                        <Filter size={12} className="text-orange-400"/>
                                                        <select 
                                                            value={sel.filtro_categoria || ''} 
                                                            onChange={e => actualizarSeleccion(idx, 'filtro_categoria', e.target.value)} 
                                                            className="w-full bg-transparent outline-none text-[10px] font-black text-orange-600 cursor-pointer uppercase"
                                                        >
                                                            <option value="">Filtra por categoría...</option>
                                                            {clasificaciones.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                                                        </select>
                                                    </div>
                                                    
                                                    <select required value={sel.valor} onChange={e => actualizarSeleccion(idx, 'valor', e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs truncate">
                                                        <option value="">-- Platillo Específico --</option>
                                                        {productos.filter(p => sel.filtro_categoria ? p.categoria === sel.filtro_categoria : true).map(p => (
                                                            <option key={p.id} value={p.id}>[{p.categoria || 'Sin Cat'}] {p.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {seleccionesPermitidas.length > 1 && (
                                                <button type="button" onClick={() => removerSeleccion(idx)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={16}/></button>
                                            )}
                                        </div>

                                        {sel.tipo === 'producto' && variacionesBase.length > 0 && (
                                            <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                                <Settings2 className="text-indigo-500" size={14}/>
                                                <select value={sel.variacion_base || ''} onChange={e => actualizarSeleccion(idx, 'variacion_base', e.target.value)} className="w-full bg-transparent outline-none text-xs font-bold text-indigo-700">
                                                    <option value="">Aplica al Base (Por defecto)</option>
                                                    {variacionesBase.map((v, i) => (
                                                        <option key={i} value={v.nombre}>{v.categoria}: {v.nombre} (+${v.precioExtra})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {modoDescuento === 'individual' && (
                                            <div className="flex gap-2 pt-2 border-t border-orange-100">
                                                <select value={sel.tipo_descuento} onChange={e => actualizarSeleccion(idx, 'tipo_descuento', e.target.value)} className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs">
                                                    <option value="porcentaje">-% Descuento</option>
                                                    <option value="precio_fijo">Fijar Precio ($)</option>
                                                    <option value="descuento_fijo">-$ Restar ($)</option>
                                                </select>
                                                <input required type="number" step="0.01" min="0" value={sel.valor_descuento} onChange={e => actualizarSeleccion(idx, 'valor_descuento', e.target.value)} className="w-24 p-2 bg-white border border-orange-200 rounded-lg outline-none focus:border-orange-500 font-black text-orange-600 text-xs text-center" placeholder="Valor"/>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button type="button" onClick={agregarSeleccion} className="w-full py-3 bg-white border border-orange-200 border-dashed rounded-2xl text-orange-600 font-black text-sm hover:bg-orange-100 transition flex items-center justify-center gap-2 mb-4">
                            <Plus size={16}/> Agregar otra opción a la promoción
                        </button>

                        <div>
                            <label className="block text-xs font-black text-orange-800 uppercase tracking-widest mb-2">Límite por Promoción</label>
                            <select value={limiteOpciones} onChange={e => setLimiteOpciones(e.target.value)} className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none font-bold text-slate-700 text-sm">
                                <option value={0}>Sin Límite (Pueden agregar todo lo ofertado)</option>
                                <option value={1}>Sólo pueden elegir 1 artículo</option>
                                <option value={2}>Sólo pueden elegir 2 artículos</option>
                                <option value={3}>Sólo pueden elegir 3 artículos</option>
                            </select>
                        </div>

                        {modoDescuento === 'global' && (
                            <div className="mt-4 pt-4 border-t border-orange-200 grid grid-cols-2 gap-4 animate-in fade-in">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Descuento Global *</label>
                                    <select required value={formulario.tipo_descuento} onChange={e => setFormulario({...formulario, tipo_descuento: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-bold text-slate-700" disabled={isSubmitting}>
                                        <option value="porcentaje">Porcentaje (%)</option>
                                        <option value="precio_fijo">Precio Fijo Exacto ($)</option>
                                        <option value="descuento_fijo">Descuento Exacto (-$)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Valor *</label>
                                    <input required type="number" step="0.01" min="0" value={formulario.valor_descuento} onChange={e => setFormulario({...formulario, valor_descuento: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-black text-slate-700 text-center" placeholder={formulario.tipo_descuento === 'porcentaje' ? 'Ej. 15' : 'Ej. 25.00'} disabled={isSubmitting}/>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] font-bold text-orange-600 text-center bg-orange-100/50 p-2 rounded-lg flex items-center justify-center gap-1.5">
                                        <Tag size={12}/>
                                        {formulario.tipo_descuento === 'porcentaje'
                                            ? `Se aplicará un ${formulario.valor_descuento || 'X'}% de descuento a CADA artículo.`
                                            : formulario.tipo_descuento === 'precio_fijo'
                                            ? `CADA artículo se cobrará exactamente a $${formulario.valor_descuento || 'X'}.`
                                            : `Se restarán exactamente $${formulario.valor_descuento || 'X'} al precio de CADA artículo.`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Clock size={16}/> Horario de la Promoción *</label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={todoElDia} onChange={(e) => setTodoElDia(e.target.checked)} className="w-4 h-4 accent-blue-600" disabled={isSubmitting}/>
                                <span className="text-xs font-bold text-blue-600">Todo el día</span>
                            </label>
                        </div>
                        <div className={`flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200 transition ${todoElDia ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                            <input required type="time" value={formulario.hora_inicio} onChange={e => setFormulario({...formulario, hora_inicio: e.target.value})} className="flex-1 w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-slate-700 text-center" disabled={isSubmitting || todoElDia}/>
                            <span className="font-black text-slate-400">A</span>
                            <input required type="time" value={formulario.hora_fin} onChange={e => setFormulario({...formulario, hora_fin: e.target.value})} className="flex-1 w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-slate-700 text-center" disabled={isSubmitting || todoElDia}/>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock size={16}/> Días Activos *</label>
                        <div className="flex flex-wrap gap-2">
                            {diasSemana.map(dia => (
                                <button key={dia} type="button" disabled={isSubmitting} onClick={() => handleDiaToggle(dia)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${formulario.dias_aplicables.includes(dia) ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'}`}>
                                    {dia}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3">
                        {promoAEditar && (
                            <button type="button" onClick={cancelarEdicion} disabled={isSubmitting} className="w-full md:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 px-8 py-4 rounded-2xl font-black text-lg transition disabled:opacity-50 active:scale-95">
                                Cancelar
                            </button>
                        )}
                        <button type="submit" disabled={isSubmitting || productos.length === 0} className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-orange-500/30 transition disabled:opacity-50 active:scale-95 flex justify-center items-center gap-2">
                            {isSubmitting ? 'Guardando...' : promoAEditar ? 'Guardar Cambios' : 'Activar Promoción'}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default FormularioPromocion;