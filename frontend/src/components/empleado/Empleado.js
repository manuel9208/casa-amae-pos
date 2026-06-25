import React, { useState, useEffect } from 'react';
import io from 'socket.io-client'; // 👈 IMPORTACIÓN DE SOCKETS
import { Calendar, Sparkles, Palmtree, LogOut, ArrowLeft, Camera, CheckCircle2, Utensils, XCircle, Send, AlertTriangle, MessageSquare, DollarSign } from 'lucide-react';
import VistaMensajesEmpleado from './VistaMensajesEmpleado';
import VistaNominasEmpleado from './VistaNominasEmpleado'; // 👈 IMPORTACIÓN DE NÓMINA

const diasSemanaMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const Empleado = ({ user, apiUrl, onLogout, onVolver }) => {
  const [vistaActiva, setVistaActiva] = useState('tareas');
  const [userData, setUserData] = useState(user);
  const [configGlobal, setConfigGlobal] = useState({});
  const [pedidosHoy, setPedidosHoy] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [vacMotivo, setVacMotivo] = useState('');
  const [diasSolicitados, setDiasSolicitados] = useState(0);
  const [vacacionesSeleccionadas, setVacacionesSeleccionadas] = useState([]);
  const [alertaUI, setAlertaUI] = useState(null);
  
  // 👇 TRIGGER PARA REFRESCAR LOS COMPONENTES HIJOS VÍA SOCKET
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const mostrarAlerta = (titulo, mensaje, tipo = 'info') => {
    setAlertaUI({ titulo, mensaje, tipo });
    setTimeout(() => setAlertaUI(null), 4000);
  };

  // 👇 AISLAMOS LA FUNCIÓN PARA QUE PUEDA SER LLAMADA POR EL SOCKET
  useEffect(() => {
    const cargarDatosCentrales = () => {
      fetch(`${apiUrl}/usuarios`).then(r => r.json()).then(data => {
        const myData = data.find(u => u.id === user.id);
        if (myData) setUserData(myData);
      }).catch(()=>{});

      fetch(`${apiUrl}/configuracion`).then(r => r.json()).then(data => {
        if (data) setConfigGlobal(data);
      }).catch(()=>{});

      fetch(`${apiUrl}/pedidos/hoy`).then(r => r.json()).then(data => {
        if (Array.isArray(data)) setPedidosHoy(data);
      }).catch(()=>{});
    };

    cargarDatosCentrales();
  }, [apiUrl, user.id, refreshTrigger]); // 👈 Si refreshTrigger cambia, se actualiza la data

  // 👇 CONEXIÓN A SOCKETS PARA ACTUALIZACIÓN EN VIVO
  useEffect(() => {
    if (!apiUrl) return;
    const socket = io(apiUrl.replace('/api', ''), { transports: ['websocket', 'polling'] });

    socket.on('nuevo_mensaje', (data) => {
      // Si el mensaje viene vacío (broadcast) o si es para este empleado específicamente
      if (!data || !data.empleado_id || String(data.empleado_id) === String(user.id)) {
          mostrarAlerta("📩 Tienes un Aviso", "Haz recibido un nuevo encargo / aviso de la administración.", "success");
          setRefreshTrigger(prev => prev + 1);
      }
    });

    socket.on('configuracion_actualizada', () => {
       setRefreshTrigger(prev => prev + 1);
    });

    socket.on('nomina_actualizada', () => {
       mostrarAlerta("💰 Recibo de Pago", "Tu recibo de nómina ha sido publicado. Puedes consultarlo en 'Mis Recibos'.", "success");
       setRefreshTrigger(prev => prev + 1);
    });

    return () => socket.disconnect();
  }, [apiUrl, user.id]);

  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = hoy.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const primerDiaMesIndex = new Date(year, month, 1).getDay();
  const espaciosBlancos = Array.from({ length: primerDiaMesIndex });
  const strHoy = `${year}-${String(month + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const diasMes = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    return { num: i + 1, nombreBreve: d.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase(), nombreCompleto: diasSemanaMap[d.getDay()], fechaStr, esHoy: fechaStr === strHoy };
  });

  const horarioSemanal = typeof userData.horario_semanal === 'string' ? JSON.parse(userData.horario_semanal || '{}') : (userData.horario_semanal || {});
  const prestaciones = typeof userData.prestaciones === 'string' ? JSON.parse(userData.prestaciones || '{}') : (userData.prestaciones || {});
  const horarioNegocio = typeof configGlobal.horarios_semana === 'string' ? JSON.parse(configGlobal.horarios_semana || '{}') : (configGlobal.horarios_semana || {});

  useEffect(() => {
    if (vacacionesSeleccionadas.length > 0) {
      let count = 0;
      vacacionesSeleccionadas.forEach(fechaStr => {
        const d = new Date(fechaStr + 'T12:00:00');
        const diaNombre = diasSemanaMap[d.getDay()];
        const diaConfig = horarioNegocio[diaNombre] || { activo: true }; 
        if (diaConfig.activo) count++;
      });
      setDiasSolicitados(count);
    } else {
      setDiasSolicitados(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacacionesSeleccionadas]);

  const diasTotales = Number(prestaciones.dias_vacaciones_disponibles) || 12;
  const diasUsados = Number(prestaciones.dias_vacaciones_usados) || 0;
  const diasRestantes = Math.max(0, diasTotales - diasUsados);
  const excedido = diasSolicitados > diasRestantes;

  const toggleDiaVacacion = (fechaStr) => {
    setVacacionesSeleccionadas(prev => {
      if (prev.includes(fechaStr)) return prev.filter(f => f !== fechaStr); 
      if (prev.length >= diasRestantes) {
        mostrarAlerta("Límite Alcanzado", "Ya no tienes más días de vacaciones disponibles para seleccionar.", "warning");
        return prev;
      }
      return [...prev, fechaStr].sort();
    });
  };

  const matriz = typeof configGlobal.matriz_limpieza === 'string' ? JSON.parse(configGlobal.matriz_limpieza || '{}') : (configGlobal.matriz_limpieza || {});
  const asignaciones = matriz.asignaciones || {};
  const evidencias = matriz.evidencias || {};
  
  const misLimpiezasHoy = [];
  Object.keys(asignaciones).forEach(area => {
    if (String(asignaciones[area][strHoy]) === String(userData.id)) {
      misLimpiezasHoy.push({ area, fecha: strHoy, foto: evidencias[area]?.[strHoy] || null });
    }
  });

  const subirEvidencia = async (area, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('evidencia', file); 
    formData.append('area', area);
    formData.append('fecha', strHoy);

    try {
      const res = await fetch(`${apiUrl}/configuracion/evidencia`, { 
        method: 'POST', 
        body: formData 
      });
      
      if (res.ok) { 
        const data = await res.json();
        setConfigGlobal(prev => ({ ...prev, matriz_limpieza: JSON.stringify(data.matriz) })); 
        mostrarAlerta("¡Éxito!", "Tu evidencia fue subida a la nube correctamente.", "success");
      } else {
        mostrarAlerta("Error", "No se pudo subir la foto.", "error");
      }
    } catch (err) {
      mostrarAlerta("Error", "Fallo de conexión con la nube.", "error");
    }
    setIsSubmitting(false);
  };

  const enviarSolicitudVacaciones = async (e) => {
    e.preventDefault();
    if (excedido) return mostrarAlerta("Límite Excedido", "Estás solicitando más días de los que tienes disponibles.", "error");
    if (diasSolicitados <= 0) return mostrarAlerta("Atención", "Por favor selecciona al menos un día laborable en el calendario.", "warning");

    setIsSubmitting(true);
    try {
      const pres = { ...prestaciones };
      pres.solicitud_vacaciones = {
        fechas: vacacionesSeleccionadas, 
        dias_solicitados: diasSolicitados,
        motivo: vacMotivo,
        estado: 'pendiente',
        fecha_solicitud: strHoy
      };

      const res = await fetch(`${apiUrl}/usuarios/${user.id}/prestaciones`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prestaciones: pres })
      });

      if (res.ok) {
        setUserData(prev => ({ ...prev, prestaciones: JSON.stringify(pres) }));
        mostrarAlerta("¡Enviado!", "Tu solicitud de vacaciones fue enviada a Recursos Humanos.", "success");
        setVacacionesSeleccionadas([]); setVacMotivo('');
      }
    } catch(err) { mostrarAlerta("Error", "Error de red al enviar solicitud.", "error"); }
    setIsSubmitting(false);
  };

  const limiteComedor = configGlobal.comedor_limite || 'ambos';
  let consumosPlatillos = 0; let consumosBebidas = 0;
  const catBebidas = typeof configGlobal.comedor_clasif_bebidas === 'string' ? JSON.parse(configGlobal.comedor_clasif_bebidas || '[]') : (configGlobal.comedor_clasif_bebidas || []);
  const catPlatillos = typeof configGlobal.comedor_clasif_platillos === 'string' ? JSON.parse(configGlobal.comedor_clasif_platillos || '[]') : (configGlobal.comedor_clasif_platillos || []);

  pedidosHoy.forEach(p => {
    if (p.metodo_pago === 'Comida Personal' && p.direccion_entrega && p.direccion_entrega.includes(userData.nombre)) {
      const car = typeof p.carrito === 'string' ? JSON.parse(p.carrito || '[]') : (p.carrito || []);
      car.forEach(item => {
        if (catBebidas.includes(item.categoria)) consumosBebidas += (item.cantidad || 1);
        if (catPlatillos.includes(item.categoria)) consumosPlatillos += (item.cantidad || 1);
      });
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 animate-in fade-in relative">
      
      {alertaUI && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] animate-in slide-in-from-top-4 fade-in duration-300 w-[90%] max-w-md">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-2 ${alertaUI.tipo === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : alertaUI.tipo === 'error' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-amber-50 border-amber-500 text-amber-800'}`}>
            {alertaUI.tipo === 'success' && <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />}
            {alertaUI.tipo === 'error' && <XCircle className="text-red-500 shrink-0" size={24} />}
            {alertaUI.tipo === 'warning' && <AlertTriangle className="text-amber-500 shrink-0" size={24} />}
            <div>
              <p className="font-black text-sm uppercase tracking-widest leading-none mb-1">{alertaUI.titulo}</p>
              <p className="font-bold text-sm opacity-80 leading-tight">{alertaUI.mensaje}</p>
            </div>
            <button onClick={() => setAlertaUI(null)} className="ml-auto opacity-50 hover:opacity-100 transition"><XCircle size={20}/></button>
          </div>
        </div>
      )}

      {/* NAVBAR SUPERIOR CON PRINT-HIDDEN */}
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md print-hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onVolver && <button onClick={onVolver} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition"><ArrowLeft size={20}/></button>}
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-blue-400 rounded-full flex items-center justify-center font-black text-xl shadow-lg border-2 border-slate-700">{userData.nombre.charAt(0).toUpperCase()}</div>
            <div>
              <p className="font-black leading-none text-lg">{userData.nombre}</p>
              <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mt-1">Portal del Empleado</p>
            </div>
          </div>
          <button onClick={onLogout} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-2 md:px-4 md:py-2 rounded-xl text-sm font-bold transition flex items-center gap-2"><span className="hidden md:inline">Cerrar Sesión</span> <LogOut size={16}/></button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-8 px-4">
        
        {/* TABS CON PRINT-HIDDEN */}
        <div className="flex bg-white p-2 rounded-3xl shadow-sm border border-slate-200 mb-8 overflow-x-auto custom-scrollbar print-hidden">
          <button onClick={() => setVistaActiva('tareas')} className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 min-w-[140px] ${vistaActiva === 'tareas' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Sparkles size={18}/> Mis Tareas</button>
          <button onClick={() => setVistaActiva('horarios')} className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 min-w-[140px] ${vistaActiva === 'horarios' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Calendar size={18}/> Mi Mes</button>
          <button onClick={() => setVistaActiva('vacaciones')} className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 min-w-[140px] ${vistaActiva === 'vacaciones' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Palmtree size={18}/> Vacaciones</button>
          <button onClick={() => setVistaActiva('mensajes')} className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 min-w-[140px] ${vistaActiva === 'mensajes' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><MessageSquare size={18}/> Mis Avisos</button>
          {/* 👇 NUEVA PESTAÑA: NÓMINA */}
          <button onClick={() => setVistaActiva('nomina')} className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 min-w-[140px] ${vistaActiva === 'nomina' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><DollarSign size={18}/> Mis Recibos</button>
        </div>

        <div className="bg-indigo-900 p-6 rounded-[32px] shadow-lg mb-8 text-white flex flex-col md:flex-row justify-between items-center gap-4 print-hidden">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-800 p-3 rounded-2xl"><Utensils size={28} className="text-indigo-400"/></div>
            <div>
              <p className="font-black text-xl">Tu Comedor de Hoy</p>
              <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest mt-1">Límite asignado: {limiteComedor.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className={`px-4 py-2 rounded-xl font-black text-center ${consumosPlatillos > 0 ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
              <p className="text-2xl">{consumosPlatillos}</p><p className="text-[10px] uppercase tracking-widest">Platillos Usados</p>
            </div>
            <div className={`px-4 py-2 rounded-xl font-black text-center ${consumosBebidas > 0 ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
              <p className="text-2xl">{consumosBebidas}</p><p className="text-[10px] uppercase tracking-widest">Bebidas Usadas</p>
            </div>
          </div>
        </div>

        {/* ======================= CONTENEDOR DE VISTAS ======================= */}
        {vistaActiva === 'tareas' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Sparkles className="text-teal-500"/> Zonas Asignadas a Mí (Hoy)</h3>
            {misLimpiezasHoy.length === 0 ? (
              <div className="bg-white p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200"><Sparkles size={64} className="mx-auto text-slate-300 mb-4" /><p className="text-xl font-black text-slate-500">No tienes áreas asignadas hoy</p><p className="text-sm font-medium text-slate-400 mt-2">¡Excelente turno!</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {misLimpiezasHoy.map((limp, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-1">Área a limpiar</p><p className="text-2xl font-black text-slate-800">{limp.area}</p></div>
                    {limp.foto ? (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-700">
                        <CheckCircle2 size={24} className="shrink-0"/>
                        <div>
                          <p className="font-black text-sm">Evidencia Subida</p>
                          <p className="text-xs font-medium opacity-80">El supervisor la validará pronto.</p>
                        </div>
                      </div>
                    ) : (
                      <label className={`w-full bg-teal-50 hover:bg-teal-100 text-teal-700 border-2 border-dashed border-teal-300 py-6 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Camera size={32}/>
                        <span className="font-black text-sm uppercase tracking-widest">Tomar Foto</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => subirEvidencia(limp.area, e)} disabled={isSubmitting}/>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {vistaActiva === 'horarios' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 bg-white p-6 rounded-[40px] shadow-sm border border-slate-200">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Calendar className="text-blue-500"/> Mis Turnos</h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left border-collapse min-w-max">
                <thead><tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100"><th className="p-4">Día</th><th className="p-4 text-center">Horario</th><th className="p-4 text-center">Estado</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {diasMes.map(d => {
                    const turno = horarioSemanal[d.fechaStr];
                    if (!turno || !turno.activo) return null;
                    return (
                      <tr key={d.fechaStr} className={`transition ${d.esHoy ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                        <td className="p-4 font-bold text-slate-700">{d.num} {d.nombreBreve} {d.esHoy && <span className="ml-2 bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-black">HOY</span>}</td>
                        <td className="p-4 text-center font-black text-slate-600">{turno.vacaciones ? '⛱️ VACACIONES' : `${turno.entrada} - ${turno.salida}`}</td>
                        <td className="p-4 text-center">
                          {turno.nomina_pagada ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase">Cobrado</span>
                          : turno.pagado ? <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-black uppercase">Auditado</span>
                          : <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-black uppercase">Pendiente</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {vistaActiva === 'vacaciones' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Palmtree className="text-amber-500"/> Solicitud de Vacaciones</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-3xl text-center shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Por Ley</p>
                <p className="text-3xl font-black text-slate-800">{diasTotales}</p>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-3xl text-center shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disfrutados</p>
                <p className="text-3xl font-black text-red-500">{diasUsados}</p>
              </div>
              <div className="bg-amber-500 border border-amber-600 p-4 rounded-3xl text-center shadow-md text-white">
                <p className="text-[10px] font-black text-amber-200 uppercase tracking-widest mb-1">Disponibles</p>
                <p className="text-3xl font-black">{diasRestantes}</p>
              </div>
            </div>

            {prestaciones.solicitud_vacaciones && prestaciones.solicitud_vacaciones.estado === 'pendiente' ? (
              <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl text-center shadow-sm">
                 <Palmtree size={48} className="mx-auto text-amber-500 mb-4 animate-bounce"/>
                 <h4 className="text-xl font-black text-amber-800">Solicitud en Revisión</h4>
                 <p className="text-sm font-bold text-amber-700/80 mt-2">Has solicitado <strong className="text-amber-600">{prestaciones.solicitud_vacaciones.dias_solicitados} días</strong> laborables. El administrador los evaluará pronto.</p>
              </div>
            ) : prestaciones.solicitud_vacaciones && prestaciones.solicitud_vacaciones.estado === 'rechazada' ? (
              <div className="bg-red-50 border border-red-200 p-8 rounded-3xl text-center shadow-sm relative">
                 <button onClick={() => {
                   const pres = {...prestaciones}; delete pres.solicitud_vacaciones;
                   fetch(`${apiUrl}/usuarios/${user.id}/prestaciones`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({prestaciones: pres}) }).then(() => setUserData({...userData, prestaciones: JSON.stringify(pres)}));
                 }} className="absolute top-4 right-4 bg-red-100 text-red-500 p-2 rounded-xl font-black text-xs hover:bg-red-500 hover:text-white transition">Nueva Solicitud</button>
                 <XCircle size={48} className="mx-auto text-red-500 mb-4"/>
                 <h4 className="text-xl font-black text-red-800">Solicitud Rechazada</h4>
                 <p className="text-sm font-bold text-red-700/80 mt-2">Tu última solicitud no fue aprobada. Consulta con tu administrador o envía una nueva.</p>
              </div>
            ) : (
              <form onSubmit={enviarSolicitudVacaciones} className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-200 space-y-6">
                
                <div className="text-center mb-6 border-b border-slate-100 pb-6">
                  <h4 className="font-black text-lg text-slate-800">Selecciona tus días de vacaciones</h4>
                  <p className="text-xs font-bold text-slate-400 mt-1">Haz clic en los días laborables que deseas tomar libres. (Los días grises el restaurante está cerrado).</p>
                </div>

                <div className="grid grid-cols-7 gap-2 md:gap-4 mb-6">
                  {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
                    <div key={d} className="text-center font-black text-[10px] md:text-xs text-slate-400 uppercase tracking-widest">{d}</div>
                  ))}
                  
                  {espaciosBlancos.map((_, i) => <div key={`blank-${i}`} className="p-2"></div>)}
                  
                  {diasMes.map(d => {
                    const diaConfig = horarioNegocio[d.nombreCompleto] || { activo: true };
                    const isClosed = !diaConfig.activo;
                    const isSelected = vacacionesSeleccionadas.includes(d.fechaStr);
                    const isPast = d.fechaStr < strHoy;

                    return (
                      <button
                        key={d.fechaStr}
                        type="button"
                        disabled={isClosed || isPast}
                        onClick={() => toggleDiaVacacion(d.fechaStr)}
                        className={`relative p-2 md:p-4 rounded-xl flex flex-col items-center justify-center transition-all border-2 aspect-square
                          ${isClosed || isPast ? 'bg-slate-50 border-transparent opacity-40 cursor-not-allowed' : 
                            isSelected ? 'bg-amber-500 border-amber-600 text-white shadow-md transform scale-105' : 
                            'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50'}`}
                      >
                        <span className={`font-black text-sm md:text-xl ${isClosed && !isPast ? 'text-slate-400' : ''}`}>{d.num}</span>
                        {isClosed && !isPast && <span className="text-[7px] md:text-[9px] font-black uppercase text-slate-400 mt-0.5">Cerrado</span>}
                      </button>
                    )
                  })}
                </div>

                {diasSolicitados > 0 && (
                  <div className={`p-4 rounded-xl font-bold flex items-center justify-between border ${excedido ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    <span className="flex items-center gap-2"><Calendar size={18}/> Días laborables a descontar de tu saldo:</span>
                    <span className="text-2xl font-black">{diasSolicitados}</span>
                  </div>
                )}

                <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mensaje Adicional</label><textarea required rows="2" value={vacMotivo} onChange={e=>setVacMotivo(e.target.value)} placeholder="Ej. Solicitud anual..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 resize-none"></textarea></div>
                
                <button type="submit" disabled={isSubmitting || excedido || diasSolicitados === 0 || diasRestantes === 0} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-lg py-4 rounded-xl flex justify-center items-center gap-2 transition active:scale-95 shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none">
                  <Send size={20}/> {excedido ? 'Saldo de vacaciones excedido' : diasRestantes === 0 ? 'No tienes vacaciones disponibles' : 'Enviar Solicitud a Recursos Humanos'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* 👇 VISTA CONECTADA CON REFRESH POR SOCKETS (USAMOS KEY) */}
        {vistaActiva === 'mensajes' && (
          <VistaMensajesEmpleado key={refreshTrigger} user={userData} apiUrl={apiUrl} />
        )}

        {/* 👇 NUEVA VISTA CONECTADA CON REFRESH POR SOCKETS (USAMOS KEY) */}
        {vistaActiva === 'nomina' && (
          <VistaNominasEmpleado key={refreshTrigger} user={userData} apiUrl={apiUrl} />
        )}

      </div>
    </div>
  );
};

export default Empleado;