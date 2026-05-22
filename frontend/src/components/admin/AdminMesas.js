import React, { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, CheckCircle2, XCircle, Map, Save } from 'lucide-react';
import ListaMesasQR from './mesas/ListaMesasQR';
import PlanoMesas2D from './mesas/PlanoMesas2D';

const AdminMesas = ({ apiUrl }) => {
  const [mesas, setMesas] = useState([]);
  const [modoPlano, setModoPlano] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alerta, setAlerta] = useState(null);

  const cargarMesas = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/mesas`);
      if (res.ok) {
        const data = await res.json();
        const mesasMapeadas = (Array.isArray(data) ? data : []).map(m => ({
           ...m,
           pos_x: Number(m.pos_x) || 0,
           pos_y: Number(m.pos_y) || 0
        }));
        setMesas(mesasMapeadas);
      }
    } catch (error) {
      console.error("Error al cargar mesas:", error);
    }
  }, [apiUrl]);

  useEffect(() => {
    cargarMesas();
  }, [cargarMesas]);

  const mostrarAlerta = (titulo, mensaje, tipo = 'success') => {
    setAlerta({ titulo, mensaje, tipo });
    setTimeout(() => setAlerta(null), 3000);
  };

  const guardarPlanoDB = async () => {
    setIsSubmitting(true);
    try {
      const payload = mesas.map(m => ({ id: m.id, pos_x: m.pos_x, pos_y: m.pos_y }));
      const res = await fetch(`${apiUrl}/mesas/posiciones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        mostrarAlerta('Plano Guardado', 'La nueva distribución de las mesas se ha guardado para los cajeros.');
        setModoPlano(false);
      } else {
        mostrarAlerta('Error', 'No se pudo guardar la posición de las mesas.', 'error');
      }
    } catch (error) {
      mostrarAlerta('Error', 'Problema de red al guardar el plano.', 'error');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in pb-12">
      
      {alerta && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[999] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-2 ${
            alerta.tipo === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800'
          }`}>
            {alerta.tipo === 'success' ? <CheckCircle2 className="text-emerald-500" size={24} /> : <XCircle className="text-red-500" size={24} />}
            <div>
              <p className="font-black text-sm uppercase tracking-widest">{alerta.titulo}</p>
              <p className="font-bold text-sm opacity-80">{alerta.mensaje}</p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER DINÁMICO */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <LayoutGrid className="text-blue-600" size={32} /> {modoPlano ? 'Diseñador de Plano' : 'Mapeo de Mesas y QR'}
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            {modoPlano ? 'Arrastra las mesas para acomodarlas como están en tu restaurante real.' : 'Crea tus mesas por zonas y descarga sus códigos QR.'}
          </p>
        </div>
        
        {mesas.length > 0 && (
          <button 
            onClick={() => modoPlano ? guardarPlanoDB() : setModoPlano(true)}
            disabled={isSubmitting}
            className={`px-6 py-3 rounded-xl font-black transition-all shadow-md flex items-center gap-2 ${modoPlano ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
          >
            {modoPlano ? <><Save size={20}/> Guardar Plano</> : <><Map size={20}/> Diseñar Plano Visual</>}
          </button>
        )}
      </div>

      {modoPlano ? (
        <PlanoMesas2D 
           mesas={mesas} 
           setMesas={setMesas} 
           apiUrl={apiUrl} 
           setModoPlano={setModoPlano} 
           mostrarAlerta={mostrarAlerta} 
           isSubmitting={isSubmitting} 
           setIsSubmitting={setIsSubmitting} 
        />
      ) : (
        <ListaMesasQR 
           mesas={mesas} 
           apiUrl={apiUrl} 
           cargarMesas={cargarMesas} 
           mostrarAlerta={mostrarAlerta} 
           isSubmitting={isSubmitting} 
           setIsSubmitting={setIsSubmitting} 
        />
      )}
    </div>
  );
};

export default AdminMesas;