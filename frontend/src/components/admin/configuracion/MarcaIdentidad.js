import React from 'react';
import { Clock } from 'lucide-react';

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const MarcaIdentidad = ({ configGlobal, setConfigGlobal, logoBlob, setLogoBlob, isSubmitting, getImageUrl }) => {
  
  // Parsear el horario o inicializar por defecto
  const horarios = typeof configGlobal.horarios_semana === 'string' 
    ? JSON.parse(configGlobal.horarios_semana || '{}') 
    : (configGlobal.horarios_semana || {});

  const handleHorarioChange = (dia, campo, valor) => {
    const nuevosHorarios = { ...horarios };
    if (!nuevosHorarios[dia]) nuevosHorarios[dia] = { activo: true, apertura: '08:00', cierre: '22:00' };
    nuevosHorarios[dia][campo] = valor;
    setConfigGlobal({ ...configGlobal, horarios_semana: nuevosHorarios });
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-6 border-b pb-4 text-slate-700">1. Marca, Identidad y Horarios</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">  
        
        {/* COLUMNA IZQUIERDA: Info General y Logo */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">Nombre del Negocio</label>
            <input required value={configGlobal.nombre_negocio || ''} onChange={e => setConfigGlobal({...configGlobal, nombre_negocio: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold text-lg transition-all" disabled={isSubmitting}/>
          </div>  
          
          <div className="flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed rounded-3xl p-6 border-slate-200 hover:border-blue-300 transition-colors">
            <label className="text-sm font-bold text-slate-500 block mb-4 uppercase tracking-widest">Logo Principal</label>
            {configGlobal.logo_url && !logoBlob && (<img src={getImageUrl(configGlobal.logo_url)} alt="Logo" className="h-24 object-contain mb-6 drop-shadow-md" />)}
            <input id="logo-upload" type="file" accept="image/png, image/jpeg" onChange={e => setLogoBlob(e.target.files[0])} className="w-full text-sm text-slate-500 file:rounded-xl file:border-0 file:font-black file:px-6 file:py-3 file:bg-white file:text-blue-600 file:shadow-sm hover:file:bg-blue-50 transition cursor-pointer" disabled={isSubmitting}/>
          </div>
        </div>  

        {/* COLUMNA DERECHA: Horarios por Día */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
          <h4 className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-widest mb-4">
            <Clock size={18} className="text-blue-500" /> Horario Operativo Semanal
          </h4>
          <div className="space-y-3">
            {diasSemana.map(dia => {
              const hDia = horarios[dia] || { activo: true, apertura: '08:00', cierre: '22:00' };
              return (
                <div key={dia} className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${hDia.activo ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}>
                  <div className="w-24 flex-shrink-0">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={hDia.activo} onChange={e => handleHorarioChange(dia, 'activo', e.target.checked)} className="accent-blue-600 w-5 h-5 cursor-pointer" disabled={isSubmitting}/>
                      <span className="text-sm font-black text-slate-700">{dia.substring(0,3)}.</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    {/* 👇 SE AMPLIÓ EL ANCHO DEL INPUT A min-w-[115px] max-w-[140px] */}
                    <input type="time" disabled={!hDia.activo || isSubmitting} value={hDia.apertura} onChange={e => handleHorarioChange(dia, 'apertura', e.target.value)} className="w-full min-w-[115px] max-w-[140px] p-2 text-sm font-black bg-slate-100 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white text-center transition-all disabled:opacity-50" />
                    <span className="text-xs text-slate-400 font-black px-1">A</span>
                    <input type="time" disabled={!hDia.activo || isSubmitting} value={hDia.cierre} onChange={e => handleHorarioChange(dia, 'cierre', e.target.value)} className="w-full min-w-[115px] max-w-[140px] p-2 text-sm font-black bg-slate-100 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white text-center transition-all disabled:opacity-50" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  );
};  

export default MarcaIdentidad;