import React, { useState, useEffect } from 'react';
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
  bloqueoPuntosActivo,
  combosActivos = [],
  setComboEnEspera,
  promociones = [] // 👈 NUEVA PROP RECIBIDA
}) => {
  const [categoriaActiva, setCategoriaActiva] = useState(null);
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
    <div className="flex flex-col lg:flex-row gap-6 md:gap-8 h-auto lg:h-[75vh] pb-12 lg:pb-0 relative">
      
      <div className="w-full lg:w-2/3 flex flex-col h-[65vh] lg:h-full shrink-0 relative">
        
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

        {!categoriaActiva ? (
          <CategoriasGrid configGlobal={configGlobal} categoriasUnicas={categoriasUnicas} getPortadaCategoria={getPortadaCategoria} setCategoriaActiva={setCategoriaActiva} baseUrl={baseUrl} />
        ) : (
          <ProductosGrid 
            categoriaActiva={categoriaActiva} 
            setCategoriaActiva={setCategoriaActiva} 
            productosFiltrados={productosFiltrados} 
            abrirModalProducto={abrirModalProducto} 
            baseUrl={baseUrl} 
            promociones={promociones} /* 👈 PROP INYECTADA A LA CUADRÍCULA */
          />
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
        calcularSubtotal={calcularSubtotal} calcularTotal={calcularTotal} 
        isCerrado={estadoHorario.isCerrado}
        setPantallaActual={setPantallaActual}
        guardarEdicionDirecta={guardarEdicionDirecta}
        isSubmitting={isSubmitting}
        bloqueoPuntosActivo={bloqueoPuntosActivo}
      />
    </div>
  );
};  

export default MenuPrincipal;