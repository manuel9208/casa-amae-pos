import React, { useState, useEffect } from 'react';
import { Save, User, ShieldCheck, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

const diasSemanaMap = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const NominaConfig = ({ usuariosDB, apiUrl, refrescarDatos, showAlert }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global').sort((a, b) => a.nombre.localeCompare(b.nombre));

  // ==========================================
  // ESTADO: REGLAS GLOBALES (BONOS)
  // ==========================================
  const [configGlobal, setConfigGlobal] = useState({});
  const [reglasNomina, setReglasNomina] = useState({
    bono_limpieza_activo: false,
    bono_limpieza_monto: 0,
    limpieza_omisiones_permitidas: 0,

    bono_puntualidad_eventos_activo: false,
    bono_puntualidad_eventos_monto: 0,
    puntualidad_eventos_tolerancia_minutos: 15,
    puntualidad_eventos_retardos_permitidos: 0,

    bono_puntualidad_estricta_activo: false,
    bono_puntualidad_estricta_monto: 0,
    puntualidad_estricta_limite_minutos_semana: 15
  });

  // ==========================================
  // ESTADO: FICHA DEL EMPLEADO
  // ==========================================
  const [empleadoEditId, setEmpleadoEditId] = useState('');
  const [prestacionesEmp, setPrestacionesEmp] = useState({ 
    sueldo_base: 0, tipo_sueldo: 'Semanal', banco: '', cuenta: '', rfc: '', curp: '', nss: '', telefono: '', correo: '', fecha_ingreso: '', nombre_completo: '', generar_nomina: true,
    dias_descanso: [], prima_vacacional: 25, dias_vacaciones_disponibles: 12
  });

  // CARGAR REGLAS GLOBALES DESDE LA BASE DE DATOS
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/configuracion`);
        if (res.ok) {
          const data = await res.json();
          setConfigGlobal(data);
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
          sueldo_base: presParsed.sueldo_base || 0, tipo_sueldo: presParsed.tipo_sueldo || 'Semanal', banco: presParsed.banco || '', cuenta: presParsed.cuenta || '',
          rfc: presParsed.rfc || '', curp: presParsed.curp || '', nss: presParsed.nss || '', telefono: presParsed.telefono || emp.telefono || '',
          correo: presParsed.correo || '', fecha_ingreso: presParsed.fecha_ingreso || '', nombre_completo: presParsed.nombre_completo || '', 
          generar_nomina: presParsed.generar_nomina !== undefined ? presParsed.generar_nomina : true,
          dias_descanso: descansosArray,
          prima_vacacional: presParsed.prima_vacacional !== undefined ? presParsed.prima_vacacional : 25,
          dias_vacaciones_disponibles: presParsed.dias_vacaciones_disponibles !== undefined ? presParsed.dias_vacaciones_disponibles : 12 
        });
      }
    } else {
      setPrestacionesEmp({ sueldo_base: 0, tipo_sueldo: 'Semanal', banco: '', cuenta: '', rfc: '', curp: '', nss: '', telefono: '', correo: '', fecha_ingreso: '', nombre_completo: '', generar_nomina: true, dias_descanso: [], prima_vacacional: 25, dias_vacaciones_disponibles: 12 });
    }
  }, [empleadoEditId, usuariosDB]);

  // MANEJADOR DE DÍAS DE DESCANSO
  const toggleDiaDescanso = (dia) => {
    setPrestacionesEmp(prev => {
      const activos = prev.dias_descanso || [];
      if (activos.includes(dia)) return { ...prev, dias_descanso: activos.filter(d => d !== dia) };
      return { ...prev, dias_descanso: [...activos, dia] };
    });
  };

  // GUARDAR REGLAS GLOBALES (BONOS)
  const guardarReglasGlobales = async (e) => {
    e.preventDefault(); 
    setIsSubmitting(true);
    try {
      const matrizActual = typeof configGlobal.matriz_limpieza === 'string' ? JSON.parse(configGlobal.matriz_limpieza || '{}') : (configGlobal.matriz_limpieza || {});
      matrizActual.reglas_nomina = reglasNomina;
      
      const formData = new FormData(); 
      formData.append('matriz_limpieza', JSON.stringify(matrizActual));
      
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) showAlert('Éxito', 'Las políticas de bonos han sido actualizadas permanentemente.', 'success');
    } catch(e) { showAlert('Error', 'Fallo de conexión.', 'error'); }
    setIsSubmitting(false);
  };

  // GUARDAR FICHA EMPLEADO
  const guardarPrestacionesEmpleado = async (e) => {
    e.preventDefault(); 
    if (!empleadoEditId) return; 
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/usuarios/${empleadoEditId}/prestaciones`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prestaciones: prestacionesEmp })
      });
      if (res.ok) { showAlert('Éxito', 'Ficha del empleado guardada correctamente.', 'success'); refrescarDatos(); }
    } catch(e) { showAlert('Error', 'Fallo de conexión.', 'error'); }
    setIsSubmitting(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      
      {/* ==================================================== */}
      {/* 1. SECCIÓN: POLÍTICAS DE BONOS (REGLAS GLOBALES)     */}
      {/* ==================================================== */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <ShieldCheck className="text-emerald-500" size={32}/>
          <div>
            <h3 className="text-2xl font-black text-slate-800">Políticas de Bonos</h3>
            <p className="text-sm font-bold text-slate-400">Estas reglas se aplican al generar la nómina.</p>
          </div>
        </div>

        <form onSubmit={guardarReglasGlobales} className="space-y-6">
          
          {/* REGLA 1: LIMPIEZA */}
          <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.bono_limpieza_activo ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-black text-slate-800 flex items-center gap-2">🧹 Bono de Limpieza</h4>
              <button type="button" onClick={() => setReglasNomina({...reglasNomina, bono_limpieza_activo: !reglasNomina.bono_limpieza_activo})} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition ${reglasNomina.bono_limpieza_activo ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                {reglasNomina.bono_limpieza_activo ? 'Activado' : 'Desactivado'}
              </button>
            </div>
            {reglasNomina.bono_limpieza_activo && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <div><label className="text-xs font-bold text-slate-500">Monto del Bono ($)</label><input type="number" value={reglasNomina.bono_limpieza_monto} onChange={e => setReglasNomina({...reglasNomina, bono_limpieza_monto: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black" /></div>
                <div><label className="text-xs font-bold text-slate-500">Fallas Perdonadas</label><input type="number" value={reglasNomina.limpieza_omisiones_permitidas} onChange={e => setReglasNomina({...reglasNomina, limpieza_omisiones_permitidas: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black" /></div>
              </div>
            )}
          </div>

          {/* REGLA 2: PUNTUALIDAD CLÁSICA (POR EVENTOS) */}
          <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.bono_puntualidad_eventos_activo ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-black text-slate-800 flex items-center gap-2"><Clock className="text-blue-500" size={18}/> Bono Puntualidad Clásica</h4>
              <button type="button" onClick={() => setReglasNomina({...reglasNomina, bono_puntualidad_eventos_activo: !reglasNomina.bono_puntualidad_eventos_activo})} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition ${reglasNomina.bono_puntualidad_eventos_activo ? 'bg-blue-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                {reglasNomina.bono_puntualidad_eventos_activo ? 'Activado' : 'Desactivado'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-wider">Castiga por la CANTIDAD de veces que llegó tarde.</p>
            {reglasNomina.bono_puntualidad_eventos_activo && (
              <div className="grid grid-cols-3 gap-4 animate-in fade-in">
                <div><label className="text-xs font-bold text-slate-500">Monto ($)</label><input type="number" value={reglasNomina.bono_puntualidad_eventos_monto} onChange={e => setReglasNomina({...reglasNomina, bono_puntualidad_eventos_monto: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black" /></div>
                <div><label className="text-xs font-bold text-slate-500">Tolerancia (Min)</label><input type="number" value={reglasNomina.puntualidad_eventos_tolerancia_minutos} onChange={e => setReglasNomina({...reglasNomina, puntualidad_eventos_tolerancia_minutos: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black" /></div>
                <div><label className="text-xs font-bold text-slate-500">Tardanzas Permitidas</label><input type="number" value={reglasNomina.puntualidad_eventos_retardos_permitidos} onChange={e => setReglasNomina({...reglasNomina, puntualidad_eventos_retardos_permitidos: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black" /></div>
              </div>
            )}
          </div>

          {/* REGLA 3: PUNTUALIDAD ESTRICTA (MINUTOS ACUMULADOS) */}
          <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.bono_puntualidad_estricta_activo ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-black text-slate-800 flex items-center gap-2"><AlertTriangle className="text-orange-500" size={18}/> Bono Puntualidad Estricta</h4>
              <button type="button" onClick={() => setReglasNomina({...reglasNomina, bono_puntualidad_estricta_activo: !reglasNomina.bono_puntualidad_estricta_activo})} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition ${reglasNomina.bono_puntualidad_estricta_activo ? 'bg-orange-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                {reglasNomina.bono_puntualidad_estricta_activo ? 'Activado' : 'Desactivado'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-wider">Suma todos los minutos tarde de la semana.</p>
            {reglasNomina.bono_puntualidad_estricta_activo && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <div><label className="text-xs font-bold text-slate-500">Monto del Bono ($)</label><input type="number" value={reglasNomina.bono_puntualidad_estricta_monto} onChange={e => setReglasNomina({...reglasNomina, bono_puntualidad_estricta_monto: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black" /></div>
                <div><label className="text-xs font-bold text-slate-500">Límite Global Semanal (Minutos)</label><input type="number" value={reglasNomina.puntualidad_estricta_limite_minutos_semana} onChange={e => setReglasNomina({...reglasNomina, puntualidad_estricta_limite_minutos_semana: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black" /></div>
              </div>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition">
            <Save size={20} /> Guardar Políticas de Bonos
          </button>
        </form>
      </div>

      {/* ==================================================== */}
      {/* 2. SECCIÓN: FICHA FINANCIERA DEL EMPLEADO            */}
      {/* ==================================================== */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <User className="text-blue-500" size={32}/>
          <div>
            <h3 className="text-2xl font-black text-slate-800">Ficha Financiera</h3>
            <p className="text-sm font-bold text-slate-400">Selecciona un empleado para ajustar su sueldo.</p>
          </div>
        </div>

        <select value={empleadoEditId} onChange={(e) => setEmpleadoEditId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black text-slate-700 outline-none mb-6">
          <option value="">-- Selecciona un Empleado --</option>
          {empleadosVisibles.map(e => (
            <option key={e.id} value={e.id}>{e.nombre} ({e.rol})</option>
          ))}
        </select>

        {empleadoEditId && (
          <form onSubmit={guardarPrestacionesEmpleado} className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
              <span className="font-black text-blue-800">¿Generar nómina automática?</span>
              <input type="checkbox" checked={prestacionesEmp.generar_nomina} onChange={(e) => setPrestacionesEmp({...prestacionesEmp, generar_nomina: e.target.checked})} className="w-6 h-6 accent-blue-600 rounded-md cursor-pointer" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase">Sueldo Base ($)</label><input type="number" required value={prestacionesEmp.sueldo_base} onChange={e => setPrestacionesEmp({...prestacionesEmp, sueldo_base: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase">Frecuencia</label>
                <select value={prestacionesEmp.tipo_sueldo} onChange={e => setPrestacionesEmp({...prestacionesEmp, tipo_sueldo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black outline-none">
                  <option value="Semanal">Semanal</option><option value="Quincenal">Quincenal</option><option value="Mensual">Mensual</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo (Legal)</label><input type="text" value={prestacionesEmp.nombre_completo} onChange={e => setPrestacionesEmp({...prestacionesEmp, nombre_completo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase">RFC</label><input type="text" value={prestacionesEmp.rfc} onChange={e => setPrestacionesEmp({...prestacionesEmp, rfc: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black uppercase" /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase">Banco</label><input type="text" value={prestacionesEmp.banco} onChange={e => setPrestacionesEmp({...prestacionesEmp, banco: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black" /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase">CLABE / Cuenta</label><input type="text" value={prestacionesEmp.cuenta} onChange={e => setPrestacionesEmp({...prestacionesEmp, cuenta: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black" /></div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Días de Descanso (Selecciona uno o más)</label>
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

            <button type="submit" disabled={isSubmitting} className="w-full mt-6 bg-blue-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">
              <User size={20} /> Guardar Perfil de Empleado
            </button>
          </form>
        )}
      </div>

    </div>
  );
};

export default NominaConfig;