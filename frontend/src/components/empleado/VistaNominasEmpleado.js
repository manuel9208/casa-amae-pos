import React, { useState, useEffect, useCallback } from 'react';
import { History, Printer, Calendar, DollarSign, AlertTriangle, XCircle } from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';
import { generarPDFReciboNomina } from '../admin/usuarios/nominas/utils/generarReciboNominaPDF';

const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);

const VistaNominasEmpleado = ({ user, apiUrl }) => {
    const [misRecibos, setMisRecibos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [configGlobal, setConfigGlobal] = useState({});
    const [descargandoIdx, setDescargandoIdx] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
       apiFetch(`${apiUrl}/configuracion`)
        .then(res => res.json())
        .then(data => { if (data) setConfigGlobal(data); })
        .catch(() => {});
    }, [apiUrl]);

    const cargarMisRecibos = useCallback(async () => {
        setCargando(true);
        try {
            const hoyStr = new Date().toISOString().split('T')[0];
            const res = await apiFetch(`${apiUrl}/usuarios/rendimiento?periodo=anio&fecha=${hoyStr.substring(0,4)}-01-01`);
            if (res.ok) {
                const data = await res.json();
                const cortes = data.cortesNomina || [];
                const acumulado = [];
                cortes.forEach(nomina => {
                    const datos = typeof nomina.datos_corte === 'string' ? JSON.parse(nomina.datos_corte) : nomina.datos_corte;
                    if (datos && datos.metadata && datos.metadata.es_nomina === true) {
                        const recibos = datos.recibos || [];
                        const miRecibo = recibos.find(r => String(r.empleado_id) === String(user.id));
                        if (miRecibo) {
                            acumulado.push({
                                ...miRecibo,
                                metadata: datos.metadata,
                                fecha_creacion: nomina.fecha_creacion
                            });
                        }
                    }
                });
                setMisRecibos(acumulado.reverse());
            }
        } catch (e) {
            console.error("Error al cargar recibos del empleado", e);
        }
        setCargando(false);
    }, [apiUrl, user.id]);

    useEffect(() => {
        cargarMisRecibos();
    }, [cargarMisRecibos]);

    // 👇 NUEVO: Genera el mismo PDF real que usa Administración (NominaHistorial.js),
    // reutilizando el generador compartido — cero duplicación de plantilla.
    const handleDescargar = async (r, idx) => {
        setDescargandoIdx(idx);
        try {
            await generarPDFReciboNomina({
                ...r,
                metadata: r.metadata,
                ingresos_base: r.ingresos_base || [],
                adicionales_ingresos: r.nuevos_ingresos || r.adicionales_ingresos || [],
                egresos_base: r.egresos_base || [],
                adicionales_egresos: r.nuevos_egresos || r.adicionales_egresos || [],
                total_ingresos: r.total_ingresos || r.ingresos || 0,
                total_egresos: r.total_egresos || r.egresos || 0,
                neto: r.neto || 0
            }, configGlobal, apiUrl);
        } catch (e) {
            setErrorMsg('No se pudo generar el PDF de tu recibo. Intenta de nuevo.');
            setTimeout(() => setErrorMsg(null), 4000);
        }
        setDescargandoIdx(null);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 w-full max-w-full">

            {/* 👇 Alerta custom (NO nativa) de error al generar PDF */}
            {errorMsg && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] animate-in slide-in-from-top-4 fade-in duration-300 w-[90%] max-w-md">
                    <div className="flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-2 bg-red-50 border-red-500 text-red-800">
                        <AlertTriangle className="text-red-500 shrink-0" size={24} />
                        <div>
                            <p className="font-black text-sm uppercase tracking-widest leading-none mb-1">Error</p>
                            <p className="font-bold text-sm opacity-80 leading-tight">{errorMsg}</p>
                        </div>
                        <button onClick={() => setErrorMsg(null)} className="ml-auto opacity-50 hover:opacity-100 transition"><XCircle size={20}/></button>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 p-6 md:p-8 rounded-[32px] shadow-xl flex items-center gap-4 text-white">
                <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/30 text-emerald-400"><DollarSign size={32}/></div>
                <div>
                    <h3 className="text-xl md:text-2xl font-black tracking-tight">Mis Recibos de Pago</h3>
                    <p className="text-[10px] md:text-xs font-black text-emerald-400 uppercase tracking-widest mt-1">Historial de Nóminas Cobradas</p>
                </div>
            </div>

            {cargando ? (
                <div className="py-20 text-center flex flex-col items-center justify-center opacity-50">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto mb-3"></div>
                    <p className="font-black text-lg text-slate-500">Consultando tus archivos financieros...</p>
                </div>
            ) : misRecibos.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[32px] bg-white p-8">
                    <History size={56} className="text-slate-300 mb-4" />
                    <p className="font-black text-xl text-slate-800 mb-1">Sin recibos aún</p>
                    <p className="text-sm text-slate-400 font-bold">Tus próximas nóminas aprobadas aparecerán en esta sección automáticamente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {misRecibos.map((r, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                            <div className="mb-6">
                                <div className="flex justify-between items-start gap-2 mb-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Calendar size={12}/> {new Date(r.fecha_creacion).toLocaleDateString('es-MX')}
                                    </span>
                                    <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-black uppercase tracking-widest border border-emerald-100">
                                        Pagado
                                    </span>
                                </div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Periodo de Pago</p>
                                <p className="font-black text-slate-800 text-base md:text-lg mt-0.5 leading-tight">{r.metadata?.fecha_inicio} al {r.metadata?.fecha_fin}</p>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Neto Recibido</p>
                                        <p className="text-3xl font-black text-emerald-600 mt-0.5">{formaterMoneda(r.neto)}</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDescargar(r, idx)}
                                disabled={descargandoIdx === idx}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-2xl flex justify-center items-center gap-2 transition text-sm shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                <Printer size={16}/> {descargandoIdx === idx ? 'Generando PDF...' : 'Ver y Descargar PDF'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
};

export default VistaNominasEmpleado;