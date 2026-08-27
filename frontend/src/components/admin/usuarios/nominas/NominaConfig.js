import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, User, Scale, AlertTriangle, CalendarDays, Coffee, Banknote, Save, Clock, Calculator, ClipboardCheck } from 'lucide-react';

// 👇 IMPORTAMOS EL NUEVO MOTOR MATEMÁTICO INDEPENDIENTE
import { calcularSimulacionFinanciera } from './utils/simuladorFinanciero';

const formatoFechaSeguro = (fecha) => {
    if (!fecha) return '';
    try { return new Date(fecha).toISOString().split('T')[0]; } 
    catch (e) { return ''; }
};

const diasSemanaMap = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const NominaConfig = ({ usuariosDB, apiUrl, refrescarDatos, showAlert }) => {
    const [configGlobal, setConfigGlobal] = useState({});
    const [diasCerradosLocal, setDiasCerradosLocal] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ==========================================
    // ESTADOS: POLÍTICAS GENERALES (INTACTAS)
    // ==========================================
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
        puntualidad_estricta_limite_minutos_semana: 15,
        bono_observaciones_activo: false,
        bono_observaciones_monto: 0,
        bono_observaciones_tolerancia: 0,
        descuento_descanso_activo: true,
        prima_dominical_activa: true,
        retencion_isr_activa: false,
        porcentaje_isr: 0,
        retencion_imss_activa: false,
        porcentaje_imss: 0
    });

    // ==========================================
    // ESTADOS: FICHA FINANCIERA DEL EMPLEADO
    // ==========================================
    const [empleadoEditId, setEmpleadoEditId] = useState('');
    const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global').sort((a, b) => a.nombre.localeCompare(b.nombre));

    const [prestacionesEmp, setPrestacionesEmp] = useState({
        sueldo_base: 0, tarifa_apoyo_dia: 0, tipo_sueldo: 'Semanal',
        banco: '', cuenta: '', rfc: '', curp: '', nss: '', telefono: '', correo: '',
        fecha_ingreso: '', fecha_nacimiento: '', nombre_completo: '',
        generar_nomina: false, dias_descanso: [], dias_no_laborales: [],
        prima_vacacional: 25, dias_vacaciones_disponibles: 12,
        horas_extras_acumuladas: 0, limite_platillos: 1, limite_bebidas: 1,
        prestamos: [], bonos_recurrentes: []
    });

    // PLANTILLA PERPETUA
    const [plantillaSemanal, setPlantillaSemanal] = useState({
        Lunes: { activo: true, entrada: '14:00', salida: '22:00', es_descanso: false },
        Martes: { activo: true, entrada: '14:00', salida: '22:00', es_descanso: false },
        Miércoles: { activo: true, entrada: '14:00', salida: '22:00', es_descanso: false },
        Jueves: { activo: true, entrada: '14:00', salida: '22:00', es_descanso: false },
        Viernes: { activo: true, entrada: '14:00', salida: '22:00', es_descanso: false },
        Sábado: { activo: true, entrada: '14:00', salida: '22:00', es_descanso: false },
        Domingo: { activo: true, entrada: '14:00', salida: '22:00', es_descanso: false }
    });

    const [nuevoPrestamo, setNuevoPrestamo] = useState({ monto_total: '', concepto: '', descuento_nomina: '' });

    // ==========================================
    // EJECUCIÓN DEL SIMULADOR EN VIVO
    // ==========================================
    const proyeccionEnVivo = calcularSimulacionFinanciera(plantillaSemanal, prestacionesEmp.sueldo_base, prestacionesEmp.tipo_sueldo);

    // Cargar Configuración Global (Días cerrados y Políticas)
    const cargarConfigGlobal = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/configuracion`);
            if (res.ok) {
                const dataConfig = await res.json();
                setConfigGlobal(dataConfig);
                const matrizActual = typeof dataConfig.matriz_limpieza === 'string' ? JSON.parse(dataConfig.matriz_limpieza || '{}') : (dataConfig.matriz_limpieza || {});
                if (matrizActual.reglas_nomina) {
                    setReglasNomina(prev => ({ ...prev, ...matrizActual.reglas_nomina }));
                }
                const horSemana = typeof dataConfig.horarios_semana === 'string' ? JSON.parse(dataConfig.horarios_semana || '{}') : (dataConfig.horarios_semana || {});
                const cerrados = [];
                Object.keys(horSemana).forEach(dia => {
                    if (horSemana[dia].activo === false || horSemana[dia].activo === 'false') cerrados.push(dia);
                });
                setDiasCerradosLocal(cerrados);
            }
        } catch (e) {
            console.error("Error al cargar config de nómina:", e);
        }
    }, [apiUrl]);

    useEffect(() => {
        cargarConfigGlobal();
    }, [cargarConfigGlobal]);

    // Cargar Ficha y Plantilla del Empleado Seleccionado
    useEffect(() => {
        if (empleadoEditId) {
            const emp = usuariosDB.find(u => u.id === Number(empleadoEditId));
            if (emp) {
                const presParsed = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones) : (emp.prestaciones || {});
                let descansosArray = presParsed.dias_descanso || [];
                if (typeof presParsed.dia_descanso === 'string' && presParsed.dia_descanso !== 'Ninguno') descansosArray = [presParsed.dia_descanso];

                setPrestacionesEmp({
                    sueldo_base: presParsed.sueldo_base || 0,
                    tarifa_apoyo_dia: presParsed.tarifa_apoyo_dia || 0,
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
                    dias_no_laborales: presParsed.dias_no_laborales || [],
                    prima_vacacional: presParsed.prima_vacacional !== undefined ? presParsed.prima_vacacional : 25,
                    dias_vacaciones_disponibles: presParsed.dias_vacaciones_disponibles !== undefined ? presParsed.dias_vacaciones_disponibles : 12,
                    horas_extras_acumuladas: presParsed.horas_extras_acumuladas !== undefined ? presParsed.horas_extras_acumuladas : 0,
                    limite_platillos: presParsed.limite_platillos !== undefined ? presParsed.limite_platillos : 1,
                    limite_bebidas: presParsed.limite_bebidas !== undefined ? presParsed.limite_bebidas : 1,
                    prestamos: presParsed.prestamos || [],
                    bonos_recurrentes: presParsed.bonos_recurrentes || []
                });

                // Cargar Plantilla Semanal Perpetua
                const horParsed = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
                const defaultPlantilla = {};
                
                diasSemanaMap.forEach(dia => {
                    if (horParsed[dia]) {
                        defaultPlantilla[dia] = horParsed[dia];
                    } else {
                        const isDescanso = descansosArray.includes(dia);
                        const isNoLaboral = (presParsed.dias_no_laborales || []).includes(dia);
                        defaultPlantilla[dia] = {
                            activo: !(isDescanso || isNoLaboral),
                            es_descanso: isDescanso,
                            entrada: '14:00',
                            salida: '22:00'
                        };
                    }
                });
                setPlantillaSemanal(defaultPlantilla);
            }
        } else {
            setPrestacionesEmp({
                sueldo_base: 0, tarifa_apoyo_dia: 0, tipo_sueldo: 'Semanal', banco: '', cuenta: '', rfc: '', curp: '', nss: '', telefono: '', correo: '',
                fecha_ingreso: '', fecha_nacimiento: '', nombre_completo: '', generar_nomina: false, dias_descanso: [], dias_no_laborales: [],
                prima_vacacional: 25, dias_vacaciones_disponibles: 12, horas_extras_acumuladas: 0, limite_platillos: 1, limite_bebidas: 1, prestamos: [], bonos_recurrentes: []
            });
        }
    }, [empleadoEditId, usuariosDB]);

    const manejarToggleGenerarNomina = (checked) => {
        if (checked) {
            if (!prestacionesEmp.nombre_completo.trim() || !prestacionesEmp.fecha_ingreso || !prestacionesEmp.sueldo_base || prestacionesEmp.sueldo_base <= 0) {
                showAlert("Faltan Datos", "Para automatizar la nómina, primero debes llenar: Nombre Completo, Fecha de Ingreso y Sueldo Base.", "warning");
                return;
            }
        }
        setPrestacionesEmp({ ...prestacionesEmp, generar_nomina: checked });
    };

    // Funciones de Préstamos
    const agregarPrestamo = () => {
        if (!nuevoPrestamo.monto_total || !nuevoPrestamo.concepto || !nuevoPrestamo.descuento_nomina) return showAlert('Atención', 'Llena todos los campos del préstamo.', 'warning');
        const prestamo = { id: Date.now(), ...nuevoPrestamo, saldo_restante: nuevoPrestamo.monto_total, activo: true, fecha_registro: new Date().toISOString() };
        setPrestacionesEmp({ ...prestacionesEmp, prestamos: [...prestacionesEmp.prestamos, prestamo] });
        setNuevoPrestamo({ monto_total: '', concepto: '', descuento_nomina: '' });
    };
    const eliminarPrestamo = (id) => setPrestacionesEmp({ ...prestacionesEmp, prestamos: prestacionesEmp.prestamos.filter(p => p.id !== id) });
    
    // Guardar Políticas Generales
    const guardarReglasGlobales = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const matrizActual = typeof configGlobal.matriz_limpieza === 'string' ? JSON.parse(configGlobal.matriz_limpieza || '{}') : (configGlobal.matriz_limpieza || {});
            matrizActual.reglas_nomina = reglasNomina;
            const formData = new FormData();
            formData.append('matriz_limpieza', JSON.stringify(matrizActual));
            const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
            if (res.ok) showAlert('Éxito', 'Las políticas laborales y bonos se guardaron correctamente en la BD.', 'success');
        } catch (e) {
            showAlert('Error', 'Fallo de conexión al guardar políticas.', 'error');
        }
        setIsSubmitting(false);
    };

    // Guardar Ficha Financiera y Plantilla Perpetua
    const guardarPrestacionesEmpleado = async (e) => {
        e.preventDefault();
        if (!empleadoEditId) return;

        if (prestacionesEmp.generar_nomina) {
            if (!prestacionesEmp.nombre_completo.trim() || !prestacionesEmp.fecha_ingreso || !prestacionesEmp.sueldo_base || prestacionesEmp.sueldo_base <= 0) {
                showAlert("Error", "Faltan datos obligatorios para habilitar el motor de nómina.", "error");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const dias_descanso = [];
            const dias_no_laborales = [];
            Object.keys(plantillaSemanal).forEach(dia => {
                if (!plantillaSemanal[dia].activo) {
                    if (plantillaSemanal[dia].es_descanso) dias_descanso.push(dia);
                    else dias_no_laborales.push(dia);
                }
            });

            await fetch(`${apiUrl}/nominas/plantilla/${empleadoEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plantilla_semanal: plantillaSemanal })
            });

            const prestamosValidados = prestacionesEmp.prestamos.map(p => {
                if (p.saldo_restante === 0 && p.monto_total > 0 && p.activo) return { ...p, saldo_restante: p.monto_total };
                return p;
            });
            const payload = { ...prestacionesEmp, dias_descanso, dias_no_laborales, prestamos: prestamosValidados };

            const res = await fetch(`${apiUrl}/usuarios/${empleadoEditId}/prestaciones`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prestaciones: payload })
            });

            if (res.ok) {
                showAlert('Éxito', 'Ficha y Plantilla del empleado guardadas correctamente.', 'success');
                if (refrescarDatos) refrescarDatos();
            }
        } catch (e) {
            showAlert('Error', 'Fallo de conexión al guardar.', 'error');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start animate-in fade-in pb-12">

            {/* 1. SECCIÓN: POLÍTICAS GLOBALES */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <ShieldCheck className="text-emerald-500" size={32} />
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">Políticas Generales</h3>
                        <p className="text-sm font-bold text-slate-400">Estas reglas afectan a todos al calcular la nómina.</p>
                    </div>
                </div>

                <form onSubmit={guardarReglasGlobales} className="space-y-6">
                    {/* FALTAS INJUSTIFICADAS */}
                    <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.descuento_descanso_activo ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-black text-slate-800 flex items-center gap-2"><Scale className="text-red-500" size={18} /> Castigo por Faltas Injustificadas</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Aplica descuento proporcional al día de descanso (Ley 1/6).</p>
                            </div>
                            <button type="button" onClick={() => setReglasNomina({ ...reglasNomina, descuento_descanso_activo: !reglasNomina.descuento_descanso_activo })} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition shrink-0 ${reglasNomina.descuento_descanso_activo ? 'bg-red-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                                {reglasNomina.descuento_descanso_activo ? 'Estricto' : 'Perdonar'}
                            </button>
                        </div>
                        {reglasNomina.descuento_descanso_activo ? (
                            <p className="text-xs font-medium text-red-700 mt-2">Si el empleado falta injustificadamente, se le descontará ese día <b>Y la parte proporcional</b> de su día de descanso pagado.</p>
                        ) : (
                            <p className="text-xs font-medium text-slate-500 mt-2">El empleado solo perderá el día que faltó. El pago de su día de descanso no se verá afectado.</p>
                        )}
                    </div>

                    {/* PRIMA DOMINICAL */}
                    <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.prima_dominical_activa ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-black text-slate-800 flex items-center gap-2"><CalendarDays className="text-blue-500" size={18} /> Prima Dominical</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Pago del 25% extra sobre el sueldo de ese día (Art. 71 LFT).</p>
                            </div>
                            <button type="button" onClick={() => setReglasNomina({ ...reglasNomina, prima_dominical_activa: !reglasNomina.prima_dominical_activa })} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition shrink-0 ${reglasNomina.prima_dominical_activa ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                                {reglasNomina.prima_dominical_activa ? 'Activada' : 'Desactivada'}
                            </button>
                        </div>
                        {reglasNomina.prima_dominical_activa ? (
                            <p className="text-xs font-medium text-blue-700 mt-2">El sistema detectará si el empleado trabajó en Domingo y sumará automáticamente el 25% de su sueldo diario.</p>
                        ) : (
                            <p className="text-xs font-medium text-slate-500 mt-2">Los domingos se pagarán como un día ordinario normal.</p>
                        )}
                    </div>

                    {/* RETENCIONES */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                        <h4 className="font-black text-slate-800 flex items-center gap-2 mb-4"><Banknote className="text-slate-400" size={18} /> Retenciones Fiscales (Fijas)</h4>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" checked={reglasNomina.retencion_isr_activa} onChange={(e) => setReglasNomina({ ...reglasNomina, retencion_isr_activa: e.target.checked })} className="w-5 h-5 accent-blue-600" />
                                <span className="font-bold text-sm text-slate-700 group-hover:text-blue-600">Descontar ISR</span>
                            </label>
                            <label className="flex flex-wrap items-center gap-2 cursor-pointer group">
                                <input type="checkbox" checked={reglasNomina.retencion_imss_activa} onChange={(e) => setReglasNomina({ ...reglasNomina, retencion_imss_activa: e.target.checked })} className="w-5 h-5 accent-emerald-600" />
                                <span className="font-bold text-sm text-slate-700 group-hover:text-emerald-600">Descontar IMSS (Cuota)</span>
                                {reglasNomina.retencion_imss_activa && (
                                    <div className="flex items-center gap-2 ml-2">
                                        <input type="number" step="0.1" value={reglasNomina.porcentaje_imss} onChange={e => setReglasNomina({ ...reglasNomina, porcentaje_imss: Number(e.target.value) })} className="w-16 p-1 border border-slate-300 rounded text-center text-sm font-bold" />
                                        <span className="text-[10px] text-slate-500">% (Suele ser ~2.5%)</span>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* BONO OBSERVACIONES */}
                    <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.bono_observaciones_activo ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-black text-slate-800 flex items-center gap-2"><ClipboardCheck className="text-indigo-500" size={18} /> Bono por Observaciones (Comportamiento)</h4>
                            <button type="button" onClick={() => setReglasNomina({ ...reglasNomina, bono_observaciones_activo: !reglasNomina.bono_observaciones_activo })} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition shrink-0 ${reglasNomina.bono_observaciones_activo ? 'bg-indigo-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                                {reglasNomina.bono_observaciones_activo ? 'Activado' : 'Desactivado'}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-wider">Recompensa el cumplimiento de reglas.</p>
                        {reglasNomina.bono_observaciones_activo && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                                <div>
                                    <label className="text-xs font-bold text-indigo-900 uppercase">Monto del Bono ($)</label>
                                    <input type="number" value={reglasNomina.bono_observaciones_monto} onChange={e => setReglasNomina({ ...reglasNomina, bono_observaciones_monto: Number(e.target.value) })} className="w-full bg-white border border-indigo-200 rounded-xl p-3 font-black outline-none focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-indigo-900 uppercase">Tolerancia (Fallas perdonadas)</label>
                                    <input type="number" value={reglasNomina.bono_observaciones_tolerancia} onChange={e => setReglasNomina({ ...reglasNomina, bono_observaciones_tolerancia: Number(e.target.value) })} className="w-full bg-white border border-indigo-200 rounded-xl p-3 font-black outline-none focus:border-indigo-500" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* BONO LIMPIEZA */}
                    <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.bono_limpieza_activo ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-black text-slate-800 flex items-center gap-2"><Scale className="text-emerald-500" size={18} /> Bono de Limpieza</h4>
                            <button type="button" onClick={() => setReglasNomina({ ...reglasNomina, bono_limpieza_activo: !reglasNomina.bono_limpieza_activo })} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition shrink-0 ${reglasNomina.bono_limpieza_activo ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                                {reglasNomina.bono_limpieza_activo ? 'Activado' : 'Desactivado'}
                            </button>
                        </div>
                        {reglasNomina.bono_limpieza_activo && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Monto del Bono ($)</label>
                                    <input type="number" value={reglasNomina.bono_limpieza_monto} onChange={e => setReglasNomina({ ...reglasNomina, bono_limpieza_monto: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Fallas Perdonadas</label>
                                    <input type="number" value={reglasNomina.limpieza_omisiones_permitidas} onChange={e => setReglasNomina({ ...reglasNomina, limpieza_omisiones_permitidas: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-emerald-500" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* BONO PUNTUALIDAD CLÁSICA */}
                    <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.bono_puntualidad_eventos_activo ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-black text-slate-800 flex items-center gap-2"><Clock className="text-blue-500" size={18} /> Bono Puntualidad Clásica</h4>
                            <button type="button" onClick={() => setReglasNomina({ ...reglasNomina, bono_puntualidad_eventos_activo: !reglasNomina.bono_puntualidad_eventos_activo })} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition shrink-0 ${reglasNomina.bono_puntualidad_eventos_activo ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                                {reglasNomina.bono_puntualidad_eventos_activo ? 'Activado' : 'Desactivado'}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-wider">Castiga por la cantidad de veces que llegó tarde.</p>
                        {reglasNomina.bono_puntualidad_eventos_activo && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in">
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Monto del Bono ($)</label>
                                    <input type="number" value={reglasNomina.bono_puntualidad_eventos_monto} onChange={e => setReglasNomina({ ...reglasNomina, bono_puntualidad_eventos_monto: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500" title="Minutos de gracia al checar entrada">Tolerancia (Min/Día)</label>
                                    <input type="number" value={reglasNomina.puntualidad_eventos_tolerancia_minutos} onChange={e => setReglasNomina({ ...reglasNomina, puntualidad_eventos_tolerancia_minutos: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500" title="¿Cuántos retardos se perdonan a la semana?">Retardos Permitidos</label>
                                    <input type="number" value={reglasNomina.puntualidad_eventos_retardos_permitidos} onChange={e => setReglasNomina({ ...reglasNomina, puntualidad_eventos_retardos_permitidos: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-blue-500" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* BONO PUNTUALIDAD ESTRICTA */}
                    <div className={`p-5 rounded-2xl border-2 transition-all ${reglasNomina.bono_puntualidad_estricta_activo ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-black text-slate-800 flex items-center gap-2"><AlertTriangle className="text-orange-500" size={18} /> Bono Puntualidad Estricta</h4>
                            <button type="button" onClick={() => setReglasNomina({ ...reglasNomina, bono_puntualidad_estricta_activo: !reglasNomina.bono_puntualidad_estricta_activo })} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition shrink-0 ${reglasNomina.bono_puntualidad_estricta_activo ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                                {reglasNomina.bono_puntualidad_estricta_activo ? 'Activado' : 'Desactivado'}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-wider">Suma todos los minutos tarde de la semana.</p>
                        {reglasNomina.bono_puntualidad_estricta_activo && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Monto del Bono ($)</label>
                                    <input type="number" value={reglasNomina.bono_puntualidad_estricta_monto} onChange={e => setReglasNomina({ ...reglasNomina, bono_puntualidad_estricta_monto: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-orange-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500">Límite Global Semanal (Minutos)</label>
                                    <input type="number" value={reglasNomina.puntualidad_estricta_limite_minutos_semana} onChange={e => setReglasNomina({ ...reglasNomina, puntualidad_estricta_limite_minutos_semana: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-xl p-3 font-black outline-none focus:border-orange-500" />
                                </div>
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition shadow-lg active:scale-95">
                        <Save size={20} /> Guardar Políticas Generales
                    </button>
                </form>
            </div>

            {/* 2. SECCIÓN: FICHA FINANCIERA Y PLANTILLA */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <User className="text-blue-500" size={32} />
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">Ficha Financiera</h3>
                        <p className="text-sm font-bold text-slate-400">Selecciona un empleado para fijar su horario y sueldo.</p>
                    </div>
                </div>

                <select value={empleadoEditId} onChange={(e) => setEmpleadoEditId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black text-slate-700 outline-none mb-6 focus:border-blue-500 transition-colors shadow-sm cursor-pointer">
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

                        {/* DATOS FISCALES Y DE PAGO */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                            <h4 className="font-black text-slate-800 flex items-center gap-2 mb-3 text-sm"><Banknote size={16} /> Sueldo Base y Datos Bancarios</h4>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">Nombre Completo Oficial</label>
                                    <input type="text" value={prestacionesEmp.nombre_completo} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, nombre_completo: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-blue-600 uppercase">Sueldo Base ($)</label>
                                    <input type="number" min="0" required value={prestacionesEmp.sueldo_base} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, sueldo_base: Number(e.target.value) })} className="w-full bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-sm font-black text-blue-800 focus:border-blue-500 outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase">Frecuencia</label>
                                    <select value={prestacionesEmp.tipo_sueldo} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, tipo_sueldo: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-colors cursor-pointer">
                                        <option value="Semanal">Semanal</option>
                                        <option value="Quincenal">Quincenal</option>
                                        <option value="Mensual">Mensual</option>
                                        <option value="Diario">Por Día</option>
                                        <option value="Por Hora">Por Hora</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-4">
                                <label className="text-[10px] font-black text-indigo-600 uppercase">Tarifa Día de Apoyo ($) <span className="font-medium text-slate-500 capitalize ml-1">(Opcional)</span></label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input type="number" min="0" value={prestacionesEmp.tarifa_apoyo_dia} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, tarifa_apoyo_dia: Number(e.target.value) })} className="w-32 bg-white border border-indigo-200 rounded-lg p-2 text-sm font-black text-indigo-800 outline-none text-center" />
                                    <p className="text-xs text-indigo-800 leading-tight">Si asiste en un día <b>No Laboral</b>, se le pagará esta tarifa fija.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase">NSS</label>
                                    <input type="text" value={prestacionesEmp.nss} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, nss: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase">CURP</label>
                                    <input type="text" value={prestacionesEmp.curp} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, curp: e.target.value.toUpperCase() })} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold uppercase focus:border-blue-500 outline-none transition-colors" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">RFC</label>
                                    <input type="text" value={prestacionesEmp.rfc} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, rfc: e.target.value.toUpperCase() })} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold uppercase focus:border-blue-500 outline-none transition-colors" />
                                </div>
                            </div>
                        </div>

                        {/* PLANTILLA PERPETUA DE HORARIO (CORRECCIÓN VISUAL APLICADA AQUÍ) */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-6 shadow-inner w-full overflow-hidden">
                            <h4 className="font-black text-slate-800 flex items-center gap-2 mb-2"><CalendarDays size={18} className="text-blue-500"/> Plantilla de Horario Fijo (Semanal)</h4>
                            <p className="text-sm font-bold text-slate-500 mb-6">Configura la semana base para este empleado. El motor repetirá este patrón infinitamente.</p>

                            {/* Carrusel Horizontal para evitar aplastar las tarjetas en pantallas pequeñas */}
                            <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar">
                                {diasSemanaMap.map(dia => {
                                    const conf = plantillaSemanal[dia] || { activo: false, es_descanso: false };
                                    const isLocalCerrado = diasCerradosLocal.includes(dia);
                                    
                                    return (
                                        <div key={dia} className={`min-w-[160px] flex-1 p-4 rounded-xl border relative overflow-hidden transition-all ${conf.activo ? 'bg-white border-blue-300 shadow-sm ring-1 ring-blue-100' : conf.es_descanso ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-200'}`}>
                                            
                                            {isLocalCerrado && (
                                                <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase">
                                                    Cerrado
                                                </div>
                                            )}

                                            <p className="font-black text-slate-700 mb-3 text-center tracking-wide">{dia}</p>
                                            
                                            <select
                                                value={conf.activo ? 'laboral' : (conf.es_descanso ? 'descanso' : 'inhabil')}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setPlantillaSemanal(prev => ({
                                                        ...prev,
                                                        [dia]: {
                                                            ...prev[dia],
                                                            activo: val === 'laboral',
                                                            es_descanso: val === 'descanso'
                                                        }
                                                    }));
                                                }}
                                                className="w-full text-xs font-black p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none mb-4 cursor-pointer text-slate-600 focus:border-blue-500"
                                            >
                                                <option value="laboral">💼 Trabaja</option>
                                                <option value="descanso">🛋️ Descanso Pagado</option>
                                                <option value="inhabil">🚫 No Laboral</option>
                                            </select>

                                            {conf.activo && (
                                                <div className="space-y-3 animate-in fade-in">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-black uppercase text-blue-500 tracking-widest text-center">Hora de Entrada</span>
                                                        <input type="time" value={conf.entrada || '14:00'} onChange={e => setPlantillaSemanal(prev => ({...prev, [dia]: {...prev[dia], entrada: e.target.value}}))} className="w-full p-2 text-sm font-black border border-slate-200 rounded-lg outline-none text-center focus:border-blue-500 text-slate-700" />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-black uppercase text-orange-500 tracking-widest text-center">Hora de Salida</span>
                                                        <input type="time" value={conf.salida || '22:00'} onChange={e => setPlantillaSemanal(prev => ({...prev, [dia]: {...prev[dia], salida: e.target.value}}))} className="w-full p-2 text-sm font-black border border-slate-200 rounded-lg outline-none text-center focus:border-blue-500 text-slate-700" />
                                                    </div>
                                                </div>
                                            )}
                                            {!conf.activo && conf.es_descanso && (
                                                <p className="text-[10px] font-bold text-emerald-600 text-center uppercase tracking-widest mt-6 bg-emerald-100 p-2 rounded-lg">Se paga (LFT)</p>
                                            )}
                                            {!conf.activo && !conf.es_descanso && (
                                                <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest mt-6">Sin Goce de Sueldo</p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* 👇 LA MAGIA: TARJETA DEL SIMULADOR FINANCIERO EN VIVO (RESPONSIVO) */}
                            <div className="mt-8 bg-slate-800 text-white rounded-[24px] p-6 shadow-xl border border-slate-700 flex flex-col items-center gap-6 animate-in slide-in-from-bottom-4">
                                <div className="flex items-center justify-start gap-4 w-full">
                                    <div className="bg-blue-500/20 p-4 rounded-2xl border border-blue-500/30">
                                        <Calculator className="text-blue-400" size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black">Proyección Financiera</h4>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Cálculo de valores en tiempo real</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 w-full">
                                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Horas</p>
                                        <p className="text-xl lg:text-2xl font-black text-white">{proyeccionEnVivo.horasTotalesSemana} <span className="text-sm">hrs</span></p>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Días Pagados</p>
                                        <p className="text-xl lg:text-2xl font-black text-white">{proyeccionEnVivo.diasPagadosLFT} <span className="text-sm">días</span></p>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl text-center">
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Valor Día Real</p>
                                        <p className="text-xl lg:text-2xl font-black text-blue-400">${proyeccionEnVivo.sueldoDiarioReal.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl text-center">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Valor Hora Real</p>
                                        <p className="text-xl lg:text-2xl font-black text-emerald-400">${proyeccionEnVivo.sueldoHoraReal.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ANTIGÜEDAD Y VACACIONES */}
                        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 mt-6">
                            <h4 className="font-black text-emerald-900 flex items-center gap-2 mb-3 text-sm"><CalendarDays size={16} /> Fechas, Vacaciones y Banco de Horas</h4>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-700 uppercase">Ingreso</label>
                                    <input type="date" value={prestacionesEmp.fecha_ingreso} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, fecha_ingreso: e.target.value })} className="w-full bg-white border border-emerald-200 rounded-xl p-2.5 font-bold text-emerald-900 outline-none text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-700 uppercase">Cumpleaños</label>
                                    <input type="date" value={prestacionesEmp.fecha_nacimiento} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, fecha_nacimiento: e.target.value })} className="w-full bg-white border border-emerald-200 rounded-xl p-2.5 font-bold text-emerald-900 outline-none text-xs" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-700 uppercase leading-tight block truncate">Días Vac.</label>
                                    <input type="number" min="0" required value={prestacionesEmp.dias_vacaciones_disponibles} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, dias_vacaciones_disponibles: Number(e.target.value) })} className="w-full bg-white border border-emerald-200 rounded-xl p-2.5 font-black text-center text-emerald-900 outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-700 uppercase truncate block">Prima Vac. (%)</label>
                                    <input type="number" min="25" required value={prestacionesEmp.prima_vacacional} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, prima_vacacional: Number(e.target.value) })} className="w-full bg-white border border-emerald-200 rounded-xl p-2.5 font-black text-center text-emerald-900 outline-none text-sm" />
                                </div>
                                <div className="col-span-2 lg:col-span-1">
                                    <label className="text-[10px] font-bold text-emerald-700 uppercase truncate block">Hrs Extra Pendientes</label>
                                    <input type="number" step="0.01" min="0" value={prestacionesEmp.horas_extras_acumuladas} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, horas_extras_acumuladas: Number(e.target.value) })} className="w-full bg-emerald-200 border border-emerald-400 rounded-xl p-2.5 font-black text-center text-emerald-900 outline-none text-sm shadow-inner" />
                                </div>
                            </div>
                        </div>

                        {/* LIMITES DE COMEDOR */}
                        <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
                            <h4 className="font-black text-orange-900 flex items-center gap-2 mb-3 text-sm"><Coffee size={16} /> Comida Personal</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-orange-700 uppercase">Max. Platillos / Turno</label>
                                    <input type="number" min="0" required value={prestacionesEmp.limite_platillos} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, limite_platillos: Number(e.target.value) })} className="w-full bg-white border border-orange-200 rounded-xl p-2.5 font-black text-orange-900 outline-none text-center" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-orange-700 uppercase">Max. Bebidas / Turno</label>
                                    <input type="number" min="0" required value={prestacionesEmp.limite_bebidas} onChange={e => setPrestacionesEmp({ ...prestacionesEmp, limite_bebidas: Number(e.target.value) })} className="w-full bg-white border border-orange-200 rounded-xl p-2.5 font-black text-orange-900 outline-none text-center" />
                                </div>
                            </div>
                        </div>

                        {/* PRÉSTAMOS */}
                        <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                            <h4 className="font-black text-red-900 flex items-center gap-2 mb-3 text-sm"><Banknote size={16} /> Préstamos y Deducciones</h4>
                            <div className="flex flex-col md:flex-row gap-3 items-end mb-4 bg-white p-4 rounded-xl border border-red-200">
                                <div className="flex-1 w-full">
                                    <label className="text-[10px] font-bold text-red-700 uppercase">Concepto</label>
                                    <input type="text" value={nuevoPrestamo.concepto} onChange={e => setNuevoPrestamo({ ...nuevoPrestamo, concepto: e.target.value })} placeholder="Ej. Préstamo Personal" className="w-full border-b-2 border-red-200 p-2 outline-none focus:border-red-500 font-bold text-sm" />
                                </div>
                                <div className="w-full md:w-32">
                                    <label className="text-[10px] font-bold text-red-700 uppercase">Monto Total</label>
                                    <input type="number" value={nuevoPrestamo.monto_total} onChange={e => setNuevoPrestamo({ ...nuevoPrestamo, monto_total: Number(e.target.value) })} className="w-full border-b-2 border-red-200 p-2 outline-none focus:border-red-500 font-bold text-sm" />
                                </div>
                                <div className="w-full md:w-32">
                                    <label className="text-[10px] font-bold text-red-700 uppercase">Desc. / Nómina</label>
                                    <input type="number" value={nuevoPrestamo.descuento_nomina} onChange={e => setNuevoPrestamo({ ...nuevoPrestamo, descuento_nomina: Number(e.target.value) })} className="w-full border-b-2 border-red-200 p-2 outline-none focus:border-red-500 font-bold text-sm" />
                                </div>
                                <button type="button" onClick={agregarPrestamo} className="bg-red-600 hover:bg-red-700 text-white font-black px-4 py-2 rounded-lg transition text-xs h-[38px] w-full md:w-auto">Añadir</button>
                            </div>
                            <div className="space-y-2">
                                {prestacionesEmp.prestamos.map(p => (
                                    <div key={p.id} className={`flex justify-between items-center p-3 rounded-lg text-sm font-bold border ${p.activo ? 'bg-white border-red-200 text-red-900' : 'bg-slate-100 border-slate-200 text-slate-500 line-through'}`}>
                                        <span>{p.concepto} (Desc. ${p.descuento_nomina})</span>
                                        <div className="flex items-center gap-4">
                                            <span>Resta: ${p.saldo_restante} / Total: ${p.monto_total}</span>
                                            {p.activo && <button type="button" onClick={() => eliminarPrestamo(p.id)} className="text-red-400 hover:text-red-600">Eliminar</button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 active:scale-95">
                            <Save size={20} /> Guardar Ficha Financiera
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default NominaConfig;