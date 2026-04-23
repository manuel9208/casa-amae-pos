import React, { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, ShoppingCart, Users, Plus, Trash2, Edit, LogOut, MonitorPlay, BookOpen, AlertTriangle, CheckCircle2, Settings, Package, ShoppingBag, RotateCcw, Menu, X } from 'lucide-react';

const EMOJIS_POR_GIRO = {
  "☕ Cafetería & Bebidas": ["☕", "🍵", "🥤", "🧋", "🧃", "🧉", "🥛", "🍺", "🍷", "🥂", "🍹", "🍸", "🍶", "🧊"],
  "🍔 Comida Rápida": ["🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥙", "🍖", "🍗", "🥓"],
  "🥐 Desayunos & Pan": ["🥐", "🥯", "🍞", "🥖", "🥨", "🥞", "🧇", "🍳"],
  "🍰 Postres & Dulces": ["🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍮", "🍯"],
  "🍣 Asiática & Mariscos": ["🍣", "🍱", "🍚", "🍙", "🍜", "🍲", "🦐", "🍤", "🦀", "🦑", "🥡", "🥢"],
  "🥗 Saludable & Verde": ["🥗", "🥣", "🥑", "🥦", "🥬", "🥒", "🥕", "🌽", "🍅"],
  "🍽️ Restaurante General": ["🍽️", "🍴", "🥄", "🔥", "⭐", "🌶️", "🧀", "🧅", "🍄", "🥩"]
};

