import React from 'react';
import { Edit, Trash2, Star } from 'lucide-react';

const ListaProductos = ({
  productos, clasificaciones, categoriaSelect,
  baseUrl, apiUrl, refrescarDatos, showAlert, showConfirm,
  setProductoEditando
}) => {

  const nombreCategoriaSeleccionada = (clasificaciones || []).find(c => Number(c.id) === Number(categoriaSelect))?.nombre;
  const productosEnCategoria = (productos || []).filter(p => p.categoria === nombreCategoriaSeleccionada);

  const eliminarProducto = (id) => { 
    showConfirm("Eliminar Platillo", "¿Seguro que deseas borrar este platillo permanentemente?", async () => { 
      try {
        const res = await fetch(`${apiUrl}/productos/${id}`, { method: 'DELETE' }); 
        if (res.ok) {
           refrescarDatos(); 
           showAlert("Eliminado", "Platillo borrado correctamente.", "success");
        }
      } catch (error) {
        showAlert("Error", "No se pudo eliminar.", "error");
      }
    }); 
  };

  if (!categoriaSelect) return null;

  return (
    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
      <h3 className="text-2xl font-black mb-6 text-slate-800">Vista Previa de: <span className="text-blue-600">{nombreCategoriaSeleccionada}</span></h3>
      {productosEnCategoria.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
          <p className="text-slate-500 font-bold text-lg">Aún no hay productos guardados en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {productosEnCategoria.map(p => {
            const daPuntos = p.genera_puntos !== false && p.genera_puntos !== 'false';
            return (
            <div key={p.id} className={`bg-slate-50 p-5 rounded-3xl border border-slate-100 flex justify-between items-center hover:border-blue-200 hover:shadow-md transition ${p.disponible === false ? 'opacity-60 grayscale' : ''}`}>
              <div className="flex items-center gap-4">
                {p.imagen_url ? (
                    <img src={p.imagen_url?.startsWith('http') ? p.imagen_url : `${baseUrl}${p.imagen_url}`} alt={p.nombre} className="w-16 h-16 object-cover rounded-2xl shadow-sm" /> 
                ) : (
                    <span className="text-3xl bg-white w-16 h-16 flex items-center justify-center rounded-2xl shadow-sm">{p.emoji}</span>
                )}
                <div>
                  <p className="font-bold text-lg leading-tight text-slate-800 flex items-center flex-wrap gap-2">
                    {p.nombre}
                    {p.disponible === false && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-md uppercase font-black tracking-widest">Oculto</span>}
                    {daPuntos ? (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md uppercase font-black tracking-widest flex items-center gap-1"><Star size={10} className="fill-indigo-700"/> +Pts</span>
                    ) : (
                      <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-1 rounded-md uppercase font-black tracking-widest flex items-center gap-1">Sin Pts</span>
                    )}
                  </p>
                  <span className="text-blue-600 font-black text-sm block mt-1">${p.precio_base} • ⏱️ {p.tiempo_preparacion}m</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setProductoEditando(p)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-xl transition bg-white shadow-sm border border-slate-100"><Edit size={18}/></button>
                <button onClick={() => eliminarProducto(p.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition bg-white shadow-sm border border-slate-100"><Trash2 size={18}/></button>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
};

export default ListaProductos;