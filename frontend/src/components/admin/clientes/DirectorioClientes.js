import React, { useState } from 'react';
import { Search, PlusCircle, Edit2, Trash2, MapPin } from 'lucide-react';

const DirectorioClientes = ({ clientes, formaterMoneda, apiUrl, refrescarDatos, showAlert }) => {
  const [filtroGeneral, setFiltroGeneral] = useState('');
  const [modalCliente, setModalCliente] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [clienteEditandoId, setClienteEditandoId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🛡️ CORRECCIÓN: Agregamos "direccion" al estado inicial
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', telefono: '', correo: '', fecha_nacimiento: '', direccion: ''
  });

  const clientesFiltrados = clientes.filter(c => {
    const term = filtroGeneral.toLowerCase();
    return (
      (c.nombre && c.nombre.toLowerCase().includes(term)) ||
      (c.apellido && c.apellido.toLowerCase().includes(term)) ||
      (c.telefono && String(c.telefono).includes(term))
    );
  });

  const handleOpenCrear = () => {
    setModoEdicion(false);
    setClienteEditandoId(null);
    setFormData({ nombre: '', apellido: '', telefono: '', correo: '', fecha_nacimiento: '', direccion: '' });
    setModalCliente(true);
  };

  const handleOpenEditar = (c) => {
    setModoEdicion(true);
    setClienteEditandoId(c.id);
    setFormData({
      nombre: c.nombre || '',
      apellido: c.apellido || '',
      telefono: c.telefono || '',
      correo: c.correo || '',
      fecha_nacimiento: c.fecha_nacimiento ? c.fecha_nacimiento.split('T')[0] : '',
      direccion: c.direccion || '' // 🛡️ CORRECCIÓN: Carga la dirección del cliente
    });
    setModalCliente(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = modoEdicion ? `${apiUrl}/clientes/${clienteEditandoId}` : `${apiUrl}/clientes/registro`;
      const method = modoEdicion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        showAlert("¡Éxito!", `Cliente ${modoEdicion ? 'actualizado' : 'registrado'} correctamente.`, "success");
        setModalCliente(false);
        refrescarDatos();
      } else {
        showAlert("Error", data.error || "Ocurrió un problema.", "error");
      }
    } catch (error) {
      showAlert("Error", "Fallo de conexión con el servidor.", "error");
    }
    setIsSubmitting(false);
  };

  const eliminarCliente = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este cliente? Se perderán sus puntos y beneficios.")) return;
    try {
      const res = await fetch(`${apiUrl}/clientes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert("Eliminado", "El cliente ha sido eliminado.", "success");
        refrescarDatos();
      } else {
        showAlert("Error", "No se pudo eliminar.", "error");
      }
    } catch (e) {
      showAlert("Error", "Error de red al eliminar.", "error");
    }
  };

  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-xl font-black text-slate-800">Directorio de Clientes</h3>
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar por nombre o teléfono..." value={filtroGeneral} onChange={e => setFiltroGeneral(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold outline-none focus:border-blue-500 transition" />
          </div>
          <button onClick={handleOpenCrear} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-md transition active:scale-95 whitespace-nowrap">
            <PlusCircle size={18} /> <span className="hidden sm:inline">Nuevo Cliente</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <th className="pb-3 px-2">ID</th>
              <th className="pb-3 px-2">Cliente</th>
              <th className="pb-3 px-2">Contacto</th>
              <th className="pb-3 px-2">Dirección</th>
              <th className="pb-3 px-2">Cumpleaños</th>
              <th className="pb-3 px-2">Puntos Monedero</th>
              <th className="pb-3 px-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {clientesFiltrados.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-10 font-bold text-slate-400">No se encontraron clientes.</td></tr>
            ) : (
              clientesFiltrados.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-2 font-bold text-slate-400 text-xs">#{c.id}</td>
                  <td className="py-3 px-2 font-black text-slate-700">{c.nombre} {c.apellido}</td>
                  <td className="py-3 px-2">
                    <p className="font-bold text-slate-800">{c.telefono}</p>
                    <p className="text-[10px] font-bold text-slate-400">{c.correo || 'Sin correo'}</p>
                  </td>
                  <td className="py-3 px-2 max-w-[200px] truncate text-xs font-bold text-slate-500" title={c.direccion}>
                    {c.direccion ? <span className="flex items-center gap-1"><MapPin size={12}/> {c.direccion}</span> : 'Sin dirección'}
                  </td>
                  <td className="py-3 px-2 text-xs font-bold text-slate-500">{c.fecha_nacimiento ? new Date(c.fecha_nacimiento).toLocaleDateString() : '--/--/----'}</td>
                  <td className="py-3 px-2 font-black text-emerald-600 bg-emerald-50/50 rounded-lg text-center">{c.puntos} PTS</td>
                  <td className="py-3 px-2">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleOpenEditar(c)} className="p-2 bg-slate-100 text-slate-500 hover:bg-blue-500 hover:text-white rounded-lg transition"><Edit2 size={16} /></button>
                      <button onClick={() => eliminarCliente(c.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalCliente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-800 mb-6">{modoEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-black text-slate-400 uppercase mb-1">Nombre *</label><input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500" /></div>
                <div><label className="block text-xs font-black text-slate-400 uppercase mb-1">Apellido *</label><input required type="text" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500" /></div>
              </div>
              <div><label className="block text-xs font-black text-slate-400 uppercase mb-1">Celular (10 dígitos) *</label><input required type="tel" maxLength="10" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500 tracking-widest" disabled={modoEdicion} /></div>
              <div><label className="block text-xs font-black text-slate-400 uppercase mb-1">Correo Electrónico</label><input type="email" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500" /></div>
              <div><label className="block text-xs font-black text-slate-400 uppercase mb-1">Fecha de Nacimiento</label><input type="date" value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500 text-slate-600" /></div>
              
              {/* 🛡️ CORRECCIÓN: Campo de Dirección en CRM */}
              <div>
                 <label className="block text-xs font-black text-slate-400 uppercase mb-1">Dirección Física Completa</label>
                 <textarea value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} placeholder="Ej. Calle, Número, Colonia, Referencias..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-blue-500 h-20 resize-none"></textarea>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" disabled={isSubmitting} onClick={() => setModalCliente(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-black shadow-md hover:bg-blue-700 transition active:scale-95 disabled:opacity-50">{isSubmitting ? 'Guardando...' : 'Guardar Cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorioClientes;