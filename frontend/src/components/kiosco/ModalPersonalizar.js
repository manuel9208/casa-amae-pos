import React, { useState, useEffect } from 'react';
import SeccionVariaciones from './personalizar/SeccionVariaciones';
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
      const opcionesVariacion = productoEnEspera.opciones?.filter(o => o.tipo === 'variacion') || []; 
      opcionesVariacion.forEach(o => { 
        if (!varsInciales[o.categoria]) varsInciales[o.categoria] = o; 
      }); 
      setVariacionesSeleccionadas(varsInciales);
    }
  }, [productoEnEspera, itemAEditar]);

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

  const confirmarYAgregar = () => {
    const p = productoEnEspera;
    const categoriasObligatorias = [...new Set(p.opciones?.filter(o => o.tipo === 'variacion').map(o => o.categoria))]; 
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white p-8 rounded-[40px] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] border border-slate-100">
        <h2 className="text-3xl font-black text-center mb-1 text-slate-800">{productoEnEspera.nombre}</h2>
        {productoEnEspera.descripcion && <p className="text-center text-slate-500 font-medium mb-4 px-2 text-sm italic leading-relaxed">"{productoEnEspera.descripcion}"</p>}
        <p className="text-center text-slate-400 font-bold mb-4 uppercase tracking-widest text-xs border-b pb-4">Personaliza tu orden</p>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          <SeccionVariaciones productoEnEspera={productoEnEspera} variacionesSeleccionadas={variacionesSeleccionadas} seleccionarVariacion={seleccionarVariacion} />
          
          <SeccionIngredientes 
             productoEnEspera={productoEnEspera} ingredientesRemovidos={ingredientesRemovidos} toggleIngredienteBase={toggleIngredienteBase}
             catalogoIngredientes={catalogoIngredientes} extrasAgregados={extrasAgregados} toggleExtra={toggleExtra}
             notaEspecial={notaEspecial} setNotaEspecial={setNotaEspecial}
          />
        </div>

        <FooterPersonalizar 
          itemAEditar={itemAEditar} cantidadProducto={cantidadProducto} setCantidadProducto={setCantidadProducto}
          totalPlatillo={totalPlatilloCalculado} cerrarModal={cerrarModal} confirmarYAgregar={confirmarYAgregar}
        />
      </div>
    </div> 
  );
};

export default ModalPersonalizar;