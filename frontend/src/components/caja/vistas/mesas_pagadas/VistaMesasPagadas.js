import React, { useState } from 'react';
import { CheckCircle2, Phone, Utensils } from 'lucide-react';  

const VistaMesasPagadas = ({
  mesasPagadas,
  isSubmitting,
  limpiandoMesas,
  setLimpiandoMesas,
  getTelefonoExtraido,
  renderBotonVerDetalle,
  renderBotonEditar,
  renderBotonAgregarExtra,
  liberarMesaMagicamente, 
  apiUrl
}) => {
  const [mesasOcultas, setMesasOcultas] = useState([]);  
  const mesasVisibles = mesasPagadas.filter(p => !mesasOcultas.includes(p.id));  

  return (
    <div className="animate-in fade-in">
      <h2 className="text-4xl font-black mb-10 text-slate-800">Comedor y Mesas Activas</h2>  
      {mesasVisibles.length === 0 ? (
        <div className="text-center text-slate-400 mt-20 animate-in zoom-in-95">
          <CheckCircle2 size={64} className="mx-auto mb-4 opacity-30"/>
          <p className="text-2xl font-bold">No hay mesas en servicio actualmente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {mesasVisibles.map(p => {
            let direccionPura = '';
            let nombreMostrado = p.cliente_nombre || p.cliente?.nombre || '';
            const tel = getTelefonoExtraido(p);
            const tipoLimpio = p.tipo_consumo || 'SIN ESPECIFICAR';  
            
            if (p.direccion_entrega) {
              const partes = p.direccion_entrega.split('|').map(x => x.trim());
              
              const nombrePart = partes.find(x => x.startsWith('A NOMBRE DE:'));
              if (nombrePart && (!nombreMostrado || nombreMostrado.toLowerCase() === 'invitado')) {
                  nombreMostrado = nombrePart.replace('A NOMBRE DE:', '').trim();
              }

              direccionPura = partes[0]
                .replace(/TEL:\s*\d*/g, '')
                .replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger')
                .replace(/A NOMBRE DE:\s*(.*)/g, '')
                .trim();
            }  

            nombreMostrado = nombreMostrado || 'Invitado';
            const esCuentaAbierta = p.metodo_pago === 'Por Cobrar' || p.metodo_pago === 'Pendiente';
            
            return (
              <div key={p.id} className={`p-8 rounded-[40px] shadow-sm border-2 flex flex-col hover:shadow-md transition ${esCuentaAbierta ? 'bg-orange-50/40 border-orange-300' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className={`text-3xl font-black ${esCuentaAbierta ? 'text-orange-800' : 'text-emerald-800'}`}>#{p.numero_pedido}</h3>
                  <span className={`text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-widest ${esCuentaAbierta ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {esCuentaAbierta ? <Utensils size={16}/> : <CheckCircle2 size={16}/ >} 
                    {esCuentaAbierta ? 'Cuenta Abierta' : `PAGADO (${p.metodo_pago})`}
                  </span>
                </div>  

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="font-bold text-slate-700 text-xl">{nombreMostrado}</p>
                  
                  {tel && (
                    <a href={`https://wa.me/52${tel.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" title="Abrir chat en WhatsApp" className="text-xs font-black text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors cursor-pointer">
                      <Phone size={12}/> {tel}
                    </a>
                  )}
                  {p.mesa ? (
                    <span className="text-xs font-black text-indigo-600 bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-md flex items-center gap-1">
                      📍 MESA {p.mesa}
                    </span>
                  ) : (
                    <span className="text-xs font-black text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1">
                      📍 LOCAL / BARRA
                    </span>
                  )}

                  {direccionPura && (
                    <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md">
                      📝 {direccionPura}
                    </span>
                  )}
                </div>  

                <div className="mb-4">
                  <span className="text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm border bg-blue-50 text-blue-700 border-blue-200">
                    🍽️ {tipoLimpio}
                  </span>
                </div>  

                <div className={`mb-4 text-xs font-black p-2.5 rounded-lg border flex items-center gap-2 shadow-inner ${esCuentaAbierta ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                  <Utensils size={16}/> {esCuentaAbierta ? 'Clientes Consumiendo...' : 'Servicio Listo para Salida'}
                </div>  

                <div className="mb-4 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    {renderBotonVerDetalle(p)}
                    {renderBotonEditar(p)}
                  </div>
                  {renderBotonAgregarExtra(p)}
                </div>  
                
                <div className="mt-auto pt-6 border-t border-slate-200">
                  <p className="text-4xl font-black text-slate-800 mb-6">${p.total}</p>  
                  
                  {esCuentaAbierta ? (
                    // 👇 FIX: No se puede cobrar desde aquí para respetar la separación de responsabilidades
                    <div className="w-full py-4 bg-orange-100 text-orange-700 font-bold rounded-2xl text-center border border-orange-200 text-sm">
                       ⚠️ Esta cuenta sigue abierta.<br/>Ve a "Cuentas / Cobrar" para liquidarla.
                    </div>
                  ) : (
                    // 👇 ACCIÓN SI YA ESTABA PAGADO: Finaliza y limpia el mapa
                    <button
                      disabled={isSubmitting || limpiandoMesas}
                      onClick={async () => {
                        setLimpiandoMesas(true);
                        try {
                          const carritoActual = typeof p.carrito === 'string' ? JSON.parse(p.carrito) : (p.carrito || []);
                          const nuevoCarrito = carritoActual.map(item => ({ ...item, estado: 'Finalizado' }));  
                          
                          await fetch(`${apiUrl}/pedidos/${p.id}/estado`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ estado_preparacion: 'Finalizado', carrito: nuevoCarrito })
                          });  

                          if (p.mesa && liberarMesaMagicamente) {
                             await liberarMesaMagicamente(p.mesa);
                          }
                          setMesasOcultas(prev => [...prev, p.id]);  
                        } catch(e) {}
                        setLimpiandoMesas(false);
                      }}
                      className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 size={24}/> {p.mesa ? 'Limpiar y Liberar Mesa' : 'Finalizar Servicio Local'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};  

export default VistaMesasPagadas;