import React from 'react';
import { User, Phone, MapPin, Store, Utensils, Bike } from 'lucide-react';  

const TarjetaPedidoCobrar = ({
    pedido,
    isSubmitting,
    limpiandoMesas,
    setModalPago,
    getIconoPago,
    getTelefonoExtraido,
    renderBotonVerDetalle,
    renderBotonEditar,
    renderBotonAgregarExtra
}) => {
    const telefono = getTelefonoExtraido(pedido);
    const esDomicilio = pedido.tipo_consumo === 'Domicilio';
    const esLocal = pedido.tipo_consumo === 'Local';  

    const obtenerEstiloConsumo = () => {
        if (esDomicilio) return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', icon: <Bike size={12} /> };
        if (esLocal) return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: <Utensils size={12} /> };
        return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: <Store size={12} /> };
    };
    const estiloConsumo = obtenerEstiloConsumo();  

    let direccionLimpia = pedido.direccion_entrega || '';
    if (direccionLimpia.includes('|')) {
        direccionLimpia = direccionLimpia.split('|')[0]
            .replace(/TEL:\s*\d*/g, '')
            .replace(/PEDIDO POR TELÉFONO - CONTACTO:\s*\d*/g, '')
            .replace(/A NOMBRE DE:\s*(.*)/g, '')
            .trim();
    }  

    return (
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-blue-200 animate-in slide-in-from-bottom-4 group">  
            {/* 1. ENCABEZADO DEL PEDIDO */}
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                <div>
                    <span className="text-xl md:text-2xl font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">
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
                    <User size={16} className="text-slate-400" /> {pedido.cliente_nombre || 'Invitado'}
                </p>  
                {/* 👇 FIX: Enlace directo a WhatsApp */}
                {telefono && (
                    <a 
                        href={`https://wa.me/52${telefono.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-2 transition-colors w-fit cursor-pointer"
                        title="Abrir chat en WhatsApp"
                    >
                        <Phone size={14} className="text-blue-400" /> {telefono}
                    </a>
                )}  
                {esDomicilio && direccionLimpia && direccionLimpia !== 'Pendiente de dirección' && (
                    <p className="text-xs font-bold text-slate-500 flex items-start gap-2 line-clamp-2">
                        <MapPin size={14} className="text-pink-400 shrink-0 mt-0.5" /> {direccionLimpia}
                    </p>
                )}
            </div>  

            {/* 3. BOTONES DE ACCIÓN SECUNDARIOS INYECTADOS */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                {renderBotonVerDetalle(pedido)}
                {renderBotonEditar(pedido)}
                {renderBotonAgregarExtra(pedido)}
            </div>  

            {/* 4. BOTÓN DE COBRO PRINCIPAL */}
            <button
                disabled={isSubmitting || limpiandoMesas}
                onClick={() => setModalPago(pedido)}
                className="w-full bg-slate-800 hover:bg-blue-600 text-white font-black text-xs md:text-sm uppercase tracking-widest py-3 md:py-4 rounded-xl shadow-lg shadow-slate-800/20 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50"
            >
                {getIconoPago(pedido.metodo_pago)}
                Recibir Pago
            </button>  
        </div>
    );
};  

export default TarjetaPedidoCobrar;