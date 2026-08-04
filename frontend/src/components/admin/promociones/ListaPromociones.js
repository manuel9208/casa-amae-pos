import React from 'react';
import { Trash2, Edit, Gift, Tag, Clock, Layers, Settings2 } from 'lucide-react';  

const ListaPromociones = ({ promociones, productos, apiUrl, showAlert, showConfirm, refrescarDatos, isSubmitting, setPromoAEditar }) => {  
  const formatDinero = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);  

  const toggleEstado = async (id, estadoActual) => {
    try {
      const res = await fetch(`${apiUrl}/promociones/${id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !estadoActual })
      });
      if (res.ok) refrescarDatos();
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
          refrescarDatos();
        }
      } catch (error) {
        showAlert("Error", "No se pudo eliminar la promoción.", "error");
      }
    });
  };  

  return (
    <div className="space-y-4 mt-8">
      <h3 className="text-xl font-black text-slate-800 ml-2">Reglas Configuradas ({promociones.length})</h3>  
      
      {promociones.length === 0 ? (
        <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-[30px] p-10 text-center">
          <Gift size={48} className="text-slate-400 mx-auto mb-4 opacity-50" />
          <p className="text-slate-500 font-bold">Aún no has configurado ninguna promoción.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {promociones.map(promo => {
            const isUpsell = promo.tipo === 'upselling';
            const dias = Array.isArray(promo.dias_aplicables) ? promo.dias_aplicables : JSON.parse(promo.dias_aplicables || '[]');  
            
            let textoTrigger = 'CUALQUIER COSA (GLOBAL)';
            if (promo.producto_trigger_id) {
                const triggerProd = (productos || []).find(p => String(p.id) === String(promo.producto_trigger_id));
                textoTrigger = triggerProd ? `[${triggerProd.categoria || 'Cat'}] ${triggerProd.nombre}` : `PRODUCTO: ${promo.trigger_nombre}`;
            } else if (promo.categoria_trigger) {
                textoTrigger = `CATEGORÍA: ${promo.categoria_trigger}`;  
            }
            
            const esTodoElDia = promo.hora_inicio === '00:00:00' && promo.hora_fin === '23:59:00';  
            
            // ==========================================
            // PROCESAMIENTO DEL MOTOR AVANZADO JSONB
            // ==========================================
            let limiteText = '1 platillo específico';
            let desgloseOpciones = [];
            let modoDescuento = 'global';

            if (promo.config_oferta) {
                try {
                    const conf = typeof promo.config_oferta === 'string' ? JSON.parse(promo.config_oferta) : promo.config_oferta;
                    limiteText = conf.limite > 0 ? `Hasta ${conf.limite} artículo(s)` : `Artículos Ilimitados`;
                    modoDescuento = conf.modo_descuento || 'global';
                    
                    desgloseOpciones = (conf.selecciones || []).map(s => {
                        let nombreItem = '';
                        if (s.tipo === 'categoria') {
                            nombreItem = `Categoría: ${s.valor}`;
                        } else {
                            const pFound = (productos || []).find(x => String(x.id) === String(s.valor));
                            nombreItem = pFound ? `[${pFound.categoria || 'Cat'}] ${pFound.nombre}` : `Producto #${s.valor}`;
                        }

                        return {
                            nombre: nombreItem,
                            variacion_base: s.variacion_base,
                            tipo_descuento: s.tipo_descuento,
                            valor_descuento: s.valor_descuento
                        };
                    });
                } catch(e) {}
            } else if (promo.producto_oferta_id) {
                // Retrocompatibilidad con promociones viejas pre-motor
                desgloseOpciones = [{ nombre: promo.oferta_nombre || 'Producto no encontrado' }];
            }

            return (
              <div key={promo.id} className={`bg-white rounded-[30px] shadow-sm border-2 overflow-hidden transition-all relative flex flex-col ${promo.activo ? (isUpsell ? 'border-orange-200 hover:shadow-orange-100/50' : 'border-purple-200 hover:shadow-purple-100/50') : 'border-slate-200 opacity-70 grayscale'}`}>  
                <div className={`p-4 flex justify-between items-start border-b ${isUpsell ? 'bg-orange-50/50 border-orange-100' : 'bg-purple-50/50 border-purple-100'}`}>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isUpsell ? 'bg-orange-200 text-orange-800' : 'bg-purple-200 text-purple-800'}`}>
                      {isUpsell ? 'Sugerencia (Upsell)' : 'Happy Hour'}
                    </span>
                    <h4 className="font-black text-slate-800 text-lg mt-2 leading-tight pr-8">{promo.nombre}</h4>
                  </div>
                  <label className="flex items-center cursor-pointer absolute top-4 right-4 z-10">
                    <input type="checkbox" checked={promo.activo} onChange={() => toggleEstado(promo.id, promo.activo)} className={`w-5 h-5 ${isUpsell ? 'accent-orange-500' : 'accent-purple-500'}`} disabled={isSubmitting}/>
                  </label>
                </div>  

                <div className="p-5 flex flex-col flex-1 gap-4">
                  
                  {/* Bloque Detonador */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-500 text-center w-full">
                      <span className="block text-[10px] uppercase mb-1">Si compran...</span>
                      <span className="text-slate-800 font-black">{textoTrigger}</span>
                    </div>
                  </div>  

                  {/* Estructura de Oferta Avanzada */}
                  <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl flex flex-col">
                     <span className="block text-[10px] font-black uppercase text-emerald-600/70 mb-1 flex items-center justify-center gap-1"><Layers size={12}/> Ofrécele la opción de llevar:</span>
                     <p className="text-xs font-black text-emerald-700 text-center mb-2 pb-2 border-b border-emerald-100">{limiteText}</p>
                     
                     <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                        {desgloseOpciones.map((opc, idx) => (
                            <div key={idx} className="bg-white p-2 rounded-xl border border-emerald-100 shadow-sm flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-700 leading-tight">{opc.nombre}</span>
                                
                                <div className="flex flex-wrap items-center justify-between gap-1 mt-0.5">
                                    {opc.variacion_base ? (
                                        <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <Settings2 size={10}/> Base: {opc.variacion_base}
                                        </span>
                                    ) : <span></span>}

                                    {modoDescuento === 'individual' && opc.tipo_descuento && (
                                        <span className="text-[9px] font-black text-orange-600">
                                            {opc.tipo_descuento === 'porcentaje' ? `-${opc.valor_descuento}%` : opc.tipo_descuento === 'precio_fijo' ? `$${opc.valor_descuento} Fijo` : `-$${opc.valor_descuento} OFF`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                     </div>
                  </div>

                  {/* Resumen del Tipo de Descuento */}
                  <div className="flex items-center gap-2 mt-auto">
                    <Tag className="text-slate-400 shrink-0" size={16}/>
                    <p className="text-sm font-bold text-slate-700 leading-tight">
                      {modoDescuento === 'individual' ? (
                          <>Cada artículo tiene su <strong className="text-indigo-600">descuento individual</strong></>
                      ) : (
                          promo.tipo_descuento === 'porcentaje' ? (
                            <>Todo artículo tendrá <strong className="text-red-500">{promo.valor_descuento}% de descuento</strong></>
                          ) : promo.tipo_descuento === 'descuento_fijo' ? (
                            <>Se descontarán <strong className="text-orange-500">{formatDinero(promo.valor_descuento)}</strong> a cada artículo</>
                          ) : (
                            <>Cada artículo se cobrará a <strong className="text-blue-600">{formatDinero(promo.valor_descuento)}</strong></>
                          )
                      )}
                    </p>
                  </div>  

                  {/* Horarios */}
                  <div className="flex items-start gap-2 pt-3 border-t border-slate-100 mb-8">
                    <Clock className="text-slate-400 shrink-0 mt-0.5" size={16}/>
                    <div className="text-xs font-bold text-slate-500 leading-snug">
                      <span className="text-slate-700 block mb-1">
                        {esTodoElDia ? 'Todo el día' : `${promo.hora_inicio.slice(0,5)} a ${promo.hora_fin.slice(0,5)} hrs`}
                      </span>
                      <span className="line-clamp-2" title={dias.join(', ')}>{dias.join(', ')}</span>
                    </div>
                  </div>
                </div>  

                {/* Controles Flotantes */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <button onClick={() => setPromoAEditar(promo)} className="p-2 bg-blue-50 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-xl transition shadow-sm" disabled={isSubmitting} title="Editar Promoción">
                    <Edit size={18}/>
                  </button>
                  <button onClick={() => eliminarPromocion(promo.id)} className="p-2 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition shadow-sm" disabled={isSubmitting} title="Eliminar Promoción">
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};  

export default ListaPromociones;