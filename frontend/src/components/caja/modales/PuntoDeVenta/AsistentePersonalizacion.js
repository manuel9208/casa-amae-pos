import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

const AsistentePersonalizacion = ({
  productoEnEspera,
  itemEditando,
  setItemAEditar,
  carrito,
  setCarrito,
  pasoPersonalizacion,
  setPasoPersonalizacion,
  opcionSeleccionada,
  setOpcionSeleccionada,
  saborSeleccionado,
  setSaborSeleccionado,
  gruposSeleccionados,
  setGruposSeleccionados,
  gruposOpcionalesSeleccionados,
  setGruposOpcionalesSeleccionados,
  ingredientesBase,
  setIngredientesBase,
  ingredientesSustituidos,
  setIngredientesSustituidos,
  ingredienteDesplegado,
  setIngredienteDesplegado,
  extrasSeleccionados,
  setExtrasSeleccionados,
  notaProducto,
  setNotaProducto,
  cantidadProducto,
  setCantidadProducto,
  catalogoIngredientes,
  politicasSustUI,
  calcularPrecioSustitucion,
  resetWizard,
  onTerminarPersonalizacion,
  clasificaciones,
  queueLength,
  onCancelarPersonalizacion,
  isSubItemCombo,
  configGlobal,
  promociones = []
}) => {

  const [errorStock, setErrorStock] = useState('');
  const [pasoActualObj, setPasoActualObj] = useState(null);
  const [pasosWiz, setPasosWiz] = useState([]);

  const isSubItem = isSubItemCombo || productoEnEspera?._isCustomizedChild;

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
        setGruposSeleccionados({});
        setGruposOpcionalesSeleccionados({});
        
        const bOriginales = (productoEnEspera.opciones || []).filter(o => o.tipo === 'base').map(o => o.nombre);
        setIngredientesBase(bOriginales);
        setIngredientesSustituidos({});
        setExtrasSeleccionados([]);
        setNotaProducto('');
        setCantidadProducto(1);

        let newOpcionSel = null;
        let newSaborSel = null;

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
        } else if (isSubItem) {
          const basesHijo = productoEnEspera._variacionesBaseComboHijo || {};
          
          if (basesHijo['Tamaño']) {
            newOpcionSel = (productoEnEspera.opciones || []).find(o => o.categoria === 'Tamaño' && String(o.nombre).toLowerCase() === String(basesHijo['Tamaño']).toLowerCase());
          } else {
            const opcionesTamano = (productoEnEspera.opciones || []).filter(o => o.categoria === 'Tamaño');
            if (opcionesTamano.length > 0) newOpcionSel = opcionesTamano.reduce((min, o) => Number(o.precioExtra || 0) < Number(min.precioExtra || 0) ? o : min, opcionesTamano[0]);
          }
          
          if (basesHijo['Sabor']) {
            newSaborSel = (productoEnEspera.opciones || []).find(o => (o.categoria === 'Sabor' || o.tipo === 'variacion') && String(o.nombre).toLowerCase() === String(basesHijo['Sabor']).toLowerCase());
          } else {
            const opcionesSabor = (productoEnEspera.opciones || []).filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
            if (opcionesSabor.length > 0) newSaborSel = opcionesSabor.reduce((min, o) => Number(o.precioExtra || 0) < Number(min.precioExtra || 0) ? o : min, opcionesSabor[0]);
          }
        }
        else if (productoEnEspera._esPromo) {
          const varEfectiva = obtenerVariacionBaseEfectiva(productoEnEspera);
          if (varEfectiva) {
            newOpcionSel = (productoEnEspera.opciones || []).find(o => o.categoria === 'Tamaño' && String(o.nombre).toLowerCase() === varEfectiva);
            newSaborSel = (productoEnEspera.opciones || []).find(o => (o.categoria === 'Sabor' || o.tipo === 'variacion') && String(o.nombre).toLowerCase() === varEfectiva);
          } else {
            const opcionesTamano = (productoEnEspera.opciones || []).filter(o => o.categoria === 'Tamaño');
            if (opcionesTamano.length > 0) newOpcionSel = opcionesTamano.reduce((min, o) => Number(o.precioExtra || 0) < Number(min.precioExtra || 0) ? o : min, opcionesTamano[0]);

            const opcionesSabor = (productoEnEspera.opciones || []).filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
            if (opcionesSabor.length > 0) newSaborSel = opcionesSabor.reduce((min, o) => Number(o.precioExtra || 0) < Number(min.precioExtra || 0) ? o : min, opcionesSabor[0]);
          }
        } else {
          const opcionesTamano = (productoEnEspera.opciones || []).filter(o => o.categoria === 'Tamaño');
          if (opcionesTamano.length > 0) newOpcionSel = opcionesTamano.reduce((min, o) => Number(o.precioExtra || 0) < Number(min.precioExtra || 0) ? o : min, opcionesTamano[0]);

          const opcionesSabor = (productoEnEspera.opciones || []).filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
          if (opcionesSabor.length > 0) newSaborSel = opcionesSabor.reduce((min, o) => Number(o.precioExtra || 0) < Number(min.precioExtra || 0) ? o : min, opcionesSabor[0]);
        }

        if (newOpcionSel) setOpcionSeleccionada(newOpcionSel);
        if (newSaborSel) setSaborSeleccionado(newSaborSel);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    productoEnEspera, itemEditando, setOpcionSeleccionada, setSaborSeleccionado, isSubItem,
    setCantidadProducto, setExtrasSeleccionados, setGruposOpcionalesSeleccionados,
    setGruposSeleccionados, setIngredientesBase, setIngredientesSustituidos, setNotaProducto, setPasoPersonalizacion
  ]);

  useEffect(() => {
    if (productoEnEspera) {
      let pasosTemp = [];
      const tamanosList = (productoEnEspera.opciones || []).filter(o => o.categoria === 'Tamaño');
      const saboresList = (productoEnEspera.opciones || []).filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
      const gruposObligatoriosList = [...new Set((productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_obligatorio').map(o => o.categoria))];
      const objGruposOpcionales = {};
      
      (productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_opcional').forEach(o => {
        if (!objGruposOpcionales[o.categoria]) objGruposOpcionales[o.categoria] = { limite: o.limite || 1, opciones: [] };
        objGruposOpcionales[o.categoria].opciones.push(o);
      });

      if (tamanosList.length > 0) pasosTemp.push({ id: 'tamano', tipo: 'tamaño', titulo: 'Elige el Tamaño *', opciones: tamanosList });
      if (saboresList.length > 0) pasosTemp.push({ id: 'sabor', tipo: 'sabor', titulo: 'Elige un Sabor *', opciones: saboresList.sort((a, b) => a.nombre.localeCompare(b.nombre)) });

      gruposObligatoriosList.forEach(g => {
        pasosTemp.push({
          id: `grupo_obl_${g}`, tipo: 'grupo_obligatorio', titulo: `Elige: ${g} *`, categoria: g,
          opciones: (productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_obligatorio' && o.categoria === g).sort((a, b) => a.nombre.localeCompare(b.nombre))
        });
      });

      Object.keys(objGruposOpcionales).forEach(g => {
        pasosTemp.push({
          id: `grupo_opc_${g}`, tipo: 'grupo_opcional', titulo: `Personaliza: ${g}`, categoria: g, limite: objGruposOpcionales[g].limite,
          opciones: objGruposOpcionales[g].opciones.sort((a, b) => a.nombre.localeCompare(b.nombre))
        });
      });

      const bases = (productoEnEspera.opciones || []).filter(o => o.tipo === 'base').sort((a, b) => a.nombre.localeCompare(b.nombre));
      if (bases.length > 0) pasosTemp.push({ id: 'quitar_ingredientes', tipo: 'quitar_ingredientes', titulo: 'Modificar Ingredientes Base', opciones: bases });

      pasosTemp.push({ id: 'extras_notas', tipo: 'extras_notas', titulo: 'Añadir Extras y Notas' });

      setPasosWiz(pasosTemp);
      setPasoActualObj(pasosTemp[pasoPersonalizacion] || null);
    }
  }, [productoEnEspera, pasoPersonalizacion]);

  if (!productoEnEspera || !pasoActualObj) return null;

  const isUsaStock = productoEnEspera.usa_stock === true || String(productoEnEspera.usa_stock) === 'true';
  const stockActual = Number(productoEnEspera.stock_preparado) || 0;

  // 👇 LÓGICA PURA Y NATIVA: Calcula el precio basándose en la BD
  const getPromoInfo = () => {
    if (!productoEnEspera._esPromo) return null;
    const promo = promociones.find(p => p.nombre === productoEnEspera._nombrePromo);
    if (!promo) return null;
    
    let tipoDesc = promo.tipo_descuento;
    let valorDesc = Number(promo.valor_descuento || 0);

    if (promo.config_oferta) {
      try {
        const conf = typeof promo.config_oferta === 'string' ? JSON.parse(promo.config_oferta) : promo.config_oferta;
        let regla = (conf.selecciones || []).find(s => s.tipo === 'producto' && String(s.valor) === String(productoEnEspera.id || productoEnEspera.producto_id));
        if (!regla) regla = (conf.selecciones || []).find(s => s.tipo === 'categoria' && s.valor === productoEnEspera.categoria);
        
        if (regla) {
          tipoDesc = regla.tipo_descuento || tipoDesc;
          valorDesc = Number(regla.valor_descuento || valorDesc);
        }
      } catch(e) {}
    }
    return { tipoDesc, valorDesc };
  };

  const calcularPrecioBaseConPromo = () => {
    const baseReal = Number(productoEnEspera.precio_base || 0);
    let baseItemPrice = baseReal; 

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

    const isVariacionPrincipal = opcionObj.tipo === 'variacion' || opcionObj.categoria === 'Tamaño' || opcionObj.categoria === 'Sabor';

    if (isSubItem) {
      if (!isVariacionPrincipal) return precioOpcion;
      
      const basesHijo = productoEnEspera._variacionesBaseComboHijo || {};
      if (basesHijo[opcionObj.categoria]) {
        const varEfectiva = String(basesHijo[opcionObj.categoria]).trim().toLowerCase();
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

    if (!isVariacionPrincipal) return precioOpcion;

    if (productoEnEspera._esComboBuilder || productoEnEspera._esCombo) {
      let configData = productoEnEspera._configuracionCombo?.configuracion_grupos;
      if (configData) {
          if (typeof configData === 'string') {
              try { configData = JSON.parse(configData); } catch(e){}
          }
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

  const calcularPrecioActualVisual = () => {
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
      baseCalculada = calcularPrecioBaseConPromo();
    }

    return (baseCalculada + 
      getPrecioDeltaVisual(opcionSeleccionada) + 
      getPrecioDeltaVisual(saborSeleccionado) + 
      Object.values(gruposSeleccionados).reduce((s, g) => s + getPrecioDeltaVisual(g), 0) + 
      Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra), 0) + 
      Object.values(ingredientesSustituidos).reduce((s, isust) => s + Number(isust.precioCalculado || 0), 0) + 
      extrasSeleccionados.reduce((s, e) => s + Number(e.precioExtra), 0)
    ) * cantidadProducto;
  };

  const isSiguienteDisabled = (() => {
    if (!pasoActualObj) return false;
    if ((pasoActualObj.tipo === 'tamaño' || pasoActualObj.id === 'tamano') && !opcionSeleccionada) return true;
    if ((pasoActualObj.tipo === 'sabor' || pasoActualObj.id === 'sabor') && !saborSeleccionado) return true;
    if (pasoActualObj.tipo === 'grupo_obligatorio' || pasoActualObj.tipo === 'obligatorio') {
      if (!gruposSeleccionados[pasoActualObj.categoria || pasoActualObj.id]) return true;
    }
    return false;
  })();

  const manejarCancelar = () => {
    if (onCancelarPersonalizacion) onCancelarPersonalizacion();
    else resetWizard();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-4 animate-in fade-in duration-200">
      
      {pasoPersonalizacion > 0 && (
        <button onClick={() => setPasoPersonalizacion(p => p - 1)} className="absolute left-4 top-4 md:left-6 md:top-6 text-white bg-slate-800/50 hover:bg-blue-600 p-2 md:p-3 rounded-full shadow-lg transition z-50 flex items-center gap-1">
          <ArrowLeft size={20} /> <span className="hidden sm:inline font-bold">Volver</span>
        </button>
      )}

      <div className="bg-slate-50 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 relative mt-8">
        
        <div className="p-6 md:p-8 text-center shrink-0 bg-white border-b border-slate-200">
          <h3 className="text-2xl md:text-3xl font-black text-slate-800">
            {productoEnEspera._esComboBuilder || productoEnEspera._esCombo ? productoEnEspera._configuracionCombo?.nombre || productoEnEspera.nombre : productoEnEspera.nombre}
            {itemEditando && <span className="text-emerald-500 text-sm md:text-lg align-middle ml-2 font-bold">(Editando)</span>}
          </h3>
          {productoEnEspera.descripcion && !productoEnEspera._esComboBuilder && !productoEnEspera._esCombo && (
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
                  const textoCero = (pasoActualObj.tipo === 'grupo_opcional' || pasoActualObj.tipo === 'opcional') ? 'Gratis' : 'Incluido';

                  return (
                    <button
                      key={idx}
                      disabled={disabled}
                      onClick={() => {
                        if (pasoActualObj.tipo === 'tamaño' || pasoActualObj.id === 'tamano') setOpcionSeleccionada(o);
                        else if (pasoActualObj.tipo === 'sabor' || pasoActualObj.id === 'sabor') setSaborSeleccionado(o);
                        else if (pasoActualObj.tipo === 'grupo_obligatorio' || pasoActualObj.tipo === 'obligatorio') {
                           setGruposSeleccionados({ ...gruposSeleccionados, [pasoActualObj.categoria || pasoActualObj.id]: o });
                        }
                        else if (pasoActualObj.tipo === 'grupo_opcional' || pasoActualObj.tipo === 'opcional') {
                           if (estaSeleccionado) {
                             setGruposOpcionalesSeleccionados({
                               ...gruposOpcionalesSeleccionados,
                               [pasoActualObj.categoria]: seleccionadosActuales.filter(x => x.nombre !== o.nombre)
                             });
                           } else {
                             setGruposOpcionalesSeleccionados({
                               ...gruposOpcionalesSeleccionados,
                               [pasoActualObj.categoria]: [...seleccionadosActuales, o]
                             });
                           }
                        }
                      }}
                      className={`p-3 md:p-5 rounded-2xl md:rounded-3xl border-2 transition-all font-black flex flex-col items-center justify-center text-center text-xs md:text-sm leading-tight relative shadow-sm ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'active:scale-95'} ${estaSeleccionado ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-md transform scale-[1.02]' : 'border-slate-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/50'}`}
                    >
                      {estaSeleccionado && (
                        <div className="absolute top-2 right-2 text-blue-600">
                          <CheckCircle2 size={18} className="fill-blue-100" />
                        </div>
                      )}
                      <span>{o.nombre}</span>
                      <span className={`mt-2 px-2 py-1 rounded-md text-[9px] md:text-[10px] uppercase tracking-wider ${estaSeleccionado ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                        {precioAMostrar > 0 ? `+ $${precioAMostrar}` : textoCero}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {pasoActualObj.tipo === 'quitar_ingredientes' && (
            <div className="animate-in slide-in-from-right duration-200 px-4 md:px-8">
              <p className="text-center text-slate-400 font-bold mb-6 uppercase tracking-widest text-[10px] md:text-xs">Modificar Receta Base</p>
              <div className="space-y-3 md:space-y-4">
                {pasoActualObj.opciones.map((o, idx) => {
                  const estaSustituido = ingredientesSustituidos[o.nombre] !== undefined;
                  const estaQuitado = !ingredientesBase.includes(o.nombre);
                  const isActive = !estaQuitado && !estaSustituido;

                  return (
                    <div key={idx} className={`p-4 md:p-5 rounded-2xl md:rounded-3xl border-2 transition-all shadow-sm ${isActive ? 'bg-white border-emerald-100' : estaSustituido ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`font-black text-sm md:text-base ${isActive ? 'text-slate-800' : estaSustituido ? 'text-indigo-800' : 'text-slate-400 line-through'}`}>{o.nombre}</span>
                        <div className="flex gap-2">
                          {!estaSustituido && (
                            <button onClick={() => {
                              if (isActive) setIngredientesBase(ingredientesBase.filter(x => x !== o.nombre));
                              else setIngredientesBase([...ingredientesBase, o.nombre]);
                            }} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-black transition active:scale-95 ${isActive ? 'bg-red-100 hover:bg-red-200 text-red-600' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`}>
                              {isActive ? 'Quitar' : 'Restaurar'}
                            </button>
                          )}
                          {politicasSustUI?.activa && isActive && (
                            <button onClick={() => setIngredienteDesplegado(ingredienteDesplegado === o.nombre ? null : o.nombre)} className="px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-black bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition active:scale-95 flex items-center gap-1">
                              <Sparkles size={14}/> Cambiar
                            </button>
                          )}
                          {estaSustituido && (
                            <button onClick={() => {
                               const obj = {...ingredientesSustituidos};
                               delete obj[o.nombre];
                               setIngredientesSustituidos(obj);
                               setIngredientesBase([...ingredientesBase, o.nombre]);
                            }} className="px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-black bg-slate-200 hover:bg-slate-300 text-slate-700 transition active:scale-95 flex items-center gap-1">
                              Deshacer Cambio
                            </button>
                          )}
                        </div>
                      </div>

                      {estaSustituido && (
                        <div className="bg-white p-3 rounded-xl border border-indigo-100 text-xs font-bold text-indigo-700 flex justify-between items-center mt-2 shadow-sm">
                          <span>🔄 Cambiado por: {ingredientesSustituidos[o.nombre].nuevoNombre}</span>
                          {ingredientesSustituidos[o.nombre].precioCalculado > 0 && <span className="bg-indigo-100 px-2 py-1 rounded-md">+{ingredientesSustituidos[o.nombre].precioCalculado}</span>}
                        </div>
                      )}

                      {ingredienteDesplegado === o.nombre && isActive && (
                        <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 pl-1">Selecciona el reemplazo:</p>
                           <div className="grid grid-cols-2 gap-2 md:gap-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                             {catalogoIngredientes.filter(ing => {
                                const categoriaOpcion = String(o.categoria || o.clasificacion || '').trim().toLowerCase();
                                const catIngLimpia = String(ing.clasificacion_nombre || '').trim().toLowerCase();
                                return catIngLimpia === categoriaOpcion && ing.nombre !== o.nombre;
                             }).map((ingRep, iIdx) => {
                                const diferenciaCostos = calcularPrecioSustitucion(o.nombre, ingRep.nombre);
                                return (
                                  <button key={iIdx} onClick={() => {
                                     setIngredientesSustituidos({...ingredientesSustituidos, [o.nombre]: { nuevoNombre: ingRep.nombre, precioCalculado: diferenciaCostos }});
                                     setIngredientesBase(ingredientesBase.filter(x => x !== o.nombre));
                                     setIngredienteDesplegado(null);
                                  }} className="bg-white border border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50 p-2 md:p-3 rounded-xl transition text-left flex flex-col items-start shadow-sm active:scale-95">
                                    <span className="font-bold text-indigo-900 text-xs md:text-sm">{ingRep.nombre}</span>
                                    <span className="text-[9px] md:text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded mt-1">{diferenciaCostos > 0 ? `+$${diferenciaCostos}` : 'Sin costo extra'}</span>
                                  </button>
                                );
                             })}
                           </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pasoActualObj.tipo === 'extras_notas' && (
            <div className="animate-in slide-in-from-right duration-200 px-4 md:px-8">
              {(() => {
                const categoriaItem = String(productoEnEspera.categoria || '').trim().toLowerCase();
                const clasifObj = (clasificaciones || []).find(c => String(c.nombre).trim().toLowerCase() === categoriaItem);
                const clasifId = clasifObj ? clasifObj.id : null;
                
                const extrasDelSistema = (catalogoIngredientes || []).filter(i => {
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
                {isSubItem ? 'Costo Adicional' : 'Total Platillo'}
              </p>
              <p className="text-2xl md:text-4xl font-black text-blue-600 tracking-tight">
                ${calcularPrecioActualVisual().toFixed(2)}
              </p>
            </div>
          </div>

          {pasoPersonalizacion < pasosWiz.length - 1 ? (
             <div className="flex gap-3 w-full">
                 <button onClick={manejarCancelar} className="w-1/3 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 font-black py-4 md:py-5 rounded-2xl md:rounded-3xl transition active:scale-95 flex justify-center items-center">
                   Cancelar
                 </button>
                 <button 
                   disabled={isSiguienteDisabled}
                   onClick={() => setPasoPersonalizacion(pasoPersonalizacion + 1)} 
                   className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 md:py-5 rounded-2xl md:rounded-3xl shadow-lg shadow-blue-500/30 transition active:scale-95 flex justify-center items-center gap-2 text-lg md:text-xl tracking-wide disabled:opacity-50 disabled:shadow-none"
                 >
                   Siguiente <ArrowRight size={24}/>
                 </button>
             </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 w-full">
                  <button onClick={manejarCancelar} className="w-1/3 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 font-black py-4 md:py-5 rounded-2xl md:rounded-3xl transition active:scale-95 flex justify-center items-center">
                    Cancelar
                  </button>
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