import React, { useState, useEffect } from 'react';
import { Gift, Coffee, DollarSign, CalendarDays } from 'lucide-react';  

const GestorPrestaciones = ({ usuariosDB, apiUrl, refrescarDatos, showAlert }) => {
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prestaciones, setPrestaciones] = useState({
    sueldo: 0, tipo_sueldo: 'Mensual', vacaciones_dias: 0, bebidas_dia: 0, platillos_dia: 0, otros_beneficios: ''
  });  

  // 👇 MODIFICACIÓN APLICADA: Filtra solo al Administrador Global
  const empleadosVisibles = usuariosDB
    .filter(u => u.nombre !== 'Administrador Global')
    .sort((a, b) => a.nombre.localeCompare(b.nombre));  

  useEffect(() => {
    if (empleadoSeleccionado) {
      const emp = usuariosDB.find(u => u.id === Number(empleadoSeleccionado));
      if (emp && emp.prestaciones) {
        setPrestaciones(typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : emp.prestaciones);
      } else {
        setPrestaciones({ sueldo: 0, tipo_sueldo: 'Mensual', vacaciones_dias: 0, bebidas_dia: 0, platillos_dia: 0, otros_beneficios: '' });
      }
    }
  }, [empleadoSeleccionado, usuariosDB]);  

  const guardarPrestaciones = async (e) => {
    e.preventDefault();
    if (!empleadoSeleccionado || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/usuarios/${empleadoSeleccionado}/prestaciones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prestaciones })
      });
      if (res.ok) {
        showAlert('Éxito', 'Prestaciones guardadas correctamente.', 'success');
        refrescarDatos();
      } else showAlert('Error', 'No se pudieron guardar las prestaciones.', 'error');
    } catch (e) { showAlert('Error', 'Error de red.', 'error'); }
    setIsSubmitting(false);
  };  

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row gap-8 items-start">  
        <div className="w-full md:w-1/3 space-y-4">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Seleccionar Empleado</label>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {empleadosVisibles.map(emp => (
              <button
                key={emp.id}
                onClick={() => setEmpleadoSeleccionado(emp.id.toString())}
                className={`w-full text-left p-5 rounded-[20px] font-black transition-all border ${empleadoSeleccionado === emp.id.toString() ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/30 scale-[1.02]' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}
              >
                {emp.nombre} <span className="block text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">{emp.rol}</span>
              </button>
            ))}
          </div>
        </div>  
        <div className="w-full md:w-2/3 bg-slate-50 border border-slate-200 rounded-[32px] p-6 md:p-10 shadow-sm">
          {!empleadoSeleccionado ? (
            <div className="text-center py-32 text-slate-400">
              <Gift size={64} className="mx-auto mb-6 opacity-30"/>
              <p className="font-black text-2xl text-slate-500 mb-2">Sin Selección</p>
              <p className="font-bold text-sm">Selecciona un empleado de la lista para gestionar sus beneficios.</p>
            </div>
          ) : (
            <form onSubmit={guardarPrestaciones} className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">  
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-4"><DollarSign size={16} className="text-emerald-500"/> Sueldo Base</h4>
                  <input type="number" step="any" value={prestaciones.sueldo} onChange={e => setPrestaciones({...prestaciones, sueldo: e.target.value})} className="w-full text-4xl font-black text-emerald-600 bg-emerald-50/50 border-0 rounded-2xl p-4 outline-none text-center mb-4 focus:ring-2 ring-emerald-500 transition-all" />
                  <select value={prestaciones.tipo_sueldo} onChange={e => setPrestaciones({...prestaciones, tipo_sueldo: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-600 cursor-pointer">
                    <option value="Diario">Pago Diario</option><option value="Semanal">Pago Semanal</option><option value="Quincenal">Pago Quincenal</option><option value="Mensual">Pago Mensual</option>
                  </select>
                </div>  
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-4"><CalendarDays size={16} className="text-blue-500"/> Vacaciones</h4>
                  <label className="block text-[10px] font-bold text-slate-400 mb-2 text-center uppercase tracking-wider">Días Disponibles por Año</label>
                  <input type="number" value={prestaciones.vacaciones_dias} onChange={e => setPrestaciones({...prestaciones, vacaciones_dias: e.target.value})} className="w-full text-4xl font-black text-blue-600 bg-blue-50/50 border-0 rounded-2xl p-4 outline-none text-center focus:ring-2 ring-blue-500 transition-all" />
                </div>
              </div>  
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-6"><Coffee size={16} className="text-orange-500"/> Comedor Interno (Límite Diario)</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 text-center uppercase tracking-wider">Bebidas Gratis</label>
                    <input type="number" value={prestaciones.bebidas_dia} onChange={e => setPrestaciones({...prestaciones, bebidas_dia: e.target.value})} className="w-full text-2xl font-black text-orange-600 bg-orange-50 border-0 rounded-2xl p-4 outline-none text-center focus:ring-2 ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 text-center uppercase tracking-wider">Platillos Gratis</label>
                    <input type="number" value={prestaciones.platillos_dia} onChange={e => setPrestaciones({...prestaciones, platillos_dia: e.target.value})} className="w-full text-2xl font-black text-orange-600 bg-orange-50 border-0 rounded-2xl p-4 outline-none text-center focus:ring-2 ring-orange-500" />
                  </div>
                </div>
              </div>  
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Gift size={16} className="text-purple-500"/> Otros Beneficios (Notas)</label>
                <textarea value={prestaciones.otros_beneficios} onChange={e => setPrestaciones({...prestaciones, otros_beneficios: e.target.value})} placeholder="Ej. Bono de puntualidad, apoyo de transporte..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-bold text-slate-700 outline-none resize-none h-32 focus:border-purple-500" />
              </div>  
              <button disabled={isSubmitting} type="submit" className="w-full py-5 bg-rose-500 hover:bg-rose-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-rose-500/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? 'Guardando...' : 'Guardar Caja de Prestaciones'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};  

export default GestorPrestaciones;