const AdminPanel = ({ user, onLogout, onGoToKiosco }) => {
  const [seccion, setSeccion] = useState('menu'); 
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [productos, setProductos] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  
  const [configGlobal, setConfigGlobal] = useState({ 
    nombre_negocio: '', whatsapp: '', banco: '', cuenta: '', titular: '', logo_url: '', 
    color_primario: '#2563eb', color_secundario: '#10b981', color_fondo: '#f1f5f9', 
    color_fondo_tarjetas: '#ffffff', color_texto_principal: '#1e293b', color_texto_secundario: '#64748b', 
    fuente_titulos: 'system-ui, sans-serif', fuente_textos: 'system-ui, sans-serif', 
    kiosco_mensaje: '¿Qué se te antoja hoy?', color_texto_kiosco: '#1e293b', 
    tv_msg_cola: 'EN COLA', tv_msg_progreso: 'PREPARANDO', tv_msg_listo: '¡LISTOS!' 
  });
  const [logoBlob, setLogoBlob] = useState(null);

  const [editandoId, setEditandoId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState(''); 
  const [precio, setPrecio] = useState('');
  const [tiempoPreparacion, setTiempoPreparacion] = useState(15);
  const [emoji, setEmoji] = useState('🍽️'); 
  const [categoriaSelect, setCategoriaSelect] = useState(''); 
  const [imagenBlob, setImagenBlob] = useState(null);
  const [aplicaTamanos, setAplicaTamanos] = useState(false);
  const [tamanos, setTamanos] = useState({ chico: { activo: false, extra: 0 }, mediano: { activo: false, extra: 15 }, grande: { activo: false, extra: 25 } });
  const [checkedIngredientes, setCheckedIngredientes] = useState([]);
  
  const [subSeccionCatalogos, setSubSeccionCatalogos] = useState('clasificaciones');
  const [recetaCategoriaFiltro, setRecetaCategoriaFiltro] = useState('');

  const [nuevaClasif, setNuevaClasif] = useState('');
  const [nuevaClasifDestino, setNuevaClasifDestino] = useState('Cocina'); 
  const [nuevaClasifEmoji, setNuevaClasifEmoji] = useState('🍽️');
  const [nuevaClasifImagen, setNuevaClasifImagen] = useState(null);
  const [editandoClasifId, setEditandoClasifId] = useState(null);
  
  const [nuevoIng, setNuevoIng] = useState({ clasificacion_id: '', nombre: '', tipo: 'base', precio_extra: 0, permite_extra: true });
  const [editandoIngId, setEditandoIngId] = useState(null); 
  
  // Estados para Usuarios
  const [usuariosDB, setUsuariosDB] = useState([]);
  const [editandoUsuarioId, setEditandoUsuarioId] = useState(null);
  const [uNombre, setUNombre] = useState('');
  const [uUser, setUUser] = useState('');
  const [uPass, setUPass] = useState('');
  const [uTelefono, setUTelefono] = useState('');
  const [uRol, setURol] = useState('cajero');
  const [uPermisos, setUPermisos] = useState({ menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false });

  const [subSeccionInventario, setSubSeccionInventario] = useState('insumos');
  const [insumosDB, setInsumosDB] = useState([]);
  const [nuevoInsumo, setNuevoInsumo] = useState({ nombre: '', unidad_medida: 'KL', cantidad_presentacion: '', costo_presentacion: '' });
  const [editandoInsumoId, setEditandoInsumoId] = useState(null);
  
  const [recetaActivaId, setRecetaActivaId] = useState('');
  const [recetaItems, setRecetaItems] = useState([]);
  const [nuevoItemReceta, setNuevoItemReceta] = useState({ insumo_id: '', cantidad_usada: '' });
  const [rendimientoCalculadora, setRendimientoCalculadora] = useState(1);

  const [modalCompra, setModalCompra] = useState(null);
  const [compraPaquetes, setCompraPaquetes] = useState('');
  const [compraCosto, setCompraCosto] = useState('');

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const baseUrl = apiUrl.replace('/api', '');
  
  // Variables de Permisos Granulares
  const isGlobalAdmin = user?.usuario === 'admin';
  const canViewMenu = isGlobalAdmin || user?.permisos?.menu !== false;
  const canViewInventario = isGlobalAdmin || user?.permisos?.inventario !== false;
  const canViewCatalogos = isGlobalAdmin || user?.permisos?.catalogos !== false;
  const canViewUsuarios = isGlobalAdmin || user?.permisos?.usuarios === true;
  const canViewConfig = isGlobalAdmin || user?.permisos?.configuracion === true;
  
  const [modalUI, setModalUI] = useState({ isOpen: false, tipo: 'info', titulo: '', mensaje: '', onConfirm: null });
  const showAlert = (titulo, mensaje, tipo = 'info') => setModalUI({ isOpen: true, tipo, titulo, mensaje, onConfirm: null });
  const showConfirm = (titulo, mensaje, onConfirmCallback) => setModalUI({ isOpen: true, tipo: 'confirm', titulo, mensaje, onConfirm: onConfirmCallback });
  const closeModalUI = () => setModalUI({ ...modalUI, isOpen: false });

  const cargarDatos = useCallback(async () => {
    const fetchSeguro = async (ruta, setter) => {
      try {
        const res = await fetch(`${apiUrl}/${ruta}`);
        if (res.ok) {
          const data = await res.json();
          setter(Array.isArray(data) ? data : []);
        }
      } catch (e) { console.error(`Error al cargar ${ruta}:`, e); }
    };
    if (canViewMenu) fetchSeguro('productos', setProductos);
    if (canViewCatalogos || canViewMenu) fetchSeguro('clasificaciones', setClasificaciones);
    if (canViewCatalogos || canViewMenu) fetchSeguro('ingredientes', setCatalogoIngredientes);
    if (canViewInventario) fetchSeguro('insumos', setInsumosDB);

    if (canViewConfig || canViewMenu) {
      try {
        const resConf = await fetch(`${apiUrl}/configuracion`);
        if (resConf.ok) {
          const dataConf = await resConf.json();
          if (dataConf && !dataConf.error) setConfigGlobal(dataConf);
        }
      } catch (e) {}
    }

    if (canViewUsuarios) fetchSeguro('usuarios', setUsuariosDB);
  }, [apiUrl, canViewMenu, canViewInventario, canViewCatalogos, canViewUsuarios, canViewConfig]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  useEffect(() => {
    let intervalo;
    if (seccion === 'inventario' && canViewInventario) {
      intervalo = setInterval(() => {
        fetch(`${apiUrl}/insumos`)
          .then(r => r.json())
          .then(data => setInsumosDB(Array.isArray(data) ? data : []))
          .catch(e => console.error("Error silenciado auto-refresh inventario", e));
      }, 5000);
    }
    return () => clearInterval(intervalo);
  }, [seccion, apiUrl, canViewInventario]);

  useEffect(() => {
    if (recetaActivaId && canViewInventario) { 
      const productoEncontrado = productos.find(p => Number(p.id) === Number(recetaActivaId));
      if (productoEncontrado) setRendimientoCalculadora(productoEncontrado.rendimiento || 1);
      
      fetch(`${apiUrl}/recetas/${recetaActivaId}`)
        .then(r => r.json())
        .then(data => setRecetaItems(Array.isArray(data) ? data : []))
        .catch(console.error); 
    } else { 
      setRecetaItems([]); 
      setRendimientoCalculadora(1); 
    }
  }, [recetaActivaId, productos, apiUrl, canViewInventario]);

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(configGlobal).forEach(key => formData.append(key, configGlobal[key]));
    if (logoBlob) formData.append('logo', logoBlob);
    try {
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) { showAlert("¡Éxito!", "Configuración actualizada.", "success"); setLogoBlob(null); cargarDatos(); }
    } catch (error) { showAlert("Error", "Error de conexión.", "error"); }
  };

  const restablecerBranding = () => {
    showConfirm("Restablecer", "¿Volver a diseño original?", () => {
      setConfigGlobal(prev => ({ 
        ...prev, color_primario: '#2563eb', color_secundario: '#10b981', color_fondo: '#f1f5f9', color_fondo_tarjetas: '#ffffff', color_texto_principal: '#1e293b', color_texto_secundario: '#64748b', fuente_titulos: 'system-ui, sans-serif', fuente_textos: 'system-ui, sans-serif', kiosco_mensaje: '¿Qué se te antoja hoy?', color_texto_kiosco: '#1e293b', tv_msg_cola: 'EN COLA', tv_msg_progreso: 'PREPARANDO', tv_msg_listo: '¡LISTOS!' 
      }));
    });
  };

  const limpiarFormularioMenu = () => { 
    setEditandoId(null); setNombre(''); setDescripcion(''); setPrecio(''); setTiempoPreparacion(15); setEmoji('🍽️'); setCategoriaSelect(''); setImagenBlob(null); setAplicaTamanos(false); setTamanos({ chico: { activo: false, extra: 0 }, mediano: { activo: false, extra: 15 }, grande: { activo: false, extra: 25 } }); setCheckedIngredientes([]); 
  };

  const guardarProducto = async (e) => {
    e.preventDefault(); 
    if (!categoriaSelect) return showAlert("Atención", "Selecciona clasificación.", "info");
    
    const opcionesArmadas = [];
    if (aplicaTamanos) { 
      if (tamanos.chico.activo) opcionesArmadas.push({ nombre: 'Chico', precioExtra: tamanos.chico.extra, tipo: 'variacion', categoria: 'Tamaño' }); 
      if (tamanos.mediano.activo) opcionesArmadas.push({ nombre: 'Mediano', precioExtra: tamanos.mediano.extra, tipo: 'variacion', categoria: 'Tamaño' }); 
      if (tamanos.grande.activo) opcionesArmadas.push({ nombre: 'Grande', precioExtra: tamanos.grande.extra, tipo: 'variacion', categoria: 'Tamaño' }); 
    }
    
    checkedIngredientes.forEach(id => { 
      const ing = catalogoIngredientes.find(i => Number(i.id) === Number(id)); 
      if (ing) opcionesArmadas.push({ nombre: ing.nombre, precioExtra: Number(ing.precio_extra), tipo: ing.tipo }); 
    });
    
    const nombreCategoria = clasificaciones.find(c => Number(c.id) === Number(categoriaSelect))?.nombre || 'General';
    const formData = new FormData(); formData.append('nombre', nombre); formData.append('descripcion', descripcion); formData.append('precio_base', aplicaTamanos ? 0 : precio); formData.append('tiempo_preparacion', tiempoPreparacion); formData.append('emoji', emoji); formData.append('categoria', nombreCategoria); formData.append('opciones', JSON.stringify(opcionesArmadas)); if (imagenBlob) formData.append('imagen', imagenBlob);
    try { 
      const url = editandoId ? `${apiUrl}/productos/${editandoId}` : `${apiUrl}/productos`; const res = await fetch(url, { method: editandoId ? 'PUT' : 'POST', body: formData }); 
      if (res.ok) { limpiarFormularioMenu(); cargarDatos(); showAlert("¡Éxito!", "Producto guardado.", "success"); } 
    } catch (error) { showAlert("Error", "Error de conexión.", "error"); }
  };

  const prepararEdicion = (p) => { 
    setEditandoId(p.id); setNombre(p.nombre); setDescripcion(p.descripcion || ''); setEmoji(p.emoji || '🍽️'); setTiempoPreparacion(p.tiempo_preparacion || 15); setImagenBlob(null); 
    const clasifEncontrada = clasificaciones.find(c => c.nombre === p.categoria); setCategoriaSelect(clasifEncontrada ? clasifEncontrada.id : ''); 
    let tieneTamanos = false; const newTamanos = { chico: { activo: false, extra: 0 }, mediano: { activo: false, extra: 0 }, grande: { activo: false, extra: 0 } }; const newChecks = []; 
    (p.opciones || []).forEach(o => { if (o.categoria === 'Tamaño') { tieneTamanos = true; const key = o.nombre.toLowerCase(); if (newTamanos[key] !== undefined) { newTamanos[key].activo = true; newTamanos[key].extra = o.precioExtra; } } else { const catItem = catalogoIngredientes.find(ci => ci.nombre === o.nombre && ci.tipo === o.tipo); if (catItem) newChecks.push(catItem.id); } }); 
    setAplicaTamanos(tieneTamanos); setTamanos(newTamanos); setCheckedIngredientes(newChecks); setPrecio(tieneTamanos ? '' : p.precio_base); 
  };

  const eliminarProducto = (id) => { showConfirm("Eliminar", "¿Seguro?", async () => { await fetch(`${apiUrl}/productos/${id}`, { method: 'DELETE' }); cargarDatos(); }); };
  const prepararEdicionClasif = (c) => { setEditandoClasifId(c.id); setNuevaClasif(c.nombre); setNuevaClasifDestino(c.destino || 'Cocina'); setNuevaClasifEmoji(c.emoji || '🍽️'); setNuevaClasifImagen(null); }; 
  const cancelarEdicionClasif = () => { setEditandoClasifId(null); setNuevaClasif(''); setNuevaClasifDestino('Cocina'); setNuevaClasifEmoji('🍽️'); setNuevaClasifImagen(null); };
  const guardarClasificacion = async (e) => { e.preventDefault(); const formData = new FormData(); formData.append('nombre', nuevaClasif); formData.append('destino', nuevaClasifDestino); formData.append('emoji', nuevaClasifEmoji); if (nuevaClasifImagen) formData.append('imagen', nuevaClasifImagen); try { const url = editandoClasifId ? `${apiUrl}/clasificaciones/${editandoClasifId}` : `${apiUrl}/clasificaciones`; const res = await fetch(url, { method: editandoClasifId ? 'PUT' : 'POST', body: formData }); if (res.ok) { cancelarEdicionClasif(); cargarDatos(); } } catch(e) {} };
  const eliminarClasif = (id) => { showConfirm("Cuidado", "¿Seguro?", async () => { await fetch(`${apiUrl}/clasificaciones/${id}`, { method: 'DELETE' }); cargarDatos(); }); };
  
  const prepararEdicionIngrediente = (ing) => { setEditandoIngId(ing.id); setNuevoIng({ clasificacion_id: ing.clasificacion_id, nombre: ing.nombre, tipo: ing.tipo, precio_extra: ing.precio_extra, permite_extra: ing.permite_extra }); }; 
  const cancelarEdicionIngrediente = () => { setEditandoIngId(null); setNuevoIng({ clasificacion_id: nuevoIng.clasificacion_id, nombre: '', tipo: 'base', precio_extra: 0, permite_extra: true }); };
  const guardarIngrediente = async (e) => { e.preventDefault(); const duplicado = catalogoIngredientes.find(i => Number(i.clasificacion_id) === Number(nuevoIng.clasificacion_id) && i.nombre.trim().toLowerCase() === nuevoIng.nombre.trim().toLowerCase() && Number(i.id) !== Number(editandoIngId)); if (duplicado) return showAlert("Duplicado", "Ya existe.", "info"); try { const url = editandoIngId ? `${apiUrl}/ingredientes/${editandoIngId}` : `${apiUrl}/ingredientes`; const res = await fetch(url, { method: editandoIngId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoIng) }); if (res.ok) { cancelarEdicionIngrediente(); cargarDatos(); } } catch(e) {} };
  const eliminarIng = (id) => { showConfirm("Eliminar", "¿Borrar ingrediente/extra?", async () => { await fetch(`${apiUrl}/ingredientes/${id}`, { method: 'DELETE' }); cargarDatos(); }); };
  
  // FUNCIONES DE USUARIO MEJORADAS
  const prepararEdicionUsuario = (u) => {
    setEditandoUsuarioId(u.id);
    setUNombre(u.nombre);
    setUUser(u.usuario);
    setUPass(''); // Se deja en blanco para no sobreescribir si no se escribe nada
    setUTelefono(u.telefono || '');
    setURol(u.rol);
    setUPermisos(u.permisos || { menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false });
  };

  const cancelarEdicionUsuario = () => {
    setEditandoUsuarioId(null);
    setUNombre(''); setUUser(''); setUPass(''); setUTelefono(''); setURol('cajero');
    setUPermisos({ menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false });
  };

  const guardarUsuario = async (e) => { 
    e.preventDefault(); 
    if(uTelefono.length !== 10) return showAlert("Atención", "Teléfono debe ser de 10 dígitos.", "info"); 
    
    const payload = { nombre: uNombre, usuario: uUser, rol: uRol, permisos: uPermisos, telefono: uTelefono };
    if (uPass) payload.password = uPass; // Solo enviar contraseña si se escribió una nueva

    try { 
      const url = editandoUsuarioId ? `${apiUrl}/usuarios/${editandoUsuarioId}` : `${apiUrl}/usuarios`;
      const method = editandoUsuarioId ? 'PUT' : 'POST';
      
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      }); 
      
      if (res.ok) { 
        showAlert("¡Excelente!", editandoUsuarioId ? "Usuario actualizado." : "Usuario creado.", "success"); 
        cancelarEdicionUsuario();
        cargarDatos(); 
      } 
    } catch (error) { showAlert("Error", "Error al guardar usuario.", "error"); } 
  };
  
  const eliminarUsuario = (id) => { showConfirm("Eliminar", "¿Borrar empleado?", async () => { await fetch(`${apiUrl}/usuarios/${id}`, { method: 'DELETE' }); cargarDatos(); }); };
  
  const handleRolChange = (e) => { 
    const nuevoRol = e.target.value; 
    setURol(nuevoRol); 
    
    if (nuevoRol === 'tv') { 
      const uniqueId = Math.floor(1000 + Math.random() * 9000); 
      setUNombre(`Pantalla TV ${uniqueId}`); setUUser(`tv_${uniqueId}`); setUPass('1234'); setUTelefono(`999${uniqueId}000`); 
      setUPermisos({ menu: false, inventario: false, catalogos: false, usuarios: false, configuracion: false });
    } else if (nuevoRol === 'admin') {
      setUNombre(''); setUUser(''); setUPass(''); setUTelefono('');
      setUPermisos({ menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false });
    } else { 
      setUNombre(''); setUUser(''); setUPass(''); setUTelefono(''); 
      setUPermisos({ menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false });
    } 
  };
  
  const prepararEdicionInsumo = (ins) => { setEditandoInsumoId(ins.id); setNuevoInsumo({ nombre: ins.nombre, unidad_medida: ins.unidad_medida, cantidad_presentacion: ins.cantidad_presentacion, costo_presentacion: ins.costo_presentacion }); };
  const cancelarEdicionInsumo = () => { setEditandoInsumoId(null); setNuevoInsumo({ nombre: '', unidad_medida: 'KL', cantidad_presentacion: '', costo_presentacion: '' }); };
  const guardarInsumo = async (e) => { 
      e.preventDefault(); 
      try { 
          const url = editandoInsumoId ? `${apiUrl}/insumos/${editandoInsumoId}` : `${apiUrl}/insumos`;
          const res = await fetch(url, { method: editandoInsumoId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoInsumo) }); 
          if (res.ok) { cancelarEdicionInsumo(); cargarDatos(); showAlert("¡Éxito!", editandoInsumoId ? "Insumo actualizado." : "Insumo registrado.", "success"); } 
      } catch(e) {} 
  };
  const eliminarInsumo = (id) => { showConfirm("Eliminar", "Asegúrate de que no esté en una receta.", async () => { await fetch(`${apiUrl}/insumos/${id}`, { method: 'DELETE' }); cargarDatos(); }); };
  
  const procesarCompraInsumo = async (e) => { 
      e.preventDefault(); 
      try { 
          const res = await fetch(`${apiUrl}/insumos/${modalCompra.id}/comprar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paquetes_comprados: compraPaquetes, nuevo_costo_paquete: compraCosto }) }); 
          if (res.ok) { setModalCompra(null); setCompraPaquetes(''); setCompraCosto(''); cargarDatos(); showAlert("Actualizado", `Agregado exitosamente.`, "success"); } 
      } catch(e) {} 
  };

  const reiniciarStockInsumo = (insumo) => {
    showConfirm(
      "Reiniciar a 0",
      `¿Deseas poner en 0 el stock de ${insumo.nombre}? \n\nÚsalo únicamente si se echó a perder, hubo merma o detectaste un descuadre en tu inventario.`,
      async () => {
        try {
          const res = await fetch(`${apiUrl}/insumos/${insumo.id}/reiniciar`, { method: 'PUT' });
          if (res.ok) {
            cargarDatos();
            showAlert("Stock Reiniciado", `El inventario de ${insumo.nombre} ahora está en 0.`, "success");
          }
        } catch(e) {}
      }
    );
  };
  
  const guardarItemReceta = async (e) => { e.preventDefault(); try { const payload = { producto_id: recetaActivaId, insumo_id: nuevoItemReceta.insumo_id, cantidad_usada: nuevoItemReceta.cantidad_usada }; const res = await fetch(`${apiUrl}/recetas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (res.ok) { setNuevoItemReceta({ insumo_id: '', cantidad_usada: '' }); const r = await fetch(`${apiUrl}/recetas/${recetaActivaId}`); const dataR = await r.json(); setRecetaItems(Array.isArray(dataR) ? dataR : []); } } catch(e) {} };
  const eliminarItemReceta = (id) => { fetch(`${apiUrl}/recetas/${id}`, { method: 'DELETE' }).then(() => { fetch(`${apiUrl}/recetas/${recetaActivaId}`).then(r => r.json()).then(dataR => setRecetaItems(Array.isArray(dataR) ? dataR : [])); }); };

  const guardarRendimiento = async () => {
    if (!recetaActivaId) return;
    try {
        const res = await fetch(`${apiUrl}/productos/${recetaActivaId}/rendimiento`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rendimiento: rendimientoCalculadora })
        });
        if (res.ok) { cargarDatos(); showAlert("¡Éxito!", "Porciones guardadas correctamente.", "success"); }
    } catch (error) { showAlert("Error", "No se pudo guardar.", "error"); }
  };

  let costoTotalRecetaCalculado = 0;
  const ingredientesParaClasifActiva = (catalogoIngredientes || []).filter(i => Number(i.clasificacion_id) === Number(categoriaSelect));
  const nombreCategoriaSeleccionada = (clasificaciones || []).find(c => Number(c.id) === Number(categoriaSelect))?.nombre;
  const productosEnCategoria = (productos || []).filter(p => p.categoria === nombreCategoriaSeleccionada);
  const ingsFiltradosVisual = (catalogoIngredientes || []).filter(i => Number(i.clasificacion_id) === Number(nuevoIng.clasificacion_id));
  
  const insumosCriticos = (insumosDB || []).filter(ins => (Number(ins.stock_actual) / Math.max(1, Number(ins.cantidad_presentacion))) < 1);
  const totalCalculadoModalCompra = (parseFloat(compraPaquetes) || 0) * (parseFloat(compraCosto) || 0);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* ================= OVERLAY MÓVIL ================= */}
      {menuAbierto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white p-6 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shrink-0 ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <button 
          onClick={() => setMenuAbierto(false)}
          className="lg:hidden absolute top-5 right-5 text-slate-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-8 px-2 mt-2 lg:mt-0">
          <div className="bg-blue-600 p-2 rounded-lg"><ShoppingCart size={24}/></div>
          <h1 className="text-xl font-black tracking-tighter">POS ADMIN</h1>
        </div>
        
        <button onClick={onGoToKiosco} className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 p-3 rounded-xl font-black mb-8 shadow-lg transition">
          <MonitorPlay size={20}/> IR AL KIOSCO
        </button>
        
        <nav className="space-y-2 flex-1 overflow-y-auto pr-2">
          {canViewMenu && (
            <button onClick={() => { setSeccion('menu'); setMenuAbierto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${seccion === 'menu' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-400'}`}>
              <LayoutGrid size={20} /> Gestión Menú
            </button>
          )}
          {canViewInventario && (
            <button onClick={() => { setSeccion('inventario'); setMenuAbierto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${seccion === 'inventario' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-400'}`}>
              <Package size={20} /> Inventario & Recetas
            </button>
          )}
          {canViewCatalogos && (
            <button onClick={() => { setSeccion('catalogos'); setMenuAbierto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${seccion === 'catalogos' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-400'}`}>
              <BookOpen size={20} /> Ingredientes y Extras
            </button>
          )}
          {canViewUsuarios && (
            <button onClick={() => { setSeccion('usuarios'); setMenuAbierto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${seccion === 'usuarios' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-400'}`}>
              <Users size={20} /> Usuarios
            </button>
          )}
          {canViewConfig && (
            <button onClick={() => { setSeccion('configuracion'); setMenuAbierto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${seccion === 'configuracion' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-400'}`}>
              <Settings size={20} /> Configuración
            </button>
          )}
        </nav>
        
        <div className="mt-auto pt-6 border-t border-slate-800 text-center">
          <p className="text-sm font-bold text-blue-400 mb-4">{user?.nombre}</p>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/10 font-bold transition">
            <LogOut size={20} /> Salir
          </button>
        </div>
      </div>

      {/* ================= CONTENIDO PRINCIPAL ================= */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Encabezado Móvil (Menu Hamburguesa) */}
        <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white p-4 shadow-md z-30">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-blue-500" />
            <h1 className="text-lg font-black tracking-tighter">POS ADMIN</h1>
          </div>
          <button onClick={() => setMenuAbierto(true)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
            <Menu size={24} />
          </button>
        </div>

        {/* Área scrolleable de formularios */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* ================= SECCIÓN MENÚ ================= */}
        {seccion === 'menu' && canViewMenu && (
          <div className="max-w-4xl mx-auto space-y-8 pb-12">
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
                   <input required placeholder="2. Nombre (Ej. Moka Frapuccino)" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg" />
                   <textarea placeholder="Descripción atractiva del platillo..." value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none h-24" />
                   
                   <div className="grid grid-cols-2 gap-4">
                     <input required={!aplicaTamanos} type="number" placeholder="Precio Base $" value={precio} onChange={e => setPrecio(e.target.value)} disabled={aplicaTamanos} className={`p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-lg ${aplicaTamanos ? 'bg-slate-200 text-slate-400 placeholder-slate-400' : 'bg-slate-50'}`} />
                     <select required value={emoji} onChange={e => setEmoji(e.target.value)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-3xl focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none">
                       {Object.entries(EMOJIS_POR_GIRO).map(([giro, emojis]) => (<optgroup key={giro} label={giro}>{emojis.map(em => <option key={em} value={em}>{em}</option>)}</optgroup>))}
                     </select>
                   </div>
                   
                   <div>
                     <label className="block text-xs font-black text-slate-400 uppercase mb-2">Tiempo de preparación (Minutos)</label>
                     <input required type="number" placeholder="Ej. 15" value={tiempoPreparacion} onChange={e => setTiempoPreparacion(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-lg outline-none" title="Tiempo de Preparación (Minutos)" />
                   </div>
                 </div>
                 
                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                   <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer mb-4 text-lg">
                     <input type="checkbox" checked={aplicaTamanos} onChange={e => { setAplicaTamanos(e.target.checked); if(e.target.checked) setPrecio(''); }} className="w-6 h-6 accent-blue-600" /> ¿Aplica Tamaños? (Chico/Med/Gde)
                   </label>
                   {aplicaTamanos && (
                     <div className="space-y-3 mt-4 bg-white p-5 rounded-2xl border border-slate-200">
                       {['chico', 'mediano', 'grande'].map(t => (
                         <div key={t} className="flex items-center gap-4">
                           <label className="flex items-center gap-3 text-lg w-32 capitalize cursor-pointer font-medium">
                             <input type="checkbox" checked={tamanos[t].activo} onChange={e => setTamanos({...tamanos, [t]: {...tamanos[t], activo: e.target.checked}})} className="w-5 h-5 accent-blue-600"/> {t}
                           </label>
                           {/* CORRECCIÓN: Evitamos que se force un 0 si el campo está vacío */}
                           <input type="number" placeholder="Precio $" disabled={!tamanos[t].activo} value={tamanos[t].extra} onChange={e => setTamanos({...tamanos, [t]: {...tamanos[t], extra: e.target.value === '' ? '' : Number(e.target.value)}})} className="w-32 p-3 font-bold border border-slate-200 rounded-xl disabled:bg-slate-100 outline-none focus:border-blue-500" />
                         </div>
                       ))}
                     </div>
                   )}
                 </div>

                 {categoriaSelect && (
                   <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                     <div className="mb-4"><h4 className="font-bold text-lg text-slate-800">Ingredientes Base (Visibles al Kiosco)</h4></div>
                     {ingredientesParaClasifActiva.filter(i => i.tipo === 'base').length === 0 ? (
                       <p className="text-sm text-orange-600 font-bold bg-orange-100 p-3 rounded-xl border border-orange-200">Aún no agregas ingredientes "BASE" a esta categoría.</p>
                     ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                         {ingredientesParaClasifActiva.filter(i => i.tipo === 'base').map(ing => (
                           <label key={ing.id} className="flex items-center gap-3 text-base cursor-pointer hover:bg-white p-2 rounded-xl transition border border-transparent hover:border-slate-200 shadow-sm">
                             <input type="checkbox" checked={checkedIngredientes.includes(ing.id)} onChange={(e) => { if(e.target.checked) setCheckedIngredientes([...checkedIngredientes, ing.id]); else setCheckedIngredientes(checkedIngredientes.filter(id => id !== ing.id)); }} className="w-5 h-5 accent-blue-600"/>
                             <span className="flex-1 font-medium">{ing.nombre}</span>
                           </label>
                         ))}
                       </div>
                     )}
                   </div>
                 )}

                 <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition cursor-pointer">
                    <label className="text-base font-bold text-slate-600 block mb-3 cursor-pointer">Sube una Foto Atractiva (Max 10MB)</label>
                    <input type="file" accept="image/png, image/jpeg" onChange={e => setImagenBlob(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer" />
                 </div>
                 
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
            
            {categoriaSelect ? (
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
                <h3 className="text-2xl font-black mb-6 text-slate-800 flex items-center gap-2">Vista Previa de: <span className="text-blue-600">{nombreCategoriaSeleccionada}</span></h3>
                {productosEnCategoria.length === 0 ? (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center"><span className="text-4xl block mb-2">👻</span><p className="text-slate-500 font-bold text-lg">Aún no hay productos guardados.</p></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {productosEnCategoria.map(p => { 
                      const tieneTamanos = p.opciones?.some(o => o.categoria === 'Tamaño'); 
                      return (
                        <div key={p.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex justify-between items-center hover:border-blue-200 hover:shadow-md transition group">
                          <div className="flex items-center gap-4">{p.imagen_url ? (
                            <img src={`${baseUrl}${p.imagen_url}`} alt={p.nombre} className="w-16 h-16 object-cover rounded-2xl shadow-sm" />) : (<span className="text-3xl bg-white w-16 h-16 flex items-center justify-center rounded-2xl shadow-sm">{p.emoji}</span>    )}
                          <div>
                              <p className="font-bold text-lg leading-tight text-slate-800">{p.nombre}</p>
                              <span className="text-blue-600 font-black text-sm block mt-1">{tieneTamanos ? 'Varios Tamaños' : `$${p.precio_base}`} • ⏱️ {p.tiempo_preparacion || 15}m</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => prepararEdicion(p)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-xl transition bg-white shadow-sm border border-slate-100"><Edit size={18}/></button>
                            <button onClick={() => eliminarProducto(p.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition bg-white shadow-sm border border-slate-100"><Trash2 size={18}/></button>
                          </div>
                        </div>
                      ); 
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-[40px] p-12 text-center opacity-80"><LayoutGrid className="mx-auto text-blue-300 mb-4" size={48} /><p className="text-blue-800 font-bold text-xl">Selecciona una clasificación arriba</p></div>
            )}
          </div>
        )}
        
        {/* ================= SECCIÓN INVENTARIO Y RECETAS ================= */}
        {seccion === 'inventario' && canViewInventario && ( 
          <div className="max-w-6xl mx-auto space-y-8 pb-12">
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
                      <button type="submit" className={`flex-1 p-4 text-white rounded-xl font-black shadow-lg transition ${editandoInsumoId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
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
                      <label className="block text-sm font-black text-blue-800 uppercase tracking-widest mb-3">2. Platillo a costear</label>
                      <select value={recetaActivaId} onChange={e => setRecetaActivaId(e.target.value)} className="w-full p-4 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg cursor-pointer shadow-sm">
                        <option value="">Seleccionar del Menú...</option>
                        {(productos || []).filter(p => !recetaCategoriaFiltro || p.categoria === recetaCategoriaFiltro).map(p => <option key={p.id} value={p.id}>{p.emoji} {p.nombre}</option>)}
                      </select>
                    </div>

                    <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100">
                      <label className="block text-sm font-black text-purple-800 uppercase tracking-widest mb-3">3. Porciones por Receta</label>
                      <div className="flex gap-2">
                        <input type="number" min="1" step="0.01" value={rendimientoCalculadora} onChange={e => setRendimientoCalculadora(e.target.value)} className="w-full p-4 bg-white border border-purple-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-black text-lg text-center shadow-sm" title="¿Cuántos platillos salen de esta receta?" />
                        <button onClick={guardarRendimiento} disabled={!recetaActivaId} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 text-white px-4 rounded-2xl font-bold transition shadow-sm" title="Guardar rendimiento en la base de datos">Guardar</button>
                      </div>
                    </div>
                  </div>

                  {recetaActivaId && (
                    <div className="mt-6 bg-slate-50 p-6 rounded-[24px] border border-slate-200">
                      <h4 className="font-bold text-slate-800 mb-4">4. Agregar Insumo a la Receta</h4>
                      <form onSubmit={guardarItemReceta} className="flex flex-col md:flex-row gap-4 items-stretch">
                        <div className="flex-1">
                          <select required value={nuevoItemReceta.insumo_id} onChange={e => setNuevoItemReceta({...nuevoItemReceta, insumo_id: e.target.value})} className="w-full h-full p-4 border border-slate-200 rounded-xl outline-none font-medium">
                            <option value="">Buscar Insumo...</option>
                            {(insumosDB || []).map(ins => <option key={ins.id} value={ins.id}>{ins.nombre} ({ins.unidad_medida})</option>)}
                          </select>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <input required type="number" step="0.01" placeholder="Cant. usada" value={nuevoItemReceta.cantidad_usada} onChange={e => setNuevoItemReceta({...nuevoItemReceta, cantidad_usada: e.target.value})} className="w-full p-4 border border-slate-200 rounded-xl outline-none font-bold" />
                          <span className="bg-slate-200 text-slate-600 px-4 py-4 rounded-xl font-black text-sm whitespace-nowrap">Uso</span>
                        </div>
                        <button type="submit" className="md:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">Añadir a Receta</button>
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
                             <th className="p-4">Ingrediente</th><th className="p-4">Uso</th><th className="p-4">Costo Calc.</th><th className="p-4 text-center">Acción</th>
                           </tr>
                         </thead>
                         <tbody>
                           {(recetaItems || []).length === 0 ? (
                             <tr><td colSpan="4" className="text-center p-6 text-slate-400 font-bold">Sin ingredientes. Usa el panel superior para añadir.</td></tr>
                           ) : (
                             recetaItems.map(item => {
                               const costoItem = (item.costo_presentacion / item.cantidad_presentacion) * item.cantidad_usada;
                               costoTotalRecetaCalculado += costoItem;
                               return (
                                 <tr key={item.id} className="border-b">
                                   <td className="p-4 font-bold text-slate-700">{item.insumo_nombre}</td>
                                   <td className="p-4 text-sm font-medium"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">{item.cantidad_usada} {item.unidad_medida}</span></td>
                                   <td className="p-4 font-black text-slate-600">${costoItem.toFixed(2)}</td>
                                   <td className="p-4 text-center"><button onClick={() => eliminarItemReceta(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button></td>
                                 </tr>
                               )
                             })
                           )}
                         </tbody>
                       </table>
                     </div>
                     
                     {recetaItems.length > 0 && (
                       <div className="flex flex-col md:flex-row justify-end gap-4 border-t border-slate-100 pt-6">
                         <div className="text-right bg-slate-50 p-4 rounded-2xl border border-slate-200">
                           <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Costo Total Receta</p>
                           <p className="text-2xl font-black text-slate-700">${costoTotalRecetaCalculado.toFixed(2)}</p>
                         </div>
                         <div className="text-right bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm">
                           <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-1">Costo por Platillo</p>
                           <p className="text-3xl font-black text-emerald-600">${(costoTotalRecetaCalculado / Math.max(1, rendimientoCalculadora)).toFixed(2)}</p>
                         </div>
                       </div>
                     )}
                   </div>
                )}
              </div> 
            )}
          </div> 
        )}
        
        {/* ================= SECCIÓN CATÁLOGOS ================= */}
        {seccion === 'catalogos' && canViewCatalogos && ( 
          <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <h2 className="text-3xl font-black mb-6 text-slate-800">Gestión de Ingredientes y Extras</h2>
            
            <div className="flex flex-col sm:flex-row bg-slate-200 p-1 rounded-2xl w-fit mb-8 gap-1">
              <button onClick={() => setSubSeccionCatalogos('clasificaciones')} className={`px-8 py-3 rounded-xl font-bold transition-all ${subSeccionCatalogos === 'clasificaciones' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Clasificaciones</button>
              <button onClick={() => setSubSeccionCatalogos('modificadores')} className={`px-8 py-3 rounded-xl font-bold transition-all ${subSeccionCatalogos === 'modificadores' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Ingredientes y Extras</button>
            </div>

            {subSeccionCatalogos === 'clasificaciones' ? (
              <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-200 relative">
                {editandoClasifId && (<div className="absolute -top-3 left-6 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-md uppercase tracking-widest">Editando Clasificación</div>)}
                <h3 className="text-xl font-bold mb-6 text-slate-800">Clasificaciones Principales</h3>
                
                <form onSubmit={guardarClasificacion} className={`flex flex-col gap-4 mb-8 p-6 rounded-3xl border ${editandoClasifId ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input required placeholder="Nombre (Ej. Sushis)" value={nuevaClasif} onChange={e => setNuevaClasif(e.target.value)} className="w-full p-4 bg-white border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
                    <select required value={nuevaClasifDestino} onChange={e => setNuevaClasifDestino(e.target.value)} className="w-full p-4 bg-white border rounded-xl outline-none font-bold text-slate-600"><option value="Cocina">A Cocina</option><option value="Barra">A Barra</option></select>
                    <select required value={nuevaClasifEmoji} onChange={e => setNuevaClasifEmoji(e.target.value)} className="w-full p-4 bg-white border rounded-xl text-center text-2xl outline-none cursor-pointer">
                      {Object.entries(EMOJIS_POR_GIRO).map(([giro, emojis]) => (<optgroup key={giro} label={giro}>{emojis.map(em => <option key={em} value={em}>{em}</option>)}</optgroup>))}
                    </select>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <input type="file" accept="image/png, image/jpeg" onChange={e => setNuevaClasifImagen(e.target.files[0])} className="flex-1 w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-white file:text-slate-700 file:shadow-sm hover:file:bg-slate-100" />
                    <button type="submit" className={`w-full md:w-auto px-8 py-4 rounded-xl font-bold transition shadow-sm text-white ${editandoClasifId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{editandoClasifId ? 'Guardar Cambios' : 'Agregar Clasificación'}</button>
                    {editandoClasifId && (<button type="button" onClick={cancelarEdicionClasif} className="w-full md:w-auto bg-slate-200 text-slate-700 px-6 py-4 rounded-xl hover:bg-slate-300 font-bold">Cancelar</button>)}
                  </div>
                </form>
                
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {(clasificaciones || []).map(c => ( 
                    <div key={c.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 transition hover:border-slate-200 ${editandoClasifId === c.id ? 'border-orange-300 bg-orange-50' : ''}`}>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        {c.imagen_url ? (<img src={`${baseUrl}${c.imagen_url}`} alt={c.nombre} className="w-16 h-16 object-cover rounded-xl shadow-sm" /> ) : (<span className="text-3xl bg-white w-16 h-16 flex items-center justify-center rounded-xl shadow-sm shrink-0">{c.emoji || '🍽️'}</span>                      )}
                      <div>
                          <span className="font-black text-xl text-slate-800 block mb-1">{c.nombre}</span>
                          <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-widest ${c.destino==='Barra' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>Destino: {c.destino || 'Cocina'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button onClick={() => prepararEdicionClasif(c)} className="text-blue-500 hover:text-white bg-blue-50 hover:bg-blue-500 p-3 rounded-xl transition"><Edit size={20}/></button>
                        <button onClick={() => eliminarClasif(c.id)} className="text-red-500 hover:text-white bg-red-50 hover:bg-red-500 p-3 rounded-xl transition"><Trash2 size={20}/></button>
                      </div>
                    </div> 
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-200 relative">
                {editandoIngId && (<div className="absolute -top-3 left-6 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-md uppercase tracking-widest">Editando Ingrediente/Extra</div>)}
                <h3 className="text-xl font-bold mb-6 text-slate-800">Ingredientes y Extras (Visual Kiosco)</h3>
                
                <form onSubmit={guardarIngrediente} className={`space-y-4 mb-8 p-6 rounded-3xl border ${editandoIngId ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-100'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select required disabled={editandoIngId} value={nuevoIng.clasificacion_id} onChange={e => setNuevoIng({...nuevoIng, clasificacion_id: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-700 disabled:opacity-50">
                      <option value="">Selecciona Clasificación...</option>
                      {(clasificaciones || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <input required placeholder="Ej. Aguacate" value={nuevoIng.nombre} onChange={e => setNuevoIng({...nuevoIng, nombre: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-700" />
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <select value={nuevoIng.tipo} onChange={e => setNuevoIng({...nuevoIng, tipo: e.target.value})} className="w-full md:w-48 p-4 rounded-xl border border-slate-200 outline-none font-bold text-slate-700">
                      <option value="base">Es Base</option><option value="extra">Solo Extra</option>
                    </select>
                    
                    {nuevoIng.tipo === 'base' && (
                      <label className="flex items-center gap-3 text-slate-600 font-bold cursor-pointer bg-white p-4 rounded-xl border border-slate-200 w-full md:w-auto">
                        <input type="checkbox" checked={!nuevoIng.permite_extra} onChange={e => setNuevoIng({...nuevoIng, permite_extra: !e.target.checked})} className="w-5 h-5 accent-red-500" /> ❌ NO puede pedirse como Extra
                      </label>
                    )}
                    
                    {(nuevoIng.tipo === 'extra' || (nuevoIng.tipo === 'base' && nuevoIng.permite_extra)) && (
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <span className="font-bold text-slate-500">Precio (+$$)</span>
                        <input required type="number" placeholder="Ej. 15" value={nuevoIng.precio_extra} onChange={e => setNuevoIng({...nuevoIng, precio_extra: e.target.value})} className="w-full md:w-32 p-4 rounded-xl border border-blue-200 outline-none font-black text-blue-700 focus:border-blue-500 bg-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4 pt-4">
                    {editandoIngId && (<button type="button" onClick={cancelarEdicionIngrediente} className="w-full md:w-1/3 bg-slate-200 text-slate-700 p-4 rounded-xl hover:bg-slate-300 font-bold text-lg">Cancelar</button>)}
                    <button type="submit" className={`flex-1 text-white p-4 rounded-xl font-bold text-lg transition shadow-sm ${editandoIngId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{editandoIngId ? 'Actualizar Ingrediente/Extra' : 'Guardar Ingrediente/Extra'}</button>
                  </div>
                </form>
                
                <div className="mt-8 border-t pt-6">
                  {!nuevoIng.clasificacion_id ? ( 
                    <div className="bg-slate-50 p-10 rounded-3xl border border-slate-200 text-center"><p className="text-lg text-slate-400 font-bold">Selecciona una clasificación arriba para ver sus ingredientes/extras.</p></div> 
                  ) : ( 
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {ingsFiltradosVisual.length === 0 ? ( 
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center"><p className="text-slate-400 font-bold">No hay extras aún.</p></div> 
                      ) : ( 
                        ingsFiltradosVisual.map(i => ( 
                          <div key={i.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-2xl border border-slate-100 transition hover:border-slate-200 ${editandoIngId === i.id ? 'border-orange-300 bg-orange-50' : 'bg-slate-50'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <span className="font-black text-lg text-slate-700">{i.nombre}</span>
                              <span className={`text-[10px] w-fit px-3 py-1 rounded-md font-black uppercase tracking-widest ${i.tipo==='extra'?'bg-orange-100 text-orange-600':'bg-emerald-100 text-emerald-600'}`}>
                                {i.tipo} {(i.tipo==='extra' || (i.tipo==='base' && i.permite_extra)) && `+$${i.precio_extra}`}{i.tipo==='base' && !i.permite_extra && ` (No Extra)`}
                              </span>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                              <button onClick={() => prepararEdicionIngrediente(i)} className="text-blue-500 hover:text-white bg-blue-100 hover:bg-blue-500 p-2.5 rounded-xl transition"><Edit size={18}/></button>
                              <button onClick={() => eliminarIng(i.id)} className="text-red-500 hover:text-white bg-red-100 hover:bg-red-500 p-2.5 rounded-xl transition"><Trash2 size={18}/></button>
                            </div>
                          </div> 
                        )) 
                      )}
                    </div> 
                  )}
                </div>
              </div>
            )}
          </div> 
        )}
        
        {/* ================= SECCIÓN CONFIGURACIÓN ================= */}
        {seccion === 'configuracion' && canViewConfig && ( 
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-3xl font-black mb-6">Configuración del Restaurante</h2>
            <form onSubmit={guardarConfiguracion} className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-4 border-b pb-2">1. Marca e Identidad</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Nombre del Negocio</label>
                    <input required value={configGlobal.nombre_negocio} onChange={e => setConfigGlobal({...configGlobal, nombre_negocio: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-lg" placeholder="Ej. Burger King" />
                  </div>
                  <div className="flex flex-col items-center justify-center bg-slate-50 border border-dashed rounded-xl p-4">
                    <label className="text-sm font-bold text-slate-600 block mb-2">Logo Principal</label>
                    {configGlobal.logo_url && !logoBlob && (<img src={`${baseUrl}${configGlobal.logo_url}`} alt="Logo" className="h-16 object-contain mb-3" />)}
                    <input type="file" accept="image/png, image/jpeg" onChange={e => setLogoBlob(e.target.files[0])} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-white file:text-slate-700 file:shadow-sm hover:file:bg-slate-200" />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4 border-b pb-2">2. Transferencias y Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold text-slate-600 mb-1">WhatsApp Pagos</label><input required type="tel" value={configGlobal.whatsapp} onChange={e => setConfigGlobal({...configGlobal, whatsapp: e.target.value.replace(/\D/g, '')})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold" /></div>
                  <div><label className="block text-sm font-bold text-slate-600 mb-1">Banco</label><input required value={configGlobal.banco} onChange={e => setConfigGlobal({...configGlobal, banco: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold" /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-600 mb-1">CLABE o Cuenta</label><input required value={configGlobal.cuenta} onChange={e => setConfigGlobal({...configGlobal, cuenta: e.target.value.replace(/\D/g, '')})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-black text-blue-600 tracking-widest text-lg" /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-600 mb-1">Titular</label><input required value={configGlobal.titular} onChange={e => setConfigGlobal({...configGlobal, titular: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold" /></div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4 border-b pb-2 text-blue-600 flex items-center gap-2"><span>🎨</span> 3. Branding del Kiosco y TV</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
                  <div className="space-y-4">
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Contenido Kiosco</p>
                    <input type="text" value={configGlobal.kiosco_mensaje} onChange={e => setConfigGlobal({...configGlobal, kiosco_mensaje: e.target.value})} className="w-full p-3 bg-white border rounded-xl outline-none font-bold" placeholder="Mensaje Kiosco..." />
                    <div className="flex gap-2 items-center"><input type="color" value={configGlobal.color_texto_kiosco} onChange={e => setConfigGlobal({...configGlobal, color_texto_kiosco: e.target.value})} className="h-10 w-10 rounded cursor-pointer" /><span className="text-xs font-bold text-slate-500 uppercase">Color del Mensaje</span></div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Títulos Pantalla TV</p>
                    <input type="text" value={configGlobal.tv_msg_cola} onChange={e => setConfigGlobal({...configGlobal, tv_msg_cola: e.target.value})} className="w-full p-2 bg-white border rounded-lg outline-none text-sm font-bold" placeholder="Columna 1..." />
                    <input type="text" value={configGlobal.tv_msg_progreso} onChange={e => setConfigGlobal({...configGlobal, tv_msg_progreso: e.target.value})} className="w-full p-2 bg-white border rounded-lg outline-none text-sm font-bold" placeholder="Columna 2..." />
                    <input type="text" value={configGlobal.tv_msg_listo} onChange={e => setConfigGlobal({...configGlobal, tv_msg_listo: e.target.value})} className="w-full p-2 bg-white border rounded-lg outline-none text-sm font-bold" placeholder="Columna 3..." />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div><label className="block text-sm font-bold text-slate-600 mb-1">Color Botones</label><div className="flex gap-2"><input type="color" value={configGlobal.color_primario} onChange={e => setConfigGlobal({...configGlobal, color_primario: e.target.value})} className="h-12 w-12 rounded cursor-pointer shrink-0" /><input type="text" value={configGlobal.color_primario} onChange={e => setConfigGlobal({...configGlobal, color_primario: e.target.value})} className="flex-1 w-full min-w-0 p-3 bg-slate-50 border rounded-xl outline-none font-bold uppercase text-sm" /></div></div>
                  <div><label className="block text-sm font-bold text-slate-600 mb-1">Secundario (Éxito)</label><div className="flex gap-2"><input type="color" value={configGlobal.color_secundario} onChange={e => setConfigGlobal({...configGlobal, color_secundario: e.target.value})} className="h-12 w-12 rounded cursor-pointer shrink-0" /><input type="text" value={configGlobal.color_secundario} onChange={e => setConfigGlobal({...configGlobal, color_secundario: e.target.value})} className="flex-1 w-full min-w-0 p-3 bg-slate-50 border rounded-xl outline-none font-bold uppercase text-sm" /></div></div>
                  <div><label className="block text-sm font-bold text-slate-600 mb-1">Fondo Pantallas</label><div className="flex gap-2"><input type="color" value={configGlobal.color_fondo} onChange={e => setConfigGlobal({...configGlobal, color_fondo: e.target.value})} className="h-12 w-12 rounded cursor-pointer shrink-0" /><input type="text" value={configGlobal.color_fondo} onChange={e => setConfigGlobal({...configGlobal, color_fondo: e.target.value})} className="flex-1 w-full min-w-0 p-3 bg-slate-50 border rounded-xl outline-none font-bold uppercase text-sm" /></div></div>
                  <div><label className="block text-sm font-bold text-slate-600 mb-1">Fondo Tarjetas</label><div className="flex gap-2"><input type="color" value={configGlobal.color_fondo_tarjetas} onChange={e => setConfigGlobal({...configGlobal, color_fondo_tarjetas: e.target.value})} className="h-12 w-12 rounded cursor-pointer shrink-0" /><input type="text" value={configGlobal.color_fondo_tarjetas} onChange={e => setConfigGlobal({...configGlobal, color_fondo_tarjetas: e.target.value})} className="flex-1 w-full min-w-0 p-3 bg-slate-50 border rounded-xl outline-none font-bold uppercase text-sm" /></div></div>
                  <div><label className="block text-sm font-bold text-slate-600 mb-1">Texto Principal</label><div className="flex gap-2"><input type="color" value={configGlobal.color_texto_principal} onChange={e => setConfigGlobal({...configGlobal, color_texto_principal: e.target.value})} className="h-12 w-12 rounded cursor-pointer shrink-0" /><input type="text" value={configGlobal.color_texto_principal} onChange={e => setConfigGlobal({...configGlobal, color_texto_principal: e.target.value})} className="flex-1 w-full min-w-0 p-3 bg-slate-50 border rounded-xl outline-none font-bold uppercase text-sm" /></div></div>
                  <div><label className="block text-sm font-bold text-slate-600 mb-1">Texto Secundario</label><div className="flex gap-2"><input type="color" value={configGlobal.color_texto_secundario} onChange={e => setConfigGlobal({...configGlobal, color_texto_secundario: e.target.value})} className="h-12 w-12 rounded cursor-pointer shrink-0" /><input type="text" value={configGlobal.color_texto_secundario} onChange={e => setConfigGlobal({...configGlobal, color_texto_secundario: e.target.value})} className="flex-1 w-full min-w-0 p-3 bg-slate-50 border rounded-xl outline-none font-bold uppercase text-sm" /></div></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
                  <div><label className="block text-sm font-bold text-slate-600 mb-1">Tipografía para Títulos</label><select value={configGlobal.fuente_titulos} onChange={e => setConfigGlobal({...configGlobal, fuente_titulos: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold text-sm"><option value="system-ui, sans-serif">Predeterminada del Sistema</option><option value="'Cinzel', serif">Cinzel (Clásica Elegante)</option><option value="'Playfair Display', serif">Playfair Display (Gourmet)</option><option value="'Poppins', sans-serif">Poppins (Moderna)</option></select></div>
                  <div><label className="block text-sm font-bold text-slate-600 mb-1">Tipografía Textos</label><select value={configGlobal.fuente_textos} onChange={e => setConfigGlobal({...configGlobal, fuente_textos: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold text-sm"><option value="system-ui, sans-serif">Predeterminada del Sistema</option><option value="'Montserrat', sans-serif">Montserrat (Limpia y Clara)</option></select></div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-4">
                <button type="button" onClick={restablecerBranding} className="w-full md:w-auto px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition border border-slate-200">↺ Restablecer Diseño</button>
                <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black text-lg shadow-lg transition">Guardar Configuración</button>
              </div>
            </form>
          </div> 
        )}
        
        {/* ================= SECCIÓN USUARIOS ================= */}
        {seccion === 'usuarios' && canViewUsuarios && ( 
          <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <h2 className="text-3xl font-black mb-6">Gestión de Empleados</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-3xl shadow-sm border lg:col-span-1 h-fit">
                {editandoUsuarioId && (
                  <div className="bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-md uppercase tracking-widest w-fit mb-4">Editando Empleado</div>
                )}
                <h3 className="text-xl font-bold mb-4">{editandoUsuarioId ? 'Actualizar Información' : 'Nuevo Empleado'}</h3>
                
                <form onSubmit={guardarUsuario} className="space-y-4">
                  <input required placeholder="Nombre (Ej. Juan Pérez)" value={uNombre} onChange={e => setUNombre(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
                  <input required placeholder="Usuario para acceder" value={uUser} onChange={e => setUUser(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
                  <input required={!editandoUsuarioId} type="text" placeholder={editandoUsuarioId ? "Nueva contraseña (Opcional)" : "Contraseña"} value={uPass} onChange={e => setUPass(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" title={editandoUsuarioId ? "Déjalo en blanco si no quieres cambiar la contraseña actual" : ""} />
                  <input required type="tel" maxLength="10" placeholder="Número Celular (10 dígitos)" value={uTelefono} onChange={e => setUTelefono(e.target.value.replace(/\D/g, ''))} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
                  <select value={uRol} onChange={handleRolChange} className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl outline-none font-black text-blue-900 cursor-pointer">
                    <option value="cajero">Cajero (Caja)</option><option value="cocina">Chef (Cocina/Barra)</option><option value="admin">Administrador</option><option value="tv">📺 Pantalla TV (KDS Cliente)</option>
                  </select>
                  
                  {uRol === 'admin' && (
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-3">
                      <p className="text-xs font-black text-orange-600 mb-2 uppercase tracking-widest">Permisos de Acceso (Admin)</p>
                      <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={uPermisos.menu !== false} onChange={e => setUPermisos({...uPermisos, menu: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Gestión de Menú
                      </label>
                      <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={uPermisos.inventario !== false} onChange={e => setUPermisos({...uPermisos, inventario: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Inventario & Recetas
                      </label>
                      <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={uPermisos.catalogos !== false} onChange={e => setUPermisos({...uPermisos, catalogos: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Ingredientes y Extras
                      </label>
                      <div className="border-t border-orange-200 my-2"></div>
                      <label className="flex items-center gap-3 text-sm font-black text-orange-800 cursor-pointer">
                        <input type="checkbox" checked={uPermisos.usuarios === true} onChange={e => setUPermisos({...uPermisos, usuarios: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Acceso a Usuarios
                      </label>
                      <label className="flex items-center gap-3 text-sm font-black text-orange-800 cursor-pointer">
                        <input type="checkbox" checked={uPermisos.configuracion === true} onChange={e => setUPermisos({...uPermisos, configuracion: e.target.checked})} className="accent-orange-500 w-5 h-5" /> Acceso a Configuración
                      </label>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-4 pt-2">
                    {editandoUsuarioId && (
                      <button type="button" onClick={cancelarEdicionUsuario} className="w-full md:w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 p-4 rounded-xl font-bold transition">Cancelar</button>
                    )}
                    <button type="submit" className={`flex-1 text-white p-4 rounded-xl font-black shadow-lg transition ${editandoUsuarioId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                      {editandoUsuarioId ? 'Actualizar Usuario' : 'Crear Empleado'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white p-6 rounded-3xl shadow-sm border">
                  <h3 className="text-xl font-bold mb-4">Plantilla Registrada</h3>
                  <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-2">
                    {usuariosDB.map(u => (
                      <div key={u.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl border transition gap-4 ${editandoUsuarioId === u.id ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                        <div>
                          <p className="font-bold text-lg text-slate-800 flex flex-wrap items-center gap-2">
                            {u.nombre} 
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${u.rol==='admin' ? 'bg-purple-100 text-purple-700' : u.rol==='cocina' ? 'bg-orange-100 text-orange-700' : u.rol==='tv' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                              {u.rol === 'tv' ? '📺 TV KDS' : u.rol}
                            </span>
                            {u.usuario === 'admin' && <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-md uppercase font-black tracking-widest">Admin Global</span>}
                          </p>
                          <p className="text-sm text-slate-500 font-medium mt-1">Usuario: <span className="font-bold text-slate-700">{u.usuario}</span> • Tel: <span className="font-bold text-slate-700">{u.telefono || 'N/A'}</span></p>
                        </div>
                        
                        {u.usuario !== 'admin' && (
                          <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                            <button onClick={() => prepararEdicionUsuario(u)} className="p-3 text-blue-500 hover:text-white hover:bg-blue-500 rounded-xl transition shadow-sm bg-blue-50 border border-blue-100 sm:border-none flex justify-center"><Edit size={20}/></button>
                            <button onClick={() => eliminarUsuario(u.id)} className="p-3 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition shadow-sm bg-red-50 border border-red-100 sm:border-none flex justify-center"><Trash2 size={20}/></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div> 
        )}
        </div>
      </div>

      {/* ================= MODALES ================= */}
      {modalCompra && ( 
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
              <button type="button" onClick={() => {setModalCompra(null); setCompraPaquetes(''); setCompraCosto('');}} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30">Guardar</button>
            </div>
          </form>
        </div> 
      )}
      
      {modalUI.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
            {modalUI.tipo === 'error' && <AlertTriangle className="text-red-500 w-16 h-16 mb-4" />}
            {modalUI.tipo === 'success' && <CheckCircle2 className="text-emerald-500 w-16 h-16 mb-4" />}
            {modalUI.tipo === 'confirm' && <AlertTriangle className="text-orange-500 w-16 h-16 mb-4" />}
            {modalUI.tipo === 'info' && <AlertTriangle className="text-blue-500 w-16 h-16 mb-4" />}
            <h3 className="text-2xl font-black text-slate-800 mb-2">{modalUI.titulo}</h3>
            <p className="text-slate-500 font-medium mb-8 whitespace-pre-line">{modalUI.mensaje}</p>
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              {modalUI.tipo === 'confirm' ? (
                <>
                  <button onClick={closeModalUI} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Cancelar</button>
                  <button onClick={() => { modalUI.onConfirm(); closeModalUI(); }} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition shadow-lg shadow-red-500/30">Confirmar</button>
                </>
              ) : (
                <button onClick={closeModalUI} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">Entendido</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;