import React, { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, Edit, Save, X, Award, Clock, Utensils, CreditCard, Smartphone } from 'lucide-react';

const GestionClientes = ({ apiUrl, showAlert }) => {
  const [vista, setVista] = useState('directorio'); // 'directorio' | 'reportes'
  const [clientes, setClientes] = useState([]);
  const [reportes, setReportes] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para edición
  const [clienteEditando, setClienteEditando] = useState(null);
  const [formData, setFormData] = useState({});

  // Lógica de carga robusta: Si falla, pone valores en cero en lugar de alertar y bloquear
  const cargarDatos = useCallback(async () => {
    try {
      const [resClientes, resReportes] = await Promise.all([
        fetch(`${apiUrl}/clientes`),
        fetch(`${apiUrl}/clientes/reportes`)
      ]);

      if (resClientes.ok && resReportes.ok) {
        const dataClientes = await resClientes.json();
        const dataReportes = await resReportes.json();
        setClientes(Array.isArray(dataClientes) ? dataClientes : []);
        setReportes(dataReportes);
      } else {
        // Carga vacía silenciosa si no hay datos
        setClientes([]);
        setReportes({ promedioEdad: 0, topPuntos: [], antiguos: [], pagos: [], origenes: [], platillos: [] });
      }
    } catch (error) {
      console.warn("CRM: Ejecutando en modo vacío (Sin datos iniciales).");
      setClientes([]);
      setReportes({ promedioEdad: 0, topPuntos: [], antiguos: [], pagos: [], origenes: [], platillos: [] });
    }
  }, [apiUrl]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

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
        cargarDatos();
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
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3"><Users /> Gestión de Clientes (CRM)</h2>
        <div className="flex gap-2 bg-slate-200 p-1 rounded-2xl">
          <button onClick={() => setVista('directorio')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${vista === 'directorio' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Users size={18}/> Directorio</button>
          <button onClick={() => setVista('reportes')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${vista === 'reportes' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><TrendingUp size={18}/> Analítica</button>
        </div>
      </div>

      {/* ================= VISTA: DIRECTORIO ================= */}
      {vista === 'directorio' && (
        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-200">
          <div className="mb-6 relative">
            <input type="text" placeholder="Buscar por nombre o teléfono..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 pl-12 rounded-2xl font-bold outline-none focus:border-blue-500 text-slate-700" />
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
                          <input value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="border p-2 rounded-lg w-24 text-sm font-bold" placeholder="Nombre" />
                          <input value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} className="border p-2 rounded-lg w-24 text-sm font-bold" placeholder="Apellido" />
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
                          <input value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="border p-2 rounded-lg w-32 text-sm font-bold" placeholder="Teléfono" />
                          <input value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} className="border p-2 rounded-lg w-32 text-sm font-bold" placeholder="Correo" />
                        </div>
                      ) : (
                        <div><p className="font-bold">📱 {c.telefono}</p><p className="text-sm text-slate-500">📧 {c.correo || 'N/A'}</p></div>
                      )}
                    </td>
                    <td className="p-4">
                      {clienteEditando === c.id ? (
                        <input type="number" value={formData.puntos} onChange={e => setFormData({...formData, puntos: e.target.value})} className="border p-2 rounded-lg w-20 text-sm font-bold" />
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-black">{c.puntos}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {clienteEditando === c.id ? (
                        <input maxLength="4" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} className="border p-2 rounded-lg w-16 text-sm font-black tracking-widest text-center" />
                      ) : (
                        <span className="font-black text-slate-400 tracking-widest">{c.nip}</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {clienteEditando === c.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setClienteEditando(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg"><X size={20}/></button>
                          <button onClick={() => guardarEdicion(c.id)} className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg"><Save size={20}/></button>
                        </div>
                      ) : (
                        <button onClick={() => iniciarEdicion(c)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-bold flex items-center gap-2 ml-auto"><Edit size={16}/> Editar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= VISTA: ANALÍTICA (REPORTES) ================= */}
      {vista === 'reportes' && reportes && (
        <div className="space-y-6">
          {/* Tarjetas Superiores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="bg-purple-100 text-purple-600 p-4 rounded-2xl"><Users size={32}/></div>
              <div><p className="text-sm font-black text-slate-400 uppercase tracking-widest">Total Registrados</p><p className="text-3xl font-black text-slate-800">{clientes.length}</p></div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl"><Award size={32}/></div>
              <div><p className="text-sm font-black text-slate-400 uppercase tracking-widest">Puntos Repartidos</p><p className="text-3xl font-black text-slate-800">{clientes.reduce((acc, c) => acc + (c.puntos||0), 0)}</p></div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl"><Clock size={32}/></div>
              <div><p className="text-sm font-black text-slate-400 uppercase tracking-widest">Promedio Edad</p><p className="text-3xl font-black text-slate-800">{reportes.promedioEdad} años</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Top Platillos */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Utensils className="text-orange-500"/> Platillos Favoritos</h3>
              <div className="space-y-4">
                {reportes.platillos.length === 0 && <p className="text-slate-400 font-bold">No hay datos suficientes.</p>}
                {reportes.platillos.map((p, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700">{i+1}. {p.platillo}</span>
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-black text-sm">{p.total} pedidos</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Clientes Puntos */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Award className="text-emerald-500"/> Clientes VIP (Puntos)</h3>
              <div className="space-y-4">
                {reportes.topPuntos.length === 0 && <p className="text-slate-400 font-bold">No hay datos suficientes.</p>}
                {reportes.topPuntos.map((c, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700">{i+1}. {c.nombre} {c.apellido}</span>
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-black text-sm">{c.puntos} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preferencias de Pago y Origen */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><CreditCard className="text-blue-500"/> Métodos de Pago</h3>
                <div className="space-y-3">
                  {reportes.pagos.length === 0 && <p className="text-slate-400 font-bold">No hay datos suficientes.</p>}
                  {reportes.pagos.map((p, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="font-bold text-slate-600">{p.metodo_pago}</span>
                      <span className="font-black text-blue-600">{p.cantidad} txns</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Smartphone className="text-purple-500"/> Origen de Pedidos</h3>
                <div className="space-y-3">
                  {reportes.origenes.length === 0 && <p className="text-slate-400 font-bold">No hay datos suficientes.</p>}
                  {reportes.origenes.map((o, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="font-bold text-slate-600">{o.origen}</span>
                      <span className="font-black text-purple-600">{o.cantidad} pedidos</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default GestionClientes;