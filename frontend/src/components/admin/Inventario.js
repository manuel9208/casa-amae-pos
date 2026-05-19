import React, { useState, useEffect } from 'react';
import { AlertTriangle, Edit, Plus, Package, ShoppingBag, RotateCcw, Trash2, Layers } from 'lucide-react';

const Inventario = ({
  insumosDB, productos, clasificaciones, 
  apiUrl, refrescarDatos, showAlert, showConfirm
}) => {
  
  const [subSeccionInventario, setSubSeccionInventario] = useState('insumos');
  
  const [nuevoInsumo, setNuevoInsumo] = useState({ nombre: '', unidad_medida: 'KL', cantidad_presentacion: '', costo_presentacion: '' });
  const [editandoInsumoId, setEditandoInsumoId] = useState(null);
  
  const [modalCompra, setModalCompra] = useState(null);
  const [compraPaquetes, setCompraPaquetes] = useState('');
  const [compraCosto, setCompraCosto] = useState('');

  const [recetaCategoriaFiltro, setRecetaCategoriaFiltro] = useState('');
  const [recetaActivaId, setRecetaActivaId] = useState('');
  const [recetaItems, setRecetaItems] = useState([]);
  const [rendimientoCalculadora, setRendimientoCalculadora] = useState(1);
  
  const [tipoIngresoReceta, setTipoIngresoReceta] = useState('insumo'); 
  const [nuevoItemReceta, setNuevoItemReceta] = useState({ insumo_id: '', cantidad_usada: '' });
  const [nuevoItemSubReceta, setNuevoItemSubReceta] = useState({ sub_producto_id: '', cantidad_usada: '' });

  // 👇 ESTADO MODIFICADO: Ahora guarda Rendimiento y Costo de Empaque por tamaño
  const [configTamanos, setConfigTamanos] = useState({});

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
                      initialConfig[t.nombre] = {
                          rendimiento: t.rendimiento_receta || '',
                          empaque: t.costo_empaque || '' // Carga el empaque guardado
                      };
                  });
                  setConfigTamanos(initialConfig);
              } catch(e) {
                  setConfigTamanos({});
              }
          } else {
              setConfigTamanos({});
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
    }
  }, [recetaActivaId, productos, apiUrl]);


  const prepararEdicionInsumo = (i) => { 
    setEditandoInsumoId(i.id); 
    setNuevoInsumo(i); 
  };
  
  const cancelarEdicionInsumo = () => { 
    setEditandoInsumoId(null); 
    setNuevoInsumo({ nombre: '', unidad_medida: 'KL', cantidad_presentacion: '', costo_presentacion: '' }); 
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

  const crearPreparacionBase = async () => {
    if (!recetaCategoriaFiltro) return showAlert("Atención", "Selecciona primero una Clasificación (Ej. Sushis) donde guardar esta base.", "warning");
    
    const nombreBase = prompt(`Nombre de la preparación base para ${recetaCategoriaFiltro} (Ej. Arroz para Sushi):`);
    if (!nombreBase || nombreBase.trim() === '') return;

    try {
        const formData = new FormData();
        formData.append('nombre', `${nombreBase.trim()} (Base)`); 
        formData.append('categoria', recetaCategoriaFiltro);
        formData.append('precio_base', 0);
        formData.append('tiempo_preparacion', 0);
        formData.append('disponible', false); 
        formData.append('genera_puntos', false);
        formData.append('emoji', '🥣');
        
        const res = await fetch(`${apiUrl}/productos`, { method: 'POST', body: formData });
        if (res.ok) {
            const nuevoProd = await res.json();
            showAlert("Éxito", "Preparación base creada. Ahora agrega los insumos que la componen.", "success");
            await refrescarDatos(); 
            setRecetaActivaId(nuevoProd.id); 
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
        return showAlert("Elemento Duplicado", "Este insumo o base ya fue agregado a la receta actual.", "warning");
    }

    try { 
      let payload = {};
      if (tipoIngresoReceta === 'insumo') {
          payload = { producto_id: recetaActivaId, insumo_id: nuevoItemReceta.insumo_id, cantidad_usada: nuevoItemReceta.cantidad_usada };
      } else {
          payload = { producto_id: recetaActivaId, sub_producto_id: nuevoItemSubReceta.sub_producto_id, cantidad_usada: nuevoItemSubReceta.cantidad_usada };
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
      const res = await fetch(`${apiUrl}/productos/${recetaActivaId}/rendimiento`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ rendimiento: rendimientoCalculadora }) 
      }); 
      if (res.ok) { 
        showAlert("¡Éxito!", "Rendimiento guardado correctamente.", "success");
        refrescarDatos(); 
      } 
    } catch (error) { 
      showAlert("Error", "No se pudo guardar.", "error"); 
    }
  };

  // 👇 GUARDA TAMBIÉN EL EMPAQUE AHORA
  const guardarRendimientosTamanos = async () => {
    if (!productoSeleccionado) return;
    try {
        const opcionesArray = typeof productoSeleccionado.opciones === 'string' ? JSON.parse(productoSeleccionado.opciones) : productoSeleccionado.opciones;
        const nuevasOpciones = opcionesArray.map(o => {
            if (o.categoria === 'Tamaño' && configTamanos[o.nombre]) {
                return { 
                    ...o, 
                    rendimiento_receta: Number(configTamanos[o.nombre].rendimiento),
                    costo_empaque: Number(configTamanos[o.nombre].empaque)
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
            showAlert("¡Configuración Guardada!", "Los pesos y costos de empaque por tamaño se han grabado permanentemente.", "success");
            refrescarDatos();
        } else {
            showAlert("Error", "No se pudieron guardar las modificaciones.", "error");
        }
    } catch (error) {
        showAlert("Error", "Error de red o servidor.", "error");
    }
  };

  const insumosCriticos = (insumosDB || []).filter(ins => (Number(ins.stock_actual) / Math.max(1, Number(ins.cantidad_presentacion))) < 1);
  const totalCalculadoModalCompra = (parseFloat(compraPaquetes) || 0) * (parseFloat(compraCosto) || 0);

  const subRecetasDisponibles = (productos || []).filter(p => Number(p.id) !== Number(recetaActivaId));

  let costoTotalRecetaCalculado = 0;
  if (recetaItems && recetaItems.length > 0) {
    recetaItems.forEach(item => {
        if (item.insumo_id) {
            costoTotalRecetaCalculado += (item.costo_presentacion / item.cantidad_presentacion) * item.cantidad_usada;
        } 
        else if (item.sub_producto_id) {
            costoTotalRecetaCalculado += (Number(item.costo_subreceta) || 0) * item.cantidad_usada;
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

  // Cálculos financieros base (Para platillos SIN tamaños)
  const costoPorPorcionBase = costoTotalRecetaCalculado / Math.max(1, rendimientoCalculadora);
  const luzAguaBase = costoPorPorcionBase * 0.15;
  const costoTotalRealBase = costoPorPorcionBase * 1.15;
  const precioSugeridoBase = costoPorPorcionBase * 3;

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
          
          {/* ALERTA DE STOCK CRÍTICO */}
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
              {editandoInsumoId ? 'Editar Insumo' : 'Alta Rápida de Insumo'}
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
              <div className="pt-2 flex flex-col md:flex-row gap-4">
                {editandoInsumoId && (
                  <button type="button" onClick={cancelarEdicionInsumo} className="w-full md:w-1/3 p-4 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition">Cancelar</button>
                )}
                <button type="submit" className={`flex-1 p-4 text-white rounded-xl font-black shadow-lg transition active:scale-95 ${editandoInsumoId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
                  {editandoInsumoId ? 'Actualizar Insumo' : 'Guardar Insumo en Inventario'}
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
                      let colorClases = 'bg-red-100 text-red-700 border-red-200'; // Menos de 1 paquete (<1)
                      if (stock_paquetes >= 3) {
                          colorClases = 'bg-emerald-100 text-emerald-700 border-emerald-200'; // 3 o más
                      } else if (stock_paquetes >= 1) {
                          colorClases = 'bg-yellow-100 text-yellow-700 border-yellow-200'; // Entre 1 y 2.99
                      }
                      
                      return ( 
                        <tr key={ins.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-4">
                            <p className="font-bold text-slate-800 text-base md:text-lg">{ins.nombre}</p>
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
                      <button onClick={crearPreparacionBase} className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white px-2 py-1 rounded-md font-black uppercase tracking-widest transition shadow-sm border border-emerald-200">
                         + Crear Base
                      </button>
                   )}
                </div>
                <select value={recetaActivaId} onChange={e => setRecetaActivaId(e.target.value)} className="w-full p-4 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg cursor-pointer shadow-sm">
                  <option value="">Seleccionar del Menú...</option>
                  {(productos || []).filter(p => !recetaCategoriaFiltro || p.categoria === recetaCategoriaFiltro).map(p => <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>)}
                </select>
              </div>

              {/* 👇 OCULTA RENDIMIENTO GLOBAL SI TIENE TAMAÑOS */}
              {tamanosConfigurados.length === 0 ? (
                <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100">
                    <label className="block text-sm font-black text-purple-800 uppercase tracking-widest mb-3">3. Rendimiento (Total que sale)</label>
                    <div className="flex gap-2">
                    <input 
                        type="number" 
                        min="0.01" 
                        step="0.01" 
                        value={rendimientoCalculadora} 
                        onChange={e => setRendimientoCalculadora(e.target.value)} 
                        className="w-full p-4 bg-white border border-purple-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-black text-lg text-center shadow-sm" 
                        placeholder="Ej: 6000"
                    />
                    <button onClick={guardarRendimiento} disabled={!recetaActivaId} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 text-white px-4 rounded-2xl font-bold transition shadow-sm active:scale-95">Guardar</button>
                    </div>
                    <p className="text-[11px] text-purple-600/80 mt-2 font-bold leading-tight">
                    Ej: 1 (Plato final), 14 (Piezas de galleta) o 6000 (Gramos totales si es una olla de arroz).
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
                            onClick={() => setTipoIngresoReceta('insumo')} 
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${tipoIngresoReceta === 'insumo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Insumo Puro
                        </button>
                        <button 
                            onClick={() => setTipoIngresoReceta('subreceta')} 
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${tipoIngresoReceta === 'subreceta' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Layers size={14} /> Sub-Receta
                        </button>
                    </div>
                </div>

                <form onSubmit={guardarItemReceta} className="flex flex-col md:flex-row gap-4 items-stretch">
                  <div className="flex-1">
                    {tipoIngresoReceta === 'insumo' ? (
                        <select required value={nuevoItemReceta.insumo_id} onChange={e => setNuevoItemReceta({...nuevoItemReceta, insumo_id: e.target.value})} className="w-full h-full p-4 border border-slate-200 rounded-xl outline-none font-medium text-slate-700">
                          <option value="">Buscar Insumo...</option>
                          {(insumosDB || []).map(ins => <option key={ins.id} value={ins.id}>{ins.nombre} ({ins.unidad_medida})</option>)}
                        </select>
                    ) : (
                        <select required value={nuevoItemSubReceta.sub_producto_id} onChange={e => setNuevoItemSubReceta({...nuevoItemSubReceta, sub_producto_id: e.target.value})} className="w-full h-full p-4 border border-purple-200 bg-purple-50 rounded-xl outline-none font-bold text-purple-800">
                          <option value="">Buscar Sub-Receta (Platillo preparado)...</option>
                          {(subRecetasDisponibles || []).map(prod => <option key={prod.id} value={prod.id}>{prod.emoji} {prod.nombre}</option>)}
                        </select>
                    )}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    {tipoIngresoReceta === 'insumo' ? (
                        <input required type="number" step="0.01" placeholder="Cant. usada" value={nuevoItemReceta.cantidad_usada} onChange={e => setNuevoItemReceta({...nuevoItemReceta, cantidad_usada: e.target.value})} className="w-full p-4 border border-slate-200 rounded-xl outline-none font-bold text-center" />
                    ) : (
                        <input required type="number" step="0.01" placeholder="Ej. 200" value={nuevoItemSubReceta.cantidad_usada} onChange={e => setNuevoItemSubReceta({...nuevoItemSubReceta, cantidad_usada: e.target.value})} className="w-full p-4 border border-purple-200 rounded-xl outline-none font-bold text-center text-purple-800" title="¿Cuánto vas a usar de la base? (Si el rendimiento está en gramos, pon gramos aquí)" />
                    )}
                    <span className={`px-4 py-4 rounded-xl font-black text-sm whitespace-nowrap ${tipoIngresoReceta === 'insumo' ? 'bg-slate-200 text-slate-600' : 'bg-purple-200 text-purple-800'}`}>
                        {tipoIngresoReceta === 'insumo' ? 'Uso' : 'Uso / Cant.'}
                    </span>
                  </div>
                  <button type="submit" className={`md:w-auto px-8 py-4 text-white rounded-xl font-bold transition active:scale-95 ${tipoIngresoReceta === 'insumo' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
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
                         let unidadItem = '';
                         let costoItem = 0;
                         let badge = null;

                         if (item.insumo_id) {
                             nombreItem = item.insumo_nombre;
                             unidadItem = item.unidad_medida;
                             costoItem = (item.costo_presentacion / item.cantidad_presentacion) * item.cantidad_usada;
                         } else if (item.sub_producto_id) {
                             nombreItem = item.sub_producto_nombre;
                             unidadItem = 'Unidades';
                             costoItem = (Number(item.costo_subreceta) || 0) * item.cantidad_usada;
                             badge = <span className="ml-2 text-[8px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase tracking-widest font-black">Sub-Receta</span>;
                         }

                         return (
                           <tr key={item.id} className="border-b hover:bg-slate-50">
                             <td className="p-4 font-bold text-slate-700 flex items-center">{nombreItem} {badge}</td>
                             <td className="p-4 text-sm font-medium"><span className={`px-2 py-1 rounded font-bold ${item.sub_producto_id ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{item.cantidad_usada} {unidadItem}</span></td>
                             <td className="p-4 font-black text-slate-600">${costoItem.toFixed(2)}</td>
                             <td className="p-4 text-center"><button onClick={() => eliminarItemReceta(item.id)} className="text-red-400 hover:text-red-600 bg-white p-2 rounded-lg shadow-sm border border-slate-100"><Trash2 size={18}/></button></td>
                           </tr>
                         )
                       })
                     )}
                   </tbody>
                 </table>
               </div>
               
               {/* RESUMEN DE COSTO GLOBAL (Solo si NO hay tamaños) */}
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

               {/* 👇 MODAL DE TAMAÑOS CON LA NUEVA LÓGICA DE EMPAQUE */}
               {tamanosConfigurados.length > 0 && (
                 <div className="bg-orange-50 border border-orange-200 p-6 rounded-3xl mt-8 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-orange-200 pb-4">
                        <div>
                           <h4 className="text-orange-800 font-black flex items-center gap-2 text-lg">
                               <AlertTriangle size={22}/> ¡Rendimiento y Empaques por Tamaño Fijo!
                           </h4>
                           <p className="text-xs text-orange-600 font-bold mt-0.5">Calcula el margen exacto añadiendo el costo del domo/vaso de cada tamaño.</p>
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
                            
                            const configTam = configTamanos[tam.nombre] || { rendimiento: '', empaque: '' };
                            const rendSimulado = Number(configTam.rendimiento) || 1;
                            const costoEmpaque = Number(configTam.empaque) || 0;
                            
                            // Matemáticas puras
                            const costoInsumoSimulado = costoTotalRecetaCalculado / Math.max(1, rendSimulado);
                            const costoTotalSimulado = costoInsumoSimulado + costoEmpaque; // Insumo Comida + Plástico
                            
                            const luzAguaSimulado = costoTotalSimulado * 0.15;
                            const costoRealSimulado = costoTotalSimulado * 1.15;
                            const sugeridoSimulado = costoTotalSimulado * 3;
                            
                            const utilidadReal = precioVentaReal - costoRealSimulado;
                            const margenReal = precioVentaReal > 0 ? (utilidadReal / precioVentaReal) * 100 : 0;

                            return (
                                <div key={tam.nombre} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-orange-100 shadow-sm">
                                    <div className="w-full lg:w-1/5">
                                        <p className="font-black text-slate-700 text-lg">{tam.nombre}</p>
                                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">P. Venta Menú: <span className="font-black">${precioVentaReal.toFixed(2)}</span></p>
                                    </div>
                                    
                                    <div className="w-full lg:w-2/5 flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 font-bold whitespace-nowrap w-36">Si de esta olla salen:</span>
                                            <input 
                                                type="number" 
                                                placeholder="Ej. 20"
                                                value={configTam.rendimiento} 
                                                onChange={e => setConfigTamanos({...configTamanos, [tam.nombre]: {...configTam, rendimiento: e.target.value}})} 
                                                className="w-full p-2 border border-orange-200 rounded-lg outline-none font-black text-orange-700 text-center focus:ring-2 focus:ring-orange-500 bg-orange-50/50 text-sm" 
                                            />
                                            <span className="text-xs text-slate-500 font-bold whitespace-nowrap w-24">pzs de este tam.</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 font-bold whitespace-nowrap w-36">Costo Empaque/Domo:</span>
                                            <input 
                                                type="number" 
                                                placeholder="Ej. 3.50"
                                                value={configTam.empaque} 
                                                onChange={e => setConfigTamanos({...configTamanos, [tam.nombre]: {...configTam, empaque: e.target.value}})} 
                                                className="w-full p-2 border border-slate-200 rounded-lg outline-none font-black text-slate-700 text-center focus:ring-2 focus:ring-slate-500 text-sm" 
                                            />
                                            <span className="text-xs text-slate-400 font-bold whitespace-nowrap w-24">Pesos ($)</span>
                                        </div>
                                    </div>

                                    <div className="w-full lg:w-2/5 grid grid-cols-2 gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xs font-bold">
                                        <p className="text-slate-500">Comida + Empaque: <span className="text-slate-700 font-black">${costoTotalSimulado.toFixed(2)}</span></p>
                                        <p className="text-red-500">Luz/Agua (15%): <span className="font-black">${luzAguaSimulado.toFixed(2)}</span></p>
                                        <p className="text-amber-600">Costo Real: <span className="font-black">${costoRealSimulado.toFixed(2)}</span></p>
                                        <p className="text-emerald-600">Venta Sugerida (*3): <span className="font-black">${sugeridoSimulado.toFixed(2)}</span></p>
                                        <p className="col-span-2 text-slate-700 border-t border-dashed border-slate-200 pt-1 mt-1 font-black text-[13px]">
                                            Margen Real Ganancia: <span className={margenReal > 65 ? "text-emerald-600" : "text-amber-600"}>{margenReal.toFixed(1)}%</span>
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
    </div>
  );
};

export default Inventario;