import React, { useState, useEffect } from 'react';

const ModalPersonalizar = ({ 
  productoEnEspera, setProductoEnEspera, 
  itemAEditar, setItemAEditar, 
  carrito, setCarrito, 
  catalogoIngredientes, clasificaciones 
}) => {

  // === ESTADOS LOCALES DEL MODAL ===
  const [cantidadProducto, setCantidadProducto] = useState(1);
  const [notaEspecial, setNotaEspecial] = useState('');
  const [extrasAgregados, setExtrasAgregados] = useState([]);
  const [ingredientesRemovidos, setIngredientesRemovidos] = useState([]);
  const [variacionesSeleccionadas, setVariacionesSeleccionadas] = useState({});

  // === INICIALIZACIÓN (Nuevo vs Edición) ===
  useEffect(() => {
    if (!productoEnEspera) return;

    if (itemAEditar) {
      // Si estamos editando, re-construimos el estado en base a lo que ya tenía el carrito
      const removidosTemp = []; 
      const extrasTemp = []; 
      const variacionesTemp = {}; 
      let notaTemp = '';

      (itemAEditar.extras || []).forEach(e => { 
        if (e.nombre.startsWith('Sin ')) removidosTemp.push(e.nombre.replace('Sin ', '')); 
        else if (e.nombre.startsWith('📝 Nota: ')) notaTemp = e.nombre.replace('📝 Nota: ', ''); 
        else if (e.nombre.startsWith('🔸')) { 
          const parts = e.nombre.replace('🔸 ', '').split(': '); 
          if(parts.length === 2) variacionesTemp[parts[0]] = { nombre: parts[1], precioExtra: e.precioExtra, categoria: parts[0] }; 
        } 
        else if (e.nombre.startsWith('Extra ')) extrasTemp.push({ nombre: e.nombre.replace('Extra ', ''), precioExtra: e.precioExtra }); 
      });
      
      setIngredientesRemovidos(removidosTemp); 
      setExtrasAgregados(extrasTemp); 
      setNotaEspecial(notaTemp); 
      setVariacionesSeleccionadas(variacionesTemp); 
      setCantidadProducto(itemAEditar.cantidad || 1); 
    } else {
      // Si es nuevo, reseteamos todo y pre-seleccionamos variaciones (tamaños/sabores)
      setExtrasAgregados([]); 
      setIngredientesRemovidos([]); 
      setNotaEspecial(''); 
      setCantidadProducto(1); 
      
      const varsInciales = {}; 
      const opcionesVariacion = productoEnEspera.opciones?.filter(o => o.tipo === 'variacion') || []; 
      opcionesVariacion.forEach(o => { 
        // Preselecciona la primera opción de cada categoría por defecto
        if (!varsInciales[o.categoria]) varsInciales[o.categoria] = o; 
      }); 
      setVariacionesSeleccionadas(varsInciales);
    }
  }, [productoEnEspera, itemAEditar]);

  // === FUNCIONES DE INTERACCIÓN ===
  const toggleIngredienteBase = (nombre) => { 
    setIngredientesRemovidos(prev => prev.includes(nombre) ? prev.filter(n => n !== nombre) : [...prev, nombre]); 
  };
  
  const toggleExtra = (extra) => { 
    setExtrasAgregados(prev => prev.find(e => e.nombre === extra.nombre) ? prev.filter(e => e.nombre !== extra.nombre) : [...prev, extra]); 
  };
  
  const seleccionarVariacion = (categoria, opcion) => { 
    setVariacionesSeleccionadas({ ...variacionesSeleccionadas, [categoria]: opcion }); 
  };

  const cerrarModal = () => {
    setProductoEnEspera(null);
    setItemAEditar(null);
  };

  // === LÓGICA DE CONFIRMACIÓN Y GUARDADO AL CARRITO ===
  const confirmarYAgregar = () => {
    // 1. Validar Variaciones Obligatorias
    const categoriasObligatorias = [...new Set(productoEnEspera.opciones?.filter(o => o.tipo === 'variacion').map(o => o.categoria))]; 
    for (let cat of categoriasObligatorias) { 
      if (!variacionesSeleccionadas[cat]) return alert(`Por favor, selecciona una opción para: ${cat}`); 
    }

    // 2. Calcular Precios Extras
    const costoExtras = extrasAgregados.reduce((s, e) => s + e.precioExtra, 0); 
    const costoVariaciones = Object.values(variacionesSeleccionadas).reduce((s, v) => s + (v.precioExtra || 0), 0);
    
    // 3. Armar lista final de extras para el ticket
    const modificacionesFinales = [ 
      ...Object.values(variacionesSeleccionadas).map(v => ({ nombre: `🔸 ${v.categoria}: ${v.nombre}`, precioExtra: v.precioExtra })), 
      ...ingredientesRemovidos.map(n => ({ nombre: `Sin ${n}`, precioExtra: 0 })), 
      ...extrasAgregados.map(e => ({ nombre: `Extra ${e.nombre}`, precioExtra: e.precioExtra })) 
    ]; 
    if (notaEspecial.trim() !== '') modificacionesFinales.push({ nombre: `📝 Nota: ${notaEspecial.trim()}`, precioExtra: 0 });
    
    // 4. Determinar destino (Cocina vs Barra) y Precio Final
    const clasifDB = clasificaciones.find(c => c.nombre === (productoEnEspera.categoria || 'General')); 
    const precioUnitario = Number(productoEnEspera.precio_base) + costoExtras + costoVariaciones; 
    
    const nuevoItem = { 
        ...productoEnEspera, 
        extras: modificacionesFinales, 
        precioFinal: precioUnitario, 
        destino: clasifDB ? clasifDB.destino : 'Cocina', 
        cantidad: cantidadProducto,
        idTicket: itemAEditar ? itemAEditar.idTicket : Date.now() + Math.random() 
    };

    // 5. Insertar en Carrito
    if (itemAEditar) {
        // Modo Edición: Reemplazar el existente
        setCarrito(carrito.map(item => item.idTicket === itemAEditar.idTicket ? nuevoItem : item));
    } else {
        // Modo Nuevo: Agrupar si es idéntico a otro, o agregar como nuevo renglón
        const getExtrasStr = (extras) => extras.map(e => e.nombre).sort().join('|');
        const extrasStrNuevo = getExtrasStr(nuevoItem.extras);
        
        const indexExistente = carrito.findIndex(item => 
            item.id === nuevoItem.id && 
            getExtrasStr(item.extras) === extrasStrNuevo &&
            item.precioFinal === nuevoItem.precioFinal
        );

        if (indexExistente >= 0) {
            const nuevoCarrito = [...carrito];
            nuevoCarrito[indexExistente].cantidad = (nuevoCarrito[indexExistente].cantidad || 1) + cantidadProducto;
            setCarrito(nuevoCarrito);
        } else {
            setCarrito([...carrito, nuevoItem]);
        }
    }
    
    cerrarModal();
  };

  // === HELPER CÁLCULOS VISUALES ===
  const agruparVariaciones = (opciones) => { 
    const grupos = {}; 
    opciones?.filter(o => o.tipo === 'variacion').forEach(o => { 
      if (!grupos[o.categoria]) grupos[o.categoria] = []; 
      grupos[o.categoria].push(o); 
    }); 
    return grupos; 
  };

  const obtenerExtrasDisponibles = () => { 
    if (!productoEnEspera) return []; 
    const extrasGlobales = (catalogoIngredientes || []).filter(ing => ing.clasificacion_nombre === (productoEnEspera.categoria || 'General') && (ing.tipo === 'extra' || (ing.tipo === 'base' && ing.permite_extra))); 
    const extrasManuales = productoEnEspera.opciones?.filter(o => o.tipo === 'extra') || []; 
    const extrasMap = new Map(); 
    extrasGlobales.forEach(e => extrasMap.set(e.nombre, { nombre: e.nombre, precioExtra: Number(e.precio_extra) })); 
    extrasManuales.forEach(e => extrasMap.set(e.nombre, { nombre: e.nombre, precioExtra: Number(e.precioExtra) })); 
    return Array.from(extrasMap.values()); 
  };

  if (!productoEnEspera) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white p-8 rounded-[40px] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] border border-slate-100">
        <h2 className="text-3xl font-black text-center mb-1 text-slate-800">{productoEnEspera.nombre}</h2>
        {productoEnEspera.descripcion && <p className="text-center text-slate-500 font-medium mb-4 px-2 text-sm italic leading-relaxed">"{productoEnEspera.descripcion}"</p>}
        <p className="text-center text-slate-400 font-bold mb-4 uppercase tracking-widest text-xs border-b pb-4">Personaliza tu orden</p>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* VARIACIONES (Sabores y Tamaños) */}
          {Object.entries(agruparVariaciones(productoEnEspera.opciones)).map(([categoria, opcionesGrupo]) => ( 
            <div key={categoria} className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 shadow-sm">
              <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2"><span>🏷️</span> {categoria}</h4>
              <div className="grid grid-cols-2 gap-3">
                {opcionesGrupo.map((o, idx) => { 
                  const estaSeleccionado = variacionesSeleccionadas[categoria]?.nombre === o.nombre; 
                  return ( 
                    <button key={idx} onClick={() => seleccionarVariacion(categoria, o)} className={`p-4 rounded-2xl border-2 transition-all font-bold flex flex-col items-center justify-center text-center ${estaSeleccionado ? 'border-blue-600 bg-blue-600 text-white shadow-md transform scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}>
                      <span className="text-lg leading-tight">{o.nombre}</span>
                      <span className={`text-xs mt-1 font-black uppercase tracking-wider ${estaSeleccionado ? 'text-blue-200' : 'text-slate-400'}`}>{o.precioExtra > 0 ? `+$${o.precioExtra}` : 'Gratis'}</span>
                    </button> 
                  ); 
                })}
              </div>
            </div> 
          ))}

          {/* QUITAR INGREDIENTES BASE */}
          {productoEnEspera.opciones?.filter(o => o.tipo === 'base').length > 0 && ( 
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Quitar Ingredientes</h4>
              <div className="space-y-2">
                {productoEnEspera.opciones.filter(o => o.tipo === 'base').map((o, idx) => { 
                  const estaRemovido = ingredientesRemovidos.includes(o.nombre); 
                  return ( 
                    <button key={idx} onClick={() => toggleIngredienteBase(o.nombre)} className={`w-full flex justify-between p-4 rounded-2xl border-2 transition-all font-bold ${estaRemovido ? 'border-red-200 bg-red-50 text-red-500' : 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                      <span className={estaRemovido ? 'line-through' : ''}>{o.nombre}</span><span>{estaRemovido ? 'Sin ❌' : 'Con ✅'}</span>
                    </button> 
                  ); 
                })}
              </div>
            </div> 
          )}

          {/* AGREGAR EXTRAS */}
          {obtenerExtrasDisponibles().length > 0 && ( 
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Agrega Extras</h4>
              <div className="grid grid-cols-2 gap-2">
                {obtenerExtrasDisponibles().map((o, idx) => { 
                  const seleccionado = extrasAgregados.find(e => e.nombre === o.nombre); 
                  return ( 
                    <button key={idx} onClick={() => toggleExtra(o)} className={`p-4 rounded-2xl border-2 transition-all font-bold flex flex-col items-center justify-center text-center ${seleccionado ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300 text-slate-600'}`}>
                      <span className="text-sm">{o.nombre}</span><span className="text-xs mt-1">{o.precioExtra > 0 ? `+$${o.precioExtra}` : 'Gratis'}</span>
                    </button> 
                  ); 
                })}
              </div>
            </div> 
          )}
          
          {/* NOTAS ESPECIALES */}
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Notas</h4>
            <textarea placeholder="Instrucciones al chef..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 ring-blue-500 resize-none h-24 font-medium text-slate-800" value={notaEspecial} onChange={(e) => setNotaEspecial(e.target.value)}></textarea>
          </div>
        </div>

        {/* FOOTER: CANTIDAD Y TOTAL */}
        <div className="pt-4 border-t border-slate-200 mt-4 flex items-center justify-between">
          {!itemAEditar && ( 
            <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-xl border border-slate-200">
              <button onClick={() => setCantidadProducto(c => Math.max(1, c - 1))} className="w-10 h-10 bg-white rounded-lg font-black text-xl shadow-sm text-slate-600 hover:text-blue-600">-</button>
              <span className="font-black text-xl w-6 text-center text-slate-800">{cantidadProducto}</span>
              <button onClick={() => setCantidadProducto(c => c + 1)} className="w-10 h-10 bg-white rounded-lg font-black text-xl shadow-sm text-slate-600 hover:text-blue-600">+</button>
            </div> 
          )}
          <div className="text-right flex-1">
            <p className="text-xs font-bold text-slate-400 uppercase">Total Platillo</p>
            <p className="text-3xl font-black text-blue-600">${(Number(productoEnEspera.precio_base) + extrasAgregados.reduce((s, e) => s + e.precioExtra, 0) + Object.values(variacionesSeleccionadas).reduce((s, v) => s + (v.precioExtra || 0), 0)) * cantidadProducto}</p>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex gap-4 mt-6 pt-4 border-t border-slate-100">
          <button onClick={cerrarModal} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">Cancelar</button>
          <button onClick={confirmarYAgregar} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition shadow-lg text-lg active:scale-95">
            {itemAEditar ? 'Actualizar' : `Añadir (${cantidadProducto})`}
          </button>
        </div>
      </div>
    </div> 
  );
};

export default ModalPersonalizar;