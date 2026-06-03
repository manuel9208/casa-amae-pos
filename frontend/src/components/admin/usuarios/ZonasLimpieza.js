import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Sparkles, AlertCircle } from 'lucide-react';

const ZonasLimpieza = ({ usuariosDB, apiUrl, showAlert, showConfirm }) => { // 👈 Se agregó showConfirm en los props
  const [areas, setAreas] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [nuevaArea, setNuevaArea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Días de la semana para las columnas
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  // Filtramos la plantilla para que el Admin Global no haga limpieza
  const empleadosVisibles = usuariosDB.filter(u => u.usuario !== 'admin');

  useEffect(() => {
    fetch(`${apiUrl}/configuracion`)
      .then(res => res.json())
      .then(data => {
        if (data && data.matriz_limpieza) {
          try {
            const parsed = typeof data.matriz_limpieza === 'string' ? JSON.parse(data.matriz_limpieza) : data.matriz_limpieza;
            setAreas(parsed.areas || []);
            setAsignaciones(parsed.asignaciones || {});
          } catch (e) {
            console.error("Error parseando matriz");
          }
        }
      })
      .catch(err => console.error("Error cargando matriz de limpieza"));
  }, [apiUrl]);

  const agregarArea = (e) => {
    e.preventDefault();
    const areaTrim = nuevaArea.trim();
    if (!areaTrim) return;
    if (areas.includes(areaTrim)) return showAlert('Aviso', 'Esta área de limpieza ya existe.', 'info');
    
    setAreas([...areas, areaTrim]);
    setNuevaArea('');
  };

  // 👇 LÓGICA CORREGIDA CON EL MODAL BONITO
  const eliminarArea = (areaTarget) => {
    showConfirm("Eliminar Área", `¿Estás seguro que deseas eliminar el área: ${areaTarget}? Se borrarán también sus asignaciones.`, () => {
      const nuevasAreas = areas.filter(a => a !== areaTarget);
      const nuevasAsignaciones = { ...asignaciones };
      delete nuevasAsignaciones[areaTarget];
      
      setAreas(nuevasAreas);
      setAsignaciones(nuevasAsignaciones);
    });
  };

  const manejarAsignacion = (area, dia, usuarioId) => {
    setAsignaciones(prev => ({
      ...prev,
      [area]: {
        ...(prev[area] || {}),
        [dia]: usuarioId
      }
    }));
  };

  const guardarMatriz = async () => {
    setIsSubmitting(true);
    try {
      const payload = { areas, asignaciones };
      const formData = new FormData();
      formData.append('matriz_limpieza', JSON.stringify(payload));

      const res = await fetch(`${apiUrl}/configuracion`, {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        showAlert('¡Guardado!', 'La matriz de limpieza se ha actualizado correctamente.', 'success');
      } else {
        showAlert('Error', 'No se pudo guardar la matriz.', 'error');
      }
    } catch (error) {
      showAlert('Error', 'Error de red al guardar.', 'error');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
           <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
             <Sparkles className="text-teal-500"/> Matriz de Limpieza Semanal
           </h3>
           <p className="text-slate-500 font-medium mt-1">Asigna un responsable por día a cada área del restaurante.</p>
        </div>
        
        <form onSubmit={agregarArea} className="flex w-full md:w-auto gap-2">
           <input 
             type="text" 
             value={nuevaArea} 
             onChange={(e) => setNuevaArea(e.target.value)} 
             placeholder="Ej. Baños, Barra, Terraza..." 
             className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-teal-500 font-bold text-slate-700"
           />
           <button 
             type="submit" 
             disabled={!nuevaArea.trim()}
             className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-2"
           >
             <Plus size={20}/> <span className="hidden sm:inline">Agregar</span>
           </button>
        </form>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-3xl mb-8">
        {areas.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
             <Sparkles size={48} className="mx-auto mb-4 opacity-30" />
             <p className="font-bold text-lg">Aún no has agregado áreas de limpieza.</p>
             <p className="text-sm">Agrega tu primera área en el recuadro superior.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                <th className="p-4 border-r border-slate-200 w-48 sticky left-0 bg-slate-100 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Área a Limpiar</th>
                {diasSemana.map(dia => (
                  <th key={dia} className="p-4 text-center border-r border-slate-200 w-32">{dia}</th>
                ))}
                <th className="p-4 text-center w-16">Acción</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="p-4 border-r border-slate-100 font-black text-slate-700 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    {area}
                  </td>
                  {diasSemana.map(dia => (
                    <td key={`${area}-${dia}`} className="p-2 border-r border-slate-100">
                      <select
                        value={asignaciones[area]?.[dia] || ''}
                        onChange={(e) => manejarAsignacion(area, dia, e.target.value)}
                        className={`w-full p-2.5 rounded-lg border outline-none font-bold text-xs cursor-pointer appearance-none text-center transition-colors ${
                          asignaciones[area]?.[dia] ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white'
                        }`}
                      >
                        <option value="">-- Sin asignar --</option>
                        {empleadosVisibles.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    <button 
                      onClick={() => eliminarArea(area)} 
                      className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition"
                      title="Eliminar Área"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
         <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-xs font-bold border border-amber-200">
            <AlertCircle size={16}/> ¡Recuerda guardar los cambios al terminar de asignar!
         </div>
         <button 
           onClick={guardarMatriz} 
           disabled={isSubmitting || areas.length === 0}
           className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-2xl font-black transition active:scale-95 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
         >
           <Save size={20}/> {isSubmitting ? 'Guardando...' : 'Guardar Asignaciones'}
         </button>
      </div>
    </div>
  );
};

export default ZonasLimpieza;