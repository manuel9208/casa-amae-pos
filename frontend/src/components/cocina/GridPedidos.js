import React from 'react';
import { AlertTriangle, CheckCircle2, ChefHat, Lock } from 'lucide-react';

const GridPedidos = ({ 
  pedidosVisibles, filtroTab, ahora, isSubmitting, 
  setModalAlerta, limpiarAlerta, actualizarEstadoPedido, getCarrito,
  trabajadorActivoId, obtenerOrdenActivaDeTrabajador, obtenerNombreTrabajadorActivo 
}) => {

  if (pedidosVisibles.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-800 rounded-[40px] border border-slate-700 border-dashed max-w-xl mx-auto mt-10">
        <ChefHat size={64} className="text-slate-600 mx-auto mb-4 opacity-40 animate-pulse"/>
        <p className="text-xl font-black text-slate-400">Sin comandas activas</p>
        <p className="text-sm font-medium text-slate-500 mt-1">Los pedidos nuevos del kiosco aparecerán aquí.</p>
      </div>
    );
  }

  // Verificar si el trabajador seleccionado en la barra superior tiene trabajo pendiente
  const ordenPendienteDelActivo = obtenerOrdenActivaDeTrabajador(trabajadorActivoId);
  const trabajadorEstaOcupado = !!ordenPendienteDelActivo;
  const nombreDelActivo = obtenerNombreTrabajadorActivo();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {pedidosVisibles.map(p => {
        const carritoArray = getCarrito(p);
        const itemsDeEstaArea = carritoArray.filter(i => filtroTab === 'Todo' || i.destino === filtroTab);
        const areaEstado = itemsDeEstaArea.every(i => i.estado === 'Listo') ? 'Listo' : itemsDeEstaArea.some(i => i.estado === 'Preparando' || i.estado === 'Listo') ? 'Preparando' : 'Pagado';

        const itemsAgrupados = [];
        carritoArray.forEach((item, idx) => {
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

        let minsTranscurridos = 0;
        if (p.tiempo_inicio_preparacion) {
            const timeString = String(p.tiempo_inicio_preparacion).replace(' ', 'T');
            const inicioPrep = new Date(timeString).getTime();
            if (!isNaN(inicioPrep)) {
                minsTranscurridos = Math.max(0, Math.floor((ahora - inicioPrep) / 60000));
            }
        }

        let colorBorde = 'border-slate-700'; let shadow = '';
        if (areaEstado === 'Preparando') {
           if (minsTranscurridos > maxTiempo + 5) { colorBorde = 'border-red-500'; shadow = 'shadow-[0_0_20px_rgba(239,68,68,0.3)]'; } 
           else if (minsTranscurridos > maxTiempo) { colorBorde = 'border-orange-500'; shadow = 'shadow-[0_0_20px_rgba(249,115,22,0.3)]'; } 
           else { colorBorde = 'border-blue-600'; shadow = 'shadow-[0_0_15px_rgba(37,99,235,0.2)]'; } 
        }
        if (p.alerta_cocina) { colorBorde = 'border-red-500'; shadow = ''; } 
        
        const fechaHora = new Date(p.fecha_creacion).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const mensajeVisible = p.alerta_cocina ? p.alerta_cocina.replace(/\[IDX:\d+\]\s*/g, '') : '';

        // Determinar si esta comanda específica pertenece al trabajador seleccionado
        const esMiComanda = p.chef_id === trabajadorActivoId && areaEstado === 'Preparando';

        return (
          <div key={p.id} className={`bg-slate-800 rounded-[30px] p-6 border-2 flex flex-col transition-all duration-300 ${colorBorde} ${shadow}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                  <h2 className="text-4xl font-black text-white">#{p.numero_pedido}</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{p.tipo_consumo}</p>
                  {p.mesa && <p className="text-[10px] font-black text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-900/50 mt-1 w-fit">📍 MESA {p.mesa}</p>}
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
                  <button onClick={() => limpiarAlerta(p.id)} className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-xl transition flex justify-center items-center gap-2 shadow-md shadow-red-500/20"><CheckCircle2 size={18}/> Aceptar y Continuar</button>
                )}
              </div>
            )}

            <div className="space-y-4 flex-1">
              {itemsAgrupados.map((item, idx) => (
                <div key={idx} className="bg-slate-900 p-4 rounded-2xl border border-slate-700 shadow-inner">
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
                    <button onClick={() => setModalAlerta({ pedido: p, item })} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition border border-slate-700 flex items-center justify-center gap-2">⚠️ Reportar Faltante</button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-6 mt-4 border-t border-slate-700">
              {areaEstado === 'Pagado' || !areaEstado ? (
                <button 
                  onClick={() => actualizarEstadoPedido(p, 'Preparando', trabajadorActivoId)}
                  disabled={trabajadorEstaOcupado || isSubmitting}
                  className={`w-full py-4 rounded-2xl font-black text-sm transition duration-200 flex flex-col items-center justify-center gap-0.5 ${
                    trabajadorEstaOcupado 
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-base">
                    {trabajadorEstaOcupado ? <Lock size={16}/> : <ChefHat size={18}/>}
                    <span>{trabajadorEstaOcupado ? 'Empleado Ocupado' : 'Preparar mi parte'}</span>
                  </div>
                  {trabajadorEstaOcupado && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {nombreDelActivo} tiene la orden #{ordenPendienteDelActivo.numero_pedido}
                    </span>
                  )}
                </button>
              ) : areaEstado === 'Preparando' ? (
                <button 
                  disabled={!esMiComanda || !!p.alerta_cocina || isSubmitting} 
                  onClick={() => actualizarEstadoPedido(p, 'Listo')} 
                  className={`w-full py-4 rounded-2xl font-black text-lg transition flex items-center justify-center gap-2 ${
                    esMiComanda 
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-700 text-slate-500 border border-slate-600 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 size={20}/> 
                  <span>{esMiComanda ? 'Terminar mi parte' : 'Asignado a otro ayudante'}</span>
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GridPedidos;