import React, { useState, useEffect } from 'react';
import SidebarCaja from './caja/SidebarCaja';
import VistasCaja from './caja/VistasCaja';
import ModalesCaja from './caja/ModalesCaja';
import TicketImpresion from './caja/TicketImpresion';

const Caja = ({ user, onLogout }) => {
  // === ESTADOS GLOBALES DE LA CAJA ===
  const [vistaActiva, setVistaActiva] = useState('cobrar'); 
  const [subVistaHistorial, setSubVistaHistorial] = useState('Pagado'); 
  const [pedidos, setPedidos] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [configGlobal, setConfigGlobal] = useState(null);
  const [insumosDB, setInsumosDB] = useState([]); 
  const [gastosDia, setGastosDia] = useState([]); 
  
  // === ESTADOS DE LOS MODALES ===
  const [modalPago, setModalPago] = useState(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [modalResolver, setModalResolver] = useState(null);
  const [itemAfectadoIdx, setItemAfectadoIdx] = useState('');
  const [accionAlerta, setAccionAlerta] = useState('quitar');
  const [ingredienteReemplazo, setIngredienteReemplazo] = useState('');
  const [ticketImprimir, setTicketImprimir] = useState(null);
  const [modalZonaEnvio, setModalZonaEnvio] = useState(null);
  
  // === ESTADOS PARA COMPRA RÁPIDA ===
  const [modalCompraRapida, setModalCompraRapida] = useState(false);
  const [insumoComprar, setInsumoComprar] = useState(null);
  const [paquetesComprados, setPaquetesComprados] = useState('');

  // === NUEVOS ESTADOS: Alertas Bonitas, Extras y Cobro en Efectivo ===
  const [alertaCaja, setAlertaCaja] = useState(null);
  const [modalAgregarExtra, setModalAgregarExtra] = useState(null);
  const [alertaCobroExtra, setAlertaCobroExtra] = useState(null); // 👇 NUEVO ESTADO PARA EL AVISO DE COBRO

  // === ESTADOS DEL FONDO DE CAJA ===
  const hoyStr = new Date().toLocaleDateString();
  const [fondoCaja, setFondoCaja] = useState(() => {
    const guardado = localStorage.getItem(`fondo_caja_${user?.id}_${hoyStr}`);
    return guardado !== null ? Number(guardado) : null;
  });
  const [inputFondo, setInputFondo] = useState('');

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  // === CARGA INICIAL Y POLLING ===
  useEffect(() => {
    fetch(`${apiUrl}/ingredientes`).then(r=>r.json()).then(data => setCatalogoIngredientes(Array.isArray(data) ? data : []));
    
    const cargarInsumos = async () => {
      try {
        const res = await fetch(`${apiUrl}/insumos`);
        const data = await res.json();
        setInsumosDB(Array.isArray(data) ? data : []);
      } catch (error) { console.error('Error cargando insumos'); }
    };
    cargarInsumos();

    const cargarGastosDia = async () => {
      try {
        const res = await fetch(`${apiUrl}/insumos/compras/hoy`);
        const data = await res.json();
        setGastosDia(Array.isArray(data) ? data : []);
      } catch (error) { console.error('Error cargando gastos del día'); }
    };
    cargarGastosDia();

    const cargarConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/configuracion?t=${new Date().getTime()}`);
        const data = await res.json();
        if(data && !data.error) setConfigGlobal(data);
      } catch (error) { console.error('Error al cargar config'); }
    };
    cargarConfig();

    const cargarPedidos = async () => {
      try { const res = await fetch(`${apiUrl}/pedidos/hoy?t=${new Date().getTime()}`); const data = await res.json(); setPedidos(Array.isArray(data) ? data : []); } catch (error) { console.error('Error al cargar pedidos'); }
    };
    cargarPedidos(); 
    
    const intervalo = setInterval(cargarPedidos, 3000); 
    return () => clearInterval(intervalo);
  }, [apiUrl]);

  const mostrarAlertaCaja = (titulo, mensaje, tipo = 'success') => {
    setAlertaCaja({ titulo, mensaje, tipo });
    setTimeout(() => setAlertaCaja(null), 4000);
  };

  // === FUNCIONES PRINCIPALES ===
  const toggleEstadoNegocio = async () => {
    if (!configGlobal) return;
    const nuevoEstado = !configGlobal.negocio_abierto;
    setConfigGlobal(prev => ({ ...prev, negocio_abierto: nuevoEstado }));

    const formData = new FormData();
    Object.keys(configGlobal).forEach(key => {
      if (key === 'negocio_abierto') {
        formData.append(key, nuevoEstado);
      } else if (key === 'tarifas_envio') {
        formData.append(key, typeof configGlobal[key] === 'string' ? configGlobal[key] : JSON.stringify(configGlobal[key] || []));
      } else if (configGlobal[key] !== null && configGlobal[key] !== undefined) {
        formData.append(key, configGlobal[key]);
      }
    });

    try {
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (!res.ok) throw new Error("Error en servidor");
    } catch (error) {
      setConfigGlobal(prev => ({ ...prev, negocio_abierto: !nuevoEstado }));
      mostrarAlertaCaja('Error', 'No se pudo cambiar el estado del negocio.', 'error');
    }
  };

  const cerrarCajaYSalir = async () => {
    if (configGlobal && configGlobal.negocio_abierto) {
      try {
        const formData = new FormData();
        Object.keys(configGlobal).forEach(key => {
          if (key === 'negocio_abierto') formData.append(key, false);
          else if (key === 'tarifas_envio') formData.append(key, typeof configGlobal[key] === 'string' ? configGlobal[key] : JSON.stringify(configGlobal[key] || []));
          else if (configGlobal[key] !== null && configGlobal[key] !== undefined) formData.append(key, configGlobal[key]);
        });
        await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      } catch (error) { console.error('Error cerrando negocio', error); }
    }
    onLogout();
  };

  const iniciarTurno = (e) => {
    e.preventDefault();
    const monto = Number(inputFondo);
    localStorage.setItem(`fondo_caja_${user?.id}_${hoyStr}`, monto);
    setFondoCaja(monto);
  };

  const lanzarImpresion = (pedido) => {
    setTicketImprimir(pedido);
    setTimeout(() => {
        window.print();
        setTicketImprimir(null);
    }, 500);
  };

  const procesarPago = async (estadoRechazo = null) => {
    const estadoFinal = estadoRechazo || (modalPago.estado_preparacion === 'Listo' ? 'Entregado' : 'Pagado');
    try { 
      const res = await fetch(`${apiUrl}/pedidos/${modalPago.id}/estado`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          estado_preparacion: estadoFinal,
          metodo_pago: modalPago.metodo_pago 
        }) 
      }); 
      if (res.ok) { 
        if (!estadoRechazo && configGlobal?.ticket_impresion_activa) {
            lanzarImpresion(modalPago);
        }
        mostrarAlertaCaja('¡Pago Procesado!', `Orden #${modalPago.numero_pedido} cobrada con éxito.`, 'success');
        setModalPago(null); 
        setMontoRecibido(''); 
      } 
    } catch (error) { mostrarAlertaCaja('Error', 'Problema al procesar el pago.', 'error'); }
  };

  const confirmarPedidoRecoger = async (id) => {
    try { await fetch(`${apiUrl}/pedidos/${id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: 'Pagado' }) }); } catch (error) {}
  };

  const confirmarPedidoDomicilio = async (pedido, tarifa) => {
    try {
      const nuevoTotal = Number(pedido.total) + Number(tarifa.costo);
      await fetch(`${apiUrl}/pedidos/${pedido.id}/estado`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          estado_preparacion: 'Pagado', 
          total: nuevoTotal, 
          costo_envio: tarifa.costo 
        }) 
      }); 
      mostrarAlertaCaja('Zona Asignada', 'Se ha sumado el costo de envío a la orden.', 'success');
      setModalZonaEnvio(null);
    } catch (error) {
      mostrarAlertaCaja('Error', 'Fallo al asignar domicilio.', 'error');
    }
  };

  const actualizarEstadoPedido = async (id, nuevoEstado) => {
    try { await fetch(`${apiUrl}/pedidos/${id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: nuevoEstado }) }); } catch (error) {}
  };

  const limpiarAlerta = async (id) => {
    try { await fetch(`${apiUrl}/pedidos/${id}/alerta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: null }) }); } catch (error) {}
  };

  const abrirModalResolver = (p) => {
    setModalResolver(p); 
    const idxMatch = p.alerta_cocina.match(/\[IDX:(\d+)\]/);
    if (idxMatch) { setItemAfectadoIdx(idxMatch[1]); } else { setItemAfectadoIdx(''); }
    setIngredienteReemplazo('');
    const match = p.alerta_cocina.match(/Propuesta: (.*)/);
    if (match && match[1] && match[1] !== 'Ninguna' && match[1] !== 'Solo quitarlo') setAccionAlerta('aceptar'); else setAccionAlerta('quitar');
  };

  const enviarRespuestaCocina = async (e) => {
    e.preventDefault();
    const itemSeleccionado = modalResolver.carrito[itemAfectadoIdx];
    const extrasStr = (itemSeleccionado.extras || []).map(ex => ex.nombre).join(', ');
    const nombreCompleto = `${itemSeleccionado.nombre}${extrasStr ? ` (${extrasStr})` : ''}`;

    let respuesta = `[IDX:${itemAfectadoIdx}] ✅ CAJA RESPONDE: En ${nombreCompleto}, `;
    if (accionAlerta === 'quitar') respuesta += `preparar SIN el ingrediente faltante.`;
    if (accionAlerta === 'cambiar') respuesta += `CAMBIAR el faltante por: ${ingredienteReemplazo}.`;
    
    const match = modalResolver.alerta_cocina.match(/Propuesta: (.*)/);
    const propuestaChef = match ? match[1] : null;
    if (accionAlerta === 'aceptar') respuesta += `ACEPTAR PROPUESTA (${propuestaChef}).`;

    try {
      await fetch(`${apiUrl}/pedidos/${modalResolver.id}/alerta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: respuesta }) });
      mostrarAlertaCaja('¡Respuesta Enviada!', 'El chef ya fue notificado.', 'success');
      setModalResolver(null); setItemAfectadoIdx(''); setAccionAlerta('quitar'); setIngredienteReemplazo('');
    } catch (error) { mostrarAlertaCaja('Error', 'No se pudo enviar la respuesta.', 'error'); }
  };

  const registrarCompraRapida = async (e) => {
    e.preventDefault();
    if (!insumoComprar || !paquetesComprados) return;

    try {
      const res = await fetch(`${apiUrl}/insumos/${insumoComprar.id}/comprar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paquetes: Number(paquetesComprados), costo_unitario: Number(insumoComprar.costo_presentacion) })
      });

      if (res.ok) {
        const resInsumos = await fetch(`${apiUrl}/insumos`);
        const dataInsumos = await resInsumos.json();
        setInsumosDB(Array.isArray(dataInsumos) ? dataInsumos : []);

        const resGastos = await fetch(`${apiUrl}/insumos/compras/hoy`);
        const dataGastos = await resGastos.json();
        setGastosDia(Array.isArray(dataGastos) ? dataGastos : []);
        
        setInsumoComprar(null);
        setPaquetesComprados('');
        mostrarAlertaCaja('🛒 ¡Compra Exitosa!', 'El stock se actualizó y el gasto se descontó del corte.', 'success');
      } else {
        mostrarAlertaCaja('Error', 'Fallo al registrar la compra.', 'error');
      }
    } catch (error) {
      mostrarAlertaCaja('Error', 'Problema de conexión al guardar.', 'error');
    }
  };

  // 👇 ACTUALIZADO: Copia profunda, actualización instantánea y disparo del Aviso de Cobro
  const confirmarAgregarExtra = async (pedido, itemIndex, extraObj) => {
    try {
        // Deep Copy: Esto asegura que React detecte el cambio en el carrito y lo repinte
        const carritoActual = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : pedido.carrito;
        const nuevoCarrito = JSON.parse(JSON.stringify(carritoActual));
        
        const item = nuevoCarrito[itemIndex];
        
        if (!item.extras) item.extras = [];
        item.extras.push({
            id: extraObj.id,
            nombre: `+ ${extraObj.nombre}`,
            precioExtra: Number(extraObj.precio_extra)
        });
        
        // Sumamos el precio base (o final actual) con el nuevo extra
        item.precioFinal = Number(item.precioFinal || item.precio_base || item.precio || 0) + Number(extraObj.precio_extra);
        const nuevoTotal = Number(pedido.total) + Number(extraObj.precio_extra);

        const res = await fetch(`${apiUrl}/pedidos/${pedido.id}/estado`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                carrito: nuevoCarrito,
                total: nuevoTotal,
                estado_preparacion: pedido.estado_preparacion 
            }) 
        });

        if(res.ok) {
            // Actualización instantánea en la interfaz y en el ticket sin esperar los 3 segundos
            setPedidos(prev => prev.map(p => 
               p.id === pedido.id ? { ...p, carrito: nuevoCarrito, total: nuevoTotal } : p
            ));
            
            // 👇 DISPARAMOS LA ALERTA GIGANTE DE COBRO EN CAJA
            if (Number(extraObj.precio_extra) > 0) {
               setAlertaCobroExtra({
                  monto: extraObj.precio_extra,
                  extra: extraObj.nombre,
                  platillo: item.nombre,
                  orden: pedido.numero_pedido
               });
            } else {
               mostrarAlertaCaja('✅ Extra Agregado', `Se añadió ${extraObj.nombre} gratis.`, 'success');
            }
            
            setModalAgregarExtra(null);
        } else {
            mostrarAlertaCaja('Error', 'No se pudo guardar el extra en la base de datos.', 'error');
        }
    } catch (error) {
        mostrarAlertaCaja('Error', 'Hubo un problema de red.', 'error');
    }
  };

  const pedidosPorConfirmar = pedidos.filter(p => p.estado_preparacion === 'Pendiente' && (p.tipo_consumo === 'Recoger en Local' || p.tipo_consumo === 'Domicilio'));
  const pendientesDePago = pedidos.filter(p => p.estado_preparacion === 'Pendiente' && p.tipo_consumo !== 'Recoger en Local' && p.tipo_consumo !== 'Domicilio');
  const listosParaEntregar = pedidos.filter(p => p.estado_preparacion === 'Listo');
  const pedidosConAlerta = pedidos.filter(p => p.alerta_cocina && p.estado_preparacion !== 'Entregado' && p.estado_preparacion !== 'Cancelado');

  return (
    <>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-800 relative print:hidden">
        
        <SidebarCaja 
          user={user} 
          onLogout={cerrarCajaYSalir} 
          configGlobal={configGlobal} toggleEstadoNegocio={toggleEstadoNegocio}
          vistaActiva={vistaActiva} setVistaActiva={setVistaActiva}
          pedidosPorConfirmar={pedidosPorConfirmar}
          pendientesDePago={pendientesDePago}
          listosParaEntregar={listosParaEntregar}
          setModalCompraRapida={setModalCompraRapida} 
        />

        <VistasCaja 
          vistaActiva={vistaActiva}
          subVistaHistorial={subVistaHistorial} setSubVistaHistorial={setSubVistaHistorial}
          pedidos={pedidos}
          pedidosConAlerta={pedidosConAlerta}
          pedidosPorConfirmar={pedidosPorConfirmar}
          pendientesDePago={pendientesDePago}
          listosParaEntregar={listosParaEntregar}
          fondoCaja={fondoCaja}
          configGlobal={configGlobal}
          gastosDia={gastosDia} 
          
          abrirModalResolver={abrirModalResolver}
          limpiarAlerta={limpiarAlerta}
          setModalPago={setModalPago}
          setMontoRecibido={setMontoRecibido}
          actualizarEstadoPedido={actualizarEstadoPedido}
          confirmarPedidoRecoger={confirmarPedidoRecoger}
          lanzarImpresion={lanzarImpresion}
          setModalZonaEnvio={setModalZonaEnvio}
          setModalAgregarExtra={setModalAgregarExtra} 
        />
        
        <ModalesCaja 
          fondoCaja={fondoCaja} iniciarTurno={iniciarTurno} inputFondo={inputFondo} setInputFondo={setInputFondo}
          modalResolver={modalResolver} setModalResolver={setModalResolver}
          itemAfectadoIdx={itemAfectadoIdx} setItemAfectadoIdx={setItemAfectadoIdx}
          accionAlerta={accionAlerta} setAccionAlerta={setAccionAlerta}
          ingredienteReemplazo={ingredienteReemplazo} setIngredienteReemplazo={setIngredienteReemplazo}
          enviarRespuestaCocina={enviarRespuestaCocina}
          catalogoIngredientes={catalogoIngredientes}
          modalPago={modalPago} setModalPago={setModalPago}
          montoRecibido={montoRecibido} setMontoRecibido={setMontoRecibido}
          procesarPago={procesarPago}
          
          configGlobal={configGlobal}
          modalZonaEnvio={modalZonaEnvio}
          setModalZonaEnvio={setModalZonaEnvio}
          confirmarPedidoDomicilio={confirmarPedidoDomicilio}

          modalCompraRapida={modalCompraRapida}
          setModalCompraRapida={setModalCompraRapida}
          insumosDB={insumosDB}
          insumoComprar={insumoComprar}
          setInsumoComprar={setInsumoComprar}
          paquetesComprados={paquetesComprados}
          setPaquetesComprados={setPaquetesComprados}
          registrarCompraRapida={registrarCompraRapida}

          alertaCaja={alertaCaja}
          setAlertaCaja={setAlertaCaja}
          modalAgregarExtra={modalAgregarExtra}
          setModalAgregarExtra={setModalAgregarExtra}
          confirmarAgregarExtra={confirmarAgregarExtra}
          
          // 👇 PASAMOS EL ESTADO DEL AVISO DE COBRO AL COMPONENTE DE MODALES
          alertaCobroExtra={alertaCobroExtra}
          setAlertaCobroExtra={setAlertaCobroExtra}
        />
      </div>

      <TicketImpresion 
        ticketImprimir={ticketImprimir} 
        configGlobal={configGlobal} 
        apiUrl={apiUrl} 
      />
    </>
  );
};

export default Caja;