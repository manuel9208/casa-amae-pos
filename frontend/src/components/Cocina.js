import React, { useState, useEffect, useCallback } from 'react';
import HeaderKDS from './cocina/HeaderKDS';
import GridPedidos from './cocina/GridPedidos';
import ModalProblema from './cocina/ModalProblema';
import ModalSolicitarInsumo from './cocina/ModalSolicitarInsumo';
import ModalReportarMerma from './cocina/ModalReportarMerma';
import { Users } from 'lucide-react';

const Cocina = ({ user, onLogout }) => {
  const [pedidos, setPedidos] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [ayudantes, setAyudantes] = useState([]); // 👈 NUEVO: Estado de ayudantes
  const [filtroTab, setFiltroTab] = useState('Todo'); 
  const [ahora, setAhora] = useState(Date.now());
  
  const [modalAlerta, setModalAlerta] = useState(null); 
  const [faltanteSelec, setFaltanteSelec] = useState('');
  const [propuestaSelec, setPropuestaSelec] = useState('');

  const [modalInsumo, setModalInsumo] = useState(false);
  const [modalMerma, setModalMerma] = useState(false);
  
  // 👈 NUEVO: Estado para el modal de asignación de ayudante
  const [pedidoParaAyudante, setPedidoParaAyudante] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  const getCarrito = (p) => {
    if (!p || !p.carrito) return [];
    return typeof p.carrito === 'string' ? JSON.parse(p.carrito) : p.carrito;
  };

  const cargarDatos = useCallback(async () => {
    try {
      const [resPedidos, resAyudantes, resIngredientes] = await Promise.all([
        fetch(`${apiUrl}/pedidos/hoy`),
        fetch(`${apiUrl}/usuarios/ayudantes`),
        fetch(`${apiUrl}/ingredientes`)
      ]);
      
      const dataPedidos = await resPedidos.json();
      const dataAyudantes = await resAyudantes.json();
      const dataIngredientes = await resIngredientes.json();

      setPedidos(Array.isArray(dataPedidos) ? dataPedidos : []);
      setAyudantes(Array.isArray(dataAyudantes) ? dataAyudantes : []);
      setCatalogoIngredientes(Array.isArray(dataIngredientes) ? dataIngredientes : []);
    } catch (error) { console.error('Error al cargar datos de cocina'); }
  }, [apiUrl]);

  useEffect(() => {
    cargarDatos(); 
    const intervalo = setInterval(() => {
      fetch(`${apiUrl}/pedidos/hoy`).then(r=>r.json()).then(data => setPedidos(Array.isArray(data)?data:[]));
    }, 3000); 
    const timerReloj = setInterval(() => setAhora(Date.now()), 1000); 
    return () => { clearInterval(intervalo); clearInterval(timerReloj); };
  }, [apiUrl, cargarDatos]);

  // 👈 MODIFICADO: Ahora recibe el chef_id de quien tomó la comanda
  const actualizarEstadoPedido = async (p, nuevoEstadoLocal, idAyudanteAsignado = null) => {
    if (isSubmitting) return; 
    setIsSubmitting(true); 

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

    // Definir quién se lleva el crédito (El ayudante que seleccionó su nombre, o el usuario logeado por defecto)
    const chefResponsable = idAyudanteAsignado || user.id;

    try {
      const res = await fetch(`${apiUrl}/pedidos/${p.id}/estado`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ estado_preparacion: estadoGlobal, chef_id: chefResponsable, carrito: nuevoCarrito }) 
      });
      if (res.ok) { 
        await fetch(`${apiUrl}/pedidos/hoy`).then(r=>r.json()).then(data => setPedidos(Array.isArray(data)?data:[]));
        setPedidoParaAyudante(null); // Cerramos el modal si estaba abierto
      } 
    } catch (error) { 
      alert('Error de conexión con el servidor.'); 
    } finally {
      setIsSubmitting(false); 
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
      fetch(`${apiUrl}/pedidos/hoy`).then(r=>r.json()).then(data => setPedidos(Array.isArray(data)?data:[]));
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

  // 👈 NUEVO: Filtrar ayudantes por su turno activo
  const ayudantesActivos = ayudantes.filter(a => {
    if (!a.permisos || !a.permisos.horario_entrada || !a.permisos.horario_salida) return true;
    const date = new Date();
    const currentMins = date.getHours() * 60 + date.getMinutes();
    
    const [hEnt, mEnt] = a.permisos.horario_entrada.split(':').map(Number);
    const [hSal, mSal] = a.permisos.horario_salida.split(':').map(Number);
    const minsEnt = hEnt * 60 + mEnt;
    const minsSal = hSal * 60 + mSal;
    
    if (minsEnt <= minsSal) return currentMins >= minsEnt && currentMins <= minsSal;
    return currentMins >= minsEnt || currentMins <= minsSal; // Turno nocturno cruzando medianoche
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-6 relative">
      <HeaderKDS 
         user={user} onLogout={onLogout} filtroTab={filtroTab} setFiltroTab={setFiltroTab}
         setModalInsumo={setModalInsumo} setModalMerma={setModalMerma}
      />

      <GridPedidos 
         pedidosVisibles={pedidosVisibles} filtroTab={filtroTab} ahora={ahora}
         hayPedidoEnPreparacion={hayPedidoEnPreparacion} isSubmitting={isSubmitting}
         setModalAlerta={setModalAlerta} limpiarAlerta={limpiarAlerta}
         actualizarEstadoPedido={actualizarEstadoPedido} getCarrito={getCarrito}
         setPedidoParaAyudante={setPedidoParaAyudante} ayudantesActivos={ayudantesActivos}
      />

      {/* 👈 NUEVO: Modal de Asignación Rápida de Ayudantes */}
      {pedidoParaAyudante && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-slate-800 p-8 rounded-[40px] shadow-2xl w-full max-w-lg border border-slate-700 text-center">
            <h3 className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-3"><Users className="text-blue-500" size={32}/> ¿Quién tomará esta orden?</h3>
            <p className="text-slate-400 font-bold mb-8">Orden #{pedidoParaAyudante.numero_pedido} - Selecciona tu nombre para comenzar a prepararla.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Opción de usar el usuario principal logeado en la tablet */}
              <button 
                  onClick={() => actualizarEstadoPedido(pedidoParaAyudante, 'Preparando', user.id)}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-black py-6 rounded-2xl transition shadow-sm border border-slate-600 active:scale-95"
              >
                 {user.nombre} <span className="block text-[10px] text-slate-400 mt-1 uppercase tracking-widest">(Cuenta Principal)</span>
              </button>

              {ayudantesActivos.map(a => (
                 <button 
                    key={a.id} 
                    onClick={() => actualizarEstadoPedido(pedidoParaAyudante, 'Preparando', a.id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-2xl transition shadow-lg shadow-blue-500/20 active:scale-95"
                 >
                    {a.nombre}
                 </button>
              ))}
            </div>

            <button onClick={() => setPedidoParaAyudante(null)} className="text-slate-400 hover:text-white font-bold transition underline">Cancelar y Volver</button>
          </div>
        </div>
      )}

      {modalAlerta && (
         <ModalProblema 
            modalAlerta={modalAlerta} setModalAlerta={setModalAlerta}
            faltanteSelec={faltanteSelec} setFaltanteSelec={setFaltanteSelec}
            propuestaSelec={propuestaSelec} setPropuestaSelec={setPropuestaSelec}
            catalogoIngredientes={catalogoIngredientes} isSubmitting={isSubmitting} enviarAlerta={enviarAlerta}
         />
      )}

      {modalInsumo && <ModalSolicitarInsumo setModalInsumo={setModalInsumo} catalogoIngredientes={catalogoIngredientes} apiUrl={apiUrl} user={user} />}
      {modalMerma && <ModalReportarMerma setModalMerma={setModalMerma} catalogoIngredientes={catalogoIngredientes} apiUrl={apiUrl} refrescarDatos={cargarDatos} />}
    </div>
  );
};

export default Cocina;