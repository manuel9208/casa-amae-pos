import React, { useState } from 'react';
import { Edit, Save, X } from 'lucide-react';

const DirectorioClientes = ({ clientes, apiUrl, showAlert, refrescarDatos }) => {
  const [busqueda, setBusqueda] = useState('');
  const [clienteEditando, setClienteEditando] = useState(null);
  const [formData, setFormData] = useState({});

  const iniciarEdicion = (cliente) => {
    setClienteEditando(cliente.id);
    setFormData({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      telefono: cliente.telefono,
      correo: cliente.correo || '',
      puntos: cliente.puntos,
      nip: cliente.nip
    });
  };

  const guardarEdicion = async (id) => {
    try {
      const res = await fetch(`${apiUrl}/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showAlert("¡Actualizado!", "Información del cliente guardada.", "success");
        setClienteEditando(null);
        refrescarDatos();
      } else {
        showAlert("Error", "No se pudo actualizar.", "error");
      }
    } catch (error) {
      showAlert("Error", "Fallo de conexión.", "error");
    }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
    c.telefono?.toString().includes(busqueda)
  );

  return (
    <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
      <div className="mb-6 relative">
        <input 
          type="text" 
          placeholder="Buscar por nombre o teléfono..." 
          value={busqueda} 
          onChange={e => setBusqueda(e.target.value)} 
          className="w-full bg-slate-50 border border-slate-200 p-4 pl-12 rounded-2xl font-bold outline-none focus:border-blue-500 text-slate-700" 
        />
        <span className="absolute left-4 top-4 text-slate-400">🔍</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-100 text-slate-400 text-sm uppercase tracking-widest">
              <th className="p-4 font-black">Cliente</th>
              <th className="p-4 font-black">Contacto</th>
              <th className="p-4 font-black">Puntos</th>
              <th className="p-4 font-black">NIP</th>
              <th className="p-4 font-black text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {clientesFiltrados.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-bold">No hay clientes registrados o que coincidan con la búsqueda.</td></tr>
            )}
            {clientesFiltrados.map(c => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                <td className="p-4">
                  {clienteEditando === c.id ? (
                    <div className="flex gap-2">
                      <input value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="border p-2 rounded-lg w-24 text-sm font-bold outline-none focus:border-blue-500" placeholder="Nombre" />
                      <input value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} className="border p-2 rounded-lg w-24 text-sm font-bold outline-none focus:border-blue-500" placeholder="Apellido" />
                    </div>
                  ) : (
                    <div>
                      <p className="font-black text-lg">{c.nombre} {c.apellido}</p>
                      <p className="text-xs font-bold text-slate-400">Registrado: {new Date(c.fecha_registro).toLocaleDateString()}</p>
                    </div>
                  )}
                </td>
                <td className="p-4">
                  {clienteEditando === c.id ? (
                    <div className="flex flex-col gap-2">
                      <input value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="border p-2 rounded-lg w-32 text-sm font-bold outline-none focus:border-blue-500" placeholder="Teléfono" />
                      <input value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} className="border p-2 rounded-lg w-32 text-sm font-bold outline-none focus:border-blue-500" placeholder="Correo" />
                    </div>
                  ) : (
                    <div><p className="font-bold">📱 {c.telefono}</p><p className="text-sm text-slate-500">📧 {c.correo || 'N/A'}</p></div>
                  )}
                </td>
                <td className="p-4">
                  {clienteEditando === c.id ? (
                    <input type="number" value={formData.puntos} onChange={e => setFormData({...formData, puntos: e.target.value})} className="border p-2 rounded-lg w-20 text-sm font-bold outline-none focus:border-blue-500" />
                  ) : (
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-black">{c.puntos}</span>
                  )}
                </td>
                <td className="p-4">
                  {clienteEditando === c.id ? (
                    <input maxLength="4" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} className="border p-2 rounded-lg w-16 text-sm font-black tracking-widest text-center outline-none focus:border-blue-500" />
                  ) : (
                    <span className="font-black text-slate-400 tracking-widest">{c.nip}</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  {clienteEditando === c.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setClienteEditando(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg transition"><X size={20}/></button>
                      <button onClick={() => guardarEdicion(c.id)} className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"><Save size={20}/></button>
                    </div>
                  ) : (
                    <button onClick={() => iniciarEdicion(c)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-bold flex items-center gap-2 ml-auto transition"><Edit size={16}/> Editar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DirectorioClientes;