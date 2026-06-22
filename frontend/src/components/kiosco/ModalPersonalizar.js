import React, { useState, useEffect } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import SeccionIngredientes from './personalizar/SeccionIngredientes';
import FooterPersonalizar from './personalizar/FooterPersonalizar';

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
  
  // 👇 NUEVO ESTADO PARA GRUPOS OPCIONALES
  const [gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados] = useState({});
  const [pasoPersonalizacion, setPasoPersonalizacion] = useState(0);

  useEffect(() => {
    if (!productoEnEspera) return;

    if (itemAEditar) {
      const removidosTemp = []; 
      const extrasTemp = []; 
      const variacionesTemp = {}; 
      const gruposOpcTemp = {}; // Para reconstruir la edición
      let notaTemp = '';

      (itemAEditar.extras || []).forEach(e => { 
        if (e.nombre.startsWith('Sin ')) removidosTemp.push(e.nombre.replace('Sin ', '')); 
        else if (e.nombre.startsWith('📝 Nota: ')) notaTemp = e.nombre.replace('📝 Nota: ', ''); 
        else if (e.nombre.startsWith('🔸')) { 
          const parts = e.nombre.replace('🔸 ', '').split(': '); 
          if(parts.length === 2) variacionesTemp[parts[0]] = { nombre: parts[1], precioExtra: e.precioExtra, categoria: parts[0] }; 
        } 
        else if (e.nombre.startsWith('🔹')) { 
          // Reconstruir grupos opcionales al editar
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

  const toggleIngredienteBase = (nombre) => { 
    setIngredientesRemovidos(prev => prev.includes(nombre) ? prev.filter(n => n !== nombre) : [...prev, nombre]); 
  };
  
  const toggleExtra = (extra) => { 
    setExtrasAgregados(prev => prev.find(e => e.nombre === extra.nombre) ? prev.filter(e => e.nombre !== extra.nombre) : [...prev, extra]); 
  };
  
  const seleccionarVariacion = (categoria, opcion) => { 
    setVariacionesSeleccionadas({ ...variacionesSeleccionadas, [categoria]: opcion }); 
    setTimeout(() => setPasoPersonalizacion(p => p + 1), 150);
  };

  const cerrarModal = () => {
    setProductoEnEspera(null);
    setItemAEditar(null);
  };

  const confirmarYAgregar = () => {
    const p = productoEnEspera;
    
    // Validación para Obligatorios
    const categoriasObligatorias = [...new Set(p.opciones?.filter(o => o.tipo === 'variacion' || o.tipo === 'grupo_obligatorio').map(o => o.categoria))]; 
    for (let cat of categoriasObligatorias) { 
      if (!variacionesSeleccionadas[cat]) return alert(`Por favor, selecciona una opción para: ${cat}`); 
    }

    const costoExtras = extrasAgregados.reduce((s, e) => s + e.precioExtra, 0); 
    const costoVariaciones = Object.values(variacionesSeleccionadas).reduce((s, v) => s + (v.precioExtra || 0), 0);
    // 👇 Sumamos el costo de lo opcional
    const costoOpcionales = Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra || 0), 0);
    
    const modificacionesFinales = [ 
      ...Object.values(variacionesSeleccionadas).map(v => ({ nombre: `🔸 ${v.categoria}: ${v.nombre}`, precioExtra: v.precioExtra, tipo: 'grupo_obligatorio' })), 
      // 👇 Inyectamos selecciones del grupo opcional
      ...Object.values(gruposOpcionalesSeleccionados).flat().map(g => ({ nombre: `🔹 ${g.categoria}: ${g.nombre}`, precioExtra: g.precioExtra, tipo: 'grupo_opcional' })),
      ...ingredientesRemovidos.map(n => ({ nombre: `Sin ${n}`, precioExtra: 0, tipo: 'base' })), 
      ...extrasAgregados.map(e => ({ nombre: `Extra ${e.nombre}`, precioExtra: e.precioExtra, tipo: 'extra' })) 
    ]; 
    if (notaEspecial.trim() !== '') modificacionesFinales.push({ nombre: `📝 Nota: ${notaEspecial.trim()}`, precioExtra: 0, tipo: 'nota' });
    
    const clasifDB = clasificaciones.find(c => c.nombre === (p.categoria || 'General')); 
    const precioUnitario = Number(p.precio_base) + costoExtras + costoVariaciones + costoOpcionales; 
    
    const nuevoItem = { 
        ...p, extras: modificacionesFinales, precioFinal: precioUnitario, 
        destino: clasifDB ? clasifDB.destino : 'Cocina', cantidad: cantidadProducto,
        idTicket: itemAEditar ? itemAEditar.idTicket : Date.now() + Math.random() 
    };

    if (itemAEditar) {
        setCarrito(carrito.map(item => item.idTicket === itemAEditar.idTicket ? nuevoItem : item));
    } else {
        const getExtrasStr = (extras) => extras.map(e => e.nombre).sort().join('|');
        const extrasStrNuevo = getExtrasStr(nuevoItem.extras);
        
        const indexExistente = carrito.findIndex(item => 
            item.id === nuevoItem.id && getExtrasStr(item.extras) === extrasStrNuevo && item.precioFinal === nuevoItem.precioFinal
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

  if (!productoEnEspera) return null;

  const totalPlatilloCalculado = (Number(productoEnEspera.precio_base) + 
    extrasAgregados.reduce((s, e) => s + e.precioExtra, 0) + 
    Object.values(variacionesSeleccionadas).reduce((s, v) => s + (v.precioExtra || 0), 0) +
    Object.values(gruposOpcionalesSeleccionados).flat().reduce((s, g) => s + Number(g.precioExtra || 0), 0)
  ) * cantidadProducto;

  // 👇 DETECCIÓN DE PASOS DEL WIZARD
  const categoriasObligatorias = [...new Set(productoEnEspera.opciones?.filter(o => o.tipo === 'variacion' || o.tipo === 'grupo_obligatorio').map(o => o.categoria))];
  
  const objGruposOpcionales = {};
  (productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_opcional').forEach(o => {
    if (!objGruposOpcionales[o.categoria]) objGruposOpcionales[o.categoria] = { limite: o.limite || 1, opciones: [] };
    objGruposOpcionales[o.categoria].opciones.push(o);
  });
  const gruposOpcionalesList = Object.keys(objGruposOpcionales);

  let pasosWiz = [];
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

  pasosWiz.push({ id: 'final', tipo: 'final', titulo: 'Opcionales y Notas' });

  const pasoActualObj = pasosWiz[pasoPersonalizacion];

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
          
          {pasoActualObj.tipo !== 'final' ? (
             <div className="animate-in slide-in-from-right duration-200">
                <p className="text-center text-slate-400 font-bold mb-2 uppercase tracking-widest text-xs">{pasoActualObj.titulo}</p>
                
                {pasoActualObj.tipo === 'opcional' && (
                  <p className="text-center text-xs font-bold text-emerald-500 mb-4 border-b pb-4">
                     Seleccionadas: {(gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).length} de {pasoActualObj.limite}
                  </p>
                )}
                {pasoActualObj.tipo !== 'opcional' && <div className="border-b pb-4 mb-4"></div>}

                <div className="grid grid-cols-2 gap-3">
                    {pasoActualObj.opciones.map((o, idx) => {
                        let estaSeleccionado = false;
                        if (pasoActualObj.tipo === 'opcional') {
                          estaSeleccionado = (gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).some(x => x.nombre === o.nombre);
                        } else {
                          estaSeleccionado = variacionesSeleccionadas[pasoActualObj.id]?.nombre === o.nombre;
                        }

                        // Bloquear si alcanzó el límite
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
          ) : (
             <div className="animate-in slide-in-from-right duration-200">
                <p className="text-center text-slate-400 font-bold mb-4 uppercase tracking-widest text-xs border-b pb-4">Personaliza tu orden (Opcional)</p>
                <SeccionIngredientes 
                   productoEnEspera={productoEnEspera} ingredientesRemovidos={ingredientesRemovidos} toggleIngredienteBase={toggleIngredienteBase}
                   catalogoIngredientes={catalogoIngredientes} extrasAgregados={extrasAgregados} toggleExtra={toggleExtra}
                   notaEspecial={notaEspecial} setNotaEspecial={setNotaEspecial}
                />
             </div>
          )}

        </div>

        {pasoActualObj.id === 'final' ? (
            <FooterPersonalizar 
              itemAEditar={itemAEditar} cantidadProducto={cantidadProducto} setCantidadProducto={setCantidadProducto}
              totalPlatillo={totalPlatilloCalculado} cerrarModal={cerrarModal} confirmarYAgregar={confirmarYAgregar}
            />
        ) : (
            <div className="pt-4 border-t border-slate-200 mt-4 flex items-center justify-between">
                <button type="button" onClick={cerrarModal} className="w-1/2 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95 mr-2">Cancelar</button>
                {pasoActualObj.tipo === 'opcional' ? (
                  <button type="button" onClick={() => setPasoPersonalizacion(p => p + 1)} className="w-1/2 py-4 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition active:scale-95 ml-2 shadow-md">Siguiente ➡</button>
                ) : (
                  <div className="w-1/2 ml-2"></div>
                )}
            </div>
        )}
      </div>
    </div> 
  );
};

export default ModalPersonalizar;