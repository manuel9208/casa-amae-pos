import React, { useState, useEffect, useCallback } from 'react';
import HeaderKDS from './cocina/HeaderKDS';
import GridPedidos from './cocina/GridPedidos';
import ModalProblema from './cocina/ModalProblema';
import ModalSolicitarInsumo from './cocina/ModalSolicitarInsumo';
import ModalReportarMerma from './cocina/ModalReportarMerma';
import { Users, UserCheck } from 'lucide-react';

const Cocina = ({ user, onLogout }) => {
  const [pedidos, setPedidos] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [ayudantes, setAyudantes] = useState([]); 
  const [filtroTab, setFiltroTab] = useState('Todo'); 
  const [ahora, setAhora] = useState(Date.now());
  
  // 🆕 Identificador del trabajador seleccionado actualmente en la pantalla táctil
  const [trabajadorActivoId, setTrabajadorActivoId] = useState(user.id);

  const [modalAlerta, setModalAlerta] = useState(null); 
  const [faltanteSelec, setFaltanteSelec] = useState('');
  const [propuestaSelec, setPropuestaSelec] = useState('');

  const [modalInsumo, setModalInsumo] = useState(false);
  const [modalMerma, setModalMerma] = useState(false);

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

    // Se asigna automáticamente el trabajador seleccionado de la barra global
    const chefResponsable = idAyudanteAsignado || trabajadorActivoId;

    try {
      const res = await fetch(`${apiUrl}/pedidos/${p.id}/estado`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ estado_preparacion: estadoGlobal, chef_id: chefResponsable, carrito: nuevoCarrito }) 
      });
      if (res.ok) { 
        await fetch(`${apiUrl}/pedidos/hoy`).then(r=>r.json()).then(data => setPedidos(Array.isArray(data)?data:[]));
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

  // Filtrar ayudantes por su turno activo
  const ayudantesActivos = ayudantes.filter(a => {
    if (!a.permisos || !a.permisos.horario_entrada || !a.permisos.horario_salida) return true;
    const date = new Date();
    const currentMins = date.getHours() * 60 + date.getMinutes();
    
    const [hEnt, mEnt] = a.permisos.horario_entrada.split(':').map(Number);
    const [hSal, mSal] = a.permisos.horario_salida.split(':').map(Number);
    const minsEnt = hEnt * 60 + mEnt;
    const minsSal = hSal * 60 + mSal;
    
    if (minsEnt <= minsSal) return currentMins >= minsEnt && currentMins <= minsSal;
    return currentMins >= minsEnt || currentMins <= minsSal; 
  });

  // Helper para saber qué trabajador tiene actualmente una comanda en preparación
  const obtenerOrdenActivaDeTrabajador = (id) => {
    return pedidos.find(p => p.chef_id === id && p.estado_preparacion === 'Preparando');
  };

  // Obtener el nombre del usuario seleccionado para mostrarlo en la interfaz
  const obtenerNombreTrabajadorActivo = () => {
    if (trabajadorActivoId === user.id) return user.nombre;
    const ayudante = ayudantes.find(a => a.id === trabajadorActivoId);
    return ayudante ? ayudante.nombre : user.nombre;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-6 relative pb-32">
      <HeaderKDS 
         user={user} onLogout={onLogout} filtroTab={filtroTab} setFiltroTab={setFiltroTab}
         setModalInsumo={setModalInsumo} setModalMerma={setModalMerma}
      />

      {/* 🆕 BARRA DE SELECCIÓN DE PERSONAL EN TURNO (Estilo Apple Táctil) */}
      <div className="bg-slate-800 border border-slate-700/60 p-4 rounded-3xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2 text-slate-300">
          <Users size={18} className="text-blue-400"/>
          <span className="text-sm font-black uppercase tracking-wider">Línea de Producción:</span>
          <span className="text-xs bg-slate-900 text-emerald-400 px-3 py-1 rounded-full font-bold border border-slate-700 flex items-center gap-1">
             <UserCheck size={12}/> Preparando ahora: {obtenerNombreTrabajadorActivo()}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Botón del Chef Principal: Se muestra siempre como respaldo operativo o si no hay ayudantes */}
          <button
            onClick={() => setTrabajadorActivoId(user.id)}
            className={`flex-1 md:flex-none px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border flex flex-col items-center justify-center min-w-[120px] ${
              trabajadorActivoId === user.id 
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>👨‍🍳 {user.nombre}</span>
            {obtenerOrdenActivaDeTrabajador(user.id) && (
              <span className="text-[9px] bg-red-900/60 text-red-300 px-1.5 rounded-md mt-0.5 font-bold animate-pulse">Ocupado #{obtenerOrdenActivaDeTrabajador(user.id).numero_pedido}</span>
            )}
          </button>

          {/* Botones Dinámicos de los Ayudantes en su Horario Activo */}
          {ayudantesActivos.map(a => {
            const ordenActiva = obtenerOrdenActivaDeTrabajador(a.id);
            const estaSeleccionado = trabajadorActivoId === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setTrabajadorActivoId(a.id)}
                className={`flex-1 md:flex-none px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border flex flex-col items-center justify-center min-w-[120px] ${
                  estaSeleccionado 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🔪 {a.nombre}</span>
                {ordenActiva && (
                  <span className="text-[9px] bg-red-900/60 text-red-300 px-1.5 rounded-md mt-0.5 font-bold animate-pulse">Ocupado #{ordenActiva.numero_pedido}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <GridPedidos 
         pedidosVisibles={pedidosVisibles} filtroTab={filtroTab} ahora={ahora}
         isSubmitting={isSubmitting} setModalAlerta={setModalAlerta} limpiarAlerta={limpiarAlerta}
         actualizarEstadoPedido={actualizarEstadoPedido} getCarrito={getCarrito}
         trabajadorActivoId={trabajadorActivoId} obtenerOrdenActivaDeTrabajador={obtenerOrdenActivaDeTrabajador}
         obtenerNombreTrabajadorActivo={obtenerNombreTrabajadorActivo}
      />

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