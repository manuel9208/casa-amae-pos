import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Trash2, Clock, ArrowUpRight, Tag, Zap, AlertCircle } from 'lucide-react';

const Promociones = ({ apiUrl, baseUrl, showAlert, showConfirm, productos }) => {
  const [promociones, setPromociones] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const estadoInicialFormulario = {
    nombre: '',
    tipo: 'upselling',
    producto_trigger_id: '',
    producto_oferta_id: '',
    tipo_descuento: 'porcentaje',
    valor_descuento: '',
    dias_aplicables: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    hora_inicio: '00:00',
    hora_fin: '23:59'
  };

  const [formulario, setFormulario] = useState(estadoInicialFormulario);

  const cargarPromociones = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/promociones`);
      if (res.ok) {
        const data = await res.json();
        setPromociones(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error al cargar promociones:", error);
    }
  }, [apiUrl]);

  useEffect(() => {
    cargarPromociones();
  }, [cargarPromociones]);

  const handleDiaToggle = (dia) => {
    setFormulario(prev => {
      const dias = prev.dias_aplicables.includes(dia)
        ? prev.dias_aplicables.filter(d => d !== dia)
        : [...prev.dias_aplicables, dia];
      return { ...prev, dias_aplicables: dias };
    });
  };

  const crearPromocion = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (formulario.dias_aplicables.length === 0) {
      return showAlert("Atención", "Debes seleccionar al menos un día de la semana para la promoción.", "warning");
    }

    if (!formulario.producto_oferta_id) {
      return showAlert("Atención", "Debes seleccionar el producto que se ofrecerá con descuento.", "warning");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formulario,
        producto_trigger_id: formulario.producto_trigger_id ? Number(formulario.producto_trigger_id) : null,
        producto_oferta_id: Number(formulario.producto_oferta_id),
        valor_descuento: Number(formulario.valor_descuento)
      };

      const res = await fetch(`${apiUrl}/promociones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showAlert("¡Éxito!", "Promoción creada y activada correctamente.", "success");
        setFormulario(estadoInicialFormulario);
        cargarPromociones();
      } else {
        const data = await res.json();
        showAlert("Error", data.error || "No se pudo crear la promoción.", "error");
      }
    } catch (error) {
      showAlert("Error", "Problema de conexión con el servidor.", "error");
    }
    setIsSubmitting(false);
  };

  const toggleEstado = async (id, estadoActual) => {
    try {
      const res = await fetch(`${apiUrl}/promociones/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !estadoActual })
      });
      if (res.ok) cargarPromociones();
    } catch (error) {
      showAlert("Error", "No se pudo actualizar el estado.", "error");
    }
  };

  const eliminarPromocion = (id) => {
    showConfirm("Eliminar Promoción", "¿Estás seguro de que deseas borrar esta regla permanentemente?", async () => {
      try {
        const res = await fetch(`${apiUrl}/promociones/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert("Eliminada", "Promoción borrada del sistema.", "success");
          cargarPromociones();
        }
      } catch (error) {
        showAlert("Error", "No se pudo eliminar la promoción.", "error");
      }
    });
  };

  // Helper para mostrar monedas
  const formatDinero = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-12">
      
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

      {/* FORMULARIO DE CREACIÓN */}
      <form onSubmit={crearPromocion} className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
          <Zap className="text-orange-500" size={20}/> Crear Nueva Regla Automática
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* COLUMNA IZQUIERDA: Lógica y Productos */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nombre interno de la Promoción *</label>
              <input required value={formulario.nombre} onChange={e => setFormulario({...formulario, nombre: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" placeholder="Ej. Papas a mitad de precio por hamburguesa" disabled={isSubmitting}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tipo de Regla *</label>
                <select required value={formulario.tipo} onChange={e => setFormulario({...formulario, tipo: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" disabled={isSubmitting}>
                  <option value="upselling">Upselling (Sugerencia en caja)</option>
                  <option value="happy_hour">Happy Hour (Descuento directo)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Condición (Si compran...) </label>
                <select value={formulario.producto_trigger_id} onChange={e => setFormulario({...formulario, producto_trigger_id: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" disabled={isSubmitting}>
                  <option value="">Cualquier producto (Aplica Global)</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="p-5 bg-orange-50 rounded-3xl border border-orange-100">
               <label className="block text-xs font-black text-orange-800 uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowUpRight size={16}/> Producto a Ofrecer/Descontar *</label>
               <select required value={formulario.producto_oferta_id} onChange={e => setFormulario({...formulario, producto_oferta_id: e.target.value})} className="w-full p-4 bg-white border border-orange-200 rounded-2xl outline-none focus:border-orange-500 font-black text-orange-700 mb-4 shadow-sm" disabled={isSubmitting}>
                  <option value="">-- Selecciona el producto --</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
               </select>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-orange-800 uppercase tracking-widest mb-2">Tipo de Rebaja *</label>
                    <select required value={formulario.tipo_descuento} onChange={e => setFormulario({...formulario, tipo_descuento: e.target.value})} className="w-full p-4 bg-white border border-orange-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" disabled={isSubmitting}>
                      <option value="porcentaje">Porcentaje (%)</option>
                      <option value="precio_fijo">Precio Fijo Especial ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-orange-800 uppercase tracking-widest mb-2">Valor *</label>
                    <input required type="number" step="0.01" min="0.1" value={formulario.valor_descuento} onChange={e => setFormulario({...formulario, valor_descuento: e.target.value})} className="w-full p-4 bg-white border border-orange-200 rounded-2xl outline-none focus:border-orange-500 font-black text-slate-800" placeholder={formulario.tipo_descuento === 'porcentaje' ? 'Ej. 50' : 'Ej. 25.00'} disabled={isSubmitting}/>
                  </div>
               </div>
               <p className="text-[10px] font-bold text-orange-600 mt-3 text-center">
                 {formulario.tipo_descuento === 'porcentaje' ? `El producto se ofrecerá con un ${formulario.valor_descuento || 'X'}% de descuento.` : `El producto se ofrecerá a un precio exacto de $${formulario.valor_descuento || 'X'}.`}
               </p>
            </div>
          </div>

          {/* COLUMNA DERECHA: Tiempos y Horarios */}
          <div className="space-y-6">
             <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock size={16}/> Horario de la Promoción *</label>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                   <div className="flex-1">
                     <input required type="time" value={formulario.hora_inicio} onChange={e => setFormulario({...formulario, hora_inicio: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-slate-700 text-center" disabled={isSubmitting}/>
                   </div>
                   <span className="font-black text-slate-400">A</span>
                   <div className="flex-1">
                     <input required type="time" value={formulario.hora_fin} onChange={e => setFormulario({...formulario, hora_fin: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-slate-700 text-center" disabled={isSubmitting}/>
                   </div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-2 text-center">Formato 24 horas. Ej. 18:00 a 20:00</p>
             </div>

             <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock size={16}/> Días Activos *</label>
                <div className="flex flex-wrap gap-2">
                   {diasSemana.map(dia => {
                     const activo = formulario.dias_aplicables.includes(dia);
                     return (
                       <button 
                         key={dia} type="button" disabled={isSubmitting}
                         onClick={() => handleDiaToggle(dia)}
                         className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${activo ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'}`}
                       >
                         {dia}
                       </button>
                     );
                   })}
                </div>
             </div>

             <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
                <button type="submit" disabled={isSubmitting || productos.length === 0} className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-orange-500/30 transition disabled:opacity-50 active:scale-95 flex justify-center items-center gap-2">
                   {isSubmitting ? 'Guardando...' : 'Activar Promoción'}
                </button>
             </div>
          </div>
        </div>
      </form>

      {/* LISTA DE PROMOCIONES ACTIVAS E INACTIVAS */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-slate-800 ml-2">Reglas Configuradas ({promociones.length})</h3>
        
        {promociones.length === 0 ? (
          <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-[30px] p-10 text-center">
            <Gift size={48} className="text-slate-400 mx-auto mb-4 opacity-50" />
            <p className="text-slate-500 font-bold">Aún no has configurado ninguna promoción.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promociones.map(promo => {
               const isUpsell = promo.tipo === 'upselling';
               const dias = Array.isArray(promo.dias_aplicables) ? promo.dias_aplicables : JSON.parse(promo.dias_aplicables || '[]');
               
               return (
                 <div key={promo.id} className={`bg-white rounded-[30px] shadow-sm border-2 overflow-hidden transition-all relative ${promo.activo ? (isUpsell ? 'border-orange-200 hover:shadow-orange-100/50' : 'border-purple-200 hover:shadow-purple-100/50') : 'border-slate-200 opacity-70 grayscale'}`}>
                    
                    {/* Header Tarjeta */}
                    <div className={`p-4 flex justify-between items-start border-b ${isUpsell ? 'bg-orange-50/50 border-orange-100' : 'bg-purple-50/50 border-purple-100'}`}>
                       <div>
                         <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isUpsell ? 'bg-orange-200 text-orange-800' : 'bg-purple-200 text-purple-800'}`}>
                            {isUpsell ? 'Sugerencia (Upsell)' : 'Happy Hour'}
                         </span>
                         <h4 className="font-black text-slate-800 text-lg mt-2 leading-tight pr-8">{promo.nombre}</h4>
                       </div>
                       
                       <label className="flex items-center cursor-pointer absolute top-4 right-4">
                         <input type="checkbox" checked={promo.activo} onChange={() => toggleEstado(promo.id, promo.activo)} className={`w-5 h-5 ${isUpsell ? 'accent-orange-500' : 'accent-purple-500'}`} disabled={isSubmitting}/>
                       </label>
                    </div>

                    {/* Cuerpo Tarjeta */}
                    <div className="p-5 flex flex-col h-full gap-4">
                       
                       <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <div className="text-xs font-bold text-slate-500 text-center w-full">
                            <span className="block text-[10px] uppercase mb-1">Si compran...</span>
                            <span className="text-slate-800">{promo.trigger_nombre || 'CUALQUIER COSA'}</span>
                          </div>
                          <ArrowUpRight className="text-slate-300 mx-2 shrink-0"/>
                          <div className="text-xs font-black text-emerald-600 text-center w-full">
                            <span className="block text-[10px] uppercase text-emerald-600/70 mb-1">Ofrécele...</span>
                            <span>{promo.oferta_nombre}</span>
                          </div>
                       </div>

                       <div className="flex items-center gap-2 mt-auto">
                          <Tag className="text-slate-400 shrink-0" size={16}/>
                          <p className="text-sm font-bold text-slate-700">
                            {promo.tipo_descuento === 'porcentaje' ? (
                               <>Aplica un <strong className="text-red-500">{promo.valor_descuento}% de descuento</strong></>
                            ) : (
                               <>Precio fijo de <strong className="text-blue-600">{formatDinero(promo.valor_descuento)}</strong></>
                            )}
                          </p>
                       </div>

                       <div className="flex items-start gap-2 pt-3 border-t border-slate-100">
                          <Clock className="text-slate-400 shrink-0 mt-0.5" size={16}/>
                          <div className="text-xs font-bold text-slate-500 leading-snug">
                             <span className="text-slate-700 block mb-1">
                               {promo.hora_inicio.slice(0,5)} a {promo.hora_fin.slice(0,5)} hrs
                             </span>
                             <span className="line-clamp-2" title={dias.join(', ')}>{dias.join(', ')}</span>
                          </div>
                       </div>

                    </div>

                    {/* Botón Eliminar */}
                    <button onClick={() => eliminarPromocion(promo.id)} className="absolute bottom-4 right-4 p-2 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition" disabled={isSubmitting}>
                       <Trash2 size={18}/>
                    </button>
                 </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Promociones;