import React, { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';
import CatalogoMayoreo from './CatalogoMayoreo';
import ModalCheckoutMayoreo from './ModalCheckoutMayoreo';
import ModalCantidadMayoreo from './ModalCantidadMayoreo';
import { useCarritoMayoreo } from './useCarritoMayoreo';

const PuntoDeVentaMayoreo = ({ apiUrl, baseUrl, showAlert, user, onClose }) => {
    const [articulos, setArticulos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [categoriaActiva, setCategoriaActiva] = useState(null);
    const [cargando, setCargando] = useState(true);

    const [articuloPidiendoCantidad, setArticuloPidiendoCantidad] = useState(null);
    const [modalCheckout, setModalCheckout] = useState(false);

    const c = useCarritoMayoreo(showAlert);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const resArt = await fetch(`${apiUrl}/distribucion/articulos`);
                if (resArt.ok) setArticulos(await resArt.json());

                const resCli = await fetch(`${apiUrl}/distribucion/clientes`);
                if (resCli.ok) setClientes(await resCli.json());
            } catch (error) {
                console.error("Error al cargar datos B2B:", error);
            }
            setCargando(false);
        };
        cargarDatos();
    }, [apiUrl]);

    // 👇 FIX APLICADO: Bloqueo de Recarga (F5) o cierre de pestaña accidental
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            // Si hay algo en el carrito y no estamos en medio de una orden guardándose, bloqueamos.
            if (c.carrito.length > 0 && !window.__isGuardandoPedidoB2B) {
                e.preventDefault();
                e.returnValue = ''; 
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [c.carrito.length]);

    const categoriasUnicas = [...new Set(articulos.map(a => a.categoria))];

    if (cargando) {
        return <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-400 font-bold animate-pulse z-20">Cargando Catálogo B2B...</div>;
    }

    return (
        <div className="absolute inset-0 flex flex-col bg-slate-50 overflow-hidden animate-in fade-in duration-300 z-20">
            
            {/* 1. CATÁLOGO CENTRAL AISLADO */}
            <div className="flex-1 w-full min-w-0 overflow-hidden flex flex-col relative z-10">
                <CatalogoMayoreo
                    articulos={articulos}
                    categoriaActiva={categoriaActiva}
                    setCategoriaActiva={setCategoriaActiva}
                    categoriasUnicas={categoriasUnicas}
                    carrito={c.carrito}
                    baseUrl={baseUrl}
                    onSelectArticulo={(art) => setArticuloPidiendoCantidad(art)}
                />
            </div>

            {/* 2. BARRA FLOTANTE INFERIOR */}
            {c.carrito.length > 0 && (
                <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 md:p-6 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] z-30 animate-in slide-in-from-bottom-4">
                    <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] md:text-xs font-black uppercase text-slate-400 tracking-widest mb-0.5">Total Orden</p>
                            <p className="text-2xl md:text-4xl font-black text-indigo-700 leading-none">${c.subtotal.toFixed(2)}</p>
                        </div>
                        <button
                            onClick={() => setModalCheckout(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 md:px-12 py-4 rounded-2xl shadow-lg shadow-indigo-500/30 transition active:scale-95 flex items-center justify-center gap-3 text-sm md:text-lg"
                        >
                            <ShoppingBag size={24}/>
                            <span>Ver Carrito y Pagar</span>
                            <span className="bg-indigo-500 text-white px-3 py-1 rounded-lg ml-2 text-sm shadow-inner border border-indigo-400">
                                {c.totalArticulos}
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {/* 3. MODALES DESACOPLADOS */}
            
            <ModalCantidadMayoreo
                articulo={articuloPidiendoCantidad}
                onClose={() => setArticuloPidiendoCantidad(null)}
                agregarAlCarrito={c.agregarAlCarrito}
                baseUrl={baseUrl}
            />

            <ModalCheckoutMayoreo
                isOpen={modalCheckout}
                onClose={() => setModalCheckout(false)}
                onCloseAppTotal={onClose} 
                carrito={c.carrito}
                subtotal={c.subtotal}
                cambiarCantidad={c.cambiarCantidad}
                quitarDelCarrito={c.quitarDelCarrito}
                vaciarCarritoMayoreo={c.vaciarCarritoMayoreo}
                clienteB2B={c.clienteB2B}
                setClienteB2B={c.setClienteB2B}
                permiteCreditoOrden={c.permiteCreditoOrden}
                clientes={clientes}
                apiUrl={apiUrl}
                showAlert={showAlert}
                user={user} 
            />

        </div>
    );
};

export default PuntoDeVentaMayoreo;