import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Ticket } from 'lucide-react';

const GestorCupones = ({ apiUrl, showAlert, showConfirm }) => {
  const [cupones, setCupones] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nuevoCupon, setNuevoCupon] = useState({ 
    codigo: '', tipo: 'porcentaje', valor: '', limite_usos: '', fecha_vencimiento: '' 
  });

  const cargarCupones = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/cupones`);
      if (res.ok) {
        const data = await res.json();
        setCupones(Array.isArray(data) ? data : []);
      }
    } catch (error) { 
      console.error("Error cargando cupones:", error); 
    }
  }, [apiUrl]);

  useEffect(() => { cargarCupones(); }, [cargarCupones]);

  const crearCupon = async (e) => {
    e.preventDefault();
    if(isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/cupones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoCupon,
          limite_usos: nuevoCupon.limite_usos ? Number(nuevoCupon.limite_usos) : null,
          fecha_vencimiento: nuevoCupon.fecha_vencimiento || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("¡Cupón Creado!", "El código promocional está listo para usarse.", "success");
        setNuevoCupon({ codigo: '', tipo: 'porcentaje', valor: '', limite_usos: '', fecha_vencimiento: '' });
        cargarCupones();
      } else {
        showAlert("Atención", data.error || "No se pudo crear el cupón.", "warning");
      }
    } catch (error) {
      showAlert("Error", "Error de conexión al servidor.", "error");
    }
    setIsSubmitting(false);
  };

  const toggleEstadoCupon = async (id, estadoActual) => {
    try {
      const res = await fetch(`${apiUrl}/cupones/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !estadoActual })
      });
      if (res.ok) cargarCupones();
    } catch (error) { 
      showAlert("Error", "No se pudo actualizar el estado del cupón.", "error"); 
    }
  };

  const eliminarCupon = (id) => {
    showConfirm("Eliminar Cupón", "¿Seguro que deseas borrar este código de descuento permanentemente?", async () => {
      try {
        const res = await fetch(`${apiUrl}/cupones/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert("Eliminado", "Cupón borrado.", "success");
          cargarCupones();
        }
      } catch (error) { 
        showAlert("Error", "No se pudo eliminar el cupón.", "error"); 
      }
    });
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200 mt-8">
      <h3 className="text-xl font-bold mb-6 text-rose-600 flex items-center gap-2 border-b pb-2">
        <Ticket size={24}/> 9. Cupones de Descuento
      </h3>

      <form onSubmit={crearCupon} className="bg-rose-50/30 p-6 rounded-3xl border border-rose-100 mb-8 space-y-4">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-black text-rose-600 uppercase mb-1">Código Promocional *</label>
              <input required value={nuevoCupon.codigo} onChange={e => setNuevoCupon({...nuevoCupon, codigo: e.target.value.toUpperCase().replace(/\s+/g, '')})} className="w-full p-3 bg-white border border-rose-200 rounded-xl outline-none font-black text-slate-700 uppercase" placeholder="Ej. VERANO20" disabled={isSubmitting}/>
            </div>
            <div>
              <label className="block text-xs font-black text-rose-600 uppercase mb-1">Tipo de Descuento *</label>
              <select required value={nuevoCupon.tipo} onChange={e => setNuevoCupon({...nuevoCupon, tipo: e.target.value})} className="w-full p-3 bg-white border border-rose-200 rounded-xl outline-none font-bold text-slate-700" disabled={isSubmitting}>
                 <option value="porcentaje">Porcentaje (%)</option>
                 <option value="fijo">Monto Fijo ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-rose-600 uppercase mb-1">Valor *</label>
              <input required type="number" step="0.01" min="0.1" value={nuevoCupon.valor} onChange={e => setNuevoCupon({...nuevoCupon, valor: e.target.value})} className="w-full p-3 bg-white border border-rose-200 rounded-xl outline-none font-bold text-slate-700" placeholder="Ej. 15" disabled={isSubmitting}/>
            </div>
            <div>
              <label className="block text-xs font-black text-rose-600 uppercase mb-1">Límite Usos</label>
              <input type="number" min="1" value={nuevoCupon.limite_usos} onChange={e => setNuevoCupon({...nuevoCupon, limite_usos: e.target.value})} className="w-full p-3 bg-white border border-rose-200 rounded-xl outline-none font-medium text-slate-700" placeholder="Ilimitado" disabled={isSubmitting}/>
            </div>
            <div>
              <label className="block text-xs font-black text-rose-600 uppercase mb-1">Vencimiento</label>
              <input type="date" value={nuevoCupon.fecha_vencimiento} onChange={e => setNuevoCupon({...nuevoCupon, fecha_vencimiento: e.target.value})} className="w-full p-3 bg-white border border-rose-200 rounded-xl outline-none font-medium text-slate-700" disabled={isSubmitting}/>
            </div>
         </div>
         <div className="flex justify-end pt-2">
            <button type="submit" disabled={isSubmitting || !nuevoCupon.codigo || !nuevoCupon.valor} className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-xl font-black transition shadow-md disabled:opacity-50">
               ➕ Crear Cupón
            </button>
         </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
         <table className="w-full text-left border-collapse min-w-max">
            <thead>
               <tr className="bg-slate-100 text-slate-500 text-xs uppercase font-black">
                  <th className="p-4">Código</th>
                  <th className="p-4 text-center">Descuento</th>
                  <th className="p-4 text-center">Usos</th>
                  <th className="p-4 text-center">Vencimiento</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {cupones.length === 0 ? (
                 <tr><td colSpan="6" className="p-6 text-center text-slate-400 font-bold">No hay cupones registrados.</td></tr>
               ) : cupones.map(c => (
                 <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-4 font-black text-rose-600 text-lg">{c.codigo}</td>
                    <td className="p-4 text-center font-bold text-slate-700">{c.tipo === 'porcentaje' ? `${c.valor}%` : `$${c.valor}`}</td>
                    <td className="p-4 text-center font-bold text-slate-500">{c.usos_actuales} / {c.limite_usos || '∞'}</td>
                    <td className="p-4 text-center font-bold text-slate-500">{c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString() : 'Nunca'}</td>
                    <td className="p-4 text-center">
                       <label className="flex items-center justify-center cursor-pointer">
                         <input type="checkbox" checked={c.activo} onChange={() => toggleEstadoCupon(c.id, c.activo)} className="w-5 h-5 accent-emerald-500" disabled={isSubmitting}/>
                       </label>
                    </td>
                    <td className="p-4 flex justify-center">
                       <button onClick={() => eliminarCupon(c.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition" disabled={isSubmitting}><Trash2 size={20}/></button>
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );
};

export default GestorCupones;