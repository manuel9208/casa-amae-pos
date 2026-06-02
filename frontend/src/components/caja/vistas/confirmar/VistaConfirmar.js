import React from 'react';
import { CheckCircle2, Phone, MapPin, DollarSign } from 'lucide-react';

const VistaConfirmar = ({
  pedidosPorConfirmar,
  isSubmitting,
  actualizarEstadoPedido,
  setModalZonaEnvio,
  confirmarPedidoRecoger,
  getTelefonoExtraido,
  renderBotonVerDetalle,
  renderBotonEditar,
  renderItemsConfirmacion
}) => {
  return (
    <>
      <h2 className="text-4xl font-black mb-10 text-slate-800">Verificar Pedidos</h2>
      {pedidosPorConfirmar.length === 0 ? (
        <div className="text-center text-slate-400 mt-20">
          <CheckCircle2 size={64} className="mx-auto mb-4 opacity-30"/>
          <p className="text-2xl font-bold">No hay pedidos esperando revisión.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {pedidosPorConfirmar.map(p => {
            let direccionPura = '';
            let notaCambio = null;
            const tel = getTelefonoExtraido(p);
            
            if (p.direccion_entrega) {
               const partes = p.direccion_entrega.split('|').map(x => x.trim());
               direccionPura = partes[0].replace(/TEL:\s*\d*/g, '').replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger').replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
               const cambioPart = partes.find(x => x.includes('Llevar cambio'));
               notaCambio = cambioPart ? cambioPart : null;
            }

            const esDomicilio = p.tipo_consumo === 'Domicilio';
            const iconoConsumo = esDomicilio ? <MapPin size={20} className="text-purple-500" /> : <Phone size={20} className="text-orange-500" />;
            const colorBorde = esDomicilio ? 'border-purple-200' : 'border-orange-200';
            const colorFondoAviso = esDomicilio ? 'bg-purple-50 border-purple-100' : 'bg-orange-50 border-orange-100';
            const colorTextoAviso = esDomicilio ? 'text-purple-700' : 'text-orange-700';

            return (
            <div key={p.id} className={`bg-white p-6 rounded-[40px] shadow-sm border-2 ${colorBorde} flex flex-col hover:shadow-md transition`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-3xl font-black text-slate-800">#{p.numero_pedido}</h3>
                <span className={`${esDomicilio ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'} text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest`}>
                  {esDomicilio ? 'Domicilio' : 'Recoger'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="font-bold text-slate-700 text-xl">{p.cliente_nombre || p.cliente?.nombre || 'Invitado'}</p>
                  {tel && (
                      <a href={`https://wa.me/52${tel.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" title="Abrir chat en WhatsApp" className="text-xs font-black text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors cursor-pointer">
                          <Phone size={12}/> {tel}
                      </a>
                  )}
              </div>
              
              {(direccionPura || notaCambio) && (
                <div className={`${colorFondoAviso} p-4 rounded-2xl border mb-4 flex items-start gap-3 mt-2`}>
                   {iconoConsumo}
                   <div>
                     {direccionPura && <p className={`font-black ${colorTextoAviso} tracking-wider leading-tight`}>{direccionPura}</p>}
                     {notaCambio && <p className="text-xs font-bold text-slate-500 mt-2 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-200">💵 {notaCambio}</p>}
                     {esDomicilio && <p className="text-xs font-black text-slate-400 mt-2 uppercase flex items-center gap-1"><DollarSign size={14} /> Pago: {p.metodo_pago}</p>}
                   </div>
                </div>
              )}

              <div className="mb-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  {renderBotonVerDetalle(p)}
                  {renderBotonEditar(p)}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl mb-6 overflow-y-auto max-h-40 border border-slate-100 shadow-inner">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Detalle del Pedido:</p>
                {renderItemsConfirmacion(p.carrito)}
              </div>
              <p className="text-4xl font-black text-blue-600 mb-6 text-center">${p.total}</p>
              
              <div className="mt-auto grid grid-cols-2 gap-3">
                 <button 
                    disabled={isSubmitting} 
                    onClick={() => actualizarEstadoPedido(p.id, 'Cancelado')} 
                    className="py-4 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition disabled:opacity-50"
                 >
                    Rechazar
                 </button>
                 {esDomicilio ? (
                    <button 
                       disabled={isSubmitting} 
                       onClick={() => setModalZonaEnvio(p)} 
                       className="py-4 bg-purple-600 text-white font-black rounded-2xl hover:bg-purple-700 shadow-lg shadow-purple-500/20 transition active:scale-95 text-sm leading-tight disabled:opacity-50"
                    >
                       Asignar Envío<br/>y Aceptar
                    </button>
                 ) : (
                    <button 
                       disabled={isSubmitting} 
                       onClick={() => confirmarPedidoRecoger(p.id)} 
                       className="py-4 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
                    >
                       Mandar a Cocina
                    </button>
                 )}
              </div>
            </div>
          )})}
        </div>
      )}
    </>
  );
};

export default VistaConfirmar;