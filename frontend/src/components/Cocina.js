import React, { useState, useEffect, useCallback } from 'react';
import HeaderKDS from './cocina/HeaderKDS';
import GridPedidos from './cocina/GridPedidos';
import ModalProblema from './cocina/ModalProblema';
import ModalSolicitarInsumo from './cocina/ModalSolicitarInsumo';
import ModalReportarMerma from './cocina/ModalReportarMerma';

const Cocina = ({ user, onLogout }) => {
  const [pedidos, setPedidos] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [filtroTab, setFiltroTab] = useState('Todo'); 
  const [ahora, setAhora] = useState(Date.now());
  
  const [modalAlerta, setModalAlerta] = useState(null); 
  const [faltanteSelec, setFaltanteSelec] = useState('');
  const [propuestaSelec, setPropuestaSelec] = useState('');

  // ESTADOS PARA LAS NUEVAS CARACTERÍSTICAS
  const [modalInsumo, setModalInsumo] = useState(false);
  const [modalMerma, setModalMerma] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  const getCarrito = (p) => {
    if (!p || !p.carrito) return [];
    return typeof p.carrito === 'string' ? JSON.parse(p.carrito) : p.carrito;
  };

  const cargarPedidos = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/pedidos/hoy`);
      const data = await res.json();
      setPedidos(Array.isArray(data) ? data : []);
    } catch (error) { console.error('Error al cargar pedidos'); }
  }, [apiUrl]);

  useEffect(() => {
    fetch(`${apiUrl}/ingredientes`).then(r=>r.json()).then(data => setCatalogoIngredientes(Array.isArray(data) ? data : []));
    cargarPedidos(); 
    const intervalo = setInterval(cargarPedidos, 3000); 
    const timerReloj = setInterval(() => setAhora(Date.now()), 1000); 
    return () => { clearInterval(intervalo); clearInterval(timerReloj); };
  }, [apiUrl, cargarPedidos]);

  const actualizarEstadoPedido = async (p, nuevoEstadoLocal) => {
    if (isSubmitting) return; 
    setIsSubmitting(true); // Se activa el seguro contra doble clic

    const area = filtroTab;
    const carritoArray = getCarrito(p);
    
    const nuevoCarrito = carritoArray.map(item => {
      if (area === 'Todo' || item.destino === area) return { ...item, estado: nuevoEstadoLocal };
      return item;
    });

    const todosListos = nuevoCarrito.every(item => item.estado === 'Listo');
    const algunPreparando = nuevoCarrito.some(item => item.estado === 'Preparando' || item.estado === 'Listo');

    let estadoGlobal = p.estado_preparacion;
    if (todosListos) estadoGlobal = 'Listo';
    else if (algunPreparando) estadoGlobal = 'Preparando';

    try {
      const res = await fetch(`${apiUrl}/pedidos/${p.id}/estado`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ estado_preparacion: estadoGlobal, chef_id: user.id, carrito: nuevoCarrito }) 
      });
      if (res.ok) { await cargarPedidos(); } 
    } catch (error) { 
      alert('Error de conexión con el servidor.'); 
    } finally {
      setIsSubmitting(false); // 👇 ¡CORREGIDO! Ahora el seguro siempre se libera al terminar la petición
    }
  };

  const enviarAlerta = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const extrasStr = (modalAlerta.item.extras || []).map(e => e.nombre).join(', ');
    const identificadorPlatillo = `${modalAlerta.item.nombre}${extrasStr ? ` (${extrasStr})` : ''}`;
    const idxAfectado = modalAlerta.item.indices[0];
    const mensaje = `[IDX:${idxAfectado}] [En: ${identificadorPlatillo}] Falta: ${faltanteSelec}. Propuesta: ${propuestaSelec || 'Ninguna'}`;
    
    try {
      await fetch(`${apiUrl}/pedidos/${modalAlerta.pedido.id}/alerta`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ alerta_cocina: mensaje }) 
      });
      setModalAlerta(null); setFaltanteSelec(''); setPropuestaSelec('');
    } catch (error) { alert('Error al enviar alerta.'); }
    setIsSubmitting(false);
  };

  const limpiarAlerta = async (id) => {
    try { 
      await fetch(`${apiUrl}/pedidos/${id}/alerta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: null }) }); 
      await cargarPedidos();
    } catch (error) {}
  };

  const pedidosVisibles = pedidos.filter(p => {
    if (p.estado_preparacion === 'Entregado' || p.estado_preparacion === 'Cancelado' || p.estado_preparacion === 'Pendiente' || p.estado_preparacion === 'Finalizado') return false;
    const carritoArray = getCarrito(p);
    const itemsDeEstaArea = carritoArray.filter(i => filtroTab === 'Todo' || i.destino === filtroTab);
    if (itemsDeEstaArea.length === 0) return false;
    const estaAreaLista = itemsDeEstaArea.every(i => i.estado === 'Listo');
    if (estaAreaLista) return false;
    return true;
  });

  const hayPedidoEnPreparacion = pedidosVisibles.some(p => {
    const carritoArray = getCarrito(p);
    const itemsArea = carritoArray.filter(i => filtroTab === 'Todo' || i.destino === filtroTab);
    if (itemsArea.length === 0) return false;
    return (itemsArea.every(i => i.estado === 'Listo') ? 'Listo' : itemsArea.some(i => i.estado === 'Preparando' || i.estado === 'Listo') ? 'Preparando' : 'Pagado') === 'Preparando';
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-6">
      <HeaderKDS 
         user={user} onLogout={onLogout} filtroTab={filtroTab} setFiltroTab={setFiltroTab}
         setModalInsumo={setModalInsumo} setModalMerma={setModalMerma}
      />

      <GridPedidos 
         pedidosVisibles={pedidosVisibles} filtroTab={filtroTab} ahora={ahora}
         hayPedidoEnPreparacion={hayPedidoEnPreparacion} isSubmitting={isSubmitting}
         setModalAlerta={setModalAlerta} limpiarAlerta={limpiarAlerta}
         actualizarEstadoPedido={actualizarEstadoPedido} getCarrito={getCarrito}
      />

      {modalAlerta && (
         <ModalProblema 
            modalAlerta={modalAlerta} setModalAlerta={setModalAlerta}
            faltanteSelec={faltanteSelec} setFaltanteSelec={setFaltanteSelec}
            propuestaSelec={propuestaSelec} setPropuestaSelec={setPropuestaSelec}
            catalogoIngredientes={catalogoIngredientes} isSubmitting={isSubmitting} enviarAlerta={enviarAlerta}
         />
      )}

      {modalInsumo && (
         <ModalSolicitarInsumo setModalInsumo={setModalInsumo} catalogoIngredientes={catalogoIngredientes} apiUrl={apiUrl} user={user} />
      )}

      {modalMerma && (
         <ModalReportarMerma setModalMerma={setModalMerma} catalogoIngredientes={catalogoIngredientes} apiUrl={apiUrl} refrescarDatos={cargarPedidos} />
      )}
    </div>
  );
};

export default Cocina;