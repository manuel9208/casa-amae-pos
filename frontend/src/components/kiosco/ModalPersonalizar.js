import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Gift } from 'lucide-react';

const ModalPersonalizar = ({ 
  productoEnEspera, setProductoEnEspera, 
  itemAEditar, setItemAEditar, 
  carrito, setCarrito, 
  catalogoIngredientes, clasificaciones 
}) => {

  const [cantidadProducto, setCantidadProducto] = useState(1);
  const [notaEspecial, setNotaEspecial] = useState('');
  const [extrasAgregados, setExtrasAgregados] = useState([]);
  const [ingredientesRemovidos, setIngredientesRemovidos] = useState([]);
  const [variacionesSeleccionadas, setVariacionesSeleccionadas] = useState({});
  const [gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados] = useState({});
  const [pasoPersonalizacion, setPasoPersonalizacion] = useState(0);

  const [promociones, setPromociones] = useState([]);
  const [productosData, setProductosData] = useState([]);
  const [promocionVigente, setPromocionVigente] = useState(null);

  useEffect(() => {
    const apiUrlLocal = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    fetch(`${apiUrlLocal}/promociones`).then(r => r.json()).then(d => setPromociones(Array.isArray(d) ? d : [])).catch(()=>{});
    fetch(`${apiUrlLocal}/productos`).then(r => r.json()).then(d => setProductosData(Array.isArray(d) ? d : [])).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!productoEnEspera) return;

    if (itemAEditar) {
      const removidosTemp = []; 
      const extrasTemp = []; 
      const variacionesTemp = {}; 
      const gruposOpcTemp = {}; 
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
        else if (e.nombre.startsWith('Extra ')) extrasTemp.push({ nombre: e.nombre.replace('Extra ', ''), precioExtra: e.precioExtra }); 
      });
      
      setIngredientesRemovidos(removidosTemp); 
      setExtrasAgregados(extrasTemp); 
      setNotaEspecial(notaTemp); 
      setVariacionesSeleccionadas(variacionesTemp); 
      setGruposOpcionalesSeleccionados(gruposOpcTemp);
      setCantidadProducto(itemAEditar.cantidad || 1); 
    } else {
      setExtrasAgregados([]); setIngredientesRemovidos([]); setNotaEspecial(''); setCantidadProducto(1); 
      setVariacionesSeleccionadas({});
      setGruposOpcionalesSeleccionados({});
    }
    setPasoPersonalizacion(0);
  }, [productoEnEspera, itemAEditar]);

  const seleccionarVariacion = (categoria, opcion) => { 
    setVariacionesSeleccionadas({ ...variacionesSeleccionadas, [categoria]: opcion }); 
    setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
  };

  const cerrarModal = () => {
    setProductoEnEspera(null);
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

  const agregarUpsellAlCarrito = () => {
    let precioFinal = Number(promocionVigente.valor_descuento);
    if (promocionVigente.tipo_descuento === 'porcentaje') {
        let precioBase = 0;
        const prodOriginal = productosData.find(p => p.id === promocionVigente.producto_oferta_id);
        if (prodOriginal) precioBase = Number(prodOriginal.precio_base);
        precioFinal = precioBase - (precioBase * (precioFinal / 100));
    }
    
    const nuevoItem = {
        idTicket: Date.now().toString() + '_promo',
        id: promocionVigente.producto_oferta_id,
        nombre: promocionVigente.oferta_nombre,
        precioFinal: Math.max(0, precioFinal), 
        cantidad: 1,
        extras: [{ nombre: `⭐ Promo: ${promocionVigente.nombre}`, precioExtra: 0, tipo: 'nota' }]
    };
    
    setCarrito(prev => [...prev, nuevoItem]);
    setPromocionVigente(null);
    cerrarModal();
  };

  if (!productoEnEspera) return null;

  const totalPlatilloCalculado = (Number(productoEnEspera.precio_base) + 
    extrasAgregados.reduce((s, e) => s + Number(e.precioExtra || 0), 0) + 
    Object.values(variacionesSeleccionadas).reduce((s, v) => s + Number(v.precioExtra || 0), 0) +
    Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra || 0), 0)
  ) * cantidadProducto;

  const objGruposOpcionales = {};
  (productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_opcional').forEach(o => {
    if (!objGruposOpcionales[o.categoria]) objGruposOpcionales[o.categoria] = { limite: o.limite || 1, opciones: [] };
    objGruposOpcionales[o.categoria].opciones.push(o);
  });
  const gruposOpcionalesList = Object.keys(objGruposOpcionales);

  let pasosWiz = [];

  const tamanosList = (productoEnEspera.opciones || []).filter(o => o.categoria === 'Tamaño');
  if (tamanosList.length > 0) pasosWiz.push({ id: 'tamano', tipo: 'obligatorio', titulo: 'Elige el Tamaño *', opciones: tamanosList });

  const saboresList = (productoEnEspera.opciones || []).filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
  if (saboresList.length > 0) pasosWiz.push({ id: 'sabor', tipo: 'obligatorio', titulo: 'Elige un Sabor *', opciones: saboresList.sort((a, b) => a.nombre.localeCompare(b.nombre)) });

  const categoriasObligatorias = [...new Set(productoEnEspera.opciones?.filter(o => o.tipo === 'grupo_obligatorio').map(o => o.categoria))];
  categoriasObligatorias.forEach(cat => {
      pasosWiz.push({
        id: cat,
        tipo: 'obligatorio',
        titulo: `Elige: ${cat} *`,
        opciones: productoEnEspera.opciones.filter(o => o.categoria === cat).sort((a, b) => a.nombre.localeCompare(b.nombre))
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

  const bases = (productoEnEspera.opciones || []).filter(o => o.tipo === 'base').sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (bases.length > 0) {
      pasosWiz.push({ id: 'quitar_ingredientes', tipo: 'quitar_ingredientes', titulo: '¿Quitar Ingredientes?', opciones: bases });
  }

  pasosWiz.push({ id: 'extras_notas', tipo: 'extras_notas', titulo: 'Añadir Extras y Notas' });
  const pasoActualObj = pasosWiz[pasoPersonalizacion] || null;
  if (!pasoActualObj) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white p-8 rounded-[40px] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] border border-slate-100 relative">
        
        {pasoPersonalizacion > 0 && (
            <button onClick={() => setPasoPersonalizacion(p => p - 1)} className="absolute left-6 top-8 text-slate-400 hover:text-slate-800 font-black text-sm transition-colors z-10">
              ⬅ Volver
            </button>
        )}

        <h2 className="text-3xl font-black text-center mb-1 text-slate-800 mt-2">{productoEnEspera.nombre}</h2>
        {productoEnEspera.descripcion && <p className="text-center text-slate-500 font-medium mb-4 px-2 text-sm italic leading-relaxed">"{productoEnEspera.descripcion}"</p>}
        
        <div className="flex justify-center gap-1.5 mb-6">
            {pasosWiz.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === pasoPersonalizacion ? 'w-6 bg-blue-600' : i < pasoPersonalizacion ? 'w-3 bg-emerald-500' : 'w-3 bg-slate-200'}`} />
            ))}
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar relative">
          
          {['tamaño', 'sabor', 'obligatorio', 'opcional'].includes(pasoActualObj.tipo) && (
             <div className="animate-in slide-in-from-right duration-200">
                <p className="text-center text-slate-400 font-bold mb-2 uppercase tracking-widest text-xs">{pasoActualObj.titulo}</p>
                
                {pasoActualObj.tipo === 'opcional' && (
                  <p className="text-center text-xs font-bold text-emerald-500 mb-4 border-b pb-4">
                     Seleccionadas: {(gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).length} de {pasoActualObj.limite}
                  </p>
                )}
                {pasoActualObj.tipo !== 'opcional' && <div className="border-b pb-4 mb-4"></div>}

                <div className="grid grid-cols-2 gap-4">
                    {pasoActualObj.opciones.map((o, idx) => {
                        let estaSeleccionado = false;
                        if (pasoActualObj.tipo === 'opcional') {
                          estaSeleccionado = (gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).some(x => x.nombre === o.nombre);
                        } else {
                          estaSeleccionado = variacionesSeleccionadas[pasoActualObj.id]?.nombre === o.nombre;
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
                                    seleccionarVariacion(pasoActualObj.id, o);
                                  }
                                }} 
                                className={`p-5 rounded-2xl border-2 transition-all font-bold flex flex-col items-center justify-center text-center relative ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${estaSeleccionado ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}
                            >
                                {pasoActualObj.tipo === 'opcional' && (
                                   <div className="absolute top-2 left-2 opacity-60">
                                     {estaSeleccionado ? <CheckSquare size={16}/> : <Square size={16}/>}
                                   </div>
                                )}
                                <span className="text-lg leading-tight">{o.nombre}</span>
                                {o.precioExtra > 0 && <span className={`text-xs mt-1 font-black uppercase tracking-wider ${estaSeleccionado ? 'text-blue-200' : 'text-slate-400'}`}>+${o.precioExtra}</span>}
                            </button>
                        );
                    })}
                </div>
             </div>
          )}

          {pasoActualObj.tipo === 'quitar_ingredientes' && (
            <div className="animate-in slide-in-from-right duration-200 space-y-4">
              <p className="text-center text-slate-400 font-bold mb-4 uppercase tracking-widest text-xs border-b pb-4">¿Deseas quitar algún ingrediente?</p>
              <div className="space-y-2">
                {pasoActualObj.opciones.map((o, idx) => {
                  const isBaseQuitada = ingredientesRemovidos.includes(o.nombre);
                  return (
                    <button key={idx} onClick={() => {
                      if (isBaseQuitada) setIngredientesRemovidos(ingredientesRemovidos.filter(i => i !== o.nombre));
                      else setIngredientesRemovidos([...ingredientesRemovidos, o.nombre]);
                    }} className={`w-full flex justify-between items-center p-4 rounded-xl font-bold transition border ${isBaseQuitada ? 'bg-rose-50 text-rose-500 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      <span className={isBaseQuitada ? 'line-through' : ''}>{o.nombre}</span>
                      <span>{isBaseQuitada ? 'Sin ❌' : 'Con ✅'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {pasoActualObj.tipo === 'extras_notas' && (
            <div className="animate-in slide-in-from-right duration-200 space-y-6">
              <p className="text-center text-slate-400 font-bold mb-4 uppercase tracking-widest text-xs border-b pb-4">Añadir Extras (Opcional)</p>
              
              {(() => {
                const categoriaItem = productoEnEspera.categoria || '';
                const extrasDelSistema = catalogoIngredientes.filter(i => 
                  (i.clasificacion_nombre === categoriaItem || i.es_extra || i.tipo === 'extra') && 
                  i.permite_extra !== false
                );
                
                const extrasMap = new Map();
                (productoEnEspera.opciones || []).forEach(o => { if (o.tipo === 'extra') extrasMap.set(o.nombre, o); });
                extrasDelSistema.forEach(o => { extrasMap.set(o.nombre, { nombre: o.nombre, precioExtra: o.precio_extra || 0 }); });

                const extrasTodos = Array.from(extrasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

                if (extrasTodos.length > 0) {
                  return (
                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {extrasTodos.map((ex, idx) => {
                        const seleccionado = extrasAgregados.find(e => e.nombre === ex.nombre);
                        return (
                          <button key={idx} onClick={() => {
                            if (seleccionado) setExtrasAgregados(extrasAgregados.filter(e => e.nombre !== ex.nombre));
                            else setExtrasAgregados([...extrasAgregados, { nombre: ex.nombre, precioExtra: ex.precioExtra }]);
                          }} className={`p-4 rounded-xl font-bold text-sm transition border flex flex-col items-center gap-1 ${seleccionado ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'}`}>
                            <span className="text-center leading-tight">{ex.nombre}</span>
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
                <textarea value={notaEspecial} onChange={e => setNotaEspecial(e.target.value)} placeholder="Instrucciones al chef..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-blue-500 text-slate-700 font-bold resize-none h-20 shadow-inner" />
              </div>
            </div>
          )}

        </div>

        <div className="p-8 bg-white border-t border-slate-200 shrink-0">
          <div className="flex justify-between items-center mb-6">
            {pasoActualObj.tipo === 'extras_notas' ? (
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200">
                  <button onClick={() => setCantidadProducto(Math.max(1, cantidadProducto - 1))} className="px-5 py-3 text-slate-400 hover:text-slate-800 text-xl font-black transition">-</button>
                  <span className="px-4 font-black text-xl">{cantidadProducto}</span>
                  <button onClick={() => setCantidadProducto(cantidadProducto + 1)} className="px-5 py-3 text-slate-400 hover:text-slate-800 text-xl font-black transition">+</button>
                </div>
            ) : (
                <div className="flex items-center">
                    {['opcional', 'quitar_ingredientes'].includes(pasoActualObj.tipo) && (
                       <button onClick={() => setPasoPersonalizacion(p => p + 1)} className="bg-emerald-500 text-white font-black px-6 py-3 rounded-xl shadow-md hover:bg-emerald-600 active:scale-95 transition">
                          Siguiente ➡
                       </button>
                    )}
                </div>
            )}

            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Platillo</p>
              <p className="text-4xl font-black text-blue-600">
                ${totalPlatilloCalculado.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={cerrarModal} className="flex-1 py-5 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition border border-slate-200">Cancelar</button>
            
            {pasoActualObj.tipo === 'extras_notas' && (
              <button onClick={() => {
                const extrasFinales = [];
                Object.values(variacionesSeleccionadas).forEach(v => extrasFinales.push({ nombre: `🔸 ${v.categoria}: ${v.nombre}`, precioExtra: v.precioExtra, tipo: 'grupo_obligatorio' }));
                Object.values(gruposOpcionalesSeleccionados).flat().forEach(g => extrasFinales.push({ nombre: `🔹 ${g.categoria}: ${g.nombre}`, precioExtra: g.precioExtra, tipo: 'grupo_opcional' }));
                ingredientesRemovidos.forEach(ib => extrasFinales.push({ nombre: `Sin ${ib}`, precioExtra: 0, tipo: 'base' }));
                extrasAgregados.forEach(ex => extrasFinales.push({ nombre: `Extra ${ex.nombre}`, precioExtra: ex.precioExtra, tipo: 'extra' }));
                if (notaEspecial.trim() !== '') extrasFinales.push({ nombre: `📝 Nota: ${notaEspecial.trim()}`, precioExtra: 0, tipo: 'nota' });

                const precioIndividualCalculado = Number(productoEnEspera.precio_base) + 
                  Object.values(variacionesSeleccionadas).reduce((s, v) => s + (v.precioExtra || 0), 0) + 
                  Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra), 0) + 
                  extrasAgregados.reduce((s, e) => s + Number(e.precioExtra), 0);
                
                const nuevoItem = {
                  idTicket: Date.now().toString(),
                  producto_id: productoEnEspera.id,
                  nombre: productoEnEspera.nombre,
                  categoria: productoEnEspera.categoria,
                  destino: clasificaciones.find(c => c.nombre === (productoEnEspera.categoria || 'General'))?.destino || 'Cocina',
                  tiempo_preparacion: productoEnEspera.tiempo_preparacion,
                  precio_base: productoEnEspera.precio_base,
                  precioFinal: precioIndividualCalculado,
                  cantidad: cantidadProducto,
                  opciones: productoEnEspera.opciones || [],
                  extras: extrasFinales
                };

                if (itemAEditar) {
                    setCarrito(carrito.map(item => item.idTicket === itemAEditar.idTicket ? nuevoItem : item));
                    cerrarModal();
                } else {
                    const getExtrasStr = (extras) => extras.map(e => e.nombre).sort().join('|');
                    const extrasStrNuevo = getExtrasStr(nuevoItem.extras);
                    const indexExistente = carrito.findIndex(item => item.id === nuevoItem.id && getExtrasStr(item.extras) === extrasStrNuevo && item.precioFinal === nuevoItem.precioFinal);

                    if (indexExistente >= 0) {
                        const nuevoCarrito = [...carrito];
                        nuevoCarrito[indexExistente].cantidad = (nuevoCarrito[indexExistente].cantidad || 1) + cantidadProducto;
                        setCarrito(nuevoCarrito);
                    } else {
                        setCarrito([...carrito, nuevoItem]);
                    }

                    const promo = evaluarUpsell(productoEnEspera.id, productoEnEspera.categoria);
                    if (promo) {
                        setPromocionVigente(promo);
                    } else {
                        cerrarModal();
                    }
                }
              }} className="flex-[2] py-5 bg-emerald-500 text-white font-black text-xl rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition active:scale-95">
                {itemAEditar ? 'Actualizar' : `Añadir (${cantidadProducto})`}
              </button>
            )}
          </div>
        </div>

        {/* MODAL PROMOCIÓN / UPSELL KIOSCO */}
        {promocionVigente && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl text-center animate-in zoom-in duration-300 border-4 border-orange-400">
              <div className="bg-orange-100 text-orange-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                 <Gift size={48} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2 leading-tight">¡Oferta Especial! 🔥</h2>
              <p className="text-slate-500 font-medium mb-6">¿Te gustaría agregar esto a tu orden?</p>
              
              <div className="bg-slate-50 border-2 border-orange-200 rounded-3xl p-6 mb-8 transform hover:scale-105 transition">
                 {promocionVigente.oferta_imagen && (
                    <img src={promocionVigente.oferta_imagen.startsWith('http') ? promocionVigente.oferta_imagen : `${(process.env.REACT_APP_API_URL || 'http://localhost:4000/api').replace('/api', '')}${promocionVigente.oferta_imagen}`} className="w-32 h-32 object-cover rounded-2xl mx-auto mb-4 shadow-sm" alt="promo" />
                 )}
                 <h3 className="font-black text-2xl text-slate-800 mb-2 leading-tight">{promocionVigente.oferta_nombre}</h3>
                 <p className="text-lg font-bold text-orange-600 bg-orange-100 px-4 py-2 rounded-xl inline-block mt-2">
                   {promocionVigente.tipo_descuento === 'porcentaje' ? `Llévalo con ${promocionVigente.valor_descuento}% de descuento` : `Precio especial: $${Number(promocionVigente.valor_descuento).toFixed(2)}`}
                 </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button onClick={agregarUpsellAlCarrito} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg shadow-orange-500/30 transition active:scale-95">¡Sí, agregarlo a la orden!</button>
                <button onClick={() => { setPromocionVigente(null); cerrarModal(); }} className="w-full bg-slate-100 text-slate-500 hover:bg-slate-200 py-4 rounded-2xl font-bold transition active:scale-95">No, gracias</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div> 
  );
};

export default ModalPersonalizar;