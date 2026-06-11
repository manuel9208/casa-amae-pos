import React, { useState, useEffect } from 'react';
import { Smartphone, XCircle, Home, PackagePlus, MapPin, Phone } from 'lucide-react';  

const ModalEditarPedido = ({ modalEditarPedido, setModalEditarPedido, guardarEdicionPedido, onGoToKiosco, isSubmitting }) => {
  const [editConsumo, setEditConsumo] = useState('');
  const [editDireccion, setEditDireccion] = useState('');  

  useEffect(() => {
    if (modalEditarPedido) {
      setEditConsumo(modalEditarPedido.tipo_consumo || 'Local');
      let dirPura = modalEditarPedido.direccion_entrega || '';
      if (modalEditarPedido.tipo_consumo === 'Domicilio' && dirPura.includes('|')) {
        dirPura = dirPura.split('|')[0].trim();
      }
      setEditDireccion(dirPura);
    }
  }, [modalEditarPedido]);  

  const submitEdicionPedido = (e) => {
    e.preventDefault();
    let payload = {
      tipo_consumo: editConsumo,
      estado_preparacion: modalEditarPedido.estado_preparacion
    };  

    if (editConsumo === 'Domicilio') {
      if (!editDireccion.trim()) return alert("Debes agregar la dirección si es a Domicilio.");
      payload.direccion_entrega = editDireccion;
    } else if (editConsumo === 'Recoger en Local') {
      if (!editDireccion.trim() && modalEditarPedido.cliente_nombre) {
        payload.direccion_entrega = `PEDIDO POR TELÉFONO - ${modalEditarPedido.cliente_nombre}`;
      } else {
        payload.direccion_entrega = editDireccion || 'Para pasar a recoger';
      }
    } else {
      payload.direccion_entrega = '';
      payload.costo_envio = 0;  
      if (modalEditarPedido.tipo_consumo === 'Domicilio' && Number(modalEditarPedido.costo_envio) > 0) {
        payload.total = Math.max(0, Number(modalEditarPedido.total) - Number(modalEditarPedido.costo_envio));
      }
    }  
    guardarEdicionPedido(modalEditarPedido.id, payload);
  };  

  if (!modalEditarPedido) return null;  

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <form onSubmit={submitEdicionPedido} className="bg-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col animate-in zoom-in duration-200">
        <div className="flex justify-between items-center border-b pb-5 mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-700 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-inner">
              <Smartphone size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">Editar Información</h2>
              <p className="text-xs md:text-sm font-bold text-slate-500">Orden #{modalEditarPedido.numero_pedido}</p>
            </div>
          </div>
          <button type="button" onClick={() => setModalEditarPedido(null)} className="bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 p-2 md:p-2.5 rounded-full transition">
            <XCircle size={24} />
          </button>
        </div>  

        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
            <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center justify-center gap-1">
              <span>🛒</span> ¿Deseas modificar platillos, cantidades o extras?
            </p>
            <button
              type="button"
              onClick={() => {
                setModalEditarPedido(null);
                
                // 👇 FIX: Rescate Inteligente del Nombre (Para que el Kiosco no se abra en blanco)
                let nombreLimpio = modalEditarPedido.cliente_nombre || (modalEditarPedido.cliente ? modalEditarPedido.cliente.nombre : '');
                
                // Si el nombre no venía directo, lo sacamos de la dirección o nota
                if (!nombreLimpio && modalEditarPedido.direccion_entrega) {
                  const partes = modalEditarPedido.direccion_entrega.split('|').map(x => x.trim());
                  nombreLimpio = partes[0].replace(/TEL:\s*\d*/g, '').replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, 'Pasará a recoger').replace(/A NOMBRE DE:\s*(.*)/g, '$1').trim();
                }

                // Creamos el cliente simulado para pasarlo al Kiosco
                const clienteSimulado = nombreLimpio ? { id: modalEditarPedido.cliente_id || null, nombre: nombreLimpio } : null;

                // Inyectamos forzosamente el nombre en la orden para que el Kiosco lo lea
                const ordenCorregida = {
                  ...modalEditarPedido,
                  cliente_nombre: nombreLimpio
                };

                onGoToKiosco(clienteSimulado, ordenCorregida);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-sm shadow-md transition active:scale-95"
            >
              Modificar Platillos / Carrito
            </button>
          </div>  

          <div>
            <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Tipo de Consumo</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setEditConsumo('Local')} className={`p-4 rounded-xl border-2 font-bold flex items-center gap-2 justify-center transition-all ${editConsumo === 'Local' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}><Home size={18}/> Local</button>
              <button type="button" onClick={() => setEditConsumo('Para llevar')} className={`p-4 rounded-xl border-2 font-bold flex items-center gap-2 justify-center transition-all ${editConsumo === 'Para llevar' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}><PackagePlus size={18}/> Para Llevar</button>
              <button type="button" onClick={() => setEditConsumo('Domicilio')} className={`p-4 rounded-xl border-2 font-bold flex items-center gap-2 justify-center transition-all ${editConsumo === 'Domicilio' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}><MapPin size={18}/> Domicilio</button>
              <button type="button" onClick={() => setEditConsumo('Recoger en Local')} className={`p-4 rounded-xl border-2 font-bold flex items-center gap-2 justify-center transition-all ${editConsumo === 'Recoger en Local' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}><Phone size={18}/> Recoger</button>
            </div>
          </div>  

          {(editConsumo === 'Domicilio' || editConsumo === 'Recoger en Local') && (
            <div className="animate-in fade-in">
              <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-3">
                {editConsumo === 'Domicilio' ? 'Dirección de Entrega' : 'Notas / Referencia'}
              </label>
              <textarea
                required={editConsumo === 'Domicilio'}
                value={editDireccion}
                onChange={(e) => setEditDireccion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-blue-500 text-slate-800 font-bold resize-none h-24"
                placeholder={editConsumo === 'Domicilio' ? 'Calle, número, colonia...' : 'Ej. Carro rojo, pasa en 10 min...'}
              />
            </div>
          )}
        </div>  

        <div className="flex gap-4 pt-6 mt-6 border-t border-slate-100">
          <button type="button" disabled={isSubmitting} onClick={() => setModalEditarPedido(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-blue-600 text-white font-black text-lg rounded-2xl hover:bg-blue-700 shadow-lg disabled:opacity-50 transition">Guardar Cambios</button>
        </div>
      </form>
    </div>
  );
};  

export default ModalEditarPedido;