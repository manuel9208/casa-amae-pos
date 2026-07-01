import React from 'react';
import { ChefHat } from 'lucide-react';  
import TarjetaComandaCocina from './TarjetaComandaCocina';

const GridPedidos = ({
    pedidosVisibles, filtroTab, ahora, isSubmitting,
    setModalAlerta, limpiarAlerta, getCarrito,
    trabajadorActivoId, obtenerNombreTrabajadorActivo, ayudanteSeleccionado,
    procesarAccionItems
}) => {  
    // 1. Filtramos los pedidos para mostrar SOLO aquellos que tengan platillos
    // de mi área y que esos platillos aún no estén "Listos".
    const pedidosParaMiArea = pedidosVisibles.filter(p => {
        const carritoArray = getCarrito(p);
        const misPlatillosPendientes = carritoArray.filter(i => 
            (filtroTab === 'Todo' || i.destino === filtroTab) && 
            i.estado !== 'Listo' && 
            i.estado !== 'Finalizado'
        );
        return misPlatillosPendientes.length > 0;
    });

    if (pedidosParaMiArea.length === 0) {
        return (
            <div className="text-center py-20 bg-slate-800 rounded-[40px] border border-slate-700 border-dashed max-w-xl mx-auto mt-10 animate-in zoom-in-95">
                <ChefHat size={64} className="text-slate-600 mx-auto mb-4 opacity-40 animate-pulse"/>
                <p className="text-xl font-black text-slate-400">Excelente Trabajo</p>
                <p className="text-sm font-medium text-slate-500 mt-1">No hay platillos pendientes en tu área seleccionada.</p>
            </div>
        );
    }  

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pedidosParaMiArea.map(p => (
                <TarjetaComandaCocina
                    key={p.id}
                    pedido={p}
                    getCarrito={getCarrito}
                    filtroTab={filtroTab}
                    ahora={ahora}
                    isSubmitting={isSubmitting}
                    setModalAlerta={setModalAlerta}
                    limpiarAlerta={limpiarAlerta}
                    ayudanteSeleccionado={ayudanteSeleccionado}
                    obtenerNombreTrabajadorActivo={obtenerNombreTrabajadorActivo}
                    procesarAccionItems={procesarAccionItems}
                />
            ))}
        </div>
    );
};  

export default GridPedidos;