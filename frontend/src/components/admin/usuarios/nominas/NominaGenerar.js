import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, PlusCircle, Trash2, Gift, Clock, Banknote, Sun } from 'lucide-react';

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
    bono_puntualidad_estricta_activo: false, bono_puntualidad_estricta_monto: 0, puntualidad_estricta_limite_minutos_semana: 15,
    descuento_descanso_activo: true, prima_dominical_activa: true,
    retencion_isr_activa: false, porcentaje_isr: 0, retencion_imss_activa: false, porcentaje_imss: 0
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
        if (pres.generar_nomina === false) continue; 

        const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        
        let diasAsistidos = 0;
        let diasProgramados = 0;
        let diasVacaciones = 0;
        let diasDescanso = 0;
        let domingosTrabajados = 0;
        const diasAuditados = [];
        const alertasEmpleado = [];

        let fallasLimpieza = 0;
        let eventosTarde = 0; 
        let minutosTardeTotales = 0; 
        let diasFaltaInjustificada = 0;

        let currentDate = new Date(fechaInicio + 'T12:00:00');
        const endDate = new Date(fechaFin + 'T12:00:00');

        // 👇 Escáner de Aniversario
        if (pres.fecha_ingreso) {
           const fIng = new Date(pres.fecha_ingreso + 'T12:00:00');
           if (fIng.getMonth() === currentDate.getMonth() && fIng.getFullYear() < currentDate.getFullYear()) {
               alertasEmpleado.push({ tipo: 'aniversario', msg: `🎉 Aniversario de trabajo detectado (${fIng.getFullYear()}). Recuerda revisar sus vacaciones.` });
           }
        }

        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const nombreDiaActual = diasSemanaMap[currentDate.getDay()];
          const esDomingo = currentDate.getDay() === 0;
          
          if (!hor[dateStr] || hor[dateStr].pagado !== true) { currentDate.setDate(currentDate.getDate() + 1); continue; }
          if (hor[dateStr].nomina_pagada === true) { currentDate.setDate(currentDate.getDate() + 1); continue; }

          diasProgramados++;

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
            if (esDomingo) domingosTrabajados++;

            if (hor[dateStr] && hor[dateStr].entrada) {
              const entradaOficial = hor[dateStr].entrada;
              const [hOf, mOf] = entradaOficial.split(':').map(Number);
              const minOficiales = (hOf * 60) + mOf;
              
              const primeraAsistencia = asistenciasDelDia.sort((a,b) => new Date(a.hora_entrada) - new Date(b.hora_entrada))[0];
              const realDate = new Date(primeraAsistencia.hora_entrada);
              const minReales = (realDate.getHours() * 60) + realDate.getMinutes();

              const difMinutos = minReales - minOficiales;

              if (difMinutos > 0) {
                 minutosTardeTotales += difMinutos; 
                 if (difMinutos > Number(reglasNomina.puntualidad_eventos_tolerancia_minutos)) {
                     eventosTarde++; 
                 }
              }
            }
          } else {
            // Escáner de Faltas
            diasFaltaInjustificada++;
            alertasEmpleado.push({ tipo: 'falta', fecha: dateStr, msg: `⚠️ Falta detectada el ${dateStr}.` });
            diasAuditados.push(dateStr); // Lo auditamos para bloquearlo y no volver a cobrarlo
          }

          for (const area of Object.keys(evaluacionesLimpieza)) {
            if (String(matriz.asignaciones?.[area]?.[dateStr]) === String(emp.id)) {
              if (evaluacionesLimpieza[area][dateStr] === 'no_cumplio') fallasLimpieza++;
            }
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        const sueldoBase = Number(pres.sueldo_base) || 0;
        let ingresoSueldo = 0;
        let sueldoDiarioExacto = 0;
        
        // 👇 MOTOR MATEMÁTICO DE PRORRATEOS Y SUELDO DIARIO
        if (pres.tipo_sueldo === 'Diario') { sueldoDiarioExacto = sueldoBase; ingresoSueldo = sueldoBase * diasProgramados; } 
        else if (pres.tipo_sueldo === 'Por Hora') { sueldoDiarioExacto = sueldoBase * 8; ingresoSueldo = sueldoBase * (diasProgramados * 8); } 
        else if (pres.tipo_sueldo === 'Semanal') { sueldoDiarioExacto = sueldoBase / 7; ingresoSueldo = (sueldoBase / 7) * diasProgramados; } 
        else if (pres.tipo_sueldo === 'Quincenal') { sueldoDiarioExacto = sueldoBase / 15; ingresoSueldo = (sueldoBase / 15) * diasProgramados; } 
        else if (pres.tipo_sueldo === 'Mensual') { sueldoDiarioExacto = sueldoBase / 30; ingresoSueldo = (sueldoBase / 30) * diasProgramados; }

        const ingresosList = [];
        const egresosList = [];
        
        ingresosList.push({ concepto: `Sueldo Base Ordinario (${diasProgramados} días)`, monto: ingresoSueldo });

        // 👇 LEY 1/6: Descuento de Faltas Injustificadas
        if (diasFaltaInjustificada > 0) {
           let diasADescontar = diasFaltaInjustificada;
           if (reglasNomina.descuento_descanso_activo && !['Diario', 'Por Hora'].includes(pres.tipo_sueldo)) {
              diasADescontar += (diasFaltaInjustificada * (1/6)); // Descuento proporcional del descanso
           }
           const montoDescuento = sueldoDiarioExacto * diasADescontar;
           egresosList.push({ concepto: `Faltas Injustificadas (${diasFaltaInjustificada}d) + Proporcional Descanso`, monto: montoDescuento });
        }

        // 👇 LEY: Prima Dominical
        if (reglasNomina.prima_dominical_activa && domingosTrabajados > 0) {
           const montoDominical = (sueldoDiarioExacto * 0.25) * domingosTrabajados;
           ingresosList.push({ concepto: `Prima Dominical (25%) x${domingosTrabajados} domingos`, monto: montoDominical });
        }

        if (diasVacaciones > 0) {
          const porcentajePrima = Number(pres.prima_vacacional) || 25;
          const montoPrima = (sueldoDiarioExacto * diasVacaciones) * (porcentajePrima / 100);
          ingresosList.push({ concepto: `Prima Vacacional (${porcentajePrima}%) x${diasVacaciones}d`, monto: montoPrima });
        }

        // 👇 BONOS DE PRODUCTIVIDAD (Solo si asistió)
        if (diasAsistidos > 0) {
          if (reglasNomina.bono_limpieza_activo && fallasLimpieza <= Number(reglasNomina.limpieza_omisiones_permitidas)) {
              ingresosList.push({ concepto: `Bono Limpieza (Fallas: ${fallasLimpieza})`, monto: Number(reglasNomina.bono_limpieza_monto) });
          }
          if (reglasNomina.bono_puntualidad_eventos_activo && eventosTarde <= Number(reglasNomina.puntualidad_eventos_retardos_permitidos)) {
              ingresosList.push({ concepto: `Bono Punt. Clásica (Tardanzas: ${eventosTarde})`, monto: Number(reglasNomina.bono_puntualidad_eventos_monto) });
          }
          if (reglasNomina.bono_puntualidad_estricta_activo && minutosTardeTotales <= Number(reglasNomina.puntualidad_estricta_limite_minutos_semana)) {
              ingresosList.push({ concepto: `Bono Punt. Estricta (Mins Tarde: ${minutosTardeTotales})`, monto: Number(reglasNomina.bono_puntualidad_estricta_monto) });
          }
        }

        // 👇 BONOS RECURRENTES Y DESCUENTOS TEMPORALES
        if (pres.bonos_recurrentes && pres.bonos_recurrentes.length > 0) {
            pres.bonos_recurrentes.forEach(b => {
               if (b.activo) {
                  const inicioBono = new Date(b.fecha_inicio + 'T00:00:00');
                  const finBono = new Date(b.fecha_fin + 'T23:59:59');
                  const targetDate = new Date(fechaFin + 'T12:00:00');
                  if (targetDate >= inicioBono && targetDate <= finBono) {
                      if (b.tipo === 'bono') ingresosList.push({ concepto: `[Temp] ${b.concepto}`, monto: Number(b.monto) });
                      else egresosList.push({ concepto: `[Temp] ${b.concepto}`, monto: Number(b.monto) });
                  }
               }
            });
        }

        // 👇 COBRO DE PRÉSTAMOS
        const prestamosAplicados = [];
        if (pres.prestamos && pres.prestamos.length > 0) {
            pres.prestamos.forEach(p => {
               if (p.activo && p.saldo_restante > 0) {
                   const aDescontar = Math.min(Number(p.descuento_por_nomina), Number(p.saldo_restante));
                   egresosList.push({ concepto: `Abono a Préstamo: ${p.concepto}`, monto: aDescontar });
                   prestamosAplicados.push({ id: p.id, descontado: aDescontar });
               }
            });
        }

        // 👇 RETENCIONES FISCALES LFT (ISR e IMSS)
        const subtotalParaImpuestos = ingresosList.reduce((acc, c) => acc + c.monto, 0) - egresosList.reduce((acc, c) => acc + c.monto, 0);
        if (subtotalParaImpuestos > 0) {
            if (reglasNomina.retencion_isr_activa && reglasNomina.porcentaje_isr > 0) {
                const isr = subtotalParaImpuestos * (reglasNomina.porcentaje_isr / 100);
                egresosList.push({ concepto: `Retención ISR (${reglasNomina.porcentaje_isr}%)`, monto: isr });
            }
            if (reglasNomina.retencion_imss_activa && reglasNomina.porcentaje_imss > 0) {
                const imss = subtotalParaImpuestos * (reglasNomina.porcentaje_imss / 100);
                egresosList.push({ concepto: `Retención IMSS (${reglasNomina.porcentaje_imss}%)`, monto: imss });
            }
        }

        const totalIn = ingresosList.reduce((acc, c) => acc + Number(c.monto), 0);
        const totalEg = egresosList.reduce((acc, c) => acc + Number(c.monto), 0);

        if (totalIn === 0 && diasProgramados === 0) continue; 

        calculos.push({
          empleado_id: emp.id, nombre: emp.nombre, nombre_completo: pres.nombre_completo || emp.nombre, rol: emp.rol, telefono: pres.telefono || emp.telefono,
          datos_banco: { banco: pres.banco, cuenta: pres.cuenta, rfc: pres.rfc, nss: pres.nss },
          metricas: { diasProgramados, diasAsistidos, eventosTarde, minutosTardeTotales, fallasLimpieza, diasAuditados, diasVacaciones, diasDescanso, sueldoDiarioExacto, prestamosAplicados, alertasEmpleado },
          ingresos: ingresosList,
          egresos: egresosList, 
          nuevos_ingresos: [], 
          nuevos_egresos: [],
          total_ingresos: totalIn, 
          total_egresos: totalEg,
          neto: totalIn - totalEg
        });
      }
      setPreNomina(calculos);
      if (calculos.length === 0) showAlert("Aviso", "No hay días pendientes de pago o no hubo programaciones en este rango.", "info");
    } catch (e) {
      console.error(e);
      showAlert("Error", "No se pudo calcular la nómina.", "error");
    }
    setIsSubmitting(false);
  };

  const agregarDinamico = (idxEmp, tipo, conceptoDefault = '', montoDefault = 0) => {
    const arr = [...preNomina];
    if (tipo === 'ingreso') arr[idxEmp].nuevos_ingresos.push({ concepto: conceptoDefault, monto: montoDefault });
    else arr[idxEmp].nuevos_egresos.push({ concepto: conceptoDefault, monto: montoDefault });
    recalcularNeto(arr, idxEmp);
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

  // 👇 ACCIONES RÁPIDAS (Inyecciones de Nómina)
  const justificarFalta = (idxEmp, fechaFalta) => {
    const p = preNomina[idxEmp];
    const montoReembolso = p.metricas.sueldoDiarioExacto * (reglasNomina.descuento_descanso_activo ? (1 + 1/6) : 1);
    agregarDinamico(idxEmp, 'ingreso', `Justificación Falta (${fechaFalta})`, montoReembolso.toFixed(2));
    showAlert("Falta Justificada", "Se ha añadido el reembolso proporcional a sus ingresos.", "success");
  };

  const accionRapidaAguinaldo = (idxEmp) => {
     agregarDinamico(idxEmp, 'ingreso', 'Aguinaldo (Proporcional LFT)', (preNomina[idxEmp].metricas.sueldoDiarioExacto * 15).toFixed(2));
  };
  const accionRapidaHorasExtras = (idxEmp) => {
     const valorHora = preNomina[idxEmp].metricas.sueldoDiarioExacto / 8;
     agregarDinamico(idxEmp, 'ingreso', 'Horas Extras (Doble)', (valorHora * 2).toFixed(2));
  };
  const accionRapidaFestivo = (idxEmp) => {
     agregarDinamico(idxEmp, 'ingreso', 'Día Festivo Trabajado (Doble Extra)', (preNomina[idxEmp].metricas.sueldoDiarioExacto * 2).toFixed(2));
  };
  const accionRapidaPropinas = (idxEmp) => {
     agregarDinamico(idxEmp, 'ingreso', 'Reparto de Propinas (Tarjeta)', 0);
  };

  const guardarCorteNomina = async () => {
    if (preNomina.length === 0) return;
    showConfirm("Aprobar Nómina", "¿Estás seguro? Se generarán los recibos, se descontarán los préstamos y se bloquearán estos días para no volver a pagarse.", async () => {
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
          // Bloquear días y Actualizar préstamos en paralelo
          await Promise.all(preNomina.map(async (p) => {
            const emp = usuariosDB.find(u => u.id === p.empleado_id);
            const horActual = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
            const presActual = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
            
            // 1. Bloquear Horario
            const horNuevo = { ...horActual };
            p.metricas.diasAuditados.forEach(diaPagado => { if (!horNuevo[diaPagado]) horNuevo[diaPagado] = {}; horNuevo[diaPagado].nomina_pagada = true; });
            await fetch(`${apiUrl}/usuarios/${p.empleado_id}/horario`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ horario_semanal: horNuevo }) });

            // 2. Descontar Préstamos de la BD
            if (p.metricas.prestamosAplicados && p.metricas.prestamosAplicados.length > 0) {
               const nuevosPrestamos = presActual.prestamos.map(prestamo => {
                  const aplico = p.metricas.prestamosAplicados.find(pa => pa.id === prestamo.id);
                  if (aplico) {
                     const nuevoSaldo = prestamo.saldo_restante - aplico.descontado;
                     return { ...prestamo, saldo_restante: nuevoSaldo, activo: nuevoSaldo > 0 };
                  }
                  return prestamo;
               });
               await fetch(`${apiUrl}/usuarios/${p.empleado_id}/prestaciones`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prestaciones: { ...presActual, prestamos: nuevosPrestamos } }) });
            }
          }));
          showAlert("✅ Nómina Aprobada", "Recibos generados, préstamos cobrados y días bloqueados con éxito.", "success");
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
        <div><label className="text-xs font-bold text-slate-500">Fecha Inicio</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black outline-none focus:border-blue-500" /></div>
        <div><label className="text-xs font-bold text-slate-500">Fecha Fin</label><input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black outline-none focus:border-blue-500" /></div>
      </div>

      <button disabled={isSubmitting} onClick={calcularNomina} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black shadow-lg mb-8 disabled:opacity-50 active:scale-95 transition transform">
        {isSubmitting ? 'Procesando Matemáticas...' : 'Generar y Escanear Alertas'}
      </button>

      {preNomina.length > 0 && (
        <div className="space-y-8 animate-in fade-in">
          {preNomina.map((p, idxEmp) => (
            <div key={p.empleado_id} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 relative overflow-hidden">
              {p.neto <= 0 && <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>}
              
              <h4 className="text-xl font-black text-slate-800 flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                {p.nombre} ({p.rol})
                <span className={`text-3xl font-black ${p.neto > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formaterMoneda(p.neto)}</span>
              </h4>

              {/* 👇 PANEL DE ALERTAS ESCANEADAS */}
              {p.metricas.alertasEmpleado && p.metricas.alertasEmpleado.length > 0 && (
                <div className="mb-6 space-y-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas del Sistema</p>
                   {p.metricas.alertasEmpleado.map((alerta, iAlt) => (
                      <div key={iAlt} className={`p-3 rounded-xl flex items-center justify-between text-sm font-bold shadow-sm border ${alerta.tipo === 'aniversario' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                         <span>{alerta.msg}</span>
                         {alerta.tipo === 'falta' && (
                           <button onClick={() => justificarFalta(idxEmp, alerta.fecha)} className="bg-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-100 transition shadow-sm border border-red-100">
                             Justificar (Reembolsar)
                           </button>
                         )}
                      </div>
                   ))}
                </div>
              )}

              {/* 👇 BOTONES RÁPIDOS DE INYECCIÓN DE LEY */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button onClick={() => accionRapidaHorasExtras(idxEmp)} className="bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1"><Clock size={14}/> + Horas Extras</button>
                <button onClick={() => accionRapidaFestivo(idxEmp)} className="bg-white border border-slate-200 text-slate-600 hover:border-orange-500 hover:text-orange-600 px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1"><Sun size={14}/> + Día Festivo Trabajado</button>
                <button onClick={() => accionRapidaAguinaldo(idxEmp)} className="bg-white border border-slate-200 text-slate-600 hover:border-purple-500 hover:text-purple-600 px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1"><Gift size={14}/> + Aguinaldo LFT</button>
                <button onClick={() => accionRapidaPropinas(idxEmp)} className="bg-white border border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600 px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1"><Banknote size={14}/> + Propinas Tarjeta</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                <div className="bg-white p-2 rounded-xl text-center shadow-sm border border-slate-100"><p className="text-[10px] font-bold text-slate-400">Días Ordinarios</p><p className="font-black text-slate-700">{p.metricas.diasProgramados}</p></div>
                <div className="bg-white p-2 rounded-xl text-center shadow-sm border border-slate-100"><p className="text-[10px] font-bold text-slate-400">Sueldo Base Diario</p><p className="font-black text-blue-600">{formaterMoneda(p.metricas.sueldoDiarioExacto)}</p></div>
                <div className="bg-white p-2 rounded-xl text-center shadow-sm border border-slate-100"><p className="text-[10px] font-bold text-slate-400">Eventos Tarde</p><p className="font-black text-amber-600">{p.metricas.eventosTarde}</p></div>
                <div className="bg-white p-2 rounded-xl text-center shadow-sm border border-slate-100"><p className="text-[10px] font-bold text-slate-400">Total Mins Tarde</p><p className="font-black text-red-500">{p.metricas.minutosTardeTotales} min</p></div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div>
                  <h5 className="font-black text-emerald-600 mb-3 flex items-center justify-between border-b border-emerald-100 pb-2">Ingresos (+)<button onClick={() => agregarDinamico(idxEmp, 'ingreso')} className="text-emerald-500 hover:text-emerald-700 bg-emerald-50 p-1 rounded-md"><PlusCircle size={16}/></button></h5>
                  <ul className="text-sm font-bold text-slate-600 space-y-2 mb-4">
                    {p.ingresos.map((ing, i) => <li key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm"><span className="w-2/3 truncate pr-2" title={ing.concepto}>{ing.concepto}</span><span className="text-emerald-600">{formaterMoneda(ing.monto)}</span></li>)}
                  </ul>
                  {p.nuevos_ingresos.map((ni, iItem) => (
                    <div key={iItem} className="flex gap-2 mt-2 items-center animate-in slide-in-from-left">
                      <input type="text" placeholder="Concepto (Ej. Bono extra)" value={ni.concepto} onChange={e => modificarDinamico(idxEmp, 'ingreso', iItem, 'concepto', e.target.value)} className="flex-1 bg-white border border-emerald-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-emerald-500" />
                      <input type="number" placeholder="$" value={ni.monto || ''} onChange={e => modificarDinamico(idxEmp, 'ingreso', iItem, 'monto', e.target.value)} className="w-24 bg-white border border-emerald-200 rounded-lg p-2 text-xs font-black text-emerald-700 outline-none text-center focus:border-emerald-500" />
                      <button onClick={() => eliminarDinamico(idxEmp, 'ingreso', iItem)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>

                <div>
                  <h5 className="font-black text-red-500 mb-3 flex items-center justify-between border-b border-red-100 pb-2">Egresos / Retenciones (-)<button onClick={() => agregarDinamico(idxEmp, 'egreso')} className="text-red-400 hover:text-red-600 bg-red-50 p-1 rounded-md"><PlusCircle size={16}/></button></h5>
                  {p.egresos.length === 0 && p.nuevos_egresos.length === 0 && <p className="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-slate-100 text-center">No hay deducciones.</p>}
                  <ul className="text-sm font-bold text-slate-600 space-y-2 mb-4">
                     {p.egresos.map((eg, i) => <li key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm"><span className="w-2/3 truncate pr-2 text-red-800" title={eg.concepto}>{eg.concepto}</span><span className="text-red-500">-{formaterMoneda(eg.monto)}</span></li>)}
                  </ul>
                  {p.nuevos_egresos.map((ne, iItem) => (
                    <div key={iItem} className="flex gap-2 mt-2 items-center animate-in slide-in-from-left">
                      <input type="text" placeholder="Concepto (Ej. Préstamo)" value={ne.concepto} onChange={e => modificarDinamico(idxEmp, 'egreso', iItem, 'concepto', e.target.value)} className="flex-1 bg-white border border-red-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-red-500" />
                      <input type="number" placeholder="$" value={ne.monto || ''} onChange={e => modificarDinamico(idxEmp, 'egreso', iItem, 'monto', e.target.value)} className="w-24 bg-white border border-red-200 rounded-lg p-2 text-xs font-black text-red-700 outline-none text-center focus:border-red-500" />
                      <button onClick={() => eliminarDinamico(idxEmp, 'egreso', iItem)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button onClick={guardarCorteNomina} disabled={isSubmitting} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black text-xl py-6 rounded-2xl shadow-xl flex justify-center items-center gap-3 transition transform active:scale-95 disabled:opacity-50 mt-8">
            <CheckCircle2 size={28} /> Aprobar, Bloquear Días y Finalizar Nómina
          </button>
        </div>
      )}
    </div>
  );
};

export default NominaGenerar;