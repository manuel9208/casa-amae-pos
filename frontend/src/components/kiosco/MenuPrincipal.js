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
  
  guardarEdicionDirecta, // 👇 Recibimos la nueva función
  isSubmitting           // 👇 Recibimos el estado de carga
}) => {
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [inputCupon, setInputCupon] = useState('');
  const [errorCupon, setErrorCupon] = useState('');
  const [buscandoCupon, setBuscandoCupon] = useState(false);

  const isCerrado = configGlobal.negocio_abierto === false || configGlobal.negocio_abierto === 'false' || configGlobal.negocio_abierto === 0;
  const mensajeCierre = configGlobal.mensaje_cierre || 'El negocio se encuentra cerrado temporalmente. Por favor, vuelve más tarde.';

  const cambiarCantidadCart = (idTicket, delta) => {
    setCarrito(carrito.map(item => {
      if (item.idTicket === idTicket) {
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
    const productoOriginal = productos.find(p => p.id === item.id || p.nombre === item.nombre);
    if (!productoOriginal) return alert("Este producto ya no existe.");
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
    <div className="flex flex-col lg:flex-row gap-8 h-[75vh]">
      <div className="w-full lg:w-2/3 flex flex-col h-full">
        {isCerrado && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-2xl mb-6 shadow-sm flex items-center gap-4">
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

      <CarritoLateral 
        carrito={carrito} pedidoEditandoId={pedidoEditandoId} cambiarCantidadCart={cambiarCantidadCart} 
        editarItem={editarItem} quitarDelCarrito={quitarDelCarrito} isOffline={isOffline} 
        inputCupon={inputCupon} setInputCupon={setInputCupon} errorCupon={errorCupon} 
        setErrorCupon={setErrorCupon} buscandoCupon={buscandoCupon} validarCupon={validarCupon} 
        cuponActivo={cuponActivo} setCuponActivo={setCuponActivo} clienteActivo={clienteActivo} 
        descuentoPuntosPuntosFisicos={descuentoPuntosPuntosFisicos} configGlobal={configGlobal} 
        setModalNip={setModalNip} descuentoCuponDinero={descuentoCuponDinero} descuentoPuntosDinero={descuentoPuntosDinero} 
        calcularSubtotal={calcularSubtotal} calcularTotal={calcularTotal} isCerrado={isCerrado} setPantallaActual={setPantallaActual} 
        
        guardarEdicionDirecta={guardarEdicionDirecta} // 👇 Pasamos el prop
        isSubmitting={isSubmitting} // 👇 Pasamos el prop
      />
    </div>
  );
};

export default MenuPrincipal;