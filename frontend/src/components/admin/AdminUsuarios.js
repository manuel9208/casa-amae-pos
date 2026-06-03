import React, { useState } from 'react';
import { Users, TrendingUp, Sparkles } from 'lucide-react';
import DirectorioEmpleados from './usuarios/DirectorioEmpleados';
import ReportesEmpleados from './usuarios/ReportesEmpleados';
import ZonasLimpieza from './usuarios/ZonasLimpieza'; // 👈 NUEVO IMPORT

const AdminUsuarios = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm }) => {
  // 'directorio' | 'reportes' | 'limpieza'
  const [vista, setVista] = useState('directorio'); 

  return (
    <div className="max-w-[1400px] w-full mx-auto space-y-8 pb-12 animate-in fade-in px-4">
      
      {/* HEADER Y TABS */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 print:hidden">
        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3"><Users /> Gestión de Empleados</h2>
        <div className="flex flex-wrap justify-center gap-2 bg-slate-200 p-1 rounded-2xl">
          <button onClick={() => setVista('directorio')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${vista === 'directorio' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Users size={18}/> Plantilla Registrada
          </button>
          <button onClick={() => setVista('reportes')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${vista === 'reportes' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <TrendingUp size={18}/> Rendimiento & Asistencias
          </button>
          <button onClick={() => setVista('limpieza')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${vista === 'limpieza' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Sparkles size={18}/> Áreas de Limpieza
          </button>
        </div>
      </div>

      {vista === 'directorio' && (
        <DirectorioEmpleados 
          usuariosDB={usuariosDB} 
          apiUrl={apiUrl} 
          refrescarDatos={refrescarDatos} 
          showAlert={showAlert} 
          showConfirm={showConfirm} 
        />
      )}
      
      {vista === 'reportes' && (
        <ReportesEmpleados 
          usuariosDB={usuariosDB} 
          apiUrl={apiUrl} 
        />
      )}

      {/* 👇 NUEVA VISTA ACTIVADA */}
      {vista === 'limpieza' && (
        <ZonasLimpieza 
          usuariosDB={usuariosDB} 
          apiUrl={apiUrl} 
          showAlert={showAlert} 
        />
      )}
    </div>
  );
};

export default AdminUsuarios;