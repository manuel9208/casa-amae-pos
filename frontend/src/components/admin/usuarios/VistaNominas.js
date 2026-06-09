import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Settings, Users, CheckCircle2, History, AlertTriangle, Printer, Trash2, PlusCircle, Smartphone } from 'lucide-react';

const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);
const diasSemanaMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']; 

const VistaNominas = ({ usuariosDB, apiUrl, refrescarDatos, showAlert, showConfirm }) => {
  const [tabNomina, setTabNomina] = useState('config_emp'); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const hoyStr = new Date().toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);

  const [configGlobal, setConfigGlobal] = useState({});
  const [reglasNomina, setReglasNomina] = useState({ tolerancia_minutos: 15, retardos_libres: 0, descuento_retardo: 50, limpieza_libres: 0, descuento_limpieza: 80 });

  const [empleadoEditId, setEmpleadoEditId] = useState('');
  const [empleadoHistorialId, setEmpleadoHistorialId] = useState('');

  const [prestacionesEmp, setPrestacionesEmp] = useState({ 
    sueldo_base: 0, tipo_sueldo: 'Semanal', banco: '', cuenta: '', rfc: '', curp: '', nss: '', telefono: '', correo: '', fecha_ingreso: '', nombre_completo: '', generar_nomina: true,
    dias_descanso: [],
    prima_vacacional: 25,
    dias_vacaciones_disponibles: 12
  });

  const [preNomina, setPreNomina] = useState([]);
  const [historicoNominas, setHistoricoNominas] = useState([]);
  const [reciboPrint, setReciboPrint] = useState(null);
  
  const [fechasSugeridas, setFechasSugeridas] = useState({ min: null, max: null, count: 0 });

  const empleadosVisibles = usuariosDB.filter(u => u.nombre !== 'Administrador Global').sort((a, b) => a.nombre.localeCompare(b.nombre));

  const getImageUrl = (url) => {
    if (!url) return '';
    const strUrl = String(url).trim();
    if (strUrl.includes('cloudinary.com')) {
      const match = strUrl.match(/res\.cloudinary\.com\/(.+)/);
      if (match && match[1]) return `https://res.cloudinary.com/${match[1]}`;
    }
    if (strUrl.startsWith('http')) return strUrl;
    return `${apiUrl.replace('/api', '')}${strUrl.startsWith('/') ? '' : '/'}${strUrl}`;
  };

  const cargarHistoricoNominas = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/usuarios/rendimiento?periodo=anio&fecha=${hoyStr.substring(0,4)}-01-01`);
      if(res.ok) {
        const data = await res.json();
        const nominas = (data.cortesNomina || []).filter(c => {
          const d = typeof c.datos_corte === 'string' ? JSON.parse(c.datos_corte) : c.datos_corte;
          return d.metadata && d.metadata.es_nomina === true;
        });
        setHistoricoNominas(nominas);
      }
    } catch(e){}
  }, [apiUrl, hoyStr]);

  useEffect(() => {
    fetch(`${apiUrl}/configuracion`).then(res => res.json()).then(data => {
      if (data) {
        setConfigGlobal(data);
        try {
          const reglas = typeof data.matriz_limpieza === 'string' ? JSON.parse(data.matriz_limpieza) : (data.matriz_limpieza || {});
          if (reglas.reglas_nomina) setReglasNomina(reglas.reglas_nomina);
        } catch(e){}
      }
    });
    cargarHistoricoNominas();
  }, [apiUrl, cargarHistoricoNominas]);

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
      } else {
        setPrestacionesEmp({ sueldo_base: 0, tipo_sueldo: 'Semanal', banco: '', cuenta: '', rfc: '', curp: '', nss: '', telefono: '', correo: '', fecha_ingreso: '', nombre_completo: '', generar_nomina: true, dias_descanso: [], prima_vacacional: 25, dias_vacaciones_disponibles: 12 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoEditId]); 

  useEffect(() => {
    if (tabNomina === 'generar') {
      let min = null; let max = null; let count = 0;
      empleadosVisibles.forEach(emp => {
        const pres = typeof emp.prestaciones === 'string' ? JSON.parse(emp.prestaciones || '{}') : (emp.prestaciones || {});
        if (pres.generar_nomina === false) return; 

        const hor = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
        Object.keys(hor).forEach(fecha => {
          if (hor[fecha] && hor[fecha].pagado === true && hor[fecha].nomina_pagada !== true) {
            count++;
            if (!min || fecha < min) min = fecha;
            if (!max || fecha > max) max = fecha;
          }
        });
      });
      setFechasSugeridas({ min, max, count });
      if (count > 0 && min && max) { setFechaInicio(min); setFechaFin(max); }
    }
  }, [tabNomina, usuariosDB, empleadosVisibles]);

  const toggleDiaDescanso = (diaStr) => {
    setPrestacionesEmp(prev => {
      const arr = [...prev.dias_descanso];
      if (arr.includes(diaStr)) return { ...prev, dias_descanso: arr.filter(d => d !== diaStr) };
      else return { ...prev, dias_descanso: [...arr, diaStr] };
    });
  };

  const guardarReglasGlobales = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const matrizActual = typeof configGlobal.matriz_limpieza === 'string' ? JSON.parse(configGlobal.matriz_limpieza || '{}') : (configGlobal.matriz_limpieza || {});
      matrizActual.reglas_nomina = reglasNomina;
      const formData = new FormData(); formData.append('matriz_limpieza', JSON.stringify(matrizActual));
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) showAlert('Éxito', 'Reglas guardadas.', 'success');
    } catch(e) { showAlert('Error', 'Fallo de conexión.', 'error'); }
    setIsSubmitting(false);
  };

  const guardarPrestacionesEmpleado = async (e) => {
    e.preventDefault(); if (!empleadoEditId) return; setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/usuarios/${empleadoEditId}/prestaciones`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prestaciones: prestacionesEmp })
      });
      if (res.ok) { showAlert('Éxito', 'Ficha guardada.', 'success'); refrescarDatos(); }
    } catch(e) { showAlert('Error', 'Fallo de conexión.', 'error'); }
    setIsSubmitting(false);
  };

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
        let retardosReales = 0;
        let fallasLimpieza = 0;
        let diasVacaciones = 0;
        let diasDescanso = 0;
        const diasAuditados = [];

        let currentDate = new Date(fechaInicio + 'T12:00:00');
        const endDate = new Date(fechaFin + 'T12:00:00');

        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const nombreDiaActual = diasSemanaMap[currentDate.getDay()];
          
          if (!hor[dateStr] || hor[dateStr].pagado !== true) { currentDate.setDate(currentDate.getDate() + 1); continue; }
          if (hor[dateStr].nomina_pagada === true) { currentDate.setDate(currentDate.getDate() + 1); continue; }

          if (hor[dateStr].vacaciones === true) {
            diasAsistidos++;
            diasVacaciones++;
            diasAuditados.push(dateStr);
            currentDate.setDate(currentDate.getDate() + 1); continue;
          }

          const arrDescansos = pres.dias_descanso || [];
          if (arrDescansos.includes(nombreDiaActual)) {
            diasAsistidos++;
            diasDescanso++;
            diasAuditados.push(dateStr);
            currentDate.setDate(currentDate.getDate() + 1); continue;
          }

          const asistenciasDelDia = historial.filter(h => h.usuario_id === emp.id && h.fecha.startsWith(dateStr));
          if (asistenciasDelDia.length > 0) {
            diasAsistidos++;
            diasAuditados.push(dateStr);

            if (hor[dateStr] && hor[dateStr].entrada) {
              const entradaOficial = hor[dateStr].entrada;
              const [hOf, mOf] = entradaOficial.split(':').map(Number);
              const minOficiales = (hOf * 60) + mOf;
              const primeraAsistencia = asistenciasDelDia.sort((a,b) => new Date(a.hora_entrada) - new Date(b.hora_entrada))[0];
              const realDate = new Date(primeraAsistencia.hora_entrada);
              const minReales = (realDate.getHours() * 60) + realDate.getMinutes();

              if (minReales > (minOficiales + Number(reglasNomina.tolerancia_minutos))) retardosReales++;
            }
          }

          for (const area of Object.keys(evaluacionesLimpieza)) {
            if (String(matriz.asignaciones?.[area]?.[dateStr]) === String(emp.id)) {
              if (evaluacionesLimpieza[area][dateStr] === 'no_cumplio') fallasLimpieza++;
            }
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (diasAsistidos === 0 && (!pres.sueldo_base || Number(pres.sueldo_base) === 0)) continue;

        const sueldoBase = Number(pres.sueldo_base) || 0;
        let ingresoSueldo = 0;
        let sueldoDiarioEstimado = 0;
        
        if (pres.tipo_sueldo === 'Diario') {
          sueldoDiarioEstimado = sueldoBase;
          ingresoSueldo = sueldoBase * diasAsistidos;
        } else if (pres.tipo_sueldo === 'Semanal') {
          sueldoDiarioEstimado = sueldoBase / 7;
          ingresoSueldo = sueldoBase;
        } else if (pres.tipo_sueldo === 'Quincenal') {
          sueldoDiarioEstimado = sueldoBase / 15;
          ingresoSueldo = sueldoBase;
        } else if (pres.tipo_sueldo === 'Mensual') {
          sueldoDiarioEstimado = sueldoBase / 30;
          ingresoSueldo = sueldoBase;
        }

        const ingresosList = [{ concepto: 'SUELDO BASE', monto: ingresoSueldo }];

        if (diasVacaciones > 0) {
          const porcentajePrima = Number(pres.prima_vacacional) || 25;
          const montoPrima = (sueldoDiarioEstimado * diasVacaciones) * (porcentajePrima / 100);
          ingresosList.push({ concepto: `PRIMA VACACIONAL (${porcentajePrima}%) x${diasVacaciones}d`, monto: montoPrima });
          ingresoSueldo += montoPrima; 
        }

        const retardoCobrar = Math.max(0, retardosReales - Number(reglasNomina.retardos_libres));
        const penalizacionRetardos = retardoCobrar * Number(reglasNomina.descuento_retardo);
        const limpiezaCobrar = Math.max(0, fallasLimpieza - Number(reglasNomina.limpieza_libres));
        const penalizacionLimpieza = limpiezaCobrar * Number(reglasNomina.descuento_limpieza);

        calculos.push({
          empleado_id: emp.id, nombre: emp.nombre, nombre_completo: pres.nombre_completo || emp.nombre, rol: emp.rol, telefono: pres.telefono || emp.telefono,
          datos_banco: { banco: pres.banco, cuenta: pres.cuenta, rfc: pres.rfc, nss: pres.nss },
          metricas: { diasAsistidos, retardosReales, fallasLimpieza, diasAuditados, diasVacaciones, diasDescanso },
          ingresos: ingresosList,
          egresos: [
            { concepto: `RETARDOS (${retardoCobrar} multas)`, monto: penalizacionRetardos },
            { concepto: `FALLA LIMPIEZA (${limpiezaCobrar} multas)`, monto: penalizacionLimpieza }
          ],
          nuevos_ingresos: [], nuevos_egresos: [],
          total_ingresos: ingresoSueldo, total_egresos: penalizacionRetardos + penalizacionLimpieza,
          neto: ingresoSueldo - (penalizacionRetardos + penalizacionLimpieza)
        });
      }

      if (calculos.length === 0) {
        showAlert('Atención', 'Ningún empleado tiene días pendientes de pago en el rango seleccionado.', 'warning');
        return setIsSubmitting(false);
      }

      setPreNomina(calculos); setTabNomina('previa');
    } catch (e) { showAlert('Error', 'Fallo al procesar datos.', 'error'); }
    setIsSubmitting(false);
  };

  const handleModificadorExtra = (empIndex, tipo, accion, idx, field, value) => {
    const nuevaLista = [...preNomina]; const emp = nuevaLista[empIndex];
    const targetArray = tipo === 'ingreso' ? emp.nuevos_ingresos : emp.nuevos_egresos;

    if (accion === 'add') targetArray.push({ concepto: '', monto: '' });
    else if (accion === 'remove') targetArray.splice(idx, 1);
    else targetArray[idx][field] = value;

    const tIng = emp.ingresos.reduce((s,i)=>s+Number(i.monto),0) + emp.nuevos_ingresos.reduce((s,i)=>s+(Number(i.monto)||0),0);
    const tEgr = emp.egresos.reduce((s,i)=>s+Number(i.monto),0) + emp.nuevos_egresos.reduce((s,i)=>s+(Number(i.monto)||0),0);
    emp.total_ingresos = tIng; emp.total_egresos = tEgr; emp.neto = tIng - tEgr;
    setPreNomina(nuevaLista);
  };

  const procesarNominaFinal = async () => {
    showConfirm("Generar y Bloquear Nómina", `¿Estás seguro de Aprobar? Se generarán los recibos y estos días quedarán sellados.`, async () => {
      setIsSubmitting(true);
      try {
        const userObj = JSON.parse(localStorage.getItem('pos_sesion') || '{}').data || {};
        const datosCorteFinal = preNomina.map(p => ({
          ...p, ingresos: [...p.ingresos, ...p.nuevos_ingresos.filter(x => x.concepto && x.monto)], egresos: [...p.egresos, ...p.nuevos_egresos.filter(x => x.concepto && x.monto)]
        }));

        const payloadCorte = {
          metadata: { es_nomina: true, fecha_inicio: fechaInicio, fecha_fin: fechaFin },
          recibos: datosCorteFinal
        };

        const res = await fetch(`${apiUrl}/usuarios/corte-nomina`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_admin_id: userObj.id || null, datos_corte: payloadCorte })
        });

        if (res.ok) {
          await Promise.all(preNomina.map(async (p) => {
            const emp = usuariosDB.find(u => u.id === p.empleado_id);
            const horActual = typeof emp.horario_semanal === 'string' ? JSON.parse(emp.horario_semanal || '{}') : (emp.horario_semanal || {});
            const horNuevo = { ...horActual };
            p.metricas.diasAuditados.forEach(diaPagado => { if (!horNuevo[diaPagado]) horNuevo[diaPagado] = {}; horNuevo[diaPagado].nomina_pagada = true; });
            return fetch(`${apiUrl}/usuarios/${p.empleado_id}/horario`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ horario_semanal: horNuevo }) });
          }));
          showAlert("✅ Nómina Aprobada", "Recibos generados y días bloqueados.", "success");
          setTabNomina('historial'); cargarHistoricoNominas(); refrescarDatos();
        }
      } catch(e) { showAlert("Error", "Error al procesar la nómina.", "error"); }
      setIsSubmitting(false);
    });
  };

  const lanzarImpresion = (recibo, metadata) => {
    // 👇 SOLUCIÓN ERROR DE IMPRESIÓN DEL BOTON EN EL HISTORIAL
    const divTicket = document.getElementById('seccion-a-imprimir-recibo');
    if (divTicket) {
      setReciboPrint({ ...recibo, metadata });
      setTimeout(() => window.print(), 500);
    } else {
      setReciboPrint({ ...recibo, metadata });
      setTimeout(() => window.print(), 500);
    }
  };

  // 👇 CORRECCIÓN DEL BOTÓN DE WHATSAPP (AQUÍ ESTABA EL WARNING)
  const enviarReciboPorWhatsApp = (recibo, metadata) => {
    if (!recibo.telefono) return showAlert("Atención", "Este empleado no tiene un número telefónico registrado en su ficha.", "warning");
    const tel = String(recibo.telefono).replace(/\D/g, '');
    let texto = `*RECIBO DE NÓMINA | ${configGlobal.nombre_negocio?.toUpperCase() || 'EMPRESA'}*\nPeriodo: ${metadata.fecha_inicio} al ${metadata.fecha_fin}\nEmpleado: ${recibo.nombre_completo || recibo.nombre}\n\n*Ingresos:*\n`;
    recibo.ingresos.forEach(i => { texto += `- ${i.concepto}: ${formaterMoneda(i.monto)}\n`; });
    texto += `\n*Egresos:*\n`;
    recibo.egresos.forEach(e => { texto += `- ${e.concepto}: ${formaterMoneda(e.monto)}\n`; });
    texto += `\n*TOTAL DEPOSITADO: ${formaterMoneda(recibo.neto)}*\n`;
    if (recibo.datos_banco?.banco) texto += `Banco: ${recibo.datos_banco.banco}\n`;
    window.open(`https://wa.me/52${tel}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  let recibosEmpleadoHistorial = [];
  if (empleadoHistorialId) {
    historicoNominas.forEach(nom => {
      const metadata = typeof nom.datos_corte === 'string' ? JSON.parse(nom.datos_corte).metadata : nom.datos_corte.metadata;
      const recibos = typeof nom.datos_corte === 'string' ? JSON.parse(nom.datos_corte).recibos : nom.datos_corte.recibos;
      const miRecibo = recibos.find(r => String(r.empleado_id) === String(empleadoHistorialId));
      if (miRecibo) recibosEmpleadoHistorial.push({ ...miRecibo, metadata, fecha_creacion: nom.fecha_creacion });
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-slate-900 p-2 rounded-3xl flex flex-wrap gap-2 print:hidden w-full max-w-full overflow-x-auto">
        <button onClick={() => setTabNomina('config_emp')} className={`px-4 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${tabNomina === 'config_emp' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Users size={16}/> 1. Sueldos y Fichas</button>
        <button onClick={() => setTabNomina('config_global')} className={`px-4 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${tabNomina === 'config_global' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Settings size={16}/> 2. Reglas Descuento</button>
        <button onClick={() => setTabNomina('generar')} className={`px-4 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${tabNomina === 'generar' || tabNomina === 'previa' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><DollarSign size={16}/> 3. Generar Nómina</button>
        <button onClick={() => setTabNomina('historial')} className={`px-4 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${tabNomina === 'historial' ? 'bg-slate-100 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><History size={16}/> 4. Todos los Recibos</button>
        <button onClick={() => setTabNomina('historial_emp')} className={`px-4 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${tabNomina === 'historial_emp' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Users size={16}/> 5. Historial Empleado</button>
      </div>

      {tabNomina === 'config_emp' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-200">
          <div className="lg:col-span-1 bg-white p-6 rounded-[32px] shadow-sm border border-slate-200">
            <h3 className="font-black text-slate-800 mb-4">Seleccionar Empleado</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {empleadosVisibles.map(emp => {
                const isSuspendido = emp.prestaciones && typeof emp.prestaciones === 'string' && JSON.parse(emp.prestaciones).generar_nomina === false;
                return (
                  <button key={emp.id} onClick={() => setEmpleadoEditId(emp.id)} className={`w-full text-left p-4 rounded-2xl transition border flex justify-between items-center ${empleadoEditId === emp.id ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
                    <div>
                      <p className="font-bold">{emp.nombre}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{emp.rol}</p>
                    </div>
                    {isSuspendido && <span className="bg-red-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-lg">Pausado</span>}
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="lg:col-span-2">
            {!empleadoEditId ? (
              <div className="bg-slate-50 p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200 h-full flex flex-col items-center justify-center">
                <Users size={64} className="text-slate-300 mb-4"/>
                <p className="text-xl font-black text-slate-500">Selecciona un empleado para configurar su sueldo y datos de contacto.</p>
              </div>
            ) : (
              <form onSubmit={guardarPrestacionesEmpleado} className={`bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200 space-y-6 transition-opacity ${!prestacionesEmp.generar_nomina ? 'opacity-80' : ''}`}>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100 pb-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre Completo Formal (Para Recibos)</label>
                    <input type="text" placeholder="Ej. Manuel Alejandro López..." value={prestacionesEmp.nombre_completo} onChange={e=>setPrestacionesEmp({...prestacionesEmp, nombre_completo: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 outline-none focus:ring-2 ring-blue-500"/>
                  </div>
                  <div className={`flex flex-col justify-center items-center border rounded-2xl p-3 transition-colors ${prestacionesEmp.generar_nomina ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-xs font-black uppercase tracking-widest mb-2 ${prestacionesEmp.generar_nomina ? 'text-emerald-700' : 'text-red-700'}`}>{prestacionesEmp.generar_nomina ? 'Nómina Activa' : 'Nómina Pausada'}</p>
                    <button type="button" onClick={() => setPrestacionesEmp({...prestacionesEmp, generar_nomina: !prestacionesEmp.generar_nomina})} className={`w-16 h-8 rounded-full transition-colors relative shadow-inner ${prestacionesEmp.generar_nomina ? 'bg-emerald-500' : 'bg-red-400'}`}>
                      <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow-sm ${prestacionesEmp.generar_nomina ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>

                {!prestacionesEmp.generar_nomina && (<div className="bg-red-100 text-red-700 p-4 rounded-2xl font-bold text-sm text-center">⚠️ Este empleado ha sido pausado y será excluido de la nómina hasta que lo vuelvas a activar.</div>)}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                    <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Sueldo Base ($)</label>
                    <input type="number" step="0.01" required value={prestacionesEmp.sueldo_base} onChange={e=>setPrestacionesEmp({...prestacionesEmp, sueldo_base: e.target.value})} className="w-full text-4xl font-black text-emerald-700 bg-white border border-emerald-200 rounded-xl p-4 outline-none text-center focus:ring-2 ring-emerald-500"/>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Frecuencia de Pago</label>
                    <select value={prestacionesEmp.tipo_sueldo} onChange={e=>setPrestacionesEmp({...prestacionesEmp, tipo_sueldo: e.target.value})} className="w-full text-xl font-black text-slate-700 bg-white border border-slate-200 rounded-xl p-6 outline-none text-center cursor-pointer focus:ring-2 ring-slate-400">
                      <option value="Diario">Diario</option><option value="Semanal">Semanal</option><option value="Quincenal">Quincenal</option><option value="Mensual">Mensual</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                  <div className="bg-purple-50 p-6 rounded-3xl border border-purple-200">
                    <label className="block text-[10px] font-black text-purple-600 uppercase tracking-widest mb-3">Días de Descanso Pagado</label>
                    <div className="flex flex-wrap gap-2">
                      {diasSemanaMap.map(dia => {
                        const seleccionado = prestacionesEmp.dias_descanso.includes(dia);
                        return (
                          <button key={dia} type="button" onClick={() => toggleDiaDescanso(dia)} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors border ${seleccionado ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-100'}`}>
                            {dia.substring(0,3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 flex flex-col justify-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Días Disponibles</label>
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" step="1" value={prestacionesEmp.dias_vacaciones_disponibles} onChange={e=>setPrestacionesEmp({...prestacionesEmp, dias_vacaciones_disponibles: e.target.value})} className="w-full text-xl font-black text-amber-700 bg-white border border-amber-300 rounded-xl p-3 outline-none text-center focus:ring-2 ring-amber-500"/>
                          <span className="text-xs font-black text-amber-600 uppercase">Días</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Prima (%)</label>
                        <div className="flex items-center gap-2">
                          <input type="number" step="0.1" min="0" value={prestacionesEmp.prima_vacacional} onChange={e=>setPrestacionesEmp({...prestacionesEmp, prima_vacacional: e.target.value})} className="w-full text-xl font-black text-amber-700 bg-white border border-amber-300 rounded-xl p-3 outline-none text-center focus:ring-2 ring-amber-500"/>
                          <span className="text-xs font-black text-amber-600 uppercase">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Fecha Ingreso</label><input type="date" value={prestacionesEmp.fecha_ingreso} onChange={e=>setPrestacionesEmp({...prestacionesEmp, fecha_ingreso: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"/></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Celular (WhatsApp)</label><input type="tel" maxLength="10" placeholder="Ej. 672..." value={prestacionesEmp.telefono} onChange={e=>setPrestacionesEmp({...prestacionesEmp, telefono: e.target.value.replace(/\D/g, '')})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"/></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Correo Electrónico</label><input type="email" placeholder="correo@..." value={prestacionesEmp.correo} onChange={e=>setPrestacionesEmp({...prestacionesEmp, correo: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"/></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Banco y Cuenta</label><input type="text" placeholder="Ej. BBVA - 1234..." value={prestacionesEmp.banco} onChange={e=>setPrestacionesEmp({...prestacionesEmp, banco: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"/></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">RFC</label><input type="text" value={prestacionesEmp.rfc} onChange={e=>setPrestacionesEmp({...prestacionesEmp, rfc: e.target.value.toUpperCase()})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none uppercase"/></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">CURP / NSS</label><input type="text" placeholder="Número de seguro..." value={prestacionesEmp.nss} onChange={e=>setPrestacionesEmp({...prestacionesEmp, nss: e.target.value.toUpperCase()})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none uppercase"/></div>
                </div>

                <button disabled={isSubmitting} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition active:scale-95 disabled:opacity-50">Guardar Ficha de Pago</button>
              </form>
            )}
          </div>
        </div>
      )}

      {tabNomina === 'config_global' && (
        <form onSubmit={guardarReglasGlobales} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 animate-in zoom-in-95 duration-200 max-w-3xl mx-auto">
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2"><Settings className="text-emerald-500"/> Reglas de Penalización</h3>
          <p className="text-sm font-bold text-slate-500 mb-8">Define cómo el sistema multará automáticamente a los empleados en la nómina.</p>
          
          <div className="space-y-8">
            <div className="bg-orange-50 p-6 rounded-3xl border border-orange-200">
              <h4 className="font-black text-orange-800 uppercase tracking-widest text-xs mb-4">⏱️ Impuntualidad y Retardos</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-[10px] font-black text-orange-600 uppercase mb-1">Tolerancia (Min)</label><input type="number" min="0" value={reglasNomina.tolerancia_minutos} onChange={e=>setReglasNomina({...reglasNomina, tolerancia_minutos: e.target.value})} className="w-full p-4 bg-white border border-orange-200 rounded-xl font-bold text-slate-700 outline-none"/></div>
                <div><label className="block text-[10px] font-black text-orange-600 uppercase mb-1">Retardos Perdonados</label><input type="number" min="0" value={reglasNomina.retardos_libres} onChange={e=>setReglasNomina({...reglasNomina, retardos_libres: e.target.value})} className="w-full p-4 bg-white border border-orange-200 rounded-xl font-bold text-slate-700 outline-none" title="Número de retardos al mes que no descuentan dinero"/></div>
                <div><label className="block text-[10px] font-black text-red-600 uppercase mb-1">Descuento x Retardo ($)</label><input type="number" min="0" value={reglasNomina.descuento_retardo} onChange={e=>setReglasNomina({...reglasNomina, descuento_retardo: e.target.value})} className="w-full p-4 bg-white border border-red-200 rounded-xl font-black text-red-600 outline-none"/></div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-200">
              <h4 className="font-black text-blue-800 uppercase tracking-widest text-xs mb-4">🧹 Áreas de Limpieza</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-blue-600 uppercase mb-1">Fallas Perdonadas (No cumplió)</label><input type="number" min="0" value={reglasNomina.limpieza_libres} onChange={e=>setReglasNomina({...reglasNomina, limpieza_libres: e.target.value})} className="w-full p-4 bg-white border border-blue-200 rounded-xl font-bold text-slate-700 outline-none"/></div>
                <div><label className="block text-[10px] font-black text-red-600 uppercase mb-1">Descuento x Falla ($)</label><input type="number" min="0" value={reglasNomina.descuento_limpieza} onChange={e=>setReglasNomina({...reglasNomina, descuento_limpieza: e.target.value})} className="w-full p-4 bg-white border border-red-200 rounded-xl font-black text-red-600 outline-none"/></div>
              </div>
            </div>
          </div>
          
          <button disabled={isSubmitting} className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-lg transition active:scale-95 disabled:opacity-50">Guardar Reglas Globales</button>
        </form>
      )}

      {tabNomina === 'generar' && (
        <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-200 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8 bg-rose-50 border border-rose-100 p-6 rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="bg-rose-500 text-white p-3 rounded-2xl"><DollarSign size={28}/></div>
              <div>
                <h3 className="text-2xl font-black text-rose-900 tracking-tight">Generar y Auditar Nómina</h3>
                <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">Asegúrate de incluir las fechas correctas</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-center">
              <input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} className="bg-white border border-rose-200 p-3 rounded-xl font-bold text-slate-700 outline-none"/>
              <span className="font-black text-rose-300">AL</span>
              <input type="date" value={fechaFin} onChange={e=>setFechaFin(e.target.value)} className="bg-white border border-rose-200 p-3 rounded-xl font-bold text-slate-700 outline-none"/>
              <button disabled={isSubmitting} onClick={calcularNomina} className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-xl font-black shadow-lg transition active:scale-95">Calcular Borrador</button>
            </div>
          </div>
          
          <div className="text-center py-10">
            {fechasSugeridas.count > 0 ? (
              <div className="animate-in fade-in">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-8 rounded-3xl max-w-lg mx-auto mb-6 shadow-sm">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500" />
                  <p className="text-2xl font-black mb-2">¡Tienes días listos para nómina!</p>
                  <p className="text-base font-bold mb-4">Hemos detectado {fechasSugeridas.count} turnos auditados que aún no se han pagado.</p>
                  <p className="text-xs mt-2 bg-emerald-100/50 p-3 rounded-xl border border-emerald-200 font-bold tracking-wide uppercase">
                    Rango recomendado: <br/><strong className="text-emerald-600 text-sm">{fechasSugeridas.min}</strong> al <strong className="text-emerald-600 text-sm">{fechasSugeridas.max}</strong>
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-400 max-w-md mx-auto leading-relaxed">
                  Las fechas ya han sido autocompletadas arriba. Presiona <strong className="text-rose-500">Calcular Borrador</strong> para revisar y aplicar bonos.
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in">
                <AlertTriangle size={48} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-xl font-black text-slate-500">No hay días auditados pendientes</p>
                <p className="text-sm font-medium text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                  El sistema no detecta turnos nuevos. Para poder generar nómina, primero debes ir a <strong>Horarios (Mes)</strong> y realizar el <strong>Corte Parcial</strong> para auditar las asistencias.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {tabNomina === 'previa' && (
        <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200 animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h3 className="text-2xl font-black text-slate-800">Revisión de Nómina <span className="text-rose-500 bg-rose-50 px-2 py-1 rounded-lg text-lg ml-2">{fechaInicio} al {fechaFin}</span></h3>
            <button onClick={() => setTabNomina('generar')} className="text-sm font-bold text-slate-400 hover:text-slate-800 transition">Volver a Fechas</button>
          </div>

          <div className="space-y-6 mb-8">
            {preNomina.length === 0 ? (
              <div className="text-center bg-slate-50 p-10 rounded-3xl border border-dashed border-slate-200">
                <p className="font-black text-2xl text-slate-500 mb-2">No hay días disponibles para pago.</p>
                <p className="text-sm font-bold text-slate-400 max-w-md mx-auto">Asegúrate de que los empleados tengan su sueldo configurado en el Paso 1, y que hayas realizado el "Corte Parcial" en el calendario de horarios para aprobar las asistencias de este rango.</p>
              </div>
            ) : preNomina.map((emp, empIdx) => (
              <div key={emp.empleado_id} className="bg-slate-50 rounded-3xl border border-slate-200 p-6 flex flex-col xl:flex-row gap-6">
                
                <div className="xl:w-1/4 space-y-3">
                  <h4 className="text-xl font-black text-slate-800">{emp.nombre_completo}</h4>
                  <p className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded w-fit uppercase tracking-widest">{emp.nombre} (Usuario)</p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-white border border-slate-200 p-2 rounded-xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Días Laborados</p><p className="font-black text-lg text-blue-600">{emp.metricas.diasAsistidos}</p></div>
                    <div className="bg-white border border-slate-200 p-2 rounded-xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Fallas Limp.</p><p className="font-black text-lg text-red-500">{emp.metricas.fallasLimpieza}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-xl text-center"><p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Descansos</p><p className="font-black text-sm text-emerald-700">{emp.metricas.diasDescanso}</p></div>
                    <div className="bg-amber-50 border border-amber-100 p-2 rounded-xl text-center"><p className="text-[9px] font-black text-amber-600 uppercase mb-1">Vacaciones</p><p className="font-black text-sm text-amber-700">{emp.metricas.diasVacaciones}</p></div>
                  </div>
                </div>

                <div className="xl:w-2/4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 shadow-inner">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-3">
                      <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Ingresos (+)</p>
                      <button onClick={()=>handleModificadorExtra(empIdx, 'ingreso', 'add')} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 transition flex items-center gap-1 shadow-sm">
                        <PlusCircle size={14}/> Agregar Bono
                      </button>
                    </div>
                    <div className="space-y-2">
                      {emp.ingresos.map((ing, i) => (
                        <div key={i} className="flex justify-between text-xs font-bold text-slate-600 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-sm"><span>{ing.concepto}</span><span className="text-emerald-600 font-black">{formaterMoneda(ing.monto)}</span></div>
                      ))}
                      {emp.nuevos_ingresos.map((ing, i) => (
                        <div key={i} className="flex gap-1.5 items-center">
                          <input type="text" placeholder="Concepto (Ej. Bono)" value={ing.concepto} onChange={e=>handleModificadorExtra(empIdx, 'ingreso', 'edit', i, 'concepto', e.target.value)} className="w-full text-xs p-2.5 border border-emerald-200 rounded-xl outline-none focus:ring-2 ring-emerald-500 font-bold"/>
                          <input type="number" placeholder="$" value={ing.monto} onChange={e=>handleModificadorExtra(empIdx, 'ingreso', 'edit', i, 'monto', e.target.value)} className="w-24 text-xs p-2.5 border border-emerald-200 rounded-xl outline-none focus:ring-2 ring-emerald-500 font-black text-emerald-600 text-center"/>
                          <button onClick={()=>handleModificadorExtra(empIdx, 'ingreso', 'remove', i)} className="text-red-400 hover:text-red-600 bg-white p-2 rounded-xl border border-red-100 transition"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-red-50/50 border border-red-200 rounded-2xl p-4 shadow-inner">
                    <div className="flex items-center justify-between border-b border-red-100 pb-3 mb-3">
                      <p className="text-xs font-black text-red-800 uppercase tracking-widest">Deducciones (-)</p>
                      <button onClick={()=>handleModificadorExtra(empIdx, 'egreso', 'add')} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-600 transition flex items-center gap-1 shadow-sm">
                        <PlusCircle size={14}/> Agreg. Descuento
                      </button>
                    </div>
                    <div className="space-y-2">
                      {emp.egresos.map((egr, i) => (
                        <div key={i} className="flex justify-between text-xs font-bold text-slate-600 bg-white p-2.5 rounded-xl border border-red-100 shadow-sm"><span>{egr.concepto}</span><span className="text-red-500 font-black">-{formaterMoneda(egr.monto)}</span></div>
                      ))}
                      {emp.nuevos_egresos.map((egr, i) => (
                        <div key={i} className="flex gap-1.5 items-center">
                          <input type="text" placeholder="Concepto (Ej. Faltante)" value={egr.concepto} onChange={e=>handleModificadorExtra(empIdx, 'egreso', 'edit', i, 'concepto', e.target.value)} className="w-full text-xs p-2.5 border border-red-200 rounded-xl outline-none focus:ring-2 ring-red-500 font-bold"/>
                          <input type="number" placeholder="$" value={egr.monto} onChange={e=>handleModificadorExtra(empIdx, 'egreso', 'edit', i, 'monto', e.target.value)} className="w-24 text-xs p-2.5 border border-red-200 rounded-xl outline-none focus:ring-2 ring-red-500 font-black text-red-600 text-center"/>
                          <button onClick={()=>handleModificadorExtra(empIdx, 'egreso', 'remove', i)} className="text-red-400 hover:text-red-600 bg-white p-2 rounded-xl border border-red-100 transition"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="xl:w-1/4 bg-slate-800 text-white rounded-2xl p-5 flex flex-col justify-center text-right shadow-md">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</p>
                  <p className={`text-4xl font-black ${emp.neto < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formaterMoneda(emp.neto)}</p>
                </div>
              </div>
            ))}
          </div>

          {preNomina.length > 0 && (
            <button disabled={isSubmitting} onClick={procesarNominaFinal} className="w-full bg-rose-600 hover:bg-rose-700 text-white py-6 rounded-2xl font-black text-xl shadow-xl shadow-rose-500/30 transition active:scale-95 flex items-center justify-center gap-2">
              <CheckCircle2 size={24}/> Aprobar y Bloquear Nómina (No Reversible)
            </button>
          )}
        </div>
      )}

      {tabNomina === 'historial' && (
        <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-200 animate-in fade-in max-w-full overflow-hidden">
          <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-2"><History className="text-blue-500"/> Historial de Recibos Emitidos</h3>
          
          {historicoNominas.length === 0 ? (
            <p className="text-center font-bold text-slate-400 py-10">Aún no hay nóminas emitidas en este mes.</p>
          ) : (
            <div className="space-y-6">
              {historicoNominas.map(nom => {
                const metadata = typeof nom.datos_corte === 'string' ? JSON.parse(nom.datos_corte).metadata : nom.datos_corte.metadata;
                const recibos = typeof nom.datos_corte === 'string' ? JSON.parse(nom.datos_corte).recibos : nom.datos_corte.recibos;
                
                return (
                  <div key={nom.id} className="border border-slate-200 rounded-3xl overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                      <p className="font-black text-slate-700">Periodo: {metadata.fecha_inicio} al {metadata.fecha_fin}</p>
                      <p className="text-[10px] text-slate-400 font-bold">Emitida el {new Date(nom.fecha_creacion).toLocaleDateString()}</p>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recibos.map(rec => (
                        <div key={rec.empleado_id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between gap-3 hover:border-blue-200 transition group">
                          <div>
                            <p className="font-black text-slate-800">{rec.nombre_completo || rec.nombre}</p>
                            <p className="text-xs font-bold text-emerald-600">{formaterMoneda(rec.neto)}</p>
                          </div>
                          <div className="flex gap-2">
                            {/* 👇 RE-AÑADIDO EL BOTÓN DE WHATSAPP EN HISTORIAL GLOBAL */}
                            <button onClick={() => enviarReciboPorWhatsApp(rec, metadata)} className="flex-1 bg-green-50 text-green-700 p-2 rounded-xl hover:bg-green-600 hover:text-white transition flex items-center justify-center gap-1 font-bold text-[10px] uppercase">
                              <Smartphone size={14}/> WhatsApp
                            </button>
                            <button onClick={() => lanzarImpresion(rec, metadata)} className="flex-1 bg-blue-50 text-blue-600 p-2 rounded-xl hover:bg-blue-600 hover:text-white transition flex items-center justify-center gap-1 font-bold text-[10px] uppercase" title="Imprimir Recibo de Empleado">
                              <Printer size={14}/> Imprimir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tabNomina === 'historial_emp' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-200">
          <div className="lg:col-span-1 bg-white p-6 rounded-[32px] shadow-sm border border-slate-200">
            <h3 className="font-black text-slate-800 mb-4">Seleccionar Empleado</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {empleadosVisibles.map(emp => (
                <button key={emp.id} onClick={() => setEmpleadoHistorialId(emp.id)} className={`w-full text-left p-4 rounded-2xl transition border ${empleadoHistorialId === emp.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
                  <p className="font-bold">{emp.nombre}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{emp.rol}</p>
                </button>
              ))}
            </div>
          </div>
          
          <div className="lg:col-span-2">
            {!empleadoHistorialId ? (
              <div className="bg-slate-50 p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200 h-full flex flex-col items-center justify-center">
                <History size={64} className="text-slate-300 mb-4"/>
                <p className="text-xl font-black text-slate-500">Selecciona un empleado para ver todo su registro histórico de nóminas.</p>
              </div>
            ) : (
              <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200 h-full">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-6">
                  <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600"><Users size={24}/></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">{empleadosVisibles.find(u=>u.id===Number(empleadoHistorialId))?.nombre}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Historial de Pagos</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {recibosEmpleadoHistorial.length === 0 ? (
                    <p className="text-center font-bold text-slate-400 py-10 border border-dashed border-slate-200 rounded-3xl">Este empleado aún no tiene recibos generados.</p>
                  ) : recibosEmpleadoHistorial.map((rec, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-300 transition">
                      <div>
                        <p className="font-black text-slate-700 text-lg">Del {rec.metadata.fecha_inicio} al {rec.metadata.fecha_fin}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Emitido: {new Date(rec.fecha_creacion).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col sm:items-end w-full sm:w-auto gap-3">
                        <p className="text-2xl font-black text-emerald-600">{formaterMoneda(rec.neto)}</p>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => enviarReciboPorWhatsApp(rec, rec.metadata)} className="flex-1 sm:flex-none bg-green-50 text-green-700 px-3 py-2 rounded-xl hover:bg-green-600 hover:text-white transition flex items-center justify-center gap-1 font-bold text-[10px] uppercase">
                            <Smartphone size={14}/> WhatsApp
                          </button>
                          <button onClick={() => lanzarImpresion(rec, rec.metadata)} className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-800 hover:text-white transition flex items-center justify-center gap-1 font-bold text-[10px] uppercase shadow-sm">
                            <Printer size={14}/> Imprimir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA OCULTA DE IMPRESIÓN */}
      <div id="seccion-a-imprimir-recibo">
      {reciboPrint && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
          
          <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-8">
            <div>
              <p className="text-[10px] font-bold tracking-widest">{configGlobal.nombre_negocio?.toUpperCase()}</p>
              <p className="text-xs mt-1 font-bold">RECIBO DE NÓMINA</p>
            </div>
            <div className="flex items-center gap-2">
               {configGlobal.logo_url && (
                 <img src={getImageUrl(configGlobal.logo_url)} alt="Logo" className="h-10 object-contain grayscale opacity-80" />
               )}
               <span className="text-2xl font-black text-slate-800 tracking-tighter ml-1">PAGO</span>
            </div>
          </div>

          <div className="text-xs space-y-1 mb-8 leading-relaxed font-medium">
            <p>{reciboPrint.id} SIST DESARROLLO RH {new Date().toISOString().split('T')[0]}</p>
            <br/>
            <p className="uppercase">RECIBI DE {configGlobal.nombre_negocio || 'LA EMPRESA'} LA CANTIDAD DE {formaterMoneda(reciboPrint.neto)} POR CONCEPTO DE MI SUELDO CORRESPONDIENTE AL {reciboPrint.metadata.fecha_inicio} AL {reciboPrint.metadata.fecha_fin} COMO SIGUE:</p>
            <p>NUM. DE CUENTA: {reciboPrint.datos_banco?.cuenta || 'EFECTIVO'}</p>
            <p className="uppercase">{reciboPrint.datos_banco?.banco || 'CAJA'}</p>
          </div>

          <table className="w-full text-xs border border-black mb-8">
            <thead>
              <tr className="border-b border-black">
                <th className="p-2 text-left font-normal border-r border-black w-1/2">CONCEPTO</th>
                <th className="p-2 text-right font-normal border-r border-black">Ingresos</th>
                <th className="p-2 text-right font-normal">Egresos</th>
              </tr>
            </thead>
            <tbody>
              {reciboPrint.ingresos.map((ing, i) => (
                <tr key={`ing-${i}`}>
                  <td className="p-2 border-r border-black uppercase">{ing.concepto}</td>
                  <td className="p-2 text-right border-r border-black">{formaterMoneda(ing.monto).replace('$', '')}</td>
                  <td className="p-2 text-right"></td>
                </tr>
              ))}
              {reciboPrint.egresos.map((egr, i) => (
                <tr key={`egr-${i}`}>
                  <td className="p-2 border-r border-black uppercase">- {egr.concepto}</td>
                  <td className="p-2 text-right border-r border-black"></td>
                  <td className="p-2 text-right">{formaterMoneda(egr.monto).replace('$', '')}</td>
                </tr>
              ))}
              <tr className="border-t border-black font-bold">
                <td className="p-2 border-r border-black uppercase text-right">TOTALES</td>
                <td className="p-2 text-right border-r border-black">{formaterMoneda(reciboPrint.total_ingresos).replace('$', '')}</td>
                <td className="p-2 text-right">{formaterMoneda(reciboPrint.total_egresos).replace('$', '')}</td>
              </tr>
              <tr className="border-t border-black font-bold">
                <td className="p-2 border-r border-black uppercase text-right">A PAGAR</td>
                <td className="p-2 text-center" colSpan="2">{formaterMoneda(reciboPrint.neto).replace('$', '')}</td>
              </tr>
            </tbody>
          </table>

          <div className="text-[10px] space-y-0.5 font-medium uppercase">
            <p>SUCURSAL MATRIZ {new Date().toISOString().split('T')[0]}</p>
            <p>{reciboPrint.empleado_id} {reciboPrint.nombre_completo || reciboPrint.nombre}</p>
            <p>NSS: {reciboPrint.datos_banco?.nss || 'NO REGISTRADO'}</p>
            <p>RFC: {reciboPrint.datos_banco?.rfc || 'NO REGISTRADO'}</p>
            <p>CURP: {reciboPrint.datos_banco?.curp || 'NO REGISTRADO'}</p>
          </div>

          <div className="mt-20 w-48 border-t border-black mx-auto text-center text-xs pt-1 uppercase">
            <p className="font-bold pb-1">{reciboPrint.nombre_completo || reciboPrint.nombre}</p>
            FIRMA DEL EMPLEADO
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default VistaNominas;