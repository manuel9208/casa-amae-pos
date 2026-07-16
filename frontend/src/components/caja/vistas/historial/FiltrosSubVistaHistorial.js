import React from 'react';

const FiltrosSubVistaHistorial = ({
  pedidos,
  subVistaHistorial,
  setSubVistaHistorial,
  isSubmitting,
  limpiandoMesas
}) => {
  // Lista de etiquetas originales de las sub-pestañas (Incluye 'Pendiente')
  const pestañas = ['Pendiente', 'Pagado', 'Preparando', 'Listo', 'Entregado', 'Cancelado', 'Sincronizado Offline'];

  // Helper para calcular el contador exacto de cada pestaña respetando la regla original
  const obtenerContadorPestaña = (tab) => {
    return pedidos.filter(p => {
      if (tab === 'Entregado') {
        // FIX: Agregamos 'Liquidado' para que las órdenes de choferes no desaparezcan del conteo
        return p.estado_preparacion === 'Entregado' ||
               p.estado_preparacion === 'En Camino' ||
               p.estado_preparacion === 'Finalizado' ||
               p.estado_preparacion === 'Liquidado';
      }
      return p.estado_preparacion === tab;
    }).length;
  };

  // Helper para normalizar el nombre del botón al lenguaje de cara al usuario
  const obtenerNombreLegible = (tab) => {
    if (tab === 'Pagado') return 'En Cola';
    if (tab === 'Preparando') return 'En Cocina';
    if (tab === 'Listo') return 'Finalizados';
    if (tab === 'Entregado') return 'Entregados';
    return tab;
  };

  return (
    // 👇 FIX: Contenedor EXTERIOR que actúa como ventana de Scroll
    <div className="w-full mb-8 overflow-x-auto no-scrollbar scroll-smooth shrink-0">
      {/* 👇 FIX: Contenedor INTERIOR con "w-max" que envuelve y estira el fondo gris correctamente */}
      <div className="flex gap-2 bg-slate-200/70 p-1.5 rounded-2xl w-max shadow-inner">
        {pestañas.map(tab => {
          const esActivo = subVistaHistorial === tab;
          const totalPedidos = obtenerContadorPestaña(tab);

          return (
            <button
              key={tab}
              type="button"
              disabled={isSubmitting || limpiandoMesas}
              onClick={() => setSubVistaHistorial(tab)}
              // 👇 FIX: Agregado "shrink-0" para evitar que el texto se aplaste en móviles
              className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center whitespace-nowrap select-none active:scale-95 disabled:opacity-50 disabled:scale-100 shrink-0 ${
                esActivo
                  ? 'bg-white text-blue-600 shadow-md scale-105 z-10'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              {obtenerNombreLegible(tab)}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight border shadow-inner transition-colors ${
                esActivo
                  ? 'bg-blue-100 text-blue-600 border-blue-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {totalPedidos}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FiltrosSubVistaHistorial;