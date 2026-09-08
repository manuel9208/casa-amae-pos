import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, Users, CreditCard, ShieldCheck, Mail, Upload, FileText, CheckCircle2, XCircle, Building2, MapPin, Phone, Star, BellRing } from 'lucide-react';

const DirectorioClientes = ({ apiUrl, showAlert, showConfirm }) => {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  // Estados del Modal Principal
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pestañaForm, setPestañaForm] = useState('generales');

  // Estados de Verificación de Correo
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [codigoInput, setCodigoInput] = useState('');
  const [codigoRealServidor, setCodigoRealServidor] = useState(null);

  const [isDiasCustom, setIsDiasCustom] = useState(false);

  const [formData, setFormData] = useState({
    empresa: '', nombre_contacto: '', telefono: '', correo: '', rfc: '', direccion: '', fecha_nacimiento: '',
    puntos_acumulados: 0, tiene_credito: false, limite_credito: '', dias_credito: 15, recordatorios_activos: true, 
    correo_verificado: false, ine_frente: null, ine_reverso: null, comprobante_domicilio: null
  });

  // ==========================================
  // CARGA DE DATOS REALES (FETCH)
  // ==========================================
  const cargarDatos = useCallback(async () => {
    try {
      const resCli = await fetch(`${apiUrl}/distribucion/clientes`);
      if (resCli.ok) setClientes(await resCli.json());
    } catch (error) {
      console.error("Error al cargar directorio B2B:", error);
    }
  }, [apiUrl]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const clientesFiltrados = clientes.filter(c => 
    c.empresa.toLowerCase().includes(busqueda.toLowerCase()) || 
    c.nombre_contacto.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono.includes(busqueda)
  );

  // ==========================================
  // MANEJO DE MODALES
  // ==========================================
  const abrirModalNuevo = () => {
    setEditandoId(null); setPestañaForm('generales'); setCodigoEnviado(false); setCodigoInput(''); setIsDiasCustom(false); setCodigoRealServidor(null);
    setFormData({
      empresa: '', nombre_contacto: '', telefono: '', correo: '', rfc: '', direccion: '', fecha_nacimiento: '',
      puntos_acumulados: 0, tiene_credito: false, limite_credito: '', dias_credito: 15, recordatorios_activos: true, 
      correo_verificado: false, ine_frente: null, ine_reverso: null, comprobante_domicilio: null
    });
    setModalVisible(true);
  };

  const abrirModalEditar = (cliente) => {
    setEditandoId(cliente.id); setPestañaForm('generales'); setCodigoEnviado(false); setCodigoInput(''); setCodigoRealServidor(null);
    
    const dias = Number(cliente.dias_credito || 0);
    const esCustom = ![0, 7, 15, 30, 60].includes(dias);
    setIsDiasCustom(esCustom);

    setFormData({
      empresa: cliente.empresa, nombre_contacto: cliente.nombre_contacto, telefono: cliente.telefono, correo: cliente.correo || '',
      rfc: cliente.rfc || '', direccion: cliente.direccion || '', fecha_nacimiento: cliente.fecha_nacimiento ? cliente.fecha_nacimiento.split('T')[0] : '',
      puntos_acumulados: cliente.puntos || 0, tiene_credito: cliente.tiene_credito, limite_credito: cliente.limite_credito || '',
      dias_credito: dias, recordatorios_activos: cliente.recordatorios_activos !== false, correo_verificado: cliente.correo_verificado || false,
      ine_frente: cliente.ine_frente_url || null, ine_reverso: cliente.ine_reverso_url || null, comprobante_domicilio: cliente.comprobante_url || null
    });
    setModalVisible(true);
  };

  // ==========================================
  // FLUJO DE CORREOS Y SEGURIDAD SMTP
  // ==========================================
  const solicitarEnvioCodigo = async () => {
    if (!formData.correo) return showAlert('Atención', 'Ingresa un correo electrónico primero.', 'error');
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/distribucion/clientes/enviar-codigo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: formData.correo, empresa: formData.empresa })
      });
      const data = await res.json();
      if (res.ok) {
        setCodigoRealServidor(data.codigo_generado);
        setCodigoEnviado(true);
        showAlert('Código Enviado', `Revisa la bandeja de entrada de ${formData.correo}`, 'success');
      } else {
        showAlert('Error', data.error || 'No se pudo enviar el correo. Revisa tus ajustes en la configuración general.', 'error');
      }
    } catch (e) {
      showAlert('Error', 'Fallo al contactar al servidor de correos.', 'error');
    }
    setIsSubmitting(false);
  };

  const verificarCodigoIngresado = () => {
    if (String(codigoInput).trim() === String(codigoRealServidor).trim()) {
      setFormData({ ...formData, correo_verificado: true });
      showAlert('¡Verificado!', 'El correo electrónico ha sido autenticado.', 'success');
    } else {
      showAlert('Error', 'Código incorrecto. Intenta nuevamente.', 'error');
    }
  };

  // ==========================================
  // PERSISTENCIA DE DATOS (CLIENTES)
  // ==========================================
  const guardarCliente = async (e) => {
    e.preventDefault();
    if (formData.tiene_credito && !formData.correo_verificado) {
      return showAlert('Atención', 'Para aprobar un crédito, el correo electrónico debe estar verificado.', 'warning');
    }
    
    setIsSubmitting(true);
    
    // Empaquetado para soportar subida de imágenes a Cloudinary
    const payload = new FormData();
    payload.append('empresa', formData.empresa);
    payload.append('nombre_contacto', formData.nombre_contacto);
    payload.append('telefono', formData.telefono);
    payload.append('correo', formData.correo);
    payload.append('rfc', formData.rfc);
    payload.append('direccion', formData.direccion);
    payload.append('fecha_nacimiento', formData.fecha_nacimiento);
    payload.append('puntos_acumulados', formData.puntos_acumulados || 0);
    payload.append('tiene_credito', formData.tiene_credito);
    payload.append('limite_credito', formData.limite_credito || 0);
    payload.append('dias_credito', formData.dias_credito || 0);
    payload.append('recordatorios_activos', formData.recordatorios_activos);
    payload.append('correo_verificado', formData.correo_verificado);

    if (formData.ine_frente instanceof File) payload.append('ine_frente', formData.ine_frente);
    if (formData.ine_reverso instanceof File) payload.append('ine_reverso', formData.ine_reverso);
    if (formData.comprobante_domicilio instanceof File) payload.append('comprobante_domicilio', formData.comprobante_domicilio);

    try {
      const url = editandoId ? `${apiUrl}/distribucion/clientes/${editandoId}` : `${apiUrl}/distribucion/clientes`;
      const method = editandoId ? 'PUT' : 'POST';
      
      const res = await fetch(url, { method, body: payload });
      if (res.ok) {
        showAlert('Éxito', 'Cliente guardado correctamente en el directorio.', 'success');
        setModalVisible(false);
        cargarDatos();
      } else {
        const errorData = await res.json();
        showAlert('Error', errorData.error || 'No se pudo guardar el cliente.', 'error');
      }
    } catch (error) {
      showAlert('Error', 'Fallo de conexión al servidor.', 'error');
    }
    setIsSubmitting(false);
  };

  const eliminarCliente = (id) => {
    showConfirm('Eliminar Cliente', '¿Estás seguro de borrar este cliente y todos sus documentos del sistema?', async () => {
      try {
        const res = await fetch(`${apiUrl}/distribucion/clientes/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert('Eliminado', 'El cliente ha sido borrado.', 'success');
          cargarDatos();
        } else {
          showAlert('Error', 'El cliente tiene historial y no puede ser borrado.', 'error');
        }
      } catch (e) {
        showAlert('Error', 'Fallo de conexión.', 'error');
      }
    });
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-300">
      
      {/* BARRA SUPERIOR DE ACCIONES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por empresa, contacto o teléfono..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all"
          />
        </div>
        <button 
          onClick={abrirModalNuevo}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Registrar Cliente
        </button>
      </div>

      {/* LISTADO DE CLIENTES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white rounded-[32px] border border-slate-200 border-dashed">
            <Users size={64} className="text-slate-300 mb-4 animate-pulse" />
            <p className="text-xl font-black text-slate-400">Sin clientes en el directorio</p>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
              Registra tu primer cliente mayorista.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clientesFiltrados.map(cli => (
              <div key={cli.id} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col relative group">
                
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => abrirModalEditar(cli)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-500 hover:text-white transition"><Edit size={16}/></button>
                  <button onClick={() => eliminarCliente(cli.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition"><Trash2 size={16}/></button>
                </div>
                
                <div className="flex items-start gap-4 mb-4 pr-16">
                  <div className="bg-slate-100 text-slate-500 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-slate-200">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg leading-tight">{cli.empresa}</h3>
                    <p className="text-sm font-bold text-slate-500">{cli.nombre_contacto}</p>
                  </div>
                </div>
                
                <div className="space-y-1.5 mb-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-2"><Phone size={14} className="text-emerald-500"/> {cli.telefono}</p>
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-2"><MapPin size={14} className="text-pink-500"/> {cli.direccion}</p>
                  {cli.correo && (
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                      <Mail size={14} className={cli.correo_verificado ? "text-blue-500" : "text-slate-400"}/> 
                      {cli.correo}
                      {cli.correo_verificado && <ShieldCheck size={12} className="text-emerald-500" title="Correo Verificado"/>}
                    </p>
                  )}
                  {Number(cli.puntos) > 0 && (
                     <p className="text-xs font-black text-amber-600 flex items-center gap-2 bg-amber-50 px-2 py-0.5 rounded-md w-fit border border-amber-100 mt-1">
                       <Star size={12} className="fill-amber-500" /> {cli.puntos} Puntos Acumulados
                     </p>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100">
                  {cli.tiene_credito ? (
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CreditCard size={18} className="text-blue-600" />
                        <div>
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Crédito Aprobado</p>
                          <p className="text-sm font-black text-blue-800">${Number(cli.limite_credito).toFixed(2)}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-white text-blue-600 px-2 py-1 rounded shadow-sm border border-blue-100 flex flex-col items-center leading-none justify-center">
                        <span className="text-xs">{cli.dias_credito}</span>
                        <span>Días</span>
                      </span>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2">
                      <div className="bg-white p-1.5 rounded shadow-sm"><CreditCard size={14} className="text-slate-400" /></div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Cliente de Contado</p>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: REGISTRO DE CLIENTE MAYORISTA */}
      {/* ============================================================== */}
      {modalVisible && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={guardarCliente} className="bg-white rounded-[36px] shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-slate-100 animate-in zoom-in-95 relative overflow-hidden">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0 bg-white z-10 relative">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{editandoId ? 'Editar Cliente' : 'Nuevo Cliente Mayorista'}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Directorio B2B</p>
              </div>
              <button type="button" onClick={() => setModalVisible(false)} className="p-2 bg-slate-100 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition active:scale-95">
                <XCircle size={24} />
              </button>
            </div>

            {/* TABS INTERNOS DEL FORMULARIO */}
            <div className="flex px-6 pt-4 bg-slate-50/50 border-b border-slate-100 shrink-0 gap-4">
              <button type="button" onClick={() => setPestañaForm('generales')} className={`pb-3 font-black text-sm uppercase tracking-widest border-b-4 transition-all ${pestañaForm === 'generales' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                Datos Generales
              </button>
              <button type="button" onClick={() => setPestañaForm('credito')} className={`pb-3 font-black text-sm uppercase tracking-widest border-b-4 transition-all flex items-center gap-2 ${pestañaForm === 'credito' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                Expediente de Crédito {formData.tiene_credito && <CheckCircle2 size={16} className="text-emerald-500"/>}
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
              
              {/* PESTAÑA 1: DATOS GENERALES */}
              {pestañaForm === 'generales' && (
                <div className="space-y-6 animate-in slide-in-from-left-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Empresa / Negocio *</label>
                      <input type="text" required value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none focus:border-indigo-500 text-slate-700 shadow-sm" placeholder="Ej. Cafetería El Sol" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Nombre del Contacto *</label>
                      <input type="text" required value={formData.nombre_contacto} onChange={e => setFormData({...formData, nombre_contacto: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none focus:border-indigo-500 text-slate-700 shadow-sm" placeholder="Ej. Juan Pérez" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Teléfono Móvil *</label>
                      <input type="tel" maxLength="10" required value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value.replace(/\D/g, '')})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-indigo-500 text-slate-700 shadow-sm" placeholder="10 dígitos" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">RFC (Facturación)</label>
                      <input type="text" value={formData.rfc} onChange={e => setFormData({...formData, rfc: e.target.value.toUpperCase()})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-indigo-500 text-slate-700 shadow-sm uppercase" placeholder="Opcional" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Puntos Acumulados</label>
                      <div className="relative">
                         <Star size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 fill-amber-500" />
                         <input type="number" min="0" step="1" value={formData.puntos_acumulados} onChange={e => setFormData({...formData, puntos_acumulados: e.target.value})} className="w-full bg-amber-50 border border-amber-200 rounded-xl py-3 pr-3 pl-10 font-black outline-none focus:border-amber-500 text-amber-800 shadow-inner" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Fecha Nacimiento (Opcional)</label>
                      <input type="date" value={formData.fecha_nacimiento} onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-indigo-500 text-slate-700 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Dirección de Entrega *</label>
                      <textarea required value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none focus:border-indigo-500 text-slate-700 shadow-sm h-24 resize-none" placeholder="Calle, Número, Colonia, Código Postal, Ciudad..."></textarea>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: CRÉDITO Y DOCUMENTACIÓN */}
              {pestañaForm === 'credito' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  
                  {/* SWITCH PRINCIPAL */}
                  <div className={`p-5 rounded-2xl border transition-colors flex flex-col md:flex-row items-center justify-between gap-4 ${formData.tiene_credito ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                     <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${formData.tiene_credito ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400 shadow-sm border border-slate-100'}`}>
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <p className={`text-lg font-black tracking-tight ${formData.tiene_credito ? "text-blue-800" : "text-slate-600"}`}>Línea de Crédito Activa</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Permite apartar mercancía sin pago inmediato.</p>
                        </div>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={formData.tiene_credito} onChange={e => setFormData({...formData, tiene_credito: e.target.checked})} />
                        <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                     </label>
                  </div>

                  {formData.tiene_credito && (
                    <div className="animate-in slide-in-from-top-4 duration-300 space-y-6">
                      
                      {/* LÍMITES FINANCIEROS Y DÍAS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                          <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Límite de Crédito ($) *</label>
                          <input type="number" min="1" step="0.01" required={formData.tiene_credito} value={formData.limite_credito} onChange={e => setFormData({...formData, limite_credito: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-center font-black text-2xl outline-none focus:border-blue-500 text-blue-800" placeholder="0.00" />
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                          <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Días de Gracia para Pagar *</label>
                          <div className="flex items-center gap-2">
                            <select 
                              required={formData.tiene_credito} 
                              value={isDiasCustom ? 'otro' : formData.dias_credito} 
                              onChange={e => {
                                if(e.target.value === 'otro') {
                                  setIsDiasCustom(true);
                                  setFormData({...formData, dias_credito: ''});
                                } else {
                                  setIsDiasCustom(false);
                                  setFormData({...formData, dias_credito: Number(e.target.value)});
                                }
                              }} 
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 font-black text-lg outline-none focus:border-blue-500 text-slate-700 cursor-pointer"
                            >
                              <option value={7}>7 Días</option>
                              <option value={15}>15 Días</option>
                              <option value={30}>30 Días</option>
                              <option value={60}>60 Días</option>
                              <option value="otro">Otro (Especifique)</option>
                            </select>
                            {isDiasCustom && (
                              <input 
                                type="number" 
                                min="1" 
                                step="1" 
                                required 
                                autoFocus
                                value={formData.dias_credito} 
                                onChange={e => setFormData({...formData, dias_credito: e.target.value})} 
                                className="w-24 bg-white border-2 border-blue-300 rounded-xl p-4 text-center font-black text-lg outline-none focus:border-blue-600 text-blue-800 animate-in slide-in-from-right" 
                                placeholder="Días"
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* NOTIFICACIONES AUTOMÁTICAS (CONFIGURACIÓN) */}
                      <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-colors ${formData.recordatorios_activos ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                         <div className="flex items-start gap-3">
                            <BellRing className={`shrink-0 mt-0.5 ${formData.recordatorios_activos ? 'text-emerald-500' : 'text-slate-400'}`} size={20} />
                            <div>
                               <p className={`font-black text-sm ${formData.recordatorios_activos ? 'text-emerald-800' : 'text-slate-600'}`}>Recordatorios Automáticos de Cobro</p>
                               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                 Se enviará un correo: A los 10 días, 3 días antes de vencer, el día del vencimiento y cada 5 días de retraso.
                               </p>
                            </div>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" className="sr-only peer" checked={formData.recordatorios_activos} onChange={e => setFormData({...formData, recordatorios_activos: e.target.checked})} />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                         </label>
                      </div>

                      {/* VALIDACIÓN DE CORREO REAL CON EL SERVIDOR */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Mail size={14}/> Verificación de Correo (Facturación) *
                        </p>
                        
                        <div className="flex flex-col md:flex-row gap-3 items-end">
                          <div className="flex-1 w-full">
                            <input type="email" required={formData.tiene_credito} value={formData.correo} onChange={e => {setFormData({...formData, correo: e.target.value, correo_verificado: false}); setCodigoEnviado(false); setCodigoRealServidor(null);}} className="w-full bg-white border border-slate-200 rounded-xl p-3.5 font-bold outline-none focus:border-indigo-500 text-slate-700 shadow-sm" placeholder="correo@empresa.com" />
                          </div>
                          
                          {!formData.correo_verificado ? (
                            <>
                              {!codigoEnviado ? (
                                <button type="button" disabled={isSubmitting} onClick={solicitarEnvioCodigo} className="bg-slate-800 hover:bg-slate-700 text-white font-black px-6 py-3.5 rounded-xl shadow-md transition-all active:scale-95 shrink-0 w-full md:w-auto disabled:opacity-50">
                                  {isSubmitting ? 'Enviando...' : 'Enviar Código'}
                                </button>
                              ) : (
                                <div className="flex gap-2 w-full md:w-auto animate-in slide-in-from-right-2">
                                  <input type="text" maxLength="6" placeholder="000000" value={codigoInput} onChange={e => setCodigoInput(e.target.value.replace(/\D/g, ''))} className="w-28 text-center bg-white border-2 border-indigo-200 rounded-xl p-3.5 font-black outline-none tracking-widest focus:border-indigo-500 text-indigo-700" />
                                  <button type="button" onClick={verificarCodigoIngresado} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 rounded-xl shadow-md transition-all active:scale-95 shrink-0">
                                    Verificar
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="bg-emerald-100 text-emerald-700 font-black px-6 py-3.5 rounded-xl border border-emerald-200 flex items-center gap-2 shrink-0 w-full md:w-auto justify-center">
                              <ShieldCheck size={20} /> Verificado
                            </div>
                          )}
                        </div>
                      </div>

                      {/* DOCUMENTACIÓN LEGAL (CLOUDINARY) */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                          <FileText size={14}/> Expediente Físico (Fotos / PDF)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          
                          {/* INE Frente */}
                          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer relative group">
                            <Upload size={24} className="mx-auto text-slate-400 mb-2 group-hover:text-indigo-500 transition-colors" />
                            <p className="text-xs font-black text-slate-600 mb-1">INE (Frente)</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">JPG, PNG o PDF</p>
                            <input type="file" accept="image/*,.pdf" onChange={e => setFormData({...formData, ine_frente: e.target.files[0]})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            {formData.ine_frente && <div className="absolute top-2 right-2 bg-emerald-500 rounded-full text-white p-0.5" title="Archivo Listo"><CheckCircle2 size={16}/></div>}
                          </div>

                          {/* INE Reverso */}
                          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer relative group">
                            <Upload size={24} className="mx-auto text-slate-400 mb-2 group-hover:text-indigo-500 transition-colors" />
                            <p className="text-xs font-black text-slate-600 mb-1">INE (Reverso)</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">JPG, PNG o PDF</p>
                            <input type="file" accept="image/*,.pdf" onChange={e => setFormData({...formData, ine_reverso: e.target.files[0]})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            {formData.ine_reverso && <div className="absolute top-2 right-2 bg-emerald-500 rounded-full text-white p-0.5" title="Archivo Listo"><CheckCircle2 size={16}/></div>}
                          </div>

                          {/* Comprobante */}
                          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer relative group">
                            <Upload size={24} className="mx-auto text-slate-400 mb-2 group-hover:text-indigo-500 transition-colors" />
                            <p className="text-xs font-black text-slate-600 mb-1">Comprobante Domicilio</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Menor a 3 meses</p>
                            <input type="file" accept="image/*,.pdf" onChange={e => setFormData({...formData, comprobante_domicilio: e.target.files[0]})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            {formData.comprobante_domicilio && <div className="absolute top-2 right-2 bg-emerald-500 rounded-full text-white p-0.5" title="Archivo Listo"><CheckCircle2 size={16}/></div>}
                          </div>

                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="p-6 border-t border-slate-100 flex gap-4 shrink-0 bg-slate-50 rounded-b-[36px] z-10 relative">
              <button type="button" disabled={isSubmitting} onClick={() => setModalVisible(false)} className="flex-1 py-4 bg-white text-slate-600 border border-slate-200 font-black rounded-2xl hover:bg-slate-100 transition disabled:opacity-50 active:scale-95">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-indigo-600 text-white font-black text-lg rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 disabled:opacity-50 transition active:scale-95 flex items-center justify-center gap-2">
                <CheckCircle2 size={20}/> {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default DirectorioClientes;