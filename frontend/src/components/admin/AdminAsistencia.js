import React, { useState } from 'react';
import { ShieldCheck, Smartphone, FileSpreadsheet } from 'lucide-react';

// Importación de los submódulos independientes
import GestorRedesGPS from './asistencia/GestorRedesGPS';
import GestorDispositivosNFC from './asistencia/GestorDispositivosNFC';
import ReporteAsistencias from './asistencia/ReporteAsistencias';

const AdminAsistencia = ({ apiUrl, showAlert, showConfirm }) => {
    // Control de pestañas: 'redes' | 'dispositivos' | 'reportes'
    const [tabActiva, setTabActiva] = useState('redes');

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in pb-12 px-4 md:px-0">
            
            {/* MENÚ DE NAVEGACIÓN SUPERIOR */}
            <div className="flex bg-white p-2 rounded-3xl shadow-sm border border-slate-200 overflow-x-auto custom-scrollbar">
                <button 
                    onClick={() => setTabActiva('redes')} 
                    className={`flex-1 py-3 px-6 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${tabActiva === 'redes' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <ShieldCheck size={18}/> Listas Blancas (GPS/IP)
                </button>
                <button 
                    onClick={() => setTabActiva('dispositivos')} 
                    className={`flex-1 py-3 px-6 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${tabActiva === 'dispositivos' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Smartphone size={18}/> Celulares y NFC
                </button>
                <button 
                    onClick={() => setTabActiva('reportes')} 
                    className={`flex-1 py-3 px-6 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${tabActiva === 'reportes' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <FileSpreadsheet size={18}/> Reportes de Asistencia
                </button>
            </div>

            {/* RENDERIZADO DEL SUBMÓDULO SELECCIONADO */}
            <div className="mt-6">
                {tabActiva === 'redes' && (
                    <GestorRedesGPS apiUrl={apiUrl} showAlert={showAlert} showConfirm={showConfirm} />
                )}
                
                {tabActiva === 'dispositivos' && (
                    <GestorDispositivosNFC apiUrl={apiUrl} showAlert={showAlert} showConfirm={showConfirm} />
                )}

                {tabActiva === 'reportes' && (
                    <ReporteAsistencias apiUrl={apiUrl} />
                )}
            </div>

        </div>
    );
};

export default AdminAsistencia;