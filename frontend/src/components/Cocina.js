import React, { useState, useEffect } from 'react';
import { LogOut, AlertTriangle, CheckCircle2, ChefHat } from 'lucide-react';

const Cocina = ({ user, onLogout }) => {
  const [pedidos, setPedidos] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [filtroTab, setFiltroTab] = useState('Todo'); 
  const [ahora, setAhora] = useState(Date.now());
  
  const [modalAlerta, setModalAlerta] = useState(null); 
  const [faltanteSelec, setFaltanteSelec] = useState('');
  const [propuestaSelec, setPropuestaSelec] = useState('');
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    fetch(`${apiUrl}/ingredientes`).then(r=>r.json()).then(data => setCatalogoIngredientes(Array.isArray(data) ? data : []));
    const cargarPedidos = async () => {
      try {
        const res = await fetch(`${apiUrl}/pedidos/hoy`);
        const data = await res.json();
        setPedidos(Array.isArray(data) ? data : []);
      } catch (error) { console.error('Error al cargar pedidos'); }
    };
    cargarPedidos(); 
    const intervalo = setInterval(cargarPedidos, 3000); 
    const timerReloj = setInterval(() => setAhora(Date.now()), 1000); 
    return () => { clearInterval(intervalo); clearInterval(timerReloj); };
  }, [apiUrl]);

  const actualizarEstadoPedido = async (p, nuevoEstadoLocal) => {
    const area = filtroTab;
    
    const nuevoCarrito = (p.carrito || []).map(item => {
      if (area === 'Todo' || item.destino === area) {
        return { ...item, estado: nuevoEstadoLocal };
      }
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
      if (res.ok) {
        const resPedidos = await fetch(`${apiUrl}/pedidos/hoy`);
        const data = await resPedidos.json();
        setPedidos(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (error) { alert('Error de conexión con el servidor.'); }
  };

  const enviarAlerta = async (e) => {
    e.preventDefault();
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
  };

  const limpiarAlerta = async (id) => {
    try { await fetch(`${apiUrl}/pedidos/${id}/alerta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: null }) }); } catch (error) {}
  };

  const pedidosVisibles = pedidos.filter(p => {
    if (p.estado_preparacion === 'Entregado' || p.estado_preparacion === 'Cancelado' || p.estado_preparacion === 'Pendiente') return false;
    
    const itemsDeEstaArea = p.carrito?.filter(i => filtroTab === 'Todo' || i.destino === filtroTab) || [];
    if (itemsDeEstaArea.length === 0) return false;

    const estaAreaLista = itemsDeEstaArea.every(i => i.estado === 'Listo');
    if (estaAreaLista) return false;

    return true;
  });

  const hayPedidoEnPreparacion = pedidosVisibles.some(p => {
    const itemsArea = p.carrito?.filter(i => filtroTab === 'Todo' || i.destino === filtroTab) || [];
    if (itemsArea.length === 0) return false;
    const estadoDeEstaArea = itemsArea.every(i => i.estado === 'Listo') ? 'Listo' : itemsArea.some(i => i.estado === 'Preparando' || i.estado === 'Listo') ? 'Preparando' : 'Pagado';
    return estadoDeEstaArea === 'Preparando';
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-6">
      <div className="flex items-center justify-between bg-slate-800 p-4 rounded-3xl shadow-md border border-slate-700 mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500 p-3 rounded-xl"><ChefHat size={28} className="text-white" /></div>
          <div><h1 className="text-xl font-black text-white leading-tight">KDS - Monitor</h1><p className="text-xs font-bold text-orange-400">Chef: {user.nombre}</p></div>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-xl">
          {['Todo', 'Cocina', 'Barra'].map(tab => (
            <button key={tab} onClick={() => setFiltroTab(tab)} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${filtroTab === tab ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
              {tab === 'Cocina' && <ChefHat size={16} className="inline mr-2"/>}{tab === 'Barra' && <span className="inline mr-2">☕</span>}{tab}
            </button>
          ))}
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-900 px-6 py-3 rounded-xl font-bold transition border border-slate-700"><LogOut size={18}/> Salir</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {pedidosVisibles.map(p => {
          const itemsDeEstaArea = p.carrito?.filter(i => filtroTab === 'Todo' || i.destino === filtroTab) || [];
          const areaEstado = itemsDeEstaArea.every(i => i.estado === 'Listo') ? 'Listo' : itemsDeEstaArea.some(i => i.estado === 'Preparando' || i.estado === 'Listo') ? 'Preparando' : 'Pagado';

          const itemsAgrupados = [];
          (p.carrito || []).forEach((item, idx) => {
              if (filtroTab !== 'Todo' && item.destino !== filtroTab) return;
              const getExtrasStr = (extras) => (extras||[]).map(e => e.nombre).sort().join('|');
              const extStr = getExtrasStr(item.extras);
              const existente = itemsAgrupados.find(i => i.nombre === item.nombre && getExtrasStr(i.extras) === extStr);
              if (existente) {
                  existente.cantidad_visual += 1;
                  existente.indices.push(idx);
              } else {
                  itemsAgrupados.push({ ...item, cantidad_visual: 1, indices: [idx] });
              }
          });
          
          const maxTiempo = Math.max(...itemsDeEstaArea.map(i => Number(i.tiempo_preparacion) || 15));

          // 👇 LA MAGIA DEL TIEMPO: Forzamos la zona horaria a UTC para que coincida con la base de datos
          let minsTranscurridos = 0;
          if (p.tiempo_inicio_preparacion) {
              // Convertimos la cadena de tiempo que viene de la base de datos a un objeto de Fecha.
              // Si la cadena no termina en 'Z' (que indica UTC), se la añadimos para asegurar que 
              // el navegador no intente aplicar la zona horaria local incorrectamente.
              const timeString = p.tiempo_inicio_preparacion.endsWith('Z') ? p.tiempo_inicio_preparacion : `${p.tiempo_inicio_preparacion}Z`;
              const inicioPrep = new Date(timeString).getTime();
              
              // Usamos Math.max para asegurarnos de que nunca dé números negativos (-420)
              // si hay una ligera desincronización de milisegundos entre el servidor y el cliente.
              minsTranscurridos = Math.max(0, Math.floor((ahora - inicioPrep) / 60000));
          }

          let colorBorde = 'border-slate-700'; let shadow = '';
          if (areaEstado === 'Preparando') {
             if (minsTranscurridos > maxTiempo + 5) { colorBorde = 'border-red-500'; shadow = 'shadow-[0_0_20px_rgba(239,68,68,0.3)]'; } 
             else if (minsTranscurridos > maxTiempo) { colorBorde = 'border-orange-500'; shadow = 'shadow-[0_0_20px_rgba(249,115,22,0.3)]'; } 
             else { colorBorde = 'border-blue-600'; shadow = 'shadow-[0_0_15px_rgba(37,99,235,0.2)]'; } 
          }
          if (p.alerta_cocina) { colorBorde = 'border-red-500'; shadow = ''; } 
          
          // Corrección visual de la hora para que sí respete la zona de México
          const fechaHora = new Date(p.fecha_creacion).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

          const mensajeVisible = p.alerta_cocina ? p.alerta_cocina.replace(/\[IDX:\d+\]\s*/g, '') : '';

          return (
            <div key={p.id} className={`bg-slate-800 rounded-[30px] p-6 border-2 flex flex-col transition-all ${colorBorde} ${shadow}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-4xl font-black text-white">#{p.numero_pedido}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{p.tipo_consumo}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Hora</p>
                    <p className="text-sm font-bold text-slate-300">{fechaHora}</p>
                    {areaEstado === 'Preparando' && (
                        <p className={`text-xs font-black mt-1 ${minsTranscurridos > maxTiempo ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>⏱️ {minsTranscurridos} / {maxTiempo}m</p>
                    )}
                </div>
              </div>

              {p.alerta_cocina && (
                <div className="bg-red-900/40 border border-red-500/50 p-4 rounded-2xl mb-6">
                  <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1"><AlertTriangle size={14}/> {mensajeVisible.includes('CAJA RESPONDE:') ? 'Respuesta de Caja' : 'Esperando a Caja...'}</p>
                  <p className="text-sm font-medium text-red-100">{mensajeVisible}</p>
                  {mensajeVisible.includes('CAJA RESPONDE:') && (
                    <button onClick={() => limpiarAlerta(p.id)} className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-xl transition flex justify-center items-center gap-2"><CheckCircle2 size={18}/> Aceptar y Continuar</button>
                  )}
                </div>
              )}

              <div className="space-y-4 flex-1">
                {itemsAgrupados.map((item, idx) => (
                  <div key={idx} className="bg-slate-900 p-4 rounded-2xl border border-slate-700">
                    <p className="text-xl font-black text-white mb-2">
                        {item.cantidad_visual > 1 && <span className="text-blue-400 mr-2">{item.cantidad_visual}x</span>}{item.nombre}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.extras?.map((e, i) => (
                         <span key={i} className={`text-xs font-bold px-2 py-1 rounded-md ${e.nombre.startsWith('Sin ') ? 'bg-red-900/50 text-red-300 line-through' : e.nombre.startsWith('📝') ? 'bg-slate-800 text-slate-300 italic border border-slate-600 w-full mt-1' : e.nombre.startsWith('🔸') ? 'bg-blue-900/50 text-blue-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                           {e.nombre.startsWith('🔸') && <span className="text-[10px] text-blue-500 mr-1">♦</span>} {e.nombre.replace('🔸 ', '')}
                         </span>
                       ))}
                    </div>
                    {(areaEstado === 'Preparando' || areaEstado === 'Pagado') && !p.alerta_cocina && (
                      <button onClick={() => setModalAlerta({ pedido: p, item })} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition border border-slate-700 flex items-center justify-center gap-2">⚠️ Reportar Problema</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-6 mt-4 border-t border-slate-700">
                {areaEstado === 'Pagado' || !areaEstado ? (
                  <button 
                    onClick={() => actualizarEstadoPedido(p, 'Preparando')} 
                    disabled={hayPedidoEnPreparacion}
                    className={`w-full py-4 rounded-2xl font-black text-lg transition flex items-center justify-center gap-2 ${hayPedidoEnPreparacion ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'}`}
                  >
                    <ChefHat size={20}/> 
                    {hayPedidoEnPreparacion ? 'Termina tu pedido actual' : 'Preparar mi parte'}
                  </button>
                ) : areaEstado === 'Preparando' ? (
                  <button onClick={() => actualizarEstadoPedido(p, 'Listo')} disabled={!!p.alerta_cocina} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-2xl font-black text-lg transition disabled:opacity-30 flex items-center justify-center gap-2"><CheckCircle2 size={20}/> Terminar mi parte</button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {modalAlerta && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-[40px] shadow-2xl w-full max-w-xl border border-slate-700">
            <h3 className="text-2xl font-black text-white mb-2">Reportar en {modalAlerta.item.nombre}</h3>
            <p className="text-slate-400 font-bold mb-6 text-sm">Resuelve rápido con 3 toques</p>
            <div className="space-y-6">
              
              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-700">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">1. ¿Qué se terminó?</p>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const removidos = (modalAlerta.item.extras || [])
                        .filter(e => e.nombre.startsWith('Sin '))
                        .map(e => e.nombre.replace('Sin ', ''));

                    const basesDelPlatillo = (modalAlerta.item.opciones || [])
                        .filter(o => o.tipo === 'base' && !removidos.includes(o.nombre));
                    
                    const opciones = [{ id: 'platillo_completo', nombre: `Todo el platillo (${modalAlerta.item.nombre})` }, ...basesDelPlatillo];
                    
                    return opciones.map((b, idx) => (
                      <button key={idx} onClick={() => setFaltanteSelec(b.nombre)} className={`px-4 py-3 rounded-xl font-bold text-sm transition border ${faltanteSelec === b.nombre ? 'bg-red-500 text-white border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>{b.nombre}</button>
                    ));
                  })()}
                </div>
              </div>

              {faltanteSelec && (
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-700 animate-in fade-in">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">2. ¿Qué propones?</p>
                  <div className="flex flex-wrap gap-2">
                    {faltanteSelec.startsWith('Todo el platillo') ? (
                      <>
                        <button onClick={() => setPropuestaSelec('Cancelar este platillo')} className={`px-4 py-3 rounded-xl font-bold text-sm transition border ${propuestaSelec === 'Cancelar este platillo' ? 'bg-orange-500 text-white border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>Cancelar este platillo</button>
                        <button onClick={() => setPropuestaSelec('Que el cliente elija otra cosa')} className={`px-4 py-3 rounded-xl font-bold text-sm transition border ${propuestaSelec === 'Que el cliente elija otra cosa' ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>Que el cliente pida otra cosa</button>
                      </>
                    ) : (
                      <>
                        {(() => {
                          const opcionesCatalogo = catalogoIngredientes.filter(i => i.clasificacion_nombre === modalAlerta.item.categoria && i.tipo === 'base');
                          const opcionesPlatillo = modalAlerta.item.opciones?.filter(o => o.tipo === 'base') || [];
                          
                          const propuestasMap = new Map();
                          opcionesCatalogo.forEach(o => propuestasMap.set(o.nombre, o.nombre));
                          opcionesPlatillo.forEach(o => propuestasMap.set(o.nombre, o.nombre));
                          
                          propuestasMap.delete(faltanteSelec);
                          
                          const propuestas = Array.from(propuestasMap.values());
                          
                          return propuestas.map(nombrePropuesta => (
                            <button key={nombrePropuesta} onClick={() => setPropuestaSelec(nombrePropuesta)} className={`px-4 py-3 rounded-xl font-bold text-sm transition border ${propuestaSelec === nombrePropuesta ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>
                              {nombrePropuesta}
                            </button>
                          ));
                        })()}
                        <button onClick={() => setPropuestaSelec('Solo quitarlo')} className={`px-4 py-3 rounded-xl font-bold text-sm transition border ${propuestaSelec === 'Solo quitarlo' ? 'bg-orange-500 text-white border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}>Solo prepararlo sin {faltanteSelec}</button>
                      </>
                    )}
                  </div>
                </div>
              )}

            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => {setModalAlerta(null); setFaltanteSelec(''); setPropuestaSelec('');}} className="flex-1 py-4 bg-slate-700 text-white font-black rounded-2xl hover:bg-slate-600 transition">Cancelar</button>
              <button onClick={enviarAlerta} disabled={!faltanteSelec || !propuestaSelec} className="flex-[2] py-4 bg-red-600 text-white font-black text-lg rounded-2xl hover:bg-red-500 disabled:opacity-30 transition shadow-[0_0_15px_rgba(220,38,38,0.3)]">3. Enviar a Caja</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Cocina;