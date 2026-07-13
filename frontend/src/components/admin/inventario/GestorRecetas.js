import React, { useState, useEffect } from 'react';
import { Layers, Scale, Package, Box, Trash2, Edit2 } from 'lucide-react';  

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

  // ESTADOS DEL MODAL CREAR BASE
  const [modalCrearBase, setModalCrearBase] = useState(false);
  const [nombreNuevaBase, setNombreNuevaBase] = useState('');  

  // 👇 NUEVOS ESTADOS DEL MODAL EDITAR BASE
  const [modalEditarBase, setModalEditarBase] = useState(false);
  const [nombreEditadoBase, setNombreEditadoBase] = useState('');

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
  // FUNCIONES DE BASES Y SUBRECETAS
  // ==========================================
  
  const iniciarCreacionBase = () => {
    if (!recetaCategoriaFiltro) return showAlert("Atención", "Selecciona primero una Clasificación donde guardar esta base.", "warning");
    setNombreNuevaBase('');
    setModalCrearBase(true);
  };

  const guardarNuevaBase = async (e) => {
    e.preventDefault();
    if (!nombreNuevaBase.trim()) return;
    try {
      // 👇 FIX: Inyectamos "(Base)" automáticamente si el usuario no lo escribió
      let nombreFinal = nombreNuevaBase.trim();
      if (!nombreFinal.toLowerCase().includes('(base)')) {
        nombreFinal = `${nombreFinal} (Base)`;
      }

      const formData = new FormData();
      formData.append('nombre', nombreFinal);
      formData.append('categoria', recetaCategoriaFiltro);
      formData.append('precio_base', 0);
      formData.append('disponible', 'false'); // Se guarda oculta
      formData.append('genera_puntos', 'false'); // 🛡️ Escudo: Evita que aparezca el tag +PTS

      const res = await fetch(`${apiUrl}/productos`, {
        method: 'POST',
        body: formData
      });

      if(res.ok) {
        showAlert("¡Base Creada!", "Ya puedes seleccionarla para armar su receta.", "success");
        setModalCrearBase(false);
        refrescarDatos();
      }
    } catch(e) {
      showAlert("Error", "No se pudo crear la base.", "error");
    }
  };

  const iniciarEdicionBase = () => {
    const prod = productos.find(p => String(p.id) === String(recetaActivaId));
    if(prod) {
      setNombreEditadoBase(prod.nombre);
      setModalEditarBase(true);
    }
  };

  const guardarEdicionBase = async (e) => {
    e.preventDefault();
    if (!nombreEditadoBase.trim()) return;
    try {
      // 👇 FIX: Garantizamos que "(Base)" se mantenga aunque el usuario lo borre al renombrar
      let nombreFinal = nombreEditadoBase.trim();
      if (!nombreFinal.toLowerCase().includes('(base)')) {
        nombreFinal = `${nombreFinal} (Base)`;
      }

      const prod = productos.find(p => String(p.id) === String(recetaActivaId));
      const formData = new FormData();
      formData.append('nombre', nombreFinal);
      formData.append('categoria', prod.categoria || 'General');
      formData.append('precio_base', prod.precio_base || 0);
      formData.append('disponible', 'false'); // Mantenerla oculta
      formData.append('genera_puntos', 'false'); // 🛡️ Escudo: Evita que aparezca el tag +PTS

      const res = await fetch(`${apiUrl}/productos/${recetaActivaId}`, {
        method: 'PUT',
        body: formData
      });

      if(res.ok) {
        showAlert("¡Actualizado!", "El nombre de la sub-receta ha sido modificado.", "success");
        setModalEditarBase(false);
        refrescarDatos();
      } else {
        showAlert("Error", "Error al modificar la base.", "error");
      }
    } catch (error) {
      showAlert("Error", "Fallo de conexión.", "error");
    }
  };

  // ==========================================
  // FUNCIONES DEL SERVIDOR Y RECETAS
  // ==========================================
  const guardarItemReceta = async (e) => {
    e.preventDefault();
    if (!recetaActivaId) return;
    try {
      let payload = {};
      if (tipoIngresoReceta === 'insumo') {
        let cantidadFinal = Number(nuevoItemReceta.cantidad_usada);
        const insumoSeleccionado = insumosDB.find(i => String(i.id) === String(nuevoItemReceta.insumo_id));
        if (insumoSeleccionado) {
          if (insumoSeleccionado.unidad_medida === 'KL' && unidadConversionActiva === 'GR') cantidadFinal = cantidadFinal / 1000;
          if (insumoSeleccionado.unidad_medida === 'LT' && unidadConversionActiva === 'ML') cantidadFinal = cantidadFinal / 1000;
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
  // FUNCIONES DE EMPAQUES
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
    if (!recetaActivaId) return;
    try {
      const prod = productos.find(p => Number(p.id) === Number(recetaActivaId));
      if (!prod || !prod.opciones) return;
      const opcionesArray = typeof prod.opciones === 'string' ? JSON.parse(prod.opciones) : prod.opciones;
      const tConfig = opcionesArray.filter(o => o.categoria === 'Tamaño');
      const otrasOpciones = opcionesArray.filter(o => o.categoria !== 'Tamaño');  
      const nuevosTamanos = tConfig.map(t => {
        const conf = configTamanos[t.nombre];
        if (conf) {
          const empsValidos = conf.empaques.filter(e => e.insumo_id !== '');
          return { ...t, rendimiento_receta: conf.rendimiento, empaques: empsValidos };
        }
        return t;
      });  
      await fetch(`${apiUrl}/productos/${recetaActivaId}/opciones`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opciones: [...otrasOpciones, ...nuevosTamanos] }) });
      showAlert("¡Guardado!", "Se actualizaron los rendimientos y empaques por tamaño.", "success");
      refrescarDatos();
    } catch (e) { showAlert("Error", "No se pudo guardar la configuración de tamaños.", "error"); }
  };

  const actualizarEmpaqueUnico = (idx, campo, valor) => {
    const copia = [...empaquesUnicos];
    copia[idx][campo] = valor;
    setEmpaquesUnicos(copia);
  };
  
  const agregarEmpaqueUnico = () => setEmpaquesUnicos([...empaquesUnicos, { insumo_id: '', cantidad: 1 }]);
  const eliminarEmpaqueUnico = (idx) => setEmpaquesUnicos(empaquesUnicos.filter((_, i) => i !== idx));  
  
  const formatearCantidadVisual = (cantidadUnidadBase, unidadOriginal) => {
    let cantNumber = Number(cantidadUnidadBase);
    let resultNumber = cantNumber;
    let resultUnit = unidadOriginal;  
    if (unidadOriginal === 'KL') {
      if (cantNumber < 1) { resultNumber = cantNumber * 1000; resultUnit = 'GR'; }
      else { resultNumber = cantNumber; resultUnit = 'KG'; }
    } else if (unidadOriginal === 'LT') {
      if (cantNumber < 1) { resultNumber = cantNumber * 1000; resultUnit = 'ML'; }
      else { resultNumber = cantNumber; resultUnit = 'LT'; }
    }  
    return `${resultNumber % 1 === 0 ? resultNumber : resultNumber.toFixed(2)} ${resultUnit}`;
  };

  // CÁLCULOS
  const costoTotalRecetaCalculado = recetaItems.reduce((acc, item) => {
    let costoItem = 0;
    if (item.insumo_id) {
      const factorRendimiento = Number(item.factor_rendimiento) || 1;
      costoItem = ((item.costo_presentacion / Math.max(1, item.cantidad_presentacion)) * item.cantidad_usada) / factorRendimiento;
    } else if (item.sub_producto_id) {
      costoItem = (Number(item.costo_subreceta) || 0) * item.cantidad_usada;
    }
    return acc + costoItem;
  }, 0);  

  const productoSeleccionado = productos.find(p => Number(p.id) === Number(recetaActivaId));
  const esSubReceta = productoSeleccionado && (productoSeleccionado.disponible === false || productoSeleccionado.disponible === 'false' || productoSeleccionado.disponible === 0);
  
  let tamanosConfigurados = [];
  if (productoSeleccionado && productoSeleccionado.opciones) {
    const ops = typeof productoSeleccionado.opciones === 'string' ? JSON.parse(productoSeleccionado.opciones) : productoSeleccionado.opciones;
    tamanosConfigurados = ops.filter(o => o.categoria === 'Tamaño');
  }  

  let costoEmpaquesUnicoTotal = 0;
  empaquesUnicos.forEach(emp => {
    if (emp.insumo_id) {
      const ins = insumosDB.find(i => String(i.id) === String(emp.insumo_id));
      if (ins) {
        const factorRendimientoEmp = Number(ins.factor_rendimiento) || 1;
        costoEmpaquesUnicoTotal += ((ins.costo_presentacion / Math.max(1, ins.cantidad_presentacion)) / factorRendimientoEmp) * (Number(emp.cantidad) || 0);
      }
    }
  });  

  const pesoEstimadoReceta = recetaItems.reduce((acc, item) => {
    if (item.unidad_medida === 'KL' || item.unidad_medida === 'LT') return acc + (Number(item.cantidad_usada) * 1000);
    if (item.unidad_medida === 'GR' || item.unidad_medida === 'ML') return acc + Number(item.cantidad_usada);
    return acc;
  }, 0);  

  const opcionesDeUnidad = [];
  if (tipoIngresoReceta === 'insumo' && nuevoItemReceta.insumo_id) {
    const ins = insumosDB.find(i => String(i.id) === String(nuevoItemReceta.insumo_id));
    if (ins) {
      if (ins.unidad_medida === 'KL') opcionesDeUnidad.push('GR', 'KG');
      else if (ins.unidad_medida === 'LT') opcionesDeUnidad.push('ML', 'LT');
      else opcionesDeUnidad.push(ins.unidad_medida);
    }
  } else if (tipoIngresoReceta === 'subreceta' && nuevoItemSubReceta.sub_producto_id) {
    const p = productos.find(pr => String(pr.id) === String(nuevoItemSubReceta.sub_producto_id));
    if (p) {
      let u = 'PZ';
      if (p.opciones) {
        const ops = typeof p.opciones === 'string' ? JSON.parse(p.opciones) : p.opciones;
        const opt = ops.find(o => o.categoria === 'UnidadRendimiento');
        if (opt) u = opt.nombre;
      }
      if (u === 'KL') opcionesDeUnidad.push('GR', 'KG');
      else if (u === 'LT') opcionesDeUnidad.push('ML', 'LT');
      else opcionesDeUnidad.push(u);
    }
  }  

  const subRecetasDisponibles = productos.filter(p => {
    if (p.disponible !== false && p.disponible !== 'false' && p.disponible !== 0) return false;
    if (String(p.id) === String(recetaActivaId)) return false;
    return true;
  });  

  const empaquesDisponibles = insumosDB.filter(i => i.es_empaque === true || i.es_empaque === 'true');  

  // CÁLCULOS GLOBALES (Cuando no tiene tamaños fijos)
  const costoInsumoBase = costoTotalRecetaCalculado / Math.max(1, rendimientoCalculadora);
  const costoTotalSimuladoBase = costoInsumoBase + costoEmpaquesUnicoTotal;
  const luzAguaBase = costoTotalSimuladoBase * 0.15;
  const costoTotalRealBase = costoTotalSimuladoBase * 1.15;
  const precioSugeridoBase = costoTotalRealBase * 3;
  const costoPorPorcionBase = costoTotalRecetaCalculado / Math.max(1, rendimientoCalculadora);
  const precioVentaRealUnico = Number(productoSeleccionado?.precio_base) || 0;
  const utilidadUnico = precioVentaRealUnico - costoTotalRealBase;
  const margenUnico = precioVentaRealUnico > 0 ? (utilidadUnico / precioVentaRealUnico) * 100 : 0;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200">
        <SelectorPlatillo
          clasificaciones={clasificaciones} productos={productos}
          recetaCategoriaFiltro={recetaCategoriaFiltro} setRecetaCategoriaFiltro={setRecetaCategoriaFiltro}
          recetaActivaId={recetaActivaId} setRecetaActivaId={setRecetaActivaId}
          iniciarCreacionBase={iniciarCreacionBase}
          iniciarEdicionBase={iniciarEdicionBase} // 👈 Pasamos la función al selector
          tamanosConfigurados={tamanosConfigurados}
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

          <TablaIngredientes recetaItems={recetaItems} insumosDB={insumosDB} productos={productos} eliminarItemReceta={eliminarItemReceta} formatearCantidadVisual={formatearCantidadVisual} />  
          
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
                    {empaquesDisponibles.length === 0 && <p className="text-sm text-slate-400 italic">No tienes insumos marcados como "Empaque" en tu inventario.</p>}
                  </div>
                  <button onClick={agregarEmpaqueUnico} className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-500 hover:bg-slate-100 rounded-xl font-bold uppercase transition">+ Añadir Empaque</button>
                </div>  

                <div className="flex-1">
                  {!esSubReceta ? (
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

      {/* 👇 NUEVO MODAL PARA RENOMBRAR BASES */}
      {modalEditarBase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <form onSubmit={guardarEdicionBase} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-blue-200">
            <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2"><Edit2 className="text-blue-500"/> Renombrar Base</h3>
            <p className="text-slate-500 font-medium mb-6 text-sm">Cambia el nombre con el que identificas a esta preparación.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Nuevo Nombre</label>
                <input autoFocus required type="text" value={nombreEditadoBase} onChange={e => setNombreEditadoBase(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-bold text-lg text-slate-700" placeholder="Ej. Masa Modificada..." />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button type="button" onClick={() => setModalEditarBase(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition active:scale-95">Guardar Cambios</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};  

export default GestorRecetas;