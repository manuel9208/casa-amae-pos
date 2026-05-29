import React, { useState, useEffect } from 'react';
import { Layers, Scale, Package, Box, Trash2 } from 'lucide-react';

// IMPORTACIÓN DE COMPONENTES HIJOS
import SelectorPlatillo from './recetas/SelectorPlatillo';
import FormularioAgregado from './recetas/FormularioAgregado';
import TablaIngredientes from './recetas/TablaIngredientes';
import PanelTamanosFijos from './recetas/PanelTamanosFijos';

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

  // ==========================================
  // CARGA DE DATOS Y ESTADOS
  // ==========================================
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
                          if (t.insumo_empaque_id && empaquesCargados.length === 0) empaquesCargados.push({ insumo_id: t.insumo_empaque_id, cantidad: 1 });
                          initialConfig[t.nombre] = { rendimiento: t.rendimiento_receta || '', empaques: empaquesCargados };
                      });
                      setConfigTamanos(initialConfig);
                  } else {
                      setConfigTamanos({});
                  }

                  const optEmpaquesUnicos = opcionesArray.find(o => o.categoria === 'EmpaquesUnicos');
                  if (optEmpaquesUnicos && optEmpaquesUnicos.empaques) setEmpaquesUnicos(optEmpaquesUnicos.empaques);
                  else setEmpaquesUnicos([]);

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

  // ==========================================
  // FUNCIONES DEL SERVIDOR Y LÓGICA
  // ==========================================
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
        formData.append('precio_base', 0); formData.append('tiempo_preparacion', 0); formData.append('disponible', false); formData.append('genera_puntos', false); formData.append('emoji', '🥣');
        formData.append('opciones', JSON.stringify([{ categoria: 'UnidadRendimiento', nombre: 'GR' }]));

        const res = await fetch(`${apiUrl}/productos`, { method: 'POST', body: formData });
        if (res.ok) {
            const nuevoProd = await res.json();
            showAlert("Éxito", "Preparación base creada.", "success");
            await refrescarDatos(); 
            setRecetaActivaId(nuevoProd.id); 
            setModalCrearBase(false);
        } else {
            showAlert("Error", "No se pudo crear la preparación.", "error");
        }
    } catch(e) { showAlert("Error", "Error de conexión.", "error"); }
  };
  
  const guardarItemReceta = async (e) => { 
    e.preventDefault(); 
    const duplicado = recetaItems.find(item => tipoIngresoReceta === 'insumo' ? Number(item.insumo_id) === Number(nuevoItemReceta.insumo_id) : Number(item.sub_producto_id) === Number(nuevoItemSubReceta.sub_producto_id));
    if (duplicado) return showAlert("Elemento Duplicado", "Este insumo ya fue agregado.", "warning");

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
        setNuevoItemReceta({ insumo_id: '', cantidad_usada: '' }); setNuevoItemSubReceta({ sub_producto_id: '', cantidad_usada: '' }); 
        const r = await fetch(`${apiUrl}/recetas/${recetaActivaId}`); 
        const dataR = await r.json(); 
        setRecetaItems(Array.isArray(dataR) ? dataR : []); 
      }
    } catch(e) {} 
  };

  const eliminarItemReceta = (id) => { 
    fetch(`${apiUrl}/recetas/${id}`, { method: 'DELETE' }).then(() => { 
      fetch(`${apiUrl}/recetas/${recetaActivaId}`).then(r => r.json()).then(dataR => setRecetaItems(Array.isArray(dataR) ? dataR : [])); 
    }); 
  };

  const guardarRendimientoYEmpaques = async () => {
    if (!recetaActivaId) return;
    try { 
      await fetch(`${apiUrl}/productos/${recetaActivaId}/rendimiento`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rendimiento: rendimientoCalculadora }) }); 
      const prod = productos.find(p => Number(p.id) === Number(recetaActivaId));
      let opcionesArray = [];
      if (prod && prod.opciones) opcionesArray = typeof prod.opciones === 'string' ? JSON.parse(prod.opciones) : prod.opciones;
      const opcionesFiltradas = opcionesArray.filter(o => o.categoria !== 'UnidadRendimiento' && o.categoria !== 'EmpaquesUnicos');
      opcionesFiltradas.push({ categoria: 'UnidadRendimiento', nombre: unidadRendimiento });
      const empaquesValidos = empaquesUnicos.filter(e => e.insumo_id !== '');
      if (empaquesValidos.length > 0) opcionesFiltradas.push({ categoria: 'EmpaquesUnicos', nombre: 'Empaques Base', empaques: empaquesValidos });
      
      await fetch(`${apiUrl}/productos/${recetaActivaId}/opciones`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opciones: opcionesFiltradas }) });
      showAlert("¡Éxito!", "Configuración guardada correctamente.", "success");
      refrescarDatos(); 
    } catch (error) { showAlert("Error", "No se pudo guardar.", "error"); }
  };

  // ==========================================
  // FUNCIONES DE EMPAQUES (CÓDIGO DE APOYO)
  // ==========================================
  const agregarEmpaqueTamanio = (tamNombre) => {
      const current = configTamanos[tamNombre] || { rendimiento: '', empaques: [] };
      setConfigTamanos({ ...configTamanos, [tamNombre]: { ...current, empaques: [...(current.empaques || []), { insumo_id: '', cantidad: 1 }] }});
  };

  const actualizarEmpaqueTamanio = (tamNombre, idx, campo, valor) => {
      const current = configTamanos[tamNombre]; const nuevosEmpaques = [...current.empaques];
      nuevosEmpaques[idx][campo] = valor; setConfigTamanos({ ...configTamanos, [tamNombre]: { ...current, empaques: nuevosEmpaques }});
  };

  const eliminarEmpaqueTamanio = (tamNombre, idx) => {
      const current = configTamanos[tamNombre]; const nuevosEmpaques = current.empaques.filter((_, i) => i !== idx);
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
                return { ...o, rendimiento_receta: Number(configTamanos[o.nombre].rendimiento), empaques: empaquesValidos, costo_empaque: undefined, insumo_empaque_id: undefined };
            } return o;
        });

        const res = await fetch(`${apiUrl}/productos/${recetaActivaId}/opciones`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opciones: nuevasOpciones }) });
        if (res.ok) { showAlert("¡Guardado!", "Se han guardado los tamaños.", "success"); refrescarDatos(); }
    } catch (error) {}
  };

  const agregarEmpaqueUnico = () => setEmpaquesUnicos([...empaquesUnicos, { insumo_id: '', cantidad: 1 }]);
  const actualizarEmpaqueUnico = (idx, campo, valor) => { const nuevos = [...empaquesUnicos]; nuevos[idx][campo] = valor; setEmpaquesUnicos(nuevos); };
  const eliminarEmpaqueUnico = (idx) => setEmpaquesUnicos(empaquesUnicos.filter((_, i) => i !== idx));
  const formatearCantidadVisual = (cantidad, unidad) => { const cant = Number(cantidad); if (unidad === 'KL' && cant < 1 && cant > 0) return `${(cant * 1000).toFixed(0)} GR`; if (unidad === 'LT' && cant < 1 && cant > 0) return `${(cant * 1000).toFixed(0)} ML`; return `${cant} ${unidad}`; };

  // ==========================================
  // CÁLCULOS MATEMÁTICOS PRINCIPALES
  // ==========================================
  const subRecetasDisponibles = (productos || []).filter(p => Number(p.id) !== Number(recetaActivaId) && (p.disponible === false || p.disponible === 'false'));
  const empaquesDisponibles = (insumosDB || []).filter(i => i.es_empaque === true || i.es_empaque === 'true');

  let costoTotalRecetaCalculado = 0; let pesoEstimadoReceta = 0; 
  if (recetaItems && recetaItems.length > 0) {
    recetaItems.forEach(item => {
        if (item.insumo_id) {
            const factorRendimiento = Number(item.factor_rendimiento) || 1;
            costoTotalRecetaCalculado += ((item.costo_presentacion / Math.max(1, item.cantidad_presentacion)) / factorRendimiento) * item.cantidad_usada;
            const cantUsada = Number(item.cantidad_usada) || 0;
            if (item.unidad_medida === 'KL' || item.unidad_medida === 'LT') pesoEstimadoReceta += (cantUsada * 1000); else if (item.unidad_medida === 'GR' || item.unidad_medida === 'ML') pesoEstimadoReceta += cantUsada;
        } else if (item.sub_producto_id) {
            let costoSubEmpaques = 0; let unidadSub = 'PZ';
            const prodRef = productos.find(p => Number(p.id) === Number(item.sub_producto_id));
            if (prodRef && prodRef.opciones) {
                const ops = typeof prodRef.opciones === 'string' ? JSON.parse(prodRef.opciones) : prodRef.opciones;
                const opt = ops.find(o => o.categoria === 'UnidadRendimiento'); if (opt) unidadSub = opt.nombre;
                const optEmp = ops.find(o => o.categoria === 'EmpaquesUnicos');
                if (optEmp && optEmp.empaques) { optEmp.empaques.forEach(emp => { const ins = insumosDB.find(i => String(i.id) === String(emp.insumo_id)); if (ins) { const f = Number(ins.factor_rendimiento) || 1; costoSubEmpaques += ((ins.costo_presentacion / Math.max(1, ins.cantidad_presentacion)) / f) * (Number(emp.cantidad) || 0); } }); }
            }
            const costoUnitarioReal = (Number(item.costo_subreceta) || 0) + costoSubEmpaques;
            costoTotalRecetaCalculado += costoUnitarioReal * item.cantidad_usada;
            const cantUsada = Number(item.cantidad_usada) || 0;
            if (unidadSub === 'KL' || unidadSub === 'LT') pesoEstimadoReceta += (cantUsada * 1000); else if (unidadSub === 'GR' || unidadSub === 'ML') pesoEstimadoReceta += cantUsada;
        }
    });
  }

  const productoSeleccionado = (productos || []).find(p => Number(p.id) === Number(recetaActivaId));
  const esSubReceta = productoSeleccionado?.nombre?.includes('(Base)') || productoSeleccionado?.disponible === false || productoSeleccionado?.disponible === 'false';
  
  let tamanosConfigurados = [];
  if (productoSeleccionado && productoSeleccionado.opciones) {
      try { const opcionesArray = typeof productoSeleccionado.opciones === 'string' ? JSON.parse(productoSeleccionado.opciones) : productoSeleccionado.opciones; tamanosConfigurados = (opcionesArray || []).filter(o => o.categoria === 'Tamaño'); } catch (e) {}
  }

  const costoPorPorcionBase = costoTotalRecetaCalculado / Math.max(1, rendimientoCalculadora);
  let costoEmpaquesUnicoTotal = 0;
  if (tamanosConfigurados.length === 0) {
      empaquesUnicos.forEach(emp => {
          if (emp.insumo_id) { const ins = insumosDB.find(i => String(i.id) === String(emp.insumo_id)); if (ins) { const f = Number(ins.factor_rendimiento) || 1; costoEmpaquesUnicoTotal += ((ins.costo_presentacion / Math.max(1, ins.cantidad_presentacion)) / f) * (Number(emp.cantidad) || 0); } }
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
      if (insumoSeleccionadoActual) { if (insumoSeleccionadoActual.unidad_medida === 'KL') opcionesDeUnidad = ['KL', 'GR']; else if (insumoSeleccionadoActual.unidad_medida === 'LT') opcionesDeUnidad = ['LT', 'ML']; else opcionesDeUnidad = [insumoSeleccionadoActual.unidad_medida]; }
  } else {
      const subRecetaActual = productos.find(p => String(p.id) === String(nuevoItemSubReceta.sub_producto_id));
      if (subRecetaActual) {
          let unidadBase = 'PZ'; if (subRecetaActual.opciones) { const ops = typeof subRecetaActual.opciones === 'string' ? JSON.parse(subRecetaActual.opciones) : subRecetaActual.opciones; const opt = ops.find(o => o.categoria === 'UnidadRendimiento'); if (opt) unidadBase = opt.nombre; }
          if (unidadBase === 'KL') opcionesDeUnidad = ['KL', 'GR']; else if (unidadBase === 'LT') opcionesDeUnidad = ['LT', 'ML']; else opcionesDeUnidad = [unidadBase];
      }
  }

  // ==========================================
  // RENDERIZADO DEL COMPONENTE MAESTRO
  // ==========================================
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
        <h3 className="text-2xl font-black mb-6 text-slate-800">Ficha Técnica (Receta) y Rendimiento</h3>
        
        <SelectorPlatillo 
            clasificaciones={clasificaciones} productos={productos}
            recetaCategoriaFiltro={recetaCategoriaFiltro} setRecetaCategoriaFiltro={setRecetaCategoriaFiltro}
            recetaActivaId={recetaActivaId} setRecetaActivaId={setRecetaActivaId}
            iniciarCreacionBase={iniciarCreacionBase} tamanosConfigurados={tamanosConfigurados}
            rendimientoCalculadora={rendimientoCalculadora} setRendimientoCalculadora={setRendimientoCalculadora}
            unidadRendimiento={unidadRendimiento} setUnidadRendimiento={setUnidadRendimiento}
        />

        {recetaActivaId && (
            <FormularioAgregado 
                tipoIngresoReceta={tipoIngresoReceta} setTipoIngresoReceta={setTipoIngresoReceta}
                nuevoItemReceta={nuevoItemReceta} setNuevoItemReceta={setNuevoItemReceta}
                nuevoItemSubReceta={nuevoItemSubReceta} setNuevoItemSubReceta={setNuevoItemSubReceta}
                insumosDB={insumosDB} subRecetasDisponibles={subRecetasDisponibles} productos={productos}
                unidadConversionActiva={unidadConversionActiva} setUnidadConversionActiva={setUnidadConversionActiva}
                opcionesDeUnidad={opcionesDeUnidad} guardarItemReceta={guardarItemReceta}
            />
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
                   <span className="font-black text-lg ml-1">{pesoEstimadoReceta >= 1000 ? `${(pesoEstimadoReceta / 1000).toFixed(2)} KG/LT` : `${pesoEstimadoReceta.toFixed(0)} GR/ML`}</span>
               </div>
           )}

           <TablaIngredientes 
               recetaItems={recetaItems} insumosDB={insumosDB} productos={productos}
               eliminarItemReceta={eliminarItemReceta} formatearCantidadVisual={formatearCantidadVisual}
           />
           
           {/* EMPAQUES ÚNICOS */}
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
                    <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Box size={16}/> Empaques (Por cada porción)</p>
                            <span className="text-slate-500 bg-white px-3 py-1 rounded shadow-sm border border-slate-100 font-bold text-sm">Total: ${costoEmpaquesUnicoTotal.toFixed(2)}</span>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                            {empaquesUnicos.map((emp, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <select value={emp.insumo_id} onChange={e => actualizarEmpaqueUnico(idx, 'insumo_id', e.target.value)} className="flex-1 p-3 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500">
                                        <option value="">Selecciona empaque...</option>
                                        {empaquesDisponibles.map(ins => {
                                            const factorRendimientoEmp = Number(ins.factor_rendimiento) || 1;
                                            return (
                                                <option key={ins.id} value={ins.id}>{ins.nombre} - ${((ins.costo_presentacion / Math.max(1, ins.cantidad_presentacion)) / factorRendimientoEmp).toFixed(2)} c/u</option>
                                            );
                                        })}
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
                   {esSubReceta ? (
                       <div className="w-full bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                           <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Costo Neto de la Base (Insumos + Empaques)</p>
                           <p className="text-4xl font-black text-slate-800">${costoConEmpaquesUnico.toFixed(2)}</p>
                           <div className="mt-4 inline-block bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-4 py-2 rounded-lg">💡 Al ser una preparación base, la <strong>Luz/Agua (15%)</strong> y el margen de ganancia se calcularán automáticamente cuando la agregues a tu platillo final.</div>
                       </div>
                   ) : unidadRendimiento === 'PZ' ? (
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                           <div className="text-center bg-slate-50 p-4 rounded-2xl border border-slate-200"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Costo Platillo Base</p><p className="text-xl font-black text-slate-700">${costoPorPorcionBase.toFixed(2)}</p></div>
                           <div className="text-center bg-slate-50 p-4 rounded-2xl border border-slate-200"><p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">+15% Luz/Agua</p><p className="text-xl font-black text-red-600">${luzAguaBase.toFixed(2)}</p></div>
                           <div className="text-center bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm"><p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Costo Real + Empaque</p><p className="text-2xl font-black text-amber-600">${costoTotalRealBase.toFixed(2)}</p></div>
                           <div className="text-center bg-emerald-600 p-4 rounded-2xl shadow-md text-white relative"><p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1">Venta Sugerida (*3)</p><p className="text-3xl font-black">${precioSugeridoBase.toFixed(2)}</p><div className="absolute -top-3 -right-3 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-md border-2 border-white">{margenUnico > 65 ? <span className="text-emerald-400">✅ {margenUnico.toFixed(0)}%</span> : <span className="text-red-400">⚠️ {margenUnico.toFixed(0)}%</span>}</div></div>
                       </div>
                   ) : (
                       <div className="w-full text-center bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow-sm"><p className="text-sm font-black text-blue-700">💡 Al ser una receta base en <span className="font-black text-xl mx-1">{unidadRendimiento}</span>, el precio de venta sugerido se calculará cuando uses esta base dentro del platillo final.</p></div>
                   )}
                   <button onClick={guardarRendimientoYEmpaques} className="w-full mt-4 bg-slate-800 hover:bg-slate-900 text-white px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition shadow-lg shadow-slate-500/30 active:scale-95 flex items-center justify-center gap-2">💾 Guardar Rendimiento y Empaques</button>
               </div>
             </div>
           )}

           {tamanosConfigurados.length > 0 && (
               <PanelTamanosFijos 
                   tamanosConfigurados={tamanosConfigurados} productoSeleccionado={productoSeleccionado}
                   configTamanos={configTamanos} setConfigTamanos={setConfigTamanos}
                   insumosDB={insumosDB} empaquesDisponibles={empaquesDisponibles} costoTotalRecetaCalculado={costoTotalRecetaCalculado}
                   guardarRendimientosTamanos={guardarRendimientosTamanos} actualizarEmpaqueTamanio={actualizarEmpaqueTamanio}
                   eliminarEmpaqueTamanio={eliminarEmpaqueTamanio} agregarEmpaqueTamanio={agregarEmpaqueTamanio}
                   esSubReceta={esSubReceta}
               />
           )}
         </div>
      )}

      {/* MODAL PARA CREAR BASES */}
      {modalCrearBase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <form onSubmit={guardarNuevaBase} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-emerald-200">
            <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2"><Layers className="text-emerald-500"/> Crear Preparación Base</h3>
            <p className="text-slate-500 font-medium mb-6 text-sm">Se guardará como una sub-receta oculta en la clasificación: <span className="font-bold text-emerald-600">{recetaCategoriaFiltro}</span></p>
            <div className="space-y-4">
              <div><label className="block text-xs font-black text-slate-400 uppercase mb-1">Nombre de la Base (Ej. Masa Base)</label><input autoFocus required type="text" value={nombreNuevaBase} onChange={e => setNombreNuevaBase(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 font-bold text-lg text-slate-700" placeholder="Nombre de la receta..." /></div>
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