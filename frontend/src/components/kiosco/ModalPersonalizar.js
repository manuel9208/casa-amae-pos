import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, Square, ArrowLeft } from 'lucide-react';

const ModalPersonalizar = ({ 
  productoEnEspera, setProductoEnEspera, 
  itemAEditar, setItemAEditar, 
  carrito, setCarrito, 
  catalogoIngredientes, clasificaciones,
  configGlobal = {},
  promocionesActivas = [], 
  setPromocionVigente,
  queueLength = 1,
  onCancelarPersonalizacion,
  setComboEnEspera,
  onSuccessOverride, 
  isSubItemCombo     
}) => {

  const queue = Array.isArray(productoEnEspera) ? productoEnEspera : (productoEnEspera ? [productoEnEspera] : []);
  const currentItem = queue.length > 0 ? queue[0] : null;

  const [cantidadProducto, setCantidadProducto] = useState(1);
  const [notaEspecial, setNotaEspecial] = useState('');
  const [extrasAgregados, setExtrasAgregados] = useState([]);
  const [ingredientesRemovidos, setIngredientesRemovidos] = useState([]);
  const [variacionesSeleccionadas, setVariacionesSeleccionadas] = useState({});
  const [gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados] = useState({});
  
  const [ingredientesSustituidos, setIngredientesSustituidos] = useState({});
  const [ingredienteDesplegado, setIngredienteDesplegado] = useState(null);

  const [pasoPersonalizacion, setPasoPersonalizacion] = useState(0);
  const [errorStock, setErrorStock] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promocionesLocales, setPromocionesLocales] = useState([]);

  const initRef = useRef(null);

  useEffect(() => {
    if (promocionesActivas && promocionesActivas.length > 0) return;
    const apiUrlLocal = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    fetch(`${apiUrlLocal}/promociones`)
      .then(res => res.json())
      .then(data => setPromocionesLocales(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [promocionesActivas]);

  const promosReales = (promocionesActivas && promocionesActivas.length > 0) ? promocionesActivas : promocionesLocales;

  useEffect(() => {
    if (!currentItem) return;

    const itemHash = itemAEditar ? `edit-${itemAEditar.idTicket}` : `new-${currentItem.id}-${queue.length}`;
    if (initRef.current === itemHash) return;
    initRef.current = itemHash; 

    if (itemAEditar) {
      const removidosTemp = []; 
      const extrasTemp = []; 
      const variacionesTemp = {}; 
      const gruposOpcTemp = {}; 
      const sustTemp = {}; 
      let notaTemp = '';

      (itemAEditar.extras || []).forEach(e => { 
        if (e.nombre.startsWith('Sin ')) removidosTemp.push(e.nombre.replace('Sin ', '')); 
        else if (e.nombre.startsWith('📝 Nota: ')) notaTemp = e.nombre.replace('📝 Nota: ', ''); 
        else if (e.nombre.startsWith('🔸')) { 
          const parts = e.nombre.replace('🔸 ', '').split(': '); 
          if(parts.length === 2) variacionesTemp[parts[0]] = { nombre: parts[1], precioExtra: e.precioExtra, categoria: parts[0] }; 
        } 
        else if (e.nombre.startsWith('🔹')) { 
          const parts = e.nombre.replace('🔹 ', '').split(': '); 
          if(parts.length === 2) {
             if(!gruposOpcTemp[parts[0]]) gruposOpcTemp[parts[0]] = [];
             gruposOpcTemp[parts[0]].push({ nombre: parts[1], precioExtra: e.precioExtra, categoria: parts[0] });
          }
        } 
        else if (e.nombre.startsWith('🔄 Cambio: ')) {
          const parts = e.nombre.replace('🔄 Cambio: ', '').split(' x ');
          if (parts.length === 2) sustTemp[parts[0]] = { nuevoNombre: parts[1], precioCalculado: e.precioExtra };
        }
        else if (e.nombre.startsWith('Extra ')) extrasTemp.push({ nombre: e.nombre.replace('Extra ', ''), precioExtra: e.precioExtra }); 
      });
      
      setIngredientesRemovidos(removidosTemp); 
      setExtrasAgregados(extrasTemp); 
      setNotaEspecial(notaTemp); 
      setVariacionesSeleccionadas(variacionesTemp); 
      setGruposOpcionalesSeleccionados(gruposOpcTemp);
      setIngredientesSustituidos(sustTemp); 
      setCantidadProducto(itemAEditar.cantidad || 1); 
    } else {
      setExtrasAgregados([]); setIngredientesRemovidos([]); setNotaEspecial(''); setCantidadProducto(1); 
      setGruposOpcionalesSeleccionados({});
      setIngredientesSustituidos({}); 
      setIngredienteDesplegado(null);

      let varsTemp = {};
      if (currentItem._esComboBuilder) {
          let configData = currentItem._configuracionCombo.configuracion_grupos;
          if (typeof configData === 'string') configData = JSON.parse(configData);
          const basesCombo = configData.variaciones_base || {};
          
          Object.entries(basesCombo).forEach(([cat, nombreVar]) => {
              const objOpcion = (currentItem.opciones || []).find(o => o.categoria === cat && String(o.nombre).toLowerCase() === String(nombreVar).toLowerCase());
              if (objOpcion) varsTemp[cat] = objOpcion;
          });
      }
      setVariacionesSeleccionadas(varsTemp);
    }
    
    setPasoPersonalizacion(0);
    setErrorStock('');
    setIsSubmitting(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem, itemAEditar, queue.length]);

  const getPromoInfo = () => {
    if (!currentItem._esPromo) return null;
    const promo = promosReales.find(p => p.nombre === currentItem._nombrePromo);
    if (!promo) return null;

    let tipoDesc = promo.tipo_descuento;
    let valorDesc = Number(promo.valor_descuento || 0);

    if (tipoDesc === 'mixto' && promo.config_oferta) {
        try {
            const conf = typeof promo.config_oferta === 'string' ? JSON.parse(promo.config_oferta) : promo.config_oferta;
            let regla = (conf.selecciones || []).find(s => s.tipo === 'producto' && String(s.valor) === String(currentItem.id || currentItem.producto_id));
            if (!regla) regla = (conf.selecciones || []).find(s => s.tipo === 'categoria' && s.valor === currentItem.categoria);
            
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
      const baseReal = Number(currentItem.precio_base || 0);
      let precioVariacionBase = 0;
      
      const varEfectiva = obtenerVariacionBaseEfectiva(currentItem);
      if (varEfectiva) {
          const opcionesVariacion = (currentItem.opciones || []).filter(o => o.tipo === 'variacion' || o.categoria === 'Tamaño' || o.categoria === 'Sabor');
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

    const isVariacionPrincipal = opcionObj.tipo === 'variacion' || opcionObj.categoria === 'Tamaño' || opcionObj.categoria === 'Sabor';
    
    if (!isVariacionPrincipal) return precioOpcion;

    if (currentItem._esComboBuilder) {
      let configData = currentItem._configuracionCombo.configuracion_grupos;
      if (typeof configData === 'string') configData = JSON.parse(configData);
      const basesCombo = configData.variaciones_base || {};

      if (basesCombo[opcionObj.categoria]) {
        const varEfectiva = String(basesCombo[opcionObj.categoria]).trim().toLowerCase();
        const opcionesMismoTipo = (currentItem.opciones || []).filter(o => o.categoria === opcionObj.categoria);
        const vb = opcionesMismoTipo.find(o => String(o.nombre).trim().toLowerCase() === varEfectiva);

        if (vb) {
          const precioVariacionBase = Number(vb.precioExtra || 0);
          const delta = precioOpcion - precioVariacionBase;
          return delta > 0 ? delta : 0;
        }
      }
      return precioOpcion;
    }

    if (isSubItemCombo || currentItem._esPromo) {
      const opcionesMismoTipo = (currentItem.opciones || []).filter(o => o.categoria === opcionObj.categoria);
      
      if (opcionesMismoTipo.length > 0) {
        let vb = null;

        if (currentItem._variacionBasePromo) {
          const varPromoEfectiva = String(currentItem._variacionBasePromo).trim().toLowerCase();
          vb = opcionesMismoTipo.find(o => String(o.nombre).trim().toLowerCase() === varPromoEfectiva);
        }

        if (!vb) {
          vb = opcionesMismoTipo.reduce((min, o) => Number(o.precioExtra || 0) < Number(min.precioExtra || 0) ? o : min, opcionesMismoTipo[0]);
        }

        if (vb) {
          const precioVariacionBase = Number(vb.precioExtra || 0);
          const delta = precioOpcion - precioVariacionBase;
          return delta > 0 ? delta : 0;
        }
      }
    }

    return precioOpcion;
  };

  const seleccionarVariacion = (categoria, opcion) => { 
    setVariacionesSeleccionadas(prev => ({ ...prev, [categoria]: opcion })); 
    setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
  };

  const avanzarCola = () => {
    if (queue.length > 1) {
        setProductoEnEspera(queue.slice(1));
    } else {
        setProductoEnEspera(null);
    }
    if (setItemAEditar) setItemAEditar(null);
  };

  const evaluarUpsell = (prodId, catName) => {
    const ahora = new Date();
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaHoy = dias[ahora.getDay()];
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

    return promosReales.find(p => {
        if (!p.activo || p.tipo !== 'upselling') return false;
        const diasPromo = typeof p.dias_aplicables === 'string' ? JSON.parse(p.dias_aplicables || '[]') : (p.dias_aplicables || []);
        if (!diasPromo.includes(diaHoy)) return false;
        const [hI, mI] = p.hora_inicio.split(':').map(Number);
        const [hF, mF] = p.hora_fin.split(':').map(Number);
        const minI = hI * 60 + mI;
        const minF = hF * 60 + mF;
        if (horaActual < minI || horaActual > minF) return false;
        if (p.producto_trigger_id && Number(p.producto_trigger_id) === Number(prodId)) return true;
        if (p.categoria_trigger && p.categoria_trigger === catName) return true;
        if (!p.producto_trigger_id && !p.categoria_trigger) return true;
        return false;
    });
  };

  const calcularPrecioSustitucion = (nombreBase, nombreNuevo) => {
    let politicas = { activa: false, modalidad: 'proporcional', tarifa_fija: 0 };
    try {
        if (configGlobal && configGlobal.politicas_sustitucion) {
            politicas = typeof configGlobal.politicas_sustitucion === 'string' 
                ? JSON.parse(configGlobal.politicas_sustitucion) 
                : configGlobal.politicas_sustitucion;
        }
    } catch(e) {}

    if (!politicas.activa) return 0;
    if (politicas.modalidad === 'fija') return Number(politicas.tarifa_fija || 0);

    const ingBase = catalogoIngredientes.find(i => i.nombre === nombreBase);
    const ingNuevo = catalogoIngredientes.find(i => i.nombre === nombreNuevo);

    const precioBase = Number(ingBase?.precio_extra || 0);
    const precioNuevo = Number(ingNuevo?.precio_extra || 0);

    const diferencia = precioNuevo - precioBase;
    return diferencia > 0 ? diferencia : 0; 
  };

  if (!currentItem) return null;

  const totalPlatilloCalculado = (() => {
    let baseCalculada = Number(currentItem.precio_base);
               
    if (isSubItemCombo) {
        baseCalculada = 0; 
    } else if (currentItem._esComboBuilder) {
        let configData = currentItem._configuracionCombo.configuracion_grupos;
        if (typeof configData === 'string') configData = JSON.parse(configData);
        baseCalculada = Number(configData.precio_combo ?? currentItem.precio_base);
    } else if (currentItem._esPromo) {
        baseCalculada = calcularPrecioBaseConPromo();
    }

    return (baseCalculada + 
        extrasAgregados.reduce((s, e) => s + Number(e.precioExtra || 0), 0) + 
        Object.values(variacionesSeleccionadas).reduce((s, v) => s + getPrecioDeltaVisual(v), 0) + 
        Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra || 0), 0) +
        Object.values(ingredientesSustituidos).reduce((s, isust) => s + Number(isust.precioCalculado || 0), 0)
    ) * cantidadProducto;
  })();

  const objGruposOpcionales = {};
  (currentItem.opciones || []).filter(o => o.tipo === 'grupo_opcional').forEach(o => {
    if (!objGruposOpcionales[o.categoria]) objGruposOpcionales[o.categoria] = { limite: o.limite || 1, opciones: [] };
    objGruposOpcionales[o.categoria].opciones.push(o);
  });
  const gruposOpcionalesList = Object.keys(objGruposOpcionales);

  let pasosWiz = [];

  const tamanosList = (currentItem.opciones || []).filter(o => o.categoria === 'Tamaño');
  if (tamanosList.length > 0) pasosWiz.push({ id: 'tamano', tipo: 'obligatorio', titulo: 'Elige el Tamaño *', opciones: tamanosList });

  const saboresList = (currentItem.opciones || []).filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
  if (saboresList.length > 0) pasosWiz.push({ id: 'sabor', tipo: 'obligatorio', titulo: 'Elige un Sabor *', opciones: saboresList.sort((a, b) => a.nombre.localeCompare(b.nombre)) });

  const categoriasObligatorias = [...new Set(currentItem.opciones?.filter(o => o.tipo === 'grupo_obligatorio').map(o => o.categoria))];
  categoriasObligatorias.forEach(cat => {
      pasosWiz.push({
        id: cat,
        tipo: 'obligatorio',
        titulo: `Elige: ${cat} *`,
        opciones: currentItem.opciones.filter(o => o.categoria === cat).sort((a, b) => a.nombre.localeCompare(b.nombre))
      });
  });

  gruposOpcionalesList.forEach(g => {
      pasosWiz.push({
          id: g,
          tipo: 'opcional',
          titulo: `Personaliza: ${g}`,
          categoria: g,
          limite: objGruposOpcionales[g].limite,
          opciones: objGruposOpcionales[g].opciones.sort((a, b) => a.nombre.localeCompare(b.nombre))
      });
  });

  const bases = (currentItem.opciones || []).filter(o => o.tipo === 'base').sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (bases.length > 0) {
      pasosWiz.push({ id: 'quitar_ingredientes', tipo: 'quitar_ingredientes', titulo: 'Modificar Ingredientes Base', opciones: bases });
  }

  pasosWiz.push({ id: 'extras_notas', tipo: 'extras_notas', titulo: 'Añadir Extras y Notas' });
  const pasoActualObj = pasosWiz[pasoPersonalizacion] || null;
  if (!pasoActualObj) return null;

  let politicasSustUI = { activa: false };
  try { if (configGlobal && configGlobal.politicas_sustitucion) politicasSustUI = typeof configGlobal.politicas_sustitucion === 'string' ? JSON.parse(configGlobal.politicas_sustitucion) : configGlobal.politicas_sustitucion; } catch(e){}

  return (
    <div className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in ${isSubItemCombo ? 'z-[250]' : 'z-[150]'}`}>
      <div className="bg-white p-6 md:p-8 rounded-[40px] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] border border-slate-100 relative">
        
        {queue.length > 1 && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black shadow-md uppercase tracking-widest z-10 flex items-center gap-2">
                <span className="animate-pulse w-2 h-2 bg-white rounded-full block"></span>
                Personalizando {queue.length} restante(s)
            </div>
        )}

        {pasoPersonalizacion > 0 && (
            <button onClick={() => setPasoPersonalizacion(p => p - 1)} className="absolute left-6 top-6 md:top-8 text-slate-400 hover:text-slate-800 font-black text-sm transition-colors z-10">
              <ArrowLeft size={20} className="inline mr-1 mb-0.5" /> Volver
            </button>
        )}

        <h2 className="text-2xl md:text-3xl font-black text-center mb-2 text-slate-800 mt-2">{currentItem._esComboBuilder ? currentItem._configuracionCombo.nombre : currentItem.nombre}</h2>
        {currentItem.descripcion && !currentItem._esComboBuilder && (
          <div className="bg-slate-50 border border-slate-100 p-3 md:p-4 rounded-2xl mb-4 shadow-sm mx-2">
            <p className="text-slate-600 font-medium text-xs md:text-sm leading-relaxed text-center">
              {currentItem.descripcion}
            </p>
          </div>
        )}
        
        <div className="flex justify-center gap-1.5 mb-6">
            {pasosWiz.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === pasoPersonalizacion ? 'w-6 bg-blue-600' : i < pasoPersonalizacion ? 'w-3 bg-emerald-500' : 'w-3 bg-slate-200'}`} />
            ))}
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar relative">
          
          {['tamaño', 'sabor', 'obligatorio', 'opcional'].includes(pasoActualObj.tipo) && (
             <div className="animate-in slide-in-from-right duration-200">
                <p className="text-center text-slate-400 font-bold mb-2 uppercase tracking-widest text-[10px] md:text-xs">{pasoActualObj.titulo}</p>
                
                {pasoActualObj.tipo === 'opcional' && (
                  <p className="text-center text-xs font-bold text-emerald-500 mb-4 border-b pb-4">
                     Seleccionadas: {(gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).length} de {pasoActualObj.limite}
                  </p>
                )}
                {pasoActualObj.tipo !== 'opcional' && <div className="border-b pb-4 mb-4"></div>}

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {pasoActualObj.opciones.map((o, idx) => {
                        let estaSeleccionado = false;
                        if (pasoActualObj.tipo === 'opcional') {
                          estaSeleccionado = (gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).some(x => x.nombre === o.nombre);
                        } else {
                          estaSeleccionado = variacionesSeleccionadas[o.categoria || pasoActualObj.id]?.nombre === o.nombre;
                        }

                        const seleccionadosActuales = gruposOpcionalesSeleccionados[pasoActualObj.categoria] || [];
                        const yaLlegoAlLimite = pasoActualObj.tipo === 'opcional' && seleccionadosActuales.length >= pasoActualObj.limite;
                        const disabled = yaLlegoAlLimite && !estaSeleccionado;

                        const precioAMostrar = getPrecioDeltaVisual(o);

                        return (
                            <button 
                                key={idx} 
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  if (pasoActualObj.tipo === 'opcional') {
                                    let currentSelection = [...(gruposOpcionalesSeleccionados[pasoActualObj.categoria] || [])];
                                    if (estaSeleccionado) {
                                      currentSelection = currentSelection.filter(x => x.nombre !== o.nombre);
                                    } else {
                                      if (currentSelection.length < pasoActualObj.limite) currentSelection.push(o);
                                    }
                                    setGruposOpcionalesSeleccionados({ ...gruposOpcionalesSeleccionados, [pasoActualObj.categoria]: currentSelection });
                                  } else {
                                    seleccionarVariacion(o.categoria || pasoActualObj.id, o);
                                  }
                                }} 
                                className={`p-4 md:p-5 rounded-2xl border-2 transition-all font-bold flex flex-col items-center justify-center text-center relative ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${estaSeleccionado ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}
                            >
                                {pasoActualObj.tipo === 'opcional' && (
                                   <div className="absolute top-2 left-2 opacity-60">
                                     {estaSeleccionado ? <CheckSquare size={16}/> : <Square size={16}/>}
                                   </div>
                                )}
                                <span className="text-sm md:text-lg leading-tight">{o.nombre}</span>
                                {(() => {
                                  const textoCero = (pasoActualObj.tipo === 'opcional' || pasoActualObj.tipo === 'grupo_opcional') ? 'Gratis' : 'Incluido';
                                  return (
                                    <span className={`text-[9px] md:text-[10px] mt-2 font-black uppercase tracking-wider px-2 py-1 rounded-md transition-colors ${estaSeleccionado ? (precioAMostrar > 0 ? 'bg-blue-500 text-white' : 'bg-blue-400/30 text-blue-100') : 'bg-slate-100 text-slate-500'}`}>
                                      {precioAMostrar > 0 ? `+$${precioAMostrar.toFixed(2)}` : textoCero}
                                    </span>
                                  );
                                })()}
                            </button>
                        );
                    })}
                </div>
             </div>
          )}

          {pasoActualObj.tipo === 'quitar_ingredientes' && (
            <div className="animate-in slide-in-from-right duration-200 space-y-4">
              <p className="text-center text-slate-400 font-bold mb-4 uppercase tracking-widest text-[10px] md:text-xs border-b pb-4">¿Deseas quitar o cambiar un ingrediente?</p>
              <div className="space-y-3">
                {pasoActualObj.opciones.map((o, idx) => {
                  const isBaseQuitada = ingredientesRemovidos.includes(o.nombre);
                  const isSustituida = ingredientesSustituidos[o.nombre];
                  const isSelectingSust = ingredienteDesplegado === o.nombre;

                  return (
                    <div key={idx} className={`p-3 md:p-4 rounded-xl transition border ${isBaseQuitada ? 'bg-rose-50 border-rose-200' : isSustituida ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-emerald-50 border-emerald-200'}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <span className={`font-bold text-sm ${isBaseQuitada ? 'line-through text-rose-500' : isSustituida ? 'text-blue-700' : 'text-emerald-700'}`}>
                                {o.nombre} {isSustituida ? `(🔄 x ${isSustituida.nuevoNombre})` : ''}
                            </span>
                            
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button type="button" onClick={() => {
                                    if (isBaseQuitada) setIngredientesRemovidos(ingredientesRemovidos.filter(i => i !== o.nombre));
                                    else {
                                        setIngredientesRemovidos([...ingredientesRemovidos, o.nombre]);
                                        const newSust = {...ingredientesSustituidos};
                                        delete newSust[o.nombre];
                                        setIngredientesSustituidos(newSust);
                                        setIngredienteDesplegado(null);
                                    }
                                }} className={`flex-1 sm:flex-none px-3 py-2 text-xs font-black rounded-lg transition ${isBaseQuitada ? 'bg-rose-500 text-white shadow-sm' : 'bg-white text-rose-500 border border-rose-200 hover:bg-rose-50'}`}>
                                    {isBaseQuitada ? 'Deshacer ❌' : 'Solo Quitar'}
                                </button>
                                
                                {politicasSustUI.activa && (
                                    <button type="button" onClick={() => {
                                        if (isSustituida) {
                                            const newSust = {...ingredientesSustituidos};
                                            delete newSust[o.nombre];
                                            setIngredientesSustituidos(newSust);
                                        } else {
                                            setIngredientesRemovidos(ingredientesRemovidos.filter(i => i !== o.nombre));
                                            setIngredienteDesplegado(isSelectingSust ? null : o.nombre);
                                        }
                                    }} className={`flex-1 sm:flex-none px-3 py-2 text-xs font-black rounded-lg transition ${isSustituida ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}>
                                        {isSustituida ? 'Deshacer 🔄' : 'Cambiar por...'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {isSelectingSust && !isSustituida && !isBaseQuitada && (
                            <div className="mt-4 pt-4 border-t border-emerald-200/50 animate-in fade-in zoom-in-95">
                                <p className="text-[10px] uppercase font-black text-slate-500 mb-3 tracking-widest">Elige el ingrediente de reemplazo:</p>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                    {catalogoIngredientes.filter(i => 
                                        (i.clasificacion_id === currentItem.clasificacion_id || i.es_extra || i.tipo === 'extra') && 
                                        i.permite_extra !== false
                                    ).map((ex, idxEx) => {
                                        const extraCost = calcularPrecioSustitucion(o.nombre, ex.nombre);
                                        return (
                                            <button key={idxEx} type="button" onClick={() => {
                                                setIngredientesSustituidos({...ingredientesSustituidos, [o.nombre]: { nuevoNombre: ex.nombre, precioCalculado: extraCost }});
                                                setIngredienteDesplegado(null);
                                            }} className="text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm transition group">
                                                <p className="text-xs font-bold text-slate-700 truncate group-hover:text-blue-800">{ex.nombre}</p>
                                                <p className="text-[10px] font-black mt-0.5 text-blue-500">{extraCost > 0 ? `+$${extraCost.toFixed(2)}` : 'Gratis'}</p>
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
            <div className="animate-in slide-in-from-right duration-200 space-y-6">
              <p className="text-center text-slate-400 font-bold mb-4 uppercase tracking-widest text-[10px] md:text-xs border-b pb-4">Añadir Extras (Opcional)</p>
              
              {(() => {
                const categoriaItem = currentItem.categoria || '';
                const extrasDelSistema = catalogoIngredientes.filter(i => 
                  (i.clasificacion_nombre === categoriaItem || i.es_extra || i.tipo === 'extra') && 
                  i.permite_extra !== false
                );
                
                const extrasMap = new Map();
                (currentItem.opciones || []).forEach(o => { if (o.tipo === 'extra') extrasMap.set(o.nombre, o); });
                extrasDelSistema.forEach(o => { extrasMap.set(o.nombre, { nombre: o.nombre, precioExtra: o.precio_extra || 0 }); });

                const extrasTodos = Array.from(extrasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

                if (extrasTodos.length > 0) {
                  return (
                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {extrasTodos.map((ex, idx) => {
                        const seleccionado = extrasAgregados.find(e => e.nombre === ex.nombre);
                        return (
                          <button key={idx} type="button" onClick={() => {
                            if (seleccionado) setExtrasAgregados(extrasAgregados.filter(e => e.nombre !== ex.nombre));
                            else setExtrasAgregados([...extrasAgregados, { nombre: ex.nombre, precioExtra: ex.precioExtra }]);
                          }} className={`p-3 md:p-4 rounded-xl font-bold text-sm transition border flex flex-col items-center gap-1 ${seleccionado ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'}`}>
                            <span className="text-center leading-tight text-xs md:text-sm">{ex.nombre}</span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${seleccionado ? 'bg-blue-200/50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>{ex.precioExtra > 0 ? `+$${ex.precioExtra}` : 'Gratis'}</span>
                          </button>
                        )
                      })}
                    </div>
                  )
                }
                return <p className="text-center text-sm font-bold text-slate-400">No hay extras disponibles para este platillo.</p>;
              })()}

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mt-4">Notas Generales</p>
                <textarea value={notaEspecial} onChange={e => setNotaEspecial(e.target.value)} placeholder="Instrucciones al chef..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-blue-500 text-slate-700 font-bold resize-none h-20 shadow-inner text-sm md:text-base" />
              </div>
            </div>
          )}

        </div>

        <div className="pt-4 md:pt-6 md:p-8 bg-white border-t border-slate-200 shrink-0">
          <div className="flex justify-between items-center mb-6">
            {pasoActualObj.tipo === 'extras_notas' ? (
                <div className="flex flex-col gap-1">
                  {(!currentItem._esPromo && !isSubItemCombo) ? (
                    <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 w-fit">
                      <button type="button" onClick={() => {
                          setCantidadProducto(Math.max(1, cantidadProducto - 1));
                          setErrorStock('');
                      }} className="px-4 md:px-5 py-2 md:py-3 text-slate-400 hover:text-slate-800 text-lg md:text-xl font-black transition">-</button>
                      
                      <span className="px-3 md:px-4 font-black text-lg md:text-xl">{cantidadProducto}</span>
                      
                      <button type="button" onClick={() => {
                          const isUsaStock = currentItem.usa_stock === true || currentItem.usa_stock === 'true';
                          const stockActual = Number(currentItem.stock_preparado) || 0;
                          
                          if (isUsaStock) {
                              const enCarrito = carrito.filter(i => (i.id || i.producto_id) === currentItem.id).reduce((s, i) => s + (i.cantidad || 1), 0);
                              if ((cantidadProducto + enCarrito) >= stockActual) {
                                  setErrorStock(`Solo quedan ${stockActual} disponibles.`);
                                  setTimeout(() => setErrorStock(''), 4000);
                                  return;
                              }
                          }
                          setCantidadProducto(cantidadProducto + 1);
                          setErrorStock('');
                      }} className="px-4 md:px-5 py-2 md:py-3 text-slate-400 hover:text-slate-800 text-lg md:text-xl font-black transition">+</button>
                    </div>
                  ) : (
                    <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 w-fit px-5 py-2 md:py-3 shadow-inner">
                      <span className="font-black text-slate-500 text-sm md:text-base">Cant: 1 (Promo)</span>
                    </div>
                  )}
                  {errorStock && <p className="text-[10px] font-black text-red-500 uppercase tracking-wide animate-in slide-in-from-top-1">{errorStock}</p>}
                </div>
            ) : (
                <div className="flex items-center"></div>
            )}

            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {isSubItemCombo ? 'Costo Adicional' : 'Total Platillo'}
              </p>
              <p className="text-3xl md:text-4xl font-black text-blue-600">
                ${totalPlatilloCalculado.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex gap-3 md:gap-4">
            <button type="button" onClick={avanzarCola} disabled={isSubmitting} className="flex-1 py-4 md:py-5 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition border border-slate-200 text-sm md:text-base disabled:opacity-50">
                {queue.length > 1 ? 'Omitir y Siguiente' : 'Cancelar'}
            </button>
            
            {pasoActualObj.tipo === 'extras_notas' ? (
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={() => {
                if(isSubmitting) return;
                setIsSubmitting(true); 

                const extrasFinales = [];
                
                let variacionObjSeleccionada = null;
                Object.values(variacionesSeleccionadas).forEach(v => {
                    const esVarPrincipal = v.categoria === 'Tamaño' || v.categoria === 'Sabor';
                    if (esVarPrincipal && !variacionObjSeleccionada) variacionObjSeleccionada = v;
                    extrasFinales.push({ nombre: `🔸 ${v.category || v.categoria}: ${v.nombre}`, precioExtra: getPrecioDeltaVisual(v), tipo: 'grupo_obligatorio' });
                });

                Object.values(gruposOpcionalesSeleccionados).flat().forEach(g => extrasFinales.push({ nombre: `🔹 ${g.categoria}: ${g.nombre}`, precioExtra: g.precioExtra, tipo: 'grupo_opcional' }));
                
                Object.entries(ingredientesSustituidos).forEach(([base, data]) => {
                    extrasFinales.push({ nombre: `🔄 Cambio: ${base} x ${data.nuevoNombre}`, precioExtra: data.precioCalculated || data.precioCalculado, tipo: 'sustitucion' });
                });

                ingredientesRemovidos.forEach(ib => extrasFinales.push({ nombre: `Sin ${ib}`, precioExtra: 0, tipo: 'base' }));
                extrasAgregados.forEach(ex => extrasFinales.push({ nombre: `Extra ${ex.nombre}`, precioExtra: ex.precioExtra, tipo: 'extra' }));
                if (notaEspecial.trim() !== '') extrasFinales.push({ nombre: `📝 Nota: ${notaEspecial.trim()}`, precioExtra: 0, tipo: 'nota' });

                if (currentItem._esPromo) {
                    extrasFinales.push({ nombre: `⭐ Promo: ${currentItem._nombrePromo}`, precioExtra: 0, tipo: 'nota' });
                    const hashRef = Math.random().toString(36).substr(2, 4).toUpperCase();
                    extrasFinales.push({ nombre: `🔗 Ref: ${hashRef}`, precioExtra: 0, tipo: 'nota' });
                }

                let baseCalculada = Number(currentItem.precio_base);
                
                if (isSubItemCombo) {
                    baseCalculada = 0; 
                } else if (currentItem._esComboBuilder) {
                    let configData = currentItem._configuracionCombo.configuracion_grupos;
                    if (typeof configData === 'string') configData = JSON.parse(configData);
                    baseCalculada = Number(configData.precio_combo ?? currentItem.precio_base);
                } else if (currentItem._esPromo) {
                    baseCalculada = calcularPrecioBaseConPromo();
                }

                const precioIndividualCalculado = baseCalculada + 
                  Object.values(variacionesSeleccionadas).reduce((s, v) => s + getPrecioDeltaVisual(v), 0) + 
                  Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra), 0) + 
                  Object.values(ingredientesSustituidos).reduce((s, isust) => s + Number(isust.precioCalculado || 0), 0) + 
                  extrasAgregados.reduce((s, e) => s + Number(e.precioExtra), 0);

                let nombreCompleto = `[${currentItem.categoria || 'General'}] ${currentItem.nombre}`;
                if (variacionObjSeleccionada && getPrecioDeltaVisual(variacionObjSeleccionada) === 0) {
                    nombreCompleto += ` (${variacionObjSeleccionada.nombre})`;
                }
                
                const nuevoItem = {
                  idTicket: Date.now().toString() + Math.random().toString(36).substr(2, 4),
                  producto_id: currentItem.id,
                  nombre: nombreCompleto,
                  categoria: currentItem.categoria,
                  destino: clasificaciones.find(c => c.nombre === (currentItem.categoria || 'General'))?.destino || 'Cocina',
                  tiempo_preparacion: currentItem.tiempo_preparacion,
                  precio_base: currentItem.precio_base,
                  precioFinal: precioIndividualCalculado,
                  cantidad: cantidadProducto,
                  opciones: currentItem.opciones || [],
                  extras: extrasFinales,
                  _esPromo: currentItem._esPromo,
                  _nombrePromo: currentItem._nombrePromo,
                  _variacionBasePromo: currentItem._variacionBasePromo
                };

                if (onSuccessOverride) {
                    onSuccessOverride(nuevoItem);
                    setIsSubmitting(false); 
                    return;
                }

                // 👇 FIX MÁSTER: Evitamos que el Kiosco agregue el combo doble al carrito.
                // Detenemos la inserción aquí y lo mandamos directamente al Asistente de Combos.
                if (currentItem._esComboBuilder) {
                    nuevoItem.nombre = currentItem._configuracionCombo.nombre;
                    nuevoItem._esCombo = true;
                    nuevoItem._comboId = currentItem._configuracionCombo.id;

                    setComboEnEspera({ 
                        productoPersonalizado: nuevoItem, 
                        configuracion: currentItem._configuracionCombo,
                        itemAEditar: itemAEditar 
                    });

                    // Limpiamos la cola en el fondo para que cuando se cierre el Asistente todo fluya normal
                    if (queue.length > 1) {
                        avanzarCola();
                    } else {
                        if (itemAEditar) setItemAEditar(null);
                        setProductoEnEspera(null);
                    }
                    
                    setIsSubmitting(false);
                    return; // 🛑 AQUÍ DETENEMOS LA EJECUCIÓN (Cura el Doble Producto)
                }

                setCarrito(prev => {
                    if (itemAEditar) {
                        return prev.map(i => i.idTicket === itemAEditar.idTicket ? nuevoItem : i);
                    } else {
                        const getExtrasStr = (extras) => (extras||[]).map(e => e.nombre).sort().join('|');
                        const extrasStrNuevo = getExtrasStr(nuevoItem.extras);
                        
                        const indexExistente = prev.findIndex(item =>
                            (item.id === nuevoItem.producto_id || item.producto_id === nuevoItem.producto_id) &&
                            getExtrasStr(item.extras) === extrasStrNuevo &&
                            item.precioFinal === nuevoItem.precioFinal &&
                            item._isCustomizedChild === nuevoItem._isCustomizedChild &&
                            item._comboGroupId === nuevoItem._comboGroupId 
                        );

                        if (indexExistente >= 0 && !nuevoItem._isCustomizedChild) {
                            const nuevoCarrito = [...prev];
                            nuevoCarrito[indexExistente] = {
                                ...nuevoCarrito[indexExistente],
                                cantidad: (nuevoCarrito[indexExistente].cantidad || 1) + cantidadProducto
                            };
                            return nuevoCarrito;
                        } else {
                            return [...prev, nuevoItem];
                        }
                    }
                });

                if (queue.length > 1) {
                    avanzarCola();
                } else {
                    if (itemAEditar) {
                        setItemAEditar(null);
                    }
                    if (!currentItem._esPromo && queue.length <= 1) {
                        const promo = evaluarUpsell(currentItem.id, currentItem.categoria);
                        if (promo && setPromocionVigente) {
                            setPromocionVigente(promo);
                        }
                    }
                    setProductoEnEspera(null);
                }
                
                setTimeout(() => setIsSubmitting(false), 300);

              }} className="flex-[2] py-4 md:py-5 bg-emerald-500 text-white font-black text-lg md:text-xl rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition active:scale-95 disabled:opacity-50">
                {itemAEditar ? 'Actualizar' : (onSuccessOverride ? 'Confirmar Selección ➡' : (currentItem._esComboBuilder ? 'Siguiente Paso ➡' : (queue.length > 1 ? `Añadir y Siguiente ➡` : `Añadir a la Orden`)))}
              </button>
            ) : (
              <button 
                type="button" 
                onClick={() => setPasoPersonalizacion(p => p + 1)} 
                disabled={pasoActualObj.tipo === 'obligatorio' && !variacionesSeleccionadas[pasoActualObj.opciones?.[0]?.categoria || pasoActualObj.id]}
                className="flex-[2] py-4 md:py-5 bg-blue-600 text-white font-black text-lg md:text-xl rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente ➡
              </button>
            )}
          </div>
        </div>
      </div>
    </div> 
  );
};

export default ModalPersonalizar;