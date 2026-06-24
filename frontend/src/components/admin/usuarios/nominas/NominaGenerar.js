import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, PlusCircle, Trash2, Gift, Clock, Banknote, Sun, Cake } from 'lucide-react';

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

      const toleranciaSalida = 30; 
      const minTolEntrada = Number(reglasNomina.puntualidad_eventos_tolerancia_minutos) || 15;
      
      const gApertura = String(configGlobal.hora_apertura || 17).padStart(2, '0') + ':00';
      const gCierre = String(configGlobal.hora_cierre || 23).padStart(2, '0') + ':00';

      for (const emp of empleadosVisibles) {
        const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
        if (pres.generar_nomina === false) continue; 

        const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        const arrDescansos = pres.dias_descanso || [];
        
        let diasAsistidos = 0;
        let diasProgramados = 0;
        let diasVacaciones = 0;
        let diasDescanso = 0;
        let domingosTrabajados = 0;
        let horasTrabajadasTotales = 0; 
        const diasAuditados = [];
        const alertasEmpleado = [];

        let fallasLimpieza = 0;
        let eventosTarde = 0; 
        let minutesTardeTotales = 0; 
        let diasFaltaInjustificada = 0;

        let currentDate = new Date(fechaInicio + 'T12:00:00');
        const endDate = new Date(fechaFin + 'T12:00:00');

        if (pres.fecha_ingreso) {
           const fIng = new Date(pres.fecha_ingreso + 'T12:00:00');
           if (fIng.getMonth() === currentDate.getMonth() && fIng.getFullYear() < currentDate.getFullYear()) {
               // 👇 CORRECCIÓN 1: Se reemplazó dateStr indefinido por la lectura directa de currentDate
               alertasEmpleado.push({ tipo: 'aniversario', idUnico: `ani-${emp.id}`, fecha: currentDate.toISOString().split('T')[0], msg: `🎉 Aniversario de trabajo detectado (Ingresó en ${fIng.getFullYear()}). Recuerda revisar sus vacaciones.`, resuelta: false, estadoAuditoria: 'aprobado' });
           }
        }

        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const nombreDiaActual = diasSemanaMap[currentDate.getDay()];
          const esDomingo = currentDate.getDay() === 0;

          if (pres.fecha_nacimiento && !alertasEmpleado.some(a => a.tipo === 'cumpleaños')) {
             const fBday = new Date(pres.fecha_nacimiento + 'T12:00:00');
             if (currentDate.getMonth() === fBday.getMonth() && currentDate.getDate() === fBday.getDate()) {
                 alertasEmpleado.push({ tipo: 'cumpleaños', idUnico: `cumple-${dateStr}`, fecha: dateStr, msg: `🎂 ¡Cumpleaños detectado! ¿Deseas agregarle un bono festivo?`, resuelta: false, estadoAuditoria: 'aprobado' });
             }
          }

          if (hor[dateStr]?.nomina_pagada === true) { 
            currentDate.setDate(currentDate.getDate() + 1); 
            continue; 
          }

          const diaActivo = hor[dateStr]?.activo === true;
          const esDescanso = arrDescansos.includes(nombreDiaActual);
          const esDiaLaboral = diaActivo && !esDescanso;
          const auditoriaDia = hor[dateStr]?.auditoria || {}; 
          const checkinsDelDia = historial.filter(h => h.usuario_id === emp.id && h.fecha.startsWith(dateStr));

          if (esDiaLaboral && !hor[dateStr]?.vacaciones) {
              diasProgramados++;
          }

          if (hor[dateStr]?.vacaciones === true) {
              if (diaActivo) { diasAsistidos++; diasVacaciones++; diasAuditados.push(dateStr); horasTrabajadasTotales += 8; }
              currentDate.setDate(currentDate.getDate() + 1); 
              continue;
          }

          if (esDescanso && checkinsDelDia.length === 0) {
              if (diaActivo) { diasAsistidos++; diasDescanso++; diasAuditados.push(dateStr); }
              currentDate.setDate(currentDate.getDate() + 1); 
              continue;
          }

          if (checkinsDelDia.length > 0) {
              let minEntrada = new Date(checkinsDelDia[0].hora_entrada);
              let maxSalida = checkinsDelDia[0].hora_salida ? new Date(checkinsDelDia[0].hora_salida) : null;
              let tieneNullSalida = !checkinsDelDia[0].hora_salida;

              for (let i = 1; i < checkinsDelDia.length; i++) {
                  const inD = new Date(checkinsDelDia[i].hora_entrada);
                  if (inD < minEntrada) minEntrada = inD;
                  if (checkinsDelDia[i].hora_salida) {
                      const outD = new Date(checkinsDelDia[i].hora_salida);
                      if (!maxSalida || outD > maxSalida) maxSalida = outD;
                  } else {
                      tieneNullSalida = true;
                  }
              }

              const entradaOficial = hor[dateStr]?.entrada || gApertura;
              const salidaOficial = hor[dateStr]?.salida || gCierre;

              let limiteSalidaTime = null;
              if (salidaOficial) {
                  const [hOut, mOut] = salidaOficial.split(':').map(Number);
                  const [hIn] = entradaOficial.split(':').map(Number);
                  let dateLimit = new Date(dateStr + 'T00:00:00');
                  dateLimit.setHours(hOut, mOut, 0, 0);
                  if (hOut < hIn) dateLimit.setDate(dateLimit.getDate() + 1); 
                  dateLimit.setMinutes(dateLimit.getMinutes() + toleranciaSalida);
                  limiteSalidaTime = dateLimit.getTime();
              }

              const maxOchoHoras = minEntrada.getTime() + (8 * 3600000);
              let outTime, olvidoSalida = false, turnoActivo = false;
              
              if (tieneNullSalida) {
                  if (dateStr === hoyStr) {
                      outTime = new Date().getTime();
                      turnoActivo = true;
                  } else {
                      olvidoSalida = true;
                      outTime = limiteSalidaTime || maxOchoHoras;
                  }
              } else {
                  outTime = maxSalida.getTime();
                  if ((outTime - minEntrada.getTime()) > (24 * 3600000)) {
                      olvidoSalida = true;
                      outTime = limiteSalidaTime || maxOchoHoras;
                  } else if (limiteSalidaTime && outTime > (limiteSalidaTime + (4 * 3600000))) {
                      olvidoSalida = true;
                      outTime = limiteSalidaTime;
                  }
              }

              let diffHrs = (outTime - minEntrada.getTime()) / 3600000;
              if (diffHrs < 0) diffHrs = 0;

              let hReal = 0, mReal = 0, hOfIn = 0, mOfIn = 0;
              if (entradaOficial) {
                  [hOfIn, mOfIn] = entradaOficial.split(':').map(Number);
                  const stringHoraCompleta = minEntrada.toLocaleTimeString('es-MX', { timeZone: 'America/Mazatlan', hour12: false });
                  [hReal, mReal] = stringHoraCompleta.split(':').map(Number);
                  
                  const minOficiales = (hOfIn * 60) + mOfIn;
                  const minReales = (hReal * 60) + mReal;
                  if (minReales > (minOficiales + minTolEntrada)) {
                      eventosTarde++;
                      minutesTardeTotales += (minReales - minOficiales);
                  }
              }

              let motivosAnomalia = [];
              let requiereAuditoria = false;

              if (olvidoSalida) motivosAnomalia.push(`Olvidó checar salida.`);
              if (!esDiaLaboral) {
                  requiereAuditoria = true;
                  motivosAnomalia.push(esDescanso ? 'Trabajó en su Descanso.' : 'Día Inactivo.');
              } else {
                  if (entradaOficial) {
                      if (hReal < hOfIn - 3 || hReal > hOfIn + 4) {
                          requiereAuditoria = true;
                          motivosAnomalia.push(`Fuera de rango (${entradaOficial})`);
                      } else if (salidaOficial) {
                          const [hSalOf, mSalOf] = salidaOficial.split(':').map(Number);
                          let minsOficiales = (hSalOf * 60 + mSalOf) - (hOfIn * 60 + mOfIn);
                          if (minsOficiales < 0) minsOficiales += 24 * 60;
                          
                          const minsTrabajados = diffHrs * 60;
                          if (!turnoActivo && minsTrabajados < (minsOficiales - 15)) {
                              requiereAuditoria = true;
                              motivosAnomalia.push(`Jornada Incompleta`);
                          }
                          if (!turnoActivo && minsTrabajados > (minsOficiales + 60)) {
                              requiereAuditoria = true;
                              motivosAnomalia.push(`Tiempo Extra`);
                          }
                      }
                  }
              }

              let horasFinalesAprobadas = diffHrs; 
              let estadoAudParsed = { estado: 'pendiente' };
              if (auditoriaDia['auditoria_turno']) {
                  try { estadoAudParsed = JSON.parse(auditoriaDia['auditoria_turno']); } 
                  catch(e) { estadoAudParsed = { estado: auditoriaDia['auditoria_turno'] }; }
              }

              if (estadoAudParsed.estado === 'rechazado') {
                  horasFinalesAprobadas = 0; 
              } else if (estadoAudParsed.estado === 'aprobado' && estadoAudParsed.horasAprobadas !== undefined) {
                  horasFinalesAprobadas = estadoAudParsed.horasAprobadas; 
              }

              let hrsExt = 0;
              let hrsFaltantes = 0;
              if (entradaOficial && salidaOficial) {
                  const [hSalOf, mSalOf] = salidaOficial.split(':').map(Number);
                  const [hOfIn2, mOfIn2] = entradaOficial.split(':').map(Number);
                  let minsOficiales = (hSalOf * 60 + mSalOf) - (hOfIn2 * 60 + mOfIn2);
                  if (minsOficiales < 0) minsOficiales += 24 * 60;
                  const hrsOficiales = minsOficiales / 60;
                  
                  if (horasFinalesAprobadas > hrsOficiales + 0.25) hrsExt = (horasFinalesAprobadas - hrsOficiales).toFixed(2);
                  if (horasFinalesAprobadas < hrsOficiales - 0.25) hrsFaltantes = (hrsOficiales - horasFinalesAprobadas).toFixed(2);
              }

              if (olvidoSalida || requiereAuditoria) {
                  alertasEmpleado.push({
                      tipo: 'auditoria_turno',
                      idUnico: `turno-${dateStr}`,
                      fecha: dateStr,
                      msg: motivosAnomalia.join(' | '),
                      estadoAuditoria: estadoAudParsed.estado,
                      resuelta: estadoAudParsed.estado === 'aprobado' || estadoAudParsed.estado === 'rechazado',
                      hrsAuditadas: horasFinalesAprobadas,
                      hrsExt: Number(hrsExt),
                      hrsFaltantes: Number(hrsFaltantes)
                  });
              }

              horasTrabajadasTotales += horasFinalesAprobadas;
              diasAsistidos++;
              diasAuditados.push(dateStr);
              if (esDomingo) domingosTrabajados++;

          } else {
              const isPastOrToday = new Date(dateStr + 'T12:00:00') <= new Date(hoyStr + 'T12:00:00');
              if (esDiaLaboral && isPastOrToday) {
                  let estadoFaltaParsed = { estado: 'pendiente' };
                  if (auditoriaDia['falta']) {
                      try { estadoFaltaParsed = JSON.parse(auditoriaDia['falta']); } 
                      catch(e) { estadoFaltaParsed = { estado: auditoriaDia['falta'] }; }
                  }
                  
                  if (estadoFaltaParsed.estado !== 'aprobado') {
                      diasFaltaInjustificada++;
                      alertasEmpleado.push({ 
                          tipo: 'falta', 
                          idUnico: `falta-${dateStr}`, 
                          fecha: dateStr, 
                          msg: `⚠️ Falta Injustificada.`, 
                          estadoAuditoria: estadoFaltaParsed.estado, 
                          resuelta: estadoFaltaParsed.estado === 'rechazado'
                      });
                      diasAuditados.push(dateStr); 
                  } else {
                      diasProgramados++; 
                      horasTrabajadasTotales += 8;
                      diasAuditados.push(dateStr);
                  }
              }
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
        
        if (pres.tipo_sueldo === 'Diario') { sueldoDiarioExacto = sueldoBase; ingresoSueldo = sueldoBase * diasProgramados; } 
        else if (pres.tipo_sueldo === 'Por Hora') { 
            sueldoDiarioExacto = sueldoBase * 8; 
            ingresoSueldo = sueldoBase * horasTrabajadasTotales; 
        } 
        else if (pres.tipo_sueldo === 'Semanal') { sueldoDiarioExacto = sueldoBase / 7; ingresoSueldo = (sueldoBase / 7) * diasProgramados; } 
        else if (pres.tipo_sueldo === 'Quincenal') { sueldoDiarioExacto = sueldoBase / 15; ingresoSueldo = (sueldoBase / 15) * diasProgramados; } 
        else if (pres.tipo_sueldo === 'Mensual') { sueldoDiarioExacto = sueldoBase / 30; ingresoSueldo = (sueldoBase / 30) * diasProgramados; }

        const ingresosList = [];
        const egresosList = [];
        
        if (pres.tipo_sueldo === 'Por Hora') {
            ingresosList.push({ concepto: `Sueldo Base (${horasTrabajadasTotales.toFixed(2)} Hrs Auditadas)`, monto: ingresoSueldo });
        } else {
            ingresosList.push({ concepto: `Sueldo Base Ordinario (${diasProgramados} días)`, monto: ingresoSueldo });
        }

        if (diasFaltaInjustificada > 0) {
           let diasADescontar = diasFaltaInjustificada;
           if (reglasNomina.descuento_descanso_activo && !['Diario', 'Por Hora'].includes(pres.tipo_sueldo)) {
              diasADescontar += (diasFaltaInjustificada * (1.0 / 6.0)); 
           }
           const montoDescuento = sueldoDiarioExacto * diasADescontar;
           egresosList.push({ concepto: `Faltas Injustificadas (${diasFaltaInjustificada}d) + Prop. Descanso`, monto: montoDescuento });
        }

        if (reglasNomina.prima_dominical_activa && domingosTrabajados > 0) {
           const montoDominical = (sueldoDiarioExacto * 0.25) * domingosTrabajados;
           ingresosList.push({ concepto: `Prima Dominical (25%) x${domingosTrabajados} domingos`, monto: montoDominical });
        }

        if (diasVacaciones > 0) {
          const porcentajePrima = Number(pres.prima_vacacional) || 25;
          const montoPrima = (sueldoDiarioExacto * diasVacaciones) * (porcentajePrima / 100);
          ingresosList.push({ concepto: `Prima Vacacional (${porcentajePrima}%) x${diasVacaciones}d`, monto: montoPrima });
        }

        if (diasAsistidos > 0) {
          if (reglasNomina.bono_limpieza_activo && fallasLimpieza <= Number(reglasNomina.limpieza_omisiones_permitidas)) {
              ingresosList.push({ concepto: `Bono Limpieza (Fallas: ${fallasLimpieza})`, monto: Number(reglasNomina.bono_limpieza_monto) });
          }
          if (reglasNomina.bono_puntualidad_eventos_activo && eventosTarde <= Number(reglasNomina.puntualidad_eventos_retardos_permitidos)) {
              ingresosList.push({ concepto: `Bono Punt. Clásica (Tardanzas: ${eventosTarde})`, monto: Number(reglasNomina.bono_puntualidad_eventos_monto) });
          }
          if (reglasNomina.bono_puntualidad_estricta_activo && minutesTardeTotales <= Number(reglasNomina.puntualidad_estricta_limite_minutos_semana)) {
              ingresosList.push({ concepto: `Bono Punt. Estricta (Mins Tarde: ${minutesTardeTotales})`, monto: Number(reglasNomina.bono_puntualidad_estricta_monto) });
          }
        }

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

        if (totalIn === 0 && diasProgramados === 0 && diasFaltaInjustificada === 0 && alertasEmpleado.length === 0) continue; 

        calculos.push({
          empleado_id: emp.id, nombre: emp.nombre, nombre_completo: pres.nombre_completo || emp.nombre, rol: emp.rol, telefono: pres.telefono || emp.telefono,
          datos_banco: { banco: pres.banco, cuenta: pres.cuenta, rfc: pres.rfc, nss: pres.nss },
          metricas: { diasProgramados, diasAsistidos, eventosTarde, minutosTardeTotales: minutesTardeTotales, fallasLimpieza, diasAuditados, diasVacaciones, diasDescanso, sueldoDiarioExacto, prestamosAplicados, alertasEmpleado, fechaIngresoBase: pres.fecha_ingreso, horasExtrasAcumulables: 0 },
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

  const recalcularNeto = (arr, idxEmp) => {
    const p = arr[idxEmp];
    const totInBase = p.ingresos.reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
    const totEgBase = p.egresos.reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
    const totInNew = p.nuevos_ingresos.reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
    const totEgNew = p.nuevos_egresos.reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
    
    p.total_ingresos = totInBase + totInNew;
    p.total_egresos = totEgBase + totEgNew;
    p.neto = p.total_ingresos - p.total_egresos;
    setPreNomina(arr);
  };

  const modificarBase = (idxEmp, tipo, iItem, val) => {
    const arr = [...preNomina];
    const lista = tipo === 'ingreso' ? arr[idxEmp].ingresos : arr[idxEmp].egresos;
    lista[iItem].monto = val;
    recalcularNeto(arr, idxEmp);
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
    lista[iItem][field] = field === 'monto' ? val : val;
    recalcularNeto(arr, idxEmp);
  };

  const eliminarDinamico = (idxEmp, tipo, iItem) => {
    const arr = [...preNomina];
    if (tipo === 'ingreso') arr[idxEmp].nuevos_ingresos.splice(iItem, 1);
    else arr[idxEmp].nuevos_egresos.splice(iItem, 1);
    recalcularNeto(arr, idxEmp);
  };

  const resolverAlerta = (idxEmp, idUnico) => {
      const arr = [...preNomina];
      const alerta = arr[idxEmp].metricas.alertasEmpleado.find(a => a.idUnico === idUnico);
      if (alerta) alerta.resuelta = true;
      setPreNomina(arr);
  };

  const justificarFalta = (idxEmp, alerta) => {
    const montoReembolso = preNomina[idxEmp].metricas.sueldoDiarioExacto * (reglasNomina.descuento_descanso_activo ? (1 + 1/6) : 1);
    agregarDinamico(idxEmp, 'ingreso', `Justificación Falta (${alerta.fecha})`, montoReembolso.toFixed(2));
    resolverAlerta(idxEmp, alerta.idUnico);
    showAlert("Falta Justificada", "Se ha añadido el reembolso proporcional a sus ingresos.", "success");
  };

  const penalizarJornadaIncompleta = (idxEmp, alerta) => {
    const valorHora = preNomina[idxEmp].metricas.sueldoDiarioExacto / 8;
    const descuentoExacto = alerta.hrsFaltantes * valorHora;
    agregarDinamico(idxEmp, 'egreso', `Sanción Hrs Incompletas (${alerta.fecha})`, descuentoExacto.toFixed(2));
    resolverAlerta(idxEmp, alerta.idUnico);
    showAlert("Descuento Aplicado", `Se descontaron ${alerta.hrsFaltantes} horas de su sueldo diario.`, "warning");
  };

  const pagarHorasExtrasEnEfectivo = (idxEmp, alerta) => {
     const valorHoraNormal = preNomina[idxEmp].metricas.sueldoDiarioExacto / 8;
     const pagoAlDoble = (alerta.hrsExt * valorHoraNormal) * 2;
     agregarDinamico(idxEmp, 'ingreso', `Pago Tiempo Extra Doble (${alerta.hrsExt}h - ${alerta.fecha})`, pagoAlDoble.toFixed(2));
     resolverAlerta(idxEmp, alerta.idUnico);
     showAlert("Horas Agregadas", `Se sumaron al recibo de pago al doble de su valor.`, "success");
  };

  const acumularHorasExtrasABanco = (idxEmp, alerta) => {
     const arr = [...preNomina];
     arr[idxEmp].metricas.horasExtrasAcumulables += alerta.hrsExt;
     // 👇 CORRECCIÓN 2: Se mapeó idUnico a la propiedad alerta.idUnico que está en scope
     resolverAlerta(idxEmp, alerta.idUnico);
     showAlert("Horas Acumuladas", `Las horas se sumarán a su Banco de Horas al finalizar la nómina.`, "success");
  };

  const accionRapidaAguinaldo = (idxEmp) => {
     const p = preNomina[idxEmp];
     let diasAguinaldo = 15; 

     if (p.metricas.fechaIngresoBase) {
        const fechaIngreso = new Date(p.metricas.fechaIngresoBase + 'T12:00:00');
        const hoy = new Date();
        const currentYear = hoy.getFullYear();
        const inicioAnio = new Date(currentYear, 0, 1, 12, 0, 0); 
        const fechaCalculoInicio = fechaIngreso > inicioAnio ? fechaIngreso : inicioAnio;
        const diffTiempo = hoy.getTime() - fechaCalculoInicio.getTime();
        const diasLaboradosEnAnio = Math.floor(diffTiempo / (1000 * 3600 * 24));

        if (diasLaboradosEnAnio < 365) {
            diasAguinaldo = (diasLaboradosEnAnio / 365) * 15;
            showAlert("Aguinaldo Proporcional", `El empleado tiene ${diasLaboradosEnAnio} días laborados este año. Se calcularon ${diasAguinaldo.toFixed(2)} días proporcionales.`, "info");
        }
     }
     const montoAguinaldo = p.metricas.sueldoDiarioExacto * diasAguinaldo;
     agregarDinamico(idxEmp, 'ingreso', `Aguinaldo Proporcional LFT (${diasAguinaldo.toFixed(2)} días)`, montoAguinaldo.toFixed(2));
  };
  
  const accionRapidaHorasExtras = (idxEmp) => {
     const valorHora = preNomina[idxEmp].metricas.sueldoDiarioExacto / 8;
     agregarDinamico(idxEmp, 'ingreso', 'Horas Extras Libres (Doble)', (valorHora * 2).toFixed(2));
  };
  const accionRapidaFestivo = (idxEmp) => {
     agregarDinamico(idxEmp, 'ingreso', 'Día Festivo Trabajado (Doble Extra)', (preNomina[idxEmp].metricas.sueldoDiarioExacto * 2).toFixed(2));
  };
  const accionRapidaPropinas = (idxEmp) => {
     agregarDinamico(idxEmp, 'ingreso', 'Reparto de Propinas (Tarjeta)', 0);
  };
  const accionRapidaCumpleanos = (idxEmp) => {
     agregarDinamico(idxEmp, 'ingreso', 'Bono de Cumpleaños 🎂', 0);
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
          total_ingresos: p.total_ingresos, total_egresos: p.total_egresos, neto: p.neto,
          nombre_completo: p.nombre_completo
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
            const presActual = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
            
            const horNuevo = { ...horActual };
            p.metricas.diasAuditados.forEach(diaPagado => { if (!horNuevo[diaPagado]) horNuevo[diaPagado] = {}; horNuevo[diaPagado].nomina_pagada = true; });
            await fetch(`${apiUrl}/usuarios/${p.empleado_id}/horario`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ horario_semanal: horNuevo }) });

            let nuevosPrestamos = presActual.prestamos || [];
            if (p.metricas.prestamosAplicados && p.metricas.prestamosAplicados.length > 0) {
               nuevosPrestamos = nuevosPrestamos.map(prestamo => {
                  const aplico = p.metricas.prestamosAplicados.find(pa => pa.id === prestamo.id);
                  if (aplico) {
                     const nuevoSaldo = prestamo.saldo_restante - aplico.descontado;
                     return { ...prestamo, saldo_restante: nuevoSaldo, activo: nuevoSaldo > 0 };
                  }
                  return prestamo;
               });
            }

            let horasExtrasHistoricas = Number(presActual.horas_extras_acumuladas) || 0;
            horasExtrasHistoricas += p.metricas.horasExtrasAcumulables;

            await fetch(`${apiUrl}/usuarios/${p.empleado_id}/prestaciones`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ prestaciones: { ...presActual, prestamos: nuevosPrestamos, horas_extras_acumuladas: horasExtrasHistoricas } }) 
            });
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
            <div key={p.empleado_id} className="bg-white p-6 rounded-3xl border border-slate-200 relative overflow-hidden shadow-sm">
              {p.neto <= 0 && <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>}
              
              <h4 className="text-xl font-black text-slate-800 flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                {p.nombre_completo || p.nombre} ({p.rol})
                <span className={`text-3xl font-black ${p.neto > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formaterMoneda(p.neto)}</span>
              </h4>

              {p.metricas.alertasEmpleado && p.metricas.alertasEmpleado.length > 0 && (
                <div className="mb-6 space-y-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas de Cumplimiento Operativo</p>
                   {p.metricas.alertasEmpleado.map((alerta, iAlt) => (
                      <div key={iAlt} className={`p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm font-bold shadow-sm border ${alerta.tipo === 'aniversario' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : alerta.tipo === 'cumpleaños' ? 'bg-pink-50 text-pink-700 border-pink-200' : alerta.tipo === 'auditoria_turno' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                         
                         <span className="flex-1 text-xs md:text-sm flex flex-wrap items-center gap-2">
                            {alerta.fecha && (
                              <span className="bg-white/80 border border-slate-300 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-black shadow-sm">
                                 {alerta.fecha}
                              </span>
                            )}
                            <span className="font-bold">{alerta.msg}</span>
                            {alerta.tipo === 'auditoria_turno' && (
                              <span className="text-[10px] text-slate-500 font-bold uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                 ⏱️ Turno: {Number(alerta.hrsAuditadas || 0).toFixed(2)} hrs
                              </span>
                            )}
                         </span>
                         
                         <div className="flex flex-col md:flex-row gap-2 md:items-center shrink-0">
                           
                           {alerta.estadoAuditoria === 'aprobado' ? (
                             <span className="bg-emerald-100 text-emerald-700 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border border-emerald-200 text-center">
                               ✅ Auditado {alerta.hrsAuditadas !== undefined && `(${alerta.hrsAuditadas}h)`}
                             </span>
                           ) : alerta.estadoAuditoria === 'rechazado' ? (
                             <span className="bg-red-100 text-red-700 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border border-red-200 text-center">
                               ❌ Sancionado / Rechazado
                             </span>
                           ) : (
                             <span className="bg-amber-100 text-amber-700 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border border-amber-200 text-center">
                               ⚠️ Pdte. Auditoría
                             </span>
                           )}

                           {alerta.tipo === 'falta' && (
                             <button disabled={alerta.resuelta} onClick={() => justificarFalta(idxEmp, alerta)} className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-sm transition ${alerta.resuelta ? 'bg-slate-200 text-slate-400' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}`}>
                               {alerta.resuelta ? '❌ Sanción Firme' : 'Justificar Falta'}
                             </button>
                           )}

                           {alerta.tipo === 'auditoria_turno' && alerta.hrsFaltantes > 0 && (
                             <button disabled={alerta.resuelta} onClick={() => penalizarJornadaIncompleta(idxEmp, alerta)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm transition ${alerta.resuelta ? 'bg-slate-200 text-slate-400' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                               {alerta.resuelta ? '✅ Aplicado' : 'Cobrar Descuento'}
                             </button>
                           )}

                           {alerta.tipo === 'auditoria_turno' && alerta.hrsExt > 0 && (
                             <>
                                <button disabled={alerta.resuelta} onClick={() => pagarHorasExtrasEnEfectivo(idxEmp, alerta)} className={`px-2 py-1.5 rounded text-[10px] font-black shadow-sm transition ${alerta.resuelta ? 'hidden' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                                    Pagar Efectivo
                                </button>
                                <button disabled={alerta.resuelta} onClick={() => acumularHorasExtrasABanco(idxEmp, alerta)} className={`px-2 py-1.5 rounded text-[10px] font-black shadow-sm transition ${alerta.resuelta ? 'hidden' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                    A Banco Hrs
                                </button>
                                {alerta.resuelta && <span className="bg-slate-200 text-slate-500 px-3 py-1.5 rounded-lg text-[10px] font-black">✅ Resuelto</span>}
                             </>
                           )}
                         </div>
                      </div>
                   ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-6">
                <button onClick={() => accionRapidaHorasExtras(idxEmp)} className="bg-slate-50 border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1"><Clock size={14}/> + Horas Extras</button>
                <button onClick={() => accionRapidaFestivo(idxEmp)} className="bg-slate-50 border border-slate-200 text-slate-600 hover:border-orange-500 hover:text-orange-600 px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1"><Sun size={14}/> + Día Festivo Trabajado</button>
                <button onClick={() => accionRapidaAguinaldo(idxEmp)} className="bg-slate-50 border border-slate-200 text-slate-600 hover:border-purple-500 hover:text-purple-600 px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1"><Gift size={14}/> + Aguinaldo LFT</button>
                <button onClick={() => accionRapidaPropinas(idxEmp)} className="bg-slate-50 border border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600 px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1"><Banknote size={14}/> + Propinas Tarjeta</button>
                <button onClick={() => accionRapidaCumpleanos(idxEmp)} className="bg-slate-50 border border-slate-200 text-slate-600 hover:border-pink-500 hover:text-pink-600 px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1"><Cake size={14}/> + Bono Cumpleaños</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Días Planificados</p><p className="font-black text-slate-700 text-lg">{p.metricas.diasProgramados}</p></div>
                <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Pago Diario Exacto</p><p className="font-black text-blue-600 text-lg">{formaterMoneda(p.metricas.sueldoDiarioExacto)}</p></div>
                <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Eventos Tarde</p><p className="font-black text-amber-600 text-lg">{p.metricas.eventosTarde}</p></div>
                <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Minutos Tarde</p><p className="font-black text-red-500 text-lg">{p.metricas.minutosTardeTotales} min</p></div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                <div>
                  <h5 className="font-black text-emerald-600 mb-3 flex items-center justify-between border-b border-emerald-100 pb-2 text-xs uppercase tracking-wider">Percepciones (+)<button onClick={() => agregarDinamico(idxEmp, 'ingreso')} className="text-emerald-500 hover:text-emerald-700 bg-emerald-50 p-1 rounded-md"><PlusCircle size={16}/></button></h5>
                  <div className="space-y-2 mb-4">
                    {p.ingresos.map((ing, iItem) => (
                      <div key={`base-in-${iItem}`} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100 shadow-sm gap-2">
                        <span className="w-2/3 truncate pl-2 text-[10px] uppercase text-emerald-800 font-bold" title={ing.concepto}>{ing.concepto}</span>
                        <div className="flex items-center">
                          <span className="text-emerald-500 font-black mr-1">$</span>
                          <input 
                            type="number" 
                            value={ing.monto} 
                            onChange={e => modificarBase(idxEmp, 'ingreso', iItem, e.target.value)} 
                            className="w-20 bg-white border border-emerald-200 rounded-lg p-1.5 text-xs font-black text-emerald-700 text-center outline-none focus:border-emerald-400 transition" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {p.nuevos_ingresos.map((ni, iItem) => (
                    <div key={iItem} className="flex gap-2 mt-2 items-center animate-in slide-in-from-left">
                      <input type="text" placeholder="Concepto" value={ni.concepto} onChange={e => modificarDinamico(idxEmp, 'ingreso', iItem, 'concepto', e.target.value)} className="flex-1 bg-white border border-emerald-200 rounded-lg p-2 text-xs font-bold outline-none" />
                      <input type="number" placeholder="$" value={ni.monto || ''} onChange={e => modificarDinamico(idxEmp, 'ingreso', iItem, 'monto', e.target.value)} className="w-24 bg-white border border-emerald-200 rounded-lg p-2 text-xs font-black text-emerald-700 text-center" />
                      <button onClick={() => eliminarDinamico(idxEmp, 'ingreso', iItem)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>

                <div>
                  <h5 className="font-black text-red-500 mb-3 flex items-center justify-between border-b border-red-100 pb-2 text-xs uppercase tracking-wider">Deducciones / Retenciones (-)<button onClick={() => agregarDinamico(idxEmp, 'egreso')} className="text-red-400 hover:text-red-600 bg-red-50 p-1 rounded-md"><PlusCircle size={16}/></button></h5>
                  {p.egresos.length === 0 && p.nuevos_egresos.length === 0 && <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100 text-center font-medium">No hay deducciones aplicadas.</p>}
                  <div className="space-y-2 mb-4">
                     {p.egresos.map((eg, iItem) => (
                       <div key={`base-eg-${iItem}`} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100 shadow-sm gap-2">
                         <span className="w-2/3 truncate pl-2 text-[10px] uppercase text-red-800 font-bold" title={eg.concepto}>{eg.concepto}</span>
                         <div className="flex items-center">
                           <span className="text-red-500 font-black mr-1">-$</span>
                           <input 
                             type="number" 
                             value={eg.monto} 
                             onChange={e => modificarBase(idxEmp, 'egreso', iItem, e.target.value)} 
                             className="w-20 bg-white border border-red-200 rounded-lg p-1.5 text-xs font-black text-red-700 text-center outline-none focus:border-red-400 transition" 
                           />
                         </div>
                       </div>
                     ))}
                  </div>
                  {p.nuevos_egresos.map((ne, iItem) => (
                    <div key={iItem} className="flex gap-2 mt-2 items-center animate-in slide-in-from-left">
                      <input type="text" placeholder="Concepto" value={ne.concepto} onChange={e => modificarDinamico(idxEmp, 'egreso', iItem, 'concepto', e.target.value)} className="flex-1 bg-white border border-red-200 rounded-lg p-2 text-xs font-bold outline-none" />
                      <input type="number" placeholder="$" value={ne.monto || ''} onChange={e => modificarDinamico(idxEmp, 'egreso', iItem, 'monto', e.target.value)} className="w-24 bg-white border border-red-200 rounded-lg p-2 text-xs font-black text-red-700 text-center" />
                      <button onClick={() => eliminarDinamico(idxEmp, 'egreso', iItem)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          ))}

          <button onClick={guardarCorteNomina} disabled={isSubmitting} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black text-xl py-6 rounded-2xl shadow-xl flex justify-center items-center gap-3 transition transform active:scale-95 disabled:opacity-50 mt-8">
            <CheckCircle2 size={28} /> ...Aprobar, Bloquear Días y Finalizar Nómina
          </button>
        </div>
      )}
    </div>
  );
};

export default NominaGenerar;