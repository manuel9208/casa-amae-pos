import React, { useState, useEffect } from 'react';
import { LayoutGroup } from 'framer-motion';
import CategoriasGrid from './menu/CategoriasGrid';
import ProductosGrid from './menu/ProductosGrid';
import CarritoLateral from './menu/CarritoLateral';
import BottomNavKiosco from './menu/BottomNavKiosco';
import BuscadorMenu from './menu/BuscadorMenu';
import { apiFetch } from '../../utils/apiFetch';

const MenuPrincipal = ({
  configGlobal, productos, clasificaciones, carrito, setCarrito,
  baseUrl, setPantallaActual, pedidoEditandoId, clienteActivo,
  setModalNip, calcularTotal, setProductoEnEspera, setItemAEditar,
  calcularSubtotal, descuentoPuntosDinero, descuentoPuntosPuntosFisicos,
  cuponActivo, setCuponActivo, descuentoCuponDinero, apiUrl, isOffline,
  guardarEdicionDirecta,
  isSubmitting,
  bloqueoPuntosActivo,
  combosActivos = [],
  setComboEnEspera,
  promociones = [],
  popularidadHoy = [],
  animacionesKiosco = [], // 🆕 Animaciones del Kiosco (Lottie + Video) ya resueltas por empresa
  onIrAPerfil // 👈 NUEVO: callback para la pestaña "Perfil" de la barra inferior móvil
}) => {
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [vistaMobile, setVistaMobile] = useState('menu'); // 👈 NUEVO: 'menu' | 'carrito' (solo aplica en mobile/tablet)
  const [busquedaTexto, setBusquedaTexto] = useState(''); // 👈 NUEVO: búsqueda global del menú
  const [inputCupon, setInputCupon] = useState('');
  const [errorCupon, setErrorCupon] = useState('');
  const [buscandoCupon, setBuscandoCupon] = useState(false);  

  const [estadoHorario, setEstadoHorario] = useState({ isCerrado: false, mensaje: '' });

  useEffect(() => {
    const evaluarHorarioKiosco = () => {
      try {
        const date = new Date();
        const options = { timeZone: 'America/Mazatlan', hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'long' };
        const formatter = new Intl.DateTimeFormat('es-MX', options);
        const parts = formatter.formatToParts(date);

        let horaStr = '00', minStr = '00', diaStrLocal = 'Lunes';
        parts.forEach(p => {
          if (p.type === 'hour') horaStr = p.value;
          if (p.type === 'minute') minStr = p.value;
          if (p.type === 'weekday') diaStrLocal = p.value;
        });

        if (horaStr === '24') horaStr = '00';

        const removerAcentos = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const diaLimpio = removerAcentos(diaStrLocal);
        const mapDias = { 'lunes':'Lunes', 'martes':'Martes', 'miercoles':'Miércoles', 'jueves':'Jueves', 'viernes':'Viernes', 'sabado':'Sábado', 'domingo':'Domingo' };
        const diasArray = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        const diaHoyStr = mapDias[diaLimpio] || diasArray[date.getDay()];
        const minutosActuales = parseInt(horaStr, 10) * 60 + parseInt(minStr, 10);

        const horarios = typeof configGlobal.horarios_semana === 'string'
          ? JSON.parse(configGlobal.horarios_semana || '{}')
          : (configGlobal.horarios_semana || {});

        let dentro = false;

        const indiceHoy = diasArray.indexOf(diaHoyStr);
        const diaAyerStr = diasArray[(indiceHoy + 6) % 7];
        const configAyer = horarios[diaAyerStr];

        if (configAyer && configAyer.activo && configAyer.apertura && configAyer.cierre) {
          const apA = parseInt(configAyer.apertura.split(':')[0], 10) * 60 + parseInt(configAyer.apertura.split(':')[1], 10);
          const ciA = parseInt(configAyer.cierre.split(':')[0], 10) * 60 + parseInt(configAyer.cierre.split(':')[1], 10);
          if (ciA <= apA && minutosActuales < ciA) dentro = true;
        }

        const configHoy = horarios[diaHoyStr];
        if (!dentro && configHoy && configHoy.activo && configHoy.apertura && configHoy.cierre) {
          const apH = parseInt(configHoy.apertura.split(':')[0], 10) * 60 + parseInt(configHoy.apertura.split(':')[1], 10);
          const ciH = parseInt(configHoy.cierre.split(':')[0], 10) * 60 + parseInt(configHoy.cierre.split(':')[1], 10);

          if (ciH <= apH) { 
            if (minutosActuales >= apH) dentro = true;
          } else { 
            if (minutosActuales >= apH && minutosActuales < ciH) dentro = true;
          }
        }

        const estaAbiertoDB = configGlobal?.negocio_abierto === true || String(configGlobal?.negocio_abierto) === 'true' || configGlobal?.negocio_abierto === 1;
        const isAbierto = dentro || estaAbiertoDB;

        if (!isAbierto) {
            let msg = '';
            if (!configHoy || !configHoy.activo) {
                msg = `Hoy ${diaHoyStr} nos encontramos cerrados todo el día.`;
            } else {
                const formatAMPM = (hora24) => {
                    if (!hora24) return '';
                    let [h, m] = hora24.split(':');
                    h = parseInt(h);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12 || 12;
                    return `${h}:${m} ${ampm}`;
                };
                msg = `Horario disponible hoy ${diaHoyStr} de ${formatAMPM(configHoy.apertura)} a ${formatAMPM(configHoy.cierre)}.`;
            }
            setEstadoHorario({ isCerrado: true, mensaje: msg });
            return;
        }

        setEstadoHorario({ isCerrado: false, mensaje: '' });

      } catch (e) {
        setEstadoHorario({ isCerrado: false, mensaje: '' });
      }
    };

    evaluarHorarioKiosco();
    const intervalo = setInterval(evaluarHorarioKiosco, 10000); 
    return () => clearInterval(intervalo);
  }, [configGlobal]);


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
    
    if (item._esCombo) {
        const comboMatch = combosActivos.find(c => c.id === item._comboId);
        if (comboMatch) {
            setItemAEditar(item);
            setProductoEnEspera({
                ...productoOriginal,
                _esComboBuilder: true,
                _configuracionCombo: comboMatch
            });
            return;
        }
    }

    setItemAEditar(item);
    setProductoEnEspera(productoOriginal);
  };  

  const abrirModalProducto = (p) => {
    if (estadoHorario.isCerrado) {
        alert(`El kiosco está en Modo Lectura.\n\n${estadoHorario.mensaje}`);
        return;
    }

    setItemAEditar(null);
    
    if (p._esPromo) {
        setProductoEnEspera(p);
        return;
    }

    const comboMatch = combosActivos.find(c => String(c.producto_base_id) === String(p.id));
    if (comboMatch) {
        setProductoEnEspera({
            ...p,
            _esComboBuilder: true,
            _configuracionCombo: comboMatch
        });
        return;
    }

    setProductoEnEspera(p);
  };  

  const categoriasUnicas = [...new Set(productos.map(p => p.categoria || 'General'))];
  const productosFiltrados = productos.filter(p => (p.categoria || 'General') === categoriaActiva);

  // 👇 NUEVO: Búsqueda en vivo sobre TODO el catálogo ya cargado en memoria (sin tocar backend)
  const textoBusquedaNormalizado = busquedaTexto.trim().toLowerCase();
  const productosBusqueda = textoBusquedaNormalizado
    ? productos.filter(p =>
        p.nombre?.toLowerCase().includes(textoBusquedaNormalizado) ||
        p.descripcion?.toLowerCase().includes(textoBusquedaNormalizado)
      )
    : [];  

  const getPortadaCategoria = (catName) => {
    const clasifDB = clasificaciones.find(c => c.nombre === catName);
    return { imagen_url: clasifDB?.imagen_url || null, emoji: clasifDB?.emoji || '🍽️' };
  };  

  // 👇 NUEVO: Hero Animation — imagen/emoji de la categoría activa, usada para
  // el efecto de transición compartida entre CategoriasGrid y ProductosGrid.
  const portadaCategoriaActiva = categoriaActiva ? getPortadaCategoria(categoriaActiva) : null;

  // 🆕 Animaciones del Kiosco: resuelve si la categoría activa tiene una animación
  // (Lottie o Video) asignada por el admin. Si no hay match, devuelve null y
  // ProductosGrid cae automáticamente al tinte de color de siempre (fallback).
  const obtenerAnimacionCategoria = (catName) => {
    const match = animacionesKiosco.find(a => a.nombre_categoria_kiosco === catName && a.animacion_id);
    if (!match) return null;
    return { tipo: match.tipo, url_json: match.url_json, url_preview: match.url_preview };
  };

  const validarCupon = async (e) => {
    e.preventDefault();
    setErrorCupon('');
    if (!inputCupon.trim()) return;
    if (isOffline) return setErrorCupon('No se pueden validar cupones sin Internet.');  
    
    setBuscandoCupon(true);
    try {
      const res = await apiFetch(`${apiUrl}/cupones/validar`, {
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
    <div className="flex flex-col lg:flex-row gap-6 md:gap-8 h-[calc(100vh-160px)] lg:h-[75vh] pb-4 lg:pb-0 relative">

      <div className={`w-full lg:w-2/3 flex-col h-full shrink-0 relative ${vistaMobile === 'menu' ? 'flex' : 'hidden lg:flex'}`}>

        {estadoHorario.isCerrado && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-2xl mb-6 shadow-sm flex items-center justify-between gap-4 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="text-4xl">⏸️</span>
              <div>
                <p className="font-black text-red-700 text-lg uppercase tracking-widest">Kiosco en Modo Lectura</p>
                <p className="font-bold text-red-600 mt-1">{estadoHorario.mensaje}</p>
              </div>
            </div>
          </div>
        )}

        {/* 🆕 Título "¿Qué se te antoja hoy?" — SOLO en la pantalla principal
            de categorías (no durante búsqueda, no con categoría activa).
            Vive arriba del buscador, fuera de cualquier contenedor animado. */}
        {!categoriaActiva && !textoBusquedaNormalizado && (
          <h2 className="text-3xl md:text-4xl font-black mb-4 text-slate-800 shrink-0">
            {configGlobal.kiosco_mensaje || '¿Qué se te antoja hoy?'}
          </h2>
        )}

        <BuscadorMenu busquedaTexto={busquedaTexto} setBusquedaTexto={setBusquedaTexto} />

        <LayoutGroup>
          {textoBusquedaNormalizado ? (
            productosBusqueda.length > 0 ? (
              <ProductosGrid
                categoriaActiva={`Resultados para "${busquedaTexto}"`}
                setCategoriaActiva={() => setBusquedaTexto('')}
                productosFiltrados={productosBusqueda}
                abrirModalProducto={abrirModalProducto}
                baseUrl={baseUrl}
                promociones={promociones}
                popularidadHoy={popularidadHoy}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-slate-200 p-10">
                <span className="text-5xl mb-4">🔍</span>
                <p className="font-black text-slate-600 text-lg mb-1">Sin resultados</p>
                <p className="text-slate-400 font-medium text-sm">No encontramos nada con "{busquedaTexto}". Intenta con otra palabra.</p>
              </div>
            )
          ) : !categoriaActiva ? (
            <CategoriasGrid configGlobal={configGlobal} categoriasUnicas={categoriasUnicas} getPortadaCategoria={getPortadaCategoria} setCategoriaActiva={setCategoriaActiva} baseUrl={baseUrl} animacionCategoria={obtenerAnimacionCategoria('__inicio__')} />
          ) : (
            <ProductosGrid 
              categoriaActiva={categoriaActiva} 
              setCategoriaActiva={setCategoriaActiva} 
              productosFiltrados={productosFiltrados} 
              abrirModalProducto={abrirModalProducto} 
              baseUrl={baseUrl} 
              promociones={promociones} /* 👈 PROP INYECTADA A LA CUADRÍCULA */
              popularidadHoy={popularidadHoy}
              portadaCategoria={portadaCategoriaActiva}
              animacionCategoria={obtenerAnimacionCategoria(categoriaActiva)}
            />
          )}
        </LayoutGroup>
      </div>  
      
      <CarritoLateral
        carrito={carrito} pedidoEditandoId={pedidoEditandoId} cambiarCantidadCart={cambiarCantidadCart}
        editarItem={editarItem} quitarDelCarrito={quitarDelCarrito} isOffline={isOffline}
        inputCupon={inputCupon} setInputCupon={setInputCupon} errorCupon={errorCupon}
        setErrorCupon={setErrorCupon} buscandoCupon={buscandoCupon} validarCupon={validarCupon}
        cuponActivo={cuponActivo} setCuponActivo={setCuponActivo} clienteActivo={clienteActivo}
        descuentoPuntosPuntosFisicos={descuentoPuntosPuntosFisicos} configGlobal={configGlobal}
        setModalNip={setModalNip} descuentoCuponDinero={descuentoCuponDinero} descuentoPuntosDinero={descuentoPuntosDinero}
        calcularSubtotal={calcularSubtotal} calcularTotal={calcularTotal}
        isCerrado={estadoHorario.isCerrado}
        setPantallaActual={setPantallaActual}
        guardarEdicionDirecta={guardarEdicionDirecta}
        isSubmitting={isSubmitting}
        bloqueoPuntosActivo={bloqueoPuntosActivo}
        vistaMobile={vistaMobile}
        setVistaMobile={setVistaMobile}
      />

      {/* 👇 NUEVO: Barra inferior flotante (Menú / Carrito / Perfil) — SOLO mobile/tablet */}
      <BottomNavKiosco
        vistaMobile={vistaMobile}
        setVistaMobile={setVistaMobile}
        totalCarrito={calcularTotal()}
        cantidadItems={carrito.reduce((acc, i) => acc + (i.cantidad || 1), 0)}
        onIrAPerfil={onIrAPerfil}
      />
    </div>
  );
};

export default MenuPrincipal;