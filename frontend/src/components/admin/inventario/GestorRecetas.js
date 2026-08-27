import React, { useState, useEffect } from 'react';
import { Package, Trash2, Box } from 'lucide-react';
import SelectorPlatillo from './recetas/SelectorPlatillo';
import FormularioAgregado from './recetas/FormularioAgregado';
import PanelTamanosFijos from './recetas/PanelTamanosFijos';
import TablaIngredientes from './recetas/TablaIngredientes';

const GestorRecetas = ({ insumosDB, productos, clasificaciones, refrescarDatos, apiUrl, showAlert, showConfirm }) => {
  // ==========================================
  // ESTADOS DE UI Y SELECCIÓN
  // ==========================================
  const [recetaCategoriaFiltro, setRecetaCategoriaFiltro] = useState('');
  const [recetaActivaId, setRecetaActivaId] = useState('');
  const [recetaItems, setRecetaItems] = useState([]);
  
  // 👇 NUEVOS ESTADOS (SABORES Y EXTRAS HÍBRIDOS)
  const [modoCosteo, setModoCosteo] = useState('platillos');
  const [extraActivoId, setExtraActivoId] = useState('');
  const [saborActivo, setSaborActivo] = useState('Base');
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);

  // Estados de Formulario de Ingreso
  const [tipoIngresoReceta, setTipoIngresoReceta] = useState('insumo');
  const [nuevoItemReceta, setNuevoItemReceta] = useState({ insumo_id: '', cantidad_usada: '' });
  const [nuevoItemSubReceta, setNuevoItemSubReceta] = useState({ sub_producto_id: '', cantidad_usada: '' });
  const [unidadConversionActiva, setUnidadConversionActiva] = useState('');

  // Estados de Configuración y Tamaños
  const [rendimientoCalculadora, setRendimientoCalculadora] = useState(1);
  const [unidadRendimiento, setUnidadRendimiento] = useState('PZ');
  const [configTamanos, setConfigTamanos] = useState({});
  const [empaquesUnicos, setEmpaquesUnicos] = useState([]);

  // Estados de Modales
  const [modalCrearBase, setModalCrearBase] = useState(false);
  const [nombreNuevaBase, setNombreNuevaBase] = useState('');
  const [modalEditarBase, setModalEditarBase] = useState(false);
  const [nombreEditadoBase, setNombreEditadoBase] = useState('');

  // ==========================================
  // EFECTOS (CARGA DE DATOS)
  // ==========================================
  useEffect(() => {
    fetch(`${apiUrl}/ingredientes`).then(r => r.json()).then(setCatalogoIngredientes).catch(console.error);
  }, [apiUrl]);

  useEffect(() => {
    const idTarget = modoCosteo === 'platillos' ? recetaActivaId : extraActivoId;
    
    if (idTarget) {
      if (modoCosteo === 'platillos') {
        const prod = productos.find(p => String(p.id) === String(idTarget));
        if (prod) {
          setRendimientoCalculadora(prod.rendimiento || 1);
          let opcionesArray = [];
          if (prod.opciones) {
            try { opcionesArray = typeof prod.opciones === 'string' ? JSON.parse(prod.opciones) : prod.opciones; } catch (e) {}
          }
          const tConfig = opcionesArray.filter(o => o.categoria === 'Tamaño');
          if (tConfig.length > 0) {
            const confObj = {};
            tConfig.forEach(t => { confObj[t.nombre] = { rendimiento: t.rendimiento_receta || 1, empaques: t.empaques || [] }; });
            setConfigTamanos(confObj);
          } else {
            setConfigTamanos({});
          }
          const optEmpaquesUnicos = opcionesArray.find(o => o.categoria === 'EmpaquesUnicos');
          if (optEmpaquesUnicos && optEmpaquesUnicos.empaques) setEmpaquesUnicos(optEmpaquesUnicos.empaques);
          else setEmpaquesUnicos([]);
          
          const optUnidad = opcionesArray.find(o => o.categoria === 'UnidadRendimiento');
          if (optUnidad) setUnidadRendimiento(optUnidad.nombre);
          else setUnidadRendimiento('PZ');
        }
      }

      // 👇 Fetch condicionado al modo de costeo para la Fase 2 del Backend
      fetch(`${apiUrl}/recetas/${idTarget}?modo=${modoCosteo}`)
        .then(r => r.json())
        .then(data => setRecetaItems(Array.isArray(data) ? data : []))
        .catch(console.error);
    } else {
      setRecetaItems([]); setRendimientoCalculadora(1); setConfigTamanos({}); setUnidadRendimiento('PZ'); setEmpaquesUnicos([]);
    }
  }, [recetaActivaId, extraActivoId, modoCosteo, productos, apiUrl]);

  // ==========================================
  // FUNCIONES DE BASES OCULTAS
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
      let nombreFinal = nombreNuevaBase.trim();
      if (!nombreFinal.toLowerCase().includes('(base)')) nombreFinal = `${nombreFinal} (Base)`;
      const formData = new FormData();
      formData.append('nombre', nombreFinal);
      formData.append('categoria', recetaCategoriaFiltro);
      formData.append('precio_base', 0);
      formData.append('disponible', 'false');
      formData.append('genera_puntos', 'false');
      const res = await fetch(`${apiUrl}/productos`, { method: 'POST', body: formData });
      if(res.ok) {
        showAlert("¡Base Creada!", "Ya puedes seleccionarla para armar su receta.", "success");
        setModalCrearBase(false);
        refrescarDatos();
      }
    } catch(e) { showAlert("Error", "No se pudo crear la base.", "error"); }
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
      let nombreFinal = nombreEditadoBase.trim();
      if (!nombreFinal.toLowerCase().includes('(base)')) nombreFinal = `${nombreFinal} (Base)`;
      const prod = productos.find(p => String(p.id) === String(recetaActivaId));
      const formData = new FormData();
      formData.append('nombre', nombreFinal);
      formData.append('categoria', prod.categoria || 'General');
      formData.append('precio_base', prod.precio_base || 0);
      formData.append('disponible', 'false');
      formData.append('genera_puntos', 'false');
      const res = await fetch(`${apiUrl}/productos/${recetaActivaId}`, { method: 'PUT', body: formData });
      if(res.ok) {
        showAlert("¡Actualizado!", "El nombre de la sub-receta ha sido modificado.", "success");
        setModalEditarBase(false);
        refrescarDatos();
      }
    } catch (error) { showAlert("Error", "Fallo de conexión.", "error"); }
  };

  // ==========================================
  // FUNCIONES DEL SERVIDOR Y RECETAS
  // ==========================================
  const guardarItemReceta = async (e) => {
    e.preventDefault();
    if (modoCosteo === 'platillos' && !recetaActivaId) return;
    if (modoCosteo === 'extras' && !extraActivoId) return;

    try {
      // 👇 FIX MÁSTER: Payload Inteligente que detecta el Sabor Activo y el Modo
      let payload = {
        modo_costeo: modoCosteo,
        producto_id: modoCosteo === 'platillos' ? recetaActivaId : null,
        ingrediente_id: modoCosteo === 'extras' ? extraActivoId : null,
        sabor_nombre: (modoCosteo === 'platillos' && saborActivo !== 'Base') ? saborActivo : null
      };

      if (tipoIngresoReceta === 'insumo') {
        let cantidadFinal = Number(nuevoItemReceta.cantidad_usada);
        const insumoSeleccionado = insumosDB.find(i => String(i.id) === String(nuevoItemReceta.insumo_id));
        if (insumoSeleccionado) {
          if (insumoSeleccionado.unidad_medida === 'KL' && unidadConversionActiva === 'GR') cantidadFinal = cantidadFinal / 1000;
          if (insumoSeleccionado.unidad_medida === 'LT' && unidadConversionActiva === 'ML') cantidadFinal = cantidadFinal / 1000;
        }
        payload.insumo_id = nuevoItemReceta.insumo_id;
        payload.cantidad_usada = cantidadFinal;
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
        payload.sub_producto_id = nuevoItemSubReceta.sub_producto_id;
        payload.cantidad_usada = cantidadFinal;
      }

      const res = await fetch(`${apiUrl}/recetas`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });

      if (res.ok) {
        setNuevoItemReceta({ insumo_id: '', cantidad_usada: '' }); 
        setNuevoItemSubReceta({ sub_producto_id: '', cantidad_usada: '' });
        
        // 👇 FIX: Recargar la lista correcta (Platillo o Extra) para refrescar la tabla
        const idTarget = modoCosteo === 'platillos' ? recetaActivaId : extraActivoId;
        const resData = await fetch(`${apiUrl}/recetas/${idTarget}?modo=${modoCosteo}`);
        const dataR = await resData.json();
        setRecetaItems(Array.isArray(dataR) ? dataR : []);
      } else {
        if(typeof showAlert !== 'undefined') showAlert("Error", "Error al guardar el insumo", "error");
      }
    } catch(e) {
        if(typeof showAlert !== 'undefined') showAlert("Error", "Fallo de conexión", "error");
    }
  };

  const eliminarItemReceta = async (id) => {
    try {
      await fetch(`${apiUrl}/recetas/${id}`, { method: 'DELETE' });
      // 👇 FIX: Refrescar la tabla correctamente al borrar
      const idTarget = modoCosteo === 'platillos' ? recetaActivaId : extraActivoId;
      const resData = await fetch(`${apiUrl}/recetas/${idTarget}?modo=${modoCosteo}`);
      const dataR = await resData.json();
      setRecetaItems(Array.isArray(dataR) ? dataR : []);
    } catch (error) { 
      console.error(error); 
    }
  };

  const guardarRendimientoYEmpaques = async () => {
    if (!recetaActivaId || modoCosteo !== 'platillos') return;
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
  // CONFIGURACIÓN DE EMPAQUES
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
    if (!recetaActivaId || modoCosteo !== 'platillos') return;
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

  // ==========================================
  // CÁLCULOS MAESTROS DE COSTOS (MATEMÁTICAS)
  // ==========================================
  const productoSeleccionado = productos.find(p => Number(p.id) === Number(recetaActivaId));
  const esSubReceta = productoSeleccionado && (productoSeleccionado.disponible === false || productoSeleccionado.disponible === 'false' || productoSeleccionado.disponible === 0);
  
  let tamanosConfigurados = [];
  let saboresConfigurados = [];
  if (productoSeleccionado && productoSeleccionado.opciones) {
    const ops = typeof productoSeleccionado.opciones === 'string' ? JSON.parse(productoSeleccionado.opciones) : productoSeleccionado.opciones;
    tamanosConfigurados = ops.filter(o => o.categoria === 'Tamaño');
    saboresConfigurados = ops.filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
  }

  // 👇 FILTRO UI: Solo muestra en la tabla los insumos de la pestaña activa (Base o Sabor XYZ)
  const recetaItemsFiltrados = recetaItems.filter(item => {
    if (modoCosteo === 'extras') return true;
    if (saborActivo === 'Base') return !item.sabor_nombre; // Null o vacío
    return item.sabor_nombre === saborActivo;
  });

  // 👇 COSTO TOTAL REAL (Suma los insumos Base + Los exclusivos del Sabor Activo)
  const itemsParaCosto = recetaItems.filter(item => {
    if (modoCosteo === 'extras') return true;
    return !item.sabor_nombre || item.sabor_nombre === saborActivo;
  });

  const costoTotalRecetaCalculado = itemsParaCosto.reduce((acc, item) => {
    let costoItem = 0;
    if (item.insumo_id) {
      const factorRendimiento = Number(item.factor_rendimiento) || 1;
      costoItem = ((item.costo_presentacion / Math.max(1, item.cantidad_presentacion)) * item.cantidad_usada) / factorRendimiento;
    } else if (item.sub_producto_id) {
      costoItem = (Number(item.costo_subreceta) || 0) * item.cantidad_usada;
    }
    return acc + costoItem;
  }, 0);

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
    if (modoCosteo === 'platillos' && String(p.id) === String(recetaActivaId)) return false;
    return true;
  });

  const empaquesDisponibles = insumosDB.filter(i => i.es_empaque === true || i.es_empaque === 'true');

  // Cálculos Globales (Menú)
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
          iniciarCreacionBase={iniciarCreacionBase} iniciarEdicionBase={iniciarEdicionBase}
          tamanosConfigurados={tamanosConfigurados}
          rendimientoCalculadora={rendimientoCalculadora} setRendimientoCalculadora={setRendimientoCalculadora}
          unidadRendimiento={unidadRendimiento} setUnidadRendimiento={setUnidadRendimiento}
          modoCosteo={modoCosteo} setModoCosteo={setModoCosteo}
          ingredientes={catalogoIngredientes} extraActivoId={extraActivoId} setExtraActivoId={setExtraActivoId}
          saboresConfigurados={saboresConfigurados} saborActivo={saborActivo} setSaborActivo={setSaborActivo}
        />

        {((modoCosteo === 'platillos' && recetaActivaId) || (modoCosteo === 'extras' && extraActivoId)) && (
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

      {((modoCosteo === 'platillos' && recetaActivaId) || (modoCosteo === 'extras' && extraActivoId)) && (
        <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200">
          <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-widest border-b border-slate-100 pb-4">
            {modoCosteo === 'platillos' ? `Receta: ${saborActivo === 'Base' ? 'Insumos Base' : `Exclusivos de Sabor ${saborActivo}`}` : 'Explosión de Insumos para Extra'}
          </h3>
          
          <TablaIngredientes 
            recetaItems={recetaItemsFiltrados} 
            insumosDB={insumosDB} 
            productos={productos} 
            eliminarItemReceta={eliminarItemReceta} 
            formatearCantidadVisual={formatearCantidadVisual} 
          />

          {/* 👇 UI ESPECÍFICA PARA EXTRAS (Más Minimalista) */}
          {modoCosteo === 'extras' && (
             <div className="bg-orange-50 border border-orange-200 p-6 rounded-3xl mt-6 text-center animate-in fade-in">
                 <p className="text-sm font-black text-orange-600 uppercase tracking-widest mb-2">Costo Neto de Producción</p>
                 <p className="text-4xl font-black text-orange-800">${(costoTotalRecetaCalculado / Math.max(1, rendimientoCalculadora)).toFixed(2)} <span className="text-lg">por {rendimientoCalculadora} {unidadRendimiento}</span></p>
             </div>
          )}

          {/* 👇 UI ESPECÍFICA PARA PLATILLOS */}
          {modoCosteo === 'platillos' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Package size={24}/></div>
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Costo de Insumos {saborActivo !== 'Base' ? `(${saborActivo})` : '(Base)'} (Olla Completa)
                  </p>
                  <p className="text-xl font-black text-slate-800">Receta Total: <span className="text-blue-600">${costoTotalRecetaCalculado.toFixed(2)}</span></p>
                </div>
              </div>
            </div>
          )}

          {modoCosteo === 'platillos' && (
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
                    <div className="text-center bg-slate-50 p-4 rounded-2xl border border-slate-200"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Costo Platillo</p><p className="text-xl font-black text-slate-700">${costoPorPorcionBase.toFixed(2)}</p></div>
                    <div className="text-center bg-slate-50 p-4 rounded-2xl border border-slate-200"><p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">+15% Luz/Agua</p><p className="text-xl font-black text-red-600">${luzAguaBase.toFixed(2)}</p></div>
                    <div className="text-center bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm"><p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Costo Real Final</p><p className="text-2xl font-black text-amber-600">${costoTotalRealBase.toFixed(2)}</p></div>
                    <div className="text-center bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm"><p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Precio Sugerido</p><p className="text-2xl font-black text-emerald-600">${precioSugeridoBase.toFixed(2)}</p></div>
                  </div>
                ) : (
                  <div className="flex flex-col justify-center items-center h-full bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Costo Neto Base por {unidadRendimiento}</p>
                    <p className="text-3xl font-black text-slate-800">${costoTotalSimuladoBase.toFixed(2)}</p>
                    <p className="text-[10px] text-blue-600 font-bold mt-2 bg-blue-50 px-3 py-1.5 rounded-lg">La Luz y Agua se cobran al costear el platillo final, no en bases.</p>
                  </div>
                )}
                
                {!esSubReceta && (
                  <div className="mt-4 flex gap-4">
                    <div className="flex-1 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">P. Venta Configurado</p>
                      <p className="text-2xl font-black text-slate-800">${precioVentaRealUnico.toFixed(2)}</p>
                    </div>
                    <div className="flex-1 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Margen Real</p>
                      <p className={`text-2xl font-black ${margenUnico > 65 ? 'text-emerald-500' : 'text-amber-500'}`}>{margenUnico.toFixed(1)}%</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {modoCosteo === 'platillos' && (
            <div className="flex justify-end pt-6 border-t border-slate-100">
              <button onClick={guardarRendimientoYEmpaques} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition shadow-lg active:scale-95 shadow-blue-500/30">
                💾 Guardar Rendimiento y Empaque
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAMAÑOS FIJOS (Solo si aplica) */}
      {modoCosteo === 'platillos' && recetaActivaId && tamanosConfigurados && tamanosConfigurados.length > 0 && (
        <PanelTamanosFijos
          tamanosConfigurados={tamanosConfigurados} productoSeleccionado={productoSeleccionado}
          configTamanos={configTamanos} setConfigTamanos={setConfigTamanos} insumosDB={insumosDB}
          empaquesDisponibles={empaquesDisponibles} costoTotalRecetaCalculado={costoTotalRecetaCalculado}
          guardarRendimientosTamanos={guardarRendimientosTamanos} actualizarEmpaqueTamanio={actualizarEmpaqueTamanio}
          eliminarEmpaqueTamanio={eliminarEmpaqueTamanio} agregarEmpaqueTamanio={agregarEmpaqueTamanio} esSubReceta={esSubReceta}
        />
      )}

      {/* MODALES DE BASES (Se mantienen ocultas) */}
      {modalCrearBase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <form onSubmit={guardarNuevaBase} className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-2">Crear Sub-Receta</h3>
            <p className="text-slate-500 font-medium mb-6 text-sm">Clasificación destino: <span className="font-bold text-blue-600">{recetaCategoriaFiltro}</span></p>
            <input autoFocus required placeholder="Ej. Salsa Roja, Arroz..." value={nombreNuevaBase} onChange={e => setNombreNuevaBase(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold mb-6" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalCrearBase(false)} className="flex-1 p-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancelar</button>
              <button type="submit" className="flex-[2] p-3 bg-blue-600 text-white font-black rounded-xl">Guardar Base</button>
            </div>
          </form>
        </div>
      )}

      {modalEditarBase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <form onSubmit={guardarEdicionBase} className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-6">Renombrar Base</h3>
            <input autoFocus required value={nombreEditadoBase} onChange={e => setNombreEditadoBase(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold mb-6" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalEditarBase(false)} className="flex-1 p-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancelar</button>
              <button type="submit" className="flex-[2] p-3 bg-blue-600 text-white font-black rounded-xl">Actualizar Nombre</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default GestorRecetas;