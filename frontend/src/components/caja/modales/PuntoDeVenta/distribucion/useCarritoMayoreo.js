import { useState, useEffect } from 'react';

export const useCarritoMayoreo = (showAlert) => {
    const [carrito, setCarrito] = useState([]);
    const [clienteB2B, setClienteB2B] = useState(null);

    const calcularPrecioAplicable = (articulo, cantidadComprada, clienteActual) => {
        let reglas = [];
        try {
            reglas = typeof articulo.precios === 'string' ? JSON.parse(articulo.precios) : (articulo.precios || []);
        } catch (e) { }

        if (reglas.length === 0) return { precio: Number(articulo.costo_inversion || 0), nivel: 'Sin precio definido', permite_credito: false };

        const reglasValidas = reglas.filter(r => {
            if (cantidadComprada < Number(r.cantidad_minima)) return false;
            if (r.tipo === 'cliente') {
                if (!clienteActual) return false;
                const nombreEmpresa = String(clienteActual.empresa || '').toLowerCase();
                const nombreContacto = String(clienteActual.nombre_contacto || '').toLowerCase();
                const esClienteEspecial = r.nombres.some(nombreRegla => {
                    const n = String(nombreRegla).toLowerCase();
                    return nombreEmpresa.includes(n) || nombreContacto.includes(n) || n.includes(nombreEmpresa);
                });
                return esClienteEspecial;
            }
            return true;
        });

        if (reglasValidas.length === 0) {
            const reglaBase = reglas.find(r => r.tipo === 'nivel') || reglas[0];
            return {
                precio: Number(reglaBase.precio),
                nivel: `⚠️ Volumen insuficiente (Base: ${reglaBase.nombres[0]})`,
                permite_credito: reglaBase.permite_credito
            };
        }

        reglasValidas.sort((a, b) => {
            if (a.tipo === 'cliente' && b.tipo !== 'cliente') return -1;
            if (b.tipo === 'cliente' && a.tipo !== 'cliente') return 1;
            return Number(b.cantidad_minima) - Number(a.cantidad_minima); 
        });

        const mejorRegla = reglasValidas[0];
        
        return {
            precio: Number(mejorRegla.precio),
            nivel: mejorRegla.nombres.join(', '),
            permite_credito: mejorRegla.permite_credito
        };
    };

    useEffect(() => {
        if (carrito.length === 0) return;
        setCarrito(prevCarrito => prevCarrito.map(item => {
            const calculoNuevo = calcularPrecioAplicable(item.articuloOriginal, item.cantidad, clienteB2B);
            return {
                ...item,
                precio_unitario: calculoNuevo.precio,
                precio_total: calculoNuevo.precio * item.cantidad,
                nivel_aplicado: calculoNuevo.nivel,
                permite_credito_regla: calculoNuevo.permite_credito
            };
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clienteB2B]);

    // 👇 FIX: Ahora recibe la cantidad inicial deseada
    const agregarAlCarrito = (articulo, cantidadInicial = 1) => {
        const qty = Number(cantidadInicial) || 1;

        setCarrito(prev => {
            const indexExistente = prev.findIndex(item => item.articulo_id === articulo.id);
            
            if (indexExistente >= 0) {
                const nuevoCarrito = [...prev];
                const nuevaCantidad = nuevoCarrito[indexExistente].cantidad + qty;
                
                const isUsaStock = articulo.usa_stock === true || String(articulo.usa_stock) === 'true';
                if (isUsaStock && nuevaCantidad > Number(articulo.stock_actual)) {
                    showAlert('Stock Insuficiente', `Solo quedan ${articulo.stock_actual} ${articulo.unidad_medida} en bodega.`, 'error');
                    return prev;
                }

                const calculo = calcularPrecioAplicable(articulo, nuevaCantidad, clienteB2B);
                
                nuevoCarrito[indexExistente] = {
                    ...nuevoCarrito[indexExistente],
                    cantidad: nuevaCantidad,
                    precio_unitario: calculo.precio,
                    precio_total: calculo.precio * nuevaCantidad,
                    nivel_aplicado: calculo.nivel,
                    permite_credito_regla: calculo.permite_credito
                };
                return nuevoCarrito;
            } else {
                const isUsaStock = articulo.usa_stock === true || String(articulo.usa_stock) === 'true';
                if (isUsaStock && Number(articulo.stock_actual) < qty) {
                    showAlert('Agotado', `Stock insuficiente. Solo quedan ${articulo.stock_actual} disponibles.`, 'error');
                    return prev;
                }

                const calculo = calcularPrecioAplicable(articulo, qty, clienteB2B);
                
                return [...prev, {
                    idTicket: Date.now().toString() + Math.random().toString(36).substr(2, 4),
                    articulo_id: articulo.id,
                    nombre: articulo.nombre,
                    emoji: articulo.emoji,
                    imagen_url: articulo.imagen_url,
                    unidad_medida: articulo.unidad_medida,
                    cantidad: qty,
                    precio_unitario: calculo.precio,
                    precio_total: calculo.precio * qty,
                    nivel_aplicado: calculo.nivel,
                    permite_credito_regla: calculo.permite_credito,
                    articuloOriginal: articulo
                }];
            }
        });
    };

    const cambiarCantidad = (idTicket, delta) => {
        setCarrito(prev => prev.map(item => {
            if (item.idTicket === idTicket) {
                const nuevaCantidad = item.cantidad + delta;
                if (nuevaCantidad <= 0) return item;

                const isUsaStock = item.articuloOriginal.usa_stock === true || String(item.articuloOriginal.usa_stock) === 'true';
                if (isUsaStock && delta > 0 && nuevaCantidad > Number(item.articuloOriginal.stock_actual)) {
                    showAlert('Límite Alcanzado', `El stock máximo es de ${item.articuloOriginal.stock_actual} ${item.unidad_medida}.`, 'warning');
                    return item;
                }

                const calculo = calcularPrecioAplicable(item.articuloOriginal, nuevaCantidad, clienteB2B);
                
                return {
                    ...item,
                    cantidad: nuevaCantidad,
                    precio_unitario: calculo.precio,
                    precio_total: calculo.precio * nuevaCantidad,
                    nivel_aplicado: calculo.nivel,
                    permite_credito_regla: calculo.permite_credito
                };
            }
            return item;
        }));
    };

    const quitarDelCarrito = (idTicket) => setCarrito(prev => prev.filter(item => item.idTicket !== idTicket));
    const vaciarCarritoMayoreo = () => { setCarrito([]); setClienteB2B(null); };

    const subtotal = carrito.reduce((sum, item) => sum + item.precio_total, 0);
    const totalArticulos = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const permiteCreditoOrden = carrito.length > 0 && carrito.every(item => item.permite_credito_regla === true);

    return {
        carrito, clienteB2B, setClienteB2B, agregarAlCarrito, cambiarCantidad, quitarDelCarrito, vaciarCarritoMayoreo,
        subtotal, totalArticulos, permiteCreditoOrden
    };
};