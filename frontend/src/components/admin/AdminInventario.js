import React, { useState } from 'react';
import GestorInsumos from './inventario/GestorInsumos';
import GestorRecetas from './inventario/GestorRecetas';

const AdminInventario = ({
  insumosDB, productos, clasificaciones, apiUrl, refrescarDatos, showAlert, showConfirm
}) => {
  const [subSeccionInventario, setSubSeccionInventario] = useState('insumos');

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 relative animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-slate-800">Control de Insumos y Recetas</h2>
      </div>
      
      <div className="flex flex-col sm:flex-row bg-slate-200 p-1 rounded-2xl w-fit mb-8 gap-1">
        <button 
          onClick={() => setSubSeccionInventario('insumos')} 
          className={`px-8 py-3 rounded-xl font-bold transition-all ${subSeccionInventario === 'insumos' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Materia Prima (Insumos)
        </button>
        <button 
          onClick={() => setSubSeccionInventario('recetas')} 
          className={`px-8 py-3 rounded-xl font-bold transition-all ${subSeccionInventario === 'recetas' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Escandallos (Recetas)
        </button>
      </div>

      {subSeccionInventario === 'insumos' ? (
         <GestorInsumos 
            insumosDB={insumosDB}
            apiUrl={apiUrl}
            refrescarDatos={refrescarDatos}
            showAlert={showAlert}
            showConfirm={showConfirm}
         />
      ) : (
         <GestorRecetas 
            insumosDB={insumosDB}
            productos={productos}
            clasificaciones={clasificaciones}
            apiUrl={apiUrl}
            refrescarDatos={refrescarDatos}
            showAlert={showAlert}
         />
      )}
    </div>
  );
};

export default AdminInventario;