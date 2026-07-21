import React, { useState } from 'react';
import CategoriasGrid from './menu/CategoriasGrid';
import ProductosGrid from './menu/ProductosGrid';
import CarritoLateral from './menu/CarritoLateral';

const MenuPrincipal = ({
    configGlobal, productos, clasificaciones, carrito, setCarrito,
    baseUrl, setPantallaActual, pedidoEditandoId, clienteActivo,
    setModalNip, calcularTotal, setProductoEnEspera, setItemAEditar,
    calcularSubtotal, descuentoPuntosDinero, descuentoPuntosPuntosFisicos,
    cuponActivo, setCuponActivo, descuentoCuponDinero, apiUrl, isOffline,
    guardarEdicionDirecta,
    isSubmitting,
    bloqueoPuntosActivo
}) => {
    const [categoriaActiva, setCategoriaActiva] = useState(null);
    const [inputCupon, setInputCupon] = useState('');
    const [errorCupon, setErrorCupon] = useState('');
    const [buscandoCupon, setBuscandoCupon] = useState(false);

    // 👇 NUEVA LÓGICA DE HORARIO + BYPASS MANUAL DE CAJA
    const evaluarHorarioKiosco = () => {
        // 1. Extraer y parsear los horarios de la BD
        let horarios = {};
        try {
            horarios = typeof configGlobal.horarios_semana === 'string' 
                ? JSON.parse(configGlobal.horarios_semana || '{}') 
                : (configGlobal.horarios_semana || {});
        } catch (e) {}

        // 2. Obtener día y hora actual del Kiosco
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const ahora = new Date();
        const diaHoy = diasSemana[ahora.getDay()];
        const horaActual = ahora.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        const configHoy = horarios[diaHoy];
        let dentroDeHorario = false;

        // 3. Evaluar matemáticamente si la hora está DENTRO del horario configurado
        if (configHoy && configHoy.activo) {
            const { apertura, cierre } = configHoy;
            if (apertura <= cierre) {
                if (horaActual >= apertura && horaActual <= cierre) dentroDeHorario = true;
            } else { // Turnos nocturnos
                if (horaActual >= apertura || horaActual <= cierre) dentroDeHorario = true;
            }
        }

        // 4. Leer si el Cajero forzó la apertura manual (Switch de Caja)
        const cajaAbiertaManualmente = configGlobal.negocio_abierto === true || configGlobal.negocio_abierto === 'true' || configGlobal.negocio_abierto === 1;

        // 5. APLICAR LEYES OPERATIVAS DEL NEGOCIO:
        // LEY A: Si estamos dentro del horario oficial, el kiosco NUNCA se cierra.
        if (dentroDeHorario) return false;

        // LEY B: Si estamos fuera de horario (ej. evento privado) y Caja forzó la apertura, se ABRE.
        if (cajaAbiertaManualmente) return false;

        // LEY C: Si estamos fuera de horario y no hay orden manual de caja, se CIERRA.
        return true; 
    };

    // Aplicamos la validación en vivo
    const isCerrado = evaluarHorarioKiosco();
    const mensajeCierre = configGlobal.mensaje_cierre || 'El negocio se encuentra cerrado temporalmente. Por favor, vuelve más tarde.';

    const cambiarCantidadCart = (idTicket, delta) => {
        setCarrito(carrito.map(item => {
            if (item.idTicket === idTicket) {
                if (delta > 0) {
                    const prodDB = productos.find(p => p.id === (item.id || item.producto_id));
                    if (prodDB) {
                        const isUsaStock = prodDB.usa_stock === true || String(prodDB.usa_stock) === 'true';
                        const stockActual = Number(prodDB.stock_preparado) || 0;
                        if (isUsaStock) {
                            const enCarrito = carrito.filter(i => (i.id || i.producto_id) === prodDB.id).reduce((s, i) => s + (i.cantidad || 1), 0);
                            if (enCarrito >= stockActual) {
                                alert(`Límite alcanzado. Solo hay ${stockActual} unidades disponibles de ${prodDB.nombre}.`);
                                return item;
                            }
                        }
                    }
                }
                const nuevaCant = (item.amount || item.cantidad || 1) + delta;
                return { ...item, cantidad: Math.max(1, nuevaCant) };
            }
            return item;
        }));
    };

    const quitarDelCarrito = (idTicket) => {
        setCarrito(carrito.filter(i => i.idTicket !== idTicket));
    };

    const editarItem = (item) => {
        const productoOriginal = productos.find(p => p.id === (item.id || item.producto_id) || p.nombre === item.nombre);
        if (!productoOriginal) return alert("Este producto ya no existe o se ocultó del menú.");
        setItemAEditar(item);
        setProductoEnEspera(productoOriginal);
    };

    const abrirModalProducto = (p) => {
        setItemAEditar(null);
        setProductoEnEspera(p);
    };

    const categoriasUnicas = [...new Set(productos.map(p => p.categoria || 'General'))];
    const productosFiltrados = productos.filter(p => (p.categoria || 'General') === categoriaActiva);

    const getPortadaCategoria = (catName) => {
        const clasifDB = clasificaciones.find(c => c.nombre === catName);
        return { imagen_url: clasifDB?.imagen_url || null, emoji: clasifDB?.emoji || '🍽️' };
    };

    const validarCupon = async (e) => {
        e.preventDefault();
        setErrorCupon('');
        if (!inputCupon.trim()) return;
        if (isOffline) return setErrorCupon('No se pueden validar cupones sin Internet.');

        setBuscandoCupon(true);
        try {
            const res = await fetch(`${apiUrl}/cupones/validar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo: inputCupon })
            });
            const data = await res.json();
            if (res.ok) {
                setCuponActivo(data);
                setInputCupon('');
            } else {
                setErrorCupon(data.error || "Cupón inválido.");
            }
        } catch (error) {
            setErrorCupon("Error al validar cupón.");
        }
        setBuscandoCupon(false);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8 h-auto lg:h-[75vh] pb-12 lg:pb-0">
            {/* CONTENEDOR IZQUIERDO (MENÚ) */}
            <div className="w-full lg:w-2/3 flex flex-col h-[65vh] lg:h-full shrink-0">
                {isCerrado && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-2xl mb-6 shadow-sm flex items-center gap-4 shrink-0">
                        <span className="text-4xl">⏸️</span>
                        <div>
                            <p className="font-black text-red-700 text-lg uppercase tracking-widest">Negocio Cerrado</p>
                            <p className="font-bold text-red-600 mt-1">{mensajeCierre}</p>
                        </div>
                    </div>
                )}

                {!categoriaActiva ? (
                    <CategoriasGrid configGlobal={configGlobal} categoriasUnicas={categoriasUnicas} getPortadaCategoria={getPortadaCategoria} setCategoriaActiva={setCategoriaActiva} baseUrl={baseUrl} />
                ) : (
                    <ProductosGrid categoriaActiva={categoriaActiva} setCategoriaActiva={setCategoriaActiva} productosFiltrados={productosFiltrados} abrirModalProducto={abrirModalProducto} baseUrl={baseUrl} />
                )}
            </div>

            {/* CONTENEDOR DERECHO (CARRITO) */}
            <CarritoLateral
                carrito={carrito} pedidoEditandoId={pedidoEditandoId} cambiarCantidadCart={cambiarCantidadCart}
                editarItem={editarItem} quitarDelCarrito={quitarDelCarrito} isOffline={isOffline}
                inputCupon={inputCupon} setInputCupon={setInputCupon} errorCupon={errorCupon}
                setErrorCupon={setErrorCupon} buscandoCupon={buscandoCupon} validarCupon={validarCupon}
                cuponActivo={cuponActivo} setCuponActivo={setCuponActivo} clienteActivo={clienteActivo}
                descuentoPuntosPuntosFisicos={descuentoPuntosPuntosFisicos} configGlobal={configGlobal}
                setModalNip={setModalNip} descuentoCuponDinero={descuentoCuponDinero} descuentoPuntosDinero={descuentoPuntosDinero}
                calcularSubtotal={calcularSubtotal} calcularTotal={calcularTotal} isCerrado={isCerrado} setPantallaActual={setPantallaActual}
                guardarEdicionDirecta={guardarEdicionDirecta}
                isSubmitting={isSubmitting}
                bloqueoPuntosActivo={bloqueoPuntosActivo}
            />
        </div>
    );
};

export default MenuPrincipal;