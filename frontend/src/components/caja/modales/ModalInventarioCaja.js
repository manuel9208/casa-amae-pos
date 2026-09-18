import React, { useState, useEffect } from 'react';
import { X, Search, Save, Send, ClipboardList, CheckCircle2 } from 'lucide-react';

const ModalInventarioCaja = ({ apiUrl, insumosDB, auditoriaActiva, cerrarModal, showAlert }) => {
  const [busqueda, setBusqueda] = useState('');
  const [datosLocales, setDatosLocales] = useState({});
  // 👇 NUEVO ESTADO: Memoriza qué unidad (GR/KL/ML/LT) eligió el cajero para cada producto
  const [unidadesLocales, setUnidadesLocales] = useState({}); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carga el progreso existente si el cajero le había dado "Guardar y Continuar"
  useEffect(() => {
    if (auditoriaActiva && auditoriaActiva.datos) {
      setDatosLocales(auditoriaActiva.datos);
    }
  }, [auditoriaActiva]);

  // 👇 FUNCIÓN MEJORADA: Maneja el cambio de cantidad y bloquea negativos
  const handleChange = (insumo, valor) => {
    if (valor === '') {
      const newDatos = {...datosLocales};
      delete newDatos[insumo.id];
      setDatosLocales(newDatos);
      return;
    }

    let cantidadReal = parseFloat(valor);
    if (cantidadReal < 0) cantidadReal = 0; // BLOQUEO MATEMÁTICO DE NEGATIVOS
    if (isNaN(cantidadReal)) return;

    const unidadSeleccionada = unidadesLocales[insumo.id] || insumo.unidad_medida;

    // Conversión matemática inteligente para guardar siempre en la unidad de la Base de Datos
    if (insumo.unidad_medida === 'KL' && unidadSeleccionada === 'GR') cantidadReal = cantidadReal / 1000;
    else if (insumo.unidad_medida === 'LT' && unidadSeleccionada === 'ML') cantidadReal = cantidadReal / 1000;
    else if (insumo.unidad_medida === 'GR' && unidadSeleccionada === 'KL') cantidadReal = cantidadReal * 1000;
    else if (insumo.unidad_medida === 'ML' && unidadSeleccionada === 'LT') cantidadReal = cantidadReal * 1000;

    setDatosLocales({ ...datosLocales, [insumo.id]: cantidadReal });
  };

  // 👇 NUEVA FUNCIÓN: Maneja cuando el usuario cambia de (Ej.) Litros a Mililitros
  const handleUnidadChange = (insumo, nuevaUnidad) => {
    setUnidadesLocales({ ...unidadesLocales, [insumo.id]: nuevaUnidad });
  };

  // 👇 NUEVA FUNCIÓN: Convierte el valor guardado para mostrarlo según la unidad que el cajero seleccionó
  const getDisplayValue = (insumo) => {
    let valBase = datosLocales[insumo.id];
    if (valBase === undefined) return '';
    let unit = unidadesLocales[insumo.id] || insumo.unidad_medida;

    if (insumo.unidad_medida === 'KL' && unit === 'GR') return (valBase * 1000).toString();
    if (insumo.unidad_medida === 'LT' && unit === 'ML') return (valBase * 1000).toString();
    if (insumo.unidad_medida === 'GR' && unit === 'KL') return (valBase / 1000).toString();
    if (insumo.unidad_medida === 'ML' && unit === 'LT') return (valBase / 1000).toString();
    
    return valBase.toString();
  };

  const guardarOEnviar = async (enviar_a_revision) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/insumos/auditoria/${auditoriaActiva.id}/guardar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: datosLocales, enviar_a_revision })
      });
      if (res.ok) {
        cerrarModal();
        showAlert(
          enviar_a_revision ? "Enviado a Gerencia" : "Progreso Guardado", 
          enviar_a_revision ? "La gerencia revisará el conteo." : "Puedes continuar más tarde.", 
          "success"
        );
      }
    } catch(e) {
      showAlert("Error", "Error de red al guardar el inventario.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const insumosFiltrados = (insumosDB || []).filter(ins => ins.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const avanceCount = Object.keys(datosLocales).length;
  const totalCount = (insumosDB || []).length;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in">
      <div className="bg-white rounded-[30px] p-6 max-w-4xl w-full shadow-2xl h-[90vh] flex flex-col relative overflow-hidden">
        
        <button onClick={cerrarModal} className="absolute top-6 right-6 text-slate-400 hover:bg-slate-100 p-2 rounded-full transition"><X size={24}/></button>

        <div className="mb-6">
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
            <ClipboardList className="text-red-500"/> Conteo de Inventario (Auditoría)
          </h3>
          <p className="text-slate-500 font-bold">Avance: <span className="text-indigo-600">{avanceCount} / {totalCount}</span> insumos registrados.</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
          <input 
            type="text" placeholder="Buscar ingrediente (ej. Café)..." 
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 font-bold text-lg text-slate-700 transition" 
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-6">
          {insumosFiltrados.map(ins => {
            const tieneDato = datosLocales[ins.id] !== undefined;
            return (
              <div key={ins.id} className={`flex flex-col sm:flex-row justify-between items-center bg-white border ${tieneDato ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'} p-4 rounded-2xl transition`}>
                <div className="flex-1 mb-3 sm:mb-0">
                  <p className="font-black text-slate-800 text-lg flex items-center gap-2">
                    {ins.nombre}
                    {tieneDato && <CheckCircle2 size={16} className="text-emerald-500"/>}
                  </p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unidad Sistema: {ins.unidad_medida}</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input 
                    type="number" 
                    step="any" 
                    min="0" // 👈 BLOQUEA TECLADO (FLECHAS ABAJO DE 0)
                    placeholder="Cant."
                    value={getDisplayValue(ins)}
                    onChange={(e) => handleChange(ins, e.target.value)}
                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }} // 👈 BLOQUEA TECLA "MENOS"
                    className="w-full sm:w-32 p-3 bg-white border-2 border-slate-200 focus:border-red-500 rounded-xl outline-none font-black text-xl text-center shadow-inner"
                  />
                  {/* 👇 NUEVO: Selector de Unidad Dinámico */}
                  <select 
                    value={unidadesLocales[ins.id] || ins.unidad_medida} 
                    onChange={(e) => handleUnidadChange(ins, e.target.value)} 
                    className="bg-slate-100 text-slate-600 px-2 py-3.5 rounded-xl font-black outline-none cursor-pointer appearance-none border-2 border-transparent focus:border-red-500 hover:bg-slate-200 transition"
                  >
                    {ins.unidad_medida === 'KL' && <><option value="KL">KL</option><option value="GR">GR</option></>}
                    {ins.unidad_medida === 'LT' && <><option value="LT">LT</option><option value="ML">ML</option></>}
                    {ins.unidad_medida !== 'KL' && ins.unidad_medida !== 'LT' && <option value={ins.unidad_medida}>{ins.unidad_medida}</option>}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
          <button onClick={() => guardarOEnviar(false)} disabled={isSubmitting} className="flex-1 py-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition flex items-center justify-center gap-2">
            <Save size={20}/> Pausar y Guardar
          </button>
          <button onClick={() => guardarOEnviar(true)} disabled={isSubmitting} className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-lg shadow-red-500/30 transition active:scale-95 text-lg flex items-center justify-center gap-2">
            <Send size={20}/> Terminar y Enviar a Gerencia
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalInventarioCaja;