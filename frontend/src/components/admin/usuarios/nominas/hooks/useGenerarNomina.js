import { useState, useCallback, useEffect } from 'react';
import { procesarMotorNomina } from '../utils/motorNominaLFT';
import { auditarCumplimientoOperativo, procesarBonosPorCumplimiento } from '../utils/auditorOperativo';

export const useGenerarNomina = (apiUrl, usuariosVisibles, showAlert) => {
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);
    const [preNomina, setPreNomina] = useState([]);
    const [isCalculating, setIsCalculating] = useState(false);
    
    const [justificaciones, setJustificaciones] = useState({});
    const [evaluacionesLimpiezaLocal, setEvaluacionesLimpiezaLocal] = useState({});
    const [evaluacionesObservacionesLocal, setEvaluacionesObservacionesLocal] = useState({});
    const [datosCrudos, setDatosCrudos] = useState(null); 

    const obtenerRangoFechas = (inicioStr, finStr) => {
        const fechas = [];
        let actual = new Date(inicioStr + 'T12:00:00');
        const fin = new Date(finStr + 'T12:00:00');
        while (actual <= fin) {
            fechas.push(actual.toISOString().split('T')[0]);
            actual.setDate(actual.getDate() + 1);
        }
        return fechas;
    };

    const calcularNominaExacta = useCallback(async () => {
        if (empleadosSeleccionados.length === 0) return showAlert("Aviso", "Selecciona al menos un empleado.", "warning");
        if (!fechaInicio || !fechaFin) return showAlert("Aviso", "Selecciona fechas.", "info");

        setIsCalculating(true);
        try {
            const resHist = await fetch(`${apiUrl}/usuarios/rendimiento?periodo=anio&fecha=${fechaInicio.substring(0,4)}-01-01`);
            const dataHist = resHist.ok ? await resHist.json() : {};
            
            const historialCompleto = (dataHist.historialAsistencias || []).map(h => ({
                ...h, fecha_corta: h.fecha ? h.fecha.split('T')[0] : ''
            }));
            
            const resConfig = await fetch(`${apiUrl}/configuracion`);
            const dataConfig = resConfig.ok ? await resConfig.json() : {};
            
            const matrizLimpieza = typeof dataConfig.matriz_limpieza === 'string' ? JSON.parse(dataConfig.matriz_limpieza || '{}') : (dataConfig.matriz_limpieza || {});
            const matrizObservaciones = typeof dataConfig.matriz_observaciones === 'string' ? JSON.parse(dataConfig.matriz_observaciones || '{}') : (dataConfig.matriz_observaciones || {});
            
            setEvaluacionesLimpiezaLocal(matrizLimpieza.evaluaciones || {});
            setEvaluacionesObservacionesLocal(matrizObservaciones.evaluaciones || {});
            
            setDatosCrudos({ historialCompleto, matrizLimpieza, matrizObservaciones, reglasGlobales: matrizLimpieza.reglas_nomina || {} });

        } catch (error) {
            showAlert("Error", "Fallo al consultar la base de datos.", "error");
            setIsCalculating(false);
        }
    }, [apiUrl, empleadosSeleccionados, fechaInicio, fechaFin, showAlert]);

    useEffect(() => {
        if (!datosCrudos) return;

        const { historialCompleto, matrizLimpieza, matrizObservaciones, reglasGlobales } = datosCrudos;
        const fechasRango = obtenerRangoFechas(fechaInicio, fechaFin);
        const resultadosPreNomina = [];

        for (const emp of usuariosVisibles) {
            if (!empleadosSeleccionados.includes(emp.id)) continue;
            
            const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
            if (pres.generar_nomina === false) continue;

            const checkinsCrudos = historialCompleto.filter(a => String(a.usuario_id) === String(emp.id) && fechasRango.includes(a.fecha_corta));
            const asistenciasAjustadas = [];
            let faltanEvaluaciones = false;

            fechasRango.forEach(fecha => {
                let checkinsDia = checkinsCrudos
                    .filter(c => c.fecha_corta === fecha)
                    .sort((a, b) => new Date(a.hora_entrada).getTime() - new Date(b.hora_entrada).getTime());

                const justif = justificaciones[`${emp.id}-${fecha}`];

                if (checkinsDia.length > 0) {
                    let minIn = new Date(checkinsDia[0].hora_entrada);
                    let maxOut = null;

                    for (let i = 0; i < checkinsDia.length; i++) {
                        if (checkinsDia[i].hora_salida) {
                            let outCand = new Date(checkinsDia[i].hora_salida);
                            let diff = (outCand.getTime() - minIn.getTime()) / 3600000;
                            if (diff >= 0 && diff <= 14) {
                                maxOut = outCand;
                                break; 
                            }
                        }
                    }

                    asistenciasAjustadas.push({ fecha, hora_entrada: minIn.toISOString(), hora_salida: maxOut ? maxOut.toISOString() : null });
                } else if (justif?.tipo === 'falta') {
                    const base = new Date(fecha + 'T08:00:00');
                    asistenciasAjustadas.push({ fecha, hora_entrada: base.toISOString(), hora_salida: new Date(base.getTime() + (justif.horas * 3600000)).toISOString(), justificado: true });
                }
            });

            const calculoLFT = procesarMotorNomina(emp, asistenciasAjustadas, fechasRango, reglasGlobales, justificaciones);
            
            // 👇 SOLUCIÓN: Agregamos emp.rol como segundo parámetro
            const auditoriaOp = auditarCumplimientoOperativo(
                emp.id, emp.rol, fechasRango, matrizLimpieza, matrizObservaciones, 
                evaluacionesLimpiezaLocal, evaluacionesObservacionesLocal
            );

            fechasRango.forEach(f => {
                const asigLimp = matrizLimpieza.asignaciones || {};
                Object.keys(asigLimp).forEach(area => {
                    if (asigLimp[area]?.[f]?.map(String).includes(String(emp.id)) && !evaluacionesLimpiezaLocal?.[area]?.[f]?.[emp.id]) faltanEvaluaciones = true;
                });
                const asigObs = matrizObservaciones.asignaciones || {};
                Object.keys(asigObs).forEach(obs => {
                    if (asigObs[obs]?.[f]?.map(String).includes(String(emp.id)) && !evaluacionesObservacionesLocal?.[obs]?.[f]?.[emp.id]) faltanEvaluaciones = true;
                });
            });

            // Agregamos la lógica para revisar si la nueva plantilla tiene evaluaciones pendientes
            if (auditoriaOp.pendientesLimpieza > 0 || auditoriaOp.detallesAuditoria.some(d => d.estado.includes('Pendiente'))) {
                faltanEvaluaciones = true;
            }

            let resultadoBonos = procesarBonosPorCumplimiento(auditoriaOp, calculoLFT.metricas.retardosMinutosGlobal, calculoLFT.metricas.retardosEventos, reglasGlobales);

            if (calculoLFT.metricas.faltasInjustificadas > 0) {
                resultadoBonos.ingresosBonos = [];
                resultadoBonos.bonosPerdidos = ["Descalificado automáticamente de los bonos por faltas injustificadas."];
            }

            const ingresos = [...calculoLFT.ingresos, ...resultadoBonos.ingresosBonos];
            const egresos = [...calculoLFT.egresos];

            resultadosPreNomina.push({
                ...calculoLFT,
                auditoriaOperativa: auditoriaOp, bonosPerdidos: resultadoBonos.bonosPerdidos, faltanEvaluaciones,
                ingresos_base: ingresos, egresos_base: egresos, adicionales_ingresos: [], adicionales_egresos: [],
                total_ingresos: ingresos.reduce((a, c) => a + c.monto, 0), total_egresos: egresos.reduce((a, c) => a + c.monto, 0),
                neto: ingresos.reduce((a, c) => a + c.monto, 0) - egresos.reduce((a, c) => a + c.monto, 0),
                diasAuditados: fechasRango, evidenciasLimpieza: matrizLimpieza.evidencias || {}
            });
        }

        setPreNomina(resultadosPreNomina);
        setIsCalculating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datosCrudos, justificaciones, evaluacionesLimpiezaLocal, evaluacionesObservacionesLocal]);

    const justificarAnomalia = (empId, fecha, tipo, horasAprobadas = 0) => {
        setJustificaciones(prev => ({ ...prev, [`${empId}-${fecha}`]: { tipo, horas: horasAprobadas } }));
    };

    const cambiarHorasDia = (empId, fecha, nuevasHoras) => {
        setJustificaciones(prev => ({ ...prev, [`${empId}-${fecha}-horas`]: nuevasHoras }));
    };

    const evaluarLimpiezaEnVivo = (fechaStr, empId, areaId, status) => {
        setEvaluacionesLimpiezaLocal(prev => {
            const nuevo = JSON.parse(JSON.stringify(prev));
            if (!nuevo[areaId]) nuevo[areaId] = {};
            if (!nuevo[areaId][fechaStr]) nuevo[areaId][fechaStr] = {};
            nuevo[areaId][fechaStr][empId] = status; return nuevo;
        });
    };

    const evaluarObservacionEnVivo = (fechaStr, empId, obsNombre, status) => {
        setEvaluacionesObservacionesLocal(prev => {
            const nuevo = JSON.parse(JSON.stringify(prev));
            if (!nuevo[obsNombre]) nuevo[obsNombre] = {};
            if (!nuevo[obsNombre][fechaStr]) nuevo[obsNombre][fechaStr] = {};
            nuevo[obsNombre][fechaStr][empId] = status; return nuevo;
        });
    };

    const agregarDinamico = (empleadoId, tipo, concepto, montoStr) => {
        const monto = Number(montoStr) || 0;
        setPreNomina(prev => prev.map(p => {
            if (p.empleado_id === empleadoId) {
                if (tipo === 'ingreso') {
                    const nuevos = [...p.adicionales_ingresos, { id: Date.now(), concepto, monto }];
                    return { ...p, adicionales_ingresos: nuevos, total_ingresos: p.total_ingresos + monto, neto: p.neto + monto };
                } else {
                    const nuevos = [...p.adicionales_egresos, { id: Date.now(), concepto, monto }];
                    return { ...p, adicionales_egresos: nuevos, total_egresos: p.total_egresos + monto, neto: p.neto - monto };
                }
            } return p;
        }));
    };

    const removerDinamico = (empleadoId, tipo, idConcepto) => {
        setPreNomina(prev => prev.map(p => {
            if (p.empleado_id === empleadoId) {
                if (tipo === 'ingreso') {
                    const conc = p.adicionales_ingresos.find(c => c.id === idConcepto);
                    return { ...p, adicionales_ingresos: p.adicionales_ingresos.filter(c => c.id !== idConcepto), total_ingresos: p.total_ingresos - (conc?.monto||0), neto: p.neto - (conc?.monto||0) };
                } else {
                    const conc = p.adicionales_egresos.find(c => c.id === idConcepto);
                    return { ...p, adicionales_egresos: p.adicionales_egresos.filter(c => c.id !== idConcepto), total_egresos: p.total_egresos - (conc?.monto||0), neto: p.neto + (conc?.monto||0) };
                }
            } return p;
        }));
    };

    return {
        fechaInicio, setFechaInicio, fechaFin, setFechaFin,
        empleadosSeleccionados, setEmpleadosSeleccionados,
        preNomina, setPreNomina, isCalculating,
        calcularNominaExacta, agregarDinamico, removerDinamico,
        justificarAnomalia, cambiarHorasDia,
        evaluarLimpiezaEnVivo, evaluarObservacionEnVivo,
        evaluacionesLimpiezaLocal, evaluacionesObservacionesLocal
    };
};