// Archivo: ModalComedor.js
import React, { useState, useEffect, useMemo } from 'react';
import { ChefHat, XCircle, ShoppingBag, CheckSquare, Square, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

const ModalComedor = ({
    modalComedor, setModalComedor, empleadosPOS, pedidos, configGlobal,
    productos, clasificaciones, catalogoIngredientes, apiUrl, refrescarDatosCaja, lanzarImpresion
}) => {
    // ==========================================
    // ESTADOS PRINCIPALES
    // ==========================================
    const [paso, setPaso] = useState('pin'); 
    const [pinEmpleado, setPinEmpleado] = useState('');
    const [empleadoActivo, setEmpleadoActivo] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [carrito, setCarrito] = useState([]);
    const [categoriaActiva, setCategoriaActiva] = useState(null);
    
    const [alertaUI, setAlertaUI] = useState(null);
    
    // ==========================================
    // ESTADOS DE LÍMITES
    // ==========================================
    const [restantePlatillos, setRestantePlatillos] = useState(0);
    const [restanteBebidas, setRestanteBebidas] = useState(0);
    
    // ==========================================
    // ESTADOS DEL WIZARD NORMAL
    // ==========================================
    const [productoEnEspera, setProductoEnEspera] = useState(null);
    const [pasoPersonalizacion, setPasoPersonalizacion] = useState(0);
    const [opcionSeleccionada, setOpcionSeleccionada] = useState(null);
    const [saborSeleccionado, setSaborSeleccionado] = useState(null);
    const [gruposSeleccionados, setGruposSeleccionados] = useState({});
    const [gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados] = useState({});
    const [ingredientesBase, setIngredientesBase] = useState([]);
    const [ingredientesSustituidos, setIngredientesSustituidos] = useState({});
    const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
    const [notaProducto, setNotaProducto] = useState('');
    
    // ==========================================
    // ESTADOS DEL WIZARD PERSONALIZADO
    // ==========================================
    const [ingredientesLibres, setIngredientesLibres] = useState([]);
    
    const catBebidas = useMemo(() => {
        return typeof configGlobal?.comedor_clasif_bebidas === 'string' 
            ? JSON.parse(configGlobal.comedor_clasif_bebidas || '[]') 
            : (configGlobal?.comedor_clasif_bebidas || []);
    }, [configGlobal?.comedor_clasif_bebidas]);
    
    const catPlatillos = useMemo(() => {
        return typeof configGlobal?.comedor_clasif_platillos === 'string' 
            ? JSON.parse(configGlobal.comedor_clasif_platillos || '[]') 
            : (configGlobal?.comedor_clasif_platillos || []);
    }, [configGlobal?.comedor_clasif_platillos]);

    const resetWizard = () => {
        setProductoEnEspera(null);
        setPasoPersonalizacion(0);
        setOpcionSeleccionada(null);
        setSaborSeleccionado(null);
        setGruposSeleccionados({});
        setGruposOpcionalesSeleccionados({});
        setIngredientesBase([]);
        setIngredientesSustituidos({});
        setExtrasSeleccionados([]);
        setNotaProducto('');
    };

    const resetAll = () => {
        setPaso('pin');
        setPinEmpleado('');
        setEmpleadoActivo(null);
        setErrorMsg('');
        setCarrito([]);
        setCategoriaActiva(null);
        setIngredientesLibres([]);
        resetWizard();
    };

    useEffect(() => {
        if (!modalComedor) {
            resetAll();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modalComedor]);

    useEffect(() => {
        if (!empleadoActivo) return;
        
        const pres = typeof empleadoActivo.prestaciones === 'string' 
            ? JSON.parse(empleadoActivo.prestaciones || '{}') 
            : (empleadoActivo.prestaciones || {});
            
        const limiteP = pres.limite_platillos !== undefined ? pres.limite_platillos : 1;
        const limiteB = pres.limite_bebidas !== undefined ? pres.limite_bebidas : 1;
        
        let consumidosP = 0;
        let consumidosB = 0;
        
        const pedidosHoyEmp = pedidos.filter(p => {
            if (p.metodo_pago !== 'Comida Personal' || p.estado_preparacion === 'Cancelado') return false;
            
            const empNombreLimpio = String(empleadoActivo.nombre).trim().toLowerCase();
            const direccionLimpia = String(p.direccion_entrega || '').trim().toLowerCase();
            
            return direccionLimpia.includes(`a nombre de: ${empNombreLimpio}`);
        });
        
        pedidosHoyEmp.forEach(p => {
            let car = []; 
            try { 
                // 👇 FIX: Validación segura del tipo de dato para evitar que JSON.parse rompa con arreglos nativos.
                car = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : (p.carrito || []); 
            } catch(e) { 
                car = []; 
            }
            
            if (Array.isArray(car)) {
                car.forEach(item => {
                    const isBebida = catBebidas.includes(item.categoria);
                    const isPlatillo = catPlatillos.includes(item.categoria) || item.categoria === 'Personalizado';
                    
                    if (isBebida) consumidosB += (Number(item.cantidad) || 1);
                    else if (isPlatillo) consumidosP += (Number(item.cantidad) || 1);
                });
            }
        });
        
        // Escanear el Carrito actual
        carrito.forEach(i => {
            const isBebida = catBebidas.includes(i.categoria);
            const isPlatillo = catPlatillos.includes(i.categoria) || i.categoria === 'Personalizado';
            
            if (isBebida) consumidosB += (Number(i.cantidad) || 1);
            else if (isPlatillo) consumidosP += (Number(i.cantidad) || 1);
        });
        
        setRestantePlatillos(Math.max(0, limiteP - consumidosP));
        setRestanteBebidas(Math.max(0, limiteB - consumidosB));
        
    }, [empleadoActivo, carrito, pedidos, catBebidas, catPlatillos]);

    if (!modalComedor) return null;

    const autenticarEmpleado = (e) => {
        e.preventDefault();
        const emp = empleadosPOS.find(em => em.pin === pinEmpleado);
        if (emp) {
            setEmpleadoActivo(emp);
            setPaso('menu');
        } else {
            setErrorMsg("PIN Incorrecto.");
        }
    };

    const todasLasCategoriasAutorizadas = [...catBebidas, ...catPlatillos];

    const productosAutorizados = productos.filter(p => 
        (p.disponible === true || p.disponible === 'true') && 
        todasLasCategoriasAutorizadas.includes(p.categoria)
    );

    const categoriasUnicas = [...new Set(productosAutorizados.map(p => p.categoria))];
    const productosFiltrados = productosAutorizados.filter(p => p.categoria === categoriaActiva);

    const getPortadaCategoria = (catName) => {
        const clasifDB = clasificaciones.find(c => c.nombre === catName);
        return { 
            imagen_url: clasifDB?.imagen_url || null, 
            emoji: clasifDB?.emoji || '🍽️' 
        };
    };

    const abrirWizardNormal = (p) => {
        const esBebida = catBebidas.includes(p.categoria);
        if (esBebida && restanteBebidas <= 0) return setAlertaUI({ titulo: 'Límite Alcanzado', mensaje: 'Has consumido el máximo de bebidas permitidas en tu turno.', tipo: 'info' });
        if (!esBebida && restantePlatillos <= 0) return setAlertaUI({ titulo: 'Límite Alcanzado', mensaje: 'Has consumido el máximo de platillos permitidos en tu turno.', tipo: 'info' });
        
        resetWizard();
        setProductoEnEspera(p);
    };

    const anadirAlCarritoNormal = () => {
        const extrasFinales = [];
        if (opcionSeleccionada) extrasFinales.push({ nombre: opcionSeleccionada.nombre, precioExtra: 0, tipo: 'variacion' });
        if (saborSeleccionado) extrasFinales.push({ nombre: saborSeleccionado.nombre, precioExtra: 0, tipo: 'variacion' });
        
        Object.values(gruposSeleccionados).forEach(g => extrasFinales.push({ nombre: `🔸 ${g.categoria}: ${g.nombre}`, precioExtra: 0, tipo: 'grupo_obligatorio' }));
        Object.values(gruposOpcionalesSeleccionados).flat().forEach(g => extrasFinales.push({ nombre: `🔹 ${g.categoria}: ${g.nombre}`, precioExtra: 0, tipo: 'grupo_opcional' }));
        Object.entries(ingredientesSustituidos).forEach(([base, data]) => extrasFinales.push({ nombre: `🔄 Cambio: ${base} x ${data.nuevoNombre}`, precioExtra: 0, tipo: 'sustitucion' }));
        
        ingredientesBase.forEach(ib => extrasFinales.push({ nombre: `Sin ${ib}`, precioExtra: 0, tipo: 'base' }));
        extrasSeleccionados.forEach(ex => extrasFinales.push({ nombre: `🔸 ${ex.nombre}`, precioExtra: 0, tipo: 'extra' }));
        if (notaProducto.trim()) extrasFinales.push({ nombre: `📝 ${notaProducto}`, precioExtra: 0, tipo: 'nota' });

        let nombreCompleto = `[${productoEnEspera.categoria || 'General'}] ${productoEnEspera.nombre}`;
        if (opcionSeleccionada) nombreCompleto += ` (${opcionSeleccionada.nombre})`;

        const clasifObj = (clasificaciones || []).find(c => c.nombre === productoEnEspera.categoria);
        const destinoReal = clasifObj?.destino || 'Cocina';

        const nuevoItem = {
            idTicket: Date.now().toString(),
            producto_id: productoEnEspera.id,
            nombre: nombreCompleto,
            categoria: productoEnEspera.categoria,
            destino: destinoReal, 
            tiempo_preparacion: productoEnEspera.tiempo_preparacion,
            precio_base: 0, 
            precioFinal: 0, 
            cantidad: 1, 
            opciones: [], 
            extras: extrasFinales
        };

        setCarrito([...carrito, nuevoItem]);
        setProductoEnEspera(null);
    };

    const procesarArmadoLibre = () => {
        if (ingredientesLibres.length === 0) return setAlertaUI({ titulo: 'Platillo Vacío', mensaje: 'Debes seleccionar al menos un ingrediente para armar tu platillo.', tipo: 'error' });
        
        const nuevoItem = {
            idTicket: Date.now().toString(),
            producto_id: 'custom_comedor',
            nombre: `[Cocina] Platillo Personalizado (Personal)`,
            categoria: 'Personalizado', 
            destino: 'Cocina', 
            tiempo_preparacion: 10,
            precio_base: 0, 
            precioFinal: 0, 
            cantidad: 1, 
            opciones: [],
            extras: ingredientesLibres.map(ing => ({ nombre: ing.nombre, precioExtra: 0, tipo: 'ingrediente_libre' }))
        };
        
        setCarrito([...carrito, nuevoItem]);
        setPaso('menu');
        setIngredientesLibres([]);
    };

    const generarComandaComedor = async () => {
        if (carrito.length === 0 || isSubmitting) return;
        setIsSubmitting(true);

        const paquete = {
            cliente_id: null,
            tipo_consumo: 'Local',
            metodo_pago: 'Comida Personal',
            total: 0, 
            costo_envio: 0,
            carrito: carrito,
            origen: 'Caja',
            direccion_entrega: `A NOMBRE DE: ${empleadoActivo.nombre} | COMEDOR (${empleadoActivo.rol})`,
            estado_preparacion: 'Finalizado', 
            mesa: null, 
            cupon_codigo: null
        };

        try {
            const res = await fetch(`${apiUrl}/pedidos`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(paquete) 
            });
            
            if (res.ok) {
                const data = await res.json();
                refrescarDatosCaja();
                if (configGlobal?.ticket_impresion_activa) lanzarImpresion(data);
                setModalComedor(false);
            } else {
                setAlertaUI({ titulo: 'Error al Guardar', mensaje: 'Ocurrió un problema al procesar la comanda en la base de datos.', tipo: 'error' });
            }
        } catch (e) { 
            setAlertaUI({ titulo: 'Sin Conexión', mensaje: 'No se pudo contactar con el servidor. Verifica tu red.', tipo: 'error' });
        }
        setIsSubmitting(false);
    };

    const ingredientesCocina = catalogoIngredientes.filter(i => !catBebidas.includes(i.clasificacion_nombre));
    const ingredientesUnicosMap = new Map();
    ingredientesCocina.forEach(i => { 
        if(i.permite_extra !== false) ingredientesUnicosMap.set(i.nombre, i); 
    });
    const catalogoLibre = Array.from(ingredientesUnicosMap.values()).sort((a,b) => a.clasificacion_nombre.localeCompare(b.clasificacion_nombre));

    let pasosWiz = [];
    if (productoEnEspera) {
        const tamanosList = (productoEnEspera.opciones || []).filter(o => o.categoria === 'Tamaño');
        const saboresList = (productoEnEspera.opciones || []).filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
        const gruposObligatoriosList = [...new Set((productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_obligatorio').map(o => o.categoria))];
        const objGruposOpcionales = {};
        
        (productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_opcional').forEach(o => {
            if (!objGruposOpcionales[o.categoria]) objGruposOpcionales[o.categoria] = { limite: o.limite || 1, opciones: [] };
            objGruposOpcionales[o.categoria].opciones.push(o);
        });

        if (tamanosList.length > 0) {
            pasosWiz.push({ id: 'tamano', tipo: 'tamaño', titulo: 'Elige el Tamaño *', opciones: tamanosList });
        }
        if (saboresList.length > 0) {
            pasosWiz.push({ id: 'sabor', tipo: 'sabor', titulo: 'Elige un Sabor *', opciones: saboresList.sort((a, b) => a.nombre.localeCompare(b.nombre)) });
        }
        
        gruposObligatoriosList.forEach(g => {
            pasosWiz.push({ 
                id: `grupo_obl_${g}`, 
                tipo: 'grupo_obligatorio', 
                titulo: `Elige: ${g} *`, 
                categoria: g, 
                opciones: (productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_obligatorio' && o.categoria === g).sort((a, b) => a.nombre.localeCompare(b.nombre)) 
            });
        });
        
        Object.keys(objGruposOpcionales).forEach(g => {
            pasosWiz.push({ 
                id: `grupo_opc_${g}`, 
                tipo: 'grupo_opcional', 
                titulo: `Personaliza: ${g}`, 
                categoria: g, 
                limite: objGruposOpcionales[g].limite, 
                opciones: objGruposOpcionales[g].opciones.sort((a, b) => a.nombre.localeCompare(b.nombre)) 
            });
        });
        
        const bases = (productoEnEspera.opciones || []).filter(o => o.tipo === 'base').sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        if (bases.length > 0) {
            pasosWiz.push({ id: 'quitar_ingredientes', tipo: 'quitar_ingredientes', titulo: 'Modificar Ingredientes Base', opciones: bases });
        }
        
        pasosWiz.push({ id: 'extras_notas', tipo: 'extras_notas', titulo: 'Añadir Extras y Notas' });
    }
    const pasoActualObj = pasosWiz[pasoPersonalizacion] || null;

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-slate-50 w-full max-w-7xl h-[95vh] rounded-[36px] shadow-2xl overflow-hidden flex flex-col relative">
                
                {alertaUI && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
                        <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${alertaUI.tipo === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                {alertaUI.tipo === 'error' ? <AlertTriangle size={40}/> : <Info size={40}/>}
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">{alertaUI.titulo}</h3>
                            <p className="text-slate-500 font-medium mb-8 leading-relaxed">{alertaUI.mensaje}</p>
                            <button onClick={() => setAlertaUI(null)} className={`w-full text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition ${alertaUI.tipo === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}>
                                Entendido
                            </button>
                        </div>
                    </div>
                )}

                <button onClick={() => setModalComedor(false)} className="absolute top-4 right-4 z-50 bg-white shadow-md hover:bg-red-100 text-slate-400 hover:text-red-500 p-2 rounded-full transition">
                    <XCircle size={28} />
                </button>

                {paso === 'pin' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in zoom-in-95">
                        <div className="bg-white p-10 rounded-[40px] shadow-xl w-full max-w-md text-center border border-slate-100">
                            <div className="bg-indigo-100 text-indigo-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <ChefHat size={48} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Comedor Personal</h2>
                            <p className="text-slate-500 font-medium mb-8">Ingresa tu PIN para solicitar tu comida de turno.</p>
                            <form onSubmit={autenticarEmpleado}>
                                <input 
                                    type="password" 
                                    maxLength="4" 
                                    autoFocus 
                                    value={pinEmpleado} 
                                    onChange={e => {
                                        setPinEmpleado(e.target.value.replace(/\D/g, '')); 
                                        setErrorMsg('');
                                    }} 
                                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl p-5 text-center text-4xl font-black outline-none transition-all tracking-[0.5em] text-slate-800 mb-6" 
                                    placeholder="****" 
                                />
                                {errorMsg && (
                                    <p className="text-red-500 font-bold text-sm mb-4 bg-red-50 p-2 rounded-lg">{errorMsg}</p>
                                )}
                                <button 
                                    type="submit" 
                                    disabled={pinEmpleado.length !== 4} 
                                    className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 active:scale-95"
                                >
                                    Entrar
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {paso === 'menu' && (
                    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden animate-in slide-in-from-right">
                        <div className="w-full lg:w-2/3 flex flex-col bg-slate-50 lg:border-r border-slate-200 overflow-y-auto lg:overflow-hidden h-1/2 lg:h-full">
                            <div className="p-4 md:p-6 bg-white shadow-sm shrink-0 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">Menú Comedor</h2>
                                    <p className="text-xs md:text-sm font-bold text-slate-500 mt-1">Hola, {empleadoActivo?.nombre}</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest ${restantePlatillos > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                        Platillos Disp: {restantePlatillos}
                                    </span>
                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest ${restanteBebidas > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>
                                        Bebidas Disp: {restanteBebidas}
                                    </span>
                                </div>
                            </div>

                            {!categoriaActiva ? (
                                <div className="p-4 md:p-6 grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-y-auto custom-scrollbar">
                                    <button 
                                        onClick={() => { 
                                            if(restantePlatillos <= 0) return setAlertaUI({ titulo: 'Límite Alcanzado', mensaje: 'Has consumido el máximo de platillos permitidos en tu turno.', tipo: 'info' }); 
                                            setPaso('armar_libre'); 
                                        }} 
                                        className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl p-4 md:p-6 flex flex-col items-center justify-center gap-4 shadow-lg hover:shadow-xl transition-all active:scale-95 h-48 border-4 border-orange-200"
                                    >
                                        <span className="text-5xl drop-shadow-md">🥗</span>
                                        <span className="font-black text-lg text-white text-center leading-tight">Armar Platillo Libre</span>
                                    </button>

                                    {categoriasUnicas.map(cat => {
                                        const { imagen_url, emoji } = getPortadaCategoria(cat);
                                        return (
                                            <button 
                                                key={cat} 
                                                onClick={() => setCategoriaActiva(cat)} 
                                                className="bg-white rounded-3xl md:rounded-[32px] p-4 md:p-6 flex flex-col items-center justify-center gap-2 md:gap-4 hover:shadow-xl transition-all border border-slate-100 group active:scale-95 min-h-[140px] md:h-48"
                                            >
                                                {imagen_url ? (
                                                    <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-50 rounded-2xl p-2 group-hover:scale-110 transition-transform">
                                                        <img src={imagen_url} alt={cat} className="w-full h-full object-contain" />
                                                    </div>
                                                ) : (
                                                    <span className="text-5xl md:text-6xl group-hover:scale-110 transition-transform drop-shadow-sm">{emoji}</span>
                                                )}
                                                <span className="font-black text-base md:text-xl text-slate-700 text-center leading-tight">{cat}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col h-full">
                                    <div className="p-3 md:p-4 flex items-center gap-3 md:gap-4 border-b border-slate-200 bg-white shrink-0">
                                        <button 
                                            onClick={() => setCategoriaActiva(null)} 
                                            className="px-4 md:px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs md:text-sm rounded-xl transition"
                                        >
                                            ← Volver
                                        </button>
                                        <h3 className="text-lg md:text-2xl font-black text-slate-800">{categoriaActiva}</h3>
                                    </div>
                                    <div className="p-4 md:p-6 grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-y-auto custom-scrollbar pb-10">
                                        {productosFiltrados.map(p => (
                                            <button 
                                                key={p.id} 
                                                onClick={() => abrirWizardNormal(p)} 
                                                className="bg-white rounded-3xl p-3 md:p-5 flex flex-col items-center text-center hover:shadow-xl transition-all border border-slate-100 group active:scale-95"
                                            >
                                                {p.imagen_url ? (
                                                    <div className="w-20 h-20 md:w-24 md:h-24 mb-3 md:mb-4 rounded-2xl overflow-hidden shadow-sm">
                                                        <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                    </div>
                                                ) : (
                                                    <span className="text-5xl md:text-6xl mb-3 md:mb-4 group-hover:scale-110 transition-transform drop-shadow-sm">{p.emoji}</span>
                                                )}
                                                <span className="font-black text-slate-800 leading-tight mb-2 text-sm md:text-base">{p.nombre}</span>
                                                <span className="text-indigo-600 font-black bg-indigo-50 px-2 md:px-3 py-1 rounded-lg text-[10px] md:text-xs uppercase tracking-widest">
                                                    Gratis (Prestación)
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CARRITO COMEDOR */}
                        <div className="w-full lg:w-1/3 bg-white flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.03)] z-10 shrink-0 h-1/2 lg:h-full border-t border-slate-200 lg:border-t-0">
                            <div className="p-4 md:p-6 bg-slate-50 border-b border-slate-200 shrink-0">
                                <div className="flex items-center gap-2 md:gap-3 mb-2">
                                    <div className="bg-indigo-100 p-1.5 md:p-2 rounded-xl text-indigo-600"><ShoppingBag size={20} /></div>
                                    <h3 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight">Tu Comida</h3>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 bg-slate-50/50 custom-scrollbar">
                                {carrito.length === 0 ? (
                                    <p className="text-center text-slate-400 font-bold mt-10">Añade tu comida aquí.</p>
                                ) : (
                                    carrito.map(item => (
                                        <div key={item.idTicket} className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm relative">
                                            <p className="font-black text-xs md:text-sm leading-tight pr-4">{item.nombre}</p>
                                            <ul className="text-[9px] md:text-[10px] space-y-0.5 mb-2 md:mb-3 mt-1">
                                                {item.extras?.map((e, idx) => (
                                                    <li key={idx} className="text-slate-500 font-bold leading-tight">{e.nombre}</li>
                                                ))}
                                            </ul>
                                            <div className="flex justify-between items-center mt-2 border-t border-slate-50 pt-2 md:pt-3">
                                                <p className="font-black text-indigo-600 text-[10px] uppercase tracking-widest">Prestación $0.00</p>
                                            </div>
                                            <button 
                                                onClick={() => setCarrito(carrito.filter(x => x.idTicket !== item.idTicket))} 
                                                className="absolute right-2 top-2 text-slate-300 hover:text-red-500"
                                            >
                                                <XCircle size={18} className="md:w-5 md:h-5"/>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            <div className="p-4 md:p-6 bg-white border-t border-slate-100 shrink-0">
                                <button 
                                    disabled={carrito.length === 0 || isSubmitting} 
                                    onClick={generarComandaComedor} 
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black text-sm md:text-base uppercase tracking-widest shadow-lg shadow-indigo-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={20}/> Registrar y Finalizar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {paso === 'armar_libre' && (
                    <div className="flex-1 flex flex-col bg-white overflow-hidden animate-in slide-in-from-bottom-4">
                        <div className="p-4 md:p-6 bg-slate-50 border-b border-slate-200 shrink-0 flex items-center gap-4">
                            <button 
                                onClick={() => { setPaso('menu'); setIngredientesLibres([]); }} 
                                className="px-4 py-2 bg-white text-slate-600 font-black text-xs rounded-xl shadow-sm border border-slate-200"
                            >
                                ← Volver
                            </button>
                            <div>
                                <h3 className="text-xl md:text-2xl font-black text-slate-800">Armar Platillo Libre</h3>
                                <p className="text-xs font-bold text-slate-500">Selecciona los ingredientes que vas a consumir.</p>
                            </div>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {catalogoLibre.map(ing => {
                                    const seleccionado = ingredientesLibres.some(i => i.nombre === ing.nombre);
                                    return (
                                        <button 
                                            key={ing.id} 
                                            onClick={() => {
                                                if (seleccionado) {
                                                    setIngredientesLibres(ingredientesLibres.filter(i => i.nombre !== ing.nombre));
                                                } else {
                                                    setIngredientesLibres([...ingredientesLibres, ing]);
                                                }
                                            }} 
                                            className={`p-4 rounded-2xl border-2 font-bold text-left transition-all flex flex-col justify-between min-h-[80px] ${seleccionado ? 'bg-orange-50 border-orange-500 shadow-md scale-105' : 'bg-white border-slate-100 hover:border-orange-200'}`}
                                        >
                                            <div className="flex justify-between w-full mb-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">{ing.clasificacion_nombre}</span>
                                                {seleccionado ? <CheckSquare size={16} className="text-orange-600"/> : <Square size={16} className="text-slate-300"/>}
                                            </div>
                                            <span className={`text-sm leading-tight ${seleccionado ? 'text-orange-800' : 'text-slate-700'}`}>{ing.nombre}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="p-6 bg-white border-t border-slate-200 shrink-0 flex justify-between items-center">
                            <p className="font-black text-orange-600">{ingredientesLibres.length} Ingredientes seleccionados</p>
                            <button 
                                disabled={ingredientesLibres.length === 0} 
                                onClick={procesarArmadoLibre} 
                                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-black text-lg shadow-lg disabled:opacity-50 transition active:scale-95"
                            >
                                Confirmar y Añadir a Orden
                            </button>
                        </div>
                    </div>
                )}

                {/* WIZARD NORMAL INCRUSTADO */}
                {productoEnEspera && pasoActualObj && paso === 'menu' && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in">
                        
                        <div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-2">
                            {pasoPersonalizacion > 0 && (
                                <button onClick={() => setPasoPersonalizacion(p => p - 1)} className="text-white bg-slate-800/50 hover:bg-blue-600 px-4 py-2 rounded-xl shadow-lg transition z-50 font-bold">
                                    ← Volver
                                </button>
                            )}
                            <button onClick={resetWizard} className="text-white bg-red-500/80 hover:bg-red-600 px-4 py-2 rounded-xl shadow-lg transition z-50 font-bold">
                                Cancelar ❌
                            </button>
                        </div>
                        
                        <div className="bg-slate-50 rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
                            <div className="p-8 text-center shrink-0 bg-white border-b border-slate-200">
                                <h3 className="text-3xl font-black text-slate-800">{productoEnEspera.nombre}</h3>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {['tamaño', 'sabor', 'grupo_obligatorio', 'grupo_opcional'].includes(pasoActualObj.tipo) && (
                                    <div className="animate-in slide-in-from-right duration-200">
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2 text-center">{pasoActualObj.titulo}</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            {pasoActualObj.opciones.map((o, idx) => {
                                                let estaSeleccionado = false;
                                                if (pasoActualObj.tipo === 'tamaño') estaSeleccionado = opcionSeleccionada?.nombre === o.nombre;
                                                else if (pasoActualObj.tipo === 'sabor') estaSeleccionado = saborSeleccionado?.nombre === o.nombre;
                                                else if (pasoActualObj.tipo === 'grupo_obligatorio') estaSeleccionado = gruposSeleccionados[pasoActualObj.categoria]?.nombre === o.nombre;
                                                else if (pasoActualObj.tipo === 'grupo_opcional') estaSeleccionado = (gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).some(x => x.nombre === o.nombre);
                                                
                                                const disabled = pasoActualObj.tipo === 'grupo_opcional' && (gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).length >= pasoActualObj.limite && !estaSeleccionado;
                                                
                                                return (
                                                    <button 
                                                        key={idx} 
                                                        disabled={disabled} 
                                                        onClick={() => {
                                                            if (pasoActualObj.tipo === 'tamaño') { 
                                                                setOpcionSeleccionada(o); 
                                                                setTimeout(() => setPasoPersonalizacion(p => p + 1), 150); 
                                                            }
                                                            else if (pasoActualObj.tipo === 'sabor') { 
                                                                setSaborSeleccionado(o); 
                                                                setTimeout(() => setPasoPersonalizacion(p => p + 1), 150); 
                                                            }
                                                            else if (pasoActualObj.tipo === 'grupo_obligatorio') { 
                                                                setGruposSeleccionados({ ...gruposSeleccionados, [pasoActualObj.categoria]: o }); 
                                                                setTimeout(() => setPasoPersonalizacion(p => p + 1), 150); 
                                                            }
                                                            else if (pasoActualObj.tipo === 'grupo_opcional') {
                                                                let currentSelection = [...(gruposOpcionalesSeleccionados[pasoActualObj.categoria] || [])];
                                                                if (estaSeleccionado) {
                                                                    currentSelection = currentSelection.filter(x => x.nombre !== o.nombre);
                                                                } else if (currentSelection.length < pasoActualObj.limite) {
                                                                    currentSelection.push(o);
                                                                }
                                                                setGruposOpcionalesSeleccionados({ ...gruposOpcionalesSeleccionados, [pasoActualObj.categoria]: currentSelection });
                                                            }
                                                        }} 
                                                        className={`p-5 rounded-3xl font-bold transition-all border-2 flex flex-col items-center justify-center gap-2 ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${estaSeleccionado ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : 'bg-white text-slate-700 hover:border-indigo-400'}`}
                                                    >
                                                        {pasoActualObj.tipo === 'grupo_opcional' && (
                                                            <div className="absolute top-3 left-3 opacity-60">
                                                                {estaSeleccionado ? <CheckSquare size={18}/> : <Square size={18}/>}
                                                            </div>
                                                        )}
                                                        <span className="text-center leading-tight text-lg">{o.nombre}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                                
                                {pasoActualObj.tipo === 'quitar_ingredientes' && (
                                    <div className="animate-in slide-in-from-right duration-200 space-y-4">
                                        <p className="text-center text-slate-400 font-bold mb-4 uppercase tracking-widest text-xs border-b pb-4">
                                            ¿Deseas quitar o cambiar algún ingrediente?
                                        </p>
                                        <div className="space-y-3">
                                            {pasoActualObj.opciones.map((o, idx) => {
                                                const isBaseQuitada = ingredientesBase.includes(o.nombre);
                                                const isSustituida = ingredientesSustituidos[o.nombre];
                                                
                                                return (
                                                    <div key={idx} className={`p-4 rounded-xl transition border ${isBaseQuitada ? 'bg-rose-50 border-rose-200' : isSustituida ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                                                        <div className="flex justify-between items-center gap-3">
                                                            <span className={`font-bold text-sm ${isBaseQuitada ? 'line-through text-rose-500' : isSustituida ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                                {o.nombre} {isSustituida ? `(🔄 x ${isSustituida.nuevoNombre})` : ''}
                                                            </span>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => {
                                                                        if (isBaseQuitada) {
                                                                            setIngredientesBase(ingredientesBase.filter(i => i !== o.nombre));
                                                                        } else {
                                                                            setIngredientesBase([...ingredientesBase, o.nombre]);
                                                                            const newSust = {...ingredientesSustituidos}; 
                                                                            delete newSust[o.nombre]; 
                                                                            setIngredientesSustituidos(newSust); 
                                                                        }
                                                                    }} 
                                                                    className={`px-3 py-2 text-xs font-black rounded-lg transition ${isBaseQuitada ? 'bg-rose-500 text-white' : 'bg-slate-100 text-rose-500 hover:bg-rose-50'}`}
                                                                >
                                                                    {isBaseQuitada ? 'Deshacer' : 'Quitar'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                                
                                {pasoActualObj.tipo === 'extras_notas' && (
                                    <div className="animate-in slide-in-from-right duration-200 space-y-6">
                                        <p className="text-center text-slate-400 font-bold mb-4 uppercase tracking-widest text-xs border-b pb-4">
                                            Añadir Extras (Opcional)
                                        </p>
                                        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                            {(() => {
                                                const categoryItem = productoEnEspera.categoria || '';
                                                const extrasDelSistema = catalogoIngredientes.filter(i => 
                                                    (i.clasificacion_nombre === categoryItem || i.es_extra || i.tipo === 'extra') && i.permite_extra !== false
                                                );
                                                
                                                const extrasMap = new Map();
                                                (productoEnEspera.opciones || []).forEach(o => { 
                                                    if (o.tipo === 'extra') extrasMap.set(o.nombre, o); 
                                                });
                                                extrasDelSistema.forEach(o => { 
                                                    extrasMap.set(o.nombre, { nombre: o.nombre, precioExtra: 0 }); 
                                                });
                                                
                                                return Array.from(extrasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)).map((ex, idx) => {
                                                    const seleccionado = extrasSeleccionados.find(e => e.nombre === ex.nombre);
                                                    return (
                                                        <button 
                                                            key={idx} 
                                                            onClick={() => {
                                                                if (seleccionado) {
                                                                    setExtrasSeleccionados(extrasSeleccionados.filter(e => e.nombre !== ex.nombre));
                                                                } else {
                                                                    setExtrasSeleccionados([...extrasSeleccionados, { nombre: ex.nombre, precioExtra: 0 }]);
                                                                }
                                                            }} 
                                                            className={`p-4 rounded-xl font-bold text-sm transition border flex flex-col items-center gap-1 ${seleccionado ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-100'}`}
                                                        >
                                                            <span className="text-center leading-tight">{ex.nombre}</span>
                                                        </button>
                                                    )
                                                });
                                            })()}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mt-4">Notas Generales</p>
                                            <textarea 
                                                value={notaProducto} 
                                                onChange={e => setNotaProducto(e.target.value)} 
                                                placeholder="Instrucciones al chef..." 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-indigo-500 text-slate-700 font-bold resize-none h-20 shadow-inner" 
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* PIE DEL WIZARD (ACCIONES Y TOTALES) */}
                            <div className="p-8 bg-white border-t border-slate-200 shrink-0">
                                <div className="flex gap-4">
                                    
                                    {pasoPersonalizacion < pasosWiz.length - 1 ? (
                                        <button 
                                            onClick={() => setPasoPersonalizacion(p => p + 1)} 
                                            disabled={
                                                (pasoActualObj.tipo === 'grupo_obligatorio' && !gruposSeleccionados[pasoActualObj.categoria]) ||
                                                (pasoActualObj.tipo === 'tamaño' && !opcionSeleccionada) ||
                                                (pasoActualObj.tipo === 'sabor' && !saborSeleccionado)
                                            }
                                            className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-xl shadow-lg active:scale-95 transition text-xl disabled:opacity-50"
                                        >
                                            Siguiente ➡
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={anadirAlCarritoNormal} 
                                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-xl shadow-lg shadow-emerald-500/30 transition text-xl active:scale-95"
                                        >
                                            ✔ Añadir a Orden
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModalComedor;