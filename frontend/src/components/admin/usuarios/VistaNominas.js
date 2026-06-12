import React, { useState } from 'react';
import { Settings, Calculator, History } from 'lucide-react';

// Importaremos los archivos hijos (que crearemos en los siguientes pasos)
import NominaConfig from './nominas/NominaConfig';
import NominaGenerar from './nominas/NominaGenerar';
import NominaHistorial from './nominas/NominaHistorial';

const VistaNominas = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm }) => {
  const [tabNomina, setTabNomina] = useState('config_emp'); 

  return (
    <div className="animate-in fade-in">
      <div className="flex justify-between items-end mb-8">
        <h2 className="text-4xl font-black text-slate-800 tracking-tight">Nóminas y Bonos</h2>
      </div>

      {/* MENÚ DE PESTAÑAS */}
      <div className="flex gap-2 mb-8 bg-slate-200 p-1 rounded-2xl w-fit overflow-x-auto custom-scrollbar">
        <button 
          onClick={() => setTabNomina('config_emp')} 
          className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${tabNomina === 'config_emp' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Settings size={18} /> Configuración y Bonos
        </button>
        <button 
          onClick={() => setTabNomina('generar')} 
          className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${tabNomina === 'generar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Calculator size={18} /> Generar Nómina
        </button>
        <button 
          onClick={() => setTabNomina('historial')} 
          className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${tabNomina === 'historial' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <History size={18} /> Historial
        </button>
      </div>

      {/* RENDERIZADO DINÁMICO DEL ARCHIVO SELECCIONADO */}
      <div className="bg-slate-50/50 rounded-[32px]">
        {tabNomina === 'config_emp' && (
          <NominaConfig 
            usuariosDB={usuariosDB} 
            apiUrl={apiUrl} 
            refrescarDatos={refrescarDatos} 
            showAlert={showAlert} 
          />
        )}
        
        {tabNomina === 'generar' && (
          <NominaGenerar 
            usuariosDB={usuariosDB} 
            apiUrl={apiUrl} 
            showAlert={showAlert} 
            showConfirm={showConfirm} 
          />
        )}
        
        {tabNomina === 'historial' && (
          <NominaHistorial 
            apiUrl={apiUrl} 
            showAlert={showAlert} 
            showConfirm={showConfirm} 
          />
        )}
      </div>
    </div>
  );
};

export default VistaNominas;