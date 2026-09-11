import React, { useState } from 'react';
import { Fingerprint, Smartphone, Users, Settings, ShieldCheck } from 'lucide-react';

// 👇 AQUÍ BUSCA SUS ARCHIVOS EN LA CARPETA HUELLAS
import ModalConfigSeguridad from './huellas/ModalConfigSeguridad';
import GestorDispositivos from './huellas/GestorDispositivos';
import GestorHuellasEmpleados from './huellas/GestorHuellasEmpleados';
import GestorHuellasClientes from './huellas/GestorHuellasClientes';

const AdminBiometria = ({ apiUrl, showAlert, user }) => {
    const [subTab, setSubTab] = useState('dispositivos'); 
    const [modalConfig, setModalConfig] = useState(false);

    return (
        <div className="animate-in fade-in duration-300 relative min-h-[80vh]">
            {/* ENCABEZADO Y ENGRANE */}
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Fingerprint className="text-blue-600" size={32} />
                        Seguridad y Biometría
                    </h1>
                    <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">
                        Gestión de Dispositivos (MDM) y Huellas Digitales
                    </p>
                </div>
                <button 
                    onClick={() => setModalConfig(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl transition-all active:scale-95 border border-slate-200 shadow-sm flex items-center gap-2"
                >
                    <Settings size={20} />
                    <span className="font-bold text-sm">Configuración</span>
                </button>
            </div>

            {/* SUB-NAVEGACIÓN (TABS) */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit mb-6 border border-slate-200 shadow-inner">
                <button 
                    onClick={() => setSubTab('dispositivos')}
                    className={`px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${subTab === 'dispositivos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Smartphone size={18} /> Equipos Autorizados
                </button>
                <button 
                    onClick={() => setSubTab('empleados')}
                    className={`px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${subTab === 'empleados' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <ShieldCheck size={18} /> Huellas Empleados
                </button>
                <button 
                    onClick={() => setSubTab('clientes')}
                    className={`px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${subTab === 'clientes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Users size={18} /> Huellas Clientes
                </button>
            </div>

            {/* CONTENEDOR DINÁMICO DE SUB-VISTAS */}
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 min-h-[400px]">
                {subTab === 'dispositivos' && (
                    <div className="animate-in fade-in">
                        <GestorDispositivos apiUrl={apiUrl} showAlert={showAlert} /> 
                    </div>
                )}
                {subTab === 'empleados' && (
                    <div className="animate-in fade-in">
                        <GestorHuellasEmpleados apiUrl={apiUrl} showAlert={showAlert} /> 
                    </div>
                )}
                {subTab === 'clientes' && (
                    <div className="animate-in fade-in">
                        <GestorHuellasClientes apiUrl={apiUrl} showAlert={showAlert} />
                    </div>
                )}
            </div>

            {/* MODAL AISLADO DE CONFIGURACIÓN */}
            {modalConfig && (
                <ModalConfigSeguridad 
                    apiUrl={apiUrl} 
                    showAlert={showAlert} 
                    onClose={() => setModalConfig(false)} 
                />
            )}
        </div>
    );
};

export default AdminBiometria;