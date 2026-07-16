import React, { useState, useEffect } from 'react';
import { Save, User, ShieldCheck, Clock, CheckCircle2, AlertTriangle, Scale, Coffee, Landmark, CalendarDays, PlusCircle, Trash2, Banknote, ClipboardCheck } from 'lucide-react';

const diasSemanaMap = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Utilidad para asegurar que los inputs de fecha siempre reciban "YYYY-MM-DD"
const formatoFechaSeguro = (fechaStr) => {
  if (!fechaStr) return '';
  try {
     return fechaStr.split('T')[0];
  } catch(e) {
     return '';
  }
};

const NominaConfig = ({ usuariosDB, apiUrl, refrescarDatos, showAlert }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global').sort((a, b) => a.nombre.localeCompare(b.nombre));

  // ==========================================
  // ESTADO: REGLAS GLOBALES (BONOS Y LEYES)
  // ==========================================
  const [reglasNomina, setReglasNomina] = useState({
    bono_limpieza_activo: false, bono_limpieza_monto: 0, limpieza_omisiones_permitidas: 0,
    bono_puntualidad_eventos_activo: false, bono_puntualidad_eventos_monto: 0, puntualidad_eventos_tolerancia_minutos: 15, puntualidad_eventos_retardos_permitidos: 0,
    bono_puntualidad_estricta_activo: false, bono_puntualidad_estricta_monto: 0, puntualidad_estricta_limite_minutos_semana: 15,
    // 👇 NUEVO: ESTADOS PARA BONO OBSERVACIONES
    bono_observaciones_activo: false, bono_observaciones_monto: 0, bono_observaciones_tolerancia: 0,
    descuento_descanso_activo: true, 
    prima_dominical_activa: true,
    retencion_isr_activa: false, porcentaje_isr: 0,
    retencion_imss_activa: false, porcentaje_imss: 0
  });

  // ==========================================
  // ESTADO: FICHA DEL EMPLEADO
  // ==========================================
  const [empleadoEditId, setEmpleadoEditId] = useState('');
  const [prestacionesEmp, setPrestacionesEmp] = useState({ 
    sueldo_base: 0, tipo_sueldo: 'Semanal', banco: '', cuenta: '', rfc: '', curp: '', nss: '', telefono: '', correo: '', 
    fecha_ingreso: '', fecha_nacimiento: '', nombre_completo: '', generar_nomina: false,
    dias_descanso: [], prima_vacacional: 25, dias_vacaciones_disponibles: 12, horas_extras_acumuladas: 0,
    limite_platillos: 1, limite_bebidas: 1,
    prestamos: [], bonos_recurrentes: []
  });

  // CARGAR REGLAS GLOBALES DESDE LA BASE DE DATOS
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/configuracion`);
        if (res.ok) {
          const data = await res.json();
          const matriz = typeof data.matriz_limpieza === 'string' ? JSON.parse(data.matriz_limpieza || '{}') : (data.matriz_limpieza || {});
          if (matriz.reglas_nomina) {
            setReglasNomina(prev => ({ ...prev, ...matriz.reglas_nomina }));
          }
        }
      } catch(e) { console.error("Error al cargar configuración", e); }
    };
    fetchConfig();
  }, [apiUrl]);

  // CARGAR FICHA FINANCIERA DEL EMPLEADO SELECCIONADO
  useEffect(() => {
    if (empleadoEditId) {
      const emp = usuariosDB.find(u => u.id === Number(empleadoEditId));
      if (emp) {
        const presParsed = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : (emp.prestaciones || {});
        let descansosArray = presParsed.dias_descanso || [];
        if (typeof presParsed.dia_descanso === 'string' && presParsed.dia_descanso !== 'Ninguno') descansosArray = [presParsed.dia_descanso];

        setPrestacionesEmp({
          sueldo_base: presParsed.sueldo_base || 0, 
          tipo_sueldo: presParsed.tipo_sueldo || 'Semanal', 
          banco: presParsed.banco || '', 
          cuenta: presParsed.cuenta || '',
          rfc: presParsed.rfc || '', 
          curp: presParsed.curp || '', 
          nss: presParsed.nss || '', 
          telefono: presParsed.telefono || emp.telefono || '',
          correo: presParsed.correo || '', 
          fecha_ingreso: formatoFechaSeguro(presParsed.fecha_ingreso), 
          fecha_nacimiento: formatoFechaSeguro(presParsed.fecha_nacimiento), 
          nombre_completo: presParsed.nombre_completo || '', 
          generar_nomina: presParsed.generar_nomina !== undefined ? presParsed.generar_nomina : false,
          dias_descanso: descansosArray,
          prima_vacacional: presParsed.prima_vacacional !== undefined ? presParsed.prima_vacacional : 25,
          dias_vacaciones_disponibles: presParsed.dias_vacaciones_disponibles !== undefined ? presParsed.dias_vacaciones_disponibles : 12,
          horas_extras_acumuladas: presParsed.horas_extras_acumuladas !== undefined ? presParsed.horas_extras_acumuladas : 0,
          limite_platillos: presParsed.limite_platillos !== undefined ? presParsed.limite_platillos : 1,
          limite_bebidas: presParsed.limite_bebidas !== undefined ? presParsed.limite_bebidas : 1,
          prestamos: presParsed.prestamos || [],
          bonos_recurrentes: presParsed.bonos_recurrentes || []
        });
      }
    } else {
      setPrestacionesEmp({ 
        sueldo_base: 0, tipo_sueldo: 'Semanal', banco: '', cuenta: '', rfc: '', curp: '', nss: '', telefono: '', correo: '', 
        fecha_ingreso: '', fecha_nacimiento: '', nombre_completo: '', generar_nomina: false, dias_descanso: [], 
        prima_vacacional: 25, dias_vacaciones_disponibles: 12, horas_extras_acumuladas: 0, limite_platillos: 1, limite_bebidas: 1, prestamos: [], bonos_recurrentes: [] 
      });
    }
  }, [empleadoEditId, usuariosDB]);

  // ==========================================
  // VALIDACIÓN DE DATOS OBLIGATORIOS PARA NÓMINA
  // ==========================================
  const manejarToggleGenerarNomina = (checked) => {
      if (checked) {
          if (!prestacionesEmp.nombre_completo.trim() || !prestacionesEmp.fecha_ingreso || !prestacionesEmp.sueldo_base || prestacionesEmp.sueldo_base <= 0) {
              showAlert("Faltan Datos", "Para automatizar la nómina es obligatorio guardar primero: Nombre Completo, Fecha de Ingreso y Sueldo Base.", "warning");
              return;
          }
      }
      setPrestacionesEmp({...prestacionesEmp, generar_nomina: checked});
  };

  const toggleDiaDescanso = (dia) => {
    setPrestacionesEmp(prev => {
      const activos = prev.dias_descanso || [];
      if (activos.includes(dia)) return { ...prev, dias_descanso: activos.filter(d => d !== dia) };
      return { ...prev, dias_descanso: [...activos, dia] };
    });
  };

  // MANEJADORES DE PRÉSTAMOS
  const agregarPrestamo = () => {
    setPrestacionesEmp(prev => ({
      ...prev, prestamos: [...prev.prestamos, { id: Date.now(), concepto: '', monto_total: 0, saldo_restante: 0, descuento_por_nomina: 0, activo: true }]
    }));
  };
  const actualizarPrestamo = (id, campo, valor) => {
    setPrestacionesEmp(prev => ({
      ...prev, prestamos: prev.prestamos.map(p => p.id === id ? { ...p, [campo]: valor } : p)
    }));
  };
  const eliminarPrestamo = (id) => {
    setPrestacionesEmp(prev => ({ ...prev, prestamos: prev.prestamos.filter(p => p.id !== id) }));
  };

  // MANEJADORES DE BONOS RECURRENTES
  const agregarBonoRecurrente = () => {
    setPrestacionesEmp(prev => ({
      ...prev, bonos_recurrentes: [...prev.bonos_recurrentes, { id: Date.now(), concepto: '', monto: 0, tipo: 'bono', fecha_inicio: '', fecha_fin: '', activo: true }]
    }));
  };
  const actualizarBonoRecurrente = (id, campo, valor) => {
    setPrestacionesEmp(prev => ({
      ...prev, bonos_recurrentes: prev.bonos_recurrentes.map(b => b.id === id ? { ...b, [campo]: valor } : b)
    }));
  };
  const eliminarBonoRecurrente = (id) => {
    setPrestacionesEmp(prev => ({ ...prev, bonos_recurrentes: prev.bonos_recurrentes.filter(b => b.id !== id) }));
  };

  const guardarReglasGlobales = async (e) => {
    e.preventDefault(); 
    setIsSubmitting(true);
    try {
      const resConfig = await fetch(`${apiUrl}/configuracion`);
      let matrizActual = {};
      
      if (resConfig.ok) {
        const dataConfig = await resConfig.json();
        matrizActual = typeof dataConfig.matriz_limpieza === 'string' ? JSON.parse(dataConfig.matriz_limpieza || '{}') : (dataConfig.matriz_limpieza || {});
      }
      
      matrizActual.reglas_nomina = reglasNomina;
      
      const formData = new FormData(); 
      formData.append('matriz_limpieza', JSON.stringify(matrizActual));
      
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) {
        showAlert('Éxito', 'Las políticas laborales y bonos se guardaron correctamente en la BD.', 'success');
      }
    } catch(e) { 
      showAlert('Error', 'Fallo de conexión al guardar políticas.', 'error'); 
    }
    setIsSubmitting(false);
  };

  const guardarPrestacionesEmpleado = async (e) => {
    e.preventDefault(); 
    if (!empleadoEditId) return; 

    // Bloqueo de seguridad final
    if (prestacionesEmp.generar_nomina) {
        if (!prestacionesEmp.nombre_completo.trim() || !prestacionesEmp.fecha_ingreso || !prestacionesEmp.sueldo_base || prestacionesEmp.sueldo_base <= 0) {
            showAlert("Error", "Faltan datos obligatorios para habilitar el motor de nómina.", "error");
            return;
        }
    }

    setIsSubmitting(true);
    try {
      // Sincronizar saldo de prestamo nuevo (al crear, saldo restante = monto total)
      const prestamosValidados = prestacionesEmp.prestamos.map(p => {
        if (p.saldo_restante === 0 && p.monto_total > 0 && p.activo) return { ...p, saldo_restante: p.monto_total };
        return p;
      });
      const payload = { ...prestacionesEmp, prestamos: prestamosValidados };

      const res = await fetch(`${apiUrl}/usuarios/${empleadoEditId}/prestaciones`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prestaciones: payload })
      });
      if (res.ok) { 
        showAlert('Éxito', 'Ficha del empleado guardada correctamente.', 'success'); 
        refrescarDatos(); 
      }
    } catch(e) { 
      showAlert('Error', 'Fallo de conexión.', 'error'); 
    }
    setIsSubmitting(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start animate-in fade-in pb-12">
      
      {/* ==================================================== */}
      {/* 1. SECCIÓN: POLÍTICAS GLOBALES (REGLAS Y SANCIONES)  */}
      {/* ==================================================== */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <ShieldCheck className="text-emerald-500" size={32}/>
          <div>
            <h3 className="text-2xl font-black text-slate-800">Políticas Generales</h3>
            <p className="text-sm font-bold text-slate-400">Estas reglas afectan a todos al calcular la nómina.</p>
          </div>
        </div>

        <form onSubmit={guardarReglasGlobales} className="space-y-6">
          
          {/* LEY: FALTAS Y DESCANSO PROPORCIONAL */}
          <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.descuento_descanso_activo ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-black text-slate-800 flex items-center gap-2"><Scale className="text-red-500" size={18}/> Castigo por Faltas Injustificadas</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Aplica descuento proporcional al día de descanso (Ley 1/6).</p>
              </div>
              <button type="button" onClick={() => setReglasNomina({...reglasNomina, descuento_descanso_activo: !reglasNomina.descuento_descanso_activo})} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition shrink-0 ${reglasNomina.descuento_descanso_activo ? 'bg-red-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                {reglasNomina.descuento_descanso_activo ? 'Estricto' : 'Perdonar'}
              </button>
            </div>
            {reglasNomina.descuento_descanso_activo ? (
              <p className="text-xs font-medium text-red-700 mt-2">Si el empleado falta injustificadamente, se le descontará ese día <b>Y la parte proporcional</b> de su día de descanso pagado.</p>
            ) : (
              <p className="text-xs font-medium text-slate-600 mt-2">Solo se descontará el día exacto que el empleado faltó. El pago de su día de descanso se mantendrá íntegro.</p>
            )}
          </div>

          {/* LEY: PRIMA DOMINICAL */}
          <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.prima_dominical_activa ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-black text-slate-800 flex items-center gap-2"><CalendarDays className="text-orange-500" size={18}/> Prima Dominical</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Pago del 25% extra sobre el sueldo de ese día (Art. 71 LFT).</p>
              </div>
              <button type="button" onClick={() => setReglasNomina({...reglasNomina, prima_dominical_activa: !reglasNomina.prima_dominical_activa})} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition shrink-0 ${reglasNomina.prima_dominical_activa ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                {reglasNomina.prima_dominical_activa ? 'Activada' : 'Desactivada'}
              </button>
            </div>
            {reglasNomina.prima_dominical_activa ? (
              <p className="text-xs font-medium text-orange-800 mt-2">Si el sistema detecta que un empleado checó asistencia un domingo, automáticamente le añadirá el 25% extra en su recibo.</p>
            ) : (
              <p className="text-xs font-medium text-slate-600 mt-2">Los domingos se pagarán como un día ordinario normal.</p>
            )}
          </div>

          {/* LEY: IMPUESTOS Y DEDUCCIONES (ISR E IMSS) */}
          <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50">
             <h4 className="font-black text-slate-800 flex items-center gap-2 mb-4"><Landmark className="text-slate-500" size={18}/> Retenciones Fiscales (Fijas)</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer mb-2">
                     <input type="checkbox" checked={reglasNomina.retencion_isr_activa} onChange={e => setReglasNomina({...reglasNomina, retencion_isr_activa: e.target.checked})} className="w-5 h-5 accent-blue-600" />
                     Descontar ISR
                   </label>
                   {reglasNomina.retencion_isr_activa && (
                      <div className="flex items-center gap-2">
                         <input type="number" step="0.01" value={reglasNomina.porcentaje_isr} onChange={e => setReglasNomina({...reglasNomina, porcentaje_isr: Number(e.target.value)})} className="w-20 p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-center outline-none focus:border-blue-500" />
                         <span className="text-xs font-bold text-slate-500">% Fijo (Aprox. por contador)</span>
                      </div>
                   )}
                </div>
                <div>
                   <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer mb-2">
                     <input type="checkbox" checked={reglasNomina.retencion_imss_activa} onChange={e => setReglasNomina({...reglasNomina, retencion_imss_activa: e.target.checked})} className="w-5 h-5 accent-emerald-600" />
                     Descontar IMSS (Cuota)
                   </label>
                   {reglasNomina.retencion_imss_activa && (
                      <div className="flex items-center gap-2">
                         <input type="number" step="0.01" value={reglasNomina.porcentaje_imss} onChange={e => setReglasNomina({...reglasNomina, porcentaje_imss: Number(e.target.value)})} className="w-20 p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-center outline-none focus:border-emerald-500" />
                         <span className="text-xs font-bold text-slate-500">% (Suele ser ~2.5%)</span>
                      </div>
                   )}
                </div>
             </div>
          </div>

          <div className="border-t border-slate-200 my-6"></div>

          {/* 👇 NUEVA LEY: BONO DE OBSERVACIONES GENERALES */}
          <div className={`p-5 rounded-2xl border-2 transition-all mb-6 ${reglasNomina.bono_observaciones_activo ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-black text-slate-800 flex items-center gap-2"><ClipboardCheck className="text-indigo-500" size={18}/> Bono por Observaciones (Comportamiento)</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Recompensa el cumplimiento de reglas (Uniforme, celular, actitud).</p>
              </div>
              <button type="button" onClick={() => setReglasNomina({...reglasNomina, bono_observaciones_activo: !reglasNomina.bono_observaciones_activo})} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition shrink-0 ${reglasNomina.bono_observaciones_activo ? 'bg-indigo-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                {reglasNomina.bono_observaciones_activo ? 'Activado' : 'Apagado'}
              </button>
            </div>
            
            {reglasNomina.bono_observaciones_activo && (
              <div className="grid grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block mb-2">Monto del Bono ($)</label>
                  <input type="number" min="0" value={reglasNomina.bono_observaciones_monto || ''} onChange={e => setReglasNomina({...reglasNomina, bono_observaciones_monto: Number(e.target.value)})} placeholder="Ej. 100" className="w-full bg-white border border-indigo-200 rounded-xl p-3 font-black text-indigo-900 outline-none text-center shadow-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block mb-2">Tolerancia (Fallas perdonadas)</label>
                  <input type="number" min="0" value={reglasNomina.bono_observaciones_tolerancia || 0} onChange={e => setReglasNomina({...reglasNomina, bono_observaciones_tolerancia: Number(e.target.value)})} className="w-full bg-white border border-indigo-200 rounded-xl p-3 font-black text-indigo-900 outline-none text-center shadow-sm" />
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-indigo-600 font-bold">Si el empleado acumula más de <b>{reglasNomina.bono_observaciones_tolerancia || 0}</b> observaciones negativas (NO), perderá este bono automáticamente.</p>
                </div>
              </div>
            )}
          </div>

          {/* BONO 1: LIMPIEZA */}
          <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.bono_limpieza_activo ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-black text-slate-800 flex items-center gap-2">🧹 Bono de Limpieza</h4>
              <button type="button" onClick={() => setReglasNomina({...reglasNomina, bono_limpieza_activo: !reglasNomina.bono_limpieza_activo})} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition ${reglasNomina.bono_limpieza_activo ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                {reglasNomina.bono_limpieza_activo ? 'Activado' : 'Desactivado'}
              </button>
            </div>
            {reglasNomina.bono_limpieza_activo && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <div>
                  <label className="text-xs font-bold text-slate-500">Monto del Bono ($)</label>
                  <input type="number" value={reglasNomina.bono_limpieza_monto} onChange={e => setReglasNomina({...reglasNomina, bono_limpieza_monto: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Fallas Perdonadas</label>
                  <input type="number" value={reglasNomina.limpieza_omisiones_permitidas} onChange={e => setReglasNomina({...reglasNomina, limpieza_omisiones_permitidas: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-emerald-500" />
                </div>
              </div>
            )}
          </div>

          {/* BONO 2: PUNTUALIDAD CLÁSICA */}
          <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.bono_puntualidad_eventos_activo ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-black text-slate-800 flex items-center gap-2"><Clock className="text-blue-500" size={18}/> Bono Puntualidad Clásica</h4>
              <button type="button" onClick={() => setReglasNomina({...reglasNomina, bono_puntualidad_eventos_activo: !reglasNomina.bono_puntualidad_eventos_activo})} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition ${reglasNomina.bono_puntualidad_eventos_activo ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                {reglasNomina.bono_puntualidad_eventos_activo ? 'Activado' : 'Desactivado'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-wider">Castiga por la CANTIDAD de veces que llegó tarde.</p>
            {reglasNomina.bono_puntualidad_eventos_activo && (
              <div className="grid grid-cols-3 gap-4 animate-in fade-in">
                <div>
                  <label className="text-xs font-bold text-slate-500">Monto ($)</label>
                  <input type="number" value={reglasNomina.bono_puntualidad_eventos_monto} onChange={e => setReglasNomina({...reglasNomina, bono_puntualidad_eventos_monto: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Tolerancia (Min)</label>
                  <input type="number" value={reglasNomina.puntualidad_eventos_tolerancia_minutos} onChange={e => setReglasNomina({...reglasNomina, puntualidad_eventos_tolerancia_minutos: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Tardanzas Permitidas</label>
                  <input type="number" value={reglasNomina.puntualidad_eventos_retardos_permitidos} onChange={e => setReglasNomina({...reglasNomina, puntualidad_eventos_retardos_permitidos: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-blue-500" />
                </div>
              </div>
            )}
          </div>

          {/* BONO 3: PUNTUALIDAD ESTRICTA */}
          <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.bono_puntualidad_estricta_activo ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-black text-slate-800 flex items-center gap-2"><AlertTriangle className="text-orange-500" size={18}/> Bono Puntualidad Estricta</h4>
              <button type="button" onClick={() => setReglasNomina({...reglasNomina, bono_puntualidad_estricta_activo: !reglasNomina.bono_puntualidad_estricta_activo})} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition shrink-0 ${reglasNomina.bono_puntualidad_estricta_activo ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                {reglasNomina.bono_puntualidad_estricta_activo ? 'Activado' : 'Desactivado'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-wider">Suma todos los minutos tarde de la semana.</p>
            {reglasNomina.bono_puntualidad_estricta_activo && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <div>
                  <label className="text-xs font-bold text-slate-500">Monto del Bono ($)</label>
                  <input type="number" value={reglasNomina.bono_puntualidad_estricta_monto} onChange={e => setReglasNomina({...reglasNomina, bono_puntualidad_estricta_monto: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Límite Global Semanal (Minutos)</label>
                  <input type="number" value={reglasNomina.puntualidad_estricta_limite_minutos_semana} onChange={e => setReglasNomina({...reglasNomina, puntualidad_estricta_limite_minutos_semana: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-orange-500" />
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition shadow-lg active:scale-95">
            <Save size={20} /> Guardar Políticas Generales
          </button>
        </form>
      </div>

      {/* ==================================================== */}
      {/* 2. SECCIÓN: FICHA FINANCIERA Y GESTIÓN DEL EMPLEADO  */}
      {/* ==================================================== */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <User className="text-blue-500" size={32}/>
          <div>
            <h3 className="text-2xl font-black text-slate-800">Ficha Financiera</h3>
            <p className="text-sm font-bold text-slate-400">Selecciona un empleado para ajustar sueldos, préstamos y bonos.</p>
          </div>
        </div>

        <select value={empleadoEditId} onChange={(e) => setEmpleadoEditId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black text-slate-700 outline-none mb-6 focus:border-blue-500 transition-colors shadow-sm">
          <option value="">-- Selecciona un Empleado --</option>
          {empleadosVisibles.map(e => (
            <option key={e.id} value={e.id}>{e.nombre} ({e.rol})</option>
          ))}
        </select>

        {empleadoEditId && (
          <form onSubmit={guardarPrestacionesEmpleado} className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
              <span className="font-black text-blue-800">¿Generar nómina automática?</span>
              <input type="checkbox" checked={prestacionesEmp.generar_nomina} onChange={(e) => manejarToggleGenerarNomina(e.target.checked)} className="w-6 h-6 accent-blue-600 rounded-md cursor-pointer" />
            </div>

            {/* SUELDO Y FRECUENCIA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Sueldo Base ($)</label>
                <input type="number" required value={prestacionesEmp.sueldo_base} onChange={e => setPrestacionesEmp({...prestacionesEmp, sueldo_base: Number(e.target.value)})} className="w-full bg-white border border-slate-300 rounded-xl p-3 font-black focus:border-blue-500 outline-none transition-colors" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Frecuencia (Base)</label>
                <select value={prestacionesEmp.tipo_sueldo} onChange={e => setPrestacionesEmp({...prestacionesEmp, tipo_sueldo: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl p-3 font-black outline-none focus:border-blue-500 transition-colors cursor-pointer">
                  <option value="Semanal">Semanal (Normal)</option>
                  <option value="Quincenal">Quincenal (Normal)</option>
                  <option value="Mensual">Mensual (Normal)</option>
                  <option value="Diario">Diario (Paga por día exacto)</option>
                  <option value="Por Hora">Por Hora (Medio turno/Eventual)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] font-bold text-slate-500 leading-tight">💡 Nota: El sistema convertirá esto a un <b>Sueldo Diario Exacto</b> invisiblemente para calcular de forma proporcional si faltan, o si la nómina se cobra antes de tiempo.</p>
              </div>
            </div>

            {/* ANTIGÜEDAD, VACACIONES Y BANCO DE HORAS */}
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
               <h4 className="font-black text-emerald-900 flex items-center gap-2 mb-3 text-sm"><CalendarDays size={16}/> Fechas, Vacaciones y Banco de Horas</h4>
               <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-700 uppercase">Ingreso</label>
                    <input type="date" value={prestacionesEmp.fecha_ingreso} onChange={e => setPrestacionesEmp({...prestacionesEmp, fecha_ingreso: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-xl p-2.5 font-bold text-emerald-900 outline-none text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-700 uppercase">Cumpleaños</label>
                    <input type="date" value={prestacionesEmp.fecha_nacimiento} onChange={e => setPrestacionesEmp({...prestacionesEmp, fecha_nacimiento: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-xl p-2.5 font-bold text-emerald-900 outline-none text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-700 uppercase leading-tight block truncate" title="Base: 12 días primer año">Días Vac.</label>
                    <input type="number" min="0" required value={prestacionesEmp.dias_vacaciones_disponibles} onChange={e => setPrestacionesEmp({...prestacionesEmp, dias_vacaciones_disponibles: Number(e.target.value)})} className="w-full bg-white border border-emerald-200 rounded-xl p-2.5 font-black text-center text-emerald-900 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-700 uppercase truncate block">Prima Vac. (%)</label>
                    <input type="number" min="25" required value={prestacionesEmp.prima_vacacional} onChange={e => setPrestacionesEmp({...prestacionesEmp, prima_vacacional: Number(e.target.value)})} className="w-full bg-white border border-emerald-200 rounded-xl p-2.5 font-black text-center text-emerald-900 outline-none text-sm" />
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase truncate block">Hrs Extra</label>
                    <input type="number" step="0.01" min="0" value={prestacionesEmp.horas_extras_acumuladas} onChange={e => setPrestacionesEmp({...prestacionesEmp, horas_extras_acumuladas: Number(e.target.value)})} className="w-full bg-emerald-100 border border-emerald-300 rounded-xl p-2.5 font-black text-center text-emerald-900 outline-none text-sm" />
                  </div>
               </div>
               <p className="text-[10px] text-emerald-600 mt-2 leading-tight font-bold">Las horas extras que decidas acumular se sumarán aquí automáticamente.</p>
            </div>

            {/* LIMITES DE COMEDOR (PRESTACIÓN) */}
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
               <h4 className="font-black text-orange-900 flex items-center gap-2 mb-3 text-sm"><Coffee size={16}/> Comida Personal (Prestación)</h4>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-orange-700 uppercase">Max. Platillos / Turno</label>
                    <input type="number" min="0" required value={prestacionesEmp.limite_platillos} onChange={e => setPrestacionesEmp({...prestacionesEmp, limite_platillos: Number(e.target.value)})} className="w-full bg-white border border-orange-200 rounded-xl p-2.5 font-black text-orange-900 outline-none text-center" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-700 uppercase">Max. Bebidas / Turno</label>
                    <input type="number" min="0" required value={prestacionesEmp.limite_bebidas} onChange={e => setPrestacionesEmp({...prestacionesEmp, limite_bebidas: Number(e.target.value)})} className="w-full bg-white border border-orange-200 rounded-xl p-2.5 font-black text-orange-900 outline-none text-center" />
                  </div>
               </div>
               <p className="text-[10px] text-orange-600 mt-2 leading-tight font-bold">Límite permitido por día. Si pones "0", la Caja rechazará cualquier orden gratuita de este empleado.</p>
            </div>

            <div className="border-t border-slate-200 my-4"></div>

            {/* 🏦 GESTOR DE PRÉSTAMOS */}
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
               <div className="flex justify-between items-center mb-4">
                  <h4 className="font-black text-rose-900 flex items-center gap-2 text-sm"><Banknote size={16}/> Préstamos y Vales</h4>
                  <button type="button" onClick={agregarPrestamo} className="text-[10px] bg-rose-600 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-rose-700 transition"><PlusCircle size={12}/> Prestar</button>
               </div>
               {prestacionesEmp.prestamos.length === 0 ? (
                 <p className="text-xs text-rose-500 font-bold text-center py-2 bg-white/50 rounded-xl">Sin deudas activas.</p>
               ) : (
                 <div className="space-y-3">
                   {prestacionesEmp.prestamos.map((p, idx) => (
                      <div key={p.id} className={`bg-white p-3 rounded-xl border relative shadow-sm ${p.activo ? 'border-rose-200' : 'border-slate-200 opacity-60'}`}>
                         <button type="button" onClick={() => eliminarPrestamo(p.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                         <input type="text" placeholder="Concepto (Ej. Préstamo Personal)" value={p.concepto} onChange={e => actualizarPrestamo(p.id, 'concepto', e.target.value)} className="w-[90%] text-sm font-black text-slate-800 outline-none border-b border-dashed border-slate-200 pb-1 mb-2" />
                         <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase">Monto Total</label>
                              <input type="number" disabled={!p.activo} placeholder="$0.00" value={p.monto_total || ''} onChange={e => actualizarPrestamo(p.id, 'monto_total', Number(e.target.value))} className="w-full bg-slate-50 p-1.5 rounded text-xs font-bold outline-none border border-slate-100 text-center text-slate-700" />
                            </div>
                            <div>
                              <label className="text-[9px] font-black text-rose-500 uppercase">Descontar x Nómina</label>
                              <input type="number" disabled={!p.activo} placeholder="$0.00" value={p.descuento_por_nomina || ''} onChange={e => actualizarPrestamo(p.id, 'descuento_por_nomina', Number(e.target.value))} className="w-full bg-rose-50 p-1.5 rounded text-xs font-bold outline-none border border-rose-200 text-center text-rose-700" />
                            </div>
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase">Saldo Restante</label>
                              <input type="number" disabled placeholder="Auto" value={p.saldo_restante} className="w-full bg-slate-100 p-1.5 rounded text-xs font-bold outline-none border border-slate-200 text-center text-slate-500 cursor-not-allowed" />
                            </div>
                         </div>
                         <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                           <input type="checkbox" checked={p.activo} onChange={e => actualizarPrestamo(p.id, 'activo', e.target.checked)} className="w-3 h-3 accent-rose-500"/>
                           <span className="text-[10px] font-bold text-slate-500 uppercase">Cobro Activo en Generador</span>
                         </div>
                      </div>
                   ))}
                 </div>
               )}
            </div>

            {/* ⏳ BONOS Y DEDUCCIONES RECURRENTES */}
            <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
               <div className="flex justify-between items-center mb-4">
                  <h4 className="font-black text-purple-900 flex items-center gap-2 text-sm"><Clock size={16}/> Ajustes Temporales (Recurrentes)</h4>
                  <button type="button" onClick={agregarBonoRecurrente} className="text-[10px] bg-purple-600 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-purple-700 transition"><PlusCircle size={12}/> Agregar</button>
               </div>
               {prestacionesEmp.bonos_recurrentes.length === 0 ? (
                 <p className="text-xs text-purple-500 font-bold text-center py-2 bg-white/50 rounded-xl">Sin bonos ni descuentos temporales.</p>
               ) : (
                 <div className="space-y-3">
                   {prestacionesEmp.bonos_recurrentes.map((b, idx) => (
                      <div key={b.id} className={`bg-white p-3 rounded-xl border relative shadow-sm ${b.activo ? 'border-purple-200' : 'border-slate-200 opacity-60'}`}>
                         <button type="button" onClick={() => eliminarBonoRecurrente(b.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                         <div className="flex items-center gap-2 mb-2 w-[90%]">
                           <select value={b.tipo} onChange={e => actualizarBonoRecurrente(b.id, 'tipo', e.target.value)} className={`text-xs font-black p-1 rounded outline-none border-none cursor-pointer ${b.tipo === 'bono' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              <option value="bono">Bono (+)</option>
                              <option value="descuento">Descuento (-)</option>
                           </select>
                           <input type="text" placeholder="Motivo (Ej. Apoyo Transporte)" value={b.concepto} onChange={e => actualizarBonoRecurrente(b.id, 'concepto', e.target.value)} className="flex-1 text-sm font-black text-slate-800 outline-none border-b border-dashed border-slate-200 pb-1" />
                         </div>
                         <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase">Monto Fijo</label>
                              <input type="number" placeholder="$0.00" value={b.monto || ''} onChange={e => actualizarBonoRecurrente(b.id, 'monto', Number(e.target.value))} className="w-full bg-slate-50 p-1.5 rounded text-xs font-bold outline-none border border-slate-100 text-center text-slate-700" />
                            </div>
                            <div>
                              <label className="text-[9px] font-black text-purple-500 uppercase">Válido Desde</label>
                              <input type="date" value={b.fecha_inicio} onChange={e => actualizarBonoRecurrente(b.id, 'fecha_inicio', e.target.value)} className="w-full bg-purple-50 p-1 rounded text-[10px] font-bold outline-none border border-purple-200 text-purple-700 text-center" />
                            </div>
                            <div>
                              <label className="text-[9px] font-black text-purple-500 uppercase">Válido Hasta</label>
                              <input type="date" value={b.fecha_fin} onChange={e => actualizarBonoRecurrente(b.id, 'fecha_fin', e.target.value)} className="w-full bg-purple-50 p-1 rounded text-[10px] font-bold outline-none border border-purple-200 text-purple-700 text-center" />
                            </div>
                         </div>
                         <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                           <input type="checkbox" checked={b.activo} onChange={e => actualizarBonoRecurrente(b.id, 'activo', e.target.checked)} className="w-3 h-3 accent-purple-500"/>
                           <span className="text-[10px] font-bold text-slate-500 uppercase">Ajuste Activo</span>
                         </div>
                      </div>
                   ))}
                 </div>
               )}
            </div>

            <div className="border-t border-slate-200 my-4"></div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Nombre Completo Legal</label>
                <input type="text" value={prestacionesEmp.nombre_completo} onChange={e => setPrestacionesEmp({...prestacionesEmp, nombre_completo: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">RFC</label>
                <input type="text" value={prestacionesEmp.rfc} onChange={e => setPrestacionesEmp({...prestacionesEmp, rfc: e.target.value.toUpperCase()})} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold uppercase focus:border-blue-500 outline-none transition-colors" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Días de Descanso Pagado Oficiales</label>
              <div className="flex flex-wrap gap-2">
                {diasSemanaMap.map(dia => {
                   const activo = prestacionesEmp.dias_descanso.includes(dia);
                   return (
                     <button type="button" key={dia} onClick={() => toggleDiaDescanso(dia)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${activo ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        {activo && <CheckCircle2 size={12} className="inline mr-1"/>} {dia}
                     </button>
                   )
                })}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full mt-8 bg-blue-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 active:scale-95">
              <User size={20} /> Guardar Perfil de Empleado
            </button>
          </form>
        )}
      </div>

    </div>
  );
};

export default NominaConfig;