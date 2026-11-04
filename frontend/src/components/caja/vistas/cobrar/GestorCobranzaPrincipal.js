import React, { useState, useCallback, useMemo } from 'react';
import { Wallet, Utensils, ShoppingBag, Bike, Search, X } from 'lucide-react';
import TarjetaPedidoCobrar from './TarjetaPedidoCobrar';

const GestorCobranzaPrincipal = ({
  ordenesEnCaja,
  isSubmitting,
  limpiandoMesas,
  setModalPago,
  actualizarEstadoPedido,
  getIconoPago,
  getTelefonoExtraido,
  renderBotonVerDetalle,
  renderBotonEditar,
  renderBotonAgregarExtra,
  renderBotonAgregarPlatillo,
  usaCocina
}) => {
  // 🆕 Filtros visuales (Local / Llevar+Recoger / Domicilio) + buscador — mismo patrón que Entregas
  const [filtroTipo, setFiltroTipo] = useState('local');
  const [busqueda, setBusqueda] = useState('');

  // 🆕 "Memoria" de pedidos ya procesados en esta pantalla (anular / mandar a cocina / marcar
  // listo), evita que un pedido ya tocado por el cajero reaparezca por una recarga tardía del socket.
  const [idsYaProcesados, setIdsYaProcesados] = useState(() => new Set());

  // 🛡️ FIX: Excluimos pedidos a Domicilio que ya tienen repartidor asignado y van
  // "En Camino". Esos pedidos ya no deben solicitarse aquí en Cobranza; su cobro/entrega
  // se gestiona en la vista de Liquidación de Repartidores.
  const ordenesFiltradas = useMemo(() => (ordenesEnCaja || []).filter(p =>
    !(p.tipo_consumo === 'Domicilio' && (p.repartidor_id || p.estado_preparacion === 'En Camino'))
  ), [ordenesEnCaja]);

  // 🆕 Clasificación robusta por tipo de consumo (mismo criterio que Entregas, vía .includes())
  const clasificarTipo = (pedido) => {
    const tc = String(pedido?.tipo_consumo || '').toLowerCase();
    if (tc.includes('domicilio')) return 'domicilio';
    if (tc.includes('llevar') || tc.includes('recoger')) return 'llevar';
    return 'local';
  };

  const conteoPorTipo = useMemo(() => ({
    local: ordenesFiltradas.filter(p => clasificarTipo(p) === 'local').length,
    llevar: ordenesFiltradas.filter(p => clasificarTipo(p) === 'llevar').length,
    domicilio: ordenesFiltradas.filter(p => clasificarTipo(p) === 'domicilio').length,
  }), [ordenesFiltradas]);

  // 🆕 Buscador por cliente, teléfono o número de pedido
  const coincideBusqueda = useCallback((pedido) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.trim().toLowerCase();
    const numero = String(pedido.numero_pedido || '').toLowerCase();
    const nombre = String(pedido.cliente_nombre || '').toLowerCase();
    const direccion = String(pedido.direccion_entrega || '').toLowerCase();
    const telefono = String(getTelefonoExtraido ? getTelefonoExtraido(pedido) : '').toLowerCase();
    return numero.includes(q) || nombre.includes(q) || direccion.includes(q) || telefono.includes(q);
  }, [busqueda, getTelefonoExtraido]);

  // 🆕 Minutos de espera (campo real: fecha_creacion) para ordenar las más viejas primero
  const minutosEspera = (pedido) => {
    const fechaRaw = pedido?.fecha_creacion || pedido?.created_at || pedido?.fecha_pedido;
    if (!fechaRaw) return 0;
    const diffMs = Date.now() - new Date(fechaRaw).getTime();
    return diffMs > 0 ? diffMs / 60000 : 0;
  };

  const ordenesAMostrar = useMemo(() => {
    const base = ordenesFiltradas.filter(p => clasificarTipo(p) === filtroTipo && coincideBusqueda(p) && !idsYaProcesados.has(p.id));
    return [...base].sort((a, b) => minutosEspera(b) - minutosEspera(a));
  }, [ordenesFiltradas, filtroTipo, coincideBusqueda, idsYaProcesados]);

  // 🆕 Envoltura "a prueba de balas": bloquea el ID de inmediato al procesar un pedido
  // (anular / mandar a cocina / marcar listo), evitando que reaparezca por un refetch tardío.
  const actualizarEstadoPedidoSeguro = useCallback((id, nuevoEstado, extras = {}) => {
    setIdsYaProcesados(prev => {
      const siguiente = new Set(prev);
      siguiente.add(id);
      return siguiente;
    });
    actualizarEstadoPedido(id, nuevoEstado, extras);
  }, [actualizarEstadoPedido]);

  return (
    // 👇 FIX: Separación de contenedores para evitar el scroll fantasma
    <div className="w-full h-full bg-slate-50 text-slate-800 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">

        {/* ENCABEZADO COMPACTO — una sola línea, prioriza filtros y tarjetas */}
        <div className="flex items-center justify-between gap-4 mb-4 shrink-0 animate-in fade-in">
          <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            💳 Cuentas por Cobrar
          </h1>
        </div>

        {/* 🆕 BARRA DE FILTROS GIGANTES + BUSCADOR */}
        <div className="flex flex-col gap-3 mb-5 shrink-0 animate-in fade-in">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <button
              onClick={() => setFiltroTipo('local')}
              className={`relative flex flex-col items-center justify-center gap-1.5 py-5 md:py-6 rounded-3xl border-4 transition-all active:scale-95 ${filtroTipo === 'local' ? 'bg-orange-500 border-orange-600 text-white shadow-xl shadow-orange-500/40 scale-[1.03]' : 'bg-white border-orange-200 text-orange-500 hover:bg-orange-50'}`}
            >
              <Utensils size={30} />
              <span className="font-black text-sm md:text-base uppercase tracking-wide">Local</span>
              <span className={`absolute -top-2 -right-2 min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-full text-xs font-black shadow-md ${filtroTipo === 'local' ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'}`}>
                {conteoPorTipo.local}
              </span>
            </button>

            <button
              onClick={() => setFiltroTipo('llevar')}
              className={`relative flex flex-col items-center justify-center gap-1.5 py-5 md:py-6 rounded-3xl border-4 transition-all active:scale-95 ${filtroTipo === 'llevar' ? 'bg-blue-600 border-blue-700 text-white shadow-xl shadow-blue-600/40 scale-[1.03]' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}`}
            >
              <ShoppingBag size={30} />
              <span className="font-black text-sm md:text-base uppercase tracking-wide">Llevar / Recoger</span>
              <span className={`absolute -top-2 -right-2 min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-full text-xs font-black shadow-md ${filtroTipo === 'llevar' ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'}`}>
                {conteoPorTipo.llevar}
              </span>
            </button>

            <button
              onClick={() => setFiltroTipo('domicilio')}
              className={`relative flex flex-col items-center justify-center gap-1.5 py-5 md:py-6 rounded-3xl border-4 transition-all active:scale-95 ${filtroTipo === 'domicilio' ? 'bg-indigo-600 border-indigo-700 text-white shadow-xl shadow-indigo-600/40 scale-[1.03]' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}
            >
              <Bike size={30} />
              <span className="font-black text-sm md:text-base uppercase tracking-wide">Domicilio</span>
              <span className={`absolute -top-2 -right-2 min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-full text-xs font-black shadow-md ${filtroTipo === 'domicilio' ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'}`}>
                {conteoPorTipo.domicilio}
              </span>
            </button>
          </div>

          <div className="relative w-full">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, teléfono o número de pedido..."
              className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-12 py-4 text-base font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm"
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* GRID DE CUENTAS PENDIENTES O ESTADO VACÍO */}
        {ordenesAMostrar.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
            {ordenesAMostrar.map(pedido => (
              <TarjetaPedidoCobrar
                key={pedido.id}
                pedido={pedido}
                isSubmitting={isSubmitting}
                limpiandoMesas={limpiandoMesas}
                setModalPago={setModalPago}
                actualizarEstadoPedido={actualizarEstadoPedidoSeguro}
                getIconoPago={getIconoPago}
                getTelefonoExtraido={getTelefonoExtraido}
                renderBotonVerDetalle={renderBotonVerDetalle}
                renderBotonEditar={renderBotonEditar}
                renderBotonAgregarExtra={renderBotonAgregarExtra}
                renderBotonAgregarPlatillo={renderBotonAgregarPlatillo}
                usaCocina={usaCocina}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[400px] h-[50vh] bg-white rounded-[40px] border border-slate-200 border-dashed animate-in fade-in duration-300 max-w-2xl mx-auto mt-4">
            <Wallet size={64} className="text-blue-300 mb-4 animate-pulse" />
            <p className="text-2xl font-black text-slate-400">
              {ordenesFiltradas.length > 0 ? 'Nada por aquí' : 'Caja al día'}
            </p>
            <p className="text-xs font-bold text-slate-400/80 mt-1 uppercase tracking-widest text-center max-w-sm">
              {ordenesFiltradas.length > 0
                ? 'No hay cuentas de este tipo con ese criterio. Prueba otro filtro o limpia la búsqueda.'
                : 'No hay cuentas pendientes por cobrar en este momento.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestorCobranzaPrincipal;