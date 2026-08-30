// ==============================================================================
// MOTOR MATEMÁTICO DE NÓMINA (DETECCIÓN AUTOMÁTICA DE CONTRATOS ASIMÉTRICOS)
// ==============================================================================  

export const calcularSueldoDiarioInteligente = (sueldoBase, frecuencia, plantilla) => {
    const base = Number(sueldoBase) || 0;
    let divisorDias = 7;

    if (plantilla && typeof plantilla === 'object') {
        let diasPagados = 0;
        Object.values(plantilla).forEach(dia => {
            if (dia.activo || dia.es_descanso) diasPagados++;
        });
        if (diasPagados > 0) divisorDias = diasPagados;
    }

    switch (frecuencia) {
        case 'Mensual': return (base / 4.333) / divisorDias;
        case 'Quincenal': return (base / 2.166) / divisorDias;
        case 'Semanal': return base / divisorDias;
        case 'Por Día': return base;
        case 'Diario': return base;
        case 'Por Hora': return 0;
        default: return base / divisorDias;
    }
};  

export const calcularSueldoPorHora = (sueldoBase, frecuencia, plantilla) => {
    const base = Number(sueldoBase) || 0;
    let horasTotalesSemana = 0;
    let diasLaborales = 0;  

    Object.values(plantilla).forEach(dia => {
        if (dia.activo && dia.entrada && dia.salida) {
            diasLaborales++;
            const [hE, mE] = dia.entrada.split(':').map(Number);
            const [hS, mS] = dia.salida.split(':').map(Number);
            let mins = (hS * 60 + mS) - (hE * 60 + mE);
            if (mins < 0) mins += 24 * 60;
            horasTotalesSemana += (mins / 60);
        }
    });  

    Object.values(plantilla).forEach(dia => {
        if (dia.es_descanso) horasTotalesSemana += (horasTotalesSemana / (diasLaborales || 1));
    });  

    if (horasTotalesSemana === 0) horasTotalesSemana = 48;  

    if (frecuencia === 'Por Hora' || (horasTotalesSemana % 8 !== 0 && horasTotalesSemana < 48)) {
        return base / horasTotalesSemana;
    }  

    let sueldoSemanal = 0;
    switch (frecuencia) {
        case 'Mensual': sueldoSemanal = base / 4.333; break;
        case 'Quincenal': sueldoSemanal = base / 2.166; break;
        case 'Semanal': sueldoSemanal = base; break;
        case 'Por Día':
        case 'Diario': sueldoSemanal = base * (diasLaborales + Object.values(plantilla).filter(d=>d.es_descanso).length); break;
        default: sueldoSemanal = base; break;
    }  

    return sueldoSemanal / horasTotalesSemana;
};  

export const obtenerNombreDia = (fechaStr) => {
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const d = new Date(fechaStr + 'T12:00:00');
    let dayIndex = d.getDay() - 1;
    if (dayIndex === -1) dayIndex = 6;
    return dias[dayIndex];
};  

export const calcularMinutosTarde = (horaEntradaEsperada, horaEntradaRealISO) => {
    if (!horaEntradaEsperada || !horaEntradaRealISO) return 0;
    const [hE, mE] = horaEntradaEsperada.split(':').map(Number);
    const dateReal = new Date(horaEntradaRealISO);
    const timeStr = dateReal.toLocaleTimeString('en-US', { timeZone: 'America/Mazatlan', hour12: false });
    let [hR, mR] = timeStr.split(':').map(Number);
    if (hR === 24) hR = 0;
    const dif = (hR * 60 + mR) - (hE * 60 + mE);
    return dif > 0 ? dif : 0;
};  

const pagarEmpleadoSemanal = (horasReales, hrsProgramadasDia, sueldoDiarioFijo, edicionManualAdmin, sueldoPorHora) => {
    if (edicionManualAdmin) {
        return horasReales * sueldoPorHora;
    }  
    if (horasReales <= 0) return 0;  
    if (hrsProgramadasDia > 0 && horasReales < hrsProgramadasDia) {
        return sueldoDiarioFijo * (horasReales / hrsProgramadasDia);
    }
    return sueldoDiarioFijo;
};  

const pagarEmpleadoPorHora = (horasReales, sueldoPorHora) => {
    if (horasReales <= 0) return 0;
    return horasReales * sueldoPorHora;
};  

export const procesarMotorNomina = (empleado, asistenciasRango, fechasRango, reglasGlobales, justificaciones = {}) => {
    const prestaciones = typeof empleado.prestaciones === 'string' ? JSON.parse(empleado.prestaciones || '{}') : (empleado.prestaciones || {});
    const plantilla = typeof empleado.horario_semanal === 'string' ? JSON.parse(empleado.horario_semanal || '{}') : (empleado.horario_semanal || {});  

    const tipoSueldo = prestaciones.tipo_sueldo || 'Semanal';  
    const sueldoDiarioFijo = calcularSueldoDiarioInteligente(prestaciones.sueldo_base, tipoSueldo, plantilla);
    const sueldoPorHora = calcularSueldoPorHora(prestaciones.sueldo_base, tipoSueldo, plantilla);  

    let horasTotalesSemana = 0;
    Object.values(plantilla).forEach(dia => {
        if (dia.activo && dia.entrada && dia.salida) {
            const [hE, mE] = dia.entrada.split(':').map(Number);
            const [hS, mS] = dia.salida.split(':').map(Number);
            let mins = (hS * 60 + mS) - (hE * 60 + mE);
            if (mins < 0) mins += 24 * 60;
            horasTotalesSemana += (mins / 60);
        }
    });

    const esEmpleadoAsimetrico = (horasTotalesSemana % 8 !== 0 && horasTotalesSemana < 48);
    const tarifaApoyo = Number(prestaciones.tarifa_apoyo_dia) || (esEmpleadoAsimetrico ? (sueldoPorHora * 8) : sueldoDiarioFijo);  

    let metricas = { diasProgramados: 0, diasAsistidos: 0, faltasInjustificadas: 0, retardosEventos: 0, retardosMinutosGlobal: 0, diasDescansoLaborados: 0, domingosTrabajados: 0, diasInhabilesDeApoyo: 0, sueldoOrdinario: 0, horasProgramadasTotales: 0, diasSinChecarPagados: 0 };
    let alertas = []; let ingresos = []; let egresos = []; let diasDetalle = [];  

    fechasRango.forEach(fecha => {
        const diaSemana = obtenerNombreDia(fecha);
        const configDia = plantilla[diaSemana] || { activo: false, es_descanso: false };
        let asistenciaHoy = asistenciasRango.find(a => a.fecha === fecha);
        const justificacionActiva = justificaciones[`${empleado.id}-${fecha}`];  

        let hrsProgramadasDia = 0;
        if (configDia.activo && configDia.entrada && configDia.salida) {
            const [hE, mE] = configDia.entrada.split(':').map(Number);
            const [hS, mS] = configDia.salida.split(':').map(Number);
            let mins = (hS * 60 + mS) - (hE * 60 + mE);
            if (mins < 0) mins += 24 * 60;
            hrsProgramadasDia = mins / 60;
            metricas.horasProgramadasTotales += hrsProgramadasDia;
        }  

        if (justificacionActiva?.tipo === 'falta' && !asistenciaHoy) {
            asistenciaHoy = { hora_entrada: configDia.entrada || '08:00', hora_salida: configDia.salida || '16:00', fecha: fecha, simulada: true };
        }  

        let horasReales = 0;
        let salidaInvalidaOlvido = false;  

        if (asistenciaHoy && asistenciaHoy.hora_entrada) {
            const inTime = new Date(asistenciaHoy.hora_entrada).getTime();
            if (asistenciaHoy.hora_salida) {
                const outTime = new Date(asistenciaHoy.hora_salida).getTime();
                const diffHoras = (outTime - inTime) / 3600000;
                if (diffHoras < 0 || diffHoras > 14) { horasReales = 0; salidaInvalidaOlvido = true; }
                else { horasReales = diffHoras; }
            } else { salidaInvalidaOlvido = true; }
        }  

        let edicionManualAdmin = false;
        const horasManualesAdmin = justificaciones[`${empleado.id}-${fecha}-horas`];
        if (horasManualesAdmin !== undefined) {
            horasReales = Number(horasManualesAdmin);
            salidaInvalidaOlvido = false;
            edicionManualAdmin = true;
        }  

        const esDomingo = diaSemana === 'Domingo';
        let minTarde = 0;
        let esFalta = false;
        let requiereAprobacionApoyo = false;
        let pagoGeneradoDia = 0;  

        if (configDia.activo) {
            metricas.diasProgramados++;  
            if (asistenciaHoy || horasReales > 0) {
                metricas.diasAsistidos++;
                if (esDomingo) metricas.domingosTrabajados++;  

                if (tipoSueldo === 'Por Hora' || esEmpleadoAsimetrico) {
                    pagoGeneradoDia = pagarEmpleadoPorHora(horasReales, sueldoPorHora);
                } else {
                    pagoGeneradoDia = pagarEmpleadoSemanal(horasReales, hrsProgramadasDia, sueldoDiarioFijo, edicionManualAdmin, sueldoPorHora);
                }  
                metricas.sueldoOrdinario += pagoGeneradoDia;  

                if (asistenciaHoy?.hora_entrada && !asistenciaHoy.simulada) {
                    minTarde = calcularMinutosTarde(configDia.entrada, asistenciaHoy.hora_entrada);
                    if (justificacionActiva?.tipo === 'retardo') minTarde = 0;
                } else {
                    metricas.diasSinChecarPagados++;
                }

                if (minTarde > (reglasGlobales.puntualidad_eventos_tolerancia_minutos || 15)) {
                    metricas.retardosEventos++; metricas.retardosMinutosGlobal += minTarde;
                    alertas.push({ tipo: 'retardo', fecha, mensaje: `Llegó tarde ${minTarde} mins.`, gravedad: 'media' });
                }  

                if (salidaInvalidaOlvido && horasManualesAdmin === undefined) {
                    alertas.push({ tipo: 'salida_incompleta', fecha, mensaje: `Registro ilógico o sin salida.`, gravedad: 'alta' });
                } else if (horasReales > 0 && horasReales < (hrsProgramadasDia - 1) && horasManualesAdmin === undefined && !esEmpleadoAsimetrico) {
                    alertas.push({ tipo: 'jornada_incompleta', fecha, mensaje: `Jornada incompleta (${horasReales.toFixed(1)}h de ${hrsProgramadasDia.toFixed(1)}h).`, gravedad: 'media' });
                }
            } else {
                esFalta = true; metricas.faltasInjustificadas++; pagoGeneradoDia = 0;
                alertas.push({ tipo: 'falta', fecha, mensaje: `Falta Injustificada.`, gravedad: 'alta' });
            }
        }
        else {
            if (configDia.es_descanso) {
                pagoGeneradoDia = esEmpleadoAsimetrico ? 0 : sueldoDiarioFijo;
                metricas.sueldoOrdinario += pagoGeneradoDia;
            }  

            if (asistenciaHoy || horasReales > 0) {
                if (justificacionActiva?.tipo === 'aprobar_apoyo') {
                    let extraGenerado = (tipoSueldo === 'Por Hora' || esEmpleadoAsimetrico || edicionManualAdmin) ? (horasReales * sueldoPorHora) : tarifaApoyo;
                    pagoGeneradoDia += extraGenerado;
                    metricas.diasInhabilesDeApoyo++; if (esDomingo) metricas.domingosTrabajados++;
                    metricas.sueldoOrdinario += extraGenerado;
                } else if (justificacionActiva?.tipo === 'ignorar_apoyo') {
                    pagoGeneradoDia = configDia.es_descanso ? (esEmpleadoAsimetrico ? 0 : sueldoDiarioFijo) : 0;
                } else {
                    requiereAprobacionApoyo = true;
                    alertas.push({ tipo: 'apoyo_pendiente', fecha, mensaje: `Checó en día libre (${horasReales.toFixed(1)}h).`, gravedad: 'alta' });
                }
            }
        }  

        // 👇 NUEVA LÓGICA LFT: BONO POR DÍA FESTIVO TRABAJADO
        const calendario = reglasGlobales.calendario_anual || {};
        const esFestivo = calendario[fecha]?.tipo === 'festivo';

        if (esFestivo && (asistenciaHoy || horasReales > 0)) {
            // La LFT dicta que si trabaja en festivo, se le paga su día normal MÁS un 200% extra.
            const pagoFestivoExtra = pagoGeneradoDia * 2;
            ingresos.push({ 
                concepto: `Día Festivo Laborado: ${calendario[fecha].motivo} (Bono LFT 200%)`, 
                monto: Number(pagoFestivoExtra.toFixed(2)), 
                sistema: true 
            });
        }

        diasDetalle.push({ fecha, diaSemana, config: configDia, asistencia: asistenciaHoy, minTarde, esFalta, justificacionActiva: justificacionActiva?.tipo, horasReales: horasReales.toFixed(2), pagoGeneradoDia, requiereAprobacionApoyo, salidaInvalidaOlvido, hrsProgramadasDia: hrsProgramadasDia.toFixed(2) });
    });  

    if (metricas.faltasInjustificadas > 0 && reglasGlobales.descuento_descanso_activo) {
        const baseDescuento = sueldoDiarioFijo > 0 ? sueldoDiarioFijo : (sueldoPorHora * 8);
        const descuentoExtra = metricas.faltasInjustificadas * ((1 / 6) * baseDescuento);
        egresos.push({ concepto: `Castigo Ley 1/6 (Proporcional descanso)`, monto: Number(descuentoExtra.toFixed(2)), sistema: true });
    }
    
    if (metricas.domingosTrabajados > 0 && reglasGlobales.prima_dominical_activa) {
        const basePrima = esEmpleadoAsimetrico ? (sueldoPorHora * 8) : (sueldoDiarioFijo > 0 ? sueldoDiarioFijo : (sueldoPorHora * 8));
        const pagoPrima = (basePrima * 0.25) * metricas.domingosTrabajados;
        ingresos.push({ concepto: `Prima Dominical LFT (25% x ${metricas.domingosTrabajados} Dom)`, monto: Number(pagoPrima.toFixed(2)), sistema: true });
    }
    
    if (metricas.diasInhabilesDeApoyo > 0) {
        ingresos.push({ concepto: `Días Extra / Apoyo (Incluido en Sueldo Base)`, monto: 0, sistema: true });
    }  
    
    ingresos.unshift({ concepto: `Sueldo Base (Efectivo por Horas/Días laborados)`, monto: Number(metricas.sueldoOrdinario.toFixed(2)), sistema: true });  

    (prestaciones.prestamos || []).forEach(p => {
        if (p.activo && Number(p.saldo_restante) > 0) egresos.push({ concepto: `Abono Préstamo: ${p.concepto}`, monto: Math.min(Number(p.descuento_por_nomina), Number(p.saldo_restante)), sistema: false, prestamo_id: p.id });
    });  

    return {
        empleado_id: empleado.id, nombre: empleado.nombre, rol: empleado.rol,
        sueldoBaseFormat: prestaciones.sueldo_base,
        esPorHora: tipoSueldo === 'Por Hora' || esEmpleadoAsimetrico,
        sueldoDiario: esEmpleadoAsimetrico ? sueldoPorHora : sueldoDiarioFijo,
        metricas, alertas, diasDetalle, ingresos, egresos,
        totalIngresos: ingresos.reduce((a, i) => a + i.monto, 0),
        totalEgresos: egresos.reduce((a, e) => a + e.monto, 0),
        pagoNeto: ingresos.reduce((a, i) => a + i.monto, 0) - egresos.reduce((a, e) => a + e.monto, 0)
    };
};