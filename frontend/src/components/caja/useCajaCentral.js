import { useState, useEffect, useCallback } from 'react';

// 👇 RELOJ SINCRONIZADO ESTRICTO (Zona Horaria Local)
const getMazatlanDateStr = () => {
    const formatter = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mazatlan', year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = formatter.formatToParts(new Date());
    let dDay, dMonth, dYear;
    parts.forEach(part => {
        if(part.type === 'day') dDay = part.value;
        if(part.type === 'month') dMonth = part.value;
        if(part.type === 'year') dYear = part.value;
    });
    return `${dYear}-${dMonth}-${dDay}`;
};

export const useCajaCentral = (user, onLogout, onGoToKiosco) => {
  const [vistaActiva, setVistaActiva] = useState('por_confirmar');
  const [subVistaHistorial, setSubVistaHistorial] = useState('activos');
  const [isCajaBloqueada, setIsCajaBloqueada] = useState(true);
  const [operadorActual, setOperadorActual] = useState(user);

  useEffect(() => {
    if (user) setOperadorActual(user);
  }, [user]);

  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [configGlobal, setConfigGlobal] = useState(null);
  const [empleadosPOS, setEmpleadosPOS] = useState([]);
  const [insumosDB, setInsumosDB] = useState([]);
  const [gastosDia, setGastosDia] = useState([]);

  const [pedidosAuditados, setPedidosAuditados] = useState(new Set());

  const [modalPago, setModalPago] = useState(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [modalResolver, setModalResolver] = useState(null);
  const [itemAfectadoIdx, setItemAfectadoIdx] = useState(null);
  const [accionAlerta, setAccionAlerta] = useState('');
  const [ingredienteReemplazo, setIngredienteReemplazo] = useState('');
  const [ticketImprimir, setTicketImprimir] = useState(null);
  const [modalZonaEnvio, setModalZonaEnvio] = useState(null);
  const [modalVerDetalle, setModalVerDetalle] = useState(null);
  const [modalEditarPedido, setModalEditarPedido] = useState(null);
  const [modalCompraRapida, setModalCompraRapida] = useState(false);
  const [modalMermas, setModalMermas] = useState(false);
  const [insumoComprar, setInsumoComprar] = useState(null);
  const [paquetesComprados, setPaquetesComprados] = useState('');
  const [alertaCaja, setAlertaCaja] = useState(null);
  const [modalAgregarExtra, setModalAgregarExtra] = useState(null);
  const [alertaCobroExtra, setAlertaCobroExtra] = useState(null);
  const [modalAsistencia, setModalAsistencia] = useState(null);
  const [modalIdentificar, setModalIdentificar] = useState(false);
  const [pasoIdentificar, setPasoIdentificar] = useState(1);
  const [telClienteNuevo, setTelClienteNuevo] = useState('');
  const [datosNuevoCliente, setDatosNuevoCliente] = useState({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: '' });
  const [modalPuntoVenta, setModalPuntoVenta] = useState(false);
  const [ordenEditandoRapida, setOrdenEditandoRapida] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalComedor, setModalComedor] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const hoyStr = getMazatlanDateStr(); // 👈 IMPLEMENTACIÓN DEL RELOJ LOCAL

  const cargarDataDinamica = useCallback(async () => {
    try {
      const t = new Date().getTime();
      const [ resPed, resMesas, resInsumos, resGastos, resProd, resClas, resIng, resUsu, resCortes ] = await Promise.all([
        fetch(`${apiUrl}/pedidos/hoy?t=${t}`),
        fetch(`${apiUrl}/mesas?t=${t}`),
        fetch(`${apiUrl}/insumos?t=${t}`),
        fetch(`${apiUrl}/insumos/compras/hoy?t=${t}`),
        fetch(`${apiUrl}/productos?t=${t}`),
        fetch(`${apiUrl}/clasificaciones?t=${t}`),
        fetch(`${apiUrl}/ingredientes?t=${t}`),
        fetch(`${apiUrl}/usuarios?t=${t}`),
        fetch(`${apiUrl}/cortes/historial?fecha=${hoyStr}&completo=true`) 
      ]);

      const dataPed = await resPed.json();
      setPedidos(Array.isArray(dataPed) ? dataPed : []);

      const dataMesas = await resMesas.json();
      setMesas(Array.isArray(dataMesas) ? dataMesas : []);

      const dataInsumos = await resInsumos.json();
      setInsumosDB(Array.isArray(dataInsumos) ? dataInsumos : []);

      const dataGastos = await resGastos.json();
      setGastosDia(Array.isArray(dataGastos) ? dataGastos : []);

      const dataProd = await resProd.json();
      setProductos(Array.isArray(dataProd) ? dataProd.filter(p => p.disponible !== false && p.disponible !== 'false' && p.disponible !== 0) : []);

      const dataClas = await resClas.json();
      setClasificaciones(Array.isArray(dataClas) ? dataClas : []);

      const dataIng = await resIng.json();
      setCatalogoIngredientes(Array.isArray(dataIng) ? dataIng : []);

      const dataUsu = await resUsu.json();
      setEmpleadosPOS(Array.isArray(dataUsu) ? dataUsu : []);

      if (resCortes.ok) {
          const dataCortes = await resCortes.json();
          const cortesArr = Array.isArray(dataCortes) ? dataCortes : (dataCortes && dataCortes.id ? [dataCortes] : []);
          let auditados = new Set();
          
          cortesArr.forEach(c => {
              let inc = [];
              try { inc = typeof c.pedidos_incluidos === 'string' ? JSON.parse(c.pedidos_incluidos) : c.pedidos_incluidos; } catch(e){}
              (inc || []).forEach(id => auditados.add(id));
          });
          
          setPedidosAuditados(auditados);
      }

    } catch (error) {
      console.error("Error cargando data dinámica:", error);
    }
  }, [apiUrl, hoyStr]);

  // 👇 ESTADO NACIDO ESTRICTAMENTE EN NULL PARA OBLIGAR A PEDIR CAJA SIEMPRE
  const [fondoCaja, setFondoCaja] = useState(null);
  const [inputFondo, setInputFondo] = useState('');

  // 👇 EVALUACIÓN ESTRICTA DEL ÚLTIMO EVENTO DEL CAJERO
  useEffect(() => {
    if (operadorActual && apiUrl) {
        fetch(`${apiUrl}/cortes/historial?fecha=${hoyStr}&completo=true&t=${new Date().getTime()}`)
        .then(r => r.json())
        .then(dataCortes => {
            const cortesArr = Array.isArray(dataCortes) ? dataCortes : (dataCortes && dataCortes.id ? [dataCortes] : []);
            
            // Filtramos solo los eventos de ESTE usuario de HOY (Hora Mazatlán)
            const misCortesHoy = cortesArr.filter(c => Number(c.usuario_id) === Number(operadorActual.id));
            
            if (misCortesHoy.length > 0) {
                // Ordenamos por ID para agarrar siempre el movimiento más reciente
                misCortesHoy.sort((a, b) => Number(a.id) - Number(b.id));
                const ultimoEvento = misCortesHoy[misCortesHoy.length - 1];

                // Si su última acción fue abrir turno, lo pasamos directo. 
                // Si su última acción fue cerrar, le exigimos fondo nuevo (setFondoCaja null).
                if (ultimoEvento.turno_cerrado === false && ultimoEvento.fondo_inicial !== null) {
                    setFondoCaja(Number(ultimoEvento.fondo_inicial));
                } else {
                    setFondoCaja(null);
                }
            } else {
                setFondoCaja(null); // Primer turno del día
            }
        }).catch(()=>{});
    }
  }, [operadorActual, apiUrl, hoyStr]);

  // 👇 APERTURA DE CAJA: Conectado a la BD para asentar la fecha exacta
  const iniciarTurno = async (e) => {
    e.preventDefault();
    const m = Number(inputFondo);
    try {
        await fetch(`${apiUrl}/usuarios/${operadorActual.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fondo_actual: m })
        });

        await fetch(`${apiUrl}/cortes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fecha: hoyStr,
                usuario_id: operadorActual.id,
                fondo_inicial: m,
                turno_cerrado: false
            })
        });
        
        setFondoCaja(m);
        await cargarDataDinamica();
    } catch(err) {}
  };

  const [fondosRepartidores, setFondosRepartidores] = useState(() => {
    const guardado = localStorage.getItem(`fondos_repartidores_${hoyStr}`);
    return guardado ? JSON.parse(guardado) : {};
  });

  const actualizarFondoRepartidor = (repartidorId, valor) => {
    const num = Number(valor);
    const newFondos = { ...fondosRepartidores, [repartidorId]: isNaN(num) ? 0 : num };
    setFondosRepartidores(newFondos);
    localStorage.setItem(`fondos_repartidores_${hoyStr}`, JSON.stringify(newFondos));
  };

  const fondoRepartidorGlobal = Object.values(fondosRepartidores).reduce((sum, val) => sum + (Number(val) || 0), 0);

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/configuracion?t=${new Date().getTime()}`);
        const data = await res.json();
        if (data && !data.error) {
          setConfigGlobal(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data)) return data;
            return prev;
          });
          if (data.bloqueo_caja_activo !== true && data.bloqueo_caja_activo !== 'true') {
            setIsCajaBloqueada(false);
          }
        }
      } catch (error) {}
    };
    cargarConfig();
    cargarDataDinamica();

    const intervaloData = setInterval(cargarDataDinamica, 3000);
    const intervaloConfig = setInterval(cargarConfig, 3000);
    return () => {
      clearInterval(intervaloData);
      clearInterval(intervaloConfig);
    };
  }, [apiUrl, cargarDataDinamica]);

  useEffect(() => {
    if (!configGlobal) return;
    const isBloqueoGlobalOn = configGlobal.bloqueo_caja_activo === true || configGlobal.bloqueo_caja_activo === 'true';
    if (!isBloqueoGlobalOn || modalPuntoVenta || modalPago || modalCompraRapida || modalResolver || modalIdentificar || modalAsistencia || modalComedor || modalMermas) return;

    let timeout;
    const segundosLimite = configGlobal.bloqueo_caja_segundos || 30;

    const reiniciarTemporizador = () => {
      clearTimeout(timeout);
      if (!isCajaBloqueada && fondoCaja !== null) {
        timeout = setTimeout(() => setIsCajaBloqueada(true), segundosLimite * 1000);
      }
    };

    window.addEventListener('mousemove', reiniciarTemporizador);
    window.addEventListener('keydown', reiniciarTemporizador);
    window.addEventListener('touchstart', reiniciarTemporizador);
    window.addEventListener('click', reiniciarTemporizador);

    reiniciarTemporizador();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', reiniciarTemporizador);
      window.removeEventListener('keydown', reiniciarTemporizador);
      window.removeEventListener('touchstart', reiniciarTemporizador);
      window.removeEventListener('click', reiniciarTemporizador);
    };
  }, [configGlobal, isCajaBloqueada, modalPuntoVenta, modalPago, modalCompraRapida, modalResolver, modalIdentificar, modalAsistencia, modalComedor, modalMermas, fondoCaja]);

  const mostrarAlertaCaja = (titulo, mensaje, tipo = 'success') => {
    setAlertaCaja({ titulo, mensaje, tipo });
    setTimeout(() => setAlertaCaja(null), 5000);
  };

  const cerrarCajaYSalir = async () => {
    onLogout();
  };

  const lanzarImpresion = async (pedido) => {
    setTicketImprimir(pedido);
    const modoImpresion = configGlobal?.ticket_modo_impresion || 'pdf';

    const stripEmojis = (str) => {
      return String(str || '')
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .replace(/[⭐🔹🔸📝❌]/g, '')
        .trim();
    };

    const construirTextoTicket = () => {
      let receipt = "";  
      const center = (text) => {
        const str = String(text || '');
        if (str.length >= 32) return str.substring(0, 32) + "\n";
        const pad = Math.floor((32 - str.length) / 2);
        return " ".repeat(pad) + str + "\n";
      };  
      
      receipt += center(stripEmojis(configGlobal?.nombre_negocio || 'Mi Negocio'));
      if (configGlobal?.ticket_domicilio) receipt += center(stripEmojis(configGlobal.ticket_domicilio));
      if (configGlobal?.whatsapp) receipt += center(`Tel: ${configGlobal.whatsapp}`);  
      receipt += `--------------------------------\n`;
      receipt += `TICKET: #${pedido.numero_pedido}\n`;
      receipt += `FECHA: ${new Date().toLocaleString('es-MX')}\n`;
      receipt += `CLIENTE: ${stripEmojis(pedido.cliente_nombre || 'Invitado')}\n`;
      receipt += `TIPO: ${stripEmojis(pedido.tipo_consumo)}\n`;
      if (pedido.mesa) receipt += `MESA: ${stripEmojis(pedido.mesa)}\n`;
      if (pedido.direccion_entrega) receipt += `DIR: ${stripEmojis(pedido.direccion_entrega.substring(0, 50))}\n`;
      receipt += `--------------------------------\n`;  
      
      const car = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : (pedido.carrito || []);
      car.forEach(item => {
        const qty = item.cantidad || 1;
        const price = (Number(item.precioFinal) * qty).toFixed(2);
        let line = `${qty}x ${stripEmojis(item.nombre)}`;  
        if (line.length > 24) line = line.substring(0, 24);
        let spaces = 32 - line.length - price.length - 1;
        if (spaces < 1) spaces = 1;  
        receipt += `${line}${" ".repeat(spaces)}$${price}\n`;  
        if (item.extras && item.extras.length > 0) {
          item.extras.forEach(e => {
            receipt += `  + ${stripEmojis(e.nombre)}\n`;
          });
        }
      });  
      
      receipt += `--------------------------------\n`;
      receipt += `TOTAL: $${Number(pedido.total).toFixed(2)}\n`;
      receipt += `PAGO: ${stripEmojis(pedido.metodo_pago)}\n`;  
      
      if (pedido.metodo_pago === 'Mixto' && pedido.pagos_mixtos) {
        const pm = typeof pedido.pagos_mixtos === 'string' ? JSON.parse(pedido.pagos_mixtos) : pedido.pagos_mixtos;
        pm.forEach(x => {
          receipt += ` - ${stripEmojis(x.metodo)}: $${Number(x.monto).toFixed(2)}\n`;
        });
      }  
      
      receipt += `--------------------------------\n`;
      receipt += center(stripEmojis(configGlobal?.ticket_mensaje_final || '¡Gracias por su preferencia!'));
      receipt += `\n\n\n\n`;
      return receipt;
    };

    if (modoImpresion === 'impresora') {
      try {
        const res = await fetch(`${apiUrl}/imprimir`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pedido, configGlobal })
        });
        
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          mostrarAlertaCaja('Error de Impresión IP', err.error || 'La impresora de red está apagada o fuera de alcance.', 'error');
        } else {
          mostrarAlertaCaja('Generando Ticket', 'Ticket enviado a la impresora de red.', 'success');
        }
      } catch (e) {
        mostrarAlertaCaja('Fallo de Conexión', 'No se pudo contactar al servidor para imprimir el ticket.', 'error');
      }
      setTimeout(() => setTicketImprimir(null), 2500);

    } else if (modoImpresion === 'rawbt_http') {
      try {
        const receipt = construirTextoTicket();
        const res = await fetch("http://127.0.0.1:40228/", {
            method: "POST",
            body: receipt,
        });

        if (!res.ok) {
          mostrarAlertaCaja('Error de RawBT', 'La conexión local falló. Verifica que RawBT esté abierto.', 'error');
        } else {
          mostrarAlertaCaja('Imprimiendo', 'Enviando ticket a la impresora de red (RawBT Silencioso)...', 'success');
        }
      } catch (err) {
        mostrarAlertaCaja('RawBT Inactivo', 'Abre RawBT en la tablet y activa el servidor HTTP.', 'error');
      }
      setTimeout(() => setTicketImprimir(null), 1000);

    } else if (modoImpresion === 'parzibyte') {
      try {
        const receipt = construirTextoTicket();
        const nombreImpresora = configGlobal.ticket_impresora_parzibyte || "POS-58";
        const payloadPlugin = {
          nombreImpresora: nombreImpresora,
          operaciones: [
            { nombre: "Iniciar", argumentos: [] },
            { nombre: "EscribirTexto", argumentos: [receipt] },
            { nombre: "Corte", argumentos: [1] } 
          ]
        };

        const res = await fetch("http://localhost:8000/imprimir", {
            method: "POST",
            body: JSON.stringify(payloadPlugin),
        });

        if (!res.ok) {
          mostrarAlertaCaja('Error de Impresora Local', `Verifica que la impresora "${nombreImpresora}" esté conectada y encendida.`, 'error');
        } else {
          mostrarAlertaCaja('Imprimiendo', 'Enviando ticket a impresora local (Parzibyte)...', 'success');
        }
      } catch (err) {
        mostrarAlertaCaja('Plugin Parzibyte Inactivo', 'El puente de impresión local no está corriendo en esta computadora. Por favor inícialo.', 'error');
      }
      setTimeout(() => setTicketImprimir(null), 1000);

    } else if (modoImpresion === 'rawbt_nativo') {
      try {
        const receipt = construirTextoTicket();
        const base64Data = btoa(unescape(encodeURIComponent(receipt)));
        const rawbtIntent = `intent:base64,${base64Data}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;  
        window.location.href = rawbtIntent;  
        mostrarAlertaCaja('Imprimiendo', 'Abriendo la app RawBT para imprimir el ticket...', 'success');
      } catch (err) {
        mostrarAlertaCaja('Error de RawBT', 'No se pudo conectar con la aplicación de impresión instalada.', 'error');
      }  
      setTimeout(() => {
        setTicketImprimir(null);
      }, 1000);  

    } else {
      setTimeout(() => {
        window.print();
        const handleAfterPrint = () => {
          setTicketImprimir(null);
          window.removeEventListener('afterprint', handleAfterPrint);
        };
        window.addEventListener('afterprint', handleAfterPrint);
        setTimeout(handleAfterPrint, 1000);
      }, 1500);
    }
  };

  const toggleEstadoNegocio = async () => {
    try {
      const nuevoEstado = !configGlobal.negocio_abierto;
      const formData = new FormData();
      formData.append('negocio_abierto', nuevoEstado ? 'true' : 'false');
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) setConfigGlobal({ ...configGlobal, negocio_abierto: nuevoEstado });
    } catch (e) {}
  };

  const procesarPago = async (estadoRechazo = null, esPostPago = false, pagosMixtos = null) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    let estadoFinal;
    let metodoPagoFinal = pagosMixtos ? 'Mixto' : modalPago.metodo_pago;

    if (estadoRechazo) {
      estadoFinal = estadoRechazo;
    } else if (esPostPago) {
      estadoFinal = 'Pagado';
      metodoPagoFinal = 'Por Cobrar';
    } else {
      if (['Entregado', 'Listo', 'En Camino'].includes(modalPago.estado_preparacion)) {
        if (modalPago.tipo_consumo === 'Local' && modalPago.mesa) {
          estadoFinal = 'Entregado';
        } else {
          estadoFinal = 'Finalizado';
        }
      } else if (['Pendiente', 'Por Confirmar'].includes(modalPago.estado_preparacion)) {
        estadoFinal = 'Pagado';
      } else {
        estadoFinal = modalPago.estado_preparacion;
      }
    }

    try {
      const payload = { estado_preparacion: estadoFinal, metodo_pago: metodoPagoFinal, cajero_id: operadorActual?.id };
      if (pagosMixtos) payload.pagos_mixtos = pagosMixtos;

      const res = await fetch(`${apiUrl}/pedidos/${modalPago.id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (!estadoRechazo && !esPostPago && configGlobal?.ticket_impresion_activa) lanzarImpresion(modalPago);
        setModalPago(null);
        setMontoRecibido('');
        await cargarDataDinamica();
      } else {
        const errData = await res.json().catch(() => ({}));
        mostrarAlertaCaja('Error de Servidor', errData.error || 'El backend rechazó el pago.', 'error');
      }
    } catch (error) {
      mostrarAlertaCaja('Error de Red', 'Problema de conexión al procesar el pago.', 'error');
    }
    setIsSubmitting(false);
  };

  const liquidarPedidoRepartidor = async (pedidoIds) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const idsArray = Array.isArray(pedidoIds) ? pedidoIds : [pedidoIds];
      const promesas = idsArray.map(id =>
        fetch(`${apiUrl}/pedidos/${id}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado_preparacion: 'Liquidado', metodo_pago: 'Efectivo', cajero_id: operadorActual?.id })
        })
      );
      const results = await Promise.all(promesas);
      const todosOk = results.every(res => res.ok);
      if (todosOk) {
        await cargarDataDinamica();
        mostrarAlertaCaja('Liquidación Exitosa', `Se ha asentado el efectivo en caja.`, 'success');
      } else {
        mostrarAlertaCaja('Error Parcial', 'Algunas órdenes no se pudieron liquidar.', 'error');
        await cargarDataDinamica();
      }
    } catch (error) {
      mostrarAlertaCaja('Error de Red', 'Problema de conexión.', 'error');
    }
    setIsSubmitting(false);
  };

  const actualizarEstadoPedido = async (pedidoOId, nuevoEstado, extraData = {}) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const idReal = typeof pedidoOId === 'object' ? pedidoOId.id : pedidoOId;
    const pedidoFull = typeof pedidoOId === 'object' ? pedidoOId : pedidos.find(p => p.id === idReal);
    let estadoSeguro = nuevoEstado;
    if (nuevoEstado === 'Preparando' && (!pedidoFull || !pedidoFull.chef_id)) {
      estadoSeguro = 'Pagado';
    }
    try {
      let payload = { estado_preparacion: estadoSeguro, ...extraData };
      if (estadoSeguro === 'Entregado' && pedidoFull?.metodo_pago === 'Por Cobrar') {
      } else if (estadoSeguro === 'Finalizado' && pedidoFull?.metodo_pago === 'Por Cobrar') {
        payload.metodo_pago = 'Por Cobrar';
      }
      const res = await fetch(`${apiUrl}/pedidos/${idReal}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        await cargarDataDinamica();
      }
    } catch (error) {}
    setIsSubmitting(false);
  };

  const forzarLiberacionMesas = async (arrayMesasOcupadas) => {
    setIsSubmitting(true);
    try {
      const promesas = arrayMesasOcupadas.map(m =>
        fetch(`${apiUrl}/mesas/${m.id}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'Libre' })
        })
      );
      await Promise.all(promesas);
      await cargarDataDinamica();
    } catch(e) {}
    setIsSubmitting(false);
  };

  const confirmarPedidoRecoger = async (id) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiUrl}/pedidos/${id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ estado_preparacion: 'Pagado', cajero_id: operadorActual?.id }) 
      });
      await cargarDataDinamica();
    } catch (error) {}
    setIsSubmitting(false);
  };

  const confirmarPedidoDomicilio = async (pedidoModificado) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { costo_envio } = pedidoModificado;
      const t = Number(pedidoModificado.total) + Number(costo_envio);
      await fetch(`${apiUrl}/pedidos/${pedidoModificado.id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ estado_preparacion: 'Pagado', costo_envio, total: t, cajero_id: operadorActual?.id }) 
      });
      setModalZonaEnvio(null);
      await cargarDataDinamica();
    } catch (error) {}
    setIsSubmitting(false);
  };

  const limpiarAlerta = async (id) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiUrl}/pedidos/${id}/alerta`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: null })
      });
      await cargarDataDinamica();
    } catch(e) {}
    setIsSubmitting(false);
  };

  const abrirModalResolver = (pedido) => {
    setModalResolver(pedido);
    setItemAfectadoIdx('');
    setAccionAlerta('');
    setIngredienteReemplazo('');
  };

  const confirmarAgregarExtra = async (pedidoOriginal, idxItem, extraObj) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const items = typeof pedidoOriginal.carrito === 'string' ? JSON.parse(pedidoOriginal.carrito) : pedidoOriginal.carrito;
      const itemReal = items[idxItem];
      itemReal.extras = itemReal.extras || [];
      itemReal.extras.push({ nombre: extraObj.nombre, precioExtra: extraObj.precio_extra || extraObj.precioExtra || 0, tipo: 'extra' });
      itemReal.precioFinal = (Number(itemReal.precioFinal) + Number(extraObj.precio_extra || extraObj.precioExtra || 0)).toFixed(2);
      const nuevoTotal = (Number(pedidoOriginal.total) + Number(extraObj.precio_extra || extraObj.precioExtra || 0)).toFixed(2);
      await fetch(`${apiUrl}/pedidos/${pedidoOriginal.id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrito: items, total: nuevoTotal, estado_preparacion: pedidoOriginal.estado_preparacion })
      });
      setModalAgregarExtra(null);
      setAlertaCobroExtra({ orden: pedidoOriginal.numero_pedido, platillo: itemReal.nombre, extra: extraObj.nombre, monto: extraObj.precio_extra || extraObj.precioExtra || 0 });
      await cargarDataDinamica();
    } catch(e) {}
    setIsSubmitting(false);
  };

  const registrarCompraRapida = async (payload) => {
    if (isSubmitting) return; setIsSubmitting(true);
    try {
      await fetch(`${apiUrl}/insumos/${payload.insumo_id}/comprar`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      setInsumoComprar(null);
      setPaquetesComprados('');
      mostrarAlertaCaja("Compra Registrada", "El gasto se ha descontado de la caja", "success");
      await cargarDataDinamica();
    } catch(e) {}
    setIsSubmitting(false);
  };

  const enviarRespuestaCocina = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return; setIsSubmitting(true);
    try {
      const items = typeof modalResolver.carrito === 'string' ? JSON.parse(modalResolver.carrito) : modalResolver.carrito;
      let payloadEstado = { carrito: items, estado_preparacion: modalResolver.estado_preparacion };
      let textoRespuesta = 'CAJA RESPONDE: Revisado.';
      if (accionAlerta === 'cancelar') {
        payloadEstado.estado_preparacion = 'Cancelado';
        textoRespuesta = 'CAJA RESPONDE: Se canceló todo el pedido.';
        if (modalResolver.mesa) {
          const tableObj = mesas.find(m => String(m.numero_mesa) === String(modalResolver.mesa));
          if (tableObj) {
            await fetch(`${apiUrl}/mesas/${tableObj.id}/estado`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'Libre' })
            });
          }
        }
      } else if (accionAlerta === 'quitar') {
        items[itemAfectadoIdx].extras = items[itemAfectadoIdx].extras || [];
        items[itemAfectadoIdx].extras.push({ nombre: `❌ SIN ingrediente faltante`, precioExtra: 0 });
        textoRespuesta = 'CAJA RESPONDE: El cliente aceptó quitarlo.';
      } else if (accionAlerta === 'cambiar') {
        items[itemAfectadoIdx].extras = items[itemAfectadoIdx].extras || [];
        items[itemAfectadoIdx].extras.push({ nombre: `🔄 Cambiar por: ${ingredienteReemplazo}`, precioExtra: 0 });
        textoRespuesta = `CAJA RESPONDE: Cambiar por ${ingredienteReemplazo}.`;
      } else if (accionAlerta === 'aceptar') {
        textoRespuesta = 'CAJA RESPONDE: El cliente aceptó tu propuesta.';
      }
      await fetch(`${apiUrl}/pedidos/${modalResolver.id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadEstado)
      });
      await fetch(`${apiUrl}/pedidos/${modalResolver.id}/alerta`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: textoRespuesta })
      });
      setModalResolver(null); setItemAfectadoIdx(''); setAccionAlerta(''); setIngredienteReemplazo('');
      await cargarDataDinamica();
    } catch (error) {}
    setIsSubmitting(false);
  };

  const guardarEdicionPedido = async (id, nuevosDatos) => {
    setIsSubmitting(true);
    try {
      const pedidoRef = pedidos.find(p => p.id === id);
      let paqueteCompleto = { ...nuevosDatos };
      if (pedidoRef) {
        const carritoArray = typeof pedidoRef.carrito === 'string' ? JSON.parse(pedidoRef.carrito) : (pedidoRef.carrito || []);
        paqueteCompleto = {
          cliente_id: pedidoRef.cliente_id,
          cliente_nombre: pedidoRef.cliente_nombre,
          cliente_telefono: pedidoRef.cliente_telefono,
          tipo_consumo: nuevosDatos.tipo_consumo || pedidoRef.tipo_consumo,
          metodo_pago: pedidoRef.metodo_pago,
          origen: pedidoRef.origen,
          direccion_entrega: nuevosDatos.direccion_entrega !== undefined ? nuevosDatos.direccion_entrega : pedidoRef.direccion_entrega,
          estado_preparacion: nuevosDatos.estado_preparacion || pedidoRef.estado_preparacion,
          mesa: pedidoRef.mesa,
          carrito: carritoArray,
          total: nuevosDatos.total !== undefined ? nuevosDatos.total : pedidoRef.total,
          costo_envio: nuevosDatos.costo_envio !== undefined ? nuevosDatos.costo_envio : pedidoRef.costo_envio,
          descuento_puntos: pedidoRef.descuento_puntos,
          cupon_codigo: pedidoRef.cupon_codigo
        };
      }
      await fetch(`${apiUrl}/pedidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paqueteCompleto)
      });
      setModalEditarPedido(null);
      await cargarDataDinamica();
    } catch(e) {}
    setIsSubmitting(false);
  };

  const onGoToKioscoLocal = (cliente, orden) => {
    setOrdenEditandoRapida(orden);
    setModalEditarPedido(null);
    setModalPuntoVenta(true);
  };

  const buscarClienteParaPedido = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/clientes`);
      const clientes = await res.json();
      const clienteEncontrado = clientes.find(c => c.telefono === telClienteNuevo);
      if (clienteEncontrado) {
        setModalIdentificar(false);
        onGoToKioscoLocal(clienteEncontrado, null);
      } else {
        setPasoIdentificar('registro');
      }
    } catch (error) {}
    setIsSubmitting(false);
  };

  const registrarClienteParaPedido = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/clientes/registro`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({telefono: telClienteNuevo, ...datosNuevoCliente}) });
      const data = await res.json();
      if (res.ok) {
        setModalIdentificar(false);
        onGoToKioscoLocal(data.cliente || data.data || data, null);
      }
    } catch (error) {}
    setIsSubmitting(false);
  };

  const abrirIdentificador = () => {
    setOrdenEditandoRapida(null);
    setModalPuntoVenta(true);
  };

  const pedidosPorConfirmar = pedidos.filter(p => p.estado_preparacion === 'Pendiente' && p.origen !== 'Caja');

  const pendientesDePago = pedidos.filter(p => {
    if (['Cancelado', 'Finalizado'].includes(p.estado_preparacion)) return false;
    if (p.tipo_consumo === 'Domicilio' && ['Listo', 'En Camino', 'Entregado'].includes(p.estado_preparacion)) return false;
    if (p.estado_preparacion === 'Pendiente') return false;
    const noPagado = ['Por Cobrar', 'Pendiente'].includes(p.metodo_pago);
    if (!noPagado) return false;
    return true;
  });

  const listosParaEntregar = pedidos.filter(p => p.estado_preparacion === 'Listo');

  const mesasPagadas = pedidos.filter(p =>
    p.tipo_consumo === 'Local' &&
    p.metodo_pago !== 'Comida Personal' &&
    p.estado_preparacion === 'Entregado' &&
    p.estado_preparacion !== 'Cancelado' &&
    p.estado_preparacion !== 'Finalizado'
  );

  const pedidosPorLiquidar = pedidos.filter(p =>
    p.tipo_consumo === 'Domicilio' &&
    (
      p.estado_preparacion === 'En Camino' ||
      (p.estado_preparacion === 'Entregado' && ['Pendiente', 'Por Cobrar'].includes(p.metodo_pago))
    )
  );

  const pedidosConAlerta = pedidos.filter(p => p.alerta_cocina && !['Entregado', 'Cancelado'].includes(p.estado_preparacion));

  return {
    vistaActiva, setVistaActiva, subVistaHistorial, setSubVistaHistorial,
    pedidos, mesas, catalogoIngredientes, configGlobal, insumosDB, gastosDia, 
    modalPago, setModalPago, montoRecibido, setMontoRecibido,
    modalResolver, setModalResolver, itemAfectadoIdx, setItemAfectadoIdx,
    accionAlerta, setAccionAlerta, ingredienteReemplazo, setIngredienteReemplazo,
    ticketImprimir, modalZonaEnvio, setModalZonaEnvio,
    modalVerDetalle, setModalVerDetalle, modalEditarPedido, setModalEditarPedido,
    modalCompraRapida, setModalCompraRapida,
    modalMermas, setModalMermas,
    insumoComprar, setInsumoComprar,
    paquetesComprados, setPaquetesComprados, alertaCaja, setAlertaCaja,
    modalAgregarExtra, setModalAgregarExtra, alertaCobroExtra, setAlertaCobroExtra,
    modalIdentificar, setModalIdentificar, pasoIdentificar, setPasoIdentificar,
    telClienteNuevo, setTelClienteNuevo, datosNuevoCliente, setDatosNuevoCliente,
    modalPuntoVenta, setModalPuntoVenta, ordenEditandoRapida, setOrdenEditandoRapida, modalComedor, setModalComedor, 
    productos, clasificaciones, empleadosPOS,
    isCajaBloqueada, setIsCajaBloqueada, operadorActual, setOperadorActual,
    isSubmitting, fondoCaja, inputFondo, setInputFondo, 
    apiUrl, cargarDataDinamica,
    fondosRepartidores, actualizarFondoRepartidor, fondoRepartidorGlobal, liquidarPedidoRepartidor,
    modalAsistencia, setModalAsistencia,
    pedidosPorConfirmar, pendientesDePago, listosParaEntregar,
    pedidosPorLiquidar, mesasPagadas, pedidosConAlerta,
    buscarClienteParaPedido, registrarClienteParaPedido,
    toggleEstadoNegocio, cerrarCajaYSalir, iniciarTurno,
    lanzarImpresion, procesarPago, confirmarPedidoRecoger,
    confirmarPedidoDomicilio, actualizarEstadoPedido, guardarEdicionPedido,
    limpiarAlerta, abrirModalResolver, enviarRespuestaCocina,
    registrarCompraRapida, confirmarAgregarExtra, abrirIdentificador,
    onGoToKiosco: onGoToKioscoLocal,
    forzarLiberacionMesas,
    pedidosAuditados 
  };
};