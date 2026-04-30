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
  const [insumosDB, setInsumosDB] = useState([]); // 👇 NUEVO: Estado para el catálogo de insumos
  
  // === ESTADOS DE LOS MODALES ===
  const [modalPago, setModalPago] = useState(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [modalResolver, setModalResolver] = useState(null);
  const [itemAfectadoIdx, setItemAfectadoIdx] = useState('');
  const [accionAlerta, setAccionAlerta] = useState('quitar');
  const [ingredienteReemplazo, setIngredienteReemplazo] = useState('');
  const [ticketImprimir, setTicketImprimir] = useState(null);
  const [modalZonaEnvio, setModalZonaEnvio] = useState(null);
  
  // 👇 NUEVOS ESTADOS PARA COMPRA RÁPIDA
  const [modalCompraRapida, setModalCompraRapida] = useState(false);
  const [insumoComprar, setInsumoComprar] = useState(null);
  const [paquetesComprados, setPaquetesComprados] = useState('');

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
    
    // 👇 NUEVO: Cargar los insumos para la compra rápida
    const cargarInsumos = async () => {
      try {
        const res = await fetch(`${apiUrl}/insumos`);
        const data = await res.json();
        setInsumosDB(Array.isArray(data) ? data : []);
      } catch (error) { console.error('Error cargando insumos'); }
    };
    cargarInsumos();

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
      alert('Error al cambiar el estado del negocio.');
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
        setModalPago(null); 
        setMontoRecibido(''); 
      } 
    } catch (error) { alert('Error al procesar el pago.'); }
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
      setModalZonaEnvio(null);
    } catch (error) {
      alert("Error al confirmar el pedido a domicilio.");
    }
  };

  const actualizarEstadoPedido = async (id, nuevoEstado) => {
    try { await fetch(`${apiUrl}/pedidos/${id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_preparacion: nuevoEstado }) }); } catch (error) {}
  };

  const limpiarAlerta = async (id) => {
    try { await fetch(`${apiUrl}/pedidos/${id}/alerta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: null }) }); } catch (error) {}
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
      setModalResolver(null); setItemAfectadoIdx(''); setAccionAlerta('quitar'); setIngredienteReemplazo('');
    } catch (error) { alert('Error al enviar respuesta a cocina.'); }
  };

  const abrirModalResolver = (p) => {
    setModalResolver(p); 
    const idxMatch = p.alerta_cocina.match(/\[IDX:(\d+)\]/);
    if (idxMatch) { setItemAfectadoIdx(idxMatch[1]); } else { setItemAfectadoIdx(''); }
    setIngredienteReemplazo('');
    const match = p.alerta_cocina.match(/Propuesta: (.*)/);
    if (match && match[1] && match[1] !== 'Ninguna' && match[1] !== 'Solo quitarlo') setAccionAlerta('aceptar'); else setAccionAlerta('quitar');
  };

  // 👇 NUEVA FUNCIÓN: Registrar Compra Rápida de Insumos
  const registrarCompraRapida = async (e) => {
    e.preventDefault();
    if (!insumoComprar || !paquetesComprados) return;

    try {
      const res = await fetch(`${apiUrl}/insumos/${insumoComprar.id}/comprar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paquetes: Number(paquetesComprados),
          costo_unitario: Number(insumoComprar.costo_presentacion) // Usamos el costo que ya tiene guardado
        })
      });

      if (res.ok) {
        // Refrescamos la lista de insumos
        const resInsumos = await fetch(`${apiUrl}/insumos`);
        const dataInsumos = await resInsumos.json();
        setInsumosDB(Array.isArray(dataInsumos) ? dataInsumos : []);
        
        setInsumoComprar(null);
        setPaquetesComprados('');
        alert('Compra registrada correctamente en el inventario.');
      } else {
        alert('Error al registrar la compra rápida.');
      }
    } catch (error) {
      alert('Problema de conexión al guardar la compra.');
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
          setModalCompraRapida={setModalCompraRapida} // Pasamos la función para abrir el modal
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
          
          abrirModalResolver={abrirModalResolver}
          limpiarAlerta={limpiarAlerta}
          setModalPago={setModalPago}
          setMontoRecibido={setMontoRecibido}
          actualizarEstadoPedido={actualizarEstadoPedido}
          confirmarPedidoRecoger={confirmarPedidoRecoger}
          lanzarImpresion={lanzarImpresion}
          setModalZonaEnvio={setModalZonaEnvio}
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

          // 👇 NUEVAS PROPS PARA COMPRA RÁPIDA
          modalCompraRapida={modalCompraRapida}
          setModalCompraRapida={setModalCompraRapida}
          insumosDB={insumosDB}
          insumoComprar={insumoComprar}
          setInsumoComprar={setInsumoComprar}
          paquetesComprados={paquetesComprados}
          setPaquetesComprados={setPaquetesComprados}
          registrarCompraRapida={registrarCompraRapida}
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