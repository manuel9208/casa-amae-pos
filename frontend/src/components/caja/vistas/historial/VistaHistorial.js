import React from 'react';
import { Phone, FileText } from 'lucide-react';

const VistaHistorial = ({
  pedidos,
  subVistaHistorial,
  setSubVistaHistorial,
  isSubmitting,
  limpiandoMesas,
  getTelefonoExtraido,
  renderBotonVerDetalle,
  configGlobal,
  lanzarImpresion
}) => {
  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <h2 className="text-4xl font-black text-slate-800">Todos los Pedidos</h2>
      </div>
      
      <div className="flex gap-2 mb-8 bg-slate-200 p-1 rounded-2xl w-fit flex-wrap">
        {['Pagado', 'Preparando', 'Listo', 'Entregado', 'Cancelado', 'Sincronizado Offline'].map(tab => (
          <button 
            key={tab} 
            disabled={isSubmitting || limpiandoMesas} 
            onClick={() => setSubVistaHistorial(tab)} 
            className={`px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 ${subVistaHistorial === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab === 'Pagado' ? 'En Cola' : tab === 'Preparando' ? 'En Cocina' : tab === 'Listo' ? 'Finalizados' : tab === 'Entregado' ? 'Entregados' : tab}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${subVistaHistorial === tab ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
              {pedidos.filter(p => tab === 'Entregado' ? (p.estado_preparacion === 'Entregado' || p.estado_preparacion === 'En Camino' || p.estado_preparacion === 'Finalizado') : p.estado_preparacion === tab).length}
            </span>
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pedidos.filter(p => subVistaHistorial === 'Entregado' ? (p.estado_preparacion === 'Entregado' || p.estado_preparacion === 'En Camino' || p.estado_preparacion === 'Finalizado') : p.estado_preparacion === subVistaHistorial).length === 0 ? (
          <p className="text-slate-400 font-bold col-span-2 text-center mt-10">No hay pedidos en esta sección.</p>
        ) : (
          pedidos.filter(p => subVistaHistorial === 'Entregado' ? (p.estado_preparacion === 'Entregado' || p.estado_preparacion === 'En Camino' || p.estado_preparacion === 'Finalizado') : p.estado_preparacion === subVistaHistorial).map(p => {
            let direccionPura = '';
            const tel = getTelefonoExtraido(p);
            const tipoLimpio = p.tipo_consumo || 'SIN ESPECIFICAR';

            if (p.direccion_entrega) {
               const partes = p.direccion_entrega.split('|').map(x => x.trim());
               direccionPura = partes[0].replace(/TEL:\s*\d*/g, '').replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger').replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
            }

            return (
            <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                      <p className="text-2xl font-black text-slate-800">#{p.numero_pedido}</p>
                      <span className="text-[10px] bg-slate-100 font-black px-2 py-1 rounded-md uppercase text-slate-500">{tipoLimpio}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-slate-600">{direccionPura || p.cliente_nombre || p.cliente?.nombre || 'Invitado'}</p>
                      {tel && (
                          <a href={`https://wa.me/52${tel.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" title="Abrir chat en WhatsApp" className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-green-50 hover:text-green-700 transition-colors cursor-pointer">
                              <Phone size={10}/> {tel}
                          </a>
                      )}
                      {p.mesa && (
                          <span className="text-[10px] font-black text-white bg-indigo-500 px-2 py-0.5 rounded flex items-center gap-1">
                              MESA {p.mesa}
                          </span>
                      )}
                  </div>

                  <p className="text-sm font-bold text-blue-600 mt-1">${p.total} • {p.metodo_pago}</p>
              </div>

              <div className="flex flex-col sm:items-end gap-2 shrink-0 w-full sm:w-auto">
                  <p className="text-xs font-bold text-slate-400 uppercase text-right w-full">{subVistaHistorial === 'Pagado' ? 'Esperando Cocina' : subVistaHistorial}</p>
                  
                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                     {renderBotonVerDetalle(p)}
                     
                     {configGlobal?.ticket_impresion_activa && (
                        <button disabled={isSubmitting || limpiandoMesas} onClick={() => lanzarImpresion(p)} className="bg-slate-800 text-white hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition shadow-md w-full sm:w-auto disabled:opacity-50">
                           <FileText size={15}/> Reimprimir
                        </button>
                     )}
                  </div>
              </div>
            </div>
          )
          })
        )}
      </div>
    </>
  );
};

export default VistaHistorial;