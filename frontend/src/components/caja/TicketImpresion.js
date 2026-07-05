import React from 'react';
import { MessageCircle } from 'lucide-react'; // 👈 Se agregó el ícono

const TicketImpresion = ({ ticketImprimir, configGlobal, apiUrl }) => {
  if (!ticketImprimir || !configGlobal) return null;  

  // 👇 NUEVA LÓGICA: Extracción de WhatsApp
  const getCleanPhone = () => {
    let cleanPhone = '';
    if (ticketImprimir.cliente_telefono) {
      cleanPhone = String(ticketImprimir.cliente_telefono).replace(/\D/g, '');
    } else if (ticketImprimir.direccion_entrega) {
      if (ticketImprimir.direccion_entrega.includes('TEL:')) cleanPhone = ticketImprimir.direccion_entrega.split('TEL:')[1].split('|')[0].replace(/\D/g, '');
      else if (ticketImprimir.direccion_entrega.includes('CONTACTO:')) cleanPhone = ticketImprimir.direccion_entrega.split('CONTACTO:')[1].split('|')[0].replace(/\D/g, '');
    }
    return cleanPhone;
  };

  const cleanPhone = getCleanPhone();
  const hasValidPhone = cleanPhone.length >= 10;

  const handleWhatsApp = () => {
    if (hasValidPhone) {
      const texto = `Hola ${ticketImprimir.cliente_nombre || ''}, te comparto la confirmación de tu orden #${ticketImprimir.numero_pedido} por un total de *$${ticketImprimir.total}*. ¡Gracias por tu preferencia!`;
      const url = `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(texto)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center p-4 print:bg-transparent print:backdrop-blur-none print:p-0 print:static print:block animate-in fade-in duration-200">
      
      {/* 👇 NUEVO: Indicador visual en pantalla (se oculta al imprimir) */}
      <div className="mb-6 text-white text-center print:hidden animate-in slide-in-from-top-4">
        <div className="bg-emerald-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
          <span className="text-3xl">🧾</span>
        </div>
        <h2 className="font-black text-2xl tracking-tight">Generando Ticket</h2>
        <p className="text-sm font-medium text-slate-300 mt-1">Formato térmico 58mm</p>
      </div>

      {/* 👇 EL TICKET FÍSICO: Se ve en pantalla y se adapta al papel térmico */}
      <div className="bg-white text-black shadow-2xl print:shadow-none relative" style={{ width: '58mm', fontSize: '12px', fontFamily: 'monospace', margin: '0', padding: '4mm', boxSizing: 'border-box' }}>
        
        <div className="text-center mb-3">
          {configGlobal.logo_url && (
            <img src={configGlobal.logo_url.startsWith('http') ? configGlobal.logo_url : `${apiUrl.replace('/api', '')}${configGlobal.logo_url}`} alt="Logo" className="w-16 h-16 mx-auto mb-1 object-contain grayscale" />
          )}
          <h2 className="font-bold text-base uppercase leading-tight">{configGlobal.nombre_negocio}</h2>
          {configGlobal.ticket_domicilio && <p className="text-[10px] mt-1 whitespace-pre-line leading-tight">{configGlobal.ticket_domicilio}</p>}
          <p className="text-[10px] mt-1">Tel: {configGlobal.whatsapp}</p>
        </div>  

        <div className="border-b border-black border-dashed pb-2 mb-2 text-[10px] uppercase">
          <p>Ticket: #{ticketImprimir.numero_pedido}</p>
          <p>Fecha: {new Date().toLocaleString()}</p>
          <p>Cliente: {ticketImprimir.cliente_nombre || 'Invitado'}</p>
          <p>Tipo: {ticketImprimir.tipo_consumo}</p>
          {ticketImprimir.mesa && <p className="font-bold">MESA: {ticketImprimir.mesa}</p>}  
          {ticketImprimir.direccion_entrega && ticketImprimir.direccion_entrega !== 'Pendiente de dirección' && (
            <p className="font-bold mt-1 text-[11px] leading-tight">DIR: {ticketImprimir.direccion_entrega}</p>
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
            {(typeof ticketImprimir.carrito === 'string' ? JSON.parse(ticketImprimir.carrito) : ticketImprimir.carrito).map((item, idx) => (
              <tr key={idx} className="border-b border-gray-300 border-dotted">
                <td className="pt-1">{item.cantidad || 1}</td>
                <td className="pt-1 pr-1">
                  {item.nombre}
                  {item.extras && item.extras.length > 0 && (
                    <div className="text-[9px] text-gray-700 normal-case leading-tight mt-0.5">
                      {item.extras.map(e => e.nombre).join(', ')}
                    </div>
                  )}
                </td>
                <td className="text-right pt-1">${(item.precioFinal * (item.cantidad || 1)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>  

        <div className="border-t border-black border-dashed pt-2 text-right uppercase text-[10px] mb-4">
          <p className="font-bold text-sm">Total: ${ticketImprimir.total}</p>
          <p className="mt-1">Pago: {ticketImprimir.metodo_pago}</p>  
          {ticketImprimir.metodo_pago === 'Mixto' && ticketImprimir.pagos_mixtos && (
            <div className="mt-1 text-[9px] text-gray-700 space-y-0.5">
              {(typeof ticketImprimir.pagos_mixtos === 'string' ? JSON.parse(ticketImprimir.pagos_mixtos) : ticketImprimir.pagos_mixtos).map((pm, idx) => (
                <p key={idx}>- {pm.metodo}: ${Number(pm.monto).toFixed(2)}</p>
              ))}
            </div>
          )}
        </div>  

        <div className="text-center mt-4 pt-4 border-t border-black border-dashed text-[10px]">
          <p className="font-bold uppercase leading-tight">{configGlobal.ticket_mensaje_final || '¡Gracias por su compra!'}</p>  
          {configGlobal.ticket_firma_sistema && configGlobal.ticket_firma_sistema.trim() !== '' && (
            <p className="mt-2 text-[8px] opacity-50">{configGlobal.ticket_firma_sistema}</p>
          )}
        </div>
      </div>

      {/* 👇 NUEVO BOTÓN DE WHATSAPP (Se oculta al imprimir con print:hidden) */}
      {hasValidPhone && (
        <div className="mt-8 print:hidden animate-in slide-in-from-bottom-4">
          <button 
            onClick={handleWhatsApp} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 mx-auto shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
          >
            <MessageCircle size={20} />
            Enviar Ticket por WhatsApp
          </button>
        </div>
      )}

    </div>
  );
};  

export default TicketImpresion;