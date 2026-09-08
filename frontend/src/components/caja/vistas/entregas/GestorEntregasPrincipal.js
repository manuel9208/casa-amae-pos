import React, { useState, useEffect, useCallback } from 'react';
import { PackageCheck, Store, Package } from 'lucide-react';
import TarjetaPedidoEntrega from './TarjetaPedidoEntrega';
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
    empleadosPOS,
    apiUrl
}) => {  
    const [modoTab, setModoTab] = useState('restaurante');
    const [configDist, setConfigDist] = useState({ activa: false, nombre: 'Distribución' });
    const [pedidosB2B, setPedidosB2B] = useState([]);
    const [cargandoB2B, setCargandoB2B] = useState(false);

    // 👇 FIX 1: Respaldo automático por si Caja.js no inyecta apiUrl
    const apiBase = apiUrl || (typeof window !== 'undefined' && window.location.origin.includes('localhost') ? 'http://localhost:4000/api' : '/api');

    useEffect(() => {
        fetch(`${apiBase}/distribucion/configuracion`)
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
        fetch(`${apiBase}/distribucion/ventas`)
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

    const ordenesAMostrar = modoTab === 'restaurante' ? listosParaEntregar : pedidosB2B;

    return (
        // 👇 FIX 2: flex-col para controlar la altura y evitar el scroll fantasma
        <div className="w-full h-full flex flex-col bg-slate-50 text-slate-800 p-4 md:p-6 overflow-y-auto custom-scrollbar">  
            
            {/* ENCABEZADO Y TABS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0 animate-in fade-in">
                <div>
                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 border border-indigo-200 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                        Módulo de Despacho
                    </span>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                        Listos para Entregar
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
                        Órdenes terminadas listas para entregar en mostrador o asignar repartidor.
                    </p>
                </div>

                {configDist.activa && (
                    <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200 shadow-inner w-full md:w-auto shrink-0">
                        <button
                            onClick={() => setModoTab('restaurante')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${modoTab === 'restaurante' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Store size={16}/> Restaurante
                        </button>
                        <button
                            onClick={() => setModoTab('mayoreo')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${modoTab === 'mayoreo' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Package size={16}/> {configDist.nombre}
                        </button>
                    </div>
                )}
            </div>  

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
                                actualizarEstadoPedido={actualizarEstadoPedido} 
                                setModalPago={setModalPago}
                                getTelefonoExtraido={getTelefonoExtraido}
                                renderBotonVerDetalle={renderBotonVerDetalle}
                                renderBotonAgregarExtra={renderBotonAgregarExtra}
                                empleadosPOS={empleadosPOS}
                            />
                        )
                    ))}
                </div>
            ) : (
                // 👇 FIX 3: Usamos flex-1 para que se adapte sin generar scroll extra
                <div className="flex-1 flex flex-col items-center justify-center w-full bg-white rounded-[40px] border border-slate-200 border-dashed animate-in fade-in duration-300">
                    <PackageCheck size={64} className="text-slate-300 mb-4 animate-pulse" />
                    <p className="text-2xl font-black text-slate-400">Sin despachos pendientes</p>
                    <p className="text-xs font-bold text-slate-400/80 mt-1 uppercase tracking-widest text-center max-w-sm">
                        Todas las órdenes preparadas ya han sido entregadas o despachadas en ruta.
                    </p>
                </div>
            )}
        </div>
    );
};  

export default GestorEntregasPrincipal;