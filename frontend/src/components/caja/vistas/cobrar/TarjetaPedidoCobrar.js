import React, { useState } from 'react';
import { User, Phone, MapPin, Store, Utensils, Bike, Trash2, AlertTriangle, Banknote, ChefHat, DollarSign } from 'lucide-react';

const TarjetaPedidoCobrar = ({
  pedido,
  isSubmitting,
  limpiandoMesas,
  setModalPago,
  actualizarEstadoPedido,
  getIconoPago,
  getTelefonoExtraido,
  renderBotonVerDetalle,
  renderBotonEditar,
  renderBotonAgregarExtra
}) => {
  const [confirmarAnular, setConfirmarAnular] = useState(false);

  const telefono = getTelefonoExtraido(pedido);
  const esDomicilio = pedido.tipo_consumo === 'Domicilio';
  const esLocal = pedido.tipo_consumo === 'Local';

  const obtenerEstiloConsumo = () => {
    if (esDomicilio) return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', icon: <Bike size={12} /> };
    if (esLocal) return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: <Utensils size={12} /> };
    return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: <Store size={12} /> };
  };
  const estiloConsumo = obtenerEstiloConsumo();

  // EXTRACCIÓN INTELIGENTE DE DATOS
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

  // 👇 NUEVO: Identificamos si es un pedido "Fantasma" (No cobrado y no mandado a cocina)
  const esPedidoFantasma = pedido.estado_preparacion === 'Pendiente';

  return (
    <>
      <div className={`bg-white p-5 md:p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:shadow-md animate-in slide-in-from-bottom-4 group ${esPedidoFantasma ? 'border-red-300 hover:border-red-400' : 'border-slate-200 hover:border-blue-200'}`}>
        
        {/* 1. ENCABEZADO */}
        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
          <div>
            <span className={`text-xl md:text-2xl font-black tracking-tight transition-colors ${esPedidoFantasma ? 'text-red-600' : 'text-slate-800 group-hover:text-blue-600'}`}>
              #{pedido.numero_pedido}
            </span>
            <div className={`mt-1.5 flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-md shadow-sm w-fit ${estiloConsumo.bg} ${estiloConsumo.text} ${estiloConsumo.border} border`}>
              {estiloConsumo.icon} {pedido.tipo_consumo}
              {esLocal && pedido.mesa && ` - Mesa ${pedido.mesa}`}
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-0.5">Por Cobrar</p>
            <p className="text-2xl font-black text-red-500">
              ${Number(pedido.total || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* 2. DETALLES DEL CLIENTE Y CONTACTO */}
        <div className="space-y-2 mb-6 flex-1">
          <p className="text-sm font-black text-slate-700 flex items-center gap-2">
            <User size={16} className="text-slate-400" /> {clienteExtraido}
          </p>
          {telefono && (
            <a href={`https://wa.me/52${telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-2 transition-colors w-fit cursor-pointer" title="Abrir chat en WhatsApp">
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

        {/* 👇 NUEVO: ALERTA ROJA PARA PEDIDOS NO MANDADOS A COCINA */}
        {esPedidoFantasma && (
          <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2 animate-pulse">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-black text-red-600 uppercase tracking-widest">No se mandó a cocina</p>
              <p className="text-[10px] font-bold text-red-500 mt-0.5 leading-tight">Esta orden está en pausa. Elige qué hacer con ella.</p>
            </div>
          </div>
        )}

        {/* 3. BOTONES SECUNDARIOS (Ver detalle, editar, agregar extra) */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {renderBotonVerDetalle(pedido)}
          {renderBotonEditar(pedido)}
          {renderBotonAgregarExtra && renderBotonAgregarExtra(pedido)}
        </div>

        {/* 4. BOTONERA PRINCIPAL CONDICIONAL */}
        {esPedidoFantasma ? (
          <div className="grid grid-cols-3 gap-2 mt-auto">
            {/* BOTÓN 1: ELIMINAR */}
            <button disabled={isSubmitting || limpiandoMesas} onClick={() => setConfirmarAnular(true)} className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all flex flex-col justify-center items-center py-2 active:scale-95 disabled:opacity-50 border border-red-200 group shadow-sm" title="Eliminar Orden">
              <Trash2 size={18} className="mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest">Eliminar</span>
            </button>
            {/* BOTÓN 2: MANDAR A COCINA (Cambia estado a 'Pagado' pero método a 'Por Cobrar' para no perderlo de aquí) */}
            <button disabled={isSubmitting || limpiandoMesas} onClick={() => actualizarEstadoPedido(pedido.id, 'Pagado', { metodo_pago: 'Por Cobrar' })} className="bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white rounded-xl transition-all flex flex-col justify-center items-center py-2 active:scale-95 disabled:opacity-50 border border-orange-200 group shadow-sm" title="Mandar a Cocina">
              <ChefHat size={18} className="mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest">Cocinar</span>
            </button>
            {/* BOTÓN 3: COBRAR AHORA (Abre el modal de pago normal) */}
            <button disabled={isSubmitting || limpiandoMesas} onClick={() => setModalPago(pedido)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all flex flex-col justify-center items-center py-2 active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-500/20 group" title="Cobrar Ahora">
              <DollarSign size={18} className="mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest">Cobrar</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-2 mt-auto">
            <button disabled={isSubmitting || limpiandoMesas} onClick={() => setConfirmarAnular(true)} className="w-14 shrink-0 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all flex justify-center items-center active:scale-95 disabled:opacity-50 border border-red-200 shadow-sm" title="Anular Orden">
              <Trash2 size={20} />
            </button>
            <button disabled={isSubmitting || limpiandoMesas} onClick={() => setModalPago(pedido)} className="flex-1 bg-slate-800 hover:bg-blue-600 text-white font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-lg shadow-slate-800/20 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
              {getIconoPago(pedido.metodo_pago)} Recibir Pago
            </button>
          </div>
        )}
      </div>

      {/* MODAL CONFIRMAR ANULAR */}
      {confirmarAnular && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">¿Anular Orden?</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              ¿Estás seguro que deseas cancelar y eliminar permanentemente la orden <strong>#{pedido.numero_pedido}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmarAnular(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">Volver</button>
              <button onClick={() => { actualizarEstadoPedido(pedido.id, 'Cancelado'); setConfirmarAnular(false); }} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/30 hover:bg-red-600 transition active:scale-95">Sí, Anular</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TarjetaPedidoCobrar;