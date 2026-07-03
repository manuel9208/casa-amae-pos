import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Lock, Star, Save, Users, ChevronLeft, ChevronRight, Info } from 'lucide-react';

const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const GestorCalendarioAnual = ({ configGlobal, setConfigGlobal, apiUrl, showAlert, refrescarDatos }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [yearActual, setYearActual] = useState(new Date().getFullYear());
  const [mesActivo, setMesActivo] = useState(new Date().getMonth());
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  // Extraemos la configuración guardada (Bloqueos o festivos personalizados del usuario)
  const calendarioDB = typeof configGlobal.calendario_anual === 'string' 
    ? JSON.parse(configGlobal.calendario_anual || '{}') 
    : (configGlobal.calendario_anual || {});
    
  const limiteSimultaneo = configGlobal.limite_vacaciones_simultaneas !== undefined 
    ? Number(configGlobal.limite_vacaciones_simultaneas) 
    : 2;

  const [calendarioVisual, setCalendarioVisual] = useState(calendarioDB);
  const [limiteLocal, setLimiteLocal] = useState(limiteSimultaneo);

  // =========================================================================
  // 🧠 MOTOR INTELIGENTE PERPETUO: Días Festivos y Tradiciones de México
  // =========================================================================
  const festivosAutomaticos = useMemo(() => {
    const festivos = {};
    const add = (mes, dia, motivo) => { festivos[`${yearActual}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`] = { tipo: 'festivo', motivo, auto: true }; };
    
    const obtenerLunes = (mesIndex, orden) => {
      let d = new Date(yearActual, mesIndex - 1, 1);
      let lunesContados = 0;
      while (d.getMonth() === mesIndex - 1) {
        if (d.getDay() === 1) {
          lunesContados++;
          if (lunesContados === orden) return d.getDate();
        }
        d.setDate(d.getDate() + 1);
      }
      return null;
    };

    // Algoritmo de Meeus/Jones/Butcher para calcular Domingo de Resurrección (Semana Santa)
    const getEaster = (Y) => {
      const a = Y % 19, b = Math.floor(Y / 100), c = Y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
      const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
      return new Date(Y, month - 1, day);
    };

    // Fechas Fijas (Oficiales y Tradicionales)
    add(1, 1, 'Año Nuevo');
    add(2, 2, 'Día de la Candelaria');
    add(5, 1, 'Día del Trabajo');
    add(5, 5, 'Batalla de Puebla');
    add(5, 10, 'Día de las Madres');
    add(9, 16, 'Independencia de México');
    add(11, 1, 'Día de Todos los Santos');
    add(11, 2, 'Día de Muertos');
    add(12, 12, 'Día de la Virgen de Guadalupe');
    add(12, 24, 'Nochebuena');
    add(12, 25, 'Navidad');
    add(12, 31, 'Fin de Año');

    // Fechas Móviles (LFT)
    add(2, obtenerLunes(2, 1), 'Constitución Mexicana'); // 1er Lunes Febrero
    add(3, obtenerLunes(3, 3), 'Natalicio Benito Juárez'); // 3er Lunes Marzo
    add(11, obtenerLunes(11, 3), 'Revolución Mexicana'); // 3er Lunes Noviembre
    if (yearActual >= 2024 && (yearActual - 2024) % 6 === 0) add(10, 1, 'Transición del Poder Ejecutivo');

    // Semana Santa (Dinámica)
    const domingoResurreccion = getEaster(yearActual);
    const juevesSanto = new Date(domingoResurreccion); juevesSanto.setDate(domingoResurreccion.getDate() - 3);
    const viernesSanto = new Date(domingoResurreccion); viernesSanto.setDate(domingoResurreccion.getDate() - 2);
    add(juevesSanto.getMonth() + 1, juevesSanto.getDate(), 'Jueves Santo');
    add(viernesSanto.getMonth() + 1, viernesSanto.getDate(), 'Viernes Santo');

    return festivos;
  }, [yearActual]);

  // =========================================================================
  // GENERADOR DEL CALENDARIO VISUAL (Mes seleccionado)
  // =========================================================================
  const getDiasDelMes = () => {
    const primerDia = new Date(yearActual, mesActivo, 1).getDay(); // 0 (Dom) a 6 (Sáb)
    const diasEnMes = new Date(yearActual, mesActivo + 1, 0).getDate();
    
    const celdas = [];
    for (let i = 0; i < primerDia; i++) celdas.push(null); // Espacios vacíos iniciales
    for (let d = 1; d <= diasEnMes; d++) {
      const fechaStr = `${yearActual}-${String(mesActivo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      // El estado final es una fusión: Lo de la BD manda sobre lo automático
      const estadoBase = festivosAutomaticos[fechaStr] || null;
      const estadoDB = calendarioVisual[fechaStr] || null;
      
      celdas.push({
        dia: d,
        fechaStr,
        tipo: estadoDB ? estadoDB.tipo : (estadoBase ? estadoBase.tipo : 'normal'),
        motivo: estadoDB ? estadoDB.motivo : (estadoBase ? estadoBase.motivo : ''),
        esAuto: estadoBase && !estadoDB // Si es automático y no ha sido modificado por el usuario
      });
    }
    return celdas;
  };

  const diasCeldas = getDiasDelMes();

  // =========================================================================
  // INTERACCIÓN CON EL PANEL LATERAL
  // =========================================================================
  const [panelDia, setPanelDia] = useState(null);

  const abrirDia = (celda) => {
    setDiaSeleccionado(celda.fechaStr);
    setPanelDia({
      fechaStr: celda.fechaStr,
      motivo: celda.motivo || '',
      esBloqueado: celda.tipo === 'bloqueado',
      esFestivo: celda.tipo === 'festivo',
      esAuto: celda.esAuto
    });
  };

  const guardarDiaSeleccionado = () => {
    if (!panelDia) return;
    
    // 👇 FIX: Quitamos 'esAuto' de la desestructuración para quitar el Warning de ESLint
    const { fechaStr, motivo, esBloqueado, esFestivo } = panelDia; 
    
    const nuevasReglas = { ...calendarioVisual };

    if (!esBloqueado && !esFestivo && !motivo) {
      // Si desmarcó todo, lo borramos de la DB (volverá a la normalidad o a ser auto-festivo)
      delete nuevasReglas[fechaStr];
    } else {
      // Guardamos la configuración específica para ese día
      nuevasReglas[fechaStr] = {
        tipo: esBloqueado ? 'bloqueado' : 'festivo',
        motivo: motivo.trim() || 'Día Especial'
      };
    }

    setCalendarioVisual(nuevasReglas);
    setDiaSeleccionado(null);
    setPanelDia(null);
  };

  const guardarConfiguracionGlobal = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('calendario_anual', JSON.stringify(calendarioVisual));
    formData.append('limite_vacaciones_simultaneas', limiteLocal);

    try {
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) {
        setConfigGlobal({ ...configGlobal, calendario_anual: JSON.stringify(calendarioVisual), limite_vacaciones_simultaneas: limiteLocal });
        showAlert("¡Guardado!", "El calendario y los bloqueos se han guardado exitosamente.", "success");
        if(refrescarDatos) refrescarDatos();
      } else {
        showAlert("Error", "No se pudo guardar la configuración.", "error");
      }
    } catch (error) {
      showAlert("Error", "Problema de red al guardar.", "error");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl shadow-inner">
            <CalendarIcon size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Calendario Anual y Reglas</h3>
            <p className="text-sm font-bold text-slate-500 mt-1">Días festivos automáticos y bloqueos de vacaciones.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-2xl w-full sm:w-auto justify-between">
            <div className="pl-3 flex items-center gap-2">
              <Users size={16} className="text-slate-400"/>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Límite Ausencias:</span>
            </div>
            <div className="flex items-center gap-1 bg-white pr-2 rounded-xl border border-slate-200">
              <input type="number" min="1" max="20" value={limiteLocal} onChange={(e) => setLimiteLocal(Number(e.target.value))} className="w-12 bg-transparent text-center font-black text-blue-600 outline-none p-2" />
              <span className="text-[10px] font-bold text-slate-400">Pxs</span>
            </div>
          </div>

          <button disabled={isSubmitting} onClick={guardarConfiguracionGlobal} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap">
            <Save size={20} /> Guardar Cambios
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* COLUMNA CALENDARIO (Izquierda 75%) */}
        <div className="lg:col-span-3 bg-white p-6 md:p-8 rounded-[36px] shadow-sm border border-slate-200">
          
          {/* SELECTOR DE AÑO Y MESES */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button onClick={() => setYearActual(y => y - 1)} className="p-2 hover:bg-white rounded-xl text-slate-600 transition shadow-sm"><ChevronLeft size={20}/></button>
              <span className="font-black text-2xl px-4 text-slate-800">{yearActual}</span>
              <button onClick={() => setYearActual(y => y + 1)} className="p-2 hover:bg-white rounded-xl text-slate-600 transition shadow-sm"><ChevronRight size={20}/></button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-4 mb-2">
            {mesesNombres.map((mes, idx) => (
              <button
                key={mes}
                onClick={() => { setMesActivo(idx); setDiaSeleccionado(null); }}
                className={`px-6 py-3 rounded-2xl font-black text-sm transition-all whitespace-nowrap ${mesActivo === idx ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
              >
                {mes}
              </button>
            ))}
          </div>

          {/* CUADRÍCULA DEL MES */}
          <div className="border border-slate-100 rounded-3xl overflow-hidden bg-slate-50/50">
            <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
              {diasSemana.map(d => (
                <div key={d} className={`p-3 text-center text-[10px] md:text-xs font-black uppercase tracking-widest ${d === 'Dom' || d === 'Sáb' ? 'text-red-400' : 'text-slate-500'}`}>
                  {d}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-px bg-slate-100">
              {diasCeldas.map((celda, i) => {
                if (!celda) return <div key={`blank-${i}`} className="bg-white min-h-[80px] md:min-h-[100px]"></div>;

                const isSelected = celda.fechaStr === diaSeleccionado;
                const isFestivo = celda.tipo === 'festivo';
                const isBloqueado = celda.tipo === 'bloqueado';

                let bgClass = 'bg-white hover:bg-blue-50';
                if (isSelected) bgClass = 'bg-blue-100 ring-2 ring-blue-500 ring-inset';
                else if (isBloqueado) bgClass = 'bg-rose-50 hover:bg-rose-100 border-b-2 border-rose-300';
                else if (isFestivo) bgClass = 'bg-amber-50 hover:bg-amber-100 border-b-2 border-amber-300';

                return (
                  <button
                    key={celda.fechaStr}
                    onClick={() => abrirDia(celda)}
                    className={`relative p-2 flex flex-col items-center justify-start min-h-[80px] md:min-h-[100px] transition-all cursor-pointer outline-none ${bgClass}`}
                  >
                    <span className={`font-black text-sm md:text-lg mb-1 ${isBloqueado ? 'text-rose-700' : isFestivo ? 'text-amber-700' : 'text-slate-700'}`}>
                      {celda.dia}
                    </span>
                    
                    {isBloqueado && (
                      <div className="flex flex-col items-center gap-0.5">
                        <Lock size={14} className="text-rose-500" />
                        <span className="text-[8px] md:text-[9px] font-bold text-rose-600 leading-tight truncate w-full px-1">{celda.motivo || 'Bloqueado'}</span>
                      </div>
                    )}
                    
                    {isFestivo && !isBloqueado && (
                      <div className="flex flex-col items-center gap-0.5">
                        <Star size={14} className="text-amber-500 fill-amber-500" />
                        <span className="text-[8px] md:text-[9px] font-bold text-amber-700 leading-tight truncate w-full px-1">{celda.motivo}</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-6 items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-200 border border-amber-400"></div> Festivo / Asueto</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-200 border border-rose-400"></div> Bloqueado para vacaciones</div>
          </div>
        </div>

        {/* COLUMNA PANEL LATERAL (Derecha 25%) */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 p-6 rounded-[36px] shadow-xl border border-slate-700 h-full flex flex-col sticky top-6 text-white">
            
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 border-b border-slate-700 pb-4">
              Ajustes del Día
            </h4>

            {!panelDia ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-10">
                <CalendarIcon size={48} className="mb-4" />
                <p className="font-bold text-sm">Selecciona un día en el calendario para configurarlo.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div>
                  <p className="text-2xl font-black text-blue-400 mb-1">
                    {panelDia.fechaStr.split('-')[2]} de {mesesNombres[Number(panelDia.fechaStr.split('-')[1]) - 1]}
                  </p>
                  {panelDia.esAuto && !panelDia.esBloqueado && (
                    <p className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-1 rounded inline-block border border-amber-500/30">
                      ✨ Festivo Automático (Sistema)
                    </p>
                  )}
                </div>

                <div className="space-y-4 bg-slate-900 p-4 rounded-2xl border border-slate-700">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="font-bold text-sm flex items-center gap-2 text-rose-400"><Lock size={16}/> Bloquear Día</span>
                    <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${panelDia.esBloqueado ? 'bg-rose-500' : 'bg-slate-600'}`}>
                      <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${panelDia.esBloqueado ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                    <input type="checkbox" className="hidden" checked={panelDia.esBloqueado} onChange={(e) => setPanelDia({...panelDia, esBloqueado: e.target.checked, esFestivo: false})} />
                  </label>
                  
                  {!panelDia.esBloqueado && (
                    <label className="flex items-center justify-between cursor-pointer group pt-4 border-t border-slate-700">
                      <span className="font-bold text-sm flex items-center gap-2 text-amber-400"><Star size={16}/> Es Festivo</span>
                      <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${panelDia.esFestivo || panelDia.esAuto ? 'bg-amber-500' : 'bg-slate-600'}`}>
                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${panelDia.esFestivo || panelDia.esAuto ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                      <input type="checkbox" className="hidden" checked={panelDia.esFestivo || panelDia.esAuto} onChange={(e) => setPanelDia({...panelDia, esFestivo: e.target.checked, esAuto: false})} />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motivo / Nombre del Día</label>
                  <textarea 
                    value={panelDia.motivo} 
                    onChange={e => setPanelDia({...panelDia, motivo: e.target.value})} 
                    placeholder="Ej. Aniversario del Local..." 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 transition resize-none text-white h-24"
                  ></textarea>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <button onClick={guardarDiaSeleccionado} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-900/50 transition active:scale-95">
                    Aplicar al día
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-3 font-bold flex items-center justify-center gap-1">
                    <Info size={12}/> Recuerda dar clic en "Guardar Cambios" arriba.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default GestorCalendarioAnual;