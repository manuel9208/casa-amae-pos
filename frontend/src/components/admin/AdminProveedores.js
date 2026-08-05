import React, { useState } from 'react';
import { Settings, Truck, Receipt, XCircle } from 'lucide-react';

import DirectorioProveedores from './proveedores/DirectorioProveedores';
import ControlGastos from './proveedores/ControlGastos';
import ConfigProveedores from './proveedores/ConfigProveedores';

// 👇 FIX APLICADO: Aseguramos recibir refrescarDatos en las props
const AdminProveedores = ({ insumosDB, productos, configGlobal, apiUrl, showAlert, showConfirm, refrescarDatos }) => {
  const [subSeccion, setSubSeccion] = useState('directorio');
  const [mostrarConfig, setMostrarConfig] = useState(false);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12 animate-in fade-in relative">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
          <Truck className="text-blue-600" size={32}/> Proveedores y Compras
        </h2>
        
        <button 
          onClick={() => setMostrarConfig(true)}
          className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition shadow-sm active:scale-95"
        >
          <Settings size={20} className="text-slate-400"/> Configuración
        </button>
      </div>

      <div className="flex flex-col sm:flex-row bg-slate-200 p-1 rounded-2xl w-fit mb-8 gap-1">
        <button
          onClick={() => setSubSeccion('directorio')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${subSeccion === 'directorio' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Truck size={18}/> Directorio de Proveedores
        </button>
        <button
          onClick={() => setSubSeccion('gastos')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${subSeccion === 'gastos' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Receipt size={18}/> Control de Facturas y Gastos
        </button>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-3xl min-h-[400px]">
        {subSeccion === 'directorio' && (
          <DirectorioProveedores 
            insumosDB={insumosDB} 
            productos={productos} 
            apiUrl={apiUrl} 
            showAlert={showAlert} 
            showConfirm={showConfirm} 
          />
        )}
        
        {subSeccion === 'gastos' && (
          <ControlGastos 
            apiUrl={apiUrl} 
            showAlert={showAlert} 
            showConfirm={showConfirm} 
            insumosDB={insumosDB}
            productos={productos}
            configGlobal={configGlobal}
          />
        )}
      </div>

      {mostrarConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Settings className="text-slate-400"/> Configuración de Proveedores
              </h3>
              <button onClick={() => setMostrarConfig(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition">
                <XCircle size={28}/>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <ConfigProveedores 
                  configGlobal={configGlobal} 
                  apiUrl={apiUrl} 
                  showAlert={showAlert} 
                  refrescarDatos={refrescarDatos}
                  cerrarModal={() => setMostrarConfig(false)} 
                />
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminProveedores;