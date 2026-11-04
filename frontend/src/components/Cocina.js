import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, XCircle, BellRing, ChevronRight } from 'lucide-react';
import io from 'socket.io-client';  

import HeaderKDS from './cocina/HeaderKDS';
import GridPedidos from './cocina/GridPedidos';
import ModalProblema from './cocina/ModalProblema';
import ModalSolicitarInsumo from './cocina/ModalSolicitarInsumo';
import ModalAsistencia from './cocina/ModalAsistencia';  

import GestorMermasPrincipal from './caja/modales/mermas/GestorMermasPrincipal';
import { apiFetch } from '../utils/apiFetch';

const Cocina = ({ user, onLogout }) => {
    const [pedidos, setPedidos] = useState([]);
    const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
    const [clasificaciones, setClasificaciones] = useState([]);
    
    const [productos, setProductos] = useState([]);
    const [insumosDB, setInsumosDB] = useState([]);

    const [trabajadoresActivos, setTrabajadoresActivos] = useState([]);  
    const [ayudanteSeleccionado, setAyudanteSeleccionado] = useState(user?.id || '');  
    const [produccionEnVivo, setProduccionEnVivo] = useState({});
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

    const bloqueosOptimistasRef = useRef(new Set());
    // 🔧 FIX: guarda el temporizador ACTIVO de cada pedido bloqueado. Permite
    // cancelar y renovar el escudo si llega una segunda acción sobre el mismo
    // pedido antes de que expire la primera, evitando que quede "desprotegido"
    // a medias mientras aún hay una escritura pendiente en el servidor.
    const timersEscudoRef = useRef(new Map());
    const socketRef = useRef(null); // 🆕 Guardamos la referencia para poder emitir desde enviarSolicitudInsumo()
    
    const audioRef = useRef(new Audio('/campana.mp3'));
    const prevPedidosCount = useRef(0);
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';  

    const cargarCat = useCallback(async () => {
        const t = Date.now();
        try {
            const [resIng, resClas, resProd, resIns] = await Promise.all([
               apiFetch(`${apiUrl}/ingredientes?t=${t}`),
               apiFetch(`${apiUrl}/clasificaciones?t=${t}`),
               apiFetch(`${apiUrl}/productos?t=${t}`),
               apiFetch(`${apiUrl}/insumos?t=${t}`)
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
            const res = await apiFetch(`${apiUrl}/cocina/personal-presente?t=${Date.now()}`);
            if (!res.ok) return;
            const presentes = await res.json();

            let activos = Array.isArray(presentes) ? presentes : [];
            if (!activos.some(a => String(a.id) === String(user?.id)) && user) {
                activos = [user, ...activos];
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

    // 🏭 FASE 5: Producción en vivo por Estación (alimenta el cálculo de tiempo real)
    const fetchProduccionEnVivo = useCallback(async () => {
        try {
            const res = await apiFetch(`${apiUrl}/cocina/produccion-en-vivo?t=${Date.now()}`);
            if (res.ok) setProduccionEnVivo(await res.json());
        } catch (e) { console.error("Error cargando producción en vivo:", e); }
    }, [apiUrl]);

    useEffect(() => {
        fetchProduccionEnVivo();
        const interval = setInterval(fetchProduccionEnVivo, 20000);
        return () => clearInterval(interval);
    }, [fetchProduccionEnVivo]); 

    useEffect(() => {
    if (alertaCaja) {
        // 🆕 15s en vez de 4s: un motivo de rechazo (ej. "No hay pan, tiendas
        // cerradas") puede ser más largo que una alerta normal. El botón de
        // cierre manual sigue disponible, así que no afecta si se lee antes.
        const timer = setTimeout(() => setAlertaCaja(null), 15000);
        return () => clearTimeout(timer);
    }
    }, [alertaCaja]);  

    const fetchPedidos = useCallback(async () => {
        try {
            const res = await apiFetch(`${apiUrl}/pedidos/hoy?t=${Date.now()}`);
            if (!res.ok) throw new Error("Error en petición");
            let data = await res.json();  
            
            data = data.filter(p => ['Pagado', 'Aceptado', 'Preparando'].includes(p.estado_preparacion));
            
            setPedidos(prev => {
                const bloqueados = prev.filter(p => bloqueosOptimistasRef.current.has(p.id));
                const frescos = data.filter(p => !bloqueosOptimistasRef.current.has(p.id));
                
                const nuevaLista = [...bloqueados, ...frescos];
                
                // 👇 FIX APLICADO: ORDENAMIENTO ESTRICTO POR FECHA (MÁS ANTIGUO ARRIBA SIEMPRE)
                nuevaLista.sort((a, b) => new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime());
                
                return nuevaLista;
            });

        } catch (error) {
            console.error("Error al cargar pedidos:", error);
        }
    }, [apiUrl]);
    
        // 🛡️ Escudo anti-parpadeo RENOVABLE: si ya había un temporizador corriendo
    // para este mismo pedido, lo cancela y arranca uno nuevo desde cero. Así,
    // sin importar cuántos platillos/acciones toques seguidas sobre el mismo
    // pedido, el escudo solo se retira cuando pasan los X ms desde la ÚLTIMA acción.
    const bloquearPedido = useCallback((id, duracionMs = 1500) => {
        const timerPrevio = timersEscudoRef.current.get(id);
        if (timerPrevio) clearTimeout(timerPrevio);

        bloqueosOptimistasRef.current.add(id);

        const nuevoTimer = setTimeout(() => {
            bloqueosOptimistasRef.current.delete(id);
            timersEscudoRef.current.delete(id);
            fetchPedidos();
        }, duracionMs);

        timersEscudoRef.current.set(id, nuevoTimer);
    }, [fetchPedidos]);

    useEffect(() => {
        if (pedidos.length > prevPedidosCount.current) {
            audioRef.current.play().catch(() => {});
        }
        prevPedidosCount.current = pedidos.length;
    }, [pedidos.length]);

    useEffect(() => {
        fetchPedidos();
        const interval = setInterval(fetchPedidos, 5000);
        return () => clearInterval(interval);
    }, [fetchPedidos]);  

    useEffect(() => {
        const nuevoSocket = io(apiUrl.replace('/api', ''), {
        transports: ['websocket', 'polling']
        });
        socketRef.current = nuevoSocket; // 🆕 Referencia para emitir solicitudes de insumo
        nuevoSocket.on('connect', () => fetchPedidos());
        nuevoSocket.on('nuevo_pedido', () => fetchPedidos());
        nuevoSocket.on('pedido_actualizado', () => fetchPedidos());
        nuevoSocket.on('pedido_eliminado', () => fetchPedidos());

    // 🆕 PEDIR INSUMO: escucha la respuesta de Caja. Puro evento en vivo,
    // sin registrar nada en BD. Si Cocina no está conectada, se pierde sin más.
    // Si rechazan, el motivo es información operativa (ej. "No hay pan, tiendas
    // cerradas") para decidir si se detiene la producción de ese platillo.
    nuevoSocket.on('respuesta_insumo_cocina', (payload) => {
      setAlertaCaja({
        titulo: payload.aceptado ? '✅ Insumo Aceptado' : '❌ Insumo Rechazado',
        mensaje: payload.aceptado
          ? `Caja aceptó tu solicitud de "${payload.insumo}" (${payload.cantidad}).`
          : `Caja rechazó "${payload.insumo}"${payload.motivo ? `: ${payload.motivo}` : '.'}`,
        tipo: payload.aceptado ? 'success' : 'error'
      });
    });

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
        // 🔥 ELIMINAMOS EL BLOQUEO GLOBAL (isSubmitting) PARA CERO LATENCIA TÁCTIL
        // 🔧 FIX: antes solo se "agregaba" el bloqueo aquí y un setTimeout suelto lo
        // quitaba al final (ver abajo). Ahora usamos bloquearPedido(), que CANCELA
        // cualquier temporizador previo de este mismo pedido antes de crear uno nuevo.
        bloquearPedido(pedido.id, 1500);

        const carritoActualizado = [...getCarrito(pedido)];
        const ahoraStr = new Date().toISOString();

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

        // 1. ACTUALIZACIÓN VISUAL INMEDIATA (Cero Latencia)
        setPedidos(prev => {
            if (nuevoEstadoGlobal === 'Listo') {
                return prev.filter(p => p.id !== pedido.id); 
            }
            return prev.map(p => p.id === pedido.id 
                ? { ...p, estado_preparacion: nuevoEstadoGlobal, chef_id: mainChefId, carrito: carritoActualizado } 
                : p
            );
        });

        // 2. ENVÍO SILENCIOSO EN SEGUNDO PLANO (Fire and Forget)
       apiFetch(`${apiUrl}/pedidos/${pedido.id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                estado_preparacion: nuevoEstadoGlobal,
                chef_id: mainChefId,
                carrito: carritoActualizado,
                log_evento: { indices: indicesAfectados, accion, usuario_id: trabajadorId }
            })
        }).catch(error => console.error("Error al actualizar platillos:", error));
        
        // 3. RENOVAMOS EL ESCUDO ANTI-PARPADEO (ya no es un timer "ciego" e independiente)
        bloquearPedido(pedido.id, 1500);
    };

    const enviarAlerta = async () => {
        if (!modalAlerta || !faltanteSelec || !propuestaSelec) return;
        setIsSubmitting(true);
        const targetId = modalAlerta.pedido.id;
        bloquearPedido(targetId, 1000);

        try {
            const msj = `[IDX:${modalAlerta.itemIndex}] 🚨 FALTANTE: ${faltanteSelec}. PROPUESTA COCINA: ${propuestaSelec}`;
            
            setPedidos(prev => prev.map(p => p.id === targetId ? { ...p, alerta_cocina: msj } : p));

            await apiFetch(`${apiUrl}/pedidos/${targetId}/alerta`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alerta_cocina: msj })
            });
            setModalAlerta(null); setFaltanteSelec(''); setPropuestaSelec('');
        } catch (error) { console.error(error); }
        finally {
            setIsSubmitting(false);
        }
    };  

    // 🆕 PEDIR INSUMO: emite por socket, sin tocar BD, sin depender de ningún pedido.
    const enviarSolicitudInsumo = (insumoNombre, cantidadTexto) => {
        if (!socketRef.current) return;
        socketRef.current.emit('solicitud_insumo_cocina', {
        solicitud_id: Date.now(),
        insumo: insumoNombre,
        cantidad: cantidadTexto,
        solicitante: user?.nombre || 'Cocina',
        timestamp: new Date().toISOString()
        });
    };

    const limpiarAlerta = async (id) => {
        bloquearPedido(id, 1000);
        setPedidos(prev => prev.map(p => p.id === id ? { ...p, alerta_cocina: null } : p));

        try {
            await apiFetch(`${apiUrl}/pedidos/${id}/alerta`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alerta_cocina: null })
            });
        } catch(e) {}
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
                    produccionEnVivo={produccionEnVivo}
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
                enviarSolicitudInsumo={enviarSolicitudInsumo}
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