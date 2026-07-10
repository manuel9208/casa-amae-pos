import React, { useState, useEffect, useRef } from 'react';
import { BellRing, MessageSquare, XCircle, DollarSign, Clock, CreditCard, Smartphone, Wallet, PlusCircle, Eye } from 'lucide-react';

import VistaMesas from './vistas/mesas/GestorMesasPrincipal';
import VistaConfirmar from './vistas/confirmar/GestorConfirmacionPrincipal';
import VistaCobrar from './vistas/cobrar/GestorCobranzaPrincipal';
import VistaMesasPagadas from './vistas/mesas_pagadas/GestorMesasPagadasPrincipal';
import VistaEntregas from './vistas/entregas/GestorEntregasPrincipal';
import VistaHistorial from './vistas/historial/HistorialTodosLosPedidos';
import VistaCorte from './vistas/corte/CorteCajaFinanciero';
import VistaLiquidacionRep from './vistas/reparto/LiquidacionRepartidoresPrincipal';
import VistaCocinaMini from './vistas/cocina_mini/MonitorCocinaKDS';

const VistasCaja = (props) => {
  const {
    vistaActiva, setVistaActiva, pedidosEnReparto, pedidos, user, isSubmitting, empleadosPOS,
    fondosRepartidores, actualizarFondoRepartidor, fondoRepartidorGlobal, liquidarPedidoRepartidor,
    pedidosPorConfirmar, pedidosAuditados, apiUrl
  } = props;

  const [limpiandoMesas, setLimpiandoMesas] = useState(false);
  const [mostrarAlertaKiosco, setMostrarAlertaKiosco] = useState(false);
  const [ultimoPedidoKiosco, setUltimoPedidoKiosco] = useState(null);
  const prevPendientesCount = useRef(pedidosPorConfirmar?.length || 0);

  useEffect(() => {
    const currentCount = pedidosPorConfirmar?.length || 0;
    if (currentCount > prevPendientesCount.current && vistaActiva !== 'confirmar') {
      const nuevoPedido = pedidosPorConfirmar[0];
      if (nuevoPedido) {
        setUltimoPedidoKiosco(nuevoPedido.numero_pedido);
      }
      setMostrarAlertaKiosco(true);
      try {
        const audio = new Audio('/campana.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    }
    prevPendientesCount.current = currentCount;
  }, [pedidosPorConfirmar, vistaActiva]);

  const getIconoPago = (metodo) => {
    if(metodo === 'Tarjeta') return <CreditCard size={16} />;
    if(metodo === 'Transferencia') return <Smartphone size={16} />;
    if(metodo === 'Mixto') return <Wallet size={16} />;
    if(metodo === 'Pendiente' || metodo === 'Por Cobrar') return <Clock size={16} />;
    return <DollarSign size={16} />;
  };

  const getTelefonoExtraido = (p) => {
    let tel = p.cliente_telefono || p.cliente?.telefono || p.telefono;
    if (!tel && typeof p.direccion_entrega === 'string') {
      if (p.direccion_entrega.includes('TEL:')) {
        tel = p.direccion_entrega.split('TEL:')[1].split('|')[0].trim();
      } else if (p.direccion_entrega.includes('CONTACTO:')) {
        tel = p.direccion_entrega.split('CONTACTO:')[1].split('|')[0].trim();
      }
    }
    if (tel) {
      const t = String(tel).trim();
      if (t !== '' && t !== 'null' && t !== 'undefined') return t;
    }
    return null;
  };

  const renderItemsConfirmacion = (carritoRaw) => {
    if (!carritoRaw) return null;
    const items = typeof carritoRaw === 'string' ? JSON.parse(carritoRaw) : carritoRaw;
    return items.map((item, idx) => (
      <div key={idx} className="mb-2 text-left bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
        <p className="text-sm font-black text-slate-800">{item.cantidad || 1}x {item.nombre}</p>
        {item.extras && item.extras.length > 0 && (
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 ml-2 border-l-2 border-slate-200 pl-2">
            {item.extras.map(e => e.nombre).join(' • ')}
          </p>
        )}
      </div>
    ));
  };

  const renderBotonAgregarExtra = (pedido) => {
    if (!pedido.carrito) return null;
    const items = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : pedido.carrito;
    return items.map((item, idx) => (
      <button key={`add-extra-${idx}`} onClick={() => props.setModalAgregarExtra({ pedidoOriginal: pedido, itemIndex: idx, itemSeleccionado: item })} className="w-full text-left p-3 hover:bg-slate-100 rounded-xl transition group flex items-center justify-between border border-transparent hover:border-slate-200 mb-1">
        <span className="font-bold text-slate-700 text-sm group-hover:text-emerald-700 transition">{item.cantidad || 1}x {item.nombre}</span>
        <PlusCircle size={18} className="text-slate-300 group-hover:text-emerald-500 transition" />
      </button>
    ));
  };

  const renderBotonEditar = (pedido) => (
    <button disabled={isSubmitting} onClick={() => props.setModalEditarPedido(pedido)} className="w-full text-left px-4 py-3 hover:bg-slate-100 transition font-bold text-slate-700 text-sm border-b border-slate-100 disabled:opacity-50">
      Modificar Orden
    </button>
  );

  const renderBotonVerDetalle = (pedido) => (
    <button disabled={isSubmitting} onClick={() => props.setModalVerDetalle(pedido)} className="p-2 md:p-2.5 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded-xl transition shadow-sm disabled:opacity-50" title="Ver Detalles">
      <Eye size={18} />
    </button>
  );

  const liberarMesaMagicamente = async (numero_mesa, pedido_id) => {
    if (!numero_mesa || isSubmitting) return;
    setLimpiandoMesas(true);
    try {
      if (pedido_id) {
        await props.actualizarEstadoPedido(pedido_id, 'Finalizado');
      } else {
        const mesaBD = props.mesas?.find(m => String(m.numero_mesa) === String(numero_mesa));
        if (mesaBD && props.forzarLiberacionMesas) {
          await props.forzarLiberacionMesas([mesaBD]);
        }
      }
    } catch(e) {
      console.error("Error al procesar la liberación de mesa:", e);
    }
    setLimpiandoMesas(false);
  };

  const totalGastos = (props.gastosDia || []).reduce((sum, gasto) => sum + Number(gasto.costo_total), 0);
  
  const pedidosValidos = pedidos.filter(p => 
      p.estado_preparacion !== 'Pendiente' && 
      p.estado_preparacion !== 'Cancelado' && 
      !(pedidosAuditados && pedidosAuditados.has(p.id)) &&
      (Number(p.cajero_id) === Number(user?.id) || (!p.cajero_id && (user?.rol === 'admin' || user?.rol === 'gerente')))
  );

  let totalPlatillos = 0; let totalExtras = 0; let totalEnvio = 0;
  let dPlatillos = 0; let dExtras = 0; let dEnvio = 0; let dEfectivo = 0; let dTarjeta = 0; let dTransf = 0;
  let tDescuentos = 0;

  pedidosValidos.forEach(p => {
    const isDomicilio = p.tipo_consumo === 'Domicilio';
    totalEnvio += Number(p.costo_envio || 0);
    if (isDomicilio) dEnvio += Number(p.costo_envio || 0);

    const items = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : (p.carrito || []);
    let order_gross = Number(p.costo_envio || 0);

    items.forEach(item => {
      const qty = Number(item.cantidad || 1);
      let extrasMonetariosReales = 0;
      if (item.extras && Array.isArray(item.extras)) {
        item.extras.forEach(ext => {
          if (ext.tipo === 'extra' || ext.es_extra === true || String(ext.nombre).toLowerCase().includes('extra')) {
            extrasMonetariosReales += Number(ext.precioExtra || ext.precio_extra || ext.precio || 0);
          }
        });
      }
      const calcExtra = (extrasMonetariosReales * qty);
      totalExtras += calcExtra;
      if (isDomicilio) dExtras += calcExtra;

      const precioTotalItem = Number(item.precioFinal || item.precio_base || item.precio || 0);
      const precioBasePlatillo = precioTotalItem - extrasMonetariosReales;
      const calcPlat = (precioBasePlatillo * qty);

      totalPlatillos += calcPlat;
      if (isDomicilio) dPlatillos += calcPlat;

      order_gross += precioTotalItem * qty;
    });

    if (p.metodo_pago !== 'Comida Personal') {
        const discount = order_gross - Number(p.total || 0);
        if (discount > 0) tDescuentos += discount;
    }

    if (isDomicilio) {
      if(p.metodo_pago === 'Efectivo') dEfectivo += Number(p.total);
      if(p.metodo_pago === 'Tarjeta') dTarjeta += Number(p.total);
      if(p.metodo_pago === 'Transferencia') dTransf += Number(p.total);
      if(p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
        try {
          const pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos;
          pm.forEach(x => {
            if(x.metodo === 'Efectivo') dEfectivo += Number(x.monto);
            if(x.metodo === 'Tarjeta') dTarjeta += Number(x.monto);
            if(x.metodo === 'Transferencia') dTransf += Number(x.monto);
          });
        } catch(e) {}
      }
    }
  });

  const totalEfectivoVentas = pedidosValidos.reduce((sum, p) => {
    if (p.metodo_pago === 'Efectivo') return sum + Number(p.total);
    if (p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
      const pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos;
      const ef = pm.find(x => x.metodo === 'Efectivo');
      if (ef) return sum + Number(ef.monto);
    }
    return sum;
  }, 0);

  const totalTarjetaVentas = pedidosValidos.reduce((sum, p) => {
    if (p.metodo_pago === 'Tarjeta') return sum + Number(p.total);
    if (p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
      const pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos;
      const tar = pm.find(x => x.metodo === 'Tarjeta');
      if (tar) return sum + Number(tar.monto);
    }
    return sum;
  }, 0);

  const totalTransferenciaVentas = pedidosValidos.reduce((sum, p) => {
    if (p.metodo_pago === 'Transferencia') return sum + Number(p.total);
    if (p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
      const pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos;
      const trans = pm.find(x => x.metodo === 'Transferencia');
      if (trans) return sum + Number(trans.monto);
    }
    return sum;
  }, 0);

  const ordenesEnCaja = props.pendientesDePago || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
      {mostrarAlertaKiosco && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl max-w-xl w-full text-center border-4 border-emerald-500 animate-in zoom-in-95">
            <div className="mx-auto bg-emerald-100 text-emerald-600 w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
              <BellRing size={64} className="animate-bounce" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-emerald-600 tracking-tight mb-4 uppercase">¡Nuevo Pedido!</h2>
            <p className="text-slate-600 font-bold text-xl md:text-2xl mb-8">
              Pedido <strong className="text-slate-900">#{ultimoPedidoKiosco || ''}</strong> esperando autorización.
            </p>
            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={() => setMostrarAlertaKiosco(false)}
                className="flex-1 py-5 bg-slate-100 text-slate-600 font-black text-lg rounded-2xl hover:bg-slate-200 transition active:scale-95 border border-slate-200"
              >
                Seguir Trabajando
              </button>
              <button
                onClick={() => {
                  setMostrarAlertaKiosco(false);
                  if(setVistaActiva) setVistaActiva('confirmar');
                }}
                className="flex-[2] py-5 bg-emerald-500 text-white font-black text-xl rounded-2xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition active:scale-95"
              >
                Ir a Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {props.pedidosConAlerta?.length > 0 && (
        <div className="w-full p-4 space-y-2 z-10 shrink-0">
          {props.pedidosConAlerta.map(p => {
            const mensajeVisible = p.alerta_cocina.replace(/\[IDX:\d+\]\s*/g, '');
            return (
              <div key={`alerta-${p.id}`} className="bg-red-500 text-white p-4 rounded-2xl shadow-lg flex justify-between items-center animate-in slide-in-from-top">
                <div className="flex items-center gap-4">
                  <BellRing size={28} className="animate-bounce" />
                  <div>
                    <p className="font-black text-lg">⚠️ ALERTA EN ORDEN #{p.numero_pedido} ({p.cliente_nombre || p.cliente?.nombre || 'Invitado'})</p>
                    <p className="font-medium text-red-100">{mensajeVisible}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button disabled={isSubmitting} onClick={() => props.abrirModalResolver(p)} className="bg-white text-red-600 hover:bg-red-50 px-6 py-2 rounded-xl font-black shadow-sm transition flex items-center gap-2 disabled:opacity-50">
                    <MessageSquare size={18} /> Resolver con Cliente
                  </button>
                  <button disabled={isSubmitting} onClick={() => props.limpiarAlerta(p.id)} className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-xl font-bold shadow-sm transition disabled:opacity-50" title="Ocultar sin responder">
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex-1 p-4 md:p-10">
        {vistaActiva === 'mesas' && (
          <VistaMesas 
            mesas={props.mesas} 
            pedidos={pedidos} 
            isSubmitting={isSubmitting} 
            limpiandoMesas={limpiandoMesas} 
            setLimpiandoMesas={setLimpiandoMesas} 
            setModalPago={props.setModalPago} 
            liberarMesaMagicamente={liberarMesaMagicamente} 
            forzarLiberacionMesas={props.forzarLiberacionMesas} 
          />
        )}
        
        {vistaActiva === 'confirmar' && (
          <VistaConfirmar 
            user={user} 
            pedidosPorConfirmar={pedidosPorConfirmar} 
            isSubmitting={isSubmitting} 
            actualizarEstadoPedido={props.actualizarEstadoPedido} 
            setModalZonaEnvio={props.setModalZonaEnvio} 
            confirmarPedidoRecoger={props.confirmarPedidoRecoger} 
            getTelefonoExtraido={getTelefonoExtraido} 
            renderBotonVerDetalle={renderBotonVerDetalle} 
            renderBotonEditar={renderBotonEditar} 
            renderItemsConfirmacion={renderItemsConfirmacion} 
          />
        )}
        
        {vistaActiva === 'cobrar' && (
          <VistaCobrar 
            user={user} 
            ordenesEnCaja={ordenesEnCaja} 
            isSubmitting={isSubmitting} 
            limpiandoMesas={limpiandoMesas} 
            setModalPago={props.setModalPago} 
            setMontoRecibido={props.setMontoRecibido} 
            actualizarEstadoPedido={props.actualizarEstadoPedido} 
            getIconoPago={getIconoPago} 
            getTelefonoExtraido={getTelefonoExtraido} 
            renderBotonVerDetalle={renderBotonVerDetalle} 
            renderBotonEditar={renderBotonEditar} 
            renderBotonAgregarExtra={renderBotonAgregarExtra} 
          />
        )}
        
        {vistaActiva === 'mesas_pagadas' && (
          <VistaMesasPagadas 
            mesasPagadas={props.mesasPagadas} 
            isSubmitting={isSubmitting} 
            limpiandoMesas={limpiandoMesas} 
            setLimpiandoMesas={setLimpiandoMesas} 
            getTelefonoExtraido={getTelefonoExtraido} 
            renderBotonVerDetalle={renderBotonVerDetalle} 
            renderBotonEditar={renderBotonEditar} 
            renderBotonAgregarExtra={renderBotonAgregarExtra} 
            liberarMesaMagicamente={liberarMesaMagicamente} 
            apiUrl={apiUrl} 
            setModalPago={props.setModalPago} 
            setMontoRecibido={props.setMontoRecibido} 
          />
        )}
        
        {vistaActiva === 'entregas' && (
          <VistaEntregas 
            listosParaEntregar={props.listosParaEntregar} 
            isSubmitting={isSubmitting} 
            limpiandoMesas={limpiandoMesas} 
            actualizarEstadoPedido={props.actualizarEstadoPedido} 
            setModalPago={props.setModalPago} 
            setMontoRecibido={props.setMontoRecibido} 
            getTelefonoExtraido={getTelefonoExtraido} 
            renderBotonVerDetalle={renderBotonVerDetalle} 
            renderBotonAgregarExtra={renderBotonAgregarExtra} 
            empleadosPOS={empleadosPOS} 
          />
        )}
        
        {vistaActiva === 'historial' && (
          <VistaHistorial 
            pedidos={pedidos} 
            lanzarImpresion={props.lanzarImpresion} 
            setModalPuntoVenta={props.setModalPuntoVenta} 
            setModalEditarPedido={props.setModalEditarPedido} 
            actualizarEstadoPedido={props.actualizarEstadoPedido} 
            configGlobal={props.configGlobal} 
            isSubmitting={isSubmitting} 
            limpiandoMesas={limpiandoMesas} 
            setModalVerDetalle={props.setModalVerDetalle} 
          />
        )}
        
        {vistaActiva === 'corte' && (
          <VistaCorte 
            user={user}
            apiUrl={apiUrl}
            onLogout={props.onLogout}
            fondoCaja={props.fondoCaja}
            totalGastos={totalGastos}
            mathData={{
              totalPlatillos, 
              totalExtras, 
              totalEnvio, 
              dPlatillos, 
              dExtras, 
              dEnvio, 
              lEfectivo: totalEfectivoVentas - dEfectivo, 
              lTarjeta: totalTarjetaVentas - dTarjeta, 
              lTransf: totalTransferenciaVentas - dTransf, 
              dEfectivo, 
              dTarjeta, 
              dTransf,
              tDescuentos 
            }}
            fondoRepartidor={fondoRepartidorGlobal}
          />
        )}
        
        {vistaActiva === 'liquidacion_reparto' && (
          <VistaLiquidacionRep 
            pedidosEnReparto={pedidosEnReparto} 
            empleadosPOS={empleadosPOS} 
            fondosRepartidores={fondosRepartidores} 
            actualizarFondoRepartidor={actualizarFondoRepartidor} 
            fondoRepartidorGlobal={fondoRepartidorGlobal} 
            liquidarPedidoRepartidor={liquidarPedidoRepartidor} 
            actualizarEstadoPedido={props.actualizarEstadoPedido} 
          />
        )}
        
        {vistaActiva === 'cocina_mini' && (
          <VistaCocinaMini 
            user={user} 
            pedidos={pedidos} 
            empleadosPOS={empleadosPOS} 
            apiUrl={apiUrl} 
            isSubmitting={isSubmitting} 
          />
        )}
      </div>
    </div>
  );
};

export default VistasCaja;