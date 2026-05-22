import React, { useState } from 'react';
import GestorClasificaciones from './catalogos/GestorClasificaciones'; // 👇 Ruta corregida hacia la subcarpeta
import GestorIngredientes from './catalogos/GestorIngredientes';     // 👇 Ruta corregida hacia la subcarpeta

const AdminCatalogos = ({
  clasificaciones, catalogoIngredientes, EMOJIS_POR_GIRO,
  baseUrl, apiUrl, refrescarDatos, showAlert, showConfirm
}) => {
  const [subSeccionCatalogos, setSubSeccionCatalogos] = useState('clasificaciones');

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <h2 className="text-3xl font-black mb-6 text-slate-800">Gestión de Ingredientes y Extras</h2>
      
      <div className="flex flex-col sm:flex-row bg-slate-200 p-1 rounded-2xl w-fit mb-8 gap-1">
        <button 
          onClick={() => setSubSeccionCatalogos('clasificaciones')} 
          className={`px-8 py-3 rounded-xl font-bold transition-all ${subSeccionCatalogos === 'clasificaciones' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Clasificaciones
        </button>
        <button 
          onClick={() => setSubSeccionCatalogos('modificadores')} 
          className={`px-8 py-3 rounded-xl font-bold transition-all ${subSeccionCatalogos === 'modificadores' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Ingredientes y Extras
        </button>
      </div>

      {subSeccionCatalogos === 'clasificaciones' ? (
         <GestorClasificaciones 
            clasificaciones={clasificaciones}
            EMOJIS_POR_GIRO={EMOJIS_POR_GIRO}
            baseUrl={baseUrl}
            apiUrl={apiUrl}
            refrescarDatos={refrescarDatos}
            showAlert={showAlert}
            showConfirm={showConfirm}
         />
      ) : (
         <GestorIngredientes 
            clasificaciones={clasificaciones}
            catalogoIngredientes={catalogoIngredientes}
            apiUrl={apiUrl}
            refrescarDatos={refrescarDatos}
            showAlert={showAlert}
            showConfirm={showConfirm}
         />
      )}
    </div>
  );
};

export default AdminCatalogos;