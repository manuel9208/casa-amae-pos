import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle2, Bike, Store, Package } from 'lucide-react';  
import TarjetaRepartidor from './TarjetaRepartidor';
import ResumenAcumuladoReparto from './ResumenAcumuladoReparto';  

const LiquidacionRepartidoresPrincipal = ({
    pedidosEnReparto,
    empleadosPOS,
    fondosRepartidores,
    actualizarFondoRepartidor,
    fondoRepartidorGlobal,
    liquidarPedidoRepartidor,
    actualizarEstadoPedido,
    apiUrl,
    user // 👈 Prop necesaria para extraer el ID del cajero
}) => {  
    const [modoTab, setModoTab] = useState('restaurante');
    const [configDist, setConfigDist] = useState({ activa: false, nombre: 'Mayoreo' });
    const [pedidosMayoreo, setPedidosMayoreo] = useState([]);
    const [cargandoMayoreo, setCargandoMayoreo] = useState(false);

    const apiBase = apiUrl || (typeof window !== 'undefined' && window.location.origin.includes('localhost') ? 'http://localhost:4000/api' : '/api');

    // 1. Cargar Configuración de Distribución
    useEffect(() => {
        fetch(`${apiBase}/distribucion/configuracion`)
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    setConfigDist({
                        activa: data.distribucion_activa === true || String(data.distribucion_activa) === 'true',
                        nombre: 'Mayoreo' // 👈 Lo fijamos a "Mayoreo" como solicitaste
                    });
                }
            })
            .catch(() => {});
    }, [apiBase]);

    // 2. Cargar Pedidos de Mayoreo Por Liquidar
    const cargarPedidosMayoreo = useCallback(() => {
        setCargandoMayoreo(true);
        fetch(`${apiBase}/distribucion/ventas`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Filtramos los pedidos que están pendientes de liquidar (En ruta o Entregados sin pagar)
                    const porLiquidar = data.filter(p => 
                        p.tipo_consumo === 'Domicilio' &&
                        (
                            p.estado_preparacion === 'En Camino' ||
                            (p.estado_preparacion === 'Entregado' && ['Pendiente', 'Por Cobrar'].includes(p.metodo_pago))
                        )
                    );
                    setPedidosMayoreo(porLiquidar);
                }
            })
            .catch(() => {})
            .finally(() => setCargandoMayoreo(false));
    }, [apiBase]);

    useEffect(() => {
        if (configDist.activa && modoTab === 'mayoreo') {
            cargarPedidosMayoreo();
            const interval = setInterval(cargarPedidosMayoreo, 8000);
            return () => clearInterval(interval);
        }
    }, [configDist.activa, modoTab, cargarPedidosMayoreo]);

    // =========================================================
    // 💰 FUNCIONES EXCLUSIVAS PARA LIQUIDAR B2B
    // =========================================================
    const liquidarPedidoMayoreo = async (pedidoIds) => {
        const idsArray = Array.isArray(pedidoIds) ? pedidoIds : [pedidoIds];
        try {
            const promesas = idsArray.map(id =>
                fetch(`${apiBase}/distribucion/ventas/${id}/estado`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        estado_preparacion: 'Liquidado', 
                        metodo_pago: 'Efectivo', 
                        cajero_id: user?.id // 👈 AQUÍ GUARDAMOS AL CAJERO QUE COBRÓ
                    })
                })
            );
            await Promise.all(promesas);
            cargarPedidosMayoreo();
        } catch (error) {
            console.error("Error liquidando B2B", error);
        }
    };

    const actualizarEstadoMayoreo = async (id, nuevoEstado, extraData = {}) => {
        try {
            let payload = { estado_preparacion: nuevoEstado, ...extraData };
            await fetch(`${apiBase}/distribucion/ventas/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            cargarPedidosMayoreo();
        } catch (error) {
            console.error("Error actualizando B2B", error);
        }
    };

    // =========================================================
    // 🔄 ENRUTADORES DINÁMICOS SEGÚN PESTAÑA ACTIVA
    // =========================================================
    const ordenesAMostrar = modoTab === 'restaurante' ? pedidosEnReparto : pedidosMayoreo;
    const funcLiquidar = modoTab === 'restaurante' ? liquidarPedidoRepartidor : liquidarPedidoMayoreo;
    const funcActualizarEstado = modoTab === 'restaurante' ? actualizarEstadoPedido : actualizarEstadoMayoreo;

    const repartidoresActivos = (empleadosPOS || []).filter(emp => String(emp.rol).toLowerCase().includes('repart'));  

    const pedidosPorRepartidor = useMemo(() => {
        const grupos = {};
        ordenesAMostrar.forEach(p => {
            const repId = p.repartidor_id || 'sin_asignar';
            if (!grupos[repId]) grupos[repId] = [];
            grupos[repId].push(p);
        });
        return grupos;
    }, [ordenesAMostrar]);  

    const getNombreRepartidor = (id) => {
        if (id === 'sin_asignar') return 'Pedidos sin Repartidor Asignado';
        const emp = (empleadosPOS || []).find(e => Number(e.id) === Number(id));
        return emp ? `Conductor: ${emp.nombre}` : `Repartidor #${id}`;
    };  

    const parseMoney = (val) => Number(String(val).replace(/[^0-9.-]+/g,"")) || 0;  

    // 👇 FIX: Reconocemos los nuevos métodos del repartidor para el cálculo de deuda
    const pedidosEfectivoGlobal = ordenesAMostrar.filter(p => {
        const esTransferencia = String(p.direccion_entrega || '').toUpperCase().includes('TRANSFERENCIA') || p.metodo_pago === 'Transferencia';
        return ['Entregado', 'En Camino'].includes(p.estado_preparacion) &&
        (['Pendiente', 'Por Cobrar', 'Efectivo', 'Mixto'].includes(p.metodo_pago)) &&
        !esTransferencia;
    });  

    const deudaPedidosEfectivoGlobal = pedidosEfectivoGlobal.reduce((sum, p) => {
        // Si es mixto, extraemos solo la parte en efectivo que debe entregar
        if (p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
            let pm = []; try { pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos; } catch(e){}
            const ef = pm.find(x => x.metodo === 'Efectivo');
            return sum + (ef ? Number(ef.monto) : 0);
        }
        return sum + parseMoney(p.total);
    }, 0);
    
    const fondoFeria = parseMoney(fondoRepartidorGlobal);
    const totalAEntregarGlobal = deudaPedidosEfectivoGlobal + fondoFeria;  

    return (
        <div className="w-full h-full bg-slate-50 text-slate-800 p-4 md:p-6 overflow-y-auto custom-scrollbar">
            
            {/* ENCABEZADO Y SELECTOR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-in fade-in pb-5 border-b border-slate-200">
                <div className="flex flex-col">
                    <div>
                        <span className="text-[10px] font-black bg-pink-50 text-pink-600 border border-pink-200 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                            Módulo de Logística
                        </span>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                            Liquidación de Repartidores
                        </h1>
                        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
                            Asigna la feria inicial y recolecta el efectivo por repartidor antes del corte financiero.
                        </p>
                    </div>
                </div>

                {configDist.activa && (
                    <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200 shadow-inner w-full md:w-auto shrink-0">
                        <button
                            onClick={() => setModoTab('restaurante')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${modoTab === 'restaurante' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Store size={16}/> Restaurante
                        </button>
                        <button
                            onClick={() => setModoTab('mayoreo')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${modoTab === 'mayoreo' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Package size={16}/> {configDist.nombre || 'Mayoreo'}
                        </button>
                    </div>
                )}
            </div>

            <div className="mb-10">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 pl-1 flex items-center gap-2">
                    <Bike size={16}/> Feria / Fondo Inicial Individual
                </h3>
                {repartidoresActivos.length === 0 ? (
                    <p className="text-sm font-bold text-slate-500 bg-white p-4 rounded-2xl border border-slate-200">
                        No hay repartidores registrados en el sistema.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {repartidoresActivos.map(rep => (
                            <div key={rep.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm focus-within:border-pink-400 focus-within:ring-2 focus-within:ring-pink-500/20 transition-all">
                                <p className="text-xs font-black text-slate-700 mb-2 truncate">{rep.nombre}</p>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-slate-400 font-black">$</span>
                                    <input
                                        type="number" min="0" step="1"
                                        value={fondosRepartidores[rep.id] === undefined ? '' : fondosRepartidores[rep.id]}
                                        onChange={(e) => actualizarFondoRepartidor(rep.id, e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-3 font-black text-slate-800 outline-none focus:bg-white transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>  
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 space-y-6">
                    {cargandoMayoreo && modoTab === 'mayoreo' && ordenesAMostrar.length === 0 ? (
                        <div className="flex justify-center items-center py-20 text-slate-400 font-bold animate-pulse">
                            Cargando liquidaciones B2B...
                        </div>
                    ) : ordenesAMostrar.length === 0 ? (
                        <div className="bg-white border-2 border-slate-200 border-dashed p-12 rounded-[40px] text-center animate-in zoom-in-95">
                            <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4 opacity-60"/>
                            <p className="text-xl font-bold text-slate-500">Ruta limpia y cobrada.</p>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">No hay motociclistas con deudas activas o viajes en proceso.</p>
                        </div>
                    ) : (
                        Object.entries(pedidosPorRepartidor).map(([repartidorId, listaPedidos]) => (
                            <TarjetaRepartidor
                                key={repartidorId}
                                repartidorId={repartidorId}
                                listaPedidos={listaPedidos}
                                getNombreRepartidor={getNombreRepartidor}
                                liquidarPedidoRepartidor={funcLiquidar}
                                actualizarEstadoPedido={funcActualizarEstado}
                                fondoRepartidor={fondosRepartidores[repartidorId] || 0}
                                actualizarFondoRepartidor={actualizarFondoRepartidor}
                            />
                        ))
                    )}
                </div>  
                <ResumenAcumuladoReparto
                    deudaPedidosEfectivoGlobal={deudaPedidosEfectivoGlobal}
                    fondoFeria={fondoFeria}
                    totalAEntregarGlobal={totalAEntregarGlobal}
                />
            </div>
        </div>
    );
};  

export default LiquidacionRepartidoresPrincipal;