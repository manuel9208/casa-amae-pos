import React, { useState } from 'react';
import { ChefHat } from 'lucide-react';

// Importamos nuestros subcomponentes modulares nuevos
import SelectorPersonalCocina from './SelectorPersonalCocina';
import TarjetaComandaCocina from './TarjetaComandaCocina';

const MonitorCocinaKDS = ({ 
  user, 
  pedidos, 
  empleadosPOS, 
  apiUrl, 
  isSubmitting 
}) => {
  // ==========================================
  // ESTADOS Y VARIABLES LOCALES DE CONTROL
  // ==========================================
  const [trabajadorActivoId, setTrabajadorActivoId] = useState(user?.id);
  const [procesandoLocal, setProcesandoLocal] = useState(false);  

  // 👇 FILTRO INTELIGENTE ORIGINAL: Identificar el día actual de la semana
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaHoy = diasSemana[new Date().getDay()];

  // 👇 FILTRO: Personal de cocina activo que tenga turno asignado HOY
  const personalCocina = empleadosPOS.filter(emp => {
    // 1. Filtrar estrictamente por roles operativos de preparación
    const esEquipoCocina = ['cocina', 'ayudante_cocina'].includes(emp.rol);
    
    // 2. Cruzar con su matriz de horario_semanal guardada en la base de datos
    let trabajaHoy = false;
    try {
      const hor = typeof emp.horario_semanal === 'string' 
        ? JSON.parse(emp.horario_semanal) 
        : (emp.horario_semanal || {});
      trabajaHoy = hor[diaHoy] && hor[diaHoy].activo === true;
    } catch(e) {}

    return esEquipoCocina && trabajaHoy;
  });

  // Regla original intacta: Forzar al usuario logueado al inicio de la lista por usabilidad
  if (!personalCocina.find(e => e.id === user?.id) && user) {
    personalCocina.unshift(user);
  }

  // Regla de filtrado de comandas: Quita mostrador y estados terminados/cancelados
  const pedidosCocina = pedidos.filter(p => 
    ['Pendiente', 'Pagado', 'Preparando'].includes(p.estado_preparacion) && 
    p.tipo_consumo !== 'Mostrador'
  );

  // Helpers originales de mapeo
  const obtenerOrdenActiva = (id) => pedidosCocina.find(p => p.chef_id === id && p.estado_preparacion === 'Preparando');  

  // ==========================================
  // MANEJADOR OPERATIVO DE COMANDAS (API REST)
  // ==========================================
  const manejarCambioEstado = async (pedidoId, nuevoEstado) => {
    if (procesandoLocal || isSubmitting) return;
    setProcesandoLocal(true);
    try {
      await fetch(`${apiUrl}/pedidos/${pedidoId}/estado`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estado_preparacion: nuevoEstado, 
          chef_id: nuevoEstado === 'Preparando' ? trabajadorActivoId : undefined 
        })
      });
    } catch (error) {
      console.error("Error al actualizar la comanda desde KDS:", error);
    }
    // Anti-debounce original para evitar doble clic accidental en mobile
    setTimeout(() => setProcesandoLocal(false), 800);
  };  

  // ==========================================
  // CAPA DE RENDERIZADO CONDICIONAL (EMPTY STATE)
  // ==========================================
  if (pedidosCocina.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white rounded-[40px] border border-slate-200 border-dashed animate-in fade-in duration-300">
        <ChefHat size={64} className="text-slate-300 mb-4 animate-pulse" />
        <p className="text-2xl font-black text-slate-400">Sin comandas en cola</p>
        <p className="text-xs font-bold text-slate-400/80 mt-1 uppercase tracking-widest">Cocina al día</p>
      </div>
    );
  }  

  const ordenPendienteActivo = obtenerOrdenActiva(trabajadorActivoId);  

  return (
    <div className="space-y-6 Lauren-kds-flow animate-in slide-in-from-bottom-4 duration-300 w-full h-full">
      
      {/* MÓDULO 1: Barra superior de selección de Chefs */}
      <SelectorPersonalCocina 
        personalCocina={personalCocina}
        trabajadorActivoId={trabajadorActivoId}
        setTrabajadorActivoId={setTrabajadorActivoId}
        obtenerOrdenActiva={obtenerOrdenActiva}
      />  

      {/* MÓDULO 2: Rejilla fluida de Tickets de Comanda */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
        {pedidosCocina.map(pedido => (
          <TarjetaComandaCocina 
            key={pedido.id}
            pedido={pedido}
            trabajadorActivoId={trabajadorActivoId}
            manejarCambioEstado={manejarCambioEstado}
            procesandoLocal={procesandoLocal}
            ordenPendienteActivo={ordenPendienteActivo}
          />
        ))}
      </div>
    </div>
  );
};

export default MonitorCocinaKDS;