import React from 'react';

const TicketImpresion = ({ ticketImprimir, configGlobal, apiUrl }) => {
  if (!ticketImprimir || !configGlobal) return null;

  return (
    <div className="hidden print:block text-black bg-white" style={{ width: '58mm', fontSize: '12px', fontFamily: 'monospace', margin: '0', padding: '0' }}>
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
      </div>

      <div className="text-center mt-4 pt-4 border-t border-black border-dashed text-[10px]">
        <p className="font-bold uppercase leading-tight">{configGlobal.ticket_mensaje_final || '¡Gracias por su compra!'}</p>
        
        {/* 👇 NUEVA FIRMA CONFIGURABLE (Solo se muestra si no está en blanco) */}
        {configGlobal.ticket_firma_sistema && configGlobal.ticket_firma_sistema.trim() !== '' && (
           <p className="mt-2 text-[8px] opacity-50">{configGlobal.ticket_firma_sistema}</p>
        )}
      </div>
    </div>
  );
};

export default TicketImpresion;