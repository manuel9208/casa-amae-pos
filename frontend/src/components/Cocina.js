import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, XCircle, BellRing, ChevronRight } from 'lucide-react';
import io from 'socket.io-client';  

import HeaderKDS from './cocina/HeaderKDS';
import GridPedidos from './cocina/GridPedidos';
import ModalProblema from './cocina/ModalProblema';
import ModalSolicitarInsumo from './cocina/ModalSolicitarInsumo';
import ModalAsistencia from './cocina/ModalAsistencia';  

// 👇 IMPORTACIÓN DEL GESTOR DE MERMAS DE CAJA (Regla #12: No duplicar código)
import GestorMermasPrincipal from './caja/modales/mermas/GestorMermasPrincipal';

const Cocina = ({ user, onLogout }) => {
    const [pedidos, setPedidos] = useState([]);
    const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
    const [clasificaciones, setClasificaciones] = useState([]);
    
    // 👇 ESTADOS PARA ALIMENTAR EL MODAL DE MERMAS
    const [productos, setProductos] = useState([]);
    const [insumosDB, setInsumosDB] = useState([]);

    const [trabajadoresActivos, setTrabajadoresActivos] = useState([]);  
    const [ayudanteSeleccionado, setAyudanteSeleccionado] = useState(user?.id || '');  
    const [filtroTab, setFiltroTab] = useState('Todo');
    const [ahora, setAhora] = useState(Date.now());
    const [isSubmitting, setIsSubmitting] = useState(false);  

    const [modalAlerta, setModalAlerta] = useState(null);
    const [faltanteSelec, setFaltanteSelec] = useState('');
    const [propuestaSelec, setPropuestaSelec] = useState('');
    const [modalInsumo, setModalInsumo] = useState(false);
    const [modalMermas, setModalMermas] = useState(false);  
    const [modalAsistencia, setModalAsistencia] = useState(null);
    const [alertaCaja, setAlertaCaja] = useState(null);  

    const audioRef = useRef(new Audio('/campana.mp3'));
    const prevPedidosCount = useRef(0);
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';  

    const cargarCat = useCallback(async () => {
        const t = Date.now();
        try {
            const [resIng, resClas, resProd, resIns] = await Promise.all([
                fetch(`${apiUrl}/ingredientes?t=${t}`),
                fetch(`${apiUrl}/clasificaciones?t=${t}`),
                fetch(`${apiUrl}/productos?t=${t}`),
                fetch(`${apiUrl}/insumos?t=${t}`)
            ]);
            
            if (resIng.ok) setCatalogoIngredientes(await resIng.json());
            if (resClas.ok) setClasificaciones(await resClas.json());
            if (resProd.ok) setProductos(await resProd.json());
            if (resIns.ok) setInsumosDB(await resIns.json());
        } catch (error) { console.error(error); }
    }, [apiUrl]);

    useEffect(() => {
        cargarCat();
        const intervalCat = setInterval(cargarCat, 60000);
        return () => clearInterval(intervalCat);
    }, [cargarCat]);  

    const cargarTrabajadoresActivos = useCallback(async () => {
        try {
            const hoy = new Date();
            const year = hoy.getFullYear();
            const month = String(hoy.getMonth() + 1).padStart(2, '0');
            const day = String(hoy.getDate()).padStart(2, '0');
            const hoyStr = `${year}-${month}-${day}`;  

            const [resUsu, resRend] = await Promise.all([
                fetch(`${apiUrl}/usuarios`),
                fetch(`${apiUrl}/usuarios/rendimiento?periodo=dia&fecha=${hoyStr}`)
            ]);  

            if (!resUsu.ok || !resRend.ok) return;  

            const usuarios = await resUsu.json();
            const rendimiento = await resRend.json();  
            const historial = rendimiento.historialAsistencias || [];
            const asistenciasHoy = rendimiento.asistenciasHoy || [];  

            const activos = usuarios.filter(u => {
                if (String(u.id) === String(user?.id)) return true;  
                const rolLimpio = String(u.rol).trim().toLowerCase();
                if (rolLimpio === 'ayudante_cocina' || rolLimpio === 'cocina') {  
                    const asisPorId = historial.find(a => String(a.usuario_id) === String(u.id) && a.hora_entrada);
                    const asisPorNombre = asistenciasHoy.find(a => String(a.nombre).trim().toLowerCase() === String(u.nombre).trim().toLowerCase() && a.hora_entrada);  
                    if (asisPorId || asisPorNombre) return true;
                }
                return false;
            });  

            if (!activos.some(a => String(a.id) === String(user?.id)) && user) {
                activos.unshift(user);
            }  

            setTrabajadoresActivos(activos);  
            if (!ayudanteSeleccionado && activos.length > 0) {
                setAyudanteSeleccionado(activos[0].id);
            }
        } catch (e) { console.error("Error cargando trabajadores", e); }
    }, [apiUrl, user, ayudanteSeleccionado]);  

    useEffect(() => {
        cargarTrabajadoresActivos();
        const interval = setInterval(cargarTrabajadoresActivos, 60000);
        return () => clearInterval(interval);
    }, [cargarTrabajadoresActivos]);  

    useEffect(() => {
        if (alertaCaja) {
            const timer = setTimeout(() => setAlertaCaja(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [alertaCaja]);  

    const fetchPedidos = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/pedidos/hoy?t=${Date.now()}`);
            if (!res.ok) throw new Error("Error en petición");
            let data = await res.json();  
            
            data = data.filter(p => ['Pendiente', 'Pagado', 'Preparando'].includes(p.estado_preparacion));
            
            if (data.length > prevPedidosCount.current) {
                audioRef.current.play().catch(() => console.log('Bloqueo de audio por navegador'));
            }
            prevPedidosCount.current = data.length;
            setPedidos(data);
        } catch (error) {
            console.error("Error al cargar pedidos:", error);
        }
    }, [apiUrl]);  

    useEffect(() => {
        fetchPedidos();
        const interval = setInterval(fetchPedidos, 5000);
        return () => clearInterval(interval);
    }, [fetchPedidos]);  

    useEffect(() => {
        const nuevoSocket = io(apiUrl.replace('/api', ''), {
            transports: ['websocket', 'polling']
        });  
        nuevoSocket.on('connect', () => fetchPedidos());
        nuevoSocket.on('nuevo_pedido', () => fetchPedidos());
        nuevoSocket.on('pedido_actualizado', () => fetchPedidos());
        nuevoSocket.on('pedido_eliminado', () => fetchPedidos());
        return () => nuevoSocket.disconnect();
    }, [apiUrl, fetchPedidos]);  

    useEffect(() => {
        const timer = setInterval(() => setAhora(Date.now()), 15000);
        return () => clearInterval(timer);
    }, []);  

    const getCarrito = (p) => {
        if (Array.isArray(p.carrito)) return p.carrito;
        try { return JSON.parse(p.carrito) || []; } catch(e) { return []; }
    };  

    // 👇 LA MAGIA DE COLABORACIÓN: Función maestra que actualiza por Platillo individual
    const procesarAccionItems = async (pedido, indicesAfectados, accion, trabajadorId) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const carritoActualizado = [...getCarrito(pedido)];
            const ahoraStr = new Date().toISOString();

            // 1. Actualizamos exclusivamente los platillos afectados
            indicesAfectados.forEach(idx => {
                if (accion === 'Preparar' || accion === 'Ayudar') {
                    carritoActualizado[idx].estado = 'Preparando';
                    carritoActualizado[idx].chef_id = trabajadorId;
                    if (accion === 'Preparar') carritoActualizado[idx].tiempo_inicio = ahoraStr;
                } else if (accion === 'Terminar') {
                    carritoActualizado[idx].estado = 'Listo';
                    carritoActualizado[idx].tiempo_fin = ahoraStr;
                }
            });

            // 2. Evaluamos cómo debe quedar la Orden Global
            let allListos = true;
            let anyPreparando = false;

            carritoActualizado.forEach(i => {
                if (i.estado !== 'Listo' && i.estado !== 'Finalizado') allListos = false;
                if (i.estado === 'Preparando') anyPreparando = true;
            });

            let nuevoEstadoGlobal = pedido.estado_preparacion;
            if (allListos) nuevoEstadoGlobal = 'Listo';
            else if (anyPreparando || accion === 'Preparar' || accion === 'Ayudar') nuevoEstadoGlobal = 'Preparando';

            const mainChefId = carritoActualizado.find(i => i.chef_id)?.chef_id || pedido.chef_id;

            await fetch(`${apiUrl}/pedidos/${pedido.id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado_preparacion: nuevoEstadoGlobal,
                    chef_id: mainChefId,
                    carrito: carritoActualizado
                })
            });
            fetchPedidos();
        } catch (error) {
            console.error("Error al actualizar platillos:", error);
        }
        setIsSubmitting(false);
    };

    const enviarAlerta = async () => {
        if (!modalAlerta || !faltanteSelec || !propuestaSelec) return;
        setIsSubmitting(true);
        try {
            // modalAlerta.itemIndex ya trae el índice exacto
            const msj = `[IDX:${modalAlerta.itemIndex}] 🚨 FALTANTE: ${faltanteSelec}. PROPUESTA COCINA: ${propuestaSelec}`;
            await fetch(`${apiUrl}/pedidos/${modalAlerta.pedido.id}/alerta`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alerta_cocina: msj })
            });
            fetchPedidos();
            setModalAlerta(null); setFaltanteSelec(''); setPropuestaSelec('');
        } catch (error) { console.error(error); }
        setIsSubmitting(false);
    };  

    const limpiarAlerta = async (id) => {
        setIsSubmitting(true);
        try {
            await fetch(`${apiUrl}/pedidos/${id}/alerta`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alerta_cocina: null })
            });
            fetchPedidos();
        } catch(e) {}
        setIsSubmitting(false);
    };  

    const obtenerNombreTrabajadorActivo = (id) => {
        const t = trabajadoresActivos.find(t => String(t.id) === String(id));
        return t ? t.nombre : 'Chef';
    };

    return (
        <div className="min-h-screen flex flex-col font-sans bg-slate-950 transition-colors duration-500 overflow-hidden relative">  
            {alertaCaja && (
                <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[9999] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-2 ${
                        alertaCaja.tipo === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' :
                        alertaCaja.tipo === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                        'bg-blue-50 border-blue-500 text-blue-800'
                    }`}>
                        {alertaCaja.tipo === 'success' && <CheckCircle2 className="text-emerald-500" size={24} />}
                        {alertaCaja.tipo === 'error' && <XCircle className="text-red-500" size={24} />}
                        {alertaCaja.tipo !== 'success' && alertaCaja.tipo !== 'error' && <BellRing className="text-blue-500" size={24} />}
                        <div>
                            <p className="font-black text-sm uppercase tracking-widest">{alertaCaja.titulo}</p>
                            <p className="font-bold text-sm opacity-80">{alertaCaja.mensaje}</p>
                        </div>
                        <button onClick={() => setAlertaCaja(null)} className="ml-4 opacity-50 hover:opacity-100 transition"><XCircle size={20}/></button>
                    </div>
                </div>
            )}  

            <HeaderKDS
                user={user}
                onLogout={onLogout}
                filtroTab={filtroTab}
                setFiltroTab={setFiltroTab}
                setModalInsumo={setModalInsumo}
                setModalMermas={setModalMermas} 
                setModalAsistencia={setModalAsistencia}
                configGlobal={null}
            />  

            {trabajadoresActivos.length > 1 && (
                <div className="px-4 md:px-8 pt-4 pb-2 shrink-0 animate-in fade-in">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                            Seleccionar Perfil Activo <ChevronRight size={14}/>
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {trabajadoresActivos.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setAyudanteSeleccionado(t.id)}
                                    className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all border-2 flex items-center gap-2 ${
                                        String(ayudanteSeleccionado) === String(t.id)
                                        ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-105'
                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                                    }`}
                                >
                                    {String(t.id) === String(user?.id) ? '👨‍🍳 Yo (Chef)' : `🔪 ${t.nombre}`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}  

            <main className="flex-1 p-4 md:px-8 md:pb-8 overflow-y-auto custom-scrollbar relative">
                <GridPedidos
                    pedidosVisibles={pedidos}
                    filtroTab={filtroTab}
                    ahora={ahora}
                    isSubmitting={isSubmitting}
                    setModalAlerta={setModalAlerta}
                    limpiarAlerta={limpiarAlerta}
                    getCarrito={getCarrito}
                    trabajadorActivoId={user?.id}
                    obtenerNombreTrabajadorActivo={obtenerNombreTrabajadorActivo}
                    ayudanteSeleccionado={ayudanteSeleccionado}
                    procesarAccionItems={procesarAccionItems} 
                />
            </main>  

            {modalAlerta && (
                <ModalProblema
                    modalAlerta={modalAlerta} setModalAlerta={setModalAlerta}
                    faltanteSelec={faltanteSelec} setFaltanteSelec={setFaltanteSelec}
                    propuestaSelec={propuestaSelec} setPropuestaSelec={setPropuestaSelec}
                    catalogoIngredientes={catalogoIngredientes}
                    clasificaciones={clasificaciones}
                    isSubmitting={isSubmitting}
                    enviarAlerta={enviarAlerta}
                />
            )}  

            {/* CONECTAMOS EL GESTOR DE MERMAS DE CAJA DIRECTO EN COCINA */}
            <GestorMermasPrincipal
                modalMermas={modalMermas}
                setModalMermas={setModalMermas}
                insumosDB={insumosDB}
                productos={productos}
                clasificaciones={clasificaciones}
                apiUrl={apiUrl}
                user={user}
                cargarDataDinamica={cargarCat}
                setAlertaCaja={setAlertaCaja}
            />

            {modalInsumo && (
                <ModalSolicitarInsumo
                    setModalInsumo={setModalInsumo}
                    catalogoIngredientes={catalogoIngredientes}
                    apiUrl={apiUrl} user={user}
                    pedidos={pedidos} 
                />
            )}  

            <ModalAsistencia
                modalAsistencia={modalAsistencia}
                setModalAsistencia={setModalAsistencia}
                apiUrl={apiUrl}
                setAlertaCaja={setAlertaCaja}
                onSuccess={cargarTrabajadoresActivos}
            />  
        </div>
    );
};  

export default Cocina;