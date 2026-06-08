import React, { useState } from 'react';
import DirectorioEmpleados from './usuarios/DirectorioEmpleados';
import GestorHorarios from './usuarios/GestorHorarios';
import GestorPrestaciones from './usuarios/GestorPrestaciones'; 
import ZonasLimpieza from './usuarios/ZonasLimpieza';
import ReportesEmpleados from './usuarios/ReportesEmpleados';
import { Users, Clock, Trash2, BarChart2, Gift } from 'lucide-react';

const AdminUsuarios = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm, configGlobal, setConfigGlobal }) => {
  const [subSeccion, setSubSeccion] = useState('directorio');

  return (
    <div className="max-w-[1400px] w-full mx-auto space-y-6 animate-in fade-in px-4 pb-12">
      <div className="flex gap-2 border-b border-slate-200 pb-4 overflow-x-auto custom-scrollbar">
        <button onClick={() => setSubSeccion('directorio')} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black whitespace-nowrap transition shadow-sm ${subSeccion === 'directorio' ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><Users size={18}/> Directorio</button>
        <button onClick={() => setSubSeccion('horarios')} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black whitespace-nowrap transition shadow-sm ${subSeccion === 'horarios' ? 'bg-purple-600 text-white shadow-purple-500/30' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><Clock size={18}/> Horarios (Mes)</button>
        <button onClick={() => setSubSeccion('prestaciones')} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black whitespace-nowrap transition shadow-sm ${subSeccion === 'prestaciones' ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><Gift size={18}/> Prestaciones</button>
        <button onClick={() => setSubSeccion('limpieza')} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black whitespace-nowrap transition shadow-sm ${subSeccion === 'limpieza' ? 'bg-teal-600 text-white shadow-teal-500/30' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><Trash2 size={18}/> Limpieza (Mes)</button>
        <button onClick={() => setSubSeccion('reportes')} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black whitespace-nowrap transition shadow-sm ${subSeccion === 'reportes' ? 'bg-emerald-600 text-white shadow-emerald-500/30' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><BarChart2 size={18}/> Reportes & Nómina</button>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[36px] shadow-sm border border-slate-200">
        {subSeccion === 'directorio' && <DirectorioEmpleados usuariosDB={usuariosDB} apiUrl={apiUrl} refrescarDatos={refrescarDatos} showAlert={showAlert} showConfirm={showConfirm} />}
        {subSeccion === 'horarios' && <GestorHorarios usuariosDB={usuariosDB} apiUrl={apiUrl} refrescarDatos={refrescarDatos} showAlert={showAlert} showConfirm={showConfirm} />}
        {subSeccion === 'prestaciones' && <GestorPrestaciones usuariosDB={usuariosDB} apiUrl={apiUrl} refrescarDatos={refrescarDatos} showAlert={showAlert} />}
        {subSeccion === 'limpieza' && <ZonasLimpieza configGlobal={configGlobal} setConfigGlobal={setConfigGlobal} usuariosDB={usuariosDB} apiUrl={apiUrl} showAlert={showAlert} showConfirm={showConfirm} />}
        {subSeccion === 'reportes' && <ReportesEmpleados usuariosDB={usuariosDB} apiUrl={apiUrl} />}
      </div>
    </div>
  );
};

export default AdminUsuarios;