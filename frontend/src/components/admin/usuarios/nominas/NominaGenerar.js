import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, PlusCircle, Trash2 } from 'lucide-react';

const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);
const diasSemanaMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const NominaGenerar = ({ usuariosDB, apiUrl, showAlert, showConfirm }) => {
  const hoyStr = new Date().toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preNomina, setPreNomina] = useState([]);
  
  const [configGlobal, setConfigGlobal] = useState({});
  const [reglasNomina, setReglasNomina] = useState({
    bono_limpieza_activo: false, bono_limpieza_monto: 0, limpieza_omisiones_permitidas: 0,
    bono_puntualidad_eventos_activo: false, bono_puntualidad_eventos_monto: 0, puntualidad_eventos_tolerancia_minutos: 15, puntualidad_eventos_retardos_permitidos: 0,
    bono_puntualidad_estricta_activo: false, bono_puntualidad_estricta_monto: 0, puntualidad_estricta_limite_minutos_semana: 15
  });

  const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global').sort((a, b) => a.nombre.localeCompare(b.nombre));

  useEffect(() => {
    fetch(`${apiUrl}/configuracion`).then(res => res.json()).then(data => {
      if (data) {
        setConfigGlobal(data);
        const matriz = typeof data.matriz_limpieza === 'string' ? JSON.parse(data.matriz_limpieza || '{}') : (data.matriz_limpieza || {});
        if (matriz.reglas_nomina) setReglasNomina(prev => ({ ...prev, ...matriz.reglas_nomina }));
      }
    });
  }, [apiUrl]);

  // ==========================================
  // CEREBRO MATEMÁTICO: CALCULAR PRE-NÓMINA Y BONOS
  // ==========================================
  const calcularNomina = async () => {
    setIsSubmitting(true);
    try {
      const query = `?periodo=mes&fecha=${fechaInicio.substring(0,7)}-01`;
      const resRend = await fetch(`${apiUrl}/usuarios/rendimiento${query}`);
      const dataRend = await resRend.json();
      const historial = dataRend.historialAsistencias || [];

      const matriz = typeof configGlobal.matriz_limpieza === 'string' ? JSON.parse(configGlobal.matriz_limpieza || '{}') : (configGlobal.matriz_limpieza || {});
      const evaluacionesLimpieza = matriz.evaluaciones || {};
      const calculos = [];

      for (const emp of empleadosVisibles) {
        const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
        if (pres.generar_nomina === false) continue; // Si se excluyó, lo saltamos

        const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        
        let diasAsistidos = 0;
        let diasVacaciones = 0;
        let diasDescanso = 0;
        const diasAuditados = [];

        // Métricas para los Bonos
        let fallasLimpieza = 0;
        let eventosTarde = 0; // Para Regla 2 (Clásica)
        let minutosTardeTotales = 0; // Para Regla 3 (Estricta)

        let currentDate = new Date(fechaInicio + 'T12:00:00');
        const endDate = new Date(fechaFin + 'T12:00:00');

        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const nombreDiaActual = diasSemanaMap[currentDate.getDay()];
          
          if (!hor[dateStr] || hor[dateStr].pagado !== true) { currentDate.setDate(currentDate.getDate() + 1); continue; }
          if (hor[dateStr].nomina_pagada === true) { currentDate.setDate(currentDate.getDate() + 1); continue; }

          if (hor[dateStr].vacaciones === true) {
            diasAsistidos++; diasVacaciones++; diasAuditados.push(dateStr);
            currentDate.setDate(currentDate.getDate() + 1); continue;
          }

          const arrDescansos = pres.dias_descanso || [];
          if (arrDescansos.includes(nombreDiaActual)) {
            diasAsistidos++; diasDescanso++; diasAuditados.push(dateStr);
            currentDate.setDate(currentDate.getDate() + 1); continue;
          }

          const asistenciasDelDia = historial.filter(h => h.usuario_id === emp.id && h.fecha.startsWith(dateStr));
          if (asistenciasDelDia.length > 0) {
            diasAsistidos++; diasAuditados.push(dateStr);

            // Cálculos de Retardos (Cruzar Horario Oficial vs Real)
            if (hor[dateStr] && hor[dateStr].entrada) {
              const entradaOficial = hor[dateStr].entrada;
              const [hOf, mOf] = entradaOficial.split(':').map(Number);
              const minOficiales = (hOf * 60) + mOf;
              
              const primeraAsistencia = asistenciasDelDia.sort((a,b) => new Date(a.hora_entrada) - new Date(b.hora_entrada))[0];
              const realDate = new Date(primeraAsistencia.hora_entrada);
              const minReales = (realDate.getHours() * 60) + realDate.getMinutes();

              const difMinutos = minReales - minOficiales;

              if (difMinutos > 0) {
                 minutosTardeTotales += difMinutos; // Suma acumulativa para Regla 3
                 if (difMinutos > Number(reglasNomina.puntualidad_eventos_tolerancia_minutos)) {
                     eventosTarde++; // Suma de evento para Regla 2
                 }
              }
            }
          }

          // Cálculos de Limpieza
          for (const area of Object.keys(evaluacionesLimpieza)) {
            if (String(matriz.asignaciones?.[area]?.[dateStr]) === String(emp.id)) {
              if (evaluacionesLimpieza[area][dateStr] === 'no_cumplio') fallasLimpieza++;
            }
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (diasAsistidos === 0 && (!pres.sueldo_base || Number(pres.sueldo_base) === 0)) continue;

        // ==========================================
        // MATEMÁTICA FINANCIERA DEL EMPLEADO
        // ==========================================
        const sueldoBase = Number(pres.sueldo_base) || 0;
        let ingresoSueldo = 0;
        let sueldoDiarioEstimado = 0;
        
        if (pres.tipo_sueldo === 'Diario') { sueldoDiarioEstimado = sueldoBase; ingresoSueldo = sueldoBase * diasAsistidos; } 
        else if (pres.tipo_sueldo === 'Semanal') { sueldoDiarioEstimado = sueldoBase / 7; ingresoSueldo = sueldoBase; } 
        else if (pres.tipo_sueldo === 'Quincenal') { sueldoDiarioEstimado = sueldoBase / 15; ingresoSueldo = sueldoBase; } 
        else if (pres.tipo_sueldo === 'Mensual') { sueldoDiarioEstimado = sueldoBase / 30; ingresoSueldo = sueldoBase; }

        const ingresosList = [{ concepto: 'SUELDO BASE', monto: ingresoSueldo }];

        if (diasVacaciones > 0) {
          const porcentajePrima = Number(pres.prima_vacacional) || 25;
          const montoPrima = (sueldoDiarioEstimado * diasVacaciones) * (porcentajePrima / 100);
          ingresosList.push({ concepto: `PRIMA VACACIONAL (${porcentajePrima}%) x${diasVacaciones}d`, monto: montoPrima });
          ingresoSueldo += montoPrima; 
        }

        // APLICACIÓN DE BONOS (RECOMPENSAS)
        let bonosTotales = 0;

        if (reglasNomina.bono_limpieza_activo) {
            if (fallasLimpieza <= Number(reglasNomina.limpieza_omisiones_permitidas)) {
                ingresosList.push({ concepto: `BONO LIMPIEZA (Fallas: ${fallasLimpieza})`, monto: Number(reglasNomina.bono_limpieza_monto) });
                bonosTotales += Number(reglasNomina.bono_limpieza_monto);
            }
        }

        if (reglasNomina.bono_puntualidad_eventos_activo) {
            if (eventosTarde <= Number(reglasNomina.puntualidad_eventos_retardos_permitidos)) {
                ingresosList.push({ concepto: `BONO PUNTUALIDAD CLÁSICA (Eventos Tarde: ${eventosTarde})`, monto: Number(reglasNomina.bono_puntualidad_eventos_monto) });
                bonosTotales += Number(reglasNomina.bono_puntualidad_eventos_monto);
            }
        }

        if (reglasNomina.bono_puntualidad_estricta_activo) {
            if (minutosTardeTotales <= Number(reglasNomina.puntualidad_estricta_limite_minutos_semana)) {
                ingresosList.push({ concepto: `BONO PUNTUALIDAD ESTRICTA (Minutos Acumulados: ${minutosTardeTotales})`, monto: Number(reglasNomina.bono_puntualidad_estricta_monto) });
                bonosTotales += Number(reglasNomina.bono_puntualidad_estricta_monto);
            }
        }

        const ingresosFinal = ingresoSueldo + bonosTotales;

        calculos.push({
          empleado_id: emp.id, nombre: emp.nombre, nombre_completo: pres.nombre_completo || emp.nombre, rol: emp.rol, telefono: pres.telefono || emp.telefono,
          datos_banco: { banco: pres.banco, cuenta: pres.cuenta, rfc: pres.rfc, nss: pres.nss },
          metricas: { diasAsistidos, eventosTarde, minutosTardeTotales, fallasLimpieza, diasAuditados, diasVacaciones, diasDescanso },
          ingresos: ingresosList,
          egresos: [], // Ya no hay castigos por defecto, solo Bonos
          nuevos_ingresos: [], 
          nuevos_egresos: [],
          total_ingresos: ingresosFinal, 
          total_egresos: 0,
          neto: ingresosFinal
        });
      }
      setPreNomina(calculos);
      if (calculos.length === 0) showAlert("Aviso", "No hay días pendientes de pago para generar en este rango.", "info");
    } catch (e) {
      console.error(e);
      showAlert("Error", "No se pudo calcular la nómina.", "error");
    }
    setIsSubmitting(false);
  };

  // AGREGAR MONTOS MANUALES (Propinas, Préstamos, etc.)
  const agregarDinamico = (idxEmp, tipo) => {
    const arr = [...preNomina];
    if (tipo === 'ingreso') arr[idxEmp].nuevos_ingresos.push({ concepto: '', monto: 0 });
    else arr[idxEmp].nuevos_egresos.push({ concepto: '', monto: 0 });
    setPreNomina(arr);
  };

  const modificarDinamico = (idxEmp, tipo, iItem, field, val) => {
    const arr = [...preNomina];
    const lista = tipo === 'ingreso' ? arr[idxEmp].nuevos_ingresos : arr[idxEmp].nuevos_egresos;
    lista[iItem][field] = field === 'monto' ? (Number(val) || 0) : val;
    recalcularNeto(arr, idxEmp);
  };

  const eliminarDinamico = (idxEmp, tipo, iItem) => {
    const arr = [...preNomina];
    if (tipo === 'ingreso') arr[idxEmp].nuevos_ingresos.splice(iItem, 1);
    else arr[idxEmp].nuevos_egresos.splice(iItem, 1);
    recalcularNeto(arr, idxEmp);
  };

  const recalcularNeto = (arr, idxEmp) => {
    const p = arr[idxEmp];
    const totInNew = p.nuevos_ingresos.reduce((acc, c) => acc + Number(c.monto), 0);
    const totEgNew = p.nuevos_egresos.reduce((acc, c) => acc + Number(c.monto), 0);
    p.total_ingresos = p.ingresos.reduce((acc, c) => acc + Number(c.monto), 0) + totInNew;
    p.total_egresos = p.egresos.reduce((acc, c) => acc + Number(c.monto), 0) + totEgNew;
    p.neto = p.total_ingresos - p.total_egresos;
    setPreNomina(arr);
  };

  // ==========================================
  // SELLAR Y GUARDAR NÓMINA EN BD
  // ==========================================
  const guardarCorteNomina = async () => {
    if (preNomina.length === 0) return;
    showConfirm("Aprobar Nómina", "¿Estás seguro? Se generarán los recibos y se bloquearán estos días para no volver a pagarse.", async () => {
      setIsSubmitting(true);
      try {
        const datosCorteFinal = preNomina.map(p => ({
          empleado_id: p.empleado_id, nombre: p.nombre, rol: p.rol, datos_banco: p.datos_banco,
          metricas: p.metricas, ingresos_base: p.ingresos, egresos_base: p.egresos,
          adicionales_ingresos: p.nuevos_ingresos, adicionales_egresos: p.nuevos_egresos,
          total_ingresos: p.total_ingresos, total_egresos: p.total_egresos, neto: p.neto
        }));

        const payloadCorte = {
          metadata: { es_nomina: true, fecha_inicio: fechaInicio, fecha_fin: fechaFin },
          recibos: datosCorteFinal
        };

        const res = await fetch(`${apiUrl}/usuarios/corte-nomina`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_admin_id: null, datos_corte: payloadCorte })
        });

        if (res.ok) {
          await Promise.all(preNomina.map(async (p) => {
            const emp = usuariosDB.find(u => u.id === p.empleado_id);
            const horActual = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
            const horNuevo = { ...horActual };
            p.metricas.diasAuditados.forEach(diaPagado => { if (!horNuevo[diaPagado]) horNuevo[diaPagado] = {}; horNuevo[diaPagado].nomina_pagada = true; });
            return fetch(`${apiUrl}/usuarios/${p.empleado_id}/horario`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ horario_semanal: horNuevo }) });
          }));
          showAlert("✅ Nómina Aprobada", "Recibos generados y días bloqueados con éxito.", "success");
          setPreNomina([]); 
        }
      } catch(e) { showAlert("Error", "Error al procesar la nómina.", "error"); }
      setIsSubmitting(false);
    });
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        <Calculator className="text-blue-600" size={32}/>
        <div>
          <h3 className="text-2xl font-black text-slate-800">Generar Pre-Nómina</h3>
          <p className="text-sm font-bold text-slate-400">Selecciona el rango de fechas. Solo se cobrarán los días "Por Pagar".</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div><label className="text-xs font-bold text-slate-500">Fecha Inicio</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black outline-none" /></div>
        <div><label className="text-xs font-bold text-slate-500">Fecha Fin</label><input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black outline-none" /></div>
      </div>

      <button disabled={isSubmitting} onClick={calcularNomina} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black shadow-lg mb-8 disabled:opacity-50">
        {isSubmitting ? 'Calculando...' : 'Calcular Nómina con Bonos'}
      </button>

      {preNomina.length > 0 && (
        <div className="space-y-6 animate-in fade-in">
          {preNomina.map((p, idxEmp) => (
            <div key={p.empleado_id} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 relative">
              <h4 className="text-xl font-black text-slate-800 flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                {p.nombre} ({p.rol})
                <span className="text-3xl text-emerald-600 font-black">{formaterMoneda(p.neto)}</span>
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="bg-white p-2 rounded-xl text-center shadow-sm border border-slate-100"><p className="text-[10px] font-bold text-slate-400">Días Pagados</p><p className="font-black text-slate-700">{p.metricas.diasAsistidos}</p></div>
                <div className="bg-white p-2 rounded-xl text-center shadow-sm border border-slate-100"><p className="text-[10px] font-bold text-slate-400">Eventos Tarde</p><p className="font-black text-amber-600">{p.metricas.eventosTarde}</p></div>
                <div className="bg-white p-2 rounded-xl text-center shadow-sm border border-slate-100"><p className="text-[10px] font-bold text-slate-400">Total Mins Tarde</p><p className="font-black text-red-500">{p.metricas.minutosTardeTotales} min</p></div>
                <div className="bg-white p-2 rounded-xl text-center shadow-sm border border-slate-100"><p className="text-[10px] font-bold text-slate-400">Fallas Limpieza</p><p className="font-black text-purple-600">{p.metricas.fallasLimpieza}</p></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-black text-emerald-600 mb-2 flex items-center justify-between">Ingresos (+)<button onClick={() => agregarDinamico(idxEmp, 'ingreso')} className="text-emerald-500 hover:text-emerald-700"><PlusCircle size={16}/></button></h5>
                  <ul className="text-sm font-bold text-slate-600 space-y-1">
                    {p.ingresos.map((ing, i) => <li key={i} className="flex justify-between"><span>{ing.concepto}</span><span className="text-emerald-600">{formaterMoneda(ing.monto)}</span></li>)}
                  </ul>
                  {p.nuevos_ingresos.map((ni, iItem) => (
                    <div key={iItem} className="flex gap-2 mt-2 items-center animate-in slide-in-from-left">
                      <input type="text" placeholder="Concepto (Ej. Bono extra)" value={ni.concepto} onChange={e => modificarDinamico(idxEmp, 'ingreso', iItem, 'concepto', e.target.value)} className="flex-1 bg-white border border-slate-200 rounded p-1 text-xs outline-none" />
                      <input type="number" placeholder="$" value={ni.monto || ''} onChange={e => modificarDinamico(idxEmp, 'ingreso', iItem, 'monto', e.target.value)} className="w-20 bg-white border border-slate-200 rounded p-1 text-xs outline-none" />
                      <button onClick={() => eliminarDinamico(idxEmp, 'ingreso', iItem)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>

                <div>
                  <h5 className="font-black text-red-500 mb-2 flex items-center justify-between">Egresos / Préstamos (-)<button onClick={() => agregarDinamico(idxEmp, 'egreso')} className="text-red-400 hover:text-red-600"><PlusCircle size={16}/></button></h5>
                  {p.egresos.length === 0 && p.nuevos_egresos.length === 0 && <p className="text-xs text-slate-400 italic">No hay egresos.</p>}
                  {p.nuevos_egresos.map((ne, iItem) => (
                    <div key={iItem} className="flex gap-2 mt-2 items-center animate-in slide-in-from-left">
                      <input type="text" placeholder="Concepto (Ej. Préstamo)" value={ne.concepto} onChange={e => modificarDinamico(idxEmp, 'egreso', iItem, 'concepto', e.target.value)} className="flex-1 bg-white border border-slate-200 rounded p-1 text-xs outline-none" />
                      <input type="number" placeholder="$" value={ne.monto || ''} onChange={e => modificarDinamico(idxEmp, 'egreso', iItem, 'monto', e.target.value)} className="w-20 bg-white border border-slate-200 rounded p-1 text-xs outline-none" />
                      <button onClick={() => eliminarDinamico(idxEmp, 'egreso', iItem)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button onClick={guardarCorteNomina} disabled={isSubmitting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xl py-6 rounded-2xl shadow-xl shadow-emerald-500/30 flex justify-center items-center gap-3 transition transform active:scale-95 disabled:opacity-50 mt-8">
            <CheckCircle2 size={28} /> Aprobar, Bloquear Días y Guardar Nómina
          </button>
        </div>
      )}
    </div>
  );
};

export default NominaGenerar;