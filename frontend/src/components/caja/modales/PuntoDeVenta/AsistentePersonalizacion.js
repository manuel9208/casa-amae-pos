import React from 'react';
import { ArrowLeft, CheckSquare, Square } from 'lucide-react';

const AsistentePersonalizacion = ({
    productoEnEspera, pasosWiz, pasoActualObj, pasoPersonalizacion, setPasoPersonalizacion,
    opcionSeleccionada, setOpcionSeleccionada, saborSeleccionado, setSaborSeleccionado,
    gruposSeleccionados, setGruposSeleccionados, gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados,
    ingredientesBase, setIngredientesBase, ingredientesSustituidos, setIngredientesSustituidos,
    ingredienteDesplegado, setIngredienteDesplegado, extrasSeleccionados, setExtrasSeleccionados,
    notaProducto, setNotaProducto, cantidadProducto, setCantidadProducto,
    catalogoIngredientes, politicasSustUI, calcularPrecioSustitucion, resetWizard, onTerminarPersonalizacion,
    clasificaciones
}) => {
    
    if (!productoEnEspera || !pasoActualObj) return null;

    const isUsaStock = productoEnEspera.usa_stock === true || String(productoEnEspera.usa_stock) === 'true';
    const stockActual = Number(productoEnEspera.stock_preparado) || 0;

    const handleTerminarPersonalizacion = () => {
        const extrasFinales = [];

        if (opcionSeleccionada) extrasFinales.push({ nombre: opcionSeleccionada.nombre, precioExtra: opcionSeleccionada.precioExtra || 0, tipo: 'variacion' });
        if (saborSeleccionado) extrasFinales.push({ nombre: saborSeleccionado.nombre, precioExtra: saborSeleccionado.precioExtra || 0, tipo: 'variacion' });
        Object.values(gruposSeleccionados).forEach(g => extrasFinales.push({ nombre: `🔸 ${g.categoria}: ${g.nombre}`, precioExtra: g.precioExtra || 0, tipo: 'grupo_obligatorio' }));
        Object.values(gruposOpcionalesSeleccionados).flat().forEach(g => extrasFinales.push({ nombre: `🔹 ${g.categoria}: ${g.nombre}`, precioExtra: g.precioExtra || 0, tipo: 'grupo_opcional' }));
        Object.entries(ingredientesSustituidos).forEach(([base, data]) => extrasFinales.push({ nombre: `🔄 Cambio: ${base} x ${data.nuevoNombre}`, precioExtra: data.precioCalculado || 0, tipo: 'sustitucion' }));
        ingredientesBase.forEach(ib => extrasFinales.push({ nombre: `Sin ${ib}`, precioExtra: 0, tipo: 'base' }));
        extrasSeleccionados.forEach(ex => extrasFinales.push({ nombre: `🔸 ${ex.nombre}`, precioExtra: ex.precioExtra || 0, tipo: 'extra' }));
        if (notaProducto.trim()) extrasFinales.push({ nombre: `📝 ${notaProducto}`, precioExtra: 0, tipo: 'nota' });

        const precioIndividualCalculado = Number(productoEnEspera.precio_base) +
            (opcionSeleccionada?.precioExtra || 0) +
            (saborSeleccionado?.precioExtra || 0) +
            Object.values(gruposSeleccionados).reduce((s, g) => s + Number(g.precioExtra), 0) +
            Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra), 0) +
            Object.values(ingredientesSustituidos).reduce((s, isust) => s + Number(isust.precioCalculado || 0), 0) +
            extrasSeleccionados.reduce((s, e) => s + Number(e.precioExtra), 0);

        let nombreCompleto = `[${productoEnEspera.categoria || 'General'}] ${productoEnEspera.nombre}`;
        if (opcionSeleccionada && opcionSeleccionada.precioExtra === 0) nombreCompleto += ` (${opcionSeleccionada.nombre})`;

        const clasifObj = (clasificaciones || []).find(c => c.nombre === productoEnEspera.categoria);
        const destinoReal = clasifObj?.destino || 'Cocina';

        const nuevoItem = {
            idTicket: Date.now().toString(),
            id: productoEnEspera.id,
            producto_id: productoEnEspera.id,
            nombre: nombreCompleto,
            categoria: productoEnEspera.categoria,
            destino: destinoReal, 
            tiempo_preparacion: productoEnEspera.tiempo_preparacion,
            precio_base: productoEnEspera.precio_base,
            precioFinal: precioIndividualCalculado,
            cantidad: cantidadProducto,
            opciones: productoEnEspera.opciones || [],
            extras: extrasFinales,
            usa_stock: isUsaStock,
            stock_preparado: stockActual
        };

        onTerminarPersonalizacion(nuevoItem);
    };

    const calcularPrecioActualVisual = () => {
        return ((Number(productoEnEspera.precio_base) +
            (opcionSeleccionada?.precioExtra || 0) +
            (saborSeleccionado?.precioExtra || 0) +
            Object.values(gruposSeleccionados).reduce((s, g) => s + Number(g.precioExtra), 0) +
            Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra), 0) +
            Object.values(ingredientesSustituidos).reduce((s, isust) => s + Number(isust.precioCalculado || 0), 0) +
            extrasSeleccionados.reduce((s, e) => s + Number(e.precioExtra), 0)) * cantidadProducto).toFixed(2);
    };

    const isSiguienteDisabled = 
        (pasoActualObj?.tipo === 'tamaño' && !opcionSeleccionada) ||
        (pasoActualObj?.tipo === 'sabor' && !saborSeleccionado) ||
        (pasoActualObj?.tipo === 'grupo_obligatorio' && !gruposSeleccionados[pasoActualObj.categoria]);

    return (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in">
            {pasoPersonalizacion > 0 && (
                <button onClick={() => setPasoPersonalizacion(p => p - 1)} className="absolute left-4 top-4 md:left-6 md:top-6 text-white bg-slate-800/50 hover:bg-blue-600 p-2 md:p-3 rounded-full shadow-lg transition z-50 flex items-center gap-1">
                    <ArrowLeft size={20} /> <span className="hidden sm:inline font-bold">Volver</span>
                </button>
            )}

            <div className="bg-slate-50 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
                {/* ENCABEZADO */}
                <div className="p-6 md:p-8 text-center shrink-0 bg-white border-b border-slate-200">
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800">{productoEnEspera.nombre}</h3>
                    {productoEnEspera.descripcion && (
                        <div className="bg-slate-50 border border-slate-100 p-3 md:p-4 rounded-xl mt-3 mx-auto shadow-sm inline-block max-w-sm">
                            <p className="text-slate-600 font-medium text-xs md:text-sm leading-relaxed text-center">
                                {productoEnEspera.descripcion}
                            </p>
                        </div>
                    )}
                    {/* 👇 FIX: Eliminada la barra de progreso de "pasitos" visuales */}
                </div>

                {/* CUERPO DEL WIZARD */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {['tamaño', 'sabor', 'grupo_obligatorio', 'grupo_opcional'].includes(pasoActualObj.tipo) && (
                        <div className="animate-in slide-in-from-right duration-200">
                            <p className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest mb-2 text-center">{pasoActualObj.titulo}</p>
                            {pasoActualObj.tipo === 'grupo_opcional' && (
                                <p className="text-center text-[10px] md:text-xs font-bold text-emerald-500 mb-4 md:mb-6">
                                    Seleccionadas: {(gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).length} de {pasoActualObj.limite}
                                </p>
                            )}
                            {pasoActualObj.tipo !== 'grupo_opcional' && <div className="mb-4 md:mb-6"></div>}
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                {pasoActualObj.opciones.map((o, idx) => {
                                    let estaSeleccionado = false;
                                    if (pasoActualObj.tipo === 'tamaño') estaSeleccionado = opcionSeleccionada?.nombre === o.nombre;
                                    else if (pasoActualObj.tipo === 'sabor') estaSeleccionado = saborSeleccionado?.nombre === o.nombre;
                                    else if (pasoActualObj.tipo === 'grupo_obligatorio') estaSeleccionado = gruposSeleccionados[pasoActualObj.categoria]?.nombre === o.nombre;
                                    else if (pasoActualObj.tipo === 'grupo_opcional') estaSeleccionado = (gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).some(x => x.nombre === o.nombre);
                                    
                                    const seleccionadosActuales = gruposOpcionalesSeleccionados[pasoActualObj.categoria] || [];
                                    const yaLlegoAlLimite = pasoActualObj.tipo === 'grupo_opcional' && seleccionadosActuales.length >= pasoActualObj.limite;
                                    const disabled = yaLlegoAlLimite && !estaSeleccionado;
                                    
                                    return (
                                        <button key={idx} disabled={disabled} onClick={() => {
                                            if (pasoActualObj.tipo === 'tamaño') {
                                                setOpcionSeleccionada(o);
                                                setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
                                            } else if (pasoActualObj.tipo === 'sabor') {
                                                setSaborSeleccionado(o);
                                                setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
                                            } else if (pasoActualObj.tipo === 'grupo_obligatorio') {
                                                setGruposSeleccionados({ ...gruposSeleccionados, [pasoActualObj.categoria]: o });
                                                setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
                                            } else if (pasoActualObj.tipo === 'grupo_opcional') {
                                                let currentSelection = [...(gruposOpcionalesSeleccionados[pasoActualObj.categoria] || [])];
                                                if (estaSeleccionado) {
                                                    currentSelection = currentSelection.filter(x => x.nombre !== o.nombre);
                                                } else {
                                                    if (currentSelection.length < pasoActualObj.limite) currentSelection.push(o);
                                                }
                                                setGruposOpcionalesSeleccionados({ ...gruposOpcionalesSeleccionados, [pasoActualObj.categoria]: currentSelection });
                                            }
                                        }} className={`p-4 md:p-5 rounded-2xl md:rounded-3xl font-bold transition-all border-2 flex flex-col items-center justify-center gap-1 md:gap-2 ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${estaSeleccionado ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-white text-slate-700 border-slate-100 hover:border-blue-400 hover:shadow-sm'}`}>
                                            {pasoActualObj.tipo === 'grupo_opcional' && (
                                                <div className="absolute top-2 left-2 md:top-3 md:left-3 opacity-60">
                                                    {estaSeleccionado ? <CheckSquare size={16}/> : <Square size={16}/>}
                                                </div>
                                            )}
                                            <span className="text-center leading-tight text-sm md:text-lg">{o.nombre}</span>
                                            {o.precioExtra > 0 && <span className={`text-[10px] md:text-sm ${estaSeleccionado ? 'text-blue-200' : 'text-slate-400'}`}>+${o.precioExtra}</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {pasoActualObj.tipo === 'quitar_ingredientes' && (
                        <div className="animate-in slide-in-from-right duration-200 space-y-4">
                            <p className="text-center text-slate-400 font-bold mb-4 uppercase tracking-widest text-[10px] md:text-xs border-b pb-4">¿Deseas quitar o cambiar algún ingrediente?</p>
                            <div className="space-y-3">
                                {pasoActualObj.opciones.map((o, idx) => {
                                    const isBaseQuitada = ingredientesBase.includes(o.nombre);
                                    const isSustituida = ingredientesSustituidos[o.nombre];
                                    const isSelectingSust = ingredienteDesplegado === o.nombre;
                                    
                                    return (
                                        <div key={idx} className={`p-3 md:p-4 rounded-xl transition border ${isBaseQuitada ? 'bg-rose-50 border-rose-200' : isSustituida ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-emerald-50 border-emerald-200'}`}>
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                <span className={`font-bold text-xs md:text-sm ${isBaseQuitada ? 'line-through text-rose-500' : isSustituida ? 'text-blue-700' : 'text-emerald-700'}`}>
                                                    {o.nombre} {isSustituida ? `(🔄 x ${isSustituida.nuevoNombre})` : ''}
                                                </span>
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <button onClick={() => {
                                                        if (isBaseQuitada) setIngredientesBase(ingredientesBase.filter(i => i !== o.nombre));
                                                        else {
                                                            setIngredientesBase([...ingredientesBase, o.nombre]);
                                                            const newSust = {...ingredientesSustituidos};
                                                            delete newSust[o.nombre];
                                                            setIngredientesSustituidos(newSust);
                                                            setIngredienteDesplegado(null);
                                                        }
                                                    }} className={`flex-1 sm:flex-none px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-black rounded-lg transition ${isBaseQuitada ? 'bg-rose-500 text-white shadow-sm' : 'bg-white text-rose-500 border border-rose-200 hover:bg-rose-50'}`}>
                                                        {isBaseQuitada ? 'Deshacer ❌' : 'Solo Quitar'}
                                                    </button>
                                                    {politicasSustUI.activa && (
                                                        <button onClick={() => {
                                                            if (isSustituida) {
                                                                const newSust = {...ingredientesSustituidos};
                                                                delete newSust[o.nombre];
                                                                setIngredientesSustituidos(newSust);
                                                            } else {
                                                                setIngredientesBase(ingredientesBase.filter(i => i !== o.nombre));
                                                                setIngredienteDesplegado(isSelectingSust ? null : o.nombre);
                                                            }
                                                        }} className={`flex-1 sm:flex-none px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-black rounded-lg transition ${isSustituida ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}>
                                                            {isSustituida ? 'Deshacer 🔄' : 'Cambiar por...'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {isSelectingSust && !isSustituida && !isBaseQuitada && (
                                                <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-emerald-200/50 animate-in fade-in zoom-in-95">
                                                    <p className="text-[9px] md:text-[10px] uppercase font-black text-slate-500 mb-3 tracking-widest">Elige el ingrediente a sustituir:</p>
                                                    <div className="grid grid-cols-2 gap-2 max-h-32 md:max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                                        {catalogoIngredientes.filter(i =>
                                                            (i.clasificacion_nombre === (productoEnEspera.categoria || '') || i.es_extra || i.tipo === 'extra') &&
                                                            i.permite_extra !== false
                                                        ).map((ex, idxEx) => {
                                                            const extraCost = calcularPrecioSustitucion(o.nombre, ex.nombre);
                                                            return (
                                                                <button key={idxEx} onClick={() => {
                                                                    setIngredientesSustituidos({...ingredientesSustituidos, [o.nombre]: { nuevoNombre: ex.nombre, precioCalculado: extraCost }});
                                                                    setIngredienteDesplegado(null);
                                                                }} className="text-left p-2 md:p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm transition group">
                                                                    <p className="text-[10px] md:text-xs font-bold text-slate-700 truncate group-hover:text-blue-800">{ex.nombre}</p>
                                                                    <p className="text-[9px] md:text-[10px] font-black mt-0.5 text-blue-500">{extraCost > 0 ? `+$${extraCost.toFixed(2)}` : 'Gratis'}</p>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {pasoActualObj.tipo === 'extras_notas' && (
                        <div className="animate-in slide-in-from-right duration-200 space-y-4 md:space-y-6">
                            <p className="text-center text-slate-400 font-bold mb-3 md:mb-4 uppercase tracking-widest text-[10px] md:text-xs border-b pb-3 md:pb-4">Añadir Extras (Opcional)</p>
                            
                            {(() => {
                                const categoryItem = productoEnEspera.categoria || '';
                                const extrasDelSistema = catalogoIngredientes.filter(i =>
                                    (i.clasificacion_nombre === categoryItem || i.es_extra || i.tipo === 'extra') &&
                                    i.permite_extra !== false
                                );
                                
                                const extrasMap = new Map();
                                (productoEnEspera.opciones || []).forEach(o => { if (o.tipo === 'extra') extrasMap.set(o.nombre, o); });
                                extrasDelSistema.forEach(o => { extrasMap.set(o.nombre, { nombre: o.nombre, precioExtra: o.precio_extra || 0 }); });
                                
                                const extrasTodos = Array.from(extrasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
                                
                                if (extrasTodos.length > 0) {
                                    return (
                                        <div className="grid grid-cols-2 gap-2 md:gap-3 max-h-40 md:max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                            {extrasTodos.map((ex, idx) => {
                                                const seleccionado = extrasSeleccionados.find(e => e.nombre === ex.nombre);
                                                return (
                                                    <button key={idx} onClick={() => {
                                                        if (seleccionado) setExtrasSeleccionados(extrasSeleccionados.filter(e => e.nombre !== ex.nombre));
                                                        else setExtrasSeleccionados([...extrasSeleccionados, { nombre: ex.nombre, precioExtra: ex.precioExtra }]);
                                                    }} className={`p-3 md:p-4 rounded-xl font-bold text-xs md:text-sm transition border flex flex-col items-center gap-1 ${seleccionado ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'}`}>
                                                        <span className="text-center leading-tight">{ex.nombre}</span>
                                                        <span className={seleccionado ? 'text-blue-500' : 'text-slate-400'}>{ex.precioExtra > 0 ? `+$${ex.precioExtra}` : 'Gratis'}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )
                                }
                                return <p className="text-center text-xs md:text-sm font-bold text-slate-400">No hay extras disponibles para este platillo.</p>;
                            })()}
                            
                            <div>
                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3 mt-3 md:mt-4">Notas Generales</p>
                                <textarea value={notaProducto} onChange={e => setNotaProducto(e.target.value)} placeholder="Instrucciones al chef..." className="w-full bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl p-3 md:p-4 outline-none focus:border-blue-500 text-slate-700 font-bold resize-none h-16 md:h-20 shadow-inner text-xs md:text-sm" />
                            </div>
                        </div>
                    )}
                </div>

                {/* PIE DEL WIZARD (ACCIONES Y TOTALES) */}
                <div className="p-6 md:p-8 bg-white border-t border-slate-200 shrink-0">
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                        {pasoActualObj.tipo === 'extras_notas' ? (
                            <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                                <button onClick={() => setCantidadProducto(Math.max(1, cantidadProducto - 1))} className="px-4 md:px-5 py-2 md:py-3 text-slate-400 hover:text-red-500 text-lg md:text-xl font-black transition">-</button>
                                <span className="px-3 md:px-4 font-black text-lg md:text-xl">{cantidadProducto}</span>
                                <button onClick={() => {
                                    if (isUsaStock && cantidadProducto >= stockActual) {
                                        alert(`¡Límite de stock! Solo quedan ${stockActual} disponibles en el sistema.`);
                                    } else {
                                        setCantidadProducto(cantidadProducto + 1);
                                    }
                                }} className="px-4 md:px-5 py-2 md:py-3 text-slate-400 hover:text-blue-600 text-lg md:text-xl font-black transition">+</button>
                            </div>
                        ) : (
                            <div className="flex items-center">
                            </div>
                        )}
                        
                        <div className="text-right">
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a agregar</p>
                            <p className="text-2xl md:text-4xl font-black text-blue-600">${calcularPrecioActualVisual()}</p>
                        </div>
                    </div>

                    {/* 👇 FIX APLICADO: Botón de Cancelar SIEMPRE anclado en todos los pasos */}
                    <div className="flex gap-2 md:gap-4">
                        <button onClick={resetWizard} className="px-4 md:px-6 py-4 md:py-5 bg-slate-100 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl font-bold transition active:scale-95 text-sm md:text-base">
                            Cancelar
                        </button>
                        
                        {pasoPersonalizacion < pasosWiz.length - 1 ? (
                            <button 
                                disabled={isSiguienteDisabled}
                                onClick={() => setPasoPersonalizacion(p => p + 1)} 
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 md:py-5 rounded-xl shadow-lg transition text-lg md:text-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Siguiente Paso
                            </button>
                        ) : (
                            <button onClick={handleTerminarPersonalizacion} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 md:py-5 rounded-xl shadow-lg shadow-emerald-500/30 transition text-base md:text-xl active:scale-95">
                                ✔ Agregar a Orden
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AsistentePersonalizacion;