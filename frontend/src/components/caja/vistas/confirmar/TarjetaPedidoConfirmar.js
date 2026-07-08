import React from 'react';
import { User, Phone, MapPin, Store, Bike, Check, X, Map, Banknote } from 'lucide-react';  

const TarjetaPedidoConfirmar = ({
  pedido,
  isSubmitting,
  actualizarEstadoPedido,
  setModalZonaEnvio,
  confirmarPedidoRecoger,
  getTelefonoExtraido,
  renderBotonVerDetalle,
  renderBotonEditar,
  renderItemsConfirmacion
}) => {
  const telefono = getTelefonoExtraido(pedido);
  const esDomicilio = pedido.tipo_consumo === 'Domicilio';  

  // 👇 NUEVA EXTRACCIÓN INTELIGENTE
  const instruccionCobro = pedido.direccion_entrega ? (pedido.direccion_entrega.match(/\[(.*?)\]/) ? pedido.direccion_entrega.match(/\[(.*?)\]/)[1] : null) : null;
  let direccionLimpia = pedido.direccion_entrega || '';
  let clienteExtraido = pedido.cliente_nombre || 'Invitado';  

  if (direccionLimpia.includes('A NOMBRE DE:')) {
    const match = direccionLimpia.match(/A NOMBRE DE:\s*([^|]+)/i);
    if (match && match[1]) {
      clienteExtraido = match[1].trim();
    }
  }  

  direccionLimpia = direccionLimpia
    .replace(/\[.*?\]/g, '')
    .replace(/A NOMBRE DE:\s*([^|]+)/gi, '')
    .replace(/TEL:\s*\d*/gi, '')
    .replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/gi, '')
    .split('|')
    .map(parte => parte.trim())
    .filter(parte => parte.length > 0)
    .join(', ')
    .trim();

  return (
    <div className="bg-white p-5 md:p-6 rounded-3xl border-2 border-amber-200 shadow-md flex flex-col justify-between transition-all hover:shadow-lg animate-in slide-in-from-bottom-4 relative overflow-hidden">
      {/* Etiqueta de Nuevo */}
      <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-widest shadow-sm">
        Nueva Orden
      </div>  

      {/* 1. ENCABEZADO */}
      <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4 pt-2">
        <div>
          <span className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">#{pedido.numero_pedido}</span>
          <div className={`mt-1.5 flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-md shadow-sm w-fit ${esDomicilio ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-orange-50 text-orange-600 border border-orange-200'}`}>
            {esDomicilio ? <Bike size={12} /> : <Store size={12} />}
            {pedido.tipo_consumo}
          </div>
        </div>
        <div className="text-right pr-4">
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-0.5">Monto</p>
          <p className="text-xl font-black text-amber-600">
            ${Number(pedido.total || 0).toFixed(2)}
          </p>
        </div>
      </div>  

      {/* 2. DETALLES Y CARRITO */}
      <div className="space-y-3 mb-6 flex-1">
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
          <p className="text-sm font-black text-slate-700 flex items-center gap-2">
            <User size={16} className="text-slate-400" /> {clienteExtraido}
          </p>
          {telefono && (
            <a href={`https://wa.me/52${telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-2 transition-colors w-fit cursor-pointer">
              <Phone size={14} className="text-blue-400" /> {telefono}
            </a>
          )}
          {esDomicilio && direccionLimpia && direccionLimpia !== 'Pendiente de dirección' && (
            <div className="space-y-2 mt-2">
              <p className="text-xs font-bold text-slate-500 flex items-start gap-2 line-clamp-2">
                <MapPin size={14} className="text-pink-400 shrink-0 mt-0.5" /> {direccionLimpia}
              </p>
              {instruccionCobro && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg flex items-center gap-1.5 w-fit">
                  <Banknote size={12} className="text-amber-500 shrink-0" />
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">{instruccionCobro}</p>
                </div>
              )}
            </div>
          )}
        </div>  

        <div className="pt-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Resumen de Orden:</p>
          <div className="max-h-32 overflow-y-auto custom-scrollbar pr-1">
            {renderItemsConfirmacion(pedido.carrito)}
          </div>
        </div>
      </div>  

      {/* 3. BOTONES DE ACCIÓN */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {renderBotonVerDetalle(pedido)}
        {renderBotonEditar(pedido)}
      </div>  

      <div className="flex gap-2">
        <button disabled={isSubmitting} onClick={() => actualizarEstadoPedido(pedido.id, 'Cancelado')} className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white p-3 md:p-4 rounded-xl border border-red-200 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50 active:scale-95" title="Rechazar/Cancelar">
          <X size={20} />
        </button>  
        {esDomicilio ? (
          <button disabled={isSubmitting} onClick={() => setModalZonaEnvio(pedido)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-lg shadow-amber-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
            <Map size={18} /> Asignar Zona
          </button>
        ) : (
          <button disabled={isSubmitting} onClick={() => confirmarPedidoRecoger(pedido.id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
            <Check size={18} /> Aceptar Orden
          </button>
        )}
      </div>
    </div>
  );
};  

export default TarjetaPedidoConfirmar;