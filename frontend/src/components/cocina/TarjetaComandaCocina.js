import React from 'react';
import { ChefHat, CheckCircle2, AlertTriangle, Users, Play, Clock } from 'lucide-react';  

const TarjetaComandaCocina = ({
    pedido, index = 0, getCarrito, filtroTab, ahora, isSubmitting,
    setModalAlerta, limpiarAlerta, ayudanteSeleccionado,
    obtenerNombreTrabajadorActivo, procesarAccionItems, produccionEnVivo = {}
}) => {
    
    const carritoArray = getCarrito(pedido);
    
    // Obtenemos solo los ítems que corresponden a la pestaña activa (Cocina o Barra)
    const itemsDeMiArea = carritoArray.filter(i => filtroTab === 'Todo' || i.destino === filtroTab);

    // 👇 FASE 5: Tiempo real de la comanda
    // Si hay 1 solo platillo -> se usa su propio tiempo. Si hay 2+ -> se calcula por
    // Estación (tiempo base del más lento + penalización de saturación), y el total
    // de la comanda es el MÁXIMO entre todas las estaciones involucradas (trabajan en paralelo).
    let maxTiempo;
    if (itemsDeMiArea.length <= 1) {
        maxTiempo = Number(itemsDeMiArea[0]?.tiempo_preparacion) || 15;
    } else {
        const basePorEstacion = {};
        itemsDeMiArea.forEach(item => {
            const cat = item.categoria || 'General';
            const tBase = Number(item.tiempo_preparacion) || 15;
            if (!basePorEstacion[cat] || tBase > basePorEstacion[cat]) basePorEstacion[cat] = tBase;
        });

        maxTiempo = 0;
        Object.keys(basePorEstacion).forEach(cat => {
            let tiempoFinal = basePorEstacion[cat];
            const info = produccionEnVivo[cat];
            if (info && info.capacidad_maxima_paralela > 0) {
                const unidades = Number(info.unidades_en_cola) || 0;
                if (unidades > info.capacidad_maxima_paralela) {
                    const tandas = Math.floor(unidades / info.capacidad_maxima_paralela);
                    tiempoFinal += tandas * (Number(info.ventana_minutos) || basePorEstacion[cat]);
                }
            }
            if (tiempoFinal > maxTiempo) maxTiempo = tiempoFinal;
        });
    }

    let minsTranscurridos = 0;
    // 🛡️ FIX: Ya NO exigimos que el ítem siga "Preparando" ahora mismo. Si un platillo
    // ya se marcó "Listo" pero otro de la misma comanda sigue pendiente/preparando,
    // el cronómetro de la comanda NO debe congelarse — debe seguir contando desde que
    // el PRIMER platillo de la orden empezó a prepararse, hasta que la comanda completa
    // desaparezca del tablero (cuando TODOS los ítems estén Listo/Finalizado).
    const itemsConInicio = itemsDeMiArea.filter(i => i.tiempo_inicio);
    if (itemsConInicio.length > 0) {
        const inicios = itemsConInicio
            .map(i => new Date(String(i.tiempo_inicio).replace(' ', 'T')).getTime())
            .filter(t => !isNaN(t));
        if (inicios.length > 0) {
            const inicioMasAntiguo = Math.min(...inicios);
            minsTranscurridos = Math.max(0, Math.floor((ahora - inicioMasAntiguo) / 60000));
        }
    }

    let colorBorde = 'border-slate-700'; let shadow = '';
    if (pedido.estado_preparacion === 'Preparando') {
        if (minsTranscurridos > maxTiempo + 5) { colorBorde = 'border-red-500'; shadow = 'shadow-[0_0_20px_rgba(239,68,68,0.3)]'; }
        else if (minsTranscurridos > maxTiempo) { colorBorde = 'border-orange-500'; shadow = 'shadow-[0_0_20px_rgba(249,115,22,0.3)]'; }
        else { colorBorde = 'border-blue-600'; shadow = 'shadow-[0_0_15px_rgba(37,99,235,0.2)]'; }
    }
    if (pedido.alerta_cocina) { colorBorde = 'border-red-500'; shadow = ''; }  

    // 👇 FIX: Mayor contraste entre comandas alternadas (Ámbar vs Rose, más distintos entre sí que Orange vs Red)
    const fondoComanda = index % 2 === 0
        ? 'bg-gradient-to-b from-amber-700 to-amber-900'
        : 'bg-gradient-to-b from-red-800 to-red-950';

    // 👇 NUEVO: Insignia de alerta de tiempo, independiente del color de fondo de la tarjeta.
    // Se activa solo cuando el pedido está "Preparando" y ya rebasó su tiempo máximo.
    const excesoMin = pedido.estado_preparacion === 'Preparando' ? (minsTranscurridos - maxTiempo) : 0;
    const estaMuyTarde = excesoMin > 0;

    // 👇 NUEVO: Tiempo de ESPERA (pedidos que aún no empiezan a prepararse).
    // Antes era un punto ciego total: un pedido "Pendiente" se veía igual de urgente
    // sin importar si llevaba 2 o 300 minutos esperando. Ahora se mide desde fecha_creacion.
    let minsEspera = 0;
    const inicioEsperaMs = new Date(pedido.fecha_creacion).getTime();
    if (!isNaN(inicioEsperaMs)) {
        minsEspera = Math.max(0, Math.floor((ahora - inicioEsperaMs) / 60000));
    }
    const UMBRAL_ESPERA_ALERTA = 10; // minutos fijos por ahora (configurable en una fase futura)
    const aunNoInicia = pedido.estado_preparacion !== 'Preparando';
    const estaEsperandoMucho = aunNoInicia && minsEspera > UMBRAL_ESPERA_ALERTA;

    const fechaHora = new Date(pedido.fecha_creacion).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const mensajeVisible = pedido.alerta_cocina ? pedido.alerta_cocina.replace(/\[IDX:\d+\]\s*/g, '') : '';  

    // Acciones Masivas (Para acelerar si el pedido es chiquito y lo haré yo solo)
    const tomarTodosLosPendientes = () => {
        const indices = [];
        carritoArray.forEach((item, idx) => {
            if ((!item.estado || item.estado === 'Pendiente') && (filtroTab === 'Todo' || item.destino === filtroTab)) {
                indices.push(idx);
            }
        });
        if(indices.length > 0) procesarAccionItems(pedido, indices, 'Preparar', ayudanteSeleccionado);
    };

    return (
        <div className={`relative ${fondoComanda} rounded-[32px] p-6 border-2 flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-4 ${colorBorde} ${shadow}`}>
            
            {/* 👇 INSIGNIA DE ALERTA DE TIEMPO DE PREPARACIÓN (Parpadeante, flotante) */}
            {estaMuyTarde && (
                <div className="absolute -top-4 -right-4 z-20 animate-pulse">
                    <div className="bg-red-600 border-4 border-slate-950 text-white rounded-full w-16 h-16 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.9)]">
                        <AlertTriangle size={16} className="mb-0.5" />
                        <span className="text-[11px] font-black leading-none">+{excesoMin}m</span>
                    </div>
                </div>
            )}

            {/* 👇 NUEVA INSIGNIA: ALERTA DE ESPERA (pedido Pendiente que lleva demasiado sin tomarse) */}
            {estaEsperandoMucho && (
                <div className="absolute -top-4 -left-4 z-20 animate-pulse">
                    <div className="bg-amber-500 border-4 border-slate-950 text-white rounded-full w-16 h-16 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.9)]">
                        <Clock size={16} className="mb-0.5" />
                        <span className="text-[11px] font-black leading-none">{minsEspera}m</span>
                    </div>
                </div>
            )}

            {/* ENCABEZADO DE TARJETA */}
            <div className="flex justify-between items-start mb-5 border-b border-slate-700/50 pb-4 shrink-0">
                <div>
                    <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight">#{pedido.numero_pedido}</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-black bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm">
                            {pedido.tipo_consumo}
                        </span>
                        {pedido.mesa && (
                            <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm">
                                📍 Mesa {pedido.mesa}
                            </span>
                        )}
                    </div>
                </div>
                    <div className="text-right">
                        <p className="text-[10px] text-white/70 font-black uppercase tracking-widest">Hora</p>
                        <p className="text-sm font-black text-white">{fechaHora}</p>
                        {pedido.estado_preparacion === 'Preparando' ? (
                            <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-1 rounded-lg ${minsTranscurridos > maxTiempo ? 'bg-red-950/60 border border-red-400/40' : 'bg-slate-950/40 border border-white/10'}`}>
                                <span className={`text-[11px] font-black ${minsTranscurridos > maxTiempo ? 'text-red-300 animate-pulse' : 'text-cyan-300'}`}>
                                    ⏱️ {minsTranscurridos} / {maxTiempo}m
                                </span>
                            </div>
                        ) : (
                            <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-1 rounded-lg ${estaEsperandoMucho ? 'bg-amber-950/60 border border-amber-400/40' : 'bg-slate-950/40 border border-white/10'}`}>
                                <span className={`text-[11px] font-black ${estaEsperandoMucho ? 'text-amber-300 animate-pulse' : 'text-slate-300'}`}>
                                    ⏳ Esperando: {minsEspera}m
                                </span>
                            </div>
                        )}
                    </div>
            </div>  

            {/* ALERTA DE CAJA */}
            {pedido.alerta_cocina && (
                <div className="bg-red-900/40 border border-red-500/50 p-4 rounded-2xl mb-5 shrink-0">
                    <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1"><AlertTriangle size={14}/> {mensajeVisible.includes('CAJA RESPONDE:') ? 'Respuesta de Caja' : 'Esperando a Caja...'}</p>
                    <p className="text-sm font-medium text-red-100">{mensajeVisible}</p>
                    {mensajeVisible.includes('CAJA RESPONDE:') && (
                        <button onClick={() => limpiarAlerta(pedido.id)} className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white font-black py-2.5 rounded-xl transition flex justify-center items-center gap-2 shadow-md shadow-red-500/20"><CheckCircle2 size={16}/> Aceptar</button>
                    )}
                </div>
            )}    

            {/* 👇 LISTADO GRANULAR DE PLATILLOS CON MEJORA VISUAL */}
            <div className="space-y-4 flex-1 mb-6 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                {carritoArray.map((item, originalIdx) => {
                    if (filtroTab !== 'Todo' && item.destino !== filtroTab) return null;
                    if (item.estado === 'Listo' || item.estado === 'Finalizado') return null;

                    const estadoItem = item.estado || 'Pendiente';
                    const loEstoyHaciendoYo = String(item.chef_id) === String(ayudanteSeleccionado);
                    const loHaceOtro = estadoItem === 'Preparando' && !loEstoyHaciendoYo;

                    // 👇 NUEVO: El badge deja de ser una etiqueta fija. Si el platillo ya está
                    // en "Preparando", cuenta en vivo desde item.tiempo_inicio (dato que ya se
                    // guarda en Cocina.js al presionar "Preparar"/"Ayudar") contra el tiempo
                    // configurado al dar de alta el producto (item.tiempo_preparacion).
                    const tiempoConfiguradoItem = Number(item.tiempo_preparacion) || 15;
                    let minsItemActivo = 0;
                    let itemEnVivo = false;
                    if (estadoItem === 'Preparando' && item.tiempo_inicio) {
                        const inicioItemMs = new Date(String(item.tiempo_inicio).replace(' ', 'T')).getTime();
                        if (!isNaN(inicioItemMs)) {
                            minsItemActivo = Math.max(0, Math.floor((ahora - inicioItemMs) / 60000));
                            itemEnVivo = true;
                        }
                    }
                    const itemVaTarde = itemEnVivo && minsItemActivo > tiempoConfiguradoItem;

                    return (
                        <div key={originalIdx} className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-700/50 flex flex-col gap-4 shadow-sm">
                            
                            {/* Información del Platillo Más Grande */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-2">
                                    <p className={`text-lg md:text-xl font-black leading-tight ${estadoItem === 'Preparando' ? 'text-white' : 'text-slate-300'}`}>
                                        {item.cantidad > 1 && <span className="text-blue-400 mr-2">{item.cantidad}x</span>}
                                        {item.nombre}
                                    </p>
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border shrink-0 ${itemEnVivo ? (itemVaTarde ? 'bg-red-900/60 text-red-300 border-red-700 animate-pulse' : 'bg-cyan-900/40 text-cyan-300 border-cyan-700') : 'bg-slate-700/60 text-slate-300 border-slate-600'}`}>
                                        <Clock size={11} /> {itemEnVivo ? `${minsItemActivo} / ${tiempoConfiguradoItem} min` : `${tiempoConfiguradoItem} min`}
                                    </span>
                                </div>
                                
                                {item.extras && item.extras.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {item.extras.map((e, i) => {
                                            const esSin = e.nombre.toLowerCase().startsWith('sin ');
                                            return (
                                                <span key={i} className={`inline-block text-xs md:text-sm font-black px-3 py-1.5 rounded-lg border shadow-sm ${esSin ? 'bg-red-900/50 text-red-300 line-through border-red-800' : e.nombre.startsWith('📝') ? 'bg-slate-800 text-slate-300 italic border-slate-600' : 'bg-emerald-900/50 text-emerald-300 border-emerald-800'}`}>
                                                    {e.nombre}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                
                                {loHaceOtro && (
                                    <div className="bg-blue-900/30 border border-blue-800/50 px-3 py-2 rounded-xl mt-3 inline-flex items-center gap-2">
                                        <ChefHat size={14} className="text-blue-400"/>
                                        <span className="text-xs font-black text-blue-300 uppercase tracking-widest">
                                            Cocinando: {obtenerNombreTrabajadorActivo(item.chef_id)}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Botones de Acción Táctiles y Grandes */}
                            <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
                                {estadoItem === 'Pendiente' && (
                                    <button 
                                        disabled={isSubmitting || !!pedido.alerta_cocina}
                                        onClick={() => procesarAccionItems(pedido, [originalIdx], 'Preparar', ayudanteSeleccionado)}
                                        className="flex-1 bg-slate-700 hover:bg-emerald-500 text-slate-200 hover:text-white py-3 md:py-4 px-4 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                                    >
                                        <Play size={18}/> Preparar
                                    </button>
                                )}

                                {estadoItem === 'Preparando' && loEstoyHaciendoYo && (
                                    <button 
                                        disabled={isSubmitting || !!pedido.alerta_cocina}
                                        onClick={() => procesarAccionItems(pedido, [originalIdx], 'Terminar', ayudanteSeleccionado)}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-3 md:py-4 px-4 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <CheckCircle2 size={18}/> ¡Terminado!
                                    </button>
                                )}

                                {loHaceOtro && (
                                    <button 
                                        disabled={isSubmitting || !!pedido.alerta_cocina}
                                        onClick={() => procesarAccionItems(pedido, [originalIdx], 'Ayudar', ayudanteSeleccionado)}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 md:py-4 px-4 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Users size={18}/> Ayudar
                                    </button>
                                )}

                                {!pedido.alerta_cocina && (
                                    <button 
                                        onClick={() => setModalAlerta({ pedido: pedido, itemIndex: originalIdx, item })} 
                                        className="bg-slate-800 hover:bg-orange-500 text-slate-400 hover:text-white py-3 md:py-4 px-4 md:px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all border border-slate-700 hover:border-orange-500 flex items-center justify-center gap-2 active:scale-95"
                                        title="Reportar problema con este platillo"
                                    >
                                        <AlertTriangle size={16} className="hidden md:block"/> Faltante
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>  

            {/* BOTÓN MASIVO INFERIOR */}
            <div className="mt-auto shrink-0">
                {itemsDeMiArea.some(i => !i.estado || i.estado === 'Pendiente') && (
                    <button
                        onClick={tomarTodosLosPendientes}
                        disabled={isSubmitting || !!pedido.alerta_cocina}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-black py-4 md:py-5 rounded-2xl text-xs md:text-sm uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Play size={20}/> Tomar todo lo pendiente
                    </button>
                )}
            </div>
        </div>
    );
};  

export default TarjetaComandaCocina;