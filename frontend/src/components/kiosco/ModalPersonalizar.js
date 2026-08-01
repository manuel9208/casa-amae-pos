import React, { useState, useEffect } from 'react';
import { CheckSquare, Square } from 'lucide-react';

const ModalPersonalizar = ({ 
  productoEnEspera, setProductoEnEspera, 
  itemAEditar, setItemAEditar, 
  carrito, setCarrito, 
  catalogoIngredientes, clasificaciones,
  configGlobal = {},
  setPromocionVigente
}) => {

  // 👇 MOTOR DE COLA SECUENCIAL
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
  const [promociones, setPromociones] = useState([]);
  
  // Estado UI Custom para el Stock (Cero Alertas Nativas)
  const [errorStock, setErrorStock] = useState('');

  useEffect(() => {
    const apiUrlLocal = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    fetch(`${apiUrlLocal}/promociones`).then(r => r.json()).then(d => setPromociones(Array.isArray(d) ? d : [])).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!currentItem) return;

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
      setVariacionesSeleccionadas({});
      setGruposOpcionalesSeleccionados({});
      setIngredientesSustituidos({}); 
      setIngredienteDesplegado(null);
    }
    setPasoPersonalizacion(0);
    setErrorStock('');
  }, [currentItem, itemAEditar]);

  const seleccionarVariacion = (categoria, opcion) => { 
    setVariacionesSeleccionadas({ ...variacionesSeleccionadas, [categoria]: opcion }); 
    setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
  };

  const avanzarCola = () => {
    if (queue.length > 1) {
        setProductoEnEspera(queue.slice(1));
    } else {
        setProductoEnEspera(null);
    }
    setItemAEditar(null);
  };

  const evaluarUpsell = (prodId, catName) => {
    const ahora = new Date();
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaHoy = dias[ahora.getDay()];
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

    return promociones.find(p => {
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

  const totalPlatilloCalculado = (Number(currentItem.precio_base) + 
    extrasAgregados.reduce((s, e) => s + Number(e.precioExtra || 0), 0) + 
    Object.values(variacionesSeleccionadas).reduce((s, v) => s + Number(v.precioExtra || 0), 0) +
    Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra || 0), 0) +
    Object.values(ingredientesSustituidos).reduce((s, isust) => s + Number(isust.precioCalculado || 0), 0)
  ) * cantidadProducto;

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-in fade-in">
      <div className="bg-white p-6 md:p-8 rounded-[40px] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] border border-slate-100 relative">
        
        {queue.length > 1 && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black shadow-md uppercase tracking-widest z-10 flex items-center gap-2">
                <span className="animate-pulse w-2 h-2 bg-white rounded-full block"></span>
                Personalizando {queue.length} restante(s)
            </div>
        )}

        {pasoPersonalizacion > 0 && (
            <button onClick={() => setPasoPersonalizacion(p => p - 1)} className="absolute left-6 top-6 md:top-8 text-slate-400 hover:text-slate-800 font-black text-sm transition-colors z-10">
              ⬅ Volver
            </button>
        )}

        <h2 className="text-2xl md:text-3xl font-black text-center mb-2 text-slate-800 mt-2">{currentItem.nombre}</h2>
        {currentItem.descripcion && (
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
                                {o.precioExtra > 0 && <span className={`text-[10px] md:text-xs mt-1 font-black uppercase tracking-wider ${estaSeleccionado ? 'text-blue-200' : 'text-slate-400'}`}>+${o.precioExtra}</span>}
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
                            <span className={seleccionado ? 'text-blue-500' : 'text-slate-400'}>{ex.precioExtra > 0 ? `+$${ex.precioExtra}` : 'Gratis'}</span>
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
                  {/* 👇 UI CUSTOM: Reemplazo elegante de alert() */}
                  {errorStock && <p className="text-[10px] font-black text-red-500 uppercase tracking-wide animate-in slide-in-from-top-1">{errorStock}</p>}
                </div>
            ) : (
                <div className="flex items-center"></div>
            )}

            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Platillo</p>
              <p className="text-3xl md:text-4xl font-black text-blue-600">
                ${totalPlatilloCalculado.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex gap-3 md:gap-4">
            <button type="button" onClick={avanzarCola} className="flex-1 py-4 md:py-5 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition border border-slate-200 text-sm md:text-base">
                {queue.length > 1 ? 'Omitir y Siguiente' : 'Cancelar'}
            </button>
            
            {pasoActualObj.tipo === 'extras_notas' ? (
              <button type="button" onClick={() => {
                const extrasFinales = [];
                Object.values(variacionesSeleccionadas).forEach(v => extrasFinales.push({ nombre: `🔸 ${v.category || v.categoria}: ${v.nombre}`, precioExtra: v.precioExtra, tipo: 'grupo_obligatorio' }));
                Object.values(gruposOpcionalesSeleccionados).flat().forEach(g => extrasFinales.push({ nombre: `🔹 ${g.categoria}: ${g.nombre}`, precioExtra: g.precioExtra, tipo: 'grupo_opcional' }));
                
                Object.entries(ingredientesSustituidos).forEach(([base, data]) => {
                    extrasFinales.push({ nombre: `🔄 Cambio: ${base} x ${data.nuevoNombre}`, precioExtra: data.precioCalculated || data.precioCalculado, tipo: 'sustitucion' });
                });

                ingredientesRemovidos.forEach(ib => extrasFinales.push({ nombre: `Sin ${ib}`, precioExtra: 0, tipo: 'base' }));
                extrasAgregados.forEach(ex => extrasFinales.push({ nombre: `Extra ${ex.nombre}`, precioExtra: ex.precioExtra, tipo: 'extra' }));
                if (notaEspecial.trim() !== '') extrasFinales.push({ nombre: `📝 Nota: ${notaEspecial.trim()}`, precioExtra: 0, tipo: 'nota' });

                // 👇 INYECTAMOS LA ETIQUETA PROMOCIONAL AUTOMÁTICA
                if (currentItem._esPromo) {
                    extrasFinales.push({ nombre: `⭐ Promo: ${currentItem._nombrePromo}`, precioExtra: 0, tipo: 'nota' });
                }

                const precioIndividualCalculado = Number(currentItem.precio_base) + 
                  Object.values(variacionesSeleccionadas).reduce((s, v) => s + (v.precioExtra || 0), 0) + 
                  Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra), 0) + 
                  Object.values(ingredientesSustituidos).reduce((s, isust) => s + Number(isust.precioCalculado || 0), 0) + 
                  extrasAgregados.reduce((s, e) => s + Number(e.precioExtra), 0);
                
                const nuevoItem = {
                  idTicket: Date.now().toString() + Math.random().toString(36).substr(2, 4), // Generador único inquebrantable
                  producto_id: currentItem.id,
                  nombre: currentItem.nombre,
                  categoria: currentItem.categoria,
                  destino: clasificaciones.find(c => c.nombre === (currentItem.categoria || 'General'))?.destino || 'Cocina',
                  tiempo_preparacion: currentItem.tiempo_preparacion,
                  precio_base: currentItem.precio_base,
                  precioFinal: precioIndividualCalculado,
                  cantidad: cantidadProducto,
                  opciones: currentItem.opciones || [],
                  extras: extrasFinales,
                  _esPromo: currentItem._esPromo // 👈 FUNDAMENTAL: Preservar la bandera
                };

                if (itemAEditar) {
                    setCarrito(carrito.map(item => item.idTicket === itemAEditar.idTicket ? nuevoItem : item));
                    avanzarCola();
                } else {
                    const getExtrasStr = (extras) => extras.map(e => e.nombre).sort().join('|');
                    const extrasStrNuevo = getExtrasStr(nuevoItem.extras);
                    
                    setCarrito(prev => {
                        // 👇 FIX DEFINITIVO: Prohibido agrupar platillos que sean promociones. Siempre irán separados.
                        let indexExistente = -1;

                        if (!nuevoItem._esPromo) {
                            indexExistente = prev.findIndex(item => 
                                !item._esPromo && // Tampoco agrupar normales con promos accidentalmente
                                (item.id === nuevoItem.id || item.producto_id === nuevoItem.producto_id) && 
                                getExtrasStr(item.extras) === extrasStrNuevo && 
                                item.precioFinal === nuevoItem.precioFinal
                            );
                        }

                        if (indexExistente >= 0) {
                            const nuevoCarrito = [...prev];
                            nuevoCarrito[indexExistente].cantidad = (nuevoCarrito[indexExistente].cantidad || 1) + cantidadProducto;
                            return nuevoCarrito;
                        } else {
                            return [...prev, nuevoItem];
                        }
                    });

                    // Lanzar Upsell recursivo solo si NO era promo y es el último de la cola
                    if (!currentItem._esPromo && queue.length <= 1) {
                        const promo = evaluarUpsell(currentItem.id, currentItem.categoria);
                        if (promo && setPromocionVigente) {
                            setPromocionVigente(promo);
                        }
                    }
                    
                    avanzarCola(); 
                }
              }} className="flex-[2] py-4 md:py-5 bg-emerald-500 text-white font-black text-lg md:text-xl rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition active:scale-95">
                {itemAEditar ? 'Actualizar' : (queue.length > 1 ? `Añadir y Siguiente ➡` : `Añadir a la Orden`)}
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