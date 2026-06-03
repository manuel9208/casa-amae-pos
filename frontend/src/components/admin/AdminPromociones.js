import React, { useState, useEffect, useCallback } from 'react';
import { Gift, AlertCircle } from 'lucide-react';
import FormularioPromocion from './promociones/FormularioPromocion';
import ListaPromociones from './promociones/ListaPromociones';

const AdminPromociones = ({ apiUrl, baseUrl, showAlert, showConfirm, productos }) => {
  const [promociones, setPromociones] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const [resPromo, resClasif] = await Promise.all([
        fetch(`${apiUrl}/promociones`),
        fetch(`${apiUrl}/clasificaciones`)
      ]);
      if (resPromo.ok) {
        const data = await resPromo.json();
        setPromociones(Array.isArray(data) ? data : []);
      }
      if (resClasif.ok) {
        const dataC = await resClasif.json();
        setClasificaciones(Array.isArray(dataC) ? dataC : []);
      }
    } catch (error) {
      console.error("Error al cargar datos de promociones:", error);
    }
  }, [apiUrl]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in pb-12 px-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-orange-100 text-orange-600 p-3 rounded-2xl"><Gift size={28}/></div>
        <div>
          <h2 className="text-3xl font-black text-slate-800">Promociones y Upselling</h2>
          <p className="text-slate-500 font-medium">Configura reglas automáticas para aumentar tu ticket promedio.</p>
        </div>
      </div>

      {(!productos || productos.length === 0) && (
         <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
           <AlertCircle className="text-red-500" size={32} />
           <div>
             <h3 className="font-black text-red-800 text-lg">No hay productos en tu menú</h3>
             <p className="text-red-600 font-medium text-sm">Necesitas registrar platillos en la sección de "Gestión Menú" antes de poder crear promociones.</p>
           </div>
         </div>
      )}

      <FormularioPromocion 
         productos={productos} 
         clasificaciones={clasificaciones} 
         apiUrl={apiUrl} 
         showAlert={showAlert} 
         refrescarDatos={cargarDatos}
         isSubmitting={isSubmitting}
         setIsSubmitting={setIsSubmitting}
      />

      <ListaPromociones 
         promociones={promociones} 
         apiUrl={apiUrl} 
         showAlert={showAlert} 
         showConfirm={showConfirm} 
         refrescarDatos={cargarDatos}
         isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default AdminPromociones;