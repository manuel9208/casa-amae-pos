import React from 'react';
import { MessageCircle } from 'lucide-react';

const TicketImpresionMayoreo = ({ ticketImprimir, configGlobal, apiUrl }) => {
    if (!ticketImprimir || !configGlobal) return null;

    // Limpieza estricta para impresoras térmicas
    const stripEmojis = (str) => {
        return String(str || '')
            .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
            .replace(/[⭐🔹🔸📝❌📦🥤☕🥛🥡🧊🍯🍫🧹🧴🧾🛍️🛒🏭🥩🍗🧀🥬🍅🥑🍞🥐]/g, '')
            .trim();
    };

    const getCleanPhone = () => {
        let cleanPhone = '';
        if (ticketImprimir.cliente_telefono) {
            cleanPhone = String(ticketImprimir.cliente_telefono).replace(/\D/g, '');
        }
        return cleanPhone;
    };

    const cleanPhone = getCleanPhone();
    const hasValidPhone = cleanPhone.length >= 10;

    const handleWhatsApp = () => {
        if (hasValidPhone) {
            const texto = `Hola ${stripEmojis(ticketImprimir.cliente_nombre) || ''}, te comparto la confirmación de tu orden de Mayoreo #${ticketImprimir.numero_pedido} por un total de *$${Number(ticketImprimir.total).toFixed(2)}*. ¡Gracias por tu preferencia!`;
            const url = `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(texto)}`;
            window.open(url, '_blank');
        }
    };

    // Parseo seguro del carrito guardado en BD
    let carrito = [];
    try { carrito = typeof ticketImprimir.carrito === 'string' ? JSON.parse(ticketImprimir.carrito) : ticketImprimir.carrito; } catch(e){}

    return (
        <div className="bg-white text-black shadow-2xl print:shadow-none relative flex flex-col" style={{ width: '58mm', fontSize: '12px', fontFamily: 'monospace', margin: '0', padding: '4mm', boxSizing: 'border-box' }}>
            <div className="text-center mb-3">
                {configGlobal.logo_url && (
                    <img src={configGlobal.logo_url.startsWith('http') ? configGlobal.logo_url : `${apiUrl.replace('/api', '')}${configGlobal.logo_url}`} alt="Logo" className="w-16 h-16 mx-auto mb-1 object-contain grayscale" />
                )}
                <h2 className="font-bold text-base uppercase leading-tight">{stripEmojis(configGlobal.nombre_negocio)}</h2>
                <p className="text-[10px] font-bold mt-1 bg-black text-white py-0.5 tracking-widest uppercase">DISTRIBUCIÓN B2B</p>
                {configGlobal.ticket_domicilio && <p className="text-[10px] mt-1 whitespace-pre-line leading-tight">{stripEmojis(configGlobal.ticket_domicilio)}</p>}
                <p className="text-[10px] mt-1">Tel: {configGlobal.whatsapp}</p>
            </div>

            <div className="border-b border-black border-dashed pb-2 mb-2 text-[10px] uppercase">
                <p>Orden: #{ticketImprimir.numero_pedido}</p>
                <p>Fecha: {new Date(ticketImprimir.fecha_creacion || Date.now()).toLocaleString()}</p>
                <p>Cliente: {stripEmojis(ticketImprimir.cliente_nombre || 'Invitado')}</p>
                <p>Logística: {stripEmojis(ticketImprimir.tipo_consumo)}</p>
                {ticketImprimir.direccion_entrega && ticketImprimir.direccion_entrega !== 'Local / Mostrador' && (
                    <p className="font-bold mt-1 text-[11px] leading-tight">DIR: {stripEmojis(ticketImprimir.direccion_entrega)}</p>
                )}
            </div>

            <table className="w-full text-left mb-2 text-[10px] uppercase">
                <thead>
                    <tr className="border-b border-black border-dashed">
                        <th className="pb-1 w-8">Cant</th>
                        <th className="pb-1">Desc</th>
                        <th className="text-right pb-1">Imp</th>
                    </tr>
                </thead>
                <tbody className="align-top">
                    {carrito.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-300 border-dotted">
                            <td className="pt-1">{item.cantidad || 1}</td>
                            <td className="pt-1 pr-1">
                                {stripEmojis(item.nombre)}
                                {item.extras && item.extras.length > 0 && (
                                    <div className="text-[9px] text-gray-700 normal-case leading-tight mt-0.5">
                                        {item.extras.map(e => stripEmojis(e.nombre)).join(', ')}
                                    </div>
                                )}
                            </td>
                            <td className="text-right pt-1">${(Number(item.precioFinal) * Number(item.cantidad || 1)).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="border-t border-black border-dashed pt-2 text-right uppercase text-[10px] mb-4">
                {Number(ticketImprimir.costo_envio) > 0 && (
                    <p className="mb-0.5 text-gray-800">Envío: +${Number(ticketImprimir.costo_envio).toFixed(2)}</p>
                )}
                <p className="font-bold text-sm mt-1 border-t border-gray-300 border-dotted pt-1">
                    Total: ${Number(ticketImprimir.total).toFixed(2)}
                </p>
                <p className="mt-1">Pago: {stripEmojis(ticketImprimir.metodo_pago)}</p>
                {ticketImprimir.metodo_pago === 'Mixto' && ticketImprimir.pagos_mixtos && (
                    <div className="mt-1 text-[9px] text-gray-700 space-y-0.5">
                        {(typeof ticketImprimir.pagos_mixtos === 'string' ? JSON.parse(ticketImprimir.pagos_mixtos) : ticketImprimir.pagos_mixtos).map((pm, idx) => (
                            <p key={idx}>- {stripEmojis(pm.metodo)}: ${Number(pm.monto).toFixed(2)}</p>
                        ))}
                    </div>
                )}
            </div>

            <div className="text-center mt-4 pt-4 border-t border-black border-dashed text-[10px]">
                <p className="font-bold uppercase leading-tight">{stripEmojis(configGlobal.ticket_mensaje_final || '¡Gracias por su compra!')}</p>
            </div>

            {hasValidPhone && (
                <div className="mt-8 print:hidden border-t border-slate-100 pt-4">
                    <button
                        onClick={handleWhatsApp}
                        className="bg-emerald-500 hover:bg-emerald-600 w-full text-white px-4 py-3 rounded-xl font-black flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                        <MessageCircle size={18} />
                        Enviar por WhatsApp
                    </button>
                </div>
            )}
        </div>
    );
};

export default TicketImpresionMayoreo;