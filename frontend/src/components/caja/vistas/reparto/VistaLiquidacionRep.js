import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, DollarSign, Wallet, RefreshCw, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

const VistaLiquidacionRep = () => {
  const [repartidores, setRepartidores] = useState([]);
  const [repartidorSeleccionado, setRepartidorSeleccionado] = useState(null);
  const [auditoriaPedidos, setAuditoriaPedidos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [procesandoLiquidacion, setProcesandoLiquidacion] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  // 1. Cargar repartidores con efectivo pendiente en calle
  const cargarRepartidoresConEfectivo = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`${apiUrl}/reparto/auditoria/repartidores`);
      if (res.ok) {
        const data = await res.json();
        setRepartidores(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error cargando pool de repartidores:", error);
    } finally {
      setCargando(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    cargarRepartidoresConEfectivo();
  }, [cargarRepartidoresConEfectivo]);

  // 2. Cargar el desglose de pedidos del repartidor seleccionado
  const seleccionarRepartidor = async (repartidor) => {
    setRepartidorSeleccionado(repartidor);
    try {
      const res = await fetch(`${apiUrl}/reparto/auditoria/pedidos/${repartidor.id}`);
      if (res.ok) {
        const data = await res.json();
        setAuditoriaPedidos(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error al obtener desglose de órdenes:", error);
    }
  };

  // 3. Calcular totales acumulados para la conciliación
  const calcularTotales = () => {
    return auditoriaPedidos.reduce((acc, pedido) => {
      if (pedido.metodo_pago === 'Efectivo') {
        acc.efectivo += Number(pedido.total);
      }
      acc.totalPedidos += 1;
      return acc;
    }, { efectivo: 0, totalPedidos: 0 });
  };

  const totales = calcularTotales();

  // 4. Confirmar recepción física e inyectar al flujo de caja
  const ejecutarLiquidacionCompleta = async () => {
    if (!repartidorSeleccionado || auditoriaPedidos.length === 0) return;

    const confirmacion = window.confirm(
      `¿Confirmas la recepción física de $${totales.efectivo} MXN por parte de ${repartidorSeleccionado.nombre}? El dinero se asentará en el turno de caja actual.`
    );

    if (!confirmacion) return;

    setProcesandoLiquidacion(true);
    try {
      const res = await fetch(`${apiUrl}/reparto/auditoria/liquidar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repartidor_id: repartidorSeleccionado.id,
          pedido_ids: auditoriaPedidos.map(p => p.id),
          monto_liquidado: totales.efectivo
        })
      });

      if (res.ok) {
        setRepartidorSeleccionado(null);
        setAuditoriaPedidos([]);
        await cargarRepartidoresConEfectivo();
      } else {
        alert("Error al procesar la conciliación en la base de datos.");
      }
    } catch (e) {
      alert("Error de conexión al asentar el flujo financiero.");
    } finally {
      setProcesandoLiquidacion(false);
    }
  };

  return (
    <div className="w-full h-full bg-slate-50 text-slate-800 p-6 overflow-y-auto">
      
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
        <div>
          <span className="text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-full uppercase tracking-widest">
            Módulo de Logística
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">Liquidación de Repartidores</h1>
          <p className="text-slate-500 text-xs mt-0.5">Audita y recolecta el efectivo de repartidores antes del corte financiero.</p>
        </div>
        <button 
          onClick={cargarRepartidoresConEfectivo}
          disabled={cargando}
          className="self-start sm:self-auto flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={cargando ? "animate-spin" : ""} /> Refrescar
        </button>
      </div>

      {/* CONTENEDOR BIFURCADO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LISTA IZQUIERDA DE CONDUCTORES EN CALLE */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Repartidores Activos</h2>
          
          {cargando && repartidores.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 font-bold text-xs uppercase tracking-wider animate-pulse shadow-sm">
              Sincronizando cuentas de calle...
            </div>
          ) : repartidores.length === 0 ? (
            <div className="bg-slate-100/60 border border-slate-200 border-dashed rounded-2xl p-6 text-center text-slate-400 font-medium text-xs py-10">
              <ShieldCheck size={28} className="mx-auto mb-2 text-emerald-500 opacity-60" />
              Todo en orden. No hay efectivo rezagado en ruta.
            </div>
          ) : (
            repartidores.map(rep => (
              <button
                key={rep.id}
                onClick={() => seleccionarRepartidor(rep)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${repartidorSeleccionado?.id === rep.id ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-lg ${repartidorSeleccionado?.id === rep.id ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                    🛵
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 leading-tight">{rep.nombre}</p>
                    <p className="text-[10px] font-bold mt-0.5 text-slate-400 uppercase tracking-wider">
                      {rep.pedidos_pendientes} {rep.pedidos_pendientes === 1 ? 'viaje pendiente' : 'viajes pendientes'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-emerald-600">${rep.efectivo_acumulado}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">En Mano</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* DETALLE Y CONCILIACIÓN DE LA CUENTA */}
        <div className="lg:col-span-8">
          {repartidorSeleccionado ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              
              {/* Tarjeta de Control Superior */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50 p-5 rounded-2xl border border-slate-100 gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white p-2.5 rounded-xl">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Auditoría de Ruta</p>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">{repartidorSeleccionado.nombre}</h3>
                  </div>
                </div>
                <div className="flex gap-6 sm:border-l sm:border-slate-200 sm:pl-6">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Wallet size={10}/> Efectivo a Recolectar</p>
                    <p className="text-2xl font-black text-emerald-600">${totales.efectivo}</p>
                  </div>
                </div>
              </div>

              {/* Desglose de Pedidos Entregados */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Órdenes a Liquidar</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {auditoriaPedidos.map(pedido => (
                    <div key={pedido.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs font-bold shadow-sm">
                      <div>
                        <p className="text-slate-900 font-black">Pedido #{pedido.numero_pedido}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Entrega: {pedido.tiempo_entregado ? new Date(pedido.tiempo_entregado).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-900 font-black text-sm">${pedido.total}</span>
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-wider">{pedido.metodo_pago}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aviso de Validación */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-amber-800 leading-normal">
                  <span className="font-black uppercase">Validación Física:</span> Recibe el dinero físico antes de presionar el botón de confirmación. Al asentarlo, los pedidos pasarán al estado <span className="font-black">"Liquidado"</span> y el total se sumará de forma irreversible a los fondos de la caja en el turno vigente.
                </p>
              </div>

              {/* Botón de Cierre Financiero */}
              <button
                disabled={procesandoLiquidacion || auditoriaPedidos.length === 0}
                onClick={ejecutarLiquidacionCompleta}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 text-white disabled:text-slate-400 font-black text-sm rounded-xl shadow-md shadow-emerald-600/10 transition flex items-center justify-center gap-2 uppercase tracking-wider active:scale-95 disabled:cursor-not-allowed"
              >
                {procesandoLiquidacion ? (
                  <>Procesando Arqueo de Caja...</>
                ) : (
                  <>
                    <CheckCircle2 size={16}/> Confirmar Entrega de Dinero
                  </>
                )}
              </button>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 border-dashed rounded-3xl py-24 text-center text-slate-400 font-bold text-xs shadow-sm">
              <DollarSign size={40} className="mx-auto mb-2 opacity-20 text-slate-400" />
              Selecciona un repartidor activo de la lista lateral <br />
              <span className="font-medium text-[11px] text-slate-400">Para iniciar la auditoría de folios y recolectar los importes de venta.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default VistaLiquidacionRep;