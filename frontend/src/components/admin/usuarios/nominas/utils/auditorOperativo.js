// ==============================================================================
// AUDITOR OPERATIVO (Capa Lógica)
// ==============================================================================

export const obtenerNombreDiaLocal = (fechaStr) => {
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const d = new Date(fechaStr + 'T12:00:00');
    let dayIndex = d.getDay() - 1;
    if (dayIndex === -1) dayIndex = 6;
    return dias[dayIndex];
};

export const auditarCumplimientoOperativo = (empleadoId, empleadoRol, horarioSemanal, fechasRango, matrizLimpieza, matrizObservaciones, evaluacionesLimpieza, evaluacionesObservaciones) => {
    let fallasLimpieza = 0;
    let pendientesLimpieza = 0;
    let fallasObservaciones = 0;
    let pendientesObservaciones = 0; 
    let tareasAsignadasLimpiezaTotales = 0; 
    let tareasAsignadasObservacionesTotales = 0;
    let detallesAuditoria = [];  

    const asignacionesLimp = matrizLimpieza?.asignaciones || {};
    const asignacionesObs = matrizObservaciones?.asignaciones || {};
    const plantillaLimp = matrizLimpieza?.plantillaRoles?.[empleadoRol] || {};
    const plantillaObs = matrizObservaciones?.plantillaRoles?.[empleadoRol] || {};  

    fechasRango.forEach(fechaStr => {
        const diaSemana = obtenerNombreDiaLocal(fechaStr);  
        
        const configDia = horarioSemanal[diaSemana] || {};
        if (configDia.activo === false || configDia.es_descanso === true) {
            return; 
        }

        let tareasLimpHoy = new Set();
        Object.keys(asignacionesLimp).forEach(area => {
            if ((asignacionesLimp[area][fechaStr] || []).map(String).includes(String(empleadoId))) tareasLimpHoy.add(area);
        });
        (plantillaLimp[diaSemana] || []).forEach(area => tareasLimpHoy.add(area));  

        tareasLimpHoy.forEach(area => {
            tareasAsignadasLimpiezaTotales++; 
            const val = evaluacionesLimpieza[area]?.[fechaStr];
            const status = typeof val === 'string' ? val : val?.[empleadoId];
            if (status === 'no_cumplio') {
                fallasLimpieza++;
                detallesAuditoria.push({ fecha: fechaStr, modulo: 'Limpieza', tarea: area, estado: '❌ Falló' });
            } else if (status === 'cumplio') {
                detallesAuditoria.push({ fecha: fechaStr, modulo: 'Limpieza', tarea: area, estado: '✅ Cumplió' });
            } else {
                pendientesLimpieza++;
                detallesAuditoria.push({ fecha: fechaStr, modulo: 'Limpieza', tarea: area, estado: '⚠️ Pendiente' });
            }
        });  

        let tareasObsHoy = new Set();
        Object.keys(asignacionesObs).forEach(obs => {
            if ((asignacionesObs[obs][fechaStr] || []).map(String).includes(String(empleadoId))) tareasObsHoy.add(obs);
        });
        (plantillaObs[diaSemana] || []).forEach(obs => tareasObsHoy.add(obs));  

        tareasObsHoy.forEach(obs => {
            tareasAsignadasObservacionesTotales++; 
            const val = evaluacionesObservaciones[obs]?.[fechaStr];
            const status = typeof val === 'string' ? val : val?.[empleadoId];
            if (status === 'no_cumplio') {
                fallasObservaciones++;
                detallesAuditoria.push({ fecha: fechaStr, modulo: 'Conducta', tarea: obs, estado: '❌ Falló' });
            } else if (status === 'cumplio') {
                detallesAuditoria.push({ fecha: fechaStr, modulo: 'Conducta', tarea: obs, estado: '✅ Cumplió' });
            } else {
                pendientesObservaciones++; 
                detallesAuditoria.push({ fecha: fechaStr, modulo: 'Conducta', tarea: obs, estado: '⚠️ Pendiente' });
            }
        });
    });  

    return { fallasLimpieza, pendientesLimpieza, fallasObservaciones, pendientesObservaciones, detallesAuditoria, tareasAsignadasLimpiezaTotales, tareasAsignadasObservacionesTotales, totalFallas: fallasLimpieza + fallasObservaciones };
};

