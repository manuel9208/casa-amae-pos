import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, PlusCircle, Trash2, Gift, Clock, Banknote, Sun, Cake, Users, Filter, CheckSquare, Square } from 'lucide-react';

const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);

const obtenerDiaNum = (diaVal) => {
    if (diaVal === null || diaVal === undefined || String(diaVal).trim() === '') return -1;
    const t = String(diaVal).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    if (!isNaN(t) && t >= 0 && t <= 6) return Number(t);
    if (t.includes('dom')) return 0;
    if (t.includes('lun')) return 1;
    if (t.includes('mar')) return 2;
    if (t.includes('mie')) return 3;
    if (t.includes('jue')) return 4;
    if (t.includes('vie')) return 5;
    if (t.includes('sab')) return 6;
    return -1;
};

const getLocalTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const NominaGenerar = ({ usuariosDB, apiUrl, showAlert, showConfirm }) => {
  const hoyStr = getLocalTodayStr();
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preNomina, setPreNomina] = useState([]);
  
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);
  const [filtroRolMasivo, setFiltroRolMasivo] = useState('');

  const [configGlobal, setConfigGlobal] = useState({});
  const [reglasNomina, setReglasNomina] = useState({
    bono_limpieza_activo: false, bono_limpieza_monto: 0, limpieza_omisiones_permitidas: 0,
    bono_puntualidad_eventos_activo: false, bono_puntualidad_eventos_monto: 0, puntualidad_eventos_tolerancia_minutos: 15, puntualidad_eventos_retardos_permitidos: 0,
    bono_puntualidad_estricta_activo: false, bono_puntualidad_estricta_monto: 0, puntualidad_estricta_limite_minutos_semana: 15,
    bono_observaciones_activo: false, bono_observaciones_monto: 0, bono_observaciones_tolerancia: 0,
    descuento_descanso_activo: true, prima_dominical_activa: true,
    retencion_isr_activa: false, porcentaje_isr: 0, retencion_imss_activa: false, porcentaje_imss: 0
  });

  const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global').sort((a, b) => a.nombre.localeCompare(b.nombre));
  const rolesDisponibles = [...new Set(empleadosVisibles.map(u => u.rol))];

  useEffect(() => {
    if (empleadosVisibles.length > 0 && empleadosSeleccionados.length === 0) {
      setEmpleadosSeleccionados(empleadosVisibles.map(e => e.id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuariosDB]);

  useEffect(() => {
    fetch(`${apiUrl}/configuracion`).then(res => res.json()).then(data => {
      if (data) {
        setConfigGlobal(data);
        const matriz = typeof data.matriz_limpieza === 'string' ? JSON.parse(data.matriz_limpieza || '{}') : (data.matriz_limpieza || {});
        if (matriz.reglas_nomina) setReglasNomina(prev => ({ ...prev, ...matriz.reglas_nomina }));
      }
    });
  }, [apiUrl]);

  const empleadosFiltrados = filtroRolMasivo ? empleadosVisibles.filter(u => u.rol === filtroRolMasivo) : empleadosVisibles;
  const todosFiltradosSeleccionados = empleadosFiltrados.length > 0 && empleadosFiltrados.every(e => empleadosSeleccionados.includes(e.id));

  const toggleSeleccionMasiva = () => {
    if (todosFiltradosSeleccionados) {
      setEmpleadosSeleccionados(prev => prev.filter(id => !empleadosFiltrados.find(e => e.id === id)));
    } else {
      const nuevos = empleadosFiltrados.map(e => e.id).filter(id => !empleadosSeleccionados.includes(id));
      setEmpleadosSeleccionados(prev => [...prev, ...nuevos]);
    }
  };

  const calcularNomina = async () => {
    if (empleadosSeleccionados.length === 0) return showAlert("Aviso", "Selecciona al menos un empleado para generar la nómina.", "warning");
    if (!fechaInicio || !fechaFin) return showAlert("Aviso", "Selecciona fecha de Inicio y Fin.", "info");
    if (fechaInicio > fechaFin) return showAlert("Aviso", "La fecha de inicio no puede ser mayor a la fecha fin.", "error");

    setIsSubmitting(true);
    try {
      const resHist = await fetch(`${apiUrl}/usuarios/rendimiento?periodo=anio&fecha=${fechaInicio.substring(0,4)}-01-01`);
      const dataHist = resHist.ok ? await resHist.json() : {};
      const historial = dataHist.historialAsistencias || [];

      const matrizLimpieza = typeof configGlobal.matriz_limpieza === 'string' ? JSON.parse(configGlobal.matriz_limpieza || '{}') : (configGlobal.matriz_limpieza || {});
      const evaluacionesLimpieza = matrizLimpieza.evaluaciones || {};
      
      const matrizObservaciones = typeof configGlobal.matriz_observaciones === 'string' ? JSON.parse(configGlobal.matriz_observaciones || '{}') : (configGlobal.matriz_observaciones || {});
      const evaluacionesObservaciones = matrizObservaciones.evaluaciones || {};

      const horSemanaGlobal = typeof configGlobal.horarios_semana === 'string' ? JSON.parse(configGlobal.horarios_semana || '{}') : (configGlobal.horarios_semana || {});
      const diasCerradosLocal = Object.keys(horSemanaGlobal).filter(dia => horSemanaGlobal[dia].activo === false || horSemanaGlobal[dia].activo === 'false');

      const resultados = [];
      const empleadosYaPagados = [];
      const hoyStrCalculo = getLocalTodayStr();

      const gApertura = String(configGlobal.hora_apertura || 17).padStart(2, '0') + ':00';
      const gCierre = String(configGlobal.hora_cierre || 23).padStart(2, '0') + ':00';  

      for (const emp of empleadosVisibles) {
        if (!empleadosSeleccionados.includes(emp.id)) continue;

        const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
        if (pres.generar_nomina === false) continue;  

        const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        
        let rawDescansos = [];
        let pd = pres.dias_descanso;
        if (typeof pd === 'string') {
            try { pd = JSON.parse(pd); } catch(e) { pd = pd.split(','); }
        }
        if (Array.isArray(pd)) { rawDescansos = pd; } 
        else if (typeof pres.dia_descanso === 'string' && pres.dia_descanso !== 'Ninguno') { rawDescansos = pres.dia_descanso.split(','); }
        
        const arrDescansosNum = rawDescansos.map(obtenerDiaNum).filter(n => n !== -1);  
        
        let rawNoLab = [];
        let nl = pres.dias_no_laborales;
        if (typeof nl === 'string') {
            try { nl = JSON.parse(nl); } catch(e) { nl = nl.split(','); }
        }
        if (Array.isArray(nl)) rawNoLab = nl;
        const arrNoLaboralesNum = rawNoLab.map(obtenerDiaNum).filter(n => n !== -1);

        // CÁLCULO DE LA SEMANA ACTIVA EXACTA (Por ej. Si descansan 3, su semana laboral es de 4)
        let conteoNoLaborales = 0;
        for (let i = 0; i <= 6; i++) {
           if (arrNoLaboralesNum.includes(i) || diasCerradosLocal.map(obtenerDiaNum).includes(i)) {
               conteoNoLaborales++;
           }
        }
        const diasActivosSemanales = Math.max(1, 7 - conteoNoLaborales);

        let diasAsistidos = 0;
        let diasProgramados = 0;
        let diasVacaciones = 0;
        let diasDescanso = 0;
        let domingosTrabajados = 0;
        let horasTrabajadasTotales = 0;
        const diasAuditados = [];
        const alertasEmpleado = [];  

        let diasApoyoTrabajados = 0;
        const tarifaApoyoDia = Number(pres.tarifa_apoyo_dia) || 0;

        let fallasLimpieza = 0;
        let fallasObservaciones = 0; 
        let eventosTarde = 0;
        let minutesTardeTotales = 0;
        let diasFaltaInjustificada = 0;  

        let diasEnRango = 0;
        let diasYaPagados = 0;

        let currentDate = new Date(fechaInicio + 'T12:00:00');
        const endDate = new Date(fechaFin + 'T12:00:00');  

        if (pres.fecha_ingreso) {
          const fIng = new Date(pres.fecha_ingreso + 'T12:00:00');
          if (fIng.getMonth() === currentDate.getMonth() && fIng.getFullYear() < currentDate.getFullYear()) {
            alertasEmpleado.push({ tipo: 'aniversario', idUnico: `ani-${emp.id}`, fecha: currentDate.toISOString().split('T')[0], msg: `🎉 Aniversario de trabajo detectado (Ingresó en ${fIng.getFullYear()}). Recuerda revisar sus vacaciones.`, resuelta: false, estadoAuditoria: 'aprobado' });
          }
        }  

        while (currentDate <= endDate) {
          diasEnRango++;
          
          const yyyy = currentDate.getFullYear();
          const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
          const dd = String(currentDate.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          
          const diaSemanaNum = currentDate.getDay(); 
          const esDomingo = diaSemanaNum === 0;  

          if (pres.fecha_nacimiento && !alertasEmpleado.some(a => a.tipo === 'cumpleaños')) {
            const fBday = new Date(pres.fecha_nacimiento + 'T12:00:00');
            if (currentDate.getMonth() === fBday.getMonth() && currentDate.getDate() === fBday.getDate()) {
              alertasEmpleado.push({ tipo: 'cumpleaños', idUnico: `cumple-${dateStr}`, fecha: dateStr, msg: `🎂 ¡Cumpleaños detectado! ¿Deseas agregarle un bono festivo?`, resuelta: false, estadoAuditoria: 'aprobado' });
            }
          }  

          if (hor[dateStr]?.nomina_pagada === true) {
            diasYaPagados++;
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
          }  

          // --- MOTOR BLINDADO DE DÍAS (IGNORA CONFIGURACIONES GLOBALES CONTAMINADAS) ---
          const esDescansoFicha = arrDescansosNum.includes(diaSemanaNum);
          const esNoLaboralFicha = arrNoLaboralesNum.includes(diaSemanaNum) || diasCerradosLocal.map(obtenerDiaNum).includes(diaSemanaNum);

          let esDescanso = esDescansoFicha;
          let esNoLaboral = esNoLaboralFicha;
          let esDiaLaboral = !esDescanso && !esNoLaboral;

          // Solo permitimos override en Días Específicos (Ej. "2024-11-20")
          if (hor[dateStr] !== undefined && Object.keys(hor[dateStr]).length > 0) {
             const hs = hor[dateStr];
             if (hs.es_descanso !== undefined) {
                 esDescanso = hs.es_descanso;
                 if (esDescanso) { esNoLaboral = false; esDiaLaboral = false; }
             }
             if (hs.activo !== undefined) {
                 if (hs.activo) {
                     esDescanso = false; esNoLaboral = false; esDiaLaboral = true;
                 } else if (!esDescanso) {
                     esNoLaboral = true; esDiaLaboral = false;
                 }
             }
          }

          const auditoriaDia = hor[dateStr]?.auditoria || {};
          const checkinsDelDia = historial.filter(h => String(h.usuario_id) === String(emp.id) && h.fecha && String(h.fecha).startsWith(dateStr));  

          const tEntradaOficial = hor[dateStr]?.entrada || gApertura;
          const tSalidaOficial = hor[dateStr]?.salida || gCierre;

          if (hor[dateStr]?.vacaciones === true) {
             diasProgramados++;
             diasAsistidos++; 
             diasVacaciones++; 
             diasAuditados.push(dateStr); 
             horasTrabajadasTotales += 8; 
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
              } else { tieneNullSalida = true; }
            }  

            const [hE, mE] = tEntradaOficial.split(':').map(Number);
            let dEntradaLimite = new Date(dateStr + 'T00:00:00');
            dEntradaLimite.setHours(hE, mE, 0, 0);
            dEntradaLimite.setMinutes(dEntradaLimite.getMinutes() + (Number(reglasNomina.puntualidad_eventos_tolerancia_minutos) || 15));

            const esRetardo = minEntrada > dEntradaLimite;
            let olvidoSalida = tieneNullSalida && checkinsDelDia.some(h => h.olvido_salida === true);
            if (esRetardo) { eventosTarde++; }  

            let hrsOficiales = 8;
            const [hS, mS] = tSalidaOficial.split(':').map(Number);
            let minutosTurno = (hS * 60 + mS) - (hE * 60 + mE);
            if (minutosTurno < 0) minutosTurno += 24 * 60;
            if (minutosTurno > 0) hrsOficiales = minutosTurno / 60;  

            let minsDetectados = 0;
            if (maxSalida && minEntrada) { 
                minsDetectados = (maxSalida - minEntrada) / 60000; 
            } else if (minEntrada && olvidoSalida) {
                const [hC, mC] = tSalidaOficial.split(':').map(Number);
                let dCierre = new Date(dateStr + 'T00:00:00');
                dCierre.setHours(hC, mC, 0, 0);
                if (dCierre < minEntrada) dCierre.setDate(dCierre.getDate() + 1);
                minsDetectados = (dCierre - minEntrada) / 60000;
            }
            let horasDetectadas = minsDetectados / 60;  

            let estadoAudParsed = { estado: 'pendiente' };
            if (auditoriaDia['auditoria_turno']) {
              try { estadoAudParsed = JSON.parse(auditoriaDia['auditoria_turno']); } catch(e) { estadoAudParsed = { estado: auditoriaDia['auditoria_turno'] }; }
            }  

            let requiereAuditoria = false;
            let motivosAnomalia = [];
            let horasFinalesAprobadas = horasDetectadas;
            let hrsExt = 0;
            let hrsFaltantes = 0;  

            if (esRetardo) { motivosAnomalia.push("Llegada Tarde"); requiereAuditoria = true; }
            if (olvidoSalida) { motivosAnomalia.push("Olvidó Marcar Salida"); requiereAuditoria = true; }

            if (esDescanso || esNoLaboral) {
                requiereAuditoria = true;
                
                if (esDescanso) {
                    motivosAnomalia.push("Trabajó en su Descanso");
                    diasProgramados++;
                    diasDescanso++;
                    horasTrabajadasTotales += 8; 
                    
                    if (estadoAudParsed.estado === 'aprobado' && estadoAudParsed.horasAprobadas !== undefined) {
                        hrsExt = Number(estadoAudParsed.horasAprobadas);
                    } else if (estadoAudParsed.estado === 'rechazado') {
                        hrsExt = 0;
                    } else {
                        hrsExt = horasDetectadas;
                    }
                } else {
                    motivosAnomalia.push("Turno Extra (Día de Apoyo)");
                    if (estadoAudParsed.estado === 'aprobado') {
                        diasApoyoTrabajados++; 
                        hrsExt = 0; 
                    } else {
                        hrsExt = 0;
                    }
                }
                horasFinalesAprobadas = 0; 
            } else {
                diasProgramados++;
                
                if (!olvidoSalida && Math.abs(horasDetectadas - hrsOficiales) > 0.5) requiereAuditoria = true;
                if (!olvidoSalida && horasDetectadas > hrsOficiales + 0.5) motivosAnomalia.push("Exceso de Horas");
                if (!olvidoSalida && horasDetectadas < hrsOficiales - 0.5) motivosAnomalia.push("Jornada Incompleta");  

                if (estadoAudParsed.estado === 'aprobado' && estadoAudParsed.horasAprobadas !== undefined) {
                  horasFinalesAprobadas = Number(estadoAudParsed.horasAprobadas);
                  olvidoSalida = false;
                  if (esRetardo) {
                    const dOficial = new Date(dateStr + 'T' + tEntradaOficial);
                    minutesTardeTotales += Math.max(0, (minEntrada - dOficial) / 60000);
                  }
                } else if (estadoAudParsed.estado === 'rechazado') {
                  horasFinalesAprobadas = 0;
                } else if (olvidoSalida) {
                  horasFinalesAprobadas = 0;
                } else {
                  if (esRetardo) {
                    const dOficial = new Date(dateStr + 'T' + tEntradaOficial);
                    minutesTardeTotales += Math.max(0, (minEntrada - dOficial) / 60000);
                  }
                }  

                if (estadoAudParsed.estado !== 'rechazado' && !olvidoSalida) {
                  if (horasFinalesAprobadas > hrsOficiales + 0.25) hrsExt = (horasFinalesAprobadas - hrsOficiales).toFixed(2);
                  if (horasFinalesAprobadas < hrsOficiales - 0.25) hrsFaltantes = (hrsOficiales - horasFinalesAprobadas).toFixed(2);
                }  

                horasTrabajadasTotales += horasFinalesAprobadas;
                diasAsistidos++;
            }

            if ((olvidoSalida || requiereAuditoria) && estadoAudParsed.estado !== 'aprobado') {
              const horasSugeridas = (esDescanso || esNoLaboral) ? horasDetectadas : (horasFinalesAprobadas === 0 ? horasDetectadas : horasFinalesAprobadas);
              alertasEmpleado.push({ 
                  tipo: 'auditoria_turno', 
                  idUnico: `turno-${dateStr}`, 
                  fecha: dateStr, 
                  msg: motivosAnomalia.join(' | '), 
                  estadoAuditoria: estadoAudParsed.estado, 
                  resuelta: estadoAudParsed.estado === 'aprobado' || estadoAudParsed.estado === 'rechazado', 
                  hrsAuditadas: horasSugeridas, 
                  hrsExt: Number(hrsExt), 
                  hrsFaltantes: Number(hrsFaltantes),
                  esDiaApoyo: esNoLaboral 
              });
            }  

            diasAuditados.push(dateStr);
            if (esDomingo) domingosTrabajados++;  

          } else {
            // NO ASISTIÓ
            const isPastOrToday = new Date(dateStr + 'T12:00:00') <= new Date(hoyStrCalculo + 'T12:00:00');
            
            if (isPastOrToday) {
               if (esDiaLaboral) {
                  let estadoFaltaParsed = { estado: 'pendiente' };
                  if (auditoriaDia['falta']) {
                    try { estadoFaltaParsed = JSON.parse(auditoriaDia['falta']); } catch(e) { estadoFaltaParsed = { estado: auditoriaDia['falta'] }; }
                  }  
                  
                  if (estadoFaltaParsed.estado === 'aprobado') {
                    diasProgramados++;
                    horasTrabajadasTotales += 8;
                    diasAuditados.push(dateStr);
                  } else {
                    // FUNDAMOS LA BASE SALARIAL PARA PODER APLICAR EL DESCUENTO LIMPIO
                    diasProgramados++;
                    horasTrabajadasTotales += 8;
                    diasFaltaInjustificada++;
                    alertasEmpleado.push({ tipo: 'falta', idUnico: `falta-${dateStr}`, fecha: dateStr, msg: `⚠️ Falta Injustificada.`, estadoAuditoria: estadoFaltaParsed.estado, resuelta: estadoFaltaParsed.estado === 'rechazado' });
                    diasAuditados.push(dateStr);
                  }
               } else if (esDescanso) {
                  diasProgramados++;
                  diasDescanso++;
                  horasTrabajadasTotales += 8; 
                  diasAuditados.push(dateStr);
               } else if (esNoLaboral) {
                  diasAuditados.push(dateStr);
               }
            } else {
               if (esDiaLaboral) {
                  diasProgramados++;
                  horasTrabajadasTotales += 8;
                  diasAuditados.push(dateStr);
               } else if (esDescanso) {
                  diasProgramados++;
                  diasDescanso++;
                  horasTrabajadasTotales += 8; 
                  diasAuditados.push(dateStr);
               } else if (esNoLaboral) {
                  diasAuditados.push(dateStr);
               }
            }
          }

          // Auditorías de Limpieza y Observaciones
          for (const area of Object.keys(matrizLimpieza.asignaciones || {})) {
            const asignadosEnFecha = matrizLimpieza.asignaciones[area]?.[dateStr] || [];
            if (asignadosEnFecha.map(String).includes(String(emp.id))) {
              const val = evaluacionesLimpieza[area]?.[dateStr];
              const status = typeof val === 'string' ? val : val?.[emp.id];
              if (status === 'no_cumplio') fallasLimpieza++;
            }
          }

          for (const obs of Object.keys(matrizObservaciones.asignaciones || {})) {
            const asignadosEnFecha = matrizObservaciones.asignaciones[obs]?.[dateStr] || [];
            if (asignadosEnFecha.map(String).includes(String(emp.id))) {
              const val = evaluacionesObservaciones[obs]?.[dateStr];
              const status = typeof val === 'string' ? val : val?.[emp.id];
              if (status === 'no_cumplio') fallasObservaciones++;
            }
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }  

        if (diasEnRango > 0 && diasYaPagados === diasEnRango) {
            empleadosYaPagados.push(emp.nombre);
            continue;
        }

        const sueldoBase = Number(pres.sueldo_base) || 0;
        let ingresoSueldo = 0;
        let sueldoDiarioExacto = 0;  
        
        let tipoSueldoAplicado = pres.tipo_sueldo;

        // SWITCH DINÁMICO EXACTO: Si suma menos de 5 días de trabajo, se pasa a tarifa por hora.
        if (tipoSueldoAplicado === 'Semanal') {
            if (diasProgramados > 0 && diasProgramados < 5) {
                tipoSueldoAplicado = 'Por Hora (Auto)';
            } else if (diasProgramados === 0) {
                tipoSueldoAplicado = 'Sin Asistencia';
            }
        }

        if (tipoSueldoAplicado === 'Diario') { 
            sueldoDiarioExacto = sueldoBase; 
            ingresoSueldo = sueldoBase * diasProgramados; 
        }
        else if (tipoSueldoAplicado === 'Por Hora') { 
            sueldoDiarioExacto = sueldoBase * 8; 
            ingresoSueldo = sueldoBase * horasTrabajadasTotales; 
        }
        else if (tipoSueldoAplicado === 'Por Hora (Auto)') {
            sueldoDiarioExacto = sueldoBase / diasActivosSemanales;
            const tarifaPorHora = sueldoDiarioExacto / 8;
            ingresoSueldo = tarifaPorHora * horasTrabajadasTotales;
        }
        else if (tipoSueldoAplicado === 'Semanal') { 
            sueldoDiarioExacto = sueldoBase / diasActivosSemanales; 
            ingresoSueldo = sueldoDiarioExacto * diasProgramados; 
        }
        else if (tipoSueldoAplicado === 'Quincenal') { 
            sueldoDiarioExacto = (sueldoBase / 2) / diasActivosSemanales; 
            ingresoSueldo = sueldoDiarioExacto * diasProgramados; 
        }
        else if (tipoSueldoAplicado === 'Mensual') { 
            sueldoDiarioExacto = (sueldoBase / 4) / diasActivosSemanales; 
            ingresoSueldo = sueldoDiarioExacto * diasProgramados; 
        }
        else if (tipoSueldoAplicado === 'Sin Asistencia') {
            sueldoDiarioExacto = sueldoBase / diasActivosSemanales; 
            ingresoSueldo = 0; 
        }

        const ingresosList = [];
        const egresosList = [];  

        if (tipoSueldoAplicado === 'Por Hora') {
          ingresosList.push({ concepto: `Sueldo Base (${horasTrabajadasTotales.toFixed(2)} Hrs Auditadas)`, monto: ingresoSueldo, es_sueldo_base: true });
        } else if (tipoSueldoAplicado === 'Por Hora (Auto)') {
          ingresosList.push({ concepto: `Sueldo Proporcional Horas (${horasTrabajadasTotales.toFixed(2)} Hrs)`, monto: ingresoSueldo, es_sueldo_base: true });
        } else {
          ingresosList.push({ concepto: `Sueldo Base Proporcional (${diasProgramados} días evaluados)`, monto: ingresoSueldo, es_sueldo_base: true });
        }

        if (diasApoyoTrabajados > 0) {
            ingresosList.push({ concepto: `Turnos de Apoyo / Comodín (${diasApoyoTrabajados} días x $${tarifaApoyoDia})`, monto: diasApoyoTrabajados * tarifaApoyoDia, es_apoyo: true });
        }

        if (diasFaltaInjustificada > 0) {
          let diasADescontar = diasFaltaInjustificada;
          if (reglasNomina.descuento_descanso_activo && !['Diario', 'Por Hora', 'Por Hora (Auto)', 'Sin Asistencia'].includes(tipoSueldoAplicado)) {
            diasADescontar += (diasFaltaInjustificada * 0.16666);
          }
          const descuentoMonto = sueldoDiarioExacto * diasADescontar;
          egresosList.push({ concepto: `Descuento Faltas Injustificadas (${diasADescontar.toFixed(2)} días efectivos)`, monto: descuentoMonto, es_falta: true });
        }  

        if (reglasNomina.prima_dominical_activa && domingosTrabajados > 0) {
          const montoPrima = (sueldoDiarioExacto * (reglasNomina.prima_dominical_porcentaje / 100)) * domingosTrabajados;
          ingresosList.push({ concepto: `Prima Dominical (${reglasNomina.prima_dominical_porcentaje}% x ${domingosTrabajados} Dom)`, monto: montoPrima });
        }  

        let perdioPuntualidad = false;
        let motivoPuntualidad = "Perfecta";  

        if ((diasProgramados > 0 || diasApoyoTrabajados > 0) && diasFaltaInjustificada === 0) {
            
            if (reglasNomina.bono_puntualidad_activo && !perdioPuntualidad && eventosTarde > (reglasNomina.puntualidad_eventos_retardos_permitidos || 0)) {
              perdioPuntualidad = true; motivoPuntualidad = `Perdido: Acumuló ${eventosTarde} retardos.`;
            }
            if (reglasNomina.bono_puntualidad_estricta_activo && !perdioPuntualidad && minutesTardeTotales > (reglasNomina.puntualidad_estricta_limite_minutos_semana || 0)) {
              perdioPuntualidad = true; motivoPuntualidad = `Perdido: Acumuló ${minutesTardeTotales.toFixed(0)} mins tarde.`;
            }
            
            if (!perdioPuntualidad && reglasNomina.bono_puntualidad_activo) {
              ingresosList.push({ concepto: `Bono de Puntualidad (Por Ley / Regla)`, monto: reglasNomina.bono_puntualidad_monto || 0 });
            } else if (!perdioPuntualidad && reglasNomina.bono_puntualidad_estricta_activo) {
              ingresosList.push({ concepto: `Bono Estricto Puntualidad`, monto: reglasNomina.bono_puntualidad_estricta_monto || 0 });
            }  

            if (reglasNomina.bono_limpieza_activo) {
              if (fallasLimpieza <= (Number(reglasNomina.limpieza_omisiones_permitidas) || 0)) {
                ingresosList.push({ concepto: `Bono de Limpieza (${fallasLimpieza} Faltas / Tol: ${reglasNomina.limpieza_omisiones_permitidas})`, monto: reglasNomina.bono_limpieza_monto || 0 });
              } else {
                alertasEmpleado.push({ tipo: 'observacion', idUnico: `limp-${emp.id}`, fecha: endDate.toISOString().split('T')[0], msg: `⚠️ Perdió bono limpieza. Acumuló ${fallasLimpieza} fallas.`, estadoAuditoria: 'rechazado', resuelta: true });
              }
            }

            if (reglasNomina.bono_observaciones_activo) {
              const toleranciaFallas = Number(reglasNomina.bono_observaciones_tolerancia) || 0;
              if (fallasObservaciones <= toleranciaFallas) {
                ingresosList.push({ concepto: `Bono Observaciones (${fallasObservaciones} fallas / Tol: ${toleranciaFallas})`, monto: reglasNomina.bono_observaciones_monto || 0 });
              } else {
                 alertasEmpleado.push({ tipo: 'observacion', idUnico: `obs-${emp.id}`, fecha: endDate.toISOString().split('T')[0], msg: `⚠️ Perdió bono de observaciones. Acumuló ${fallasObservaciones} fallas.`, estadoAuditoria: 'rechazado', resuelta: true });
              }
            }
        } else if (diasFaltaInjustificada > 0) {
            alertasEmpleado.push({ tipo: 'falta', idUnico: `falta-bono-${emp.id}`, fecha: endDate.toISOString().split('T')[0], msg: `⚠️ Perdió todos los bonos semanales por acumular ${diasFaltaInjustificada} falta(s) injustificada(s).`, estadoAuditoria: 'rechazado', resuelta: true });
        } 

        (pres.bonos_recurrentes || []).forEach(b => {
          if (b.activo) ingresosList.push({ concepto: `Bono Recurrente: ${b.concepto}`, monto: Number(b.monto) });
        });  

        (pres.prestamos || []).forEach(p => {
          if (p.activo && p.saldo_restante > 0) {
            const aDescontar = Math.min(Number(p.descuento_por_nomina), Number(p.saldo_restante));
            egresosList.push({ concepto: `Abono Préstamo: ${p.concepto}`, monto: aDescontar, prestamo_id: p.id }); 
          }
        });  

        if (reglasNomina.retencion_isr_activa && reglasNomina.porcentaje_isr > 0) {
           const descuentoISR = (ingresoSueldo + (diasApoyoTrabajados * tarifaApoyoDia)) * (reglasNomina.porcentaje_isr / 100);
           egresosList.push({ concepto: `Retención de ISR (${reglasNomina.porcentaje_isr}%)`, monto: descuentoISR });
        }
        if (reglasNomina.retencion_imss_activa && reglasNomina.porcentaje_imss > 0) {
           const descuentoIMSS = (ingresoSueldo + (diasApoyoTrabajados * tarifaApoyoDia)) * (reglasNomina.porcentaje_imss / 100);
           egresosList.push({ concepto: `Cuota Obrero IMSS (${reglasNomina.porcentaje_imss}%)`, monto: descuentoIMSS });
        }

        const sumIn = ingresosList.reduce((acc, curr) => acc + curr.monto, 0);
        const sumEg = egresosList.reduce((acc, curr) => acc + curr.monto, 0);

        resultados.push({
          empleado_id: emp.id,
          nombre: emp.nombre,
          nombre_completo: pres.nombre_completo || emp.nombre,
          rol: emp.rol,
          sueldo_base: pres.sueldo_base,
          tipo_sueldo: tipoSueldoAplicado,
          ingresos: ingresosList,
          egresos: egresosList,
          nuevos_ingresos: [],
          nuevos_egresos: [],
          total_ingresos: sumIn,
          total_egresos: sumEg,
          neto: sumIn - sumEg,
          diasAuditados,
          metricas: { 
              diasAsistidos, diasProgramados, diasVacaciones, diasDescanso, horasTrabajadasTotales, 
              diasFaltaInjustificada, faltasJustificadas: 0, eventosTarde, fallasLimpieza, fallasObservaciones, 
              sueldoDiarioExacto, perdioPuntualidad, motivoPuntualidad, alertasEmpleado, 
              tarifaApoyoDia, diasApoyoTrabajados,
              prestamosAplicados: egresosList.filter(e => e.prestamo_id).map(e => ({ id: e.prestamo_id, descontado: e.monto })),
              porcentaje_isr: reglasNomina.retencion_isr_activa ? reglasNomina.porcentaje_isr : 0,
              porcentaje_imss: reglasNomina.retencion_imss_activa ? reglasNomina.porcentaje_imss : 0
          }
        });
      }  

      if (empleadosYaPagados.length > 0) {
         showAlert("Empleados Omitidos", `Los siguientes empleados ya tienen su nómina 100% pagada en ese rango exacto de fechas, por lo que fueron saltados:\n\n${empleadosYaPagados.join('\n')}`, "info");
      }

      setPreNomina(resultados);
      if (resultados.length > 0) {
         showAlert("¡Cálculo Finalizado!", "Revisa las alertas de cada empleado antes de emitir los pagos finales.", "success");
      }
    } catch(e) { 
      console.error(e);
      showAlert("Error", "Error al procesar matemáticas de la nómina.", "error"); 
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
      setPreNomina(prev => {
          const arr = [...prev];
          const alerta = arr[idxEmp].metricas.alertasEmpleado.find(a => a.idUnico === idUnico);
          if (alerta) alerta.resuelta = true;
          return arr;
      });
  };

  const justificarFalta = (idxEmp, alerta) => {
    const arr = [...preNomina];
    const p = arr[idxEmp];

    const alt = p.metricas.alertasEmpleado.find(a => a.idUnico === alerta.idUnico);
    if (alt) alt.resuelta = true;

    p.metricas.faltasJustificadas += 1;
    const faltasRestantes = Math.max(0, p.metricas.diasFaltaInjustificada - p.metricas.faltasJustificadas);

    let diasADescontar = faltasRestantes;
    if (configGlobal.reglas_nomina?.descuento_descanso_activo && !['Diario', 'Por Hora', 'Por Hora (Auto)', 'Sin Asistencia'].includes(p.tipo_sueldo)) {
        diasADescontar += (faltasRestantes * 0.16666);
    }
    const nuevoDescuento = p.metricas.sueldoDiarioExacto * diasADescontar;

    const egresoFalta = p.egresos.find(e => e.es_falta === true);
    if (egresoFalta) {
        if (nuevoDescuento > 0) {
            egresoFalta.monto = nuevoDescuento;
            egresoFalta.concepto = `Descuento Faltas (${diasADescontar.toFixed(2)} días efectivos)`;
        } else {
            p.egresos = p.egresos.filter(e => e.es_falta !== true);
        }
    }

    // Ya no es necesario sumar diasProgramados aquí porque ahora lo sumamos directamente desde la generación base de la falta
    const nuevoSueldo = p.metricas.sueldoDiarioExacto * p.metricas.diasProgramados;
    const ingresoBase = p.ingresos.find(i => i.es_sueldo_base === true);
    
    if (ingresoBase && !['Por Hora', 'Por Hora (Auto)', 'Sin Asistencia'].includes(p.tipo_sueldo)) {
        ingresoBase.monto = nuevoSueldo;
        ingresoBase.concepto = `Sueldo Base Proporcional (${p.metricas.diasProgramados} días evaluados)`;

        if (p.metricas.porcentaje_isr > 0) {
            const egISR = p.egresos.find(e => e.concepto.includes('Retención de ISR'));
            if (egISR) egISR.monto = nuevoSueldo * (p.metricas.porcentaje_isr / 100);
        }
        if (p.metricas.porcentaje_imss > 0) {
            const egIMSS = p.egresos.find(e => e.concepto.includes('Cuota Obrero IMSS'));
            if (egIMSS) egIMSS.monto = nuevoSueldo * (p.metricas.porcentaje_imss / 100);
        }
    }

    recalcularNeto(arr, idxEmp);
    showAlert("Falta Justificada", "La deducción disminuyó exitosamente.", "success");
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
     setPreNomina(prev => {
        const arr = [...prev];
        arr[idxEmp].metricas.horasExtrasAcumulables = (arr[idxEmp].metricas.horasExtrasAcumulables || 0) + alerta.hrsExt;
        return arr;
     });
     resolverAlerta(idxEmp, alerta.idUnico);
     showAlert("Horas Acumuladas", `Las horas se sumarán a su Banco de Horas al finalizar la nómina.`, "success");
  };

  const aprobarTurnoApoyo = (idxEmp, alerta) => {
      setPreNomina(prev => {
          const arr = [...prev];
          const p = arr[idxEmp];
          const tarifaApoyo = Number(p.metricas.tarifaApoyoDia) || 0;
          
          const alt = p.metricas.alertasEmpleado.find(a => a.idUnico === alerta.idUnico);
          if (alt) alt.resuelta = true;
          
          p.metricas.diasApoyoTrabajados = (p.metricas.diasApoyoTrabajados || 0) + 1;
          p.nuevos_ingresos.push({ concepto: `Turno Extra de Apoyo Aprobado (${alerta.fecha})`, monto: tarifaApoyo });
          
          const totInBase = p.ingresos.reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
          const totEgBase = p.egresos.reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
          const totInNew = p.nuevos_ingresos.reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
          const totEgNew = p.nuevos_egresos.reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
          
          p.total_ingresos = totInBase + totInNew;
          p.total_egresos = totEgBase + totEgNew;
          p.neto = p.total_ingresos - p.total_egresos;
          
          return arr;
      });
      showAlert("Turno Aprobado", `Se agregó el pago automático por apoyo extra al recibo.`, "success");
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
            (p.diasAuditados || []).forEach(diaPagado => { 
                if (!horNuevo[diaPagado]) horNuevo[diaPagado] = {}; 
                horNuevo[diaPagado].nomina_pagada = true; 
            });

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
            horasExtrasHistoricas += (p.metricas.horasExtrasAcumulables || 0);

            await fetch(`${apiUrl}/usuarios/${p.empleado_id}/prestaciones`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ prestaciones: { ...presActual, prestamos: nuevosPrestamos, horas_extras_acumuladas: horasExtrasHistoricas } }) 
            });
          }));
          showAlert("✅ Nómina Aprobada", "Recibos generados, préstamos cobrados y días bloqueados con éxito.", "success");
          setPreNomina([]); 
        }
      } catch(e) { 
        console.error("Error completo al procesar corte:", e);
        showAlert("Error", "Error al procesar la nómina.", "error"); 
      }
      setIsSubmitting(false);
    });
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        <Calculator className="text-blue-600" size={32}/>
        <div>
          <h3 className="text-2xl font-black text-slate-800">Generar Pre-Nómina</h3>
          <p className="text-sm font-bold text-slate-400">Selecciona empleados y rango de fechas. Solo se cobrarán los días "Por Pagar".</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
         <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-slate-700 flex items-center gap-2"><Users size={18}/> Selección de Empleados</h4>
            <button onClick={toggleSeleccionMasiva} className="text-xs font-bold bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg shadow-sm">
               {todosFiltradosSeleccionados ? 'Desmarcar Visibles' : 'Marcar Visibles'}
            </button>
         </div>
         
         <div className="flex gap-2 mb-4 overflow-x-auto pb-2 items-center custom-scrollbar">
            <Filter size={14} className="text-blue-400 shrink-0 mr-1"/>
            <button onClick={() => setFiltroRolMasivo('')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all whitespace-nowrap shadow-sm ${!filtroRolMasivo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}>Todos</button>
            {rolesDisponibles.map(rol => (
              <button key={rol} onClick={() => setFiltroRolMasivo(rol)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all whitespace-nowrap shadow-sm ${filtroRolMasivo === rol ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}>{rol}</button>
            ))}
         </div>

         <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
            {empleadosFiltrados.map(emp => {
              const seleccionado = empleadosSeleccionados.includes(emp.id);
              return (
                <button key={emp.id} onClick={() => setEmpleadosSeleccionados(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id])} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all border ${seleccionado ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                  {seleccionado ? <CheckSquare size={14}/> : <Square size={14}/>} {emp.nombre}
                </button>
              )
            })}
         </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div><label className="text-xs font-bold text-slate-500 uppercase">Desde el día</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black outline-none focus:border-blue-500" /></div>
        <div><label className="text-xs font-bold text-slate-500 uppercase">Hasta el día</label><input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black outline-none focus:border-blue-500" /></div>
      </div>

      <button disabled={isSubmitting} onClick={calcularNomina} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black shadow-lg mb-8 disabled:opacity-50 active:scale-95 transition transform flex items-center justify-center gap-2">
        {isSubmitting ? 'Procesando Matemáticas...' : <><Calculator size={20} /> Calcular Nómina Exacta</>}
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
                            {alerta.tipo === 'auditoria_turno' && !alerta.esDiaApoyo && (
                              <span className="text-[10px] text-slate-500 font-bold uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                 ⏱️ Turno: {Number(alerta.hrsAuditadas || 0).toFixed(2)} hrs
                              </span>
                            )}
                         </span>
                         
                         <div className="flex flex-col md:flex-row gap-2 md:items-center shrink-0">
                           
                           {alerta.estadoAuditoria === 'aprobado' ? null : alerta.estadoAuditoria === 'rechazado' ? null : (
                             <span className="bg-amber-100 text-amber-700 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border border-amber-200 text-center">
                               ⚠️ Pdte. Auditoría
                             </span>
                           )}

                           {alerta.tipo === 'falta' && !alerta.resuelta && (
                             <button onClick={() => justificarFalta(idxEmp, alerta)} className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-sm transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200`}>
                               Justificar Falta
                             </button>
                           )}

                           {alerta.tipo === 'auditoria_turno' && alerta.esDiaApoyo && !alerta.resuelta && (
                             <>
                                <button onClick={() => aprobarTurnoApoyo(idxEmp, alerta)} className="px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm transition bg-blue-600 text-white hover:bg-blue-700">Aprobar Apoyo</button>
                                <button onClick={() => resolverAlerta(idxEmp, alerta.idUnico)} className="px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm transition bg-slate-200 text-slate-700 hover:bg-slate-300">Rechazar</button>
                             </>
                           )}

                           {alerta.tipo === 'auditoria_turno' && !alerta.esDiaApoyo && alerta.hrsFaltantes > 0 && !alerta.resuelta && (
                             <button onClick={() => penalizarJornadaIncompleta(idxEmp, alerta)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm transition bg-red-600 text-white hover:bg-red-700`}>
                               Cobrar Descuento
                             </button>
                           )}

                           {alerta.tipo === 'auditoria_turno' && !alerta.esDiaApoyo && alerta.hrsExt > 0 && !alerta.resuelta && (
                             <>
                                <button onClick={() => pagarHorasExtrasEnEfectivo(idxEmp, alerta)} className={`px-2 py-1.5 rounded text-[10px] font-black shadow-sm transition bg-emerald-500 text-white hover:bg-emerald-600`}>
                                    Pagar Efectivo
                                </button>
                                <button onClick={() => acumularHorasExtrasABanco(idxEmp, alerta)} className={`px-2 py-1.5 rounded text-[10px] font-black shadow-sm transition bg-blue-600 text-white hover:bg-blue-700`}>
                                    A Banco Hrs
                                </button>
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
                <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Días Evaluados</p><p className="font-black text-slate-700 text-lg">{p.metricas.diasProgramados}</p></div>
                <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Pago Diario Exacto</p><p className="font-black text-blue-600 text-lg">{formaterMoneda(p.metricas.sueldoDiarioExacto)}</p></div>
                <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Días Apoyo</p><p className="font-black text-indigo-600 text-lg">{p.metricas.diasApoyoTrabajados || 0}</p></div>
                <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Eventos Tarde</p><p className="font-black text-amber-600 text-lg">{p.metricas.eventosTarde}</p></div>
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