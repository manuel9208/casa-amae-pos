import React, { useState } from 'react';
import { ChefHat } from 'lucide-react';  
import SelectorPersonalCocina from './SelectorPersonalCocina';
import TarjetaComandaCocina from './TarjetaComandaCocina'; 

const MonitorCocinaKDS = ({
  user,
  pedidos,
  empleadosPOS,
  apiUrl,
  isSubmitting
}) => {
  const [trabajadorActivoId, setTrabajadorActivoId] = useState(user?.id);
  const [procesandoLocal, setProcesandoLocal] = useState(false);  

  // Identificar el día actual de la semana
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaHoy = diasSemana[new Date().getDay()];  

  // Personal de cocina activo que tenga turno asignado HOY
  const personalCocina = empleadosPOS.filter(emp => {
    const esEquipoCocina = ['cocina', 'ayudante_cocina'].includes(emp.rol);  
    let trabajaHoy = false;
    try {
      const hor = typeof emp.horario_semanal === 'string'
        ? JSON.parse(emp.horario_semanal)
        : (emp.horario_semanal || {});
      trabajaHoy = hor[diaHoy] && hor[diaHoy].activo === true;
    } catch(e) {}  
    return esEquipoCocina && trabajaHoy;
  });  

  // Forzar al usuario logueado al inicio de la lista
  if (!personalCocina.find(e => e.id === user?.id) && user) {
    personalCocina.unshift(user);
  }  

  const pedidosCocina = pedidos.filter(p =>
    ['Pendiente', 'Pagado', 'Aceptado', 'Preparando'].includes(p.estado_preparacion) &&
    p.tipo_consumo !== 'Mostrador'
  );  

  const obtenerOrdenActiva = (id) => pedidosCocina.find(p => p.chef_id === id && p.estado_preparacion === 'Preparando');  

  // ==========================================
  // NUEVO MOTOR GRANULAR (Por Platillo)
  // ==========================================
  const procesarAccionItems = async (pedido, indicesAfectados, accion, trabajadorId) => {
    if (procesandoLocal || isSubmitting) return;
    setProcesandoLocal(true);

    try {
      // Deserializar carrito si es necesario
      const carritoActualizado = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : [...pedido.carrito];
      const ahoraStr = new Date().toISOString();  

      // Modificar granularmente los items solicitados
      indicesAfectados.forEach(idx => {
        if (accion === 'Preparar' || accion === 'Ayudar') {
          carritoActualizado[idx].estado = 'Preparando';
          carritoActualizado[idx].chef_id = trabajadorId;
          if (accion === 'Preparar') carritoActualizado[idx].tiempo_inicio = ahoraStr;
        } else if (accion === 'Terminar') {
          carritoActualizado[idx].estado = 'Listo';
          carritoActualizado[idx].tiempo_fin = ahoraStr;
        }
      });  

      let allListos = true;
      let anyPreparando = false;  

      carritoActualizado.forEach(i => {
        if (i.estado !== 'Listo' && i.estado !== 'Finalizado') allListos = false;
        if (i.estado === 'Preparando') anyPreparando = true;
      });  

      // Calcular el nuevo estado global en base a los hijos (items)
      let nuevoEstadoGlobal = pedido.estado_preparacion;
      if (allListos) nuevoEstadoGlobal = 'Listo';
      else if (anyPreparando || accion === 'Preparar' || accion === 'Ayudar') nuevoEstadoGlobal = 'Preparando';  

      const mainChefId = carritoActualizado.find(i => i.chef_id)?.chef_id || pedido.chef_id;  

      // Disparar a la API
      await fetch(`${apiUrl}/pedidos/${pedido.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_preparacion: nuevoEstadoGlobal,
          chef_id: mainChefId,
          carrito: carritoActualizado
        })
      });
    } catch (error) {
      console.error("Error al actualizar la comanda desde Minicocina KDS:", error);
    }
    
    setTimeout(() => setProcesandoLocal(false), 800);
  };  

  if (pedidosCocina.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white rounded-[40px] border border-slate-200 border-dashed animate-in fade-in duration-300">
        <ChefHat size={64} className="text-slate-300 mb-4 animate-pulse" />
        <p className="text-2xl font-black text-slate-400">Sin comandas en cola</p>
        <p className="text-xs font-bold text-slate-400/80 mt-1 uppercase tracking-widest">Cocina al día</p>
      </div>
    );
  }  

  return (
    <div className="space-y-6 Lauren-kds-flow animate-in slide-in-from-bottom-4 duration-300 w-full h-full">  
      <SelectorPersonalCocina
        personalCocina={personalCocina}
        trabajadorActivoId={trabajadorActivoId}
        setTrabajadorActivoId={setTrabajadorActivoId}
        obtenerOrdenActiva={obtenerOrdenActiva}
      />  
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
        {pedidosCocina.map(pedido => (
          <TarjetaComandaCocina
            key={pedido.id}
            pedido={pedido}
            trabajadorActivoId={trabajadorActivoId}
            procesarAccionItems={procesarAccionItems}
            procesandoLocal={procesandoLocal}
            personalCocina={personalCocina}
          />
        ))}
      </div>
    </div>
  );
};  

export default MonitorCocinaKDS;