// 👇 Agregamos el parámetro final: diasAsistidos
export const procesarBonosPorCumplimiento = (auditoriaOp, minutosTardeGlobal, retardosEventosGlobal, reglasGlobales, diasSinChecarPagados = 0, diasAsistidos = 0) => {
    let ingresosBonos = []; let bonosPerdidos = [];

    if (reglasGlobales.bono_limpieza_activo) {
        if (auditoriaOp.tareasAsignadasLimpiezaTotales === 0) {
            bonosPerdidos.push(`Limpieza: No aplicable. No tuvo tareas asignadas esta semana.`);
        } else if (auditoriaOp.pendientesLimpieza > 0) {
            bonosPerdidos.push(`Limpieza: Retenido. Faltan tareas por calificar (SÍ/NO).`);
        } else {
            const permitidas = Number(reglasGlobales.limpieza_omisiones_permitidas) || 0;
            if (auditoriaOp.fallasLimpieza <= permitidas) {
                ingresosBonos.push({ concepto: `Bono de Limpieza (${auditoriaOp.fallasLimpieza} fallas)`, monto: Number(reglasGlobales.bono_limpieza_monto || 0), sistema: true });
            } else {
                bonosPerdidos.push(`Limpieza: Tuvo ${auditoriaOp.fallasLimpieza} fallas (Permitidas: ${permitidas}).`);
            }
        }
    }

    if (reglasGlobales.bono_observaciones_activo) {
        if (auditoriaOp.tareasAsignadasObservacionesTotales === 0) {
            bonosPerdidos.push(`Comportamiento: No aplicable. No tuvo reglas de conducta asignadas esta semana.`);
        } else if (auditoriaOp.pendientesObservaciones > 0) {
            bonosPerdidos.push(`Comportamiento: Retenido. Faltan reglas por calificar (SÍ/NO).`);
        } else {
            const permitidas = Number(reglasGlobales.bono_observaciones_tolerancia) || 0;
            if (auditoriaOp.fallasObservaciones <= permitidas) {
                ingresosBonos.push({ concepto: `Bono de Comportamiento (${auditoriaOp.fallasObservaciones} fallas)`, monto: Number(reglasGlobales.bono_observaciones_monto || 0), sistema: true });
            } else {
                bonosPerdidos.push(`Comportamiento: Tuvo ${auditoriaOp.fallasObservaciones} fallas (Permitidas: ${permitidas}).`);
            }
        }
    }

    if (reglasGlobales.bono_puntualidad_eventos_activo) {
        // 👇 FILTRO ESTRICTO: NO APLICA SI NO VINO O SI LE PAGARON SIN CHECAR
        if (diasAsistidos === 0) {
            bonosPerdidos.push(`Puntualidad Clásica: No aplicable. No registró asistencias en el periodo.`);
        } else if (diasSinChecarPagados > 0) {
            bonosPerdidos.push(`Puntualidad Clásica: Retenido. Hay días pagados sin registro de entrada en el checador.`);
        } else {
            const permitidas = Number(reglasGlobales.puntualidad_eventos_retardos_permitidos) || 0;
            if (retardosEventosGlobal <= permitidas) {
                ingresosBonos.push({ concepto: `Bono Puntualidad Clásica (${retardosEventosGlobal} retardos)`, monto: Number(reglasGlobales.bono_puntualidad_eventos_monto || 0), sistema: true });
            } else {
                bonosPerdidos.push(`Puntualidad Clásica: Tuvo ${retardosEventosGlobal} retardos (Permitidos: ${permitidas}).`);
            }
        }
    }

    if (reglasGlobales.bono_puntualidad_estricta_activo) {
        // 👇 FILTRO ESTRICTO: NO APLICA SI NO VINO O SI LE PAGARON SIN CHECAR
        if (diasAsistidos === 0) {
            bonosPerdidos.push(`Puntualidad Estricta: No aplicable. No registró asistencias en el periodo.`);
        } else if (diasSinChecarPagados > 0) {
            bonosPerdidos.push(`Puntualidad Estricta: Retenido. Hay días pagados sin registro de entrada en el checador.`);
        } else {
            const limiteMinutos = Number(reglasGlobales.puntualidad_estricta_limite_minutos_semana) || 0;
            if (minutosTardeGlobal <= limiteMinutos) {
                ingresosBonos.push({ concepto: `Bono Puntualidad Estricta (${minutosTardeGlobal} min tarde)`, monto: Number(reglasGlobales.bono_puntualidad_estricta_monto || 0), sistema: true });
            } else {
                bonosPerdidos.push(`Puntualidad Estricta: Sumó ${minutosTardeGlobal} mins tarde (Límite: ${limiteMinutos}m).`);
            }
        }
    }

    return { ingresosBonos, bonosPerdidos };
};