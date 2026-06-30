import React, { useState, useMemo } from 'react';
import { ClipboardList } from 'lucide-react';

// Importamos nuestros componentes modulares individuales
import FiltrosSubVistaHistorial from './FiltrosSubVistaHistorial';
import RenglonPedidoHistorial from './RenglonPedidoHistorial';

const HistorialTodosLosPedidos = ({
  pedidos,
  lanzarImpresion,
  setModalPuntoVenta,
  setOrdenEditandoRapida,
  configGlobal,
  isSubmitting,
  limpiandoMesas
}) => {
  // Estado local para controlar qué pestaña operativa se está visualizando
  const [subVistaHistorial, setSubVistaHistorial] = useState('Pagado');

  // 👇 FILTRADO MAESTRO OPTIMIZADO CON MEMOIZACIÓN (Evita re-renders pesados)
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      // Regla de Negocio Original: La pestaña 'Entregado' unifica el flujo final de reparto y mostrador
      if (subVistaHistorial === 'Entregado') {
        return p.estado_preparacion === 'Entregado' || 
               p.estado_preparacion === 'En Camino' || 
               p.estado_preparacion === 'Finalizado';
      }
      // Para cualquier otro estado, la coincidencia debe ser exacta
      return p.estado_preparacion === subVistaHistorial;
    }).sort((a, b) => b.numero_pedido - a.numero_pedido); // Ordenar siempre de más nuevo a más viejo
  }, [pedidos, subVistaHistorial]);

  return (
    <div className="w-full h-full bg-slate-50 text-slate-800 p-4 md:p-6 flex flex-col overflow-hidden">
      
      {/* 1. BARRA DE FILTROS Y CONTADORES */}
      <FiltrosSubVistaHistorial 
        pedidos={pedidos}
        subVistaHistorial={subVistaHistorial}
        setSubVistaHistorial={setSubVistaHistorial}
        isSubmitting={isSubmitting}
        limpiandoMesas={limpiandoMesas}
      />

      {/* 2. ÁREA DE DESPLIEGUE DE COMANDAS */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4 pb-24">
        {pedidosFiltrados.length === 0 ? (
          /* CAPA VISUAL EN CASO DE TABLA VACÍA (EMPTY STATE) */
          <div className="bg-white border-2 border-slate-200 border-dashed p-12 rounded-[40px] text-center max-w-xl mx-auto mt-10 animate-in zoom-in-95">
            <ClipboardList size={48} className="text-slate-300 mx-auto mb-4 opacity-70 animate-pulse" />
            <p className="text-xl font-bold text-slate-400">No hay pedidos en esta categoría</p>
            <p className="text-xs font-bold text-slate-400/70 mt-1 uppercase tracking-widest">
              Flujo operativo sin registros por el momento
            </p>
          </div>
        ) : (
          /* RENDERIZADO EN CADENA DE LOS RENGLONES ACTIVOS */
          pedidosFiltrados.map(pedido => (
            <RenglonPedidoHistorial 
              key={pedido.id}
              pedido={pedido}
              lanzarImpresion={lanzarImpresion}
              setModalPuntoVenta={setModalPuntoVenta}
              setOrdenEditandoRapida={setOrdenEditandoRapida}
              configGlobal={configGlobal}
            />
          ))
        )}
      </div>

    </div>
  );
};

export default HistorialTodosLosPedidos;