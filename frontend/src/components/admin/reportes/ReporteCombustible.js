import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Fuel, MapPin, TrendingUp, Calendar, Info, RefreshCw, Search, Settings, Car, Save, CheckCircle2, AlertTriangle, Users, List } from 'lucide-react';

const ReporteCombustible = ({ apiUrl, formaterMoneda }) => {
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [alerta, setAlerta] = useState(null);
    const [vistaTabla, setVistaTabla] = useState('resumen'); // 'resumen' o 'detallado'
    
    // Filtros
    const [periodoFiltro, setPeriodoFiltro] = useState('dia');
    const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
    const [repartidorFiltro, setRepartidorFiltro] = useState('Todos');
    const [busqueda, setBusqueda] = useState('');
    const [viajesCrudos, setViajesCrudos] = useState([]);

    // Configuraciones desde BD
    const [precioLitroGlobal, setPrecioLitroGlobal] = useState(23.50);
    const [configConductores, setConfigConductores] = useState({});
    const [mostrarPanelConfig, setMostrarPanelConfig] = useState(false);

    const mostrarNotificacion = (mensaje, tipo = 'success') => {
        setAlerta({ mensaje, tipo });
        setTimeout(() => setAlerta(null), 3000);
    };

    const getDriverConfig = (driverId) => {
        return configConductores[driverId] || { vehiculo: '', rendimiento: 15 };
    };

    const updateDriverConfig = (driverId, field, value) => {
        setConfigConductores(prev => ({
            ...prev,
            [driverId]: { ...getDriverConfig(driverId), [field]: value }
        }));
    };

    const cargarRendimiento = useCallback(async () => {
        setCargando(true);
        try {
            const res = await fetch(`${apiUrl}/reportes/combustible?periodo=${periodoFiltro}&fecha=${fechaFiltro}`);
            if (res.ok) {
                const data = await res.json();
                setViajesCrudos(data.viajes || []);
                setPrecioLitroGlobal(Number(data.precio_gasolina) || 23.50);

                const confInicial = {};
                (data.viajes || []).forEach(v => {
                    if (!confInicial[v.repartidor_id]) {
                        confInicial[v.repartidor_id] = {
                            vehiculo: v.vehiculo || '',
                            rendimiento: Number(v.rendimiento_km_l) || 15
                        };
                    }
                });
                setConfigConductores(confInicial);
            }
        } catch (error) {
            console.error("Error al cargar reporte", error);
        } finally {
            setCargando(false);
        }
    }, [apiUrl, periodoFiltro, fechaFiltro]);

    useEffect(() => {
        cargarRendimiento();
    }, [cargarRendimiento]);

    const guardarConfiguracionBD = async () => {
        setGuardando(true);
        try {
            const payload = {
                precio_gasolina: precioLitroGlobal,
                conductores: Object.entries(configConductores).map(([id, conf]) => ({
                    id, vehiculo: conf.vehiculo, rendimiento: conf.rendimiento
                }))
            };
            const res = await fetch(`${apiUrl}/reportes/combustible/config`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                mostrarNotificacion("Ajustes guardados en Base de Datos.");
                setMostrarPanelConfig(false);
                cargarRendimiento();
            } else {
                mostrarNotificacion("Error al guardar.", "error");
            }
        } catch (error) {
            mostrarNotificacion("Error de conexión.", "error");
        } finally {
            setGuardando(false);
        }
    };

    // Procesamiento
    const { viajesFiltrados, totales, listaConductores, resumenPorConductor } = useMemo(() => {
        let filtrados = viajesCrudos;

        const choferesMap = new Map();
        viajesCrudos.forEach(v => {
            choferesMap.set(v.repartidor_id, v.repartidor_nombre);
        });
        const choferes = Array.from(choferesMap.entries()).map(([id, nombre]) => ({ id, nombre }));

        if (repartidorFiltro !== 'Todos') {
            filtrados = filtrados.filter(v => String(v.repartidor_id) === String(repartidorFiltro));
        }

        if (busqueda.trim()) {
            const term = busqueda.toLowerCase().trim();
            filtrados = filtrados.filter(v => 
                String(v.numero_pedido).includes(term) || 
                (v.direccion_entrega || '').toLowerCase().includes(term)
            );
        }

        let totalKmCalculados = 0;
        let totalGastoCombustible = 0;
        const resumenMap = {}; // Para la tabla agrupada

        const viajesMapeados = filtrados.map(v => {
            const driverConf = getDriverConfig(v.repartidor_id);
            const kmRuta = Number(v.distancia_km) || 4.5;
            const rendimientoKmL = Number(driverConf.rendimiento) || 15;
            const gastoEstimado = (kmRuta / rendimientoKmL) * precioLitroGlobal;
            
            totalKmCalculados += kmRuta;
            totalGastoCombustible += gastoEstimado;

            let tiempoMinutos = 0;
            if (v.tiempo_salida_reparto && v.tiempo_entregado) {
                tiempoMinutos = Math.round((new Date(v.tiempo_entregado) - new Date(v.tiempo_salida_reparto)) / 60000);
            }

            let dirLimpia = v.direccion_entrega || '';
            dirLimpia = dirLimpia.replace(/\[.*?\]/g, '').replace(/A NOMBRE DE:\s*[^|]+/i, '').replace(/TEL:\s*\d+/i, '').split('|').map(p => p.trim()).filter(p => p).join(', ');

            // Llenar el resumen por conductor
            if (!resumenMap[v.repartidor_id]) {
                resumenMap[v.repartidor_id] = {
                    nombre: v.repartidor_nombre,
                    vehiculo: driverConf.vehiculo,
                    viajes: 0,
                    kmTotales: 0,
                    gastoTotal: 0
                };
            }
            resumenMap[v.repartidor_id].viajes += 1;
            resumenMap[v.repartidor_id].kmTotales += kmRuta;
            resumenMap[v.repartidor_id].gastoTotal += gastoEstimado;

            return { ...v, kmRuta, gastoEstimado, tiempoMinutos, dirLimpia, vehiculoInfo: driverConf.vehiculo || 'No asignado' };
        });

        return {
            viajesFiltrados: viajesMapeados,
            totales: {
                viajes: viajesMapeados.length,
                km_estimados: totalKmCalculados.toFixed(1),
                gasto_estimado: totalGastoCombustible
            },
            listaConductores: choferes,
            resumenPorConductor: Object.values(resumenMap)
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viajesCrudos, repartidorFiltro, busqueda, precioLitroGlobal, configConductores]);

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 pb-20 relative">
            {/* NOTIFICACIÓN PERSONALIZADA */}
            {alerta && (
                <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[999] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border ${
                        alerta.tipo === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                        {alerta.tipo === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                        <p className="font-bold text-sm tracking-wide">{alerta.mensaje}</p>
                    </div>
                </div>
            )}

            {/* CABECERA Y FILTROS */}
            <div className="bg-amber-50/50 p-6 rounded-[32px] border border-amber-200/50 shadow-sm flex flex-col xl:flex-row justify-between xl:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-amber-900 flex items-center gap-3 tracking-tight">
                        <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shadow-inner">
                            <Fuel size={28} />
                        </div>
                        Rendimiento Logístico
                    </h2>
                    <p className="text-amber-700/70 text-sm font-bold mt-2">
                        Auditoría de kilometraje, rutas y consumo exacto de gasolina (Base de Datos).
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3">
                    <div className="w-full md:w-auto bg-white p-2 rounded-2xl border border-amber-100 shadow-sm flex items-center">
                        <select value={periodoFiltro} onChange={(e) => setPeriodoFiltro(e.target.value)} className="bg-transparent border-none font-bold text-slate-700 focus:ring-0 outline-none px-2 cursor-pointer w-full md:w-auto">
                            <option value="dia">Por Día</option>
                            <option value="semana">Por Semana</option>
                            <option value="mes">Por Mes</option>
                            <option value="anio">Por Año</option>
                        </select>
                    </div>
                    <div className="w-full md:w-auto flex items-center gap-3 bg-white p-2 rounded-2xl border border-amber-100 shadow-sm">
                        <Calendar size={18} className="text-amber-600 ml-2" />
                        <input type={periodoFiltro === 'mes' ? 'month' : 'date'} value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="bg-transparent border-none font-bold text-slate-700 focus:ring-0 cursor-pointer w-full outline-none" />
                    </div>
                    <button onClick={cargarRendimiento} className="w-full md:w-auto bg-amber-100 hover:bg-amber-200 text-amber-700 p-3.5 rounded-xl transition shadow-sm flex justify-center items-center">
                        <RefreshCw size={20} className={cargando ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* SECCIÓN DE CONFIGURACIÓN BD */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden transition-all">
                <button onClick={() => setMostrarPanelConfig(!mostrarPanelConfig)} className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3 text-slate-600 font-black uppercase tracking-widest text-xs">
                        <Settings size={18} /> Ajustes Matemáticos de Flotilla
                    </div>
                    <span className="text-slate-400 font-bold text-xs">{mostrarPanelConfig ? 'Ocultar ▲' : 'Configurar Vehículos ▼'}</span>
                </button>
                
                {mostrarPanelConfig && (
                    <div className="p-6 border-t border-slate-200 bg-slate-50/50 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                            <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm col-span-1">
                                <label className="block text-[10px] font-black uppercase text-red-500 mb-2 flex items-center gap-1.5"><Fuel size={14}/> Precio de Gasolina ($/L)</label>
                                <input type="number" step="0.01" min="1" value={precioLitroGlobal} onChange={(e) => setPrecioLitroGlobal(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-2xl font-black text-slate-800 outline-none focus:border-red-400" />
                            </div>

                            <div className="md:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                            <th className="pb-3">Conductor</th>
                                            <th className="pb-3">Vehículo Asignado</th>
                                            <th className="pb-3">Rendimiento (Km/Litro)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {listaConductores.length === 0 ? (
                                            <tr><td colSpan="3" className="py-4 text-xs font-bold text-slate-400 text-center">Sin conductores en esta fecha.</td></tr>
                                        ) : (
                                            listaConductores.map(c => {
                                                const currentConf = getDriverConfig(c.id);
                                                return (
                                                    <tr key={c.id}>
                                                        <td className="py-3 pr-4 font-black text-slate-700 text-sm">{c.nombre}</td>
                                                        <td className="py-3 pr-4">
                                                            <input type="text" value={currentConf.vehiculo} onChange={(e) => updateDriverConfig(c.id, 'vehiculo', e.target.value)} placeholder="Moto..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-400" />
                                                        </td>
                                                        <td className="py-3">
                                                            <input type="number" step="0.5" min="1" value={currentConf.rendimiento} onChange={(e) => updateDriverConfig(c.id, 'rendimiento', Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black outline-none focus:border-blue-400 text-blue-600" />
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                                <div className="mt-4 flex justify-end">
                                    <button onClick={guardarConfiguracionBD} disabled={guardando} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-blue-500/30">
                                        {guardando ? <RefreshCw size={16} className="animate-spin"/> : <Save size={16}/>} 
                                        {guardando ? 'Guardando en BD...' : 'Guardar Ajustes en BD'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* METRICAS GLOBALES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-center gap-2 hover:shadow-md transition-all group">
                    <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 w-fit group-hover:scale-110 transition-transform"><MapPin size={24} /></div>
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mt-2">Viajes Realizados</p>
                    <p className="text-4xl md:text-5xl font-black text-slate-800">{totales.viajes}</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-center gap-2 hover:shadow-md transition-all group">
                    <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 w-fit group-hover:scale-110 transition-transform"><TrendingUp size={24} /></div>
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mt-2">Distancia Total Estimada</p>
                    <p className="text-4xl md:text-5xl font-black text-slate-800">{totales.km_estimados} <span className="text-base text-slate-400 font-bold">km</span></p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-center gap-2 hover:shadow-md transition-all group border-b-4 border-b-red-400">
                    <div className="bg-red-50 p-3 rounded-2xl text-red-600 w-fit group-hover:scale-110 transition-transform"><Fuel size={24} /></div>
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mt-2">Gasto en Combustible</p>
                    <p className="text-4xl md:text-5xl font-black text-red-600">{formaterMoneda(totales.gasto_estimado)}</p>
                </div>
            </div>

            {/* TABLA MASTER (DOS PESTAÑAS: RESUMEN Y DETALLE) */}
            <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                        <button onClick={() => setVistaTabla('resumen')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${vistaTabla === 'resumen' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <Users size={16}/> Agrupado por Conductor
                        </button>
                        <button onClick={() => setVistaTabla('detallado')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${vistaTabla === 'detallado' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <List size={16}/> Desglose por Viaje
                        </button>
                    </div>

                    {vistaTabla === 'detallado' && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm focus-within:border-blue-400 transition-all">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Buscar ticket o calle..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full py-2.5 pl-10 pr-4 text-sm font-bold text-slate-700 outline-none" />
                            </div>
                            <select value={repartidorFiltro} onChange={(e) => setRepartidorFiltro(e.target.value)} className="bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-blue-400 cursor-pointer">
                                <option value="Todos">Todos los conductores</option>
                                {listaConductores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        {vistaTabla === 'resumen' ? (
                            <>
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] md:text-xs uppercase tracking-widest text-slate-400 border-b border-slate-200">
                                        <th className="p-4 md:p-5 font-black">Conductor / Unidad</th>
                                        <th className="p-4 md:p-5 font-black text-center">Viajes Terminados</th>
                                        <th className="p-4 md:p-5 font-black text-center">Km Estimados</th>
                                        <th className="p-4 md:p-5 font-black text-right text-red-500">Gasto Combustible</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                                    {cargando ? (
                                        <tr><td colSpan="4" className="p-10 text-center text-slate-400 font-bold animate-pulse">Analizando rutas...</td></tr>
                                    ) : resumenPorConductor.length === 0 ? (
                                        <tr><td colSpan="4" className="p-10 text-center text-slate-400 font-bold">No hay viajes registrados.</td></tr>
                                    ) : (
                                        resumenPorConductor.map((rep, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition group">
                                                <td className="p-4 md:p-5">
                                                    <p className="font-black text-slate-800">{rep.nombre}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-1"><Car size={10} className="text-blue-400" /> {rep.vehiculo || 'No asignado'}</p>
                                                </td>
                                                <td className="p-4 md:p-5 text-center">
                                                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-black text-sm">{rep.viajes}</span>
                                                </td>
                                                <td className="p-4 md:p-5 text-center">
                                                    <span className="font-black text-slate-500">{rep.kmTotales.toFixed(1)} km</span>
                                                </td>
                                                <td className="p-4 md:p-5 text-right font-black text-red-500 text-base md:text-lg">
                                                    {formaterMoneda(rep.gastoTotal)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </>
                        ) : (
                            <>
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] md:text-xs uppercase tracking-widest text-slate-400 border-b border-slate-200">
                                        <th className="p-4 md:p-5 font-black whitespace-nowrap">Conductor</th>
                                        <th className="p-4 md:p-5 font-black text-center whitespace-nowrap">Orden #</th>
                                        <th className="p-4 md:p-5 font-black min-w-[200px]">Destino / Ruta</th>
                                        <th className="p-4 md:p-5 font-black text-center whitespace-nowrap">Distancia</th>
                                        <th className="p-4 md:p-5 font-black text-center whitespace-nowrap">Duración</th>
                                        <th className="p-4 md:p-5 font-black text-right whitespace-nowrap text-red-500">Gasto Est.</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                                    {cargando ? (
                                        <tr><td colSpan="6" className="p-10 text-center text-slate-400 font-bold animate-pulse">Sincronizando rutas...</td></tr>
                                    ) : viajesFiltrados.length === 0 ? (
                                        <tr><td colSpan="6" className="p-10 text-center text-slate-400 font-bold">No hay viajes que coincidan con los filtros.</td></tr>
                                    ) : (
                                        viajesFiltrados.map((viaje, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition group">
                                                <td className="p-4 md:p-5">
                                                    <p className="font-black text-slate-800">{viaje.repartidor_nombre}</p>
                                                </td>
                                                <td className="p-4 md:p-5 text-center"><span className="bg-slate-900 text-white px-2.5 py-1 rounded-md font-black text-xs">{viaje.numero_pedido}</span></td>
                                                <td className="p-4 md:p-5"><p className="font-bold text-slate-600 line-clamp-2 text-xs md:text-sm">{viaje.dirLimpia}</p></td>
                                                <td className="p-4 md:p-5 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 text-sm md:text-base">{viaje.kmRuta.toFixed(1)} <span className="text-[10px] font-bold">KM</span></span>
                                                        {!viaje.distancia_km && <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest mt-1">* Estimado *</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4 md:p-5 text-center"><p className="font-bold text-slate-500">{viaje.tiempoMinutos > 0 ? `${viaje.tiempoMinutos} min` : '--'}</p></td>
                                                <td className="p-4 md:p-5 text-right font-black text-red-500 text-base md:text-lg">{formaterMoneda(viaje.gastoEstimado)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </>
                        )}
                    </table>
                </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 p-4 md:p-5 rounded-2xl flex items-start gap-3">
                <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-blue-800 leading-relaxed"><strong className="font-black text-blue-900">Nota Logística:</strong> Si la orden es muy antigua y no tiene datos de GPS, el sistema asume una ruta promedio de 4.5 km para proteger las métricas financieras.</p>
            </div>
        </div>
    );
};

export default ReporteCombustible;