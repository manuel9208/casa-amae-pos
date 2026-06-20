import React, { useState, useEffect } from 'react';
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
  
  const [pasoPersonalizacion, setPasoPersonalizacion] = useState(0);

  useEffect(() => {
    if (!productoEnEspera) return;

    if (itemAEditar) {
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
      setExtrasAgregados([]); setIngredientesRemovidos([]); setNotaEspecial(''); setCantidadProducto(1); 
      const varsInciales = {}; 
      setVariacionesSeleccionadas(varsInciales);
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
    
    const categoriasObligatorias = [...new Set(p.opciones?.filter(o => o.tipo === 'variacion' || o.tipo === 'grupo_obligatorio').map(o => o.categoria))]; 
    for (let cat of categoriasObligatorias) { 
      if (!variacionesSeleccionadas[cat]) return alert(`Por favor, selecciona una opción para: ${cat}`); 
    }

    const costoExtras = extrasAgregados.reduce((s, e) => s + e.precioExtra, 0); 
    const costoVariaciones = Object.values(variacionesSeleccionadas).reduce((s, v) => s + (v.precioExtra || 0), 0);
    
    const modificacionesFinales = [ 
      ...Object.values(variacionesSeleccionadas).map(v => ({ nombre: `🔸 ${v.categoria}: ${v.nombre}`, precioExtra: v.precioExtra })), 
      ...ingredientesRemovidos.map(n => ({ nombre: `Sin ${n}`, precioExtra: 0 })), 
      ...extrasAgregados.map(e => ({ nombre: `Extra ${e.nombre}`, precioExtra: e.precioExtra })) 
    ]; 
    if (notaEspecial.trim() !== '') modificacionesFinales.push({ nombre: `📝 Nota: ${notaEspecial.trim()}`, precioExtra: 0 });
    
    const clasifDB = clasificaciones.find(c => c.nombre === (p.categoria || 'General')); 
    const precioUnitario = Number(p.precio_base) + costoExtras + costoVariaciones; 
    
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

  const totalPlatilloCalculado = (Number(productoEnEspera.precio_base) + extrasAgregados.reduce((s, e) => s + e.precioExtra, 0) + Object.values(variacionesSeleccionadas).reduce((s, v) => s + (v.precioExtra || 0), 0)) * cantidadProducto;

  const categoriasObligatorias = [...new Set(productoEnEspera.opciones?.filter(o => o.tipo === 'variacion' || o.tipo === 'grupo_obligatorio').map(o => o.categoria))];
  
  let pasosWiz = [];
  categoriasObligatorias.forEach(cat => {
      // 👇 ORDEN ALFABÉTICO EN WIZARD DEL KIOSCO
      pasosWiz.push({
        id: cat,
        titulo: `Elige: ${cat} *`,
        opciones: productoEnEspera.opciones.filter(o => o.categoria === cat).sort((a, b) => a.nombre.localeCompare(b.nombre))
      });
  });
  pasosWiz.push({ id: 'final', titulo: 'Opcionales y Notas' });

  const pasoActualObj = pasosWiz[pasoPersonalizacion];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white p-8 rounded-[40px] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] border border-slate-100 relative">
        
        {pasoPersonalizacion > 0 && (
            <button onClick={() => setPasoPersonalizacion(p => p - 1)} className="absolute left-6 top-8 text-slate-400 hover:text-slate-800 font-black text-sm">
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
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
          
          {pasoActualObj.id !== 'final' ? (
             <div className="animate-in slide-in-from-right duration-200">
                <p className="text-center text-slate-400 font-bold mb-4 uppercase tracking-widest text-xs border-b pb-4">{pasoActualObj.titulo}</p>
                <div className="grid grid-cols-2 gap-3">
                    {pasoActualObj.opciones.map((o, idx) => {
                        const estaSeleccionado = variacionesSeleccionadas[pasoActualObj.id]?.nombre === o.nombre;
                        return (
                            <button 
                                key={idx} 
                                type="button"
                                onClick={() => seleccionarVariacion(pasoActualObj.id, o)} 
                                className={`p-5 rounded-2xl border-2 transition-all font-bold flex flex-col items-center justify-center text-center ${estaSeleccionado ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}
                            >
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
                <button type="button" onClick={cerrarModal} className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">Cancelar</button>
            </div>
        )}
      </div>
    </div> 
  );
};

export default ModalPersonalizar;