import React, { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp } from 'lucide-react';
import DirectorioClientes from './clientes/DirectorioClientes';
import AnaliticaClientes from './clientes/AnaliticaClientes';

const AdminClientes = ({ apiUrl, showAlert }) => {
  const [vista, setVista] = useState('directorio'); 
  const [clientes, setClientes] = useState([]);
  const [reportes, setReportes] = useState(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [resClientes, resReportes] = await Promise.all([
        fetch(`${apiUrl}/clientes`),
        fetch(`${apiUrl}/clientes/reportes`)
      ]);

      if (resClientes.ok && resReportes.ok) {
        const dataClientes = await resClientes.json();
        const dataReportes = await resReportes.json();
        setClientes(Array.isArray(dataClientes) ? dataClientes : []);
        setReportes(dataReportes);
      } else {
        setClientes([]);
        setReportes({ promedioEdad: 0, topPuntos: [], antiguos: [], pagos: [], origenes: [], platillos: [] });
      }
    } catch (error) {
      console.warn("CRM: Ejecutando en modo vacío (Sin datos iniciales).");
      setClientes([]);
      setReportes({ promedioEdad: 0, topPuntos: [], antiguos: [], pagos: [], origenes: [], platillos: [] });
    }
  }, [apiUrl]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3"><Users /> Gestión de Clientes (CRM)</h2>
        <div className="flex gap-2 bg-slate-200 p-1 rounded-2xl">
          <button onClick={() => setVista('directorio')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${vista === 'directorio' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Users size={18}/> Directorio
          </button>
          <button onClick={() => setVista('reportes')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${vista === 'reportes' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <TrendingUp size={18}/> Analítica
          </button>
        </div>
      </div>

      {vista === 'directorio' ? (
         <DirectorioClientes 
            clientes={clientes} 
            apiUrl={apiUrl} 
            showAlert={showAlert} 
            refrescarDatos={cargarDatos}
         />
      ) : (
         <AnaliticaClientes 
            clientes={clientes} 
            reportes={reportes} 
         />
      )}
    </div>
  );
};

export default AdminClientes;