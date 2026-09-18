import React from 'react';
import { Sparkles } from 'lucide-react';
import { calcularPrecioSustitucionReal } from '../utils/asistenteCalculos';

// =========================================================================
// TAB 2: MODIFICAR RECETA BASE
// Controla la lógica de Quitar, Restaurar y Sustituir ingredientes base.
// =========================================================================

const TabModificarReceta = ({
  pasoActualObj,
  ingredientesBase, setIngredientesBase,
  ingredientesSustituidos, setIngredientesSustituidos,
  ingredienteDesplegado, setIngredienteDesplegado,
  productoEnEspera,
  clasificaciones,
  catalogoIngredientes,
  configGlobal,
  politicasSustUI
}) => {

  if (pasoActualObj.tipo !== 'quitar_ingredientes') return null;

  return (
    <div className="animate-in slide-in-from-right duration-200 px-4 md:px-8">
      <p className="text-center text-slate-400 font-bold mb-6 uppercase tracking-widest text-[10px] md:text-xs">
        Modificar Receta Base
      </p>
      
      <div className="space-y-3 md:space-y-4 pb-6">
        {pasoActualObj.opciones.map((o, idx) => {
          const estaSustituido = ingredientesSustituidos[o.nombre] !== undefined;
          const estaQuitado = !ingredientesBase.includes(o.nombre);
          const isActive = !estaQuitado && !estaSustituido;

          return (
            <div key={idx} className={`p-4 md:p-5 rounded-2xl md:rounded-3xl border-2 transition-all shadow-sm ${isActive ? 'bg-white border-emerald-100' : estaSustituido ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
              
              {/* CABECERA DEL INGREDIENTE */}
              <div className="flex items-center justify-between mb-3">
                <span className={`font-black text-sm md:text-base ${isActive ? 'text-slate-800' : estaSustituido ? 'text-indigo-800' : 'text-slate-400 line-through'}`}>
                  {o.nombre}
                </span>
                
                <div className="flex gap-2">
                  {!estaSustituido && (
                    <button 
                      onClick={() => {
                        if (isActive) setIngredientesBase(ingredientesBase.filter(x => x !== o.nombre));
                        else setIngredientesBase([...ingredientesBase, o.nombre]);
                      }} 
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-black transition active:scale-95 ${isActive ? 'bg-red-100 hover:bg-red-200 text-red-600' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`}
                    >
                      {isActive ? 'Quitar' : 'Restaurar'}
                    </button>
                  )}

                  {(configGlobal?.politicas_sustitucion?.activa || politicasSustUI?.activa) && isActive && (
                    <button 
                      onClick={() => setIngredienteDesplegado(ingredienteDesplegado === o.nombre ? null : o.nombre)} 
                      className="px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-black bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition active:scale-95 flex items-center gap-1"
                    >
                      <Sparkles size={14}/> Cambiar
                    </button>
                  )}

                  {estaSustituido && (
                    <button 
                      onClick={() => {
                        const obj = {...ingredientesSustituidos};
                        delete obj[o.nombre];
                        setIngredientesSustituidos(obj);
                        setIngredientesBase([...ingredientesBase, o.nombre]);
                      }} 
                      className="px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-black bg-slate-200 hover:bg-slate-300 text-slate-700 transition active:scale-95 flex items-center gap-1"
                    >
                      Deshacer Cambio
                    </button>
                  )}
                </div>
              </div>

              {/* INDICADOR DE SUSTITUCIÓN ACTIVA */}
              {estaSustituido && (
                <div className="bg-white p-3 rounded-xl border border-indigo-100 text-xs font-bold text-indigo-700 flex justify-between items-center mt-2 shadow-sm">
                  <span>🔄 Cambiado por: {ingredientesSustituidos[o.nombre].nuevoNombre}</span>
                  {ingredientesSustituidos[o.nombre].precioCalculado !== 0 && (
                    <span className={`px-2 py-1 rounded-md ${ingredientesSustituidos[o.nombre].precioCalculado > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {ingredientesSustituidos[o.nombre].precioCalculado > 0 ? '+' : '-'}${Math.abs(ingredientesSustituidos[o.nombre].precioCalculado).toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              {/* PANEL DESPLEGABLE PARA ELEGIR EL REEMPLAZO */}
              {ingredienteDesplegado === o.nombre && isActive && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 pl-1">Selecciona el reemplazo:</p>
                   <div className="grid grid-cols-2 gap-2 md:gap-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                     {(() => {
                        const categoriaItem = String(productoEnEspera.categoria || '').trim().toLowerCase();
                        const clasifObj = (clasificaciones || []).find(c => String(c.nombre).trim().toLowerCase() === categoriaItem);
                        const clasifId = clasifObj ? clasifObj.id : null;
                        
                        const recetaOriginal = (productoEnEspera.opciones || []).filter(op => op.tipo === 'base').map(op => String(op.nombre).trim().toLowerCase());

                        return catalogoIngredientes.filter(ing => {
                            const catIng = String(ing.clasificacion_nombre || '').trim().toLowerCase();
                            const coincideCategoria = (clasifId && Number(ing.clasificacion_id) === Number(clasifId)) || (catIng === categoriaItem);
                            const esValido = (coincideCategoria || ing.es_extra || String(ing.tipo) === 'extra') && ing.permite_extra !== false;
                            
                            const noEsBaseOriginal = !recetaOriginal.includes(String(ing.nombre).trim().toLowerCase());

                            return esValido && noEsBaseOriginal && ing.nombre !== o.nombre;
                        }).map((ingRep, iIdx) => {
                            
                            // 👇 UTILIZA EL MOTOR MATEMÁTICO IMPORTADO
                            const diferenciaCostos = calcularPrecioSustitucionReal(o.nombre, ingRep.nombre, configGlobal, politicasSustUI, catalogoIngredientes);
                            
                            return (
                              <button 
                                key={iIdx} 
                                onClick={() => {
                                  setIngredientesSustituidos({...ingredientesSustituidos, [o.nombre]: { nuevoNombre: ingRep.nombre, precioCalculado: diferenciaCostos }});
                                  setIngredientesBase(ingredientesBase.filter(x => x !== o.nombre));
                                  setIngredienteDesplegado(null);
                                }} 
                                className="bg-white border border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50 p-2 md:p-3 rounded-xl transition text-left flex flex-col items-start shadow-sm active:scale-95"
                              >
                                <span className="font-bold text-indigo-900 text-xs md:text-sm">{ingRep.nombre}</span>
                                <span className={`text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded mt-1 ${diferenciaCostos > 0 ? 'text-indigo-500 bg-indigo-50' : diferenciaCostos < 0 ? 'text-emerald-600 bg-emerald-100' : 'text-slate-500 bg-slate-100'}`}>
                                    {diferenciaCostos > 0 ? `+$${diferenciaCostos.toFixed(2)}` : diferenciaCostos < 0 ? `-$${Math.abs(diferenciaCostos).toFixed(2)}` : 'Mismo precio'}
                                </span>
                              </button>
                            );
                        });
                     })()}
                   </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TabModificarReceta;