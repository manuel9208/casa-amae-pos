// =========================================================================
// MOTOR MATEMÁTICO DEL ASISTENTE DE PERSONALIZACIÓN
// Separa la lógica de precios, promociones y deltas de la interfaz gráfica.
// =========================================================================

export const obtenerVariacionBaseEfectiva = (itemInfo) => {
  if (!itemInfo) return null;
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

export const getPromoInfo = (productoEnEspera, promociones = []) => {
  if (!productoEnEspera || !productoEnEspera._esPromo) return null;
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

export const calcularPrecioBaseConPromo = (productoEnEspera, promociones) => {
  const baseReal = Number(productoEnEspera?.precio_base || 0);
  let baseItemPrice = baseReal; 

  const promoInfo = getPromoInfo(productoEnEspera, promociones);
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

export const getPrecioDeltaVisual = (opcionObj, productoEnEspera, isSubItem) => {
  if (!opcionObj || !productoEnEspera) return 0;
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

  if (!productoEnEspera._esPromo) {
    // Inteligencia para evitar el cobro doble del precio base
    const baseReal = Number(productoEnEspera.precio_base || 0);
    if (precioOpcion === baseReal) return 0; 
    if (precioOpcion > baseReal) return precioOpcion - baseReal; 
    return precioOpcion;
  }

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

// 👇 MOTOR DE SUSTITUCIONES: Lee config global para saber si es tarifa plana o diferencia
export const calcularPrecioSustitucionReal = (nombreBase, nombreNuevo, configGlobal, politicasSustUI, catalogoIngredientes) => {
    const politicas = typeof configGlobal?.politicas_sustitucion === 'string'
        ? JSON.parse(configGlobal.politicas_sustitucion || '{}')
        : (configGlobal?.politicas_sustitucion || politicasSustUI || { activa: false, modalidad: 'proporcional', tarifa_fija: 0 });

    if (!politicas.activa) return 0;

    const ingOriginal = (catalogoIngredientes || []).find(i => i.nombre === nombreBase) || {};
    const ingRep = (catalogoIngredientes || []).find(i => i.nombre === nombreNuevo) || {};
    
    const precioOriginal = Number(ingOriginal.precio_extra || ingOriginal.precioExtra || 0);
    const precioNuevo = Number(ingRep.precio_extra || ingRep.precioExtra || 0);

    let diferenciaCostos = 0;
    if (politicas.modalidad === 'fija') {
        diferenciaCostos = Number(politicas.tarifa_fija || 0);
    } else {
        diferenciaCostos = precioNuevo - precioOriginal; // Permite números negativos (descuentos al cliente)
    }
    return diferenciaCostos;
};

// 👇 CÁLCULO DEL TOTAL EN VIVO: Sincronizado 100% con getPrecioDeltaVisual
export const calcularPrecioActualVisual = ({
    productoEnEspera, cantidadProducto, opcionSeleccionada, saborSeleccionado,
    gruposSeleccionados, gruposOpcionalesSeleccionados, ingredientesSustituidos, extrasSeleccionados
}) => {
    if (!productoEnEspera) return 0;  

    let precioBaseACobrar = Number(productoEnEspera.precio_base || 0);
    const isSubItem = productoEnEspera._isCustomizedChild;

    // 👇 Asignar la base correcta a cobrar si es Promo, Combo o SubItem
    if (isSubItem) {
        precioBaseACobrar = 0;
    } else if (productoEnEspera._esComboBuilder || productoEnEspera._esCombo) {
        let configData = productoEnEspera._configuracionCombo?.configuracion_grupos;
        if (configData) {
            if (typeof configData === 'string') {
                try { configData = JSON.parse(configData); } catch(e){}
            }
            if (configData.precio_combo !== undefined) {
                precioBaseACobrar = Number(configData.precio_combo);
            }
        }
    } else if (productoEnEspera._esPromo) {
        // Lee el precio exacto ($22) inyectado por el Upsell/Happy Hour
        precioBaseACobrar = productoEnEspera._precioDescontadoAplicado !== undefined 
            ? productoEnEspera._precioDescontadoAplicado 
            : calcularPrecioBaseConPromo(productoEnEspera, []);
    }

    let extraCost = 0;  

    // 👇 Usamos getPrecioDeltaVisual para garantizar que la UI y el carrito usan exactamente la misma matemática
    extraCost += getPrecioDeltaVisual(opcionSeleccionada, productoEnEspera, isSubItem);
    extraCost += getPrecioDeltaVisual(saborSeleccionado, productoEnEspera, isSubItem);

    Object.values(gruposSeleccionados).forEach(g => {
        extraCost += getPrecioDeltaVisual(g, productoEnEspera, isSubItem);
    });  

    Object.values(gruposOpcionalesSeleccionados).forEach(arr => {
        arr.forEach(op => {
            if (op && op.precioExtra) extraCost += Number(op.precioExtra);
        });
    });  

    Object.values(ingredientesSustituidos).forEach(isust => {
        if (isust && isust.precioCalculado !== undefined) extraCost += Number(isust.precioCalculado);
    });  

    extrasSeleccionados.forEach(ex => {
        if (ex && ex.precioExtra) extraCost += Number(ex.precioExtra);
    });  

    return (precioBaseACobrar + extraCost) * (cantidadProducto || 1);
};