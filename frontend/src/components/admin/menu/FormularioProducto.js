import React, { useState, useEffect } from 'react';
import { XCircle, Star, ListChecks, Trash2 } from 'lucide-react';  

const FormularioProducto = ({
  productos, clasificaciones, catalogoIngredientes, EMOJIS_POR_GIRO,
  apiUrl, refrescarDatos, showAlert,
  categoriaSelect, setCategoriaSelect,
  productoEditando, setProductoEditando
}) => {  
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [tiempoPreparacion, setTiempoPreparacion] = useState(15);
  const [emoji, setEmoji] = useState('🍽️');
  const [imagenBlob, setImagenBlob] = useState(null);
  
  // Ingredientes Base
  const [checkedIngredientes, setCheckedIngredientes] = useState([]);  

  const [disponible, setDisponible] = useState(true);
  const [generaPuntos, setGeneraPuntos] = useState(true);  

  const [aplicaTamanos, setAplicaTamanos] = useState(false);
  const [tamanos, setTamanos] = useState({
    chico: { activo: false, extra: 0 },
    mediano: { activo: false, extra: 15 },
    grande: { activo: false, extra: 25 },
    jumbo: { activo: false, extra: 40 }
  });  

  const [aplicaSabores, setAplicaSabores] = useState(false);
  const [listaSabores, setListaSabores] = useState([{ nombre: '', extra: 0 }]);  

  // 👇 NUEVO ESTADO: Grupos Obligatorios de Ingredientes
  const [gruposObligatorios, setGruposObligatorios] = useState([]);

  const ingredientesParaClasifActiva = (catalogoIngredientes || []).filter(i => Number(i.clasificacion_id) === Number(categoriaSelect));  

  // Helpers Sabores
  const agregarSabor = () => setListaSabores([...listaSabores, { nombre: '', extra: 0 }]);
  const removerSabor = (index) => setListaSabores(listaSabores.filter((_, i) => i !== index));
  const actualizarSabor = (index, campo, valor) => {
    const nuevosSabores = [...listaSabores];
    nuevosSabores[index][campo] = valor;
    setListaSabores(nuevosSabores);
  };  

  // 👇 Helpers Grupos Obligatorios
  const agregarGrupo = () => setGruposObligatorios([...gruposObligatorios, { nombreGrupo: '', ingredientesAgregados: [] }]);
  const eliminarGrupo = (index) => setGruposObligatorios(gruposObligatorios.filter((_, i) => i !== index));
  const actualizarNombreGrupo = (index, valor) => {
    const copia = [...gruposObligatorios];
    copia[index].nombreGrupo = valor;
    setGruposObligatorios(copia);
  };
  const toggleIngredienteGrupo = (gIndex, ingId, checked) => {
    const copia = [...gruposObligatorios];
    if (checked) {
      copia[gIndex].ingredientesAgregados.push(Number(ingId));
    } else {
      copia[gIndex].ingredientesAgregados = copia[gIndex].ingredientesAgregados.filter(id => id !== Number(ingId));
    }
    setGruposObligatorios(copia);
  };

  const limpiarFormularioMenu = () => {
    setProductoEditando(null);
    setNombre(''); setDescripcion(''); setPrecio(''); setTiempoPreparacion(15); setEmoji('🍽️');
    setImagenBlob(null); setDisponible(true); setGeneraPuntos(true);
    
    setAplicaTamanos(false); 
    setTamanos({ 
      chico: { activo: false, extra: 0 }, 
      mediano: { activo: false, extra: 15 }, 
      grande: { activo: false, extra: 25 },
      jumbo: { activo: false, extra: 40 }
    });
    
    setAplicaSabores(false); setListaSabores([{ nombre: '', extra: 0 }]);
    setCheckedIngredientes([]);
    setGruposObligatorios([]); // 👇 Limpiamos los grupos obligatorios
    
    const fileInput = document.getElementById('imagen-producto-upload');
    if (fileInput) fileInput.value = '';
  };  

  // Cargar datos cuando se recibe un producto a editar
  useEffect(() => {
    if (productoEditando) {
      const p = productoEditando;
      setNombre(p.nombre); 
      setDescripcion(p.descripcion || ''); 
      setEmoji(p.emoji || '🍽️'); 
      setTiempoPreparacion(p.tiempo_preparacion || 15); 
      setImagenBlob(null);
      
      const clasifEncontrada = clasificaciones.find(c => c.nombre === p.categoria); 
      const catId = clasifEncontrada ? clasifEncontrada.id : '';
      setCategoriaSelect(catId);
      
      setDisponible(p.disponible !== false);
      setGeneraPuntos(p.genera_puntos === false || p.genera_puntos === 'false' ? false : true);  
      
      let tieneTamanos = false;
      let tieneSabores = false;
      const tempSabores = [];
      const loadedGruposMap = new Map(); // Para parsear los Grupos Obligatorios
      
      const newTamanos = { 
        chico: { activo: false, extra: 0 }, 
        mediano: { activo: false, extra: 0 }, 
        grande: { activo: false, extra: 0 },
        jumbo: { activo: false, extra: 0 }
      };
      
      const newChecksSet = new Set();  

      (p.opciones || []).forEach(o => {
        if (o.categoria === 'Tamaño') {
          tieneTamanos = true;
          const key = String(o.nombre).toLowerCase();
          if (newTamanos[key] !== undefined) { newTamanos[key].activo = true; newTamanos[key].extra = o.precioExtra; }
        } else if (o.tipo === 'variacion' && o.categoria !== 'Tamaño') {
          tieneSabores = true;
          tempSabores.push({ nombre: o.nombre, extra: o.precioExtra });
        } else if (o.tipo === 'grupo_obligatorio') {
          // 👇 Cargar los ingredientes en sus respectivos grupos obligatorios
          if (!loadedGruposMap.has(o.categoria)) {
            loadedGruposMap.set(o.categoria, { nombreGrupo: o.categoria, ingredientesAgregados: [] });
          }
          const catItem = catalogoIngredientes.find(ci => 
            String(ci.nombre).trim().toLowerCase() === String(o.nombre).trim().toLowerCase() && 
            Number(ci.clasificacion_id) === Number(catId)
          );
          if (catItem) loadedGruposMap.get(o.categoria).ingredientesAgregados.push(Number(catItem.id));
        } else {
          // Ingredientes Base
          const catItem = catalogoIngredientes.find(ci => 
            String(ci.nombre).trim().toLowerCase() === String(o.nombre).trim().toLowerCase() && 
            Number(ci.clasificacion_id) === Number(catId)
          );
          if (catItem) newChecksSet.add(Number(catItem.id));
        }
      });  

      setAplicaTamanos(tieneTamanos);
      setTamanos(newTamanos);
      setAplicaSabores(tieneSabores);
      setListaSabores(tempSabores.length > 0 ? tempSabores : [{ nombre: '', extra: 0 }]);
      setGruposObligatorios(Array.from(loadedGruposMap.values())); // Llenar estado de grupos
      setCheckedIngredientes(Array.from(newChecksSet)); 
      setPrecio(p.precio_base);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoEditando, clasificaciones, catalogoIngredientes]);  

  const guardarProducto = async (e) => {
    e.preventDefault();
    if (!categoriaSelect) return showAlert("Atención", "Selecciona clasificación.", "info");  
    
    const editandoId = productoEditando ? productoEditando.id : null;
    const nombreCategoria = clasificaciones.find(c => Number(c.id) === Number(categoriaSelect))?.nombre || 'General';

    const duplicado = productos.find(p => 
      p.nombre.trim().toLowerCase() === nombre.trim().toLowerCase() && 
      p.categoria === nombreCategoria &&
      p.id !== editandoId
    );
    if (duplicado) return showAlert("Atención", `Ya existe un platillo llamado "${nombre}" dentro de la clasificación "${nombreCategoria}".`, "warning");  
    
    const opcionesArmadas = [];  
    
    // Tamaños
    if (aplicaTamanos) {
      if (tamanos.chico.activo) opcionesArmadas.push({ nombre: 'Chico', precioExtra: tamanos.chico.extra, tipo: 'variacion', category: 'Tamaño', categoria: 'Tamaño' });
      if (tamanos.mediano.activo) opcionesArmadas.push({ nombre: 'Mediano', precioExtra: tamanos.mediano.extra, tipo: 'variacion', category: 'Tamaño', categoria: 'Tamaño' });
      if (tamanos.grande.activo) opcionesArmadas.push({ nombre: 'Grande', precioExtra: tamanos.grande.extra, tipo: 'variacion', category: 'Tamaño', categoria: 'Tamaño' });
      if (tamanos.jumbo.activo) opcionesArmadas.push({ nombre: 'Jumbo', precioExtra: tamanos.jumbo.extra, tipo: 'variacion', category: 'Tamaño', categoria: 'Tamaño' });
    }  
    
    // Sabores Libres
    if (aplicaSabores) {
      listaSabores.forEach(sabor => {
        if (sabor.nombre.trim() !== '') {
          opcionesArmadas.push({ nombre: sabor.nombre.trim(), precioExtra: Number(sabor.extra || 0), tipo: 'variacion', categoria: 'Sabor' });
        }
      });
    }  

    // 👇 Inyectar Grupos Obligatorios
    gruposObligatorios.forEach(grupo => {
      if (grupo.nombreGrupo.trim() !== '' && grupo.ingredientesAgregados.length > 0) {
        grupo.ingredientesAgregados.forEach(id => {
          const ing = catalogoIngredientes.find(i => Number(i.id) === Number(id));
          if (ing) {
            opcionesArmadas.push({
              nombre: ing.nombre,
              precioExtra: Number(ing.precio_extra || 0),
              tipo: 'grupo_obligatorio',
              categoria: grupo.nombreGrupo.trim()
            });
          }
        });
      }
    });
    
    // Ingredientes Base
    const uniqueCheckedIds = [...new Set(checkedIngredientes.map(Number))];
    uniqueCheckedIds.forEach(id => {
      const ing = catalogoIngredientes.find(i => Number(i.id) === id);
      if (ing) {
        opcionesArmadas.push({ 
          nombre: ing.nombre, 
          precioExtra: Number(ing.precio_extra || 0), 
          tipo: ing.tipo || 'base' 
        });
      }
    });  
    
    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('descripcion', descripcion);
    formData.append('precio_base', (aplicaTamanos || aplicaSabores) && (!precio) ? 0 : precio);
    formData.append('tiempo_preparacion', tiempoPreparacion);
    formData.append('emoji', emoji);
    formData.append('categoria', nombreCategoria);
    formData.append('opciones', JSON.stringify(opcionesArmadas));
    formData.append('disponible', disponible);
    formData.append('genera_puntos', generaPuntos);
    if (imagenBlob) {
      formData.append('imagen', imagenBlob);
    }

    try {
      let res;
      if (productoEditando) {
        res = await fetch(`${apiUrl}/productos/${productoEditando.id}`, { method: 'PUT', body: formData });
      } else {
        res = await fetch(`${apiUrl}/productos`, { method: 'POST', body: formData });
      }
      if (res.ok) {
        showAlert("Éxito", productoEditando ? "Platillo actualizado correctamente." : "Platillo creado exitosamente.", "success");
        limpiarFormularioMenu();
        refrescarDatos();
      } else {
        const errData = await res.json();
        showAlert("Error", errData.error || "Error al procesar la solicitud.", "error");
      }
    } catch (error) {
      showAlert("Error", "Error de red al conectar con el servidor.", "error");
    }
  };

  const handleIngredienteChange = (id, checked) => {
    if (checked) {
      setCheckedIngredientes([...checkedIngredientes, id]);
    } else {
      setCheckedIngredientes(checkedIngredientes.filter(i => i !== id));
    }
  };

  // 👇 Magia para evitar duplicidades visuales: 
  // Obtenemos los IDs de todos los ingredientes que ya metimos en algún Grupo Obligatorio.
  const idsEnGrupos = new Set(gruposObligatorios.flatMap(g => g.ingredientesAgregados).map(Number));

  return (
    <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-100 max-w-4xl mx-auto animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        <div className="bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-2xl text-2xl shadow-md">
          {productoEditando ? '📝' : '✨'}
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-800">{productoEditando ? `Editando: ${productoEditando.nombre}` : 'Crear Nuevo Platillo'}</h3>
          <p className="text-sm font-bold text-slate-400">Completa la ficha técnica para dar de alta un producto en el menú.</p>
        </div>
      </div>

      <form onSubmit={guardarProducto} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Clasificación / Categoría de Menú</label>
            <select value={categoriaSelect} onChange={e => { limpiarFormularioMenu(); setCategoriaSelect(e.target.value); }} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl p-4 outline-none focus:border-blue-500 transition-all cursor-pointer">
              <option value="">-- Selecciona a dónde pertenece --</option>
              {clasificaciones.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.nombre} ({c.destino})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Icono / Emoji</label>
            <select value={emoji} onChange={e => setEmoji(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl p-4 outline-none focus:border-blue-500 transition-all cursor-pointer text-center text-xl">
              {Object.keys(EMOJIS_POR_GIRO).flatMap(k => EMOJIS_POR_GIRO[k]).map((em, idx) => (
                <option key={idx} value={em}>{em}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre del Platillo / Bebida</label>
            <input type="text" required placeholder="Ej. Latte Vainilla, Sushi Filadelfia" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl p-4 outline-none focus:border-blue-500 transition-all placeholder-slate-300" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Precio Base ($)</label>
            <input type="number" step="0.01" disabled={aplicaTamanos} placeholder={aplicaTamanos ? "Fijado por Tamaños" : "0.00"} required={!aplicaTamanos} value={precio} onChange={e => setPrecio(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl p-4 outline-none focus:border-blue-500 transition-all placeholder-slate-300 disabled:opacity-50 disabled:bg-slate-100" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Descripción Corta / Ingredientes base generales</label>
            <input type="text" placeholder="Ej. Espresso con leche vaporizada y jarabe gourmet de vainilla." value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl p-4 outline-none focus:border-blue-500 transition-all placeholder-slate-300" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">⏱️ Tiempo Prep (Mins)</label>
            <input type="number" required min="1" placeholder="15" value={tiempoPreparacion} onChange={e => setTiempoPreparacion(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl p-4 outline-none focus:border-blue-500 transition-all" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-5 rounded-3xl border transition-all ${disponible ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
             <label className="flex items-center gap-3 cursor-pointer text-lg font-bold text-slate-700">
               <input type="checkbox" checked={disponible} onChange={e=>setDisponible(e.target.checked)} className="w-6 h-6 accent-emerald-500" />
               ✅ Disponible para Venta
             </label>
          </div>
          <div className={`p-5 rounded-3xl border transition-all ${generaPuntos ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
             <label className="flex items-center gap-3 cursor-pointer text-lg font-bold text-indigo-900">
               <input type="checkbox" checked={generaPuntos} onChange={e=>setGeneraPuntos(e.target.checked)} className="w-6 h-6 accent-indigo-600" />
               <Star size={24} className="fill-indigo-600"/> Genera Puntos
             </label>
          </div>
        </div>

        {/* CONTROLES DE TAMAÑOS Y SABORES */}
        <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
          <label className="flex items-center gap-3 font-bold text-blue-900 cursor-pointer text-lg">
            <input type="checkbox" checked={aplicaTamanos} onChange={e => setAplicaTamanos(e.target.checked)} className="w-6 h-6 accent-blue-600" /> ¿Aplica Tamaños Fijos? (Chico/Med/Gde/Jumbo)
          </label>
          {aplicaTamanos && (
            <div className="space-y-3 mt-4 bg-white p-5 rounded-2xl border border-slate-200">
              {['chico', 'mediano', 'grande', 'jumbo'].map(t => (
                <div key={t} className="flex items-center gap-4">
                  <label className="flex items-center gap-3 text-lg w-32 capitalize cursor-pointer font-medium">
                    <input type="checkbox" checked={tamanos[t].activo} onChange={e => setTamanos({...tamanos, [t]: {...tamanos[t], activo: e.target.checked}})} className="w-5 h-5 accent-blue-600"/> {t}
                  </label>
                  <input type="number" placeholder="Precio Extra $" disabled={!tamanos[t].activo} value={tamanos[t].extra} onChange={e => setTamanos({...tamanos, [t]: {...tamanos[t], extra: Number(e.target.value)}})} className="w-32 p-3 font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
                </div>
              ))}
            </div>
          )}
        </div>  
        
        <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
          <label className="flex items-center gap-3 font-bold text-blue-900 cursor-pointer mb-4 text-lg">
            <input type="checkbox" checked={aplicaSabores} onChange={e => setAplicaSabores(e.target.checked)} className="w-6 h-6 accent-blue-600" /> ¿Lleva Sabores Libres? (Ej. Papas Gajo)
          </label>  
          {aplicaSabores && (
            <div className="mt-4 bg-white p-5 rounded-2xl border border-blue-200 space-y-4">
              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Opciones disponibles</label>
                {listaSabores.map((sabor, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input type="text" placeholder="Sabor (Ej. Búfalo)" required={aplicaSabores} value={sabor.nombre} onChange={e => actualizarSabor(index, 'nombre', e.target.value)} className="flex-1 p-3 font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
                    <input type="number" placeholder="Precio $" value={sabor.extra} onChange={e => actualizarSabor(index, 'extra', e.target.value)} className="w-28 p-3 font-bold border border-slate-200 rounded-xl outline-none focus:border-blue-500" />
                    {listaSabores.length > 1 && (
                      <button type="button" onClick={() => removerSabor(index)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"><XCircle size={20}/></button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={agregarSabor} className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-sm transition-all flex items-center gap-2">+ Agregar otra opción</button>
            </div>
          )}
        </div>  

        {categoriaSelect && ingredientesParaClasifActiva.length > 0 && (
          <>
            {/* 👇 SECCIÓN DE GRUPOS OBLIGATORIOS (La Magia Nueva) */}
            <div className="bg-purple-50/40 p-6 rounded-3xl border border-purple-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <label className="font-black text-purple-900 text-lg flex items-center gap-2">
                    <ListChecks size={20}/> Grupos de Selección Obligatoria
                  </label>
                  <p className="text-xs font-bold text-purple-600 mt-1">Fuerza al cliente a elegir una opción (Ej. "Tipo de Leche").</p>
                </div>
                <button type="button" onClick={agregarGrupo} className="text-purple-700 bg-purple-100 hover:bg-purple-200 px-4 py-3 rounded-xl font-black text-sm transition whitespace-nowrap shadow-sm active:scale-95">
                  + Crear Grupo
                </button>
              </div>

              {gruposObligatorios.length === 0 ? (
                <div className="text-center p-6 bg-white rounded-2xl border border-dashed border-purple-200">
                  <p className="text-sm font-bold text-purple-300">Aún no hay grupos creados para este platillo.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gruposObligatorios.map((grupo, gIndex) => (
                    <div key={gIndex} className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm animate-in fade-in">
                      <div className="flex gap-3 mb-4">
                        <input type="text" required placeholder="Nombre del Grupo (Ej. Elige tu Leche)" value={grupo.nombreGrupo} onChange={e => actualizarNombreGrupo(gIndex, e.target.value)} className="flex-1 p-3 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-purple-500 bg-slate-50" />
                        <button type="button" onClick={() => eliminarGrupo(gIndex)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"><Trash2 size={20}/></button>
                      </div>
                      
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Ingredientes pertenecientes a este grupo</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {ingredientesParaClasifActiva.map(ing => {
                            // Si el ingrediente está en OTRO grupo, no lo mostramos aquí para evitar confusiones
                            const estaEnEsteGrupo = grupo.ingredientesAgregados.includes(ing.id);
                            const estaEnOtroGrupo = idsEnGrupos.has(ing.id) && !estaEnEsteGrupo;
                            if (estaEnOtroGrupo) return null;

                            return (
                              <label key={ing.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition select-none ${estaEnEsteGrupo ? 'bg-purple-100 border-purple-400 text-purple-800 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-600 font-medium hover:border-slate-300'}`}>
                                <input type="checkbox" checked={estaEnEsteGrupo} onChange={e => toggleIngredienteGrupo(gIndex, ing.id, e.target.checked)} className="accent-purple-600 w-4 h-4 rounded"/>
                                <span className="text-sm truncate" title={ing.nombre}>{ing.nombre} {ing.precio_extra > 0 ? `(+$${ing.precio_extra})` : ''}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN TRADICIONAL DE INGREDIENTES BASE */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Ingredientes Base (Modificables Con/Sin)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {ingredientesParaClasifActiva.map(ing => {
                  // 👇 Magia: Si el ingrediente ya fue asignado a un grupo obligatorio, lo ocultamos de aquí.
                  if (idsEnGrupos.has(ing.id)) return null;

                  return (
                    <label key={ing.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-pointer select-none ${checkedIngredientes.includes(ing.id) ? 'bg-white border-blue-500 shadow-sm text-blue-900 font-bold' : 'bg-white/50 border-slate-200 text-slate-600 font-medium hover:bg-white'}`}>
                      <input type="checkbox" checked={checkedIngredientes.includes(ing.id)} onChange={e => handleIngredienteChange(ing.id, e.target.checked)} className="w-5 h-5 accent-blue-600" />
                      <span className="text-sm">{ing.nombre}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}  

        <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition cursor-pointer">
          <label className="text-base font-bold text-slate-600 block mb-3">Sube una Foto Atractiva (Max 10MB)</label>
          <input id="imagen-producto-upload" type="file" accept="image/png, image/jpeg" onChange={e => setImagenBlob(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer" />
        </div>  

        <div className="flex gap-4 pt-4 border-t border-slate-100">
          {productoEditando && (
            <button type="button" onClick={limpiarFormularioMenu} className="p-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar Edición</button>
          )}
          <button type="submit" className={`flex-1 p-5 rounded-2xl font-black text-white text-xl shadow-lg transition active:scale-95 ${productoEditando ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}>
            {productoEditando ? '💾 Guardar Cambios del Platillo' : '➕ Dar de Alta Platillo'}
          </button>
        </div>

      </form>
    </div>
  );
};  

export default FormularioProducto;