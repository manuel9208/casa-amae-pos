import React, { useState } from 'react';
import { CheckCircle2, XCircle, CameraOff, Maximize2, X } from 'lucide-react';
// 👇 RUTA CORREGIDA: Sube 3 niveles hasta src/components/
import ImagenCachada from '../../../ImagenCachada'; 

const GaleriaLimpieza = ({ 
    fechaSeleccionada, 
    evidencias, 
    evaluaciones, 
    areasBase, 
    empleadosVisibles, 
    evaluarEvidencia 
}) => {
    const [fotoZoom, setFotoZoom] = useState(null);

    if (!fechaSeleccionada) {
        return (
            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                <p className="font-bold">Selecciona una fecha en el calendario superior para auditar las fotos de ese día.</p>
            </div>
        );
    }

    // Extraer y aplanar todas las fotos del día seleccionado
    const tarjetas = [];
    areasBase.forEach(area => {
        const evdsArea = evidencias[area.id]?.[fechaSeleccionada] || {};
        Object.keys(evdsArea).forEach(empId => {
            const url = evdsArea[empId];
            const emp = empleadosVisibles.find(u => String(u.id) === String(empId));
            const status = evaluaciones[area.id]?.[fechaSeleccionada]?.[empId] || null;

            if (url) {
                tarjetas.push({
                    areaId: area.id,
                    areaNombre: area.nombre,
                    empId: empId,
                    empNombre: emp ? emp.nombre.split(' ')[0] : 'Desconocido',
                    empRol: emp ? emp.rol : '',
                    url,
                    status
                });
            }
        });
    });

    if (tarjetas.length === 0) {
        return (
            <div className="p-16 text-center text-slate-400 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 animate-in zoom-in-95">
                <CameraOff size={64} className="mx-auto mb-4 opacity-30 text-blue-500" />
                <p className="font-black text-2xl text-slate-600 mb-2">Bandeja Limpia</p>
                <p className="font-bold text-sm">No hay evidencias fotográficas subidas para el día {fechaSeleccionada.split('-').reverse().join('/')}.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 mt-6">
            <h4 className="font-black text-slate-800 text-xl mb-6">
                Evidencias del {fechaSeleccionada.split('-').reverse().join('/')}
            </h4>

            {/* CUADRÍCULA DE FOTOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tarjetas.map((t, idx) => (
                    <div key={idx} className={`bg-white rounded-[24px] p-2 border-2 transition-all shadow-sm flex flex-col ${
                        t.status === 'cumplio' ? 'border-emerald-400 ring-4 ring-emerald-50' : 
                        t.status === 'no_cumplio' ? 'border-red-400 ring-4 ring-red-50' : 
                        'border-slate-200 hover:border-blue-300'
                    }`}>
                        
                        {/* Cabecera Tarjeta */}
                        <div className="px-3 py-2 flex justify-between items-start">
                            <div>
                                <p className="font-black text-slate-800 leading-tight">{t.areaNombre}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t.empNombre} ({t.empRol})</p>
                            </div>
                            {t.status === 'cumplio' && <CheckCircle2 className="text-emerald-500 shrink-0" size={20}/>}
                            {t.status === 'no_cumplio' && <XCircle className="text-red-500 shrink-0" size={20}/>}
                        </div>

                        {/* Foto con Zoom Automático */}
                        <div 
                            className="relative w-full h-48 bg-slate-100 rounded-[16px] overflow-hidden group cursor-pointer mt-1" 
                            onClick={() => setFotoZoom(t.url)}
                        >
                            <ImagenCachada src={t.url} alt="Evidencia Limpieza" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" size={32}/>
                            </div>
                        </div>

                        {/* Botones de Acción Rápida (SÍ/NO) */}
                        <div className="flex gap-2 mt-3 p-1">
                            <button
                                onClick={() => evaluarEvidencia(fechaSeleccionada, t.empId, t.areaId, 'cumplio')}
                                className={`flex-1 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1 ${
                                    t.status === 'cumplio' ? 'bg-emerald-500 text-white shadow-md' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                                }`}
                            >
                                <CheckCircle2 size={18}/> SÍ
                            </button>
                            <button
                                onClick={() => evaluarEvidencia(fechaSeleccionada, t.empId, t.areaId, 'no_cumplio')}
                                className={`flex-1 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1 ${
                                    t.status === 'no_cumplio' ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                                }`}
                            >
                                <XCircle size={18}/> NO
                            </button>
                        </div>
                        
                        {/* Botón Reset */}
                        {t.status && (
                            <button onClick={() => evaluarEvidencia(fechaSeleccionada, t.empId, t.areaId, null)} className="mt-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition underline text-center pb-2">
                                Deshacer evaluación
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* MODAL FOTO AMPLIADA EN PANTALLA COMPLETA */}
            {fotoZoom && (
                <div 
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-8 bg-slate-900/90 backdrop-blur-sm animate-in fade-in" 
                    onClick={() => setFotoZoom(null)}
                >
                    <div className="relative max-w-4xl w-full max-h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setFotoZoom(null)} 
                            className="absolute -top-14 right-0 md:-right-14 text-white/60 hover:text-white transition bg-slate-800 p-2 rounded-full border border-slate-700 hover:scale-110"
                        >
                            <X size={28} />
                        </button>
                        <img 
                            src={fotoZoom} 
                            alt="Zoom Limpieza" 
                            className="max-w-full max-h-[85vh] rounded-[24px] shadow-2xl object-contain border-4 border-white/10" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default GaleriaLimpieza;