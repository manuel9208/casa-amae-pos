import React, { useState } from 'react';
import { Edit, Plus, Trash2, XCircle } from 'lucide-react';

const GestionMenu = ({
  // Props inyectadas por el AdminPanel
  productos, clasificaciones, catalogoIngredientes, EMOJIS_POR_GIRO, 
  baseUrl, apiUrl, refrescarDatos, showAlert, showConfirm
}) => {
  
  // === ESTADOS LOCALES DEL FORMULARIO ===
  const [editandoId, setEditandoId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState(''); 
  const [precio, setPrecio] = useState('');
  const [tiempoPreparacion, setTiempoPreparacion] = useState(15);
  const [emoji, setEmoji] = useState('🍽️'); 
  const [categoriaSelect, setCategoriaSelect] = useState(''); 
  const [imagenBlob, setImagenBlob] = useState(null);
  const [checkedIngredientes, setCheckedIngredientes] = useState([]);
  
  // 👇 NUEVO ESTADO PARA HABILITAR/DESHABILITAR PLATILLOS
  const [disponible, setDisponible] = useState(true);
  
  // Estados para Tamaños
  const [aplicaTamanos, setAplicaTamanos] = useState(false);
  const [tamanos, setTamanos] = useState({ 
    chico: { activo: false, extra: 0 }, 
    mediano: { activo: false, extra: 15 }, 
    grande: { activo: false, extra: 25 } 
  });
  
  // Estados para Sabores
  const [aplicaSabores, setAplicaSabores] = useState(false);
  const [listaSabores, setListaSabores] = useState([{ nombre: '', extra: 0 }]);

  // === CÁLCULOS VISUALES ===
  const ingredientesParaClasifActiva = (catalogoIngredientes || []).filter(i => Number(i.clasificacion_id) === Number(categoriaSelect));
  const nombreCategoriaSeleccionada = (clasificaciones || []).find(c => Number(c.id) === Number(categoriaSelect))?.nombre;
  const productosEnCategoria = (productos || []).filter(p => p.categoria === nombreCategoriaSeleccionada);

  // === FUNCIONES AUXILIARES DE SABORES ===
  const agregarSabor = () => setListaSabores([...listaSabores, { nombre: '', extra: 0 }]);
  const removerSabor = (index) => setListaSabores(listaSabores.filter((_, i) => i !== index));
  const actualizarSabor = (index, campo, valor) => {
    const nuevosSabores = [...listaSabores];
    nuevosSabores[index][campo] = valor;
    setListaSabores(nuevosSabores);
  };

  // === LÓGICA DE LIMPIEZA ===
  const limpiarFormularioMenu = () => { 
    setEditandoId(null); setNombre(''); setDescripcion(''); setPrecio(''); setTiempoPreparacion(15); setEmoji('🍽️'); 
    setImagenBlob(null); 
    setDisponible(true); // Restablecemos a disponible por defecto
    setAplicaTamanos(false); setTamanos({ chico: { activo: false, extra: 0 }, mediano: { activo: false, extra: 15 }, grande: { activo: false, extra: 25 } }); 
    setAplicaSabores(false); setListaSabores([{ nombre: '', extra: 0 }]);
    setCheckedIngredientes([]); 
    const fileInput = document.getElementById('imagen-producto-upload');
    if (fileInput) fileInput.value = '';
  };

  // === LÓGICA DE GUARDADO ===
  const guardarProducto = async (e) => {
    e.preventDefault(); 
    if (!categoriaSelect) return showAlert("Atención", "Selecciona clasificación.", "info");
    
    const duplicado = productos.find(p => p.nombre.trim().toLowerCase() === nombre.trim().toLowerCase() && p.id !== editandoId);
    if (duplicado) return showAlert("Atención", "Ya existe un platillo con ese nombre.", "warning");
    
    const opcionesArmadas = [];
    
    if (aplicaTamanos) { 
      if (tamanos.chico.activo) opcionesArmadas.push({ nombre: 'Chico', precioExtra: tamanos.chico.extra, tipo: 'variacion', categoria: 'Tamaño' }); 
      if (tamanos.mediano.activo) opcionesArmadas.push({ nombre: 'Mediano', precioExtra: tamanos.mediano.extra, tipo: 'variacion', categoria: 'Tamaño' }); 
      if (tamanos.grande.activo) opcionesArmadas.push({ nombre: 'Grande', precioExtra: tamanos.grande.extra, tipo: 'variacion', categoria: 'Tamaño' }); 
    }

    if (aplicaSabores) {
      listaSabores.forEach(sabor => {
        if (sabor.nombre.trim() !== '') {
          opcionesArmadas.push({ nombre: sabor.nombre.trim(), precioExtra: Number(sabor.extra || 0), tipo: 'variacion', categoria: 'Sabor' });
        }
      });
    }
    
    checkedIngredientes.forEach(id => { 
      const ing = catalogoIngredientes.find(i => Number(i.id) === Number(id)); 
      if (ing) opcionesArmadas.push({ nombre: ing.nombre, precioExtra: Number(ing.precio_extra), tipo: ing.tipo }); 
    });
    
    const nombreCategoria = clasificaciones.find(c => Number(c.id) === Number(categoriaSelect))?.nombre || 'General';
    const formData = new FormData(); 
    formData.append('nombre', nombre); 
    formData.append('descripcion', descripcion); 
    formData.append('precio_base', (aplicaTamanos || aplicaSabores) && (!precio) ? 0 : precio); 
    formData.append('tiempo_preparacion', tiempoPreparacion); 
    formData.append('emoji', emoji); 
    formData.append('categoria', nombreCategoria); 
    formData.append('opciones', JSON.stringify(opcionesArmadas)); 
    formData.append('disponible', disponible); // 👇 Enviamos el estado de disponibilidad al servidor
    if (imagenBlob) formData.append('imagen', imagenBlob);
    
    try { 
      const url = editandoId ? `${apiUrl}/productos/${editandoId}` : `${apiUrl}/productos`; 
      const res = await fetch(url, { method: editandoId ? 'PUT' : 'POST', body: formData }); 
      if (res.ok) { 
        limpiarFormularioMenu(); 
        refrescarDatos(); 
        showAlert("¡Éxito!", "Producto guardado correctamente.", "success"); 
      } else {
        showAlert("Error", "No se pudo guardar el producto.", "error");
      }
    } catch (error) { 
      showAlert("Error", "Error de conexión.", "error"); 
    }
  };

  // === LÓGICA DE EDICIÓN ===
  const prepararEdicion = (p) => { 
    setEditandoId(p.id); setNombre(p.nombre); setDescripcion(p.descripcion || ''); setEmoji(p.emoji || '🍽️'); setTiempoPreparacion(p.tiempo_preparacion || 15); setImagenBlob(null); 
    const clasifEncontrada = clasificaciones.find(c => c.nombre === p.categoria); setCategoriaSelect(clasifEncontrada ? clasifEncontrada.id : ''); 
    
    // 👇 Recuperamos el estado de disponibilidad (si no existe, asumimos true)
    setDisponible(p.disponible !== false); 

    let tieneTamanos = false; 
    let tieneSabores = false;
    const tempSabores = [];
    const newTamanos = { chico: { activo: false, extra: 0 }, mediano: { activo: false, extra: 0 }, grande: { activo: false, extra: 0 } }; 
    const newChecks = []; 
    
    (p.opciones || []).forEach(o => { 
      if (o.categoria === 'Tamaño') { 
        tieneTamanos = true; 
        const key = o.nombre.toLowerCase(); 
        if (newTamanos[key] !== undefined) { newTamanos[key].activo = true; newTamanos[key].extra = o.precioExtra; } 
      } else if (o.tipo === 'variacion' && o.categoria !== 'Tamaño') {
        tieneSabores = true;
        tempSabores.push({ nombre: o.nombre, extra: o.precioExtra });
      } else { 
        const catItem = catalogoIngredientes.find(ci => ci.nombre === o.nombre && ci.tipo === o.tipo); 
        if (catItem) newChecks.push(catItem.id); 
      } 
    }); 
    
    setAplicaTamanos(tieneTamanos); 
    setTamanos(newTamanos); 
    
    setAplicaSabores(tieneSabores);
    setListaSabores(tempSabores.length > 0 ? tempSabores : [{ nombre: '', extra: 0 }]);

    setCheckedIngredientes(newChecks); 
    setPrecio(tieneTamanos || tieneSabores ? p.precio_base : p.precio_base); 
  };

  // === LÓGICA DE ELIMINACIÓN ===
  const eliminarProducto = (id) => { 
    showConfirm("Eliminar Platillo", "¿Seguro que deseas borrar este platillo permanentemente?", async () => { 
      try {
        await fetch(`${apiUrl}/productos/${id}`, { method: 'DELETE' }); 
        refrescarDatos(); 
        showAlert("Eliminado", "Platillo borrado correctamente.", "success");
      } catch (error) {
        showAlert("Error", "No se pudo eliminar.", "error");
      }
    }); 
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* FORMULARIO DE PRODUCTO */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
        <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-slate-800">
          {editandoId ? <Edit className="text-orange-500" size={32}/> : <Plus className="text-blue-600" size={32}/>} 
          {editandoId ? 'Editar Producto' : 'Crear Nuevo Producto'}
        </h2>
        
        <form onSubmit={guardarProducto} className="space-y-6">
           <div className="space-y-4">
             <select required value={categoriaSelect} onChange={e => setCategoriaSelect(e.target.value)} className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-blue-900 text-lg cursor-pointer">
               <option value="">1. Selecciona Clasificación...</option>
               {(clasificaciones || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
             </select>

             <input required placeholder="2. Nombre (Ej. Moka Frapuccino o Alitas)" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg" />

             <textarea placeholder="Descripción atractiva del platillo..." value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none h-24" />
             
             <div className="grid grid-cols-2 gap-4">
               <input required={!aplicaTamanos && !aplicaSabores} type="number" placeholder="Precio Base $" value={precio} onChange={e => setPrecio(e.target.value)} disabled={aplicaTamanos || aplicaSabores} className={`p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-lg ${aplicaTamanos || aplicaSabores ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50'}`} />
               
               <select required value={emoji} onChange={e => setEmoji(e.target.value)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-3xl focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none">
                 {Object.entries(EMOJIS_POR_GIRO).map(([giro, emojis]) => (
                   <optgroup key={giro} label={giro}>
                     {emojis.map(em => <option key={em} value={em}>{em}</option>)}
                   </optgroup>
                 ))}
               </select>
             </div>
             
             <div>
               <label className="block text-xs font-black text-slate-400 uppercase mb-2">Tiempo de preparación (Minutos)</label>
               <input required type="number" placeholder="Ej. 15" value={tiempoPreparacion} onChange={e => setTiempoPreparacion(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-lg outline-none" />
             </div>
           </div>

           {/* 👇 ESTADO DEL PRODUCTO (ACTIVO/INACTIVO) */}
           <div className={`p-6 rounded-3xl border transition-all ${disponible ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
             <label className={`flex items-center gap-3 font-bold cursor-pointer text-lg ${disponible ? 'text-emerald-800' : 'text-red-800'}`}>
               <input type="checkbox" checked={disponible} onChange={e => setDisponible(e.target.checked)} className={`w-6 h-6 ${disponible ? 'accent-emerald-600' : 'accent-red-600'}`} /> 
               {disponible ? '✅ Platillo Disponible para Venta' : '❌ Platillo Deshabilitado (Oculto)'}
             </label>
             {!disponible && <p className="text-red-600 text-sm mt-2 font-medium">Este platillo ya no se mostrará en el Kiosco hasta que lo vuelvas a habilitar.</p>}
           </div>
           
           {/* TAMAÑOS */}
           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
             <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer mb-4 text-lg">
               <input type="checkbox" checked={aplicaTamanos} onChange={e => setAplicaTamanos(e.target.checked)} className="w-6 h-6 accent-blue-600" /> ¿Aplica Tamaños Fijos? (Chico/Med/Gde)
             </label>
             {aplicaTamanos && (
               <div className="space-y-3 mt-4 bg-white p-5 rounded-2xl border border-slate-200">
                 {['chico', 'mediano', 'grande'].map(t => (
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

           {/* SABORES / VARIACIONES LIBRES */}
           <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
             <label className="flex items-center gap-3 font-bold text-blue-900 cursor-pointer mb-4 text-lg">
               <input type="checkbox" checked={aplicaSabores} onChange={e => setAplicaSabores(e.target.checked)} className="w-6 h-6 accent-blue-600" /> ¿Lleva Sabores o Variaciones libres?
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
                   <button type="button" onClick={agregarSabor} className="w-full mt-2 py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-xl transition border border-dashed border-blue-300">
                     + Agregar otra opción
                   </button>
                 </div>
               </div>
             )}
           </div>

           {/* INGREDIENTES BASE */}
           {categoriaSelect && (
             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
               <h4 className="font-bold text-lg text-slate-800 mb-4">Ingredientes Base (Visualizar en Kiosco)</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                 {ingredientesParaClasifActiva.map(ing => (
                   <label key={ing.id} className="flex items-center gap-3 text-base cursor-pointer hover:bg-white p-2 rounded-xl transition border border-transparent hover:border-slate-200 shadow-sm">
                     <input type="checkbox" checked={checkedIngredientes.includes(ing.id)} onChange={e => e.target.checked ? setCheckedIngredientes([...checkedIngredientes, ing.id]) : setCheckedIngredientes(checkedIngredientes.filter(id => id !== ing.id))} className="w-5 h-5 accent-blue-600" />
                     <span className="flex-1 font-medium">{ing.nombre}</span>
                   </label>
                 ))}
               </div>
             </div>
           )}

           {/* FOTO */}
           <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition cursor-pointer">
              <label className="text-base font-bold text-slate-600 block mb-3">Sube una Foto Atractiva (Max 10MB)</label>
              <input id="imagen-producto-upload" type="file" accept="image/png, image/jpeg" onChange={e => setImagenBlob(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer" />
           </div>
           
           {/* BOTONES ACCIÓN */}
           <div className="flex gap-4 pt-4 border-t border-slate-100">
             {editandoId && ( 
               <button type="button" onClick={limpiarFormularioMenu} className="p-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar Edición</button> 
             )}
             <button type="submit" className={`flex-1 p-5 rounded-2xl font-black text-white text-xl shadow-lg transition active:scale-95 ${editandoId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}>
               {editandoId ? 'Actualizar Producto' : 'Guardar Producto'}
             </button>
           </div>
        </form>
      </div>
      
      {/* VISTA PREVIA LISTADO */}
      {categoriaSelect && (
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
          <h3 className="text-2xl font-black mb-6 text-slate-800">Vista Previa de: <span className="text-blue-600">{nombreCategoriaSeleccionada}</span></h3>
          {productosEnCategoria.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
              <p className="text-slate-500 font-bold text-lg">Aún no hay productos guardados en esta categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productosEnCategoria.map(p => (
                <div key={p.id} className={`bg-slate-50 p-5 rounded-3xl border border-slate-100 flex justify-between items-center hover:border-blue-200 hover:shadow-md transition ${p.disponible === false ? 'opacity-60 grayscale' : ''}`}>
                  <div className="flex items-center gap-4">
                    {p.imagen_url ? (
                        <img src={p.imagen_url?.startsWith('http') ? p.imagen_url : `${baseUrl}${p.imagen_url}`} alt={p.nombre} className="w-16 h-16 object-cover rounded-2xl shadow-sm" /> 
                    ) : (
                        <span className="text-3xl bg-white w-16 h-16 flex items-center justify-center rounded-2xl shadow-sm">{p.emoji}</span>
                    )}
                    <div>
                      <p className="font-bold text-lg leading-tight text-slate-800 flex items-center flex-wrap gap-2">
                        {p.nombre}
                        {p.disponible === false && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-md uppercase font-black tracking-widest">Oculto</span>}
                      </p>
                      <span className="text-blue-600 font-black text-sm block mt-1">${p.precio_base} • ⏱️ {p.tiempo_preparacion}m</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => prepararEdicion(p)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-xl transition bg-white shadow-sm border border-slate-100"><Edit size={18}/></button>
                    <button onClick={() => eliminarProducto(p.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition bg-white shadow-sm border border-slate-100"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GestionMenu;