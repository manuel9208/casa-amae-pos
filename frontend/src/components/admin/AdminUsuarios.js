import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Sparkles, CalendarClock, History, DollarSign, MessageSquare, Calendar, ClipboardCheck } from 'lucide-react';
import DirectorioEmpleados from './usuarios/DirectorioEmpleados';
import ReportesEmpleados from './usuarios/ReportesEmpleados';
import ZonasLimpieza from './usuarios/ZonasLimpieza';
import GestorObservaciones from './usuarios/GestorObservaciones';
import GestorHorarios from './usuarios/GestorHorarios';
import VistaHistoricoMeses from './usuarios/VistaHistoricoMeses';
import VistaNominas from './usuarios/VistaNominas';
import VistaMensajesAdmin from './usuarios/VistaMensajesAdmin';
import GestorCalendarioAnual from './usuarios/GestorCalendarioAnual';

const AdminUsuarios = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm, user }) => {
  const [vista, setVista] = useState('directorio');
  const [configGlobal, setConfigGlobal] = useState({});

  // Obtenemos la configuración para que el calendario tenga los días festivos a la mano
  useEffect(() => {
    fetch(`${apiUrl}/configuracion`)
      .then(res => res.json())
      .then(data => { if (data && !data.error) setConfigGlobal(data); })
      .catch(() => {});
  }, [apiUrl]);

  return (
    <div className="max-w-[1400px] w-full mx-auto space-y-8 pb-12 animate-in fade-in px-4">
      <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4 print:hidden">
        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 shrink-0"><Users /> Gestión de Empleados</h2>
        
        <div className="flex flex-wrap justify-center gap-2 bg-slate-200 p-1.5 rounded-3xl w-full xl:w-auto">
          
          <button onClick={() => setVista('directorio')} className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl font-bold transition-all flex items-center gap-2 text-xs sm:text-sm ${vista === 'directorio' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Users size={16}/> Plantilla
          </button>
          
          {/* 👇 SE INTERCAMBIÓ: Calendario Anual AHORA ESTÁ ANTES DE HORARIOS */}
          <button onClick={() => setVista('calendario')} className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl font-bold transition-all flex items-center gap-2 text-xs sm:text-sm ${vista === 'calendario' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Calendar size={16}/> Calendario Anual
          </button>

          <button onClick={() => setVista('horarios')} className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl font-bold transition-all flex items-center gap-2 text-xs sm:text-sm ${vista === 'horarios' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <CalendarClock size={16}/> Horarios
          </button>

          <button onClick={() => setVista('limpieza')} className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl font-bold transition-all flex items-center gap-2 text-xs sm:text-sm ${vista === 'limpieza' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Sparkles size={16}/> Limpieza
          </button>

          <button onClick={() => setVista('observaciones')} className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl font-bold transition-all flex items-center gap-2 text-xs sm:text-sm ${vista === 'observaciones' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <ClipboardCheck size={16}/> Observaciones
          </button>
          
          <button onClick={() => setVista('reportes')} className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl font-bold transition-all flex items-center gap-2 text-xs sm:text-sm ${vista === 'reportes' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <TrendingUp size={16}/> Cumplimiento
          </button>
          
          {/* 👇 SE INTERCAMBIÓ: Nóminas AHORA ESTÁ ANTES DE HISTÓRICO */}
          <button onClick={() => setVista('nominas')} className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl font-black transition-all flex items-center gap-2 text-xs sm:text-sm ${vista === 'nominas' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
            <DollarSign size={16}/> Nóminas
          </button>

          <button onClick={() => setVista('historico_meses')} className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl font-black transition-all flex items-center gap-2 text-xs sm:text-sm ${vista === 'historico_meses' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
            <History size={16}/> Histórico
          </button>

          <button onClick={() => setVista('mensajes')} className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl font-black transition-all flex items-center gap-2 text-xs sm:text-sm ${vista === 'mensajes' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
            <MessageSquare size={16}/> Encargos
          </button>
          
        </div>
      </div>

      {vista === 'directorio' && <DirectorioEmpleados usuariosDB={usuariosDB} apiUrl={apiUrl} refrescarDatos={refrescarDatos} showAlert={showAlert} showConfirm={showConfirm} user={user} />}
      {vista === 'calendario' && <GestorCalendarioAnual configGlobal={configGlobal} setConfigGlobal={setConfigGlobal} apiUrl={apiUrl} showAlert={showAlert} refrescarDatos={refrescarDatos} />}
      {vista === 'horarios' && <GestorHorarios usuariosDB={usuariosDB} apiUrl={apiUrl} refrescarDatos={refrescarDatos} showAlert={showAlert} showConfirm={showConfirm} configGlobal={configGlobal} />}
      {vista === 'limpieza' && <ZonasLimpieza usuariosDB={usuariosDB} apiUrl={apiUrl} showAlert={showAlert} showConfirm={showConfirm} />}
      {vista === 'observaciones' && <GestorObservaciones usuariosDB={usuariosDB} apiUrl={apiUrl} showAlert={showAlert} showConfirm={showConfirm} />}
      {vista === 'reportes' && <ReportesEmpleados usuariosDB={usuariosDB} apiUrl={apiUrl} />}
      {vista === 'nominas' && <VistaNominas usuariosDB={usuariosDB} apiUrl={apiUrl} refrescarDatos={refrescarDatos} showAlert={showAlert} showConfirm={showConfirm} />}
      {vista === 'historico_meses' && <VistaHistoricoMeses usuariosDB={usuariosDB} apiUrl={apiUrl} />}
      {vista === 'mensajes' && <VistaMensajesAdmin usuariosDB={usuariosDB} apiUrl={apiUrl} showAlert={showAlert} />}
    </div>
  );
};

export default AdminUsuarios;