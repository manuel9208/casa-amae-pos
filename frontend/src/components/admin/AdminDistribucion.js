import React, { useState, useEffect } from 'react';
import { Package, Users, Wallet, TrendingUp, Gift, Settings, XCircle, CheckCircle2, Store, Mail, Eye, EyeOff, Star } from 'lucide-react';

// Importamos los componentes del módulo
import CatalogoArticulos from './distribucion/CatalogoArticulos';
import DirectorioClientes from './distribucion/DirectorioClientes';

const AdminDistribucion = ({ apiUrl, baseUrl, refrescarDatos, showAlert, showConfirm, configGlobal, user }) => {
    // Pestañas internas del módulo de Distribución
    const [subTab, setSubTab] = useState('catalogo');

    // Estados del Modal de Ajustes Globales B2B
    const [modalAjustesVisible, setModalAjustesVisible] = useState(false);
    const [isSubmittingConfig, setIsSubmittingConfig] = useState(false);
    const [mostrarPassSmtp, setMostrarPassSmtp] = useState(false);
    
    // 👇 FIX: Añadimos las variables del sistema de puntos al estado
    const [configDist, setConfigDist] = useState({
        distribucion_activa: false,
        distribucion_nombre: '28:20',
        host: 'smtp.gmail.com',
        puerto: '465',
        email: '',
        password: '',
        puntos_activos: true,
        puntos_porcentaje: 10,
        puntos_valor_peso: 1
    });

    // Cargar configuración global de distribución al abrir
    useEffect(() => {
        const cargarConfigDistribucion = async () => {
            try {
                const res = await fetch(`${apiUrl}/distribucion/configuracion`);
                if (res.ok) {
                    const data = await res.json();
                    setConfigDist({
                        distribucion_activa: data.distribucion_activa === true,
                        distribucion_nombre: data.distribucion_nombre || '28:20',
                        host: data.smtp_host || 'smtp.gmail.com',
                        puerto: data.smtp_puerto || '465',
                        email: data.smtp_email || '',
                        password: data.smtp_password || '',
                        puntos_activos: data.puntos_activos !== false,
                        puntos_porcentaje: Number(data.puntos_porcentaje) || 10,
                        puntos_valor_peso: Number(data.puntos_valor_peso) || 1
                    });
                }
            } catch (error) {
                console.error("Error al cargar configuración B2B", error);
            }
        };
        cargarConfigDistribucion();
    }, [apiUrl]);

    const guardarConfiguracion = async (e) => {
        e.preventDefault();
        setIsSubmittingConfig(true);
        try {
            const res = await fetch(`${apiUrl}/distribucion/configuracion`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configDist)
            });
            if (res.ok) {
                showAlert('Éxito', 'Los ajustes generales de distribución han sido guardados.', 'success');
                setModalAjustesVisible(false);
            } else {
                showAlert('Error', 'No se pudo guardar la configuración.', 'error');
            }
        } catch (error) {
            showAlert('Error', 'Fallo de conexión al servidor.', 'error');
        }
        setIsSubmittingConfig(false);
    };

    // Propiedades comunes que pasaremos a los subcomponentes
    const commonProps = { apiUrl, baseUrl, refrescarDatos, showAlert, showConfirm, configGlobal, user };

    return (
        <div className="w-full h-full bg-slate-50 text-slate-800 flex flex-col animate-in fade-in duration-300">
            
            {/* 1. ENCABEZADO DEL MÓDULO CON BOTÓN DE AJUSTES */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 shrink-0 gap-4">
                <div>
                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 border border-indigo-200 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                        Distribución y Mayoreo
                    </span>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2 tracking-tight flex items-center gap-2">
                        Gestión de Distribución
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
                        Administra el catálogo de artículos, precios por nivel de cliente, directorio y cuentas por cobrar.
                    </p>
                </div>
                
                <button
                    onClick={() => setModalAjustesVisible(true)}
                    className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-sm active:scale-95 flex items-center gap-2 shrink-0 w-full md:w-auto justify-center"
                >
                    <Settings size={20} /> <span className="hidden sm:inline">Ajustes</span>
                </button>
            </div>

            {/* 2. SUB-MENÚ DE NAVEGACIÓN */}
            <div className="bg-white border-b border-slate-200 px-2 md:px-4 py-2 overflow-x-auto no-scrollbar scroll-smooth rounded-2xl shadow-sm mb-6 shrink-0">
                <div className="flex gap-2 w-max pb-1">
                    <button
                        onClick={() => setSubTab('catalogo')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${subTab === 'catalogo' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <Package size={18}/> Catálogo de Artículos
                    </button>
                    <button
                        onClick={() => setSubTab('clientes')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${subTab === 'clientes' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <Users size={18}/> Directorio de Clientes
                    </button>
                    <button
                        onClick={() => setSubTab('cobranza')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${subTab === 'cobranza' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <Wallet size={18}/> Cuentas por Cobrar
                    </button>
                    <button
                        onClick={() => setSubTab('promociones')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${subTab === 'promociones' ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <Gift size={18}/> Promociones
                    </button>
                    <button
                        onClick={() => setSubTab('reportes')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap select-none ${subTab === 'reportes' ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <TrendingUp size={18}/> Reportes de Venta
                    </button>
                </div>
            </div>

            {/* 3. CONTENEDOR DINÁMICO DE LAS VISTAS */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {subTab === 'catalogo' && <CatalogoArticulos {...commonProps} />}
                {subTab === 'clientes' && <DirectorioClientes {...commonProps} />}
                
                {subTab === 'cobranza' && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm animate-in zoom-in-95 min-h-[400px]">
                        <Wallet size={64} className="text-indigo-300 mb-4 animate-bounce" />
                        <h2 className="text-2xl font-black text-slate-800">Cuentas por Cobrar</h2>
                        <p className="text-slate-500 font-bold mt-2 max-w-md">
                            Gestiona las notas de venta a crédito, registra abonos parciales y envía estados de cuenta por correo electrónico.
                        </p>
                    </div>
                )}
                {subTab === 'promociones' && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm animate-in zoom-in-95 min-h-[400px]">
                        <Gift size={64} className="text-pink-300 mb-4 animate-bounce" />
                        <h2 className="text-2xl font-black text-slate-800">Promociones B2B</h2>
                        <p className="text-slate-500 font-bold mt-2 max-w-md">
                            Crea cupones o descuentos especiales exclusivamente para clientes mayoristas.
                        </p>
                    </div>
                )}
                {subTab === 'reportes' && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-sm animate-in zoom-in-95 min-h-[400px]">
                        <TrendingUp size={64} className="text-emerald-300 mb-4 animate-pulse" />
                        <h2 className="text-2xl font-black text-slate-800">Reportes de Venta</h2>
                        <p className="text-slate-500 font-bold mt-2 max-w-md">
                            Métricas y finanzas aisladas del restaurante. Visualiza ingresos por distribución, cartera vencida y artículos más vendidos.
                        </p>
                    </div>
                )}
            </div>

            {/* ============================================================== */}
            {/* 👇 MODAL DE AJUSTES GLOBALES B2B */}
            {/* ============================================================== */}
            {modalAjustesVisible && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <form onSubmit={guardarConfiguracion} className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl border border-slate-100 animate-in zoom-in-95 flex flex-col overflow-hidden max-h-[90vh]">
                        
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Settings size={24} className="text-indigo-500"/> Ajustes del Módulo</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Configuración General y Correos</p>
                            </div>
                            <button type="button" onClick={() => setModalAjustesVisible(false)} className="text-slate-400 hover:text-red-500 transition active:scale-95"><XCircle size={24}/></button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            
                            {/* SECCIÓN 1: VISIBILIDAD EN CAJA */}
                            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                                <h4 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                    <Store size={18} className="text-blue-500"/> Apariencia en Punto de Venta
                                </h4>
                                
                                <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-4">
                                    <div>
                                        <p className="font-bold text-slate-800">Habilitar Módulo en Caja</p>
                                        <p className="text-xs text-slate-500">Muestra la pestaña de mayoreo a los cajeros al levantar un pedido.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input type="checkbox" className="sr-only peer" checked={configDist.distribucion_activa} onChange={e => setConfigDist({...configDist, distribucion_activa: e.target.checked})} />
                                        <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                                    </label>
                                </div>

                                {configDist.distribucion_activa && (
                                    <div className="animate-in slide-in-from-top-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Nombre Comercial de Distribución *</label>
                                        <input type="text" required value={configDist.distribucion_nombre} onChange={e => setConfigDist({...configDist, distribucion_nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500 text-slate-700 shadow-inner" placeholder="Ej. 28:20, Mayoreo, etc." />
                                        <p className="text-[10px] text-slate-400 mt-1 pl-1">Este es el nombre que verá el cajero en la pestaña (Ej. 📦 {configDist.distribucion_nombre || '...'})</p>
                                    </div>
                                )}
                            </div>

                            {/* 👇 FIX: SECCIÓN 3: FIDELIDAD Y PUNTOS */}
                            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                                <h4 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                    <Star size={18} className="text-amber-500"/> Programa de Puntos B2B
                                </h4>
                                
                                <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-4">
                                    <div>
                                        <p className="font-bold text-slate-800">Activar Puntos de Lealtad</p>
                                        <p className="text-xs text-slate-500">Permite a los clientes mayoristas ganar y pagar con puntos.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input type="checkbox" className="sr-only peer" checked={configDist.puntos_activos} onChange={e => setConfigDist({...configDist, puntos_activos: e.target.checked})} />
                                        <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
                                    </label>
                                </div>

                                {configDist.puntos_activos && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">¿Cuánto % ganan por compra?</label>
                                            <div className="relative">
                                                <input type="number" min="0" step="1" required value={configDist.puntos_porcentaje} onChange={e => setConfigDist({...configDist, puntos_porcentaje: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-4 pr-10 font-bold outline-none focus:border-amber-500 text-slate-700 shadow-inner" placeholder="Ej. 10" />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1 pl-1">Ej. De $100 ganan {configDist.puntos_porcentaje} Puntos.</p>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">¿A cuánto dinero equivale 1 Punto?</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                                <input type="number" min="0.01" step="0.01" required value={configDist.puntos_valor_peso} onChange={e => setConfigDist({...configDist, puntos_valor_peso: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-8 pr-4 font-bold outline-none focus:border-amber-500 text-slate-700 shadow-inner" placeholder="Ej. 1.00" />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1 pl-1">Recomendado: $1.00 = 1 Punto</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SECCIÓN 2: SMTP */}
                            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                                <h4 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                    <Mail size={18} className="text-emerald-500"/> Notificaciones y Correos (SMTP)
                                </h4>
                                <p className="text-xs font-bold text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    Se utilizará exclusivamente para enviar códigos de autorización de crédito y recordatorios de cobro a clientes mayoristas.
                                </p>
                                
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Servidor SMTP (Host)</label>
                                        <input type="text" value={configDist.host} onChange={e => setConfigDist({...configDist, host: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-emerald-500 text-slate-700 shadow-inner" placeholder="smtp.gmail.com" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Puerto</label>
                                        <input type="text" value={configDist.puerto} onChange={e => setConfigDist({...configDist, puerto: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-emerald-500 text-slate-700 shadow-inner text-center" placeholder="465" />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Correo Remitente</label>
                                    <input type="email" value={configDist.email} onChange={e => setConfigDist({...configDist, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-emerald-500 text-slate-700 shadow-inner" placeholder="ejemplo@negocio.com" />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Contraseña de Aplicación</label>
                                    <div className="relative">
                                        <input type={mostrarPassSmtp ? "text" : "password"} value={configDist.password} onChange={e => setConfigDist({...configDist, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-10 font-bold outline-none focus:border-emerald-500 text-slate-700 shadow-inner" placeholder="••••••••••••" />
                                        <button type="button" onClick={() => setMostrarPassSmtp(!mostrarPassSmtp)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition">
                                            {mostrarPassSmtp ? <EyeOff size={18}/> : <Eye size={18}/>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0 gap-3">
                            <button type="button" onClick={() => setModalAjustesVisible(false)} className="py-3 px-6 bg-white text-slate-600 font-black rounded-xl hover:bg-slate-200 border border-slate-200 transition active:scale-95">Cancelar</button>
                            <button type="submit" disabled={isSubmittingConfig} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center gap-2">
                                {isSubmittingConfig ? 'Guardando...' : <><CheckCircle2 size={20}/> Guardar Ajustes</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
};

export default AdminDistribucion;