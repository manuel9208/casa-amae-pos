import React from 'react';
import { AlertTriangle } from 'lucide-react';

// 🆕 Espejo de solo lectura de TarjetaComandaCocina.js — pensado para PantallaTV.
// Ingredientes ahora en texto corrido (no recuadros) para ahorrar espacio vertical.
// Quitar/Cambiar se resaltan con la palabra y un color distinto al resto.
const TarjetaComandaCocinaSoloLectura = ({ pedido, index = 0, ahora }) => {

    const getCarrito = (p) => {
        if (Array.isArray(p.carrito)) return p.carrito;
        try { return JSON.parse(p.carrito) || []; } catch (e) { return []; }
    };

    // Extrae "[CATEGORIA] Nombre" -> { clasificacion: 'CATEGORIA', nombreLimpio: 'Nombre' }.
    const extraerClasificacionYNombre = (rawNombre, categoriaItem) => {
        const texto = String(rawNombre || '');
        const match = texto.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (match) {
            return { clasificacion: match[1].trim(), nombreLimpio: match[2].trim() || texto };
        }
        return { clasificacion: categoriaItem || null, nombreLimpio: texto };
    };

    // 🆕 Clasifica cada extra en 3 tipos: 'quitar' (Sin X), 'cambiar' (Cambio/Cambiar por X),
    // o 'normal' (ingrediente agregado normalmente, ej. Proteínas/Vegetales/Toppings).
    const clasificarExtra = (rawNombre) => {
        const texto = String(rawNombre || '');
        const textoLower = texto.toLowerCase();

        // 🗑️ QUITAR: ej. "Sin Queso", "❌ SIN ingrediente faltante"
        if (textoLower.includes('sin ')) {
            let limpio = texto.replace(/❌\s*/i, '').replace(/^.*?sin\s+/i, '').trim();
            return { tipo: 'quitar', texto: limpio || texto };
        }

        // 🔄 CAMBIAR: ej. "🔄 Cambio: Cebolla x Tomate", "🔄 Cambiar por: Tomate"
        if (textoLower.includes('cambiar') || textoLower.includes('cambio')) {
            let limpio = texto.replace(/🔄\s*/i, '').replace(/^.*?(cambiar por:|cambio:)\s*/i, '').trim();
            if (limpio.includes(' x ')) {
                limpio = limpio.split(' x ')[1]?.trim() || limpio;
            }
            return { tipo: 'cambiar', texto: limpio || texto };
        }

        // Normal: limpia prefijos [Extra]/[Grupo] y "CATEGORIA: valor"
        let limpio = texto.replace(/^\[Extra\]\s*/i, '').replace(/^\[Grupo\]\s*/i, '').trim();
        const idxDosPuntos = limpio.indexOf(': ');
        if (idxDosPuntos !== -1) {
            limpio = limpio.substring(idxDosPuntos + 2).trim();
        }
        return { tipo: 'normal', texto: limpio };
    };

    const carritoArray = getCarrito(pedido);
    const itemsDeMiArea = carritoArray.filter(i => i.estado !== 'Listo' && i.estado !== 'Finalizado');

    let maxTiempo;
    if (itemsDeMiArea.length <= 1) {
        maxTiempo = Number(itemsDeMiArea[0]?.tiempo_preparacion) || 15;
    } else {
        maxTiempo = Math.max(...itemsDeMiArea.map(i => Number(i.tiempo_preparacion) || 15));
    }

    let minsTranscurridos = 0;
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

    let colorBorde = 'border-slate-700';
    if (pedido.estado_preparacion === 'Preparando') {
        if (minsTranscurridos > maxTiempo + 5) colorBorde = 'border-red-500';
        else if (minsTranscurridos > maxTiempo) colorBorde = 'border-orange-500';
        else colorBorde = 'border-blue-600';
    }

    let minsEspera = 0;
    const inicioEsperaMs = new Date(pedido.fecha_creacion).getTime();
    if (!isNaN(inicioEsperaMs)) {
        minsEspera = Math.max(0, Math.floor((ahora - inicioEsperaMs) / 60000));
    }
    const aunNoInicia = pedido.estado_preparacion !== 'Preparando';
    if (aunNoInicia && minsEspera > 10) colorBorde = 'border-amber-500';

    if (pedido.alerta_cocina) colorBorde = 'border-red-500';

    const fondoComanda = index % 2 === 0
        ? 'bg-gradient-to-b from-amber-700 to-amber-900'
        : 'bg-gradient-to-b from-red-800 to-red-950';

    const fechaHora = new Date(pedido.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mensajeVisible = pedido.alerta_cocina ? pedido.alerta_cocina.replace(/\[IDX:\d+\]\s*/g, '') : '';

    return (
        <div className={`relative ${fondoComanda} rounded-[32px] p-5 border-2 flex flex-col transition-all duration-300 ${colorBorde} max-h-[560px]`}>

            {/* ENCABEZADO — solo la hora arriba a la derecha */}
            <div className="flex justify-between items-start mb-3 border-b border-slate-700/50 pb-3 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">#{pedido.numero_pedido}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm">
                            {pedido.tipo_consumo}
                        </span>
                        {pedido.mesa && (
                            <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm">
                                📍 Mesa {pedido.mesa}
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-sm font-black text-white/80 shrink-0">{fechaHora}</p>
            </div>

            {/* ALERTA DE CAJA (solo informativa) */}
            {pedido.alerta_cocina && (
                <div className="bg-red-900/40 border border-red-500/50 p-3 rounded-xl mb-3 shrink-0">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                        <AlertTriangle size={12} /> {mensajeVisible.includes('CAJA RESPONDE:') ? 'Respuesta de Caja' : 'Esperando a Caja...'}
                    </p>
                    <p className="text-xs font-medium text-red-100">{mensajeVisible}</p>
                </div>
            )}

            {/* LISTADO DE PLATILLOS — Clasificación -> Nombre -> Ingredientes en línea */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {carritoArray.map((item, originalIdx) => {
                    if (item.estado === 'Listo' || item.estado === 'Finalizado') return null;

                    const { clasificacion, nombreLimpio } = extraerClasificacionYNombre(item.nombre, item.categoria);
                    const extrasList = item.extras || [];

                    return (
                        <div key={originalIdx} className="bg-slate-900 p-4 rounded-xl border border-slate-700/50">

                            {clasificacion && (
                                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">
                                    {clasificacion}
                                </p>
                            )}

                            <p className="text-3xl md:text-4xl font-black leading-tight text-white mb-2">
                                {item.cantidad > 1 && <span className="text-blue-400 mr-2">{item.cantidad}x</span>}
                                {nombreLimpio}
                            </p>

                            {/* 🆕 Ingredientes en texto corrido (sin recuadros) — ahorra espacio vertical.
                                Quitar/Cambiar se destacan con la palabra + color distinto. */}
                            {extrasList.length > 0 && (
                                <p className="text-base md:text-lg font-bold leading-relaxed">
                                    {extrasList.map((e, i) => {
                                        const { tipo, texto } = clasificarExtra(e.nombre);
                                        return (
                                            <span key={i}>
                                                {tipo === 'quitar' && (
                                                    <span className="text-red-400">QUITAR: {texto}</span>
                                                )}
                                                {tipo === 'cambiar' && (
                                                    <span className="text-amber-400">CAMBIAR: {texto}</span>
                                                )}
                                                {tipo === 'normal' && (
                                                    <span className="text-cyan-300">{texto}</span>
                                                )}
                                                {i < extrasList.length - 1 && <span className="text-slate-600"> &nbsp;·&nbsp; </span>}
                                            </span>
                                        );
                                    })}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TarjetaComandaCocinaSoloLectura;