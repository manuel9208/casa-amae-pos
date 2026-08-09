import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckSquare, Square } from 'lucide-react';

const AsistentePersonalizacion = ({
    productoEnEspera: rawProducto, itemEditando, pasosWiz, pasoActualObj, pasoPersonalizacion, setPasoPersonalizacion,
    opcionSeleccionada, setOpcionSeleccionada, saborSeleccionado, setSaborSeleccionado,
    gruposSeleccionados, setGruposSeleccionados, gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados,
    ingredientesBase, setIngredientesBase, ingredientesSustituidos, setIngredientesSustituidos,
    ingredienteDesplegado, setIngredienteDesplegado, extrasSeleccionados, setExtrasSeleccionados,
    notaProducto, setNotaProducto, cantidadProducto, setCantidadProducto,
    catalogoIngredientes, politicasSustUI, calcularPrecioSustitucion, resetWizard, onTerminarPersonalizacion,
    clasificaciones, 
    queueLength = 1, 
    onCancelarPersonalizacion,
    isSubItemCombo = false 
}) => {
    
    // 👇 FIX MAESTRO: Desempaquetamos el producto para que lea las categorías perfectamente
    const productoEnEspera = Array.isArray(rawProducto) ? rawProducto[0] : rawProducto;
    
    const [catalogoProductos, setCatalogoProductos] = useState([]);
    const [promociones, setPromociones] = useState([]);
    const [errorStock, setErrorStock] = useState('');

    useEffect(() => {
        const apiUrlLocal = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
        Promise.all([
            fetch(`${apiUrlLocal}/promociones`),
            fetch(`${apiUrlLocal}/productos`)
        ])
        .then(async ([resPromo, resProd]) => {
            setPromociones(await resPromo.json());
            setCatalogoProductos(await resProd.json());
        })
        .catch(() => {});
    }, []);

    useEffect(() => {
        if (itemEditando) {
            setCantidadProducto(itemEditando.cantidad || 1);
            if (itemEditando.configuracionOriginal) {
                const cfg = itemEditando.configuracionOriginal;
                setOpcionSeleccionada(cfg.opcionSeleccionada || null);
                setSaborSeleccionado(cfg.saborSeleccionado || null);
                setGruposSeleccionados(cfg.gruposSeleccionados || {});
                setGruposOpcionalesSeleccionados(cfg.gruposOpcionalesSeleccionados || {});
                setIngredientesBase(cfg.ingredientesBase || []);
                setIngredientesSustituidos(cfg.ingredientesSustituidos || {});
                setExtrasSeleccionados(cfg.extrasSeleccionados || []);
                setNotaProducto(cfg.notaProducto || '');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemEditando?.idTicket]);

    useEffect(() => {
        if (productoEnEspera && !itemEditando && productoEnEspera._esComboBuilder) {
            let configData = productoEnEspera._configuracionCombo.configuracion_grupos;
            if (typeof configData === 'string') configData = JSON.parse(configData);
            const basesCombo = configData.variaciones_base || {};
            
            if (basesCombo['Tamaño']) {
                const newOpcionSel = (productoEnEspera.opciones || []).find(o => o.categoria === 'Tamaño' && String(o.nombre).toLowerCase() === String(basesCombo['Tamaño']).toLowerCase());
                if (newOpcionSel) setOpcionSeleccionada(newOpcionSel);
            }
            if (basesCombo['Sabor']) {
                const newSaborSel = (productoEnEspera.opciones || []).find(o => o.categoria === 'Sabor' && String(o.nombre).toLowerCase() === String(basesCombo['Sabor']).toLowerCase());
                if (newSaborSel) setSaborSeleccionado(newSaborSel);
            }
        }
    }, [productoEnEspera, itemEditando, setOpcionSeleccionada, setSaborSeleccionado]);

    if (!productoEnEspera || !pasoActualObj) return null;

    const isUsaStock = productoEnEspera.usa_stock === true || String(productoEnEspera.usa_stock) === 'true';
    const stockActual = Number(productoEnEspera.stock_preparado) || 0;

    const getPromoInfo = () => {
        if (!productoEnEspera._esPromo) return null;
        const promo = promociones.find(p => p.nombre === productoEnEspera._nombrePromo);
        if (!promo) return null;

        let tipoDesc = promo.tipo_descuento;
        let valorDesc = Number(promo.valor_descuento || 0);

        if (tipoDesc === 'mixto' && promo.config_oferta) {
            try {
                const conf = typeof promo.config_oferta === 'string' ? JSON.parse(promo.config_oferta) : promo.config_oferta;
                let regla = (conf.selecciones || []).find(s => s.tipo === 'producto' && String(s.valor) === String(productoEnEspera.id || productoEnEspera.producto_id));
                if (!regla) regla = (conf.selecciones || []).find(s => s.tipo === 'categoria' && s.valor === productoEnEspera.categoria);
                
                if (regla) {
                    tipoDesc = regla.tipo_descuento || regla.tipo_rebaja || tipoDesc;
                    valorDesc = Number(regla.valor_descuento || regla.valor || 0);
                }
            } catch(e) {}
        }
        return { tipoDesc, valorDesc };
    };

    const obtenerVariacionBaseEfectiva = (itemInfo) => {
        if (itemInfo._variacionBasePromo) {
            return String(itemInfo._variacionBasePromo).trim().toLowerCase();
        }
        const opcionesVariacion = (itemInfo.opciones || []).filter(o => o.tipo === 'variacion' || o.categoria === 'Tamaño' || o.categoria === 'Sabor');
        if (opcionesVariacion.length > 0) {
            const minOpcion = opcionesVariacion.reduce((min, o) => Number(o.precioExtra || 0) < Number(min.precioExtra || 0) ? o : min, opcionesVariacion[0]);
            return String(minOpcion.nombre).trim().toLowerCase();
        }
        return null;
    };

    const calcularPrecioBaseConPromo = () => {
        const prodOriginal = catalogoProductos ? catalogoProductos.find(p => String(p.id) === String(productoEnEspera.id || productoEnEspera.producto_id)) : null;
        const baseReal = prodOriginal ? Number(prodOriginal.precio_base || 0) : Number(productoEnEspera.precio_base || 0);

        let precioVariacionBase = 0;
        const varEfectiva = obtenerVariacionBaseEfectiva(productoEnEspera);
        if (varEfectiva) {
            const opcionesVariacion = (productoEnEspera.opciones || []).filter(o => o.tipo === 'variacion' || o.categoria === 'Tamaño' || o.categoria === 'Sabor');
            const vb = opcionesVariacion.find(o => String(o.nombre).trim().toLowerCase() === varEfectiva);
            if (vb) {
                precioVariacionBase = Number(vb.precioExtra || 0);
            }
        }

        let baseItemPrice = baseReal + precioVariacionBase;
        
        const promoInfo = getPromoInfo();
        if (promoInfo) {
            if (promoInfo.tipoDesc === 'porcentaje') {
                baseItemPrice = baseItemPrice - (baseItemPrice * (promoInfo.valorDesc / 100));
            } else if (promoInfo.tipoDesc === 'descuento_fijo' || promoInfo.tipoDesc === 'descontar_cantidad') {
                baseItemPrice = baseItemPrice - promoInfo.valorDesc;
            } else if (promoInfo.tipoDesc === 'precio_fijo') {
                baseItemPrice = promoInfo.valorDesc;
            }
        }

        return Math.max(0, baseItemPrice);
    };

    const getPrecioDeltaVisual = (opcionObj) => {
        if (!opcionObj) return 0;
        const precioOpcion = Number(opcionObj.precioExtra || 0);
        
        if (isSubItemCombo) return precioOpcion;

        const isVariacionPrincipal = opcionObj.tipo === 'variacion' || opcionObj.categoria === 'Tamaño' || opcionObj.categoria === 'Sabor';
        if (!isVariacionPrincipal) return precioOpcion; 

        if (productoEnEspera._esComboBuilder) {
            let configData = productoEnEspera._configuracionCombo.configuracion_grupos;
            if (typeof configData === 'string') configData = JSON.parse(configData);
            const basesCombo = configData.variaciones_base || {};
            
            if (basesCombo[opcionObj.categoria]) {
                const varEfectiva = String(basesCombo[opcionObj.categoria]).trim().toLowerCase();
                const opcionesMismoTipo = (productoEnEspera.opciones || []).filter(o => o.categoria === opcionObj.categoria);
                const vb = opcionesMismoTipo.find(o => String(o.nombre).trim().toLowerCase() === varEfectiva);
                
                if (vb) {
                    const precioVariacionBase = Number(vb.precioExtra || 0);
                    const delta = precioOpcion - precioVariacionBase;
                    return delta > 0 ? delta : 0;
                }
            }
            return precioOpcion;
        }

        if (!productoEnEspera._esPromo) return precioOpcion;

        const varEfectiva = obtenerVariacionBaseEfectiva(productoEnEspera);
        if (varEfectiva) {
            const opcionesMismoTipo = (productoEnEspera.opciones || []).filter(o => o.categoria === opcionObj.categoria);
            const vb = opcionesMismoTipo.find(o => String(o.nombre).trim().toLowerCase() === varEfectiva);
            
            if (vb) {
                const precioVariacionBase = Number(vb.precioExtra || 0);
                const delta = precioOpcion - precioVariacionBase;
                return delta > 0 ? delta : 0;
            }
        }

        return precioOpcion;
    };

    const handleTerminarPersonalizacion = () => {
        const extrasFinales = [];

        if (opcionSeleccionada) extrasFinales.push({ nombre: opcionSeleccionada.nombre, precioExtra: getPrecioDeltaVisual(opcionSeleccionada), tipo: 'variacion' });
        if (saborSeleccionado) extrasFinales.push({ nombre: saborSeleccionado.nombre, precioExtra: getPrecioDeltaVisual(saborSeleccionado), tipo: 'variacion' });
        
        Object.values(gruposSeleccionados).forEach(g => extrasFinales.push({ nombre: `🔸 ${g.categoria || g.category || 'Opción'}: ${g.nombre}`, precioExtra: getPrecioDeltaVisual(g), tipo: 'grupo_obligatorio' }));
        Object.values(gruposOpcionalesSeleccionados).flat().forEach(g => extrasFinales.push({ nombre: `🔹 ${g.categoria || 'Extra'}: ${g.nombre}`, precioExtra: g.precioExtra || 0, tipo: 'grupo_opcional' }));
        Object.entries(ingredientesSustituidos).forEach(([base, data]) => extrasFinales.push({ nombre: `🔄 Cambio: ${base} x ${data.nuevoNombre}`, precioExtra: data.precioCalculado || 0, tipo: 'sustitucion' }));
        ingredientesBase.forEach(ib => extrasFinales.push({ nombre: `Sin ${ib}`, precioExtra: 0, tipo: 'base' }));
        extrasSeleccionados.forEach(ex => extrasFinales.push({ nombre: `🔸 ${ex.nombre}`, precioExtra: ex.precioExtra || 0, tipo: 'extra' }));
        if (notaProducto.trim()) extrasFinales.push({ nombre: `📝 ${notaProducto}`, precioExtra: 0, tipo: 'nota' });

        if (productoEnEspera._esPromo) {
            extrasFinales.push({ nombre: `⭐ Promo: ${productoEnEspera._nombrePromo}`, precioExtra: 0, tipo: 'nota' });
        }

        let baseCalculada = Number(productoEnEspera.precio_base);

        if (isSubItemCombo) {
            baseCalculada = 0; 
        } else if (productoEnEspera._esComboBuilder) {
            let configData = productoEnEspera._configuracionCombo.configuracion_grupos;
            if (typeof configData === 'string') configData = JSON.parse(configData);
            baseCalculada = Number(configData.precio_combo ?? productoEnEspera.precio_base);
        } else if (productoEnEspera._esPromo) {
            baseCalculada = calcularPrecioBaseConPromo();
        }

        const precioIndividualCalculado = baseCalculada +
            getPrecioDeltaVisual(opcionSeleccionada) +
            getPrecioDeltaVisual(saborSeleccionado) +
            Object.values(gruposSeleccionados).reduce((s, g) => s + getPrecioDeltaVisual(g), 0) +
            Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra), 0) +
            Object.values(ingredientesSustituidos).reduce((s, isust) => s + Number(isust.precioCalculado || 0), 0) +
            extrasSeleccionados.reduce((s, e) => s + Number(e.precioExtra), 0);

        let nombreCompleto = `[${productoEnEspera.categoria || 'General'}] ${productoEnEspera.nombre}`;
        if (opcionSeleccionada && getPrecioDeltaVisual(opcionSeleccionada) === 0) nombreCompleto += ` (${opcionSeleccionada.nombre})`;

        const clasifObj = (clasificaciones || []).find(c => c.nombre === productoEnEspera.categoria);
        const destinoReal = clasifObj?.destino || 'Cocina';

        const configuracionOriginal = {
            opcionSeleccionada, saborSeleccionado, gruposSeleccionados, gruposOpcionalesSeleccionados,
            ingredientesBase, ingredientesSustituidos, extrasSeleccionados, notaProducto
        };

        const nuevoItem = {
            idTicket: itemEditando ? itemEditando.idTicket : Date.now().toString() + Math.random().toString(36).substr(2, 4),
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
            stock_preparado: stockActual,
            configuracionOriginal,
            _esPromo: productoEnEspera._esPromo,
            _nombrePromo: productoEnEspera._nombrePromo,
            _variacionBasePromo: productoEnEspera._variacionBasePromo
        };

        if (productoEnEspera._esComboBuilder) {
            nuevoItem.nombre = productoEnEspera._configuracionCombo.nombre;
            nuevoItem._esCombo = true;
            nuevoItem._comboId = productoEnEspera._configuracionCombo.id;
        }

        onTerminarPersonalizacion(nuevoItem);
    };

    const calcularPrecioActualVisual = () => {
        let baseCalculada = Number(productoEnEspera.precio_base);

        if (isSubItemCombo) {
            baseCalculada = 0;
        } else if (productoEnEspera._esComboBuilder) {
            let configData = productoEnEspera._configuracionCombo.configuracion_grupos;
            if (typeof configData === 'string') configData = JSON.parse(configData);
            baseCalculada = Number(configData.precio_combo ?? productoEnEspera.precio_base);
        } else if (productoEnEspera._esPromo) {
            baseCalculada = calcularPrecioBaseConPromo();
        }

        return ((baseCalculada +
            getPrecioDeltaVisual(opcionSeleccionada) +
            getPrecioDeltaVisual(saborSeleccionado) +
            Object.values(gruposSeleccionados).reduce((s, g) => s + getPrecioDeltaVisual(g), 0) +
            Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra), 0) +
            Object.values(ingredientesSustituidos).reduce((s, isust) => s + Number(isust.precioCalculado || 0), 0) +
            extrasSeleccionados.reduce((s, e) => s + Number(e.precioExtra), 0)) * cantidadProducto).toFixed(2);
    };

    const isSiguienteDisabled = 
        ((pasoActualObj?.tipo === 'tamaño' || pasoActualObj?.id === 'tamano') && !opcionSeleccionada) ||
        ((pasoActualObj?.tipo === 'sabor' || pasoActualObj?.id === 'sabor') && !saborSeleccionado) ||
        ((pasoActualObj?.tipo === 'grupo_obligatorio' || pasoActualObj?.tipo === 'obligatorio') && !gruposSeleccionados[pasoActualObj.categoria || pasoActualObj.id]);

    return (
        <div className={`fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 ${isSubItemCombo ? 'z-[250]' : 'z-[100]'}`}>
            
            {queueLength > 1 && (
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black shadow-md uppercase tracking-widest z-[120] flex items-center gap-2">
                    <span className="animate-pulse w-2 h-2 bg-white rounded-full block"></span>
                    Personalizando {queueLength} restante(s)
                </div>
            )}

            {pasoPersonalizacion > 0 && (
                <button onClick={() => setPasoPersonalizacion(p => p - 1)} className="absolute left-4 top-4 md:left-6 md:top-6 text-white bg-slate-800/50 hover:bg-blue-600 p-2 md:p-3 rounded-full shadow-lg transition z-50 flex items-center gap-1">
                    <ArrowLeft size={20} /> <span className="hidden sm:inline font-bold">Volver</span>
                </button>
            )}

            <div className="bg-slate-50 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 relative mt-8">
                
                <div className="p-6 md:p-8 text-center shrink-0 bg-white border-b border-slate-200">
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800">
                        {productoEnEspera._esComboBuilder ? productoEnEspera._configuracionCombo.nombre : productoEnEspera.nombre} 
                        {itemEditando && <span className="text-emerald-500 text-sm md:text-lg align-middle ml-2 font-bold">(Editando)</span>}
                    </h3>
                    {productoEnEspera.descripcion && !productoEnEspera._esComboBuilder && (
                        <div className="bg-slate-50 border border-slate-100 p-3 md:p-4 rounded-xl mt-3 mx-auto shadow-sm inline-block max-w-sm">
                            <p className="text-slate-600 font-medium text-xs md:text-sm leading-relaxed text-center">
                                {productoEnEspera.descripcion}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-center gap-1.5 mb-6 mt-4">
                    {pasosWiz.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all ${i === pasoPersonalizacion ? 'w-6 bg-blue-600' : i < pasoPersonalizacion ? 'w-3 bg-emerald-500' : 'w-3 bg-slate-200'}`} />
                    ))}
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar relative">
                  
                  {['tamaño', 'sabor', 'grupo_obligatorio', 'grupo_opcional', 'obligatorio', 'opcional'].includes(pasoActualObj.tipo) && (
                     <div className="animate-in slide-in-from-right duration-200 px-4 md:px-8">
                        <p className="text-center text-slate-400 font-bold mb-2 uppercase tracking-widest text-[10px] md:text-xs">{pasoActualObj.titulo}</p>
                        
                        {(pasoActualObj.tipo === 'grupo_opcional' || pasoActualObj.tipo === 'opcional') && (
                          <p className="text-center text-xs font-bold text-emerald-500 mb-4 md:mb-6">
                             Seleccionadas: {(gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).length} de {pasoActualObj.limite}
                          </p>
                        )}
                        {(pasoActualObj.tipo !== 'grupo_opcional' && pasoActualObj.tipo !== 'opcional') && <div className="border-b pb-4 mb-4"></div>}

                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                            {pasoActualObj.opciones.map((o, idx) => {
                                let estaSeleccionado = false;
                                if (pasoActualObj.tipo === 'tamaño' || pasoActualObj.id === 'tamano') {
                                    estaSeleccionado = opcionSeleccionada?.nombre === o.nombre;
                                } else if (pasoActualObj.tipo === 'sabor' || pasoActualObj.id === 'sabor') {
                                    estaSeleccionado = saborSeleccionado?.nombre === o.nombre;
                                } else if (pasoActualObj.tipo === 'grupo_obligatorio' || pasoActualObj.tipo === 'obligatorio') {
                                    estaSeleccionado = gruposSeleccionados[pasoActualObj.categoria || pasoActualObj.id]?.nombre === o.nombre;
                                } else if (pasoActualObj.tipo === 'grupo_opcional' || pasoActualObj.tipo === 'opcional') {
                                    estaSeleccionado = (gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).some(x => x.nombre === o.nombre);
                                }
                                
                                const seleccionadosActuales = gruposOpcionalesSeleccionados[pasoActualObj.categoria] || [];
                                const yaLlegoAlLimite = (pasoActualObj.tipo === 'grupo_opcional' || pasoActualObj.tipo === 'opcional') && seleccionadosActuales.length >= pasoActualObj.limite;
                                const disabled = yaLlegoAlLimite && !estaSeleccionado;
                                
                                const precioAMostrar = getPrecioDeltaVisual(o);

                                return (
                                    <button 
                                        key={idx} 
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => {
                                          if (pasoActualObj.tipo === 'tamaño' || pasoActualObj.id === 'tamano') {
                                              setOpcionSeleccionada(o);
                                              setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
                                          } else if (pasoActualObj.tipo === 'sabor' || pasoActualObj.id === 'sabor') {
                                              setSaborSeleccionado(o);
                                              setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
                                          } else if (pasoActualObj.tipo === 'grupo_obligatorio' || pasoActualObj.tipo === 'obligatorio') {
                                              setGruposSeleccionados({ ...gruposSeleccionados, [pasoActualObj.categoria || pasoActualObj.id]: o });
                                              setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
                                          } else if (pasoActualObj.tipo === 'grupo_opcional' || pasoActualObj.tipo === 'opcional') {
                                              let currentSelection = [...(gruposOpcionalesSeleccionados[pasoActualObj.categoria] || [])];
                                              if (estaSeleccionado) {
                                                currentSelection = currentSelection.filter(x => x.nombre !== o.nombre);
                                              } else {
                                                if (currentSelection.length < pasoActualObj.limite) currentSelection.push(o);
                                              }
                                              setGruposOpcionalesSeleccionados({ ...gruposOpcionalesSeleccionados, [pasoActualObj.categoria]: currentSelection });
                                          }
                                        }} 
                                        className={`p-4 md:p-5 rounded-2xl md:rounded-3xl font-bold transition-all border-2 flex flex-col items-center justify-center text-center relative ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${estaSeleccionado ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-105' : 'bg-white text-slate-700 border-slate-100 hover:border-blue-300 hover:bg-blue-50'}`}
                                    >
                                        {(pasoActualObj.tipo === 'grupo_opcional' || pasoActualObj.tipo === 'opcional') && (
                                           <div className="absolute top-2 left-2 md:top-3 md:left-3 opacity-60">
                                             {estaSeleccionado ? <CheckSquare size={16}/> : <Square size={16}/>}
                                           </div>
                                        )}
                                        <span className="text-sm md:text-lg leading-tight">{o.nombre}</span>
                                        {precioAMostrar > 0 && <span className={`text-[10px] md:text-xs mt-1 font-black uppercase tracking-wider ${estaSeleccionado ? 'text-blue-200' : 'text-slate-400'}`}>+${precioAMostrar.toFixed(2)}</span>}
                                    </button>
                                );
                            })}
                        </div>
                     </div>
                  )}

                  {pasoActualObj.tipo === 'quitar_ingredientes' && (
                    <div className="animate-in slide-in-from-right duration-200 space-y-4 px-4 md:px-8">
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
                                            {/* 👇 FILTRO INDESTRUCTIBLE EN SUSTITUCIONES */}
                                            {(() => {
                                                const categoriaItem = String(productoEnEspera.categoria || '').trim().toLowerCase();
                                                const clasifObj = (clasificaciones || []).find(c => String(c.nombre).trim().toLowerCase() === categoriaItem);
                                                const clasifId = clasifObj ? clasifObj.id : null;

                                                return catalogoIngredientes.filter(i => {
                                                    const catIng = String(i.clasificacion_nombre || '').trim().toLowerCase();
                                                    const coincideCategoria = (clasifId && Number(i.clasificacion_id) === Number(clasifId)) || (catIng === categoriaItem);
                                                    return (coincideCategoria || i.es_extra || String(i.tipo) === 'extra') && i.permite_extra !== false;
                                                }).map((ex, idxEx) => {
                                                    const extraCost = calcularPrecioSustitucion(o.nombre, ex.nombre);
                                                    return (
                                                        <button key={idxEx} onClick={() => {
                                                            setIngredientesSustituidos({...ingredientesSustituidos, [o.nombre]: { nuevoNombre: ex.nombre, precioCalculado: extraCost }});
                                                            setIngredienteDesplegado(null);
                                                        }} className="text-left p-2 md:p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm transition group">
                                                            <p className="text-[10px] md:text-xs font-bold text-slate-700 truncate group-hover:text-blue-800">{ex.nombre}</p>
                                                            <p className="text-[9px] md:text-[10px] font-black mt-0.5 text-blue-500">{extraCost > 0 ? `+$${extraCost.toFixed(2)}` : 'Gratis'}</p>
                                                        </button>
                                                    );
                                                });
                                            })()}
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
                    <div className="animate-in slide-in-from-right duration-200 space-y-4 md:space-y-6 px-4 md:px-8">
                      <p className="text-center text-slate-400 font-bold mb-3 md:mb-4 uppercase tracking-widest text-[10px] md:text-xs border-b pb-3 md:pb-4">Añadir Extras (Opcional)</p>
                      
                      {(() => {
                        // 👇 FILTRO INDESTRUCTIBLE EN EXTRAS
                        const categoriaItem = String(productoEnEspera.categoria || '').trim().toLowerCase();
                        const clasifObj = (clasificaciones || []).find(c => String(c.nombre).trim().toLowerCase() === categoriaItem);
                        const clasifId = clasifObj ? clasifObj.id : null;

                        const extrasDelSistema = catalogoIngredientes.filter(i => {
                            const catIng = String(i.clasificacion_nombre || '').trim().toLowerCase();
                            const coincideCategoria = (clasifId && Number(i.clasificacion_id) === Number(clasifId)) || (catIng === categoriaItem);
                            return (coincideCategoria || i.es_extra || String(i.tipo) === 'extra') && i.permite_extra !== false;
                        });
                        
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

        <div className="p-6 md:p-8 bg-white border-t border-slate-200 shrink-0">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            {pasoActualObj.tipo === 'extras_notas' ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                    <button onClick={() => setCantidadProducto(Math.max(1, cantidadProducto - 1))} className="px-4 md:px-5 py-2 md:py-3 text-slate-400 hover:text-red-500 text-lg md:text-xl font-black transition">-</button>
                    <span className="px-3 md:px-4 font-black text-lg md:text-xl">{cantidadProducto}</span>
                    <button onClick={() => {
                        if (isUsaStock && cantidadProducto >= stockActual) {
                            setErrorStock(`Solo quedan ${stockActual} disponibles.`);
                            setTimeout(() => setErrorStock(''), 4000);
                        } else {
                            setCantidadProducto(cantidadProducto + 1);
                        }
                    }} className="px-4 md:px-5 py-2 md:py-3 text-slate-400 hover:text-blue-600 text-lg md:text-xl font-black transition">+</button>
                  </div>
                  {errorStock && <p className="text-[10px] font-black text-red-500 uppercase tracking-wide animate-in slide-in-from-top-1">{errorStock}</p>}
                </div>
            ) : (
                <div className="flex items-center">
                </div>
            )}

            <div className="text-right flex flex-col items-end">
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {isSubItemCombo ? 'Costo Adicional' : 'Total Platillo'}
              </p>
              <p className="text-2xl md:text-4xl font-black text-blue-600">
                ${calcularPrecioActualVisual()}
              </p>
            </div>
          </div>

          <div className="flex gap-2 md:gap-4">
            <button onClick={onCancelarPersonalizacion} className="px-4 md:px-6 py-4 md:py-5 bg-slate-100 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl font-bold transition active:scale-95 text-sm md:text-base">
                {queueLength > 1 ? 'Omitir y Siguiente' : 'Cancelar'}
            </button>
            
            {pasoPersonalizacion < pasosWiz.length - 1 ? (
              <button 
                disabled={isSiguienteDisabled}
                onClick={() => setPasoPersonalizacion(p => p + 1)} 
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 md:py-5 rounded-xl shadow-lg transition text-lg md:text-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente Paso ➡
              </button>
            ) : (
              <button onClick={handleTerminarPersonalizacion} className={`flex-1 text-white font-black py-4 md:py-5 rounded-xl shadow-lg transition text-base md:text-xl active:scale-95 ${itemEditando ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
                {itemEditando ? '✔ Actualizar Platillo' : (isSubItemCombo ? '✔ Confirmar Selección' : (productoEnEspera._esComboBuilder ? 'Siguiente Paso ➡' : (queueLength > 1 ? 'Añadir y Siguiente ➡' : '✔ Agregar a Orden')))}
              </button>
            )}
          </div>
        </div>
      </div>
    </div> 
  );
};

export default AsistentePersonalizacion;