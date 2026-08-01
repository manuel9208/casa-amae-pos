import React, { useState, useEffect } from 'react';
import { Zap, Clock, X, Plus, Trash2, Layers } from 'lucide-react';  

const FormularioPromocion = ({
  productos, clasificaciones, apiUrl, showAlert, refrescarDatos, isSubmitting, setIsSubmitting,
  promoAEditar, setPromoAEditar
}) => {
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];  
  const [tipoCondicion, setTipoCondicion] = useState('global');
  const [todoElDia, setTodoElDia] = useState(false);  

  const estadoInicialFormulario = {
    nombre: '', tipo: 'upselling', producto_trigger_id: '', categoria_trigger: '',
    tipo_descuento: 'porcentaje', valor_descuento: '',
    dias_aplicables: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    hora_inicio: '00:00', hora_fin: '23:59'
  };  

  const [formulario, setFormulario] = useState(estadoInicialFormulario);  
  
  // ESTADOS: Motor Dinámico de Opciones
  const [seleccionesPermitidas, setSeleccionesPermitidas] = useState([{ tipo: 'categoria', valor: '' }]);
  const [limiteOpciones, setLimiteOpciones] = useState(0); // 0 = Sin límite

  useEffect(() => {
    if (promoAEditar) {
      setFormulario({
        ...promoAEditar,
        producto_trigger_id: promoAEditar.producto_trigger_id || '',
        categoria_trigger: promoAEditar.categoria_trigger || '',
        dias_aplicables: Array.isArray(promoAEditar.dias_aplicables) ? promoAEditar.dias_aplicables : JSON.parse(promoAEditar.dias_aplicables || '[]')
      });
      
      if (promoAEditar.producto_trigger_id) setTipoCondicion('producto');
      else if (promoAEditar.categoria_trigger) setTipoCondicion('categoria');
      else setTipoCondicion('global');
      
      setTodoElDia(promoAEditar.hora_inicio === '00:00:00' && promoAEditar.hora_fin === '23:59:00');
      
      // Cargar la configuración dinámica si existe
      if (promoAEditar.config_oferta) {
          try {
              const conf = typeof promoAEditar.config_oferta === 'string' ? JSON.parse(promoAEditar.config_oferta) : promoAEditar.config_oferta;
              setLimiteOpciones(conf.limite || 0);
              setSeleccionesPermitidas(conf.selecciones && conf.selecciones.length > 0 ? conf.selecciones : [{ tipo: 'categoria', valor: '' }]);
          } catch(e) {
              setLimiteOpciones(0);
              setSeleccionesPermitidas([{ tipo: 'categoria', valor: '' }]);
          }
      } else if (promoAEditar.producto_oferta_id) {
          // Retrocompatibilidad con promociones creadas antes del update
          setLimiteOpciones(1);
          setSeleccionesPermitidas([{ tipo: 'producto', valor: promoAEditar.producto_oferta_id }]);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setFormulario(estadoInicialFormulario);
      setTipoCondicion('global');
      setTodoElDia(false);
      setLimiteOpciones(0);
      setSeleccionesPermitidas([{ tipo: 'categoria', valor: '' }]);
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

  const agregarSeleccion = () => setSeleccionesPermitidas([...seleccionesPermitidas, { tipo: 'categoria', valor: '' }]);
  const removerSeleccion = (idx) => setSeleccionesPermitidas(seleccionesPermitidas.filter((_, i) => i !== idx));
  const actualizarSeleccion = (idx, campo, valorCampo) => {
      const copia = [...seleccionesPermitidas];
      copia[idx][campo] = valorCampo;
      if (campo === 'tipo') copia[idx].valor = ''; // Resetear valor al cambiar de tipo
      setSeleccionesPermitidas(copia);
  };

  const guardarPromocion = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;  

    if (formulario.dias_aplicables.length === 0) return showAlert("Atención", "Debes seleccionar al menos un día de la semana.", "warning");
    if (tipoCondicion === 'producto' && !formulario.producto_trigger_id) return showAlert("Atención", "Selecciona el producto detonador.", "warning");
    if (tipoCondicion === 'categoria' && !formulario.categoria_trigger) return showAlert("Atención", "Selecciona la categoría detonadora.", "warning");  

    if (seleccionesPermitidas.length === 0) return showAlert("Atención", "Debes agregar al menos una opción al pool de la oferta.", "warning");
    if (seleccionesPermitidas.some(s => !s.valor)) return showAlert("Atención", "Tienes opciones vacías en el bloque de oferta. Selecciona la categoría o platillo.", "warning");

    setIsSubmitting(true);
    try {
      const payload = {
        ...formulario,
        producto_trigger_id: tipoCondicion === 'producto' ? Number(formulario.producto_trigger_id) : null,
        categoria_trigger: tipoCondicion === 'categoria' ? formulario.categoria_trigger : null,
        producto_oferta_id: null, // Lo enviamos nulo, ya no dependemos de él
        valor_descuento: Number(formulario.valor_descuento),
        // Inyección del JSON Dinámico
        config_oferta: JSON.stringify({
            limite: Number(limiteOpciones),
            selecciones: seleccionesPermitidas
        })
      };  
      
      const url = promoAEditar ? `${apiUrl}/promociones/${promoAEditar.id}` : `${apiUrl}/promociones`;
      const method = promoAEditar ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });  

      if (res.ok) {
        showAlert("¡Éxito!", `Promoción ${promoAEditar ? 'actualizada' : 'creada y activada'} correctamente.`, "success");
        cancelarEdicion();
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
    setLimiteOpciones(0);
    setSeleccionesPermitidas([{ tipo: 'categoria', valor: '' }]);
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
            <input required value={formulario.nombre} onChange={e => setFormulario({...formulario, nombre: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-orange-500 font-bold text-slate-700" placeholder="Ej. Papas a mitad de precio o Combos Flexibles" disabled={isSubmitting}/>
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

          {/* MOTOR DINÁMICO: Constructor de Combos / Ofertas Múltiples */}
          <div className="p-5 bg-orange-50 rounded-3xl border border-orange-200 mt-2">
            <label className="block text-sm font-black text-orange-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Layers size={18}/> Opciones de la Oferta *
            </label>
            
            <div className="space-y-3 mb-5">
                {seleccionesPermitidas.map((sel, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-orange-200 shadow-sm animate-in fade-in">
                        <select value={sel.tipo} onChange={e => actualizarSeleccion(idx, 'tipo', e.target.value)} className="p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs w-28 shrink-0">
                            <option value="categoria">Categoría</option>
                            <option value="producto">Producto</option>
                        </select>

                        {sel.tipo === 'categoria' ? (
                            <select required value={sel.valor} onChange={e => actualizarSeleccion(idx, 'valor', e.target.value)} className="flex-1 p-3 bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs truncate">
                                <option value="">-- Clasificación --</option>
                                {clasificaciones.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                            </select>
                        ) : (
                            <select required value={sel.valor} onChange={e => actualizarSeleccion(idx, 'valor', e.target.value)} className="flex-1 p-3 bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-xs truncate">
                                <option value="">-- Platillo Específico --</option>
                                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        )}

                        {seleccionesPermitidas.length > 1 && (
                            <button type="button" onClick={() => removerSeleccion(idx)} className="p-3 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition shrink-0"><Trash2 size={16}/></button>
                        )}
                    </div>
                ))}
                
                <button type="button" onClick={agregarSeleccion} className="w-full py-3 bg-orange-100 text-orange-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-orange-200 transition flex items-center justify-center gap-2 shadow-sm border border-orange-200">
                    <Plus size={16}/> Añadir otra opción al grupo
                </button>
            </div>

            <div className="mb-5 bg-white p-4 rounded-2xl border border-orange-200 shadow-sm">
                <label className="block text-[10px] font-black text-orange-800 uppercase tracking-widest mb-2">Límite Total de Artículos a Elegir</label>
                <div className="flex items-center gap-3">
                    <input type="number" min="0" value={limiteOpciones} onChange={e => setLimiteOpciones(e.target.value)} className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-black text-slate-800 text-center" disabled={isSubmitting}/>
                    <span className="text-xs font-bold text-slate-500 leading-tight">Pon <strong className="text-slate-700">0</strong> si deseas que puedan elegir una cantidad ilimitada de artículos de la lista superior.</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-orange-200 pt-4">
              <div>
                <label className="block text-[10px] font-black text-orange-800 uppercase tracking-widest mb-2">Tipo Rebaja *</label>
                <select required value={formulario.tipo_descuento} onChange={e => setFormulario({...formulario, tipo_descuento: e.target.value})} className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none focus:border-orange-500 font-bold text-slate-700" disabled={isSubmitting}>
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="precio_fijo">Precio Fijo Unitario ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-orange-800 uppercase tracking-widest mb-2">Valor *</label>
                <input required type="number" step="0.01" min="0.1" value={formulario.valor_descuento} onChange={e => setFormulario({...formulario, valor_descuento: e.target.value})} className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none focus:border-orange-500 font-black text-slate-800" placeholder={formulario.tipo_descuento === 'porcentaje' ? 'Ej. 50' : 'Ej. 25.00'} disabled={isSubmitting}/>
              </div>
            </div>
            <p className="text-[10px] font-bold text-orange-600 mt-4 text-center bg-orange-100/50 p-2 rounded-lg">
              {formulario.tipo_descuento === 'porcentaje' 
                  ? `Se aplicará un ${formulario.valor_descuento || 'X'}% de descuento a CADA artículo que elijan del grupo.` 
                  : `CADA artículo que elijan del grupo se cobrará exactamente a $${formulario.valor_descuento || 'X'}.`}
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