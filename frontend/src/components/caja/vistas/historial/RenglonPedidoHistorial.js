import React, { useState } from 'react';
import { Printer, Edit, MapPin, Phone, User, Clock, Trash2, AlertTriangle, Eye } from 'lucide-react';  

const RenglonPedidoHistorial = ({
  pedido,
  lanzarImpresion,
  setModalPuntoVenta,
  setModalEditarPedido,
  actualizarEstadoPedido,
  configGlobal,
  isSubmitting,
  limpiandoMesas,
  setModalVerDetalle // 👈 FIX: Recibimos la función para abrir el modal
}) => {
  const [confirmarAnular, setConfirmarAnular] = useState(false);  

  let totalArticulos = 0;
  try {
    const car = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : (pedido.carrito || []);
    totalArticulos = car.reduce((sum, item) => sum + (Number(item.cantidad) || 1), 0);
  } catch (e) {}  

  const procesarDireccionYContacto = () => {
    let dirPura = pedido.direccion_entrega || '';
    let telefonoExtraido = '';
    let clienteExtraido = pedido.cliente_nombre || 'Invitado';  

    if (dirPura.includes('A NOMBRE DE:')) {
      const match = dirPura.match(/A NOMBRE DE:\s*([^|]+)/i);
      if (match && match[1]) {
        clienteExtraido = match[1].trim();
      }
    }  

    if (dirPura.includes('|')) {
      const partes = dirPura.split('|');
      const parteTel = partes.find(p => p.includes('TEL:'));
      if (parteTel) telefonoExtraido = parteTel.replace('TEL:', '').trim();
      dirPura = partes[0];
    }  

    dirPura = dirPura
      .replace(/TEL:\s*\d*/g, '')
      .replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, '')
      .replace(/A NOMBRE DE:\s*([^|]+)/i, '')
      .replace(/\[.*?\]/g, '')
      .trim();  

    return { direccionLimpia: dirPura, telefono: telefonoExtraido, cliente: clienteExtraido };
  };  

  const { direccionLimpia, telefono, cliente } = procesarDireccionYContacto();  

  const obtenerHoraFormateada = (fechaStr) => {
    if (!fechaStr) return '--:--';
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) { return '--:--'; }
  };  

  const esEditable = ['Pagado', 'Pendiente', 'Por Confirmar'].includes(pedido.estado_preparacion);  
  const esCancelable = !['Cancelado', 'Finalizado', 'Entregado', 'Liquidado'].includes(pedido.estado_preparacion);  

  return (
    <>
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 hover:shadow-md hover:border-slate-300 animate-in fade-in">
        
        {/* COLUMNA 1: IDENTIFICADOR Y TIEMPO */}
        <div className="flex items-center gap-4 min-w-[120px]">
          <div className="bg-slate-900 text-white font-black text-xl md:text-2xl px-4 py-2.5 rounded-2xl shadow-sm tracking-tight shrink-0">
            #{pedido.numero_pedido}
          </div>
          <div>
            <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-md shadow-sm">
              {pedido.tipo_consumo}
            </span>
            <p className="text-slate-400 font-bold text-xs flex items-center gap-1 mt-1.5">
              <Clock size={12} /> {obtenerHoraFormateada(pedido.fecha_creacion)}
            </p>
          </div>
        </div>  

        {/* COLUMNA 2: DETALLES DEL CLIENTE Y LOGÍSTICA */}
        <div className="flex-1 space-y-1">
          <p className="font-black text-slate-800 text-base flex items-center gap-1.5">
            <User size={16} className="text-slate-400 shrink-0" />
            {cliente}
          </p>
          {pedido.tipo_consumo === 'Local' && pedido.mesa && (
            <p className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md w-fit">
              📍 Mesa Asignada: {pedido.mesa}
            </p>
          )}
          {direccionLimpia && direccionLimpia !== 'Pendiente de dirección' && (
            <p className="text-xs font-bold text-slate-500 flex items-start gap-1.5 leading-snug line-clamp-1">
              <MapPin size={14} className="text-pink-500 shrink-0 mt-0.5" />
              {direccionLimpia}
            </p>
          )}
          {telefono && (
            <a
              href={`https://wa.me/52${telefono.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1.5 transition-colors w-fit cursor-pointer"
              title="Abrir chat en WhatsApp"
            >
              <Phone size={14} className="text-indigo-500 shrink-0" /> {telefono}
            </a>
          )}
        </div>  

        {/* COLUMNA 3: METRICAS Y TOTALES */}
        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <div className="text-left md:text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {totalArticulos} {totalArticulos === 1 ? 'Artículo' : 'Artículos'}
            </p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">
              ${Number(pedido.total || 0).toFixed(2)}
            </p>
          </div>  

          {/* COLUMNA 4: BOTONES DE ACCIÓN */}
          <div className="flex gap-2 shrink-0">
            {/* 👇 FIX APLICADO: Botón de Ver Detalles (SIEMPRE VISIBLE) */}
            <button
              type="button"
              disabled={isSubmitting || limpiandoMesas}
              onClick={() => setModalVerDetalle(pedido)}
              className="p-3 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 rounded-xl transition-all active:scale-95 border border-emerald-200/60 shadow-sm flex items-center justify-center"
              title="Ver Detalles de la Orden"
            >
              <Eye size={18} />
            </button>

            {configGlobal?.ticket_impresion_activa && (
              <button
                type="button"
                onClick={() => lanzarImpresion(pedido)}
                className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95 border border-slate-200/60 shadow-sm flex items-center justify-center"
                title="Reimprimir Ticket de Venta"
              >
                <Printer size={18} />
              </button>
            )}  

            {esEditable && (
              <button
                type="button"
                disabled={isSubmitting || limpiandoMesas}
                onClick={() => setModalEditarPedido(pedido)}
                className="p-3 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 rounded-xl transition-all active:scale-95 border border-blue-200/60 shadow-sm flex items-center justify-center"
                title="Modificar Orden"
              >
                <Edit size={18} />
              </button>
            )}  

            {esCancelable && (
              <button
                type="button"
                disabled={isSubmitting || limpiandoMesas}
                onClick={() => setConfirmarAnular(true)}
                className="p-3 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-xl transition-all active:scale-95 border border-red-200/60 shadow-sm flex items-center justify-center"
                title="Anular Orden"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>  

      {confirmarAnular && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">¿Anular Orden?</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              ¿Estás seguro que deseas cancelar permanentemente la orden <strong>#{pedido.numero_pedido}</strong>?
            </p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmarAnular(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95">
                Volver
              </button>
              <button onClick={() => { actualizarEstadoPedido(pedido.id, 'Cancelado'); setConfirmarAnular(false); }} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/30 hover:bg-red-600 transition active:scale-95">
                Sí, Anular
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};  

export default RenglonPedidoHistorial;