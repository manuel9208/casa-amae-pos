import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Layers, Box, Scale, Package } from 'lucide-react';

const GestorRecetas = ({ insumosDB, productos, clasificaciones, apiUrl, refrescarDatos, showAlert }) => {
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

  const [empaquesUnicos, setEmpaquesUnicos] = useState([]);

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
                  
                  if (tConfig.length > 0) {
                      const initialConfig = {};
                      tConfig.forEach(t => {
                          let empaquesCargados = t.empaques || [];
                          if (t.insumo_empaque_id && empaquesCargados.length === 0) {
                              empaquesCargados.push({ insumo_id: t.insumo_empaque_id, cantidad: 1 });
                          }
                          initialConfig[t.nombre] = { rendimiento: t.rendimiento_receta || '', empaques: empaquesCargados };
                      });
                      setConfigTamanos(initialConfig);
                  } else {
                      setConfigTamanos({});
                  }

                  const optEmpaquesUnicos = opcionesArray.find(o => o.categoria === 'EmpaquesUnicos');
                  if (optEmpaquesUnicos && optEmpaquesUnicos.empaques) {
                      setEmpaquesUnicos(optEmpaquesUnicos.empaques);
                  } else {
                      setEmpaquesUnicos([]);
                  }

                  const optUnidad = opcionesArray.find(o => o.categoria === 'UnidadRendimiento');
                  if (optUnidad) setUnidadRendimiento(optUnidad.nombre);
                  else setUnidadRendimiento('PZ');
              } catch(e) {
                  setConfigTamanos({}); setUnidadRendimiento('PZ'); setEmpaquesUnicos([]);
              }
          } else {
              setConfigTamanos({}); setUnidadRendimiento('PZ'); setEmpaquesUnicos([]);
          }
      }
      
      fetch(`${apiUrl}/recetas/${recetaActivaId}`)
        .then(r => r.json())
        .then(data => setRecetaItems(Array.isArray(data) ? data : []))
        .catch(console.error); 
    } else { 
      setRecetaItems([]); setRendimientoCalculadora(1); setConfigTamanos({}); setUnidadRendimiento('PZ'); setEmpaquesUnicos([]);
    }
  }, [recetaActivaId, productos, apiUrl]);

  const iniciarCreacionBase = () => {
      if (!recetaCategoriaFiltro) return showAlert("Atención", "Selecciona primero una Clasificación (Ej. Sushis) donde guardar esta base.", "warning");
      setNombreNuevaBase(''); setModalCrearBase(true);
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
        if (tipoIngresoReceta === 'insumo') return Number(item.insumo_id) === Number(nuevoItemReceta.insumo_id);
        else return Number(item.sub_producto_id) === Number(nuevoItemSubReceta.sub_producto_id);
    });

    if (duplicado) return showAlert("Elemento Duplicado", "Este insumo o base ya fue agregado a la receta actual. Si deseas cambiar la cantidad, elimínalo de la tabla y vuelve a agregarlo.", "warning");

    try { 
      let payload = {};
      if (tipoIngresoReceta === 'insumo') {
          let cantidadFinal = Number(nuevoItemReceta.cantidad_usada);
          const insumoSeleccionado = insumosDB.find(i => String(i.id) === String(nuevoItemReceta.insumo_id));
          if (insumoSeleccionado) {
              if (insumoSeleccionado.unidad_medida === 'KL' && unidadConversionActiva === 'GR') cantidadFinal = cantidadFinal / 1000;
              else if (insumoSeleccionado.unidad_medida === 'LT' && unidadConversionActiva === 'ML') cantidadFinal = cantidadFinal / 1000;
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

  const guardarRendimientoYEmpaques = async () => {
    if (!recetaActivaId) return;
    try { 
      await fetch(`${apiUrl}/productos/${recetaActivaId}/rendimiento`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rendimiento: rendimientoCalculadora }) 
      }); 

      const prod = productos.find(p => Number(p.id) === Number(recetaActivaId));
      let opcionesArray = [];
      if (prod && prod.opciones) opcionesArray = typeof prod.opciones === 'string' ? JSON.parse(prod.opciones) : prod.opciones;
      
      const opcionesFiltradas = opcionesArray.filter(o => o.categoria !== 'UnidadRendimiento' && o.categoria !== 'EmpaquesUnicos');
      
      opcionesFiltradas.push({ categoria: 'UnidadRendimiento', nombre: unidadRendimiento });
      
      const empaquesValidos = empaquesUnicos.filter(e => e.insumo_id !== '');
      if (empaquesValidos.length > 0) {
          opcionesFiltradas.push({ categoria: 'EmpaquesUnicos', nombre: 'Empaques Base', empaques: empaquesValidos });
      }

      await fetch(`${apiUrl}/productos/${recetaActivaId}/opciones`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opciones: opcionesFiltradas })
      });

      showAlert("¡Éxito!", "Configuración guardada correctamente.", "success");
      refrescarDatos(); 
    } catch (error) { 
      showAlert("Error", "No se pudo guardar.", "error"); 
    }
  };

  const agregarEmpaqueTamanio = (tamNombre) => {
      const current = configTamanos[tamNombre] || { rendimiento: '', empaques: [] };
      setConfigTamanos({ ...configTamanos, [tamNombre]: { ...current, empaques: [...(current.empaques || []), { insumo_id: '', cantidad: 1 }] }});
  };

  const actualizarEmpaqueTamanio = (tamNombre, idx, campo, valor) => {
      const current = configTamanos[tamNombre];
      const nuevosEmpaques = [...current.empaques];
      nuevosEmpaques[idx][campo] = valor;
      setConfigTamanos({ ...configTamanos, [tamNombre]: { ...current, empaques: nuevosEmpaques }});
  };

  const eliminarEmpaqueTamanio = (tamNombre, idx) => {
      const current = configTamanos[tamNombre];
      const nuevosEmpaques = current.empaques.filter((_, i) => i !== idx);
      setConfigTamanos({ ...configTamanos, [tamNombre]: { ...current, empaques: nuevosEmpaques }});
  };

  const guardarRendimientosTamanos = async () => {
    const productoSeleccionado = (productos || []).find(p => Number(p.id) === Number(recetaActivaId));
    if (!productoSeleccionado) return;
    try {
        const opcionesArray = typeof productoSeleccionado.opciones === 'string' ? JSON.parse(productoSeleccionado.opciones) : productoSeleccionado.opciones;
        const nuevasOpciones = opcionesArray.map(o => {
            if (o.categoria === 'Tamaño' && configTamanos[o.nombre]) {
                const empaquesValidos = (configTamanos[o.nombre].empaques || []).filter(e => e.insumo_id !== '');
                return { 
                    ...o, rendimiento_receta: Number(configTamanos[o.nombre].rendimiento), empaques: empaquesValidos,
                    costo_empaque: undefined, insumo_empaque_id: undefined
                };
            }
            return o;
        });

        const res = await fetch(`${apiUrl}/productos/${recetaActivaId}/opciones`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opciones: nuevasOpciones })
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

  const agregarEmpaqueUnico = () => {
      setEmpaquesUnicos([...empaquesUnicos, { insumo_id: '', cantidad: 1 }]);
  };

  const actualizarEmpaqueUnico = (idx, campo, valor) => {
      const nuevos = [...empaquesUnicos];
      nuevos[idx][campo] = valor;
      setEmpaquesUnicos(nuevos);
  };

  const eliminarEmpaqueUnico = (idx) => {
      setEmpaquesUnicos(empaquesUnicos.filter((_, i) => i !== idx));
  };


  const formatearCantidadVisual = (cantidad, unidad) => {
      const cant = Number(cantidad);
      if (unidad === 'KL' && cant < 1 && cant > 0) return `${(cant * 1000).toFixed(0)} GR`;
      if (unidad === 'LT' && cant < 1 && cant > 0) return `${(cant * 1000).toFixed(0)} ML`;
      return `${cant} ${unidad}`;
  };

  const subRecetasDisponibles = (productos || []).filter(p => Number(p.id) !== Number(recetaActivaId) && (p.disponible === false || p.disponible === 'false'));
  const empaquesDisponibles = (insumosDB || []).filter(i => i.es_empaque === true || i.es_empaque === 'true');

  let costoTotalRecetaCalculado = 0;
  let pesoEstimadoReceta = 0; 

  if (recetaItems && recetaItems.length > 0) {
    recetaItems.forEach(item => {
        if (item.insumo_id) {
            costoTotalRecetaCalculado += (item.costo_presentacion / item.cantidad_presentacion) * item.cantidad_usada;
            const cantUsada = Number(item.cantidad_usada) || 0;
            if (item.unidad_medida === 'KL' || item.unidad_medida === 'LT') pesoEstimadoReceta += (cantUsada * 1000);
            else if (item.unidad_medida === 'GR' || item.unidad_medida === 'ML') pesoEstimadoReceta += cantUsada;
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
            if (unidadSub === 'KL' || unidadSub === 'LT') pesoEstimadoReceta += (cantUsada * 1000);
            else if (unidadSub === 'GR' || unidadSub === 'ML') pesoEstimadoReceta += cantUsada;
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
  
  let costoEmpaquesUnicoTotal = 0;
  if (tamanosConfigurados.length === 0) {
      empaquesUnicos.forEach(emp => {
          if (emp.insumo_id) {
              const ins = insumosDB.find(i => String(i.id) === String(emp.insumo_id));
              if (ins) costoEmpaquesUnicoTotal += (ins.costo_presentacion / Math.max(1, ins.cantidad_presentacion)) * (Number(emp.cantidad) || 0);
          }
      });
  }

  const costoConEmpaquesUnico = costoPorPorcionBase + costoEmpaquesUnicoTotal;
  const luzAguaBase = costoConEmpaquesUnico * 0.15;
  const costoTotalRealBase = costoConEmpaquesUnico * 1.15;
  const precioSugeridoBase = costoTotalRealBase * 3;

  const precioBaseUnico = Number(productoSeleccionado?.precio_base) || 0;
  const utilidadUnico = precioBaseUnico - costoTotalRealBase;
  const margenUnico = precioBaseUnico > 0 ? (utilidadUnico / precioBaseUnico) * 100 : 0;

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
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
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
                        type="number" min="0.01" step="0.01" 
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
                        <option value="PZ">PZ</option><option value="GR">GR</option><option value="KL">KL</option><option value="ML">ML</option><option value="LT">LT</option>
                    </select>
                </div>
                <p className="text-[11px] text-purple-600/80 mt-2 font-bold leading-tight">Selecciona si tu olla rinde en Gramos, Litros o Porciones Finales.</p>
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
                    <button onClick={() => { setTipoIngresoReceta('insumo'); setUnidadConversionActiva(''); setNuevoItemReceta({ insumo_id: '', cantidad_usada: '' }); }} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${tipoIngresoReceta === 'insumo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Insumo Puro</button>
                    <button onClick={() => { setTipoIngresoReceta('subreceta'); setUnidadConversionActiva(''); setNuevoItemSubReceta({ sub_producto_id: '', cantidad_usada: '' }); }} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${tipoIngresoReceta === 'subreceta' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Layers size={14} /> Sub-Receta</button>
                </div>
            </div>

            <form onSubmit={guardarItemReceta} className="flex flex-col md:flex-row gap-4 items-stretch">
              <div className="flex-1">
                {tipoIngresoReceta === 'insumo' ? (
                    <select required value={nuevoItemReceta.insumo_id} onChange={e => {
                        const id = e.target.value; setNuevoItemReceta({...nuevoItemReceta, insumo_id: id});
                        const ins = insumosDB.find(i => String(i.id) === String(id)); if (ins) setUnidadConversionActiva(ins.unidad_medida);
                    }} className="w-full h-full p-4 border border-slate-200 rounded-xl outline-none font-medium text-slate-700">
                      <option value="">Buscar Insumo...</option>
                      {(insumosDB || []).filter(i => i.es_empaque !== true && i.es_empaque !== 'true').map(ins => <option key={ins.id} value={ins.id}>{ins.nombre} ({ins.unidad_medida})</option>)}
                    </select>
                ) : (
                    <select required value={nuevoItemSubReceta.sub_producto_id} onChange={e => {
                        const id = e.target.value; setNuevoItemSubReceta({...nuevoItemSubReceta, sub_producto_id: id});
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
                               <select value={unidadConversionActiva} onChange={e => setUnidadConversionActiva(e.target.value)} className="w-24 p-4 rounded-xl font-black text-sm whitespace-nowrap bg-blue-100 text-blue-700 outline-none cursor-pointer">
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
                               <select value={unidadConversionActiva} onChange={e => setUnidadConversionActiva(e.target.value)} className="w-24 p-4 rounded-xl font-black text-sm whitespace-nowrap bg-purple-200 text-purple-800 outline-none cursor-pointer">
                                  {opcionesDeUnidad.map(u => <option key={u} value={u}>{u}</option>)}
                               </select>
                           ) : (
                               <span className="px-4 py-4 rounded-xl font-black text-sm whitespace-nowrap bg-purple-200 text-purple-800">Uso / Cant.</span>
                           )}
                        </>
                    )}
                </div>
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
                         
                         if (Number(item.cantidad_usada) === rendSub) {
                             usoVisual = `1 Olla/Batch Completo (${rendSub} ${unidadSub})`;
                         } else {
                             usoVisual = formatearCantidadVisual(item.cantidad_usada, unidadSub);
                         }

                         costoItem = (Number(item.costo_subreceta) || 0) * item.cantidad_usada;
                         badge = <span className="ml-2 text-[8px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase tracking-widest font-black">Sub-Receta</span>;
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
           
           {/* PANEL DE EMPAQUES Y COSTOS PARA PLATILLOS DE TAMAÑO ÚNICO */}
           {recetaItems.length > 0 && tamanosConfigurados.length === 0 && (
             <div className="border-t border-slate-200 pt-8 mt-8">
               
               <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Package size={24}/></div>
                        <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Costo de Insumos Base (Olla Completa)</p>
                            <p className="text-xl font-black text-slate-800">Receta Total: <span className="text-blue-600">${costoTotalRecetaCalculado.toFixed(2)}</span></p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 mb-8">
                    {/* Columna de Empaques Unitarios */}
                    <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Box size={16}/> Empaques (Por cada porción)</p>
                            <span className="text-slate-500 bg-white px-3 py-1 rounded shadow-sm border border-slate-100 font-bold text-sm">Total: ${costoEmpaquesUnicoTotal.toFixed(2)}</span>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                            {empaquesUnicos.map((emp, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    {/* 👇 AQUÍ ESTÁ EL CAMBIO PARA TAMAÑO ÚNICO: Mostramos el costo unitario c/u */}
                                    <select value={emp.insumo_id} onChange={e => actualizarEmpaqueUnico(idx, 'insumo_id', e.target.value)} className="flex-1 p-3 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500">
                                        <option value="">Selecciona empaque...</option>
                                        {empaquesDisponibles.map(ins => (
                                            <option key={ins.id} value={ins.id}>
                                                {ins.nombre} - ${(ins.costo_presentacion / Math.max(1, ins.cantidad_presentacion)).toFixed(2)} c/u
                                            </option>
                                        ))}
                                    </select>
                                    <input type="number" min="0.01" step="0.01" value={emp.cantidad} onChange={e => actualizarEmpaqueUnico(idx, 'cantidad', e.target.value)} className="w-20 p-3 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 text-center focus:ring-2 focus:ring-blue-500" title="Cantidad" />
                                    <button onClick={() => eliminarEmpaqueUnico(idx)} className="p-3 bg-white border border-red-200 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition"><Trash2 size={18}/></button>
                                </div>
                            ))}
                            {empaquesDisponibles.length === 0 && <p className="text-xs text-slate-400 italic">No tienes insumos marcados como "Empaque".</p>}
                        </div>
                        <button onClick={agregarEmpaqueUnico} className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-500 hover:bg-white rounded-xl text-xs font-black uppercase transition">+ Añadir Empaque Unitario</button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row flex-wrap justify-end items-end gap-4">
                   {unidadRendimiento === 'PZ' ? (
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                           <div className="text-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Costo Platillo Base</p>
                             <p className="text-xl font-black text-slate-700">${costoPorPorcionBase.toFixed(2)}</p>
                           </div>
                           <div className="text-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                             <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">+15% Luz/Agua</p>
                             <p className="text-xl font-black text-red-600">${luzAguaBase.toFixed(2)}</p>
                           </div>
                           <div className="text-center bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm">
                             <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Costo Real + Empaque</p>
                             <p className="text-2xl font-black text-amber-600">${costoTotalRealBase.toFixed(2)}</p>
                           </div>
                           <div className="text-center bg-emerald-600 p-4 rounded-2xl shadow-md text-white relative">
                             <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1">Venta Sugerida (*3)</p>
                             <p className="text-3xl font-black">${precioSugeridoBase.toFixed(2)}</p>
                             <div className="absolute -top-3 -right-3 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-md border-2 border-white">
                                {margenUnico > 65 ? <span className="text-emerald-400">✅ {margenUnico.toFixed(0)}%</span> : <span className="text-red-400">⚠️ {margenUnico.toFixed(0)}%</span>}
                             </div>
                           </div>
                       </div>
                   ) : (
                       <div className="w-full text-center bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow-sm">
                          <p className="text-sm font-black text-blue-700">
                              💡 Al ser una receta base en <span className="font-black text-xl mx-1">{unidadRendimiento}</span>, el precio de venta sugerido se calculará cuando uses esta base dentro del platillo final.
                          </p>
                       </div>
                   )}

                   {/* Botón Maestro Guardar Rendimiento Único */}
                   <button onClick={guardarRendimientoYEmpaques} className="w-full mt-4 bg-slate-800 hover:bg-slate-900 text-white px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition shadow-lg shadow-slate-500/30 active:scale-95 flex items-center justify-center gap-2">
                       💾 Guardar Rendimiento y Empaques
                   </button>
               </div>

             </div>
           )}

           {/* PANEL DE TAMAÑOS FIJOS (Sigue igual) */}
           {tamanosConfigurados.length > 0 && (
             <div className="bg-orange-50 border border-orange-200 p-6 rounded-3xl mt-8 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-orange-100 shadow-sm mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><Package size={24}/></div>
                        <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Costo de Insumos Base (Olla Completa)</p>
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
                    <button onClick={guardarRendimientosTamanos} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition shadow-md active:scale-95">
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
                                if (ins) costoEmpaqueTotal += (ins.costo_presentacion / Math.max(1, ins.cantidad_presentacion)) * (Number(emp.cantidad) || 0);
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
                                        <input type="number" placeholder="Ej. 20" value={configTam.rendimiento} onChange={e => setConfigTamanos({...configTamanos, [tam.nombre]: {...configTam, rendimiento: e.target.value}})} className="w-full p-3 border border-orange-300 rounded-xl outline-none font-black text-orange-800 text-center focus:ring-2 focus:ring-orange-500 bg-orange-50" />
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
                                                    {/* 👇 AQUÍ ESTÁ EL CAMBIO PARA TAMAÑOS FIJOS: Mostramos el costo unitario c/u */}
                                                    <select value={emp.insumo_id} onChange={e => actualizarEmpaqueTamanio(tam.nombre, idx, 'insumo_id', e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs truncate focus:ring-1 focus:ring-slate-400">
                                                        <option value="">Selecciona empaque...</option>
                                                        {empaquesDisponibles.map(ins => (
                                                            <option key={ins.id} value={ins.id}>
                                                                {ins.nombre} - ${(ins.costo_presentacion / Math.max(1, ins.cantidad_presentacion)).toFixed(2)} c/u
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <input type="number" min="0.01" step="0.01" value={emp.cantidad} onChange={e => actualizarEmpaqueTamanio(tam.nombre, idx, 'cantidad', e.target.value)} className="w-16 p-2 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs text-center focus:ring-1 focus:ring-slate-400" title="Cantidad utilizada de este empaque" />
                                                    <button onClick={() => eliminarEmpaqueTamanio(tam.nombre, idx)} className="p-2 bg-white border border-red-200 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition"><Trash2 size={14}/></button>
                                                </div>
                                            ))}
                                            {empaquesDisponibles.length === 0 && <p className="text-xs text-slate-400 italic">No tienes insumos marcados como "Empaque".</p>}
                                        </div>
                                    </div>
                                    <button onClick={() => agregarEmpaqueTamanio(tam.nombre)} className="w-full py-2 border border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-500 hover:bg-slate-100 rounded-lg text-xs font-black uppercase transition mt-auto">+ Añadir Empaque</button>
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

      {/* MODAL PARA CREAR BASES */}
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
                  <input autoFocus required type="text" value={nombreNuevaBase} onChange={e => setNombreNuevaBase(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 font-bold text-lg text-slate-700" placeholder="Nombre de la receta..." />
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

export default GestorRecetas;