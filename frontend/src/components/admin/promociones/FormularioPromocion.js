import React, { useState, useEffect } from 'react';
import { Zap, ArrowUpRight, Clock, X } from 'lucide-react';  

const FormularioPromocion = ({
  productos, clasificaciones, apiUrl, showAlert, refrescarDatos, isSubmitting, setIsSubmitting,
  promoAEditar, setPromoAEditar // 👈 Nuevas props recibidas
}) => {
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];  
  const [tipoCondicion, setTipoCondicion] = useState('global');
  const [todoElDia, setTodoElDia] = useState(false);  

  const estadoInicialFormulario = {
    nombre: '', tipo: 'upselling', producto_trigger_id: '', categoria_trigger: '',
    producto_oferta_id: '', tipo_descuento: 'porcentaje', valor_descuento: '',
    dias_aplicables: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    hora_inicio: '00:00', hora_fin: '23:59'
  };  

  const [formulario, setFormulario] = useState(estadoInicialFormulario);  

  // 👇 LÓGICA DE EDICIÓN: Rellenamos el formulario si hay data
  useEffect(() => {
    if (promoAEditar) {
      setFormulario({
        ...promoAEditar,
        producto_trigger_id: promoAEditar.producto_trigger_id || '',
        categoria_trigger: promoAEditar.categoria_trigger || '',
        producto_oferta_id: promoAEditar.producto_oferta_id || '',
        dias_aplicables: Array.isArray(promoAEditar.dias_aplicables) ? promoAEditar.dias_aplicables : JSON.parse(promoAEditar.dias_aplicables || '[]')
      });
      
      if (promoAEditar.producto_trigger_id) setTipoCondicion('producto');
      else if (promoAEditar.categoria_trigger) setTipoCondicion('categoria');
      else setTipoCondicion('global');
      
      setTodoElDia(promoAEditar.hora_inicio === '00:00:00' && promoAEditar.hora_fin === '23:59:00');
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Subir pantalla para ver el form
    } else {
      setFormulario(estadoInicialFormulario);
      setTipoCondicion('global');
      setTodoElDia(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoAEditar]);

  useEffect(() => {
    if (todoElDia && !promoAEditar) setFormulario(prev => ({ ...prev, hora_inicio: '00:00', hora_fin: '23:59' }));
    else if (todoElDia && promoAEditar) setFormulario(prev => ({ ...prev, hora_inicio: '00:00:00', hora_fin: '23:59:00' }));
  }, [todoElDia, promoAEditar]);  

  const handleDiaToggle = (dia) => {
    setFormulario(prev => {
      const dias = prev.dias_aplicables.includes(dia) ? prev.dias_aplicables.filter(d => d !== dia) : [...prev.dias_aplicables, dia];
      return { ...prev, dias_aplicables: dias };
    });
  };  

  const guardarPromocion = async (e) => { // 👈 Renombrada
    e.preventDefault();
    if (isSubmitting) return;  

    if (formulario.dias_aplicables.length === 0) return showAlert("Atención", "Debes seleccionar al menos un día de la semana.", "warning");
    if (!formulario.producto_oferta_id) return showAlert("Atención", "Debes seleccionar el producto en oferta.", "warning");
    if (tipoCondicion === 'producto' && !formulario.producto_trigger_id) return showAlert("Atención", "Selecciona el producto detonador.", "warning");
    if (tipoCondicion === 'categoria' && !formulario.categoria_trigger) return showAlert("Atención", "Selecciona la categoría detonadora.", "warning");  

    setIsSubmitting(true);
    try {
      const payload = {
        ...formulario,
        producto_trigger_id: tipoCondicion === 'producto' ? Number(formulario.producto_trigger_id) : null,
        categoria_trigger: tipoCondicion === 'categoria' ? formulario.categoria_trigger : null,
        producto_oferta_id: Number(formulario.producto_oferta_id),
        valor_descuento: Number(formulario.valor_descuento)
      };  
      
      // 👇 FIX: Definir si es POST (Nuevo) o PUT (Editar)
      const url = promoAEditar ? `${apiUrl}/promociones/${promoAEditar.id}` : `${apiUrl}/promociones`;
      const method = promoAEditar ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });  

      if (res.ok) {
        showAlert("¡Éxito!", `Promoción ${promoAEditar ? 'actualizada' : 'creada y activada'} correctamente.`, "success");
        setPromoAEditar(null);
        setFormulario(estadoInicialFormulario); setTipoCondicion('global'); setTodoElDia(false);
        refrescarDatos();
      } else {
        const data = await res.json();
        showAlert("Error", data.error || "No se pudo guardar la promoción.", "error");
      }
    } catch (error) {
      showAlert("Error", "Problema de conexión con el servidor.", "error");
    }
    setIsSubmitting(false);
  };  

  const cancelarEdicion = () => {
    setPromoAEditar(null);
    setFormulario(estadoInicialFormulario);
    setTipoCondicion('global');
    setTodoElDia(false);
  };

  return (
    <form onSubmit={guardarPromocion} className={`bg-white p-6 md:p-8 rounded-[40px] shadow-sm border transition-colors ${promoAEditar ? 'border-orange-400 shadow-orange-100' : 'border-slate-200'}`}>
      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Zap className="text-orange-500" size={20}/> 
          {promoAEditar ? 'Editar Regla de Promoción' : 'Crear Nueva Regla Automática'}
        </h3>
        {promoAEditar && (
          <button type="button" onClick={cancelarEdicion} className="bg-red-50 text-red-500 p-2 rounded-full hover:bg-red-100 transition" title="Cancelar Edición">
            <X size={20} />
          </button>
        )}
      </div>  

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nombre interno de la Promoción *</label>
            <input required value={formulario.nombre} onChange={e => setFormulario({...formulario, nombre: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" placeholder="Ej. Papas a mitad de precio por hamburguesa" disabled={isSubmitting}/>
          </div>  

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tipo de Regla *</label>
              <select required value={formulario.tipo} onChange={e => setFormulario({...formulario, tipo: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" disabled={isSubmitting}>
                <option value="upselling">Upselling (Sugerencia)</option>
                <option value="happy_hour">Happy Hour (Descuento)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Condición (Si compran...) *</label>
              <select value={tipoCondicion} onChange={e => { setTipoCondicion(e.target.value); setFormulario({...formulario, producto_trigger_id: '', categoria_trigger: ''}); }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" disabled={isSubmitting}>
                <option value="global">Cualquier cosa (Global)</option>
                <option value="categoria">Toda una Categoría</option>
                <option value="producto">Producto Específico</option>
              </select>
            </div>
          </div>  

          {tipoCondicion === 'categoria' && (
            <div className="animate-in fade-in zoom-in duration-200">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Selecciona Categoría Detonadora *</label>
              <select required value={formulario.categoria_trigger} onChange={e => setFormulario({...formulario, categoria_trigger: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700 shadow-sm" disabled={isSubmitting}>
                <option value="">-- Selecciona la categoría --</option>
                {clasificaciones.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>
          )}  

          {tipoCondicion === 'producto' && (
            <div className="animate-in fade-in zoom-in duration-200">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Selecciona Producto Detonador *</label>
              <select required value={formulario.producto_trigger_id} onChange={e => setFormulario({...formulario, producto_trigger_id: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700 shadow-sm" disabled={isSubmitting}>
                <option value="">-- Selecciona el producto --</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          )}  

          <div className="p-5 bg-orange-50 rounded-3xl border border-orange-100 mt-2">
            <label className="block text-xs font-black text-orange-800 uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowUpRight size={16}/> Producto a Ofrecer/Descontar *</label>
            <select required value={formulario.producto_oferta_id} onChange={e => setFormulario({...formulario, producto_oferta_id: e.target.value})} className="w-full p-4 bg-white border border-orange-200 rounded-2xl outline-none focus:border-orange-500 font-black text-orange-700 mb-4 shadow-sm" disabled={isSubmitting}>
              <option value="">-- Selecciona el producto --</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-orange-800 uppercase tracking-widest mb-2">Tipo Rebaja *</label>
                <select required value={formulario.tipo_descuento} onChange={e => setFormulario({...formulario, tipo_descuento: e.target.value})} className="w-full p-4 bg-white border border-orange-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" disabled={isSubmitting}>
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="precio_fijo">Precio Fijo ($)</option>
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

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Clock size={16}/> Horario de la Promoción *</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={todoElDia} onChange={(e) => setTodoElDia(e.target.checked)} className="w-4 h-4 accent-blue-600" disabled={isSubmitting}/>
                <span className="text-xs font-bold text-blue-600">Todo el día</span>
              </label>
            </div>
            <div className={`flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200 transition ${todoElDia ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              <input required type="time" value={formulario.hora_inicio} onChange={e => setFormulario({...formulario, hora_inicio: e.target.value})} className="flex-1 w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-slate-700 text-center" disabled={isSubmitting || todoElDia}/>
              <span className="font-black text-slate-400">A</span>
              <input required type="time" value={formulario.hora_fin} onChange={e => setFormulario({...formulario, hora_fin: e.target.value})} className="flex-1 w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-slate-700 text-center" disabled={isSubmitting || todoElDia}/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock size={16}/> Días Activos *</label>
            <div className="flex flex-wrap gap-2">
              {diasSemana.map(dia => (
                <button key={dia} type="button" disabled={isSubmitting} onClick={() => handleDiaToggle(dia)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${formulario.dias_aplicables.includes(dia) ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'}`}>
                  {dia}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3">
            {promoAEditar && (
              <button type="button" onClick={cancelarEdicion} disabled={isSubmitting} className="w-full md:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 px-8 py-4 rounded-2xl font-black text-lg transition disabled:opacity-50 active:scale-95">
                Cancelar
              </button>
            )}
            <button type="submit" disabled={isSubmitting || productos.length === 0} className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-orange-500/30 transition disabled:opacity-50 active:scale-95 flex justify-center items-center gap-2">
              {isSubmitting ? 'Guardando...' : promoAEditar ? 'Guardar Cambios' : 'Activar Promoción'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};  

export default FormularioPromocion;