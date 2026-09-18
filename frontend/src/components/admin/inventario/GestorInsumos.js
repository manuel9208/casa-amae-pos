import React, { useState, useEffect } from 'react';
import { 
  Package, ShoppingBag, RotateCcw, Edit, Trash2, 
  AlertTriangle, Box, Percent, Search, ClipboardList, 
  X, CheckCircle2, CopyPlus // 👈 Cambiamos el ícono para indicar elementos múltiples
} from 'lucide-react';

const GestorInsumos = ({ insumosDB, apiUrl, refrescarDatos, showAlert, showConfirm }) => {
  const [nuevoInsumo, setNuevoInsumo] = useState({
    nombre: '', unidad_medida: 'KL', cantidad_presentacion: '',
    costo_presentacion: '', es_empaque: false, tipo_rendimiento: 'Directo',
    peso_prueba_crudo: '', peso_prueba_limpio: '',
    insumos_sustitutos: [] // 👈 NUEVO: Estado para múltiples respaldos (Array)
  });
  const [unidadPrueba, setUnidadPrueba] = useState('GR');
  const [editandoInsumoId, setEditandoInsumoId] = useState(null);
  
  // Modales de Compra
  const [modalCompra, setModalCompra] = useState(null);
  const [compraPaquetes, setCompraPaquetes] = useState('');
  const [compraCosto, setCompraCosto] = useState('');

  // ESTADOS DE AUDITORÍA DIRECTA (Ajuste Admin)
  const [modalAuditoria, setModalAuditoria] = useState(false);
  const [busquedaAuditoria, setBusquedaAuditoria] = useState('');
  const [insumoAuditoria, setInsumoAuditoria] = useState(null);
  const [cantidadAuditoria, setCantidadAuditoria] = useState('');
  const [unidadAuditoria, setUnidadAuditoria] = useState('');

  // ESTADOS DE AUDITORÍA REMOTA (Solicitud a Caja)
  const [auditoriaActiva, setAuditoriaActiva] = useState(null);
  const [modalRevision, setModalRevision] = useState(false);

  // Escuchar si hay una auditoría activa en curso
  useEffect(() => {
    const cargarAuditoria = async () => {
      try {
        const res = await fetch(`${apiUrl}/insumos/auditoria/activa`);
        if (res.ok) setAuditoriaActiva(await res.json());
      } catch (error) {}
    };
    cargarAuditoria();
    
    // Respaldo de actualización automática cada 10 seg
    const interval = setInterval(cargarAuditoria, 10000); 
    return () => clearInterval(interval);
  }, [apiUrl]);

  const solicitarInventario = async () => {
    showConfirm("Solicitar Inventario", "¿Deseas solicitar a Caja que realice un conteo de inventario ahora mismo?", async () => {
      try {
        const res = await fetch(`${apiUrl}/insumos/auditoria/solicitar`, { method: 'POST' });
        if (res.ok) {
          setAuditoriaActiva(await res.json());
          showAlert("Solicitud Enviada", "Caja ha recibido la alerta parpadeante para comenzar el inventario.", "success");
        }
      } catch(e) {
        showAlert("Error", "No se pudo solicitar el inventario.", "error");
      }
    });
  };

  const resolverInventario = async (accion) => {
    try {
      const res = await fetch(`${apiUrl}/insumos/auditoria/${auditoriaActiva.id}/resolver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion })
      });
      if (res.ok) {
        setModalRevision(false);
        setAuditoriaActiva(null);
        refrescarDatos();
        showAlert("Éxito", accion === 'aprobar' ? "Inventario actualizado y guardado correctamente." : "Se ha devuelto a Caja para que corrijan el conteo.", "success");
      }
    } catch(e) {
      showAlert("Error", "Error de red al procesar la revisión.", "error");
    }
  };

  const prepararEdicionInsumo = (insumo) => {
    setEditandoInsumoId(insumo.id);
    setNuevoInsumo({
      nombre: insumo.nombre,
      unidad_medida: insumo.unidad_medida,
      cantidad_presentacion: insumo.cantidad_presentacion,
      costo_presentacion: insumo.costo_presentacion,
      es_empaque: insumo.es_empaque,
      tipo_rendimiento: insumo.tipo_rendimiento || 'Directo',
      peso_prueba_crudo: insumo.peso_prueba_crudo || '',
      peso_prueba_limpio: insumo.peso_prueba_limpio || '',
      insumos_sustitutos: Array.isArray(insumo.insumos_sustitutos) ? insumo.insumos_sustitutos : [] // 👈 Aseguramos que cargue como Array
    });
    setUnidadPrueba(insumo.unidad_medida === 'KL' ? 'GR' : (insumo.unidad_medida === 'LT' ? 'ML' : insumo.unidad_medida));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicionInsumo = () => {
    setEditandoInsumoId(null);
    setNuevoInsumo({ 
      nombre: '', unidad_medida: 'KL', cantidad_presentacion: '', 
      costo_presentacion: '', es_empaque: false, tipo_rendimiento: 'Directo', 
      peso_prueba_crudo: '', peso_prueba_limpio: '', insumos_sustitutos: [] // 👈 Limpiamos el array
    });
  };

  const guardarInsumo = async (e) => {
    e.preventDefault();
    const url = editandoInsumoId ? `${apiUrl}/insumos/${editandoInsumoId}` : `${apiUrl}/insumos`;
    const method = editandoInsumoId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoInsumo)
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("Éxito", editandoInsumoId ? "Insumo actualizado." : "Insumo registrado correctamente.", "success");
        cancelarEdicionInsumo();
        refrescarDatos();
      } else {
        showAlert("Aviso", data.error || "No se pudo guardar.", "error");
      }
    } catch (error) {
      showAlert("Error", "Error de conexión al servidor.", "error");
    }
  };

  const eliminarInsumo = (id) => {
    showConfirm("¿Eliminar insumo?", "Asegúrate de que este insumo no esté siendo utilizado en ninguna receta antes de eliminarlo.", async () => {
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
        body: JSON.stringify({ paquetes_comprados: compraPaquetes, nuevo_costo_paquete: compraCosto, origen: 'Admin' })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("Stock Actualizado", `Se ha sumado el stock correctamente.`, "success");
        setModalCompra(null); setCompraPaquetes(''); setCompraCosto('');
        refrescarDatos();
      } else {
        showAlert("Aviso", data.error || "No se pudo registrar la compra.", "error");
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

  const procesarAuditoriaDirecta = async (e) => {
    e.preventDefault();
    if (!insumoAuditoria || cantidadAuditoria === '') return;

    let cantidadReal = parseFloat(cantidadAuditoria);
    if (isNaN(cantidadReal)) return;

    if (insumoAuditoria.unidad_medida === 'KL' && unidadAuditoria === 'GR') {
      cantidadReal = cantidadReal / 1000;
    } else if (insumoAuditoria.unidad_medida === 'LT' && unidadAuditoria === 'ML') {
      cantidadReal = cantidadReal / 1000;
    } else if (insumoAuditoria.unidad_medida === 'GR' && unidadAuditoria === 'KL') {
      cantidadReal = cantidadReal * 1000;
    } else if (insumoAuditoria.unidad_medida === 'ML' && unidadAuditoria === 'LT') {
      cantidadReal = cantidadReal * 1000;
    }

    try {
      const res = await fetch(`${apiUrl}/insumos/${insumoAuditoria.id}/stock-exacto`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_real: cantidadReal })
      });

      if (res.ok) {
        showAlert("Ajuste Exitoso", `El inventario de ${insumoAuditoria.nombre} ha sido actualizado a ${cantidadReal} ${insumoAuditoria.unidad_medida}.`, "success");
        setInsumoAuditoria(null);
        setCantidadAuditoria('');
        setBusquedaAuditoria('');
        refrescarDatos(); 
      } else {
        showAlert("Error", "No se pudo ajustar el inventario.", "error");
      }
    } catch(error) {
      showAlert("Error", "Problema de conexión al ajustar inventario.", "error");
    }
  };

  const getDisplayValue = (val) => {
    if (val === '' || val === null || val === undefined) return '';
    let num = parseFloat(val);
    if (isNaN(num)) return '';
    if (nuevoInsumo.unidad_medida === 'KL' && unidadPrueba === 'GR') return (num * 1000).toString();
    if (nuevoInsumo.unidad_medida === 'LT' && unidadPrueba === 'ML') return (num * 1000).toString();
    return num.toString();
  };

  const handleTestValueChange = (field, displayValue) => {
    if (displayValue === '') { setNuevoInsumo({...nuevoInsumo, [field]: ''}); return; }
    let num = parseFloat(displayValue);
    if (nuevoInsumo.unidad_medida === 'KL' && unidadPrueba === 'GR') num = num / 1000;
    if (nuevoInsumo.unidad_medida === 'LT' && unidadPrueba === 'ML') num = num / 1000;
    setNuevoInsumo({...nuevoInsumo, [field]: num});
  };

  // 👇 NUEVA FUNCIÓN: Agrega o quita insumos del Array de Respaldo
  const toggleSustituto = (id) => {
    const actuales = nuevoInsumo.insumos_sustitutos || [];
    if (actuales.includes(id)) {
        setNuevoInsumo({...nuevoInsumo, insumos_sustitutos: actuales.filter(x => x !== id)});
    } else {
        setNuevoInsumo({...nuevoInsumo, insumos_sustitutos: [...actuales, id]});
    }
  };

  const insumosCriticos = (insumosDB || []).filter(ins => (Number(ins.stock_actual) / Math.max(1, Number(ins.cantidad_presentacion))) < 1);
  const totalCalculadoModalCompra = (parseFloat(compraPaquetes) || 0) * (parseFloat(compraCosto) || 0);
  
  let porcentajeRendimientoCalculado = 100;
  if (nuevoInsumo.tipo_rendimiento !== 'Directo') {
    const pC = parseFloat(nuevoInsumo.peso_prueba_crudo) || 0;
    const pL = parseFloat(nuevoInsumo.peso_prueba_limpio) || 0;
    if (pC > 0) porcentajeRendimientoCalculado = (pL / pC) * 100;
  }

  const insumosFiltradosAuditoria = (insumosDB || []).filter(ins =>
    ins.nombre.toLowerCase().includes(busquedaAuditoria.toLowerCase())
  );

  // Filtrar lista de empaques para el Respaldo (Ocultando el insumo actual si estamos editando)
  const listaEmpaquesParaRespaldo = (insumosDB || []).filter(i => 
    (i.es_empaque === true || i.es_empaque === 'true') && i.id !== editandoInsumoId
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 relative">
      
      {/* ALERTA DE INSUMOS CRÍTICOS */}
      {insumosCriticos.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl flex flex-col md:flex-row items-start gap-4 shadow-sm animate-in fade-in">
          <AlertTriangle className="text-red-500 w-10 h-10 flex-shrink-0" />
          <div>
            <h4 className="text-red-700 font-black text-lg uppercase tracking-widest mb-1">¡Alerta de Inventario Crítico!</h4>
            <p className="text-red-600 font-bold text-sm leading-relaxed">
              Tienes insumos con menos de 1 paquete de existencia: <span className="font-black">{insumosCriticos.map(i => i.nombre).join(', ')}</span>
            </p>
          </div>
        </div>
      )}

      {/* FORMULARIO ALTA/EDICIÓN */}
      <form onSubmit={guardarInsumo} className="bg-white p-4 md:p-8 rounded-[30px] shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
          {editandoInsumoId ? <Edit className="text-blue-500"/> : <Package className="text-emerald-500"/>}
          {editandoInsumoId ? 'Editando Insumo' : 'Alta Rápida de Insumo / Empaque'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-1">Nombre Comercial</label>
            <input required type="text" placeholder="Ej. Azúcar Morena" value={nuevoInsumo.nombre} onChange={e => setNuevoInsumo({...nuevoInsumo, nombre: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-1">Unidad Mínima</label>
            <select value={nuevoInsumo.unidad_medida} onChange={e => setNuevoInsumo({...nuevoInsumo, unidad_medida: e.target.value})} className="w-full p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl outline-none font-black cursor-pointer">
              <option value="KL">Kilos (KL)</option>
              <option value="LT">Litros (LT)</option>
              <option value="GR">Gramos (GR)</option>
              <option value="ML">Mililitros (ML)</option>
              <option value="PZ">Piezas (PZ)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-1">Cant. Paquete</label>
            <input required type="number" step="any" placeholder="Ej. 1000" value={nuevoInsumo.cantidad_presentacion} onChange={e => setNuevoInsumo({...nuevoInsumo, cantidad_presentacion: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-center" />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-1">Costo Paquete ($)</label>
            <input required type="number" step="any" placeholder="Ej. 50.00" value={nuevoInsumo.costo_presentacion} onChange={e => setNuevoInsumo({...nuevoInsumo, costo_presentacion: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-slate-700 text-xl" />
          </div>
        </div>  
        
        {/* 👇 SECCIÓN DE EMPAQUE (CON MULTIPLES CHECKBOXES DE RESPALDO) */}
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mt-4 flex flex-col lg:flex-row gap-4 lg:items-start">
          <div className="lg:w-1/3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={nuevoInsumo.es_empaque} 
                onChange={e => {
                  const isChecked = e.target.checked;
                  setNuevoInsumo({
                    ...nuevoInsumo, 
                    es_empaque: isChecked, 
                    insumos_sustitutos: isChecked ? (nuevoInsumo.insumos_sustitutos || []) : [] 
                  });
                }} 
                className="w-5 h-5 accent-indigo-600" 
              />
              <span className="font-black text-indigo-800 flex items-center gap-2"><Box size={18}/> ¿Es un Empaque / Desechable?</span>
            </label>
            <p className="text-xs text-indigo-600/80 font-bold ml-8 mt-1">Márcalo si es un domo o vaso. Así aparecerá en las Recetas.</p>
          </div>

          {/* 👇 Panel Dinámico que solo aparece si es Empaque */}
          {nuevoInsumo.es_empaque && (
            <div className="w-full lg:w-2/3 bg-white p-4 rounded-xl border border-indigo-200 shadow-sm animate-in fade-in slide-in-from-left-4">
              <label className="block text-xs font-black text-indigo-600 uppercase mb-2 flex items-center gap-1">
                <CopyPlus size={14}/> Selecciona los Respaldos (Múltiples)
              </label>
              <p className="text-[10px] text-slate-500 mb-3 font-bold leading-tight">
                Si el stock llega a 0, el sistema descontará todos los empaques que marques aquí.
              </p>
              
              <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-lg p-2 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {listaEmpaquesParaRespaldo.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2 italic">No hay otros empaques registrados.</p>
                ) : (
                  listaEmpaquesParaRespaldo.map(emp => (
                    <label key={emp.id} className={`flex items-center gap-2 text-xs font-bold p-2 rounded-md cursor-pointer transition border ${nuevoInsumo.insumos_sustitutos?.includes(emp.id) ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      <input 
                        type="checkbox" 
                        className="accent-indigo-600 w-4 h-4"
                        checked={nuevoInsumo.insumos_sustitutos?.includes(emp.id)} 
                        onChange={() => toggleSustituto(emp.id)} 
                      />
                      <span className="truncate">{emp.nombre}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>  
        
        {!nuevoInsumo.es_empaque && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Percent size={16} className="text-amber-500"/> Factor de Rendimiento (Mermas)
            </h4>  
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Comportamiento del Producto</label>
                <select value={nuevoInsumo.tipo_rendimiento} onChange={e => setNuevoInsumo({...nuevoInsumo, tipo_rendimiento: e.target.value})} className="w-full p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl outline-none font-black text-center cursor-pointer">
                  <option value="Directo">1. Se usa directo (Rinde 100%)</option>
                  <option value="Merma">2. Tiene Merma (Se pela/limpia)</option>
                  <option value="Expansión">3. Se Expande (Ej. Arroz/Frijol)</option>
                </select>
              </div>  
              {nuevoInsumo.tipo_rendimiento !== 'Directo' && (
                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/30 p-4 rounded-2xl border border-amber-100">  
                  <div className="md:col-span-2 flex justify-between items-center bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-widest">¿En qué unidad pesaste la prueba?</label>
                    <select value={unidadPrueba} onChange={e => setUnidadPrueba(e.target.value)} className="bg-amber-100 text-amber-800 font-black px-4 py-2 rounded-lg outline-none cursor-pointer text-sm">
                      {nuevoInsumo.unidad_medida === 'KL' && <><option value="GR">Gramos (GR)</option><option value="KL">Kilos (KL)</option></>}
                      {nuevoInsumo.unidad_medida === 'LT' && <><option value="ML">Mililitros (ML)</option><option value="LT">Litros (LT)</option></>}
                      {(nuevoInsumo.unidad_medida === 'GR' || nuevoInsumo.unidad_medida === 'ML' || nuevoInsumo.unidad_medida === 'PZ') && <option value={nuevoInsumo.unidad_medida}>{nuevoInsumo.unidad_medida}</option>}
                    </select>
                  </div>  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pesaje (Crudo/Sucio) en {unidadPrueba}</label>
                    <input required type="number" step="any" placeholder={`Ej. ${unidadPrueba === 'GR' || unidadPrueba === 'ML' ? '400' : '0.4'}`} value={getDisplayValue(nuevoInsumo.peso_prueba_crudo)} onChange={e => handleTestValueChange('peso_prueba_crudo', e.target.value)} className="w-full p-4 bg-white border border-amber-200 rounded-xl outline-none font-bold text-center focus:ring-2 focus:ring-amber-500" />
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">Pesa 1 sola pieza tal cual se compró.</p>
                  </div>  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pesaje (Limpio/Cocido) en {unidadPrueba}</label>
                    <input required type="number" step="any" placeholder={`Ej. ${unidadPrueba === 'GR' || unidadPrueba === 'ML' ? '200' : '0.2'}`} value={getDisplayValue(nuevoInsumo.peso_prueba_limpio)} onChange={e => handleTestValueChange('peso_prueba_limpio', e.target.value)} className="w-full p-4 bg-white border border-amber-400 shadow-inner rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-black text-amber-700 text-center text-xl" />
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">Pésalo otra vez ya listo para cocinar.</p>
                  </div>
                </div>
              )}
            </div>  
            {nuevoInsumo.tipo_rendimiento !== 'Directo' && nuevoInsumo.peso_prueba_crudo && nuevoInsumo.peso_prueba_limpio && (
              <div className="mt-4 bg-slate-800 p-4 rounded-xl flex items-center justify-between text-white">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Rendimiento Real Calculado:</span>
                <span className={`text-2xl font-black ${porcentajeRendimientoCalculado < 100 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {porcentajeRendimientoCalculado.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}  
        <div className="pt-6 flex flex-col md:flex-row gap-4">
          {editandoInsumoId && (
            <button type="button" onClick={cancelarEdicionInsumo} className="w-full md:w-1/3 p-4 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition">Cancelar</button>
          )}
          <button type="submit" className={`flex-1 p-4 text-white rounded-xl font-black shadow-lg transition active:scale-95 ${editandoInsumoId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
            {editandoInsumoId ? 'Actualizar Registro' : 'Guardar en Inventario'}
          </button>
        </div>
      </form>

      {/* CATÁLOGO DE EXISTENCIAS Y TABLA */}
      <div className="bg-white p-4 md:p-8 rounded-[30px] shadow-sm border border-slate-200">
        
        {/* ENCABEZADO Y CONTROLES DE AUDITORÍA */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
          <h3 className="text-xl font-bold text-slate-800">Catálogo y Existencias</h3>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
            {!auditoriaActiva ? (
              <button onClick={solicitarInventario} className="flex-1 sm:flex-none bg-slate-800 text-white px-5 py-3 rounded-xl font-black flex justify-center items-center gap-2 hover:bg-slate-900 transition shadow-lg">
                <AlertTriangle size={18} className="text-yellow-400"/> Solicitar a Caja
              </button>
            ) : auditoriaActiva.estado === 'revision' ? (
              <button onClick={() => setModalRevision(true)} className="flex-1 sm:flex-none bg-emerald-600 animate-pulse text-white px-5 py-3 rounded-xl font-black flex justify-center items-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/40">
                <CheckCircle2 size={20} /> Revisar Inventario Terminado
              </button>
            ) : (
              <div className="flex-1 sm:flex-none bg-amber-100 text-amber-700 px-5 py-3 rounded-xl font-black flex justify-center items-center gap-2 cursor-wait border border-amber-200">
                <RotateCcw size={18} className="animate-spin"/> Caja contando...
              </div>
            )}

            <button onClick={() => setModalAuditoria(true)} className="flex-1 sm:flex-none bg-indigo-600 text-white px-5 py-3 rounded-xl font-black flex justify-center items-center gap-2 hover:bg-indigo-700 transition active:scale-95 shadow-lg shadow-indigo-500/30">
              <ClipboardList size={18} /> Ajuste Admin
            </button>
          </div>
        </div>

        {(insumosDB || []).length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
            <Package size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold text-lg">Aún no has registrado insumos.</p>
          </div>
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
                  if (stock_paquetes >= 3) colorClases = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                  else if (stock_paquetes >= 1) colorClases = 'bg-yellow-100 text-yellow-700 border-yellow-200';

                  return (
                    <tr key={ins.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-bold text-slate-800 text-base md:text-lg flex items-center gap-2">
                          {ins.nombre}
                          {ins.es_empaque && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-1"><Box size={10}/> Empaque</span>}
                          {ins.factor_rendimiento && Number(ins.factor_rendimiento) !== 1 && (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${Number(ins.factor_rendimiento) < 1 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {(Number(ins.factor_rendimiento) * 100).toFixed(0)}% RND
                            </span>
                          )}
                          {/* 👇 Etiqueta visual si tiene respaldos múltiples configurados */}
                          {ins.insumos_sustitutos && ins.insumos_sustitutos.length > 0 && (
                            <span title="Si se acaba, descuenta otros insumos" className="text-[10px] bg-blue-50 border border-blue-200 text-blue-600 px-2 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-1">
                              <CopyPlus size={10}/> Respaldo: {ins.insumos_sustitutos.length}
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
                        <button onClick={() => {setModalCompra(ins); setCompraCosto(ins.costo_presentacion);}} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-3 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2" title="Sumar inventario por compra"><ShoppingBag size={16}/> <span className="hidden md:inline">Comprar</span></button>
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

      {/* MODAL ORIGINAL DE COMPRA (SUMA) */}
      {modalCompra && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <form onSubmit={procesarCompraInsumo} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-blue-200">
            <h3 className="text-xl font-black text-slate-800 mb-2">Ingresar Stock (Suma)</h3>
            <p className="text-slate-500 font-medium mb-6">Insumo: <span className="font-bold text-blue-600">{modalCompra.nombre}</span> ({modalCompra.cantidad_presentacion} {modalCompra.unidad_medida})</p>
            <div className="space-y-4">
              <div><label className="block text-xs font-black text-slate-400 uppercase mb-1">Paquetes / Cajas Compradas</label><input autoFocus required type="number" step="any" value={compraPaquetes} onChange={e => setCompraPaquetes(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-xl text-center" placeholder="Ej. 2" /></div>
              <div><label className="block text-xs font-black text-slate-400 uppercase mb-1">Costo Nuevo del Paquete ($)</label><input required type="number" step="any" value={compraCosto} onChange={e => setCompraCosto(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-xl text-center text-slate-700" /></div>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mt-4 text-right">
              <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Costo Total Compra</p>
              <p className="text-3xl font-black text-blue-700">${totalCalculadoModalCompra.toFixed(2)}</p>
            </div>  
            <div className="pt-6 flex gap-4">
              <button type="button" onClick={() => setModalCompra(null)} className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition">Cancelar</button>
              <button type="submit" className="flex-1 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-500/30 transition">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL INMERSIVO: Auditoría y Ajuste Rápido (Uso Admin) */}
      {modalAuditoria && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-[30px] p-6 max-w-4xl w-full shadow-2xl flex flex-col md:flex-row gap-6 h-[85vh] max-h-[700px] relative overflow-hidden">
            
            <div className="flex-1 flex flex-col border-r-0 md:border-r border-slate-100 pr-0 md:pr-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <ClipboardList className="text-indigo-600"/> Ajuste Rápido
                </h3>
                <button onClick={() => setModalAuditoria(false)} className="md:hidden text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={20}/></button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                  type="text" placeholder="Buscar insumo..." 
                  value={busquedaAuditoria} onChange={e => setBusquedaAuditoria(e.target.value)} 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700" 
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {insumosFiltradosAuditoria.length === 0 ? (
                  <p className="text-center text-slate-400 font-bold text-sm mt-10">No se encontraron insumos.</p>
                ) : (
                  insumosFiltradosAuditoria.map(ins => (
                    <button 
                      key={ins.id} 
                      onClick={() => { setInsumoAuditoria(ins); setUnidadAuditoria(ins.unidad_medida === 'KL' ? 'GR' : (ins.unidad_medida === 'LT' ? 'ML' : ins.unidad_medida)); setCantidadAuditoria(''); }} 
                      className={`w-full text-left p-4 rounded-2xl transition border ${insumoAuditoria?.id === ins.id ? 'bg-indigo-600 border-indigo-700 shadow-lg shadow-indigo-500/30 text-white' : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-slate-800'}`}
                    >
                      <p className="font-bold text-base md:text-lg">{ins.nombre}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${insumoAuditoria?.id === ins.id ? 'text-indigo-200' : 'text-slate-400'}`}>Actual en Sistema: {Number(ins.stock_actual).toFixed(2)} {ins.unidad_medida}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center relative bg-slate-50 rounded-2xl p-6 md:bg-transparent md:p-0">
              <button onClick={() => setModalAuditoria(false)} className="hidden md:block absolute -top-2 -right-2 text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition"><X size={20}/></button>
              
              {!insumoAuditoria ? (
                <div className="text-center text-slate-400 space-y-4">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto"><Box size={40} className="text-slate-300"/></div>
                  <p className="font-bold text-lg max-w-xs mx-auto">Selecciona un insumo de la lista para actualizar su cantidad exacta.</p>
                </div>
              ) : (
                <form onSubmit={procesarAuditoriaDirecta} className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="text-center bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                    <h4 className="text-3xl font-black text-slate-800 mb-2">{insumoAuditoria.nombre}</h4>
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-xs font-black rounded-lg uppercase tracking-widest">En Sistema: {Number(insumoAuditoria.stock_actual).toFixed(2)} {insumoAuditoria.unidad_medida}</span>
                  </div>

                  <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 space-y-4">
                    <label className="block text-sm font-black text-indigo-800 uppercase tracking-widest text-center">¿Cuánto tienes físicamente?</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input autoFocus required type="number" step="any" value={cantidadAuditoria} onChange={e => setCantidadAuditoria(e.target.value)} placeholder="Ej. 750" className="flex-1 p-5 bg-white border-2 border-indigo-200 focus:border-indigo-600 rounded-2xl outline-none font-black text-3xl text-center text-slate-800 shadow-inner" />
                      <select value={unidadAuditoria} onChange={e => setUnidadAuditoria(e.target.value)} className="sm:w-1/3 p-5 bg-indigo-600 text-white border-2 border-indigo-600 rounded-2xl outline-none font-black text-lg cursor-pointer text-center appearance-none">
                        {insumoAuditoria.unidad_medida === 'KL' && <><option value="GR">Gramos</option><option value="KL">Kilos</option></>}
                        {insumoAuditoria.unidad_medida === 'LT' && <><option value="ML">MiliLitros</option><option value="LT">Litros</option></>}
                        {insumoAuditoria.unidad_medida !== 'KL' && insumoAuditoria.unidad_medida !== 'LT' && <option value={insumoAuditoria.unidad_medida}>{insumoAuditoria.unidad_medida}</option>}
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/30 transition active:scale-95 text-xl flex items-center justify-center gap-2">
                    <ClipboardList size={24} /> Fijar Inventario Exacto
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REVISIÓN DE AUDITORÍA (Caja envió a revisar) */}
      {modalRevision && auditoriaActiva && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in">
          <div className="bg-white rounded-[30px] p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] flex flex-col relative overflow-hidden">
            <button onClick={() => setModalRevision(false)} className="absolute top-6 right-6 text-slate-400 hover:bg-slate-100 p-2 rounded-full transition"><X size={24}/></button>

            <h3 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500"/> Revisión de Inventario (Por Caja)
            </h3>
            <p className="text-slate-500 font-bold mb-6 pr-8">Revisa las cantidades que contaron en Caja. Si autorizas, estas cantidades reemplazarán al inventario actual.</p>
            
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl p-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 text-xs uppercase font-black sticky top-0">
                    <th className="p-4">Insumo</th>
                    <th className="p-4 text-center text-slate-400">Stock Sistema</th>
                    <th className="p-4 text-center text-emerald-600 bg-emerald-50">Stock Físico (Caja)</th>
                  </tr>
                </thead>
                <tbody>
                  {insumosDB.filter(ins => auditoriaActiva.datos[ins.id] !== undefined).map(ins => {
                    const conteoCaja = parseFloat(auditoriaActiva.datos[ins.id] || 0);
                    const dif = conteoCaja - parseFloat(ins.stock_actual);
                    return (
                      <tr key={ins.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-700">{ins.nombre}</td>
                        <td className="p-4 text-center font-bold text-slate-400">{Number(ins.stock_actual).toFixed(2)} {ins.unidad_medida}</td>
                        <td className="p-4 text-center bg-emerald-50/50">
                          <span className="text-lg font-black text-emerald-700">{conteoCaja.toFixed(2)} {ins.unidad_medida}</span>
                          {dif !== 0 && (
                            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${dif > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                              {dif > 0 ? '+' : ''}{dif.toFixed(2)} de diferencia
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4 mt-6 pt-6 border-t border-slate-100">
              <button onClick={() => resolverInventario('rechazar')} className="flex-1 py-4 bg-red-50 text-red-600 font-black rounded-xl hover:bg-red-100 transition border border-red-200">
                Rechazar (Devolver a Caja)
              </button>
              <button onClick={() => resolverInventario('aprobar')} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition active:scale-95 text-lg">
                ✅ Autorizar y Actualizar Stock
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestorInsumos;