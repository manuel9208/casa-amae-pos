import { useState, useEffect } from 'react';

// =========================================================================
// HOOK DE NAVEGACIÓN: "EL CEREBRO DEL ASISTENTE"
// Controla el Freno de Mano, los Auto-Saltos y la creación de Pestañas.
// =========================================================================

export const useAsistenteNav = ({
  productoEnEspera,
  pasoPersonalizacion,
  setPasoPersonalizacion,
  opcionSeleccionada,
  saborSeleccionado,
  gruposSeleccionados,
  gruposOpcionalesSeleccionados // 👈 Agregamos esto para leer los defaults de los personalizados
}) => {
  const [pasoActualObj, setPasoActualObj] = useState(null);
  const [pasosWiz, setPasosWiz] = useState([]);
  
  // ESTADO DE FRENO DE MANO (Navegación Manual vs Auto-Skip)
  const [navegacionManual, setNavegacionManual] = useState(false);

  // 1. CONSTRUCTOR DE PESTAÑAS Y CATAPULTA INICIAL AL ABRIR EL MODAL
  useEffect(() => {
    if (productoEnEspera) {
      let pasosTemp = [];
      const tamanosList = (productoEnEspera.opciones || []).filter(o => o.categoria === 'Tamaño');
      const saboresList = (productoEnEspera.opciones || []).filter(o => o.tipo === 'variacion' && o.categoria !== 'Tamaño');
      const gruposObligatoriosList = [...new Set((productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_obligatorio').map(o => o.categoria))];
      const objGruposOpcionales = {};
      
      (productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_opcional').forEach(o => {
        if (!objGruposOpcionales[o.categoria]) objGruposOpcionales[o.categoria] = { limite: o.limite || 1, opciones: [] };
        objGruposOpcionales[o.categoria].opciones.push(o);
      });

      if (tamanosList.length > 0) pasosTemp.push({ id: 'tamano', tipo: 'tamaño', titulo: 'Elige el Tamaño *', categoria: 'Tamaño', opciones: tamanosList });
      if (saboresList.length > 0) pasosTemp.push({ id: 'sabor', tipo: 'sabor', titulo: 'Elige un Sabor *', categoria: 'Sabor', opciones: saboresList.sort((a, b) => a.nombre.localeCompare(b.nombre)) });

      gruposObligatoriosList.forEach(g => {
        pasosTemp.push({
          id: `grupo_obl_${g}`, tipo: 'grupo_obligatorio', titulo: `Elige: ${g} *`, categoria: g,
          opciones: (productoEnEspera.opciones || []).filter(o => o.tipo === 'grupo_obligatorio' && o.categoria === g).sort((a, b) => a.nombre.localeCompare(b.nombre))
        });
      });

      Object.keys(objGruposOpcionales).forEach(g => {
        pasosTemp.push({
          id: `grupo_opc_${g}`, tipo: 'grupo_opcional', titulo: `Personaliza: ${g}`, categoria: g, limite: objGruposOpcionales[g].limite,
          opciones: objGruposOpcionales[g].opciones.sort((a, b) => a.nombre.localeCompare(b.nombre))
        });
      });

      const bases = (productoEnEspera.opciones || []).filter(o => o.tipo === 'base').sort((a, b) => a.nombre.localeCompare(b.nombre));
      if (bases.length > 0) pasosTemp.push({ id: 'quitar_ingredientes', tipo: 'quitar_ingredientes', titulo: 'Receta', opciones: bases });

      pasosTemp.push({ id: 'extras_notas', tipo: 'extras_notas', titulo: 'Extras', categoria: 'Extras' });

      setPasosWiz(pasosTemp);

      // 👇 CATAPULTA INICIAL CON REGLAS DE NEGOCIO ESTRICTAS
      if (pasosTemp.length > 0 && pasoPersonalizacion === 0 && !navegacionManual) {
          let targetIndex = 0;
          
          for (let i = 0; i < pasosTemp.length; i++) {
              const step = pasosTemp[i];
              
              // REGLA 1: Sabores y Tamaños NUNCA se saltan al inicio
              if (step.tipo === 'tamaño') { targetIndex = i; break; }
              if (step.tipo === 'sabor') { targetIndex = i; break; }
              
              // REGLA 2: Obligatorios SE SALTAN SOLO SI tienen un valor precargado (Por defecto)
              if (step.tipo === 'grupo_obligatorio' && !gruposSeleccionados[step.categoria || step.id]) { 
                  targetIndex = i; break; 
              }
              
              // 👇 NUEVA REGLA 3: Personalizados (Opcionales) SE SALTAN SOLO SI tienen un valor precargado (Por defecto)
              if (step.tipo === 'grupo_opcional' || step.tipo === 'opcional') { 
                  // Evaluamos si el sistema auto-llenó algún ingrediente en este grupo
                  const tieneDefaults = gruposOpcionalesSeleccionados[step.categoria] && gruposOpcionalesSeleccionados[step.categoria].length > 0;
                  if (!tieneDefaults) {
                      targetIndex = i; 
                      break; 
                  }
              }
              
              // REGLA 4: Receta ('quitar_ingredientes') SIEMPRE se salta (pasa de largo)
              
              // REGLA 5: Extras SIEMPRE frena el salto
              if (step.tipo === 'extras_notas') { targetIndex = i; break; }
          }
          
          if (targetIndex !== 0) {
              setPasoPersonalizacion(targetIndex); 
              setPasoActualObj(pasosTemp[targetIndex]);
              return;
          }
      }

      setPasoActualObj(pasosTemp[pasoPersonalizacion] || null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoEnEspera, pasoPersonalizacion, setPasoPersonalizacion, navegacionManual, opcionSeleccionada, saborSeleccionado, gruposSeleccionados, gruposOpcionalesSeleccionados]);


  // 2. FUNCIÓN DE AVANCE INTELIGENTE (Se ejecuta al dar clic en Siguiente o en un botón)
  const avanzarSiguienteInteligente = (nuevosEstados = {}) => {
      let nextIndex = pasosWiz.length - 1; 
      
      for (let i = pasoPersonalizacion + 1; i < pasosWiz.length - 1; i++) {
          const step = pasosWiz[i];
          let isCompleted = false;

          if (step.tipo === 'tamaño') {
              isCompleted = !!(nuevosEstados.opcionSeleccionada !== undefined ? nuevosEstados.opcionSeleccionada : opcionSeleccionada);
          } else if (step.tipo === 'sabor') {
              isCompleted = !!(nuevosEstados.saborSeleccionado !== undefined ? nuevosEstados.saborSeleccionado : saborSeleccionado);
          } else if (step.tipo === 'grupo_obligatorio') {
              const currentGrpSel = nuevosEstados.gruposSeleccionados || gruposSeleccionados;
              isCompleted = !!currentGrpSel[step.categoria || step.id];
          } else if (step.tipo === 'grupo_opcional' || step.tipo === 'opcional') {
              // 👇 NUEVA LÓGICA: Si tiene defaults, asume que está completado y lo salta
              const currentGrpOpcSel = nuevosEstados.gruposOpcionalesSeleccionados || gruposOpcionalesSeleccionados;
              isCompleted = currentGrpOpcSel[step.categoria] && currentGrpOpcSel[step.categoria].length > 0;
          } else if (step.tipo === 'quitar_ingredientes') {
              // La modificación de receta SIEMPRE se salta
              isCompleted = true; 
          }

          if (!isCompleted) {
              nextIndex = i; 
              break;
          }
      }
      
      setNavegacionManual(false); // Soltamos el freno manual
      setPasoPersonalizacion(nextIndex);
  };

  return {
    pasoActualObj,
    pasosWiz,
    navegacionManual,
    setNavegacionManual,
    avanzarSiguienteInteligente
  };
};