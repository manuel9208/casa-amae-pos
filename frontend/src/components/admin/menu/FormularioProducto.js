import React, { useState, useEffect } from 'react';
import { Edit, Plus, XCircle, Star } from 'lucide-react';  

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
  const [checkedIngredientes, setCheckedIngredientes] = useState([]);  

  const [disponible, setDisponible] = useState(true);
  const [generaPuntos, setGeneraPuntos] = useState(true);  

  const [aplicaTamanos, setAplicaTamanos] = useState(false);
  const [tamanos, setTamanos] = useState({
    chico: { activo: false, extra: 0 },
    mediano: { activo: false, extra: 15 },
    grande: { activo: false, extra: 25 }
  });  

  const [aplicaSabores, setAplicaSabores] = useState(false);
  const [listaSabores, setListaSabores] = useState([{ nombre: '', extra: 0 }]);  

  const ingredientesParaClasifActiva = (catalogoIngredientes || []).filter(i => Number(i.clasificacion_id) === Number(categoriaSelect));  

  const agregarSabor = () => setListaSabores([...listaSabores, { nombre: '', extra: 0 }]);
  const removerSabor = (index) => setListaSabores(listaSabores.filter((_, i) => i !== index));
  
  const actualizarSabor = (index, campo, valor) => {
    const nuevosSabores = [...listaSabores];
    nuevosSabores[index][campo] = valor;
    setListaSabores(nuevosSabores);
  };  

  const limpiarFormularioMenu = () => {
    setProductoEditando(null);
    setNombre(''); setDescripcion(''); setPrecio(''); setTiempoPreparacion(15); setEmoji('🍽️');
    setImagenBlob(null); setDisponible(true); setGeneraPuntos(true);
    setAplicaTamanos(false); setTamanos({ chico: { activo: false, extra: 0 }, mediano: { activo: false, extra: 15 }, grande: { activo: false, extra: 25 } });
    setAplicaSabores(false); setListaSabores([{ nombre: '', extra: 0 }]);
    setCheckedIngredientes([]);
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
      const newTamanos = { chico: { activo: false, extra: 0 }, mediano: { activo: false, extra: 0 }, grande: { activo: false, extra: 0 } };
      
      // 👇 FIX 1: Usamos 'Set' para destruir automáticamente cualquier ingrediente duplicado en la Base de Datos
      const newChecksSet = new Set();  

      (p.opciones || []).forEach(o => {
        if (o.categoria === 'Tamaño') {
          tieneTamanos = true;
          const key = String(o.nombre).toLowerCase();
          if (newTamanos[key] !== undefined) { newTamanos[key].activo = true; newTamanos[key].extra = o.precioExtra; }
        } else if (o.tipo === 'variacion' && o.categoria !== 'Tamaño') {
          tieneSabores = true;
          tempSabores.push({ nombre: o.nombre, extra: o.precioExtra });
        } else {
          // 👇 FIX 2: Búsqueda blindada. Buscamos por nombre ignorando mayúsculas/minúsculas y el 'tipo'
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
      setCheckedIngredientes(Array.from(newChecksSet)); // Convertimos el Set limpio de vuelta a Array
      setPrecio(p.precio_base);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoEditando, clasificaciones, catalogoIngredientes]);  

  const guardarProducto = async (e) => {
    e.preventDefault();
    if (!categoriaSelect) return showAlert("Atención", "Selecciona clasificación.", "info");  
    const editandoId = productoEditando ? productoEditando.id : null;
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
    
    // 👇 FIX 3: Aseguramos que al guardar jamás se vayan IDs repetidos
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
    
    const nombreCategoria = clasificaciones.find(c => Number(c.id) === Number(categoriaSelect))?.nombre || 'General';
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

  return (
    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
      <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-slate-800">
        {productoEditando ? <Edit className="text-orange-500" size={32}/> : <Plus className="text-blue-600" size={32}/>}
        {productoEditando ? 'Editar Producto' : 'Crear Nuevo Producto'}
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

        <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
          <label className="flex items-center gap-3 font-bold text-blue-900 cursor-pointer text-lg">
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

        {categoriaSelect && (
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <h4 className="font-bold text-lg text-slate-800 mb-4">Ingredientes Base (Visualizar en Kiosco)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {ingredientesParaClasifActiva.map(ing => (
                <label key={ing.id} className="flex items-center gap-3 text-base cursor-pointer hover:bg-white p-2 rounded-xl transition border border-transparent hover:border-slate-200 shadow-sm">
                  {/* 👇 FIX 4: Comparación segura y robusta usando .some() y Number() */}
                  <input 
                    type="checkbox" 
                    checked={checkedIngredientes.some(id => Number(id) === Number(ing.id))} 
                    onChange={e => e.target.checked 
                      ? setCheckedIngredientes([...checkedIngredientes, Number(ing.id)]) 
                      : setCheckedIngredientes(checkedIngredientes.filter(id => Number(id) !== Number(ing.id)))
                    } 
                    className="w-5 h-5 accent-blue-600" 
                  />
                  <span className="flex-1 font-medium">{ing.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        )}  

        <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition cursor-pointer">
          <label className="text-base font-bold text-slate-600 block mb-3">Sube una Foto Atractiva (Max 10MB)</label>
          <input id="imagen-producto-upload" type="file" accept="image/png, image/jpeg" onChange={e => setImagenBlob(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer" />
        </div>  

        <div className="flex gap-4 pt-4 border-t border-slate-100">
          {productoEditando && (
            <button type="button" onClick={limpiarFormularioMenu} className="p-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition">Cancelar Edición</button>
          )}
          <button type="submit" className={`flex-1 p-5 rounded-2xl font-black text-white text-xl shadow-lg transition active:scale-95 ${productoEditando ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}>
            {productoEditando ? 'Actualizar Producto' : 'Guardar Producto'}
          </button>
        </div>
      </form>
    </div>
  );
};  

export default FormularioProducto;