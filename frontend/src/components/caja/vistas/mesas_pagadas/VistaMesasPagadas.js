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
      <h2 className="text-4xl font-black mb-10 text-slate-800">Cuentas Pagadas (Locales)</h2>  
      {mesasVisibles.length === 0 ? (
        <div className="text-center text-slate-400 mt-20 animate-in zoom-in-95">
          <CheckCircle2 size={64} className="mx-auto mb-4 opacity-30"/>
          <p className="text-2xl font-bold">No hay clientes comiendo en local actualmente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {mesasVisibles.map(p => {
            let direccionPura = '';
            const tel = getTelefonoExtraido(p);
            const tipoLimpio = p.tipo_consumo || 'SIN ESPECIFICAR';  
            
            if (p.direccion_entrega) {
              const partes = p.direccion_entrega.split('|').map(x => x.trim());
              direccionPura = partes[0].replace(/TEL:\s*\d*/g, '').replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger').replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
            }  
            
            return (
              <div key={p.id} className="bg-emerald-50 p-8 rounded-[40px] shadow-sm border-2 border-emerald-200 flex flex-col hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-3xl font-black text-emerald-800">#{p.numero_pedido}</h3>
                  <span className="text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-widest bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={16}/> PAGADO ({p.metodo_pago})
                  </span>
                </div>  
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="font-bold text-slate-700 text-xl">{direccionPura || p.cliente_nombre || p.cliente?.nombre || 'Invitado'}</p>
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
                </div>  
                <div className="mb-4">
                  <span className="text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm border bg-blue-50 text-blue-700 border-blue-200">
                    🍽️ {tipoLimpio}
                  </span>
                </div>  
                <div className="mb-4 bg-orange-50 text-orange-700 text-xs font-black p-2.5 rounded-lg border border-orange-200 flex items-center gap-2 shadow-inner">
                  <Utensils size={16}/> Comiendo en Local
                </div>  
                <div className="mb-4 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    {renderBotonVerDetalle(p)}
                    {renderBotonEditar(p)}
                  </div>
                  {renderBotonAgregarExtra(p)}
                </div>  
                
                <div className="mt-auto pt-6 border-t border-emerald-200">
                  <p className="text-4xl font-black text-emerald-600 mb-6">${p.total}</p>  
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
                          body: JSON.stringify({
                            estado_preparacion: 'Finalizado',
                            carrito: nuevoCarrito
                            // 👇 FIX: Quitamos la línea de "mesa: null" para que tu historial NO pierda la mesa
                          })
                        });  

                        if (p.mesa && liberarMesaMagicamente) {
                           await liberarMesaMagicamente(p.mesa);
                        }

                        setMesasOcultas(prev => [...prev, p.id]);  
                      } catch(e) {
                        console.error("Error en flujo de liberación:", e);
                      }
                      setLimpiandoMesas(false);
                    }}
                    className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition active:scale-95 disabled:opacity-50"
                  >
                    {limpiandoMesas ? 'Procesando...' : (
                      <><CheckCircle2 size={24}/> {p.mesa ? 'Limpiar y Liberar Mesa' : 'Finalizar Servicio Local'}</>
                    )}
                  </button>
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