import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, Tag, DollarSign, XCircle, CheckCircle2, Star, CreditCard, Users, Package, AlertTriangle } from 'lucide-react';
import ImagenCachada from '../../ImagenCachada';

const EMOJIS_B2B = ['📦','🥤','☕','🥛','🥡','🧊','🍯','🍫','🧹','🧴','🧾','🛍️','🛒','🏭','🥩','🍗','🧀','🥬','🍅','🥑','🍞','🥐'];

const CatalogoArticulos = ({ apiUrl, baseUrl, showAlert, showConfirm }) => {
  const [articulos, setArticulos] = useState([]);
  const [clientesDB, setClientesDB] = useState([]); 
  const [busqueda, setBusqueda] = useState('');

  // Estados del Modal Principal
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados del Sub-Modal de Precios
  const [modalPrecioVisible, setModalPrecioVisible] = useState(false);
  const [editandoReglaId, setEditandoReglaId] = useState(null);
  const [busquedaClientesRegla, setBusquedaClientesRegla] = useState(''); // Buscador de clientes en regla
  const [nuevoPrecio, setNuevoPrecio] = useState({
    tipo: 'nivel',
    nivel_nombre: '',
    clientes_seleccionados: [],
    cantidad_minima: 1,
    precio: '',
    permite_credito: false
  });

  // Estado del Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '', 
    unidad_medida: 'PZ',
    equivalencia: 1, 
    costo_inversion: '', 
    disponible: true,
    genera_puntos: true,
    permite_canje: true,
    permite_credito: false, 
    usa_stock: true, 
    stock_actual: 0,
    stock_minimo_alerta: 0,
    precios: [],
    emoji: '📦',
    imagen_url: null,
    imagenBlob: null
  });

  const categoriasExistentes = [...new Set(articulos.map(a => a.categoria))];

  const cargarDatos = useCallback(async () => {
    try {
      const resArt = await fetch(`${apiUrl}/distribucion/articulos`);
      if (resArt.ok) setArticulos(await resArt.json());

      const resCli = await fetch(`${apiUrl}/distribucion/clientes`);
      if (resCli.ok) setClientesDB(await resCli.json());
    } catch (error) {
      console.error("Error al cargar datos B2B:", error);
    }
  }, [apiUrl]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const articulosFiltrados = articulos.filter(a => 
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    a.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  const clientesReglaFiltrados = clientesDB.filter(c => 
    (c.empresa || '').toLowerCase().includes(busquedaClientesRegla.toLowerCase()) ||
    (c.nombre_contacto || '').toLowerCase().includes(busquedaClientesRegla.toLowerCase())
  );

  const abrirModalNuevo = () => {
    setEditandoId(null);
    setFormData({
      nombre: '', descripcion: '', categoria: '', unidad_medida: 'PZ', equivalencia: 1, costo_inversion: '', 
      disponible: true,
      genera_puntos: true, permite_canje: true, permite_credito: false, 
      usa_stock: true, stock_actual: 0, stock_minimo_alerta: 0, 
      precios: [],
      emoji: '📦', imagen_url: null, imagenBlob: null
    });
    setModalVisible(true);
  };

  const abrirModalEditar = (articulo) => {
    setEditandoId(articulo.id);
    let preciosParsed = [];
    try { preciosParsed = typeof articulo.precios === 'string' ? JSON.parse(articulo.precios) : articulo.precios; } catch (e) {}

    setFormData({
      nombre: articulo.nombre,
      descripcion: articulo.descripcion || '', 
      categoria: articulo.categoria,
      unidad_medida: articulo.unidad_medida || 'PZ',
      equivalencia: articulo.equivalencia || 1,
      costo_inversion: articulo.costo_inversion || '',
      disponible: articulo.disponible !== false && articulo.disponible !== 'false',
      genera_puntos: articulo.genera_puntos,
      permite_canje: articulo.permite_canje,
      permite_credito: articulo.permite_credito,
      usa_stock: articulo.usa_stock,
      stock_actual: Number(articulo.stock_actual) || 0,
      stock_minimo_alerta: Number(articulo.stock_minimo_alerta) || 0,
      precios: preciosParsed || [],
      emoji: articulo.emoji || '📦',
      imagen_url: articulo.imagen_url || null,
      imagenBlob: null
    });
    setModalVisible(true);
  };

  // =======================================================
  // LÓGICA DEL SUB-MODAL DE PRECIOS
  // =======================================================
  const abrirModalAñadirPrecio = () => {
    setEditandoReglaId(null);
    setBusquedaClientesRegla('');
    setNuevoPrecio({
      tipo: 'nivel', nivel_nombre: '', clientes_seleccionados: [],
      cantidad_minima: 1, precio: '', permite_credito: formData.permite_credito 
    });
    setModalPrecioVisible(true);
  };

  const abrirModalEditarPrecio = (regla) => {
    setEditandoReglaId(regla.id);
    setBusquedaClientesRegla('');
    setNuevoPrecio({
      tipo: regla.tipo,
      nivel_nombre: regla.tipo === 'nivel' ? regla.nombres[0] : '',
      clientes_seleccionados: regla.tipo === 'cliente' ? [...regla.nombres] : [],
      cantidad_minima: regla.cantidad_minima,
      precio: regla.precio,
      permite_credito: regla.permite_credito
    });
    setModalPrecioVisible(true);
  };

  const toggleCliente = (nombreEmpresa) => {
    setNuevoPrecio(prev => {
      const seleccionados = prev.clientes_seleccionados.includes(nombreEmpresa)
        ? prev.clientes_seleccionados.filter(c => c !== nombreEmpresa)
        : [...prev.clientes_seleccionados, nombreEmpresa];
      return { ...prev, clientes_seleccionados: seleccionados };
    });
  };

  const handleSeleccionarTodos = () => {
    const seleccionadosActuales = new Set(nuevoPrecio.clientes_seleccionados);
    clientesReglaFiltrados.forEach(c => seleccionadosActuales.add(c.empresa));
    setNuevoPrecio({ ...nuevoPrecio, clientes_seleccionados: Array.from(seleccionadosActuales) });
  };

  const handleDeseleccionarTodos = () => {
    setNuevoPrecio({ ...nuevoPrecio, clientes_seleccionados: [] });
  };

  const guardarReglaPrecio = (e) => {
    e.preventDefault();
    if (nuevoPrecio.tipo === 'nivel' && !nuevoPrecio.nivel_nombre.trim()) return showAlert('Atención', 'Debes ingresar un nombre para el nivel.', 'error');
    if (nuevoPrecio.tipo === 'cliente' && nuevoPrecio.clientes_seleccionados.length === 0) return showAlert('Atención', 'Debes seleccionar al menos un cliente.', 'error');
    if (Number(nuevoPrecio.precio) <= 0) return showAlert('Atención', 'El precio debe ser mayor a 0.', 'error');
    if (Number(nuevoPrecio.cantidad_minima) <= 0) return showAlert('Atención', 'La cantidad a partir de debe ser mayor a 0.', 'error');

    const reglaFinal = {
      id: editandoReglaId || Date.now().toString(),
      tipo: nuevoPrecio.tipo,
      nombres: nuevoPrecio.tipo === 'nivel' ? [nuevoPrecio.nivel_nombre] : nuevoPrecio.clientes_seleccionados,
      cantidad_minima: Number(nuevoPrecio.cantidad_minima),
      precio: Number(nuevoPrecio.precio),
      permite_credito: nuevoPrecio.permite_credito
    };

    if (editandoReglaId) {
      setFormData({ ...formData, precios: formData.precios.map(p => p.id === editandoReglaId ? reglaFinal : p) });
    } else {
      setFormData({ ...formData, precios: [...formData.precios, reglaFinal] });
    }
    
    setModalPrecioVisible(false);
    setEditandoReglaId(null);
  };

  const eliminarReglaPrecio = (idRegla) => {
    setFormData({ ...formData, precios: formData.precios.filter(p => p.id !== idRegla) });
  };

  // =======================================================
  // PERSISTENCIA EN BASE DE DATOS
  // =======================================================
  const guardarArticulo = async (e) => {
    e.preventDefault();
    if (!formData.categoria.trim()) return showAlert('Atención', 'Debes escribir o seleccionar una categoría.', 'error');
    if (formData.precios.length === 0) return showAlert('Atención', 'Debes agregar al menos una regla de precio de venta.', 'error');
    
    setIsSubmitting(true);
    
    const payload = new FormData();
    payload.append('nombre', formData.nombre);
    payload.append('descripcion', formData.descripcion);
    payload.append('categoria', formData.categoria);
    payload.append('unidad_medida', formData.unidad_medida);
    payload.append('equivalencia', formData.equivalencia);
    payload.append('costo_inversion', formData.costo_inversion || 0);
    payload.append('disponible', formData.disponible);
    payload.append('genera_puntos', formData.genera_puntos);
    payload.append('permite_canje', formData.permite_canje);
    payload.append('permite_credito', formData.permite_credito);
    payload.append('usa_stock', formData.usa_stock);
    payload.append('stock_actual', formData.stock_actual || 0);
    payload.append('stock_minimo_alerta', formData.stock_minimo_alerta || 0);
    payload.append('precios', JSON.stringify(formData.precios));
    payload.append('emoji', formData.emoji);
    
    if (formData.imagenBlob) {
      payload.append('imagen', formData.imagenBlob);
    }

    try {
      const url = editandoId ? `${apiUrl}/distribucion/articulos/${editandoId}` : `${apiUrl}/distribucion/articulos`;
      const method = editandoId ? 'PUT' : 'POST';
      
      const res = await fetch(url, { method, body: payload });
      if (res.ok) {
        showAlert('Éxito', 'Artículo guardado en el catálogo.', 'success');
        setModalVisible(false);
        cargarDatos();
      } else {
        const errorData = await res.json();
        showAlert('Error', errorData.error || 'No se pudo guardar el artículo.', 'error');
      }
    } catch (error) {
      showAlert('Error', 'Fallo de conexión al servidor.', 'error');
    }
    setIsSubmitting(false);
  };

  const eliminarArticulo = (id) => {
    showConfirm('Eliminar Artículo', '¿Estás seguro de eliminar permanentemente este artículo?', async () => {
      try {
        const res = await fetch(`${apiUrl}/distribucion/articulos/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert('Eliminado', 'El artículo ha sido eliminado.', 'success');
          cargarDatos();
        }
      } catch (error) {
        showAlert('Error', 'No se pudo eliminar el artículo.', 'error');
      }
    });
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-300">
      
      {/* BARRA SUPERIOR DE ACCIONES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar artículos o categorías..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all"
          />
        </div>
        <button 
          onClick={abrirModalNuevo}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Nuevo Artículo
        </button>
      </div>

      {/* LISTADO DE ARTÍCULOS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {articulosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white rounded-[32px] border border-slate-200 border-dashed">
            <Package size={64} className="text-slate-300 mb-4 animate-pulse" />
            <p className="text-xl font-black text-slate-400">Sin artículos registrados</p>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
              Comienza agregando tu primer producto para mayoreo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {articulosFiltrados.map(art => {
              let preciosList = [];
              try { preciosList = typeof art.precios === 'string' ? JSON.parse(art.precios) : (art.precios || []); } catch(e){}
              
              // 👇 LÓGICA DE SEMÁFORO DE INVENTARIO
              const isAgotado = art.usa_stock && Number(art.stock_actual) <= 0;
              const isAlertaStock = art.usa_stock && Number(art.stock_actual) > 0 && Number(art.stock_actual) <= Number(art.stock_minimo_alerta);
              const isOculto = art.disponible === false || String(art.disponible) === 'false';

              let cardBgClass = 'bg-white border-slate-200 hover:shadow-md hover:border-indigo-200';
              if (isAgotado) {
                cardBgClass = 'bg-red-50 border-red-300 hover:shadow-md hover:border-red-400';
              } else if (isAlertaStock) {
                cardBgClass = 'bg-amber-50 border-amber-300 hover:shadow-md hover:border-amber-400';
              }

              return (
                <div key={art.id} className={`p-5 rounded-[24px] border shadow-sm flex flex-col relative group transition-all duration-300 ${cardBgClass} ${isOculto ? 'opacity-60 grayscale' : ''}`}>
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={() => abrirModalEditar(art)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-500 hover:text-white transition shadow-sm"><Edit size={16}/></button>
                    <button onClick={() => eliminarArticulo(art.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition shadow-sm"><Trash2 size={16}/></button>
                  </div>
                  
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm border overflow-hidden shrink-0 ${isAgotado ? 'bg-red-100 text-red-600 border-red-200' : isAlertaStock ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                    {art.imagen_url ? (
                      <ImagenCachada src={art.imagen_url.startsWith('http') ? art.imagen_url : `${baseUrl}${art.imagen_url}`} alt={art.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{art.emoji || '📦'}</span>
                    )}
                  </div>
                  
                  <h3 className="font-black text-slate-800 text-lg leading-tight pr-14 flex items-center gap-2">
                    {art.nombre}
                    {isOculto && <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-widest shrink-0">Oculto</span>}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-1">{art.categoria}</p>
                  
                  {art.descripcion && (
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium line-clamp-2 mb-3 leading-tight">
                      {art.descripcion}
                    </p>
                  )}
                  {!art.descripcion && <div className="mb-3"></div>}
                  
                  {/* 👇 PILDORAS E INDICADORES VISUALES DINÁMICOS */}
                  <div className="flex flex-wrap gap-2 mb-4">
                     {art.usa_stock && (
                       <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 border ${
                         isAgotado ? 'bg-red-200 text-red-800 border-red-300' : 
                         isAlertaStock ? 'bg-amber-200 text-amber-800 border-amber-300' : 
                         'bg-slate-100 text-slate-600 border-slate-200'
                       }`}>
                         <Package size={10}/> STOCK: {Number(art.stock_actual).toFixed(2)} {art.unidad_medida}
                       </span>
                     )}
                     {art.genera_puntos && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 border border-emerald-100"><Star size={10}/> Puntos</span>}
                     {art.permite_credito ? (
                       <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 border border-blue-100"><CreditCard size={10}/> Acepta Crédito</span>
                     ) : (
                       <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 border border-orange-100"><DollarSign size={10}/> Solo Contado</span>
                     )}
                  </div>

                  <div className="bg-white/80 p-3 rounded-xl border border-white/50 mt-auto shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-500 mb-3 flex items-center gap-1">
                      <Tag size={12}/> Equiv: {art.equivalencia} {art.unidad_medida}
                    </p>
                    <div className="space-y-1.5">
                      {preciosList.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold truncate pr-2 max-w-[65%]">
                            {p.tipo === 'cliente' ? '👤 ' : ''}{p.nombres.join(', ')}
                          </span>
                          <span className="text-indigo-600 font-black shrink-0">${Number(p.precio).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL PRINCIPAL: FORMULARIO DEL ARTÍCULO */}
      {/* ============================================================== */}
      {modalVisible && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={guardarArticulo} className="bg-white rounded-[36px] shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col border border-slate-100 animate-in zoom-in-95 relative overflow-hidden">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0 bg-white z-10 relative">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{editandoId ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Catálogo de Distribución</p>
              </div>
              <button type="button" onClick={() => setModalVisible(false)} className="p-2 bg-slate-100 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition active:scale-95">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-slate-50/30">
              
              {/* FILA 1: Nombre, Descripción y Categoría Libre */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Nombre del Artículo *</label>
                  <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none focus:border-indigo-500 text-slate-700 transition-colors shadow-sm" placeholder="Ej. Vasos Transparentes 16oz" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Descripción del Artículo (Opcional)</label>
                  <textarea value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none focus:border-indigo-500 text-slate-700 transition-colors shadow-sm resize-none h-20" placeholder="Ej. Paquete de 50 vasos térmicos para café caliente..." />
                </div>
                
                <div className="md:col-span-2 relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Categoría (Selecciona o escribe una nueva) *</label>
                  <input 
                    type="text" 
                    required 
                    list="lista-categorias"
                    value={formData.categoria} 
                    onChange={e => setFormData({...formData, categoria: e.target.value})} 
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none focus:border-indigo-500 text-slate-700 transition-colors shadow-sm" 
                    placeholder="Ej. Desechables, Insumos, Café..." 
                  />
                  <datalist id="lista-categorias">
                    {categoriasExistentes.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>
              </div>

              {/* FILA 2: IMAGEN Y EMOJI */}
              <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-300 hover:border-indigo-400 transition cursor-pointer flex flex-col md:flex-row gap-4 items-center">
                 <div className="w-full md:w-1/3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Icono / Emoji</label>
                    <select value={formData.emoji} onChange={e => setFormData({...formData, emoji: e.target.value})} className="w-full bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl p-4 outline-none focus:border-indigo-500 transition-all cursor-pointer text-center text-3xl shadow-sm">
                       {EMOJIS_B2B.map(em => <option key={em} value={em}>{em}</option>)}
                    </select>
                 </div>
                 <div className="w-full md:w-2/3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sube una Foto Atractiva (Opcional)</label>
                    <input type="file" accept="image/png, image/jpeg, image/webp" onChange={e => setFormData({...formData, imagenBlob: e.target.files[0]})} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer bg-white border border-slate-200 rounded-xl p-1 shadow-sm" />
                    {formData.imagen_url && !formData.imagenBlob && <p className="text-xs text-indigo-600 mt-2 font-bold pl-1">Ya cuenta con una imagen guardada.</p>}
                 </div>
              </div>

              {/* FILA 2.5: SWITCHES DE ESTADO PRINCIPALES (DISPONIBLE Y PUNTOS) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className={`p-4 rounded-3xl border transition-all flex items-center justify-center ${formData.disponible ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <label className="flex items-center gap-3 font-black text-sm cursor-pointer select-none">
                       <input type="checkbox" checked={formData.disponible} onChange={e => setFormData({...formData, disponible: e.target.checked})} className="w-5 h-5 accent-emerald-600" />
                       <span className={formData.disponible ? 'text-emerald-700' : 'text-slate-400'}>✅ Disponible</span>
                    </label>
                 </div>
                 <div className={`p-4 rounded-3xl border transition-all flex items-center justify-center ${formData.genera_puntos ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <label className="flex items-center gap-3 font-black text-sm cursor-pointer select-none">
                       <input type="checkbox" checked={formData.genera_puntos} onChange={e => setFormData({...formData, genera_puntos: e.target.checked})} className="w-5 h-5 accent-indigo-600" />
                       <span className={formData.genera_puntos ? 'text-indigo-700' : 'text-slate-400'}>⭐ Da Puntos</span>
                    </label>
                 </div>
                 <div className={`p-4 rounded-3xl border transition-all flex items-center justify-center ${formData.permite_canje ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <label className="flex items-center gap-3 font-black text-sm cursor-pointer select-none">
                       <input type="checkbox" checked={formData.permite_canje} onChange={e => setFormData({...formData, permite_canje: e.target.checked})} className="w-5 h-5 accent-purple-600" />
                       <span className={formData.permite_canje ? 'text-purple-700' : 'text-slate-400'}>🎁 Acepta Puntos</span>
                    </label>
                 </div>
              </div>

              {/* FILA 3: Unidades, Presentación y Costos */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Unidad de Venta *</label>
                    <select required value={formData.unidad_medida} onChange={e => setFormData({...formData, unidad_medida: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-indigo-500 text-slate-700 transition-colors cursor-pointer">
                      <option value="PZ">Pieza (PZ)</option>
                      <option value="KG">Kilogramos (KG)</option>
                      <option value="GR">Gramos (GR)</option>
                      <option value="LT">Litros (LT)</option>
                      <option value="ML">Mililitros (ML)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1" title="Cuantas unidades trae la caja o paquete">Equivalencia *</label>
                    <input type="number" min="1" step="any" required value={formData.equivalencia} onChange={e => {
                        let val = e.target.value;
                        if (val !== '' && Number(val) < 1) val = '1';
                        setFormData({...formData, equivalencia: Number(val)});
                    }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-indigo-500 text-slate-700 transition-colors" placeholder="Ej. 1" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Costo de Inversión</label>
                    <input type="number" min="0" step="any" value={formData.costo_inversion} onChange={e => {
                        let val = e.target.value;
                        if (val !== '' && Number(val) < 0) val = '0';
                        setFormData({...formData, costo_inversion: val});
                    }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-red-400 text-slate-700 transition-colors placeholder-slate-300" placeholder="Opcional ($0.00)" />
                  </div>
                </div>
              </div>

              {/* BLOQUE: CONTROL DE INVENTARIOS */}
              <div className={`p-5 rounded-2xl border transition-colors ${formData.usa_stock ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                 <div className="flex items-center gap-2 mb-4 border-b border-amber-100/50 pb-3">
                    <Package className={formData.usa_stock ? "text-amber-500" : "text-slate-400"} size={20} />
                    <p className={`text-sm font-black tracking-tight ${formData.usa_stock ? "text-amber-800" : "text-slate-500"}`}>Control de Inventarios (Stock)</p>
                 </div>
                 
                 <label className={`flex items-center gap-3 cursor-pointer text-sm font-bold mb-4 ${formData.usa_stock ? "text-amber-900" : "text-slate-600"}`}>
                    <input type="checkbox" checked={formData.usa_stock} onChange={e => setFormData({...formData, usa_stock: e.target.checked})} className="w-5 h-5 accent-amber-600" />
                    Llevar conteo físico de este artículo
                 </label>

                 {formData.usa_stock && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                     <div>
                        <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5 pl-1">Stock Actual Físico</label>
                        <input type="number" min="0" step="any" required value={formData.stock_actual} onChange={e => {
                            let val = e.target.value;
                            if (val !== '' && Number(val) < 0) val = '0';
                            const newStock = Number(val);
                            
                            setFormData(prev => ({
                                ...prev, 
                                stock_actual: val,
                                disponible: newStock > 0 ? true : (newStock <= 0 ? false : prev.disponible)
                            }));
                        }} className="w-full bg-white border border-amber-200 rounded-xl p-3 font-black text-amber-900 outline-none focus:border-amber-500 shadow-inner text-lg" placeholder="0" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5 pl-1">Notificar cuando queden:</label>
                        <div className="relative">
                          <AlertTriangle size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-300" />
                          <input type="number" min="0" step="any" value={formData.stock_minimo_alerta} onChange={e => {
                              let val = e.target.value;
                              if (val !== '' && Number(val) < 0) val = '0';
                              setFormData({...formData, stock_minimo_alerta: val});
                          }} className="w-full bg-white border border-red-200 rounded-xl py-3 pl-10 pr-3 font-bold text-red-700 outline-none focus:border-red-500 shadow-inner" placeholder="0 = Sin alerta" />
                        </div>
                     </div>
                   </div>
                 )}
              </div>

              {/* POLÍTICA DE CRÉDITO GLOBAL */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-center transition-colors ${formData.permite_credito ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex items-center gap-2 mb-3 border-b border-slate-200/50 pb-2">
                    <CreditCard className={formData.permite_credito ? "text-blue-500" : "text-orange-500"} size={20} />
                    <p className={`text-sm font-black tracking-tight ${formData.permite_credito ? "text-blue-800" : "text-orange-800"}`}>Política de Pago Global</p>
                  </div>
                  <label className={`flex items-center gap-2 cursor-pointer text-sm font-bold ${formData.permite_credito ? "text-blue-900" : "text-orange-900"}`}>
                    <input type="checkbox" checked={formData.permite_credito} onChange={e => setFormData({...formData, permite_credito: e.target.checked})} className={`w-4 h-4 ${formData.permite_credito ? "accent-blue-600" : "accent-orange-500"}`} />
                    Permitir venderse a Crédito
                  </label>
                  <p className={`text-[10px] font-bold mt-2 leading-tight ${formData.permite_credito ? "text-blue-600/80" : "text-orange-600/80"}`}>
                    {formData.permite_credito ? 'Cualquier cliente con crédito podrá llevarse este producto.' : 'ESTRICTO CONTADO. (Excepciones por cliente abajo).'}
                  </p>
              </div>

              {/* TABLA DE REGLAS DE PRECIO */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                  <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <DollarSign size={18} className="text-indigo-500"/> Reglas de Precios
                  </p>
                  <button type="button" onClick={abrirModalAñadirPrecio} className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition active:scale-95 border border-indigo-200 flex items-center gap-1 shadow-sm">
                    <Plus size={14}/> Añadir Regla
                  </button>
                </div>
                
                {formData.precios.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold text-sm">Aún no has definido ningún precio para este artículo.</p>
                    <p className="text-xs text-slate-400 mt-1">Haz clic en "Añadir Regla" para asignar el precio público o mayoreo.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.precios.map(regla => (
                      <div key={regla.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-left-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${regla.tipo === 'nivel' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200'}`}>
                              {regla.tipo === 'nivel' ? 'Nivel/Volumen' : 'Cliente Especial'}
                            </span>
                            {regla.permite_credito ? (
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">💳 Crédito Permitido</span>
                            ) : (
                              <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">💵 Solo Contado</span>
                            )}
                          </div>
                          <p className="font-black text-slate-800 text-sm leading-tight">
                            {regla.nombres.join(', ')}
                          </p>
                          <p className="text-[11px] font-bold text-slate-500 mt-1">
                            A partir de <span className="text-slate-700 font-black">{regla.cantidad_minima}</span> {formData.unidad_medida}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right mr-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Precio</p>
                            <p className="text-xl font-black text-emerald-600">${Number(regla.precio).toFixed(2)}</p>
                          </div>
                          <button type="button" onClick={() => abrirModalEditarPrecio(regla)} className="p-2.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-transparent rounded-xl transition" title="Editar Regla">
                            <Edit size={18} />
                          </button>
                          <button type="button" onClick={() => eliminarReglaPrecio(regla.id)} className="p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 border border-transparent rounded-xl transition" title="Borrar Regla">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 flex gap-4 shrink-0 bg-white z-10 relative rounded-b-[36px]">
              <button type="button" disabled={isSubmitting} onClick={() => setModalVisible(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 border border-slate-200 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50 active:scale-95">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-indigo-600 text-white font-black text-lg rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 disabled:opacity-50 transition active:scale-95 flex items-center justify-center gap-2">
                <CheckCircle2 size={20}/> {isSubmitting ? 'Guardando...' : 'Guardar Artículo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL: AÑADIR/EDITAR REGLA DE PRECIO */}
      {/* ============================================================== */}
      {modalPrecioVisible && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={guardarReglaPrecio} className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
               <div>
                 <h3 className="text-xl font-black text-slate-800">{editandoReglaId ? 'Editar Regla de Precio' : 'Nueva Regla de Precio'}</h3>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Configuración Comercial</p>
               </div>
               <button type="button" onClick={() => setModalPrecioVisible(false)} className="text-slate-400 hover:text-red-500 transition active:scale-95"><XCircle size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
               {/* TIPO DE REGLA */}
               <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">¿A quién aplica este precio?</label>
                 <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-inner">
                   <button type="button" onClick={() => setNuevoPrecio({...nuevoPrecio, tipo: 'nivel'})} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-2 ${nuevoPrecio.tipo === 'nivel' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                     <Package size={16}/> Regla por Nivel
                   </button>
                   <button type="button" onClick={() => setNuevoPrecio({...nuevoPrecio, tipo: 'cliente'})} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-2 ${nuevoPrecio.tipo === 'cliente' ? 'bg-white text-fuchsia-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                     <Users size={16}/> Clientes Específicos
                   </button>
                 </div>
               </div>

               {/* SELECCIÓN DE NOMBRE / CLIENTES */}
               <div className="animate-in slide-in-from-right-2">
                 {nuevoPrecio.tipo === 'nivel' ? (
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Nombre del Nivel *</label>
                     <input type="text" required autoFocus value={nuevoPrecio.nivel_nombre} onChange={e => setNuevoPrecio({...nuevoPrecio, nivel_nombre: e.target.value})} placeholder="Ej. Público General, Mayoreo A, Empleados..." className="w-full bg-white border-2 border-slate-200 rounded-xl p-4 font-bold outline-none focus:border-indigo-500 text-slate-700 shadow-sm" />
                   </div>
                 ) : (
                   <div>
                     <div className="flex justify-between items-center mb-2 pl-1">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecciona los Clientes *</label>
                       <span className="text-[10px] font-black uppercase text-fuchsia-500 bg-fuchsia-50 px-2 py-0.5 rounded border border-fuchsia-100">{nuevoPrecio.clientes_seleccionados.length} seleccionados</span>
                     </div>
                     
                     {/* 👇 NUEVO: Buscador de clientes */}
                     <div className="relative mb-3">
                       <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input 
                         type="text" 
                         placeholder="Buscar por empresa o contacto..." 
                         value={busquedaClientesRegla} 
                         onChange={(e) => setBusquedaClientesRegla(e.target.value)} 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold outline-none focus:border-fuchsia-500 text-slate-700 transition-colors" 
                       />
                     </div>

                     {/* 👇 NUEVO: Botones de Selección Rápida */}
                     {clientesReglaFiltrados.length > 0 && (
                        <div className="flex justify-end gap-2 mb-2">
                          <button type="button" onClick={handleSeleccionarTodos} className="text-[10px] font-bold text-fuchsia-600 bg-fuchsia-50 hover:bg-fuchsia-100 px-2 py-1 rounded transition-colors">Seleccionar Todos los Mostrados</button>
                          <button type="button" onClick={handleDeseleccionarTodos} className="text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors">Limpiar Selección</button>
                        </div>
                     )}

                     {clientesDB.length === 0 ? (
                        <p className="text-center text-slate-400 font-bold p-4 bg-slate-50 rounded-xl text-sm border border-slate-200 border-dashed">No hay clientes registrados en el directorio B2B.</p>
                     ) : clientesReglaFiltrados.length === 0 ? (
                        <p className="text-center text-slate-400 font-bold p-4 bg-slate-50 rounded-xl text-sm border border-slate-200 border-dashed">No se encontraron clientes.</p>
                     ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 max-h-48 overflow-y-auto custom-scrollbar shadow-inner space-y-1">
                          {clientesReglaFiltrados.map(cli => {
                            // Usamos empresa en B2B
                            const isSelected = nuevoPrecio.clientes_seleccionados.includes(cli.empresa);
                            return (
                              <button type="button" key={cli.id} onClick={() => toggleCliente(cli.empresa)} className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between border ${isSelected ? 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200' : 'bg-white text-slate-600 border-transparent hover:border-slate-300'}`}>
                                <div>
                                  <p className="font-black text-sm leading-tight">{cli.empresa}</p>
                                  <p className="font-bold text-[10px] uppercase text-slate-400 mt-0.5">{cli.nombre_contacto}</p>
                                </div>
                                {isSelected && <CheckCircle2 size={18} className="text-fuchsia-500 shrink-0"/>}
                              </button>
                            );
                          })}
                        </div>
                     )}
                   </div>
                 )}
               </div>

               {/* CONDICIÓN DE COMPRA Y PRECIO */}
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">A partir de (Cant.) *</label>
                    <input type="number" min="1" step="any" required value={nuevoPrecio.cantidad_minima} onChange={e => {
                        let val = e.target.value;
                        if(val !== '' && Number(val) <= 0) val = '1';
                        setNuevoPrecio({...nuevoPrecio, cantidad_minima: val});
                    }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-center font-black text-lg outline-none focus:border-indigo-500 text-slate-700 shadow-inner" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 pl-1">Precio Unitario ($) *</label>
                    <input type="number" min="0" step="0.01" required value={nuevoPrecio.precio} onChange={e => {
                        let val = e.target.value;
                        if(val !== '' && Number(val) < 0) val = '0';
                        setNuevoPrecio({...nuevoPrecio, precio: val});
                    }} placeholder="0.00" className="w-full bg-slate-50 border border-emerald-200 rounded-xl p-4 text-center font-black text-lg outline-none focus:border-emerald-500 text-emerald-700 shadow-inner" />
                 </div>
               </div>

               {/* EXCEPCIÓN DE CRÉDITO */}
               <div className={`p-4 rounded-xl border transition-colors ${nuevoPrecio.permite_credito ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                   <label className={`flex items-center gap-3 cursor-pointer text-sm font-black ${nuevoPrecio.permite_credito ? "text-blue-900" : "text-orange-900"}`}>
                      <input type="checkbox" checked={nuevoPrecio.permite_credito} onChange={e => setNuevoPrecio({...nuevoPrecio, permite_credito: e.target.checked})} className={`w-5 h-5 ${nuevoPrecio.permite_credito ? "accent-blue-600" : "accent-orange-500"}`} />
                      Permitir pagar a crédito
                   </label>
                   <p className={`text-[10px] font-bold mt-1 pl-8 leading-tight ${nuevoPrecio.permite_credito ? "text-blue-600/80" : "text-orange-600/80"}`}>
                     {nuevoPrecio.permite_credito 
                       ? 'Si el cliente tiene línea de crédito, podrá apartarlo en su cuenta.' 
                       : 'Para este precio, el pago es ESTRICTO CONTADO al momento de surtir.'}
                   </p>
               </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0 rounded-b-[32px]">
               <button type="button" onClick={() => setModalPrecioVisible(false)} className="w-1/3 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">Cancelar</button>
               <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black text-lg rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition active:scale-95">
                 {editandoReglaId ? 'Actualizar Regla' : 'Añadir Regla'}
               </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default CatalogoArticulos;