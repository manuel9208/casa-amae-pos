import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Key, Eye, EyeOff, Info, Server, Hash, Save, PlusCircle, Trash2 } from 'lucide-react';

// 👇 FIX: Recibimos cerrarModal en las props
const ConfigProveedores = ({ apiUrl, showAlert, cerrarModal }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cuentasSMTP, setCuentasSMTP] = useState([]);
  const [showPasswords, setShowPasswords] = useState({});

  const cargarConfiguracion = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/proveedores/configuracion`);
      if (res.ok) {
        const data = await res.json();
        let parseadas = [];
        try { parseadas = typeof data.correos_smtp === 'string' ? JSON.parse(data.correos_smtp) : data.correos_smtp; } catch(e){}
        setCuentasSMTP(parseadas || []);
      }
    } catch (error) {
      console.error(error);
    }
    setCargando(false);
  }, [apiUrl]);

  useEffect(() => {
    cargarConfiguracion();
  }, [cargarConfiguracion]);

  const agregarCuenta = () => {
    setCuentasSMTP([...cuentasSMTP, { id: Date.now(), host: '', port: '465', email: '', password: '' }]);
  };

  const removerCuenta = (id) => {
    setCuentasSMTP(cuentasSMTP.filter(c => c.id !== id));
  };

  const handleCuentaChange = (id, field, value) => {
    setCuentasSMTP(cuentasSMTP.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const togglePassword = (id) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validación
    const validas = cuentasSMTP.filter(c => c.host && c.email && c.password);

    try {
      const res = await fetch(`${apiUrl}/proveedores/configuracion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correos_smtp: validas, ajustes_extra: {} })
      });

      if (res.ok) {
        showAlert("¡Éxito!", "Cuentas SMTP de proveedores guardadas correctamente.", "success");
        cargarConfiguracion();
        // 👇 FIX: Cerramos el modal automáticamente al guardar con éxito
        if (cerrarModal) cerrarModal();
      } else {
        showAlert("Error", "No se pudo guardar la configuración.", "error");
      }
    } catch (error) {
      showAlert("Error", "Fallo de conexión con el servidor.", "error");
    }
    setIsSubmitting(false);
  };

  if (cargando) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Cargando configuración...</div>;

  return (
    <form onSubmit={guardarConfiguracion} className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-blue-100 pb-4">
            <div>
                <h3 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                📧 Cuentas Remitentes (Multi-Correos)
                </h3>
                <p className="text-sm text-slate-500 font-bold mt-1">
                Puedes registrar uno o más correos para enviar facturas. El sistema las utilizará para notificar a los proveedores.
                </p>
            </div>
            <button type="button" onClick={agregarCuenta} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-black text-xs transition shadow-sm flex items-center gap-2 shrink-0">
                <PlusCircle size={16}/> Agregar Correo
            </button>
        </div>

        {cuentasSMTP.length === 0 && (
            <div className="bg-white p-8 text-center rounded-2xl border border-dashed border-blue-200 text-slate-400 font-bold">
                No has agregado ninguna cuenta de correo. Haz clic en "Agregar Correo".
            </div>
        )}

        <div className="space-y-4">
            {cuentasSMTP.map((cuenta, idx) => (
                <div key={cuenta.id} className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm relative group">
                    <div className="absolute -top-3 -left-3 bg-blue-100 text-blue-700 w-8 h-8 flex items-center justify-center rounded-full font-black text-xs shadow-sm">
                        {idx + 1}
                    </div>
                    <button type="button" onClick={() => removerCuenta(cuenta.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition bg-red-50 p-2 rounded-lg">
                        <Trash2 size={16}/>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-12">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Servidor SMTP (Host)</label>
                            <div className="relative">
                                <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input required type="text" value={cuenta.host} onChange={(e) => handleCuentaChange(cuenta.id, 'host', e.target.value)} className="w-full py-2.5 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:border-blue-500 transition-all text-sm" placeholder="smtp.gmail.com" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Puerto</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input required type="number" value={cuenta.port} onChange={(e) => handleCuentaChange(cuenta.id, 'port', e.target.value)} className="w-full py-2.5 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:border-blue-500 transition-all text-sm" placeholder="465" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Correo Remitente</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input required type="email" value={cuenta.email} onChange={(e) => handleCuentaChange(cuenta.id, 'email', e.target.value)} className="w-full py-2.5 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:border-blue-500 transition-all text-sm" placeholder="compras@tudominio.com" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contraseña de Aplicación</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input required type={showPasswords[cuenta.id] ? "text" : "password"} value={cuenta.password} onChange={(e) => handleCuentaChange(cuenta.id, 'password', e.target.value)} className="w-full py-2.5 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:border-blue-500 transition-all text-sm" placeholder="••••••••••••" />
                                <button type="button" onClick={() => togglePassword(cuenta.id)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                                    {showPasswords[cuenta.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div className="bg-white border border-blue-100 p-4 rounded-2xl flex items-start gap-3 mt-4 shadow-sm">
          <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
          <div className="text-xs font-medium text-slate-600 leading-relaxed space-y-1">
            <p><strong className="text-slate-800">Para Gmail:</strong> Usa Host: <code>smtp.gmail.com</code> | Puerto: <code>465</code>.</p>
            <p><strong className="text-slate-800">Para Office 365:</strong> Usa Host: <code>smtp.office365.com</code> | Puerto: <code>587</code>.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-500/30 transition disabled:opacity-50 active:scale-95 flex justify-center items-center gap-2 w-full md:w-auto">
          {isSubmitting ? 'Guardando...' : <><Save size={20}/> Guardar Configuración</>}
        </button>
      </div>
    </form>
  );
};

export default ConfigProveedores;