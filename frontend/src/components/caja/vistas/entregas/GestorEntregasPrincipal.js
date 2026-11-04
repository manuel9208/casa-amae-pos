import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PackageCheck, Store, Package, Utensils, ShoppingBag, Bike, Search, X } from 'lucide-react';
import TarjetaPedidoEntrega from './TarjetaPedidoEntrega';
import { apiFetch } from '../../../../utils/apiFetch';
import TarjetaPedidoEntregaMayoreo from './TarjetaPedidoEntregaMayoreo'; // 👈 NUEVO: Tarjeta exclusiva B2B

const GestorEntregasPrincipal = ({
  listosParaEntregar,
  isSubmitting,
  limpiandoMesas,
  actualizarEstadoPedido,
  setModalPago,
  getTelefonoExtraido,
  renderBotonVerDetalle,
  renderBotonAgregarExtra,
  renderBotonAgregarPlatillo,
  empleadosPOS,
  apiUrl
}) => { 
    const [modoTab, setModoTab] = useState('restaurante');
    const [configDist, setConfigDist] = useState({ activa: false, nombre: 'Distribución' });
    const [pedidosB2B, setPedidosB2B] = useState([]);
    const [cargandoB2B, setCargandoB2B] = useState(false);

    // 🆕 Filtros visuales para el cajero (Local / Llevar+Recoger / Domicilio) + buscador
    const [filtroTipo, setFiltroTipo] = useState('local'); // 'local' | 'llevar' | 'domicilio'
    const [busqueda, setBusqueda] = useState('');

    // 🆕 "Memoria" de pedidos ya marcados por el cajero en esta pantalla. Evita que un
    // pedido ya procesado reaparezca por una recarga tardía/desordenada del servidor
    // (condición de carrera entre el socket "pedido_actualizado" y la confirmación real
    // del backend cuando se marcan varios pedidos muy rápido seguidos).
    const [idsYaProcesados, setIdsYaProcesados] = useState(() => new Set());

    // 👇 FIX 1: Respaldo automático por si Caja.js no inyecta apiUrl
    const apiBase = apiUrl || (typeof window !== 'undefined' && window.location.origin.includes('localhost') ? 'http://localhost:4000/api' : '/api');

    useEffect(() => {
       apiFetch(`${apiBase}/distribucion/configuracion`)
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    setConfigDist({
                        activa: data.distribucion_activa === true || String(data.distribucion_activa) === 'true',
                        nombre: data.distribucion_nombre || 'Distribución'
                    });
                }
            })
            .catch(() => {});
    }, [apiBase]);

    const cargarPedidosB2B = useCallback(() => {
        setCargandoB2B(true);
       apiFetch(`${apiBase}/distribucion/ventas`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const listosB2B = data.filter(p => p.estado_preparacion === 'Listo');
                    setPedidosB2B(listosB2B);
                }
            })
            .catch(() => {})
            .finally(() => setCargandoB2B(false));
    }, [apiBase]);

    useEffect(() => {
        if (configDist.activa && modoTab === 'mayoreo') {
            cargarPedidosB2B();
            const interval = setInterval(cargarPedidosB2B, 8000); 
            return () => clearInterval(interval);
        }
    }, [configDist.activa, modoTab, cargarPedidosB2B]);

    // 🆕 Clasifica cada pedido en uno de los 3 "carriles" visuales que pidió el cajero.
    // Usamos coincidencia parcial (includes) en vez de texto exacto, porque el valor
    // real guardado en tipo_consumo puede variar ("Recoger", "Recoger en Local", etc.)
    // y una comparación exacta los mandaba por error al bucket "Local".
    const clasificarTipo = (pedido) => {
        const tc = String(pedido?.tipo_consumo || '').toLowerCase();
        if (tc.includes('domicilio')) return 'domicilio';
        if (tc.includes('llevar') || tc.includes('recoger')) return 'llevar';
        return 'local'; // 'Local', 'Local / Mostrador' y cualquier valor no contemplado caen aquí por seguridad
    };

    // 🆕 Envuelto en useMemo: evita que se genere una referencia de arreglo nueva
    // en cada render (el "|| []" era el causante del warning de exhaustive-deps)
    const listosRestaurante = useMemo(() => listosParaEntregar || [], [listosParaEntregar]);

    // 🆕 Conteo en vivo para los badges de cada botón de filtro
    const conteoPorTipo = useMemo(() => ({
        local: listosRestaurante.filter(p => clasificarTipo(p) === 'local').length,
        llevar: listosRestaurante.filter(p => clasificarTipo(p) === 'llevar').length,
        domicilio: listosRestaurante.filter(p => clasificarTipo(p) === 'domicilio').length,
    }), [listosRestaurante]);

    // 🆕 Buscador por nombre de cliente, teléfono o número de pedido
    // Envuelto en useCallback para tener una referencia estable y poder
    // declararlo correctamente como dependencia del useMemo de abajo.
    const coincideBusqueda = useCallback((pedido) => {
        if (!busqueda.trim()) return true;
        const q = busqueda.trim().toLowerCase();
        const numero = String(pedido.numero_pedido || '').toLowerCase();
        const nombre = String(pedido.cliente_nombre || '').toLowerCase();
        const direccion = String(pedido.direccion_entrega || '').toLowerCase();
        const telefono = String(getTelefonoExtraido(pedido) || '').toLowerCase();
        return numero.includes(q) || nombre.includes(q) || direccion.includes(q) || telefono.includes(q);
    }, [busqueda, getTelefonoExtraido]);

    // 🆕 Minutos de espera transcurridos desde que el pedido fue creado.
    // 🔧 FIX: la columna real en la tabla "pedidos" es "fecha_creacion"
    // (confirmado en pedidoController.js), por eso va primero en el fallback.
    const minutosEspera = (pedido) => {
        const fechaRaw = pedido?.fecha_creacion || pedido?.created_at || pedido?.fecha_pedido;
        if (!fechaRaw) return 0;
        const diffMs = Date.now() - new Date(fechaRaw).getTime();
        return diffMs > 0 ? diffMs / 60000 : 0;
    };

    // 🆕 Envoltura "a prueba de balas": bloquea el ID de inmediato (síncrono, antes
    // de que viaje cualquier petición de red), así sin importar cuántas veces se
    // reordene o se refresque la lista por socket, ese pedido jamás vuelve a aparecer
    // en esta pantalla una vez que el cajero lo tocó.
    const actualizarEstadoPedidoSeguro = useCallback((id, nuevoEstado, extras = {}) => {
        setIdsYaProcesados(prev => {
            const siguiente = new Set(prev);
            siguiente.add(id);
            return siguiente;
        });
        actualizarEstadoPedido(id, nuevoEstado, extras);
    }, [actualizarEstadoPedido]);

    const ordenesAMostrar = useMemo(() => {
        const base = modoTab === 'restaurante'
            ? listosRestaurante.filter(p => clasificarTipo(p) === filtroTipo && coincideBusqueda(p) && !idsYaProcesados.has(p.id))
            : pedidosB2B;
        // 🆕 Las órdenes más viejas (esperando más tiempo) se muestran primero
        return [...base].sort((a, b) => minutosEspera(b) - minutosEspera(a));
    }, [modoTab, listosRestaurante, filtroTipo, coincideBusqueda, pedidosB2B, idsYaProcesados]);

    return (
        // 👇 FIX 2: flex-col para controlar la altura y evitar el scroll fantasma
        <div className="w-full h-full flex flex-col bg-slate-50 text-slate-800 p-4 md:p-6 overflow-y-auto custom-scrollbar">  
            
            {/* ENCABEZADO COMPACTO — una sola línea, prioriza los filtros y las tarjetas */}
            <div className="flex items-center justify-between gap-4 mb-4 shrink-0 animate-in fade-in">
                <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    📦 Listos para Entregar
                </h1>

                {configDist.activa && (
                    <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200 shadow-inner shrink-0">
                        <button
                            onClick={() => setModoTab('restaurante')}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${modoTab === 'restaurante' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Store size={14}/> Restaurante
                        </button>
                        <button
                            onClick={() => setModoTab('mayoreo')}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${modoTab === 'mayoreo' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Package size={14}/> {configDist.nombre}
                        </button>
                    </div>
                )}
            </div>  

            {/* 🆕 BARRA DE FILTROS GIGANTES + BUSCADOR — SOLO EN MODO RESTAURANTE */}
            {modoTab === 'restaurante' && (
                <div className="flex flex-col gap-3 mb-5 shrink-0 animate-in fade-in">
                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                        <button
                            onClick={() => setFiltroTipo('local')}
                            className={`relative flex flex-col items-center justify-center gap-1.5 py-5 md:py-6 rounded-3xl border-4 transition-all active:scale-95 ${filtroTipo === 'local' ? 'bg-orange-500 border-orange-600 text-white shadow-xl shadow-orange-500/40 scale-[1.03]' : 'bg-white border-orange-200 text-orange-500 hover:bg-orange-50'}`}
                        >
                            <Utensils size={30} />
                            <span className="font-black text-sm md:text-base uppercase tracking-wide">Local</span>
                            <span className={`absolute -top-2 -right-2 min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-full text-xs font-black shadow-md ${filtroTipo === 'local' ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'}`}>
                                {conteoPorTipo.local}
                            </span>
                        </button>

                        <button
                            onClick={() => setFiltroTipo('llevar')}
                            className={`relative flex flex-col items-center justify-center gap-1.5 py-5 md:py-6 rounded-3xl border-4 transition-all active:scale-95 ${filtroTipo === 'llevar' ? 'bg-blue-600 border-blue-700 text-white shadow-xl shadow-blue-600/40 scale-[1.03]' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                        >
                            <ShoppingBag size={30} />
                            <span className="font-black text-sm md:text-base uppercase tracking-wide">Llevar / Recoger</span>
                            <span className={`absolute -top-2 -right-2 min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-full text-xs font-black shadow-md ${filtroTipo === 'llevar' ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'}`}>
                                {conteoPorTipo.llevar}
                            </span>
                        </button>

                        <button
                            onClick={() => setFiltroTipo('domicilio')}
                            className={`relative flex flex-col items-center justify-center gap-1.5 py-5 md:py-6 rounded-3xl border-4 transition-all active:scale-95 ${filtroTipo === 'domicilio' ? 'bg-indigo-600 border-indigo-700 text-white shadow-xl shadow-indigo-600/40 scale-[1.03]' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}
                        >
                            <Bike size={30} />
                            <span className="font-black text-sm md:text-base uppercase tracking-wide">Domicilio</span>
                            <span className={`absolute -top-2 -right-2 min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-full text-xs font-black shadow-md ${filtroTipo === 'domicilio' ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'}`}>
                                {conteoPorTipo.domicilio}
                            </span>
                        </button>
                    </div>

                    <div className="relative w-full">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por cliente, teléfono o número de pedido..."
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-12 py-4 text-base font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm"
                        />
                        {busqueda && (
                            <button
                                onClick={() => setBusqueda('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* GRID DE PEDIDOS */}
            {cargandoB2B && modoTab === 'mayoreo' && pedidosB2B.length === 0 ? (
                <div className="flex-1 flex justify-center items-center text-slate-400 font-bold animate-pulse">
                    Cargando órdenes B2B...
                </div>
            ) : ordenesAMostrar && ordenesAMostrar.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20 animate-in slide-in-from-bottom-4">
                    {ordenesAMostrar.map(pedido => (
                        modoTab === 'mayoreo' ? (
                            <TarjetaPedidoEntregaMayoreo
                                key={pedido.id}
                                pedido={pedido}
                                isSubmitting={isSubmitting}
                                setModalPago={setModalPago}
                                empleadosPOS={empleadosPOS}
                                apiUrl={apiBase}
                                recargarPedidos={cargarPedidosB2B}
                            />
                        ) : (
                            <TarjetaPedidoEntrega
                                key={pedido.id}
                                pedido={pedido}
                                isSubmitting={isSubmitting}
                                limpiandoMesas={limpiandoMesas}
                                actualizarEstadoPedido={actualizarEstadoPedidoSeguro}
                                setModalPago={setModalPago}
                                getTelefonoExtraido={getTelefonoExtraido}
                                renderBotonVerDetalle={renderBotonVerDetalle}
                                renderBotonAgregarExtra={renderBotonAgregarExtra}
                                renderBotonAgregarPlatillo={renderBotonAgregarPlatillo}
                                empleadosPOS={empleadosPOS}
                            />
                        )
                    ))}
                </div>
            ) : (
                // 👇 FIX 3: Usamos flex-1 para que se adapte sin generar scroll extra
                <div className="flex-1 flex flex-col items-center justify-center w-full bg-white rounded-[40px] border border-slate-200 border-dashed animate-in fade-in duration-300">
                    <PackageCheck size={64} className="text-slate-300 mb-4 animate-pulse" />
                    <p className="text-2xl font-black text-slate-400">
                        {modoTab === 'restaurante' && listosRestaurante.length > 0 ? 'Nada por aquí' : 'Sin despachos pendientes'}
                    </p>
                    <p className="text-xs font-bold text-slate-400/80 mt-1 uppercase tracking-widest text-center max-w-sm">
                        {modoTab === 'restaurante' && listosRestaurante.length > 0
                            ? 'No hay pedidos de este tipo con ese criterio. Prueba otro filtro o limpia la búsqueda.'
                            : 'Todas las órdenes preparadas ya han sido entregadas o despachadas en ruta.'}
                    </p>
                </div>
            )}
        </div>
    );
};  

export default GestorEntregasPrincipal;