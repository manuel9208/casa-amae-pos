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
  
  // === ESTADOS DE LOS MODALES ===
  const [modalPago, setModalPago] = useState(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [modalResolver, setModalResolver] = useState(null);
  const [itemAfectadoIdx, setItemAfectadoIdx] = useState('');
  const [accionAlerta, setAccionAlerta] = useState('quitar');
  const [ingredienteReemplazo, setIngredienteReemplazo] = useState('');
  const [ticketImprimir, setTicketImprimir] = useState(null);

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
      if (key === 'negocio_abierto') formData.append(key, nuevoEstado);
      else if (configGlobal[key] !== null && configGlobal[key] !== undefined) formData.append(key, configGlobal[key]);
    });

    try {
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (!res.ok) throw new Error("Error en servidor");
    } catch (error) {
      setConfigGlobal(prev => ({ ...prev, negocio_abierto: !nuevoEstado }));
      alert('Error al cambiar el estado del negocio.');
    }
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

  // === FILTROS DE PEDIDOS ===
  const pedidosPorConfirmar = pedidos.filter(p => p.estado_preparacion === 'Pendiente' && p.tipo_consumo === 'Recoger en Local');
  const pendientesDePago = pedidos.filter(p => p.estado_preparacion === 'Pendiente' && p.tipo_consumo !== 'Recoger en Local');
  const listosParaEntregar = pedidos.filter(p => p.estado_preparacion === 'Listo');
  const pedidosConAlerta = pedidos.filter(p => p.alerta_cocina && p.estado_preparacion !== 'Entregado' && p.estado_preparacion !== 'Cancelado');

  return (
    <>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-800 relative print:hidden">
        
        {/* BARRA LATERAL (SIDEBAR) */}
        <SidebarCaja 
          user={user} onLogout={onLogout}
          configGlobal={configGlobal} toggleEstadoNegocio={toggleEstadoNegocio}
          vistaActiva={vistaActiva} setVistaActiva={setVistaActiva}
          pedidosPorConfirmar={pedidosPorConfirmar}
          pendientesDePago={pendientesDePago}
          listosParaEntregar={listosParaEntregar}
        />

        {/* ÁREA PRINCIPAL (VISTAS) */}
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
        />
        
        {/* MODALES Y CAPAS SUPERPUESTAS */}
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
        />
      </div>

      {/* DISEÑO DEL TICKET DE IMPRESIÓN (OCULTO) */}
      <TicketImpresion 
        ticketImprimir={ticketImprimir} 
        configGlobal={configGlobal} 
        apiUrl={apiUrl} 
      />
    </>
  );
};

export default Caja;