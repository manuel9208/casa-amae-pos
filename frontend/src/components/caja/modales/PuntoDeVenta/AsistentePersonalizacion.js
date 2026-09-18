import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAsistenteNav } from './asistente/hooks/useAsistenteNav';
import { 
  calcularPrecioActualVisual, 
  getPrecioDeltaVisual, 
  calcularPrecioBaseConPromo, 
  obtenerVariacionBaseEfectiva // 👈 Importamos la función faltante
} from './asistente/utils/asistenteCalculos';
import TabOpcionesSeleccion from './asistente/tabs/TabOpcionesSeleccion';
import TabModificarReceta from './asistente/tabs/TabModificarReceta';
import TabExtrasNotas from './asistente/tabs/TabExtrasNotas';

const AsistentePersonalizacion = ({
  productoEnEspera, itemEditando, setItemAEditar, carrito, setCarrito,
  pasoPersonalizacion, setPasoPersonalizacion, opcionSeleccionada, setOpcionSeleccionada,
  saborSeleccionado, setSaborSeleccionado, gruposSeleccionados, setGruposSeleccionados,
  gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados, ingredientesBase, setIngredientesBase,
  ingredientesSustituidos, setIngredientesSustituidos, ingredienteDesplegado, setIngredienteDesplegado,
  extrasSeleccionados, setExtrasSeleccionados, notaProducto, setNotaProducto,
  cantidadProducto, setCantidadProducto, catalogoIngredientes, politicasSustUI,
  calcularPrecioSustitucion, resetWizard, onTerminarPersonalizacion, clasificaciones,
  queueLength, onCancelarPersonalizacion, isSubItemCombo, configGlobal, promociones = []
}) => {

  const [errorStock, setErrorStock] = useState('');
  
  const isSubItem = isSubItemCombo || productoEnEspera?._isCustomizedChild;
  const isUsaStock = productoEnEspera?.usa_stock === true || String(productoEnEspera?.usa_stock) === 'true';
  const stockActual = Number(productoEnEspera?.stock_preparado) || 0;

  const {
    pasoActualObj,
    pasosWiz,
    navegacionManual,
    setNavegacionManual,
    avanzarSiguienteInteligente
  } = useAsistenteNav({
    productoEnEspera, itemEditando, pasoPersonalizacion, setPasoPersonalizacion,
    opcionSeleccionada, setOpcionSeleccionada, saborSeleccionado, setSaborSeleccionado,
    gruposSeleccionados, setGruposSeleccionados, gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados,
    ingredientesBase, setIngredientesBase, ingredientesSustituidos, setIngredientesSustituidos,
    extrasSeleccionados, setExtrasSeleccionados, notaProducto, setNotaProducto,
    cantidadProducto, setCantidadProducto, isSubItem, isSubItemCombo
  });

  // =========================================================================
  // FIX MÁSTER: EL INICIALIZADOR DE RECETAS QUE HABÍAMOS BORRADO
  // =========================================================================
  useEffect(() => {
    if (productoEnEspera) {
      if (itemEditando) {
        setOpcionSeleccionada(itemEditando.configuracionOriginal?.opcionSeleccionada || null);
        setSaborSeleccionado(itemEditando.configuracionOriginal?.saborSeleccionado || null);
        setGruposSeleccionados(itemEditando.configuracionOriginal?.gruposSeleccionados || {});
        setGruposOpcionalesSeleccionados(itemEditando.configuracionOriginal?.gruposOpcionalesSeleccionados || {});
        setIngredientesBase(itemEditando.configuracionOriginal?.ingredientesBase || []);
        setIngredientesSustituidos(itemEditando.configuracionOriginal?.ingredientesSustituidos || {});
        setExtrasSeleccionados(itemEditando.configuracionOriginal?.extrasSeleccionados || []);
        setNotaProducto(itemEditando.configuracionOriginal?.notaProducto || '');
        setCantidadProducto(itemEditando.cantidad || 1);
        setPasoPersonalizacion(0);
      } else {
        setPasoPersonalizacion(0);
        
        // 👇 AQUÍ ESTÁ LA SOLUCIÓN: Carga la receta base original y la inyecta como activa
        const bOriginales = (productoEnEspera.opciones || []).filter(o => o.tipo === 'base').map(o => o.nombre);
        setIngredientesBase(bOriginales);
        
        setIngredientesSustituidos({});
        setExtrasSeleccionados([]);
        setNotaProducto('');
        setCantidadProducto(1);

        let newOpcionSel = null;
        let newSaborSel = null;
        let gruposSelTemp = {};
        let gruposOpcTemp = {};

        if (productoEnEspera._esComboBuilder || productoEnEspera._esCombo) {
          let configData = productoEnEspera._configuracionCombo?.configuracion_grupos;
          if (configData) {
            if (typeof configData === 'string') {
               try { configData = JSON.parse(configData); } catch(e){}
            }
            const basesCombo = configData.variaciones_base || {};
            
            if (basesCombo['Tamaño']) {
              newOpcionSel = (productoEnEspera.opciones || []).find(o => o.categoria === 'Tamaño' && String(o.nombre).toLowerCase() === String(basesCombo['Tamaño']).toLowerCase());
            }
            if (basesCombo['Sabor']) {
              newSaborSel = (productoEnEspera.opciones || []).find(o => o.categoria === 'Sabor' && String(o.nombre).toLowerCase() === String(basesCombo['Sabor']).toLowerCase());
            }
          }
        } 
        else if (productoEnEspera._esPromo) {
          const varEfectiva = obtenerVariacionBaseEfectiva(productoEnEspera);
          if (varEfectiva) {
            newOpcionSel = (productoEnEspera.opciones || []).find(o => o.categoria === 'Tamaño' && String(o.nombre).toLowerCase() === varEfectiva);
            newSaborSel = (productoEnEspera.opciones || []).find(o => (o.categoria === 'Sabor' || o.tipo === 'variacion') && String(o.nombre).toLowerCase() === varEfectiva);
          }
        }

        // Auto-Fill de opciones por Defecto (Fast-Checkout)
        (productoEnEspera.opciones || []).forEach(o => {
            if (o.isDefault) {
                if (o.tipo === 'grupo_obligatorio') {
                    if (!gruposSelTemp[o.categoria]) gruposSelTemp[o.categoria] = o;
                } else if (o.tipo === 'grupo_opcional') {
                    if (!gruposOpcTemp[o.categoria]) gruposOpcTemp[o.categoria] = [];
                    gruposOpcTemp[o.categoria].push(o);
                }
            }
        });

        // Fallback de Tamaños y Sabores
        if (!newOpcionSel && !isSubItem) {
          const opcionesTamano = (productoEnEspera.opciones || []).filter(o => o.categoria === 'Tamaño');
          if (opcionesTamano.length > 0) {
              newOpcionSel = opcionesTamano.reduce((min, o) => Number(o.precioExtra || 0) < Number(min.precioExtra || 0) ? o : min, opcionesTamano[0]);
          }
        }
        
        if (!newSaborSel && !isSubItem && !(productoEnEspera._esComboBuilder || productoEnEspera._esCombo)) {
          const opcionesSabor = (productoEnEspera.opciones || []).filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
          if (opcionesSabor.length > 0) {
              newSaborSel = opcionesSabor.reduce((min, o) => Number(o.precioExtra || 0) < Number(min.precioExtra || 0) ? o : min, opcionesSabor[0]);
          }
        }

        setOpcionSeleccionada(newOpcionSel);
        setSaborSeleccionado(newSaborSel);
        setGruposSeleccionados(gruposSelTemp);
        setGruposOpcionalesSeleccionados(gruposOpcTemp);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    productoEnEspera, itemEditando, setOpcionSeleccionada, setSaborSeleccionado, isSubItem,
    setCantidadProducto, setExtrasSeleccionados, setGruposOpcionalesSeleccionados,
    setGruposSeleccionados, setIngredientesBase, setIngredientesSustituidos, setNotaProducto, setPasoPersonalizacion
  ]);
  // =========================================================================

  const manejarCancelar = () => {
    if (onCancelarPersonalizacion) onCancelarPersonalizacion();
    else resetWizard();
  };

  const isSiguienteDisabled = (() => {
    if (!pasoActualObj) return false;
    if (pasoActualObj.tipo === 'tamaño') return !opcionSeleccionada;
    if (pasoActualObj.tipo === 'sabor') return !saborSeleccionado;
    if (pasoActualObj.tipo === 'grupo_obligatorio') return !gruposSeleccionados[pasoActualObj.categoria || pasoActualObj.id];
    return false;
  })();

  const handleTerminarPersonalizacion = () => {
    const extrasFinales = [];

    if (opcionSeleccionada) extrasFinales.push({ nombre: opcionSeleccionada.nombre, precioExtra: getPrecioDeltaVisual(opcionSeleccionada, productoEnEspera, isSubItem), tipo: 'variacion' });
    if (saborSeleccionado) extrasFinales.push({ nombre: saborSeleccionado.nombre, precioExtra: getPrecioDeltaVisual(saborSeleccionado, productoEnEspera, isSubItem), tipo: 'variacion' });

    Object.values(gruposSeleccionados).forEach(g => extrasFinales.push({ nombre: `🔸 ${g.categoria || g.category || 'Opción'}: ${g.nombre}`, precioExtra: getPrecioDeltaVisual(g, productoEnEspera, isSubItem), tipo: 'grupo_obligatorio' }));
    Object.values(gruposOpcionalesSeleccionados).flat().forEach(g => extrasFinales.push({ nombre: `🔹 ${g.categoria || 'Extra'}: ${g.nombre}`, precioExtra: g.precioExtra || 0, tipo: 'grupo_opcional' }));
    Object.entries(ingredientesSustituidos).forEach(([base, data]) => extrasFinales.push({ nombre: `🔄 Cambio: ${base} x ${data.nuevoNombre}`, precioExtra: data.precioCalculado || 0, tipo: 'sustitucion' }));
    
    const recetaOriginal = (productoEnEspera.opciones || []).filter(o => o.tipo === 'base').map(o => o.nombre);
    recetaOriginal.forEach(ingredienteOriginal => {
        const loDejoElCliente = ingredientesBase.includes(ingredienteOriginal);
        const loSustituyoElCliente = ingredientesSustituidos[ingredienteOriginal] !== undefined;
        
        if (!loDejoElCliente && !loSustituyoElCliente) {
            extrasFinales.push({ nombre: `Sin ${ingredienteOriginal}`, precioExtra: 0, tipo: 'base' });
        }
    });

    extrasSeleccionados.forEach(ex => extrasFinales.push({ nombre: `🔸 ${ex.nombre}`, precioExtra: ex.precioExtra || 0, tipo: 'extra' }));
    if (notaProducto.trim()) extrasFinales.push({ nombre: `📝 ${notaProducto}`, precioExtra: 0, tipo: 'nota' });

    if (productoEnEspera._esPromo) {
      extrasFinales.push({ nombre: `⭐ Promo: ${productoEnEspera._nombrePromo}`, precioExtra: 0, tipo: 'nota' });
    }

    let baseCalculada = Number(productoEnEspera.precio_base || 0);

    if (isSubItem) {
      baseCalculada = 0;
    } else if (productoEnEspera._esComboBuilder || productoEnEspera._esCombo) {
      let configData = productoEnEspera._configuracionCombo?.configuracion_grupos;
      if (typeof configData === 'string') {
          try { configData = JSON.parse(configData); } catch(e){}
      }
      if (configData && configData.precio_combo !== undefined) {
          baseCalculada = Number(configData.precio_combo);
      }
      } else if (productoEnEspera._esPromo) {
        // 👇 FIX: Tomar el precio exacto que calculó el modal Upselling
        baseCalculada = productoEnEspera._precioDescontadoAplicado !== undefined 
            ? productoEnEspera._precioDescontadoAplicado 
            : calcularPrecioBaseConPromo(productoEnEspera, promociones);
      }

    const precioIndividualCalculado = baseCalculada + 
      getPrecioDeltaVisual(opcionSeleccionada, productoEnEspera, isSubItem) + 
      getPrecioDeltaVisual(saborSeleccionado, productoEnEspera, isSubItem) + 
      Object.values(gruposSeleccionados).reduce((s, g) => s + getPrecioDeltaVisual(g, productoEnEspera, isSubItem), 0) + 
      Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra), 0) + 
      Object.values(ingredientesSustituidos).reduce((s, isust) => s + Number(isust.precioCalculado || 0), 0) + 
      extrasSeleccionados.reduce((s, e) => s + Number(e.precioExtra), 0);

    let nombreCompleto = `[${productoEnEspera.categoria || 'General'}] ${productoEnEspera.nombre}`;
    if (opcionSeleccionada && getPrecioDeltaVisual(opcionSeleccionada, productoEnEspera, isSubItem) === 0) nombreCompleto += ` (${opcionSeleccionada.nombre})`;

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
      _variacionBasePromo: productoEnEspera._variacionBasePromo,
      _isCustomizedChild: isSubItem,
      _variacionesBaseComboHijo: productoEnEspera._variacionesBaseComboHijo,
      _comboGroupId: productoEnEspera._comboGroupId
    };

    if (productoEnEspera._esComboBuilder || productoEnEspera._esCombo) {
      nuevoItem.nombre = productoEnEspera._configuracionCombo?.nombre || productoEnEspera.nombre;
      nuevoItem._esCombo = true;
      nuevoItem._comboId = productoEnEspera._configuracionCombo?.id || productoEnEspera._comboId;
    }

    onTerminarPersonalizacion(nuevoItem);
  };

  if (!productoEnEspera || !pasoActualObj) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-4 animate-in fade-in duration-200">
      <div className="bg-slate-50 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 relative mt-8">
        
        {/* ============================================================== */}
        {/* ENCABEZADO */}
        {/* ============================================================== */}
        <div className="p-6 md:p-8 text-center shrink-0 bg-white border-b border-slate-200 relative">
          <button onClick={manejarCancelar} className="absolute left-6 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-red-500 bg-slate-50 p-2 rounded-full transition-colors z-10 hidden sm:block">
            <ArrowLeft size={24} />
          </button>
          <h3 className="text-2xl md:text-3xl font-black text-slate-800">
            {productoEnEspera._esComboBuilder || productoEnEspera._esCombo ? productoEnEspera._configuracionCombo?.nombre || productoEnEspera.nombre : productoEnEspera.nombre}
            {itemEditando && <span className="text-emerald-500 text-sm md:text-lg align-middle ml-2 font-bold">(Editando)</span>}
          </h3>
          {productoEnEspera.descripcion && !productoEnEspera._esComboBuilder && !productoEnEspera._esCombo && (
            <div className="bg-slate-50 border border-slate-100 p-3 md:p-4 rounded-xl mt-3 mx-auto shadow-sm inline-block max-w-sm">
              <p className="text-slate-600 font-medium text-xs md:text-sm leading-relaxed text-center">{productoEnEspera.descripcion}</p>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* TABS DE NAVEGACIÓN SUPERIOR */}
        {/* ============================================================== */}
        <div className="flex overflow-x-auto custom-scrollbar gap-2 px-6 pt-4 pb-2 bg-white shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.03)] snap-x">
          {pasosWiz.map((step, i) => {
              const isActive = i === pasoPersonalizacion;
              let title = step.categoria || step.titulo.replace('Elige ', '').replace(' *', '').replace('Personaliza: ', '');
              if (step.id === 'tamano') title = 'Tamaño';
              if (step.id === 'quitar_ingredientes') title = 'Receta';
              if (step.id === 'extras_notas') title = 'Extras';

              let isCompleted = false;
              if (step.tipo === 'tamaño') isCompleted = !!opcionSeleccionada;
              if (step.tipo === 'sabor') isCompleted = !!saborSeleccionado;
              if (step.tipo === 'grupo_obligatorio') isCompleted = !!gruposSeleccionados[step.categoria || step.id];
              if (step.tipo === 'grupo_opcional' || step.tipo === 'opcional') isCompleted = true; 
              if (step.tipo === 'quitar_ingredientes') isCompleted = true; 

              return (
                  <button 
                      key={i}
                      onClick={() => { setNavegacionManual(true); setPasoPersonalizacion(i); }}
                      className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all snap-start flex items-center gap-2 border shadow-sm
                          ${isActive ? 'bg-blue-600 text-white border-blue-600 scale-105 z-10' : 
                            isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                  >
                      {isCompleted && !isActive && <CheckCircle2 size={16} className="text-emerald-500"/>}
                      {title}
                  </button>
              )
          })}
        </div>

        {/* ============================================================== */}
        {/* COMPONENTES MODULARES (LAS PESTAÑAS) */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar relative pt-6">
          
          <TabOpcionesSeleccion 
            pasoActualObj={pasoActualObj} opcionSeleccionada={opcionSeleccionada} setOpcionSeleccionada={setOpcionSeleccionada}
            saborSeleccionado={saborSeleccionado} setSaborSeleccionado={setSaborSeleccionado} gruposSeleccionados={gruposSeleccionados} setGruposSeleccionados={setGruposSeleccionados}
            gruposOpcionalesSeleccionados={gruposOpcionalesSeleccionados} setGruposOpcionalesSeleccionados={setGruposOpcionalesSeleccionados}
            navegacionManual={navegacionManual} avanzarSiguienteInteligente={avanzarSiguienteInteligente}
            productoEnEspera={productoEnEspera} isSubItem={isSubItem}
          />

          <TabModificarReceta 
            pasoActualObj={pasoActualObj} ingredientesBase={ingredientesBase} setIngredientesBase={setIngredientesBase}
            ingredientesSustituidos={ingredientesSustituidos} setIngredientesSustituidos={setIngredientesSustituidos}
            ingredienteDesplegado={ingredienteDesplegado} setIngredienteDesplegado={setIngredienteDesplegado}
            productoEnEspera={productoEnEspera} clasificaciones={clasificaciones} catalogoIngredientes={catalogoIngredientes}
            configGlobal={configGlobal} politicasSustUI={politicasSustUI}
          />

          <TabExtrasNotas 
            pasoActualObj={pasoActualObj} productoEnEspera={productoEnEspera} clasificaciones={clasificaciones}
            catalogoIngredientes={catalogoIngredientes} extrasSeleccionados={extrasSeleccionados} setExtrasSeleccionados={setExtrasSeleccionados}
            notaProducto={notaProducto} setNotaProducto={setNotaProducto}
          />

        </div>

        {/* ============================================================== */}
        {/* PIE DE PÁGINA (BOTONES Y TOTALES) */}
        {/* ============================================================== */}
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
                    } else { setCantidadProducto(cantidadProducto + 1); }
                  }} className="px-4 md:px-5 py-2 md:py-3 text-slate-400 hover:text-blue-600 text-lg md:text-xl font-black transition">+</button>
                </div>
                {errorStock && <p className="text-[10px] font-black text-red-500 uppercase tracking-wide animate-in slide-in-from-top-1">{errorStock}</p>}
              </div>
            ) : <div className="flex items-center"></div>}

            <div className="text-right flex flex-col items-end">
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{isSubItem ? 'Costo Adicional' : 'Total Platillo'}</p>
              <p className="text-2xl md:text-4xl font-black text-blue-600 tracking-tight">
                ${calcularPrecioActualVisual({ productoEnEspera, cantidadProducto, opcionSeleccionada, saborSeleccionado, gruposSeleccionados, gruposOpcionalesSeleccionados, ingredientesSustituidos, extrasSeleccionados }).toFixed(2)}
              </p>
            </div>
          </div>

          {pasoPersonalizacion < pasosWiz.length - 1 ? (
             <div className="flex gap-3 w-full">
                 <button onClick={manejarCancelar} className="w-1/3 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 font-black py-4 md:py-5 rounded-2xl md:rounded-3xl transition active:scale-95 flex justify-center items-center">Cancelar</button>
                 <button 
                   disabled={isSiguienteDisabled} onClick={() => avanzarSiguienteInteligente()} 
                   className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 md:py-5 rounded-2xl md:rounded-3xl shadow-lg shadow-blue-500/30 transition active:scale-95 flex justify-center items-center gap-2 text-lg md:text-xl tracking-wide disabled:opacity-50 disabled:shadow-none"
                 >
                   Siguiente <ArrowRight size={24}/>
                 </button>
             </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 w-full">
                  <button onClick={manejarCancelar} className="w-1/3 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 font-black py-4 md:py-5 rounded-2xl md:rounded-3xl transition active:scale-95 flex justify-center items-center">Cancelar</button>
                  <button onClick={handleTerminarPersonalizacion} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 md:py-5 rounded-2xl md:rounded-3xl shadow-lg shadow-emerald-500/30 transition active:scale-95 flex justify-center items-center gap-2 text-lg md:text-xl tracking-wide">
                    <CheckCircle2 size={24}/> {itemEditando ? 'Guardar Cambios' : isSubItemCombo ? 'Confirmar Selección' : 'Añadir a la Orden'}
                  </button>
              </div>
              {queueLength > 1 && !isSubItemCombo && (
                <p className="text-[10px] md:text-xs font-black text-emerald-600 uppercase tracking-widest text-center mt-2 animate-pulse">
                  Hay más artículos esperando personalización ({queueLength} restantes)
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AsistentePersonalizacion;