import React from 'react';
import { Layers } from 'lucide-react';  

const FormularioAgregado = ({
  tipoIngresoReceta, setTipoIngresoReceta,
  nuevoItemReceta, setNuevoItemReceta, nuevoItemSubReceta, setNuevoItemSubReceta,
  insumosDB, subRecetasDisponibles, productos,
  unidadConversionActiva, setUnidadConversionActiva, opcionesDeUnidad, guardarItemReceta
}) => {
  return (
    <div className="mt-6 bg-slate-50 p-6 rounded-[24px] border border-slate-200">
      <div className="flex items-center gap-4 mb-4 border-b border-slate-200 pb-4">
        <h4 className="font-bold text-slate-800 uppercase tracking-widest text-xs">4. Agregar elemento a la receta:</h4>
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button onClick={() => { setTipoIngresoReceta('insumo'); setUnidadConversionActiva(''); setNuevoItemReceta({ insumo_id: '', cantidad_usada: '' }); }} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${tipoIngresoReceta === 'insumo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Insumo Puro</button>
          <button onClick={() => { setTipoIngresoReceta('subreceta'); setUnidadConversionActiva(''); setNuevoItemSubReceta({ sub_producto_id: '', cantidad_usada: '' }); }} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${tipoIngresoReceta === 'subreceta' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Layers size={14} /> Sub-Receta</button>
        </div>
      </div>  

      <form onSubmit={guardarItemReceta} className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-1">
          {tipoIngresoReceta === 'insumo' ? (
            <select required value={nuevoItemReceta.insumo_id} onChange={e => {
              const id = e.target.value; setNuevoItemReceta({...nuevoItemReceta, insumo_id: id});
              const ins = insumosDB.find(i => String(i.id) === String(id)); if (ins) setUnidadConversionActiva(ins.unidad_medida);
            }} className="w-full h-full p-4 border border-slate-200 rounded-xl outline-none font-medium text-slate-700">
              <option value="">Buscar Insumo...</option>
              {(insumosDB || []).filter(i => i.es_empaque !== true && i.es_empaque !== 'true').map(ins => <option key={ins.id} value={ins.id}>{ins.nombre} ({ins.unidad_medida})</option>)}
            </select>
          ) : (
            <select required value={nuevoItemSubReceta.sub_producto_id} onChange={e => {
              const id = e.target.value; setNuevoItemSubReceta({...nuevoItemSubReceta, sub_producto_id: id});
              const prod = productos.find(p => String(p.id) === String(id));
              if (prod) {
                let u = 'PZ';
                if (prod.opciones) {
                  const ops = typeof prod.opciones === 'string' ? JSON.parse(prod.opciones) : prod.opciones;
                  const opt = ops.find(o => o.categoria === 'UnidadRendimiento');
                  if (opt) u = opt.nombre;
                }
                setUnidadConversionActiva(u);
              }
            }} className="w-full h-full p-4 border border-purple-200 bg-purple-50 rounded-xl outline-none font-bold text-purple-800">
              <option value="">Buscar Sub-Receta (Platillo preparado)...</option>
              {/* 👇 Subrecetas disponibles ORDENADAS DE LA A A LA Z */}
              {(subRecetasDisponibles || [])
                .slice()
                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                .map(prod => <option key={prod.id} value={prod.id}>{prod.emoji || '🥣'} {prod.nombre}</option>)}
            </select>
          )}
        </div>  

        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {tipoIngresoReceta === 'insumo' ? (
              <>
                <input required type="number" step="0.01" placeholder="Ej. 700" value={nuevoItemReceta.cantidad_usada} onChange={e => setNuevoItemReceta({...nuevoItemReceta, cantidad_usada: e.target.value})} className="w-full p-4 border border-slate-200 rounded-xl outline-none font-bold text-center" />
                {opcionesDeUnidad.length > 0 ? (
                  <select value={unidadConversionActiva} onChange={e => setUnidadConversionActiva(e.target.value)} className="w-24 p-4 rounded-xl font-black text-sm whitespace-nowrap bg-blue-100 text-blue-700 outline-none cursor-pointer">
                    {opcionesDeUnidad.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                ) : (
                  <span className="px-4 py-4 rounded-xl font-black text-sm whitespace-nowrap bg-slate-200 text-slate-600">Uso</span>
                )}
              </>
            ) : (
              <>
                <input required type="number" step="0.01" placeholder="Ej. 200" value={nuevoItemSubReceta.cantidad_usada} onChange={e => setNuevoItemSubReceta({...nuevoItemSubReceta, cantidad_usada: e.target.value})} className="w-full p-4 border border-purple-200 rounded-xl outline-none font-bold text-center text-purple-800" title="¿Cuánto vas a usar de la base?" />
                {opcionesDeUnidad.length > 0 ? (
                  <select value={unidadConversionActiva} onChange={e => setUnidadConversionActiva(e.target.value)} className="w-24 p-4 rounded-xl font-black text-sm whitespace-nowrap bg-purple-200 text-purple-800 outline-none cursor-pointer">
                    {opcionesDeUnidad.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                ) : (
                  <span className="px-4 py-4 rounded-xl font-black text-sm whitespace-nowrap bg-purple-200 text-purple-800">Uso / Cant.</span>
                )}
              </>
            )}
          </div>
          {tipoIngresoReceta === 'subreceta' && nuevoItemSubReceta.sub_producto_id && (() => {
            const subP = productos.find(p => String(p.id) === String(nuevoItemSubReceta.sub_producto_id));
            if(subP) {
              let u = 'PZ';
              if (subP.opciones) {
                const ops = typeof subP.opciones === 'string' ? JSON.parse(subP.opciones) : subP.opciones;
                const opt = ops.find(o => o.categoria === 'UnidadRendimiento');
                if (opt) u = opt.nombre;
              }
              return (
                <p className="text-[10px] text-purple-600 font-bold leading-tight mt-1 pl-2 border-l-2 border-purple-300">
                  💡 1 Olla de esta base rinde: <span className="bg-purple-100 px-1 rounded">{subP.rendimiento || 1} {u}</span>.<br/>Si usas la olla entera, escribe {subP.rendimiento || 1}.
                </p>
              )
            }
            return null;
          })()}
        </div>  

        <button type="submit" className={`md:w-auto px-8 py-4 text-white rounded-xl font-bold transition active:scale-95 self-start ${tipoIngresoReceta === 'insumo' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
          Añadir a Receta
        </button>
      </form>
    </div>
  );
};  

export default FormularioAgregado;