import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, AlertTriangle, CheckCircle2, Menu } from 'lucide-react';
import Sidebar from './admin/Sidebar';
import Configuracion from './admin/Configuracion';
import GestionUsuarios from './admin/GestionUsuarios';
import Catalogos from './admin/Catalogos';
import Inventario from './admin/Inventario';
import GestionMenu from './admin/GestionMenu';

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
    tv_msg_cola: 'EN COLA', tv_msg_progreso: 'PREPARANDO', tv_msg_listo: '¡LISTOS!',
    tv_carrusel_activo: false, tv_carrusel_segundos: 10,
    tv_imagen_1: '', tv_imagen_2: '', tv_imagen_3: ''
  });
  const [logoBlob, setLogoBlob] = useState(null);
  const [tvBlob1, setTvBlob1] = useState(null);
  const [tvBlob2, setTvBlob2] = useState(null);
  const [tvBlob3, setTvBlob3] = useState(null);

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
  const [editandoClasifId, setEditandoClasifId] = useState(null);
  
  const [nuevoIng, setNuevoIng] = useState({ clasificacion_id: '', nombre: '', tipo: 'base', precio_extra: 0, permite_extra: true });
  const [editandoIngId, setEditandoIngId] = useState(null); 
  
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
    if (canViewUsuarios) fetchSeguro('usuarios', setUsuariosDB);

    if (canViewConfig || canViewMenu) {
      try {
        const resConf = await fetch(`${apiUrl}/configuracion`);
        if (resConf.ok) {
          const dataConf = await resConf.json();
          if (dataConf && !dataConf.error) setConfigGlobal(dataConf);
        }
      } catch (e) {}
    }
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
      fetch(`${apiUrl}/recetas/${recetaActivaId}`).then(r => r.json()).then(data => setRecetaItems(Array.isArray(data) ? data : [])).catch(console.error); 
    } else { 
      setRecetaItems([]); setRendimientoCalculadora(1); 
    }
  }, [recetaActivaId, productos, apiUrl, canViewInventario]);

  // =============== CONFIGURACIÓN ===============
  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(configGlobal).forEach(key => formData.append(key, configGlobal[key]));
    if (logoBlob) formData.append('logo', logoBlob);
    if (tvBlob1) formData.append('tv_imagen_1', tvBlob1);
    if (tvBlob2) formData.append('tv_imagen_2', tvBlob2);
    if (tvBlob3) formData.append('tv_imagen_3', tvBlob3);

    try {
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) { 
        showAlert("¡Éxito!", "Configuración actualizada.", "success"); 
        setLogoBlob(null); setTvBlob1(null); setTvBlob2(null); setTvBlob3(null);
        if (document.getElementById('logo-upload')) document.getElementById('logo-upload').value = '';
        if (document.getElementById('tv1-upload')) document.getElementById('tv1-upload').value = '';
        if (document.getElementById('tv2-upload')) document.getElementById('tv2-upload').value = '';
        if (document.getElementById('tv3-upload')) document.getElementById('tv3-upload').value = '';
        cargarDatos(); 
      }
    } catch (error) { showAlert("Error", "Error de conexión.", "error"); }
  };

  const restablecerBranding = () => {
    showConfirm("Restablecer Todo", "¿Deseas borrar toda la configuración y volver a los valores de fábrica?", () => {
      setConfigGlobal({ 
        nombre_negocio: '', whatsapp: '', banco: '', cuenta: '', titular: '', logo_url: '', 
        color_primario: '#2563eb', color_secundario: '#10b981', color_fondo: '#f1f5f9', 
        color_fondo_tarjetas: '#ffffff', color_texto_principal: '#1e293b', color_texto_secundario: '#64748b', 
        fuente_titulos: 'system-ui, sans-serif', fuente_textos: 'system-ui, sans-serif', 
        kiosco_mensaje: '¿Qué se te antoja hoy?', color_texto_kiosco: '#1e293b', 
        tv_msg_cola: 'EN COLA', tv_msg_progreso: 'PREPARANDO', tv_msg_listo: '¡LISTOS!', 
        tv_carrusel_activo: false, tv_carrusel_segundos: 10, tv_imagen_1: '', tv_imagen_2: '', tv_imagen_3: ''
      });
    });
  };

  // =============== GESTIÓN DE MENÚ ===============
  const limpiarFormularioMenu = () => { 
    setEditandoId(null); setNombre(''); setDescripcion(''); setPrecio(''); setTiempoPreparacion(15); setEmoji('🍽️'); 
    setImagenBlob(null); setAplicaTamanos(false); setTamanos({ chico: { activo: false, extra: 0 }, mediano: { activo: false, extra: 15 }, grande: { activo: false, extra: 25 } }); 
    setCheckedIngredientes([]); 
    const fileInput = document.getElementById('imagen-producto-upload');
    if (fileInput) fileInput.value = '';
  };

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
    
    let tieneTamanos = false; 
    const newTamanos = { chico: { activo: false, extra: 0 }, mediano: { activo: false, extra: 0 }, grande: { activo: false, extra: 0 } }; 
    const newChecks = []; 
    
    (p.opciones || []).forEach(o => { 
      if (o.categoria === 'Tamaño') { 
        tieneTamanos = true; 
        const key = o.nombre.toLowerCase(); 
        if (newTamanos[key] !== undefined) { newTamanos[key].activo = true; newTamanos[key].extra = o.precioExtra; } 
      } else { 
        const catItem = catalogoIngredientes.find(ci => ci.nombre === o.nombre && ci.tipo === o.tipo); 
        if (catItem) newChecks.push(catItem.id); 
      } 
    }); 
    
    setAplicaTamanos(tieneTamanos); 
    setTamanos(newTamanos); 
    setCheckedIngredientes(newChecks); 
    setPrecio(tieneTamanos ? '' : p.precio_base); 
  };

  const eliminarProducto = (id) => { showConfirm("Eliminar", "¿Seguro que deseas borrar este platillo?", async () => { await fetch(`${apiUrl}/productos/${id}`, { method: 'DELETE' }); cargarDatos(); }); };

  // =============== CATÁLOGOS ===============
  const prepararEdicionClasif = (c) => { setEditandoClasifId(c.id); setNuevaClasif(c.nombre); setNuevaClasifDestino(c.destino || 'Cocina'); setNuevaClasifEmoji(c.emoji || '🍽️'); setImagenBlob(null); }; 
  const cancelarEdicionClasif = () => { setEditandoClasifId(null); setNuevaClasif(''); setNuevaClasifDestino('Cocina'); setNuevaClasifEmoji('🍽️'); setImagenBlob(null); };
  
  const guardarClasificacion = async (e) => { 
    e.preventDefault(); const formData = new FormData(); formData.append('nombre', nuevaClasif); formData.append('destino', nuevaClasifDestino); formData.append('emoji', nuevaClasifEmoji); if (imagenBlob) formData.append('imagen', imagenBlob); 
    try { 
      const url = editandoClasifId ? `${apiUrl}/clasificaciones/${editandoClasifId}` : `${apiUrl}/clasificaciones`; 
      const res = await fetch(url, { method: editandoClasifId ? 'PUT' : 'POST', body: formData }); 
      if (res.ok) { cancelarEdicionClasif(); cargarDatos(); } 
    } catch(e) {} 
  };
  const eliminarClasif = (id) => { showConfirm("Cuidado", "¿Seguro que deseas borrar esta clasificación?", async () => { await fetch(`${apiUrl}/clasificaciones/${id}`, { method: 'DELETE' }); cargarDatos(); }); };
  
  const prepararEdicionIngrediente = (ing) => { setEditandoIngId(ing.id); setNuevoIng({ clasificacion_id: ing.clasificacion_id, nombre: ing.nombre, tipo: ing.tipo, precio_extra: ing.precio_extra, permite_extra: ing.permite_extra }); }; 
  const cancelarEdicionIngrediente = () => { setEditandoIngId(null); setNuevoIng({ clasificacion_id: '', nombre: '', tipo: 'base', precio_extra: 0, permite_extra: true }); };
  
  const guardarIngrediente = async (e) => { 
    e.preventDefault(); 
    const duplicado = catalogoIngredientes.find(i => i.nombre.trim().toLowerCase() === nuevoIng.nombre.trim().toLowerCase() && i.id !== editandoIngId); 
    if (duplicado) return showAlert("Atención", "Este ingrediente o extra ya existe en el catálogo.", "warning"); 
    
    try { 
      const url = editandoIngId ? `${apiUrl}/ingredientes/${editandoIngId}` : `${apiUrl}/ingredientes`; 
      const res = await fetch(url, { method: editandoIngId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoIng) }); 
      if (res.ok) { cancelarEdicionIngrediente(); cargarDatos(); } 
    } catch(e) {} 
  };
  const eliminarIng = (id) => { showConfirm("Eliminar", "¿Borrar ingrediente/extra?", async () => { await fetch(`${apiUrl}/ingredientes/${id}`, { method: 'DELETE' }); cargarDatos(); }); };
  
  // =============== USUARIOS ===============
  const prepararEdicionUsuario = (u) => {
    setEditandoUsuarioId(u.id); setUNombre(u.nombre); setUUser(u.usuario); setUPass(''); setUTelefono(u.telefono || ''); setURol(u.rol);
    setUPermisos(u.permisos || { menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false });
  };

  const cancelarEdicionUsuario = () => {
    setEditandoUsuarioId(null); setUNombre(''); setUUser(''); setUPass(''); setUTelefono(''); setURol('cajero');
    setUPermisos({ menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false });
  };

  const handleRolChange = (e) => { 
    const nuevoRol = e.target.value; 
    setURol(nuevoRol); 
    if (nuevoRol === 'tv') { 
      const uniqueId = Math.floor(1000 + Math.random() * 9000); 
      setUNombre(`Pantalla TV ${uniqueId}`); 
      setUUser(`tv_${uniqueId}`); 
      setUPass('1234'); 
      setUTelefono(`999${uniqueId}000`); 
      setUPermisos({ menu: false, inventario: false, catalogos: false, usuarios: false, configuracion: false });
    } else if (nuevoRol === 'admin') {
      setUNombre(''); setUUser(''); setUPass(''); setUTelefono('');
      setUPermisos({ menu: true, inventario: true, catalogos: true, usuarios: true, configuracion: true });
    } else { 
      setUNombre(''); setUUser(''); setUPass(''); setUTelefono(''); 
      setUPermisos({ menu: true, inventario: true, catalogos: true, usuarios: false, configuracion: false });
    } 
  };

  const guardarUsuario = async (e) => { 
    e.preventDefault(); 
    if(uTelefono.length !== 10) return showAlert("Atención", "Teléfono debe ser de 10 dígitos.", "info"); 
    const payload = { nombre: uNombre, usuario: uUser, rol: uRol, permisos: uPermisos, telefono: uTelefono };
    if (uPass) payload.password = uPass; 
    
    try { 
      const url = editandoUsuarioId ? `${apiUrl}/usuarios/${editandoUsuarioId}` : `${apiUrl}/usuarios`;
      const res = await fetch(url, { method: editandoUsuarioId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); 
      
      if (res.ok) { 
          showAlert("¡Excelente!", editandoUsuarioId ? "Usuario actualizado." : "Usuario creado.", "success"); 
          cancelarEdicionUsuario(); 
          cargarDatos(); 
      } else {
          // 👇 AQUÍ ESTÁ LA MAGIA: Leemos el mensaje de error del backend
          const dataErr = await res.json();
          showAlert("Atención", dataErr.error || "El usuario o teléfono ya existe. Intenta con otro.", "warning");
      }
    } catch (error) { 
      showAlert("Error", "Error de conexión al guardar usuario.", "error"); 
    } 
  };
  
  const eliminarUsuario = (id) => { showConfirm("Eliminar", "¿Borrar empleado?", async () => { await fetch(`${apiUrl}/usuarios/${id}`, { method: 'DELETE' }); cargarDatos(); }); };
  
  // =============== INVENTARIO ===============
  const prepararEdicionInsumo = (i) => { setEditandoInsumoId(i.id); setNuevoInsumo(i); };
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
    showConfirm("Reiniciar a 0", `¿Deseas poner en 0 el stock de ${insumo.nombre}? \n\nÚsalo únicamente si se echó a perder, hubo merma o detectaste un descuadre en tu inventario.`, async () => {
        try { const res = await fetch(`${apiUrl}/insumos/${insumo.id}/reiniciar`, { method: 'PUT' }); if (res.ok) { cargarDatos(); showAlert("Stock Reiniciado", `El inventario de ${insumo.nombre} ahora está en 0.`, "success"); } } catch(e) {}
    });
  };
  
  const guardarItemReceta = async (e) => { e.preventDefault(); try { const payload = { producto_id: recetaActivaId, insumo_id: nuevoItemReceta.insumo_id, cantidad_usada: nuevoItemReceta.cantidad_usada }; const res = await fetch(`${apiUrl}/recetas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (res.ok) { setNuevoItemReceta({ insumo_id: '', cantidad_usada: '' }); const r = await fetch(`${apiUrl}/recetas/${recetaActivaId}`); const dataR = await r.json(); setRecetaItems(Array.isArray(dataR) ? dataR : []); } } catch(e) {} };
  const eliminarItemReceta = (id) => { fetch(`${apiUrl}/recetas/${id}`, { method: 'DELETE' }).then(() => { fetch(`${apiUrl}/recetas/${recetaActivaId}`).then(r => r.json()).then(dataR => setRecetaItems(Array.isArray(dataR) ? dataR : [])); }); };

  const guardarRendimiento = async () => {
    if (!recetaActivaId) return;
    try { const res = await fetch(`${apiUrl}/productos/${recetaActivaId}/rendimiento`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rendimiento: rendimientoCalculadora }) }); if (res.ok) { cargarDatos(); showAlert("¡Éxito!", "Porciones guardadas correctamente.", "success"); } } catch (error) { showAlert("Error", "No se pudo guardar.", "error"); }
  };

  // =============== CÁLCULOS VISUALES ===============
  const ingredientesParaClasifActiva = (catalogoIngredientes || []).filter(i => Number(i.clasificacion_id) === Number(categoriaSelect));
  const nombreCategoriaSeleccionada = (clasificaciones || []).find(c => Number(c.id) === Number(categoriaSelect))?.nombre;
  const productosEnCategoria = (productos || []).filter(p => p.categoria === nombreCategoriaSeleccionada);
  const ingsFiltradosVisual = (catalogoIngredientes || []).filter(i => Number(i.clasificacion_id) === Number(nuevoIng.clasificacion_id));
  
  const insumosCriticos = (insumosDB || []).filter(ins => (Number(ins.stock_actual) / Math.max(1, Number(ins.cantidad_presentacion))) < 1);
  const totalCalculadoModalCompra = (parseFloat(compraPaquetes) || 0) * (parseFloat(compraCosto) || 0);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      <Sidebar 
        user={user} onLogout={onLogout} onGoToKiosco={onGoToKiosco} seccion={seccion} setSeccion={setSeccion}
        menuAbierto={menuAbierto} setMenuAbierto={setMenuAbierto} canViewMenu={canViewMenu}
        canViewInventario={canViewInventario} canViewCatalogos={canViewCatalogos} canViewUsuarios={canViewUsuarios} canViewConfig={canViewConfig}
      />

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Encabezado Móvil */}
        <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white p-4 shadow-md z-30">
          <div className="flex items-center gap-2"><ShoppingCart size={20} className="text-blue-500" /><h1 className="text-lg font-black tracking-tighter">POS ADMIN</h1></div>
          <button onClick={() => setMenuAbierto(true)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"><Menu size={24} /></button>
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {seccion === 'menu' && canViewMenu && (
          <GestionMenu 
            editandoId={editandoId} guardarProducto={guardarProducto} categoriaSelect={categoriaSelect} setCategoriaSelect={setCategoriaSelect}
            clasificaciones={clasificaciones} nombre={nombre} setNombre={setNombre} descripcion={descripcion} setDescripcion={setDescripcion}
            aplicaTamanos={aplicaTamanos} setAplicaTamanos={setAplicaTamanos} precio={precio} setPrecio={setPrecio} emoji={emoji} setEmoji={setEmoji}
            EMOJIS_POR_GIRO={EMOJIS_POR_GIRO} tiempoPreparacion={tiempoPreparacion} setTiempoPreparacion={setTiempoPreparacion} tamanos={tamanos} setTamanos={setTamanos}
            ingredientesParaClasifActiva={ingredientesParaClasifActiva} checkedIngredientes={checkedIngredientes} setCheckedIngredientes={setCheckedIngredientes}
            setImagenBlob={setImagenBlob} limpiarFormularioMenu={limpiarFormularioMenu} nombreCategoriaSeleccionada={nombreCategoriaSeleccionada}
            productosEnCategoria={productosEnCategoria} baseUrl={baseUrl} prepararEdicion={prepararEdicion} eliminarProducto={eliminarProducto}
          />
        )}
        
        {seccion === 'inventario' && canViewInventario && ( 
          <Inventario 
            subSeccionInventario={subSeccionInventario} setSubSeccionInventario={setSubSeccionInventario} insumosCriticos={insumosCriticos}
            editandoInsumoId={editandoInsumoId} nuevoInsumo={nuevoInsumo} setNuevoInsumo={setNuevoInsumo} guardarInsumo={guardarInsumo}
            cancelarEdicionInsumo={cancelarEdicionInsumo} insumosDB={insumosDB} setModalCompra={setModalCompra} setCompraCosto={setCompraCosto}
            reiniciarStockInsumo={reiniciarStockInsumo} prepararEdicionInsumo={prepararEdicionInsumo} eliminarInsumo={eliminarInsumo}
            recetaCategoriaFiltro={recetaCategoriaFiltro} setRecetaCategoriaFiltro={setRecetaCategoriaFiltro} recetaActivaId={recetaActivaId}
            setRecetaActivaId={setRecetaActivaId} clasificaciones={clasificaciones} productos={productos} rendimientoCalculadora={rendimientoCalculadora}
            setRendimientoCalculadora={setRendimientoCalculadora} guardarRendimiento={guardarRendimiento} nuevoItemReceta={nuevoItemReceta}
            setNuevoItemReceta={setNuevoItemReceta} guardarItemReceta={guardarItemReceta} recetaItems={recetaItems} eliminarItemReceta={eliminarItemReceta}
          />
        )}
        
        {seccion === 'catalogos' && canViewCatalogos && ( 
          <Catalogos 
            subSeccionCatalogos={subSeccionCatalogos} setSubSeccionCatalogos={setSubSeccionCatalogos} editandoClasifId={editandoClasifId}
            nuevaClasif={nuevaClasif} setNuevaClasif={setNuevaClasif} nuevaClasifDestino={nuevaClasifDestino} setNuevaClasifDestino={setNuevaClasifDestino}
            nuevaClasifEmoji={nuevaClasifEmoji} setNuevaClasifEmoji={setNuevaClasifEmoji} setNuevaClasifImagen={setImagenBlob}
            guardarClasificacion={guardarClasificacion} cancelarEdicionClasif={cancelarEdicionClasif} clasificaciones={clasificaciones}
            baseUrl={baseUrl} prepararEdicionClasif={prepararEdicionClasif} eliminarClasif={eliminarClasif} EMOJIS_POR_GIRO={EMOJIS_POR_GIRO}
            editandoIngId={editandoIngId} nuevoIng={nuevoIng} setNuevoIng={setNuevoIng} guardarIngrediente={guardarIngrediente}
            cancelarEdicionIngrediente={cancelarEdicionIngrediente} ingsFiltradosVisual={ingsFiltradosVisual} prepararEdicionIngrediente={prepararEdicionIngrediente} eliminarIng={eliminarIng}
          />
        )}
        
        {seccion === 'configuracion' && canViewConfig && ( 
          <Configuracion 
            configGlobal={configGlobal} setConfigGlobal={setConfigGlobal} guardarConfiguracion={guardarConfiguracion} logoBlob={logoBlob} setLogoBlob={setLogoBlob} 
            setTvBlob1={setTvBlob1} setTvBlob2={setTvBlob2} setTvBlob3={setTvBlob3}
            restablecerBranding={restablecerBranding} baseUrl={baseUrl}
          />
        )}
        
        {seccion === 'usuarios' && canViewUsuarios && ( 
          <GestionUsuarios 
            usuariosDB={usuariosDB} editandoUsuarioId={editandoUsuarioId} uNombre={uNombre} setUNombre={setUNombre} uUser={uUser} setUUser={setUUser}
            uPass={uPass} setUPass={setUPass} uTelefono={uTelefono} setUTelefono={setUTelefono} uRol={uRol} setURol={setURol} uPermisos={uPermisos}
            setUPermisos={setUPermisos} guardarUsuario={guardarUsuario} prepararEdicionUsuario={prepararEdicionUsuario} cancelarEdicionUsuario={cancelarEdicionUsuario}
            eliminarUsuario={eliminarUsuario} handleRolChange={handleRolChange}
          />
        )}
        </div>
      </div>

      {/* MODALES */}
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