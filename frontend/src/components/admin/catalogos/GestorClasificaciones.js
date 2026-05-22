import React, { useState } from 'react';
import { Edit, Trash2, Star } from 'lucide-react';

const GestorClasificaciones = ({
  clasificaciones, EMOJIS_POR_GIRO, baseUrl, apiUrl, refrescarDatos, showAlert, showConfirm
}) => {
  const [editandoClasifId, setEditandoClasifId] = useState(null);
  const [nuevaClasif, setNuevaClasif] = useState('');
  const [nuevaClasifDestino, setNuevaClasifDestino] = useState('Cocina'); 
  const [nuevaClasifEmoji, setNuevaClasifEmoji] = useState('🍽️');
  const [generaPuntos, setGeneraPuntos] = useState(true);
  const [imagenBlob, setImagenBlob] = useState(null);

  const prepararEdicionClasif = (c) => { 
    setEditandoClasifId(c.id); 
    setNuevaClasif(c.nombre); 
    setNuevaClasifDestino(c.destino || 'Cocina'); 
    setNuevaClasifEmoji(c.emoji || '🍽️'); 
    setGeneraPuntos(c.genera_puntos === false || c.genera_puntos === 'false' ? false : true);
    setImagenBlob(null); 
  }; 
  
  const cancelarEdicionClasif = () => { 
    setEditandoClasifId(null); 
    setNuevaClasif(''); 
    setNuevaClasifDestino('Cocina'); 
    setNuevaClasifEmoji('🍽️'); 
    setGeneraPuntos(true); 
    setImagenBlob(null); 
  };
  
  const guardarClasificacion = async (e) => { 
    e.preventDefault(); 
    const formData = new FormData(); 
    formData.append('nombre', nuevaClasif); 
    formData.append('destino', nuevaClasifDestino); 
    formData.append('emoji', nuevaClasifEmoji); 
    formData.append('genera_puntos', generaPuntos); 
    if (imagenBlob) formData.append('imagen', imagenBlob); 
    
    try { 
      const url = editandoClasifId ? `${apiUrl}/clasificaciones/${editandoClasifId}` : `${apiUrl}/clasificaciones`; 
      const res = await fetch(url, { method: editandoClasifId ? 'PUT' : 'POST', body: formData }); 
      if (res.ok) { 
        showAlert("¡Éxito!", editandoClasifId ? "Clasificación actualizada." : "Clasificación guardada.", "success");
        cancelarEdicionClasif(); 
        refrescarDatos(); 
      } else {
        showAlert("Error", "No se pudo guardar la clasificación.", "error");
      }
    } catch(e) {
        showAlert("Error", "Error de conexión al servidor.", "error");
    } 
  };

  const eliminarClasif = (id) => { 
    showConfirm("Eliminar Clasificación", "¿Estás seguro que deseas borrar esta clasificación? Esto podría afectar a los platillos que la usan.", async () => { 
      try {
        const res = await fetch(`${apiUrl}/clasificaciones/${id}`, { method: 'DELETE' }); 
        if (res.ok) {
            showAlert("Eliminada", "La clasificación fue borrada.", "success");
            refrescarDatos(); 
        }
      } catch (error) {
          showAlert("Error", "No se pudo eliminar.", "error");
      }
    }); 
  };

  return (
    <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-200 relative animate-in fade-in slide-in-from-bottom-4">
      {editandoClasifId && (<div className="absolute -top-3 left-6 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-md uppercase tracking-widest">Editando Clasificación</div>)}
      <h3 className="text-xl font-bold mb-6 text-slate-800">Clasificaciones Principales</h3>
      
      <form onSubmit={guardarClasificacion} className={`flex flex-col gap-4 mb-8 p-6 rounded-3xl border ${editandoClasifId ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input required placeholder="Nombre (Ej. Sushis)" value={nuevaClasif} onChange={e => setNuevaClasif(e.target.value)} className="w-full p-4 bg-white border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
          <select required value={nuevaClasifDestino} onChange={e => setNuevaClasifDestino(e.target.value)} className="w-full p-4 bg-white border rounded-xl outline-none font-bold text-slate-600"><option value="Cocina">A Cocina</option><option value="Barra">A Barra</option></select>
          <select required value={nuevaClasifEmoji} onChange={e => setNuevaClasifEmoji(e.target.value)} className="w-full p-4 bg-white border rounded-xl text-center text-2xl outline-none cursor-pointer">
            {Object.entries(EMOJIS_POR_GIRO).map(([giro, emojis]) => (<optgroup key={giro} label={giro}>{emojis.map(em => <option key={em} value={em}>{em}</option>)}</optgroup>))}
          </select>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
           <label className="flex items-center gap-3 cursor-pointer w-full">
              <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${generaPuntos ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                 <div className={`w-4 h-4 bg-white rounded-full transition-transform ${generaPuntos ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
              <input type="checkbox" className="hidden" checked={generaPuntos} onChange={(e) => setGeneraPuntos(e.target.checked)} />
              <div>
                <p className={`font-black uppercase tracking-widest text-xs flex items-center gap-1.5 ${generaPuntos ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <Star size={14}/> {generaPuntos ? 'Genera Puntos' : 'No da puntos'}
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                  {generaPuntos ? 'Los platillos de esta categoría acumularán puntos.' : 'Los platillos de esta categoría están exentos del programa de lealtad.'}
                </p>
              </div>
           </label>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <input type="file" accept="image/png, image/jpeg" onChange={e => setImagenBlob(e.target.files[0])} className="flex-1 w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-white file:text-slate-700 file:shadow-sm hover:file:bg-slate-100" />
          <button type="submit" className={`w-full md:w-auto px-8 py-4 rounded-xl font-bold transition shadow-sm text-white ${editandoClasifId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>{editandoClasifId ? 'Guardar Cambios' : 'Agregar Clasificación'}</button>
          {editandoClasifId && (<button type="button" onClick={cancelarEdicionClasif} className="w-full md:w-auto bg-slate-200 text-slate-700 px-6 py-4 rounded-xl hover:bg-slate-300 font-bold">Cancelar</button>)}
        </div>
      </form>
      
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {(clasificaciones || []).map(c => {
          const daPuntos = c.genera_puntos === false || c.genera_puntos === 'false' ? false : true;
          return ( 
            <div key={c.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 transition hover:border-slate-200 ${editandoClasifId === c.id ? 'border-orange-300 bg-orange-50' : ''}`}>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {c.imagen_url ? (
                    <img src={c.imagen_url?.startsWith('http') ? c.imagen_url : `${baseUrl}${c.imagen_url}`} alt={c.nombre} className="w-16 h-16 object-cover rounded-xl shadow-sm" /> 
                ) : (
                    <span className="text-3xl bg-white w-16 h-16 flex items-center justify-center rounded-xl shadow-sm shrink-0">{c.emoji || '🍽️'}</span>
                )}
                <div>
                  <span className="font-black text-xl text-slate-800 block mb-1">{c.nombre}</span>
                  <div className="flex gap-2">
                    <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-widest ${c.destino==='Barra' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>Destino: {c.destino || 'Cocina'}</span>
                    <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-widest flex items-center gap-1 ${daPuntos ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                      <Star size={12}/> {daPuntos ? '+ Pts' : 'Sin Pts'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button onClick={() => prepararEdicionClasif(c)} className="text-blue-500 hover:text-white bg-blue-50 hover:bg-blue-500 p-3 rounded-xl transition"><Edit size={20}/></button>
                <button onClick={() => eliminarClasif(c.id)} className="text-red-500 hover:text-white bg-red-50 hover:bg-red-500 p-3 rounded-xl transition"><Trash2 size={20}/></button>
              </div>
            </div> 
          )
        })}
      </div>
    </div>
  );
};

export default GestorClasificaciones;