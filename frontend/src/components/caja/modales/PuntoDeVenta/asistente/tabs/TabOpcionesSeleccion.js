import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getPrecioDeltaVisual } from '../utils/asistenteCalculos';

// =========================================================================
// TAB 1: OPCIONES DE SELECCIÓN
// Muestra los botones para Tamaños, Sabores y Grupos (Obligatorios/Opcionales)
// =========================================================================

const TabOpcionesSeleccion = ({
  pasoActualObj,
  opcionSeleccionada, setOpcionSeleccionada,
  saborSeleccionado, setSaborSeleccionado,
  gruposSeleccionados, setGruposSeleccionados,
  gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados,
  navegacionManual,
  avanzarSiguienteInteligente,
  productoEnEspera,
  isSubItem
}) => {

  // 👇 FIX MÁSTER: El seguro que evita que crashee si no es su turno
  if (!['tamaño', 'sabor', 'grupo_obligatorio', 'grupo_opcional', 'obligatorio', 'opcional'].includes(pasoActualObj?.tipo)) {
      return null;
  }

  return (
    <div className="animate-in slide-in-from-right duration-200 px-4 md:px-8">
      <p className="text-center text-slate-400 font-bold mb-2 uppercase tracking-widest text-[10px] md:text-xs">
        {pasoActualObj.titulo}
      </p>
      
      {(pasoActualObj.tipo === 'grupo_opcional' || pasoActualObj.tipo === 'opcional') && (
        <p className="text-center text-xs font-bold text-emerald-500 mb-4 md:mb-6">
          Seleccionadas: {(gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).length} de {pasoActualObj.limite}
        </p>
      )}

      {(pasoActualObj.tipo !== 'grupo_opcional' && pasoActualObj.tipo !== 'opcional') && (
        <div className="border-b pb-4 mb-4"></div>
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4 pb-6">
        {/* 👇 Le agregamos un fallback || [] por ultra seguridad */}
        {(pasoActualObj.opciones || []).map((o, idx) => {
          
          // 1. Detección de Selección Actual
          let estaSeleccionado = false;
          if (pasoActualObj.tipo === 'tamaño' || pasoActualObj.id === 'tamano') {
            estaSeleccionado = opcionSeleccionada?.nombre === o.nombre;
          } else if (pasoActualObj.tipo === 'sabor' || pasoActualObj.id === 'sabor') {
            estaSeleccionado = saborSeleccionado?.nombre === o.nombre;
          } else if (pasoActualObj.tipo === 'grupo_obligatorio' || pasoActualObj.tipo === 'obligatorio') {
            estaSeleccionado = gruposSeleccionados[pasoActualObj.categoria || pasoActualObj.id]?.nombre === o.nombre;
          } else if (pasoActualObj.tipo === 'grupo_opcional' || pasoActualObj.tipo === 'opcional') {
            estaSeleccionado = (gruposOpcionalesSeleccionados[pasoActualObj.categoria] || []).some(x => x.nombre === o.nombre);
          }

          // 2. Control de Límites para Grupos Opcionales
          const seleccionadosActuales = gruposOpcionalesSeleccionados[pasoActualObj.categoria] || [];
          const yaLlegoAlLimite = (pasoActualObj.tipo === 'grupo_opcional' || pasoActualObj.tipo === 'opcional') && seleccionadosActuales.length >= pasoActualObj.limite;
          const disabled = yaLlegoAlLimite && !estaSeleccionado;

          // 3. Matemáticas Visuales usando la Utilidad
          const precioAMostrar = getPrecioDeltaVisual(o, productoEnEspera, isSubItem);
          const textoCero = (pasoActualObj.tipo === 'grupo_opcional' || pasoActualObj.tipo === 'opcional') ? 'Gratis' : 'Incluido';

          return (
            <button
              key={idx}
              disabled={disabled}
              onClick={() => {
                if (pasoActualObj.tipo === 'tamaño' || pasoActualObj.id === 'tamano') {
                    setOpcionSeleccionada(o);
                    if (!navegacionManual) setTimeout(() => avanzarSiguienteInteligente({ opcionSeleccionada: o }), 150);
                }
                else if (pasoActualObj.tipo === 'sabor' || pasoActualObj.id === 'sabor') {
                    setSaborSeleccionado(o);
                    if (!navegacionManual) setTimeout(() => avanzarSiguienteInteligente({ saborSeleccionado: o }), 150);
                }
                else if (pasoActualObj.tipo === 'grupo_obligatorio' || pasoActualObj.tipo === 'obligatorio') {
                    const nvosGrupos = { ...gruposSeleccionados, [pasoActualObj.categoria || pasoActualObj.id]: o };
                    setGruposSeleccionados(nvosGrupos);
                    if (!navegacionManual) setTimeout(() => avanzarSiguienteInteligente({ gruposSeleccionados: nvosGrupos }), 150);
                }
                else if (pasoActualObj.tipo === 'grupo_opcional' || pasoActualObj.tipo === 'opcional') {
                   if (estaSeleccionado) {
                     setGruposOpcionalesSeleccionados({
                       ...gruposOpcionalesSeleccionados,
                       [pasoActualObj.categoria]: seleccionadosActuales.filter(x => x.nombre !== o.nombre)
                     });
                   } else {
                     setGruposOpcionalesSeleccionados({
                       ...gruposOpcionalesSeleccionados,
                       [pasoActualObj.categoria]: [...seleccionadosActuales, o]
                     });
                   }
                }
              }}
              className={`p-3 md:p-5 rounded-2xl md:rounded-3xl border-2 transition-all font-black flex flex-col items-center justify-center text-center text-xs md:text-sm leading-tight relative shadow-sm ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'active:scale-95'} ${estaSeleccionado ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-md transform scale-[1.02]' : 'border-slate-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/50'}`}
            >
              {estaSeleccionado && (
                <div className="absolute top-2 right-2 text-blue-600">
                  <CheckCircle2 size={18} className="fill-blue-100" />
                </div>
              )}
              <span>{o.nombre}</span>
              <span className={`mt-2 px-2 py-1 rounded-md text-[9px] md:text-[10px] uppercase tracking-wider ${estaSeleccionado ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                {precioAMostrar > 0 ? `+ $${precioAMostrar}` : textoCero}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabOpcionesSeleccion;