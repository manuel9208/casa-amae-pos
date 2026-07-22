import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle2, User, Save, MapPin, Mail, Calendar, Phone, Award, Lock, ShieldCheck } from 'lucide-react';

const MisPedidos = ({ misPedidos, setPantallaActual, modificarPedido, clienteActivo, apiUrl, configGlobal }) => {
  const [tab, setTab] = useState('activas'); // 'activas' | 'finalizadas' | 'perfil'
  
  const [formData, setFormData] = useState({ 
    nombre: '', apellido: '', correo: '', direccion: '', anio: '', mes: '', dia: '' 
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState(null);

  // ESTADOS PARA EL FLUJO 2FA DEL NIP
  const [flujoNip, setFlujoNip] = useState('inactivo'); 
  const [codigoVerificacion, setCodigoVerificacion] = useState('');
  const [nuevoNip, setNuevoNip] = useState('');
  const [mensajeNip, setMensajeNip] = useState(null);

  // 👇 NUEVOS ESTADOS PARA EL FLUJO 2FA DEL CORREO
  const [flujoCorreo, setFlujoCorreo] = useState('inactivo');
  const [codigoVerificacionCorreo, setCodigoVerificacionCorreo] = useState('');
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [mensajeCorreo, setMensajeCorreo] = useState(null);

  useEffect(() => {
    if (clienteActivo) {
      let y = '', m = '', d = '';
      if (clienteActivo.fecha_nacimiento) {
        const parts = clienteActivo.fecha_nacimiento.split('T')[0].split('-');
        if (parts.length === 3) { y = parts[0]; m = parts[1]; d = parts[2]; }
      }

      setFormData({
        nombre: clienteActivo.nombre || '',
        apellido: clienteActivo.apellido || '',
        correo: clienteActivo.correo || '',
        direccion: clienteActivo.direccion || '',
        anio: y,
        mes: m,
        dia: d
      });
      
      // Reiniciamos los flujos de seguridad
      setNuevoNip('');
      setCodigoVerificacion('');
      setFlujoNip('inactivo');
      setMensajeNip(null);
      
      setNuevoCorreo('');
      setCodigoVerificacionCorreo('');
      setFlujoCorreo('inactivo');
      setMensajeCorreo(null);
    }
  }, [clienteActivo]);

  const pedidosActivos = misPedidos.filter(p => ['Pendiente', 'Preparando', 'En Camino'].includes(p.estado_preparacion));
  const pedidosFinalizados = misPedidos.filter(p => ['Entregado', 'Cancelado'].includes(p.estado_preparacion));

  // 1. GUARDADO DE PERFIL GENERAL
  const actualizarPerfil = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMensajePerfil(null);

    if (!formData.correo.trim()) {
      setMensajePerfil({ tipo: 'error', texto: 'El correo electrónico es obligatorio por seguridad.' });
      setIsSubmitting(false);
      return;
    }

    let fecha_nacimiento_unida = null;
    if (formData.anio || formData.mes || formData.dia) {
      if (!formData.anio || !formData.mes || !formData.dia || formData.anio.length !== 4) {
        setMensajePerfil({ tipo: 'error', texto: 'Por favor, ingresa una fecha de nacimiento válida (Año a 4 dígitos, Mes y Día).' });
        setIsSubmitting(false);
        return;
      }
      fecha_nacimiento_unida = `${formData.anio}-${formData.mes.padStart(2, '0')}-${formData.dia.padStart(2, '0')}`;
    }

    const payload = { 
      nombre: formData.nombre,
      apellido: formData.apellido,
      correo: formData.correo, // Si ya estaba bloqueado, simplemente se re-envía el mismo
      direccion: formData.direccion,
      fecha_nacimiento: fecha_nacimiento_unida 
    };

    try {
      const res = await fetch(`${apiUrl}/clientes/${clienteActivo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setMensajePerfil({ tipo: 'success', texto: '¡Tus datos se actualizaron correctamente!' });
        clienteActivo.correo = formData.correo;
        setTimeout(() => setMensajePerfil(null), 4000);
      } else {
        setMensajePerfil({ tipo: 'error', texto: 'Ocurrió un error al actualizar tus datos.' });
      }
    } catch (error) {
      setMensajePerfil({ tipo: 'error', texto: 'Error de red. Verifica tu conexión.' });
    }
    setIsSubmitting(false);
  };

  // ========================================================
  // 🔐 MÓDULOS DE SEGURIDAD 2FA (NIP Y CORREO)
  // ========================================================

  const solicitarCodigoSeguridad = async (tipoFlujo) => {
    if (!clienteActivo.correo && !formData.correo) {
      const msg = 'Para usar opciones de seguridad, primero ingresa tu correo electrónico y haz clic en "Guardar Cambios".';
      if(tipoFlujo === 'nip') setMensajeNip({ tipo: 'error', texto: msg });
      else setMensajeCorreo({ tipo: 'error', texto: msg });
      return;
    }
    
    if(tipoFlujo === 'nip') { setFlujoNip('solicitando'); setMensajeNip(null); }
    else { setFlujoCorreo('solicitando'); setMensajeCorreo(null); }

    try {
      const res = await fetch(`${apiUrl}/clientes/solicitar-codigo-nip`, { // Reciclamos el mismo endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteActivo.id })
      });
      const data = await res.json();
      if (res.ok) {
        const successMsg = `¡Listo! Hemos enviado un código de 6 dígitos al correo: ${clienteActivo.correo || formData.correo}`;
        if(tipoFlujo === 'nip') { setFlujoNip('verificando'); setMensajeNip({ tipo: 'success', texto: successMsg }); }
        else { setFlujoCorreo('verificando'); setMensajeCorreo({ tipo: 'success', texto: successMsg }); }
      } else {
        if(tipoFlujo === 'nip') { setFlujoNip('inactivo'); setMensajeNip({ tipo: 'error', texto: data.error }); }
        else { setFlujoCorreo('inactivo'); setMensajeCorreo({ tipo: 'error', texto: data.error }); }
      }
    } catch (error) {
      if(tipoFlujo === 'nip') { setFlujoNip('inactivo'); setMensajeNip({ tipo: 'error', texto: 'Error de conexión.' }); }
      else { setFlujoCorreo('inactivo'); setMensajeCorreo({ tipo: 'error', texto: 'Error de conexión.' }); }
    }
  };

  const handleCambiarNip = async () => {
    setFlujoNip('solicitando');
    setMensajeNip(null);
    try {
      const res = await fetch(`${apiUrl}/clientes/cambiar-nip-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteActivo.id, codigo: codigoVerificacion, nuevoNip: nuevoNip })
      });
      const data = await res.json();
      if (res.ok) {
        setFlujoNip('inactivo'); setCodigoVerificacion(''); setNuevoNip('');
        setMensajeNip({ tipo: 'success', texto: '¡Tu NIP de seguridad fue actualizado correctamente!' });
        setTimeout(() => setMensajeNip(null), 6000);
      } else {
        setFlujoNip('verificando');
        setMensajeNip({ tipo: 'error', texto: data.error || 'El código es incorrecto o ya expiró.' });
      }
    } catch (error) {
      setFlujoNip('verificando'); setMensajeNip({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  const handleCambiarCorreo = async () => {
    setFlujoCorreo('solicitando');
    setMensajeCorreo(null);
    try {
      const res = await fetch(`${apiUrl}/clientes/cambiar-correo-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteActivo.id, codigo: codigoVerificacionCorreo, nuevoCorreo: nuevoCorreo })
      });
      const data = await res.json();
      if (res.ok) {
        setFlujoCorreo('inactivo'); setCodigoVerificacionCorreo(''); setNuevoCorreo('');
        setMensajeCorreo({ tipo: 'success', texto: '¡Tu correo fue actualizado correctamente!' });
        
        // Actualizamos el contexto visual de inmediato
        setFormData(prev => ({ ...prev, correo: nuevoCorreo }));
        clienteActivo.correo = nuevoCorreo; 

        setTimeout(() => setMensajeCorreo(null), 6000);
      } else {
        setFlujoCorreo('verificando');
        setMensajeCorreo({ tipo: 'error', texto: data.error || 'El código es incorrecto o ya expiró.' });
      }
    } catch (error) {
      setFlujoCorreo('verificando'); setMensajeCorreo({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  const renderStatusBadge = (estado) => {
    const styles = {
      'Pendiente': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Preparando': 'bg-orange-100 text-orange-700 border-orange-200',
      'En Camino': 'bg-purple-100 text-purple-700 border-purple-200',
      'Entregado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Cancelado': 'bg-red-100 text-red-700 border-red-200'
    };
    return (
      <span className={`px-3 py-1 border rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest ${styles[estado] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {estado}
      </span>
    );
  };

  const renderListaPedidos = (lista, vacioMensaje) => {
    if (lista.length === 0) {
      return <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm"><p className="text-slate-400 font-bold text-lg">{vacioMensaje}</p></div>;
    }

    return (
      <div className="space-y-4">
        {lista.map(p => (
          <div key={p.id} className="bg-white p-5 sm:p-6 rounded-[24px] shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-md transition-shadow gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <p className="text-xl sm:text-2xl font-black text-slate-800">Orden #{p.numero_pedido}</p>
                {renderStatusBadge(p.estado_preparacion)}
              </div>
              <p className="text-sm text-slate-500 font-medium mb-1">
                {new Date(p.created_at || new Date()).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })} • {p.tipo_consumo}
              </p>
              <p className="text-slate-500 font-medium">Total: <span className="font-black text-blue-600 text-lg">${Number(p.total).toFixed(2)}</span></p>
            </div>
            
            <div className="w-full sm:w-auto">
              {p.estado_preparacion === 'Pendiente' ? (
                <button onClick={() => modificarPedido(p)} className="w-full sm:w-auto bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-black hover:bg-orange-500 hover:text-white transition active:scale-95 shadow-sm">
                  ✏️ Modificar
                </button> 
              ) : p.estado_preparacion === 'Entregado' ? (
                <div className="w-full sm:w-auto bg-emerald-50 text-emerald-600 px-6 py-3 rounded-xl font-black flex items-center justify-center gap-2 border border-emerald-100">
                  <CheckCircle2 size={18} /> Entregado
                </div>
              ) : (
                <div className="w-full sm:w-auto bg-slate-50 text-slate-500 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-100">
                  <span>En proceso 👩‍🍳</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!clienteActivo) return null;

  return (
    <div className="max-w-5xl mx-auto mt-6 sm:mt-10 animate-in fade-in pb-12 px-2">
      
      {/* HEADER DE BIENVENIDA Y PUNTOS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 sm:p-8 rounded-[32px] shadow-sm border border-slate-200">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">¡Hola, {clienteActivo.nombre}! 👋</h2>
          <p className="text-slate-500 font-medium text-lg mt-1">Este es tu espacio personal.</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center gap-4 w-full md:w-auto transform transition hover:scale-105">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm"><Award size={32} /></div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-100">Monedero Activo</p>
            <p className="text-2xl font-black">{clienteActivo.puntos} Puntos</p>
            <p className="text-sm font-medium text-blue-100">Equivale a ${(clienteActivo.puntos * (configGlobal?.puntos_valor_peso || 1)).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* MENÚ DE PESTAÑAS Y NUEVA ORDEN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex bg-slate-200/60 p-1.5 rounded-[20px] w-full sm:w-auto overflow-x-auto custom-scrollbar">
          <button onClick={() => setTab('activas')} className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2 whitespace-nowrap ${tab === 'activas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <ShoppingBag size={18} /> Activas ({pedidosActivos.length})
          </button>
          <button onClick={() => setTab('finalizadas')} className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2 whitespace-nowrap ${tab === 'finalizadas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <CheckCircle2 size={18} /> Historial
          </button>
          <button onClick={() => setTab('perfil')} className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2 whitespace-nowrap ${tab === 'perfil' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <User size={18} /> Mis Datos
          </button>
        </div>
        <button onClick={() => setPantallaActual('menu')} className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition active:scale-95 flex items-center justify-center gap-2">
          Nueva Orden 🍔
        </button>
      </div>

      {/* VISTAS DINÁMICAS */}
      <div className="animate-in slide-in-from-bottom-4 duration-300">
        {tab === 'activas' && renderListaPedidos(pedidosActivos, "No tienes órdenes activas en este momento.")}
        
        {tab === 'finalizadas' && renderListaPedidos(pedidosFinalizados, "Aún no tienes un historial de órdenes finalizadas.")}

        {tab === 'perfil' && (
          <form onSubmit={actualizarPerfil} className="bg-white p-6 sm:p-10 rounded-[32px] shadow-sm border border-slate-200">
            
            {/* SECCIÓN 1: DATOS PERSONALES */}
            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-800">Tus Datos Personales</h3>
              <p className="text-slate-500 font-medium">Mantén tu perfil actualizado para recibir tus pedidos sin problemas.</p>
            </div>

            {mensajePerfil && (
              <div className={`p-4 rounded-2xl mb-8 border font-bold flex items-center gap-3 ${mensajePerfil.tipo === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {mensajePerfil.tipo === 'success' ? <CheckCircle2 size={24}/> : null}
                {mensajePerfil.texto}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DATOS BLOQUEADOS (No editables directamente) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Phone size={14}/> Celular (Fijo)</label>
                <input disabled type="text" value={clienteActivo.telefono || ''} className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-slate-500 font-bold opacity-70 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Award size={14}/> Puntos Actuales</label>
                <input disabled type="text" value={`${clienteActivo.puntos} PTS`} className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-emerald-600 font-black opacity-70 cursor-not-allowed" />
              </div>

              {/* DATOS EDITABLES */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><User size={14}/> Nombre *</label>
                <input required disabled={isSubmitting} type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-bold focus:border-blue-500 outline-none transition" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><User size={14}/> Apellido *</label>
                <input required disabled={isSubmitting} type="text" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-bold focus:border-blue-500 outline-none transition" />
              </div>
              
              {/* 👇 CORREO ELECTRÓNICO (Bloqueado si ya existe, forzando uso de 2FA) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1"><Mail size={14}/> Correo Electrónico *</div>
                  {clienteActivo.correo && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-black uppercase flex items-center gap-1 border border-emerald-200">
                      Verificado <CheckCircle2 size={10} />
                    </span>
                  )}
                </label>
                <input 
                  required 
                  disabled={!!clienteActivo.correo || isSubmitting} 
                  type="email" 
                  value={formData.correo} 
                  onChange={e => setFormData({...formData, correo: e.target.value})} 
                  className={`w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-bold outline-none transition ${clienteActivo.correo ? 'opacity-70 cursor-not-allowed' : 'focus:border-blue-500'}`} 
                  placeholder="tucorreo@ejemplo.com"
                />
                {clienteActivo.correo && (
                  <p className="text-[10px] text-slate-400 font-bold ml-1">🔒 Para cambiar tu correo, usa las opciones de seguridad abajo.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={14}/> Nacimiento (Año, Mes, Día)</label>
                <div className="flex gap-2">
                  <input disabled={isSubmitting} type="text" maxLength="4" placeholder="AAAA" value={formData.anio} onChange={e => setFormData({...formData, anio: e.target.value.replace(/\D/g, '')})} className="w-1/2 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-bold focus:border-blue-500 outline-none text-center transition" />
                  <input disabled={isSubmitting} type="text" maxLength="2" placeholder="MM" value={formData.mes} onChange={e => setFormData({...formData, mes: e.target.value.replace(/\D/g, '')})} className="w-1/4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-bold focus:border-blue-500 outline-none text-center transition" />
                  <input disabled={isSubmitting} type="text" maxLength="2" placeholder="DD" value={formData.dia} onChange={e => setFormData({...formData, dia: e.target.value.replace(/\D/g, '')})} className="w-1/4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-bold focus:border-blue-500 outline-none text-center transition" />
                </div>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><MapPin size={14}/> Dirección de Envío</label>
                <textarea disabled={isSubmitting} value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-bold focus:border-blue-500 outline-none transition h-24 resize-none" placeholder="Calle, número, colonia, referencias..."></textarea>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button disabled={isSubmitting} type="submit" className="w-full sm:w-auto bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={20} />
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios Personales'}
              </button>
            </div>
            
            {/* 👇 SECCIÓN 2: SEGURIDAD (FLUJO 2FA APPLE STYLE EXPANDIDO) */}
            <div className="space-y-4 pt-8 border-t border-slate-100 mt-8">
              <h4 className="text-lg font-black text-slate-800 flex items-center gap-2"><ShieldCheck size={20} className="text-blue-600"/> Seguridad de la Cuenta</h4>
              
              {/* MENSAJES DE ALERTA COMPARTIDOS PARA LA SECCIÓN DE SEGURIDAD */}
              {(mensajeNip || mensajeCorreo) && (
                <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 animate-in fade-in ${(mensajeNip?.tipo === 'success' || mensajeCorreo?.tipo === 'success') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {(mensajeNip?.tipo === 'success' || mensajeCorreo?.tipo === 'success') && <CheckCircle2 size={18}/>}
                  {mensajeNip?.texto || mensajeCorreo?.texto}
                </div>
              )}

              {/* BOTONES DE ACCIÓN (Se ocultan si algún flujo está activo) */}
              {flujoNip === 'inactivo' && flujoCorreo === 'inactivo' && (
                <div className="flex flex-col gap-3">
                  <button type="button" onClick={() => solicitarCodigoSeguridad('nip')} className="w-full sm:w-auto text-left bg-slate-100 text-slate-600 hover:bg-slate-200 font-black py-4 px-6 rounded-2xl transition-all active:scale-95 text-sm flex items-center gap-2">
                    <Lock size={16} className="text-blue-500" /> ¿Deseas cambiar o crear tu NIP de seguridad?
                  </button>
                  {clienteActivo.correo && (
                    <button type="button" onClick={() => solicitarCodigoSeguridad('correo')} className="w-full sm:w-auto text-left bg-slate-100 text-slate-600 hover:bg-slate-200 font-black py-4 px-6 rounded-2xl transition-all active:scale-95 text-sm flex items-center gap-2">
                      <Mail size={16} className="text-purple-500" /> ¿Deseas cambiar tu correo electrónico registrado?
                    </button>
                  )}
                </div>
              )}

              {/* CARGANDO (Compartido) */}
              {(flujoNip === 'solicitando' || flujoCorreo === 'solicitando') && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <p className="text-sm font-black text-slate-500 animate-pulse">Generando código de autorización...</p>
                </div>
              )}

              {/* FLUJO 2FA: CAMBIO DE NIP */}
              {flujoNip === 'verificando' && (
                <div className="bg-blue-50/50 p-6 md:p-8 rounded-[24px] border border-blue-100 animate-in zoom-in-95 shadow-inner">
                  <p className="text-sm font-medium text-slate-600 mb-6 leading-relaxed">
                    Ingresa el código de 6 dígitos que enviamos a <strong className="text-blue-600">{clienteActivo.correo || formData.correo}</strong> junto con tu nuevo NIP deseado.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Código de Seguridad</label>
                      <input type="text" maxLength="6" value={codigoVerificacion} onChange={e => setCodigoVerificacion(e.target.value.replace(/\D/g, ''))} className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-black tracking-[0.5em] text-center outline-none focus:border-blue-500 text-slate-800 text-xl" placeholder="000000" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nuevo NIP</label>
                      <input type="password" maxLength="4" value={nuevoNip} onChange={e => setNuevoNip(e.target.value.replace(/\D/g, ''))} className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-black tracking-[0.5em] text-center outline-none focus:border-blue-500 text-slate-800 text-xl" placeholder="••••" />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button type="button" onClick={() => { setFlujoNip('inactivo'); setMensajeNip(null); setCodigoVerificacion(''); setNuevoNip(''); }} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition shadow-sm">
                      Cancelar
                    </button>
                    <button type="button" onClick={handleCambiarNip} disabled={codigoVerificacion.length !== 6 || nuevoNip.length !== 4} className="flex-[2] py-4 bg-blue-600 text-white font-black shadow-lg shadow-blue-500/30 rounded-2xl hover:bg-blue-700 transition disabled:opacity-50 active:scale-95">
                      Confirmar Nuevo NIP
                    </button>
                  </div>
                </div>
              )}

              {/* 👇 FLUJO 2FA: CAMBIO DE CORREO */}
              {flujoCorreo === 'verificando' && (
                <div className="bg-purple-50/50 p-6 md:p-8 rounded-[24px] border border-purple-100 animate-in zoom-in-95 shadow-inner">
                  <p className="text-sm font-medium text-slate-600 mb-6 leading-relaxed">
                    Ingresa el código de 6 dígitos que enviamos a tu correo actual (<strong className="text-purple-600">{clienteActivo.correo}</strong>) junto con la nueva dirección de correo que deseas utilizar.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Código de Seguridad</label>
                      <input type="text" maxLength="6" value={codigoVerificacionCorreo} onChange={e => setCodigoVerificacionCorreo(e.target.value.replace(/\D/g, ''))} className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-black tracking-[0.5em] text-center outline-none focus:border-purple-500 text-slate-800 text-xl" placeholder="000000" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nuevo Correo Electrónico</label>
                      <input type="email" value={nuevoCorreo} onChange={e => setNuevoCorreo(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-bold text-center outline-none focus:border-purple-500 text-slate-800 text-lg" placeholder="nuevo@ejemplo.com" />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button type="button" onClick={() => { setFlujoCorreo('inactivo'); setMensajeCorreo(null); setCodigoVerificacionCorreo(''); setNuevoCorreo(''); }} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition shadow-sm">
                      Cancelar
                    </button>
                    <button type="button" onClick={handleCambiarCorreo} disabled={codigoVerificacionCorreo.length !== 6 || !nuevoCorreo.includes('@')} className="flex-[2] py-4 bg-purple-600 text-white font-black shadow-lg shadow-purple-500/30 rounded-2xl hover:bg-purple-700 transition disabled:opacity-50 active:scale-95">
                      Confirmar Nuevo Correo
                    </button>
                  </div>
                </div>
              )}
            </div>

          </form>
        )}
      </div>

    </div>
  );
};

export default MisPedidos;