import React, { useState } from 'react';
import { BellRing, MessageSquare, XCircle, DollarSign, Clock, CreditCard, Smartphone, Wallet } from 'lucide-react';  
import VistaMesas from './vistas/mesas/VistaMesas';
import VistaConfirmar from './vistas/confirmar/VistaConfirmar';
import VistaCobrar from './vistas/cobrar/VistaCobrar';
import VistaMesasPagadas from './vistas/mesas_pagadas/VistaMesasPagadas';
import VistaEntregas from './vistas/entregas/VistaEntregas';
import VistaHistorial from './vistas/historial/VistaHistorial';
import VistaCorte from './vistas/corte/VistaCorte';
import VistaLiquidacionRep from './vistas/reparto/VistaLiquidacionRep';
import VistaCocinaMini from './vistas/cocina_mini/VistaCocinaMini';
import { PlusCircle, Eye } from 'lucide-react';  

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';  

const VistasCaja = (props) => {
  const { vistaActiva, pedidosEnReparto, pedidos, fondoRepartidor, actualizarFondoRepartidor, user, isSubmitting } = props;  
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
        onClick={() => props.setModalAgregarExtra({ pedidoOriginal: pedido, itemIndex: 0, itemSeleccionado: item })}
        className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 border border-emerald-200 disabled:opacity-50"
      >
        <PlusCircle size={15} /> Cobrar Extra
      </button>
    );
  };  

  const renderBotonVerDetalle = (pedido) => (
    <button
      disabled={isSubmitting || limpiandoMesas}
      onClick={() => props.setModalVerDetalle(pedido)}
      className="w-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 border border-slate-200 shadow-sm disabled:opacity-50"
    >
      <Eye size={15} /> Ver Platillos
    </button>
  );  

  const renderBotonEditar = (pedido) => (
    <button
      disabled={isSubmitting || limpiandoMesas}
      onClick={() => props.setModalEditarPedido(pedido)}
      className="w-full bg-blue-50 text-blue-700 hover:bg-blue-500 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 border border-blue-200 shadow-sm disabled:opacity-50"
    >
      ✏️ Editar Info
    </button>
  );  

  const liberarMesaMagicamente = async (numero_mesa) => {
    try {
      const paqueteFantasma = {
        cliente_id: null, tipo_consumo: 'Local', metodo_pago: 'Efectivo', total: 0, carrito: [], origen: 'Caja', direccion_entrega: 'Limpieza de Mesa', descuento_puntos: 0, estado_preparacion: 'Pendiente', mesa: numero_mesa
      };
      const res = await fetch(`${apiUrl}/pedidos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(paqueteFantasma) });
      if (res.ok) {
        const data = await res.json();
        await fetch(`${apiUrl}/pedidos/${data.id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: 'Cancelado' }) });
      }
    } catch (e) { console.error("Error liberando mesa", e); }
  };  

  const totalGastos = (props.gastosDia || []).reduce((sum, gasto) => sum + Number(gasto.costo_total), 0);  
  const pedidosValidos = pedidos.filter(p => p.estado_preparacion !== 'Pendiente' && p.estado_preparacion !== 'Cancelado');  
  
  let totalPlatillos = 0; let totalExtras = 0; let totalEnvio = 0;  
  let dPlatillos = 0; let dExtras = 0; let dEnvio = 0; let dEfectivo = 0; let dTarjeta = 0; let dTransf = 0;  
  
  pedidosValidos.forEach(p => {
    const isDomicilio = p.tipo_consumo === 'Domicilio';  
    totalEnvio += Number(p.costo_envio || 0);
    if (isDomicilio) dEnvio += Number(p.costo_envio || 0);  
    const items = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : (p.carrito || []);
    
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
    });  
    
    if (isDomicilio) {
      if(p.metodo_pago === 'Efectivo') dEfectivo += Number(p.total);
      if(p.metodo_pago === 'Tarjeta') dTarjeta += Number(p.total);
      if(p.metodo_pago === 'Transferencia') dTransf += Number(p.total);
      if(p.metodo_pago === 'Mixto' && p.pagos_mixtos) {
        try {
          const pm = typeof p.pagos_mixtos === 'string' ? JSON.parse(p.pagos_mixtos) : p.pagos_mixtos;
          pm.forEach(x => {
            if(x.metodo==='Efectivo') dEfectivo+=Number(x.monto);
            if(x.metodo==='Tarjeta') dTarjeta+=Number(x.monto);
            if(x.metodo==='Transferencia') dTransf+=Number(x.monto);
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
      {/* ALERTAS DE COCINA */}
      {props.pedidosConAlerta.length > 0 && (
        <div className="w-full p-4 space-y-2 z-10 shrink-0">
          {props.pedidosConAlerta.map(p => {
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
                  <button disabled={isSubmitting || limpiandoMesas} onClick={() => props.abrirModalResolver(p)} className="bg-white text-red-600 hover:bg-red-50 px-6 py-2 rounded-xl font-black shadow-sm transition flex items-center gap-2 disabled:opacity-50">
                    <MessageSquare size={18}/> Resolver con Cliente
                  </button>
                  <button disabled={isSubmitting || limpiandoMesas} onClick={() => props.limpiarAlerta(p.id)} className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-xl font-bold shadow-sm transition disabled:opacity-50" title="Ocultar sin responder">
                    <XCircle size={18}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}  

      <div className="flex-1 p-4 md:p-10">
        {vistaActiva === 'mesas' && <VistaMesas mesas={props.mesas} pedidos={pedidos} isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas} setLimpiandoMesas={setLimpiandoMesas} setModalPago={props.setModalPago} liberarMesaMagicamente={liberarMesaMagicamente} />}  
        {vistaActiva === 'confirmar' && <VistaConfirmar user={user} pedidosPorConfirmar={props.pedidosPorConfirmar} isSubmitting={isSubmitting} actualizarEstadoPedido={props.actualizarEstadoPedido} setModalZonaEnvio={props.setModalZonaEnvio} confirmarPedidoRecoger={props.confirmarPedidoRecoger} getTelefonoExtraido={getTelefonoExtraido} renderBotonVerDetalle={renderBotonVerDetalle} renderBotonEditar={renderBotonEditar} renderItemsConfirmacion={renderItemsConfirmacion} />}  
        {vistaActiva === 'cobrar' && <VistaCobrar user={user} ordenesEnCaja={ordenesEnCaja} isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas} setModalPago={props.setModalPago} setMontoRecibido={props.setMontoRecibido} actualizarEstadoPedido={props.actualizarEstadoPedido} getIconoPago={getIconoPago} getTelefonoExtraido={getTelefonoExtraido} renderBotonVerDetalle={renderBotonVerDetalle} renderBotonEditar={renderBotonEditar} renderBotonAgregarExtra={renderBotonAgregarExtra} />}  
        {vistaActiva === 'mesas_pagadas' && <VistaMesasPagadas mesasPagadas={props.mesasPagadas} isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas} setLimpiandoMesas={setLimpiandoMesas} getTelefonoExtraido={getTelefonoExtraido} renderBotonVerDetalle={renderBotonVerDetalle} renderBotonEditar={renderBotonEditar} renderBotonAgregarExtra={renderBotonAgregarExtra} liberarMesaMagicamente={liberarMesaMagicamente} apiUrl={apiUrl} />}
        {vistaActiva === 'entregas' && <VistaEntregas listosParaEntregar={props.listosParaEntregar} isSubmitting={isSubmitting} limpiandoMesas={limpiandoMesas} actualizarEstadoPedido={props.actualizarEstadoPedido} setModalPago={props.setModalPago} setMontoRecibido={props.setMontoRecibido} getTelefonoExtraido={getTelefonoExtraido} renderBotonVerDetalle={renderBotonVerDetalle} renderBotonAgregarExtra={renderBotonAgregarExtra} />}
        
        {/* 👇 AQUÍ AÑADIMOS renderBotonEditar PARA LA VISTA HISTORIAL */}
        {vistaActiva === 'historial' && (
          <VistaHistorial 
            pedidos={pedidos} 
            subVistaHistorial={props.subVistaHistorial} 
            setSubVistaHistorial={props.setSubVistaHistorial} 
            isSubmitting={isSubmitting} 
            limpiandoMesas={limpiandoMesas} 
            getTelefonoExtraido={getTelefonoExtraido} 
            renderBotonVerDetalle={renderBotonVerDetalle} 
            renderBotonEditar={renderBotonEditar} 
            configGlobal={props.configGlobal} 
            lanzarImpresion={props.lanzarImpresion} 
          />
        )}  

        {vistaActiva === 'liquidacion_reparto' && (
          <VistaLiquidacionRep
            pedidosEnReparto={pedidosEnReparto}
            fondoRepartidor={fondoRepartidor}
            actualizarFondoRepartidor={actualizarFondoRepartidor}
            setModalPago={props.setModalPago}
          />
        )}  
        
        {vistaActiva === 'corte' && (
          <VistaCorte
            totalPlatillos={totalPlatillos} totalExtras={totalExtras} totalEnvio={totalEnvio} fondoCaja={props.fondoCaja}
            totalEfectivoVentas={totalEfectivoVentas} totalGastos={totalGastos} totalTarjetaVentas={totalTarjetaVentas}
            totalTransferenciaVentas={totalTransferenciaVentas} gastosDia={props.gastosDia}
            fondoRepartidor={fondoRepartidor}
            envios={{ platillos: dPlatillos, extras: dExtras, envio: dEnvio, efectivo: dEfectivo, tarjeta: dTarjeta, transf: dTransf }}
          />
        )}  

        {vistaActiva === 'cocina_mini' && (
          <VistaCocinaMini
            user={user}
            pedidos={pedidos.filter(p => !['En Camino', 'Entregado', 'Cancelado', 'Finalizado'].includes(p.estado_preparacion))}
            empleadosPOS={props.empleadosPOS}
            apiUrl={apiUrl}
            isSubmitting={isSubmitting}
            actualizarEstadoPedido={props.actualizarEstadoPedido}
          />
        )}
      </div>
    </div>
  );
};  

export default VistasCaja;