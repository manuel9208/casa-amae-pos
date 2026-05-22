import React, { useState } from 'react';
import { BellRing, MessageSquare, XCircle, DollarSign, Clock, CreditCard, Smartphone, Wallet, Menu } from 'lucide-react';

import VistaMesas from './vistas/mesas/VistaMesas';
import VistaConfirmar from './vistas/confirmar/VistaConfirmar'; 
import VistaCobrar from './vistas/cobrar/VistaCobrar';         
import VistaMesasPagadas from './vistas/mesas_pagadas/VistaMesasPagadas';
import VistaEntregas from './vistas/entregas/VistaEntregas'; 
import VistaHistorial from './vistas/historial/VistaHistorial'; // 👇 NUEVO IMPORT
import VistaCorte from './vistas/corte/VistaCorte';             // 👇 NUEVO IMPORT
import { PlusCircle, Eye } from 'lucide-react';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const VistasCaja = ({
  vistaActiva, subVistaHistorial, setSubVistaHistorial, pedidos, mesas, pedidosConAlerta, pedidosPorConfirmar,
  pendientesDePago, listosParaEntregar, mesasPagadas, fondoCaja, configGlobal,
  gastosDia, 
  abrirModalResolver, limpiarAlerta, setModalPago, setMontoRecibido, actualizarEstadoPedido, confirmarPedidoRecoger, lanzarImpresion,
  setModalZonaEnvio,
  setModalAgregarExtra,
  setModalEditarPedido, 
  isSubmitting,
  setModalVerDetalle,
  setMenuAbiertoCaja 
}) => {

  const [limpiandoMesas, setLimpiandoMesas] = useState(false);

  const getIconoPago = (metodo) => { 
    if(metodo==='Tarjeta') return <CreditCard size={16}/>; 
    if(metodo==='Transferencia') return <Smartphone size={16}/>; 
    if(metodo==='Mixto') return <Wallet size={16}/>; 
    if(metodo==='Pendiente' || metodo==='Por Cobrar') return <Clock size={16}/>;
    return <DollarSign size={16}/>; 
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
      if (items.length === 0) return null;
      const item = items[0];

      return (
         <button 
            disabled={isSubmitting || limpiandoMesas}
            onClick={() => setModalAgregarExtra({ pedidoOriginal: pedido, itemIndex: 0, itemSeleccionado: item })}
            className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 border border-emerald-200 disabled:opacity-50"
         >
            <PlusCircle size={15} /> Cobrar Extra
         </button>
      );
  };

  const renderBotonVerDetalle = (pedido) => (
    <button 
        disabled={isSubmitting || limpiandoMesas}
        onClick={() => setModalVerDetalle(pedido)}
        className="w-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 border border-slate-200 shadow-sm disabled:opacity-50"
    >
        <Eye size={15} /> Ver Platillos
    </button>
  );

  const renderBotonEditar = (pedido) => (
    <button 
        disabled={isSubmitting || limpiandoMesas}
        onClick={() => setModalEditarPedido(pedido)}
        className="w-full bg-blue-50 text-blue-700 hover:bg-blue-500 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 border border-blue-200 shadow-sm disabled:opacity-50"
    >
        ✏️ Editar Info
    </button>
  );

  const liberarMesaMagicamente = async (numero_mesa) => {
      try {
          const paqueteFantasma = { 
            cliente_id: null, tipo_consumo: 'Local', metodo_pago: 'Efectivo', 
            total: 0, carrito: [], origen: 'Caja', 
            direccion_entrega: 'Limpieza de Mesa', descuento_puntos: 0, 
            estado_preparacion: 'Pendiente', mesa: numero_mesa 
          };
          
          const res = await fetch(`${apiUrl}/pedidos`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify(paqueteFantasma) 
          });
          
          if (res.ok) {
              const data = await res.json();
              await fetch(`${apiUrl}/pedidos/${data.id}/estado`, { 
                  method: 'PUT', 
                  headers: { 'Content-Type': 'application/json' }, 
                  body: JSON.stringify({ estado_preparacion: 'Cancelado' }) 
              });
          }
      } catch (e) {
          console.error("Error liberando mesa", e);
      }
  };

  const totalGastos = (gastosDia || []).reduce((sum, gasto) => sum + Number(gasto.costo_total), 0);

  const pedidosValidos = pedidos.filter(p => p.estado_preparacion !== 'Pendiente' && p.estado_preparacion !== 'Cancelado');
  let totalPlatillos = 0;
  let totalExtras = 0;
  let totalEnvio = 0;

  pedidosValidos.forEach(p => {
    totalEnvio += Number(p.costo_envio || 0);

    const items = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : (p.carrito || []);
    items.forEach(item => {
        const qty = Number(item.cantidad || 1);
        let extrasDelItem = 0;
        
        if (item.extras && Array.isArray(item.extras)) {
            item.extras.forEach(ext => {
                extrasDelItem += Number(ext.precioExtra || ext.precio_extra || ext.precio || 0);
            });
        }
        totalExtras += (extrasDelItem * qty);
        
        const precioTotalItem = Number(item.precioFinal || item.precio_base || item.precio || 0);
        const precioBase = precioTotalItem - extrasDelItem;
        totalPlatillos += (precioBase * qty);
    });
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

  const ordenesEnCaja = pendientesDePago || [];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
      
      {/* ENCABEZADO RESPONSIVO MÓVIL */}
      <div className="lg:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-30 shrink-0">
         <h1 className="text-xl font-black flex items-center gap-2 text-emerald-400">
            <DollarSign size={24} /> CAJA
         </h1>
         <button onClick={() => setMenuAbiertoCaja(true)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
            <Menu size={24} />
         </button>
      </div>

      {/* ALERTAS DE COCINA */}
      {pedidosConAlerta.length > 0 && (
        <div className="w-full p-4 space-y-2 z-10 shrink-0">
          {pedidosConAlerta.map(p => {
            const mensajeVisible = p.alerta_cocina.replace(/\[IDX:\d+\]\s*/g, '');
            return (
            <div key={`alerta-${p.id}`} className="bg-red-500 text-white p-4 rounded-2xl shadow-lg flex justify-between items-center animate-in slide-in-from-top">
              <div className="flex items-center gap-4">
                 <BellRing className="animate-bounce" size={28} />
                 <div>
                    <p className="font-black text-lg">⚠️ ALERTA EN ORDEN #{p.numero_pedido} ({p.cliente_nombre || p.cliente?.nombre || 'Invitado'})</p>
                    <p className="font-medium text-red-100">{mensajeVisible}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                <button 
                   disabled={isSubmitting || limpiandoMesas} 
                   onClick={() => abrirModalResolver(p)} 
                   className="bg-white text-red-600 hover:bg-red-50 px-6 py-2 rounded-xl font-black shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                   <MessageSquare size={18}/> Resolver con Cliente
                </button>
                <button 
                   disabled={isSubmitting || limpiandoMesas} 
                   onClick={() => limpiarAlerta(p.id)} 
                   className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-xl font-bold shadow-sm transition disabled:opacity-50" 
                   title="Ocultar sin responder"
                >
                   <XCircle size={18}/>
                </button>
              </div>
            </div>
          )})}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-10">
        
        {vistaActiva === 'mesas' && (
           <VistaMesas 
              mesas={mesas} pedidos={pedidos} isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas}
              setLimpiandoMesas={setLimpiandoMesas} setModalPago={setModalPago} liberarMesaMagicamente={liberarMesaMagicamente}
           />
        )}

        {vistaActiva === 'confirmar' && (
           <VistaConfirmar
              pedidosPorConfirmar={pedidosPorConfirmar} isSubmitting={isSubmitting} actualizarEstadoPedido={actualizarEstadoPedido}
              setModalZonaEnvio={setModalZonaEnvio} confirmarPedidoRecoger={confirmarPedidoRecoger} getTelefonoExtraido={getTelefonoExtraido}
              renderBotonVerDetalle={renderBotonVerDetalle} renderBotonEditar={renderBotonEditar} renderItemsConfirmacion={renderItemsConfirmacion}
           />
        )}

        {vistaActiva === 'cobrar' && (
           <VistaCobrar
              ordenesEnCaja={ordenesEnCaja} isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas}
              setModalPago={setModalPago} setMontoRecibido={setMontoRecibido} actualizarEstadoPedido={actualizarEstadoPedido}
              getIconoPago={getIconoPago} getTelefonoExtraido={getTelefonoExtraido} renderBotonVerDetalle={renderBotonVerDetalle}
              renderBotonEditar={renderBotonEditar} renderBotonAgregarExtra={renderBotonAgregarExtra}
           />
        )}

        {vistaActiva === 'mesas_pagadas' && (
           <VistaMesasPagadas
              mesasPagadas={mesasPagadas} isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas}
              setLimpiandoMesas={setLimpiandoMesas} getTelefonoExtraido={getTelefonoExtraido} renderBotonVerDetalle={renderBotonVerDetalle}
              renderBotonEditar={renderBotonEditar} renderBotonAgregarExtra={renderBotonAgregarExtra} liberarMesaMagicamente={liberarMesaMagicamente}
              apiUrl={apiUrl}
           />
        )}

        {vistaActiva === 'entregas' && (
           <VistaEntregas
              listosParaEntregar={listosParaEntregar} isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas}
              actualizarEstadoPedido={actualizarEstadoPedido} setModalPago={setModalPago} setMontoRecibido={setMontoRecibido}
              getTelefonoExtraido={getTelefonoExtraido} renderBotonVerDetalle={renderBotonVerDetalle} renderBotonAgregarExtra={renderBotonAgregarExtra}
           />
        )}

        {/* 👇 VISTA ACTUALIZADA: HISTORIAL */}
        {vistaActiva === 'historial' && (
           <VistaHistorial
              pedidos={pedidos} subVistaHistorial={subVistaHistorial} setSubVistaHistorial={setSubVistaHistorial}
              isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas} getTelefonoExtraido={getTelefonoExtraido}
              renderBotonVerDetalle={renderBotonVerDetalle} configGlobal={configGlobal} lanzarImpresion={lanzarImpresion}
           />
        )}

        {/* 👇 VISTA ACTUALIZADA: CORTE DE CAJA */}
        {vistaActiva === 'corte' && (
           <VistaCorte
              totalPlatillos={totalPlatillos} totalExtras={totalExtras} totalEnvio={totalEnvio} fondoCaja={fondoCaja}
              totalEfectivoVentas={totalEfectivoVentas} totalGastos={totalGastos} totalTarjetaVentas={totalTarjetaVentas}
              totalTransferenciaVentas={totalTransferenciaVentas} gastosDia={gastosDia}
           />
        )}
      </div>

    </div>
  );
};

export default VistasCaja;