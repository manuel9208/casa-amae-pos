import React, { useState, useEffect } from 'react';
import { AlertTriangle, Edit, Plus, Package, ShoppingBag, RotateCcw, Trash2, Layers, Box, Scale } from 'lucide-react';

const Inventario = ({
  insumosDB, productos, clasificaciones, 
  apiUrl, refrescarDatos, showAlert, showConfirm
}) => {
  
  const [subSeccionInventario, setSubSeccionInventario] = useState('insumos');
  
  const [nuevoInsumo, setNuevoInsumo] = useState({ nombre: '', unidad_medida: 'KL', cantidad_presentacion: '', costo_presentacion: '', es_empaque: false });
  const [editandoInsumoId, setEditandoInsumoId] = useState(null);
  
  const [modalCompra, setModalCompra] = useState(null);
  const [compraPaquetes, setCompraPaquetes] = useState('');
  const [compraCosto, setCompraCosto] = useState('');

  const [recetaCategoriaFiltro, setRecetaCategoriaFiltro] = useState('');
  const [recetaActivaId, setRecetaActivaId] = useState('');
  const [recetaItems, setRecetaItems] = useState([]);
  
  const [rendimientoCalculadora, setRendimientoCalculadora] = useState(1);
  const [unidadRendimiento, setUnidadRendimiento] = useState('PZ');
  
  const [tipoIngresoReceta, setTipoIngresoReceta] = useState('insumo'); 
  const [nuevoItemReceta, setNuevoItemReceta] = useState({ insumo_id: '', cantidad_usada: '' });
  const [nuevoItemSubReceta, setNuevoItemSubReceta] = useState({ sub_producto_id: '', cantidad_usada: '' });

  const [configTamanos, setConfigTamanos] = useState({});
  const [unidadConversionActiva, setUnidadConversionActiva] = useState('');

  const [modalCrearBase, setModalCrearBase] = useState(false);
  const [nombreNuevaBase, setNombreNuevaBase] = useState('');

  useEffect(() => {
    if (recetaActivaId) { 
      const productoEncontrado = productos.find(p => Number(p.id) === Number(recetaActivaId));
      if (productoEncontrado) {
          setRendimientoCalculadora(productoEncontrado.rendimiento || 1);
          
          if (productoEncontrado.opciones) {
              try {
                  const opcionesArray = typeof productoEncontrado.opciones === 'string' ? JSON.parse(productoEncontrado.opciones) : productoEncontrado.opciones;
                  
                  const tConfig = (opcionesArray || []).filter(o => o.categoria === 'Tamaño');
                  const initialConfig = {};
                  tConfig.forEach(t => {
                      let empaquesCargados = t.empaques || [];
                      if (t.insumo_empaque_id && empaquesCargados.length === 0) {
                          empaquesCargados.push({ insumo_id: t.insumo_empaque_id, cantidad: 1 });
                      }
                      initialConfig[t.nombre] = {
                          rendimiento: t.rendimiento_receta || '',
                          empaques: empaquesCargados
                      };
                  });
                  setConfigTamanos(initialConfig);

                  const optUnidad = opcionesArray.find(o => o.categoria === 'UnidadRendimiento');
                  if (optUnidad) {
                      setUnidadRendimiento(optUnidad.nombre);
                  } else {
                      setUnidadRendimiento('PZ');
                  }

              } catch(e) {
                  setConfigTamanos({});
                  setUnidadRendimiento('PZ');
              }
          } else {
              setConfigTamanos({});
              setUnidadRendimiento('PZ');
          }
      }
      
      fetch(`${apiUrl}/recetas/${recetaActivaId}`)
        .then(r => r.json())
        .then(data => setRecetaItems(Array.isArray(data) ? data : []))
        .catch(console.error); 
    } else { 
      setRecetaItems([]); 
      setRendimientoCalculadora(1); 
      setConfigTamanos({});
      setUnidadRendimiento('PZ');
    }
  }, [recetaActivaId, productos, apiUrl]);

  const prepararEdicionInsumo = (i) => { 
    setEditandoInsumoId(i.id); 
    setNuevoInsumo({
        nombre: i.nombre, 
        unidad_medida: i.unidad_medida, 
        cantidad_presentacion: i.cantidad_presentacion, 
        costo_presentacion: i.costo_presentacion,
        es_empaque: i.es_empaque === true || i.es_empaque === 'true'
    }); 
  };
  
  const cancelarEdicionInsumo = () => { 
    setEditandoInsumoId(null); 
    setNuevoInsumo({ nombre: '', unidad_medida: 'KL', cantidad_presentacion: '', costo_presentacion: '', es_empaque: false }); 
  };
  
  const guardarInsumo = async (e) => { 
      e.preventDefault(); 
      try { 
          const url = editandoInsumoId ? `${apiUrl}/insumos/${editandoInsumoId}` : `${apiUrl}/insumos`;
          const res = await fetch(url, { method: editandoInsumoId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoInsumo) }); 
          if (res.ok) { 
            showAlert("¡Éxito!", editandoInsumoId ? "Insumo actualizado." : "Insumo registrado.", "success");
            cancelarEdicionInsumo(); 
            refrescarDatos(); 
          } else {
            showAlert("Error", "No se pudo guardar el insumo.", "error");
          }
      } catch(e) {
          showAlert("Error", "Error de conexión al servidor.", "error");
      } 
  };
  
  const eliminarInsumo = (id) => { 
    showConfirm("Eliminar Insumo", "Asegúrate de que este insumo no esté siendo utilizado en ninguna receta antes de eliminarlo.", async () => { 
      try {
        await fetch(`${apiUrl}/insumos/${id}`, { method: 'DELETE' }); 
        refrescarDatos(); 
        showAlert("Eliminado", "Insumo borrado de la base de datos.", "success");
      } catch (error) {
        showAlert("Error", "No se pudo borrar el insumo.", "error");
      }
    }); 
  };
  
  const procesarCompraInsumo = async (e) => { 
      e.preventDefault(); 
      try { 
          const res = await fetch(`${apiUrl}/insumos/${modalCompra.id}/comprar`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ paquetes_comprados: compraPaquetes, nuevo_costo_paquete: compraCosto }) 
          }); 
          if (res.ok) { 
            showAlert("Stock Actualizado", `Se ha sumado el stock correctamente.`, "success");
            setModalCompra(null); 
            setCompraPaquetes(''); 
            setCompraCosto(''); 
            refrescarDatos(); 
          } else {
            showAlert("Error", "No se pudo registrar la compra.", "error");
          }
      } catch(e) {
          showAlert("Error", "Problema de conexión al procesar la compra.", "error");
      } 
  };

  const reiniciarStockInsumo = (insumo) => {
    showConfirm("Reiniciar a 0", `¿Deseas poner en 0 el stock de ${insumo.nombre}? \n\nÚsalo únicamente si se echó a perder, hubo merma o detectaste un descuadre en tu inventario.`, async () => {
        try { 
          const res = await fetch(`${apiUrl}/insumos/${insumo.id}/reiniciar`, { method: 'PUT' }); 
          if (res.ok) { 
            showAlert("Stock Reiniciado", `El inventario de ${insumo.nombre} ahora está en 0.`, "success");
            refrescarDatos(); 
          } 
        } catch(e) {}
    });
  };

  const iniciarCreacionBase = () => {
      if (!recetaCategoriaFiltro) return showAlert("Atención", "Selecciona primero una Clasificación (Ej. Sushis) donde guardar esta base.", "warning");
      setNombreNuevaBase('');
      setModalCrearBase(true);
  };

  const guardarNuevaBase = async (e) => {
    e.preventDefault();
    if (!nombreNuevaBase || nombreNuevaBase.trim() === '') return;

    try {
        const formData = new FormData();
        formData.append('nombre', `${nombreNuevaBase.trim()} (Base)`); 
        formData.append('categoria', recetaCategoriaFiltro);
        formData.append('precio_base', 0);
        formData.append('tiempo_preparacion', 0);
        formData.append('disponible', false); 
        formData.append('genera_puntos', false);
        formData.append('emoji', '🥣');
        
        const opcionesDefault = [{ categoria: 'UnidadRendimiento', nombre: 'GR' }];
        formData.append('opciones', JSON.stringify(opcionesDefault));

        const res = await fetch(`${apiUrl}/productos`, { method: 'POST', body: formData });
        if (res.ok) {
            const nuevoProd = await res.json();
            showAlert("Éxito", "Preparación base creada. Ahora agrega los insumos que la componen.", "success");
            await refrescarDatos(); 
            setRecetaActivaId(nuevoProd.id); 
            setModalCrearBase(false);
        } else {
            showAlert("Error", "No se pudo crear la preparación.", "error");
        }
    } catch(e) {
        showAlert("Error", "Error de conexión.", "error");
    }
  };
  
  const guardarItemReceta = async (e) => { 
    e.preventDefault(); 
    
    const duplicado = recetaItems.find(item => {
        if (tipoIngresoReceta === 'insumo') {
            return Number(item.insumo_id) === Number(nuevoItemReceta.insumo_id);
        } else {
            return Number(item.sub_producto_id) === Number(nuevoItemSubReceta.sub_producto_id);
        }
    });

    if (duplicado) {
        return showAlert("Elemento Duplicado", "Este insumo o base ya fue agregado a la receta actual. Si deseas cambiar la cantidad, elimínalo de la tabla y vuelve a agregarlo.", "warning");
    }

    try { 
      let payload = {};
      if (tipoIngresoReceta === 'insumo') {
          let cantidadFinal = Number(nuevoItemReceta.cantidad_usada);
          const insumoSeleccionado = insumosDB.find(i => String(i.id) === String(nuevoItemReceta.insumo_id));
          
          if (insumoSeleccionado) {
              if (insumoSeleccionado.unidad_medida === 'KL' && unidadConversionActiva === 'GR') {
                  cantidadFinal = cantidadFinal / 1000;
              } else if (insumoSeleccionado.unidad_medida === 'LT' && unidadConversionActiva === 'ML') {
                  cantidadFinal = cantidadFinal / 1000;
              }
          }
          payload = { producto_id: recetaActivaId, insumo_id: nuevoItemReceta.insumo_id, cantidad_usada: cantidadFinal };
      
      } else {
          let cantidadFinal = Number(nuevoItemSubReceta.cantidad_usada);
          const prodSeleccionado = productos.find(p => String(p.id) === String(nuevoItemSubReceta.sub_producto_id));
          
          if (prodSeleccionado) {
              let unidadBase = 'PZ';
              if (prodSeleccionado.opciones) {
                  const ops = typeof prodSeleccionado.opciones === 'string' ? JSON.parse(prodSeleccionado.opciones) : prodSeleccionado.opciones;
                  const opt = ops.find(o => o.categoria === 'UnidadRendimiento');
                  if (opt) unidadBase = opt.nombre;
              }
              if (unidadBase === 'KL' && unidadConversionActiva === 'GR') cantidadFinal = cantidadFinal / 1000;
              if (unidadBase === 'LT' && unidadConversionActiva === 'ML') cantidadFinal = cantidadFinal / 1000;
          }
          payload = { producto_id: recetaActivaId, sub_producto_id: nuevoItemSubReceta.sub_producto_id, cantidad_usada: cantidadFinal };
      }
      
      const res = await fetch(`${apiUrl}/recetas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); 
      if (res.ok) { 
        setNuevoItemReceta({ insumo_id: '', cantidad_usada: '' }); 
        setNuevoItemSubReceta({ sub_producto_id: '', cantidad_usada: '' }); 
        const r = await fetch(`${apiUrl}/recetas/${recetaActivaId}`); 
        const dataR = await r.json(); 
        setRecetaItems(Array.isArray(dataR) ? dataR : []); 
      } else {
        showAlert("Atención", "Hubo un problema al guardar en la base de datos.", "error");
      }
    } catch(e) {} 
  };

  const eliminarItemReceta = (id) => { 
    fetch(`${apiUrl}/recetas/${id}`, { method: 'DELETE' }).then(() => { 
      fetch(`${apiUrl}/recetas/${recetaActivaId}`)
        .then(r => r.json())
        .then(dataR => setRecetaItems(Array.isArray(dataR) ? dataR : [])); 
    }); 
  };

  const guardarRendimiento = async () => {
    if (!recetaActivaId) return;
    try { 
      await fetch(`${apiUrl}/productos/${recetaActivaId}/rendimiento`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ rendimiento: rendimientoCalculadora }) 
      }); 

      const prod = productos.find(p => Number(p.id) === Number(recetaActivaId));
      let opcionesArray = [];
      if (prod && prod.opciones) {
          opcionesArray = typeof prod.opciones === 'string' ? JSON.parse(prod.opciones) : prod.opciones;
      }
      
      const opcionesFiltradas = opcionesArray.filter(o => o.categoria !== 'UnidadRendimiento');
      opcionesFiltradas.push({ categoria: 'UnidadRendimiento', nombre: unidadRendimiento });

      await fetch(`${apiUrl}/productos/${recetaActivaId}/opciones`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ opciones: opcionesFiltradas })
      });

      showAlert("¡Éxito!", "Rendimiento guardado correctamente.", "success");
      refrescarDatos(); 
    } catch (error) { 
      showAlert("Error", "No se pudo guardar.", "error"); 
    }
  };

  const agregarEmpaqueTamanio = (tamNombre) => {
      const current = configTamanos[tamNombre] || { rendimiento: '', empaques: [] };
      setConfigTamanos({
          ...configTamanos,
          [tamNombre]: { ...current, empaques: [...(current.empaques || []), { insumo_id: '', cantidad: 1 }] }
      });
  };

  const actualizarEmpaqueTamanio = (tamNombre, idx, campo, valor) => {
      const current = configTamanos[tamNombre];
      const nuevosEmpaques = [...current.empaques];
      nuevosEmpaques[idx][campo] = valor;
      setConfigTamanos({
          ...configTamanos,
          [tamNombre]: { ...current, empaques: nuevosEmpaques }
      });
  };

  const eliminarEmpaqueTamanio = (tamNombre, idx) => {
      const current = configTamanos[tamNombre];
      const nuevosEmpaques = current.empaques.filter((_, i) => i !== idx);
      setConfigTamanos({
          ...configTamanos,
          [tamNombre]: { ...current, empaques: nuevosEmpaques }
      });
  };

  const guardarRendimientosTamanos = async () => {
    if (!productoSeleccionado) return;
    try {
        const opcionesArray = typeof productoSeleccionado.opciones === 'string' ? JSON.parse(productoSeleccionado.opciones) : productoSeleccionado.opciones;
        
        const nuevasOpciones = opcionesArray.map(o => {
            if (o.categoria === 'Tamaño' && configTamanos[o.nombre]) {
                const empaquesValidos = (configTamanos[o.nombre].empaques || []).filter(e => e.insumo_id !== '');
                return { 
                    ...o, 
                    rendimiento_receta: Number(configTamanos[o.nombre].rendimiento),
                    empaques: empaquesValidos,
                    costo_empaque: undefined,
                    insumo_empaque_id: undefined
                };
            }
            return o;
        });

        const res = await fetch(`${apiUrl}/productos/${recetaActivaId}/opciones`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ opciones: nuevasOpciones })
        });

        if (res.ok) {
            showAlert("¡Configuración Guardada!", "Los rendimientos y empaques múltiples se han guardado permanentemente.", "success");
            refrescarDatos();
        } else {
            showAlert("Error", "No se pudieron guardar las modificaciones.", "error");
        }
    } catch (error) {
        showAlert("Error", "Error de red o servidor.", "error");
    }
  };

  const formatearCantidadVisual = (cantidad, unidad) => {
      const cant = Number(cantidad);
      if (unidad === 'KL' && cant < 1 && cant > 0) return `${(cant * 1000).toFixed(0)} GR`;
      if (unidad === 'LT' && cant < 1 && cant > 0) return `${(cant * 1000).toFixed(0)} ML`;
      return `${cant} ${unidad}`;
  };

  const insumosCriticos = (insumosDB || []).filter(ins => (Number(ins.stock_actual) / Math.max(1, Number(ins.cantidad_presentacion))) < 1);
  const totalCalculadoModalCompra = (parseFloat(compraPaquetes) || 0) * (parseFloat(compraCosto) || 0);

  const subRecetasDisponibles = (productos || []).filter(p => Number(p.id) !== Number(recetaActivaId));
  const empaquesDisponibles = (insumosDB || []).filter(i => i.es_empaque === true || i.es_empaque === 'true');

  let costoTotalRecetaCalculado = 0;
  let pesoEstimadoReceta = 0; 

  if (recetaItems && recetaItems.length > 0) {
    recetaItems.forEach(item => {
        if (item.insumo_id) {
            costoTotalRecetaCalculado += (item.costo_presentacion / item.cantidad_presentacion) * item.cantidad_usada;
            
            const cantUsada = Number(item.cantidad_usada) || 0;
            if (item.unidad_medida === 'KL' || item.unidad_medida === 'LT') {
                pesoEstimadoReceta += (cantUsada * 1000);
            } else if (item.unidad_medida === 'GR' || item.unidad_medida === 'ML') {
                pesoEstimadoReceta += cantUsada;
            }
        } 
        else if (item.sub_producto_id) {
            costoTotalRecetaCalculado += (Number(item.costo_subreceta) || 0) * item.cantidad_usada;

            let unidadSub = 'PZ';
            const prodRef = productos.find(p => Number(p.id) === Number(item.sub_producto_id));
            if (prodRef && prodRef.opciones) {
                const ops = typeof prodRef.opciones === 'string' ? JSON.parse(prodRef.opciones) : prodRef.opciones;
                const opt = ops.find(o => o.categoria === 'UnidadRendimiento');
                if (opt) unidadSub = opt.nombre;
            }

            const cantUsada = Number(item.cantidad_usada) || 0;
            if (unidadSub === 'KL' || unidadSub === 'LT') {
                pesoEstimadoReceta += (cantUsada * 1000);
            } else if (unidadSub === 'GR' || unidadSub === 'ML') {
                pesoEstimadoReceta += cantUsada;
            }
        }
    });
  }

  const productoSeleccionado = (productos || []).find(p => Number(p.id) === Number(recetaActivaId));
  let tamanosConfigurados = [];
  if (productoSeleccionado && productoSeleccionado.opciones) {
      try {
          const opcionesArray = typeof productoSeleccionado.opciones === 'string' ? JSON.parse(productoSeleccionado.opciones) : productoSeleccionado.opciones;
          tamanosConfigurados = (opcionesArray || []).filter(o => o.categoria === 'Tamaño');
      } catch (e) {}
  }

  const costoPorPorcionBase = costoTotalRecetaCalculado / Math.max(1, rendimientoCalculadora);
  const luzAguaBase = costoPorPorcionBase * 0.15;
  const costoTotalRealBase = costoPorPorcionBase * 1.15;
  const precioSugeridoBase = costoTotalRealBase * 3;

  let opcionesDeUnidad = [];
  if (tipoIngresoReceta === 'insumo') {
      const insumoSeleccionadoActual = insumosDB.find(i => String(i.id) === String(nuevoItemReceta.insumo_id));
      if (insumoSeleccionadoActual) {
          if (insumoSeleccionadoActual.unidad_medida === 'KL') opcionesDeUnidad = ['KL', 'GR'];
          else if (insumoSeleccionadoActual.unidad_medida === 'LT') opcionesDeUnidad = ['LT', 'ML'];
          else opcionesDeUnidad = [insumoSeleccionadoActual.unidad_medida];
      }
  } else {
      const subRecetaActual = productos.find(p => String(p.id) === String(nuevoItemSubReceta.sub_producto_id));
      if (subRecetaActual) {
          let unidadBase = 'PZ';
          if (subRecetaActual.opciones) {
              const ops = typeof subRecetaActual.opciones === 'string' ? JSON.parse(subRecetaActual.opciones) : subRecetaActual.opciones;
              const opt = ops.find(o => o.categoria === 'UnidadRendimiento');
              if (opt) unidadBase = opt.nombre;
          }
          if (unidadBase === 'KL') opcionesDeUnidad = ['KL', 'GR'];
          else if (unidadBase === 'LT') opcionesDeUnidad = ['LT', 'ML'];
          else opcionesDeUnidad = [unidadBase];
      }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-slate-800">Control de Insumos y Recetas</h2>
      </div>
      
      <div className="flex flex-col sm:flex-row bg-slate-200 p-1 rounded-2xl w-fit mb-8 gap-1">
        <button onClick={() => setSubSeccionInventario('insumos')} className={`px-8 py-3 rounded-xl font-bold transition-all ${subSeccionInventario === 'insumos' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Materia Prima (Insumos)</button>
        <button onClick={() => setSubSeccionInventario('recetas')} className={`px-8 py-3 rounded-xl font-bold transition-all ${subSeccionInventario === 'recetas' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Escandallos (Recetas)</button>
      </div>

      {subSeccionInventario === 'insumos' ? ( 
        <div className="space-y-8">
          
          {insumosCriticos.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl flex flex-col md:flex-row items-start gap-4 shadow-sm animate-in fade-in">
              <AlertTriangle className="text-red-500 w-10 h-10 flex-shrink-0" />
              <div>
                <h4 className="text-red-700 font-black text-lg uppercase tracking-widest">¡Alerta de Inventario Crítico!</h4>
                <p className="text-red-600 font-bold mt-1">Tienes insumos con menos de 1 paquete de existencia: 
                   <span className="font-black text-red-800 ml-1">{insumosCriticos.map(i => i.nombre).join(', ')}</span>
                </p>
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
              {editandoInsumoId ? <Edit className="text-blue-500" /> : <Plus className="text-emerald-500" />} 
              {editandoInsumoId ? 'Editar Insumo / Empaque' : 'Alta Rápida de Insumo / Empaque'}
            </h3>
            <form onSubmit={guardarInsumo} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1">Nombre Comercial</label>
                  <input required placeholder="Ej. Azúcar Morena" value={nuevoInsumo.nombre} onChange={e => setNuevoInsumo({...nuevoInsumo, nombre: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1">Unidad Mínima</label>
                  <select required value={nuevoInsumo.unidad_medida} onChange={e => setNuevoInsumo({...nuevoInsumo, unidad_medida: e.target.value})} className="w-full p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl outline-none font-black text-center cursor-pointer">
                    <option value="KL">Kilos (KL)</option><option value="GR">Gramos (GR)</option><option value="LT">Litros (LT)</option><option value="ML">Mililitros (ML)</option><option value="PZ">Piezas (PZ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1">Cant. Paquete</label>
                  <input required type="number" placeholder="Ej. 1000" value={nuevoInsumo.cantidad_presentacion} onChange={e => setNuevoInsumo({...nuevoInsumo, cantidad_presentacion: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-center" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1">Costo Paquete ($)</label>
                  <input required type="number" step="0.01" placeholder="Ej. 50.00" value={nuevoInsumo.costo_presentacion} onChange={e => setNuevoInsumo({...nuevoInsumo, costo_presentacion: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-slate-700 text-xl" />
                </div>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mt-4">
                 <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                       type="checkbox" 
                       checked={nuevoInsumo.es_empaque} 
                       onChange={e => setNuevoInsumo({...nuevoInsumo, es_empaque: e.target.checked})}
                       className="w-5 h-5 accent-indigo-600"
                    />
                    <span className="font-black text-indigo-800 flex items-center gap-2">
                       <Box size={18}/> ¿Es un Empaque / Desechable?
                    </span>
                 </label>
                 <p className="text-xs text-indigo-600/80 font-bold ml-8 mt-1">Márcalo si es un domo, vaso, cuchara o servilleta. Así aparecerá en el simulador de Tamaños.</p>
              </div>

              <div className="pt-2 flex flex-col md:flex-row gap-4">
                {editandoInsumoId && (
                  <button type="button" onClick={cancelarEdicionInsumo} className="w-full md:w-1/3 p-4 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition">Cancelar</button>
                )}
                <button type="submit" className={`flex-1 p-4 text-white rounded-xl font-black shadow-lg transition active:scale-95 ${editandoInsumoId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
                  {editandoInsumoId ? 'Actualizar Registro' : 'Guardar en Inventario'}
                </button>
              </div>
            </form>
          </div>
          
          <div className="bg-white p-4 md:p-8 rounded-[30px] shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold mb-6 text-slate-800">Catálogo y Existencias</h3>
            {(insumosDB || []).length === 0 ? ( 
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center"><Package size={48} className="mx-auto text-slate-300 mb-4" /><p className="text-slate-500 font-bold text-lg">Aún no has registrado insumos.</p></div> 
            ) : ( 
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 text-xs uppercase font-black">
                      <th className="p-4">Insumo / Presentación</th>
                      <th className="p-4">Stock Actual</th>
                      <th className="p-4 hidden sm:table-cell">Costo Ult. Compra</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumosDB.map(ins => { 
                      const stock_paquetes = Number(ins.stock_actual) / Math.max(1, Number(ins.cantidad_presentacion));
                      let colorClases = 'bg-red-100 text-red-700 border-red-200'; 
                      if (stock_paquetes >= 3) {
                          colorClases = 'bg-emerald-100 text-emerald-700 border-emerald-200'; 
                      } else if (stock_paquetes >= 1) {
                          colorClases = 'bg-yellow-100 text-yellow-700 border-yellow-200'; 
                      }
                      
                      return ( 
                        <tr key={ins.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-4">
                            <p className="font-bold text-slate-800 text-base md:text-lg">
                                {ins.nombre}
                                {ins.es_empaque && (
                                    <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black uppercase tracking-widest align-middle">
                                        📦 Empaque
                                    </span>
                                )}
                            </p>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{ins.cantidad_presentacion} {ins.unidad_medida}</p>
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-3 py-1 rounded-lg border font-black text-sm ${colorClases}`}>
                              {Number(ins.stock_actual).toFixed(2)} {ins.unidad_medida}
                            </span>
                          </td>
                          <td className="p-4 font-black text-slate-600 hidden sm:table-cell">${ins.costo_presentacion}</td>
                          <td className="p-4 flex justify-center gap-2">
                            <button onClick={() => {setModalCompra(ins); setCompraCosto(ins.costo_presentacion);}} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-3 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2"><ShoppingBag size={16}/> <span className="hidden md:inline">Comprar</span></button>
                            <button onClick={() => reiniciarStockInsumo(ins)} className="bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white p-2 rounded-xl transition" title="Reiniciar a 0 (Merma)"><RotateCcw size={18}/></button>
                            <button onClick={() => prepararEdicionInsumo(ins)} className="bg-slate-100 text-blue-500 hover:bg-blue-500 hover:text-white p-2 rounded-xl transition" title="Editar"><Edit size={18}/></button>
                            <button onClick={() => eliminarInsumo(ins.id)} className="bg-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition" title="Eliminar"><Trash2 size={18}/></button>
                          </td>
                        </tr> 
                      ); 
                    })}
                  </tbody>
                </table>
              </div> 
            )}
          </div>
        </div> 
      ) : ( 
        <div className="space-y-8">
          {/* Formulario Recetas */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
            <h3 className="text-2xl font-black mb-6 text-slate-800">Ficha Técnica (Receta) y Rendimiento</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                <label className="block text-sm font-black text-blue-800 uppercase tracking-widest mb-3">1. Clasificación</label>
                <select value={recetaCategoriaFiltro} onChange={e => { setRecetaCategoriaFiltro(e.target.value); setRecetaActivaId(''); }} className="w-full p-4 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg cursor-pointer shadow-sm">
                  <option value="">Todas las clasificaciones...</option>
                  {(clasificaciones || []).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                <div className="flex justify-between items-center mb-3">
                   <label className="block text-sm font-black text-blue-800 uppercase tracking-widest">2. Platillo o Base</label>
                   {recetaCategoriaFiltro && (
                      <button onClick={iniciarCreacionBase} className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white px-2 py-1 rounded-md font-black uppercase tracking-widest transition shadow-sm border border-emerald-200">
                         + Crear Base
                      </button>
                   )}
                </div>
                <select value={recetaActivaId} onChange={e => setRecetaActivaId(e.target.value)} className="w-full p-4 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg cursor-pointer shadow-sm">
                  <option value="">Seleccionar del Menú...</option>
                  {(productos || []).filter(p => !recetaCategoriaFiltro || p.categoria === recetaCategoriaFiltro).map(p => <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>)}
                </select>
              </div>

              {tamanosConfigurados.length === 0 ? (
                <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100">
                    <label className="block text-sm font-black text-purple-800 uppercase tracking-widest mb-3">3. Rendimiento (Total que sale)</label>
                    <div className="flex gap-0">
                        <input 
                            type="number" 
                            min="0.01" 
                            step="0.01" 
                            value={rendimientoCalculadora} 
                            onChange={e => setRendimientoCalculadora(e.target.value)} 
                            className="w-full p-4 bg-white border border-purple-200 rounded-l-2xl outline-none focus:ring-2 focus:ring-purple-500 font-black text-lg text-center shadow-sm" 
                            placeholder="Ej: 6000"
                        />
                        <select 
                            value={unidadRendimiento} 
                            onChange={e => setUnidadRendimiento(e.target.value)}
                            className="p-4 bg-purple-50 text-purple-800 font-black border-y border-purple-200 outline-none cursor-pointer text-xs md:text-base"
                        >
                            <option value="PZ">PZ</option>
                            <option value="GR">GR</option>
                            <option value="KL">KL</option>
                            <option value="ML">ML</option>
                            <option value="LT">LT</option>
                        </select>
                        <button onClick={guardarRendimiento} disabled={!recetaActivaId} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 text-white px-4 rounded-r-2xl font-bold transition shadow-sm active:scale-95 border-y border-r border-purple-600">Guardar</button>
                    </div>
                    <p className="text-[11px] text-purple-600/80 mt-2 font-bold leading-tight">
                        Selecciona si tu olla rinde en Gramos, Litros o Porciones Finales.
                    </p>
                </div>
              ) : (
                <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="text-orange-500 mb-2" size={32}/>
                    <p className="text-orange-700 font-bold text-sm">El rendimiento y los empaques de este platillo se configuran por Tamaño Fijo en la parte inferior.</p>
                </div>
              )}
            </div>

            {recetaActivaId && (
              <div className="mt-6 bg-slate-50 p-6 rounded-[24px] border border-slate-200">
                <div className="flex items-center gap-4 mb-4 border-b border-slate-200 pb-4">
                    <h4 className="font-bold text-slate-800 uppercase tracking-widest text-xs">4. Agregar elemento a la receta:</h4>
                    <div className="flex bg-slate-200 p-1 rounded-xl">
                        <button 
                            onClick={() => {
                                setTipoIngresoReceta('insumo');
                                setUnidadConversionActiva('');
                                setNuevoItemReceta({ insumo_id: '', cantidad_usada: '' });
                            }} 
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${tipoIngresoReceta === 'insumo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Insumo Puro
                        </button>
                        <button 
                            onClick={() => {
                                setTipoIngresoReceta('subreceta');
                                setUnidadConversionActiva('');
                                setNuevoItemSubReceta({ sub_producto_id: '', cantidad_usada: '' });
                            }} 
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${tipoIngresoReceta === 'subreceta' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Layers size={14} /> Sub-Receta
                        </button>
                    </div>
                </div>

                <form onSubmit={guardarItemReceta} className="flex flex-col md:flex-row gap-4 items-stretch">
                  <div className="flex-1">
                    {tipoIngresoReceta === 'insumo' ? (
                        <select required value={nuevoItemReceta.insumo_id} onChange={e => {
                            const id = e.target.value;
                            setNuevoItemReceta({...nuevoItemReceta, insumo_id: id});
                            const ins = insumosDB.find(i => String(i.id) === String(id));
                            if (ins) setUnidadConversionActiva(ins.unidad_medida);
                        }} className="w-full h-full p-4 border border-slate-200 rounded-xl outline-none font-medium text-slate-700">
                          <option value="">Buscar Insumo...</option>
                          {(insumosDB || []).filter(i => i.es_empaque !== true && i.es_empaque !== 'true').map(ins => <option key={ins.id} value={ins.id}>{ins.nombre} ({ins.unidad_medida})</option>)}
                        </select>
                    ) : (
                        <select required value={nuevoItemSubReceta.sub_producto_id} onChange={e => {
                            const id = e.target.value;
                            setNuevoItemSubReceta({...nuevoItemSubReceta, sub_producto_id: id});
                            const prod = productos.find(p => String(p.id) === String(id));
                            if (prod) {
                                let u = 'PZ';
                                if (prod.opciones) {
                                    const ops = typeof prod.opciones === 'string' ? JSON.parse(prod.opciones) : prod.opciones;
                                    const opt = ops.find(o => o.categoria === 'UnidadRendimiento');
                                    if (opt) u = opt.nombre;
                                }
                                setUnidadConversionActiva(u);
                            }
                        }} className="w-full h-full p-4 border border-purple-200 bg-purple-50 rounded-xl outline-none font-bold text-purple-800">
                          <option value="">Buscar Sub-Receta (Platillo preparado)...</option>
                          {(subRecetasDisponibles || []).map(prod => <option key={prod.id} value={prod.id}>{prod.emoji} {prod.nombre}</option>)}
                        </select>
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        {tipoIngresoReceta === 'insumo' ? (
                            <>
                               <input required type="number" step="0.01" placeholder="Ej. 700" value={nuevoItemReceta.cantidad_usada} onChange={e => setNuevoItemReceta({...nuevoItemReceta, cantidad_usada: e.target.value})} className="w-full p-4 border border-slate-200 rounded-xl outline-none font-bold text-center" />
                               {opcionesDeUnidad.length > 0 ? (
                                   <select 
                                      value={unidadConversionActiva} 
                                      onChange={e => setUnidadConversionActiva(e.target.value)}
                                      className="w-24 p-4 rounded-xl font-black text-sm whitespace-nowrap bg-blue-100 text-blue-700 outline-none cursor-pointer"
                                   >
                                      {opcionesDeUnidad.map(u => <option key={u} value={u}>{u}</option>)}
                                   </select>
                               ) : (
                                   <span className="px-4 py-4 rounded-xl font-black text-sm whitespace-nowrap bg-slate-200 text-slate-600">Uso</span>
                               )}
                            </>
                        ) : (
                            <>
                               <input required type="number" step="0.01" placeholder="Ej. 200" value={nuevoItemSubReceta.cantidad_usada} onChange={e => setNuevoItemSubReceta({...nuevoItemSubReceta, cantidad_usada: e.target.value})} className="w-full p-4 border border-purple-200 rounded-xl outline-none font-bold text-center text-purple-800" title="¿Cuánto vas a usar de la base?" />
                               {opcionesDeUnidad.length > 0 ? (
                                   <select 
                                      value={unidadConversionActiva} 
                                      onChange={e => setUnidadConversionActiva(e.target.value)}
                                      className="w-24 p-4 rounded-xl font-black text-sm whitespace-nowrap bg-purple-200 text-purple-800 outline-none cursor-pointer"
                                   >
                                      {opcionesDeUnidad.map(u => <option key={u} value={u}>{u}</option>)}
                                   </select>
                               ) : (
                                   <span className="px-4 py-4 rounded-xl font-black text-sm whitespace-nowrap bg-purple-200 text-purple-800">Uso / Cant.</span>
                               )}
                            </>
                        )}
                    </div>
                    {/* 👇 ASISTENTE VISUAL PARA SABER CUÁNTO RINDE LA BASE */}
                    {tipoIngresoReceta === 'subreceta' && nuevoItemSubReceta.sub_producto_id && (() => {
                        const subP = productos.find(p => String(p.id) === String(nuevoItemSubReceta.sub_producto_id));
                        if(subP) {
                            let u = 'PZ';
                            if (subP.opciones) {
                                const ops = typeof subP.opciones === 'string' ? JSON.parse(subP.opciones) : subP.opciones;
                                const opt = ops.find(o => o.categoria === 'UnidadRendimiento');
                                if (opt) u = opt.nombre;
                            }
                            return (
                                <p className="text-[10px] text-purple-600 font-bold leading-tight mt-1 pl-2 border-l-2 border-purple-300">
                                    💡 1 Olla de esta base rinde: <span className="bg-purple-100 px-1 rounded">{subP.rendimiento || 1} {u}</span>.<br/>Si usas la olla entera, escribe {subP.rendimiento || 1}.
                                </p>
                            )
                        }
                        return null;
                    })()}
                  </div>
                  
                  <button type="submit" className={`md:w-auto px-8 py-4 text-white rounded-xl font-bold transition active:scale-95 self-start ${tipoIngresoReceta === 'insumo' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                      Añadir a Receta
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Tabla de Costeos */}
          {!recetaActivaId ? ( 
             <div className="bg-white p-10 rounded-[30px] text-center opacity-50 border border-slate-200"><p className="text-xl font-bold text-slate-400">Selecciona un platillo arriba para armar su receta.</p></div> 
          ) : ( 
             <div className="bg-white p-4 md:p-8 rounded-[40px] shadow-sm border border-slate-200">
               
               {pesoEstimadoReceta > 0 && (
                   <div className="mb-4 flex items-center gap-2 text-indigo-600 bg-indigo-50 border border-indigo-100 p-3 rounded-xl w-fit">
                       <Scale size={18}/>
                       <span className="text-xs font-black uppercase tracking-widest">Peso Estimado de Olla/Batch:</span>
                       <span className="font-black text-lg ml-1">
                           {pesoEstimadoReceta >= 1000 ? `${(pesoEstimadoReceta / 1000).toFixed(2)} KG/LT` : `${pesoEstimadoReceta.toFixed(0)} GR/ML`}
                       </span>
                   </div>
               )}

               <div className="border rounded-2xl overflow-x-auto mb-6">
                 <table className="w-full text-left border-collapse min-w-max">
                   <thead>
                     <tr className="bg-slate-100 text-slate-500 text-xs uppercase font-black">
                       <th className="p-4">Ingrediente / Sub-Receta</th><th className="p-4">Uso</th><th className="p-4">Costo Calc.</th><th className="p-4 text-center">Acción</th>
                     </tr>
                   </thead>
                   <tbody>
                     {(recetaItems || []).length === 0 ? (
                       <tr><td colSpan="4" className="text-center p-6 text-slate-400 font-bold">Sin ingredientes. Usa el panel superior para añadir.</td></tr>
                     ) : (
                       recetaItems.map(item => {
                         let nombreItem = '';
                         let usoVisual = '';
                         let costoItem = 0;
                         let badge = null;

                         if (item.insumo_id) {
                             nombreItem = item.insumo_nombre;
                             usoVisual = formatearCantidadVisual(item.cantidad_usada, item.unidad_medida);
                             costoItem = (item.costo_presentacion / item.cantidad_presentacion) * item.cantidad_usada;
                         } else if (item.sub_producto_id) {
                             nombreItem = item.sub_producto_nombre;
                             
                             let unidadSub = 'PZ';
                             let rendSub = 1;
                             const prodRef = productos.find(p => Number(p.id) === Number(item.sub_producto_id));
                             if (prodRef) {
                                 rendSub = Number(prodRef.rendimiento) || 1;
                                 if (prodRef.opciones) {
                                     const ops = typeof prodRef.opciones === 'string' ? JSON.parse(prodRef.opciones) : prodRef.opciones;
                                     const opt = ops.find(o => o.categoria === 'UnidadRendimiento');
                                     if (opt) unidadSub = opt.nombre;
                                 }
                             }
                             
                             // 👇 VISUALIZADOR INTELIGENTE DE OLLAS COMPLETAS
                             if (Number(item.cantidad_usada) === rendSub) {
                                 usoVisual = `1 Olla/Batch Completo (${rendSub} ${unidadSub})`;
                             } else {
                                 usoVisual = formatearCantidadVisual(item.cantidad_usada, unidadSub);
                             }

                             costoItem = (Number(item.costo_subreceta) || 0) * item.cantidad_usada;
                             badge = <span className="ml-2 text-[8px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase tracking-widest font-black" title="Incluye 15% de gastos operativos">Sub-Receta (+15% Luz)</span>;
                         }

                         return (
                           <tr key={item.id} className="border-b hover:bg-slate-50">
                             <td className="p-4 font-bold text-slate-700 flex items-center">{nombreItem} {badge}</td>
                             <td className="p-4 text-sm font-medium"><span className={`px-2 py-1 rounded font-bold ${item.sub_producto_id ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{usoVisual}</span></td>
                             <td className="p-4 font-black text-slate-600">${costoItem.toFixed(2)}</td>
                             <td className="p-4 text-center"><button onClick={() => eliminarItemReceta(item.id)} className="text-red-400 hover:text-red-600 bg-white p-2 rounded-lg shadow-sm border border-slate-100"><Trash2 size={18}/></button></td>
                           </tr>
                         )
                       })
                     )}
                   </tbody>
                 </table>
               </div>
               
               {recetaItems.length > 0 && tamanosConfigurados.length === 0 && (
                 <div className="flex flex-col md:flex-row flex-wrap justify-end gap-4 border-t border-slate-100 pt-6">
                   <div className="text-right bg-slate-50 p-4 rounded-2xl border border-slate-200">
                     <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Costo Total Olla/Batch</p>
                     <p className="text-2xl font-black text-slate-700">${costoTotalRecetaCalculado.toFixed(2)}</p>
                   </div>
                   <div className="text-right bg-slate-50 p-4 rounded-2xl border border-slate-200">
                     <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Costo Insumo Unitario</p>
                     <p className="text-2xl font-black text-slate-700">${costoPorPorcionBase.toFixed(2)}</p>
                   </div>
                   <div className="text-right bg-slate-50 p-4 rounded-2xl border border-slate-200">
                     <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-1">+15% Luz/Agua</p>
                     <p className="text-2xl font-black text-red-600">${luzAguaBase.toFixed(2)}</p>
                   </div>
                   <div className="text-right bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm">
                     <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-1">Costo Real Total</p>
                     <p className="text-2xl font-black text-amber-600">${costoTotalRealBase.toFixed(2)}</p>
                   </div>
                   <div className="text-right bg-emerald-600 p-4 rounded-2xl shadow-md text-white">
                     <p className="text-xs font-black text-emerald-200 uppercase tracking-widest mb-1">Venta Sugerida (*3)</p>
                     <p className="text-3xl font-black">${precioSugeridoBase.toFixed(2)}</p>
                   </div>
                 </div>
               )}

               {tamanosConfigurados.length > 0 && (
                 <div className="bg-orange-50 border border-orange-200 p-6 rounded-3xl mt-8 animate-in fade-in">
                    
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-orange-100 shadow-sm mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><Package size={24}/></div>
                            <div>
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Costo de Insumos Base</p>
                                <p className="text-xl font-black text-slate-800">Receta Total: <span className="text-orange-600">${costoTotalRecetaCalculado.toFixed(2)}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-orange-200 pb-4">
                        <div>
                           <h4 className="text-orange-800 font-black flex items-center gap-2 text-lg">
                               <AlertTriangle size={22}/> ¡Rendimiento y Empaques por Tamaño Fijo!
                           </h4>
                           <p className="text-xs text-orange-600 font-bold mt-0.5">Calcula el margen exacto añadiendo el costo de todos los desechables de cada tamaño.</p>
                        </div>
                        <button 
                           onClick={guardarRendimientosTamanos}
                           className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition shadow-md active:scale-95"
                        >
                           💾 Guardar Tamaños
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        {tamanosConfigurados.map(tam => {
                            const precioBase = Number(productoSeleccionado.precio_base) || 0;
                            const precioVentaReal = precioBase + (Number(tam.precioExtra) || 0);
                            
                            const configTam = configTamanos[tam.nombre] || { rendimiento: '', empaques: [] };
                            const rendSimulado = Number(configTam.rendimiento) || 1;
                            
                            let costoEmpaqueTotal = 0;
                            (configTam.empaques || []).forEach(emp => {
                                if (emp.insumo_id) {
                                    const ins = insumosDB.find(i => String(i.id) === String(emp.insumo_id));
                                    if (ins) {
                                        costoEmpaqueTotal += (ins.costo_presentacion / Math.max(1, ins.cantidad_presentacion)) * (Number(emp.cantidad) || 0);
                                    }
                                }
                            });
                            
                            const costoInsumoSimulado = costoTotalRecetaCalculado / Math.max(1, rendSimulado);
                            const costoTotalSimulado = costoInsumoSimulado + costoEmpaqueTotal; 
                            
                            const luzAguaSimulado = costoTotalSimulado * 0.15;
                            const costoRealSimulado = costoTotalSimulado * 1.15;
                            const sugeridoSimulado = costoRealSimulado * 3; 
                            
                            const utilidadReal = precioVentaReal - costoRealSimulado;
                            const margenReal = precioVentaReal > 0 ? (utilidadReal / precioVentaReal) * 100 : 0;

                            return (
                                <div key={tam.nombre} className="flex flex-col xl:flex-row justify-between gap-4 p-5 bg-white rounded-2xl border border-orange-200 shadow-sm">
                                    <div className="w-full xl:w-1/4">
                                        <p className="font-black text-slate-800 text-xl">{tam.nombre}</p>
                                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">P. Venta: <span className="font-black">${precioVentaReal.toFixed(2)}</span></p>
                                        
                                        <div className="mt-4 flex flex-col gap-2">
                                            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Rendimiento (Piezas de la olla)</span>
                                            <input 
                                                type="number" 
                                                placeholder="Ej. 20"
                                                value={configTam.rendimiento} 
                                                onChange={e => setConfigTamanos({...configTamanos, [tam.nombre]: {...configTam, rendimiento: e.target.value}})} 
                                                className="w-full p-3 border border-orange-300 rounded-xl outline-none font-black text-orange-800 text-center focus:ring-2 focus:ring-orange-500 bg-orange-50" 
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="w-full xl:w-2/4 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                                        <div>
                                            <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3 flex justify-between items-center">
                                                <span className="flex items-center gap-1"><Box size={14}/> Empaques (Por 1 pza)</span>
                                                <span className="text-slate-400 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">Total: ${costoEmpaqueTotal.toFixed(2)}</span>
                                            </p>
                                            
                                            <div className="space-y-2 mb-3">
                                                {(configTam.empaques || []).map((emp, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <select 
                                                            value={emp.insumo_id} 
                                                            onChange={e => actualizarEmpaqueTamanio(tam.nombre, idx, 'insumo_id', e.target.value)}
                                                            className="flex-1 p-2 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs truncate focus:ring-1 focus:ring-slate-400"
                                                        >
                                                            <option value="">Selecciona empaque...</option>
                                                            {empaquesDisponibles.map(ins => (
                                                                <option key={ins.id} value={ins.id}>{ins.nombre}</option>
                                                            ))}
                                                        </select>
                                                        <input 
                                                            type="number" 
                                                            min="0.01" 
                                                            step="0.01" 
                                                            value={emp.cantidad} 
                                                            onChange={e => actualizarEmpaqueTamanio(tam.nombre, idx, 'cantidad', e.target.value)}
                                                            className="w-16 p-2 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs text-center focus:ring-1 focus:ring-slate-400" 
                                                            title="Cantidad utilizada de este empaque"
                                                        />
                                                        <button 
                                                            onClick={() => eliminarEmpaqueTamanio(tam.nombre, idx)} 
                                                            className="p-2 bg-white border border-red-200 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition"
                                                        >
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </div>
                                                ))}
                                                {empaquesDisponibles.length === 0 && (
                                                    <p className="text-xs text-slate-400 italic">No tienes insumos marcados como "Empaque".</p>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => agregarEmpaqueTamanio(tam.nombre)}
                                            className="w-full py-2 border border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-500 hover:bg-slate-100 rounded-lg text-xs font-black uppercase transition mt-auto"
                                        >
                                            + Añadir Empaque
                                        </button>
                                    </div>

                                    <div className="w-full xl:w-1/4 grid grid-cols-1 gap-2 bg-slate-100/50 p-4 rounded-xl border border-slate-100 text-xs font-bold self-start">
                                        <p className="text-slate-500 flex justify-between">Base + Empaque: <span className="text-slate-700 font-black">${costoTotalSimulado.toFixed(2)}</span></p>
                                        <p className="text-red-500 flex justify-between">Luz/Agua (15%): <span className="font-black">${luzAguaSimulado.toFixed(2)}</span></p>
                                        <p className="text-amber-600 flex justify-between">Costo Real: <span className="font-black">${costoRealSimulado.toFixed(2)}</span></p>
                                        <p className="text-emerald-600 flex justify-between bg-emerald-50 px-2 py-1 -mx-2 rounded">Sugerido (*3): <span className="font-black">${sugeridoSimulado.toFixed(2)}</span></p>
                                        <p className="text-slate-700 border-t border-dashed border-slate-300 pt-2 mt-1 font-black text-[13px] text-center">
                                            Margen: <span className={margenReal > 65 ? "text-emerald-600" : "text-amber-600"}>{margenReal.toFixed(1)}%</span>
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                 </div>
               )}

             </div>
          )}
        </div> 
      )}

      {/* MODAL DE COMPRAS */}
      {modalCompra && ( 
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <form onSubmit={procesarCompraInsumo} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-blue-200">
            <h3 className="text-xl font-black text-slate-800 mb-2">Ingresar Stock</h3>
            <p className="text-slate-500 font-medium mb-6">Insumo: <span className="font-bold text-blue-600">{modalCompra.nombre}</span> ({modalCompra.cantidad_presentacion} {modalCompra.unidad_medida})</p>
            <div className="space-y-4">
              <div><label className="block text-xs font-black text-slate-400 uppercase mb-1">Paquetes / Cajas Compradas</label><input autoFocus required type="number" value={compraPaquetes} onChange={e => setCompraPaquetes(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-xl text-center" placeholder="Ej. 2" /></div>
              <div><label className="block text-xs font-black text-slate-400 uppercase mb-1">Costo Nuevo del Paquete ($)</label><input required type="number" step="0.01" value={compraCosto} onChange={e => setCompraCosto(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-xl text-center text-slate-700" /></div>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mt-4 text-right">
                <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Costo Total Compra</p>
                <p className="text-3xl font-black text-blue-700">${totalCalculadoModalCompra.toFixed(2)}</p>
            </div>
            <div className="flex gap-4 mt-8">
              <button type="button" onClick={() => {setModalCompra(null); setCompraPaquetes(''); setCompraCosto('');}} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition active:scale-95">Guardar</button>
            </div>
          </form>
        </div> 
      )}

      {/* 👇 MODAL AMIGABLE PARA CREAR BASES */}
      {modalCrearBase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <form onSubmit={guardarNuevaBase} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-emerald-200">
            <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                <Layers className="text-emerald-500"/> Crear Preparación Base
            </h3>
            <p className="text-slate-500 font-medium mb-6 text-sm">
                Se guardará como una sub-receta oculta en la clasificación: <span className="font-bold text-emerald-600">{recetaCategoriaFiltro}</span>
            </p>
            
            <div className="space-y-4">
              <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1">Nombre de la Base (Ej. Masa Base)</label>
                  <input 
                      autoFocus 
                      required 
                      type="text" 
                      value={nombreNuevaBase} 
                      onChange={e => setNombreNuevaBase(e.target.value)} 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 font-bold text-lg text-slate-700" 
                      placeholder="Nombre de la receta..." 
                  />
              </div>
            </div>
            
            <div className="flex gap-4 mt-8">
              <button type="button" onClick={() => {setModalCrearBase(false); setNombreNuevaBase('');}} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition active:scale-95">Guardar Base</button>
            </div>
          </form>
        </div> 
      )}
    </div>
  );
};

export default Inventario;